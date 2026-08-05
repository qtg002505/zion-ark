import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useStore } from "../lib/store";
import { searchSite, type SearchHit } from "../lib/search";

/**
 * Ask AI 바 — 사이트 자료 기반 답변 + 출처 표시 (확정 결정 5).
 * 현재 로컬 검색으로 동작. 실제 AI API 연결 시에도 검색 대상은 공통 교육
 * 영역만이며 수강생 개인정보는 입력하지 않는다.
 * aria-live 영역은 조건부가 아니라 상시 렌더한다 (낭독 안정성).
 */
export function AskAiBar() {
  const { materials, entries } = useStore();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const results = searchSite(query, materials, entries);
    setHits(results);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setHits(null);
  }

  return (
    <div className="relative">
      <form onSubmit={submit} role="search" aria-label="사이트 자료 검색">
        <div className="flex items-center gap-2 rounded-xl border border-zion-200 bg-white px-3.5 py-2 shadow-sm focus-within:border-zion-500">
          <Sparkles size={16} className="shrink-0 text-gold-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="교안·에니어그램·공지·어록에서 질문해 보세요 (예: 예언, 3유형, 보강)"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-gray-400"
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
        {hits !== null ? `검색 결과 ${hits.length}건` : ""}
      </div>

      {open && hits !== null && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-zion-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold text-zion-800">
              사이트 자료 기반 결과 {hits.length}건
              <span className="ml-2 font-normal text-gray-400">
                AI 응답 연결 전 — 로컬 자료 검색으로 동작 중
              </span>
            </div>
            <button onClick={close} aria-label="결과 닫기" className="rounded p-1 text-gray-400 hover:bg-gray-100">
              <X size={14} />
            </button>
          </div>
          {hits.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-gray-500">
              일치하는 자료가 없습니다. 두 글자 이상, 자료에 있는 표현으로 검색해 보세요.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {hits.map((h, i) => (
                <li key={i}>
                  <Link to={h.href} onClick={close} className="block px-1 py-2 hover:bg-zion-50">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zion-100 px-1.5 py-0.5 text-[10px] font-semibold text-zion-700">
                        {h.sourceType}
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">{h.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-gray-500">{h.snippet}</p>
                    <p className="mt-0.5 text-[11px] text-gold-700">출처: {h.source}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
