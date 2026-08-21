import { useMemo, useState } from "react";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { useSearchParams } from "react-router-dom";
import { Link } from "../components/TransitionLink";
import { ChevronLeft, ChevronRight, Hourglass, Search } from "lucide-react";
import { elementaryLessons } from "../content/elementary-lessons";
import { HIGH_LESSONS } from "../content/lessons-high";
import {
  keywordOf,
  revelationKeyword,
  LEVEL_NAME,
  LEVEL_TONE,
  type LessonLevel,
} from "../content/curriculum-mock";
import { ELEMENTARY_COURSE_TITLES, HIGH_COURSE_TITLES } from "../content/curriculum-titles";
import { MarkdownLite, splitSections } from "../lib/markdown";
import { looseIncludes } from "../lib/text-match";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { LessonNotes } from "../components/LessonNotes";
import { LessonResources } from "../components/LessonResources";
import { COURSE_LEVEL_TERMS, WORK_TERMS } from "../content/glossary";
import { INSTRUCTOR_BATGARI_FOLDERS, folderLabel } from "../lib/types";
import { PageHeader, Card } from "./common";

type Course = "elementary" | "middle" | "high";

function toCourse(v: string | null): Course {
  return v === "high" || v === "middle" ? v : "elementary";
}

/**
 * 과정 탭 ↔ 단계 이름. 용어집(`COURSE_LEVEL_TERMS`의 `term`)과 단계 색(`LEVEL_TONE`)이
 * 같은 문자열을 쓰므로 표 하나로 둘 다 찾는다.
 */
const LEVEL_TERM: Record<Course, LessonLevel> = {
  elementary: "초등",
  middle: "중등",
  high: "고등",
};

/**
 * 「시기 따른 관리 방향」 — 강의 도우미 4항목 중 **첫 칸** (지시문 §2-2 · 2026-08-18 착수).
 *
 * ## 무엇을 보여 주나
 *
 * 이 단계에서 수강생이 **어디까지 이르러야 하는가**(단계 정의)와, 그 곁에서 **인교섬이 지는
 * 몫**(인교섬 미션 정의)을 나란히 놓는다. 강사·전도사가 둘을 견주어 **인교섬에게 무엇을
 * 부탁할지 판단**하는 자리다.
 *
 * ⚠️ **인교섬(인도자·교사·섬김이)에게는 계정이 없다** (2026-08-08 리드 확정).
 * 이 화면은 인교섬이 들어와 보는 화면이 아니라 **강사·전도사가 보는 화면**이다 —
 * 그래서 역할 코드를 늘리지 않았다.
 *
 * ⚠️ **정의는 원문 그대로 싣는다**(불변식 5). 사이트가 「이 단계에서는 이렇게 부탁하세요」
 * 같은 문장을 지어내지 않는다 — 무엇을 부탁할지는 사람이 정한다. 원문은
 * `src/content/glossary.ts` 한 곳이고, 여기서는 골라 보여 주기만 한다.
 *
 * ⚠️ 4항목의 나머지 셋(진도에 따른 질문 · 무신앙 예상 질문 · 신앙인 예상 질문)은
 * **원문을 아직 받지 못했다.** 빈 칸을 만들어 두는 대신 자리를 두지 않았다 —
 * 원문이 오면 이 파일에 같은 방식으로 더한다.
 */
function LevelGuidance({ course }: { course: Course }) {
  const level = LEVEL_TERM[course];
  const levelTerm = COURSE_LEVEL_TERMS.find((t) => t.term === level);
  const mission = WORK_TERMS.find((t) => t.term === "인교섬 미션");
  if (!levelTerm) return null;

  const items: AccordionItem[] = [
    {
      id: "level-guidance",
      title: `시기 따른 관리 방향 — ${LEVEL_NAME[level]}`,
      hint: "이 단계가 이르러야 할 곳과 인교섬이 지는 몫",
      content: (
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              {/*
                ⚠️ 뱃지는 **색 이름**이다 (2026-08-21 리드 지시 — 학원법). 아래 정의문은
                용어집 원문이라 그 안의 표현은 손대지 않는다(불변식 5) — 사이트가 짓는
                라벨만 바꾼다.
              */}
              <span className={"rounded px-1.5 py-0.5 text-[10.5px] font-bold " + LEVEL_TONE[level]}>
                {LEVEL_NAME[level]}
              </span>
              <span className="text-[12px] font-semibold text-ink">이 단계가 이르러야 할 곳</span>
            </div>
            <p className="text-[13px] leading-relaxed text-ink">{levelTerm.definition}</p>
          </div>

          {mission && (
            <div>
              <div className="mb-1 text-[12px] font-semibold text-ink">곁에서 인교섬이 지는 몫</div>
              <p className="text-[13px] leading-relaxed text-ink">{mission.definition}</p>
              {mission.note && <p className="mt-1 text-[12px] text-ink-soft">{mission.note}</p>}
            </div>
          )}

          <p className="rounded-lg bg-zion-50 p-2.5 text-[12px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-zion-700">유의</span> 인교섬은 사이트 계정이 없습니다.
            여기서 본 것을 강사·전도사가 직접 전합니다.
            <br />
            정의는 용어집 원문 그대로입니다 — 무엇을 부탁할지는 담당자가 정합니다.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mb-4">
      <Accordion items={items} defaultOpenFirst={false} compact />
    </div>
  );
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
            ? "과수 1건당 7항목: 교육 핵심 · 기존 관점 · 예상 반응·질문 · 강의 주의사항 · 유도형 질문 · 예방·상담 · 교정 포인트"
            : course === "high"
              ? "계시록 장별로 핵심 · 서론 · 본론 · 결론 구조. 원문 그대로 제공합니다."
              : "준비 중입니다. 원본을 확보하면 다른 두 과정과 같은 소주제 구조로 탑재합니다."
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/*
          고른 과정은 **그 단계 색**으로 칠한다. 색값은 `index.css` 한 곳에 있다.
          ⚠️ **과정을 색 이름으로 부른다** (2026-08-21 리드 지시 — 학원법). 「초등·중등·고등」은
          학년 편성처럼 읽혀 화면에서 뺐고, 그 자리를 색이 대신한다. 이름은 `LEVEL_NAME` 한 곳이다.
          ⚠️ 개수를 적지 않는다 — 정본 과수(25 · 23)와 지금 탑재된 교안 원문(23)이 달라
          숫자를 적으면 어긋난 값이 보인다. 색 이름만 낸다.
        */}
        <SegmentedTabs
          label="과정 선택"
          scroll
          value={course}
          onChange={switchCourse}
          items={(
            [
              ["elementary", "초등"],
              ["middle", "중등"],
              ["high", "고등"],
            ] as [Course, LessonLevel][]
          ).map(([id, level]) => ({
            id,
            label: level === "중등" ? `${LEVEL_NAME[level]} (준비 중)` : LEVEL_NAME[level],
            activeClass: `${LEVEL_TONE[level]} shadow-sm`,
          }))}
        />
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

      {/* 4항목 중 첫 칸 — 이 단계가 이르러야 할 곳과 인교섬이 지는 몫 (2026-08-18) */}
      <LevelGuidance course={course} />

      {/*
        밭갈이는 교안과 별개 자료지만 개강 초반에는 같이 쓴다. 자료실까지 찾아가지 않아도
        어디 있는지 알도록 다리만 놓는다 — 폴더 이름은 types.ts 한 곳에서 읽는다.

        ⚠️ **`/teaching`으로 보낸다** (2026-08-18에 고쳤다). 종전에는 `?section=instructor`로
        갔는데 **구획은 2026-08-13에 폐지됐다** — 그 파라미터는 이제 아무 뜻이 없어
        자료실 전체가 열렸다. 밭갈이는 강의 도우미 안에서 연다.
      */}
      <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
        {/* 폴더는 저장값이 아니라 **표시 이름**으로 낸다 — 저장값에는 단계 이름이 남아 있다 */}
        개강 초반에는 <span className="font-semibold text-zion-700">밭갈이</span> 자료를 교안과 함께
        씁니다 ({INSTRUCTOR_BATGARI_FOLDERS.map(folderLabel).join(" · ")}) —{" "}
        <Link
          viewTransition
          to="/teaching"
          className="font-semibold text-zion-700 underline-offset-2 hover:underline"
        >
          밭갈이 자료 열기
        </Link>
      </p>

      {course === "middle" ? (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <Hourglass size={32} className="text-zion-300" />
            <p className="mt-4 text-[15px] font-semibold text-zion-900">
              <span className={"rounded px-1.5 py-0.5 " + LEVEL_TONE["중등"]}>
                {LEVEL_NAME["중등"]}
              </span>{" "}
              강의 교안은 준비 중입니다
            </p>
            <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-soft">
              원본을 확보하면 다른 두 과정과 같은 소주제 구조로 탑재합니다. 그때까지는{" "}
              {LEVEL_NAME["초등"]}·{LEVEL_NAME["고등"]} 교안을 이용해 주세요.
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
                    {/*
                      **정본 과수 목록**의 표기를 쓴다 (2026-08-15 리드 전달 — `curriculum-titles.ts`).
                      목록에 없는 강(원문이 목록보다 많은 경우)은 원문에서 잘라 낸 표기로 물러난다.
                      ⚠️ 원문 제목은 지우지 않고 아래에 함께 보인다(불변식 5).
                    */}
                    <span className="block font-semibold">
                      {/* ⚠️ 강 번호를 붙이지 않는다 — 연속 번호 표기를 뺐다(2026-08-15 리드 지시) */}
                      {ELEMENTARY_COURSE_TITLES[l.lessonNo - 1] ?? keywordOf(l.title)}
                    </span>
                    {(ELEMENTARY_COURSE_TITLES[l.lessonNo - 1] ?? keywordOf(l.title)) !== l.title && (
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
                    {/*
                      정본 표기를 쓴다 — 고등 원문 파일 23개와 정본 23과수가 **차례가 같아**
                      번호로 짝지을 수 있다(계 1:1~8 · 계1:9~20 · 계2장 … 계22장).
                      ⚠️ 정본에 없으면 원문 파일명을 변환해 쓴다 — 파일이 늘거나 줄어도 안 깨진다.
                      이 방식이 파일명이 깨진 강(「계 1장 920절」)도 바른 표기로 덮어 준다.
                    */}
                    <span className="block font-semibold">
                      {/* ⚠️ 걸러진 목록(`highList`)이 아니라 **전체 목록**의 차례로 짝짓는다 — 검색 중에도 안 어긋난다 */}
                      {HIGH_COURSE_TITLES[HIGH_LESSONS.indexOf(l)]?.chapter ??
                        revelationKeyword(l.label)}
                    </span>
                    <span className="block truncate opacity-70">{l.title}</span>
                  </button>
                ))}
            {(course === "elementary" ? elList : highList).length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-ink-soft">
                일치하는 강이 없습니다. 다른 낱말로 검색해 주세요.
              </p>
            )}
          </nav>
        </div>

        <div className="col-span-3 max-md:col-span-1">
          <Card>
            {course === "elementary" ? (
              <>
                {/*
                  ⚠️ **단계 이름을 적지 않는다** (2026-08-21 리드 지시 — 학원법).
                  종전에는 제목 위에 「초등」을 얹었다. 지금은 **제목에 그 단계 바탕색**을
                  입혀 대신한다 — 강 번호를 넣지 않는 것(2026-08-15)은 그대로다.
                */}
                {/* 정본 과수 제목이 큰 제목, 교안 원문 제목은 그 아래 그대로 (2026-08-15) */}
                <h2
                  className={
                    "inline-block rounded-lg px-2.5 py-1 text-[19px] font-bold " + LEVEL_TONE["초등"]
                  }
                >
                  {ELEMENTARY_COURSE_TITLES[elCurrent.lessonNo - 1] ?? keywordOf(elCurrent.title)}
                </h2>
                <p className="mb-4 mt-1 text-[12px] text-ink-soft">{elCurrent.title}</p>
                <Accordion items={elItems} resetKey={`el-${elCurrent.lessonNo}`} />
                {/* 교안 바로 아래 그 강의 PPT·영상 — 원스톱 매칭 (2026-08-10) */}
                <LessonResources lessonKey={`elementary-${elCurrent.lessonNo}`} />
                <LessonNotes
                  lessonKey={`elementary-${elCurrent.lessonNo}`}
                  lessonLabel={`${LEVEL_NAME["초등"]} — ${ELEMENTARY_COURSE_TITLES[elCurrent.lessonNo - 1] ?? elCurrent.title}`}
                />
              </>
            ) : highCurrent ? (
              <>
                <div className="text-[12px] font-semibold text-zion-700">{highCurrent.label}</div>
                <h2
                  className={
                    "mt-0.5 mb-3 inline-block rounded-lg px-2.5 py-1 text-[19px] font-bold " +
                    LEVEL_TONE["고등"]
                  }
                >
                  {highCurrent.title}
                </h2>
                {highParsed.lead && (
                  <div className="mb-3 rounded-lg bg-zion-50 px-3 py-2">
                    <MarkdownLite text={highParsed.lead} />
                  </div>
                )}
                <Accordion items={highItems} resetKey={`high-${highCurrent.id}`} />
                <LessonResources lessonKey={`high-${highCurrent.id}`} />
                <LessonNotes
                  lessonKey={`high-${highCurrent.id}`}
                  lessonLabel={`${LEVEL_NAME["고등"]} ${highCurrent.label} — ${highCurrent.title}`}
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
