"""Export the provenance-anchored knowledge graph.

Node types: Monograph (a chapter of a historical source), Taxon (accepted
GBIF name), Concept (indication, with MeSH id), Compound (LOTUS / Wikidata).
Edge types:

* ``IDENTIFIED_AS``  Monograph -> Taxon      (confidence, curator note)
* ``CLAIMS``         Monograph -> Concept    (polarity, verbatim quote, char span)
* ``CONTAINS``       Taxon     -> Compound   (Wikidata P703 'found in taxon', from LOTUS)
* ``CO_MENTIONED``   Taxon     -> Concept    (Europe PMC co-mention count, lift, tier)

Every CLAIMS edge carries the exact character offsets of the quotation in the
source text, so any statement in the graph can be checked against the Greek
or English original.  Formats: nodes/edges CSV (Neo4j-importable) and GraphML.
"""
from __future__ import annotations

import networkx as nx
import pandas as pd

from .corpora import load_monographs
from .paths import PROCESSED


def build_kg(claims: pd.DataFrame, mt: pd.DataFrame, concepts: pd.DataFrame,
             pairs: pd.DataFrame, compounds: pd.DataFrame, taxon_info: pd.DataFrame) -> dict:
    out = PROCESSED / "kg"
    out.mkdir(parents=True, exist_ok=True)
    mono = {m["id"]: m for m in load_monographs()}
    nodes, edges = [], []

    for _, r in concepts.iterrows():
        nodes.append({"id": f"concept:{r.concept_id}", "type": "Concept", "label": r.label,
                      "category": r.category, "mesh_id": r.get("mesh_id", "")})
    ti = taxon_info.set_index("taxon") if not taxon_info.empty else pd.DataFrame()
    for t in sorted(set(mt.taxon.dropna()) - {""}):
        info = ti.loc[t] if t in ti.index else {}
        nodes.append({"id": f"taxon:{t}", "type": "Taxon", "label": t,
                      "family": info.get("family", "") if len(info) else "",
                      "gbif_key": info.get("gbif_key", "") if len(info) else "",
                      "wikidata": info.get("wikidata", "") if len(info) else "",
                      "iucn": info.get("iucn", "") if len(info) else ""})
    for mid, m in mono.items():
        nodes.append({"id": f"monograph:{mid}", "type": "Monograph", "label": m["headword"],
                      "source": m["source"], "ref": m["ref"], "lang": m["lang"]})
    for _, r in mt[mt.taxon.fillna("") != ""].iterrows():
        edges.append({"source": f"monograph:{r.monograph_id}", "target": f"taxon:{r.taxon}",
                      "type": "IDENTIFIED_AS", "confidence": r.confidence, "note": r.note})
    pos = claims[claims.polarity != "negated"]
    for _, r in pos.iterrows():
        edges.append({"source": f"monograph:{r.monograph_id}", "target": f"concept:{r.concept_id}",
                      "type": "CLAIMS", "polarity": r.polarity, "quote": r.match,
                      "start": int(r.start), "end": int(r.end)})
    if not compounds.empty:
        for qid, label, inchikey in compounds[["compound_qid", "label", "inchikey"]].drop_duplicates(
                "compound_qid").itertuples(index=False):
            nodes.append({"id": f"compound:{qid}", "type": "Compound", "label": label or qid,
                          "inchikey": inchikey or ""})
        for t, qid in compounds[["taxon", "compound_qid"]].drop_duplicates().itertuples(index=False):
            edges.append({"source": f"taxon:{t}", "target": f"compound:{qid}", "type": "CONTAINS",
                          "provenance": "Wikidata P703 (LOTUS)"})
    for _, r in pairs[pairs.pair > 0].iterrows():
        edges.append({"source": f"taxon:{r.taxon}", "target": f"concept:{r.concept_id}",
                      "type": "CO_MENTIONED", "papers": int(r.pair), "lift": round(float(r.lift), 3),
                      "tier": r.tier, "provenance": "Europe PMC title/abstract co-mention"})

    nd = pd.DataFrame(nodes).drop_duplicates("id")
    ed = pd.DataFrame(edges)
    nd.to_csv(out / "nodes.csv", index=False)
    ed.to_csv(out / "edges.csv", index=False)
    g = nx.MultiDiGraph()
    for r in nd.fillna("").to_dict("records"):
        g.add_node(r["id"], **{k: str(v) for k, v in r.items() if k != "id"})
    for r in ed.fillna("").to_dict("records"):
        g.add_edge(r["source"], r["target"], **{k: str(v) for k, v in r.items()
                                                  if k not in ("source", "target")})
    nx.write_graphml(g, out / "palimpsest.graphml")
    return {"nodes": int(len(nd)), "edges": int(len(ed)),
            "by_type": ed.type.value_counts().to_dict() if not ed.empty else {}}
