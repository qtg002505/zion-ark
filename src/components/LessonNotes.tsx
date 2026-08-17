import { useMemo, useState } from "react";
import { Portal } from "./Portal";
import { MessageSquarePlus, ThumbsUp, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { LESSON_NOTE_LABELS, ROLE_LABELS, type LessonNoteKind } from "../lib/types";

const KINDS: LessonNoteKind[] = ["question", "caution", "tip"];

const KIND_STYLE: Record<LessonNoteKind, string> = {
  question: "bg-zion-100 text-zion-700",
  caution: "bg-gold-100 text-gold-700",
  tip: "bg-emerald-50 text-emerald-700",
};

/**
 * 강의 후 현장 기록 — 교안 원문 옆에 붙는 실제 경험.
 *
 * 교리 본문은 재작성하지 않는다는 원칙 때문에 교안 자체는 손대지 않는다. 대신 강의를
 * 해 본 사람이 남긴 것(많이 나온 질문·주의할 점·잘 통한 방법)을 옆에 쌓아, 다음에
 * 같은 강을 맡는 사람이 앞사람의 경험을 먼저 보게 한다. 쌓일수록 값이 커지는 자산이다.
 */
export function LessonNotes({
  lessonKey,
  lessonLabel,
}: {
  /** 강 식별자 — 예: "elementary-3", "high-05" */
  lessonKey: string;
  lessonLabel: string;
}) {
  const session = useSession();
  const { lessonNotes, addLessonNote, markNoteHelpful } = useStore();
  const [formOpen, setFormOpen] = useState(false);

  /**
   * 도움됨 수 — **옛 카운터와 새 1인 1표를 합쳐** 센다 (2026-08-15).
   * 종전 값(`helpful`)을 버리면 이미 쌓인 표가 사라진다(불변식 10).
   */
  const helpfulCount = (n: { helpful: number; helpfulBy?: string[] }) =>
    n.helpful + (n.helpfulBy?.length ?? 0);

  const notes = useMemo(
    () =>
      lessonNotes
        .filter((n) => n.lessonKey === lessonKey)
        .sort((a, b) => helpfulCount(b) - helpfulCount(a) || b.createdAt.localeCompare(a.createdAt)),
    [lessonNotes, lessonKey],
  );

  return (
    <div className="mt-6 rounded-xl border border-zion-100 bg-zion-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold text-zion-900">
            현장 기록 {notes.length > 0 && <span className="text-zion-600">{notes.length}건</span>}
          </h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-zion-700">여기부터는 교안 원문이 아닙니다.</span> 이 강을
            해 본 강사·전도사가 남긴 경험이며, 위 원문은 그대로 둡니다.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          <MessageSquarePlus size={14} /> 기록 남기기
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="mt-3 rounded-lg border border-zion-100 bg-white px-3 py-5 text-center">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            아직 기록이 없습니다. 「기록 남기기」로 많이 나온 질문·주의할 점·잘 통한 방법을 남깁니다.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
            수강생의 이름이나 개인 사정은 적지 않습니다.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2.5 text-[11px] text-ink-soft">
            도움이 됐다고 표시된 기록이 먼저 보입니다.
          </p>
          <ul className="mt-1.5 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-zion-100 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={"rounded px-1.5 py-0.5 text-[11px] font-semibold " + KIND_STYLE[n.kind]}>
                  {LESSON_NOTE_LABELS[n.kind]}
                </span>
                <span className="text-[11px] text-ink-soft">
                  {n.createdBy} ({ROLE_LABELS[n.createdByRole]}) · {n.createdAt.slice(0, 10)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{n.body}</p>
              {/* 도움됨 — **계정당 1회 토글** (2026-08-15 리드 지시. 다시 누르면 내 표가 빠진다) */}
              {(() => {
                const mine = (n.helpfulBy ?? []).includes(session.name);
                return (
                  <button
                    onClick={() => markNoteHelpful(n.id, session.name)}
                    aria-pressed={mine}
                    className={
                      "mt-2 flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition " +
                      (mine
                        ? "border-gold-500 bg-gold-100 text-gold-700"
                        : "border-zion-100 text-ink-soft hover:border-zion-300 hover:text-zion-700")
                    }
                  >
                    <ThumbsUp size={11} /> 도움됨 {helpfulCount(n) > 0 && helpfulCount(n)}
                  </button>
                );
              })()}
            </li>
          ))}
          </ul>
        </>
      )}

      {formOpen && (
        <NoteForm
          lessonLabel={lessonLabel}
          onClose={() => setFormOpen(false)}
          onSubmit={(kind, body) => {
            addLessonNote({
              lessonKey,
              lessonLabel,
              kind,
              body,
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

function NoteForm({
  lessonLabel,
  onClose,
  onSubmit,
}: {
  lessonLabel: string;
  onClose: () => void;
  onSubmit: (kind: LessonNoteKind, body: string) => void;
}) {
  const [kind, setKind] = useState<LessonNoteKind>("question");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5) {
      setError("내용을 다섯 글자 이상 적어 주세요.");
      return;
    }
    onSubmit(kind, body.trim());
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="현장 기록 남기기"
      >
        <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-zion-900">현장 기록 남기기</h2>
            <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
              <X size={16} />
            </button>
          </div>
          <p className="mb-4 text-[12px] text-ink-soft">{lessonLabel}</p>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={
                  "rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition " +
                  (kind === k
                    ? "border-zion-700 bg-zion-700 text-white"
                    : "border-zion-200 bg-white text-zion-700 hover:border-zion-400")
                }
              >
                {LESSON_NOTE_LABELS[k]}
              </button>
            ))}
          </div>

          <p className="mb-2 rounded-lg bg-zion-50 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
            수강생의 이름이나 개인적인 사정은 적지 않습니다. 강의 진행에 도움이 되는 내용만 남겨 주세요.
          </p>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="예: 3강에서 '실상'이 무엇인지 묻는 질문이 계속 나왔습니다. 유도형 질문을 먼저 던지니 정리가 빨랐습니다."
            className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />

          {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-ink-soft hover:bg-zion-50">
              취소
            </button>
            <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
              남기기
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
