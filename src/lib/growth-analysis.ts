import type { Student } from "./types";
import { attendanceStreak, readSignals } from "./attendance-signals";

/**
 * AI 성장 분석의 **강점 · 주의 포인트** (2026-08-18에 화면에서 떼어 여기로 모았다).
 *
 * 종전에는 수강생 상세 화면 안에 인라인으로 있었다. 리드 지시로 이 분석이 **「AI 성장 추천」
 * 탭**으로 옮겨지면서, 두 화면이 같은 문장을 내려면 계산이 한 곳에 있어야 했다 —
 * 복제하면 한쪽만 고쳐지는 일이 반드시 생긴다.
 *
 * ⚠️ **지어낸 성격 평가가 아니다**(불변식 4). 출결과 실제 기록에서 그대로 뽑은 문장이고,
 * 사람의 신앙·인격·심리를 판정하지 않는다. 조건에 걸리는 것이 없으면 「없습니다」라고 말한다 —
 * 빈칸을 그럴듯한 말로 채우지 않는다.
 */

/** 강점 — 출결과 상담 기록에서 뽑는다. `counselCount`는 상담으로 남긴 기록 수다 */
export function strengthsOf(student: Student, counselCount: number): string[] {
  const streak = attendanceStreak(student.recentWeeks);
  const makeupDoneCount = student.recentWeeks.filter((w) => w.mark === "makeupDone").length;
  const hasMakeupPending = student.recentWeeks.some((w) => w.mark === "makeupPending");

  const out: string[] = [];
  if (student.attendanceRate >= 90) out.push(`출석률 ${student.attendanceRate}% — 꾸준한 참여`);
  if (streak >= 4) out.push(`최근 ${streak}주 연속 출석`);
  if (!hasMakeupPending && makeupDoneCount > 0) out.push("보강을 미루지 않고 이행함");
  if (counselCount > 0) out.push("상담 기록을 통해 꾸준히 소통 중");
  if (out.length === 0) out.push("아직 뚜렷한 강점 관찰 기록이 없습니다");
  return out;
}

/** 주의 포인트 — 관찰 신호(`attendance-signals`)를 그대로 옮긴다. 새 판정을 만들지 않는다 */
export function cautionsOf(student: Student): string[] {
  const out = readSignals(student).signals.map((s) => s.text);
  return out.length > 0 ? out : ["관찰된 주의 신호가 없습니다"];
}
