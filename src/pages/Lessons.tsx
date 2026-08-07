import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Hourglass, Search } from "lucide-react";
import { elementaryLessons } from "../content/elementary-lessons";
import { HIGH_LESSONS } from "../content/lessons-high";
import { MarkdownLite, splitSections } from "../lib/markdown";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { LessonNotes } from "../components/LessonNotes";
import { PageHeader, Card } from "./common";

type Course = "elementary" | "middle" | "high";

function toCourse(v: string | null): Course {
  return v === "high" || v === "middle" ? v : "elementary";
}

/**
 * 강의 교안 — 초등 23강(7항목 구조) · 고등 계시록 22장(원문 문서).
 * 두 과정 모두 소주제 접기로 제공한다 (긴 본문을 눌러서 펼쳐 읽는 동선).
 */
export function Lessons() {
  const [params, setParams] = useSearchParams();
  const course: Course = toCourse(params.get("course"));
  const [query, setQuery] = useState("");
  const [pickedEl, setPickedEl] = useState<number>(elementaryLessons[0].lessonNo);
  const [pickedHigh, setPickedHigh] = useState(HIGH_LESSONS[0]?.id ?? "");

  function switchCourse(next: Course) {
    setQuery("");
    setParams(next === "elementary" ? {} : { course: next });
  }

  const elList = useMemo(() => {
    const q = query.trim();
    if (!q) return elementaryLessons;
    return elementaryLessons.filter(
      (l) =>
        l.title.includes(q) ||
        l.sections.some((s) => s.label.includes(q) || s.items.some((i) => i.includes(q))),
    );
  }, [query]);

  const highList = useMemo(() => {
    const q = query.trim();
    if (!q) return HIGH_LESSONS;
    return HIGH_LESSONS.filter((l) => l.label.includes(q) || l.title.includes(q) || l.body.includes(q));
  }, [query]);

  const elCurrent = elementaryLessons.find((l) => l.lessonNo === pickedEl) ?? elementaryLessons[0];
  const highCurrent = HIGH_LESSONS.find((l) => l.id === pickedHigh) ?? HIGH_LESSONS[0];

  const elItems: AccordionItem[] = elCurrent.sections.map((sec) => ({
    id: String(sec.id),
    title: sec.label,
    hint: sec.items[0],
    content: (
      <ul className="space-y-1.5">
        {sec.items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-ink">
            <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-zion-400" />
            <span className="whitespace-pre-wrap">{item}</span>
          </li>
        ))}
      </ul>
    ),
  }));

  const highParsed = highCurrent ? splitSections(highCurrent.body) : { lead: "", sections: [] };
  const highItems: AccordionItem[] = highParsed.sections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    hint: sec.body.split("\n").find((l) => l.trim())?.replace(/^[-•]\s*/, ""),
    content: <MarkdownLite text={sec.body} />,
  }));

  return (
    <div>
      <PageHeader
        crumb="강사 도우미"
        title="강의 교안"
        desc={
          course === "elementary"
            ? "초등 23강 — 강 1건당 7항목: 교육 핵심 · 기존 관점 · 예상 반응·질문 · 강의 주의사항 · 유도형 질문 · 예방·상담 · 교정 포인트"
            : course === "high"
              ? "고등 계시록 22장 — 강 1건당 핵심 · 서론 · 본론 · 결론 구조. 원문 그대로 제공합니다."
              : "중등 강의자료 — 원본 확보 후 초등·고등과 같은 구조로 탑재됩니다."
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-zion-100 p-1" role="tablist" aria-label="과정 선택">
          {(
            [
              ["elementary", `초등 (${elementaryLessons.length}강)`],
              ["middle", "중등"],
              ["high", `고등 (${HIGH_LESSONS.length}강)`],
            ] as [Course, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={course === id}
              onClick={() => switchCourse(id)}
              className={
                "rounded-lg px-3 py-2 text-[13px] font-semibold whitespace-nowrap shrink-0 transition sm:px-4 " +
                (course === id ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
              }
            >
              {label}
            </button>
          ))}
        </div>
        {course !== "middle" && (
          <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-2">
            <Search size={13} className="text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="강 제목·내용 검색"
              aria-label="강 검색"
              className="w-36 bg-transparent text-[12px] outline-none"
            />
          </div>
        )}
      </div>

      {course === "middle" ? (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <Hourglass size={32} className="text-zion-300" />
            <p className="mt-4 text-[15px] font-semibold text-zion-900">중등 강의자료는 준비 중입니다</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-soft">
              원본을 확보하면 초등·고등과 같은 소주제 구조로 탑재합니다.
            </p>
          </div>
        </Card>
      ) : (
      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-1">
        <div className="col-span-1">
          <nav
            aria-label="강 목록"
            className="doc-list-scroll overflow-y-auto rounded-xl border border-zion-100 bg-white p-2 shadow-sm"
          >
            {course === "elementary"
              ? elList.map((l) => (
                  <button
                    key={l.lessonNo}
                    onClick={() => setPickedEl(l.lessonNo)}
                    className={
                      "block w-full rounded-lg px-3 py-2 text-left text-[12px] leading-snug transition " +
                      (l.lessonNo === elCurrent.lessonNo
                        ? "bg-zion-800 font-semibold text-white"
                        : "text-ink hover:bg-zion-50")
                    }
                  >
                    {l.lessonNo}강 — {l.title}
                  </button>
                ))
              : highList.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setPickedHigh(l.id)}
                    className={
                      "block w-full rounded-lg px-3 py-2 text-left text-[12px] leading-snug transition " +
                      (highCurrent && l.id === highCurrent.id
                        ? "bg-zion-800 font-semibold text-white"
                        : "text-ink hover:bg-zion-50")
                    }
                  >
                    <span className="block font-semibold">{l.label}</span>
                    <span className="block truncate opacity-70">{l.title}</span>
                  </button>
                ))}
            {(course === "elementary" ? elList : highList).length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-ink-soft">
                찾는 강이 없습니다. 다른 낱말로 검색해 보세요.
              </p>
            )}
          </nav>
        </div>

        <div className="col-span-3 max-md:col-span-1">
          <Card>
            {course === "elementary" ? (
              <>
                <div className="text-[12px] font-semibold text-zion-700">{elCurrent.lessonNo}강</div>
                <h2 className="mt-0.5 mb-4 text-[19px] font-bold text-zion-900">{elCurrent.title}</h2>
                <Accordion items={elItems} resetKey={`el-${elCurrent.lessonNo}`} />
                <LessonNotes
                  lessonKey={`elementary-${elCurrent.lessonNo}`}
                  lessonLabel={`초등 ${elCurrent.lessonNo}강 — ${elCurrent.title}`}
                />
              </>
            ) : highCurrent ? (
              <>
                <div className="text-[12px] font-semibold text-zion-700">{highCurrent.label}</div>
                <h2 className="mt-0.5 mb-3 text-[19px] font-bold text-zion-900">{highCurrent.title}</h2>
                {highParsed.lead && (
                  <div className="mb-3 rounded-lg bg-zion-50 px-3 py-2">
                    <MarkdownLite text={highParsed.lead} />
                  </div>
                )}
                <Accordion items={highItems} resetKey={`high-${highCurrent.id}`} />
                <LessonNotes
                  lessonKey={`high-${highCurrent.id}`}
                  lessonLabel={`고등 ${highCurrent.label} — ${highCurrent.title}`}
                />
              </>
            ) : (
              <p className="py-12 text-center text-[13px] text-ink-soft">교안을 선택해 주세요.</p>
            )}
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
