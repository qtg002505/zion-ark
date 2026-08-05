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
 * 비ASCII 문자를 `\uXXXX` 로 바꿔 순수 ASCII 스크립트로 만든다.
 *
 * 왜: 감싸는 문서에 `<meta charset>` 이 없으면 인라인 스크립트의 한글이 깨져
 * 정규식·문자열이 망가진다. data URI 로 charset 을 고정하는 방법도 있지만
 * 호스팅의 콘텐츠 보안 정책이 외부 소스로 취급해 막을 수 있어, 문서 인코딩과
 * 무관한 ASCII 로 만들어 그대로 인라인하는 편이 안전하다.
 */
function toAscii(source) {
  return source.replace(/[-￿]/g, (ch) =>
    "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** 인라인 시 `</script>` 문자열이 태그를 조기 종료하지 않도록 끊어 준다 */
const safeJs = toAscii(js).replace(/<\/script/gi, "<\\/script");

const nonAsciiCss = css.match(/[-￿]/g);
if (nonAsciiCss) {
  console.warn(`주의: CSS에 비ASCII 문자 ${nonAsciiCss.length}개 — 표시가 깨지면 확인하세요.`);
}

const html = `<div id="root"></div>
<style>
${css}
</style>
<script type="module">
${safeJs}
</script>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html, "utf8");
// 정적 서버로 미리 확인할 수 있게 같은 내용을 index.html 로도 둔다
writeFileSync(join(OUT_DIR, "index.html"), html, "utf8");

const mb = (Buffer.byteLength(html, "utf8") / 1024 / 1024).toFixed(2);
console.log(`${OUT} 생성 완료 — ${mb} MB`);
