"""P7 - "tests we wrote down": one ledger entry per test in the project.

Every number is read from the committed result files (never typed by hand);
the status is computed from the stated prediction:

* ``held``          - the prediction's criterion is met;
* ``did not hold``  - the estimate points the other way with a CI excluding the null;
* ``null``          - the CI includes the null value (no detectable effect);
* ``indicative``    - a descriptive quality check without a pre-set threshold.

``prediction_timing`` says whether the criterion was stated before the result
(``a priori``: in METHODS/COMPETITIVE_ANALYSIS before running) or fixed when
writing this ledger (``post hoc``).
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path


def ci_status(est: float, lo: float, hi: float, null: float = 1.0, direction: str = "greater") -> str:
    if direction == "greater":
        if lo > null:
            return "held"
        if hi < null:
            return "did not hold"
        return "null"
    if hi < null:
        return "held"
    if lo > null:
        return "did not hold"
    return "null"


def p_status(p: float, effect_ok: bool, alpha: float = 0.05) -> str:
    if p < alpha and effect_ok:
        return "held"
    if p < alpha and not effect_ok:
        return "did not hold"
    return "null"


def entry(id_, area, question, prediction, method, result, status, reproduce, source, timing="a priori",
          numbers=None) -> dict:
    return {"id": id_, "area": area, "question": question, "prediction": prediction, "method": method,
            "result": result, "numbers": numbers or {}, "status": status, "prediction_timing": timing,
            "reproduce": reproduce, "source": source}


def _load(root: Path, rel: str):
    p = root / rel
    if not p.exists():
        return None, None
    ts = datetime.fromtimestamp(os.path.getmtime(p), tz=timezone.utc).strftime("%Y-%m-%d")
    return json.loads(p.read_text(encoding="utf-8")), ts


def _term(rows, term):
    return next((r for r in rows if r.get("term") == term), None)


def build(root: Path) -> list[dict]:
    L = []
    st, ts_st = _load(root, "results/stats.json")
    an = "PYTHONPATH=src python -m palimpsest analyze"
    if st:
        t = st["transmission"]
        L.append(entry("T1", "Transmission", "Does Culpeper repeat Dioscorides' indication for the same plant more "
                       "often than chance?", "fold enrichment > 1, permutation p < 0.05",
                       "label permutation of Culpeper claim sets among 136 shared species (10,000 permutations)",
                       f"{t['observed_overlap']} shared vs {t['null_mean']:.0f} expected: {t['fold_enrichment']:.2f}x, "
                       f"z = {t['z']:.1f}, p < {1 / t['n_perm']:g}",
                       p_status(t["p_value"], t["fold_enrichment"] > 1), an, "results/stats.json",
                       numbers={"fold": t["fold_enrichment"], "z": t["z"], "p": t["p_value"]}))
        names = {"size_stratified": ("T2", "permutation only among plants of similar entry length (quintiles)"),
                 "within_family": ("T3", "permutation only within the same botanical family (most conservative)"),
                 "genus_level": ("T4", "same test with plants merged to genus"),
                 "high_confidence_ids_only": ("T5", "only high-confidence identifications"),
                 "category_level": ("T6", "indications merged to therapeutic categories")}
        for k, (i, m) in names.items():
            s = st["transmission_sensitivity"][k]
            L.append(entry(i, "Transmission (stricter null / sensitivity)",
                           f"Does the transmission signal survive: {m}?", "fold > 1, p < 0.05", m,
                           f"{s['observed_overlap']} vs {s['null_mean']:.0f}: {s['fold_enrichment']:.2f}x, z = {s['z']:.1f}, "
                           f"p = {s['p_value']:.1g} ({s['n_perm']:,} permutations)",
                           p_status(s["p_value"], s["fold_enrichment"] > 1), an, "results/stats.json",
                           numbers={"fold": s["fold_enrichment"], "p": s["p_value"]}))
        m = st["modern"]
        lab = {"both": "persistent (both herbals)", "dsc_only": "Dioscorides-only", "cul_only": "Culpeper-only"}
        for j, g in enumerate(("both", "dsc_only", "cul_only"), 1):
            r = _term(m["logit_fixed_effects"], g)
            L.append(entry(f"M{j}", "Modern evidence: presence", f"Are {lab[g]} claims more often studied at all "
                           "than unclaimed indications of the same plants?", "OR > 1 (95% CI excludes 1)",
                           "logit of >= 1 co-mentioning paper, indication FE + log plant volume, cluster-robust by plant",
                           f"OR {r['odds_ratio']:.2f} [{r['ci'][0]:.2f}-{r['ci'][1]:.2f}], p = {r['p']:.1g}, n = {r['n_obs']:,}",
                           ci_status(r["odds_ratio"], *r["ci"]), an, "results/stats.json",
                           numbers={"or": r["odds_ratio"], "ci": r["ci"], "p": r["p"]}))
        r = _term(m["conditional_logit"], "both")
        L.append(entry("M4", "Modern evidence: presence", "Same, with an exact within-plant comparison?",
                       "OR > 1", "conditional logit, strata = plant, + log indication volume",
                       f"OR {r['odds_ratio']:.2f} [{r['ci'][0]:.2f}-{r['ci'][1]:.2f}], p = {r['p']:.1g}",
                       ci_status(r["odds_ratio"], *r["ci"]), an, "results/stats.json",
                       numbers={"or": r["odds_ratio"], "ci": r["ci"]}))
        for i, key, desc in (("M5", "poisson_rate_ratios", "Poisson GLM, indication FE + offset log(expected), cluster-robust"),
                             ("M6", "poisson_offset_only", "Poisson GLM, offset only (secondary)"),
                             ("M7", "poisson_given_studied", "Poisson FE restricted to pairs with >= 1 paper (intensity once studied)")):
            r = _term(m[key], "both")
            L.append(entry(i, "Modern evidence: intensity", "Are persistent claims studied more intensively "
                           + {"M5": "(more co-mentioning papers than expected; primary intensity model)?",
                              "M6": "(more co-mentioning papers; secondary model without indication FE)?",
                              "M7": "once studied (among pairs with >= 1 paper)?"}[i],
                           "rate ratio > 1 (95% CI excludes 1)", desc,
                           f"RR {r['rate_ratio']:.2f} [{r['ci'][0]:.2f}-{r['ci'][1]:.2f}], p = {r['p']:.2g}",
                           ci_status(r["rate_ratio"], *r["ci"]), an, "results/stats.json",
                           numbers={"rr": r["rate_ratio"], "ci": r["ci"], "p": r["p"]}))
        w = m["wilcoxon_within_taxon"]
        L.append(entry("M8", "Modern evidence: lift", "Within each plant, do claimed indications have higher lift "
                       "over expectation than unclaimed ones?", "one-sided Wilcoxon p < 0.05",
                       "within-plant signed-rank test of mean log2 lift, claimed vs unclaimed",
                       f"{w['share_taxa_claimed_higher']:.0%} of {w['n_taxa']} plants higher, p = {w['p_value']:.1g}",
                       p_status(w["p_value"], True), an, "results/stats.json", numbers=w))
        for g in ("both", "dsc_only", "cul_only"):
            gr = next(x for x in m["groups"] if x["group"] == g)
            lo = gr["share_any_paper_ci"][0]
            mv, mci = gr["matched_unclaimed_share"], gr["matched_unclaimed_ci"]
            L.append(entry({"both": "M9", "dsc_only": "M10", "cul_only": "M11"}[g], "Modern evidence: matched controls",
                           f"Is the share of {lab[g]} pairs with >= 1 paper higher than for the unclaimed indications "
                           "of exactly the same plants?", "claimed share's 95% CI above the matched share's 95% CI",
                           "matched controls, cluster-bootstrap CIs (resampling plants)",
                           f"{gr['share_any_paper']:.1%} [{gr['share_any_paper_ci'][0]:.1%}-{gr['share_any_paper_ci'][1]:.1%}] "
                           f"vs {mv:.1%} [{mci[0]:.1%}-{mci[1]:.1%}]",
                           "held" if lo > mci[1] else ("did not hold" if gr["share_any_paper_ci"][1] < mci[0] else "null"),
                           an, "results/stats.json", numbers={"share": gr["share_any_paper"], "matched": mv}))
        hc = st["modern"]["sensitivity_high_confidence"]
        r = _term(hc["poisson_rate_ratios"], "both")
        if r:
            L.append(entry("M12", "Modern evidence: sensitivity", "Intensity result with high-confidence plants only?",
                           "RR > 1", f"Poisson FE on {hc['n_taxa']} plants identified with high confidence in every source",
                           f"RR {r['rate_ratio']:.2f} [{r['ci'][0]:.2f}-{r['ci'][1]:.2f}]", ci_status(r["rate_ratio"], *r["ci"]),
                           an, "results/stats.json"))
    ss, _ = _load(root, "results/sensitivity_synonyms/stats.json")
    if ss:
        rs = "PYTHONPATH=src python scripts/sensitivity_synonyms.py evidence && python scripts/sensitivity_synonyms.py analyze"
        r = _term(ss["modern"]["logit_fixed_effects"], "both")
        L.append(entry("S1", "Synonym sensitivity", "Does the presence result survive searching every plant under all "
                       "its GBIF synonyms?", "persistent OR > 1 (CI excludes 1)", "same logit on synonym-expanded counts",
                       f"OR {r['odds_ratio']:.2f} [{r['ci'][0]:.2f}-{r['ci'][1]:.2f}]", ci_status(r["odds_ratio"], *r["ci"]),
                       rs, "results/sensitivity_synonyms/stats.json"))
        r = _term(ss["modern"]["poisson_given_studied"], "both")
        L.append(entry("S2", "Synonym sensitivity", "Intensity once studied, synonym-expanded?", "RR > 1",
                       "Poisson FE on pairs with >= 1 paper", f"RR {r['rate_ratio']:.2f} [{r['ci'][0]:.2f}-{r['ci'][1]:.2f}]",
                       ci_status(r["rate_ratio"], *r["ci"]), rs, "results/sensitivity_synonyms/stats.json"))
    ev, _ = _load(root, "results/extraction_eval.json")
    if ev:
        for i, (src, lang) in enumerate((("dioscorides", "Ancient Greek"), ("culpeper", "Early Modern English")), 1):
            e = ev[src]["positive"]
            L.append(entry(f"E{i}", "Extraction", f"Is the {lang} indication extractor accurate against a blind "
                           "reference annotation?", "F1 >= 0.80", f"blind annotation of {e['n_monographs']} random monographs "
                           "(seed 2026), (monograph, concept) level, bootstrap CIs",
                           f"P {e['precision']:.2f}, R {e['recall']:.2f}, F1 {e['f1']:.2f} [{e['f1_ci'][0]:.2f}-{e['f1_ci'][1]:.2f}]",
                           "held" if e["f1"] >= 0.8 else "did not hold", "PYTHONPATH=src python -m palimpsest evaluate",
                           "results/extraction_eval.json", timing="post hoc"))
    nm, _ = _load(root, "results/naming_eval.json")
    if nm:
        rn = "PYTHONPATH=src python -m palimpsest naming"
        L.append(entry("N1", "Naming", "Do curated names resolve on the GBIF backbone?", ">= 95% resolved",
                       "GBIF species/match", f"{nm['gbif_resolution_rate']:.1%} resolved",
                       "held" if nm["gbif_resolution_rate"] >= 0.95 else "did not hold", rn, "results/naming_eval.json",
                       timing="post hoc"))
        L.append(entry("N2", "Naming", "Do Greek lemmas agree with independent Wikidata Greek labels of the resolved taxon?",
                       "descriptive (no threshold)", "string agreement, Ancient/Modern Greek Wikidata labels",
                       f"{nm['greek']['agreement']:.0%} of {nm['greek']['n_checked']} checkable", "indicative", rn,
                       "results/naming_eval.json"))
        L.append(entry("N3", "Naming", "Do Culpeper headings agree with GBIF English vernacular names?",
                       "descriptive (no threshold)", "string agreement with GBIF vernacular names",
                       f"{nm['english']['agreement']:.0%} of {nm['english']['n_checked']} checkable", "indicative", rn,
                       "results/naming_eval.json"))
    xb, _ = _load(root, "results/extensions/expert_benchmark.json")
    if xb:
        h = xb["headline"]
        rx = "PYTHONPATH=src python scripts/expert_benchmark.py"
        for i, (k, lab_, thr) in enumerate((("species_top1", "species", 0.5), ("genus_top1", "genus", 0.8)), 1):
            p = h[k]
            L.append(entry(f"X{i}", "Expert benchmark", f"Do our Dioscorides identifications agree with Lardos et al. "
                           f"(2024) expert top-1 at {lab_} level?", f"agreement > {thr:.0%} (Wilson CI lower bound)",
                           f"{p['n']} chapters, expert top-1 = best botanical tier, medicinal tie-break",
                           f"{p['share']:.0%} ({p['k']}/{p['n']}) [{p['ci95'][0]:.2f}-{p['ci95'][1]:.2f}]",
                           "held" if p["ci95"][0] > thr else ("did not hold" if p["ci95"][1] < thr else "null"),
                           rx, "results/extensions/expert_benchmark.json", timing="post hoc"))
        s = xb["staples_check"]
        L.append(entry("X3", "Expert benchmark", "Are the 30 commonest food/garden plants identified correctly?",
                       "30/30", "textbook identifications, GBIF-resolved, Greek lemma checked",
                       f"{s['n_correct']}/{s['n']} correct", "held" if s["n_correct"] == s["n"] else "did not hold",
                       rx, "results/extensions/expert_benchmark.json"))
    tm, _ = _load(root, "results/extensions/time_machine.json")
    if tm:
        h = tm["headline"]
        rt = "PYTHONPATH=src python scripts/time_machine.py fetch && python scripts/time_machine.py analyze"
        o = h.get("OR_both")
        L.append(entry("P5a", "Time machine", "Among pairs unstudied up to 2010, do persistent claims gain a first "
                       "paper afterwards more often than unclaimed indications of the same plants?",
                       "OR > 1 (CI excludes 1) and matched share higher",
                       "logit, indication FE + plant volume at cutoff, cluster-robust; PUB_YEAR windows",
                       (f"OR {o[0]:.2f} [{o[1]:.2f}-{o[2]:.2f}]; gained {h['share_gained_both']:.1%} vs "
                        f"{h['share_gained_matched_unclaimed']:.1%} same plants unclaimed") if o else "not estimable",
                       tm["status"], rt, "results/extensions/time_machine.json"))
        for c, v in h.get("OR_both_by_cutoff", {}).items():
            if v and c != str(h["cutoff"]):
                L.append(entry(f"P5-{c}", "Time machine", f"Same, cutoff {c}?", "OR > 1",
                               "same model, other cutoff", f"OR {v[0]:.2f} [{v[1]:.2f}-{v[2]:.2f}]",
                               ci_status(*v), rt, "results/extensions/time_machine.json"))
    ul, _ = _load(root, "results/extensions/uncertainty_leads.json")
    if ul:
        t = ul["primary"]["tau_all_candidates"]
        L.append(entry("P4", "Leads", "Is the lead ranking robust to identification uncertainty?",
                       "descriptive (Kendall tau; no threshold)", "score x certainty (high 1, medium 0.6, low 0.3, "
                       "genus 0.5; weakest link of the two herbals), same diversification",
                       f"tau-b {t['tau_b']:.2f} over {t['n']} candidates; {ul['primary']['n_top60_kept']}/60 stay in the top 60",
                       "indicative", "PYTHONPATH=src python scripts/uncertainty_leads.py",
                       "results/extensions/uncertainty_leads.json"))
    mc, _ = _load(root, "results/extensions/mechanism.json")
    if mc:
        s = mc["summary"]
        n, k = s["n_leads_with_bg"], s["n_leads_lead_disease_above_median_of_others"]
        L.append(entry("P10", "Mechanism (hypothesis-generating)", "Are a lead plant's active targets more often "
                       "associated with its historical indication than with other diseases?",
                       "lead disease above the plant's median over other diseases in > 50% of leads",
                       "LOTUS -> ChEMBL (pChEMBL >= 6, human) -> Open Targets score >= 0.1",
                       f"{s['n_leads_with_path']}/{s['n_leads']} leads have a path; lead disease above median in {k}/{n}",
                       "held" if n and k / n > 0.5 else "null", "PYTHONPATH=src python scripts/mechanism.py",
                       "results/extensions/mechanism.json", timing="post hoc"))
    for e in L:
        _, e["recorded"] = _load(root, e["source"]) if (root / e["source"]).exists() else (None, None)
    return L
