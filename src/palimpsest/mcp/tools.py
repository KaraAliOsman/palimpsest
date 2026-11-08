"""Tool implementations for the Palimpsest MCP server.

Plain Python functions returning JSON-serialisable dicts, so they can be called
(and tested) without the MCP SDK. :mod:`palimpsest.mcp.server` registers them
as MCP tools; their docstrings become the tool descriptions.

Every response carries ``provenance`` (repository files read, data snapshot,
source URLs). Responses about plants or leads also carry ``responsible_use``.
All data is read-only and offline: nothing here calls an API.
"""
from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote, urlencode

from . import data as D

__all__ = [
    "search_plants", "get_plant", "get_passage", "trace_claim", "list_leads", "get_lead",
    "get_findings", "compare_eras", "licence_and_citation", "NotFound",
]


class NotFound(LookupError):
    """Raised when a plant, concept, passage or lead cannot be resolved."""


IUCN = {"LC": "Least Concern", "NT": "Near Threatened", "VU": "Vulnerable", "EN": "Endangered",
        "CR": "Critically Endangered", "EW": "Extinct in the Wild", "EX": "Extinct",
        "DD": "Data Deficient"}
TIERS = {"unstudied": "0 co-mentioning papers", "sparse": "1-4 co-mentioning papers",
         "studied": ">= 5 co-mentioning papers"}

# ---------------------------------------------------------------- helpers


def _r(x: Any, nd: int = 3) -> Any:
    return round(x, nd) if isinstance(x, float) else x


def _generated() -> str | None:
    try:
        return D.summary().get("generated")
    except FileNotFoundError:
        return None


def _prov(files: list[str], urls: dict[str, str] | None = None, **extra: Any) -> dict:
    p = {"files": sorted(set(files)), "data_generated": _generated(),
         "repository": D.REPO_URL, "explorer": D.EXPLORER}
    if urls:
        p["source_urls"] = urls
    p.update(extra)
    return p


def _plant_url(taxon: str) -> str:
    return f"{D.EXPLORER}#/plant/{D.slugify(taxon)}"


def _gbif_url(key: Any) -> str | None:
    return f"https://www.gbif.org/species/{int(key)}" if isinstance(key, (int, float)) else None


def _wd_url(qid: Any) -> str | None:
    return f"https://www.wikidata.org/wiki/{qid}" if qid else None


def _mesh_url(mesh_id: Any) -> str | None:
    return f"https://meshb.nlm.nih.gov/record/ui?ui={mesh_id}" if mesh_id else None


def _source_url(monograph_id: str) -> str:
    if monograph_id.startswith("dsc:"):
        return D.DIOSCORIDES_TEI
    return D.CULPEPER_GUTENBERG


def _cts_urn(monograph_id: str) -> str | None:
    if monograph_id.startswith("dsc:"):
        return f"{D.DIOSCORIDES_URN}:{monograph_id[4:]}"
    return None


def _concept(cid: str) -> dict:
    c = D.concepts().get(cid, {"concept_id": cid, "label": cid, "category": None, "mesh_id": None})
    return {"concept_id": cid, "label": c.get("label"), "category": c.get("category"),
            "mesh_id": c.get("mesh_id"), "mesh_label": c.get("mesh_label"),
            "mesh_url": _mesh_url(c.get("mesh_id"))}


def _iucn(code: Any) -> dict:
    if not code:
        return {"code": None, "status": "not assessed (no IUCN Red List status on Wikidata)"}
    return {"code": code, "status": IUCN.get(code, code)}


# Query builders mirror palimpsest.sources.europepmc exactly (tests assert equality); they
# are duplicated so the server does not import the HTTP client stack.


def _phrase(term: str) -> str:
    t = re.sub(r"\s+", " ", term.replace('"', " ")).strip()
    return f'"{t}"'


def _taxon_query(binomial: str) -> str:
    p = _phrase(binomial)
    return f"(TITLE_ABS:{p} OR KW:{p})"


def _concept_query(terms: list[str]) -> str:
    seen, phrases = set(), []
    for t in terms:
        if t is None or not str(t).strip():
            continue
        p = _phrase(str(t))
        if p.casefold() not in seen:
            seen.add(p.casefold())
            phrases.append(p)
    inner = phrases[0] if len(phrases) == 1 else "(" + " OR ".join(phrases) + ")"
    return f"(TITLE_ABS:{inner} OR KW:{inner})"


def epmc_query(taxon: str, concept_id: str) -> str | None:
    """The exact Europe PMC query used for the published co-mention count."""
    terms = D.concepts().get(concept_id, {}).get("epmc_terms") or []
    if not terms:
        return None
    return f"{_taxon_query(taxon)} AND {_concept_query(terms)}"


def epmc_urls(query: str) -> dict:
    api = D.EPMC_API + "?" + urlencode({"query": query, "resultType": "idlist", "pageSize": 1,
                                        "format": "json", "synonym": "false"})
    return {"api": api, "web": D.EPMC_WEB + "?query=" + quote(query, safe="")}


def _status(dsc: Any, cul: Any) -> str:
    if dsc and cul:
        return "persisted"
    if dsc:
        return "dioscorides_only"
    return "culpeper_only"


# ---------------------------------------------------------------- resolution


def _score(fq: str, toks: list[str], value: str) -> int:
    if not value:
        return 0
    if value == fq:
        return 100
    words = value.split()
    if value.startswith(fq + " ") or value.startswith(fq):
        return 80
    if any(w.startswith(fq) for w in words):
        return 65
    if len(toks) > 1 and all(any(w.startswith(t) for w in words) for t in toks):
        return 55
    if len(fq) >= 3 and fq in value:
        return 45
    return 0


_FIELD_BONUS = {"latin": 3, "english": 2, "greek": 2, "genus": -10, "family": -20}


def _rank(query: str) -> list[dict]:
    fq = D.fold(query)
    if not fq:
        return []
    toks = fq.split()
    best: dict[str, dict] = {}
    for taxon, field, original, folded in D.search_index():
        s = _score(fq, toks, folded)
        if not s:
            continue
        s += _FIELD_BONUS.get(field, 0)
        cur = best.get(taxon)
        if cur is None or s > cur["score"]:
            best[taxon] = {"taxon": taxon, "score": s, "matched_field": field, "matched_name": original}
    by = D.plants_by_taxon()

    def n_claims(t):
        return len(by.get(t, {}).get("claims", []))

    return sorted(best.values(), key=lambda h: (-h["score"], -n_claims(h["taxon"]), h["taxon"]))


def resolve_taxon(query: str) -> tuple[dict, list[str]]:
    """Return (plant record, other close matches). Raises NotFound."""
    by = D.plants_by_taxon()
    q = (query or "").strip()
    if q in by:
        return by[q], []
    fq = D.fold(q)
    for t, p in by.items():
        if D.fold(t) == fq:
            return p, []
    hits = _rank(q)
    if not hits:
        raise NotFound(f"No plant matches {query!r}. Try search_plants with a Latin, Greek or English name.")
    top = hits[0]
    others = [h["taxon"] for h in hits[1:6] if h["score"] >= top["score"] - 20]
    return by[top["taxon"]], others


def _stem(w: str) -> str:
    for suf in ("ies", "es", "s"):
        if len(w) > len(suf) + 2 and w.endswith(suf):
            return w[: -len(suf)] + ("y" if suf == "ies" else "")
    return w


def _tok_match(t: str, w: str) -> bool:
    return t == w or (len(t) >= 4 and w.startswith(t)) or (len(w) >= 4 and t.startswith(w))


def resolve_concept(query: str, prefer: list[str] | None = None) -> dict:
    """Resolve a concept id, MeSH id, label or free-text term to a concept row. Raises NotFound."""
    cs = D.concepts()
    q = (query or "").strip()
    if q in cs:
        return cs[q]
    for c in cs.values():
        if c.get("mesh_id") and c["mesh_id"].lower() == q.lower():
            return c
    fq = D.fold(q.replace("_", " "))
    if not fq:
        raise NotFound("Empty concept.")
    toks = [t for t in fq.split() if len(t) > 2] or fq.split()
    prefer = set(prefer or [])
    scored = []
    for c in cs.values():
        fields = [D.fold(c["concept_id"].replace("_", " ")), D.fold(c["label"]),
                  D.fold(c.get("mesh_label") or "")] + [D.fold(t) for t in c.get("epmc_terms", [])]
        s = 0
        for f in fields:
            if not f:
                continue
            if f == fq:
                s = max(s, 100)
            elif fq in f or f in fq:
                s = max(s, 70)
            else:
                words = [_stem(w) for w in f.split()]
                hit = sum(1 for t in toks if any(_tok_match(_stem(t), w) for w in words))
                if hit:
                    s = max(s, 30 + 30 * hit // len(toks))
        if s:
            scored.append((s + (25 if c["concept_id"] in prefer else 0), c))
    if not scored:
        raise NotFound(f"No indication concept matches {query!r}. Concept ids are listed in the "
                       "palimpsest://concepts resource (e.g. 'eye_disease', 'jaundice').")
    scored.sort(key=lambda x: (-x[0], x[1]["concept_id"]))
    return scored[0][1]


def resolve_monograph(query: str) -> str:
    tx = D.texts()
    q = (query or "").strip()
    if q in tx:
        return q
    m = re.fullmatch(r"(?:dsc[:\s]*|dmm\s*|dioscorides\s*)?(\d+)\s*[.,:]\s*(\d+)", q, re.I)
    if m:
        mid = f"dsc:{int(m.group(1))}.{int(m.group(2))}"
        if mid in tx:
            return mid
    low = q.lower()
    if low.startswith("cul:"):
        hits = [k for k in tx if k.startswith(low)]
        if hits:
            return hits[0]
    fq = D.fold(q)
    for k, v in tx.items():
        if D.fold(v.get("headword")) == fq:
            return k
    for k in tx:
        if k.startswith("cul:") and D.fold(k.split("-", 1)[-1].replace("-", " ")) == fq:
            return k
    raise NotFound(f"No monograph {query!r}. Use ids like 'dsc:3.45' (Dioscorides book.chapter) or "
                   "'cul:261-garden-rue'; get_plant lists the monographs for each plant.")


# ---------------------------------------------------------------- tools


def search_plants(query: str, limit: int = 10) -> dict:
    """Find plants by any name, accent-insensitively, across languages and eras.

    Matches accepted Latin binomials, curated alternative identifications, genus and family,
    Dioscorides' Greek headwords and synonyms (with or without accents and breathings:
    'πήγανον', 'πηγανον' and 'ΠΗΓΑΝΟΝ' are equivalent), Culpeper's English headings and
    aliases, and modern common names. Use the returned ``taxon`` with get_plant,
    trace_claim or compare_eras.

    Args:
        query: a name in Greek, English or Latin, e.g. "rue", "πήγανον", "Ruta", "wormwood".
        limit: maximum number of plants to return (1-50).
    """
    limit = max(1, min(int(limit or 10), 50))
    hits = _rank(query)[:limit]
    by = D.plants_by_taxon()
    tx = D.texts()
    results = []
    for h in hits:
        p = by[h["taxon"]]
        cl = p.get("claims", [])
        results.append({
            "taxon": p["taxon"], "common_name": p.get("common_name"), "family": p.get("family"),
            "matched_name": h["matched_name"], "matched_field": h["matched_field"],
            "match_score": h["score"],
            "names": [{"source": n["source"], "name": n["name"], "monograph_id": n["monograph_id"],
                       "ref": tx.get(n["monograph_id"], {}).get("ref")} for n in p.get("names", [])],
            "n_indications": len(cl), "n_persistent": sum(1 for c in cl if c.get("persistent")),
            "explorer_url": _plant_url(p["taxon"]),
        })
    return {
        "query": query, "folded_query": D.fold(query), "n_results": len(results), "results": results,
        "provenance": _prov(["web/public/data/plants.json", "data/processed/monograph_taxa.csv",
                             "data/interim/monographs.jsonl"]),
    }


def get_plant(taxon: str) -> dict:
    """Everything Palimpsest knows about one plant.

    Returns its names across eras (Dioscorides c. 60 CE Greek headword, Culpeper 1653 English
    heading, each with identification confidence and justification), every extracted
    indication with mention counts per herbal, persistence status and the modern-evidence tier
    (Europe PMC co-mention count, lift, exact query URL), historical warnings recorded by the
    herbals themselves, known constituents (LOTUS via Wikidata), IUCN status, GBIF/Wikidata
    links and any research leads for the plant.

    Args:
        taxon: accepted binomial ("Ruta graveolens") or any name search_plants understands
            ("rue", "πήγανον"); the best match is used and alternatives are reported.
    """
    p, others = resolve_taxon(taxon)
    t = p["taxon"]
    tx = D.texts()
    mt = D.monograph_taxa()
    names = []
    for n in p.get("names", []):
        r = mt.get(n["monograph_id"], {})
        era = D.ERA.get(n["source"], {})
        names.append({
            "era": era.get("date"), "source": n["source"], "work": era.get("work"),
            "language": era.get("language"), "name": n["name"], "monograph_id": n["monograph_id"],
            "ref": tx.get(n["monograph_id"], {}).get("ref"), "identification_confidence": n.get("confidence"),
            "justification": n.get("note") or None,
            "alternative_identifications": [a.strip() for a in (r.get("alternatives") or "").split(";") if a.strip()],
            "source_url": _source_url(n["monograph_id"]), "cts_urn": _cts_urn(n["monograph_id"]),
        })
    claims = []
    for c in p.get("claims", []):
        cc = _concept(c["concept_id"])
        q = epmc_query(t, c["concept_id"]) if c.get("epmc_pair") is not None else None
        claims.append({
            **cc, "dioscorides_mentions": c.get("dsc", 0), "culpeper_mentions": c.get("cul", 0),
            "status": _status(c.get("dsc"), c.get("cul")),
            "europepmc_copapers": c.get("epmc_pair"), "lift": c.get("lift"),
            "evidence_tier": c.get("evidence_tier"),
            "europepmc_url": epmc_urls(q)["web"] if q else None,
        })
    warnings = []
    for mid in D.monographs_by_taxon().get(t, []):
        for s in D.claims_by_monograph().get(mid, []):
            if s["polarity"] == "adverse":
                warnings.append({"source": s["source"], "monograph_id": mid, "concept_id": s["concept_id"],
                                 "match": s["match"], "clause": s["clause"], "start": s["start"], "end": s["end"]})
    comps = D.compounds().get(t, [])
    plant_leads = [{"rank": L["rank"], "concept_id": L["concept_id"], "label": L["label"], "score": L["score"]}
                   for L in D.leads() if L["taxon"] == t]
    info = D.taxon_info().get(t, {})
    out = {
        "taxon": t, "common_name": p.get("common_name"), "family": p.get("family"), "rank": p.get("rank"),
        "resolved_from": taxon if taxon != t else None, "other_matches": others,
        "names_across_eras": names,
        "indications": claims,
        "counts": {"indications": len(claims),
                   "persisted": sum(1 for c in claims if c["status"] == "persisted"),
                   "dioscorides_only": sum(1 for c in claims if c["status"] == "dioscorides_only"),
                   "culpeper_only": sum(1 for c in claims if c["status"] == "culpeper_only")},
        "historical_warnings": warnings,
        "constituents": {
            "n_known": p.get("n_compounds", 0),
            "examples": comps[:15] or p.get("top_compounds", []),
            "source": "LOTUS natural-product occurrences via Wikidata (occurrence, not activity)",
        },
        "modern_literature": {"europepmc_papers_on_plant": p.get("epmc_total"),
                              "clinical_trials": p.get("trials"),
                              "query_date": D.evidence_meta().get("queried"),
                              "plant_query": epmc_urls(_taxon_query(t))["web"]},
        "conservation": {"iucn": _iucn(p.get("iucn")), "gbif_occurrences": p.get("gbif_occurrences")},
        "identifiers": {"gbif_key": p.get("gbif_key"), "gbif_url": _gbif_url(p.get("gbif_key")),
                        "wikidata": p.get("wikidata"), "wikidata_url": _wd_url(p.get("wikidata"))},
        "leads": plant_leads,
        "lead_score": p.get("lead_score"),
        "explorer_url": _plant_url(t),
        "responsible_use": D.RESPONSIBLE_USE,
        "provenance": _prov(
            ["web/public/data/plants.json", "web/public/data/texts.json", "data/processed/claims.csv",
             "data/processed/monograph_taxa.csv", "data/processed/taxon_compounds.csv",
             "data/processed/pairs_scored.csv", "data/lexicons/concepts.csv"],
            {"dioscorides": D.DIOSCORIDES_TEI, "culpeper": D.CULPEPER_GUTENBERG,
             "gbif": _gbif_url(p.get("gbif_key")) or "", "wikidata": _wd_url(p.get("wikidata")) or ""},
            notes="tier: unstudied = 0, sparse = 1-4, studied >= 5 co-mentioning Europe PMC records; "
                  "lift = (papers + 0.5) / (expected + 0.5), expected = plant hits x indication hits / N.",
        ),
    }
    ex = D.extra_for_taxon(t)
    if ex:
        out["extra"] = ex
        out["provenance"]["files"] += [f"web/public/data/extra/{k}.json" for k in ex]
    if not info and not claims:
        out["note"] = "No indications were extracted for this taxon."
    return out


def _span(s: dict, text: str) -> dict:
    c = _concept(s["concept_id"])
    return {
        "claim_id": s["claim_id"], "start": s["start"], "end": s["end"], "text": text[s["start"]:s["end"]],
        "concept_id": s["concept_id"], "label": c["label"], "category": c["category"],
        "mesh_id": c["mesh_id"], "mesh_url": c["mesh_url"], "polarity": s["polarity"],
        "counted_as_claim": s["polarity"] in D.POSITIVE, "clause": s["clause"],
    }


def _highlight(text: str, spans: list[dict]) -> str:
    out, pos = [], 0
    for s in sorted(spans, key=lambda s: (s["start"], -s["end"])):
        if s["start"] < pos:
            continue  # overlapping span: keep the first
        out.append(text[pos:s["start"]])
        tag = s["concept_id"] if s["polarity"] in D.POSITIVE else f'{s["concept_id"]}:{s["polarity"]}'
        out.append(f"[[{text[s['start']:s['end']]}]]{{{tag}}}")
        pos = s["end"]
    out.append(text[pos:])
    return "".join(out)


def get_passage(monograph_id: str, highlight: bool = True) -> dict:
    """The text of one Dioscorides chapter or Culpeper monograph with its extracted spans.

    Dioscorides chapters are the Greek text of Wellmann's edition; Culpeper monographs are the
    'Government and virtues' section (character offsets refer to the returned ``text``). Each
    span gives start/end offsets, the matched words, the MeSH-linked indication concept and its
    polarity: therapeutic/action spans count as claims; 'adverse' spans are warnings recorded
    by the author; 'negated' spans were matched but rejected.

    Args:
        monograph_id: e.g. "dsc:3.45", "3.45" (book.chapter), "cul:261-garden-rue" or a headword
            such as "πήγανον" or "Garden-Rue".
        highlight: also return ``highlighted_text`` where each span is written
            ``[[matched words]]{concept_id}``.
    """
    mid = resolve_monograph(monograph_id)
    t = D.texts()[mid]
    text = t["text"]
    spans = [_span(s, text) for s in D.claims_by_monograph().get(mid, [])]
    r = D.monograph_taxa().get(mid, {})
    src = t.get("source") or ("dioscorides" if mid.startswith("dsc:") else "culpeper")
    out = {
        "monograph_id": mid, "ref": t.get("ref"), "headword": t.get("headword"), "language": t.get("lang"),
        "source": D.ERA.get(src), "cts_urn": _cts_urn(mid),
        "section": "full chapter" if src == "dioscorides" else "Government and virtues",
        "identification": {
            "taxon": r.get("taxon") or None, "kind": r.get("kind") or None,
            "scientific_name": r.get("scientific_name") or None, "confidence": r.get("confidence") or None,
            "alternatives": [a.strip() for a in (r.get("alternatives") or "").split(";") if a.strip()],
            "justification": r.get("note") or None,
            "explorer_url": _plant_url(r["taxon"]) if r.get("taxon") else None,
        },
        "text": text,
        "spans": spans,
        "n_claims": sum(1 for s in spans if s["counted_as_claim"]),
        "concepts": sorted({s["concept_id"] for s in spans if s["counted_as_claim"]}),
        "provenance": _prov(["web/public/data/texts.json", "data/processed/claims.csv",
                             "data/processed/monograph_taxa.csv"], {"text": _source_url(mid)},
                            licence=D.ERA[src]["licence"] if src in D.ERA else None,
                            offsets="Python str indices (Unicode code points) into `text`"),
    }
    if highlight:
        out["highlighted_text"] = _highlight(text, spans)
    if r.get("taxon"):
        out["responsible_use"] = D.RESPONSIBLE_USE
    return out


def _spans_for(taxon: str, concept_id: str, source: str) -> list[dict]:
    tx = D.texts()
    out = []
    for mid in D.monographs_by_taxon().get(taxon, []):
        if not mid.startswith("dsc:" if source == "dioscorides" else "cul:"):
            continue
        text = tx.get(mid, {}).get("text", "")
        for s in D.claims_by_monograph().get(mid, []):
            if s["concept_id"] == concept_id:
                out.append({"monograph_id": mid, "ref": tx.get(mid, {}).get("ref"),
                            "headword": tx.get(mid, {}).get("headword"),
                            "start": s["start"], "end": s["end"], "match": text[s["start"]:s["end"]],
                            "clause": s["clause"], "polarity": s["polarity"],
                            "counted_as_claim": s["polarity"] in D.POSITIVE, "claim_id": s["claim_id"],
                            "source_url": _source_url(mid), "cts_urn": _cts_urn(mid)})
    return out


def _modern(taxon: str, concept_id: str) -> dict:
    row = D.pairs().get((taxon, concept_id))
    meta = D.evidence_meta()
    q = epmc_query(taxon, concept_id)
    if row is None:
        return {"queried": False,
                "reason": "pair not in the Europe PMC sample (only species-level taxa with claims, plus 12 "
                          "random unclaimed indications per plant, were queried)",
                "query": q, "query_urls": epmc_urls(q) if q else None}
    return {
        "queried": True, "query_date": meta.get("queried"), "query": q, "query_urls": epmc_urls(q) if q else None,
        "copapers": row.get("pair"), "papers_on_plant": row.get("taxon_total"),
        "papers_on_indication": row.get("concept_total"), "N_records": row.get("N"),
        "expected_under_independence": _r(row.get("expected")), "lift": _r(row.get("lift")),
        "evidence_tier": row.get("tier"), "tier_definition": TIERS.get(row.get("tier")),
        "group": row.get("group"),
        "definitions": "expected = plant hits x indication hits / N; lift = (copapers + 0.5) / (expected + 0.5). "
                       "Fields TITLE_ABS and KW, synonym=false, accepted binomial only.",
        "caveat": "Co-mention counts measure research attention, not efficacy.",
    }


def _constituents(taxon: str, n: int = 10) -> dict:
    comps = D.compounds().get(taxon, [])
    p = D.plants_by_taxon().get(taxon, {})
    return {"n_known": p.get("n_compounds", len(comps)), "examples": comps[:n],
            "source": "LOTUS natural-product occurrences via Wikidata (occurrence, not activity)"}


def trace_claim(taxon: str, concept: str) -> dict:
    """Follow one plant-indication claim through 1,600 years and into modern science.

    Chain: (1) the Greek span(s) in Dioscorides with character offsets and the clause they occur
    in -> (2) the MeSH-linked indication concept -> (3) the matching span(s) in Culpeper (1653)
    -> (4) modern Europe PMC co-mention count, expectation, lift and evidence tier, with the exact
    query string and URLs to re-run it -> (5) known constituents. Also reports whether the claim
    persisted, and the lead rank if it is a ranked research lead.

    Args:
        taxon: plant, e.g. "Ruta graveolens" or "rue".
        concept: indication as concept id ("eye_disease"), MeSH id ("D005128"), label or plain
            words ("eyes", "dim sight", "jaundice").
    """
    p, others = resolve_taxon(taxon)
    t = p["taxon"]
    claimed = [c["concept_id"] for c in p.get("claims", [])]
    c = resolve_concept(concept, prefer=claimed)
    cid = c["concept_id"]
    gr = _spans_for(t, cid, "dioscorides")
    en = _spans_for(t, cid, "culpeper")
    pc = next((x for x in p.get("claims", []) if x["concept_id"] == cid), None)
    dsc_pos = sum(1 for s in gr if s["counted_as_claim"])
    cul_pos = sum(1 for s in en if s["counted_as_claim"])
    status = _status(dsc_pos, cul_pos) if (dsc_pos or cul_pos) else "not_claimed"
    modern = _modern(t, cid)
    lead = next((L for L in D.leads() if L["taxon"] == t and L["concept_id"] == cid), None)
    cname = p.get("common_name") or t
    if status == "not_claimed":
        summary = f"Neither herbal makes a {c['label']} claim for {t} in our extraction."
    else:
        who = {"persisted": "Both Dioscorides and Culpeper", "dioscorides_only": "Only Dioscorides",
               "culpeper_only": "Only Culpeper"}[status]
        summary = (f"{who} claim {cname} ({t}) for {c['label']} "
                   f"({dsc_pos} Greek span(s), {cul_pos} English span(s)).")
        if modern.get("queried"):
            summary += (f" Europe PMC: {modern['copapers']} record(s) co-mention plant and indication "
                        f"out of {modern['papers_on_plant']} on the plant (tier: {modern['evidence_tier']}).")
        if lead:
            summary += f" Ranked research lead #{lead['rank']}."
    return {
        "taxon": t, "common_name": p.get("common_name"), "resolved_from": taxon if taxon != t else None,
        "other_matches": others, "concept_query": concept, "status": status, "summary": summary,
        "chain": {
            "1_dioscorides_greek": gr,
            "2_concept": {**_concept(cid), "europepmc_terms": c.get("epmc_terms", [])},
            "3_culpeper_english": en,
            "4_modern_evidence": modern,
            "5_constituents": _constituents(t),
        },
        "lead": None if lead is None else {"rank": lead["rank"], "score": lead["score"], "why": lead.get("why")},
        "other_indications_claimed": [x for x in claimed if x != cid],
        "explorer_url": _plant_url(t),
        "responsible_use": D.RESPONSIBLE_USE,
        "provenance": _prov(
            ["data/processed/claims.csv", "web/public/data/texts.json", "data/processed/monograph_taxa.csv",
             "data/lexicons/concepts.csv", "data/processed/pairs_scored.csv",
             "data/processed/taxon_compounds.csv", "results/evidence_meta.json"],
            {"dioscorides": D.DIOSCORIDES_TEI, "culpeper": D.CULPEPER_GUTENBERG,
             "mesh": _mesh_url(c.get("mesh_id")) or "",
             "europepmc": (modern.get("query_urls") or {}).get("web", "")},
            offsets="Python str indices into the passage text returned by get_passage",
        ),
    }


def _lead_row(L: dict, full: bool = False) -> dict:
    tab = D.leads_table().get(L["rank"], {})
    p = D.plants_by_taxon().get(L["taxon"], {})
    row = {
        "rank": L["rank"], "taxon": L["taxon"], "common_name": p.get("common_name"),
        "concept_id": L["concept_id"], "label": L["label"], "category": tab.get("category"),
        "score": L["score"], "dioscorides_mentions": tab.get("n_dsc"), "culpeper_mentions": tab.get("n_cul"),
        "europepmc_copapers": L.get("epmc_pair"), "europepmc_papers_on_plant": L.get("epmc_taxon"),
        "evidence_tier": tab.get("tier"), "n_constituents": L.get("n_compounds"),
        "iucn": _iucn(L.get("iucn")), "flag_historical_safety": bool(L.get("flag_historical_safety")),
        "flag_threatened": bool(L.get("flag_threatened")), "why": L.get("why"),
    }
    if full:
        row.update({
            "dioscorides_quote": L.get("dsc_quote"), "dioscorides_ref": L.get("dsc_ref"),
            "culpeper_quote": L.get("cul_quote"), "culpeper_ref": L.get("cul_ref"),
            "score_components": {k: _r(tab.get(k)) for k in ("persistence", "chemistry", "surprise", "gap")},
            "score_formula": "score = 0.35*persistence + 0.25*chemistry + 0.40*gap; persistence = min(1, "
                             "mentions/6); chemistry = min(1, log(1+constituents)/log(501)); gap = 0.5/(1+papers)"
                             " + 0.5*surprise; surprise = min(1, -log10 P(X<=papers | Poisson(expected))/3)",
            "volume_aware_expected": _r(tab.get("expected")),
        })
    return row


def list_leads(limit: int = 20, category: str | None = None, hide_flagged: bool = False) -> dict:
    """Ranked research leads: indications both herbals claim for a plant that modern literature
    has barely examined (<= 4 co-mentioning Europe PMC papers), scored on persistence, known
    chemistry and a volume-aware evidence gap. Every lead needs a chapter on the plant itself in
    both herbals. Safety (warnings in the herbals themselves) and IUCN threat are flags, never
    part of the score.

    Args:
        limit: number of leads (1-60), in rank order.
        category: optional filter on indication category or label, e.g. "Skin & wounds",
            "Toxicology", "eye", "Digestive" (case- and accent-insensitive substring).
        hide_flagged: drop leads whose plant carries a historical safety warning or is threatened.
    """
    limit = max(1, min(int(limit or 20), 60))
    rows = [_lead_row(L) for L in sorted(D.leads(), key=lambda x: x["rank"])]
    if category:
        fc = D.fold(category)
        rows = [r for r in rows if fc in D.fold(r.get("category")) or fc in D.fold(r.get("label"))
                or fc in D.fold(r.get("concept_id", "").replace("_", " "))]
    if hide_flagged:
        rows = [r for r in rows if not (r["flag_historical_safety"] or r["flag_threatened"])]
    cats = sorted({r.get("category") for r in (_lead_row(L) for L in D.leads()) if r.get("category")})
    kn = D.key_numbers()
    return {
        "n_total_leads": len(D.leads()), "n_candidates": kn.get("N_LEAD_CANDIDATES"),
        "n_matching": len(rows), "filters": {"category": category, "hide_flagged": hide_flagged},
        "leads": rows[:limit], "categories": cats,
        "responsible_use": D.RESPONSIBLE_USE,
        "provenance": _prov(["web/public/data/leads.json", "results/tables/leads.csv",
                             "web/public/data/plants.json"],
                            notes="flag_historical_safety = one of the herbals records an adverse effect "
                                  "for this plant; use get_lead(rank) for quotes, score components and the "
                                  "full trace."),
    }


def get_lead(rank: int) -> dict:
    """One research lead in full: both historical quotations with references, score components
    and formula, safety/IUCN flags, and the complete trace_claim chain (Greek span -> MeSH ->
    Culpeper span -> Europe PMC query URL and counts -> constituents).

    Args:
        rank: lead rank, 1 (strongest) to 60.
    """
    by = {L["rank"]: L for L in D.leads()}
    if int(rank) not in by:
        raise NotFound(f"No lead with rank {rank}; ranks run 1-{max(by) if by else 0}.")
    L = by[int(rank)]
    out = _lead_row(L, full=True)
    tr = trace_claim(L["taxon"], L["concept_id"])
    out["trace"] = {k: tr[k] for k in ("status", "summary", "chain")}
    out["explorer_url"] = f"{D.EXPLORER}#/leads"
    out["plant_url"] = _plant_url(L["taxon"])
    out["responsible_use"] = D.RESPONSIBLE_USE
    out["provenance"] = tr["provenance"]
    out["provenance"]["files"] = sorted(set(out["provenance"]["files"]) |
                                        {"web/public/data/leads.json", "results/tables/leads.csv"})
    return out


def _ci(v: Any) -> dict | None:
    if isinstance(v, list) and len(v) == 3:
        return {"estimate": v[0], "ci95": [v[1], v[2]]}
    return None


def get_findings() -> dict:
    """Headline statistics with 95% confidence intervals and the tests behind them.

    Covers the corpus, extraction accuracy against a blind reference (P/R/F1 with CIs), name
    concordance, the transmission test (does Culpeper repeat Dioscorides more than chance?
    fold enrichment, z, permutation p and five stricter nulls) and the modern-evidence models
    (share of pairs ever studied by group with CIs, odds ratios, rate ratio once studied).
    """
    kn = D.key_numbers()
    sm = D.summary()
    st = D.stats()
    groups = {g["group"]: g for g in st.get("modern", {}).get("groups", [])}
    tr = st.get("transmission", {})
    ev = sm.get("extraction_eval", {})
    mod = st.get("modern", {})

    def model(rows, key):
        return [{"term": r["term"], key: _r(r[key]), "ci95": [_r(x) for x in r["ci"]], "p": r.get("p"),
                 "model": r.get("model"), "n_obs": r.get("n_obs")} for r in rows or []]

    return {
        "headline": sm.get("headline", []),
        "corpus": {k: kn.get(k) for k in ("N_CHAPTERS_DSC", "N_MONO_CUL", "N_TAXA", "N_SPECIES_DSC",
                                          "N_SPECIES_CUL", "N_SHARED_TAXA", "N_CLAIMS", "N_COMPOUNDS",
                                          "KG_NODES", "KG_EDGES")},
        "extraction_accuracy": {
            src: {"precision": _r(v.get("precision")), "precision_ci95": [_r(x) for x in v.get("precision_ci", [])],
                  "recall": _r(v.get("recall")), "recall_ci95": [_r(x) for x in v.get("recall_ci", [])],
                  "f1": _r(v.get("f1")), "n_monographs": v.get("n_monographs")}
            for src, v in ev.items()
        } | {"f1_ci95": {"dioscorides": kn.get("F1_GRC_CI"), "culpeper": kn.get("F1_EN_CI")},
             "reference": "blind AI-assisted reference annotation (random samples, seed 2026)"},
        "name_concordance": {"gbif_resolved": kn.get("GBIF_RESOLVED"),
                             "agreement_wikidata_greek": kn.get("NAME_AGREE_GREEK"),
                             "agreement_gbif_english": kn.get("NAME_AGREE_EN")},
        "transmission": {
            "question": "Does Culpeper (1653) repeat Dioscorides' (c. 60 CE) indication for the same plant "
                        "more often than chance?",
            "shared_species": tr.get("n_shared_taxa"), "observed_shared_claims": tr.get("observed_overlap"),
            "expected_by_chance": _r(tr.get("null_mean"), 1), "null_quantiles": tr.get("null_q"),
            "fold_enrichment": _r(tr.get("fold_enrichment")), "z": _r(tr.get("z"), 1),
            "p_value": tr.get("p_value"), "n_permutations": tr.get("n_perm"),
            "share_culpeper_already_in_dioscorides": _r(tr.get("share_cul_in_dsc")),
            "share_expected_by_chance": kn.get("SHARE_CUL_IN_DSC_CHANCE"),
            "sensitivity": {k: {"fold": _r(v.get("fold_enrichment")), "p": v.get("p_value"),
                                "observed": v.get("observed_overlap"), "n_shared_taxa": v.get("n_shared_taxa")}
                            for k, v in st.get("transmission_sensitivity", {}).items()},
        },
        "modern_evidence": {
            "records_queried": mod.get("N_records"), "plant_indication_pairs": kn.get("N_PAIRS_QUERIED"),
            "share_with_any_paper": {g: {"share": _r(v.get("share_any_paper")),
                                         "ci95": [_r(x) for x in v.get("share_any_paper_ci", [])],
                                         "matched_unclaimed_share": _r(v.get("matched_unclaimed_share")),
                                         "n_pairs": v.get("n_pairs")} for g, v in groups.items()},
            "odds_ratio_studied_at_all": {"persistent": _ci(kn.get("OR_BOTH")), "dioscorides_only": _ci(kn.get("OR_DSC")),
                                          "culpeper_only": _ci(kn.get("OR_CUL")), "p_persistent": kn.get("P_OR_BOTH"),
                                          "model": "logit, indication fixed effects + plant research volume, "
                                                   "cluster-robust by plant"},
            "conditional_logit": model(mod.get("conditional_logit"), "odds_ratio"),
            "rate_ratio_once_studied": {"persistent": _ci(kn.get("RR_GIVEN_STUDIED_BOTH")),
                                        "p": kn.get("P_RR_GIVEN_STUDIED_BOTH"),
                                        "models": model(mod.get("poisson_given_studied"), "rate_ratio")},
            "wilcoxon_within_plant_p": kn.get("WILCOXON_P"),
            "interpretation": "Tradition predicts whether modern research looked at an indication, not how "
                              "hard; co-mention measures attention, not efficacy.",
        },
        "leads": {"n_leads": kn.get("N_LEADS"), "n_candidates": kn.get("N_LEAD_CANDIDATES"),
                  "n_iucn_assessed": kn.get("N_LEADS_IUCN_ASSESSED"), "n_threatened": kn.get("N_THREATENED")},
        "responsible_use": D.RESPONSIBLE_USE,
        "provenance": _prov(["results/key_numbers.json", "results/stats.json", "web/public/data/summary.json"],
                            {"methods": f"{D.REPO_URL}/blob/main/docs/METHODS.md"}),
    }


def compare_eras(taxon: str) -> dict:
    """What happened to one plant's medical uses between Dioscorides (c. 60 CE) and Culpeper (1653).

    Splits its indications into persisted (claimed in both herbals), lost (Dioscorides only) and
    new (Culpeper only), each with mention counts and the modern-evidence tier; adds the names
    used in each era, warnings each author recorded, and the category-level shift. Interpret
    'lost' and 'new' with care when the plant has a chapter in only one herbal.

    Args:
        taxon: plant, e.g. "Ruta graveolens", "rue" or "πήγανον".
    """
    p, others = resolve_taxon(taxon)
    t = p["taxon"]
    srcs = {n["source"] for n in p.get("names", [])}
    rows = {"persisted": [], "dioscorides_only": [], "culpeper_only": []}
    cats: dict[str, dict[str, int]] = {}
    for c in p.get("claims", []):
        cc = _concept(c["concept_id"])
        st = _status(c.get("dsc"), c.get("cul"))
        rows[st].append({"concept_id": c["concept_id"], "label": cc["label"], "category": cc["category"],
                         "mesh_id": cc["mesh_id"], "dioscorides_mentions": c.get("dsc", 0),
                         "culpeper_mentions": c.get("cul", 0), "europepmc_copapers": c.get("epmc_pair"),
                         "evidence_tier": c.get("evidence_tier")})
        k = cats.setdefault(cc["category"] or "?", {"dioscorides": 0, "culpeper": 0})
        k["dioscorides"] += 1 if c.get("dsc") else 0
        k["culpeper"] += 1 if c.get("cul") else 0
    nd = len(rows["persisted"]) + len(rows["dioscorides_only"])
    nc = len(rows["persisted"]) + len(rows["culpeper_only"])
    union = nd + len(rows["culpeper_only"])
    warn = {"dioscorides": [], "culpeper": []}
    for mid in D.monographs_by_taxon().get(t, []):
        for s in D.claims_by_monograph().get(mid, []):
            if s["polarity"] == "adverse":
                warn[s["source"]].append({"monograph_id": mid, "concept_id": s["concept_id"], "match": s["match"],
                                          "clause": s["clause"]})
    names = {src: [{"name": n["name"], "monograph_id": n["monograph_id"], "confidence": n.get("confidence")}
                   for n in p.get("names", []) if n["source"] == src] for src in ("dioscorides", "culpeper")}
    caveat = None
    if srcs != {"dioscorides", "culpeper"}:
        only = "Dioscorides" if "dioscorides" in srcs else "Culpeper"
        caveat = (f"This plant has a chapter only in {only} (as identified here), so 'lost'/'new' reflect "
                  "coverage, not a change in medical opinion.")
    tr = D.stats().get("transmission", {})
    return {
        "taxon": t, "common_name": p.get("common_name"), "resolved_from": taxon if taxon != t else None,
        "other_matches": others,
        "eras": {"dioscorides": {**D.ERA["dioscorides"], "names": names["dioscorides"], "n_indications": nd,
                                 "warnings": warn["dioscorides"]},
                 "culpeper": {**D.ERA["culpeper"], "names": names["culpeper"], "n_indications": nc,
                              "warnings": warn["culpeper"]}},
        "persisted": rows["persisted"], "lost": rows["dioscorides_only"], "new": rows["culpeper_only"],
        "counts": {"persisted": len(rows["persisted"]), "lost": len(rows["dioscorides_only"]),
                   "new": len(rows["culpeper_only"]),
                   "jaccard": round(len(rows["persisted"]) / union, 3) if union else None,
                   "share_of_culpeper_already_in_dioscorides": round(len(rows["persisted"]) / nc, 3) if nc else None},
        "corpus_context": {"share_of_culpeper_already_in_dioscorides": _r(tr.get("share_cul_in_dsc")),
                           "expected_by_chance": D.key_numbers().get("SHARE_CUL_IN_DSC_CHANCE"),
                           "fold_enrichment": _r(tr.get("fold_enrichment"))},
        "categories": cats,
        "caveat": caveat,
        "explorer_url": _plant_url(t),
        "responsible_use": D.RESPONSIBLE_USE,
        "provenance": _prov(["web/public/data/plants.json", "data/processed/claims.csv",
                             "data/processed/monograph_taxa.csv", "data/lexicons/concepts.csv",
                             "results/stats.json"],
                            {"dioscorides": D.DIOSCORIDES_TEI, "culpeper": D.CULPEPER_GUTENBERG}),
    }


def licence_and_citation() -> dict:
    """Licences of every source and derived dataset, and how to cite Palimpsest."""
    return {
        "citation": {
            "text": "Palimpsest: reading 2,000 years of European materia medica against modern evidence. "
                    f"EthnoHack 2026. {D.REPO_URL}",
            "bibtex": "@misc{palimpsest2026,\n  title = {Palimpsest: reading 2,000 years of European materia "
                      "medica against modern evidence},\n  author = {{Palimpsest team}},\n  year = {2026},\n"
                      "  note = {EthnoHack 2026},\n  howpublished = {\\url{" + D.REPO_URL + "}}\n}",
            "data_snapshot": _generated(), "europepmc_query_date": D.evidence_meta().get("queried"),
        },
        "licences": {
            "code": "MIT",
            "derived_data_with_greek_text": "CC BY-SA 4.0 (data/interim, data/processed, web texts), as required by the source",
            "curated_tables_and_lexicons": "CC BY 4.0",
            "reference_annotations": "CC BY-SA 4.0 (they quote Greek)",
        },
        "sources": [
            {"name": "Dioscorides, De materia medica, ed. M. Wellmann (1906-1914), First1KGreek "
                     "tlg0656.tlg001.1st1K-grc1", "use": "Greek text", "licence": "CC BY-SA 4.0",
             "url": D.DIOSCORIDES_TEI},
            {"name": "N. Culpeper, The Complete Herbal, Project Gutenberg #49513", "use": "English text",
             "licence": "Public domain (US)", "url": D.CULPEPER_GUTENBERG},
            {"name": "Europe PMC REST API", "use": "literature co-mention counts",
             "licence": "free API; metadata reuse per EMBL-EBI terms", "url": "https://europepmc.org/RestfulWebService"},
            {"name": "ClinicalTrials.gov API v2", "use": "trial counts", "licence": "Public domain (US Government)",
             "url": "https://clinicaltrials.gov/data-api/api"},
            {"name": "GBIF backbone taxonomy & occurrence API", "use": "name resolution, occurrence counts",
             "licence": "CC BY 4.0", "url": "https://www.gbif.org/"},
            {"name": "Wikidata (incl. LOTUS natural-product occurrences, IUCN status)",
             "use": "constituents, threat status, Greek names", "licence": "CC0", "url": "https://www.wikidata.org/"},
            {"name": "NLM MeSH", "use": "concept identifiers", "licence": "NLM terms (free)",
             "url": "https://meshb.nlm.nih.gov/"},
        ],
        "responsible_use": D.RESPONSIBLE_USE + " No knowledge was collected from living communities; only "
                           "published, public-domain or openly licensed European texts are used. Plant "
                           "identifications and reference annotations were made with AI assistance and carry "
                           "confidence levels open to expert correction.",
        "provenance": _prov(["README.md"], {"repository": D.REPO_URL}),
    }
