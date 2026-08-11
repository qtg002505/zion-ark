import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, RotateCcw } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { studentScopeLabel, visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS, COHORT } from "../content/cohort-mock";
import {
  STUDENT_PROFILES,
  DIVISION_EVANGELISTS,
  FAITH_STATUS_LABELS,
  fellowshipOf,
  type FaithType,
} from "../content/student-profiles";
import {
  gradeOf,
  GRADE_LABELS,
  GRADE_TONE,
  GRADE_ICON,
  GRADE_ICON_BG,
  type Grade,
} from "../lib/student-grade";
import { enneagramGuides } from "../content/enneagram-guides";
import type { Student } from "../lib/types";
import { PageHeader, Card } from "./common";

const GRADE_ORDER: Grade[] = ["A", "B", "C", "D"];
const FAITH_TYPES: FaithType[] = ["비오픈", "오픈", "신앙전환"];

/**
 * 수강생 현황 — 목록 화면 (2026-08-11 개편: 목록/상세 화면 분리).
 *
 * 필터 → 통계 카드 → 분반별 목록 순으로 담당 범위 수강생을 훑는 화면이다.
 * 종전에는 행을 누르면 오른쪽 패널에 요약이 떴지만, 지금은 이름을 누르면
 * 개인별 전체 페이지(`StudentDetailPage.tsx`, `/students/:key`)로 바로 이동한다.
 *
 * ⚠️ 성별·나이·신앙유형·MBTI·에니어그램·도형·사주·상담메모는 `student-profiles.ts`의
 * 시범 값이다 — 실제 인적사항(마팔 연동)은 아직 보류 상태다. 등급(A~D)은 신앙·인격
 * 판정이 아니라 출결 참여도 분류다 (불변식 4, `student-grade.ts`).
 * "전도사 선택" 필터는 분반을 사람 이름으로 부르는 표시용일 뿐 권한 경계가 아니다
 * (전도사는 담당 기수 전체를 본다 — `permissions.ts`).
 */
export function StudentsDashboard() {
  const session = useSession();
  const navigate = useNavigate();
  const { studentStatusOverrides } = useStore();
  const divisions = visibleDivisions(session, DIVISIONS);

  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<Grade | "all">("all");
  const [faithFilter, setFaithFilter] = useState<FaithType | "all">("all");
  const [query, setQuery] = useState("");

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
        yuwol: ov?.faithType ?? ((base.faithType === "비오픈" ? "비오픈" : "오픈") as "오픈" | "비오픈"),
        fellowship: ov?.fellowship ?? fellowshipOf(base.age, base.gender),
      };
    });
  }, [divisions, overrideByKey]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => divisionFilter === "all" || r.student.division === divisionFilter)
        .filter((r) => gradeFilter === "all" || r.grade === gradeFilter)
        .filter((r) => faithFilter === "all" || r.profile.faithType === faithFilter)
        .filter((r) => !query.trim() || r.student.name.includes(query.trim())),
    [rows, divisionFilter, gradeFilter, faithFilter, query],
  );

  const gradeCounts = useMemo(() => {
    const c: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0 };
    rows.forEach((r) => c[r.grade]++);
    return c;
  }, [rows]);

  /** 선택한 분반만 — 등급·신앙유형·검색 필터와 무관하게 "그 반 전체" 분석에 쓴다 */
  const divisionScoped = useMemo(
    () => rows.filter((r) => divisionFilter === "all" || r.student.division === divisionFilter),
    [rows, divisionFilter],
  );
  const divisionGradeCounts = useMemo(() => {
    const c: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0 };
    divisionScoped.forEach((r) => c[r.grade]++);
    return c;
  }, [divisionScoped]);

  const hasFilter = divisionFilter !== "all" || gradeFilter !== "all" || faithFilter !== "all" || query.trim() !== "";
  function resetFilters() {
    setDivisionFilter("all");
    setGradeFilter("all");
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
                <table className="w-full min-w-[640px] text-[12px]">
                  <thead>
                    <tr className="border-b border-zion-100 text-left text-[11px] text-ink-soft">
                      <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">이름</th>
                      <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">나이</th>
                      <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">소속</th>
                      <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">상태</th>
                      <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">유월</th>
                      <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">신앙</th>
                      <th className="whitespace-nowrap pb-1.5 font-medium">특이사항</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(({ student: s, profile: p, grade, yuwol, fellowship }) => (
                      <tr
                        key={s.key}
                        onClick={() => navigate(`/students/${encodeURIComponent(s.key)}`)}
                        className="cursor-pointer border-b border-zion-100 transition last:border-0 hover:bg-zion-50"
                      >
                        <td className="whitespace-nowrap py-2 pr-2 font-semibold text-zion-700">{s.name}</td>
                        <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{p.age}세</td>
                        <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{fellowship}</td>
                        <td className="whitespace-nowrap py-2 pr-2">
                          <GradeBadge grade={grade} />
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{yuwol}</td>
                        <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{FAITH_STATUS_LABELS[p.faithStatus]}</td>
                        <td className="max-w-[260px] truncate py-2 text-ink-soft" title={p.note}>
                          {p.note}
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
          시범 목업 데이터(가상 인물)입니다. 이름을 누르면 수강생 정보 상세 페이지로 이동합니다.
        </p>
      </Card>

      {/* 하단: 복합 분석 */}
      <AnalysisSection rows={filtered} divisionFilter={divisionFilter} />
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
  yuwol: "오픈" | "비오픈";
};

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
