# Audit — `terms_grc.csv` (Greek indication lexicon for Dioscorides)

Built 2026-11-07 against `data/interim/monographs.jsonl` (source = dioscorides: 822 chapters, 614,588 characters of `analysis_text`, Wellmann ed., First1KGreek TEI). Patterns are Python regexes applied with `re.finditer` to `textnorm.normalize_greek(analysis_text)` (lower case, no accents/breathings/iota subscripts, ς→σ, length-preserving, so spans map back to the accented text).

## Summary

* **311 patterns**, all compiling; CSV written with the `csv` module and verified by a round-trip read.
* **81/85 concepts covered** (95 %). No Greek pattern: `anxiety`, `tinea`, `syphilis`, `scurvy`.
* Polarity: 252 therapeutic, 39 action, 20 adverse.
* 728/822 chapters (89 %) receive at least one match.
* Spot-check: 1397/1409 sampled hits judged correct for the **concept**; every retained pattern ≥ 80 % on its own sample (drops and fixes listed below). This is an optimistic, unblinded estimate — the same person wrote and checked the patterns, samples are small, and multi-label overlap is not penalised; the blind reference set in `data/annotations/` (not consulted here) is the proper precision/recall measure. Polarity slips inside a pattern are listed in the table remarks.

## Method

1. Token and stem frequencies over the normalised corpus (12k distinct tokens) were scanned for medical vocabulary; candidate stems were checked form-by-form (e.g. all attested forms of ικτερ-, υδρωπ-, εμμην-).
2. Every pattern starts with the guard `(?<![α-ω])`; inflectional tails are left open only where the stem is unambiguous (`ικτερ`), otherwise endings are enumerated and closed with `(?![α-ω])` (e.g. `νομ(?:ασ|ων|αισ)` to avoid νομή 'pasture').
3. Collocational patterns use a clause-internal gap `[^\w.;·]+` (never crossing `.`, `;` or the ano teleia `·`) with at most 1–4 intervening words, in both word orders (ἔμμηνα ἄγει / ἄγει … ἔμμηνα). Negative look-arounds remove known traps (dead-foetus contexts from the abortifacient rows, passive ἐπεχόμενα from 'checks the menses', ἐπ' ἀνθράκων 'on coals').
4. For each pattern all hits were counted and random hits (5–12, or all when fewer) were read in context (±25–60 chars). Patterns under 80 % were tightened or dropped (list below). `example` is the most frequent accented surface form actually matched in the text.
5. Polarity: `therapeutic` = the substance treats the condition; `adverse` = it causes or worsens it (κακοστόμαχος, κεφαλαλγής, δυσόνειρος, μέθης ποιητικός); `action` = a pharmacological action implying the concept (emmenagogue → amenorrhea, οὐρητικός → diuresis, laxative → constipation, emetic → nausea_vomiting, abortive → abortifacient, ἀτόκιον → contraception, galactagogue → lactation, repellent → envenomation/lice).

## Per-pattern table

Row = data row in `terms_grc.csv` (1-based, header excluded). Spot = correct/inspected for the concept.

| row | concept_id | polarity | gloss | example (attested) | first in | hits | chapters | spot | remark |
|---:|---|---|---|---|---|---:|---:|---|---|
| 1 | dyspepsia | therapeutic | for those with stomach complaints (στομαχικοί) | στομαχικοῖς | dsc:1.109 | 21 | 21 | 5/5 |  |
| 2 | dyspepsia | therapeutic | good for the stomach (εὐστόμαχος) | εὐστόμαχος | dsc:1.28 | 66 | 50 | 5/5 |  |
| 3 | dyspepsia | adverse | bad for the stomach (κακοστόμαχος) | κακοστόμαχος | dsc:1.71 | 46 | 39 | 5/5 |  |
| 4 | dyspepsia | adverse | upsets / harms the stomach | ἀναλυτικὸν στομάχου | dsc:2.70 | 4 | 4 | 4/4 |  |
| 5 | dyspepsia | therapeutic | pain / gnawing / heat / atony of the stomach | δηγμοὺς στομάχου | dsc:2.131 | 10 | 10 | 5/5 |  |
| 6 | dyspepsia | therapeutic | stomach painful / burning / fluxing / relaxed | στομάχῳ καυσουμένῳ | dsc:2.131 | 22 | 22 | 5/5 |  |
| 7 | dyspepsia | therapeutic | benefits / braces the stomach | ὠφελεῖ δὲ στόμαχον | dsc:4.119 | 3 | 3 | 3/3 |  |
| 8 | dyspepsia | therapeutic | indigestion; those who digest badly | βραδυπεψίας | dsc:5.38 | 11 | 11 | 4/5 | 1 adverse (undigested mushrooms) |
| 9 | dyspepsia | adverse | hard to digest (δύσπεπτος) | δύσπεπτος | dsc:2.107 | 6 | 5 | 5/5 |  |
| 10 | dyspepsia | therapeutic | heartburn (καρδιωγμός) | καρδιωγμοῖς | dsc:1.7 | 1 | 1 | 1/1 |  |
| 11 | diarrhea | therapeutic | binds / checks the bowels | κοιλίαν ἵστησι | dsc:1.20 | 44 | 38 | 5/5 |  |
| 12 | diarrhea | therapeutic | checks ... the bowels | ἵστησι κοιλίαν | dsc:1.113 | 25 | 25 | 5/5 |  |
| 13 | diarrhea | therapeutic | flowing / fluxing bowel | κοιλίας ῥύσιν | dsc:1.115 | 13 | 11 | 5/5 |  |
| 14 | diarrhea | therapeutic | fluxes of the bowel | ῥεῦμα κοιλίας | dsc:2.148 | 5 | 5 | 5/5 |  |
| 15 | diarrhea | therapeutic | coeliac affection (κοιλιακοί) | κοιλιακοῖς | dsc:1.73 | 41 | 38 | 5/5 |  |
| 16 | diarrhea | therapeutic | diarrhoea (διάρροια, διαρροιζόμενοι) | διάρροιαν | dsc:1.93 | 10 | 10 | 5/5 | 1 adverse (causes diarrhoea) |
| 17 | diarrhea | therapeutic | cholera (χολέρα) | χολέραν | dsc:3.34 | 6 | 6 | 5/5 | 1 adverse |
| 18 | diarrhea | adverse | disturbs the bowels | ταράσσει κοιλίαν | dsc:4.167 | 2 | 2 | 2/2 |  |
| 19 | diarrhea | adverse | disturbing the bowels | κοιλίας ταρακτικόν | dsc:2.120 | 7 | 7 | 5/5 |  |
| 20 | dysentery | therapeutic | dysentery (δυσεντερία) | δυσεντερικοῖς | dsc:1.22 | 74 | 66 | 5/5 |  |
| 21 | dysentery | therapeutic | tenesmus (τεινεσμός) | τεινεσμῶν | dsc:1.47 | 4 | 4 | 4/4 |  |
| 22 | constipation | action | loosens / moves the bowels (laxative) | κοιλίαν λύει | dsc:1.126 | 57 | 49 | 5/5 |  |
| 23 | constipation | action | loosens ... the bowels | μαλάσσει κοιλίαν | dsc:2.114 | 21 | 20 | 12/12 |  |
| 24 | constipation | action | loosening the bowels (εὔκοιλιος) | εὐκοίλιος | dsc:1.127 | 28 | 26 | 5/5 |  |
| 25 | constipation | action | purges downwards (κατὰ κοιλίαν) | κατὰ κοιλίαν | dsc:1.32 | 18 | 17 | 12/12 |  |
| 26 | constipation | action | purges downwards (κάτω καθαίρει) | κάτω καθαίρει | dsc:4.175 | 12 | 11 | 5/5 |  |
| 27 | constipation | therapeutic | costive (σκληροκοίλιος) | σκληροκοιλίοις | dsc:5.19 | 1 | 1 | 1/1 |  |
| 28 | flatulence | therapeutic | flatulence (ἐμπνευμάτωσις) | ἐμπνευματώσεις | dsc:1.16 | 35 | 35 | 5/5 |  |
| 29 | flatulence | therapeutic | those troubled by wind | πνευματουμένοις | dsc:2.141 | 6 | 6 | 5/5 |  |
| 30 | flatulence | adverse | wind-producing (πνευματωτικός) | πνευματωτικός | dsc:2.87 | 7 | 6 | 5/5 |  |
| 31 | flatulence | adverse | flatulent (πνευματώδης) | πνευματώδεις | dsc:5.6 | 1 | 1 | 1/1 |  |
| 32 | flatulence | adverse | flatulent (φυσώδης) | φυσώδης | dsc:2.86 | 12 | 9 | 5/5 |  |
| 33 | flatulence | adverse | generates wind | πνευμάτων γεννητική | dsc:2.112 | 3 | 3 | 3/3 |  |
| 34 | flatulence | therapeutic | disperses wind | ἐκκριτικὴν φυσῶν | dsc:2.152 | 5 | 5 | 5/5 |  |
| 35 | flatulence | action | provokes belching (ἐρυγή) | ἐρυγὰς | dsc:5.60 | 1 | 1 | 1/1 |  |
| 36 | colic | therapeutic | gripes (στρόφοι) | στρόφους | dsc:1.1 | 54 | 51 | 5/5 |  |
| 37 | colic | therapeutic | ileus (εἰλεός) | εἰλεώδεσι | dsc:1.104 | 5 | 5 | 5/5 |  |
| 38 | colic | therapeutic | colic (κωλικοί) | κωλικῶν | dsc:4.176 | 1 | 1 | 1/1 |  |
| 39 | nausea_vomiting | therapeutic | stops vomiting | ἵστησι δὲ καὶ ἐμέτους | dsc:3.41 | 3 | 3 | 3/3 |  |
| 40 | nausea_vomiting | therapeutic | vomiting ... checks | ἐμέτους ἵστησιν | dsc:3.58 | 3 | 3 | 3/3 |  |
| 41 | nausea_vomiting | action | provokes vomiting (emetic) | ἐμέτους κινεῖ | dsc:1.78 | 18 | 18 | 5/5 |  |
| 42 | nausea_vomiting | action | emetic (ἐμετικός, ἐμετήριον) | ἐμετικόν | dsc:2.112 | 9 | 8 | 5/5 |  |
| 43 | nausea_vomiting | therapeutic | nausea (ναυτία) | ναυτία | dsc:3.30 | 4 | 4 | 4/4 | 1 adverse (ναυτιῶδες) |
| 44 | nausea_vomiting | adverse | causing nausea (ναυτίας ποιητικόν) | ναυτίας ποιητικόν | dsc:1.52 | 3 | 3 | 3/3 |  |
| 45 | nausea_vomiting | action | purges upwards (emetic) | καθαίρει ἄνω | dsc:4.149 | 8 | 8 | 5/5 |  |
| 46 | helminthiasis | therapeutic | intestinal worms (ἕλμινθες) | ἕλμινθας | dsc:1.32 | 32 | 31 | 5/5 |  |
| 47 | helminthiasis | therapeutic | ascarides (threadworms) | ἀσκαρίδας | dsc:1.77 | 3 | 3 | 3/3 |  |
| 48 | hemorrhoids | therapeutic | haemorrhoids (αἱμορροΐδες) | αἱμορροίδας | dsc:1.56 | 12 | 12 | 5/5 |  |
| 49 | hemorrhoids | therapeutic | anal condylomata (κονδυλώματα) | κονδυλώματα | dsc:1.39 | 16 | 16 | 5/5 |  |
| 50 | hemorrhoids | therapeutic | (complaints) about the anus (δακτύλιος) | ἐν δακτυλίῳ | dsc:1.47 | 18 | 18 | 5/5 |  |
| 51 | appetite_loss | therapeutic | appetite (ὄρεξις) | ὄρεξιν | dsc:1.113 | 8 | 8 | 5/5 | 1 adverse (spoils appetite) |
| 52 | appetite_loss | therapeutic | loss of appetite (ἀνορεξία, ἀνόρεκτοι) | ἀνορεξίαν | dsc:2.109 | 7 | 7 | 5/5 |  |
| 53 | hiccup | therapeutic | hiccup (λυγμός) | λυγμούς | dsc:2.24 | 10 | 10 | 5/5 |  |
| 54 | jaundice | therapeutic | jaundice (ἴκτερος, ἰκτερικοί) | ἴκτερον | dsc:1.100 | 56 | 55 | 5/5 |  |
| 55 | liver_disease | therapeutic | liver patients / the liver (ἡπατικοί) | ἡπατικοῖς | dsc:1.7 | 36 | 35 | 5/5 |  |
| 56 | spleen_disease | therapeutic | the spleen / spleen patients (σπληνικοί) | σπλῆνα | dsc:1.8 | 81 | 72 | 5/5 |  |
| 57 | cough | therapeutic | cough (βήξ, βήσσοντες) | βῆχας | dsc:1.1 | 68 | 67 | 5/5 | 1 adverse (provokes cough) |
| 58 | cough | action | brings up (phlegm) from the chest (expectorant) | ἐκ θώρακος ἀνάγει | dsc:2.155 | 9 | 8 | 5/5 |  |
| 59 | asthma_dyspnea | therapeutic | asthma (ἆσθμα, ἀσθματικοί) | ἀσθματικοῖς | dsc:1.24 | 26 | 25 | 5/5 |  |
| 60 | asthma_dyspnea | therapeutic | orthopnoea (ὀρθόπνοια) | ὀρθόπνοιαν | dsc:1.64 | 27 | 27 | 5/5 |  |
| 61 | asthma_dyspnea | therapeutic | dyspnoea (δύσπνοια) | δύσπνοιαν | dsc:3.45 | 10 | 10 | 5/5 |  |
| 62 | pleurisy_pneumonia | therapeutic | pleurisy (πλευρῖτις, πλευριτικοί) | πλευριτικοῖς | dsc:1.19 | 10 | 10 | 5/5 |  |
| 63 | pleurisy_pneumonia | therapeutic | peripneumonia (περιπνευμονία) | περιπνευμονικοῖς | dsc:3.25 | 7 | 7 | 5/5 |  |
| 64 | pleurisy_pneumonia | therapeutic | pain in the side | πλευρᾶς πόνον | dsc:1.64 | 25 | 25 | 5/5 |  |
| 65 | pleurisy_pneumonia | therapeutic | empyema patients (ἐμπυϊκοί) | ἐμπυικοῖς | dsc:4.106 | 8 | 8 | 5/5 |  |
| 66 | sore_throat | therapeutic | quinsy (συνάγχη, συναγχικοί) | συναγχικοῖς | dsc:2.35 | 23 | 21 | 5/5 |  |
| 67 | sore_throat | therapeutic | tonsils / tonsillitis (παρίσθμια) | παρίσθμια | dsc:1.100 | 22 | 22 | 5/5 |  |
| 68 | sore_throat | therapeutic | hoarseness (βράγχος) | βράγχους | dsc:1.66 | 1 | 1 | 1/1 |  |
| 69 | sore_throat | therapeutic | (relaxed) uvula (κιονίς) | κιονίδα | dsc:1.121 | 8 | 8 | 5/5 |  |
| 70 | sore_throat | therapeutic | roughness of the windpipe (hoarseness) | ἀρτηρίαν τραχύτητας | dsc:2.86 | 15 | 14 | 5/5 |  |
| 71 | sore_throat | therapeutic | loss of voice (φωνῆς ἀποκοπή) | ἀποκοπὴν φωνῆς | dsc:1.66 | 3 | 3 | 3/3 |  |
| 72 | tuberculosis | therapeutic | consumptives (φθισικοί) | φθισικοῖς | dsc:2.76 | 14 | 13 | 5/5 |  |
| 73 | tuberculosis | therapeutic | wasting (φθινώδεις) | φθινώδεσιν | dsc:5.35 | 1 | 1 | 1/1 |  |
| 74 | tuberculosis | therapeutic | ulceration of the lung | πνεύμονι ἕλκη | dsc:1.77 | 1 | 1 | 1/1 |  |
| 75 | common_cold | therapeutic | coryza (κόρυζα) | κορύζας | dsc:1.66 | 2 | 2 | 2/2 |  |
| 76 | common_cold | therapeutic | ozaena (fetid nasal discharge) | ὀζαίνας | dsc:1.20 | 3 | 3 | 3/3 |  |
| 77 | common_cold | therapeutic | catarrh (κατάρρους) | κατάρρους | dsc:1.14 | 14 | 14 | 5/5 |  |
| 78 | diuresis | action | diuretic (οὐρητικός, διουρητικός) | οὐρητικόν | dsc:1.58 | 97 | 83 | 5/5 |  |
| 79 | diuresis | action | moves the urine | οὖρα κινεῖ | dsc:1.2 | 54 | 54 | 5/5 |  |
| 80 | diuresis | action | urination (οὔρησις, ἐξουρεῖν) | οὔρησιν | dsc:1.52 | 12 | 12 | 4/5 | 1 false (lyngurium 'petrifies when urinated') |
| 81 | urolithiasis | therapeutic | breaks up stones (λίθους θρύπτει) | λίθους θρύπτει | dsc:1.6 | 20 | 20 | 5/5 |  |
| 82 | urolithiasis | therapeutic | stone patients, lithiasis (λιθιῶντες, λιθίασις) | λιθιῶντας | dsc:1.33 | 11 | 11 | 5/5 |  |
| 83 | urolithiasis | therapeutic | those cut for the stone (λιθοτομηθέντες) | λιθοτομηθέντων | dsc:5.15 | 1 | 1 | 1/1 |  |
| 84 | urolithiasis | therapeutic | lithontriptic (θρυπτικός) | θρυπτικήν | dsc:1.17 | 2 | 2 | 2/2 |  |
| 85 | dysuria | therapeutic | dysuria (δυσουρία, δυσουροῦντες) | δυσουροῦσι | dsc:1.6 | 48 | 47 | 5/5 |  |
| 86 | dysuria | therapeutic | strangury (στραγγουρία) | στραγγουρίας | dsc:3.41 | 23 | 23 | 5/5 |  |
| 87 | kidney_disease | therapeutic | kidneys / nephritics (νεφριτικοί) | νεφριτικοῖς | dsc:1.6 | 59 | 57 | 5/5 |  |
| 88 | kidney_disease | therapeutic | bladder (κύστις) | κύστιν | dsc:1.3 | 70 | 61 | 5/5 |  |
| 89 | kidney_disease | adverse | harmful to bladder / kidneys | κύστει ἄθετος | dsc:5.6 | 7 | 6 | 5/5 |  |
| 90 | sexual_function | action | venery (ἀφροδίσια) | ἀφροδίσια | dsc:1.16 | 13 | 11 | 5/5 |  |
| 91 | sexual_function | action | sexual intercourse (συνουσία) | συνουσίαν | dsc:2.124 | 16 | 14 | 4/5 | 1 = contraceptive context |
| 92 | sexual_function | action | semen (γονή) | γονήν | dsc:1.103 | 4 | 4 | 4/4 |  |
| 93 | sexual_function | therapeutic | nocturnal emissions (ὀνειρωγμός) | ὀνειρωγμούς | dsc:3.132 | 2 | 2 | 2/2 |  |
| 94 | amenorrhea | action | brings on the menses (emmenagogue) | ἔμμηνα ἄγει | dsc:1.13 | 81 | 79 | 5/5 |  |
| 95 | amenorrhea | action | brings on ... the menses | ἄγει δὲ καὶ ἔμμηνα | dsc:1.14 | 53 | 52 | 5/5 |  |
| 96 | amenorrhea | therapeutic | suppressed menses (ἐμμήνων ἐπίσχεσις) | ἔμμηνα ἐπεχόμενα | dsc:5.39 | 2 | 2 | 2/2 |  |
| 97 | amenorrhea | action | drawing blood (αἱμαγωγός), i.e. emmenagogue | αἱμαγωγός | dsc:3.122 | 1 | 1 | 1/1 |  |
| 98 | menorrhagia | therapeutic | checks the menses | ἔμμηνα ἐφ ίστησι | dsc:1.125 | 2 | 2 | 2/2 |  |
| 99 | menorrhagia | therapeutic | the female (red) flux (ῥοῦς γυναικεῖος) | ῥοῦν γυναικεῖον | dsc:1.68 | 28 | 28 | 5/5 |  |
| 100 | menorrhagia | therapeutic | fluxes / haemorrhage from the womb | ἐκ μήτρας ῥύσεις | dsc:1.7 | 6 | 5 | 5/5 |  |
| 101 | leukorrhea | therapeutic | the white flux (λευκὸς ῥοῦς) | λευκὸν ῥοῦν | dsc:1.108 | 2 | 2 | 2/2 |  |
| 102 | labor | action | brings away the afterbirth (δεύτερα) | δεύτερα ἐπισπᾶται | dsc:1.48 | 16 | 16 | 5/5 |  |
| 103 | labor | therapeutic | cleansing after childbirth (ἐκ τοκετοῦ καθαίρει) | ἐκ τοκετῶν καθαίρει | dsc:2.165 | 5 | 5 | 5/5 |  |
| 104 | lactation | therapeutic | puerperal / engorged breasts (μαστοὶ σπαργῶντες) | μαστούς χονδριῶντας | dsc:2.85 | 11 | 11 | 11/11 |  |
| 105 | labor | therapeutic | hastening birth (ὠκυτόκιος) | ὠκυτόκιος | dsc:4.14 | 4 | 4 | 4/4 |  |
| 106 | labor | therapeutic | difficult labour (δυστοκία) | δυστοκούσαις | dsc:3.105 | 5 | 5 | 5/5 |  |
| 107 | labor | therapeutic | lochia (λοχεῖα) | λοχεῖα | dsc:3.4 | 5 | 5 | 5/5 |  |
| 108 | labor | action | expels the dead foetus | τεθνηκότα ἔμβρυα | dsc:3.32 | 4 | 4 | 4/4 |  |
| 109 | abortifacient | action | expels / destroys the embryo | ἔμβρυα φθείρει | dsc:2.156 | 40 | 38 | 5/5 |  |
| 110 | abortifacient | action | expels ... the embryo | ἄγει καὶ ἔμβρυα | dsc:1.76 | 36 | 35 | 5/5 |  |
| 111 | abortifacient | action | abortive (φθόριος; τὰ φθόρια) | φθόριος | dsc:5.67 | 4 | 3 | 4/4 |  |
| 112 | abortifacient | action | causes miscarriage (ἐκτιτρώσκει) | ἐκτιτρώσκει | dsc:3.131 | 3 | 3 | 3/3 |  |
| 113 | abortifacient | action | miscarriages (ἐκτρωσμοί) | ἐκτρωσμούς | dsc:1.93 | 2 | 2 | 2/2 |  |
| 114 | lactation | action | draws down / produces / dries up milk | γάλα κατασπᾷ | dsc:1.91 | 18 | 18 | 5/5 |  |
| 115 | lactation | action | producing milk | κατασπᾷ δὲ καὶ γάλα | dsc:1.103 | 3 | 3 | 3/3 |  |
| 116 | uterine_disorders | therapeutic | hysterical suffocation (πνὶξ ὑστερική) | ὑστερικὰς | dsc:1.33 | 29 | 29 | 5/5 |  |
| 117 | uterine_disorders | therapeutic | the womb (ὑστέρα, μήτρα) | ὑστέρας | dsc:1.68 | 104 | 94 | 5/5 |  |
| 118 | uterine_disorders | therapeutic | in the womb | ἐν ὑστέρᾳ | dsc:1.50 | 11 | 11 | 5/5 |  |
| 119 | infertility | therapeutic | conception (σύλληψις) | συλλήψει | dsc:2.75 | 4 | 4 | 4/4 |  |
| 120 | contraception | action | contraceptive (ἀτόκιον) | ἀτόκιον | dsc:2.19 | 12 | 10 | 5/5 |  |
| 121 | contraception | action | prevents conception (ἀσυλληψία) | ἀσυλλημψίαν | dsc:1.104 | 8 | 8 | 5/5 |  |
| 122 | contraception | action | making sterile (ἄγονος, ἀγονία) | ἀγόνους | dsc:4.14 | 3 | 3 | 3/3 |  |
| 123 | headache | therapeutic | headache (κεφαλαλγία, κεφαλαλγοῦντες) | κεφαλαλγίας | dsc:1.1 | 39 | 37 | 12/12 |  |
| 124 | headache | adverse | causing headache (κεφαλαλγής) | κεφαλαλγεῖς | dsc:1.106 | 18 | 17 | 12/12 |  |
| 125 | headache | therapeutic | pain / heaviness of the head | κεφαλῆς ἀλγήματα | dsc:2.99 | 5 | 5 | 5/5 |  |
| 126 | headache | adverse | causing heaviness of the head (καρηβαρικός) | καρηβαρικός | dsc:2.108 | 5 | 5 | 5/5 |  |
| 127 | epilepsy | therapeutic | epileptics (ἐπιλη(μ)πτικοί) | ἐπιλημπτικοῖς | dsc:1.19 | 47 | 44 | 5/5 |  |
| 128 | insomnia | action | soporific (ὑπνωτικός, ὑπνοποιός) | ὑπνοποιόν | dsc:1.15 | 17 | 14 | 5/5 |  |
| 129 | insomnia | action | stupefying (καρωτικός) | καρωτικόν | dsc:1.58 | 7 | 6 | 5/5 | often an adverse effect |
| 130 | insomnia | action | induces sleep (ὕπνον ποιεῖ) | ὕπνον ποιεῖ | dsc:4.64 | 2 | 2 | 2/2 |  |
| 131 | insomnia | therapeutic | sleeplessness (ἀγρυπνία) | ἀγρυπνούντων | dsc:4.64 | 3 | 2 | 3/3 |  |
| 132 | insomnia | adverse | causing troubled dreams (δυσόνειρος) | δυσόνειρος | dsc:2.105 | 6 | 6 | 5/5 |  |
| 133 | melancholy | therapeutic | melancholics (μελαγχολικοί) | μελαγχολικούς | dsc:3.138 | 5 | 5 | 5/5 |  |
| 134 | paralysis | therapeutic | paralytics (παραλυτικοί) | παραλυτικοῖς | dsc:1.16 | 12 | 12 | 4/5 | 1 plant synonym |
| 135 | paralysis | therapeutic | tremors (τρόμοι) | τρόμους | dsc:1.61 | 6 | 6 | 5/5 |  |
| 136 | stroke | therapeutic | apoplectics (ἀπόπληκτοι) | ἀποπλήκτους | dsc:4.136 | 1 | 1 | 1/1 |  |
| 137 | vertigo | therapeutic | dizziness (σκοτωματικοί) | σκοτωματικοῖς | dsc:1.19 | 9 | 8 | 5/5 |  |
| 138 | vertigo | therapeutic | giddiness (σκοτοδινιῶντες) | σκοτοδινιῶντας | dsc:5.17 | 1 | 1 | 1/1 |  |
| 139 | memory | therapeutic | the dull-witted (ἀπηλιθιωμένοι) | ἀπηλιθιωμένους | dsc:5.17 | 1 | 1 | 1/1 |  |
| 140 | delirium | therapeutic | lethargy (λήθαργος) | ληθαργικῶν | dsc:1.103 | 10 | 10 | 5/5 |  |
| 141 | delirium | therapeutic | phrenitis (φρενῖτις) | φρενιτικῶν | dsc:1.54 | 5 | 5 | 5/5 |  |
| 142 | delirium | therapeutic | the mad (μαινόμενοι) | μαινομένους | dsc:4.1 | 2 | 2 | 2/2 |  |
| 143 | delirium | adverse | maddening (μανιώδης) | μανιώδης | dsc:1.68 | 2 | 2 | 2/2 |  |
| 144 | delirium | adverse | ecstasis (ἔκστασις) | ἔκστασιν | dsc:4.72 | 1 | 1 | 1/1 |  |
| 145 | delirium | adverse | hallucinations (φαντασίαι) | φαντασίας | dsc:4.73 | 1 | 1 | 1/1 |  |
| 146 | delirium | adverse | disturbs the mind (ταράσσει τὴν διάνοιαν) | κινεῖ τὴν διάνοιαν | dsc:3.63 | 2 | 2 | 2/2 |  |
| 147 | convulsions | therapeutic | convulsions (σπασμοί) | σπασμοῖς | dsc:2.24 | 3 | 3 | 3/3 |  |
| 148 | convulsions | therapeutic | spasms, strains (σπάσματα) | σπάσματα | dsc:1.2 | 43 | 43 | 5/5 | sense uncertain: spasm vs muscle strain |
| 149 | convulsions | therapeutic | opisthotonus (ὀπισθότονος) | ὀπισθοτονικοῖς | dsc:3.80 | 8 | 8 | 5/5 |  |
| 150 | convulsions | therapeutic | those convulsed (σπώμενοι) | σπωμένοις | dsc:1.1 | 8 | 8 | 5/5 |  |
| 151 | gout | therapeutic | gout (ποδάγρα) | ποδαγρικοῖς | dsc:1.15 | 48 | 47 | 5/5 |  |
| 152 | sciatica | therapeutic | sciatica (ἰσχιάς) | ἰσχιαδικοῖς | dsc:1.19 | 62 | 57 | 5/5 |  |
| 153 | sciatica | therapeutic | hip pains (ἰσχία) | ἰσχίων | dsc:1.73 | 7 | 7 | 5/5 |  |
| 154 | sciatica | therapeutic | loin pain (ὀσφύος ἄλγημα) | ὀσφύος | dsc:4.27 | 4 | 4 | 4/4 |  |
| 155 | joint_pain | therapeutic | arthritis (ἀρθρῖτις) | ἀρθριτικοῖς | dsc:1.73 | 10 | 10 | 5/5 |  |
| 156 | joint_pain | therapeutic | pains / swellings of the joints | ἄρθρων ἀλγήματα | dsc:3.1 | 12 | 11 | 5/5 |  |
| 157 | bruises | therapeutic | black eyes, bruises under the eye (ὑπώπια) | ὑπώπια | dsc:2.71 | 20 | 20 | 5/5 |  |
| 158 | bruises | therapeutic | livid bruises (πελιώματα) | πελιώματα | dsc:1.108 | 9 | 9 | 5/5 |  |
| 159 | bruises | therapeutic | weals (μώλωπες) | μώλωπάς | dsc:1.52 | 1 | 1 | 1/1 |  |
| 160 | bruises | therapeutic | contusions (θλάσματα) | θλάσματα | dsc:1.108 | 13 | 11 | 5/5 |  |
| 161 | bruises | therapeutic | ruptures, strains (ῥήγματα) | ῥήγματα | dsc:1.2 | 42 | 42 | 5/5 |  |
| 162 | bruises | therapeutic | sprains (στρέμματα) | στρέμματα | dsc:1.85 | 20 | 20 | 5/5 |  |
| 163 | bruises | therapeutic | fractures (κατάγματα) | κατάγματα | dsc:1.84 | 4 | 4 | 4/4 |  |
| 164 | bruises | therapeutic | falls (πτώματα) | πτώματα | dsc:1.128 | 7 | 7 | 4/5 | 1 = name of a myrobalan |
| 165 | pain | therapeutic | anodyne (ἀνώδυνος) | ἀνωδύνοις | dsc:1.97 | 24 | 19 | 5/5 |  |
| 166 | pain | therapeutic | violent pain (περιωδυνία) | περιωδυνίας | dsc:2.50 | 4 | 4 | 4/4 |  |
| 167 | pain | therapeutic | pain (ὀδύνη) | ὀδύνας | dsc:1.107 | 14 | 13 | 5/5 |  |
| 168 | pain | therapeutic | pain (ἀλγηδών) | ἀλγηδόνας | dsc:1.33 | 4 | 4 | 4/4 |  |
| 169 | pain | therapeutic | insensibility for surgery (ἀναισθησία) | ἀναισθησίαν | dsc:4.75 | 2 | 2 | 2/2 |  |
| 170 | wounds | therapeutic | wounds (τραύματα) | τραύματα | dsc:1.19 | 67 | 64 | 5/5 |  |
| 171 | wounds | therapeutic | fresh bloody wounds (ἔναιμα) | ἐναίμων | dsc:1.110 | 9 | 9 | 5/5 |  |
| 172 | wounds | therapeutic | fresh wounds (νεότρωτα) | νεότρωτα | dsc:4.9 | 6 | 6 | 5/5 |  |
| 173 | wounds | therapeutic | agglutinant, closing wounds (κολλητικός) | κολλητικὴν | dsc:1.127 | 13 | 13 | 4/5 | 1 = gum 'glue' |
| 174 | wounds | action | cicatrising (ἀπουλοῖ) | ἀπουλοῖ | dsc:1.69 | 37 | 34 | 5/5 |  |
| 175 | skin_ulcers | therapeutic | ulcers (ἕλκη, ἑλκώσεις) | ἕλκη | dsc:1.1 | 163 | 127 | 5/5 |  |
| 176 | skin_ulcers | adverse | ulcerating (ἑλκωτικός) | ἑλκωτικήν | dsc:2.62 | 12 | 9 | 5/5 |  |
| 177 | skin_ulcers | therapeutic | spreading ulcers (νομαί) | νομὰς | dsc:1.20 | 41 | 37 | 5/5 |  |
| 178 | skin_ulcers | therapeutic | phagedaenic ulcers | φαγεδαινικὰ | dsc:2.78 | 15 | 15 | 5/5 |  |
| 179 | skin_ulcers | therapeutic | gangrene (γάγγραινα) | γαγγραίνας | dsc:1.61 | 14 | 14 | 5/5 |  |
| 180 | skin_ulcers | therapeutic | putrefying sores (σηπεδόνες) | σηπεδόνας | dsc:1.56 | 17 | 17 | 5/5 |  |
| 181 | skin_ulcers | therapeutic | proud flesh (ὑπερσαρκώματα) | ὑπερσαρκοῦντα | dsc:2.1 | 14 | 14 | 5/5 |  |
| 182 | skin_ulcers | therapeutic | hollow ulcers (κοιλώματα) | κοιλώματα | dsc:1.68 | 9 | 8 | 5/5 |  |
| 183 | skin_ulcers | therapeutic | fistulae (σύριγγες) | σύριγγας | dsc:1.58 | 18 | 17 | 5/5 |  |
| 184 | burns | therapeutic | burns (πυρίκαυτα) | πυρίκαυτα | dsc:1.39 | 35 | 33 | 5/5 |  |
| 185 | burns | therapeutic | burns (κατακαύματα) | κατακαύματα | dsc:1.47 | 14 | 13 | 5/5 |  |
| 186 | itch_scabies | therapeutic | itching (κνησμός) | κνησμοὺς | dsc:1.100 | 23 | 23 | 5/5 |  |
| 187 | itch_scabies | therapeutic | itch, scabies (ψώρα) | ψώρας | dsc:1.6 | 36 | 34 | 5/5 |  |
| 188 | dermatitis | therapeutic | lichen, tetter (λειχήν) | λειχῆνας | dsc:1.68 | 35 | 33 | 5/5 |  |
| 189 | dermatitis | therapeutic | herpes, spreading eruption (ἕρπης) | ἕρπητας | dsc:1.45 | 29 | 28 | 5/5 |  |
| 190 | dermatitis | therapeutic | eruptions (ἐξανθήματα) | ἐξανθήματα | dsc:1.39 | 19 | 18 | 5/5 |  |
| 191 | dermatitis | therapeutic | pustular eruptions (ἐκζέματα) | ἐκζέματα | dsc:1.52 | 3 | 3 | 3/3 |  |
| 192 | dermatitis | therapeutic | chafing (παρατρίμματα) | παρατρίμματα | dsc:1.69 | 6 | 6 | 5/5 |  |
| 193 | dermatitis | therapeutic | blisters (φλύκταιναι) | φλυκταινοῦσθαι | dsc:1.68 | 12 | 11 | 5/5 |  |
| 194 | dermatitis | therapeutic | scurf of the scalp (ἀχῶρες) | ἀχῶρας | dsc:1.30 | 24 | 24 | 5/5 |  |
| 195 | dermatitis | therapeutic | dandruff (πιτυρίασις) | πιτυριάσεσι | dsc:5.106 | 1 | 1 | 1/1 |  |
| 196 | dermatitis | therapeutic | dandruff (πίτυρα, with ἀχῶρες) | πίτυρα καὶ ἀχῶρας | dsc:1.30 | 16 | 16 | 5/5 |  |
| 197 | scaly_skin | therapeutic | lepra (scaly skin) | λέπρας | dsc:1.30 | 61 | 55 | 5/5 |  |
| 198 | scaly_skin | therapeutic | alphos (white scaly patches) | ἀλφούς | dsc:1.128 | 31 | 31 | 5/5 |  |
| 199 | scaly_skin | therapeutic | elephantiasis (ἐλεφαντίασις) | ἐλεφαντιῶντας | dsc:1.77 | 7 | 7 | 5/5 |  |
| 200 | alopecia | therapeutic | alopecia (ἀλωπεκία) | ἀλωπεκίας | dsc:1.72 | 31 | 26 | 5/5 |  |
| 201 | alopecia | therapeutic | falling hair; hair growth | τρίχας ῥεούσας | dsc:1.30 | 11 | 11 | 5/5 |  |
| 202 | warts | therapeutic | warts (μυρμηκίαι) | μυρμηκίας | dsc:1.68 | 12 | 11 | 5/5 |  |
| 203 | warts | therapeutic | pedunculated warts (ἀκροχορδόνες) | ἀκροχορδόνας | dsc:2.64 | 14 | 12 | 5/5 |  |
| 204 | warts | therapeutic | warty growths (θύμοι) | θύμους | dsc:1.128 | 6 | 6 | 5/5 |  |
| 205 | warts | therapeutic | calluses (τύλοι) | τύλους | dsc:1.104 | 9 | 8 | 4/5 | 1 descriptive (horse lichens) |
| 206 | warts | therapeutic | corns (ἧλοι) | ἥλους | dsc:1.104 | 7 | 7 | 5/5 |  |
| 207 | skin_blemishes | therapeutic | freckles (ἐφηλίδες) | ἔφηλιν | dsc:1.16 | 28 | 27 | 5/5 |  |
| 208 | skin_blemishes | therapeutic | spots (σπίλοι) | σπίλους | dsc:1.33 | 10 | 10 | 10/10 |  |
| 209 | skin_blemishes | therapeutic | pimples (ἴονθοι) | ἰόνθους | dsc:1.52 | 12 | 12 | 5/5 |  |
| 210 | skin_blemishes | therapeutic | lentigines (φακοί) | φακούς | dsc:1.1 | 18 | 18 | 5/5 |  |
| 211 | skin_blemishes | therapeutic | recolours scars (cosmetic) | οὐλὰς μελαίνας | dsc:2.170 | 7 | 7 | 5/5 |  |
| 212 | skin_blemishes | therapeutic | cleanses / brightens the face | πρόσωπον σμήχει | dsc:1.37 | 6 | 6 | 5/5 |  |
| 213 | abscess | therapeutic | tumours, inflamed swellings (φύματα) | φύματα | dsc:1.30 | 34 | 32 | 5/5 |  |
| 214 | abscess | therapeutic | abscesses (ἀποστήματα) | ἀποστήματα | dsc:2.134 | 12 | 12 | 5/5 |  |
| 215 | abscess | therapeutic | parotid swellings (παρωτίδες) | παρωτίδας | dsc:1.128 | 14 | 14 | 5/5 |  |
| 216 | abscess | therapeutic | boils (δοθιῆνες) | δοθιῆνας | dsc:1.128 | 11 | 9 | 5/5 |  |
| 217 | abscess | therapeutic | inflamed glands (φύγεθλα) | φύγεθλα | dsc:1.105 | 11 | 11 | 5/5 |  |
| 218 | abscess | therapeutic | whitlows (παρωνυχίαι) | παρωνυχίας | dsc:1.68 | 9 | 7 | 5/5 |  |
| 219 | abscess | therapeutic | buboes, inguinal swellings (βουβῶνες) | βουβώνων | dsc:1.55 | 7 | 5 | 4/5 | 1 plant synonym |
| 220 | abscess | therapeutic | night-pustules (ἐπινυκτίδες) | ἐπινυκτίδας | dsc:1.123 | 13 | 13 | 5/5 |  |
| 221 | abscess | therapeutic | honeycomb boils (κηρία) | κηρία | dsc:1.128 | 7 | 7 | 5/5 |  |
| 222 | abscess | therapeutic | carbuncles (ἄνθρακες) | ἄνθρακας | dsc:1.61 | 20 | 19 | 12/12 |  |
| 223 | abscess | action | maturative, brings to suppuration (πυοποιός) | πυοποιόν | dsc:1.72 | 5 | 5 | 5/5 |  |
| 224 | erysipelas | therapeutic | erysipelas | ἐρυσιπέλατα | dsc:1.68 | 49 | 46 | 5/5 |  |
| 225 | inflammation | therapeutic | inflammations (φλεγμοναί) | φλεγμονὰς | dsc:1.7 | 164 | 130 | 5/5 |  |
| 226 | inflammation | therapeutic | preventing inflammation (ἀφλέγμαντος) | ἀφλέγμαντα | dsc:1.69 | 16 | 16 | 5/5 |  |
| 227 | inflammation | therapeutic | swellings (οἰδήματα) | οἰδήματα | dsc:1.58 | 54 | 52 | 5/5 |  |
| 228 | eye_disease | therapeutic | the eyes; eye-salves (ὀφθαλμικά) | ὀφθαλμῶν | dsc:1.15 | 148 | 118 | 5/5 |  |
| 229 | eye_disease | therapeutic | dim sight (ἀμβλυωπία) | ἀμβλυωπίας | dsc:1.24 | 27 | 27 | 5/5 |  |
| 230 | eye_disease | therapeutic | mist on the eye (ἀχλύς) | ἀχλῦς | dsc:2.78 | 8 | 8 | 5/5 |  |
| 231 | eye_disease | therapeutic | leucoma (λεύκωμα) | λευκώματα | dsc:1.64 | 13 | 13 | 5/5 |  |
| 232 | eye_disease | therapeutic | corneal cloud (νεφέλιον) | νεφέλια | dsc:2.106 | 6 | 6 | 5/5 |  |
| 233 | eye_disease | therapeutic | cataract (ὑπόχυσις) | ὑποχύσεις | dsc:2.12 | 8 | 8 | 5/5 |  |
| 234 | eye_disease | therapeutic | night-blindness (νυκτάλωψ) | νυκτάλωπας | dsc:2.78 | 2 | 2 | 2/2 |  |
| 235 | eye_disease | therapeutic | trachoma (τράχωμα) | τραχώματα | dsc:1.64 | 2 | 2 | 2/2 |  |
| 236 | eye_disease | therapeutic | staphyloma (σταφύλωμα) | σταφυλώματα | dsc:1.105 | 5 | 5 | 5/5 |  |
| 237 | eye_disease | therapeutic | sharp-sighted (ὀξυδερκής) | ὀξυδερκίαν | dsc:1.13 | 17 | 17 | 5/5 |  |
| 238 | eye_disease | therapeutic | things darkening the pupils (τὰ ἐπισκοτοῦντα ταῖς κόραις) | ἐπισκοτοῦντα | dsc:1.2 | 24 | 23 | 5/5 |  |
| 239 | eye_disease | therapeutic | lachrymal fistula (αἰγιλώπια) | αἰγιλώπια | dsc:1.112 | 7 | 7 | 5/5 |  |
| 240 | eye_disease | therapeutic | argema, corneal ulcer (ἄργεμα) | ἄργεμα | dsc:2.81 | 9 | 9 | 5/5 |  |
| 241 | eye_disease | therapeutic | eyelids (βλέφαρα) | βλέφαρα | dsc:1.43 | 27 | 26 | 5/5 |  |
| 242 | conjunctivitis | therapeutic | ophthalmia (ὀφθαλμία) | ὀφθαλμίας | dsc:2.126 | 4 | 4 | 4/4 |  |
| 243 | conjunctivitis | therapeutic | inflammation of the eyes | ὀφθαλμῶν φλεγμονὰς | dsc:1.15 | 29 | 29 | 5/5 |  |
| 244 | conjunctivitis | therapeutic | fluxes of the eyes | ὀφθαλμοῖς ῥεύματα | dsc:2.59 | 12 | 12 | 5/5 |  |
| 245 | ear_disease | therapeutic | earache (ὠταλγία) | ὠταλγίας | dsc:1.97 | 40 | 37 | 5/5 |  |
| 246 | ear_disease | therapeutic | hardness of hearing (δυσηκοΐα) | δυσηκοίαν | dsc:2.151 | 7 | 7 | 5/5 |  |
| 247 | ear_disease | therapeutic | whistling in the ears (συριγμοί) | συριγμούς | dsc:1.77 | 6 | 6 | 6/6 |  |
| 248 | ear_disease | therapeutic | ringing in the ears (ἦχοι) | ἤχους | dsc:1.33 | 13 | 13 | 11/12 | 1 = loss of voice |
| 249 | ear_disease | therapeutic | the ears (ὦτα) | ὦτα | dsc:1.64 | 48 | 43 | 12/12 |  |
| 250 | toothache | therapeutic | toothache (ὀδονταλγία) | ὀδονταλγίας | dsc:1.24 | 40 | 38 | 5/5 |  |
| 251 | toothache | therapeutic | teething (ὀδοντίασις) | ὀδοντιάσεις | dsc:2.19 | 2 | 2 | 2/2 |  |
| 252 | toothache | therapeutic | pain of the teeth; loose / hollow teeth | ὀδόντος πόνον | dsc:2.173 | 21 | 20 | 5/5 |  |
| 253 | mouth_gums | therapeutic | aphthae (mouth ulcers) | ἄφθας | dsc:1.20 | 12 | 12 | 5/5 |  |
| 254 | mouth_gums | therapeutic | the gums (οὖλα) | οὖλα | dsc:1.64 | 23 | 21 | 5/5 |  |
| 255 | mouth_gums | therapeutic | ulcers / sores / bad odour of the mouth; mouth-remedies | στόματι ἕλκη | dsc:1.68 | 22 | 21 | 5/5 |  |
| 256 | nosebleed | therapeutic | bleeding from the nostrils | μυκτήρων αἱμορραγίας | dsc:2.9 | 8 | 8 | 9/10 | 1 errhine (draws blood) |
| 257 | edema_dropsy | therapeutic | dropsy (ὕδρωψ, ὑδρωπικοί) | ὑδρωπικοῖς | dsc:1.10 | 53 | 51 | 5/5 |  |
| 258 | edema_dropsy | therapeutic | leucophlegmatia (anasarca) | λευκοφλεγματίας | dsc:2.126 | 1 | 1 | 1/1 |  |
| 259 | heart | therapeutic | the cardiac affection (καρδιακοί) | καρδιακῶν | dsc:1.112 | 3 | 3 | 3/3 |  |
| 260 | heart | therapeutic | fainting (λειποθυμία) | λειποθυμιῶν | dsc:2.135 | 2 | 2 | 2/2 |  |
| 261 | heart | therapeutic | (restores) the pulse (σφυγμοί) | σφυγμῶν | dsc:5.6 | 2 | 1 | 2/2 |  |
| 262 | hemorrhage | therapeutic | haemorrhage (αἱμορραγία) | αἱμορραγίας | dsc:1.70 | 40 | 38 | 5/5 |  |
| 263 | hemorrhage | therapeutic | staunches blood | ἵστησι καὶ αἵματος | dsc:1.20 | 14 | 14 | 5/5 |  |
| 264 | hemorrhage | therapeutic | styptic (ἴσχαιμος) | ἴσχαιμος | dsc:3.33 | 7 | 7 | 5/5 |  |
| 265 | hemorrhage | therapeutic | bleeding (gums) (αἱμασσόμενα) | αἱμασσόμενα | dsc:2.126 | 2 | 2 | 2/2 |  |
| 266 | hemorrhage | therapeutic | bleeding (αἱμορροοῦντα) | αἱμορροοῦντα | dsc:5.13 | 1 | 1 | 1/1 |  |
| 267 | hemoptysis | therapeutic | spitting of blood (αἱμοπτυϊκοί) | αἱμοπτυικοῖς | dsc:1.68 | 25 | 23 | 5/5 |  |
| 268 | hemoptysis | therapeutic | bringing up / spitting of blood | αἵματος ἀναγωγὰς | dsc:1.17 | 32 | 31 | 5/5 |  |
| 269 | fever | therapeutic | fevers (πυρετοί) | πυρετοῖς | dsc:1.30 | 9 | 9 | 9/9 |  |
| 270 | fever | therapeutic | rigors (ῥίγη) | ῥίγη | dsc:1.51 | 24 | 24 | 5/5 |  |
| 271 | fever | therapeutic | ague with shivering (ἠπίαλος) | ἠπιάλοις | dsc:3.53 | 2 | 2 | 2/2 |  |
| 272 | fever | therapeutic | shivering fits (φρικία) | φρικία | dsc:1.127 | 4 | 4 | 4/4 |  |
| 273 | malaria | therapeutic | quartan fever (τεταρταῖος) | τεταρταίῳ | dsc:2.126 | 9 | 9 | 5/5 |  |
| 274 | malaria | therapeutic | tertian fever (τριταῖος) | τριταίῳ | dsc:2.126 | 6 | 6 | 5/5 |  |
| 275 | malaria | therapeutic | quotidian fever (ἀμφημερινός) | ἀμφημερινῶν | dsc:4.42 | 1 | 1 | 1/1 |  |
| 276 | malaria | therapeutic | periodic fevers (περίοδοι) | περιόδους | dsc:2.63 | 18 | 17 | 12/12 |  |
| 277 | plague | therapeutic | pestilence (λοιμικαὶ διαθέσεις) | λοιμικαῖς | dsc:4.115 | 2 | 2 | 2/2 |  |
| 278 | envenomation | therapeutic | bitten by wild beasts (θηριόδηκτοι) | θηριοδήκτοις | dsc:1.1 | 46 | 42 | 5/5 |  |
| 279 | envenomation | therapeutic | snake-bitten (ἑρπετόδηκτοι) | ἑρπετοδήκτοις | dsc:1.79 | 18 | 18 | 5/5 |  |
| 280 | envenomation | therapeutic | viper-bitten (ἐχιόδηκτοι) | ἐχεοδήκτοις | dsc:1.16 | 18 | 18 | 5/5 |  |
| 281 | envenomation | therapeutic | asp-bitten (ἀσπιδόδηκτοι) | ἀσπιδοδήκτους | dsc:2.34 | 2 | 2 | 2/2 |  |
| 282 | envenomation | therapeutic | crocodile-bitten | κροκοδειλοδήκτοις | dsc:5.109 | 1 | 1 | 1/1 |  |
| 283 | envenomation | therapeutic | spider-bitten (φαλαγγιόδηκτοι) | φαλαγγιοδήκτοις | dsc:1.61 | 18 | 18 | 5/5 |  |
| 284 | envenomation | therapeutic | scorpion-stung (σκορπιόπληκτοι) | σκορπιοπλήκτοις | dsc:1.4 | 28 | 27 | 5/5 |  |
| 285 | envenomation | therapeutic | bites of beasts (θηριοδήγματα) | θηριοδήγματα | dsc:2.79 | 1 | 1 | 1/1 |  |
| 286 | envenomation | therapeutic | dog-bitten (κυνόδηκτοι) | κυνόδηκτα | dsc:1.123 | 25 | 24 | 5/5 |  |
| 287 | envenomation | therapeutic | venomous creatures (ἰοβόλα) | ἰοβόλων | dsc:1.8 | 18 | 18 | 5/5 |  |
| 288 | envenomation | therapeutic | theriac (θηριακὴ ἀντίδοτος) | θηριακὰς | dsc:2.78 | 10 | 9 | 5/5 | indirect (ingredient of theriacs) |
| 289 | envenomation | therapeutic | bites of beasts, snakes, vipers, shrews | ἑρπετῶν δήγματα | dsc:1.72 | 39 | 39 | 5/5 |  |
| 290 | envenomation | therapeutic | stings / bites of scorpions, spiders, sting-rays, wasps, bees | σκορπίου πληγήν | dsc:2.114 | 17 | 14 | 5/5 |  |
| 291 | envenomation | action | drives away snakes / beasts (repellent) | ἑρπετὰ διώκει | dsc:2.59 | 14 | 14 | 5/5 |  |
| 292 | poisoning | therapeutic | deadly poisons (τὰ θανάσιμα) | θανάσιμα | dsc:1.30 | 41 | 38 | 5/5 |  |
| 293 | poisoning | therapeutic | antidote (ἀντιφάρμακον) | ἀντιφάρμακον | dsc:2.61 | 10 | 10 | 5/5 |  |
| 294 | poisoning | therapeutic | protective against poisons (ἀλεξιφάρμακον) | ἀλεξιφάρμακα | dsc:4.132 | 3 | 3 | 3/3 |  |
| 295 | poisoning | therapeutic | noxious drugs (δηλητήρια) | δηλητήρια | dsc:5.97 | 2 | 2 | 2/2 |  |
| 296 | poisoning | therapeutic | counteracts (a poison) (ἀντιπάσχει) | ἀντιπάσχει | dsc:3.64 | 3 | 3 | 3/3 |  |
| 297 | poisoning | therapeutic | those who have drunk (a poison) (πεπωκότες) | πεπωκόσι | dsc:1.19 | 13 | 13 | 5/5 |  |
| 298 | poisoning | therapeutic | against mushrooms, ixias, arrow-poison, hemlock, aconite, etc. | ὑπὸ μυκήτων | dsc:1.116 | 26 | 20 | 5/5 |  |
| 299 | rabies | therapeutic | mad-dog bite, rabies (λυσσόδηκτοι, λύσσα) | λυσσῶντος | dsc:1.100 | 9 | 9 | 5/5 |  |
| 300 | rabies | therapeutic | hydrophobia | ὑδροφόβᾳ | dsc:2.47 | 1 | 1 | 1/1 |  |
| 301 | intoxication | therapeutic | hangover (κραιπάλη; ἀκραίπαλος 'preventing it') | ἀκραίπαλός | dsc:1.26 | 4 | 4 | 4/4 |  |
| 302 | intoxication | adverse | drunkenness (μέθη) | μέθης | dsc:5.6 | 9 | 3 | 5/5 |  |
| 303 | cancer | therapeutic | cancers, carcinomatous ulcers (καρκινώματα) | καρκινώδη | dsc:2.61 | 8 | 8 | 5/5 |  |
| 304 | cancer | therapeutic | scirrhous indurations (σκιρρώματα) | σκιρρώματα | dsc:1.1 | 3 | 3 | 3/3 |  |
| 305 | cancer | therapeutic | malignant ulcers (θηριώματα) | θηριωμάτων | dsc:2.109 | 1 | 1 | 1/1 |  |
| 306 | scrofula | therapeutic | scrofulous glands (χοιράδες) | χοιράδας | dsc:1.1 | 33 | 29 | 4/5 | 1 plant synonym |
| 307 | scrofula | therapeutic | goitre (βρογχοκήλη) | βρογχοκηλῶν | dsc:1.67 | 1 | 1 | 1/1 |  |
| 308 | lice | therapeutic | lice (φθεῖρες, φθειρίασις) | φθεῖρας | dsc:2.16 | 8 | 8 | 5/5 |  |
| 309 | lice | therapeutic | nits (κονίδες) | κονίδας | dsc:1.87 | 7 | 7 | 5/5 |  |
| 310 | lice | action | gnats (repelled) | κώνωπας | dsc:1.74 | 5 | 5 | 4/5 | 1 'gnat-like creatures' |
| 311 | lice | action | fleas (killed) | ψύλλους | dsc:3.121 | 2 | 2 | 2/2 |  |

## Known ambiguities (and how they were handled)

* **ῥεῦμα / ῥευματισμός** ('flux') is the most slippery term: it can mean diarrhoea (κοιλίας ῥεύματα), eye-discharge (ῥεύματα ὀφθαλμῶν), catarrh (θώρακος ῥευματισμοί), uterine flux or joint 'rheum'. It is never used alone — only in collocation with κοιλία (→ diarrhea), ὀφθαλμοί (→ conjunctivitis) or ἄρθρα (→ joint_pain). ῥοῦς γυναικεῖος (unqualified 'female flux', grouped by Dioscorides with haemorrhages) is mapped to menorrhagia; λευκὸς ῥοῦς to leukorrhea.
* **λίθος** is also the headword of most of book 5 (minerals) and appears in descriptions ('stony places'); only λίθους … θρύπτει, λιθιῶντες, λιθίασις, λιθοτομηθέντες are used for urolithiasis.
* **ἕλκος / ἑλκ-** collides with ἕλκω 'draw' (ἑλκύσαι, ἕλκει). Forms are enumerated (ἕλκη, ἑλκῶν, ἑλκώσεις, ἡλκωμένα); ἑλκῶν/ἕλκων remains a rare homograph (1 false hit seen in ~40). ἑλκωτικός (caustic) is a separate adverse row.
* **σπάσμα** (LSJ: convulsion, but also sprain/rupture of fibres) almost always appears beside ῥήγματα; it is kept under convulsions with a note, separately from σπασμοί, so downstream analysis can drop it. ῥήγματα go to bruises (nearest concept).
* **πυρέσσουσι** is mostly the vehicle formula *ἀπυρέτοις μὲν μετ' οἴνου, πυρέσσουσι δὲ μεθ' ὕδατος* (dose instruction, not indication), so the participle was dropped; πυρετ- is kept with exclusions for διχὰ πυρετοῦ, ἐν τε πυρετοῖς (contra-indication) and following vehicle words.
* **πεπτικός** in δύναμις-lists is usually 'maturative' (ripening swellings), not 'digestive'; dropped.
* **ἄνθρακες** are both carbuncles and coals (ἐπ' ἀνθράκων); firing contexts are excluded by look-arounds.
* **δεύτερα** 'afterbirth' vs 'second': requires a verb of expulsion. **ὕστερα** 'womb' vs 'later': only ὑστέρας/ὑστέραν/ἐν ὑστέρᾳ forms. **φθείρει** 'destroys' vs **φθεῖρες** 'lice': verb excluded. **οὖλα** 'gums' vs **οὐλαί** 'scars' (identical after normalisation): οὖλα/οὔλοις → mouth_gums, οὐλάς with μελαίνει/λευκαίνει → skin_blemishes, eye-scars are caught by the ὀφθαλμ- row. **θύμος** 'wart' vs 'thyme': only acc. pl. θύμους. **ἧλοι** 'corns' vs 'nails': only ἥλους.
* **κηρία** are mapped to abscess (Celsus' *favus*, a honeycomb-like multi-headed boil), not to tinea; **ἀχῶρες** (scurf of the scalp, possibly tinea capitis) to dermatitis. Hence no Greek pattern for `tinea`.
* **κυνόδηκτοι** (dog-bitten) are mapped to envenomation because MeSH *Bites and Stings* includes dog bites; λυσσόδηκτοι (mad-dog) go to rabies. **θηριακ-** (ingredient of theriacs) is an indirect indication.
* **κονδυλώματα / περὶ δακτύλιον** (anal swellings, fissures, inflammations) are mapped to hemorrhoids as the nearest proctological concept. **ὀσφύος ἄλγημα** (lumbago) to sciatica, **τρόμοι** to paralysis, **ταράσσει τὴν διάνοιαν** to delirium (adverse) — all 'nearest concept' choices flagged in `note`.
* **Synonym lists** (οἱ δὲ … καλοῦσι) occasionally contain disease-like plant names (κύναγχον, χοιραδόλεθρον, παράλυσις, βουβώνιον); κύναγχον was the only hit of its pattern, which was therefore dropped.
* **OCR/TEI noise**: αφθαλμ- for ὀφθαλμ- (included), ἀρθόπνοια for ὀρθόπνοια (included), θηρισδδηκτ- (included), ναυσία for ναυτία (included).
* **Overlap is intended**: rows are not mutually exclusive (αἱμορραγίαι ἐκ μυκτήρων → hemorrhage + nosebleed; φλεγμοναὶ ὀφθαλμῶν → inflammation + conjunctivitis + eye_disease; ὀδύναι ὤτων → pain + ear_disease). Deduplicate per (chapter, concept) downstream.

## Dropped or tightened after the spot-check

* dropped: πεπτικ- (dyspepsia, ~50 %: 'maturative'), χολὴν/φλέγμα ἄγει (constipation, 2/3: διαμασηθεὶς φλέγμα ἄγει is a masticatory), κολλύρια (eye_disease, 3/5: also suppository shape/method), μελάσματα (3/3 are hair-dye, not skin), ἡλιοκαυστ- (sun-baked potsherd), κυναγχ- (only a plant synonym), σατύριον and ἐντάσεις (plant name; hypochondrial 'tensions'), τέτανος (τετανόν 'smooth', of a stone), κόρεις (bug as drug), ἕδρα (anal route for suppositories), πυρέσσουσι (vehicle formula), ἐλκ-…ἐντέρ- and οὔρων ἐπίσχεσις (no hits), ἴλιγγος, γλαύκωμα (no hits).
* tightened: ψώρα (ψωρώδης 'scabby', of drugs), κνησ- → κνησμ- (plant κνῆστρον), πιτυρ- (bran), σπίλοι (descriptive 'spotted' leaves/stones), ἄνθρακες (coals), ὦτα (μυὸς ὦτα), ψύλλοι (ψύλλοις ἐοικός), νεφρ- (ὅμοια νεφροῖς 'kidney-shaped'), αἱμάσσοντα (dye), παραλυ- (to παραλυτικοί/παράλυσις), κεφαλαλγ- (split therapeutic vs adjectival κεφαλαλγής = adverse), τοκετ- (post-partum cleansing → labor; breast complaints after childbirth → lactation), ναυτία (split adverse ναυτίας ποιητικόν), constipation reverse order (ἐμέτους κινεῖ κοιλίαν τε ἐπέχει), menorrhagia (comma-bounded, passive excluded).

## Important indications in the Greek with no concept_id

| indication | hits | chapters | note |
|---|---:|---:|---|
| σκληρίαι / σκληρώματα (indurations, 'hardnesses') | 43 | 40 | only σκίρρος/καρκίνωμα are sent to cancer; plain induration is not cancer |
| ἀντίδοτοι (ingredient of antidotes) | 34 | 31 | usage, not an indication; poisoning only if read generously |
| ὄρχεις / δίδυμοι (testicular swellings) | 29 | 24 | inflammatory cases caught by inflammation |
| ἱδρῶτες (sudorific / anti-sudorific) | 26 | 23 | no concept for sweating |
| σκόλοπες (drawing out splinters, thorns) | 26 | 25 | could be wounds; left out |
| κόποι / ἄκοπα (fatigue, anti-fatigue rubs) | 25 | 23 | no concept |
| χίμετλα (chilblains) | 24 | 21 | cold injury, not burns |
| πτερύγια (pterygium of eye or nail) | 20 | 18 | split eye/nail sense; eye cases partly caught by ὀφθαλμ- |
| καχεξία / ἀτροφία (wasting) | 20 | 20 | dietetic; no concept |
| δίψα / ἄδιψον (thirst) | 13 | 10 | no concept |
| ἐντεροκήλη / ὑδροκήλη (hernia, hydrocele) | 12 | 12 | no concept |
| ὀστᾶ ἐψιλωμένα (exposed / exfoliating bone) | 12 | 11 | no concept |
| ῥαγάδες (fissures, feet and anus) | 11 | 11 | anal ones caught by hemorrhoids row |
| τὰ περὶ νεῦρα πάθη (affections of the sinews) | 10 | 10 | between paralysis and joint_pain; left out |

Concepts with no Greek pattern: `anxiety`, `tinea`, `syphilis`, `scurvy` — syphilis and scurvy are anachronistic for Dioscorides; no word for fear/anxiety as an indication was found (the only 'disturbed mind' phrases are drug effects, mapped to delirium); tinea see above.
