"""Rank persistent-but-under-studied plant-indication pairs as research leads.

A *lead* is a pair that (i) both Dioscorides and Culpeper claim for the same
accepted species - i.e. it survived ~1,600 years of transmission - and
(ii) has little or no modern literature co-mentioning plant and indication.

The score is deliberately simple and transparent (all components in [0, 1]):

    score = 0.35·persistence + 0.25·chemistry + 0.40·gap

* persistence - min(1, mentions across both herbals / 6)
* chemistry   - min(1, log(1 + known constituents in LOTUS/Wikidata) / log(1 + 500))
* gap         - ½·1/(1 + co-mentioning papers)  +  ½·surprise, where surprise =
                min(1, −log10 P(X ≤ papers | Poisson(expected)) / 3) and
                expected = the plant's disease co-mentions (all indications queried
                for it) shared out by each indication's research volume.
                A gap is most striking when *both* the plant and the indication
                are well studied, yet never together.

The published ranking is diversified for readability (≤ 2 leads per plant,
≤ 4 per indication); the unconstrained ranking is ``leads_all.csv``.
Safety and conservation are flags, never folded into the score: a historical
adverse statement about the plant, and IUCN status VU/EN/CR.
These are hypotheses for laboratory follow-up, not therapeutic claims.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import poisson

THREATENED = {"VU", "EN", "CR", "EW", "EX"}


def score_pairs(pairs: pd.DataFrame, taxon_info: pd.DataFrame, adverse_taxa: set[str],
                max_pair: int = 4) -> pd.DataFrame:
    # biomedical expectation: share the plant's disease-co-mentions (over all
    # indications queried for it) out to each indication by its research volume.
    # This ignores agronomic / botanical literature, which dominates crop plants.
    q = pairs.groupby("taxon").agg(R=("pair", "sum"), V=("concept_total", "sum"))
    c = pairs[(pairs.group == "both") & (pairs.pair <= max_pair)].copy()
    if c.empty:
        return c
    c = c.join(q, on="taxon")
    c["expected"] = c.R * c.concept_total / c.V
    c = c.merge(taxon_info, on="taxon", how="left")
    c["n_compounds"] = c.n_compounds.fillna(0)
    c["persistence"] = np.minimum(1, (c.n_dsc + c.n_cul) / 6)
    c["chemistry"] = np.minimum(1, np.log1p(c.n_compounds) / np.log1p(500))
    surprise = -np.log10(np.clip(poisson.cdf(c.pair, np.maximum(c.expected, 1e-9)), 1e-300, 1))
    c["surprise"] = np.minimum(1, surprise / 3)
    c["gap"] = 0.5 / (1 + c.pair) + 0.5 * c.surprise
    c["score"] = (0.35 * c.persistence + 0.25 * c.chemistry + 0.40 * c.gap).round(4)
    c["flag_historical_safety"] = c.taxon.isin(adverse_taxa)
    c["flag_threatened"] = c.iucn.fillna("").isin(THREATENED)
    return c.sort_values(["score", "expected"], ascending=[False, False]).reset_index(drop=True)


def diversify(c: pd.DataFrame, per_taxon: int = 2, per_concept: int = 4, top: int = 60) -> pd.DataFrame:
    kept, nt, nc = [], {}, {}
    for i, r in c.iterrows():
        if nt.get(r.taxon, 0) >= per_taxon or nc.get(r.concept_id, 0) >= per_concept:
            continue
        kept.append(i)
        nt[r.taxon] = nt.get(r.taxon, 0) + 1
        nc[r.concept_id] = nc.get(r.concept_id, 0) + 1
        if len(kept) == top:
            break
    out = c.loc[kept].copy()
    out.insert(0, "rank", range(1, len(out) + 1))
    return out


def rank_leads(pairs: pd.DataFrame, taxon_info: pd.DataFrame, adverse_taxa: set[str],
               max_pair: int = 4, top: int = 60) -> tuple[pd.DataFrame, pd.DataFrame]:
    allp = score_pairs(pairs, taxon_info, adverse_taxa, max_pair)
    if allp.empty:
        return allp, allp
    return diversify(allp, top=top), allp
