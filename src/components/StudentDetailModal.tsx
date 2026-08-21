import { useEffect, useRef, useState } from "react";
import { ExternalLink, X, ArrowUp, PencilLine, Check } from "lucide-react";
import { Link } from "./TransitionLink";
import { Portal } from "./Portal";
import { useSession } from "../lib/auth";
import { canEditCohortRecord } from "../lib/permissions";
import { STUDENTS, COHORT_KEY } from "../content/cohort-mock";
import { StudentDetailPage } from "../pages/StudentDetailPage";

/**
 * 수강생 상세 팝업 (2026-08-10 리드 지시).
 *
 * 종전에는 목록에서 상세로 **페이지가 통째로 바뀌어**, 여러 명을 훑어볼 때 목록과 상세를
 * 오가며 스크롤 위치까지 잃었다. 팝업이면 목록을 그대로 둔 채 열고 닫는다.
 *
 * 상세 내용은 `StudentDetailPage`를 **그대로 재사용**한다(`embedded`). 화면을 두 벌
 * 만들면 한쪽만 고쳐지는 일이 반드시 생긴다 — 전체 페이지(`/students/:key`)도 그대로 둔다.
 *
 * 지킨 것 넷:
 * - `Esc`로 닫는다
 * - 열려 있는 동안 **뒤 본문이 스크롤되지 않게** 막는다
 * - 열 때 포커스를 팝업 안으로 옮기고, 닫으면 **누른 자리로 되돌린다**
 * - 배경을 눌러도 닫힌다. 다만 팝업 안을 드래그하다 배경에서 손을 떼는 경우는 제외한다
 */
export function StudentDetailModal({
  studentKey,
  onClose,
}: {
  studentKey: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<Element | null>(null);
  /** 배경 누름이 팝업 안에서 시작했는지 — 드래그하다 놓았을 때 잘못 닫히는 것을 막는다 */
  const downInsideRef = useRef(false);
  /**
   * 맨 위로(2026-08-13 요청) — 셸의 전역 `ScrollToTop`은 `window.scrollY`를 보는데, 이 팝업은
   * `document.body`를 잠그고 **이 안(overflow-y-auto)에서만** 스크롤돼 전역 버튼이 안 뜬다.
   * 팝업 전용으로 따로 만든다.
   */
  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const [showTop, setShowTop] = useState(false);
  /**
   * 보기⇄편집 상태를 여기서 쥔다(2026-08-13 요청: "전체화면 옆에 수정 버튼이 자리하게").
   * `StudentDetailPage`에 `mode`/`onModeChange`로 넘겨 그 안의 칩·입력이 이 값을 따르게 한다.
   */
  const session = useSession();
  const cohortKey = COHORT_KEY;
  const rawCanEdit = canEditCohortRecord(session, cohortKey);
  const [mode, setMode] = useState<"view" | "edit">("view");

  const student = STUDENTS.find((s) => s.key === studentKey);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    closeRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // 닫으면 원래 누른 자리로 포커스를 돌려준다 — 키보드로 목록을 훑던 사람이 길을 잃지 않게
      (returnFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    function onScroll() {
      setShowTop(el!.scrollTop > 300);
    }
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!student) return null;

  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollBoxRef.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  /**
   * ⚠️ **`Portal`을 벗기지 않는다.** 이 팝업은 목록 화면 안에서 열리는데, 그 위쪽 `main`이
   * `view-transition-name` 때문에 쌓임 맥락을 만든다. 맥락 안에 있으면 `z-50`을 줘도
   * 헤더(`z-20`)에 눌려 **팝업 머리가 잘린다**(2026-08-13에 실제로 그랬다).
   */
  return (
    <Portal>
      <div
        ref={scrollBoxRef}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zion-950/50 p-3 sm:p-6"
        onPointerDown={(e) => {
          downInsideRef.current = panelRef.current?.contains(e.target as Node) ?? false;
        }}
        onPointerUp={(e) => {
          const outside = !panelRef.current?.contains(e.target as Node);
          if (outside && !downInsideRef.current) onClose();
          downInsideRef.current = false;
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${student.name} 수강생 정보 상세`}
          className="my-2 w-full max-w-4xl rounded-2xl bg-surface shadow-2xl"
        >
        {/* 팝업 머리 — 스크롤해도 닫기 버튼이 남아 있어야 한다 */}
        <div className="sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-zion-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          {/* 이름·분반은 아래 본문(기본정보 박스)에서 바로 보이므로 머리에서 뺐다(2026-08-13) */}
          <div className="min-w-0 flex-1" />
          {/*
            전체 화면 진입도 눈에 띄어야 한다는 지적을 받아 테두리를 세우고 글자를 키웠다
            (2026-08-10). 좁은 화면에서는 글자를 접고 아이콘만 남겨 자리를 아낀다.
          */}
          <Link
            viewTransition
            to={`/students/${encodeURIComponent(student.key)}`}
            onClick={onClose}
            className="flex shrink-0 items-center gap-1 rounded-lg border-2 border-zion-300 bg-white px-2.5 py-1.5 text-[12px] font-bold text-zion-700 transition hover:border-zion-500 hover:bg-zion-50"
            title="전체 화면으로 열기"
            aria-label="전체 화면으로 열기"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">전체 화면</span>
          </Link>
          {/* 수정⇄완료 — 「전체 화면」 옆에 자리한다(2026-08-13 요청). 권한 없으면 아예 안 보여준다 */}
          {rawCanEdit &&
            (mode === "view" ? (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="flex shrink-0 items-center gap-1 rounded-lg border-2 border-zion-300 bg-white px-2.5 py-1.5 text-[12px] font-bold text-zion-700 transition hover:border-zion-500 hover:bg-zion-50"
              >
                <PencilLine size={13} />
                <span className="hidden sm:inline">수정</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("view")}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-zion-700 px-2.5 py-1.5 text-[12px] font-bold text-white transition hover:bg-zion-600"
              >
                <Check size={13} />
                <span className="hidden sm:inline">완료</span>
              </button>
            ))}
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-transparent bg-zion-100 text-ink transition hover:border-zion-300 hover:bg-zion-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <StudentDetailPage studentKey={studentKey} embedded mode={mode} onModeChange={setMode} />
        </div>
        </div>

        {/* 맨 위로 — 셸 전역 버튼은 이 팝업 안에서는 안 뜬다(위 설명) */}
        {showTop && (
          <button
            type="button"
            onClick={toTop}
            aria-label="맨 위로"
            title="맨 위로"
            className="fixed bottom-4 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-zion-200 bg-white text-zion-700 shadow-lg transition hover:bg-zion-50 sm:right-6"
            style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </Portal>
  );
}
