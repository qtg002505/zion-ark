import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "../components/TransitionLink";
import { ChevronLeft, ChevronRight, Hourglass, Search } from "lucide-react";
import { elementaryLessons } from "../content/elementary-lessons";
import { HIGH_LESSONS } from "../content/lessons-high";
import { keywordOf } from "../content/curriculum-mock";
import { MarkdownLite, splitSections } from "../lib/markdown";
import { looseIncludes } from "../lib/text-match";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { LessonNotes } from "../components/LessonNotes";
import { LessonResources } from "../components/LessonResources";
import { INSTRUCTOR_BATGARI_FOLDERS } from "../lib/types";
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
        looseIncludes(l.title, q) ||
        l.sections.some((s) => looseIncludes(s.label, q) || s.items.some((i) => looseIncludes(i, q))),
    );
  }, [query]);

  const highList = useMemo(() => {
    const q = query.trim();
    if (!q) return HIGH_LESSONS;
    return HIGH_LESSONS.filter(
      (l) => looseIncludes(l.label, q) || looseIncludes(l.title, q) || looseIncludes(l.body, q),
    );
  }, [query]);

  const elCurrent = elementaryLessons.find((l) => l.lessonNo === pickedEl) ?? elementaryLessons[0];
  const highCurrent = HIGH_LESSONS.find((l) => l.id === pickedHigh) ?? HIGH_LESSONS[0];

  // 강 이동 — 목록을 다시 찾아 올라가지 않고 읽던 자리에서 앞뒤로 넘긴다.
  // 검색 중이면 걸러진 목록 안에서만 움직인다 (보이는 것과 넘어가는 곳을 맞춘다).
  const visibleIds =
    course === "elementary" ? elList.map((l) => String(l.lessonNo)) : highList.map((l) => l.id);
  const currentId = course === "elementary" ? String(elCurrent.lessonNo) : (highCurrent?.id ?? "");
  const pos = visibleIds.indexOf(currentId);

  function moveLesson(step: number) {
    const next = visibleIds[pos + step];
    if (next === undefined) return;
    if (course === "elementary") setPickedEl(Number(next));
    else setPickedHigh(next);
  }

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
        crumb="강의 도우미"
        title="강의 교안"
        desc={
          course === "elementary"
            ? "초등 23강 — 강 1건당 7항목: 교육 핵심 · 기존 관점 · 예상 반응·질문 · 강의 주의사항 · 유도형 질문 · 예방·상담 · 교정 포인트"
            : course === "high"
              ? "고등 계시록 22장 — 강 1건당 핵심 · 서론 · 본론 · 결론 구조. 원문 그대로 제공합니다."
              : "중등 강의 교안 — 준비 중입니다. 원본을 확보하면 초등·고등과 같은 소주제 구조로 탑재합니다."
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-zion-100 p-1" role="tablist" aria-label="과정 선택">
          {(
            [
              ["elementary", `초등 (${elementaryLessons.length}강)`],
              ["middle", "중등 (준비 중)"],
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

      {/*
        밭갈이는 교안과 별개 자료지만 개강 초반에는 같이 쓴다. 자료실까지 찾아가지 않아도
        어디 있는지 알도록 다리만 놓는다 — 폴더 이름은 types.ts 한 곳에서 읽는다.
      */}
      <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
        개강 초반에는 <span className="font-semibold text-zion-700">밭갈이</span> 자료를 교안과 함께
        씁니다 ({INSTRUCTOR_BATGARI_FOLDERS.join(" · ")}) —{" "}
        <Link
          viewTransition
          to="/library?section=instructor"
          className="font-semibold text-zion-700 underline-offset-2 hover:underline"
        >
          밭갈이 자료실 열기
        </Link>
      </p>

      {course === "middle" ? (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <Hourglass size={32} className="text-zion-300" />
            <p className="mt-4 text-[15px] font-semibold text-zion-900">중등 강의 교안은 준비 중입니다</p>
            <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-soft">
              원본을 확보하면 초등·고등과 같은 소주제 구조로 탑재합니다. 그때까지는 초등·고등 교안을
              이용해 주세요.
            </p>
          </div>
        </Card>
      ) : (
      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-1">
        <div className="col-span-1">
          {query.trim() && (
            <p className="mb-1.5 px-1 text-[11px] text-ink-soft">
              「{query.trim()}」 검색 결과 {visibleIds.length}강
            </p>
          )}
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
                    {/*
                      핵심단어를 앞세우고 원문 제목을 아래에 둔다 (2026-08-15 리드 지시 —
                      「핵심단어로 표현」). 고등 목록이 계시록 장을 앞세우는 것과 같은 모양이다.
                      ⚠️ 원문 제목은 지우지 않는다 — 자른 표기와 원문을 함께 보인다(불변식 5)
                    */}
                    <span className="block font-semibold">
                      {l.lessonNo}강 — {keywordOf(l.title)}
                    </span>
                    {keywordOf(l.title) !== l.title && (
                      <span className="block truncate opacity-70">{l.title}</span>
                    )}
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
                {/* 핵심단어가 제목, 원문 제목은 그 아래 그대로 (2026-08-15 리드 지시) */}
                <h2 className="mt-0.5 text-[19px] font-bold text-zion-900">
                  {keywordOf(elCurrent.title)}
                </h2>
                <p className="mb-4 mt-0.5 text-[12px] text-ink-soft">{elCurrent.title}</p>
                <Accordion items={elItems} resetKey={`el-${elCurrent.lessonNo}`} />
                {/* 교안 바로 아래 그 강의 PPT·영상 — 원스톱 매칭 (2026-08-10) */}
                <LessonResources lessonKey={`elementary-${elCurrent.lessonNo}`} />
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
                <LessonResources lessonKey={`high-${highCurrent.id}`} />
                <LessonNotes
                  lessonKey={`high-${highCurrent.id}`}
                  lessonLabel={`고등 ${highCurrent.label} — ${highCurrent.title}`}
                />
              </>
            ) : (
              <p className="py-12 text-center text-[13px] text-ink-soft">
                목록에서 읽을 강을 골라 주세요.
              </p>
            )}

            {pos >= 0 && visibleIds.length > 1 && (
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-zion-100 pt-4">
                <button
                  onClick={() => moveLesson(-1)}
                  disabled={pos === 0}
                  className="flex items-center gap-1 rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={13} /> 이전 강
                </button>
                <span className="text-[11px] text-ink-soft">
                  {pos + 1} / {visibleIds.length}
                </span>
                <button
                  onClick={() => moveLesson(1)}
                  disabled={pos === visibleIds.length - 1}
                  className="flex items-center gap-1 rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음 강 <ChevronRight size={13} />
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
