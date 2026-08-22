import { useEffect, useRef, useState, type ReactNode } from "react";
import { PencilLine, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { scanPII } from "../lib/privacy";
import { OPS_NOTE_LABELS, type OpsNoteField } from "../lib/types";
import { COHORT_KEY, STUDENTS } from "../content/cohort-mock";
import { STUDENT_PROFILES } from "../content/student-profiles";
import { readAll } from "../lib/attendance-signals";
import { weekNoOf, mondayOfWeek } from "../lib/cohort-calendar";
import { WEEK_OPS_SEED, OPS_NOTE_SEED, KPI_TARGETS, type WeekOpsSeed } from "../content/week-ops-mock";

/**
 * 월간·주간 계획의 왼쪽 「주차별 진행 현황」 판과 하단 「운영 분석」 판 (2026-08-22 리드 시안).
 * 페이지 파일이 이미 1,200줄이 넘어 여기로 갈랐다 — 이 라우트에서만 쓰므로 조각도 같이 묶인다.
 *
 * 권한은 주간계획과 같다: 해당 기수의 강사·전도사만 고친다(대조는 페이지가 `canEdit`으로 넘긴다).
 * 기수 공유 기록이라 수강생 이름·개인 사정을 적지 않는다 — `scanPII`가 걸리면 저장을 막는다
 * (회의록과 같은 강제).
 */

function todayYmd(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const EMPTY_ROW: WeekOpsSeed = { operation: "", goal: "", spiritGoal: "", keyAction: "" };

/** 주차 판의 네 칸 — 라벨은 리드 시트 표기를 따르되 「액션」만 화면 문구 규칙대로 「활동」이다 */
const OPS_FIELD_LABELS: { key: keyof WeekOpsSeed; label: string }[] = [
  { key: "operation", label: "기수 운영" },
  { key: "goal", label: "목표 (국/위)" },
  { key: "spiritGoal", label: "영목표" },
  { key: "keyAction", label: "핵심 활동" },
];

/** (기수, 주차)의 표시값 — 저장된 줄이 있으면 그것, 없으면 시범 씨앗, 그것도 없으면 빈 칸 */
export function weekOpsRowOf(
  saved: Map<number, WeekOpsSeed>,
  cohortKey: string,
  weekNo: number,
): WeekOpsSeed {
  return saved.get(weekNo) ?? (cohortKey === COHORT_KEY ? WEEK_OPS_SEED[weekNo] : undefined) ?? EMPTY_ROW;
}

/* ── 주차별 진행 현황 ─────────────────────────────────────────────── */

export function WeekOpsBoard({
  cohortKey,
  startsOn,
  endsOn,
  canEdit,
}: {
  cohortKey: string;
  startsOn: string;
  endsOn: string;
  canEdit: boolean;
}) {
  const session = useSession();
  const { weekOpsRows, setWeekOpsRow } = useStore();
  const totalWeeks = Math.max(1, weekNoOf(startsOn, endsOn));
  const today = todayYmd();
  const curWeek =
    today >= startsOn && today <= endsOn ? Math.min(totalWeeks, weekNoOf(startsOn, today)) : null;

  const saved = new Map<number, WeekOpsSeed>(
    weekOpsRows
      .filter((r) => r.cohortKey === cohortKey)
      .map((r): [number, WeekOpsSeed] => [r.weekNo, r]),
  );

  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<WeekOpsSeed>(EMPTY_ROW);
  const [warn, setWarn] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* 이번 주가 판 가운데쯤 오게 처음 한 번 감아 둔다 — 35주를 위에서부터 훑게 하지 않는다 */
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || curWeek == null) return;
    const row = box.querySelector<HTMLElement>(`[data-week="${curWeek}"]`);
    if (row) box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 3);
    // 기수를 바꾸면 그 기수의 이번 주로 다시 감는다
  }, [cohortKey, curWeek]);

  function startEdit(weekNo: number) {
    setDraft({ ...weekOpsRowOf(saved, cohortKey, weekNo) });
    setWarn([]);
    setEditing(weekNo);
  }

  function save(weekNo: number) {
    const joined = [draft.operation, draft.goal, draft.spiritGoal, draft.keyAction].join("\n");
    const hits = scanPII(joined);
    if (hits.length > 0) {
      setWarn(hits);
      return;
    }
    setWeekOpsRow({
      cohortKey,
      weekNo,
      operation: draft.operation.trim(),
      goal: draft.goal.trim(),
      spiritGoal: draft.spiritGoal.trim(),
      keyAction: draft.keyAction.trim(),
      updatedBy: session.name,
      updatedByRole: session.roleCode,
    });
    setEditing(null);
  }

  return (
    <section className="rounded-card border border-zion-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[14.5px] font-bold text-ink">주차별 진행 현황</h2>
        {curWeek != null && (
          <span className="rounded-full bg-zion-700 px-2 py-0.5 text-[10.5px] font-bold text-white">
            이번 주 · 개강 {curWeek}주
          </span>
        )}
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-ink-soft">
        기수 운영 · 목표 (국/위) · 영목표 · 핵심 활동을 개강 주차 단위로 적습니다. 미리 채워진
        내용은 시범 값이고, 수정은 해당 기수 강사·전도사만 합니다.
      </p>

      <div ref={scrollRef} className="max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((weekNo) => {
          const row = weekOpsRowOf(saved, cohortKey, weekNo);
          const isCur = weekNo === curWeek;
          const isEditing = editing === weekNo;
          const start = mondayOfWeek(startsOn, weekNo);
          const [, sm, sd] = start.split("-").map(Number);
          const empty = OPS_FIELD_LABELS.every((f) => !row[f.key]);
          return (
            <div
              key={weekNo}
              data-week={weekNo}
              className={
                "flex gap-2 rounded-lg border p-2 " +
                (isCur ? "border-zion-500 bg-zion-50" : "border-zion-100 bg-white")
              }
            >
              <div className="w-[52px] shrink-0 text-center">
                <div
                  className={
                    "rounded-md px-1 py-1 text-[11px] font-bold leading-tight " +
                    (isCur ? "bg-zion-700 text-white" : "bg-zion-100 text-zion-800")
                  }
                >
                  개강
                  <br />
                  {weekNo}주
                </div>
                <div className="mt-0.5 text-[9.5px] text-ink-soft">
                  {sm}.{sd}~
                </div>
              </div>

              {isEditing ? (
                <div className="min-w-0 flex-1 space-y-1.5">
                  {OPS_FIELD_LABELS.map((f) => (
                    <label key={f.key} className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-ink-soft">
                        {f.label}
                      </span>
                      <textarea
                        value={draft[f.key]}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        rows={1}
                        className="w-full resize-y rounded-md border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                      />
                    </label>
                  ))}
                  {warn.length > 0 && (
                    <p className="text-[11px] font-semibold text-red-600">
                      저장할 수 없습니다 — {warn.join(" · ")}(으)로 보이는 내용이 있습니다.
                      기수가 함께 보는 판이라 수강생 개인정보는 적지 않습니다.
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => save(weekNo)}
                      className="rounded-md bg-zion-800 px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-zion-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded-md border border-zion-200 px-2.5 py-1 text-[11.5px] font-semibold text-zion-700 transition hover:bg-zion-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  {empty ? (
                    <div className="py-1 text-[11.5px] text-ink-soft">
                      적힌 내용이 없습니다{canEdit ? " — 연필을 눌러 적습니다" : ""}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {OPS_FIELD_LABELS.map((f) =>
                        row[f.key] ? (
                          <div key={f.key} className="flex gap-1.5 text-[11.5px] leading-snug">
                            <span className="w-[64px] shrink-0 text-[10px] font-semibold text-ink-soft">
                              {f.label}
                            </span>
                            <span
                              className={
                                "min-w-0 flex-1 " +
                                (f.key === "spiritGoal"
                                  ? "font-semibold text-emerald-700"
                                  : f.key === "keyAction"
                                    ? "font-medium text-ink"
                                    : "text-ink")
                              }
                            >
                              {row[f.key]}
                            </span>
                          </div>
                        ) : null,
                      )}
                    </div>
                  )}
                </div>
              )}

              {canEdit && !isEditing && (
                <button
                  onClick={() => startEdit(weekNo)}
                  aria-label={`개강 ${weekNo}주 내용 고치기`}
                  className="h-fit shrink-0 rounded-md p-1 text-zion-600 transition hover:bg-zion-200"
                >
                  <PencilLine size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── 운영 분석 (하단 판) ──────────────────────────────────────────── */

/** 칸별 색 — 검증된 조합만 (KIND_TONE·상태색과 같은 계열. index.css 다크 팔레트가 뒤집는다) */
const NOTE_TONE: Record<OpsNoteField, { border: string; title: string; dot: string }> = {
  checkpoint: { border: "border-zion-300", title: "text-zion-800", dot: "bg-zion-600" },
  priority: { border: "border-gold-500/50", title: "text-gold-700", dot: "bg-gold-500" },
  risk: { border: "border-red-200", title: "text-red-600", dot: "bg-red-600" },
  memo: { border: "border-zion-200", title: "text-ink", dot: "bg-zion-400" },
};

function OpsNoteCard({
  cohortKey,
  field,
  canEdit,
  numbered = false,
  footer,
}: {
  cohortKey: string;
  field: OpsNoteField;
  canEdit: boolean;
  /** 우선순위처럼 차례가 뜻을 갖는 칸은 점 대신 번호를 단다 */
  numbered?: boolean;
  footer?: ReactNode;
}) {
  const session = useSession();
  const { opsNotes, setOpsNote } = useStore();
  const saved = opsNotes.find((n) => n.cohortKey === cohortKey && n.field === field);
  const lines = saved ? saved.lines : cohortKey === COHORT_KEY ? OPS_NOTE_SEED[field] : [];
  const tone = NOTE_TONE[field];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [warn, setWarn] = useState<string[]>([]);

  function save() {
    const next = draft
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    const hits = scanPII(next.join("\n"));
    if (hits.length > 0) {
      setWarn(hits);
      return;
    }
    setOpsNote({
      cohortKey,
      field,
      lines: next,
      updatedBy: session.name,
      updatedByRole: session.roleCode,
    });
    setEditing(false);
  }

  return (
    <section className={"rounded-card border bg-white p-4 shadow-sm " + tone.border}>
      <div className="mb-2 flex items-center justify-between gap-1">
        <h3 className={"text-[12.5px] font-bold " + tone.title}>{OPS_NOTE_LABELS[field]}</h3>
        {canEdit &&
          (editing ? (
            <button
              onClick={() => setEditing(false)}
              aria-label="고치기 닫기"
              className="rounded-md p-1 text-ink-soft transition hover:bg-zion-200"
            >
              <X size={12} />
            </button>
          ) : (
            <button
              onClick={() => {
                setDraft(lines.join("\n"));
                setWarn([]);
                setEditing(true);
              }}
              aria-label={`${OPS_NOTE_LABELS[field]} 고치기`}
              className="rounded-md p-1 text-ink-soft transition hover:bg-zion-200"
            >
              <PencilLine size={12} />
            </button>
          ))}
      </div>

      {editing ? (
        <div className="space-y-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border border-zion-200 bg-white px-2 py-1.5 text-[12px] leading-relaxed outline-none focus:border-zion-500"
          />
          <p className="text-[10.5px] text-ink-soft">한 줄에 하나씩 적습니다.</p>
          {warn.length > 0 && (
            <p className="text-[11px] font-semibold text-red-600">
              저장할 수 없습니다 — {warn.join(" · ")}(으)로 보이는 내용이 있습니다.
            </p>
          )}
          <button
            onClick={save}
            className="rounded-md bg-zion-800 px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-zion-700"
          >
            저장
          </button>
        </div>
      ) : lines.length === 0 ? (
        <p className="text-[11.5px] text-ink-soft">
          적힌 내용이 없습니다{canEdit ? " — 연필을 눌러 적습니다" : ""}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug text-ink">
              {numbered ? (
                <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-100 text-[9.5px] font-bold text-gold-700">
                  {i + 1}
                </span>
              ) : (
                <span className={"mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full " + tone.dot} />
              )}
              <span className="min-w-0 flex-1">{line}</span>
            </li>
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}

/** 지표 한 칸 — 숫자·목표·막대를 함께 낸다 (색에만 기대지 않는다) */
function KpiBlock({
  label,
  value,
  target,
  note,
}: {
  label: string;
  value: number | null;
  target: number;
  note: string;
}) {
  const achieved = value != null && value >= target;
  return (
    <div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11.5px] font-semibold text-ink">{label}</span>
        {value == null ? (
          <span className="rounded bg-zion-100 px-1.5 py-0.5 text-[9.5px] font-bold text-zion-700">
            계산 안 함
          </span>
        ) : achieved ? (
          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700">
            달성
          </span>
        ) : (
          <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9.5px] font-bold text-red-600">
            미달
          </span>
        )}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold leading-none text-zion-900">
          {value != null ? `${value}%` : "—"}
        </span>
        <span className="text-[10.5px] text-ink-soft">목표 {target}% 이상</span>
      </div>
      {value != null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zion-100">
          <div
            className="h-full rounded-full bg-zion-700"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
      )}
      <p className="mt-1 text-[10px] leading-snug text-ink-soft">{note}</p>
    </div>
  );
}

export function OpsAnalysisBoard({
  cohortKey,
  canEdit,
  startsOn,
  endsOn,
}: {
  cohortKey: string;
  canEdit: boolean;
  startsOn: string;
  endsOn: string;
}) {
  const { planEntries, studentFeedback, weekOpsRows } = useStore();
  const today = todayYmd();

  /* 이번 주의 핵심 활동 — 위 주차 판과 같은 값을 읽는다 (판을 고치면 여기도 따라온다) */
  const totalWeeks = Math.max(1, weekNoOf(startsOn, endsOn));
  const currentWeekNo =
    today >= startsOn && today <= endsOn ? Math.min(totalWeeks, weekNoOf(startsOn, today)) : null;
  const savedRows = new Map<number, WeekOpsSeed>(
    weekOpsRows
      .filter((r) => r.cohortKey === cohortKey)
      .map((r): [number, WeekOpsSeed] => [r.weekNo, r]),
  );
  const currentKeyAction =
    currentWeekNo != null ? weekOpsRowOf(savedRows, cohortKey, currentWeekNo).keyAction : "";
  /* 출결·상담 기록은 시범 기수(113기) 것뿐이다 — 다른 기수는 계산하지 않는다 (지어내지 않는다) */
  const isMockCohort = cohortKey === COHORT_KEY;

  /*
   * 보강 달성률 — 최근 8주 출결 부호의 추후완료(D)·금주보강(M)에, 출석 격자에서 담당자가
   * 남긴 보강 기록(계획/완료)을 더해 완료 비율을 낸다. ⚠️ 출결 원본은 읽기만 한다(불변식 3).
   * 부호와 기록이 같은 결석을 가리킬 수 있어 셈이 겹칠 수 있다 — 시범 한계로 두고,
   * 실연동 시 출결 시트가 정본이 되면 이 함수만 갈아 끼운다(교체 경계).
   */
  let makeupRate: number | null = null;
  let makeupNote = "이 기수의 출결 기록이 없어 계산하지 않습니다.";
  if (isMockCohort) {
    let done = 0;
    let pending = 0;
    for (const st of STUDENTS)
      for (const w of st.recentWeeks) {
        if (w.mark === "makeupDone") done++;
        else if (w.mark === "makeupPending") pending++;
      }
    for (const f of studentFeedback) {
      if (f.kind !== "makeup" || !f.makeupState) continue;
      if (f.makeupState === "done") done++;
      else pending++;
    }
    const total = done + pending;
    makeupRate = total > 0 ? Math.round((done / total) * 100) : null;
    makeupNote =
      total > 0
        ? `최근 8주 출결의 보강 ${total}건 중 완료 ${done}건 (격자에서 남긴 보강 기록 포함)`
        : "최근 8주에 보강이 잡힌 기록이 없습니다.";
  }

  /*
   * 상담 이행률 — 달력의 상담·심방 계획(오늘까지) 대비, 수강생 상세에 남은 상담 메모 수.
   * 계획과 메모를 한 건씩 짝짓는 것이 아니라 **건수 비율**이다 — 시범 한계로 적어 둔다.
   */
  const plannedCounsel = planEntries.filter(
    (e) => e.cohortKey === cohortKey && (e.kind === "counsel" || e.kind === "visit") && e.date <= today,
  ).length;
  let counselDone = 0;
  if (isMockCohort) {
    for (const st of STUDENTS) {
      const p = STUDENT_PROFILES[st.key];
      if (p) counselDone += p.feedback.filter((f) => f.kind === "counsel" && f.date <= today).length;
    }
    counselDone += studentFeedback.filter((f) => f.kind === "counsel" && f.date <= today).length;
  }
  const counselRate =
    plannedCounsel > 0 ? Math.min(100, Math.round((counselDone / plannedCounsel) * 100)) : null;
  const counselNote = !isMockCohort
    ? "이 기수의 상담 기록이 없어 계산하지 않습니다."
    : plannedCounsel > 0
      ? `달력의 상담·심방 계획 ${plannedCounsel}건 대비 상담 메모 ${counselDone}건`
      : `달력에 지난 상담·심방 계획이 없어 계산하지 않습니다 (상담 메모 ${counselDone}건)`;

  /* 출결 신호 집계 — 이름 없이 명수만 낸다. 판정이 아니라 관찰 집계다(불변식 4) */
  let signalLine: string | null = null;
  if (isMockCohort) {
    const sigs = readAll(STUDENTS);
    const cnt = (code: string) => sigs.filter((s) => s.signals.some((g) => g.code === code)).length;
    const parts = [
      ["최근 결석", cnt("consecutive_absence")],
      ["장기 결석", cnt("long_absence")],
      ["보강 미이행", cnt("makeup_pending")],
      ["출결 미입력", cnt("unrecorded")],
    ].filter(([, n]) => (n as number) > 0);
    if (parts.length > 0) signalLine = parts.map(([k, n]) => `${k} ${n}명`).join(" · ");
  }

  return (
    <div className="mt-5">
      <h2 className="text-[15px] font-bold text-ink">운영 분석</h2>
      <p className="mb-3 mt-0.5 text-[11.5px] text-ink-soft">
        성과 지표는 출결 부호·보강 기록·상담 계획에서 계산합니다. 나머지 칸은 담당
        강사·전도사가 적고, 미리 채워진 내용은 시범 값입니다.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <OpsNoteCard
          cohortKey={cohortKey}
          field="checkpoint"
          canEdit={canEdit}
          footer={
            currentWeekNo != null ? (
              <div className="mt-2 border-t border-zion-100 pt-2 text-[11px] leading-snug text-ink">
                <span className="font-semibold text-zion-700">
                  이번 주(개강 {currentWeekNo}주) 핵심 활동
                </span>{" "}
                — {currentKeyAction || "적힌 내용이 없습니다. 주차별 진행 현황에서 적습니다."}
              </div>
            ) : undefined
          }
        />
        <OpsNoteCard cohortKey={cohortKey} field="priority" canEdit={canEdit} numbered />
        <OpsNoteCard
          cohortKey={cohortKey}
          field="risk"
          canEdit={canEdit}
          footer={
            signalLine ? (
              <div className="mt-2 border-t border-zion-100 pt-2 text-[11px] leading-snug text-ink">
                <span className="font-semibold text-red-600">출결 신호 집계</span> — {signalLine}
                <span className="text-ink-soft"> (명수만 셉니다. 명단은 수강생 현황에서)</span>
              </div>
            ) : undefined
          }
        />
        <section className="rounded-card border border-emerald-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-[12.5px] font-bold text-emerald-700">성과 지표</h3>
          <div className="space-y-3">
            <KpiBlock label="보강 달성률" value={makeupRate} target={KPI_TARGETS.makeup} note={makeupNote} />
            <KpiBlock label="상담 이행률" value={counselRate} target={KPI_TARGETS.counsel} note={counselNote} />
          </div>
        </section>
        <OpsNoteCard cohortKey={cohortKey} field="memo" canEdit={canEdit} />
      </div>
    </div>
  );
}
