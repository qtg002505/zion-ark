import { useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { cohortKeyOf, studentScopeLabel, visibleDivisions } from "../lib/permissions";
import {
  STUDENTS,
  DIVISIONS,
  COHORT,
  COHORT_FUNNEL,
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
import { lessonOfSession, sessionsThroughWeek, LEVEL_TONE } from "../content/curriculum-mock";
import { STUDENT_PROFILES } from "../content/student-profiles";
/* 복합 분석 — 수강생 현황과 같은 부품 한 벌 (2026-08-23 리드 지시로 맨 하단 접이식) */
import { AnalysisGrid } from "../components/CompositeAnalysis";
import { PageHeader, Card } from "./common";

/**
 * 탭 없음 (2026-08-23 리드 지시 — 「기수 요약과 지금 우리 기수는 카테고리 완전 외부로 독립」.
 * 2026-08-22 재편에서 둘만 남겼던 탭을 하루 만에 마저 갈랐다).
 * - 이 화면은 이제 **기수 요약 하나**다
 * - 「지금 우리 기수는?」은 독립 화면 `/cohort-now`(`CohortNow.tsx`의 페이지 래퍼)
 * - 출석 현황·주간 흐름·비교는 `/attendance`(2026-08-22 병합)
 * - 「분반별 현황」·「진도별 보강 포함 현황」은 영구 제외 — 되살릴 때는 git 이력
 * 옛 `?tab=` 주소는 전부 아래 리다이렉트가 받는다(북마크 보호).
 */
const MOVED_TABS: Record<string, string> = {
  now: "/cohort-now",
  attendance: "/attendance",
  trend: "/attendance",
  compare: "/attendance",
};

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
  /*
    탭이 없어지면서(2026-08-23) 주소의 `?tab=`은 **리다이렉트에만** 쓴다.
    탭 전환 스크롤 보정 장치(2026-08-18)도 함께 걷어냈다 — 라우트 전환이라 자연 해소된다.
    되살릴 때는 git 이력.
  */
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");

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

  /*
    2026-08-23 리드 지시로 요약 몸통을 덜어냈다 — 「수강생 구성」(MixCard) ·
    「등록 수강생/수강/탈락·유급」 타일 · 「보강 포함 출석률」 카드 · 「사명자 현황」
    (+`StaffByDivision`)을 전부 뺐다. 보강 포함 출석률은 출석 현황(/attendance)에 그대로 있다.
    「출석률 분포」 히스토그램은 그보다 앞서 2026-08-14 CHG-01로 뺐다. 되살릴 때는 git 이력.
  */

  /**
   * 복합 분석 줄 재료 (2026-08-23 리드 지시 — 「기수 요약 맨 하단에, 펼치기 접기로」).
   * 수강생 현황과 **같은 규칙**으로 만든다: 담당자가 고친 값(override)이 있으면 그쪽이 이긴다.
   * 부품은 `components/CompositeAnalysis` 한 벌이다(복제 금지).
   */
  const analysisRows = useMemo(
    () =>
      students.map((s) => {
        const p = STUDENT_PROFILES[s.key];
        const ov = overrideByKey[s.key];
        return {
          profile: p,
          yuwol: (ov?.faithType ?? (p.faithType === "비오픈" ? "비오픈" : "오픈")) as
            | "오픈"
            | "비오픈",
        };
      }),
    [students, overrideByKey],
  );

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
   * 옛 주소 흡수 (2026-08-22·23) — 독립해 나간 화면으로 넘긴다(북마크 보호).
   * ⚠️ 훅이 전부 돈 뒤의 조기 반환이라 훅 순서는 안전하다.
   * `tab=divisions`(영구 제외)·모르는 값은 그대로 기수 요약을 그린다 — 목적지가 없다.
   */
  if (rawTab !== null && MOVED_TABS[rawTab]) {
    return <Navigate to={MOVED_TABS[rawTab]} replace />;
  }

  return (
    <div>
      {/* 탭 줄은 2026-08-23에 없앴다 — 이 화면은 기수 요약 하나다(머리 주석) */}
      <PageHeader
        crumb="기수 요약"
        title="기수 요약"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 진도 ${TOTAL_SESSIONS}회 · 조회 범위 ${studentScopeLabel(session)} (시범 목업 데이터)`}
      />

      {
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

          {/*
            2026-08-23 리드 지시로 여기 있던 것들을 뺐다 — 「수강생 구성」(MixCard) ·
            「등록 수강생/수강/탈락·유급」 타일 3개 · 「보강 포함 출석률」 카드 ·
            「사명자 현황」(+전도사별 수강생 상태). 보강 포함 출석률은 출석 현황(/attendance)에
            그대로 있다. 되살릴 때는 git 이력에서 꺼낸다.
          */}

          {/*
            복합 분석 — **맨 하단 · 접이식** (2026-08-23 리드 지시 — 「기수 요약 맨 하단에
            위치, 펼치기 접기 기능으로 볼 수 있도록」). 수강생 현황 하단의 그 판과 **같은
            부품 한 벌**(`components/CompositeAnalysis`)이고, 기본은 접힘이다.
          */}
          <Card className="mt-5">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-bold text-zion-900 [&::-webkit-details-marker]:hidden">
                <ChevronDown size={15} className="shrink-0 text-zion-600 transition-transform [details:not([open])>summary>&]:-rotate-90" />
                복합 분석
                <span className="text-[11px] font-normal text-ink-soft">
                  연령대 · 등록구분 · 신앙유형 · 유월 · MBTI · 에니어그램 · 도형 · 사주 분포
                  ({analysisRows.length}명 기준)
                </span>
              </summary>
              <div className="mt-3">
                <AnalysisGrid rows={analysisRows} />
              </div>
            </details>
          </Card>
        </>
      }

      {/*
        갈라져 나간 화면들: 「지금 우리 기수는?」 → /cohort-now (2026-08-23 독립),
        출석 현황·주간 흐름·비교 → /attendance (2026-08-22 병합).
        「분반별 현황」 탭은 영구 제외 — 되살릴 때는 git 이력에서 divisions 분기를 꺼낸다.
      */}

      {modalKey && <StudentDetailModal studentKey={modalKey} onClose={() => setModalKey(null)} />}
    </div>
  );
}
