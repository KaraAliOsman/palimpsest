"""Read-only, lazily cached access to Palimpsest's committed data files.

Nothing here touches the network or writes to disk. Every file is loaded at
most once per process (``functools.lru_cache``); optional files (for example
``web/public/data/extra/*.json``) are allowed to be missing.

The repository root defaults to the one this source tree lives in; set
``PALIMPSEST_ROOT`` to point the server at another checkout.
"""
from __future__ import annotations

import csv
import json
import os
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------- locations


def root() -> Path:
    env = os.environ.get("PALIMPSEST_ROOT", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    from ..paths import ROOT

    return ROOT


def path(*parts: str) -> Path:
    return root().joinpath(*parts)


def rel(p: Path) -> str:
    """Repository-relative POSIX path, for provenance fields."""
    try:
        return p.resolve().relative_to(root()).as_posix()
    except ValueError:
        return p.as_posix()


WEB = ("web", "public", "data")
PROCESSED = ("data", "processed")
TABLES = ("results", "tables")

# ---------------------------------------------------------------- constants

EXPLORER = "https://karaaliosman.github.io/palimpsest/"
REPO_URL = "https://github.com/KaraAliOsman/palimpsest"
DIOSCORIDES_TEI = (
    "https://github.com/OpenGreekAndLatin/First1KGreek/blob/master/"
    "data/tlg0656/tlg001/tlg0656.tlg001.1st1K-grc1.xml"
)
DIOSCORIDES_URN = "urn:cts:greekLit:tlg0656.tlg001.1st1K-grc1"
CULPEPER_GUTENBERG = "https://www.gutenberg.org/ebooks/49513"
EPMC_API = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
EPMC_WEB = "https://europepmc.org/search"

RESPONSIBLE_USE = (
    "Computational hypotheses for research, not medical advice. Literature co-mention "
    "measures attention, not efficacy; several historical remedies are toxic. Do not use "
    "any of this to treat or diagnose anyone."
)

ERA = {
    "dioscorides": {"author": "Dioscorides", "work": "De materia medica", "date": "c. 60 CE",
                    "language": "Ancient Greek", "edition": "ed. M. Wellmann (1906-1914), First1KGreek TEI",
                    "licence": "CC BY-SA 4.0", "url": DIOSCORIDES_TEI},
    "culpeper": {"author": "Nicholas Culpeper", "work": "The Complete Herbal", "date": "1653",
                 "language": "Early Modern English", "edition": "Project Gutenberg #49513 (1850 London ed.)",
                 "licence": "Public domain (US)", "url": CULPEPER_GUTENBERG},
}
POSITIVE = ("therapeutic", "action")

# ---------------------------------------------------------------- text folding

_PUNCT = re.compile(r"[\s\-‐-―_/,;:·.()\[\]{}]+")


def fold(s: Any) -> str:
    """Case-, accent-, breathing- and final-sigma-insensitive key.

    ``ἀψίνθιον``, ``αψινθιον`` and ``ΑΨΙΝΘΙΟΝ`` all fold to ``αψινθιον``;
    ``Garden-Rue`` folds to ``garden rue``; ``Æ`` and ``ß`` are expanded.
    """
    if s is None:
        return ""
    s = str(s)
    s = s.replace("’", "'").replace("ʼ", "'").replace("᾿", "'").replace("Æ", "ae").replace("æ", "ae")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.casefold().replace("ς", "σ")
    s = s.replace("'", "")
    return _PUNCT.sub(" ", s).strip()


def slugify(taxon: str) -> str:
    s = unicodedata.normalize("NFD", taxon)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "plant"


# ---------------------------------------------------------------- loaders


def _json(*parts: str) -> Any:
    p = path(*parts)
    with p.open(encoding="utf-8") as fh:
        return json.load(fh)


def _csv(*parts: str) -> list[dict[str, str]]:
    p = path(*parts)
    with p.open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def num(v: Any) -> Any:
    """CSV cell -> int / float / bool / None (or the string itself)."""
    if v is None:
        return None
    if isinstance(v, (int, float, bool)):
        return v
    s = str(v).strip()
    if s == "" or s.lower() == "nan":
        return None
    if s in ("True", "False"):
        return s == "True"
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        return s


@lru_cache(maxsize=None)
def plants() -> list[dict]:
    return _json(*WEB, "plants.json")


@lru_cache(maxsize=None)
def plants_by_taxon() -> dict[str, dict]:
    return {p["taxon"]: p for p in plants()}


@lru_cache(maxsize=None)
def texts() -> dict[str, dict]:
    return _json(*WEB, "texts.json")


@lru_cache(maxsize=None)
def leads() -> list[dict]:
    return _json(*WEB, "leads.json")


@lru_cache(maxsize=None)
def leads_table() -> dict[int, dict]:
    """``results/tables/leads.csv`` (score components) keyed by rank."""
    try:
        rows = _csv(*TABLES, "leads.csv")
    except FileNotFoundError:
        return {}
    return {int(r["rank"]): {k: num(v) for k, v in r.items()} for r in rows}


@lru_cache(maxsize=None)
def summary() -> dict:
    return _json(*WEB, "summary.json")


@lru_cache(maxsize=None)
def key_numbers() -> dict:
    return _json("results", "key_numbers.json")


@lru_cache(maxsize=None)
def stats() -> dict:
    return _json("results", "stats.json")


@lru_cache(maxsize=None)
def evidence_meta() -> dict:
    try:
        return _json("results", "evidence_meta.json")
    except FileNotFoundError:
        return {}


@lru_cache(maxsize=None)
def concepts() -> dict[str, dict]:
    """Concept table (``data/lexicons/concepts.csv``) + per-source counts from ``concepts.json``."""
    out: dict[str, dict] = {}
    for r in _csv("data", "lexicons", "concepts.csv"):
        terms = [t.strip() for t in (r.get("epmc_terms") or "").split("|") if t.strip()]
        out[r["concept_id"]] = {
            "concept_id": r["concept_id"], "label": r["label"], "category": r["category"],
            "mesh_id": r.get("mesh_id") or None,
            "mesh_label": r.get("mesh_ui_label") or r.get("mesh_label") or None,
            "epmc_terms": terms,
        }
    try:
        for c in _json(*WEB, "concepts.json"):
            if c["concept_id"] in out:
                out[c["concept_id"]].update(n_dsc_taxa=c.get("n_dsc"), n_cul_taxa=c.get("n_cul"))
    except FileNotFoundError:
        pass
    return out


@lru_cache(maxsize=None)
def monograph_taxa() -> dict[str, dict]:
    return {r["monograph_id"]: r for r in _csv(*PROCESSED, "monograph_taxa.csv")}


@lru_cache(maxsize=None)
def monographs_meta() -> dict[str, dict]:
    """Small fields from ``data/interim/monographs.jsonl`` (names, synonyms, book/chapter)."""
    out: dict[str, dict] = {}
    p = path("data", "interim", "monographs.jsonl")
    if not p.exists():
        return out
    with p.open(encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            m = json.loads(line)
            out[m["id"]] = {k: m.get(k) for k in ("id", "source", "ref", "headword", "names",
                                                   "synonyms", "book", "chapter")}
    return out


@lru_cache(maxsize=None)
def claims_by_monograph() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for r in _csv(*PROCESSED, "claims.csv"):
        out.setdefault(r["monograph_id"], []).append({
            "claim_id": r["claim_id"], "monograph_id": r["monograph_id"], "source": r["source"],
            "concept_id": r["concept_id"], "polarity": r["polarity"], "match": r["match"],
            "start": int(r["start"]), "end": int(r["end"]), "clause": r["clause"],
        })
    for v in out.values():
        v.sort(key=lambda c: (c["start"], c["end"]))
    return out


@lru_cache(maxsize=None)
def pairs() -> dict[tuple[str, str], dict]:
    """``data/processed/pairs_scored.csv`` keyed by (taxon, concept_id)."""
    out = {}
    for r in _csv(*PROCESSED, "pairs_scored.csv"):
        out[(r["taxon"], r["concept_id"])] = {k: num(v) for k, v in r.items()}
    return out


@lru_cache(maxsize=None)
def taxon_info() -> dict[str, dict]:
    try:
        return {r["taxon"]: {k: num(v) for k, v in r.items()} for r in _csv(*PROCESSED, "taxon_info.csv")}
    except FileNotFoundError:
        return {}


@lru_cache(maxsize=None)
def compounds() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    try:
        rows = _csv(*PROCESSED, "taxon_compounds.csv")
    except FileNotFoundError:
        return out
    for r in rows:
        out.setdefault(r["taxon"], []).append({
            "name": r.get("label") or r["compound_qid"], "wikidata": r["compound_qid"],
            "inchikey": r.get("inchikey") or None, "chembl": r.get("chembl") or None,
        })
    return out


@lru_cache(maxsize=None)
def extra() -> dict[str, Any]:
    """Every ``web/public/data/extra/*.json`` file, keyed by stem. Missing dir -> {}."""
    d = path(*WEB, "extra")
    out: dict[str, Any] = {}
    if not d.is_dir():
        return out
    for p in sorted(d.glob("*.json")):
        try:
            out[p.stem] = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue  # being written by another process, or not JSON: skip quietly
    return out


def extra_for_taxon(taxon: str) -> dict[str, Any]:
    """Records about ``taxon`` from any extra file shaped as {taxon: ...} or [{taxon: ...}]."""
    out: dict[str, Any] = {}
    for stem, payload in extra().items():
        for key in ("records", "items", "data"):
            if isinstance(payload, dict) and isinstance(payload.get(key), (list, dict)):
                payload = payload[key]
                break
        hit = None
        if isinstance(payload, dict):
            hit = payload.get(taxon, payload.get(slugify(taxon)))
        elif isinstance(payload, list):
            hit = [r for r in payload if isinstance(r, dict) and r.get("taxon") == taxon] or None
        if hit is not None:
            out[stem] = hit
    return out


# ---------------------------------------------------------------- derived indexes


@lru_cache(maxsize=None)
def monographs_by_taxon() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for mid, r in monograph_taxa().items():
        if r.get("taxon"):
            out.setdefault(r["taxon"], []).append(mid)
    return out


@lru_cache(maxsize=None)
def search_index() -> list[tuple[str, str, str, str]]:
    """(taxon, field, original value, folded value) for every searchable name."""
    mt = monograph_taxa()
    mm = monographs_meta()
    rows: list[tuple[str, str, str, str]] = []

    def add(taxon, field, value):
        if value and str(value).strip():
            rows.append((taxon, field, str(value), fold(value)))

    for p in plants():
        t = p["taxon"]
        add(t, "latin", t)
        add(t, "genus", t.split()[0])
        add(t, "family", p.get("family"))
        add(t, "english", p.get("common_name"))
        for n in p.get("names", []):
            src = n.get("source")
            add(t, "greek" if src == "dioscorides" else "english", n.get("name"))
            r = mt.get(n.get("monograph_id"), {})
            add(t, "latin", r.get("scientific_name"))
            add(t, "english", r.get("common_name_en"))
            for alt in (r.get("alternatives") or "").split(";"):
                add(t, "latin", alt.strip())
            meta = mm.get(n.get("monograph_id"), {})
            for alias in (meta.get("names") or []):
                add(t, "english", alias)
            for syn in (meta.get("synonyms") or []):
                add(t, "greek", syn)
    # de-duplicate
    seen, out = set(), []
    for r in rows:
        k = (r[0], r[1], r[3])
        if k not in seen:
            seen.add(k)
            out.append(r)
    return out


def clear_caches() -> None:
    for fn in (plants, plants_by_taxon, texts, leads, leads_table, summary, key_numbers, stats,
               evidence_meta, concepts, monograph_taxa, monographs_meta, claims_by_monograph, pairs,
               taxon_info, compounds, extra, monographs_by_taxon, search_index):
        fn.cache_clear()
