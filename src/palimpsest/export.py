"""Exports: knowledge graph files and the JSON bundle read by the web explorer."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import pandas as pd

from .corpora import load_monographs
from .extract import load_concepts
from .paths import PROCESSED, RESULTS, TABLES, WEB_DATA, ensure_dirs


def _read(path, **kw) -> pd.DataFrame:
    return pd.read_csv(path, **kw) if path.exists() else pd.DataFrame()


def _inputs():
    claims = pd.read_csv(PROCESSED / "claims.csv")
    mt = pd.read_csv(PROCESSED / "monograph_taxa.csv", dtype=str, keep_default_na=False)
    pairs = _read(PROCESSED / "pairs_scored.csv")
    ti = _read(PROCESSED / "taxon_info.csv")
    comp = _read(PROCESSED / "taxon_compounds.csv")
    return claims, mt, pairs, ti, comp


def export_kg() -> dict:
    from .kg import build_kg

    claims, mt, pairs, ti, comp = _inputs()
    return build_kg(claims, mt, load_concepts(), pairs, comp, ti)


def _clean(v):
    if isinstance(v, float) and v != v:
        return None
    return v


def export_web() -> dict:
    ensure_dirs()
    claims, mt, pairs, ti, comp = _inputs()
    concepts = load_concepts()
    stats = json.loads((RESULTS / "stats.json").read_text(encoding="utf-8"))
    ev_path = RESULTS / "extraction_eval.json"
    ext_eval = json.loads(ev_path.read_text()) if ev_path.exists() else {}
    nm_path = RESULTS / "naming_eval.json"
    naming = json.loads(nm_path.read_text()) if nm_path.exists() else {}
    tc = pd.read_csv(PROCESSED / "taxon_claims.csv")
    mono = {m["id"]: m for m in load_monographs()}
    WEB_DATA.mkdir(parents=True, exist_ok=True)

    # ---- texts.json (every monograph; Culpeper = Government and virtues section)
    texts = {}
    pos = claims[claims.polarity != "negated"]
    spans_by = {k: g for k, g in pos.groupby("monograph_id")}
    for mid, m in mono.items():
        g = spans_by.get(mid)
        texts[mid] = {
            "ref": m["ref"], "headword": m["headword"], "lang": m["lang"], "source": m["source"],
            "text": m["analysis_text"],
            "spans": [] if g is None else [
                {"start": int(r.start), "end": int(r.end), "concept_id": r.concept_id, "polarity": r.polarity}
                for r in g.itertuples()],
        }
    (WEB_DATA / "texts.json").write_text(json.dumps(texts, ensure_ascii=False), encoding="utf-8")

    # ---- plants.json
    ti_idx = ti.set_index("taxon").to_dict("index") if not ti.empty else {}
    top_comp = {}
    if not comp.empty:
        for t, g in comp.groupby("taxon"):
            top_comp[t] = [{"name": _clean(r.label) or r.compound_qid, "qid": r.compound_qid}
                           for r in g.head(8).itertuples()]
    claimed_pairs = pairs[pairs.group != "unclaimed"] if not pairs.empty else pd.DataFrame()
    pair_idx = {(r.taxon, r.concept_id): r for r in claimed_pairs.itertuples()} if not claimed_pairs.empty else {}
    leads = _read(TABLES / "leads.csv")
    lead_score = {(r.taxon): r.score for r in leads.itertuples()} if not leads.empty else {}
    plants = []
    named = mt[mt.taxon != ""]
    for taxon, g in named.groupby("taxon"):
        info = ti_idx.get(taxon, {})
        rows = tc[tc.taxon == taxon]
        cl = []
        for r in rows.itertuples():
            pr = pair_idx.get((taxon, r.concept_id))
            cl.append({
                "concept_id": r.concept_id, "dsc": int(r.n_dsc), "cul": int(r.n_cul),
                "persistent": bool(r.dsc and r.cul),
                "epmc_pair": None if pr is None else int(pr.pair),
                "lift": None if pr is None else round(float(pr.lift), 2),
                "evidence_tier": None if pr is None else pr.tier,
            })
        first = g.iloc[0]
        plants.append({
            "taxon": taxon, "family": _clean(info.get("family")) or first.family or None,
            "rank": first.taxon_rank,
            "gbif_key": _clean(info.get("gbif_key")) or (int(first.gbif_key) if first.gbif_key else None),
            "wikidata": _clean(info.get("wikidata")), "iucn": _clean(info.get("iucn")),
            "gbif_occurrences": _clean(info.get("gbif_occurrences")),
            "common_name": next((c for c in g.common_name_en if c), None),
            "names": [{"source": r.source, "name": r.headword, "monograph_id": r.monograph_id,
                       "confidence": r.confidence, "note": r.note} for r in g.itertuples()],
            "n_compounds": int(info.get("n_compounds") or 0) if info else 0,
            "top_compounds": top_comp.get(taxon, []),
            "epmc_total": _clean(info.get("taxon_total")), "trials": _clean(info.get("trials")),
            "claims": sorted(cl, key=lambda c: (-c["persistent"], -(c["dsc"] + c["cul"]))),
            "lead_score": _clean(lead_score.get(taxon)),
        })
    plants.sort(key=lambda p: (-sum(c["persistent"] for c in p["claims"]), p["taxon"]))
    (WEB_DATA / "plants.json").write_text(json.dumps(plants, ensure_ascii=False, default=_clean),
                                          encoding="utf-8")

    # ---- concepts.json
    cc = tc.groupby("concept_id").agg(n_dsc=("dsc", "sum"), n_cul=("cul", "sum")).reset_index()
    cj = concepts.merge(cc, on="concept_id", how="left").fillna({"n_dsc": 0, "n_cul": 0})
    (WEB_DATA / "concepts.json").write_text(json.dumps([
        {"concept_id": r.concept_id, "label": r.label, "category": r.category,
         "mesh_id": _clean(getattr(r, "mesh_id", None)), "n_dsc": int(r.n_dsc), "n_cul": int(r.n_cul)}
        for r in cj.itertuples()], ensure_ascii=False), encoding="utf-8")

    # ---- leads.json with verbatim quotes from both sources
    quote = {}
    q = pos.merge(mt[["monograph_id", "taxon"]], on="monograph_id")
    for r in q.itertuples():
        quote.setdefault((r.taxon, r.concept_id, r.source), (r.clause, r.monograph_id))
    lj = []
    for r in leads.itertuples() if not leads.empty else []:
        dq = quote.get((r.taxon, r.concept_id, "dioscorides"), ("", ""))
        cq = quote.get((r.taxon, r.concept_id, "culpeper"), ("", ""))
        lj.append({
            "rank": int(r.rank), "taxon": r.taxon, "concept_id": r.concept_id, "label": r.label,
            "score": float(r.score), "dsc_quote": dq[0], "dsc_ref": dq[1], "cul_quote": cq[0],
            "cul_ref": cq[1], "epmc_pair": int(r.pair), "epmc_taxon": int(r.taxon_total),
            "n_compounds": int(r.n_compounds), "iucn": _clean(getattr(r, "iucn", None)),
            "flag_historical_safety": bool(r.flag_historical_safety),
            "flag_threatened": bool(r.flag_threatened),
            "why": (f"Claimed by Dioscorides and Culpeper ({int(r.n_dsc)}+{int(r.n_cul)} mentions); "
                    f"{int(r.pair)} papers co-mention plant and indication out of {int(r.taxon_total)} "
                    f"on the plant; {int(r.n_compounds)} known constituents."),
        })
    (WEB_DATA / "leads.json").write_text(json.dumps(lj, ensure_ascii=False), encoding="utf-8")

    # ---- stats.json (chart inputs)
    t = stats["transmission"]
    cat = _read(TABLES / "claims_by_category.csv")
    tbc = _read(TABLES / "transmission_by_concept.csv")
    web_stats = {
        "persistence": {k: t[k] for k in ("observed_overlap", "null_mean", "null_sd", "null_q",
                                          "fold_enrichment", "p_value", "n_perm", "n_shared_taxa",
                                          "null_hist", "share_cul_in_dsc")},
        "persistence_sensitivity": {k: {kk: v[kk] for kk in ("observed_overlap", "null_mean",
                                                            "fold_enrichment", "p_value", "n_shared_taxa")}
                                    for k, v in stats["transmission_sensitivity"].items() if v},
        "lift_by_group": stats["modern"]["groups"],
        # "poisson" = intensity once studied (pairs with >= 1 paper); all-pairs model kept separately
        "regression": {"poisson": stats["modern"].get("poisson_given_studied", stats["modern"]["poisson_rate_ratios"]),
                       "poisson_all_pairs": stats["modern"]["poisson_rate_ratios"],
                       "logit": stats["modern"]["logit_fixed_effects"],
                       "poisson_offset_only": stats["modern"]["poisson_offset_only"],
                       "conditional_logit": stats["modern"]["conditional_logit"],
                       "wilcoxon": stats["modern"]["wilcoxon_within_taxon"]},
        "categories": cat.to_dict("records"),
        "top_transmitted": tbc.head(15).to_dict("records") if not tbc.empty else [],
    }
    (WEB_DATA / "stats.json").write_text(json.dumps(web_stats, ensure_ascii=False, default=_clean),
                                         encoding="utf-8")

    # ---- graph.json (most-connected subgraph, for the network view)
    top_taxa = set(tc.groupby("taxon").size().sort_values(ascending=False).head(60).index)
    sub = tc[tc.taxon.isin(top_taxa)]
    nodes = [{"id": f"taxon:{x}", "type": "taxon", "label": x} for x in sorted(top_taxa)]
    lab = dict(zip(concepts.concept_id, concepts.label))
    nodes += [{"id": f"concept:{c}", "type": "concept", "label": lab.get(c, c)} for c in sorted(set(sub.concept_id))]
    links = [{"source": f"taxon:{r.taxon}", "target": f"concept:{r.concept_id}", "type": "claimed_for",
              "sources": [s for s, f in (("dsc", r.dsc), ("cul", r.cul)) if f]} for r in sub.itertuples()]
    (WEB_DATA / "graph.json").write_text(json.dumps({"nodes": nodes, "links": links}, ensure_ascii=False),
                                         encoding="utf-8")

    # ---- summary.json
    d = stats["descriptive"]
    mod = stats["modern"]
    grp = {g["group"]: g for g in mod["groups"]}
    headline = [{
        "value": f"{t['fold_enrichment']:.1f}×",
        "label": "Culpeper (1653) repeats Dioscorides' (c. 60 CE) indication for the same plant this many times more often than chance",
        "detail": f"{t['observed_overlap']} shared plant–indication claims vs {t['null_mean']:.0f} expected; "
                  f"label-permutation p < {max(t['p_value'], 1 / t['n_perm']):.1g}, {t['n_shared_taxa']} shared species",
    }]
    if "both" in grp and "unclaimed" in grp:
        headline.append({
            "value": f"{grp['both']['share_any_paper']:.0%}",
            "label": "of indications claimed by both herbals have ≥1 modern paper co-mentioning plant and indication",
            "detail": f"vs {grp['unclaimed']['share_any_paper']:.0%} for unclaimed indications of the same plants",
        })
    lfe = {r["term"]: r for r in mod["logit_fixed_effects"]}
    if "both" in lfe:
        r = lfe["both"]
        headline.append({
            "value": f"OR {r['odds_ratio']:.1f}",
            "label": "odds that modern research has looked at an indication both herbals claimed, vs. unclaimed indications of the same plants",
            "detail": f"logit with indication fixed effects and plant research volume, cluster-robust 95% CI "
                      f"{r['ci'][0]:.1f}–{r['ci'][1]:.1f}; but persistent claims do not attract more papers "
                      f"once studied (Poisson RR n.s.) — the gap the leads target",
        })
    headline.append({"value": str(stats["n_leads"]), "label": "persistent but under-studied plant–indication pairs ranked as research leads",
                     "detail": "≤4 co-mentioning papers; hypotheses for laboratory follow-up, not medical advice"})
    summary = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "counts": {
            "dsc_chapters": int(d["monographs"].get("dioscorides", 0)),
            "cul_monographs": int(d["monographs"].get("culpeper", 0)),
            "taxa": int(mt[mt.taxon != ""].taxon.nunique()),
            "taxa_shared": int(t["n_shared_taxa"]),
            "claims": int(sum(d["claims_by_source"].values())),
            "claims_dsc": int(d["claims_by_source"].get("dioscorides", 0)),
            "claims_cul": int(d["claims_by_source"].get("culpeper", 0)),
            "concepts": int(len(concepts)),
            "persistent_pairs": int(d["taxon_concept_pairs"]["both"]),
            "pairs_queried": int(len(pairs)),
            "compounds": int(comp.compound_qid.nunique()) if not comp.empty else 0,
        },
        "headline": headline,
        "extraction_eval": {s: {k: v["positive"][k] for k in ("precision", "recall", "f1", "n_monographs")}
                            | {"precision_ci": v["positive"]["precision_ci"], "recall_ci": v["positive"]["recall_ci"]}
                            for s, v in ext_eval.items()},
        "naming_eval": naming,
    }
    (WEB_DATA / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1, default=_clean),
                                           encoding="utf-8")
    return {"plants": len(plants), "texts": len(texts), "leads": len(lj)}
