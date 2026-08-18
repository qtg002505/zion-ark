import { describe, expect, it } from "vitest";
import type { BoardPost, RoleCode, Session } from "./types";
import {
  canEditCohortRecord,
  canReadSecretPost,
  canReplyBoard,
  canToggleFeatured,
  canViewMissionCenters,
  canViewSiteUsage,
  isFieldStaff,
} from "./permissions";

/**
 * 권한 판정 — **틀리면 남의 것이 보이는 자리**다.
 *
 * 이 함수들은 화면 편의이고 실연동에서는 서버가 같은 판정을 다시 한다(불변식 1).
 * 그래도 여기서 먼저 막지 못하면 시범 단계에서 이미 새 나간다. 특히 비밀글의 지파 대조는
 * 「모호하면 닫는다」는 결정이 걸려 있어 조건 하나만 뒤집혀도 뜻이 사라진다.
 */

function session(over: Partial<Session> = {}): Session {
  return {
    name: "김사명",
    roleCode: "instructor",
    scopeType: "cohort",
    tribe: "요한",
    church: "과천교회",
    cohort: "113기",
    division: null,
    loggedInAt: "2026-08-18T09:00:00+09:00",
    ...over,
  };
}

function post(over: Partial<BoardPost> = {}): BoardPost {
  return {
    id: "b1",
    title: "건의",
    body: "본문",
    isSecret: true,
    createdBy: "김사명",
    createdByRole: "instructor",
    createdAt: "2026-08-18T09:00:00+09:00",
    ...over,
  };
}

describe("기수 기록 수정 — 해당 기수의 강사·전도사만", () => {
  const key = "요한|과천교회|113기";

  it("담당 기수의 강사·전도사는 고친다", () => {
    expect(canEditCohortRecord(session({ roleCode: "instructor" }), key)).toBe(true);
    expect(canEditCohortRecord(session({ roleCode: "evangelist" }), key)).toBe(true);
  });

  it("다른 기수면 같은 역할이어도 못 고친다", () => {
    expect(canEditCohortRecord(session({ cohort: "114기" }), key)).toBe(false);
    expect(canEditCohortRecord(session({ church: "안양교회" }), key)).toBe(false);
    expect(canEditCohortRecord(session({ tribe: "맛디아" }), key)).toBe(false);
  });

  it("관리직은 담당 기수가 없어 못 고친다 — 열람은 되지만 수정은 아니다", () => {
    for (const role of ["headquarters_admin", "tribe_admin", "church_admin", "content_admin"] as RoleCode[]) {
      expect(canEditCohortRecord(session({ roleCode: role }), key)).toBe(false);
    }
  });

  it("실무직 판정은 강사·전도사 둘뿐", () => {
    expect(isFieldStaff(session({ roleCode: "instructor" }))).toBe(true);
    expect(isFieldStaff(session({ roleCode: "evangelist" }))).toBe(true);
    expect(isFieldStaff(session({ roleCode: "tribe_admin" }))).toBe(false);
  });
});

describe("비밀글 열람 — 셋만 본다", () => {
  it("총회 관리자는 지파와 무관하게 본다", () => {
    expect(canReadSecretPost(session({ roleCode: "headquarters_admin", name: "남" }), post())).toBe(true);
    expect(canReadSecretPost(session({ roleCode: "content_admin", name: "남" }), post())).toBe(true);
  });

  it("같은 지파의 지파 신학부장은 본다", () => {
    const s = session({ roleCode: "tribe_admin", tribe: "요한", name: "남" });
    expect(canReadSecretPost(s, post({ createdByTribe: "요한" }))).toBe(true);
  });

  it("다른 지파의 지파 신학부장은 못 본다 — tribe_admin이라고 다 열리면 안 된다", () => {
    const s = session({ roleCode: "tribe_admin", tribe: "맛디아", name: "남" });
    expect(canReadSecretPost(s, post({ createdByTribe: "요한" }))).toBe(false);
  });

  it("작성자 지파가 없는 옛 글은 지파 신학부장에게 안 보인다 — 모호하면 닫는다", () => {
    const s = session({ roleCode: "tribe_admin", tribe: "요한", name: "남" });
    expect(canReadSecretPost(s, post({ createdByTribe: undefined }))).toBe(false);
  });

  it("작성자 본인은 본다 — 이름과 역할이 둘 다 맞아야 한다", () => {
    const mine = post({ createdBy: "김사명", createdByRole: "instructor" });
    expect(canReadSecretPost(session(), mine)).toBe(true);
    // 이름만 같고 역할이 다르면 남이다
    expect(canReadSecretPost(session({ roleCode: "evangelist" }), mine)).toBe(false);
  });

  it("남의 비밀글은 강사·전도사에게 안 보인다", () => {
    const other = post({ createdBy: "박전도", createdByRole: "evangelist" });
    expect(canReadSecretPost(session(), other)).toBe(false);
  });

  it("비밀글이 아니면 누구나 본다", () => {
    expect(canReadSecretPost(session({ name: "남" }), post({ isSecret: false }))).toBe(true);
  });
});

describe("게시판 답글 — 열람을 넓혔어도 답은 총회 신학부장만", () => {
  it("총회 신학부장만 단다", () => {
    expect(canReplyBoard(session({ roleCode: "headquarters_admin" }))).toBe(true);
  });

  it("지파 신학부장은 자기 지파 글을 봐도 답은 못 단다 (2026-08-15 확정)", () => {
    expect(canReplyBoard(session({ roleCode: "tribe_admin" }))).toBe(false);
    expect(canReplyBoard(session({ roleCode: "content_admin" }))).toBe(false);
  });
});

describe("우수 교안 지정 — 지파 신학부장 (2026-08-15 변경)", () => {
  it("지파 신학부장이 지정한다", () => {
    expect(canToggleFeatured(session({ roleCode: "tribe_admin" }))).toBe(true);
  });

  it("총회 신학부장은 이제 지정 주체가 아니다 — 종전 규칙을 대체했다", () => {
    expect(canToggleFeatured(session({ roleCode: "headquarters_admin" }))).toBe(false);
    expect(canToggleFeatured(session({ roleCode: "instructor" }))).toBe(false);
  });
});

describe("지파 신학부장 이상 전용 화면", () => {
  const allowed: RoleCode[] = ["tribe_admin", "headquarters_admin", "content_admin", "security_auditor"];
  const denied: RoleCode[] = ["instructor", "evangelist", "church_admin"];

  it("12지파 선교센터", () => {
    for (const r of allowed) expect(canViewMissionCenters(session({ roleCode: r }))).toBe(true);
    for (const r of denied) expect(canViewMissionCenters(session({ roleCode: r }))).toBe(false);
  });

  it("사이트 이용 현황", () => {
    for (const r of allowed) expect(canViewSiteUsage(session({ roleCode: r }))).toBe(true);
    for (const r of denied) expect(canViewSiteUsage(session({ roleCode: r }))).toBe(false);
  });
});
