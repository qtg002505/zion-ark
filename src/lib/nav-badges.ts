import type {
  CounselCase,
  CounselingTip,
  LessonNote,
  LessonResource,
  LibraryMaterial,
  PlanEntry,
  WorkspaceEntry,
} from "./types";

/**
 * NEW 뱃지 — 최근에 새 자료가 올라온 대주제에 금색 표시를 붙인다 (2026-08-10 리드 지시).
 *
 * 판정: 그 카테고리에 딸린 데이터의 **가장 최근 등록·수정 시각이 24시간 안**이면 새것이다.
 *
 * ⚠️ **지금은 브라우저 시계로 잰다.** 지시문 §4-3은 서버 시간 기준을 요구하지만 이
 * 프로토타입에는 서버가 없다. 기기 시계가 틀어져 있으면 뱃지가 영영 붙거나 아예 안 붙는다 —
 * 서버 연동 시 **요약 엔드포인트 하나**로 카테고리별 최신 시각을 받아 이 함수의 입력만
 * 바꾼다(카테고리 수만큼 목록 API를 부르지 않는다).
 *
 * ⚠️ 대주제 이름은 `nav.ts`의 `label`과 **글자까지 같아야** 한다. 어긋나면 뱃지가 조용히
 * 사라진다 — 그래서 여기서 이름을 직접 적지 않고 `NAV_LABELS`에 모아 두고 쓴다.
 */

/** 뱃지가 붙을 수 있는 대주제 — `nav.ts`의 대주제 `label`과 같은 문자열이어야 한다 */
export const NAV_LABELS = {
  cohort: "기수 현황",
  lecture: "강의 도우미",
  makeup: "분반 · 보강 도우미",
  students: "수강생 관리 도우미",
  counseling: "상담 도우미",
  library: "자료실",
  notices: "공지 · 어록",
} as const;

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface BadgeSources {
  materials: LibraryMaterial[];
  entries: WorkspaceEntry[];
  counselingTips: CounselingTip[];
  counselCases: CounselCase[];
  lessonNotes: LessonNote[];
  lessonResources: LessonResource[];
  planEntries: PlanEntry[];
}

/** 여러 시각 문자열 중 가장 나중 것 — 없으면 null */
function latest(...times: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const t of times) {
    if (!t) continue;
    if (best === null || t > best) best = t;
  }
  return best;
}

/**
 * 대주제별 마지막 갱신 시각.
 *
 * 어느 데이터가 어느 카테고리에 붙는지는 화면 구성을 따른다 — 예를 들어 상담 사례는
 * 「상담 도우미」 아래에서 열리므로 그 카테고리를 새것으로 만든다.
 */
export function lastUpdatedByGroup(src: BadgeSources): Record<string, string | null> {
  const instructorMaterials = src.materials.filter((m) => (m.section ?? "instructor") === "instructor");
  const externalMaterials = src.materials.filter((m) => m.section === "external");

  return {
    [NAV_LABELS.cohort]: latest(...src.planEntries.map((p) => p.updatedAt)),
    [NAV_LABELS.lecture]: latest(
      ...src.lessonNotes.map((n) => n.createdAt),
      ...src.lessonResources.map((r) => r.updatedAt),
    ),
    // 보강 자료·보강 콘텐츠는 자료실 데이터를 빌려 쓴다 — 등록되면 이쪽도 새것이다
    [NAV_LABELS.makeup]: latest(
      ...instructorMaterials.map((m) => m.updatedAt),
      ...externalMaterials.map((m) => m.updatedAt),
    ),
    [NAV_LABELS.students]: null, // 수강생 기록은 담당자별이라 전체 뱃지로 알리지 않는다
    [NAV_LABELS.counseling]: latest(
      ...src.counselingTips.filter((t) => !t.hiddenAt).map((t) => latest(t.updatedAt, t.createdAt)),
      ...src.counselCases.map((c) => latest(c.updatedAt, c.createdAt)),
    ),
    [NAV_LABELS.library]: latest(...src.materials.map((m) => m.updatedAt)),
    [NAV_LABELS.notices]: latest(...src.entries.map((e) => e.createdAt)),
  };
}

/** 24시간 안에 갱신된 대주제 이름 모음 */
export function newGroups(src: BadgeSources, now = Date.now()): Set<string> {
  const out = new Set<string>();
  for (const [label, at] of Object.entries(lastUpdatedByGroup(src))) {
    if (!at) continue;
    const ms = Date.parse(at);
    // 시각이 깨졌거나 미래면 뱃지를 붙이지 않는다 — 영영 새것으로 남는 것을 막는다
    if (Number.isNaN(ms) || ms > now) continue;
    if (now - ms < NEW_WINDOW_MS) out.add(label);
  }
  return out;
}
