import { QUOTE_ITEMS, QUOTE_TOPIC_LIST, type QuoteItem } from "../content/quotes-data";

/**
 * 주제로 어록 뽑기 — "전도 관련 어록 뽑아줘" 같은 요청에서 주제어를 골라내
 * 관련 어록을 관련도 순으로 모은다. 어록 본문은 그대로 쓰고 요약·재작성하지 않는다.
 * (AI 연결 시에도 검색 대상은 공통 교육 영역만 — 수강생 개인정보는 넣지 않는다.)
 */

/** 요청 문장에서 걷어낼 말 — 주제어만 남긴다 */
const STOP_WORDS = [
  "관련",
  "관한",
  "대한",
  "어록",
  "말씀",
  "내용",
  "부분",
  "자료",
  "좀",
  "다",
  "전부",
  "모두",
  "뽑아줘",
  "뽑아",
  "뽑기",
  "찾아줘",
  "찾아",
  "알려줘",
  "알려",
  "정리해줘",
  "정리해",
  "정리",
  "보여줘",
  "보여",
  "주세요",
  "해줘",
  "줘",
  "요",
];

/** 갈래가 다른 표현으로도 찾히게 하는 최소한의 연관어 */
const RELATED: Record<string, string[]> = {
  전도: ["추수", "열매", "복음방", "섭외", "센터"],
  기도: ["간구", "기도문"],
  청년: ["청년부", "젊은", "학생"],
  강사: ["가르", "교육", "강의"],
  전도사: ["분반", "관리", "센터"],
  사명: ["사명자", "맡은", "임무"],
  믿음: ["신앙", "확신"],
  말씀: ["성경", "진리", "계시"],
  교육: ["가르", "양육", "창조"],
  상담: ["권면", "위로", "심방"],
  보강: ["복습", "재교육"],
  인내: ["참고", "견디"],
  감사: ["은혜", "고마"],
  순종: ["따르", "말 듣"],
  사랑: ["용서", "품어"],
  나태: ["게으", "안일", "무관심"],
  실력: ["공부", "지식", "통달"],
};

export interface PickResult {
  item: QuoteItem;
  score: number;
}

/** 요청 문장 → 주제어 목록 */
export function extractKeywords(input: string): string[] {
  const cleaned = input
    .replace(/[?!.,'"“”‘’()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const words = cleaned
    .split(" ")
    .map((w) => {
      // 조사를 떼되, 떼고 나서 한 글자만 남으면 원래 낱말을 쓴다
      // ("전도"의 '도', "기도"의 '도'를 조사로 오인하지 않도록)
      const stripped = w.replace(/(이|가|은|는|을|를|의|도|만|에서|으로|에게)$/, "");
      return stripped.length >= 2 ? stripped : w;
    })
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .filter((w) => !STOP_WORDS.includes(w));

  // 중복 제거 후 최대 4개
  return [...new Set(words)].slice(0, 4);
}

/** 같은 어록이 여러 주제에 중복 수록돼 있어 앞부분으로 중복을 판정한다 */
function dedupeKey(text: string): string {
  return text.replace(/\s/g, "").slice(0, 40);
}

export function pickQuotes(input: string, limit = 20): { keywords: string[]; results: PickResult[] } {
  const keywords = extractKeywords(input);
  if (keywords.length === 0) return { keywords, results: [] };

  const expanded = new Map<string, string[]>();
  for (const k of keywords) expanded.set(k, RELATED[k] ?? []);

  const scored: PickResult[] = [];
  for (const item of QUOTE_ITEMS) {
    let score = 0;
    let matched = 0;

    for (const [k, related] of expanded) {
      let hit = false;

      // 주제(카테고리) 일치가 가장 강한 신호
      if (item.category === k) {
        score += 12;
        hit = true;
      } else if (item.category.includes(k)) {
        score += 8;
        hit = true;
      }

      // 본문 출현 횟수
      const count = item.text.split(k).length - 1;
      if (count > 0) {
        score += Math.min(count, 3) * 3;
        hit = true;
      }

      // 연관어는 약하게
      for (const r of related) {
        if (item.text.includes(r) || item.category.includes(r)) {
          score += 1;
          hit = true;
          break;
        }
      }

      if (hit) matched++;
    }

    if (score === 0) continue;
    // 주제어를 여러 개 준 경우, 여럿을 함께 만족하는 어록을 올린다
    if (keywords.length > 1) score += (matched - 1) * 6;
    // 지나치게 긴 어록은 뒤로 (인용하기 어렵다)
    if (item.text.length > 400) score -= 2;

    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.text.length - b.item.text.length);

  const seen = new Set<string>();
  const results: PickResult[] = [];
  for (const r of scored) {
    const key = dedupeKey(r.item.text);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(r);
    if (results.length >= limit) break;
  }

  return { keywords, results };
}

/** 입력창 아래에 띄울 추천 주제 — 어록이 많은 주제부터 */
export function popularTopics(count = 8): string[] {
  return [...QUOTE_TOPIC_LIST]
    .map((t) => ({ t, n: QUOTE_ITEMS.filter((i) => i.category === t).length }))
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((x) => x.t);
}

/** 뽑은 결과를 붙여넣기 좋은 텍스트로 */
export function toPlainText(keywords: string[], results: PickResult[]): string {
  const head = `[${keywords.join(" · ")}] 관련 어록 ${results.length}건`;
  const body = results.map((r, i) => `${i + 1}. ${r.item.text}  (${r.item.category})`).join("\n\n");
  return `${head}\n\n${body}`;
}
