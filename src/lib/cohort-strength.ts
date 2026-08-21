import { CHECKLIST_STANDARDS } from "../content/checklist-standards";
import type { LevelChecklist } from "../content/checklist-standards";
import type { ChecklistProgress, CourseLevel } from "../content/student-profiles";
import type { Student } from "./types";

/**
 * 「지금 우리 기수는?」 — **단계 기준표를 기수 단위로 뒤집어 본 값** (2026-08-15 리드 지시).
 *
 * 수강생 상세의 단계 항목 체크는 **한 사람**을 세로로 본다. 리드가 요청한 것은 그 반대다 —
 * 「우리 기수는 어느 항목이 강하고 어느 항목이 약한가」를 항목 가로로 보고, 항목마다
 * **누구인지**까지 잇는 것이다.
 *
 * ⚠️ **새 판정을 만들지 않는다.** 점수는 담당자가 매긴 단계 항목 점수(0~5, `ChecklistProgress`)
 * 그대로이고, 여기서 하는 일은 **평균과 정렬**뿐이다. 항목 이름·질문도 원문 그대로 쓴다
 * (불변식 5). 사람의 신앙·인격을 판정하는 값이 아니다(불변식 4).
 *
 * ⚠️ **미채점은 분모에서 뺀다** — 출석률이 「미입력을 결석으로 세지 않는」 것과 같은 원칙이다.
 * 아무도 안 매긴 항목은 「아직 안 봄」으로 갈라 두고 강점·약점 어느 쪽에도 넣지 않는다.
 */

/** 단계 항목 점수의 최댓값 — 담당자가 0~5로 매긴다 (2026-08-13 리드 확정) */
export const CHECKLIST_MAX = 5;

export interface StudentScore {
  studentKey: string;
  name: string;
  division: string;
  /** 그 사람의 이 항목 평균 (0~100) */
  pct: number;
  /** 매겨진 질문 수 — 0이면 아직 안 본 사람이다 */
  scored: number;
}

export interface GroupStat {
  level: CourseLevel;
  groupNo: number;
  /** 기준표 원문의 항목 이름 */
  label: string;
  questionCount: number;
  /** 기수 평균 (0~100). 매겨진 것이 하나도 없으면 null */
  pct: number | null;
  /** 점수가 매겨진 사람 수 */
  ratedStudents: number;
  /** 사람별 값 — 높은 순. 화면이 위·아래를 잘라 쓴다 */
  students: StudentScore[];
}

/**
 * 강점·약점 경계 (2026-08-15).
 * 기준표의 총점 구간(A/B/C)이 **섹션 합계**로 매겨지는 것과 달리, 여기는 **항목 하나**를
 * 보는 자리라 같은 표를 그대로 쓸 수 없다. 그래서 백분율로만 가른다 —
 * 70% 이상이면 강점, 40% 미만이면 약점, 그 사이는 「보통」이다.
 * ⚠️ 이 두 값은 **화면 표시용 경계**일 뿐 기준표의 등급이 아니다. 리드가 달리 정하면 여기만 고친다.
 */
export const STRONG_MIN = 70;
export const WEAK_MAX = 40;

export type GroupTone = "strong" | "mid" | "weak" | "unrated";

export function toneOf(stat: GroupStat): GroupTone {
  if (stat.pct === null) return "unrated";
  if (stat.pct >= STRONG_MIN) return "strong";
  if (stat.pct < WEAK_MAX) return "weak";
  return "mid";
}

export const TONE_LABEL: Record<GroupTone, string> = {
  strong: "강점",
  mid: "보통",
  weak: "약점",
  unrated: "아직 안 봄",
};

/**
 * 단계 하나의 항목별 기수 통계.
 *
 * @param students 조회 범위 안의 수강생 (권한 필터는 호출부가 이미 했다)
 * @param level    단계
 * @param progress 담당자가 매긴 점수 전부 (store)
 * @param standard 쓸 기준표 — 넘기지 않으면 표준이다.
 *   기수 세팅에서 **지파가 덧붙인 항목**이 있으면 합친 것을 넘긴다 (2026-08-21 리드 지시).
 */
export function cohortChecklistStats(
  students: Student[],
  level: CourseLevel,
  progress: ChecklistProgress[],
  standardOverride?: LevelChecklist,
): GroupStat[] {
  const standard = standardOverride ?? CHECKLIST_STANDARDS[level];
  // (studentKey, groupNo) → 점수 목록. 한 번만 훑어 만든다
  const byStudentGroup = new Map<string, number[]>();
  for (const c of progress) {
    if (c.level !== level) continue;
    const key = `${c.studentKey}|${c.groupNo}`;
    byStudentGroup.set(key, [...(byStudentGroup.get(key) ?? []), c.score]);
  }

  return standard.groups.map((g) => {
    const rows: StudentScore[] = students.map((s) => {
      const scores = byStudentGroup.get(`${s.key}|${g.no}`) ?? [];
      const pct =
        scores.length === 0
          ? 0
          : Math.round((scores.reduce((a, b) => a + b, 0) / (scores.length * CHECKLIST_MAX)) * 100);
      return { studentKey: s.key, name: s.name, division: s.division, pct, scored: scores.length };
    });
    const rated = rows.filter((r) => r.scored > 0);
    return {
      level,
      groupNo: g.no,
      label: g.label,
      questionCount: g.questions.length,
      pct:
        rated.length === 0
          ? null
          : Math.round(rated.reduce((a, r) => a + r.pct, 0) / rated.length),
      ratedStudents: rated.length,
      // 높은 순 — 같으면 이름 순(가나다)이라 새로 고쳐도 자리가 안 흔들린다
      students: rows.sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, "ko")),
    };
  });
}

/**
 * 화면이 지금 어느 단계를 볼지 — **진도에서 고른다** (2026-08-15).
 * 회차↔진도 매핑(`curriculum-mock`)이 지금 몇 강인지 알고 있으므로 그 단계를 기본값으로 쓴다.
 * ⚠️ 「아직 안 나간 단계」도 골라 볼 수는 있다 — 앞을 미리 보는 것을 막을 이유가 없다.
 */
export function defaultLevelOf(currentLevel: string): CourseLevel {
  return currentLevel === "중등" || currentLevel === "고등" ? currentLevel : "초등";
}
