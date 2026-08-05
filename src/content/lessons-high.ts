/**
 * 고등 과정 강의 교안 — 요한계시록 22장 (원본: 공유자료/고등 계시록/*.docx).
 * docx → 텍스트 추출본을 빌드 타임에 원문 그대로 탑재한다. 교리 내용 재작성 금지.
 * 본문 구조: [핵심] · [서론] · [본론] · ◈ 결론 — 화면에서 소주제 접기로 렌더한다.
 */

export interface HighLesson {
  id: string;
  /** 목록 표기 (예: "계 1장 1-8절") */
  label: string;
  /** 본문 상단 제목 */
  title: string;
  body: string;
}

const raw = import.meta.glob("./lessons-high/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const HIGH_LESSONS: HighLesson[] = Object.entries(raw)
  .map(([path, body]) => {
    const file = path.split("/").pop()!.replace(/\.md$/, "");
    const name = file.replace(/^\d+\s+/, "");
    // "계 1장 1-8절 계시록 전장의 요약과 결론" → label / title 분리
    const m = name.match(/^(계\s*\d+장(?:\s*[\d-]+절)?)\s*(.*)$/);
    return {
      file,
      id: file.slice(0, 2),
      label: m ? m[1].replace(/\s+/g, " ") : name,
      title: m && m[2] ? m[2] : name,
      body,
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file))
  .map(({ id, label, title, body }) => ({ id, label, title, body }));
