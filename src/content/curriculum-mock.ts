import {
  WEEKDAY_NAMES,
  countClassDays,
  weekdaysOfWeek,
  type ClassWeekdayPeriodList,
} from "../lib/cohort-calendar";
import { elementaryLessons } from "./elementary-lessons";
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
 * ⚠️ 지금 값은 **결정적 규칙으로 만든 시범 값**이다(불변식 6): 주당 수업 3회(월·화·목,
 * `cohort-calendar` 확정)이고, 진도는 초등 23강을 전체 회차에 고르게 편 것이다.
 * 실제 기수의 진도표와 다르다 — 화면에도 시범 값임을 표기한다.
 */

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
  /** 이 회차의 진도 — 초등 강 번호·제목 (시범 값) */
  lessonNo: number;
  lessonTitle: string;
}

/**
 * 회차 번호 → 진도(강). 23강을 전체 회차에 고르게 편다 — 단조 증가라
 * 「진도별 보기」의 경계가 어긋나지 않는다.
 */
export function lessonOfSession(sessionNo: number): { lessonNo: number; title: string } {
  const idx = Math.min(
    elementaryLessons.length - 1,
    Math.floor(((sessionNo - 1) * elementaryLessons.length) / Math.max(1, TOTAL_SESSIONS)),
  );
  const lesson = elementaryLessons[idx];
  return { lessonNo: lesson.lessonNo, title: lesson.title };
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

/** 회차 라벨 — 「12회차 · 월 · 3강 예언」 형태 */
export function sessionLabelOf(s: SessionInfo): string {
  return `${s.sessionNo}회차 · ${s.weekdayLabel} · ${s.lessonNo}강 ${s.lessonTitle}`;
}

/** 짧은 강 제목 — 표 머리처럼 좁은 자리용 */
export function shortLessonTitle(title: string, max = 8): string {
  return title.length > max ? `${title.slice(0, max)}…` : title;
}

/** 검산용 — 달력이 계산한 총 회차와 주×3 근사가 크게 어긋나면 매핑 규칙이 깨진 것이다 */
export const CALENDAR_TOTAL_SESSIONS = countClassDays(SCHEDULE.startsOn, SCHEDULE.endsOn);
