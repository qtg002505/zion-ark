/**
 * 날짜 기반 결정론적 선택 — **모두가 같은 날 같은 것을 본다** (지시문 §4-5).
 *
 * 무작위로 뽑으면 사람마다 다른 어록을 보게 되어 "오늘 어록 보셨어요?"가 성립하지 않는다.
 * 그래서 **경과일수 % 건수**로 고른다 — 같은 날이면 누가 언제 열어도 같은 값이 나오고,
 * 날이 바뀌면 다음 것으로 넘어간다.
 *
 * ⚠️ **한국 시각(UTC+9) 기준으로 날을 센다.** 기기 표준시가 무엇이든 같은 날을 가리켜야
 * 지파가 흩어져 있어도 같은 어록을 본다. 브라우저의 로컬 날짜를 쓰면 해외 체류자에게
 * 하루 어긋난다.
 *
 * ⚠️ 지시문은 서버가 계산해 내려주기를 요구하지만 이 프로토타입에는 서버가 없다.
 * 계산식이 같으므로 결과는 같다 — 연동 시 이 함수를 서버 값으로 바꾼다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 1970-01-01(KST)부터 오늘까지의 일수 */
export function kstDayNumber(now: Date = new Date()): number {
  return Math.floor((now.getTime() + KST_OFFSET_MS) / DAY_MS);
}

/** 오늘 날짜 (KST) — "2026-08-10" */
export function kstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 목록에서 오늘 것을 고른다. 같은 날이면 언제 불러도 같은 항목이 나온다.
 * `salt`는 한 화면에 여러 갈래(어록·성구)를 둘 때 서로 다른 항목이 나오게 하는 값이다.
 */
export function pickOfDay<T>(items: T[], now: Date = new Date(), salt = 0): T | null {
  if (items.length === 0) return null;
  const idx = (((kstDayNumber(now) + salt) % items.length) + items.length) % items.length;
  return items[idx];
}
