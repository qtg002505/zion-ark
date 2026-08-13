import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Info,
  Laptop,
  Lock,
  Quote,
  Upload,
} from "lucide-react";
import { Link } from "../components/TransitionLink";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { PromptBox } from "../components/PromptBox";
import { PageHeader, Card } from "./common";
import { downloadBlob } from "../lib/xlsx";
import { canSendToAI, prepareForAI, type ConsentState } from "../lib/privacy";
import { bibleRefStats } from "../lib/bible-refs";
import { elementaryLessons } from "../content/elementary-lessons";
import { HIGH_LESSONS } from "../content/lessons-high";
import {
  MAX_FILE_BYTES,
  MAX_PASTE_CHARS,
  parseStats,
  parseSubtitle,
  readSubtitleFile,
  segmentsFromCues,
  splitTranscript,
  type ParseResult,
} from "../lib/transcript-parse";
import {
  DIGEST_LIMITS,
  DIGEST_SOURCES,
  digestStats,
  digestToMarkdown,
  digestToPrompt,
  digestToText,
  digestTranscript,
  type DigestPick,
  type DigestResult,
} from "../lib/transcript-digest";

/**
 * 강의 녹취 정리 — **밖에서 받아쓴 글을 넣으면 사이트가 잘라 준다.**
 *
 * `/compose`가 「강의 **전에** 주제어로 사이트 자료를 모으는 화면」이라면 여기는 「강의 **후에**
 * 밖에서 들어온 원문을 사이트가 정리하는 화면」이다. 방향이 반대다.
 *
 * ## 지키는 것
 *
 * - **저장하지 않는다.** `store.tsx`를 import하지 않는다 — 녹취록 한 건이 100~200KB라
 *   localStorage(5MB를 모든 기능이 나눠 쓴다)에 넣으면 **저장된 것처럼 보이다 새로고침하면
 *   사라지는** 사고가 난다. 대신 복사·내려받기를 결과 맨 위에 둔다
 * - **①원문에서 뽑은 것 / ②사이트가 고른 문장**을 화면에서 가른다 (불변식 5).
 *   고른 문장에는 왜 골랐는지가 뱃지로 붙는다
 * - **받아쓰기는 하지 않는다.** 무료로 안 되기 때문이며, 그 사실을 입력 칸 위에 먼저 밝힌다
 */
export function LectureDigest() {
  const [paste, setPaste] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [result, setResult] = useState<DigestResult | null>(null);
  const [lessonPick, setLessonPick] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** 동의 게이트는 **항상 켠다** (2026-08-13 리드 결정) — 기본값 「모름」이면 막힌다 */
  const [consent, setConsent] = useState<ConsentState>("unknown");

  const check = canSendToAI(consent);
  const ready = parsed !== null || paste.trim().length > 40;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 동작하게
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setMsg(`파일이 너무 큽니다 (${Math.round(file.size / 1024 / 1024)}MB). 자막 파일은 보통 1MB 아래입니다.`);
      return;
    }

    setMsg("읽는 중…");
    setResult(null);
    try {
      const { text, encoding } = await readSubtitleFile(file);
      const sub = parseSubtitle(text);

      if (!sub) {
        // 실패를 막다른 길로 두지 않는다 — 붙여넣기 칸에 내용을 옮겨 준다
        setPaste(text.slice(0, MAX_PASTE_CHARS));
        setParsed(null);
        setMsg("자막 형식이 아닌 것 같습니다. 아래 붙여넣기 칸에 내용을 옮겨 두었습니다 — 그대로 정리할 수 있습니다.");
        return;
      }

      const segments = segmentsFromCues(sub.cues);
      const speakers = [...new Set(sub.cues.map((c) => c.speaker).filter((s): s is string => !!s))];
      setParsed({
        segments,
        kind: sub.kind,
        cueCount: sub.cues.length,
        skipped: sub.skipped,
        encoding,
        speakers,
        totalMs: sub.cues[sub.cues.length - 1].endMs,
        splitBy: "자막의 시간 코드",
      });
      setPaste("");
      setMsg(
        `${sub.cues.length}개 자막 칸을 읽어 ${segments.length}개 구간으로 나눴습니다.` +
          (sub.skipped > 0 ? ` (형식이 어긋난 ${sub.skipped}개는 건너뛰었습니다)` : "") +
          (encoding === "euc-kr" ? " · EUC-KR로 읽었습니다" : ""),
      );
    } catch {
      setParsed(null);
      setMsg("파일을 읽지 못했습니다. .srt 또는 .vtt 파일인지 확인해 주세요.");
    }
  }

  function run() {
    setCopied(false);
    let source = parsed;

    if (!source) {
      const text = paste.trim();
      if (text.length < 40) {
        setMsg("정리할 글이 너무 짧습니다.");
        return;
      }
      const { segments, splitBy } = splitTranscript(text.slice(0, MAX_PASTE_CHARS));
      const speakers = [...new Set(segments.flatMap((s) => s.speakers))];
      source = { segments, kind: "paste", cueCount: 0, skipped: 0, speakers, splitBy };
      setParsed(source);
      setMsg(`${segments.length}개 구간으로 나눴습니다 — ${splitBy} 기준입니다.`);
    }

    setResult(digestTranscript(source, lessonPick || null));
  }

  function reset() {
    setPaste("");
    setParsed(null);
    setResult(null);
    setMsg(null);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 현장에서 카톡 인앱 브라우저로 열리는 일이 있어 폴백을 둔다
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    if (!result) return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/(\d{8})(\d{4})/, "$1_$2");
    downloadBlob(
      new Blob([digestToMarkdown(result)], { type: "text/markdown;charset=utf-8" }),
      `강의정리_${stamp}.md`,
    );
  }

  const segmentItems: AccordionItem[] = useMemo(() => {
    if (!result) return [];
    return result.segments.map((s) => ({
      id: s.id,
      title: s.label,
      hint: s.sentences[0],
      content: (
        <div>
          {/* ⚠️ MarkdownLite로 그리지 않는다 — 연속 한자를 지우고 「- 」를 불릿으로 바꾼다 */}
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{s.body}</p>
          <button
            onClick={() => copyText(s.body)}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-zion-700 hover:underline"
          >
            <Copy size={11} /> 이 구간만 복사
          </button>
        </div>
      ),
    }));
  }, [result]);

  return (
    <div>
      <PageHeader
        crumb="강의 도우미"
        title="강의 녹취 정리"
        desc="받아쓴 강의 글을 넣으면 구간으로 자르고, 인용한 성구와 겹치는 교안을 찾아 줍니다. 브라우저 안에서만 돌아 비용이 들지 않습니다."
      />

      {/* 못 하는 것을 **넣기 전에** 밝힌다 */}
      <details className="mb-4 rounded-lg bg-gold-100/60 p-3">
        <summary className="cursor-pointer text-[12px] font-bold text-ink">
          먼저 읽어 주세요 — 이 화면이 할 수 있는 것과 못 하는 것
        </summary>
        <ul className="mt-2 space-y-1">
          {DIGEST_LIMITS.map((t) => (
            <li key={t} className="flex gap-1.5 text-[12px] leading-relaxed text-ink">
              <Info size={13} className="mt-0.5 shrink-0 text-gold-700" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </details>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* 왼쪽 — 넣는 자리 */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 text-[15px] font-bold text-zion-900">1. 강의 글 넣기</h2>
            <p className="mb-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-soft">
              <Laptop size={13} className="mt-0.5 shrink-0" />
              올린 파일은 <strong className="font-semibold text-ink">브라우저 안에서만</strong> 열립니다.
              서버로 올라가지 않습니다.
            </p>

            <label className="mb-3 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] font-semibold text-zion-700 transition hover:border-zion-500">
              <Upload size={14} /> 자막 파일 올리기 (.srt · .vtt)
              <input type="file" accept=".srt,.vtt,text/vtt,text/plain" onChange={onFile} className="hidden" />
            </label>

            <label htmlFor="digest-paste" className="mb-1 block text-[12px] font-semibold text-ink">
              또는 받아쓴 글 붙여넣기
            </label>
            <textarea
              id="digest-paste"
              value={paste}
              onChange={(e) => {
                setPaste(e.target.value);
                setParsed(null);
                setResult(null);
              }}
              rows={8}
              placeholder="받아쓴 강의 내용을 붙여넣습니다. 시간 표시(0:00)나 화자 표기(김강사:)가 있으면 그것으로 구간을 나눕니다."
              className="w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
            />

            <div className="mt-3">
              <label htmlFor="digest-lesson" className="mb-1 block text-[12px] font-semibold text-ink">
                이 강의는 몇 강입니까? <span className="font-normal text-ink-soft">(고르면 그 교안을 기준으로 찾습니다)</span>
              </label>
              <select
                id="digest-lesson"
                value={lessonPick}
                onChange={(e) => setLessonPick(e.target.value)}
                className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              >
                <option value="">모름 — 낱말로 짐작합니다</option>
                {elementaryLessons.map((l) => (
                  <option key={`e${l.lessonNo}`} value={`초등${l.lessonNo}`}>
                    초등 {l.lessonNo}강 — {l.title}
                  </option>
                ))}
                {HIGH_LESSONS.map((l) => (
                  <option key={`h${l.id}`} value={`고등${l.id}`}>
                    고등 {l.label} — {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={run}
                disabled={!ready}
                className={
                  "rounded-lg px-4 py-2 text-[13px] font-semibold transition " +
                  (ready
                    ? "bg-zion-800 text-white hover:bg-zion-700"
                    : "cursor-not-allowed border border-zion-200 bg-zion-50 text-ink-soft")
                }
              >
                {result ? "다시 정리하기" : "정리하기"}
              </button>
              {(parsed || paste) && (
                <button onClick={reset} className="text-[12px] font-semibold text-zion-700 hover:underline">
                  지우고 새로 넣기
                </button>
              )}
            </div>

            {msg && <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">{msg}</p>}
            {parsed && parsed.speakers.length > 0 && (
              <p className="mt-1 text-[11px] text-ink-soft">
                등장 화자 {parsed.speakers.length}명 — 이름은 정리 결과와 외부 AI 프롬프트에 넣지 않습니다.
              </p>
            )}
          </Card>

          {!result && (
            <Card>
              <h2 className="mb-2 text-[15px] font-bold text-zion-900">무엇을 찾아 주나요</h2>
              <ul className="space-y-1.5">
                {DIGEST_SOURCES.map((s) => (
                  <li key={s.kind} className="text-[12px] leading-relaxed text-ink-soft">
                    <span className="font-semibold text-ink">{s.kind}</span> — {s.desc}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* 오른쪽 — 나오는 자리 */}
        <div className="space-y-4">
          <div aria-live="polite" className="sr-only">
            {result ? `정리 결과 구간 ${result.segments.length}개, 고른 문장 ${result.picks.length}개` : ""}
          </div>

          {!result ? (
            <Card>
              <p className="py-10 text-center text-[13px] leading-relaxed text-ink-soft">
                자막 파일을 올리거나 받아쓴 글을 붙여넣고 「정리하기」를 누르세요.
              </p>
            </Card>
          ) : (
            <>
              {/* 저장하지 않으므로 가져가는 길을 맨 위에 둔다 */}
              <Card>
                <p className="mb-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink">
                  <CircleAlert size={14} className="mt-0.5 shrink-0 text-gold-700" />
                  <span>
                    <strong className="font-bold">이 화면을 벗어나면 결과가 사라집니다.</strong> 저장하지
                    않습니다 — 복사하거나 내려받아 두세요.
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyText(digestToText(result))}
                    className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "복사했습니다" : "전체 복사"}
                  </button>
                  <button
                    onClick={download}
                    className="flex items-center gap-1.5 rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:border-zion-500"
                  >
                    <Download size={13} /> 파일로 내려받기 (.md)
                  </button>
                </div>
              </Card>

              {/* ① 원문에서 뽑은 것 */}
              <Card>
                <h2 className="mb-1 text-[15px] font-bold text-zion-900">① 원문에서 뽑은 것</h2>
                <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
                  사이트가 <strong className="font-semibold text-ink">자르기만</strong> 했습니다. 글자를 고치지
                  않았습니다. — {result.meta.splitBy} 기준 {result.segments.length}구간
                </p>
                <Accordion items={segmentItems} resetKey={String(result.segments.length)} defaultOpenFirst={false} />

                {result.verses.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-zion-900">
                      <Quote size={13} /> 나온 성구 {result.verses.length}건
                    </h3>
                    <ul className="space-y-1">
                      {result.verses.map((v) => (
                        <li key={v.key} className="text-[12px] leading-relaxed text-ink">
                          <span className="font-semibold">{v.raw}</span>
                          <span className="text-ink-soft">
                            {" "}
                            · {v.book} · {v.count}회 ({v.at.join(" · ")})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.lessons.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-zion-900">
                      <BookOpen size={13} /> 겹치는 교안
                    </h3>
                    <p className="mb-1.5 text-[11px] text-ink-soft">
                      낱말이 겹치는 강입니다 — <strong className="font-semibold">회차를 확정한 것이 아닙니다.</strong>
                    </p>
                    <ul className="space-y-1.5">
                      {result.lessons.map((l) => (
                        <li key={l.source} className="text-[12px] leading-relaxed">
                          <Link to={l.href} className="font-semibold text-zion-800 hover:underline">
                            {l.source}
                          </Link>
                          <span className="text-ink-soft"> — 겹친 낱말: {l.words.join(" · ")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.topics.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-1.5 text-[13px] font-bold text-zion-900">자주 나온 낱말</h3>
                    <div className="flex flex-wrap gap-1">
                      {result.topics.map((t) => (
                        <span key={t.word} className="rounded-full bg-zion-100 px-2 py-0.5 text-[11px] text-zion-700">
                          {t.word} {t.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* ② 사이트가 고른 문장 */}
              <Card>
                <h2 className="mb-1 text-[15px] font-bold text-zion-900">② 사이트가 고른 문장</h2>
                <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
                  ⚠️ 여기부터는 <strong className="font-semibold text-ink">사이트가 고른 것</strong>입니다.
                  원문 문장을 그대로 옮겼고 새로 쓰지 않았습니다 — 왜 골랐는지를 함께 답니다.
                </p>
                {result.picks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zion-200 p-3 text-[12px] leading-relaxed text-ink-soft">
                    고를 만한 문장을 찾지 못했습니다. 성구·교안 낱말·강조하는 말이 겹치는 문장을 고르는데,
                    이 글에서는 걸리는 것이 없었습니다.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {result.picks.map((p, i) => (
                      <li key={`${p.segmentId}-${i}`}>
                        <PickCard pick={p} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* ③ 사이트가 못 하는 것 — 외부 AI */}
              <Card>
                <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-zion-900">
                  <ExternalLink size={15} className="text-zion-600" /> ③ 외부 AI에 넘기기 — 유머 · 요약문
                </h2>
                <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
                  유머 찾기와 매끄러운 요약문은 사이트가 하지 않습니다. 아래 프롬프트에는 원문 전체가 아니라
                  <strong className="font-semibold text-ink"> 뼈대만</strong> 들어갑니다 —
                  화자 이름은 넣지 않습니다.
                </p>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold " +
                      (check.ok ? "bg-emerald-50 text-emerald-700" : "bg-zion-100 text-ink-soft")
                    }
                  >
                    {check.ok ? <Check size={13} /> : <Lock size={13} />}
                    {check.ok ? "동의 확인됨" : "동의 확인 안 됨"}
                  </span>
                  <button
                    onClick={() => setConsent(consent === "granted" ? "unknown" : "granted")}
                    className="rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:border-zion-500"
                  >
                    {consent === "granted" ? "「모름」으로 되돌리기" : "동의 확인됨으로 전환 (시범)"}
                  </button>
                </div>

                {!check.ok ? (
                  <div className="rounded-lg bg-zion-50 p-4">
                    <p className="flex items-start gap-1.5 text-[13px] leading-relaxed text-ink">
                      <Lock size={15} className="mt-0.5 shrink-0 text-ink-soft" />
                      <span>
                        <strong className="font-bold">{check.reason}</strong>
                        <br />
                        녹취록에는 수강생 발언이 섞이기 쉬워 게이트를 항상 켜 둡니다.{" "}
                        <strong className="font-semibold">①②는 그대로 쓰실 수 있습니다</strong> — 기기 밖으로
                        나가지 않기 때문입니다.
                      </span>
                    </p>
                  </div>
                ) : (
                  <PromptPair result={result} />
                )}

                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-soft">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  이 스위치는 화면 흐름을 보이기 위한 시범 장치입니다. 실데이터를 넣기 전에 없앱니다.
                </p>
              </Card>

              {import.meta.env.DEV && <DevStats result={result} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 고른 문장 한 장 — 인용선과 이유 뱃지로 「사이트가 고른 것」임을 드러낸다 */
function PickCard({ pick }: { pick: DigestPick }) {
  return (
    <div className="border-l-2 border-gold-500 pl-3">
      <p className="text-[13px] leading-relaxed text-ink">{pick.text}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-ink-soft">{pick.label} 구간</span>
        {pick.why.map((w, i) => (
          <span key={i} className="rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-medium text-gold-700">
            {w.kind}
            {w.detail ? `: ${w.detail}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * 프롬프트 두 종. **`prepareForAI`를 여기서 거친다** — 뼈대에도 사람이 쓴 이름이 남아 있을 수
 * 있어 마지막으로 한 번 더 가린다(화자 이름은 이미 구조적으로 빠져 있다).
 */
function PromptPair({ result }: { result: DigestResult }) {
  const [mode, setMode] = useState<"humor" | "summary">("summary");

  const prepared = useMemo(() => prepareForAI(digestToPrompt(result, mode), "granted"), [result, mode]);

  return (
    <div>
      <div className="mb-2 flex gap-1 rounded-xl bg-zion-100 p-1" role="tablist" aria-label="프롬프트 종류">
        {(
          [
            ["summary", "회차 요약문"],
            ["humor", "유머 · 예화 찾기"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={
              "flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition " +
              (mode === value ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {prepared.removed.length > 0 && (
        <p className="mb-2 text-[11px] text-ink-soft">가린 것: {prepared.removed.join(" · ")}</p>
      )}
      <PromptBox prompt={prepared.text} linkNote="상담 GPT 링크는 주소 수령 후 연결됩니다" />
      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
        원문 전체가 필요하면 위 구간 목록의 「이 구간만 복사」로 하나씩 넣어 주세요.
      </p>
    </div>
  );
}

/** 파서·사전이 조용히 무너지지 않았는지 개발 중에만 센다 */
function DevStats({ result }: { result: DigestResult }) {
  const bible = bibleRefStats();
  const parse = parseStats();
  return (
    <p className="text-[10px] leading-relaxed text-ink-soft">
      <FileText size={10} className="inline" /> {digestStats(result)}
      <br />
      성경 {bible.books}권 · 별칭 {bible.aliases} · 표본 {bible.pass}/{bible.total} 통과
      {bible.fail.length > 0 && ` — 실패: ${bible.fail.join(" / ")}`}
      <br />
      파서 표본 {parse.pass}/{parse.total} 통과
      {parse.fail.length > 0 && ` — 실패: ${parse.fail.join(" / ")}`}
    </p>
  );
}
