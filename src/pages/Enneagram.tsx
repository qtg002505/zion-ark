import { useState } from "react";
import { ENNEAGRAM_GUIDES } from "../content/enneagram";
import { PageHeader, Card } from "./common";

/** 에니어그램 가이드 — 9유형 · 유형당 4항목 (전도사 도우미) */
export function Enneagram() {
  const [selected, setSelected] = useState(ENNEAGRAM_GUIDES[0]);

  return (
    <div>
      <PageHeader
        crumb="전도사 도우미"
        title="에니어그램 가이드"
        desc="유형별 성장과정 · 초중고 관리팁 · 단계향상 방법 · 보강 성구. 참고 자료이며, 수강생의 성향·심리를 확정 판정하는 근거로 쓰지 않습니다."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {ENNEAGRAM_GUIDES.map((g) => (
          <button
            key={g.type}
            onClick={() => setSelected(g)}
            className={
              "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition " +
              (selected.type === g.type
                ? "border-zion-800 bg-zion-800 text-white"
                : "border-zion-200 bg-white text-zion-700 hover:border-zion-400")
            }
          >
            {g.type}유형 {g.name}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-baseline gap-2">
          <h2 className="text-[19px] font-bold text-zion-900">
            {selected.type}유형 — {selected.name}
          </h2>
          <span className="text-[13px] text-gold-700">{selected.keyword}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {(
            [
              ["성장과정", selected.growth],
              ["초중고 관리팁", selected.schoolTips],
              ["단계향상 방법", selected.improvement],
              ["보강 성구", selected.verses],
            ] as const
          ).map(([label, text]) => (
            <div key={label} className="rounded-xl bg-zion-50 p-4">
              <div className="text-[12px] font-bold text-gold-700">{label}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-700">{text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
