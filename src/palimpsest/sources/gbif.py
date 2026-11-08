"""GBIF backbone name matching, occurrence counts and vernacular names (API v1)."""
from __future__ import annotations

import re

from .http import FetchError, get_json

API = "https://api.gbif.org/v1"
NAMESPACE = "gbif"

#: matchTypes that do not identify the requested name (HIGHERRANK = fell back to
#: e.g. the genus or the kingdom) — such matches get ``usageKey=None``.
NON_MATCHES = frozenset({"NONE", "HIGHERRANK"})


def _species(key: int | str, **kw) -> dict:
    return get_json(f"{API}/species/{int(key)}", namespace=NAMESPACE, **kw)


def match(name: str, kingdom: str = "Plantae", rank: str | None = None, **kw) -> dict:
    """Match ``name`` against the GBIF backbone and resolve synonyms.

    Returns ``usageKey`` (the matched usage, may be a synonym),
    ``acceptedUsageKey`` (the accepted taxon; equals ``usageKey`` when the
    match is already accepted), ``scientificName``/``canonicalName``/``rank``
    of the **accepted** taxon, ``status`` of the matched usage (``ACCEPTED``,
    ``SYNONYM``, ``DOUBTFUL``...), ``family``, ``genus``, ``matchType``,
    ``confidence``, plus ``matchedName`` (canonical name actually matched).

    A one-word name is matched at rank GENUS unless ``rank`` is given (without
    it GBIF returns odd placeholder "species" such as "Artemisia spec").
    ``matchType`` NONE/HIGHERRANK yields ``usageKey = acceptedUsageKey = None``.
    """
    name = " ".join(name.split())
    if rank is None and len(name.split()) == 1:
        rank = "GENUS"
    params = {"name": name, "kingdom": kingdom, "rank": rank}
    m = get_json(f"{API}/species/match", params, namespace=NAMESPACE, **kw)
    out = {
        "query": name,
        "usageKey": m.get("usageKey"),
        "acceptedUsageKey": m.get("acceptedUsageKey") or m.get("usageKey"),
        "scientificName": m.get("scientificName"),
        "canonicalName": m.get("canonicalName"),
        "matchedName": m.get("canonicalName"),
        "rank": m.get("rank"),
        "status": m.get("status"),
        "family": m.get("family"),
        "genus": m.get("genus"),
        "kingdom": m.get("kingdom"),
        "matchType": m.get("matchType", "NONE"),
        "confidence": m.get("confidence"),
    }
    if out["matchType"] in NON_MATCHES:
        out.update(usageKey=None, acceptedUsageKey=None)
        return out
    acc = m.get("acceptedUsageKey")
    if acc and acc != m.get("usageKey"):
        a = _species(acc, **kw)
        out.update(scientificName=a.get("scientificName"),
                   canonicalName=a.get("canonicalName"),
                   rank=a.get("rank"),
                   family=a.get("family", out["family"]),
                   genus=a.get("genus", out["genus"]))
    return out


def occurrence_count(taxon_key: int | str, **kw) -> int:
    """Occurrence records interpreted to ``taxon_key`` (incl. children/synonyms)."""
    body = get_json(f"{API}/occurrence/search", {"taxonKey": int(taxon_key), "limit": 0},
                    namespace=NAMESPACE,
                    validate=lambda b: isinstance(b, dict) and isinstance(b.get("count"), int),
                    **kw)
    return int(body["count"])


_QUALIFIER = re.compile(r"\s*\[[^\]]*\]\s*$")


def vernacular_names(key: int | str, lang: str | None = "eng", **kw) -> list[str]:
    """Distinct vernacular names (ISO 639-2 ``lang``, e.g. 'eng'; None = all),
    de-duplicated case-insensitively in API order, trailing ``[plant]``-style
    qualifiers removed. Returns [] for an unknown key."""
    names, seen, offset = [], set(), 0
    while True:
        try:
            page = get_json(f"{API}/species/{int(key)}/vernacularNames",
                            {"limit": 1000, "offset": offset}, namespace=NAMESPACE, **kw)
        except FetchError as exc:
            if exc.status == 404:
                return []
            raise
        results = page.get("results", [])
        for r in results:
            if lang is not None and r.get("language") != lang:
                continue
            n = _QUALIFIER.sub("", " ".join((r.get("vernacularName") or "").split()))
            if n and n.casefold() not in seen:
                seen.add(n.casefold())
                names.append(n)
        if page.get("endOfRecords", True) or not results:
            return names
        offset += len(results)
