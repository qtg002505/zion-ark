/**
 * 시온 아크 로고 — 물살 위의 방주(선화). 2026-08-13 리드 시안.
 *
 * ⚠️ **가로 4 : 세로 3이다.** 처음에는 48×48 정사각형에 욱여넣었는데, 시안이 옆으로 넓은
 * 그림이라 배가 뭉개져 「완전 이상해」 보였다. `size`는 **높이**이고 너비는 4/3로 따라간다.
 *
 * ⚠️ **색은 `zion-*` 토큰만 쓴다** (화면 규칙 — 하드코딩 금지). 선화가 다크 모드에서 저절로
 * 맞는 이유: `--color-zion-*`가 **글자 쪽에 맞춰 뒤집히므로**(`zion-800`이 밝기 0.32 → 0.9)
 * 어두운 배경에서는 선이 밝아진다. 대비 실측 — 밝은 12.96 / 4.93, 어두운 12.92 / 7.57.
 *
 * ⚠️ **이것은 시안을 옮겨 그린 것이지 원본이 아니다.** 원본 그림 파일을 저장소에 넣으면
 * (`public/logo-ark.png`) 이 컴포넌트를 `<img>` 한 줄로 바꾸는 편이 정확하다 —
 * 28~36px에서는 가는 선이 사라지지만 래스터는 부드럽게 줄어들기 때문이다.
 */
export function ZionLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={(size * 4) / 3}
      height={size}
      viewBox="0 0 128 96"
      fill="none"
      role="img"
      aria-label="시온 아크 로고"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* ── 하늘 — 갈매기와 구름 둘 ── */}
        <path
          d="M32.5 24.8c3-4.6 6.7-4.3 8.7-1 2.6-4.3 5.3-4 7.3-2"
          className="stroke-zion-800"
          strokeWidth="2.8"
        />
        <path
          d="M13.5 43.5c-.5-4.5 4-7 7-5 .5-6.5 9-8.5 12.5-3.5 3-2 6.5.5 6 4.5"
          className="stroke-zion-500"
          strokeWidth="2.6"
        />
        <path
          d="M72 42c-1.5-5 3.5-8.5 7-6.5 0-9 11-13 17-7 4.5-4.5 12-1 12 5.5 4 .5 5.5 4.5 4 8"
          className="stroke-zion-500"
          strokeWidth="2.6"
        />

        {/* ── 지붕 — 왼쪽 박공에서 오른쪽으로 길게 내려오는 판 ── */}
        <path
          d="M49.5 38.5 60 27.5 96.5 46 86 50.5Z"
          className="stroke-zion-800"
          strokeWidth="3.2"
        />
        {/* 지붕 살 — 큰 크기에서만 보인다 */}
        <path d="M72 33.6 61.5 42.5M84 39.7 73.5 46.5" className="stroke-zion-800" strokeWidth="1.9" />

        {/* ── 선체 — 왼쪽 뱃머리가 높이 솟은 배. 위 변이 갑판이다 ── */}
        <path
          d="M42 33.5c-6 8.5-5 25 2.8 33.3 10.2 4.7 42.2 4.2 53-3.3l1.4-16L44.5 36.8Z"
          className="stroke-zion-800"
          strokeWidth="4"
        />
        {/* 뱃머리 줄무늬 */}
        <path
          d="M46.5 36c-4.5 8-3.5 22 2.5 30M50.5 37c-4 7.5-3 21 2 29.5"
          className="stroke-zion-800"
          strokeWidth="2.3"
        />
        {/* 선체 판자 — 갑판과 나란히 한 줄, 그 아래 한 줄 */}
        <path d="M50 42.5 98 51.8" className="stroke-zion-800" strokeWidth="2.3" />
        <path d="M50 52c15 3 35 5.5 47 7" className="stroke-zion-800" strokeWidth="2.3" />
        {/* 갑판 창 셋 */}
        <path
          d="M74 47.5h4v4h-4zM81 50h4v4h-4zM88 52.5h4v4h-4z"
          className="stroke-zion-800"
          strokeWidth="1.7"
        />

        {/* ── 물살 — 진한 파랑이 뱃머리 앞을 지나고, 그 아래 옅은 파랑 둘 ── */}
        <path
          d="M20 66q7.75-7 15.5 0t15.5 0 15.5 0 15.5 0 15.5 0"
          className="stroke-zion-800"
          strokeWidth="3.6"
        />
        <path
          d="M26 71.5q7-6 14 0t14 0 14 0 14 0"
          className="stroke-zion-500"
          strokeWidth="3"
        />
        <path
          d="M43 76.5q6.5-5.5 13 0t13 0 13 0"
          className="stroke-zion-500"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}
