"""Cross-era plant-name resolution.

Curated identifications (``data/curated/taxa_*.csv``: historical lemma ->
binomial, with confidence and justification) are normalised against the GBIF
backbone so that Dioscorides' ἀψίνθιον and Culpeper's "Wormwood" resolve to
the same accepted taxon key.  The output, ``data/processed/monograph_taxa.csv``,
is the name concordance that every later step joins on.
"""
from __future__ import annotations

import glob
from concurrent.futures import ThreadPoolExecutor

import pandas as pd

from .paths import CURATED, PROCESSED, ensure_dirs

PLANTISH = {"plant", "fungus", "product"}
COLS = ["monograph_id", "headword", "kind", "scientific_name", "rank", "confidence",
        "alternatives", "common_name_en", "note"]


def merge_parts() -> dict[str, int]:
    """Concatenate the per-batch curation files into one file per source."""
    counts = {}
    for source in ("dioscorides", "culpeper"):
        parts = sorted(glob.glob(str(CURATED / "_parts" / f"taxa_{source}_part*.csv")))
        if not parts:
            continue
        df = pd.concat([pd.read_csv(p, dtype=str, keep_default_na=False) for p in parts])
        df = df[[c for c in COLS if c in df.columns]]
        df = df.drop_duplicates("monograph_id", keep="first")
        df.to_csv(CURATED / f"taxa_{source}.csv", index=False)
        counts[source] = len(df)
    return counts


def _kingdom(kind: str) -> str | None:
    return None if kind == "fungus" else "Plantae"


def resolve() -> pd.DataFrame:
    from .sources import gbif

    ensure_dirs()
    frames = []
    for source in ("dioscorides", "culpeper"):
        path = CURATED / f"taxa_{source}.csv"
        if path.exists():
            d = pd.read_csv(path, dtype=str, keep_default_na=False)
            d.insert(1, "source", source)
            frames.append(d)
    df = pd.concat(frames, ignore_index=True)
    todo = df[(df.kind.isin(PLANTISH)) & (df.scientific_name.str.strip() != "")]
    names = sorted({(n.strip(), k) for n, k in zip(todo.scientific_name, todo.kind)})

    def one(nk):
        name, kind = nk
        try:
            kw = {"kingdom": _kingdom(kind)} if _kingdom(kind) else {"kingdom": None}
            return nk, gbif.match(name, **kw)
        except Exception as exc:  # network or parsing failure -> unresolved
            return nk, {"error": str(exc)}

    with ThreadPoolExecutor(max_workers=8) as ex:
        res = dict(ex.map(one, names))

    rows = []
    for _, r in df.iterrows():
        m = res.get((r.scientific_name.strip(), r.kind), {}) if r.kind in PLANTISH else {}
        canon = (m or {}).get("canonicalName") or ""
        grank = ((m or {}).get("rank") or "").upper()
        if grank in ("SPECIES",):
            taxon = canon
        elif grank in ("SUBSPECIES", "VARIETY", "FORM") and canon:
            taxon = " ".join(canon.split()[:2])
            grank = "SPECIES"
        elif grank == "GENUS":
            taxon = canon
        else:
            taxon = ""
        rows.append({
            **{k: r[k] for k in ["monograph_id", "source", "headword", "kind", "scientific_name",
                                 "rank", "confidence", "alternatives", "common_name_en", "note"]},
            "gbif_key": (m or {}).get("acceptedUsageKey") or (m or {}).get("usageKey") or "",
            "gbif_match": (m or {}).get("matchType") or "",
            "gbif_status": (m or {}).get("status") or "",
            "taxon": taxon,
            "taxon_rank": grank.lower() if taxon else "",
            "family": (m or {}).get("family") or "",
            "genus": (m or {}).get("genus") or (taxon.split()[0] if taxon else ""),
        })
    out = pd.DataFrame(rows)
    out.to_csv(PROCESSED / "monograph_taxa.csv", index=False)
    return out
