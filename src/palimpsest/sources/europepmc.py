"""Europe PMC hit counts for taxon / concept / taxon×concept co-occurrence.

Query syntax (determined experimentally, 2026-11-07, REST API v6.9)
-------------------------------------------------------------------
* ``TITLE_ABS:"x"`` is a real field and equals ``TITLE:"x" OR ABSTRACT:"x"``
  exactly (Artemisia absinthium: 462 both ways; TITLE 232, ABSTRACT 426).
* ``KW:"x"`` (author keywords) adds a few records (462 -> 480); an unrestricted
  ``"Artemisia absinthium"`` (full text, refs, ...) gives 1693, so the
  restriction behaves as expected (restricted <= unrestricted).
* Unknown fields (e.g. ``FOOBAR:"x"``) silently return 0, so field names are
  fixed constants here, never user input.
* Field grouping ``TITLE_ABS:("a" OR "b")`` returns the same count as the
  expanded form (malaria|plasmodium: 146705 both ways) and keeps URLs short.
* Phrases are not stemmed (``"wound"`` 298636 vs ``"wounds"`` 97720), are
  case-insensitive, hyphens tokenise as spaces, and the hybrid sign ``×`` is
  dropped. ``synonym=false`` (no MeSH expansion) is sent explicitly.

So a binomial is ``(TITLE_ABS:"Genus species" OR KW:"Genus species")`` and a
concept is ``(TITLE_ABS:("t1" OR "t2" ...) OR KW:("t1" OR "t2" ...))``.

N for lift
----------
:func:`total_records` returns the hitCount of ``(TITLE_ABS:* OR KW:*)``: the
records that *have* a title, abstract or keyword, i.e. the universe that the
field-restricted queries above can match (48,227,744 on 2026-11-07, vs
49,193,995 for ``*``). The wildcard query is slow (~11 s) and intermittently
503s; retries handle that and the value is cached alongside all other counts,
so N and the counts always come from the same snapshot.
"""
from __future__ import annotations

import re
from typing import Iterable

from .http import get_json

BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
NAMESPACE = "europepmc"
TOTAL_QUERY = "(TITLE_ABS:* OR KW:*)"


def _phrase(term: str) -> str:
    t = re.sub(r"\s+", " ", term.replace('"', " ")).strip()
    if not t:
        raise ValueError(f"empty search term: {term!r}")
    return f'"{t}"'


def _unique_terms(terms: Iterable[str]) -> list[str]:
    seen, out = set(), []
    for t in terms:
        if t is None or not str(t).strip():
            continue
        p = _phrase(str(t))
        k = p.casefold()
        if k not in seen:
            seen.add(k)
            out.append(p)
    if not out:
        raise ValueError("no non-empty terms")
    return out


def taxon_query(binomial: str) -> str:
    """Exact quoted binomial in title/abstract or author keywords."""
    p = _phrase(binomial)
    return f"(TITLE_ABS:{p} OR KW:{p})"


def concept_query(terms: list[str]) -> str:
    """OR of quoted terms, each in title/abstract or author keywords."""
    phrases = _unique_terms(terms)
    inner = phrases[0] if len(phrases) == 1 else "(" + " OR ".join(phrases) + ")"
    return f"(TITLE_ABS:{inner} OR KW:{inner})"


def pair_query(binomial: str, terms: list[str]) -> str:
    return f"{taxon_query(binomial)} AND {concept_query(terms)}"


def _valid(body) -> bool:
    return isinstance(body, dict) and isinstance(body.get("hitCount"), int)


def hit_count(query: str, **kw) -> int:
    """Number of Europe PMC records matching ``query`` (cached)."""
    body = get_json(BASE_URL, {"query": query, "resultType": "idlist", "pageSize": 1,
                               "format": "json", "synonym": "false"},
                    namespace=NAMESPACE, validate=_valid, **kw)
    return int(body["hitCount"])


def taxon_count(binomial: str, **kw) -> int:
    return hit_count(taxon_query(binomial), **kw)


def concept_count(terms: list[str], **kw) -> int:
    return hit_count(concept_query(terms), **kw)


def pair_count(binomial: str, terms: list[str], **kw) -> int:
    return hit_count(pair_query(binomial, terms), **kw)


def total_records(**kw) -> int:
    """N for lift: records with a title, abstract or keyword (see module doc)."""
    return hit_count(TOTAL_QUERY, **kw)
