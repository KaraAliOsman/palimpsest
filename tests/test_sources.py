"""Tests for palimpsest.sources.

Offline unit tests monkeypatch ``requests.Session.request`` and point the cache
at a tmp dir. Tests marked ``network`` hit the live APIs (through the real
on-disk cache, so after the first run they are served from data/cache).
"""
from __future__ import annotations

import csv
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import parse_qs, urlsplit

import pytest
import requests

from palimpsest.sources import clinicaltrials, europepmc, gbif, http, mesh, wikidata


# --------------------------------------------------------------------------
# helpers / fixtures
# --------------------------------------------------------------------------
def make_resp(status=200, body=None, text=None, headers=None):
    r = requests.Response()
    r.status_code = status
    r._content = (text if text is not None else json.dumps(body)).encode("utf-8")
    r.encoding = "utf-8"
    r.headers.update(headers or {})
    return r


class FakeNet:
    """Replacement for requests.Session.request; scripted or computed responses."""

    def __init__(self, script=None, handler=None):
        self.script = list(script or [])
        self.handler = handler
        self.calls = []
        self.lock = threading.Lock()

    def __call__(self, session, method, url, params=None, data=None, headers=None, timeout=None):
        with self.lock:
            self.calls.append({"method": method, "url": url, "params": params,
                               "data": data, "headers": dict(headers or {})})
            item = self.script.pop(0) if self.script else None
        if self.handler is not None:
            return self.handler(method, url, params, data)
        if isinstance(item, BaseException):
            raise item
        return item


@pytest.fixture
def net(monkeypatch, tmp_path):
    """Isolated cache, no real sleeping, fast rate limits; returns installer."""
    monkeypatch.setattr(http, "CACHE_ROOT", tmp_path / "cache")
    monkeypatch.setattr(http, "RATES", {})
    monkeypatch.setattr(http, "DEFAULT_RATE", 10_000)
    sleeps = []
    monkeypatch.setattr(http, "_sleep", sleeps.append)
    monkeypatch.delenv("PALIMPSEST_OFFLINE", raising=False)
    http.reset_rate_limiters()

    def install(script=None, handler=None):
        fake = FakeNet(script, handler)
        monkeypatch.setattr(requests.Session, "request",
                            lambda session, *a, **k: fake(session, *a, **k))
        fake.sleeps = sleeps
        return fake

    yield install
    http.reset_rate_limiters()


URL = "https://example.org/api"


# --------------------------------------------------------------------------
# cache
# --------------------------------------------------------------------------
def test_cache_roundtrip_and_file_format(net):
    fake = net([make_resp(200, {"x": 1})])
    assert http.get_json(URL, {"q": "a b"}, namespace="t") == {"x": 1}
    assert http.get_json(URL, {"q": "a b"}, namespace="t") == {"x": 1}
    assert len(fake.calls) == 1
    key = http.cache_key(URL, {"q": "a b"})
    path = http.cache_path("t", key)
    assert path.parent.name == "t" and path.suffix == ".json"
    rec = json.loads(path.read_text(encoding="utf-8"))
    assert rec["url"] == "https://example.org/api?q=a+b"
    assert rec["status"] == 200 and rec["body"] == {"x": 1}


def test_cache_key_ignores_param_order(net):
    fake = net([make_resp(200, {"ok": True})])
    http.get_json(URL, {"b": 2, "a": 1}, namespace="t")
    http.get_json(URL, {"a": 1, "b": 2}, namespace="t")
    assert len(fake.calls) == 1
    assert http.full_url(URL, {"b": 2, "a": 1}) == URL + "?a=1&b=2"


def test_offline_mode(net, monkeypatch):
    fake = net([make_resp(200, {"v": 7})])
    with pytest.raises(http.OfflineCacheMiss):
        http.get_json(URL, {"k": 1}, namespace="t", offline=True)
    monkeypatch.setenv("PALIMPSEST_OFFLINE", "1")
    with pytest.raises(http.OfflineCacheMiss):
        http.get_json(URL, {"k": 1}, namespace="t")
    assert fake.calls == []
    monkeypatch.delenv("PALIMPSEST_OFFLINE")
    assert http.get_json(URL, {"k": 1}, namespace="t") == {"v": 7}
    monkeypatch.setenv("PALIMPSEST_OFFLINE", "1")
    assert http.get_json(URL, {"k": 1}, namespace="t") == {"v": 7}
    assert len(fake.calls) == 1


def test_get_text_and_post_body_in_key(net):
    fake = net(handler=lambda m, u, p, d: make_resp(200, {"m": m, "d": dict(d or [])}))
    assert json.loads(http.get_text(URL, namespace="t")) == {"m": "GET", "d": {}}
    a = http.get_json(URL, {"format": "json"}, namespace="t", method="POST", data={"query": "A"})
    b = http.get_json(URL, {"format": "json"}, namespace="t", method="POST", data={"query": "B"})
    assert a != b  # different bodies -> different cache entries
    http.get_json(URL, {"format": "json"}, namespace="t", method="POST", data={"query": "A"})
    assert len(fake.calls) == 3


def test_user_agent_sent(net):
    fake = net([make_resp(200, {})])
    http.get_json(URL, namespace="t")
    assert fake.calls[0]["headers"]["User-Agent"] == http.USER_AGENT
    assert "palimpsest-ethnohack/0.1" in http.USER_AGENT


# --------------------------------------------------------------------------
# retries
# --------------------------------------------------------------------------
def test_retry_after_is_honoured(net):
    fake = net([make_resp(503, {}, headers={"Retry-After": "3"}), make_resp(200, {"ok": 1})])
    assert http.get_json(URL, namespace="t") == {"ok": 1}
    assert len(fake.calls) == 2
    # the host bucket was penalized: next acquire waited ~3 s (fake sleep)
    assert any(2.9 <= s <= 3.1 for s in fake.sleeps), fake.sleeps


def test_retry_on_429_5xx_and_timeouts(net):
    fake = net([make_resp(429, {}), requests.Timeout("slow"), requests.ConnectionError("reset"),
                make_resp(502, {}), make_resp(200, {"ok": 2})])
    assert http.get_json(URL, namespace="t") == {"ok": 2}
    assert len(fake.calls) == 5
    backoffs = [s for s in fake.sleeps if s >= 0.5]
    assert len(backoffs) == 4 and backoffs == sorted(backoffs)  # exponential


def test_gives_up_and_does_not_cache_failures(net):
    fake = net([make_resp(500, {})] * 3)
    with pytest.raises(http.FetchError):
        http.get_json(URL, namespace="t", retries=2)
    assert len(fake.calls) == 3
    assert not http.cache_path("t", http.cache_key(URL)).exists()


def test_client_error_cached_and_raised(net):
    fake = net([make_resp(404, text="not found")])
    for _ in range(2):
        with pytest.raises(http.FetchError) as ei:
            http.get_json(URL, {"id": 9}, namespace="t")
        assert ei.value.status == 404
    assert len(fake.calls) == 1


def test_validate_and_bad_json_are_retried_not_cached(net):
    fake = net([make_resp(200, {"errMsg": "Search service is temporarily unavailable"}),
                make_resp(200, text="<html>oops"),
                make_resp(200, {"hitCount": 5})])
    assert europepmc.hit_count("x") == 5
    assert len(fake.calls) == 3
    assert europepmc.hit_count("x") == 5
    assert len(fake.calls) == 3


# --------------------------------------------------------------------------
# rate limiter
# --------------------------------------------------------------------------
class FakeClock:
    def __init__(self):
        self.t = 0.0
        self.sleeps = []

    def __call__(self):
        return self.t

    def sleep(self, s):
        self.sleeps.append(round(s, 6))  # don't advance: simulates concurrent callers


def test_token_bucket_spacing():
    clk = FakeClock()
    b = http.TokenBucket(4, burst=1, clock=clk, sleep=clk.sleep)
    waits = [round(b.acquire(), 6) for _ in range(5)]
    assert waits == [0.0, 0.25, 0.5, 0.75, 1.0]


def test_token_bucket_refill_and_burst_cap():
    clk = FakeClock()
    b = http.TokenBucket(2, burst=3, clock=clk, sleep=clk.sleep)
    assert [b.acquire() for _ in range(3)] == [0.0, 0.0, 0.0]
    assert b.acquire() == pytest.approx(0.5)
    clk.t += 100.0  # long idle: refills only up to the burst capacity
    assert [b.acquire() for _ in range(3)] == [0.0, 0.0, 0.0]
    assert b.acquire() == pytest.approx(0.5)


def test_token_bucket_penalize():
    clk = FakeClock()
    b = http.TokenBucket(4, burst=1, clock=clk, sleep=clk.sleep)
    b.penalize(2.0)
    assert b.acquire() >= 2.0


def test_token_bucket_threaded_real_time():
    b = http.TokenBucket(50, burst=1, sleep=time.sleep)
    t0 = time.monotonic()
    with ThreadPoolExecutor(10) as ex:
        list(ex.map(lambda _: b.acquire(), range(20)))
    assert time.monotonic() - t0 >= 19 / 50 - 0.03


def test_host_rates_configured():
    assert http.RATES["www.ebi.ac.uk"] == 8
    assert http.RATES["eutils.ncbi.nlm.nih.gov"] == 3
    assert http.RATES["api.gbif.org"] == 8
    assert http.RATES["query.wikidata.org"] == 2
    assert http.RATES["clinicaltrials.gov"] == 5
    assert http.RATES["id.nlm.nih.gov"] == 5
    assert http.rate_for("unknown.example") == http.DEFAULT_RATE == 4


def test_threadpool_get_json(net):
    def handler(method, url, params, data):
        time.sleep(0.002)
        return make_resp(200, {"echo": dict(params)["i"]})

    fake = net(handler=handler)
    jobs = [i % 10 for i in range(60)]
    with ThreadPoolExecutor(16) as ex:
        out = list(ex.map(lambda i: http.get_json(URL, {"i": i}, namespace="t"), jobs))
    assert out == [{"echo": str(i)} for i in jobs]
    n = len(fake.calls)
    assert 10 <= n <= 60
    files = list((http.CACHE_ROOT / "t").glob("*.json"))
    assert len(files) == 10 and all(json.loads(f.read_text("utf-8"))["status"] == 200 for f in files)
    assert not list((http.CACHE_ROOT / "t").glob(".tmp-*"))
    with ThreadPoolExecutor(16) as ex:
        list(ex.map(lambda i: http.get_json(URL, {"i": i}, namespace="t", offline=True), jobs))
    assert len(fake.calls) == n


# --------------------------------------------------------------------------
# connector logic (offline)
# --------------------------------------------------------------------------
def test_europepmc_query_builders():
    assert europepmc.taxon_query("Artemisia  absinthium") == \
        '(TITLE_ABS:"Artemisia absinthium" OR KW:"Artemisia absinthium")'
    q = europepmc.concept_query(["malaria", "Malaria", ' plasmodium"', ""])
    assert q == '(TITLE_ABS:("malaria" OR "plasmodium") OR KW:("malaria" OR "plasmodium"))'
    assert europepmc.concept_query(["fever"]) == '(TITLE_ABS:"fever" OR KW:"fever")'
    assert europepmc.pair_query("Salix alba", ["pain"]) == \
        '(TITLE_ABS:"Salix alba" OR KW:"Salix alba") AND (TITLE_ABS:"pain" OR KW:"pain")'
    with pytest.raises(ValueError):
        europepmc.concept_query(["", "  "])


def test_europepmc_request_params(net):
    fake = net([make_resp(200, {"hitCount": 42})])
    assert europepmc.pair_count("Salix alba", ["pain"]) == 42
    p = dict(fake.calls[0]["params"])
    assert p["resultType"] == "idlist" and p["pageSize"] == "1" and p["format"] == "json"
    assert p["query"] == europepmc.pair_query("Salix alba", ["pain"])


def test_clinicaltrials_params(net):
    fake = net([make_resp(200, {"totalCount": 3, "studies": []})])
    assert clinicaltrials.trial_count(["Artemisia absinthium", "wormwood"], ["malaria"]) == 3
    p = dict(fake.calls[0]["params"])
    assert p["query.intr"] == '("Artemisia absinthium" OR "wormwood")'
    assert p["query.cond"] == '"malaria"' and p["countTotal"] == "true"


def test_gbif_match_resolves_synonym(net):
    def handler(method, url, params, data):
        if url.endswith("/species/match"):
            return make_resp(200, {"usageKey": 3105279, "acceptedUsageKey": 5391599,
                                   "scientificName": "Anthemis nobilis L.",
                                   "canonicalName": "Anthemis nobilis", "rank": "SPECIES",
                                   "status": "SYNONYM", "confidence": 100, "matchType": "EXACT",
                                   "family": "Asteraceae", "genus": "Chamaemelum"})
        assert url.endswith("/species/5391599")
        return make_resp(200, {"key": 5391599, "scientificName": "Chamaemelum nobile (L.) All.",
                               "canonicalName": "Chamaemelum nobile", "rank": "SPECIES",
                               "family": "Asteraceae", "genus": "Chamaemelum"})

    net(handler=handler)
    m = gbif.match("Anthemis nobilis")
    assert m["usageKey"] == 3105279 and m["acceptedUsageKey"] == 5391599
    assert m["canonicalName"] == "Chamaemelum nobile" and m["matchedName"] == "Anthemis nobilis"
    assert m["status"] == "SYNONYM"


def test_gbif_match_higherrank_is_no_match(net):
    net([make_resp(200, {"usageKey": 6, "canonicalName": "Plantae", "rank": "KINGDOM",
                         "matchType": "HIGHERRANK", "confidence": 99})])
    m = gbif.match("Qwertyuiop asdfg")
    assert m["usageKey"] is None and m["acceptedUsageKey"] is None


def _b(**kw):
    return {k: ({"type": "uri", "value": "http://www.wikidata.org/entity/" + v}
                if v.startswith("Q") else {"type": "literal", "value": v})
            for k, v in kw.items()}


def test_wikidata_iucn_mapping_and_severity(monkeypatch):
    rows = [_b(item="Q1", st="Q211005"), _b(item="Q2", st="Q211005"),
            _b(item="Q2", st="Q96377276"), _b(item="Q3", st="Q999")]
    monkeypatch.setattr(wikidata, "sparql", lambda q, **kw: rows)
    assert wikidata.iucn_status(["Q1", "Q2", "Q3", "Q4"]) == \
        {"Q1": "LC", "Q2": "EN", "Q3": None, "Q4": None}


def test_wikidata_compounds_aggregation_and_batching(monkeypatch):
    seen = []

    def fake_sparql(q, **kw):
        seen.append(q)
        return [_b(taxon="Q10", c="Q5", ik="BBB", label="b"),
                _b(taxon="Q10", c="Q5", ik="AAA", label="b", chembl="CHEMBL1"),
                _b(taxon="Q10", c="Q2", ik="CCC")]

    monkeypatch.setattr(wikidata, "sparql", fake_sparql)
    res = wikidata.compounds_for_taxa(["Q10", "Q11"])
    assert res["counts"] == {"Q10": 2, "Q11": 0}
    assert res["compounds"]["Q10"] == [
        {"qid": "Q2", "label": None, "inchikey": "CCC", "chembl": None},
        {"qid": "Q5", "label": "b", "inchikey": "AAA", "chembl": "CHEMBL1"}]
    seen.clear()
    monkeypatch.setattr(wikidata, "sparql", lambda q, **kw: seen.append(q) or [])
    wikidata.iucn_status([f"Q{i}" for i in range(1, 321)])
    assert len(seen) == 3  # 150 + 150 + 20
    assert all(q.count("wd:Q") <= 150 for q in seen)


def test_wikidata_batch_split_on_failure(monkeypatch):
    def fake_sparql(q, **kw):
        if q.count("wd:Q") > 2:
            raise http.FetchError("timeout", status=500)
        return []

    monkeypatch.setattr(wikidata, "sparql", fake_sparql)
    assert wikidata.iucn_status(["Q1", "Q2", "Q3", "Q4", "Q5"]) == {f"Q{i}": None for i in range(1, 6)}


def test_mesh_verify_concepts_appends_columns(monkeypatch, tmp_path):
    p = tmp_path / "concepts.csv"
    p.write_bytes(b'concept_id,label,mesh_label\nmalaria,Agues,Malaria\n'
                  b'sex,Venery,"Sexual Dysfunction, Physiological"\nzz,Nothing,Nope\n')
    table = {("Malaria", "exact"): [("D008288", "Malaria")],
             ("Sexual Dysfunction, Physiological", "exact"):
                 [("D012735", "Sexual Dysfunction, Physiological")]}
    monkeypatch.setattr(mesh, "_candidates", lambda label, match, **kw: table.get((label, match), []))
    probs = mesh.verify_concepts(p)
    assert [x["concept_id"] for x in probs] == ["zz"]
    raw = p.read_bytes()
    assert b"\r\n" not in raw
    rows = list(csv.reader(raw.decode("utf-8").splitlines()))
    assert rows[0] == ["concept_id", "label", "mesh_label", "mesh_id", "mesh_ui_label"]
    assert rows[2] == ["sex", "Venery", "Sexual Dysfunction, Physiological", "D012735",
                       "Sexual Dysfunction, Physiological"]
    assert rows[3][3:] == ["", ""]
    mesh.verify_concepts(p)  # idempotent: no duplicate columns
    assert list(csv.reader(p.read_text("utf-8").splitlines()))[0] == rows[0]


def test_concepts_csv_has_verified_mesh_columns():
    from palimpsest.paths import LEXICONS
    with (LEXICONS / "concepts.csv").open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    assert rows and list(rows[0])[:5] == ["concept_id", "label", "category", "mesh_label", "epmc_terms"]
    assert all(r["mesh_id"].startswith("D") for r in rows)


# --------------------------------------------------------------------------
# live smoke tests
# --------------------------------------------------------------------------
@pytest.mark.network
def test_live_europepmc_known_pairs():
    with open(mesh.CONCEPTS_CSV, encoding="utf-8", newline="") as fh:
        concepts = {r["concept_id"]: r["epmc_terms"].split("|") for r in csv.DictReader(fh)}
    abs_taxon = europepmc.taxon_count("Artemisia absinthium")
    assert 0 < abs_taxon <= europepmc.hit_count('"Artemisia absinthium"')
    for binomial, cid in [("Artemisia absinthium", "malaria"),
                          ("Hypericum perforatum", "melancholy"), ("Salix alba", "pain")]:
        n_pair = europepmc.pair_count(binomial, concepts[cid])
        assert 0 < n_pair <= europepmc.taxon_count(binomial)
    n = europepmc.total_records()
    assert 40_000_000 < n <= europepmc.hit_count("*")


@pytest.mark.network
def test_live_gbif_wikidata_mesh_ctgov():
    m = gbif.match("Anthemis nobilis")
    assert m["status"] == "SYNONYM" and m["canonicalName"] == "Chamaemelum nobile"
    assert gbif.occurrence_count(m["acceptedUsageKey"]) > 0
    assert wikidata.qids_for_gbif_keys([3121319]) == {3121319: "Q25686"}
    assert wikidata.qids_for_names(["Artemisia absinthium"]) == {"Artemisia absinthium": "Q25686"}
    assert mesh.lookup_descriptor("Malaria") == ("D008288", "Malaria")
    assert clinicaltrials.trial_count(["Hypericum perforatum"]) > 0
