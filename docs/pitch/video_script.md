# Palimpsest — pitch video script

Narrated explainer, 1920×1080, **4:25.6** (265.6 s), 555 spoken words.
Generated from `video/tools/script.json` by `video/tools/build.mjs`; timings are the draft
Kokoro narration (voice `af_heart`, speed 1.15). A human voice reading at the same pace fits
the same slots; if you re-record, keep each line inside its window or regenerate the timings.

All numbers come from `results/key_numbers.json` (2026-11-08). Wormwood claim lists (s01, s06) and the
six-species shuffle counts (s05) are pulled from `data/processed/claims.csv` by `video/tools/extract_data.py`.
Demo shots are full-page captures of a local build of `web/` (no mock banner).
On-screen captions carry every narrated line, so the film works with the sound off.

## S01 · Cold open: the chapter · 0:00.0–0:21.2 (21.2 s)

*On screen:* Wormwood chapter, De materia medica 3.23, in the original Greek (Wellmann). Six matched stems take a pigment wash with interlinear MeSH glosses (Diuresis D004231, Alcoholic Intoxication D000435, Flatulence D005414, Dyspepsia D004415, Anorexia D000855, Jaundice D007565). The chapter is scraped to a ghost and the title is written over it.

| time | narration |
|---|---|
| 0:00.7 | Around 60 CE, the physician Dioscorides wrote a chapter on wormwood, in Greek. |
| 0:06.0 | Two thousand years later, a machine reads the same lines. |
| 0:09.3 | The word for the jaundiced becomes the concept Jaundice. |
| 0:12.3 | Loss of appetite, stomach pain, urine: each gets a MeSH identifier. |
| 0:16.8 | This is Palimpsest. |

## S02 · The problem · 0:21.2–0:43.6 (22.4 s)

*On screen:* ἀψίνθιον with candidate identifications as glosses (Artemisia absinthium? A. pontica? A. maritima?); Culpeper's obsolete disease words in 17th-c. type; a hand tally, 'controls' struck through. Two words land: Survived? / Studied?

| time | narration |
|---|---|
| 0:21.7 | Herbals like this are among the oldest records of pharmacology, often mined for drug leads. |
| 0:27.1 | But the plant names are ancient, and the diseases obsolete: dropsy, king's evil, strangury. |
| 0:32.6 | Most studies read translations by hand, without controls. |
| 0:36.0 | So we asked two questions. Which claims survived sixteen centuries of copying? |
| 0:40.4 | And has modern science looked at them? |

## S03 · Data: three layers · 0:43.6–1:13.1 (29.6 s)

*On screen:* Three strata laid bottom-up: c. 60 CE — 822 chapters; 1653 — 328 monographs ('written over Galen'); 2026 — 48.2 M Europe PMC records + ClinicalTrials.gov, LOTUS/Wikidata, GBIF, IUCN. Exit: the strata are erased right to left.

| time | narration |
|---|---|
| 0:44.0 | Palimpsest reads three layers of one tradition. |
| 0:46.6 | Dioscorides' De materia medica, in the original Greek: 822 chapters, from Wellmann's critical edition. |
| 0:53.8 | Culpeper's Complete Herbal, 1653: 328 monographs, written over Galen, who wrote over Dioscorides. |
| 1:02.0 | And the modern record: 48.2 million Europe PMC records, ClinicalTrials.gov, LOTUS phytochemistry, GBIF and IUCN. |

## S04 · Method · 1:13.1–1:49.3 (36.2 s)

*On screen:* Names: ἀψίνθιον (3.23) and Wormwood converge on Artemisia absinthium, GBIF 3121319, confidence high, alternatives, justification. Indications: Greek clause, its accent-free copy, stem ικτερ at [393, 398); Culpeper's 'yellow jaundice' at [881, 889); both → MeSH Jaundice D007565; 85 concepts. Blind evaluation: 50 + 50 random monographs (seed 2026), F1 0.86 Greek / 0.90 English.

| time | narration |
|---|---|
| 1:13.5 | First, names. |
| 1:14.7 | Every Greek lemma and Culpeper heading is mapped to an accepted GBIF species, with a confidence level and a justification. |
| 1:22.0 | Apsinthion and Culpeper's Wormwood meet as Artemisia absinthium. |
| 1:25.9 | Second, indications, in two historical languages. |
| 1:29.1 | A Greek lexicon immune to inflection and accents, and a seventeenth-century disease crosswalk, both map to 85 MeSH concepts. |
| 1:37.1 | Every claim keeps its exact character span in the source. |
| 1:40.2 | Against a blind reference annotation, extraction reaches F1 0.86 in Greek and 0.90 in English. |

## S05 · Statistics · 1:49.3–2:14.7 (25.5 s)

*On screen:* Six real shared species: observed Dioscorides × Culpeper overlap vs three label shuffles of the Culpeper column, and the exact null of all 720 shuffles of these six (counts from claims.csv via tools/extract_data.py). Then the within-plant design: plants as strata × 85 concepts, 12 unclaimed controls per plant (illustrative draw), a sweep for the indication fixed effect.

| time | narration |
|---|---|
| 1:49.7 | Then, the statistics. |
| 1:51.2 | Does Culpeper repeat Dioscorides more than chance? We shuffle his claims across the 133 shared species ten thousand times, keeping every count fixed. |
| 2:01.1 | For modern evidence, every claimed indication is compared with twelve unclaimed indications for the same plant. |
| 2:07.5 | With fixed effects for indication, neither famous plants nor fashionable diseases can drive the result. |

## S06 · Result 1: transmission · 2:14.7–2:41.5 (26.8 s)

*On screen:* 2.66× lands. Real figure results/figures/fig1_transmission.png as a tipped-in plate, observed and chance labels boxed; 628 vs 236, z = 26, robust at genus level 2.40× and high-confidence IDs 2.50×. Then wormwood's persistent indications threaded Greek ↔ MeSH ↔ Culpeper; the shrew-mouse / rats-and-mice pair highlighted.

| time | narration |
|---|---|
| 2:15.1 | First answer: for the same plant, Culpeper repeats Dioscorides 2.66 times more often than chance. |
| 2:21.8 | 628 shared claims against 236 expected, p below 0.0001; robust at genus level and for high-confidence names. |
| 2:32.1 | Wormwood alone keeps 10 indications across sixteen centuries. |
| 2:35.8 | Dioscorides' shrew-mouse bites become Culpeper's biting of rats and mice. |

## S07 · Result 2: modern evidence · 2:41.5–3:09.2 (27.7 s)

*On screen:* Real figure fig2_evidence_by_group.png (45% vs 23% ringed). Then an animated odds-ratio plot from key_numbers.json: Dioscorides only 1.95 [1.65–2.31], Culpeper only 1.59 [1.35–1.87], both 2.48 [1.80–3.43]; below a rule, Poisson rate ratio once studied 0.78 [0.35–1.74] n.s.; 'looked at, but not looked hard → the gap our leads target'. Exit pulls back into the next scene.

| time | narration |
|---|---|
| 2:41.9 | Second answer. For the same plants, 45% of persistent claims have a modern co-mentioning paper, against 23% of unclaimed indications. |
| 2:51.5 | With indication fixed effects, that is an odds ratio of 2.48. |
| 2:55.9 | But once studied, persistent claims attract no more papers: the rate ratio is 0.78, not significant. |
| 3:03.3 | Modern science has looked, but not looked hard. That gap is what our leads target. |

## S08 · Demo: the explorer · 3:09.2–3:27.4 (18.2 s)

*On screen:* The real explorer (local build of web/, full-page capture of #/plant/artemisia-absinthium) in a browser frame: KG 20,462 nodes / 51,365 edges / 18,534 compounds beside it; scroll to the Greek and English texts, push into the highlighted spans, then to the indications/evidence table, phytochemistry and conservation.

| time | narration |
|---|---|
| 3:09.8 | Everything is open: a knowledge graph of 20,462 nodes and 51,365 edges, and a web explorer. |
| 3:16.6 | Pick a plant: read the Greek and English side by side, every claim at its exact span, linked to MeSH, papers, constituents and conservation status. |

## S09 · Leads and impact · 3:27.4–3:56.3 (28.9 s)

*On screen:* Match cut on the same window to #/leads (60 leads from 526 candidates). Then four example leads from TOP_LEADS (rue × eye complaints, fennel × eye complaints, mistletoe × boils, greater plantain × kidney & bladder) with papers, compounds and flags; the score bar 0.35/0.25/0.25/0.15; flags outside the score. Impact: historians, drug discovery, conservation; scraped to a ghost on exit.

| time | narration |
|---|---|
| 3:27.8 | Sixty diversified leads, drawn from 526 candidates, rank persistent but understudied pairs. |
| 3:34.8 | Rue and fennel for eye complaints, mistletoe for boils, greater plantain for kidney and bladder: hypotheses, not medical advice. |
| 3:42.7 | The score is transparent, and safety and threat flags stay visible, outside it. |
| 3:47.3 | Historians get a measure of transmission; drug discovery, an explainable shortlist; conservation, threat status for every plant. |

## S10 · Limits, future, links · 3:56.3–4:25.6 (29.3 s)

*On screen:* Caveats as marginal notes; transmission chain Dioscorides → Pliny → Galen → Paul of Aegina → Ibn al-Bayṭār → Culpeper (middle links dashed = future work); end card over the ghost chapter with both links, held ~4.5 s.

| time | narration |
|---|---|
| 3:56.7 | These are hypotheses, not medical advice. |
| 3:59.3 | Co-mention measures attention, not efficacy; modern research is partly motivated by tradition; and ancient identifications remain uncertain. |
| 4:08.2 | Next: expert review within ETHCSTWIN; Galen, Pliny, Byzantine and Arabic sources; and outcome-aware evidence. |
| 4:15.9 | The code, the data and the explorer are open. Palimpsest: the older layer still shows through. |

---
Pronunciation notes for a human reader: Dioscorides (dee-os-KOR-i-deez), ἀψίνθιον *apsínthion*,
Culpeper (KUL-pep-er), GBIF ("gee-biff"), MeSH ("mesh"), IUCN (letters), ETHCSTWIN (the Horizon Europe twinning;
the TTS draft says "our twinning network").
