import { useMemo, useState, type ReactNode } from "react";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { ChevronDown, TriangleAlert, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { COHORT_KEY, STUDENTS, demoChecklistProgress } from "../content/cohort-mock";
import { CHECKLIST_STANDARDS } from "../content/checklist-standards";
/* 지파 보충 항목을 표준 뒤에 이어 붙인다 (2026-08-21) — 합치는 규칙은 그 파일 한 곳이다 */
import { checklistWithExtras, standardQuestionCount } from "../lib/checklist";
import { LEVEL_NAME, LEVEL_TONE } from "../content/curriculum-mock";
import type { ChecklistProgress, CourseLevel } from "../content/student-profiles";
import {
  STRONG_MIN,
  TONE_LABEL,
  WEAK_MAX,
  cohortChecklistStats,
  toneOf,
  type GroupStat,
} from "../lib/cohort-strength";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { Card } from "./common";

const LEVELS: CourseLevel[] = ["초등", "중등", "고등"];

/**
 * 「지금 우리 기수는?」 (2026-08-15 리드 지시로 신설).
 *
 * **단계 기준표를 기수 단위로 뒤집어 본 화면**이다 — 수강생 상세의 단계 항목이 「한 사람」을
 * 세로로 본다면, 여기는 「우리 기수가 어느 항목에 강하고 어느 항목이 약한가」를 항목 가로로
 * 본다. 항목을 누르면 **누구인지**까지 이어진다(이름을 누르면 그 수강생 상세가 열린다).
 *
 * ⚠️ **새 판정을 만들지 않는다.** 점수는 담당자가 매긴 단계 항목 점수 그대로이고, 이 화면이
 * 하는 일은 평균·정렬·표시뿐이다(계산은 `lib/cohort-strength.ts`). 항목 이름은 기준표 원문
 * 그대로다(불변식 5).
 * ⚠️ **미채점은 분모에서 뺀다** — 아무도 안 매긴 항목은 「아직 안 봄」으로 갈라 두고 강점·약점
 * 어느 쪽에도 넣지 않는다. 모르는 것을 약점으로 세면 사실이 아니다.
 */
export function CohortNow({ students }: { students: typeof STUDENTS }) {
  const { checklistProgress, checklistExtras } = useStore();
  const [level, setLevel] = useState<CourseLevel>("초등");
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [modalKey, setModalKey] = useState<string | null>(null);

  /**
   * 담당자가 매긴 실제 점수 + 시범 값.
   * ⚠️ **실제 기록이 이긴다** — 같은 (수강생·단계·항목·질문)이면 시범 값을 버린다.
   * 실연동에서는 `demoChecklistProgress()`를 빼면 그대로 실데이터만 남는다.
   */
  const progress: ChecklistProgress[] = useMemo(() => {
    const realKeys = new Set(
      checklistProgress.map((c) => `${c.studentKey}|${c.level}|${c.groupNo}|${c.qIndex}`),
    );
    const demo = demoChecklistProgress().filter(
      (c) => !realKeys.has(`${c.studentKey}|${c.level}|${c.groupNo}|${c.qIndex}`),
    );
    return [...checklistProgress, ...demo];
  }, [checklistProgress]);

  /*
    기수 세팅에서 **지파가 덧붙인 항목**이 있으면 함께 센다 (2026-08-21 리드 지시 —
    수강생 상세의 성장 지표와 같은 기준표를 본다).
  */
  const standard = useMemo(
    () => checklistWithExtras(level, COHORT_KEY, checklistExtras),
    [level, checklistExtras],
  );

  const stats = useMemo(
    () => cohortChecklistStats(students, level, progress, standard),
    [students, level, progress, standard],
  );

  const strong = stats.filter((s) => toneOf(s) === "strong").sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const weak = stats.filter((s) => toneOf(s) === "weak").sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
  const mid = stats.filter((s) => toneOf(s) === "mid").sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const unrated = stats.filter((s) => toneOf(s) === "unrated");

  /** 기수 한 줄 요약 — 매겨진 항목들의 평균 */
  const overall = useMemo(() => {
    const rated = stats.filter((s) => s.pct !== null);
    if (rated.length === 0) return null;
    return Math.round(rated.reduce((a, s) => a + (s.pct ?? 0), 0) / rated.length);
  }, [stats]);

  const goal = CHECKLIST_STANDARDS[level].goal;

  return (
    <div>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-zion-900">지금 우리 기수는?</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              <strong>단계 기준표</strong> 항목별로 우리 기수의 강점·약점을 봅니다. 항목을 누르면{" "}
              <strong>누가 잘 되고 누가 처지는지</strong>까지 보입니다.
              {goal && <> 이 단계의 목표는 「{goal}」입니다.</>}
            </p>
          </div>
          {/*
            단계 토글 — 고른 단계는 그 단계 색으로 칠한다 (2026-08-15 리드 지시).
            ⚠️ 이름은 **색 이름**이다 (2026-08-21 리드 지시 — 학원법). `LEVEL_NAME` 한 곳에서 온다.
          */}
          <SegmentedTabs
            label="단계"
            size="sm"
            value={level}
            onChange={(l) => {
              setLevel(l);
              setOpenGroup(null);
            }}
            items={LEVELS.map((l) => ({
              id: l,
              label: LEVEL_NAME[l],
              activeClass: `${LEVEL_TONE[l]} shadow-sm`,
            }))}
          />
        </div>

        {/* 한눈 요약 — 숫자 셋이면 상태가 읽힌다 */}
        <div className="mt-4 grid grid-cols-4 gap-2 max-md:grid-cols-2">
          {(
            [
              ["기수 평균", overall === null ? "—" : `${overall}%`, "매겨진 항목들의 평균"],
              ["강점", `${strong.length}항목`, `${STRONG_MIN}% 이상`],
              ["약점", `${weak.length}항목`, `${WEAK_MAX}% 미만`],
              ["아직 안 봄", `${unrated.length}항목`, "점수를 매긴 사람이 없음"],
            ] as const
          ).map(([label, value, sub]) => (
            <div key={label} className="rounded-lg bg-zion-50 px-3 py-2.5">
              <div className="text-[11px] text-ink-soft">{label}</div>
              <div className="mt-0.5 text-[17px] font-bold text-zion-900">{value}</div>
              <div className="mt-0.5 text-[10px] text-ink-soft">{sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/*
        「수강생 × 항목 한눈에」 격자는 2026-08-18에 만들었다가 **같은 날 리드 지시로 뺐다.**
        되살릴 때는 git 이력에서 `ScoreGrid`를 꺼낸다 (커밋 445bd1b).
      */}
      <div className="mt-4 grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <GroupList
          title="강점"
          icon={<Trophy size={15} className="text-emerald-600" />}
          desc={`${STRONG_MIN}% 이상 — 지금 잘 되고 있는 항목입니다.`}
          stats={strong}
          openGroup={openGroup}
          onToggle={(no) => setOpenGroup(openGroup === no ? null : no)}
          onPickStudent={setModalKey}
          emptyNote="아직 강점으로 오른 항목이 없습니다."
          tone="strong"
        />
        <GroupList
          title="약점"
          icon={<TriangleAlert size={15} className="text-amber-600" />}
          desc={`${WEAK_MAX}% 미만 — 먼저 손대야 할 항목입니다.`}
          stats={weak}
          openGroup={openGroup}
          onToggle={(no) => setOpenGroup(openGroup === no ? null : no)}
          onPickStudent={setModalKey}
          emptyNote="약점으로 내려간 항목이 없습니다."
          tone="weak"
        />
      </div>

      {(mid.length > 0 || unrated.length > 0) && (
        <Card className="mt-4">
          <div className="mb-2 text-[13px] font-bold text-zion-900">그 밖의 항목</div>
          <div className="space-y-1.5">
            {[...mid, ...unrated].map((s) => (
              <GroupRow
                key={s.groupNo}
                stat={s}
                open={openGroup === s.groupNo}
                onToggle={() => setOpenGroup(openGroup === s.groupNo ? null : s.groupNo)}
                onPickStudent={setModalKey}
              />
            ))}
          </div>
        </Card>
      )}

      <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-ink-soft">
        <p>
          점수는 담당 강사·전도사가 수강생 상세에서 매긴 <strong>단계 항목 점수(0~5)의 평균</strong>
          입니다. 사람의 신앙·인격을 판정하는 값이 아니며, 아무도 안 매긴 항목은 약점이 아니라
          「아직 안 봄」으로 둡니다.
        </p>
        <p>지금 점수는 시범 값이며, 담당자가 실제로 매긴 점수가 우선합니다.</p>
      </div>

      {modalKey && <StudentDetailModal studentKey={modalKey} onClose={() => setModalKey(null)} />}
    </div>
  );
}

/** 강점·약점 묶음 하나 */
function GroupList({
  title,
  icon,
  desc,
  stats,
  openGroup,
  onToggle,
  onPickStudent,
  emptyNote,
  tone,
}: {
  title: string;
  icon: ReactNode;
  desc: string;
  stats: GroupStat[];
  openGroup: number | null;
  onToggle: (no: number) => void;
  onPickStudent: (key: string) => void;
  emptyNote: string;
  tone: "strong" | "weak";
}) {
  return (
    <Card>
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[14px] font-bold text-zion-900">{title}</span>
        <span className="text-[12px] text-ink-soft">{stats.length}항목</span>
      </div>
      <p className="mb-3 text-[11.5px] text-ink-soft">{desc}</p>
      {stats.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-ink-soft">{emptyNote}</p>
      ) : (
        <div className="space-y-1.5">
          {stats.map((s) => (
            <GroupRow
              key={s.groupNo}
              stat={s}
              tone={tone}
              open={openGroup === s.groupNo}
              onToggle={() => onToggle(s.groupNo)}
              onPickStudent={onPickStudent}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * 항목 한 줄 — 누르면 **누가 잘하고 누가 처지는지**가 펼쳐진다.
 * 이름을 누르면 그 수강생 상세가 열린다(2026-08-15 리드 지시 — 「누구인지 확인할 수 있도록」).
 */
function GroupRow({
  stat,
  tone,
  open,
  onToggle,
  onPickStudent,
}: {
  stat: GroupStat;
  tone?: "strong" | "weak";
  open: boolean;
  onToggle: () => void;
  onPickStudent: (key: string) => void;
}) {
  const bar =
    tone === "strong" ? "bg-emerald-500" : tone === "weak" ? "bg-amber-500" : "bg-zion-500";
  const rated = stat.students.filter((s) => s.scored > 0);
  /** 위·아래 각각 다섯 명까지 — 더 있으면 「외 N명」으로 접는다 */
  const top = rated.slice(0, 5);
  const low = [...rated].reverse().slice(0, 5);

  return (
    <div className={"rounded-lg border " + (open ? "border-zion-300 bg-white" : "border-zion-100")}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-zion-50"
      >
        <ChevronDown
          size={14}
          className={"shrink-0 text-zion-400 transition-transform " + (open ? "" : "-rotate-90")}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {stat.groupNo}. {stat.label}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zion-100">
              <span className={`block h-full rounded-full ${bar}`} style={{ width: `${stat.pct ?? 0}%` }} />
            </span>
            <span className="shrink-0 text-[11px] text-ink-soft">
              {stat.ratedStudents}명 매김 · 점검 {stat.questionCount}개
            </span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-bold text-zion-800">
            {stat.pct === null ? "—" : `${stat.pct}%`}
          </span>
          <span className="block text-[10px] text-ink-soft">{TONE_LABEL[toneOf(stat)]}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-zion-100 px-3 py-2.5">
          {rated.length === 0 ? (
            <p className="py-2 text-center text-[12px] text-ink-soft">
              이 항목에 점수를 매긴 수강생이 없습니다 — 수강생 상세의 「단계 항목 체크리스트」에서 매깁니다.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {(
                [
                  ["잘 되는 분", top, "text-emerald-700"],
                  ["처지는 분", low, "text-amber-700"],
                ] as const
              ).map(([label, list, color]) => (
                <div key={label}>
                  <div className={`mb-1 text-[11px] font-semibold ${color}`}>{label}</div>
                  <ul className="space-y-1">
                    {list.map((s) => (
                      <li key={s.studentKey} className="flex items-center justify-between gap-2">
                        {/* 이름을 누르면 그 수강생 상세가 열린다 */}
                        <button
                          onClick={() => onPickStudent(s.studentKey)}
                          className="min-w-0 truncate text-left text-[12.5px] font-medium text-zion-800 hover:underline"
                        >
                          {s.name}
                          <span className="ml-1 text-[10.5px] font-normal text-ink-soft">
                            {s.division}
                          </span>
                        </button>
                        <span className="shrink-0 text-[12px] font-semibold text-ink-soft">{s.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {/* 그 항목의 점검 질문 — 원문 그대로 (불변식 5) */}
          <QuestionList stat={stat} />
        </div>
      )}
    </div>
  );
}

/**
 * 항목의 점검 질문 원문 — 「무엇을 보고 매긴 점수인지」가 있어야 숫자가 뜻을 갖는다.
 * ⚠️ **표준과 지파 보충을 갈라 보여 준다** (2026-08-21) — 어느 것이 원문인지 흐려지면
 * 다른 지파와 견줄 때 헷갈린다. 표준 개수까지가 원문이고 그 뒤가 보충이다.
 */
function QuestionList({ stat }: { stat: GroupStat }) {
  const { checklistExtras } = useStore();
  const group = checklistWithExtras(stat.level, COHORT_KEY, checklistExtras).groups.find(
    (g) => g.no === stat.groupNo,
  );
  if (!group) return null;
  const stdCount = standardQuestionCount(stat.level, stat.groupNo);
  return (
    <details className="mt-2.5 border-t border-zion-100 pt-2">
      <summary className="cursor-pointer list-none text-[11px] font-semibold text-zion-700 [&::-webkit-details-marker]:hidden">
        점검 항목 {group.questions.length}개 보기
      </summary>
      <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-ink-soft">
        {group.questions.map((q, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="shrink-0 text-zion-400">·</span>
            <span className="whitespace-pre-wrap">{q}</span>
            {i >= stdCount && (
              <span className="shrink-0 rounded bg-zion-100 px-1 py-0.5 text-[10px] font-semibold text-zion-700">
                지파 보충
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
