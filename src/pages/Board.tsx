import { useMemo, useState } from "react";
import { CircleAlert, CornerDownRight, Lock, MessageSquarePlus, Reply, X } from "lucide-react";
import { Portal } from "../components/Portal";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canReadSecretPost, canReplyBoard } from "../lib/permissions";
import { scanPII } from "../lib/privacy";
import { ROLE_LABELS, type BoardPost } from "../lib/types";
import { PageHeader, Card } from "./common";

/**
 * 건의·의견 게시판 (2026-08-14 피드백 FB-09 — 신설).
 *
 * 실무자(강사·전도사)가 총회 신학부장·개발자에게 **플랫폼에 대한 의견**을 남기는 창구다 —
 * 「마음의 편지」가 아니라 쿠팡 후기 같은 것이다.
 *
 * - 작성: 로그인 사명자 전체. 공개글/비밀글 선택
 * - 비밀글 열람: **작성자 본인 + 총회 신학부장만** (`canReadSecretPost`).
 *   목록에는 제목이 잠금 표시로 가려진 채 남는다 — 글이 있다는 사실은 보이되 내용은 안 보인다
 * - 답글: 총회 신학부장의 1단 답글만
 *
 * ⚠️ **비밀글 거름은 여기(클라이언트)만으로 끝나지 않는다** — 실연동 시 서버가 세션
 * 역할을 대조해 응답에서 거른다. 타인 비밀글 API 직접 호출은 403이다 (지시문 핵심 테스트).
 * ⚠️ 게시판 본문에 수강생 개인정보를 적지 않게 안내를 붙이고 `scanPII`로도 잡는다 —
 * 정규식은 실수를 잡는 장치일 뿐이므로 안내 문구가 먼저다.
 */
export function Board() {
  const session = useSession();
  const { boardPosts, boardReplies, addBoardPost, addBoardReply } = useStore();

  const [formOpen, setFormOpen] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const replyByPost = useMemo(() => {
    const map = new Map<string, typeof boardReplies>();
    for (const r of boardReplies) {
      map.set(r.postId, [...(map.get(r.postId) ?? []), r]);
    }
    return map;
  }, [boardReplies]);

  const opened = boardPosts.find((p) => p.id === openedId) ?? null;
  const openedReadable = opened !== null && canReadSecretPost(session, opened);

  return (
    <div>
      <PageHeader
        crumb="건의 · 의견"
        title="건의 · 의견"
        desc="플랫폼을 쓰다가 느낀 건의·불편·감사를 남기는 자리입니다. 비밀글은 작성자 본인과 총회 신학부장만 봅니다."
        action={
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
          >
            <MessageSquarePlus size={15} /> 글쓰기
          </button>
        }
      />

      {opened && openedReadable ? (
        <Card>
          <button onClick={() => setOpenedId(null)} className="mb-3 text-[12px] font-semibold text-zion-700 hover:underline">
            ← 목록으로
          </button>
          <div className="flex items-start gap-2">
            {opened.isSecret && <Lock size={15} className="mt-1 shrink-0 text-gold-700" />}
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold text-zion-900">{opened.title}</h2>
              <div className="mt-1 text-[12px] text-ink-soft">
                {opened.createdBy} ({ROLE_LABELS[opened.createdByRole]}) · {opened.createdAt.slice(0, 16).replace("T", " ")}
                {opened.isSecret && " · 비밀글 — 작성자와 총회 신학부장만 봅니다"}
              </div>
            </div>
          </div>
          <div className="mt-4 whitespace-pre-wrap border-t border-zion-100 pt-4 text-[14px] leading-relaxed text-ink">
            {opened.body}
          </div>

          {/* 답글 — 총회 신학부장의 1단 답글 */}
          <ReplyList postId={opened.id} replies={replyByPost.get(opened.id) ?? []} onReply={addBoardReply} />
        </Card>
      ) : (
        <Card>
          {boardPosts.length === 0 ? (
            <p className="py-10 text-center text-[13px] leading-relaxed text-ink-soft">
              아직 올라온 글이 없습니다. 첫 의견을 남겨 주세요 — 작은 불편도 좋습니다.
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="border-b-2 border-zion-200 text-left text-[12px] text-ink-soft">
                    <th className="w-12 pb-2 font-medium">번호</th>
                    <th className="pb-2 font-medium">제목</th>
                    <th className="w-14 pb-2 text-center font-medium">답글</th>
                    <th className="w-32 pb-2 font-medium">작성일시</th>
                    <th className="w-24 pb-2 font-medium">작성자</th>
                  </tr>
                </thead>
                <tbody>
                  {boardPosts.map((p, idx) => {
                    const readable = canReadSecretPost(session, p);
                    const replies = replyByPost.get(p.id)?.length ?? 0;
                    return (
                      <tr key={p.id} className="border-b border-zion-100 last:border-0 hover:bg-zion-50/60">
                        <td className="py-2.5 pr-2 text-[12px] text-ink-soft">{boardPosts.length - idx}</td>
                        <td className="max-w-0 py-2.5 pr-2">
                          {readable ? (
                            <span className="flex items-center gap-1.5">
                              {p.isSecret && <Lock size={12} className="shrink-0 text-gold-700" />}
                              <button
                                onClick={() => setOpenedId(p.id)}
                                className="min-w-0 flex-1 truncate text-left font-medium text-zion-800 hover:underline"
                                title={p.title}
                              >
                                {p.title}
                              </button>
                            </span>
                          ) : (
                            /* 남의 비밀글 — 글이 있다는 것만 보이고 제목·내용은 잠긴다 */
                            <span className="flex items-center gap-1.5 text-ink-soft">
                              <Lock size={12} className="shrink-0" />
                              <span className="text-[12.5px]">비밀글입니다</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          {replies > 0 && (
                            <span className="inline-block min-w-6 rounded bg-zion-100 px-1.5 py-0.5 text-[11px] font-bold text-zion-700">
                              {replies}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-2 text-[12px] text-ink-soft">
                          {p.createdAt.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-2.5 text-[12px] text-ink-soft">{p.createdBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {formOpen && (
        <PostForm
          onClose={() => setFormOpen(false)}
          onSubmit={(input) => {
            addBoardPost({ ...input, createdBy: session.name, createdByRole: session.roleCode });
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ReplyList({
  postId,
  replies,
  onReply,
}: {
  postId: string;
  replies: { id: string; body: string; createdBy: string; createdByRole: BoardPost["createdByRole"]; createdAt: string }[];
  onReply: (input: { postId: string; body: string; createdBy: string; createdByRole: BoardPost["createdByRole"] }) => void;
}) {
  const session = useSession();
  const [draft, setDraft] = useState("");
  const canReply = canReplyBoard(session);

  return (
    <div className="mt-4 border-t border-zion-100 pt-3">
      <div className="mb-2 text-[12px] font-semibold text-ink">답글 {replies.length}</div>
      {replies.length === 0 && !canReply && (
        <p className="text-[12px] text-ink-soft">아직 답글이 없습니다. 총회 신학부장이 확인 후 답합니다.</p>
      )}
      <ul className="space-y-2">
        {replies.map((r) => (
          <li key={r.id} className="flex gap-2 rounded-lg bg-zion-50 p-3">
            <CornerDownRight size={13} className="mt-0.5 shrink-0 text-zion-500" />
            <div className="min-w-0">
              <div className="text-[11px] text-ink-soft">
                {r.createdBy} ({ROLE_LABELS[r.createdByRole]}) · {r.createdAt.slice(0, 16).replace("T", " ")}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {canReply && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim().length < 2) return;
            onReply({ postId, body: draft.trim(), createdBy: session.name, createdByRole: session.roleCode });
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="답글을 적습니다 (총회 신학부장)"
            aria-label="답글 입력"
            className="min-w-0 flex-1 rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1 rounded-lg bg-zion-800 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-zion-700"
          >
            <Reply size={13} /> 답글
          </button>
        </form>
      )}
    </div>
  );
}

function PostForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: { title: string; body: string; isSecret: boolean }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 사람에게 먼저 알린다 — 수강생 개인정보가 게시판에 실리지 않게 (지시문 주의사항) */
  const warnings = useMemo(() => scanPII(body), [body]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2 || body.trim().length < 5) {
      setError("제목 2자 이상, 내용 5자 이상 적어 주세요.");
      return;
    }
    onSubmit({ title: title.trim(), body: body.trim(), isSecret });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="건의·의견 글쓰기"
      >
        <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-zion-900">글쓰기</h2>
            <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
              <X size={16} />
            </button>
          </div>

          <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-2.5 text-[12px] leading-relaxed text-ink">
            <CircleAlert size={14} className="mt-0.5 shrink-0 text-gold-700" />
            <span>
              <strong className="font-bold">수강생 개인정보(이름·연락처 등)는 적지 마세요.</strong> 이
              게시판은 플랫폼에 대한 의견 창구입니다 — 수강생 이야기는 상담 사례 화면에서 익명화
              기준을 지켜 남깁니다.
            </span>
          </p>

          <label className="mb-1 block text-[12px] font-semibold text-ink">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />

          <label className="mb-1 block text-[12px] font-semibold text-ink">내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mb-1 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
          />
          {warnings.length > 0 && (
            <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-2.5 text-[12px] leading-relaxed text-ink">
              <CircleAlert size={14} className="mt-0.5 shrink-0 text-gold-700" />
              <span>
                <strong className="font-bold">지워 주세요:</strong> {warnings.join(" · ")}
              </span>
            </p>
          )}

          <label className="mb-4 flex items-start gap-2 rounded-lg bg-zion-50 p-3 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span>
              <span className="flex items-center gap-1 font-semibold">
                <Lock size={13} className="text-gold-700" /> 비밀글로 올리기
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-soft">
                작성자 본인과 총회 신학부장만 볼 수 있습니다. 목록에는 「비밀글입니다」로만 보입니다.
              </span>
            </span>
          </label>

          {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zion-200 px-4 py-2 text-[13px] font-semibold text-zion-700 transition hover:bg-zion-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              올리기
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
