"""ChEMBL REST: human single-protein bioactivities (pChEMBL >= 6) for compounds (P10).

``activity.json`` with ``pchembl_value__gte`` and ``target_organism=Homo sapiens``
also returns cell-line and organism targets, so targets are re-checked with
``target.json`` and only ``SINGLE PROTEIN`` targets are kept (UniProt accession
from the target component). All requests via :mod:`.http` (cache + rate limit).
"""
from __future__ import annotations

from .http import get_json

API = "https://www.ebi.ac.uk/chembl/api/data"
NAMESPACE = "chembl"
ACT_FIELDS = "molecule_chembl_id,target_chembl_id,pchembl_value,standard_type,target_pref_name"


def activities(molecule_ids: list[str], min_pchembl: float = 6.0, page: int = 1000) -> list[dict]:
    out, offset = [], 0
    ids = ",".join(sorted(set(molecule_ids)))
    while True:
        b = get_json(f"{API}/activity.json", {"molecule_chembl_id__in": ids, "pchembl_value__gte": min_pchembl,
                                              "target_organism": "Homo sapiens", "only": ACT_FIELDS,
                                              "limit": page, "offset": offset}, namespace=NAMESPACE,
                     validate=lambda x: isinstance(x, dict) and "activities" in x)
        out += b["activities"]
        if not b["page_meta"].get("next"):
            return out
        offset += page


def targets(target_ids: list[str]) -> dict[str, dict]:
    """{target_chembl_id: {type, name, accessions}}"""
    ids = ",".join(sorted(set(target_ids)))
    b = get_json(f"{API}/target.json", {"target_chembl_id__in": ids, "limit": 1000,
                                        "only": "target_chembl_id,target_type,pref_name,organism,target_components"},
                 namespace=NAMESPACE, validate=lambda x: isinstance(x, dict) and "targets" in x)
    return {t["target_chembl_id"]: {"type": t.get("target_type"), "name": t.get("pref_name"),
                                    "organism": t.get("organism"),
                                    "accessions": [c.get("accession") for c in t.get("target_components", [])
                                                   if c.get("accession")]}
            for t in b["targets"]}
