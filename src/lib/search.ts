import { elementaryLessons } from "../content/elementary-lessons";
import { enneagramGuides } from "../content/enneagram-guides";
import { REVELATION_SERIES } from "../content/revelation";
import type { LibraryMaterial, WorkspaceEntry } from "./types";

/**
 * Ask AI 검색 — 사이트 자료 기반 답변 + 출처 표시 (확정 결정 5).
 * 현재는 로컬 키워드 검색이다. 실제 AI 연결 시에도 검색 대상은
 * 공통 교육 영역(교안·에니어그램·공지·어록·시리즈)으로 한정하며,
 * 수강생 개인정보(차트·상담·출결 원문)는 어떤 경우에도 입력에 넣지 않는다.
 */

export interface SearchHit {
  source: string; // 출처 표기 (예: "초등 교안 3강")
  sourceType: "교안" | "에니어그램" | "시리즈" | "자료실" | "공지" | "어록";
  title: string;
  snippet: string;
  href: string;
}

function snippetOf(text: string, term: string, len = 90): string {
  const idx = text.indexOf(term);
  const start = Math.max(0, idx - 20);
  const cut = text.slice(start, start + len).replace(/\n+/g, " ");
  return (start > 0 ? "…" : "") + cut + (start + len < text.length ? "…" : "");
}

export function searchSite(
  rawQuery: string,
  materials: LibraryMaterial[],
  entries: WorkspaceEntry[],
): SearchHit[] {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const lesson of elementaryLessons) {
    const text =
      lesson.title +
      " " +
      lesson.sections.map((s) => s.label + " " + s.items.join(" ")).join(" ");
    if (text.includes(q)) {
      hits.push({
        source: `초등 교안 ${lesson.lessonNo}강 — ${lesson.title}`,
        sourceType: "교안",
        title: `${lesson.lessonNo}강 — ${lesson.title}`,
        snippet: snippetOf(text, q),
        href: "/lessons",
      });
    }
  }

  for (const g of enneagramGuides) {
    const text =
      g.title + " " + g.sections.map((s) => s.label + " " + s.items.join(" ")).join(" ");
    if (text.includes(q)) {
      hits.push({
        source: `에니어그램 ${g.typeNo}번 유형 — ${g.title}`,
        sourceType: "에니어그램",
        title: `${g.typeNo}번 유형 — ${g.title}`,
        snippet: snippetOf(text, q),
        href: "/enneagram",
      });
    }
  }

  for (const ch of REVELATION_SERIES.chapters) {
    const text = `${ch.label} ${ch.title} ${ch.body ?? ""}`;
    if (text.includes(q)) {
      hits.push({
        source: `요한계시록의 실상 ${ch.label}`,
        sourceType: "시리즈",
        title: ch.title,
        snippet: snippetOf(text, q),
        href: `/series/revelation?ch=${ch.id}`,
      });
    }
  }

  for (const m of materials) {
    const text = m.title + " " + m.body;
    if (text.includes(q)) {
      hits.push({
        source: "자료실",
        sourceType: "자료실",
        title: m.title,
        snippet: snippetOf(text, q),
        href: "/library",
      });
    }
  }

  for (const e of entries) {
    const text = e.title + " " + e.body;
    if (!text.includes(q)) continue;
    if (e.kind === "quote") {
      hits.push({ source: "총회장님 어록", sourceType: "어록", title: e.title, snippet: snippetOf(text, q), href: "/quotes" });
    } else if (e.kind === "notice_hq" || e.kind === "notice_tribe") {
      hits.push({
        source: e.kind === "notice_hq" ? "총회 공지" : "지파 공지",
        sourceType: "공지",
        title: e.title,
        snippet: snippetOf(text, q),
        href: "/notices",
      });
    }
  }

  return hits.slice(0, 8);
}
