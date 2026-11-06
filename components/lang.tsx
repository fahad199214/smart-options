"use client";
import { createContext, useContext, useEffect, useState } from "react";
export type Lang = "ar" | "en";
export type Feed = "realtime" | "delayed" | "eod" | "unknown";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "ar", setLang: () => {} });
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangS] = useState<Lang>("ar");
  useEffect(() => { try { const s = localStorage.getItem("lang"); if (s === "ar" || s === "en") setLangS(s); } catch {} }, []);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; }, [lang]);
  const setLang = (l: Lang) => { setLangS(l); try { localStorage.setItem("lang", l); } catch {} };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);

// نصوص مشتركة بين الصفحات.
export const C = {
  ar: { title: "سمارت أوبشنز", sub: "منصة تحليل السوق الأمريكي", nav: { home: "لوحة السوق", options: "الخيارات والحاسبة" }, feed: { realtime: "لحظي", delayed: "متأخر", eod: "إغلاق/نهاية اليوم", unknown: "غير معروف" }, inf: "(مستنتج)", asof: "آخر تحديث من المصدر", fetched: "وقت الجلب", noTs: "غير متوفر", errors: { NO_KEY: "مفتاح البيانات غير مضاف. أضف MASSIVE_API_KEY في متغيرات البيئة. لا تُعرض بيانات بديلة.", AUTH: "رفض المصدر المفتاح أو لا تشمل خطتك هذه البيانات.", RATE_LIMIT: "تجاوزت حد الطلبات. أعد المحاولة بعد", TIMEOUT: "انتهت مهلة الاتصال بالمصدر.", NETWORK: "تعذر الاتصال بالمصدر.", BAD_INPUT: "مدخلات غير صالحة.", PAST: "تاريخ الانتهاء في الماضي.", UPSTREAM: "خطأ من المصدر." } as Record<string, string>, sec: "ثانية.", disclaimer: "البيانات من Massive. المحتوى معلومات وحسابات وليس توصية استثمارية." },
  en: { title: "Smart Options", sub: "US market analysis platform", nav: { home: "Market dashboard", options: "Options & calculator" }, feed: { realtime: "Real-time", delayed: "Delayed", eod: "End-of-day", unknown: "Unknown" }, inf: "(inferred)", asof: "Last update from source", fetched: "Fetched at", noTs: "n/a", errors: { NO_KEY: "No data key. Add MASSIVE_API_KEY to the environment variables. No substitute data is shown.", AUTH: "The source rejected the key, or your plan excludes this data.", RATE_LIMIT: "Rate limit hit. Retry after", TIMEOUT: "Connection to the source timed out.", NETWORK: "Could not reach the source.", BAD_INPUT: "Invalid input.", PAST: "Expiration is in the past.", UPSTREAM: "Source error." } as Record<string, string>, sec: "s.", disclaimer: "Data from Massive. Information and math only, not investment advice." },
};
export type ApiErr = { code: string; retry?: number };
export function errText(lang: Lang, e: ApiErr) {
  const c = C[lang];
  return e.code === "RATE_LIMIT" ? `${c.errors.RATE_LIMIT} ${e.retry ?? "?"} ${c.sec}` : c.errors[e.code] ?? c.errors.UPSTREAM;
}
export function Badge({ feed, inferred }: { feed: Feed; inferred?: boolean }) {
  const { lang } = useLang();
  return <span className={`badge ${feed}`}>{C[lang].feed[feed]}{inferred ? ` ${C[lang].inf}` : ""}</span>;
}
export const fmt = (x: number | null | undefined, d = 2) => (x == null || !Number.isFinite(x) ? "–" : x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
export const etTime = (ms: number | null | undefined) => (ms ? new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "medium" }).format(ms) + " ET" : null);
// جلب JSON مع تحويل الأخطاء إلى ApiErr.
export async function getJson<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; err: ApiErr }> {
  try {
    const r = await fetch(url); const j = await r.json();
    return r.ok ? { ok: true, data: j as T } : { ok: false, err: { code: j.error ?? "UPSTREAM", retry: j.retryAfter } };
  } catch { return { ok: false, err: { code: "NETWORK" } }; }
}
