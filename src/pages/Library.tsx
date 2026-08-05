import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, Plus, Search, Star, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canToggleFeatured, canWriteLibrary } from "../lib/permissions";
import {
  LIBRARY_CATEGORY_LABELS,
  ROLE_LABELS,
  type LibraryCategory,
  type LibraryMaterial,
} from "../lib/types";
import { PageHeader, Card } from "./common";

const CATEGORIES: LibraryCategory[] = ["standard_lecture", "class_material", "excellent_plan"];

function isCategory(v: string | null): v is LibraryCategory {
  return v !== null && (CATEGORIES as string[]).includes(v);
}

/** 자료실 — 1단계 작업 1: 등록·열람·검색 + 우수 지정 (텍스트·외부 링크, 파일 업로드는 2차 R2) */
export function Library() {
  const session = useSession();
  const { materials, addMaterial, toggleFeatured } = useStore();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: LibraryCategory = isCategory(tabParam) ? tabParam : "standard_lecture";

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LibraryMaterial | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const writable = canWriteLibrary(session);
  const featureAdmin = canToggleFeatured(session);

  const list = useMemo(() => {
    const q = query.trim();
    return materials
      .filter((m) => (tab === "excellent_plan" ? m.category === "excellent_plan" || m.isFeatured : m.category === tab))
      .filter((m) => !q || m.title.includes(q) || m.body.includes(q));
  }, [materials, tab, query]);

  function switchTab(next: LibraryCategory) {
    setSelected(null);
    setParams(next === "standard_lecture" ? {} : { tab: next });
  }

  return (
    <div>
      <PageHeader
        crumb="강사·전도사 도우미"
        title="자료실"
        desc="표준 강의 자료·분반·보강 자료·우수 교안 — 전국 공통 열람. 1차는 텍스트·외부 링크 등록이며 파일 업로드는 2차에 지원됩니다."
        action={
          writable ? (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <Plus size={15} /> 자료 등록
            </button>
          ) : (
            <span className="text-[11px] text-gray-400">
              등록 권한: 콘텐츠 관리자 · 총회 신학부장
            </span>
          )
        }
      />

      {/* 말씀광장 외부 링크 (확정 결정 6) */}
      <div className="mb-5 flex gap-2">
        {[
          ["온라인 성경", "https://www.wordsquare.org/bible-forest/bible"],
          ["성경사전", "https://www.wordsquare.org/bible-forest/dictionary"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zion-700 transition hover:border-zion-500"
          >
            <ExternalLink size={13} /> 말씀광장 {label}
          </a>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-zion-100 p-1" role="tablist" aria-label="자료실 카테고리">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={tab === c}
              onClick={() => switchTab(c)}
              className={
                "rounded-lg px-4 py-2 text-[13px] font-semibold transition " +
                (tab === c ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
              }
            >
              {LIBRARY_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search size={13} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·내용 검색"
            aria-label="자료 검색"
            className="w-36 bg-transparent text-[12px] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 max-md:grid-cols-1">
        <div className="col-span-2 space-y-2 max-md:col-span-1">
          {list.length === 0 && (
            <Card>
              <p className="py-4 text-center text-[13px] text-gray-400">
                {query ? "검색 결과가 없습니다." : "아직 등록된 자료가 없습니다."}
              </p>
            </Card>
          )}
          {list.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={
                "block w-full rounded-xl border bg-white p-4 text-left shadow-sm transition " +
                (selected?.id === m.id ? "border-zion-500" : "border-zion-100 hover:border-zion-300")
              }
            >
              <div className="flex items-center gap-1.5">
                {m.isFeatured && <Star size={13} className="shrink-0 fill-gold-500 text-gold-500" />}
                <span className="truncate text-[13px] font-semibold text-gray-900">{m.title}</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {LIBRARY_CATEGORY_LABELS[m.category]} · {m.createdBy} · {m.createdAt.slice(0, 10)}
              </div>
            </button>
          ))}
        </div>

        <div className="col-span-3 max-md:col-span-1">
          {selected ? (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {selected.isFeatured && (
                      <span className="flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-700">
                        <Star size={11} className="fill-gold-500 text-gold-500" /> 우수 교안
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-[17px] font-bold text-zion-900">{selected.title}</h2>
                  <div className="mt-1 text-[12px] text-gray-400">
                    {LIBRARY_CATEGORY_LABELS[selected.category]} · 등록 {selected.createdBy} (
                    {ROLE_LABELS[selected.createdByRole]}) · {selected.createdAt.slice(0, 10)}
                  </div>
                </div>
                {featureAdmin && (
                  <button
                    onClick={() => {
                      toggleFeatured(selected.id);
                      setSelected({ ...selected, isFeatured: !selected.isFeatured });
                    }}
                    className={
                      "flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition " +
                      (selected.isFeatured
                        ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                        : "border-gold-500 text-gold-700 hover:bg-gold-100")
                    }
                  >
                    <Star size={13} />
                    {selected.isFeatured ? "우수 지정 해제" : "우수 교안 지정"}
                  </button>
                )}
              </div>
              <div className="mt-4 whitespace-pre-wrap border-t border-gray-100 pt-4 text-[14px] leading-relaxed text-gray-700">
                {selected.body}
              </div>
              {selected.externalUrl && (
                <a
                  href={selected.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-zion-700 hover:underline"
                >
                  <ExternalLink size={14} /> 외부 자료 열기
                </a>
              )}
            </Card>
          ) : (
            <Card>
              <p className="py-12 text-center text-[13px] text-gray-400">
                왼쪽 목록에서 자료를 선택하면 본문이 표시됩니다.
              </p>
            </Card>
          )}
        </div>
      </div>

      {formOpen && writable && (
        <MaterialForm defaultCategory={tab} onClose={() => setFormOpen(false)} onSubmit={(input) => {
          addMaterial({ ...input, createdBy: session.name, createdByRole: session.roleCode });
          setFormOpen(false);
        }} />
      )}
    </div>
  );
}

function MaterialForm({
  defaultCategory,
  onClose,
  onSubmit,
}: {
  defaultCategory: LibraryCategory;
  onClose: () => void;
  onSubmit: (input: { category: LibraryCategory; title: string; body: string; externalUrl: string | null }) => void;
}) {
  const [category, setCategory] = useState<LibraryCategory>(defaultCategory);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2 || body.trim().length < 5) {
      setError("제목 2자 이상, 본문 5자 이상 입력해 주세요.");
      return;
    }
    if (url.trim() && !/^https?:\/\//.test(url.trim())) {
      setError("외부 링크는 http(s):// 로 시작해야 합니다.");
      return;
    }
    onSubmit({ category, title: title.trim(), body: body.trim(), externalUrl: url.trim() || null });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="자료 등록">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-zion-900">자료 등록</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <label className="mb-1 block text-[12px] font-semibold text-gray-700">카테고리</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LibraryCategory)}
          className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {LIBRARY_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-[12px] font-semibold text-gray-700">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

        <label className="mb-1 block text-[12px] font-semibold text-gray-700">본문 (텍스트)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="mb-3 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

        <label className="mb-1 block text-[12px] font-semibold text-gray-700">외부 링크 (선택)</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

        {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-gray-500 hover:bg-gray-100">
            취소
          </button>
          <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
            등록
          </button>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">파일 첨부는 2차(R2 스토리지)에서 지원됩니다.</p>
      </form>
    </div>
  );
}
