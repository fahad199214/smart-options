"use client";
import { useEffect, useMemo, useState } from "react";
import { analyze, validateInputs, RISK_MAX, type Leg } from "@/lib/analyzer";
import { expiryCloseMs, nextFriday, toLocalISO } from "@/lib/dates";
import { Badge, errText, getJson, useLang, type ApiErr, type Feed } from "./lang";

type Side = { bid: number | null; ask: number | null; delta: number | null; theta: number | null; iv: number | null; oi: number | null; vol: number | null; ts: number | null; flags: string[]; mult: number | null; std: boolean };
type Row = { strike: number; call: Side | null; put: Side | null };
type Meta = { feed: Feed; inferred: boolean; asOf: number | null; underlyingTs: number | null; pages: number; count: number; complete: boolean; stopped: string | null; fetchedAt: number };
type Sel = { type: "call" | "put"; strike: number };
type Chain = { underlying: number | null; rows: Row[]; meta: Meta };
const QUICK = ["NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "QQQ", "SPY"];
const BLOCK = ["missing", "invalid", "crossed"];

const T = {
  ar: { filters: "الفلاتر", quick: "شركات سريعة", show: "العرض", both: "الكل", calls: "Call فقط", puts: "Put فقط", win: "عدد Strike حول السعر", minOi: "أدنى Open Interest", hideBad: "إخفاء الأسعار المعيبة", shown: "معروض {a} من {b} Strike", oi: "OI", vol: "Volume", none: "لا عقود تطابق الفلاتر.", title: "منصة تحليل السوق الأمريكي", overview: "نظرة على السوق (صناديق ETF تمثل المؤشرات)", analyzer: "محلل الخيارات", symbol: "الرمز", exp: "تاريخ الانتهاء", load: "تحميل السلسلة", buy: "شراء", sell: "بيع", clear: "مسح الاختيار", capital: "رأس المال $", risk: "المخاطرة % (الحد 10)", rate: "سعر الفائدة % (تقديري)", hours: "ساعات من الآن للسيناريو", target: "سعر السيناريو", premium: "Premium (للسهم)", cost: "تكلفة العقد الفعلية", be: "نقطة التعادل", ml: "أقصى خسارة / عقد", mp: "أقصى ربح / عقد", rr: "ربح/خسارة", n: "عدد العقود", tc: "إجمالي التكلفة والمخاطرة", budget: "ميزانية المخاطرة", plx: "P/L عند الانتهاء (قيمة جوهرية)", ple: "P/L تقديري قبل الانتهاء", estNote: "تقدير بنموذج Black-Scholes باستخدام IV لكل عقد والوقت المتبقي وسعر الفائدة، دون الممارسة المبكرة ولا فروق التسعير. ليس سعراً مضموناً.", unl: "غير محدود", pick: "اضغط سعر Ask لعقد الشراء، ثم (اختيارياً) سعر Bid لعقد البيع لتكوين Spread.", zero: "الميزانية لا تكفي عقداً واحداً.", perC: "للعقد", tot: "الإجمالي", greeks: "Delta / Theta / IV", note: "حسابات رياضية وليست توصية.", src: "المصدر: Massive.", asof: "آخر تحديث من المصدر", fetched: "وقت الجلب", noTs: "غير متوفر", inf: "(مستنتج من عمر السعر)", feed: { realtime: "لحظي", delayed: "متأخر", eod: "إغلاق/نهاية اليوم", unknown: "غير معروف" }, nokey: "مفتاح البيانات غير مضاف. أضف MASSIVE_API_KEY في .env.local. لا تُعرض بيانات بديلة.", auth: "رفض المصدر المفتاح أو لا تشمل خطتك هذه البيانات.", rateLimit: "تجاوزت حد الطلبات. أعد المحاولة بعد", sec: "ثانية.", timeout: "انتهت مهلة الاتصال بالمصدر.", net: "تعذر الاتصال بالمصدر.", err: "خطأ من المصدر.", bad: "مدخلات غير صالحة.", past: "تاريخ الانتهاء في الماضي.", partial: "تحذير: لم تُحمّل كل العقود (تم تحميل {n} صفحات). قد تكون استراتيجيتك ناقصة.", partialStop: "توقف التحميل بسبب:", spread: "Spread غير صحيح: نفس النوع وStrike أبعد.", debit: "صافي التكلفة غير صالح.", debw: "صافي Debit أكبر من أو يساوي عرض السبريد، لا ربح ممكن.", mult: "مضاعف العقد غير صالح أو مختلف بين الطرفين.", price: "الأسعار غير صالحة.", capE: "رأس المال يجب أن يكون رقماً أكبر من صفر.", riskE: "المخاطرة يجب أن تكون بين 0 و10%.", riskH: "تنبيه: مخاطرة أعلى من 2% للصفقة.", quote: "سعر العقد المختار غير صالح (Bid/Ask).", nonstd: "عقد غير قياسي (مضاعف ≠ 100) ولا يدعمه التطبيق.", expired: "انتهى العقد.", flags: { missing: "بيانات ناقصة", invalid: "سعر غير صالح", crossed: "Bid أعلى من Ask", no_bid: "بدون Bid", wide: "فارق واسع", stale: "سعر قديم" } },
  en: { filters: "Filters", quick: "Quick tickers", show: "Show", both: "Both", calls: "Calls only", puts: "Puts only", win: "Strikes around price", minOi: "Min open interest", hideBad: "Hide flagged quotes", shown: "Showing {a} of {b} strikes", oi: "OI", vol: "Volume", none: "No contracts match the filters.", title: "US Market Intelligence Terminal", overview: "Market overview (ETFs tracking the indices)", analyzer: "Options analyzer", symbol: "Symbol", exp: "Expiration", load: "Load chain", buy: "Buy", sell: "Sell", clear: "Clear selection", capital: "Capital $", risk: "Risk % (max 10)", rate: "Risk-free rate % (estimate)", hours: "Hours from now for scenario", target: "Scenario price", premium: "Premium (per share)", cost: "Actual cost per contract", be: "Breakeven", ml: "Max loss / contract", mp: "Max profit / contract", rr: "Reward / risk", n: "Contracts", tc: "Total cost & risk", budget: "Risk budget", plx: "P/L at expiration (intrinsic)", ple: "Estimated P/L before expiration", estNote: "Estimate via Black-Scholes using each leg's IV, time left and the rate; ignores early exercise and bid/ask effects. Not a guaranteed price.", unl: "Unlimited", pick: "Tap an Ask price for the long leg, then optionally a Bid price for the short leg to form a spread.", zero: "Budget does not cover one contract.", perC: "Per contract", tot: "Total", greeks: "Delta / Theta / IV", note: "Math only, not a recommendation.", src: "Source: Massive.", asof: "Last update from source", fetched: "Fetched at", noTs: "n/a", inf: "(inferred from quote age)", feed: { realtime: "Real-time", delayed: "Delayed", eod: "End-of-day", unknown: "Unknown" }, nokey: "No data key. Add MASSIVE_API_KEY to .env.local. No substitute data is shown.", auth: "The source rejected the key, or your plan excludes this data.", rateLimit: "Rate limit hit. Retry after", sec: "s.", timeout: "Connection to the source timed out.", net: "Could not reach the source.", err: "Source error.", bad: "Invalid input.", past: "Expiration is in the past.", partial: "Warning: not all contracts were loaded ({n} pages). Your strategy may be incomplete.", partialStop: "Loading stopped because:", spread: "Invalid spread: same type, farther strike.", debit: "Invalid net cost.", debw: "Net debit is at or above the spread width: no profit possible.", mult: "Contract multiplier invalid or different between legs.", price: "Invalid prices.", capE: "Capital must be a number above zero.", riskE: "Risk must be between 0 and 10%.", riskH: "Note: risk above 2% per trade.", quote: "Selected quote is invalid (Bid/Ask).", nonstd: "Non-standard contract (multiplier ≠ 100), unsupported.", expired: "Contract has expired.", flags: { missing: "Missing data", invalid: "Invalid price", crossed: "Bid above Ask", no_bid: "No bid", wide: "Wide spread", stale: "Stale quote" } },
};
const f = (x: number | null | undefined, d = 2) => (x == null || !Number.isFinite(x) ? "–" : x.toFixed(d));
const usd = (x: number | null | undefined) => (x == null ? "–" : `${x < 0 ? "-" : ""}$${Math.abs(x).toFixed(2)}`);
const et = (ms: number | null | undefined) => (ms ? new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "medium" }).format(ms) + " ET" : null);
const kfmt = (x: number | null | undefined) => (x == null ? "–" : x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : String(x));

export default function OptionsTerminal() {
  const { lang } = useLang();
  const t = T[lang];
  const [nowMs, setNowMs] = useState(0);
  const [symbol, setSymbol] = useState("QQQ");
  const [exp, setExp] = useState(nextFriday());
  const [rows, setRows] = useState<Row[]>([]);
  const [und, setUnd] = useState<number | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cErr, setCErr] = useState<ApiErr | null>(null);
  const [busy, setBusy] = useState(false);
  const [lng, setLng] = useState<Sel | null>(null);
  const [sht, setSht] = useState<Sel | null>(null);
  const [capital, setCapital] = useState(1000);
  const [risk, setRisk] = useState(1);
  const [rate, setRate] = useState(4);
  const [hrs, setHrs] = useState(0);
  const [target, setTarget] = useState("");
  // فلاتر السلسلة
  const [showT, setShowT] = useState<"both" | "call" | "put">("both");
  const [win, setWin] = useState(8);
  const [minOi, setMinOi] = useState(0);
  const [hideBad, setHideBad] = useState(false);

  useEffect(() => { setNowMs(Date.now()); const i = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(i); }, []);

  async function load(sym = symbol) {
    setCErr(null); setLng(null); setSht(null);
    if (!/^[A-Z.]{1,6}$/.test(sym)) return setCErr({ code: "BAD_INPUT" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exp)) return setCErr({ code: "BAD_INPUT" });
    if (exp < toLocalISO(new Date())) return setCErr({ code: "PAST" });
    setBusy(true);
    const r = await getJson<Chain>(`/api/chain?symbol=${encodeURIComponent(sym)}&expiration=${exp}`);
    setBusy(false);
    if (!r.ok) { setCErr(r.err); setRows([]); setMeta(null); return; }
    setRows(r.data.rows); setUnd(r.data.underlying); setMeta(r.data.meta);
  }
  const quick = (s: string) => { setSymbol(s); load(s); };

  const blocked = (s: Side | null) => !s || !s.std || s.flags.some((x) => BLOCK.includes(x));
  const view = useMemo(() => {
    if (!rows.length) return [];
    const okSide = (s: Side | null) => !!s && (s.oi ?? 0) >= minOi && !(hideBad && (blocked(s) || s.flags.length > 0));
    const vis = rows.filter((r) => (showT !== "put" && okSide(r.call)) || (showT !== "call" && okSide(r.put)));
    if (!vis.length) return [];
    const ref = und ?? vis[Math.floor(vis.length / 2)].strike;
    let a = 0; vis.forEach((r, i) => { if (Math.abs(r.strike - ref) < Math.abs(vis[a].strike - ref)) a = i; });
    const w = Math.max(1, Math.min(50, Math.floor(win) || 8));
    return vis.slice(Math.max(0, a - w), a + w + 1).map((r) => ({ ...r, atm: r.strike === vis[a].strike, hideC: !okSide(r.call), hideP: !okSide(r.put) }));
  }, [rows, und, showT, win, minOi, hideBad]);

  const find = (s: Sel | null) => (s ? rows.find((r) => r.strike === s.strike)?.[s.type] ?? null : null);
  const L = find(lng), S = find(sht);
  const closeMs = /^\d{4}-\d{2}-\d{2}$/.test(exp) ? expiryCloseMs(exp) : 0;
  const hoursToExpiry = nowMs ? (closeMs - nowMs) / 3600000 : 0;
  const tg = target.trim() === "" || isNaN(Number(target)) ? null : Number(target);
  const inputErr = validateInputs(capital, risk);

  const res = useMemo(() => {
    if (!lng || !L) return null;
    if (blocked(L) || (sht && blocked(S))) return { ok: false as const, error: L && !L.std ? "nonstd" : "quote" };
    const lg: Leg = { type: lng.type, strike: lng.strike, price: L.ask as number, iv: L.iv, multiplier: L.mult ?? undefined };
    const sg: Leg | null = sht && S ? { type: sht.type, strike: sht.strike, price: S.bid as number, iv: S.iv, multiplier: S.mult ?? undefined } : null;
    return analyze(lg, sg, capital, risk, tg == null ? null : { price: tg, hoursToExpiry, hoursFromNow: hrs, rate: rate / 100 });
  }, [lng, sht, L, S, capital, risk, tg, hrs, rate, hoursToExpiry]);

  // الشراء من عمود Ask فقط، والبيع من عمود Bid فقط، وعقد البيع يجب أن يكمّل Vertical صالحاً.
  const pickAsk = (type: "call" | "put", r: Row) => { if (blocked(r[type])) return; setLng((p) => (p?.type === type && p.strike === r.strike ? null : { type, strike: r.strike })); setSht((p) => (p && p.type === type && lng?.type === type ? p : null)); };
  const shortOk = (type: "call" | "put", r: Row) => !!lng && lng.type === type && (type === "call" ? r.strike > lng.strike : r.strike < lng.strike) && !blocked(r[type]);
  const pickBid = (type: "call" | "put", r: Row) => { if (shortOk(type, r)) setSht((p) => (p?.strike === r.strike ? null : { type, strike: r.strike })); };
  const cell = (type: "call" | "put", r: Row, side: "ask" | "bid") => {
    const s = r[type]; const ask = side === "ask";
    const sel = ask ? lng?.type === type && lng.strike === r.strike : sht?.type === type && sht.strike === r.strike;
    const ok = ask ? !blocked(s) : shortOk(type, r);
    const fl = s?.flags.map((x) => (t.flags as Record<string, string>)[x]).join(", ") || (s && !s.std ? t.nonstd : "");
    return <td className={`p ${sel ? "sel" : ""} ${ok ? "" : "off"} ${fl ? "warn" : ""}`} title={fl} tabIndex={ok ? 0 : -1} aria-disabled={!ok}
      onClick={() => (ask ? pickAsk(type, r) : pickBid(type, r))} onKeyDown={(e) => e.key === "Enter" && (ask ? pickAsk(type, r) : pickBid(type, r))}>{f(s?.[side])}{fl ? " ⚠" : ""}</td>;
  };
  const sideCells = (type: "call" | "put", r: Row & { hideC: boolean; hideP: boolean }) => {
    const hidden = type === "call" ? r.hideC : r.hideP; const s = r[type];
    if (hidden) return <><td className="off">–</td><td className="off">–</td><td /><td /><td /><td /></>;
    const iv = s?.iv == null ? null : s.iv * 100;
    return type === "call"
      ? <>{cell("call", r, "ask")}{cell("call", r, "bid")}<td>{f(s?.delta)}</td><td>{f(iv, 1)}%</td><td>{kfmt(s?.oi)}</td><td>{kfmt(s?.vol)}</td></>
      : <><td>{kfmt(s?.vol)}</td><td>{kfmt(s?.oi)}</td><td>{f(iv, 1)}%</td><td>{f(s?.delta)}</td>{cell("put", r, "bid")}{cell("put", r, "ask")}</>;
  };

  const errMsg = res && !res.ok ? ((t as Record<string, unknown>)[res.error === "debit_ge_width" ? "debw" : res.error] as string ?? t.err) : "";
  const asOf = et(meta?.asOf ?? meta?.underlyingTs);
  const callHead = <><th>Ask ({t.buy})</th><th>Bid ({t.sell})</th><th>Δ</th><th>IV</th><th>{t.oi}</th><th>{t.vol}</th></>;
  const putHead = <><th>{t.vol}</th><th>{t.oi}</th><th>IV</th><th>Δ</th><th>Bid ({t.sell})</th><th>Ask ({t.buy})</th></>;

  return (
    <main>
      <section>
        <h2>{t.analyzer}</h2>
        <div className="chips" aria-label={t.quick}>{QUICK.map((s) => <button key={s} className={s === symbol && meta ? "on" : ""} onClick={() => quick(s)} disabled={busy}>{s}</button>)}</div>
        <div className="row">
          <label>{t.symbol}<input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().trim())} size={7} onKeyDown={(e) => e.key === "Enter" && load()} /></label>
          <label>{t.exp}<input type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></label>
          <button onClick={() => load()} disabled={busy}>{busy ? "…" : t.load}</button>
          <button onClick={() => { setLng(null); setSht(null); }}>{t.clear}</button>
        </div>
        {cErr && <div className="msg err">{errText(lang, cErr)}</div>}
        {meta && <>
          <p className="mut"><Badge feed={meta.feed} inferred={meta.inferred} /> {t.asof}: {asOf ?? t.noTs}. {t.fetched}: {et(meta.fetchedAt)}. {und != null && <b>{symbol}: {f(und)}</b>}</p>
          {!meta.complete && <div className="box">{t.partial.replace("{n}", String(meta.pages))} {meta.stopped ? `${t.partialStop} ${meta.stopped}` : ""}</div>}
          {hoursToExpiry <= 0 && nowMs > 0 && <div className="box">{t.expired}</div>}
          <div className="row filters">
            <span className="mut">{t.filters}:</span>
            <div className="seg" role="group" aria-label={t.show}>{(["both", "call", "put"] as const).map((k) => <button key={k} className={showT === k ? "on" : ""} onClick={() => setShowT(k)}>{k === "both" ? t.both : k === "call" ? t.calls : t.puts}</button>)}</div>
            <label>{t.win}<input type="number" min="1" max="50" value={win} onChange={(e) => setWin(Number(e.target.value))} /></label>
            <label>{t.minOi}<input type="number" min="0" value={minOi} onChange={(e) => setMinOi(Math.max(0, Number(e.target.value) || 0))} /></label>
            <label className="check"><input type="checkbox" checked={hideBad} onChange={(e) => setHideBad(e.target.checked)} /> {t.hideBad}</label>
          </div>
        </>}
        {meta && (view.length === 0 ? <div className="msg">{t.none}</div> : <>
          <p className="mut tiny">{t.shown.replace("{a}", String(view.length)).replace("{b}", String(rows.length))}</p>
          <div className="scroll"><table><thead>
            <tr>{showT !== "put" && <th colSpan={6} className="grp c">CALL</th>}<th /> {showT !== "call" && <th colSpan={6} className="grp p">PUT</th>}</tr>
            <tr>{showT !== "put" && callHead}<th>Strike</th>{showT !== "call" && putHead}</tr></thead>
            <tbody>{view.map((r) => (<tr key={r.strike} className={r.atm ? "atm" : ""}>
              {showT !== "put" && sideCells("call", r)}<td className="k">{r.strike}</td>{showT !== "call" && sideCells("put", r)}</tr>))}</tbody></table></div>
        </>)}
      </section>

      {meta && view.length > 0 && <section>
        <h2>{lang === "ar" ? "حاسبة الصفقة" : "Trade calculator"}</h2>
        <p className="mut">{t.buy} (Ask): {lng ? `${lng.type.toUpperCase()} ${lng.strike} @ ${f(L?.ask)}` : "–"} &nbsp;|&nbsp; {t.sell} (Bid): {sht ? `${sht.type.toUpperCase()} ${sht.strike} @ ${f(S?.bid)}` : "–"}</p>
        <div className="row">
          <label>{t.capital}<input type="number" min="0" value={capital} onChange={(e) => setCapital(Number(e.target.value))} /></label>
          <label>{t.risk}<input type="number" min="0.1" max={RISK_MAX} step="0.1" value={risk} onChange={(e) => setRisk(Number(e.target.value))} /></label>
          <label>{t.target}<input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          <label>{t.hours}<input type="number" min="0" value={hrs} onChange={(e) => setHrs(Number(e.target.value))} /></label>
          <label>{t.rate}<input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label></div>
        {inputErr && <div className="msg err">{inputErr === "capital" ? t.capE : t.riskE}</div>}
        {!inputErr && risk > 2 && <div className="box">{t.riskH}</div>}
        {!res ? <div className="msg">{t.pick}</div> : !res.ok ? <div className="msg err">{errMsg}</div> : <>
          <div className="grid">
            {([[t.premium, f(res.premium)], [t.cost, usd(res.contractCost)], [t.be, f(res.breakeven)], [t.ml, usd(res.maxLossPerContract)], [t.mp, res.maxProfitPerContract == null ? t.unl : usd(res.maxProfitPerContract)],
              [t.rr, res.rr == null ? "–" : f(res.rr)], [t.budget, usd(res.riskBudget)], [t.n, String(res.contracts)], [t.tc, usd(res.totalCost)],
              [t.greeks, `${f(L?.delta)} / ${f(L?.theta)} / ${f(L?.iv == null ? null : L.iv * 100, 1)}%`]] as string[][]).map(([a, b]) =>
              <div className="q" key={a}><span className="mut">{a}</span><b><bdi dir="ltr">{b}</bdi></b></div>)}</div>
          {res.contracts === 0 && <div className="box">{t.zero}</div>}
          {res.atExpiry && <div className="grid" style={{ marginTop: 10 }}>
            <div className="q"><span className="mut">{t.plx} — {t.perC}</span><b className={res.atExpiry.perContract >= 0 ? "up" : "dn"}><bdi dir="ltr">{usd(res.atExpiry.perContract)}</bdi></b></div>
            <div className="q"><span className="mut">{t.plx} — {t.tot}</span><b className={res.atExpiry.total >= 0 ? "up" : "dn"}><bdi dir="ltr">{usd(res.atExpiry.total)}</bdi></b></div>
            {res.before && <><div className="q"><span className="mut">{t.ple} — {t.perC}</span><b className={res.before.perContract >= 0 ? "up" : "dn"}><bdi dir="ltr">{usd(res.before.perContract)}</bdi></b></div>
              <div className="q"><span className="mut">{t.ple} — {t.tot}</span><b className={res.before.total >= 0 ? "up" : "dn"}><bdi dir="ltr">{usd(res.before.total)}</bdi></b></div></>}</div>}
          {res.before && <p className="mut">{t.estNote}</p>}
        </>}
        <p className="mut">{t.note}</p>
      </section>}
    </main>
  );
}
