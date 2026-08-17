import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Cake, ChevronLeft, ChevronRight, Download, Plus, Trash2 } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { isFieldStaff } from "../lib/permissions";
import { STUDENTS } from "../content/cohort-mock";
import { STUDENT_PROFILES } from "../content/student-profiles";
import { kstToday } from "../lib/daily";
import { AnchoredPopover } from "./AnchoredPopover";
import { Card } from "../pages/common";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/* ── 날짜 도우미 — 로컬 기준 (UTC로 바꾸면 하루 밀린다) ── */

function ymd(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

/** 그 날이 속한 주의 일요일 */
function weekStart(d: Date): Date {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

/**
 * 개인 주간 일정표 (2026-08-10 리드 지시) — 마이페이지의 스케줄러.
 *
 * 담당 기수 계획(`/plan`)과 **다른 것이다.** 저기는 기수 전체가 함께 고치는 기록이고,
 * 여기는 **본인만 보는 개인 일정**이다. 그래서 계정 이름으로만 묶는다.
 *
 * **담당 수강생 생일이 자동으로 뜬다** — 이미 가진 생년월일에서 월·일만 맞춰 본다.
 * 사람이 적는 것이 아니라 그 주에 해당하면 저절로 올라온다.
 *
 * ⛔ **알림은 캘린더 파일로 내보내 받는다.** 텔레그램 자동 발송은 서버가 있어야 하고,
 * 개인정보 반출 판단이 선행이다 — 아래 `docs/HANDOFF.md`와 화면 안내 참고.
 */
export function WeekScheduler() {
  const session = useSession();
  const { personalEvents, addPersonalEvent, deletePersonalEvent } = useStore();
  const [offset, setOffset] = useState(0); // 0 = 이번 주
  /** 고른 날짜 + 누른 칸 — 팝오버가 그 자리에서 열리게 (2026-08-10 리드 지시) */
  const [openDay, setOpenDay] = useState<{ date: string; anchor: HTMLElement } | null>(null);

  const base = useMemo(() => {
    const s = weekStart(new Date());
    s.setDate(s.getDate() + offset * 7);
    return s;
  }, [offset]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [base],
  );

  const mine = personalEvents.filter((e) => e.userName === session.name);

  /**
   * 담당 수강생 생일 — 담당 기수의 수강생만 본다(실무직만 담당 기수가 있다).
   * ⚠️ 태어난 **해는 쓰지 않는다.** 이 자리에 필요한 것은 "며칠인가"뿐이다.
   */
  const birthdays = useMemo(() => {
    if (!isFieldStaff(session)) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const s of STUDENTS) {
      const p = STUDENT_PROFILES[s.key];
      if (!p?.birthDate) continue;
      const md = p.birthDate.slice(5); // MM-DD
      for (const d of days) {
        if (ymd(d).slice(5) === md) {
          const key = ymd(d);
          map.set(key, [...(map.get(key) ?? []), s.name]);
        }
      }
    }
    return map;
  }, [session, days]);

  const today = kstToday();
  const rangeLabel = `${base.getMonth() + 1}월 ${base.getDate()}일 ~ ${days[6].getMonth() + 1}월 ${days[6].getDate()}일`;

  /**
   * 캘린더 파일(.ics)로 내보낸다 — 휴대전화 캘린더에 넣으면 **기기가 하루 전 알림**을 준다.
   * 서버 없이 "미리 알림"을 이루는 길이라 이 방식을 택했다.
   * ⚠️ 생일은 넣지 않는다 — 수강생 이름이 기기 밖 캘린더로 나가면 개인정보 반출이다.
   */
  function exportIcs() {
    const pad = (n: number) => `${n}`.padStart(2, "0");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ZION ARK//personal schedule//KO",
      "CALSCALE:GREGORIAN",
    ];
    const weekSet = new Set(days.map(ymd));
    for (const e of mine.filter((x) => weekSet.has(x.date))) {
      const [y, m, d] = e.date.split("-").map(Number);
      const [hh, mm] = (e.time || "09:00").split(":").map(Number);
      const start = new Date(y, m - 1, d, hh || 9, mm || 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const fmt = (dt: Date) =>
        `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@zion-ark`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${e.title.replace(/[\r\n,;]/g, " ")}`,
        // 하루 전 알림 — 이게 「미리 알려 주기」를 대신한다
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        "DESCRIPTION:시온 아크 일정 알림",
        "END:VALARM",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `내일정_${ymd(base)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const weekCount = mine.filter((e) => days.some((d) => ymd(d) === e.date)).length;

  return (
    <Card className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
          <CalendarDays size={15} className="text-zion-600" /> 내 주간 일정
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffset((v) => v - 1)}
            aria-label="지난 주"
            className="rounded-lg border border-zion-200 p-1 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-[130px] text-center text-[12px] font-semibold text-ink">{rangeLabel}</span>
          <button
            onClick={() => setOffset((v) => v + 1)}
            aria-label="다음 주"
            className="rounded-lg border border-zion-200 p-1 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronRight size={14} />
          </button>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-lg border border-zion-200 px-2 py-1 text-[11px] font-semibold text-zion-700 hover:bg-zion-50"
            >
              이번 주
            </button>
          )}
        </div>
        <button
          onClick={exportIcs}
          disabled={weekCount === 0}
          className="ml-auto flex items-center gap-1 rounded-lg border-2 border-zion-300 px-2.5 py-1.5 text-[12px] font-bold text-zion-700 transition hover:border-zion-500 hover:bg-zion-50 disabled:cursor-not-allowed disabled:opacity-40"
          title="휴대전화 캘린더에 넣으면 하루 전 알림을 받습니다"
        >
          <Download size={13} /> 캘린더로 받기
        </button>
      </div>

      {/* 요일 7칸 — 좁은 화면에서는 2칸, 더 좁으면 1칸으로 접힌다 */}
      <div className="grid grid-cols-7 gap-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {days.map((d, i) => {
          const key = ymd(d);
          const list = mine.filter((e) => e.date === key).sort((a, b) => a.time.localeCompare(b.time));
          const cakes = birthdays.get(key) ?? [];
          const isToday = key === today;
          return (
            <div
              key={key}
              className={
                "rounded-lg border p-2 " +
                (isToday ? "border-zion-500 bg-zion-50/60" : "border-zion-100 bg-white")
              }
            >
              <div className="mb-1.5 flex items-baseline gap-1">
                <span
                  className={
                    "text-[11px] font-bold " +
                    (i === 0 ? "text-red-500" : i === 6 ? "text-zion-600" : "text-ink-soft")
                  }
                >
                  {WEEKDAYS[i]}
                </span>
                <span className={"text-[15px] font-bold " + (isToday ? "text-zion-700" : "text-ink")}>
                  {d.getDate()}
                </span>
              </div>

              {/* 담당 수강생 생일 — 사람이 적지 않아도 저절로 뜬다 */}
              {cakes.map((name) => (
                <div
                  key={name}
                  className="mb-1 flex items-center gap-1 rounded bg-gold-100/70 px-1.5 py-1 text-[11px] font-semibold text-gold-700"
                >
                  <Cake size={10} className="shrink-0" />
                  <span className="truncate">{name} 생일</span>
                </div>
              ))}

              <ul className="space-y-1">
                {list.map((e) => (
                  <li key={e.id} className="group flex items-start gap-1 rounded bg-zion-50 px-1.5 py-1">
                    <span className="shrink-0 text-[10.5px] font-bold tabular-nums text-zion-700">
                      {e.time || "종일"}
                    </span>
                    <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-ink">{e.title}</span>
                    <button
                      onClick={() => deletePersonalEvent(e.id)}
                      aria-label={`${e.title} 지우기`}
                      className="shrink-0 rounded p-0.5 text-ink-soft opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                    >
                      <Trash2 size={10} />
                    </button>
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => setOpenDay({ date: key, anchor: e.currentTarget })}
                className="mt-1 flex w-full items-center justify-center gap-0.5 rounded border border-dashed border-zion-200 py-1 text-[10.5px] font-semibold text-zion-600 transition hover:border-zion-400 hover:bg-zion-50"
              >
                <Plus size={10} /> 추가
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        <strong className="text-ink">나만 보는 일정</strong>입니다 — 기수 전체가 함께 쓰는 계획은{" "}
        「기수 주간계획」에 적습니다. 담당 수강생 생일은 <strong className="text-ink">저절로</strong>{" "}
        표시됩니다(태어난 해는 쓰지 않습니다).
        <br />
        일정에 <strong className="text-ink">수강생 이름이나 개인 사정은 적지 않습니다</strong> —
        캘린더로 내보내면 기기 밖으로 나갑니다. 「캘린더로 받기」로 휴대전화 캘린더에 넣으면
        하루 전 알림이 옵니다(생일은 내보내지 않습니다).
      </p>

      {openDay && (
        <AddEventPopover
          date={openDay.date}
          anchor={openDay.anchor}
          events={mine.filter((e) => e.date === openDay.date)}
          onMove={(d) => setOpenDay({ date: d, anchor: openDay.anchor })}
          onClose={() => setOpenDay(null)}
          onDelete={deletePersonalEvent}
          onAdd={(time, title) => {
            addPersonalEvent({ userName: session.name, date: openDay.date, time, title });
          }}
        />
      )}
    </Card>
  );
}

/**
 * 일정 추가 팝오버 — 누른 칸 옆에서 열리고, 좌우 화살표로 **이웃 날짜로 옮긴다**.
 * 팝오버 자리는 처음 연 곳에 둔다 — 날짜를 옮길 때마다 뛰어다니면 눈이 따라가지 못한다.
 */
function AddEventPopover({
  date,
  anchor,
  events,
  onMove,
  onClose,
  onAdd,
  onDelete,
}: {
  date: string;
  anchor: HTMLElement;
  events: { id: string; time: string; title: string }[];
  onMove: (date: string) => void;
  onClose: () => void;
  onAdd: (time: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [time, setTime] = useState("09:00");
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLInputElement | null>(null);

  const d = new Date(date + "T00:00:00");
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function shiftDay(delta: number) {
    const n = new Date(d);
    n.setDate(n.getDate() + delta);
    onMove(ymd(n));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 1) return;
    onAdd(time, title.trim());
    setTitle(""); // 연달아 적을 수 있게 팝오버는 열어 둔다
    titleRef.current?.focus();
  }

  return (
    <AnchoredPopover anchor={anchor} width={320} label={`${label} 일정`} onClose={onClose}>
      <div className="p-3.5">
        <div className="mb-2.5 flex items-center gap-1">
          <button
            onClick={() => shiftDay(-1)}
            aria-label="앞날로"
            className="rounded-lg border border-zion-200 p-1 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronLeft size={13} />
          </button>
          <div className="min-w-0 flex-1 truncate text-center text-[14px] font-bold text-zion-900">
            {label}
          </div>
          <button
            onClick={() => shiftDay(1)}
            aria-label="다음날로"
            className="rounded-lg border border-zion-200 p-1 text-zion-700 transition hover:bg-zion-50"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {events.length > 0 && (
          <ul className="mb-2.5 space-y-1">
            {events
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((e) => (
                <li key={e.id} className="flex items-start gap-1.5 rounded bg-zion-50 px-2 py-1.5">
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-zion-700">
                    {e.time || "종일"}
                  </span>
                  <span className="min-w-0 flex-1 text-[12px] leading-snug text-ink">{e.title}</span>
                  <button
                    onClick={() => onDelete(e.id)}
                    aria-label={`${e.title} 지우기`}
                    className="shrink-0 rounded p-0.5 text-ink-soft transition hover:text-red-600"
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
          </ul>
        )}

        <form onSubmit={submit}>
          <div className="mb-2 flex gap-1.5">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="시각"
              className="rounded-lg border border-zion-100 px-2 py-1.5 text-[12px] outline-none focus:border-zion-500"
            />
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 분반 모임 준비"
              className="min-w-0 flex-1 rounded-lg border border-zion-100 px-2.5 py-1.5 text-[12px] outline-none focus:border-zion-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] leading-tight text-ink-soft">
              나만 보는 일정 — 수강생 이름은 적지 않습니다
            </span>
            <button
              type="submit"
              disabled={title.trim().length === 0}
              className="ml-auto shrink-0 rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700 disabled:bg-zion-300"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </AnchoredPopover>
  );
}
