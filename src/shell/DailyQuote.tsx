import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Quote } from "lucide-react";
import { QUOTE_ITEMS } from "../content/quotes-data";
import { kstToday, pickOfDay } from "../lib/daily";

const HIDDEN_KEY = "zion_ark_daily_quote_hidden";

/**
 * 오늘의 어록 — 화면 맨 위 띠 (2026-08-10 리드 지시).
 *
 * **모두가 같은 날 같은 어록을 본다** — 무작위가 아니라 경과일수 기반이다(`lib/daily.ts`).
 * 그래야 사명자끼리 "오늘 어록 보셨어요?"가 성립한다.
 *
 * ⚠️ 어록 본문은 **원문 그대로** 싣는다. 요약·재작성하지 않는다(불변식 5).
 * 길면 접어서 보여 주되 잘린 것임을 알리고, 펼치면 전문이 나온다.
 *
 * 접으면 그날 하루는 다시 뜨지 않는다 — 매번 닫아야 하면 배너가 방해물이 된다.
 */
export function DailyQuote() {
  const today = kstToday();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDDEN_KEY) === today;
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);

  const quote = useMemo(() => pickOfDay(QUOTE_ITEMS), []);
  if (!quote || hidden) return null;

  // 원문을 자르지 않고 "접힌 상태에서 몇 줄만 보이게" 한다 — 글자를 잘라내면 원문 훼손이다
  const long = quote.text.length > 90;

  function hideForToday() {
    try {
      localStorage.setItem(HIDDEN_KEY, today);
    } catch {
      /* 저장 실패해도 이번 세션 동안은 닫힌다 */
    }
    setHidden(true);
  }

  return (
    <div className="border-b border-zion-800 bg-zion-900 text-white">
      <div className="mx-auto flex max-w-5xl items-start gap-2.5 px-4 py-2.5 sm:px-6">
        <span className="mt-0.5 flex h-5 shrink-0 items-center gap-1 rounded bg-gold-500 px-1.5 text-[10px] font-black text-zion-950">
          <Quote size={10} /> 오늘의 어록
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={
              "text-[12.5px] leading-relaxed text-white/95 " + (!open && long ? "line-clamp-2" : "")
            }
          >
            {quote.text}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] text-white/60">
              총회장님 어록 · {quote.category} {quote.no}번
            </span>
            {long && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-0.5 text-[10.5px] font-semibold text-gold-300 hover:underline"
              >
                {open ? (
                  <>
                    접기 <ChevronUp size={11} />
                  </>
                ) : (
                  <>
                    전문 보기 <ChevronDown size={11} />
                  </>
                )}
              </button>
            )}
            <Link to="/quotes" className="text-[10.5px] font-semibold text-white/70 hover:underline">
              어록 전체
            </Link>
          </div>
        </div>

        <button
          onClick={hideForToday}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10.5px] text-white/50 transition hover:bg-white/10 hover:text-white/80"
          title="오늘 하루 접어 둡니다"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
