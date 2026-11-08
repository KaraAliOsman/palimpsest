"""Tests for the Palimpsest MCP server (``palimpsest.mcp``).

The tool functions are called directly against the committed data; sockets are
blocked so nothing can reach the network. The last tests start the real stdio
server with the official SDK client (skipped when ``mcp`` is not installed).
"""
from __future__ import annotations

import asyncio
import importlib.util
import json
import os
import socket
import sys
from pathlib import Path

import pytest

from palimpsest.mcp import data as D
from palimpsest.mcp import tools as T

ROOT = Path(__file__).resolve().parents[1]
HAS_MCP = importlib.util.find_spec("mcp") is not None and importlib.util.find_spec("mcp.server") is not None


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def refuse(*a, **k):
        raise AssertionError("palimpsest.mcp must not open network connections")

    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)


def _has_responsible_use(x: dict) -> bool:
    return "not medical advice" in x.get("responsible_use", "")


# ---------------------------------------------------------------- search


@pytest.mark.parametrize("q", ["πήγανον", "πηγανον", "ΠΗΓΑΝΟΝ", "rue", "Garden-Rue", "garden rue",
                               "Ruta graveolens", "ruta graveolens"])
def test_search_is_accent_and_language_insensitive(q):
    r = T.search_plants(q, limit=3)
    assert r["results"][0]["taxon"] == "Ruta graveolens"
    assert r["results"][0]["explorer_url"].endswith("#/plant/ruta-graveolens")


def test_search_greek_wormwood_and_limits():
    assert T.search_plants("ἀψίνθιον")["results"][0]["taxon"] == "Artemisia absinthium"
    assert T.search_plants("αψινθιον")["results"][0]["taxon"] == "Artemisia absinthium"
    assert len(T.search_plants("a", limit=999)["results"]) <= 50
    assert T.search_plants("zzzzqqq")["n_results"] == 0


def test_fold():
    assert D.fold("ἀψίνθιον") == D.fold("ΑΨΙΝΘΙΟΝ") == "αψινθιον"
    assert D.fold("ὀφθαλμοῖς") == "οφθαλμοισ"
    assert D.fold("Adder’s Tongue") == "adders tongue"


# ---------------------------------------------------------------- plant


def test_get_plant_rue():
    p = T.get_plant("rue")
    assert p["taxon"] == "Ruta graveolens" and p["resolved_from"] == "rue"
    eras = {n["source"]: n for n in p["names_across_eras"]}
    assert eras["dioscorides"]["name"] == "πήγανον" and eras["dioscorides"]["era"] == "c. 60 CE"
    assert eras["culpeper"]["name"] == "Garden-Rue" and eras["culpeper"]["era"] == "1653"
    assert eras["dioscorides"]["cts_urn"].endswith(":3.45")
    ind = {c["concept_id"]: c for c in p["indications"]}
    eye = ind["eye_disease"]
    assert eye["status"] == "persisted" and eye["evidence_tier"] == "unstudied" and eye["europepmc_copapers"] == 0
    assert eye["mesh_id"] and eye["europepmc_url"].startswith("https://europepmc.org/search?query=")
    assert all(c["evidence_tier"] in (None, "unstudied", "sparse", "studied") for c in p["indications"])
    assert p["counts"]["indications"] == sum(p["counts"][k] for k in ("persisted", "dioscorides_only", "culpeper_only"))
    assert p["constituents"]["n_known"] == 204 and p["constituents"]["examples"][0]["wikidata"].startswith("Q")
    assert p["conservation"]["iucn"]["code"] is None and "not assessed" in p["conservation"]["iucn"]["status"]
    assert p["identifiers"]["gbif_url"] == "https://www.gbif.org/species/3190382"
    assert {L["rank"] for L in p["leads"]} >= {1}
    assert p["historical_warnings"], "rue carries a Dioscorides warning (ἑλκωτικά)"
    assert _has_responsible_use(p)
    assert "web/public/data/plants.json" in p["provenance"]["files"]


def test_get_plant_unknown_raises():
    with pytest.raises(T.NotFound):
        T.get_plant("qqqxxyyzz")


# ---------------------------------------------------------------- passage


@pytest.mark.parametrize("mid", ["dsc:3.45", "3.45", "DMM 3.45", "πήγανον"])
def test_get_passage_dioscorides(mid):
    g = T.get_passage(mid)
    assert g["monograph_id"] == "dsc:3.45" and g["language"] == "grc"
    assert g["identification"]["taxon"] == "Ruta graveolens"
    for s in g["spans"]:
        assert g["text"][s["start"]:s["end"]] == s["text"]
        assert s["label"] and "mesh_id" in s
    assert "[[ὀφθαλμ]]{eye_disease}" in g["highlighted_text"]
    assert g["n_claims"] == sum(s["counted_as_claim"] for s in g["spans"])


def test_get_passage_culpeper_and_ids():
    for q in ("cul:261-garden-rue", "cul:261", "Garden-Rue"):
        g = T.get_passage(q)
        assert g["monograph_id"] == "cul:261-garden-rue" and g["section"] == "Government and virtues"
    assert any(s["concept_id"] == "eye_disease" and s["text"] == "dimness of the eye" for s in g["spans"])
    assert "highlighted_text" not in T.get_passage("dsc:3.45", highlight=False)
    with pytest.raises(T.NotFound):
        T.get_passage("dsc:99.99")


def test_all_claim_offsets_match_texts():
    tx = D.texts()
    bad = [(mid, s["claim_id"]) for mid, rows in D.claims_by_monograph().items() for s in rows
           if tx[mid]["text"][s["start"]:s["end"]] != s["match"]]
    assert bad == []


# ---------------------------------------------------------------- trace


def test_trace_claim_rue_eyes():
    t = T.trace_claim("rue", "eyes")
    assert t["taxon"] == "Ruta graveolens" and t["status"] == "persisted"
    ch = t["chain"]
    gr = ch["1_dioscorides_greek"]
    assert {s["match"] for s in gr} >= {"ὀφθαλμ", "ἀμβλυωπ"}
    text = D.texts()["dsc:3.45"]["text"]
    assert all(text[s["start"]:s["end"]] == s["match"] for s in gr)
    assert ch["2_concept"]["concept_id"] == "eye_disease" and ch["2_concept"]["mesh_url"].startswith("https://meshb")
    assert ch["3_culpeper_english"][0]["match"] == "dimness of the eye"
    m = ch["4_modern_evidence"]
    assert m["queried"] and m["copapers"] == 0 and m["papers_on_plant"] == 416
    assert '"Ruta graveolens"' in m["query"] and "synonym=false" in m["query_urls"]["api"]
    assert m["query_urls"]["web"].startswith("https://europepmc.org/search?query=")
    assert ch["5_constituents"]["n_known"] == 204
    assert t["lead"]["rank"] == 1 and "Ranked research lead #1" in t["summary"]
    assert _has_responsible_use(t)


def test_query_matches_pipeline_query_builder():
    europepmc = pytest.importorskip("palimpsest.sources.europepmc")  # needs `requests`
    for cid, c in D.concepts().items():
        assert T.epmc_query("Ruta graveolens", cid) == europepmc.pair_query("Ruta graveolens", c["epmc_terms"])
    meta = D.evidence_meta()
    assert T._concept_query(D.concepts()["jaundice"]["epmc_terms"]) == meta["concept_query_example"]


def test_trace_claim_concept_forms_agree():
    ids = {T.trace_claim("Ruta graveolens", q)["chain"]["2_concept"]["concept_id"]
           for q in ("eye_disease", "dim sight", "Eye complaints / dim sight", "eyes")}
    assert ids == {"eye_disease"}


def test_trace_claim_matches_every_lead():
    for L in D.leads():
        t = T.trace_claim(L["taxon"], L["concept_id"])
        assert t["status"] == "persisted", L["rank"]
        assert t["chain"]["1_dioscorides_greek"] and t["chain"]["3_culpeper_english"]
        assert t["chain"]["4_modern_evidence"]["copapers"] == L["epmc_pair"]
        assert t["chain"]["4_modern_evidence"]["copapers"] <= 4
        assert t["lead"]["rank"] == L["rank"]


def test_unknown_concept_raises():
    with pytest.raises(T.NotFound):
        T.trace_claim("rue", "qqqxxyyzz")


# ---------------------------------------------------------------- leads


def test_list_leads_filters():
    r = T.list_leads()
    assert len(r["leads"]) == 20 and r["leads"][0]["rank"] == 1 and r["n_total_leads"] == 60
    assert _has_responsible_use(r)
    assert len(T.list_leads(limit=500)["leads"]) == 60
    safe = T.list_leads(limit=60, hide_flagged=True)["leads"]
    assert safe and not any(x["flag_historical_safety"] or x["flag_threatened"] for x in safe)
    tox = T.list_leads(limit=60, category="toxicology")["leads"]
    assert tox and all(x["category"] == "Toxicology" for x in tox)
    assert [x["rank"] for x in tox] == sorted(x["rank"] for x in tox)


def test_get_lead():
    g = T.get_lead(1)
    assert g["taxon"] == "Ruta graveolens" and g["concept_id"] == "eye_disease"
    assert g["dioscorides_ref"] == "dsc:3.45" and "eye-sight" in g["culpeper_quote"]
    assert g["score_components"]["gap"] == 1.0 and g["trace"]["status"] == "persisted"
    assert _has_responsible_use(g)
    with pytest.raises(T.NotFound):
        T.get_lead(999)


# ---------------------------------------------------------------- findings / eras / licence


def test_get_findings_matches_key_numbers():
    f = T.get_findings()
    kn = D.key_numbers()
    assert round(f["transmission"]["fold_enrichment"], 2) == kn["FOLD"]
    assert f["transmission"]["observed_shared_claims"] == kn["N_BOTH"]
    assert f["modern_evidence"]["odds_ratio_studied_at_all"]["persistent"]["ci95"] == kn["OR_BOTH"][1:]
    assert f["extraction_accuracy"]["f1_ci95"]["dioscorides"] == kn["F1_GRC_CI"]
    assert f["modern_evidence"]["share_with_any_paper"]["both"]["ci95"]
    assert len(f["transmission"]["sensitivity"]) == 5


def test_compare_eras_rue():
    c = T.compare_eras("πήγανον")
    p = D.plants_by_taxon()["Ruta graveolens"]
    assert c["taxon"] == "Ruta graveolens" and c["caveat"] is None
    assert c["counts"]["persisted"] + c["counts"]["lost"] + c["counts"]["new"] == len(p["claims"])
    assert "eye_disease" in {x["concept_id"] for x in c["persisted"]}
    assert c["eras"]["dioscorides"]["names"][0]["name"] == "πήγανον"
    assert _has_responsible_use(c)


def test_compare_eras_single_text_caveat():
    one = next(p for p in D.plants() if {n["source"] for n in p["names"]} == {"dioscorides"} and p["claims"])
    c = T.compare_eras(one["taxon"])
    assert c["caveat"] and c["counts"]["new"] == 0


def test_licence_and_citation():
    lic = T.licence_and_citation()
    assert "CC BY-SA 4.0" in json.dumps(lic) and "@misc{palimpsest2026" in lic["citation"]["bibtex"]


def test_responses_are_json_serialisable():
    for out in (T.search_plants("rue"), T.get_plant("rue"), T.get_passage("dsc:3.45"),
                T.trace_claim("rue", "eyes"), T.list_leads(5), T.get_lead(2), T.get_findings(),
                T.compare_eras("rue"), T.licence_and_citation()):
        json.dumps(out, ensure_ascii=False, allow_nan=False)
        assert "provenance" in out


# ---------------------------------------------------------------- optional extra files


def test_extra_dir_absent_is_empty(tmp_path, monkeypatch):
    monkeypatch.setenv("PALIMPSEST_ROOT", str(tmp_path))
    D.extra.cache_clear()
    try:
        assert D.extra() == {} and D.extra_for_taxon("Ruta graveolens") == {}
    finally:
        monkeypatch.delenv("PALIMPSEST_ROOT")
        D.extra.cache_clear()


def test_extra_records_are_attached(tmp_path, monkeypatch):
    d = tmp_path / "web" / "public" / "data" / "extra"
    d.mkdir(parents=True)
    (d / "mechanisms.json").write_text(json.dumps({"Ruta graveolens": {"targets": ["X"]}}), encoding="utf-8")
    (d / "hazards.json").write_text(json.dumps([{"taxon": "Ruta graveolens", "ghs": "H317"}]), encoding="utf-8")
    (d / "broken.json").write_text("{not json", encoding="utf-8")
    monkeypatch.setenv("PALIMPSEST_ROOT", str(tmp_path))
    D.extra.cache_clear()
    try:
        ex = D.extra_for_taxon("Ruta graveolens")
    finally:
        monkeypatch.delenv("PALIMPSEST_ROOT")
        D.extra.cache_clear()
    assert ex == {"hazards": [{"taxon": "Ruta graveolens", "ghs": "H317"}], "mechanisms": {"targets": ["X"]}}


# ---------------------------------------------------------------- MCP SDK


EXPECTED_TOOLS = {"search_plants", "get_plant", "get_passage", "trace_claim", "list_leads", "get_lead",
                  "get_findings", "compare_eras"}


@pytest.mark.skipif(not HAS_MCP, reason="mcp SDK not installed (pip install -e '.[mcp]')")
def test_build_server_registers_tools():
    from palimpsest.mcp.server import build_server

    assert build_server() is not None


@pytest.mark.skipif(not HAS_MCP, reason="mcp SDK not installed (pip install -e '.[mcp]')")
def test_stdio_server_lists_and_calls_tools(monkeypatch):
    monkeypatch.undo()  # the subprocess pipes are local, but let asyncio create its sockets on Windows
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import get_default_environment, stdio_client

    env = dict(get_default_environment())
    env["PYTHONPATH"] = str(ROOT / "src") + os.pathsep + os.environ.get("PYTHONPATH", "")
    env["PYTHONIOENCODING"] = "utf-8"
    params = StdioServerParameters(command=sys.executable, args=["-m", "palimpsest.mcp"], env=env, cwd=str(ROOT))

    async def run():
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                res = await session.call_tool("trace_claim", {"taxon": "rue", "concept": "eyes"})
                resources = await session.list_resources()
                return tools, res, resources

    tools, res, resources = asyncio.run(asyncio.wait_for(run(), timeout=90))
    names = {t.name for t in tools.tools}
    assert EXPECTED_TOOLS <= names
    for t in tools.tools:
        assert t.description and len(t.description) > 40
    assert not res.isError if hasattr(res, "isError") else not res.is_error
    payload = getattr(res, "structuredContent", None) or getattr(res, "structured_content", None)
    if not payload:
        payload = json.loads(res.content[0].text)
    payload = payload.get("result", payload)
    assert payload["status"] == "persisted" and payload["lead"]["rank"] == 1
    assert {"palimpsest://licences", "palimpsest://concepts"} <= {str(r.uri) for r in resources.resources}
