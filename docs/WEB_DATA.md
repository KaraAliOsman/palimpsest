# Web explorer data contract (`web/public/data/`)

Written by `palimpsest export-web`; read by the static explorer. All JSON, UTF-8.

## `summary.json`
```json
{
  "generated": "2026-11-08T08:00:00Z",
  "counts": {"dsc_chapters": 623, "cul_monographs": 328, "taxa": 512, "taxa_shared": 140,
              "claims": 6100, "claims_dsc": 3200, "claims_cul": 2900, "concepts": 88,
              "persistent_pairs": 410, "papers_queried": 15000},
  "headline": [
    {"value": "3.1×", "label": "Culpeper repeats Dioscorides' indications 3.1× more often than chance", "detail": "permutation p < 0.001"},
    {"value": "1.8×", "label": "...", "detail": "..."}
  ],
  "extraction_eval": {"dioscorides": {"precision": 0.86, "recall": 0.71, "f1": 0.78, "n": 50},
                       "culpeper": {"precision": 0.9, "recall": 0.75, "f1": 0.82, "n": 50}},
  "naming_eval": {"wikidata_grc_agreement": 0.8, "gbif_vernacular_agreement": 0.77}
}
```

## `concepts.json`
`[{"concept_id": "jaundice", "label": "Jaundice", "category": "Hepatobiliary", "mesh_id": "D007565", "n_dsc": 40, "n_cul": 55}]`

## `plants.json` (one entry per accepted taxon)
```json
[{
  "taxon": "Artemisia absinthium", "family": "Asteraceae", "rank": "species",
  "gbif_key": 3120060, "wikidata": "Q155950", "iucn": "LC", "gbif_occurrences": 120345,
  "common_name": "Wormwood",
  "names": [{"source": "dioscorides", "name": "ἀψίνθιον", "monograph_id": "dsc:3.23", "confidence": "high"},
            {"source": "culpeper", "name": "Wormwood", "monograph_id": "cul:327-wormwood", "confidence": "high"}],
  "n_compounds": 214, "top_compounds": [{"name": "thujone", "qid": "Q407467"}],
  "epmc_total": 1450, "trials": 3,
  "claims": [{"concept_id": "jaundice", "dsc": 1, "cul": 2, "persistent": true,
               "epmc_pair": 12, "lift": 4.2, "evidence_tier": "studied"}],
  "lead_score": 0.73
}]
```
`evidence_tier` ∈ `unstudied` (0 papers), `sparse` (1–4), `studied` (≥5).

## `texts.json`
`{"dsc:3.23": {"ref": "De materia medica 3.23", "headword": "ἀψίνθιον", "lang": "grc", "text": "...",
  "spans": [{"start": 120, "end": 131, "concept_id": "jaundice", "polarity": "therapeutic"}]}}`
(Culpeper `text` is the *Government and virtues* section; offsets refer to that string.)

## `leads.json`
Top-ranked persistent but under-studied plant–indication pairs:
`[{"rank": 1, "taxon": "...", "concept_id": "...", "score": 0.81, "dsc_quote": "...", "cul_quote": "...",
   "epmc_pair": 0, "n_compounds": 80, "iucn": "LC", "why": "..."}]`

## `stats.json`
Inputs for charts: `persistence` (observed vs permuted null distribution), `lift_by_group`
(`unclaimed`/`dsc_only`/`cul_only`/`persistent` medians + CIs), `regression` (odds ratios + CIs),
`categories` (claims per category per source).

## `graph.json`
`{"nodes": [{"id": "taxon:Artemisia absinthium", "type": "taxon", "label": "..."}],
  "links": [{"source": "...", "target": "...", "type": "claimed_for", "sources": ["dsc", "cul"]}]}`
