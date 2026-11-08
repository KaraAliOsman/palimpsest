"""Cached, rate-limited JSON-body POST (GraphQL) on top of :mod:`.http`.

:func:`palimpsest.sources.http.fetch` form-encodes POST bodies; GraphQL
endpoints (Open Targets Platform v4) need ``application/json``. This helper
reuses http's per-host token buckets, retry policy constants, cache layout
(``data/cache/<namespace>/<sha1>.json``) and offline mode, so every request is
still cached and polite. Responses with GraphQL ``errors`` and no ``data`` are
not cached.
"""
from __future__ import annotations

import json
import time
from urllib.parse import urlsplit

import requests

from . import http


def post_json(url: str, payload: dict, namespace: str, offline: bool | None = None,
              retries: int | None = None) -> dict:
    body_key = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    key = f"POSTJSON {url}\n{body_key}"
    path = http.cache_path(namespace, key)
    rec = http._read_cache(path)
    if rec is not None:
        http._bump("cache_hits")
        return rec["body"]
    if http.is_offline(offline):
        raise http.OfflineCacheMiss(f"offline cache miss [{namespace}] {key[:200]}", url=url)
    bucket = http.bucket_for(urlsplit(url).hostname or "")
    max_retries = http.MAX_RETRIES if retries is None else retries
    last = ""
    for attempt in range(max_retries + 1):
        bucket.acquire()
        http._bump("network")
        try:
            r = http._session().post(url, data=body_key.encode("utf-8"), timeout=http.DEFAULT_TIMEOUT,
                                     headers={"Content-Type": "application/json", "Accept": "application/json",
                                              "User-Agent": http.USER_AGENT})
        except (requests.Timeout, requests.ConnectionError) as exc:
            last = str(exc)
        else:
            if r.status_code == 200:
                try:
                    body = r.json()
                except ValueError:
                    body, last = None, "unparsable JSON"
                if isinstance(body, dict) and body.get("data") is not None:
                    http._write_cache(path, {"url": url, "method": "POSTJSON", "status": 200, "body": body,
                                             "data": payload,
                                             "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
                    return body
                last = f"GraphQL error: {str(body)[:300]}"
                if isinstance(body, dict) and body.get("errors") and attempt >= 1:
                    raise http.FetchError(last, url=url, status=200)
            elif r.status_code in http.RETRY_STATUS:
                last = f"HTTP {r.status_code}"
            else:
                raise http.FetchError(f"HTTP {r.status_code}: {r.text[:300]}", url=url, status=r.status_code)
        if attempt < max_retries:
            http._sleep(http._backoff(attempt))
    raise http.FetchError(f"giving up ({last})", url=url)
