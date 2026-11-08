const nf = new Intl.NumberFormat("en-GB");
const nf1 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export const fmt = {
  int: (v: number | null | undefined, dash = "n/a") => (ok(v) ? nf.format(Math.round(v)) : dash),
  one: (v: number | null | undefined, dash = "n/a") => (ok(v) ? nf1.format(v) : dash),
  two: (v: number | null | undefined, dash = "n/a") => (ok(v) ? nf2.format(v) : dash),
  compact: (v: number | null | undefined, dash = "n/a") => (ok(v) ? (Math.abs(v) < 10000 ? nf.format(Math.round(v)) : compact.format(v)) : dash),
  pct: (v: number | null | undefined, dash = "n/a") => (ok(v) ? `${Math.round(v * 100)}%` : dash),
  p: (v: number | null | undefined) => (!ok(v) ? "n/a" : v < 0.001 ? "p < 0.001" : `p = ${v < 0.01 ? v.toFixed(3) : v.toFixed(2)}`),
  lift: (v: number | null | undefined, dash = "n/a") => (ok(v) ? `${nf2.format(v)}×` : dash),
  date: (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  },
};

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${fmt.int(n)} ${n === 1 ? one : many}`;
}
