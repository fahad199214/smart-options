"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { C, useLang } from "./lang";
import { isMarketOpen } from "@/lib/dates";
const clock = (tz: string, ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(ms);
export default function Header() {
  const { lang, setLang } = useLang(); const c = C[lang]; const path = usePathname();
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const open = now ? isMarketOpen(now) : null;
  return (
    <header>
      <div className="brand"><div><h1>{c.title}</h1><p className="mut tiny sub">{c.sub}</p></div>
        <nav>{([["/", c.nav.home], ["/options", c.nav.options]] as const).map(([h, l]) =>
          <Link key={h} href={h} className={path === h ? "on" : ""} aria-current={path === h ? "page" : undefined}>{l}</Link>)}</nav></div>
      <div className="hright">
        {now > 0 && <span className="mut">
          <span className={`dot ${open ? "live" : ""}`} aria-hidden /> {open ? (lang === "ar" ? "السوق مفتوح" : "Market open") : (lang === "ar" ? "السوق مغلق" : "Market closed")}
          {"  "}ET {clock("America/New_York", now)} | {lang === "ar" ? "الرياض" : "Riyadh"} {clock("Asia/Riyadh", now)}</span>}
        <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "English" : "العربية"}</button>
      </div>
    </header>
  );
}
