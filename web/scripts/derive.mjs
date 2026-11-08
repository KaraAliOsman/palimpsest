// Derives small, route-sized JSON files from the pipeline export in public/data/.
// The pipeline files are never modified; outputs go to public/data/derived/.
//
//   node scripts/derive.mjs
//
// derived/search.json        one compact row per taxon + every concept (command palette, plant index)
// derived/records/<slug>.json one plant with only its own Greek and English texts (plant pages)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const plants = read("data/plants.json");
const concepts = read("data/concepts.json");
const texts = read("data/texts.json");
const leads = read("data/leads.json");
const credits = existsSync(join(root, "img/credits.json")) ? read("img/credits.json") : { images: [] };

// Must match src/lib/data.ts slugify() and its de-duplication order.
const slugify = (t) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plant";
const fold = (s) => (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ς/g, "σ");

const imagesByTaxon = new Map();
for (const im of credits.images ?? []) for (const t of im.taxa ?? []) {
  if (!imagesByTaxon.has(t)) imagesByTaxon.set(t, []);
  imagesByTaxon.get(t).push(im.id);
}
const leadRank = new Map();
for (const l of leads) if (!leadRank.has(l.taxon)) leadRank.set(l.taxon, l.rank);

const tierOf = (c) => c.evidence_tier ?? (c.epmc_pair == null ? null : c.epmc_pair === 0 ? "unstudied" : c.epmc_pair < 5 ? "sparse" : "studied");
const tierCounts = (claims) => ["unstudied", "sparse", "studied"].map((t) => claims.filter((c) => tierOf(c) === t).length);
const cat = new Map(concepts.map((c) => [c.concept_id, c.category]));
const outDir = join(root, "data/derived");
rmSync(join(outDir, "records"), { recursive: true, force: true });
mkdirSync(join(outDir, "records"), { recursive: true });

const seen = new Set();
const rows = [];
const byConcept = new Map();
let bytes = 0;
for (const p of plants) {
  if (!p || typeof p.taxon !== "string") continue;
  let slug = slugify(p.taxon);
  for (let i = 2; seen.has(slug); i++) slug = `${slugify(p.taxon)}-${i}`;
  seen.add(slug);
  const names = p.names ?? [];
  const grc = names.filter((n) => n.source === "dioscorides").map((n) => n.name);
  const cul = names.find((n) => n.source === "culpeper")?.name ?? null;
  const claims = (p.claims ?? []).filter((c) => c && c.concept_id);
  const persistent = claims.filter((c) => c.persistent).length;
  for (const c of claims) {
    if (!byConcept.has(c.concept_id)) byConcept.set(c.concept_id, []);
    byConcept.get(c.concept_id).push({ slug, w: (c.dsc ?? 0) + (c.cul ?? 0) + (c.persistent ? 4 : 0) });
  }
  rows.push({
    s: slug, t: p.taxon, c: p.common_name ?? null, f: p.family ?? null,
    g: grc, e: cul, n: claims.length, p: persistent, ls: p.lead_score ?? null,
    lr: leadRank.get(p.taxon) ?? null, img: imagesByTaxon.get(p.taxon)?.[0] ?? null,
    k: [...new Set(claims.map((c) => c.concept_id))],
    tc: tierCounts(claims), pe: p.epmc_total ?? null, iu: p.iucn ?? null,
  });
  const own = {};
  for (const n of names) if (n.monograph_id && texts[n.monograph_id]) own[n.monograph_id] = texts[n.monograph_id];
  const rec = JSON.stringify({ slug, plant: p, texts: own, images: imagesByTaxon.get(p.taxon) ?? [] });
  bytes += rec.length;
  writeFileSync(join(outDir, "records", `${slug}.json`), rec);
}

const conceptRows = concepts.map((c) => ({
  id: c.concept_id, l: c.label, cat: c.category, m: c.mesh_id, d: c.n_dsc, u: c.n_cul,
  top: (byConcept.get(c.concept_id) ?? []).sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.slug),
  np: (byConcept.get(c.concept_id) ?? []).length,
}));

const search = JSON.stringify({ generated: new Date().toISOString().slice(0, 10), plants: rows, concepts: conceptRows });
writeFileSync(join(outDir, "search.json"), search);
console.log(`search.json ${(search.length / 1024).toFixed(0)} KB, ${rows.length} plants, ${conceptRows.length} concepts`);
console.log(`records/ ${rows.length} files, ${(bytes / 1024).toFixed(0)} KB total, ${(bytes / rows.length / 1024).toFixed(1)} KB mean`);

// derived/manifest.json: sizes, rows and headers of the repository files the Data page links to (read-only).
import { statSync } from "node:fs";
const repo = join(root, "..", "..");
const FILES = [
  ["kg-nodes", "data/processed/kg/nodes.csv", "Knowledge graph: nodes", "CSV"],
  ["kg-edges", "data/processed/kg/edges.csv", "Knowledge graph: edges, with provenance spans and quotes", "CSV"],
  ["kg-graphml", "data/processed/kg/palimpsest.graphml", "Knowledge graph, all attributes", "GraphML"],
  ["claims", "data/processed/claims.csv", "Every extracted claim with its character span and clause", "CSV"],
  ["pairs", "data/processed/pairs_scored.csv", "Plant–indication pairs with literature counts, lift and tier", "CSV"],
  ["leads", "results/tables/leads.csv", "The 60 published leads with score components", "CSV"],
  ["leads-all", "results/tables/leads_all.csv", "The full lead ranking", "CSV"],
  ["compounds", "data/processed/taxon_compounds.csv", "LOTUS constituents per taxon (InChIKey, ChEMBL)", "CSV"],
  ["taxa", "data/processed/monograph_taxa.csv", "Chapter and monograph to taxon concordance", "CSV"],
  ["stats", "results/stats.json", "All test statistics behind the Findings page", "JSON"],
  ["extraction-eval", "results/extraction_eval.json", "Blind extraction evaluation (P, R, F1, CIs)", "JSON"],
];
const manifest = FILES.map(([id, path, what, format]) => {
  const abs = join(repo, path);
  if (!existsSync(abs)) return { id, path, what, format, bytes: null, rows: null, columns: null };
  const bytes = statSync(abs).size;
  let rows = null, columns = null;
  if (format === "CSV") {
    const txt = readFileSync(abs, "utf8");
    columns = txt.slice(0, txt.indexOf("\n")).trim().split(",");
    // count records, not physical lines: quoted clauses can hold newlines
    let n = 0, q = false;
    for (let i = 0; i < txt.length; i++) { const c = txt.charCodeAt(i); if (c === 34) q = !q; else if (c === 10 && !q) n++; }
    rows = Math.max(0, n - 1);
  }
  return { id, path, what, format, bytes, rows, columns };
});
writeFileSync(join(outDir, "manifest.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), files: manifest }, null, 1));
console.log("manifest.json", manifest.map((m) => `${m.id}:${m.bytes}`).join(" "));
