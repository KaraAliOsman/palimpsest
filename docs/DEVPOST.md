# Devpost submission text (copy-paste ready)

## Project title
Palimpsest — reading 2,000 years of herbal medicine against modern evidence

## Tagline (≤ 200 chars)
We read Dioscorides in the original Greek and Culpeper's 1653 herbal, map plants and diseases across eras, and test which ancient claims survived — and which modern science ignored.

## Challenge track
Track 1 — Traditional knowledge (bridges to Track 2 drug discovery and Track 3 conservation)

## Short description
Palimpsest is an open, reproducible pipeline, knowledge graph and web explorer that turns two
landmark herbals — Dioscorides' *De materia medica* (Greek, c. 60 CE) and Culpeper's *Complete
Herbal* (1653) — into provenance-anchored, MeSH-coded plant–indication claims, measures how
much knowledge was transmitted across 1,600 years, and screens every claim against the modern
literature, clinical trials, phytochemistry and conservation data.

## Results

| | |
|---|---|
| **Corpus** | 822 Greek chapters of Dioscorides + 328 Culpeper monographs → 692 accepted taxa (466 species in Dioscorides, 315 in Culpeper; 136 with claims in both) |
| **Claims** | 10,399 provenance-anchored indication mentions (85 MeSH-linked concepts) |
| **Extraction accuracy** (blind reference, 50 + 49 monographs) | Ancient Greek **F1 0.86** [0.81–0.89] (P 0.88, R 0.83) · Early Modern English **F1 0.9** [0.88–0.92] (P 0.9, R 0.9) |
| **Name concordance** | 99.2% resolved on the GBIF backbone; agreement with independent Wikidata Greek names 64%, with GBIF English names 72% (indicative checks) |
| **Modern evidence** | 12,797 plant–indication pairs queried against 48,227,744 Europe PMC records; 18,498 LOTUS constituents; knowledge graph of 20,425 nodes / 51,430 edges |

**1 · Knowledge persisted.** For the 136 species with claims in both herbals, Culpeper (1653)
repeats Dioscorides' (c. 60 CE) indication for the same plant **2.65× more often than chance**
(642 shared claims vs 242 expected; z = 26.1; label-permutation p < 0.0001). The effect survives
stricter nulls: **2.11×** when plants are only exchanged with plants of similar entry length, and
**1.56×** even within the same botanical family (both p < 0.001); genus level 2.39×,
high-confidence identifications only 2.49×. 36% of what Culpeper says about these plants
was already in Dioscorides (13% expected by chance).

![Transmission test](https://raw.githubusercontent.com/KaraAliOsman/palimpsest/main/results/figures/fig1_transmission.png)

**2 · Modern science has looked — but not hard.** Indications the herbals claim are more often studied at all
than the *unclaimed indications of the same plants*: persistent claims 45% vs 32%;
Dioscorides-only 37% vs 25%; Culpeper-only 35% vs 24%
(share of pairs with ≥ 1 co-mentioning paper). Logit with indication fixed effects and plant research volume,
cluster-robust: **OR 2.77 [2.04–3.77]** for persistent claims (p = 9e-11),
1.98 for Dioscorides-only, 1.65 for Culpeper-only; conditional logit 2.29;
within-plant Wilcoxon p = 1e-15. Yet **once studied, persistent claims are not studied more**: among pairs with
at least one paper, the rate ratio is 1.04 [0.61–1.76] (n.s.).
Tradition predicts *whether* modern research looked, not *how hard* — that gap is where the leads are.
Co-mention measures attention, not efficacy.

![Evidence by group](https://raw.githubusercontent.com/KaraAliOsman/palimpsest/main/results/figures/fig2_evidence_by_group.png)
![Odds ratios](https://raw.githubusercontent.com/KaraAliOsman/palimpsest/main/results/figures/fig3_odds_ratios.png)

**3 · Leads.** 517 persistent pairs have ≤ 4 co-mentioning papers; the top 60
(diversified, [`results/tables/leads.csv`](https://github.com/KaraAliOsman/palimpsest/blob/main/results/tables/leads.csv)) combine persistence, LOTUS chemistry and a
volume-aware evidence gap, and must be supported by a chapter on the plant itself in both herbals. None is
assessed as threatened by IUCN (19 of 60 are assessed). ⚠ = the herbals themselves
record a warning about the plant.

| # | Plant | Indication | Mentions (D + C) | Papers | Known constituents | Safety |
|---|---|---|---|---|---|---|
| 1 | *Ruta graveolens* | Eye complaints / dim sight | 2 + 1 | 0 | 204 | ⚠ |
| 2 | *Vicia faba* | Bleeding / staunching blood | 1 + 1 | 0 | 297 | ⚠ |
| 3 | *Ocimum basilicum* | Venomous bites & stings | 2 + 3 | 0 | 268 |  |
| 4 | *Juglans regia* | Ulcers & sores | 1 + 4 | 0 | 190 | ⚠ |
| 5 | *Cannabis sativa* | Ear-ache / running ears | 1 + 2 | 1 | 528 | ⚠ |
| 6 | *Origanum vulgare* | Venomous bites & stings | 3 + 2 | 0 | 186 |  |
| 7 | *Brassica oleracea* | Constipation / purging | 3 + 1 | 0 | 258 | ⚠ |
| 8 | *Iris germanica* | Ulcers & sores | 3 + 2 | 0 | 129 | ⚠ |

*Computational hypotheses for laboratory follow-up — not medical advice.*

## Problem
Historical herbals are among the oldest structured records of human pharmacology, and they
are routinely cited as sources of drug leads. But using them computationally is hard:
plant names are ancient and ambiguous (what *is* Dioscorides' ἀψίνθιον?), disease
vocabulary is obsolete (*dropsy*, *king's evil*, *strangury*), the key texts are in
Ancient Greek, and most previous quantitative work relied on manual reading of later
translations without controls. Two questions remain open: **which claims persisted** across
the European tradition, and **does persistence carry any signal** that modern science
can use — or has it ignored?

## Our solution / approach
1. **Original-language corpus.** We parse Wellmann's critical edition of Dioscorides
   (First1KGreek TEI) — repairing an XML nesting bug that hides 199 chapters — and the
   Culpeper herbal, keeping only the authors' words.
2. **Cross-era name concordance.** Every Greek lemma and Culpeper heading is mapped to an
   accepted taxon on the GBIF backbone, with confidence levels and a written justification,
   and checked against independent Greek (Wikidata) and English (GBIF) names.
3. **Indication extraction in two historical languages.** An Ancient-Greek lexicon that is
   immune to inflection and accents (offset-preserving normalisation, so every claim keeps
   its exact Greek span) and a 17th-century English historical-disease crosswalk map
   statements to 85 MeSH-linked concepts. Accuracy is measured against a **blind** reference
   annotation.
4. **Transmission test.** A label-permutation test measures whether Culpeper repeats
   Dioscorides' indications for the same plant more than chance.
5. **Modern-evidence screen.** 10,000+ Europe PMC queries compare claimed indications with
   randomly sampled *unclaimed* indications of the same plant, using conditional logistic
   regression and Poisson models with indication fixed effects and plant-volume adjustment, plus
   matched same-plant controls (so neither plant popularity nor generally popular indications
   can drive the result).
6. **Leads.** Persistent but under-studied plant–indication pairs are ranked by a transparent
   score combining persistence, LOTUS phytochemistry and a volume-aware evidence gap, with
   historical-safety and IUCN flags.
7. **Knowledge graph + explorer.** All of it is exported as a provenance-anchored knowledge
   graph (CSV/GraphML; every claim edge carries its verbatim quote and character offsets)
   and an interactive web explorer.

## Technologies used
Python (pandas, NumPy, SciPy, statsmodels, NetworkX, matplotlib), TEI/XML parsing,
Ancient-Greek Unicode normalisation, regex-based information extraction, permutation tests,
conditional logistic and Poisson regression with fixed effects, cluster bootstrap; REST
clients with disk caching and rate limiting; SPARQL (Wikidata); React + TypeScript + Vite
web explorer on GitHub Pages; GitHub Actions CI. AI assistance (Claude) for plant-name
curation and blind reference annotation, disclosed in the repository.

## Data sources
* Dioscorides, *De materia medica*, ed. Wellmann — Open Greek and Latin / First1KGreek (CC BY-SA 4.0)
* N. Culpeper, *The Complete Herbal* — Project Gutenberg #49513 (public domain)
* Europe PMC REST API (titles, abstracts, keywords)
* ClinicalTrials.gov API v2
* GBIF backbone taxonomy and occurrence API (CC BY 4.0)
* Wikidata: LOTUS natural-product occurrences (P703), IUCN status (P141), Greek names (CC0)
* NLM MeSH

## Impact
* **For historians of medicine:** a quantitative, reproducible measure of how ancient
  pharmacological knowledge was transmitted — computed from the Greek, with every claim
  traceable to its passage.
* **For natural-product and drug-discovery researchers:** a ranked, explainable shortlist of
  persistent but under-studied plant–indication hypotheses, with known constituents attached.
* **For conservation:** IUCN and GBIF context for every medicinal plant, flagging leads that
  would depend on threatened species.
* **For the ETHCSTWIN community:** an open template — corpus parsers, lexicons, concept
  crosswalk, cached evidence clients and a knowledge graph — that extends to any herbal
  (Pliny, Galen, Byzantine and Arabic materia medica).

## Responsible research
Outputs are hypotheses, not medical advice; literature co-mention is a screening signal,
not proof of efficacy, and modern research is partly motivated by tradition (circularity).
Only published, openly licensed historical texts are used; no knowledge was collected from
living communities. AI assistance is disclosed and every AI-curated row carries a
confidence level and justification for expert correction.

## Future development
* Expert review of the name concordance with ETHCSTWIN pharmacognosists and historians.
* Add Galen, Pliny, Byzantine (e.g. Paul of Aegina) and Arabic sources to trace the full
  transmission chain, not just its endpoints.
* Replace co-mention with outcome-aware evidence (LLM-assisted classification of abstracts
  as positive/negative findings) and bioactivity data (ChEMBL targets of LOTUS constituents).
* Laboratory follow-up of top leads with natural-product chemistry partners.
* Publish the knowledge graph in RDF with Bioregistry/MeSH/Wikidata identifiers.

## Built with
python · pandas · statsmodels · scipy · networkx · react · typescript · vite · europe-pmc · gbif · wikidata · sparql · tei-xml · github-pages
