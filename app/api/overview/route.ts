import { NextResponse } from "next/server";
import { mget, errJson, baseUrl } from "@/lib/server/massive";
import { classifyFeed, toMs } from "@/lib/quality";
export const dynamic = "force-dynamic";
const SYMS = ["SPY", "QQQ", "DIA", "IWM", "NVDA", "AAPL", "TSLA", "MSFT", "AMZN"];
export async function GET() {
  const r = await mget(`${baseUrl()}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${SYMS.join(",")}`, 10000);
  if (!r.ok) return errJson(r);
  const now = Date.now();
  const quotes = (r.json.tickers ?? []).map((t: any) => {
    const ts = toMs(t.lastTrade?.t) ?? toMs(t.updated);
    return { ticker: t.ticker, price: t.lastTrade?.p ?? t.day?.c ?? null, chg: t.todaysChange ?? null, pct: t.todaysChangePerc ?? null, ts, ...classifyFeed(t.timeframe, ts, now) };
  });
  return NextResponse.json({ quotes, fetchedAt: now });
}
