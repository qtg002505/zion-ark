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
      <rect width="48" height="48" rx="12" fill="#23406e" />
      <path d="M10 30 L24 12 L38 30 Z" fill="#c9a961" opacity="0.9" />
      <path d="M8 33 h32 l-4 7 h-24 z" fill="#e4ebf5" />
      <circle cx="24" cy="24" r="3" fill="#f6f7f9" />
    </svg>
  );
}
