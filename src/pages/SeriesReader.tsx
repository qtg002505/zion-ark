import { useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { findSeries } from "../content/series-content";
import { MarkdownLite, splitSections } from "../lib/markdown";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { PageHeader, Card } from "./common";

/** 자료실 시리즈 리더 — 장 목록·선택·검색·본문. 예그행은 본문/교수안 그룹 구분 */
export function SeriesReader() {
  const { seriesId } = useParams();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");

  const series = findSeries(seriesId);

  const chapters = series?.chapters ?? [];
  const currentId = params.get("ch") ?? chapters[0]?.id;
  const current = chapters.find((c) => c.id === currentId) ?? chapters[0];

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return chapters;
    return chapters.filter(
      (c) => c.label.includes(q) || c.title.includes(q) || c.body.includes(q),
    );
  }, [chapters, query]);

  // 긴 본문은 소주제 단위로 접어 둔다
  const parsed = useMemo(() => (current ? splitSections(current.body) : null), [current]);
  const items: AccordionItem[] = (parsed?.sections ?? []).map((sec) => ({
    id: sec.id,
    title: sec.title,
    hint: sec.body
      .split("\n")
      .find((l) => l.trim())
      ?.replace(/^[-•#\s]+/, ""),
    content: <MarkdownLite text={sec.body} />,
  }));

  if (!series) return <Navigate to="/" replace />;

  // 그룹 유지하며 목록 구성
  const groups: { name: string | null; items: typeof chapters }[] = [];
  for (const c of filtered) {
    const last = groups[groups.length - 1];
    if (!last || last.name !== c.group) groups.push({ name: c.group, items: [c] });
    else last.items.push(c);
  }

  return (
    <div>
      <PageHeader crumb="자료실 시리즈" title={series.name} desc={series.desc} />

      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-1">
        <div className="col-span-1">
          <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="장 제목·본문 검색"
              aria-label="장 검색"
              className="w-full bg-transparent text-[12px] outline-none"
            />
          </div>
          <nav aria-label="장 목록" className="max-h-[70vh] overflow-y-auto rounded-xl border border-zion-100 bg-white p-2 shadow-sm">
            {groups.map((g, gi) => (
              <div key={gi}>
                {g.name && (
                  <div className="mt-2 px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-gold-700 first:mt-0">
                    {g.name}
                  </div>
                )}
                {g.items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setParams({ ch: c.id })}
                    className={
                      "block w-full rounded-lg px-3 py-2 text-left text-[12px] leading-snug transition " +
                      (current && c.id === current.id
                        ? "bg-zion-800 font-semibold text-white"
                        : "text-gray-700 hover:bg-zion-50")
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-gray-400">검색 결과 없음</p>
            )}
          </nav>
        </div>

        <div className="col-span-3 max-md:col-span-1">
          <Card>
            {current ? (
              <>
                {current.group && (
                  <div className="text-[12px] font-semibold text-gold-700">{current.group}</div>
                )}
                <h2 className="mt-0.5 mb-3 text-[19px] font-bold text-zion-900">{current.title}</h2>
                {items.length > 0 ? (
                  <>
                    {parsed?.lead && (
                      <div className="mb-3 rounded-lg bg-zion-50 px-3 py-2">
                        <MarkdownLite text={parsed.lead} />
                      </div>
                    )}
                    <Accordion items={items} resetKey={current.id} />
                  </>
                ) : (
                  <div className="border-t border-gray-100 pt-3">
                    <MarkdownLite text={current.body} />
                  </div>
                )}
              </>
            ) : (
              <p className="py-12 text-center text-[13px] text-gray-400">장을 선택해 주세요.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
