"""Palimpsest MCP server: query the herbals, claims, evidence and leads from any MCP client.

Run ``python -m palimpsest.mcp`` (stdio). The tool functions live in
:mod:`palimpsest.mcp.tools` and can be imported without the ``mcp`` SDK.
"""
from .tools import (NotFound, compare_eras, get_findings, get_lead, get_passage, get_plant,
                    licence_and_citation, list_leads, search_plants, trace_claim)

__all__ = ["NotFound", "compare_eras", "get_findings", "get_lead", "get_passage", "get_plant",
           "licence_and_citation", "list_leads", "search_plants", "trace_claim"]
