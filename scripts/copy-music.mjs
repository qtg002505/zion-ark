import { readdirSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

/**
 * 음원 복사 — `음악/` → `public/music/`.
 *
 * ⚠️ **한글이 든 처리는 PowerShell로 하지 않는다.** PowerShell 5.1이 한글을 ANSI로 읽어
 * 파일명이 깨진다 (실제로 겪은 함정 — `zion-ark-web` 스킬 참고).
 *
 * ⚠️ **파일명에서 `[` `]` `#` `~`를 걷어낸다.** 이 글자가 남으면 Vite dev 서버가 403을 내
 * 음원이 조용히 재생되지 않는다. 공백도 `-`로 바꿔 URL에서 인코딩되지 않게 한다.
 */

const SRC = "음악";
const DEST = join("public", "music");

/** 재생 가능한 소리 파일만 옮긴다 */
const AUDIO = new Set([".mp3", ".m4a", ".ogg", ".wav"]);

export function safeName(name) {
  const ext = extname(name);
  const stem = basename(name, ext)
    .replace(/[[\]#~]/g, "") // Vite 403을 부르는 글자
    .replace(/^\s*\d+\.\s*/, "") // 앞머리 번호 ("4. 더 가까이" → "더 가까이")
    .trim()
    .replace(/\s+/g, "-");
  return stem + ext.toLowerCase();
}

function main() {
  mkdirSync(DEST, { recursive: true });
  const rows = [];

  for (const entry of readdirSync(SRC)) {
    const from = join(SRC, entry);
    if (!statSync(from).isFile()) continue;
    if (!AUDIO.has(extname(entry).toLowerCase())) continue;

    const to = join(DEST, safeName(entry));
    copyFileSync(from, to);
    rows.push({
      원본: entry,
      저장: safeName(entry),
      MB: (statSync(to).size / 1024 / 1024).toFixed(2),
    });
  }

  console.table(rows);
  console.log(`${rows.length}개 복사 완료 → ${DEST}`);
}

main();
