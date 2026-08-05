/**
 * 에니어그램 9유형 가이드 — 유형별 4항목 구조 (원 저장소 enneagram-guides.ts 계약).
 * ⚠️ 요약은 일반 에니어그램 이론 수준의 시연용 텍스트. 원문 이관 시 교체.
 */

export interface EnneagramGuide {
  type: number;
  name: string;
  keyword: string;
  growth: string; // 성장과정
  schoolTips: string; // 초중고 관리팁
  improvement: string; // 단계향상 방법
  verses: string; // 보강 성구 (메리트·단점 보완)
}

export const ENNEAGRAM_GUIDES: EnneagramGuide[] = [
  { type: 1, name: "개혁가", keyword: "원칙·완벽", growth: "옳고 그름의 기준이 일찍 서고, 스스로에게 엄격한 편이다.", schoolTips: "지적보다 인정이 먼저다. 규칙이 명확할 때 안정감을 느낀다.", improvement: "완벽하지 않아도 괜찮다는 경험을 반복해서 쌓게 한다.", verses: "[샘플] 원문 이관 대기" },
  { type: 2, name: "조력가", keyword: "관계·도움", growth: "타인의 필요를 빠르게 알아차리고 돕는 데서 존재감을 얻는다.", schoolTips: "도움을 요청하는 역할을 맡기면 몰입한다. 거절 경험에 취약하다.", improvement: "자신의 필요를 말로 표현하는 연습을 돕는다.", verses: "[샘플] 원문 이관 대기" },
  { type: 3, name: "성취가", keyword: "목표·성과", growth: "성취와 인정으로 동기가 형성된다. 비교 환경에 민감하다.", schoolTips: "구체적 목표와 피드백 주기가 있으면 꾸준하다.", improvement: "결과가 아닌 과정을 인정받는 경험이 필요하다.", verses: "[샘플] 원문 이관 대기" },
  { type: 4, name: "예술가", keyword: "감성·정체성", growth: "감정의 진폭이 크고 자기만의 의미를 중시한다.", schoolTips: "감정을 부정하지 말고 이름 붙여 주는 대화가 효과적이다.", improvement: "감정과 사실을 분리해 보는 훈련을 함께한다.", verses: "[샘플] 원문 이관 대기" },
  { type: 5, name: "사색가", keyword: "지식·관찰", growth: "관찰하고 이해한 뒤에 움직인다. 에너지를 아껴 쓴다.", schoolTips: "즉답을 요구하지 말고 생각할 시간을 준다. 질문의 질이 높다.", improvement: "아는 것을 나누는 자리를 만들어 참여를 끌어낸다.", verses: "[샘플] 원문 이관 대기" },
  { type: 6, name: "충성가", keyword: "안전·신뢰", growth: "신뢰할 대상을 찾고, 확인 후에 안심한다.", schoolTips: "일정·규칙의 예측 가능성이 중요하다. 갑작스런 변경에 불안해한다.", improvement: "작은 결정을 스스로 내리고 확인받는 경험을 쌓게 한다.", verses: "[샘플] 원문 이관 대기" },
  { type: 7, name: "낙천가", keyword: "즐거움·확장", growth: "새로움과 재미로 동기가 생기고, 반복에 약하다.", schoolTips: "변화를 주는 진행, 활동형 참여가 잘 맞는다.", improvement: "하나를 끝까지 마치는 경험에 의미를 부여한다.", verses: "[샘플] 원문 이관 대기" },
  { type: 8, name: "지도자", keyword: "주도·보호", growth: "주도권이 있을 때 힘이 나고, 약함을 드러내기 어려워한다.", schoolTips: "역할과 책임을 주면 팀을 끌고 간다. 정면 대립은 피한다.", improvement: "힘이 아닌 신뢰로 관계를 세우는 경험이 필요하다.", verses: "[샘플] 원문 이관 대기" },
  { type: 9, name: "중재자", keyword: "평화·조화", growth: "갈등을 피하고 전체의 조화를 우선한다. 자기 주장이 늦다.", schoolTips: "의견을 물어봐 주는 것 자체가 참여를 끌어낸다.", improvement: "선호를 말하는 작은 선택부터 연습하게 한다.", verses: "[샘플] 원문 이관 대기" },
];
