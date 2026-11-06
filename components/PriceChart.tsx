"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { smaSeries } from "@/lib/indicators";
import { fmt } from "./lang";
export type Bar = { t: number; c: number; h: number | null; l: number | null };
// رسم بياني SVG تفاعلي بدون مكتبات خارجية: خط الإغلاق + SMA50 + SMA200، مع مؤشر تمرير ولوحة مفاتيح.
export default function PriceChart({ bars, displayDays, label }: { bars: Bar[]; displayDays: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(900);
  // يطابق عرض الرسم عرض الحاوية فعلياً حتى تبقى النصوص مقروءة على الجوال.
  useEffect(() => {
    const el = box.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((es) => { const w = Math.round(es[0].contentRect.width); if (w > 0) setW(w); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = W < 520 ? 220 : 300, P = { l: 6, r: W < 520 ? 46 : 64, t: 12, b: 24 };
  const ref = useRef<SVGSVGElement>(null);
  const [hi, setHi] = useState<number | null>(null);
  const d = useMemo(() => {
    const closes = bars.map((b) => b.c), s50 = smaSeries(closes, 50), s200 = smaSeries(closes, 200);
    const cut = bars.length ? bars[bars.length - 1].t - displayDays * 86400000 : 0;
    const start = Math.max(0, bars.findIndex((b) => b.t >= cut));
    const v = bars.slice(start).map((b, i) => ({ ...b, s50: s50[start + i], s200: s200[start + i] }));
    const ys = v.flatMap((x) => [x.c, x.s50, x.s200].filter((y): y is number => y != null));
    const min = Math.min(...ys), max = Math.max(...ys), pad = (max - min) * 0.06 || 1;
    return { v, lo: min - pad, hi: max + pad };
  }, [bars, displayDays]);
  if (d.v.length < 2) return null;
  const x = (i: number) => P.l + (i / (d.v.length - 1)) * (W - P.l - P.r);
  const y = (p: number) => P.t + (1 - (p - d.lo) / (d.hi - d.lo)) * (H - P.t - P.b);
  const path = (k: "c" | "s50" | "s200") => d.v.reduce((s, b, i) => { const p = b[k]; return p == null ? s : s + `${s && !s.endsWith("M") ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`; }, "");
  const first = d.v[0].c, last = d.v[d.v.length - 1].c, up = last >= first;
  const ticks = Array.from({ length: 5 }, (_, i) => d.lo + ((d.hi - d.lo) * i) / 4);
  const move = (cx: number) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    const px = ((cx - r.left) / r.width) * W;
    setHi(Math.max(0, Math.min(d.v.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (d.v.length - 1)))));
  };
  const cur = hi != null ? d.v[hi] : null;
  const date = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", day: "2-digit", month: "short", year: "numeric" }).format(t);
  return (
    <div className="chart" ref={box}>
      <div className="chart-read" aria-live="polite" dir="ltr" style={{ textAlign: "end" }}>
        <b>{fmt(cur ? cur.c : last)}</b> <span className="mut">{cur ? date(cur.t) : date(d.v[d.v.length - 1].t)}</span>
        {cur && <span className="mut"> · SMA50 {fmt(cur.s50)} · SMA200 {fmt(cur.s200)}</span>}
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} tabIndex={0} dir="ltr"
        onPointerMove={(e) => move(e.clientX)} onPointerLeave={() => setHi(null)}
        onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setHi((h) => Math.max(0, Math.min(d.v.length - 1, (h ?? d.v.length - 1) + (e.key === "ArrowRight" ? 1 : -1)))); } if (e.key === "Escape") setHi(null); }}>
        {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid-l" /><text x={W - P.r + 6} y={y(t) + 4} className="axis">{fmt(t, 0)}</text></g>)}
        <path d={`${path("c")}L${x(d.v.length - 1)},${H - P.b}L${x(0)},${H - P.b}Z`} className={`area ${up ? "up" : "dn"}`} />
        <path d={path("s200")} className="l-s200" /><path d={path("s50")} className="l-s50" />
        <path d={path("c")} className={`l-c ${up ? "up" : "dn"}`} />
        {cur && hi != null && <g><line x1={x(hi)} x2={x(hi)} y1={P.t} y2={H - P.b} className="cross" /><circle cx={x(hi)} cy={y(cur.c)} r={4} className={`l-c ${up ? "up" : "dn"}`} /></g>}
        <text x={P.l} y={H - 6} className="axis">{date(d.v[0].t)}</text>
        <text x={W - P.r} y={H - 6} className="axis" textAnchor="end">{date(d.v[d.v.length - 1].t)}</text>
      </svg>
      <div className="legend mut"><span className="sw c" /> {label} <span className="sw s50" /> SMA50 <span className="sw s200" /> SMA200</div>
    </div>
  );
}
