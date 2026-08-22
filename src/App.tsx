import { lazy } from "react";
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { canViewMissionCenters, canViewSiteUsage } from "./lib/permissions";
import { StoreProvider } from "./lib/store";
import { PlayerProvider } from "./shell/player";
import { Layout } from "./shell/Layout";
import { Login } from "./pages/Login";
import { Main } from "./pages/Main";

/**
 * 화면 코드는 **라우트마다 따로 받아 온다** (2026-08-18 — 첫 화면 번들 줄이기).
 *
 * 현장에서 휴대전화로 여는 사이트인데 번들이 gzip 1MB를 넘겼다. 한 사람이 한 번에 보는 것은
 * 화면 하나뿐이므로 **들어가는 화면만 받고 나머지는 누를 때** 받는다. 받아 오는 사이 셸(머리·
 * 사이드바)은 그대로 있고 본문 자리만 채워진다 — `Layout`의 `Suspense`가 그 자리를 지킨다.
 *
 * ⚠️ **`Login`과 `Main`은 가르지 않는다.** 로그인 화면은 세션이 없으면 곧바로 필요하고,
 * 메인은 로고를 누르면 오는 착지 화면이다. 이 둘까지 미루면 첫 화면이 한 박자 늦게 뜬다.
 *
 * ⚠️ 화면들이 `export function 이름`이라 기본 내보내기가 없다 — `lazy`에 그대로 못 넘기고
 * `.then`으로 `default`에 실어 준다. **화면 이름을 바꾸면 여기도 함께 고쳐야 한다**
 * (타입이 잡아 주므로 조용히 깨지지는 않는다).
 *
 * ⚠️ **팀 공유 프리뷰(단일 HTML)는 이 가르기를 되돌려 빌드한다** — `vite.config.ts`의
 * `preview` 모드가 청크를 도로 하나로 합친다. 단일 HTML은 외부 파일을 받아 올 수 없어
 * 갈라 둔 채로 묶으면 **화면이 아예 안 뜬다**.
 */
const CohortStatus = lazy(() => import("./pages/CohortStatus").then((m) => ({ default: m.CohortStatus })));
/* 출석 현황 — 기수 현황에서 분리된 독립 화면 (2026-08-22 리드 피드백 5). 격자+주간 흐름+비교 */
const CohortAttendance = lazy(() =>
  import("./pages/CohortAttendance").then((m) => ({ default: m.CohortAttendance })),
);
/* 지금 우리 기수는? — 2026-08-23 리드 지시로 탭에서 독립한 화면 */
const CohortNowPage = lazy(() =>
  import("./pages/CohortNow").then((m) => ({ default: m.CohortNowPage })),
);
const StudentsDashboard = lazy(() =>
  import("./pages/StudentsDashboard").then((m) => ({ default: m.StudentsDashboard })),
);
const StudentDetailPage = lazy(() =>
  import("./pages/StudentDetailPage").then((m) => ({ default: m.StudentDetailPage })),
);
const Compose = lazy(() => import("./pages/Compose").then((m) => ({ default: m.Compose })));
const Library = lazy(() => import("./pages/Library").then((m) => ({ default: m.Library })));
const TeachingLibrary = lazy(() =>
  import("./pages/TeachingLibrary").then((m) => ({ default: m.TeachingLibrary })),
);
const MakeupLibrary = lazy(() => import("./pages/MakeupLibrary").then((m) => ({ default: m.MakeupLibrary })));
const TendencyAnalysis = lazy(() =>
  import("./pages/TendencyAnalysis").then((m) => ({ default: m.TendencyAnalysis })),
);
const SeriesReader = lazy(() => import("./pages/SeriesReader").then((m) => ({ default: m.SeriesReader })));
const Notices = lazy(() => import("./pages/Notices").then((m) => ({ default: m.Notices })));
const Board = lazy(() => import("./pages/Board").then((m) => ({ default: m.Board })));
const Quotes = lazy(() => import("./pages/Quotes").then((m) => ({ default: m.Quotes })));
const Lessons = lazy(() => import("./pages/Lessons").then((m) => ({ default: m.Lessons })));
const Enneagram = lazy(() => import("./pages/Enneagram").then((m) => ({ default: m.Enneagram })));
const WeeklyPlanPage = lazy(() => import("./pages/WeeklyPlanPage").then((m) => ({ default: m.WeeklyPlanPage })));
const CounselCases = lazy(() => import("./pages/CounselCases").then((m) => ({ default: m.CounselCases })));
const Counseling = lazy(() => import("./pages/Counseling").then((m) => ({ default: m.Counseling })));
const Centers = lazy(() => import("./pages/Centers").then((m) => ({ default: m.Centers })));
const SiteUsage = lazy(() => import("./pages/SiteUsage").then((m) => ({ default: m.SiteUsage })));
const MyPage = lazy(() => import("./pages/MyPage").then((m) => ({ default: m.MyPage })));
const CohortSetup = lazy(() =>
  import("./pages/CohortSetup").then((m) => ({ default: m.CohortSetup })),
);

function Routed() {
  const { session } = useAuth();

  if (!session) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        {/*
          `/`는 **메인 페이지**다 (2026-08-13 리드 지시 — 홈페이지 노릇을 하는 화면을 따로).
          종전에는 역할별 착지 분기(관리직 → 전체현황 · 실무직 → 기수현황)에 쓰였는데,
          그 안내는 메인 화면 안의 「내 기수부터 보기」 카드가 대신한다.
        */}
        <Route path="/" element={<Main />} />
        {/*
          「전체 현황」은 2026-08-22 리드 지시로 없앴다 — 분류 대시보드는 기수 요약 상단으로,
          일정 편집은 기수 세팅으로 옮겼다. 경로는 지우지 않고 넘긴다(/care·/signals와 같은 처리).
          화면은 git 이력의 `pages/Overview.tsx`에 있다.
        */}
        <Route path="/overview" element={<Navigate to="/cohort" replace />} />
        <Route path="/cohort" element={<CohortStatus />} />
        {/* 옛 /cohort?tab=attendance|trend|compare는 CohortStatus가 이리로 넘긴다 */}
        <Route path="/attendance" element={<CohortAttendance />} />
        {/* 옛 /cohort?tab=now도 CohortStatus가 이리로 넘긴다 (2026-08-23 독립) */}
        <Route path="/cohort-now" element={<CohortNowPage />} />
        <Route path="/plan" element={<WeeklyPlanPage />} />
        {/* 기수 세팅 · 지난 기수 (2026-08-21 리드 지시) */}
        <Route path="/cohort-setup" element={<CohortSetup />} />
        <Route path="/cases" element={<CounselCases />} />
        <Route path="/counseling" element={<Counseling />} />
        {/*
          「사명자 심방 도우미」는 2026-08-13 리드 지시로 없앴다 — 경로는 지우지 않고
          메인으로 넘긴다(북마크가 죽지 않게). 화면은 git 이력에 있다.
        */}
        <Route path="/care" element={<Navigate to="/" replace />} />
        {/*
          12지파 선교센터 — **지파 신학부장 이상만** (2026-08-14 FB-10, P0).
          메뉴 숨김(nav.ts)만으로는 URL 직접 접근에 뚫리므로 라우트에서 한 번 더 막는다.
          서버 연동 시에는 API가 같은 목록으로 403을 준다 — 그쪽이 최종이다(불변식 1).
        */}
        <Route
          path="/centers"
          element={canViewMissionCenters(session) ? <Centers /> : <Navigate to="/" replace />}
        />
        {/*
          사이트 이용 현황 — **지파 신학부장 이상만** (2026-08-15 리드 지시).
          12지파 선교센터와 같은 세 겹 방어다: 메뉴 숨김 · 라우트 가드 · (연동 시) API 403.
        */}
        <Route
          path="/usage"
          element={canViewSiteUsage(session) ? <SiteUsage /> : <Navigate to="/" replace />}
        />
        {/*
          종전 「수강생 목록」은 2026-08-10에 「수강생 현황」으로 **병합**됐다 (리드 지시).
          경로는 지우지 않고 넘긴다 — 북마크·옛 링크가 죽지 않게 한다
          (지시문 §9의 "기존 경로는 리다이렉트" 원칙과 같다).
        */}
        <Route path="/students" element={<Navigate to="/students-dashboard" replace />} />
        <Route path="/students-dashboard" element={<StudentsDashboard />} />
        <Route path="/students/:key" element={<StudentDetailPage />} />
        {/* 「관찰 필요」도 2026-08-13에 없앴다 — 수강생 현황으로 넘긴다 */}
        <Route path="/signals" element={<Navigate to="/students-dashboard" replace />} />
        <Route path="/compose" element={<Compose />} />
        {/* 강의 후에 받아쓴 글을 정리하는 화면 — /compose(강의 전)와 짝이다 (2026-08-13) */}
        {/*
          「강의 녹취 정리」는 2026-08-15 리드 지시로 없앴다 — 경로는 지우지 않고 강의 도우미로
          넘긴다(북마크·옛 링크가 죽지 않게, `/signals`·`/care`와 같은 처리).
          되살릴 때는 git 이력에서 `pages/LectureDigest.tsx`와 `lib/transcript-digest.ts`를 꺼낸다.
        */}
        <Route path="/digest" element={<Navigate to="/teaching" replace />} />
        <Route path="/library" element={<Library />} />
        {/* 강의 도우미 안의 자료실 — 밭갈이 각 파트·예배설교 (2026-08-13) */}
        <Route path="/teaching" element={<TeachingLibrary />} />
        {/* 분반·보강 도우미 안의 자료실 — 보강 자료·보강 콘텐츠 (2026-08-18, `/teaching`과 같은 짜임) */}
        <Route path="/makeup" element={<MakeupLibrary />} />
        <Route path="/tendency" element={<TendencyAnalysis />} />
        <Route path="/series/:seriesId" element={<SeriesReader />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/quotes" element={<Quotes />} />
        {/* 건의·의견 게시판 (2026-08-14 FB-09) — 작성은 로그인 전체, 비밀글 열람은 화면·서버가 거른다 */}
        <Route path="/board" element={<Board />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/enneagram" element={<Enneagram />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * 라우터 선택 — 기본은 경로 라우팅(BrowserRouter).
 * 단일 파일로 묶어 정적 호스팅(팀 공유 프리뷰)에 올릴 때는 서버 라우팅이 없어
 * `VITE_ROUTER=hash` 로 빌드해 해시 라우팅을 쓴다.
 */
const Router = import.meta.env.VITE_ROUTER === "hash" ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <StoreProvider>
          {/* 오디오는 셸 최상위에 하나 — 화면을 옮겨도 소리가 끊기지 않는다 (지시문 §4-6) */}
          <PlayerProvider>
            <Routed />
          </PlayerProvider>
        </StoreProvider>
      </AuthProvider>
    </Router>
  );
}
