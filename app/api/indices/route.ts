import { NextResponse } from "next/server";
import { mget, errJson, baseUrl } from "@/lib/server/massive";
import { classifyFeed, toMs } from "@/lib/quality";
export const dynamic = "force-dynamic";
// المؤشرات الفعلية (SPX وغيرها) تتطلب اشتراك Indices في Massive. بدونه يرجع AUTH وتعرض الواجهة السبب.
const IDX = ["I:SPX", "I:NDX", "I:DJI", "I:RUT", "I:VIX"];
export async function GET() {
  const r = await mget(`${baseUrl()}/v3/snapshot/indices?ticker.any_of=${IDX.join(",")}`, 10000);
  if (!r.ok) return errJson(r);
  const now = Date.now();
  const indices = (r.json.results ?? []).filter((x: any) => !x.error).map((x: any) => {
    const ts = toMs(x.last_updated);
    return { ticker: x.ticker, value: typeof x.value === "number" ? x.value : null, chg: x.session?.change ?? null, pct: x.session?.change_percent ?? null, ts, ...classifyFeed(x.timeframe, ts, now) };
  });
  return NextResponse.json({ indices, fetchedAt: now });
}
