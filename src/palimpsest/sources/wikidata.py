"""Wikidata SPARQL: taxon QIDs, LOTUS compounds (P703), IUCN status, names.

All queries are POSTed to WDQS with ``VALUES`` batches of <= 150 items. Input
values are de-duplicated and sorted before batching so cache keys do not
depend on caller order. A batch that keeps failing (WDQS 60 s timeout) is
split in half recursively, online and offline alike.
"""
from __future__ import annotations

import re
from typing import Callable, Iterable

from .http import FetchError, get_json

ENDPOINT = "https://query.wikidata.org/sparql"
NAMESPACE = "wikidata"
BATCH = 150
COMPOUND_BATCH = 100
SPARQL_RETRIES = 3

#: P141 (IUCN conservation status) value -> Red List code. Verified against
#: the en labels and P141 usage counts on 2026-11-07. Q96377276 is the current
#: "endangered" item (Q11394 "endangered species" is a legacy value). NE and
#: LR (former category) are kept as codes too.
IUCN_CODES: dict[str, str] = {
    "Q211005": "LC",
    "Q719675": "NT",
    "Q278113": "VU",
    "Q96377276": "EN",
    "Q11394": "EN",
    "Q219127": "CR",
    "Q239509": "EW",
    "Q237350": "EX",
    "Q3245245": "DD",
    "Q3350324": "NE",
    "Q6693756": "LR",
    "Q158862": "LR",  # lower risk / conservation dependent (former)
}
#: When an item has several P141 values, the most severe wins.
SEVERITY = ["EX", "EW", "CR", "EN", "VU", "NT", "LR", "LC", "DD", "NE"]

_QID = re.compile(r"Q[1-9]\d*$")


def qid(uri: str) -> str:
    return uri.rsplit("/", 1)[-1]


def _qnum(q: str) -> int:
    return int(q[1:])


def _check_qids(qids: Iterable[str]) -> list[str]:
    out = sorted({q.strip() for q in qids if q and q.strip()}, key=_qnum)
    bad = [q for q in out if not _QID.match(q)]
    if bad:
        raise ValueError(f"not QIDs: {bad[:5]}")
    return out


def _lit(s: str) -> str:
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def _valid(body) -> bool:
    return isinstance(body, dict) and isinstance(body.get("results", {}).get("bindings"), list)


def sparql(query: str, **kw) -> list[dict]:
    """Run a SELECT query; returns the raw ``results.bindings`` list (cached)."""
    kw.setdefault("retries", SPARQL_RETRIES)
    body = get_json(ENDPOINT, {"format": "json"}, namespace=NAMESPACE, method="POST",
                    data={"query": query},
                    headers={"Accept": "application/sparql-results+json"},
                    validate=_valid, **kw)
    return body["results"]["bindings"]


def _batched(values: list, build: Callable[[list], str], batch_size: int, **kw) -> list[dict]:
    rows: list[dict] = []

    def run(chunk: list) -> None:
        try:
            rows.extend(sparql(build(chunk), **kw))
        except FetchError as exc:
            if len(chunk) == 1 or exc.status == 400:  # 400 = malformed query: don't split
                raise
            mid = len(chunk) // 2
            run(chunk[:mid])
            run(chunk[mid:])

    batch_size = max(1, min(batch_size, BATCH))
    for i in range(0, len(values), batch_size):
        run(values[i:i + batch_size])
    return rows


def _v(row: dict, var: str) -> str | None:
    x = row.get(var)
    return x["value"] if x else None


# --------------------------------------------------------------------------
def qids_for_gbif_keys(keys: Iterable[int | str], **kw) -> dict:
    """GBIF taxon key -> QID via P846 (lowest QID if several). Missing keys are
    absent from the result. Keys are returned as given (int or str)."""
    by_str = {str(k).strip(): k for k in keys if str(k).strip()}
    vals = sorted(by_str, key=lambda s: (len(s), s))

    def build(chunk):
        return ("SELECT ?item ?key WHERE { VALUES ?key { " + " ".join(_lit(k) for k in chunk)
                + " } ?item wdt:P846 ?key . }")

    out: dict = {}
    for r in _batched(vals, build, BATCH, **kw):
        k, q = _v(r, "key"), qid(_v(r, "item"))
        orig = by_str[k]
        if orig not in out or _qnum(q) < _qnum(out[orig]):
            out[orig] = q
    return out


def qids_for_names(names: Iterable[str], **kw) -> dict[str, str]:
    """Taxon name -> QID via P225 (exact string). If several items share the
    name (homonyms), items with a GBIF id (P846) win, then the lowest QID."""
    vals = sorted({" ".join(n.split()) for n in names if n and n.strip()})

    def build(chunk):
        return ("SELECT ?item ?name ?gbif WHERE { VALUES ?name { "
                + " ".join(_lit(n) for n in chunk)
                + " } ?item wdt:P225 ?name . OPTIONAL { ?item wdt:P846 ?gbif } }")

    best: dict[str, tuple] = {}
    for r in _batched(vals, build, BATCH, **kw):
        n, q = _v(r, "name"), qid(_v(r, "item"))
        rank = (0 if _v(r, "gbif") else 1, _qnum(q))
        if n not in best or rank < best[n][0]:
            best[n] = (rank, q)
    return {n: v[1] for n, v in best.items()}


def compounds_for_taxa(qids: Iterable[str], batch_size: int = COMPOUND_BATCH, **kw) -> dict:
    """Compounds reported in each taxon (P703 'found in taxon', the LOTUS import).

    Only subjects with an InChIKey (P235) are kept, which excludes gene/protein
    items that also use P703. Returns::

        {"compounds": {taxon_qid: [{"qid", "label", "inchikey", "chembl"}, ...]},
         "counts":    {taxon_qid: n_distinct_compounds}}

    with every requested taxon present (``[]`` / 0 when none). Compounds are
    sorted by QID number; when a compound has several InChIKeys/ChEMBL ids/en
    labels the lexicographically smallest is kept.
    """
    vals = _check_qids(qids)

    def build(chunk):
        return ("SELECT ?taxon ?c ?ik ?chembl ?label WHERE { VALUES ?taxon { "
                + " ".join(f"wd:{q}" for q in chunk)
                + " } ?c wdt:P703 ?taxon . ?c wdt:P235 ?ik ."
                " OPTIONAL { ?c wdt:P592 ?chembl }"
                ' OPTIONAL { ?c rdfs:label ?label FILTER(LANG(?label) = "en") } }')

    agg: dict[str, dict[str, dict]] = {q: {} for q in vals}
    for r in _batched(vals, build, batch_size, **kw):
        t, c = qid(_v(r, "taxon")), qid(_v(r, "c"))
        rec = agg.setdefault(t, {}).setdefault(c, {"qid": c, "label": None,
                                                   "inchikey": None, "chembl": None})
        for field, var in (("label", "label"), ("inchikey", "ik"), ("chembl", "chembl")):
            val = _v(r, var)
            if val is not None and (rec[field] is None or val < rec[field]):
                rec[field] = val
    compounds = {t: sorted(d.values(), key=lambda x: _qnum(x["qid"])) for t, d in agg.items()}
    return {"compounds": compounds, "counts": {t: len(v) for t, v in compounds.items()}}


def compound_counts(qids: Iterable[str], **kw) -> dict[str, int]:
    """Cheap per-taxon count of distinct P703 compounds with an InChIKey."""
    vals = _check_qids(qids)

    def build(chunk):
        return ("SELECT ?taxon (COUNT(DISTINCT ?c) AS ?n) WHERE { VALUES ?taxon { "
                + " ".join(f"wd:{q}" for q in chunk)
                + " } ?c wdt:P703 ?taxon . ?c wdt:P235 ?ik . } GROUP BY ?taxon")

    out = {q: 0 for q in vals}
    for r in _batched(vals, build, BATCH, **kw):
        out[qid(_v(r, "taxon"))] = int(_v(r, "n"))
    return out


def iucn_status(qids: Iterable[str], **kw) -> dict[str, str | None]:
    """QID -> IUCN Red List code (LC/NT/VU/EN/CR/EW/EX/DD, also NE/LR) from
    P141; None when absent or unmapped. Several values -> most severe."""
    vals = _check_qids(qids)

    def build(chunk):
        return ("SELECT ?item ?st WHERE { VALUES ?item { "
                + " ".join(f"wd:{q}" for q in chunk) + " } ?item wdt:P141 ?st . }")

    out: dict[str, str | None] = {q: None for q in vals}
    for r in _batched(vals, build, BATCH, **kw):
        item, code = qid(_v(r, "item")), IUCN_CODES.get(qid(_v(r, "st")))
        if code is None:
            continue
        cur = out.get(item)
        if cur is None or SEVERITY.index(code) < SEVERITY.index(cur):
            out[item] = code
    return out


def names_for_qids(qids: Iterable[str], langs: tuple[str, ...] = ("grc", "el", "la", "en"),
                   **kw) -> dict[str, dict]:
    """QID -> ``{"labels": {lang: label}, "aliases": {lang: [alias, ...]},
    "taxon_names": [P225 ...]}`` for the given languages (aliases sorted)."""
    vals = _check_qids(qids)
    lang_list = ", ".join(_lit(l) for l in langs)

    def build(chunk):
        return ("SELECT ?item ?l ?kind WHERE { VALUES ?item { "
                + " ".join(f"wd:{q}" for q in chunk) + " } "
                '{ ?item rdfs:label ?l BIND("label" AS ?kind) } UNION '
                '{ ?item skos:altLabel ?l BIND("alias" AS ?kind) } UNION '
                '{ ?item wdt:P225 ?l BIND("taxon" AS ?kind) } '
                f'FILTER(?kind = "taxon" || LANG(?l) IN ({lang_list})) }}')

    out = {q: {"labels": {}, "aliases": {}, "taxon_names": []} for q in vals}
    for r in _batched(vals, build, BATCH, **kw):
        item, kind = qid(_v(r, "item")), _v(r, "kind")
        lit = r["l"]
        val, lang = lit["value"], lit.get("xml:lang", "")
        d = out.setdefault(item, {"labels": {}, "aliases": {}, "taxon_names": []})
        if kind == "label":
            d["labels"][lang] = val
        elif kind == "alias":
            d["aliases"].setdefault(lang, []).append(val)
        elif val not in d["taxon_names"]:
            d["taxon_names"].append(val)
    for d in out.values():
        d["aliases"] = {k: sorted(set(v)) for k, v in sorted(d["aliases"].items())}
        d["taxon_names"].sort()
    return out
