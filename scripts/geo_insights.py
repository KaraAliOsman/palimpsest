"""Where the herbals' plants come from: per-region counts, insights and the explorer's geo JSON.

Reads the outputs of geo_regions.py, geo_wcvp.py and geo_gbif.py and writes

  data/processed/geo/region_counts.csv     per WGSRPD level-3 unit: species of each herbal native there
  data/processed/geo/insights.json         the computed sentences with their numerators and denominators
  web/public/data/derived/geo/overview.json    counts, top plants per unit and the insights (Findings, landing)
  web/public/data/derived/geo/ranges.json      every taxon's native / introduced codes in one file (bulk, MCP)
  web/public/data/derived/geo/taxa/<slug>.json one plant: WCVP match, ranges, a plain sentence, GBIF grid
  web/public/data/derived/geo/index.json       what each file holds, licences, how to cite

Counting rules: species rank only (genus-rank identifications are mapped but never counted); a plant is
"Dioscorides'" if any Dioscorides chapter is identified as it, "Culpeper's" likewise; native means a WCVP
distribution row with introduced = 0, not extinct, not doubtful.

Usage: python scripts/geo_insights.py
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed" / "geo"
WEB = ROOT / "web" / "public" / "data" / "derived" / "geo"

# The eastern Mediterranean, as WGSRPD level-3 units: Greece and its islands, Turkey on both shores,
# Cyprus, the Levant and Egypt. Dioscorides was born at Anazarbus in Cilicia (TUR).
EAST_MED = ["GRC", "KRI", "EAI", "TUE", "TUR", "CYP", "LBS", "PAL", "EGY"]
BRITAIN = "GRB"  # WGSRPD "Great Britain" (England, Scotland, Wales); Ireland is IRE.

L1_PROSE = {1: "Europe", 2: "Africa", 3: "temperate Asia", 4: "tropical Asia", 5: "Australasia",
            6: "the Pacific islands", 7: "North America", 8: "Central and South America", 9: "the subantarctic islands"}
THE = {31, 33, 35, 40, 81, 60, 61, 62, 63}
L2_PROSE = {73: "the northwestern United States", 74: "the north-central United States", 75: "the northeastern United States",
            76: "the southwestern United States", 77: "the south-central United States", 78: "the southeastern United States",
            70: "subarctic America", 90: "the subantarctic islands", 91: "Antarctica"}
# The citation Kew asks for in README_WCVP.xlsx (wcvp.zip, version 16), licensed CC BY 3.0.
CITE_WCVP = ("Govaerts R (ed.). 2026. WCVP: World Checklist of Vascular Plants. Facilitated by the Royal Botanic Gardens, "
             "Kew. [WWW document] URL https://doi.org/10.34885/egs6-cp24 [accessed 04 Jun 2026]. Licensed under CC BY 3.0.")
CITE_GBIF = "GBIF.org (2026). Occurrence density, GBIF maps API v2, accessed 2026-11-08. CC BY 4.0."
CITE_TDWG = ("Boundaries: Natural Earth 1:10m admin-1, v5.1 (public domain); botanical-country units after TDWG WGSRPD "
             "(Brummitt RK 2001, World Geographical Scheme for Recording Plant Distributions, ed. 2), drawn approximately.")


def slugify(t: str) -> str:
    s = unicodedata.normalize("NFD", t)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s)) or "plant"


def join(items: list[str]) -> str:
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


class Prose:
    """Turns a set of level-3 codes into a short list of regions, collapsing to continents where it can."""

    def __init__(self, meta: list[dict]):
        self.l2_of = {m["id"]: m["l2"] for m in meta}
        self.l1_of_l2 = {m["l2"]: m["l1"] for m in meta}
        self.l2_name = {m["l2"]: m["l2_name"] for m in meta}
        self.l2_per_l1: dict[int, set[int]] = defaultdict(set)
        for m in meta:
            if m["l2"] not in (91,):
                self.l2_per_l1[m["l1"]].add(m["l2"])

    def l2(self, k: int) -> str:
        if k in L2_PROSE:
            return L2_PROSE[k]
        n = self.l2_name.get(k) or str(k)
        return f"the {n}" if k in THE else n

    def phrases(self, codes: list[str], avoid: set[int] | None = None, by_size: bool = False) -> list[str]:
        """avoid: continents never to be named whole (the native range already lies partly in them).
        by_size: order by how many botanical countries each phrase covers (for introductions)."""
        avoid = avoid or set()
        l2s = sorted({self.l2_of[c] for c in codes if c in self.l2_of})
        n_codes: dict[int, int] = defaultdict(int)
        for c in codes:
            if c in self.l2_of:
                n_codes[self.l2_of[c]] += 1
        by_l1: dict[int, list[int]] = defaultdict(list)
        for k in l2s:
            by_l1[self.l1_of_l2[k]].append(k)

        def build(collapse_at: float) -> list[str]:
            out: list[tuple[int, int, str]] = []  # (size, order, phrase)
            whole = {l1 for l1, ks in by_l1.items() if l1 not in avoid
                     and len(ks) >= max(2, math.ceil(collapse_at * len(self.l2_per_l1[l1])))}
            med = 1 not in whole and 2 not in whole and {12, 13, 20} <= set(l2s)
            for l1 in sorted(by_l1):
                if l1 in whole:
                    out.append((sum(n_codes[k] for k in by_l1[l1]), len(out), L1_PROSE[l1]))
                    continue
                for k in by_l1[l1]:
                    if med and k in (12, 13, 20):
                        if k == 12:
                            out.append((n_codes[12] + n_codes[13] + n_codes[20], len(out), "the Mediterranean"))
                        continue
                    out.append((n_codes[k], len(out), self.l2(k)))
            if by_size:
                out.sort(key=lambda x: (-x[0], x[1]))
            return [x[2] for x in out]

        out = build(0.5)
        if len(out) > 4:
            out = build(0.0)  # any continent with two or more regions is named as a continent
        if len(out) > 5:
            out = out[:4] + ["elsewhere"]
        return out

    def sentence(self, native: list[str], introduced: list[str], genus: bool) -> str:
        if not native and not introduced:
            return ""
        lead = "Species of this genus are native to" if genus else "Native to"
        parts = []
        if native:
            parts.append(f"{lead} {join(self.phrases(native))}")
        else:
            parts.append("WCVP records no native range: known only in cultivation or as an introduction")
        # Introductions are reported where they are news: outside the level-2 regions of the native range.
        home = {self.l2_of.get(c) for c in native}
        away = [c for c in introduced if self.l2_of.get(c) not in home]
        if away:
            home_l1 = {self.l1_of_l2[k] for k in home if k in self.l1_of_l2}
            parts.append(f"introduced in {join(self.phrases(away, avoid=home_l1, by_size=True))}")
        elif introduced:
            parts.append("introduced only within that range")
        s = "; ".join(parts) + "."
        return s[0].upper() + s[1:]


def main() -> None:
    plants = json.loads((ROOT / "web" / "public" / "data" / "plants.json").read_text(encoding="utf-8"))
    meta = json.loads((WEB / "regions.json").read_text(encoding="utf-8"))["regions"]
    names = {m["id"]: m["name"] for m in meta}
    match = pd.read_csv(PROC / "wcvp_match.csv", dtype={"wcvp_id": str, "powo_id": str}, keep_default_na=False)
    ranges = pd.read_csv(PROC / "taxon_ranges.csv")
    grid_path = PROC / "gbif_grid.csv.gz"
    grid = pd.read_csv(grid_path) if grid_path.exists() else pd.DataFrame(columns=["taxon", "gbif_key", "lon", "lat", "count"])
    prose = Prose(meta)

    by_taxon: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    for t, c, s in ranges.itertuples(index=False):
        by_taxon[t][s].append(c)
    m_by = {r["taxon"]: r for r in match.to_dict("records")}
    grid_by = {t: g for t, g in grid.groupby("taxon")}

    info = []
    for p in plants:
        srcs = {n.get("source") for n in (p.get("names") or [])}
        info.append({"taxon": p["taxon"], "slug": slugify(p["taxon"]), "rank": (p.get("rank") or "species").lower(),
                     "common": p.get("common_name"), "dsc": "dioscorides" in srcs, "cul": "culpeper" in srcs,
                     "weight": len(p.get("claims") or [])})
    slugs = [i["slug"] for i in info]
    assert len(slugs) == len(set(slugs)), "slug collision: mirror the explorer's -2 suffix rule"

    # ------------------------------------------------------------- per-taxon files
    (WEB / "taxa").mkdir(parents=True, exist_ok=True)
    for old in (WEB / "taxa").glob("*.json"):
        old.unlink()
    bulk = {}
    for i in info:
        r = by_taxon.get(i["taxon"], {})
        mm = m_by.get(i["taxon"], {})
        nat, intro = sorted(r.get("native", [])), sorted(r.get("introduced", []))
        g = grid_by.get(i["taxon"])
        cells = [] if g is None else [[float(a), float(b), int(c)] for a, b, c in zip(g.lon, g.lat, g["count"])]
        rec = {
            "taxon": i["taxon"], "slug": i["slug"], "rank": i["rank"],
            "wcvp": None if mm.get("method") in (None, "", "unmatched") else {
                "id": mm["wcvp_id"], "name": mm["wcvp_name"], "authors": mm["wcvp_authors"], "rank": mm["wcvp_rank"],
                "method": mm["method"], "via": mm["via"] or None,
                "powo": f"https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:{mm['powo_id']}" if mm.get("powo_id") else None},
            "native": nat, "introduced": intro,
            "doubtful": sorted(r.get("doubtful", [])), "extinct": sorted(r.get("extinct", [])),
            "summary": prose.sentence(nat, intro, i["rank"] == "genus"),
            "gbif": {"key": mm.get("gbif_key") or None, "cell_deg": 2.8125, "total": int(sum(c[2] for c in cells)),
                     "cells": cells},
        }
        (WEB / "taxa" / f"{i['slug']}.json").write_text(json.dumps(rec, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        bulk[i["slug"]] = {"taxon": i["taxon"], "rank": i["rank"], "method": mm.get("method", "unmatched"),
                           "native": nat, "introduced": intro}

    # ------------------------------------------------------------- herbal counts per region
    sp = [i for i in info if i["rank"] == "species" and by_taxon.get(i["taxon"], {}).get("native")]
    herb = {"dsc": [i for i in sp if i["dsc"]], "cul": [i for i in sp if i["cul"]], "both": [i for i in sp if i["dsc"] and i["cul"]]}
    tot = {k: len(v) for k, v in herb.items()}
    native_of = {i["taxon"]: set(by_taxon[i["taxon"]]["native"]) for i in sp}
    intro_of = {i["taxon"]: set(by_taxon[i["taxon"]].get("introduced", [])) for i in sp}
    counts = {code: {k: 0 for k in herb} for code in names}
    top: dict[str, dict[str, list[str]]] = {code: {k: [] for k in herb} for code in names}
    for k, lst in herb.items():
        for i in sorted(lst, key=lambda x: (-x["weight"], x["taxon"])):
            for code in native_of[i["taxon"]]:
                if code in counts:
                    counts[code][k] += 1
                    if len(top[code][k]) < 4:
                        top[code][k].append(i["slug"])
    rc = pd.DataFrame([{"area_code_l3": c, "name": names[c], "dioscorides": v["dsc"], "culpeper": v["cul"], "both": v["both"]}
                       for c, v in counts.items()]).sort_values("area_code_l3")
    PROC.mkdir(parents=True, exist_ok=True)
    rc.to_csv(PROC / "region_counts.csv", index=False)

    # ------------------------------------------------------------- insights
    def share(lst, pred):
        k = sum(1 for i in lst if pred(i))
        return k, len(lst)

    em_d = share(herb["dsc"], lambda i: native_of[i["taxon"]] & set(EAST_MED))
    em_c = share(herb["cul"], lambda i: native_of[i["taxon"]] & set(EAST_MED))
    gb_c = share(herb["cul"], lambda i: BRITAIN in native_of[i["taxon"]])
    gb_d = share(herb["dsc"], lambda i: BRITAIN in native_of[i["taxon"]])
    intro_gb = sorted([i for i in herb["cul"] if BRITAIN in intro_of[i["taxon"]] and BRITAIN not in native_of[i["taxon"]]],
                      key=lambda x: (-x["weight"], x["taxon"]))
    absent_gb = [i for i in herb["cul"] if BRITAIN not in native_of[i["taxon"]] and BRITAIN not in intro_of[i["taxon"]]]
    best = {k: max(counts, key=lambda c: counts[c][k]) for k in herb}
    pct = lambda k, n: round(100 * k / n) if n else None  # noqa: E731
    insights = [
        {"id": "dsc_east_med", "k": em_d[0], "n": em_d[1], "pct": pct(*em_d),
         "compare": {"label": "Culpeper", "k": em_c[0], "n": em_c[1], "pct": pct(*em_c)},
         "text": f"{pct(*em_d)}% of Dioscorides' plants ({em_d[0]} of {em_d[1]} species) are native to the eastern Mediterranean; so are {pct(*em_c)}% of Culpeper's: both herbals draw on one Mediterranean-European flora.",
         "definition": "Native in at least one of: " + ", ".join(f"{names[c]} ({c})" for c in EAST_MED) + "."},
        {"id": "cul_britain", "k": gb_c[0], "n": gb_c[1], "pct": pct(*gb_c),
         "compare": {"label": "Dioscorides", "k": gb_d[0], "n": gb_d[1], "pct": pct(*gb_d)},
         "text": f"{pct(*gb_c)}% of Culpeper's plants ({gb_c[0]} of {gb_c[1]} species) are native to Britain, against {pct(*gb_d)}% of Dioscorides'.",
         "definition": "Native in WGSRPD Great Britain (GRB)."},
        {"id": "cul_introduced_britain", "k": len(intro_gb), "n": gb_c[1], "pct": pct(len(intro_gb), gb_c[1]),
         "examples": [i["slug"] for i in intro_gb[:6]], "absent": len(absent_gb),
         "text": f"{len(intro_gb)} of Culpeper's {gb_c[1]} plants grow in Britain only as introductions; {len(absent_gb)} more are not recorded there at all.",
         "definition": "WCVP status introduced in Great Britain (GRB) and not native there, which includes ancient introductions (archaeophytes); 'not recorded' = no GRB row."},
    ]
    out_ins = {"generated": date.today().isoformat(), "denominators": tot, "east_mediterranean": EAST_MED,
               "peak": {k: {"code": c, "name": names[c], "n": counts[c][k]} for k, c in best.items()}, "insights": insights}
    (PROC / "insights.json").write_text(json.dumps(out_ins, ensure_ascii=False, indent=1), encoding="utf-8")

    # ------------------------------------------------------------- overview for the explorer
    used = {s for t in top.values() for lst in t.values() for s in lst} | {s for x in insights for s in x.get("examples", [])}
    overview = {
        "generated": out_ins["generated"],
        "about": "Species of each herbal native to each WGSRPD level-3 unit (WCVP). c = [Dioscorides, Culpeper, both]; "
                 "top = up to four of those species per unit, most indications first.",
        "totals": tot, "peak": out_ins["peak"], "insights": insights,
        "regions": {c: {"c": [v["dsc"], v["cul"], v["both"]], "top": [top[c]["dsc"], top[c]["cul"], top[c]["both"]]}
                    for c, v in counts.items() if v["dsc"] or v["cul"]},
        "plants": {i["slug"]: [i["taxon"], i["common"]] for i in info if i["slug"] in used},
        "sources": {"ranges": CITE_WCVP, "regions": CITE_TDWG},
    }
    (WEB / "overview.json").write_text(json.dumps(overview, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (WEB / "ranges.json").write_text(json.dumps({"generated": out_ins["generated"], "source": CITE_WCVP, "taxa": bulk},
                                                ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    sp_all = [r for r in match.to_dict("records") if r["rank"] == "species"]
    matched = [r for r in sp_all if r["method"] != "unmatched"]
    index = {
        "about": "Geography of the Palimpsest taxa. All codes are WGSRPD level-3 botanical countries.",
        "generated": out_ins["generated"],
        "match": {"taxa": len(match), "matched": int((match.method != "unmatched").sum()),
                  "species": len(sp_all), "species_matched": len(matched),
                  "by_method": match.method.value_counts().to_dict(),
                  "unmatched": list(match[match.method == "unmatched"].taxon),
                  "note": "WCVP covers vascular plants only; the unmatched taxa are mosses, liverworts, algae, lichens and fungi."},
        "files": {
            "regions.topo.json": "TopoJSON, object 'regions': WGSRPD level-3 units drawn from Natural Earth admin-1 (lon/lat, simplified); "
                                 "properties id, name, l2, l1, lon, lat, approx; 'points' lists units too small to draw",
            "regions-globe.topo.json": "The same units, coarser (0.4 degree tolerance), for the turning globe",
            "regions.json": "The 369 units without geometry: id, name, level-2 and level-1 codes and names, label point, approx, iou "
                            "(overlap of the drawn Natural Earth units with the WGSRPD extent)",
            "../../../../data/processed/geo/wgsrpd_ne_crosswalk.csv": "In the repository: every Natural Earth admin-1 unit, the WGSRPD "
                            "level-3 unit it was assigned to and how (location, iso, nearest), with split-off parts",
            "overview.json": "Per unit: species of Dioscorides, Culpeper and both native there, top plants, and the computed insights",
            "ranges.json": "Every taxon (by explorer slug): WCVP match method and native / introduced codes",
            "taxa/<slug>.json": "One taxon: WCVP name and match, native / introduced / doubtful / extinct codes, a plain sentence, "
                                "and GBIF occurrence counts on a 2.8125-degree grid (cells = [lon, lat, count] at cell centres)",
        },
        "licences": {"ranges": "WCVP, CC BY 3.0 (README_WCVP.xlsx in wcvp.zip)", "occurrences": "GBIF, CC BY 4.0",
                     "regions": "Boundaries: Natural Earth (public domain); botanical-country units after TDWG WGSRPD "
                                "(Brummitt 2001), drawn approximately. Crosswalk: data/processed/geo/wgsrpd_ne_crosswalk.csv"},
        "cite": [CITE_WCVP, CITE_GBIF, CITE_TDWG],
        "rules": "Species rank only in counts; native = WCVP introduced 0, not extinct, not doubtful; genus-rank taxa map the union of their accepted species.",
    }
    (WEB / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")

    print("totals", tot, "peak", out_ins["peak"])
    for x in insights:
        print("-", x["text"])
    print("overview bytes", (WEB / "overview.json").stat().st_size, "ranges bytes", (WEB / "ranges.json").stat().st_size)
    for s in ["artemisia-absinthium", "ruta-graveolens", "allium-cepa", "plantago-major", "crocus-sativus"]:
        f = WEB / "taxa" / f"{s}.json"
        if f.exists():
            d = json.loads(f.read_text(encoding="utf-8"))
            print(s, len(d["native"]), len(d["introduced"]), len(d["gbif"]["cells"]), "|", d["summary"])


if __name__ == "__main__":
    main()
