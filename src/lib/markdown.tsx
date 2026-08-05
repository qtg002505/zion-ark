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
            <li key={i} className="text-[14px] leading-relaxed text-ink">
              {inline(it)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={key++} className="my-2 space-y-1.5">
          {L.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-ink">
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
      <p key={key++} className="my-2 text-[14px] leading-relaxed text-ink">
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
      if (level <= 2) {
        blocks.push(
          <h3 key={key++} className="mt-6 border-b border-zion-200 pb-1 text-[15px] font-bold text-zion-900 first:mt-0">
            {inline(content)}
          </h3>,
        );
      } else {
        blocks.push(
          <h4 key={key++} className="mt-4 text-[14px] font-bold text-zion-700">
            {inline(content)}
          </h4>,
        );
      }
      continue;
    }

    if (/^(---+|\*\*\*+)$/.test(line)) {
      flushList();
      flushPara();
      blocks.push(<hr key={key++} className="my-4 border-zion-100" />);
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

/* ────────── 소주제 분할 (아코디언용) ────────── */

export interface DocSection {
  id: string;
  title: string;
  body: string;
}

/**
 * 본문을 소주제 단위로 자른다 — 접었다 펴는 열람을 위해서다.
 * 경계: 마크다운 `##`(레벨 1~2) · `[핵심]` 형태 · `◈ 결론` 형태.
 * 레벨 3 이상(`###`)은 섹션 안에 남겨 본문과 함께 렌더한다.
 * 원문은 자르기만 하고 고치지 않는다.
 */
export function splitSections(text: string): { lead: string; sections: DocSection[] } {
  const lines = text.split(/\r?\n/);
  const sections: DocSection[] = [];
  const lead: string[] = [];
  let current: { title: string; body: string[] } | null = null;

  function boundaryTitle(raw: string): string | null {
    const line = stripArtifacts(raw).trim();
    // 레벨 1(#)은 문서 제목이라 화면 제목과 겹친다 — 경계로 쓰지 않고 버린다
    if (/^#\s+/.test(line)) return null;
    const md = line.match(/^##\s+(.+)$/);
    if (md) return md[1].trim();
    // [핵심] [서론] 같은 짧은 표제만. [확인 필요: 원문] 류 변환 메모는 본문에 남긴다
    const bracket = line.match(/^\[([^\]\s:]{1,8})\]$/);
    if (bracket) return bracket[1].trim();
    const mark = line.match(/^◈\s*(.+)$/);
    if (mark) return mark[1].trim();
    return null;
  }

  for (const raw of lines) {
    // 문서 제목 줄은 화면 제목이 이미 보여 준다 — 본문에서 뺀다
    if (/^#\s+/.test(stripArtifacts(raw).trim())) continue;
    const title = boundaryTitle(raw);
    if (title !== null) {
      if (current) sections.push(toSection(current, sections.length));
      current = { title, body: [] };
      continue;
    }
    if (current) current.body.push(raw);
    else lead.push(raw);
  }
  if (current) sections.push(toSection(current, sections.length));

  return { lead: lead.join("\n").trim(), sections };
}

function toSection(c: { title: string; body: string[] }, idx: number): DocSection {
  return { id: `s${idx}`, title: c.title, body: c.body.join("\n").trim() };
}
