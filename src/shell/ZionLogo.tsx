/** 시온 아크 로고 — 방주 + 산 형상. 정식 로고 확보 시 이 컴포넌트만 교체 */
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
      <rect width="48" height="48" rx="14" className="fill-zion-700" />
      <path d="M10 30 L24 12 L38 30 Z" className="fill-white" opacity="0.35" />
      <path d="M8 33 h32 l-4 7 h-24 z" className="fill-white" />
      <circle cx="24" cy="23" r="3" className="fill-white" />
    </svg>
  );
}
