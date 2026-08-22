import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  Briefcase,
  Ear,
  GraduationCap,
  HeartPulse,
  HeartHandshake,
  Info,
  Lock,
  Plus,
  Star,
  TrendingUp,
  Unlock,
  UserX,
  Users,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canEditCohortRecord } from "../lib/permissions";
import { COHORT, COHORT_KEY, RUNNING_COHORT, STUDENTS } from "../content/cohort-mock";
import { DIVISIONS } from "../content/cohort-mock";
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

/**
 * 상태 묶음 — 리드 스프레드시트 원문 그대로. **표시 순서도 시안 순서다.**
 * ⚠️ 이름을 다듬지 않는다. 색·아이콘은 시안의 느낌을 팔레트 안에서 잡은 것이다
 * (다크 되돌리기 목록에 있는 옅은 면 계열만 쓴다).
 */
const STATE_GROUPS: { label: string; icon: LucideIcon; head: string; chip: string }[] = [
  { label: "병리적 우울 (기질)", icon: HeartPulse, head: "text-red-600", chip: "bg-red-50 text-red-600 border-red-200" },
  { label: "수업 포인트 전혀 못잡음 (기질)", icon: TrendingUp, head: "text-zion-700", chip: "bg-zion-100 text-zion-800 border-zion-300" },
  { label: "행함부담", icon: Briefcase, head: "text-amber-600", chip: "bg-gold-100 text-gold-700 border-gold-300" },
  { label: "종교반감/무신론자", icon: UserX, head: "text-level-high", chip: "bg-level-high-soft text-level-high border-zion-300" },
  { label: "이성교제자", icon: HeartHandshake, head: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "기능자", icon: Wrench, head: "text-zion-700", chip: "bg-zion-100 text-zion-800 border-zion-300" },
  { label: "잎사귀 오픈", icon: Ear, head: "text-level-el", chip: "bg-level-el-soft text-level-el border-zion-300" },
  { label: "유급 챙길인원", icon: GraduationCap, head: "text-gold-700", chip: "bg-gold-100 text-gold-700 border-gold-300" },
  { label: "입막음 풀림", icon: Unlock, head: "text-red-600", chip: "bg-red-50 text-red-600 border-red-200" },
  { label: "사명자 양성", icon: Star, head: "text-gold-700", chip: "bg-gold-100 text-gold-700 border-gold-300" },
];

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

/** N주 전 주간 출석률(%) — (i) 기준 팝업의 「지난주 · 지지난주 대비」가 쓴다 */
function weekRate(weeksAgo: number): number | null {
  let attended = 0;
  let counted = 0;
  for (const s of STUDENTS) {
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
  cumRate,
  progress,
  currentWeekNo,
  currentLessonNode,
}: {
  onOpenStudent: (key: string) => void;
  cumRate: number;
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
  function dropToCell(e: DragEvent, grade: Grade, division: string) {
    e.preventDefault();
    endDrag();
    if (!canEdit) return;
    const key = e.dataTransfer.getData("text/plain");
    const row = roster.find((r) => r.student.key === key);
    if (!row) return;
    const patch: { grade?: Grade; division?: string } = {};
    if (row.grade !== grade) patch.grade = grade;
    if (row.division !== division) patch.division = division;
    if (Object.keys(patch).length === 0) return;
    setStudentStatus(key, patch, session.name, session.roleCode);
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

  /* ── 상태판 「추가」 팝오버 (터치·좁은 화면 경로) ── */
  const [addFor, setAddFor] = useState<string | null>(null);
  const addAnchors = useRef<Record<string, HTMLButtonElement | null>>({});

  const kpis: { label: string; value: string; sub: string; icon: LucideIcon; tone: string }[] = [
    { label: "총등록", value: `${total}명`, sub: COHORT.cohort, icon: Users, tone: "bg-zion-100 text-zion-700" },
    { label: "수강 유지", value: `${gradeAB}명`, sub: "A·B 등급", icon: UsersRound, tone: "bg-emerald-50 text-emerald-600" },
    { label: "위기", value: `${byGrade("D").length}명`, sub: "D 등급", icon: HeartPulse, tone: "bg-gold-100 text-gold-700" },
    { label: "중단", value: `${byGrade("E").length}명`, sub: "E 등급", icon: UserX, tone: "bg-red-50 text-red-600" },
    { label: "누적 출석률", value: `${cumRate}%`, sub: "8개월 과정 기준", icon: TrendingUp, tone: "bg-zion-100 text-zion-700" },
    { label: "기수 진행률", value: `${progress}%`, sub: `${currentWeekNo}주차`, icon: GraduationCap, tone: "bg-gold-100 text-gold-700" },
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
                  {RUNNING_COHORT.startsOn} · 종강 예정 {RUNNING_COHORT.endsOn}. 수업 요일 수정은
                  아래 기수 일정 칸에서 합니다.
                </p>
                <p>
                  <span className="font-semibold text-zion-700">기수 진행률</span> — {progress}% ·{" "}
                  {currentWeekNo}주차 · 현재 {currentLessonNode}
                </p>
                <p>
                  <span className="font-semibold text-zion-700">출석률(지난주 기준)</span> —{" "}
                  {lastWeekRate === null ? "집계 전" : `${lastWeekRate}%`}
                  {rateDelta !== null && (
                    <span className={rateDelta < 0 ? "text-red-600" : "text-emerald-600"}>
                      {" "}({rateDelta >= 0 ? "+" : ""}{rateDelta}%)
                    </span>
                  )}{" "}
                  — 지지난주 대비 등락
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
                    <th
                      key={d}
                      className="border border-l-0 border-t-0 border-zion-100 bg-zion-50/60 px-2 py-1 text-center"
                    >
                      <div className="text-[12px] font-bold text-zion-800">
                        {DIVISION_EVANGELISTS[d] ?? d}
                      </div>
                      <div className="text-[10px] font-normal text-ink-soft">{d}</div>
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
                              (overZone === zone ? "bg-zion-100" : "bg-white")
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
                                    "rounded-md border px-1.5 py-0.5 text-[12px] font-medium transition " +
                                    (canEdit ? "cursor-grab active:cursor-grabbing " : "") +
                                    (dragKey === r.student.key ? "opacity-40 " : "") +
                                    (r.opened
                                      ? "border-gold-300 bg-gold-100/70 text-gold-700 hover:bg-gold-100"
                                      : "border-zion-100 bg-zion-50/70 text-ink hover:border-zion-300 hover:text-zion-700")
                                  }
                                >
                                  {r.student.name}
                                  {r.manual && "*"}
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
                    "rounded-xl border px-2.5 py-2 transition " +
                    (overZone === group.label
                      ? "border-zion-500 bg-zion-100"
                      : "border-zion-100 bg-white")
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <Icon size={13} className={"shrink-0 " + group.head} />
                    <span className={"min-w-0 flex-1 truncate text-[11.5px] font-bold " + group.head}>
                      {group.label}
                    </span>
                    {canEdit && (
                      <button
                        ref={(el) => {
                          addAnchors.current[group.label] = el;
                        }}
                        onClick={() => setAddFor(addFor === group.label ? null : group.label)}
                        aria-label={`${group.label} 묶음에 수강생 추가`}
                        className="shrink-0 rounded p-0.5 text-ink-soft transition hover:bg-zion-100 hover:text-zion-700"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 flex min-h-[22px] flex-wrap gap-1">
                    {inGroup.length === 0 ? (
                      <span className="text-[10.5px] text-ink-soft">—</span>
                    ) : (
                      inGroup.map((m) => {
                        const name = nameOf(m.studentKey);
                        if (name === null) return null;
                        return (
                          <span
                            key={m.id}
                            draggable={canEdit}
                            onDragStart={(e) => onDragStart(e, m.studentKey)}
                            onDragEnd={endDrag}
                            className={
                              "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium " +
                              (canEdit ? "cursor-grab active:cursor-grabbing " : "") +
                              group.chip
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
                        {roster
                          .filter((r) => !memberKeys.has(r.student.key))
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
    </Card>
  );
}
