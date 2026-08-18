import { defineConfig } from "vitest/config";

/**
 * 테스트 설정을 `vite.config.ts`와 **따로 둔다.**
 *
 * 빌드 설정에 `test` 블록을 얹으면 `defineConfig`를 `vitest/config`에서 가져와야 하고,
 * 그러면 **운영 빌드 경로가 테스트 도구에 매인다.** 배포는 테스트와 무관하게 돌아야 하므로
 * 파일을 갈라 두었다.
 *
 * 화면(React) 렌더 테스트는 아직 넣지 않는다 — 지금 덮는 것은 **순수 로직**이다.
 * 권한 판정 · 기수 일정 산수 · 검색 매칭 · 개인정보 거르기가 그것이고, 넷 다 화면 없이
 * 결과가 정해진다. 그래서 `environment`도 node면 충분하다.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
