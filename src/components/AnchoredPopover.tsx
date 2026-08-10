import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * 누른 자리에서 열리는 팝오버 (2026-08-10 리드 지시).
 *
 * 화면 한가운데 뜨는 모달은 "어느 날짜를 눌렀는지" 감각을 끊는다. 달력처럼 칸이 격자로
 * 놓인 화면에서는 **그 칸 옆에서 열려야** 눈이 따라간다.
 *
 * 위치 규칙 — 화면 밖으로 나가지 않는 것이 먼저다:
 * - 기본은 칸 **아래**. 아래 공간이 모자라면 **위**로 뒤집는다
 * - 좌우는 화면 안으로 밀어 넣는다(clamp). 오른쪽 끝 칸을 눌러도 잘리지 않는다
 * - 위아래 어느 쪽도 좁으면(좁은 화면) **화면 아래 시트**로 붙인다 — 억지로 띄우면
 *   팝오버가 화면을 넘고 스크롤도 안 된다
 *
 * 스크롤·크기 변경이 일어나면 자리를 다시 잡는다. 앵커가 화면 밖으로 나가면 닫는다 —
 * 허공에 떠 있는 팝오버만큼 헷갈리는 것이 없다.
 */
const GAP = 8;
const MARGIN = 8;
/** 이보다 좁으면 앵커를 포기하고 하단 시트로 — 좁은 화면에서 억지로 붙이면 읽을 수 없다 */
const SHEET_BREAKPOINT = 640;

export function AnchoredPopover({
  anchor,
  width = 340,
  label,
  onClose,
  children,
}: {
  /** 누른 요소 — 이 자리를 기준으로 뜬다 */
  anchor: HTMLElement | null;
  width?: number;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<Element | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; sheet: boolean } | null>(null);

  // 그리기 전에 자리를 잡는다 — 잡히기 전에 보이면 한 번 튄다
  useLayoutEffect(() => {
    function place() {
      if (!anchor) return;
      const a = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;

      if (vw < SHEET_BREAKPOINT) {
        setPos({ top: 0, left: 0, sheet: true });
        return;
      }

      const h = panelRef.current?.offsetHeight ?? 320;
      const below = vh - a.bottom - GAP;
      const above = a.top - GAP;
      // 아래가 좁고 위가 더 넓으면 위로 뒤집는다
      const top = below >= h || below >= above ? a.bottom + GAP : Math.max(MARGIN, a.top - GAP - h);
      const left = Math.min(Math.max(MARGIN, a.left), vw - width - MARGIN);
      setPos({ top: Math.min(top, vh - MARGIN - Math.min(h, vh - 2 * MARGIN)), left, sheet: false });
    }
    place();

    function onScrollOrResize() {
      if (!anchor) return;
      const a = anchor.getBoundingClientRect();
      const vh = document.documentElement.clientHeight;
      // 앵커가 화면 밖으로 사라지면 닫는다
      if (a.bottom < 0 || a.top > vh) {
        onClose();
        return;
      }
      place();
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [anchor, width, onClose]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (returnFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  const sheet = pos?.sheet ?? false;

  return (
    <>
      {/* 바깥을 누르면 닫는다. 팝오버는 모달이 아니므로 배경을 어둡게 덮지 않는다 */}
      <div
        className={"fixed inset-0 z-40 " + (sheet ? "bg-zion-950/40" : "")}
        onPointerDown={(e) => {
          if (!panelRef.current?.contains(e.target as Node)) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={
          "fixed z-50 overflow-y-auto rounded-2xl border border-zion-200 bg-white shadow-2xl " +
          (sheet
            ? "inset-x-2 bottom-2 max-h-[70dvh]"
            : "max-h-[70dvh]")
        }
        style={
          sheet
            ? undefined
            : { top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, visibility: pos ? "visible" : "hidden" }
        }
      >
        {children}
      </div>
    </>
  );
}
