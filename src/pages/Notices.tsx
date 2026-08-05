import { useMemo, useState } from "react";
import { Pin, Plus, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canWriteWorkspace } from "../lib/permissions";
import { ROLE_LABELS, type WorkspaceKind } from "../lib/types";
import { PageHeader, Card } from "./common";

type Tab = "notice_hq" | "notice_tribe";

/**
 * 공지사항 — 작업 3: 기존 workspace_entries 구조에 작성 권한 정착.
 * 총회 공지 = 총회 신학부장·콘텐츠 관리자 / 지파 공지 = 해당 지파 신학부장.
 * 열람은 로그인 전체. 지파 공지는 지파 범위로 분리 저장·조회.
 */
export function Notices() {
  const session = useSession();
  const { entries, addEntry } = useStore();
  const [tab, setTab] = useState<Tab>("notice_hq");
  const [formOpen, setFormOpen] = useState(false);

  const writable = canWriteWorkspace(session, tab, session.tribe);

  const list = useMemo(
    () =>
      entries
        .filter((e) => e.kind === tab)
        // 지파 공지는 소속 지파 것만 (분리 조회)
        .filter((e) => tab !== "notice_tribe" || e.meta === session.tribe)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)),
    [entries, tab, session.tribe],
  );

  return (
    <div>
      <PageHeader
        crumb="공지·어록"
        title="공지사항"
        desc={`총회 공지는 전국 공통, 지파 공지는 소속 지파(${session.tribe})만 표시됩니다.`}
        action={
          writable ? (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <Plus size={15} /> 공지 작성
            </button>
          ) : (
            <span className="text-[11px] text-ink-soft">
              작성 권한: {tab === "notice_hq" ? "총회 신학부장 · 콘텐츠 관리자" : "해당 지파 신학부장"}
            </span>
          )
        }
      />

      <div className="mb-4 flex gap-1 rounded-xl bg-zion-100 p-1" role="tablist" aria-label="공지 구분">
        {(
          [
            ["notice_hq", "총회 공지"],
            ["notice_tribe", `지파 공지 (${session.tribe})`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={
              "flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold transition " +
              (tab === id ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <Card>
            <p className="py-8 text-center text-[13px] text-ink-soft">등록된 공지가 없습니다.</p>
          </Card>
        )}
        {list.map((n) => (
          <Card key={n.id}>
            <div className="flex items-center gap-2">
              {n.pinned && (
                <span className="flex items-center gap-1 rounded-full bg-zion-50 px-2 py-0.5 text-[11px] font-semibold text-zion-700">
                  <Pin size={11} /> 고정
                </span>
              )}
              <h2 className="text-[15px] font-bold text-zion-900">{n.title}</h2>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{n.body}</p>
            <div className="mt-3 border-t border-zion-100 pt-2 text-[11px] text-ink-soft">
              {n.createdBy} ({ROLE_LABELS[n.createdByRole]}) · {n.createdAt.slice(0, 10)}
            </div>
          </Card>
        ))}
      </div>

      {formOpen && writable && (
        <NoticeForm
          kind={tab}
          onClose={() => setFormOpen(false)}
          onSubmit={(title, body, pinned) => {
            addEntry({
              kind: tab,
              title,
              body,
              meta: tab === "notice_tribe" ? session.tribe : null,
              quoteCategory: null,
              pinned,
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

function NoticeForm({
  kind,
  onClose,
  onSubmit,
}: {
  kind: WorkspaceKind;
  onClose: () => void;
  onSubmit: (title: string, body: string, pinned: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2 || body.trim().length < 5) {
      setError("제목 2자 이상, 본문 5자 이상 입력해 주세요.");
      return;
    }
    onSubmit(title.trim(), body.trim(), pinned);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="공지 작성">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-zion-900">
            {kind === "notice_hq" ? "총회 공지 작성" : "지파 공지 작성"}
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
            <X size={16} />
          </button>
        </div>

        <label className="mb-1 block text-[12px] font-semibold text-ink">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

        <label className="mb-1 block text-[12px] font-semibold text-ink">본문</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />

        {kind === "notice_hq" && (
          <label className="mb-4 flex items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            전체 현황 상단에 고정
          </label>
        )}

        {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-ink-soft hover:bg-zion-50">
            취소
          </button>
          <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
            게시
          </button>
        </div>
      </form>
    </div>
  );
}
