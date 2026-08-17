/** 역할 코드 — 저장소 데이터 계약. 임의 변경 금지 (CLAUDE.md §4) */
export type RoleCode =
  | "headquarters_admin"
  | "tribe_admin"
  | "church_admin"
  | "instructor"
  | "evangelist"
  | "content_admin"
  | "security_auditor";

export type ScopeType = "national" | "tribe" | "church" | "cohort" | "division";

export const ROLE_LABELS: Record<RoleCode, string> = {
  headquarters_admin: "총회 신학부장",
  tribe_admin: "지파 신학부장",
  church_admin: "교회 관리자",
  instructor: "강사",
  evangelist: "전도사",
  content_admin: "콘텐츠 관리자",
  security_auditor: "보안 감사자",
};

/** 로그인 세션 (시범 로그인 — 상위 대시보드 SSO 확정 시 교체 지점) */
export interface Session {
  name: string;
  roleCode: RoleCode;
  scopeType: ScopeType;
  tribe: string;
  church: string;
  cohort: string;
  /**
   * 담당 분반 — 2026-08-06부터 **권한 판정에 쓰지 않는다**.
   * 전도사도 담당 기수 전체를 보므로 분반은 경계가 아니다. 표시·분류용으로만 남긴다.
   * 필드를 지우지 않는 이유는 분반 배정이 다시 필요해질 수 있어서다(불변식 10).
   */
  division: string | null;
  loggedInAt: string;
}

/** 자료실 카테고리 (1단계 착수지시문 v2 · 작업 1) — 데이터 계약, 변경 금지 */
export type LibraryCategory =
  | "standard_lecture"
  | "class_material"
  | "excellent_plan";

/**
 * 자료실 구획 — **2026-08-13 리드 지시로 폐지됐다.**
 *
 * 종전에는 자료실이 「강사 도우미 자료실」·「외부 자료실」 둘로 갈렸다. 그런데 리드 확인
 * 결과 **「외부 자료실」이라는 것은 없다** — 외부 매체(비메오·위플 등)는 자료에 붙는
 * **참고 링크**(`videoUrl`·`externalUrl`)이지 별도 구획이 아니었다. 구획이 사라지면서
 * 자료실은 **폴더 한 줄기**가 됐다.
 *
 * ⚠️ **타입과 필드는 남긴다.** 이미 저장된 자료(localStorage·실연동 시 DB 행)가 이 값을
 * 갖고 있어 지우면 후방 마이그레이션이 된다(불변식 10) — `division`을 남겨 둔 것과 같은
 * 취급이다. **화면·내비는 이 값을 읽지 않는다.** 폴더(`folderPath`)만 본다.
 */
export type LibrarySection = "instructor" | "external";

/**
 * 강의 도우미 「밭갈이」 묶음 (2026-08-07 팀 5차 회의 — 종전 「개강 초반」에서 갈라냄).
 *
 * **2026-08-13 리드 지시 — 각 파트가 강의 도우미 안에서 자체 자료실 노릇을 한다.**
 * 종전에는 파트를 누르면 자료실 화면으로 나갔는데, 초·중·고처럼 **그 카테고리 안에서**
 * 자료를 바로 열어야 한다. 화면은 `/teaching?folder=…`(`TeachingLibrary`)이 맡는다.
 *
 * `밭갈이`의 정의는 2026-08-08에 받았다 (`src/content/glossary.ts`). 그래도 **화면 이름
 * 문자열로만 쓰고 코드 값(enum·DB 코드·역할/스코프 코드)으로 굳히지 않는다** — 굳혀서 얻는
 * 것이 없고 표현이 다듬어지면 후방 마이그레이션이 되기 때문이다(불변식 10).
 * 이름을 바꿔야 하면 이 배열의 문자열을 고치되, **저장된 자료의 `folderPath`도 함께 본다**
 * (2026-08-07에 실제로 어긋나 자료가 폴더에서 빠진 적이 있다).
 */
export const INSTRUCTOR_BATGARI_FOLDERS = [
  "개강 세미나",
  "초등 초반 밭갈이",
  "주제별 밭갈이",
  "영적 전환을 돕는 육적 예시",
];

/**
 * 밭갈이 묶음에 들지 않는 강의 도우미 폴더 — 회의 합의 구조 밖이라 따로 둔다.
 * 밭갈이와 마찬가지로 **강의 도우미 안에서** 바로 자료를 연다 (2026-08-13 리드 지시).
 */
export const INSTRUCTOR_OTHER_FOLDERS = ["예배설교"];

/**
 * 교분기 폴더 — 초·중·고 각 단계에 하나씩 (2026-08-14 피드백 FB-06, 추가 확정).
 *
 * 콘텐츠는 **「총회 표준본 + 지파 보충본」 2계층**이다 (Q-03 리드 확정 — 2026-08-14).
 * 계층은 폴더가 아니라 자료의 `scope` 필드가 가른다: 공통(`common`)은 총회·콘텐츠
 * 관리자가 등록해 12지파가 같은 것을 보고, 지파 보충(`tribe:{지파}`)은 그 지파
 * 신학부장이 등록해 **자기 지파에만** 보인다. 공지의 총회/지파 구조와 같은 패턴이다.
 */
export const GYOBUNGI_FOLDERS = ["교분기 초등", "교분기 중등", "교분기 고등"];

/**
 * **우수 판서** 폴더 — 초·중·고 각 단계에 하나씩 (2026-08-15 리드 지시로 신설).
 * 잘 쓴 판서를 모아 두는 자리다. 등록·열람 규칙은 다른 강의 도우미 폴더와 같다.
 */
export const BOARD_WRITING_FOLDERS = ["우수 판서 초등", "우수 판서 중등", "우수 판서 고등"];

/**
 * **강의 도우미가 품는 폴더 전부** — 밭갈이 네 파트 + 예배설교 + 흐름교육 셋 + 우수 판서 셋.
 * `/teaching` 화면이 이 목록 안의 폴더만 연다 (그 밖의 폴더 이름이 오면 첫 폴더로 되돌린다).
 */
export const INSTRUCTOR_EARLY_FOLDERS = [
  ...INSTRUCTOR_BATGARI_FOLDERS,
  ...INSTRUCTOR_OTHER_FOLDERS,
  ...GYOBUNGI_FOLDERS,
  ...BOARD_WRITING_FOLDERS,
];

/**
 * 폴더 **표기 이름** — 저장값과 화면 문구를 가르는 자리 (2026-08-15).
 *
 * 리드가 「교분기 → 흐름교육」으로 이름을 바꿨다. 그런데 폴더 이름은 **저장된 자료의
 * `folderPath`에 그대로 들어 있어** 값을 바꾸면 그 자료들이 폴더에서 빠진다
 * (2026-08-07에 실제로 겪은 사고다 · 불변식 10). 그래서 **값은 그대로 두고 표기만** 바꾼다 —
 * 교제(`FELLOWSHIP_LABELS`)에서 「청년회 → 청년」을 처리한 것과 같은 방식이다.
 *
 * ⚠️ 새 폴더를 만들 때는 처음부터 바뀐 이름으로 짓는다(우수 판서가 그렇다) — 이 표는
 * **이미 저장된 값이 있는 폴더**를 위한 것이다.
 */
export const FOLDER_DISPLAY_LABELS: Record<string, string> = {
  "교분기 초등": "흐름교육 초등",
  "교분기 중등": "흐름교육 중등",
  "교분기 고등": "흐름교육 고등",
};

/** 화면에 낼 폴더 이름 — 표에 없으면 저장값 그대로다 */
export function folderLabel(folder: string): string {
  return FOLDER_DISPLAY_LABELS[folder] ?? folder;
}

/**
 * 전도사 도우미 「보강 자료」 폴더 (2026-08-06 카테고리 확정).
 *
 * ⚠️ `영적전환`이 상담 테마의 `신앙전환`과 같은 것인지 아직 확인받지 못했다
 * (`docs/decisions/OPEN_QUESTIONS.md` §C-1). 같다고 단정해 이름을 합치지 않는다.
 * 나머지도 같은 취급이다 — **화면 이름으로만 쓰고 코드 값(enum·DB 코드)으로 굳히지 않는다.**
 */
export const EVANGELIST_MAKEUP_FOLDERS = [
  "영적전환",
  "신심심기",
  "환경정리",
  "선악과",
  "이면유월 보강",
  "신앙인창조",
  "사명자 양성",
];

/** 분반·보강 도우미로 이관된 실무 교육 콘텐츠 3종 — 자료실이 아니라 보강 파트에서 연다 */
export const EVANGELIST_CONTENT_FOLDERS = ["영인지", "성경기초상식", "하나님에 대한 필요성"];

/**
 * 자료실 아카이브 폴더 (2026-08-10 리드 지시 · **2026-08-13 두 개로 줄임**) —
 * 자료실은 **대용량 장기 보관 아카이브** 위주다. 실무 교육 자료는 강의·분반보강 도우미가
 * 가져갔고, 「지파별 취합 도서」는 리드 지시로 뺐다.
 *
 * 남은 둘은 **여기서 내려받아 확인하는 자료**다 — 자료마다 붙는 내려받기 링크
 * (`externalUrl`)로 연다.
 * ⚠️ 파일 원본(영상·삽화)은 R2가 붙어야 올라간다 — 지금은 폴더 자리와 외부 링크만.
 */
export const ARCHIVE_FOLDERS = ["실상 뮤지컬 영상", "계시록 삽화"];

/**
 * **최상위 폴더 전부 — 폴더 정의는 여기 한 곳뿐이고 내비는 여기서 읽어 만든다.**
 *
 * 2026-08-13 구획(`LibrarySection`)이 폐지되면서 `Record<구획, 폴더[]>`에서 **한 줄기 배열**로
 * 폈다. 폴더가 어느 화면에 걸리는지는 내비(`src/shell/nav.ts`)가 정한다 —
 * 밭갈이·예배설교는 강의 도우미, 보강 폴더는 분반·보강 도우미, 아카이브는 자료실.
 * 폴더 이름의 뜻은 `src/content/glossary.ts`에 있다 — 정의는 받았지만 문자열로 둔다.
 */
export const LIBRARY_FOLDERS: string[] = [
  ...INSTRUCTOR_EARLY_FOLDERS,
  ...EVANGELIST_MAKEUP_FOLDERS,
  ...EVANGELIST_CONTENT_FOLDERS,
  ...ARCHIVE_FOLDERS,
];

export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  standard_lecture: "표준 강의 자료",
  class_material: "분반·보강 자료",
  excellent_plan: "우수 교안",
};

/**
 * 자료가 속한 단계 (2026-08-14 피드백 FB-05②).
 * 초·중·고 메뉴에서 우수 교안·특강에 들어가면 **그 단계 자료만** 보여야 한다 —
 * 종전에는 어느 단계에서 들어가도 같은 목록이 나왔다. 값이 없으면 「공통」으로 치고
 * 모든 단계에 보인다(옛 자료·전 단계 공용 특강이 여기 해당한다). 전방 추가 필드.
 */
export type MaterialLevel = "초등" | "중등" | "고등";
export const MATERIAL_LEVELS: MaterialLevel[] = ["초등", "중등", "고등"];

/**
 * 자료의 공유 범위 (2026-08-14 FB-06 · Q-03 리드 확정 — 「총회 표준본 + 지파 보충본」).
 * - `common` — 12지파 공통. 총회·콘텐츠 관리자가 등록하고 화면 상단에 고정된다
 * - `tribe:{지파}` — 그 지파의 보충 자료. 지파 신학부장이 등록하고 **자기 지파에만** 보인다
 * 값이 없으면 `common`으로 친다(교분기 이전의 모든 자료). 전방 추가 필드 —
 * 실연동 시 `library_materials.scope` 컬럼에 대응한다. 서버가 같은 규칙으로 다시 거른다.
 */
export type MaterialScope = "common" | `tribe:${string}`;

/**
 * 사이트 방문 기록 (2026-08-15 리드 지시 — 「아크 사이트를 많이 쓰는지 확인」).
 *
 * ⚠️ **계정·날짜 하나당 한 줄**이다 — 같은 사람이 하루에 여러 번 들어와도 한 줄이다.
 * 「몇 번 눌렀나」가 아니라 「몇 사람이 썼나」를 보는 자리이기 때문이다.
 * ⚠️ 화면에는 **집계만** 낸다(불변식 2) — 이름은 저장하되 보여 주지 않는다. 이름을 남기는
 * 이유는 같은 사람의 재방문을 걸러 내기 위해서다(그것 말고는 쓰지 않는다).
 * 실연동 시 서버가 세션에서 기록한다 — 브라우저 저장은 지우면 그만이라 정본이 아니다.
 */
export interface SiteVisit {
  /** 중복 제거용 — 화면에 내보내지 않는다 */
  userName: string;
  tribe: string;
  roleCode: RoleCode;
  /** YYYY-MM-DD */
  date: string;
  visitedAt: string;
}

/**
 * 특강 (2026-08-15 리드 지시) — 정규 수업 요일 밖에서 따로 여는 강의.
 *
 * 「주차마다 특강을 추가할 수 있게 · 다른 요일에도 · 출석도 자유롭게 추가」가 지시다.
 * ⚠️ **출결 원본 시트에는 없는 것이라 사이트가 기록한다** — 불변식 3(출결 원본은 읽기 전용)에
 * 걸리지 않는다. 정규 회차의 출결은 여전히 못 고친다.
 * ⚠️ **출석률에는 기본으로 안 들어간다** (리드 지시 — 「특강은 포함되지 않고 메인강의만」).
 * 화면의 「특강 포함」 필터를 켤 때만 센다.
 * ⚠️ 수업날에 특강식 수업을 한 경우는 **특강이 아니라 정규**로 친다 (리드 지시) — 그 날은
 * 정규 회차 칸에 그대로 체크하고 여기에 만들지 않는다.
 */
export interface SpecialSession {
  id: string;
  cohortKey: string;
  /** 몇 주차에 붙는 특강인지 — 격자에서 그 주 칸 뒤에 놓인다 */
  weekNo: number;
  /** 실제 날짜 — 정규 수업 요일이 아니어도 된다 */
  date: string;
  title: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
}

/** 특강 출결 — 정규와 **같은 어휘**(`AttendanceMark`)를 쓴다. 계약을 새로 만들지 않는다 */
export interface SpecialAttendance {
  sessionId: string;
  studentKey: string;
  mark: AttendanceMark;
  markedBy: string;
  markedAt: string;
}

/**
 * 작성자 팔로우 (2026-08-15 리드 제안) — 「내가 원하는 강사님 교안들을 팔로우해서 보기」.
 * 시범 로그인은 이름이 곧 계정이라 이름으로 잇는다. 실연동 시 `user_id`·`author_id`가 된다.
 */
export interface AuthorFollow {
  /** 팔로우한 사람 */
  userName: string;
  /** 팔로우 대상 작성자 이름 */
  author: string;
  followedAt: string;
}

/**
 * 좋아요 갈래 (2026-08-15 리드 지시) — 「인기 교안을 체크할 때 구체적으로 평가하도록」.
 * 리드가 적어 준 세 가지 그대로다: 무신앙·무신론자에게 / 왜곡 씻기에 / 신앙 성장에.
 * ⚠️ 표현이 다듬어질 수 있으므로 **라벨만 고치면 되게** 코드 값과 화면 문구를 갈라 둔다.
 */
export type MaterialLikeKind = "unbeliever" | "correction" | "growth";

export const MATERIAL_LIKE_KINDS: MaterialLikeKind[] = ["unbeliever", "correction", "growth"];

export const MATERIAL_LIKE_LABELS: Record<MaterialLikeKind, string> = {
  unbeliever: "무신앙·무신론자에게 좋아요",
  correction: "왜곡 씻기에 좋아요",
  growth: "신앙 성장에 좋아요",
};

/** 목록·뱃지처럼 좁은 자리 표기 */
export const MATERIAL_LIKE_SHORT: Record<MaterialLikeKind, string> = {
  unbeliever: "무신앙",
  correction: "왜곡씻기",
  growth: "신앙성장",
};

export interface LibraryMaterial {
  id: string;
  category: LibraryCategory;
  title: string;
  body: string;
  externalUrl: string | null;
  /**
   * 수업용 PPT 링크 (2026-08-10 리드 지시 — 교안·영상 원스톱 매칭).
   * ⚠️ 파일 원본 업로드는 R2 몫이다 — 지금은 외부 저장소 URL만 담는다. 전방 추가 컬럼.
   */
  pptUrl?: string | null;
  /** 강의 현장 영상 링크 (비메오·위플 등). 비메오만 사이트 안 재생, 나머지는 새 탭 */
  videoUrl?: string | null;
  /** 우수 지정 — headquarters_admin만 토글 (확정 결정 4) */
  isFeatured: boolean;
  /**
   * 추천한 사람들 (2026-08-13 리드 지시 — 게시판 표의 추천순).
   * **1인 1표 토글** — `CounselCase.helpfulBy`와 같은 계약이다. 숫자 카운터로 두면
   * 무한 클릭이 된다(사례 화면이 2026-08-10에 그 이유로 바꿨다). 전방 추가 필드 —
   * 옛 저장분은 `migrateMaterials`가 빈 배열로 채운다.
   */
  helpfulBy?: string[];
  /**
   * **갈래별 좋아요** (2026-08-15 리드 지시 — 「인기교안 체크할 때 구체적으로 평가하도록」).
   * 무신앙·무신론자에게 / 왜곡 씻기에 / 신앙 성장에 — 갈래마다 1인 1표이고 여러 갈래를 함께 고를 수 있다.
   * ⚠️ **`helpfulBy`는 이 갈래들의 합집합으로 유지된다** — 게시판 표의 추천 열·추천순 정렬이
   * 그 필드를 보고 있어서다. 갈래를 다 풀면 `helpfulBy`에서도 빠진다.
   */
  likesBy?: Partial<Record<MaterialLikeKind, string[]>>;
  /**
   * 이 자료를 연 계정들 (2026-08-15 리드 지시 — 「계정 1개당 조회수는 1번 증가」).
   * 조회수(`materialViews`)는 이 목록에 없는 계정이 열 때만 오른다.
   * ⚠️ 전방 추가 — 옛 자료는 목록이 없고, 그때까지 쌓인 조회수는 그대로 둔다.
   */
  viewedBy?: string[];
  /**
   * 어느 구획인지 (2026-08-06 추가 · **2026-08-13 폐지**).
   * 저장된 값을 지우지 않으려고 남겨 둔 자리다 — **읽는 곳이 없다.** `LibrarySection` 주석 참고.
   */
  section: LibrarySection;
  /**
   * 폴더 경로 — 최상위부터 순서대로. 예: ["개강 세미나", "1차시"]
   * 배열로 둔 것은 폴더를 더 깊게 넣게 될 때 구조를 바꾸지 않기 위해서다.
   * 실연동 시 `library_materials`의 계층 컬럼(`path`)에 대응한다.
   */
  folderPath: string[];
  /** 단계 (FB-05②) — 없으면 공통. 우수 교안·특강의 초/중/고 필터가 본다 */
  level?: MaterialLevel | null;
  /** 공유 범위 (FB-06 · Q-03) — 없으면 `common`. 교분기의 지파 보충본 판별에 쓴다 */
  scope?: MaterialScope;
  /**
   * 지파 공유 승격 (2026-08-14 FB-04 · Q-02 추천안 — 우수 교안 2단 체계의 1단).
   * 어느 지파 신학부장이 「우리 지파가 공유할 만하다」고 승격했는지, 지파 이름 목록.
   * 총회 신학부장의 최종 우수 배지(`isFeatured`)는 종전 그대로다 (확정 결정 4 연속성).
   * 전방 추가 필드 — 옛 자료는 빈 것으로 친다.
   */
  tribeEndorsements?: string[];
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  updatedAt: string;
}

/** 공지·어록·영상 — 기존 workspace_entries 구조 유지 (착수지시문 v2: 신설 금지) */
export type WorkspaceKind = "notice_hq" | "notice_tribe" | "quote" | "video";

export type QuoteCategory = "말씀" | "사명" | "신앙" | "교육" | "리더십";

export interface WorkspaceEntry {
  id: string;
  kind: WorkspaceKind;
  title: string;
  body: string;
  /** notice_tribe: 대상 지파 · quote: 출처 표기 */
  meta: string | null;
  quoteCategory: QuoteCategory | null;
  pinned: boolean;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
}

/**
 * 자료 별점 (2026-08-14 FB-04) — **사용자당 자료 하나에 1건 upsert.**
 * 실연동 시 D1 `material_ratings`에 대응한다. 숫자 카운터로 두면 무한 클릭이 되므로
 * (추천·즐겨찾기와 같은 이유) 사람 단위로 저장한다.
 */
export interface MaterialRating {
  userName: string;
  materialId: string;
  /** 1~5 */
  stars: number;
  ratedAt: string;
}

/**
 * 유효 조회 (2026-08-14 FB-04 — 조작 방지).
 * **같은 사용자 1일 1회 + 열람 30초 이상**만 쌓인다 — 반복 새로고침으로 조회수를 올리는
 * 조작을 막는다. 상세를 여는 클릭마다 오르는 `materialViews`(표시용 총 조회수)와는
 * 다른 축이다 — 인기 점수는 이것만 본다.
 * ⚠️ **판정은 실연동 시 서버가 다시 한다** (D1 `material_views.valid`) — 클라이언트
 * 판정은 편의일 뿐, 서버를 안 거치는 조작을 막지 못한다.
 */
export interface MaterialValidView {
  userName: string;
  materialId: string;
  /** YYYY-MM-DD — 1일 1회 판정의 키 */
  date: string;
  viewedAt: string;
}

/**
 * 건의·의견 게시판 (2026-08-14 피드백 FB-09 — 신설).
 *
 * 실무자(강사·전도사)가 총회 신학부장·개발자에게 건의·감사를 남기는 창구다 —
 * 「마음의 편지」가 아니라 **플랫폼에 대한 의견**(쿠팡 후기 같은 것)이다.
 *
 * - 작성: 로그인 사명자 전체. 공개글/비밀글 선택
 * - 공개글: 로그인 전체 열람 · **비밀글: 작성자 본인 + 총회 관리자 + 해당 지파 신학부장**
 *   (2026-08-15 리드 확정 — 종전 「총회 신학부장만」을 이 범위가 대체한다)
 *   판정은 `permissions.ts`의 `canReadSecretPost` — 실연동 시 **서버가 세션의
 *   memberships/role을 대조해 응답에서 거른다.** 클라이언트 필터는 편의일 뿐이다
 * - 답글: 수신 역할의 1단 답글만 (답글에 답글 없음)
 * - 실연동 시 D1 `board_posts` / `board_replies` 테이블 신설 — 마이그레이션 전방 추가
 */
export interface BoardPost {
  id: string;
  title: string;
  body: string;
  isSecret: boolean;
  createdBy: string;
  createdByRole: RoleCode;
  /**
   * 작성자 소속 지파 — **「해당 지파」 판정의 기준**이다 (2026-08-15 신설).
   * ⚠️ 옵션인 이유는 이미 저장된 글에 이 값이 없기 때문이다(전방 추가 — 불변식 10).
   * 값이 없는 옛 글은 지파 관리자에게 **안 보이는 쪽**으로 판정한다 — 비밀글이므로
   * 모호할 때는 닫는다. 실연동 시 서버가 작성자 memberships에서 다시 읽는다.
   */
  createdByTribe?: string;
  createdAt: string;
}

export interface BoardReply {
  id: string;
  postId: string;
  body: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
}

/**
 * 강의 후 현장 기록 — 원 저장소 `content_library_notes` 계약에 맞춘 구조.
 * 교리 원문(교안)은 그대로 두고, 실제 강의에서 겪은 것만 옆에 붙인다.
 * 다음에 같은 강을 맡는 강사가 앞사람의 경험을 먼저 보게 하는 것이 목적이다.
 */
export type LessonNoteKind = "question" | "caution" | "tip";

export const LESSON_NOTE_LABELS: Record<LessonNoteKind, string> = {
  question: "많이 나온 질문",
  caution: "주의할 점",
  tip: "잘 통한 방법",
};

export interface LessonNote {
  id: string;
  /** 어느 강에 붙는 기록인지 — 예: "elementary-3", "high-05" */
  lessonKey: string;
  /** 목록에 보여 줄 강 이름 */
  lessonLabel: string;
  kind: LessonNoteKind;
  body: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  /**
   * 도움이 됐다고 표시한 사람 수 — **옛 방식**(2026-08-15에 1인 1표로 바뀌었다).
   * ⚠️ 지우지 않는다(불변식 10): 이미 쌓인 값이 있어 지우면 그 표들이 사라진다.
   * 새 표는 `helpfulBy`로 들어가고, 화면은 **둘을 합쳐** 센다.
   */
  helpful: number;
  /**
   * 도움됨을 누른 사람들 — **1인 1표 토글** (2026-08-15 리드 지시).
   * 자료 추천(`LibraryMaterial.helpfulBy`)·상담 사례와 같은 계약이다.
   */
  helpfulBy?: string[];
}

/**
 * 기수 주간계획 (2026-08-06 확정) — **해당 기수의 강사·전도사가 함께 고친다.**
 * 여러 사람이 같은 글을 고치므로 **누가 언제 무엇을 바꿨는지 남긴다**. 그래야 되돌릴 수 있고,
 * 서로 덮어쓴 것을 확인할 수 있다.
 * 1차는 텍스트만 다룬다 — 파일 첨부는 2차(R2)다.
 */
export interface WeeklyPlan {
  id: string;
  /** 어느 기수의 계획인지 — 권한 판정 기준이다 */
  cohortKey: string;
  week: string;
  body: string;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
  /** 수정 이력 — 최근이 앞 */
  history: PlanRevision[];
}

export interface PlanRevision {
  body: string;
  editedBy: string;
  editedByRole: RoleCode;
  editedAt: string;
}

/**
 * 달력형 주간계획 항목 (2026-08-10 리드 지시) — 기수 일정이 유동적이라 주차 칸에 글을
 * 몰아 적는 방식으로는 담기지 않았다. **날짜에 항목을 자유롭게 붙이는** 구조로 바꾼다.
 *
 * ⚠️ 종전 `WeeklyPlan`(주차별 글)을 **지우지 않는다.** 이미 적어 둔 계획이 사라지면
 * 후방 마이그레이션이 된다(불변식 10). 달력이 주 화면이 되고, 종전 주차별 글은
 * 화면 아래에 그대로 남겨 함께 본다.
 *
 * 권한은 종전과 같다 — **해당 기수의 강사·전도사만** 고친다(`canEditCohortRecord`).
 */
/**
 * 달력 항목 종류 — `counsel`(상담)·`visit`(심방)은 2026-08-17 리드 지시로 더했다.
 * **전방 추가**라 이미 저장된 항목은 그대로 유효하다.
 * ⚠️ 상담·심방 계획에는 **수강생 이름을 적지 않는다** — 달력은 기수 공유 화면이다.
 * 누구를 만났는지의 기록은 수강생 상세의 「보강 · 상담 메모」에 남긴다(그쪽은 담당 범위 안이다).
 */
export type PlanEntryKind = "progress" | "makeup" | "counsel" | "visit" | "event" | "note";

export const PLAN_ENTRY_LABELS: Record<PlanEntryKind, string> = {
  progress: "진도",
  makeup: "보강",
  counsel: "상담",
  visit: "심방",
  event: "행사",
  note: "메모",
};

export interface PlanEntry {
  id: string;
  /** 어느 기수의 계획인지 — 권한 판정 기준 */
  cohortKey: string;
  /** YYYY-MM-DD */
  date: string;
  kind: PlanEntryKind;
  title: string;
  /**
   * 진도 항목이면 회차 번호. 진도표 파일을 올리면 이 값이 채워진다 —
   * 주간계획과 진도표를 **한 파일로 함께 반영**하기 위한 자리다.
   */
  session: number | null;
  /** 파일 업로드로 들어온 항목인지 — 사람이 적은 것과 구분해 다시 올릴 때 갈아끼운다 */
  fromUpload: boolean;
  /**
   * 중요 표시 — 켜면 달력 옆 「중요 일정」 목록에 모인다 (2026-08-10 리드 지시).
   * 기수 전체가 지키는 날(이면유월 마지막 날짜 같은 것)을 달력에서 찾지 않고 바로 보게 한다.
   * ⚠️ 전방 추가 필드다 — 이 값이 없는 옛 항목은 중요하지 않은 것으로 본다.
   */
  important?: boolean;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
}

/**
 * 기수 일정 수정 (2026-08-13 리드 지시 — 개강일·종강 예정일을 화면에서 고친다).
 * 목업 `SCHEDULE`은 기본값이고, 이 수정이 있으면 그 값을 쓴다
 * (`cohort-calendar.ts`의 `effectiveSchedule`이 병합한다).
 * ⚠️ **새신자교육 종강 예정일은 저장하지 않는다** — 항상 「종강 예정일 + 2주」로 파생한다.
 * 실연동 시 `cohorts` 테이블의 일정 컬럼 갱신에 대응한다.
 */
export interface ScheduleOverride {
  cohortKey: string;
  startsOn?: string;
  endsOn?: string;
  /**
   * 수업 요일 구간 (2026-08-14 리드 지시) — **기수 도중에 요일이 바뀐다.**
   * 개강~6개월차는 월·화·목, 6~8개월차는 **일·수·목**이라(2026-08-15 리드 확정 —
   * 월요일 수업이 일요일로, 화요일 수업이 수요일로 옮겨진다)
   * 「기수 하나 = 요일 하나」로는 담기지 않는다. 그래서 **N주차부터 이 요일**을 뜻하는
   * 구간 목록으로 둔다. 비어 있으면 기본값(월·화·목) 한 구간이다.
   * 실연동 시 `cohorts` 또는 별도 일정 테이블의 요일 구간 컬럼에 대응한다.
   */
  weekdayPeriods?: ClassWeekdayPeriod[];
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
}

/**
 * 「N주차부터 이 요일로 수업한다」 한 구간 (2026-08-14).
 * `weekdays`는 `Date.getDay()` 값 — 0=일 … 6=토. 정렬하면 일(0)이 먼저 오므로
 * 「일·수·목」 같은 표기 순서가 그대로 나온다 — 일요일을 **그 주의 첫날**로 보기 때문에
 * 표기 순서와 실제 수업 차례가 같다 (`cohort-calendar`의 `offsetInWeek`).
 */
export interface ClassWeekdayPeriod {
  /** 이 구간이 시작되는 주차 (1부터). 첫 구간은 항상 1이다 */
  fromWeek: number;
  weekdays: number[];
}

/**
 * 주차별 출석 사유·극복 기록 (2026-08-06 확정) — **해당 기수의 강사·전도사가 적는다.**
 * 자동 산출이 아니라 사람이 남기는 기록이므로, 누가 적었는지 함께 남긴다.
 */
export interface WeekNote {
  cohortKey: string;
  week: string;
  reason: string;
  overcome: string;
  editedBy: string;
  editedByRole: RoleCode;
  editedAt: string;
}

/**
 * 상담 사례 (2026-08-06 확정) — 강사 도우미의 공유 자산.
 *
 * ⚠️ 자료실은 전국 공통이라 조직 스코프가 없다. 그래서 **개인을 특정할 수 있는 것은 담지 않는다.**
 * 확정된 익명화 기준: **지파·교회·센터(기수)까지만 밝히고 그 아래는 적지 않는다.**
 * 이름·연락처·분반·나이처럼 개인을 짚을 수 있는 것은 입력 자체를 막는다.
 */
export interface CounselCase {
  id: string;
  /** 어떤 상황이었는지 (개인 식별 정보 없이) */
  situation: string;
  /** 어떻게 했는지 */
  approach: string;
  /** 어떻게 됐는지 */
  result: string;
  outcome: "success" | "failure";
  /** 익명화 기준에 맞는 소속 표기 — 지파·교회·센터까지만 */
  tribe: string;
  church: string;
  cohort: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  /** 마지막 수정 시각 — 본인 글 수정이 열리면서 추가 (2026-08-10) */
  updatedAt?: string;
  /**
   * 도움됨을 누른 사람 목록 — **정본** (2026-08-10, 상담법과 같은 계약).
   * 종전 `helpful: number`는 무한 클릭이 가능했다. 카운트는 항상 이 배열 길이다.
   */
  helpfulBy: string[];
}

/**
 * 상담 도우미 UGC (2026-08-08 지시문 §2-5 · 3단계) — 원 저장소 `counseling_tips` 계약의 미러.
 *
 * 테마는 **번호(1~12)로만 가리킨다.** 테마 이름(왜곡씻기·이면유월·신앙전환 등)은 정의 미확정
 * 용어가 많아 코드 값으로 굳히지 않는다 — 이름이 바뀌어도 저장된 글은 번호로 그대로 이어진다.
 * 전국 공통 교육 영역이므로 조직 스코프 컬럼이 없다.
 */
export interface CounselingTip {
  id: string;
  /** 테마 번호 1~12 — 화면의 테마 목록 순서와 같다 */
  themeNo: number;
  title: string;
  body: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
  updatedAt: string;
  /**
   * 도움됨을 누른 사람 목록 — **이것이 정본이다.** 카운트는 항상 이 배열 길이로 계산한다.
   * 원 저장소의 `counseling_tip_helpful` UNIQUE(tip_id, user_id) 행에 대응한다
   * (helpful_count 캐시 컬럼은 표시 성능용일 뿐 — 지시문 §5).
   * 시범 로그인은 이름이 곧 계정이므로 이름을 담는다. 실연동 시 user_id로 바뀐다.
   */
  helpfulBy: string[];
  /** 관리자 숨김 — 삭제가 아니라 시각을 기입하는 소프트 삭제다 (지시문 §2-5 검수 정책) */
  hiddenAt: string | null;
  hiddenBy: string | null;
}

/** 상담법 신고 — content_admin 검토 큐로 들어간다. 원 저장소 `counseling_tip_reports` 미러 */
export interface TipReport {
  id: string;
  tipId: string;
  reporterName: string;
  reporterRole: RoleCode;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

/**
 * 강별 수업 자료 링크 (2026-08-10 리드 지시 — 교안·영상 원스톱 매칭).
 * 교안 원문은 정적 콘텐츠라 그대로 두고, **링크만 옆에 붙인다** — 강 하나에 한 벌.
 * `lessonKey`는 현장 기록(`LessonNote.lessonKey`)과 같은 축이다 (예: "elementary-3").
 */
export interface LessonResource {
  lessonKey: string;
  pptUrl: string | null;
  videoUrl: string | null;
  updatedBy: string;
  updatedByRole: RoleCode;
  updatedAt: string;
}

/**
 * 수강생 반응 기록 (2026-08-10 리드 지시 — 상태차트 자동화).
 * 붙여넣은 피드백을 문장 단위로 갈라 긍정/부정/특이로 나눠 쌓는다.
 *
 * ⚠️ 분류는 **제안일 뿐**이고 저장 전에 담당자가 고칠 수 있다 — 사람을 판정하는 것이
 * 아니라 기록을 정리하는 것이다(불변식 4). 분류 근거(걸린 낱말)를 함께 보여 준다.
 * ⚠️ 분류는 **브라우저 안에서만** 돈다. 수강생 기록을 바깥 AI에 보내지 않는다(불변식 4).
 */
export type ReactionSentiment = "positive" | "negative" | "notable";

export const REACTION_LABELS: Record<ReactionSentiment, string> = {
  positive: "긍정 반응",
  negative: "부정 반응",
  notable: "특이사항",
};

export interface StudentReaction {
  id: string;
  studentKey: string;
  sentiment: ReactionSentiment;
  text: string;
  createdBy: string;
  createdByRole: RoleCode;
  createdAt: string;
}

/**
 * 즐겨찾기 · 열람 기록 (2026-08-10 리드 지시 — 마이페이지).
 * 원 저장소 `user_favorites` · `user_activity_logs` 계약의 미러다.
 *
 * ⛔ **로그에 이름·제목 문자열을 복사해 두지 않는다** (지시문 §4-2). 식별자(`targetType` +
 * `targetId`)만 남기고, 화면에 그릴 때 **그 시점의 담당 범위로 다시 조회해** 이름을 얻는다.
 * 이렇게 해야 담당이 바뀐 뒤 옛 담당자의 마이페이지에 수강생 이름이 남지 않는다.
 *
 * ⚠️ 보관 기간은 아직 정해지지 않았다(권장 90일 · `OPEN_QUESTIONS`). 정해지면
 * 오래된 기록을 지우는 처리를 붙인다.
 */
export type FavoriteTarget = "material" | "tip" | "case" | "lesson" | "series";

export const FAVORITE_LABELS: Record<FavoriteTarget, string> = {
  material: "자료",
  tip: "상담법",
  case: "상담 사례",
  lesson: "교안",
  series: "신천지도서",
};

export interface Favorite {
  /** 시범 로그인은 이름이 곧 계정 — 실연동 시 user_id */
  userName: string;
  targetType: FavoriteTarget;
  targetId: string;
  createdAt: string;
}

/**
 * 개인 주간 일정 (2026-08-10 리드 지시) — 마이페이지의 개인 스케줄러.
 *
 * **개인 것이다.** 담당 기수 기록(`WeeklyPlan`·`PlanEntry`)과 달리 남이 보지 않는다 —
 * 그래서 `userName`으로만 묶고 조직 스코프를 두지 않는다.
 *
 * ⚠️ 여기에 **수강생 이름·개인 사정을 적지 않는다.** 개인 일정은 캘린더 파일로 내보낼 수
 * 있어 기기 밖으로 나갈 수 있다 — 그 순간 원문 개인정보 반출이 된다(불변식 2).
 * 화면에서 그렇게 안내한다.
 */
export interface PersonalEvent {
  id: string;
  /** 시범 로그인은 이름이 곧 계정 — 실연동 시 user_id */
  userName: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM — 비워 두면 종일 일정 */
  time: string;
  title: string;
  createdAt: string;
}

export interface ActivityLog {
  userName: string;
  /** 어느 화면인지 — 경로만 남긴다 */
  viewKey: string;
  targetType: FavoriteTarget | "page";
  targetId: string;
  viewedAt: string;
}

/** 출결 어휘 — attendance-adapter 계약 (CLAUDE.md §4) */
export type AttendanceMark =
  | "unknown"
  | "absent"
  | "makeupPending"
  | "makeupDone"
  | "present";

/** 한 주의 출결 — 출결 어휘 계약(AttendanceMark)을 그대로 쓴다 */
export interface WeeklyAttendance {
  /** 최근이 0, 그 전 주가 1 … */
  weeksAgo: number;
  mark: AttendanceMark;
  /** 대면 시간대 — 시간대가 바뀌는 것도 관찰 신호가 된다 */
  slot: "evening" | "morning" | "afternoon" | null;
}

export interface Student {
  /** 교회+기수+분반+이름 임시 키 (고유 ID 없는 원본 대비 — CLAUDE.md §14) */
  key: string;
  name: string;
  division: string;
  /** 출석률 % (진도 컬럼 집계) */
  attendanceRate: number;
  presentCount: number;
  totalSessions: number;
  status: "active" | "atRisk" | "paused";
  /** 저녁/오전/오후 대면 횟수 */
  slotCounts: { evening: number; morning: number; afternoon: number };
  lastAttended: string | null;
  /** 최근 8주 출결 — 이탈 신호를 읽는 근거가 된다 (실연동 시 시트에서 그대로 온다) */
  recentWeeks: WeeklyAttendance[];
}
