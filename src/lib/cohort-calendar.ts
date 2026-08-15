import type { ClassWeekdayPeriod, ScheduleOverride } from "./types";

/**
 * 기수 달력 산수 — 수업일 세기 · 주차 계산 · 진행률.
 *
 * 순수 함수만 둔다. `cohort-mock`을 import하지 않는다(그쪽이 이걸 쓰므로 순환이 된다) —
 * 날짜는 전부 인자로 받는다. 날짜 문자열은 `WeeklyPlanPage`의 관례대로 **로컬 시간**
 * `YYYY-MM-DD`로만 다룬다 (UTC 변환 금지 — 자정 근처에 하루가 밀린다).
 */

/**
 * 수업 요일 기본값 — 월·화·목 (2026-08-13 리드 확정: 8개월 · 월화목 수업).
 *
 * ⚠️ **이건 기본값일 뿐 고정이 아니다** (2026-08-14 리드 지시). 기수 도중에 요일이
 * 바뀐다 — 개강~6개월차는 월·화·목, 6~8개월차는 **일·수·목**이다
 * (2026-08-15 리드 확정: **월요일 수업이 일요일로, 화요일 수업이 수요일로 옮겨진다**).
 * 그래서 실제 요일은 `ClassWeekdayPeriod[]`(구간 목록)로 받고, 인자를 안 주면 이 값을
 * 쓴다. 요일을 읽는 곳은 전부 `weekdaysOfWeek()`를 거친다 — 상수를 직접 보지 않는다.
 */
export const CLASS_WEEKDAYS = [1, 2, 4];

/**
 * 6~8개월차 요일 — 일·수·목 (2026-08-15 리드 확정).
 * 화면의 「요일 고치기」가 한 번에 채우는 프리셋으로 쓴다. 저장값은 여전히 구간 목록이라
 * 여기서 벗어난 조합도 손으로 고를 수 있다 — 이 상수는 편의일 뿐 규칙이 아니다.
 */
export const LATE_CLASS_WEEKDAYS = [0, 3, 4];

/** 요일 이름 — `Date.getDay()` 순서 (0=일) */
export const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

/** 화면·목업이 함께 쓰는 구간 목록 타입 별칭 — import 줄을 짧게 유지한다 */
export type ClassWeekdayPeriodList = ClassWeekdayPeriod[];

/** 기본 구간 — 개강부터 끝까지 월·화·목 한 구간 */
export const DEFAULT_WEEKDAY_PERIODS: ClassWeekdayPeriod[] = [
  { fromWeek: 1, weekdays: CLASS_WEEKDAYS },
];

/**
 * 구간 목록을 안전한 꼴로 다듬는다 — 빈 목록·뒤섞인 순서·1주차 누락을 여기서 흡수한다.
 * 읽는 쪽은 항상 이 함수를 거치므로 저장된 값이 어떻든 화면이 깨지지 않는다.
 */
export function normalizeWeekdayPeriods(periods?: ClassWeekdayPeriod[]): ClassWeekdayPeriod[] {
  const clean = (periods ?? [])
    .filter((p) => p.weekdays.length > 0)
    .map((p) => ({
      fromWeek: Math.max(1, Math.round(p.fromWeek)),
      // 정렬해 두면 0=일이 앞에 와 「일화목」 표기 순서가 저절로 맞는다
      weekdays: [...new Set(p.weekdays)].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.fromWeek - b.fromWeek);
  if (clean.length === 0) return DEFAULT_WEEKDAY_PERIODS;
  // 첫 구간은 반드시 1주차부터여야 그 앞 주차가 빈칸이 되지 않는다
  return clean[0].fromWeek === 1 ? clean : [{ ...clean[0], fromWeek: 1 }, ...clean.slice(1)];
}

/** N주차에 적용되는 수업 요일 — 그 주차 이하에서 가장 늦게 시작한 구간을 쓴다 */
export function weekdaysOfWeek(weekNo: number, periods?: ClassWeekdayPeriod[]): number[] {
  const list = normalizeWeekdayPeriods(periods);
  let hit = list[0];
  for (const p of list) if (p.fromWeek <= weekNo) hit = p;
  return hit.weekdays;
}

/**
 * 그 주 시작일(월요일)에서 요일 d까지의 날 수.
 *
 * ⚠️ **일요일은 그 주의 첫날(월−1)이다** (2026-08-15 리드 확정 — 종전 「그 주의 끝(월+6)」을
 * 이 규칙이 대체한다). 6개월차부터 **월요일 수업이 하루 앞당겨져 일요일이 되는** 것이므로,
 * 그 일요일은 월요일 **앞**에 붙어 같은 주차에 속한다(일·수·목 차례).
 * 주차 번호를 매기는 `weekNoOf`도 같은 규칙을 쓴다 — 두 곳이 어긋나면 회차가 밀린다.
 *
 * 주차 라벨(그 주 목요일 기준)은 이 변경에 영향받지 않는다 — 목요일 자리가 그대로여서
 * 저장된 주차 기록(`zion_ark_week_notes`)의 조인이 끊어지지 않는다.
 */
export function offsetInWeek(weekday: number): number {
  return weekday === 0 ? -1 : weekday - 1;
}

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

/**
 * 개강~종강 사이의 수업일 수.
 * 요일이 기수 도중에 바뀌므로 **그 날이 속한 주차의 요일**로 판정한다(2026-08-14).
 * ⚠️ 공휴일을 빼지 않는다 — 아래 `scheduleSummary` 주석 참고.
 */
export function countClassDays(start: string, end: string, periods?: ClassWeekdayPeriod[]): number {
  const list = normalizeWeekdayPeriods(periods);
  let n = 0;
  const d = parse(start);
  const stop = parse(end).getTime();
  while (d.getTime() <= stop) {
    if (weekdaysOfWeek(weekNoOf(start, fmt(d)), list).includes(d.getDay())) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/**
 * 개강일 기준 1부터 세는 주차. 개강 주가 1주차다.
 *
 * ⚠️ **일요일은 하루 뒤(월요일)와 같은 주차로 센다** (2026-08-15 리드 확정 — `offsetInWeek`과
 * 같은 규칙). 6개월차부터 월요일 수업이 일요일로 앞당겨지므로, 그 일요일이 앞 주차로 밀리면
 * 「27주차부터 일·수·목」 구간의 첫 수업이 26주차(월·화·목)로 판정돼 회차에서 통째로 빠진다.
 * 월~토는 종전과 같아 저장된 기록·주차 라벨(목요일 기준)은 그대로다.
 */
export function weekNoOf(start: string, ymd: string): number {
  const sundayShift = parse(ymd).getDay() === 0 ? 1 : 0;
  return Math.floor((diffDays(start, ymd) + sundayShift) / 7) + 1;
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
export function scheduleSummary(
  start: string,
  end: string,
  periods?: ClassWeekdayPeriod[],
): { months: number; weeks: number; sessions: number } {
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
  return { months, weeks, sessions: countClassDays(start, end, periods) };
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
): { startsOn: string; endsOn: string; weekdayPeriods: ClassWeekdayPeriod[] } {
  const ov = overrides.find((o) => o.cohortKey === cohortKey);
  return {
    startsOn: ov?.startsOn ?? base.startsOn,
    endsOn: ov?.endsOn ?? base.endsOn,
    // 저장된 구간이 없으면 기본(월·화·목) 한 구간 — 읽는 쪽이 분기하지 않게 여기서 채운다
    weekdayPeriods: normalizeWeekdayPeriods(ov?.weekdayPeriods),
  };
}

/** 「1~26주 월·화·목 / 27주~ 일·수·목」처럼 사람이 읽는 한 줄 */
export function weekdayPeriodsLabel(periods: ClassWeekdayPeriod[], lastWeek?: number): string {
  const list = normalizeWeekdayPeriods(periods);
  return list
    .map((p, i) => {
      const to = i + 1 < list.length ? list[i + 1].fromWeek - 1 : lastWeek;
      const range = to && to > p.fromWeek ? `${p.fromWeek}~${to}주` : `${p.fromWeek}주~`;
      return `${range} ${p.weekdays.map((d) => WEEKDAY_NAMES[d]).join("·")}`;
    })
    .join(" / ");
}
