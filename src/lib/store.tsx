import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  CounselCase,
  LessonNote,
  LessonNoteKind,
  LibraryCategory,
  LibraryMaterial,
  LibrarySection,
  QuoteCategory,
  RoleCode,
  WeekNote,
  WeeklyPlan,
  WorkspaceEntry,
  WorkspaceKind,
} from "./types";

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

  const value = useMemo<StoreValue>(
    () => ({
      materials,
      entries,
      lessonNotes,
      plans,
      weekNotes,
      counselCases,
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
    }),
    [
      materials,
      entries,
      lessonNotes,
      plans,
      weekNotes,
      counselCases,
      persistMaterials,
      persistEntries,
      persistNotes,
      persistPlans,
      persistWeekNotes,
      persistCases,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore는 StoreProvider 안에서만 사용");
  return ctx;
}
