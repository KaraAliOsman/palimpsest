# Palimpsest — pitch video script

Final cut: `video/palimpsest-final-v2.mp4`, 1920×1080, 30 fps, **4:28.5**. The picture is cut to the
recorded ElevenLabs voice-over (`video/vo_clean.wav`, unmodified); scene and line times below are taken from
`video/vo_alignment.json` (Whisper word timestamps). Music: "Inspired" — Kevin MacLeod (incompetech.com), CC BY 4.0.
All numbers come from `results/key_numbers.json`.

## S01 · Cold open: the chapter · 0:00.0–0:20.2 (20.2 s)

| time | narration |
|---|---|
| 0:00.0 | Around 60 CE, the physician Dioscorides wrote a chapter on wormwood, in Greek. |
| 0:06.4 | Two thousand years later, a machine reads the same lines. |
| 0:10.0 | The word for the jaundiced becomes the concept Jaundice. |
| 0:13.6 | Loss of appetite, stomach pain, urine: each gets a MeSH identifier. |
| 0:18.5 | This is Palimpsest. |

## S02 · The problem · 0:20.2–0:43.1 (22.9 s)

| time | narration |
|---|---|
| 0:20.5 | Herbals like this are among the oldest records of pharmacology, often mined for drug leads. |
| 0:25.3 | But the plant names are ancient, and the diseases obsolete: dropsy, king's evil, strangury. |
| 0:32.0 | Most studies read translations by hand, without controls. |
| 0:35.7 | So we asked two questions. Which claims survived sixteen centuries of copying? |
| 0:40.9 | And has modern science looked at them? |

## S03 · Data: three layers · 0:43.1–1:11.3 (28.1 s)

| time | narration |
|---|---|
| 0:43.4 | Palimpsest reads three layers of one tradition. |
| 0:46.6 | Dioscorides' De materia medica, in the original Greek: 822 chapters, from Wellmann's critical edition. |
| 0:54.0 | Culpeper's Complete Herbal, 1653: 328 monographs, written over Galen, who wrote over Dioscorides. |
| 1:02.3 | And the modern record: 48.2 million Europe PMC records, ClinicalTrials.gov, LOTUS phytochemistry, GBIF and IUCN. |

## S04 · Method · 1:11.3–1:47.5 (36.3 s)

| time | narration |
|---|---|
| 1:11.5 | First, names. |
| 1:13.1 | Every Greek lemma and Culpeper heading is mapped to an accepted GBIF species, with a confidence level and a justification. |
| 1:20.4 | Apsinthion and Culpeper's Wormwood meet as Artemisia absinthium. |
| 1:25.1 | Second, indications, in two historical languages. |
| 1:28.6 | A Greek lexicon immune to inflection and accents, and a seventeenth-century disease crosswalk, both map to 85 MeSH concepts. |
| 1:36.7 | Every claim keeps its exact character span in the source. |
| 1:40.0 | Against a blind reference annotation, extraction reaches F1 0.86 in Greek and 0.90 in English. |

## S05 · Statistics · 1:47.5–2:11.0 (23.5 s)

| time | narration |
|---|---|
| 1:47.8 | Then, the statistics. |
| 1:49.4 | Does Culpeper repeat Dioscorides more than chance? We shuffle his claims across the 136 shared species ten thousand times, keeping every count fixed. |
| 1:59.6 | For modern evidence, every claimed indication is compared with twelve unclaimed indications for the same plant. |
| 2:05.6 | With fixed effects for indication, neither famous plants nor fashionable diseases can drive the result. |

## S06 · Result 1: transmission · 2:11.0–2:42.1 (31.1 s)

| time | narration |
|---|---|
| 2:11.3 | First answer: Culpeper repeats Dioscorides 2.6 times more often than chance — still 2.1 times when we match plants by entry length, and 1.6 times even within the same botanical family. |
| 2:26.6 | 642 shared claims against 242 expected; p below 0.0001. |
| 2:32.6 | Wormwood alone keeps 10 indications across sixteen centuries. |
| 2:36.9 | Dioscorides' shrew-mouse bites become Culpeper's biting of rats and mice. |

## S07 · Result 2: modern evidence · 2:42.1–3:04.5 (22.4 s)

| time | narration |
|---|---|
| 2:42.4 | Second answer, with matched controls: 45% of persistent claims have at least one modern paper, versus 32% of unclaimed indications of the same plants. |
| 2:53.4 | That is an odds ratio of 2.8, from 2.0 to 3.8. |
| 2:56.4 | But once studied, they are not studied more: the rate ratio is 1.04, not significant. |
| 2:59.2 | Modern science has looked, but not looked hard. That gap is what our leads target. |

## S08 · Demo: the explorer · 3:04.5–3:21.8 (17.3 s)

| time | narration |
|---|---|
| 3:04.7 | Everything is open: a knowledge graph of 20,425 nodes and 51,430 edges, and a web explorer. |
| 3:11.3 | Pick a plant: read the Greek and English side by side, every claim at its exact span, linked to MeSH, papers, constituents and conservation status. |

## S09 · Leads and impact · 3:21.8–3:51.0 (29.2 s)

| time | narration |
|---|---|
| 3:22.1 | Sixty diversified leads, drawn from 517 candidates, rank persistent but understudied pairs. |
| 3:29.3 | Rue for eye complaints ranks first; basil and oregano for venomous bites, walnut for ulcers: hypotheses, not medical advice. |
| 3:38.2 | The score is transparent, and safety and threat flags stay visible, outside it. |
| 3:43.3 | Historians get a measure of transmission; drug discovery, an explainable shortlist; conservation, threat status for every plant. |

## S10 · Limits, future, links · 3:51.0–4:28.5 (37.5 s)

| time | narration |
|---|---|
| 3:51.3 | These are hypotheses, not medical advice. |
| 3:54.3 | Co-mention measures attention, not efficacy; modern research is partly motivated by tradition; and ancient identifications remain uncertain. |
| 4:03.0 | Literature is searched by accepted names only; synonym search is next. |
| 4:07.3 | Next: expert review within ETHCSTWIN; Galen, Pliny, Byzantine and Arabic sources; and outcome-aware evidence. |
| 4:17.1 | The code, the data and the explorer are open. Palimpsest: the older layer still shows through. |

