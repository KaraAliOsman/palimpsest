"""Parse Dioscorides, *De materia medica* (Greek, ed. Wellmann 1906-1914).

Source: Open Greek and Latin / First1KGreek, ``tlg0656.tlg001.1st1K-grc1.xml``
(CC BY-SA 4.0).  The TEI is split into book > chapter > section; every chapter
opens with its lemma (head-word) followed by a raised dot, e.g.
``ἀψίνθιον· γνώριμος ἡ πόα ...``.  Critical-apparatus footnotes (``<note>``)
are dropped so that only Dioscorides' own words are analysed.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from collections.abc import Iterator

from ..paths import DIOSCORIDES_XML
from ..textnorm import normalize_greek

TEI = "{http://www.tei-c.org/ns/1.0}"
_LEADING_NUM = re.compile(r"^\s*\d+\s*")
_SYNONYM = re.compile(r"οἱ\s+δὲ\s+([^,·.;]+?)(?=[,·.;]|\s+(?:οἱ|καλοῦσι|καλοῦσιν|ὀνομάζουσι))")


def _clean_text(el: ET.Element) -> str:
    parts: list[str] = []

    def rec(e: ET.Element, top: bool = False) -> None:
        tag = e.tag.replace(TEI, "")
        if not top and tag == "div" and e.get("subtype") == "chapter":
            return  # a chapter wrongly nested inside another one (TEI nesting bug)
        if tag == "note":
            if e.tail:
                parts.append(e.tail)
            return
        if tag == "lb":
            if e.tail:
                parts.append(e.tail)
            return
        if e.text:
            parts.append(e.text)
        for c in e:
            rec(c)
        if e.tail:
            parts.append(e.tail)

    rec(el, top=True)
    text = "".join(parts)
    text = text.replace("|", "")  # page-break markers inside words
    text = re.sub(r"\s+", " ", text).strip()
    return text


def iter_chapters(path=DIOSCORIDES_XML) -> Iterator[dict]:
    """Yield every chapter, including chapters that the TEI wrongly nests inside
    the last chapter of a book (1.66, 2.105, 4.134 in the 2018 release)."""
    root = ET.parse(path).getroot()
    body = root.find(f".//{TEI}body")
    seen: set[str] = set()
    for book in body.iter(f"{TEI}div"):
        if book.get("subtype") != "book":
            continue
        bn = int(book.get("n"))
        for ch in book.iter(f"{TEI}div"):
            if ch.get("subtype") != "chapter":
                continue
            cn = ch.get("n")
            if not cn or not cn[0].isdigit() or f"{bn}.{cn}" in seen:
                continue  # prefaces / duplicates
            seen.add(f"{bn}.{cn}")
            text = _clean_text(ch)
            if not text:
                continue
            text = _LEADING_NUM.sub("", text, count=1)
            # Arabic digits are always editorial section/line milestones (Dioscorides
            # writes numbers with Greek letters), so they are removed from the text.
            text = re.sub(r"\s+", " ", re.sub(r"(?<=\s)\d{1,3}(?=\s)", "", text)).strip()
            text = text.replace("·", "·")  # unify Greek ano teleia
            head = text.split("·", 1)[0].strip() if "·" in text[:80] else " ".join(text.split(" ")[:3])
            head = head.split(",")[0].strip(" ,.;")
            opening = text[:260]
            synonyms = [s.strip() for s in _SYNONYM.findall(opening)][:8]
            yield {
                "id": f"dsc:{bn}.{cn}",
                "source": "dioscorides",
                "lang": "grc",
                "ref": f"De materia medica {bn}.{cn}",
                "book": bn,
                "chapter": cn,
                "headword": head,
                "headword_norm": normalize_greek(head).strip(),
                "synonyms": synonyms,
                "text": text,
                "analysis_text": text,
            }
