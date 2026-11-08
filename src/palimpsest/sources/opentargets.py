"""Open Targets Platform GraphQL (v4): id mapping and target-disease scores (P10).

GET requests return HTTP 500 for this endpoint, so queries are sent as JSON POST
through :func:`.graphql.post_json` (cached, rate-limited like every connector).
"""
from __future__ import annotations

from .graphql import post_json

URL = "https://api.platform.opentargets.org/api/v4/graphql"
NAMESPACE = "opentargets"

_MAP = "query m($t:[String!]!,$e:[String!]!){ mapIds(queryTerms:$t, entityNames:$e) { mappings { term hits { id name entity } } } }"
_ASSOC = ("query a($e:String!,$b:[String!]){ disease(efoId:$e){ id name "
          "associatedTargets(Bs:$b, page:{index:0,size:3000}){ count rows{ target{id approvedSymbol} score } } } }")
_META = "{ meta { apiVersion { x y z } dataVersion { year month } } }"


def meta() -> dict:
    return post_json(URL, {"query": _META}, NAMESPACE)["data"]["meta"]


def map_ids(terms: list[str], entity: str) -> dict[str, list[dict]]:
    out = {}
    terms = sorted(set(terms))
    for i in range(0, len(terms), 200):
        b = post_json(URL, {"query": _MAP, "variables": {"t": terms[i:i + 200], "e": [entity]}}, NAMESPACE)
        for m in b["data"]["mapIds"]["mappings"]:
            out[m["term"]] = m["hits"]
    return out


def disease_target_scores(efo: str, ensembl_ids: list[str]) -> dict[str, float]:
    """Overall (indirect) association score of each given target with ``efo``."""
    out = {}
    ids = sorted(set(ensembl_ids))
    for i in range(0, len(ids), 1000):
        b = post_json(URL, {"query": _ASSOC, "variables": {"e": efo, "b": ids[i:i + 1000]}}, NAMESPACE)
        d = b["data"]["disease"]
        if d:
            out.update({r["target"]["id"]: float(r["score"]) for r in d["associatedTargets"]["rows"]})
    return out
