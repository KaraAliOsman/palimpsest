"""Run every analysis and write results/ (JSON, tables, figures)."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from ..extract import load_concepts
from ..paths import PROCESSED, RESULTS, TABLES, ensure_dirs
from . import figures
from .leads import rank_leads
from .modern import (add_metrics, conditional_logit, group_summary, logit_fixed_effects,
                     poisson_rate_ratios, within_taxon_wilcoxon)
from .persistence import size_strata, taxon_claims, transmission_test


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


def run_analysis(n_perm: int = 10000, evidence_dir: Path | None = None,
                 out_processed: Path | None = None, out_results: Path | None = None) -> dict:
    """Defaults reproduce the published run. ``evidence_dir`` is where
    evidence_pairs.csv / taxon_info.csv are read from; ``out_processed`` /
    ``out_results`` redirect every output (tables/ and figures/ go under
    ``out_results``). claims.csv and monograph_taxa.csv always come from PROCESSED."""
    ensure_dirs()
    evidence_dir = Path(evidence_dir) if evidence_dir else PROCESSED
    out_processed = Path(out_processed) if out_processed else PROCESSED
    out_results = Path(out_results) if out_results else RESULTS
    tables = TABLES if out_results == RESULTS else out_results / "tables"
    for d in (out_processed, out_results, tables):
        d.mkdir(parents=True, exist_ok=True)
    default_figs = figures.FIGURES
    if out_results != RESULTS:
        figures.FIGURES = out_results / "figures"
    try:
        return _run_analysis(n_perm, evidence_dir, out_processed, out_results, tables)
    finally:
        figures.FIGURES = default_figs


def _run_analysis(n_perm, evidence_dir, out_processed, out_results, tables) -> dict:
    claims, mt = load_inputs()
    concepts = load_concepts()
    tc = taxon_claims(claims, mt, "species")
    tc.to_csv(out_processed / "taxon_claims.csv", index=False)

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
    # stricter nulls requested in review: plants with long entries in both herbals
    # (size strata) and related plants with shared chemistry (same family)
    sens["size_stratified"] = transmission_test(tc, n_perm=5000, strata=size_strata(tc))
    fam = mt[mt.taxon != ""].drop_duplicates("taxon").set_index("taxon").family.to_dict()
    sens["within_family"] = transmission_test(tc, n_perm=5000, strata=fam)
    per_concept = trans["per_concept"].merge(concepts[["concept_id", "label", "category"]], on="concept_id")
    per_concept.sort_values("both", ascending=False).to_csv(tables / "transmission_by_concept.csv", index=False)

    # --- 2. modern evidence
    ev = pd.read_csv(evidence_dir / "evidence_pairs.csv")
    ev = ev[ev.taxon.isin(set(tc.taxon))]
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
    pairs.to_csv(out_processed / "pairs_scored.csv", index=False)
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
        # intensity once studied: among pairs with >= 1 co-mentioning paper
        "poisson_given_studied": poisson_rate_ratios(p[p.pair > 0]),
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
    ti_path = evidence_dir / "taxon_info.csv"
    ti = pd.read_csv(ti_path) if ti_path.exists() else pd.DataFrame({"taxon": []})
    adverse = claims[claims.polarity == "adverse"].merge(mt[["monograph_id", "taxon"]], on="monograph_id")
    # a lead must be supported by a chapter about the plant itself in BOTH herbals,
    # not only by a product chapter (e.g. bird-lime, a wine or an oil)
    kind = dict(zip(mt.monograph_id, mt.kind))

    def plant_side(ids):
        return any(kind.get(i) == "plant" for i in str(ids).split(";") if i)

    ok = {(r.taxon, r.concept_id) for r in tc.itertuples()
          if plant_side(r.dsc_monographs) and plant_side(r.cul_monographs)}
    in_ok = pd.Series([(t, c) in ok for t, c in zip(pairs.taxon, pairs.concept_id)], index=pairs.index)
    lead_pairs = pairs[(pairs.group != "both") | in_ok]
    leads, leads_all = rank_leads(lead_pairs, ti.drop(columns=[c for c in ("taxon_total",) if c in ti.columns]),
                                  set(adverse.taxon) - {""})
    lab = concepts[["concept_id", "label", "category"]]
    leads = leads.merge(lab, on="concept_id", how="left")
    leads.to_csv(tables / "leads.csv", index=False)
    leads_all.merge(lab, on="concept_id", how="left").to_csv(tables / "leads_all.csv", index=False)

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
    cat.to_csv(tables / "claims_by_category.csv", index=False)

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
    (out_results / "stats.json").write_text(json.dumps(_jsonable(stats), indent=2, ensure_ascii=False),
                                        encoding="utf-8")
    return stats
