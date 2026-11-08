"""Polite, cached, thread-safe HTTP for every data-source connector.

* **Disk cache** — every successful (and every deterministic client-error)
  response is stored at ``data/cache/<namespace>/<sha1(key)>.json`` as
  ``{"url", "method", "status", "body", "fetched_at"}`` (plus ``"data"`` for
  POST). The key is the full canonical URL (params sorted), with the POST body
  appended for POST requests. A re-run therefore never touches the network.
* **Offline mode** — ``offline=True`` or env ``PALIMPSEST_OFFLINE=1``: only the
  cache is read; a miss raises :class:`OfflineCacheMiss`.
* **Rate limiting** — one token bucket per host (see :data:`RATES`), shared by
  all threads; a 429/``Retry-After`` pauses the whole host, not just one thread.
* **Retries** — exponential backoff with jitter on 429, 5xx, 408, timeouts,
  connection errors, unparsable JSON and bodies rejected by ``validate``;
  ``Retry-After`` (seconds or HTTP date) is honoured. Such failures are never
  cached.
"""
from __future__ import annotations

import email.utils
import hashlib
import json
import os
import random
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlencode, urlsplit

import requests
from requests.adapters import HTTPAdapter

from ..paths import CACHE

USER_AGENT = (
    "palimpsest-ethnohack/0.1 (research prototype; "
    "https://github.com/KaraAliOsman/palimpsest)"
)

#: Requests per second allowed per host.
RATES: dict[str, float] = {
    "www.ebi.ac.uk": 8,
    "eutils.ncbi.nlm.nih.gov": 3,
    "api.gbif.org": 8,
    "query.wikidata.org": 2,
    "clinicaltrials.gov": 5,
    "id.nlm.nih.gov": 5,
}
DEFAULT_RATE: float = 4

#: Root of the on-disk cache (monkeypatch in tests).
CACHE_ROOT: Path = CACHE

MAX_RETRIES = 6
BACKOFF_BASE = 1.0  # seconds; delay = base * 2**attempt (+ jitter), capped
BACKOFF_CAP = 60.0
RETRY_AFTER_CAP = 300.0
DEFAULT_TIMEOUT = (15, 120)  # (connect, read) seconds

RETRY_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})
#: Client errors that are deterministic for a given URL and therefore cached.
CACHEABLE_ERROR_STATUS = frozenset({400, 404, 410})

_sleep = time.sleep  # indirection so tests can avoid real sleeping


class FetchError(RuntimeError):
    """Non-success HTTP response (possibly served from cache) or retries exhausted."""

    def __init__(self, message: str, url: str = "", status: int | None = None):
        super().__init__(message)
        self.url = url
        self.status = status


class OfflineCacheMiss(FetchError):
    """Offline mode is on and the request is not in the cache."""


class InvalidResponse(Exception):
    """Raised (internally) when a body fails parsing or ``validate``."""


# --------------------------------------------------------------------------
# Rate limiting
# --------------------------------------------------------------------------
class TokenBucket:
    """Thread-safe token bucket.

    ``acquire()`` reserves a token under the lock (the token count may go
    negative, which queues later callers) and sleeps *outside* the lock, so
    the long-run rate is exactly ``rate`` per second whatever the number of
    threads, with at most ``burst`` back-to-back requests.
    """

    def __init__(self, rate: float, burst: float = 1.0,
                 clock: Callable[[], float] = time.monotonic,
                 sleep: Callable[[float], None] | None = None):
        if rate <= 0:
            raise ValueError("rate must be > 0")
        self.rate = float(rate)
        self.capacity = max(1.0, float(burst))
        self._tokens = self.capacity
        self._clock = clock
        self._sleep = sleep
        self._last = clock()
        self._lock = threading.Lock()

    def _refill(self, now: float) -> None:
        self._tokens = min(self.capacity, self._tokens + (now - self._last) * self.rate)
        self._last = now

    def acquire(self) -> float:
        """Take one token, sleeping as needed. Returns the time waited."""
        with self._lock:
            self._refill(self._clock())
            self._tokens -= 1.0
            wait = 0.0 if self._tokens >= 0 else -self._tokens / self.rate
        if wait > 0:
            (self._sleep or _sleep)(wait)
        return wait

    def penalize(self, seconds: float) -> None:
        """Make every caller of this bucket wait ~``seconds`` (e.g. Retry-After)."""
        with self._lock:
            self._refill(self._clock())
            self._tokens = min(self._tokens, 0.0) - seconds * self.rate


_buckets: dict[str, TokenBucket] = {}
_buckets_lock = threading.Lock()


def rate_for(host: str) -> float:
    return RATES.get(host, DEFAULT_RATE)


def bucket_for(host: str) -> TokenBucket:
    with _buckets_lock:
        b = _buckets.get(host)
        if b is None:
            b = _buckets[host] = TokenBucket(rate_for(host))
        return b


def reset_rate_limiters() -> None:
    with _buckets_lock:
        _buckets.clear()


# --------------------------------------------------------------------------
# Cache
# --------------------------------------------------------------------------
_stats_lock = threading.Lock()
stats = {"cache_hits": 0, "network": 0, "retries": 0}


def _bump(key: str) -> None:
    with _stats_lock:
        stats[key] += 1


def is_offline(offline: bool | None = None) -> bool:
    if offline is not None:
        return offline
    return os.environ.get("PALIMPSEST_OFFLINE", "").strip().lower() in {"1", "true", "yes", "on"}


def _norm_params(params: Any) -> list[tuple[str, str]]:
    if not params:
        return []
    items = params.items() if isinstance(params, dict) else params
    out = []
    for k, v in items:
        if v is None:
            continue
        if isinstance(v, bool):
            v = "true" if v else "false"
        out.append((str(k), str(v)))
    return sorted(out)


def full_url(url: str, params: Any = None) -> str:
    """Canonical URL: base URL + sorted, url-encoded params."""
    p = _norm_params(params)
    if not p:
        return url
    return url + ("&" if "?" in url else "?") + urlencode(p)


def cache_key(url: str, params: Any = None, method: str = "GET", data: Any = None) -> str:
    key = full_url(url, params)
    if method.upper() != "GET":
        key = f"{method.upper()} {key}\n{urlencode(_norm_params(data))}"
    return key


def cache_path(namespace: str, key: str) -> Path:
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()
    return Path(CACHE_ROOT) / namespace / f"{digest}.json"


def _read_cache(path: Path) -> dict | None:
    for attempt in range(5):
        try:
            with path.open(encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            return None
        except PermissionError:  # Windows: file being replaced by another thread
            time.sleep(0.02 * (attempt + 1))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None  # corrupt entry: refetch
    return None


def _write_cache(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(record, fh, ensure_ascii=False)
        for attempt in range(5):  # Windows: target may be briefly open by a reader
            try:
                os.replace(tmp, path)
                return
            except PermissionError:
                time.sleep(0.05 * (attempt + 1))
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass


# --------------------------------------------------------------------------
# Fetching
# --------------------------------------------------------------------------
_local = threading.local()


def _session() -> requests.Session:
    s = getattr(_local, "session", None)
    if s is None:
        s = requests.Session()
        s.headers["User-Agent"] = USER_AGENT
        adapter = HTTPAdapter(pool_connections=8, pool_maxsize=32)
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        _local.session = s
    return s


def _retry_after(value: str | None) -> float | None:
    if not value:
        return None
    value = value.strip()
    try:
        secs = float(value)
    except ValueError:
        try:
            dt = email.utils.parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None
        secs = dt.timestamp() - time.time()
    return max(0.0, min(secs, RETRY_AFTER_CAP))


def _backoff(attempt: int) -> float:
    return min(BACKOFF_CAP, BACKOFF_BASE * (2 ** attempt)) * (1 + 0.25 * random.random())


def _decode(resp: requests.Response, as_json: bool) -> Any:
    if not as_json:
        return resp.text
    try:
        return resp.json()
    except ValueError as exc:
        raise InvalidResponse(f"unparsable JSON: {exc}") from exc


def _deliver(record: dict, key: str) -> Any:
    status = record.get("status", 200)
    if 200 <= status < 300:
        return record.get("body")
    raise FetchError(f"HTTP {status} for {key}", url=record.get("url", key), status=status)


def fetch(url: str, params: Any = None, namespace: str = "misc", *,
          as_json: bool = True, method: str = "GET", data: Any = None,
          headers: dict | None = None, validate: Callable[[Any], bool] | None = None,
          offline: bool | None = None, timeout: Any = DEFAULT_TIMEOUT,
          refresh: bool = False, retries: int | None = None) -> Any:
    """Cached request; returns the decoded body (JSON or text).

    ``validate(body) -> bool`` lets a connector reject a 200 response that is
    really an error (e.g. Europe PMC ``errMsg`` without ``hitCount``); rejected
    bodies are retried and never cached. ``refresh=True`` ignores the cache
    (still writes it). ``retries`` overrides :data:`MAX_RETRIES`.
    """
    method = method.upper()
    key = cache_key(url, params, method, data)
    path = cache_path(namespace, key)

    if not refresh:
        rec = _read_cache(path)
        if rec is not None:
            _bump("cache_hits")
            return _deliver(rec, key)
    if is_offline(offline):
        raise OfflineCacheMiss(f"offline cache miss [{namespace}] {key}", url=key)

    host = urlsplit(url).hostname or ""
    bucket = bucket_for(host)
    req_params = _norm_params(params)
    req_data = _norm_params(data) if data is not None else None
    hdrs = {"User-Agent": USER_AGENT}
    if as_json:
        hdrs["Accept"] = "application/json"
    if headers:
        hdrs.update(headers)

    max_retries = MAX_RETRIES if retries is None else max(0, int(retries))
    last_err = ""
    for attempt in range(max_retries + 1):
        if attempt:
            _bump("retries")
        bucket.acquire()
        _bump("network")
        delay = None
        try:
            resp = _session().request(method, url, params=req_params or None,
                                      data=req_data, headers=hdrs, timeout=timeout)
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_err = f"{type(exc).__name__}: {exc}"
        else:
            status = resp.status_code
            if status in RETRY_STATUS:
                last_err = f"HTTP {status}"
                delay = _retry_after(resp.headers.get("Retry-After"))
                if delay is not None:
                    bucket.penalize(delay)
            elif 200 <= status < 300:
                try:
                    body = _decode(resp, as_json)
                    if validate is not None and not validate(body):
                        raise InvalidResponse(f"validation failed: {str(body)[:200]}")
                except InvalidResponse as exc:
                    last_err = str(exc)
                else:
                    rec = {"url": full_url(url, params), "method": method,
                           "status": status, "body": body,
                           "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
                    if method != "GET":
                        rec["data"] = dict(req_data or [])
                    _write_cache(path, rec)
                    return body
            elif status in CACHEABLE_ERROR_STATUS:
                rec = {"url": full_url(url, params), "method": method, "status": status,
                       "body": resp.text[:2000],
                       "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
                if method != "GET":
                    rec["data"] = dict(req_data or [])
                _write_cache(path, rec)
                return _deliver(rec, key)
            else:
                raise FetchError(f"HTTP {status} for {key}: {resp.text[:300]}",
                                 url=key, status=status)
        if attempt < max_retries and delay is None:
            # (with Retry-After the host bucket was penalized instead, so the
            # next acquire() waits for every thread, not just this one)
            _sleep(_backoff(attempt))
    raise FetchError(f"giving up after {max_retries + 1} attempts ({last_err}): {key}", url=key)


def get_json(url: str, params: Any = None, namespace: str = "misc", **kw: Any) -> Any:
    """GET (or ``method='POST'`` with ``data=``) and return parsed JSON, cached."""
    return fetch(url, params, namespace, as_json=True, **kw)


def get_text(url: str, params: Any = None, namespace: str = "misc", **kw: Any) -> str:
    """Like :func:`get_json` but returns the raw text body."""
    return fetch(url, params, namespace, as_json=False, **kw)
