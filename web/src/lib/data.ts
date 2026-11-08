// Data contract: docs/WEB_DATA.md. Every field is treated as optional so a
// partial or older export still renders; nothing here throws on a missing key.
import { useCallback, useEffect, useState } from "react";

export type Tier = "unstudied" | "sparse" | "studied";

export interface HeadlineItem { value?: string | number; label?: string; detail?: string }
export interface EvalScores { precision?: number | null; recall?: number | null; f1?: number | null; n?: number | null; n_monographs?: number | null; precision_ci?: number[] | null; recall_ci?: number[] | null }
export interface Summary {
  generated?: string;
  mock?: boolean;
  counts?: Partial<Record<
    "dsc_chapters" | "cul_monographs" | "taxa" | "taxa_shared" | "claims" | "claims_dsc" | "claims_cul" |
    "concepts" | "persistent_pairs" | "papers_queried" | "pairs_queried" | "compounds", number | null>>;
  headline?: HeadlineItem[];
  extraction_eval?: Record<string, EvalScores | null | undefined>;
  naming_eval?: Record<string, unknown>;
}

export interface Concept {
  concept_id: string; label?: string; category?: string; mesh_id?: string | null;
  n_dsc?: number | null; n_cul?: number | null;
}

export interface PlantName { source?: string; name?: string; monograph_id?: string | null; confidence?: string | null; note?: string | null }
export interface Claim {
  concept_id: string; dsc?: number | null; cul?: number | null; persistent?: boolean | null;
  epmc_pair?: number | null; lift?: number | null; evidence_tier?: Tier | string | null;
}
export interface Compound { name?: string; qid?: string | null }
export interface Plant {
  taxon: string; family?: string | null; rank?: string | null;
  gbif_key?: number | string | null; wikidata?: string | null; iucn?: string | null; gbif_occurrences?: number | null;
  common_name?: string | null; names?: PlantName[] | null;
  n_compounds?: number | null; top_compounds?: Compound[] | null;
  epmc_total?: number | null; trials?: number | null;
  claims?: Claim[] | null; lead_score?: number | null;
}

export interface Span { start: number; end: number; concept_id: string; polarity?: string | null }
export interface TextEntry { ref?: string; headword?: string; lang?: string; text?: string; spans?: Span[] | null }
export type Texts = Record<string, TextEntry | undefined>;

export interface Lead {
  rank?: number; taxon: string; concept_id: string; score?: number | null;
  dsc_quote?: string | null; cul_quote?: string | null; epmc_pair?: number | null;
  n_compounds?: number | null; iucn?: string | null; why?: string | null;
  label?: string | null; dsc_ref?: string | null; cul_ref?: string | null; epmc_taxon?: number | null;
  flag_historical_safety?: boolean | null; flag_threatened?: boolean | null;
}

/** Naming agreement: {greek: {agreement}} or a flat {wikidata_grc_agreement}. */
export function namingAgreement(ne: Record<string, unknown> | undefined, lang: "greek" | "english"): { rate: number | null; n: number | null } {
  if (!ne) return { rate: null, n: null };
  const o = ne[lang];
  if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    return { rate: num(r["agreement"]), n: num(r["n_checked"]) };
  }
  return { rate: num(ne[lang === "greek" ? "wikidata_grc_agreement" : "gbif_vernacular_agreement"]), n: null };
}

/** Quotations sometimes open on an edition section number ("2 δύναται"); drop it. */
export function cleanQuote(q: string | null | undefined): string {
  return (q ?? "").replace(/^\s*\d{1,2}\s+/, "").replace(/\s+\d{1,2}\s+/g, " ").trim();
}

export type StatsRaw = Record<string, unknown>;

// ---------------------------------------------------------------- loading

const cache = new Map<string, Promise<unknown>>();

export function dataUrl(name: string): string {
  const base = import.meta.env.BASE_URL || "./";
  return `${base.endsWith("/") ? base : base + "/"}data/${name}`;
}

export function load<T>(name: string): Promise<T> {
  let p = cache.get(name) as Promise<T> | undefined;
  if (!p) {
    p = fetch(dataUrl(name), { cache: "no-cache" }).then(async (r) => {
      if (!r.ok) throw new Error(`${name} answered ${r.status} ${r.statusText}`.trim());
      return (await r.json()) as T;
    });
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}

export type Resource<T> =
  | { status: "loading"; data?: undefined; error?: undefined; retry: () => void }
  | { status: "error"; data?: undefined; error: Error; retry: () => void }
  | { status: "ready"; data: T; error?: undefined; retry: () => void };

export function useResource<T>(name: string | null): Resource<T> {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ status: "loading" | "error" | "ready"; data?: T; error?: Error }>({ status: "loading" });
  const retry = useCallback(() => { if (name) cache.delete(name); setTick((t) => t + 1); }, [name]);
  useEffect(() => {
    if (!name) return;
    let alive = true;
    setState((s) => (s.status === "ready" ? s : { status: "loading" }));
    load<T>(name).then(
      (data) => { if (alive) setState({ status: "ready", data }); },
      (error: unknown) => { if (alive) setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) }); },
    );
    return () => { alive = false; };
  }, [name, tick]);
  return { ...state, retry } as Resource<T>;
}

// ---------------------------------------------------------------- helpers

const EMPTY: readonly never[] = Object.freeze([]);
/** Arrays pass through; anything else becomes one shared empty array (stable for memo deps). */
export function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : (EMPTY as unknown as T[]);
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function slugify(taxon: string): string {
  return taxon.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plant";
}

/** Fold case, accents, breathings and final sigma so ἀψίνθιον, αψινθιον and ΑΨΙΝΘΙΟΝ all meet. */
export function fold(s: string | null | undefined): string {
  if (!s) return "";
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ς/g, "σ").replace(/[’']/g, "'");
}

export function tierOf(claim: Claim): Tier | null {
  const t = claim.evidence_tier;
  if (t === "unstudied" || t === "sparse" || t === "studied") return t;
  const n = num(claim.epmc_pair);
  if (n === null) return null;
  return n === 0 ? "unstudied" : n < 5 ? "sparse" : "studied";
}

export const TIERS: Tier[] = ["unstudied", "sparse", "studied"];
export const TIER_LABEL: Record<Tier, string> = { unstudied: "Unstudied", sparse: "Sparse", studied: "Studied" };
export const TIER_NOTE: Record<Tier, string> = { unstudied: "0 papers", sparse: "1 to 4 papers", studied: "5 or more papers" };

export const IUCN: Record<string, string> = {
  EX: "Extinct", EW: "Extinct in the wild", CR: "Critically endangered", EN: "Endangered", VU: "Vulnerable",
  NT: "Near threatened", LC: "Least concern", DD: "Data deficient", NE: "Not evaluated",
};
export const THREATENED = new Set(["CR", "EN", "VU"]);

export interface PlantIndex {
  plant: Plant;
  slug: string;
  dscName: PlantName | null;
  dscNames: PlantName[];
  culName: PlantName | null;
  haystack: string;
  categories: Set<string>;
  tiers: Set<Tier>;
  tierCounts: Record<Tier, number>;
  nClaims: number;
  nPersistent: number;
  persistentUnder: number;
}

type Indexed = { list: PlantIndex[]; bySlug: Map<string, PlantIndex> };
const indexCache = new WeakMap<object, WeakMap<object, Indexed>>();

export function indexPlants(plants: Plant[], concepts: Concept[]): Indexed {
  let inner = indexCache.get(plants);
  if (!inner) { inner = new WeakMap(); indexCache.set(plants, inner); }
  const hit = inner.get(concepts);
  if (hit) return hit;
  const cmap = conceptMap(concepts);
  const bySlug = new Map<string, PlantIndex>();
  const list: PlantIndex[] = [];
  for (const plant of plants) {
    if (!plant || typeof plant.taxon !== "string") continue;
    let slug = slugify(plant.taxon);
    for (let i = 2; bySlug.has(slug); i++) slug = `${slugify(plant.taxon)}-${i}`;
    const names = asArray<PlantName>(plant.names);
    const dscNames = names.filter((n) => n?.source === "dioscorides");
    const dscName = dscNames[0] ?? null;
    const culName = names.find((n) => n?.source === "culpeper") ?? null;
    const claims = asArray<Claim>(plant.claims).filter((c) => c && c.concept_id);
    const categories = new Set<string>();
    const tiers = new Set<Tier>();
    const tierCounts: Record<Tier, number> = { unstudied: 0, sparse: 0, studied: 0 };
    let nPersistent = 0, persistentUnder = 0;
    for (const c of claims) {
      const cat = cmap.get(c.concept_id)?.category;
      if (cat) categories.add(cat);
      const t = tierOf(c);
      if (t) { tiers.add(t); tierCounts[t]++; }
      if (c.persistent) { nPersistent++; if (t !== "studied") persistentUnder++; }
    }
    const haystack = fold([plant.taxon, plant.common_name, plant.family, ...names.map((n) => n?.name)].filter(Boolean).join(" | "));
    const entry: PlantIndex = { plant, slug, dscName, dscNames, culName, haystack, categories, tiers, tierCounts, nClaims: claims.length, nPersistent, persistentUnder };
    bySlug.set(slug, entry);
    list.push(entry);
  }
  const out = { list, bySlug };
  inner.set(concepts, out);
  return out;
}

const conceptCache = new WeakMap<object, Map<string, Concept>>();
export function conceptMap(concepts: Concept[]): Map<string, Concept> {
  const hit = conceptCache.get(concepts);
  if (hit) return hit;
  const m = new Map<string, Concept>();
  for (const c of asArray<Concept>(concepts)) if (c && c.concept_id) m.set(c.concept_id, c);
  conceptCache.set(concepts, m);
  return m;
}

export function conceptLabel(m: Map<string, Concept>, id: string): string {
  const c = m.get(id);
  if (c?.label) return c.label;
  return id.replace(/_/g, " ").replace(/^\w/, (x) => x.toUpperCase());
}

/** dsc:3.23 -> {book: 3, chapter: "23"} */
export function dscRef(id: string | null | undefined): { book: string; chapter: string } | null {
  const m = /^dsc:(\d+)\.(\w+)/.exec(id ?? "");
  return m ? { book: m[1], chapter: m[2] } : null;
}

export const links = {
  gbif: (p: Plant) => (p.gbif_key ? `https://www.gbif.org/species/${encodeURIComponent(String(p.gbif_key))}` : `https://www.gbif.org/species/search?q=${encodeURIComponent(p.taxon)}`),
  wikidata: (p: Plant) => (p.wikidata ? `https://www.wikidata.org/wiki/${encodeURIComponent(p.wikidata)}` : `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(p.taxon)}`),
  epmc: (taxon: string, term?: string) => `https://europepmc.org/search?query=${encodeURIComponent(term ? `"${taxon}" AND "${term}"` : `"${taxon}"`)}`,
  trials: (taxon: string) => `https://clinicaltrials.gov/search?term=${encodeURIComponent(taxon)}`,
  scaife: (id: string | null | undefined) => {
    const r = dscRef(id);
    return r ? `https://scaife.perseus.org/reader/urn:cts:greekLit:tlg0656.tlg001.1st1K-grc1:${r.book}.${r.chapter}/` : null;
  },
  gutenberg: "https://www.gutenberg.org/ebooks/49513",
  wikidataItem: (qid: string) => `https://www.wikidata.org/wiki/${encodeURIComponent(qid)}`,
  mesh: (id: string) => `https://meshb.nlm.nih.gov/record/ui?ui=${encodeURIComponent(id)}`,
};
