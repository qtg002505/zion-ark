import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { ROLE_LABELS, type RoleCode } from "../lib/types";
import { TRIBES } from "../content/centers";
import { PageHeader, Card, StatTile } from "./common";

/**
 * 사이트 이용 현황 (2026-08-15 리드 지시 — 「아크 사이트를 많이 쓰는지 확인」).
 *
 * **지파 신학부장 이상만** 본다 (`canViewSiteUsage` · 메뉴 숨김 + 라우트 가드).
 *
 * ⚠️ **집계만 낸다**(불변식 2). 누가 언제 들어왔는지는 화면에 없다 — 저장된 이름은
 * 「같은 사람의 재방문을 거른다」는 한 가지 목적에만 쓴다. 사람 단위 추적이 필요하면
 * 그것은 감사 로그의 영역이고 별도 승인이 있어야 한다.
 *
 * ⚠️ **지금 값은 이 브라우저에 쌓인 것뿐이다.** 방문 기록은 localStorage에 남으므로
 * 다른 기기·다른 사람의 방문은 안 보인다 — 실연동 시 서버가 세션에서 기록하면 그때
 * 진짜 전국 집계가 된다. 화면에도 이 한계를 적어 둔다.
 */
export function SiteUsage() {
  const { siteVisits } = useStore();
  /** 최근 며칠을 볼지 — 오늘 하루가 기본이고, 흐름을 보려면 늘린다 */
  const [days, setDays] = useState(7);

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    const inRange = siteVisits.filter((v) => v.date >= from);

    /** 오늘 들어온 계정 수 — 「당일 참석자수」 */
    const todayCount = siteVisits.filter((v) => v.date === today).length;

    /** 지파별 방문 계정 수 (기간 안, 사람 기준으로 한 번씩) */
    const byTribe = new Map<string, Set<string>>();
    for (const v of inRange) {
      const set = byTribe.get(v.tribe) ?? new Set<string>();
      set.add(v.userName);
      byTribe.set(v.tribe, set);
    }

    /** 역할별 — 누가 이 사이트를 실제로 쓰는지 */
    const byRole = new Map<RoleCode, Set<string>>();
    for (const v of inRange) {
      const set = byRole.get(v.roleCode) ?? new Set<string>();
      set.add(v.userName);
      byRole.set(v.roleCode, set);
    }

    /** 날짜별 방문 수 — 막대로 흐름을 본다 */
    const byDate: { date: string; n: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      byDate.push({ date: d, n: siteVisits.filter((v) => v.date === d).length });
    }

    return {
      todayCount,
      rangeUsers: new Set(inRange.map((v) => v.userName)).size,
      rangeVisits: inRange.length,
      byTribe,
      byRole,
      byDate,
    };
  }, [siteVisits, days, today]);

  const maxDay = Math.max(1, ...stats.byDate.map((d) => d.n));

  return (
    <div>
      <PageHeader
        crumb="사이트 이용 현황"
        title="사이트 이용 현황"
        desc="아크 사이트를 실제로 얼마나 쓰고 있는지 봅니다. 지파 신학부장 이상만 열람합니다 — 집계만 보이고 누가 들어왔는지는 나오지 않습니다."
      />

      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <StatTile label="오늘 들어온 사람" value={`${stats.todayCount}명`} sub={today} accent />
        <StatTile label={`최근 ${days}일 이용자`} value={`${stats.rangeUsers}명`} sub="같은 사람은 한 번만 셉니다" />
        <StatTile label={`최근 ${days}일 방문`} value={`${stats.rangeVisits}건`} sub="계정·날짜 하나당 한 건" />
      </div>

      <Card className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[14px] font-bold text-zion-900">날짜별 이용</div>
            <p className="mt-0.5 text-[12px] text-ink-soft">하루에 몇 사람이 들어왔는지입니다.</p>
          </div>
          <div className="flex rounded-lg bg-zion-100 p-0.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={
                  "rounded-md px-2.5 py-1 text-[12px] font-semibold transition " +
                  (days === d ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
                }
              >
                {d}일
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-1 overflow-x-auto">
          {stats.byDate.map((d) => (
            <div key={d.date} className="flex min-w-6 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-ink-soft">{d.n || ""}</span>
              <div
                className="w-full rounded-t bg-zion-700"
                style={{ height: `${Math.max(2, (d.n / maxDay) * 80)}px` }}
                title={`${d.date} · ${d.n}명`}
              />
              <span className="text-[9px] text-ink-soft">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Card>
          <div className="mb-3 text-[14px] font-bold text-zion-900">지파별 이용자</div>
          <ul className="space-y-1.5">
            {TRIBES.map((t) => {
              const n = stats.byTribe.get(t)?.size ?? 0;
              const max = Math.max(1, ...[...stats.byTribe.values()].map((s) => s.size));
              return (
                <li key={t} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-20 shrink-0 text-ink">{t}</span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zion-100">
                    <span
                      className="block h-full rounded-full bg-zion-700"
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right font-semibold text-zion-800">{n}명</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
            최근 {days}일에 한 번이라도 들어온 계정 수입니다 — 같은 사람이 여러 날 들어와도 한 번만 셉니다.
          </p>
        </Card>

        <Card>
          <div className="mb-3 text-[14px] font-bold text-zion-900">역할별 이용자</div>
          {stats.byRole.size === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-ink-soft">아직 쌓인 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-1.5">
              {[...stats.byRole.entries()]
                .sort((a, b) => b[1].size - a[1].size)
                .map(([role, set]) => (
                  <li key={role} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-ink">{ROLE_LABELS[role]}</span>
                    <span className="font-semibold text-zion-800">{set.size}명</span>
                  </li>
                ))}
            </ul>
          )}
          <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
            <strong className="text-ink">지금 수치는 이 브라우저에 쌓인 것뿐입니다.</strong> 다른
            기기·다른 분의 방문은 보이지 않으며, 백엔드 연동 후 전국 집계로 바뀝니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
