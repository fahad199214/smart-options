// مؤشرات فنية بسيطة وقابلة للتحقق. كل دالة تُرجع null إذا لم تكفِ البيانات.
export function sma(xs: number[], n: number): number | null {
  if (!Number.isInteger(n) || n <= 0 || xs.length < n) return null;
  let s = 0; for (let i = xs.length - n; i < xs.length; i++) s += xs[i];
  return s / n;
}
export function smaSeries(xs: number[], n: number): (number | null)[] {
  const out: (number | null)[] = []; let s = 0;
  for (let i = 0; i < xs.length; i++) { s += xs[i]; if (i >= n) s -= xs[i - n]; out.push(i >= n - 1 ? s / n : null); }
  return out;
}
// RSI بطريقة Wilder.
export function rsi(xs: number[], n = 14): number | null {
  if (xs.length < n + 1) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = xs[i] - xs[i - 1]; if (d > 0) g += d; else l -= d; }
  g /= n; l /= n;
  for (let i = n + 1; i < xs.length; i++) { const d = xs[i] - xs[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
  if (l === 0) return g === 0 ? 50 : 100;
  return 100 - 100 / (1 + g / l);
}
export function pctChange(xs: number[], n: number): number | null {
  if (xs.length < n + 1 || xs[xs.length - 1 - n] === 0) return null;
  return (xs[xs.length - 1] / xs[xs.length - 1 - n] - 1) * 100;
}
export type Vote = "bull" | "bear" | "neutral";
export type Rule = { id: "above50" | "above200" | "cross" | "rsi" | "ret20"; vote: Vote; value: number | null; ref: number | null };
export type Sentiment = { label: Vote; bull: number; bear: number; neutral: number; rules: Rule[]; insufficient: boolean };
// ملخص فني من قواعد ثابتة. ليس توقعاً ولا توصية.
export function sentiment(closes: number[]): Sentiment {
  const last = closes.length ? closes[closes.length - 1] : null;
  const s50 = sma(closes, 50), s200 = sma(closes, 200), r = rsi(closes, 14), ret = pctChange(closes, 20);
  const rules: Rule[] = [];
  if (last != null && s50 != null) rules.push({ id: "above50", vote: last > s50 ? "bull" : "bear", value: last, ref: s50 });
  if (last != null && s200 != null) rules.push({ id: "above200", vote: last > s200 ? "bull" : "bear", value: last, ref: s200 });
  if (s50 != null && s200 != null) rules.push({ id: "cross", vote: s50 > s200 ? "bull" : "bear", value: s50, ref: s200 });
  if (r != null) rules.push({ id: "rsi", vote: r >= 70 || r <= 30 ? "neutral" : r >= 50 ? "bull" : "bear", value: r, ref: null });
  if (ret != null) rules.push({ id: "ret20", vote: ret > 0 ? "bull" : ret < 0 ? "bear" : "neutral", value: ret, ref: null });
  const c = (v: Vote) => rules.filter((x) => x.vote === v).length;
  const bull = c("bull"), bear = c("bear"), neutral = c("neutral");
  const insufficient = rules.length < 5;
  const label: Vote = insufficient ? "neutral" : bull >= 4 ? "bull" : bear >= 4 ? "bear" : "neutral";
  return { label, bull, bear, neutral, rules, insufficient };
}
