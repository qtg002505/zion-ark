import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AskAiBar } from "./AskAiBar";

/**
 * 앱 셸 — 본문 컴포넌트는 셸 없이도 동작하게 결합도를 낮게 유지한다.
 * 상위 신학부 대시보드에 임베드될 때 셸이 접힐 수 있다 (CLAUDE.md §14).
 */
export function Layout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-[272px] max-lg:ml-[238px]">
        <header className="sticky top-0 z-20 border-b border-zion-100 bg-surface/95 px-6 py-3 backdrop-blur">
          <div className="mx-auto max-w-5xl">
            <AskAiBar />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-6">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-5xl px-6 pb-8 pt-4 text-[11px] text-gray-400">
          시온 아크 · 내부 운영 플랫폼 — 수강생 개인정보는 담당 범위 밖으로 반출하지 않습니다 (집계·통계만 공유 가능).
        </footer>
      </div>
    </div>
  );
}
