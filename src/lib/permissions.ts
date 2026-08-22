import type { BoardPost, CounselingTip, RoleCode, Session, WorkspaceKind } from "./types";

/**
 * 권한 판정 — 옵시디언 금고 「권한-결정사항」 확정값 (2026-08-05 리드).
 * 실제 운영에서는 서버가 memberships 대조로 판정한다. 이 모듈은 그 계약의
 * 프런트엔드 미러이며, UI 노출 제어에만 쓴다 (백엔드 연동 시 서버 판정이 최종).
 */

/** 자료실 등록·수정: content_admin · headquarters_admin (1차 기본값) */
export function canWriteLibrary(s: Session): boolean {
  return s.roleCode === "content_admin" || s.roleCode === "headquarters_admin";
}

/**
 * 교분기 **지파 보충본** 등록: 지파 신학부장 (2026-08-14 FB-06 · Q-03 리드 확정).
 * 공통(표준본)은 종전대로 `canWriteLibrary`(총회·콘텐츠 관리자)가 맡고, 지파 보충은
 * 그 지파 `tribe_admin`이 맡는다 — 지파 공지(`notice_tribe`)와 같은 권한 패턴이다.
 * 등록되는 자료의 `scope`는 화면이 아니라 **역할이 정한다**: tribe_admin이 올리면
 * 무조건 `tribe:{자기 지파}`다. 서버 연동 시 같은 판정을 서버가 다시 한다.
 */
export function canWriteGyobungiSupplement(s: Session): boolean {
  return s.roleCode === "tribe_admin";
}

/**
 * 우수 교안 지정·해제: **지파 신학부장(`tribe_admin`)** (2026-08-15 리드 지시).
 *
 * ⚠️ **2026-08-05 확정값(「headquarters_admin만」)을 이 지시가 대체한다.** 승인 워크플로우가
 * 없는 것은 그대로다 — 누르면 곧바로 지정된다.
 * ⚠️ 이 변경으로 **「지파 공유 승격」(`tribeEndorsements`)과 주체가 겹친다** — 둘 다 지파
 * 신학부장이 누른다. 하나로 합칠지는 리드 확인 대기이고, 그때까지 두 축을 그대로 둔다
 * (합치는 것은 저장된 값이 걸린 일이라 임의로 하지 않는다 — 불변식 10).
 */
export function canToggleFeatured(s: Session): boolean {
  return s.roleCode === "tribe_admin";
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
 * 건의·의견 게시판 — 비밀글 열람 (2026-08-14 피드백 FB-09 · 2026-08-15 범위 확대).
 *
 * 보는 사람은 셋이다 — **작성자 본인 · 총회 관리자 · 작성자와 같은 지파의 지파 신학부장.**
 * (2026-08-15 리드 확정: 종전 「총회 신학부장만」에서 넓혔다. 지파 단위 운영 글에
 * 총회가 답할 때까지 그 지파가 손을 못 대던 것을 푼 것이다.)
 *
 * ⚠️ **지파 관리자는 「같은 지파」일 때만이다** — `tribe_admin`이라고 다 보이면 남의 지파
 * 비밀글이 열린다. 작성자 지파(`createdByTribe`)가 **없는 옛 글은 닫는다**: 모호할 때
 * 여는 쪽으로 기울면 비밀글의 뜻이 사라진다.
 *
 * 지시문의 수신자 「개발자」는 역할 코드가 아직 없다 — 데이터 계약(역할 코드)은 임의로
 * 늘리지 않으므로(CLAUDE.md), 실연동에서 developer 역할이 생기면 아래 목록에 더한다.
 * 시범 로그인은 이름이 곧 계정이라 이름+역할로 대조한다(상담법 수정 권한과 같은 방식).
 * ⚠️ **실연동 시 서버가 응답에서 거른다** — 이 함수는 UI 편의이고, 타인 비밀글 API
 * 직접 호출은 403이어야 한다 (지시문 핵심 테스트). **지파 대조도 서버가 다시 한다** —
 * 세션의 지파를 브라우저에서 고칠 수 있기 때문이다(시범 로그인은 인증이 아니다).
 */
export const SECRET_POST_READ_ROLES: RoleCode[] = ["headquarters_admin", "content_admin"];

export function canReadSecretPost(s: Session, post: BoardPost): boolean {
  if (!post.isSecret) return true;
  // 총회 관리자 — 전체를 본다
  if (SECRET_POST_READ_ROLES.includes(s.roleCode)) return true;
  // 해당 지파 신학부장 — 자기 지파 글만
  if (s.roleCode === "tribe_admin" && post.createdByTribe != null && post.createdByTribe === s.tribe) {
    return true;
  }
  // 작성자 본인
  return post.createdBy === s.name && post.createdByRole === s.roleCode;
}

/** 게시판 답글 — 수신 역할(총회 신학부장)의 1단 답글만 */
export function canReplyBoard(s: Session): boolean {
  return s.roleCode === "headquarters_admin";
}

/**
 * 12지파 선교센터 열람 (2026-08-14 피드백 FB-10 — P0 권한).
 *
 * **지파 신학부장(tribe_admin) 이상만** 본다 — 강사 계정에 센터 위치·기수·진도 전체가
 * 보이던 것이 결함으로 접수됐다. 조직 범위 기준으로 지파(tribe)·총회(national) 스코프만
 * 허용한다. `church_admin`(교회)·강사·전도사(기수)는 지파보다 좁으므로 제외.
 * ⚠️ national 스코프의 `content_admin`·`security_auditor`를 포함한 것은 「지파 이상 =
 * 조직 범위가 지파보다 넓은 역할 전부」로 읽은 판단이다 — 리드가 달리 정하면 이 목록만 고친다.
 *
 * 서버 연동 시 **같은 판정을 서버가 memberships로 다시 한다**(불변식 1). 여기(메뉴 숨김·
 * 라우트 가드)는 UI 편의일 뿐이고, API 403이 최종 방어선이다 — 메뉴만 숨기면 URL 직접
 * 접근에 뚫린다.
 */
export const MISSION_CENTER_VIEW_ROLES: RoleCode[] = [
  "tribe_admin",
  "headquarters_admin",
  "content_admin",
  "security_auditor",
];

export function canViewMissionCenters(s: Session): boolean {
  return MISSION_CENTER_VIEW_ROLES.includes(s.roleCode);
}

/**
 * 사이트 이용 현황 열람 (2026-08-15 리드 지시 — 「아크 사이트를 많이 쓰는지 확인」).
 *
 * **지파 신학부장 이상**이다 — 12지파 선교센터와 같은 범위 판단(조직 범위가 지파보다 넓은
 * 역할 전부)이지만 **목록을 따로 둔다**: 한쪽 기준이 바뀌어도 다른 쪽이 딸려 움직이면 안 된다.
 *
 * ⚠️ 이 화면은 **집계만** 보여 준다(불변식 2) — 누가 언제 들어왔는지는 안 보인다.
 * 사람 단위 접속 기록은 감사 로그(`studentAccessLogs`)의 영역이고, 여기는 「몇 명」뿐이다.
 */
export const SITE_USAGE_VIEW_ROLES: RoleCode[] = [
  "tribe_admin",
  "headquarters_admin",
  "content_admin",
  "security_auditor",
];

export function canViewSiteUsage(s: Session): boolean {
  return SITE_USAGE_VIEW_ROLES.includes(s.roleCode);
}

/**
 * 역할에 맞는 다음 화면 (ORG_CHART §6).
 * 편의 기능일 뿐 권한이 아니다 — 어느 화면이든 서버가 다시 검증한다(불변식 1).
 *
 * ⚠️ 2026-08-13부터 **로그인 직후 자동 이동에는 쓰지 않는다.** 메인 페이지(`/`)가
 * 생기면서 로그인하면 늘 메인으로 온다 — 이 값은 메인 화면의 「내 기수부터 보기」
 * 안내가 어디를 가리킬지 정하는 데만 쓴다.
 * ⚠️ 전체 현황(/overview)이 2026-08-22에 폐지되면서 **관리직도 기수 요약(/cohort)으로
 * 간다** — 분류 대시보드·요약 수치가 그리로 옮겨 갔다. 세션 인자는 착지가 다시 갈라질
 * 때를 위해 남겨 둔다.
 */
export function landingPath(_s: Session): "/cohort" {
  return "/cohort";
}
