"""Expert plant identifications of Lardos et al. (2024) for 61 Dioscorides plants.

Lardos A, Patmore K, Allkin R, Lazarou R, Nesbitt M, Scott AC, Zipser B (2024).
*A systematic methodology to assess the identity of plants in historical texts:
a case study based on the Byzantine pharmacy text John the Physician's
Therapeutics.* J Ethnopharmacol 322:117622. doi:10.1016/j.jep.2023.117622
(Europe PMC PMC7615571, CC BY 4.0). Raw data: figshare doi:10.17637/rh.23736189
(CC BY 4.0).

Access (tested 2026-11-08)
--------------------------
* Every figshare host (``api.figshare.com``, ``figshare.com``,
  ``royalholloway.figshare.com``, ``ndownloader``) answers **HTTP 403** (AWS ELB)
  to this network, for the article, its file list and even ``/v2/licenses``.
  :func:`figshare_status` records that attempt.
* The licence of the figshare record is verified through DataCite
  (:func:`datacite_record`): ``cc-by-4.0``.
* The expert results themselves are published in the open-access article:
  **Table 1** (the 61 information-rich DMM plants, their Greek names and DMM
  book/chapter) and **Table 2** (for each DMM plant, every candidate species,
  classified by the statistical evaluation of the botanical analysis as
  *Strong / Moderate / Weak candidate / Not contained in FT or FC*, with the
  medicinal-analysis score 0-3 in parentheses). We parse both from the Europe
  PMC full-text JATS XML (same licence, CC BY).

All requests go through :mod:`palimpsest.sources.http` (cache + rate limits).
"""
from __future__ import annotations

import html
import re
import unicodedata

from .http import FetchError, get_json, get_text

PMCID = "PMC7615571"
ARTICLE_DOI = "10.1016/j.jep.2023.117622"
DATA_DOI = "10.17637/rh.23736189"
FIGSHARE_ID = 23736189
FULLTEXT_URL = f"https://www.ebi.ac.uk/europepmc/webservices/rest/{PMCID}/fullTextXML"
TIERS = ["strong", "moderate", "weak", "not_in_flora"]
TIER_RANK = {t: i for i, t in enumerate(TIERS)}


# --------------------------------------------------------------------------- fetch
def figshare_status() -> dict:
    """Try the figshare API; return what happened (it is blocked from here)."""
    out = {}
    for url in (f"https://api.figshare.com/v2/articles/{FIGSHARE_ID}",
                f"https://api.figshare.com/v2/articles/{FIGSHARE_ID}/files"):
        try:
            body = get_json(url, namespace="figshare", retries=1)
            out[url] = {"ok": True, "n_files": len(body) if isinstance(body, list) else len(body.get("files", []))}
        except FetchError as exc:
            out[url] = {"ok": False, "status": exc.status, "error": str(exc)[:160]}
    return out


def datacite_record() -> dict:
    """Licence and metadata of the figshare dataset, via DataCite."""
    b = get_json(f"https://api.datacite.org/dois/{DATA_DOI}", namespace="datacite")
    a = b["data"]["attributes"]
    return {"doi": DATA_DOI, "title": a["titles"][0]["title"],
            "creators": [c["name"] for c in a.get("creators", [])],
            "year": a.get("publicationYear"), "url": a.get("url"),
            "licence": [r.get("rightsIdentifier") for r in a.get("rightsList", [])],
            "size_bytes": a.get("sizes")}


def article_record() -> dict:
    b = get_json("https://www.ebi.ac.uk/europepmc/webservices/rest/search",
                 {"query": f'DOI:"{ARTICLE_DOI}"', "format": "json", "resultType": "core"},
                 namespace="europepmc_meta")
    r = b["resultList"]["result"][0]
    return {"pmcid": r.get("pmcid"), "pmid": r.get("pmid"), "title": r.get("title"),
            "licence": r.get("license"), "open_access": r.get("isOpenAccess"),
            "journal": "J Ethnopharmacol 322:117622 (2024)"}


def fulltext_xml() -> str:
    return get_text(FULLTEXT_URL, namespace="europepmc_fulltext")


# --------------------------------------------------------------------------- parse
_TABLE = re.compile(r'<table-wrap[^>]*id="(T\d+)".*?</table-wrap>', re.S)
_ROW = re.compile(r"<tr>(.*?)</tr>", re.S)
_CELL = re.compile(r"<t[dh]([^>]*?)(?:/>|>(.*?)</t[dh]>)", re.S)


def tables(xml: str) -> dict[str, str]:
    return {m.group(1): m.group(0) for m in _TABLE.finditer(xml)}


def text_of(cell_xml: str) -> str:
    t = re.sub(r"<[^>]+>", " ", cell_xml or "")
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def table_rows(table_xml: str) -> list[list[str]]:
    """Body rows as lists of raw cell XML (rowspan/colspan expanded)."""
    body = table_xml.split("<tbody>", 1)[-1]
    grid: list[list[str]] = []
    carry: dict[int, tuple[int, str]] = {}
    for rm in _ROW.finditer(body):
        row: list[str] = []
        cells = list(_CELL.finditer(rm.group(1)))
        ci = 0
        col = 0
        while ci < len(cells) or col in carry:
            if col in carry:
                n, v = carry[col]
                row.append(v)
                carry[col] = (n - 1, v)
                if n - 1 <= 0:
                    del carry[col]
                col += 1
                continue
            attrs, content = cells[ci].group(1), cells[ci].group(2) or ""
            ci += 1
            rs = int((re.search(r'rowspan="(\d+)"', attrs) or [0, 1])[1])
            cs = int((re.search(r'colspan="(\d+)"', attrs) or [0, 1])[1])
            for _ in range(cs):
                row.append(content)
                if rs > 1:
                    carry[col] = (rs - 1, content)
                col += 1
        grid.append(row)
    return grid


def merge_continuations(rows: list[list[str]], key_col: int = 0) -> list[list[str]]:
    """Rows whose key cell is empty continue the previous row (page breaks and
    wrapped cells in the PDF-derived XML): concatenate cell XML column-wise."""
    out: list[list[str]] = []
    for r in rows:
        is_cont = key_col >= len(r) or not text_of(r[key_col])
        if out and is_cont:
            prev = out[-1]
            for i, v in enumerate(r):
                if i < len(prev):
                    prev[i] = (prev[i] + " " + v) if v else prev[i]
                else:
                    prev.append(v)
        else:
            out.append(list(r))
    return out


_SCORE = re.compile(r"\((\d)\)")
_ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5}


def parse_candidates(cell_xml: str) -> list[dict]:
    """``<italic>Genus species</italic> Author (score) ...`` -> [{name, score}].

    The italic run carries the name; the next ``(d)`` after it is the
    medicinal-analysis score. Hybrid signs and infraspecific ranks are kept in
    ``name_full``; ``name`` is the binomial (or genus) used for matching."""
    s = html.unescape(cell_xml or "")
    s = re.sub(r"</?bold>|</?sup>|</?sub>", "", s)
    # merge adjacent italic runs separated only by '×' or whitespace (hybrids)
    s = re.sub(r"</italic>\s*(×)?\s*<italic[^>]*>", lambda m: " × " if m.group(1) else " ", s)
    out = []
    parts = re.split(r"<italic[^>]*>", s)
    for part in parts[1:]:
        name, _, rest = part.partition("</italic>")
        name = re.sub(r"<[^>]+>", " ", name)
        name = re.sub(r"\s+", " ", name).strip(" .,;")
        if not name or not re.match(r"[A-Z][a-z]", name):
            continue
        rest_txt = re.sub(r"<[^>]+>", " ", rest)
        sc = _SCORE.search(rest_txt)
        # 'subsp. barrelieri' sits outside the italics in some rows
        sub = re.match(r"\s*(subsp\.|var\.)\s*<?\w*>?\s*([a-z-]+)", rest)
        full = name + (f" {sub.group(1)} {sub.group(2)}" if sub else "")
        toks = [t for t in name.replace("×", " ").split() if t]
        binom = " ".join(toks[:2]) if len(toks) >= 2 and toks[1][0].islower() else toks[0]
        out.append({"name": binom, "name_full": full, "score": int(sc.group(1)) if sc else None})
    return out


def parse_chapters(text: str) -> list[str]:
    """'V, 2; IV, 181' -> ['5.2', '4.181']."""
    out = []
    for b, c in re.findall(r"\b(IV|V|I{1,3})\s*[,.]\s*(\d+)", text):
        out.append(f"{_ROMAN[b]}.{int(c)}")
    return out


def strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.lower().replace("ς", "σ")


def parse_table1(xml: str) -> list[dict]:
    """Lemma tag -> DMM names, types and chapter references."""
    rows = merge_continuations(table_rows(tables(xml)["T1"]))
    out = []
    for r in rows:
        tag = text_of(r[0]).replace(" ", "_")
        txt = [text_of(c) for c in r]
        # chapter column: first cell that parses as roman,arabic
        chap = []
        for t in txt[6:12]:
            chap = parse_chapters(t)
            if chap:
                break
        out.append({"lemma_tag": tag, "jc_name": txt[1], "dmm_name": txt[4],
                    "dmm_translit": txt[5], "dmm_type": txt[6], "chapters": chap})
    return out


def parse_table2(xml: str) -> list[dict]:
    """One record per DMM plant (61): candidates by tier with medicinal score."""
    rows = merge_continuations(table_rows(tables(xml)["T2"]))
    out = []
    for r in rows:
        tag = text_of(r[0]).replace(" ", "_")
        if not tag.startswith("JCLP"):
            continue
        cands = []
        for tier, cell in zip(TIERS, r[4:8]):
            for c in parse_candidates(cell):
                cands.append({**c, "tier": tier})
        n = re.search(r"\d+", text_of(r[3]))
        out.append({"lemma_tag": tag, "jc_name": text_of(r[1]), "dmm_name": text_of(r[2]),
                    "n_candidates_reported": int(n.group(0)) if n else None,
                    "candidates": cands})
    return out


def best_candidates(cands: list[dict]) -> tuple[list[dict], list[dict]]:
    """(top tier, top-1 after medicinal tie-break). Top tier = candidates in the
    best non-empty botanical tier among Strong/Moderate/Weak (falls back to
    'not in flora' only if nothing else); top-1 = those of the top tier with the
    highest medicinal score (may still be a tie)."""
    if not cands:
        return [], []
    best = min(TIER_RANK[c["tier"]] for c in cands)
    tier = [c for c in cands if TIER_RANK[c["tier"]] == best]
    m = max((c["score"] or 0) for c in tier)
    return tier, [c for c in tier if (c["score"] or 0) == m]
