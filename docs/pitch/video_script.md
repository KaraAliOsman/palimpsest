# Palimpsest — pitch video script

Narrated explainer, 1920×1080, **4:00.6** (240.6 s), 501 spoken words.
Generated from `video/tools/script.json` by `video/tools/build.mjs`; timings are the draft
Kokoro narration (voice `af_heart`, speed 1.1). A human voice reading at the same pace fits
the same slots; if you re-record, keep each line inside its window or regenerate the timings.

Placeholders: ⟦F1_GRC⟧ ⟦F1_EN⟧ ⟦N_SHARED⟧ ⟦FOLD⟧ ⟦P⟧ ⟦RR_BOTH⟧ ⟦RR_DSC⟧ ⟦RR_CUL⟧, the lead rows ⟦PLANT_n⟧ ⟦INDICATION_n⟧ and ⟦DEMO FOOTAGE⟧
are filled in the final cut. Wormwood claim lists (s01, s06), ⟦WW_BOTH⟧ and the six-species shuffle counts (s05) are pulled from
`data/processed/claims.csv` by `video/tools/extract_data.py`; re-run it whenever the extraction changes.
On-screen captions carry every narrated line, so the film works with the sound off.

## S01 · Cold open: the chapter · 0:00.0–0:21.9 (21.9 s)

*On screen:* Wormwood chapter, De materia medica 3.23, in the original Greek (Wellmann). Six matched stems take a pigment wash with interlinear MeSH glosses (Diuresis D004231, Alcoholic Intoxication D000435, Flatulence D005414, Dyspepsia D004415, Anorexia D000855, Jaundice D007565). The chapter is scraped to a ghost and the title is written over it.

| time | narration |
|---|---|
| 0:00.7 | Around 60 CE, the physician Dioscorides wrote a chapter on wormwood, in Greek. |
| 0:06.3 | Two thousand years later, a machine reads the same lines. |
| 0:09.6 | The word for the jaundiced becomes the concept Jaundice. |
| 0:12.8 | Loss of appetite, stomach pain, urine: each gets a MeSH identifier. |
| 0:17.5 | This is Palimpsest. |

## S02 · The problem · 0:21.9–0:44.9 (23.0 s)

*On screen:* ἀψίνθιον with candidate identifications as glosses (Artemisia absinthium? A. pontica? A. maritima?); Culpeper's obsolete disease words in 17th-c. type; hand tally with 'controls: none'. Two words land: Survived? / Studied?

| time | narration |
|---|---|
| 0:22.4 | Herbals like this are among the oldest records of pharmacology, often mined for drug leads. |
| 0:27.9 | But the plant names are ancient, and the diseases obsolete: dropsy, king's evil, strangury. |
| 0:33.6 | Most studies read translations by hand, without controls. |
| 0:37.1 | So we asked two questions. Which claims survived sixteen centuries of copying? |
| 0:41.7 | And has modern science looked at them? |

## S03 · Data: three layers · 0:44.9–1:15.3 (30.4 s)

*On screen:* Three strata laid bottom-up: c. 60 CE — 822 chapters; 1653 — 328 monographs (ghost 'via Galen' between); 2026 — 48.2 M Europe PMC records + ClinicalTrials.gov, LOTUS/Wikidata, GBIF, IUCN.

| time | narration |
|---|---|
| 0:45.3 | Palimpsest reads three layers of one tradition. |
| 0:48.0 | Dioscorides' De materia medica, in the original Greek: 822 chapters, from Wellmann's critical edition. |
| 0:55.5 | Culpeper's Complete Herbal, 1653: 328 monographs, written over Galen, who wrote over Dioscorides. |
| 1:03.9 | And the modern record: 48.2 million Europe PMC records, ClinicalTrials.gov, LOTUS phytochemistry, GBIF and IUCN. |

## S04 · Method · 1:15.3–1:50.6 (35.3 s)

*On screen:* Names: ἀψίνθιον (3.23) and Wormwood (Culpeper) converge on Artemisia absinthium, GBIF 3121319, confidence high, alternatives, justification. Indications: Greek clause with its accent-free normal form and stem ικτερ at [393, 398); Culpeper's 'yellow jaundice' at [881, 889); both → MeSH Jaundice D007565; 85 concepts. Blind evaluation: 50 + 50 random monographs, seed 2026, F1 placeholders.

| time | narration |
|---|---|
| 1:15.7 | First, names. |
| 1:16.9 | Every Greek lemma and Culpeper heading is mapped to an accepted GBIF species, with a confidence level and a justification. |
| 1:24.4 | Apsinthion and Culpeper's Wormwood meet as Artemisia absinthium. |
| 1:28.3 | Second, indications, in two historical languages. |
| 1:31.8 | A Greek lexicon immune to inflection and accents, and a seventeenth-century disease crosswalk, both map to 85 MeSH concepts. |
| 1:40.1 | Every claim keeps its exact character span in the source. |
| 1:43.3 | Accuracy is measured against a blind reference annotation: F1 ⟦F1_GRC⟧ in Greek, ⟦F1_EN⟧ in English. |

## S05 · Statistics · 1:50.6–2:15.6 (25.0 s)

*On screen:* Six real shared species (Artemisia absinthium, Ruta graveolens, Mentha pulegium, Plantago major, Malva sylvestris, Papaver somniferum): observed Dioscorides × Culpeper overlap vs three label shuffles of the Culpeper column, and the exact null of all 720 shuffles of these six — all counts computed from claims.csv by tools/extract_data.py. Then the within-plant design: five plants as strata (rows) × 85 concepts (columns), claimed cells by source, 12 unclaimed controls per plant (illustrative draw), a column sweep for the indication fixed effect.

| time | narration |
|---|---|
| 1:51.0 | Then, the statistics. |
| 1:52.6 | Does Culpeper repeat Dioscorides more than chance? We shuffle his claims across the ⟦N_SHARED⟧ shared species ten thousand times, keeping every count fixed. |
| 2:01.7 | For modern evidence, every claimed indication is compared with twelve unclaimed indications for the same plant. |
| 2:08.2 | With fixed effects for indication, neither famous plants nor fashionable diseases can drive the result. |

## S06 · Result 1: transmission · 2:15.6–2:33.0 (17.4 s)

*On screen:* ⟦FOLD⟧× lands with p ⟦P⟧ and ⟦N_SHARED⟧. Then wormwood's persistent indications (⟦WW_BOTH⟧, from claims.csv) threaded Greek word ↔ MeSH ↔ Culpeper's words; the shrew-mouse / rats-and-mice pair highlighted.

| time | narration |
|---|---|
| 2:16.0 | First answer: Culpeper repeats Dioscorides ⟦FOLD⟧ times more often than chance, permutation p ⟦P⟧. |
| 2:23.4 | Wormwood alone keeps 10 indications across sixteen centuries. |
| 2:27.2 | Dioscorides' shrew-mouse bites become Culpeper's biting of rats and mice. |

## S07 · Result 2: modern evidence · 2:33.0–2:50.9 (17.9 s)

*On screen:* Forest plot of within-plant rate ratios vs unclaimed (=1): Dioscorides only ⟦RR_DSC⟧, Culpeper only ⟦RR_CUL⟧, both ⟦RR_BOTH⟧. Gloss: co-mention ≠ efficacy. Positions are placeholders until the real numbers arrive.

| time | narration |
|---|---|
| 2:33.4 | Second answer. Within the same plant, indications claimed by both authors have ⟦RR_BOTH⟧ times the co-mention rate of unclaimed ones. |
| 2:41.0 | Dioscorides alone: ⟦RR_DSC⟧. Culpeper alone: ⟦RR_CUL⟧. |
| 2:44.3 | Persistence carries a signal. But co-mention measures research attention, not efficacy. |

## S08 · Demo: the explorer · 2:50.9–3:07.4 (16.5 s)

*On screen:* ⟦DEMO FOOTAGE⟧ placeholder in a browser frame (karaaliosman.github.io/palimpsest), with step glosses: plant page → exact spans → MeSH → papers & trials → constituents → conservation.

| time | narration |
|---|---|
| 2:51.5 | Everything is open in a web explorer. |
| 2:53.9 | Pick a plant, and read the Greek and the English side by side, every claim highlighted at its exact span. |
| 2:59.9 | Then follow it to MeSH, to papers and trials, to known constituents and to conservation status. |

## S09 · Leads and impact · 3:07.4–3:31.6 (24.1 s)

*On screen:* Lead ledger with ⟦PLANT_n⟧ / ⟦INDICATION_n⟧ rows and the score bar 0.35 persistence + 0.25 chemistry + 0.25 gap + 0.15 tractability; flags kept outside the score. Impact: one line whose first word rolls historians → drug discovery → conservation.

| time | narration |
|---|---|
| 3:07.8 | Persistent but understudied pairs become ranked research leads. |
| 3:11.6 | The score is transparent: persistence, chemistry, evidence gap, tractability. Safety and threat flags stay visible, outside it. |
| 3:19.7 | For historians, a reproducible measure of transmission, computed from the Greek. |
| 3:24.5 | For drug discovery, an explainable shortlist. For conservation, threat status on every plant. |

## S10 · Limits, future, links · 3:31.6–4:00.6 (29.0 s)

*On screen:* Caveats as marginal notes; transmission chain Dioscorides → Pliny → Galen → Paul of Aegina → Ibn al-Bayṭār → Culpeper (middle links dashed = future work); end card with both links, held 5 s.

| time | narration |
|---|---|
| 3:32.0 | These are hypotheses, not medical advice. |
| 3:34.8 | Co-mention is not efficacy, modern research is partly motivated by tradition, and ancient identifications remain uncertain. |
| 3:42.9 | Next: expert review within ETHCSTWIN; Galen, Pliny, Byzantine and Arabic sources; and outcome-aware evidence. |
| 3:50.7 | The code, the data and the explorer are open. Palimpsest: the older layer still shows through. |

---
Pronunciation notes for a human reader: Dioscorides (dee-os-KOR-i-deez), ἀψίνθιον *apsínthion*,
Culpeper (KUL-pep-er), GBIF ("gee-biff"), MeSH ("mesh"), IUCN (letters), ETHCSTWIN (the Horizon Europe twinning;
the TTS draft says "our twinning network").
