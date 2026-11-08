"""P1 - expert benchmark of our Dioscorides identifications (Lardos et al. 2024)
plus a 30-plant 'staples check'.

Usage (repo root, PYTHONPATH=src)::

    python scripts/expert_benchmark.py

Writes results/extensions/expert_benchmark.{json,md},
data/processed/extensions/expert_benchmark_units.csv (+ _rows.csv) and
web/public/data/extra/expert_benchmark.json. Primary outputs are not touched.
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from palimpsest.analysis import expert_benchmark as E  # noqa: E402
from palimpsest.paths import PROCESSED, RESULTS, WEB_DATA  # noqa: E402
from palimpsest.sources import lardos as L  # noqa: E402

OUT = RESULTS / "extensions"
OUTP = PROCESSED / "extensions"
WEB = WEB_DATA / "extra"

CAVEAT = ("Our identifications were curated with AI assistance (Claude), which may have seen "
          "Lardos et al. (2024) or the same scholarly sources (Berendes, Beck, Gunther) during "
          "training; agreement therefore measures consistency with expert scholarship, not an "
          "independent blind re-identification. Lardos' candidate lists also come from the "
          "literature, so both sides share sources.")

#: one-line explanations of each disagreement (written after inspecting them)
NOTES = {
    "1.90": "Lardos evaluate only ῥάμνος 'μέλας' (Rhamnus); we follow the reading of the chapter's first kind as Lycium (low confidence).",
    "2.139": "Lardos' best candidates Pimpinella saxifraga / Tordylium aegyptiacum; we have Tordylium apulum (same genus, low confidence).",
    "2.164": "Genus-rank ID (Cyclamen): chapter covers several cyclamens; Lardos top-1 C. persicum.",
    "2.167": "Lardos attach 'δρακοντία μικρά' to 2.167 (our headword ἄρον); we have Arum italicum, Lardos top-1 Arum dioscoridis (same genus; ours in their Moderate tier).",
    "2.169": "Asphodelus: all three Lardos candidates Moderate; medicinal tie-break picks A. aestivus, ours A. ramosus (in their top tier).",
    "3.4": "Genus-rank ID (Aristolochia): chapter describes several aristolochias; genus agrees.",
    "3.12": "Thistle 'white acanthus': ours Lophiolepis ferox (= Cirsium ferox, in Lardos' list as 'not in flora'); Lardos top-1 Onopordum/Picnomon. Low confidence on our side.",
    "3.20": "Genus-rank ID (Astragalus); genus agrees.",
    "4.1": "κέστρον / βεττονική: ours Betonica officinalis (Berendes); Lardos evaluate Sideritis cretica (Weak) and Betonica alopecuros. Genuine disagreement.",
    "4.15": "Lardos evaluate only the aquatic τρίβολος ('ἔνυδρος' = Trapa natans); our chapter-level ID is the land caltrop Tribulus terrestris, which the chapter also describes.",
    "4.33": "Genus-rank ID (Sideritis); genus agrees.",
    "4.46": "Genus-rank ID (Equisetum); genus agrees.",
    "4.57": "Helichrysum: ours H. stoechas (in Lardos' Strong tier), their medicinal tie-break picks H. italicum.",
    "4.68": "Genus-rank ID (Hyoscyamus; three kinds by flower colour); genus agrees.",
    "4.103": "Genus-rank ID (Verbascum); genus agrees.",
    "4.147": "χαμαιδάφνη: ours Danae racemosa (in Lardos' list, Weak); Lardos top-1 Ruscus hypophyllum.",
}


def _fmt(p: dict) -> str:
    if not p["n"]:
        return "–"
    return f'{p["share"]:.0%} ({p["k"]}/{p["n"]}) [{p["ci95"][0]:.2f}–{p["ci95"][1]:.2f}]'


def main() -> None:
    for d in (OUT, OUTP, WEB):
        d.mkdir(parents=True, exist_ok=True)
    mt = pd.read_csv(PROCESSED / "monograph_taxa.csv", dtype=str, keep_default_na=False)

    access = {"figshare_api": L.figshare_status(), "datacite": L.datacite_record(),
              "article": L.article_record(), "fulltext": L.FULLTEXT_URL}
    r = E.run_benchmark(mt)
    staples = E.staples_check(mt)
    units, rows = r["units"], r["rows"]
    units.to_csv(OUTP / "expert_benchmark_units.csv", index=False)
    rows.to_csv(OUTP / "expert_benchmark_rows.csv", index=False)

    dis = []
    for u in r["disagreements"].itertuples():
        dis.append({"chapter": u.chapter, "headword": u.headword, "ours": u.taxon, "our_rank": u.taxon_rank,
                    "confidence": u.confidence, "expert_top1": u.expert_top1,
                    "expert_top_tier": u.expert_top_tier, "expert_candidates": u.expert_candidates,
                    "genus_agrees": bool(u.genus_top1), "ours_in_expert_candidates": bool(u.species_any_candidate),
                    "note": NOTES.get(u.chapter, "")})
    sc, sr = r["summary_chapter_level"], r["summary_row_level"]
    n_staples_ok = sum(s["correct"] for s in staples)
    out = {
        "question": "Do our AI-curated identifications of Dioscorides' plants agree with expert identifications?",
        "gold": {
            "citation": "Lardos A, Patmore K, Allkin R, Lazarou R, Nesbitt M, Scott AC, Zipser B (2024). "
                        "J Ethnopharmacol 322:117622. doi:10.1016/j.jep.2023.117622",
            "data_doi": L.DATA_DOI, "licence": "CC BY 4.0 (verified via DataCite for the figshare record "
                                                "and via Europe PMC for the article)",
            "what": "Tables 1-2: 61 information-rich DMM plants (50 John-the-Physician lemmas), each with "
                    "literature candidate species classified Strong/Moderate/Weak/not-in-flora by botanical "
                    "congruence, plus a 0-3 medicinal score",
            "access_note": "figshare (api.figshare.com, figshare.com, royalholloway.figshare.com) returns HTTP 403 "
                           "to every request from our network, so the raw data files could not be downloaded; "
                           "the expert results were parsed from the article's open-access JATS XML "
                           "(Europe PMC PMC7615571, CC BY), which publishes the same Tables 1-2.",
            "n_rows": r["n_lardos_rows"], "n_lemmas": r["n_lardos_lemmas"],
            "n_chapters_matched": int(len(units)), "missing_chapters": r["missing_chapters"],
            "n_lemma_mismatch": int((~units.lemma_match).sum()),
        },
        "access": access,
        "definitions": {
            "unit": "Dioscorides chapter (Wellmann numbering as cited by Lardos); kinds within a chapter pooled",
            "expert_top1": "best non-empty botanical tier, ties broken by medicinal score (remaining ties: any counts)",
            "species": "our identification at species rank equals an expert top-1 name (raw or GBIF-accepted)",
            "genus": "same genus as an expert top-1 candidate",
            "ci": "Wilson score 95%",
        },
        "chapter_level": sc,
        "row_level": sr,
        "headline": {
            "species_top1": sc["overall"]["species_top1"],
            "species_top1_species_rank_ids": sc["species_rank_ids_only"]["species_top1"],
            "genus_top1": sc["overall"]["genus_top1"],
            "species_any_candidate": sc["overall"]["species_any_candidate"],
            "n_genus_rank_ids": int((~units.our_rank_is_species).sum()),
            "row_level_species_top1": sr["overall"]["species_top1"],
            "row_level_genus_top1": sr["overall"]["genus_top1"],
        },
        "disagreements": dis,
        "staples_check": {"n": len(staples), "n_correct": n_staples_ok, "items": staples,
                          "rule": "textbook identification (Berendes 1902; Beck 2005), GBIF-resolved; Greek lemma "
                                  "of our chapter checked; wheat and oats judged at genus level"},
        "caveat": CAVEAT,
        "reproduce": "PYTHONPATH=src python scripts/expert_benchmark.py",
        "generated": date.today().isoformat(),
    }
    (OUT / "expert_benchmark.json").write_text(json.dumps(out, indent=2, ensure_ascii=False, default=str),
                                               encoding="utf-8")
    web = {k: out[k] for k in ("question", "headline", "definitions", "caveat", "reproduce", "generated")}
    web["gold"] = {k: out["gold"][k] for k in ("citation", "data_doi", "licence", "access_note", "n_rows",
                                                "n_chapters_matched")}
    web["by_confidence"] = {lvl: {m: sc["by_confidence"][lvl][m] for m in ("species_top1", "genus_top1")}
                            for lvl in ("high", "medium", "low")}
    web["units"] = [{"chapter": u.chapter, "headword": u.headword, "ours": u.taxon, "confidence": u.confidence,
                     "expert_top1": u.expert_top1, "species_agree": bool(u.species_top1),
                     "genus_agree": bool(u.genus_top1)} for u in units.itertuples()]
    web["disagreements"] = dis
    web["staples_check"] = out["staples_check"]
    (WEB / "expert_benchmark.json").write_text(json.dumps(web, indent=1, ensure_ascii=False, default=str),
                                               encoding="utf-8")

    # ---- markdown
    md = ["# P1 · Expert benchmark of our Dioscorides identifications", "",
          f"*Generated {out['generated']} · reproduce: `{out['reproduce']}`*", "",
          "**Gold standard.** " + out["gold"]["citation"] + f" Data: doi:{L.DATA_DOI} (CC BY 4.0). "
          + out["gold"]["what"] + ".", "",
          "**Access.** " + out["gold"]["access_note"], "",
          f"**Matched.** {len(units)} Dioscorides chapters (from {r['n_lardos_rows']} Lardos rows / "
          f"{r['n_lardos_lemmas']} lemmas; kinds within a chapter pooled). "
          f"{out['gold']['n_lemma_mismatch']} chapter(s) where Lardos' Greek name differs from our headword "
          "(2.167: Lardos attach 'δρακοντία μικρά' to the chapter we head ἄρον) — kept, since the chapter "
          "reference is theirs. One Lardos lemma (JCLP_016 ἄμπελος ἀγρία) cites two chapters (4.181, 5.2), "
          "hence 62 scored rows.", "",
          "## Agreement (chapter level, Wilson 95% CI)", "",
          "| | Overall | High conf. | Medium | Low | Species-rank IDs only |", "|---|---|---|---|---|---|"]
    lab = {"species_top1": "Species = expert top-1", "species_top_tier": "Species in expert top tier",
           "species_any_candidate": "Species among expert candidates", "genus_top1": "Genus = expert top-1",
           "genus_any_candidate": "Genus among expert candidates",
           "top1_in_our_id_or_alternatives": "Expert top-1 in our ID or our listed alternatives"}
    for m, l in lab.items():
        md.append(f"| {l} | {_fmt(sc['overall'][m])} | {_fmt(sc['by_confidence']['high'][m])} | "
                  f"{_fmt(sc['by_confidence']['medium'][m])} | {_fmt(sc['by_confidence']['low'][m])} | "
                  f"{_fmt(sc['species_rank_ids_only'][m])} |")
    md += ["", f"Row level (each of the {len(rows)} Lardos rows scored separately; our one chapter ID is repeated "
           f"for every kind, so multi-kind chapters can only match one row): species top-1 "
           f"{_fmt(sr['overall']['species_top1'])}, genus top-1 {_fmt(sr['overall']['genus_top1'])}.", "",
           f"{int((~units.our_rank_is_species).sum())} of our {len(units)} identifications are deliberately at genus "
           "rank (chapters that describe several species, e.g. Hyoscyamus, Verbascum, Equisetum); they count as "
           "species misses above.", "",
           "## Disagreements (species top-1)", "", "| Ch. | Headword | Ours (conf.) | Expert top-1 | Genus agrees | Note |",
           "|---|---|---|---|---|---|"]
    for d in dis:
        md.append(f"| {d['chapter']} | {d['headword']} | *{d['ours']}* ({d['confidence']}) | "
                  f"{', '.join('*' + x + '*' for x in d['expert_top1'])} | {'yes' if d['genus_agrees'] else 'no'} | {d['note']} |")
    md += ["", f"## Staples check: {n_staples_ok}/{len(staples)} correct", "",
           "The 30 commonest food and garden plants of Dioscorides, whose identity any reader can verify.", "",
           "| Plant | Chapter | Greek | Expected | Ours | Correct |", "|---|---|---|---|---|---|"]
    for s in staples:
        md.append(f"| {s['plant']} | {s['chapter']} | {s['headword']} | {s['expected']} | *{s['ours']}* | "
                  f"{'yes' if s['correct'] else '**no**'} |")
    md += ["", "## Caveat", "", CAVEAT, ""]
    (OUT / "expert_benchmark.md").write_text("\n".join(md), encoding="utf-8")
    h = out["headline"]
    print("species top-1", _fmt(h["species_top1"]), "| species-rank only", _fmt(h["species_top1_species_rank_ids"]),
          "| genus", _fmt(h["genus_top1"]), "| staples", n_staples_ok, "/", len(staples))


if __name__ == "__main__":
    main()
