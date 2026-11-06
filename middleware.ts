import { NextResponse, type NextRequest } from "next/server";
import { checkBasic, parseUsers } from "@/lib/auth";
// القفل اختياري: إذا أُضيف SITE_USERS في متغيرات البيئة يُقفل الموقع كاملاً (الصفحات ومسارات API) لحتى 10 مستخدمين.
// بدونه يعمل الموقع مفتوحاً لمن يعرف الرابط.
export function middleware(req: NextRequest) {
  const creds = parseUsers(process.env.SITE_USERS, process.env.SITE_USER, process.env.SITE_PASSWORD);
  if (!creds.length) return NextResponse.next();
  if (checkBasic(req.headers.get("authorization"), creds)) return NextResponse.next();
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Private", charset="UTF-8"' } });
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
