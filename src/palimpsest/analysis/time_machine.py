"""P5 - time-machine (pseudo-prospective) test: did the herbals predict later research?

Input: one row per scored pair (``pairs_scored.csv`` design: every claimed
indication + 12 seeded unclaimed controls per plant) with Europe PMC co-mention
counts in publication-year windows (``scripts/time_machine.py fetch``):

* ``c_le2005, c_le2010, c_le2015`` - co-mentioning papers with PUB_YEAR <= cutoff;
* ``c_gt2010`` - PUB_YEAR >= 2011; current total = c_le2010 + c_gt2010;
* ``t_le2005, t_le2010, t_le2015, t_gt2010`` - the plant's own papers by window.

Design for a cutoff *Y* (fixed before the counts were fetched):

* **risk set** - pairs with **0** co-mentioning papers up to *Y* whose plant had
  >= 1 paper of its own up to *Y* (the plant was known to science; only the pair
  was unstudied);
* **outcome** - >= 1 co-mentioning paper published after *Y*;
* **primary model** - logit of the outcome on claim group (Dioscorides only /
  Culpeper only / both = persistent, vs unclaimed) with indication fixed effects
  and log(1 + plant papers up to *Y*) - only information available at *Y* -
  cluster-robust SEs by plant;
* secondary - + log(1 + plant papers after *Y*) (absorbs plants that boomed
  later); conditional logit with strata = plant (+ log indication volume);
* **matched shares** - share of each claim group that gains a paper vs the
  unclaimed indications of exactly the same plants (cluster-bootstrap CIs);
* **within-plant Wilcoxon** - per plant, share gaining among claimed vs unclaimed
  pairs, one-sided (claimed > unclaimed).
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

GROUPS = ["unclaimed", "dsc_only", "cul_only", "both"]
CLAIMED = GROUPS[1:]


# --------------------------------------------------------------------------- data
def prepare(df: pd.DataFrame, cutoff: int) -> pd.DataFrame:
    """Risk set and outcome for one cutoff."""
    d = df.copy()
    now = d.c_le2010 + d.c_gt2010
    t_now = d.t_le2010 + d.t_gt2010
    d["before"] = d[f"c_le{cutoff}"]
    d["after"] = d.c_gt2010 if cutoff == 2010 else (now - d.before).clip(lower=0)
    d["plant_before"] = d[f"t_le{cutoff}"]
    d["plant_after"] = d.t_gt2010 if cutoff == 2010 else (t_now - d.plant_before).clip(lower=0)
    d = d[(d.before == 0) & (d.plant_before > 0)].copy()
    d["gained"] = (d.after > 0).astype(int)
    return d


# --------------------------------------------------------------------------- models
def logit_fe(d: pd.DataFrame, extra: tuple[str, ...] = ()) -> list[dict]:
    import statsmodels.api as sm

    d = d[d.groupby("concept_id").gained.transform(lambda s: s.nunique() > 1)]
    if d.empty or d.gained.nunique() < 2:
        return []
    X = pd.get_dummies(d.group, dtype=float)
    terms = [g for g in CLAIMED if g in X]
    X = X[terms].copy()
    X["log_plant_before"] = np.log1p(d.plant_before.values)
    for e in extra:
        X[f"log_{e}"] = np.log1p(d[e].values)
    X = pd.concat([X, pd.get_dummies(d.concept_id, prefix="c", drop_first=True, dtype=float)], axis=1)
    X = sm.add_constant(X)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            fit = sm.GLM(d.gained.values, X, family=sm.families.Binomial()).fit(
                cov_type="cluster", cov_kwds={"groups": pd.factorize(d.taxon)[0]}, maxiter=200)
        except np.linalg.LinAlgError:  # collinear design (e.g. degenerate subsets)
            return []
    ci = fit.conf_int()
    return [{"term": g, "odds_ratio": float(np.exp(fit.params[g])),
             "ci": [float(np.exp(ci.loc[g, 0])), float(np.exp(ci.loc[g, 1]))],
             "p": float(fit.pvalues[g]), "n_obs": int(len(d)), "n_taxa": int(d.taxon.nunique()),
             "n_events": int(d.gained.sum())} for g in terms]


def conditional_logit(d: pd.DataFrame) -> list[dict]:
    from statsmodels.discrete.conditional_models import ConditionalLogit

    d = d[d.groupby("taxon").gained.transform(lambda s: s.nunique() > 1)]
    if d.empty:
        return []
    X = pd.get_dummies(d.group, dtype=float)
    terms = [g for g in CLAIMED if g in X]
    X = X[terms].copy()
    X["log_concept_volume"] = np.log1p(d.concept_total.values)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fit = ConditionalLogit(d.gained.values, X, groups=d.taxon.values).fit(disp=0, maxiter=200)
    ci = fit.conf_int()
    return [{"term": g, "odds_ratio": float(np.exp(fit.params[g])),
             "ci": [float(np.exp(ci.loc[g, 0])), float(np.exp(ci.loc[g, 1]))],
             "p": float(fit.pvalues[g]), "n_obs": int(len(d)), "n_strata": int(d.taxon.nunique())}
            for g in terms]


def _boot(d: pd.DataFrame, n_boot: int = 1000, seed: int = 7) -> tuple[float, float]:
    if d.empty:
        return (float("nan"), float("nan"))
    groups = [g.gained.values for _, g in d.groupby("taxon")]
    rng = np.random.default_rng(seed)
    k = len(groups)
    vals = []
    for _ in range(n_boot):
        pick = rng.integers(0, k, k)
        a = np.concatenate([groups[i] for i in pick])
        vals.append(a.mean())
    return (float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5)))


def matched_shares(d: pd.DataFrame, n_boot: int = 1000) -> list[dict]:
    out = []
    u_all = d[d.group == "unclaimed"]
    out.append({"group": "unclaimed", "n": int(len(u_all)), "share_gained": float(u_all.gained.mean()),
                "ci": _boot(u_all, n_boot)})
    for g in CLAIMED:
        s = d[d.group == g]
        if s.empty:
            continue
        ctrl = u_all[u_all.taxon.isin(set(s.taxon))]
        out.append({"group": g, "n": int(len(s)), "n_taxa": int(s.taxon.nunique()),
                    "share_gained": float(s.gained.mean()), "ci": _boot(s, n_boot),
                    "matched_unclaimed_share": float(ctrl.gained.mean()) if len(ctrl) else None,
                    "matched_unclaimed_ci": _boot(ctrl, n_boot) if len(ctrl) else None,
                    "matched_n": int(len(ctrl))})
    return out


def wilcoxon_within(d: pd.DataFrame, claimed: tuple[str, ...] = tuple(CLAIMED)) -> dict:
    from scipy.stats import wilcoxon

    c = d[d.group.isin(claimed)].groupby("taxon").gained.mean()
    u = d[d.group == "unclaimed"].groupby("taxon").gained.mean()
    both = pd.concat([c, u], axis=1, keys=["c", "u"]).dropna()
    if len(both) < 10 or (both.c - both.u).abs().sum() == 0:
        return {"n_taxa": int(len(both))}
    st = wilcoxon(both.c, both.u, alternative="greater")
    diff = both.c - both.u
    return {"n_taxa": int(len(both)), "mean_diff": float(diff.mean()),
            "share_taxa_claimed_higher": float((diff > 0).mean()),
            "share_taxa_claimed_lower": float((diff < 0).mean()),
            "statistic": float(st.statistic), "p_value": float(st.pvalue)}


def consistency(df: pd.DataFrame, published: pd.Series | None = None) -> dict:
    """Do the year windows partition the published counts?"""
    now = df.c_le2010 + df.c_gt2010
    out = {"n_pairs": int(len(df)), "n_pairs_with_papers_now": int((now > 0).sum()),
           "monotone_2005_2010_2015": bool(((df.c_le2005 <= df.c_le2010) & (df.c_le2010 <= df.c_le2015)
                                            & (df.c_le2015 <= now)).all())}
    if published is not None:
        out["share_equal_to_published_total"] = float((now == published).mean())
        out["sum_now"] = int(now.sum())
        out["sum_published"] = int(published.sum())
    return out


def one_cutoff(df: pd.DataFrame, cutoff: int, n_boot: int = 1000) -> dict:
    d = prepare(df, cutoff)
    return {
        "cutoff": cutoff,
        "risk_set": {"n_pairs": int(len(d)), "n_taxa": int(d.taxon.nunique()),
                     "by_group": d.group.value_counts().to_dict(), "n_gained": int(d.gained.sum())},
        "matched_shares": matched_shares(d, n_boot),
        "logit_fe": logit_fe(d),
        "logit_fe_plus_later_plant_volume": logit_fe(d, ("plant_after",)),
        "conditional_logit": conditional_logit(d),
        "wilcoxon_within_plant": wilcoxon_within(d),
        "wilcoxon_within_plant_persistent": wilcoxon_within(d, ("both",)),
    }


def _get(rows, term):
    return next((r for r in rows if r.get("term") == term or r.get("group") == term), None)


def run_all(df: pd.DataFrame, cutoffs=(2005, 2010, 2015), primary: int = 2010, n_boot: int = 1000) -> dict:
    by = {str(c): one_cutoff(df, c, n_boot) for c in cutoffs}
    p = by[str(primary)]
    both_or = _get(p["logit_fe"], "both")
    ms = _get(p["matched_shares"], "both")
    held = bool(both_or and both_or["ci"][0] > 1 and ms and ms["share_gained"] > (ms["matched_unclaimed_share"] or 0))
    null = bool(both_or and both_or["ci"][0] <= 1 <= both_or["ci"][1])
    verdict = ("HELD: among plant-indication pairs unstudied up to {c}, pairs both herbals claim were more likely "
               "to receive their first paper afterwards than unclaimed indications of the same plants."
               if held else
               "NULL: no detectable difference at {c} between claimed and unclaimed pairs in gaining a first paper."
               if null else
               "DID NOT HOLD: claimed pairs were not more likely to gain a first paper after {c}.").format(c=primary)
    head = {"cutoff": primary, "n_risk_pairs": p["risk_set"]["n_pairs"], "n_risk_taxa": p["risk_set"]["n_taxa"]}
    if both_or:
        head.update(OR_both=[round(both_or["odds_ratio"], 2), round(both_or["ci"][0], 2), round(both_or["ci"][1], 2)],
                    p_both=float(f'{both_or["p"]:.2g}'))
    for g in ("dsc_only", "cul_only"):
        r = _get(p["logit_fe"], g)
        if r:
            head[f"OR_{g}"] = [round(r["odds_ratio"], 2), round(r["ci"][0], 2), round(r["ci"][1], 2)]
    if ms:
        head.update(share_gained_both=round(ms["share_gained"], 3),
                    share_gained_matched_unclaimed=round(ms["matched_unclaimed_share"], 3),
                    n_both_at_risk=ms["n"])
    w = p["wilcoxon_within_plant"]
    if "p_value" in w:
        head["wilcoxon_p"] = float(f'{w["p_value"]:.2g}')
    head["OR_both_by_cutoff"] = {c: ([round(r["odds_ratio"], 2), round(r["ci"][0], 2), round(r["ci"][1], 2)]
                                     if (r := _get(by[c]["logit_fe"], "both")) else None) for c in by}
    return {
        "question": "Did the herbals predict later research? Among plant-indication pairs with no paper up to a "
                    "cutoff year, do claimed (especially persistent) pairs gain a first paper afterwards more often "
                    "than unclaimed indications of the same plants?",
        "design": {"field": "Europe PMC PUB_YEAR windows (verified to partition the counts)",
                   "risk_set": "0 co-mentioning papers up to the cutoff; plant itself has >= 1 paper up to the cutoff",
                   "outcome": ">= 1 co-mentioning paper published after the cutoff (to 2026-11-08)",
                   "primary_model": "logit, indication FE + log(1 + plant papers up to cutoff), cluster-robust by plant",
                   "secondary": ["+ log(1 + plant papers after cutoff)", "conditional logit, strata = plant",
                                 "matched shares (same plants)", "within-plant Wilcoxon (one-sided)"],
                   "cutoffs": list(cutoffs), "primary_cutoff": primary},
        "verdict": verdict, "status": "held" if held else ("null" if null else "did not hold"),
        "headline": head, "by_cutoff": by, "consistency": consistency(df, df.get("pair")),
        "caveats": [
            "Pseudo-prospective: the claims are ancient, but the controls and the indication vocabulary were "
            "chosen in 2026; co-mention measures attention, not efficacy.",
            "Later research may itself be motivated by the herbals (circularity is reduced, not removed).",
            "Pairs whose plant had no paper at all by the cutoff are excluded from the risk set.",
            "Counts are a 2026-11-08 snapshot; records indexed late can move between windows.",
        ],
    }


# --------------------------------------------------------------------------- outputs
def figure(res: dict, path) -> None:
    import matplotlib.pyplot as plt
    import matplotlib.ticker as mt

    from . import figures as F

    F._style()
    prim = res["design"]["primary_cutoff"]
    p = res["by_cutoff"][str(prim)]
    fig, axes = plt.subplots(1, 2, figsize=(10.4, 3.7), gridspec_kw={"width_ratios": [1.15, 1]})
    ax = axes[0]
    order = [g for g in ["unclaimed", "dsc_only", "cul_only", "both"] if _get(p["matched_shares"], g)]
    y = np.arange(len(order))[::-1]
    for yi, g in zip(y, order):
        r = _get(p["matched_shares"], g)
        lo, hi = r["ci"]
        ax.plot([lo, hi], [yi, yi], color=F.GROUP_COLOR[g], lw=2, solid_capstyle="round")
        ax.plot(r["share_gained"], yi, "o", ms=9, color=F.GROUP_COLOR[g], mec=F.SURFACE, mew=2)
        ax.text(hi, yi + 0.2, f"  {r['share_gained']:.0%}", fontsize=9.5, color=F.INK, va="bottom")
        mv = r.get("matched_unclaimed_share")
        if g != "unclaimed" and mv is not None:
            ax.plot(mv, yi - 0.28, "o", ms=7, mfc=F.SURFACE, mec=F.NEUTRAL, mew=1.8)
            ax.text(mv, yi - 0.28, f"  same plants, unclaimed: {mv:.0%}", fontsize=8.5, color=F.INK2, va="center")
    ax.set_yticks(y, [f"{F.GROUP_LABEL[g]}\n(n = {_get(p['matched_shares'], g)['n']:,})" for g in order])
    ax.set_ylim(-0.6, len(order) - 0.3)
    ax.xaxis.set_major_formatter(mt.PercentFormatter(1.0, decimals=0))
    ax.set_xlabel(f"Unstudied up to {prim}: share with ≥1 paper after {prim}")
    ax.grid(axis="x", color=F.GRID, lw=0.8)
    ax.set_axisbelow(True)

    ax = axes[1]
    cuts = list(res["by_cutoff"])
    rows = []
    for c in cuts:
        for g in ("dsc_only", "cul_only", "both"):
            r = _get(res["by_cutoff"][c]["logit_fe"], g)
            if r:
                rows.append((c, g, r))
    yy = np.arange(len(rows))[::-1]
    for yi, (c, g, r) in zip(yy, rows):
        col = F.GROUP_COLOR[g]
        ax.plot(r["ci"], [yi, yi], color=col, lw=2, solid_capstyle="round")
        ax.plot(r["odds_ratio"], yi, "s", ms=8, color=col, mec=F.SURFACE, mew=2)
        ax.text(r["ci"][1], yi, f"  {r['odds_ratio']:.2f}", va="center", fontsize=9, color=F.INK)
    ax.axvline(1, color=F.INK2, lw=0.9, ls=(0, (3, 3)))
    ax.set_xscale("log")
    ax.set_yticks(yy, [f"{c} · {F.GROUP_LABEL[g]}" for c, g, _ in rows], fontsize=8.5)
    lo = min(r["ci"][0] for *_, r in rows)
    hi = max(r["ci"][1] for *_, r in rows)
    ax.set_xlim(min(0.5, lo * 0.85), hi * 1.8)
    ticks = [t for t in (0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8) if min(0.5, lo * 0.85) <= t <= hi * 1.8]
    ax.xaxis.set_major_locator(mt.FixedLocator(ticks))
    ax.xaxis.set_major_formatter(mt.FuncFormatter(lambda v, _: f"{v:g}"))
    ax.xaxis.set_minor_formatter(mt.NullFormatter())
    ax.set_xlabel("Odds ratio of a first paper after the cutoff\n(logit, indication FE + plant volume at cutoff)")
    ax.grid(axis="x", color=F.GRID, lw=0.8, which="both")
    ax.set_axisbelow(True)
    fig.suptitle("Time machine: did the herbals predict which unstudied pairs science would look at next?",
                 x=0.01, ha="left", fontsize=12.5, fontweight="bold", color=F.INK)
    fig.tight_layout()
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)


def _f(r):
    return f'{r["odds_ratio"]:.2f} [{r["ci"][0]:.2f}–{r["ci"][1]:.2f}], p = {r["p"]:.2g}'


def markdown(res: dict) -> str:
    L = ["# P5 · Time-machine (pseudo-prospective) test", "",
         f"*Generated {res.get('generated', '')} · reproduce: `" + "` then `".join(res.get("reproduce", [])) + "`*", "",
         "**Question.** " + res["question"], "",
         f"**Verdict ({res['status']}).** " + res["verdict"], "",
         "**Design.** Risk set: " + res["design"]["risk_set"] + ". Outcome: " + res["design"]["outcome"]
         + ". Primary model: " + res["design"]["primary_model"] + ". Field: " + res["design"]["field"] + ".", "",
         "![time machine](fig_time_machine.png)", ""]
    for c, p in res["by_cutoff"].items():
        L += [f"## Cutoff {c}", "",
              f"Risk set: {p['risk_set']['n_pairs']:,} pairs on {p['risk_set']['n_taxa']} plants "
              f"({p['risk_set']['n_gained']:,} gained ≥ 1 paper after {c}); by group {p['risk_set']['by_group']}.", "",
              "| Group | n at risk | Gained a first paper | Same plants, unclaimed | Logit OR (primary) | + later plant volume | Conditional logit |",
              "|---|---|---|---|---|---|---|"]
        for g in GROUPS:
            m = _get(p["matched_shares"], g)
            if not m:
                continue
            lo, hi = m["ci"]
            mu = (f'{m["matched_unclaimed_share"]:.1%} (n = {m["matched_n"]:,})'
                  if m.get("matched_unclaimed_share") is not None else "–")
            r1, r2, r3 = (_get(p[k], g) for k in ("logit_fe", "logit_fe_plus_later_plant_volume", "conditional_logit"))
            L.append(f"| {g} | {m['n']:,} | {m['share_gained']:.1%} [{lo:.1%}–{hi:.1%}] | {mu} | "
                     f"{_f(r1) if r1 else 'ref.'} | {_f(r2) if r2 else 'ref.'} | {_f(r3) if r3 else 'ref.'} |")
        w, wp = p["wilcoxon_within_plant"], p["wilcoxon_within_plant_persistent"]
        L += ["", f"Within-plant Wilcoxon (claimed vs unclaimed share gaining, one-sided): "
              + (f"n = {w['n_taxa']} plants, mean difference {w['mean_diff']:+.3f}, p = {w['p_value']:.2g}"
                 if "p_value" in w else f"not computable (n = {w['n_taxa']})")
              + "; persistent only: "
              + (f"n = {wp['n_taxa']}, mean difference {wp['mean_diff']:+.3f}, p = {wp['p_value']:.2g}."
                 if "p_value" in wp else f"not computable (n = {wp['n_taxa']})."), ""]
    c = res["consistency"]
    L += ["## Consistency checks", "",
          f"Year windows are monotone (≤2005 ≤ ≤2010 ≤ ≤2015 ≤ now) for every pair: {c['monotone_2005_2010_2015']}. "
          + (f"Window sums equal the published (2026-11-08) count for {c['share_equal_to_published_total']:.1%} of pairs "
             f"(sum {c['sum_now']:,} vs {c['sum_published']:,})." if "share_equal_to_published_total" in c else ""),
          "", "## Caveats", ""] + [f"* {x}" for x in res["caveats"]] + [""]
    return "\n".join(L)
