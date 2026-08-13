import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Link } from "../components/TransitionLink";
import { Menu, UserRound } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { Sidebar } from "./Sidebar";
import { AskAiBar } from "./AskAiBar";
import { ZionLogo } from "./ZionLogo";
import { ScrollToTop } from "./ScrollToTop";
import { DailyQuote } from "./DailyQuote";
import { MiniPlayer } from "./MiniPlayer";
import { ThemeToggle } from "./ThemeToggle";

/**
 * 앱 셸 — 본문 컴포넌트는 셸 없이도 동작하게 결합도를 낮게 유지한다.
 * 상위 신학부 대시보드에 임베드될 때 셸이 접힐 수 있다 (CLAUDE.md §14).
 *
 * 좁은 화면(lg 미만)에서는 사이드바를 드로어로 전환한다 — 현장에서 휴대전화로
 * 자료를 여는 경우가 많다.
 */
/** 사이드바 고정 여부 — 기본은 고정(종전 동작 보존). "0"일 때만 접힌다 */
const PIN_KEY = "zion_ark_nav_pinned";

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  /**
   * 사이드바 고정/접기 (2026-08-13 리드 지시).
   * 고정 해제 시 아이콘 레일(68px)로 접히고, 마우스를 대면 펼쳐진다(펼침은 오버레이 —
   * 본문 여백은 안 움직인다). 상태를 Layout이 드는 이유: **본문 여백과 사이드바 폭을
   * 둘 다 아는 유일한 곳**이라서다. 종전에는 272px가 여기와 Sidebar 두 곳에 하드코딩돼
   * 있었는데, CSS 변수(--sidebar-w) 한 곳으로 모았다.
   */
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem(PIN_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const location = useLocation();
  const session = useSession();
  const { logView } = useStore();

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
    } catch {
      /* 사생활 보호 모드 — 저장 못 해도 동작한다 */
    }
  }, [pinned]);

  // 화면을 옮기면 드로어를 닫는다
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, location.search]);

  /**
   * 열람 기록 — **공통 교육 영역만** 남긴다 (지시문 §4-2).
   * 수강생 화면(`/students…`)은 개인정보 설계에 리드 승인이 필요해 일부러 뺐다.
   * 남기는 것도 경로(식별자)뿐이고 제목·이름은 저장하지 않는다.
   */
  useEffect(() => {
    const path = location.pathname;
    const skip = path.startsWith("/students") || path === "/my" || path === "/";
    if (skip) return;
    logView(session.name, path + location.search, "page", path + location.search);
  }, [location.pathname, location.search, session.name, logView]);

  // 드로어가 열린 동안 뒤 본문이 스크롤되지 않게 한다
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <div
      className="min-h-screen"
      /*
        사이드바 폭의 정본 — 본문 여백과 aside 폭이 이 변수 하나를 본다.

        `--content-w`는 **본문 기둥의 최대 폭**이다 (2026-08-13 리드 지시로 1024 → 1152px).
        카테고리와 본문 사이가 너무 벌어져 좁혔다 — 그 틈의 대부분은 좌우 패딩이 아니라
        `mx-auto`가 만드는 **가운데 정렬 여백**이라, 기둥을 넓히는 것이 그 틈을 줄이는 길이다
        (1280px 화면·레일 상태에서 111px → 47px로 실측).
        ⚠️ 머리(어록·헤더)·본문·꼬리가 **같은 폭을 봐야 세로선이 맞는다** — 다섯 군데가
        이 변수를 함께 읽는 이유다. 한 곳만 고치면 검색창과 본문이 어긋난다.
      */
      style={
        {
          "--sidebar-w": pinned ? "272px" : "68px",
          "--content-w": "72rem",
        } as React.CSSProperties
      }
    >
      {navOpen && (
        <button
          onClick={() => setNavOpen(false)}
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-zion-950/40 lg:hidden"
        />
      )}

      <Sidebar
        drawerOpen={navOpen}
        onClose={() => setNavOpen(false)}
        pinned={pinned}
        onSetPinned={setPinned}
      />

      <div className="transition-[margin] duration-300 lg:ml-[var(--sidebar-w)]">
        {/* 오늘의 어록 — 화면 맨 위. 모두가 같은 날 같은 것을 본다 */}
        <DailyQuote />

        {/*
          ⚠️ 좌우 패딩은 **기둥(max-w) 안쪽**에 준다 — 본문·꼬리·어록과 같은 구조여야
          세로선이 맞는다. 종전에는 헤더만 패딩을 기둥 바깥(`header`)에 줘서 검색창이
          본문 제목보다 23px 왼쪽에 서 있었다(2026-08-13 실측). 배경은 `header`가
          전폭으로 깔므로 패딩을 안으로 옮겨도 띠는 그대로다.
        */}
        <header className="sticky top-0 z-20 bg-surface/90 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[var(--content-w,72rem)] items-center gap-2 px-4 sm:px-6">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="메뉴 열기"
              aria-expanded={navOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zion-100 bg-white text-zion-700 shadow-sm transition hover:bg-zion-50 lg:hidden"
            >
              <Menu size={18} />
            </button>
            {/* 마크를 누르면 **메인**으로 (2026-08-13 리드 지시 — 전체 현황이 아니다) */}
            <Link viewTransition to="/" aria-label="메인으로" className="shrink-0 lg:hidden">
              <ZionLogo size={28} />
            </Link>
            <div className="min-w-0 flex-1">
              <AskAiBar />
            </div>
            {/*
              미니플레이어는 헤더 안에 둔다 — 헤더가 이미 sticky라 스크롤해도 따라오면서
              본문 여백 계산을 건드리지 않는다 (§4-6의 CSS 사고 자리를 피한다)
            */}
            <MiniPlayer />
            <ThemeToggle />
            <Link
              viewTransition
              to="/my"
              aria-label="마이페이지"
              title="마이페이지"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zion-100 bg-white text-zion-700 shadow-sm transition hover:bg-zion-50"
            >
              <UserRound size={17} />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[var(--content-w,72rem)] px-4 py-4 sm:px-6">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-[var(--content-w,72rem)] px-4 pb-8 pt-4 text-[11px] text-ink-soft sm:px-6">
          시온 아크 · 내부 운영 플랫폼 — 수강생 개인정보는 담당 범위 밖으로 반출하지 않습니다 (집계·통계만 공유 가능).
        </footer>
      </div>

      <ScrollToTop />
    </div>
  );
}
