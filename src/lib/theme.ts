import { useCallback, useSyncExternalStore } from "react";

/**
 * 밝게/어둡게 전환 (2026-08-11).
 *
 * 값은 **`<html data-theme>` 한 곳**에만 쓴다 — 색을 실제로 바꾸는 것은
 * `src/index.css`의 `[data-theme="dark"]` 팔레트고, 여기는 그 스위치를 넘길 뿐이다.
 *
 * 고른 적이 없으면 **기기 설정(`prefers-color-scheme`)을 따른다.** 한 번 고르면
 * 그 선택이 이긴다 — 낮에는 기기가 밝게 두더라도 이 사이트만 어둡게 보고 싶을 수 있다.
 * 되돌리는 길은 「기기 설정 따르기」로 남겨 둔다.
 *
 * ⚠️ 첫 그림에서 흰 화면이 번쩍이지 않게 **`index.html`의 인라인 스크립트가
 * 같은 계산을 먼저 한다.** 규칙을 고치면 양쪽을 함께 고쳐야 한다.
 */
export type ThemePref = "light" | "dark" | "system";

const KEY = "zion_ark_theme";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    // 사생활 보호 모드에서 localStorage가 막히는 브라우저가 있다 — 기기 설정으로 간다
    return "system";
  }
}

function systemPrefersDark() {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
}

/** 지금 실제로 어둡게 볼지 — 선택이 없으면 기기 설정 */
export function resolveDark(pref: ThemePref) {
  return pref === "system" ? systemPrefersDark() : pref === "dark";
}

function apply(pref: ThemePref) {
  document.documentElement.dataset.theme = resolveDark(pref) ? "dark" : "light";
}

/* 구독자 목록 — 같은 화면에 토글이 둘 이상 있어도 함께 움직인다 */
const listeners = new Set<() => void>();
let current: ThemePref = typeof document === "undefined" ? "system" : readPref();

function subscribe(fn: () => void) {
  listeners.add(fn);
  // 「기기 설정 따르기」인 동안에는 기기 쪽이 바뀌면 따라간다
  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
  const onSystem = () => {
    if (current === "system") {
      apply(current);
      for (const l of listeners) l();
    }
  };
  mq?.addEventListener("change", onSystem);
  return () => {
    listeners.delete(fn);
    mq?.removeEventListener("change", onSystem);
  };
}

function setPref(pref: ThemePref) {
  current = pref;
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // 저장이 막혀도 이번 방문 동안은 적용된다
  }
  apply(pref);
  for (const l of listeners) l();
}

/**
 * 모듈이 실린 순간 한 번 적용한다.
 *
 * `index.html`의 인라인 스크립트가 이미 같은 일을 하지만, **팀 공유 프리뷰(단일 HTML)에는
 * 그 스크립트가 실려 오지 않는다** — `scripts/build-preview.mjs`가 번들 js·css만 뽑아
 * 새 문서를 만들기 때문이다. 여기서 한 번 더 걸어 두면 어느 경로로 열어도 색이 맞는다.
 */
if (typeof document !== "undefined") apply(current);

/**
 * `[pref, isDark, setPref]`.
 * 서버 렌더가 없는 앱이지만 `useSyncExternalStore`의 세 번째 인자를 채워 둔다 —
 * 첫 그림에서 값이 흔들리지 않게 하는 안전장치다.
 */
export function useTheme() {
  const pref = useSyncExternalStore(
    subscribe,
    () => current,
    () => "system" as ThemePref,
  );
  const isDark = useSyncExternalStore(
    subscribe,
    () => (typeof document === "undefined" ? false : document.documentElement.dataset.theme === "dark"),
    () => false,
  );
  const set = useCallback((next: ThemePref) => setPref(next), []);
  return { pref, isDark, setTheme: set };
}
