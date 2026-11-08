"""Collect the headline numbers quoted in README / Devpost / slides into results/key_numbers.json."""
import json

import pandas as pd

s = json.load(open("results/stats.json", encoding="utf-8"))
e = json.load(open("results/extraction_eval.json"))
n = json.load(open("results/naming_eval.json"))
t, sens, m, d = s["transmission"], s["transmission_sensitivity"], s["modern"], s["descriptive"]
g = {x["group"]: x for x in m["groups"]}
lf = {x["term"]: x for x in m["logit_fixed_effects"]}
gs = {x["term"]: x for x in m["poisson_given_studied"]}
cl = {x["term"]: x for x in m["conditional_logit"]}
leads = pd.read_csv("results/tables/leads.csv")
kg = pd.read_csv("data/processed/kg/edges.csv", usecols=["type"])
nodes = sum(1 for _ in open("data/processed/kg/nodes.csv", encoding="utf-8")) - 1
mt = pd.read_csv("data/processed/monograph_taxa.csv", dtype=str, keep_default_na=False)
r3 = lambda x: [round(x[k], 2) for k in ("odds_ratio",)] if "odds_ratio" in x else None
ci = lambda x, k: [round(x[k], 2)] + [round(v, 2) for v in x["ci"]]
key = {
    "N_CHAPTERS_DSC": 822, "N_MONO_CUL": 328,
    "N_TAXA": int(mt[mt.taxon != ""].taxon.nunique()),
    "N_SPECIES_DSC": d["species"]["dioscorides"], "N_SPECIES_CUL": d["species"]["culpeper"],
    "N_CLAIMS": int(sum(d["claims_by_source"].values())),
    "PREC_GRC": round(e["dioscorides"]["positive"]["precision"], 2), "REC_GRC": round(e["dioscorides"]["positive"]["recall"], 2),
    "F1_GRC": round(e["dioscorides"]["positive"]["f1"], 2),
    "F1_GRC_CI": [round(x, 2) for x in e["dioscorides"]["positive"]["f1_ci"]],
    "PREC_EN": round(e["culpeper"]["positive"]["precision"], 2), "REC_EN": round(e["culpeper"]["positive"]["recall"], 2),
    "F1_EN": round(e["culpeper"]["positive"]["f1"], 2),
    "F1_EN_CI": [round(x, 2) for x in e["culpeper"]["positive"]["f1_ci"]],
    "N_EVAL_DSC": e["dioscorides"]["positive"]["n_monographs"], "N_EVAL_CUL": e["culpeper"]["positive"]["n_monographs"],
    "GBIF_RESOLVED": round(n["gbif_resolution_rate"], 3),
    "NAME_AGREE_GREEK": round(n["greek"]["agreement"], 2), "NAME_AGREE_EN": round(n["english"]["agreement"], 2),
    "N_SHARED_TAXA": t["n_shared_taxa"], "N_BOTH": t["observed_overlap"], "N_NULL": round(t["null_mean"]),
    "FOLD": round(t["fold_enrichment"], 2), "Z": round(t["z"], 1),
    "SHARE_CUL_IN_DSC": round(t["share_cul_in_dsc"], 2),
    "SHARE_CUL_IN_DSC_CHANCE": round(t["null_mean"] / t["n_cul_claims_shared"], 3),
    "FOLD_SIZE_STRATIFIED": round(sens["size_stratified"]["fold_enrichment"], 2),
    "P_SIZE_STRATIFIED": sens["size_stratified"]["p_value"],
    "FOLD_WITHIN_FAMILY": round(sens["within_family"]["fold_enrichment"], 2),
    "P_WITHIN_FAMILY": sens["within_family"]["p_value"],
    "FOLD_GENUS": round(sens["genus_level"]["fold_enrichment"], 2),
    "FOLD_HICONF": round(sens["high_confidence_ids_only"]["fold_enrichment"], 2),
    "N_PAIRS_QUERIED": int(sum(x["n_pairs"] for x in m["groups"])), "N_TAXA_TESTED": m["n_taxa_tested"],
    "N_RECORDS": m["N_records"],
    "SHARE": {k: round(v["share_any_paper"], 3) for k, v in g.items()},
    "SHARE_MATCHED_UNCLAIMED": {k: round(v["matched_unclaimed_share"], 3) for k, v in g.items()
                                if v.get("matched_unclaimed_share") is not None},
    "OR_BOTH": ci(lf["both"], "odds_ratio"), "OR_DSC": ci(lf["dsc_only"], "odds_ratio"),
    "OR_CUL": ci(lf["cul_only"], "odds_ratio"), "P_OR_BOTH": "%.0e" % lf["both"]["p"],
    "CLOGIT_OR_BOTH": round(cl["both"]["odds_ratio"], 2),
    "RR_GIVEN_STUDIED_BOTH": ci(gs["both"], "rate_ratio"), "P_RR_GIVEN_STUDIED_BOTH": round(gs["both"]["p"], 2),
    "WILCOXON_P": "%.0e" % m["wilcoxon_within_taxon"]["p_value"],
    "N_LEADS": int(len(leads)),
    "N_LEAD_CANDIDATES": int(len(pd.read_csv("results/tables/leads_all.csv"))),
    "N_LEADS_IUCN_ASSESSED": int(leads.iucn.notna().sum()), "N_THREATENED": int(leads.flag_threatened.sum()),
    "KG_NODES": nodes, "KG_EDGES": int(len(kg)),
    "N_COMPOUNDS": int(pd.read_csv("data/processed/taxon_compounds.csv").compound_qid.nunique()),
    "TOP_LEADS": leads.head(8)[["rank", "taxon", "label", "n_dsc", "n_cul", "pair", "n_compounds",
                                "flag_historical_safety"]].to_dict("records"),
}
json.dump(key, open("results/key_numbers.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False, default=str)
print(json.dumps({k: v for k, v in key.items() if k != "TOP_LEADS"}, ensure_ascii=False, default=str))
