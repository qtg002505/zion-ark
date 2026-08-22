import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { Portal } from "../components/Portal";
import {
  Cake,
  CalendarPlus,
  ChevronLeft,
  Download,
  ChevronRight,
  History,
  Lock,
  NotebookPen,
  PencilLine,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canEditCohortRecord, isFieldStaff } from "../lib/permissions";
import { scanPII } from "../lib/privacy";
import { PLAN_ENTRY_LABELS, ROLE_LABELS, type PlanEntry, type PlanEntryKind } from "../lib/types";
import { STUDENTS } from "../content/cohort-mock";
import { STUDENT_PROFILES } from "../content/student-profiles";
import { effectiveSchedule, newcomerEndOf } from "../lib/cohort-calendar";
import { HOLIDAYS_2026 } from "../content/holidays-kr-2026";
import { SCJ_SEASONS } from "../content/scj-seasons";
/* 진도표 양식 내려받기 — 기수 세팅과 같은 부품 (2026-08-21). 올리기는 2026-08-22에 뺐다 */
import { ProgressUpload } from "../components/ProgressUpload";
import { buildXlsx, downloadBlob } from "../lib/xlsx";
import { COHORT_LIST, RUNNING_COHORT } from "../content/cohort-mock";
import { AnchoredPopover } from "../components/AnchoredPopover";
import { MonthYearPicker } from "../components/MonthYearPicker";
/* 주차별 진행 현황 · 운영 분석판 (2026-08-22 리드 시안) — 이 라우트에서만 쓰는 조각이다 */
import { WeekOpsBoard, OpsAnalysisBoard } from "./WeeklyPlanOps";
import { PageHeader, Card } from "./common";

/** 종전 주차별 글 — 달력으로 옮긴 뒤에도 이미 적어 둔 것은 남겨 함께 본다 */
const WEEKS = ["8월 1주", "7월 4주", "7월 3주", "7월 2주", "7월 1주"];

const KIND_TONE: Record<PlanEntryKind, string> = {
  progress: "bg-zion-700 text-white",
  makeup: "bg-gold-100 text-gold-700 border border-gold-500/50",
  /* 상담·심방 (2026-08-17 리드 지시) — 상태색 계열로 갈라 한눈에 구분된다 */
  counsel: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  /* 심방은 주황 (2026-08-22 리드 지시 — 종전 red가 공휴일 표시와 같은 조합이라 헷갈렸다).
     D등급과 같은 검증 조합이고 다크 팔레트도 index.css에 이미 뒤집혀 있다 */
  visit: "bg-orange-50 text-orange-700 border border-orange-200",
  event: "bg-zion-100 text-zion-800 border border-zion-300",
  note: "bg-white text-ink-soft border border-zion-200",
};

const KIND_ORDER: PlanEntryKind[] = ["progress", "makeup", "counsel", "visit", "event", "note"];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/* ── 날짜 도우미 — 로컬 시간 기준으로만 다룬다 (UTC로 바꾸면 하루가 밀린다) ── */

function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function todayYmd(): string {
  return ymd(new Date());
}

/** 그 달의 달력 격자 — 앞뒤 빈칸을 채워 일요일부터 시작하는 7열로 만든다 */
function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * 날짜에 붙는 표시 (2026-08-13 다중화) — 기수 일정 · 공휴일 · 수강생 생일 · 신천지 절기.
 * 종전에는 `Record<날짜, 라벨>` 하나라 **한 날짜에 표시 하나**뿐이었다. 추석에 수업 계획이
 * 겹치는 날처럼 여러 표시가 한 날에 모이므로 배열로 바꿨다.
 */
interface DayMark {
  label: string;
  tone: "cohort" | "holiday" | "birthday" | "season";
}

/** 색은 검증된 조합만 — red-50·200은 index.css 다크 팔레트가 뒤집는 계열이다 */
const DAYMARK_TONE: Record<DayMark["tone"], string> = {
  cohort: "bg-gold-100 text-gold-700",
  holiday: "border border-red-200 bg-red-50 text-red-600",
  birthday: "bg-gold-100/70 text-gold-700",
  season: "bg-zion-100 text-zion-800",
};

/** 주의 시작(일요일) — `WEEKDAYS`가 일요일부터라 주간 보기도 같은 기준을 쓴다 */
function weekStartOf(date: string): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return ymd(d);
}

function addDaysYmd(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/**
 * 기수 주간계획 — **월별 달력** (2026-08-10 리드 지시로 개편).
 *
 * 종전에는 주차 탭 다섯 개에 글을 통으로 적었다. 기수 일정이 유동적이라 그 틀에 담기지
 * 않았다 — 보강이 주중에 끼거나 행사가 붙으면 적을 자리가 없었다. 이제 **날짜에 항목을
 * 자유롭게 붙이는** 방식이다.
 *
 * ⚠️ 종전 주차별 글은 **지우지 않고 화면 아래에 남겼다.** 이미 적어 둔 계획이 사라지면
 * 후방 마이그레이션이 된다(불변식 10).
 *
 * 권한은 그대로다 — **해당 기수의 강사·전도사만** 고친다. 열람은 담당 범위 안에서 누구나.
 */
export function WeeklyPlanPage() {
  const session = useSession();
  const { planEntries, plans, scheduleOverrides } = useStore();

  /*
    ⚠️ **기수를 골라 지난 기수의 달력을 볼 수 있다** (2026-08-21 리드 지시 —
    「기수를 선택하면 과거 운영 일정을 바로 확인하고 진도표를 내려받을 수 있게」).
    고르는 값은 「113기」이고, 저장·권한에 쓰는 키는 「지파|교회|기수」 전체다.
    종료된 기수는 담당자여도 못 고친다 — 기수 세팅 화면과 같은 규칙이다.
  */
  const [cohortId, setCohortId] = useState(session.cohort);
  const cohort = COHORT_LIST.find((c) => c.key === cohortId) ?? RUNNING_COHORT;
  const cohortKey = `${cohort.tribe}|${cohort.church}|${cohort.key}`;
  const closed = cohort.status === "closed";
  const canEdit = !closed && canEditCohortRecord(session, cohortKey);

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  /** 월간/주간 보기 (2026-08-13 리드 지시 — 「월간·주간 계획」) */
  const [view, setView] = useState<"month" | "week">("month");
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayYmd()));

  /** 화면에서 고친 일정이 있으면 그 값 — 개강·종강·새신자교육 표시가 따라온다 */
  const sched = effectiveSchedule(
    { startsOn: cohort.startsOn, endsOn: cohort.endsOn },
    scheduleOverrides,
    cohortKey,
  );

  /**
   * 담당 수강생 생일 (MM-DD → 이름들) — 마이페이지 주간 스케줄러의 로직을 옮겨 왔다.
   * **강사·전도사만 본다** (`isFieldStaff`). 이 화면에는 내보내기가 없어 반출 경로도 없다 —
   * 주간 스케줄러의 「ics에 생일 제외」 규칙과 같은 취지다.
   */
  const birthdayByMd = useMemo(() => {
    if (!isFieldStaff(session)) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const s of STUDENTS) {
      const p = STUDENT_PROFILES[s.key];
      if (!p?.birthDate) continue;
      const md = p.birthDate.slice(5); // 태어난 해는 쓰지 않는다
      map.set(md, [...(map.get(md) ?? []), s.name]);
    }
    return map;
  }, [session]);

  /** 이 날짜에 붙는 표시 전부 — 기수 일정 → 공휴일 → 생일 → 절기 순서 */
  function marksOf(date: string): DayMark[] {
    const out: DayMark[] = [];
    if (date === sched.startsOn) out.push({ label: "개강", tone: "cohort" });
    if (date === sched.endsOn) out.push({ label: "종강 예정", tone: "cohort" });
    if (date === newcomerEndOf(sched.endsOn)) out.push({ label: "새신자교육 종강 예정", tone: "cohort" });
    const holiday = HOLIDAYS_2026[date];
    if (holiday) out.push({ label: holiday, tone: "holiday" });
    const births = birthdayByMd.get(date.slice(5));
    if (births) out.push({ label: `${births.join(" · ")} 생일`, tone: "birthday" });
    const season = SCJ_SEASONS[date];
    if (season) out.push({ label: season, tone: "season" });
    return out;
  }
  /**
   * 고른 날짜와 **그 칸 요소** — 팝오버가 누른 자리에서 열리려면 앵커가 필요하다
   * (2026-08-10 리드 지시). 팝오버 안에서 날짜를 옮겨도 앵커는 처음 자리에 둔다 —
   * 옮길 때마다 팝오버가 뛰어다니면 눈이 따라가지 못한다.
   */
  const [picked, setPicked] = useState<{ date: string; anchor: HTMLElement } | null>(null);
  /** 년·월 판을 연 라벨 — 누른 자리에서 열린다 (2026-08-11) */
  const [monthPickAnchor, setMonthPickAnchor] = useState<HTMLElement | null>(null);
  /**
   * 「계획 추가」 버튼 (2026-08-13 리드 지적 — 「추가 기능이 사라졌다」).
   * 기능은 있었지만 **날짜 칸을 눌러야 나온다는 것을 알아야** 쓸 수 있었다.
   * 눈에 보이는 진입점을 둔다 — 누르면 오늘(또는 보고 있는 달의 1일)로 팝오버가 열린다.
   */
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  /** 날짜별로 항목을 모아 둔다 — 칸마다 배열을 훑지 않게 */
  const byDate = useMemo(() => {
    const map = new Map<string, PlanEntry[]>();
    for (const e of planEntries) {
      if (e.cohortKey !== cohortKey) continue;
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    }
    return map;
  }, [planEntries, cohortKey]);

  /** 월간 보기는 달 단위, 주간 보기는 주 단위로 옮긴다 */
  function shift(delta: number) {
    if (view === "week") {
      setWeekStart((w) => addDaysYmd(w, delta * 7));
    } else {
      setCursor((c) => {
        const d = new Date(c.year, c.month + delta, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      });
    }
    setPicked(null);
  }

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysYmd(weekStart, i)),
    [weekStart],
  );
  const monthLabel = `${cursor.year}년 ${cursor.month + 1}월`;
  const weekLabel = (() => {
    const a = new Date(weekStart + "T00:00:00");
    const b = new Date(weekDates[6] + "T00:00:00");
    return `${a.getMonth() + 1}.${a.getDate()} ~ ${b.getMonth() + 1}.${b.getDate()}`;
  })();
  const monthCount = [...byDate.entries()].filter(([d]) =>
    d.startsWith(`${cursor.year}-${`${cursor.month + 1}`.padStart(2, "0")}`),
  ).length;

  return (
    <div>
      <PageHeader
        crumb="기수 현황"
        title="월간·주간 계획"
        desc={
          `${cohort.tribe} 지파 · ${cohort.church} · ${cohort.key} — ` +
          (closed
            ? "종료된 기수입니다. 지난 일정을 보고 진도표를 내려받을 수 있습니다."
            : "담당 강사·전도사가 함께 작성하고 고칩니다.")
        }
        action={
          canEdit ? (
            <ProgressUpload />
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-ink-soft">
              <Lock size={12} />{" "}
              {closed ? "종료된 기수라 보기만 됩니다" : "수정은 해당 기수 강사·전도사만"}
            </span>
          )
        }
      />

      {/* 기수 고르기 + 진도표 내려받기 (2026-08-21 리드 지시) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="plan-cohort" className="text-[12px] font-semibold text-ink">
          기수
        </label>
        <select
          id="plan-cohort"
          value={cohortId}
          onChange={(e) => setCohortId(e.target.value)}
          className="rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12.5px] outline-none focus:border-zion-500"
        >
          {COHORT_LIST.map((c) => (
            <option key={c.key} value={c.key}>
              {c.key} · {c.startsOn.slice(0, 7)} ~ {c.endsOn.slice(0, 7)}
              {c.status === "closed" ? " (종료)" : ""}
            </option>
          ))}
        </select>
        {closed && (
          <span className="rounded-lg bg-zion-100 px-2 py-1 text-[11.5px] font-semibold text-zion-700">
            지난 기수를 보고 있습니다
          </span>
        )}
        <button
          onClick={() => {
            const rows: string[][] = [["날짜", "구분", "회차", "내용"]];
            for (const e of planEntries.filter((x) => x.cohortKey === cohortKey)) {
              rows.push([e.date, PLAN_ENTRY_LABELS[e.kind], e.session ? String(e.session) : "", e.title]);
            }
            downloadBlob(buildXlsx(rows, "진도표"), `${cohortId}_진도표.xlsx`);
          }}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          <Download size={14} /> 이 기수 진도표 내려받기
        </button>
      </div>

      {/* 보기 전환 + 이동 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* 월간/주간 전환 (2026-08-13 리드 지시) */}
        <SegmentedTabs
          label="달력 보기"
          value={view}
          onChange={(v) => {
            setView(v);
            setPicked(null);
          }}
          items={[
            { id: "month", label: "월간" },
            { id: "week", label: "주간" },
          ]}
        />

        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            aria-label={view === "week" ? "이전 주" : "이전 달"}
            className="rounded-lg border border-zion-200 p-1.5 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronLeft size={15} />
          </button>
          {view === "month" ? (
            /*
              라벨을 누르면 년·월을 바둑판에서 고른다 (2026-08-11 리드 지시).
              화살표만으로는 몇 달 떨어진 곳까지 가는 데 열 번 넘게 눌러야 했다.
            */
            <button
              onClick={(e) => setMonthPickAnchor(e.currentTarget)}
              aria-haspopup="dialog"
              aria-expanded={monthPickAnchor != null}
              title="년·월을 골라 옮깁니다"
              className="min-w-[110px] rounded-lg px-2 py-1 text-center text-[15px] font-bold text-zion-900 transition hover:bg-zion-50"
            >
              {monthLabel}
            </button>
          ) : (
            <span className="min-w-[110px] px-2 py-1 text-center text-[15px] font-bold text-zion-900">
              {weekLabel}
            </span>
          )}
          <button
            onClick={() => shift(1)}
            aria-label={view === "week" ? "다음 주" : "다음 달"}
            className="rounded-lg border border-zion-200 p-1.5 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <button
          onClick={() => {
            // 오늘이 든 달·주로 옮긴다 — 팝오버는 칸을 눌러야 그 자리에서 열린다
            const n = new Date();
            setCursor({ year: n.getFullYear(), month: n.getMonth() });
            setWeekStart(weekStartOf(todayYmd()));
            setPicked(null);
          }}
          className="rounded-lg border border-zion-200 px-2.5 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          오늘
        </button>
        {/* 눈에 보이는 추가 진입점 — 날짜 칸을 눌러도 되지만 그걸 몰라도 쓸 수 있게 */}
        {canEdit && (
          <button
            ref={addBtnRef}
            onClick={() => {
              const t = todayYmd();
              const monthPrefix = `${cursor.year}-${`${cursor.month + 1}`.padStart(2, "0")}`;
              const date =
                view === "week"
                  ? weekDates.includes(t)
                    ? t
                    : weekStart
                  : t.startsWith(monthPrefix)
                    ? t
                    : `${monthPrefix}-01`;
              setPicked({ date, anchor: addBtnRef.current! });
            }}
            className="flex items-center gap-1 rounded-lg bg-zion-800 px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
          >
            <Plus size={13} /> 계획 추가
          </button>
        )}
        {view === "month" && (
          <span className="text-[12px] text-ink-soft">이 달에 계획이 있는 날 {monthCount}일</span>
        )}
        <div className="ml-auto flex flex-wrap gap-1.5 text-[11px]">
          {KIND_ORDER.map((k) => (
            <span key={k} className={"rounded px-1.5 py-0.5 font-semibold " + KIND_TONE[k]}>
              {PLAN_ENTRY_LABELS[k]}
            </span>
          ))}
        </div>
      </div>

      {/*
        왼쪽 주차별 진행 현황 · 오른쪽 달력 (2026-08-22 리드 시안 — 종전 「달력 + 중요 일정」
        2단을 이 구성이 대체한다. 중요 일정은 달력 아래로 내렸다).
        좁은 화면에서는 달력이 먼저 쌓인다 — 일정을 넣는 주 도구라 35주 판 아래로 밀지 않는다
        (DOM은 달력이 앞이고 xl에서 order로 좌우를 바꾼다).
      */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <div className="min-w-0 xl:order-2 xl:col-span-3">
      {view === "month" ? (
      /* 달력 — 좁은 화면에서는 가로로 넘긴다. 7열을 억지로 줄이면 글자가 뭉갠다 */
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={
                  "pb-1 text-center text-[11px] font-bold " +
                  (i === 0 ? "text-red-500" : i === 6 ? "text-zion-600" : "text-ink-soft")
                }
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={`e${i}`} className="min-h-[86px] rounded-lg bg-zion-50/40" />;
              const list = byDate.get(date) ?? [];
              const isToday = date === todayYmd();
              const marks = marksOf(date);
              const isHoliday = marks.some((m) => m.tone === "holiday");
              const dayNum = Number(date.slice(8));
              const dow = i % 7;
              return (
                <button
                  key={date}
                  onClick={(e) => setPicked({ date, anchor: e.currentTarget })}
                  className={
                    "min-h-[86px] rounded-lg border p-1.5 text-left align-top transition hover:border-zion-400 " +
                    (picked?.date === date
                      ? "border-zion-500 bg-zion-50"
                      : isToday
                        ? "border-zion-300 bg-white"
                        : "border-zion-100 bg-white")
                  }
                >
                  <div className="mb-1 flex items-center gap-1">
                    {/* 날짜 숫자는 칸 왼쪽 위 고정 — 공휴일은 일요일처럼 붉게 */}
                    <span
                      className={
                        "text-[12px] font-bold " +
                        (isToday
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-zion-700 text-white"
                          : dow === 0 || isHoliday
                            ? "text-red-500"
                            : "text-ink")
                      }
                    >
                      {dayNum}
                    </span>
                    <span className="flex min-w-0 gap-0.5 overflow-hidden">
                      {marks.slice(0, 2).map((m, j) => (
                        <span
                          key={j}
                          title={m.label}
                          className={"truncate rounded px-1 text-[9px] font-bold " + DAYMARK_TONE[m.tone]}
                        >
                          {m.tone === "birthday" ? <Cake size={9} className="inline" /> : null}
                          {m.tone === "birthday" ? " " : ""}
                          {m.label}
                        </span>
                      ))}
                      {marks.length > 2 && (
                        <span className="shrink-0 text-[9px] text-ink-soft" title={marks.map((m) => m.label).join(" · ")}>
                          +{marks.length - 2}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className={
                          "flex items-center gap-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium " +
                          KIND_TONE[e.kind]
                        }
                        title={`${PLAN_ENTRY_LABELS[e.kind]} — ${e.title}${e.important ? " (중요)" : ""}`}
                      >
                        {/* 중요 표시는 색이 아니라 별로 — 칸이 작아 색만으로는 구별이 어렵다 */}
                        {e.important && <Star size={8} className="shrink-0 fill-current" />}
                        <span className="truncate">
                          {/* 입력칸이 「회차」를 받으므로 표기도 회차다 — 「N강」 연속 번호 표기는 뺐다(2026-08-15) */}
                          {e.session != null && `${e.session}회차 `}
                          {e.title}
                        </span>
                      </div>
                    ))}
                    {list.length > 3 && (
                      <div className="px-1 text-[10px] text-ink-soft">+{list.length - 3}건 더</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      ) : (
      /*
        주간 보기 (2026-08-13 리드 지시) — 하루가 칸 하나. 항목을 자르지 않고 전부 보여 준다.
        좁은 화면에서는 요일별 칸이 세로로 쌓인다 — 하루하루가 독립 카드라 쌓여도 읽힌다.
      */
      <div className="grid grid-cols-7 gap-1.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {weekDates.map((date, i) => {
          const list = byDate.get(date) ?? [];
          const isToday = date === todayYmd();
          const marks = marksOf(date);
          const isHoliday = marks.some((m) => m.tone === "holiday");
          const d = new Date(date + "T00:00:00");
          return (
            <button
              key={date}
              onClick={(e) => setPicked({ date, anchor: e.currentTarget })}
              className={
                "min-h-[150px] rounded-lg border p-2 text-left align-top transition hover:border-zion-400 " +
                (picked?.date === date
                  ? "border-zion-500 bg-zion-50"
                  : isToday
                    ? "border-zion-300 bg-white"
                    : "border-zion-100 bg-white")
              }
            >
              <div className="mb-1.5 flex items-center gap-1">
                <span
                  className={
                    "text-[12px] font-bold " +
                    (isToday
                      ? "rounded-full bg-zion-700 px-1.5 text-white"
                      : i === 0 || isHoliday
                        ? "text-red-500"
                        : "text-ink")
                  }
                >
                  {d.getMonth() + 1}.{d.getDate()} ({WEEKDAYS[d.getDay()]})
                </span>
              </div>
              {marks.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-0.5">
                  {marks.map((m, j) => (
                    <span key={j} className={"rounded px-1 py-0.5 text-[9px] font-bold " + DAYMARK_TONE[m.tone]}>
                      {m.tone === "birthday" && <Cake size={9} className="mr-0.5 inline" />}
                      {m.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-0.5">
                {list.length === 0 ? (
                  <span className="text-[11px] text-ink-soft">—</span>
                ) : (
                  list.map((e) => (
                    <div
                      key={e.id}
                      className={
                        "flex items-center gap-0.5 rounded px-1 py-0.5 text-[10.5px] font-medium " + KIND_TONE[e.kind]
                      }
                    >
                      {e.important && <Star size={8} className="shrink-0 fill-current" />}
                      <span className="min-w-0 flex-1 truncate">
                        {/* 입력칸이 「회차」를 받으므로 표기도 회차다 — 「N강」 연속 번호 표기는 뺐다(2026-08-15) */}
                          {e.session != null && `${e.session}회차 `}
                        {e.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>
      )}

        {/* 중요 일정 — 별을 켠 것만 모인다. 달력 아래에 둔다 (왼쪽은 주차 판이 쓴다) */}
        <div className="mt-4">
          <ImportantList
            entries={planEntries.filter((e) => e.cohortKey === cohortKey && e.important)}
            canEdit={canEdit}
            onPick={(d, el) => setPicked({ date: d, anchor: el })}
          />
        </div>
      </div>

        {/* 왼쪽: 주차별 진행 현황 — 개강 N주 단위의 운영 기록 (2026-08-22 리드 시안) */}
        <div className="min-w-0 xl:order-1 xl:col-span-2">
          <WeekOpsBoard
            cohortKey={cohortKey}
            startsOn={sched.startsOn}
            endsOn={sched.endsOn}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* 하단: 운영 분석 — 체크포인트·우선순위·주의사항·성과 지표·메모 (2026-08-22 리드 시안) */}
      <OpsAnalysisBoard
        cohortKey={cohortKey}
        canEdit={canEdit}
        startsOn={sched.startsOn}
        endsOn={sched.endsOn}
      />

      {monthPickAnchor && (
        <MonthYearPicker
          year={cursor.year}
          month={cursor.month}
          anchor={monthPickAnchor}
          onPick={(y, m) => {
            setCursor({ year: y, month: m });
            setPicked(null);
          }}
          onClose={() => setMonthPickAnchor(null)}
        />
      )}

      {picked && (
        <DayPopover
          date={picked.date}
          anchor={picked.anchor}
          entriesOf={(d) => byDate.get(d) ?? []}
          marksOf={marksOf}
          canEdit={canEdit}
          cohortKey={cohortKey}
          onMove={(d) => setPicked({ date: d, anchor: picked.anchor })}
          onClose={() => setPicked(null)}
        />
      )}

      {/* 기수 회의록 (2026-08-18 리드 지시) — 회의 내용을 달력과 같은 화면에서 남긴다 */}
      <MeetingNotes cohortKey={cohortKey} canEdit={canEdit} />

      {/* 종전 주차별 글 — 달력으로 옮긴 뒤에도 남겨 둔다 */}
      <LegacyWeeklyNotes cohortKey={cohortKey} plans={plans} canEdit={canEdit} />

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        수강생의 이름이나 개인적인 사정은 적지 않습니다 — 진행 계획만 남깁니다.
        파일 원본 보관은 2차(스토리지)에서 지원되고, 지금은 올린 파일에서 읽은 일정만 반영됩니다.
      </p>
    </div>
  );
}

/**
 * 기수 회의록 (2026-08-18 리드 지시) — 인교섬 회의·사명자 회의 내용을 남기는 자리.
 * 주간계획과 같은 권한이다: 해당 기수의 강사·전도사만 쓰고, 열람은 담당 범위 안에서 누구나.
 * ⚠️ 기수 공유 기록이라 수강생 개인정보를 적지 않는다 — `scanPII`가 걸리면 저장을 막는다
 * (상담 사례와 같은 강제. 안내만으로는 회의록처럼 긴 글에서 놓친다).
 */
function MeetingNotes({ cohortKey, canEdit }: { cohortKey: string; canEdit: boolean }) {
  const session = useSession();
  const { meetingNotes, addMeetingNote, deleteMeetingNote } = useStore();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${`${n.getMonth() + 1}`.padStart(2, "0")}-${`${n.getDate()}`.padStart(2, "0")}`;
  });
  const [body, setBody] = useState("");

  const notes = meetingNotes
    .filter((n) => n.cohortKey === cohortKey)
    .sort((a, b) => b.date.localeCompare(a.date));
  const warnings = useMemo(() => scanPII(body), [body]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5 || warnings.length > 0) return;
    addMeetingNote({
      cohortKey,
      date,
      body: body.trim(),
      createdBy: session.name,
      createdByRole: session.roleCode,
    });
    setBody("");
    setOpen(false);
  }

  return (
    <div className="mt-5 rounded-xl border border-zion-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
          <NotebookPen size={15} className="text-zion-600" /> 기수 회의록
          {notes.length > 0 && <span className="text-[12px] font-normal text-ink-soft">{notes.length}건</span>}
        </div>
        {canEdit && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-zion-200 px-2.5 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
          >
            {open ? "취소" : "+ 회의록 남기기"}
          </button>
        )}
      </div>

      {open && canEdit && (
        <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg bg-zion-50 p-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
              회의 날짜
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="회의 날짜"
                className="rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
              />
            </label>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="예) 인교섬 회의 — 이번 주 보강 인원 배정, 다음 주 특강 준비 분담"
            aria-label="회의 내용"
            className="w-full resize-y rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
          />
          {warnings.length > 0 && (
            <p className="rounded-lg bg-gold-100/60 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-ink">
              <strong className="font-bold">지워 주세요:</strong> {warnings.join(" · ")} — 회의록은
              기수 공유 기록입니다.
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={body.trim().length < 5 || warnings.length > 0}
              className="rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700 disabled:cursor-not-allowed disabled:bg-zion-300"
            >
              저장
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-soft">
          아직 회의록이 없습니다.{canEdit && " 「회의록 남기기」로 남깁니다."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-lg border border-zion-100 p-3">
              <div className="flex items-center gap-2 text-[11px] text-ink-soft">
                <strong className="text-[12px] text-zion-800">{n.date}</strong>
                <span>
                  {n.createdBy} ({ROLE_LABELS[n.createdByRole]})
                </span>
                {canEdit && (
                  <button
                    onClick={() => deleteMeetingNote(n.id)}
                    aria-label={`${n.date} 회의록 지우기`}
                    className="ml-auto rounded p-1 text-ink-soft opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── 중요 일정 — 달력 옆에 모아 둔다 ── */

function ImportantList({
  entries,
  canEdit,
  onPick,
}: {
  entries: PlanEntry[];
  canEdit: boolean;
  /** 누른 줄을 앵커로 넘긴다 — 팝오버가 그 자리에서 열리게 */
  onPick: (date: string, anchor: HTMLElement) => void;
}) {
  const session = useSession();
  const { togglePlanImportant } = useStore();
  const today = todayYmd();

  // 다가오는 것이 위로 — 지난 일정은 아래로 내리되 지우지는 않는다(기록이다)
  const sorted = [...entries].sort((a, b) => {
    const aPast = a.date < today;
    const bPast = b.date < today;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return aPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
  });

  return (
    <Card className="col-span-1 self-start">
      <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-zion-900">
        <Star size={14} className="fill-gold-500 text-gold-500" /> 중요 일정
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-ink-soft">
        기수 전체가 지키는 날을 여기 모읍니다. 달력에서 날짜를 눌러 일정에 별을 켜면 올라옵니다.
      </p>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-[12px] leading-relaxed text-ink-soft">
          아직 중요 표시한 일정이 없습니다.
          {canEdit ? (
            <>
              <br />
              날짜를 눌러 일정을 넣고 ☆를 켜 보세요.
            </>
          ) : null}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((e) => {
            const past = e.date < today;
            const d = new Date(e.date + "T00:00:00");
            return (
              <li key={e.id}>
                <div
                  className={
                    "flex items-start gap-1.5 rounded-lg border px-2 py-1.5 " +
                    (past ? "border-zion-100 bg-zion-50/50 opacity-70" : "border-gold-500/40 bg-gold-100/40")
                  }
                >
                  <button
                    onClick={(ev) => onPick(e.date, ev.currentTarget)}
                    className="min-w-0 flex-1 text-left"
                    title="그 날짜 열기"
                  >
                    <div className="flex items-center gap-1">
                      <span className={"text-[11px] font-bold " + (past ? "text-ink-soft" : "text-gold-700")}>
                        {d.getMonth() + 1}.{d.getDate()} ({WEEKDAYS[d.getDay()]})
                      </span>
                      <span className={"rounded px-1 text-[9.5px] font-bold " + KIND_TONE[e.kind]}>
                        {PLAN_ENTRY_LABELS[e.kind]}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] leading-snug text-ink">
                      {e.session != null && <strong className="mr-1 text-zion-800">{e.session}회차</strong>}
                      {e.title}
                    </div>
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => togglePlanImportant(e.id, session.name, session.roleCode)}
                      aria-label={`${e.title} 중요 해제`}
                      title="중요 해제"
                      className="shrink-0 rounded p-0.5 text-gold-600 transition hover:bg-white"
                    >
                      <Star size={12} className="fill-gold-500" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ── 하루 상세 — 작은 팝업. 항목을 더하고 지우고 중요 표시한다 ── */

function DayPopover({
  date,
  anchor,
  entriesOf,
  marksOf,
  canEdit,
  cohortKey,
  onMove,
  onClose,
}: {
  date: string;
  anchor: HTMLElement;
  /** 날짜를 옮겨도 그 날 목록을 다시 받아야 한다 */
  entriesOf: (date: string) => PlanEntry[];
  marksOf: (date: string) => DayMark[];
  canEdit: boolean;
  cohortKey: string;
  onMove: (date: string) => void;
  onClose: () => void;
}) {
  const session = useSession();
  const {
    addPlanEntry,
    deletePlanEntry,
    togglePlanImportant,
    updatePlanEntry,
    personalEvents,
    addPersonalEvent,
  } = useStore();
  const [kind, setKind] = useState<PlanEntryKind>("progress");
  const [title, setTitle] = useState("");
  const [sessionNo, setSessionNo] = useState("");
  const [important, setImportant] = useState(false);
  /** 날짜를 고치는 중인 항목 (2026-08-13 리드 지시 — 일정 날짜 편집) */
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState(date);
  const titleRef = useRef<HTMLInputElement | null>(null);
  /** 수강생 개인정보가 스치면 바로 알린다 — 상담·심방(2026-08-17)이 생기며 더 중요해졌다 */
  const piiWarnings = useMemo(() => scanPII(title), [title]);

  const entries = entriesOf(date);
  const d = new Date(date + "T00:00:00");
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;

  /** 하루씩 옮긴다 — 팝오버를 닫았다 다시 열지 않아도 이웃 날짜를 훑는다 */
  function shiftDay(delta: number) {
    const n = new Date(d);
    n.setDate(n.getDate() + delta);
    onMove(ymd(n));
  }

  // 열리면 바로 적을 수 있게 입력칸에 커서를 둔다 (닫기·Esc는 팝오버가 맡는다)
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 1) return;
    addPlanEntry({
      cohortKey,
      date,
      kind,
      title: title.trim(),
      session: kind === "progress" && sessionNo.trim() ? Number(sessionNo) : null,
      important,
      updatedBy: session.name,
      updatedByRole: session.roleCode,
    });
    setTitle("");
    setSessionNo("");
    setImportant(false);
    titleRef.current?.focus(); // 연달아 적을 수 있게
  }

  return (
    <AnchoredPopover anchor={anchor} width={360} label={`${label} 일정`} onClose={onClose}>
      <div className="p-3.5">
      {/* 머리 — 날짜를 좌우로 옮긴다. 닫았다 다시 열 필요가 없다 */}
      <div className="mb-3 flex items-center gap-1">
        <button
          onClick={() => shiftDay(-1)}
          aria-label="앞날로"
          className="rounded-lg border border-zion-200 p-1 text-zion-700 transition hover:bg-zion-50"
        >
          <ChevronLeft size={13} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[14px] font-bold text-zion-900">{label}</div>
          {marksOf(date).length > 0 && (
            <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
              {marksOf(date).map((m, j) => (
                <span key={j} className={"rounded px-1.5 py-0.5 text-[10px] font-bold " + DAYMARK_TONE[m.tone]}>
                  {m.tone === "birthday" && <Cake size={10} className="mr-0.5 inline" />}
                  {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => shiftDay(1)}
          aria-label="다음날로"
          className="rounded-lg border border-zion-200 p-1 text-zion-700 transition hover:bg-zion-50"
        >
          <ChevronRight size={13} />
        </button>
        <button onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
          <X size={16} />
        </button>
      </div>

      {/*
        ⚠️ 권한이 없을 때 **왜 못 넣는지** 밝힌다. 종전에는 폼만 조용히 사라져서
        「추가 기능이 없어졌다」로 읽혔다 (2026-08-13 리드 지적).
      */}
      {!canEdit && (
        <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-zion-50 p-2.5 text-[12px] leading-relaxed text-ink">
          <Lock size={13} className="mt-0.5 shrink-0 text-ink-soft" />
          <span>
            <strong className="font-semibold">보기 전용입니다.</strong> 기수 계획은 그 기수의
            강사·전도사가 적고 고칩니다 — 계정 권한 때문이지 기능이 없는 것이 아닙니다.
          </span>
        </p>
      )}

      {entries.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-ink-soft">
          이 날에 적힌 계획이 없습니다.{canEdit ? " 아래에서 추가하세요." : ""}
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-zion-100 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold " + KIND_TONE[e.kind]}>
                  {PLAN_ENTRY_LABELS[e.kind]}
                </span>
                <span className="min-w-0 flex-1 text-[13px] text-ink">
                  {e.session != null && <strong className="mr-1 text-zion-800">{e.session}회차</strong>}
                  {e.title}
                </span>
                {e.fromUpload && (
                  <span className="shrink-0 text-[10px] text-ink-soft" title="진도표 파일에서 들어온 항목">
                    파일
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-ink-soft">
                  {e.updatedBy} ({ROLE_LABELS[e.updatedByRole]})
                </span>
                {/*
                  내 일정에 담기 (2026-08-18 리드 승인 ③) — 기수 일정을 개인 일정으로 복사해
                  캘린더 내보내기(하루 전 알림)까지 잇는다. 담는 것은 누구나(권한 무관).
                  같은 날 같은 제목이 이미 있으면 담기지 않게 막는다 — 두 번 눌러 겹치는 것을 방지.
                */}
                <button
                  onClick={() => {
                    const title = `[기수] ${PLAN_ENTRY_LABELS[e.kind]} — ${e.title}`;
                    const dup = personalEvents.some(
                      (p) => p.userName === session.name && p.date === e.date && p.title === title,
                    );
                    if (!dup) addPersonalEvent({ userName: session.name, date: e.date, time: "", title });
                  }}
                  aria-label={`${e.title} 내 일정에 담기`}
                  title={
                    personalEvents.some(
                      (p) =>
                        p.userName === session.name &&
                        p.date === e.date &&
                        p.title === `[기수] ${PLAN_ENTRY_LABELS[e.kind]} — ${e.title}`,
                    )
                      ? "이미 내 일정에 있습니다"
                      : "내 일정에 담기 — 마이페이지에서 캘린더로 내보낼 수 있습니다"
                  }
                  className={
                    "shrink-0 rounded p-1 transition " +
                    (personalEvents.some(
                      (p) =>
                        p.userName === session.name &&
                        p.date === e.date &&
                        p.title === `[기수] ${PLAN_ENTRY_LABELS[e.kind]} — ${e.title}`,
                    )
                      ? "text-zion-600"
                      : "text-zion-300 hover:bg-zion-50 hover:text-zion-700")
                  }
                >
                  <CalendarPlus size={13} />
                </button>
                {canEdit && (
                  <>
                    {/* 별을 켜면 달력 옆 「중요 일정」에 올라간다 */}
                    <button
                      onClick={() => togglePlanImportant(e.id, session.name, session.roleCode)}
                      aria-pressed={!!e.important}
                      aria-label={e.important ? `${e.title} 중요 해제` : `${e.title} 중요 표시`}
                      title={e.important ? "중요 해제" : "중요 일정으로 표시"}
                      className={
                        "shrink-0 rounded p-1 transition " +
                        (e.important
                          ? "text-gold-600 hover:bg-gold-100/60"
                          : "text-zion-300 hover:bg-zion-50 hover:text-gold-600")
                      }
                    >
                      <Star size={13} className={e.important ? "fill-gold-500" : ""} />
                    </button>
                    {/* 날짜 옮기기 (2026-08-13 리드 지시) — store의 updatePlanEntry 첫 사용처다 */}
                    <button
                      onClick={() => {
                        setMovingId(movingId === e.id ? null : e.id);
                        setMoveDate(e.date);
                      }}
                      aria-expanded={movingId === e.id}
                      aria-label={`${e.title} 날짜 옮기기`}
                      title="다른 날짜로 옮기기"
                      className="shrink-0 rounded p-1 text-ink-soft transition hover:bg-zion-50 hover:text-zion-700"
                    >
                      <PencilLine size={13} />
                    </button>
                    <button
                      onClick={() => deletePlanEntry(e.id)}
                      aria-label={`${e.title} 지우기`}
                      className="shrink-0 rounded p-1 text-ink-soft transition hover:bg-zion-50 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
              {movingId === e.id && canEdit && (
                <div className="mt-2 flex items-center gap-2 border-t border-zion-100 pt-2">
                  <input
                    type="date"
                    value={moveDate}
                    onChange={(ev) => setMoveDate(ev.target.value)}
                    aria-label="옮길 날짜"
                    className="rounded-lg border border-zion-100 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-zion-500"
                  />
                  <button
                    onClick={() => {
                      if (!moveDate || moveDate === e.date) {
                        setMovingId(null);
                        return;
                      }
                      updatePlanEntry(e.id, { date: moveDate }, session.name, session.roleCode);
                      setMovingId(null);
                    }}
                    className="rounded-lg bg-zion-800 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-zion-700"
                  >
                    옮기기
                  </button>
                  <button
                    onClick={() => setMovingId(null)}
                    className="rounded-lg px-2 py-1.5 text-[12px] text-ink-soft hover:bg-zion-50"
                  >
                    취소
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-zion-100 pt-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as PlanEntryKind)}
            aria-label="항목 종류"
            className="rounded-lg border border-zion-100 bg-white px-2.5 py-2 text-[13px] outline-none focus:border-zion-500"
          >
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {PLAN_ENTRY_LABELS[k]}
              </option>
            ))}
          </select>
          {kind === "progress" && (
            <input
              value={sessionNo}
              onChange={(e) => setSessionNo(e.target.value.replace(/\D/g, ""))}
              placeholder="회차"
              inputMode="numeric"
              aria-label="진도 회차"
              className="w-16 rounded-lg border border-zion-100 px-2.5 py-2 text-[13px] outline-none focus:border-zion-500"
            />
          )}
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === "counsel" || kind === "visit"
                ? "예) 오전 상담 2건 / 오후 심방"
                : "예) 비유한 짐승과 머리 / 목요일 저녁 보강 (3명)"
            }
            className="min-w-0 flex-1 basis-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />
          {/*
            상담·심방은 수강생 이름을 적기 쉬운 자리다 — 달력은 기수 공유 화면이라
            이름이 오르면 안 된다. scanPII는 실수를 잡는 그물이고 안내가 먼저다(게시판과 같은 방식).
            누구를 만났는지는 수강생 상세의 「보강 · 상담 메모」에 남긴다.
          */}
          {piiWarnings.length > 0 && (
            <p className="basis-full rounded-lg bg-gold-100/60 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-ink">
              <strong className="font-bold">지워 주세요:</strong> {piiWarnings.join(" · ")} — 달력은
              기수 공유 화면입니다. 누구인지는 수강생 상세의 「보강 · 상담 메모」에 남깁니다.
            </p>
          )}
          <label className="flex items-center gap-1.5 text-[12px] text-ink">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
              className="accent-gold-600"
            />
            <Star size={12} className={important ? "fill-gold-500 text-gold-500" : "text-zion-300"} />
            중요 일정
          </label>
          <button
            type="submit"
            disabled={title.trim().length === 0}
            className="ml-auto flex items-center gap-1 rounded-lg bg-zion-800 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700 disabled:cursor-not-allowed disabled:bg-zion-300"
          >
            <Plus size={14} /> 추가
          </button>
        </form>
      )}
      </div>
    </AnchoredPopover>
  );
}


/* ── 종전 주차별 글 (지우지 않고 남긴다) ── */

function LegacyWeeklyNotes({
  cohortKey,
  plans,
  canEdit,
}: {
  cohortKey: string;
  plans: ReturnType<typeof useStore>["plans"];
  canEdit: boolean;
}) {
  const session = useSession();
  const { savePlan } = useStore();
  const [week, setWeek] = useState(WEEKS[0]);
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const plan = plans.find((p) => p.cohortKey === cohortKey && p.week === week) ?? null;
  const anyWritten = plans.some((p) => p.cohortKey === cohortKey && p.body.trim());

  return (
    <details className="mt-5" open={anyWritten}>
      <summary className="cursor-pointer text-[13px] font-semibold text-zion-700">
        주차별 메모 (종전 형식){anyWritten ? "" : " — 아직 적힌 것 없음"}
      </summary>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {WEEKS.map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={
              "rounded-lg px-2.5 py-1 text-[12px] font-semibold transition " +
              (week === w ? "bg-zion-700 text-white" : "bg-zion-100 text-zion-700 hover:bg-zion-200")
            }
          >
            {w}
          </button>
        ))}
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto rounded-lg border border-zion-200 px-2.5 py-1 text-[12px] font-semibold text-zion-700 hover:bg-zion-50"
          >
            {plan ? "수정" : "작성"}
          </button>
        )}
      </div>

      <Card className="mt-2">
        {plan ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-zion-100 pb-2">
              <span className="text-[11px] text-ink-soft">
                마지막 수정 {plan.updatedBy} ({ROLE_LABELS[plan.updatedByRole]}) ·{" "}
                {plan.updatedAt.slice(0, 16).replace("T", " ")}
              </span>
              {plan.history.length > 0 && (
                <button
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="flex items-center gap-1 rounded-lg border border-zion-200 px-2 py-0.5 text-[11px] font-semibold text-zion-700 hover:bg-zion-50"
                >
                  <History size={11} /> 이력 {plan.history.length}
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{plan.body}</p>
            {historyOpen && (
              <ol className="mt-3 space-y-2 border-t border-zion-100 pt-2">
                {plan.history.map((h, i) => (
                  <li key={i} className="rounded-lg bg-zion-50 p-2.5">
                    <div className="text-[11px] text-ink-soft">
                      {h.editedBy} ({ROLE_LABELS[h.editedByRole]}) ·{" "}
                      {h.editedAt.slice(0, 16).replace("T", " ")}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-ink">{h.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-[13px] text-ink-soft">{week} 메모가 없습니다.</p>
        )}
      </Card>

      {editing && canEdit && (
        <PlanForm
          week={week}
          initial={plan?.body ?? ""}
          onClose={() => setEditing(false)}
          onSubmit={(body) => {
            savePlan({
              cohortKey,
              week,
              body,
              editedBy: session.name,
              editedByRole: session.roleCode,
            });
            setEditing(false);
          }}
        />
      )}
    </details>
  );
}

function PlanForm({
  week,
  initial,
  onClose,
  onSubmit,
}: {
  week: string;
  initial: string;
  onClose: () => void;
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5) {
      setError("내용을 다섯 글자 이상 적어 주세요.");
      return;
    }
    onSubmit(body.trim());
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="주차별 메모 작성">
        <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-zion-900">주차별 메모 — {week}</h2>
            <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
              <X size={16} />
            </button>
          </div>
          <p className="mb-4 text-[12px] text-ink-soft">
            고치면 이전 내용이 이력으로 남습니다. 날짜별 계획은 위 달력에 적습니다.
          </p>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder={"예)\n· 이번 주 분반별 확인 사항\n· 다음 주 준비물"}
            className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
          />

          <p className="mb-3 text-[11px] text-ink-soft">
            수강생의 이름이나 개인적인 사정은 적지 않습니다. 진행 계획만 남겨 주세요.
          </p>

          {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-ink-soft hover:bg-zion-50">
              취소
            </button>
            <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
              저장
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
