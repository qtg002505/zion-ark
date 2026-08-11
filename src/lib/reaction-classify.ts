import type { ReactionSentiment } from "./types";

/**
 * 수강생 피드백 자동 분류 — **브라우저 안에서만 도는** 낱말 규칙이다.
 *
 * 왜 로컬이었나: 종전 불변식 4가 수강생 기록을 AI 입력에 넣지 못하게 했다. 붙여넣는 글에는
 * 개인 사정이 그대로 들어 있어 바깥 API로 보낼 수 없었고, 낱말 규칙이면 데이터가 브라우저를
 * 떠나지 않는다.
 *
 * **2026-08-11에 그 원칙이 바뀌었다** — 「동의받고 비식별화한 정보만 보낸다」.
 * 이제 외부 AI로 분류를 옮길 수 있다. 옮길 때 지킬 것:
 *
 * 1. `src/lib/privacy.ts`의 **`prepareForAI(글, 동의상태)`를 거친 글만** 보낸다.
 *    동의가 확인되지 않으면 함수가 막아 준다
 * 2. 키를 브라우저에 두지 않는다 — **우리 서버를 거쳐** 부른다 (`VITE_ASK_API_PATH`)
 * 3. 서버에서 **같은 비식별화를 다시** 한다. 브라우저 검사는 우회될 수 있다
 * 4. 이 낱말 규칙을 지우지 말고 **폴백으로 남긴다** — 동의가 없거나 API가 죽었을 때
 *    화면이 멈추면 안 된다
 *
 * ⚠️ 분류는 제안이다 — 결과 화면에서 담당자가 갈래를 바꾼 뒤 저장한다.
 * 무엇 때문에 그렇게 나눴는지(걸린 낱말)를 함께 돌려줘 근거를 보인다.
 */

const POSITIVE = [
  "감사", "감동", "은혜", "기쁘", "기뻐", "좋았", "좋아", "좋다", "열심", "적극",
  "잘 따라", "잘따라", "먼저 연락", "질문이 많", "재밌", "재미있", "위로", "회복",
  "결심", "다짐", "꾸준", "성실", "믿음이 생", "마음이 열", "눈물", "고백",
];

const NEGATIVE = [
  "힘들", "힘겨", "어렵", "어려워", "부담", "불만", "지쳤", "지친", "포기", "그만",
  "빠지", "결석", "늦게", "연락이 안", "연락 안", "답이 없", "거부", "거절", "반발",
  "의심", "싫", "짜증", "화가", "서운", "불편", "멀어", "식었", "흔들",
];

const NOTABLE = [
  "가족", "부모", "남편", "아내", "자녀", "직장", "회사", "야근", "이직", "건강",
  "병원", "수술", "아프", "이사", "시험", "휴가", "여행", "군대", "임신", "출산",
  "경조사", "장례", "결혼", "시간대", "요청", "부탁", "질문:",
];

export interface ClassifiedLine {
  text: string;
  sentiment: ReactionSentiment;
  /** 분류 근거 — 걸린 낱말. 비어 있으면 규칙에 안 걸려 특이사항으로 넘긴 것 */
  matched: string[];
}

function hits(text: string, words: string[]): string[] {
  return words.filter((w) => text.includes(w));
}

/**
 * 붙여넣은 글을 문장 단위로 갈라 분류한다.
 * 줄바꿈·마침표·물음표에서 끊고, 너무 짧은 조각(2자 이하)은 버린다.
 */
export function classifyFeedback(raw: string): ClassifiedLine[] {
  const pieces = raw
    .split(/\n|(?<=[.!?。])\s+/)
    .map((s) => s.replace(/^[-·•\s]+/, "").trim())
    .filter((s) => s.length > 2);

  return pieces.map((text) => {
    const pos = hits(text, POSITIVE);
    const neg = hits(text, NEGATIVE);
    const note = hits(text, NOTABLE);

    // 긍·부정이 함께 걸리면 더 많이 걸린 쪽. 같으면 사람이 봐야 하니 특이사항으로
    let sentiment: ReactionSentiment;
    let matched: string[];
    if (pos.length > neg.length) {
      sentiment = "positive";
      matched = pos;
    } else if (neg.length > pos.length) {
      sentiment = "negative";
      matched = neg;
    } else {
      sentiment = "notable";
      matched = [...pos, ...neg, ...note];
    }
    // 감정과 무관하게 개인 사정 낱말이 걸리면 특이사항 근거로도 남긴다
    if (sentiment !== "notable" && note.length > 0) matched = [...matched, ...note];
    return { text, sentiment, matched };
  });
}
