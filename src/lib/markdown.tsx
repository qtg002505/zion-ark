import type { ReactNode } from "react";

/**
 * 초경량 마크다운 렌더러 — 외부 패키지 금지 원칙(원 저장소 규칙)에 따라 자체 구현.
 * 지원: 제목(#~####) · 목록(-, •) · 번호 목록 · 굵게(**) · 구분선 · 문단.
 * 본문 텍스트는 그대로 출력한다 (교리 내용 무변형).
 */

/**
 * 변환 과정에서 섞인 깨진 문자 제거 — 한글·문장부호는 보존.
 * 연속 2자 이상 한자 뭉치는 인코딩 깨짐 잔재다 (이 자료의 정상 한자는 단독 1자뿐).
 */
function stripArtifacts(line: string): string {
  return line
    .replace(/[Ā-ɏʰ-˿]/g, "")
    .replace(/[㐀-鿿]{2,}/g, "")
    .replace(/ {2,}/g, " ")
    .trimEnd();
}

function inline(text: string): ReactNode[] {
  // **굵게** 처리
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-zion-900">
        {p.slice(2, -2)}
      </strong>
    ) : (
      p
    ),
  );
}

export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let key = 0;

  function flushList() {
    if (!list) return;
    const L = list;
    blocks.push(
      L.ordered ? (
        <ol key={key++} className="my-2 list-decimal space-y-1.5 pl-6">
          {L.items.map((it, i) => (
            <li key={i} className="text-[14px] leading-relaxed text-gray-700">
              {inline(it)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={key++} className="my-2 space-y-1.5">
          {L.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-gray-700">
              <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-zion-400" />
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>
      ),
    );
    list = null;
  }

  function flushPara() {
    if (para.length === 0) return;
    blocks.push(
      <p key={key++} className="my-2 text-[14px] leading-relaxed text-gray-700">
        {inline(para.join(" "))}
      </p>,
    );
    para = [];
  }

  for (const rawLine of lines) {
    const line = stripArtifacts(rawLine).trim();

    if (line === "") {
      flushList();
      flushPara();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      flushList();
      flushPara();
      const level = heading[1].length;
      const content = heading[2];
      if (level <= 1) {
        // 문서 최상위 제목은 화면 상단 제목과 중복 — 소제목으로 강등해 유지
        blocks.push(
          <h3 key={key++} className="mt-6 border-b border-gold-300 pb-1 text-[16px] font-bold text-zion-900">
            {inline(content)}
          </h3>,
        );
      } else if (level === 2) {
        blocks.push(
          <h3 key={key++} className="mt-6 border-b border-gold-300 pb-1 text-[15px] font-bold text-zion-900">
            {inline(content)}
          </h3>,
        );
      } else {
        blocks.push(
          <h4 key={key++} className="mt-4 text-[14px] font-bold text-gold-700">
            {inline(content)}
          </h4>,
        );
      }
      continue;
    }

    if (/^(---+|\*\*\*+)$/.test(line)) {
      flushList();
      flushPara();
      blocks.push(<hr key={key++} className="my-4 border-gray-200" />);
      continue;
    }

    const bullet = line.match(/^[-•]\s*[•]?\s*(.*)/);
    if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.*)/);
    if (numbered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    // 목록 항목의 이어지는 줄
    if (list) {
      list.items[list.items.length - 1] += " " + line;
      continue;
    }
    para.push(line);
  }
  flushList();
  flushPara();

  return <div>{blocks}</div>;
}
