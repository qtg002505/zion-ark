import { tokenize } from "./search";
import { classifyFeedback, type ClassifiedLine } from "./reaction-classify";
import { adviceUnits, type AdviceSlot, type AdviceUnit } from "./advice-corpus";

/**
 * 사이트 안에서 도는 **1차 조언** — 관찰 기록과 겹치는 내부 원문을 찾아 그대로 보여 준다.
 *
 * ## 왜 규칙인가 (= 왜 무료인가)
 *
 * `src/pages/Counseling.tsx`에 「사이트 안에 실시간 대화 API를 넣지 않는다 — 비용 부담과
 * 신학 지식 한계(환각) 때문」이 확정 방침으로 적혀 있다. 그래서 1차는 **브라우저 안에서
 * 도는 규칙**이고, 더 깊은 답이 필요하면 그때 외부 GPT로 나간다. 이 파일은 네트워크를
 * 쓰지 않으므로 **비용이 0이고, 기록이 기기 밖으로 나가지 않는다.**
 *
 * ## 절대 규칙 — 유형을 추정하지 않는다
 *
 * 관찰문만 보고 「이 사람은 1번 같습니다」를 **절대 내지 않는다.** 이미 기록된
 * `enneagramType`이 있을 때만 그 유형의 원문을 붙이고, 없으면 붙이지 않은 이유를 화면에 낸다.
 * 불변식 4(사람을 확정 판정하지 않는다)를 알고리즘 차원에서 못 어기게 하는 장치다.
 *
 * ## 엔진은 문장을 만들지 않는다
 *
 * 조언 본문은 전부 원문 줄(`lines`)이다. 이 파일이 쓰는 문장은 **고정 슬롯 제목 셋과
 * 고정 빈손 사유뿐**이다 — 불변식 5(재작성 금지)를 구조가 자동으로 지킨다.
 *
 * 이름을 `read*`로 지은 것은 `attendance-signals.ts`의 `readSignals`와 **같은 계약**임을
 * 알리기 위해서다: 판정하지 않고 관찰만 낸다. `order`도 정렬용이지 사람에 대한 점수가 아니다.
 */

export interface AdviceInput {
  /** 담당자가 적은 관찰 기록 */
  observation: string;
  /** **기록된** 에니어그램 유형(1~9). 없으면 에니어그램 근거는 붙지 않는다 */
  enneagramType?: number;
  /** 지금 진도 — 가까운 강의 자료를 먼저 본다 */
  lessonNo?: number;
  /**
   * 근거로 쓸 원문이 없는 성향값들. 무시하지 않고 **왜 못 썼는지 화면에 낸다** —
   * 프로필에 값이 있는데 조언에 안 쓰이면 「왜 무시하지?」가 되기 때문이다.
   */
  shapeType?: string;
  mbti?: string;
  sajuElement?: string;
}

export interface AdviceEvidence {
  unitId: string;
  slot: AdviceSlot;
  /** 출처 — 반드시 있다 (불변식 4) */
  source: string;
  sourceType: "에니어그램" | "교안";
  href: string;
  heading?: string;
  /** 원문 그대로 (불변식 5) */
  lines: readonly string[];
  /** 왜 걸렸나 — 관찰문에서 맞은 낱말. `classifyFeedback`의 `matched`와 같은 계약 */
  matchedWords: string[];
  /** 정렬용. **사람에 대한 점수가 아니다** — 화면에 숫자로 그리지 않는다 */
  order: number;
}

export interface AdviceSection {
  slot: AdviceSlot;
  title: string;
  evidence: AdviceEvidence[];
  /** 비었을 때만 — 지어내지 않고 정해진 문구를 쓴다 */
  emptyReason?: string;
}

export interface AdviceReading {
  /** 관찰문을 문장 단위로 읽은 것 — 무슨 낱말이 걸렸는지 보여 준다 */
  observed: ClassifiedLine[];
  /** 항상 세 칸. 비어도 자리를 지우지 않는다 */
  sections: AdviceSection[];
  /**
   * 기록된 유형의 **배경 원문**(「성장과정」) — ⚠️ **매칭 결과가 아니다.**
   * 관찰문과 겹치지 않아도 붙는다. 화면에서도 세 칸과 갈라 놓고 "겹쳐서 고른 것이 아니다"를
   * 밝힌다. 이렇게 나눈 이유: 성향 낱말은 교리 교안과 잘 안 겹쳐 첫 칸이 자주 비는데,
   * 유형을 적어 둔 담당자에게는 **그 유형의 배경**이 그 자리에서 바로 쓸모 있기 때문이다.
   */
  background: AdviceEvidence[];
  unusable: { field: string; reason: string }[];
  /** 무엇을 훑었는지 */
  scanned: string[];
  total: number;
}

/** 화면 맨 위에 붙는 한계 고지 — 규칙 기반이라 못 하는 것을 먼저 알린다 */
export const ADVICE_LIMITS = [
  "이 조언은 사이트 안의 원문에서 겹치는 대목을 찾아 그대로 보여 주는 것입니다. 문장을 새로 만들지 않습니다.",
  "낱말이 겹치는지만 봅니다. 뜻이 같아도 낱말이 다르면 못 찾습니다 — 안 나왔다고 해당 없는 것이 아닙니다.",
  "사람을 판정하지 않습니다. 여기 나온 것은 근거 원문이고, 무엇을 할지는 담당 사명자가 정합니다.",
];

/**
 * 훑는 범위 — `compose.ts`의 `COMPOSE_SOURCES`와 같은 취지로 화면에 미리 보여 준다.
 * **두 갈래의 성질이 다르다는 것까지 적는다** — 무엇을 적어야 걸리는지가 여기서 갈린다.
 */
export const ADVICE_SOURCES = [
  "에니어그램 유형별 원문 (기록된 유형만) — 성향 · 정서 · 태도 관찰에 걸립니다",
  "초등 교안 23강 (교육 핵심 제외 — 교리 본문이라 상담 근거로 쓰지 않습니다) — 교리를 어떻게 받아들이는지에 걸립니다",
];

/** 훑지 **않는** 것과 그 이유 — 빠진 것을 조용히 두지 않는다 */
export const ADVICE_NOT_SCANNED = [
  "성향 참고 4갈래(MBTI · 기질 · 핵심 감정 · 오행)는 일반에 알려진 지식의 요약이라 근거로 인용하지 않습니다.",
];

const SLOT_TITLES: Record<AdviceSlot, string> = {
  state: "지금 어떤 상태로 보이는지",
  open: "대화를 열 때 도움이 될 방식",
  caution: "조심할 것",
};

const SLOT_ORDER: AdviceSlot[] = ["state", "open", "caution"];

/**
 * 관찰문의 낱말과 원문의 낱말이 다를 때를 잇는 다리.
 *
 * ⚠️ **크게 만들지 않는다.** 커지면 유지가 안 되고 억지 매칭이 늘어 근거가 약해진다 —
 * **빈손이 오답보다 낫다.** 현장에서 「이건 걸렸어야 하는데」가 실제로 나올 때만 넓힌다.
 */
const BRIDGE: Record<string, string[]> = {
  자책: ["낙망", "완벽"],
  완벽: ["자책", "기준"],
  회피: ["피하", "부담"],
  질문: ["궁금", "따지"],
  가족: ["부모", "반대"],
  지각: ["시간", "약속"],
  결석: ["빠지", "출석"],
  불안: ["두려", "염려"],
  의심: ["불신", "확신"],
  침묵: ["말이 없", "조용"],
  성급: ["급하", "빨리"],
  고집: ["주장", "설득"],
};

interface QueryToken {
  /** 관찰문에 실제로 있던 낱말 — 근거 표기는 이것으로 한다 */
  word: string;
  /** 원문에서 찾아볼 문자열들 (자신 + 다리로 이어진 낱말) */
  probes: string[];
}

function buildQuery(tokens: string[]): QueryToken[] {
  return tokens.map((word) => {
    const extra = new Set<string>();
    for (const [key, values] of Object.entries(BRIDGE)) {
      if (word.includes(key)) values.forEach((v) => extra.add(v));
    }
    return { word, probes: [word, ...extra] };
  });
}

/** 근거가 이보다 약하면 버린다 — 낱말 하나가 스친 정도로는 조언이 되지 않는다 */
const MIN_SCORE = 3;
const MAX_PER_SLOT = 3;

interface Scored {
  unit: AdviceUnit;
  score: number;
  matchedWords: string[];
}

/**
 * 점수를 매긴다.
 *
 * ⚠️ **`search.ts`의 `scoreOf`를 쓰지 않는 이유**: 그 함수는 「맞은 낱말이 질의의 절반
 * 미만이면 버린다」는 컷오프를 건다. 검색어는 서너 낱말이라 그게 맞지만, **관찰 기록은
 * 낱말이 10~20개**라 절반 이상 맞는 원문은 사실상 없다 — 그대로 쓰면 **결과가 늘 0건**이 된다.
 */
function scoreUnit(unit: AdviceUnit, query: QueryToken[], negatives: Set<string>): Scored | null {
  let score = 0;
  const matchedWords: string[] = [];

  for (const q of query) {
    const inBody = q.probes.some((p) => unit.matchText.includes(p));
    if (!inBody) continue;
    const inHeading = q.probes.some((p) => unit.headingText.includes(p));

    matchedWords.push(q.word);
    // 상황 소제목에 걸린 것이 가장 또렷한 신호다 (「자책이 많은 수강생에게…」)
    score += inHeading ? 3 : 1;
    // 걱정스러운 대목에서 나온 낱말은 「여는 방식」·「조심할 것」 쪽에서 더 값이 있다
    if (negatives.has(q.word) && unit.slot !== "state") score += 1;
  }

  if (matchedWords.length === 0) return null;
  // 서로 다른 낱말이 여럿 걸릴수록 우연이 아니다
  if (matchedWords.length > 1) score += 2 * (matchedWords.length - 1);

  return score >= MIN_SCORE ? { unit, score, matchedWords } : null;
}

/** 관찰문에서 걱정스러운 문장에 든 낱말들 — 슬롯 가중치에만 쓴다 */
function negativeTokens(observed: ClassifiedLine[]): Set<string> {
  const out = new Set<string>();
  for (const line of observed) {
    if (line.sentiment !== "negative") continue;
    tokenize(line.text).forEach((t) => out.add(t));
  }
  return out;
}

function emptyReasonFor(hasType: boolean, hasTokens: boolean): string {
  if (!hasTokens) {
    return "관찰 내용이 아직 짧습니다. 무엇을 보았는지 조금 더 적으면 근거를 찾을 수 있습니다.";
  }
  if (!hasType) {
    return "성향 값(에니어그램 유형)이 기록되어 있지 않아 유형별 원문을 붙이지 못했고, 관찰 내용과 겹치는 교안 원문도 찾지 못했습니다. 수강생을 고르면 그 유형의 원문에서 찾습니다.";
  }
  return "관찰 내용과 겹치는 원문을 찾지 못했습니다. 무엇을 보았는지 — 특히 교리를 어떻게 받아들이는지 — 조금 더 적으면 근거를 찾을 수 있습니다.";
}

/** 못 쓴 성향값을 이유와 함께 돌려준다 — 무시하지 않고 화면에 낸다 */
function unusableOf(input: AdviceInput): { field: string; reason: string }[] {
  const out: { field: string; reason: string }[] = [];
  if (input.shapeType) {
    out.push({
      field: `도형 (${input.shapeType})`,
      reason: "대응 가이드 원문이 사이트에 아직 없습니다.",
    });
  }
  if (input.mbti) {
    out.push({
      field: `MBTI (${input.mbti})`,
      reason: "참고 요약만 있고 내부 원문이 없어 근거로 쓰지 않았습니다.",
    });
  }
  if (input.sajuElement) {
    out.push({
      field: `오행 (${input.sajuElement})`,
      reason: "참고 요약만 있고 내부 원문이 없어 근거로 쓰지 않았습니다.",
    });
  }
  return out;
}

/**
 * 관찰 기록을 읽고 **근거가 될 원문**을 세 칸에 나눠 담는다.
 * 순수 함수다 — React·스토어·네트워크를 쓰지 않는다.
 */
export function readAdvice(input: AdviceInput): AdviceReading {
  const observed = classifyFeedback(input.observation);
  const tokens = tokenize(input.observation);
  const query = buildQuery(tokens);
  const negatives = negativeTokens(observed);
  const hasType = typeof input.enneagramType === "number";

  const scored: Scored[] = [];
  if (query.length > 0) {
    for (const unit of adviceUnits()) {
      // 기록된 유형이 없으면 에니어그램 원문은 아예 쓰지 않는다 (유형을 추정하지 않는다)
      if (unit.typeNo !== undefined && unit.typeNo !== input.enneagramType) continue;

      const hit = scoreUnit(unit, query, negatives);
      if (!hit) continue;

      // 지금 진도와 가까운 강의 자료를 먼저 본다
      if (input.lessonNo && unit.lessonNo && Math.abs(unit.lessonNo - input.lessonNo) <= 2) {
        hit.score += 2;
      }
      scored.push(hit);
    }
  }

  scored.sort((a, b) => b.score - a.score || a.unit.lines.join().length - b.unit.lines.join().length);

  /*
    같은 출처(섹션)에서는 한 번만 뽑는다 — 한 섹션이 세 칸을 다 차지하면 시야가 좁아진다.
    위 칸(지금 상태)부터 채우므로 겹칠 때는 위가 이긴다.
  */
  const usedSource = new Set<string>();
  const sections: AdviceSection[] = SLOT_ORDER.map((slot) => {
    const picked: AdviceEvidence[] = [];
    for (const s of scored) {
      if (s.unit.slot !== slot) continue;
      if (usedSource.has(s.unit.source)) continue;
      usedSource.add(s.unit.source);
      picked.push({
        unitId: s.unit.id,
        slot,
        source: s.unit.source,
        sourceType: s.unit.sourceType,
        href: s.unit.href,
        heading: s.unit.heading,
        lines: s.unit.lines,
        matchedWords: s.matchedWords,
        order: s.score,
      });
      if (picked.length >= MAX_PER_SLOT) break;
    }
    return {
      slot,
      title: SLOT_TITLES[slot],
      evidence: picked,
      emptyReason: picked.length === 0 ? emptyReasonFor(hasType, query.length > 0) : undefined,
    };
  });

  return {
    observed,
    sections,
    background: backgroundOf(input.enneagramType, usedSource),
    unusable: unusableOf(input),
    scanned: ADVICE_SOURCES,
    total: sections.reduce((n, s) => n + s.evidence.length, 0),
  };
}

/**
 * 기록된 유형의 「성장과정」 원문 — **관찰문과 겹치는지 보지 않는다.**
 * 매칭 결과가 아니므로 `matchedWords`가 비어 있고, 화면에서도 세 칸과 갈라 그린다.
 */
function backgroundOf(typeNo: number | undefined, usedSource: Set<string>): AdviceEvidence[] {
  if (typeNo === undefined) return [];
  return adviceUnits()
    .filter((u) => u.typeNo === typeNo && u.source.endsWith("성장과정") && !usedSource.has(u.source))
    .map((u) => ({
      unitId: u.id,
      slot: u.slot,
      source: u.source,
      sourceType: u.sourceType,
      href: u.href,
      heading: u.heading,
      lines: u.lines,
      matchedWords: [],
      order: 0,
    }));
}

/**
 * 찾은 근거를 외부 GPT 프롬프트에 실을 수 있게 글로 만든다 (선택 기능).
 * 내부 **교육 원문**이라 개인정보가 없다 — `redactForAI` 대상이 아니다.
 * 외부 AI의 신학 환각을 줄이는 가장 싼 방법이다.
 */
export function adviceToPromptBlock(reading: AdviceReading): string {
  if (reading.total === 0) return "";
  const lines: string[] = ["[사이트가 찾은 내부 근거 — 이 자료 안에서 답해 주세요]"];
  for (const sec of reading.sections) {
    if (sec.evidence.length === 0) continue;
    lines.push(`· ${sec.title}`);
    for (const e of sec.evidence) {
      if (e.heading) lines.push(`  - ${e.heading}`);
      e.lines.forEach((l) => lines.push(`    ${l}`));
      lines.push(`    (출처: ${e.source})`);
    }
  }
  return lines.join("\n");
}
