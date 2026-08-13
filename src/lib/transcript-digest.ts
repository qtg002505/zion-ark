import { tokenize } from "./search";
import { clip } from "./compose";
import { extractRefs, type BibleRef } from "./bible-refs";
import { elementaryLessons } from "../content/elementary-lessons";
import { HIGH_LESSONS } from "../content/lessons-high";
import type { ParseResult, TranscriptSegment } from "./transcript-parse";

/**
 * 잘라 놓은 녹취록에서 **쓸 만한 것을 뽑는다** — 성구 · 교안 매칭 · 주제어 · 고른 문장.
 *
 * ## 알갱이가 다르다 (중복 금지의 근거)
 *
 * - `search.ts` — 강/유형 **통째로**. 질문 → 그 화면으로
 * - `compose.ts` — **섹션 통째로**. 주제어 → 강의안에 붙일 자료
 * - `advice-corpus.ts` — **항목 한 줄**. 관찰문 → 조언 칸에 꽂을 근거
 * - **여기 — 문장 하나.** 밖에서 들어온 원문 → **그 원문 안에서** 고른 문장
 *
 * 공유하는 것은 `search.ts`의 `tokenize()`와 `compose.ts`의 `clip()`뿐이다.
 *
 * ## ⚠️ 불변식 5가 걸리는 유일한 자리
 *
 * 교리 콘텐츠는 재작성·요약이 금지다. 그래서 **이 파일은 문장을 만들지 않는다** —
 * 「고른 문장」은 원문 문장을 **그대로** 옮긴 것이고, 이 파일이 쓰는 글은 고정 상수
 * (`DIGEST_LIMITS`·`DIGEST_SOURCES`·머리글)뿐이다. 고른 것마다 **왜 골랐는지(`why`)를
 * 타입이 필수로 강제**해 이유 없는 선택을 만들 수 없게 했다
 * (`advice-corpus.ts`가 출처를 필수 필드로 강제한 것과 같은 수법).
 */

export type DigestKind = "구간" | "성구" | "교안" | "주제어" | "고른 문장";

/** 무엇을 훑는지 — 찾기 전에 밝혀 둔다 (`COMPOSE_SOURCES`와 같은 취지) */
export const DIGEST_SOURCES: { kind: DigestKind; desc: string }[] = [
  { kind: "구간", desc: "시간 또는 문단으로 잘라 접어 둡니다 — 원문 그대로입니다" },
  { kind: "성구", desc: "성경 66권 이름을 사전으로 찾습니다 — 표기는 적으신 그대로 둡니다" },
  { kind: "교안", desc: "초등 23강 · 고등 계시록 22장과 겹치는 낱말을 찾습니다 (회차 확정이 아닙니다)" },
  { kind: "주제어", desc: "자주 나온 낱말을 셉니다" },
  { kind: "고른 문장", desc: "⚠️ 여기부터는 사이트가 고른 것입니다 — 원문 문장을 그대로 옮기며 새로 쓰지 않습니다" },
];

/** 못 하는 것을 **입력 칸 위에** 먼저 밝힌다 — 넣기 전에 읽혀야 기대가 어긋나지 않는다 */
export const DIGEST_LIMITS = [
  "받아쓰기(음성 → 글)는 이 사이트가 하지 않습니다. 무료 받아쓰기 도구로 글을 만든 뒤 여기에 넣어 주세요.",
  "유머를 찾지 못합니다. 웃음은 말투 · 상황 · 표정에서 나오는데 글에는 남지 않습니다 — 아래 외부 AI 프롬프트로 넘기십시오.",
  "매끄러운 요약문을 쓰지 않습니다. 원문에서 문장을 고를 뿐입니다 — 교리 원문을 고쳐 쓰지 않는 것이 이 사이트의 규칙입니다.",
  "낱말이 겹치는지만 봅니다. 뜻이 같아도 낱말이 다르면 못 찾습니다 — 안 나왔다고 해당 없는 것이 아닙니다.",
  "저장하지 않습니다. 화면을 벗어나면 사라집니다 — 복사하거나 내려받아 두세요.",
];

/* ───────────────────────── 낱말 목록 ───────────────────────── */

/**
 * 말버릇 — 자주 나오지만 뜻이 없다.
 * ⚠️ **`search.ts`의 STOPWORDS에 넣지 않는다.** 「사람」·「말씀」을 거기서 빼면 검색과 조언이
 * 나빠진다. 녹취록에서만 한 번 더 거르는 자리다.
 */
const FILLER = new Set([
  "그래서", "그러니까", "그런데", "이제", "여러분", "이렇게", "그렇게", "지금", "사실", "정말",
  "얘기", "이야기", "부분", "때문", "경우", "이런", "저런", "그런", "우리", "저희", "여기",
  "거기", "이거", "그거", "저기", "다시", "한번", "조금", "많이", "약간", "아주", "매우",
]);

/**
 * 서술어 꼬리 — 「배우겠습니다」·「것입니다」·「가리킨다」는 주제가 아니라 말끝이다.
 * ⚠️ 이 저장소의 토크나이저(`search.ts`)는 **조사만 떼고 어미는 그대로 둔다**(형태소 분석기를
 * 일부러 안 쓴다). 검색에서는 그래도 되지만 「자주 나온 낱말」로 내보내면 눈에 거슬린다.
 */
const VERB_TAIL = /(습니다|입니다|합니다|됩니다|하세요|하십시오|네요|어요|아요|지요|군요|는데요|는데|거예요|겠죠|이라|이다|한다|된다|겠다|셨다)$/;

/** 강의에서 요지를 짚는 말투 — 이 말 뒤가 핵심일 때가 많다 */
const EMPHASIS = [
  "핵심은", "정리하면", "요약하면", "결론은", "중요한 것은", "중요한 건", "반드시", "꼭 기억",
  "기억하세요", "기억하십시오", "다시 말해", "다시 말하면", "무슨 말이냐", "왜냐하면", "그러므로",
];

/** 강의 내용이 아닌 말 — 녹취록에는 이런 것이 반드시 섞인다 */
const ASIDE = [
  "잠깐만", "잠시만", "어디까지 했", "출석", "쉬었다", "쉬는 시간", "화장실", "마이크", "들리세요",
  "안 들리", "소리가", "다음 주에", "숙제", "공지", "시작하겠습니다", "마치겠습니다",
];

/* ───────────────────────── 결과 타입 ───────────────────────── */

export interface VerseHit {
  key: string;
  /** 처음 나온 표기 그대로 (불변식 5) */
  raw: string;
  book: string;
  count: number;
  /** 어느 구간에서 나왔는지 */
  at: string[];
}

export interface LessonHit {
  source: string;
  href: string;
  /** 왜 그 강으로 보는지 — 겹친 낱말 */
  words: string[];
  score: number;
}

export interface TopicHit {
  word: string;
  count: number;
}

export type PickReason =
  | { kind: "성구"; detail: string }
  | { kind: "교안 낱말"; detail: string }
  | { kind: "주제어"; detail: string }
  | { kind: "강조 표현"; detail: string }
  | { kind: "구간 첫 문장"; detail?: string };

export interface DigestPick {
  /** 원문 문장 그대로 — 고치지 않는다 */
  text: string;
  segmentId: string;
  label: string;
  /**
   * 왜 골랐는지. **최소 하나가 타입으로 강제된다** — 이유 없는 선택은 만들 수 없다.
   * 화면에도 이 이유가 뱃지로 붙는다.
   */
  why: [PickReason, ...PickReason[]];
  score: number;
}

export interface DigestResult {
  segments: TranscriptSegment[];
  verses: VerseHit[];
  lessons: LessonHit[];
  topics: TopicHit[];
  picks: DigestPick[];
  meta: ParseResult;
  /** 담당자가 고른 강 (없으면 추정) */
  lessonPick: string | null;
}

/* ───────────────────────── 교안 서명 ───────────────────────── */

interface LessonSignature {
  source: string;
  href: string;
  /** 이 강에만 나오는 낱말 — 다른 강과 겹치면 변별력이 없다 */
  words: Set<string>;
  key: string;
}

let signatureCache: LessonSignature[] | null = null;

/**
 * 강마다 **고유 낱말**을 뽑아 둔다. 모듈이 사는 동안 한 번만 계산한다
 * (`adviceUnits()`·`staticDocs`와 같은 방식).
 *
 * 여러 강에 두루 나오는 낱말(하나님·말씀·성경)은 어느 강인지 가리지 못하므로 버린다 —
 * **문서빈도 2 이하만** 남긴다.
 */
function lessonSignatures(): LessonSignature[] {
  if (signatureCache) return signatureCache;

  const raw: { key: string; source: string; href: string; words: string[] }[] = [];

  for (const l of elementaryLessons) {
    const text = [l.title, ...l.sections.flatMap((s) => s.items)].join(" ");
    raw.push({
      key: `초등${l.lessonNo}`,
      source: `초등 ${l.lessonNo}강 「${l.title}」`,
      href: "/lessons",
      words: tokenize(text),
    });
  }
  for (const l of HIGH_LESSONS) {
    raw.push({
      key: `고등${l.id}`,
      source: `고등 ${l.label} 「${l.title}」`,
      href: "/lessons?course=high",
      words: tokenize(`${l.title} ${l.body}`),
    });
  }

  const df = new Map<string, number>();
  for (const r of raw) for (const w of new Set(r.words)) df.set(w, (df.get(w) ?? 0) + 1);

  signatureCache = raw.map((r) => ({
    key: r.key,
    source: r.source,
    href: r.href,
    words: new Set(r.words.filter((w) => (df.get(w) ?? 0) <= 2)),
  }));
  return signatureCache;
}

/* ───────────────────────── 뽑기 ───────────────────────── */

function topicsOf(segments: TranscriptSegment[]): TopicHit[] {
  const count = new Map<string, number>();
  const docCount = new Map<string, number>();

  for (const seg of segments) {
    const tokens = tokenize(seg.body);
    for (const t of tokens) count.set(t, (count.get(t) ?? 0) + 1);
    for (const t of new Set(tokens)) docCount.set(t, (docCount.get(t) ?? 0) + 1);
  }

  const limit = Math.max(1, Math.floor(segments.length * 0.6));
  const usable = [...count.entries()]
    .filter(([w]) => !FILLER.has(w) && w.length >= 2)
    // 숫자로 시작하는 토큰은 성구 표기·연도에서 온 것이라 주제가 아니다 (`13`·`1을`)
    .filter(([w]) => !/^\d/.test(w))
    .filter(([w]) => !VERB_TAIL.test(w))
    /*
      구간 대부분에 나오는 낱말은 변별력이 없다 — 다만 **구간이 적을 때는 이 규칙을 끈다.**
      4구간짜리 글에서는 핵심어가 3구간에 나오는 것이 정상인데, 60% 규칙을 그대로 걸었더니
      정작 가장 중요한 「머리」가 빠졌다.
    */
    .filter(([w]) => segments.length < 10 || (docCount.get(w) ?? 0) <= limit);

  /*
    한 번만 나온 낱말은 주제가 아니다. 다만 짧은 글에서는 전부 1회일 수 있어,
    2회 이상만 골랐을 때 너무 적으면(4개 미만) 1회짜리로 채운다.
  */
  const repeated = usable.filter(([, n]) => n >= 2);
  const pool = repeated.length >= 4 ? repeated : usable;

  return pool
    .map(([word, n]) => ({ word, count: n }))
    .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
    .slice(0, 12);
}

function versesOf(segments: TranscriptSegment[]): { hits: VerseHit[]; bySegment: Map<string, BibleRef[]> } {
  const bySegment = new Map<string, BibleRef[]>();
  const acc = new Map<string, VerseHit>();

  for (const seg of segments) {
    const refs = extractRefs(seg.body);
    if (refs.length > 0) bySegment.set(seg.id, refs);
    for (const r of refs) {
      const hit = acc.get(r.key);
      if (hit) {
        hit.count++;
        if (!hit.at.includes(seg.label)) hit.at.push(seg.label);
      } else {
        acc.set(r.key, { key: r.key, raw: r.raw, book: r.book.full, count: 1, at: [seg.label] });
      }
    }
  }

  return {
    hits: [...acc.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    bySegment,
  };
}

function lessonsOf(segments: TranscriptSegment[], pick: string | null): LessonHit[] {
  const tokens = new Set(segments.flatMap((s) => tokenize(s.body)));
  const hits: LessonHit[] = [];

  for (const sig of lessonSignatures()) {
    const words = [...sig.words].filter((w) => tokens.has(w) && !/^\d/.test(w));
    /*
      낱말 하나가 겹친 것으로는 그 강이라 볼 수 없다 — 「너희」 하나로 초등 3강이,
      「오늘」 하나로 17강이 딸려 오던 것을 막는다. 담당자가 강을 지정하면 그것은 그대로 올린다.
    */
    if (words.length < 2 && sig.key !== pick) continue;
    hits.push({
      source: sig.source,
      href: sig.href,
      words: words.slice(0, 8),
      // 담당자가 강을 지정했으면 그 강을 맨 위로 올린다
      score: words.length + (pick && sig.key === pick ? 1000 : 0),
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 3);
}

/** 이미 뽑은 문장과 얼마나 겹치는가 — 자동 자막의 롤업 잔재를 한 번 더 막는다 */
function tooSimilar(text: string, picked: string[]): boolean {
  const a = new Set(tokenize(text));
  if (a.size === 0) return true;
  for (const p of picked) {
    const b = new Set(tokenize(p));
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    if (shared / a.size >= 0.6) return true;
  }
  return false;
}

function picksOf(
  segments: TranscriptSegment[],
  topics: TopicHit[],
  lessons: LessonHit[],
): DigestPick[] {
  const topicWords = new Set(topics.map((t) => t.word));
  const lessonWords = new Set(lessons.flatMap((l) => l.words));
  const perSegment = segments.length <= 3 ? 3 : 2;
  const total = 12;

  const scored: DigestPick[] = [];

  for (const seg of segments) {
    const inSeg: DigestPick[] = [];

    seg.sentences.forEach((sentence, i) => {
      const why: PickReason[] = [];
      let score = 0;

      const refs = extractRefs(sentence);
      if (refs.length > 0) {
        score += 4;
        why.push({ kind: "성구", detail: refs.map((r) => r.raw).join(" · ") });
      }

      const tokens = tokenize(sentence);
      const hitLesson = tokens.filter((t) => lessonWords.has(t));
      if (hitLesson.length > 0) {
        score += Math.min(hitLesson.length * 3, 9);
        why.push({ kind: "교안 낱말", detail: hitLesson.slice(0, 4).join(" · ") });
      }

      const hitTopic = tokens.filter((t) => topicWords.has(t));
      if (hitTopic.length > 0) {
        score += Math.min(hitTopic.length, 4);
        why.push({ kind: "주제어", detail: hitTopic.slice(0, 4).join(" · ") });
      }

      const emphasis = EMPHASIS.find((e) => sentence.includes(e));
      if (emphasis) {
        score += 3;
        why.push({ kind: "강조 표현", detail: emphasis });
      }

      if (i === 0) {
        score += 2;
        why.push({ kind: "구간 첫 문장" });
      }

      if (sentence.length < 15) score -= 3;
      if (sentence.length > 200) score -= 2;
      // 강의 내용이 아닌 말은 크게 깎는다
      if (ASIDE.some((a) => sentence.includes(a))) score -= 4;

      if (score <= 2 || why.length === 0) return;
      inSeg.push({
        text: sentence,
        segmentId: seg.id,
        label: seg.label,
        why: why as [PickReason, ...PickReason[]],
        score,
      });
    });

    inSeg.sort((a, b) => b.score - a.score);
    scored.push(...inSeg.slice(0, perSegment));
  }

  const out: DigestPick[] = [];
  for (const p of scored.sort((a, b) => b.score - a.score)) {
    if (out.length >= total) break;
    if (tooSimilar(p.text, out.map((o) => o.text))) continue;
    out.push(p);
  }
  // 읽는 순서(구간 순)로 되돌린다 — 점수순으로 늘어놓으면 흐름이 끊긴다
  const order = new Map(segments.map((s, i) => [s.id, i]));
  return out.sort((a, b) => (order.get(a.segmentId) ?? 0) - (order.get(b.segmentId) ?? 0) || b.score - a.score);
}

/** 잘라 놓은 녹취록을 정리한다. 순수 함수 — 네트워크·스토어를 쓰지 않는다 */
export function digestTranscript(parsed: ParseResult, lessonPick: string | null = null): DigestResult {
  const { segments } = parsed;
  const topics = topicsOf(segments);
  const { hits: verses } = versesOf(segments);
  const lessons = lessonsOf(segments, lessonPick);
  const picks = picksOf(segments, topics, lessons);
  return { segments, verses, lessons, topics, picks, meta: parsed, lessonPick };
}

/* ───────────────────────── 내보내기 ───────────────────────── */

const KIND_LABEL: Record<ParseResult["kind"], string> = {
  srt: "자막 파일(SRT)",
  vtt: "자막 파일(VTT)",
  paste: "붙여넣은 글",
};

function reasonText(why: PickReason[]): string {
  return why.map((w) => (w.detail ? `${w.kind}(${w.detail})` : w.kind)).join(" · ");
}

/**
 * 복사·내려받기용 평문. `composeToText`(`compose.ts`)의 형식을 본떴다 —
 * `■` 묶음 머리와 꼬리 고지 위치까지 같게 두어 두 화면 산출물이 한 문서에 섞여도 읽힌다.
 */
export function digestToText(r: DigestResult): string {
  const out: string[] = [];
  const when = new Date().toISOString().slice(0, 10);
  const total = r.meta.totalMs ? ` · 총 ${Math.round(r.meta.totalMs / 60000)}분` : "";

  out.push(`[강의 정리] ${KIND_LABEL[r.meta.kind]} · 구간 ${r.segments.length}개${total} · ${when}`);
  out.push("※ ①은 원문 그대로 잘라 낸 것입니다. ②는 원문 문장을 그대로 고른 것이며, 문장을 새로 쓰지 않았습니다.");
  out.push("");

  out.push("■ ① 구간 — 원문 그대로");
  r.segments.forEach((s, i) => {
    out.push(`${i + 1}) ${s.label}`);
    out.push(clip(s.body).split("\n").map((l) => `   ${l}`).join("\n"));
    out.push("");
  });

  if (r.verses.length > 0) {
    out.push("■ ① 나온 성구 — 표기는 원문 그대로");
    for (const v of r.verses) out.push(`· ${v.raw}  ${v.count}회 (${v.at.join(" · ")})`);
    out.push("");
  }

  if (r.lessons.length > 0) {
    out.push("■ ① 겹치는 교안 — 회차를 확정한 것이 아닙니다");
    for (const l of r.lessons) out.push(`· ${l.source} — 겹친 낱말: ${l.words.join(" · ")}`);
    out.push("");
  }

  if (r.topics.length > 0) {
    out.push("■ ① 자주 나온 낱말");
    out.push(`· ${r.topics.map((t) => `${t.word}(${t.count})`).join(" · ")}`);
    out.push("");
  }

  if (r.picks.length > 0) {
    out.push("■ ② 사이트가 고른 문장 — 원문에서 그대로 옮겼습니다");
    for (const p of r.picks) {
      out.push(`> ${p.text}`);
      out.push(`  — ${p.label} 구간 · 고른 이유: ${reasonText(p.why)}`);
    }
    out.push("");
  }

  out.push("※ 유머 찾기와 매끄러운 요약문은 사이트가 하지 않습니다 — 화면의 외부 AI 프롬프트를 쓰십시오.");
  return out.join("\n");
}

/** 내려받기용 마크다운 — 위 평문의 `■`를 `##`로 바꾼 것이다 */
export function digestToMarkdown(r: DigestResult): string {
  return digestToText(r)
    .replace(/^\[강의 정리\]/m, "# 강의 정리\n\n")
    .replace(/^■ /gm, "## ");
}

export type PromptMode = "humor" | "summary";

/**
 * 외부 AI에 보낼 **뼈대**를 만든다.
 *
 * ⚠️ 녹취록을 통째로 넣을 수 없다(60분 = 4~6만 자). 구간 첫 문장 · 고른 문장 · 성구 · 교안 ·
 * 주제어만 넣으면 **약 3,000자**라 무료 등급에도 들어간다. 전체가 필요하면 화면의
 * **구간별 복사**로 하나씩 넣게 안내한다.
 *
 * ⚠️ **화자 이름은 넣지 않는다.** 파싱 단계에서 본문과 분리해 두었다 —
 * 정규식으로 가리는 것보다 구조로 막는 편이 강하다(`privacy.ts`가 「사람 이름은 못 잡는다」고
 * 못 박아 둔 그 구멍).
 */
export function digestToPrompt(r: DigestResult, mode: PromptMode): string {
  const head =
    mode === "humor"
      ? [
          "당신은 성경 교육 강의를 돕는 보조입니다.",
          "아래는 한 회차 강의에서 뽑아낸 뼈대입니다. 여기서 **웃음이 될 만한 대목과 예화로 쓸 만한 대목**을 골라 주세요.",
        ]
      : [
          "당신은 성경 교육 강의를 돕는 보조입니다.",
          "아래는 한 회차 강의에서 뽑아낸 뼈대입니다. 이것을 **수강생에게 나눠 줄 회차 요약문**으로 다듬어 주세요.",
        ];

  const body: string[] = [];
  body.push("[구간 흐름]");
  for (const s of r.segments) body.push(`- ${s.label} ${s.sentences[0] ?? ""}`.slice(0, 120));

  if (r.picks.length > 0) {
    body.push("", "[강의에서 두드러진 문장]");
    for (const p of r.picks) body.push(`- (${p.label}) ${p.text}`);
  }
  if (r.verses.length > 0) {
    body.push("", "[인용된 성구]");
    body.push(r.verses.map((v) => `${v.raw}(${v.count}회)`).join(" · "));
  }
  if (r.lessons.length > 0) {
    body.push("", "[겹치는 교안]");
    for (const l of r.lessons) body.push(`- ${l.source} (겹친 낱말: ${l.words.join(" · ")})`);
  }
  if (r.topics.length > 0) {
    body.push("", "[자주 나온 낱말]");
    body.push(r.topics.map((t) => t.word).join(" · "));
  }

  const rules =
    mode === "humor"
      ? [
          "1. 없는 이야기를 지어내지 마세요. 위 자료에 있는 대목만 짚어 주세요.",
          "2. 왜 그 대목이 웃음이 되는지 한 줄로 함께 적어 주세요.",
          "3. 어느 구간에서 가져왔는지 시간을 함께 적어 주세요.",
          "4. 위 자료에 없는 성경 해석을 새로 만들지 마세요.",
        ]
      : [
          "1. 위 자료에 없는 내용을 더하지 마세요. 있는 말을 다듬는 데까지만 해 주세요.",
          "2. 어느 구간에서 가져왔는지 시간을 함께 적어 주세요.",
          "3. 위 자료에 없는 성경 해석을 새로 만들지 마세요.",
          "4. 수강생이 읽을 글이므로 존댓말로, A4 한 장 안으로 적어 주세요.",
        ];

  return [...head, "", ...body, "", "지켜 주세요.", ...rules].join("\n");
}

/* ───────────────────────── 자기검증 ───────────────────────── */

/**
 * 결과가 제대로 만들어졌는지 센다. **「이유 없는 선택 0」이 불변식 5의 감시 지표다** —
 * 0이 아니면 타입 강제가 뚫린 것이다.
 */
export function digestStats(r: DigestResult): string {
  const noReason = r.picks.filter((p) => p.why.length === 0).length;
  const sig = lessonSignatures();
  const emptySig = sig.filter((s) => s.words.size === 0).length;
  return [
    `구간 ${r.segments.length}`,
    `성구 ${r.verses.length}`,
    `교안 ${r.lessons.length}강`,
    `주제어 ${r.topics.length}`,
    `고른 문장 ${r.picks.length}`,
    `이유 없는 선택 ${noReason}`,
    `강 서명 ${sig.length}(비어 있음 ${emptySig})`,
  ].join(" · ");
}
