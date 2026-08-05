import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { StoreProvider } from "./lib/store";
import { Layout } from "./shell/Layout";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { CohortStatus } from "./pages/CohortStatus";
import { Students } from "./pages/Students";
import { Library } from "./pages/Library";
import { SeriesReader } from "./pages/SeriesReader";
import { Notices } from "./pages/Notices";
import { Quotes } from "./pages/Quotes";
import { Lessons } from "./pages/Lessons";
import { Enneagram } from "./pages/Enneagram";
import { ExternalViewer } from "./pages/ExternalViewer";

function Routed() {
  const { session } = useAuth();

  if (!session) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/cohort" element={<CohortStatus />} />
        <Route path="/students" element={<Students />} />
        <Route path="/library" element={<Library />} />
        <Route path="/series/:seriesId" element={<SeriesReader />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/enneagram" element={<Enneagram />} />
        <Route path="/external/:sourceId" element={<ExternalViewer />} />
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
          <Routed />
        </StoreProvider>
      </AuthProvider>
    </Router>
  );
}
