import type { Student, WeeklyAttendance } from "./types";

/**
 * 출결에서 읽히는 신호 — "지금 갈리는 중인 사람"을 찾는다.
 *
 * 왜 필요한가: 이 기수의 실측은 출석률 97~100%가 8명, 13~49%가 9명이고 그 사이가 비어 있다.
 * 초반에 갈리면 돌아오지 않는다는 뜻이다. 그런데 누적 출석률만 보면 **아직 높은 사람**의
 * 최근 흔들림이 가려진다. 그래서 누적이 아니라 **최근 몇 주의 변화**를 본다.
 *
 * ⚠️ 이 모듈은 사람을 판정하지 않는다 (불변식 4). "이탈 위험 87%" 같은 점수를 내지 않고,
 * **무엇이 언제 관찰됐는지**만 적는다. 연락할지 말지는 담당자가 정한다.
 * 여기서 다루는 것은 출결 사실뿐이며, 신앙·인격·심리는 판단 대상이 아니다.
 */

export type SignalCode =
  | "consecutive_absence"
  | "makeup_pending"
  | "slot_changed"
  | "unrecorded"
  | "long_absence";

export interface Signal {
  code: SignalCode;
  /** 담당자가 그대로 읽을 수 있는 관찰 서술 */
  text: string;
  /** 눈에 먼저 띄어야 하는 순서 (클수록 먼저) */
  weight: number;
}

export interface StudentSignals {
  student: Student;
  signals: Signal[];
  /** 정렬용 — 신호의 무게 합. 사람에 대한 점수가 아니다 */
  order: number;
  /** 아직 판가름 나지 않은 쪽인지 (누적은 높은데 최근이 흔들림) */
  isEarly: boolean;
}

const isPresent = (w: WeeklyAttendance) => w.mark === "present" || w.mark === "makeupDone";

/** 받침에 따라 "으로 / 로"를 고른다 — "오전로"처럼 어색하게 읽히지 않게 */
function toParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinal = isHangul && (code - 0xac00) % 28 !== 0;
  return word + (hasFinal ? "으로" : "로");
}

/** 최근부터 연속으로 나오지 않은 주 수 */
function consecutiveAbsent(weeks: WeeklyAttendance[]): number {
  let n = 0;
  for (const w of weeks) {
    if (w.mark === "absent" || w.mark === "makeupPending") n++;
    else break;
  }
  return n;
}

function slotChange(weeks: WeeklyAttendance[]): { from: string; to: string } | null {
  const attended = weeks.filter((w) => isPresent(w) && w.slot);
  if (attended.length < 4) return null;
  const recent = attended.slice(0, 2).map((w) => w.slot);
  const before = attended.slice(2, 5).map((w) => w.slot);
  if (recent.length < 2 || before.length < 2) return null;
  // 최근 두 번이 같은 시간대이고, 그 전에는 다른 시간대가 굳어져 있었다면 바뀐 것으로 본다
  if (recent[0] !== recent[1]) return null;
  if (!before.every((s) => s === before[0])) return null;
  if (recent[0] === before[0]) return null;
  const LABEL: Record<string, string> = { evening: "저녁", morning: "오전", afternoon: "오후" };
  return { from: LABEL[before[0]!] ?? before[0]!, to: LABEL[recent[0]!] ?? recent[0]! };
}

export function readSignals(student: Student): StudentSignals {
  const weeks = student.recentWeeks;
  const signals: Signal[] = [];

  const absent = consecutiveAbsent(weeks);
  const attendedBefore = weeks.slice(absent).some(isPresent);

  if (absent >= 4) {
    // 오래 끊긴 경우 — 되돌리기 어려운 쪽이라 눈에 덜 띄게 둔다
    signals.push({
      code: "long_absence",
      text: attendedBefore
        ? `${absent}주째 나오지 않고 있습니다`
        : `${absent}주 이상 출석 기록이 없습니다`,
      weight: 20,
    });
  } else if (absent >= 2 && attendedBefore) {
    // 잘 나오던 사람이 막 끊긴 경우 — 지금이 연락할 때다
    signals.push({
      code: "consecutive_absence",
      text: `최근 ${absent}주 연속 나오지 않았습니다 (그 전에는 계속 출석)`,
      weight: 50,
    });
  } else if (absent === 1) {
    signals.push({ code: "consecutive_absence", text: "지난주에 나오지 않았습니다", weight: 20 });
  }

  if (weeks.some((w, i) => i < 3 && w.mark === "makeupPending")) {
    signals.push({
      code: "makeup_pending",
      text: "보강이 잡혀 있으나 아직 이행되지 않았습니다",
      weight: 35,
    });
  }

  const moved = slotChange(weeks);
  if (moved) {
    signals.push({
      code: "slot_changed",
      text: `출석 시간대가 ${moved.from}에서 ${toParticle(moved.to)} 바뀌었습니다 (생활 사정 확인 필요)`,
      weight: 25,
    });
  }

  const unrecorded = weeks.slice(0, 3).filter((w) => w.mark === "unknown").length;
  if (unrecorded > 0) {
    signals.push({
      code: "unrecorded",
      text: `최근 ${unrecorded}주가 미입력입니다 (출결 확인 필요)`,
      weight: 15,
    });
  }

  const order = signals.reduce((n, s) => n + s.weight, 0);

  // 누적 출석률은 아직 높은데 최근이 흔들리는 사람 — 지금 연락하면 되돌릴 여지가 있다
  const isEarly = student.attendanceRate >= 70 && signals.length > 0;

  return { student, signals, order, isEarly };
}

export function readAll(students: Student[]): StudentSignals[] {
  return students
    .map(readSignals)
    .filter((r) => r.signals.length > 0)
    .sort((a, b) => Number(b.isEarly) - Number(a.isEarly) || b.order - a.order);
}

/**
 * 최근 8주를 한 줄로 — 담당자가 흐름을 눈으로 확인한다.
 * 출석한 주는 **시간대 약자**로 적는다(저·전·후). 시간대가 바뀌는 흐름이 한눈에 보인다.
 */
export function weekDots(weeks: WeeklyAttendance[]): { label: string; tone: string; title: string }[] {
  const SLOT: Record<string, string> = { evening: "저녁", morning: "오전", afternoon: "오후" };
  const SHORT: Record<string, string> = { evening: "저", morning: "전", afternoon: "후" };
  return [...weeks]
    .reverse()
    .map((w) => {
      const when = w.weeksAgo === 0 ? "이번 주" : `${w.weeksAgo}주 전`;
      const slot = w.slot ? ` ${SLOT[w.slot]}` : "";
      switch (w.mark) {
        case "present":
          return {
            label: w.slot ? SHORT[w.slot] : "출",
            tone: "bg-zion-600 text-white",
            title: `${when} 출석${slot}`,
          };
        case "makeupDone":
          return { label: "보", tone: "bg-zion-300 text-zion-900", title: `${when} 보강 완료` };
        case "makeupPending":
          return { label: "보", tone: "bg-gold-300 text-gold-700", title: `${when} 보강 예정(미이행)` };
        case "absent":
          return { label: "결", tone: "bg-zion-100 text-ink-soft", title: `${when} 결석` };
        default:
          return { label: "–", tone: "bg-white text-ink-soft border border-zion-100", title: `${when} 미입력` };
      }
    });
}
