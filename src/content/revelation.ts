/**
 * 자료실 시리즈 — 「요한계시록의 실상」 (1차 본문 대상).
 * ⚠️ 원본 `요한계시록의_실상_UTF-8_Markdown/` 수령 후 빌드 타임 변환으로 교체한다.
 *    교리 내용 재작성 금지 — 제목·장 번호·깨진 문단 정리만 허용 (착수지시문 작업 2).
 * 순서: 총론&개요 → 계1장 … 계22장. 제목 접두 "[요한계시록의 실상]"은 제거된 상태로 수록.
 */

export interface SeriesChapter {
  id: string;
  label: string;
  title: string;
  /** 원문 대기 시 null — 화면에서 '원문 이관 대기' 표시 */
  body: string | null;
}

export interface Series {
  id: "revelation" | "creation" | "acts";
  name: string;
  status: "ready" | "comingSoon";
  chapters: SeriesChapter[];
}

const PLACEHOLDER =
  "이 장의 본문은 원본 마크다운 파일(요한계시록의_실상_UTF-8_Markdown) 수령 후 빌드 타임 변환으로 탑재된다.\n\n" +
  "지금 화면은 장 목록·검색·열람 동선을 미리 확인하기 위한 구조 시연 상태다. 교리 본문은 원문 그대로 이관하며 재작성하지 않는다.";

export const REVELATION_SERIES: Series = {
  id: "revelation",
  name: "요한계시록의 실상",
  status: "ready",
  chapters: [
    { id: "intro", label: "총론", title: "총론 & 개요", body: PLACEHOLDER },
    ...Array.from({ length: 22 }, (_, i) => ({
      id: `ch${i + 1}`,
      label: `계${i + 1}장`,
      title: `요한계시록 ${i + 1}장`,
      body: PLACEHOLDER,
    })),
  ],
};

/** 천지창조 · 예수그리스도의 행전 — 1차는 메뉴 + ComingSoon만 (원본 소스 결정 대기) */
export const COMING_SERIES: Series[] = [
  { id: "creation", name: "천지창조", status: "comingSoon", chapters: [] },
  { id: "acts", name: "예수그리스도의 행전", status: "comingSoon", chapters: [] },
];
