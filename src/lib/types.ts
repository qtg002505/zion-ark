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
  /** 전도사만 사용 — 담당 분반 */
  division: string | null;
  loggedInAt: string;
}

/** 자료실 카테고리 (1단계 착수지시문 v2 · 작업 1) */
export type LibraryCategory =
  | "standard_lecture"
  | "class_material"
  | "excellent_plan";

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

/** 출결 어휘 — attendance-adapter 계약 (CLAUDE.md §4) */
export type AttendanceMark =
  | "unknown"
  | "absent"
  | "makeupPending"
  | "makeupDone"
  | "present";

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
}
