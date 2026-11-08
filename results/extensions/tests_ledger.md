# P7 · Tests we wrote down

*Generated 2026-11-08 · reproduce: `PYTHONPATH=src python scripts/tests_ledger.py`*

30 tests: 22 held, 3 indicative, 5 null.

| ID | Area | Question | Prediction | Result | Status | Timing |
|---|---|---|---|---|---|---|
| T1 | Transmission | Does Culpeper repeat Dioscorides' indication for the same plant more often than chance? | fold enrichment > 1, permutation p < 0.05 | 642 shared vs 242 expected: 2.65x, z = 26.1, p < 0.0001 | **held** | a priori |
| T2 | Transmission (stricter null / sensitivity) | Does the transmission signal survive: permutation only among plants of similar entry length (quintiles)? | fold > 1, p < 0.05 | 642 vs 304: 2.11x, z = 23.4, p = 0.0002 (5,000 permutations) | **held** | a priori |
| T3 | Transmission (stricter null / sensitivity) | Does the transmission signal survive: permutation only within the same botanical family (most conservative)? | fold > 1, p < 0.05 | 642 vs 412: 1.56x, z = 12.4, p = 0.0002 (5,000 permutations) | **held** | a priori |
| T4 | Transmission (stricter null / sensitivity) | Does the transmission signal survive: same test with plants merged to genus? | fold > 1, p < 0.05 | 883 vs 369: 2.39x, z = 24.9, p = 0.0005 (2,000 permutations) | **held** | a priori |
| T5 | Transmission (stricter null / sensitivity) | Does the transmission signal survive: only high-confidence identifications? | fold > 1, p < 0.05 | 392 vs 158: 2.49x, z = 19.1, p = 0.0005 (2,000 permutations) | **held** | a priori |
| T6 | Transmission (stricter null / sensitivity) | Does the transmission signal survive: indications merged to therapeutic categories? | fold > 1, p < 0.05 | 552 vs 389: 1.42x, z = 14.1, p = 0.0005 (2,000 permutations) | **held** | a priori |
| M1 | Modern evidence: presence | Are persistent (both herbals) claims more often studied at all than unclaimed indications of the same plants? | OR > 1 (95% CI excludes 1) | OR 2.77 [2.04-3.77], p = 9e-11, n = 12,797 | **held** | a priori |
| M2 | Modern evidence: presence | Are Dioscorides-only claims more often studied at all than unclaimed indications of the same plants? | OR > 1 (95% CI excludes 1) | OR 1.98 [1.67-2.35], p = 4e-15, n = 12,797 | **held** | a priori |
| M3 | Modern evidence: presence | Are Culpeper-only claims more often studied at all than unclaimed indications of the same plants? | OR > 1 (95% CI excludes 1) | OR 1.65 [1.40-1.94], p = 2e-09, n = 12,797 | **held** | a priori |
| M4 | Modern evidence: presence | Same, with an exact within-plant comparison? | OR > 1 | OR 2.29 [1.80-2.90], p = 1e-11 | **held** | a priori |
| M5 | Modern evidence: intensity | Are persistent claims studied more intensively (more co-mentioning papers)? | rate ratio > 1 (95% CI excludes 1) | RR 1.18 [0.70-1.99], p = 0.53 | **null** | a priori |
| M6 | Modern evidence: intensity | Are persistent claims studied more intensively (more co-mentioning papers)? | rate ratio > 1 (95% CI excludes 1) | RR 1.75 [1.05-2.91], p = 0.03 | **held** | a priori |
| M7 | Modern evidence: intensity | Are persistent claims studied more intensively once studied? | rate ratio > 1 (95% CI excludes 1) | RR 1.04 [0.61-1.76], p = 0.88 | **null** | a priori |
| M8 | Modern evidence: lift | Within each plant, do claimed indications have higher lift over expectation than unclaimed ones? | one-sided Wilcoxon p < 0.05 | 65% of 585 plants higher, p = 1e-15 | **held** | a priori |
| M9 | Modern evidence: matched controls | Is the share of persistent (both herbals) pairs with >= 1 paper higher than for the unclaimed indications of exactly the same plants? | claimed share's 95% CI above the matched share's 95% CI | 44.9% [37.2%-52.4%] vs 32.2% [27.8%-36.7%] | **held** | a priori |
| M10 | Modern evidence: matched controls | Is the share of Dioscorides-only pairs with >= 1 paper higher than for the unclaimed indications of exactly the same plants? | claimed share's 95% CI above the matched share's 95% CI | 36.9% [32.6%-41.1%] vs 24.8% [22.2%-27.5%] | **held** | a priori |
| M11 | Modern evidence: matched controls | Is the share of Culpeper-only pairs with >= 1 paper higher than for the unclaimed indications of exactly the same plants? | claimed share's 95% CI above the matched share's 95% CI | 35.1% [31.3%-38.7%] vs 24.0% [21.7%-26.8%] | **held** | a priori |
| M12 | Modern evidence: sensitivity | Intensity result with high-confidence plants only? | RR > 1 | RR 0.97 [0.47-1.97] | **null** | a priori |
| S1 | Synonym sensitivity | Does the presence result survive searching every plant under all its GBIF synonyms? | persistent OR > 1 (CI excludes 1) | OR 2.48 [1.84-3.36] | **held** | a priori |
| S2 | Synonym sensitivity | Intensity once studied, synonym-expanded? | RR > 1 | RR 1.03 [0.62-1.73] | **null** | a priori |
| E1 | Extraction | Is the Ancient Greek indication extractor accurate against a blind reference annotation? | F1 >= 0.80 | P 0.88, R 0.83, F1 0.86 [0.81-0.89] | **held** | post hoc |
| E2 | Extraction | Is the Early Modern English indication extractor accurate against a blind reference annotation? | F1 >= 0.80 | P 0.90, R 0.90, F1 0.90 [0.88-0.92] | **held** | post hoc |
| N1 | Naming | Do curated names resolve on the GBIF backbone? | >= 95% resolved | 99.2% resolved | **held** | post hoc |
| N2 | Naming | Do Greek lemmas agree with independent Wikidata Greek labels of the resolved taxon? | descriptive (no threshold) | 64% of 269 checkable | **indicative** | a priori |
| N3 | Naming | Do Culpeper headings agree with GBIF English vernacular names? | descriptive (no threshold) | 72% of 326 checkable | **indicative** | a priori |
| X1 | Expert benchmark | Do our Dioscorides identifications agree with Lardos et al. (2024) expert top-1 at species level? | agreement > 50% (Wilson CI lower bound) | 70% (38/54) [0.57-0.81] | **held** | post hoc |
| X2 | Expert benchmark | Do our Dioscorides identifications agree with Lardos et al. (2024) expert top-1 at genus level? | agreement > 80% (Wilson CI lower bound) | 91% (49/54) [0.80-0.96] | **held** | post hoc |
| X3 | Expert benchmark | Are the 30 commonest food/garden plants identified correctly? | 30/30 | 30/30 correct | **held** | a priori |
| P4 | Leads | Is the lead ranking robust to identification uncertainty? | descriptive (Kendall tau; no threshold) | tau-b 0.56 over 517 candidates; 41/60 stay in the top 60 | **indicative** | a priori |
| P10 | Mechanism (hypothesis-generating) | Are a lead plant's active targets more often associated with its historical indication than with other diseases? | lead disease above the plant's median over other diseases in > 50% of leads | 33/60 leads have a path; lead disease above median in 22/51 | **null** | post hoc |

Reproduce commands and machine-readable numbers: `web/public/data/extra/tests_ledger.json`.
