import { useMemo, useRef, useState } from "react";
import { Link } from "../components/TransitionLink";
import { Sparkles, X } from "lucide-react";
import { useStore } from "../lib/store";
import { searchSite, type SearchHit } from "../lib/search";

/**
 * Ask AI 바 — 사이트 자료 기반 답변 + 출처 표시 (확정 결정 5).
 * 현재 로컬 검색으로 동작. 실제 AI API 연결 시에도 검색 대상은 공통 교육
 * 영역만이며 수강생 개인정보는 입력하지 않는다.
 * aria-live 영역은 조건부가 아니라 상시 렌더한다 (낭독 안정성).
 *
 * **카테고리 필터** (2026-08-13 리드 지시) — 결과를 갈래(교안·어록·시리즈…)로 걸러 본다.
 * ⚠️ 전체 결과를 받아 두고 **거른 뒤에 10건으로 자른다.** 순서를 바꾸면(10건으로 자른 뒤
 * 거르면) 상위 10건이 전부 다른 갈래일 때 「교안만 보기」가 0건이 된다.
 */
export function AskAiBar() {
  const { materials, entries } = useStore();
  const [query, setQuery] = useState("");
  const [allHits, setAllHits] = useState<SearchHit[] | null>(null);
  const [filter, setFilter] = useState<SearchHit["sourceType"] | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // 전체를 받아 둔다 — 갈래별 건수와 필터가 여기서 나온다 (로컬 자료라 부담 없음)
    setAllHits(searchSite(query, materials, entries, Number.POSITIVE_INFINITY));
    setFilter(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setAllHits(null);
    setFilter(null);
  }

  /** 결과에 실제로 있는 갈래만 칩으로 낸다 — 눌러도 0건인 죽은 칩을 만들지 않는다 */
  const typeCounts = useMemo(() => {
    const counts = new Map<SearchHit["sourceType"], number>();
    for (const h of allHits ?? []) counts.set(h.sourceType, (counts.get(h.sourceType) ?? 0) + 1);
    return [...counts.entries()];
  }, [allHits]);

  const hits = useMemo(() => {
    if (allHits === null) return null;
    const filtered = filter ? allHits.filter((h) => h.sourceType === filter) : allHits;
    return filtered.slice(0, 10);
  }, [allHits, filter]);

  const totalShown = filter ? (typeCounts.find(([t]) => t === filter)?.[1] ?? 0) : (allHits?.length ?? 0);

  return (
    <div className="relative">
      <form onSubmit={submit} role="search" aria-label="사이트 자료 검색">
        <div className="flex items-center gap-2 rounded-card border border-zion-100 bg-white px-3.5 py-2 shadow-sm transition-shadow duration-300 focus-within:border-zion-400 focus-within:shadow-lg focus-within:shadow-zion-700/10">
          <Sparkles size={16} className="shrink-0 text-zion-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="교안·어록에서 질문해 보세요"
            className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-ink-soft"
            aria-label="질문 입력"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-zion-800 px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-zion-700"
          >
            질문
          </button>
        </div>
      </form>

      {/* aria-live 상시 렌더 */}
      <div aria-live="polite" className="sr-only">
        {hits !== null ? `검색 결과 ${totalShown}건${filter ? ` — ${filter}만 보는 중` : ""}` : ""}
      </div>

      {open && allHits !== null && hits !== null && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-zion-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold text-zion-800">
              사이트 자료 기반 결과 {totalShown}건
              <span className="ml-2 font-normal text-ink-soft">
                AI 응답 연결 전 — 로컬 자료 검색으로 동작 중
              </span>
            </div>
            <button onClick={close} aria-label="결과 닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
              <X size={14} />
            </button>
          </div>

          {/* 갈래 필터 — 결과가 여러 갈래일 때만 뜬다 */}
          {typeCounts.length > 1 && (
            <div className="mb-2 flex gap-1 overflow-x-auto pb-0.5" role="group" aria-label="결과 갈래 필터">
              <button
                onClick={() => setFilter(null)}
                aria-pressed={filter === null}
                className={
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition " +
                  (filter === null ? "bg-zion-700 text-white" : "bg-zion-100 text-zion-700 hover:bg-zion-200")
                }
              >
                전체 {allHits.length}
              </button>
              {typeCounts.map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setFilter(filter === type ? null : type)}
                  aria-pressed={filter === type}
                  className={
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition " +
                    (filter === type ? "bg-zion-700 text-white" : "bg-zion-100 text-zion-700 hover:bg-zion-200")
                  }
                >
                  {type} {count}
                </button>
              ))}
            </div>
          )}

          {hits.length === 0 ? (
            <p className="py-3 text-center text-[13px] leading-relaxed text-ink-soft">
              일치하는 자료가 없습니다.
              <br />
              문장으로 물어도 되니, 찾는 것을 가리키는 낱말을 함께 넣어 보세요.
            </p>
          ) : (
            /* 관련도 높은 것부터 나온다. 좁은 화면에서 화면을 넘기지 않게 안에서 스크롤한다 */
            <ul className="max-h-[60dvh] divide-y divide-zion-100 overflow-y-auto">
              {hits.map((h, i) => (
                <li key={i}>
                  <Link viewTransition to={h.href} onClick={close} className="block px-1 py-2 hover:bg-zion-50">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zion-100 px-1.5 py-0.5 text-[10px] font-semibold text-zion-700">
                        {h.sourceType}
                      </span>
                      <span className="text-[13px] font-medium text-ink">{h.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-soft">{h.snippet}</p>
                    <p className="mt-0.5 text-[11px] text-gold-700">출처: {h.source}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {totalShown > hits.length && (
            <p className="mt-2 text-[11px] text-ink-soft">상위 {hits.length}건만 보입니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
