import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { AskAiBar } from "./AskAiBar";
import { ZionLogo } from "./ZionLogo";

/**
 * 앱 셸 — 본문 컴포넌트는 셸 없이도 동작하게 결합도를 낮게 유지한다.
 * 상위 신학부 대시보드에 임베드될 때 셸이 접힐 수 있다 (CLAUDE.md §14).
 *
 * 좁은 화면(lg 미만)에서는 사이드바를 드로어로 전환한다 — 현장에서 휴대전화로
 * 자료를 여는 경우가 많다.
 */
export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // 화면을 옮기면 드로어를 닫는다
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, location.search]);

  // 드로어가 열린 동안 뒤 본문이 스크롤되지 않게 한다
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <div className="min-h-screen">
      {navOpen && (
        <button
          onClick={() => setNavOpen(false)}
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-zion-950/40 lg:hidden"
        />
      )}

      <Sidebar drawerOpen={navOpen} onClose={() => setNavOpen(false)} />

      <div className="lg:ml-[272px]">
        <header className="sticky top-0 z-20 bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="메뉴 열기"
              aria-expanded={navOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zion-100 bg-white text-zion-700 shadow-sm transition hover:bg-zion-50 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <span className="shrink-0 lg:hidden">
              <ZionLogo size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <AskAiBar />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-[11px] text-ink-soft sm:px-6">
          시온 아크 · 내부 운영 플랫폼 — 수강생 개인정보는 담당 범위 밖으로 반출하지 않습니다 (집계·통계만 공유 가능).
        </footer>
      </div>
    </div>
  );
}
