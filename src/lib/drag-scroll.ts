import { useCallback, useEffect, useRef } from "react";

/**
 * 끌어서 넘겨 보기 (2026-08-14 리드 지시 — 「출석을 볼 수 있는 모든 그래프·내용은
 * 드래그해서 상세히도 볼 수 있게」).
 *
 * 출결 격자가 23주(69칸)로 길어지면서 스크롤바만으로는 훑기가 나쁘다. 표 위를 붙잡고
 * 끌면 그대로 따라오게 한다 — 지도·타임라인에서 익숙한 몸짓이다.
 *
 * ## 지키는 것
 *
 * - **누르는 것을 방해하지 않는다.** 3px 넘게 움직인 뒤부터 「끄는 중」으로 보고,
 *   그 전에는 평범한 클릭이다. 이 문턱이 없으면 표 안 버튼을 못 누른다
 * - 끌기 시작하면 그 다음 `click`을 한 번 삼킨다 — 손을 뗀 자리에 있던 버튼이
 *   눌리는 사고를 막는다
 * - **포인터 이벤트**를 쓴다(마우스·터치·펜 한 벌). 터치는 브라우저 기본 스크롤이 이미
 *   좋으므로 마우스·펜에서만 끈다 — 터치에서 가로채면 세로 스크롤이 걸린다
 * - 세로로 크게 움직이면 끌기를 접는다 — 페이지를 세로로 넘기려던 손을 막지 않는다
 * - `setPointerCapture`를 쓰지 않는다 — 표 밖으로 나가도 브라우저가 알아서 따라오고,
 *   캡처를 걸면 안쪽 버튼의 포커스·클릭이 꼬인다
 */
export function useDragScroll<T extends HTMLElement>(resetKey?: string) {
  const ref = useRef<T | null>(null);
  /** 끌기 상태 — 렌더를 유발할 이유가 없어 ref에 둔다 */
  const st = useRef({ down: false, moved: false, startX: 0, startY: 0, scroll: 0 });

  /**
   * **칸 구성이 바뀌면 맨 왼쪽으로 되돌린다** (2026-08-15 — 리드가 「최신순·오래된순 누를 때
   * 칸이 움직이는 오류」로 짚었다).
   *
   * 차례를 뒤집으면 칸이 통째로 재배열되는데 `scrollLeft`는 그대로 남는다. 그래서 옛 스크롤
   * 자리에 새 칸들이 걸려 **엉뚱한 주차가 보이고 왼쪽 붙박이(번호·이름) 아래로 칸이 잘려** 보인다.
   * 차례·축·필터가 바뀔 때마다 `resetKey`를 달리 주면 그 자리에서 처음으로 돌아온다.
   */
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = 0;
  }, [resetKey]);

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    // 터치는 기본 스크롤이 더 낫다. 오른쪽·가운데 버튼도 건드리지 않는다
    if (e.pointerType === "touch" || e.button !== 0) return;
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    st.current = { down: true, moved: false, startX: e.clientX, startY: e.clientY, scroll: el.scrollLeft };
  }, []);

  useEffect(() => {
    function move(e: PointerEvent) {
      const s = st.current;
      const el = ref.current;
      if (!s.down || !el) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      // 세로로 더 많이 움직였다면 페이지를 넘기려는 손이다 — 비켜 준다
      if (!s.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        s.down = false;
        return;
      }
      if (!s.moved && Math.abs(dx) < 3) return;
      s.moved = true;
      el.scrollLeft = s.scroll - dx;
      // 끄는 동안 글자가 선택되지 않게 한다
      e.preventDefault();
    }
    function up() {
      const s = st.current;
      if (s.down && s.moved) {
        // 끌기로 끝난 몸짓이면 뒤따르는 click 한 번을 삼킨다
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        // 클릭이 안 오는 경우(끌다가 밖에서 뗌)를 대비해 곧 걷어낸다
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
      }
      st.current.down = false;
    }
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return { ref, onPointerDown };
}

/** 끌 수 있는 자리임을 손 모양으로 알린다 — 실제 스크롤 가능 여부와 무관하게 붙여도 된다 */
export const DRAG_SCROLL_CLASS = "cursor-grab active:cursor-grabbing select-none";
