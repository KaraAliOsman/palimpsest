"""Native and introduced ranges for the 692 taxa from Kew's World Checklist of Vascular Plants (WCVP).

Matching, in order:
  1. accepted   : our GBIF accepted binomial is an Accepted WCVP name of the same rank;
  2. synonym    : it is a WCVP synonym; follow accepted_plant_name_id (homotypic synonyms first);
  3. gbif-synonym: one of the taxon's GBIF backbone synonyms (api.gbif.org/v1/species/{key}/synonyms,
                   cached in --cache) matches by rule 1 or 2.
Genus-rank taxa take the union of the ranges of every Accepted species of the genus (method genus-union).
A WCVP distribution row is native unless introduced = 1; extinct and location_doubtful rows are kept apart.

Inputs : wcvp_names.csv and wcvp_distribution.csv (wcvp.zip from https://sftp.kew.org/pub/data-repositories/WCVP/,
         licence per its README: CC BY 3.0), web/public/data/plants.json.
Outputs: data/processed/geo/wcvp_match.csv   one row per taxon: how it matched and to which WCVP name
         data/processed/geo/taxon_ranges.csv taxon, area_code_l3, status (native|introduced|extinct|doubtful)

Usage  : python scripts/geo_wcvp.py --wcvp <dir> --cache <dir>
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed" / "geo"
SKIP = {"Misapplied", "Unplaced", "Artificial Hybrid", "Local Biotype"}
SYN_ORDER = {"Synonym": 1, "Orthographic": 0, "Illegitimate": 2, "Invalid": 2}


def gbif_synonyms(key, cache: Path) -> list[str]:
    path = cache / f"syn_{key}.json"
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        url = f"https://api.gbif.org/v1/species/{key}/synonyms?limit=200"
        req = urllib.request.Request(url, headers={"User-Agent": "Palimpsest/0.1 (EthnoHack 2026)"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print("  synonyms failed", key, e)
            return []
        path.write_text(json.dumps(data), encoding="utf-8")
        time.sleep(0.2)
    return [x.get("canonicalName") for x in data.get("results", []) if x.get("canonicalName") and x.get("rank") == "SPECIES"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wcvp", required=True)
    ap.add_argument("--cache", required=True)
    a = ap.parse_args()
    cache = Path(a.cache)
    cache.mkdir(parents=True, exist_ok=True)

    names = pd.read_csv(Path(a.wcvp) / "wcvp_names.csv", sep="|", dtype=str, keep_default_na=False, quoting=3,
                        usecols=["plant_name_id", "taxon_rank", "taxon_status", "genus", "taxon_name",
                                 "taxon_authors", "accepted_plant_name_id", "homotypic_synonym", "powo_id"])
    names = names[~names.taxon_status.isin(SKIP)]
    by_id = names.set_index("plant_name_id")
    by_name = {k: g for k, g in names[names.taxon_rank.isin(["Species", "Genus"])].groupby("taxon_name")}
    # Spelling-only differences: WCVP writes nothospecies with a multiplication sign (Iris × germanica)
    # and keeps original hyphens (Atropa bella-donna).
    norm = lambda n: n.replace("× ", "").replace("×", "").replace("-", "").lower()  # noqa: E731
    by_norm: dict[str, list[str]] = {}
    for k in by_name:
        by_norm.setdefault(norm(k), []).append(k)
    dist = pd.read_csv(Path(a.wcvp) / "wcvp_distribution.csv", sep="|", dtype=str, keep_default_na=False, quoting=3,
                       usecols=["plant_name_id", "area_code_l3", "introduced", "extinct", "location_doubtful"])
    dist = dist[dist.area_code_l3 != ""]
    dist_by = {k: g for k, g in dist.groupby("plant_name_id")}

    def resolve(name: str, rank: str):
        g = by_name.get(name)
        if g is None:
            alts = by_norm.get(norm(name), [])
            if not alts:
                return None
            g = pd.concat([by_name[k] for k in alts])
        g = g[g.taxon_rank == rank]
        acc = g[g.taxon_status == "Accepted"]
        if len(acc):
            return acc.iloc[0].plant_name_id, "accepted"
        syn = g[g.accepted_plant_name_id != ""].copy()
        if not len(syn):
            return None
        syn["o"] = [(0 if h == "T" else 1, SYN_ORDER.get(s, 3)) for h, s in zip(syn.homotypic_synonym, syn.taxon_status)]
        syn = syn.sort_values("o")
        return syn.iloc[0].accepted_plant_name_id, "synonym"

    plants = json.loads((ROOT / "web" / "public" / "data" / "plants.json").read_text(encoding="utf-8"))
    match_rows, range_rows = [], []
    accepted_species = names[(names.taxon_rank == "Species") & (names.taxon_status == "Accepted")]
    species_by_genus = {k: list(g.plant_name_id) for k, g in accepted_species.groupby("genus")}

    for p in plants:
        taxon, rank = p["taxon"], (p.get("rank") or "species").lower()
        rec = {"taxon": taxon, "rank": rank, "gbif_key": p.get("gbif_key"), "method": "", "wcvp_id": "", "wcvp_name": "",
               "wcvp_authors": "", "wcvp_rank": "", "powo_id": "", "via": "", "n_native": 0, "n_introduced": 0}
        if rank == "genus":
            r = resolve(taxon, "Genus")
            ids = species_by_genus.get(taxon, [])
            if r and ids:
                rec.update(method="genus-union", wcvp_id=r[0], via=f"{len(ids)} accepted species")
                sub = pd.concat([dist_by[i] for i in ids if i in dist_by]) if any(i in dist_by for i in ids) else dist.iloc[:0]
                nat = set(sub[(sub.introduced == "0") & (sub.extinct == "0") & (sub.location_doubtful == "0")].area_code_l3)
                intro = set(sub[sub.introduced == "1"].area_code_l3) - nat
                status = {c: "native" for c in nat} | {c: "introduced" for c in intro}
            else:
                status = None
        else:
            r = resolve(taxon, "Species")
            if not r and p.get("gbif_key"):
                for syn in gbif_synonyms(p["gbif_key"], cache):
                    r = resolve(syn, "Species")
                    if r:
                        r = (r[0], "gbif-synonym")
                        rec["via"] = syn
                        break
            status = None
            if r:
                rec.update(method=r[1], wcvp_id=r[0])
                rows = dist_by.get(r[0])
                status = {}
                if rows is not None:
                    for c, intro, ext, doubt in zip(rows.area_code_l3, rows.introduced, rows.extinct, rows.location_doubtful):
                        s = "doubtful" if doubt == "1" else "extinct" if ext == "1" else "introduced" if intro == "1" else "native"
                        # A unit with both a native and an introduced row (e.g. two subspecies) counts as native.
                        prev = status.get(c)
                        if prev != "native":
                            status[c] = s if prev is None or s == "native" else prev
        if rec["wcvp_id"] and rec["wcvp_id"] in by_id.index:
            n = by_id.loc[rec["wcvp_id"]]
            if isinstance(n, pd.DataFrame):
                n = n.iloc[0]
            rec.update(wcvp_name=n.taxon_name, wcvp_authors=n.taxon_authors, wcvp_rank=n.taxon_rank, powo_id=n.powo_id)
        if status:
            for c, s in sorted(status.items()):
                range_rows.append((taxon, c, s))
            rec["n_native"] = sum(1 for s in status.values() if s == "native")
            rec["n_introduced"] = sum(1 for s in status.values() if s == "introduced")
        if not rec["method"]:
            rec["method"] = "unmatched"
        match_rows.append(rec)

    OUT.mkdir(parents=True, exist_ok=True)
    m = pd.DataFrame(match_rows)
    m.to_csv(OUT / "wcvp_match.csv", index=False)
    pd.DataFrame(range_rows, columns=["taxon", "area_code_l3", "status"]).to_csv(OUT / "taxon_ranges.csv", index=False)
    print(m.groupby(["rank", "method"]).size())
    sp = m[m["rank"] == "species"]
    ok = sp[sp.method != "unmatched"]
    print(f"species matched {len(ok)}/{len(sp)} = {len(ok) / len(sp):.1%}; with a native range {int((sp.n_native > 0).sum())}")
    print("unmatched:", list(m[m.method == "unmatched"].taxon))


if __name__ == "__main__":
    main()
