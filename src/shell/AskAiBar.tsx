import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "../components/TransitionLink";
import { Check, ChevronDown, ListFilter, Sparkles, X } from "lucide-react";
import { useStore } from "../lib/store";
import { searchSite, type SearchHit } from "../lib/search";

type Kind = SearchHit["sourceType"];

/** 고를 수 있는 갈래 — `search.ts`의 `sourceType`과 같은 목록이다 */
const ALL_KINDS: Kind[] = ["교안", "시리즈", "어록", "자료실", "공지", "용어", "에니어그램"];

/** 「전체」 다음으로 자주 찾는 조합 — 어록 하나만 뺀 나머지 전부 (2026-08-13 리드 지시) */
const EXCEPT_QUOTES = new Set<Kind>(ALL_KINDS.filter((k) => k !== "어록"));

function isExceptQuotes(picked: Set<Kind>): boolean {
  return picked.size === EXCEPT_QUOTES.size && [...EXCEPT_QUOTES].every((k) => picked.has(k));
}

/**
 * Ask AI 바 — 사이트 자료 기반 답변 + 출처 표시 (확정 결정 5).
 * 현재 로컬 검색으로 동작. 실제 AI API 연결 시에도 검색 대상은 공통 교육
 * 영역만이며 수강생 개인정보는 입력하지 않는다.
 * aria-live 영역은 조건부가 아니라 상시 렌더한다 (낭독 안정성).
 *
 * **다중 선택 필터** (2026-08-13 리드 지시 — 참고 이미지의 「다중 선택」 드롭다운).
 * 갈래를 여러 개 골라 두고 찾으면 그 갈래들만 나온다. 아무것도 안 고르면 전부 본다.
 * ⚠️ 자르기(상위 N건)는 **거른 뒤에** 한다 — 순서를 바꾸면 상위 N건이 전부 다른 갈래일 때
 * 「교안만 보기」가 0건이 되는 함정이 생긴다.
 */
export function AskAiBar() {
  const { materials, entries } = useStore();
  const [query, setQuery] = useState("");
  const [allHits, setAllHits] = useState<SearchHit[] | null>(null);
  const [picked, setPicked] = useState<Set<Kind>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [open, setOpen] = useState(false);
  /** 자료 뭉치를 처음 받아 오는 동안 켜진다 (2026-08-18 번들 가르기) */
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  /** 몇 번째 질문인지 — 늦게 온 옛 답을 버리는 데 쓴다 */
  const reqRef = useRef(0);

  // 드롭다운 밖을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!filterOpen) return;
    function onDown(e: MouseEvent) {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    /*
      2026-08-18부터 `searchSite`는 비동기다 — 교안·어록·시리즈 원문을 **첫 질문 때**
      받아 오기 때문이다(번들 가르기). 그 뒤로는 만들어 둔 것을 다시 써 곧바로 답한다.

      ⚠️ **늦게 온 옛 답이 새 답을 덮지 않게** 요청 번호를 매긴다. 첫 질문은 자료를
      내려받느라 늦고 둘째 질문은 곧바로 끝나므로, 막지 않으면 화면에 첫 질문의 결과가
      뒤늦게 얹힌다.
    */
    const req = ++reqRef.current;
    setOpen(true);
    setLoading(true);
    // 전체를 받아 둔다 — 갈래별 건수와 필터가 여기서 나온다 (로컬 자료라 부담 없음)
    const found = await searchSite(query, materials, entries, Number.POSITIVE_INFINITY);
    if (req !== reqRef.current) return;
    setAllHits(found);
    setLoading(false);
  }

  function close() {
    setOpen(false);
    setAllHits(null);
    setLoading(false);
    // 아직 오지 않은 답을 버린다 — 닫은 뒤에 결과가 도착해 다시 열리지 않게 한다
    reqRef.current++;
  }

  function toggleKind(k: Kind) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  /** 갈래별 건수 — 결과가 있을 때만 옆에 숫자를 보여 준다 */
  const counts = useMemo(() => {
    const map = new Map<Kind, number>();
    for (const h of allHits ?? []) map.set(h.sourceType, (map.get(h.sourceType) ?? 0) + 1);
    return map;
  }, [allHits]);

  const filtered = useMemo(() => {
    if (allHits === null) return null;
    return picked.size === 0 ? allHits : allHits.filter((h) => picked.has(h.sourceType));
  }, [allHits, picked]);

  const hits = filtered?.slice(0, 20) ?? null;
  const pickedLabel =
    picked.size === 0
      ? "전체"
      : isExceptQuotes(picked)
        ? "어록 제외"
        : picked.size === 1
          ? [...picked][0]
          : `${picked.size}개 갈래`;

  return (
    <div className="relative">
      <form onSubmit={submit} role="search" aria-label="사이트 자료 검색">
        <div className="flex items-center gap-2 rounded-card border border-zion-100 bg-white px-2 py-1.5 shadow-sm transition-shadow duration-300 focus-within:border-zion-400 focus-within:shadow-lg focus-within:shadow-zion-700/10 sm:px-3.5 sm:py-2">
          {/* 갈래 다중 선택 — 검색창 안 왼쪽 */}
          <div ref={filterRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
              aria-haspopup="true"
              title="찾을 갈래 고르기"
              className={
                "flex items-center gap-1 rounded-lg border px-2 py-1 text-[12px] font-semibold transition " +
                (picked.size > 0
                  ? "border-zion-500 bg-zion-50 text-zion-800"
                  : "border-zion-200 text-zion-600 hover:bg-zion-50")
              }
            >
              <ListFilter size={13} />
              <span className="max-sm:hidden">{pickedLabel}</span>
              <ChevronDown size={12} className={filterOpen ? "rotate-180 transition" : "transition"} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-zion-200 bg-white p-2 shadow-lg">
                <div className="mb-1 flex items-center justify-between px-1.5 pb-1">
                  <span className="text-[12px] font-bold text-ink">다중 선택</span>
                  {picked.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setPicked(new Set())}
                      className="text-[11px] font-semibold text-zion-700 hover:underline"
                    >
                      해제
                    </button>
                  )}
                </div>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => setPicked(new Set())}
                      aria-pressed={picked.size === 0}
                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-[13px] transition hover:bg-zion-50"
                    >
                      <span
                        className={
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                          (picked.size === 0 ? "border-zion-700 bg-zion-700 text-white" : "border-zion-300")
                        }
                      >
                        {picked.size === 0 && <Check size={11} />}
                      </span>
                      <span className="flex-1 text-ink">전체</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setPicked(new Set(EXCEPT_QUOTES))}
                      aria-pressed={isExceptQuotes(picked)}
                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-[13px] transition hover:bg-zion-50"
                    >
                      <span
                        className={
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                          (isExceptQuotes(picked) ? "border-zion-700 bg-zion-700 text-white" : "border-zion-300")
                        }
                      >
                        {isExceptQuotes(picked) && <Check size={11} />}
                      </span>
                      <span className="flex-1 text-ink">어록만 제외</span>
                    </button>
                  </li>
                  <li className="my-1 border-t border-zion-100" role="separator" />
                  {ALL_KINDS.map((k) => {
                    const on = picked.has(k);
                    const n = counts.get(k);
                    return (
                      <li key={k}>
                        <button
                          type="button"
                          onClick={() => toggleKind(k)}
                          aria-pressed={on}
                          className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-[13px] transition hover:bg-zion-50"
                        >
                          <span
                            className={
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                              (on ? "border-zion-700 bg-zion-700 text-white" : "border-zion-300")
                            }
                          >
                            {on && <Check size={11} />}
                          </span>
                          <span className="flex-1 text-ink">{k}</span>
                          {n !== undefined && <span className="text-[11px] text-ink-soft">{n}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <Sparkles size={16} className="shrink-0 text-zion-600 max-sm:hidden" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="교안·어록에서 찾기 (예: 믿음, 기도)"
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
        {loading
          ? "자료를 찾는 중입니다"
          : filtered !== null
            ? `검색 결과 ${filtered.length}건${picked.size > 0 ? ` — ${pickedLabel}만 보는 중` : ""}`
            : ""}
      </div>

      {/*
        첫 질문에만 잠깐 보인다 — 자료 뭉치를 그때 받아 오기 때문이다.
        빈 자리를 두면 「눌렀는데 아무 일도 안 일어났다」로 읽히므로 무엇을 하는 중인지 적는다.
      */}
      {open && loading && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-zion-200 bg-white p-4 shadow-lg">
          <p className="text-center text-[13px] text-ink-soft">자료를 찾는 중입니다</p>
        </div>
      )}

      {open && !loading && filtered !== null && hits !== null && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-zion-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold text-zion-800">
              사이트 자료 기반 결과 {filtered.length}건
              {picked.size > 0 && <span className="ml-1 text-zion-600">({pickedLabel})</span>}
              <span className="ml-2 font-normal text-ink-soft">
                AI 응답 연결 전 — 로컬 자료 검색으로 동작 중
              </span>
            </div>
            <button onClick={close} aria-label="결과 닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
              <X size={14} />
            </button>
          </div>

          {hits.length === 0 ? (
            <p className="py-3 text-center text-[13px] leading-relaxed text-ink-soft">
              {picked.size > 0 && allHits !== null && allHits.length > 0 ? (
                <>
                  고른 갈래에는 결과가 없습니다. 전체로 보면 {allHits.length}건입니다.
                  <br />
                  왼쪽 필터에서 「전체」를 눌러 보세요.
                </>
              ) : (
                <>
                  일치하는 자료가 없습니다.
                  <br />
                  문장으로 물어도 되니, 찾는 것을 가리키는 낱말을 함께 넣어 보세요.
                </>
              )}
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
          {filtered.length > hits.length && (
            <p className="mt-2 text-[11px] text-ink-soft">
              상위 {hits.length}건만 보입니다 — 갈래를 좁히면 더 찾기 쉽습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
