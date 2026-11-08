"""P4 - uncertainty-weighted lead ranking (offline).

Usage (repo root, PYTHONPATH=src)::

    python scripts/uncertainty_leads.py

Writes results/extensions/uncertainty_leads.{json,md},
data/processed/extensions/leads_uncertainty_all.csv and
web/public/data/extra/uncertainty_leads.json. results/tables/leads.csv is read only.
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from palimpsest.analysis import uncertainty_leads as U  # noqa: E402
from palimpsest.paths import PROCESSED, RESULTS, TABLES, WEB_DATA  # noqa: E402

OUT, OUTP, WEB = RESULTS / "extensions", PROCESSED / "extensions", WEB_DATA / "extra"


def main() -> None:
    for d in (OUT, OUTP, WEB):
        d.mkdir(parents=True, exist_ok=True)
    la = pd.read_csv(TABLES / "leads_all.csv")
    pub = pd.read_csv(TABLES / "leads.csv")
    tc = pd.read_csv(PROCESSED / "taxon_claims.csv")
    mt = pd.read_csv(PROCESSED / "monograph_taxa.csv", dtype=str, keep_default_na=False)
    m = U.certainty(la, tc, mt)
    prim = U.compare(pub, m, "weighted_score")
    strict = U.compare(pub, m, "weighted_score_product")
    m.assign(new_full_rank_min=m.weighted_score.rank(ascending=False, method="first").astype(int)).to_csv(
        OUTP / "leads_uncertainty_all.csv", index=False)

    lab = dict(zip(la.concept_id, la.label))

    def name(k):
        return f"{k[0]} – {lab.get(k[1], k[1])}"

    cert_dist = m.certainty.value_counts().sort_index(ascending=False).to_dict()
    p60 = m[[(t, c) in prim["published_rank_of"] for t, c in zip(m.taxon, m.concept_id)]]
    leads = []
    for r in pub.itertuples():
        k = (r.taxon, r.concept_id)
        row = m[(m.taxon == r.taxon) & (m.concept_id == r.concept_id)].iloc[0]
        leads.append({"rank_published": int(r.rank), "taxon": r.taxon, "concept_id": r.concept_id,
                      "label": r.label, "score": float(r.score), "certainty": float(row.certainty),
                      "confidence_dsc": row.conf_dsc, "confidence_cul": row.conf_cul,
                      "anchor_dsc": row.anchor_dsc, "anchor_cul": row.anchor_cul,
                      "weighted_score": float(row.weighted_score),
                      "rank_weighted": prim["new_rank_of"].get(k),
                      "rank_weighted_strict": strict["new_rank_of"].get(k),
                      "full_rank_weighted": int(prim["new_top"].set_index(["taxon", "concept_id"]).full_rank.get(k))
                      if k in prim["new_rank_of"] else None})
    entered = []
    nt = prim["new_top"].set_index(["taxon", "concept_id"])
    for k in prim["entered_top60"]:
        r = nt.loc[k]
        entered.append({"rank_weighted": int(r["rank"]), "taxon": k[0], "concept_id": k[1], "label": lab.get(k[1]),
                        "score": float(r.score), "certainty": float(r.certainty),
                        "weighted_score": float(r.weighted_score)})
    res = {
        "question": "Does the lead ranking survive when identification doubt is propagated into the score?",
        "weights": {**U.WEIGHTS, "genus_only_cap": U.GENUS_ONLY,
                    "per_source": "best-identified supporting plant monograph",
                    "lead": "min(Dioscorides, Culpeper) (primary); product (strict sensitivity)"},
        "certainty_distribution_all_candidates": {str(k): int(v) for k, v in cert_dist.items()},
        "certainty_distribution_top60": {str(k): int(v) for k, v in
                                         p60.certainty.value_counts().sort_index(ascending=False).items()},
        "n_candidates": int(len(m)),
        "primary": {k: prim[k] for k in ("tau_all_candidates", "tau_published_top60", "n_top60_kept")},
        "strict_product": {k: strict[k] for k in ("tau_all_candidates", "tau_published_top60", "n_top60_kept")},
        "left_top60": [{"taxon": k[0], "concept_id": k[1], "label": lab.get(k[1]),
                        "rank_published": prim["published_rank_of"][k],
                        "certainty": float(m[(m.taxon == k[0]) & (m.concept_id == k[1])].certainty.iloc[0])}
                       for k in prim["left_top60"]],
        "entered_top60": entered,
        "top10_published": [name(k) for k in prim["top10_published"]],
        "top10_weighted": [name(k) for k in prim["top10_weighted"]],
        "leads": leads,
        "reproduce": "PYTHONPATH=src python scripts/uncertainty_leads.py",
        "generated": date.today().isoformat(),
    }
    (OUT / "uncertainty_leads.json").write_text(json.dumps(res, indent=2, ensure_ascii=False, default=str),
                                                encoding="utf-8")
    (WEB / "uncertainty_leads.json").write_text(json.dumps(res, indent=1, ensure_ascii=False, default=str),
                                                encoding="utf-8")
    t, t60 = prim["tau_all_candidates"], prim["tau_published_top60"]
    md = ["# P4 · Uncertainty-weighted leads", "", f"*Generated {res['generated']} · reproduce: `{res['reproduce']}`*", "",
          "Identification confidence is propagated into the lead score: weights high 1.0, medium 0.6, low 0.3, "
          "genus-only cap 0.5; per herbal the best-identified supporting plant chapter counts; lead certainty = "
          "min(Dioscorides, Culpeper); weighted score = score × certainty; same diversification (≤ 2 per plant, "
          "≤ 4 per indication, top 60).", "",
          f"* Certainty of the {len(m)} candidates: {res['certainty_distribution_all_candidates']}; "
          f"of the published top 60: {res['certainty_distribution_top60']}.",
          f"* Kendall τ-b, full ranking of {t['n']} candidates: **{t['tau_b']:.2f}** (p = {t['p']:.1g}); "
          f"published top 60 (their positions in the full ranking): **{t60['tau_b']:.2f}** (p = {t60['p']:.1g}).",
          f"* {prim['n_top60_kept']} of 60 leads stay in the top 60 (strict product weighting: "
          f"{strict['n_top60_kept']}; τ-b {strict['tau_all_candidates']['tau_b']:.2f}).", "",
          "## Leaving the top 60", "", "| Published rank | Lead | Certainty |", "|---|---|---|"]
    md += [f"| {x['rank_published']} | *{x['taxon']}* – {x['label']} | {x['certainty']} |" for x in res["left_top60"]]
    md += ["", "Leads with certainty 1.0 that leave the list do so only through the diversification caps "
           "(≤ 2 per plant, ≤ 4 per indication), displaced by fully certain leads moving up."]
    md += ["", "## Entering the top 60", "", "| Weighted rank | Lead | Score | Certainty |", "|---|---|---|---|"]
    md += [f"| {x['rank_weighted']} | *{x['taxon']}* – {x['label']} | {x['score']:.3f} | {x['certainty']} |"
           for x in entered]
    md += ["", "## Published top 10 under weighting", "", "| Published | Lead | Certainty (D / C) | Weighted rank |",
           "|---|---|---|---|"]
    md += [f"| {x['rank_published']} | *{x['taxon']}* – {x['label']} | {x['certainty']} ({x['confidence_dsc']} / "
           f"{x['confidence_cul']}) | {x['rank_weighted'] or 'out'} |" for x in leads[:10]]
    md += ["", "Weights are an a-priori heuristic, not fitted; the published ranking (`results/tables/leads.csv`) is "
           "unchanged and is shown as 'rank if certainty ignored'.", ""]
    (OUT / "uncertainty_leads.md").write_text("\n".join(md), encoding="utf-8")
    print("tau all", round(t["tau_b"], 3), "tau top60", round(t60["tau_b"], 3), "kept", prim["n_top60_kept"],
          "| strict kept", strict["n_top60_kept"])


if __name__ == "__main__":
    main()
