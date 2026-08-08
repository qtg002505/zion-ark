/** "YYYY-MM-DD" → 요일 한 글자. UTC 파싱 시 시간대 어긋남을 피하려 y/m/d를 직접 넘긴다 */
export function weekdayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
}
