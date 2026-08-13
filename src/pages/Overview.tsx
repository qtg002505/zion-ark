import { useMemo, useRef, useState } from "react";
import { Link } from "../components/TransitionLink";
import { CalendarDays, Megaphone, PencilLine } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canEditCohortRecord, cohortKeyOf, isFieldStaff, studentScopeLabel } from "../lib/permissions";
import { STUDENTS, COHORT, DIVISIONS, SCHEDULE } from "../content/cohort-mock";
import {
  effectiveSchedule,
  newcomerEndOf,
  progressPct,
  scheduleSummary,
} from "../lib/cohort-calendar";
import { readAll } from "../lib/attendance-signals";
import {
  GRADES,
  GRADE_LABELS,
  GRADE_RANGE,
  GRADE_TONE,
  effectiveGrade,
  isOverridden,
} from "../lib/student-grade";
import { STUDENT_PROFILES } from "../content/student-profiles";
import { newGroups } from "../lib/nav-badges";
import { visibleNavGroups, groupItems } from "../shell/nav";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { AnchoredPopover } from "../components/AnchoredPopover";
import { PageHeader, Card, StatTile } from "./common";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 전체 현황 — **점검자용 요약 화면이자 메인 페이지** (2026-08-06 회의 확정 · 2026-08-13 개편).
 *
 * 관리직(신학부장 이상)은 담당 기수가 없어 하위 조직 전체를 훑는 자리다. 그래서 여기서는
 * 수치 요약과 일정, 지금 손이 필요한 곳만 짚고 끝낸다.
 * 출석률 분포와 대면 시간대 같은 **상세 분석은 기수현황으로 옮겼다** — 한 기수를 파고드는
 * 도구여서 전국·지파 단위 요약 화면에는 맞지 않는다.
 *
 * 2026-08-13 리드 지시로 바뀐 것:
 * - 마크(로고)를 누르면 이리로 온다 — 메인 노릇을 하므로 **카테고리 타일**을 놓았다
 * - 요약 네모는 **전부 남색**으로 통일하고 「기수 진행률」을 더했다
 * - 기수 일정의 개강일·종강 예정일을 **화면에서 고친다** (담당 기수의 강사·전도사만)
 * - 등급별 명단을 **등급(세로)×분반(가로) 교차표**로 바꿨다 — 이름을 누르면 상세 팝업
 */
export function Overview() {
  const session = useSession();
  const store = useStore();
  const { entries, studentStatusOverrides, scheduleOverrides, setSchedule } = store;

  const students = STUDENTS;
  const total = students.length;
  const activeCount = students.filter((s) => s.status === "active").length;
  const riskCount = total - activeCount;
  const cumRate =
    total === 0 ? 0 : Math.round(students.reduce((a, s) => a + s.attendanceRate, 0) / total);

  // 누적은 아직 높은데 최근이 흔들리는 사람 — 점검자가 가장 먼저 알아야 할 수치
  const earlyCount = readAll(students).filter((r) => r.isEarly).length;

  const pinned = entries.filter((e) => e.kind === "notice_hq" && e.pinned).slice(0, 2);

  /** 화면에서 고친 일정이 있으면 그 값 — 진행률·요약·달력이 전부 이걸 본다 */
  const cohortKey = `${COHORT.tribe}|${COHORT.church}|${COHORT.cohort}`;
  const sched = effectiveSchedule(SCHEDULE, scheduleOverrides, cohortKey);
  const summary = scheduleSummary(sched.startsOn, sched.endsOn);
  const progress = progressPct(sched.startsOn, sched.endsOn, todayYmd());
  const canEditSchedule = canEditCohortRecord(session, cohortKeyOf(session)) && cohortKeyOf(session) === cohortKey;
  const schedNote = scheduleOverrides.find((o) => o.cohortKey === cohortKey);

  /** 일정 편집 팝오버 — 어느 칸을 눌렀는지 */
  const [editField, setEditField] = useState<"startsOn" | "endsOn" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const anchorRef = useRef<Record<string, HTMLButtonElement | null>>({});

  /** 교차표에서 이름을 누르면 상세 팝업 (수강생 현황과 같은 방식) */
  const [modalKey, setModalKey] = useState<string | null>(null);

  /**
   * 명단 한 줄 — 등급·오픈 여부를 한 자리에 모은다 (2026-08-10 리드 지시).
   * **등급은 사람이 바꾼 값이 먼저다.** 안 바꿨으면 출결로 자동 판정한다.
   * **오픈 여부**는 유월 축(오픈/비오픈)만 본다 — `신앙전환`은 유월로는 이미 오픈이다.
   */
  const roster = useMemo(() => {
    const byKey = new Map(studentStatusOverrides.map((o) => [o.studentKey, o]));
    return students.map((s) => {
      const ov = byKey.get(s.key);
      const profile = STUDENT_PROFILES[s.key];
      const faith = ov?.faithType ?? profile?.faithType ?? "비오픈";
      return {
        student: s,
        grade: effectiveGrade(s, ov?.grade),
        manual: isOverridden(s, ov?.grade),
        opened: faith !== "비오픈",
      };
    });
  }, [students, studentStatusOverrides]);

  const openedCount = roster.filter((r) => r.opened).length;
  const gradeCounts = GRADES.map((g) => ({ g, n: roster.filter((r) => r.grade === g).length }));

  /** 등급(세로) × 분반(가로) — 셀에 그 자리에 해당하는 이름들 (2026-08-13 리드 지시) */
  const matrix = useMemo(() => {
    const m = new Map<string, typeof roster>();
    for (const r of roster) {
      const key = `${r.grade}|${r.student.division}`;
      m.set(key, [...(m.get(key) ?? []), r]);
    }
    return m;
  }, [roster]);

  /** 메인의 카테고리 타일 — `nav.ts`가 정본이라 여기서 다시 적지 않고 파생한다 */
  const categories = useMemo(
    () => visibleNavGroups(session).filter((g) => g.to !== "/overview"),
    [session],
  );
  const fresh = useMemo(
    () =>
      newGroups({
        materials: store.materials,
        entries: store.entries,
        counselingTips: store.counselingTips,
        counselCases: store.counselCases,
        lessonNotes: store.lessonNotes,
        lessonResources: store.lessonResources,
        planEntries: store.planEntries,
      }),
    [
      store.materials,
      store.entries,
      store.counselingTips,
      store.counselCases,
      store.lessonNotes,
      store.lessonResources,
      store.planEntries,
    ],
  );

  function openEdit(field: "startsOn" | "endsOn") {
    setEditField(field);
    setEditValue(sched[field]);
    setEditError(null);
  }

  function saveEdit() {
    if (!editField || !editValue) return;
    const next = { ...sched, [editField]: editValue };
    if (next.endsOn <= next.startsOn) {
      setEditError("종강 예정일은 개강일보다 뒤여야 합니다.");
      return;
    }
    setSchedule(cohortKey, { [editField]: editValue }, session.name, session.roleCode);
    setEditField(null);
  }

  return (
    <div>
      <PageHeader
        crumb="홈"
        title="전체 현황"
        desc={`조회 범위: ${studentScopeLabel(session)} — 서버가 담당 배정(memberships)으로 스코프한 범위만 표시됩니다.`}
      />

      {pinned.length > 0 && (
        <div className="mb-5 space-y-2">
          {pinned.map((n) => (
            <Link
              viewTransition
              key={n.id}
              to="/notices"
              className="flex items-center gap-3 rounded-card border border-zion-200 bg-zion-50 px-4 py-3 transition hover:border-zion-400"
            >
              <Megaphone size={16} className="shrink-0 text-zion-700" />
              <span className="min-w-0 flex-1 text-[13px] font-semibold text-zion-900">{n.title}</span>
              <span className="shrink-0 text-[11px] text-zion-700">총회 공지 · 고정</span>
            </Link>
          ))}
        </div>
      )}

      {/* 요약 네모 — 전부 남색으로 통일 + 진행률 추가 (2026-08-13 리드 지시) */}
      <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-3 max-md:grid-cols-2">
        <StatTile label="수강생" value={`${total}명`} sub={COHORT.cohort} accent />
        <StatTile label="누적 출석률" value={`${cumRate}%`} sub={`${summary.months}개월 과정 기준`} accent />
        <StatTile label="수강 유지" value={`${activeCount}명`} sub="정상 출석 그룹" accent />
        <StatTile label="위기·중단" value={`${riskCount}명`} sub="출석률 50% 미만" accent />
        <StatTile label="기수 진행률" value={`${progress}%`} sub="개강일부터 오늘까지 기간 기준" accent />
      </div>

      {/* 메인 카테고리 — 마크를 누르면 오는 화면이라, 어디로 갈지 한눈에 보이게 */}
      <Card className="mt-5">
        <h2 className="mb-3 text-[14px] font-bold text-zion-900">카테고리</h2>
        <div className="grid grid-cols-3 gap-2 max-md:grid-cols-2">
          {categories.map((g) => {
            const Icon = g.icon;
            const items = groupItems(g);
            const to = g.to ?? items[0]?.to ?? "/overview";
            return (
              <Link
                viewTransition
                key={g.label}
                to={to}
                className="flex items-center gap-2.5 rounded-xl border border-zion-100 bg-white p-3 transition hover:border-zion-300 hover:bg-zion-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zion-50 text-zion-600">
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-ink">{g.label}</span>
                  <span className="block text-[11px] text-ink-soft">
                    {g.to ? "바로 가기" : `${items.length}개 항목`}
                  </span>
                </span>
                {fresh.has(g.label) && (
                  <span
                    className="shrink-0 rounded bg-gold-500 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-zion-950"
                    title="최근 24시간 안에 새 자료가 올라왔습니다"
                  >
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </Card>

      {/* 일정 — 점검자가 기수 진행 상황을 가늠하는 기준 (8/6 확정 · 8/13 편집 가능) */}
      <Card className="mt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CalendarDays size={16} className="text-zion-600" />
          <h2 className="text-[14px] font-bold text-zion-900">기수 일정</h2>
          <span className="text-[12px] text-ink-soft">
            {COHORT.tribe} 지파 · {COHORT.church} · {COHORT.cohort}
          </span>
          {/* 총 기간 요약 — 몇 개월·몇 주·수업 몇 회인지 (2026-08-13 리드 지시) */}
          <span className="ml-auto rounded-lg bg-zion-100 px-2.5 py-1 text-[12px] font-semibold text-zion-800">
            총 {summary.months}개월 · {summary.weeks}주 · 수업 {summary.sessions}회
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
          {(
            [
              ["startsOn", "개강일", sched.startsOn, true],
              ["endsOn", "종강 예정일", sched.endsOn, true],
              /* 명칭 통일 (2026-08-13 리드 지시) — 값은 저장하지 않고 종강 + 2주로 파생한다 */
              ["newcomer", "새신자교육 종강 예정일", newcomerEndOf(sched.endsOn), false],
            ] as const
          ).map(([field, label, date, editable]) => (
            <div key={field} className="rounded-lg bg-zion-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-1">
                <div className="text-[12px] text-ink-soft">{label}</div>
                {editable && canEditSchedule && (
                  <button
                    ref={(el) => {
                      anchorRef.current[field] = el;
                    }}
                    onClick={() => openEdit(field as "startsOn" | "endsOn")}
                    aria-label={`${label} 고치기`}
                    title={`${label} 고치기`}
                    className="rounded p-1 text-ink-soft transition hover:bg-white hover:text-zion-700"
                  >
                    <PencilLine size={13} />
                  </button>
                )}
              </div>
              <div className="mt-0.5 text-[15px] font-bold text-zion-900">{date}</div>
              {field === "newcomer" && (
                <div className="mt-0.5 text-[10px] text-ink-soft">종강 예정일 + 2주 자동</div>
              )}
            </div>
          ))}
        </div>
        {schedNote && (
          <p className="mt-2 text-[11px] text-ink-soft">
            일정 수정: {schedNote.updatedBy} · {schedNote.updatedAt.slice(0, 10)}
          </p>
        )}
        {!canEditSchedule && (
          <p className="mt-2 text-[11px] text-ink-soft">
            일정은 해당 기수의 강사·전도사가 고칩니다.
          </p>
        )}

        {editField && (
          <AnchoredPopover
            anchor={anchorRef.current[editField]}
            width={280}
            label="기수 일정 고치기"
            onClose={() => setEditField(null)}
          >
            <div className="p-3">
              <label className="mb-1 block text-[12px] font-semibold text-ink">
                {editField === "startsOn" ? "개강일" : "종강 예정일"}
              </label>
              <input
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              />
              {editField === "endsOn" && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
                  새신자교육 종강 예정일은 이 날짜 + 2주로 따라 움직입니다.
                </p>
              )}
              {editError && <p className="mt-1.5 text-[12px] text-red-600">{editError}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setEditField(null)}
                  className="rounded-lg px-3 py-1.5 text-[12px] text-ink-soft hover:bg-zion-50"
                >
                  취소
                </button>
                <button
                  onClick={saveEdit}
                  className="rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-zion-700"
                >
                  저장
                </button>
              </div>
            </div>
          </AnchoredPopover>
        )}
      </Card>

      {/* 등급 × 분반 교차표 (2026-08-13 리드 지시 — 종전 세로 명단을 교체) */}
      <Card className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-bold text-zion-900">등급별 명단</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              세로가 등급, 가로가 분반입니다. <strong className="text-ink">이름을 누르면</strong> 상세
              현황이 열립니다. <strong className="text-ink">노란 이름이 오픈된 분</strong>입니다 — 모두{" "}
              {openedCount}명. 등급은 누적 출석률로 자동 매겨지고, 담당 사명자가 바꾸면 그 값이
              우선합니다(이름 뒤 *).
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {gradeCounts.map(({ g, n }) => (
              <span
                key={g}
                className={"rounded-lg border px-2 py-1 text-[11px] font-bold " + GRADE_TONE[g]}
                title={`${GRADE_LABELS[g]} — 자동 기준 ${GRADE_RANGE[g]}`}
              >
                {g} {GRADE_LABELS[g]} {n}
              </span>
            ))}
          </div>
        </div>

        {/* 좁은 화면에서는 표만 가로로 넘긴다 */}
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-zion-100 text-left text-[12px] text-ink-soft">
                <th className="w-24 pb-2 font-medium">등급</th>
                {DIVISIONS.map((d) => (
                  <th key={d} className="pb-2 font-medium">
                    {d}
                  </th>
                ))}
                <th className="w-12 pb-2 text-right font-medium">계</th>
              </tr>
            </thead>
            <tbody>
              {GRADES.map((g) => {
                const rowTotal = gradeCounts.find((c) => c.g === g)?.n ?? 0;
                return (
                  <tr key={g} className="border-b border-zion-100 align-top last:border-0">
                    <td className="py-2 pr-2">
                      <span className={"rounded border px-1.5 py-0.5 text-[11px] font-bold " + GRADE_TONE[g]}>
                        {g} {GRADE_LABELS[g]}
                      </span>
                    </td>
                    {DIVISIONS.map((d) => {
                      const cell = matrix.get(`${g}|${d}`) ?? [];
                      return (
                        <td key={d} className="py-2 pr-2">
                          {cell.length === 0 ? (
                            <span className="text-[11px] text-ink-soft">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {cell.map((r) => (
                                <button
                                  key={r.student.key}
                                  onClick={() => setModalKey(r.student.key)}
                                  title={
                                    `${r.student.name} — 누적 ${r.student.attendanceRate}%` +
                                    (r.opened ? " · 오픈" : "") +
                                    (r.manual ? " · 직접 지정 등급" : "")
                                  }
                                  className={
                                    "rounded px-1.5 py-0.5 text-[12px] font-medium transition " +
                                    (r.opened
                                      ? "bg-gold-100/70 text-gold-700 hover:bg-gold-100"
                                      : "text-ink hover:bg-zion-50 hover:text-zion-700")
                                  }
                                >
                                  {r.student.name}
                                  {r.manual && "*"}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 text-right text-[12px] font-semibold text-zion-800">{rowTotal}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-zion-200">
                <td className="py-2 pr-2 text-[12px] font-semibold text-ink-soft">계</td>
                {DIVISIONS.map((d) => (
                  <td key={d} className="py-2 pr-2 text-[12px] font-semibold text-zion-800">
                    {roster.filter((r) => r.student.division === d).length}명
                  </td>
                ))}
                <td className="py-2 text-right text-[12px] font-bold text-zion-900">{total}명</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
          출석률 등 상세 수치는 이름을 눌러 팝업에서 보거나{" "}
          <Link viewTransition to="/students-dashboard" className="text-zion-700 underline">
            수강생 현황
          </Link>
          에서 봅니다. 등급 변경도 그곳에서 합니다.
        </p>
      </Card>

      {/* 점검자가 지금 손대야 할 곳 */}
      <Card className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-zion-900">지금 볼 곳</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              누적 출석률은 아직 높은데 최근이 흔들리는 분이{" "}
              <strong className="text-zion-800">{earlyCount}명</strong> 있습니다. 이미 이탈한{" "}
              {riskCount}명보다 먼저 확인하시면 되돌릴 여지가 있습니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              viewTransition
              to="/cohort"
              className="rounded-lg border border-zion-200 bg-white px-4 py-2 text-center text-[13px] font-semibold text-zion-700 transition hover:bg-zion-50"
            >
              기수 현황
            </Link>
            <Link
              viewTransition
              to="/signals"
              className="rounded-lg bg-zion-800 px-4 py-2 text-center text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              관찰 필요 보기
            </Link>
          </div>
        </div>
      </Card>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        출석률 분포와 대면 시간대 등 상세 분석은 <Link viewTransition to="/cohort" className="text-zion-700 underline">기수 현황</Link>에
        있습니다.
        {!isFieldStaff(session) &&
          " 담당 기수가 없는 관리직 계정은 이 요약 화면으로 들어옵니다."}
      </p>

      {modalKey && <StudentDetailModal studentKey={modalKey} onClose={() => setModalKey(null)} />}
    </div>
  );
}
