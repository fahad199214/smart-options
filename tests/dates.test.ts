import test from "node:test";
import assert from "node:assert/strict";
import { toLocalISO, nextFriday, expiryCloseMs, isMarketOpen } from "../lib/dates.ts";
test("التاريخ المحلي لا يتأثر بـ UTC (جرّب TZ=Asia/Riyadh و America/Los_Angeles)", () => {
  assert.equal(toLocalISO(new Date(2026, 10, 6, 0, 30)), "2026-11-06");
  assert.equal(toLocalISO(new Date(2026, 10, 6, 23, 30)), "2026-11-06");
  assert.equal(nextFriday(new Date(2026, 10, 5, 23, 30)), "2026-11-06"); // الخميس
  assert.equal(nextFriday(new Date(2026, 10, 6, 1, 0)), "2026-11-06");   // الجمعة نفسها
  assert.equal(nextFriday(new Date(2026, 10, 7, 12, 0)), "2026-11-13");  // السبت
});
test("إغلاق السوق 16:00 ET مع التوقيت الصيفي والشتوي", () => {
  assert.equal(expiryCloseMs("2026-11-06"), Date.UTC(2026, 10, 6, 21, 0, 0)); // EST
  assert.equal(expiryCloseMs("2026-07-10"), Date.UTC(2026, 6, 10, 20, 0, 0)); // EDT
});
test("ساعات السوق", () => {
  assert.equal(isMarketOpen(Date.UTC(2026, 10, 5, 15, 0)), true);   // الخميس 10:00 ET
  assert.equal(isMarketOpen(Date.UTC(2026, 10, 5, 14, 0)), false);  // 9:00 ET
  assert.equal(isMarketOpen(Date.UTC(2026, 10, 5, 21, 0)), false);  // 16:00 ET
  assert.equal(isMarketOpen(Date.UTC(2026, 10, 7, 16, 0)), false);  // السبت
});
