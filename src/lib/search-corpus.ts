import { elementaryLessons } from "../content/elementary-lessons";
import { ELEMENTARY_COURSE_TITLES } from "../content/curriculum-titles";
import { HIGH_LESSONS } from "../content/lessons-high";
import { enneagramGuides } from "../content/enneagram-guides";
import { SERIES } from "../content/series-content";
import { QUOTE_ITEMS } from "../content/quotes-data";
import { ALL_TERMS } from "../content/glossary";
import type { SearchDoc } from "./search";

/**
 * 검색이 훑는 **빌드에 박힌 자료**만 모아 둔 모듈.
 *
 * ## 왜 갈랐나 (2026-08-18)
 *
 * 이 파일이 끌어오는 원문이 **시리즈 1.5MB · 어록 468KB · 교안 284KB**다.
 * 종전에는 `search.ts`가 이것들을 통째로 정적 import 했고, 그 `search.ts`를 셸의
 * `AskAiBar`가 부르니 **모든 화면이 전 자료를 안고 떴다.** 라우트를 아무리 나눠도
 * 첫 화면 번들이 줄지 않는 자리가 여기였다.
 *
 * 지금은 `search.ts`가 **처음 검색할 때** 이 모듈을 동적으로 가져온다.
 * 자료를 읽는 화면(교안·어록·시리즈)도 제 라우트 청크에서 같은 원문을 쓰는데,
 * 번들러가 공유분을 따로 떼어 두므로 **먼저 필요한 쪽이 한 번만** 받아 온다.
 *
 * ⚠️ **여기에 화면 코드를 들이지 않는다.** 이 모듈이 컴포넌트를 물면 첫 검색에
 * 화면 코드까지 딸려 와 가른 뜻이 사라진다. 자료를 `SearchDoc`으로 펴는 일만 한다.
 */
export function buildStaticDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  /**
   * 용어집 — 뜻을 묻는 질문이 가장 많이 들어오는 자리다.
   * 정의 원문을 그대로 실어 **결과 줄에서 바로 읽히게** 한다.
   * 전용 화면이 아직 없어 상담 도우미(테마별 용어 설명)로 보낸다.
   */
  for (const t of ALL_TERMS) {
    docs.push({
      source: `용어 — ${t.term}`,
      sourceType: "용어",
      title: t.term,
      href: "/counseling",
      body: [t.definition, t.note, ...(t.aliases ?? [])].filter(Boolean).join(" "),
    });
  }

  for (const lesson of elementaryLessons) {
    /*
      ⚠️ **강 번호를 표기에 넣지 않는다** (2026-08-15 리드 지시 — 학원법).
      과수 제목은 정본 목록(`curriculum-titles.ts`)에서 가져오고, 목록에 없으면 원문 제목을 쓴다.
    */
    const courseTitle = ELEMENTARY_COURSE_TITLES[lesson.lessonNo - 1] ?? lesson.title;
    docs.push({
      source: `초등 교안 — ${courseTitle}`,
      sourceType: "교안",
      title: courseTitle,
      href: "/lessons",
      body: lesson.sections.map((s) => s.label + " " + s.items.join(" ")).join(" "),
    });
  }

  for (const l of HIGH_LESSONS) {
    docs.push({
      source: `고등 교안 ${l.label}`,
      sourceType: "교안",
      title: `${l.label} — ${l.title}`,
      href: "/lessons?course=high",
      body: l.body,
    });
  }

  for (const g of enneagramGuides) {
    docs.push({
      source: `에니어그램 ${g.typeNo}번 유형 — ${g.title}`,
      sourceType: "에니어그램",
      title: `${g.typeNo}번 유형 — ${g.title}`,
      href: "/enneagram",
      body: g.sections.map((s) => s.label + " " + s.items.join(" ")).join(" "),
    });
  }

  for (const s of SERIES) {
    for (const ch of s.chapters) {
      docs.push({
        source: `${s.name} ${ch.label}`,
        sourceType: "시리즈",
        title: `${ch.label} ${ch.title}`,
        href: `/series/${s.id}?ch=${ch.id}`,
        body: ch.body,
      });
    }
  }

  for (const it of QUOTE_ITEMS) {
    docs.push({
      source: `총회장님 어록 — ${it.category} ${it.no}번`,
      sourceType: "어록",
      title: it.text.length > 60 ? it.text.slice(0, 60) + "…" : it.text,
      href: "/quotes",
      body: `${it.category} ${it.text}`,
    });
  }

  return docs;
}
