import type { MetadataRoute } from "next";
// موقع خاص: لا فهرسة.
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", disallow: "/" } }; }
