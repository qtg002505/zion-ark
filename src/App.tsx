import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
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
import { LectureDigest } from "./pages/LectureDigest";
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
import { Centers } from "./pages/Centers";
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
        <Route path="/centers" element={<Centers />} />
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
        <Route path="/digest" element={<LectureDigest />} />
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
