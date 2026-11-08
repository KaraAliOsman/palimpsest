"""P1 - benchmark our Dioscorides identifications against expert identifications.

Gold standard: Lardos et al. (2024), Tables 1-2 (61 information-rich DMM plants,
every candidate species classified by botanical congruence with Dioscorides'
description: Strong > Moderate > Weak > not in the modern floras, plus a 0-3
medicinal-congruence score). See :mod:`palimpsest.sources.lardos`.

Definitions (all fixed before looking at agreement)
---------------------------------------------------
* **unit** - a Dioscorides chapter (our concordance assigns one taxon per chapter).
  Lardos sometimes splits a chapter into kinds (e.g. 3.4 Aristolochia long/round);
  the chapter's gold set is then the union over its kinds. A row-level variant
  (61 Lardos rows, our chapter taxon repeated for each kind) is also reported.
* **expert top-1** - candidates in the best non-empty botanical tier, ties broken
  by the medicinal score (ties may remain: then any of them counts).
* **expert top tier** - all candidates of the best non-empty botanical tier.
* **candidate set** - every candidate the experts evaluated.
* Names on both sides are resolved on the GBIF backbone to the accepted name
  (e.g. *Delphinium staphisagria* -> *Staphisagria macrosperma*, *Cirsium ferox*
  -> *Lophiolepis ferox*); a match on either the raw or the accepted name counts.
* **species agreement** requires our identification to be at species rank;
  genus-rank identifications (e.g. 4.68 *Hyoscyamus*) count as species misses
  and are reported separately. **genus agreement** compares genera.
* 95% CIs: Wilson score intervals.
"""
from __future__ import annotations

import math
import re
from collections import defaultdict

import pandas as pd

from ..sources import lardos as L


# --------------------------------------------------------------------------- stats
def wilson(k: int, n: int, z: float = 1.959963984540054) -> tuple[float, float]:
    """Wilson score 95% interval for k successes out of n."""
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    den = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / den
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (max(0.0, centre - half), min(1.0, centre + half))


def proportion(k: int, n: int) -> dict:
    lo, hi = wilson(k, n)
    return {"k": int(k), "n": int(n), "share": (k / n) if n else None,
            "ci95": [round(lo, 3), round(hi, 3)] if n else None}


# --------------------------------------------------------------------------- gold
def _norm_type(s: str) -> list[str]:
    return [t for t in L.strip_accents(s).replace(",", " ").split() if t and t != "–"]


def assign_chapters(t1: list[dict], t2: list[dict]) -> list[dict]:
    """Give every Table-2 row (one DMM plant) its DMM chapter(s) from Table 1.

    One chapter for the lemma -> that chapter. Several distinct chapters: the
    kind named after ':' in Table 2 is located among the kinds listed in Table 1
    (same order as the chapters); if no kind is given, all chapters apply."""
    by_tag = {r["lemma_tag"]: r for r in t1}
    out = []
    for r in t2:
        t = by_tag.get(r["lemma_tag"])
        chaps = list(dict.fromkeys(t["chapters"])) if t else []
        assigned = chaps
        if len(chaps) > 1:
            kinds = _norm_type(t["dmm_type"])
            kind = _norm_type(r["dmm_name"].split(":", 1)[1]) if ":" in r["dmm_name"] else []
            # (in this table every multi-chapter lemma lists one one-word kind
            # per chapter, in chapter order, e.g. 'κρητικός άγριος' -> 3.72, 3.52)
            if kind and len(kinds) == len(chaps):
                idx = next((i for i, k in enumerate(kinds) if k == kind[0]), None)
                if idx is not None:
                    assigned = [chaps[idx]]
        out.append({**r, "chapters": assigned})
    return out


#: Recent combinations the GBIF backbone does not yet link (match falls back to
#: HIGHERRANK): Cirsium ferox (L.) DC. = Lophiolepis ferox (L.) Del Guacchio,
#: Bures, Iamonico & P.Caputo (2022); GBIF already places it in Lophiolepis.
CURATED_SYNONYMS = {"Cirsium ferox": ("Lophiolepis ferox", "Lophiolepis")}


def lemma_match(headword: str, lardos_names: list[str], cutoff: float = 0.75) -> bool:
    """Does any word of the Lardos DMM name resemble a word of our headword?
    (accent-free; tolerates spelling variants such as ἄλλυσσον / ἄλυσσον)."""
    import difflib

    ours = [w for w in L.strip_accents(headword).replace(" ", " ").split() if len(w) >= 3]
    ours += ["".join(L.strip_accents(headword).split())]
    for name in lardos_names:
        for w in re.split(r"[\s,:]+", L.strip_accents(name)):
            if len(w) < 4 or w == "in":
                continue
            if any(difflib.SequenceMatcher(None, w, o).ratio() >= cutoff for o in ours):
                return True
    return False


def resolve_names(names: set[str]) -> dict[str, dict]:
    """GBIF accepted canonical name + genus for every name (cached)."""
    from ..sources import gbif

    out = {}
    for n in sorted(names):
        if n in CURATED_SYNONYMS:
            acc, gen = CURATED_SYNONYMS[n]
            out[n] = {"accepted": acc, "genus": gen, "status": "CURATED_SYNONYM", "matchType": "CURATED"}
            continue
        try:
            m = gbif.match(n)
        except Exception as exc:  # pragma: no cover - network failure
            m = {"canonicalName": None, "genus": None, "error": str(exc)}
        acc = m.get("canonicalName") if m.get("acceptedUsageKey") else None
        out[n] = {"accepted": acc or n, "genus": (m.get("genus") or n.split()[0]) if acc else n.split()[0],
                  "status": m.get("status"), "matchType": m.get("matchType")}
    return out


def _names(c: dict, res: dict) -> set[str]:
    r = res.get(c["name"], {})
    return {c["name"], r.get("accepted", c["name"])}


def _genera(c: dict, res: dict) -> set[str]:
    r = res.get(c["name"], {})
    return {c["name"].split()[0], r.get("genus") or c["name"].split()[0]}


def score_unit(ours: dict, gold_rows: list[dict], res: dict) -> dict:
    """Agreement of one of our chapter identifications with the expert gold rows."""
    cands = [c for g in gold_rows for c in g["candidates"]]
    top1, tier = [], []
    for g in gold_rows:
        tt, t1 = L.best_candidates(g["candidates"])
        tier += tt
        top1 += t1
    our_names = {ours["scientific_name"], ours["taxon"]} - {""}
    our_genus = {ours["genus"], ours["scientific_name"].split()[0] if ours["scientific_name"] else ""} - {""}
    is_species = ours["taxon_rank"] == "species"
    alts = {a.strip() for a in ours.get("alternatives", "").split(";") if a.strip()}
    alt_names = set(alts)
    for a in alts:
        alt_names.add(res.get(a, {}).get("accepted", a))

    def sp_hit(group):
        return is_species and any(our_names & _names(c, res) for c in group)

    def gen_hit(group):
        return any(our_genus & _genera(c, res) for c in group)

    return {
        "species_top1": sp_hit(top1), "species_top_tier": sp_hit(tier), "species_any_candidate": sp_hit(cands),
        "genus_top1": gen_hit(top1), "genus_top_tier": gen_hit(tier), "genus_any_candidate": gen_hit(cands),
        "top1_in_our_id_or_alternatives": any((our_names | alt_names) & _names(c, res) for c in top1),
        "expert_top1": sorted({c["name_full"] for c in top1}),
        "expert_top_tier": sorted({c["name_full"] for c in tier}),
        "expert_tier_of_top": top1[0]["tier"] if top1 else None,
        "expert_candidates": [f'{c["name_full"]} [{c["tier"]}, med {c["score"]}]' for c in cands],
        "our_rank_is_species": is_species,
    }


METRICS = ["species_top1", "species_top_tier", "species_any_candidate",
           "genus_top1", "genus_top_tier", "genus_any_candidate", "top1_in_our_id_or_alternatives"]


def summarise(units: pd.DataFrame) -> dict:
    out = {"overall": {m: proportion(int(units[m].sum()), len(units)) for m in METRICS}}
    out["by_confidence"] = {}
    for lvl in ("high", "medium", "low"):
        u = units[units.confidence == lvl]
        out["by_confidence"][lvl] = {m: proportion(int(u[m].sum()), len(u)) for m in METRICS}
    sp = units[units.our_rank_is_species]
    out["species_rank_ids_only"] = {m: proportion(int(sp[m].sum()), len(sp)) for m in METRICS}
    return out


def run_benchmark(mt: pd.DataFrame) -> dict:
    xml = L.fulltext_xml()
    t1, t2 = L.parse_table1(xml), L.parse_table2(xml)
    rows = assign_chapters(t1, t2)
    dsc = mt[mt.source == "dioscorides"].set_index("monograph_id")
    names = {c["name"] for r in rows for c in r["candidates"]}
    for mid in {f"dsc:{ch}" for r in rows for ch in r["chapters"]}:
        if mid in dsc.index:
            names |= {a.strip() for a in dsc.loc[mid, "alternatives"].split(";") if a.strip()}
    res = resolve_names(names)

    by_ch = defaultdict(list)
    for r in rows:
        for ch in r["chapters"]:
            by_ch[ch].append(r)

    def ours_of(ch):
        o = dsc.loc[f"dsc:{ch}"]
        return {"monograph_id": f"dsc:{ch}", "headword": o.headword, "scientific_name": o.scientific_name,
                "taxon": o.taxon, "taxon_rank": o.taxon_rank, "genus": o.genus, "confidence": o.confidence,
                "alternatives": o.alternatives, "kind": o.kind}

    unit_rows, row_rows, missing = [], [], []
    for ch, gs in sorted(by_ch.items(), key=lambda kv: tuple(int(x) for x in kv[0].split("."))):
        if f"dsc:{ch}" not in dsc.index:
            missing.append(ch)
            continue
        o = ours_of(ch)
        s = score_unit(o, gs, res)
        unit_rows.append({**o, "chapter": ch, "lardos_rows": "; ".join(f'{g["lemma_tag"]} {g["dmm_name"]}' for g in gs),
                          "lemma_match": lemma_match(o["headword"], [g["dmm_name"] for g in gs]), **s})
        for g in gs:
            row_rows.append({**o, "chapter": ch, "lardos_row": f'{g["lemma_tag"]} {g["dmm_name"]}',
                             **score_unit(o, [g], res)})
    units = pd.DataFrame(unit_rows)
    rowdf = pd.DataFrame(row_rows)
    dis = units[~units.species_top1]
    return {
        "units": units, "rows": rowdf, "resolution": res, "missing_chapters": missing,
        "n_lardos_rows": len(t2), "n_lardos_lemmas": len(t1),
        "summary_chapter_level": summarise(units),
        "summary_row_level": summarise(rowdf),
        "disagreements": dis,
    }


# --------------------------------------------------------------------------- staples
#: 30 everyday food / garden plants of Dioscorides with uncontroversial standard
#: identifications (Berendes 1902; Beck 2005; any modern flora). ``accept`` lists
#: the name(s) any reader would give, incl. the common synonym; ``genus_only``
#: means the chapter treats several species of the genus (wheats, oats).
STAPLES = [
    ("barley", "dsc:2.86", "κριθη", ["Hordeum vulgare"], False),
    ("wheat", "dsc:2.85", "πυρο", ["Triticum"], True),
    ("lentil", "dsc:2.107", "φακοσ", ["Lens culinaris", "Vicia lens"], False),
    ("chickpea", "dsc:2.104", "ερεβινθ", ["Cicer arietinum"], False),
    ("broad bean", "dsc:2.105", "κυαμοσ", ["Vicia faba"], False),
    ("white lupin", "dsc:2.109", "θερμοσ", ["Lupinus albus"], False),
    ("oat", "dsc:2.94", "βρομοσ", ["Avena"], True),
    ("rice", "dsc:2.95", "ορυζα", ["Oryza sativa"], False),
    ("flax / linseed", "dsc:2.103", "λινοσ", ["Linum usitatissimum"], False),
    ("sesame", "dsc:2.99", "σησαμ", ["Sesamum indicum"], False),
    ("olive", "dsc:1.105", "ελαια", ["Olea europaea"], False),
    ("fig", "dsc:1.128", "συκα", ["Ficus carica"], False),
    ("grapevine", "dsc:5.1", "αμπελου", ["Vitis vinifera"], False),
    ("date palm", "dsc:1.109", "φοινιξ", ["Phoenix dactylifera"], False),
    ("pomegranate", "dsc:1.110", "ροα", ["Punica granatum"], False),
    ("almond", "dsc:1.123", "αμυγδαλ", ["Prunus dulcis", "Prunus amygdalus"], False),
    ("walnut", "dsc:1.125", "καρυα", ["Juglans regia"], False),
    ("black mulberry", "dsc:1.126", "μορεα", ["Morus nigra"], False),
    ("onion", "dsc:2.151", "κρομυον", ["Allium cepa"], False),
    ("garlic", "dsc:2.152", "σκοροδον", ["Allium sativum"], False),
    ("lettuce", "dsc:2.136", "θριδαξ", ["Lactuca sativa"], False),
    ("cabbage", "dsc:2.120", "κραμβη", ["Brassica oleracea"], False),
    ("beet / chard", "dsc:2.123", "σευτλον", ["Beta vulgaris"], False),
    ("radish", "dsc:2.112", "ραφανισ", ["Raphanus sativus"], False),
    ("turnip", "dsc:2.110", "γογγυλη", ["Brassica rapa"], False),
    ("coriander", "dsc:3.63", "κοριον", ["Coriandrum sativum"], False),
    ("dill", "dsc:3.58", "ανηθ", ["Anethum graveolens"], False),
    ("cumin", "dsc:3.59", "κυμινον", ["Cuminum cyminum"], False),
    ("fennel", "dsc:3.70", "μαραθον", ["Foeniculum vulgare"], False),
    ("celery", "dsc:3.64", "σελινον", ["Apium graveolens"], False),
]


def staples_check(mt: pd.DataFrame, resolve=None) -> list[dict]:
    """Our identification for each staple vs the textbook name (GBIF-resolved)."""
    resolve = resolve or resolve_names
    res = resolve({n for s in STAPLES for n in s[3]})
    dsc = mt[mt.source == "dioscorides"].set_index("monograph_id")
    out = []
    for common, mid, lemma, accept, genus_only in STAPLES:
        o = dsc.loc[mid]
        lemma_ok = lemma in L.strip_accents(o.headword)
        acc = set(accept) | {res.get(a, {}).get("accepted", a) for a in accept}
        if genus_only:
            ok = o.genus in acc or o.scientific_name.split()[0] in acc
        else:
            ok = o.taxon in acc or o.scientific_name in acc
        out.append({"plant": common, "chapter": mid, "headword": o.headword, "lemma_check": bool(lemma_ok),
                    "expected": " / ".join(accept) + (" (genus)" if genus_only else ""),
                    "ours": o.scientific_name, "ours_accepted": o.taxon, "confidence": o.confidence,
                    "correct": bool(ok and lemma_ok)})
    return out
