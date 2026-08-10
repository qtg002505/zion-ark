import { STUDENTS } from "./cohort-mock";
import type { RoleCode } from "../lib/types";
import type { Grade } from "../lib/student-grade";

/**
 * 수강생 프로필 — 「수강생관리 도우미」 상세 화면(2026-08-09)에서 쓰는 인적사항·성향·메모.
 *
 * ⚠️ `src/lib/types.ts`의 `Student`(출결 계약, attendance-adapter 대상)와는 **일부러 분리**했다.
 * 여기 담긴 성별·나이·생년월일·전화·주소·신앙유형·MBTI·에니어그램·도형·사주·상담메모는
 * 출결 시트에서 오는 값이 아니라 이 프로토타입에서 시연용으로 지어낸 것이다.
 *
 * ⚠️ **생년월일·전화·주소는 2026-08-09 리드 지시로 넣었다** — 실연동 시 「마팔」(수강생
 * 기본 인적사항을 담은 바깥 시스템)에서 오는 자리다. 지금은 그 연동이 없으므로
 * **전부 가상 인물의 지어낸 값**이다(불변식 6) — 실제 마팔 데이터를 넣은 것이 아니다.
 * 실연동 착수 시 담당 범위 스코프·감사 로그 설계를 먼저 하라는 이전 경고(C-7,
 * `docs/HANDOFF.md`)는 **실제 개인정보를 이 저장소에 들여올 때** 적용되는 것이지,
 * 이런 시범 값 자체를 막는 것은 아니다.
 *
 * ⚠️ 등급(A~D)은 `src/lib/student-grade.ts`가 출결 참여도로 매긴다 — 여기 없다.
 * 신앙유형은 `src/content/glossary.ts`에 정의된 과정 어휘(비오픈·오픈·신앙전환)를 그대로 쓴다.
 */

export type Gender = "남" | "여";
export type FaithType = "비오픈" | "오픈" | "신앙전환";
/** 등록 구분 — 시범 값. 원 저장소 연동 전까지 등록 이력을 대신하는 표시용 분류다 */
export type RegistrationType = "신규" | "재수강" | "재입교";
/** 신앙 여부 — 시범 값. `faithType`(비오픈·오픈·신앙전환, 과정 어휘)과는 별개 축이다 */
export type FaithStatus = "신앙" | "무신앙" | "기타";
/** 화면 표시용 — "신앙"/"무신앙"에 "인"을 붙여 사람을 가리키는 말로 다듬는다 */
export const FAITH_STATUS_LABELS: Record<FaithStatus, string> = {
  신앙: "신앙인",
  무신앙: "무신앙인",
  기타: "기타",
};
export type Fellowship = "청년회" | "장년회" | "부녀회" | "자문회";
export type ShapeType = "동그라미" | "세모" | "네모" | "에스";
export type SajuElement = "목" | "화" | "토" | "금" | "수";
export type FeedbackKind = "attendance" | "makeup" | "counsel" | "note" | "memo";

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  attendance: "출석",
  makeup: "보강",
  counsel: "상담",
  note: "특이사항",
  memo: "메모",
};

/** 특이사항을 고칠 때마다 밀려나는 직전 값 한 건 — `WeeklyPlan`의 `PlanRevision`과 같은 패턴 */
export interface NoteRevision {
  text: string;
  editedBy: string;
  editedByRole: RoleCode;
  editedAt: string;
}

/**
 * 상단 상태 표시줄(소속·상태·유월·신앙 상태) 수동 변경 기록.
 *
 * 기본값은 기본정보로 자동 지정된다 — 소속은 나이·성별로(`fellowshipOf`), 등급은 출결
 * 참여도로(`student-grade.ts`), 유월·신앙 상태는 프로필 기본값이다. 여기 값이 있으면
 * **그 필드만** 자동값을 덮어쓴다(없는 필드는 계속 자동값을 따른다).
 *
 * ⚠️ AI가 판정해 덮어쓰는 것이 아니라 **사람(사명자)이 직접 바꾸는 기록**이다 — 불변식 4가
 * 막는 것은 AI의 확정 판정이지, 담당자의 운영 판단이 아니다. 등급을 수동으로 바꿔도
 * 신앙·인격을 판정하는 것은 아니고, 참여도 분류를 담당자가 다시 매기는 것뿐이다.
 * `src/lib/store.tsx`가 localStorage에 저장한다 (`canEditCohortRecord`와 같은 권한 기준).
 */
export interface StudentStatusOverride {
  studentKey: string;
  fellowship?: Fellowship;
  /** 사람이 직접 지정한 등급 — 없으면 출결로 자동 판정한다 (`student-grade.ts`) */
  grade?: Grade;
  /** 유월 — 이 축은 오픈/비오픈 둘뿐이다. 신앙전환은 유월 기준으로는 이미 "오픈"이다 */
  faithType?: "오픈" | "비오픈";
  faithStatus?: FaithStatus;
  /** 특이사항 — 표·상세 카드에 짧게 뜨는 한 줄. 있으면 씨앗 값(`StudentProfile.note`) 대신 쓴다 */
  note?: string;
  /** note를 덮어쓸 때마다 직전 값을 여기 쌓는다(최근 20건, 최신이 앞) — 최초값(씨앗)은 안 들어간다 */
  noteHistory?: NoteRevision[];
  /** 연락 가능 시간대 — 있으면 씨앗 값(`StudentProfile.availableTime`) 대신 쓴다 */
  availableTime?: string;
  /** 관심사 · 메모 — 있으면 씨앗 값(`StudentProfile.interests`) 대신 쓴다 */
  interests?: string;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
}

export interface FeedbackEntry {
  kind: FeedbackKind;
  date: string;
  /** 과목·주제 — 보강·상담 기록에 쓴다(예: "창세기 1장"). 출석 기록엔 없다 */
  subject?: string;
  text: string;
  by: string;
  byRole: RoleCode;
  /** 이 기록에서 다룬 초등 단계 항목 번호(1~8) — 보강·상담 기록에서 고를 수 있다 */
  checklistItems?: number[];
}

/**
 * 담당자가 직접 기록한 보강·상담(그리고 필요하면 출석) 메모 — `store.tsx`가 저장한다.
 * 씨앗 데이터(`RAW`의 `feedback`)는 여기 안 들어 있다 — 화면에서 둘을 합쳐서 보여준다.
 */
export interface StudentFeedbackRecord extends FeedbackEntry {
  id: string;
  studentKey: string;
}

/**
 * 씨앗 기록(`RAW.feedback`, 고정 텍스트) 수정 — 씨앗 배열 자체를 못 바꾸니 id별로 덮어쓸
 * 내용만 따로 저장한다. 씨앗 항목의 id는 화면에서 `seed-{studentKey}-{index}`로 만든다.
 * `store.tsx`가 저장한다. store에서 만든 기록(`StudentFeedbackRecord`)은 배열 자체를
 * 바로 고치므로 이 타입을 쓰지 않는다.
 */
export interface FeedbackEdit {
  id: string;
  date?: string;
  subject?: string;
  text?: string;
  checklistItems?: number[];
}

/** 초·중·고 단계 체크리스트 — `glossary.ts` COURSE_LEVEL_TERMS와 같은 어휘를 쓴다 */
export type CourseLevel = "초등" | "중등" | "고등";

/**
 * 수강생별 단계 세부 질문 체크 — 그룹(`no`) 안의 질문 하나(`qIndex`, 0부터)를 뗐는지 여부.
 * 씨앗 데이터가 아니라 전부 담당자가 직접 체크한 기록이라 `store.tsx`가 곧바로 배열로
 * 저장한다(수정 오버레이 필요 없음). `week`는 중등처럼 주차 칸이 있는 레벨에서만 쓴다
 * (`content/checklist-standards.ts`의 `weekly`) — 어느 주차에 확인했는지를 남긴다.
 */
export interface ChecklistProgress {
  studentKey: string;
  level: CourseLevel;
  groupNo: number;
  qIndex: number;
  checked: boolean;
  week?: number;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
}

export interface StudentProfile {
  studentKey: string;
  gender: Gender;
  age: number;
  /** 마팔(외부 시스템) 연동 시 대응될 필드 — 지금은 연동 전이라 시범 값이다(C-7) */
  birthDate: string;
  phone: string;
  address: string;
  faithType: FaithType;
  registrationType: RegistrationType;
  faithStatus: FaithStatus;
  /**
   * 인교섬(인도자·교사·섬김이) — `glossary.ts` PEOPLE_TERMS 참고. 계정 권한은 없는 관계자다.
   * "지역/부서/이름" 형식 문자열이다(2026-08-09 리드 지시) — 생년월일·전화·주소와 같은 자리,
   * 즉 실연동 시 마팔에서 온다고 가정한 시범 값이다. 지역은 양재·신림·사당·군포·인덕원·금천,
   * 부서는 자문·장년·부녀·청년 중 하나다.
   */
  guideName: string;
  teacherName: string;
  helperName: string;
  mbti: string;
  enneagramType: number;
  shapeType: ShapeType;
  sajuElement: SajuElement;
  /** 특이사항 — 표에 짧게 뜨는 한 줄 */
  note: string;
  /** 최근이 앞 */
  feedback: FeedbackEntry[];
  /**
   * 청년회·장년회 전용 정보 — 참고 화면의 「청년 전용 정보」를 두 회로 넓혔다(2026-08-09 리드).
   * 부녀회·자문회에는 이 카드 자체를 띄우지 않는다(`fellowshipOf` 기준, 상단 표시줄에서
   * 담당자가 소속을 바꾸면 이 카드의 노출 여부도 같이 바뀐다).
   */
  hasPartner: boolean;
  materialPeriodMonths: number;
  availableTime: string;
  interests: string;
}

/** 나이·성별로 나뉘는 회(會) — `glossary.ts`의 FELLOWSHIP_TERMS 정의를 그대로 적용 */
export function fellowshipOf(age: number, gender: Gender): Fellowship {
  if (age > 69) return "자문회";
  if (age >= 40) return gender === "남" ? "장년회" : "부녀회";
  return "청년회";
}

/**
 * 분반 ↔ 전도사 표시 매핑 (시범용).
 * ⚠️ 권한 경계가 아니다 — 전도사는 담당 기수 전체를 본다(조직·권한 §확정,
 * `src/lib/permissions.ts`의 `visibleDivisions`). 이 매핑은 목록 화면의 "전도사 선택"
 * 필터가 분반을 사람 이름으로 부르기 위한 표시용일 뿐, 실제로는 담당 전도사 여럿이
 * 같은 기수의 모든 분반을 함께 본다.
 */
export const DIVISION_EVANGELISTS: Record<string, string> = {
  "1분반": "김하나 전도사",
  "2분반": "이사랑 전도사",
  "3분반": "박은혜 전도사",
  "4분반": "최미르 전도사",
};

const RAW: Record<string, Omit<StudentProfile, "studentKey">> = {
  김하늘: {
    gender: "여",
    age: 24,
    birthDate: "2002-03-14",
    phone: "010-2456-7781",
    address: "경기 과천시 별양동",
    faithType: "신앙전환",
    registrationType: "신규",
    faithStatus: "신앙",
    guideName: "양재/청년/오은혜",
    teacherName: "양재/장년/임정직",
    helperName: "양재/청년/차나눔",
    mbti: "ENFJ",
    enneagramType: 2,
    shapeType: "동그라미",
    sajuElement: "화",
    note: "8주 연속 저녁 대면 개근 — 소그룹에서도 앞장서 참여함",
    hasPartner: true,
    materialPeriodMonths: 6,
    availableTime: "평일 19:00~22:00, 주말 오전 가능",
    interests: "음악, 독서, 영상 편집",
    feedback: [
      { kind: "attendance", date: "2026-08-03", text: "이번 주도 저녁 대면 참석. 결석 이력 없음.", by: "김하나 전도사", byRole: "evangelist" },
      { kind: "counsel", date: "2026-07-18", text: "신앙전환 이후 삶에서 달라진 점을 스스로 나눔.", by: "김하나 전도사", byRole: "evangelist" },
    ],
  },
  이보람: {
    gender: "여",
    age: 45,
    birthDate: "1981-07-22",
    phone: "010-3391-4420",
    address: "서울 서초구 반포동",
    faithType: "오픈",
    registrationType: "재수강",
    faithStatus: "신앙",
    guideName: "신림/청년/문사랑",
    teacherName: "신림/장년/곽믿음",
    helperName: "신림/청년/윤도움",
    mbti: "ISFJ",
    enneagramType: 6,
    shapeType: "세모",
    sajuElement: "수",
    note: "누적 출석 99%인데 최근 2주 연속 결석 — 지금 연락이 필요함",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "평일 저녁, 주말 낮",
    interests: "요리, 등산",
    feedback: [
      { kind: "attendance", date: "2026-08-03", text: "2주 연속 결석. 이전엔 결석 이력이 없던 분이라 확인 필요.", by: "김하나 전도사", byRole: "evangelist" },
      { kind: "counsel", date: "2026-07-21", text: "전화 연결 시도 — 아직 회신 없음.", by: "김하나 전도사", byRole: "evangelist" },
    ],
  },
  박은솔: {
    gender: "여",
    age: 51,
    birthDate: "1975-11-05",
    phone: "010-5127-8834",
    address: "경기 안양시 동안구",
    faithType: "오픈",
    registrationType: "신규",
    faithStatus: "신앙",
    guideName: "사당/청년/조진리",
    teacherName: "사당/장년/표은혜",
    helperName: "사당/부녀/길섬김",
    mbti: "ESFJ",
    enneagramType: 9,
    shapeType: "에스",
    sajuElement: "토",
    note: "저녁에서 오전으로 대면 시간대 변경 — 출석은 꾸준함",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "평일 오전, 주말 오후",
    interests: "원예, 봉사활동",
    feedback: [
      { kind: "attendance", date: "2026-08-03", text: "최근 2회 오전 대면으로 참석. 저녁에서 시간대가 바뀜.", by: "이사랑 전도사", byRole: "evangelist" },
    ],
  },
  정다운: {
    gender: "남",
    age: 29,
    birthDate: "1997-01-30",
    phone: "010-6620-1193",
    address: "서울 관악구 신림동",
    faithType: "신앙전환",
    registrationType: "재수강",
    faithStatus: "신앙",
    guideName: "금천/청년/배소망",
    teacherName: "금천/장년/국사랑",
    helperName: "금천/자문/마봉사",
    mbti: "INTJ",
    enneagramType: 5,
    shapeType: "네모",
    sajuElement: "목",
    note: "질문이 깊고 적극적 — 왜곡씻기 이후 이해도가 눈에 띄게 늘어남",
    hasPartner: false,
    materialPeriodMonths: 6,
    availableTime: "평일 20:00 이후",
    interests: "운동, 독서",
    feedback: [
      { kind: "attendance", date: "2026-08-01", text: "꾸준한 참석. 오후 대면 1회 포함.", by: "이사랑 전도사", byRole: "evangelist" },
      { kind: "counsel", date: "2026-07-15", text: "성경 이치에 대한 질문을 정리해 옴 — 상담 시간을 늘림.", by: "이사랑 전도사", byRole: "evangelist" },
    ],
  },
  최슬기: {
    gender: "여",
    age: 22,
    birthDate: "2004-09-18",
    phone: "010-7734-2298",
    address: "경기 과천시 원문동",
    faithType: "오픈",
    registrationType: "신규",
    faithStatus: "신앙",
    guideName: "인덕원/청년/신은총",
    teacherName: "인덕원/장년/한말씀",
    helperName: "인덕원/부녀/우헌신",
    mbti: "INFP",
    enneagramType: 4,
    shapeType: "에스",
    sajuElement: "수",
    note: "보강 1건이 아직 이행되지 않음 — 다음 주 안내 필요",
    hasPartner: false,
    materialPeriodMonths: 3,
    availableTime: "평일 저녁, 주말 자유",
    interests: "그림, 음악",
    feedback: [
      { kind: "makeup", date: "2026-07-28", text: "지난주 결석분 보강 일정을 잡았으나 아직 이행되지 않음.", by: "박은혜 전도사", byRole: "evangelist" },
    ],
  },
  한결: {
    gender: "남",
    age: 33,
    birthDate: "1993-05-09",
    phone: "010-2298-6671",
    address: "서울 동작구 사당동",
    faithType: "신앙전환",
    registrationType: "재입교",
    faithStatus: "신앙",
    guideName: "양재/청년/오은혜",
    teacherName: "양재/장년/임정직",
    helperName: "양재/청년/차나눔",
    mbti: "ISTJ",
    enneagramType: 1,
    shapeType: "세모",
    sajuElement: "금",
    note: "꾸준하고 성실함 — 특이사항 없음",
    hasPartner: true,
    materialPeriodMonths: 6,
    availableTime: "평일 저녁",
    interests: "축구, 게임",
    feedback: [
      { kind: "attendance", date: "2026-08-01", text: "오전 대면 1회 포함해 정상 참석.", by: "박은혜 전도사", byRole: "evangelist" },
    ],
  },
  서지온: {
    gender: "남",
    age: 41,
    birthDate: "1985-12-03",
    phone: "010-8845-3312",
    address: "경기 안양시 만안구",
    faithType: "오픈",
    registrationType: "신규",
    faithStatus: "신앙",
    guideName: "신림/청년/문사랑",
    teacherName: "신림/장년/곽믿음",
    helperName: "신림/청년/윤도움",
    mbti: "ESTJ",
    enneagramType: 8,
    shapeType: "세모",
    sajuElement: "화",
    note: "리더십이 있어 소그룹을 이끔",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "평일 저녁, 주말 오전",
    interests: "낚시, 독서",
    feedback: [
      { kind: "attendance", date: "2026-08-03", text: "저녁 대면 개근 유지 중.", by: "최미르 전도사", byRole: "evangelist" },
    ],
  },
  문소망: {
    gender: "여",
    age: 26,
    birthDate: "2000-02-27",
    phone: "010-4471-9920",
    address: "서울 서초구 방배동",
    faithType: "오픈",
    registrationType: "재수강",
    faithStatus: "신앙",
    guideName: "사당/청년/조진리",
    teacherName: "사당/장년/표은혜",
    helperName: "사당/부녀/길섬김",
    mbti: "ENFP",
    enneagramType: 7,
    shapeType: "동그라미",
    sajuElement: "목",
    note: "최근 1주 출결 미입력 — 확인 필요(약한 신호)",
    hasPartner: false,
    materialPeriodMonths: 6,
    availableTime: "평일 저녁, 주말 오후",
    interests: "여행, 사진",
    feedback: [
      { kind: "attendance", date: "2026-08-01", text: "최근 1주 출결이 미입력 상태 — 출결부 재확인 요청.", by: "최미르 전도사", byRole: "evangelist" },
    ],
  },
  강믿음: {
    gender: "남",
    age: 36,
    birthDate: "1990-08-11",
    phone: "010-9123-4457",
    address: "경기 의왕시 내손동",
    faithType: "비오픈",
    registrationType: "재수강",
    faithStatus: "무신앙",
    guideName: "금천/청년/배소망",
    teacherName: "금천/장년/국사랑",
    helperName: "금천/자문/마봉사",
    mbti: "ISTP",
    enneagramType: 9,
    shapeType: "에스",
    sajuElement: "수",
    note: "결석이 잦고 보강도 밀림 — 집중 관리 대상",
    hasPartner: true,
    materialPeriodMonths: 6,
    availableTime: "평일 야간 불가, 주말만",
    interests: "운동",
    feedback: [
      { kind: "makeup", date: "2026-07-21", text: "보강을 잡았으나 이행되지 않음. 재편성 필요.", by: "김하나 전도사", byRole: "evangelist" },
      { kind: "counsel", date: "2026-07-14", text: "생업 사정으로 저녁 시간 참석이 어렵다고 전함.", by: "김하나 전도사", byRole: "evangelist" },
    ],
  },
  윤새벽: {
    gender: "여",
    age: 48,
    birthDate: "1978-04-16",
    phone: "010-3345-7789",
    address: "서울 관악구 봉천동",
    faithType: "비오픈",
    registrationType: "신규",
    faithStatus: "무신앙",
    guideName: "인덕원/청년/신은총",
    teacherName: "인덕원/장년/한말씀",
    helperName: "인덕원/부녀/우헌신",
    mbti: "ISFP",
    enneagramType: 9,
    shapeType: "에스",
    sajuElement: "토",
    note: "생업 사정으로 참석이 불규칙함",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "야간 근무라 불규칙",
    interests: "산책",
    feedback: [
      { kind: "counsel", date: "2026-07-13", text: "야간 근무 일정과 겹쳐 참석이 어렵다고 전함.", by: "김하나 전도사", byRole: "evangelist" },
    ],
  },
  임푸름: {
    gender: "여",
    age: 31,
    birthDate: "1995-06-24",
    phone: "010-6689-2210",
    address: "경기 과천시 부림동",
    faithType: "비오픈",
    registrationType: "재수강",
    faithStatus: "기타",
    guideName: "양재/청년/오은혜",
    teacherName: "양재/장년/임정직",
    helperName: "양재/청년/차나눔",
    mbti: "INFJ",
    enneagramType: 4,
    shapeType: "세모",
    sajuElement: "금",
    note: "연락이 잘 닿지 않음",
    hasPartner: false,
    materialPeriodMonths: 6,
    availableTime: "연락 어려움",
    interests: "미상",
    feedback: [
      { kind: "counsel", date: "2026-07-06", text: "전화·문자 모두 응답 없음. 심방을 검토 중.", by: "이사랑 전도사", byRole: "evangelist" },
    ],
  },
  오아름: {
    gender: "여",
    age: 27,
    birthDate: "1999-10-08",
    phone: "010-2214-8867",
    address: "서울 동작구 상도동",
    faithType: "비오픈",
    registrationType: "신규",
    faithStatus: "무신앙",
    guideName: "신림/청년/문사랑",
    teacherName: "신림/장년/곽믿음",
    helperName: "신림/청년/윤도움",
    mbti: "ISFJ",
    enneagramType: 6,
    shapeType: "에스",
    sajuElement: "수",
    note: "8주 연속 결석 — 즉시 연락 필요",
    hasPartner: false,
    materialPeriodMonths: 3,
    availableTime: "연락 어려움",
    interests: "미상",
    feedback: [
      { kind: "counsel", date: "2026-06-29", text: "8주째 미참석. 가족을 통해 안부를 확인함.", by: "이사랑 전도사", byRole: "evangelist" },
    ],
  },
  신여울: {
    gender: "남",
    age: 44,
    birthDate: "1982-01-19",
    phone: "010-7789-3345",
    address: "경기 안양시 동안구",
    faithType: "비오픈",
    registrationType: "재입교",
    faithStatus: "기타",
    guideName: "사당/청년/조진리",
    teacherName: "사당/장년/표은혜",
    helperName: "사당/부녀/길섬김",
    mbti: "ISTP",
    enneagramType: 5,
    shapeType: "네모",
    sajuElement: "목",
    note: "중단 상태 — 재등록 의사 확인 필요",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "연락 어려움",
    interests: "미상",
    feedback: [
      { kind: "counsel", date: "2026-06-15", text: "개인 사정으로 중단 의사를 전함. 재등록 여지는 남겨 둠.", by: "박은혜 전도사", byRole: "evangelist" },
    ],
  },
  황이든: {
    gender: "남",
    age: 52,
    birthDate: "1974-07-02",
    phone: "010-4456-9981",
    address: "서울 서초구 잠원동",
    faithType: "비오픈",
    registrationType: "재입교",
    faithStatus: "무신앙",
    guideName: "금천/청년/배소망",
    teacherName: "금천/장년/국사랑",
    helperName: "금천/자문/마봉사",
    mbti: "ESTP",
    enneagramType: 8,
    shapeType: "세모",
    sajuElement: "화",
    note: "중단 — 개인 사정으로 연락이 어려움",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "연락 어려움",
    interests: "미상",
    feedback: [
      { kind: "counsel", date: "2026-06-08", text: "연락처가 바뀐 것으로 추정. 재확인 필요.", by: "박은혜 전도사", byRole: "evangelist" },
    ],
  },
  송가온: {
    gender: "여",
    age: 39,
    birthDate: "1987-03-27",
    phone: "010-8890-1123",
    address: "경기 과천시 중앙동",
    faithType: "비오픈",
    registrationType: "재수강",
    faithStatus: "기타",
    guideName: "인덕원/청년/신은총",
    teacherName: "인덕원/장년/한말씀",
    helperName: "인덕원/부녀/우헌신",
    mbti: "INTP",
    enneagramType: 5,
    shapeType: "네모",
    sajuElement: "수",
    note: "중단 — 다음 기수 재수강을 권유할 예정",
    hasPartner: false,
    materialPeriodMonths: 6,
    availableTime: "연락 어려움(이사)",
    interests: "미상",
    feedback: [
      { kind: "counsel", date: "2026-05-25", text: "이사로 참석이 어려워짐. 인근 지역 기수 안내 예정.", by: "최미르 전도사", byRole: "evangelist" },
    ],
  },
  배라온: {
    gender: "여",
    age: 58,
    birthDate: "1968-09-30",
    phone: "010-2267-4498",
    address: "서울 관악구 신림동",
    faithType: "비오픈",
    registrationType: "재입교",
    faithStatus: "무신앙",
    guideName: "양재/청년/오은혜",
    teacherName: "양재/장년/임정직",
    helperName: "양재/청년/차나눔",
    mbti: "ISFJ",
    enneagramType: 9,
    shapeType: "에스",
    sajuElement: "토",
    note: "건강상의 이유로 중단",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "-",
    interests: "-",
    feedback: [
      { kind: "counsel", date: "2026-05-11", text: "건강 문제로 당분간 참석이 어렵다고 전함.", by: "최미르 전도사", byRole: "evangelist" },
    ],
  },
  조미르: {
    gender: "남",
    age: 61,
    birthDate: "1965-11-21",
    phone: "010-5534-8871",
    address: "경기 안양시 만안구",
    faithType: "비오픈",
    registrationType: "재입교",
    faithStatus: "기타",
    guideName: "신림/청년/문사랑",
    teacherName: "신림/장년/곽믿음",
    helperName: "신림/청년/윤도움",
    mbti: "ISTJ",
    enneagramType: 6,
    shapeType: "세모",
    sajuElement: "금",
    note: "장기 미출석 — 종결 처리 검토",
    hasPartner: true,
    materialPeriodMonths: 8,
    availableTime: "연락 어려움",
    interests: "미상",
    feedback: [
      { kind: "counsel", date: "2026-04-27", text: "3개월 이상 미참석. 종결 여부를 다음 회의에서 논의 예정.", by: "최미르 전도사", byRole: "evangelist" },
    ],
  },
};

const FALLBACK: Omit<StudentProfile, "studentKey"> = {
  gender: "여",
  age: 30,
  birthDate: "1996-05-15",
  phone: "010-1000-0000",
  address: "경기 과천시 별양동",
  faithType: "오픈",
  registrationType: "신규",
  faithStatus: "신앙",
  guideName: "사당/청년/조진리",
  teacherName: "사당/장년/표은혜",
  helperName: "사당/부녀/길섬김",
  mbti: "ISFJ",
  enneagramType: 9,
  shapeType: "동그라미",
  sajuElement: "토",
  note: "프로필 준비 중",
  hasPartner: false,
  materialPeriodMonths: 6,
  availableTime: "-",
  interests: "-",
  feedback: [],
};

export const STUDENT_PROFILES: Record<string, StudentProfile> = Object.fromEntries(
  STUDENTS.map((st) => [st.key, { studentKey: st.key, ...(RAW[st.name] ?? FALLBACK) }]),
);
