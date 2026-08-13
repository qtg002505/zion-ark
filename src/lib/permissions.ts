import type { CounselingTip, Session, WorkspaceKind } from "./types";

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

/** 그 기수의 사명자인지 — 세션의 담당 기수와 대조한다 */
export function cohortKeyOf(s: Session): string {
  return `${s.tribe}|${s.church}|${s.cohort}`;
}

/**
 * 기수 주간계획·주차 사유 기록을 고칠 수 있는지 (2026-08-06 확정).
 * **해당 기수의 강사·전도사만** 고친다 — 로그인 전체에게 열지 않는다.
 * 열람은 담당 범위 안에서 누구나 가능하고, 수정만 제한한다.
 *
 * 서버 연동 시에도 같은 규칙을 서버가 `memberships`로 다시 판정한다(불변식 1).
 * 범위 밖에서 고치려 하면 403이다.
 */
export function canEditCohortRecord(s: Session, cohortKey: string): boolean {
  return isFieldStaff(s) && cohortKeyOf(s) === cohortKey;
}

/**
 * 상담 사례를 올릴 수 있는지 — 현장에서 겪은 사람이 남기는 자료다.
 * 관리직도 올릴 수 있게 두되, **익명화 기준(지파·교회·센터까지)** 은 화면에서 강제한다.
 */
export function canWriteCounselCase(s: Session): boolean {
  return s.roleCode !== "security_auditor";
}

/**
 * 상담법 글 등록 (2026-08-08 지시문 §2-5 확정) — **사명자 전체 개방.**
 * 지시문의 "사명자"는 어휘 확정값 그대로 강사+전도사다. 관리직·콘텐츠팀은 등록 주체가
 * 아니라 검수 주체다 (숨김·신고 처리 권한을 따로 갖는다).
 */
export function canWriteCounselingTip(s: Session): boolean {
  return isFieldStaff(s);
}

/**
 * 상담법 수정·삭제는 **본인 글만** (지시문 §2-5 확정).
 * 시범 로그인은 이름이 곧 계정이므로 이름+역할로 대조한다. 실연동 시 서버가
 * user_id로 다시 판정한다 — 타인 글 수정·삭제는 403 (지시문 §11 테스트 항목).
 */
export function canEditCounselingTip(s: Session, tip: CounselingTip): boolean {
  return tip.createdBy === s.name && tip.createdByRole === s.roleCode;
}

/**
 * 상담법 숨김·신고 처리: `content_admin` + `headquarters_admin` (지시문 §2-5 검수 정책).
 * 숨김은 삭제가 아니라 hiddenAt 기입(소프트 삭제)이다.
 */
export function canModerateCounselingTips(s: Session): boolean {
  return s.roleCode === "content_admin" || s.roleCode === "headquarters_admin";
}

/**
 * 역할에 맞는 다음 화면 (ORG_CHART §6).
 * 관리직은 담당 기수가 없어 "내 기수" 화면이 비므로 전체현황으로 보낸다.
 * 편의 기능일 뿐 권한이 아니다 — 어느 화면이든 서버가 다시 검증한다(불변식 1).
 *
 * ⚠️ 2026-08-13부터 **로그인 직후 자동 이동에는 쓰지 않는다.** 메인 페이지(`/`)가
 * 생기면서 로그인하면 늘 메인으로 온다 — 이 값은 메인 화면의 「내 기수부터 보기」
 * 안내가 어디를 가리킬지 정하는 데만 쓴다.
 */
export function landingPath(s: Session): "/overview" | "/cohort" {
  return isFieldStaff(s) ? "/cohort" : "/overview";
}
