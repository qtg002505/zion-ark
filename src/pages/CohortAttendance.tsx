import { Fragment, useMemo, useRef, useState } from "react";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { Portal } from "../components/Portal";
import { ChevronLeft, ChevronRight, PencilLine, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { ROLE_LABELS, type AttendanceMark, type SpecialSession } from "../lib/types";
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
  DONE_WEEKS,
  SCHEDULE,
  TOTAL_SESSIONS,
  WEEKLY_RATES,
  COHORT_RANKS,
  STATUS_LABELS,
  sessionRateOf,
  studentWeekHistory,
  type WeeklyRate,
} from "../content/cohort-mock";
import {
  WEEKDAY_NAMES,
  addDays,
  effectiveSchedule,
  mondayOfWeek,
  offsetInWeek,
  scheduleSummary,
  type ClassWeekdayPeriodList,
} from "../lib/cohort-calendar";
import { DRAG_SCROLL_CLASS, useDragScroll } from "../lib/drag-scroll";
import { LineChart } from "../components/LineChart";
import {
  lessonOfSession,
  sessionLabelOf,
  sessionsOfWeek,
  sessionsThroughWeek,
  shortLessonLabel,
  LEVEL_TONE,
  type SessionInfo,
} from "../content/curriculum-mock";
import {
  MARK_GLYPH,
  MARK_LABEL,
  MARK_TONE,
  weekRates,
  rateOf,
} from "../lib/attendance-rate";
import { DIVISION_EVANGELISTS } from "../content/student-profiles";
import type { Student } from "../lib/types";
import { PageHeader, Card, StatusBadge } from "./common";

/**
 * 출석 현황 — 독립 화면 (2026-08-22 리드 피드백 5로 기수 현황에서 분리).
 *
 * 종전에는 기수 현황(/cohort)의 탭 셋(출석 현황·주간 흐름·비교)이었다. 리드 지시로
 * **한 화면에 일렬로 병합**했다: 출석 격자 → 주간 흐름 그래프 → 기수 비교.
 * 옛 주소(/cohort?tab=attendance|trend|compare)는 CohortStatus가 이리로 넘긴다.
 *
 * ⚠️ 격자·그래프·비교의 부품과 규칙은 그대로 옮겨 왔다 — 계산·저장 계약 무변경.
 */
export function CohortAttendance() {
  const session = useSession();
  const { scheduleOverrides } = useStore();
  /** 수업 요일 구간 — 화면에서 고친 값이 있으면 그것. 격자 칸·회차 번호가 전부 따른다 */
  const { weekdayPeriods, startsOn } = effectiveSchedule(
    SCHEDULE,
    scheduleOverrides,
    cohortKeyOf(session),
  );
  const divisions = visibleDivisions(session, DIVISIONS);
  const students = STUDENTS.filter((s) => divisions.includes(s.division));

  return (
    <div>
      <PageHeader
        crumb="출석 현황"
        title="출석 현황"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 진도 ${TOTAL_SESSIONS}회 · 조회 범위 ${studentScopeLabel(session)} (시범 목업 데이터)`}
      />

      <AttendanceGrid students={students} weekdayPeriods={weekdayPeriods} startsOn={startsOn} />

      {/* 주간 흐름 — 출석 현황 하단에 병합 (2026-08-22 리드 피드백 5) */}
      <div className="mt-6">
        <EightMonthTrend students={students} />
      </div>
      <div className="mt-4">
        <WeeklyTrend rows={WEEKLY_RATES} />
      </div>

      {/* 기수 비교 — 같은 화면에서 이어 본다 (2026-08-22 리드 피드백 5) */}
      <div className="mt-6">
        <CohortCompare />
      </div>
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
/**
 * 표시 축 셋 (2026-08-15 리드 지시로 「요일별」을 더했다).
 * - `lesson` 진도별 — 회차를 주차 차례대로 늘어놓는다 (기본)
 * - `weekday` **요일별** — 같은 요일끼리 묶는다. 「이 사람은 목요일마다 빠진다」가 한 줄로 보인다
 * - `week` 주차별 — 한 주를 한 칸으로 줄인 치리자용 요약
 */
type GridAxis = "lesson" | "weekday" | "week";

/**
 * 왼쪽 붙박이 칸의 가로 폭 — 23주(69칸)를 가로로 넘겨 보는 동안 번호·이름이 따라다녀야
 * 누구 줄인지 놓치지 않는다. `sticky`는 `left` 값을 픽셀로 받아야 해서 상수로 둔다.
 */
const STICKY_NO_W = 36;
const STICKY_NAME_W = 74;

/**
 * 출석 격자 — 2026-08-15 리드 피드백으로 배치를 갈아엎었다.
 *
 * 바뀐 것 여섯:
 * 1. **상태·보강포함·대면만이 이름 바로 옆으로** 왔다 — 종전에는 69칸 건너 맨 오른쪽이라
 *    누구의 비율인지 보려면 끝까지 밀어야 했다
 * 2. **최근 회차가 왼쪽이고 맨 오른쪽이 1주차**다 — 매일 보는 것은 최근이라 열자마자 보여야 한다
 * 3. 주차 아래 **날짜**를 적는다 (`8/25`)
 * 4. **요일을 골라 볼 수 있다** — 「목요일만」처럼 한 요일 흐름만 보는 자리
 * 5. 칸을 넓혀 **한 화면에 4주쯤** 들어온다 (종전 8주 — 빽빽해서 눈이 미끄러졌다)
 * 6. **출석한 사람이 위, 결석이 아래**이고 **분반별로 묶어** 가로 띠를 둔다
 *    ⚠️ 2026-08-14의 「낮은 사람이 위」를 뒤집은 것이다 — 리드 지시로 바뀌었다
 *
 * ⚠️ **출결 원본은 여전히 읽기 전용이다**(불변식 3). 결석 칸을 누르면 뜨는 것은 원본을
 * 고치는 창이 아니라 **그 옆에 붙는 보강 기록**이다 — 원본 mark는 그대로 있고, 기록은
 * `studentFeedback`(kind `makeup`)으로 남아 수강생 상세의 「보강·상담 메모」에도 그대로 뜬다.
 */

function AttendanceGrid({
  students,
  weekdayPeriods,
  startsOn,
}: {
  students: typeof STUDENTS;
  /** 그 기수의 수업 요일 구간 — 주차마다 요일이 다를 수 있다 (2026-08-14) */
  weekdayPeriods: ClassWeekdayPeriodList;
  /** 유효 개강일 — 회차 날짜를 여기서 센다 */
  startsOn: string;
}) {
  const session = useSession();
  const {
    studentFeedback,
    addStudentFeedback,
    specialSessions,
    addSpecialSession,
    deleteSpecialSession,
    specialAttendance,
    setSpecialAttendance,
  } = useStore();
  const cohortKey = cohortKeyOf(session);
  const canEdit = canEditCohortRecord(session, cohortKey);
  const [axis, setAxis] = useState<GridAxis>("lesson");
  /**
   * 보고 있는 분반 (2026-08-18 리드 지시 — 「전도사별로 구분되어 반별로 따로 볼 수 있으면」).
   * 분반 이름이 곧 담당 전도사 자리라, 탭에는 **전도사 이름을 함께** 적는다.
   */
  const [divisionTab, setDivisionTab] = useState<string>("all");
  /** 보고 있는 요일 — 비어 있으면 전부 본다 */
  const [dayFilter, setDayFilter] = useState<number[]>([]);
  /** 보강 기록을 남길 칸 */
  const [makeupAt, setMakeupAt] = useState<{ student: Student; sess: SessionInfo } | null>(null);
  /**
   * **출석률에 특강을 넣을지** (2026-08-15 리드 지시 — 「특강은 포함되지 않고 메인강의만」).
   * 기본은 꺼짐 = 정규 수업만 센다. 켜면 비율과 평균에 특강이 함께 들어간다.
   * ⚠️ 칸은 늘 보인다 — 이 토글이 가르는 것은 **셈**이지 표시가 아니다.
   */
  const [includeSpecial, setIncludeSpecial] = useState(false);
  /** 특강을 더할 주차 — null이면 창이 닫혀 있다 */
  const [specialFormWeek, setSpecialFormWeek] = useState<number | null>(null);
  /**
   * 회차 차례 (2026-08-15 리드 지시) — 기본은 **최신순**이다.
   * ⚠️ 주차만이 아니라 **주 안의 요일까지 뒤집는다** — 「월화수목금」이 아니라 「금목수화월」로
   * 놓여야 연속 결석이 한 덩어리로 보인다는 것이 리드의 지적이다.
   */
  const [newestFirst, setNewestFirst] = useState(true);

  /**
   * 1주차부터 마지막 완료 주까지 **전부** 그린다. **최근 주가 왼쪽**이다 (2026-08-15 리드 지시) —
   * 열자마자 최근 출결이 이름 옆에 보이고, 옛 주는 오른쪽으로 밀려난다. 맨 오른쪽이 1주차다.
   */
  const weekNos = useMemo(
    () =>
      newestFirst
        ? Array.from({ length: DONE_WEEKS }, (_, i) => DONE_WEEKS - i)
        : Array.from({ length: DONE_WEEKS }, (_, i) => i + 1),
    [newestFirst],
  );
  /** 주차 번호 → weeksAgo (최근 완료 주가 DONE_WEEKS번째 주 = ago 0) */
  const agoOf = (weekNo: number) => DONE_WEEKS - weekNo;

  /** 그 주차의 회차들 — 요일 필터를 여기 한 곳에서 건다 */
  const sessionsOf = (weekNo: number) => {
    const all = sessionsOfWeek(weekNo, weekdayPeriods);
    return dayFilter.length === 0 ? all : all.filter((s) => dayFilter.includes(s.weekday));
  };

  /** 이 기수의 특강 — 주차·날짜 순 (2026-08-15 리드 지시) */
  const mySpecials = useMemo(
    () =>
      specialSessions
        .filter((sp) => sp.cohortKey === cohortKey)
        .sort((a, b) => a.weekNo - b.weekNo || a.date.localeCompare(b.date)),
    [specialSessions, cohortKey],
  );
  const specialsOf = (weekNo: number) => mySpecials.filter((sp) => sp.weekNo === weekNo);
  /** 특강 출결 한 칸 — 없으면 미입력 */
  const specialMarkOf = (sessionId: string, studentKey: string): AttendanceMark =>
    specialAttendance.find((a) => a.sessionId === sessionId && a.studentKey === studentKey)?.mark ??
    "unknown";

  /**
   * 한 주차의 칸들 — **정규 회차 + 그 주 특강**이 한 줄에 이어진다.
   * 특강은 다른 요일에도 열리므로 정규 뒤에 붙이고, 칸 자체는 요일 필터를 타지 않는다
   * (요일 필터는 정규 수업의 흐름을 보려는 도구다).
   */
  type GridCol =
    | { kind: "regular"; key: string; sess: SessionInfo }
    | { kind: "special"; key: string; sp: SpecialSession };
  const colsOf = (weekNo: number): GridCol[] => {
    const cols: GridCol[] = [
      ...sessionsOf(weekNo).map((sess) => ({ kind: "regular" as const, key: `r${sess.sessionNo}`, sess })),
      ...specialsOf(weekNo).map((sp) => ({ kind: "special" as const, key: `s${sp.id}`, sp })),
    ];
    /*
      최신순이면 **주 안의 차례도 뒤집는다** (2026-08-15 리드 지시) — 「금목수화월」로 놓여야
      최근 결석이 왼쪽에서 이어지는 덩어리로 보인다. 오래된순이면 원래 차례(월화목)다.
    */
    return newestFirst ? [...cols].reverse() : cols;
  };

  /**
   * 칸 묶음 — 축에 따라 **무엇으로 묶을지**만 갈린다 (2026-08-15 「요일별」 추가).
   * - 진도별: 주차로 묶는다
   * - 요일별: **같은 요일끼리** 묶는다. 특강은 요일이 제각각이라 맨 뒤에 한 묶음으로 모은다
   * 주차별(`week`)은 칸 하나가 곧 한 주라 이 구조를 쓰지 않는다.
   */
  /** 이 기수에서 쓰는 요일 전부 — 요일 고르기 단추와 요일별 묶음이 함께 쓴다 */
  const usedWeekdays = useMemo(() => {
    const set = new Set<number>();
    for (const w of weekNos) for (const s of sessionsOfWeek(w, weekdayPeriods)) set.add(s.weekday);
    return [...set].sort((a, b) => a - b);
  }, [weekNos, weekdayPeriods]);

  type ColGroup = { key: string; label: string; cols: GridCol[] };
  const columnGroups: ColGroup[] = useMemo(() => {
    if (axis === "lesson") {
      return weekNos.map((w) => ({ key: `w${w}`, label: `${w}주차`, cols: colsOf(w) }));
    }
    if (axis === "weekday") {
      const days = usedWeekdays.filter((d) => dayFilter.length === 0 || dayFilter.includes(d));
      const groups: ColGroup[] = days.map((d) => ({
        key: `d${d}`,
        label: `${WEEKDAY_NAMES[d]}요일`,
        cols: weekNos.flatMap((w) =>
          sessionsOfWeek(w, weekdayPeriods)
            .filter((s) => s.weekday === d)
            .map((sess) => ({ kind: "regular" as const, key: `r${sess.sessionNo}`, sess })),
        ),
      }));
      if (mySpecials.length > 0) {
        // 특강은 요일이 제각각이라 요일 묶음에 넣으면 흐름이 끊긴다 — 따로 모은다
        const specialCols: GridCol[] = [...mySpecials]
          .sort((a, b) => (newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
          .map((sp) => ({ kind: "special" as const, key: `s${sp.id}`, sp }));
        groups.push({ key: "special", label: "특강", cols: specialCols });
      }
      return groups.filter((g) => g.cols.length > 0);
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, weekNos, dayFilter, usedWeekdays, weekdayPeriods, mySpecials, newestFirst]);

  /** 회차의 실제 날짜 — 「8/25」. 일요일은 그 주의 첫날이라 월요일 앞에 온다 */
  const dateOf = (sess: SessionInfo) => {
    const ymd = addDays(mondayOfWeek(startsOn, sess.weekNo), offsetInWeek(sess.weekday));
    const [, m, d] = ymd.split("-").map(Number);
    return `${m}/${d}`;
  };

  const history = useMemo(
    () => new Map(students.map((s) => [s.key, studentWeekHistory(s, DONE_WEEKS)])),
    [students],
  );

  /**
   * **손이 필요한 사람이 위** (2026-08-18 리드 지시 — 「수강이 잘 되는 수강생보다 관리가
   * 필요한 수강생이 상단에」).
   *
   * ⚠️ 이 축은 **두 번 뒤집혔다.** 2026-08-14에 「출석률 낮은 사람이 위」였다가 2026-08-15에
   * 「출석한 사람이 위」로 갔고, 지금 다시 돌아왔다. 또 바뀔 수 있으므로 **순위표 한 곳**만
   * 고치면 되게 두었다 — 정렬식은 건드릴 일이 없다.
   *
   * 첫 열쇠는 **가장 최근 회차의 출결**이고, 같으면 보강 포함 출석률이 **낮은 순**이다.
   */
  const MARK_RANK: Record<string, number> = {
    absent: 0,
    makeupPending: 1,
    unknown: 2,
    makeupDone: 3,
    present: 4,
  };
  const sortStudents = (list: Student[]) =>
    [...list].sort((a, b) => {
      const ra = MARK_RANK[history.get(a.key)?.[0]?.mark ?? "unknown"] ?? 2;
      const rb = MARK_RANK[history.get(b.key)?.[0]?.mark ?? "unknown"] ?? 2;
      if (ra !== rb) return ra - rb;
      return rateOf(a).withMakeup - rateOf(b).withMakeup;
    });

  /**
   * **분반별 가로 띠**로 묶는다 (2026-08-15 리드 지시) — 띠 아래에 그 분반 사람들이 온다.
   * 2026-08-18부터 위 탭에서 한 분반만 골라 볼 수 있다 (전도사별로 따로 보기).
   */
  const groups = useMemo(() => {
    const scoped = divisionTab === "all" ? students : students.filter((s) => s.division === divisionTab);
    const byDivision = new Map<string, Student[]>();
    for (const s of scoped) byDivision.set(s.division, [...(byDivision.get(s.division) ?? []), s]);
    return [...byDivision.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([division, list]) => ({ division, list: sortStudents(list) }));
  }, [students, history, divisionTab]);

  /** 전체 순번 — 분반 띠를 건너뛰고 사람만 1부터 센다 */
  const rows = groups.flatMap((g) => g.list);

  /** 그 회차(또는 주)에 남긴 보강 기록 — 칸에 표시를 덧대고, 창을 열면 목록으로 보여준다 */
  const makeupsOf = (studentKey: string, sessionNo: number) =>
    studentFeedback.filter(
      (f) => f.studentKey === studentKey && f.kind === "makeup" && f.sessionNo === sessionNo,
    );

  /**
   * 기수 평균 행 — 그 주에 출석(대면·보강완료)한 사람 비율.
   * 「특강 포함」이 켜져 있으면 그 주 특강 출결도 함께 센다 (2026-08-15).
   */
  const weekAvg = (weekNo: number) => {
    const ago = agoOf(weekNo);
    const marks: AttendanceMark[] = rows.map((s) => history.get(s.key)?.[ago]?.mark ?? "unknown");
    if (includeSpecial) {
      for (const sp of specialsOf(weekNo)) {
        for (const s of rows) marks.push(specialMarkOf(sp.id, s.key));
      }
    }
    const known = marks.filter((m) => m !== "unknown");
    if (known.length === 0) return null;
    const ok = known.filter((m) => m === "present" || m === "makeupDone").length;
    return Math.round((ok / known.length) * 100);
  };

  /** 특강 한 칸의 평균 — 그 특강에 나온 사람 비율 */
  const specialAvg = (sessionId: string) => {
    const marks = rows.map((s) => specialMarkOf(sessionId, s.key)).filter((m) => m !== "unknown");
    if (marks.length === 0) return null;
    return Math.round(
      (marks.filter((m) => m === "present" || m === "makeupDone").length / marks.length) * 100,
    );
  };

  /**
   * 한 사람의 출석률 — 기본은 **정규 수업만**이다 (2026-08-15 리드 지시).
   * 「특강 포함」을 켜면 **최근 8주(정규 비율과 같은 창)** 안의 특강 출결을 더해 다시 센다.
   * ⚠️ 같은 창을 쓰는 것이 중요하다 — 특강만 전 기간에서 끌어오면 분모가 어긋난다.
   */
  const RECENT_WINDOW = 8;
  const rateFor = (s: Student) => {
    const base = rateOf(s);
    if (!includeSpecial) return base;
    const from = DONE_WEEKS - (RECENT_WINDOW - 1);
    const extra = mySpecials
      .filter((sp) => sp.weekNo >= from)
      .map((sp) => specialMarkOf(sp.id, s.key))
      .filter((m) => m !== "unknown");
    if (extra.length === 0) return base;
    const counted = base.counted + extra.length;
    const present = base.presentCount + extra.filter((m) => m === "present").length;
    const makeupDone = base.makeupDoneCount + extra.filter((m) => m === "makeupDone").length;
    return {
      ...base,
      counted,
      presentCount: present,
      makeupDoneCount: makeupDone,
      withMakeup: Math.round(((present + makeupDone) / counted) * 100),
      presentOnly: Math.round((present / counted) * 100),
    };
  };

  /** 엑셀(CSV) 내려받기 — 지금 보이는 축·순서 그대로. BOM을 붙여 엑셀이 한글을 살린다 */
  function downloadCsv() {
    const head =
      axis === "week"
        ? ["번호", "이름", "분반", "상태", "보강 포함 %", "대면만 %", ...weekNos.map((w) => `${w}주차`)]
        : [
            "번호",
            "이름",
            "분반",
            "상태",
            "보강 포함 %",
            "대면만 %",
            ...columnGroups.flatMap((g) =>
              g.cols.map((c) =>
                c.kind === "regular"
                  ? `${c.sess.weekNo}주차 ${c.sess.weekdayLabel} ${dateOf(c.sess)}(${c.sess.sessionNo}회 ${shortLessonLabel(c.sess)})`
                  : `${c.sp.weekNo}주차 특강 ${c.sp.date} ${c.sp.title}`,
              ),
            ),
          ];
    const lines = rows.map((st, i) => {
      const hist = history.get(st.key) ?? [];
      const r = rateFor(st);
      const glyph = (w: number) => MARK_GLYPH[hist[agoOf(w)]?.mark ?? "unknown"];
      const cells =
        axis === "week"
          ? weekNos.map(glyph)
          : columnGroups.flatMap((g) =>
              g.cols.map((c) =>
                c.kind === "regular"
                  ? glyph(c.sess.weekNo)
                  : MARK_GLYPH[specialMarkOf(c.sp.id, st.key)],
              ),
            );
      return [i + 1, st.name, st.division, STATUS_LABELS[st.status], r.withMakeup, r.presentOnly, ...cells];
    });
    const avg: (string | number)[] = ["", "우리 기수 평균", "", "", "", ""];
    if (axis === "week") {
      for (const w of weekNos) {
        const v = weekAvg(w);
        avg.push(v === null ? "-" : `${v}%`);
      }
    } else {
      for (const g of columnGroups) {
        for (const c of g.cols) {
          const v = c.kind === "regular" ? weekAvg(c.sess.weekNo) : specialAvg(c.sp.id);
          avg.push(v === null ? "-" : `${v}%`);
        }
      }
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
  /**
   * 붙잡고 끌어서 23주를 훑는다 (2026-08-14).
   * ⚠️ **차례·축·요일 필터가 바뀌면 맨 왼쪽으로 되돌린다** (2026-08-15) — 칸이 통째로
   * 재배열되는데 스크롤 자리가 남아 있으면 엉뚱한 주차가 보이고 붙박이 칸 아래로 잘린다.
   */
  const dragGrid = useDragScroll<HTMLDivElement>(
    `${axis}|${newestFirst}|${dayFilter.join(",")}`,
  );

  /** 출결 칸의 총 개수 — 분반 띠가 남은 칸을 한 번에 덮는 데 쓴다 */
  const gridCols = Math.max(
    1,
    axis === "week" ? weekNos.length : columnGroups.reduce((n, g) => n + g.cols.length, 0),
  );

  /**
   * 회차 칸 하나 — 폭을 넓혀 **한 화면에 4주**가 들어온다 (2026-08-15 리드 지시 — 종전 8주가
   * 한 판에 들어와 빽빽했다). 1280px에서 이름 옆 정보가 323px를 쓰고 남는 622px에 12칸(4주)이
   * 들어가도록 잡은 값이다 — 더 넓히면 4주째가 잘린다.
   */
  const colW = "w-12 min-w-12";
  /** 이름 옆 정보 칸 — 상태·보강포함·대면만 */
  const infoTh = "whitespace-nowrap px-2 pb-2 text-right font-medium";

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-bold text-zion-900">
            {axis === "lesson" ? "진도별" : axis === "weekday" ? "요일별" : "주차별"} 출석 상세
          </div>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            {newestFirst ? (
              <>
                <strong>최근 회차가 왼쪽</strong>, 1주차가 맨 오른쪽입니다.
              </>
            ) : (
              <>
                <strong>1주차가 왼쪽</strong>, 개강부터 차례대로입니다.
              </>
            )}{" "}
            <strong>손이 필요한 분부터</strong> 위에 옵니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/*
            분반(전도사) 고르기 (2026-08-18 리드 지시) — 반별로 따로 본다.
            ⚠️ **펼쳐서 고른다**(같은 날 리드 지시 — 「눌러서 볼 수 있도록」).
            탭으로 늘어놓으니 이름이 붙은 항목 다섯이 한 줄을 다 먹고 옆 컨트롤이 잘렸다.
            분반 이름이 곧 담당 전도사 자리라 항목에 이름을 함께 적는다.
          */}
          <select
            value={divisionTab}
            onChange={(e) => setDivisionTab(e.target.value)}
            aria-label="분반 고르기"
            className="rounded-lg border border-zion-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-zion-800 outline-none focus:border-zion-500"
          >
            <option value="all">전체 분반</option>
            {[...new Set(students.map((s) => s.division))]
              .sort((a, b) => a.localeCompare(b, "ko"))
              .map((d) => (
                <option key={d} value={d}>
                  {DIVISION_EVANGELISTS[d] ? `${d} · ${DIVISION_EVANGELISTS[d]}` : d}
                </option>
              ))}
          </select>
          {/* 보기 전환 — 진도별이 먼저이고 기본이다 (2026-08-14 리드 지시) */}
          <SegmentedTabs
            label="출결 표시 축"
            size="sm"
            value={axis}
            onChange={setAxis}
            items={[
              { id: "lesson", label: "진도별" },
              /* 2026-08-15 리드 지시 — 같은 요일끼리 묶어 그 요일의 흐름을 본다 */
              { id: "weekday", label: "요일별" },
              { id: "week", label: "주차별" },
            ]}
          />
          {/*
            출석률에 특강을 넣을지 (2026-08-15 리드 지시). **기본은 정규만**이다 —
            리드가 「특강은 포함되지 않고 메인강의만 포함되도록」이라고 못박았고,
            「특강을 포함해서도 볼 수 있는 필터」를 함께 요청했다.
          */}
          {/* 차례 뒤집기 (2026-08-15 리드 지시) — 주차와 요일이 함께 뒤집힌다 */}
          <SegmentedTabs
            label="회차 차례"
            size="sm"
            /* 차례는 참·거짓 한 쌍이라 탭 id로 옮겨 담는다 (부품은 문자열 id를 받는다) */
            value={newestFirst ? "newest" : "oldest"}
            onChange={(v) => setNewestFirst(v === "newest")}
            items={[
              { id: "newest", label: "최신순" },
              { id: "oldest", label: "오래된순" },
            ]}
          />
          <button
            onClick={() => setIncludeSpecial((v) => !v)}
            aria-pressed={includeSpecial}
            className={
              "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition " +
              (includeSpecial
                ? "border-gold-500 bg-gold-100 text-gold-700"
                : "border-zion-200 text-zion-700 hover:bg-zion-50")
            }
          >
            {/* 무엇의 범위인지 이름에 담는다 — 「셈」 같은 줄임말은 처음 보는 사람이 못 읽는다 */}
            {includeSpecial ? "출석률: 특강 포함" : "출석률: 정규 수업만"}
          </button>
          {canEdit && (
            <button
              onClick={() => setSpecialFormWeek(DONE_WEEKS)}
              className="rounded-lg border border-zion-200 px-2.5 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
            >
              + 특강 추가
            </button>
          )}
          <button
            onClick={downloadCsv}
            className="rounded-lg border border-zion-200 px-2.5 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
          >
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 요일 고르기 (2026-08-15 리드 지시) — 한 요일만 남겨 그 요일의 흐름만 본다 */}
      {axis === "lesson" && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-ink-soft">요일</span>
          <button
            onClick={() => setDayFilter([])}
            aria-pressed={dayFilter.length === 0}
            className={
              "rounded-lg border px-2 py-1 font-semibold transition " +
              (dayFilter.length === 0
                ? "border-zion-700 bg-zion-700 text-white"
                : "border-zion-200 text-zion-700 hover:bg-zion-50")
            }
          >
            전체
          </button>
          {usedWeekdays.map((d) => {
            const on = dayFilter.includes(d);
            return (
              <button
                key={d}
                onClick={() =>
                  setDayFilter((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))
                }
                aria-pressed={on}
                className={
                  "h-7 w-7 rounded-lg border font-semibold transition " +
                  (on
                    ? "border-zion-700 bg-zion-700 text-white"
                    : "border-zion-200 text-zion-700 hover:bg-zion-50")
                }
              >
                {WEEKDAY_NAMES[d]}
              </button>
            );
          })}
        </div>
      )}

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
        <span className="flex items-center gap-1 text-ink-soft">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-gold-500 bg-gold-100 text-[11px] font-bold text-zion-900">
            •
          </span>
          보강 기록 있음
        </span>
        <span className="flex items-center gap-1 text-ink-soft">
          <span className="inline-flex h-5 items-center justify-center rounded bg-gold-100 px-1 text-[10px] font-bold text-gold-700">
            특강
          </span>
          정규 수업 밖 강의 — {includeSpecial ? "지금 출석률에 함께 셉니다" : "출석률에서 뺍니다"}
        </span>
      </div>

      {/*
        23주 전체를 좌우로 훑는 자리. 표만 가로로 넘어가고 본문은 안 밀린다.
        `w-max`라 칸이 눌려 찌그러지지 않는다 — 대신 번호·이름이 왼쪽에 붙박인다.
        **붙잡고 끌어도 넘어간다** (2026-08-14 리드 지시) — `useDragScroll` 참고.
      */}
      {/*
        ⚠️ **세로로 내려도 머리가 남는다** (2026-08-18 리드 지시 — 「번호·이름·상태가 스크롤을
        내리면 보이지 않는다」). 표를 제 높이 안에서 굴려(`max-h`) 머리를 그 위에 붙였다 —
        페이지째 굴리면 머리를 어디에 붙일지가 헤더 높이에 매여 화면마다 어긋난다.
        ⚠️ 머리가 두 줄이라 아래 줄은 윗줄 높이(26px)만큼 내려 붙인다. 두 줄을 같은 자리에
        붙이면 겹쳐 읽히지 않는다.
      */}
      <div
        ref={dragGrid.ref}
        onPointerDown={dragGrid.onPointerDown}
        className={"-mx-1 max-h-[72vh] overflow-auto px-1 " + DRAG_SCROLL_CLASS}
      >
        <table
          className={
            "w-max min-w-full text-[13px] " +
            "[&_thead_th]:sticky [&_thead_th]:bg-white " +
            "[&_thead_tr:first-child_th]:top-0 [&_thead_tr:last-child_th]:top-[26px]"
          }
        >
          <thead>
            <tr className="border-b border-zion-100 text-center text-[11px] text-ink-soft">
              <th className="sticky z-20 bg-white pb-1" style={{ left: 0, minWidth: STICKY_NO_W }} />
              <th
                className="sticky z-20 bg-white pb-1"
                style={{ left: STICKY_NO_W, minWidth: STICKY_NAME_W }}
              />
              <th colSpan={3} className="pb-1" />
              {axis !== "week" ? (
                columnGroups.map((g) => (
                  <th
                    key={g.key}
                    colSpan={g.cols.length}
                    className={"whitespace-nowrap px-1 pb-1 font-semibold text-zion-700 " + weekEdge}
                  >
                    {g.label}
                    {/* 주차 묶음에서만 「+ 특강」이 뜻을 갖는다 — 어느 주에 붙일지가 정해지므로 */}
                    {canEdit && axis === "lesson" && (
                      <button
                        onClick={() => setSpecialFormWeek(Number(g.key.slice(1)))}
                        title={`${g.label}에 특강 추가`}
                        aria-label={`${g.label}에 특강 추가`}
                        className="ml-1 rounded px-1 text-[11px] font-bold text-zion-500 transition hover:bg-zion-100 hover:text-zion-800"
                      >
                        +
                      </button>
                    )}
                  </th>
                ))
              ) : (
                <th colSpan={weekNos.length} className={"pb-1 font-semibold text-zion-700 " + weekEdge}>
                  {newestFirst ? `${DONE_WEEKS}~1주차` : `1~${DONE_WEEKS}주차`}
                </th>
              )}
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
              {/* 이름 바로 옆 — 종전에는 69칸 건너 맨 오른쪽에 있었다 (2026-08-15 리드 지시) */}
              <th className="whitespace-nowrap px-2 pb-2 font-medium">상태</th>
              <th className={infoTh}>보강 포함</th>
              <th className={infoTh}>대면만</th>
              {axis !== "week"
                ? columnGroups.flatMap((g) =>
                    g.cols.map((c, i) =>
                      c.kind === "regular" ? (
                        <th
                          key={c.key}
                          className={`${colW} px-1 pb-2 text-center font-medium ` + (i === 0 ? weekEdge : "")}
                          title={sessionLabelOf(c.sess)}
                        >
                          {/* 요일별 보기에서는 요일이 묶음 이름이라, 칸에는 주차를 적는다 */}
                          {axis === "weekday" ? `${c.sess.weekNo}주` : c.sess.weekdayLabel}
                          {/* 주차 아래 날짜 (2026-08-15 리드 지시) */}
                          <span className="block text-[10px] font-normal text-ink-soft">
                            {dateOf(c.sess)}
                          </span>
                          {/*
                            진도 표기 — **바탕색이 단계이고 글자는 과수 제목이다**
                            (2026-08-21 리드 지시 — 「연두색 배경 안에 그릇~지팡이 이런 식으로
                            단어가 들어가는 거지 색깔 이름이 들어가는 게 아니다」).
                            종전에는 색 칸에 단계 글자를 넣고 제목을 그 아래 줄에 회색으로 깔았다.
                            색값은 `index.css`의 `@theme`에 있고 여기는 토큰 이름만 쓴다.
                          */}
                          <span
                            className={
                              "mt-0.5 block truncate rounded px-0.5 text-[9.5px] font-bold " +
                              // 배정 전 회차는 색을 입히지 않는다 — 단계가 정해진 것이 아니다
                              (c.sess.undecided ? "text-ink-soft" : LEVEL_TONE[c.sess.level])
                            }
                          >
                            {shortLessonLabel(c.sess)}
                          </span>
                        </th>
                      ) : (
                        /* 특강 칸 (2026-08-15) — 금색으로 갈라 놓아 정규와 헷갈리지 않는다 */
                        <th
                          key={c.key}
                          className={
                            `${colW} bg-gold-100/40 px-1 pb-2 text-center font-medium ` +
                            (i === 0 ? weekEdge : "")
                          }
                          title={`특강 · ${c.sp.date} · ${c.sp.title}`}
                        >
                          {axis === "weekday"
                            ? `${c.sp.weekNo}주`
                            : WEEKDAY_NAMES[new Date(c.sp.date).getDay()]}
                          <span className="block text-[10px] font-normal text-ink-soft">
                            {(() => {
                              const [, m, d] = c.sp.date.split("-").map(Number);
                              return `${m}/${d}`;
                            })()}
                          </span>
                          <span className="block text-[9.5px] font-bold text-gold-700">특강</span>
                          <span className="block truncate text-[9px] font-normal text-ink-soft">
                            {c.sp.title}
                          </span>
                          {canEdit && (
                            <button
                              onClick={() => deleteSpecialSession(c.sp.id)}
                              title="이 특강 지우기"
                              aria-label={`${c.sp.title} 특강 지우기`}
                              className="mt-0.5 block w-full text-[9px] font-semibold text-ink-soft hover:text-red-600"
                            >
                              지우기
                            </button>
                          )}
                        </th>
                      ),
                    ),
                  )
                : weekNos.map((w) => (
                    <th key={w} className={`${colW} px-1 pb-2 text-center font-medium ` + weekEdge}>
                      {w}
                      <span className="block text-[10px] font-normal text-ink-soft">
                        {(() => {
                          const [, m, d] = mondayOfWeek(startsOn, w).split("-").map(Number);
                          return `${m}/${d}~`;
                        })()}
                      </span>
                      <span className="block text-[9.5px] font-normal text-zion-500">주</span>
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.division}>
                {/* 분반 가로 띠 (2026-08-15 리드 지시) */}
                <tr className="bg-zion-50/80">
                  <td
                    className="sticky z-10 bg-zion-50 py-1.5 text-center text-[11px] font-bold text-zion-700"
                    style={{ left: 0 }}
                  >
                    ▸
                  </td>
                  <td
                    className="sticky z-10 whitespace-nowrap bg-zion-50 py-1.5 pr-2 text-[12px] font-bold text-zion-800"
                    style={{ left: STICKY_NO_W }}
                    colSpan={4}
                  >
                    {g.division} · {g.list.length}명
                  </td>
                  <td colSpan={gridCols} />
                </tr>
                {g.list.map((s) => {
                  const r = rateFor(s);
                  const hist = history.get(s.key) ?? [];
                  const no = rows.indexOf(s) + 1;
                  const cell = (
                    weekNo: number,
                    key: string | number,
                    title: string,
                    edge: boolean,
                    sess?: SessionInfo,
                  ) => {
                    const mark = hist[agoOf(weekNo)]?.mark ?? "unknown";
                    const notes = sess ? makeupsOf(s.key, sess.sessionNo) : [];
                    /** 결석·보강예정 칸만 누른다 — 나머지는 남길 것이 없다 */
                    const openable = sess !== undefined && (mark === "absent" || mark === "makeupPending");
                    const glyph = (
                      <span
                        className={
                          "relative inline-flex h-6 w-6 items-center justify-center rounded border text-[11px] font-bold " +
                          MARK_TONE[mark] +
                          (openable ? " transition hover:ring-2 hover:ring-zion-400" : "")
                        }
                      >
                        {MARK_GLYPH[mark]}
                        {notes.length > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold-500" />
                        )}
                      </span>
                    );
                    const label = `${title} — ${MARK_LABEL[mark]}${
                      notes.length > 0 ? ` · 보강 기록 ${notes.length}건` : ""
                    }`;
                    return (
                      <td key={key} className={"px-1 py-2 text-center " + (edge ? weekEdge : "")}>
                        {openable ? (
                          <button
                            type="button"
                            onClick={() => setMakeupAt({ student: s, sess })}
                            title={`${label} — 눌러서 보강 기록`}
                            aria-label={`${s.name} ${label} 보강 기록`}
                          >
                            {glyph}
                          </button>
                        ) : (
                          <span title={label}>{glyph}</span>
                        )}
                      </td>
                    );
                  };
                  return (
                    <tr key={s.key} className="group border-b border-zion-100">
                      <td
                        className="sticky z-10 bg-white py-2 text-center text-[12px] text-ink-soft group-hover:bg-zion-50"
                        style={{ left: 0 }}
                      >
                        {no}
                      </td>
                      <td
                        className="sticky z-10 whitespace-nowrap bg-white py-2 pr-2 font-medium text-ink group-hover:bg-zion-50"
                        style={{ left: STICKY_NO_W }}
                      >
                        {s.name}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <StatusBadge status={s.status} />
                      </td>
                      {/*
                        퍼센트 옆에 **실제 횟수**를 함께 낸다 (2026-08-18 리드 지시).
                        분모는 미입력을 뺀 「센 회차」다 — 사람마다 다를 수 있어 비율만으로는
                        「몇 번 중 몇 번인지」가 안 보였다.
                      */}
                      <td className="px-2 py-2 text-right font-semibold text-zion-800">
                        {r.withMakeup}%
                        <span className="ml-1 text-[11px] font-normal text-ink-soft">
                          {r.presentCount + r.makeupDoneCount}/{r.counted}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-[12px] text-ink-soft">
                        {r.presentOnly}%
                        <span className="ml-1 text-[11px]">
                          {r.presentCount}/{r.counted}
                        </span>
                      </td>
                      {axis !== "week"
                        ? columnGroups.flatMap((g) =>
                            g.cols.map((c, i) =>
                              c.kind === "regular" ? (
                                cell(
                                  c.sess.weekNo,
                                  c.key,
                                  `${c.sess.weekNo}주차 · ${sessionLabelOf(c.sess)}`,
                                  i === 0,
                                  c.sess,
                                )
                              ) : (
                                /*
                                  특강 칸 — **사이트 기록**이라 담당자가 눌러서 표시를 돌린다
                                  (미입력 → 출석 → 결석 → 미입력). 정규 회차는 여전히 못 고친다.
                                */
                                <td
                                  key={c.key}
                                  className={
                                    "bg-gold-100/40 px-1 py-2 text-center " + (i === 0 ? weekEdge : "")
                                  }
                                >
                                  <SpecialCell
                                    mark={specialMarkOf(c.sp.id, s.key)}
                                    canEdit={canEdit}
                                    label={`${s.name} · ${c.sp.date} 특강 ${c.sp.title}`}
                                    onCycle={(next) =>
                                      setSpecialAttendance({
                                        sessionId: c.sp.id,
                                        studentKey: s.key,
                                        mark: next,
                                        markedBy: session.name,
                                      })
                                    }
                                  />
                                </td>
                              ),
                            ),
                          )
                        : weekNos.map((w) => cell(w, w, `${w}주차`, true))}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {/* 우리 기수 평균 — 맨 아래 한 줄 */}
            <tr className="border-t-2 border-zion-200 bg-zion-50 text-[12px]">
              <td className="sticky z-10 bg-zion-50 py-2" style={{ left: 0 }} />
              <td
                className="sticky z-10 whitespace-nowrap bg-zion-50 py-2 pr-2 font-bold text-zion-800"
                style={{ left: STICKY_NO_W }}
              >
                우리 기수 평균
              </td>
              <td colSpan={3} className="py-2" />
              {axis === "week"
                ? weekNos.map((w) => {
                    const v = weekAvg(w);
                    return (
                      <td
                        key={w}
                        className={"px-1 py-2 text-center font-semibold text-zion-700 " + weekEdge}
                      >
                        {v === null ? "—" : `${v}%`}
                      </td>
                    );
                  })
                : /*
                    칸마다 그 회차의 기수 평균. 진도별에서는 한 주의 정규 칸들이 같은 값이라
                    묶어 보였는데, **요일별에서는 칸마다 주차가 달라 묶을 수 없다** —
                    두 축을 한 규칙으로 두려고 칸마다 적는 쪽으로 폈다.
                  */
                  columnGroups.flatMap((g) =>
                    g.cols.map((c, i) => {
                      const v = c.kind === "regular" ? weekAvg(c.sess.weekNo) : specialAvg(c.sp.id);
                      return (
                        <td
                          key={c.key}
                          className={
                            "px-1 py-2 text-center font-semibold " +
                            (c.kind === "special"
                              ? "bg-gold-100/40 text-gold-700 "
                              : "text-zion-700 ") +
                            (i === 0 ? weekEdge : "")
                          }
                        >
                          {v === null ? "—" : `${v}%`}
                        </td>
                      );
                    }),
                  )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 안내는 세 갈래로 끊는다 — 한 문단에 이어 붙이면 아무도 끝까지 안 읽는다 */}
      <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-ink-soft">
        <p>
          출결 원본은 읽기 전용 시트에서 동기화되며 <strong>이 화면에서 고칠 수 없습니다.</strong>{" "}
          결석(X)·보강 예정(▽) 칸을 누르면 보강 계획·완료와 메모를 남기고, 그 기록은 수강생 관리의
          「보강 · 상담 메모」에도 함께 뜹니다.
        </p>
        <p>
          「보강 포함」·「대면만」 비율은 <strong>최근 8주 기준</strong>입니다. 특강은 출석률에서
          빠지며, 위 단추로 포함해 볼 수 있습니다. 수업날의 특강식 수업은 정규 회차 칸에 체크합니다.
        </p>
        {axis === "lesson" && (
          <p>목업 출결이 주 단위라 한 주의 회차들은 같은 표기입니다. 회차·강 매핑은 시범 값입니다.</p>
        )}
      </div>

      {makeupAt && (
        <MakeupModal
          student={makeupAt.student}
          sess={makeupAt.sess}
          dateLabel={dateOf(makeupAt.sess)}
          canEdit={canEdit}
          records={makeupsOf(makeupAt.student.key, makeupAt.sess.sessionNo)}
          onClose={() => setMakeupAt(null)}
          onSave={(input) => {
            addStudentFeedback({
              studentKey: makeupAt.student.key,
              kind: "makeup",
              date: input.date,
              subject: `${makeupAt.sess.sessionNo}회차 ${shortLessonLabel(makeupAt.sess)} 보강 ${
                input.state === "done" ? "완료" : "예정"
              }`,
              text: input.memo,
              makeupState: input.state,
              sessionNo: makeupAt.sess.sessionNo,
              by: session.name,
              byRole: session.roleCode,
            });
            setMakeupAt(null);
          }}
        />
      )}

      {specialFormWeek !== null && (
        <SpecialSessionForm
          weekNo={specialFormWeek}
          lastWeek={DONE_WEEKS}
          defaultDate={mondayOfWeek(startsOn, specialFormWeek)}
          onClose={() => setSpecialFormWeek(null)}
          onSubmit={(input) => {
            addSpecialSession({
              cohortKey,
              weekNo: input.weekNo,
              date: input.date,
              title: input.title,
              createdBy: session.name,
              createdByRole: session.roleCode,
            });
            setSpecialFormWeek(null);
          }}
        />
      )}
    </Card>
  );
}

/**
 * 특강 출결 한 칸 (2026-08-15) — 눌러서 표시를 돌린다: 미입력 → 출석 → 결석 → 미입력.
 * ⚠️ **정규 출결과 다르다.** 정규는 원본 시트가 정본이라 못 고치고(불변식 3), 특강은
 * 원본에 없는 것이라 사이트가 기록한다. 어휘(`AttendanceMark`)는 같은 것을 쓴다.
 */
function SpecialCell({
  mark,
  canEdit,
  label,
  onCycle,
}: {
  mark: AttendanceMark;
  canEdit: boolean;
  label: string;
  onCycle: (next: AttendanceMark) => void;
}) {
  const NEXT: Partial<Record<AttendanceMark, AttendanceMark>> = {
    unknown: "present",
    present: "absent",
    absent: "unknown",
  };
  const glyph = (
    <span
      className={
        "inline-flex h-6 w-6 items-center justify-center rounded border text-[11px] font-bold " +
        MARK_TONE[mark] +
        (canEdit ? " transition hover:ring-2 hover:ring-gold-500" : "")
      }
    >
      {MARK_GLYPH[mark]}
    </span>
  );
  if (!canEdit) return <span title={`${label} — ${MARK_LABEL[mark]}`}>{glyph}</span>;
  return (
    <button
      type="button"
      onClick={() => onCycle(NEXT[mark] ?? "unknown")}
      title={`${label} — ${MARK_LABEL[mark]} · 눌러서 바꾸기`}
      aria-label={`${label} ${MARK_LABEL[mark]}`}
    >
      {glyph}
    </button>
  );
}

/**
 * 특강 등록 창 (2026-08-15 리드 지시) — 「주차마다 특강을 추가할 수 있도록 · 다른 요일에도」.
 * 주차와 날짜를 따로 받는다: 특강은 정규 수업 요일이 아니어도 되므로 날짜가 주차를 못 정한다.
 */
function SpecialSessionForm({
  weekNo,
  lastWeek,
  defaultDate,
  onClose,
  onSubmit,
}: {
  weekNo: number;
  lastWeek: number;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (input: { weekNo: number; date: string; title: string }) => void;
}) {
  const [week, setWeek] = useState(weekNo);
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="특강 추가"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 2) {
              setError("특강 이름을 두 글자 이상 적어 주세요.");
              return;
            }
            onSubmit({ weekNo: week, date, title: title.trim() });
          }}
          className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <h2 className="text-[16px] font-bold text-zion-900">특강 추가</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 rounded p-1 text-ink-soft hover:bg-zion-50"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mb-3 rounded-lg bg-zion-50 p-2.5 text-[11.5px] leading-relaxed text-ink-soft">
            정규 수업 요일이 아니어도 됩니다. <strong className="text-ink">특강은 출석률에서 빠집니다</strong> —
            수업날에 특강식으로 진행한 것은 여기 만들지 말고 그 회차 칸에 그대로 체크해 주세요.
          </p>

          <label className="mb-1 block text-[12px] font-semibold text-ink">주차</label>
          <input
            type="number"
            min={1}
            max={lastWeek}
            value={week}
            onChange={(e) => setWeek(Math.min(lastWeek, Math.max(1, Number(e.target.value) || 1)))}
            aria-label="주차"
            className="mb-3 w-24 rounded-lg border border-zion-200 px-2 py-1.5 text-[13px] outline-none focus:border-zion-500"
          />

          <label className="mb-1 block text-[12px] font-semibold text-ink">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="특강 날짜"
            className="mb-3 w-full rounded-lg border border-zion-200 px-2 py-1.5 text-[13px] outline-none focus:border-zion-500"
          />

          <label className="mb-1 block text-[12px] font-semibold text-ink">특강 이름</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 절기 특강 · 초청 강의"
            aria-label="특강 이름"
            className="mb-3 w-full rounded-lg border border-zion-200 px-2 py-1.5 text-[13px] outline-none focus:border-zion-500"
          />

          {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}

/**
 * 보강 기록 창 (2026-08-15 리드 지시) — 결석 칸을 눌러 연다.
 *
 * ⚠️ **출결을 고치는 창이 아니다**(불변식 3). 원본의 결석은 그대로 두고 「언제 보강하기로
 * 했는지 / 마쳤는지」와 메모를 옆에 남긴다. 저장된 기록은 `studentFeedback`(kind `makeup`)
 * 한 곳에 들어가므로 **수강생 상세의 「보강 · 상담 메모」가 같은 것을 읽는다** — 두 벌로
 * 나눠 저장하지 않는다.
 */
function MakeupModal({
  student,
  sess,
  dateLabel,
  canEdit,
  records,
  onClose,
  onSave,
}: {
  student: Student;
  sess: SessionInfo;
  dateLabel: string;
  canEdit: boolean;
  records: { id: string; date: string; text: string; by: string; makeupState?: "planned" | "done" }[];
  onClose: () => void;
  onSave: (input: { date: string; state: "planned" | "done"; memo: string }) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [state, setState] = useState<"planned" | "done">("planned");
  const [memo, setMemo] = useState("");

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="보강 기록"
      >
        <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-zion-900">{student.name} · 보강 기록</h2>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                {sess.weekNo}주차 {sess.weekdayLabel} {dateLabel} · {sess.sessionNo}회차 ·{" "}
                {/* 강 번호 없이 단계 + 과수 제목만 (2026-08-15) */}
                {`${sess.level} ${sess.lessonTitle}`.trim()}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 rounded p-1 text-ink-soft hover:bg-zion-50"
            >
              <X size={16} />
            </button>
          </div>

          <p className="mt-3 rounded-lg bg-zion-50 p-2.5 text-[11.5px] leading-relaxed text-ink-soft">
            출결 원본은 읽기 전용이라 <strong className="text-ink">결석 표시는 그대로 남습니다.</strong>{" "}
            여기 적는 것은 그 옆에 붙는 보강 기록이고, 수강생 관리의 「보강 · 상담 메모」에도 함께 뜹니다.
          </p>

          {records.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {records.map((r) => (
                <li key={r.id} className="rounded-lg border border-zion-100 p-2.5 text-[12px]">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
                    <span
                      className={
                        "rounded border px-1.5 py-0.5 font-bold " +
                        (r.makeupState === "done"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700")
                      }
                    >
                      {r.makeupState === "done" ? "완료" : "예정"}
                    </span>
                    {r.date} · {r.by}
                  </div>
                  {r.text && <p className="mt-1 whitespace-pre-wrap leading-relaxed text-ink">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}

          {canEdit ? (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                onSave({ date, state, memo: memo.trim() });
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                  보강일
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    aria-label="보강일"
                    className="rounded-lg border border-zion-200 px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                  />
                </label>
                <div className="flex rounded-lg bg-zion-100 p-0.5">
                  {(
                    [
                      ["planned", "계획"],
                      ["done", "완료"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setState(k)}
                      aria-pressed={state === k}
                      /*
                        `SegmentedTabs`를 쓰지 않는다 — 여기는 화면 전환이 아니라 **폼 값 고르기**라
                        `role="tablist"`가 잘못된 시맨틱이 된다. 색만 세그먼트 탭과 맞춘다.
                      */
                      className={
                        "rounded-md px-2.5 py-1 text-[12px] font-semibold transition " +
                        (state === k
                          ? "bg-zion-700 text-white shadow-sm"
                          : "text-zion-600 hover:bg-white/70 hover:text-zion-900")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="무엇을 어떻게 보강했는지 적습니다 (예: 3강 앞부분 다시, 질문 두 개 남음)"
                aria-label="보강 메모"
                className="w-full resize-y rounded-lg border border-zion-200 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
                >
                  기록하기
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-[12px] text-ink-soft">
              보강 기록은 <strong>해당 기수의 강사·전도사</strong>만 남깁니다.
            </p>
          )}
        </div>
      </div>
    </Portal>
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

/**
 * 2026-08-22 리드 피드백 5 — **본강(대면만)과 보강 포함을 한 그래프에** 낸다.
 * 종전 「우리 기수」 계열은 보강 포함으로 이름을 밝히고, 대면만 계열을 더했다.
 * ⚠️ 대면만은 **회차별 기록이 있는 최근 8주만** 그린다 — 8주 이전은 `studentWeekHistory`가
 * 출석/결석만 만들어 보강 정보가 없고, 두 선을 같게 그리면 「옛날엔 보강 격차가 0이었다」는
 * 거짓 신호가 된다. LineChart가 null 구간의 선을 끊어 준다.
 */
function EightMonthTrend({ students }: { students: Student[] }) {
  const [xAxis, setXAxis] = useState<TrendAxis>("month");
  const [copied, setCopied] = useState<"idle" | "copied" | "downloaded">("idle");
  /* 복사 대상 SVG를 찾는 ref — 종전에는 렌더마다 새로 만드는 객체 리터럴이었다(2026-08-22 교정) */
  const chartRef = useRef<HTMLDivElement | null>(null);

  /** 대면만 주간 비율 — 최근 8주(recentWeeks 창)만 값이 있다 */
  const presentOnlyPoints = useMemo(
    () =>
      WEEKLY_RATES.map((r) => {
        const ago = DONE_WEEKS - r.weekNo;
        if (ago < 0 || ago > 7) return null;
        return weekRates(students, ago)?.presentOnly ?? null;
      }),
    [students],
  );

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
          label:
            xAxis === "session" ? `${n}회차` : shortLessonLabel(lessonOfSession(Math.max(1, n))),
        };
      });
  }, [xAxis]);

  /** Y축 동적 범위 — 실측값 min~max에 5%p 여유 (FB-03ⓐ). 0~100 고정 금지 */
  const yRange = useMemo(() => {
    const all = [
      ...WEEKLY_RATES.flatMap((r) => [r.rate, r.tribeAvg, r.allAvg]),
      ...presentOnlyPoints,
    ].filter((v): v is number => v !== null);
    return {
      min: Math.max(0, Math.floor(Math.min(...all)) - 5),
      max: Math.min(100, Math.ceil(Math.max(...all)) + 5),
    };
  }, [presentOnlyPoints]);

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
      `${COHORT.cohort} 출석 흐름 (${axisLabel}) — 실선 보강 포함 · 초록점선 대면만(최근 8주) · 긴점선 지파 평균 · 짧은점선 12지파 평균`,
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
          <SegmentedTabs
            label="흐름 그래프 X축"
            size="sm"
            value={xAxis}
            onChange={setXAxis}
            items={[
              { id: "month", label: "월별" },
              { id: "session", label: "회차별" },
              { id: "lesson", label: "진도별" },
            ]}
          />
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
        주입니다. 대면만(본강) 계열은 회차별 기록이 있는 최근 8주만 그립니다. 주차를 하나씩
        파려면 아래 막대에서 누르세요.
      </p>
      <div
        ref={(el) => {
          chartRef.current = el;
        }}
      >
        <LineChart
          ariaLabel="주차별 출석률 — 우리 기수(보강 포함·대면만)·지파 평균·12지파 평균 비교"
          yMin={yRange.min}
          yMax={yRange.max}
          series={[
            {
              label: "우리 기수 (보강 포함)",
              strokeClass: "stroke-zion-700",
              points: WEEKLY_RATES.map((r) => r.rate),
            },
            {
              label: "우리 기수 (대면만 · 최근 8주)",
              strokeClass: "stroke-emerald-500",
              dash: "4 2",
              points: presentOnlyPoints,
            },
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
 * 기수 비교 — **같은 회차에서 견준다** (2026-08-15 리드 지시로 축을 갈았다).
 *
 * 종전에는 지금 누적 출석률만 줄 세웠다. 그런데 **월 초 개강한 반과 월 말 개강한 반은
 * 진도가 다르다** — 달력으로 견주면 「우리가 높아 보이는데 알고 보니 상대는 3개월 앞선
 * 반이고, 정작 우리 진도에서는 그쪽이 더 높았다」가 된다.
 * 그래서 **개강 후 N회차**를 축으로 놓는다. 이미 앞선 기수도 **그 회차에서 어땠는지**가 보인다.
 *
 * ⚠️ 담당 범위 밖 지파는 **기수명과 출석률 집계까지만** 보여 준다 (불변식 2 — 집계·통계만 반출).
 * ⚠️ 회차별 출석률은 `cohort-mock`의 `sessionRateOf`가 만드는 **시범 값**이다(교체 경계).
 */
function CohortCompare() {
  const session = useSession();
  const { scheduleOverrides } = useStore();
  const [scope, setScope] = useState<"tribe" | "all">("tribe");

  /**
   * 우리 기수의 개월수는 **전체 현황의 일정에서 온다** (2026-08-15 리드 지시 — 「전체현황에
   * 나와 있는 데이터와 연동」). 화면에서 개강·종강을 고치면 이 값이 따라 움직인다 —
   * 목업의 `months`를 쓰면 고친 일정과 어긋난다.
   */
  const mySchedule = effectiveSchedule(SCHEDULE, scheduleOverrides, cohortKeyOf(session));
  const myMonths = scheduleSummary(mySchedule.startsOn, mySchedule.endsOn).months;

  /** 우리 기수가 지금까지 마친 회차 — 비교 자리의 기본값이다 */
  const myDone = useMemo(
    () => COHORT_RANKS.find((r) => r.isMine)?.doneSessions ?? sessionsThroughWeek(DONE_WEEKS),
    [],
  );
  const [at, setAt] = useState(myDone);
  const atLesson = lessonOfSession(at);

  const rows = useMemo(() => {
    const list =
      scope === "tribe" ? COHORT_RANKS.filter((r) => r.tribe === COHORT.tribe) : COHORT_RANKS;
    return list
      // 우리 기수의 개월수만 화면 일정에서 덮어쓴다 — 남의 기수는 목업 값 그대로다
      .map((r) => ({ ...r, months: r.isMine ? myMonths : r.months, atRate: sessionRateOf(r, at) }))
      .sort((a, b) => {
        // 아직 그 회차에 이르지 못한 기수는 아래로 — 견줄 값이 없다
        if (a.atRate === null || b.atRate === null) {
          if (a.atRate === b.atRate) return b.rate - a.rate;
          return a.atRate === null ? 1 : -1;
        }
        return b.atRate - a.atRate;
      });
  }, [scope, at, myMonths]);

  /*
    **12지파 전체 비교는 누구나 본다** (2026-08-15 리드 지시 — 「비교를 12지파 전체로도
    볼 수 있도록」). 종전에는 총회 범위 계정만 봤다.
    ⚠️ 불변식 2에 어긋나지 않는다 — 이 탭이 내보내는 것은 **기수명과 출석률 집계**뿐이고
    수강생 개인 정보는 어떤 형태로도 들어가지 않는다.
  */

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          {/* 이름은 「비교」다 (2026-08-15 리드 지시 — 「같은 회차에서 견주기」에서 바꿨다) */}
          <div className="text-[14px] font-bold text-zion-900">비교</div>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            개강 시점이 다른 기수를 달력으로 견주면 불공정합니다 —{" "}
            <strong>같은 회차·같은 강에서 어땠는지</strong>로 봅니다. 이미 앞선 기수도 그 진도에서의
            출석률이 나옵니다. <strong>기수마다 과정 개월수가 다르므로</strong> 이름 옆에 함께 적습니다.
          </p>
        </div>
        <SegmentedTabs
          label="비교 범위"
          size="sm"
          value={scope}
          onChange={setScope}
          items={[
            { id: "tribe", label: `${COHORT.tribe} 지파 내` },
            { id: "all", label: "12지파 전체" },
          ]}
        />
      </div>

      {/* 견줄 회차 고르기 — 기본은 우리 기수가 지금 하고 있는 진도다 */}
      <div className="mb-4 rounded-xl bg-zion-50 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12px] text-ink-soft">
            견줄 자리{" "}
            <strong className="text-[13px] text-zion-900">
              {at}회차 ·{" "}
              {/* 단계 색 (2026-08-15) — 어느 과정의 회차인지 색으로 먼저 읽힌다 */}
              {atLesson.undecided ? (
                <span className="text-ink-soft">진도 미정 (기수 재량)</span>
              ) : (
                /* ⚠️ 강 번호는 넣지 않는다 — 연속 번호 표기를 뺐다(2026-08-15 리드 지시) */
                <span className={"rounded px-1.5 py-0.5 " + LEVEL_TONE[atLesson.level]}>
                  {atLesson.level}
                  {atLesson.keyword && ` ${atLesson.keyword}`}
                </span>
              )}
            </strong>
            {/*
              원문 제목은 핵심단어 **뒤에 남는 부분만** 보인다 — 고등은 제목이
              「계 17장 마귀의 양식…」이라 그대로 두면 「계 17장」이 두 번 나온다.
            */}
            {(() => {
              const tail = atLesson.title.startsWith(atLesson.keyword)
                ? atLesson.title.slice(atLesson.keyword.length).trim()
                : atLesson.title;
              return tail && tail !== atLesson.keyword ? (
                <span className="ml-1 text-ink-soft">{tail}</span>
              ) : null;
            })()}
          </div>
          <button
            onClick={() => setAt(myDone)}
            disabled={at === myDone}
            className="shrink-0 rounded-lg border border-zion-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-zion-700 transition hover:border-zion-400 disabled:cursor-not-allowed disabled:text-zion-300"
          >
            우리 지금 진도({myDone}회차)
          </button>
        </div>
        <input
          type="range"
          min={1}
          max={TOTAL_SESSIONS}
          value={at}
          onChange={(e) => setAt(Number(e.target.value))}
          aria-label="견줄 회차"
          className="mt-2 w-full accent-zion-700"
        />
        <div className="flex justify-between text-[10.5px] text-ink-soft">
          <span>1회차</span>
          <span>{TOTAL_SESSIONS}회차</span>
        </div>
      </div>

      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={`${r.tribe}-${r.church}-${r.cohort}`}
            className={
              "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 " +
              (r.isMine ? "bg-zion-50 ring-1 ring-zion-300" : "bg-white")
            }
          >
            <span className="w-5 shrink-0 text-[12px] font-bold text-ink-soft">
              {r.atRate === null ? "—" : i + 1}
            </span>
            <span className="min-w-0 flex-1 text-[13px] text-ink">
              <span className="font-semibold">{r.cohort}</span>
              {/*
                과정 개월수 (2026-08-15 리드 지시) — 지파마다 6~8개월로 달라서, 같은 회차라도
                **어느 속도의 과정인지**를 알아야 견줄 수 있다. 타 지파 것도 함께 보인다.
              */}
              <span className="ml-1 rounded bg-zion-100 px-1.5 py-0.5 text-[10.5px] font-bold text-zion-700">
                {r.months}개월
              </span>
              <span className="text-ink-soft">
                {" "}
                · {r.tribe} 지파 {r.church}
              </span>
              {r.isMine && <span className="ml-1.5 text-[11px] font-semibold text-zion-700">우리 기수</span>}
              {/* 개강일과 지금 진도 — 「왜 그 회차에 값이 없는지」가 여기서 설명된다 */}
              <span className="block text-[11px] text-ink-soft">
                {r.startsOn} 개강 · 지금 {r.doneSessions}회차
                {r.doneSessions > myDone && " (우리보다 앞섬)"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {r.atRate === null ? (
                <span className="text-[11.5px] text-ink-soft">아직 그 회차 전</span>
              ) : (
                <>
                  <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-zion-100 sm:block">
                    <span
                      className="block h-full rounded-full bg-zion-700"
                      style={{ width: `${r.atRate}%` }}
                    />
                  </span>
                  <span className="text-right">
                    <span className="block text-[13px] font-bold text-zion-800">{r.atRate}%</span>
                    <span className="block text-[10.5px] text-ink-soft">지금 누적 {r.rate}%</span>
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
        큰 숫자는 <strong className="text-ink">고른 회차에서의 출석률</strong>이고, 작은 숫자는 그 기수의
        지금 누적 출석률입니다 — 둘이 다르면 진도가 달라서입니다. 다른 지파는{" "}
        <strong className="text-ink">기수명과 출석률 집계까지만</strong> 표시합니다 — 수강생 개인정보는
        담당 범위 밖으로 나가지 않습니다. <strong className="text-ink">우리 기수의 개월수는 전체
        현황의 일정</strong>에서 오고, 다른 기수는 그 기수에 적힌 값입니다. 회차별 값은 시범 데이터입니다.
      </p>
    </Card>
  );
}
