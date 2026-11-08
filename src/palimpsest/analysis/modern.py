"""Are historical claims over-represented in the modern biomedical literature?

For each plant we compare the indications the herbals claim with indications
they do *not* claim (randomly sampled controls for the same plant).  Literature
volume differs enormously between plants and between diseases, so every
comparison is made *within plant* and adjusted for the disease's own volume:

* ``expected`` = taxon_hits * concept_hits / N (independence baseline);
* ``lift``     = (pair_hits + 0.5) / (expected + 0.5);
* Poisson GLM, offset log(expected), cluster-robust SEs by plant -> rate ratio
  of co-mention for claimed vs unclaimed indications;
* conditional logistic regression (strata = plant) for "any co-mention",
  adjusting for log concept volume -> odds ratios.

Caveat (stated everywhere): modern research is partly *motivated* by
tradition, so co-mention measures research attention + evidence, not
efficacy.  It is a screening signal, not a validation.
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

GROUPS = ["unclaimed", "dsc_only", "cul_only", "both"]


def status(row) -> str:
    if row.dsc and row.cul:
        return "both"
    if row.dsc:
        return "dsc_only"
    if row.cul:
        return "cul_only"
    return "unclaimed"


def add_metrics(pairs: pd.DataFrame, N: int) -> pd.DataFrame:
    p = pairs.copy()
    p["expected"] = p.taxon_total * p.concept_total / N
    p["lift"] = (p.pair + 0.5) / (p.expected + 0.5)
    p["log2_lift"] = np.log2(p.lift)
    p["any_pair"] = (p.pair > 0).astype(int)
    p["tier"] = pd.cut(p.pair, [-1, 0, 4, np.inf], labels=["unstudied", "sparse", "studied"]).astype(str)
    return p


def cluster_bootstrap(p: pd.DataFrame, stat, n_boot=2000, seed=5):
    taxa = p.taxon.unique()
    groups = {t: g for t, g in p.groupby("taxon")}
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n_boot):
        pick = rng.choice(taxa, size=len(taxa), replace=True)
        vals.append(stat(pd.concat([groups[t] for t in pick], ignore_index=True)))
    v = np.array(vals, dtype=float)
    return float(np.nanpercentile(v, 2.5)), float(np.nanpercentile(v, 97.5))


def group_summary(p: pd.DataFrame) -> list[dict]:
    out = []
    for g in GROUPS:
        sub = p[p.group == g]
        if sub.empty:
            continue
        out.append({
            "group": g,
            "n_pairs": int(len(sub)),
            "n_taxa": int(sub.taxon.nunique()),
            "share_any_paper": float(sub.any_pair.mean()),
            "share_any_paper_ci": cluster_bootstrap(sub, lambda d: d.any_pair.mean(), n_boot=1000),
            "median_lift": float(sub.lift.median()),
            "mean_log2_lift": float(sub.log2_lift.mean()),
            "mean_log2_lift_ci": cluster_bootstrap(sub, lambda d: d.log2_lift.mean(), n_boot=1000),
        })
    return out


def _informative(d: pd.DataFrame) -> pd.DataFrame:
    """Drop plants / indications whose co-mention counts are all zero: their
    fixed effects diverge and they carry no information about the contrast."""
    for _ in range(3):
        d = d[d.groupby("taxon").pair.transform("sum") > 0]
        d = d[d.groupby("concept_id").pair.transform("sum") > 0]
    return d


def poisson_rate_ratios(p: pd.DataFrame, fixed_effects: bool = True) -> list[dict]:
    """Rate ratio of co-mentions for claimed vs unclaimed indications.

    Offset log(expected) absorbs each plant's and each indication's overall
    research volume; SEs are cluster-robust by plant.  Primary specification
    (``fixed_effects=True``) adds indication fixed effects, so the claim
    coefficient compares the *same indication* across plants for which it was
    and was not claimed - it cannot be driven by indications that are popular
    in plant pharmacology in general (e.g. anti-inflammatory)."""
    import statsmodels.api as sm

    d = p[(p.expected > 0)].copy()
    if fixed_effects:
        d = _informative(d)
    X = pd.get_dummies(d.group, dtype=float)
    terms = [g for g in GROUPS[1:] if g in X]
    X = X[terms]
    if fixed_effects:
        X = pd.concat([X, pd.get_dummies(d.concept_id, prefix="c", drop_first=True, dtype=float)], axis=1)
    X = sm.add_constant(X)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = sm.GLM(d.pair.values, X, family=sm.families.Poisson(), offset=np.log(d.expected.values))
        fit = model.fit(cov_type="cluster", cov_kwds={"groups": pd.factorize(d.taxon)[0]}, maxiter=200)
    rows = []
    ci = fit.conf_int()
    for g in terms:
        rows.append({"term": g, "rate_ratio": float(np.exp(fit.params[g])),
                     "ci": [float(np.exp(ci.loc[g, 0])), float(np.exp(ci.loc[g, 1]))],
                     "p": float(fit.pvalues[g]), "n_obs": int(len(d)),
                     "n_taxa": int(d.taxon.nunique()), "fixed_effects": fixed_effects})
    return rows


def logit_fixed_effects(p: pd.DataFrame) -> list[dict]:
    """Odds of *any* co-mentioning paper with indication fixed effects and the
    plant's log research volume, cluster-robust SEs by plant (primary logit)."""
    import statsmodels.api as sm

    d = p[p.taxon_total > 0].copy()
    for _ in range(3):
        d = d[d.groupby("concept_id").any_pair.transform(lambda s: s.nunique() > 1)]
        d = d[d.groupby("taxon").any_pair.transform(lambda s: s.nunique() > 1)]
    if d.empty:
        return []
    X = pd.get_dummies(d.group, dtype=float)
    terms = [g for g in GROUPS[1:] if g in X]
    X = X[terms]
    X["log_plant_volume"] = np.log1p(d.taxon_total.values)
    X = pd.concat([X, pd.get_dummies(d.concept_id, prefix="c", drop_first=True, dtype=float)], axis=1)
    X = sm.add_constant(X)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fit = sm.GLM(d.any_pair.values, X, family=sm.families.Binomial()).fit(
            cov_type="cluster", cov_kwds={"groups": pd.factorize(d.taxon)[0]}, maxiter=200)
    ci = fit.conf_int()
    return [{"term": g, "odds_ratio": float(np.exp(fit.params[g])),
             "ci": [float(np.exp(ci.loc[g, 0])), float(np.exp(ci.loc[g, 1]))],
             "p": float(fit.pvalues[g]), "n_obs": int(len(d)), "n_strata": int(d.taxon.nunique()),
             "model": "logit, indication FE + plant volume, cluster-robust"} for g in terms]


def conditional_logit(p: pd.DataFrame) -> list[dict]:
    """Odds of *any* co-mentioning paper, strata = plant (exact within-plant
    comparison), adjusted for the indication's log research volume."""
    from statsmodels.discrete.conditional_models import ConditionalLogit

    d = p.copy()
    # strata without variation in the outcome carry no information
    d = d[d.groupby("taxon").any_pair.transform(lambda s: s.nunique() > 1)]
    if d.empty:
        return []
    X = pd.get_dummies(d.group, dtype=float)
    terms = [g for g in GROUPS[1:] if g in X]
    X = X[terms]
    X["log_concept_volume"] = np.log1p(d.concept_total)
    terms = terms + ["log_concept_volume"]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fit = ConditionalLogit(d.any_pair.values, X, groups=d.taxon.values).fit(disp=0, maxiter=200)
    ci = fit.conf_int()
    rows = []
    for g in terms:
        rows.append({"term": g, "odds_ratio": float(np.exp(fit.params[g])),
                     "ci": [float(np.exp(ci.loc[g, 0])), float(np.exp(ci.loc[g, 1]))],
                     "p": float(fit.pvalues[g]), "n_obs": int(len(d)),
                     "n_strata": int(d.taxon.nunique()),
                     "model": "conditional logit, strata = plant, + log indication volume"})
    return rows


def within_taxon_wilcoxon(p: pd.DataFrame) -> dict:
    from scipy.stats import wilcoxon

    claimed = p[p.group != "unclaimed"].groupby("taxon").log2_lift.mean()
    unclaimed = p[p.group == "unclaimed"].groupby("taxon").log2_lift.mean()
    both = pd.concat([claimed, unclaimed], axis=1, keys=["c", "u"]).dropna()
    if len(both) < 10:
        return {}
    stat = wilcoxon(both.c, both.u, alternative="greater")
    diff = both.c - both.u
    return {"n_taxa": int(len(both)), "median_diff_log2_lift": float(diff.median()),
            "share_taxa_claimed_higher": float((diff > 0).mean()),
            "statistic": float(stat.statistic), "p_value": float(stat.pvalue)}
