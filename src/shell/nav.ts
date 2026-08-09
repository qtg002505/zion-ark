import type { RoleCode, Session } from "../lib/types";
import {
  EVANGELIST_MAKEUP_FOLDERS,
  INSTRUCTOR_BATGARI_FOLDERS,
  INSTRUCTOR_OTHER_FOLDERS,
  LIBRARY_FOLDERS,
} from "../lib/types";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Star,
  BookText,
  ScrollText,
  HeartHandshake,
  Megaphone,
  Quote,
  BookOpenText,
  Newspaper,
  Gauge,
  Presentation,
  Library,
  Sprout,
  Church,
  Rss,
  Baby,
  Leaf,
  TreeDeciduous,
  BellRing,
  Layers,
  CalendarDays,
  MessagesSquare,
  FolderClosed,
  Shovel,
  ClipboardList,
  RefreshCw,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

/**
 * 내비 구조 — 정보구조 카테고리.
 *
 * **2026-08-08 카테고리 개편 지시문 v1 반영 — 7개 카테고리 + 홈.**
 * 종전 9개(우리 기수현황·수강생 관리·강사 도우미·전도사 도우미·자료실·공지·어록·말씀광장·
 * 천지일보)를 7개로 재편했다. 바뀐 것:
 *
 * - **전체 현황은 카테고리에서 빼고 「홈」으로 올렸다** — 기수 현황은 한 기수를 깊게 보는
 *   화면이고, 홈은 담당 범위 전체를 한눈에 보는 화면이라 역할이 다르다 (지시문 §1)
 * - 강사 도우미 → **강의 도우미** · 전도사 도우미 → **분반 · 보강 도우미** (이름 변경)
 * - **상담 도우미**(테마 12종)와 **사명자 심방 도우미**를 신설했다
 * - 외부 매체를 **자료실 안으로** 넣었다 (지시문 §2-6)
 *
 * **2026-08-09 리드 지시 — 공지 · 어록을 자료실 밖 독립 대주제로 되돌렸다.**
 * 자료실은 가르칠 때 찾아 쓰는 자료이고 공지·어록은 때가 되면 읽는 글이라 성격이 다르다.
 *
 * ⚠️ **폴더 목록은 여기(사이드바)에만 둔다.** 자료실 화면이 자체 폴더 패널을 갖고 있어
 * 같은 목록이 두 군데 뜨던 것을 2026-08-09에 없앴다 — 폴더를 늘릴 때 여기만 보면 된다.
 * - 영인지 · 성경기초상식 · 하나님에 대한 필요성을 자료실 → **분반 · 보강**으로 옮겼다.
 *   자료실 화면(`/library?section=external`)으로는 그대로 열리므로 "링크만 남긴다"는
 *   조건은 충족된다
 *
 * 폴더 이름은 `LIBRARY_FOLDERS`(`src/lib/types.ts`)에서 읽어 만든다 —
 * 여기에 다시 적으면 두 곳이 어긋난다.
 */

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  badge?: string;
  /** 이 역할만 접근 가능 (지정 없으면 로그인 전체 열람) */
  restrictTo?: RoleCode[];
}

/** 대주제 안의 중간 묶음 (예: 강의 도우미 › 초등·중등·고등) */
export interface NavSubGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export interface NavGroup {
  label: string;
  /** 대주제 아이콘 — 사이드바에서 그룹을 한눈에 구분한다 */
  icon: LucideIcon;
  /** 하위가 없는 단독 메뉴는 `to`만 둔다 (누르면 바로 이동) */
  to?: string;
  items?: NavItem[];
  subGroups?: NavSubGroup[];
}

/** 자료실 폴더로 가는 링크 — 폴더 이름이 곧 메뉴 이름이다 */
function folderItems(section: "instructor" | "external", folders: string[]): NavItem[] {
  return folders.map((f) => ({
    to: `/library?section=${section}&folder=${encodeURIComponent(f)}`,
    label: f,
    icon: FolderClosed,
  }));
}

const NAV_GROUPS: NavGroup[] = [
  /**
   * 홈 — 카테고리 7개 어디에도 넣지 않는다 (지시문 §1).
   * 로그인 직후 착지하는 자리이고, 담당 범위 전체를 한눈에 보는 요약이다.
   * ("/"는 역할별 착지 분기에 쓰므로 메뉴에서는 실제 경로를 가리킨다)
   */
  { label: "홈 · 전체 현황", icon: LayoutDashboard, to: "/overview" },

  /** 1. 기수 현황 — 한 기수를 깊게 파고드는 자리. 조직별 운영 영역 */
  {
    label: "기수 현황",
    icon: Gauge,
    items: [
      { to: "/cohort", label: "기수 현황", icon: GraduationCap },
      { to: "/plan", label: "기수 주간계획", icon: CalendarDays },
    ],
  },

  /**
   * 2. 강의 도우미 (종전 「강사 도우미」) — 전국 공통 교육 영역.
   * 지시문은 초·중·고 각 급 안에서 **강 선택 → 4항목**(시기 따른 관리 방향 ·
   * 진도에 따른 질문 · 무신앙 예상 질문 · 신앙인 예상 질문) 구조를 요구한다.
   * 4항목 화면은 4단계 작업이라 아직 없고, 지금은 기존 교안 화면으로 연결한다.
   */
  {
    label: "강의 도우미",
    icon: Presentation,
    subGroups: [
      {
        label: "밭갈이",
        icon: Shovel,
        items: folderItems("instructor", INSTRUCTOR_BATGARI_FOLDERS),
      },
      {
        label: "초등",
        icon: Baby,
        items: [
          { to: "/lessons", label: "초등 강의자료", icon: BookText },
          { to: "/library?section=instructor&tab=excellent_plan", label: "우수교안·지침·특강", icon: Star },
        ],
      },
      {
        label: "중등",
        icon: Leaf,
        items: [
          { to: "/lessons?course=middle", label: "중등 강의자료", icon: BookText, badge: "준비 중" },
          { to: "/library?section=instructor&tab=excellent_plan", label: "우수교안·지침·특강", icon: Star },
        ],
      },
      {
        label: "고등",
        icon: TreeDeciduous,
        items: [
          { to: "/lessons?course=high", label: "고등 강의자료", icon: BookText },
          { to: "/library?section=instructor&tab=excellent_plan", label: "우수교안·지침·특강", icon: Star },
        ],
      },
    ],
    items: [
      { to: "/compose", label: "강의 자료 모으기", icon: Layers },
      ...folderItems("instructor", INSTRUCTOR_OTHER_FOLDERS),
    ],
  },

  /**
   * 3. 분반 · 보강 도우미 (종전 「전도사 도우미」) — 전국 공통 교육 영역.
   * ⚠️ 여기서는 **보강 자료와 편성**을 다룬다. 같은 이름의 **상담법**은 5) 상담 도우미에
   * 둔다 (지시문 §2-3). 경계를 흐리면 같은 내용이 두 군데 쌓인다.
   */
  {
    label: "분반 · 보강 도우미",
    icon: Sprout,
    subGroups: [
      {
        label: "분반 자료",
        icon: ClipboardList,
        items: [
          { to: "/library?section=instructor&tab=class_material", label: "분반·보강 자료", icon: BookOpen },
        ],
      },
      {
        label: "보강 자료",
        icon: RefreshCw,
        items: folderItems("instructor", EVANGELIST_MAKEUP_FOLDERS),
      },
      {
        // 2026-08-08 자료실에서 이관 — 실제 열람 동선을 보강 쪽으로 모은다
        label: "보강 콘텐츠",
        icon: BookOpenText,
        items: folderItems("external", LIBRARY_FOLDERS.external),
      },
    ],
  },

  /**
   * 4. 수강생 관리 도우미 — 조직별 운영 영역(개인).
   * 1) 기수 현황이 집계라면 여기는 개인이다. 지시문 §2-4는 수강생 한 명 단위의
   * **관리 카드**를 요구한다 (기본정보·출결·단계 향상·메모·상태·상담 이력).
   * ⚠️ 성향 데이터는 여기, **성향별 상담법은 5)** 에 둔다 —
   * 4)는 "이 수강생이 어떤 사람인가", 5)는 "그런 사람을 어떻게 상담하는가".
   */
  {
    label: "수강생 관리 도우미",
    icon: Users,
    items: [
      { to: "/students", label: "수강생 목록", icon: Users },
      { to: "/signals", label: "관찰 필요", icon: BellRing },
      { to: "/enneagram", label: "성향 참고 (에니어그램)", icon: HeartHandshake },
    ],
  },

  /**
   * 5. 상담 도우미 — 전국 공통 + 사명자 참여형(UGC). 신설.
   * 테마 12종은 `/counseling` 허브에서 펼쳐 본다.
   */
  {
    label: "상담 도우미",
    icon: MessagesSquare,
    items: [
      { to: "/counseling", label: "테마별 상담법 (12종)", icon: MessagesSquare },
      { to: "/cases", label: "상담 사례 예시", icon: BookText },
    ],
  },

  /**
   * 6. 자료실 — 전국 공통 자료.
   * 2026-08-08 개편으로 공지 · 어록 · 외부 매체를 이 안으로 넣었다.
   * ⚠️ 여기 있는 자료도 **로그인해야 열린다.** 무세션 401 원칙에 예외를 만들지 않는다.
   */
  {
    label: "자료실",
    icon: BookOpen,
    subGroups: [
      {
        label: "신천지도서",
        icon: Library,
        items: [
          { to: "/series/revelation", label: "요한계시록의 실상", icon: ScrollText },
          { to: "/series/creation", label: "천지창조", icon: ScrollText },
          { to: "/series/acts", label: "예수그리스도의 행전", icon: ScrollText },
        ],
      },
      {
        /**
         * 외부 매체는 새 탭으로 바로 연다.
         * 사이트 안(iframe) 표시는 두 매체가 `X-Frame-Options`로 막아 두어 불가능하다 —
         * 백엔드 프록시가 생기면 그때 내부 표시로 바꾼다 (docs/HANDOFF.md 참고).
         */
        label: "외부 매체",
        icon: Rss,
        items: [
          { to: "https://www.wordsquare.org/bible-forest/bible", label: "말씀광장 · 온라인 성경", icon: Church, external: true },
          { to: "https://www.wordsquare.org/bible-forest/dictionary", label: "말씀광장 · 성경사전", icon: Church, external: true },
          { to: "https://www.newscj.com/", label: "천지일보 · 최근 이슈", icon: Newspaper, external: true },
          {
            to: "https://www.newscj.com/news/articleList.html?sc_sub_section_code=S2N53&sc_section_code=S1N7&view_type=sm",
            label: "천지일보 · 종교·개신교",
            icon: Newspaper,
            external: true,
          },
        ],
      },
    ],
    /*
      구획 전체를 보는 자리. **폴더 목록은 여기에 늘어놓지 않는다** — 폴더는 그 자료를 쓰는
      카테고리(강의 도우미 › 밭갈이 · 분반·보강 도우미 › 보강 자료·보강 콘텐츠)에 있다.
      여기에 또 두면 같은 목록이 사이드바 안에서 두 번 나온다.
    */
    items: [
      { to: "/library?section=instructor", label: "강사 도우미 자료실 (전체)", icon: BookOpen },
      { to: "/library?section=external", label: "외부 자료실 (전체)", icon: BookOpenText },
    ],
  },

  /**
   * 공지 · 어록 — **자료실 밖 독립 대주제** (2026-08-09 리드 지시).
   *
   * 2026-08-08 개편에서 자료실 안으로 넣었으나, 리드가 밖으로 빼라고 지시했다.
   * 자료실은 "가르칠 때 찾아 쓰는 자료"이고 공지·어록은 "때가 되면 읽는 글"이라 성격이
   * 다르다 — 2026-08-06 확정 구조에서도 각각 독립 대주제였다.
   * ⚠️ 저장 구조는 그대로다 — `workspace_entries`(kind: notice_hq · notice_tribe · quote)를
   * 계속 쓰고 새 테이블을 만들지 않는다 (지시문 §2-6).
   */
  {
    label: "공지 · 어록",
    icon: Megaphone,
    items: [
      { to: "/notices", label: "공지사항", icon: Megaphone },
      { to: "/quotes", label: "총회장님 어록", icon: Quote },
    ],
  },

  /**
   * 7. 사명자 심방 도우미 — 수강생이 아니라 **사명자 본인**이 대상이다. 전부 신설.
   * ⚠️ 사명자 본인의 심리 상태도 개인정보다 — 자가진단 결과를 서버에 저장하지 않는 것이
   * 기본 방침이다 (지시문 §2-7).
   */
  { label: "사명자 심방 도우미", icon: HeartPulse, to: "/care" },
];

/** 대주제가 품은 모든 항목 (직속 + 하위 묶음) */
export function groupItems(group: NavGroup): NavItem[] {
  return [...(group.items ?? []), ...(group.subGroups ?? []).flatMap((s) => s.items)];
}

/** 권한 필터 — 열람은 로그인 전체가 기본, restrictTo만 제한 */
export function visibleNavGroups(session: Session): NavGroup[] {
  const allow = (i: NavItem) => !i.restrictTo || i.restrictTo.includes(session.roleCode);
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items?.filter(allow),
    subGroups: g.subGroups
      ?.map((s) => ({ ...s, items: s.items.filter(allow) }))
      .filter((s) => s.items.length > 0),
  })).filter((g) => g.to || groupItems(g).length > 0);
}
