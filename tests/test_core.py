"""Offline tests for normalisation, extraction and the permutation test."""
from __future__ import annotations

import re

import numpy as np
import pandas as pd

from palimpsest.analysis.modern import add_metrics
from palimpsest.analysis.persistence import transmission_test
from palimpsest.extract import Term, extract_monograph
from palimpsest.textnorm import normalize_english, normalize_greek, sentence_spans


def test_normalize_greek_is_length_preserving_and_strips_accents():
    s = "ἰκτερικοὺς θεραπεύει, ἄγει δὲ καὶ ἔμμηνα·"
    n = normalize_greek(s)
    assert len(n) == len(s)
    assert "ικτερικουσ" in n  # final sigma folded, accents gone
    assert "εμμηνα" in n


def test_normalize_english_lowercases_and_straightens_quotes():
    s = "It helps the King’s Evil"
    n = normalize_english(s)
    assert n == "it helps the king's evil" and len(n) == len(s)


def test_sentence_spans_split_on_greek_raised_dot():
    spans = sentence_spans("α β· γ δ. ε")
    assert len(spans) == 3


def _terms(lang):
    if lang == "grc":
        return [Term("jaundice", re.compile(r"(?<![α-ω])ικτερ"), "therapeutic", "ικτερ"),
                Term("amenorrhea", re.compile(r"εμμην\w*"), "action", "εμμην")]
    return [Term("dysentery", re.compile(r"\bbloody flux\b"), "therapeutic", "bloody flux"),
            Term("diarrhea", re.compile(r"\bflux\b"), "therapeutic", "flux"),
            Term("dyspepsia", re.compile(r"\bstomach\b"), "therapeutic", "stomach")]


def test_extract_projects_spans_back_onto_original_greek():
    text = "ἀψίνθιον· ἰκτερικοὺς θεραπεύει καὶ ἔμμηνα ἄγει."
    m = {"id": "dsc:x", "source": "dioscorides", "lang": "grc", "analysis_text": text}
    out = extract_monograph(m, _terms("grc"))
    got = {o["concept_id"]: o for o in out}
    assert text[got["jaundice"]["start"]:got["jaundice"]["end"]].startswith("ἰκτερ")
    assert got["amenorrhea"]["polarity"] == "action"


def test_longest_match_wins_and_negation():
    text = "It stays the bloody flux; but it is hurtful to the stomach."
    m = {"id": "cul:x", "source": "culpeper", "lang": "en", "analysis_text": text}
    out = extract_monograph(m, _terms("en"))
    concepts = [o["concept_id"] for o in out]
    assert "dysentery" in concepts and "diarrhea" not in concepts
    stomach = [o for o in out if o["concept_id"] == "dyspepsia"][0]
    assert stomach["polarity"] == "negated"


def _tc(pairs_dsc, pairs_cul):
    rows = {}
    for t, c in pairs_dsc:
        rows.setdefault((t, c), {"taxon": t, "concept_id": c, "dsc": False, "cul": False})["dsc"] = True
    for t, c in pairs_cul:
        rows.setdefault((t, c), {"taxon": t, "concept_id": c, "dsc": False, "cul": False})["cul"] = True
    return pd.DataFrame(rows.values())


def test_transmission_detects_copying_and_not_noise():
    rng = np.random.default_rng(0)
    concepts = [f"c{i}" for i in range(30)]
    taxa = [f"t{i}" for i in range(60)]
    dsc = [(t, c) for t in taxa for c in rng.choice(concepts, 5, replace=False)]
    copied = _tc(dsc, dsc)  # Culpeper copies Dioscorides exactly
    res = transmission_test(copied, n_perm=500)
    assert res["fold_enrichment"] > 3 and res["p_value"] < 0.01
    cul = [(t, c) for t in taxa for c in rng.choice(concepts, 5, replace=False)]
    noise = transmission_test(_tc(dsc, cul), n_perm=500)
    assert 0.6 < noise["fold_enrichment"] < 1.5 and noise["p_value"] > 0.01


def test_lift_is_one_under_independence():
    p = pd.DataFrame({"taxon": ["a"], "concept_id": ["x"], "pair": [10],
                      "taxon_total": [100], "concept_total": [1000]})
    out = add_metrics(p, N=10000)
    assert abs(out.lift.iloc[0] - 1.0) < 1e-9 and out.tier.iloc[0] == "studied"


def test_control_sampling_is_deterministic_and_excludes_claims():
    from palimpsest.evidence import plan_pairs

    tc = pd.DataFrame({"taxon": ["A a", "A a", "B b"], "concept_id": ["c1", "c2", "c3"]})
    concepts = [f"c{i}" for i in range(1, 30)]
    p1, p2 = plan_pairs(tc, concepts, k=5), plan_pairs(tc, concepts, k=5)
    assert p1 == p2
    a = [c for t, c in p1 if t == "A a"]
    assert a[:2] == ["c1", "c2"] and len(a) == 7 and len(set(a)) == 7
