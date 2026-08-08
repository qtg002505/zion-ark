import { useMemo, useState } from "react";
import { PencilLine } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { ROLE_LABELS } from "../lib/types";
import {
  canEditCohortRecord,
  cohortKeyOf,
  studentScopeLabel,
  visibleDivisions,
} from "../lib/permissions";
import {
  STUDENTS,
  DIVISIONS,
  COHORT,
  TOTAL_SESSIONS,
  WEEKLY_RATES,
  COHORT_RANKS,
  type WeeklyRate,
} from "../content/cohort-mock";
import { PageHeader, Card, StatTile, StatusBadge } from "./common";

type Tab = "summary" | "attendance" | "trend" | "compare" | "divisions";

/**
 * 기수 현황 — 한 기수를 파고드는 자리.
 *
 * 2026-08-06 회의에서 **출석률 분포와 대면 시간대를 전체현황에서 이리로 옮기기로** 했다.
 * 전체현황은 점검자용 요약이고, 상세 분석은 기수 단위에서 보는 것이 맞기 때문이다.
 * 여기에 주간 비교 흐름과 기수 간 비교를 더했다.
 */
export function CohortStatus() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("summary");

  const divisions = visibleDivisions(session, DIVISIONS);
  const students = STUDENTS.filter((s) => divisions.includes(s.division));

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "기수 요약" },
    { id: "attendance", label: "출석 현황" },
    { id: "trend", label: "주간 흐름" },
    { id: "compare", label: "기수 비교" },
    { id: "divisions", label: "분반별 현황" },
  ];

  // 출석률 10%p 구간 분포 — 전체현황에서 옮겨 온 것
  const buckets = useMemo(() => {
    const b = Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}–${i * 10 + 9}`,
      count: students.filter((s) => s.attendanceRate >= i * 10 && s.attendanceRate < i * 10 + 10).length,
    }));
    b[9].count += students.filter((s) => s.attendanceRate === 100).length;
    b[9].label = "90–100";
    return b;
  }, [students]);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  const cumRate =
    students.length === 0
      ? 0
      : Math.round(students.reduce((a, s) => a + s.attendanceRate, 0) / students.length);

  // 대면 시간대 — 저녁 비중은 보강 편성 신호다 (CLAUDE.md §12-2)
  const slot = students.reduce(
    (acc, s) => ({
      evening: acc.evening + s.slotCounts.evening,
      morning: acc.morning + s.slotCounts.morning,
      afternoon: acc.afternoon + s.slotCounts.afternoon,
    }),
    { evening: 0, morning: 0, afternoon: 0 },
  );
  const slotSum = slot.evening + slot.morning + slot.afternoon || 1;

  return (
    <div>
      <PageHeader
        crumb="기수 현황"
        title="기수 현황"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 진도 ${TOTAL_SESSIONS}회 · 조회 범위 ${studentScopeLabel(session)} (시범 목업 데이터)`}
      />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-zion-100 p-1" role="tablist" aria-label="기수 현황 탭">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition sm:px-4 " +
              (tab === t.id ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            <StatTile label="등록 수강생" value={`${students.length}명`} sub={`${divisions.length}개 분반`} accent />
            <StatTile
              label="수강 유지"
              value={`${students.filter((s) => s.status === "active").length}명`}
              sub="97% 이상 출석 그룹"
            />
            <StatTile
              label="위기·중단"
              value={`${students.filter((s) => s.status !== "active").length}명`}
              sub="50% 미만 — 보강·상담 대상"
            />
          </div>

          <div className="mt-5 grid grid-cols-5 gap-4 max-md:grid-cols-1">
            <Card className="col-span-3 max-md:col-span-1">
              <div className="mb-1 text-[14px] font-bold text-zion-900">출석률 분포</div>
              <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
                수강생이 상·하위 두 그룹으로 갈리고{" "}
                <strong className="text-zion-800">50~96% 구간이 비어 있습니다</strong>. 초반에 이탈하면
                돌아오지 않는 구조 — 평균({cumRate}%)만 보면 이 사실이 가려집니다.
              </p>
              <div className="flex items-end gap-1 sm:gap-1.5" role="img" aria-label="출석률 구간별 수강생 수 분포">
                {buckets.map((b) => (
                  <div key={b.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${b.label}% — ${b.count}명`}>
                    <span className="text-[11px] font-semibold text-zion-800">{b.count > 0 ? b.count : ""}</span>
                    <div
                      className="w-full rounded-t bg-zion-700 transition group-hover:bg-zion-500"
                      style={{ height: `${(b.count / maxBucket) * 120 + (b.count > 0 ? 4 : 1)}px` }}
                    />
                    <span className="text-[8px] leading-tight text-ink-soft sm:text-[9px]">{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right text-[11px] text-ink-soft">구간: 출석률(%) · 막대: 수강생 수</div>
            </Card>

            <Card className="col-span-2 max-md:col-span-1">
              <div className="mb-1 text-[14px] font-bold text-zion-900">대면 시간대</div>
              <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
                저녁 대면이 전체의{" "}
                <strong className="text-zion-800">{Math.round((slot.evening / slotSum) * 100)}%</strong> — 보강
                편성 시 저녁 시간대를 우선 검토할 신호입니다.
              </p>
              {(
                [
                  ["저녁(대면)", slot.evening],
                  ["오전(대면)", slot.morning],
                  ["오후(대면)", slot.afternoon],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="mb-2.5" title={`${label} ${v}회`}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-ink-soft">{label}</span>
                    <span className="font-semibold text-zion-800">
                      {v}회 · {Math.round((v / slotSum) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zion-100">
                    <div className="h-full rounded-full bg-zion-700" style={{ width: `${(v / slotSum) * 100}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {tab === "attendance" && (
        <Card>
          {/* 좁은 화면에서는 표만 가로로 넘긴다 — 본문이 옆으로 밀리지 않게 */}
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-zion-100 text-left text-[12px] text-ink-soft">
                  <th className="pb-2 font-medium">이름</th>
                  <th className="pb-2 font-medium">분반</th>
                  <th className="pb-2 font-medium">출석</th>
                  <th className="pb-2 font-medium">출석률</th>
                  <th className="pb-2 font-medium">최근 출석</th>
                  <th className="pb-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {[...students]
                  .sort((a, b) => a.attendanceRate - b.attendanceRate)
                  .map((s) => (
                    <tr key={s.key} className="border-b border-zion-100 last:border-0">
                      <td className="py-2.5 font-medium text-ink">{s.name}</td>
                      <td className="py-2.5 text-ink-soft">{s.division}</td>
                      <td className="py-2.5 text-ink-soft">
                        {s.presentCount}/{s.totalSessions}회
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zion-100">
                            <div className="h-full rounded-full bg-zion-700" style={{ width: `${s.attendanceRate}%` }} />
                          </div>
                          <span className="font-semibold text-zion-800">{s.attendanceRate}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-ink-soft">{s.lastAttended ?? "—"}</td>
                      <td className="py-2.5">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-ink-soft">
            출결 원본은 읽기 전용 시트에서 동기화됩니다 — 이 화면에서 수정할 수 없고, 원본 수정 후 다음
            동기화를 기다립니다.
          </p>
        </Card>
      )}

      {tab === "trend" && <WeeklyTrend rows={WEEKLY_RATES} />}

      {tab === "compare" && <CohortCompare />}

      {tab === "divisions" && (
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {divisions.map((d) => {
            const group = students.filter((s) => s.division === d);
            const active = group.filter((s) => s.status === "active").length;
            return (
              <Card key={d}>
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-bold text-zion-900">{d}</div>
                  <div className="text-[12px] text-ink-soft">{group.length}명</div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {group.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-[13px]">
                      <span className="text-ink">{s.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-ink-soft">{s.attendanceRate}%</span>
                        <StatusBadge status={s.status} />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-zion-100 pt-2 text-[12px] text-ink-soft">
                  유지 {active} · 위기·중단 {group.length - active}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 주간 흐름 — 우리 기수의 주별 출석률과 지파 평균을 함께 본다.
 * 크게 떨어진 주는 **왜 그랬는지와 어떻게 넘겼는지**를 함께 보여 준다.
 * 그 설명은 자동 산출이 아니라 담당자가 적는 기록이다 —
 * **해당 기수의 강사·전도사만** 적고 고칠 수 있다 (2026-08-06 확정).
 */
function WeeklyTrend({ rows }: { rows: WeeklyRate[] }) {
  const session = useSession();
  const { weekNotes, saveWeekNote } = useStore();
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const max = 100;

  const cohortKey = cohortKeyOf(session);
  const canEdit = canEditCohortRecord(session, cohortKey);

  /** 사람이 적은 기록이 있으면 그것이 우선, 없으면 목업의 기본 설명 */
  const noteOf = (week: string) => weekNotes.find((n) => n.cohortKey === cohortKey && n.week === week);
  const merged = rows.map((r) => {
    const n = noteOf(r.week);
    return { ...r, reason: n ? n.reason : r.reason, overcome: n ? n.overcome : r.overcome, note: n };
  });
  const current = picked !== null ? merged[picked] : null;

  return (
    <Card>
      <div className="mb-1 text-[14px] font-bold text-zion-900">주간 출석률 흐름</div>
      <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
        막대는 우리 기수, 가로선은 같은 지파 최근 3개 기수 평균입니다. 사유가 적힌 주는 밑줄로
        표시되며, 누르면 그 주에 무슨 일이 있었는지 볼 수 있습니다.
      </p>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-[520px] items-end gap-2" role="img" aria-label="주간 출석률과 지파 평균 비교">
          {merged.map((r, i) => (
            <button
              key={r.week}
              onClick={() => setPicked(picked === i ? null : i)}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${r.week} — 우리 ${r.rate}% · 지파 평균 ${r.tribeAvg}%`}
            >
              <span className="text-[11px] font-semibold text-zion-800">{r.rate}</span>
              <div className="relative flex h-[150px] w-full items-end">
                <div
                  className={
                    "w-full rounded-t transition " +
                    (picked === i ? "bg-zion-800" : "bg-zion-600 group-hover:bg-zion-500")
                  }
                  style={{ height: `${(r.rate / max) * 150}px` }}
                />
                {/* 지파 평균 기준선 */}
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-gold-500"
                  style={{ bottom: `${(r.tribeAvg / max) * 150}px` }}
                  title={`지파 평균 ${r.tribeAvg}%`}
                />
              </div>
              <span
                className={
                  "text-[9px] leading-tight text-ink-soft " + (r.reason ? "underline decoration-dotted" : "")
                }
              >
                {r.week}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-zion-600" /> 우리 기수
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-gold-500" /> 지파 최근 3개 기수 평균
        </span>
      </div>

      {current && (
        <div className="mt-3 rounded-lg bg-zion-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] font-bold text-zion-900">
              {current.week} — 우리 {current.rate}% · 지파 평균 {current.tribeAvg}%
            </div>
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-lg border border-zion-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:bg-zion-50"
              >
                <PencilLine size={12} /> {current.reason ? "고치기" : "적기"}
              </button>
            )}
          </div>
          {current.reason ? (
            <>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
                <span className="font-semibold text-zion-700">사유</span> {current.reason}
              </p>
              {current.overcome && (
                <p className="mt-1 text-[13px] leading-relaxed text-ink">
                  <span className="font-semibold text-zion-700">극복</span> {current.overcome}
                </p>
              )}
              {current.note && (
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  {current.note.editedBy} ({ROLE_LABELS[current.note.editedByRole]}) ·{" "}
                  {current.note.editedAt.slice(0, 10)}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-[12px] text-ink-soft">
              이 주에 적힌 사유가 없습니다.
              {canEdit ? " 위 버튼으로 적어 주세요." : " 담당 강사·전도사가 적으면 표시됩니다."}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
        사유·극복 기록은 <strong className="text-ink">해당 기수의 강사·전도사</strong>가 적습니다.
        열람은 담당 범위 안에서 누구나 가능합니다.
      </p>

      {editing && current && canEdit && (
        <WeekNoteForm
          week={current.week}
          initial={{ reason: current.reason ?? "", overcome: current.overcome ?? "" }}
          onClose={() => setEditing(false)}
          onSubmit={({ reason, overcome }) => {
            saveWeekNote({
              cohortKey,
              week: current.week,
              reason,
              overcome,
              editedBy: session.name,
              editedByRole: session.roleCode,
              editedAt: new Date().toISOString(),
            });
            setEditing(false);
          }}
        />
      )}
    </Card>
  );
}

/** 주차 사유·극복 입력 — 수강생 개인을 짚는 내용은 적지 않는다 (불변식 2) */
function WeekNoteForm({
  week,
  initial,
  onClose,
  onSubmit,
}: {
  week: string;
  initial: { reason: string; overcome: string };
  onClose: () => void;
  onSubmit: (v: { reason: string; overcome: string }) => void;
}) {
  const [reason, setReason] = useState(initial.reason);
  const [overcome, setOvercome] = useState(initial.overcome);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError("사유를 다섯 글자 이상 적어 주세요.");
      return;
    }
    onSubmit({ reason: reason.trim(), overcome: overcome.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="주차 사유 기록">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-[16px] font-bold text-zion-900">{week} — 무슨 일이 있었나</h2>
        <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
          다음 기수가 같은 주에 참고합니다. 수강생 이름이나 개인 사정은 적지 않고, 기수 전체에서
          일어난 일만 적어 주세요.
        </p>

        <label className="mb-1 block text-[12px] font-semibold text-ink">사유</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="예) 지역 행사 일정과 겹쳐 저녁 대면 참석이 크게 줄었습니다."
          className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
        />

        <label className="mb-1 block text-[12px] font-semibold text-ink">극복 (선택)</label>
        <textarea
          value={overcome}
          onChange={(e) => setOvercome(e.target.value)}
          rows={3}
          placeholder="예) 다음 주에 오전 보강을 추가로 열어 결석분을 메웠습니다."
          className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
        />

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

/**
 * 기수 비교 — 지파 안과 12지파 전체를 나눠 본다.
 * ⚠️ 담당 범위 밖 지파는 **기수명과 출석률 집계까지만** 보여 준다 (불변식 2 — 집계·통계만 반출).
 */
function CohortCompare() {
  const session = useSession();
  const [scope, setScope] = useState<"tribe" | "all">("tribe");

  const rows = useMemo(() => {
    const list =
      scope === "tribe" ? COHORT_RANKS.filter((r) => r.tribe === COHORT.tribe) : COHORT_RANKS;
    return [...list].sort((a, b) => b.rate - a.rate);
  }, [scope]);

  // 관리직만 다른 지파까지 본다 — 실무직은 담당 기수가 속한 지파 안에서만 비교
  const canSeeAll = session.roleCode === "headquarters_admin" || session.roleCode === "content_admin";

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-bold text-zion-900">우수 기수 비교</div>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            출석률이 높은 기수부터 봅니다. 잘 되는 기수의 운영 방식을 참고하기 위한 자리입니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg bg-zion-100 p-1">
          {(
            [
              ["tribe", `${COHORT.tribe} 지파 내`],
              ["all", "12지파 전체"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setScope(id)}
              disabled={id === "all" && !canSeeAll}
              className={
                "rounded-md px-3 py-1.5 text-[12px] font-semibold transition " +
                (scope === id
                  ? "bg-white text-zion-900 shadow-sm"
                  : id === "all" && !canSeeAll
                    ? "cursor-not-allowed text-zion-300"
                    : "text-zion-600 hover:text-zion-800")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={`${r.tribe}-${r.church}-${r.cohort}`}
            className={
              "flex items-center gap-3 rounded-lg px-3 py-2 " +
              (r.isMine ? "bg-zion-50 ring-1 ring-zion-300" : "bg-white")
            }
          >
            <span className="w-5 shrink-0 text-[12px] font-bold text-ink-soft">{i + 1}</span>
            <span className="min-w-0 flex-1 text-[13px] text-ink">
              <span className="font-semibold">{r.cohort}</span>
              <span className="text-ink-soft">
                {" "}
                · {r.tribe} 지파 {r.church}
              </span>
              {r.isMine && <span className="ml-1.5 text-[11px] font-semibold text-zion-700">우리 기수</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-zion-100 sm:block">
                <span className="block h-full rounded-full bg-zion-700" style={{ width: `${r.rate}%` }} />
              </span>
              <span className="text-[13px] font-bold text-zion-800">{r.rate}%</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
        다른 지파는 <strong className="text-ink">기수명과 출석률 집계까지만</strong> 표시합니다 — 수강생
        개인정보는 담당 범위 밖으로 나가지 않습니다.
        {!canSeeAll && " 12지파 전체 비교는 총회 범위 계정에서 볼 수 있습니다."}
      </p>
    </Card>
  );
}
