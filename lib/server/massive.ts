import "server-only";
import { NextResponse } from "next/server";
// ملف خادم فقط: المفتاح لا يغادر الخادم ولا يُرسل في أي استجابة.
// "server-only" يجعل البناء يفشل إذا استُورد هذا الملف من كود الواجهة.
export type Code = "NO_KEY" | "AUTH" | "RATE_LIMIT" | "UPSTREAM" | "NETWORK" | "TIMEOUT";
export type Fail = { ok: false; code: Code; status: number; retryAfter?: number };
export type MRes = { ok: true; json: any } | Fail;
export const baseUrl = () => process.env.MASSIVE_BASE_URL || "https://api.massive.com";

// كاش بسيط داخل ذاكرة الخادم لتقليل استهلاك حد الطلبات. لا يُشارك بين نسخ Vercel المختلفة.
const cache = new Map<string, { exp: number; json: any }>();
const MAX_CACHE = 300;

export async function mget(url: string, ttlMs = 0): Promise<MRes> {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) return { ok: false, code: "NO_KEY", status: 503 };
  if (new URL(url).origin !== new URL(baseUrl()).origin) return { ok: false, code: "UPSTREAM", status: 502 };
  const hit = cache.get(url);
  if (ttlMs > 0 && hit && hit.exp > Date.now()) return { ok: true, json: hit.json };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: ac.signal });
    if (r.status === 401 || r.status === 403) return { ok: false, code: "AUTH", status: 502 };
    if (r.status === 429) return { ok: false, code: "RATE_LIMIT", status: 429, retryAfter: Number(r.headers.get("retry-after")) || undefined };
    if (!r.ok) return { ok: false, code: "UPSTREAM", status: 502 };
    const json = await r.json();
    if (ttlMs > 0) {
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
      cache.set(url, { exp: Date.now() + ttlMs, json });
    }
    return { ok: true, json };
  } catch (e: any) {
    const to = e?.name === "AbortError";
    return { ok: false, code: to ? "TIMEOUT" : "NETWORK", status: to ? 504 : 502 };
  } finally { clearTimeout(timer); }
}
export const errJson = (r: Fail) => NextResponse.json({ error: r.code, retryAfter: r.retryAfter }, { status: r.status });
