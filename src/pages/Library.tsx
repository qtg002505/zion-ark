import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpenText, ExternalLink, Folder, FolderOpen, Plus, Search, Star, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canToggleFeatured, canWriteLibrary } from "../lib/permissions";
import {
  EVANGELIST_MAKEUP_FOLDERS,
  INSTRUCTOR_BATGARI_FOLDERS,
  INSTRUCTOR_OTHER_FOLDERS,
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_FOLDERS,
  LIBRARY_SECTION_LABELS,
  ROLE_LABELS,
  type LibraryCategory,
  type LibraryMaterial,
  type LibrarySection,
} from "../lib/types";
import { PageHeader, Card } from "./common";

const CATEGORIES: LibraryCategory[] = ["standard_lecture", "class_material", "excellent_plan"];
const SECTIONS: LibrarySection[] = ["instructor", "external"];

function isSection(v: string | null): v is LibrarySection {
  return v === "instructor" || v === "external";
}

/**
 * 자료실 — **독립 대메뉴**이며 두 구획으로 갈린다 (2026-08-06 확정).
 *
 * 가르칠 때 쓰는 교안은 「강사 도우미 자료실」, 그 밖의 지식·전달 자료는 「외부 자료실」.
 * 각 구획 아래는 폴더로 세분한다. 두 구획 모두 **로그인해야 볼 수 있다** — 공개 영역이
 * 아니므로 무세션 401 원칙은 그대로다.
 *
 * 기존 카테고리(`standard_lecture` 등)는 데이터 계약이라 그대로 두고, 구획·폴더를 더했다.
 */
export function Library() {
  const session = useSession();
  const { materials, addMaterial, toggleFeatured } = useStore();
  const [params, setParams] = useSearchParams();

  const section: LibrarySection = isSection(params.get("section")) ? (params.get("section") as LibrarySection) : "instructor";
  const folder = params.get("folder");
  // 종전 링크(?tab=excellent_plan)도 계속 동작하게 둔다
  const legacyTab = params.get("tab");

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LibraryMaterial | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const writable = canWriteLibrary(session);
  const featureAdmin = canToggleFeatured(session);

  const folders = LIBRARY_FOLDERS[section];

  /**
   * 폴더 묶음 — 「강사 도우미 자료실」은 한 구획 안에 두 갈래가 있다
   * (강사가 기수를 열 때 쓰는 것 / 전도사가 보강에 쓰는 것). 평평하게 열 개를 늘어놓으면
   * 누가 쓰는 자료인지 구분이 안 되므로, 내비와 같은 이름으로 갈라 보여 준다.
   */
  const folderGroups: { label: string | null; folders: string[] }[] =
    section === "instructor"
      ? [
          // 묶음 이름은 내비(`shell/nav.ts`)와 반드시 같아야 한다 —
          // 2026-08-07 밭갈이 개편 때 내비만 바뀌어 같은 폴더를 두 이름으로 부르던 것을 맞췄다.
          { label: "밭갈이", folders: INSTRUCTOR_BATGARI_FOLDERS },
          { label: "그 밖의 강사 자료", folders: INSTRUCTOR_OTHER_FOLDERS },
          { label: "보강 자료", folders: EVANGELIST_MAKEUP_FOLDERS },
        ]
      : [{ label: null, folders }];

  const list = useMemo(() => {
    const q = query.trim();
    return materials
      .filter((m) => (m.section ?? "instructor") === section)
      .filter((m) => !folder || (m.folderPath ?? [])[0] === folder)
      .filter((m) => {
        if (!legacyTab) return true;
        return legacyTab === "excellent_plan"
          ? m.category === "excellent_plan" || m.isFeatured
          : m.category === legacyTab;
      })
      .filter((m) => !q || m.title.includes(q) || m.body.includes(q));
  }, [materials, section, folder, legacyTab, query]);

  /** 폴더별 자료 수 — 어디에 무엇이 있는지 눈으로 가늠하게 */
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materials) {
      if ((m.section ?? "instructor") !== section) continue;
      const top = (m.folderPath ?? [])[0] ?? "(폴더 없음)";
      map.set(top, (map.get(top) ?? 0) + 1);
    }
    return map;
  }, [materials, section]);

  function go(next: { section?: LibrarySection; folder?: string | null }) {
    const s = next.section ?? section;
    const f = next.folder === undefined ? folder : next.folder;
    const p: Record<string, string> = { section: s };
    if (f) p.folder = f;
    setSelected(null);
    setParams(p);
  }

  return (
    <div>
      <PageHeader
        crumb="자료실"
        title={LIBRARY_SECTION_LABELS[section]}
        desc={
          section === "instructor"
            ? "가르칠 때 쓰는 교안입니다. 폴더에서 골라 보세요."
            : "교안 밖의 지식·전달 자료입니다. 상황에 맞게 가져다 씁니다."
        }
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

      {/* 구획 전환 */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-zion-100 p-1" role="tablist" aria-label="자료실 구획">
        {SECTIONS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={section === s}
            onClick={() => go({ section: s, folder: null })}
            className={
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition sm:px-4 " +
              (section === s ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {LIBRARY_SECTION_LABELS[s]}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5">
          <Search size={13} className="text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·내용 검색"
            aria-label="자료 검색"
            className="w-28 bg-transparent text-[12px] outline-none sm:w-36"
          />
        </div>
      </div>

      {/* 말씀광장 — 새 탭 */}
      {section === "external" && (
        <div className="mb-4 flex flex-wrap gap-2">
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
              <BookOpenText size={13} /> 말씀광장 {label}
              <span className="text-[10px] text-ink-soft">새 탭</span>
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-6 gap-4 max-md:grid-cols-1">
        {/* 폴더 */}
        <nav aria-label="폴더" className="col-span-2 max-md:col-span-1">
          <div className="rounded-card border border-zion-100 bg-white p-2 shadow-sm">
            <button
              onClick={() => go({ folder: null })}
              className={
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition " +
                (!folder ? "bg-zion-700 font-semibold text-white" : "text-ink hover:bg-zion-50")
              }
            >
              {!folder ? <FolderOpen size={15} /> : <Folder size={15} className="text-zion-400" />}
              <span className="flex-1">전체</span>
              <span className={"text-[11px] " + (!folder ? "text-white/70" : "text-ink-soft")}>
                {[...counts.values()].reduce((a, b) => a + b, 0)}
              </span>
            </button>

            {folderGroups.map((g) => (
              <div key={g.label ?? "all"}>
                {g.label && (
                  <div className="mt-2 px-2.5 pt-1 pb-0.5 text-[11px] font-bold text-ink-soft">{g.label}</div>
                )}
                {g.folders.map((f) => {
                  const active = folder === f;
                  return (
                    <button
                      key={f}
                      onClick={() => go({ folder: f })}
                      className={
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition " +
                        (active ? "bg-zion-700 font-semibold text-white" : "text-ink hover:bg-zion-50")
                      }
                    >
                      {active ? <FolderOpen size={15} /> : <Folder size={15} className="text-zion-400" />}
                      <span className="min-w-0 flex-1 truncate">{f}</span>
                      <span className={"text-[11px] " + (active ? "text-white/70" : "text-ink-soft")}>
                        {counts.get(f) ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-soft">
            폴더는 회의에서 정한 축입니다. 하위 폴더를 더 나눌 수 있게 구조를 잡아 두었습니다.
          </p>
        </nav>

        {/* 목록 + 본문 */}
        <div className="col-span-4 max-md:col-span-1">
          {selected ? (
            <Card>
              <button
                onClick={() => setSelected(null)}
                className="mb-3 text-[12px] font-semibold text-zion-700 hover:underline"
              >
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
                    {LIBRARY_SECTION_LABELS[selected.section ?? "instructor"]}
                    {(selected.folderPath ?? []).length > 0 && ` › ${(selected.folderPath ?? []).join(" › ")}`}
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
              <div className="mt-4 whitespace-pre-wrap border-t border-zion-100 pt-4 text-[14px] leading-relaxed text-ink">
                {selected.body}
              </div>
              {selected.externalUrl && (
                <a
                  href={selected.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-zion-700 hover:underline"
                >
                  <ExternalLink size={14} /> 외부 자료 열기 <span className="text-[11px] text-ink-soft">새 탭</span>
                </a>
              )}
            </Card>
          ) : list.length === 0 ? (
            <Card>
              <p className="py-8 text-center text-[13px] text-ink-soft">
                {query ? "검색 결과가 없습니다." : "이 폴더에 등록된 자료가 없습니다."}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {list.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="block w-full rounded-card border border-zion-100 bg-white p-4 text-left shadow-sm transition hover:border-zion-300"
                >
                  <div className="flex items-center gap-1.5">
                    {m.isFeatured && <Star size={13} className="shrink-0 fill-gold-500 text-gold-500" />}
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{m.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">{m.body}</p>
                  <div className="mt-1.5 text-[11px] text-ink-soft">
                    {(m.folderPath ?? []).join(" › ") || "폴더 없음"} · {m.createdBy} ·{" "}
                    {m.createdAt.slice(0, 10)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {formOpen && writable && (
        <MaterialForm
          section={section}
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
  section,
  defaultFolder,
  onClose,
  onSubmit,
}: {
  section: LibrarySection;
  defaultFolder: string;
  onClose: () => void;
  onSubmit: (input: {
    category: LibraryCategory;
    title: string;
    body: string;
    externalUrl: string | null;
    section: LibrarySection;
    folderPath: string[];
  }) => void;
}) {
  const [sec, setSec] = useState<LibrarySection>(section);
  const [folder, setFolder] = useState(defaultFolder);
  const [category, setCategory] = useState<LibraryCategory>("standard_lecture");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const folders = LIBRARY_FOLDERS[sec];

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
    onSubmit({
      category,
      title: title.trim(),
      body: body.trim(),
      externalUrl: url.trim() || null,
      section: sec,
      folderPath: [folder],
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="자료 등록">
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-zion-900">자료 등록</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
            <X size={16} />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-ink">구획</label>
            <select
              value={sec}
              onChange={(e) => {
                const next = e.target.value as LibrarySection;
                setSec(next);
                setFolder(LIBRARY_FOLDERS[next][0]);
              }}
              className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {LIBRARY_SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
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
        </div>

        <label className="mb-1 block text-[12px] font-semibold text-ink">분류</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LibraryCategory)}
          className="mb-3 w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {LIBRARY_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

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

        <label className="mb-1 block text-[12px] font-semibold text-ink">외부 링크 (선택)</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="mb-4 w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

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
  );
}
