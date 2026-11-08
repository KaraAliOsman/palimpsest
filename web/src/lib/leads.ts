// Identification certainty for the leads: what the dossier and the certainty slider share.
import { asArray, num, useResource, type Lead } from "./data";

export interface LeadMeta {
  rank: number; taxon: string; concept_id: string; slug: string; taxon_rank: string | null;
  dsc_conf: string | null; cul_conf: string | null; dsc_name: string | null; cul_name: string | null; query: string | null;
}
export interface LeadsMeta { generated?: string; leads: LeadMeta[] }

/** Confidence level -> weight. A genus-level identification is weaker than a species-level one. */
export const CONF_WEIGHT: Record<string, number> = { high: 1, medium: 0.6, low: 0.3 };
export const GENUS_FACTOR = 0.6;

export function certaintyOf(m: LeadMeta | undefined): number {
  if (!m) return 0.5;
  const w = Math.min(CONF_WEIGHT[m.dsc_conf ?? ""] ?? 0.5, CONF_WEIGHT[m.cul_conf ?? ""] ?? 0.5);
  return m.taxon_rank && m.taxon_rank !== "species" ? w * GENUS_FACTOR : w;
}

/** Weights published by the evaluation step (data/extra/uncertainty_leads.json), in any of the shapes it may take. */
export function readExtraWeights(raw: unknown): Map<string, { weight: number; mechanism?: string | null }> {
  const out = new Map<string, { weight: number; mechanism?: string | null }>();
  const rows = Array.isArray(raw) ? raw : asArray<unknown>((raw as Record<string, unknown> | null)?.["leads"] ?? (raw as Record<string, unknown> | null)?.["weights"]);
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const w = num(o["weight"] ?? o["certainty"] ?? o["p_species"] ?? o["w"]);
    if (w === null) continue;
    const rk = o["rank_published"] ?? o["rank"];
    const key = rk != null ? `r${rk}` : `${o["taxon"]}|${o["concept_id"]}`;
    const mech = (o["mechanism"] ?? o["mechanism_path"] ?? null) as string | null;
    out.set(key, { weight: Math.max(0, Math.min(1, w)), mechanism: typeof mech === "string" ? mech : null });
  }
  return out;
}

export function useLeadCertainty() {
  const meta = useResource<LeadsMeta>("derived/leads_meta.json");
  const extra = useResource<unknown>("extra/uncertainty_leads.json");
  const byRank = new Map((meta.data?.leads ?? []).map((m) => [m.rank, m]));
  const ext = extra.status === "ready" ? readExtraWeights(extra.data) : new Map();
  const weight = (l: Lead): number => {
    const e = ext.get(`r${l.rank}`) ?? ext.get(`${l.taxon}|${l.concept_id}`);
    return e ? e.weight : certaintyOf(byRank.get(l.rank ?? -1));
  };
  const mechanism = (l: Lead): string | null => (ext.get(`r${l.rank}`) ?? ext.get(`${l.taxon}|${l.concept_id}`))?.mechanism ?? null;
  const x = extra.status === "ready" ? (extra.data as Record<string, unknown>) : null;
  const prim = (x?.["primary"] ?? null) as { tau_all_candidates?: { tau_b?: number; n?: number }; tau_published_top60?: { tau_b?: number }; n_top60_kept?: number } | null;
  const summary = prim ? { tauAll: num(prim.tau_all_candidates?.tau_b), nAll: num(prim.tau_all_candidates?.n), tauTop: num(prim.tau_published_top60?.tau_b), kept: num(prim.n_top60_kept), firstLeft: asArray<Record<string, unknown>>(x?.["left_top60"]).some((r) => r["rank_published"] === 1) } : null;
  return { meta: byRank, weight, mechanism, fromExtra: ext.size > 0, summary, ready: meta.status !== "loading" };
}

/** Kendall's tau-b between two rankings of the same items (1 = identical order). */
export function kendallTau(a: number[], b: number[]): number {
  const n = a.length;
  let c = 0, d = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const s = Math.sign(a[i] - a[j]) * Math.sign(b[i] - b[j]);
    if (s > 0) c++; else if (s < 0) d++;
  }
  const t = (n * (n - 1)) / 2;
  return t ? (c - d) / t : 1;
}

/** The pipeline's exact Europe PMC pair query (src/palimpsest/sources/europepmc.py), as a search URL. */
export const epmcSearchUrl = (q: string) => `https://europepmc.org/search?query=${encodeURIComponent(q)}`;
