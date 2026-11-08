# Voice-over for ElevenLabs — Palimpsest pitch (≈ 4:30)

## Settings
* Model: **Eleven Multilingual v2** (best for Greek/Latin names) or Eleven v3.
* Voice: a warm, mature documentary narrator, British or neutral English (e.g. library voices
  tagged *narration / documentary*). Avoid "hype" voices.
* Stability **45–55 %**, Similarity **75 %**, Style **15–25 %**, Speaker boost **on**, speed **1.0**.
* Generate **one clip per scene** (S01…S10) so each fits its time window; export WAV/MP3 44.1 kHz.
* Name files `S01.mp3 … S10.mp3`. Silence between scenes is handled in the edit.

## Direction (paste into the "voice design"/style prompt if your model supports it)
> Calm, precise, quietly confident documentary narration — like a museum film about an ancient
> manuscript that turns into a modern scientific reveal. Unhurried, clear consonants, small pauses
> before numbers, a slight smile on the final line. No sales tone.

## Script (paste each block as its own generation)

**S01 · 0:00–0:21**
Around sixty CE, the physician Dioscorides wrote a chapter on wormwood — in Greek.
Two thousand years later, a machine reads the same lines.
The word for the jaundiced becomes the concept *Jaundice*.
Loss of appetite, stomach pain, urine — each gets a MeSH identifier.
This is Palimpsest.

**S02 · 0:21–0:43**
Herbals like this are among the oldest records of pharmacology, often mined for drug leads.
But the plant names are ancient, and the diseases obsolete: dropsy, king's evil, strangury.
Most studies read translations by hand, without controls.
So we asked two questions. Which claims survived sixteen centuries of copying?
And has modern science looked at them?

**S03 · 0:43–1:13**
Palimpsest reads three layers of one tradition.
Dioscorides' *De materia medica*, in the original Greek: eight hundred and twenty-two chapters, from Wellmann's critical edition.
Culpeper's *Complete Herbal*, sixteen fifty-three: three hundred and twenty-eight monographs — written over Galen, who wrote over Dioscorides.
And the modern record: forty-eight million Europe PMC records, ClinicalTrials dot gov, LOTUS phytochemistry, GBIF and IUCN.

**S04 · 1:13–1:49**
First, names.
Every Greek lemma and Culpeper heading is mapped to an accepted GBIF species, with a confidence level and a justification.
*Apsínthion* and Culpeper's Wormwood meet as *Artemisia absinthium*.
Second, indications — in two historical languages.
A Greek lexicon immune to inflection and accents, and a seventeenth-century disease crosswalk, both map to eighty-five MeSH concepts.
Every claim keeps its exact character span in the source.
Against a blind reference annotation, extraction reaches an F1 of zero point eight six in Greek, and zero point nine in English.

**S05 · 1:49–2:14**
Then, the statistics.
Does Culpeper repeat Dioscorides more than chance? We shuffle his claims across the one hundred and thirty-six shared species, ten thousand times, keeping every count fixed.
For modern evidence, every claimed indication is compared with twelve unclaimed indications for the same plant.
With fixed effects for indication, neither famous plants nor fashionable diseases can drive the result.

**S06 · 2:14–2:44**
First answer: Culpeper repeats Dioscorides two point six times more often than chance — still two point one times when we match plants by entry length, and one point six times even within the same botanical family.
Six hundred and forty-two shared claims, against two hundred and forty-two expected.
Wormwood alone keeps ten indications across sixteen centuries.
Dioscorides' shrew-mouse bites become Culpeper's biting of rats and mice.

**S07 · 2:44–3:10**
Second answer, with matched controls: forty-five percent of persistent claims have at least one modern paper — versus thirty-two percent of unclaimed indications of the same plants.
That is an odds ratio of two point eight.
But once studied, they are not studied more.
Modern science has looked — but not looked hard. That gap is what our leads target.

**S08 · 3:10–3:29**
Everything is open: a knowledge graph of twenty thousand nodes and fifty-one thousand edges, and a web explorer.
Pick a plant: read the Greek and the English side by side — every claim at its exact span, linked to MeSH, papers, constituents and conservation status.

**S09 · 3:29–3:58**
Sixty diversified leads, drawn from five hundred and seventeen candidates, rank persistent but understudied pairs.
Rue for eye complaints ranks first; basil and oregano for venomous bites; walnut for ulcers. Hypotheses — not medical advice.
The score is transparent, and safety and threat flags stay visible, outside it.
Historians get a measure of transmission; drug discovery, an explainable shortlist; conservation, threat status for every plant.

**S10 · 3:58–4:30**
These are hypotheses, not medical advice.
Co-mention measures attention, not efficacy; modern research is partly motivated by tradition; and ancient identifications remain uncertain.
Literature is searched by accepted names only; synonym search is next.
Next: expert review within the ETHCSTWIN network; Galen, Pliny, Byzantine and Arabic sources; and outcome-aware evidence.
The code, the data and the explorer are open.
Palimpsest. The older layer still shows through.

## Pronunciation (add to an ElevenLabs pronunciation dictionary if needed)
Dioscorides → *dee-oss-KOR-ih-deez* · apsínthion → *ap-SIN-thee-on* · Culpeper → *KUL-pep-er* ·
GBIF → *gee-biff* · MeSH → *mesh* · IUCN → *I-U-C-N* · ETHCSTWIN → *E-T-H-C-S twin* · Artemisia absinthium → *ar-teh-MEE-zee-ah ab-SIN-thee-um*

## Music (human-composed, licence-safe)
Pick one instrumental track ≈ 80–100 BPM, minimal and cinematic (felt piano / strings / soft pulse,
building at 2:14 for the results). Sources with human composers and clear licences:
* **YouTube Audio Library** (free, many tracks need no attribution) — genre *Cinematic* / mood *Inspirational* or *Calm*.
* **Kevin MacLeod — incompetech.com** (CC BY 4.0, attribution in the video description).
* **Free Music Archive** (filter CC BY), **Uppbeat**, or paid **Artlist / Musicbed / Epidemic Sound** for premium.
Check the track page states it is human-composed and allows use in a public video.
Mix the music at about **−20 to −24 dB** under the voice (duck to −28 dB while speaking).
