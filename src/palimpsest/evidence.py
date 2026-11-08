"""Collect modern evidence for every plant with a historical claim.

Writes
* ``data/processed/evidence_pairs.csv`` - Europe PMC co-mention counts for each
  claimed (plant, indication) pair plus 12 random *unclaimed* indications per
  plant (seeded per plant, so the control set is reproducible);
* ``data/processed/taxon_info.csv``     - GBIF, Wikidata, IUCN, LOTUS, trials;
* ``data/processed/taxon_compounds.csv`` - LOTUS natural-product occurrences;
* ``results/evidence_meta.json``        - query date, N, query templates.

All HTTP goes through ``sources.http`` (disk cache + per-host rate limits), so
a second run is offline and returns identical numbers.
"""
from __future__ import annotations

import json
import random
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pandas as pd

from .analysis.persistence import taxon_claims
from .extract import load_concepts
from .paths import PROCESSED, RESULTS, ensure_dirs

K_CONTROLS = 12
SEED = 11


def concept_terms() -> dict[str, list[str]]:
    c = load_concepts()
    return {r.concept_id: [t.strip() for t in str(r.epmc_terms).split("|") if t.strip()]
            for r in c.itertuples()}


def plan_pairs(tc: pd.DataFrame, concept_ids: list[str], k: int = K_CONTROLS,
               seed: int = SEED) -> list[tuple[str, str]]:
    plan = []
    for taxon, g in tc.groupby("taxon"):
        claimed = sorted(set(g.concept_id))
        pool = [c for c in concept_ids if c not in claimed]
        rng = random.Random(f"{seed}:{taxon}")
        controls = sorted(rng.sample(pool, min(k, len(pool))))
        plan += [(taxon, c) for c in claimed] + [(taxon, c) for c in controls]
    return plan


def _pmap(fn, items, workers):
    with ThreadPoolExecutor(max_workers=workers) as ex:
        return list(ex.map(fn, items))


def run_evidence(workers: int = 24) -> dict:
    from .sources import clinicaltrials, europepmc, gbif

    ensure_dirs()
    claims = pd.read_csv(PROCESSED / "claims.csv")
    mt = pd.read_csv(PROCESSED / "monograph_taxa.csv", dtype=str, keep_default_na=False)
    terms = concept_terms()
    tc = taxon_claims(claims, mt, "species")
    taxa = sorted(tc.taxon.unique())

    N = europepmc.total_records()
    taxon_total = dict(zip(taxa, _pmap(europepmc.taxon_count, taxa, workers)))
    cids = sorted(terms)
    concept_total = dict(zip(cids, _pmap(lambda c: europepmc.concept_count(terms[c]), cids, workers)))
    plan = plan_pairs(tc, cids)

    def pair(tc_):
        t, c = tc_
        return 0 if taxon_total[t] == 0 else europepmc.pair_count(t, terms[c])

    counts = _pmap(pair, plan, workers)
    ev = pd.DataFrame([{"taxon": t, "concept_id": c, "pair": n, "taxon_total": taxon_total[t],
                        "concept_total": concept_total[c], "N": N}
                       for (t, c), n in zip(plan, counts)])
    ev.to_csv(PROCESSED / "evidence_pairs.csv", index=False)

    # ---- per-taxon context: GBIF, Wikidata (LOTUS compounds, IUCN), trials
    sp = mt[(mt.taxon != "")].drop_duplicates("taxon")[["taxon", "taxon_rank", "family", "genus", "gbif_key"]]
    sp = sp[sp.taxon.isin(taxa)].copy()
    sp["gbif_key"] = pd.to_numeric(sp.gbif_key, errors="coerce")
    keys = [int(k) for k in sp.gbif_key.dropna()]
    sp["gbif_occurrences"] = _pmap(
        lambda k: gbif.occurrence_count(int(k)) if k == k else None, list(sp.gbif_key), workers)
    sp["trials"] = _pmap(lambda t: clinicaltrials.trial_count([t]), list(sp.taxon), 5)
    sp["taxon_total"] = sp.taxon.map(taxon_total)

    info, compounds = _wikidata_context(sp, keys)
    sp = sp.merge(info, on="taxon", how="left")
    sp["n_compounds"] = sp.n_compounds.fillna(0).astype(int)
    sp.to_csv(PROCESSED / "taxon_info.csv", index=False)
    compounds.to_csv(PROCESSED / "taxon_compounds.csv", index=False)

    meta = {
        "queried": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "N": N, "n_taxa": len(taxa), "n_pairs": len(plan), "k_controls": K_CONTROLS, "seed": SEED,
        "taxon_query_example": europepmc.taxon_query("Artemisia absinthium"),
        "concept_query_example": europepmc.concept_query(terms["jaundice"]),
        "total_query": europepmc.TOTAL_QUERY,
    }
    (RESULTS / "evidence_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return {"taxa": len(taxa), "pairs": len(plan), "N": N,
            "taxa_with_compounds": int((sp.n_compounds > 0).sum())}


def _wikidata_context(sp: pd.DataFrame, keys: list[int]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Wikidata QIDs, IUCN status and LOTUS compound occurrences per taxon."""
    from .sources import wikidata

    key_to_taxon = {int(k): t for t, k in zip(sp.taxon, sp.gbif_key) if k == k}
    by_key = wikidata.qids_for_gbif_keys(list(key_to_taxon))  # {gbif_key: qid}
    qid_of = {key_to_taxon[int(k)]: q for k, q in by_key.items() if int(k) in key_to_taxon}
    missing = [t for t in sp.taxon if t not in qid_of]
    if missing:
        qid_of.update(wikidata.qids_for_names(missing))  # {name: qid}
    qids = sorted(set(qid_of.values()))
    iucn = wikidata.iucn_status(qids) if qids else {}
    comp = wikidata.compounds_for_taxa(qids)["compounds"] if qids else {}
    rows, info = [], []
    for t, q in qid_of.items():
        cl = comp.get(q, [])
        info.append({"taxon": t, "wikidata": q, "iucn": iucn.get(q), "n_compounds": len(cl)})
        for c in cl:
            rows.append({"taxon": t, "compound_qid": c.get("qid"), "label": c.get("label"),
                         "inchikey": c.get("inchikey"), "chembl": c.get("chembl")})
    return pd.DataFrame(info, columns=["taxon", "wikidata", "iucn", "n_compounds"]), pd.DataFrame(
        rows, columns=["taxon", "compound_qid", "label", "inchikey", "chembl"])
