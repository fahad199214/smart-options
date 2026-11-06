// يشغّل اختبارات الوحدة حسب إصدار Node المتوفر.
// الاختبارات مكتوبة بـ TypeScript وتحتاج Node 22.6 أو أحدث. على الإصدارات الأقدم يتخطاها مع رسالة واضحة،
// ولا يؤثر ذلك على تشغيل الموقع أو بنائه.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
const [maj, min] = process.versions.node.split(".").map(Number);
const files = readdirSync("tests").filter((f) => f.endsWith(".test.ts")).map((f) => `tests/${f}`);
const native = maj > 22 || (maj === 22 && min >= 18);
const flag = maj === 22 && min >= 6 && !native;
if (!native && !flag) {
  console.log(`\n[تنبيه] Node ${process.versions.node}: الاختبارات تحتاج Node 22.6 أو أحدث، لذلك تم تخطيها.`);
  console.log("[Notice] Tests need Node 22.6+. Skipped. The site itself runs on Node 18.18+.\n");
  process.exit(0);
}
const args = [...(flag ? ["--experimental-strip-types", "--no-warnings"] : []), "--test", ...files];
const r = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exit(r.status ?? 1);
