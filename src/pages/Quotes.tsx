import { useMemo, useState } from "react";
import { Plus, Quote as QuoteIcon, Search, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canWriteWorkspace } from "../lib/permissions";
import type { QuoteCategory } from "../lib/types";
import { PageHeader, Card } from "./common";

const QUOTE_CATEGORIES: QuoteCategory[] = ["말씀", "사명", "신앙", "교육", "리더십"];

/**
 * 총회장님 어록 — 작업 4: 어록 원본 파일 수령 후 실제 데이터로 교체.
 * 지금은 검색·카테고리·등록 동선만 완성해 둔 상태 (샘플 데이터).
 */
export function Quotes() {
  const session = useSession();
  const { entries, addEntry } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | QuoteCategory>("all");
  const [formOpen, setFormOpen] = useState(false);

  const writable = canWriteWorkspace(session, "quote");

  const list = useMemo(() => {
    const q = query.trim();
    return entries
      .filter((e) => e.kind === "quote")
      .filter((e) => category === "all" || e.quoteCategory === category)
      .filter((e) => !q || e.title.includes(q) || e.body.includes(q));
  }, [entries, query, category]);

  return (
    <div>
      <PageHeader
        crumb="공지·어록"
        title="총회장님 어록"
        desc="어록 원본 파일 수령 후 전체 어록이 검색 가능한 형태로 탑재됩니다. 현재는 구조 확인용 샘플입니다."
        action={
          writable ? (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <Plus size={15} /> 어록 등록
            </button>
          ) : (
            <span className="text-[11px] text-gray-400">등록 권한: 콘텐츠 관리자 · 총회 신학부장</span>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-zion-100 p-1">
          {(["all", ...QUOTE_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={
                "rounded-md px-3 py-1.5 text-[12px] font-semibold transition " +
                (category === c ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
              }
            >
              {c === "all" ? "전체" : c}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
          <Search size={13} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="어록 검색"
            aria-label="어록 검색"
            className="w-32 bg-transparent text-[12px] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        {list.length === 0 && (
          <Card className="col-span-2 max-md:col-span-1">
            <p className="py-8 text-center text-[13px] text-gray-400">조건에 맞는 어록이 없습니다.</p>
          </Card>
        )}
        {list.map((q) => (
          <Card key={q.id}>
            <QuoteIcon size={18} className="text-gold-500" />
            <blockquote className="mt-2 text-[15px] font-semibold leading-relaxed text-zion-900">
              {q.title}
            </blockquote>
            <p className="mt-2 text-[12px] text-gray-500">{q.body}</p>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
              <span className="rounded bg-zion-100 px-2 py-0.5 text-[11px] font-semibold text-zion-700">
                {q.quoteCategory ?? "미분류"}
              </span>
              <span className="text-[11px] text-gray-400">{q.meta ?? ""}</span>
            </div>
          </Card>
        ))}
      </div>

      {formOpen && writable && (
        <QuoteForm
          onClose={() => setFormOpen(false)}
          onSubmit={(title, body, cat, source) => {
            addEntry({
              kind: "quote",
              title,
              body,
              meta: source || null,
              quoteCategory: cat,
              pinned: false,
              createdBy: session.name,
              createdByRole: session.roleCode,
            });
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function QuoteForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string, body: string, category: QuoteCategory, source: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<QuoteCategory>("말씀");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      setError("어록 본문을 두 글자 이상 입력해 주세요.");
      return;
    }
    onSubmit(title.trim(), body.trim(), category, source.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="어록 등록">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-zion-900">어록 등록</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <label className="mb-1 block text-[12px] font-semibold text-gray-700">어록</label>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={3}
          className="mb-3 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

        <label className="mb-1 block text-[12px] font-semibold text-gray-700">해설·맥락 (선택)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="mb-3 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-700">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as QuoteCategory)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
            >
              {QUOTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-700">출처 (선택)</label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="예: 2025 지도자 교육"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
            />
          </div>
        </div>

        {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-gray-500 hover:bg-gray-100">
            취소
          </button>
          <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
            등록
          </button>
        </div>
      </form>
    </div>
  );
}
