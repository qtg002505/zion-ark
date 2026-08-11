import { Link as RouterLink, NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import type { LinkProps, NavLinkProps, To } from "react-router-dom";
import { flushSync } from "react-dom";

/**
 * 화면 전환에 View Transitions를 태운 `Link` · `NavLink` (2026-08-11).
 *
 * ## 왜 직접 만들었나
 *
 * React Router에도 `<Link viewTransition>`이 있지만 **데이터 라우터
 * (`createBrowserRouter` + `RouterProvider`)에서만 동작한다.** 이 앱은
 * `<BrowserRouter>` + `<Routes>` 구성이라 그 prop이 **조용히 무시된다** —
 * 붙여 놓고 "됐다"고 믿기 딱 좋은 자리다(실제로 그렇게 믿을 뻔했고,
 * `document.startViewTransition` 호출 수가 0인 것을 보고 알았다).
 *
 * 라우터를 데이터 라우터로 갈아 끼우면 정공법이지만, 로그인 분기와 Provider 배치가
 * 전부 뒤집힌다. 전환 효과 하나를 위해 앱 뼈대를 흔들 이유가 없어 **클릭만 감싼다.**
 * 나중에 데이터 라우터로 옮기게 되면 이 파일을 지우고 `react-router-dom`의
 * `Link`로 되돌리면 된다 — 쓰는 쪽 코드(`viewTransition` prop)는 그대로다.
 *
 * ## 어떻게 도나
 *
 * `startViewTransition` 콜백 **안에서 화면이 실제로 바뀌어야** 브라우저가 앞뒤를
 * 찍어 이어 붙인다. React는 상태 변경을 모아 나중에 그리므로 `flushSync`로
 * 그 자리에서 그리게 한다.
 *
 * 새 탭으로 여는 클릭(⌘·Ctrl·Shift·가운데 단추)은 건드리지 않는다 —
 * 가로채면 새 탭이 안 열린다.
 */
function useTransitionClick({
  to,
  replace,
  viewTransition,
  onClick,
}: {
  to: To;
  replace?: boolean;
  viewTransition?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const navigate = useNavigate();
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!viewTransition) return;
    // 새 탭·새 창으로 여는 클릭은 브라우저에 맡긴다
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // 지원하지 않는 브라우저(Firefox 등)는 종전처럼 즉시 바뀐다 — 기능이 깨지지 않는다
    if (typeof document.startViewTransition !== "function") return;
    e.preventDefault();
    document.startViewTransition(() => {
      flushSync(() => {
        navigate(to, { replace });
      });
    });
  };
}

export function Link({ viewTransition, onClick, to, replace, ...rest }: LinkProps) {
  const handleClick = useTransitionClick({ to, replace, viewTransition, onClick });
  return <RouterLink to={to} replace={replace} onClick={handleClick} {...rest} />;
}

export function NavLink({ viewTransition, onClick, to, replace, ...rest }: NavLinkProps) {
  const handleClick = useTransitionClick({ to, replace, viewTransition, onClick });
  return <RouterNavLink to={to} replace={replace} onClick={handleClick} {...rest} />;
}
