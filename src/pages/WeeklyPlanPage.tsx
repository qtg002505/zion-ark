import { useMemo, useState } from "react";
import { History, Lock, PencilLine, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canEditCohortRecord, cohortKeyOf } from "../lib/permissions";
import { ROLE_LABELS } from "../lib/types";
import { COHORT } from "../content/cohort-mock";
import { PageHeader, Card } from "./common";

/** 최근 주차 목록 — 실연동 시 기수 진도에서 가져온다 */
const WEEKS = ["8월 1주", "7월 4주", "7월 3주", "7월 2주", "7월 1주"];

/**
 * 기수 주간계획 (2026-08-06 확정) — **해당 기수의 강사·전도사가 함께 고친다.**
 *
 * 여럿이 같은 글을 고치므로 **누가 언제 바꿨는지 이력을 남긴다.** 그래야 서로 덮어쓴 것을
 * 확인하고 되돌릴 수 있다. 열람은 담당 범위 안에서 누구나, 수정만 그 기수 사명자로 제한한다.
 * 1차는 텍스트만 다룬다 — 파일 첨부는 2차(R2).
 */
export function WeeklyPlanPage() {
  const session = useSession();
  const { plans, savePlan } = useStore();
  const [week, setWeek] = useState(WEEKS[0]);
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const cohortKey = cohortKeyOf(session);
  const canEdit = canEditCohortRecord(session, cohortKey);

  const plan = useMemo(
    () => plans.find((p) => p.cohortKey === cohortKey && p.week === week) ?? null,
    [plans, cohortKey, week],
  );

  return (
    <div>
      <PageHeader
        crumb="기수 현황"
        title="기수 주간계획"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 담당 강사·전도사가 함께 작성하고 고칩니다.`}
        action={
          canEdit ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <PencilLine size={15} /> {plan ? "수정" : "작성"}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-ink-soft">
              <Lock size={12} /> 수정은 해당 기수 강사·전도사만
            </span>
          )
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-zion-100 p-1" role="tablist" aria-label="주차 선택">
        {WEEKS.map((w) => (
          <button
            key={w}
            role="tab"
            aria-selected={week === w}
            onClick={() => setWeek(w)}
            className={
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition sm:px-4 " +
              (week === w ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {w}
          </button>
        ))}
      </div>

      <Card>
        {plan ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zion-100 pb-2.5">
              <span className="text-[12px] text-ink-soft">
                마지막 수정 {plan.updatedBy} ({ROLE_LABELS[plan.updatedByRole]}) ·{" "}
                {plan.updatedAt.slice(0, 16).replace("T", " ")}
              </span>
              {plan.history.length > 0 && (
                <button
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="flex items-center gap-1 rounded-lg border border-zion-200 px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:bg-zion-50"
                >
                  <History size={12} /> 수정 이력 {plan.history.length}
                </button>
              )}
            </div>

            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{plan.body}</p>

            {historyOpen && (
              <div className="mt-4 border-t border-zion-100 pt-3">
                <div className="mb-2 text-[12px] font-bold text-zion-900">수정 이력</div>
                <ol className="space-y-2">
                  {plan.history.map((h, i) => (
                    <li key={i} className="rounded-lg bg-zion-50 p-3">
                      <div className="text-[11px] text-ink-soft">
                        {h.editedBy} ({ROLE_LABELS[h.editedByRole]}) ·{" "}
                        {h.editedAt.slice(0, 16).replace("T", " ")}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{h.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-[13px] text-ink-soft">
            {week} 계획이 아직 없습니다.
            {canEdit ? " 위 버튼으로 작성해 주세요." : " 담당 강사·전도사가 작성하면 표시됩니다."}
          </p>
        )}
      </Card>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        여럿이 함께 고치는 글이라 이전 내용을 이력으로 남깁니다. 파일 첨부는 2차에서 지원됩니다.
      </p>

      {editing && canEdit && (
        <PlanForm
          week={week}
          initial={plan?.body ?? ""}
          onClose={() => setEditing(false)}
          onSubmit={(body) => {
            savePlan({
              cohortKey,
              week,
              body,
              editedBy: session.name,
              editedByRole: session.roleCode,
            });
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function PlanForm({
  week,
  initial,
  onClose,
  onSubmit,
}: {
  week: string;
  initial: string;
  onClose: () => void;
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5) {
      setError("내용을 다섯 글자 이상 적어 주세요.");
      return;
    }
    onSubmit(body.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="주간계획 작성">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-zion-900">주간계획 — {week}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-[12px] text-ink-soft">
          고치면 이전 내용이 이력으로 남습니다. 다른 사명자도 같은 글을 고칠 수 있습니다.
        </p>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder={"예)\n· 진도: 12강 비유한 짐승과 머리\n· 보강: 목요일 저녁 (대상 3명)\n· 새신자 교육 안내 전달\n· 분반별 확인 사항"}
          className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
        />

        <p className="mb-3 text-[11px] text-ink-soft">
          수강생의 이름이나 개인적인 사정은 적지 않습니다. 진행 계획만 남겨 주세요.
        </p>

        {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-ink-soft hover:bg-zion-50">
            취소
          </button>
          <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
