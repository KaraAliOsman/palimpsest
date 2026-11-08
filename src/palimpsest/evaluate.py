"""Extractor evaluation against the blind reference annotation.

Unit of evaluation: the (monograph, concept) pair, as in the downstream
analysis.  Two settings are reported:

* ``any``      - concept match regardless of polarity;
* ``positive`` - therapeutic/action claims only (adverse excluded on both
  sides), which is what the persistence and evidence analyses consume.

95 % confidence intervals come from a non-parametric bootstrap over
monographs (2,000 resamples), because errors cluster within monographs.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from .paths import ANNOTATIONS, PROCESSED, RESULTS, TABLES

SOURCES = {"dioscorides": "reference_dioscorides.csv", "culpeper": "reference_culpeper.csv"}


def _prf(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    p = tp / (tp + fp) if tp + fp else float("nan")
    r = tp / (tp + fn) if tp + fn else float("nan")
    f = 2 * p * r / (p + r) if p == p and r == r and (p + r) else float("nan")
    return p, r, f


def evaluate(n_boot: int = 2000, seed: int = 7) -> dict:
    claims = pd.read_csv(PROCESSED / "claims.csv")
    results: dict = {}
    per_concept_rows = []
    for source, fname in SOURCES.items():
        path = ANNOTATIONS / fname
        if not path.exists():
            continue
        ref = pd.read_csv(path)
        ref = ref[ref.concept_id.notna()]
        sample = [l.strip() for l in (ANNOTATIONS / f"sample_{source}.txt").read_text().split() if l.strip()]
        # monographs whose virtues are inherited from a sibling entry were annotated
        # on an empty text; exclude them so both sides judge the same input
        from .corpora import load_monographs
        inherited = {m["id"] for m in load_monographs() if m.get("virtues_from")}
        sample = [m for m in sample if m not in inherited]
        ref = ref[ref.monograph_id.isin(sample)]
        sys_ = claims[claims.monograph_id.isin(sample)]
        out = {}
        for setting, pols in (("any", None), ("positive", ("therapeutic", "action"))):
            r = ref[ref.concept_id != "NONE"]
            s = sys_[sys_.polarity != "negated"]
            if pols:
                r = r[r.polarity.isin(pols)]
                s = s[s.polarity.isin(pols)]
            gold = {m: set(g.concept_id) for m, g in r.groupby("monograph_id")}
            pred = {m: set(g.concept_id) for m, g in s.groupby("monograph_id")}

            def counts(ids):
                tp = fp = fn = 0
                for m in ids:
                    gs, ps = gold.get(m, set()), pred.get(m, set())
                    tp += len(gs & ps)
                    fp += len(ps - gs)
                    fn += len(gs - ps)
                return tp, fp, fn

            tp, fp, fn = counts(sample)
            p, rec, f = _prf(tp, fp, fn)
            rng = np.random.default_rng(seed)
            boots = []
            for _ in range(n_boot):
                ids = rng.choice(sample, size=len(sample), replace=True)
                boots.append(_prf(*counts(ids)))
            b = np.array(boots, dtype=float)
            ci = lambda k: [float(np.nanpercentile(b[:, k], 2.5)), float(np.nanpercentile(b[:, k], 97.5))]
            out[setting] = {
                "n_monographs": len(sample), "tp": tp, "fp": fp, "fn": fn,
                "precision": p, "recall": rec, "f1": f,
                "precision_ci": ci(0), "recall_ci": ci(1), "f1_ci": ci(2),
            }
            if setting == "positive":
                for cid in sorted(set(r.concept_id) | set(s.concept_id)):
                    g_ = {m for m, cs in gold.items() if cid in cs}
                    p_ = {m for m, cs in pred.items() if cid in cs}
                    per_concept_rows.append({
                        "source": source, "concept_id": cid, "tp": len(g_ & p_),
                        "fp": len(p_ - g_), "fn": len(g_ - p_)})
        results[source] = out
    TABLES.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(per_concept_rows).to_csv(TABLES / "extraction_errors_by_concept.csv", index=False)
    (RESULTS / "extraction_eval.json").write_text(json.dumps(results, indent=2))
    return results
