import type { Session, WorkspaceKind } from "./types";

/**
 * 권한 판정 — 옵시디언 금고 「권한-결정사항」 확정값 (2026-08-05 리드).
 * 실제 운영에서는 서버가 memberships 대조로 판정한다. 이 모듈은 그 계약의
 * 프런트엔드 미러이며, UI 노출 제어에만 쓴다 (백엔드 연동 시 서버 판정이 최종).
 */

/** 자료실 등록·수정: content_admin · headquarters_admin (1차 기본값) */
export function canWriteLibrary(s: Session): boolean {
  return s.roleCode === "content_admin" || s.roleCode === "headquarters_admin";
}

/** 우수 교안 지정·해제: headquarters_admin만 (확정 결정 4) */
export function canToggleFeatured(s: Session): boolean {
  return s.roleCode === "headquarters_admin";
}

/** 공지·어록·영상 작성 권한 */
export function canWriteWorkspace(s: Session, kind: WorkspaceKind, targetTribe?: string): boolean {
  switch (kind) {
    case "notice_hq":
      return s.roleCode === "headquarters_admin" || s.roleCode === "content_admin";
    case "notice_tribe":
      // 해당 지파의 tribe_admin만 — 대상 지파와 소속 지파 대조
      return s.roleCode === "tribe_admin" && (!targetTribe || targetTribe === s.tribe);
    case "quote":
    case "video":
      return s.roleCode === "content_admin" || s.roleCode === "headquarters_admin";
  }
}

/** 수강생·출결 열람 범위 — 강사=담당 기수, 전도사=담당 분반 (어휘: 사명자=강사+전도사) */
export function studentScopeLabel(s: Session): string {
  switch (s.roleCode) {
    case "headquarters_admin":
    case "content_admin":
    case "security_auditor":
      return "전국";
    case "tribe_admin":
      return `${s.tribe} 지파`;
    case "church_admin":
      return `${s.church}`;
    case "instructor":
      return `${s.church} ${s.cohort} (담당 기수)`;
    case "evangelist":
      return `${s.church} ${s.cohort} ${s.division ?? ""} (담당 분반)`;
  }
}

/** 전도사는 담당 분반만 조회 (범위 밖 서버 403 계약의 UI 미러) */
export function visibleDivisions(s: Session, allDivisions: string[]): string[] {
  if (s.roleCode === "evangelist" && s.division) return [s.division];
  return allDivisions;
}
