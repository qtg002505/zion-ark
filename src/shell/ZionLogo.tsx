/**
 * 시온 아크 로고 — 물살 위의 방주(선화). 2026-08-13 리드가 준 시안으로 교체했다.
 *
 * 종전에는 네이비 둥근 사각형 안에 방주·산을 흰색으로 채운 마크였다. 시안은 **면이 없는
 * 선화**라 배경 사각형을 걷어냈다.
 *
 * ⚠️ **색은 `zion-*` 토큰만 쓴다** (화면 규칙 — 하드코딩 금지). 선화가 다크 모드에서
 * 저절로 맞는 이유: `--color-zion-*`는 **글자 쪽에 맞춰 뒤집히므로**(`zion-800`이
 * 밝기 0.32 → 0.9) 어두운 배경에서는 선이 밝아진다. 종전처럼 진한 면을 깔았다면
 * 「진한 면 목록」에 없는 값이라 하얗게 떴을 자리다.
 *
 * ⚠️ 이 마크는 **28~36px로 쓰인다**(헤더·사이드바). 시안의 잔선(선체 판자, 창틀, 갈매기
 * 깃털)은 그 크기에서 뭉개져 일부러 뺐다 — 방주·물살·구름·새 넷만 남겼다.
 */
export function ZionLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="시온 아크 로고"
    >
      {/*
        선 굵기는 **뷰박스와 함께 배율로 줄고 는다** — `non-scaling-stroke`를 쓰지 않는다.
        이 마크는 28px(모바일 헤더)부터 56px(로그인)까지 쓰이는데, 고정 굵기로 두면
        28px에서 선이 서로 붙어 뭉개진다.
      */}
      {/* 그림 실제 범위가 y 9~45라 3만큼 올려야 위아래 여백이 같아진다 (실측) */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -3)">
        {/* 구름 — 옅은 파랑. 오른쪽 위 */}
        <path
          d="M31 17q0-4 4-4 .8-3.4 4.3-2.9Q43 10.7 43 14.2q1.9.6 1.4 2.8"
          className="stroke-zion-500"
          strokeWidth="2"
        />
        {/* 갈매기 — 왼쪽 위 */}
        <path
          d="M6.5 12.8q2-2.4 4.2-.6 1.6-2 4.3.4"
          className="stroke-zion-800"
          strokeWidth="2"
        />

        {/* 방주 지붕 */}
        <path
          d="M19 22.6 27.5 14l11 9.4"
          className="stroke-zion-800"
          strokeWidth="2.6"
        />
        {/* 선체 — 왼쪽 뱃머리가 솟은 배 모양. 위 선이 갑판이다 */}
        <path
          d="M7.5 22.4C7 31 12 35.6 21.5 35.6h10c6.4 0 9.6-3.6 9.6-9.2v-2.4Z"
          className="stroke-zion-800"
          strokeWidth="2.6"
        />

        {/* 물살 — 진한 파랑 한 줄, 그 아래 옅은 파랑 한 줄 */}
        <path
          d="M2.5 37q3.9-4 7.8 0t7.8 0q3.9-4 7.8 0t7.8 0q3.9-4 7.8 0"
          className="stroke-zion-800"
          strokeWidth="2.2"
        />
        <path
          d="M7 42.2q3.6-3.6 7.2 0t7.2 0q3.6-3.6 7.2 0t7.2 0"
          className="stroke-zion-500"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
