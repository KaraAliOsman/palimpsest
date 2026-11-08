"""Independent checks of the cross-era name concordance.

The curated identifications are checked against sources that played no part
in making them:

* **Greek** - Wikidata items of the resolved taxa often carry Ancient Greek
  (``grc``) or Modern Greek (``el``) names, many of which descend directly from
  Dioscorides' lemma (ἀψίνθιον -> αψιθιά).  A curated identification *agrees*
  when the normalised lemma or one of its listed synonyms shares a ≥4-letter
  stem with such a name, or is ≥0.7 similar to it.  Reported only over taxa
  that have at least one Greek name in Wikidata.
* **English** - GBIF English vernacular names of the accepted taxon are
  compared with the words of Culpeper's heading (e.g. "Wormwood").

Disagreement does not prove an error (Modern Greek names often refer to a
different plant), so this is a lower bound on concordance, not a gold standard.
"""
from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher

import pandas as pd

from .corpora import load_monographs
from .paths import PROCESSED, RESULTS
from .textnorm import normalize_greek

_GREEK = re.compile(r"[α-ω]+")
_STOP_EN = {"common", "garden", "great", "small", "wild", "the", "tree", "called", "or", "and",
            "english", "white", "black", "red", "yellow", "lesser", "greater", "sweet"}


def _gwords(s: str) -> list[str]:
    return [w for w in _GREEK.findall(normalize_greek(s or "")) if len(w) >= 3]


def _agree_greek(cands: list[str], names: list[str]) -> bool:
    for a in cands:
        for b in names:
            if a[:4] == b[:4] and len(a) >= 4 and len(b) >= 4:
                return True
            if SequenceMatcher(None, a, b).ratio() >= 0.7:
                return True
    return False


def name_validation() -> dict:
    from .sources import gbif, wikidata

    mt = pd.read_csv(PROCESSED / "monograph_taxa.csv", dtype=str, keep_default_na=False)
    info = pd.read_csv(PROCESSED / "taxon_info.csv", dtype=str, keep_default_na=False)
    qid = dict(zip(info.taxon, info.wikidata))
    mono = {m["id"]: m for m in load_monographs()}
    out: dict = {}

    # --- Greek lemma vs Wikidata grc/el names
    d = mt[(mt.source == "dioscorides") & (mt.taxon != "") & (mt.taxon_rank == "species")].copy()
    d["qid"] = d.taxon.map(qid)
    d = d[d.qid.fillna("") != ""]
    names = wikidata.names_for_qids(sorted(set(d.qid)), langs=("grc", "el"))
    rows = []
    for r in d.itertuples():
        nm = names.get(r.qid, {})
        gk = list(nm.get("labels", {}).values()) + [a for v in nm.get("aliases", {}).values() for a in v]
        gk = [w for s in gk for w in _gwords(s)]
        if not gk:
            continue
        m = mono.get(r.monograph_id, {})
        cands = _gwords(r.headword) + [w for s in m.get("synonyms", []) for w in _gwords(s)]
        rows.append({"monograph_id": r.monograph_id, "taxon": r.taxon, "confidence": r.confidence,
                     "lemma": r.headword, "wikidata_greek": "; ".join(sorted(set(gk)))[:200],
                     "agree": _agree_greek(cands, gk)})
    g = pd.DataFrame(rows)
    g.to_csv(PROCESSED / "naming_check_greek.csv", index=False)
    out["greek"] = {
        "n_checked": int(len(g)),
        "agreement": float(g.agree.mean()) if len(g) else None,
        "agreement_by_confidence": g.groupby("confidence").agree.mean().round(3).to_dict() if len(g) else {},
    }

    # --- Culpeper heading vs GBIF English vernacular names
    c = mt[(mt.source == "culpeper") & (mt.taxon != "") & (mt.gbif_key != "")]

    def vern(k):
        try:
            return gbif.vernacular_names(int(float(k)), lang="eng")
        except Exception:
            return []

    with ThreadPoolExecutor(max_workers=8) as ex:
        vns = list(ex.map(vern, c.gbif_key))
    rows = []
    for r, vn in zip(c.itertuples(), vns):
        if not vn:
            continue
        head = {w for w in re.findall(r"[a-z]{4,}", r.headword.lower().replace("’", "'"))} - _STOP_EN
        vw = {w for v in vn for w in re.findall(r"[a-z]{4,}", v.lower())} - _STOP_EN
        rows.append({"monograph_id": r.monograph_id, "taxon": r.taxon, "confidence": r.confidence,
                     "heading": r.headword, "agree": bool(head & vw)})
    e = pd.DataFrame(rows)
    e.to_csv(PROCESSED / "naming_check_english.csv", index=False)
    out["english"] = {
        "n_checked": int(len(e)),
        "agreement": float(e.agree.mean()) if len(e) else None,
        "agreement_by_confidence": e.groupby("confidence").agree.mean().round(3).to_dict() if len(e) else {},
    }
    resolved = mt[mt.kind.isin(["plant", "fungus", "product"]) & (mt.scientific_name != "")]
    out["gbif_resolution_rate"] = float((resolved.taxon != "").mean()) if len(resolved) else None
    (RESULTS / "naming_eval.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    return out
