import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  GraduationCap,
  HeartPulse,
  HeartHandshake,
  Info,
  Lock,
  Plus,
  TrendingUp,
  UserX,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canEditCohortRecord } from "../lib/permissions";
import { COHORT, COHORT_KEY, RUNNING_COHORT, STUDENTS, week4Attendees } from "../content/cohort-mock";
import { DIVISIONS, DIVISION_TONE, DIVISION_TONE_FALLBACK } from "../content/cohort-mock";
import { Portal } from "../components/Portal";
import {
  DIVISION_EVANGELISTS,
  STUDENT_PROFILES,
  type StudentStatusOverride,
} from "../content/student-profiles";
import {
  GRADES,
  GRADE_RANGE,
  GRADE_TONE,
  effectiveGrade,
  isOverridden,
  type Grade,
} from "../lib/student-grade";
import { AnchoredPopover } from "../components/AnchoredPopover";
/* 상태 묶음 정의는 한 곳(`content/student-states.ts`) — 상세의 체크 패널과 같은 목록을 읽는다 */
import { STATE_GROUPS } from "../content/student-states";
import { looseIncludes } from "../lib/text-match";
import { Card } from "./common";

/**
 * 수강생 분류 대시보드 (2026-08-22 리드 지시 — 운영 스프레드시트 「1페이지」와
 * 리드가 그린 시안을 화면으로 옮겼다).
 *
 * ## 무엇을 하는 파트인가
 *
 * - **등급별 분류표**(좌) — 등급(세로) × 담당자·분반(가로). 등급 칸에 명수·비율이 함께 있다
 * - **상태 묶음판**(우) — 병리적 우울·행함부담·이성교제자처럼 **현장 관찰 묶음**에
 *   이름을 놓아 여러 상태를 한눈에 본다 (한 사람이 여러 판에 들어갈 수 있다)
 * - **이름은 끌어서 옮긴다** — 분류표에서 다른 등급 행에 놓으면 수동 등급 지정(이름 뒤 *),
 *   다른 분반 열에 놓으면 분반 표시 변경, 상태판에 놓으면 그 묶음에 들어간다
 *
 * ## 지켜야 할 것
 *
 * - 끌어 옮긴 등급·분반은 **기존 수동 변경 기록**(`StudentStatusOverride`) 그대로다 —
 *   출결 원본은 안 건드린다(불변식 3). 편집은 해당 기수 강사·전도사만(`canEditCohortRecord`)
 * - 상태 묶음 이름은 리드 스프레드시트 **원문 그대로의 문자열**이다 — enum으로 굳히지
 *   않는다. 사람이 직접 놓는 기록이고(불변식 4) 담당 범위 밖으로 내보내지 않는다(불변식 2)
 * - ⚠️ **끌기는 마우스 전용이다**(HTML 드래그가 터치에서 안 돈다). 좁은 화면·터치는
 *   상태판의 「추가」 단추로 같은 일을 한다. 등급 변경은 수강생 현황에서도 종전대로 된다
 */


interface RosterRow {
  student: (typeof STUDENTS)[number];
  grade: Grade;
  division: string;
  manual: boolean;
  opened: boolean;
}

/** 출석으로 세는 표시 — 대면과 추후완료. 주간 출석률 산수가 쓴다 */
function attendedThatWeek(mark: string): boolean {
  return mark === "present" || mark === "makeupDone";
}

/**
 * 현 출석률의 분모 — **개강 4주차 출석자** (2026-08-22 리드 지시로 본출률·종강률 집계와
 * 기준을 통일했다). ⚠️ 기수 스코프 화면이라 `STUDENTS` 전역이 곧 이 기수 전원이다 —
 * 분반 필터와 무관하게 기수 단위로 센다. 대리 기준의 사유는 `week4Attendees` 주석.
 */
const RATE_BASE_STUDENTS = week4Attendees(STUDENTS);

/**
 * N주 전 주간 출석률(%) — 「현 출석률」 타일과 (i) 기준 팝업의 「지지난주 대비」가 쓴다.
 * 지난주 값(weeksAgo 1)이 곧 화면의 「현 출석률」이다 — 이번 주는 아직 다 안 지나 못 센다.
 */
function weekRate(weeksAgo: number): number | null {
  let attended = 0;
  let counted = 0;
  for (const s of RATE_BASE_STUDENTS) {
    for (const w of s.recentWeeks) {
      if (w.weeksAgo !== weeksAgo) continue;
      counted += 1;
      if (attendedThatWeek(w.mark)) attended += 1;
    }
  }
  return counted === 0 ? null : Math.round((attended / counted) * 100);
}

export function ClassifyDashboard({
  onOpenStudent,
  progress,
  currentWeekNo,
  currentLessonNode,
}: {
  onOpenStudent: (key: string) => void;
  progress: number;
  currentWeekNo: number;
  /** 현재 진도 표기 — 색 바탕 + 과수 제목 (학원법 규칙은 호출부가 지킨 조각을 넘긴다) */
  currentLessonNode: React.ReactNode;
}) {
  const session = useSession();
  const {
    studentStatusOverrides,
    setStudentStatus,
    studentStateMarks,
    addStudentStateMark,
    removeStudentStateMark,
  } = useStore();

  const canEdit = canEditCohortRecord(session, COHORT_KEY);

  /** 명단 한 줄 — 등급·분반은 사람이 바꾼 값이 먼저다 (기존 수동 변경 기록 그대로) */
  const roster: RosterRow[] = useMemo(() => {
    const byKey = new Map<string, StudentStatusOverride>(
      studentStatusOverrides.map((o) => [o.studentKey, o]),
    );
    return STUDENTS.map((s) => {
      const ov = byKey.get(s.key);
      const faith = ov?.faithType ?? STUDENT_PROFILES[s.key]?.faithType ?? "비오픈";
      return {
        student: s,
        grade: effectiveGrade(s, ov?.grade),
        division: ov?.division ?? s.division,
        manual: isOverridden(s, ov?.grade),
        opened: faith !== "비오픈",
      };
    });
  }, [studentStatusOverrides]);

  const total = roster.length;
  const byGrade = (g: Grade) => roster.filter((r) => r.grade === g);
  const gradeAB = byGrade("A").length + byGrade("B").length;
  const openedCount = roster.filter((r) => r.opened).length;

  const matrix = useMemo(() => {
    const m = new Map<string, RosterRow[]>();
    for (const r of roster) {
      const key = `${r.grade}|${r.division}`;
      m.set(key, [...(m.get(key) ?? []), r]);
    }
    return m;
  }, [roster]);

  const marks = useMemo(
    () => studentStateMarks.filter((m) => m.cohortKey === COHORT_KEY),
    [studentStateMarks],
  );
  const nameOf = (key: string) => STUDENTS.find((s) => s.key === key)?.name ?? null;

  /* ── 끌어서 옮기기 — 마우스 전용. 터치 경로는 상태판의 「추가」 단추다 ── */
  const [dragKey, setDragKey] = useState<string | null>(null);
  /** 지금 위에 떠 있는 드롭 자리 — 셀은 `등급|분반`, 상태판은 라벨 그대로 */
  const [overZone, setOverZone] = useState<string | null>(null);

  function onDragStart(e: DragEvent, key: string) {
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
    setDragKey(key);
  }
  function allowDrop(e: DragEvent, zone: string) {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverZone(zone);
  }
  function endDrag() {
    setDragKey(null);
    setOverZone(null);
  }
  /**
   * 분반이 바뀌는 이동은 **확인을 받은 뒤에** 적용한다 (2026-08-22 리드 지시 —
   * 「분반이 이동되는 게 맞습니까? 확인을 눌러서」). 등급만 바뀌는 이동은 바로 적용한다.
   */
  const [pendingMove, setPendingMove] = useState<{
    key: string;
    name: string;
    from: string;
    to: string;
    grade?: Grade;
  } | null>(null);

  function dropToCell(e: DragEvent, grade: Grade, division: string) {
    e.preventDefault();
    endDrag();
    if (!canEdit) return;
    const key = e.dataTransfer.getData("text/plain");
    const row = roster.find((r) => r.student.key === key);
    if (!row) return;
    const gradeChanged = row.grade !== grade;
    const divisionChanged = row.division !== division;
    if (!gradeChanged && !divisionChanged) return;
    if (divisionChanged) {
      setPendingMove({
        key,
        name: row.student.name,
        from: row.division,
        to: division,
        grade: gradeChanged ? grade : undefined,
      });
      return;
    }
    setStudentStatus(key, { grade }, session.name, session.roleCode);
  }

  function confirmPendingMove() {
    if (!pendingMove) return;
    const patch: { grade?: Grade; division: string } = { division: pendingMove.to };
    if (pendingMove.grade) patch.grade = pendingMove.grade;
    setStudentStatus(pendingMove.key, patch, session.name, session.roleCode);
    setPendingMove(null);
  }
  function dropToState(e: DragEvent, label: string) {
    e.preventDefault();
    endDrag();
    if (!canEdit) return;
    const key = e.dataTransfer.getData("text/plain");
    if (!roster.some((r) => r.student.key === key)) return;
    addStudentStateMark({
      cohortKey: COHORT_KEY,
      label,
      studentKey: key,
      createdBy: session.name,
      createdByRole: session.roleCode,
    });
  }

  /* ── (i) 기준 팝업 — 마우스를 올리면 열린다 (리드 지시) ── */
  const [infoOpen, setInfoOpen] = useState(false);
  const lastWeekRate = weekRate(1);
  const prevWeekRate = weekRate(2);
  const rateDelta =
    lastWeekRate !== null && prevWeekRate !== null ? lastWeekRate - prevWeekRate : null;

  /* ── 상태판 「추가」 팝오버 (터치·좁은 화면 경로) — 이름을 쳐서 걸러 넣는다 ── */
  const [addFor, setAddFor] = useState<string | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const addAnchors = useRef<Record<string, HTMLButtonElement | null>>({});

  /*
   * KPI 이름 둘 (2026-08-22 리드 지시):
   * - 「누적 출석률」 → **「현 출석률」** — 지난주 주간 출석률로 갈았다(누적은 옛 결석이
   *   계속 끌어내려 지금 상태를 못 보여 준다). 분모는 개강 4주차 출석자(`weekRate` 주석)
   * - 「기수 진행률」 → **「현진도」** — 지금 과수 제목(색 바탕)에 진행률 %를 병기한다
   */
  const kpis: { label: string; value: React.ReactNode; sub: string; icon: LucideIcon; tone: string }[] = [
    { label: "총등록", value: `${total}명`, sub: COHORT.cohort, icon: Users, tone: "bg-zion-100 text-zion-700" },
    { label: "수강 유지", value: `${gradeAB}명`, sub: "A·B 등급", icon: UsersRound, tone: "bg-emerald-50 text-emerald-600" },
    { label: "위기", value: `${byGrade("D").length}명`, sub: "D 등급", icon: HeartPulse, tone: "bg-gold-100 text-gold-700" },
    { label: "중단", value: `${byGrade("E").length}명`, sub: "E 등급", icon: UserX, tone: "bg-red-50 text-red-600" },
    {
      label: "현 출석률",
      value: lastWeekRate === null ? "—" : `${lastWeekRate}%`,
      sub: "지난주 기준",
      icon: TrendingUp,
      tone: "bg-zion-100 text-zion-700",
    },
    {
      label: "현진도",
      value: (
        <span className="inline-flex items-center gap-1">
          {currentLessonNode}
          <span>{progress}%</span>
        </span>
      ),
      sub: `${currentWeekNo}주차`,
      icon: GraduationCap,
      tone: "bg-gold-100 text-gold-700",
    },
  ];

  return (
    <Card className="mt-5">
      {/* 머리 — 시안의 제목·부제 + (i) 기준 안내 */}
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold text-zion-900">수강생 분류 대시보드</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            현황표를 한눈에 볼 수 있도록 재구성한 수강생 분류 현황입니다.
            {canEdit
              ? " 이름을 끌어 등급·분반·상태 묶음으로 옮길 수 있고, 이름을 누르면 상세가 열립니다."
              : " 이름을 누르면 상세가 열립니다. 이동은 해당 기수 강사·전도사만 합니다."}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            onMouseEnter={() => setInfoOpen(true)}
            onMouseLeave={() => setInfoOpen(false)}
            onClick={() => setInfoOpen((v) => !v)}
            aria-expanded={infoOpen}
            aria-label="이 수치들의 산출 기준 보기"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-zion-200 text-zion-700 transition hover:bg-zion-50"
          >
            <Info size={14} />
          </button>
          {infoOpen && (
            <div
              onMouseEnter={() => setInfoOpen(true)}
              onMouseLeave={() => setInfoOpen(false)}
              className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-zion-200 bg-white p-3 text-[12px] leading-relaxed shadow-lg"
            >
              <div className="mb-1 font-bold text-zion-900">산출 기준</div>
              <div className="space-y-1.5 text-ink">
                <p>
                  <span className="font-semibold text-zion-700">수강생 현황</span> — 등록 {total}명 ·
                  유지 {gradeAB}명 · 위기 {byGrade("D").length}명 · 중단 {byGrade("E").length}명
                </p>
                <p>
                  <span className="font-semibold text-zion-700">기수 일정</span> — 개강{" "}
                  {RUNNING_COHORT.startsOn} · 종강 예정 {RUNNING_COHORT.endsOn}. 일정과 수업 요일
                  수정은 기수 세팅에서 합니다.
                </p>
                <p>
                  <span className="font-semibold text-zion-700">현진도</span> — 진행률 {progress}% ·{" "}
                  {currentWeekNo}주차 · 현재 {currentLessonNode}
                </p>
                <p>
                  <span className="font-semibold text-zion-700">현 출석률</span> — 지난주{" "}
                  {lastWeekRate === null ? "집계 전" : `${lastWeekRate}%`}
                  {rateDelta !== null && (
                    <span className={rateDelta < 0 ? "text-red-600" : "text-emerald-600"}>
                      {" "}({rateDelta >= 0 ? "+" : ""}{rateDelta}%)
                    </span>
                  )}{" "}
                  — 지지난주 대비 등락. 분모는 개강 4주차에 출석 기록이 있는 수강생입니다
                  (등록 시점 자료가 붙기 전까지의 대리 기준)
                </p>
                <p>
                  <span className="font-semibold text-zion-700">등급별 인원</span> —{" "}
                  {GRADES.map((g) => `${g} ${byGrade(g).length}명`).join(" · ")}
                </p>
              </div>
              <p className="mt-2 border-t border-zion-100 pt-1.5 text-[11px] text-ink-soft">
                등급은 누적 출석률로 자동 매겨지고(기준 {GRADES.map((g) => `${g} ${GRADE_RANGE[g]}`).join(" · ")}),
                담당 사명자가 바꾸면 그 값이 우선합니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 머리 줄 — 담당·진도 카드 + KPI 타일 (시안 상단 줄) */}
      <div className="mb-4 grid grid-cols-4 gap-2 max-lg:grid-cols-2">
        <div className="col-span-1 rounded-xl border border-zion-100 bg-zion-50/60 px-3 py-2.5 max-lg:col-span-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zion-100 text-zion-700">
              <Users size={15} />
            </span>
            <div className="min-w-0 text-[11.5px] leading-relaxed text-ink">
              <p>
                <span className="font-semibold text-zion-700">강사</span>{" "}
                {RUNNING_COHORT.instructors.join(" · ")}
              </p>
              <p className="truncate">
                <span className="font-semibold text-zion-700">전도사</span>{" "}
                {RUNNING_COHORT.evangelists.join(", ")}
              </p>
              <p>
                <span className="font-semibold text-zion-700">진도</span> 개강{" "}
                {RUNNING_COHORT.startsOn.slice(5).replace("-", "/")} · 종강{" "}
                {RUNNING_COHORT.endsOn.slice(5).replace("-", "/")} · {currentLessonNode}
              </p>
            </div>
          </div>
        </div>
        <div className="col-span-3 grid grid-cols-6 gap-2 max-lg:col-span-2 max-lg:grid-cols-3 max-sm:grid-cols-2">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="rounded-xl border border-zion-100 bg-white px-2.5 py-2 text-center">
                <span className={"mx-auto flex h-7 w-7 items-center justify-center rounded-full " + k.tone}>
                  <Icon size={14} />
                </span>
                <div className="mt-1 text-[11px] text-ink-soft">{k.label}</div>
                <div className="text-[16px] font-bold leading-tight text-zion-900">{k.value}</div>
                <div className="text-[10px] text-ink-soft">{k.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {/* ── 좌: 등급별 분류표 ── */}
        <div className="col-span-2 max-lg:col-span-1">
          <div className="mb-2 flex items-center gap-1.5 text-[13.5px] font-bold text-zion-900">
            <UsersRound size={15} className="text-zion-600" /> 등급별 분류표
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr>
                  <th className="rounded-tl-lg border border-zion-100 bg-zion-50 px-2 py-1.5 text-left text-[11.5px] font-semibold text-ink-soft">
                    등급 / 현황
                  </th>
                  <th
                    colSpan={DIVISIONS.length}
                    className="rounded-tr-lg border border-l-0 border-zion-100 bg-zion-50 px-2 py-1.5 text-center text-[11.5px] font-semibold text-ink-soft"
                  >
                    담당자 / 분반
                  </th>
                </tr>
                <tr>
                  <th className="border border-t-0 border-zion-100 bg-zion-50/60 px-2 py-1" />
                  {DIVISIONS.map((d) => (
                    /* 열머리도 그 분반 색 — 칩과 같은 색이라 어느 열이 누구인지 곁눈에 잡힌다 */
                    <th
                      key={d}
                      className={
                        "border border-l-0 border-t-0 border-zion-100 px-2 py-1 text-center " +
                        (DIVISION_TONE[d] ?? DIVISION_TONE_FALLBACK)
                      }
                    >
                      <div className="text-[12px] font-bold">{DIVISION_EVANGELISTS[d] ?? d}</div>
                      <div className="text-[10px] font-normal opacity-80">{d}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRADES.map((g) => {
                  const n = byGrade(g).length;
                  const pct = total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
                  return (
                    <tr key={g}>
                      <td className={"border border-t-0 border-zion-100 px-2 py-2 align-top " + GRADE_TONE[g]}>
                        <div className="text-[15px] font-black leading-none">{g}</div>
                        <div className="mt-1 text-[10.5px] font-semibold">
                          {n}명 / {pct}%
                        </div>
                      </td>
                      {DIVISIONS.map((d) => {
                        const zone = `${g}|${d}`;
                        const cell = matrix.get(zone) ?? [];
                        return (
                          <td
                            key={d}
                            onDragOver={(e) => allowDrop(e, zone)}
                            onDragLeave={() => setOverZone((z) => (z === zone ? null : z))}
                            onDrop={(e) => dropToCell(e, g, d)}
                            className={
                              "border border-l-0 border-t-0 border-zion-100 px-1.5 py-1.5 align-top transition " +
                              (overZone === zone ? "bg-zion-100" : dragKey !== null ? "bg-zion-50/60" : "bg-white")
                            }
                          >
                            <div className="flex min-h-[30px] flex-wrap content-start gap-1">
                              {cell.map((r) => (
                                <button
                                  key={r.student.key}
                                  draggable={canEdit}
                                  onDragStart={(e) => onDragStart(e, r.student.key)}
                                  onDragEnd={endDrag}
                                  onClick={() => onOpenStudent(r.student.key)}
                                  title={
                                    `${r.student.name} — 누적 ${r.student.attendanceRate}%` +
                                    (r.opened ? " · 오픈" : "") +
                                    (r.manual ? " · 직접 지정 등급" : "") +
                                    (canEdit ? " · 끌어서 옮길 수 있습니다" : "")
                                  }
                                  className={
                                    /*
                                      칩 배경은 **분반 색**이다 (2026-08-22 리드 지시).
                                      오픈 표기는 배경 대신 이름 옆 금색 점으로 옮겼다 —
                                      두 뜻이 한 배경을 다투지 않게.
                                    */
                                    "rounded-md border px-1.5 py-0.5 text-[12px] font-medium transition hover:brightness-95 " +
                                    (canEdit ? "cursor-grab active:cursor-grabbing " : "") +
                                    (dragKey === r.student.key ? "opacity-40 " : "") +
                                    (DIVISION_TONE[r.division] ?? DIVISION_TONE_FALLBACK)
                                  }
                                >
                                  {r.student.name}
                                  {r.manual && "*"}
                                  {r.opened && (
                                    <span
                                      className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-gold-500 align-middle"
                                      title="오픈"
                                    />
                                  )}
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr>
                  <td className="rounded-bl-lg border border-t-0 border-zion-100 bg-zion-50 px-2 py-1.5 text-[12px] font-bold text-zion-900">
                    합계
                  </td>
                  {DIVISIONS.map((d, i) => (
                    <td
                      key={d}
                      className={
                        "border border-l-0 border-t-0 border-zion-100 bg-zion-50 px-2 py-1.5 text-center text-[12.5px] font-bold text-zion-800" +
                        (i === DIVISIONS.length - 1 ? " rounded-br-lg" : "")
                      }
                    >
                      {roster.filter((r) => r.division === d).length}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
            노란 이름이 오픈된 분입니다({openedCount}명). 이름 뒤 *는 담당자가 직접 지정한
            등급입니다. 분반을 옮겨도 출결 원본은 바뀌지 않고 화면 표시만 바뀝니다.
          </p>
        </div>

        {/* ── 우: 상태 묶음판 ── */}
        <div className="col-span-1">
          <div className="mb-2 flex items-center gap-1.5 text-[13.5px] font-bold text-zion-900">
            <HeartHandshake size={15} className="text-zion-600" /> 상태 묶음
          </div>
          <div className="grid grid-cols-2 gap-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {STATE_GROUPS.map((group) => {
              const Icon = group.icon;
              const inGroup = marks.filter((m) => m.label === group.label);
              const memberKeys = new Set(inGroup.map((m) => m.studentKey));
              return (
                <div
                  key={group.label}
                  onDragOver={(e) => allowDrop(e, group.label)}
                  onDragLeave={() => setOverZone((z) => (z === group.label ? null : z))}
                  onDrop={(e) => dropToState(e, group.label)}
                  className={
                    /* 드롭 하이라이트 — 분류표 셀과 같은 삼분기 (2026-08-22에 잘못 이어붙은
                       아이콘 컴포넌트를 걷어내고 복원했다) */
                    "rounded-xl border px-2.5 py-2 transition " +
                    (overZone === group.label
                      ? "border-zion-400 bg-zion-100"
                      : dragKey !== null
                        ? "border-zion-200 bg-zion-50/60"
                        : "border-zion-100 bg-white")
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <Icon size={13} className={"shrink-0 " + group.head} />
                    <span className={"min-w-0 flex-1 truncate text-[11.5px] font-bold " + group.head}>
                      {group.label}
                    </span>
                    {canEdit && (
                      /* 「기입」 경로 (2026-08-22 리드 지시) — 끌기 없이도 이름을 쳐서 넣는다 */
                      <button
                        ref={(el) => {
                          addAnchors.current[group.label] = el;
                        }}
                        onClick={() => {
                          setAddQuery("");
                          setAddFor(addFor === group.label ? null : group.label);
                        }}
                        aria-label={`${group.label} 묶음에 수강생 추가`}
                        className="flex shrink-0 items-center gap-0.5 rounded border border-zion-200 px-1 py-0.5 text-[10px] font-semibold text-zion-700 transition hover:bg-zion-100"
                      >
                        <Plus size={10} /> 추가
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 flex min-h-[22px] flex-wrap gap-1">
                    {inGroup.length === 0 ? (
                      <span className="text-[10.5px] text-ink-soft">—</span>
                    ) : (
                      /*
                        같은 분반끼리 뭉쳐 보인다 (2026-08-22 리드 지시) — 분반순으로 정렬하고
                        칩 색도 **그 수강생의 분반 색 그대로**다. 묶음 색은 판 머리가 맡는다.
                      */
                      [...inGroup]
                        .sort((a, b) => {
                          const da = roster.find((r) => r.student.key === a.studentKey)?.division ?? "";
                          const db = roster.find((r) => r.student.key === b.studentKey)?.division ?? "";
                          return (
                            da.localeCompare(db, "ko") ||
                            (nameOf(a.studentKey) ?? "").localeCompare(nameOf(b.studentKey) ?? "", "ko")
                          );
                        })
                        .map((m) => {
                        const name = nameOf(m.studentKey);
                        if (name === null) return null;
                        const division = roster.find((r) => r.student.key === m.studentKey)?.division;
                        return (
                          <span
                            key={m.id}
                            draggable={canEdit}
                            onDragStart={(e) => onDragStart(e, m.studentKey)}
                            onDragEnd={endDrag}
                            title={division}
                            className={
                              "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium " +
                              (canEdit ? "cursor-grab active:cursor-grabbing " : "") +
                              ((division && DIVISION_TONE[division]) ?? DIVISION_TONE_FALLBACK)
                            }
                          >
                            <button onClick={() => onOpenStudent(m.studentKey)} className="hover:underline">
                              {name}
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => removeStudentStateMark(m.id)}
                                aria-label={`${name}을(를) ${group.label} 묶음에서 빼기`}
                                className="rounded-sm p-0.5 opacity-60 transition hover:opacity-100"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </span>
                        );
                      })
                    )}
                  </div>
                  {addFor === group.label && (
                    <AnchoredPopover
                      anchor={addAnchors.current[group.label]}
                      width={220}
                      label={`${group.label} — 수강생 추가`}
                      onClose={() => setAddFor(null)}
                    >
                      <div className="max-h-64 overflow-y-auto p-2">
                        {/* 이름 기입 — 띄어쓰기 무시 규칙 그대로 (`looseIncludes`) */}
                        <input
                          autoFocus
                          value={addQuery}
                          onChange={(e) => setAddQuery(e.target.value)}
                          placeholder="이름으로 찾기"
                          aria-label="추가할 수강생 이름 찾기"
                          className="mb-1.5 w-full rounded-lg border border-zion-200 bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-zion-500"
                        />
                        {roster
                          .filter((r) => !memberKeys.has(r.student.key))
                          .filter((r) => !addQuery || looseIncludes(r.student.name, addQuery))
                          .map((r) => (
                            <button
                              key={r.student.key}
                              onClick={() =>
                                addStudentStateMark({
                                  cohortKey: COHORT_KEY,
                                  label: group.label,
                                  studentKey: r.student.key,
                                  createdBy: session.name,
                                  createdByRole: session.roleCode,
                                })
                              }
                              className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-ink transition hover:bg-zion-50 hover:text-zion-700"
                            >
                              {r.student.name}
                              <span className="ml-1 text-[10.5px] text-ink-soft">{r.division}</span>
                            </button>
                          ))}
                        {roster.every((r) => memberKeys.has(r.student.key)) && (
                          <p className="px-2 py-3 text-center text-[11.5px] text-ink-soft">
                            모든 수강생이 이미 이 묶음에 있습니다.
                          </p>
                        )}
                      </div>
                    </AnchoredPopover>
                  )}
                </div>
              );
            })}
          </div>
          {!canEdit && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft">
              <Lock size={11} /> 상태 묶음은 해당 기수의 강사·전도사가 놓습니다.
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        상태 묶음은 담당자가 직접 놓는 관찰 표시이며 이 화면 밖으로 나가지 않습니다. 목업
        데이터의 인물은 전원 가상입니다.
      </p>

      {/*
        분반 이동 확인창 (2026-08-22 리드 지시). `main`의 쌓임 맥락 때문에 Portal로 띄운다.
        등급만 바뀌는 이동은 이 창을 거치지 않는다 — 분반이 바뀔 때만 묻는다.
      */}
      {pendingMove && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/40 p-4">
            <div className="absolute inset-0" onClick={() => setPendingMove(null)} aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="분반 이동 확인"
              className="relative w-full max-w-sm rounded-card bg-white p-5 shadow-xl"
            >
              <p className="text-[14px] font-bold text-zion-900">분반이 이동되는 게 맞습니까?</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">
                <strong>{pendingMove.name}</strong> 님을{" "}
                <span className={"rounded px-1 py-0.5 text-[12px] font-semibold " + (DIVISION_TONE[pendingMove.from] ?? DIVISION_TONE_FALLBACK)}>
                  {pendingMove.from}
                </span>
                에서{" "}
                <span className={"rounded px-1 py-0.5 text-[12px] font-semibold " + (DIVISION_TONE[pendingMove.to] ?? DIVISION_TONE_FALLBACK)}>
                  {pendingMove.to}
                </span>
                (으)로 옮깁니다.
                {pendingMove.grade && <> 등급도 {pendingMove.grade}로 함께 바뀝니다.</>}
              </p>
              <p className="mt-1.5 text-[11.5px] text-ink-soft">
                출결 원본은 바뀌지 않고 화면 표시만 바뀝니다. 수강생 현황에도 함께 반영됩니다.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setPendingMove(null)}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft transition hover:bg-zion-50"
                >
                  취소
                </button>
                <button
                  onClick={confirmPendingMove}
                  className="rounded-lg bg-zion-800 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-zion-700"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </Card>
  );
}
