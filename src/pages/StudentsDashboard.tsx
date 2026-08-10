import { useMemo, useState, type ReactNode } from "react";
import {
  Search,
  Users,
  RotateCcw,
  Sparkles,
  CalendarCheck,
  RefreshCw,
  MessageCircle,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { studentScopeLabel, visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS, COHORT, STATUS_LABELS } from "../content/cohort-mock";
import {
  STUDENT_PROFILES,
  DIVISION_EVANGELISTS,
  FEEDBACK_KIND_LABELS,
  FAITH_STATUS_LABELS,
  fellowshipOf,
  type FaithType,
  type Fellowship,
} from "../content/student-profiles";
import { weekDots, attendanceStreak } from "../lib/attendance-signals";
import {
  gradeOf,
  GRADE_LABELS,
  GRADE_TONE,
  GRADE_ICON,
  GRADE_ICON_BG,
  SUGGESTIONS,
  growthScore,
  type Grade,
} from "../lib/student-grade";
import { weekdayOf } from "../lib/date-format";
import { enneagramGuides } from "../content/enneagram-guides";
import type { Student } from "../lib/types";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { PageHeader, Card, StatusBadge } from "./common";

const GRADE_ORDER: Grade[] = ["A", "B", "C", "D"];
const FAITH_TYPES: FaithType[] = ["비오픈", "오픈", "신앙전환"];

/**
 * 수강생관리 도우미 — 상세 운영 화면 (2026-08-09 개편).
 *
 * 종전 요약 카드 4개 대신, 필터 → 통계 카드 → 목록·상세(메모장) → 복합 분석 순으로
 * 한 화면에서 담당 범위 수강생을 훑고 한 명을 깊게 볼 수 있게 만든다.
 *
 * ⚠️ 성별·나이·신앙유형·MBTI·에니어그램·도형·사주·상담메모는 `student-profiles.ts`의
 * 시범 값이다 — 실제 인적사항(마팔 연동)은 아직 보류 상태다. 등급(A~D)은 신앙·인격
 * 판정이 아니라 출결 참여도 분류다 (불변식 4, `student-grade.ts`).
 * "전도사 선택" 필터는 분반을 사람 이름으로 부르는 표시용일 뿐 권한 경계가 아니다
 * (전도사는 담당 기수 전체를 본다 — `permissions.ts`).
 */
export function StudentsDashboard() {
  const session = useSession();
  const { studentStatusOverrides } = useStore();
  const divisions = visibleDivisions(session, DIVISIONS);

  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<Grade | "all">("all");
  const [faithFilter, setFaithFilter] = useState<FaithType | "all">("all");
  /**
   * 수강 상태 — 종전 「수강생 목록」에서 옮겨 왔다 (2026-08-10 병합).
   * ⚠️ 등급과 **다른 축**이다. 등급은 출석률 구간이고, 상태는 출결 원본이 주는
   * 수강 중·중단 위기·중단 구분이다. 둘 다 있어야 "출석률은 낮지만 아직 수강 중"
   * 같은 경우를 가려낼 수 있다.
   */
  const [statusFilter, setStatusFilter] = useState<Student["status"] | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  /** 상세는 팝업으로 연다 — 페이지를 옮기면 필터·스크롤을 잃는다 (2026-08-10 리드 지시) */
  const [modalKey, setModalKey] = useState<string | null>(null);

  const overrideByKey = useMemo(
    () => Object.fromEntries(studentStatusOverrides.map((o) => [o.studentKey, o])),
    [studentStatusOverrides],
  );

  /** 전도사가 상세 페이지에서 바꾼 값이 있으면 그 값을, 없으면 자동 계산값을 쓴다 */
  const rows = useMemo(() => {
    return STUDENTS.filter((s) => divisions.includes(s.division)).map((s) => {
      const base = STUDENT_PROFILES[s.key];
      const ov = overrideByKey[s.key];
      const profile = ov?.faithStatus ? { ...base, faithStatus: ov.faithStatus } : base;
      return {
        student: s,
        profile,
        grade: ov?.grade ?? gradeOf(s),
        fellowship: ov?.fellowship ?? fellowshipOf(base.age, base.gender),
        yuwol: ov?.faithType ?? ((base.faithType === "비오픈" ? "비오픈" : "오픈") as "오픈" | "비오픈"),
      };
    });
  }, [divisions, overrideByKey]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => divisionFilter === "all" || r.student.division === divisionFilter)
        .filter((r) => gradeFilter === "all" || r.grade === gradeFilter)
        .filter((r) => statusFilter === "all" || r.student.status === statusFilter)
        .filter((r) => faithFilter === "all" || r.profile.faithType === faithFilter)
        .filter((r) => !query.trim() || r.student.name.includes(query.trim())),
    [rows, divisionFilter, gradeFilter, statusFilter, faithFilter, query],
  );

  const gradeCounts = useMemo(() => {
    const c: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    rows.forEach((r) => c[r.grade]++);
    return c;
  }, [rows]);

  /** 선택한 분반만 — 등급·신앙유형·검색 필터와 무관하게 "그 반 전체" 분석에 쓴다 */
  const divisionScoped = useMemo(
    () => rows.filter((r) => divisionFilter === "all" || r.student.division === divisionFilter),
    [rows, divisionFilter],
  );
  const divisionGradeCounts = useMemo(() => {
    const c: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    divisionScoped.forEach((r) => c[r.grade]++);
    return c;
  }, [divisionScoped]);

  const selected = filtered.find((r) => r.student.key === selectedKey) ?? rows.find((r) => r.student.key === selectedKey);

  const hasFilter =
    divisionFilter !== "all" ||
    gradeFilter !== "all" ||
    statusFilter !== "all" ||
    faithFilter !== "all" ||
    query.trim() !== "";
  function resetFilters() {
    setDivisionFilter("all");
    setGradeFilter("all");
    setStatusFilter("all");
    setFaithFilter("all");
    setQuery("");
  }

  return (
    <div>
      <PageHeader
        crumb="수강생 관리 도우미"
        title="수강생관리 도우미"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 조회 범위: ${studentScopeLabel(session)}`}
      />

      {/* 상단 필터 — 분반(전도사) 선택은 아래 목록 왼쪽 패널에서 한다 */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-zion-100 bg-zion-50 px-3 py-1.5 text-[12px] text-ink-soft">
            기수: {COHORT.cohort}
          </span>
          <FilterSelect
            label="등급"
            value={gradeFilter}
            onChange={(v) => setGradeFilter(v as Grade | "all")}
            options={[
              { value: "all", label: "전체 등급" },
              ...GRADE_ORDER.map((g) => ({ value: g, label: `${GRADE_LABELS[g]}(${g})` })),
            ]}
          />
          {/* 수강 상태 — 종전 「수강생 목록」에서 옮겨 왔다 (등급과 다른 축) */}
          <FilterSelect
            label="수강 상태"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as Student["status"] | "all")}
            options={[
              { value: "all", label: "전체 상태" },
              ...(["active", "atRisk", "paused"] as const).map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              })),
            ]}
          />
          <FilterSelect
            label="신앙유형"
            value={faithFilter}
            onChange={(v) => setFaithFilter(v as FaithType | "all")}
            options={[{ value: "all", label: "전체 신앙유형" }, ...FAITH_TYPES.map((f) => ({ value: f, label: f }))]}
          />

          <div className="flex items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-1.5">
            <Search size={13} className="text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 검색"
              aria-label="수강생 이름 검색"
              className="w-24 bg-transparent text-[12px] outline-none"
            />
          </div>

          {hasFilter && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 rounded-lg border border-zion-100 bg-white px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
            >
              <RotateCcw size={12} /> 필터 초기화
            </button>
          )}
        </div>
      </Card>

      {/* 통계 카드 — 흰 배경 + 색깔 아이콘 원형으로 통일 */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          icon={Users}
          label="전체 수강생"
          count={rows.length}
          total={rows.length}
          active={gradeFilter === "all"}
          onClick={() => setGradeFilter("all")}
          iconBg="bg-blue-500"
        />
        {GRADE_ORDER.map((g) => (
          <StatCard
            key={g}
            icon={GRADE_ICON[g]}
            label={`${GRADE_LABELS[g]} (${g})`}
            count={gradeCounts[g]}
            total={rows.length}
            active={gradeFilter === g}
            onClick={() => setGradeFilter(gradeFilter === g ? "all" : g)}
            iconBg={GRADE_ICON_BG[g]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* 왼쪽: 분반 선택 + 선택 분반 수강생 표 */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[14px] font-bold text-zion-900">분반별 수강생 현황</div>
            {/* 분반 선택 시엔 아래 요약 줄이 이 수를 대신 보여준다 — 여기선 "전체 분반"일 때만 */}
            {divisionFilter === "all" && <div className="text-[12px] text-ink-soft">{filtered.length}명</div>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[148px_minmax(0,1fr)]">
            {/* 분반 목록 */}
            <div className="flex gap-1.5 overflow-x-auto sm:block sm:overflow-visible sm:border-r sm:border-zion-100 sm:pr-3">
              <DivisionListItem
                label="전체 분반"
                sub={`${rows.length}명`}
                active={divisionFilter === "all"}
                onClick={() => setDivisionFilter("all")}
              />
              {divisions.map((d) => (
                <DivisionListItem
                  key={d}
                  label={d}
                  sub={`${DIVISION_EVANGELISTS[d] ?? ""} · ${rows.filter((r) => r.student.division === d).length}명`}
                  active={divisionFilter === d}
                  onClick={() => setDivisionFilter(d)}
                />
              ))}
            </div>

            {/* 선택 분반 수강생 표 */}
            <div className="min-w-0">
              {divisionFilter !== "all" && (
                <div className="mb-3 rounded-lg bg-zion-50 px-3 py-2.5">
                  <div>
                    <span className="text-[13px] font-bold text-zion-900">
                      {DIVISION_EVANGELISTS[divisionFilter] ?? divisionFilter}
                    </span>
                    <span className="ml-1.5 text-[11px] text-ink-soft">전체 {divisionScoped.length}명</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {GRADE_ORDER.map((g) => {
                      const c = divisionGradeCounts[g];
                      const pct = divisionScoped.length ? Math.round((c / divisionScoped.length) * 1000) / 10 : 0;
                      const Icon = GRADE_ICON[g];
                      return (
                        <div key={g} className="flex flex-col items-center gap-1 rounded-md bg-white py-1.5 text-center">
                          <span className="flex items-center gap-1 text-[10.5px] text-ink-soft">
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ${GRADE_ICON_BG[g]}`}>
                              <Icon size={9} />
                            </span>
                            {GRADE_LABELS[g]}
                          </span>
                          <span className="text-[12px] font-semibold text-zion-800">
                            {c}명 ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-ink-soft">조건에 맞는 수강생이 없습니다.</p>
              ) : (
                <div className="-mx-1 overflow-x-auto px-1">
                  {/* 열이 늘어 좁은 화면에서는 표만 가로로 넘긴다 — 본문은 밀리지 않는다 */}
                  <table className="w-full min-w-[720px] text-[12px]">
                    <thead>
                      <tr className="border-b border-zion-100 text-left text-[11px] text-ink-soft">
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">이름</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">등급</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">상태</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">출석</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">최근 출석</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">특이사항</th>
                        <th className="whitespace-nowrap pb-1.5 text-right font-medium">상세</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(({ student: s, profile: p, grade }) => (
                        <tr
                          key={s.key}
                          onClick={() => setSelectedKey(s.key)}
                          className={
                            "cursor-pointer border-b border-zion-100 transition last:border-0 hover:bg-zion-50 " +
                            (selectedKey === s.key ? "bg-zion-50" : "")
                          }
                        >
                          <td className="whitespace-nowrap py-2 pr-2">
                            <span className="flex items-center gap-1.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zion-100 text-[11px] font-bold text-zion-700">
                                {s.name[0]}
                              </span>
                              <span className="font-semibold text-ink">{s.name}</span>
                              <span className="text-[11px] text-ink-soft">{s.division}</span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2">
                            <GradeBadge grade={grade} />
                          </td>
                          {/* 수강 상태 — 등급과 다른 축이라 함께 보여야 판단이 갈린다 */}
                          <td className="whitespace-nowrap py-2 pr-2">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">
                            {s.presentCount}/{s.totalSessions}회{" "}
                            <span className="font-semibold text-zion-800">({s.attendanceRate}%)</span>
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">
                            {s.lastAttended ?? "기록 없음"}
                          </td>
                          <td className="max-w-[260px] truncate py-2 pr-2 text-ink-soft" title={p.note}>
                            {p.note}
                          </td>
                          {/* 표에서 곧장 상세로 — 오른쪽 요약을 거치지 않아도 되게 (2026-08-10) */}
                          <td className="whitespace-nowrap py-2 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // 행 클릭(요약 선택)과 겹치지 않게
                                setModalKey(s.key);
                              }}
                              aria-haspopup="dialog"
                              aria-label={`${s.name} 상세 보기`}
                              className="inline-flex items-center gap-1 rounded-lg bg-zion-800 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-zion-700"
                            >
                              <Maximize2 size={11} /> 상세
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 border-t border-zion-100 pt-3 text-[11px] leading-relaxed text-ink-soft">
            시범 목업 데이터(가상 인물)입니다. 행을 누르면 오른쪽에서 상세 메모를 볼 수 있습니다.
          </p>
        </Card>

        {/* 오른쪽: 선택 수강생 메모장 */}
        <StudentDetail row={selected} onOpenDetail={() => setModalKey(selected?.student.key ?? null)} />
      </div>

      {/* 하단: 복합 분석 */}
      <AnalysisSection rows={filtered} divisionFilter={divisionFilter} />

      {modalKey && <StudentDetailModal studentKey={modalKey} onClose={() => setModalKey(null)} />}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-lg border border-zion-100 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-zion-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** 통계 카드 — 흰 배경 + 색깔 아이콘 원형(참고 화면 스타일 통일) */
function StatCard({
  icon: Icon,
  label,
  count,
  total,
  active,
  onClick,
  iconBg,
}: {
  icon: typeof Users;
  label: string;
  count: number;
  total: number;
  active: boolean;
  onClick: () => void;
  iconBg: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={
        "animate-slide-in-up flex flex-col items-center gap-1.5 rounded-card border bg-white p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md " +
        (active ? "border-zion-400 ring-2 ring-zion-200" : "border-zion-100")
      }
    >
      <span className="flex items-center gap-1.5">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${iconBg}`}>
          <Icon size={13} />
        </span>
        <span className="text-[11.5px] text-ink-soft">{label}</span>
      </span>
      <span className="text-[18px] font-bold leading-none text-ink">
        {count}명 <span className="text-[12px] font-normal text-ink-soft">({pct}%)</span>
      </span>
    </button>
  );
}

function DivisionListItem({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 rounded-lg px-3 py-2 text-left text-[12px] transition sm:w-full sm:shrink " +
        (active ? "bg-zion-700 text-white" : "text-ink hover:bg-zion-50")
      }
    >
      <div className="whitespace-nowrap font-semibold">{label}</div>
      <div className={"mt-0.5 whitespace-nowrap text-[10.5px] " + (active ? "text-white/75" : "text-ink-soft")}>{sub}</div>
    </button>
  );
}

function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${GRADE_TONE[grade]}`}>
      {GRADE_LABELS[grade]}({grade})
    </span>
  );
}

type Row = {
  student: Student;
  profile: (typeof STUDENT_PROFILES)[string];
  grade: Grade;
  fellowship: Fellowship;
  yuwol: "오픈" | "비오픈";
};

function StudentDetail({ row, onOpenDetail }: { row: Row | undefined; onOpenDetail: () => void }) {
  if (!row) {
    return (
      <Card className="flex min-h-[240px] items-center justify-center text-center">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          왼쪽 목록에서 수강생을 선택하면
          <br />
          기본정보와 출석·보강·상담 메모를 볼 수 있습니다.
        </p>
      </Card>
    );
  }

  const { student: s, profile: p, grade, fellowship, yuwol } = row;
  const score = growthScore(s);
  const recentDots = weekDots(s.recentWeeks).slice(-4);
  const streak = attendanceStreak(s.recentWeeks);
  const makeupDoneCount = s.recentWeeks.filter((w) => w.mark === "makeupDone").length;
  const hasMakeupPending = s.recentWeeks.some((w) => w.mark === "makeupPending");
  const counselCount = p.feedback.filter((f) => f.kind === "counsel").length;
  // ⚠️ "진행중/완료"는 상담 워크플로 값이 따로 없어 등급(C·D=아직 관리 필요)으로 대신 가늠한 것 —
  // 신앙·인격 판정이 아니라 출결 참여도 등급을 그대로 재사용한 것뿐이다(불변식 4)
  const counselOngoing = grade === "C" || grade === "D";
  const latestNote = p.feedback[0];
  const OK_TONE = "border-emerald-200 bg-emerald-50 text-emerald-700";
  const WARN_TONE = "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zion-100 text-[16px] font-bold text-zion-700">
            {s.name[0]}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-[15px] font-bold text-ink">{s.name}</span>
              <span className="text-[12px] text-ink-soft">
                {p.gender} {p.age}세 {fellowship.replace("회", "")} {s.division}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <GradeBadge grade={grade} />
              <Tag>{p.registrationType}</Tag>
              <Tag>{p.faithStatus}</Tag>
              <Tag>{yuwol}</Tag>
            </div>
          </div>
        </div>
        {/*
          상세 진입은 이 화면에서 가장 많이 누르는 버튼이다 — 테두리만 있는 작은 버튼이라
          눈에 띄지 않는다는 지적을 받아 **채운 주 버튼**으로 올렸다 (2026-08-10).
        */}
        <button
          onClick={onOpenDetail}
          aria-haspopup="dialog"
          className="flex shrink-0 items-center gap-1 rounded-lg bg-zion-800 px-3 py-2 text-[12px] font-bold text-white shadow-sm transition hover:bg-zion-700"
          title="수강생 정보 상세 열기"
        >
          <Maximize2 size={13} /> 상세 보기
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>MBTI {p.mbti}</Tag>
        <Tag>에니어그램 {p.enneagramType}유형</Tag>
        <Tag>{p.shapeType}</Tag>
        <Tag>사주 {p.sajuElement}</Tag>
      </div>

      {/* 최근 활동 요약 — 행마다 한눈에 보이는 요약 + 상세 진입 화살표(연결은 다음 단계) */}
      <div className="mt-4">
        <div className="mb-1 text-[12px] font-bold text-zion-900">최근 활동 요약</div>
        <div className="divide-y divide-zion-100">
          <ActivityRow
            onOpen={onOpenDetail}
            icon={CalendarCheck}
            label={FEEDBACK_KIND_LABELS.attendance}
            badge={`연속 ${streak}회`}
            badgeTone={OK_TONE}
            sub={
              <>
                출석률 {s.attendanceRate}% ({s.presentCount}/{s.totalSessions}회) · 최근 출석{" "}
                {s.lastAttended ? `${s.lastAttended} (${weekdayOf(s.lastAttended)})` : "기록 없음"}
              </>
            }
          >
            {recentDots.map((d, i) => (
              <span
                key={i}
                title={d.title}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${d.tone}`}
              >
                {d.label}
              </span>
            ))}
          </ActivityRow>

          <ActivityRow
            onOpen={onOpenDetail}
            icon={RefreshCw}
            label={FEEDBACK_KIND_LABELS.makeup}
            badge={hasMakeupPending ? "확인 필요" : "정상"}
            badgeTone={hasMakeupPending ? WARN_TONE : OK_TONE}
          >
            <span className="truncate text-[12px] text-ink-soft">보강 {makeupDoneCount}회 완료</span>
          </ActivityRow>

          <ActivityRow
            onOpen={onOpenDetail}
            icon={MessageCircle}
            label={FEEDBACK_KIND_LABELS.counsel}
            badge={counselOngoing ? "진행중" : "완료"}
            badgeTone={counselOngoing ? WARN_TONE : OK_TONE}
          >
            <span className="truncate text-[12px] text-ink-soft">상담 {counselCount}회</span>
          </ActivityRow>
        </div>

        {latestNote && (
          <div className="mt-3 border-t border-zion-100 pt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold text-zion-900">메모 미리보기</span>
              <span className="text-[11px] text-ink-soft">{latestNote.date}</span>
            </div>
            <p className="line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">{latestNote.text}</p>
            <button
              onClick={onOpenDetail}
              aria-haspopup="dialog"
              className="mt-1 flex items-center gap-0.5 text-[11px] font-semibold text-zion-700 hover:underline"
            >
              전체 메모 보기 <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-zion-100 bg-zion-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-zion-800">
            <Sparkles size={13} /> AI 성장 분석
          </div>
          <div className="text-[15px] font-bold text-zion-800">{score}/100</div>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          출결 참여도를 바탕으로 한 참고 제안입니다. 신앙·인격을 확정 판정하지 않으며, 연락 여부는
          담당자가 정합니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS[grade].map((sug) => (
            <span key={sug} className="rounded-full border border-zion-200 bg-white px-2.5 py-1 text-[11px] text-zion-700">
              {sug}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

/** 최근 활동 요약 한 줄 — 아이콘·라벨·요약 내용·상태 배지·상세 진입 화살표(참고 화면 구성) */
function ActivityRow({
  icon: Icon,
  label,
  badge,
  badgeTone,
  children,
  sub,
  onOpen,
}: {
  icon: typeof CalendarCheck;
  label: string;
  badge: string;
  badgeTone: string;
  children: ReactNode;
  /** 행 아래 보조 설명 줄 (예: 출석률·최근 출석일) */
  sub?: ReactNode;
  /** 누르면 상세를 **팝업으로** 연다 — 페이지를 옮기면 필터·스크롤을 잃는다 */
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      aria-haspopup="dialog"
      className="-mx-1 block w-[calc(100%+0.5rem)] rounded-lg px-1 py-2 text-left transition hover:bg-zion-50"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zion-100 text-zion-700">
          <Icon size={14} />
        </span>
        <span className="w-9 shrink-0 text-[12px] font-semibold text-ink">{label}</span>
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">{children}</span>
        <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeTone}`}>
          {badge}
        </span>
        <ChevronRight size={14} className="shrink-0 text-ink-soft" />
      </div>
      {sub && <div className="mt-1 pl-9 text-[11px] leading-relaxed text-ink-soft">{sub}</div>}
    </button>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-zion-100 bg-zion-50 px-2.5 py-1 text-[11px] font-medium text-zion-700">
      {children}
    </span>
  );
}

function AnalysisSection({ rows, divisionFilter }: { rows: Row[]; divisionFilter: string }) {
  const total = rows.length;
  const scopeLabel =
    divisionFilter === "all"
      ? "전체 분반"
      : `${divisionFilter} · ${DIVISION_EVANGELISTS[divisionFilter] ?? ""}`;

  const ageRows = distribution(rows.map((r) => `${Math.floor(r.profile.age / 10) * 10}대`));
  const registrationRows = fixedDistribution(
    rows.map((r) => r.profile.registrationType),
    ["신규", "재수강", "재입교"],
  );
  const faithRows = distribution(rows.map((r) => FAITH_STATUS_LABELS[r.profile.faithStatus]));
  const yuwolRows = distribution(rows.map((r) => r.yuwol));
  const mbtiRows = distribution(rows.map((r) => r.profile.mbti));
  const enneaRows = distribution(rows.map((r) => `${r.profile.enneagramType}유형`)).sort(
    (a, b) => Number(a.label[0]) - Number(b.label[0]),
  );
  const shapeRows = distribution(rows.map((r) => r.profile.shapeType));
  const sajuRows = distribution(rows.map((r) => `${r.profile.sajuElement}(오행)`));

  return (
    <div className="mt-5">
      <div className="mb-3 text-[14px] font-bold text-zion-900">
        복합 분석 — {scopeLabel} ({total}명 기준)
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MiniBreakdown title="연령대" rows={ageRows} total={total} />
        <MiniBreakdown title="등록구분" rows={registrationRows} total={total} />
        <MiniBreakdown title="신앙유형" rows={faithRows} total={total} />
        <MiniBreakdown title="유월" rows={yuwolRows} total={total} />
        <MiniBreakdown title="MBTI" rows={mbtiRows} total={total} />
        <MiniBreakdown
          title="에니어그램"
          rows={enneaRows}
          total={total}
          hint={enneagramGuides.map((g) => `${g.typeNo}유형 ${g.title}`).join(" · ")}
        />
        <MiniBreakdown title="도형 성향" rows={shapeRows} total={total} />
        <MiniBreakdown title="사주(오행)" rows={sajuRows} total={total} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        성향 값(MBTI·에니어그램·도형·사주)은 시범 데이터이며, 상담·강의 참고용일 뿐 확정 판정 근거로
        쓰지 않습니다(불변식 4). 에니어그램 유형별 설명은 「성향 참고」 화면에서 볼 수 있습니다.
      </p>
    </div>
  );
}

function distribution(items: string[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  items.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** count 0인 항목도 정해진 순서 그대로 보여준다 (예: 등록구분 — 재입교가 0명이어도 목록엔 남는다) */
function fixedDistribution(items: string[], order: string[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  items.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  return order.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

function MiniBreakdown({
  title,
  rows,
  total,
  hint,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="mb-2.5 text-[12.5px] font-bold text-zion-900" title={hint}>
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-ink-soft">데이터 없음</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-0.5 flex justify-between text-[10.5px]">
                <span className="text-ink-soft">{r.label}</span>
                <span className="font-semibold text-zion-800">
                  {r.count}명 · {total ? Math.round((r.count / total) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zion-100">
                <div
                  className="h-full rounded-full bg-zion-700"
                  style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
