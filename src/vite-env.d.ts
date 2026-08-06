/// <reference types="vite/client" />

/**
 * 빌드 시각 (ISO) — `vite.config.ts`의 `define`이 넣는다.
 * 화면 구석에 찍어, 팀원이 보고 있는 것이 최신 빌드인지 눈으로 확인하게 한다.
 */
declare const __BUILD_STAMP__: string;
