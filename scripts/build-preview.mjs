/**
 * 팀 공유 프리뷰 빌드 — dist/ 산출물을 자체 포함 단일 HTML로 묶는다.
 *
 * 왜 필요한가: 공유 호스팅은 외부 요청(별도 JS·CSS 파일)을 막고 서버 라우팅도 없다.
 * 그래서 ① 스크립트·스타일을 인라인하고 ② 해시 라우팅으로 빌드한다.
 *
 *   npm run build:preview
 *   → preview/zion-ark-preview.html
 *
 * 운영 배포에는 쓰지 않는다 (dist/ 를 그대로 올린다).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const OUT_DIR = "preview";
const OUT = join(OUT_DIR, "zion-ark-preview.html");

const assets = readdirSync(join(DIST, "assets"));
const jsFile = assets.find((f) => f.endsWith(".js"));
const cssFile = assets.find((f) => f.endsWith(".css"));
if (!jsFile || !cssFile) throw new Error("dist/assets 에서 js·css 를 찾지 못했습니다. 먼저 빌드하세요.");

const js = readFileSync(join(DIST, "assets", jsFile), "utf8");
const css = readFileSync(join(DIST, "assets", cssFile), "utf8");

/**
 * 스크립트는 base64 data URI 로 싣는다.
 * 본문에 그대로 인라인하면 감싸는 문서의 charset 을 따라가는데, 그 문서에
 * `<meta charset>` 이 없으면 한글이 깨져 정규식·문자열이 망가진다.
 * data URI 에 charset 을 박아 두면 인코딩이 고정된다.
 */
const jsDataUri = `data:text/javascript;charset=utf-8;base64,${Buffer.from(js, "utf8").toString("base64")}`;

const html = `<div id="root"></div>
<style>
${css}
</style>
<script type="module" src="${jsDataUri}"></script>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html, "utf8");
// 정적 서버로 미리 확인할 수 있게 같은 내용을 index.html 로도 둔다
writeFileSync(join(OUT_DIR, "index.html"), html, "utf8");

const mb = (Buffer.byteLength(html, "utf8") / 1024 / 1024).toFixed(2);
console.log(`${OUT} 생성 완료 — ${mb} MB`);
