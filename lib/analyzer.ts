import { bs } from "./pricing.ts";
export type Leg = { type: "call" | "put"; strike: number; price: number; iv?: number | null; multiplier?: number };
export type Scenario = { price: number; hoursToExpiry: number; hoursFromNow: number; rate: number };
export type PL = { perContract: number; total: number };
export type Ok = { ok: true; multiplier: number; premium: number; contractCost: number; breakeven: number; maxLossPerContract: number; maxProfitPerContract: number | null; rr: number | null; riskBudget: number; contracts: number; totalCost: number; atExpiry: PL | null; before: PL | null };
export type Fail = { ok: false; error: "capital" | "risk" | "price" | "multiplier" | "spread" | "debit" | "debit_ge_width" };
export const RISK_MAX = 10;
const rnd = (x: number) => Math.round(x * 1e6) / 1e6;
export function validateInputs(capital: number, riskPct: number): "capital" | "risk" | null {
  if (!Number.isFinite(capital) || capital <= 0) return "capital";
  if (!Number.isFinite(riskPct) || riskPct <= 0 || riskPct > RISK_MAX) return "risk";
  return null;
}
const intr = (t: Leg["type"], k: number, s: number) => (t === "call" ? Math.max(s - k, 0) : Math.max(k - s, 0));
// long يُشترى بسعر Ask، وshort يُباع بسعر Bid (Vertical Spread بصافي Debit فقط).
export function analyze(long: Leg, short: Leg | null, capital: number, riskPct: number, sc: Scenario | null): Ok | Fail {
  const bad = validateInputs(capital, riskPct);
  if (bad) return { ok: false, error: bad };
  const m = long.multiplier ?? 100;
  if (!Number.isInteger(m) || m <= 0 || (short && (short.multiplier ?? 100) !== m)) return { ok: false, error: "multiplier" };
  if (!(Number.isFinite(long.price) && long.price > 0) || (short && !(Number.isFinite(short.price) && short.price >= 0))) return { ok: false, error: "price" };
  const call = long.type === "call";
  let width = 0;
  if (short) {
    width = Math.abs(short.strike - long.strike);
    if (short.type !== long.type || !(call ? short.strike > long.strike : short.strike < long.strike)) return { ok: false, error: "spread" };
  }
  const premium = rnd(long.price - (short ? short.price : 0));
  if (!(premium > 0)) return { ok: false, error: "debit" };
  if (short && premium >= width) return { ok: false, error: "debit_ge_width" };
  const contractCost = rnd(premium * m);
  const maxProfitPerContract = short ? rnd((width - premium) * m) : call ? null : rnd((long.strike - premium) * m);
  const riskBudget = (capital * riskPct) / 100;
  const contracts = Math.floor(rnd(riskBudget / contractCost));
  const pl = (perShare: number): PL => ({ perContract: rnd(perShare * m), total: rnd(perShare * m * contracts) });
  let atExpiry: PL | null = null, before: PL | null = null;
  if (sc && Number.isFinite(sc.price) && sc.price > 0) {
    atExpiry = pl(intr(long.type, long.strike, sc.price) - (short ? intr(short.type, short.strike, sc.price) : 0) - premium);
    const ivs = [long.iv, short ? short.iv : 1];
    if (ivs.every((v) => typeof v === "number" && v > 0) && sc.hoursToExpiry > 0 && Number.isFinite(sc.rate)) {
      const T = Math.max(sc.hoursToExpiry - Math.max(sc.hoursFromNow, 0), 0) / 8760;
      const v = bs(long.type, sc.price, long.strike, T, sc.rate, 0, long.iv as number) - (short ? bs(short.type, sc.price, short.strike, T, sc.rate, 0, short.iv as number) : 0);
      before = pl(v - premium);
    }
  }
  return { ok: true, multiplier: m, premium, contractCost, breakeven: call ? long.strike + premium : long.strike - premium, maxLossPerContract: contractCost, maxProfitPerContract, rr: maxProfitPerContract == null ? null : rnd(maxProfitPerContract / contractCost), riskBudget, contracts, totalCost: rnd(contracts * contractCost), atExpiry, before };
}
