# P4 · Uncertainty-weighted leads

*Generated 2026-11-08 · reproduce: `PYTHONPATH=src python scripts/uncertainty_leads.py`*

Identification confidence is propagated into the lead score: weights high 1.0, medium 0.6, low 0.3, genus-only cap 0.5; per herbal the best-identified supporting plant chapter counts; lead certainty = min(Dioscorides, Culpeper); weighted score = score × certainty; same diversification (≤ 2 per plant, ≤ 4 per indication, top 60).

* Certainty of the 517 candidates: {'1.0': 312, '0.6': 185, '0.3': 20}; of the published top 60: {'1.0': 43, '0.6': 17}.
* Kendall τ-b, full ranking of 517 candidates: **0.56** (p = 5e-82); published top 60 (their positions in the full ranking): **0.61** (p = 6e-12).
* 41 of 60 leads stay in the top 60 (strict product weighting: 41; τ-b 0.49).

## Leaving the top 60

| Published rank | Lead | Certainty |
|---|---|---|
| 1 | *Ruta graveolens* – Eye complaints / dim sight | 0.6 |
| 6 | *Origanum vulgare* – Venomous bites & stings | 0.6 |
| 8 | *Iris germanica* – Ulcers & sores | 0.6 |
| 16 | *Iris germanica* – Colic / gripes | 0.6 |
| 20 | *Malva sylvestris* – Womb complaints | 0.6 |
| 22 | *Mentha spicata* – Ear-ache / running ears | 0.6 |
| 26 | *Verbena officinalis* – Ulcers & sores | 0.6 |
| 29 | *Mentha spicata* – Venomous bites & stings | 0.6 |
| 35 | *Marchantia polymorpha* – Tetters / eczema / scurf | 0.6 |
| 38 | *Tanacetum parthenium* – Stone & gravel | 0.6 |
| 39 | *Hedera helix* – Provokes menses (emmenagogue) | 1.0 |
| 40 | *Prunus avium* – Cough | 0.6 |
| 42 | *Onopordum acanthium* – Cramps / convulsions | 0.6 |
| 47 | *Teucrium chamaedrys* – Cramps / convulsions | 0.6 |
| 49 | *Verbena officinalis* – Womb complaints | 0.6 |
| 50 | *Origanum vulgare* – Itch / scabies | 0.6 |
| 52 | *Ruta graveolens* – Itch / scabies | 0.6 |
| 57 | *Plantago major* – Consumption / phthisis | 1.0 |
| 58 | *Lysimachia vulgaris* – Bleeding / staunching blood | 0.6 |

Leads with certainty 1.0 that leave the list do so only through the diversification caps (≤ 2 per plant, ≤ 4 per indication), displaced by fully certain leads moving up.

## Entering the top 60

| Weighted rank | Lead | Score | Certainty |
|---|---|---|---|
| 20 | *Plantago major* – Ulcers & sores | 0.595 | 1.0 |
| 23 | *Sambucus nigra* – Venomous bites & stings | 0.590 | 1.0 |
| 28 | *Hedera helix* – Ulcers & sores | 0.582 | 1.0 |
| 37 | *Solanum nigrum* – Ear-ache / running ears | 0.560 | 1.0 |
| 46 | *Laurus nobilis* – Womb complaints | 0.536 | 1.0 |
| 47 | *Melissa officinalis* – Dysentery / bloody flux | 0.534 | 1.0 |
| 48 | *Centaurium erythraea* – Eye complaints / dim sight | 0.531 | 1.0 |
| 49 | *Morus nigra* – Constipation / purging | 0.528 | 1.0 |
| 50 | *Populus alba* – Eye complaints / dim sight | 0.528 | 1.0 |
| 51 | *Mercurialis annua* – Constipation / purging | 0.528 | 1.0 |
| 52 | *Pyrus communis* – Diarrhoea / flux | 0.525 | 1.0 |
| 53 | *Cicer arietinum* – Constipation / purging | 0.519 | 1.0 |
| 54 | *Allium cepa* – Loss of appetite | 0.519 | 1.0 |
| 55 | *Lysimachia arvensis* – Kidney & bladder complaints | 0.513 | 1.0 |
| 56 | *Morus nigra* – Toothache | 0.509 | 1.0 |
| 57 | *Origanum majorana* – Provokes menses (emmenagogue) | 0.506 | 1.0 |
| 58 | *Juniperus sabina* – Boils / imposthumes / felons | 0.503 | 1.0 |
| 59 | *Ruscus aculeatus* – Headache / megrim | 0.503 | 1.0 |
| 60 | *Betonica officinalis* – Venomous bites & stings | 0.501 | 1.0 |

## Published top 10 under weighting

| Published | Lead | Certainty (D / C) | Weighted rank |
|---|---|---|---|
| 1 | *Ruta graveolens* – Eye complaints / dim sight | 0.6 (medium / high) | out |
| 2 | *Vicia faba* – Bleeding / staunching blood | 1.0 (high / high) | 1 |
| 3 | *Ocimum basilicum* – Venomous bites & stings | 1.0 (high / high) | 2 |
| 4 | *Juglans regia* – Ulcers & sores | 1.0 (high / high) | 3 |
| 5 | *Cannabis sativa* – Ear-ache / running ears | 1.0 (high / high) | 4 |
| 6 | *Origanum vulgare* – Venomous bites & stings | 0.6 (medium / high) | out |
| 7 | *Brassica oleracea* – Constipation / purging | 1.0 (high / high) | 5 |
| 8 | *Iris germanica* – Ulcers & sores | 0.6 (medium / medium) | out |
| 9 | *Brassica oleracea* – Ulcers & sores | 1.0 (high / high) | 6 |
| 10 | *Juglans regia* – Hair loss | 1.0 (high / high) | 7 |

Weights are an a-priori heuristic, not fitted; the published ranking (`results/tables/leads.csv`) is unchanged and is shown as 'rank if certainty ignored'.
