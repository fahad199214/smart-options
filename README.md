# سمارت أوبشنز (Smart Options)

منصة خاصة لتحليل السوق الأمريكي (الإصدار 0.3.5).

لوحة لتحليل S&P 500 وعقود الخيارات الأمريكية، مبنية بـ Next.js وTypeScript، وتعمل ببيانات Massive الحقيقية فقط.

**التشغيل والنشر:** اقرأ `DEPLOY.md` (خطوة بخطوة حتى رابط دائم على Vercel).

## الصفحات
| المسار | المحتوى |
|---|---|
| `/` | المؤشرات الرئيسية (SPX، NDX، DJI، RUT، VIX)، رسم بياني تفاعلي مع SMA50 وSMA200 ومدد 3M إلى 2Y، معنويات فنية من خمس قواعد معروضة القيم، وأسعار الصناديق والأسهم القيادية |
| `/options` | سلسلة الخيارات لأي رمز مع أزرار سريعة (NVDA وAAPL وTSLA وMSFT وAMZN وQQQ وSPY)، فلاتر (Call/Put، عدد Strike، أدنى OI، إخفاء الأسعار المعيبة)، وحاسبة الصفقة |

## الحاسبة
Premium وتكلفة العقد، نقطة التعادل، أقصى ربح وخسارة، Risk/Reward، عدد العقود حسب رأس المال ونسبة المخاطرة، P/L عند الانتهاء، وP/L تقديري قبل الانتهاء بنموذج Black-Scholes. تدعم Long Call وLong Put وBull Call Spread وBear Put Spread.

## هيكل المشروع
```
app/
  layout.tsx            الإطار العام (اللغة + الترويسة)
  page.tsx              لوحة السوق
  options/page.tsx      صفحة الخيارات
  api/overview          أسعار الصناديق والأسهم     (خادم)
  api/indices           المؤشرات الفعلية            (خادم، تحتاج خطة Indices)
  api/history           الشموع اليومية للرسم        (خادم)
  api/chain             سلسلة الخيارات              (خادم)
components/             Header وDashboard وPriceChart وOptionsTerminal وlang
lib/
  analyzer.ts           حسابات الصفقة
  pricing.ts            Black-Scholes
  indicators.ts         SMA وRSI والمعنويات
  dates.ts quality.ts   التواريخ وجودة البيانات
  server/massive.ts     الاتصال بـ Massive (خادم فقط، مع كاش ومعالجة الأخطاء)
tests/                  اختبارات الوحدة (npm test)
```

## الأمان
- المفتاح يُقرأ فقط في `lib/server/massive.ts`، والملف محمي بـ `server-only` فيفشل البناء إذا استُورد من الواجهة.
- لا يوجد أي متغير `NEXT_PUBLIC_`، والمتصفح لا يرى المفتاح أبداً.
- ترويسات أمان في `next.config.js`.

## ما ليس موجوداً بعد
Options Flow (Block/Sweep وتحليل التنفيذ عند Bid/Ask) يحتاج بيانات صفقات الخيارات وتخزيناً، ولم يُبنَ. وكذلك Screener وصفحات الشركات والأخبار والتنبيهات وBacktesting.
