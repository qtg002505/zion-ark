import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Lock,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canEditCohortRecord, cohortKeyOf } from "../lib/permissions";
import { PLAN_ENTRY_LABELS, ROLE_LABELS, type PlanEntry, type PlanEntryKind } from "../lib/types";
import { COHORT, SCHEDULE } from "../content/cohort-mock";
import { buildXlsx, downloadBlob, readXlsx } from "../lib/xlsx";
import { AnchoredPopover } from "../components/AnchoredPopover";
import { MonthYearPicker } from "../components/MonthYearPicker";
import { PageHeader, Card } from "./common";

/** 종전 주차별 글 — 달력으로 옮긴 뒤에도 이미 적어 둔 것은 남겨 함께 본다 */
const WEEKS = ["8월 1주", "7월 4주", "7월 3주", "7월 2주", "7월 1주"];

const KIND_TONE: Record<PlanEntryKind, string> = {
  progress: "bg-zion-700 text-white",
  makeup: "bg-gold-100 text-gold-700 border border-gold-500/50",
  event: "bg-zion-100 text-zion-800 border border-zion-300",
  note: "bg-white text-ink-soft border border-zion-200",
};

const KIND_ORDER: PlanEntryKind[] = ["progress", "makeup", "event", "note"];
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

/** 기수 일정 — 달력에 함께 찍어 준다 (개강·종강·새신자교육) */
const COHORT_MARKS: Record<string, string> = {
  [SCHEDULE.startsOn]: "개강",
  [SCHEDULE.endsOn]: "종강 예정",
  [SCHEDULE.newcomerOn]: "새신자 교육",
};

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
  const { planEntries, plans } = useStore();

  const cohortKey = cohortKeyOf(session);
  const canEdit = canEditCohortRecord(session, cohortKey);

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  /**
   * 고른 날짜와 **그 칸 요소** — 팝오버가 누른 자리에서 열리려면 앵커가 필요하다
   * (2026-08-10 리드 지시). 팝오버 안에서 날짜를 옮겨도 앵커는 처음 자리에 둔다 —
   * 옮길 때마다 팝오버가 뛰어다니면 눈이 따라가지 못한다.
   */
  const [picked, setPicked] = useState<{ date: string; anchor: HTMLElement } | null>(null);
  /** 년·월 판을 연 라벨 — 누른 자리에서 열린다 (2026-08-11) */
  const [monthPickAnchor, setMonthPickAnchor] = useState<HTMLElement | null>(null);

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

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setPicked(null);
  }

  const monthLabel = `${cursor.year}년 ${cursor.month + 1}월`;
  const monthCount = [...byDate.entries()].filter(([d]) =>
    d.startsWith(`${cursor.year}-${`${cursor.month + 1}`.padStart(2, "0")}`),
  ).length;

  return (
    <div>
      <PageHeader
        crumb="기수 현황"
        title="기수 주간계획"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 담당 강사·전도사가 함께 작성하고 고칩니다.`}
        action={
          canEdit ? (
            <ProgressUpload cohortKey={cohortKey} />
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-ink-soft">
              <Lock size={12} /> 수정은 해당 기수 강사·전도사만
            </span>
          )
        }
      />

      {/* 달 이동 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            aria-label="이전 달"
            className="rounded-lg border border-zion-200 p-1.5 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronLeft size={15} />
          </button>
          {/*
            라벨을 누르면 년·월을 바둑판에서 고른다 (2026-08-11 리드 지시).
            화살표만으로는 몇 달 떨어진 곳까지 가는 데 열 번 넘게 눌러야 했다.
          */}
          <button
            onClick={(e) => setMonthPickAnchor(e.currentTarget)}
            aria-haspopup="dialog"
            aria-expanded={monthPickAnchor != null}
            title="년·월을 골라 옮깁니다"
            className="min-w-[110px] rounded-lg px-2 py-1 text-center text-[15px] font-bold text-zion-900 transition hover:bg-zion-50"
          >
            {monthLabel}
          </button>
          <button
            onClick={() => shift(1)}
            aria-label="다음 달"
            className="rounded-lg border border-zion-200 p-1.5 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <button
          onClick={() => {
            // 이번 달로만 옮긴다 — 팝오버는 칸을 눌러야 그 자리에서 열린다
            const n = new Date();
            setCursor({ year: n.getFullYear(), month: n.getMonth() });
            setPicked(null);
          }}
          className="rounded-lg border border-zion-200 px-2.5 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          오늘
        </button>
        <span className="text-[12px] text-ink-soft">이 달에 계획이 있는 날 {monthCount}일</span>
        <div className="ml-auto flex flex-wrap gap-1.5 text-[11px]">
          {KIND_ORDER.map((k) => (
            <span key={k} className={"rounded px-1.5 py-0.5 font-semibold " + KIND_TONE[k]}>
              {PLAN_ENTRY_LABELS[k]}
            </span>
          ))}
        </div>
      </div>

      {/*
        왼쪽 달력 · 오른쪽 중요 일정 (2026-08-10 리드 지시 — 월간 플래너 구성).
        기수 전체가 지키는 날을 달력에서 찾지 않고 옆에서 바로 보게 한다.
        좁은 화면에서는 1단으로 쌓인다 — 7열 달력과 목록을 나란히 두면 둘 다 뭉갠다.
      */}
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-1">
      <div className="col-span-3 max-lg:col-span-1">
      {/* 달력 — 좁은 화면에서는 가로로 넘긴다. 7열을 억지로 줄이면 글자가 뭉갠다 */}
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
              const mark = COHORT_MARKS[date];
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
                    <span
                      className={
                        "text-[12px] font-bold " +
                        (isToday
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-zion-700 text-white"
                          : dow === 0
                            ? "text-red-500"
                            : "text-ink")
                      }
                    >
                      {dayNum}
                    </span>
                    {mark && (
                      <span className="truncate rounded bg-gold-100 px-1 text-[9px] font-bold text-gold-700">
                        {mark}
                      </span>
                    )}
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
                          {e.session != null && `${e.session}강 `}
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

      </div>

        {/* 오른쪽: 중요 일정 — 별을 켠 것만 모인다 */}
        <ImportantList
          entries={planEntries.filter((e) => e.cohortKey === cohortKey && e.important)}
          canEdit={canEdit}
          onPick={(d, el) => setPicked({ date: d, anchor: el })}
        />
      </div>

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
          canEdit={canEdit}
          cohortKey={cohortKey}
          onMove={(d) => setPicked({ date: d, anchor: picked.anchor })}
          onClose={() => setPicked(null)}
        />
      )}

      {/* 종전 주차별 글 — 달력으로 옮긴 뒤에도 남겨 둔다 */}
      <LegacyWeeklyNotes cohortKey={cohortKey} plans={plans} canEdit={canEdit} />

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        수강생의 이름이나 개인적인 사정은 적지 않습니다 — 진행 계획만 남깁니다.
        파일 원본 보관은 2차(스토리지)에서 지원되고, 지금은 올린 파일에서 읽은 일정만 반영됩니다.
      </p>
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
                      {e.session != null && <strong className="mr-1 text-zion-800">{e.session}강</strong>}
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
  canEdit,
  cohortKey,
  onMove,
  onClose,
}: {
  date: string;
  anchor: HTMLElement;
  /** 날짜를 옮겨도 그 날 목록을 다시 받아야 한다 */
  entriesOf: (date: string) => PlanEntry[];
  canEdit: boolean;
  cohortKey: string;
  onMove: (date: string) => void;
  onClose: () => void;
}) {
  const session = useSession();
  const { addPlanEntry, deletePlanEntry, togglePlanImportant } = useStore();
  const [kind, setKind] = useState<PlanEntryKind>("progress");
  const [title, setTitle] = useState("");
  const [sessionNo, setSessionNo] = useState("");
  const [important, setImportant] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

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
          {COHORT_MARKS[date] && (
            <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold text-gold-700">
              {COHORT_MARKS[date]}
            </span>
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

      {entries.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-ink-soft">
          이 날에 적힌 계획이 없습니다.{canEdit ? " 아래에서 추가하세요." : ""}
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-lg border border-zion-100 px-2.5 py-2">
              <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold " + KIND_TONE[e.kind]}>
                {PLAN_ENTRY_LABELS[e.kind]}
              </span>
              <span className="min-w-0 flex-1 text-[13px] text-ink">
                {e.session != null && <strong className="mr-1 text-zion-800">{e.session}강</strong>}
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
                  <button
                    onClick={() => deletePlanEntry(e.id)}
                    aria-label={`${e.title} 지우기`}
                    className="shrink-0 rounded p-1 text-ink-soft transition hover:bg-zion-50 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
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
            placeholder="예) 비유한 짐승과 머리 / 목요일 저녁 보강 (3명)"
            className="min-w-0 flex-1 basis-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />
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

/* ── 진도표 업로드 — 한 파일로 주간계획과 진도표를 함께 채운다 ── */

function ProgressUpload({ cohortKey }: { cohortKey: string }) {
  const session = useSession();
  const { replaceUploadedPlanEntries } = useStore();
  const [msg, setMsg] = useState<string | null>(null);

  /** 공통 양식 — 이 열 이름·순서 그대로 쓰면 그대로 읽힌다 (2026-08-10 리드 지시로 엑셀) */
  function downloadTemplate() {
    const rows = [
      ["날짜", "구분", "회차", "내용"],
      ["2026-08-11", "진도", "60", "예) 비유한 짐승과 머리"],
      ["2026-08-13", "보강", "", "예) 목요일 저녁 보강"],
      ["2026-08-17", "행사", "", "예) 새신자 교육"],
    ];
    downloadBlob(buildXlsx(rows, "진도표"), "진도표_양식.xlsx");
  }

  const KIND_BY_LABEL: Record<string, PlanEntryKind> = {
    진도: "progress",
    보강: "makeup",
    행사: "event",
    메모: "note",
  };

  /**
   * 날짜 칸 읽기 — 사람이 엑셀에서 손대면 `2026-08-11` 말고 `2026. 8. 11` 처럼
   * 적히기도 한다. 흔한 형태는 받아 준다. 그래도 못 읽으면 그 줄만 건너뛴다.
   */
  function normalizeDate(raw: string): string | null {
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = /^(\d{4})[.\-/\s]+(\d{1,2})[.\-/\s]+(\d{1,2})\.?$/.exec(s);
    if (!m) return null;
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("읽는 중…");

    let table: string[][];
    try {
      table = file.name.toLowerCase().endsWith(".csv")
        ? (await file.text())
            .replace(/^﻿/, "")
            .split(/\r?\n/)
            .filter((l) => l.trim())
            .map((l) => l.split(",").map((c) => c.trim()))
        : await readXlsx(file);
    } catch {
      setMsg("파일을 읽지 못했습니다. 양식을 내려받아 그대로 채운 뒤 다시 올려 주세요.");
      e.target.value = "";
      return;
    }

    const rows: { date: string; kind: PlanEntryKind; title: string; session: number | null }[] = [];
    let skipped = 0;

    for (const [i, cols] of table.entries()) {
      if (i === 0 && (cols[0] ?? "").includes("날짜")) continue; // 머리글
      const date = normalizeDate(cols[0] ?? "");
      const title = (cols[3] ?? "").trim();
      // 한 줄이 어긋나도 통째로 실패시키지 않는다 — 그 줄만 건너뛰고 몇 줄인지 알린다
      if (!date || !title) {
        if ((cols[0] ?? "").trim() || title) skipped++;
        continue;
      }
      const sessionNo = (cols[2] ?? "").trim();
      rows.push({
        date,
        kind: KIND_BY_LABEL[(cols[1] ?? "").trim()] ?? "note",
        title,
        session: /^\d+$/.test(sessionNo) ? Number(sessionNo) : null,
      });
    }

    if (rows.length === 0) {
      setMsg("읽을 수 있는 줄이 없습니다. 양식을 내려받아 열 순서(날짜·구분·회차·내용)를 맞춰 주세요.");
      e.target.value = "";
      return;
    }
    replaceUploadedPlanEntries(cohortKey, rows, session.name, session.roleCode);
    setMsg(
      `${rows.length}건을 달력에 반영했습니다.${skipped > 0 ? ` (읽지 못한 ${skipped}줄은 건너뛰었습니다)` : ""}`,
    );
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={downloadTemplate}
          className="rounded-lg border border-zion-200 px-3 py-2 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          양식 내려받기
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-zion-700">
          <Upload size={14} /> 진도표 올리기
          {/* 엑셀이 기본이고 CSV도 받는다 — 이미 CSV로 만들어 둔 것이 있을 수 있다 */}
          <input
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={onFile}
            className="hidden"
          />
        </label>
      </div>
      {msg && <span className="max-w-[280px] text-right text-[11px] leading-relaxed text-ink-soft">{msg}</span>}
    </div>
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
  );
}
