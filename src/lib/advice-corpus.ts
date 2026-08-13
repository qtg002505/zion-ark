import { enneagramGuides } from "../content/enneagram-guides";
import { elementaryLessons } from "../content/elementary-lessons";

/**
 * 1차 조언의 **근거 색인** — 내부 원문을 조언 칸에 꽂을 수 있는 최소 단위로 자른다.
 *
 * ## 왜 `search.ts`·`compose.ts`와 따로 두는가
 *
 * 셋은 **알갱이 크기가 다르다.**
 *
 * - `search.ts` — 강/유형 **통째로** 한 문서. 질문을 받아 "그 화면으로 가라"고 안내한다
 * - `compose.ts` — **섹션 통째로**. 강의안에 붙일 자료를 모은다
 * - 여기 — **항목 한 줄 / 성구 블록 하나**. 조언 칸에 그대로 꽂는다
 *
 * 그래서 합치지 않고 **토크나이저(`search.ts`의 `tokenize`)만 공유**한다.
 *
 * ## 지키는 것
 *
 * - **원문을 한 글자도 고치지 않는다** (불변식 5). 번호도 그대로 싣는다 — 자르기만 한다
 * - **출처(`source`)가 없는 유닛을 만들 수 없다** — 타입이 필수 필드로 강제한다 (불변식 4)
 * - `temperament-guides.ts`는 **넣지 않는다.** 그 파일 머리에 「일반에 알려진 참고 지식의
 *   요약이지 내부 교육 원문이 아니다」라고 적혀 있다 — 근거로 쓰면 출처 표기가 거짓이 된다
 * - 교안 「교육 핵심」도 **넣지 않는다.** 교리 본문이라, 상담 근거로 내보내면 규칙이 교리
 *   판단을 하는 꼴이 된다
 */

export type AdviceSlot = "state" | "open" | "caution";

/** 조언 칸에 꽂히는 근거 한 조각 */
export interface AdviceUnit {
  id: string;
  slot: AdviceSlot;
  /** 출처 표기 — 필수 (불변식 4) */
  source: string;
  sourceType: "에니어그램" | "교안";
  href: string;
  /** 에니어그램 유형 한정 — 기록된 유형이 있을 때만 이 유닛을 쓴다 */
  typeNo?: number;
  /** 몇 강 자료인지 — 진도가 가까우면 먼저 본다 */
  lessonNo?: number;
  /** 성구 블록의 상황 소제목 원문 (예: 「5. 자책이 많은 수강생에게…」) */
  heading?: string;
  /** 원문 줄 그대로 */
  lines: readonly string[];
  /** 매칭용 소문자 합본 */
  matchText: string;
  /** 소제목만 소문자 — 여기 걸리면 가장 또렷한 신호라 무겁게 본다 */
  headingText: string;
}

/**
 * 성구 섹션의 상황 소제목 — 「5. 자책이 많은 수강생에게…」.
 * `Enneagram.tsx:24`의 `/^\d+\.\s/`보다 관대하게 잡는다(`1)` 표기도 받는다).
 */
const VERSE_HEADING = /^\d+[.)]\s*/;

export interface VerseBlock {
  heading?: string;
  lines: string[];
}

/**
 * 성구 섹션을 **상황 블록**으로 접는다.
 *
 * 원문이 이렇게 생겼다 — 소제목과 그 아래 성구가 같은 배열에 섞여 있다:
 *
 *     5. 자책이 많은 수강생에게 자책을 줄이고…      ← 소제목(상황)
 *     전 7:16~18 지나치게 의인이 되지 말며~        ← 그 상황에 쓸 성구
 *     고전10:13 사람에게 감당할 시험만 주시고…
 *     6. 자기기준에 매여 낙망하고 있는 수강생에게…  ← 다음 소제목
 *
 * ⚠️ **소제목이 하나도 없는 섹션이 있다**(6번 유형). 그 줄들은
 * `(확신, 용기) 수 1:6-7 두려워말라…`처럼 **줄 하나가 상황과 성구를 다 담고** 있어서,
 * 「줄 하나 = 블록 하나」로 폴백하면 오히려 매칭에 유리하다.
 * 첫 소제목 앞에 오는 고아 줄(전체 25개)도 같은 취급이다.
 */
export function parseVerseBlocks(items: readonly string[]): VerseBlock[] {
  const blocks: VerseBlock[] = [];
  let current: VerseBlock | null = null;

  for (const raw of items) {
    const line = raw.trim();
    if (!line) continue;

    if (VERSE_HEADING.test(line)) {
      current = { heading: line, lines: [] };
      blocks.push(current);
      continue;
    }
    // 소제목을 아직 못 만났으면 줄 하나가 곧 블록이다 (6번 유형·고아 줄)
    if (!current) blocks.push({ lines: [line] });
    else current.lines.push(line);
  }

  // 소제목만 있고 아래 줄이 없는 블록은 소제목 자체가 내용이다
  return blocks.map((b) => (b.lines.length === 0 && b.heading ? { ...b, lines: [b.heading] } : b));
}

/**
 * 섹션 라벨 → 조언 칸. **매핑은 여기 한 곳에만 둔다.**
 * 목록에 없는 라벨은 근거에서 빠진다 (교안 「교육 핵심」이 그렇다 — 일부러 뺐다).
 */
const ENNEAGRAM_SLOTS: Record<string, AdviceSlot> = {
  성장과정: "state",
  "단계향상 방법": "open",
  "초중고 관리팁": "open",
  "보강 성구 - 메리트를 줄 수 있는 내용": "open",
  "보강 성구 - 단점을 보완할 수 있는 내용": "caution",
};

const LESSON_SLOTS: Record<string, AdviceSlot> = {
  "기존 관점": "state",
  "예상 반응·질문": "state",
  "유도형 질문": "open",
  "예방·상담": "open",
  "교정 포인트": "open",
  "강의 주의사항": "caution",
};

/** 성구 섹션은 줄 단위가 아니라 **상황 블록 단위**로 자른다 */
const isVerseSection = (label: string) => label.startsWith("보강 성구");

function unit(u: Omit<AdviceUnit, "matchText" | "headingText">): AdviceUnit {
  return {
    ...u,
    matchText: [u.heading ?? "", ...u.lines].join(" ").toLowerCase(),
    headingText: (u.heading ?? "").toLowerCase(),
  };
}

let cache: AdviceUnit[] | null = null;

/**
 * 근거 유닛 전부. **모듈이 사는 동안 한 번만 만든다**
 * (`search.ts`의 `staticDocs`, `compose.ts`의 `sectionCache`와 같은 방식).
 */
export function adviceUnits(): AdviceUnit[] {
  if (cache) return cache;
  const out: AdviceUnit[] = [];

  for (const guide of enneagramGuides) {
    for (const sec of guide.sections) {
      const slot = ENNEAGRAM_SLOTS[sec.label];
      if (!slot) continue;
      const source = `에니어그램 ${guide.typeNo}번 · ${sec.label}`;

      if (isVerseSection(sec.label)) {
        parseVerseBlocks(sec.items).forEach((b, i) => {
          out.push(
            unit({
              id: `en-${guide.typeNo}-${sec.label}-${i}`,
              slot,
              source,
              sourceType: "에니어그램",
              href: "/enneagram",
              typeNo: guide.typeNo,
              heading: b.heading,
              lines: b.lines,
            }),
          );
        });
        continue;
      }

      sec.items.forEach((line, i) => {
        out.push(
          unit({
            id: `en-${guide.typeNo}-${sec.label}-${i}`,
            slot,
            source,
            sourceType: "에니어그램",
            href: "/enneagram",
            typeNo: guide.typeNo,
            lines: [line],
          }),
        );
      });
    }
  }

  for (const lesson of elementaryLessons) {
    for (const sec of lesson.sections) {
      const slot = LESSON_SLOTS[sec.label];
      if (!slot) continue;
      sec.items.forEach((line, i) => {
        out.push(
          unit({
            id: `el-${lesson.lessonNo}-${sec.id}-${i}`,
            slot,
            source: `초등 ${lesson.lessonNo}강 「${lesson.title}」 · ${sec.label}`,
            sourceType: "교안",
            href: "/lessons",
            lessonNo: lesson.lessonNo,
            lines: [line],
          }),
        );
      });
    }
  }

  cache = out;
  return out;
}

export interface CorpusStats {
  total: number;
  enneagram: number;
  lesson: number;
  /** 상황 소제목이 붙은 성구 블록 — 이 수가 무너지면 파서가 깨진 것이다 */
  verseBlocksWithHeading: number;
  /** 소제목 없이 줄 하나로 떨어진 블록 (6번 유형·고아 줄) */
  verseBlocksLoose: number;
  bySlot: Record<AdviceSlot, number>;
}

/**
 * 색인이 제대로 만들어졌는지 스스로 센다.
 *
 * ⚠️ 이 설계의 **유일한 무증상 실패 모드**가 「원문이 갱신됐는데 파서가 조용히 0을 내는 것」이다.
 * 소제목 번호가 `1.`에서 `1)`로 바뀌기만 해도 블록 71개가 낱줄 96개로 무너지는데, 화면에는
 * 「결과가 좀 다르네」 정도로만 보인다. 그래서 개발 중에는 이 숫자를 화면에 띄운다.
 */
export function corpusStats(): CorpusStats {
  const units = adviceUnits();
  const verse = units.filter((u) => u.sourceType === "에니어그램" && u.source.includes("보강 성구"));
  return {
    total: units.length,
    enneagram: units.filter((u) => u.sourceType === "에니어그램").length,
    lesson: units.filter((u) => u.sourceType === "교안").length,
    verseBlocksWithHeading: verse.filter((u) => u.heading).length,
    verseBlocksLoose: verse.filter((u) => !u.heading).length,
    bySlot: {
      state: units.filter((u) => u.slot === "state").length,
      open: units.filter((u) => u.slot === "open").length,
      caution: units.filter((u) => u.slot === "caution").length,
    },
  };
}
