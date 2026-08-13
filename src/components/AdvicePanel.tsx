import { BookOpen, Info, Laptop, Quote } from "lucide-react";
import { Link } from "./TransitionLink";
import { corpusStats } from "../lib/advice-corpus";
import { ADVICE_LIMITS, ADVICE_NOT_SCANNED, type AdviceEvidence, type AdviceReading } from "../lib/advice-engine";

/**
 * 1차 조언을 그린다 — **사이트 안에서 찾은 근거 원문**을 세 칸에 나눠 보여 준다.
 *
 * 뼈대는 `src/shell/AskAiBar.tsx:84-92`를 본떴다 — 출처 뱃지 · 본문 · 「출처:」 줄.
 * 같은 생김새를 쓰는 이유는 사용자가 **"사이트가 찾아 준 것"을 한 가지 모양으로 익히게**
 * 하기 위해서다.
 *
 * ⚠️ 세 칸은 **비어도 지우지 않는다.** 칸이 사라지면 「안 찾아진 것」과 「원래 없는 것」이
 * 구분되지 않는다. 빈 칸에는 왜 비었는지가 들어간다.
 */
export function AdvicePanel({ reading }: { reading: AdviceReading }) {
  return (
    <div>
      {/* 어디서 계산되는지 먼저 밝힌다 — 이 화면의 핵심 성질이다 */}
      <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-zion-50 p-2.5 text-[12px] leading-relaxed text-ink">
        <Laptop size={14} className="mt-0.5 shrink-0 text-zion-600" />
        <span>
          이 조언은 <strong className="font-bold">이 기기 안에서</strong> 사이트 원문을 찾아 만든
          것입니다. 아무것도 밖으로 나가지 않고, 비용도 들지 않습니다.
        </span>
      </p>

      {reading.observed.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-[11px] font-semibold text-ink-soft">관찰문에서 걸린 낱말</div>
          <div className="flex flex-wrap gap-1">
            {[...new Set(reading.observed.flatMap((o) => o.matched))].map((w) => (
              <span key={w} className="rounded-full bg-zion-100 px-2 py-0.5 text-[11px] text-zion-700">
                {w}
              </span>
            ))}
            {reading.observed.every((o) => o.matched.length === 0) && (
              <span className="text-[11px] text-ink-soft">걸린 낱말이 없습니다</span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {reading.sections.map((sec, i) => (
          <section key={sec.slot}>
            <h3 className="mb-1.5 text-[13px] font-bold text-zion-900">
              ({i + 1}) {sec.title}
            </h3>
            {sec.emptyReason ? (
              <p className="rounded-lg border border-dashed border-zion-200 p-3 text-[12px] leading-relaxed text-ink-soft">
                {sec.emptyReason}
              </p>
            ) : (
              <ul className="space-y-2">
                {sec.evidence.map((e) => (
                  <li key={e.unitId}>
                    <EvidenceCard evidence={e} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/*
        유형 배경 — **세 칸과 갈라 놓는다.** 관찰문과 겹쳐서 고른 것이 아니라
        기록된 유형의 원문이라, 같은 자리에 섞으면 「이것도 관찰에서 나온 것」으로 읽힌다.
      */}
      {reading.background.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[12px] font-semibold text-zion-700">
            기록된 유형의 배경 원문 {reading.background.length}건 — 관찰과 겹쳐서 고른 것이 아닙니다
          </summary>
          <ul className="mt-2 space-y-2">
            {reading.background.map((e) => (
              <li key={e.unitId}>
                <EvidenceCard evidence={e} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {reading.unusable.length > 0 && (
        <div className="mt-4 rounded-lg bg-zion-50 p-3">
          <div className="mb-1 text-[11px] font-semibold text-ink">쓰지 못한 성향값</div>
          <ul className="space-y-0.5">
            {reading.unusable.map((u) => (
              <li key={u.field} className="text-[11px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">{u.field}</span> — {u.reason}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-ink-soft">원문이 들어오면 이 값들도 근거로 쓰입니다.</p>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-[11px] font-semibold text-zion-700">
          이 조언이 할 수 있는 것과 못 하는 것
        </summary>
        <ul className="mt-2 space-y-1">
          {ADVICE_LIMITS.map((t) => (
            <li key={t} className="flex gap-1.5 text-[11px] leading-relaxed text-ink-soft">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-[11px] leading-relaxed text-ink-soft">
          <div className="font-semibold text-ink">훑은 자료</div>
          <ul className="mt-0.5 list-inside list-disc">
            {reading.scanned.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div className="mt-1.5 font-semibold text-ink">훑지 않은 자료</div>
          <ul className="mt-0.5 list-inside list-disc">
            {ADVICE_NOT_SCANNED.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        {/*
          색인이 제대로 만들어졌는지 개발 중에만 센다.
          ⚠️ 이 설계의 유일한 무증상 실패 모드가 「원문이 갱신됐는데 파서가 조용히 0을 내는 것」이다.
          숫자가 눈에 띄게 달라지면 파서가 깨진 것이다.
        */}
        {import.meta.env.DEV && <CorpusLine />}
      </details>
    </div>
  );
}

/** 성구 줄 — 「사 25:1 …」처럼 책·장·절로 시작한다. **표시에만 쓰고 매칭에는 쓰지 않는다** */
const VERSE_LINE = /^[가-힣]{1,2}\s?\d+\s*[:：]/;

function EvidenceCard({ evidence: e }: { evidence: AdviceEvidence }) {
  const Icon = e.sourceType === "에니어그램" ? Quote : BookOpen;
  return (
    <div className="rounded-lg border border-zion-100 bg-white p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 rounded bg-zion-100 px-1.5 py-0.5 text-[10px] font-semibold text-zion-700">
          <Icon size={10} /> {e.sourceType}
        </span>
        {e.matchedWords.map((w) => (
          <span key={w} className="rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-medium text-gold-700">
            {w}
          </span>
        ))}
      </div>

      {/* 원문 그대로 — 요약하거나 다시 쓰지 않는다 (불변식 5) */}
      {e.heading && <p className="mb-1 text-[13px] font-semibold leading-relaxed text-ink">{e.heading}</p>}
      <div className="space-y-0.5">
        {e.lines.map((line, i) => (
          <p
            key={i}
            className={
              VERSE_LINE.test(line)
                ? "border-l-2 border-zion-200 pl-2 text-[12px] leading-relaxed text-ink"
                : "text-[13px] leading-relaxed text-ink"
            }
          >
            {line}
          </p>
        ))}
      </div>

      <Link to={e.href} className="mt-1.5 inline-block text-[11px] text-gold-700 hover:underline">
        출처: {e.source} — 원문 보기
      </Link>
    </div>
  );
}

function CorpusLine() {
  const s = corpusStats();
  return (
    <p className="mt-2 text-[10px] text-ink-soft">
      근거 {s.total}건 — 에니어그램 {s.enneagram}(성구 블록 {s.verseBlocksWithHeading} · 낱줄{" "}
      {s.verseBlocksLoose}) · 교안 {s.lesson} / 칸별 {s.bySlot.state}·{s.bySlot.open}·{s.bySlot.caution}
    </p>
  );
}
