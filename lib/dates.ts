// تواريخ بالتقويم المحلي (لا toISOString لأنه يحوّل إلى UTC ويُنتج يوماً خاطئاً في الرياض).
export const toLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function nextFriday(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return toLocalISO(d);
}
const NY = "America/New_York";
function nyOffsetMin(ms: number): number {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: NY, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Math.round((ms - Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"))) / 60000);
}
// لحظة إغلاق السوق 16:00 بتوقيت نيويورك (مع التوقيت الصيفي) لتاريخ YYYY-MM-DD، بالمللي ثانية UTC.
export function expiryCloseMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 16, 0, 0);
  const o1 = nyOffsetMin(guess + 5 * 3600000);
  return guess + nyOffsetMin(guess + o1 * 60000) * 60000;
}
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
// جلسة عادية 9:30–16:00 ET من الاثنين للجمعة. العطل الرسمية غير مضمّنة.
export function isMarketOpen(ms: number): boolean {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: NY, hourCycle: "h23", weekday: "short", hour: "numeric", minute: "numeric" }).formatToParts(new Date(ms));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  const dow = DOW[g("weekday")], min = Number(g("hour")) * 60 + Number(g("minute"));
  return dow >= 1 && dow <= 5 && min >= 570 && min < 960;
}
