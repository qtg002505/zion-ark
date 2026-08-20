import type { RoleCode, Session } from "../lib/types";
import {
  ARCHIVE_FOLDERS,
  EVANGELIST_CONTENT_FOLDERS,
  EVANGELIST_MAKEUP_FOLDERS,
  INSTRUCTOR_BATGARI_FOLDERS,
  INSTRUCTOR_OTHER_FOLDERS,
  SCJ_OPEN_FOLDERS,
  folderLabel,
} from "../lib/types";
import { MISSION_CENTER_VIEW_ROLES, SITE_USAGE_VIEW_ROLES } from "../lib/permissions";
import { COHORT_TABS } from "../pages/CohortStatus";
import {
  Home,
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
  Sparkles,
  Baby,
  Leaf,
  TreeDeciduous,
  Layers,
  CalendarDays,
  MessagesSquare,
  FolderClosed,
  Shovel,
  ClipboardList,
  RefreshCw,
  MapPin,
  MessageSquarePlus,
  Activity,
  PenLine,
  Scale,
  Clapperboard,
  DoorOpen,
  Video,
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
 * **2026-08-13 리드 지시 — 셋을 고쳤다.**
 * - **자료실 구획을 없앴다** (강사 도우미 자료실 · 외부 자료실). 「외부 자료실」은 없던
 *   개념이고, 외부 매체는 자료에 붙는 참고 링크였다. 외부 매체 묶음은 **말씀광장 ·
 *   천지일보**로 갈랐고 자료실 안에 그대로 둔다. 아카이브에서 「지파별 취합 도서」를 뺐다
 * - **밭갈이 각 파트와 예배설교가 강의 도우미 안에서 자료를 연다** (`/teaching`) —
 *   초·중·고처럼 제 카테고리 안에서 끝난다
 * - **수강생 관리 도우미에 「수강생 성향 분석」**을 더했다 (`/tendency`)
 *
 * ⚠️ **폴더 목록은 여기(사이드바)에만 둔다.** 자료실 화면이 자체 폴더 패널을 갖고 있어
 * 같은 목록이 두 군데 뜨던 것을 2026-08-09에 없앴다 — 폴더를 늘릴 때 여기만 보면 된다.
 * - 영인지 · 성경기초상식 · 하나님에 대한 필요성을 자료실 → **분반 · 보강**으로 옮겼다.
 *   자료실 화면(`/library?folder=…`)으로는 그대로 열리므로 "링크만 남긴다"는 조건은 충족된다
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
  /**
   * 대주제 전체를 이 역할만 보게 제한한다 (2026-08-14 FB-10 — 12지파 선교센터).
   * ⚠️ 메뉴 숨김은 UI 편의일 뿐이다 — 같은 역할 목록으로 App.tsx의 라우트 가드가
   * URL 직접 접근을 막고, 서버 연동 시 API 403이 최종이다. 세 겹이 한 목록을 쓴다.
   */
  restrictTo?: RoleCode[];
  /**
   * 이 대주제 **앞에 구분선**을 긋는다 (2026-08-18 리드 지시).
   * 「우리 기수 것」과 「모두에게 공통인 것」을 눈으로 가르기 위한 표시다 —
   * 권한이나 동작과는 무관하고 사이드바가 선 하나를 더 그릴 뿐이다.
   */
  dividerBefore?: boolean;
}

/**
 * 폴더로 가는 링크 — 폴더 이름이 곧 메뉴 이름이다.
 *
 * `basePath`로 **어느 화면에서 열지**를 정한다 (2026-08-13). 밭갈이·예배설교는 강의 도우미
 * 안에서(`/teaching`), 그 밖의 폴더는 자료실에서(`/library`) 연다. 종전에는 구획
 * (`?section=`)을 함께 넘겼으나 구획이 폐지되면서 폴더 이름 하나로 충분해졌다.
 */
function folderItems(basePath: string, folders: string[]): NavItem[] {
  return folders.map((f) => ({
    to: `${basePath}?folder=${encodeURIComponent(f)}`,
    label: f,
    icon: FolderClosed,
  }));
}

const NAV_GROUPS: NavGroup[] = [
  /**
   * 홈(메인) — **카테고리를 펼쳐 보는 첫 화면** (2026-08-13 리드 지시로 분리).
   * 종전에는 「홈 · 전체 현황」 하나였는데, 리드가 「홈페이지 노릇을 하는 메인을 따로」
   * 달라고 해서 갈랐다. `/`가 메인, `/overview`가 점검자용 요약이다.
   * 둘 다 카테고리 어디에도 넣지 않는다 (지시문 §1).
   */
  { label: "홈", icon: Home, to: "/" },
  { label: "전체 현황", icon: LayoutDashboard, to: "/overview" },

  /**
   * 1. 기수 현황 — 한 기수를 깊게 파고드는 자리. 조직별 운영 영역.
   *
   * **화면의 다섯 탭이 사이드바에서도 펼쳐진다** (2026-08-15 리드 지시 —
   * 「왼쪽 대카테고리를 보는 곳에서 펼쳐지게, 우측 큰 창에서는 지난번처럼 가로 열로」).
   * ⚠️ 이름·순서는 `CohortStatus`의 `COHORT_TABS`가 정본이다 — 여기서 읽어 만든다.
   * 자료실 폴더를 `LIBRARY_FOLDERS` 한 곳에서 읽는 것과 같은 원칙이다(두 곳에 적지 않는다).
   */
  {
    label: "기수 현황",
    icon: Gauge,
    subGroups: [
      {
        label: "기수 현황",
        icon: GraduationCap,
        items: COHORT_TABS.map((t) => ({
          to: t.id === "summary" ? "/cohort" : `/cohort?tab=${t.id}`,
          label: t.label,
          icon: GraduationCap,
        })),
      },
    ],
  },

  /**
   * 1-2. 월간·주간 계획 — **독립 대주제** (2026-08-18 리드 지시).
   * 종전에는 기수 현황의 직속 항목이었다. 우리 기수의 달력을 매일 여는 자리라
   * 대주제로 올렸다 (경로·화면은 그대로다).
   */
  { label: "월간·주간 계획", icon: CalendarDays, to: "/plan" },

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
    /*
      2026-08-10 종전 「수강생 목록」(`/students`)을 「수강생 현황」으로 **병합**했다
      (리드 지시). 목록에 있던 수강 상태 필터·출석 회차·최근 출석일·상태 배지가 현황 표로
      들어갔고, `/students`는 현황으로 넘긴다(북마크가 죽지 않게).
      개인 상세(`/students/:key`)는 목록에서 눌러 들어가는 화면이라 메뉴에 두지 않는다.
    */
    /*
      2026-08-13 리드 지시로 「관찰 필요」(`/signals`)를 없앴다. 출결 신호 계산
      (`lib/attendance-signals.ts`)은 **남는다** — 등급 판정과 수강생 상세의 「주의 포인트」가
      그 값을 쓰기 때문이다. 화면만 걷어낸 것이다.
    */
    items: [
      /* 2026-08-15 리드 지시 — 「수강생 현황」에서 이름을 바꿨다 (경로 불변) */
      /*
        2026-08-18 리드 지시로 **「수강생 현황」으로 되돌렸다** (2026-08-15에 「AI 성장 추천」으로
        바꿨던 것). AI 분석은 그 화면 **안의 탭**으로 들어갔다 — 명단을 보는 일과 AI 추천을
        보는 일이 다른 일이라 이름도 갈렸다.
      */
      { to: "/students-dashboard", label: "수강생 현황", icon: Users },
      { to: "/students-dashboard?view=ai", label: "AI 성장 추천", icon: Sparkles },
      /*
        수강생 성향 분석 (2026-08-13 신설, 같은 날 개편) — 수강생을 고르면 기록된 에니어그램
        유형의 원문(성장과정·단계향상·관리팁·보강 성구)을 그대로 보여 준다.
        ⚠️ 종전에는 관찰문을 적어 규칙 엔진이 조언을 만들고 외부 AI 프롬프트로 잇는
        구조였다 — 쓰는 곳이 여기뿐이라 그 구조(`advice-engine.ts` 등)째 걷어냈다.
      */
      /*
        ⚠️ 「성향 참고 (에니어그램)」은 2026-08-18 리드 지시로 **상담 도우미로 내렸다.**
        여기는 「이 수강생이 어떤 사람인가」를 보는 자리이고, 유형별 가이드 원문은
        「그런 사람을 어떻게 상담하는가」라 상담 도우미 쪽이 맞는다.
        ⚠️ `/tendency`(수강생 성향 분석)는 그대로 남는다 — 그쪽은 **사람을 골라** 보는 화면이다.
      */
      { to: "/tendency", label: "수강생 성향 분석", icon: Sparkles },
    ],
  },

  /**
   * 2. 강의 도우미 (종전 「강사 도우미」) — 전국 공통 교육 영역.
   * 지시문은 초·중·고 각 급 안에서 **강 선택 → 4항목**(시기 따른 관리 방향 ·
   * 진도에 따른 질문 · 무신앙 예상 질문 · 신앙인 예상 질문) 구조를 요구한다.
   * 4항목 화면은 4단계 작업이라 아직 없고, 지금은 기존 교안 화면으로 연결한다.
   *
   * **2026-08-13 리드 지시 — 밭갈이 각 파트와 예배설교가 여기 안에서 자료실 노릇을 한다.**
   * 종전에는 파트를 누르면 자료실(`/library`)로 나가 초·중·고와 동선이 어긋났다.
   * 이제 `/teaching?folder=…`(`TeachingLibrary`)이 강의 도우미 안에서 자료를 연다.
   */
  {
    label: "강의 도우미",
    icon: Presentation,
    /*
      ⚠️ **여기서부터 「모두에게 공통인 것」이다** (2026-08-18 리드 지시).
      위는 우리 기수에 매인 것(기수 현황 · 월간·주간 계획 · 수강생 관리)이고,
      아래는 전국이 같은 것을 보는 자리(교안 · 보강 자료 · 상담법 · 자료실 · 공지)다.
      사이드바가 이 표시를 보고 선 하나를 긋는다.
    */
    dividerBefore: true,
    subGroups: [
      {
        label: "밭갈이",
        icon: Shovel,
        items: folderItems("/teaching", INSTRUCTOR_BATGARI_FOLDERS),
      },
      /*
        2026-08-14 피드백 FB-05 — 표기를 「우수 교안·특강」으로 바꿨다('지침' 제거).
        `level` 파라미터가 붙어 **그 단계 자료만** 나온다 — 종전에는 어느 단계에서
        들어가도 같은 목록이었다. FB-06 — 각 단계에 「교분기」 탭을 더했다(추가 확정분).
      */
      {
        label: "초등",
        icon: Baby,
        items: [
          { to: "/lessons", label: "초등 강의자료", icon: BookText },
          { to: `/teaching?tab=excellent_plan&level=${encodeURIComponent("초등")}`, label: "우수 교안·특강", icon: Star },
          /* 우수 판서 (2026-08-15 리드 지시로 신설) — 잘 쓴 판서를 모으는 자리 */
          { to: `/teaching?folder=${encodeURIComponent("우수 판서 초등")}`, label: "우수 판서", icon: PenLine },
          /*
            ⚠️ folder 값은 encodeURIComponent — 활성 판정이 location.search(인코딩된 값)와 견주기 때문.
            ⚠️ **저장값은 「교분기 초등」 그대로이고 표기만 「흐름교육」이다** (2026-08-15) —
            폴더 값을 바꾸면 이미 저장된 자료가 폴더에서 빠진다(불변식 10 · `folderLabel`).
          */
          { to: `/teaching?folder=${encodeURIComponent("교분기 초등")}`, label: folderLabel("교분기 초등").replace(" 초등", ""), icon: BookOpenText },
        ],
      },
      {
        label: "중등",
        icon: Leaf,
        items: [
          { to: "/lessons?course=middle", label: "중등 강의자료", icon: BookText, badge: "준비 중" },
          { to: `/teaching?tab=excellent_plan&level=${encodeURIComponent("중등")}`, label: "우수 교안·특강", icon: Star },
          { to: `/teaching?folder=${encodeURIComponent("우수 판서 중등")}`, label: "우수 판서", icon: PenLine },
          { to: `/teaching?folder=${encodeURIComponent("교분기 중등")}`, label: folderLabel("교분기 중등").replace(" 중등", ""), icon: BookOpenText },
        ],
      },
      {
        label: "고등",
        icon: TreeDeciduous,
        items: [
          { to: "/lessons?course=high", label: "고등 강의자료", icon: BookText },
          { to: `/teaching?tab=excellent_plan&level=${encodeURIComponent("고등")}`, label: "우수 교안·특강", icon: Star },
          { to: `/teaching?folder=${encodeURIComponent("우수 판서 고등")}`, label: "우수 판서", icon: PenLine },
          { to: `/teaching?folder=${encodeURIComponent("교분기 고등")}`, label: folderLabel("교분기 고등").replace(" 고등", ""), icon: BookOpenText },
        ],
      },
      {
        /** 예배설교도 제 파트 안에서 바로 자료를 연다 (2026-08-13) */
        label: "예배설교",
        icon: Church,
        items: folderItems("/teaching", INSTRUCTOR_OTHER_FOLDERS),
      },
      {
        /**
         * 신천지 오픈 (2026-08-18 리드 지시) — 강의안 · 오픈 자료 · 상담 가이드 셋.
         * ⚠️ 세 폴더 모두 **원문 대기**다. 자리만 있고 아직 비어 있다.
         */
        label: "신천지 오픈",
        icon: DoorOpen,
        items: folderItems("/teaching", SCJ_OPEN_FOLDERS).map((it) => ({
          ...it,
          // 사이드바에서는 「신천지 오픈」 묶음 안이라 접두어를 떼고 낸다
          label: it.label.replace(/^신천지 오픈\s*/, ""),
        })),
      },
    ],
    /*
      직속 항목은 보조 도구라 하위 묶음 뒤에 놓인다.
      ⚠️ **「강의 녹취 정리」(`/digest`)는 2026-08-15 리드 지시로 없앴다.** 경로는 리다이렉트로
      남긴다(북마크가 죽지 않게) — 되살릴 때는 git 이력에서 `pages/LectureDigest.tsx`를 꺼낸다.

      반증자료 · 교리비교 영상 · 우수 강의자 영상은 2026-08-18에 더했다 —
      단계(초·중·고)에 매이지 않고 강의 전반에 걸쳐 쓰는 자료라 직속에 둔다. **원문 대기**다.
    */
    items: [
      { to: `/teaching?folder=${encodeURIComponent("반증자료")}`, label: "반증자료", icon: Scale },
      { to: `/teaching?folder=${encodeURIComponent("교리비교 영상")}`, label: "교리비교 영상", icon: Video },
      {
        to: `/teaching?folder=${encodeURIComponent("우수 강의자 영상")}`,
        label: "우수 강의자 영상",
        icon: Clapperboard,
      },
      { to: "/compose", label: "강의 자료 모으기", icon: Layers },
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
    /*
      ⚠️ **자료를 `/makeup`에서 연다** (2026-08-18 — 종전에는 `/library`로 나갔다).
      강의 도우미가 2026-08-13에 안에서 열게 된 것과 같은 이유다: 같은 성격의 자료인데
      한쪽만 자료실로 나가면 동선이 어긋난다. 자료실에도 그대로 남아 있다(전체 보기 겸용).
    */
    subGroups: [
      {
        label: "분반 자료",
        icon: ClipboardList,
        items: [{ to: "/makeup?tab=class_material", label: "분반·보강 자료", icon: BookOpen }],
      },
      {
        label: "보강 자료",
        icon: RefreshCw,
        items: folderItems("/makeup", EVANGELIST_MAKEUP_FOLDERS),
      },
      {
        // 2026-08-08 자료실에서 이관 — 실제 열람 동선을 보강 쪽으로 모은다.
        // 2026-08-10 자료실이 아카이브 위주로 축소되면서 이관 3종만 여기 남는다
        label: "보강 콘텐츠",
        icon: BookOpenText,
        items: folderItems("/makeup", EVANGELIST_CONTENT_FOLDERS),
      },
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
      /* 2026-08-18 리드 지시로 수강생 관리에서 내려왔다 — 유형별 가이드는 상담 자료다 */
      { to: "/enneagram", label: "성향 참고 (에니어그램)", icon: HeartHandshake },
    ],
  },

  /**
   * 6. 자료실 — 전국 공통 자료.
   *
   * **2026-08-13 리드 지시 — 구획(강사 도우미 자료실 · 외부 자료실)을 없앴다.**
   * 「외부 자료실」이라는 것은 애초에 없었다. 외부 매체(비메오·위플)는 **자료에 붙는 참고
   * 링크**를 뜻한 것이지 보관 구획이 아니다. 그래서 구획을 걷어내고 폴더 한 줄기로 폈다.
   * 외부 매체 묶음도 **말씀광장 · 천지일보**로 갈랐다 — 둘은 성격이 다른 매체다.
   *
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
         * 아카이브 (2026-08-10 리드 지시 · 2026-08-13 「지파별 취합 도서」를 뺐다) —
         * 자료실은 대용량 장기 보관 위주다. 실무 교육 자료는 강의·분반보강 도우미가 가져갔다.
         * **여기서 내려받아 확인하는 자료**이며, 파일 원본은 R2 대기 — 지금은 폴더와 링크만.
         */
        label: "아카이브",
        icon: FolderClosed,
        items: folderItems("/library", ARCHIVE_FOLDERS),
      },
      {
        /**
         * 말씀광장 · 천지일보는 **새 탭으로 바로 연다.**
         * 사이트 안(iframe) 표시는 두 매체가 `X-Frame-Options`로 막아 두어 불가능하다 —
         * 백엔드 프록시가 생기면 그때 내부 표시로 바꾼다 (docs/HANDOFF.md 참고).
         */
        label: "말씀광장",
        icon: Church,
        items: [
          { to: "https://www.wordsquare.org/bible-forest/bible", label: "온라인 성경", icon: Church, external: true },
          { to: "https://www.wordsquare.org/bible-forest/dictionary", label: "성경사전", icon: Church, external: true },
        ],
      },
      {
        label: "천지일보",
        icon: Newspaper,
        items: [
          { to: "https://www.newscj.com/", label: "최근 이슈", icon: Newspaper, external: true },
          {
            to: "https://www.newscj.com/news/articleList.html?sc_sub_section_code=S2N53&sc_section_code=S1N7&view_type=sm",
            label: "종교 · 개신교",
            icon: Newspaper,
            external: true,
          },
        ],
      },
    ],
    /*
      자료실 전체를 보는 자리. **폴더 목록은 여기에 늘어놓지 않는다** — 폴더는 그 자료를 쓰는
      카테고리(강의 도우미 › 밭갈이 · 분반·보강 도우미 › 보강 자료·보강 콘텐츠)에 있다.
      여기에 또 두면 같은 목록이 사이드바 안에서 두 번 나온다.
    */
    items: [{ to: "/library", label: "자료실 전체 보기", icon: BookOpenText }],
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

  /*
    「사명자 심방 도우미」(`/care`)는 2026-08-13 리드 지시로 없앴다.
    번아웃 척도 원문을 못 받아 자가진단 카드가 계속 비어 있었고, 프롬프트 생성기만 남아
    있던 화면이다. 되살릴 때는 git 이력에서 `pages/Care.tsx`를 꺼내면 된다.
  */

  /**
   * 12지파 선교센터 — 어디에 있고 지금 어느 기수가 도는지 (2026-08-11 리드 지시).
   * **기존 카테고리 순서(2026-08-09 기준)는 건드리지 않고 뒤에 붙였다.**
   * 2026-08-14 FB-10 — **지파 신학부장 이상만** 본다. 역할 목록은 permissions.ts가 정본.
   */
  { label: "12지파 선교센터", icon: MapPin, to: "/centers", restrictTo: MISSION_CENTER_VIEW_ROLES },

  /**
   * 사이트 이용 현황 (2026-08-15 리드 지시 — 「아크 사이트를 많이 쓰는지 확인」).
   * **지파 신학부장 이상만** 본다. 기존 순서를 건드리지 않고 뒤에 붙였다 —
   * 12지파 선교센터·건의 게시판을 더할 때와 같은 원칙이다.
   */
  { label: "사이트 이용 현황", icon: Activity, to: "/usage", restrictTo: SITE_USAGE_VIEW_ROLES },

  /**
   * 건의·의견 게시판 (2026-08-14 피드백 FB-09 — 신설).
   * 실무자가 총회 신학부장·개발자에게 남기는 플랫폼 의견 창구다. 기존 순서는 안 건드리고
   * 맨 뒤에 붙였다 — 12지파 선교센터를 더할 때와 같은 원칙이다.
   */
  /* 2026-08-15 리드 지시 — 이름을 「게시판」으로 바꿨다 (경로·저장 구조는 그대로) */
  { label: "게시판", icon: MessageSquarePlus, to: "/board" },
];

/** 대주제가 품은 모든 항목 (직속 + 하위 묶음) */
export function groupItems(group: NavGroup): NavItem[] {
  return [...(group.items ?? []), ...(group.subGroups ?? []).flatMap((s) => s.items)];
}

/** 권한 필터 — 열람은 로그인 전체가 기본, restrictTo만 제한 */
/**
 * 경로 → 사람이 읽는 화면 이름 (2026-08-17 리드 지시 — 「최근 본 것」에 `/plan` 같은
 * 코드 용어가 아니라 실제 카테고리 이름이 나오게).
 *
 * **메뉴 정의(NAV_GROUPS)에서 파생한다** — 화면 이름을 여기 다시 적으면 메뉴와 어긋난다
 * (메인 카테고리 타일을 `visibleNavGroups`에서 파생하는 것과 같은 원칙이다).
 * 이름은 「대주제 · 항목」 꼴이다 (예: 「기수 현황 · 비교」 · 「강의 도우미 · 흐름교육」).
 *
 * ⚠️ **저장 구조는 안 바꾼다.** 열람 기록에는 여전히 경로(식별자)만 저장하고, 이름은
 * 그릴 때 이 표에서 다시 찾는다 — 마이페이지의 「이름은 그 시점 데이터에서 찾는다」 설계
 * 그대로라 화면 이름이 바뀌면 지난 기록도 새 이름으로 보인다.
 * ⚠️ 저장된 키는 URL 인코딩돼 있을 수 있어(`?folder=%EA%B5%90…`) 양쪽 다 디코드해 견준다.
 */
const PAGE_LABELS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  const put = (to: string, label: string) => {
    try {
      map.set(decodeURIComponent(to), label);
    } catch {
      map.set(to, label);
    }
  };
  for (const g of NAV_GROUPS) {
    if (g.to) put(g.to, g.label);
    for (const item of g.items ?? []) {
      if (item.external) continue;
      put(item.to, item.label === g.label ? g.label : `${g.label} · ${item.label}`);
    }
    for (const sub of g.subGroups ?? []) {
      for (const item of sub.items) {
        if (item.external) continue;
        /*
          「대주제 · 하위 묶음 · 항목」에서 **겹치는 이름은 한 번만** 적는다 —
          「기수 현황 · 기수 현황 · 기수 요약」처럼 같은 말이 두 번 나오면 안 된다.
        */
        const parts: string[] = [g.label];
        const overlaps = (a: string, b: string) => a.includes(b) || b.includes(a);
        if (!overlaps(sub.label, g.label)) parts.push(sub.label);
        if (!parts.some((p) => overlaps(p, item.label))) parts.push(item.label);
        put(item.to, parts.join(" · "));
      }
    }
  }
  return map;
})();

/** 메뉴에 없는 경로의 이름 — 상세·검색처럼 딥링크로만 가는 화면들 */
const PAGE_LABEL_FALLBACKS: [RegExp, string][] = [
  [/^\/students\//, "수강생 관리 도우미 · 수강생 상세"],
  [/^\/library\?q=/, "자료실 · 검색"],
  [/^\/library\?open=/, "자료실 · 자료 상세"],
  [/^\/teaching\?.*open=/, "강의 도우미 · 자료 상세"],
  [/^\/makeup\?.*open=/, "분반 · 보강 도우미 · 자료 상세"],
  [/^\/series\//, "자료실 · 신천지도서"],
];

export function pageLabelOf(key: string): string | null {
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    /* 깨진 인코딩은 그대로 견준다 */
  }
  const exact = PAGE_LABELS.get(decoded);
  if (exact) return exact;
  for (const [re, label] of PAGE_LABEL_FALLBACKS) {
    if (re.test(decoded)) return label;
  }
  // 물음표 뒤를 떼고 경로만으로 한 번 더 — 메뉴에 없는 쿼리 조합(옛 링크·필터)을 받는다
  const pathOnly = decoded.split("?")[0];
  return PAGE_LABELS.get(pathOnly) ?? null;
}

export function visibleNavGroups(session: Session): NavGroup[] {
  const allow = (i: { restrictTo?: RoleCode[] }) =>
    !i.restrictTo || i.restrictTo.includes(session.roleCode);
  return NAV_GROUPS.filter(allow) // 대주제 단위 제한 (FB-10) — 메인 카테고리 타일도 이걸 따라온다
    .map((g) => ({
      ...g,
      items: g.items?.filter(allow),
      subGroups: g.subGroups
        ?.map((s) => ({ ...s, items: s.items.filter(allow) }))
        .filter((s) => s.items.length > 0),
    }))
    .filter((g) => g.to || groupItems(g).length > 0);
}
