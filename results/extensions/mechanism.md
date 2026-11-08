# P10 · Mechanism paths and modern hazard for the 60 leads (hypothesis-generating)

*Generated 2026-11-08 · reproduce: `PYTHONPATH=src python scripts/mechanism.py`*

> Hypothesis-generating only. A constituent being active (pChEMBL >= 6) on a human protein in some assay, and that protein being associated with a disease in Open Targets, does not show that the plant, at any dose, treats the disease. Paths are screening aids for laboratory follow-up, not medical advice. GHS statements describe the pure substance, not the plant.

* 6,755 ChEMBL activities (pChEMBL ≥ 6, human) for the lead plants' constituents; 335 human single-protein targets mapped to Ensembl; 35 Open Targets diseases.
* **33 of 60 leads** have at least one constituent → target → disease path (OT score ≥ 0.1); 7 leads have no Open Targets disease (venomous bites, bruises).
* Background check: median share of a plant's active targets associated with the *lead's* disease 3.5% vs 3.2% for the other diseases; lead disease above the plant's own median in 22 of 51 leads. Paths therefore show plausibility, not specificity.
* 47 leads have a top constituent with a severe GHS statement; 27 of them also carry the herbals' own warning (⚠). The flag is dominated by ubiquitous flavonoids (e.g. quercetin carries H301 in PubChem's aggregated notifications); counting only constituents found in < 25% of the lead plants, 13 leads are flagged, 7 of them with ⚠ (29 leads carry ⚠ in total).

\* = ubiquitous constituent (in ≥ 25% of the lead plants).

| # | Lead | Path(s): constituent → target (pChEMBL; OT score) | Severe GHS | ⚠ |
|---|---|---|---|---|
| 1 | *Ruta graveolens* – Eye complaints / dim sight | isorhamnetin → CYP1B1 (8.52; 0.885); isorhamnetin → CA2 (6.36; 0.882) | isorhamnetin* (carcinogenic_mutagenic_reprotoxic), kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) | ⚠ |
| 2 | *Vicia faba* – Bleeding / staunching blood | quercetin → TP53 (6.0; 0.486); genistein → ESR1 (8.01; 0.454) | quercetin* (acute_toxicity) | ⚠ |
| 3 | *Ocimum basilicum* – Venomous bites & stings | – | quercetin* (acute_toxicity) |  |
| 4 | *Juglans regia* – Ulcers & sores | serotonin → HTR2C (10.05; 0.268); progesterone → AR (8.07; 0.13) | progesterone (carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity), serotonin (acute_toxicity/carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 5 | *Cannabis sativa* – Ear-ache / running ears | L-glutamic acid → GRM3 (7.24; 0.492); (Z)-anethol → TP53 (8.3; 0.478) | cannabidiol (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 6 | *Origanum vulgare* – Venomous bites & stings | – | quercetin* (acute_toxicity) |  |
| 7 | *Brassica oleracea* – Constipation / purging | myricetin → ACHE (7.92; 0.105) | quercetin* (acute_toxicity) | ⚠ |
| 8 | *Iris germanica* – Ulcers & sores | – | – | ⚠ |
| 9 | *Brassica oleracea* – Ulcers & sores | – | quercetin* (acute_toxicity) | ⚠ |
| 10 | *Juglans regia* – Hair loss | progesterone → AR (8.07; 0.514); Epicatechin gallate → BCL2 (6.64; 0.461) | progesterone (carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) | ⚠ |
| 11 | *Plantago major* – Kidney & bladder complaints | quercetin → MET (6.24; 0.9); quercetin → TP53 (6.0; 0.848) | quercetin* (acute_toxicity) |  |
| 12 | *Ficus carica* – Ear-ache / running ears | quercetin → MET (6.24; 0.611); epigallocatechin gallate → DNMT1 (6.3; 0.578) | quercetin* (acute_toxicity) | ⚠ |
| 13 | *Foeniculum vulgare* – Eye complaints / dim sight | isorhamnetin → CYP1B1 (8.52; 0.885); Astragalin → CA2 (6.78; 0.882) | isorhamnetin* (carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) |  |
| 14 | *Vicia faba* – Bruises / falls / sprains | – | quercetin* (acute_toxicity) | ⚠ |
| 15 | *Origanum majorana* – Bruises / falls / sprains | – | kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic) |  |
| 16 | *Iris germanica* – Colic / gripes | – | – | ⚠ |
| 17 | *Foeniculum vulgare* – Venomous bites & stings | – | quercetin* (acute_toxicity) |  |
| 18 | *Allium sativum* – Freckles / spots / sunburn | kaempferol → TYR (6.0; 0.109) | kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) | ⚠ |
| 19 | *Hordeum vulgare* – Diarrhoea / flux | – | fluoxetine (acute_toxicity) | ⚠ |
| 20 | *Malva sylvestris* – Womb complaints | eucalyptol → MAPK1 (7.5; 0.619); gossypol → BCL2 (6.77; 0.554) | gossypol (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 21 | *Prunus domestica* – Mouth sores / gums | quercetin → TP53 (6.0; 0.686); myricetin → PIK3CA (6.77; 0.609) | quercetin* (acute_toxicity) | ⚠ |
| 22 | *Mentha spicata* – Ear-ache / running ears | quercetin → MET (6.24; 0.611); carveol → TP53 (8.1; 0.478) | quercetin* (acute_toxicity) | ⚠ |
| 23 | *Allium cepa* – Frenzy / lethargy | rutin → ACHE (7.92; 0.377) | kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) | ⚠ |
| 24 | *Marrubium vulgare* – Eye complaints / dim sight | chryseriol → CYP1B1 (7.71; 0.885); (E)-p-coumaric acid → CA2 (6.01; 0.882) | (E)-p-coumaric acid* (acute_toxicity), trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 25 | *Hordeum vulgare* – Lepra / scaly skin | trans-caffeic acid → NFKB1 (6.85; 0.387); oleic acid → FLT3 (6.29; 0.208) | fluoxetine (acute_toxicity), trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 26 | *Verbena officinalis* – Ulcers & sores | – | – |  |
| 27 | *Artemisia absinthium* – Sore throat / quinsy | – | isorhamnetin* (carcinogenic_mutagenic_reprotoxic), trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 28 | *Prunus domestica* – Stone & gravel | (−)-epicatechin → ALPL (6.39; 0.535); quercetin → ABCG2 (7.52; 0.532) | quercetin* (acute_toxicity) | ⚠ |
| 29 | *Mentha spicata* – Venomous bites & stings | – | quercetin* (acute_toxicity) | ⚠ |
| 30 | *Portulaca oleracea* – Venery / sexual function | dopamine → DRD2 (9.17; 0.531); dopamine → DRD4 (8.92; 0.528) | dopamine (carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) |  |
| 31 | *Marrubium vulgare* – Cough | – | trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 32 | *Beta vulgaris* – Ear-ache / running ears | quercetin → MET (6.24; 0.611); kaempferol → TYR (6.0; 0.519) | kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) |  |
| 33 | *Hedera helix* – Burns | oleic acid → PPARA (6.22; 0.185); (R)-rosmarinic acid → ENPP1 (7.57; 0.1) | (R)-rosmarinic acid (acute_toxicity), kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity), trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 34 | *Mentha pulegium* – Mouth sores / gums | Pectolinarigenin → KIT (6.22; 0.453); hispidulin → FLT3 (6.64; 0.399) | – |  |
| 35 | *Marchantia polymorpha* – Tetters / eczema / scurf | luteolin → MMP12 (6.01; 0.494); arachidonic acid → ALOX15 (7.1; 0.37) | – |  |
| 36 | *Ficus carica* – Asthma / shortness of breath | quercetin → ALOX5 (6.1; 0.576); oleanolic acid → PTPRC (6.0; 0.544) | quercetin* (acute_toxicity) | ⚠ |
| 37 | *Papaver somniferum* – St Anthony's fire / erysipelas | – | dopamine (carcinogenic_mutagenic_reprotoxic) |  |
| 38 | *Tanacetum parthenium* – Stone & gravel | luteolin → DPP4 (6.92; 0.281); melatonin → BLM (8.8; 0.173) | ethinylestradiol (carcinogenic_mutagenic_reprotoxic/organ_toxicity) |  |
| 39 | *Hedera helix* – Provokes menses (emmenagogue) | quercetin → AXL (6.02; 0.139) | kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity), trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 40 | *Prunus avium* – Cough | vitamin C → PTGS1 (6.27; 0.6); adenosine → ADORA3 (8.94; 0.371) | quercetin* (acute_toxicity) |  |
| 41 | *Solanum nigrum* – St Anthony's fire / erysipelas | – | trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) |  |
| 42 | *Onopordum acanthium* – Cramps / convulsions | – | – |  |
| 43 | *Artemisia absinthium* – Bruises / falls / sprains | – | isorhamnetin* (carcinogenic_mutagenic_reprotoxic), trans-caffeic acid* (carcinogenic_mutagenic_reprotoxic) | ⚠ |
| 44 | *Lysimachia arvensis* – Wounds | – | – |  |
| 45 | *Melissa officinalis* – Toothache | – | quercetin* (acute_toxicity) |  |
| 46 | *Mentha pulegium* – Heart complaints / swooning | alpha-terpineol → LMNA (8.46; 0.918); luteolin → TTR (7.16; 0.814) | – |  |
| 47 | *Teucrium chamaedrys* – Cramps / convulsions | – | – |  |
| 48 | *Daucus carota* – Dropsy | retinol → MAPK1 (7.5; 0.763); Astragalin → CA2 (6.78; 0.601) | quercetin* (acute_toxicity), retinol (carcinogenic_mutagenic_reprotoxic) |  |
| 49 | *Verbena officinalis* – Womb complaints | oleanolic acid → F3 (8.3; 0.618); apigenin → CYP19A1 (6.05; 0.554) | – |  |
| 50 | *Origanum vulgare* – Itch / scabies | ethinylestradiol → NR3C1 (6.92; 0.508); ethinylestradiol → SLC6A2 (6.02; 0.37) | ethinylestradiol (carcinogenic_mutagenic_reprotoxic/organ_toxicity), quercetin* (acute_toxicity) |  |
| 51 | *Rubia tinctorum* – Spleen complaints | anthragallol → BCL2 (6.23; 0.354) | – |  |
| 52 | *Ruta graveolens* – Itch / scabies | – | kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic), quercetin* (acute_toxicity) | ⚠ |
| 53 | *Beta vulgaris* – St Anthony's fire / erysipelas | – | quercetin* (acute_toxicity) |  |
| 54 | *Papaver somniferum* – Gout | vitamin C → PTGS1 (6.27; 0.611); dopamine → DRD5 (8.7; 0.445) | dopamine (carcinogenic_mutagenic_reprotoxic) |  |
| 55 | *Anethum graveolens* – Nausea & vomiting | – | quercetin* (acute_toxicity) |  |
| 56 | *Ruscus aculeatus* – Urine stoppage / diuretic | – | – |  |
| 57 | *Plantago major* – Consumption / phthisis | gallic acid → GALNT2 (6.03; 0.185); luteoloside → TNF (6.1; 0.14) | quercetin* (acute_toxicity) |  |
| 58 | *Lysimachia vulgaris* – Bleeding / staunching blood | – | – |  |
| 59 | *Portulaca oleracea* – St Anthony's fire / erysipelas | – | quercetin* (acute_toxicity) |  |
| 60 | *Lilium candidum* – Poisons / antidote | – | isorhamnetin* (carcinogenic_mutagenic_reprotoxic), kaempferol* (acute_toxicity/carcinogenic_mutagenic_reprotoxic) | ⚠ |
