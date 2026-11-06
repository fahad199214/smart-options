import "./globals.css";
import type { Metadata, Viewport } from "next";
import { LangProvider } from "@/components/lang";
import Header from "@/components/Header";
export const metadata: Metadata = { title: "سمارت أوبشنز | Smart Options", description: "منصة تحليل السوق الأمريكي وعقود الخيارات", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1420" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body><LangProvider><Header />{children}</LangProvider></body>
    </html>
  );
}
