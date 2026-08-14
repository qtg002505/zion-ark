/**
 * 개인을 짚을 수 있는 표현을 찾고 가린다.
 *
 * 종전에는 이 규칙이 `src/pages/CounselCases.tsx` 안에 있었다. 상담 사례 화면 하나만
 * 쓰던 시절의 자리인데, **외부 AI로 글을 보내려면 어느 화면에서든 같은 검사를 거쳐야** 해서
 * 2026-08-11에 여기로 옮겼다 (불변식 4 변경 — 「동의받고 비식별화한 정보만 보낸다」).
 *
 * ## 두 가지 쓰임
 *
 * - `scanPII()` — **사람에게 알린다.** 글을 올리기 전에 무엇이 걸렸는지 보여 주고 스스로
 *   지우게 한다. 상담 사례·상담법 등록에서 쓴다
 * - `redactForAI()` — **기계가 지운다.** 외부 AI로 나가기 직전에 가린다.
 *   사람이 못 보고 넘긴 것을 마지막에 한 번 더 막는 자리다
 *
 * ## ⚠️ 이것만으로 안전해지지 않는다
 *
 * 정규식은 **실수를 잡는 장치**이지 완전한 차단이 아니다. 특히 **사람 이름은 못 잡는다** —
 * 「김민수 형제님」은 걸리지만 「민수가 요즘」은 안 걸린다. 그래서 셋을 함께 지킨다:
 *
 * 1. **동의** — 동의가 확인된 대상의 기록만 보낸다 (`canSendToAI`)
 * 2. **비식별화** — 나가기 직전에 `redactForAI()`를 거친다
 * 3. **서버에서 다시** — 브라우저 검사는 우회될 수 있다. 서버가 같은 검사를 되풀이한다
 */

/** 걸러 내는 표현과 사람에게 보여 줄 이유 */
const PII_RULES: { re: RegExp; hint: string; mask: string }[] = [
  { re: /01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/g, hint: "휴대전화 번호", mask: "[연락처]" },
  { re: /\d{6}[-\s]?\d{7}/g, hint: "주민등록번호 형태의 숫자", mask: "[주민번호]" },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/g, hint: "이메일 주소", mask: "[이메일]" },
  {
    re: /\d+\s*분반|[가-힣A-Za-z]+\s*분반/g,
    hint: "분반 (센터 아래 단위는 적지 않습니다)",
    mask: "[분반]",
  },
  { re: /\d{2,3}\s*(세|살)/g, hint: "나이", mask: "[나이]" },
  { re: /[가-힣]{2,3}\s*(자매|형제)님?/g, hint: "이름으로 읽히는 호칭", mask: "[수강생]" },
  /**
   * 생년월일 — 외부로 보낼 때만 막는다. 화면에는 담당자가 생일을 봐야 하는 자리가 있다
   * (마이페이지 주간 스케줄러). 그래서 `scanPII`는 이 규칙을 건너뛴다.
   */
  { re: /\d{4}[-./]\d{1,2}[-./]\d{1,2}/g, hint: "생년월일 형태의 날짜", mask: "[날짜]" },
];

/** 화면에서 사람에게 알릴 때는 날짜까지 잡지 않는다 — 일정 이야기가 전부 걸린다 */
const SCAN_RULES = PII_RULES.filter((r) => r.hint !== "생년월일 형태의 날짜");

/** 글에 든 개인정보 표현의 **이유 목록**. 비어 있으면 걸린 것이 없다 */
export function scanPII(text: string): string[] {
  return SCAN_RULES.filter((r) => new RegExp(r.re.source).test(text)).map((r) => r.hint);
}

export interface RedactResult {
  /** 가려진 글 — 이것만 바깥으로 보낸다 */
  text: string;
  /** 무엇을 가렸는지 (사람에게 보여 주고 기록에 남긴다) */
  removed: string[];
}

/**
 * 외부로 보내기 직전에 가린다. **보내는 쪽은 반드시 이 함수를 거친 글만 넘긴다.**
 *
 * 지우지 않고 `[연락처]`처럼 **표시로 바꾸는** 이유: 통째로 지우면 문장이 무너져 AI가
 * 엉뚱하게 읽는다. 무엇이 있었는지는 남기되 값은 지우는 편이 답변 품질과 보호를 함께 얻는다.
 */
export function redactForAI(text: string): RedactResult {
  let out = text;
  const removed: string[] = [];
  for (const rule of PII_RULES) {
    const re = new RegExp(rule.re.source, "g");
    if (re.test(out)) {
      removed.push(rule.hint);
      out = out.replace(new RegExp(rule.re.source, "g"), rule.mask);
    }
  }
  return { text: out, removed };
}

/**
 * 표시 최소화 (2026-08-14 피드백 FB-07-B① — 즉시 기술 조치).
 *
 * 상세 화면의 전화·주소는 **기본이 마스킹**이고, 눌러야 전체가 보인다(해제는 감사 로그에
 * 남는다 — `store.logStudentAccess`). 「엄격해서 못 쓰는 시스템」이 되지 않게 해제는
 * 1클릭이고 담당 범위 안에서는 마찰을 더 두지 않는다 (지시문 주의사항).
 */

/** 010-****-4420 — 국번만 가린다. 마지막 네 자리는 본인 확인 통화에 필요해 남긴다 */
export function maskPhone(phone: string): string {
  return phone.replace(/^(01[016-9])[-\s.]?\d{3,4}[-\s.]?(\d{4})$/, "$1-****-$2");
}

/** 시·구까지만 — 동·번지를 가린다 (선교센터 '구' 단위 표기와 같은 눈높이) */
export function maskAddress(address: string): string {
  const parts = address.trim().split(/\s+/);
  return parts.length <= 2 ? address : `${parts.slice(0, 2).join(" ")} ***`;
}

/**
 * 동의 상태 — **백엔드가 붙기 전까지는 자리만 있다.**
 *
 * 동의를 어디에 어떻게 받아 둘지는 리드가 정할 몫이라(수강 신청서에 넣을지, 기수 단위로
 * 받을지) 지금은 「모름」으로 둔다. **모르면 보내지 않는다** — 이것이 기본값이다.
 * 실연동 시 `cohorts`/`students` 테이블의 동의 컬럼을 읽어 이 함수만 갈아 끼운다.
 */
export type ConsentState = "granted" | "denied" | "unknown";

export interface AiSendCheck {
  ok: boolean;
  /** 막힌 이유 — 화면에 그대로 보여 준다 */
  reason?: string;
}

/**
 * 이 글을 외부 AI로 보내도 되는지 판정한다.
 * 보내는 쪽은 **이 함수가 `ok`를 줄 때만** 요청을 만든다.
 */
export function canSendToAI(consent: ConsentState): AiSendCheck {
  if (consent === "granted") return { ok: true };
  if (consent === "denied") return { ok: false, reason: "이 대상은 외부 AI 사용에 동의하지 않았습니다." };
  return {
    ok: false,
    reason: "동의 여부가 확인되지 않았습니다. 확인 전에는 보내지 않습니다.",
  };
}

/**
 * 보내기 한 번을 통째로 준비한다 — 동의 확인과 비식별화를 **한 자리에서** 끝낸다.
 * 두 단계를 따로 부르게 두면 한쪽을 빠뜨리기 쉬워서 묶어 두었다.
 */
export function prepareForAI(text: string, consent: ConsentState): AiSendCheck & RedactResult {
  const check = canSendToAI(consent);
  if (!check.ok) return { ...check, text: "", removed: [] };
  return { ...check, ...redactForAI(text) };
}
