# Methods

Palimpsest follows the structure **Problem → Data → Method → Prototype → Results → Impact**.
This document describes every methodological decision, its rationale and its known
weaknesses. Numbers quoted here are produced by `python -m palimpsest all` and stored in
`results/`.

## 1. Question

Historical herbals are routinely mined for drug leads, but two questions are rarely
answered quantitatively and reproducibly:

1. **Transmission.** How much of what a 17th-century English herbal says about a plant
   was already said by Dioscorides sixteen centuries earlier — i.e. which plant–indication
   claims *persisted*?
2. **Modern signal.** Are persistent claims more often supported by modern biomedical
   research than indications the herbals did *not* claim for the same plant — and which
   persistent claims have been ignored by modern research?

## 2. Sources

| Layer | Source | Edition / licence |
|---|---|---|
| c. 60 CE | Dioscorides, *De materia medica*, **original Greek** | Wellmann (1906–1914), digitised by Open Greek and Latin / First1KGreek, CC BY-SA 4.0 |
| 1653 | Nicholas Culpeper, *The Complete Herbal* | Project Gutenberg #49513, public domain |
| 2026 | Europe PMC (titles/abstracts), ClinicalTrials.gov v2, GBIF backbone, Wikidata (LOTUS natural-product occurrences, IUCN status), NLM MeSH | API terms of each provider; Wikidata CC0 |

The apparatus criticus (`<note>` elements) is removed from the Greek so that only
Dioscorides' text is analysed. The 2018 First1KGreek file nests the later chapters of books 1,
2 and 4 inside chapters 1.66, 2.105 and 4.134 (a TEI nesting error that silently hides 199
chapters from naive parsers); our parser walks chapters recursively and excludes nested
chapters from their host, recovering all 822 chapters. The Gutenberg Culpeper is the 1850
London edition of the 1653 work, which adds about a hundred later herbs; the "Culpeper" layer
therefore dates from 1653–1850. Where Culpeper gives one shared *Government and virtues* for
sibling entries (e.g. Monk's Rhubarb / Bastard Rhubarb), the earlier entries inherit it
(`virtues_from` records this; such entries are excluded from the extraction evaluation). For Culpeper only the *Government and virtues* section is
mined for indications; descriptions, habitats and flowering times are used for plant
identification only. Astrological statements are not extracted.

## 3. Cross-era name resolution

Each of the 822 Greek chapters and 328 Culpeper monographs was assigned a taxon by
AI-assisted curation (Claude, Anthropic), working from the lemma, its listed synonyms,
the author's own description and the standard scholarly identifications (Wellmann,
Berendes, Gunther/Goodyer, Beck; modern annotated Culpeper editions). Every row records
`kind` (plant / fungus / animal / mineral / product), the identification, its rank,
a confidence level (high / medium / low), alternatives and a one-line justification
(`data/curated/`). Names are then resolved programmatically on the GBIF backbone to the
currently accepted taxon (synonyms followed), which is the join key between eras.

*Validation.* (a) GBIF resolution rate; (b) for Greek, agreement between the Greek lemma
and Ancient/Modern Greek labels of the resolved taxon in Wikidata where such labels
exist; (c) for Culpeper, agreement between Culpeper's heading and GBIF English
vernacular names. Sensitivity analyses repeat every test using **only high-confidence
identifications** and at **genus level**, which absorbs most species-level ambiguity of
ancient plant names.

## 4. Indication extraction

A shared vocabulary of 85 indication concepts (`data/lexicons/concepts.csv`), each mapped
to a MeSH descriptor and to English search terms, links the three eras.

Two hand-built lexicons map surface language to concepts:

* **Ancient Greek** (`terms_grc.csv`) — regular expressions over an accent-free,
  lower-case, final-sigma-folded copy of the text (normalisation is length-preserving,
  so every hit maps back to the exact Greek characters). Stems absorb inflection
  (ἰκτερικούς, ἰκτέρῳ → `ικτερ`); short-gap multi-word patterns encode idioms
  (ἔμμηνα ἄγει → emmenagogue; κοιλίαν ἵστησι → antidiarrhoeal).
* **Early Modern English** (`terms_en.csv`) — a historical-disease crosswalk (agues,
  dropsy, king's evil, strangury, the whites, St Anthony's fire, falling sickness …).

Each pattern has a polarity — *therapeutic*, *action* (pharmacological action implying
the concept, e.g. emmenagogue), or *adverse* (warning) — and was spot-checked for
precision on random corpus hits (`*_audit.md`). Overlapping hits are resolved
longest-match-first; English negation/warning cues in the same clause ("hurtful to",
"forbear") mark a hit as negated. Only therapeutic and action claims enter the analyses.

*Evaluation.* 50 Dioscorides chapters and 50 Culpeper monographs (49 evaluable: one inherits its
virtues text from a sibling entry and is excluded) were drawn at random
(seed 2026) and annotated **blind** to the lexicons (annotator never saw the patterns),
with a verbatim quotation for every reference claim. We report precision, recall and F1
at the (monograph, concept) level with 95 % bootstrap CIs over monographs
(`results/extraction_eval.json`, errors by concept in `results/tables/`).

## 5. Transmission test (Dioscorides → Culpeper)

For the species identified in both sources, the observed statistic is the number of
(plant, indication) pairs claimed by both authors. The null distribution is obtained by
randomly re-assigning Culpeper's per-plant claim sets among the shared species (10,000
label permutations). This keeps each author's number of claims per plant and the
frequency of every indication fixed and destroys only the same-plant linkage. We report
the fold enrichment (observed / mean null), z-score and one-sided permutation p-value,
plus per-indication enrichment. Because plants that one author wrote about at length tend
to get long entries from the other too, and related plants share chemistry and uses, we
also report two **stricter nulls**: permutation only among plants in the same size quintile
of Dioscorides claims, and permutation only within the same botanical family (the most
conservative, since shared family uses are partly genuine pharmacology). Further
sensitivity: genus level, high-confidence identifications only, therapeutic-category level.

## 6. Modern-evidence test

For every species with at least one claim we query Europe PMC for (i) papers mentioning
the binomial in title/abstract, (ii) papers matching the indication's terms, and
(iii) papers matching both. Controls are 12 indications **not** claimed for that plant
by either herbal, sampled at random per plant (seeded). With N the size of the searchable
corpus:

* expected co-mentions `E = n_plant · n_indication / N` (independence);
* lift `(n_pair + 0.5) / (E + 0.5)`; evidence tier: unstudied (0), sparse (1–4), studied (≥5).

Comparisons are made **within plant** to remove the dominant confounder — some plants
are simply studied far more than others:

* **primary — presence:** logistic regression of *any co-mentioning paper* on claim status
  (Dioscorides only / Culpeper only / both, vs unclaimed) with **indication fixed effects**
  and the plant's log research volume, cluster-robust (by plant) SEs. Indication fixed
  effects mean the claim effect is identified by comparing the *same indication* across plants
  for which it was / was not claimed, so indications that are popular in plant pharmacology
  in general (anti-inflammatory, wound healing) cannot drive it;
* **primary — intensity:** Poisson GLM of co-mention counts with indication fixed effects,
  offset log(E), cluster-robust SEs → rate ratios;
* secondary: conditional logit (strata = plant, + log indication volume) and Poisson with
  offset only. All models were checked on simulated data with a known effect (recovered
  rate ratios 1.98 / 1.99 / 4.0 for true 2 / 2 / 4);
* **intensity once studied:** the same Poisson model restricted to pairs with ≥ 1 paper;
* **matched controls:** for each claim group, the share of studied indications is compared
  with the unclaimed indications of exactly the same plants (plants with persistent claims
  are larger and better studied than average, so an unmatched comparison overstates gaps);
* within-plant Wilcoxon signed-rank test of mean log₂ lift, claimed vs unclaimed;
* 95 % cluster-bootstrap CIs (resampling plants) for group summaries.

## 7. Research leads

Persistent pairs (claimed by both authors for the same accepted species) with ≤ 4
co-mentioning papers are scored transparently:
`0.35·persistence + 0.25·chemistry + 0.40·gap`
(persistence = min(1, mentions in both texts / 6); chemistry = log(1 + LOTUS constituents via
Wikidata P703) / log 501, capped at 1; gap = ½·1/(1 + papers) + ½·surprise, where surprise is
−log10 P(X ≤ papers) under a Poisson whose mean is the plant's *biomedical* co-mentions
(summed over every indication queried for it) shared out by the indication's research
volume — this ignores agronomic literature, which otherwise dominates crop plants). The
published list is diversified (≤ 2 leads per plant, ≤ 4 per indication); the full ranking is
`results/tables/leads_all.csv`. Historical safety warnings and IUCN threat status are shown
as flags and never folded into the score. Weights are a transparent heuristic, not fitted.
A lead must be supported by a chapter about the plant itself in both herbals (not only by a
product chapter such as an oil, a wine or bird-lime). Mentions count distinct clauses, not
lexical hits. Most leads concern plants without an IUCN assessment; "no lead depends on a
threatened species" means none is *assessed* as VU/EN/CR.

*Denominators.* Primary modern-evidence models use the 585 species with ≥ 1 paper (12,797 pairs);
the 21 species with no literature at all are excluded from the models but listed in the data
(13,138 pairs in total). Claim counts quoted as 10,400 are therapeutic/action claims; the claims
file also holds adverse and negated mentions.

## 8. Limitations (read before citing any number)

* **Circularity.** Modern research is partly *motivated* by tradition, so co-mention
  measures research attention plus evidence, not efficacy. The modern-evidence analysis
  is a screening signal, not validation.
* **Literature co-occurrence ≠ positive result.** A paper may report no effect or
  toxicity. Tiers count papers, not findings.
* **Retrospective identification** of ancient plants is uncertain (hence confidence
  levels, genus-level and high-confidence sensitivity analyses).
* **Lexicon recall** is bounded; claims the lexicon misses lower power but do not bias
  the within-plant comparisons unless misses correlate with modern evidence.
* **Culpeper is not independent of Dioscorides** (via Galen, Mattioli, Gerard): the
  transmission test measures persistence of a textual tradition, not independent
  rediscovery.
* **Name searches** use the accepted GBIF binomial only. Literature published under
  synonyms is missed — for rosemary, *Salvia rosmarinus* finds 211 papers but *Rosmarinus
  officinalis* 1,994. The loss is the same for a plant's claimed and control indications
  (within-plant design), but it lowers power and inflates "unstudied" gaps for renamed
  plants. The synonym-expanded re-run (accepted + curated + GBIF synonyms, POST queries;
  `scripts/sensitivity_synonyms.py`) leaves every conclusion intact (see the sensitivity
  subsection below), so the primary numbers are kept.
* **AI-produced reference annotation.** The blind reference set was annotated with AI
  assistance, as was the curation; a human double-annotated subset (with kappa) is the
  next validation step.
* Predictions are **hypotheses for laboratory follow-up**, never medical advice.

### Sensitivity: synonym-expanded literature search

To test the accepted-binomial limitation above, every species was re-searched under its accepted
name OR the curators' names OR all GBIF backbone synonyms (median 10, max 60 names; Europe PMC
`searchPOST`, same date), with the same claims, the same 12 seeded controls per plant and the same
models and lead rules (`scripts/sensitivity_synonyms.py`; outputs in `results/sensitivity_synonyms/`,
full comparison in `summary.md`). The published numbers above are unchanged.

| | Primary (accepted name) | Synonym-expanded |
|---|---|---|
| Pairs with ≥ 1 paper | 3,721 / 13,138 | 4,072 / 13,138 |
| Persistent claims vs matched controls, share studied | 45% vs 32% | 46% vs 35% |
| Logit OR, persistent (indication FE + plant volume) | 2.77 [2.04–3.77] | 2.48 [1.84–3.36] |
| Logit OR, Dioscorides-only / Culpeper-only | 1.98 / 1.65 | 2.08 / 1.72 |
| Conditional logit OR, persistent | 2.29 | 2.07 |
| Poisson RR given studied, persistent | 1.04 [0.61–1.76] | 1.03 [0.62–1.73] |
| Within-plant Wilcoxon | p = 1e-15 | p = 2e-17 |
| Lead candidates (persistent, ≤ 4 papers) | 517 | 511 |

**Conclusions hold.** Synonyms add literature mainly for renamed plants (69 plants at least double;
rosemary 211 → 2,179, *Vicia lens* 3 → 2,530), but claimed and control indications gain alike, so the
persistent-claim odds ratio shrinks modestly (2.77 → 2.48) and stays highly significant; the "studied
whether, not how hard" result is unchanged. Only 6 of 354 unstudied persistent pairs gain a paper; 6 lead
candidates leave the ≤ 4-paper pool (e.g. *Ruta graveolens* – fevers 2 → 7, *Sinapis alba* – spleen
3 → 11), none of them in the published top 60. 55 of the top 60 are unchanged and all eight former top-8 leads stay in the top 60;
rosemary–jaundice stays at 0 papers and enters the top 60 (rank 24).
