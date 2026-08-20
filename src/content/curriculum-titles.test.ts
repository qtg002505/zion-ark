import { describe, expect, it } from "vitest";
import {
  ELEMENTARY_COURSE_TITLES,
  ELEMENTARY_SHORT_TITLES,
  HIGH_COURSE_TITLES,
  MIDDLE_COURSE_TITLES,
  MIDDLE_SHORT_TITLES,
} from "./curriculum-titles";

/**
 * 과수 제목 정본과 **요약 표기의 짝**을 지킨다.
 *
 * 요약은 차례(인덱스)로 이어 붙으므로 **하나만 밀려도 엉뚱한 과수에 남의 줄임말이 붙는다** —
 * 그런데 화면은 멀쩡히 그려진다. 「빛 ~ 예복」 자리에 「보물 · 부자」가 떠도 사람이 원 제목을
 * 외우고 있지 않으면 못 잡는다. 개수와 빈칸만 지켜도 그 사고의 대부분이 막힌다.
 */

describe("정본 과수 개수 (리드 전달값)", () => {
  it("초등 25 · 중등 25 · 고등 23", () => {
    expect(ELEMENTARY_COURSE_TITLES).toHaveLength(25);
    expect(MIDDLE_COURSE_TITLES).toHaveLength(25);
    expect(HIGH_COURSE_TITLES).toHaveLength(23);
  });
});

describe("요약 표기는 정본과 1:1로 맞는다", () => {
  it("초등 — 정본과 요약의 개수가 같다", () => {
    expect(ELEMENTARY_SHORT_TITLES).toHaveLength(ELEMENTARY_COURSE_TITLES.length);
  });

  it("중등 — 정본과 요약의 개수가 같다", () => {
    expect(MIDDLE_SHORT_TITLES).toHaveLength(MIDDLE_COURSE_TITLES.length);
  });

  it("빈 요약이 없다 — 빈칸이면 좁은 칸이 통째로 비어 버린다", () => {
    for (const s of [...ELEMENTARY_SHORT_TITLES, ...MIDDLE_SHORT_TITLES]) {
      expect(s.trim()).not.toBe("");
    }
  });

  /**
   * 요약은 원 제목보다 짧아지는 것이 보통이지만 **「열쇠」 하나는 일부러 길어졌다** —
   * 리드가 「천국과 열쇠」로 정했다. 두 글자짜리 「열쇠」만 떠 있으면 **무슨 열쇠인지
   * 알 수 없어** 줄임말 노릇을 못 하기 때문이다.
   *
   * 예외를 목록으로 못 박아 두면, 나중에 또 길어진 항목이 생겼을 때 **의도한 것인지
   * 실수인지 여기서 한 번 묻게 된다.**
   */
  const LONGER_ON_PURPOSE = new Set(["열쇠"]);

  it("요약이 원 제목보다 길지 않다 — 「열쇠」만 뜻이 서게 늘렸다", () => {
    ELEMENTARY_SHORT_TITLES.forEach((s, i) => {
      const full = ELEMENTARY_COURSE_TITLES[i];
      if (LONGER_ON_PURPOSE.has(full)) {
        expect(s).toBe("천국과 열쇠");
        return;
      }
      expect(s.length).toBeLessThanOrEqual(full.length);
    });
    MIDDLE_SHORT_TITLES.forEach((s, i) => {
      expect(s.length).toBeLessThanOrEqual(MIDDLE_COURSE_TITLES[i].length);
    });
  });
});

describe("차례가 밀리지 않았는지 — 표본 몇 개를 짚어 본다", () => {
  /*
    개수만 맞고 순서가 통째로 밀린 경우를 잡는다. 리드가 준 목록에서 **양 끝과 가운데**를
    골랐다 — 밀림은 대개 목록 중간에 한 줄을 넣거나 빼면서 생긴다.
  */
  it("초등 첫 칸·끝 칸", () => {
    expect(ELEMENTARY_COURSE_TITLES[0]).toBe("두 가지 신");
    expect(ELEMENTARY_SHORT_TITLES[0]).toBe("두 신");
    expect(ELEMENTARY_COURSE_TITLES[24]).toBe("정통과 이단");
    expect(ELEMENTARY_SHORT_TITLES[24]).toBe("정통과 이단");
  });

  it("초등 — 기계로 자르면 뜻이 끊기던 자리", () => {
    expect(ELEMENTARY_COURSE_TITLES[7]).toBe("빛 · 등대와 소경 · 귀머거리 · 예복");
    expect(ELEMENTARY_SHORT_TITLES[7]).toBe("빛 ~ 예복");
  });

  it("중등 첫 칸·끝 칸", () => {
    expect(MIDDLE_COURSE_TITLES[0]).toBe("하나님의 언약, 아브라함과 계시록");
    expect(MIDDLE_SHORT_TITLES[0]).toBe("아브라함 ~ 계시록");
    expect(MIDDLE_COURSE_TITLES[24]).toBe("신천지 예수교 증거장막성전");
    expect(MIDDLE_SHORT_TITLES[24]).toBe("신ㆍ예ㆍ증");
  });

  it("고등 장 표기는 띄어 쓴다 (2026-08-18 리드가 통일했다)", () => {
    expect(HIGH_COURSE_TITLES[0].chapter).toBe("계 1:1~8");
    expect(HIGH_COURSE_TITLES[2].chapter).toBe("계 2장");
    expect(HIGH_COURSE_TITLES[22].chapter).toBe("계 22장");
    // 붙여 쓴 표기가 남아 있지 않은지
    for (const h of HIGH_COURSE_TITLES) expect(h.chapter).toMatch(/^계 /);
  });
});
