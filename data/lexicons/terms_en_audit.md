# terms_en.csv - audit (Culpeper, English)

Lexicon of Python regexes applied with `re.finditer` to `palimpsest.textnorm.normalize_english(analysis_text)` (Culpeper *Government and virtues* sections, `data/interim/monographs.jsonl`, `source == "culpeper"`). Corpus: 328 monographs (1 with empty analysis_text), 447,845 characters. The blind annotation set (`data/annotations/`) was not opened.

## Summary

- **353 patterns**, all compiling; **85/85 concepts covered (100%)**; polarity: 311 therapeutic, 22 action, 20 adverse.
- On the corpus the lexicon produces 5,510 matches, i.e. 3,753 distinct (monograph, concept, polarity) claims (3371 therapeutic, 345 action, 37 adverse).
- **Spot-check:** 1,484 of 1,508 sampled hits judged correct (concept *and* polarity) = 98.4% unweighted; 97.2% when each row is weighted by its hit count. No retained pattern is below 80% on its sample; rows with 1-4 hits were read in full, so their estimates rest on very few cases.
- Recall was **not** measured (that needs the blind reference set).

## Method

1. Word-frequency list of the whole virtues corpus (all 4,295 types, hapaxes included) and keyword-in-context reading for every concept in `concepts.csv` and for every historical term in the brief, to discover forms (e.g. *lask*, *stranguary*, *tertain*, *morrhoids*, *dandriff*, *pushes*, *wheals*, *crick*, *liver-grown*, *chin-cough*, *the frets*, *iliac passion*).
2. About 170 hand-written rules (word boundaries, look-arounds for exclusions, bounded word gaps such as `(?:[\w'-]+,?\s+){0,4}?` for *provokes urine and women's courses*, tempered gaps that may not contain *provoke/procure/bring* for *stays ... courses*).
3. Each rule was split at top-level alternation. Branches with >=3 hits became their own row; rarer branches of the same rule were merged into one row; 49 branches with 0 hits in Culpeper were dropped (no attested example).
4. For every row, 5 hits (random, fixed seed) were read at +/-70 characters (6 for rows re-checked after a fix; all hits for rows with <=5 hits and for some large rows such as *rheum* and *stays ... courses*). A hit counts as correct only if both concept and polarity are right in context. Rows under 80% were tightened and re-read, or dropped (see below).
5. `example` is the most frequent matched string in the corpus (so it is attested by construction); the CSV was written with `csv.writer` and re-read for validation.

**Notes for the extractor.** Matches overlap: 156 overlapping pairs share concept and polarity (e.g. *stays the immoderate flux of women's courses* matches two menorrhagia rows) and 105 pairs link different concepts, almost all genuine co-listings (*provokes urine and women's courses* -> diuresis + amenorrhea; *sore mouths and throats* -> mouth_gums + sore_throat; *stays lasks and women's courses* -> diarrhea + menorrhagia). The only same-concept opposite-polarity overlaps left are action + therapeutic (e.g. *dissolve the wind ... in the belly*). Deduplicate claims per (monograph, concept, polarity). `adverse` is used only for explicit warnings or harms (*hurtful to the stomach*, *causes abortion*, *let it not be given to women with child*, *causes head-ache*, *windy meat*, *raise blisters*); `action` marks pharmacological actions (diuretic, emmenagogue, cathartic, emetic, carminative, expectorant, galactagogue, soporific, aphrodisiac/anaphrodisiac).

## Per-pattern table

`#` = data row in `terms_en.csv` (1-based, header excluded). Spot = correct/read. FP = what the misreads were.

| # | concept_id | pol | example | hits | docs | spot | FP / comment |
|---:|---|---|---|---:|---:|---:|---|
| 1 | dyspepsia | the | weak stomachs | 24 | 22 | 5/5 |  |
| 2 | dyspepsia | the | strengthens the stomach | 26 | 23 | 5/5 |  |
| 3 | dyspepsia | the | pains of the stomach | 21 | 20 | 5/5 |  |
| 4 | dyspepsia | the | digestion | 24 | 20 | 4/5 | 'harder of digestion' = description |
| 5 | dyspepsia | the | surfeit | 8 | 8 | 5/5 |  |
| 6 | dyspepsia | the | crudities | 2 | 2 | 2/2 |  |
| 7 | dyspepsia | the | gnawing of the heart | 1 | 1 | 1/1 |  |
| 8 | dyspepsia | adv | offends the stomach | 5 | 5 | 5/5 |  |
| 9 | diarrhea | the | lasks | 39 | 37 | 5/5 |  |
| 10 | diarrhea | the | fluxes of the belly | 21 | 19 | 5/5 |  |
| 11 | diarrhea | the | scouring | 3 | 3 | 3/3 |  |
| 12 | diarrhea | act | bind the belly | 13 | 12 | 5/5 |  |
| 13 | dysentery | the | bloody flux | 38 | 37 | 5/5 |  |
| 14 | dysentery | the | tenesmus | 1 | 1 | 1/1 |  |
| 15 | dysentery | the | ulcers of the bowels | 5 | 4 | 5/5 |  |
| 16 | constipation | act | purge the body | 49 | 42 | 5/5 |  |
| 17 | constipation | act | purges choler | 36 | 25 | 5/5 |  |
| 18 | constipation | act | solutive | 4 | 3 | 4/4 |  |
| 19 | flatulence | act | expel wind | 37 | 32 | 5/5 |  |
| 20 | flatulence | the | wind in the stomach | 16 | 15 | 5/5 |  |
| 21 | flatulence | the | troubled with wind | 4 | 4 | 4/4 |  |
| 22 | flatulence | adv | windy meat | 3 | 3 | 3/3 |  |
| 23 | flatulence | adv | extremely windy | 6 | 6 | 5/5 |  |
| 24 | colic | the | cholic | 41 | 39 | 5/5 |  |
| 25 | colic | the | colic | 3 | 3 | 3/3 |  |
| 26 | colic | the | belly-ache | 3 | 3 | 3/3 |  |
| 27 | colic | the | griping | 23 | 23 | 4/5 | 'griping pains of the gout' |
| 28 | colic | the | torments of the belly | 5 | 5 | 5/5 |  |
| 29 | colic | the | wringings | 1 | 1 | 1/1 |  |
| 30 | colic | the | pains in the bowels | 20 | 19 | 5/5 |  |
| 31 | nausea_vomiting | the | vomiting | 24 | 22 | 5/6 | 'poison voided by vomit' (emetic route) |
| 32 | nausea_vomiting | act | provokes vomiting | 9 | 6 | 5/5 |  |
| 33 | nausea_vomiting | act | purge the body both upwards | 3 | 3 | 3/3 |  |
| 34 | nausea_vomiting | the | casting | 10 | 8 | 5/5 |  |
| 35 | nausea_vomiting | the | loathings | 3 | 3 | 3/3 | all hits read after excluding 'loathing it brings' |
| 36 | nausea_vomiting | the | disposition to vomit | 2 | 2 | 2/2 |  |
| 37 | helminthiasis | the | worms | 64 | 59 | 5/6 | 'kill worms' in putrified ulcers (maggots) |
| 38 | helminthiasis | adv | breeds worms | 1 | 1 | 1/1 |  |
| 39 | hemorrhoids | the | piles | 28 | 26 | 5/5 |  |
| 40 | hemorrhoids | the | hæmorrhoids | 15 | 14 | 5/5 |  |
| 41 | hemorrhoids | the | falling down of the fundament | 3 | 3 | 3/3 |  |
| 42 | appetite_loss | the | appetite | 19 | 18 | 5/5 |  |
| 43 | appetite_loss | the | loathing thereof unto meat | 3 | 3 | 3/3 |  |
| 44 | hiccup | the | hiccough | 7 | 6 | 5/5 |  |
| 45 | jaundice | the | jaundice | 85 | 79 | 5/5 |  |
| 46 | liver_disease | the | obstructions of the liver | 59 | 55 | 5/5 |  |
| 47 | liver_disease | the | hot liver | 5 | 5 | 5/5 |  |
| 48 | liver_disease | the | liver-grown | 4 | 4 | 4/4 |  |
| 49 | liver_disease | the | opens obstructions of the liver | 36 | 31 | 5/5 |  |
| 50 | liver_disease | the | obstructions of the gall | 3 | 3 | 3/3 |  |
| 51 | liver_disease | adv | prejudicial to the liver | 1 | 1 | 1/1 |  |
| 52 | spleen_disease | the | spleen | 97 | 83 | 5/5 |  |
| 53 | spleen_disease | the | splenetic | 6 | 6 | 4/5 | astrological 'so splenetic' |
| 54 | spleen_disease | the | hypochondria | 1 | 1 | 1/1 |  |
| 55 | cough | the | cough | 71 | 66 | 6/6 |  |
| 56 | cough | the | coughing | 3 | 3 | 3/3 | 'humours ... procure coughing' is the complaint treated |
| 57 | cough | the | chin-cough | 2 | 2 | 2/2 |  |
| 58 | cough | act | expectorate | 11 | 11 | 5/5 |  |
| 59 | cough | act | phlegm in the chest | 5 | 5 | 5/5 |  |
| 60 | cough | act | breast and lungs of phlegm | 6 | 6 | 5/5 |  |
| 61 | cough | adv | enemy to those that have the cough | 1 | 1 | 1/1 |  |
| 62 | asthma_dyspnea | the | shortness of breath | 35 | 34 | 5/5 |  |
| 63 | asthma_dyspnea | the | short-winded | 9 | 8 | 6/6 |  |
| 64 | asthma_dyspnea | the | wheezing | 18 | 17 | 5/5 |  |
| 65 | asthma_dyspnea | the | difficulty of breath | 3 | 3 | 3/3 |  |
| 66 | asthma_dyspnea | the | cannot fetch their breath | 4 | 4 | 4/4 |  |
| 67 | asthma_dyspnea | the | phthisicks | 7 | 7 | 5/5 | concept choice asthma vs tuberculosis is interpretive |
| 68 | asthma_dyspnea | adv | forbidden to those that are short-winded | 1 | 1 | 1/1 |  |
| 69 | pleurisy_pneumonia | the | pleurisy | 11 | 11 | 5/5 |  |
| 70 | pain | the | stitches | 18 | 17 | 6/6 |  |
| 71 | pain | the | pricking pains of the sides | 3 | 3 | 3/3 |  |
| 72 | pain | the | stiches | 2 | 2 | 2/2 |  |
| 73 | pleurisy_pneumonia | the | inflammation of the lungs | 2 | 2 | 2/2 |  |
| 74 | sore_throat | the | quinsy | 13 | 11 | 5/5 |  |
| 75 | sore_throat | the | sore mouths and throats | 7 | 7 | 4/5 | 'likelier to cause a sore mouth and throat' (adverse) |
| 76 | sore_throat | the | swellings in the throat | 16 | 15 | 5/5 |  |
| 77 | sore_throat | the | almonds of the throat | 3 | 3 | 3/3 |  |
| 78 | sore_throat | the | palate of the mouth in its place | 4 | 4 | 4/4 |  |
| 79 | sore_throat | the | falling of the palate | 2 | 2 | 2/2 |  |
| 80 | sore_throat | the | hoarseness | 17 | 16 | 5/5 |  |
| 81 | sore_throat | the | lost their voice | 4 | 4 | 4/4 |  |
| 82 | sore_throat | the | loss of the voice | 1 | 1 | 1/1 |  |
| 83 | tuberculosis | the | consumption | 23 | 22 | 5/5 |  |
| 84 | tuberculosis | the | phthisic | 4 | 4 | 4/4 |  |
| 85 | tuberculosis | the | ulcer in the lungs | 6 | 6 | 5/5 |  |
| 86 | common_cold | the | rheum | 41 | 38 | 36/41 | all 41 hits read; residual FPs = rheum falling on teeth/eyes/palate |
| 87 | common_cold | the | catarrhs | 7 | 7 | 5/5 |  |
| 88 | common_cold | the | distillations | 34 | 33 | 5/5 |  |
| 89 | common_cold | the | colds | 6 | 6 | 4/5 | 'pained with colds' (cold) |
| 90 | diuresis | act | provokes urine | 96 | 90 | 5/5 |  |
| 91 | diuresis | act | make water abundantly | 2 | 2 | 2/2 |  |
| 92 | diuresis | the | stopping of urine | 12 | 11 | 5/5 |  |
| 93 | diuresis | the | cannot make water | 6 | 6 | 5/5 |  |
| 94 | dysuria | the | stranguary | 27 | 27 | 5/5 |  |
| 95 | dysuria | the | dysuries | 1 | 1 | 1/1 |  |
| 96 | dysuria | the | difficulty of making water | 13 | 13 | 5/5 |  |
| 97 | dysuria | the | excoriation in the urinary | 1 | 1 | 1/1 |  |
| 98 | urolithiasis | the | stone | 124 | 93 | 5/5 |  |
| 99 | urolithiasis | the | gravel | 39 | 37 | 5/5 |  |
| 100 | kidney_disease | the | reins | 63 | 57 | 5/5 |  |
| 101 | kidney_disease | the | kidneys | 55 | 53 | 5/5 |  |
| 102 | kidney_disease | the | bladder | 50 | 45 | 5/5 |  |
| 103 | kidney_disease | the | cannot hold their water | 3 | 3 | 3/3 |  |
| 104 | kidney_disease | the | bloody urine | 5 | 5 | 5/5 |  |
| 105 | kidney_disease | the | pissing of blood | 2 | 2 | 2/2 |  |
| 106 | sexual_function | act | lust | 23 | 20 | 5/5 |  |
| 107 | sexual_function | act | venerous | 1 | 1 | 1/1 |  |
| 108 | sexual_function | act | increase sperm | 6 | 5 | 5/5 |  |
| 109 | sexual_function | the | venerous dreams | 3 | 3 | 3/3 |  |
| 110 | sexual_function | the | involuntary course of natural seed | 6 | 4 | 5/5 |  |
| 111 | sexual_function | adv | spoil the spirit procreative | 2 | 2 | 2/2 |  |
| 112 | amenorrhea | act | provokes women's courses | 83 | 80 | 5/5 |  |
| 113 | amenorrhea | the | stoppings of their courses | 4 | 4 | 4/4 |  |
| 114 | menorrhagia | the | stay women's courses | 35 | 32 | 5/5 |  |
| 115 | menorrhagia | the | abundance of women's courses | 17 | 17 | 5/5 |  |
| 116 | menorrhagia | the | immoderate courses of women | 5 | 5 | 5/5 |  |
| 117 | menorrhagia | the | reds | 4 | 4 | 4/4 |  |
| 118 | menorrhagia | the | women's bloody issues | 1 | 1 | 1/1 |  |
| 119 | leukorrhea | the | whites | 20 | 18 | 5/5 |  |
| 120 | labor | the | dead child | 16 | 15 | 5/5 |  |
| 121 | labor | the | after-birth | 21 | 19 | 5/5 |  |
| 122 | labor | the | secundine | 1 | 1 | 1/1 |  |
| 123 | labor | the | speedy delivery | 12 | 12 | 5/5 |  |
| 124 | labor | the | delivery of women | 4 | 4 | 4/4 |  |
| 125 | labor | the | travail | 11 | 11 | 5/5 |  |
| 126 | labor | the | child-birth | 11 | 11 | 4/5 | 'miscarriage in child-bearing' |
| 127 | labor | the | brought to bed | 5 | 5 | 5/5 |  |
| 128 | abortifacient | adv | procure abortion | 4 | 4 | 4/4 |  |
| 129 | abortifacient | adv | suffocates the birth | 4 | 4 | 4/4 |  |
| 130 | abortifacient | adv | not to be taken by such as have not gone out their time | 4 | 4 | 4/4 |  |
| 131 | abortifacient | adv | pregnant women forbear | 1 | 1 | 1/1 |  |
| 132 | abortifacient | the | hinders abortion | 5 | 5 | 5/5 |  |
| 133 | lactation | act | increase milk | 10 | 8 | 5/5 |  |
| 134 | lactation | act | milk in nurses | 3 | 3 | 3/3 |  |
| 135 | lactation | act | store of milk | 5 | 5 | 5/5 |  |
| 136 | lactation | act | repress the milk | 2 | 2 | 2/2 |  |
| 137 | lactation | the | curdling of their milk | 4 | 4 | 4/4 |  |
| 138 | uterine_disorders | the | the mother | 45 | 42 | 5/5 |  |
| 139 | uterine_disorders | the | womb | 17 | 10 | 5/5 |  |
| 140 | uterine_disorders | the | matrix | 6 | 6 | 4/5 | route of administration |
| 141 | infertility | the | helps conception | 3 | 3 | 3/3 |  |
| 142 | infertility | the | makes barren women fruitful | 2 | 2 | 2/2 |  |
| 143 | infertility | adv | causes barrenness | 2 | 2 | 2/2 |  |
| 144 | contraception | act | hinders conception | 2 | 2 | 2/2 |  |
| 145 | headache | the | head-ache | 23 | 23 | 5/5 |  |
| 146 | headache | the | megrim | 4 | 4 | 4/4 |  |
| 147 | headache | the | pains in the head | 23 | 23 | 4/5 | 'said to procure pains in the head' (adverse) |
| 148 | headache | the | head ache | 1 | 1 | 1/1 |  |
| 149 | headache | adv | causes head-ache | 3 | 3 | 3/3 |  |
| 150 | headache | adv | fumes into the head | 2 | 1 | 2/2 |  |
| 151 | epilepsy | the | falling sickness | 35 | 32 | 5/5 |  |
| 152 | insomnia | act | procure rest | 15 | 10 | 5/5 |  |
| 153 | insomnia | the | want of sleep | 4 | 4 | 4/4 |  |
| 154 | insomnia | the | hinders rest | 1 | 1 | 1/1 |  |
| 155 | melancholy | the | troubled with melancholy | 14 | 11 | 6/6 |  |
| 156 | melancholy | the | melancholy diseases | 6 | 6 | 6/6 |  |
| 157 | melancholy | the | sadness | 4 | 3 | 4/4 |  |
| 158 | melancholy | the | make a merry | 4 | 4 | 4/4 |  |
| 159 | melancholy | the | diseases of melancholy | 5 | 5 | 5/5 |  |
| 160 | anxiety | the | fearful | 3 | 3 | 3/3 | drink-induced fearful imaginations are the complaint treated |
| 161 | paralysis | the | palsy | 25 | 21 | 5/5 |  |
| 162 | paralysis | the | benumbed | 4 | 4 | 4/4 |  |
| 163 | paralysis | the | loss of speech | 8 | 5 | 5/5 |  |
| 164 | stroke | the | apoplexy | 5 | 5 | 5/5 |  |
| 165 | vertigo | the | vertigo | 5 | 5 | 5/5 |  |
| 166 | vertigo | the | giddiness | 6 | 6 | 5/5 |  |
| 167 | vertigo | the | swimmings therein | 7 | 6 | 5/5 |  |
| 168 | memory | the | memory | 9 | 9 | 5/5 |  |
| 169 | memory | the | dullness of the spirits | 5 | 4 | 5/5 |  |
| 170 | delirium | the | frenzy | 7 | 6 | 5/5 |  |
| 171 | delirium | the | phrensy | 3 | 3 | 3/3 |  |
| 172 | delirium | the | lethargy | 18 | 16 | 5/5 |  |
| 173 | delirium | the | frantic | 3 | 3 | 3/3 |  |
| 174 | delirium | the | drowsiness | 9 | 9 | 5/5 |  |
| 175 | convulsions | the | cramps | 44 | 41 | 5/5 |  |
| 176 | convulsions | the | convulsions | 31 | 30 | 5/5 |  |
| 177 | convulsions | the | shrinking of the sinews | 6 | 6 | 5/5 |  |
| 178 | convulsions | the | crick | 5 | 4 | 5/5 |  |
| 179 | convulsions | the | stiff and benumbed sinews | 9 | 9 | 9/9 | all hits read |
| 180 | gout | the | gout | 63 | 60 | 5/5 |  |
| 181 | gout | the | gouty | 1 | 1 | 1/1 |  |
| 182 | sciatica | the | sciatica | 54 | 52 | 5/5 |  |
| 183 | sciatica | the | hip-gout | 4 | 4 | 4/4 |  |
| 184 | sciatica | the | pains of the hips | 4 | 4 | 4/4 |  |
| 185 | joint_pain | the | joint-aches | 11 | 11 | 5/5 |  |
| 186 | joint_pain | the | pains of the joints | 14 | 13 | 5/5 |  |
| 187 | joint_pain | the | cold joints | 4 | 4 | 4/4 |  |
| 188 | joint_pain | the | joint full of pain | 3 | 3 | 3/3 |  |
| 189 | bruises | the | bruises | 41 | 39 | 5/5 |  |
| 190 | bruises | the | bruised by any | 7 | 7 | 5/5 |  |
| 191 | bruises | the | that are bruised | 8 | 8 | 5/5 |  |
| 192 | bruises | the | black and blue | 13 | 13 | 5/5 |  |
| 193 | bruises | the | any bruise | 3 | 3 | 3/3 |  |
| 194 | bruises | the | congealed blood | 20 | 19 | 5/5 |  |
| 195 | bruises | the | falls or blows | 4 | 4 | 4/4 |  |
| 196 | bruises | the | blows or falls | 3 | 3 | 3/3 |  |
| 197 | bruises | the | out of joint | 16 | 16 | 5/5 |  |
| 198 | bruises | the | over-strained | 2 | 2 | 2/2 |  |
| 199 | pain | the | pains | 48 | 42 | 4/5 | 'without causing pains' |
| 200 | pain | the | aches | 13 | 11 | 5/5 |  |
| 201 | pain | the | all pains in the body | 2 | 2 | 2/2 |  |
| 202 | wounds | the | wounds | 188 | 109 | 6/6 |  |
| 203 | wounds | the | solder | 7 | 7 | 5/5 |  |
| 204 | wounds | the | close up the lips | 4 | 4 | 4/4 |  |
| 205 | wounds | the | vulnerary | 7 | 7 | 6/6 |  |
| 206 | wounds | adv | bad for wounded | 2 | 1 | 2/2 |  |
| 207 | wounds | the | draws forth splinters | 11 | 11 | 5/5 |  |
| 208 | wounds | the | splinters | 13 | 13 | 5/5 |  |
| 209 | skin_ulcers | the | ulcers | 140 | 114 | 5/6 | 'ulcers and putrid sores of the mouth' |
| 210 | skin_ulcers | the | ulcerous | 3 | 3 | 3/3 |  |
| 211 | skin_ulcers | the | sores | 123 | 94 | 4/5 | 'running sores of them' = ears |
| 212 | skin_ulcers | the | fretting sore | 2 | 2 | 2/2 |  |
| 213 | skin_ulcers | the | cankers | 27 | 27 | 5/5 |  |
| 214 | skin_ulcers | the | fistulas | 29 | 28 | 5/5 |  |
| 215 | skin_ulcers | the | gangrenes | 9 | 9 | 5/5 |  |
| 216 | skin_ulcers | the | mortifications | 3 | 3 | 3/3 |  |
| 217 | burns | the | burnings | 21 | 21 | 5/5 |  |
| 218 | burns | the | scaldings | 10 | 10 | 5/5 |  |
| 219 | burns | the | burnt with fire | 7 | 7 | 5/5 |  |
| 220 | burns | the | burning by fire | 3 | 3 | 3/3 |  |
| 221 | burns | the | blisters raised by burning | 1 | 1 | 1/1 |  |
| 222 | itch_scabies | the | itch | 47 | 44 | 6/6 |  |
| 223 | itch_scabies | the | scabs | 55 | 51 | 5/5 |  |
| 224 | itch_scabies | the | scabby | 3 | 3 | 3/3 |  |
| 225 | itch_scabies | the | manginess | 2 | 2 | 2/2 |  |
| 226 | dermatitis | the | tetters | 23 | 21 | 5/5 |  |
| 227 | dermatitis | the | scurf | 17 | 17 | 5/5 |  |
| 228 | dermatitis | the | dandriff | 5 | 5 | 5/5 |  |
| 229 | dermatitis | the | breakings-out | 12 | 12 | 5/5 |  |
| 230 | dermatitis | the | eruptions | 4 | 4 | 4/4 |  |
| 231 | dermatitis | the | wheals | 22 | 22 | 5/5 |  |
| 232 | dermatitis | the | chops | 3 | 3 | 3/3 |  |
| 233 | dermatitis | the | blains | 7 | 6 | 5/5 |  |
| 234 | dermatitis | adv | raise blisters | 3 | 2 | 3/3 | all hits read; deliberate counter-irritation excluded |
| 235 | tinea | the | ringworms | 18 | 18 | 5/5 |  |
| 236 | tinea | the | scald | 2 | 2 | 2/2 |  |
| 237 | scaly_skin | the | leprosy | 23 | 23 | 5/5 |  |
| 238 | scaly_skin | the | leprous | 1 | 1 | 1/1 |  |
| 239 | alopecia | the | bald | 5 | 5 | 5/5 |  |
| 240 | alopecia | the | falling or shedding of the hair | 10 | 8 | 5/5 |  |
| 241 | alopecia | the | hair from falling | 4 | 4 | 4/4 |  |
| 242 | alopecia | the | hair fallen | 2 | 2 | 2/2 |  |
| 243 | warts | the | warts | 14 | 13 | 5/5 |  |
| 244 | warts | the | worts and corns | 2 | 2 | 2/2 |  |
| 245 | skin_blemishes | the | freckles | 28 | 28 | 5/5 |  |
| 246 | skin_blemishes | the | sun-burning | 10 | 9 | 5/5 |  |
| 247 | skin_blemishes | the | morphew | 27 | 27 | 5/5 |  |
| 248 | skin_blemishes | the | spots | 68 | 49 | 5/5 |  |
| 249 | skin_blemishes | the | scars | 8 | 8 | 5/5 |  |
| 250 | skin_blemishes | the | pimples | 13 | 13 | 5/5 |  |
| 251 | skin_blemishes | the | pushes | 16 | 16 | 5/5 |  |
| 252 | skin_blemishes | the | pustules | 1 | 1 | 1/1 |  |
| 253 | skin_blemishes | the | cleanses the skin | 24 | 24 | 5/5 |  |
| 254 | abscess | the | imposthumes | 39 | 34 | 5/5 |  |
| 255 | abscess | the | felons | 6 | 6 | 5/5 |  |
| 256 | abscess | the | boils | 7 | 7 | 5/5 |  |
| 257 | abscess | the | carbuncles | 3 | 3 | 3/3 |  |
| 258 | abscess | the | whitlows | 3 | 3 | 3/3 |  |
| 259 | erysipelas | the | anthony's fire | 19 | 19 | 5/5 |  |
| 260 | erysipelas | the | shingles | 5 | 5 | 5/5 | shingles = herpes zoster; mapping is historical |
| 261 | inflammation | the | inflammations | 115 | 88 | 4/5 | 'causes ... inflammations' (adverse) |
| 262 | inflammation | the | hot swellings | 15 | 14 | 4/5 | 'windy swellings of the spleen' |
| 263 | inflammation | the | sore breasts | 4 | 4 | 4/4 |  |
| 264 | inflammation | the | swelling of women's breasts | 4 | 4 | 4/4 |  |
| 265 | cancer | the | cancers | 6 | 6 | 5/5 |  |
| 266 | cancer | the | hard swellings | 18 | 17 | 5/5 | hard tumour = Galenic scirrhus; malignancy not implied |
| 267 | cancer | the | wens | 6 | 6 | 5/5 | wens = cysts; concept-level caveat |
| 268 | cancer | the | cancerous | 2 | 2 | 2/2 |  |
| 269 | scrofula | the | king's evil | 25 | 22 | 5/5 |  |
| 270 | scrofula | the | scrophulous | 1 | 1 | 1/1 |  |
| 271 | scrofula | the | kernels in the throat | 12 | 12 | 5/5 |  |
| 272 | scrofula | the | kernels that rise behind the ears | 2 | 2 | 2/2 |  |
| 273 | eye_disease | the | dimness of sight | 13 | 12 | 5/5 |  |
| 274 | eye_disease | the | dull sight | 5 | 4 | 5/5 | all hits read; astrological 'weak sight' excluded |
| 275 | eye_disease | the | clear the sight | 19 | 15 | 5/5 |  |
| 276 | eye_disease | the | pin and web | 8 | 8 | 5/5 |  |
| 277 | eye_disease | the | film | 17 | 13 | 5/5 |  |
| 278 | eye_disease | the | mists | 7 | 7 | 5/5 |  |
| 279 | eye_disease | the | ulcers that happen in the eyes | 8 | 7 | 5/5 |  |
| 280 | eye_disease | adv | spoiling the eye-sight | 2 | 2 | 2/2 |  |
| 281 | conjunctivitis | the | sore eyes | 8 | 7 | 5/5 |  |
| 282 | conjunctivitis | the | inflammations of the eyes | 19 | 16 | 5/5 |  |
| 283 | conjunctivitis | the | watering eyes | 10 | 9 | 5/5 |  |
| 284 | conjunctivitis | the | eyes that are inflamed | 3 | 3 | 3/3 |  |
| 285 | conjunctivitis | the | distillations from the brain to the eyes | 14 | 14 | 5/5 |  |
| 286 | ear_disease | the | pains in the ears | 18 | 18 | 5/5 |  |
| 287 | ear_disease | the | deafness | 10 | 10 | 5/5 |  |
| 288 | ear_disease | the | imposthumed ears | 5 | 5 | 5/5 |  |
| 289 | ear_disease | the | into the ears, eases the pains | 32 | 32 | 5/5 |  |
| 290 | toothache | the | tooth-ache | 23 | 23 | 5/5 |  |
| 291 | toothache | the | tooth ache | 3 | 3 | 3/3 |  |
| 292 | toothache | the | hollow tooth | 10 | 10 | 5/5 |  |
| 293 | toothache | the | teeth that ach | 4 | 4 | 4/4 |  |
| 294 | mouth_gums | the | sore mouths | 14 | 14 | 5/5 |  |
| 295 | mouth_gums | the | ulcers in the mouth | 21 | 20 | 5/5 |  |
| 296 | mouth_gums | the | mouth that are sore | 3 | 3 | 3/3 |  |
| 297 | mouth_gums | the | gums | 16 | 15 | 5/5 |  |
| 298 | mouth_gums | the | loose teeth | 4 | 4 | 4/4 |  |
| 299 | mouth_gums | the | fastens loose teeth | 5 | 5 | 5/5 |  |
| 300 | mouth_gums | the | teeth that are loose | 1 | 1 | 1/1 |  |
| 301 | mouth_gums | the | stinking breath | 8 | 8 | 4/5 | astrological narrative |
| 302 | mouth_gums | the | roughness of the tongue | 4 | 4 | 4/4 |  |
| 303 | mouth_gums | the | ill-savoured breath | 1 | 1 | 1/1 |  |
| 304 | nosebleed | the | bleeding at the nose | 12 | 12 | 5/5 |  |
| 305 | edema_dropsy | the | dropsy | 50 | 44 | 5/5 |  |
| 306 | edema_dropsy | the | hydropick | 3 | 3 | 3/3 |  |
| 307 | heart | the | swoonings | 12 | 12 | 5/5 |  |
| 308 | heart | the | fainting | 19 | 15 | 5/5 |  |
| 309 | heart | the | passions of the heart | 6 | 6 | 5/5 |  |
| 310 | heart | the | trembling of the heart | 4 | 4 | 4/4 |  |
| 311 | heart | the | comforts the heart | 27 | 18 | 5/5 |  |
| 312 | heart | the | cordial | 19 | 9 | 5/5 |  |
| 313 | heart | adv | hurts the heart | 1 | 1 | 1/1 |  |
| 314 | hemorrhage | the | bleeding | 51 | 44 | 5/5 |  |
| 315 | hemorrhage | the | stay fluxes of blood | 7 | 7 | 5/5 |  |
| 316 | hemorrhage | the | fluxes of blood | 18 | 18 | 5/5 |  |
| 317 | hemorrhage | the | vomiting blood | 4 | 4 | 4/4 |  |
| 318 | hemoptysis | the | spitting of blood | 25 | 24 | 5/5 |  |
| 319 | fever | the | agues | 66 | 57 | 5/5 |  |
| 320 | fever | the | fevers | 26 | 25 | 5/5 |  |
| 321 | fever | the | hot fits | 6 | 6 | 5/5 |  |
| 322 | fever | the | quotidian | 4 | 4 | 4/4 |  |
| 323 | fever | the | hectic | 2 | 2 | 2/2 |  |
| 324 | malaria | the | quartan | 15 | 14 | 5/5 |  |
| 325 | malaria | the | tertian | 13 | 13 | 5/5 |  |
| 326 | malaria | the | third day ague | 1 | 1 | 1/1 |  |
| 327 | plague | the | plague | 41 | 38 | 5/5 |  |
| 328 | plague | the | pestilential | 33 | 32 | 5/5 |  |
| 329 | plague | the | infection of the plague | 3 | 3 | 3/3 |  |
| 330 | syphilis | the | pox | 14 | 12 | 5/5 |  |
| 331 | syphilis | the | french disease | 6 | 6 | 5/5 |  |
| 332 | syphilis | the | antivenereal | 6 | 5 | 5/5 |  |
| 333 | syphilis | the | veneral heat | 2 | 2 | 2/2 |  |
| 334 | scurvy | the | scurvy | 8 | 8 | 6/6 |  |
| 335 | scurvy | the | scorbutic | 1 | 1 | 1/1 |  |
| 336 | scurvy | adv | breed but scurvy | 1 | 1 | 1/1 |  |
| 337 | poisoning | the | poison | 68 | 52 | 4/5 | 'as bad as poison' |
| 338 | poisoning | the | antidote | 7 | 6 | 5/5 |  |
| 339 | poisoning | the | counter-poison | 5 | 5 | 5/5 |  |
| 340 | poisoning | the | poisonous herbs | 5 | 5 | 5/5 |  |
| 341 | poisoning | the | deadly poison | 3 | 3 | 3/3 |  |
| 342 | poisoning | the | venom | 11 | 11 | 5/6 | 'venom ... of any beast' |
| 343 | poisoning | the | taking wolf-bane | 3 | 3 | 3/3 |  |
| 344 | envenomation | the | venomous | 48 | 45 | 5/5 |  |
| 345 | envenomation | the | venom of serpents | 3 | 3 | 3/3 |  |
| 346 | envenomation | the | poison of any serpent | 1 | 1 | 1/1 |  |
| 347 | envenomation | the | biting of | 42 | 38 | 5/5 |  |
| 348 | envenomation | the | bitten | 29 | 19 | 5/5 |  |
| 349 | envenomation | the | serpents | 67 | 50 | 5/6 | 'drives away flies, wasps' |
| 350 | rabies | the | mad dogs | 21 | 18 | 5/5 |  |
| 351 | intoxication | the | surfeit by drinking | 9 | 6 | 5/5 |  |
| 352 | lice | the | lice | 8 | 8 | 5/5 |  |
| 353 | lice | the | fleas | 5 | 5 | 5/5 |  |

## Dropped or tightened after the spot-check

| pattern (as first drafted) | hits | problem | decision |
|---|---:|---|---|
| bare `fluxes` (not of the belly/blood/courses) | 34 | 'stay all fluxes in man or woman' covers blood and menstrual fluxes; ~60% diarrhoea | dropped; *lasks and fluxes* still caught by *lask* |
| `pains in the side(s)` -> pleurisy | 22 | Culpeper attributes side pains to wind or the spleen | dropped |
| `stitch(es)`, `pricking ... of the sides` -> pleurisy | 23 | 1 of 20 stitch hits in a chest context | re-mapped to `pain` |
| `a cold` | 2 | 'of a cold, dry, and binding nature' | dropped |
| `wits` | 2 | 'never well in its wits since' (jest) | dropped; *dull wits* kept |
| `marks` (skin) | 18 | mostly bruise marks | dropped; *black and blue* -> bruises |
| `blisters` (therapeutic) | 6 | 5/6 are 'leaves will raise blisters' | re-mapped to dermatitis **adverse** (vesicant) |
| `exulcerated` | 4 | kidneys, bladder, lungs, not skin | dropped |
| `inflamed` | 8 | eyes / throat that are inflamed | dropped; organ rows cover these |
| `pearl` | 2 | 'a white spot in the leaf like a pearl' | dropped; *pin and web* kept |
| `wounded` | 5 | tree 'being wounded'; 'bad for wounded people' | split: therapeutic *are wounded / wounded limbs*, adverse *bad for wounded* |
| `biting` (any) | n/a | 'hot biting arssmart', 'biting taste' | restricted to *biting(s)/stinging(s) of/by*, *bitten*, *stung* |
| `ulcers` | 146 | 'inward ulcers of the body' | excluded inward / of the body / mouth / lungs / bladder / eyes |
| `kernels` (any) | 21 | botanical kernels; lumps in the face | restricted to kernels in/of/by the throat, neck, ears |
| `melancholy` after *for / oppressed by* | n/a | 'unwholesome for melancholy people' | verbs removed; humoral *purges melancholy* never matched |
| `corns` | 3 | 'corns of bay salt', 'corns of wheat' | excluded |
| `scurvy` | 9 | 'scurvy grass' (plant) | excluded |
| `serpents/scorpions` | 68 | 'under the scorpion' (zodiac) | excluded |
| `crudities`, `vomiting`, `head ache`, `cough`, `short-winded`, `worms` | n/a | opposite-polarity duplicates of adverse rows (*breed crudities*, *procure head ache*, *enemy to ... the cough*, *forbidden to ... short-winded*, *breeds worms*) and ear worms | look-behinds added |

## Ambiguities and historical meanings

- **phthisic / phthisick.** OED gives both *phthisis* (pulmonary consumption) and, in 17th-c. use, *asthma, a tight cough*. Culpeper uses it both ways: where he glosses it (*the phthisic, or consumption of the lungs*, 4 hits) it is mapped to `tuberculosis`; where it is listed beside and distinct from consumption (*thin rheum upon the lungs, which cause phthisicks, and oftentimes consumptions*; *phthisicks, wheezings, shortness of breath*, 7 hits) it is mapped to `asthma_dyspnea`. This split is interpretive and flagged in the note column.
- **consumption.** OED sense 3, wasting disease, chiefly pulmonary tuberculosis; Culpeper's *consumption of the lungs*, often caused by *salt rheum distilling on the lungs*. The cookery sense *boiled to the consumption of a third part* is excluded.
- **canker vs cancer.** In Culpeper *canker(s)* is the OED sense 1 *spreading, eating sore* (*fretting and running cankers, gangrenes*), mapped to `skin_ulcers`; *cankers in the mouth* go to `mouth_gums`. *Cancers* (plural) and *cancerous* go to `cancer`. Every singular *cancer* in the corpus is the zodiac sign (*under the sign Cancer*) and is never matched.
- **hard swellings, wens -> cancer.** The concept label is *Cancers / hard tumours*. Culpeper's *hard swellings / hard tumours / hard knots* are the Galenic *scirrhus*, and *wens* are benign cysts; mapping them to `cancer` follows the concept definition but does not imply malignancy. Treat modern-evidence pairings for these rows with caution.
- **the mother.** OED *mother* n.1 III: the womb; *fits / rising / strangling / suffocation of the mother* is the hysterical passion attributed to the womb. Mapped to `uterine_disorders` (45 hits), with *the mother of action* excluded.
- **green sickness.** Chlorosis, the *disease of virgins*; early-modern doctrine (Lange 1554 onward) attributed it to retained menses, so its single hit is mapped to `amenorrhea`. There is no anaemia concept.
- **terms, courses, flowers.** *Terms* and *courses* = menses (OED). *Provoke / procure / bring down / move / send down* the courses -> `amenorrhea` (action). *Stay / stop / restrain* the courses, *immoderate / overflowing / abundance of* the courses, and *the reds* -> `menorrhagia`. *Flowers* is never used for menses in these sections. All 35 *stays ... courses* hits were read; none was an emmenagogue.
- **the whites, the reds, running of the reins.** *Whites* = leucorrhoea (OED); *reds* is Culpeper's counterpart for excessive menstrual flux. *Gonorrhoea, or running of the reins* (17 hits) in 1650s usage covers involuntary seminal flux as much as venereal discharge; there is no concept for it, and *reins* inside that phrase is excluded from `kidney_disease`.
- **stone vs stones; reins.** *The stone* = urinary calculus (124 hits, about 99% precise). Plural *stones* is excluded (fruit stones, testicles). *Reins* = kidneys (OED).
- **lask, flux, scouring.** *Lask* = looseness of the bowels (OED); *flux of the belly* = diarrhoea; *bloody flux* = dysentery. Bare *fluxes* is too broad for Culpeper's astringent lists and was dropped.
- **ague, quartan, tertian, quotidian.** *Ague* = intermittent fever -> `fever`. *Quartan* and *tertian* (including the spelling *tertain*) -> `malaria`, since these periodicities are characteristic of *P. malariae* and *P. vivax*. *Quotidian* (daily) is kept under `fever`, because daily fever is not specifically malarial.
- **rheum, defluxion, distillation, catarrh.** Humoral flow of thin matter from the brain. It is mapped to `common_cold` when it falls on the nose, lungs or stomach and to `conjunctivitis` when it falls into the eyes. *Rheumatic* means catarrhal here, not modern rheumatism.
- **stitch.** OED: a sudden sharp pain in the side. Culpeper ascribes it to *wind* or *the spleen*, so it is mapped to `pain`, not `pleurisy_pneumonia`.
- **gnawing of the heart; passions of the heart.** *Gnawing of the heart* = cardialgia, heartburn, i.e. the cardiac orifice of the stomach (`dyspepsia`). *Passions / trembling of the heart* and *swoonings* = palpitation and syncope (`heart`).
- **melancholy.** Disease sense only (*drives away melancholy*, *melancholy diseases*, *sadness*). The humoral *purges melancholy* (black bile), *melancholy humours* and *melancholy vapours* never match.
- **venom vs poison; antivenereal.** Early-modern *venom* = poison in general (`poisoning`); *venomous beasts*, *biting of serpents* and *stinging of scorpions* = `envenomation`; *mad dog* = `rabies`. Culpeper's *antivenereal / antivenerean* means a remedy for the French pox (`syphilis`), not an anaphrodisiac.
- **skin vocabulary.** *Tetter* = vesicular or scaly eruption (OED; eczema, herpes) -> `dermatitis`. *Morphew* = scurfy, discoloured skin, listed with freckles and sun-burning -> `skin_blemishes`. *Push* = pimple or pustule (OED). *Scald head* = tinea or favus. *Leprosy* = scaly, disfiguring skin disease in general (`scaly_skin`), not only Hansen's disease. *St Anthony's fire* = erysipelas. *Shingles* (herpes zoster, no concept) is mapped to `erysipelas` because early-modern authors classed zona with *ignis sacer*; this is flagged.
- **king's evil, kernels.** *King's evil* = scrofula. *Kernels* (OED: enlarged gland) count only in or by the throat, neck or ears.
- **lethargy, frenzy.** OED: *lethargy* = morbid drowsiness or coma; *frenzy / phrensy* = delirium, raving. Both go to `delirium` (*Frenzy / lethargy*).
- **gout, hip-gout.** *Gout* covered most painful joint swelling in the 17th c.; *hip-gout* = sciatica (OED).
- **Astrology.** Sign and planet names collide with disease words (*Cancer*, *Scorpio*, *the lust of Venus*). Look-behinds exclude the observed collisions; a few planetary narratives remain (e.g. *covetous man so splenetic*) and appear as FPs in the table.

## Notable historical terms with no concept_id (left unmapped)

| term (Culpeper) | hits | docs | modern sense |
|---|---:|---:|---|
| ruptures, burstings, bursten | 65 | 47 | hernia |
| gonorrhoea, running of the reins | 17 | 14 | seminal / urethral discharge |
| broken bones, fractures | 17 | 16 | fracture |
| small-pox, measles, purples | 9 | 7 | exanthematous fevers |
| chilblains, kibes | 8 | 4 | pernio |
| witchcraft | 7 | 6 | (magical aetiology) |
| ephialtes, incubus, night-mare | 5 | 3 | nightmare / sleep paralysis |
| cachexia (evil disposition of the body) | 4 | 4 | wasting / chronic ill-health |
| polypus (in the nostrils) | 4 | 4 | nasal polyp |
| corpulence (make lean those too fat) | 4 | 4 | obesity |
| rickets (rachites) | 3 | 2 | rickets |
| longings of women with child | 3 | 3 | pica |
| swelling of the testicles / stones | 2 | 2 | orchitis |

## Limitations

- Precision comes from small per-row samples (5-6 hits). The 95% interval for a 5/5 row is wide (about 0.48-1.0), so the corpus-level figure is the more reliable one.
- Concept assignments for *phthisic*, *hard swellings / wens* (-> cancer), *shingles* (-> erysipelas), *green-sickness* (-> amenorrhea), *hoarseness* (-> sore_throat) and *stinking breath* (-> mouth_gums) are judgement calls and are documented in the `note` column.
- The generic `pain` row counts anaphoric *eases the pains* as an analgesic claim, so it overlaps organ-specific concepts.
- Polarity follows the cue in the pattern. Clause-level negation or hedging (*but some do not hold it*) is not modelled.
