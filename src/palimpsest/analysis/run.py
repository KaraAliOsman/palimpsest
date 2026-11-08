"""Run every analysis and write results/ (JSON, tables, figures)."""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from ..extract import load_concepts
from ..paths import PROCESSED, RESULTS, TABLES, ensure_dirs
from . import figures
from .leads import rank_leads
from .modern import (add_metrics, conditional_logit, group_summary, logit_fixed_effects,
                     poisson_rate_ratios, within_taxon_wilcoxon)
from .persistence import taxon_claims, transmission_test


def _jsonable(o):
    if isinstance(o, dict):
        return {k: _jsonable(v) for k, v in o.items() if not isinstance(v, pd.DataFrame)}
    if isinstance(o, (list, tuple)):
        return [_jsonable(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    return o


def load_inputs():
    claims = pd.read_csv(PROCESSED / "claims.csv")
    mt = pd.read_csv(PROCESSED / "monograph_taxa.csv", dtype=str, keep_default_na=False)
    return claims, mt


def run_analysis(n_perm: int = 10000) -> dict:
    ensure_dirs()
    claims, mt = load_inputs()
    concepts = load_concepts()
    tc = taxon_claims(claims, mt, "species")
    tc.to_csv(PROCESSED / "taxon_claims.csv", index=False)

    # --- 1. transmission Dioscorides -> Culpeper (+ sensitivity analyses)
    trans = transmission_test(tc, n_perm=n_perm)
    sens = {
        "genus_level": transmission_test(taxon_claims(claims, mt, "genus"), n_perm=2000),
        "high_confidence_ids_only": transmission_test(
            taxon_claims(claims, mt[mt.confidence == "high"], "species"), n_perm=2000),
        "category_level": None,
    }
    cat_of = dict(zip(concepts.concept_id, concepts.category))
    tcc = tc.assign(concept_id=tc.concept_id.map(cat_of)).groupby(["taxon", "concept_id"]).agg(
        dsc=("dsc", "max"), cul=("cul", "max")).reset_index()
    sens["category_level"] = transmission_test(tcc, n_perm=2000)
    per_concept = trans["per_concept"].merge(concepts[["concept_id", "label", "category"]], on="concept_id")
    per_concept.sort_values("both", ascending=False).to_csv(TABLES / "transmission_by_concept.csv", index=False)

    # --- 2. modern evidence
    ev = pd.read_csv(PROCESSED / "evidence_pairs.csv")
    N = int(ev.N.iloc[0])
    pairs = ev.merge(tc[["taxon", "concept_id", "n_dsc", "n_cul", "dsc", "cul"]],
                     on=["taxon", "concept_id"], how="left")
    for col in ("n_dsc", "n_cul"):
        pairs[col] = pairs[col].fillna(0).astype(int)
    for col in ("dsc", "cul"):
        pairs[col] = pairs[col].fillna(False).astype(bool)
    pairs["group"] = np.select([pairs.dsc & pairs.cul, pairs.dsc, pairs.cul],
                               ["both", "dsc_only", "cul_only"], "unclaimed")
    pairs = add_metrics(pairs, N)
    pairs.to_csv(PROCESSED / "pairs_scored.csv", index=False)
    p = pairs[pairs.taxon_total > 0]
    modern = {
        "N_records": N,
        "n_taxa_tested": int(p.taxon.nunique()),
        "n_taxa_without_literature": int(pairs[pairs.taxon_total == 0].taxon.nunique()),
        "groups": group_summary(p),
        # primary: indication fixed effects + offset (plant & indication volume)
        "poisson_rate_ratios": poisson_rate_ratios(p),
        "logit_fixed_effects": logit_fixed_effects(p),
        # secondary specifications
        "poisson_offset_only": poisson_rate_ratios(p, fixed_effects=False),
        "conditional_logit": conditional_logit(p),
        "wilcoxon_within_taxon": within_taxon_wilcoxon(p),
    }
    # sensitivity: restrict to plants whose identification is 'high' in every source
    hc_taxa = set(mt[(mt.taxon != "")].groupby("taxon").confidence.apply(lambda s: (s == "high").all())
                  .loc[lambda s: s].index)
    p_hc = p[p.taxon.isin(hc_taxa)]
    modern["sensitivity_high_confidence"] = {
        "n_taxa": int(p_hc.taxon.nunique()),
        "poisson_rate_ratios": poisson_rate_ratios(p_hc) if p_hc.taxon.nunique() > 20 else [],
        "groups": group_summary(p_hc) if not p_hc.empty else [],
    }

    # --- 3. leads
    ti_path = PROCESSED / "taxon_info.csv"
    ti = pd.read_csv(ti_path) if ti_path.exists() else pd.DataFrame({"taxon": []})
    adverse = claims[claims.polarity == "adverse"].merge(mt[["monograph_id", "taxon"]], on="monograph_id")
    leads, leads_all = rank_leads(pairs, ti.drop(columns=[c for c in ("taxon_total",) if c in ti.columns]),
                                  set(adverse.taxon) - {""})
    lab = concepts[["concept_id", "label", "category"]]
    leads = leads.merge(lab, on="concept_id", how="left")
    leads.to_csv(TABLES / "leads.csv", index=False)
    leads_all.merge(lab, on="concept_id", how="left").to_csv(TABLES / "leads_all.csv", index=False)

    # --- 4. descriptive
    mc = claims[claims.polarity.isin(["therapeutic", "action"])].merge(
        mt[["monograph_id", "taxon", "taxon_rank"]], on="monograph_id")
    mc = mc[mc.taxon != ""].drop_duplicates(["monograph_id", "concept_id"])
    mc["category"] = mc.concept_id.map(cat_of)
    cat = mc.groupby(["category", "source"]).size().unstack(fill_value=0)
    cat = (cat / cat.sum()).reset_index()
    for s in ("dioscorides", "culpeper"):
        if s not in cat:
            cat[s] = 0.0
    cat.to_csv(TABLES / "claims_by_category.csv", index=False)

    descriptive = {
        "monographs": mt.groupby("source").size().to_dict(),
        "monographs_with_taxon": mt[mt.taxon != ""].groupby("source").size().to_dict(),
        "kinds": mt.groupby(["source", "kind"]).size().unstack(fill_value=0).to_dict(),
        "confidence": mt[mt.taxon != ""].groupby(["source", "confidence"]).size().unstack(fill_value=0).to_dict(),
        "species": {s: int(mt[(mt.source == s) & (mt.taxon_rank == "species")].taxon.nunique())
                    for s in ("dioscorides", "culpeper")},
        "species_shared": trans["n_shared_taxa"],
        "claims_spans": claims.polarity.value_counts().to_dict(),
        "claims_by_source": claims[claims.polarity.isin(["therapeutic", "action"])].groupby("source").size().to_dict(),
        "taxon_concept_pairs": {"dsc": int(tc.dsc.sum()), "cul": int(tc.cul.sum()),
                                "both": int((tc.dsc & tc.cul).sum())},
    }

    # --- figures
    figures.transmission_null(trans)
    if modern["groups"]:
        figures.evidence_by_group(modern["groups"])
    if modern["poisson_rate_ratios"]:
        figures.forest(modern["poisson_rate_ratios"], "rate_ratio",
                       "Modern co-mention rate of claimed vs unclaimed indications",
                       "fig3b_rate_ratios",
                       "Rate ratio (Poisson GLM, indication fixed effects + volume offset, cluster-robust 95% CI)")
    if modern["logit_fixed_effects"]:
        figures.forest(modern["logit_fixed_effects"], "odds_ratio",
                       "Odds that at least one paper studies the claimed indication",
                       "fig3_odds_ratios",
                       "Odds ratio (logit, indication fixed effects + plant volume, cluster-robust 95% CI)")
    figures.categories(cat)

    stats = {"descriptive": descriptive, "transmission": trans,
             "transmission_sensitivity": sens, "modern": modern,
             "n_leads": int(len(leads))}
    (RESULTS / "stats.json").write_text(json.dumps(_jsonable(stats), indent=2, ensure_ascii=False),
                                        encoding="utf-8")
    return stats
