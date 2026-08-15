import { useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, PencilLine, Users } from "lucide-react";
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
  COHORT_FUNNEL,
  COHORT_STAFF,
  DONE_WEEKS,
  SCHEDULE,
  TOTAL_SESSIONS,
  WEEKLY_RATES,
  COHORT_RANKS,
  studentWeekHistory,
  type WeeklyRate,
} from "../content/cohort-mock";
import { effectiveSchedule, type ClassWeekdayPeriodList } from "../lib/cohort-calendar";
import { DRAG_SCROLL_CLASS, useDragScroll } from "../lib/drag-scroll";
import { LineChart } from "../components/LineChart";
import {
  lessonOfSession,
  sessionLabelOf,
  sessionsOfWeek,
  sessionsThroughWeek,
} from "../content/curriculum-mock";
import {
  MARK_GLYPH,
  MARK_LABEL,
  MARK_TONE,
  cohortRates,
  rateOf,
} from "../lib/attendance-rate";
import { ENROLLMENT_STATUS_DEFAULT, type EnrollmentStatus } from "../content/student-profiles";
import type { Student } from "../lib/types";
import { PageHeader, Card, StatTile, StatusBadge, EnrollmentStatusBadge } from "./common";

type Tab = "summary" | "attendance" | "trend" | "compare" | "divisions";
const TAB_IDS: Tab[] = ["summary", "attendance", "trend", "compare", "divisions"];


/**
 * 기수 현황 — 한 기수를 파고드는 자리.
 *
 * 2026-08-06 회의에서 **출석률 분포와 대면 시간대를 전체현황에서 이리로 옮기기로** 했다.
 * 전체현황은 점검자용 요약이고, 상세 분석은 기수 단위에서 보는 것이 맞기 때문이다.
 * 여기에 주간 비교 흐름과 기수 간 비교를 더했다.
 */
export function CohortStatus() {
  const session = useSession();
  const { studentStatusOverrides, scheduleOverrides } = useStore();
  /**
   * 수업 요일 구간 — 화면에서 고친 값이 있으면 그것, 없으면 기본(월·화·목).
   * 출석 격자의 칸·회차 번호가 전부 이 값을 따른다 (2026-08-14 리드 지시).
   */
  const { weekdayPeriods } = effectiveSchedule(SCHEDULE, scheduleOverrides, cohortKeyOf(session));
  const [searchParams] = useSearchParams();
  const initialTab = TAB_IDS.includes(searchParams.get("tab") as Tab) ? (searchParams.get("tab") as Tab) : "summary";
  const [tab, setTab] = useState<Tab>(initialTab);

  const divisions = visibleDivisions(session, DIVISIONS);
  const students = STUDENTS.filter((s) => divisions.includes(s.division));

  /**
   * 수강 상태 — 상세 페이지에서 담당자가 고른 값(`StudentStatusOverride.enrollmentStatus`).
   * ⚠️ 「출석 현황」 탭의 `StatusBadge`(원본 출결에서 자동으로 오는 읽기 전용 값)와는 다른
   * 필드다 — 그 탭은 출결 원본 동기화를 그대로 보여주는 자리라 손대지 않는다(불변식 3).
   * 여기(기수 요약·분반별 현황)는 수강생 현황·상세 페이지와 같은 값을 보여준다.
   */
  const overrideByKey = useMemo(
    () => Object.fromEntries(studentStatusOverrides.map((o) => [o.studentKey, o])),
    [studentStatusOverrides],
  );
  const enrollmentStatusOf = (s: Student): EnrollmentStatus =>
    overrideByKey[s.key]?.enrollmentStatus ?? ENROLLMENT_STATUS_DEFAULT;

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "기수 요약" },
    { id: "attendance", label: "출석 현황" },
    { id: "trend", label: "주간 흐름" },
    { id: "compare", label: "기수 비교" },
    { id: "divisions", label: "분반별 현황" },
  ];

  /*
    「출석률 분포」 히스토그램은 2026-08-14 피드백 CHG-01(담당자 확정 지시)로 뺐다 —
    구간 계산(buckets)도 이 화면만 쓰던 것이라 함께 지웠다. 되살릴 때는 git 이력에서 꺼낸다.
  */

  /**
   * 보강 포함 출석률 — 보강까지 마친 것을 출석으로 함께 센 실제 출석률.
   * 대면만 세면 보강으로 따라잡은 사람이 결석자와 같이 묶여 실제보다 나빠 보인다.
   */
  const rates = useMemo(() => cohortRates(students), [students]);

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
              label="수강"
              value={`${students.filter((s) => enrollmentStatusOf(s) === "수강").length}명`}
              sub="담당자가 지정한 수강 상태"
            />
            <StatTile
              label="탈락·유급"
              value={`${students.filter((s) => enrollmentStatusOf(s) !== "수강").length}명`}
              sub="담당자가 지정한 수강 상태"
            />
          </div>

          {/*
            왼쪽에 있던 「출석률 분포」 히스토그램은 CHG-01(2026-08-14 담당자 확정)로 뺐고,
            「보강 포함 출석률」 카드만 남아 전폭을 쓴다. 종전 이 자리의 「대면 시간대」
            그래프도 2026-08-10에 같은 방식으로 뺐다 — 시간대 집계(`slotCounts`)는 데이터에
            남아 있다(불변식 10).
          */}
          <div className="mt-5">
            <Card>
              <div className="mb-1 text-[14px] font-bold text-zion-900">보강 포함 출석률</div>
              <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
                최근 8주 기준 <strong className="text-zion-800">{rates.withMakeup}%</strong> — 대면만 세면{" "}
                {rates.presentOnly}%입니다.{" "}
                <strong className="text-zion-800">차이 {rates.withMakeup - rates.presentOnly}%p</strong>가
                보강으로 따라잡은 몫입니다.
              </p>
              {(
                [
                  ["보강 포함 (대면 + 보강 완료)", rates.withMakeup],
                  ["대면만", rates.presentOnly],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="mb-2.5">
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-ink-soft">{label}</span>
                    <span className="font-semibold text-zion-800">{v}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zion-100">
                    <div className="h-full rounded-full bg-zion-700" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
              <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
                미입력은 분모에서 뺍니다 — 모르는 것을 결석으로 세지 않습니다. 아직 이행하지 않은
                보강(▽)은 결석으로 셉니다.
              </p>
            </Card>
          </div>

          {/*
            기수 요약 퍼널 (2026-08-13 리드 지시) — 신카부터 예상 종강까지의 흐름.
            접어 둘 수 있다(리드 요청 「접어놓기 기능」) — <details>라 상태 저장 없이 접힌다.
          */}
          <Card className="mt-5">
            <details open>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-bold text-zion-900 [&::-webkit-details-marker]:hidden">
                <ChevronDown size={15} className="shrink-0 text-zion-600 transition-transform [details:not([open])>summary>&]:-rotate-90" />
                기수 요약 지표
                <span className="text-[11px] font-normal text-ink-soft">
                  신카 → 등록 → 과정별 시작 → 예상 종강 (시범 값 · 가상)
                </span>
              </summary>
              <div className="mt-3 grid grid-cols-5 gap-2 max-lg:grid-cols-3 max-md:grid-cols-2">
                {COHORT_FUNNEL.map((f) => (
                  <div key={f.label} className="rounded-lg bg-zion-50 px-3 py-2.5">
                    <div className="text-[11px] leading-tight text-ink-soft">{f.label}</div>
                    <div className="mt-0.5 text-[16px] font-bold text-zion-900">{f.value}</div>
                    {f.sub && <div className="mt-0.5 text-[10px] text-ink-soft">{f.sub}</div>}
                  </div>
                ))}
              </div>
            </details>
          </Card>

          {/* 사명자 현황 (2026-08-13 리드 지시) — 역할은 표시 문자열일 뿐, 계정·권한과 무관하다 */}
          <Card className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <Users size={15} className="text-zion-600" />
              <h2 className="text-[14px] font-bold text-zion-900">사명자 현황</h2>
              <span className="text-[11px] text-ink-soft">가상 인물 (시범 목업)</span>
            </div>
            <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
              {COHORT_STAFF.map((p, i) => (
                <div key={i} className="rounded-lg border border-zion-100 px-3 py-2.5">
                  <div className="text-[11px] text-ink-soft">{p.role}</div>
                  <div className="mt-0.5 text-[14px] font-bold text-ink">{p.name}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {tab === "attendance" && (
        <AttendanceGrid students={students} weekdayPeriods={weekdayPeriods} />
      )}

      {tab === "trend" && (
        <>
          <EightMonthTrend />
          <div className="mt-4">
            <WeeklyTrend rows={WEEKLY_RATES} />
          </div>
        </>
      )}

      {tab === "compare" && <CohortCompare />}

      {tab === "divisions" && (
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {divisions.map((d) => {
            const group = students.filter((s) => s.division === d);
            const active = group.filter((s) => enrollmentStatusOf(s) === "수강").length;
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
                        <EnrollmentStatusBadge status={enrollmentStatusOf(s)} />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-zion-100 pt-2 text-[12px] text-ink-soft">
                  수강 {active} · 탈락·유급 {group.length - active}
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
 * 출석 격자 (2026-08-10 리드 지시) — 사명자가 훑어보고 바로 읽히는 표기로 바꿨다.
 *
 * 종전에는 사람마다 출석률 막대 하나였다. 숫자는 정확하지만 **누가 언제 빠졌는지**가
 * 안 보였다. 이제 최근 8주를 칸으로 늘어놓아 결석이 몰린 자리가 눈에 띈다.
 *
 * 기호는 색과 **함께** 쓴다 — 색만으로 뜻을 전하면 색을 구별하기 어려운 사람이 읽지 못한다.
 *   O 출석(대면) · △ 보강 완료 · ▽ 보강 예정(미이행) · X 결석 · · 미입력
 *
 * ⚠️ 목업 출결은 **주 단위**다 — 실연동 시 출결 시트에서 회차별 값이 오면 이 격자의
 * 칸에 그대로 들어가고 구조는 그대로다.
 *
 * 2026-08-13 — 완료 주차 전체(23주)를 8주씩 넘겨 봤다.
 * **2026-08-14 — 그 페이지를 없애고 23주를 한 판에 펴 좌우로 훑는다** (리드 지시).
 * 0~7주 전은 손으로 적은 기록이고, 그보다 옛 주는 `studentWeekHistory`가 결정적
 * 규칙으로 채운 값이다.
 */

/**
 * 표시 축 — **진도별이 기본**이다 (2026-08-14 리드 지시).
 *
 * 실무자(강사·전도사)가 매일 보는 화면이라 「몇 강까지 나갔나」가 먼저다. 치리자용
 * 주차 요약은 토글로 옆에 둔다. 종전의 「회차별」은 진도별과 겹쳐 없앴다 — 진도별 칸이
 * 이미 요일·회차·강을 함께 이고 있어 축을 셋으로 둘 이유가 없었다.
 *
 * ⚠️ 목업 출결이 주 단위라 **한 주의 세 회차는 그 주의 표기를 따른다** (시범 확장) —
 * 실연동 시 시트의 회차별 값이 이 칸에 그대로 들어오고 구조는 안 바뀐다.
 * 회차↔진도 매핑은 `curriculum-mock.ts`(교체 경계) 한 곳이다.
 */
type GridAxis = "lesson" | "week";

/**
 * 왼쪽 붙박이 칸의 가로 폭 — 23주(69칸)를 가로로 넘겨 보는 동안 번호·이름이 따라다녀야
 * 누구 줄인지 놓치지 않는다. `sticky`는 `left` 값을 픽셀로 받아야 해서 상수로 둔다.
 */
const STICKY_NO_W = 40;
const STICKY_NAME_W = 76;

function AttendanceGrid({
  students,
  weekdayPeriods,
}: {
  students: typeof STUDENTS;
  /** 그 기수의 수업 요일 구간 — 주차마다 요일이 다를 수 있다 (2026-08-14) */
  weekdayPeriods: ClassWeekdayPeriodList;
}) {
  const [axis, setAxis] = useState<GridAxis>("lesson");

  const rows = [...students].sort((a, b) => {
    const d = rateOf(a).withMakeup - rateOf(b).withMakeup;
    return d !== 0 ? d : a.attendanceRate - b.attendanceRate;
  });

  /**
   * 1주차부터 마지막 완료 주까지 **전부** 그린다 (2026-08-14 리드 지시 — 8주씩 넘기던
   * 페이지를 없앴다). 8개월치를 좌우 스크롤로 훑는다. 왼쪽이 1주차(개강)다.
   */
  const weekNos = Array.from({ length: DONE_WEEKS }, (_, i) => i + 1);
  /** 주차 번호 → weeksAgo (최근 완료 주가 DONE_WEEKS번째 주 = ago 0) */
  const agoOf = (weekNo: number) => DONE_WEEKS - weekNo;
  const history = useMemo(
    () => new Map(rows.map((s) => [s.key, studentWeekHistory(s, DONE_WEEKS)])),
    [rows],
  );

  /** 기수 평균 행 — 그 주에 출석(대면·보강완료)한 사람 비율 */
  const weekAvg = (weekNo: number) => {
    const ago = agoOf(weekNo);
    const marks = rows.map((s) => history.get(s.key)?.[ago]?.mark ?? "unknown");
    const known = marks.filter((m) => m !== "unknown");
    if (known.length === 0) return null;
    const ok = known.filter((m) => m === "present" || m === "makeupDone").length;
    return Math.round((ok / known.length) * 100);
  };

  /** 엑셀(CSV) 내려받기 — 지금 보이는 축 그대로 23주 전체. BOM을 붙여 엑셀이 한글을 살린다 */
  function downloadCsv() {
    const head =
      axis === "week"
        ? ["번호", "이름", "분반", ...weekNos.map((w) => `${w}주차`), "보강 포함 %", "대면만 %"]
        : [
            "번호",
            "이름",
            "분반",
            ...weekNos.flatMap((w) =>
              sessionsOfWeek(w, weekdayPeriods).map(
                (s) => `${w}주차 ${s.weekdayLabel}(${s.sessionNo}회 ${s.lessonNo}강)`,
              ),
            ),
            "보강 포함 %",
            "대면만 %",
          ];
    const lines = rows.map((st, i) => {
      const hist = history.get(st.key) ?? [];
      const r = rateOf(st);
      const glyph = (w: number) => MARK_GLYPH[hist[agoOf(w)]?.mark ?? "unknown"];
      const cells =
        axis === "week"
          ? weekNos.map(glyph)
          : weekNos.flatMap((w) => sessionsOfWeek(w, weekdayPeriods).map(() => glyph(w)));
      return [i + 1, st.name, st.division, ...cells, r.withMakeup, r.presentOnly];
    });
    const avg: (string | number)[] = ["", "우리 기수 평균", ""];
    for (const w of weekNos) {
      const v = weekAvg(w);
      const cell = v === null ? "-" : `${v}%`;
      if (axis === "week") avg.push(cell);
      else sessionsOfWeek(w, weekdayPeriods).forEach(() => avg.push(cell));
    }
    const csv = [head, ...lines, avg]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `출결_${COHORT.cohort}_${axis === "week" ? "주차별" : "진도별"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** 주차 경계선 — 한 주의 수업 요일들이 한 짝이라 주가 바뀌는 자리에 세로줄을 세운다 */
  const weekEdge = "border-l-2 border-zion-200";
  /** 붙잡고 끌어서 23주를 훑는다 (2026-08-14) */
  const dragGrid = useDragScroll<HTMLDivElement>();

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-bold text-zion-900">
            {axis === "lesson" ? "진도별" : "주차별"} 출석 상세
          </div>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            보강 포함 출석률이 낮은 사람이 위에 옵니다 — 먼저 볼 사람이 먼저 보이게 했습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 보기 전환 — 진도별이 먼저이고 기본이다 (2026-08-14 리드 지시) */}
          <div className="flex rounded-lg bg-zion-100 p-0.5" role="tablist" aria-label="출결 표시 축">
            {(
              [
                ["lesson", "진도별"],
                ["week", "주차별"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={axis === k}
                onClick={() => setAxis(k)}
                className={
                  "rounded-md px-2.5 py-1 text-[12px] font-semibold transition " +
                  (axis === k ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={downloadCsv}
            className="rounded-lg border border-zion-200 px-2.5 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
          >
            엑셀 다운로드
          </button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
        {(["present", "makeupDone", "makeupPending", "absent", "unknown"] as const).map((m) => (
          <span key={m} className="flex items-center gap-1 text-ink-soft">
            <span
              className={
                "inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold " +
                MARK_TONE[m]
              }
            >
              {MARK_GLYPH[m]}
            </span>
            {MARK_LABEL[m]}
          </span>
        ))}
      </div>

      {/*
        23주 전체를 좌우로 훑는 자리. 표만 가로로 넘어가고 본문은 안 밀린다.
        `w-max`라 칸이 눌려 찌그러지지 않는다 — 대신 번호·이름이 왼쪽에 붙박인다.
        **붙잡고 끌어도 넘어간다** (2026-08-14 리드 지시) — `useDragScroll` 참고.
      */}
      <div
        ref={dragGrid.ref}
        onPointerDown={dragGrid.onPointerDown}
        className={"-mx-1 overflow-x-auto px-1 " + DRAG_SCROLL_CLASS}
      >
        <table className="w-max min-w-full text-[13px]">
          <thead>
            <tr className="border-b border-zion-100 text-center text-[11px] text-ink-soft">
              <th
                className="sticky z-20 bg-white pb-1"
                style={{ left: 0, minWidth: STICKY_NO_W }}
              />
              <th
                className="sticky z-20 bg-white pb-1"
                style={{ left: STICKY_NO_W, minWidth: STICKY_NAME_W }}
              />
              <th className="pb-1" />
              {axis === "lesson" ? (
                weekNos.map((w) => (
                  <th
                    key={w}
                    colSpan={sessionsOfWeek(w, weekdayPeriods).length}
                    className={"whitespace-nowrap px-1 pb-1 font-semibold text-zion-700 " + weekEdge}
                  >
                    {w}주차
                  </th>
                ))
              ) : (
                <th colSpan={weekNos.length} className={"pb-1 font-semibold text-zion-700 " + weekEdge}>
                  1~{DONE_WEEKS}주차
                </th>
              )}
              <th colSpan={3} className={"pb-1 " + weekEdge} />
            </tr>
            <tr className="border-b-2 border-zion-200 text-left text-[12px] text-ink-soft">
              <th
                className="sticky z-20 bg-white pb-2 text-center font-medium"
                style={{ left: 0, minWidth: STICKY_NO_W }}
              >
                번호
              </th>
              <th
                className="sticky z-20 bg-white pb-2 font-medium"
                style={{ left: STICKY_NO_W, minWidth: STICKY_NAME_W }}
              >
                이름
              </th>
              <th className="whitespace-nowrap pb-2 pr-2 font-medium">분반</th>
              {axis === "lesson"
                ? weekNos.flatMap((w) =>
                    sessionsOfWeek(w, weekdayPeriods).map((sess, i) => (
                      <th
                        key={sess.sessionNo}
                        className={
                          "w-9 px-1 pb-2 text-center font-medium " + (i === 0 ? weekEdge : "")
                        }
                        title={sessionLabelOf(sess)}
                      >
                        {sess.weekdayLabel}
                        <span className="block text-[9.5px] font-normal text-zion-500">
                          {sess.lessonNo}강
                        </span>
                      </th>
                    )),
                  )
                : weekNos.map((w) => (
                    <th key={w} className={"w-9 px-1 pb-2 text-center font-medium " + weekEdge}>
                      {w}
                      <span className="block text-[9.5px] font-normal text-zion-500">주</span>
                    </th>
                  ))}
              <th className={"whitespace-nowrap pb-2 pl-2 text-right font-medium " + weekEdge}>
                보강 포함
              </th>
              <th className="whitespace-nowrap pb-2 pl-2 text-right font-medium">대면만</th>
              <th className="whitespace-nowrap pb-2 pl-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, idx) => {
              const r = rateOf(s);
              const hist = history.get(s.key) ?? [];
              const cell = (weekNo: number, key: string | number, title: string, edge: boolean) => {
                const mark = hist[agoOf(weekNo)]?.mark ?? "unknown";
                return (
                  <td key={key} className={"px-1 py-2 text-center " + (edge ? weekEdge : "")}>
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded border text-[11px] font-bold " +
                        MARK_TONE[mark]
                      }
                      title={`${title} — ${MARK_LABEL[mark]}`}
                    >
                      {MARK_GLYPH[mark]}
                    </span>
                  </td>
                );
              };
              return (
                <tr key={s.key} className="group border-b border-zion-100 last:border-0">
                  <td
                    className="sticky z-10 bg-white py-2 text-center text-[12px] text-ink-soft group-hover:bg-zion-50"
                    style={{ left: 0 }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    className="sticky z-10 whitespace-nowrap bg-white py-2 pr-2 font-medium text-ink group-hover:bg-zion-50"
                    style={{ left: STICKY_NO_W }}
                  >
                    {s.name}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 text-[12px] text-ink-soft">{s.division}</td>
                  {axis === "lesson"
                    ? weekNos.flatMap((w) =>
                        sessionsOfWeek(w, weekdayPeriods).map((sess, i) =>
                          cell(w, sess.sessionNo, `${w}주차 · ${sessionLabelOf(sess)}`, i === 0),
                        ),
                      )
                    : weekNos.map((w) => cell(w, w, `${w}주차`, true))}
                  <td className={"py-2 pl-2 text-right font-semibold text-zion-800 " + weekEdge}>
                    {r.withMakeup}%
                  </td>
                  <td className="py-2 pl-2 text-right text-[12px] text-ink-soft">{r.presentOnly}%</td>
                  <td className="py-2 pl-3">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              );
            })}
            {/* 우리 기수 평균 — 맨 아래 한 줄 */}
            <tr className="border-t-2 border-zion-200 bg-zion-50 text-[12px]">
              <td className="sticky z-10 bg-zion-50 py-2" style={{ left: 0 }} />
              <td
                className="sticky z-10 whitespace-nowrap bg-zion-50 py-2 pr-2 font-bold text-zion-800"
                style={{ left: STICKY_NO_W }}
              >
                우리 기수 평균
              </td>
              <td className="py-2" />
              {weekNos.map((w) => {
                const v = weekAvg(w);
                return (
                  <td
                    key={w}
                    colSpan={axis === "lesson" ? sessionsOfWeek(w, weekdayPeriods).length : 1}
                    className={"px-1 py-2 text-center font-semibold text-zion-700 " + weekEdge}
                  >
                    {v === null ? "—" : `${v}%`}
                  </td>
                );
              })}
              <td colSpan={3} className={weekEdge} />
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        출결 원본은 읽기 전용 시트에서 동기화됩니다 — 이 화면에서 수정할 수 없고, 원본 수정 후 다음
        동기화를 기다립니다. <strong>왼쪽이 1주차</strong>이고 23주차까지 좌우로 넘겨 봅니다 —
        번호·이름은 따라다닙니다. 「보강 포함」·「대면만」 비율은 <strong>최근 8주 기준</strong>입니다.
        {axis === "lesson" && (
          <>
            {" "}
            ⚠️ 목업 출결이 주 단위라 <strong>한 주의 세 회차(월·화·목)는 그 주의 표기를 따릅니다</strong> —
            실연동 시 시트의 회차별 값이 그대로 들어옵니다. 회차·과수 매핑은 시범 값입니다.
          </>
        )}
      </p>
    </Card>
  );
}

/**
 * 8개월 출석 흐름 — 꺾은선 (2026-08-13 리드 지시).
 * 선 셋: 우리 기수 · 우리 지파 평균 · 12지파 평균. 색과 무늬를 함께 써서 가른다.
 * 실적이 없는 미래 주는 **선이 끊긴다** — 0으로 그리면 폭락처럼 보이기 때문이다.
 */
/**
 * 2026-08-14 피드백 FB-03 — 셋을 더했다:
 * (a) Y축 동적 스케일 — 데이터 min~max에 5%p 여유. 0~100 고정으로는 선 차이가 안 보였다
 * (b) X축 토글 [월별|회차별|진도별] — 달력으로 비교하면 개강 시점이 다른 기수끼리
 *     불공정하다(3월 초 개강 vs 3월 말 개강). 이 그래프의 주 축은 애초에 「개강 후 N주」라
 *     회차별 = 그 주까지 마친 회차, 진도별 = 그 회차의 강이다. **실연동에서 타 기수
 *     계열이 들어와도 같은 「개강 후 N회차」 축으로 정렬해 합류한다** — 매핑은
 *     `curriculum-mock.ts`(FB-02와 공유, 중복 구현 금지)
 * (c) 복사 버튼 — 지금 보이는 상태 그대로 이미지로 클립보드에 담는다. 미지원 환경은
 *     PNG 내려받기로 폴백. ⚠️ 이 차트는 집계 3계열뿐이라 「집계·통계만 반출」 원칙에
 *     어긋나지 않는다 — 개인 이름·개인 출결을 이 차트에 넣게 되면 복사 버튼부터 다시 본다
 */
type TrendAxis = "month" | "session" | "lesson";

function EightMonthTrend() {
  const [xAxis, setXAxis] = useState<TrendAxis>("month");
  const [copied, setCopied] = useState<"idle" | "copied" | "downloaded">("idle");
  const chartRef = { current: null as HTMLDivElement | null };

  const xLabels = useMemo(() => {
    if (xAxis === "month") {
      const out: { at: number; label: string }[] = [];
      let last = "";
      WEEKLY_RATES.forEach((r, i) => {
        const month = `${Number(r.weekOf.slice(5, 7))}월`;
        if (month !== last) {
          out.push({ at: i, label: month });
          last = month;
        }
      });
      return out;
    }
    // 회차별·진도별 — 6주 간격으로 「N회차」 또는 그 회차의 강을 적는다
    return WEEKLY_RATES.map((_, i) => i)
      .filter((i) => i % 6 === 0)
      .map((i) => {
        const n = sessionsThroughWeek(i + 1);
        return {
          at: i,
          label: xAxis === "session" ? `${n}회차` : `${lessonOfSession(Math.max(1, n)).lessonNo}강`,
        };
      });
  }, [xAxis]);

  /** Y축 동적 범위 — 실측값 min~max에 5%p 여유 (FB-03ⓐ). 0~100 고정 금지 */
  const yRange = useMemo(() => {
    const all = WEEKLY_RATES.flatMap((r) => [r.rate, r.tribeAvg, r.allAvg]).filter(
      (v): v is number => v !== null,
    );
    return {
      min: Math.max(0, Math.floor(Math.min(...all)) - 5),
      max: Math.min(100, Math.ceil(Math.max(...all)) + 5),
    };
  }, []);

  /**
   * 차트 복사 (FB-03ⓒ) — SVG를 캔버스에 옮겨 클립보드로. SVG가 팔레트를 CSS 클래스로
   * 입고 있어 **계산된 색을 인라인으로 박은 사본**을 만들어 그린다 — 안 하면 흑백이 나온다.
   */
  async function copyChart() {
    const host = chartRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const orig = svg.querySelectorAll("line, polyline");
    clone.querySelectorAll("line, polyline").forEach((el, i) => {
      const cs = getComputedStyle(orig[i]);
      el.setAttribute("stroke", cs.stroke);
      el.setAttribute("stroke-width", cs.strokeWidth);
    });
    const w = svg.clientWidth || 640;
    const h = svg.clientHeight || 170;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }),
    );
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const pad = 16;
    const legendH = 24;
    const cv = document.createElement("canvas");
    cv.width = (w + pad * 2) * 2;
    cv.height = (h + pad * 2 + legendH) * 2;
    const ctx = cv.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w + pad * 2, h + pad * 2 + legendH);
    ctx.drawImage(img, pad, pad, w, h);
    URL.revokeObjectURL(url);
    // 범례는 HTML이라 캔버스에 직접 적는다
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#334";
    const axisLabel = xAxis === "month" ? "월별" : xAxis === "session" ? "회차별" : "진도별";
    ctx.fillText(
      `${COHORT.cohort} 출석 흐름 (${axisLabel}) — 실선 우리 기수 · 긴점선 지파 평균 · 짧은점선 12지파 평균`,
      pad,
      h + pad + 16,
    );
    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
    if (!blob) return;
    try {
      // http·미지원 브라우저에서는 아래 폴백으로 떨어진다
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied("copied");
    } catch {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `출석흐름_${COHORT.cohort}_${axisLabel}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      setCopied("downloaded");
    }
    setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[14px] font-bold text-zion-900">8개월 출석 흐름</div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-zion-100 p-0.5" role="tablist" aria-label="흐름 그래프 X축">
            {(
              [
                ["month", "월별"],
                ["session", "회차별"],
                ["lesson", "진도별"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={xAxis === k}
                onClick={() => setXAxis(k)}
                className={
                  "rounded-md px-2.5 py-1 text-[12px] font-semibold transition " +
                  (xAxis === k ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={copyChart}
            className="rounded-lg border border-zion-200 px-2.5 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
          >
            {copied === "copied" ? "복사됨 ✓" : copied === "downloaded" ? "PNG 저장됨" : "복사"}
          </button>
        </div>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
        개강부터 종강 예정까지 {WEEKLY_RATES.length}주 전체입니다. 축은 「개강 후 N주」 기준이라
        개강 시점이 다른 기수와 견줘도 어긋나지 않습니다. 선이 끊긴 곳부터는 아직 오지 않은
        주입니다. 주차를 하나씩 파려면 아래 막대에서 누르세요.
      </p>
      <div
        ref={(el) => {
          chartRef.current = el;
        }}
      >
        <LineChart
          ariaLabel="주차별 출석률 — 우리 기수·지파 평균·12지파 평균 비교"
          yMin={yRange.min}
          yMax={yRange.max}
          series={[
            { label: "우리 기수", strokeClass: "stroke-zion-700", points: WEEKLY_RATES.map((r) => r.rate) },
            {
              label: "우리 지파 평균",
              strokeClass: "stroke-gold-500",
              dash: "6 4",
              points: WEEKLY_RATES.map((r) => r.tribeAvg),
            },
            {
              label: "12지파 평균",
              strokeClass: "stroke-zion-400",
              dash: "2 3",
              points: WEEKLY_RATES.map((r) => r.allAvg),
            },
          ]}
          xLabels={xLabels}
        />
      </div>
    </Card>
  );
}

/** 주차를 좌우로 넘기는 페이저 — 주간 흐름 막대와 출석 격자가 같이 쓴다 (2026-08-13) */
function WeekPager({
  rangeLabel,
  onOlder,
  onNewer,
  olderDisabled,
  newerDisabled,
}: {
  rangeLabel: string;
  onOlder: () => void;
  onNewer: () => void;
  olderDisabled: boolean;
  newerDisabled: boolean;
}) {
  const btn = (disabled: boolean) =>
    "flex h-7 w-7 items-center justify-center rounded-lg border transition " +
    (disabled
      ? "cursor-not-allowed border-zion-100 text-zion-300"
      : "border-zion-200 text-zion-700 hover:bg-zion-50");
  return (
    <div className="flex items-center gap-2">
      <button onClick={onOlder} disabled={olderDisabled} aria-label="이전 주차 보기" className={btn(olderDisabled)}>
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[7rem] text-center text-[12px] font-semibold text-zion-800">{rangeLabel}</span>
      <button onClick={onNewer} disabled={newerDisabled} aria-label="다음 주차 보기" className={btn(newerDisabled)}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

const TREND_PAGE = 8;

/**
 * 주간 흐름 — 우리 기수의 주별 출석률과 지파 평균을 함께 본다.
 * 크게 떨어진 주는 **왜 그랬는지와 어떻게 넘겼는지**를 함께 보여 준다.
 * 그 설명은 자동 산출이 아니라 담당자가 적는 기록이다 —
 * **해당 기수의 강사·전도사만** 적고 고칠 수 있다 (2026-08-06 확정).
 *
 * 2026-08-13 — 35주 전체를 받아 **8주씩 좌우로 넘긴다** (리드 지시).
 * 실적이 없는 미래 주는 점선 빈 막대(「예정」)로 두고 누를 수 없다.
 */
function WeeklyTrend({ rows }: { rows: WeeklyRate[] }) {
  const session = useSession();
  const { weekNotes, saveWeekNote } = useStore();
  const pageCount = Math.max(1, Math.ceil(rows.length / TREND_PAGE));
  /** 오늘이 든 페이지에서 시작 — 실적이 있는 마지막 주가 있는 쪽 */
  const initialPage = (() => {
    const lastDone = rows.reduce((acc, r, i) => (r.rate !== null ? i : acc), 0);
    return Math.min(pageCount - 1, Math.floor(lastDone / TREND_PAGE));
  })();
  const [page, setPage] = useState(initialPage);
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const max = 100;
  /** 막대를 붙잡고 끌어서 넘긴다 (2026-08-14) — 문턱이 있어 막대 클릭은 그대로 산다 */
  const dragTrend = useDragScroll<HTMLDivElement>();

  const cohortKey = cohortKeyOf(session);
  const canEdit = canEditCohortRecord(session, cohortKey);

  /** 사람이 적은 기록이 있으면 그것이 우선, 없으면 목업의 기본 설명 */
  const noteOf = (week: string) => weekNotes.find((n) => n.cohortKey === cohortKey && n.week === week);
  const merged = rows.map((r) => {
    const n = noteOf(r.week);
    return { ...r, reason: n ? n.reason : r.reason, overcome: n ? n.overcome : r.overcome, note: n };
  });
  const pageRows = merged.slice(page * TREND_PAGE, page * TREND_PAGE + TREND_PAGE);
  const current = picked !== null ? merged[picked] : null;

  function go(nextPage: number) {
    setPage(nextPage);
    setPicked(null); // 보고 있던 주가 화면 밖으로 나가므로 선택을 푼다
  }

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[14px] font-bold text-zion-900">주간 출석률 흐름</div>
        <WeekPager
          rangeLabel={`${page * TREND_PAGE + 1}~${Math.min(rows.length, (page + 1) * TREND_PAGE)}주차`}
          onOlder={() => go(page - 1)}
          onNewer={() => go(page + 1)}
          olderDisabled={page === 0}
          newerDisabled={page === pageCount - 1}
        />
      </div>
      <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
        막대는 우리 기수, 가로선은 같은 지파 최근 3개 기수 평균입니다. 사유가 적힌 주는 밑줄로
        표시되며, 누르면 그 주에 무슨 일이 있었는지 볼 수 있습니다. 좌우 단추로 주차를 넘깁니다.
      </p>

      {/* 막대도 붙잡고 끌어서 넘긴다 (2026-08-14 리드 지시) */}
      <div
        ref={dragTrend.ref}
        onPointerDown={dragTrend.onPointerDown}
        className={"-mx-1 overflow-x-auto px-1 " + DRAG_SCROLL_CLASS}
      >
        <div className="flex min-w-[520px] items-end gap-2" role="img" aria-label="주간 출석률과 지파 평균 비교">
          {pageRows.map((r, i) => {
            const globalIndex = page * TREND_PAGE + i;
            if (r.rate === null) {
              // 아직 오지 않은 주 — 자리만 지킨다
              return (
                <div key={r.week} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${r.week} — 예정`}>
                  <span className="text-[10px] text-ink-soft">예정</span>
                  <div className="flex h-[150px] w-full items-end">
                    <div className="h-full w-full rounded-t border border-dashed border-zion-200" />
                  </div>
                  <span className="text-[9px] leading-tight text-ink-soft">{r.week}</span>
                </div>
              );
            }
            return (
              <button
                key={r.week}
                onClick={() => setPicked(picked === globalIndex ? null : globalIndex)}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1"
                title={`${r.week} — 우리 ${r.rate}% · 지파 평균 ${r.tribeAvg}%`}
              >
                <span className="text-[11px] font-semibold text-zion-800">{r.rate}</span>
                <div className="relative flex h-[150px] w-full items-end">
                  <div
                    className={
                      "w-full rounded-t transition " +
                      (picked === globalIndex ? "bg-zion-800" : "bg-zion-600 group-hover:bg-zion-500")
                    }
                    style={{ height: `${(r.rate / max) * 150}px` }}
                  />
                  {/* 지파 평균 기준선 */}
                  {r.tribeAvg !== null && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-gold-500"
                      style={{ bottom: `${(r.tribeAvg / max) * 150}px` }}
                      title={`지파 평균 ${r.tribeAvg}%`}
                    />
                  )}
                </div>
                <span
                  className={
                    "text-[9px] leading-tight text-ink-soft " + (r.reason ? "underline decoration-dotted" : "")
                  }
                >
                  {r.week}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-zion-600" /> 우리 기수
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-gold-500" /> 지파 최근 3개 기수 평균
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-3 rounded-sm border border-dashed border-zion-200" /> 예정(실적 없음)
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
    <Portal>
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
    </Portal>
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
