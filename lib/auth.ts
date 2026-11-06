// التحقق من Basic Auth لعدة مستخدمين. دوال نقية حتى يمكن اختبارها.
const enc = new TextEncoder();
function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
export type Creds = { user: string; pass: string }[];
export const MAX_USERS = 10;
// SITE_USERS بصيغة "fahad:pass1,ali:pass2" (فاصلة بين المستخدمين، ونقطتان بين الاسم وكلمة المرور).
// للتوافق: SITE_USER و SITE_PASSWORD القديمان يُضافان كمستخدم.
export function parseUsers(list: string | undefined, singleUser?: string, singlePass?: string): Creds {
  const out: Creds = [];
  for (const part of (list ?? "").split(",")) {
    const s = part.trim(), i = s.indexOf(":");
    if (i <= 0 || i === s.length - 1) continue;
    out.push({ user: s.slice(0, i).trim(), pass: s.slice(i + 1) });
  }
  if (singlePass) out.push({ user: singleUser || "admin", pass: singlePass });
  return out.slice(0, MAX_USERS);
}
// يرجع اسم المستخدم عند النجاح، أو null.
export function checkBasic(header: string | null, creds: Creds): string | null {
  if (!header || !header.startsWith("Basic ") || !creds.length) return null;
  let decoded: string;
  try { decoded = atob(header.slice(6).trim()); } catch { return null; }
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  const u = decoded.slice(0, i), p = decoded.slice(i + 1);
  let found: string | null = null;
  for (const c of creds) if (safeEqual(u, c.user) && safeEqual(p, c.pass)) found = c.user; // بلا خروج مبكر
  return found;
}
