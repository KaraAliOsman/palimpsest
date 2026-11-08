# Palimpsest MCP server

Query Palimpsest from Claude (or any [Model Context Protocol](https://modelcontextprotocol.io) client):
the Greek of Dioscorides, the English of Culpeper, every extracted claim with its character span,
the modern Europe PMC evidence and the ranked leads. It serves the committed data in this
repository over stdio. It is read-only, needs no API keys and makes no network calls.

> **Responsible use.** Every plant and lead response carries the note *"Computational hypotheses
> for research, not medical advice."* Literature co-mention measures research attention, not
> efficacy, and several historical remedies are toxic.

## Setup

```bash
pip install -e ".[mcp]"                                   # from the repository root; installs the `mcp` SDK
claude mcp add palimpsest -- python -m palimpsest.mcp     # Claude Code, one line
```

Without installing the package, point Python at `src/` instead:
`claude mcp add palimpsest -e PYTHONPATH=/path/to/palimpsest/src -- python -m palimpsest.mcp`.

**Claude Desktop** (`claude_desktop_config.json`; on Windows use the full path to `python.exe`):

```json
{
  "mcpServers": {
    "palimpsest": {
      "command": "python",
      "args": ["-m", "palimpsest.mcp"],
      "env": {"PYTHONPATH": "/path/to/palimpsest/src", "PYTHONIOENCODING": "utf-8"}
    }
  }
}
```

The server works with `mcp` 1.x (`FastMCP`) and 2.x (`MCPServer`); both are tested. By default it
reads the checkout it was imported from. Set `PALIMPSEST_ROOT` to serve a different checkout.

## Tools

All tools are read-only (`readOnlyHint`) and return JSON. Each response has a `provenance` block
listing the repository files it read, the data snapshot date and the source URLs (First1KGreek
TEI, Project Gutenberg, GBIF, Wikidata, MeSH, Europe PMC).

| Tool | Parameters | Returns |
|---|---|---|
| `search_plants` | `query: str`, `limit: int = 10` | Plants matching a Latin, Greek or English name. Matching ignores accents, breathings and final sigma (`πήγανον` = `πηγανον` = `ΠΗΓΑΝΟΝ`). It covers Greek headwords and synonyms, Culpeper headings and aliases, alternative identifications, genus and family. |
| `get_plant` | `taxon: str` | Names across eras, with identification confidence and justification. Every indication with mentions per herbal, status (persisted / Dioscorides only / Culpeper only), MeSH id, Europe PMC co-papers, lift, evidence tier and query URL. Also historical warnings, LOTUS constituents, IUCN status, GBIF and Wikidata links, and leads. |
| `get_passage` | `monograph_id: str`, `highlight: bool = True` | A chapter (`dsc:3.45`, `3.45`, `πήγανον`) or monograph (`cul:261-garden-rue`, `Garden-Rue`), with its text. Each span has offsets, concept, MeSH and polarity. `highlighted_text` marks every span as `[[words]]{concept_id}`. |
| `trace_claim` | `taxon: str`, `concept: str` | The chain from the Greek span(s) with char offsets and clause, to the MeSH concept, to the Culpeper span(s), to the Europe PMC count, expectation, lift and tier with the exact query and URLs, to the constituents. `concept` accepts an id, a MeSH id, a label or plain words ("eyes"). |
| `list_leads` | `limit: int = 20`, `category: str \| None`, `hide_flagged: bool = False` | The ranked persistent, under-studied leads (≤ 4 papers), filtered by category or label. `hide_flagged` drops leads with a historical safety warning or a threatened status. |
| `get_lead` | `rank: int` | One lead in full: both quotations, score components and formula, flags, and the full `trace_claim` chain. |
| `get_findings` | none | The headline statistics with 95% CIs. Covers extraction P/R/F1, name concordance, the transmission test with five stricter nulls, the share studied by group, odds ratios and the rate ratio once a pair has been studied. |
| `compare_eras` | `taxon: str` | What persisted, what was lost (Dioscorides only) and what was new (Culpeper only) for one plant. Includes the names and warnings of each era, the category shift and corpus context. If the plant appears in only one herbal, it adds a caveat. |

**Resources:**
* `palimpsest://licences`: source and data licences, plus the citation as text and BibTeX.
* `palimpsest://concepts`: the 85 MeSH-linked concepts.
* `palimpsest://data-files`: the files read and whether each is present. Optional
  `web/public/data/extra/*.json` files are attached to `get_plant` when present and ignored when absent.

## Example questions (real outputs, data of 2026-11-08)

### 1. "What did Dioscorides and Culpeper both say about rue, and has anyone tested it?"

Claude calls `search_plants("rue")`, then `compare_eras("Ruta graveolens")`, then
`trace_claim("rue", "eyes")`. Excerpts:

```json
// compare_eras -> counts
{"persisted": 20, "lost": 7, "new": 10, "jaccard": 0.541, "share_of_culpeper_already_in_dioscorides": 0.667}
// lost (Dioscorides only): Inflammations, Diarrhoea, Flatulence, Headache, Quartan & tertian agues, Nose-bleeding, Lepra
// new (Culpeper only): Freckles, Ulcers & sores, Venomous bites, Gout, Bleeding, Kidney & bladder, Plague, Sciatica, Spleen, Ringworm
```

```json
// trace_claim("rue", "eyes")
{
 "status": "persisted",
 "summary": "Both Dioscorides and Culpeper claim rue (Ruta graveolens) for Eye complaints / dim sight (2 Greek span(s), 1 English span(s)). Europe PMC: 0 record(s) co-mention plant and indication out of 416 on the plant (tier: unstudied). Ranked research lead #1.",
 "chain": {
  "1_dioscorides_greek": [
   {"monograph_id": "dsc:3.45", "ref": "De materia medica 3.45", "start": 1188, "end": 1194, "match": "ὀφθαλμ",
    "clause": "… καὶ τὰς ἐν ὀφθαλμοῖς περιωδυνίας σὺν ἀλφίτοις καταπλασθὲν πραύνει …",
    "cts_urn": "urn:cts:greekLit:tlg0656.tlg001.1st1K-grc1:3.45"},
   {"monograph_id": "dsc:3.45", "start": 1690, "end": 1697, "match": "ἀμβλυωπ", "clause": "… καὶ ἀμβλυωπίαις βοηθεῖ μετά μαράθου χυλοῦ καὶ μέλιτος …"}
  ],
  "2_concept": {"concept_id": "eye_disease", "label": "Eye complaints / dim sight", "mesh_id": "D005128"},
  "3_culpeper_english": [
   {"monograph_id": "cul:261-garden-rue", "start": 2025, "end": 2043, "match": "dimness of the eye",
    "clause": "The juice of it and fennel, with a little honey, and the gall of a cock put thereunto, helps the dimness of the eye-sight."}
  ],
  "4_modern_evidence": {
   "copapers": 0, "papers_on_plant": 416, "papers_on_indication": 548193, "N_records": 48227744,
   "expected_under_independence": 4.729, "lift": 0.096, "evidence_tier": "unstudied",
   "query": "(TITLE_ABS:\"Ruta graveolens\" OR KW:\"Ruta graveolens\") AND (TITLE_ABS:(\"eye disease\" OR \"vision\" OR \"cataract\" OR \"ophthalmic\" OR \"retina\") OR KW:(…))",
   "query_urls": {"web": "https://europepmc.org/search?query=%28TITLE_ABS%3A%22Ruta%20graveolens%22…", "api": "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=…&synonym=false"}
  },
  "5_constituents": {"n_known": 204, "examples": [{"name": "beta-sitosterol", "wikidata": "Q121802"}, "…"]}
 },
 "responsible_use": "Computational hypotheses for research, not medical advice. …"
}
```

In short, the two authors agree on 20 uses of rue, among them eye complaints: Dioscorides writes
ἀμβλυωπίαις βοηθεῖ ("helps dim sight") and Culpeper writes "helps the dimness of the eye-sight".
No Europe PMC record co-mentions *Ruta graveolens* with eye disease, against about 4.7 expected
by chance. This is lead #1, and it carries a historical safety flag: Dioscorides calls rue
ἑλκωτικά ("ulcerating").

### 2. "Which under-studied leads carry no historical safety warning?"

Claude calls `list_leads(limit=5, hide_flagged=True)`. 31 of the 60 leads remain:

| rank | taxon | indication | D + C mentions | papers | constituents |
|---|---|---|---|---|---|
| 3 | *Ocimum basilicum* | Venomous bites & stings | 2 + 3 | 0 | 268 |
| 6 | *Origanum vulgare* | Venomous bites & stings | 3 + 2 | 0 | 186 |
| 11 | *Plantago major* | Kidney & bladder complaints | 1 + 2 | 1 | 127 |
| 13 | *Foeniculum vulgare* | Eye complaints / dim sight | 2 + 1 | 4 | 384 |
| 15 | *Origanum majorana* | Bruises / falls / sprains | 2 + 2 | 0 | 63 |

### 3. "How strong is the evidence that Culpeper copied Dioscorides, and does modern research follow tradition?"

Claude calls `get_findings()`. Excerpt:

```json
{"transmission": {"shared_species": 136, "observed_shared_claims": 642, "expected_by_chance": 242.4,
  "fold_enrichment": 2.648, "z": 26.1, "p_value": 9.999e-05, "n_permutations": 10000,
  "share_culpeper_already_in_dioscorides": 0.355, "share_expected_by_chance": 0.134,
  "sensitivity": {"size_stratified": {"fold": 2.11}, "within_family": {"fold": 1.557},
                  "genus_level": {"fold": 2.395}, "high_confidence_ids_only": {"fold": 2.487}, "category_level": {"fold": 1.42}}},
 "modern_evidence": {
  "odds_ratio_studied_at_all": {"persistent": {"estimate": 2.77, "ci95": [2.04, 3.77]},
                                "dioscorides_only": {"estimate": 1.98, "ci95": [1.67, 2.35]},
                                "culpeper_only": {"estimate": 1.65, "ci95": [1.4, 1.94]}, "p_persistent": "9e-11"},
  "rate_ratio_once_studied": {"persistent": {"estimate": 1.04, "ci95": [0.61, 1.76]}, "p": 0.88}}}
```

Culpeper repeats Dioscorides' indication for the same plant 2.6 times more often than chance. The
result holds against the stricter nulls: 1.56 times even within the same botanical family.
Modern research is more likely to have looked at a persistent claim (OR 2.77). Once a claim has
been studied, though, it does not attract more papers (RR 1.04, not significant).

## Testing

```bash
python -m pytest tests/test_mcp.py -q
```

The tests call the tool functions directly, and sockets are blocked during them. They check
that every span offset reproduces its matched text and that `trace_claim` agrees with all 60
leads. They also check that the Europe PMC query matches the pipeline's query builder. One test
starts `python -m palimpsest.mcp` over stdio with the SDK client, lists the tools and calls one.
