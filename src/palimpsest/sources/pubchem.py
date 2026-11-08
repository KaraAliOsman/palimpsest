"""PubChem: InChIKey -> CID and GHS hazard statements (P10). Via :mod:`.http`."""
from __future__ import annotations

import json
import re

from .http import FetchError, get_json, get_text

PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
VIEW = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound"
NAMESPACE = "pubchem"

#: hazard statements flagged in the explorer
SEVERE = {
    "acute_toxicity": {"H300", "H301", "H310", "H311", "H330", "H331"},
    "carcinogenic_mutagenic_reprotoxic": {"H340", "H341", "H350", "H351", "H360", "H361"},
    "organ_toxicity": {"H370", "H372"},
}


def cid(inchikey: str) -> int | None:
    try:
        t = get_text(f"{PUG}/compound/inchikey/{inchikey}/cids/TXT", namespace=NAMESPACE)
    except FetchError:
        return None
    first = t.strip().split()[0] if t.strip() else ""
    return int(first) if first.isdigit() else None


def ghs_codes(cid_: int) -> list[str]:
    try:
        b = get_json(f"{VIEW}/{int(cid_)}/JSON", {"heading": "GHS Classification"}, namespace=NAMESPACE)
    except FetchError:  # 404: no GHS section
        return []
    return sorted(set(re.findall(r"\bH\d{3}\b", json.dumps(b))))


def flags(codes: list[str]) -> list[str]:
    return [k for k, v in SEVERE.items() if v & set(codes)]
