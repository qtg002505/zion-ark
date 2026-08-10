import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";

/**
 * 년·월을 **바둑판에서 고르는 팝업** (2026-08-11 리드 지시).
 *
 * 종전에는 달력 위 「◀ 2026년 8월 ▶」에서 화살표로만 옮길 수 있었다. 지난 3월이나
 * 내년 1월로 가려면 열 번 넘게 눌러야 해서, **라벨 자체를 눌러** 바로 짚게 했다.
 *
 * 두 겹으로 판다 — 월 판에서 「2026년」을 다시 누르면 년 판(12년)이 열린다.
 * 세 겹(10년 단위)까지 가는 달력도 있지만 여기서 다룰 범위는 기수 몇 해뿐이라
 * 두 겹이면 넉넉하고, 겹이 깊어질수록 어디에 있는지 놓치기 쉽다.
 *
 * 자리는 `AnchoredPopover`가 잡는다 — 누른 라벨 바로 아래에서 열리고 좁은 화면에서는
 * 화면 아래 시트로 붙는다. 달력 칸 팝오버와 같은 규칙이라 눈이 따라간다.
 */
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
/** 년 판 한 쪽에 담는 해의 수 — 월 판과 같은 4열 3행이라 눈이 옮겨 가도 형태가 안 바뀐다 */
const YEARS_PER_PAGE = 12;

export function MonthYearPicker({
  year,
  month,
  anchor,
  onPick,
  onClose,
}: {
  /** 지금 보고 있는 해 */
  year: number;
  /** 지금 보고 있는 달 (0~11) */
  month: number;
  /** 누른 라벨 — 이 자리에서 열린다 */
  anchor: HTMLElement | null;
  onPick: (year: number, month: number) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<"month" | "year">("month");
  /** 판에서 넘겨 보고 있는 해 — 고르기 전까지는 달력 쪽을 건드리지 않는다 */
  const [viewYear, setViewYear] = useState(year);
  /** 년 판의 첫 해 — 보고 있는 해가 판 가운데쯤 오게 맞춘다 */
  const [pageStart, setPageStart] = useState(year - 5);

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  return (
    <AnchoredPopover anchor={anchor} width={272} label="년·월 고르기" onClose={onClose}>
      <div className="p-3">
        {/* 판 머리 — 좌우 화살표로 넘기고, 가운데를 누르면 한 겹 위로 올라간다 */}
        <div className="mb-2 flex items-center gap-1">
          <button
            onClick={() =>
              view === "month" ? setViewYear((y) => y - 1) : setPageStart((s) => s - YEARS_PER_PAGE)
            }
            aria-label={view === "month" ? "이전 해" : "이전 12년"}
            className="rounded-lg border border-zion-200 p-1.5 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronLeft size={15} />
          </button>
          {view === "month" ? (
            <button
              onClick={() => {
                setPageStart(viewYear - 5);
                setView("year");
              }}
              className="flex-1 rounded-lg px-2 py-1.5 text-center text-[14px] font-bold text-zion-900 transition hover:bg-zion-50"
              title="해를 골라 봅니다"
            >
              {viewYear}년
            </button>
          ) : (
            <span className="flex-1 px-2 py-1.5 text-center text-[14px] font-bold text-zion-900">
              {pageStart}–{pageStart + YEARS_PER_PAGE - 1}
            </span>
          )}
          <button
            onClick={() =>
              view === "month" ? setViewYear((y) => y + 1) : setPageStart((s) => s + YEARS_PER_PAGE)
            }
            aria-label={view === "month" ? "다음 해" : "다음 12년"}
            className="rounded-lg border border-zion-200 p-1.5 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {view === "month" ? (
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((label, i) => {
              const picked = viewYear === year && i === month;
              const isNow = viewYear === thisYear && i === thisMonth;
              return (
                <button
                  key={label}
                  onClick={() => {
                    onPick(viewYear, i);
                    onClose();
                  }}
                  aria-current={picked ? "true" : undefined}
                  className={
                    "rounded-lg border py-2 text-[12px] font-semibold transition " +
                    (picked
                      ? "border-zion-700 bg-zion-700 text-white"
                      : isNow
                        ? "border-zion-400 bg-white text-zion-700 hover:bg-zion-50"
                        : "border-zion-100 bg-white text-ink hover:bg-zion-50")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i).map((y) => {
              const picked = y === year;
              const isNow = y === thisYear;
              return (
                <button
                  key={y}
                  onClick={() => {
                    setViewYear(y);
                    setView("month");
                  }}
                  aria-current={picked ? "true" : undefined}
                  className={
                    "rounded-lg border py-2 text-[12px] font-semibold transition " +
                    (picked
                      ? "border-zion-700 bg-zion-700 text-white"
                      : isNow
                        ? "border-zion-400 bg-white text-zion-700 hover:bg-zion-50"
                        : "border-zion-100 bg-white text-ink hover:bg-zion-50")
                  }
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}

        {/* 이번 달로 — 판을 몇 번 넘겼든 한 번에 돌아온다 */}
        <button
          onClick={() => {
            onPick(thisYear, thisMonth);
            onClose();
          }}
          className="mt-2 w-full rounded-lg border border-zion-200 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          이번 달 ({thisYear}년 {thisMonth + 1}월)
        </button>
      </div>
    </AnchoredPopover>
  );
}
