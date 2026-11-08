"""MeSH descriptor lookup (NLM RDF lookup service) and concepts.csv verification.

``python -m palimpsest.sources.mesh`` fills the ``mesh_id`` and
``mesh_ui_label`` columns of ``data/lexicons/concepts.csv`` (appended at the
end, or overwritten in place if they already exist) and prints failures.
"""
from __future__ import annotations

import csv
import io
import os
import sys
import tempfile
from pathlib import Path

from ..paths import LEXICONS
from .http import get_json

LOOKUP_URL = "https://id.nlm.nih.gov/mesh/lookup/descriptor"
NAMESPACE = "mesh"
CONCEPTS_CSV = LEXICONS / "concepts.csv"
NEW_COLUMNS = ("mesh_id", "mesh_ui_label")


def _candidates(label: str, match: str, limit: int = 3, **kw) -> list[tuple[str, str]]:
    body = get_json(LOOKUP_URL, {"label": label, "match": match, "limit": limit},
                    namespace=NAMESPACE, validate=lambda b: isinstance(b, list), **kw)
    return [(r["resource"].rsplit("/", 1)[-1], r["label"]) for r in body
            if isinstance(r, dict) and r.get("resource")]


def lookup_descriptor_detail(label: str, fallback: bool = True, **kw):
    """Like :func:`lookup_descriptor` but returns ``(ui, label, match_mode)``.

    ``exact`` first; with ``fallback``, then ``startswith`` and ``contains``,
    where a candidate whose label equals ``label`` case-insensitively is
    preferred over the first hit. Returns None when nothing is found.
    """
    label = " ".join(label.split())
    if not label:
        return None
    modes = ("exact", "startswith", "contains") if fallback else ("exact",)
    for mode in modes:
        cands = _candidates(label, mode, **kw)
        if not cands:
            continue
        for ui, lab in cands:
            if lab.casefold() == label.casefold():
                return ui, lab, mode
        return cands[0][0], cands[0][1], mode
    return None


def lookup_descriptor(label: str, fallback: bool = True, **kw) -> tuple[str, str] | None:
    """MeSH descriptor for ``label`` -> ``(ui, preferred label)``, e.g.
    ``('D008288', 'Malaria')``; None if not found."""
    r = lookup_descriptor_detail(label, fallback=fallback, **kw)
    return None if r is None else (r[0], r[1])


def verify_concepts(path: Path | str = CONCEPTS_CSV, write: bool = True, **kw) -> list[dict]:
    """Look up every ``mesh_label`` and write ``mesh_id``/``mesh_ui_label``.

    Existing columns, row order and line endings are preserved; the file is
    replaced atomically. Returns one record per concept whose lookup failed
    or needed a non-exact match (``mode`` = 'none' | 'startswith' | 'contains').
    """
    path = Path(path)
    raw = path.read_bytes().decode("utf-8")
    newline = "\r\n" if "\r\n" in raw else "\n"
    reader = csv.DictReader(io.StringIO(raw, newline=""))
    fields = list(reader.fieldnames or [])
    rows = list(reader)
    for col in NEW_COLUMNS:
        if col not in fields:
            fields.append(col)

    problems = []
    for row in rows:
        label = (row.get("mesh_label") or "").strip()
        res = lookup_descriptor_detail(label, **kw) if label else None
        if res is None:
            row["mesh_id"], row["mesh_ui_label"] = "", ""
            problems.append({"concept_id": row["concept_id"], "mesh_label": label,
                             "mode": "none", "mesh_id": "", "mesh_ui_label": ""})
            continue
        ui, lab, mode = res
        row["mesh_id"], row["mesh_ui_label"] = ui, lab
        if mode != "exact":
            problems.append({"concept_id": row["concept_id"], "mesh_label": label,
                             "mode": mode, "mesh_id": ui, "mesh_ui_label": lab})

    if write:
        buf = io.StringIO(newline="")
        w = csv.DictWriter(buf, fieldnames=fields, lineterminator=newline)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fields})
        fd, tmp = tempfile.mkstemp(prefix=".tmp-", suffix=".csv", dir=path.parent)
        try:
            with os.fdopen(fd, "wb") as fh:
                fh.write(buf.getvalue().encode("utf-8"))
            os.replace(tmp, path)
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
    return problems


if __name__ == "__main__":  # pragma: no cover
    probs = verify_concepts()
    if not probs:
        print("all mesh_label values matched a MeSH descriptor exactly")
    for p in probs:
        print(f"{p['concept_id']}: {p['mesh_label']!r} -> {p['mode']} "
              f"{p['mesh_id']} {p['mesh_ui_label']!r}", file=sys.stderr)
