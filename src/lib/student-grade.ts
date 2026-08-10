import { CheckCircle2, Eye, Target, TriangleAlert, Ban, type LucideIcon } from "lucide-react";
import type { Student } from "./types";
import { readSignals } from "./attendance-signals";

/**
 * 등급 A~E — 수강생 목록·전체현황에서 쓰는 **출결 기준** 분류 (2026-08-10 리드 확정).
 *
 * ⚠️ 신앙·인격을 판정하는 등급이 아니다(불변식 4) — **출석률**만 본다.
 * 그래서 규칙이 한 줄로 설명된다: 누적 출석률이 어느 구간에 있는가.
 *
 * **사람이 바꾼 등급이 언제나 이깁니다.** 자동 계산은 기본값일 뿐이고, 담당 사명자가
 * 화면에서 고치면 그 값이 저장돼 계속 쓰인다(`StudentStatusOverride.grade`).
 * 자동값과 사람이 정한 값을 함께 볼 때는 `effectiveGrade()`를 쓴다 — 세 화면이 같은
 * 규칙을 쓰도록 한 곳에 모았다.
 */
export type Grade = "A" | "B" | "C" | "D" | "E";

export const GRADES: Grade[] = ["A", "B", "C", "D", "E"];

export const GRADE_LABELS: Record<Grade, string> = {
  A: "정상",
  B: "관심",
  C: "집중",
  D: "위기",
  E: "중단",
};

/** 자동 판정 경계 — 화면에 그대로 적어 사람이 규칙을 알 수 있게 한다 */
export const GRADE_RANGE: Record<Grade, string> = {
  A: "90% 이상",
  B: "70~89%",
  C: "50~69%",
  D: "30~49%",
  E: "30% 미만",
};

export const GRADE_TONE: Record<Grade, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-amber-50 text-amber-700 border-amber-200",
  C: "bg-violet-50 text-violet-700 border-violet-200",
  D: "bg-orange-50 text-orange-700 border-orange-200",
  E: "bg-zion-100 text-ink-soft border-zion-200",
};

/**
 * 출결 기준 자동 등급 — **누적 출석률** 구간으로만 가른다.
 *
 * 최근 8주가 아니라 누적을 쓰는 이유: 등급은 한 주 사정에 흔들리면 안 되고,
 * 사람이 "지금 이 사람이 어디쯤인가"를 가늠하는 값이기 때문이다.
 * 최근 흔들림은 「관찰 필요」(`attendance-signals.ts`)가 따로 잡는다.
 */
export function gradeOf(student: Student): Grade {
  const r = student.attendanceRate;
  if (r >= 90) return "A";
  if (r >= 70) return "B";
  if (r >= 50) return "C";
  if (r >= 30) return "D";
  return "E";
}

/**
 * 화면에 실제로 보여 줄 등급 — **사람이 정한 값이 자동값을 이긴다.**
 * 등급을 쓰는 화면이 여럿이라(수강생 목록·개인 상세·전체현황) 규칙을 여기 하나로 모았다.
 */
export function effectiveGrade(student: Student, overrideGrade?: Grade | null): Grade {
  return overrideGrade ?? gradeOf(student);
}

/** 사람이 자동값을 덮어쓴 상태인지 — 화면에서 "직접 지정"임을 알릴 때 쓴다 */
export function isOverridden(student: Student, overrideGrade?: Grade | null): boolean {
  return overrideGrade != null && overrideGrade !== gradeOf(student);
}

export const GRADE_ICON: Record<Grade, LucideIcon> = {
  A: CheckCircle2,
  B: Eye,
  C: Target,
  D: TriangleAlert,
  E: Ban,
};

export const GRADE_ICON_BG: Record<Grade, string> = {
  A: "bg-emerald-500",
  B: "bg-amber-500",
  C: "bg-violet-500",
  D: "bg-orange-500",
  E: "bg-red-500",
};

/** 등급별 참고 제안 — 확정 지시가 아니라 참고용 힌트다(불변식 4) */
export const SUGGESTIONS: Record<Grade, string[]> = {
  A: ["우수 사례 공유", "리더십 역할 제안"],
  B: ["출석 독려 연락", "관심 표현 상담"],
  C: ["보강 일정 안내", "심방 상담 제안"],
  D: ["담당자 직접 연락", "보강 편성 재조정"],
  E: ["재등록 의사 확인", "개인 사정 파악"],
};

/** 참여도 점수 — attendanceRate에서 관찰 신호 가중치를 뺀 참고 수치일 뿐, 확정 판정이 아니다 */
export function growthScore(student: Student): number {
  const penalty = readSignals(student).signals.reduce((n, sig) => n + sig.weight, 0) * 0.3;
  return Math.max(0, Math.min(100, Math.round(student.attendanceRate - penalty)));
}
