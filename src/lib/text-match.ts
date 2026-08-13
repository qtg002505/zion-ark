/**
 * 검색 낱말 맞추기 — **띄어쓰기를 무시한다** (2026-08-13 리드 지시).
 *
 * 「천국 비밀」로 찾든 「천국비밀」로 찾든 같은 것이 나와야 한다. 사람이 적은 자료와
 * 사람이 치는 검색어의 띄어쓰기가 같을 이유가 없다 — 교안·어록 원문도 표기가 제각각이다.
 *
 * 방법은 단순하다: **양쪽에서 공백을 걷어내고 견준다.** 형태소 분석기를 쓰지 않는 이 저장소의
 * 결정(번들 수백 KB·현장 휴대전화)과 같은 결에 있는 선택이다.
 *
 * ⚠️ **자리(index)를 이 값으로 재지 않는다.** 공백을 지운 문자열의 위치는 원문 위치와
 * 어긋나므로, 스니펫을 자를 때는 원문에서 다시 찾는다(`looseIndexOf` 참고).
 */

/** 소문자로 낮추고 공백을 모두 걷어낸다 */
export function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

/** 띄어쓰기를 무시하고 포함되는지 */
export function looseIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return normalizeForSearch(haystack).includes(normalizeForSearch(needle));
}

/**
 * 원문에서 그 낱말이 시작하는 자리 — 없으면 -1.
 *
 * 먼저 원문 그대로 찾고, 없으면 **공백을 건너뛰며** 한 글자씩 맞춰 본다.
 * (「천국비밀」로 찾을 때 원문 「천국 비밀」의 시작 자리를 돌려주기 위한 것이다.)
 */
export function looseIndexOf(text: string, needle: string): number {
  const low = text.toLowerCase();
  const target = needle.toLowerCase();
  const direct = low.indexOf(target);
  if (direct !== -1) return direct;

  const stripped = normalizeForSearch(needle);
  if (!stripped) return -1;

  let ti = 0; // 찾는 글자 위치
  let start = -1;
  for (let i = 0; i < low.length; i++) {
    const ch = low[i];
    if (/\s/.test(ch)) continue; // 원문의 공백은 건너뛴다
    if (ch === stripped[ti]) {
      if (ti === 0) start = i;
      ti++;
      if (ti === stripped.length) return start;
    } else {
      // 어긋나면 처음부터 — 다만 지금 글자가 첫 글자면 거기서 다시 시작한다
      ti = ch === stripped[0] ? 1 : 0;
      start = ti === 1 ? i : -1;
    }
  }
  return -1;
}

/** 띄어쓰기를 무시하고 몇 번 나오는지 */
export function looseCount(text: string, needle: string): number {
  const n = normalizeForSearch(needle);
  if (!n) return 0;
  return normalizeForSearch(text).split(n).length - 1;
}
