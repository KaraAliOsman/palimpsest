"""P10 - mechanism paths (LOTUS -> ChEMBL -> Open Targets) and PubChem GHS hazard
flags for the 60 published leads. Hypothesis-generating only.

Usage (repo root, PYTHONPATH=src)::

    python scripts/mechanism.py      # ~1-2k cached API calls on first run

Writes results/extensions/mechanism.{json,md},
data/processed/extensions/mechanism_{activities,targets,paths}.csv and
web/public/data/extra/mechanism.json.
"""
from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from palimpsest.analysis import mechanism as M  # noqa: E402
from palimpsest.paths import PROCESSED, RESULTS, TABLES, WEB_DATA  # noqa: E402
from palimpsest.sources import chembl, http, opentargets, pubchem  # noqa: E402

http.RATES["www.ebi.ac.uk"] = 3  # share EBI politely with other running jobs
OUT, OUTP, WEB = RESULTS / "extensions", PROCESSED / "extensions", WEB_DATA / "extra"
CAVEAT = ("Hypothesis-generating only. A constituent being active (pChEMBL >= 6) on a human protein in some "
          "assay, and that protein being associated with a disease in Open Targets, does not show that the plant, "
          "at any dose, treats the disease. Paths are screening aids for laboratory follow-up, not medical advice. "
          "GHS statements describe the pure substance, not the plant.")


def _pmap(fn, items, workers=4):
    with ThreadPoolExecutor(max_workers=workers) as ex:
        return list(ex.map(fn, items))


def main() -> None:
    for d in (OUT, OUTP, WEB):
        d.mkdir(parents=True, exist_ok=True)
    leads = pd.read_csv(TABLES / "leads.csv")
    comp = pd.read_csv(PROCESSED / "taxon_compounds.csv")
    comp = comp[comp.taxon.isin(set(leads.taxon))]
    mols = sorted(comp.chembl.dropna().unique())
    print(len(leads), "leads,", comp.taxon.nunique(), "taxa,", len(mols), "ChEMBL compounds", flush=True)

    batches = [mols[i:i + 25] for i in range(0, len(mols), 25)]
    acts = pd.DataFrame([a for b in _pmap(chembl.activities, batches) for a in b])
    act = M.best_activity(acts)
    tids = sorted(act.target_chembl_id.unique())
    tinfo = {}
    for part in _pmap(chembl.targets, [tids[i:i + 100] for i in range(0, len(tids), 100)]):
        tinfo.update(part)
    sp = {t: v for t, v in tinfo.items() if v["type"] == "SINGLE PROTEIN" and v["organism"] == "Homo sapiens"
          and len(v["accessions"]) == 1}
    accs = sorted({v["accessions"][0] for v in sp.values()})
    amap = opentargets.map_ids(accs, "target")
    rows = []
    for t, v in sp.items():
        hits = [h for h in amap.get(v["accessions"][0], []) if h.get("entity") == "target"]
        if hits:
            rows.append({"target_chembl_id": t, "uniprot": v["accessions"][0], "ensembl": hits[0]["id"],
                         "symbol": hits[0]["name"], "chembl_name": v["name"]})
    tmap = pd.DataFrame(rows)
    print(len(acts), "activities;", len(tids), "targets;", len(sp), "human single proteins;", len(tmap),
          "mapped to Ensembl", flush=True)
    ens = sorted(tmap.ensembl.unique())
    diseases = sorted({M.DISEASE[c] for c in leads.concept_id if M.DISEASE.get(c)})
    scores = dict(zip(diseases, _pmap(lambda e: opentargets.disease_target_scores(e, ens), diseases)))
    print("Open Targets scores for", len(diseases), "diseases", flush=True)

    act_h = act.merge(tmap, on="target_chembl_id")
    out_leads, all_paths = [], []
    for r in leads.itertuples():
        efo = M.DISEASE.get(r.concept_id)
        c = comp[comp.taxon == r.taxon]
        paths, st = M.paths_for_lead(c, act, tmap, scores.get(efo, {}) if efo else {})
        tt = set(act_h[act_h.molecule_chembl_id.isin(set(c.chembl.dropna()))].ensembl)
        bg = M.background_share(tt, scores, efo) if efo else {}
        top_c = (act_h[act_h.molecule_chembl_id.isin(set(c.chembl.dropna()))].groupby("molecule_chembl_id")
                 .ensembl.nunique().sort_values(ascending=False).head(3).index.tolist())
        out_leads.append({"rank": int(r.rank), "taxon": r.taxon, "concept_id": r.concept_id, "label": r.label,
                          "disease_id": efo, "paths": paths, "stats": st, "background": bg,
                          "top_active_constituents": top_c,
                          "flag_historical_safety": bool(r.flag_historical_safety)})
        all_paths += [{"rank": int(r.rank), "taxon": r.taxon, "concept_id": r.concept_id, **p} for p in paths]

    # ---- GHS for path compounds + 3 most promiscuous constituents per lead
    ck = comp.dropna(subset=["chembl"]).drop_duplicates("chembl").set_index("chembl")
    # share of lead plants containing each constituent (quercetin & co. are everywhere)
    ubiq = (comp.dropna(subset=["chembl"]).groupby("chembl").taxon.nunique() / comp.taxon.nunique()).to_dict()
    want = sorted({p["chembl"] for p in all_paths} | {m for x in out_leads for m in x["top_active_constituents"]})
    iks = {m: ck.loc[m, "inchikey"] for m in want if m in ck.index and isinstance(ck.loc[m, "inchikey"], str)}
    cids = dict(zip(iks, _pmap(pubchem.cid, list(iks.values()))))
    ghs = dict(zip(cids, _pmap(lambda m: pubchem.ghs_codes(cids[m]) if cids[m] else [], list(cids))))
    for x in out_leads:
        hz = []
        for m in sorted({p["chembl"] for p in x["paths"]} | set(x["top_active_constituents"])):
            codes = ghs.get(m, [])
            hz.append({"chembl": m, "compound": ck.loc[m, "label"] if m in ck.index else m, "pubchem_cid": cids.get(m),
                       "ghs": codes, "flags": pubchem.flags(codes)})
        for h in hz:
            h["ubiquitous"] = bool(ubiq.get(h["chembl"], 0) >= 0.25)
        x["modern_hazard"] = hz
        x["any_severe_ghs"] = any(h["flags"] for h in hz)
        x["any_severe_ghs_specific"] = any(h["flags"] and not h["ubiquitous"] for h in hz)

    acts.to_csv(OUTP / "mechanism_activities.csv", index=False)
    tmap.to_csv(OUTP / "mechanism_targets.csv", index=False)
    pd.DataFrame(all_paths).to_csv(OUTP / "mechanism_paths.csv", index=False)
    with_path = [x for x in out_leads if x["paths"]]
    bgs = [x["background"] for x in out_leads if x["background"]]
    summary = {
        "n_leads": len(out_leads), "n_leads_with_path": len(with_path),
        "n_leads_without_disease_mapping": sum(1 for x in out_leads if not x["disease_id"]),
        "n_activities": int(len(acts)), "n_human_single_protein_targets": int(len(tmap)),
        "n_diseases": len(diseases),
        "median_share_targets_associated_lead_disease": float(pd.Series([b["share_lead_disease"] for b in bgs]).median()) if bgs else None,
        "median_share_targets_associated_other_diseases": float(pd.Series([b["median_share_other_diseases"] for b in bgs]).median()) if bgs else None,
        "n_leads_lead_disease_above_median_of_others": sum(1 for b in bgs if b["share_lead_disease"] > b["median_share_other_diseases"]),
        "n_leads_with_bg": len(bgs),
        "n_leads_with_severe_ghs_constituent": sum(1 for x in out_leads if x["any_severe_ghs"]),
        "n_leads_historical_warning_and_severe_ghs": sum(1 for x in out_leads if x["any_severe_ghs"] and x["flag_historical_safety"]),
        "n_leads_with_severe_ghs_non_ubiquitous": sum(1 for x in out_leads if x["any_severe_ghs_specific"]),
        "n_leads_historical_warning_and_severe_ghs_non_ubiquitous": sum(
            1 for x in out_leads if x["any_severe_ghs_specific"] and x["flag_historical_safety"]),
        "n_leads_historical_warning": sum(1 for x in out_leads if x["flag_historical_safety"]),
    }
    res = {"question": "Is there a plausible molecular route from each lead plant's known constituents to its "
                       "historical indication, and do its constituents carry modern hazard classifications?",
           "method": {"constituents": "LOTUS via Wikidata P703 (data/processed/taxon_compounds.csv)",
                      "activity": "ChEMBL activities, pChEMBL >= 6, human SINGLE PROTEIN targets",
                      "association": f"Open Targets Platform overall association score >= {M.ASSOC_MIN} "
                                     "(indirect) between target and the lead's disease",
                      "disease_mapping": M.DISEASE, "paths_per_lead": "best 2 distinct targets by OT score, then pChEMBL",
                      "hazard": "PubChem GHS hazard statements for path constituents and the 3 most promiscuous "
                                "constituents; severe = acute toxicity (H300/301/310/311/330/331), CMR "
                                "(H340/341/350/351/360/361), organ toxicity (H370/372)",
                      "open_targets_version": opentargets.meta()},
           "summary": summary, "leads": out_leads, "caveat": CAVEAT, "status": "hypothesis-generating",
           "reproduce": "PYTHONPATH=src python scripts/mechanism.py", "generated": date.today().isoformat()}
    (OUT / "mechanism.json").write_text(json.dumps(res, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    (WEB / "mechanism.json").write_text(json.dumps(res, indent=1, ensure_ascii=False, default=str), encoding="utf-8")
    s = summary
    md = ["# P10 · Mechanism paths and modern hazard for the 60 leads (hypothesis-generating)", "",
          f"*Generated {res['generated']} · reproduce: `{res['reproduce']}`*", "", "> " + CAVEAT, "",
          f"* {s['n_activities']:,} ChEMBL activities (pChEMBL ≥ 6, human) for the lead plants' constituents; "
          f"{s['n_human_single_protein_targets']} human single-protein targets mapped to Ensembl; {s['n_diseases']} Open Targets diseases.",
          f"* **{s['n_leads_with_path']} of {s['n_leads']} leads** have at least one constituent → target → disease path "
          f"(OT score ≥ {M.ASSOC_MIN}); {s['n_leads_without_disease_mapping']} leads have no Open Targets disease "
          "(venomous bites, bruises).",
          f"* Background check: median share of a plant's active targets associated with the *lead's* disease "
          f"{s['median_share_targets_associated_lead_disease']:.1%} vs {s['median_share_targets_associated_other_diseases']:.1%} "
          f"for the other diseases; lead disease above the plant's own median in {s['n_leads_lead_disease_above_median_of_others']} "
          f"of {s['n_leads_with_bg']} leads. Paths therefore show plausibility, not specificity.",
          f"* {s['n_leads_with_severe_ghs_constituent']} leads have a top constituent with a severe GHS statement; "
          f"{s['n_leads_historical_warning_and_severe_ghs']} of them also carry the herbals' own warning (⚠). The flag is "
          "dominated by ubiquitous flavonoids (e.g. quercetin carries H301 in PubChem's aggregated notifications); "
          f"counting only constituents found in < 25% of the lead plants, {s['n_leads_with_severe_ghs_non_ubiquitous']} "
          f"leads are flagged, {s['n_leads_historical_warning_and_severe_ghs_non_ubiquitous']} of them with ⚠ "
          f"({s['n_leads_historical_warning']} leads carry ⚠ in total).", "",
          "\* = ubiquitous constituent (in ≥ 25% of the lead plants).", "",
          "| # | Lead | Path(s): constituent → target (pChEMBL; OT score) | Severe GHS | ⚠ |", "|---|---|---|---|---|"]
    for x in out_leads:
        p = "; ".join(f"{q['compound']} → {q['target']} ({q['pchembl']}; {q['ot_score']})" for q in x["paths"]) or "–"
        hz = ", ".join(sorted({f"{h['compound']}{'*' if h['ubiquitous'] else ''} ({'/'.join(h['flags'])})" for h in x["modern_hazard"] if h["flags"]})) or "–"
        md.append(f"| {x['rank']} | *{x['taxon']}* – {x['label']} | {p} | {hz} | {'⚠' if x['flag_historical_safety'] else ''} |")
    (OUT / "mechanism.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
