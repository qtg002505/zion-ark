import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  CounselCase,
  CounselingTip,
  LessonNote,
  LessonNoteKind,
  LibraryCategory,
  LibraryMaterial,
  LibrarySection,
  QuoteCategory,
  PlanEntry,
  PlanEntryKind,
  RoleCode,
  TipReport,
  WeekNote,
  WeeklyPlan,
  WorkspaceEntry,
  WorkspaceKind,
} from "./types";
import type {
  StudentStatusOverride,
  StudentFeedbackRecord,
  FeedbackEdit,
  FeedbackKind,
  ChecklistProgress,
  CourseLevel,
} from "../content/student-profiles";

/**
 * 데이터 스토어 — 백엔드 연동 전 프로토타입 저장소.
 * localStorage에 영속하며, 실제 운영 전환 시 이 모듈이 API 클라이언트
 * (app/api/library-materials · workspace-entries 상당)로 교체되는 경계다.
 * 화면 컴포넌트는 이 훅만 사용하고 저장 방식에 의존하지 않는다.
 */

const LIB_KEY = "zion_ark_library_materials";
const WS_KEY = "zion_ark_workspace_entries";
const NOTE_KEY = "zion_ark_lesson_notes";
const PLAN_KEY = "zion_ark_weekly_plans";
const WEEKNOTE_KEY = "zion_ark_week_notes";
const CASE_KEY = "zion_ark_counsel_cases";
const PLAN_ENTRY_KEY = "zion_ark_plan_entries";
const TIP_KEY = "zion_ark_counseling_tips";
const TIP_REPORT_KEY = "zion_ark_tip_reports";
const STATUS_OVERRIDE_KEY = "zion_ark_student_status_overrides";
const STUDENT_FEEDBACK_KEY = "zion_ark_student_feedback";
const FEEDBACK_EDIT_KEY = "zion_ark_student_feedback_edits";
const FEEDBACK_DELETED_KEY = "zion_ark_student_feedback_deleted";
const CHECKLIST_KEY = "zion_ark_checklist_progress";

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ── 시드 데이터 (최초 1회) ── */

const SEED_MATERIALS: LibraryMaterial[] = [
  {
    id: "seed-std-1",
    category: "standard_lecture",
    title: "초등 과정 표준 강의안 활용 안내",
    body: "초등 23강 표준 교안의 7항목 구조(교육 핵심 / 기존 관점 / 예상 반응·질문 / 강의 주의사항 / 유도형 질문 / 예방·상담 / 교정 포인트) 활용 지침.\n\n강의 준비 시 '예상 반응·질문' 항목을 먼저 확인하고, 분반 담당 전도사와 '예방·상담' 항목을 공유한다.",
    externalUrl: null,
    isFeatured: false,
    section: "instructor",
    folderPath: ["개강 세미나"],
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "seed-cls-1",
    category: "class_material",
    title: "분반 첫 모임 진행 가이드",
    body: "분반 첫 모임에서 다룰 순서: 자기소개 → 수강 동기 나눔 → 분반 약속 정하기 → 다음 주 보강 일정 안내.\n\n에니어그램 가이드의 유형별 관리팁을 함께 참고하면 초기 관계 형성에 도움이 된다.",
    externalUrl: null,
    isFeatured: false,
    section: "instructor",
    // 2026-08-07 「성경 밭갈이」 폴더가 밭갈이 개편(PR #9)으로 사라져 여기로 옮겼다.
    // 폴더 이름을 바꿀 때는 이 시드의 folderPath도 함께 본다 — 어긋나면 자료가
    // 「전체」에만 뜨고 폴더로는 영영 닿지 않는다 (폴더 건수도 0으로 보인다).
    folderPath: ["초등 초반 밭갈이"],
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-02T09:00:00.000Z",
    updatedAt: "2026-08-02T09:00:00.000Z",
  },
  {
    id: "seed-exc-1",
    category: "excellent_plan",
    title: "[우수 교안] 3강 예언과 실상 — 질문 중심 전개안",
    body: "3강을 유도형 질문 중심으로 재구성한 교안. 수강생 질문 빈도가 높은 지점을 앞에 배치해 몰입도를 끌어올린 사례.\n\n※ 우수 교안은 총회 신학부장이 직접 지정한다 (승인 워크플로우 없음).",
    externalUrl: null,
    isFeatured: true,
    section: "instructor",
    folderPath: ["예배설교"],
    createdBy: "총회 신학부",
    createdByRole: "headquarters_admin",
    createdAt: "2026-08-03T09:00:00.000Z",
    updatedAt: "2026-08-03T09:00:00.000Z",
  },
  // 외부 자료실 — 가르칠 때 쓰는 교안이 아니라 그 밖의 지식·전달 자료
  {
    id: "seed-ext-1",
    category: "standard_lecture",
    title: "성경 기초 상식 — 66권의 구성",
    body: "구약 39권·신약 27권의 구분과 역사서·시가서·예언서 분류를 정리한 자료.\n\n수강 초기에 성경의 전체 얼개를 잡는 데 쓴다.",
    externalUrl: null,
    isFeatured: false,
    section: "external",
    folderPath: ["성경기초상식"],
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-04T09:00:00.000Z",
    updatedAt: "2026-08-04T09:00:00.000Z",
  },
  {
    id: "seed-ext-2",
    category: "standard_lecture",
    title: "하나님에 대한 필요성 — 전달 자료",
    body: "왜 하나님이 필요한가를 일상 언어로 풀어 전달하는 자료.\n\n교안이 아니라 대화에서 쓰는 자료이므로, 강의 순서에 매이지 않고 상황에 맞게 가져다 쓴다.",
    externalUrl: null,
    isFeatured: false,
    section: "external",
    folderPath: ["하나님에 대한 필요성"],
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-04T09:30:00.000Z",
    updatedAt: "2026-08-04T09:30:00.000Z",
  },
];

const SEED_ENTRIES: WorkspaceEntry[] = [
  {
    id: "seed-hq-1",
    kind: "notice_hq",
    title: "8월 전국 강사·전도사 월례 교육 안내",
    body: "8월 둘째 주 전국 월례 교육이 진행됩니다. 표준 강의 자료 개정판 배포와 함께 분반 운영 사례 발표가 있을 예정입니다. 각 지파 신학부는 참석 인원을 사전 취합해 주세요.",
    meta: null,
    quoteCategory: null,
    pinned: true,
    createdBy: "총회 신학부",
    createdByRole: "headquarters_admin",
    createdAt: "2026-08-04T09:00:00.000Z",
  },
  {
    id: "seed-tr-1",
    kind: "notice_tribe",
    title: "[요한] 지파 보강 일정 조정 안내",
    body: "요한 지파 소속 교회의 8월 보강 일정이 조정되었습니다. 담당 전도사는 분반별 보강 대상자 명단을 확인 후 일정 변경을 안내해 주세요.",
    meta: "요한",
    quoteCategory: null,
    pinned: false,
    createdBy: "요한 지파 신학부",
    createdByRole: "tribe_admin",
    createdAt: "2026-08-04T10:00:00.000Z",
  },
  {
    id: "seed-q-1",
    kind: "quote",
    title: "가르치는 자가 먼저 배우는 자가 되어야 한다.",
    body: "[샘플] 어록 원문 파일 수령 후 실제 어록으로 교체된다. 어록·출처·카테고리 구조 시연용.",
    meta: "출처 확인 중",
    quoteCategory: "교육",
    pinned: false,
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-03T09:00:00.000Z",
  },
  {
    id: "seed-q-2",
    kind: "quote",
    title: "맡은 사명은 크고 작음이 아니라 끝까지 감당하는 데 뜻이 있다.",
    body: "[샘플] 어록 원문 파일 수령 후 실제 어록으로 교체된다.",
    meta: "출처 확인 중",
    quoteCategory: "사명",
    pinned: false,
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-03T09:05:00.000Z",
  },
];

/** 강의 후 현장 기록 시드 — 어떤 식으로 쓰는지 보여 주는 예시 */
const SEED_NOTES: LessonNote[] = [
  {
    id: "seed-note-1",
    lessonKey: "elementary-1",
    lessonLabel: "초등 1강 — 두 가지 신 (하나님과 사단)",
    kind: "question",
    body: "영과 육을 나누는 대목에서 '그럼 지금 내 안에 어느 영이 있느냐'는 질문이 반복해서 나왔습니다. 교안의 유도형 질문을 먼저 던지고 시작하니 정리가 빨랐습니다.",
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-04T09:00:00.000Z",
    helpful: 3,
  },
  {
    id: "seed-note-2",
    lessonKey: "elementary-1",
    lessonLabel: "초등 1강 — 두 가지 신 (하나님과 사단)",
    kind: "caution",
    body: "교안 주의사항대로 목자·교회를 비판하는 인상을 주지 않도록 조심했습니다. 스스로 분별하도록 질문으로 돌리는 편이 반발이 적었습니다.",
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-04T09:10:00.000Z",
    helpful: 2,
  },
];

/** 상담 사례 시드 — 익명화 기준(지파·교회·센터까지)을 지킨 예시 */
const SEED_CASES: CounselCase[] = [
  {
    id: "seed-case-1",
    situation:
      "직장 교대 근무가 바뀌어 저녁 대면에 계속 빠지게 된 분이 있었습니다. 본인은 그만두겠다는 말까지 꺼냈습니다.",
    approach:
      "그만두는 이야기를 바로 만류하지 않고, 먼저 어느 시간대면 올 수 있는지부터 물었습니다. 오전 보강을 열어 같은 처지의 분들과 함께 묶었습니다.",
    result: "오전 보강으로 옮긴 뒤 8주 연속 출석했고 지금은 수료를 앞두고 있습니다.",
    outcome: "success",
    tribe: "요한",
    church: "과천교회",
    cohort: "111기",
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-04T09:00:00.000Z",
    helpful: 4,
  },
  {
    id: "seed-case-2",
    situation: "2주 결석 후 연락이 닿지 않던 분에게 여러 사람이 각각 연락을 넣었습니다.",
    approach: "강사와 전도사가 따로 연락하다 보니 같은 질문이 반복됐고, 부담을 느낀 것 같습니다.",
    result:
      "결국 돌아오지 않았습니다. 연락은 한 사람이 맡고 나머지는 상황만 공유하는 편이 나았겠다는 것이 남은 교훈입니다.",
    outcome: "failure",
    tribe: "요한",
    church: "과천교회",
    cohort: "112기",
    createdBy: "콘텐츠팀",
    createdByRole: "content_admin",
    createdAt: "2026-08-04T09:20:00.000Z",
    helpful: 6,
  },
];

/**
 * 상담법 UGC 시드 — 인기순 정렬이 실제로 갈리는 것을 보여 주기 위해 도움됨 수를 다르게 둔다.
 * 작성자는 전원 가상 인물이다 (불변식 6 — 화면 하단에 표기).
 */
const SEED_TIPS: CounselingTip[] = [
  {
    id: "seed-tip-1",
    themeNo: 1,
    title: "첫 주에 빠진 분은 둘째 주가 되기 전에 연락합니다",
    body: "[예시] 개강 첫 주에 빠지면 '나만 뒤처졌다'는 마음이 굳기 전에 닿는 것이 중요했습니다.\n\n빠진 이유를 묻기보다 다음 모임에서 다룰 내용을 먼저 알려 드렸습니다. 따라올 수 있다는 감각이 생기니 둘째 주에 나오셨습니다.",
    createdBy: "이본보기",
    createdByRole: "instructor",
    createdAt: "2026-08-05T09:00:00.000Z",
    updatedAt: "2026-08-05T09:00:00.000Z",
    helpfulBy: ["김가상", "박모형", "최견본"],
    hiddenAt: null,
    hiddenBy: null,
  },
  {
    id: "seed-tip-2",
    themeNo: 1,
    title: "개강 초에는 답을 주기보다 질문을 받아 적었습니다",
    body: "[예시] 초반에 교리 질문에 일일이 답하려다 오히려 부담을 드린 적이 있습니다.\n\n지금은 질문을 수첩에 받아 적고 '이건 몇 강에서 다룹니다'라고 알려 드립니다. 질문이 진도를 기다리는 기대가 됐습니다.",
    createdBy: "김가상",
    createdByRole: "evangelist",
    createdAt: "2026-08-06T09:00:00.000Z",
    updatedAt: "2026-08-06T09:00:00.000Z",
    helpfulBy: ["이본보기"],
    hiddenAt: null,
    hiddenBy: null,
  },
  {
    id: "seed-tip-3",
    themeNo: 8,
    title: "입교 준비는 본인 입으로 정리하게 했습니다",
    body: "[예시] 수료를 앞두고 제가 정리해 드리기보다, 배운 것 중 마음에 남은 대목을 본인이 말하게 했습니다.\n\n본인 언어로 정리된 것만 남습니다. 제 말로 채운 부분은 얼마 못 갔습니다.",
    createdBy: "박모형",
    createdByRole: "instructor",
    createdAt: "2026-08-07T09:00:00.000Z",
    updatedAt: "2026-08-07T09:00:00.000Z",
    helpfulBy: [],
    hiddenAt: null,
    hiddenBy: null,
  },
];

/* ── 스토어 구현 ── */

/**
 * 저장소에서 읽고, **뒤늦게 추가된 시드는 덧붙인다.**
 *
 * 왜 덧붙이나: 종전에는 키가 이미 있으면 시드를 아예 건너뛰었다. 그래서 프리뷰를 한 번
 * 열어 본 팀원은 그 뒤에 추가된 예시 자료가 영영 보이지 않았다 — 화면 코드는 최신인데
 * **내용이 옛것이라 "안 고쳐졌다"고 보이는** 원인이었다.
 *
 * 없는 시드만 id로 대조해 더한다. 사용자가 등록한 것은 건드리지 않는다 —
 * 지우거나 덮어쓰는 이관은 하지 않는다.
 * (실연동 시에는 서버가 데이터를 주므로 이 함수째 사라진다.)
 */
function load<T extends { id: string }>(key: string, seed: T[]): T[] {
  let stored: T[] | null = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) stored = JSON.parse(raw) as T[];
  } catch {
    /* 손상 시 시드로 복구 */
  }
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  const have = new Set(stored.map((x) => x.id));
  const missing = seed.filter((s) => !have.has(s.id));
  if (missing.length === 0) return stored;
  const next = [...stored, ...missing];
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

/** id가 없는 기록(주차 사유)은 대조할 키가 없어 그대로 읽는다 */
function loadPlain<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    /* 손상 시 빈 목록 */
  }
  return [];
}

/**
 * 자료실 이관 — 구획·폴더가 생기기 전(2026-08-06 이전)에 저장된 자료를 메운다.
 * `section`이 없으면 어느 구획에도 안 잡히므로 「강사 도우미 자료실」로 본다.
 * 빠진 시드를 덧붙이는 일은 `load()`가 이미 한다.
 */
function migrateMaterials(stored: LibraryMaterial[]): LibraryMaterial[] {
  return stored.map((m) => ({
    ...m,
    section: m.section ?? "instructor",
    folderPath: m.folderPath ?? [],
  }));
}

interface StoreValue {
  materials: LibraryMaterial[];
  entries: WorkspaceEntry[];
  lessonNotes: LessonNote[];
  plans: WeeklyPlan[];
  weekNotes: WeekNote[];
  counselCases: CounselCase[];
  counselingTips: CounselingTip[];
  tipReports: TipReport[];
  /** 달력형 주간계획 항목 — 종전 `plans`(주차별 글)와 함께 쓴다 */
  planEntries: PlanEntry[];
  studentStatusOverrides: StudentStatusOverride[];
  /** 담당자가 상세 페이지에서 직접 남긴 보강·상담 기록 — 씨앗 데이터와 합쳐서 보여준다 */
  studentFeedback: StudentFeedbackRecord[];
  /** 씨앗 기록(수정 불가한 고정 텍스트) 위에 덮어쓸 내용 — id별 */
  feedbackEdits: FeedbackEdit[];
  /** 지운 기록의 id 목록 — 씨앗 기록은 배열에서 못 지우니 숨김 처리한다 */
  deletedFeedbackIds: string[];
  /** 초·중·고 단계 항목 체크 — 수강생별·레벨별·항목별 완료 여부 */
  checklistProgress: ChecklistProgress[];
  addMaterial: (input: {
    category: LibraryCategory;
    title: string;
    body: string;
    externalUrl: string | null;
    section: LibrarySection;
    folderPath: string[];
    createdBy: string;
    createdByRole: RoleCode;
  }) => void;
  toggleFeatured: (id: string) => void;
  addEntry: (input: {
    kind: WorkspaceKind;
    title: string;
    body: string;
    meta: string | null;
    quoteCategory: QuoteCategory | null;
    pinned: boolean;
    createdBy: string;
    createdByRole: RoleCode;
  }) => void;
  addLessonNote: (input: {
    lessonKey: string;
    lessonLabel: string;
    kind: LessonNoteKind;
    body: string;
    createdBy: string;
    createdByRole: RoleCode;
  }) => void;
  markNoteHelpful: (id: string) => void;
  /** 주간계획 저장 — 이전 내용을 이력으로 남긴다 (여럿이 함께 고치기 때문) */
  savePlan: (input: {
    cohortKey: string;
    week: string;
    body: string;
    editedBy: string;
    editedByRole: RoleCode;
  }) => void;
  saveWeekNote: (input: WeekNote) => void;
  addCounselCase: (input: Omit<CounselCase, "id" | "createdAt" | "helpful">) => void;
  markCaseHelpful: (id: string) => void;
  /* 상담법 UGC (3단계) — 권한 판정은 permissions.ts가 하고 여기는 저장만 한다 */
  addCounselingTip: (input: {
    themeNo: number;
    title: string;
    body: string;
    createdBy: string;
    createdByRole: RoleCode;
  }) => void;
  updateCounselingTip: (id: string, input: { title: string; body: string }) => void;
  deleteCounselingTip: (id: string) => void;
  /** 도움됨 토글 — 계정당 1회. 카운트는 helpfulBy 길이에서 항상 재계산된다 */
  toggleTipHelpful: (id: string, userName: string) => void;
  reportTip: (input: {
    tipId: string;
    reporterName: string;
    reporterRole: RoleCode;
    reason: string;
  }) => void;
  resolveTipReport: (reportId: string, resolvedBy: string) => void;
  /** 관리자 숨김·해제 — 소프트 삭제 (hiddenAt 기입, 데이터는 남긴다) */
  setTipHidden: (id: string, hidden: boolean, adminName: string) => void;
  /* 달력형 주간계획 — 권한(canEditCohortRecord)은 호출부가 먼저 본다 */
  addPlanEntry: (input: {
    cohortKey: string;
    date: string;
    kind: PlanEntryKind;
    title: string;
    session?: number | null;
    updatedBy: string;
    updatedByRole: RoleCode;
  }) => void;
  updatePlanEntry: (
    id: string,
    input: { date?: string; kind?: PlanEntryKind; title?: string; session?: number | null },
    updatedBy: string,
    updatedByRole: RoleCode,
  ) => void;
  deletePlanEntry: (id: string) => void;
  /**
   * 진도표 파일에서 읽은 항목으로 갈아끼운다 (파일 업로드 연동).
   * **사람이 직접 적은 항목은 건드리지 않는다** — 업로드로 들어온 것(`fromUpload`)만
   * 지우고 새로 넣는다. 그래야 파일을 다시 올려도 손으로 적은 메모가 살아남는다.
   */
  replaceUploadedPlanEntries: (
    cohortKey: string,
    rows: { date: string; kind: PlanEntryKind; title: string; session: number | null }[],
    updatedBy: string,
    updatedByRole: RoleCode,
  ) => void;
  /**
   * 수강생 상태 표시줄(소속·상태·유월·신앙 상태) 수동 변경 — 필드 단위로 덮어쓴다.
   * 권한 판정(`canEditCohortRecord`)은 호출부(화면)가 먼저 확인한다.
   */
  setStudentStatus: (
    studentKey: string,
    patch: Partial<
      Pick<
        StudentStatusOverride,
        "fellowship" | "grade" | "faithType" | "faithStatus" | "note" | "availableTime" | "interests"
      >
    >,
    updatedBy: string,
    updatedByRole: RoleCode,
  ) => void;
  /** 보강·상담·특이사항·메모 기록 추가 — 해당 기수의 강사·전도사만(호출부가 권한을 먼저 본다) */
  addStudentFeedback: (input: {
    studentKey: string;
    kind: FeedbackKind;
    date: string;
    subject?: string;
    text: string;
    checklistItems?: number[];
    by: string;
    byRole: RoleCode;
  }) => void;
  /**
   * 기록 수정 — store에서 만든 기록(`StudentFeedbackRecord`)은 배열 항목을 바로 고치고,
   * 씨앗 기록(`seed-`로 시작하는 id)은 `feedbackEdits`에 덮어쓸 내용만 남긴다.
   */
  updateStudentFeedback: (
    id: string,
    patch: { date: string; subject?: string; text: string; checklistItems?: number[] },
  ) => void;
  /** 기록 삭제 — store 기록은 배열에서 지우고, 씨앗 기록은 `deletedFeedbackIds`에 넣어 숨긴다 */
  deleteStudentFeedback: (id: string) => void;
  /** 단계 세부 질문 체크 토글 — 해당 기수의 강사·전도사만(호출부가 권한을 먼저 본다).
   * `week`는 중등처럼 주차 칸이 있는 레벨에서만 넘긴다 */
  toggleChecklistItem: (
    studentKey: string,
    level: CourseLevel,
    groupNo: number,
    qIndex: number,
    updatedBy: string,
    updatedByRole: RoleCode,
    week?: number,
  ) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<LibraryMaterial[]>(() =>
    migrateMaterials(load(LIB_KEY, SEED_MATERIALS)),
  );
  const [entries, setEntries] = useState<WorkspaceEntry[]>(() => load(WS_KEY, SEED_ENTRIES));
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>(() => load(NOTE_KEY, SEED_NOTES));
  const [plans, setPlans] = useState<WeeklyPlan[]>(() => load(PLAN_KEY, []));
  const [weekNotes, setWeekNotes] = useState<WeekNote[]>(() => loadPlain<WeekNote>(WEEKNOTE_KEY));
  const [counselCases, setCounselCases] = useState<CounselCase[]>(() => load(CASE_KEY, SEED_CASES));
  const [counselingTips, setCounselingTips] = useState<CounselingTip[]>(() =>
    load(TIP_KEY, SEED_TIPS),
  );
  const [tipReports, setTipReports] = useState<TipReport[]>(() => load(TIP_REPORT_KEY, []));
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>(() => load(PLAN_ENTRY_KEY, []));
  const [studentStatusOverrides, setStudentStatusOverrides] = useState<StudentStatusOverride[]>(() =>
    loadPlain<StudentStatusOverride>(STATUS_OVERRIDE_KEY),
  );
  const [studentFeedback, setStudentFeedback] = useState<StudentFeedbackRecord[]>(() =>
    load(STUDENT_FEEDBACK_KEY, []),
  );
  const [feedbackEdits, setFeedbackEdits] = useState<FeedbackEdit[]>(() =>
    loadPlain<FeedbackEdit>(FEEDBACK_EDIT_KEY),
  );
  const [deletedFeedbackIds, setDeletedFeedbackIds] = useState<string[]>(() =>
    loadPlain<string>(FEEDBACK_DELETED_KEY),
  );
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress[]>(() =>
    loadPlain<ChecklistProgress>(CHECKLIST_KEY),
  );

  const persistMaterials = useCallback((next: LibraryMaterial[]) => {
    localStorage.setItem(LIB_KEY, JSON.stringify(next));
    setMaterials(next);
  }, []);

  const persistEntries = useCallback((next: WorkspaceEntry[]) => {
    localStorage.setItem(WS_KEY, JSON.stringify(next));
    setEntries(next);
  }, []);

  const persistNotes = useCallback((next: LessonNote[]) => {
    localStorage.setItem(NOTE_KEY, JSON.stringify(next));
    setLessonNotes(next);
  }, []);

  const persistPlans = useCallback((next: WeeklyPlan[]) => {
    localStorage.setItem(PLAN_KEY, JSON.stringify(next));
    setPlans(next);
  }, []);

  const persistWeekNotes = useCallback((next: WeekNote[]) => {
    localStorage.setItem(WEEKNOTE_KEY, JSON.stringify(next));
    setWeekNotes(next);
  }, []);

  const persistCases = useCallback((next: CounselCase[]) => {
    localStorage.setItem(CASE_KEY, JSON.stringify(next));
    setCounselCases(next);
  }, []);

  const persistTips = useCallback((next: CounselingTip[]) => {
    localStorage.setItem(TIP_KEY, JSON.stringify(next));
    setCounselingTips(next);
  }, []);

  const persistTipReports = useCallback((next: TipReport[]) => {
    localStorage.setItem(TIP_REPORT_KEY, JSON.stringify(next));
    setTipReports(next);
  }, []);

  const persistPlanEntries = useCallback((next: PlanEntry[]) => {
    localStorage.setItem(PLAN_ENTRY_KEY, JSON.stringify(next));
    setPlanEntries(next);
  }, []);

  const persistStudentStatusOverrides = useCallback((next: StudentStatusOverride[]) => {
    localStorage.setItem(STATUS_OVERRIDE_KEY, JSON.stringify(next));
    setStudentStatusOverrides(next);
  }, []);

  const persistStudentFeedback = useCallback((next: StudentFeedbackRecord[]) => {
    localStorage.setItem(STUDENT_FEEDBACK_KEY, JSON.stringify(next));
    setStudentFeedback(next);
  }, []);

  const persistFeedbackEdits = useCallback((next: FeedbackEdit[]) => {
    localStorage.setItem(FEEDBACK_EDIT_KEY, JSON.stringify(next));
    setFeedbackEdits(next);
  }, []);

  const persistDeletedFeedbackIds = useCallback((next: string[]) => {
    localStorage.setItem(FEEDBACK_DELETED_KEY, JSON.stringify(next));
    setDeletedFeedbackIds(next);
  }, []);

  const persistChecklistProgress = useCallback((next: ChecklistProgress[]) => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
    setChecklistProgress(next);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      materials,
      entries,
      lessonNotes,
      plans,
      weekNotes,
      counselCases,
      counselingTips,
      tipReports,
      planEntries,
      studentStatusOverrides,
      studentFeedback,
      addMaterial: (input) => {
        const item: LibraryMaterial = {
          id: uid(),
          ...input,
          isFeatured: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        persistMaterials([item, ...materials]);
      },
      toggleFeatured: (id) => {
        persistMaterials(
          materials.map((m) =>
            m.id === id ? { ...m, isFeatured: !m.isFeatured, updatedAt: nowIso() } : m,
          ),
        );
      },
      addEntry: (input) => {
        const item: WorkspaceEntry = { id: uid(), ...input, createdAt: nowIso() };
        persistEntries([item, ...entries]);
      },
      addLessonNote: (input) => {
        const item: LessonNote = { id: uid(), ...input, createdAt: nowIso(), helpful: 0 };
        persistNotes([item, ...lessonNotes]);
      },
      markNoteHelpful: (id) => {
        persistNotes(
          lessonNotes.map((n) => (n.id === id ? { ...n, helpful: n.helpful + 1 } : n)),
        );
      },
      savePlan: ({ cohortKey, week, body, editedBy, editedByRole }) => {
        const existing = plans.find((p) => p.cohortKey === cohortKey && p.week === week);
        if (existing) {
          // 여럿이 함께 고치므로 직전 내용을 이력으로 남긴다 — 되돌릴 수 있어야 한다
          const revision = {
            body: existing.body,
            editedBy: existing.updatedBy,
            editedByRole: existing.updatedByRole,
            editedAt: existing.updatedAt,
          };
          persistPlans(
            plans.map((p) =>
              p.id === existing.id
                ? {
                    ...p,
                    body,
                    updatedBy: editedBy,
                    updatedByRole: editedByRole,
                    updatedAt: nowIso(),
                    history: [revision, ...p.history].slice(0, 20),
                  }
                : p,
            ),
          );
        } else {
          persistPlans([
            {
              id: uid(),
              cohortKey,
              week,
              body,
              updatedBy: editedBy,
              updatedByRole: editedByRole,
              updatedAt: nowIso(),
              history: [],
            },
            ...plans,
          ]);
        }
      },
      saveWeekNote: (input) => {
        const rest = weekNotes.filter(
          (n) => !(n.cohortKey === input.cohortKey && n.week === input.week),
        );
        persistWeekNotes([input, ...rest]);
      },
      addCounselCase: (input) => {
        persistCases([{ id: uid(), ...input, createdAt: nowIso(), helpful: 0 }, ...counselCases]);
      },
      markCaseHelpful: (id) => {
        persistCases(counselCases.map((c) => (c.id === id ? { ...c, helpful: c.helpful + 1 } : c)));
      },
      addCounselingTip: (input) => {
        const item: CounselingTip = {
          id: uid(),
          ...input,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          helpfulBy: [],
          hiddenAt: null,
          hiddenBy: null,
        };
        persistTips([item, ...counselingTips]);
      },
      updateCounselingTip: (id, input) => {
        persistTips(
          counselingTips.map((t) => (t.id === id ? { ...t, ...input, updatedAt: nowIso() } : t)),
        );
      },
      // 본인 삭제는 프로토타입에서 실제 삭제다. 서버 연동 시 삭제 정책(소프트/하드)은
      // 원 저장소가 정한다 — 관리자 「숨김」과는 다른 동작임에 유의 (숨김은 hiddenAt 기입).
      deleteCounselingTip: (id) => {
        persistTips(counselingTips.filter((t) => t.id !== id));
        // 지워진 글의 신고는 처리할 대상이 없다 — 큐에 남기지 않는다
        persistTipReports(tipReports.filter((r) => r.tipId !== id));
      },
      toggleTipHelpful: (id, userName) => {
        persistTips(
          counselingTips.map((t) => {
            if (t.id !== id) return t;
            // UNIQUE(tip_id, user_id) 계약의 미러 — 있으면 빼고 없으면 넣는다.
            // 몇 번을 눌러도 한 사람은 한 표다 (지시문 §11: 중복 클릭에 카운트 불변)
            const has = t.helpfulBy.includes(userName);
            return {
              ...t,
              helpfulBy: has ? t.helpfulBy.filter((n) => n !== userName) : [...t.helpfulBy, userName],
            };
          }),
        );
      },
      reportTip: (input) => {
        // 같은 사람이 같은 글에 넣은 미처리 신고가 있으면 겹쳐 쌓지 않는다
        const dup = tipReports.some(
          (r) => r.tipId === input.tipId && r.reporterName === input.reporterName && !r.resolvedAt,
        );
        if (dup) return;
        const item: TipReport = {
          id: uid(),
          ...input,
          createdAt: nowIso(),
          resolvedAt: null,
          resolvedBy: null,
        };
        persistTipReports([item, ...tipReports]);
      },
      resolveTipReport: (reportId, resolvedBy) => {
        persistTipReports(
          tipReports.map((r) =>
            r.id === reportId ? { ...r, resolvedAt: nowIso(), resolvedBy } : r,
          ),
        );
      },
      setTipHidden: (id, hidden, adminName) => {
        persistTips(
          counselingTips.map((t) =>
            t.id === id
              ? {
                  ...t,
                  hiddenAt: hidden ? nowIso() : null,
                  hiddenBy: hidden ? adminName : null,
                }
              : t,
          ),
        );
      },
      addPlanEntry: ({ session = null, ...input }) => {
        const item: PlanEntry = {
          id: uid(),
          ...input,
          session,
          fromUpload: false,
          updatedAt: nowIso(),
        };
        persistPlanEntries([...planEntries, item]);
      },
      updatePlanEntry: (id, input, updatedBy, updatedByRole) => {
        persistPlanEntries(
          planEntries.map((e) =>
            e.id === id ? { ...e, ...input, updatedBy, updatedByRole, updatedAt: nowIso() } : e,
          ),
        );
      },
      deletePlanEntry: (id) => {
        persistPlanEntries(planEntries.filter((e) => e.id !== id));
      },
      replaceUploadedPlanEntries: (cohortKey, rows, updatedBy, updatedByRole) => {
        // 이 기수의 업로드분만 걷어낸다 — 손으로 적은 것과 다른 기수 것은 그대로 둔다
        const kept = planEntries.filter((e) => !(e.cohortKey === cohortKey && e.fromUpload));
        const added: PlanEntry[] = rows.map((r) => ({
          id: uid(),
          cohortKey,
          date: r.date,
          kind: r.kind,
          title: r.title,
          session: r.session,
          fromUpload: true,
          updatedBy,
          updatedByRole,
          updatedAt: nowIso(),
        }));
        persistPlanEntries([...kept, ...added]);
      },
      setStudentStatus: (studentKey, patch, updatedBy, updatedByRole) => {
        const existing = studentStatusOverrides.find((o) => o.studentKey === studentKey);
        // 특이사항을 실제로 바꿀 때만 직전 값을 이력에 쌓는다(최근 20건, 최신이 앞).
        // 최초 수정(existing.note가 아직 없을 때)은 씨앗 값이라 store가 몰라 이력에 못 넣는다 —
        // 화면에서 씨앗 값(StudentProfile.note)을 이력 맨 아래 "최초" 항목으로 따로 보여준다.
        const noteChanged = patch.note !== undefined && existing?.note !== undefined && patch.note !== existing.note;
        const noteHistory = noteChanged
          ? [
              {
                text: existing!.note!,
                editedBy: existing!.updatedBy,
                editedByRole: existing!.updatedByRole,
                editedAt: existing!.updatedAt,
              },
              ...(existing?.noteHistory ?? []),
            ].slice(0, 20)
          : existing?.noteHistory;
        const merged: StudentStatusOverride = {
          studentKey,
          fellowship: patch.fellowship ?? existing?.fellowship,
          grade: patch.grade ?? existing?.grade,
          faithType: patch.faithType ?? existing?.faithType,
          faithStatus: patch.faithStatus ?? existing?.faithStatus,
          note: patch.note ?? existing?.note,
          noteHistory,
          availableTime: patch.availableTime ?? existing?.availableTime,
          interests: patch.interests ?? existing?.interests,
          updatedBy,
          updatedByRole,
          updatedAt: nowIso(),
        };
        persistStudentStatusOverrides([
          merged,
          ...studentStatusOverrides.filter((o) => o.studentKey !== studentKey),
        ]);
      },
      addStudentFeedback: (input) => {
        const item: StudentFeedbackRecord = { id: uid(), ...input };
        persistStudentFeedback([item, ...studentFeedback]);
      },
      feedbackEdits,
      deletedFeedbackIds,
      updateStudentFeedback: (id, patch) => {
        if (id.startsWith("seed-")) {
          persistFeedbackEdits([
            { id, ...patch },
            ...feedbackEdits.filter((e) => e.id !== id),
          ]);
          return;
        }
        persistStudentFeedback(studentFeedback.map((f) => (f.id === id ? { ...f, ...patch } : f)));
      },
      deleteStudentFeedback: (id) => {
        if (id.startsWith("seed-")) {
          if (!deletedFeedbackIds.includes(id)) {
            persistDeletedFeedbackIds([id, ...deletedFeedbackIds]);
          }
          return;
        }
        persistStudentFeedback(studentFeedback.filter((f) => f.id !== id));
      },
      checklistProgress,
      toggleChecklistItem: (studentKey, level, groupNo, qIndex, updatedBy, updatedByRole, week) => {
        const existing = checklistProgress.find(
          (c) =>
            c.studentKey === studentKey &&
            c.level === level &&
            c.groupNo === groupNo &&
            c.qIndex === qIndex,
        );
        const rest = checklistProgress.filter(
          (c) =>
            !(
              c.studentKey === studentKey &&
              c.level === level &&
              c.groupNo === groupNo &&
              c.qIndex === qIndex
            ),
        );
        persistChecklistProgress([
          {
            studentKey,
            level,
            groupNo,
            qIndex,
            checked: !existing?.checked,
            week: week ?? existing?.week,
            updatedBy,
            updatedByRole,
            updatedAt: nowIso(),
          },
          ...rest,
        ]);
      },
    }),
    [
      materials,
      entries,
      lessonNotes,
      plans,
      weekNotes,
      counselCases,
      counselingTips,
      tipReports,
      planEntries,
      studentStatusOverrides,
      studentFeedback,
      feedbackEdits,
      deletedFeedbackIds,
      checklistProgress,
      persistPlanEntries,
      persistMaterials,
      persistEntries,
      persistNotes,
      persistPlans,
      persistWeekNotes,
      persistCases,
      persistTips,
      persistTipReports,
      persistStudentStatusOverrides,
      persistStudentFeedback,
      persistFeedbackEdits,
      persistDeletedFeedbackIds,
      persistChecklistProgress,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore는 StoreProvider 안에서만 사용");
  return ctx;
}
