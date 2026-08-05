/**
 * 초등 과정 강의 교안 — 강 1건당 7항목 구조 (원 저장소 elementary-lessons.ts 계약).
 * ⚠️ 여기 수록된 본문은 구조 시연용 샘플이다. 실제 교안 원문은 원 저장소
 * (app/content/elementary-lessons.ts)에서 이관한다 — 교리 내용 재작성 금지.
 */

export interface Lesson {
  no: number;
  title: string;
  /** 7항목 — 전부 채워진 강만 상세 열람 가능 */
  detail: LessonDetail | null;
}

export interface LessonDetail {
  core: string; // 교육 핵심
  priorView: string; // 기존 관점
  expectedReactions: string; // 예상 반응·질문
  cautions: string; // 강의 주의사항
  guidingQuestions: string; // 유도형 질문
  counseling: string; // 예방·상담
  correction: string; // 교정 포인트
}

const SAMPLE: LessonDetail = {
  core: "[샘플] 본 강의 핵심 요지를 요약해 담는 자리다. 실제 교안 원문 이관 전까지 구조 확인용 문구가 표시된다.",
  priorView: "[샘플] 수강생이 기존에 갖고 있던 일반적 관점을 정리하는 자리.",
  expectedReactions: "[샘플] 강의 중 자주 나오는 반응과 질문 유형을 정리하는 자리.",
  cautions: "[샘플] 강의 시 주의할 표현·전개 순서를 정리하는 자리.",
  guidingQuestions: "[샘플] 수강생 스스로 답을 찾게 하는 유도형 질문 목록.",
  counseling: "[샘플] 예방·상담 관점에서 미리 다뤄야 할 주제.",
  correction: "[샘플] 오해가 생겼을 때 바로잡는 교정 포인트.",
};

/** 초등 23강 — 강 제목은 목차 수준만 수록 (원문 이관 대기) */
export const ELEMENTARY_LESSONS: Lesson[] = [
  { no: 1, title: "1강 — 성경의 목적과 구성", detail: SAMPLE },
  { no: 2, title: "2강 — 역사·교훈·예언의 구분", detail: SAMPLE },
  { no: 3, title: "3강 — 예언과 실상", detail: SAMPLE },
  ...Array.from({ length: 20 }, (_, i) => ({
    no: i + 4,
    title: `${i + 4}강 — (원문 이관 대기)`,
    detail: null,
  })),
];
