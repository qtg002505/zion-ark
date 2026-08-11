import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { Link } from "./TransitionLink";
import { STUDENTS } from "../content/cohort-mock";
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

  if (!student) return null;

  return (
    <div
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
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-ink-soft">수강생 정보 상세</div>
            <div className="truncate text-[16px] font-bold text-zion-900">
              {student.name}
              <span className="ml-1.5 text-[12px] font-medium text-ink-soft">{student.division}</span>
            </div>
          </div>
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
          <StudentDetailPage studentKey={studentKey} embedded />
        </div>
      </div>
    </div>
  );
}
