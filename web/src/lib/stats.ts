// stats.json is only named in WEB_DATA.md, not shaped, so each block is read
// through a forgiving normaliser: arrays or keyed objects, several field names.
import { asArray, num, type StatsRaw } from "./data";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const pick = (o: Obj, ...keys: string[]): unknown => { for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]; return undefined; };

export interface Bin { x0: number; x1: number; count: number }
export interface Persistence {
  statistic: string | null; observed: number | null; bins: Bin[]; nullMean: number | null;
  p: number | null; nPerm: number | null; ratio: number | null; nTaxa: number | null;
}

function binsFromSamples(samples: number[], observed: number | null): Bin[] {
  if (!samples.length) return [];
  let lo = Infinity, hi = -Infinity;
  for (const s of samples) { if (s < lo) lo = s; if (s > hi) hi = s; }
  const span = Math.max(1, hi - lo);
  const target = 28;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const width = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((w) => w >= raw) ?? raw;
  const start = Math.floor(lo / width) * width;
  const n = Math.max(1, Math.ceil((hi - start + (width * 1e-9)) / width));
  const bins: Bin[] = Array.from({ length: n }, (_, i) => ({ x0: start + i * width, x1: start + (i + 1) * width, count: 0 }));
  for (const s of samples) { const i = Math.min(n - 1, Math.floor((s - start) / width)); bins[i].count++; }
  void observed;
  return bins;
}

export function readPersistence(stats: StatsRaw | null | undefined): Persistence | null {
  const raw = stats && (stats["persistence"] ?? stats["permutation"]);
  if (!isObj(raw)) return null;
  const observed = num(pick(raw, "observed_overlap", "observed", "observed_value", "obs", "statistic_observed"));
  let bins: Bin[] = [];
  const samples = pick(raw, "null_samples", "null", "permuted", "null_distribution", "samples");
  const hist = pick(raw, "null_hist", "histogram", "null_bins", "bins");
  if (Array.isArray(samples) && samples.length && typeof samples[0] === "number") {
    bins = binsFromSamples((samples as unknown[]).map(num).filter((x): x is number => x !== null), observed);
  } else if (Array.isArray(hist) && hist.length && isObj(hist[0])) {
    bins = (hist as Obj[]).map((b) => ({
      x0: num(pick(b, "x0", "start", "bin_start", "lo", "left")) ?? NaN,
      x1: num(pick(b, "x1", "end", "bin_end", "hi", "right")) ?? NaN,
      count: num(pick(b, "count", "n", "freq", "y")) ?? 0,
    })).filter((b) => Number.isFinite(b.x0) && Number.isFinite(b.x1));
  } else if (isObj(hist)) {
    const edges = asArray<unknown>(pick(hist, "edges", "bins", "bin_edges")).map(num);
    const counts = asArray<unknown>(pick(hist, "counts", "values", "hist")).map(num);
    for (let i = 0; i < counts.length && i + 1 < edges.length; i++) {
      const x0 = edges[i], x1 = edges[i + 1], c = counts[i];
      if (x0 !== null && x1 !== null) bins.push({ x0, x1, count: c ?? 0 });
    }
  }
  let nullMean = num(pick(raw, "null_mean", "expected", "mean_null"));
  if (nullMean === null && bins.length) {
    const tot = bins.reduce((a, b) => a + b.count, 0);
    if (tot) nullMean = bins.reduce((a, b) => a + ((b.x0 + b.x1) / 2) * b.count, 0) / tot;
  }
  const ratio = num(pick(raw, "fold_enrichment", "ratio", "fold", "observed_over_expected")) ?? (observed !== null && nullMean ? observed / nullMean : null);
  return {
    statistic: typeof raw["statistic"] === "string" ? (raw["statistic"] as string) : (typeof raw["label"] === "string" ? (raw["label"] as string) : null),
    observed, bins, nullMean,
    p: num(pick(raw, "p_value", "p", "pvalue")),
    nPerm: num(pick(raw, "n_permutations", "n_perm", "permutations", "n")),
    nTaxa: num(pick(raw, "n_shared_taxa")),
    ratio,
  };
}

export interface Interval { key: string; label: string; value: number; lo: number | null; hi: number | null; n: number | null; p: number | null }

export const GROUP_LABEL: Record<string, string> = {
  unclaimed: "Claimed by neither", dsc_only: "Dioscorides only", cul_only: "Culpeper only", persistent: "Both herbals", both: "Both herbals",
};
export const GROUP_ORDER = ["unclaimed", "dsc_only", "cul_only", "persistent", "both"];

function readIntervals(raw: unknown, valueKeys: string[], labelKeys: string[]): Interval[] {
  let rows: { key: string; o: Obj }[] = [];
  if (Array.isArray(raw)) rows = (raw as unknown[]).filter(isObj).map((o, i) => ({ key: String(pick(o, ...labelKeys) ?? `row ${i + 1}`), o }));
  else if (isObj(raw)) {
    const inner = pick(raw, "groups", "terms", "rows", "data");
    if (Array.isArray(inner)) return readIntervals(inner, valueKeys, labelKeys);
    rows = Object.entries(raw).filter(([, v]) => isObj(v)).map(([k, v]) => ({ key: k, o: v as Obj }));
  }
  return rows.map(({ key, o }) => {
    const ci = asArray<unknown>(pick(o, "ci", "ci95", "interval"));
    const lo = num(pick(o, "ci_low", "ci_lo", "lo", "lower", "low", "ci_lower")) ?? num(ci[0]);
    const hi = num(pick(o, "ci_high", "ci_hi", "hi", "upper", "high", "ci_upper")) ?? num(ci[1]);
    return {
      key, label: typeof o["label"] === "string" ? (o["label"] as string) : (GROUP_LABEL[key] ?? key),
      value: num(pick(o, ...valueKeys)) ?? NaN, lo, hi,
      n: num(pick(o, "n", "count", "n_pairs", "n_obs")), p: num(pick(o, "p", "p_value", "pvalue")),
    };
  }).filter((r) => Number.isFinite(r.value));
}

export function readLift(stats: StatsRaw | null | undefined, field: "share" | "median" = "share"): Interval[] {
  const raw = stats?.["lift_by_group"];
  const keys = field === "share" ? ["share_any_paper"] : ["median_lift", "median", "value", "lift"];
  // share_any_paper carries its interval in share_any_paper_ci; the reader looks for "ci".
  const prepared = Array.isArray(raw)
    ? (raw as unknown[]).filter(isObj).map((o) => ({ ...o, ci: field === "share" ? o["share_any_paper_ci"] : (o["median_lift_ci"] ?? o["ci"]), n: o["n_pairs"] ?? o["n"] }))
    : raw;
  const rows = readIntervals(prepared, keys, ["group", "name", "key"]);
  return rows.sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a.key), ib = GROUP_ORDER.indexOf(b.key);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

/** regression is either a list of terms or {logit: [...], poisson: [...], ...}; pick one model. */
export function readRegression(stats: StatsRaw | null | undefined, model = "logit"): Interval[] {
  const raw = stats?.["regression"];
  const list = Array.isArray(raw) ? raw : isObj(raw) ? raw[model] : undefined;
  return readIntervals(list, ["odds_ratio", "or", "OR", "rate_ratio", "value", "estimate"], ["term", "name", "label", "variable"])
    .filter((r) => r.value > 0)
    .map((r) => ({ ...r, label: GROUP_LABEL[r.key] ?? r.label }));
}

export function modelNote(stats: StatsRaw | null | undefined, model: string): string | null {
  const raw = stats?.["regression"];
  const list = isObj(raw) ? raw[model] : null;
  const first = Array.isArray(list) ? (list as unknown[]).find(isObj) : null;
  return first && typeof first["model"] === "string" ? (first["model"] as string) : null;
}

export interface Sensitivity { key: string; label: string; observed: number | null; nullMean: number | null; fold: number | null; p: number | null; nTaxa: number | null }
const SENS_LABEL: Record<string, string> = {
  genus_level: "Matched at genus level", high_confidence_ids_only: "High-confidence identifications only", category_level: "Matched at category level",
};
export function readSensitivity(stats: StatsRaw | null | undefined): Sensitivity[] {
  const raw = stats?.["persistence_sensitivity"];
  if (!isObj(raw)) return [];
  return Object.entries(raw).filter(([, v]) => isObj(v)).map(([k, v]) => {
    const o = v as Obj;
    return {
      key: k, label: SENS_LABEL[k] ?? k.replace(/_/g, " "),
      observed: num(pick(o, "observed_overlap", "observed")), nullMean: num(pick(o, "null_mean")),
      fold: num(pick(o, "fold_enrichment", "fold")), p: num(pick(o, "p_value", "p")), nTaxa: num(pick(o, "n_shared_taxa")),
    };
  });
}

export interface Transmitted { concept_id: string; label: string; category: string | null; both: number; expected: number | null; fold: number | null }
export function readTransmitted(stats: StatsRaw | null | undefined): Transmitted[] {
  return asArray<unknown>(stats?.["top_transmitted"]).filter(isObj).map((o) => ({
    concept_id: String(o["concept_id"] ?? ""), label: String(o["label"] ?? o["concept_id"] ?? ""),
    category: typeof o["category"] === "string" ? (o["category"] as string) : null,
    both: num(o["both"]) ?? 0, expected: num(o["expected"]), fold: num(o["fold"]),
  })).filter((r) => r.concept_id);
}

export interface CategoryRow { category: string; dsc: number; cul: number }
export function readCategories(stats: StatsRaw | null | undefined): CategoryRow[] {
  const raw = stats?.["categories"];
  let rows: CategoryRow[] = [];
  const fromObj = (category: string, o: Obj): CategoryRow => ({
    category,
    dsc: num(pick(o, "dsc", "dioscorides", "n_dsc", "claims_dsc")) ?? 0,
    cul: num(pick(o, "cul", "culpeper", "n_cul", "claims_cul")) ?? 0,
  });
  if (Array.isArray(raw)) rows = (raw as unknown[]).filter(isObj).map((o) => fromObj(String(pick(o, "category", "name", "label") ?? "Other"), o));
  else if (isObj(raw)) rows = Object.entries(raw).filter(([, v]) => isObj(v)).map(([k, v]) => fromObj(k, v as Obj));
  return rows.filter((r) => r.dsc + r.cul > 0).sort((a, b) => b.dsc + b.cul - (a.dsc + a.cul));
}

/** True when the category block already holds shares (each column sums to about 1). */
export function categoriesAreShares(rows: CategoryRow[]): boolean {
  if (!rows.length) return false;
  const d = rows.reduce((a, r) => a + r.dsc, 0), c = rows.reduce((a, r) => a + r.cul, 0);
  return rows.every((r) => r.dsc <= 1 && r.cul <= 1) && d < 1.05 && c < 1.05;
}
