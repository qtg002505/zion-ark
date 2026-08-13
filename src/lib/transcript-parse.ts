/**
 * 강의 녹취록을 **구간으로 자른다.** 자막 파일(.srt/.vtt)과 붙여넣은 글을 모두 받는다.
 *
 * ## 이 파일이 하지 않는 것
 *
 * **아무것도 고르지 않는다.** 점수·매칭·성구 추출은 `transcript-digest.ts`가 한다.
 * 여기는 「원문을 자르기만」 한다 — `markdown.tsx`가 교안·시리즈에 대해 하는 일과 같은 성격이다.
 *
 * ## 왜 `splitSections`를 고치지 않고 형제 함수를 두는가
 *
 * `markdown.tsx:165`의 `splitSections`는 경계가 `##`·`[핵심]`·`◈` 셋인데 **녹취록에는 그런
 * 표제가 없다** — 그대로 쓰면 전부 `lead`로 떨어진다. 그렇다고 그 함수에 옵션을 더하지 않는다:
 *
 * - 교안·시리즈 6곳이 쓰고 `compose.ts`의 `sectionCache`가 결과를 캐싱한다 — 시그니처가 바뀌면 캐시 키가 어긋난다
 * - `boundaryTitle`은 **경계 줄을 본문에 남기지 않는다.** 녹취록에서 타임스탬프 줄이 사라지면
 *   안 된다 — 그 줄이 곧 구간 라벨이다
 *
 * ## ⚠️ 화면에서 `MarkdownLite`로 그리지 않는다
 *
 * `markdown.tsx:13`의 `stripArtifacts`가 **연속 2자 이상 한자를 지우고**(`[㐀-鿿]{2,}`)
 * `-`로 시작하는 줄을 불릿으로 바꾼다. 녹취록에는 한자가 정상적으로 들어가고 srt 대화 줄은
 * `- 네.`로 시작한다 — **표시 단계에서 원문이 변형된다.** `whitespace-pre-wrap`으로 그대로 그린다.
 */

/** 자막 한 칸 */
export interface Cue {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
}

/**
 * 구간 하나. 필드 이름을 `markdown.tsx`의 `DocSection`(`id`·`title`·`body`)에 맞춰 두어
 * 나중에 같은 하류(`Accordion`)에 그대로 붙는다.
 */
export interface TranscriptSegment {
  id: string;
  title: string;
  body: string;
  /** 화면에 뜨는 이름 — `"12:30 ~ 15:00"` 또는 `"문단 3"` */
  label: string;
  startMs?: number;
  endMs?: number;
  speakers: string[];
  sentences: string[];
}

export type SourceKind = "srt" | "vtt" | "paste";

export interface ParseResult {
  segments: TranscriptSegment[];
  kind: SourceKind;
  /** 자막 칸 수 (붙여넣기는 0) */
  cueCount: number;
  /** 형식이 어긋나 건너뛴 블록 수 */
  skipped: number;
  encoding?: "utf-8" | "euc-kr";
  speakers: string[];
  totalMs?: number;
  /** 무엇을 기준으로 잘랐는지 — 화면에 그대로 보여 준다 */
  splitBy: string;
}

/* ───────────────────────── 파일 읽기 ───────────────────────── */

/** 자막 파일 크기 상한 — 자막은 보통 100~500KB다 */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** 붙여넣기 글자 상한 — 약 4시간 분량 */
export const MAX_PASTE_CHARS = 300_000;
/** 자막 칸 상한 */
const MAX_CUES = 20_000;

/**
 * 자막 파일을 글로 읽는다.
 *
 * ⚠️ **한국에서 만든 `.srt`는 CP949(EUC-KR)인 경우가 흔하다.** `file.text()`는 UTF-8로만
 * 읽어 통째로 깨진다. 그래서 UTF-8로 먼저 읽어 보고 **대체 문자(`�`)가 많으면**
 * EUC-KR로 다시 읽는다. `TextDecoder`의 `euc-kr`은 **브라우저 내장이라 새 의존성이 아니다.**
 */
export async function readSubtitleFile(file: File): Promise<{ text: string; encoding: "utf-8" | "euc-kr" }> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  const broken = (utf8.match(/�/g) ?? []).length;

  if (utf8.length > 0 && broken / utf8.length > 0.005) {
    try {
      const euc = new TextDecoder("euc-kr").decode(buf);
      return { text: euc, encoding: "euc-kr" };
    } catch {
      // 브라우저가 euc-kr을 모르면 깨진 채로라도 UTF-8을 준다 (사람이 보고 판단한다)
    }
  }
  return { text: utf8, encoding: "utf-8" };
}

/* ───────────────────────── 자막 파싱 ───────────────────────── */

/**
 * 타임코드 — **.srt와 .vtt를 한 정규식으로 받는다.**
 * 시(hour) 생략(vtt), 밀리초 구분자 점/쉼표 차이를 함께 흡수한다.
 */
const TIME_LINE =
  /(?:(\d{1,3}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*--?>\s*(?:(\d{1,3}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

const toMs = (h: string | undefined, m: string, s: string, ms: string) =>
  (Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s)) * 1000 + Number(ms.padEnd(3, "0"));

/** vtt 안의 표시용 태그 — 원문 글자가 아니라 서식이라 걷어낸다 */
function stripCueTags(s: string): string {
  return s
    .replace(/<\d{1,3}:\d{2}:\d{2}[.,]\d{1,3}>/g, "") // 인라인 시간 태그
    .replace(/<\/?[cv](?:\.[^>\s]+)?(?:\s[^>]*)?>/g, "") // <c.클래스> · <v 화자> 닫는 태그
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

const VTT_VOICE = /^<v\s+([^>]+)>/;
/** 줄머리 화자 표기 — `김강사:` · `- 김강사:` · `[김강사]` · `화자 1:` */
const SPEAKER_PREFIX = /^(?:-\s*)?(?:\[([^\]]{1,12})\]|([가-힣A-Za-z][가-힣A-Za-z0-9 ]{0,9}))\s*[:：]\s+/;

function takeSpeaker(text: string): { speaker?: string; body: string } {
  const voice = VTT_VOICE.exec(text);
  if (voice) return { speaker: voice[1].trim(), body: text.slice(voice[0].length).trim() };

  const m = SPEAKER_PREFIX.exec(text);
  if (m) {
    const name = (m[1] ?? m[2]).trim();
    // 「결론:」 같은 낱말은 화자가 아니다 — 사람 이름꼴만 받는다
    if (name.length >= 2 && !/^(결론|정리|요약|참고|주의|질문|답변|예시)$/.test(name)) {
      return { speaker: name, body: text.slice(m[0].length).trim() };
    }
  }
  return { body: text };
}

/**
 * 자막 글을 칸으로 나눈다. 자막 형식이 아니면 `null`.
 *
 * ⚠️ **형식은 확장자가 아니라 내용으로 판정한다** — 확장자를 잘못 붙인 파일도 읽힌다.
 */
export function parseSubtitle(raw: string): { cues: Cue[]; kind: "srt" | "vtt"; skipped: number } | null {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const head = text.slice(0, 200);
  const looksVtt = /^\s*WEBVTT/.test(head);

  const blocks = text.split(/\n{2,}/);
  const cues: Cue[] = [];
  let skipped = 0;
  let commaStyle = false;
  let prevText = "";

  for (const block of blocks) {
    const lines = block.split("\n");
    const timeIdx = lines.findIndex((l) => TIME_LINE.test(l));
    if (timeIdx === -1) {
      // WEBVTT 머리·NOTE·STYLE·REGION은 정상적으로 타임코드가 없다 — 실패로 세지 않는다
      const first = lines[0]?.trim() ?? "";
      if (first && !/^(WEBVTT|NOTE|STYLE|REGION)/.test(first)) skipped++;
      continue;
    }

    const t = TIME_LINE.exec(lines[timeIdx])!;
    if (lines[timeIdx].includes(",")) commaStyle = true;

    // 타임코드 줄 **아래 전부**가 본문 — 순번·cue 식별자는 위에 있어 자연히 버려진다
    const rawBody = lines.slice(timeIdx + 1).join("\n").trim();
    if (!rawBody) continue;

    /*
      ⚠️ **화자를 먼저 떼고 나서 태그를 지운다.** 순서를 바꾸면 `stripCueTags`가
      `<v 김강사>`를 통째로 지워 화자를 영영 못 읽는다 (자기검증이 잡아낸 순서 오류다).
    */
    const { speaker, body: afterSpeaker } = takeSpeaker(rawBody);
    let body = stripCueTags(afterSpeaker).trim();
    if (!body) continue;

    /*
      유튜브 자동 자막의 롤업 — 같은 문장이 두 칸에 걸쳐 흐른다.
        칸3: 오늘은 비유한 짐승과
        칸4: 오늘은 비유한 짐승과 머리에 대해
      직전 칸으로 시작하면 그 접두를 잘라 낸다. 남는 것이 없으면 칸 자체를 버린다.
    */
    if (prevText && body.startsWith(prevText)) {
      const rest = body.slice(prevText.length).trim();
      if (rest.length < 2) continue;
      prevText = body;
      body = rest;
    } else {
      prevText = body;
    }

    cues.push({
      startMs: toMs(t[1], t[2], t[3], t[4]),
      endMs: toMs(t[5], t[6], t[7], t[8]),
      text: body,
      speaker,
    });
    if (cues.length >= MAX_CUES) break;
  }

  if (cues.length === 0) return null;
  return { cues, kind: looksVtt ? "vtt" : commaStyle ? "srt" : "vtt", skipped };
}

/* ───────────────────────── 구간 나누기 ───────────────────────── */

/** 화제가 바뀌는 자리로 본다 — 이만큼 말이 없었으면 끊는다 */
const SILENCE_BREAK_MS = 8_000;
const DEFAULT_WINDOW_MS = 3 * 60_000;

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function windowed(cues: Cue[], windowMs: number): Cue[][] {
  const groups: Cue[][] = [];
  let cur: Cue[] = [];
  for (const cue of cues) {
    if (cur.length > 0) {
      const gap = cue.startMs - cur[cur.length - 1].endMs;
      const span = cue.endMs - cur[0].startMs;
      if (gap >= SILENCE_BREAK_MS || span >= windowMs) {
        groups.push(cur);
        cur = [];
      }
    }
    cur.push(cue);
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
}

/**
 * 자막 칸을 시간 구간으로 묶는다.
 *
 * 창 크기를 고정하지 않는다 — **60분 강의가 15~25구간이 되는 것이 목표**다(아코디언에서
 * 훑기 좋은 수). 결과가 너무 많으면 창을 늘리고, 너무 적으면 줄여 다시 계산한다.
 */
export function segmentsFromCues(cues: Cue[]): TranscriptSegment[] {
  let groups = windowed(cues, DEFAULT_WINDOW_MS);
  if (groups.length > 40) groups = windowed(cues, 5 * 60_000);
  else if (groups.length < 5) groups = windowed(cues, 60_000);

  return groups.map((g, i) => {
    const body = g.map((c) => c.text).join("\n");
    const speakers = [...new Set(g.map((c) => c.speaker).filter((s): s is string => !!s))];
    const label = `${formatTime(g[0].startMs)} ~ ${formatTime(g[g.length - 1].endMs)}`;
    return {
      id: `seg${i}`,
      title: label,
      label,
      body,
      startMs: g[0].startMs,
      endMs: g[g.length - 1].endMs,
      speakers,
      sentences: splitSentences(body),
    };
  });
}

/* ─────────────────── 붙여넣기 나누기 (5단계) ─────────────────── */

/** 유튜브 대본 복사·클로바노트가 이 모양이다 — `0:00` 또는 `화자 1 00:12` */
const TS_LINE = /^(?:(화자\s*\d+|[가-힣]{2,4})\s+)?((?:\d{1,2}:)?\d{1,2}:\d{2})\s*$/;
/** `splitSections`가 쓰는 세 경계와 같다 — 사람이 손본 받아쓰기에 있을 수 있다 */
const HEADING_LINE = /^(?:##\s+.+|\[[^\]\s:]{1,8}\]|◈\s*.+)$/;

function toSeg(i: number, label: string, body: string, speakers: string[] = []): TranscriptSegment {
  return { id: `seg${i}`, title: label, label, body: body.trim(), speakers, sentences: splitSentences(body) };
}

/**
 * 붙여넣은 글을 구간으로 나눈다. **위에서부터 시도하고 걸리는 것이 있으면 거기서 멈춘다.**
 * 무엇으로 잘랐는지(`splitBy`)를 함께 돌려줘 화면에 밝힌다.
 */
export function splitTranscript(raw: string): { segments: TranscriptSegment[]; splitBy: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) return { segments: [], splitBy: "빈 글" };

  const lines = text.split("\n");

  // 1) 타임스탬프 줄 — 걸리면 시간 라벨까지 얻어 자막과 같은 대접을 받는다
  const tsHits = lines.filter((l) => TS_LINE.test(l.trim())).length;
  if (tsHits >= 3) {
    const segs: TranscriptSegment[] = [];
    let label = "시작";
    let speaker: string | undefined;
    let buf: string[] = [];
    const flush = () => {
      if (buf.join("\n").trim()) segs.push(toSeg(segs.length, label, buf.join("\n"), speaker ? [speaker] : []));
      buf = [];
    };
    for (const line of lines) {
      const m = TS_LINE.exec(line.trim());
      if (m) {
        flush();
        speaker = m[1]?.trim();
        label = m[2];
        continue;
      }
      buf.push(line);
    }
    flush();
    // 시간 표시는 사람이 남긴 명시적 경계다 — 짧다고 합치지 않는다
    if (segs.length > 0) return { segments: finalize(segs, false), splitBy: "받아쓰기의 시간 표시" };
  }

  // 2) 화자 전환 — `이름:` 줄머리가 세 번 이상 반복될 때만
  const speakerHits = lines.filter((l) => SPEAKER_PREFIX.test(l.trim())).length;
  if (speakerHits >= 3) {
    const segs: TranscriptSegment[] = [];
    let cur: { speaker?: string; lines: string[] } | null = null;
    for (const line of lines) {
      const { speaker, body } = takeSpeaker(line.trim());
      if (speaker) {
        if (cur) segs.push(toSeg(segs.length, cur.speaker ?? `구간 ${segs.length + 1}`, cur.lines.join("\n"), cur.speaker ? [cur.speaker] : []));
        cur = { speaker, lines: [body] };
      } else if (cur) cur.lines.push(line);
      else cur = { lines: [line] };
    }
    if (cur) segs.push(toSeg(segs.length, cur.speaker ?? `구간 ${segs.length + 1}`, cur.lines.join("\n"), cur.speaker ? [cur.speaker] : []));
    if (segs.length > 1) return { segments: finalize(segs, false), splitBy: "화자가 바뀌는 자리" };
  }

  // 3) 표제 (사람이 손본 받아쓰기)
  if (lines.some((l) => HEADING_LINE.test(l.trim()))) {
    const segs: TranscriptSegment[] = [];
    let label = "머리말";
    let buf: string[] = [];
    const flush = () => {
      if (buf.join("\n").trim()) segs.push(toSeg(segs.length, label, buf.join("\n")));
      buf = [];
    };
    for (const line of lines) {
      const t = line.trim();
      if (HEADING_LINE.test(t)) {
        flush();
        label = t.replace(/^##\s+/, "").replace(/^◈\s*/, "").replace(/^\[|\]$/g, "");
        continue;
      }
      buf.push(line);
    }
    flush();
    if (segs.length > 1) return { segments: finalize(segs, false), splitBy: "글 안의 표제" };
  }

  // 4) 빈 줄 두 개 이상 (문단)
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paras.length > 2) {
    return {
      segments: finalize(paras.map((p, i) => toSeg(i, `문단 ${i + 1}`, p)), true),
      splitBy: "빈 줄로 나뉜 문단",
    };
  }

  // 5) 글자 수 창 — 문장 끝에서 자른다
  const sentences = splitSentences(text);
  if (sentences.length <= 1) {
    return { segments: [toSeg(0, "전체", text)], splitBy: "나눌 단서를 찾지 못해 통째로" };
  }
  const segs: TranscriptSegment[] = [];
  let buf: string[] = [];
  for (const s of sentences) {
    buf.push(s);
    if (buf.join(" ").length >= 1200) {
      segs.push(toSeg(segs.length, `구간 ${segs.length + 1}`, buf.join(" ")));
      buf = [];
    }
  }
  if (buf.length > 0) segs.push(toSeg(segs.length, `구간 ${segs.length + 1}`, buf.join(" ")));
  return { segments: finalize(segs, true), splitBy: "글자 수 (문장 끝에서 자름)" };
}

/**
 * 구간을 다듬는다 — 너무 짧은 것은 합치고, 너무 긴 것은 문장 경계에서 쪼갠다.
 *
 * ⚠️ **구간이 적을 때는 합치지 않는다.** 시간 표시·화자·문단은 **사람이 남긴 명시적 경계**라
 * 그것을 지우면 안 된다. 처음에 무조건 합쳤더니 「0:00 / 1:30 / 3:00」으로 나뉜 글이
 * **구간 하나로 뭉쳐** 버렸다(자기검증이 잡았다). 합치기는 한 줄짜리가 잔뜩 섞인
 * 긴 글에서만 값을 한다.
 */
function finalize(segs: TranscriptSegment[], merge: boolean): TranscriptSegment[] {
  return splitLong(merge && segs.length > 8 ? mergeTiny(segs) : segs);
}

/** ⚠️ **화자가 바뀐 자리는 합치지 않는다** — 합치면 누가 한 말인지 흐려진다 */
function mergeTiny(segs: TranscriptSegment[]): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  for (const seg of segs) {
    const prev = merged[merged.length - 1];
    const sameSpeaker = prev && prev.speakers.join() === seg.speakers.join();
    if (prev && sameSpeaker && seg.body.length < 120) {
      prev.body = `${prev.body}\n${seg.body}`.trim();
      prev.sentences = splitSentences(prev.body);
      prev.endMs = seg.endMs ?? prev.endMs;
      if (prev.startMs !== undefined && prev.endMs !== undefined) {
        prev.label = `${formatTime(prev.startMs)} ~ ${formatTime(prev.endMs)}`;
        prev.title = prev.label;
      }
      continue;
    }
    merged.push({ ...seg });
  }
  return merged;
}

/** 지나치게 긴 구간은 반으로 — 아코디언 한 칸이 3,000자를 넘으면 읽히지 않는다 */
function splitLong(segs: TranscriptSegment[]): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const seg of segs) {
    if (seg.body.length <= 3000 || seg.sentences.length < 4) {
      out.push(seg);
      continue;
    }
    const half = Math.ceil(seg.sentences.length / 2);
    const parts = [seg.sentences.slice(0, half), seg.sentences.slice(half)];
    parts.forEach((part, i) => {
      const body = part.join(" ");
      out.push({
        ...seg,
        id: `${seg.id}-${i}`,
        label: `${seg.label} (${i + 1}/2)`,
        title: `${seg.label} (${i + 1}/2)`,
        body,
        sentences: part,
      });
    });
  }
  return out.map((s, i) => ({ ...s, id: `seg${i}` }));
}

/* ───────────────────────── 문장 나누기 ───────────────────────── */

/**
 * 종결어미 — **자동 받아쓰기에는 문장부호가 없다.**
 * 부호로 나눈 결과가 지나치게 길면 이쪽으로 갈아탄다.
 */
const ENDINGS = /(?<=(?:습니다|입니다|합니다|됩니다|했습니다|하죠|이죠|군요|는데요|거예요|겠죠|네요|세요))\s+/;

export function splitSentences(text: string): string[] {
  const byPunct = text
    .split(/\n|(?<=[.!?。])\s+/)
    .map((s) => s.replace(/^[-·•\s]+/, "").trim())
    .filter((s) => s.length > 2);

  const avg = byPunct.length > 0 ? byPunct.reduce((n, s) => n + s.length, 0) / byPunct.length : 0;
  const pieces = avg > 200 ? byPunct.flatMap((s) => s.split(ENDINGS)) : byPunct;

  // 그래도 긴 조각은 가까운 공백에서 강제로 자른다 (인용할 수 없는 길이라)
  const out: string[] = [];
  for (const piece of pieces) {
    let rest = piece.trim();
    while (rest.length > 250) {
      const cut = rest.lastIndexOf(" ", 250);
      const at = cut > 100 ? cut : 250;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest.length > 2) out.push(rest);
  }
  return out;
}

/* ───────────────────────── 자기검증 ───────────────────────── */

/**
 * 파서가 조용히 무너지지 않았는지 스스로 센다.
 * ⚠️ 이 계열 기능의 무증상 실패 모드는 **「형식이 조금 바뀌었는데 파서가 0을 내는 것」**이다.
 * 표본을 늘리는 것이 곧 테스트를 늘리는 것이다.
 */
export function parseStats(): { pass: number; total: number; fail: string[] } {
  const srt = "1\n00:00:01,000 --> 00:00:03,500\n안녕하세요 오늘은\n\n2\n00:00:03,500 --> 00:00:06,000\n계시록을 봅니다\n";
  const vtt = "WEBVTT\n\n00:01.000 --> 00:03.500\n<v 김강사>안녕하세요\n\nNOTE 여기는 메모\n\n00:03.500 --> 00:06.000\n계시록을 봅니다\n";
  const rollup =
    "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n오늘은 비유한 짐승과\n\n00:00:03.000 --> 00:00:05.000\n오늘은 비유한 짐승과 머리에 대해\n";

  const cases: { name: string; ok: () => boolean }[] = [
    { name: "srt 2칸", ok: () => parseSubtitle(srt)?.cues.length === 2 },
    { name: "srt 형식 판정", ok: () => parseSubtitle(srt)?.kind === "srt" },
    { name: "vtt 시 생략·NOTE 건너뜀", ok: () => parseSubtitle(vtt)?.cues.length === 2 },
    { name: "vtt 화자 분리", ok: () => parseSubtitle(vtt)?.cues[0].speaker === "김강사" },
    { name: "vtt 화자를 본문에서 뗌", ok: () => parseSubtitle(vtt)?.cues[0].text === "안녕하세요" },
    { name: "롤업 중복 제거", ok: () => parseSubtitle(rollup)?.cues[1].text === "머리에 대해" },
    { name: "자막 아님 → null", ok: () => parseSubtitle("그냥 글입니다. 자막이 아닙니다.") === null },
    {
      name: "붙여넣기 타임스탬프 분할",
      ok: () => splitTranscript("0:00\n첫 대목입니다\n\n1:30\n둘째 대목입니다\n\n3:00\n셋째 대목입니다").segments.length >= 2,
    },
    {
      name: "붙여넣기 문단 분할",
      ok: () => splitTranscript("첫 문단입니다.\n\n둘째 문단입니다.\n\n셋째 문단입니다.").segments.length >= 2,
    },
    { name: "부호 없는 통글 문장 나누기", ok: () => splitSentences("오늘은 계시록을 봅니다 여기 짐승이 나옵니다").length >= 1 },
  ];

  const fail = cases.filter((c) => !safe(c.ok)).map((c) => c.name);
  return { pass: cases.length - fail.length, total: cases.length, fail };
}

function safe(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}
