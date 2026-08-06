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

/**
 * 수강생·출결 열람 범위 (2026-08-06 확정 — `docs/decisions/ORG_CHART.md`).
 *
 * 강사·전도사 모두 **담당 기수 전체**를 본다. 전도사가 담당 분반만 보던 종전 규칙은
 * 폐기됐다 — 분반은 더 이상 권한 경계가 아니다.
 * 관리직(신학부장 이상)은 담당 기수를 갖지 않고 하위 조직 전체 집계를 본다.
 */
export function studentScopeLabel(s: Session): string {
  switch (s.roleCode) {
    case "headquarters_admin":
    case "content_admin":
    case "security_auditor":
      return "12지파 전체";
    case "tribe_admin":
      return `${s.tribe} 지파 전체`;
    case "church_admin":
      return `${s.church} 전체`;
    case "instructor":
    case "evangelist":
      return `${s.church} ${s.cohort} (담당 기수)`;
  }
}

/**
 * 조회 가능한 분반 — 강사·전도사 모두 담당 기수의 모든 분반을 본다.
 *
 * `division` 스코프 값과 `divisions` 데이터는 스키마에 남겨 둔다. 분반 단위 배정이
 * 다시 필요해질 수 있고, 지우면 후방 마이그레이션이 되기 때문이다(불변식 10).
 * 다만 **권한 판정에는 쓰지 않는다.**
 */
export function visibleDivisions(_s: Session, allDivisions: string[]): string[] {
  return allDivisions;
}

/** 담당 기수를 갖는 실무직인지 — 관리직은 기수 배정이 없어 착지 화면이 다르다 */
export function isFieldStaff(s: Session): boolean {
  return s.roleCode === "instructor" || s.roleCode === "evangelist";
}

/**
 * 로그인 직후 착지 화면 (ORG_CHART §6).
 * 관리직은 담당 기수가 없어 "내 기수" 화면이 비므로 전체현황으로 보낸다.
 * 편의 기능일 뿐 권한이 아니다 — 어느 화면이든 서버가 다시 검증한다(불변식 1).
 */
export function landingPath(s: Session): "/" | "/cohort" {
  return isFieldStaff(s) ? "/cohort" : "/";
}
