"""Does Culpeper (1653) repeat what Dioscorides (c. 60 CE) said about the same plant?

Test: for plants identified in *both* corpora, count the plant-indication
pairs claimed by both authors (observed overlap).  The null model keeps every
plant's Dioscorides claim set fixed and randomly re-assigns Culpeper's claim
sets among the shared plants (a label permutation).  This preserves how many
indications each author gives per plant and how common each indication is,
and destroys only the *same-plant* linkage - exactly the quantity we want to
test.  One-sided p = (k + 1) / (n + 1).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..extract import monograph_concepts


def taxon_claims(claims: pd.DataFrame, mt: pd.DataFrame, level: str = "species") -> pd.DataFrame:
    """Aggregate monograph-level claims to (taxon, concept) with per-source flags."""
    mc = monograph_concepts(claims)
    m = mt[(mt.taxon.fillna("") != "")].copy()
    if level == "species":
        m = m[m.taxon_rank == "species"]
        m["unit"] = m.taxon
    else:  # genus-level sensitivity analysis
        m["unit"] = m.genus.where(m.genus.fillna("") != "", m.taxon.str.split().str[0])
    j = mc.merge(m[["monograph_id", "unit", "confidence"]], on="monograph_id")
    g = (
        j.groupby(["unit", "concept_id", "source"])
        .agg(n=("n_mentions", "sum"), monographs=("monograph_id", lambda s: ";".join(sorted(set(s)))))
        .reset_index()
    )
    wide = g.pivot_table(index=["unit", "concept_id"], columns="source", values="n",
                         aggfunc="sum", fill_value=0).reset_index()
    for s in ("dioscorides", "culpeper"):
        if s not in wide:
            wide[s] = 0
    wide = wide.rename(columns={"unit": "taxon", "dioscorides": "n_dsc", "culpeper": "n_cul"})
    wide["dsc"] = wide.n_dsc > 0
    wide["cul"] = wide.n_cul > 0
    mono = g.pivot_table(index=["unit", "concept_id"], columns="source", values="monographs",
                         aggfunc="first").reset_index().rename(columns={"unit": "taxon"})
    for s in ("dioscorides", "culpeper"):
        if s not in mono:
            mono[s] = ""
    mono = mono.rename(columns={"dioscorides": "dsc_monographs", "culpeper": "cul_monographs"})
    return wide.merge(mono, on=["taxon", "concept_id"], how="left")


def transmission_test(tc: pd.DataFrame, n_perm: int = 10000, seed: int = 2026) -> dict:
    d_sets = {t: set(g.concept_id) for t, g in tc[tc.dsc].groupby("taxon")}
    c_sets = {t: set(g.concept_id) for t, g in tc[tc.cul].groupby("taxon")}
    shared = sorted(set(d_sets) & set(c_sets))
    concepts = sorted(set(tc.concept_id))
    cidx = {c: i for i, c in enumerate(concepts)}
    D = np.zeros((len(shared), len(concepts)), dtype=np.int8)
    C = np.zeros_like(D)
    for i, t in enumerate(shared):
        for c in d_sets[t]:
            D[i, cidx[c]] = 1
        for c in c_sets[t]:
            C[i, cidx[c]] = 1
    observed_by_concept = (D & C).sum(axis=0)
    observed = int(observed_by_concept.sum())
    rng = np.random.default_rng(seed)
    null = np.empty(n_perm, dtype=np.int64)
    null_by_concept = np.zeros(len(concepts))
    for k in range(n_perm):
        perm = rng.permutation(len(shared))
        ov = (D & C[perm]).sum(axis=0)
        null[k] = ov.sum()
        null_by_concept += ov
    null_by_concept /= n_perm
    p = (int((null >= observed).sum()) + 1) / (n_perm + 1)
    per_concept = pd.DataFrame({
        "concept_id": concepts,
        "both": observed_by_concept,
        "expected": null_by_concept,
        "n_dsc": D.sum(axis=0),
        "n_cul": C.sum(axis=0),
    })
    per_concept["fold"] = (per_concept.both + 0.5) / (per_concept.expected + 0.5)
    hist, edges = np.histogram(null, bins=min(40, max(10, int(null.max() - null.min() + 1))))
    return {
        "n_shared_taxa": len(shared),
        "n_dsc_claims_shared": int(D.sum()),
        "n_cul_claims_shared": int(C.sum()),
        "observed_overlap": observed,
        "null_mean": float(null.mean()),
        "null_sd": float(null.std()),
        "null_q": [float(np.percentile(null, q)) for q in (2.5, 50, 97.5)],
        "fold_enrichment": float(observed / null.mean()) if null.mean() else None,
        "z": float((observed - null.mean()) / null.std()) if null.std() else None,
        "p_value": p,
        "n_perm": n_perm,
        "null_hist": {"counts": hist.tolist(), "edges": edges.tolist()},
        "per_concept": per_concept,
        "share_cul_in_dsc": float(observed / C.sum()) if C.sum() else None,
    }
