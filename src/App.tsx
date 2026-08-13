import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { landingPath } from "./lib/permissions";
import { StoreProvider } from "./lib/store";
import { PlayerProvider } from "./shell/player";
import { Layout } from "./shell/Layout";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { CohortStatus } from "./pages/CohortStatus";
import { StudentsDashboard } from "./pages/StudentsDashboard";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { Signals } from "./pages/Signals";
import { Compose } from "./pages/Compose";
import { Library } from "./pages/Library";
import { TeachingLibrary } from "./pages/TeachingLibrary";
import { TendencyAnalysis } from "./pages/TendencyAnalysis";
import { SeriesReader } from "./pages/SeriesReader";
import { Notices } from "./pages/Notices";
import { Quotes } from "./pages/Quotes";
import { Lessons } from "./pages/Lessons";
import { Enneagram } from "./pages/Enneagram";
import { WeeklyPlanPage } from "./pages/WeeklyPlanPage";
import { CounselCases } from "./pages/CounselCases";
import { Counseling } from "./pages/Counseling";
import { Care } from "./pages/Care";
import { Centers } from "./pages/Centers";
import { MyPage } from "./pages/MyPage";

function Routed() {
  const { session } = useAuth();

  if (!session) return <Login />;

  /**
   * 착지 화면 — 관리직은 담당 기수가 없어 "내 기수" 화면이 구조적으로 비므로
   * 전체현황(요약)으로, 실무직(강사·전도사)은 담당 기수 상세로 보낸다.
   * (ORG_CHART §6. 편의 기능일 뿐 권한이 아니다 — 각 화면은 범위를 다시 검증한다.)
   */
  const landing = landingPath(session);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={landing === "/" ? <Overview /> : <Navigate to={landing} replace />}
        />
        <Route path="/overview" element={<Overview />} />
        <Route path="/cohort" element={<CohortStatus />} />
        <Route path="/plan" element={<WeeklyPlanPage />} />
        <Route path="/cases" element={<CounselCases />} />
        <Route path="/counseling" element={<Counseling />} />
        <Route path="/care" element={<Care />} />
        <Route path="/centers" element={<Centers />} />
        {/*
          종전 「수강생 목록」은 2026-08-10에 「수강생 현황」으로 **병합**됐다 (리드 지시).
          경로는 지우지 않고 넘긴다 — 북마크·옛 링크가 죽지 않게 한다
          (지시문 §9의 "기존 경로는 리다이렉트" 원칙과 같다).
        */}
        <Route path="/students" element={<Navigate to="/students-dashboard" replace />} />
        <Route path="/students-dashboard" element={<StudentsDashboard />} />
        <Route path="/students/:key" element={<StudentDetailPage />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/compose" element={<Compose />} />
        <Route path="/library" element={<Library />} />
        {/* 강의 도우미 안의 자료실 — 밭갈이 각 파트·예배설교 (2026-08-13) */}
        <Route path="/teaching" element={<TeachingLibrary />} />
        <Route path="/tendency" element={<TendencyAnalysis />} />
        <Route path="/series/:seriesId" element={<SeriesReader />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/quotes" element={<Quotes />} />
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
