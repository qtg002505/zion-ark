import { useMemo, useState, type ReactNode } from "react";
import { Download, ExternalLink, FolderOpen, Plus, Search, Star, X } from "lucide-react";
import { Portal } from "./Portal";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canToggleFeatured, canWriteLibrary } from "../lib/permissions";
import {
  LIBRARY_CATEGORY_LABELS,
  ROLE_LABELS,
  type LibraryCategory,
  type LibraryMaterial,
} from "../lib/types";
import { MediaLinks } from "./MediaLinks";
import { FavoriteButton } from "./FavoriteButton";
import { PageHeader, Card } from "../pages/common";

const CATEGORIES: LibraryCategory[] = ["standard_lecture", "class_material", "excellent_plan"];

/**
 * 폴더 하나의 자료를 열고 등록하는 화면 — **자료실과 강의 도우미가 같은 부품을 쓴다.**
 *
 * 2026-08-13에 `Library.tsx` 안에 있던 목록·상세·등록을 여기로 뺐다. 리드가 「밭갈이 각
 * 파트가 강의 도우미 안에서 독립적인 자료실 노릇을 하게」 하라고 지시했는데, 화면을 복제하면
 * **한쪽만 고쳐지는 사고**가 난다 — 등록 폼의 개인정보 문구나 우수 교안 지정 같은 것이
 * 갈리면 곧바로 문제가 된다. props로 가르고 몸통은 하나로 둔다.
 *
 * ⚠️ **폴더 목록(이동 메뉴)은 여기 그리지 않는다** (2026-08-09 리드 지시). 폴더 이동은
 * 사이드바(`src/shell/nav.ts`) 한 곳에서만 한다 — 화면이 자체 폴더 패널을 그리면 같은
 * 카테고리가 두 군데에 뜬다. 여기는 **고른 폴더의 자료**만 보여 준다.
 */
export function FolderLibrary({
  crumb,
  title,
  desc,
  folders,
  folder,
  onSelectFolder,
  scopeAll = false,
  categoryFilter = null,
  emptyNote,
  children,
}: {
  crumb: string;
  title: string;
  desc: string;
  /** 이 화면이 다루는 폴더 — 등록 폼의 선택지이자 「전체 보기」의 범위 */
  folders: string[];
  /** 지금 고른 폴더. `null`이면 화면 범위 전체 */
  folder: string | null;
  /** 폴더 지정을 풀 때 (「전체 보기」). 넘기지 않으면 그 버튼을 그리지 않는다 */
  onSelectFolder?: (next: string | null) => void;
  /** 자료실처럼 **모든 자료**(폴더 없는 옛 자료 포함)를 담는 화면인지 */
  scopeAll?: boolean;
  /**
   * 분류로만 훑는 모드 — **폴더 범위를 넘어 전부에서 고른다.**
   * 우수 교안(`excellent_plan`)은 분류가 그것이거나 우수 지정(`isFeatured`)된 자료를 함께 담는다.
   */
  categoryFilter?: LibraryCategory | null;
  /** 자료가 없을 때 덧붙일 안내 (폴더 성격에 따라 다르다) */
  emptyNote?: string;
  /** 목록 위에 끼울 화면별 안내 */
  children?: ReactNode;
}) {
  const session = useSession();
  const { materials, addMaterial, toggleFeatured } = useStore();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LibraryMaterial | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const writable = canWriteLibrary(session);
  const featureAdmin = canToggleFeatured(session);

  const scopeKey = folders.join("|");
  const list = useMemo(() => {
    const q = query.trim();
    const scope = scopeKey.split("|");
    return materials
      .filter((m) => {
        const top = (m.folderPath ?? [])[0];
        if (categoryFilter) {
          return categoryFilter === "excellent_plan"
            ? m.category === "excellent_plan" || m.isFeatured
            : m.category === categoryFilter;
        }
        if (folder) return top === folder;
        // 화면 범위 전체 — 자료실은 폴더가 없는 옛 자료까지 맡는다(어디에도 안 뜨면 영영 못 찾는다)
        return scopeAll ? true : scope.includes(top ?? "");
      })
      .filter((m) => !q || m.title.includes(q) || m.body.includes(q));
  }, [materials, folder, scopeKey, scopeAll, categoryFilter, query]);

  return (
    <div>
      <PageHeader
        crumb={crumb}
        title={title}
        desc={desc}
        action={
          writable ? (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <Plus size={15} /> 자료 등록
            </button>
          ) : (
            <span className="text-[11px] text-ink-soft">등록 권한: 콘텐츠 관리자 · 총회 신학부장</span>
          )
        }
      />

      {children}

      <div className="mb-4 flex min-w-0 items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-2">
        <Search size={13} className="shrink-0 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·내용 검색"
          aria-label="자료 검색"
          className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
        />
      </div>

      {/* 지금 보고 있는 폴더. 폴더 **목록**은 왼쪽 사이드바에만 둔다 */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-soft">
        <FolderOpen size={14} className="shrink-0 text-zion-500" />
        <span className="font-semibold text-ink">{folder ?? title}</span>
        <span>· {list.length}건</span>
        {folder && onSelectFolder && (
          <button onClick={() => onSelectFolder(null)} className="font-semibold text-zion-700 hover:underline">
            전체 보기
          </button>
        )}
        {!folder && <span>— 폴더는 왼쪽 메뉴에서 고릅니다</span>}
      </div>

      {selected ? (
        <Card>
          <button onClick={() => setSelected(null)} className="mb-3 text-[12px] font-semibold text-zion-700 hover:underline">
            ← 목록으로
          </button>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {selected.isFeatured && (
                <span className="flex w-fit items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-700">
                  <Star size={11} className="fill-gold-500 text-gold-500" /> 우수 교안
                </span>
              )}
              <h2 className="mt-1 text-[17px] font-bold text-zion-900">{selected.title}</h2>
              <div className="mt-1 text-[12px] text-ink-soft">
                {(selected.folderPath ?? []).join(" › ") || "폴더 없음"}
                {" · "}
                {LIBRARY_CATEGORY_LABELS[selected.category]} · {selected.createdBy} (
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
                    ? "border-zion-100 text-ink-soft hover:bg-zion-50"
                    : "border-gold-500 text-gold-700 hover:bg-gold-100")
                }
              >
                <Star size={13} />
                {selected.isFeatured ? "우수 지정 해제" : "우수 교안 지정"}
              </button>
            )}
          </div>
          {/* 세부 설명(본문) · PPT · 영상이 한 화면에 이어진다 (2026-08-10 리드 지시) */}
          <div className="mt-4 whitespace-pre-wrap border-t border-zion-100 pt-4 text-[14px] leading-relaxed text-ink">
            {selected.body}
          </div>
          <MediaLinks pptUrl={selected.pptUrl} videoUrl={selected.videoUrl} />
          {selected.externalUrl && (
            <a
              href={selected.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-zion-700 hover:underline"
            >
              <Download size={14} /> 자료 내려받기 <span className="text-[11px] text-ink-soft">새 탭</span>
            </a>
          )}
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-[13px] leading-relaxed text-ink-soft">
            {query ? "검색 결과가 없습니다." : (emptyNote ?? "이 폴더에 등록된 자료가 없습니다.")}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            /*
              카드는 `div`다 — `button` 안에 즐겨찾기 `button`을 넣으면 HTML에서 금지된
              중첩이라 콘솔 오류가 나고 낭독기도 혼란스러워한다(2026-08-13 정리).
              대신 제목이 버튼이고, 카드 전체 클릭은 그 버튼으로 넘긴다.
            */
            <div
              key={m.id}
              className="rounded-card border border-zion-100 bg-white p-4 shadow-sm transition hover:border-zion-300"
            >
              <div className="flex items-center gap-1.5">
                {m.isFeatured && <Star size={13} className="shrink-0 fill-gold-500 text-gold-500" />}
                <button
                  onClick={() => setSelected(m)}
                  className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold text-ink hover:text-zion-700"
                >
                  {m.title}
                </button>
                <FavoriteButton targetType="material" targetId={m.id} label={m.title} size={13} />
              </div>
              <button onClick={() => setSelected(m)} className="block w-full text-left">
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">{m.body}</p>
                <div className="mt-1.5 text-[11px] text-ink-soft">
                  {(m.folderPath ?? []).join(" › ") || "폴더 없음"} · {m.createdBy} · {m.createdAt.slice(0, 10)}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && writable && (
        <MaterialForm
          folders={folders}
          defaultFolder={folder ?? folders[0]}
          onClose={() => setFormOpen(false)}
          onSubmit={(input) => {
            addMaterial({ ...input, createdBy: session.name, createdByRole: session.roleCode });
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MaterialForm({
  folders,
  defaultFolder,
  onClose,
  onSubmit,
}: {
  folders: string[];
  defaultFolder: string;
  onClose: () => void;
  onSubmit: (input: {
    category: LibraryCategory;
    title: string;
    body: string;
    externalUrl: string | null;
    pptUrl: string | null;
    videoUrl: string | null;
    /**
     * 구획은 2026-08-13에 폐지됐다 — 읽는 곳이 없지만 저장 스키마에 남은 자리라
     * 새 자료는 종전 기본값으로 채운다 (`LibrarySection` 주석 참고).
     */
    section: "instructor";
    folderPath: string[];
  }) => void;
}) {
  const [folder, setFolder] = useState(defaultFolder);
  const [category, setCategory] = useState<LibraryCategory>("standard_lecture");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [ppt, setPpt] = useState("");
  const [video, setVideo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2 || body.trim().length < 5) {
      setError("제목 2자 이상, 본문 5자 이상 입력해 주세요.");
      return;
    }
    const bad = [url, ppt, video].find((u) => u.trim() && !/^https?:\/\//.test(u.trim()));
    if (bad !== undefined) {
      setError("링크는 http(s):// 로 시작해야 합니다.");
      return;
    }
    onSubmit({
      category,
      title: title.trim(),
      body: body.trim(),
      externalUrl: url.trim() || null,
      pptUrl: ppt.trim() || null,
      videoUrl: video.trim() || null,
      section: "instructor",
      folderPath: [folder],
    });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="자료 등록"
      >
        <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-zion-900">자료 등록</h2>
            <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">폴더</label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              >
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">분류</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LibraryCategory)}
                className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {LIBRARY_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mb-1 block text-[12px] font-semibold text-ink">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />

          <label className="mb-1 block text-[12px] font-semibold text-ink">본문 (텍스트)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />

          <label className="mb-1 block text-[12px] font-semibold text-ink">
            자료 파일·내려받기 링크 (선택)
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… (도서·영상·삽화 원본)"
            className="mb-3 w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />

          {/*
            외부 매체(비메오·위플)는 **별도 구획이 아니라 자료에 붙는 참고 링크**다
            (2026-08-13 리드 확인). 그래서 자료 하나 안에서 교안·PPT·영상이 함께 열린다.
          */}
          <div className="mb-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">수업용 PPT 링크 (선택)</label>
              <input
                value={ppt}
                onChange={(e) => setPpt(e.target.value)}
                placeholder="https://… (외부 저장소)"
                className="w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">영상 링크 (선택)</label>
              <input
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder="https://vimeo.com/… 또는 위플 주소"
                className="w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              />
            </div>
          </div>

          {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-ink-soft hover:bg-zion-50">
              취소
            </button>
            <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
              등록
            </button>
          </div>
          <p className="mt-3 text-[11px] text-ink-soft">파일 첨부는 2차(R2 스토리지)에서 지원됩니다.</p>
        </form>
      </div>
    </Portal>
  );
}

/** 외부 링크 한 줄 — 자료실의 말씀광장·천지일보 바로가기에 쓴다 */
export function ExternalMediaLink({ label, href, note }: { label: string; href: string; note?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zion-700 transition hover:border-zion-500"
    >
      <ExternalLink size={13} /> {label}
      {note && <span className="text-[10px] text-ink-soft">{note}</span>}
    </a>
  );
}
