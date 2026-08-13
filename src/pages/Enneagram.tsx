import { useState } from "react";
import { enneagramGuides, type EnneagramGuide } from "../content/enneagram-guides";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { PageHeader, Card } from "./common";

/**
 * 원문 줄을 **소제목과 내용으로 갈라** 그린다 (2026-08-11 파트 B 검수 반영).
 *
 * 「보강 성구」 항목은 원문이 이렇게 생겼다:
 *
 *     1. 형제 판단              ← 소제목
 *     약 4:12 입법자와 재판자는… ← 그 아래 성구
 *     롬 14:10 네가 어찌하여…    ← 그 아래 성구
 *     2. 사랑, 인자함, 솔직함    ← 다음 소제목
 *
 * 종전에는 이 줄들을 **전부 같은 불릿**으로 뿌려서 어디가 묶음의 머리인지 보이지 않았다.
 * 「소제목과 성구가 구분되지 않는다」는 지적이 정확했다.
 *
 * ⚠️ **원문은 한 글자도 고치지 않는다** (불변식 5). 번호도 그대로 보여 준다 —
 * 무엇이 소제목인지 **그리는 방식**만 바꾼다.
 * 이 「번호. 제목」 형태는 에니어그램 원문에만 있다 (196곳). 교안에는 없어서 공용으로
 * 빼지 않았다 — 없는 곳에 적용하면 멀쩡한 문장이 제목으로 둔갑한다.
 */
const HEADING = /^\d+\.\s/;

/**
 * 다른 화면(수강생 성향 분석)도 같은 원문을 같은 모양으로 그려야 해서 내보낸다.
 * 두 벌로 복제하면 「소제목·성구 구분」 규칙이 한쪽만 고쳐지는 일이 생긴다.
 */
export function GuideItems({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, j) => {
        const heading = HEADING.test(item);
        if (heading) {
          return (
            <li
              key={j}
              className="mt-3 border-l-[3px] border-zion-400 pl-2.5 text-[14px] font-bold leading-relaxed text-zion-900 first:mt-0"
            >
              <span className="whitespace-pre-wrap">{item}</span>
            </li>
          );
        }
        return (
          <li key={j} className="flex gap-2 pl-2.5 text-[14px] leading-relaxed text-ink">
            <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-zion-400" />
            <span className="whitespace-pre-wrap">{item}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** 에니어그램 가이드 — 9유형 원문 (성장과정 · 단계향상 · 초중고 관리팁 · 보강 성구) */
export function Enneagram() {
  const [selected, setSelected] = useState<EnneagramGuide>(enneagramGuides[0]);

  const items: AccordionItem[] = selected.sections.map((sec, i) => ({
    id: `${selected.typeNo}-${i}`,
    title: sec.label,
    hint: sec.items[0],
    content: <GuideItems items={sec.items} />,
  }));

  return (
    <div>
      <PageHeader
        crumb="수강생 관리 도우미"
        title="에니어그램 가이드"
        desc="유형별 성장과정 · 단계향상 방법 · 초중고 관리팁 · 보강 성구. 참고 자료이며, 수강생의 성향·심리를 확정 판정하는 근거로 쓰지 않습니다."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {enneagramGuides.map((g) => (
          <button
            key={g.typeNo}
            onClick={() => setSelected(g)}
            className={
              "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition " +
              (selected.typeNo === g.typeNo
                ? "border-zion-800 bg-zion-800 text-white"
                : "border-zion-200 bg-white text-zion-700 hover:border-zion-400")
            }
          >
            {g.typeNo}번 유형
          </button>
        ))}
      </div>

      <Card>
        <div className="text-[12px] font-semibold text-zion-700">{selected.typeNo}번 유형</div>
        <h2 className="mt-0.5 mb-4 text-[19px] font-bold text-zion-900">{selected.title}</h2>
        <Accordion items={items} resetKey={String(selected.typeNo)} />
      </Card>
    </div>
  );
}
