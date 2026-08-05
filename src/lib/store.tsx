import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  LibraryCategory,
  LibraryMaterial,
  QuoteCategory,
  RoleCode,
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
    createdBy: "총회 신학부",
    createdByRole: "headquarters_admin",
    createdAt: "2026-08-03T09:00:00.000Z",
    updatedAt: "2026-08-03T09:00:00.000Z",
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

/* ── 스토어 구현 ── */

function load<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    /* 손상 시 시드로 복구 */
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

interface StoreValue {
  materials: LibraryMaterial[];
  entries: WorkspaceEntry[];
  addMaterial: (input: {
    category: LibraryCategory;
    title: string;
    body: string;
    externalUrl: string | null;
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
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<LibraryMaterial[]>(() => load(LIB_KEY, SEED_MATERIALS));
  const [entries, setEntries] = useState<WorkspaceEntry[]>(() => load(WS_KEY, SEED_ENTRIES));

  const persistMaterials = useCallback((next: LibraryMaterial[]) => {
    localStorage.setItem(LIB_KEY, JSON.stringify(next));
    setMaterials(next);
  }, []);

  const persistEntries = useCallback((next: WorkspaceEntry[]) => {
    localStorage.setItem(WS_KEY, JSON.stringify(next));
    setEntries(next);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      materials,
      entries,
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
    }),
    [materials, entries, persistMaterials, persistEntries],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore는 StoreProvider 안에서만 사용");
  return ctx;
}
