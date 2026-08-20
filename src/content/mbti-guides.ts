/**
 * MBTI 선호 지표 — **수강생과 이야기할 때의 참고** (2026-08-18 리드 지시로 정리).
 *
 * ## ⚠️ 에니어그램 자료와 성격이 다르다
 *
 * 에니어그램 가이드(`enneagram-guides.ts`)는 **리드가 준 원문을 그대로** 실은 것이다.
 * 이 파일은 다르다 — **바깥 자료를 정리한 것**이고, 그래서 화면에 **출처와 한계를 함께**
 * 낸다. 리드가 신학부 원문을 주면 그때 이 자리를 원문으로 갈아 끼운다.
 *
 * ## ⚠️ 사람을 유형으로 가두지 않는다 (불변식 4)
 *
 * MBTI는 **선호 경향**을 넷으로 나눠 보는 도구이고, 능력·신앙·인격을 재는 잣대가 아니다.
 * 학계에서 신뢰도·타당도를 두고 논란이 이어져 온 도구이기도 하다. 그래서 이 자료는
 * **「이 사람은 이렇다」가 아니라 「이렇게 말을 걸어 보라」**는 쪽으로만 적었다.
 * 사이트는 유형으로 등급·추천을 계산하지 않는다.
 *
 * ## 왜 16유형을 하나하나 적지 않았나
 *
 * 16개를 각각 쓰면 그중 열두어 개는 근거 없이 지어낸 문장이 된다. 대신 **네 축**을 적고
 * 유형 글자에서 축을 뽑아 보여 준다 — ENFJ면 E·N·F·J 넷이 나온다. 근거가 있는 만큼만 말하고,
 * 조합의 뜻은 담당자가 판단한다.
 *
 * 출처: The Myers-Briggs Company(Communication Style Report) · myersbriggs.org(Type and Learning) ·
 * MBTI USA(Communication at Work). 2026-08-18 조사.
 */

export type MbtiLetter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

export interface MbtiPreference {
  letter: MbtiLetter;
  /** 네 축의 이름 */
  axis: string;
  /** 화면에 내는 이름 — 「외향(E)」 */
  label: string;
  /** 그 선호가 어떤 경향인지 */
  trait: string;
  /** 수업·상담에서 이렇게 해 본다 */
  tip: string;
}

export const MBTI_PREFERENCES: MbtiPreference[] = [
  {
    letter: "E",
    axis: "에너지 방향",
    label: "외향 (E)",
    trait: "밖으로 에너지가 향하고, 말하면서 생각이 정리되는 편입니다.",
    tip: "말할 자리를 먼저 줍니다. 소리 내어 정리하는 동안 끊지 않으면 스스로 답을 찾는 일이 많습니다.",
  },
  {
    letter: "I",
    axis: "에너지 방향",
    label: "내향 (I)",
    trait: "안으로 에너지가 향하고, 사람이 많은 자리에서는 기운이 빠지기도 합니다.",
    tip: "답할 시간을 줍니다. 물을 것을 미리 알려 주면 생각을 정리해 옵니다. 바로 대답을 재촉하지 않습니다.",
  },
  {
    letter: "S",
    axis: "받아들이는 방식",
    label: "감각 (S)",
    trait: "보고 듣는 구체적인 사실에서 시작합니다.",
    tip: "실제 사례와 순서를 들어 설명합니다. 「무엇을·언제·어떻게」가 분명하면 따라오기 쉽습니다.",
  },
  {
    letter: "N",
    axis: "받아들이는 방식",
    label: "직관 (N)",
    trait: "큰 그림과 뜻을 먼저 잡고, 세부는 그다음입니다.",
    tip: "요약부터 말하고 세부는 물어볼 때 꺼냅니다. 「왜 이렇게 되는가」를 함께 짚으면 붙듭니다.",
  },
  {
    letter: "T",
    axis: "판단하는 방식",
    label: "사고 (T)",
    trait: "앞뒤가 맞는지를 먼저 보고, 이견도 직접 말하는 편입니다.",
    tip: "근거와 차례를 밝혀 말합니다. 반론이 나오면 감정으로 읽지 말고 그 자리에서 함께 따져 봅니다.",
  },
  {
    letter: "F",
    axis: "판단하는 방식",
    label: "감정 (F)",
    trait: "사람들 사이의 조화와, 그 말이 상대에게 어떻게 닿을지를 함께 봅니다.",
    tip: "결론만 던지지 않고 마음이 어떤지 먼저 묻습니다. 따뜻한 분위기에서 더 잘 배웁니다.",
  },
  {
    letter: "J",
    axis: "생활 방식",
    label: "판단 (J)",
    trait: "계획이 정해지고 매듭이 지어지는 것을 편안해합니다.",
    tip: "일정과 다음 순서를 분명히 알려 줍니다. 갑작스러운 변경은 미리 말해 주는 편이 좋습니다.",
  },
  {
    letter: "P",
    axis: "생활 방식",
    label: "인식 (P)",
    trait: "선택지를 열어 두고 상황에 맞춰 가는 것을 편안해합니다.",
    tip: "여지를 남겨 둡니다. 궁금해하는 데를 따라가도록 두면 스스로 더 멀리 갑니다.",
  },
];

/**
 * 유형 글자(「ENFJ」)에서 네 축을 뽑는다.
 * ⚠️ 목록에 없는 글자가 오면 **건너뛴다** — 잘못 적힌 값으로 화면이 깨지지 않게 한다.
 */
export function preferencesOf(mbti: string): MbtiPreference[] {
  const letters = mbti.toUpperCase().split("");
  return MBTI_PREFERENCES.filter((p) => letters.includes(p.letter));
}

/** 화면 아래에 함께 내는 출처 — 어디서 온 말인지 밝힌다 */
export const MBTI_SOURCE_NOTE =
  "The Myers-Briggs Company의 소통 유형 보고서, myersbriggs.org의 학습 관련 자료, MBTI USA의 직장 내 소통 자료를 정리한 것입니다 (2026-08-18 조사).";
