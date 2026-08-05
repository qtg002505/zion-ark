import raw from "./quotes/어록_주제별_정리.md?raw";

/**
 * 총회장님 어록 — 주제별 정리본 파싱 (원문: src/content/quotes/어록_주제별_정리.md).
 * 어록 본문은 그대로 탑재하며 오탈자 수정 외 변형·압축하지 않는다.
 * 원본 보관: 공유자료/어록_주제별_정리_출처제거_UTF-8.md (수정 금지)
 */

export interface QuoteItem {
  category: string;
  no: number;
  text: string;
}

function parse(md: string): { items: QuoteItem[]; categories: string[] } {
  const items: QuoteItem[] = [];
  const categories: string[] = [];
  let category = "";

  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      category = line.slice(3).trim();
      categories.push(category);
      continue;
    }
    const m = line.match(/^(\d+)\.\s+(.*)/);
    if (m && category) {
      items.push({ category, no: Number(m[1]), text: m[2] });
      continue;
    }
    // 번호 없는 이어지는 줄 → 직전 어록에 연결
    if (line && category && items.length > 0 && !line.startsWith("#") && !line.startsWith(">")) {
      items[items.length - 1].text += " " + line;
    }
  }
  return { items, categories };
}

const parsed = parse(raw);

export const QUOTE_ITEMS: QuoteItem[] = parsed.items;
export const QUOTE_TOPIC_LIST: string[] = parsed.categories;
