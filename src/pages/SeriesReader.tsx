import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Search, Hourglass } from "lucide-react";
import { REVELATION_SERIES, COMING_SERIES } from "../content/revelation";
import { PageHeader, Card } from "./common";

/** 자료실 시리즈 리더 — 장 목록·선택·검색·본문 (착수지시문 작업 2) */
export function SeriesReader() {
  const { seriesId } = useParams();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");

  const coming = COMING_SERIES.find((s) => s.id === seriesId);
  if (coming) {
    return (
      <div>
        <PageHeader crumb="자료실 시리즈" title={coming.name} />
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <Hourglass size={32} className="text-zion-300" />
            <p className="mt-4 text-[15px] font-semibold text-zion-900">준비 중입니다</p>
            <p className="mt-1 max-w-sm text-[13px] text-gray-500">
              {coming.id === "acts"
                ? "원본 두 벌(마태 마크다운 / 교수안) 중 기준 소스가 결정되면 본문이 탑재됩니다."
                : "원본 자료 정리 후 본문이 탑재됩니다."}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const series = REVELATION_SERIES;
  const currentId = params.get("ch") ?? series.chapters[0].id;
  const current = series.chapters.find((c) => c.id === currentId) ?? series.chapters[0];

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return series.chapters;
    return series.chapters.filter(
      (c) => c.label.includes(q) || c.title.includes(q) || (c.body ?? "").includes(q),
    );
  }, [series, query]);

  return (
    <div>
      <PageHeader
        crumb="자료실 시리즈"
        title={series.name}
        desc="총론&개요 → 계1장 ~ 계22장. 교리 본문은 원문 그대로 이관하며 재작성하지 않습니다."
      />

      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-1">
        <div className="col-span-1">
          <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="장 검색"
              aria-label="장 검색"
              className="w-full bg-transparent text-[12px] outline-none"
            />
          </div>
          <nav aria-label="장 목록" className="max-h-[60vh] overflow-y-auto rounded-xl border border-zion-100 bg-white p-2 shadow-sm">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ ch: c.id })}
                className={
                  "block w-full rounded-lg px-3 py-2 text-left text-[13px] transition " +
                  (c.id === current.id
                    ? "bg-zion-800 font-semibold text-white"
                    : "text-gray-700 hover:bg-zion-50")
                }
              >
                {c.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-gray-400">검색 결과 없음</p>
            )}
          </nav>
        </div>

        <div className="col-span-3 max-md:col-span-1">
          <Card>
            <div className="text-[12px] font-semibold text-gold-700">{current.label}</div>
            <h2 className="mt-1 text-[19px] font-bold text-zion-900">{current.title}</h2>
            <div className="mt-4 whitespace-pre-wrap border-t border-gray-100 pt-4 text-[14px] leading-relaxed text-gray-700">
              {current.body ?? "원문 이관 대기 중입니다."}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
