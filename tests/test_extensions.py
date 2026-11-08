"""Offline tests for the extension analyses (P1 expert benchmark, P5 time machine,
P4 uncertainty-weighted leads, P10 mechanism paths, P7 ledger)."""
from __future__ import annotations

import json
import math

import numpy as np
import pandas as pd
import pytest

from palimpsest.analysis import expert_benchmark as E
from palimpsest.analysis import ledger as LG
from palimpsest.analysis import mechanism as M
from palimpsest.analysis import time_machine as T
from palimpsest.analysis import uncertainty_leads as U
from palimpsest.sources import europepmc_years as Y
from palimpsest.sources import graphql, http, pubchem
from palimpsest.sources import lardos as L


# ----------------------------------------------------------------- P1 parsing
T2_XML = """<table-wrap id="T2"><table><thead><tr><th>Lemma tag</th></tr></thead><tbody>
<tr><td rowspan="1" colspan="1">JCLP_001</td><td>x</td><td>δρακοντία: μεγάλη</td><td>3</td>
<td><italic>Dracunculus vulgaris</italic></td><td><italic>Arum italicum</italic> Mill. (2)</td><td/><td/></tr>
<tr><td/><td/><td/><td/><td>Schott (2)</td><td><italic>Arum dioscoridis</italic> Sm. (3)</td><td/><td/></tr>
<tr><td>JCLP_002</td><td>y</td><td>ἶρις</td><td>2</td><td/><td/>
<td><italic>Iris</italic> × <italic>germanica</italic> L. (3)<italic>Papaver</italic> L. (0)</td><td/></tr>
</tbody></table></table-wrap>"""


def test_lardos_table2_continuation_rows_and_candidates():
    rows = L.parse_table2(T2_XML)
    assert [r["lemma_tag"] for r in rows] == ["JCLP_001", "JCLP_002"]
    c1 = {c["name"]: (c["tier"], c["score"]) for c in rows[0]["candidates"]}
    # 'Schott (2)' sits on a continuation row and must attach to Dracunculus
    assert c1["Dracunculus vulgaris"] == ("strong", 2)
    assert c1["Arum dioscoridis"] == ("moderate", 3)
    c2 = rows[1]["candidates"]
    assert c2[0]["name"] == "Iris germanica" and "×" in c2[0]["name_full"] and c2[0]["score"] == 3
    assert c2[1]["name"] == "Papaver"  # genus-only candidate


def test_rowspan_expansion():
    xml = ('<table-wrap id="T9"><table><tbody><tr><td rowspan="2">A</td><td>1</td></tr>'
           '<tr><td>2</td></tr></tbody></table></table-wrap>')
    rows = L.table_rows(L.tables(xml)["T9"])
    assert [[L.text_of(c) for c in r] for r in rows] == [["A", "1"], ["A", "2"]]


def test_parse_chapters_and_accent_stripping():
    assert L.parse_chapters("V, 2; IV, 181") == ["5.2", "4.181"]
    assert L.parse_chapters("II,169") == ["2.169"]
    assert L.strip_accents("Ἀριστολοχεία") == "αριστολοχεια"
    assert L.strip_accents("σκόροδος") == "σκοροδοσ"


def test_best_candidates_tier_then_medicinal_tiebreak():
    c = [{"name": "A a", "tier": "moderate", "score": 3}, {"name": "B b", "tier": "strong", "score": 0},
         {"name": "C c", "tier": "strong", "score": 2}, {"name": "D d", "tier": "strong", "score": 2}]
    tier, top1 = L.best_candidates(c)
    assert {x["name"] for x in tier} == {"B b", "C c", "D d"}
    assert {x["name"] for x in top1} == {"C c", "D d"}
    assert L.best_candidates([]) == ([], [])


def test_wilson_interval_known_values():
    lo, hi = E.wilson(38, 54)
    assert lo == pytest.approx(0.572, abs=1e-3) and hi == pytest.approx(0.809, abs=1e-3)
    assert E.wilson(0, 10)[0] == 0.0 and E.wilson(10, 10)[1] == pytest.approx(1.0)
    assert all(math.isnan(x) for x in E.wilson(0, 0))


def test_assign_chapters_by_kind_order():
    t1 = [{"lemma_tag": "J1", "dmm_type": "κρητικός άγριος", "chapters": ["3.72", "3.52"]},
          {"lemma_tag": "J2", "dmm_type": "–", "chapters": ["5.2", "4.181"]}]
    t2 = [{"lemma_tag": "J1", "dmm_name": "σταφυλίνος: άγριος", "candidates": []},
          {"lemma_tag": "J1", "dmm_name": "δαῦκος: Κρητικός", "candidates": []},
          {"lemma_tag": "J2", "dmm_name": "ἄμπελος ἀγρία", "candidates": []}]
    out = E.assign_chapters(t1, t2)
    assert out[0]["chapters"] == ["3.52"] and out[1]["chapters"] == ["3.72"]
    assert out[2]["chapters"] == ["5.2", "4.181"]


def _ours(name, rank="species", alts=""):
    return {"scientific_name": name, "taxon": name, "taxon_rank": rank, "genus": name.split()[0],
            "alternatives": alts}


def test_score_unit_species_genus_and_synonyms():
    gold = [{"candidates": [{"name": "Delphinium staphisagria", "name_full": "Delphinium staphisagria",
                             "tier": "weak", "score": 1}]}]
    res = {"Delphinium staphisagria": {"accepted": "Staphisagria macrosperma", "genus": "Staphisagria"}}
    s = E.score_unit(_ours("Staphisagria macrosperma"), gold, res)
    assert s["species_top1"] and s["genus_top1"]
    s = E.score_unit(_ours("Staphisagria", rank="genus"), gold, res)
    assert not s["species_top1"] and s["genus_top1"]  # genus-rank IDs never count at species level
    s = E.score_unit(_ours("Aconitum napellus", alts="Delphinium staphisagria"), gold, res)
    assert not s["species_top1"] and s["top1_in_our_id_or_alternatives"]


def test_lemma_match_tolerates_spelling_variants():
    assert E.lemma_match("ἄλυσσον", ["ἄλλυσσον"])
    assert E.lemma_match("κέστρον τὸ καλούμενον", ["βεττονίκη, in κέστρον"])
    assert not E.lemma_match("ἄρον τὸ καλούμενον", ["δρακοντία: μικρά"])


def test_staples_check_with_fake_resolver():
    mt = pd.DataFrame([{"monograph_id": m, "source": "dioscorides", "headword": lemma,
                        "scientific_name": acc[0], "taxon": acc[0], "genus": acc[0].split()[0],
                        "confidence": "high"} for _, m, lemma, acc, _ in E.STAPLES])
    out = E.staples_check(mt, resolve=lambda names: {n: {"accepted": n} for n in names})
    assert len(out) == 30 and all(o["correct"] for o in out)
    mt.loc[mt.monograph_id == "dsc:2.86", ["taxon", "scientific_name"]] = "Triticum aestivum"
    out = E.staples_check(mt, resolve=lambda names: {n: {"accepted": n} for n in names})
    assert [o["plant"] for o in out if not o["correct"]] == ["barley"]


# ----------------------------------------------------------------- P5
def test_year_clauses():
    assert Y.year_clause(None, 2010) == "PUB_YEAR:[1000 TO 2010]"
    assert Y.year_clause(2011, None) == "PUB_YEAR:[2011 TO 2100]"
    assert Y.year_clause(2005, 2005, "FIRST_PDATE") == "FIRST_PDATE:[2005-01-01 TO 2005-12-31]"
    assert Y.windowed("(A)", None, 2010).startswith("((A)) AND PUB_YEAR")
    with pytest.raises(ValueError):
        Y.year_clause(2011, 2010)
    with pytest.raises(ValueError):
        Y.year_clause(None, 2010, "FOOBAR")


def _sim(n_taxa=600, or_both=2.5, or_claim=1.5, seed=3):
    rng = np.random.default_rng(seed)
    rows = []
    for t in range(n_taxa):
        vol = rng.lognormal(4, 1.5)
        for i, c in enumerate(rng.choice(30, 16, replace=False)):
            grp = (["unclaimed"] * 12 + ["dsc_only", "cul_only", "both", "both"])[i]
            lp = -3 + 0.3 * np.log1p(vol) + 0.05 * c + (np.log(or_both) if grp == "both"
                                                        else np.log(or_claim) if grp != "unclaimed" else 0)
            g = int(rng.random() < 1 / (1 + np.exp(-lp)))
            tb = int(vol) + 1
            rows.append(dict(taxon=f"t{t}", concept_id=f"c{c}", group=grp, pair=g, taxon_total=2 * tb,
                             concept_total=1000 + c, n_dsc=0, n_cul=0, c_le2005=0, c_le2010=0, c_le2015=0,
                             c_gt2010=g, t_le2005=tb // 2 + 1, t_le2010=tb, t_le2015=int(tb * 1.5),
                             t_gt2010=int(tb * rng.uniform(0.5, 3))))
    return pd.DataFrame(rows)


def test_time_machine_risk_set_and_outcome():
    df = pd.DataFrame([
        dict(taxon="a", concept_id="x", group="both", c_le2005=0, c_le2010=0, c_le2015=1, c_gt2010=2,
             t_le2005=5, t_le2010=9, t_le2015=12, t_gt2010=10),
        dict(taxon="a", concept_id="y", group="unclaimed", c_le2005=0, c_le2010=1, c_le2015=1, c_gt2010=0,
             t_le2005=5, t_le2010=9, t_le2015=12, t_gt2010=10),
        dict(taxon="b", concept_id="x", group="unclaimed", c_le2005=0, c_le2010=0, c_le2015=0, c_gt2010=0,
             t_le2005=0, t_le2010=0, t_le2015=0, t_gt2010=3)])
    d = T.prepare(df, 2010)
    assert list(d.concept_id) == ["x"] and d.gained.tolist() == [1]  # plant b unknown by 2010: excluded
    d = T.prepare(df, 2015)
    assert d.empty or d.gained.sum() == 0  # pair (a, x) already studied by 2015
    d = T.prepare(df, 2005)
    assert sorted(d.after.tolist()) == [1, 2]  # after = now - before


def test_time_machine_recovers_known_effect_and_null():
    r = T.run_all(_sim(or_both=2.5), cutoffs=(2010,), n_boot=100)
    lo, hi = r["headline"]["OR_both"][1:]
    assert lo < 2.5 < hi and lo > 1 and r["status"] == "held"
    r0 = T.run_all(_sim(or_both=1.0, seed=4), cutoffs=(2010,), n_boot=100)
    lo, hi = r0["headline"]["OR_both"][1:]
    assert lo < 1 < hi and r0["status"] == "null"
    md = T.markdown(r0)
    assert "Cutoff 2010" in md and "Verdict" in md


# ----------------------------------------------------------------- P4
def test_uncertainty_weights_and_weakest_link():
    assert U.monograph_weight("high", "species") == 1.0
    assert U.monograph_weight("medium", "species") == 0.6
    assert U.monograph_weight("low", "species") == 0.3
    assert U.monograph_weight("high", "genus") == 0.5
    info = {"d1": ("medium", "species", "plant"), "d2": ("high", "species", "product"),
            "c1": ("high", "species", "plant")}
    assert U.source_weight("d1;d2", info) == (0.6, "d1")  # product chapters do not anchor a lead
    la = pd.DataFrame({"taxon": ["A a", "B b"], "concept_id": ["x", "y"], "score": [0.8, 0.7],
                       "expected": [1.0, 1.0]})
    tc = pd.DataFrame({"taxon": ["A a", "B b"], "concept_id": ["x", "y"], "dsc_monographs": ["d1", "d3"],
                       "cul_monographs": ["c1", "c1"]})
    mt = pd.DataFrame([{"monograph_id": k, "confidence": v[0], "rank": v[1], "kind": v[2]} for k, v in
                       {**info, "d3": ("high", "species", "plant")}.items()])
    m = U.certainty(la, tc, mt)
    assert m.certainty.tolist() == [0.6, 1.0]
    assert m.weighted_score.tolist() == [0.48, 0.7]
    pub = pd.DataFrame({"rank": [1, 2], "taxon": ["A a", "B b"], "concept_id": ["x", "y"]})
    cmp_ = U.compare(pub, m)
    assert cmp_["new_rank_of"][("B b", "y")] == 1 and cmp_["n_top60_kept"] == 2
    assert cmp_["tau_all_candidates"]["tau_b"] == pytest.approx(-1.0)


# ----------------------------------------------------------------- P10
def test_mechanism_paths_and_background():
    comp = pd.DataFrame({"label": ["q", "k", "z"], "chembl": ["C1", "C2", None], "inchikey": ["Q", "K", "Z"]})
    acts = pd.DataFrame({"molecule_chembl_id": ["C1", "C1", "C2", "C2"], "target_chembl_id": ["T1", "T1", "T2", "T3"],
                         "pchembl_value": ["6.5", "7.0", "8.0", "6.1"]})
    act = M.best_activity(acts)
    assert act[act.target_chembl_id == "T1"].pchembl.item() == 7.0
    tmap = pd.DataFrame({"target_chembl_id": ["T1", "T2", "T3"], "ensembl": ["E1", "E2", "E3"],
                         "symbol": ["S1", "S2", "S3"]})
    paths, st = M.paths_for_lead(comp, act, tmap, {"E1": 0.5, "E2": 0.05, "E3": 0.9})
    assert [p["target"] for p in paths] == ["S3", "S1"]  # E2 below the 0.1 threshold
    assert st["n_targets"] == 3 and st["n_targets_associated"] == 2
    bg = M.background_share({"E1", "E2"}, {"d1": {"E1": 0.5}, "d2": {}, "d3": {"E1": 0.2, "E2": 0.3}}, "d1")
    assert bg["share_lead_disease"] == 0.5 and bg["median_share_other_diseases"] == 0.5
    assert pubchem.flags(["H302", "H301"]) == ["acute_toxicity"]
    assert pubchem.flags(["H315"]) == []


def test_graphql_post_json_is_cached_and_respects_offline(tmp_path, monkeypatch):
    monkeypatch.setattr(http, "CACHE_ROOT", tmp_path)
    with pytest.raises(http.OfflineCacheMiss):
        graphql.post_json("https://example.org/graphql", {"query": "{x}"}, "t", offline=True)
    key = 'POSTJSON https://example.org/graphql\n{"query":"{x}"}'
    http._write_cache(http.cache_path("t", key), {"body": {"data": {"x": 1}}})
    assert graphql.post_json("https://example.org/graphql", {"query": "{x}"}, "t", offline=True) == {"data": {"x": 1}}


# ----------------------------------------------------------------- P7
def test_ledger_status_rules():
    assert LG.ci_status(2.0, 1.5, 2.5) == "held"
    assert LG.ci_status(1.0, 0.6, 1.7) == "null"
    assert LG.ci_status(0.5, 0.3, 0.8) == "did not hold"
    assert LG.p_status(0.01, True) == "held" and LG.p_status(0.2, True) == "null"


def test_ledger_builds_from_committed_results():
    from palimpsest.paths import ROOT

    led = LG.build(ROOT)
    ids = [e["id"] for e in led]
    assert len(ids) == len(set(ids)) and {"T1", "T2", "T3", "M1", "M7", "E1", "N1"} <= set(ids)
    for e in led:
        assert e["status"] in {"held", "did not hold", "null", "indicative"}
        assert e["reproduce"] and e["question"] and e["result"]
    json.dumps(led)
