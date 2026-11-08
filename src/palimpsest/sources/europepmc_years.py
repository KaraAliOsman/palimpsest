"""Europe PMC co-mention counts restricted to publication-year windows (P5).

Field syntax (verified experimentally 2026-11-08, REST API, same queries as
:mod:`palimpsest.sources.europepmc`):

* ``PUB_YEAR:[1000 TO 2010]`` and ``PUB_YEAR:[2011 TO 2100]`` **partition** the
  hits exactly: *Artemisia absinthium* (TITLE_ABS/KW) 480 = 107 + 373; the
  wormwood x jaundice pair 2 = 1 + 1. Brackets are inclusive.
* ``FIRST_PDATE:[1000-01-01 TO 2010-12-31]`` also partitions (109 + 371): it is
  the first (often electronic) publication date, so a few records move one year
  earlier. We use ``PUB_YEAR`` (the citation year) as primary.
* Wrapping the base query in parentheses does not change the count (107 both
  ways), and an unknown field still silently returns 0 (so field names are
  constants here).

Every request goes through :mod:`palimpsest.sources.http` (cache, rate limits).
"""
from __future__ import annotations

from .europepmc import concept_query, hit_count, taxon_query

YEAR_MIN, YEAR_MAX = 1000, 2100
FIELD = "PUB_YEAR"


def year_clause(lo: int | None = None, hi: int | None = None, field: str = FIELD) -> str:
    lo = YEAR_MIN if lo is None else int(lo)
    hi = YEAR_MAX if hi is None else int(hi)
    if lo > hi:
        raise ValueError("empty year window")
    if field == "FIRST_PDATE":
        return f"FIRST_PDATE:[{lo}-01-01 TO {hi}-12-31]"
    if field != "PUB_YEAR":
        raise ValueError(f"unsupported field {field!r}")
    return f"PUB_YEAR:[{lo} TO {hi}]"


def windowed(query: str, lo: int | None = None, hi: int | None = None, field: str = FIELD) -> str:
    return f"({query}) AND {year_clause(lo, hi, field)}"


def pair_query(binomial: str, terms: list[str]) -> str:
    """Identical to the primary pair query (``taxon AND concept``)."""
    return f"{taxon_query(binomial)} AND {concept_query(terms)}"


def pair_count_window(binomial: str, terms: list[str], lo: int | None = None,
                      hi: int | None = None, **kw) -> int:
    return hit_count(windowed(pair_query(binomial, terms), lo, hi), **kw)


def taxon_count_window(binomial: str, lo: int | None = None, hi: int | None = None, **kw) -> int:
    return hit_count(windowed(taxon_query(binomial), lo, hi), **kw)
