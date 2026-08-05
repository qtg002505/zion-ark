import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ELEMENTARY_LESSONS, type Lesson } from "../content/lessons";
import { PageHeader, Card } from "./common";

const DETAIL_LABELS: [keyof NonNullable<Lesson["detail"]>, string][] = [
  ["core", "교육 핵심"],
  ["priorView", "기존 관점"],
  ["expectedReactions", "예상 반응·질문"],
  ["cautions", "강의 주의사항"],
  ["guidingQuestions", "유도형 질문"],
  ["counseling", "예방·상담"],
  ["correction", "교정 포인트"],
];

/** 강의 교안 — 초등 23강, 강당 7항목 구조 열람 */
export function Lessons() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Lesson>(ELEMENTARY_LESSONS[0]);

  const list = useMemo(() => {
    const q = query.trim();
    return ELEMENTARY_LESSONS.filter((l) => !q || l.title.includes(q));
  }, [query]);

  return (
    <div>
      <PageHeader
        crumb="강사 도우미"
        title="강의 교안 (초등 23강)"
        desc="강 1건당 7항목: 교육 핵심 · 기존 관점 · 예상 반응·질문 · 강의 주의사항 · 유도형 질문 · 예방·상담 · 교정 포인트. 중등·고등 교안은 원본 확보 후 추가됩니다."
      />

      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-1">
        <div className="col-span-1">
          <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="강 검색"
              aria-label="강 검색"
              className="w-full bg-transparent text-[12px] outline-none"
            />
          </div>
          <nav aria-label="강 목록" className="max-h-[60vh] overflow-y-auto rounded-xl border border-zion-100 bg-white p-2 shadow-sm">
            {list.map((l) => (
              <button
                key={l.no}
                onClick={() => setSelected(l)}
                className={
                  "block w-full rounded-lg px-3 py-2 text-left text-[12px] transition " +
                  (l.no === selected.no
                    ? "bg-zion-800 font-semibold text-white"
                    : l.detail
                      ? "text-gray-700 hover:bg-zion-50"
                      : "text-gray-400 hover:bg-zion-50")
                }
              >
                {l.title}
              </button>
            ))}
          </nav>
        </div>

        <div className="col-span-3 max-md:col-span-1">
          <Card>
            <h2 className="text-[18px] font-bold text-zion-900">{selected.title}</h2>
            {selected.detail ? (
              <div className="mt-4 space-y-4">
                {DETAIL_LABELS.map(([key, label]) => (
                  <div key={key}>
                    <div className="text-[12px] font-bold text-gold-700">{label}</div>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-gray-700">
                      {selected.detail![key]}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 py-8 text-center text-[13px] text-gray-400">
                이 강의 교안 원문은 이관 대기 중입니다. 원 저장소 콘텐츠 이관 후 7항목 전체가 표시됩니다.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
