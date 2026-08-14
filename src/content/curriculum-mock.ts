import { CLASS_WEEKDAYS, countClassDays } from "../lib/cohort-calendar";
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

/** 주당 회차 수 — 월·화·목 (cohort-calendar의 확정 수업 요일) */
export const SESSIONS_PER_WEEK = CLASS_WEEKDAYS.length;

/** 수업 요일 표기 — CLASS_WEEKDAYS(1=월, 2=화, 4=목) 순서 그대로 */
export const SESSION_WEEKDAY_LABELS = CLASS_WEEKDAYS.map(
  (d) => ["일", "월", "화", "수", "목", "금", "토"][d],
);

export interface SessionInfo {
  /** 1부터 — 개강 후 N회차 */
  sessionNo: number;
  /** 몇 주차의 몇 번째 수업인지 (요일 라벨은 SESSION_WEEKDAY_LABELS[slot]) */
  weekNo: number;
  slot: number;
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

/** 주차 번호(1부터) → 그 주의 회차들 */
export function sessionsOfWeek(weekNo: number): SessionInfo[] {
  return Array.from({ length: SESSIONS_PER_WEEK }, (_, slot) => {
    const sessionNo = (weekNo - 1) * SESSIONS_PER_WEEK + slot + 1;
    const lesson = lessonOfSession(sessionNo);
    return { sessionNo, weekNo, slot, lessonNo: lesson.lessonNo, lessonTitle: lesson.title };
  }).filter((s) => s.sessionNo <= TOTAL_SESSIONS);
}

/** 그 주차까지 마친 회차 수 — 흐름 그래프의 「회차별」 X축 라벨이 쓴다 */
export function sessionsThroughWeek(weekNo: number): number {
  return Math.min(TOTAL_SESSIONS, weekNo * SESSIONS_PER_WEEK);
}

/** 회차 라벨 — 「12회차 · 3강 예언」 형태 (지시문 예시 형식) */
export function sessionLabelOf(s: SessionInfo): string {
  return `${s.sessionNo}회차 · ${s.lessonNo}강 ${s.lessonTitle}`;
}

/** 짧은 강 제목 — 표 머리처럼 좁은 자리용 */
export function shortLessonTitle(title: string, max = 8): string {
  return title.length > max ? `${title.slice(0, max)}…` : title;
}

/** 검산용 — 달력이 계산한 총 회차와 주×3 근사가 크게 어긋나면 매핑 규칙이 깨진 것이다 */
export const CALENDAR_TOTAL_SESSIONS = countClassDays(SCHEDULE.startsOn, SCHEDULE.endsOn);
