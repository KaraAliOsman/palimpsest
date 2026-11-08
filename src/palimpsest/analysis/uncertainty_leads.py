"""P4 - propagate identification uncertainty into the lead ranking.

Each lead is a persistent pair: the same accepted species carries the claim in
a Dioscorides chapter *and* a Culpeper monograph. Each supporting monograph has
a curated identification confidence. Weights (fixed a priori):

    high 1.0 · medium 0.6 · low 0.3 · identification only to genus (or coarser) 0.5 (cap)

* per source, the weight is that of the **best-identified** supporting plant
  monograph (one confident chapter suffices to anchor the claim);
* the lead's certainty is the **weakest link**: min(Dioscorides, Culpeper)
  (primary); the product of the two is reported as a stricter sensitivity;
* ``weighted score = score x certainty``; the ranking is re-diversified with the
  published rules (<= 2 leads per plant, <= 4 per indication, top 60).

Agreement with the published ranking: Kendall tau-b over all candidates and over
the published top 60, plus the leads that enter / leave the top 60.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .leads import diversify

WEIGHTS = {"high": 1.0, "medium": 0.6, "low": 0.3}
GENUS_ONLY = 0.5


def monograph_weight(confidence: str, rank: str) -> float:
    w = WEIGHTS.get(str(confidence).strip().lower(), WEIGHTS["low"])
    if str(rank).strip().lower() != "species":
        w = min(w, GENUS_ONLY)
    return w


def source_weight(ids: str, info: dict[str, tuple[str, str, str]]) -> tuple[float, str]:
    """Best weight among the supporting *plant* monographs listed in ``ids``."""
    best, best_id = 0.0, ""
    for mid in [x for x in str(ids).split(";") if x and x != "nan"]:
        conf, rank, kind = info.get(mid, ("low", "species", "plant"))
        if kind != "plant":
            continue
        w = monograph_weight(conf, rank)
        if w > best:
            best, best_id = w, mid
    return best, best_id


def certainty(leads_all: pd.DataFrame, tc: pd.DataFrame, mt: pd.DataFrame) -> pd.DataFrame:
    info = {r.monograph_id: (r.confidence, r.rank, r.kind) for r in mt.itertuples()}
    m = leads_all.merge(tc[["taxon", "concept_id", "dsc_monographs", "cul_monographs"]],
                        on=["taxon", "concept_id"], how="left")
    dw = [source_weight(x, info) for x in m.dsc_monographs]
    cw = [source_weight(x, info) for x in m.cul_monographs]
    m["w_dsc"] = [w for w, _ in dw]
    m["w_cul"] = [w for w, _ in cw]
    m["anchor_dsc"] = [i for _, i in dw]
    m["anchor_cul"] = [i for _, i in cw]
    m["conf_dsc"] = [info.get(i, ("", "", ""))[0] for i in m.anchor_dsc]
    m["conf_cul"] = [info.get(i, ("", "", ""))[0] for i in m.anchor_cul]
    m["certainty"] = np.minimum(m.w_dsc, m.w_cul)
    m["certainty_product"] = m.w_dsc * m.w_cul
    m["weighted_score"] = (m.score * m.certainty).round(4)
    m["weighted_score_product"] = (m.score * m.certainty_product).round(4)
    return m


def rerank(m: pd.DataFrame, col: str, top: int = 60) -> tuple[pd.DataFrame, pd.DataFrame]:
    s = m.sort_values([col, "score", "expected"], ascending=[False, False, False]).reset_index(drop=True)
    s["full_rank"] = np.arange(1, len(s) + 1)
    return diversify(s, top=top), s


def kendall(a, b) -> dict:
    from scipy.stats import kendalltau

    t = kendalltau(a, b)
    return {"tau_b": float(t.statistic), "p": float(t.pvalue), "n": int(len(a))}


def compare(published: pd.DataFrame, m: pd.DataFrame, col: str = "weighted_score") -> dict:
    """published: leads.csv (rank); m: certainty() output (same rows as leads_all)."""
    m = m.copy()
    m["published_full_rank"] = m.score.rank(ascending=False, method="first").astype(int)
    new_top, s = rerank(m, col)
    key = lambda d: list(zip(d.taxon, d.concept_id))  # noqa: E731
    full_new = dict(zip(key(s), s.full_rank))
    m["new_full_rank"] = [full_new[k] for k in key(m)]
    pub = dict(zip(key(published), published["rank"]))
    new = dict(zip(key(new_top), new_top["rank"]))
    pub_keys = set(pub)
    new_keys = set(new)
    p60 = m[[k in pub_keys for k in key(m)]]
    return {
        "tau_all_candidates": kendall(m.published_full_rank, m.new_full_rank),
        "tau_published_top60": kendall(p60.published_full_rank, p60.new_full_rank),
        "n_top60_kept": len(pub_keys & new_keys),
        "left_top60": sorted(pub_keys - new_keys, key=lambda k: pub[k]),
        "entered_top60": sorted(new_keys - pub_keys, key=lambda k: new[k]),
        "top10_published": [k for k, _ in sorted(pub.items(), key=lambda kv: kv[1])[:10]],
        "top10_weighted": [k for k, _ in sorted(new.items(), key=lambda kv: kv[1])[:10]],
        "new_rank_of": new, "published_rank_of": pub,
        "new_top": new_top,
    }
