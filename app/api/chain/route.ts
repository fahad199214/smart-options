import { NextResponse } from "next/server";
import { mget, errJson, baseUrl } from "@/lib/server/massive";
import { checkQuote, classifyFeed, toMs } from "@/lib/quality";
export const dynamic = "force-dynamic";
const MAX_PAGES = 8;
const n = (x: any) => (typeof x === "number" ? x : null);
const STD = /^O:[A-Z]{1,5}\d{6}[CP]\d{8}$/;
export async function GET(req: Request) {
  const u = new URL(req.url);
  const symbol = (u.searchParams.get("symbol") || "").toUpperCase(), exp = u.searchParams.get("expiration") || "";
  if (!/^[A-Z.]{1,6}$/.test(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(exp)) return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  let url: string | null = `${baseUrl()}/v3/snapshot/options/${symbol}?expiration_date=${exp}&limit=250`;
  const rows = new Map<number, any>();
  let underlying: number | null = null, underlyingTs: number | null = null, tf: unknown, pages = 0, count = 0, stopped: string | null = null, asOf: number | null = null;
  while (url && pages < MAX_PAGES) {
    const r = await mget(url, 20000);
    if (!r.ok) { if (pages === 0) return errJson(r); stopped = r.code; break; }
    pages++;
    for (const c of r.json.results ?? []) {
      const k = c.details?.strike_price, t = c.details?.contract_type;
      if (typeof k !== "number" || (t !== "call" && t !== "put")) continue;
      count++;
      underlying = underlying ?? n(c.underlying_asset?.price);
      underlyingTs = underlyingTs ?? toMs(c.underlying_asset?.last_updated);
      tf = tf ?? c.last_quote?.timeframe;
      const ts = toMs(c.last_quote?.last_updated);
      if (ts != null && (asOf == null || ts > asOf)) asOf = ts;
      const spc = c.details?.shares_per_contract, sym = STD.test(String(c.details?.ticker ?? ""));
      const mult = typeof spc === "number" ? spc : sym ? 100 : null;
      const side = { bid: n(c.last_quote?.bid), ask: n(c.last_quote?.ask), delta: n(c.greeks?.delta), theta: n(c.greeks?.theta), iv: n(c.implied_volatility), oi: n(c.open_interest), vol: n(c.day?.volume), ts, flags: [] as string[], mult, std: mult === 100 && sym && !c.details?.additional_underlyings?.length };
      const row = rows.get(k) ?? { strike: k, call: null, put: null };
      row[t] = side; rows.set(k, row);
    }
    url = r.json.next_url ?? null;
  }
  const now = Date.now(), cf = classifyFeed(tf, asOf, now);
  for (const row of rows.values()) for (const s of [row.call, row.put]) if (s) s.flags = checkQuote(s.bid, s.ask, s.ts, cf.feed, now);
  const meta = { ...cf, asOf, underlyingTs, pages, count, complete: !url && !stopped, stopped, fetchedAt: now };
  return NextResponse.json({ underlying, rows: [...rows.values()].sort((a, b) => a.strike - b.strike), meta });
}
