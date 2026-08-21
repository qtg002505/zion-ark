import {
  WEEKDAY_NAMES,
  countClassDays,
  weekdaysOfWeek,
  type ClassWeekdayPeriodList,
} from "../lib/cohort-calendar";
import {
  ELEMENTARY_COURSE_TITLES,
  ELEMENTARY_SHORT_TITLES,
  HIGH_COURSE_TITLES,
  MIDDLE_COURSE_TITLES,
  MIDDLE_SHORT_TITLES,
} from "./curriculum-titles";
import { SCHEDULE, TOTAL_SESSIONS } from "./cohort-mock";

/**
 * 회차↔진도(과수) 매핑 — **시범 목업** (2026-08-14 피드백 세션 2 · Q-01 리드 확정: 신설).
 *
 * 실무자(강사·전도사)는 「몇 주차」가 아니라 「몇 회차 · 무슨 과」로 기수를 읽는다
 * (FB-02·03). 출결 원본 시트에는 진도 정보가 없으므로, 그 매핑을 여기 한 곳에 둔다.
 *
 * ⚠️ **이 파일이 교체 경계다** — 실연동 시 원 저장소의 커리큘럼 테이블(회차·날짜·과수)로
 * 갈아 끼우고, 화면(`CohortStatus`)은 축 선택값만 받으므로 그대로 둔다. 시트 고유 구조를
 * 화면으로 새어들게 하지 않는다는 지시문 원칙 그대로다.
 *
 * ⚠️ 지금 값은 **결정적 규칙으로 만든 시범 값**이다(불변식 6): 주당 수업 3회이고,
 * **한 회차가 한 강**이다. 실제 기수의 진도표와 다르다 — 화면에도 시범 값임을 표기한다.
 */

/**
 * 단계 표기·색은 **`level-labels.ts` 하나가 정본**이다 (2026-08-21).
 * 사이드바(셸)가 그것을 읽어야 해서 가벼운 파일로 갈랐다 — 여기서 다시 내보내므로
 * 종전처럼 `curriculum-mock`에서 가져와도 그대로 산다.
 */
import { LEVEL_SHORT, type LessonLevel } from "./level-labels";

export {
  LEVEL_NAME,
  LEVEL_SHORT,
  LEVEL_TONE,
  LEVEL_TEXT,
  type LessonLevel,
} from "./level-labels";

export interface SessionInfo {
  /** 1부터 — 개강 후 N회차 */
  sessionNo: number;
  /** 몇 주차의 몇 번째 수업인지 */
  weekNo: number;
  slot: number;
  /** 그 주차에 적용되는 요일 (0=일 … 6=토) — 구간에 따라 주마다 다를 수 있다 */
  weekday: number;
  /** 요일 한 글자 — 「월」·「일」 */
  weekdayLabel: string;
  /** 이 회차의 진도 — 그 단계 안에서의 강 번호 */
  lessonNo: number;
  /** 원문 제목 — 툴팁·상세에 그대로 쓴다 */
  lessonTitle: string;
  /** 화면 표기용 핵심단어 — 좁은 칸에는 이것을 쓴다 (2026-08-15) */
  lessonKeyword: string;
  /** 초·중·고 어느 단계의 강인지 — 회차가 105개라 단계를 함께 봐야 뜻이 선다 */
  level: LessonLevel;
  /** 아직 진도가 배정되지 않은 회차 (기수 재량으로 채운다) */
  undecided?: boolean;
}

export interface CurriculumStep {
  level: LessonLevel;
  lessonNo: number;
  /** 원문 제목 — **그대로다**(불변식 5). 표기를 줄일 때도 이 값은 안 건드린다 */
  title: string;
  /**
   * 화면 표기용 요약 — **리드가 과수마다 정해 준 줄임말**이다 (2026-08-18 전달).
   * 「빛 · 등대와 소경 · 귀머거리 · 예복」 → 「빛 ~ 예복」, 고등은 장 표기(「계 2장」).
   *
   * ⚠️ 종전에는 제목을 여덟 글자에서 **기계적으로 잘라** 뜻이 끊겼다(「빛 · 등대와 …」).
   * 이제 사이트가 줄이지 않는다 — 목록(`curriculum-titles.ts`)에 없으면 원 제목을 그대로 쓴다.
   */
  keyword: string;
  /**
   * 아직 배정되지 않은 회차 (2026-08-15).
   * 초등 과수를 나누거나 특강이 들어가는 자리인데 **무엇이 올지는 기수 재량**이라
   * 지어내지 않는다. 화면은 이 칸을 「미정」으로 낸다.
   */
  undecided?: boolean;
}

/**
 * 원문 제목 → 핵심단어. **자르기만 한다.**
 * - 「비유한 씨 · 밭 · 나무 · 새」 → 「씨 · 밭 · 나무 · 새」
 * - 「두 가지 신 (하나님과 사단)」 → 「두 가지 신」
 * - 「천국 비밀 비유」 → 「천국 비밀」
 * 낱말을 새로 짓거나 뜻을 옮기지 않는다 — 지우는 것은 수식어(비유한/비유)와 괄호뿐이다.
 */
export function keywordOf(title: string): string {
  return title
    .replace(/\([^)]*\)/g, " ") // 괄호 안 보충 설명
    .replace(/비유한\s*/g, "")
    .replace(/\s*비유$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * 고등 진도 표기 — **계시록 장별** (2026-08-15 리드 지시. 예: 「계 1:1~8」·「계 2장」).
 * 원문 파일명의 「계 1장 1-8절」을 리드가 쓰는 표기로 **모양만** 바꾼다 — 내용은 그대로다.
 * ⚠️ 절 번호가 붙어 버린 원문(「계 1장 920절」 — 파일명에서 하이픈이 빠진 것)은 손대지 않는다.
 * 지어내면 9~20절인지 92~0절인지 알 수 없다. 원문 파일명이 고쳐지면 저절로 따라온다.
 */
export function revelationKeyword(label: string): string {
  const m = label.match(/^계\s*(\d+)장\s*(\d+)\s*-\s*(\d+)절$/);
  return m ? `계 ${m[1]}:${m[2]}~${m[3]}` : label.replace(/\s+/g, " ").trim();
}

/**
 * 회차 차례표 — **정본 과수 목록**(`curriculum-titles.ts`)을 회차에 순서대로 편 것.
 *
 * 2026-08-15에 리드가 초등 25 · 중등 25 · 고등 23 과수 목록을 전달했다. 종전에는 교안 원문
 * 파일명·강 제목에서 뽑아 썼는데 표기가 제각각이었다 — 이제 **진도 표기는 그 목록 하나가 정본**이다.
 *
 * ⚠️ **회차와 강은 1:1이 아니다.** 리드가 함께 준 운영 규칙 때문이다:
 * 초등은 한 과수를 나눠 진행할 수 있고(기수 재량), 중등은 목록 중 몇 개만 뽑아 하고,
 * 특강이 중간에 끼어든다. 그래서 「N회차 = 무슨 강」은 **기수마다 다르다**.
 * 여기 배열은 그것을 **순서대로 편 시범 값**이고, 남는 회차는 `undecided`로 비워 둔다 —
 * 어느 과수를 나눌지·무엇을 뽑을지는 지어낼 수 없기 때문이다(불변식 6).
 * ⚠️ 실연동 시 이 배열이 통째로 **기수별 진도 배정** 테이블로 갈린다(교체 경계).
 */
export const CURRICULUM: CurriculumStep[] = (() => {
  const out: CurriculumStep[] = [
    /*
      `keyword`는 **리드가 정해 준 요약 표기**다 (2026-08-18). 목록에 없으면 원 제목을
      그대로 쓴다 — 사이트가 지어서 줄이지 않는다.
    */
    ...ELEMENTARY_COURSE_TITLES.map((t, i) => ({
      level: "초등" as const,
      lessonNo: i + 1,
      title: t,
      keyword: ELEMENTARY_SHORT_TITLES[i] ?? t,
    })),
    ...MIDDLE_COURSE_TITLES.map((t, i) => ({
      level: "중등" as const,
      lessonNo: i + 1,
      title: t,
      keyword: MIDDLE_SHORT_TITLES[i] ?? t,
    })),
    ...HIGH_COURSE_TITLES.map((h, i) => ({
      level: "고등" as const,
      lessonNo: i + 1,
      title: h.title,
      // 좁은 칸에는 장 표기가 곧 핵심단어다 (「계 1:1~8」·「계2장」)
      keyword: h.chapter,
    })),
  ];
  /*
    남는 회차 — 초등 과수를 나누거나 특강이 들어가는 자리다. **무엇이 올지 정해져 있지 않다.**
    화면은 이 칸을 「미정」으로 낸다. 마지막 강으로 붙잡아 두면 있지도 않은 진도가 뜬다.
  */
  while (out.length < TOTAL_SESSIONS) {
    out.push({ level: "고등", lessonNo: 0, title: "", keyword: "", undecided: true });
  }
  return out;
})();

/**
 * 회차 번호 → 진도(강). 차례표에서 그대로 꺼낸다.
 * 차례표를 넘어가는 회차는 **「미정」**으로 돌려준다 — 없는 진도를 지어내지 않는다.
 */
export function lessonOfSession(sessionNo: number): CurriculumStep {
  const idx = Math.max(0, sessionNo - 1);
  return (
    CURRICULUM[idx] ?? { level: "고등", lessonNo: 0, title: "", keyword: "", undecided: true }
  );
}

/**
 * 좁은 칸용 단계 표기 — 「초」·「중」·「고」. 배정 전 회차는 **「미정」**이다.
 *
 * ⚠️ **강 번호를 붙이지 않는다** (2026-08-15 리드 지시 — 「학원법 위반에 걸리지 않도록
 * 초등1 2 3 · 중등1 2 3 · 고등1 2 3 같은 **연속적인 형식의 구분은 제외**한다」).
 * 종전에는 「초1강」·「중12강」처럼 단계+번호로 냈는데, 그 표기가 학년·학기 편성처럼 읽힌다.
 * **번호(`lessonNo`)는 데이터로 남긴다** — 차례를 매기고 회차와 짝짓는 데 쓴다. 화면에만 안 낸다.
 */
export function shortLessonLabel(step: {
  level: LessonLevel;
  lessonNo: number;
  undecided?: boolean;
}): string {
  return step.undecided || step.lessonNo === 0 ? "미정" : LEVEL_SHORT[step.level];
}

/**
 * 주차 번호(1부터) → 그 주의 회차들.
 *
 * ⚠️ **요일은 주차마다 다를 수 있다** (2026-08-14 리드 지시 — 6개월차 이후 **월→일 ·
 * 화→수**로 옮겨져 일·수·목이 된다. 2026-08-15 확정). 그래서 `periods`를 받아 그 주차의
 * 요일을 그때그때 읽는다. 안 주면 기본(월·화·목)이다.
 * 회차 번호는 **앞 주차들의 실제 수업 수를 더해** 매긴다 —
 * 주당 회차 수가 구간마다 달라질 수 있어 `주차×3`으로 계산하면 어긋난다.
 */
export function sessionsOfWeek(weekNo: number, periods?: ClassWeekdayPeriodList): SessionInfo[] {
  const days = weekdaysOfWeek(weekNo, periods);
  const before = sessionsThroughWeek(weekNo - 1, periods);
  return days
    .map((weekday, slot) => {
      const sessionNo = before + slot + 1;
      const lesson = lessonOfSession(sessionNo);
      return {
        sessionNo,
        weekNo,
        slot,
        weekday,
        weekdayLabel: WEEKDAY_NAMES[weekday],
        lessonNo: lesson.lessonNo,
        lessonTitle: lesson.title,
        lessonKeyword: lesson.keyword,
        level: lesson.level,
        undecided: lesson.undecided,
      };
    })
    .filter((s) => s.sessionNo <= TOTAL_SESSIONS);
}

/** 그 주차까지 마친 회차 수 — 구간마다 주당 회차가 다를 수 있어 하나씩 더한다 */
export function sessionsThroughWeek(weekNo: number, periods?: ClassWeekdayPeriodList): number {
  let n = 0;
  for (let w = 1; w <= weekNo; w++) n += weekdaysOfWeek(w, periods).length;
  return Math.min(TOTAL_SESSIONS, n);
}

/**
 * 회차 라벨 — 「12회차 · 월 · 초등 천국 비밀 비유」 형태 (툴팁).
 * ⚠️ **강 번호를 넣지 않는다** — 「초등 3강」 같은 연속 번호 표기는 빼기로 했다(2026-08-15).
 */
export function sessionLabelOf(s: SessionInfo): string {
  return `${s.sessionNo}회차 · ${s.weekdayLabel} · ${s.level} ${s.lessonTitle}`.trim();
}

/** 좁은 칸의 진도 표기 — 「초 천국 비밀 비유」·「고 계5장」 (단계 한 글자 + 과수 제목) */
export function sessionKeywordLabel(s: SessionInfo): string {
  return `${shortLessonLabel(s)}${s.lessonKeyword ? ` ${s.lessonKeyword}` : ""}`;
}

/** 짧은 강 제목 — 표 머리처럼 좁은 자리용 */
export function shortLessonTitle(title: string, max = 8): string {
  return title.length > max ? `${title.slice(0, max)}…` : title;
}

/** 검산용 — 달력이 계산한 총 회차와 주×3 근사가 크게 어긋나면 매핑 규칙이 깨진 것이다 */
export const CALENDAR_TOTAL_SESSIONS = countClassDays(SCHEDULE.startsOn, SCHEDULE.endsOn);
