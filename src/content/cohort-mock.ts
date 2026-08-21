import type { AttendanceMark, Student, WeeklyAttendance } from "../lib/types";
import { countClassDays, mondayOfWeek, weekLabelOf, weekNoOf } from "../lib/cohort-calendar";
import { CHECKLIST_STANDARDS } from "./checklist-standards";
import type { ChecklistProgress, CourseLevel } from "./student-profiles";

/**
 * 시범 기수 목업 데이터 — 실제 개인정보 아님 (전원 가상 인물).
 * 분포는 예시 기수 실측 구조를 재현: 수강생 17명, 출석률 97~100% 8명 /
 * 50~96% 0명 / 13~49% 9명 — "중간이 없다"는 이 구조가 전체 현황이 가장 먼저
 * 드러내야 할 사실이다 (CLAUDE.md §12-2 화면 설계 지침).
 * 실제 연동 시 attendance-adapter(읽기 전용 시트 → 표준 모델)로 교체한다.
 */

export const COHORT = { tribe: "요한", church: "과천교회", cohort: "113기" };

/**
 * 기수 일정 — 점검자가 진행 상황을 가늠하는 기준 (2026-08-06 회의 확정).
 * 실연동 시 `cohorts` 테이블의 개강일·종강예정일 컬럼에서 온다.
 *
 * **2026-08-13 리드 확정 — 개강~종강 8개월, 월·화·목 수업.**
 * 개강 2026-03-02(월) 기준 8개월째의 마지막 수업일이 2026-10-29(목)이다.
 * 화면에서 편집한 값은 `ScheduleOverride`(store)에 얹히고, 읽는 쪽은
 * `effectiveSchedule()`을 거친다 — 이 상수는 기본값이다.
 */
export const SCHEDULE = {
  startsOn: "2026-03-02",
  endsOn: "2026-10-29",
  /**
   * ⚠️ 2026-08-13부터 **읽는 곳이 없다.** 새신자교육 종강 예정일은 「종강 예정일 + 2주」로
   * 항상 파생한다(`newcomerEndOf`). 필드를 지우지 않는 것은 실연동 시 컬럼 대응을
   * 남겨 두기 위해서다 — `division`·`section`과 같은 취급(불변식 10).
   */
  newcomerOn: "2026-08-17",
};
export const DIVISIONS = ["1분반", "2분반", "3분반", "4분반"];

/**
 * 총 수업 회차 — 월·화·목 수업일을 세어 낸다 (2026-08-13, 종전 상수 92를 대체).
 * 8개월 · 35주 × 3회 = **105회**. 공휴일을 빼지 않는 이유는 `scheduleSummary` 주석에 있다.
 */
export const TOTAL_SESSIONS = countClassDays(SCHEDULE.startsOn, SCHEDULE.endsOn);

/**
 * 목업 실적이 멈춰 있는 주차 — 시연 기준일(2026-08-13, 24주차 진행 중)까지의
 * **완료 주차**다. 주차별 실적·출석 격자가 이 주까지만 값을 갖는다.
 * ⚠️ 실제 오늘 날짜가 지나가도 목업 실적은 안 늘어난다 — 시연 한계로 명시해 둔다.
 */
export const DONE_WEEKS = 23;

/**
 * 최근 8주 출결을 짧은 부호로 적는다 — 읽기 쉽고, 신호 규칙을 눈으로 확인하기 좋다.
 *   O 대면 출석 · A 결석 · M 금주보강 · D 추후완료 · - 미입력
 *   뒤에 시간대를 붙인다: Oe(저녁) Om(오전) Oa(오후)
 * 왼쪽이 최근 주다.
 */
function weeks(spec: string): WeeklyAttendance[] {
  const MARK: Record<string, AttendanceMark> = {
    O: "present",
    A: "absent",
    M: "makeupPending",
    D: "makeupDone",
    "-": "unknown",
  };
  const SLOT: Record<string, WeeklyAttendance["slot"]> = {
    e: "evening",
    m: "morning",
    a: "afternoon",
  };
  return spec.split(" ").map((token, i) => ({
    weeksAgo: i,
    mark: MARK[token[0]] ?? "unknown",
    slot: token[1] ? (SLOT[token[1]] ?? null) : null,
  }));
}

function s(
  name: string,
  division: string,
  rate: number,
  status: Student["status"],
  slots: [number, number, number],
  lastAttended: string | null,
  recent: string,
): Student {
  const presentCount = Math.round((rate / 100) * TOTAL_SESSIONS);
  return {
    key: `과천교회|113기|${division}|${name}`,
    name,
    division,
    attendanceRate: rate,
    presentCount,
    totalSessions: TOTAL_SESSIONS,
    status,
    slotCounts: { evening: slots[0], morning: slots[1], afternoon: slots[2] },
    lastAttended,
    recentWeeks: weeks(recent),
  };
}

/**
 * 상위 그룹 8명 (97~100%) — 저녁 대면 비중 높음 (전체 대면의 약 45%).
 *
 * 이 중 몇 명은 **누적 출석률은 아직 높지만 최근 몇 주가 흔들린다.** 누적 숫자만 보면
 * 멀쩡해 보여서 놓치기 쉬운 사람들이고, 조기 신호 화면이 겨냥하는 대상이 바로 이들이다.
 */
export const STUDENTS: Student[] = [
  s("김하늘", "1분반", 100, "active", [44, 28, 20], "2026-08-03", "Oe Oe Oe Oe Oe Oe Oe Oe"),
  // 누적 99%인데 최근 2주 연속 결석 — 지금 잡아야 하는 사람
  s("이보람", "1분반", 99, "active", [40, 26, 25], "2026-07-20", "A A Oe Oe Oe Oe Oe Oe"),
  // 저녁에서 오전으로 시간대만 바뀌었을 뿐 출석은 꾸준함 — 신호로 보지 않는다(2026-08-09 리드)
  s("박은솔", "2분반", 99, "active", [42, 30, 19], "2026-08-03", "Om Om Oe Oe Oe Oe Oe Oe"),
  s("정다운", "2분반", 98, "active", [38, 27, 25], "2026-08-01", "Oe Oe Oe Oa Oe Oe Oe Oe"),
  // 결석 후 보강을 잡아 두고 아직 이행하지 않음 (M) — 그 앞 결석은 보강으로 채웠다(D)
  s("최슬기", "3분반", 98, "active", [45, 25, 20], "2026-07-27", "M D Oe Oe Oe Oe Oe Oe"),
  s("한결", "3분반", 97, "active", [39, 28, 22], "2026-08-01", "Oe Oe Oe Oe Oe Om Oe Oe"),
  s("서지온", "4분반", 97, "active", [41, 24, 24], "2026-08-03", "Oe Oe Oe Oe Oe Oe Oe Oe"),
  // 최근 한 주가 미입력 — 확인이 필요한 약한 신호
  s("문소망", "4분반", 97, "active", [37, 29, 23], "2026-08-01", "- Oe Oe Oe Oe Oe Oe Oe"),
  // 하위 그룹 9명 (13~49%) — 초반 이탈 후 미복귀 패턴
  // 보강으로 따라잡는 중인 사람들 — 대면만 세면 아래 셋이 완전 이탈자와 같이 묶여
  // 실제보다 나빠 보인다. 「보강 포함 출석률」이 이 차이를 드러내는 자리다 (2026-08-10)
  s("강믿음", "1분반", 49, "atRisk", [20, 15, 10], "2026-07-20", "A D A A M A Oe Oe"),
  s("윤새벽", "1분반", 44, "atRisk", [18, 13, 9], "2026-07-13", "A D A A D A Oa Oe"),
  s("임푸름", "2분반", 39, "atRisk", [16, 11, 9], "2026-07-06", "A A D A A A A Oe"),
  s("오아름", "2분반", 33, "atRisk", [13, 10, 7], "2026-06-29", "A A A A A A A A"),
  s("신여울", "3분반", 29, "paused", [12, 8, 7], "2026-06-15", "A A A A A A A A"),
  s("황이든", "3분반", 25, "paused", [10, 8, 5], "2026-06-08", "A A A A A A A A"),
  s("송가온", "4분반", 21, "paused", [9, 6, 4], "2026-05-25", "A A A A A A A A"),
  s("배라온", "4분반", 17, "paused", [7, 5, 4], "2026-05-11", "A A A A A A A A"),
  s("조미르", "4분반", 13, "paused", [5, 4, 3], "2026-04-27", "A A A A A A A A"),
];

/**
 * 주차별 출석률 — 이전 주 대비 흐름과 지파·전국 평균 비교에 쓴다 (2026-08-06 회의 확정 ·
 * 2026-08-13 **8개월 전체 35주로 확장**, 12지파 평균 `allAvg` 추가).
 * `reason`은 사람이 적는 필드다. 자동 산출이 아니라 담당자가 그 주에 무슨 일이
 * 있었는지 남기고, 그래프에 손을 올리면 그대로 보인다.
 * ⚠️ 입력 화면과 권한은 아직 정해지지 않았다 (회의 메모 미해결 9번).
 */
export interface WeeklyRate {
  /** 1부터 세는 주차 */
  weekNo: number;
  /** 그 주 시작일 (개강 요일 기준) */
  weekOf: string;
  /**
   * 주차 라벨 겸 **`WeekNote` 조인 키** — 형식 불변 (「6월 2주」).
   * ⚠️ 그 주 **목요일** 기준으로 만든다 — 규칙을 바꾸면 저장된 사유·극복 기록이 끊어진다.
   */
  week: string;
  /** 미래 주는 null — 그래프가 선을 끊는 자리다 (0으로 그리면 폭락처럼 보인다) */
  rate: number | null;
  /** 지파 내 최근 3개 기수 평균 — 우리 기수가 어디쯤인지 가늠하는 기준선 */
  tribeAvg: number | null;
  /** 12지파 전체 평균 (2026-08-13 추가) — 집계·통계만 반출한다는 불변식 2 안의 값이다 */
  allAvg: number | null;
  reason?: string;
  overcome?: string;
}

/**
 * 손으로 적은 주차 실적 (1~23주차 = 개강 3/2 ~ 8월 1주).
 * **13~20주차는 종전 목업 8건을 라벨·수치·사유 그대로 옮긴 것**이다 — localStorage에
 * 저장된 주차 기록(`zion_ark_week_notes`)이 이 라벨로 조인되므로 값을 바꾸지 않는다.
 * 1~12주차는 개강 초반 하락 곡선(하위 그룹의 `lastAttended` 분포와 정합), 21~23주차는
 * 회복 흐름으로 채웠다.
 */
const ACTUALS: Record<number, Omit<WeeklyRate, "weekNo" | "weekOf" | "week">> = {
  1: { rate: 95, tribeAvg: 89, allAvg: 87 },
  2: { rate: 94, tribeAvg: 88, allAvg: 86 },
  3: { rate: 93, tribeAvg: 88, allAvg: 86 },
  4: { rate: 91, tribeAvg: 87, allAvg: 85 },
  5: { rate: 90, tribeAvg: 86, allAvg: 84 },
  6: { rate: 89, tribeAvg: 86, allAvg: 84 },
  7: { rate: 88, tribeAvg: 85, allAvg: 83 },
  8: { rate: 87, tribeAvg: 85, allAvg: 83 },
  9: { rate: 86, tribeAvg: 84, allAvg: 82 },
  10: { rate: 85, tribeAvg: 84, allAvg: 82 },
  11: { rate: 84, tribeAvg: 83, allAvg: 81 },
  12: { rate: 86, tribeAvg: 83, allAvg: 81 },
  13: { rate: 88, tribeAvg: 82, allAvg: 80 },
  14: { rate: 86, tribeAvg: 81, allAvg: 79 },
  15: {
    rate: 74,
    tribeAvg: 80,
    allAvg: 78,
    reason: "장마로 저녁 대면 참석이 크게 줄었습니다.",
    overcome: "다음 주 오전 보강을 열어 8명이 참석했습니다.",
  },
  16: { rate: 83, tribeAvg: 80, allAvg: 78 },
  17: { rate: 81, tribeAvg: 79, allAvg: 77 },
  18: {
    rate: 69,
    tribeAvg: 78,
    allAvg: 76,
    reason: "휴가철이 겹쳐 결석이 늘었습니다.",
    overcome: "미리 보강 일정을 잡아 이탈로 이어지지 않게 했습니다.",
  },
  19: { rate: 77, tribeAvg: 78, allAvg: 76 },
  20: { rate: 80, tribeAvg: 79, allAvg: 77 },
  21: { rate: 79, tribeAvg: 79, allAvg: 77 },
  22: { rate: 78, tribeAvg: 79, allAvg: 77 },
  23: { rate: 80, tribeAvg: 80, allAvg: 78 },
};

/** 1~35주차 전체를 만든다 — 실적이 없는 미래 주는 null로 둔다 */
function buildWeeklyRates(): WeeklyRate[] {
  const { startsOn, endsOn } = SCHEDULE;
  const totalWeeks = weekNoOf(startsOn, endsOn);
  const out: WeeklyRate[] = [];
  for (let n = 1; n <= totalWeeks; n++) {
    const weekOf = mondayOfWeek(startsOn, n);
    const actual = ACTUALS[n];
    out.push({
      weekNo: n,
      weekOf,
      week: weekLabelOf(weekOf),
      rate: actual?.rate ?? null,
      tribeAvg: actual?.tribeAvg ?? null,
      allAvg: actual?.allAvg ?? null,
      reason: actual?.reason,
      overcome: actual?.overcome,
    });
  }
  return out;
}

export const WEEKLY_RATES: WeeklyRate[] = buildWeeklyRates();

/**
 * 출석 격자 페이징용 — 한 수강생의 주 단위 출결을 `weekCount`주까지 만든다.
 *
 * 0~7주 전은 손으로 적은 `recentWeeks` 그대로이고, 그보다 옛 주는 결정적 규칙으로
 * 채운다: 그 주 시작일이 `lastAttended` 이전이면 출석(가장 많이 쓰는 시간대), 아니면 결석.
 * 하위 그룹의 「N월부터 안 나옴」 패턴이 그대로 재현된다.
 *
 * ⚠️ **`recentWeeks` 배열 자체를 늘리면 안 된다** — `rateOf()`의 「최근 8주」 의미가 깨져
 * 보강 포함 출석률이 전부 변한다. 그래서 별도 함수로 뒀다.
 */
export function studentWeekHistory(st: Student, weekCount: number): WeeklyAttendance[] {
  const out: WeeklyAttendance[] = st.recentWeeks.slice(0, weekCount).map((w) => ({ ...w }));
  const sc = st.slotCounts;
  const dominant: WeeklyAttendance["slot"] =
    sc.evening >= sc.morning && sc.evening >= sc.afternoon
      ? "evening"
      : sc.morning >= sc.afternoon
        ? "morning"
        : "afternoon";

  for (let w = out.length; w < weekCount; w++) {
    // weeksAgo w의 주 시작일 — 최근 완료 주(weeksAgo 0)가 DONE_WEEKS번째 주다
    const weekStart = mondayOfWeek(SCHEDULE.startsOn, DONE_WEEKS - w);
    const attended = st.lastAttended !== null && weekStart <= st.lastAttended;
    out.push({ weeksAgo: w, mark: attended ? "present" : "absent", slot: attended ? dominant : null });
  }
  return out;
}

/**
 * 지파 내·전국 기수 비교 — 우수 기수 필터 (2026-08-06 회의 확정).
 * ⚠️ 담당 범위 밖 지파 데이터는 **기수명과 출석률 집계까지만** 담는다.
 * 개인정보는 어떤 형태로도 넣지 않는다 (불변식 2 — 집계·통계만 반출).
 */
export interface CohortRank {
  tribe: string;
  church: string;
  cohort: string;
  /** 지금까지의 누적 출석률 — 기수마다 진도가 달라 이 값끼리는 공정한 비교가 아니다 */
  rate: number;
  /**
   * 개강일 — **회차 기준 비교의 뿌리**다 (2026-08-15 리드 지시).
   * 월 초 개강한 반과 월 말 개강한 반은 같은 달이어도 진도가 다르다.
   */
  startsOn: string;
  /** 지금까지 마친 회차 — 이 기수가 어디까지 나갔는지 */
  doneSessions: number;
  /**
   * 과정 개월수 (2026-08-15 리드 지시 — 「지파마다 수업 개월수가 다르기도 함(8~6개월)」).
   * 기수 이름 옆에 붙어, 같은 회차라도 **어느 속도로 가는 과정인지**가 함께 보인다.
   * ⚠️ 우리 기수는 이 값이 아니라 **전체 현황의 일정**(`effectiveSchedule`)에서 온다 —
   * 화면에서 개강·종강을 고치면 그쪽이 정본이라 목업 값과 어긋나면 안 된다.
   */
  months: number;
  /** 우리 기수인지 */
  isMine?: boolean;
}

/**
 * 지파 내·전국 기수 비교 목록.
 * ⚠️ 진도(회차)가 다른 기수를 견주려고 개강일·마친 회차를 함께 담는다 — 회차별 출석률은
 * 아래 `sessionRateOf`가 결정적 규칙으로 만든다(시범 값 · 불변식 6).
 */
export const COHORT_RANKS: CohortRank[] = [
  { tribe: "요한", church: "과천교회", cohort: "115기", rate: 91, startsOn: "2026-05-04", doneSessions: 42, months: 8 },
  { tribe: "요한", church: "안양교회", cohort: "112기", rate: 87, startsOn: "2025-12-01", doneSessions: 105, months: 8 },
  { tribe: "요한", church: "과천교회", cohort: "113기", rate: 80, startsOn: "2026-03-02", doneSessions: 69, months: 8, isMine: true },
  { tribe: "요한", church: "수원교회", cohort: "114기", rate: 76, startsOn: "2026-03-30", doneSessions: 57, months: 7 },
  { tribe: "바돌로매", church: "대구교회", cohort: "108기", rate: 94, startsOn: "2025-09-01", doneSessions: 105, months: 6 },
  { tribe: "베드로", church: "부산교회", cohort: "121기", rate: 89, startsOn: "2026-06-01", doneSessions: 30, months: 6 },
  { tribe: "마태", church: "광주교회", cohort: "110기", rate: 85, startsOn: "2025-11-03", doneSessions: 105, months: 7 },
  { tribe: "도마", church: "대전교회", cohort: "119기", rate: 83, startsOn: "2026-04-06", doneSessions: 51, months: 8 },
];

/**
 * **같은 회차에서의 출석률** — 기수 비교의 정본 (2026-08-15 리드 지시).
 *
 * 달력으로 견주면 개강 시점이 다른 기수끼리 불공정하다. 「3개월 먼저 개강한 반이 지금
 * 더 낮아 보여도, **우리가 지금 하는 그 진도에서는** 더 높았을 수 있다」는 것이 리드의 지적이다.
 * 그래서 축을 **개강 후 N회차**로 옮긴다 — 이미 앞선 기수도 그 회차에서 어땠는지가 보인다.
 *
 * ⚠️ **결정적 규칙으로 만든 시범 값이다**(불변식 6). 실연동 시 기수별 회차 출석률이
 * 집계로 들어오고, 화면은 이 함수만 갈아 끼우면 된다(교체 경계).
 * 규칙: 개강 초 높고 중반에 처지다 후반에 조금 회복 — 기수마다 누적 출석률(`rate`)을 중심으로 흔든다.
 * 아직 그 회차에 이르지 못한 기수는 **null**이다 — 0으로 그리면 폭락처럼 보인다.
 */
export function sessionRateOf(rank: CohortRank, sessionNo: number): number | null {
  if (sessionNo < 1 || sessionNo > rank.doneSessions) return null;
  const t = sessionNo / TOTAL_SESSIONS; // 0~1 진행도
  // 개강 직후 +8%p에서 시작해 60% 지점에서 -6%p까지 처지고 끝에서 -1%p로 회복하는 곡선
  const shape = 8 - 23 * t + 16 * t * t;
  // 기수마다 다른 잔결 — 이름에서 뽑은 고정 값이라 새로 고쳐도 안 흔들린다
  const seed = [...`${rank.church}${rank.cohort}`].reduce((n, c) => n + c.charCodeAt(0), 0);
  const wobble = ((seed + sessionNo * 7) % 5) - 2;
  return Math.max(0, Math.min(100, Math.round(rank.rate + shape + wobble)));
}

export const STATUS_LABELS: Record<Student["status"], string> = {
  active: "수강 중",
  atRisk: "중단 위기",
  paused: "중단",
};

/**
 * 기수 요약 퍼널 지표 (2026-08-13 리드 지시) — 신카부터 예상 종강까지의 흐름.
 *
 * ⚠️ **라벨은 리드가 적어 준 표기 그대로다** — 「신카」·「인섬교」는 용어집에 정의가 없는
 * 미확정 용어라 **키·enum으로 굳히지 않는다**(GLOSSARY 원칙). 「인섬교」가 용어집의
 * 「인교섬」(인도자·교사·섬김이)과 같은 것인지도 미확인이다 — 임의로 고쳐 적지 않는다.
 * 수치는 17명 목업과 정합하게 지어낸 시범 값이다(가상 — 불변식 6).
 */
export interface FunnelMetric {
  label: string;
  value: string;
  sub?: string;
}

export const COHORT_FUNNEL: FunnelMetric[] = [
  { label: "신카수", value: "31명" },
  { label: "인섬교 면접수", value: "27명" },
  { label: "수강생 면접수", value: "23명" },
  { label: "개강 1주차 출석", value: "20명", sub: "출석률 87%" },
  { label: "개강 4주차 출석", value: "18명", sub: "출석률 78%" },
  { label: "등록", value: "17명", sub: "등록률 74% (신카 대비)" },
  /* 단계는 **색 이름**으로 부른다 (2026-08-21 리드 지시 — 학원법). 표기는 `LEVEL_NAME`이 정본이다 */
  { label: "연두 시작 출석수", value: "17명" },
  { label: "주황 시작 출석수", value: "15명" },
  { label: "파랑 시작 출석수", value: "―", sub: "아직 진입 전" },
  { label: "예상 종강률", value: "47%", sub: "유지 8명 / 17명 기준" },
];

/**
 * 기수 사명자 현황 (2026-08-13 리드 지시) — 강사 1 · 주전도사 1 · 전도사 2.
 *
 * ⚠️ `role`은 **화면 표시 문자열일 뿐**이다. 「주전도사」 역할 코드는 미확정이라
 * (OPEN_QUESTIONS §C-2) `RoleCode`를 늘리지 않는다 — 계정·권한과 무관한 명단 표시다.
 * 이름은 전원 가상 인물이다 (불변식 6).
 */
export const COHORT_STAFF: { name: string; role: string }[] = [
  { name: "김이끎", role: "강사" },
  { name: "이맡음", role: "주전도사" },
  { name: "박세움", role: "전도사" },
  { name: "정도움", role: "전도사" },
];

/**
 * 단계 항목 점수 **시범 값** (2026-08-15 — 「지금 우리 기수는?」 화면용).
 *
 * 담당자가 매긴 실제 점수(`checklistProgress`)는 아직 하나도 없다. 그러면 새 화면이 통째로
 * 비어 리드가 모양을 볼 수 없으므로, **결정적 규칙으로 만든 시범 점수**를 깔아 둔다
 * (`COHORT_FUNNEL`·`sessionRateOf`와 같은 취급 · 불변식 6 — 가상 인물).
 *
 * ⚠️ **담당자가 실제로 매긴 점수가 있으면 그쪽이 이긴다** — 화면이 (수강생·단계·항목·질문)
 * 키로 실제 기록을 덮어 쓴다. 실연동에서는 이 배열을 통째로 지우면 된다(교체 경계).
 * ⚠️ 규칙: **출석률이 좋은 사람이 대체로 점수도 높다.** 지어낸 상관이지만 화면이
 * 앞뒤가 맞아야 모양을 판단할 수 있다. 고등은 아직 안 나간 단계라 **비워 둔다** —
 * 「아직 안 봄」이 어떻게 보이는지도 확인해야 하기 때문이다.
 */
export function demoChecklistProgress(): ChecklistProgress[] {
  const out: ChecklistProgress[] = [];
  const levels: CourseLevel[] = ["초등", "중등"];
  for (const level of levels) {
    const standard = CHECKLIST_STANDARDS[level];
    for (const s of STUDENTS) {
      const base = Math.round((s.attendanceRate / 100) * 5); // 0~5 — 출석이 좋으면 높다
      const seed = [...s.key].reduce((n, c) => n + c.charCodeAt(0), 0);
      for (const g of standard.groups) {
        // 중등은 앞 세 항목까지만 봤다고 둔다 — 진행 중인 단계라 뒤쪽이 비어야 자연스럽다
        if (level === "중등" && g.no > 3) continue;
        /*
          ⚠️ **항목마다 치우침을 준다.** 사람 편차(출석률)만 쓰면 항목 평균이 전부 한 구간에
          몰려 **강점도 약점도 하나도 안 나온다** — 처음 만들었을 때 실제로 54~65%에 다 몰렸다.
          기수는 원래 「잘 되는 항목과 안 되는 항목」이 갈리므로 그 모습이 나와야 화면을 판단할 수 있다.
        */
        const groupBias = ((g.no * 3) % 5) - 2; // -2 … +2
        g.questions.forEach((_, qIndex) => {
          const wobble = ((seed + g.no * 7 + qIndex * 3) % 3) - 1; // -1 · 0 · +1
          const score = Math.max(0, Math.min(5, base + groupBias + wobble));
          out.push({
            studentKey: s.key,
            level,
            groupNo: g.no,
            qIndex,
            score,
            updatedBy: "시범 값",
            updatedByRole: "instructor",
            updatedAt: `${SCHEDULE.startsOn}T09:00:00.000Z`,
          });
        });
      }
    }
  }
  return out;
}
