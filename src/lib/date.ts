// 日付・日時は日本時間（Asia/Tokyo）で統一して扱う。
// 注意: DB に格納された日時（createdAt 等）の値は変更しない。表示・判定のみ JST で行う。

const JST = 'Asia/Tokyo';

/** 今日(＝offsetDays 日後)の日付を JST の 'YYYY-MM-DD' で返す。期限超過・本日判定の比較に使う。 */
export function jstDateStr(offsetDays = 0): string {
  const ms = Date.now() + offsetDays * 86400000;
  // en-CA ロケールは 'YYYY-MM-DD' 形式
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: JST });
}

/** 今日の JST 日付 'YYYY-MM-DD'。 */
export const jstToday = (): string => jstDateStr(0);

/** 期限超過か：完了予定日('YYYY-MM-DD')の 15:00(JST) を現在が過ぎていれば true。 */
export function isOverdueDue(dueStr?: string | null): boolean {
  if (!dueStr) return false;
  return Date.now() >= new Date(`${dueStr}T15:00:00+09:00`).getTime();
}

/** ISO 日時を JST の絶対時刻(ms)に。期間集計の境界に使う（JST 真夜中など）。 */
export function jstStartOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00+09:00`).getTime();
}

export type Period = 'today' | 'week' | 'month' | 'year';

/** 期間（本日/今週[月曜始まり]/今月/今年）の開始時刻(ms・JST)。完了集計の絞り込みに使う。 */
export function jstPeriodStartMs(period: Period): number {
  const today = jstToday();
  const [y, m] = today.split('-').map(Number);
  const startToday = jstStartOfDayMs(today);
  if (period === 'today') return startToday;
  if (period === 'week') {
    const dow = (new Date(`${today}T12:00:00+09:00`).getUTCDay() + 6) % 7; // 月曜=0
    return startToday - dow * 86400000;
  }
  if (period === 'month') return jstStartOfDayMs(`${y}-${String(m).padStart(2, '0')}-01`);
  return jstStartOfDayMs(`${y}-01-01`); // year
}

/** 日時(Date|ISO文字列)を JST で表示用に整形（既定: 'YYYY/MM/DD HH:mm'）。 */
export function formatJst(
  value: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
): string {
  return new Date(value).toLocaleString('ja-JP', { timeZone: JST, ...opts });
}
