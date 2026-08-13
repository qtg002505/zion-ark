/**
 * 자료실 시리즈 본문 로더 — src/content/series/<id>/NN 제목.md 를 빌드 타임에
 * 원문 그대로(?raw) 탑재한다. 파일명 앞 두 자리 숫자가 장 순서다.
 * 교리 본문은 재작성하지 않는다 — 제목 접두·장 번호·깨진 문단 정리만 허용.
 * 원본 보관: 공유자료/도서/ (수정 금지)
 */

export interface SeriesChapter {
  id: string;
  /** 사이드 목록 표기 */
  label: string;
  /** 본문 상단 제목 */
  title: string;
  body: string;
  /** 예그행처럼 한 시리즈에 두 벌이 있을 때의 구분 */
  group: string | null;
}

export interface Series {
  id: "revelation" | "creation" | "acts";
  name: string;
  desc: string;
  chapters: SeriesChapter[];
}

type RawModules = Record<string, string>;

function toChapters(mods: RawModules, idPrefix: string, group: string | null): SeriesChapter[] {
  return Object.entries(mods)
    .map(([path, body]) => {
      const file = path.split("/").pop()!.replace(/\.md$/, "");
      const title = file.replace(/^\d+\s+/, "");
      return { file, title, body };
    })
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(({ file, title, body }) => {
      const no = file.match(/^(\d+)/)?.[1] ?? "00";
      // 계시록: "계N장 …" → 목록에는 "계N장"만
      const rev = title.match(/^계(\d+)장/);
      const label = rev ? `계${rev[1]}장` : title.includes("총론") ? "총론&개요" : title;
      return { id: `${idPrefix}${no}`, label, title, body, group };
    });
}

const revelationRaw = import.meta.glob("./series/revelation/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as RawModules;

const creationRaw = import.meta.glob("./series/creation/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as RawModules;

const actsMatthewRaw = import.meta.glob("./series/acts-matthew/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as RawModules;

export const SERIES: Series[] = [
  {
    id: "revelation",
    name: "요한계시록의 실상",
    desc: "총론&개요 → 계1장 ~ 계22장. 교리 본문은 원문 그대로 이관하며 재작성하지 않습니다.",
    chapters: toChapters(revelationRaw, "r", null),
  },
  {
    id: "creation",
    name: "천지창조",
    desc: "머리말·성경론 → 천지 창조론(노정·주제별 강해) → 요한계시록 전장 요약.",
    chapters: toChapters(creationRaw, "c", null),
  },
  {
    id: "acts",
    name: "예수그리스도의 행전",
    desc: "본문(마태복음)을 제공합니다.",
    /*
      교수안(마태·요한복음, `./series/acts-teaching/`)은 2026-08-13 리드 지시로 지웠다 —
      원문 파일까지 삭제했다(되살릴 때는 git 이력에서 꺼낸다).
    */
    chapters: toChapters(actsMatthewRaw, "m", null),
  },
];

export function findSeries(id: string | undefined): Series | undefined {
  return SERIES.find((s) => s.id === id);
}
