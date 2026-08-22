import type { OpsNoteField } from "../lib/types";

/**
 * 주차별 진행 현황 · 운영 분석판 씨앗 값 (2026-08-22) — 리드가 전달한 운영 시트 화면을
 * 그대로 옮겨 적은 **시범 값**이다. 담당자가 화면에서 고치면 저장된 값이 이긴다
 * (씨앗 + 덮어쓰기 — `StudentProfile` 보충값과 같은 패턴. 저장은 `store.tsx`의
 * `zion_ark_week_ops_rows` · `zion_ark_ops_notes`).
 *
 * ⚠️ 문구는 시트 원문 그대로 두고 다듬지 않는다. 실존 인물 정보는 없다 — 운영 문구뿐이다.
 * ⚠️ 시범 기수(113기)에만 씌운다 — 다른 기수는 빈 판에서 시작한다.
 */
export interface WeekOpsSeed {
  operation: string;
  goal: string;
  spiritGoal: string;
  keyAction: string;
}

/** 개강 N주 → 시트의 네 칸. 시트에 「-」로 비워 둔 칸은 빈 문자열이다 */
export const WEEK_OPS_SEED: Record<number, WeekOpsSeed> = {
  16: {
    operation: "각반 어려운 인원 그룹 피드백",
    goal: "인터넷 검색교육",
    spiritGoal: "",
    keyAction: "유월의 필요성(마음, 정신, 사상, 육체) 회복",
  },
  17: {
    operation: "오픈 방향성 회의, 예배 띄우기",
    goal: "인터넷 검색교육",
    spiritGoal: "",
    keyAction: "하나님 소속에 대한 인식 회복",
  },
  18: {
    operation: "",
    goal: "",
    spiritGoal: "",
    keyAction: "성과 대비 초점 정렬·문제 인지",
  },
  19: {
    operation: "오픈",
    goal: "",
    spiritGoal: "[영] 목표",
    keyAction: "신천지 재오픈 전 점검 소망 점검",
  },
  20: {
    operation: "오픈",
    goal: "",
    spiritGoal: "",
    keyAction: "소망 점검 & 마음 점검 행동 점검",
  },
  21: {
    operation: "탈락인원 원인 분석, 기수 기도회",
    goal: "",
    spiritGoal: "[대심방기간] 에니어, 방어기제, 핵심 감정 재육성한",
    keyAction: "탈락인원 원인 점검 소망 점검",
  },
  22: {
    operation: "신천지 도서 '예정만' 다같이 묵상 시작",
    goal: "",
    spiritGoal: "[대심방기간] 에니어, 방어기제, 핵심 감정 재육성한",
    keyAction: "영을 믿는 믿음 회복 (설의/참여)",
  },
};

/** 운영 분석판의 사람이 적는 칸 넷 — 시트 하단 카드의 원문이다 */
export const OPS_NOTE_SEED: Record<OpsNoteField, string[]> = {
  checkpoint: [
    "소망 점검 · 마음 점검 · 행동 점검 단계별 관리",
    "신천지 재오픈 전 철저한 점검으로 위험 차단",
    "탈락인원 원인 분석 및 맞춤 케어",
    "설의/참여/믿음 회복을 통한 영적 성장",
  ],
  priority: [
    "신천지 재오픈 전 점검사항 완료 (개강 19주 중점)",
    "탈락인원 원인 분석 및 맞춤 케어 (개강 21주 중점)",
    "관계/기력/변화 상담을 통한 지속적 변화 유도",
  ],
  risk: [
    "신앙의식 낮고, 죄에 대한 인지 부족한 학생 집중 관리",
    "상담 구분 및 정확한 본인의 문제 인지 필수",
    "세상 돌아가서 잘살고 싶은 동기 → 전적 소망으로 전환 필요",
    "많은 이단 노출 위험 (특히 신천지 유입 가능성)",
  ],
  memo: [
    "기수 운영은 유월의 필요성 회복과 소속감 강화가 핵심",
    "영적 회복과 함께 신앙의 기초(말씀·기도·예배) 강화",
    "시험/특강/행사 일정을 통해 공동체 활성화",
  ],
};

/**
 * 성과 지표 목표 — 시트의 「보강 달성률 85% 이상 · 상담 이행률 90% 이상」.
 * 실측값은 화면이 출결 부호·보강 기록·상담 계획에서 계산한다 (`WeeklyPlanOps.tsx`).
 */
export const KPI_TARGETS = { makeup: 85, counsel: 90 } as const;
