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
 * 강사 도우미 「밭갈이」 묶음 (2026-08-07 팀 5차 회의 — 종전 「개강 초반」에서 갈라냄).
 *
 * `밭갈이`의 정의는 2026-08-08에 받았다 (`src/content/glossary.ts`). 그래도 **화면 이름
 * 문자열로만 쓰고 코드 값(enum·DB 코드·역할/스코프 코드)으로 굳히지 않는다** — 굳혀서 얻는
 * 것이 없고 표현이 다듬어지면 후방 마이그레이션이 되기 때문이다(불변식 10).
 * 이름을 바꿔야 하면 이 배열의 문자열을 고치되, **저장된 자료의 `folderPath`도 함께 본다**
 * (2026-08-07에 실제로 어긋나 자료가 폴더에서 빠진 적이 있다).
 */
export const INSTRUCTOR_BATGARI_FOLDERS = [
  "개강 세미나",
  "초등 초반 밭갈이",
  "주제별 밭갈이",
  "영적 전환을 돕는 육적 예시",
];

/** 밭갈이 묶음에 들지 않는 강사 도우미 폴더 — 회의 합의 구조 밖이라 따로 둔다 */
export const INSTRUCTOR_OTHER_FOLDERS = ["예배설교"];

/**
 * 강사 도우미 「개강 초반」 폴더 — 기수를 열 때 순서대로 쓰는 자료.
 * 자료실 화면은 이 목록 하나로 폴더를 그린다. 내비만 위 두 묶음으로 갈라 보여 준다.
 */
export const INSTRUCTOR_EARLY_FOLDERS = [
  ...INSTRUCTOR_BATGARI_FOLDERS,
  ...INSTRUCTOR_OTHER_FOLDERS,
];

/**
 * 전도사 도우미 「보강 자료」 폴더 (2026-08-06 카테고리 확정).
 *
 * ⚠️ `영적전환`이 상담 테마의 `신앙전환`과 같은 것인지 아직 확인받지 못했다
 * (`docs/decisions/OPEN_QUESTIONS.md` §C-1). 같다고 단정해 이름을 합치지 않는다.
 * 나머지도 같은 취급이다 — **화면 이름으로만 쓰고 코드 값(enum·DB 코드)으로 굳히지 않는다.**
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
 * 폴더 이름의 뜻은 `src/content/glossary.ts`에 있다 — 정의는 받았지만 문자열로 둔다.
 */
/** 분반·보강 도우미로 이관된 실무 교육 콘텐츠 3종 — 자료실이 아니라 보강 파트에서 연다 */
export const EVANGELIST_CONTENT_FOLDERS = ["영인지", "성경기초상식", "하나님에 대한 필요성"];

/**
 * 자료실 아카이브 폴더 (2026-08-10 리드 지시) — 자료실은 **대용량 장기 보관 아카이브**
 * 위주로 축소한다. 실무 교육 자료는 강의·분반보강 도우미가 가져갔다.
 *
 * ⚠️ 파일 원본(도서 스캔·영상)은 R2가 붙어야 올라간다 — 지금은 폴더 자리와 외부 링크만.
 * ⚠️ `계시록 사파`는 **정의를 못 받은 어휘**다 — 화면 문자열로만 두고 코드 값으로 굳히지
 * 않는다 (`docs/decisions/OPEN_QUESTIONS.md` §C).
 */
export const ARCHIVE_FOLDERS = ["지파별 취합 도서", "실상 뮤지컬 영상", "계시록 사파"];

export const LIBRARY_FOLDERS: Record<LibrarySection, string[]> = {
  instructor: [...INSTRUCTOR_EARLY_FOLDERS, ...EVANGELIST_MAKEUP_FOLDERS],
  external: [...EVANGELIST_CONTENT_FOLDERS, ...ARCHIVE_FOLDERS],
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
  /**
   * 수업용 PPT 링크 (2026-08-10 리드 지시 — 교안·영상 원스톱 매칭).
   * ⚠️ 파일 원본 업로드는 R2 몫이다 — 지금은 외부 저장소 URL만 담는다. 전방 추가 컬럼.
   */
  pptUrl?: string | null;
  /** 강의 현장 영상 링크 (비메오·위플 등). 비메오만 사이트 안 재생, 나머지는 새 탭 */
  videoUrl?: string | null;
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
 * 달력형 주간계획 항목 (2026-08-10 리드 지시) — 기수 일정이 유동적이라 주차 칸에 글을
 * 몰아 적는 방식으로는 담기지 않았다. **날짜에 항목을 자유롭게 붙이는** 구조로 바꾼다.
 *
 * ⚠️ 종전 `WeeklyPlan`(주차별 글)을 **지우지 않는다.** 이미 적어 둔 계획이 사라지면
 * 후방 마이그레이션이 된다(불변식 10). 달력이 주 화면이 되고, 종전 주차별 글은
 * 화면 아래에 그대로 남겨 함께 본다.
 *
 * 권한은 종전과 같다 — **해당 기수의 강사·전도사만** 고친다(`canEditCohortRecord`).
 */
export type PlanEntryKind = "progress" | "makeup" | "event" | "note";

export const PLAN_ENTRY_LABELS: Record<PlanEntryKind, string> = {
  progress: "진도",
  makeup: "보강",
  event: "행사",
  note: "메모",
};

export interface PlanEntry {
  id: string;
  /** 어느 기수의 계획인지 — 권한 판정 기준 */
  cohortKey: string;
  /** YYYY-MM-DD */
  date: string;
  kind: PlanEntryKind;
  title: string;
  /**
   * 진도 항목이면 회차 번호. 진도표 파일을 올리면 이 값이 채워진다 —
   * 주간계획과 진도표를 **한 파일로 함께 반영**하기 위한 자리다.
   */
  session: number | null;
  /** 파일 업로드로 들어온 항목인지 — 사람이 적은 것과 구분해 다시 올릴 때 갈아끼운다 */
  fromUpload: boolean;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
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
  /** 마지막 수정 시각 — 본인 글 수정이 열리면서 추가 (2026-08-10) */
  updatedAt?: string;
  /**
   * 도움됨을 누른 사람 목록 — **정본** (2026-08-10, 상담법과 같은 계약).
   * 종전 `helpful: number`는 무한 클릭이 가능했다. 카운트는 항상 이 배열 길이다.
   */
  helpfulBy: string[];
}

/**
 * 상담 도우미 UGC (2026-08-08 지시문 §2-5 · 3단계) — 원 저장소 `counseling_tips` 계약의 미러.
 *
 * 테마는 **번호(1~12)로만 가리킨다.** 테마 이름(왜곡씻기·이면유월·신앙전환 등)은 정의 미확정
 * 용어가 많아 코드 값으로 굳히지 않는다 — 이름이 바뀌어도 저장된 글은 번호로 그대로 이어진다.
 * 전국 공통 교육 영역이므로 조직 스코프 컬럼이 없다.
 */
export interface CounselingTip {
  id: string;
  /** 테마 번호 1~12 — 화면의 테마 목록 순서와 같다 */
  themeNo: number;
  title: string;
  body: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  updatedAt: string;
  /**
   * 도움됨을 누른 사람 목록 — **이것이 정본이다.** 카운트는 항상 이 배열 길이로 계산한다.
   * 원 저장소의 `counseling_tip_helpful` UNIQUE(tip_id, user_id) 행에 대응한다
   * (helpful_count 캐시 컬럼은 표시 성능용일 뿐 — 지시문 §5).
   * 시범 로그인은 이름이 곧 계정이므로 이름을 담는다. 실연동 시 user_id로 바뀐다.
   */
  helpfulBy: string[];
  /** 관리자 숨김 — 삭제가 아니라 시각을 기입하는 소프트 삭제다 (지시문 §2-5 검수 정책) */
  hiddenAt: string | null;
  hiddenBy: string | null;
}

/** 상담법 신고 — content_admin 검토 큐로 들어간다. 원 저장소 `counseling_tip_reports` 미러 */
export interface TipReport {
  id: string;
  tipId: string;
  reporterName: string;
  reporterRole: RoleCode;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

/**
 * 강별 수업 자료 링크 (2026-08-10 리드 지시 — 교안·영상 원스톱 매칭).
 * 교안 원문은 정적 콘텐츠라 그대로 두고, **링크만 옆에 붙인다** — 강 하나에 한 벌.
 * `lessonKey`는 현장 기록(`LessonNote.lessonKey`)과 같은 축이다 (예: "elementary-3").
 */
export interface LessonResource {
  lessonKey: string;
  pptUrl: string | null;
  videoUrl: string | null;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
}

/**
 * 수강생 반응 기록 (2026-08-10 리드 지시 — 상태차트 자동화).
 * 붙여넣은 피드백을 문장 단위로 갈라 긍정/부정/특이로 나눠 쌓는다.
 *
 * ⚠️ 분류는 **제안일 뿐**이고 저장 전에 담당자가 고칠 수 있다 — 사람을 판정하는 것이
 * 아니라 기록을 정리하는 것이다(불변식 4). 분류 근거(걸린 낱말)를 함께 보여 준다.
 * ⚠️ 분류는 **브라우저 안에서만** 돈다. 수강생 기록을 바깥 AI에 보내지 않는다(불변식 4).
 */
export type ReactionSentiment = "positive" | "negative" | "notable";

export const REACTION_LABELS: Record<ReactionSentiment, string> = {
  positive: "긍정 반응",
  negative: "부정 반응",
  notable: "특이사항",
};

export interface StudentReaction {
  id: string;
  studentKey: string;
  sentiment: ReactionSentiment;
  text: string;
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
