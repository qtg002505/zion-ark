import { CHECKLIST_STANDARDS } from "../content/checklist-standards";
import type { LevelChecklist } from "../content/checklist-standards";
import type { CourseLevel } from "../content/student-profiles";
import type { ChecklistExtra } from "./types";

/**
 * 표준 단계 향상표에 **지파가 덧붙인 세부 항목**을 이어 붙인다
 * (2026-08-21 리드 지시 — 「지파마다 다른 체크리스트는 공통 양식 안에서 세부 항목을 자율 입력」).
 *
 * ⚠️ **표준은 그대로 두고 뒤에만 붙인다.** 원문 항목의 차례가 밀리면 이미 저장된 진행
 * 기록(`ChecklistProgress`의 `qIndex`)이 통째로 어긋난다 — 그래서 앞에 끼우지 않는다.
 * 같은 이유로 **보충 항목을 지우면 그 뒤 항목의 기록이 한 칸씩 밀린다.** 지금은 보충을
 * 기수 단위로만 쓰고 양이 적어 두고 보지만, 실연동 때는 항목마다 고유 id로 저장해야 한다.
 *
 * ⚠️ 등급 구간(`sections`)은 손대지 않는다 — 지금 어느 화면도 읽지 않고, 읽게 되면
 * **표준 항목만으로** 매겨야 한다. 기수·지파를 견주는 눈금이 지파마다 흔들리면 안 된다.
 * 성장 지표(백분율)에는 보충도 함께 든다 — 담당자가 실제로 보는 진행률이기 때문이다.
 *
 * 보충이 없으면 표준 객체를 **그대로 돌려준다** — 새 객체를 만들면 화면이 매번 다시 그린다.
 */
export function checklistWithExtras(
  level: CourseLevel,
  cohortKey: string,
  extras: ChecklistExtra[],
): LevelChecklist {
  const standard = CHECKLIST_STANDARDS[level];
  const mine = extras.filter((e) => e.cohortKey === cohortKey && e.level === level);
  if (mine.length === 0) return standard;

  return {
    ...standard,
    groups: standard.groups.map((g) => {
      const added = mine.filter((e) => e.groupNo === g.no).map((e) => e.question);
      return added.length === 0 ? g : { ...g, questions: [...g.questions, ...added] };
    }),
  };
}

/** 그 그룹에서 **보충으로 붙은 항목이 몇 번째부터인지** — 화면이 표시를 가르는 데 쓴다 */
export function standardQuestionCount(level: CourseLevel, groupNo: number): number {
  return CHECKLIST_STANDARDS[level].groups.find((g) => g.no === groupNo)?.questions.length ?? 0;
}
