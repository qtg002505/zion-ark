import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { Navigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Users } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { cohortKeyOf, studentScopeLabel, visibleDivisions } from "../lib/permissions";
import {
  STUDENTS,
  DIVISIONS,
  COHORT,
  COHORT_FUNNEL,
  COHORT_STAFF,
  SCHEDULE,
  TOTAL_SESSIONS,
} from "../content/cohort-mock";
import {
  effectiveSchedule,
  progressPct,
  scheduleSummary,
  weekNoOf,
} from "../lib/cohort-calendar";
/* 분류 대시보드 (2026-08-22 전체 현황 폐지) — 기수 요약 상단으로 옮겨 왔다 */
import { ClassifyDashboard } from "./OverviewClassify";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { CohortNow } from "./CohortNow";
import { lessonOfSession, sessionsThroughWeek, LEVEL_TONE } from "../content/curriculum-mock";
import { cohortRates, cohortTotals, rateOf } from "../lib/attendance-rate";
import {
  DIVISION_EVANGELISTS,
  ENROLLMENT_STATUS_DEFAULT,
  FAITH_STATUS_LABELS,
  STUDENT_PROFILES,
  type EnrollmentStatus,
  type FaithStatus,
} from "../content/student-profiles";
import type { Student } from "../lib/types";
import { PageHeader, Card, StatTile } from "./common";

type Tab = "summary" | "now";

/**
 * 탭 둘 (2026-08-22 리드 피드백 5로 재편 — 종전 여섯).
 * - 출석 현황·주간 흐름·비교는 **독립 화면 `/attendance`로 나가 한 화면에 병합**됐다
 *   (`CohortAttendance.tsx`). 옛 주소는 아래 리다이렉트가 받는다
 * - 「분반별 현황」·「진도별 보강 포함 현황」은 **영구 제외**다 — 되살릴 때는 git 이력
 * ⚠️ 종전의 `COHORT_TABS` export(사이드바 파생)는 없앴다 — 셸(nav.ts)이 이 파일을
 * 정적으로 끌지 않게 됐다(셸에 무거운 것 금지 규칙). 사이드바 항목은 nav.ts에 직접 적는다.
 */
const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "기수 요약" },
  /* 2026-08-15 리드 지시로 신설 — 단계 기준표를 기수 단위로 뒤집어 본다 */
  { id: "now", label: "지금 우리 기수는?" },
];
const TAB_IDS: Tab[] = TABS.map((t) => t.id);

/** 옛 주소 → 새 화면 — 이 탭들은 /attendance 한 화면으로 병합됐다 (북마크 보호) */
const MOVED_TABS = ["attendance", "trend", "compare"];

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


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
  const { weekdayPeriods, startsOn, endsOn } = effectiveSchedule(
    SCHEDULE,
    scheduleOverrides,
    cohortKeyOf(session),
  );
  const [searchParams, setSearchParams] = useSearchParams();
  /**
   * 지금 탭은 **주소가 정본**이다 (2026-08-15 리드 수정 지시).
   *
   * 잠깐 아코디언으로 바꿨다가 되돌렸다 — 리드 지시는 「**왼쪽 대카테고리에서 펼치고**,
   * 우측 큰 창에서는 지난번처럼 가로 열로 눌러서」다. 사이드바(`nav.ts`)의 「기수 요약」
   * 항목이 `?tab=…`로 걸리고, 이 화면은 그 값을 그대로 읽어 탭을 고른다.
   * ⚠️ `useState` 초기값으로 두면 **사이드바에서 다른 항목을 눌러도 화면이 안 바뀐다**
   * (컴포넌트가 그대로 살아 있어 초기값이 다시 안 읽힌다) — 파생 값으로 둔 이유다.
   */
  const rawTab = searchParams.get("tab");
  const tab: Tab = TAB_IDS.includes(rawTab as Tab) ? (rawTab as Tab) : "summary";
  const setTab = (next: Tab) => setSearchParams(next === "summary" ? {} : { tab: next });
  /** 화면을 처음 열 때는 움직이지 않는다 — 딥링크(`?tab=`)로 들어온 사람을 끌고 다니지 않게 */
  const firstTabRender = useRef(true);

  /*
    ⚠️ **탭이 바뀐 뒤에 자리를 맞춘다** (리드 지적 — 「탭 버튼에 따라 위치 이동이 있다」).
    탭마다 내용 길이가 크게 다른데 스크롤 자리는 그대로 남아, 아래쪽에서 탭을 누르면
    **엉뚱한 대목이 펼쳐진 채로** 보였다.

    ⚠️ **맨 위로 보낸다 — 탭 줄 자리를 계산하지 않는다.** 두 번 시도해 보고 접은 방법이다:
    누르는 순간에 옮기면 아직 **옛 내용의 높이**라 187px 어긋났고, 렌더 뒤에 옮겨도
    기수 요약처럼 무거운 탭은 **그 뒤에 또 높이가 바뀌어** 105px 어긋났다(둘 다 실측).
    맨 위는 레이아웃 변화와 경쟁하지 않아 언제나 같은 결과가 나오고, 탭 줄은 화면 위쪽에
    있으므로 함께 보인다.
  */
  useEffect(() => {
    if (firstTabRender.current) {
      firstTabRender.current = false;
      return;
    }
    /*
      ⚠️ **두 번 보낸다.** 한 번만 부르면 356px 자리에 멈춘다(실측) — 브라우저의 스크롤
      앵커링이 「보이던 것을 계속 보이게」 하려고 되돌리고, 무거운 탭은 그 뒤에 높이가 또
      바뀌기 때문이다. 렌더가 가라앉은 뒤 한 번 더 확정한다.
      ⚠️ `behavior`는 즉시(`auto`)다 — 부드럽게 굴리는 동안 높이가 바뀌면 중간에 멈춘다.
    */
    const go = () => window.scrollTo({ top: 0, behavior: "auto" });
    go();
    const t = setTimeout(go, 120);
    return () => clearTimeout(t);
  }, [tab]);

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

  /**
   * 수강생 구성 — 신앙 여부 · 등록 구분 · 유월 (2026-08-18 리드 지시 「한눈에 보이면 좋겠다」).
   * 담당자가 고친 값이 있으면 그쪽을, 없으면 씨앗 프로필을 쓴다 — 다른 화면과 같은 규칙이다.
   */
  const mix = useMemo(() => {
    const count = <T extends string>(pick: (s: Student) => T) => {
      const m = new Map<T, number>();
      for (const s of students) {
        const v = pick(s);
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      return m;
    };
    const prof = (s: Student) => STUDENT_PROFILES[s.key];
    return {
      faith: count((s) => overrideByKey[s.key]?.faithStatus ?? prof(s).faithStatus),
      registration: count((s) => overrideByKey[s.key]?.registrationType ?? prof(s).registrationType),
      yuwol: count((s) => overrideByKey[s.key]?.faithType ?? prof(s).faithType),
    };
  }, [students, overrideByKey]);

  /*
    「출석률 분포」 히스토그램은 2026-08-14 피드백 CHG-01(담당자 확정 지시)로 뺐다 —
    구간 계산(buckets)도 이 화면만 쓰던 것이라 함께 지웠다. 되살릴 때는 git 이력에서 꺼낸다.
  */

  /**
   * 보강 포함 출석률 — 보강까지 마친 것을 출석으로 함께 센 실제 출석률.
   * 대면만 세면 보강으로 따라잡은 사람이 결석자와 같이 묶여 실제보다 나빠 보인다.
   */
  const rates = useMemo(() => cohortRates(students), [students]);
  /** 실제 횟수 — 퍼센트 옆에 「몇 번 중 몇 번인지」를 함께 내기 위한 값 (2026-08-18) */
  const totals = useMemo(() => cohortTotals(students), [students]);

  /*
   * 분류 대시보드의 파생 계산 (2026-08-22 전체 현황 폐지로 Overview에서 옮겨 왔다).
   * 진도 칸 규칙 그대로 — **바탕색이 단계를 알리고 글자는 과수 제목**(2026-08-21 학원법).
   */
  const schedSummary = scheduleSummary(startsOn, endsOn, weekdayPeriods);
  const progress = progressPct(startsOn, endsOn, todayYmd());
  const currentWeekNo = Math.min(schedSummary.weeks, Math.max(1, weekNoOf(startsOn, todayYmd())));
  const currentLesson = useMemo(() => {
    const sessionNo = sessionsThroughWeek(currentWeekNo, weekdayPeriods);
    return lessonOfSession(Math.max(1, sessionNo));
  }, [currentWeekNo, weekdayPeriods]);
  const currentLessonNode = currentLesson.undecided ? (
    <span className="text-ink-soft">미정</span>
  ) : (
    <span className={"rounded px-1 py-0.5 text-[11px] font-bold " + LEVEL_TONE[currentLesson.level]}>
      {currentLesson.keyword}
    </span>
  );
  /** 분류표·상태판에서 이름을 누르면 상세 팝업 — 수강생 현황과 같은 방식 */
  const [modalKey, setModalKey] = useState<string | null>(null);

  /*
   * 옛 주소 흡수 (2026-08-22) — 출석 현황·주간 흐름·비교는 /attendance 한 화면으로
   * 병합됐다. 북마크가 죽지 않게 넘긴다. ⚠️ 훅이 전부 돈 뒤의 조기 반환이라 훅 순서는 안전하다.
   * `tab=divisions`(영구 제외)는 TAB_IDS 폴백이 기수 요약으로 받는다 — 목적지가 없다.
   */
  if (rawTab !== null && MOVED_TABS.includes(rawTab)) {
    return <Navigate to="/attendance" replace />;
  }

  return (
    <div>
      <PageHeader
        crumb="기수 현황"
        title="기수 현황"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 진도 ${TOTAL_SESSIONS}회 · 조회 범위 ${studentScopeLabel(session)} (시범 목업 데이터)`}
      />

      {/*
        가로 탭 (2026-08-15 리드 수정 지시로 **되돌렸다**). 잠깐 아코디언으로 바꿨으나
        「왼쪽 대카테고리에서 펼치고, 우측 큰 창은 지난번처럼 가로 열」이 리드의 뜻이다.
        누르면 주소(`?tab=`)가 바뀌므로 **사이드바 항목과 이 탭이 늘 같은 곳을 가리킨다.**
      */}
      {/*
        ⚠️ **탭을 바꾸면 그 줄이 보이도록 맞춘다** (2026-08-18 리드 지적 — 「탭 버튼에 따라
        위치 이동이 있다」). 탭마다 내용 길이가 크게 다른데 스크롤 자리는 그대로 남아서,
        아래쪽에서 탭을 누르면 **엉뚱한 대목이 펼쳐진 채로** 보였다. 화면이 흔들린 것처럼
        읽히는 것이 이 때문이다. `scroll-mt-20`은 붙박이 머리에 가려지지 않을 만큼의 여백이다.
      */}
      <div className="scroll-mt-20">
        <SegmentedTabs
          label="기수 현황 탭"
          className="mb-5"
          scroll
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ id: t.id, label: t.label }))}
        />
      </div>

      {tab === "summary" && (
        <>
          {/*
            수강생 분류 대시보드 (2026-08-22 리드 지시 — 전체 현황을 없애고 그 핵심을
            기수 요약 상단에 병합했다). 등급별 분류표 · 상태 묶음판 · KPI 줄 · (i) 산출 기준.
          */}
          <ClassifyDashboard
            onOpenStudent={setModalKey}
            progress={progress}
            currentWeekNo={currentWeekNo}
            currentLessonNode={currentLessonNode}
          />

          {/*
            기수 요약 퍼널 (2026-08-13 리드 지시) — 신카부터 예상 종강까지의 흐름.
            접어 둘 수 있다(리드 요청 「접어놓기 기능」) — <details>라 상태 저장 없이 접힌다.

            **2026-08-18 리드 지시로 이 카드가 기수 요약의 맨 위다.**
            ⚠️ 여기에 **개강 1·4주차 출석이 이미 들어 있다**(총회 점검 기준). 같은 날 그 지표를
            따로 만든 카드를 올렸다가 **뺐다** — 퍼널은 「신카 → 등록」 흐름의 분모를 쓰고
            새 카드는 등록 수강생 출결을 썼기에 **같은 이름 아래 다른 숫자**가 두 번 보였다.
            되살릴 때는 git 이력에서 `CheckpointCard`를 꺼낸다(커밋 2fec452).
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

          {/* 수강생 구성 — 신앙 여부·등록 구분·유월을 한눈에 (2026-08-18 리드 지시) */}
          <MixCard mix={mix} total={students.length} />

          <div className="mt-5 grid grid-cols-3 gap-3 max-md:grid-cols-1">
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
            종전 이 자리의 「대면 시간대」 그래프도 2026-08-10에 같은 방식으로 뺐다 —
            시간대 집계(`slotCounts`)는 데이터에 남아 있다(불변식 10).
            오른쪽에 있던 「진도별 보강 포함 현황」(`LessonRateStrip`)은 **2026-08-22 리드
            지시로 영구 제외**했다 — 되살릴 때는 git 이력에서 꺼낸다.
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
              {/*
                퍼센트 옆에 **실제 횟수**를 함께 낸다 (2026-08-18 리드 지시).
                ⚠️ 퍼센트는 **사람 단위 비율의 평균**이고 괄호 안 숫자는 **칸을 그대로 센 것**이라
                둘을 나눈 값이 1~2%p 다를 수 있다 — 사람마다 분모가 달라서다. 대표 숫자는
                평균을 쓰고, 횟수는 「몇 번 중 몇 번인지」를 보여 주는 데만 쓴다.
              */}
              {(
                [
                  ["보강 포함 (대면 + 보강 완료)", rates.withMakeup, totals.present + totals.makeupDone],
                  ["대면만", rates.presentOnly, totals.present],
                ] as const
              ).map(([label, v, n]) => (
                <div key={label} className="mb-2.5">
                  <div className="mb-1 flex justify-between gap-2 text-[12px]">
                    <span className="min-w-0 truncate text-ink-soft">{label}</span>
                    <span className="shrink-0 font-semibold text-zion-800">
                      {v}%
                      <span className="ml-1 text-[11px] font-normal text-ink-soft">
                        {n}/{totals.counted}회
                      </span>
                    </span>
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

            {/* 전도사별 수강생 상태 (2026-08-18 리드 지시) — 누르면 그 반 명단이 펼쳐진다 */}
            <StaffByDivision students={students} />
          </Card>
        </>
      )}

      {tab === "now" && <CohortNow students={students} />}

      {/*
        출석 현황·주간 흐름·비교 탭은 2026-08-22 리드 피드백 5로 **독립 화면 /attendance에
        병합**됐다 (`CohortAttendance.tsx`). 「분반별 현황」 탭은 같은 날 **영구 제외** —
        되살릴 때는 git 이력에서 divisions 분기를 꺼낸다.
      */}

      {modalKey && <StudentDetailModal studentKey={modalKey} onClose={() => setModalKey(null)} />}
    </div>
  );
}

/**
 * 전도사별 수강생 상태 (2026-08-18 리드 지시 — 「전도사별 수강생 대략의 상태」).
 *
 * 분반이 곧 담당 전도사 자리라 분반으로 묶는다. 줄을 누르면 그 반 **명단**이 펼쳐진다.
 *
 * ⚠️ **새 판정을 만들지 않는다** — 출석률은 다른 화면과 같은 `rateOf`를 쓰고,
 * 「손이 필요한 분」은 보강 포함 출석률이 70% 미만인 사람을 센 것일 뿐이다.
 * 그 경계는 화면 표시용이지 등급(A~E)이 아니다.
 */
function StaffByDivision({ students }: { students: Student[] }) {
  const NEEDS_HELP_MAX = 70;
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const byDivision = new Map<string, Student[]>();
    for (const s of students) byDivision.set(s.division, [...(byDivision.get(s.division) ?? []), s]);
    return [...byDivision.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([division, list]) => {
        const rates = list.map((s) => rateOf(s).withMakeup);
        const avg = rates.length === 0 ? 0 : Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
        return {
          division,
          list: [...list].sort((a, b) => rateOf(a).withMakeup - rateOf(b).withMakeup),
          avg,
          needsHelp: rates.filter((r) => r < NEEDS_HELP_MAX).length,
        };
      });
  }, [students]);

  return (
    <div className="mt-4 border-t border-zion-100 pt-3">
      <div className="mb-2 text-[12px] font-semibold text-ink">전도사별 수강생</div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const isOpen = open === r.division;
          return (
            <li key={r.division} className="rounded-lg border border-zion-200">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : r.division)}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left transition hover:bg-zion-50"
              >
                <ChevronDown
                  size={14}
                  className={"shrink-0 text-zion-600 transition-transform " + (isOpen ? "" : "-rotate-90")}
                />
                <span className="text-[13px] font-semibold text-ink">
                  {DIVISION_EVANGELISTS[r.division] ?? r.division}
                </span>
                <span className="text-[11px] text-ink-soft">{r.division} · {r.list.length}명</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-[12px] text-ink-soft">
                    평균 <strong className="font-bold text-zion-800">{r.avg}%</strong>
                  </span>
                  {r.needsHelp > 0 && (
                    <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-700">
                      손이 필요한 분 {r.needsHelp}명
                    </span>
                  )}
                </span>
              </button>

              {isOpen && (
                <ul className="divide-y divide-zion-100 border-t border-zion-100">
                  {r.list.map((s) => {
                    const rt = rateOf(s);
                    return (
                      <li key={s.key} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                        <span className="w-16 shrink-0 truncate font-medium text-ink">{s.name}</span>
                        <span className="w-12 shrink-0 text-right font-semibold text-zion-800">
                          {rt.withMakeup}%
                        </span>
                        <span className="w-14 shrink-0 text-[11px] text-ink-soft">
                          {rt.presentCount + rt.makeupDoneCount}/{rt.counted}회
                        </span>
                        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zion-100">
                          <span
                            className="block h-full rounded-full bg-zion-700"
                            style={{ width: `${rt.withMakeup}%` }}
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
        「손이 필요한 분」은 보강 포함 출석률 {NEEDS_HELP_MAX}% 미만입니다 — 화면 표시용 경계이지
        등급이 아닙니다.
      </p>
    </div>
  );
}

/**
 * 수강생 구성 — **신앙 여부 · 등록 구분 · 유월** (2026-08-18 리드 지시).
 *
 * 「신앙인·무신앙인 비율, 재수강자·재입교자 등이 한눈에 보이면 좋겠다」는 지시.
 * 신앙 여부만 도넛으로 그리고 나머지 둘은 가로 막대다 — 셋 다 원으로 그리면 화면이
 * 무거워지고, 정작 먼저 봐야 할 것이 묻힌다.
 *
 * ⚠️ **색만으로 뜻을 전하지 않는다** — 조각마다 이름과 인원을 글자로 함께 적는다.
 * ⚠️ 도넛은 SVG 한 겹으로 그린다 — 차트 라이브러리를 들이면 번들이 수백 KB 는다
 * (엑셀·마크다운을 직접 다루는 것과 같은 판단이다).
 */
function MixCard({
  mix,
  total,
}: {
  mix: { faith: Map<string, number>; registration: Map<string, number>; yuwol: Map<string, number> };
  total: number;
}) {
  /** 도넛 조각 색 — 신앙/무신앙/기타 세 갈래뿐이라 진하기로 가른다 */
  const FAITH_TONE: Record<string, string> = {
    신앙: "var(--color-zion-700)",
    무신앙: "var(--color-zion-300)",
    기타: "var(--color-zion-500)",
  };
  const faithOrder = ["신앙", "무신앙", "기타"].filter((k) => (mix.faith.get(k) ?? 0) > 0);

  const R = 42;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <Card className="mt-5">
      <div className="mb-3 text-[14px] font-bold text-zion-900">수강생 구성</div>

      <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
        {/* 신앙 여부 — 도넛 */}
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90 shrink-0" role="img" aria-label="신앙 여부 비율">
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="14" className="stroke-zion-100" />
            {faithOrder.map((k) => {
              const n = mix.faith.get(k) ?? 0;
              const len = total === 0 ? 0 : (n / total) * C;
              /*
                ⚠️ 조각 사이에 **틈**을 둔다. 팔레트가 남색 한 계열이라 어두운 화면에서
                조각끼리 대비가 2.33까지 떨어진다(실측) — 틈으로 트랙이 비치면 색이 비슷해도
                경계가 보인다. 세그먼트 탭에서 빗금으로 푼 것과 같은 취지다.
              */
              const gap = 2;
              const el = (
                <circle
                  key={k}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  strokeWidth="14"
                  stroke={FAITH_TONE[k] ?? "var(--color-zion-500)"}
                  strokeDasharray={`${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += len;
              return el;
            })}
          </svg>
          <ul className="space-y-1.5 text-[12px]">
            {faithOrder.map((k) => {
              const n = mix.faith.get(k) ?? 0;
              return (
                <li key={k} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: FAITH_TONE[k] ?? "var(--color-zion-500)" }}
                  />
                  <span className="text-ink">{FAITH_STATUS_LABELS[k as FaithStatus] ?? k}</span>
                  <span className="font-semibold text-zion-800">
                    {n}명
                    <span className="ml-1 font-normal text-ink-soft">
                      {total === 0 ? 0 : Math.round((n / total) * 100)}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 등록 구분 · 유월 — 가로 막대 */}
        <div className="space-y-4">
          {(
            [
              ["등록 구분", mix.registration, ["신규", "재수강", "재입교"]],
              ["유월", mix.yuwol, ["오픈", "비오픈", "신앙전환"]],
            ] as const
          ).map(([label, map, order]) => (
            <div key={label}>
              <div className="mb-1.5 text-[12px] font-semibold text-ink">{label}</div>
              <div className="space-y-1.5">
                {order
                  .filter((k) => (map.get(k) ?? 0) > 0)
                  .map((k) => {
                    const n = map.get(k) ?? 0;
                    const pct = total === 0 ? 0 : Math.round((n / total) * 100);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-[11.5px] text-ink-soft">{k}</span>
                        <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zion-100">
                          <span className="block h-full rounded-full bg-zion-700" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="w-16 shrink-0 text-right text-[11.5px] font-semibold text-zion-800">
                          {n}명
                          <span className="ml-1 font-normal text-ink-soft">{pct}%</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
        담당자가 수강생 상세에서 고친 값이 있으면 그 값으로 셉니다. 시범 목업 데이터(가상 인물)입니다.
      </p>
    </Card>
  );
}
