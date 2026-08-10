import type { Student } from "../lib/types";

/**
 * 수강생 상태 분석 목업 — 실제 개인정보 아님 (전원 가상 인물, 불변식 6).
 *
 * 현장에서 전도사들이 쓰는 **상태 분석 스프레드시트(16개 탭)** 의 구조를 화면으로 옮기기
 * 위한 시범 데이터다. 시트에서 확인한 구조만 가져왔고 내용은 전부 지어냈다:
 *
 * - 단계 현황판: 수강생 등급 `믿음 > 소망 > 사랑 > 평화 > 은혜` × 담당 전도사 매트릭스
 * - 필수보강 7종: 항목별 완료 날짜를 적고 완료 시 상태 전환 (시트에서는 노란 박스)
 * - 주간 점검표: 문항 × 수강생, `확실,적극 / 미흡 / 부정,안됨` 3단계 척도 — 매주 일요일
 *   주간회의에서 갱신
 * - 오픈·입교 진행: `완료 / 완료부정 / 예정 / 미정 / 수포` + 모수 대비 달성률
 * - 탈락 분류: 사유 7분류 정의 + 인원별 원인 분석 기록
 *
 * ⚠️ 단계·사유·척도 어휘는 **시트 원문 문자열 그대로** 쓰고 코드 값(enum·DB 코드)으로
 * 굳히지 않는다 — 표현이 다듬어지면 후방 마이그레이션이 되기 때문이다(불변식 10).
 * ⚠️ 출결 원본은 여기 없다 — 출결은 기존 `cohort-mock.ts`(AttendanceMark 계약)가 정본이고,
 * 이 파일은 그 위에 얹는 분석 관점만 담는다. 실연동 시 시트 어휘와의 대응은
 * `10:30/15:00/19:30`(시간대 값)→present · 보강예정→makeupPending · 보강완료→makeupDone.
 */

/** 담당 전도사 (가상 인물) — 분반은 권한 경계가 아니라 표시·분류용이다 (ORG_CHART) */
export const EVANGELISTS = [
  { name: "정선한", division: "1분반" },
  { name: "박이슬", division: "2분반" },
  { name: "한마루", division: "3분반" },
  { name: "김단비", division: "4분반" },
] as const;

export function evangelistOf(student: Student): string {
  return EVANGELISTS.find((e) => e.division === student.division)?.name ?? "미배정";
}

/** 수강생 단계 — 믿음이 최상위. 시트 원문 어휘 그대로 (코드 값으로 굳히지 않는다) */
export const STAGES = ["믿음", "소망", "사랑", "평화", "은혜"] as const;
export type Stage = (typeof STAGES)[number];

/** 단계 판정 기준 — 시트의 기준 정의를 요약한 것. 출석 빈도 + 태도 + 환경으로 판정한다 */
export const STAGE_CRITERIA: Record<Stage, string> = {
  믿음: "주 3회 출석과 분반·보강 참여가 모두 안정적이고 수강 목적이 확립된 인원.",
  소망: "주 3회 출석을 유지하지만 태도·점검 항목에 보완할 것이 남은 인원.",
  사랑: "주 3회 출석(보강 출석 포함)과 분반 참여는 지키지만 최근 흔들림이 보이는 인원.",
  평화: "주 1~2회 출석(습관적 결석)으로, 보강 중심으로 따라잡고 있는 인원.",
  은혜: "평화 단계 기준에 미치지 못한 인원 — 수강 포기자를 포함한다.",
};

/** 필수보강 7종 — 시트의 고정 컬럼 순서 그대로 */
export const MAKEUP_TOPICS = [
  "신앙의 중요성",
  "예배",
  "헌금",
  "전도",
  "인섬교 오픈 준비",
  "약속의 목자",
  "진성신 보강",
] as const;

/** 주차별 공통 보강 커리큘럼 흐름 — 시트의 주차 열 병합 헤더 */
export const WEEKLY_MAKEUP_FLOW = [
  "밭 점검과 때 · 계시말씀",
  "시대분별 · 목자구분",
  "정통과 이단",
  "이면유월",
  "달아보기",
] as const;

/** 심층 상담 도구 — 시트에서 관측된 어휘 */
export const COUNSEL_TOOLS = ["에니어그램", "도형", "방어기제", "핵심감정", "내면아이"] as const;

/** 이벤트(오픈·입교) 진행 상태 — 시트 달력의 접두 어휘 */
export const EVENT_STATUSES = ["완료", "완료부정", "예정", "미정", "수포"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export interface MakeupCell {
  /** M/D 표기 — 시트가 날짜를 그대로 적는 방식을 따른다 */
  date: string;
  status: "완료" | "예정";
}

export interface StudentAnalysis {
  /** cohort-mock의 수강생 이름과 대응 (가상 인물) */
  name: string;
  stage: Stage;
  /** 필수보강 진행 — 키는 MAKEUP_TOPICS 항목 문자열 */
  makeup: Partial<Record<(typeof MAKEUP_TOPICS)[number], MakeupCell>>;
  /** 보강 누적 회차 */
  makeupCount: number;
  /** 진행한 심층 상담 도구 — 비어 있으면 미진행(시트에서는 ‼️ 경고) */
  counselTools: string[];
  open: { status: EventStatus | null; date?: string };
  register: { status: EventStatus | null; date?: string };
}

function a(
  name: string,
  stage: Stage,
  makeupCount: number,
  makeup: Partial<Record<(typeof MAKEUP_TOPICS)[number], MakeupCell>>,
  counselTools: string[],
  open: StudentAnalysis["open"],
  register: StudentAnalysis["register"],
): StudentAnalysis {
  return { name, stage, makeupCount, makeup, counselTools, open, register };
}

const done = (date: string): MakeupCell => ({ date, status: "완료" });
const planned = (date: string): MakeupCell => ({ date, status: "예정" });

/**
 * 수강생별 분석 값 — 출결 목업(cohort-mock)의 흐름과 어긋나지 않게 지어냈다.
 * 상위 그룹은 단계가 높고 필수보강이 진행돼 있으며, 하위 그룹은 은혜 단계로 내려간다.
 */
export const STUDENT_ANALYSES: StudentAnalysis[] = [
  a("김하늘", "믿음", 7, {
    "신앙의 중요성": done("5/12"), 예배: done("5/19"), 헌금: done("5/26"), 전도: done("6/2"),
    "인섬교 오픈 준비": done("6/9"), "약속의 목자": done("6/23"), "진성신 보강": done("7/7"),
  }, ["에니어그램", "도형", "방어기제"], { status: "완료", date: "4/6" }, { status: "완료", date: "5/10" }),
  a("박은솔", "믿음", 6, {
    "신앙의 중요성": done("5/14"), 예배: done("5/28"), 헌금: done("6/4"), 전도: done("6/18"),
    "인섬교 오픈 준비": done("6/25"), "약속의 목자": done("7/9"), "진성신 보강": planned("8/13"),
  }, ["에니어그램", "핵심감정"], { status: "완료", date: "4/7" }, { status: "완료", date: "5/17" }),
  a("서지온", "믿음", 6, {
    "신앙의 중요성": done("5/13"), 예배: done("5/27"), 헌금: done("6/10"), 전도: done("6/24"),
    "인섬교 오픈 준비": done("7/1"), "약속의 목자": done("7/15"),
  }, ["도형", "방어기제"], { status: "완료", date: "4/13" }, { status: "예정", date: "8/16" }),
  a("정다운", "소망", 5, {
    "신앙의 중요성": done("5/20"), 예배: done("6/3"), 헌금: done("6/17"), 전도: done("7/1"),
    "인섬교 오픈 준비": done("7/15"),
  }, ["에니어그램"], { status: "완료", date: "4/20" }, { status: "예정", date: "8/23" }),
  a("한결", "소망", 5, {
    "신앙의 중요성": done("5/21"), 예배: done("6/4"), 헌금: done("6/18"), 전도: done("7/2"),
    "인섬교 오픈 준비": done("7/16"), "약속의 목자": planned("8/14"),
  }, ["에니어그램", "내면아이"], { status: "완료", date: "5/4" }, { status: "미정" }),
  a("문소망", "소망", 4, {
    "신앙의 중요성": done("5/22"), 예배: done("6/5"), 헌금: done("6/26"), 전도: done("7/10"),
  }, ["도형"], { status: "완료부정", date: "5/11" }, { status: "미정" }),
  a("이보람", "사랑", 4, {
    "신앙의 중요성": done("5/26"), 예배: done("6/9"), 헌금: done("6/30"), "인섬교 오픈 준비": planned("8/18"),
  }, ["에니어그램", "방어기제"], { status: "예정", date: "8/18" }, { status: null }),
  a("최슬기", "사랑", 3, {
    "신앙의 중요성": done("6/2"), 예배: done("6/16"), 헌금: planned("8/12"), 전도: planned("8/19"),
  }, [], { status: "예정", date: "8/20" }, { status: null }),
  a("강믿음", "평화", 2, {
    "신앙의 중요성": done("6/11"), 예배: done("7/2"),
  }, ["핵심감정"], { status: "미정" }, { status: null }),
  a("윤새벽", "평화", 2, {
    "신앙의 중요성": done("6/12"), 예배: planned("8/15"),
  }, [], { status: "미정" }, { status: null }),
  a("임푸름", "평화", 1, {
    "신앙의 중요성": done("6/25"),
  }, [], { status: "미정" }, { status: null }),
  a("오아름", "은혜", 1, { "신앙의 중요성": done("5/28") }, [], { status: "수포" }, { status: null }),
  a("신여울", "은혜", 0, {}, [], { status: "수포" }, { status: null }),
  a("황이든", "은혜", 0, {}, [], { status: "수포" }, { status: null }),
  a("송가온", "은혜", 0, {}, [], { status: "수포" }, { status: null }),
  a("배라온", "은혜", 0, {}, [], { status: "미정" }, { status: null }),
  a("조미르", "은혜", 0, {}, [], { status: "수포" }, { status: null }),
];

export function analysisOf(student: Student): StudentAnalysis | undefined {
  return STUDENT_ANALYSES.find((x) => x.name === student.name);
}

/* ---------------- 주간 점검표 (시트 10~14 — 전도사별 5부, 매주 일요일 주간회의) ---------------- */

/** 점검 응답 3단계 척도 — 시트 원문 어휘. 빈칸은 미점검이다 */
export const CHECK_SCALE = ["확실,적극", "미흡", "부정,안됨"] as const;
export type CheckMark = (typeof CHECK_SCALE)[number];

export interface CheckSection {
  label: string;
  items: string[];
}

/**
 * 점검 문항 — 시트의 구간 구성을 따르되 대표 문항만 실었다 (원본은 구간당 9~29문항).
 * 실연동 시 시트의 전체 문항이 이 구조로 들어온다.
 */
export const CHECK_SECTIONS: CheckSection[] = [
  {
    label: "수강환경 · 태도",
    items: [
      "수강 목적을 받아들이고 주 3회 출석을 노력한다",
      "수업 중 호응(아멘·대답)이 자연스럽다",
      "기도 습관이 잡혀 있다",
      "복습·묵상을 이어 간다",
      "감사 표현·약속 지키기 등 기본 태도가 안정적이다",
      "고정보강 약속을 지킨다",
    ],
  },
  {
    label: "입문 ~ 초등 5과",
    items: [
      "성경을 배워야 하는 이유를 설명할 수 있다",
      "때와 언약의 개념을 받아들인다",
      "수업 내용에 스스로 질문한다",
      "결석 시 보강으로 채우려는 의지가 있다",
    ],
  },
  {
    label: "초등 5~15과 · 말씀의 중요성",
    items: [
      "말씀의 중요성을 스스로 말한다",
      "주일 예배 환경이 마련돼 있다",
      "기도·헌금에 대한 거부감이 없다",
      "배운 내용을 주변에 전하려는 마음이 있다",
      "부모·가족의 신앙관을 파악했다",
    ],
  },
  {
    label: "초등 16~24과 · 오픈 대비",
    items: [
      "오픈을 받아들일 신앙 상태가 준비됐다",
      "교적부 작성에 동의했다",
      "흔들 수 있는 주변 요소가 정리됐다",
      "오픈 이후 계획(예배·새신자 교육)을 안다",
    ],
  },
];

/**
 * 점검 응답 — 가상 인물의 지어낸 값을 **결정적으로** 만들어 낸다 (렌더마다 같은 값).
 * 단계가 낮을수록 뒤 구간은 미점검(null)이고 응답도 낮게 나온다 — 시트에서 관찰된
 * "진도를 못 나간 인원은 뒤 문항이 비어 있다"는 패턴을 재현한 것이다.
 */
export function checkAnswer(
  analysis: StudentAnalysis,
  sectionIdx: number,
  itemIdx: number,
): CheckMark | null {
  const rank = STAGES.indexOf(analysis.stage); // 0(믿음) ~ 4(은혜)
  const reached = [4, 4, 3, 2, 1][rank]; // 단계별로 점검이 닿은 구간 수
  if (sectionIdx >= reached) return null;
  let h = 0;
  for (const ch of analysis.name) h += ch.charCodeAt(0);
  h = (h + sectionIdx * 7 + itemIdx * 3) % 10;
  const [sure, weak] = [
    [8, 10],
    [6, 9],
    [4, 8],
    [2, 6],
    [1, 4],
  ][rank];
  if (h < sure) return "확실,적극";
  if (h < weak) return "미흡";
  return "부정,안됨";
}

/* ---------------- 탈락 분류 (시트 5 — 사유 코드 정의 + 탈락 대장) ---------------- */

/** 탈락 사유 7분류 — 시트의 코드 정의. 번호·이름은 원문 그대로, 설명은 요약 */
export const DROPOUT_REASONS: { no: number; label: string; desc: string }[] = [
  { no: 1, label: "수강의지 없음", desc: "권면에도 수강을 이어 갈 의지가 확인되지 않는 경우." },
  { no: 2, label: "수강환경 어려움", desc: "직장·가정·건강 등 환경 요인으로 출석 자체가 어려운 경우." },
  { no: 3, label: "목적성 수강", desc: "교육이 아닌 다른 목적(친분 등)으로 수강한 것이 확인된 경우." },
  { no: 4, label: "침 맞음", desc: "외부의 부정적 개입을 받아 중단한 경우." },
  { no: 5, label: "깨달음 부족", desc: "진도를 따라오지 못해 흥미와 확신을 잃은 경우." },
  { no: 6, label: "자격미달", desc: "수강 기준에 맞지 않음이 뒤늦게 확인된 경우." },
  { no: 7, label: "기타", desc: "위 분류에 들지 않는 사유." },
];

/** 등록 시기 분류 — 시트 어휘 그대로 */
export type RegType = "등록" | "추가" | "조정";

export interface DropoutRecord {
  /** 가상 인물 — 재적 명단(cohort-mock)과 별개의 이탈 인원이다 */
  name: string;
  evangelist: string;
  regType: RegType;
  /** 본격적 결석 시기 — 시트는 진도 기준으로 적는다 (예: "초등 18과") */
  quitAt: string;
  reason: string;
  /** 단계 하락 원인 분석 — 자책 없이 사실과 개선 방향만 적는 것이 시트의 작성 지침이다 */
  analysis: string;
}

export const DROPOUTS: DropoutRecord[] = [
  {
    name: "유노을", evangelist: "정선한", regType: "등록", quitAt: "초등 12과", reason: "수강환경 어려움",
    analysis: "야간 근무 전환으로 저녁 수업 참석이 끊겼습니다. 오전 보강 전환을 시도했지만 근무 일정이 매주 바뀌어 고정되지 못했습니다. 다음에는 등록 시점에 근무 형태를 확인해 시간대를 먼저 맞추는 것이 개선 방향입니다.",
  },
  {
    name: "남하람", evangelist: "박이슬", regType: "추가", quitAt: "초등 5과", reason: "수강의지 없음",
    analysis: "권면 연락에 답이 점차 줄었고 3주 연속 결석 후 중단 의사를 밝혔습니다. 초반 티타임이 한 번에 그쳐 관계가 얕았던 것이 원인으로 보입니다.",
  },
  {
    name: "도예솔", evangelist: "한마루", regType: "등록", quitAt: "오픈 직후", reason: "침 맞음",
    analysis: "오픈 이후 주변에서 부정적 이야기를 듣고 연락이 두절됐습니다. 오픈 전 주변 관계 정리가 충분하지 않았습니다 — 오픈 대비 체크리스트를 끝까지 확인하는 것이 개선 방향입니다.",
  },
  {
    name: "채바다", evangelist: "김단비", regType: "조정", quitAt: "입문 4과", reason: "목적성 수강",
    analysis: "교육보다 모임 친분에 관심이 컸고 초반 면담에서 확인돼 정리됐습니다.",
  },
  {
    name: "원가람", evangelist: "박이슬", regType: "등록", quitAt: "초등 18과", reason: "깨달음 부족",
    analysis: "중반 이후 진도를 어려워했고 보강으로도 회복되지 않았습니다. 어려움을 말한 시점이 늦어 개입이 늦었습니다 — 주간 점검표의 「미흡」 신호가 두 주 이어지면 바로 개별 보강을 잡는 것이 개선 방향입니다.",
  },
];
