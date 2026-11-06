import { NextResponse } from "next/server";
import { mget, errJson, baseUrl } from "@/lib/server/massive";
export const dynamic = "force-dynamic";
const ALLOWED = new Set(["I:SPX", "I:NDX", "I:VIX", "SPY", "QQQ", "DIA", "IWM", "NVDA", "AAPL", "TSLA", "MSFT", "AMZN"]);
const RANGE_DAYS: Record<string, number> = { "3M": 92, "6M": 183, "1Y": 366, "2Y": 731 };
const iso = (d: Date) => d.toISOString().slice(0, 10); // تواريخ UTC مقصودة هنا: نطاق طلب البيانات وليس عرضاً للمستخدم
export async function GET(req: Request) {
  const u = new URL(req.url);
  const sym = (u.searchParams.get("symbol") || "").toUpperCase();
  const range = u.searchParams.get("range") || "1Y";
  if (!ALLOWED.has(sym) || !RANGE_DAYS[range]) return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  // نطلب 300 يوم إضافي على الأقل حتى يتوفر SMA200 من أول يوم معروض
  const days = Math.max(RANGE_DAYS[range], 0) + 300;
  const to = new Date(), from = new Date(to.getTime() - days * 86400000);
  const r = await mget(`${baseUrl()}/v2/aggs/ticker/${encodeURIComponent(sym)}/range/1/day/${iso(from)}/${iso(to)}?adjusted=true&sort=asc&limit=5000`, 10 * 60000);
  if (!r.ok) return errJson(r);
  const bars = (r.json.results ?? [])
    .filter((b: any) => typeof b.t === "number" && typeof b.c === "number")
    .map((b: any) => ({ t: b.t, o: b.o ?? null, h: b.h ?? null, l: b.l ?? null, c: b.c, v: b.v ?? null }));
  return NextResponse.json({ symbol: sym, range, displayDays: RANGE_DAYS[range], bars, fetchedAt: Date.now() });
}
