import { useState } from "react";
import { enneagramGuides, type EnneagramGuide } from "../content/enneagram-guides";
import { PageHeader, Card } from "./common";

/** 에니어그램 가이드 — 9유형 원문 (성장과정 · 단계향상 · 초중고 관리팁 · 보강 성구) */
export function Enneagram() {
  const [selected, setSelected] = useState<EnneagramGuide>(enneagramGuides[0]);

  return (
    <div>
      <PageHeader
        crumb="전도사 도우미"
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
        <div className="text-[12px] font-semibold text-gold-700">{selected.typeNo}번 유형</div>
        <h2 className="mt-0.5 text-[19px] font-bold text-zion-900">{selected.title}</h2>
        <div className="mt-4 space-y-5">
          {selected.sections.map((sec) => (
            <div key={sec.label}>
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
  );
}
