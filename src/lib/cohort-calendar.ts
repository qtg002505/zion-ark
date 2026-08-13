import type { ScheduleOverride } from "./types";

/**
 * 기수 달력 산수 — 수업일 세기 · 주차 계산 · 진행률.
 *
 * 순수 함수만 둔다. `cohort-mock`을 import하지 않는다(그쪽이 이걸 쓰므로 순환이 된다) —
 * 날짜는 전부 인자로 받는다. 날짜 문자열은 `WeeklyPlanPage`의 관례대로 **로컬 시간**
 * `YYYY-MM-DD`로만 다룬다 (UTC 변환 금지 — 자정 근처에 하루가 밀린다).
 */

/** 수업 요일 — 월·화·목 (2026-08-13 리드 확정: 8개월 · 월화목 수업) */
export const CLASS_WEEKDAYS = [1, 2, 4];

function parse(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmt(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function addDays(ymd: string, n: number): string {
  const d = parse(ymd);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

/** 개강~종강 사이의 수업일(월·화·목) 수. ⚠️ 공휴일을 빼지 않는다 — 아래 `scheduleSummary` 주석 */
export function countClassDays(start: string, end: string): number {
  let n = 0;
  const d = parse(start);
  const stop = parse(end).getTime();
  while (d.getTime() <= stop) {
    if (CLASS_WEEKDAYS.includes(d.getDay())) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/** 개강일 기준 1부터 세는 주차. 개강 주가 1주차다 */
export function weekNoOf(start: string, ymd: string): number {
  return Math.floor(diffDays(start, ymd) / 7) + 1;
}

/** N주차의 시작일(개강 요일 기준). 개강이 월요일이면 그 주 월요일이다 */
export function mondayOfWeek(start: string, weekNo: number): string {
  return addDays(start, (weekNo - 1) * 7);
}

/**
 * 주차 라벨 — 「6월 2주」.
 *
 * ⚠️ **그 주 목요일 기준으로 만든다.** 기존 목업·저장된 주차 사유(`zion_ark_week_notes`)가
 * 전부 이 규칙으로 적혀 있다(검산: 13주차 목 5/28 → 「5월 4주」 · 18주차 목 7/2 → 「7월 1주」).
 * 월요일 기준으로 바꾸면 **localStorage의 기록 조인이 통째로 끊어진다.**
 */
export function weekLabelOf(weekStartYmd: string): string {
  const thu = addDays(weekStartYmd, 3);
  const [, m, d] = thu.split("-").map(Number);
  return `${m}월 ${Math.floor((d - 1) / 7) + 1}주`;
}

/** 기간 진행률 % — 개강 전 0, 종강 후 100으로 자른다 */
export function progressPct(start: string, end: string, today: string): number {
  const total = diffDays(start, end) + 1;
  if (total <= 0) return 0;
  const done = diffDays(start, today) + 1;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/** 일정 요약 — 「총 8개월 · 35주 · 수업 105회」에 쓰는 값들 */
export function scheduleSummary(start: string, end: string): { months: number; weeks: number; sessions: number } {
  const s = parse(start);
  const e = parse(end);
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  const weeks = Math.floor(diffDays(start, end) / 7) + 1;
  /*
    수업 회차에 공휴일을 빼지 않는 이유: ① 목업 자체가 3/2(삼일절 대체휴일)를 개강일로,
    8/17(광복절 대체휴일)를 일정일로 쓰고 있다 ② 빼면 개강일이 수업일이 아니게 되는 모순
    ③ 실연동 시 정본은 출결 시트다. 휴강을 반영하려면 여기서 `HOLIDAYS_2026`에 걸린
    월·화·목을 빼면 된다(2026년 기준 7일 → 98회).
  */
  return { months, weeks, sessions: countClassDays(start, end) };
}

/** 새신자교육 종강 예정일 = 종강 예정일 + 2주 (2026-08-13 리드 확정 — 저장하지 않고 항상 파생) */
export function newcomerEndOf(endsOn: string): string {
  return addDays(endsOn, 14);
}

/**
 * 저장된 일정 수정을 얹은 유효 일정.
 * 수정이 없으면 기본값(목업 `SCHEDULE`) 그대로다 — 읽는 쪽은 항상 이 함수를 거친다.
 */
export function effectiveSchedule(
  base: { startsOn: string; endsOn: string },
  overrides: ScheduleOverride[],
  cohortKey: string,
): { startsOn: string; endsOn: string } {
  const ov = overrides.find((o) => o.cohortKey === cohortKey);
  return {
    startsOn: ov?.startsOn ?? base.startsOn,
    endsOn: ov?.endsOn ?? base.endsOn,
  };
}
