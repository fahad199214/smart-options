import test from "node:test";
import assert from "node:assert/strict";
import { classifyFeed, checkQuote, toMs, isBlocking } from "../lib/quality.ts";
const OPEN = Date.UTC(2026, 10, 5, 15, 0), CLOSED = Date.UTC(2026, 10, 7, 16, 0);
test("تمييز نوع التغذية", () => {
  assert.deepEqual(classifyFeed("REAL-TIME", null, OPEN), { feed: "realtime", inferred: false });
  assert.deepEqual(classifyFeed("DELAYED", null, OPEN), { feed: "delayed", inferred: false });
  assert.deepEqual(classifyFeed("DELAYED", null, CLOSED), { feed: "eod", inferred: false });
  assert.deepEqual(classifyFeed(undefined, null, OPEN), { feed: "unknown", inferred: true });
  assert.equal(classifyFeed(undefined, OPEN - 15 * 60e3, OPEN).feed, "delayed");
  assert.equal(classifyFeed(undefined, OPEN - 60 * 60e3, OPEN).feed, "unknown"); // لا نصفه لحظياً
});
test("الطوابع الزمنية", () => {
  assert.equal(toMs(1_700_000_000_000_000_000), 1_700_000_000_000);
  assert.equal(toMs(1_700_000_000_000), 1_700_000_000_000); assert.equal(toMs(1_700_000_000), 1_700_000_000_000);
  assert.equal(toMs(0), null); assert.equal(toMs("x"), null);
});
test("فحص Bid/Ask والـStale", () => {
  assert.deepEqual(checkQuote(1, 1.1, OPEN - 5e3, "realtime", OPEN), []);
  assert.deepEqual(checkQuote(null, 1, null, "realtime", OPEN), ["missing"]);
  assert.ok(checkQuote(2, 1, null, "realtime", OPEN).includes("crossed"));
  assert.ok(checkQuote(0, 0.05, null, "realtime", OPEN).includes("no_bid"));
  assert.ok(checkQuote(1, 2, null, "realtime", OPEN).includes("wide"));
  assert.ok(checkQuote(1, 1.1, OPEN - 120e3, "realtime", OPEN).includes("stale"));
  assert.ok(!checkQuote(1, 1.1, OPEN - 120e3, "delayed", OPEN).includes("stale"));
  assert.ok(!checkQuote(1, 1.1, 1, "eod", OPEN).includes("stale"));
  assert.equal(isBlocking(["wide"]), false); assert.equal(isBlocking(["crossed"]), true);
});
