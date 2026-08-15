import { useMemo, useState } from "react";
import { Search, Users, RotateCcw, Lock, Unlock } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS, COHORT } from "../content/cohort-mock";
import { DRAG_SCROLL_CLASS, useDragScroll } from "../lib/drag-scroll";
import {
  STUDENT_PROFILES,
  DIVISION_EVANGELISTS,
  FAITH_STATUS_LABELS,
  FELLOWSHIP_LABELS,
  ENROLLMENT_STATUS_DEFAULT,
  fellowshipOf,
  type FaithType,
  type Fellowship,
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
import { StudentDetailModal } from "../components/StudentDetailModal";
import { PageHeader, Card, EnrollmentStatusBadge } from "./common";

const GRADE_ORDER: Grade[] = ["A", "B", "D", "E"];

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
  const [query, setQuery] = useState("");
  /** 상세는 팝업으로 연다 — 페이지를 옮기면 필터·스크롤을 잃는다 (2026-08-10 리드 지시) */
  const [modalKey, setModalKey] = useState<string | null>(null);
  /** 표를 붙잡고 끌어서 넘긴다 (2026-08-14 리드 지시) */
  const dragTable = useDragScroll<HTMLDivElement>();

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
        enrollmentStatus: ov?.enrollmentStatus ?? ENROLLMENT_STATUS_DEFAULT,
        registrationType: ov?.registrationType ?? base.registrationType,
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
        .filter((r) => faithFilter === "all" || r.profile.faithType === faithFilter)
        .filter((r) => !query.trim() || r.student.name.includes(query.trim())),
    [rows, divisionFilter, gradeFilter, faithFilter, query],
  );

  const gradeCounts = useMemo(() => {
    const c: Record<Grade, number> = { A: 0, B: 0, D: 0, E: 0 };
    rows.forEach((r) => c[r.grade]++);
    return c;
  }, [rows]);

  /** 선택한 분반만 — 등급·신앙유형·검색 필터와 무관하게 "그 반 전체" 분석에 쓴다 */
  const divisionScoped = useMemo(
    () => rows.filter((r) => divisionFilter === "all" || r.student.division === divisionFilter),
    [rows, divisionFilter],
  );
  const divisionGradeCounts = useMemo(() => {
    const c: Record<Grade, number> = { A: 0, B: 0, D: 0, E: 0 };
    divisionScoped.forEach((r) => c[r.grade]++);
    return c;
  }, [divisionScoped]);

  const hasFilter =
    divisionFilter !== "all" || gradeFilter !== "all" || faithFilter !== "all" || query.trim() !== "";
  function resetFilters() {
    setDivisionFilter("all");
    setGradeFilter("all");
    setFaithFilter("all");
    setQuery("");
  }

  return (
    <div>
      {/*
        ⚠️ crumb와 title이 둘 다 "수강생 관리 도우미"라 위아래로 같은 말이 두 번 보였다
        (2026-08-13 지적). title을 이 화면 이름("수강생 현황")으로 바꾸고, 그 아래
        정보 한 줄(desc)은 뺐다 — 지파·교회·기수·조회범위는 아래 필터 줄에서 이미 보인다.
      */}
      {/*
        이름을 「AI 성장 추천」으로 바꿨다 (2026-08-15 리드 지시 — 종전 「수강생 현황」).
        화면이 하는 일은 그대로다: 명단을 보고, 줄을 누르면 그 사람의 상세(등급·추천 액션·
        연결 자료)가 열린다. AI 분석이 **추천 특강·교안·분반으로 이어지는 것**이 이 화면의 뜻이다.
      */}
      <PageHeader
        crumb="수강생 관리 도우미"
        title="AI 성장 추천"
        desc="등급과 추천 액션을 보고, 줄을 누르면 그 수강생에게 맞는 교안·보강 자료로 바로 이어집니다."
      />

      {/* 상단 필터 — 분반(전도사) 선택은 아래 목록 왼쪽 패널에서 한다 */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-zion-100 bg-zion-50 px-3 py-1.5 text-[12px] text-ink-soft">
            기수: {COHORT.cohort}
          </span>

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

      {/*
        통계 카드 — 등급(전체·정상·관심·위기·중단)에 신앙유형(오픈·비오픈)까지 한 줄에
        더해 클릭으로 거르게 했다(2026-08-13 지적) — 칸이 늘어난 만큼 폭은 줄여 7칸에 맞춘다.
        ⚠️ 신앙전환은 이 빠른 필터에 넣지 않는다 — 오픈/비오픈 두 값만 요청받았다.
      */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
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
        <StatCard
          icon={Unlock}
          label="오픈"
          count={rows.filter((r) => r.profile.faithType === "오픈").length}
          total={rows.length}
          active={faithFilter === "오픈"}
          onClick={() => setFaithFilter(faithFilter === "오픈" ? "all" : "오픈")}
          iconBg="bg-sky-500"
        />
        <StatCard
          icon={Lock}
          label="비오픈"
          count={rows.filter((r) => r.profile.faithType === "비오픈").length}
          total={rows.length}
          active={faithFilter === "비오픈"}
          onClick={() => setFaithFilter(faithFilter === "비오픈" ? "all" : "비오픈")}
          iconBg="bg-slate-500"
        />
      </div>

      {/*
        목록은 **1단**이다 (2026-08-13 파트 B 작업 반영).
        종전에는 오른쪽에 인라인 미리보기 패널을 두어 「행을 고르면 옆에서 요약, 상세는 또
        팝업」이라는 **두 단계**가 됐다. 같은 것을 두 자리에서 보여 주니 표는 좁아지고
        어느 쪽을 봐야 할지도 흐렸다. 요약을 걷어내고 **표 → 팝업** 한 단계로 줄였다.
      */}
      <div>
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
                <div
                  ref={dragTable.ref}
                  onPointerDown={dragTable.onPointerDown}
                  className={"-mx-1 overflow-x-auto px-1 " + DRAG_SCROLL_CLASS}
                >
                  {/*
                    열이 늘어 좁은 화면에서는 표만 가로로 넘긴다 — 본문은 밀리지 않는다.
                    붙잡고 끌어도 넘어간다 (2026-08-14) — 문턱이 있어 줄 클릭은 그대로 산다.
                  */}
                  <table className="w-full min-w-[720px] text-[12px]">
                    <thead>
                      <tr className="border-b border-zion-100 text-left text-[11px] text-ink-soft">
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">이름</th>
                        {/*
                          나이 · 소속 · 등록 · 상태 · 등급 · 신앙 · 유월 · 특이사항 순 —
                          리드 지시로 순서를 고정했다(2026-08-13). 분반·출석은 뺐다.
                        */}
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">나이</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">소속</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">등록</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">상태</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">등급</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">신앙</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">유월</th>
                        <th className="whitespace-nowrap pb-1.5 pr-2 font-medium">특이사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/*
                        「전체 분반」일 때도 **분반 띠로 나뉘어 보인다** (2026-08-15 리드 지시 —
                        「분반별로 나눠지지만 전체가 보이도록」). 출석 격자의 분반 띠와 같은 방식이다.
                        분반 하나를 고른 상태에서는 띠가 군더더기라 안 그린다.
                      */}
                      {(divisionFilter === "all"
                        ? [...new Set(filtered.map((r) => r.student.division))].sort((a, b) =>
                            a.localeCompare(b, "ko"),
                          )
                        : [divisionFilter]
                      ).flatMap((div) => [
                        divisionFilter === "all" ? (
                          <tr key={`band-${div}`} className="bg-zion-50/80">
                            <td colSpan={9} className="py-1.5 pr-2 text-[11.5px] font-bold text-zion-800">
                              ▸ {div}
                              <span className="ml-1.5 font-normal text-ink-soft">
                                {DIVISION_EVANGELISTS[div] ?? ""} ·{" "}
                                {filtered.filter((r) => r.student.division === div).length}명
                              </span>
                            </td>
                          </tr>
                        ) : null,
                        ...filtered
                          .filter((r) => r.student.division === div)
                          .map(({ student: s, profile: p, grade, yuwol, fellowship, enrollmentStatus, registrationType }) => (
                        <tr
                          key={s.key}
                          // 줄을 누르면 바로 상세가 열린다 — 요약 패널을 걷어냈으므로 한 단계로 간다
                          onClick={() => setModalKey(s.key)}
                          className="cursor-pointer border-b border-zion-100 transition last:border-0 hover:bg-zion-50"
                        >
                          {/* 이름 옆 사진(이니셜 원)은 뺐다(2026-08-13 요청) */}
                          <td className="whitespace-nowrap py-2 pr-2">
                            <span className="font-semibold text-ink">{s.name}</span>
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{p.age}세</td>
                          <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{FELLOWSHIP_LABELS[fellowship]}</td>
                          <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{registrationType}</td>
                          {/*
                            수강 상태 — 등급과 다른 축이라 함께 보여야 판단이 갈린다.
                            ⚠️ "수강"(정상적으로 다니는 중)은 색 배지를 안 쓴다 — 왼쪽 열들처럼
                            평범한 글씨로 둬서, 눈에 띄어야 할 탈락·유급만 배지로 두드러지게 한다(2026-08-13).
                          */}
                          <td className="whitespace-nowrap py-2 pr-2">
                            {enrollmentStatus === "수강" ? (
                              <span className="text-ink-soft">수강</span>
                            ) : (
                              <EnrollmentStatusBadge status={enrollmentStatus} />
                            )}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2">
                            <GradeBadge grade={grade} />
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">
                            {FAITH_STATUS_LABELS[p.faithStatus]}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2 text-ink-soft">{yuwol}</td>
                          <td className="max-w-[260px] truncate py-2 pr-2 text-ink-soft" title={p.note}>
                            {p.note}
                          </td>
                        </tr>
                          )),
                      ])}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 border-t border-zion-100 pt-3 text-[11px] leading-relaxed text-ink-soft">
            시범 목업 데이터(가상 인물)입니다. 줄을 누르면 그 수강생의 상세가 열립니다.
          </p>
        </Card>
      </div>

      {/* 하단: 복합 분석 */}
      <AnalysisSection rows={filtered} divisionFilter={divisionFilter} />

      {modalKey && <StudentDetailModal studentKey={modalKey} onClose={() => setModalKey(null)} />}
    </div>
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
