import test from "node:test";
import assert from "node:assert/strict";
import { analyze, validateInputs, type Ok } from "../lib/analyzer.ts";
const near = (a: number | null | undefined, b: number, e = 1e-6) => assert.ok(a != null && Math.abs(a - b) < e, `${a} != ${b}`);
const ok = (r: ReturnType<typeof analyze>): Ok => { assert.equal(r.ok, true, JSON.stringify(r)); return r as Ok; };

test("Long Call: premium/تكلفة العقد/BE/Max Loss/Max Profit", () => {
  const r = ok(analyze({ type: "call", strike: 693, price: 5.4 }, null, 100000, 1, { price: 710, hoursToExpiry: 0, hoursFromNow: 0, rate: 0.04 }));
  near(r.premium, 5.4); near(r.contractCost, 540); near(r.breakeven, 698.4); near(r.maxLossPerContract, 540);
  assert.equal(r.maxProfitPerContract, null); assert.equal(r.rr, null);
  assert.equal(r.contracts, 1); near(r.totalCost, 540);
  near(r.atExpiry!.perContract, 1160); // (710-693-5.40)*100
  assert.equal(r.before, null);
});
test("Long Put", () => {
  const r = ok(analyze({ type: "put", strike: 691, price: 4.68 }, null, 100000, 1, { price: 680, hoursToExpiry: 0, hoursFromNow: 0, rate: 0.04 }));
  near(r.breakeven, 686.32); near(r.maxLossPerContract, 468); near(r.maxProfitPerContract, 68632);
  near(r.atExpiry!.perContract, 632); assert.equal(r.contracts, 2);
});
test("Bull Call Spread", () => {
  const sp = (s: number) => analyze({ type: "call", strike: 694, price: 5.45 }, { type: "call", strike: 699, price: 3.03 }, 50000, 1, { price: s, hoursToExpiry: 0, hoursFromNow: 0, rate: 0.04 });
  const r = ok(sp(700));
  near(r.premium, 2.42); near(r.breakeven, 696.42); near(r.maxLossPerContract, 242); near(r.maxProfitPerContract, 258); near(r.rr, 258 / 242, 1e-4);
  assert.equal(r.contracts, 2); near(r.totalCost, 484); near(r.atExpiry!.total, 516);
  near(ok(sp(690)).atExpiry!.perContract, -242); near(ok(sp(696.42)).atExpiry!.perContract, 0);
});
test("Bear Put Spread", () => {
  const r = ok(analyze({ type: "put", strike: 693, price: 5.49 }, { type: "put", strike: 688, price: 3.55 }, 50000, 1, { price: 680, hoursToExpiry: 0, hoursFromNow: 0, rate: 0.04 }));
  near(r.premium, 1.94); near(r.breakeven, 691.06); near(r.maxLossPerContract, 194); near(r.maxProfitPerContract, 306);
  assert.equal(r.contracts, 2); near(r.atExpiry!.perContract, 306);
});
test("عدد العقود: الحد الحدّي والميزانية الصغيرة", () => {
  assert.equal(ok(analyze({ type: "call", strike: 693, price: 5.4 }, null, 54000, 1, null)).contracts, 1); // ميزانية 540 = تكلفة 540 بالضبط
  const small = ok(analyze({ type: "call", strike: 693, price: 5.4 }, null, 1000, 1, null));
  assert.equal(small.contracts, 0); near(small.riskBudget, 10); near(small.totalCost, 0);
});
test("التحقق من Vertical Spread", () => {
  const L = { type: "call" as const, strike: 694, price: 5.45 };
  assert.deepEqual(analyze(L, { type: "call", strike: 699, price: 0.3 }, 1000, 1, null), { ok: false, error: "debit_ge_width" }); // Debit 5.15 > العرض 5
  assert.deepEqual(analyze(L, { type: "call", strike: 699, price: 0.45 }, 1000, 1, null), { ok: false, error: "debit_ge_width" }); // Debit = العرض
  assert.deepEqual(analyze(L, { type: "call", strike: 690, price: 3 }, 1000, 1, null), { ok: false, error: "spread" });
  assert.deepEqual(analyze(L, { type: "put", strike: 699, price: 3 }, 1000, 1, null), { ok: false, error: "spread" });
  assert.deepEqual(analyze(L, { type: "call", strike: 699, price: 6 }, 1000, 1, null), { ok: false, error: "debit" }); // Credit غير مدعوم
  assert.deepEqual(analyze({ type: "put", strike: 693, price: 5 }, { type: "put", strike: 698, price: 3 }, 1000, 1, null), { ok: false, error: "spread" });
});
test("المضاعف", () => {
  near(ok(analyze({ type: "call", strike: 50, price: 2, multiplier: 10 }, null, 10000, 2, null)).contractCost, 20);
  assert.deepEqual(analyze({ type: "call", strike: 50, price: 2, multiplier: 0 }, null, 1000, 1, null), { ok: false, error: "multiplier" });
  assert.deepEqual(analyze({ type: "call", strike: 50, price: 2, multiplier: 100 }, { type: "call", strike: 55, price: 1, multiplier: 10 }, 1000, 1, null), { ok: false, error: "multiplier" });
});
test("التحقق من المدخلات", () => {
  assert.equal(validateInputs(1000, 1), null); assert.equal(validateInputs(1000, 2), null);
  assert.equal(validateInputs(0, 1), "capital"); assert.equal(validateInputs(NaN, 1), "capital"); assert.equal(validateInputs(-5, 1), "capital");
  assert.equal(validateInputs(1000, 0), "risk"); assert.equal(validateInputs(1000, 50), "risk"); assert.equal(validateInputs(1000, NaN), "risk");
  assert.deepEqual(analyze({ type: "call", strike: 1, price: 1 }, null, 1000, 50, null), { ok: false, error: "risk" });
  assert.deepEqual(analyze({ type: "call", strike: 1, price: NaN }, null, 1000, 1, null), { ok: false, error: "price" });
});
test("P/L عند الانتهاء منفصل عن التقدير قبل الانتهاء", () => {
  const L = { type: "call" as const, strike: 100, price: 5, iv: 0.2 };
  const r = ok(analyze(L, null, 100000, 1, { price: 100, hoursToExpiry: 720, hoursFromNow: 0, rate: 0.04 }));
  near(r.atExpiry!.perContract, -500);
  assert.ok(r.before!.perContract > r.atExpiry!.perContract, "التقدير قبل الانتهاء يشمل القيمة الزمنية");
  assert.ok(r.before!.perContract < 0 && r.before!.perContract > -500);
  const late = ok(analyze(L, null, 100000, 1, { price: 100, hoursToExpiry: 720, hoursFromNow: 720, rate: 0.04 }));
  near(late.before!.perContract, late.atExpiry!.perContract); // لا وقت متبقٍ = قيمة جوهرية
  const noIv = ok(analyze({ ...L, iv: null }, null, 100000, 1, { price: 100, hoursToExpiry: 720, hoursFromNow: 0, rate: 0.04 }));
  assert.equal(noIv.before, null); // بدون IV لا تقدير
});
