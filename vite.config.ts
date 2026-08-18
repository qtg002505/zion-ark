import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * 빌드 시각 — 화면 구석에 찍어 둔다.
 *
 * 왜: 팀 공유 프리뷰는 단일 HTML이라 "내가 보는 게 최신인가"를 확인할 방법이 없다.
 * 옛 화면이 보인다는 말이 나왔을 때, 이 스탬프가 있어야 배포가 안 된 것인지
 * 브라우저가 옛 파일을 들고 있는 것인지 가른다.
 */
const buildStamp = new Date().toISOString();

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp),
  },
  /**
   * 팀 공유 프리뷰(단일 HTML)에서는 **화면 가르기를 되돌린다** (2026-08-18).
   *
   * 본 빌드는 라우트마다 파일을 갈라 첫 화면을 가볍게 하지만(`App.tsx`의 `lazy`),
   * 프리뷰는 JS 한 덩이·CSS 한 덩이를 **문서에 박아 넣는 단일 HTML**이다
   * (`scripts/build-preview.mjs`). 갈라 둔 채로 묶으면 나머지 조각을 받아 올 곳이 없어
   * 첫 화면 말고는 **아무 화면도 안 뜬다.**
   *
   * 그래서 `--mode preview`일 때만 조각을 도로 하나로 합친다. 프리뷰는 어차피 통째로
   * 내려받는 파일이라 가르기의 이득이 없다 — 잃는 것도 없다.
   */
  build:
    mode === "preview"
      ? { rollupOptions: { output: { inlineDynamicImports: true } } }
      : {},
  server: {
    // 세션마다 dev 서버를 따로 띄울 수 있게 할당 포트(PORT)를 따른다.
    // 5173 고정이 필요한 콜백·CORS 조건은 없다. 없으면 종전대로 5173.
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
  },
}));
