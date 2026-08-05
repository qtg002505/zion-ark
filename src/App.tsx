import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <Routed />
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
