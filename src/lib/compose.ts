import { elementaryLessons } from "../content/elementary-lessons";
import { HIGH_LESSONS } from "../content/lessons-high";
import { SERIES } from "../content/series-content";
import { QUOTE_ITEMS } from "../content/quotes-data";
import { enneagramGuides } from "../content/enneagram-guides";
import { splitSections } from "./markdown";
import { extractKeywords } from "./quote-picker";
import type { LibraryMaterial } from "./types";

/**
 * 주제 하나로 강의 자료를 한 번에 모은다.
 *
 * 지금까지 교안·시리즈·어록·자료실이 각각 따로 있어, 강사가 한 주제를 준비하려면
 * 네 곳을 돌아다녀야 했다. 여기서는 같은 주제어로 네 곳을 훑어 종류별로 묶어 준다.
 *
 * 원칙(불변식): 원문을 그대로 인용하고 **요약·재작성하지 않는다**. 어디서 왔는지
 * 출처를 반드시 붙인다. 수강생 개인정보는 다루지 않는다 — 공통 교육 자료만 본다.
 */

export type ComposeKind = "교안" | "시리즈" | "어록" | "에니어그램" | "자료실";

export interface ComposeHit {
  kind: ComposeKind;
  /** 출처 표기 — 인용할 때 그대로 쓴다 */
  source: string;
  title: string;
  /** 원문 그대로의 본문 (요약하지 않음) */
  body: string;
  href: string;
  score: number;
}

export interface ComposeGroup {
  kind: ComposeKind;
  hits: ComposeHit[];
}

export interface ComposeResult {
  keywords: string[];
  groups: ComposeGroup[];
  total: number;
}

/**
 * 어느 자료를 훑는지 — 화면에서 그대로 보여 준다.
 *
 * 출처를 검색 뒤에야 알게 되면 "여기 없다"인지 "안 찾아봤다"인지 구분이 안 된다.
 * 찾기 전에 범위를 밝혀 두면 빈 결과도 판단할 수 있는 정보가 된다.
 * 강 수·자료 건수는 늘어나므로 설명에 숫자를 박지 않는다.
 */
export const COMPOSE_SOURCES: { kind: ComposeKind; desc: string }[] = [
  { kind: "교안", desc: "초등 · 고등 강의 교안 — 항목 단위로 찾습니다" },
  { kind: "시리즈", desc: "신천지도서 — 장 안의 소주제 단위로 찾습니다" },
  { kind: "어록", desc: "총회장님 어록 — 주제와 번호를 출처로 붙입니다" },
  { kind: "에니어그램", desc: "수강생 응대 참고 자료입니다 (판정 근거가 아닙니다)" },
  { kind: "자료실", desc: "사이트에 등록된 자료를 함께 봅니다" },
];

/** 주제어가 본문에 얼마나 등장하는지 — 많이 나올수록 그 주제를 실제로 다룬 대목이다 */
function scoreOf(text: string, keywords: string[]): number {
  let score = 0;
  let matched = 0;
  for (const k of keywords) {
    const n = text.split(k).length - 1;
    if (n > 0) {
      score += Math.min(n, 5) * 2;
      matched++;
    }
  }
  // 주제어를 여럿 준 경우, 여럿을 함께 다루는 대목을 위로 올린다
  if (keywords.length > 1 && matched > 1) score += (matched - 1) * 5;
  return score;
}

/**
 * 너무 긴 대목은 강의안에 그대로 붙이기 어려워 앞부분만 싣고 표시를 남긴다.
 * `export`인 이유: 녹취록 정리(`transcript-digest.ts`)가 같은 자르기를 쓴다 —
 * 복사해 가면 「…(이하 원문에서 계속)」 문구가 두 벌로 갈린다.
 */
export function clip(text: string, max = 1200): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(0, max) + "\n\n…(이하 원문에서 계속)";
}

/** 묶음 순서는 위 목록과 같다 — 화면 안내와 결과 순서가 어긋나지 않게 한 곳에서 가져온다 */
const KIND_ORDER: ComposeKind[] = COMPOSE_SOURCES.map((s) => s.kind);

/**
 * 교안·시리즈 원문을 소주제로 쪼갠 결과를 한 번만 계산해 둔다.
 *
 * 검색할 때마다 계시록 22강과 시리즈 전 장을 다시 파싱하고 있었다. 원문은 모듈에
 * 박혀 있어 세션 중에 바뀌지 않으므로 결과를 그대로 재사용해도 동작이 달라지지 않는다.
 * (자료실 자료는 사용자가 등록하는 값이라 여기 담지 않는다.)
 */
const sectionCache = new Map<string, ReturnType<typeof splitSections>>();

function cachedSections(key: string, body: string) {
  let parsed = sectionCache.get(key);
  if (!parsed) {
    parsed = splitSections(body);
    sectionCache.set(key, parsed);
  }
  return parsed;
}

export function composeMaterials(
  input: string,
  materials: LibraryMaterial[],
  perKind = 6,
): ComposeResult {
  const keywords = extractKeywords(input);
  if (keywords.length === 0) return { keywords, groups: [], total: 0 };

  const hits: ComposeHit[] = [];

  // ── 교안: 강 전체가 아니라 항목 단위로 잡는다 (그 대목만 인용하기 위해) ──
  for (const lesson of elementaryLessons) {
    for (const sec of lesson.sections) {
      const body = sec.items.join("\n");
      const score = scoreOf(`${lesson.title} ${sec.label} ${body}`, keywords);
      if (score === 0) continue;
      hits.push({
        kind: "교안",
        source: `초등 교안 ${lesson.lessonNo}강 「${lesson.title}」 — ${sec.label}`,
        title: `${lesson.lessonNo}강 ${sec.label}`,
        body: sec.items.map((i) => `· ${i}`).join("\n"),
        href: "/lessons",
        score,
      });
    }
  }

  for (const lesson of HIGH_LESSONS) {
    const { sections } = cachedSections(`high:${lesson.id}`, lesson.body);
    for (const sec of sections) {
      const score = scoreOf(`${lesson.label} ${lesson.title} ${sec.title} ${sec.body}`, keywords);
      if (score === 0) continue;
      hits.push({
        kind: "교안",
        source: `고등 교안 ${lesson.label} 「${lesson.title}」 — ${sec.title}`,
        title: `${lesson.label} ${sec.title}`,
        body: clip(sec.body),
        href: "/lessons?course=high",
        score,
      });
    }
  }

  // ── 시리즈: 장 전체는 너무 길어 소주제 단위로 잡는다 ──
  for (const series of SERIES) {
    for (const ch of series.chapters) {
      const { sections } = cachedSections(`series:${series.id}:${ch.id}`, ch.body);
      for (const sec of sections) {
        const score = scoreOf(`${ch.label} ${ch.title} ${sec.title} ${sec.body}`, keywords);
        if (score === 0) continue;
        hits.push({
          kind: "시리즈",
          source: `${series.name} ${ch.label} — ${sec.title}`,
          title: `${ch.label} ${sec.title}`,
          body: clip(sec.body),
          href: `/series/${series.id}?ch=${ch.id}`,
          score,
        });
      }
    }
  }

  // ── 어록: 원문 그대로, 주제·번호를 출처로 ──
  const seenQuote = new Set<string>();
  for (const q of QUOTE_ITEMS) {
    const score = scoreOf(`${q.category} ${q.text}`, keywords);
    if (score === 0) continue;
    // 같은 어록이 여러 주제에 중복 수록돼 있어 앞부분으로 걸러 낸다
    const key = q.text.replace(/\s/g, "").slice(0, 40);
    if (seenQuote.has(key)) continue;
    seenQuote.add(key);
    hits.push({
      kind: "어록",
      source: `총회장님 어록 — ${q.category} ${q.no}번`,
      title: q.text.length > 40 ? q.text.slice(0, 40) + "…" : q.text,
      body: q.text,
      href: "/quotes",
      score,
    });
  }

  // ── 에니어그램: 수강생 응대 참고 (판정 근거가 아니라 참고 자료다) ──
  for (const g of enneagramGuides) {
    for (const sec of g.sections) {
      const body = sec.items.join("\n");
      const score = scoreOf(`${g.title} ${sec.label} ${body}`, keywords);
      if (score === 0) continue;
      hits.push({
        kind: "에니어그램",
        source: `에니어그램 ${g.typeNo}번 「${g.title}」 — ${sec.label}`,
        title: `${g.typeNo}번 ${sec.label}`,
        body: sec.items.map((i) => `· ${i}`).join("\n"),
        href: "/enneagram",
        score,
      });
    }
  }

  // ── 자료실: 사이트에 등록된 자료 ──
  for (const m of materials) {
    const score = scoreOf(`${m.title} ${m.body}`, keywords);
    if (score === 0) continue;
    hits.push({
      kind: "자료실",
      source: `자료실 — ${m.title}`,
      title: m.title,
      body: clip(m.body),
      href: "/library",
      score,
    });
  }

  const groups: ComposeGroup[] = [];
  for (const kind of KIND_ORDER) {
    const list = hits
      .filter((h) => h.kind === kind)
      .sort((a, b) => b.score - a.score || a.body.length - b.body.length)
      .slice(0, perKind);
    if (list.length > 0) groups.push({ kind, hits: list });
  }

  return { keywords, groups, total: groups.reduce((n, g) => n + g.hits.length, 0) };
}

/** 강의안에 그대로 붙일 수 있는 형태로 — 인용문마다 출처를 남긴다 */
export function composeToText(result: ComposeResult): string {
  const head = `[${result.keywords.join(" · ")}] 강의 자료 모음 — ${result.total}건`;
  const body = result.groups
    .map((g) => {
      const items = g.hits
        .map((h, i) => `${i + 1}) ${h.body}\n   — ${h.source}`)
        .join("\n\n");
      return `\n■ ${g.kind}\n\n${items}`;
    })
    .join("\n");
  return `${head}\n${body}\n\n※ 원문 그대로 인용했습니다. 인용 시 출처를 함께 표기해 주세요.`;
}
