import { describe, expect, it } from "vitest";
import {
  CLASS_WEEKDAYS,
  LATE_CLASS_WEEKDAYS,
  addDays,
  countClassDays,
  normalizeWeekdayPeriods,
  offsetInWeek,
  weekLabelOf,
  weekNoOf,
  weekdaysOfWeek,
  mondayOfWeek,
  progressPct,
  newcomerEndOf,
  type ClassWeekdayPeriodList,
} from "./cohort-calendar";

/**
 * 기수 일정 산수 — **여기 걸린 규칙은 어긋나면 조용히 틀린다.**
 *
 * 출결 격자·회차 번호·주차 사유 기록이 전부 이 함수들에 얹혀 있는데, 틀려도 화면은
 * 멀쩡히 그려진다(회차 하나가 빠지거나 라벨이 한 주 밀릴 뿐이다). 눈으로는 못 잡는
 * 종류라서 검산을 문서(`docs/HANDOFF.md`)에 적어 두었는데, 그 검산을 사람이 다시 세지
 * 않도록 여기로 옮겼다.
 */

/** 목업 기수 — 개강 3/2, 종강 10/29 (`content/cohort-mock.ts`의 `SCHEDULE`과 같은 값) */
const START = "2026-03-02";
const END = "2026-10-29";

/** 6개월차부터 요일이 바뀐다 — 27주차부터 일·수·목 (2026-08-15 리드 확정) */
const PERIODS: ClassWeekdayPeriodList = [
  { fromWeek: 1, weekdays: CLASS_WEEKDAYS },
  { fromWeek: 27, weekdays: LATE_CLASS_WEEKDAYS },
];

describe("일요일은 그 주의 첫날이다", () => {
  /*
    월요일 수업이 하루 앞당겨져 일요일이 된 것이므로, 그 일요일은 월요일 **앞**에 붙는다.
    `offsetInWeek`과 `weekNoOf` 두 곳이 같은 규칙을 써야 하고, 어긋나면 구간 첫 주의
    일요일 수업이 앞 주차로 밀려 회차에서 통째로 빠진다.
  */
  it("offsetInWeek — 일요일은 월요일보다 하루 앞(-1)", () => {
    expect(offsetInWeek(0)).toBe(-1); // 일
    expect(offsetInWeek(1)).toBe(0); // 월
    expect(offsetInWeek(3)).toBe(2); // 수
    expect(offsetInWeek(4)).toBe(3); // 목
  });

  it("weekNoOf — 일요일은 이튿날 월요일과 같은 주차", () => {
    // 2026-08-30(일)과 2026-08-31(월)은 같은 주차여야 한다
    expect(weekNoOf(START, "2026-08-30")).toBe(weekNoOf(START, "2026-08-31"));
  });

  it("27주차 첫 수업은 8/30(일)이다 — 요일이 바뀌는 첫 주", () => {
    expect(weekNoOf(START, "2026-08-30")).toBe(27);
    expect(new Date("2026-08-30T00:00:00").getDay()).toBe(0); // 실제로 일요일인지도 함께 본다
  });
});

describe("수업 요일 구간", () => {
  it("26주차까지 월·화·목, 27주차부터 일·수·목", () => {
    expect(weekdaysOfWeek(1, PERIODS)).toEqual([1, 2, 4]);
    expect(weekdaysOfWeek(26, PERIODS)).toEqual([1, 2, 4]);
    expect(weekdaysOfWeek(27, PERIODS)).toEqual([0, 3, 4]);
    expect(weekdaysOfWeek(35, PERIODS)).toEqual([0, 3, 4]);
  });

  it("구간을 안 주면 기본값(월·화·목)", () => {
    expect(weekdaysOfWeek(30)).toEqual([1, 2, 4]);
  });

  it("normalizeWeekdayPeriods — 뒤섞인 순서·1주차 누락·빈 요일을 흡수한다", () => {
    const messy: ClassWeekdayPeriodList = [
      { fromWeek: 27, weekdays: [4, 0, 3] }, // 순서가 뒤죽박죽
      { fromWeek: 5, weekdays: [] }, // 요일이 비었다 — 버린다
      { fromWeek: 3, weekdays: [1, 2, 4] }, // 첫 구간이 1주차가 아니다
    ];
    const out = normalizeWeekdayPeriods(messy);
    expect(out[0].fromWeek).toBe(1); // 첫 구간은 1주차로 당겨진다
    expect(out[1].weekdays).toEqual([0, 3, 4]); // 요일은 오름차순 (0=일이 앞)
    expect(out).toHaveLength(2); // 빈 구간은 빠졌다
  });

  it("빈 목록이면 기본 구간으로 되돌린다 — 화면이 깨지지 않게", () => {
    expect(normalizeWeekdayPeriods([])).toEqual([{ fromWeek: 1, weekdays: CLASS_WEEKDAYS }]);
    expect(normalizeWeekdayPeriods(undefined)).toEqual([{ fromWeek: 1, weekdays: CLASS_WEEKDAYS }]);
  });
});

describe("수업 횟수 105회 — 두 가지 길로 세도 같아야 한다", () => {
  it("날짜를 훑어 세면 105회", () => {
    expect(countClassDays(START, END, PERIODS)).toBe(105);
  });

  it("주차별로 더해도 105회 — 훑기와 어긋나면 회차가 빠진 것이다", () => {
    const lastWeek = weekNoOf(START, END);
    let sum = 0;
    for (let w = 1; w <= lastWeek; w++) {
      const weekdays = weekdaysOfWeek(w, PERIODS);
      const monday = mondayOfWeek(START, w);
      for (const wd of weekdays) {
        const day = addDays(monday, offsetInWeek(wd));
        // 개강 전·종강 후는 세지 않는다
        if (day >= START && day <= END) sum++;
      }
    }
    expect(sum).toBe(105);
  });

  it("요일이 안 바뀌어도(월·화·목 한 구간) 105회 — 주당 3회는 그대로다", () => {
    expect(countClassDays(START, END)).toBe(105);
  });
});

describe("주차 라벨은 그 주 목요일 기준", () => {
  /*
    ⚠️ 저장된 주차 사유(`zion_ark_week_notes`)가 이 라벨로 조인된다 —
    규칙을 바꾸면 기록이 통째로 끊어진다. 검산값은 HANDOFF에 적힌 것 그대로다.
  */
  it("13주차는 「5월 4주」", () => {
    expect(weekLabelOf(mondayOfWeek(START, 13))).toBe("5월 4주");
  });

  it("18주차는 「7월 1주」", () => {
    expect(weekLabelOf(mondayOfWeek(START, 18))).toBe("7월 1주");
  });

  it("요일이 바뀌는 27주차는 「9월 1주」 — 월요일은 8/31이지만 라벨은 목요일(9/3) 것이다", () => {
    /*
      ⚠️ 달이 걸치는 주에서 **월요일과 라벨의 달이 다르다.** 27주차는 8/31(월)에 시작하지만
      라벨은 그 주 목요일 9/3을 따라 「9월 1주」다 — 월요일 기준으로 착각하면 「8월 5주」로
      읽어 저장된 주차 기록과 어긋난다.
    */
    expect(mondayOfWeek(START, 27)).toBe("2026-08-31");
    expect(weekLabelOf(mondayOfWeek(START, 27))).toBe("9월 1주");
  });
});

describe("진행률과 새신자교육 종강", () => {
  it("개강 전 0, 종강 후 100으로 자른다", () => {
    expect(progressPct(START, END, "2026-01-01")).toBe(0);
    expect(progressPct(START, END, "2026-12-31")).toBe(100);
  });

  it("8개월 과정이라 개강 당일은 반올림하면 0%다 — 진행률이 0이라고 개강 전인 것은 아니다", () => {
    expect(progressPct(START, END, START)).toBe(0);
  });

  it("한가운데(7월 1일 무렵)면 50% 언저리", () => {
    const mid = progressPct(START, END, "2026-07-01");
    expect(mid).toBeGreaterThan(45);
    expect(mid).toBeLessThan(55);
  });

  it("새신자교육 종강은 종강 +2주", () => {
    expect(newcomerEndOf(END)).toBe(addDays(END, 14));
  });
});
