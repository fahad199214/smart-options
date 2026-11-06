import test from "node:test";
import assert from "node:assert/strict";
import { sma, smaSeries, rsi, pctChange, sentiment } from "../lib/indicators.ts";
const near = (a: number | null, b: number, e = 1e-6) => assert.ok(a != null && Math.abs(a - b) < e, `${a} != ${b}`);
test("SMA", () => {
  near(sma([1, 2, 3, 4, 5], 5), 3); near(sma([1, 2, 3, 4, 5], 2), 4.5); assert.equal(sma([1, 2], 3), null);
  assert.deepEqual(smaSeries([1, 2, 3, 4], 2), [null, 1.5, 2.5, 3.5]);
});
test("RSI: حالات معروفة", () => {
  const up = Array.from({ length: 30 }, (_, i) => 100 + i); assert.equal(rsi(up), 100);
  const down = Array.from({ length: 30 }, (_, i) => 100 - i); assert.equal(rsi(down), 0);
  assert.equal(rsi(Array(30).fill(5)), 50); assert.equal(rsi([1, 2, 3]), null);
  // تسلسل Wilder الكلاسيكي (القيمة المرجعية ≈ 70.53 لأول RSI)
  const w = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28];
  near(rsi(w), 70.46, 0.3);
});
test("نسبة التغير", () => { near(pctChange([100, 110], 1), 10); assert.equal(pctChange([100], 1), null); });
test("المعنويات", () => {
  const up = Array.from({ length: 260 }, (_, i) => 100 + i + (i % 3 === 0 ? -2 : 0));
  const s = sentiment(up); assert.equal(s.insufficient, false); assert.equal(s.rules.length, 5);
  assert.ok(s.bull >= 4); assert.equal(s.label, "bull");
  const dn = sentiment(up.slice().reverse()); assert.equal(dn.label, "bear");
  const few = sentiment([1, 2, 3]); assert.equal(few.insufficient, true); assert.equal(few.label, "neutral");
  // RSI متطرف يُحسب محايداً لا صاعداً
  const steady = sentiment(Array.from({ length: 260 }, (_, i) => 100 + i));
  assert.equal(steady.rules.find((r) => r.id === "rsi")!.vote, "neutral");
});
