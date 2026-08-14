/**
 * 꺾은선 그래프 — 외부 차트 패키지 없이 SVG로 그린다 (무의존 원칙).
 *
 * `StudentDetailPage`의 성장 추세 polyline 패턴을 공용 부품으로 올린 것이다 (2026-08-13).
 * `preserveAspectRatio="none"` + `vectorEffect="non-scaling-stroke"` 조합이라 가로로
 * 늘어나도 선 굵기가 안 변한다.
 *
 * - **값이 없는 구간(null)은 선을 끊는다.** 0으로 떨어뜨리면 미래 주가 폭락처럼 보인다 —
 *   연속된 값 구간마다 polyline을 하나씩 그린다
 * - **선은 색과 무늬를 함께 쓴다** (`dash`) — 색만으로 구분하지 않는다는 접근성 관례
 * - 툴팁·점 상호작용은 없다. 주차 단위 상호작용은 막대 캐러셀이 맡는다 — 같은 일을
 *   두 군데 만들지 않는다
 */

export interface LineSeries {
  label: string;
  /** 팔레트 토큰 클래스만 — `stroke-zion-700` 등. 색을 직접 적지 않는다 */
  strokeClass: string;
  /** 점선 무늬 (`"6 4"`). 없으면 실선 */
  dash?: string;
  /** 시리즈 길이는 `xLabels`와 같아야 한다. null = 값 없음(선 끊김) */
  points: (number | null)[];
}

export function LineChart({
  series,
  xLabels,
  yMax = 100,
  yMin = 0,
  height = 170,
  ariaLabel,
}: {
  series: LineSeries[];
  /** x축 눈금 — 값이 있는 위치만 라벨을 적는다 (예: 월 경계) */
  xLabels: { at: number; label: string }[];
  yMax?: number;
  /**
   * Y축 하한 (2026-08-14 FB-03ⓐ) — 0~100 고정이면 선들이 위쪽에 눌려 변별력이 없다.
   * 호출부가 데이터 min에 여유(~5%p)를 둔 값을 넘기면 그 구간만 펼쳐 그린다.
   */
  yMin?: number;
  height?: number;
  ariaLabel: string;
}) {
  const count = Math.max(...series.map((s) => s.points.length), 2);
  const x = (i: number) => (i / (count - 1)) * 100;
  const y = (v: number) => 100 - ((v - yMin) / Math.max(1, yMax - yMin)) * 100;

  /** 눈금 — 구간을 4등분한 안쪽 셋. 기본(0~100)이면 종전과 같은 25·50·75가 나온다 */
  const ticks = [1, 2, 3].map((n) => Math.round(yMin + ((yMax - yMin) * n) / 4));

  /** null에서 선을 끊는다 — 연속 구간별로 polyline 좌표 문자열을 만든다 */
  function runsOf(points: (number | null)[]): string[] {
    const runs: string[] = [];
    let cur: string[] = [];
    points.forEach((v, i) => {
      if (v === null) {
        if (cur.length > 1) runs.push(cur.join(" "));
        cur = [];
        return;
      }
      cur.push(`${x(i)},${y(v)}`);
    });
    if (cur.length > 1) runs.push(cur.join(" "));
    return runs;
  }

  return (
    <div>
      <div role="img" aria-label={ariaLabel} className="relative">
        {/* 눈금 값 — 동적 구간일 때 어디부터 어디까지인지 읽히게 값을 함께 적는다 (FB-03ⓐ) */}
        {ticks.map((v) => (
          <span
            key={`t-${v}`}
            aria-hidden
            className="absolute right-0 -translate-y-1/2 text-[9px] text-ink-soft"
            style={{ top: `${(y(v) / 100) * height}px` }}
          >
            {v}
          </span>
        ))}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
        >
          {/* 배경 눈금 — 표시 구간의 4등분점 */}
          {ticks.map((v) => (
            <line
              key={v}
              x1="0"
              x2="100"
              y1={y(v)}
              y2={y(v)}
              className="stroke-zion-100"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map((s) =>
            runsOf(s.points).map((run, i) => (
              <polyline
                key={`${s.label}-${i}`}
                points={run}
                fill="none"
                className={s.strokeClass}
                strokeWidth="2"
                strokeDasharray={s.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}
        </svg>
        {/* x축 라벨 — 위치 비율에 맞춰 절대 배치 */}
        <div className="relative mt-1 h-4">
          {xLabels.map(({ at, label }) => (
            <span
              key={`${at}-${label}`}
              className="absolute -translate-x-1/2 text-[10px] text-ink-soft"
              style={{ left: `${x(at)}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* 범례 — 선 견본(무늬 포함)과 이름 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <svg width="22" height="6" aria-hidden>
              <line
                x1="1"
                x2="21"
                y1="3"
                y2="3"
                className={s.strokeClass}
                strokeWidth="2"
                strokeDasharray={s.dash}
                strokeLinecap="round"
              />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
