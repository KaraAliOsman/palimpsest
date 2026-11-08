"""Text normalisation helpers for Ancient Greek and Early Modern English.

Ancient Greek is matched on an *accent-free, lower-case, sigma-folded* form so
that a single stem pattern (e.g. ``ικτερ``) catches every inflected and
accented variant (ἰκτερικούς, ἰκτέρῳ, ἴκτερον ...).  Character offsets are
preserved: :func:`normalize_greek` maps one input code point to at most one
output code point, so spans found in the normalised string can be projected
back onto the original text for highlighting.
"""
from __future__ import annotations

import re
import unicodedata

_APOSTROPHES = "ʼ᾿᾽’'`"


def _strip_marks(ch: str) -> str:
    decomposed = unicodedata.normalize("NFD", ch)
    base = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return base[:1] if base else ""


def normalize_greek(text: str) -> str:
    """Lower-case, strip diacritics, fold final sigma; length-preserving.

    Every input character maps to exactly one output character (marks that
    vanish become a space) so offsets line up with the original string.
    """
    out = []
    for ch in text:
        if ch in _APOSTROPHES:
            out.append("'")
            continue
        base = _strip_marks(ch)
        if not base:
            out.append(" ")
            continue
        base = base.lower()
        if base == "ς":
            base = "σ"
        out.append(base)
    return "".join(out)


def normalize_english(text: str) -> str:
    """Lower-case and unify curly quotes; length-preserving."""
    return (
        text.replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
        .lower()
    )


_SENT_SPLIT = re.compile(r"(?<=[.;:·!?])\s+")


def sentence_spans(text: str) -> list[tuple[int, int]]:
    """Return (start, end) spans of clause-like units.

    Greek uses the raised dot (·, U+0387 / U+00B7) as a colon; Early Modern
    English uses ';' and ':' to chain remedies.  Splitting on all of them
    gives short clauses, which keeps adverse-effect cues local.
    """
    spans: list[tuple[int, int]] = []
    start = 0
    for m in _SENT_SPLIT.finditer(text):
        end = m.start()
        if end > start:
            spans.append((start, end))
        start = m.end()
    if start < len(text):
        spans.append((start, len(text)))
    return spans


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "x"
