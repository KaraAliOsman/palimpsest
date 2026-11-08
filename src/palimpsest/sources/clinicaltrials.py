"""ClinicalTrials.gov (API v2) study counts.

Terms are quoted and OR-ed (Essie syntax), e.g. ``query.intr=("Artemisia
absinthium" OR "wormwood")``. Unquoted multi-word terms would be AND-ed word by
word, so we always quote. Note that broad common names can over-match
("wormwood" also hits sweet wormwood / artemisinin trials).
"""
from __future__ import annotations

from .http import get_json

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"
NAMESPACE = "clinicaltrials"


def _or_expr(terms: list[str]) -> str:
    seen, phrases = set(), []
    for t in terms or []:
        t = " ".join(str(t).replace('"', " ").split())
        if t and t.casefold() not in seen:
            seen.add(t.casefold())
            phrases.append(f'"{t}"')
    if not phrases:
        raise ValueError("no non-empty terms")
    return phrases[0] if len(phrases) == 1 else "(" + " OR ".join(phrases) + ")"


def _valid(body) -> bool:
    return isinstance(body, dict) and isinstance(body.get("totalCount"), int)


def trial_count(intervention_terms: list[str], condition_terms: list[str] | None = None,
                **kw) -> int:
    """Number of registered studies whose intervention matches any of
    ``intervention_terms`` (and, if given, whose condition matches any of
    ``condition_terms``)."""
    params = {"query.intr": _or_expr(intervention_terms), "countTotal": "true",
              "pageSize": 1, "format": "json"}
    if condition_terms:
        params["query.cond"] = _or_expr(condition_terms)
    body = get_json(BASE_URL, params, namespace=NAMESPACE, validate=_valid, **kw)
    return int(body["totalCount"])
