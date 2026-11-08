# Palimpsest — pitch video script

Narrated explainer, 1920×1080, **4:33.0** (273.0 s), 577 spoken words.
Generated from `video/tools/script.json` by `video/tools/build.mjs`; timings are the draft
Kokoro narration (voice `af_heart`, speed 1.15). A human voice reading at the same pace fits
the same slots; if you re-record, keep each line inside its window or regenerate the timings.

All numbers come from `results/key_numbers.json` (2026-11-08). Wormwood claim lists (s01, s06) and the
six-species shuffle counts (s05) are pulled from `data/processed/claims.csv` by `video/tools/extract_data.py`.
Demo shots are full-page captures of a local build of `web/` (no mock banner).
On-screen captions carry every narrated line, so the film works with the sound off.

## S01 · Cold open: the chapter · 0:00.0–0:24.2 (24.2 s)

*On screen:* Wormwood chapter, De materia medica 3.23, in the original Greek (Wellmann). Six matched stems take a pigment wash with interlinear MeSH glosses (Diuresis D004231, Alcoholic Intoxication D000435, Flatulence D005414, Dyspepsia D004415, Anorexia D000855, Jaundice D007565). The chapter is scraped to a ghost and the title is written over it.

| time | narration |
|---|---|
| 0:00.7 | Around 60 CE, the physician Dioscorides wrote a chapter on wormwood, in Greek. |
| 0:06.0 | Two thousand years later, a machine reads the same lines. |
| 0:09.2 | The word for the jaundiced becomes the concept Jaundice. |
| 0:12.2 | Loss of appetite, stomach pain, urine: each gets a MeSH identifier. |
| 0:16.7 | This is Palimpsest. |

## S02 · The problem · 0:24.2–0:46.5 (22.3 s)

*On screen:* ἀψίνθιον with candidate identifications as glosses (Artemisia absinthium? A. pontica? A. maritima?); Culpeper's obsolete disease words in 17th-c. type; a hand tally, 'controls' struck through. Two words land: Survived? / Studied?

| time | narration |
|---|---|
| 0:24.7 | Herbals like this are among the oldest records of pharmacology, often mined for drug leads. |
| 0:30.2 | But the plant names are ancient, and the diseases obsolete: dropsy, king's evil, strangury. |
| 0:35.6 | Most studies read translations by hand, without controls. |
| 0:39.0 | So we asked two questions. Which claims survived sixteen centuries of copying? |
| 0:43.4 | And has modern science looked at them? |

## S03 · Data: three layers · 0:46.5–1:16.0 (29.5 s)

*On screen:* Three strata laid bottom-up: c. 60 CE — 822 chapters; 1653 — 328 monographs ('written over Galen'); 2026 — 48.2 M Europe PMC records + ClinicalTrials.gov, LOTUS/Wikidata, GBIF, IUCN. Exit: the strata are erased right to left.

| time | narration |
|---|---|
| 0:46.9 | Palimpsest reads three layers of one tradition. |
| 0:49.5 | Dioscorides' De materia medica, in the original Greek: 822 chapters, from Wellmann's critical edition. |
| 0:56.7 | Culpeper's Complete Herbal, 1653: 328 monographs, written over Galen, who wrote over Dioscorides. |
| 1:04.8 | And the modern record: 48.2 million Europe PMC records, ClinicalTrials.gov, LOTUS phytochemistry, GBIF and IUCN. |

## S04 · Method · 1:16.0–1:52.0 (36.0 s)

*On screen:* Names: ἀψίνθιον (3.23) and Wormwood converge on Artemisia absinthium, GBIF 3121319, confidence high, alternatives, justification. Indications: Greek clause, its accent-free copy, stem ικτερ at [393, 398); Culpeper's 'yellow jaundice' at [881, 889); both → MeSH Jaundice D007565; 85 concepts. Blind evaluation: 50 + 50 random monographs (seed 2026), F1 0.86 Greek / 0.90 English.

| time | narration |
|---|---|
| 1:16.4 | First, names. |
| 1:17.6 | Every Greek lemma and Culpeper heading is mapped to an accepted GBIF species, with a confidence level and a justification. |
| 1:24.8 | Apsinthion and Culpeper's Wormwood meet as Artemisia absinthium. |
| 1:28.6 | Second, indications, in two historical languages. |
| 1:31.9 | A Greek lexicon immune to inflection and accents, and a seventeenth-century disease crosswalk, both map to 85 MeSH concepts. |
| 1:39.8 | Every claim keeps its exact character span in the source. |
| 1:42.9 | Against a blind reference annotation, extraction reaches F1 0.86 in Greek and 0.90 in English. |

## S05 · Statistics · 1:52.0–2:17.2 (25.3 s)

*On screen:* Six real shared species: observed Dioscorides × Culpeper overlap vs three label shuffles of the Culpeper column, and the exact null of all 720 shuffles of these six (counts from claims.csv via tools/extract_data.py). Then the within-plant design: plants as strata × 85 concepts, 12 unclaimed controls per plant (illustrative draw), a sweep for the indication fixed effect.

| time | narration |
|---|---|
| 1:52.4 | Then, the statistics. |
| 1:53.8 | Does Culpeper repeat Dioscorides more than chance? We shuffle his claims across the 136 shared species ten thousand times, keeping every count fixed. |
| 2:03.7 | For modern evidence, every claimed indication is compared with twelve unclaimed indications for the same plant. |
| 2:10.0 | With fixed effects for indication, neither famous plants nor fashionable diseases can drive the result. |

## S06 · Result 1: transmission · 2:17.2–2:47.1 (29.8 s)

*On screen:* 2.6× lands; still 2.1× matched by entry length, 1.6× within the same family. Real figure results/figures/fig1_transmission.png as a tipped-in plate, observed and chance labels boxed; 642 vs 242 expected, 136 shared species, z = 26.1; robust at genus level 2.39× and high-confidence IDs 2.49×. Then wormwood's persistent indications threaded Greek ↔ MeSH ↔ Culpeper; the shrew-mouse / rats-and-mice pair highlighted.

| time | narration |
|---|---|
| 2:17.6 | First answer: Culpeper repeats Dioscorides 2.6 times more often than chance — still 2.1 times when we match plants by entry length, and 1.6 times even within the same botanical family. |
| 2:30.9 | 642 shared claims against 242 expected; p below 0.0001. |
| 2:37.7 | Wormwood alone keeps 10 indications across sixteen centuries. |
| 2:41.3 | Dioscorides' shrew-mouse bites become Culpeper's biting of rats and mice. |

## S07 · Result 2: modern evidence · 2:47.1–3:13.6 (26.6 s)

*On screen:* Real figure fig2 (matched-control panel; 45% vs 32% same-plant unclaimed, ringed). Then an animated odds-ratio plot from key_numbers.json: Dioscorides only 1.98 [1.67–2.35], Culpeper only 1.65 [1.40–1.94], both 2.77 [2.04–3.77]; below a rule, rate ratio once studied 1.04 [0.61–1.76] n.s.; 'looked at, but not looked hard → the gap our leads target'. Exit pulls back into the next scene.

| time | narration |
|---|---|
| 2:47.5 | Second answer, with matched controls: 45% of persistent claims have at least one modern paper, versus 32% of unclaimed indications of the same plants. |
| 2:58.0 | That is an odds ratio of 2.8, from 2.0 to 3.8. |
| 3:01.9 | But once studied, they are not studied more: the rate ratio is 1.04, not significant. |
| 3:07.7 | Modern science has looked, but not looked hard. That gap is what our leads target. |

## S08 · Demo: the explorer · 3:13.6–3:31.8 (18.1 s)

*On screen:* The real explorer (local build of web/, full-page capture of #/plant/artemisia-absinthium) in a browser frame: KG 20,425 nodes / 51,430 edges / 18,498 compounds beside it; scroll to the Greek and English texts, push into the highlighted spans, then to the indications/evidence table, phytochemistry and conservation.

| time | narration |
|---|---|
| 3:14.2 | Everything is open: a knowledge graph of 20,425 nodes and 51,430 edges, and a web explorer. |
| 3:21.0 | Pick a plant: read the Greek and English side by side, every claim at its exact span, linked to MeSH, papers, constituents and conservation status. |

## S09 · Leads and impact · 3:31.8–4:00.8 (29.0 s)

*On screen:* Match cut on the same window to #/leads (60 leads from 517 candidates). Then four leads from TOP_LEADS (rue × eye complaints, ranked first; basil and oregano × venomous bites; walnut × ulcers) with papers, compounds and flags; the score bar 0.35/0.25/0.25/0.15; flags outside the score. Impact: historians, drug discovery, conservation; scraped to a ghost on exit.

| time | narration |
|---|---|
| 3:32.2 | Sixty diversified leads, drawn from 517 candidates, rank persistent but understudied pairs. |
| 3:39.0 | Rue for eye complaints ranks first; basil and oregano for venomous bites, walnut for ulcers: hypotheses, not medical advice. |
| 3:47.3 | The score is transparent, and safety and threat flags stay visible, outside it. |
| 3:51.8 | Historians get a measure of transmission; drug discovery, an explainable shortlist; conservation, threat status for every plant. |

## S10 · Limits, future, links · 4:00.8–4:33.0 (32.2 s)

*On screen:* Caveats as marginal notes, including 'literature searched by accepted names only; synonym search is next'; transmission chain Dioscorides → Pliny → Galen → Paul of Aegina → Ibn al-Bayṭār → Culpeper (middle links dashed = future work); end card over the ghost chapter with both links.

| time | narration |
|---|---|
| 4:01.2 | These are hypotheses, not medical advice. |
| 4:03.8 | Co-mention measures attention, not efficacy; modern research is partly motivated by tradition; and ancient identifications remain uncertain. |
| 4:12.6 | Literature is searched by accepted names only; synonym search is next. |
| 4:16.9 | Next: expert review within ETHCSTWIN; Galen, Pliny, Byzantine and Arabic sources; and outcome-aware evidence. |
| 4:24.6 | The code, the data and the explorer are open. Palimpsest: the older layer still shows through. |

---
Pronunciation notes for a human reader: Dioscorides (dee-os-KOR-i-deez), ἀψίνθιον *apsínthion*,
Culpeper (KUL-pep-er), GBIF ("gee-biff"), MeSH ("mesh"), IUCN (letters), ETHCSTWIN (the Horizon Europe twinning;
the TTS draft says "our twinning network").
