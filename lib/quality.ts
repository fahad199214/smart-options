import { isMarketOpen } from "./dates.ts";
export type Feed = "realtime" | "delayed" | "eod" | "unknown";
export type QFlag = "missing" | "invalid" | "crossed" | "no_bid" | "wide" | "stale";
// يوحّد الطابع الزمني (ثوانٍ/مللي/ميكرو/نانو) إلى مللي ثانية.
export function toMs(t: unknown): number | null {
  if (typeof t !== "number" || !Number.isFinite(t) || t <= 0) return null;
  if (t > 1e17) return Math.round(t / 1e6);
  if (t > 1e14) return Math.round(t / 1e3);
  return t > 1e11 ? t : t * 1000;
}
export function classifyFeed(timeframe: unknown, ts: number | null, now: number): { feed: Feed; inferred: boolean } {
  const tf = typeof timeframe === "string" ? timeframe.toUpperCase() : "";
  if (tf.includes("REAL")) return { feed: "realtime", inferred: false };
  if (tf.includes("DELAY")) return { feed: isMarketOpen(now) ? "delayed" : "eod", inferred: false };
  if (ts == null) return { feed: "unknown", inferred: true };
  if (!isMarketOpen(now)) return { feed: "eod", inferred: true };
  const age = now - ts;
  if (age <= 120e3) return { feed: "realtime", inferred: true };
  return age >= 10 * 60e3 && age <= 25 * 60e3 ? { feed: "delayed", inferred: true } : { feed: "unknown", inferred: true };
}
export function checkQuote(bid: number | null, ask: number | null, ts: number | null, feed: Feed, now: number): QFlag[] {
  if (bid == null || ask == null) return ["missing"];
  const f: QFlag[] = [];
  if (!(ask > 0) || bid < 0) f.push("invalid");
  if (ask < bid) f.push("crossed");
  if (bid === 0) f.push("no_bid");
  const mid = (ask + bid) / 2;
  if (mid > 0 && (ask - bid) / mid > 0.5) f.push("wide");
  if (ts != null && feed !== "eod" && isMarketOpen(now) && now - ts > (feed === "realtime" ? 60e3 : 20 * 60e3)) f.push("stale");
  return f;
}
export const isBlocking = (f: string[]) => f.some((x) => x === "missing" || x === "invalid" || x === "crossed");
