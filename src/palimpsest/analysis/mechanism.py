"""P10 - hypothesis-generating mechanism paths and modern hazard flags for leads.

Path: plant -(LOTUS, Wikidata P703)-> constituent -(ChEMBL, pChEMBL >= 6, human
single protein)-> target -(Open Targets overall association score)-> the
lead's disease. For every lead the 1-2 best paths (distinct targets, ranked by
Open Targets score then pChEMBL) are kept.

A background check guards against reading too much into paths: for each lead,
the share of the plant's active targets that are associated (score >= 0.1) with
the lead's disease is compared with the same share for the other diseases in
the lead set (a plant with hundreds of targets hits almost any disease).

These are **hypotheses**, not evidence of efficacy: activity in an assay, at any
concentration reachable or not in vivo, does not imply a therapeutic effect.
"""
from __future__ import annotations

import pandas as pd

#: lead concept -> Open Targets disease/phenotype (mapIds on the MeSH label or the
#: first search term; curated where mapIds returned nothing; None = no fitting
#: Open Targets entity, e.g. envenomation is not a disease in Open Targets)
DISEASE = {
    "diarrhea": "MONDO_0001673", "constipation": "MONDO_0002203", "colic": "HP_0002027",
    "nausea_vomiting": "HP_0002013", "spleen_disease": "MONDO_0002332", "cough": "HP_0012735",
    "asthma_dyspnea": "MONDO_0004979", "sore_throat": "MONDO_0002258", "tuberculosis": "MONDO_0018076",
    "diuresis": "HP_0000016", "urolithiasis": "MONDO_0024647", "kidney_disease": "MONDO_0005240",
    "sexual_function": "MONDO_0005362", "amenorrhea": "MONDO_0001836", "uterine_disorders": "MONDO_0002654",
    "delirium": "MONDO_0045057", "convulsions": "HP_0003394", "gout": "MONDO_0005393", "bruises": None,
    "wounds": "GO_0042060", "skin_ulcers": "HP_0200042", "burns": "EFO_0009516", "itch_scabies": "HP_0000989",
    "dermatitis": "MONDO_0004980", "scaly_skin": "MONDO_0005083", "alopecia": "MONDO_0004907",
    "skin_blemishes": "MONDO_0019289", "erysipelas": "MONDO_0001266", "eye_disease": "MONDO_0005328",
    "ear_disease": "MONDO_0021205", "toothache": "EFO_0010072", "mouth_gums": "MONDO_0006858",
    "edema_dropsy": "EFO_0009373", "heart": "MONDO_0005267", "hemorrhage": "HP_0001892",
    "envenomation": None, "poisoning": "MONDO_0029000",
}
ASSOC_MIN = 0.1


def best_activity(acts: pd.DataFrame) -> pd.DataFrame:
    """Max pChEMBL per (compound, target)."""
    a = acts.copy()
    a["pchembl_value"] = pd.to_numeric(a.pchembl_value, errors="coerce")
    a = a.dropna(subset=["pchembl_value"])
    return (a.groupby(["molecule_chembl_id", "target_chembl_id"], as_index=False)
            .agg(pchembl=("pchembl_value", "max"), n_measurements=("pchembl_value", "size")))


def paths_for_lead(compounds: pd.DataFrame, act: pd.DataFrame, tmap: pd.DataFrame,
                   scores: dict[str, float], k: int = 2) -> tuple[list[dict], dict]:
    """compounds: taxon's rows (label, chembl); act: best_activity; tmap: target_chembl_id ->
    ensembl, symbol; scores: {ensembl: OT score for the lead disease}."""
    c = compounds.dropna(subset=["chembl"]).drop_duplicates("chembl")
    a = act[act.molecule_chembl_id.isin(set(c.chembl))].merge(tmap, on="target_chembl_id")
    a = a.merge(c[["chembl", "label", "inchikey"]], left_on="molecule_chembl_id", right_on="chembl")
    a["ot_score"] = a.ensembl.map(scores).fillna(0.0)
    targets = a.drop_duplicates("ensembl")
    stats = {"n_compounds_with_chembl": int(len(c)), "n_active_compounds": int(a.molecule_chembl_id.nunique()),
             "n_targets": int(targets.ensembl.nunique()),
             "n_targets_associated": int((targets.ot_score >= ASSOC_MIN).sum())}
    stats["share_targets_associated"] = (stats["n_targets_associated"] / stats["n_targets"]
                                         if stats["n_targets"] else None)
    a = a[a.ot_score >= ASSOC_MIN].sort_values(["ot_score", "pchembl"], ascending=False)
    out, seen = [], set()
    for r in a.itertuples():
        if r.ensembl in seen:
            continue
        seen.add(r.ensembl)
        out.append({"compound": r.label, "chembl": r.molecule_chembl_id, "inchikey": r.inchikey,
                    "target": r.symbol, "ensembl": r.ensembl, "pchembl": round(float(r.pchembl), 2),
                    "ot_score": round(float(r.ot_score), 3)})
        if len(out) == k:
            break
    return out, stats


def background_share(taxon_targets: set[str], scores_by_disease: dict[str, dict[str, float]],
                     lead_disease: str) -> dict:
    """Share of the plant's targets associated with the lead disease vs other diseases."""
    if not taxon_targets:
        return {}
    sh = {d: sum(1 for t in taxon_targets if s.get(t, 0) >= ASSOC_MIN) / len(taxon_targets)
          for d, s in scores_by_disease.items()}
    others = [v for d, v in sh.items() if d != lead_disease]
    lead = sh.get(lead_disease)
    if lead is None or not others:
        return {}
    return {"share_lead_disease": lead, "median_share_other_diseases": float(pd.Series(others).median()),
            "percentile_among_diseases": float((pd.Series(others) < lead).mean())}
