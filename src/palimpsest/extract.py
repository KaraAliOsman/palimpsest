"""Rule-based, provenance-preserving indication extractor.

For every monograph we run the language-specific term lexicon over a
length-preserving normalised copy of the text, so each hit maps back to an
exact character span of the *original* Greek or English.  Every claim in the
knowledge graph therefore carries a verbatim, checkable quotation.

Design choices (documented in docs/METHODS.md):
* Longest-match wins: a span strictly contained in a longer span is dropped
  ("bloody flux" -> dysentery suppresses the inner "flux" -> diarrhoea).
* English negation/warning cues inside the same clause, immediately before a
  hit ("not good for", "hurtful to", "forbear"), turn a therapeutic hit into
  ``negated`` so it is not counted as a claim.
* Greek warnings are encoded lexically (κακοστόμαχος etc.) with polarity
  ``adverse`` - negation of an indication is very rare in Dioscorides.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass

import pandas as pd

from .corpora import load_monographs
from .paths import LEXICONS, PROCESSED, ensure_dirs
from .textnorm import normalize_english, normalize_greek, sentence_spans

_NEG_EN = re.compile(
    r"\b(?:not|never|nor|forbear|hurtful|hurts|offend\w*|dangerous|beware|avoid)\b[^.;:]{0,40}$"
)


@dataclass
class Term:
    concept_id: str
    pattern: re.Pattern
    polarity: str
    raw: str


def load_concepts() -> pd.DataFrame:
    return pd.read_csv(LEXICONS / "concepts.csv")


def load_terms(lang: str) -> list[Term]:
    path = LEXICONS / f"terms_{lang}.csv"
    concepts = set(load_concepts().concept_id)
    terms: list[Term] = []
    with path.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            cid = row["concept_id"].strip()
            if cid not in concepts:
                continue
            try:
                pat = re.compile(row["pattern"])
            except re.error:
                continue
            pol = (row.get("polarity") or "therapeutic").strip() or "therapeutic"
            terms.append(Term(cid, pat, pol, row["pattern"]))
    return terms


def _clause_of(spans: list[tuple[int, int]], pos: int) -> tuple[int, int]:
    for s, e in spans:
        if s <= pos < e:
            return s, e
    return 0, 0


def extract_monograph(m: dict, terms: list[Term]) -> list[dict]:
    text = m["analysis_text"] or ""
    norm = normalize_greek(text) if m["lang"] == "grc" else normalize_english(text)
    assert len(norm) == len(text)
    hits = []
    for t in terms:
        for mt in t.pattern.finditer(norm):
            if mt.end() <= mt.start():
                continue
            hits.append((mt.start(), mt.end(), t))
    # longest-match-wins, dedupe identical concept spans
    hits.sort(key=lambda h: (-(h[1] - h[0]), h[0]))
    kept: list[tuple[int, int, Term]] = []
    for s, e, t in hits:
        contained = any(ks <= s and e <= ke and (ks, ke) != (s, e) for ks, ke, _ in kept)
        same = any(ks == s and ke == e and kt.concept_id == t.concept_id for ks, ke, kt in kept)
        overlap_same_concept = any(
            kt.concept_id == t.concept_id and not (e <= ks or s >= ke) for ks, ke, kt in kept
        )
        if contained or same or overlap_same_concept:
            continue
        kept.append((s, e, t))
    clauses = sentence_spans(text)
    out = []
    for s, e, t in sorted(kept, key=lambda h: h[0]):
        cs, ce = _clause_of(clauses, s)
        polarity = t.polarity
        if m["lang"] == "en" and polarity in ("therapeutic", "action"):
            if _NEG_EN.search(norm[max(cs, s - 60):s]):
                polarity = "negated"
        out.append(
            {
                "monograph_id": m["id"],
                "source": m["source"],
                "concept_id": t.concept_id,
                "polarity": polarity,
                "match": text[s:e],
                "start": s,
                "end": e,
                "clause": text[cs:ce][:400],
                "pattern": t.raw,
            }
        )
    return out


def run_extraction() -> pd.DataFrame:
    ensure_dirs()
    terms = {"grc": load_terms("grc"), "en": load_terms("en")}
    rows: list[dict] = []
    for m in load_monographs():
        rows.extend(extract_monograph(m, terms[m["lang"]]))
    df = pd.DataFrame(rows)
    df.insert(0, "claim_id", [f"c{i:05d}" for i in range(len(df))])
    df.to_csv(PROCESSED / "claims.csv", index=False)
    return df


POSITIVE = ("therapeutic", "action")


def monograph_concepts(claims: pd.DataFrame, polarities=POSITIVE) -> pd.DataFrame:
    """Collapse span-level hits into (monograph, concept) claims."""
    c = claims[claims.polarity.isin(polarities)]
    g = (
        c.groupby(["monograph_id", "source", "concept_id"])
        .agg(n_mentions=("claim_id", "size"), first_match=("match", "first"),
             first_clause=("clause", "first"))
        .reset_index()
    )
    return g
