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

// ---- read-only repository inputs (data/processed, data/lexicons) for glosses, queries and the survival flow
const repoRoot = join(root, "..", "..");
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f.replace(/\r$/, "")); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift() ?? [];
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ""])));
}
const readCSV = (p) => (existsSync(join(repoRoot, p)) ? parseCSV(readFileSync(join(repoRoot, p), "utf8")) : []);
const termsGrc = readCSV("data/lexicons/terms_grc.csv");
const termsEn = readCSV("data/lexicons/terms_en.csv");
const conceptCsv = readCSV("data/lexicons/concepts.csv");
const claimRows = readCSV("data/processed/claims.csv");
const glossOf = new Map();
for (const t of [...termsGrc, ...termsEn]) glossOf.set(`${t.concept_id}\u0000${t.pattern}`, t.gloss || null);
// (monograph, start) -> literal gloss of the lexicon entry that produced the span
const spanGloss = new Map();
for (const c of claimRows) {
  const g = glossOf.get(`${c.concept_id}\u0000${c.pattern}`);
  if (!g) continue;
  if (!spanGloss.has(c.monograph_id)) spanGloss.set(c.monograph_id, {});
  spanGloss.get(c.monograph_id)[c.start] = g;
}
const epmcTerms = new Map(conceptCsv.map((c) => [c.concept_id, (c.epmc_terms || "").split("|").filter(Boolean)]));

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
  const gloss = {};
  for (const n of names) if (n.monograph_id && texts[n.monograph_id]) {
    own[n.monograph_id] = texts[n.monograph_id];
    if (spanGloss.has(n.monograph_id)) gloss[n.monograph_id] = spanGloss.get(n.monograph_id);
  }
  const rec = JSON.stringify({ slug, plant: p, texts: own, gloss, images: imagesByTaxon.get(p.taxon) ?? [] });
  bytes += rec.length;
  writeFileSync(join(outDir, "records", `${slug}.json`), rec);
}

const conceptRows = concepts.map((c) => ({
  id: c.concept_id, l: c.label, cat: c.category, m: c.mesh_id, d: c.n_dsc, u: c.n_cul,
  top: (byConcept.get(c.concept_id) ?? []).sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.slug),
  np: (byConcept.get(c.concept_id) ?? []).length,
  q: epmcTerms.get(c.concept_id) ?? [],
}));

// derived/flow.json: the survival flow. Universe = species with a Dioscorides chapter and a Culpeper monograph
// (the 136 shared species of the transmission test); one row per plant–indication claim.
{
  const cIdx = new Map(concepts.map((c, i) => [c.concept_id, i]));
  const G = { kept: 0, dropped: 1, added: 2 }, T = { unstudied: 0, sparse: 1, studied: 2 };
  const fp = [], fr = [];
  let k = 0;
  for (const p of plants) {
    const names = p.names ?? [];
    if (p.rank !== "species" || !names.some((n) => n.source === "dioscorides") || !names.some((n) => n.source === "culpeper")) continue;
    const s = rows.find((r) => r.t === p.taxon)?.s ?? slugify(p.taxon);
    let used = false;
    for (const c of p.claims ?? []) {
      const g = c.persistent ? "kept" : (c.dsc ?? 0) > 0 ? "dropped" : (c.cul ?? 0) > 0 ? "added" : null;
      const t = tierOf(c);
      if (!g || !(t in T) || !cIdx.has(c.concept_id)) continue;
      fr.push([k, cIdx.get(c.concept_id), G[g], T[t]]);
      used = true;
    }
    if (used) { fp.push([s, p.taxon, p.common_name ?? null]); k++; }
  }
  const flow = { generated: new Date().toISOString().slice(0, 10), groups: Object.keys(G), tiers: Object.keys(T),
    concepts: concepts.map((c) => [c.concept_id, c.label, c.category]), plants: fp, rows: fr };
  writeFileSync(join(outDir, "flow.json"), JSON.stringify(flow));
  const tally = [0, 0, 0]; for (const r of fr) tally[r[2]]++;
  console.log(`flow.json ${fp.length} species, ${fr.length} claims (kept ${tally[0]}, dropped ${tally[1]}, added ${tally[2]})`);
}

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

// derived/leads_meta.json: what the leads list and the dossiers need beyond leads.json: identification confidence
// for each herbal's name, the taxon rank, and the exact Europe PMC query the pipeline ran for the pair.
{
  const phrase = (t) => `"${String(t).replace(/"/g, " ").replace(/\s+/g, " ").trim()}"`;
  const conceptQuery = (terms) => {
    const seen = new Set(), ps = [];
    for (const t of terms) { const p = phrase(t); if (!seen.has(p.toLowerCase())) { seen.add(p.toLowerCase()); ps.push(p); } }
    const inner = ps.length === 1 ? ps[0] : `(${ps.join(" OR ")})`;
    return `(TITLE_ABS:${inner} OR KW:${inner})`;
  };
  const meta = leads.map((l) => {
    const p = plants.find((x) => x.taxon === l.taxon);
    const nm = (id) => p?.names?.find((n) => n.monograph_id === id) ?? null;
    const terms = epmcTerms.get(l.concept_id) ?? [];
    return {
      rank: l.rank, taxon: l.taxon, concept_id: l.concept_id, slug: rows.find((r) => r.t === l.taxon)?.s ?? slugify(l.taxon),
      taxon_rank: p?.rank ?? null, dsc_conf: nm(l.dsc_ref)?.confidence ?? null, cul_conf: nm(l.cul_ref)?.confidence ?? null,
      dsc_name: nm(l.dsc_ref)?.name ?? null, cul_name: nm(l.cul_ref)?.name ?? null,
      query: terms.length ? `${phrase(l.taxon) && `(TITLE_ABS:${phrase(l.taxon)} OR KW:${phrase(l.taxon)})`} AND ${conceptQuery(terms)}` : null,
    };
  });
  writeFileSync(join(outDir, "leads_meta.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), leads: meta }));
  console.log(`leads_meta.json ${meta.length} leads; confidence: ${["high", "medium", "low"].map((c) => `${c} ${meta.filter((m) => [m.dsc_conf, m.cul_conf].includes(c)).length}`).join(", ")}`);
}

// src/generated/inline.json: the numbers and the hero passage the landing needs on first paint, so nothing
// renders as "n/a" while the JSON files load. Everything is copied from the files above, never typed in.
{
  const summary = read("data/summary.json");
  const stats = read("data/stats.json");
  const lead = leads.find((l) => l.rank === 1) ?? leads[0];
  const rec = plants.find((p) => p.taxon === lead.taxon);
  const dId = lead.dsc_ref, cId = lead.cul_ref;
  const dT = texts[dId]?.text ?? "", cT = texts[cId]?.text ?? "";
  const at = (text, needle, from = 0) => { const i = text.indexOf(needle, from); if (i < 0) throw new Error(`hero: “${needle}” not found`); return i; };
  // Culpeper: the sentence that carries the eye claim. Dioscorides: the clause with the same recipe (juice, fennel, honey).
  const cs = (texts[cId]?.spans ?? []).find((s) => s.concept_id === lead.concept_id);
  const cStart = cT.lastIndexOf(".", cs.start) + 1, cEnd = cT.indexOf(".", cs.end) + 1;
  const dSpan = (texts[dId]?.spans ?? []).filter((s) => s.concept_id === lead.concept_id).find((s) => dT.slice(s.start, s.start + 160).includes("μαράθου"));
  const dHead = at(dT, "ὁ δὲ χυλὸς", dSpan.start - 140);
  const dTailWord = "ἐγχριόμενος";
  const dEnd = at(dT, dTailWord, dSpan.start) + dTailWord.length;
  const mark = (text, base, words) => words.map(([k, w]) => { const i = at(text, w, base); return { k, s: i, e: i + w.length }; });
  const hero = {
    taxon: lead.taxon, slug: slugify(lead.taxon), rank: lead.rank, concept_id: lead.concept_id, label: lead.label,
    common: rec?.common_name ?? null, papers_pair: lead.epmc_pair, papers_plant: lead.epmc_taxon, compounds: lead.n_compounds,
    warn: !!lead.flag_historical_safety,
    names: { dsc: rec?.names?.find((n) => n.monograph_id === dId)?.name ?? null, cul: rec?.names?.find((n) => n.monograph_id === cId)?.name ?? null, dsc_conf: rec?.names?.find((n) => n.monograph_id === dId)?.confidence ?? null },
    cul: { ref: cId, title: texts[cId]?.headword ?? null, start: cStart, text: cT.slice(cStart, cEnd).trim(), lead: cT.slice(cStart, cEnd).search(/\S/),
      marks: mark(cT, cStart, [["juice", "juice"], ["fennel", "fennel"], ["honey", "honey"], ["eye", cT.slice(cs.start, cs.end)]]) },
    dsc: { ref: dId, head: dT.slice(dHead, dHead + "ὁ δὲ χυλὸς".length), headStart: dHead, start: dSpan.start, text: dT.slice(dSpan.start, dEnd),
      marks: mark(dT, dHead, [["juice", "χυλὸς"], ["eye", "ἀμβλυωπίαις"], ["fennel", "μαράθου"], ["honey", "μέλιτος"]]) },
    query: `${'(TITLE_ABS:"' + lead.taxon + '" OR KW:"' + lead.taxon + '")'} AND (TITLE_ABS:(${(epmcTerms.get(lead.concept_id) ?? []).map((t) => `"${t}"`).join(" OR ")}) OR KW:(${(epmcTerms.get(lead.concept_id) ?? []).map((t) => `"${t}"`).join(" OR ")}))`,
  };
  const p = stats.persistence ?? {}, ps = stats.persistence_sensitivity ?? {};
  const grp = (k) => (stats.lift_by_group ?? []).find((g) => g.group === k) ?? {};
  const reg = (m, k) => (stats.regression?.[m] ?? []).find((r) => r.term === k) ?? {};
  const inline = {
    generated: summary.generated ?? null,
    counts: summary.counts ?? {},
    persistence: { observed: p.observed_overlap, nullMean: p.null_mean, q: p.null_q, fold: p.fold_enrichment, p: p.p_value, nPerm: p.n_perm, nTaxa: p.n_shared_taxa },
    size: ps.size_stratified?.fold_enrichment ?? null, family: ps.within_family?.fold_enrichment ?? null,
    shareBoth: grp("both").share_any_paper ?? null, matchedBoth: grp("both").matched_unclaimed_share ?? null,
    or: { v: reg("logit", "both").odds_ratio ?? null, ci: reg("logit", "both").ci ?? null },
    rr: { v: reg("poisson", "both").rate_ratio ?? null, ci: reg("poisson", "both").ci ?? null },
    leads: leads.length,
    hero,
    tests: (() => {
      const f = join(root, "data/extra/tests_ledger.json");
      if (!existsSync(f)) return null;
      try { const t = JSON.parse(readFileSync(f, "utf8")); return { n: t.n_tests ?? (t.tests ?? []).length, counts: t.counts ?? null }; } catch { return null; }
    })(),
    // Expert benchmark (data/extra, written by the evaluation step): only the headline travels inline.
    bench: (() => {
      const f = join(root, "data/extra/expert_benchmark.json");
      if (!existsSync(f)) return null;
      try {
        const b = JSON.parse(readFileSync(f, "utf8")), h = b.headline ?? {};
        const pick = (o) => (o && typeof o.share === "number" ? { k: o.k, n: o.n, share: o.share, ci: o.ci95 ?? null } : null);
        return { species: pick(h.species_top1), speciesRank: pick(h.species_top1_species_rank_ids), genus: pick(h.genus_top1),
          staples: b.staples_check ? { n: b.staples_check.n, ok: b.staples_check.n_correct } : null, chapters: b.gold?.n_chapters_matched ?? null };
      } catch { return null; }
    })(),
  };
  mkdirSync(join(root, "..", "src", "generated"), { recursive: true });
  writeFileSync(join(root, "..", "src", "generated", "inline.json"), JSON.stringify(inline, null, 1));
  console.log("src/generated/inline.json", JSON.stringify(inline).length, "bytes; hero", hero.taxon, hero.cul.text.slice(0, 40), "|", hero.dsc.text.slice(0, 40));
}
