import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** 이 지점을 넘겨 내려가면 버튼이 나온다 (지시문 4-1 권장값) */
const SHOW_AFTER = 300;

/**
 * 맨 위로 — 셸 레벨에서 한 번만 만들어 전 화면에 적용한다 (지시문 §4-1).
 *
 * 지킨 것 셋:
 * - `prefers-reduced-motion`을 존중한다 — 켜져 있으면 부드러운 스크롤 대신 즉시 이동.
 *   움직임에 민감한 사람에게 긴 애니메이션은 불편을 넘어 증상이 된다
 * - 접근 가능한 이름(`aria-label="맨 위로"`)을 붙인다
 * - 모바일에서 하단과 겹치지 않게 `safe-area`만큼 더 띄운다
 */
export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > SHOW_AFTER);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      onClick={toTop}
      aria-label="맨 위로"
      title="맨 위로"
      className="fixed right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-zion-200 bg-white text-zion-700 shadow-lg transition hover:bg-zion-50 sm:right-6"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
