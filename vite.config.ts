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

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp),
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
