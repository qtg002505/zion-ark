/**
 * 12지파 선교센터 — 위치와 그 센터에서 도는 기수 (2026-08-11 리드 지시).
 *
 * ⚠️ **전원 가상 데이터다** (불변식 6). 센터 주소만 리드가 준 실제 값이고,
 * 기수 번호·개강일·진도·출석률은 화면을 확인하려고 만든 목업이다.
 * 화면에도 그렇게 표기한다.
 *
 * 실연동 시에는 `cohorts` 테이블(개강일·종강예정일·진도 회차)과
 * 조직 테이블(지파-교회-센터)에서 온다 — 이 파일이 교체 경계다.
 */

/** 12지파 — 조직 계층의 두 번째 단계 (총회 → **지파** → 교회 → 기수) */
export const TRIBES = [
  "요한",
  "베드로",
  "부산야고보",
  "안드레",
  "다대오",
  "빌립",
  "시몬",
  "바돌로매",
  "마태",
  "맛디아",
  "서울야고보",
  "도마",
] as const;

export type TribeName = (typeof TRIBES)[number];

/** 센터에서 도는 기수 하나 */
export interface CenterCohort {
  /** 기수 이름 — 화면 표기와 담당 기수 대조에 쓴다 */
  name: string;
  /** 개강일 · 종강 예정일 (YYYY-MM-DD) */
  startsOn: string;
  endsOn: string;
  /** 진도 — 전체 회차 중 몇 회차까지 나갔나 */
  session: number;
  totalSessions: number;
  /** 수강생 수 — 목업 */
  students: number;
  /** 강의 시간대 표기 (현장 어휘 그대로) */
  slot: string;
}

export interface MissionCenter {
  id: string;
  /** 센터 이름 */
  name: string;
  /**
   * 지파. **아직 배정을 못 받은 센터는 `null`**로 둔다 —
   * 임의로 채우면 조직도와 어긋나고, 화면에서 「지파 확인 필요」로 드러내는 편이 낫다.
   * (대전 두 곳은 2026-08-11에 리드가 「맛디아 지파」로 알려 줬다.)
   */
  tribe: TribeName | null;
  /** 도로명 또는 지번 주소 — 좌표를 찾는 정본이다 */
  address: string;
  /** 건물 안에서 쓰는 층 */
  floor: string;
  /** 광역 단위 — 지도를 열자마자 어느 지역인지 훑을 때 쓴다 */
  region: string;
  /**
   * 좌표. **주소를 좌표로 바꾸는 일은 지도가 켜졌을 때 카카오 쪽에 맡긴다** —
   * 여기 값은 지도를 못 켰을 때(키 없음·차단) 지도 중심을 잡는 어림값이고,
   * 주소 검색이 실패했을 때의 대비책이기도 하다.
   */
  fallbackLat: number;
  fallbackLng: number;
  cohorts: CenterCohort[];
}

/**
 * 지금 채운 곳은 **대전 두 곳**이다 (2026-08-11 리드 지시 — 「일단 2개 기수부터」).
 * 나머지 지파 센터는 주소를 받는 대로 이 배열에 줄만 더하면 지도와 목록에 함께 뜬다.
 */
export const MISSION_CENTERS: MissionCenter[] = [
  {
    id: "daejeon-wolpyeong-ro-65",
    name: "대전 월평 제1센터",
    tribe: "맛디아",
    address: "대전광역시 서구 월평로 65",
    floor: "3층",
    region: "대전",
    // 월평동 일대 어림값 — 지도가 켜지면 주소로 다시 찾아 정확한 자리에 찍는다
    fallbackLat: 36.3587,
    fallbackLng: 127.3648,
    cohorts: [
      {
        name: "118기",
        startsOn: "2026-04-06",
        endsOn: "2026-10-19",
        session: 71,
        totalSessions: 92,
        students: 21,
        slot: "저녁",
      },
    ],
  },
  {
    id: "daejeon-wolpyeong-54",
    name: "대전 월평 제2센터",
    tribe: "맛디아",
    address: "대전광역시 서구 월평동 54",
    floor: "5층",
    region: "대전",
    fallbackLat: 36.3562,
    fallbackLng: 127.3691,
    cohorts: [
      {
        name: "119기",
        startsOn: "2026-05-11",
        endsOn: "2026-11-23",
        session: 58,
        totalSessions: 92,
        students: 17,
        slot: "오전",
      },
    ],
  },
];

/** 지도를 처음 열었을 때 잡을 자리 — 지금은 센터가 대전에만 있어 그 가운데를 본다 */
export const MAP_DEFAULT_CENTER = {
  lat: 36.3575,
  lng: 127.367,
  /** 카카오맵 확대 수준 — 숫자가 작을수록 가깝다 */
  level: 6,
};

/** 진도 몇 %까지 왔나 */
export function progressPercent(c: CenterCohort): number {
  return Math.round((c.session / c.totalSessions) * 100);
}

/** 종강까지 남은 날 — 지난 기수면 0 */
export function daysLeft(c: CenterCohort, today = new Date()): number {
  const end = new Date(c.endsOn + "T00:00:00");
  const diff = Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}
