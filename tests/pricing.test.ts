import test from "node:test";
import assert from "node:assert/strict";
import { bs } from "../lib/pricing.ts";
test("Black-Scholes مقابل قيم مرجعية معروفة", () => {
  assert.ok(Math.abs(bs("call", 100, 100, 1, 0.05, 0, 0.2) - 10.4506) < 1e-3);
  assert.ok(Math.abs(bs("put", 100, 100, 1, 0.05, 0, 0.2) - 5.5735) < 1e-3);
});
test("Put-Call Parity وحالات الحدود", () => {
  const [S, K, T, r, q, v] = [693, 700, 0.1, 0.04, 0.005, 0.18];
  const diff = bs("call", S, K, T, r, q, v) - bs("put", S, K, T, r, q, v);
  assert.ok(Math.abs(diff - (S * Math.exp(-q * T) - K * Math.exp(-r * T))) < 1e-4);
  assert.equal(bs("call", 110, 100, 0, 0.04, 0, 0.2), 10); assert.equal(bs("put", 90, 100, 0, 0.04, 0, 0.2), 10);
});
