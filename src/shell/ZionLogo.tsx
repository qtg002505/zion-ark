import logoArk from "../assets/logo-ark.png?inline";

/**
 * 시온 아크 로고 — 리드가 준 **원본 그림**을 그대로 싣는다 (2026-08-13).
 *
 * 종전에는 시안을 보고 SVG로 옮겨 그렸는데 원본과 딴판이었다. 원본 JPG를 받아
 * **흰 배경을 투명으로 빼고 여백을 잘라** PNG로 만들어 넣었다
 * (변환 절차는 `docs/HANDOFF.md`에 적어 뒀다).
 *
 * ⚠️ **`?inline`으로 base64를 번들에 박는다.** 그냥 `public/`에 두거나 보통 import로
 * 두면 별도 파일로 떨어져 **팀 공유용 단일 HTML 프리뷰에서 그림이 깨진다** —
 * 그 빌드는 JS·CSS만 인라인하기 때문이다(음원이 안 들어가는 것과 같은 이유).
 * 55KB짜리라 번들에 박아도 부담이 없다.
 *
 * ⚠️ **어두운 화면 처리는 `src/index.css`의 `.zion-logo`가 맡는다.** 래스터라
 * 팔레트 변수처럼 뒤집히지 않아 남색 선이 어두운 배경에 묻힌다. 화면 파일에
 * `dark:`를 뿌리지 않는다는 규칙대로 그 한 곳에서 끝낸다.
 */

/** 원본 그림 384×228의 실제 비율 — 높이를 주면 너비가 이만큼 따라간다 */
const ASPECT = 384 / 228;

export function ZionLogo({ size = 36 }: { size?: number }) {
  const width = Math.round(size * ASPECT);
  return (
    <img
      src={logoArk}
      alt="시온 아크 로고"
      width={width}
      height={size}
      draggable={false}
      className="zion-logo shrink-0 select-none"
      style={{ width, height: size }}
    />
  );
}
