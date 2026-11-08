# Palimpsest

**Reading 2,000 years of herbal medicine against modern evidence.**
EthnoHack 2026 · Track 1 — Traditional knowledge (with bridges to Track 2 drug discovery and Track 3 conservation)

**Explorer:** https://karaaliosman.github.io/palimpsest/ · **Code & data:** this repository · **Methods:** [docs/METHODS.md](docs/METHODS.md) · **Related work:** [docs/related_work.md](docs/related_work.md)

> A palimpsest is a manuscript whose text was scraped off and written over — yet the older
> layer still shows through. European herbal medicine is exactly that: Culpeper (1653)
> wrote over Galen, who wrote over Dioscorides (c. 60 CE). Palimpsest recovers those layers
> computationally, from the **original Greek**, and asks which ancient claims survived
> 1,600 years of copying — and whether modern science has looked at them.

## Key results

| | |
|---|---|
| **Corpus** | 822 Greek chapters of Dioscorides + 328 Culpeper monographs → 693 accepted taxa (468 species in Dioscorides, 315 in Culpeper, 133 shared) |
| **Claims** | 10,299 provenance-anchored indication mentions (85 MeSH-linked concepts) |
| **Extraction accuracy** (blind reference, 50 + 49 monographs) | Ancient Greek **F1 0.86** (P 0.88, R 0.83) · Early Modern English **F1 0.9** (P 0.9, R 0.9) |
| **Name concordance** | 99.2% resolved on the GBIF backbone; independent agreement with Wikidata Greek names 64%, with GBIF English names 72% (lower bounds) |
| **Modern evidence** | 12,761 plant–indication pairs queried against 48,227,744 Europe PMC records; 18,534 LOTUS constituents; knowledge graph of 20,462 nodes / 51,365 edges |

**1 · Knowledge persisted.** For the 133 species present in both herbals, Culpeper (1653) repeats
Dioscorides' (c. 60 CE) indication for the same plant **2.66× more often than chance** (628 shared
claims vs 236 expected; z = 26.0; label-permutation p < 0.0001 (10,000 permutations)). 36% of what Culpeper
says about these plants was already in Dioscorides. Robust at genus level (2.4×) and with
high-confidence identifications only (2.5×).

![Transmission test](results/figures/fig1_transmission.png)

**2 · Modern science has looked — but not hard.** Within the same plants, indications claimed by both herbals
have at least one co-mentioning modern paper in **45%** of cases vs **23%** for
unclaimed indications (logit with indication fixed effects and plant research volume, cluster-robust:
**OR 2.48 [1.8–3.43]**, p = 3e-08; Dioscorides-only 1.95, Culpeper-only
1.59; conditional logit 2.24; within-plant Wilcoxon p = 4e-16). Yet once studied,
persistent claims attract **no more papers than expected** (Poisson rate ratio 0.78
[0.35–1.74], n.s.). Tradition predicts *whether* modern research looked, not *how much* —
and that gap is where the leads are. Co-mention measures attention, not efficacy.

![Evidence by group](results/figures/fig2_evidence_by_group.png)
![Odds ratios](results/figures/fig3_odds_ratios.png)

**3 · Leads.** 526 persistent pairs have ≤ 4 co-mentioning papers; the top 60 (diversified,
[`results/tables/leads.csv`](results/tables/leads.csv)) combine persistence, LOTUS chemistry and a volume-aware evidence gap.
None depends on an IUCN-threatened species. ⚠ = the herbals themselves record a warning for the plant.

| # | Plant | Indication | Mentions (D + C) | Papers | Known constituents | Safety |
|---|---|---|---|---|---|---|
| 1 | *Viscum album* | Boils / imposthumes / felons | 3 + 2 | 0 | 88 |  |
| 2 | *Triticum aestivum* | Venomous bites & stings | 3 + 4 | 0 | 274 | ⚠ |
| 3 | *Ocimum basilicum* | Venomous bites & stings | 2 + 7 | 0 | 268 |  |
| 4 | *Juglans regia* | Ulcers & sores | 1 + 5 | 0 | 190 | ⚠ |
| 5 | *Ruta graveolens* | Eye complaints / dim sight | 2 + 1 | 0 | 204 | ⚠ |
| 6 | *Triticum aestivum* | Freckles / spots / sunburn | 1 + 4 | 0 | 274 | ⚠ |
| 7 | *Plantago major* | Kidney & bladder complaints | 2 + 3 | 1 | 127 |  |
| 8 | *Foeniculum vulgare* | Eye complaints / dim sight | 3 + 2 | 4 | 384 |  |

*Computational hypotheses for laboratory follow-up — not medical advice.*


## What it does

```
 Dioscorides, De materia medica      Culpeper, Complete Herbal        Modern evidence (2026)
 Greek, c. 60 CE (822 chapters)      English, 1653 (328 monographs)   Europe PMC · ClinicalTrials.gov
            │                                   │                     LOTUS/Wikidata · GBIF · IUCN
            ▼                                   ▼                                │
   TEI parsing, apparatus removed      section-aware parsing                     │
            │                                   │                                │
            ▼                                   ▼                                │
   lemma → accepted binomial  ◄── cross-era name concordance (GBIF backbone) ──► │
            │                                   │                                │
            ▼                                   ▼                                │
   Ancient-Greek lexicon (accent-      Early-Modern-English historical          │
   free stems, idioms) → MeSH          disease crosswalk → MeSH                 │
            └───────────────┬───────────────────┘                                │
                            ▼                                                    ▼
             (plant, indication) claims with verbatim provenance ──► co-mention, lift, trials,
                            │                                         constituents, threat status
                            ▼
     transmission test · within-plant evidence models · ranked leads · knowledge graph · web explorer
```

1. **Corpus.** Parses Wellmann's critical edition of Dioscorides (First1KGreek TEI; we also
   repair a nesting bug that hides 199 chapters in the published XML) and Culpeper's herbal
   (Gutenberg #49513), keeping only the author's words.
2. **Cross-era name concordance.** Every Greek lemma and every Culpeper heading is mapped to an
   accepted taxon on the GBIF backbone, with confidence levels and justifications, and checked
   against independent Greek (Wikidata) and English (GBIF vernacular) names.
3. **Indication extraction in two historical languages.** Hand-built lexicons for Ancient Greek
   (inflection-proof stems on an accent-free, offset-preserving normalisation) and for
   17th-century English (a historical disease crosswalk: *agues, dropsy, king's evil, strangury,
   the whites…*) map to 85 MeSH-linked concepts. Every claim keeps its exact character span in
   the source. Accuracy is measured against a **blind** reference annotation.
4. **Transmission test.** A label-permutation test asks whether Culpeper repeats Dioscorides'
   indications for the same plant more often than chance.
5. **Modern-evidence test.** For each plant, claimed indications are compared with randomly
   sampled unclaimed ones *for the same plant* (conditional logistic regression, Poisson GLM
   with offsets, cluster bootstrap) — controlling for how much each plant and disease is studied.
6. **Leads.** Persistent but under-studied plant–indication pairs are ranked transparently,
   with phytochemistry (LOTUS), safety and conservation flags.
7. **Knowledge graph + explorer.** Everything is exported as a provenance-anchored knowledge
   graph (CSV/GraphML) and an interactive web explorer.

## Quick start

```bash
git clone https://github.com/KaraAliOsman/palimpsest && cd palimpsest
python -m venv .venv && . .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export PYTHONPATH=src                                 # Windows PowerShell: $env:PYTHONPATH="src"

python -m palimpsest corpus extract evaluate          # offline, ~10 s, uses committed data
python -m palimpsest all                              # full pipeline incl. API queries (~30-60 min first run, cached after)
python -m pytest -m "not network"                     # offline test-suite
```

Web explorer (Node ≥ 20):

```bash
cd web && npm ci && npm run dev
```

Pipeline steps (`python -m palimpsest <step>`): `download → corpus → taxa → extract → evaluate →
evidence → naming → analyze → kg → web`. Every HTTP response is cached under `data/cache/`
(rate-limited, retried), so a second run is offline and deterministic. Numbers in this README
were produced on 2026-11-08; literature counts grow over time.

## Repository layout

| Path | Contents |
|---|---|
| `src/palimpsest/corpora/` | TEI parser for Dioscorides (incl. nesting repair), Culpeper parser |
| `src/palimpsest/textnorm.py` | length-preserving Ancient-Greek / English normalisation |
| `src/palimpsest/extract.py` | lexicon extractor with provenance spans, longest-match, negation |
| `src/palimpsest/taxa.py`, `naming.py` | GBIF resolution and independent name checks |
| `src/palimpsest/sources/` | cached, rate-limited clients: Europe PMC, ClinicalTrials.gov, GBIF, Wikidata, MeSH |
| `src/palimpsest/analysis/` | transmission test, modern-evidence models, leads, figures |
| `src/palimpsest/kg.py`, `export.py` | knowledge graph and web export |
| `data/lexicons/` | concept table (MeSH), Ancient-Greek and Early-Modern-English lexicons + audits |
| `data/curated/` | cross-era name concordance (one row per chapter/monograph, with justification) |
| `data/annotations/` | blind reference annotations (random samples, seed 2026) |
| `data/processed/` | claims, taxa, evidence, scored pairs, knowledge graph (`kg/`) |
| `results/` | `stats.json`, evaluation JSONs, tables (`tables/leads.csv` …), figures |
| `web/` | Vite + React + TypeScript explorer (deployed to GitHub Pages) |
| `docs/` | methods, data contract, related work, Devpost text, pitch material |

## Data sources and licences

| Source | Use | Licence |
|---|---|---|
| Dioscorides, *De materia medica*, ed. M. Wellmann (1906–1914), Open Greek and Latin / First1KGreek `tlg0656.tlg001.1st1K-grc1` | Greek text | CC BY-SA 4.0 |
| N. Culpeper, *The Complete Herbal*, Project Gutenberg #49513 (1850 London edition of the 1653 work) | English text | Public domain (US) |
| Europe PMC REST API | literature co-mention counts | free API; metadata reuse per EBI terms |
| ClinicalTrials.gov API v2 | trial counts | public domain (US Government) |
| GBIF backbone taxonomy & occurrence API | name resolution, occurrence counts | CC BY 4.0 |
| Wikidata (incl. LOTUS natural-product occurrences, IUCN status) | constituents, threat status, Greek names | CC0 |
| NLM MeSH | concept identifiers | NLM terms (free) |

Code: **MIT**. Derived data containing Greek text (`data/interim`, `data/processed`, web texts):
**CC BY-SA 4.0**, as required by the source. Curated tables and lexicons: CC BY 4.0.

## Responsible research

* **These are computational hypotheses, not medical advice.** No output of this project
  establishes efficacy or safety. Several historical remedies are toxic.
* **Literature co-mention is not evidence of efficacy**, and modern research is partly
  motivated by tradition (circularity). See the limitations in [docs/METHODS.md](docs/METHODS.md#8-limitations-read-before-citing-any-number).
* **Traditional knowledge.** We use only published, public-domain or openly licensed
  European texts. No knowledge was collected from living communities, and no Indigenous
  knowledge is redistributed. Leads are presented with their historical provenance.
* **AI use, disclosed.** Plant identifications and the blind reference annotations were
  produced with AI assistance (Claude, Anthropic) from scholarly identifications and the
  texts themselves; they carry confidence levels and justifications and are open to expert
  correction. Extraction itself is rule-based and fully reproducible.

## Team

EthnoHack 2026 team *Palimpsest*. <!-- add team members -->

## Citation

```
Palimpsest: reading 2,000 years of European materia medica against modern evidence.
EthnoHack 2026. https://github.com/KaraAliOsman/palimpsest
```
