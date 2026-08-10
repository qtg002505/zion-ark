import type { AttendanceMark, Student } from "./types";

/**
 * 출석률 두 가지 — 대면 출석률과 **보강 포함 출석률**.
 *
 * 대면으로 나온 것(`present`)만 세면 "보강으로 따라잡은 사람"이 결석자와 같이 묶여
 * 실제보다 나빠 보인다. 보강까지 마친 것(`makeupDone`)을 출석으로 함께 세면
 * **지금 정말로 진도를 따라오고 있는지**가 드러난다.
 *
 * ⚠️ 화면 이름은 **「보강 포함 출석률」**이다 (2026-08-10 리드 지시 — 처음 쓰던
 * 「전추율」에서 바꿨다). 줄임말보다 뜻이 바로 읽히는 쪽을 택했다.
 *
 * ⚠️ **출결 어휘(`AttendanceMark`)는 계약이라 손대지 않았다.** 여기서 하는 일은
 * 이미 있는 어휘를 어떻게 세느냐일 뿐이다:
 *   - 출석으로 세는 것: `present`(대면) · `makeupDone`(추후완료)
 *   - 결석으로 세는 것: `absent` · `makeupPending`(금주보강 — 아직 안 했다)
 *   - 세지 않는 것: `unknown`(미입력) — 모르는 것을 결석으로 치면 사실이 아니다
 *
 * ⚠️ 계산 범위는 **최근 8주**(`recentWeeks`)다. 누적으로 내려면 보강 이행 횟수가
 * 기수 전체 기간에 대해 있어야 하는데 지금 목업에는 없다. 실연동 시 출결 시트에서
 * 전 기간 마크가 오면 같은 함수에 더 긴 배열을 넣으면 된다.
 */

/** 이 마크를 출석으로 세는가 */
export function countsAsPresent(mark: AttendanceMark): boolean {
  return mark === "present" || mark === "makeupDone";
}

/** 미입력은 분모에서 뺀다 — 모르는 것을 결석으로 만들지 않는다 */
export function countsInDenominator(mark: AttendanceMark): boolean {
  return mark !== "unknown";
}

export interface RateBreakdown {
  /** 보강까지 포함한 실제 출석률 (%) — 화면 이름 「보강 포함 출석률」 */
  withMakeup: number;
  /** 대면만 센 출석률 (%) */
  presentOnly: number;
  presentCount: number;
  makeupDoneCount: number;
  absentCount: number;
  /** 아직 이행하지 않은 보강 — 결석으로 센다 */
  makeupPendingCount: number;
  unknownCount: number;
  /** 분모 (미입력 제외) */
  counted: number;
}

/** 한 사람의 최근 출결을 세어 보강 포함 출석률과 대면 출석률을 함께 낸다 */
export function rateOf(student: Student): RateBreakdown {
  const marks = student.recentWeeks.map((w) => w.mark);
  const n = (m: AttendanceMark) => marks.filter((x) => x === m).length;

  const presentCount = n("present");
  const makeupDoneCount = n("makeupDone");
  const counted = marks.filter(countsInDenominator).length;
  const pct = (v: number) => (counted === 0 ? 0 : Math.round((v / counted) * 100));

  return {
    withMakeup: pct(presentCount + makeupDoneCount),
    presentOnly: pct(presentCount),
    presentCount,
    makeupDoneCount,
    absentCount: n("absent"),
    makeupPendingCount: n("makeupPending"),
    unknownCount: n("unknown"),
    counted,
  };
}

/** 기수 전체 평균 — 사람마다 분모가 다를 수 있어 사람 단위 비율의 평균으로 낸다 */
export function cohortRates(students: Student[]): { withMakeup: number; presentOnly: number } {
  if (students.length === 0) return { withMakeup: 0, presentOnly: 0 };
  const rows = students.map(rateOf);
  const avg = (pick: (r: RateBreakdown) => number) =>
    Math.round(rows.reduce((a, r) => a + pick(r), 0) / rows.length);
  return { withMakeup: avg((r) => r.withMakeup), presentOnly: avg((r) => r.presentOnly) };
}

/* ── 화면 표기 ── */

/** 격자 한 칸의 모양 — 사명자가 훑어보고 바로 읽히도록 기호를 고정한다 */
export const MARK_GLYPH: Record<AttendanceMark, string> = {
  present: "O",
  makeupDone: "△",
  makeupPending: "▽",
  absent: "X",
  unknown: "·",
};

export const MARK_LABEL: Record<AttendanceMark, string> = {
  present: "출석(대면)",
  makeupDone: "보강 완료",
  makeupPending: "보강 예정(미이행)",
  absent: "결석",
  unknown: "미입력",
};

/**
 * 칸 색 — 출석은 녹색 계열, 결석은 붉은 계열, 보강은 그 사이.
 * ⚠️ **색만으로 뜻을 전하지 않는다** — 기호(O·△·▽·X)를 함께 넣어 색을 구별하기
 * 어려운 사람도 읽을 수 있게 한다.
 */
export const MARK_TONE: Record<AttendanceMark, string> = {
  present: "bg-zion-700 text-white border-zion-700",
  makeupDone: "bg-zion-100 text-zion-800 border-zion-300",
  makeupPending: "bg-gold-100 text-gold-700 border-gold-500/50",
  absent: "bg-red-50 text-red-600 border-red-200",
  unknown: "bg-white text-ink-soft border-zion-100",
};
