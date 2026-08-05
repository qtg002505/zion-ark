import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { elementaryLessons, type ElementaryLesson } from "../content/elementary-lessons";
import { PageHeader, Card } from "./common";

/** 강의 교안 — 초등 23강 원문 (교리 내용 재작성 금지, 원문 그대로 표시) */
export function Lessons() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ElementaryLesson>(elementaryLessons[0]);

  const list = useMemo(() => {
    const q = query.trim();
    if (!q) return elementaryLessons;
    return elementaryLessons.filter(
      (l) =>
        l.title.includes(q) ||
        l.sections.some((s) => s.label.includes(q) || s.items.some((i) => i.includes(q))),
    );
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
              placeholder="강 제목·내용 검색"
              aria-label="강 검색"
              className="w-full bg-transparent text-[12px] outline-none"
            />
          </div>
          <nav aria-label="강 목록" className="max-h-[65vh] overflow-y-auto rounded-xl border border-zion-100 bg-white p-2 shadow-sm">
            {list.map((l) => (
              <button
                key={l.lessonNo}
                onClick={() => setSelected(l)}
                className={
                  "block w-full rounded-lg px-3 py-2 text-left text-[12px] leading-snug transition " +
                  (l.lessonNo === selected.lessonNo
                    ? "bg-zion-800 font-semibold text-white"
                    : "text-gray-700 hover:bg-zion-50")
                }
              >
                {l.lessonNo}강 — {l.title}
              </button>
            ))}
            {list.length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-gray-400">검색 결과 없음</p>
            )}
          </nav>
        </div>

        <div className="col-span-3 max-md:col-span-1">
          <Card>
            <div className="text-[12px] font-semibold text-gold-700">{selected.lessonNo}강</div>
            <h2 className="mt-0.5 text-[19px] font-bold text-zion-900">{selected.title}</h2>
            <div className="mt-4 space-y-5">
              {selected.sections.map((sec) => (
                <div key={sec.id}>
                  <div className="border-b border-gold-300 pb-1 text-[13px] font-bold text-gold-700">
                    {sec.label}
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {sec.items.map((item, i) => (
                      <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-gray-700">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zion-400" />
                        <span className="whitespace-pre-wrap">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
