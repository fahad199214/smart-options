"use client";
import { useEffect, useMemo, useState } from "react";
import PriceChart, { type Bar } from "./PriceChart";
import { sentiment, type Rule } from "@/lib/indicators";
import { Badge, C, errText, etTime, fmt, getJson, useLang, type ApiErr, type Feed } from "./lang";

type Idx = { ticker: string; value: number | null; chg: number | null; pct: number | null; ts: number | null; feed: Feed; inferred: boolean };
type Q = { ticker: string; price: number | null; chg: number | null; pct: number | null; ts: number | null; feed: Feed; inferred: boolean };
const NAMES: Record<string, string> = { "I:SPX": "S&P 500", "I:NDX": "Nasdaq 100", "I:DJI": "Dow Jones", "I:RUT": "Russell 2000", "I:VIX": "VIX" };
const CHART_SYMS = ["I:SPX", "SPY", "QQQ", "NVDA", "AAPL", "TSLA", "MSFT", "AMZN"];
const RANGES = ["3M", "6M", "1Y", "2Y"] as const;

const T = {
  ar: { indices: "المؤشرات الرئيسية", idxNote: "المؤشرات الفعلية (SPX وVIX وغيرها) تتطلب اشتراك Indices في Massive.", etfs: "صناديق المؤشرات والأسهم القيادية", chart: "الرسم البياني", range: "المدة", fallback: "مؤشر SPX يتطلب اشتراك Indices، لذلك يُعرض SPY (صندوق يتبع المؤشر) بدلاً منه.", daily: "شموع يومية تاريخية معدّلة. آخر شمعة قد تكون لجلسة لم تكتمل.", senti: "معنويات السوق الفنية", basedOn: "مبنية على", label: { bull: "صاعدة", bear: "هابطة", neutral: "محايدة" }, insuff: "البيانات غير كافية لكل القواعد (تحتاج 200 يوم على الأقل).", rules: { above50: "السعر فوق متوسط 50 يوماً", above200: "السعر فوق متوسط 200 يوم", cross: "متوسط 50 فوق متوسط 200", rsi: "RSI(14) بين 50 و70 (فوق 70 أو تحت 30 = محايد)", ret20: "عائد آخر 20 جلسة موجب" }, vote: { bull: "صاعد", bear: "هابط", neutral: "محايد" }, vix: "مؤشر الخوف VIX", vixLv: (v: number) => (v >= 30 ? "تقلب مرتفع جداً" : v >= 20 ? "تقلب أعلى من المعتاد" : v >= 15 ? "تقلب طبيعي" : "تقلب منخفض"), method: "القواعد الخمس ثابتة وكل قيمة معروضة لتتحقق منها: صاعدة إذا اتفقت 4 قواعد على الصعود، وهابطة إذا اتفقت 4 على الهبوط، وإلا محايدة. هذا وصف للاتجاه الحالي وليس توقعاً ولا توصية.", loading: "جاري التحميل…" },
  en: { indices: "Major indices", idxNote: "Actual indices (SPX, VIX, etc.) require a Massive Indices subscription.", etfs: "Index ETFs and leading stocks", chart: "Chart", range: "Range", fallback: "SPX requires an Indices subscription, so SPY (an ETF tracking the index) is shown instead.", daily: "Adjusted historical daily bars. The last bar may be an unfinished session.", senti: "Technical market sentiment", basedOn: "Based on", label: { bull: "Bullish", bear: "Bearish", neutral: "Neutral" }, insuff: "Not enough data for every rule (needs at least 200 days).", rules: { above50: "Price above 50-day average", above200: "Price above 200-day average", cross: "50-day average above 200-day", rsi: "RSI(14) between 50 and 70 (above 70 or below 30 = neutral)", ret20: "Positive return over last 20 sessions" }, vote: { bull: "Bullish", bear: "Bearish", neutral: "Neutral" }, vix: "VIX fear gauge", vixLv: (v: number) => (v >= 30 ? "Very high volatility" : v >= 20 ? "Above-normal volatility" : v >= 15 ? "Normal volatility" : "Low volatility"), method: "Five fixed rules, each value shown so you can verify it: bullish when 4 agree up, bearish when 4 agree down, otherwise neutral. This describes the current trend; it is not a forecast or a recommendation.", loading: "Loading…" },
};
const name = (t: string) => NAMES[t] ?? t.replace("I:", "");

export default function Dashboard() {
  const { lang } = useLang(); const t = T[lang], c = C[lang];
  const [idx, setIdx] = useState<Idx[]>([]); const [idxErr, setIdxErr] = useState<ApiErr | null>(null);
  const [qs, setQs] = useState<Q[]>([]); const [qErr, setQErr] = useState<ApiErr | null>(null);
  const [sym, setSym] = useState("I:SPX"); const [range, setRange] = useState<(typeof RANGES)[number]>("1Y");
  const [bars, setBars] = useState<Bar[]>([]); const [shown, setShown] = useState(""); const [days, setDays] = useState(366);
  const [hErr, setHErr] = useState<ApiErr | null>(null); const [fell, setFell] = useState(false); const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const go = async () => {
      const [a, b] = await Promise.all([getJson<{ indices: Idx[] }>("/api/indices"), getJson<{ quotes: Q[] }>("/api/overview")]);
      if (!live) return;
      if (a.ok) { setIdx(a.data.indices); setIdxErr(null); } else setIdxErr(a.err);
      if (b.ok) { setQs(b.data.quotes); setQErr(null); } else setQErr(b.err);
    };
    go(); const i = setInterval(go, 20000); return () => { live = false; clearInterval(i); };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      setBusy(true); setHErr(null);
      let r = await getJson<{ bars: Bar[]; displayDays: number }>(`/api/history?symbol=${encodeURIComponent(sym)}&range=${range}`);
      let used = sym, fb = false;
      if (!r.ok && sym === "I:SPX" && r.err.code === "AUTH") { used = "SPY"; fb = true; r = await getJson(`/api/history?symbol=SPY&range=${range}`); }
      if (!live) return;
      setFell(fb); setBusy(false);
      if (r.ok) { setBars(r.data.bars); setDays(r.data.displayDays); setShown(used); } else { setBars([]); setHErr(r.err); }
    })();
    return () => { live = false; };
  }, [sym, range]);

  const s = useMemo(() => sentiment(bars.map((b) => b.c)), [bars]);
  const vix = idx.find((x) => x.ticker === "I:VIX");
  const lastBar = bars.length ? bars[bars.length - 1].t : null;
  const ruleVal = (r: Rule) => r.id === "rsi" ? fmt(r.value, 1) : r.id === "ret20" ? `${fmt(r.value)}%` : `${fmt(r.value)} / ${fmt(r.ref)}`;

  return (
    <main>
      <section>
        <h2>{t.indices}</h2>
        {idxErr ? <div className="msg">{errText(lang, idxErr)} {idxErr.code === "AUTH" && t.idxNote}</div> :
          <div className="grid">{idx.map((q) => (
            <div className="q" key={q.ticker}><span className="mut">{name(q.ticker)}</span> <Badge feed={q.feed} inferred={q.inferred} />
              <b><bdi dir="ltr">{fmt(q.value)}</bdi></b><span className={(q.chg ?? 0) >= 0 ? "up" : "dn"}><bdi dir="ltr">{fmt(q.chg)} ({fmt(q.pct)}%)</bdi></span>
              <span className="mut tiny">{etTime(q.ts) ?? c.noTs}</span></div>))}</div>}
      </section>

      <div className="two">
        <section className="span2">
          <div className="sec-head"><h2>{t.chart}: {name(shown || sym)}</h2>
            <div className="seg" role="group" aria-label={t.range}>{RANGES.map((r) => <button key={r} className={r === range ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}</div></div>
          <div className="chips">{CHART_SYMS.map((x) => <button key={x} className={x === sym ? "on" : ""} onClick={() => setSym(x)}>{name(x)}</button>)}</div>
          {fell && <div className="box">{t.fallback}</div>}
          {hErr ? <div className="msg">{errText(lang, hErr)}</div> : busy && !bars.length ? <div className="msg">{t.loading}</div> :
            <PriceChart bars={bars} displayDays={days} label={name(shown || sym)} />}
          <p className="mut">{t.daily} {lastBar ? `${c.asof}: ${etTime(lastBar)?.split(",")[0]}` : ""}</p>
        </section>

        <section>
          <h2>{t.senti}</h2>
          {!bars.length ? <div className="msg">{hErr ? errText(lang, hErr) : t.loading}</div> : <>
            <div className={`senti ${s.label}`}><b>{t.label[s.label]}</b>
              <span className="mut">{t.basedOn} {name(shown)}: {s.bull} {t.vote.bull} · {s.bear} {t.vote.bear} · {s.neutral} {t.vote.neutral}</span></div>
            <div className="meter" aria-hidden><span className="mb" style={{ width: `${(s.bull / 5) * 100}%` }} /><span className="mn" style={{ width: `${(s.neutral / 5) * 100}%` }} /><span className="mr" style={{ width: `${(s.bear / 5) * 100}%` }} /></div>
            {s.insufficient && <div className="box">{t.insuff}</div>}
            <ul className="rules">{s.rules.map((r) => <li key={r.id}><span>{t.rules[r.id]}</span><span className="mut"><bdi dir="ltr">{ruleVal(r)}</bdi></span><span className={`v ${r.vote}`}>{t.vote[r.vote]}</span></li>)}</ul>
            {vix?.value != null && <p><span className="mut">{t.vix}:</span> <b><bdi dir="ltr">{fmt(vix.value)}</bdi></b> <span className="mut">({t.vixLv(vix.value)})</span></p>}
            <p className="mut tiny">{t.method}</p></>}
        </section>
      </div>

      <section>
        <h2>{t.etfs}</h2>
        {qErr ? <div className="msg">{errText(lang, qErr)}</div> :
          <div className="grid">{qs.map((q) => (
            <div className="q" key={q.ticker}><span className="mut">{q.ticker}</span> <Badge feed={q.feed} inferred={q.inferred} />
              <b><bdi dir="ltr">{fmt(q.price)}</bdi></b><span className={(q.chg ?? 0) >= 0 ? "up" : "dn"}><bdi dir="ltr">{fmt(q.chg)} ({fmt(q.pct)}%)</bdi></span>
              <span className="mut tiny">{etTime(q.ts) ?? c.noTs}</span></div>))}</div>}
      </section>
      <p className="mut tiny center">{c.disclaimer}</p>
    </main>
  );
}
