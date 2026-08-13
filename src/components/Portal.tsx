import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * 화면 위에 띄우는 것(모달·팝오버)을 **`<body>` 바로 밑에 그린다** (2026-08-13).
 *
 * ## 왜 필요한가 — 실제로 겪은 일
 *
 * 화면 전환 효과를 넣으며 `main`에 `view-transition-name`을 줬는데, 이 속성은
 * **쌓임 맥락(stacking context)을 만든다.** 그러자 `main` 안에서 뜨던 수강생 상세 팝업이
 * `z-50`인데도 헤더(`z-20`)에 눌려 **팝업 머리가 잘렸다.** `z-50`은 `main` 안에서만
 * 유효하고, `main` 자체는 헤더와 형제이면서 z-index가 없어 밀린 것이다.
 *
 * 숫자를 올리는 것으로는 못 고친다 — 맥락이 다르면 몇을 주든 그 안에서만 논다.
 * **맥락 밖으로 꺼내는 것**이 답이다.
 *
 * ## 이걸 쓰면 함께 풀리는 것
 *
 * - `content-visibility`가 만드는 `contain: paint` 안에 갇히던 문제
 *   (소주제 안에 모달이 있으면 그 칸 안에서 열리던 것)
 * - 조상의 `transform`·`filter`·`backdrop-filter`가 `fixed`를 가두는 문제
 *
 * 이 셋은 원인이 달라 보이지만 전부 **「조상이 맥락을 만든다」**는 같은 뿌리다.
 * 그래서 앞으로 화면 위에 띄우는 것은 **처음부터 이걸로 감싼다.**
 */
export function Portal({ children }: { children: ReactNode }) {
  // 서버 렌더가 없는 앱이지만 body가 없는 순간에 부딪히지 않게 지킨다
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
