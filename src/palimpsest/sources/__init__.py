"""Data-source connectors (Europe PMC, ClinicalTrials.gov, GBIF, Wikidata, MeSH).

Import the submodules directly, e.g. ``from palimpsest.sources import
europepmc``. Every request goes through :mod:`palimpsest.sources.http`, which
caches the raw response under ``data/cache/<namespace>/`` (re-runs are offline
and deterministic; set ``PALIMPSEST_OFFLINE=1`` to forbid network access), rate
limits per host and retries transient failures. All public functions are safe
to call from a ``ThreadPoolExecutor``.
"""
from .http import FetchError, OfflineCacheMiss, get_json, get_text

__all__ = ["FetchError", "OfflineCacheMiss", "get_json", "get_text"]
