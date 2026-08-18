import { describe, expect, it } from "vitest";
import { canSendToAI, maskPhone, prepareForAI, redactForAI, scanPII } from "./privacy";

/**
 * 개인정보 거르기 — **밖으로 나가는 마지막 문**이다.
 *
 * ⚠️ 이 테스트가 통과한다고 안전해지지 않는다. 정규식은 실수를 잡는 장치이지 완전한
 * 차단이 아니고, **사람 이름은 못 잡는다**(「민수가 요즘」). 그 한계도 함께 적어 둔다 —
 * 다음 사람이 「테스트가 있으니 믿어도 되겠다」고 읽지 않게 하려는 것이다.
 * 서버가 같은 검사를 다시 하는 것이 최종 방어다(불변식 4).
 */

describe("scanPII — 사람에게 알린다", () => {
  it("휴대전화·주민번호·이메일을 잡는다", () => {
    expect(scanPII("연락처는 010-1234-5678입니다")).toContain("휴대전화 번호");
    expect(scanPII("990101-1234567")).toContain("주민등록번호 형태의 숫자");
    expect(scanPII("a.b@example.com으로 보내 주세요")).toContain("이메일 주소");
  });

  it("센터 아래 단위(분반)와 나이를 잡는다 — 익명화 기준이 지파·교회·센터까지다", () => {
    expect(scanPII("3분반 수강생")).toContain("분반 (센터 아래 단위는 적지 않습니다)");
    expect(scanPII("27세 남성")).toContain("나이");
  });

  it("이름으로 읽히는 호칭을 잡는다", () => {
    expect(scanPII("김민수 형제님이 오셨습니다")).toContain("이름으로 읽히는 호칭");
  });

  it("⚠️ 호칭 없는 이름은 못 잡는다 — 정규식의 한계", () => {
    expect(scanPII("민수가 요즘 힘들어합니다")).toEqual([]);
  });

  it("날짜는 화면 경고에서 빼 둔다 — 일정 이야기가 전부 걸리기 때문", () => {
    expect(scanPII("2026-08-18에 심방합니다")).toEqual([]);
  });

  it("걸린 것이 없으면 빈 배열", () => {
    expect(scanPII("이번 주 진도를 함께 점검했습니다")).toEqual([]);
  });
});

describe("redactForAI — 기계가 지운다", () => {
  it("값을 지우되 표시로 바꾼다 — 통째로 지우면 문장이 무너진다", () => {
    const r = redactForAI("010-1234-5678로 연락했고 27세입니다");
    expect(r.text).toContain("[연락처]");
    expect(r.text).toContain("[나이]");
    expect(r.text).not.toContain("1234-5678");
    expect(r.removed).toContain("휴대전화 번호");
  });

  it("생년월일은 여기서는 가린다 — 화면 경고와 달리 밖으로는 못 내보낸다", () => {
    const r = redactForAI("1999-01-01생입니다");
    expect(r.text).toContain("[날짜]");
    expect(r.removed).toContain("생년월일 형태의 날짜");
  });

  it("가릴 것이 없으면 원문 그대로", () => {
    const text = "이번 주 진도를 함께 점검했습니다";
    expect(redactForAI(text)).toEqual({ text, removed: [] });
  });
});

describe("동의 없이는 나가지 않는다", () => {
  it("동의를 받았을 때만 보낸다", () => {
    expect(canSendToAI("granted").ok).toBe(true);
  });

  it("거절이면 막는다", () => {
    expect(canSendToAI("denied").ok).toBe(false);
  });

  it("⚠️ 모르면 막는다 — 기본값이 「안 보냄」이다", () => {
    const r = canSendToAI("unknown");
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy(); // 막힌 이유를 화면에 그대로 보여 준다
  });
});

describe("prepareForAI — 동의 확인과 비식별화를 한 자리에서", () => {
  it("동의가 없으면 글을 비운다 — 실수로 원문이 흘러가지 않게", () => {
    const r = prepareForAI("010-1234-5678", "unknown");
    expect(r.ok).toBe(false);
    expect(r.text).toBe("");
    expect(r.removed).toEqual([]);
  });

  it("동의가 있으면 가린 글을 준다", () => {
    const r = prepareForAI("010-1234-5678로 연락", "granted");
    expect(r.ok).toBe(true);
    expect(r.text).toContain("[연락처]");
    expect(r.text).not.toContain("1234");
  });
});

describe("표시 최소화", () => {
  it("maskPhone — 국번만 가리고 뒤 네 자리는 남긴다 (본인 확인 통화)", () => {
    expect(maskPhone("010-1234-4420")).toBe("010-****-4420");
    expect(maskPhone("01012344420")).toBe("010-****-4420");
  });

  it("전화번호 꼴이 아니면 그대로 둔다", () => {
    expect(maskPhone("연락처 없음")).toBe("연락처 없음");
  });
});
