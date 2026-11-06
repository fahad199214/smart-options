// Black-Scholes-Merton (أوروبي). تقدير فقط: لا يأخذ الممارسة المبكرة للعقود الأمريكية في الحسبان.
const erf = (x: number) => {
  const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  const p = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return s * (1 - p * Math.exp(-a * a));
};
const N = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
export function bs(type: "call" | "put", S: number, K: number, T: number, r: number, q: number, sigma: number): number {
  const intr = type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  if (!(S > 0 && K > 0 && sigma > 0 && T > 0)) return intr;
  const sq = sigma * Math.sqrt(T), d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / sq, d2 = d1 - sq;
  const dq = Math.exp(-q * T), dr = Math.exp(-r * T);
  return type === "call" ? S * dq * N(d1) - K * dr * N(d2) : K * dr * N(-d2) - S * dq * N(-d1);
}
