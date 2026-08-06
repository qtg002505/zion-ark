/** 역할 코드 — 저장소 데이터 계약. 임의 변경 금지 (CLAUDE.md §4) */
export type RoleCode =
  | "headquarters_admin"
  | "tribe_admin"
  | "church_admin"
  | "instructor"
  | "evangelist"
  | "content_admin"
  | "security_auditor";

export type ScopeType = "national" | "tribe" | "church" | "cohort" | "division";

export const ROLE_LABELS: Record<RoleCode, string> = {
  headquarters_admin: "총회 신학부장",
  tribe_admin: "지파 신학부장",
  church_admin: "교회 관리자",
  instructor: "강사",
  evangelist: "전도사",
  content_admin: "콘텐츠 관리자",
  security_auditor: "보안 감사자",
};

/** 로그인 세션 (시범 로그인 — 상위 대시보드 SSO 확정 시 교체 지점) */
export interface Session {
  name: string;
  roleCode: RoleCode;
  scopeType: ScopeType;
  tribe: string;
  church: string;
  cohort: string;
  /**
   * 담당 분반 — 2026-08-06부터 **권한 판정에 쓰지 않는다**.
   * 전도사도 담당 기수 전체를 보므로 분반은 경계가 아니다. 표시·분류용으로만 남긴다.
   * 필드를 지우지 않는 이유는 분반 배정이 다시 필요해질 수 있어서다(불변식 10).
   */
  division: string | null;
  loggedInAt: string;
}

/** 자료실 카테고리 (1단계 착수지시문 v2 · 작업 1) — 데이터 계약, 변경 금지 */
export type LibraryCategory =
  | "standard_lecture"
  | "class_material"
  | "excellent_plan";

/**
 * 자료실 구획 (2026-08-06 확정) — 자료실은 **독립 대메뉴**이고 둘로 갈린다.
 * 가르칠 때 쓰는 교안이냐, 그 밖의 지식·전달 자료냐로 나눈다.
 * 둘 다 로그인해야 볼 수 있다 — 공개 영역이 아니므로 무세션 401 원칙은 그대로다.
 */
export type LibrarySection = "instructor" | "external";

export const LIBRARY_SECTION_LABELS: Record<LibrarySection, string> = {
  instructor: "강사 도우미 자료실",
  external: "외부 자료실",
};

/**
 * 강사 도우미 「개강 초반」 폴더 — 기수를 열 때 순서대로 쓰는 자료.
 */
export const INSTRUCTOR_EARLY_FOLDERS = ["개강 세미나", "성경 밭갈이", "예배설교"];

/**
 * 전도사 도우미 「보강 자료」 폴더 (2026-08-06 카테고리 확정).
 *
 * ⚠️ `영적전환`은 정의를 못 받은 어휘 목록에 있다 (`docs/decisions/OPEN_QUESTIONS.md` §C).
 * 나머지도 같은 취급이다 — **화면 이름으로만 쓰고 코드 값(enum·DB 코드)으로 굳히지 않는다.**
 * 정의가 오면 이 배열의 문자열만 고치면 된다.
 */
export const EVANGELIST_MAKEUP_FOLDERS = [
  "영적전환",
  "신심심기",
  "환경정리",
  "선악과",
  "이면유월 보강",
  "신앙인창조",
  "사명자 양성",
];

/**
 * 구획별 최상위 폴더 — **폴더 정의는 여기 한 곳뿐이고 내비는 여기서 읽어 만든다.**
 *
 * `instructor` 구획은 두 묶음을 함께 담는다 (강사 개강 초반 + 전도사 보강).
 * 둘 다 "가르칠 때 쓰는 자료"라 구획이 같고, 내비에서만 갈라 보여 준다.
 * ⚠️ `밭갈이`·`영인지`도 정의 미확정 어휘다 — 위와 같은 이유로 문자열로 둔다.
 */
export const LIBRARY_FOLDERS: Record<LibrarySection, string[]> = {
  instructor: [...INSTRUCTOR_EARLY_FOLDERS, ...EVANGELIST_MAKEUP_FOLDERS],
  external: ["영인지", "성경기초상식", "하나님에 대한 필요성"],
};

export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  standard_lecture: "표준 강의 자료",
  class_material: "분반·보강 자료",
  excellent_plan: "우수 교안",
};

export interface LibraryMaterial {
  id: string;
  category: LibraryCategory;
  title: string;
  body: string;
  externalUrl: string | null;
  /** 우수 지정 — headquarters_admin만 토글 (확정 결정 4) */
  isFeatured: boolean;
  /** 어느 구획인지 (2026-08-06 추가) */
  section: LibrarySection;
  /**
   * 폴더 경로 — 최상위부터 순서대로. 예: ["개강 세미나", "1차시"]
   * 배열로 둔 것은 폴더를 더 깊게 넣게 될 때 구조를 바꾸지 않기 위해서다.
   * 실연동 시 `library_materials`의 계층 컬럼(`path`)에 대응한다.
   */
  folderPath: string[];
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  updatedAt: string;
}

/** 공지·어록·영상 — 기존 workspace_entries 구조 유지 (착수지시문 v2: 신설 금지) */
export type WorkspaceKind = "notice_hq" | "notice_tribe" | "quote" | "video";

export type QuoteCategory = "말씀" | "사명" | "신앙" | "교육" | "리더십";

export interface WorkspaceEntry {
  id: string;
  kind: WorkspaceKind;
  title: string;
  body: string;
  /** notice_tribe: 대상 지파 · quote: 출처 표기 */
  meta: string | null;
  quoteCategory: QuoteCategory | null;
  pinned: boolean;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
}

/**
 * 강의 후 현장 기록 — 원 저장소 `content_library_notes` 계약에 맞춘 구조.
 * 교리 원문(교안)은 그대로 두고, 실제 강의에서 겪은 것만 옆에 붙인다.
 * 다음에 같은 강을 맡는 강사가 앞사람의 경험을 먼저 보게 하는 것이 목적이다.
 */
export type LessonNoteKind = "question" | "caution" | "tip";

export const LESSON_NOTE_LABELS: Record<LessonNoteKind, string> = {
  question: "많이 나온 질문",
  caution: "주의할 점",
  tip: "잘 통한 방법",
};

export interface LessonNote {
  id: string;
  /** 어느 강에 붙는 기록인지 — 예: "elementary-3", "high-05" */
  lessonKey: string;
  /** 목록에 보여 줄 강 이름 */
  lessonLabel: string;
  kind: LessonNoteKind;
  body: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  /** 도움이 됐다고 표시한 사람 수 */
  helpful: number;
}

/**
 * 기수 주간계획 (2026-08-06 확정) — **해당 기수의 강사·전도사가 함께 고친다.**
 * 여러 사람이 같은 글을 고치므로 **누가 언제 무엇을 바꿨는지 남긴다**. 그래야 되돌릴 수 있고,
 * 서로 덮어쓴 것을 확인할 수 있다.
 * 1차는 텍스트만 다룬다 — 파일 첨부는 2차(R2)다.
 */
export interface WeeklyPlan {
  id: string;
  /** 어느 기수의 계획인지 — 권한 판정 기준이다 */
  cohortKey: string;
  week: string;
  body: string;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
  /** 수정 이력 — 최근이 앞 */
  history: PlanRevision[];
}

export interface PlanRevision {
  body: string;
  editedBy: string;
  editedByRole: RoleCode;
  editedAt: string;
}

/**
 * 주차별 출석 사유·극복 기록 (2026-08-06 확정) — **해당 기수의 강사·전도사가 적는다.**
 * 자동 산출이 아니라 사람이 남기는 기록이므로, 누가 적었는지 함께 남긴다.
 */
export interface WeekNote {
  cohortKey: string;
  week: string;
  reason: string;
  overcome: string;
  editedBy: string;
  editedByRole: RoleCode;
  editedAt: string;
}

/**
 * 상담 사례 (2026-08-06 확정) — 강사 도우미의 공유 자산.
 *
 * ⚠️ 자료실은 전국 공통이라 조직 스코프가 없다. 그래서 **개인을 특정할 수 있는 것은 담지 않는다.**
 * 확정된 익명화 기준: **지파·교회·센터(기수)까지만 밝히고 그 아래는 적지 않는다.**
 * 이름·연락처·분반·나이처럼 개인을 짚을 수 있는 것은 입력 자체를 막는다.
 */
export interface CounselCase {
  id: string;
  /** 어떤 상황이었는지 (개인 식별 정보 없이) */
  situation: string;
  /** 어떻게 했는지 */
  approach: string;
  /** 어떻게 됐는지 */
  result: string;
  outcome: "success" | "failure";
  /** 익명화 기준에 맞는 소속 표기 — 지파·교회·센터까지만 */
  tribe: string;
  church: string;
  cohort: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  helpful: number;
}

/** 출결 어휘 — attendance-adapter 계약 (CLAUDE.md §4) */
export type AttendanceMark =
  | "unknown"
  | "absent"
  | "makeupPending"
  | "makeupDone"
  | "present";

/** 한 주의 출결 — 출결 어휘 계약(AttendanceMark)을 그대로 쓴다 */
export interface WeeklyAttendance {
  /** 최근이 0, 그 전 주가 1 … */
  weeksAgo: number;
  mark: AttendanceMark;
  /** 대면 시간대 — 시간대가 바뀌는 것도 관찰 신호가 된다 */
  slot: "evening" | "morning" | "afternoon" | null;
}

export interface Student {
  /** 교회+기수+분반+이름 임시 키 (고유 ID 없는 원본 대비 — CLAUDE.md §14) */
  key: string;
  name: string;
  division: string;
  /** 출석률 % (진도 컬럼 집계) */
  attendanceRate: number;
  presentCount: number;
  totalSessions: number;
  status: "active" | "atRisk" | "paused";
  /** 저녁/오전/오후 대면 횟수 */
  slotCounts: { evening: number; morning: number; afternoon: number };
  lastAttended: string | null;
  /** 최근 8주 출결 — 이탈 신호를 읽는 근거가 된다 (실연동 시 시트에서 그대로 온다) */
  recentWeeks: WeeklyAttendance[];
}
