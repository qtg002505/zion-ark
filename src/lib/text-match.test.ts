import { describe, expect, it } from "vitest";
import { looseCount, looseIncludes, looseIndexOf, normalizeForSearch } from "./text-match";

/**
 * 띄어쓰기 무시 매칭 — 사이트의 **모든 검색이 여기에 얹혀 있다**
 * (상단 검색·자료실·교안·시리즈·상담 사례·어록).
 *
 * 특히 `looseIndexOf`는 **스니펫을 자르는 자리**를 잡는다. 여기가 어긋나면 검색은 맞게
 * 걸리는데 보여 주는 대목만 엉뚱한 데서 잘린다 — 결과가 나오니 고장으로 보이지도 않는다.
 */

describe("looseIncludes — 띄어쓰기가 달라도 걸린다", () => {
  it("붙여 친 검색어가 띄어 쓴 원문에 걸린다", () => {
    expect(looseIncludes("천국 비밀을 깨닫고", "천국비밀")).toBe(true);
  });

  it("띄어 친 검색어가 붙여 쓴 원문에 걸린다", () => {
    expect(looseIncludes("천국비밀을 깨닫고", "천국 비밀")).toBe(true);
  });

  it("대소문자도 무시한다", () => {
    expect(looseIncludes("Ask AI 검색", "ask ai")).toBe(true);
  });

  it("없는 낱말은 안 걸린다", () => {
    expect(looseIncludes("천국 비밀", "지옥")).toBe(false);
  });

  it("빈 검색어는 안 걸린다 — 전부 걸리면 검색이 아니다", () => {
    expect(looseIncludes("아무 글", "")).toBe(false);
  });
});

describe("looseIndexOf — 자리는 원문 기준이다", () => {
  it("원문에 그대로 있으면 그 자리", () => {
    expect(looseIndexOf("가나다 천국 비밀", "천국 비밀")).toBe(4);
  });

  it("⚠️ 붙여 친 검색어도 **원문의** 시작 자리를 준다", () => {
    const text = "가나다 천국 비밀을 깨닫고";
    const i = looseIndexOf(text, "천국비밀");
    expect(i).toBe(4); // 공백을 지운 문자열의 자리(3)가 아니라 원문의 자리
    expect(text.slice(i, i + 5)).toBe("천국 비밀");
  });

  it("공백을 지운 위치와 다르다는 것을 못 박아 둔다", () => {
    const text = "가나다 천국 비밀";
    expect(normalizeForSearch(text).indexOf("천국비밀")).toBe(3); // 공백 없는 문자열 기준
    expect(looseIndexOf(text, "천국비밀")).toBe(4); // 원문 기준 — 이 값을 써야 한다
  });

  it("없으면 -1", () => {
    expect(looseIndexOf("천국 비밀", "지옥")).toBe(-1);
  });

  it("⚠️ 빈 낱말에는 0을 준다 — `looseIncludes`(false)와 대칭이 아니다", () => {
    /*
      `String.indexOf("")`가 0이라 그대로 나온다. 지금은 무해하다 — 스니펫을 자르는
      `snippetOf`가 유일한 사용처인데 거기서는 -1도 0으로 바꿔 쓰기 때문에 결과가 같고,
      점수 매기기(`scoreOf`)가 빈 낱말을 애초에 넘기지 않는다.
      다만 **빈 낱말이 「찾았다」로 읽히는 비대칭**이므로, 새로 쓰는 곳에서 이 값을
      「찾음/못 찾음」 판정에 쓰지 않는다. 판정은 `looseIncludes`로 한다.
    */
    expect(looseIndexOf("천국 비밀", "")).toBe(0);
    expect(looseIncludes("천국 비밀", "")).toBe(false);
  });

  it("어긋났다가 다시 맞는 경우도 찾는다", () => {
    // 「천지 천국 비밀」에서 「천국비밀」을 찾을 때, 첫 「천」에 걸렸다가 어긋난 뒤
    // 두 번째 「천」부터 다시 맞아야 한다
    const text = "천지 천국 비밀";
    const i = looseIndexOf(text, "천국비밀");
    expect(text.slice(i)).toBe("천국 비밀");
  });
});

describe("looseCount — 띄어쓰기를 무시하고 센다", () => {
  it("표기가 섞여 있어도 함께 센다", () => {
    expect(looseCount("천국비밀 그리고 천국 비밀", "천국비밀")).toBe(2);
  });

  it("없으면 0, 빈 낱말도 0", () => {
    expect(looseCount("천국 비밀", "지옥")).toBe(0);
    expect(looseCount("천국 비밀", "")).toBe(0);
  });
});
