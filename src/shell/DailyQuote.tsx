import { useMemo, useState } from "react";
import { Link } from "../components/TransitionLink";
import { ChevronDown, ChevronUp, Quote } from "lucide-react";
import { QUOTE_ITEMS } from "../content/quotes-data";
import { kstToday, pickOfDay } from "../lib/daily";

const COLLAPSED_KEY = "zion_ark_daily_quote_collapsed";

/**
 * 오늘의 어록 — 화면 맨 위 띠 (2026-08-10 리드 지시).
 *
 * **모두가 같은 날 같은 어록을 본다** — 무작위가 아니라 경과일수 기반이다(`lib/daily.ts`).
 * 그래야 사명자끼리 "오늘 어록 보셨어요?"가 성립한다.
 *
 * ⚠️ 어록 본문은 **원문 그대로** 싣는다. 요약·재작성하지 않는다(불변식 5).
 *
 * **닫지 않고 접는다** (2026-08-10 리드 지시). 종전에는 닫으면 그날 하루 사라져
 * 다시 보고 싶어도 방법이 없었다. 이제 접어도 얇은 띠가 남아 언제든 다시 편다.
 * 접힘 상태는 날짜와 함께 저장한다 — 날이 바뀌면 새 어록이 펼쳐진 채로 뜬다.
 */
export function DailyQuote() {
  const today = kstToday();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === today;
    } catch {
      return false;
    }
  });
  const [full, setFull] = useState(false);

  const quote = useMemo(() => pickOfDay(QUOTE_ITEMS), []);
  if (!quote) return null;

  function setCollapsedState(next: boolean) {
    try {
      if (next) localStorage.setItem(COLLAPSED_KEY, today);
      else localStorage.removeItem(COLLAPSED_KEY);
    } catch {
      /* 저장 실패해도 이번 세션 동안은 상태가 유지된다 */
    }
    setCollapsed(next);
  }

  // 접힌 모습 — 얇은 띠 하나. 여기를 누르면 다시 펼쳐진다
  if (collapsed) {
    return (
      <div className="border-b border-zion-800 bg-zion-900">
        <button
          onClick={() => setCollapsedState(false)}
          aria-expanded={false}
          className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-1.5 text-left transition hover:bg-zion-800 sm:px-6"
        >
          <span className="flex h-4 shrink-0 items-center gap-1 rounded bg-gold-500 px-1.5 text-[9.5px] font-black text-zion-950">
            <Quote size={9} /> 오늘의 어록
          </span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-white/60">{quote.text}</span>
          <span className="flex shrink-0 items-center gap-0.5 text-[10.5px] font-semibold text-gold-300">
            펼치기 <ChevronDown size={11} />
          </span>
        </button>
      </div>
    );
  }

  const long = quote.text.length > 90;

  return (
    <div className="border-b border-zion-800 bg-zion-900 text-white">
      <div className="mx-auto flex max-w-5xl items-start gap-2.5 px-4 py-2.5 sm:px-6">
        <span className="mt-0.5 flex h-5 shrink-0 items-center gap-1 rounded bg-gold-500 px-1.5 text-[10px] font-black text-zion-950">
          <Quote size={10} /> 오늘의 어록
        </span>

        <div className="min-w-0 flex-1">
          {/* 원문을 잘라내지 않는다 — 접힌 상태에서 줄 수만 줄이고 전문 보기로 편다 */}
          <p
            className={
              "text-[12.5px] leading-relaxed text-white/95 " + (!full && long ? "line-clamp-2" : "")
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
                onClick={() => setFull((v) => !v)}
                className="flex items-center gap-0.5 text-[10.5px] font-semibold text-gold-300 hover:underline"
              >
                {full ? (
                  <>
                    줄이기 <ChevronUp size={11} />
                  </>
                ) : (
                  <>
                    전문 보기 <ChevronDown size={11} />
                  </>
                )}
              </button>
            )}
            <Link viewTransition to="/quotes" className="text-[10.5px] font-semibold text-white/70 hover:underline">
              어록 전체
            </Link>
          </div>
        </div>

        <button
          onClick={() => setCollapsedState(true)}
          aria-expanded
          className="flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10.5px] text-white/50 transition hover:bg-white/10 hover:text-white/80"
          title="접어 둡니다 — 얇은 띠를 누르면 다시 펼쳐집니다"
        >
          접기 <ChevronUp size={11} />
        </button>
      </div>
    </div>
  );
}
