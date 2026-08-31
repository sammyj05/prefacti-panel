const nf = (d: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const NF0 = nf(0);
export const NF2 = nf(2);
const MINUS = "−";

/** Formato completo para tablas y fichas: $1,250,000.00 */
export function money(v: number) {
  return (v < 0 ? MINUS : "") + "$" + NF2.format(Math.abs(v));
}
/** Compacto para tarjetas y ejes, donde no cabe la cifra entera. */
export function moneyC(v: number) {
  const a = Math.abs(v), s = v < 0 ? MINUS : "";
  if (a >= 1e9) return s + "$" + nf(2).format(a / 1e9) + "B";
  if (a >= 1e6) return s + "$" + nf(2).format(a / 1e6) + "M";
  if (a >= 1e4) return s + "$" + NF0.format(Math.round(a / 1e3)) + "K";
  return s + "$" + NF0.format(Math.round(a));
}
export const pct = (v: number, d = 1) => (v * 100).toFixed(d) + " %";
export const m2 = (v: number) => NF0.format(Math.round(v)) + " m²";
export const num = (v: number) => NF0.format(Math.round(v));
