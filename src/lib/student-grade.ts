import { CheckCircle2, Eye, Target, Ban, type LucideIcon } from "lucide-react";
import type { Student } from "./types";
import { readSignals } from "./attendance-signals";

/**
 * 등급 A~D — 수강생 관리 도우미 목록·통계 카드에서 쓰는 참여도 분류.
 *
 * ⚠️ 신앙·인격을 판정하는 등급이 아니다(불변식 4) — **출결 참여 상태**만 본다.
 * `status`(paused/atRisk)가 있으면 그대로 따르고, `active`인데 최근 출결에서
 * 관찰 신호(`attendance-signals.ts`)가 잡히면 B(관심)로 올린다.
 */
export type Grade = "A" | "B" | "C" | "D";

export const GRADE_LABELS: Record<Grade, string> = {
  A: "정상",
  B: "관심",
  C: "집중",
  D: "중단",
};

export const GRADE_TONE: Record<Grade, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-amber-50 text-amber-700 border-amber-200",
  C: "bg-violet-50 text-violet-700 border-violet-200",
  D: "bg-zion-100 text-ink-soft border-zion-200",
};

export function gradeOf(student: Student): Grade {
  if (student.status === "paused") return "D";
  if (student.status === "atRisk") return "C";
  return readSignals(student).signals.length > 0 ? "B" : "A";
}

export const GRADE_ICON: Record<Grade, LucideIcon> = { A: CheckCircle2, B: Eye, C: Target, D: Ban };
export const GRADE_ICON_BG: Record<Grade, string> = {
  A: "bg-emerald-500",
  B: "bg-amber-500",
  C: "bg-violet-500",
  D: "bg-red-500",
};

/** 등급별 참고 제안 — 확정 지시가 아니라 참고용 힌트다(불변식 4) */
export const SUGGESTIONS: Record<Grade, string[]> = {
  A: ["우수 사례 공유", "리더십 역할 제안"],
  B: ["출석 독려 연락", "관심 표현 상담"],
  C: ["보강 일정 안내", "심방 상담 제안"],
  D: ["재등록 의사 확인", "개인 사정 파악"],
};

/** 참여도 점수 — attendanceRate에서 관찰 신호 가중치를 뺀 참고 수치일 뿐, 확정 판정이 아니다 */
export function growthScore(student: Student): number {
  const penalty = readSignals(student).signals.reduce((n, sig) => n + sig.weight, 0) * 0.3;
  return Math.max(0, Math.min(100, Math.round(student.attendanceRate - penalty)));
}
