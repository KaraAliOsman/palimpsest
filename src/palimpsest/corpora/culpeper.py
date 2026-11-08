"""Parse Nicholas Culpeper, *The Complete Herbal* (1653; Project Gutenberg #49513).

Each herb starts with an indented upper-case heading (``    WORMWOOD.``) and is
divided by italic markers such as ``_Descript._]``, ``_Place._]``, ``_Time._]``
and ``_Government and virtues._]``.  The therapeutic claims live almost
entirely in *Government and virtues*, so that section (plus any unlabelled
trailing text) is what the extractor reads; descriptions of leaves, flowers
and habitats are kept for plant identification but not mined for indications.
"""
from __future__ import annotations

import re
from collections.abc import Iterator

from ..paths import CULPEPER_TXT
from ..textnorm import slugify

_HEADING = re.compile(r"^ {3,6}([A-Z][A-Z’',.\- ()&]{2,})\s*$")
_MARKER = re.compile(r"_([A-Z][A-Za-z ,]+?)\._\]")
_FIRST_HERB = "AMARA DULCIS"
_STOP = "SECTION I."


def _blocks(lines: list[str]) -> Iterator[tuple[str, list[str]]]:
    start = next(i for i, l in enumerate(lines) if l.strip().startswith(_FIRST_HERB))
    stop = next(i for i, l in enumerate(lines[start:], start) if l.strip() == _STOP)
    heading: list[str] = []
    body: list[str] = []
    i = start
    while i < stop:
        line = lines[i]
        m = _HEADING.match(line)
        if m:
            if heading and body:
                yield " ".join(heading), body
                heading, body = [], []
            heading.append(m.group(1).strip())
        else:
            if line.strip() or body:
                body.append(line)
        i += 1
    if heading and body:
        yield " ".join(heading), body


def _sections(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    pos = [(m.start(), m.end(), m.group(1).strip().lower()) for m in _MARKER.finditer(text)]
    intro_end = pos[0][0] if pos else len(text)
    out["intro"] = text[:intro_end].strip()
    for k, (s, e, name) in enumerate(pos):
        nxt = pos[k + 1][0] if k + 1 < len(pos) else len(text)
        key = {
            "descript": "description",
            "description": "description",
            "place": "place",
            "time": "time",
            "government and virtues": "virtues",
            "virtues": "virtues",
            "government": "virtues",
        }.get(name, name)
        out[key] = (out.get(key, "") + " " + text[e:nxt]).strip()
    return out


def iter_monographs(path=CULPEPER_TXT) -> Iterator[dict]:
    """Yield monographs.  Culpeper sometimes describes two or three related herbs
    and then gives one shared *Government and virtues* section after the last of
    them (e.g. Rhubarb / Monk's Rhubarb / Bastard Rhubarb).  An entry with no
    virtues text of its own inherits the next entry's section (within 3 entries);
    ``virtues_from`` records where the text came from."""
    recs = list(_iter_raw(path))
    stop = {"tree", "common", "garden", "great", "small", "wild", "the", "and", "called"}

    def words(r):
        return {w for w in re.findall(r"[a-z]{4,}", r["headword"].lower())} - stop

    for i, r in enumerate(recs):
        if not r["analysis_text"].strip():
            for j in range(i + 1, min(i + 4, len(recs))):
                if recs[j]["sections"].get("virtues") and words(r) & words(recs[j]):
                    r["analysis_text"] = recs[j]["sections"]["virtues"]
                    r["virtues_from"] = recs[j]["id"]
                    break
        yield r


def _iter_raw(path) -> Iterator[dict]:
    lines = path.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
    for n, (heading, body) in enumerate(_blocks(lines), start=1):
        raw = "\n".join(body).strip()
        text = re.sub(r"\[Illustration[^\]]*\]", " ", raw)
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) < 80:
            continue
        secs = _sections(text)
        analysis = secs.get("virtues") or " ".join(
            v for k, v in secs.items() if k not in ("description", "place", "time")
        )
        names = [p.strip(" .") for p in re.split(r",? OR |, CALLED |, ", heading) if p.strip(" .")]
        title = heading.rstrip(".").title()
        yield {
            "id": f"cul:{n:03d}-{slugify(heading)[:40]}",
            "source": "culpeper",
            "lang": "en",
            "ref": f"Culpeper, Complete Herbal: {title}",
            "headword": title,
            "names": [x.title() for x in names],
            "sections": secs,
            "text": text,
            "analysis_text": analysis,
            "virtues_from": None,
        }
