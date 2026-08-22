import { describe, expect, it } from "vitest";
import { DONE_WEEKS, STUDENTS, studentWeekHistory, week4Attendees } from "./cohort-mock";

/**
 * 개강 4주차 출석자 (2026-08-22) — 출석률·종강률 분모 통일의 대리 기준.
 * ⚠️ 등록 시점 데이터가 붙으면 이 함수와 테스트를 함께 갈아 끼운다(교체 경계).
 */
describe("week4Attendees", () => {
  it("시범 명단 17명은 전원 개강 4주차에 출석 기록이 있다 (탈락자도 4주차까지는 나왔다)", () => {
    expect(week4Attendees(STUDENTS)).toHaveLength(STUDENTS.length);
  });

  it("개강 직후부터 기록이 없는 사람은 분모에서 빠진다", () => {
    const ghost = {
      ...STUDENTS[0],
      key: "과천교회|113기|1분반|검증용",
      lastAttended: null,
      recentWeeks: STUDENTS[0].recentWeeks.map((w) => ({ ...w, mark: "absent" as const })),
    };
    expect(week4Attendees([ghost])).toHaveLength(0);
  });

  it("4주차 판정은 weeksAgo = DONE_WEEKS - 4 주를 본다", () => {
    const w = studentWeekHistory(STUDENTS[0], DONE_WEEKS).find(
      (x) => x.weeksAgo === DONE_WEEKS - 4,
    );
    expect(w).toBeDefined();
  });
});
