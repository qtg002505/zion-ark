import {
  WEEKDAY_NAMES,
  countClassDays,
  weekdaysOfWeek,
  type ClassWeekdayPeriodList,
} from "../lib/cohort-calendar";
import { elementaryLessons } from "./elementary-lessons";
import { HIGH_LESSONS } from "./lessons-high";
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

/** 과정 단계 — `student-profiles`의 `CourseLevel`과 같은 어휘를 쓴다 */
export type LessonLevel = "초등" | "중등" | "고등";

/** 좁은 칸(격자 머리)에 쓰는 한 글자 표기 */
export const LEVEL_SHORT: Record<LessonLevel, string> = { 초등: "초", 중등: "중", 고등: "고" };

/**
 * 단계 색 (2026-08-15 리드 지시 — 초등 하늘색 · 중등 주황색 · 고등 남색).
 *
 * ⚠️ **색값은 여기 없다.** `index.css`의 `@theme`에 토큰(`--color-level-*`)으로 있고
 * 여기는 그 유틸리티 이름만 짝지어 둔다 — 화면에 색을 하드코딩하지 않는다는 규칙 그대로다.
 * 뱃지는 「옅은 바탕 + 진한 글자」 한 벌이라 둘을 함께 적는다.
 */
export const LEVEL_TONE: Record<LessonLevel, string> = {
  초등: "bg-level-el-soft text-level-el",
  중등: "bg-level-mid-soft text-level-mid",
  고등: "bg-level-high-soft text-level-high",
};

/** 색만 필요한 자리(글자·테두리)용 */
export const LEVEL_TEXT: Record<LessonLevel, string> = {
  초등: "text-level-el",
  중등: "text-level-mid",
  고등: "text-level-high",
};

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
}

export interface CurriculumStep {
  level: LessonLevel;
  lessonNo: number;
  /** 원문 제목 — **그대로다**(불변식 5). 표기를 줄일 때도 이 값은 안 건드린다 */
  title: string;
  /**
   * 화면 표기용 핵심단어 (2026-08-15 리드 지시 — 「핵심단어로 표현」).
   * 초등·중등은 **비유 핵심단어**, 고등은 **계시록 장**이다.
   *
   * ⚠️ **원문을 고쳐 쓴 것이 아니라 원문에서 잘라 낸 것이다**(불변식 5의 「원문에서 뽑은 것」).
   * 규칙은 `keywordOf` 한 곳에 있고 결정적이다 — 사람이 손으로 다시 적은 표가 아니라서
   * 원문이 바뀌면 표기도 따라 바뀐다. 원문 제목은 상세·툴팁에서 그대로 볼 수 있다.
   */
  keyword: string;
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
 * 중등 진도 핵심단어 (2026-08-15 리드 지시 — 「중등: 핵심 단어로 진도 표시」).
 *
 * ⚠️ **리드가 예시로 준 셋만 들어 있다.** 중등 원문(강 목록)을 아직 못 받아 나머지는 비어
 * 있고, 그 회차는 번호만 나온다. 지어내지 않는다(불변식 5·6).
 * ⚠️ **순서도 확인이 필요하다** — 「보혜사 · 언약 결과 · 주기도문」은 예시로 받은 것이지
 * 1·2·3강이라고 들은 것이 아니다. 목록이 오면 이 배열만 그대로 채우면 화면이 따라온다.
 */
export const MIDDLE_LESSON_KEYWORDS: string[] = ["보혜사", "언약 결과", "주기도문"];

/**
 * 회차 차례표 — **한 회차가 한 강이다** (2026-08-15 리드 확정).
 *
 * 종전에는 초등 23강을 105회차에 고르게 펴서 **한 강이 4~5회차에 걸쳐** 있었다.
 * 리드가 「12강을 한 주 내내 하는 게 아니라 하루가 한 강의」라고 짚어 1:1로 바꿨다.
 *
 * 105회를 초등 → 중등 → 고등 차례로 채운다. **중등 원문은 아직 없어** 제목 자리를
 * 「중등 N강」으로만 둔다 — 원문이 오면 여기 한 곳에서 이어 붙인다.
 * ⚠️ 실연동 시 이 배열이 통째로 커리큘럼 테이블로 갈린다(교체 경계).
 */
export const CURRICULUM: CurriculumStep[] = (() => {
  const out: CurriculumStep[] = elementaryLessons.map((l) => ({
    level: "초등" as const,
    lessonNo: l.lessonNo,
    title: l.title,
    keyword: keywordOf(l.title),
  }));
  /** 고등은 **계시록 장**이 핵심단어다 (2026-08-15 리드 지시) — 원문 파일명의 장 표기를 쓴다 */
  const high: CurriculumStep[] = HIGH_LESSONS.map((l, i) => ({
    level: "고등" as const,
    lessonNo: i + 1,
    title: `${l.label} ${l.title}`.trim(),
    keyword: revelationKeyword(l.label),
  }));
  /*
    남는 회차가 중등 몫이다 — 원문이 없어 **번호만** 매기고 제목은 빈 칸으로 둔다.
    「중등 46강」 같은 문구를 제목 자리에 넣으면 「중등 46강 중등 46강」으로 겹쳐 나온다.
    원문이 오면 여기서 제목만 채우면 화면은 그대로 따라온다.
  */
  const midCount = Math.max(0, TOTAL_SESSIONS - out.length - high.length);
  for (let i = 1; i <= midCount; i++) {
    // 핵심단어는 받은 만큼만 채운다 — 없는 강은 번호까지만 나온다
    const keyword = MIDDLE_LESSON_KEYWORDS[i - 1] ?? "";
    out.push({ level: "중등", lessonNo: i, title: keyword, keyword });
  }
  return [...out, ...high];
})();

/**
 * 회차 번호 → 진도(강). **한 회차가 한 강**이라 차례표에서 그대로 꺼낸다.
 * 차례표를 넘어가는 회차(일정이 늘어난 경우)는 마지막 강으로 붙잡아 둔다 — 화면이 빈칸이 되지 않게.
 */
export function lessonOfSession(sessionNo: number): CurriculumStep {
  const idx = Math.min(CURRICULUM.length - 1, Math.max(0, sessionNo - 1));
  return CURRICULUM[idx];
}

/**
 * 좁은 칸용 — 「초12강」·「고3강」.
 * `CurriculumStep`과 `SessionInfo`가 함께 쓰므로 **필요한 두 필드만** 받는다.
 */
export function shortLessonLabel(step: { level: LessonLevel; lessonNo: number }): string {
  return `${LEVEL_SHORT[step.level]}${step.lessonNo}강`;
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

/** 회차 라벨 — 「12회차 · 월 · 초등 3강 천국 비밀 비유」 형태(툴팁이라 **원문 제목**을 쓴다) */
export function sessionLabelOf(s: SessionInfo): string {
  return `${s.sessionNo}회차 · ${s.weekdayLabel} · ${s.level} ${s.lessonNo}강 ${s.lessonTitle}`.trim();
}

/**
 * 좁은 칸의 진도 표기 — 「초3강 천국 비밀」·「고5강 계 5장」 (2026-08-15 리드 지시).
 * 핵심단어가 없는 강(중등 — 원문 대기)은 번호까지만 나온다.
 */
export function sessionKeywordLabel(s: SessionInfo): string {
  return `${shortLessonLabel(s)}${s.lessonKeyword ? ` ${s.lessonKeyword}` : ""}`;
}

/** 짧은 강 제목 — 표 머리처럼 좁은 자리용 */
export function shortLessonTitle(title: string, max = 8): string {
  return title.length > max ? `${title.slice(0, max)}…` : title;
}

/** 검산용 — 달력이 계산한 총 회차와 주×3 근사가 크게 어긋나면 매핑 규칙이 깨진 것이다 */
export const CALENDAR_TOTAL_SESSIONS = countClassDays(SCHEDULE.startsOn, SCHEDULE.endsOn);
