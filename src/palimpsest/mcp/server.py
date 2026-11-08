"""MCP server wiring: registers :mod:`palimpsest.mcp.tools` with the official ``mcp`` SDK.

Works with ``mcp`` 2.x (``MCPServer``) and 1.x (``FastMCP``). The SDK is an optional
dependency: ``pip install -e ".[mcp]"``.
"""
from __future__ import annotations

import json
from typing import Any

from . import data as D
from . import tools as T

INSTRUCTIONS = """\
Palimpsest links Dioscorides' De materia medica (Greek, c. 60 CE), Culpeper's Complete Herbal
(English, 1653) and modern evidence (Europe PMC co-mention counts, LOTUS constituents, IUCN).
Every claim is anchored to a character span in the source text and a MeSH-linked concept.

Typical flow: search_plants("rue") -> get_plant(taxon) or compare_eras(taxon) ->
trace_claim(taxon, concept) for one indication -> get_passage(monograph_id) to read the text.
list_leads/get_lead give ranked under-studied persistent claims; get_findings gives the
headline statistics with confidence intervals.

Always relay the responsible-use note: these are computational hypotheses, not medical advice;
literature co-mention measures research attention, not efficacy; several remedies are toxic.
Quote source references (e.g. 'De materia medica 3.45') and URLs from the provenance fields.
"""

TOOLS = (T.search_plants, T.get_plant, T.get_passage, T.trace_claim, T.list_leads, T.get_lead,
         T.get_findings, T.compare_eras)


def _server_class():
    try:  # mcp >= 2
        from mcp.server.mcpserver import MCPServer

        return MCPServer
    except ImportError:  # mcp 1.x
        from mcp.server.fastmcp import FastMCP

        return FastMCP


def _annotations(title: str):
    try:
        from mcp.types import ToolAnnotations
    except ImportError:
        return None
    for kw in ({"title": title, "read_only_hint": True, "destructive_hint": False,
                "idempotent_hint": True, "open_world_hint": False},
               {"title": title, "readOnlyHint": True, "destructiveHint": False,
                "idempotentHint": True, "openWorldHint": False}):
        try:
            return ToolAnnotations(**kw)
        except Exception:
            continue
    return None


def _json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


def build_server():
    """Create the MCP server with all Palimpsest tools and resources registered."""
    from .. import __version__

    cls = _server_class()
    kwargs: dict[str, Any] = {"instructions": INSTRUCTIONS}
    try:
        server = cls("palimpsest", version=__version__, website_url=D.EXPLORER, **kwargs)
    except TypeError:  # 1.x has no version / website_url
        server = cls("palimpsest", **kwargs)

    for fn in TOOLS:
        title = fn.__name__.replace("_", " ").capitalize()
        ann = _annotations(title)
        try:
            server.tool(annotations=ann)(fn) if ann is not None else server.tool()(fn)
        except TypeError:
            server.tool()(fn)

    @server.resource("palimpsest://licences", name="licences", mime_type="application/json",
                     description="Licences of all sources and derived data, citation (text + BibTeX).")
    def licences() -> str:
        return _json(T.licence_and_citation())

    @server.resource("palimpsest://concepts", name="concepts", mime_type="application/json",
                     description="The 85 MeSH-linked indication concepts (ids usable in trace_claim).")
    def concepts() -> str:
        return _json([{k: c.get(k) for k in ("concept_id", "label", "category", "mesh_id", "mesh_label",
                                              "epmc_terms")} for c in D.concepts().values()])

    @server.resource("palimpsest://data-files", name="data-files", mime_type="application/json",
                     description="Repository files this server reads, and whether each is present.")
    def data_files() -> str:
        files = ["web/public/data/plants.json", "web/public/data/texts.json", "web/public/data/leads.json",
                 "web/public/data/summary.json", "web/public/data/concepts.json", "results/key_numbers.json",
                 "results/stats.json", "results/evidence_meta.json", "results/tables/leads.csv",
                 "data/processed/claims.csv", "data/processed/monograph_taxa.csv",
                 "data/processed/pairs_scored.csv", "data/processed/taxon_info.csv",
                 "data/processed/taxon_compounds.csv", "data/interim/monographs.jsonl",
                 "data/lexicons/concepts.csv"]
        out = [{"path": f, "present": D.path(*f.split("/")).exists()} for f in files]
        out += [{"path": f"web/public/data/extra/{k}.json", "present": True} for k in D.extra()]
        return _json({"root": str(D.root()), "files": out})

    return server


def main() -> None:
    build_server().run("stdio")
