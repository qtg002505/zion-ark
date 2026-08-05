import type { Student } from "../lib/types";

/**
 * 시범 기수 목업 데이터 — 실제 개인정보 아님 (전원 가상 인물).
 * 분포는 예시 기수 실측 구조를 재현: 수강생 17명, 출석률 97~100% 8명 /
 * 50~96% 0명 / 13~49% 9명 — "중간이 없다"는 이 구조가 전체 현황이 가장 먼저
 * 드러내야 할 사실이다 (CLAUDE.md §12-2 화면 설계 지침).
 * 실제 연동 시 attendance-adapter(읽기 전용 시트 → 표준 모델)로 교체한다.
 */

export const COHORT = { tribe: "요한", church: "과천교회", cohort: "113기" };
export const DIVISIONS = ["1분반", "2분반", "3분반", "4분반"];
export const TOTAL_SESSIONS = 92;

function s(
  name: string,
  division: string,
  rate: number,
  status: Student["status"],
  slots: [number, number, number],
  lastAttended: string | null,
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
  };
}

/** 상위 그룹 8명 (97~100%) — 저녁 대면 비중 높음 (전체 대면의 약 45%) */
export const STUDENTS: Student[] = [
  s("김하늘", "1분반", 100, "active", [44, 28, 20], "2026-08-03"),
  s("이보람", "1분반", 99, "active", [40, 26, 25], "2026-08-03"),
  s("박은솔", "2분반", 99, "active", [42, 30, 19], "2026-08-03"),
  s("정다운", "2분반", 98, "active", [38, 27, 25], "2026-08-01"),
  s("최슬기", "3분반", 98, "active", [45, 25, 20], "2026-08-03"),
  s("한결", "3분반", 97, "active", [39, 28, 22], "2026-08-01"),
  s("서지온", "4분반", 97, "active", [41, 24, 24], "2026-08-03"),
  s("문소망", "4분반", 97, "active", [37, 29, 23], "2026-08-01"),
  // 하위 그룹 9명 (13~49%) — 초반 이탈 후 미복귀 패턴
  s("강믿음", "1분반", 49, "atRisk", [20, 15, 10], "2026-07-20"),
  s("윤새벽", "1분반", 44, "atRisk", [18, 13, 9], "2026-07-13"),
  s("임푸름", "2분반", 39, "atRisk", [16, 11, 9], "2026-07-06"),
  s("오아름", "2분반", 33, "atRisk", [13, 10, 7], "2026-06-29"),
  s("신여울", "3분반", 29, "paused", [12, 8, 7], "2026-06-15"),
  s("황이든", "3분반", 25, "paused", [10, 8, 5], "2026-06-08"),
  s("송가온", "4분반", 21, "paused", [9, 6, 4], "2026-05-25"),
  s("배라온", "4분반", 17, "paused", [7, 5, 4], "2026-05-11"),
  s("조미르", "4분반", 13, "paused", [5, 4, 3], "2026-04-27"),
];

export const STATUS_LABELS: Record<Student["status"], string> = {
  active: "수강 중",
  atRisk: "중단 위기",
  paused: "중단",
};
