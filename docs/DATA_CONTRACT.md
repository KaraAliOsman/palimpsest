# Data contract

Every pipeline step reads and writes these files. Column names are fixed; add
columns only at the end. All CSVs are UTF-8, comma-separated, with a header.

## 1. Corpus — `data/interim/monographs.jsonl` (built by `palimpsest corpus`)

One JSON object per monograph (a Dioscorides chapter or a Culpeper herb):

| field | type | notes |
|---|---|---|
| `id` | str | `dsc:<book>.<chapter>` or `cul:<nnn>-<slug>` |
| `source` | str | `dioscorides` \| `culpeper` |
| `lang` | str | `grc` \| `en` |
| `ref` | str | human citation |
| `headword` | str | lemma as printed (Greek) / title-cased heading (English) |
| `synonyms` / `names` | list[str] | alternative names found in the opening |
| `text` | str | full monograph text (apparatus notes removed) |
| `analysis_text` | str | the part mined for indications (Culpeper: *Government and virtues*) |
| `sections` | dict | Culpeper only: `intro`, `description`, `place`, `time`, `virtues` |

## 2. Concepts — `data/lexicons/concepts.csv`

`concept_id,label,category,mesh_label,epmc_terms` (+ `mesh_id`, `mesh_ui_label` once
verified). `epmc_terms` is a `|`-separated list of English search terms used to
query modern literature. **Only concept_ids in this file may be used anywhere.**

## 3. Term lexicons — `data/lexicons/terms_grc.csv`, `data/lexicons/terms_en.csv`

| column | notes |
|---|---|
| `concept_id` | from concepts.csv |
| `pattern` | Python regex. Greek: matched against `textnorm.normalize_greek(text)` (lower-case, no accents/breathings, final ς→σ). English: matched against lower-cased text. Use `\b` / stems deliberately. |
| `polarity` | `therapeutic` (treats/relieves), `adverse` (causes/harms), `action` (pharmacological action that implies the concept, e.g. emmenagogue) |
| `example` | an attested surface form |
| `gloss` | English meaning |
| `note` | ambiguity / source (LSJ, OED, etc.) |

## 4. Plant identifications — `data/curated/taxa_dioscorides.csv`, `data/curated/taxa_culpeper.csv`

`monograph_id,headword,kind,scientific_name,rank,confidence,alternatives,common_name_en,note`

* `kind`: `plant` \| `fungus` \| `animal` \| `mineral` \| `product` (wine, oil, preparation, gum from unknown source) \| `other`
* `scientific_name`: binomial without authority (`Artemisia absinthium`), or genus (`Allium`) when only genus is defensible; empty if not a plant/fungus.
* `rank`: `species` \| `genus` \| `family` \| `unknown`
* `confidence`: `high` (standard, uncontroversial identification) \| `medium` (mainstream but debated) \| `low` (speculative)
* `alternatives`: `;`-separated other candidate binomials
* `note`: ≤ 25 words, justification (e.g. "Wellmann/Beck: wormwood; description fits")

## 5. Reference annotations — `data/annotations/reference_<source>.csv`

`monograph_id,concept_id,polarity,evidence,annotator_note`

Blind manual (AI-assisted) annotation of a random sample of monographs, made
**without** looking at the term lexicons; used to measure extractor
precision/recall. `evidence` is a verbatim quote from the monograph.

## 6. Extracted claims — `data/processed/claims.csv` (built by `palimpsest extract`)

`claim_id,monograph_id,source,concept_id,polarity,match,start,end,clause`

## 7. Modern evidence — `data/processed/evidence_pairs.csv`, `taxon_*.csv`

Built by `palimpsest evidence` from Europe PMC, ClinicalTrials.gov, GBIF,
Wikidata/LOTUS. Raw API responses are cached under `data/cache/` (keyed by URL
hash) so a re-run is offline and deterministic.
