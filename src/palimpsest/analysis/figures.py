"""Static figures for the README and the pitch deck.

Palette validated with the dataviz validator on the parchment surface
(#fbf8f2, all-pairs CVD ΔE ≥ 9.2): Dioscorides #eb6834, Culpeper #2a78d6,
persistent (both) #1baf7a, unclaimed = neutral grey.  The aqua slot is below
3:1 contrast, so every chart carries direct labels.
"""
from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from ..paths import FIGURES  # noqa: E402

SURFACE = "#fbf8f2"
INK = "#1d1b17"
INK2 = "#5b574f"
GRID = "#e6e1d6"
DSC = "#eb6834"
CUL = "#2a78d6"
BOTH = "#1baf7a"
NEUTRAL = "#9a978f"
GROUP_COLOR = {"unclaimed": NEUTRAL, "dsc_only": DSC, "cul_only": CUL, "both": BOTH}
GROUP_LABEL = {"unclaimed": "Not claimed (controls)", "dsc_only": "Dioscorides only",
               "cul_only": "Culpeper only", "both": "Both (persistent)"}


def _style():
    plt.rcParams.update({
        "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
        "font.family": "DejaVu Serif", "font.size": 10.5, "axes.edgecolor": GRID,
        "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
        "axes.spines.top": False, "axes.spines.right": False, "axes.grid": False,
        "axes.titleweight": "bold", "axes.titlesize": 12.5, "axes.titlecolor": INK,
        "axes.titlelocation": "left",
    })


def _save(fig, name):
    FIGURES.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIGURES / f"{name}.png", dpi=200, bbox_inches="tight")
    fig.savefig(FIGURES / f"{name}.svg", bbox_inches="tight")
    plt.close(fig)


def _ptxt(res: dict) -> str:
    n = res["n_perm"]
    if res["p_value"] <= 1.5 / (n + 1):
        return f"permutation p < {1 / n:g} ({n:,} permutations)"
    return f"permutation p = {res['p_value']:.2g}"


def transmission_null(res: dict):
    _style()
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    edges = np.array(res["null_hist"]["edges"])
    counts = np.array(res["null_hist"]["counts"])
    widths = np.diff(edges)
    ax.bar(edges[:-1], counts, width=widths * 0.88, align="edge", color=NEUTRAL, linewidth=0)
    obs = res["observed_overlap"]
    ax.axvline(obs, color=DSC, lw=2)
    ax.text(obs, counts.max() * 0.95, f"  observed: {obs} shared claims\n  {res['fold_enrichment']:.1f}× the "
            f"chance level\n  {_ptxt(res)}", color=INK, va="top", fontsize=10)
    ax.text(res["null_mean"], counts.max() * 1.04, f"chance: {res['null_mean']:.0f}", color=INK2,
            ha="center", fontsize=9.5)
    ax.set_xlim(min(edges[0], obs) - 5, max(edges[-1], obs) * 1.35)
    ax.set_ylim(0, counts.max() * 1.12)
    ax.set_yticks([])
    ax.spines["left"].set_visible(False)
    ax.set_xlabel("Plant–indication pairs claimed by both Dioscorides and Culpeper")
    ax.set_title(f"Culpeper repeats Dioscorides far more than chance ({res['n_shared_taxa']} shared plants)")
    _save(fig, "fig1_transmission")


def evidence_by_group(groups: list[dict]):
    _style()
    order = [g for g in ["unclaimed", "dsc_only", "cul_only", "both"] if any(x["group"] == g for x in groups)]
    by = {g["group"]: g for g in groups}
    fig, axes = plt.subplots(1, 2, figsize=(9.6, 3.4), sharey=True)
    y = np.arange(len(order))[::-1]
    for ax, key, ci_key, xlabel, fmt in (
        (axes[0], "share_any_paper", "share_any_paper_ci", "Pairs with ≥1 co-mentioning paper", "{:.0%}"),
        (axes[1], "mean_log2_lift", "mean_log2_lift_ci", "Mean log₂ lift over expectation", "{:+.2f}"),
    ):
        for yi, g in zip(y, order):
            v, (lo, hi) = by[g][key], by[g][ci_key]
            ax.plot([lo, hi], [yi, yi], color=GROUP_COLOR[g], lw=2, solid_capstyle="round")
            ax.plot(v, yi, "o", ms=9, color=GROUP_COLOR[g], mec=SURFACE, mew=2)
            ax.text(hi, yi + 0.22, "  " + fmt.format(v), color=INK, fontsize=9.5, va="bottom")
            mv = by[g].get("matched_unclaimed_share")
            if key == "share_any_paper" and g != "unclaimed" and mv is not None:
                ax.plot(mv, yi - 0.28, "o", ms=7, mfc=SURFACE, mec=NEUTRAL, mew=1.8)
                ax.text(mv, yi - 0.28, f"  same plants, unclaimed: {mv:.0%}", color=INK2,
                        fontsize=8.5, va="center")
        ax.set_xlabel(xlabel)
        ax.grid(axis="x", color=GRID, lw=0.8)
        ax.set_axisbelow(True)
        if key == "mean_log2_lift":
            ax.axvline(0, color=INK2, lw=0.8)
    axes[0].set_yticks(y, [f"{GROUP_LABEL[g]}\n(n = {by[g]['n_pairs']:,})" for g in order])
    axes[0].set_ylim(-0.6, len(order) - 0.3)
    fig.suptitle("Claimed indications are more often studied at all (same plants; 95% cluster-bootstrap CI)",
                 x=0.01, ha="left", fontsize=12.5, fontweight="bold", color=INK)
    fig.tight_layout()
    _save(fig, "fig2_evidence_by_group")


def forest(rows: list[dict], key: str, title: str, name: str, xlabel: str):
    _style()
    rows = [r for r in rows if r["term"] in GROUP_LABEL]
    fig, ax = plt.subplots(figsize=(7.2, 0.62 * len(rows) + 1.3))
    y = np.arange(len(rows))[::-1]
    for yi, r in zip(y, rows):
        c = GROUP_COLOR.get(r["term"], INK)
        ax.plot(r["ci"], [yi, yi], color=c, lw=2, solid_capstyle="round")
        ax.plot(r[key], yi, "s", ms=9, color=c, mec=SURFACE, mew=2)
        ax.text(r["ci"][1], yi, f"  {r[key]:.2f} [{r['ci'][0]:.2f}–{r['ci'][1]:.2f}]", va="center",
                fontsize=9.5, color=INK)
    ax.axvline(1, color=INK2, lw=0.9, ls=(0, (3, 3)))
    ax.set_xscale("log")
    ax.set_yticks(y, [GROUP_LABEL[r["term"]] for r in rows])
    ax.set_xlabel(xlabel)
    ax.grid(axis="x", color=GRID, lw=0.8, which="both")
    ax.set_axisbelow(True)
    lo = min(r["ci"][0] for r in rows)
    hi = max(r["ci"][1] for r in rows)
    ax.set_xlim(min(0.8, lo * 0.85), hi * 2.2)
    ticks = [t for t in (0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8) if min(0.8, lo * 0.85) <= t <= hi * 2.2]
    ax.xaxis.set_major_locator(matplotlib.ticker.FixedLocator(ticks))
    ax.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:g}"))
    ax.xaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
    ax.set_title(title)
    _save(fig, name)


def categories(cat_counts):
    """cat_counts: DataFrame with columns category, dioscorides, culpeper (shares)."""
    _style()
    d = cat_counts.sort_values("dioscorides")
    fig, ax = plt.subplots(figsize=(7.2, 0.34 * len(d) + 1.2))
    y = np.arange(len(d))
    for yi, (_, r) in zip(y, d.iterrows()):
        ax.plot([r.dioscorides, r.culpeper], [yi, yi], color=GRID, lw=3, zorder=1)
        ax.plot(r.dioscorides, yi, "o", ms=8, color=DSC, mec=SURFACE, mew=1.5, zorder=2)
        ax.plot(r.culpeper, yi, "o", ms=8, color=CUL, mec=SURFACE, mew=1.5, zorder=2)
    ax.set_yticks(y, d.category)
    ax.xaxis.set_major_locator(matplotlib.ticker.MultipleLocator(0.03))
    ax.xaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0, decimals=0))
    ax.grid(axis="x", color=GRID, lw=0.8)
    ax.set_axisbelow(True)
    ax.plot([], [], "o", color=DSC, label="Dioscorides (c. 60 CE)")
    ax.plot([], [], "o", color=CUL, label="Culpeper (1653)")
    ax.legend(frameon=False, loc="lower right")
    ax.set_xlabel("Share of each author's plant claims")
    ax.set_title("What the two herbals treat, by therapeutic area")
    _save(fig, "fig4_categories")
