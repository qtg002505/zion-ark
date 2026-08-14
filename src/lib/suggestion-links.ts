import type { LibraryMaterial } from "./types";
import type { Grade } from "./student-grade";
import { looseIncludes } from "./text-match";

/**
 * AI 추천 액션 → 자료실 딥링크 (2026-08-14 피드백 FB-08).
 *
 * 추천 액션이 글로 끝나지 않고, 그 액션에 맞는 **보강 교안·교재로 바로 이동**하게 잇는다.
 *
 * ## 지키는 것
 *
 * - **규칙 기반이다.** 추천 문구마다 「어느 폴더에서, 어떤 낱말로 찾을지」를 사람이 적어
 *   뒀다. AI가 링크를 지어내는 일은 없다 — **지금 존재하는 자료만** 연결되고, 맞는 자료가
 *   없으면 「연결 자료 없음」으로 정직하게 비운다 (지시문: AI 자유생성 링크 금지)
 * - 수강생 개인정보는 어디에도 관여하지 않는다 — 매핑의 입력은 등급별 추천 문구뿐이다
 * - 화면 쪽 고지(AI 제안·확정 판정 아님)는 그대로 유지된다 (불변식 4)
 *
 * ⚠️ 문구가 `student-grade.ts`의 `SUGGESTIONS` 값과 **글자 그대로** 맞아야 한다.
 * 문구를 고치면 여기도 같이 고친다 — 어긋나면 조용히 「연결 자료 없음」이 된다.
 */

interface SuggestionRule {
  /** 이 폴더들에서 찾는다 (folderPath[0] 대조). 비우면 폴더 제한 없음 */
  folders?: string[];
  /** 우수 지정(isFeatured)·우수 교안 분류에서 찾는다 */
  featured?: boolean;
  /** 제목·본문에 이 낱말 중 하나가 있으면 우선한다 (없어도 폴더 안 최신 자료로 폴백) */
  keywords?: string[];
  /** 자료를 여는 화면 — 보강 폴더는 자료실, 우수 교안은 강의 도우미 */
  base: "/library" | "/teaching";
}

/** 등급별 추천 문구 → 찾기 규칙. 문구는 SUGGESTIONS와 1:1이다 */
const RULES: Record<string, SuggestionRule> = {
  // A등급
  "우수 사례 공유": { featured: true, base: "/teaching" },
  "리더십 역할 제안": { folders: ["사명자 양성"], keywords: ["리더", "사명"], base: "/library" },
  // B등급
  "출석 독려 연락": { folders: ["신심심기"], keywords: ["출석", "신심"], base: "/library" },
  "관심 표현 상담": { folders: ["영적전환"], keywords: ["상담", "마음"], base: "/library" },
  // D등급
  "담당자 직접 연락": { folders: ["환경정리"], keywords: ["연락", "환경"], base: "/library" },
  "보강 편성 재조정": { folders: ["이면유월 보강"], keywords: ["보강"], base: "/library" },
  // E등급
  "재등록 의사 확인": { folders: ["신앙인창조"], keywords: ["재등록", "신앙"], base: "/library" },
  "개인 사정 파악": { folders: ["환경정리"], keywords: ["사정", "환경"], base: "/library" },
};

export interface ResolvedSuggestionLink {
  /** 연결된 실제 자료 — 없으면 null (「연결 자료 없음」 폴백) */
  material: LibraryMaterial | null;
  /** 자료 상세를 바로 여는 딥링크 (`open` 파라미터를 FolderLibrary가 읽는다) */
  href: string | null;
}

/**
 * 추천 문구 하나를 **지금 존재하는 자료**에 잇는다. 순수 함수 — 스토어를 모른다.
 * 낱말이 맞는 자료 > 폴더 안 최신 자료 순으로 고른다.
 */
export function resolveSuggestionLink(
  suggestion: string,
  materials: LibraryMaterial[],
): ResolvedSuggestionLink {
  const rule = RULES[suggestion];
  if (!rule) return { material: null, href: null };

  const pool = materials.filter((m) => {
    if (rule.featured) return m.isFeatured || m.category === "excellent_plan";
    return rule.folders?.includes((m.folderPath ?? [])[0] ?? "") ?? false;
  });
  if (pool.length === 0) return { material: null, href: null };

  const byKeyword = rule.keywords
    ? pool.filter((m) => rule.keywords!.some((k) => looseIncludes(m.title, k) || looseIncludes(m.body, k)))
    : [];
  const pick = (byKeyword.length > 0 ? byKeyword : pool).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];

  const href = rule.featured
    ? `${rule.base}?tab=excellent_plan&open=${encodeURIComponent(pick.id)}`
    : `${rule.base}?folder=${encodeURIComponent((pick.folderPath ?? [])[0] ?? "")}&open=${encodeURIComponent(pick.id)}`;
  return { material: pick, href };
}

/** 화면용 — 등급의 추천 문구 전부를 한 번에 잇는다 */
export function resolveSuggestionLinks(
  suggestions: string[],
  materials: LibraryMaterial[],
): { suggestion: string; link: ResolvedSuggestionLink }[] {
  return suggestions.map((s) => ({ suggestion: s, link: resolveSuggestionLink(s, materials) }));
}

/** 타입 참조용 — SUGGESTIONS와의 1:1 계약을 주석이 아니라 코드로도 남겨 둔다 */
export type { Grade };
