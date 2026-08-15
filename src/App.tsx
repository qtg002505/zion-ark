import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { canViewMissionCenters, canViewSiteUsage } from "./lib/permissions";
import { StoreProvider } from "./lib/store";
import { PlayerProvider } from "./shell/player";
import { Layout } from "./shell/Layout";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { CohortStatus } from "./pages/CohortStatus";
import { StudentsDashboard } from "./pages/StudentsDashboard";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { Main } from "./pages/Main";
import { Compose } from "./pages/Compose";
import { Library } from "./pages/Library";
import { TeachingLibrary } from "./pages/TeachingLibrary";
import { TendencyAnalysis } from "./pages/TendencyAnalysis";
import { SeriesReader } from "./pages/SeriesReader";
import { Notices } from "./pages/Notices";
import { Board } from "./pages/Board";
import { Quotes } from "./pages/Quotes";
import { Lessons } from "./pages/Lessons";
import { Enneagram } from "./pages/Enneagram";
import { WeeklyPlanPage } from "./pages/WeeklyPlanPage";
import { CounselCases } from "./pages/CounselCases";
import { Counseling } from "./pages/Counseling";
import { Centers } from "./pages/Centers";
import { SiteUsage } from "./pages/SiteUsage";
import { MyPage } from "./pages/MyPage";

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
        <Route path="/overview" element={<Overview />} />
        <Route path="/cohort" element={<CohortStatus />} />
        <Route path="/plan" element={<WeeklyPlanPage />} />
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
