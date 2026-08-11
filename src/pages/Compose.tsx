import { useMemo, useState } from "react";
import { Link } from "../components/TransitionLink";
import { Check, Copy, Layers, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { COMPOSE_SOURCES, composeMaterials, composeToText, type ComposeResult } from "../lib/compose";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { PageHeader, Card } from "./common";

/** 강의 준비에서 자주 쓰는 출발점 */
const SUGGESTED = ["배도 멸망 구원", "예언과 실상", "전도", "천국 비밀 비유", "인 맞은 자", "새 언약"];

/** 빈 결과 안내에서 "어디까지 찾았는지" 밝히는 데 쓴다 */
const SOURCE_NAMES = COMPOSE_SOURCES.map((s) => s.kind).join(" · ");

/**
 * 강의 자료 모으기 — 주제 하나로 교안·시리즈·어록·에니어그램·자료실을 한 번에 훑는다.
 * 원문 그대로 인용하고 출처를 붙인다 (요약·재작성하지 않는다).
 */
export function Compose() {
  const { materials } = useStore();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [copied, setCopied] = useState(false);

  function run(text: string) {
    const trimmed = text.trim();
    setInput(trimmed);
    setCopied(false);
    setResult(trimmed ? composeMaterials(trimmed, materials) : null);
  }

  async function copyAll() {
    if (!result) return;
    const text = composeToText(result);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
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

  const groupItems: AccordionItem[] = useMemo(() => {
    if (!result) return [];
    return result.groups.map((g) => ({
      id: g.kind,
      title: `${g.kind} ${g.hits.length}건`,
      hint: g.hits[0]?.source,
      content: (
        <ol className="space-y-3">
          {g.hits.map((h, i) => (
            <li key={i} className="rounded-lg bg-zion-50/60 p-3">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="min-w-0 text-[12px] font-semibold text-zion-700">
                  <span className="mr-1.5 rounded bg-zion-100 px-1.5 py-0.5 text-[11px]">{h.kind}</span>
                  {h.source}
                </span>
                <Link
                  viewTransition
                  to={h.href}
                  aria-label={`${h.source} — 원문 열기`}
                  className="shrink-0 rounded border border-zion-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zion-700 transition hover:border-zion-400"
                >
                  원문 열기
                </Link>
              </div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{h.body}</p>
            </li>
          ))}
        </ol>
      ),
    }));
  }, [result]);

  return (
    <div>
      <PageHeader
        crumb="강의 도우미"
        title="강의 자료 모으기"
        desc="주제 하나로 교안 · 시리즈 · 어록 · 에니어그램 · 자료실을 한 번에 찾습니다. 원문 그대로 인용하며 출처를 함께 표시합니다."
      />

      <Card className="border-zion-200 bg-zion-50/40">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-zion-600" />
          <h2 className="text-[15px] font-bold text-zion-900">무엇을 준비하시나요?</h2>
        </div>
        <p className="mt-1 text-[12px] text-ink-soft">
          강의할 주제를 넣으면 관련 대목을 자료 종류별로 모아 강의안 초안으로 만들어 드립니다.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
          className="mt-3 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 배도 멸망 구원 / 예언과 실상"
            aria-label="강의 주제 입력"
            className="min-w-0 flex-1 rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-zion-800 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
          >
            자료 모으기
          </button>
        </form>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-ink-soft">자주 쓰는 주제</span>
          {SUGGESTED.map((t) => (
            <button
              key={t}
              onClick={() => run(t)}
              className="rounded-full border border-zion-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zion-700 transition hover:border-zion-400"
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      <div aria-live="polite" className="sr-only">
        {result ? `${result.total}건을 모았습니다` : ""}
      </div>

      {!result && (
        <Card className="mt-5">
          <h2 className="text-[14px] font-bold text-zion-900">어디에서 찾나요</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            주제어 하나를 넣으면 아래 다섯 곳을 한 번에 훑어 자료 종류별로 묶어 드립니다. 인용은 원문
            그대로이며 출처가 함께 붙습니다.
          </p>
          <ul className="mt-3 space-y-1.5">
            {COMPOSE_SOURCES.map((s) => (
              <li key={s.kind} className="flex flex-wrap items-center gap-2 rounded-lg bg-zion-50/60 px-3 py-2">
                <span className="rounded bg-zion-100 px-1.5 py-0.5 text-[11px] font-semibold text-zion-700">
                  {s.kind}
                </span>
                <span className="text-[12px] text-ink-soft">{s.desc}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result && (
        <Card className="mt-5">
          {result.keywords.length === 0 ? (
            <p className="py-8 text-center text-[13px] leading-relaxed text-ink-soft">
              주제어는 두 글자 이상이어야 합니다. 「실상」 · 「배도 멸망 구원」처럼 과목이나 주제를
              나타내는 낱말로 넣어 주세요.
            </p>
          ) : result.total === 0 ? (
            <p className="py-8 text-center text-[13px] leading-relaxed text-ink-soft">
              <strong className="text-zion-800">{result.keywords.join(" · ")}</strong> — {SOURCE_NAMES}{" "}
              다섯 곳을 모두 찾았지만 해당하는 대목이 없습니다.
              <br />
              자료에 쓰인 표현으로 바꿔 보시거나 위 주제 버튼을 눌러 보세요.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-zion-600" />
                  <span className="text-[14px] font-bold text-zion-900">
                    <span className="text-zion-700">{result.keywords.join(" · ")}</span> — {result.total}건
                  </span>
                </div>
                <button
                  onClick={copyAll}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "복사됨" : "강의안으로 복사"}
                </button>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-ink-soft">자료 종류</span>
                {result.groups.map((g) => (
                  <span
                    key={g.kind}
                    className="rounded-full border border-zion-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zion-700"
                  >
                    {g.kind} {g.hits.length}건
                  </span>
                ))}
              </div>

              <Accordion items={groupItems} resetKey={result.keywords.join()} />
              <p className="mt-3 border-t border-zion-100 pt-3 text-[11px] text-ink-soft">
                모든 인용은 원문 그대로이며 요약하지 않았습니다. 강의안에 옮길 때 출처를 함께 적어 주세요.
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
