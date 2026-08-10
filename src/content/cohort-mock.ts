import type { AttendanceMark, Student, WeeklyAttendance } from "../lib/types";

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
 * 실연동 시 `cohorts` 테이블의 개강일·종강예정일·새신자교육일 컬럼에서 온다.
 */
export const SCHEDULE = {
  startsOn: "2026-03-02",
  endsOn: "2026-09-14",
  newcomerOn: "2026-08-17",
};
export const DIVISIONS = ["1분반", "2분반", "3분반", "4분반"];
export const TOTAL_SESSIONS = 92;

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
 * 주차별 출석률 — 이전 주 대비 흐름과 지파 평균 비교에 쓴다 (2026-08-06 회의 확정).
 * `reason`은 사람이 적는 필드다. 자동 산출이 아니라 담당자가 그 주에 무슨 일이
 * 있었는지 남기고, 그래프에 손을 올리면 그대로 보인다.
 * ⚠️ 입력 화면과 권한은 아직 정해지지 않았다 (회의 메모 미해결 9번).
 */
export interface WeeklyRate {
  week: string;
  rate: number;
  /** 지파 내 최근 3개 기수 평균 — 우리 기수가 어디쯤인지 가늠하는 기준선 */
  tribeAvg: number;
  reason?: string;
  overcome?: string;
}

export const WEEKLY_RATES: WeeklyRate[] = [
  { week: "5월 4주", rate: 88, tribeAvg: 82 },
  { week: "6월 1주", rate: 86, tribeAvg: 81 },
  {
    week: "6월 2주",
    rate: 74,
    tribeAvg: 80,
    reason: "장마로 저녁 대면 참석이 크게 줄었습니다.",
    overcome: "다음 주 오전 보강을 열어 8명이 참석했습니다.",
  },
  { week: "6월 3주", rate: 83, tribeAvg: 80 },
  { week: "6월 4주", rate: 81, tribeAvg: 79 },
  {
    week: "7월 1주",
    rate: 69,
    tribeAvg: 78,
    reason: "휴가철이 겹쳐 결석이 늘었습니다.",
    overcome: "미리 보강 일정을 잡아 이탈로 이어지지 않게 했습니다.",
  },
  { week: "7월 2주", rate: 77, tribeAvg: 78 },
  { week: "7월 3주", rate: 80, tribeAvg: 79 },
];

/**
 * 지파 내·전국 기수 비교 — 우수 기수 필터 (2026-08-06 회의 확정).
 * ⚠️ 담당 범위 밖 지파 데이터는 **기수명과 출석률 집계까지만** 담는다.
 * 개인정보는 어떤 형태로도 넣지 않는다 (불변식 2 — 집계·통계만 반출).
 */
export interface CohortRank {
  tribe: string;
  church: string;
  cohort: string;
  rate: number;
  /** 우리 기수인지 */
  isMine?: boolean;
}

export const COHORT_RANKS: CohortRank[] = [
  { tribe: "요한", church: "과천교회", cohort: "115기", rate: 91 },
  { tribe: "요한", church: "안양교회", cohort: "112기", rate: 87 },
  { tribe: "요한", church: "과천교회", cohort: "113기", rate: 80, isMine: true },
  { tribe: "요한", church: "수원교회", cohort: "114기", rate: 76 },
  { tribe: "바돌로매", church: "대구교회", cohort: "108기", rate: 94 },
  { tribe: "베드로", church: "부산교회", cohort: "121기", rate: 89 },
  { tribe: "마태", church: "광주교회", cohort: "110기", rate: 85 },
  { tribe: "도마", church: "대전교회", cohort: "119기", rate: 83 },
];

export const STATUS_LABELS: Record<Student["status"], string> = {
  active: "수강 중",
  atRisk: "중단 위기",
  paused: "중단",
};
