"""WGSRPD level-3 "botanical countries", drawn with Natural Earth (public domain) boundaries.

Every geometry the explorer ships comes from Natural Earth 1:10m admin-1 states and provinces
(naturalearthdata.com, public domain, v5.1). WGSRPD (Brummitt 2001; TDWG) supplies only the codes, names and
hierarchy (tblLevel1-4.txt of the 2nd edition) and the crosswalk below; its own boundary files, which carry
an ESRI copyright note, are used only as a locator to decide which WGSRPD unit an admin-1 unit falls in and
are never written out.

Crosswalk (written to data/processed/geo/wgsrpd_ne_crosswalk.csv), for each Natural Earth admin-1 unit:
  1. location : the unit's interior point lies inside a WGSRPD level-3 unit -> that unit;
  2. iso      : otherwise (coast and islet gaps), its ISO 3166-1 code if WGSRPD's level-4 table maps that
                code to exactly one level-3 unit;
  3. nearest  : otherwise the nearest WGSRPD level-3 unit within 1 degree;
  otherwise unassigned. iso_unique records what the ISO table alone would say, so disagreements are visible.
  A multi-part admin-1 unit is split by part: each island or exclave whose own interior point lies in another
  level-3 unit goes there (Labrador from Newfoundland, the Kurils from Sakhalin); parts column lists them.
A level-3 unit is flagged approximate when the Natural Earth units drawn for it overlap its WGSRPD extent
by less than 90% (intersection over union) and the unit is larger than 2 deg² (below that, coastline detail
dominates), i.e. when admin-1 lines do not follow the 1992 WGSRPD lines. Units with no
admin-1 geometry (small islands) are shipped as points only ("geom": false) and drawn as dots.

Outputs: web/public/data/derived/geo/regions.topo.json (maps), regions-globe.topo.json (coarser, for the globe),
         web/public/data/derived/geo/regions.json,
         data/processed/geo/wgsrpd_ne_crosswalk.csv

Usage: python scripts/geo_regions.py --ne-admin1 <ne_10m_admin_1_states_provinces.shp>
                                     --wgsrpd <dir with tblLevel1-4.txt> --locator <wgsrpd level3.geojson>
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

import shapefile
import topojson as tp
from shapely import STRtree
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "data" / "derived" / "geo"
PROC = ROOT / "data" / "processed" / "geo"

# Display names for units whose 1992 names no longer describe a country (codes are unchanged).
RENAME = {"YUG": "Former Yugoslavia", "CZE": "Czechia and Slovakia", "BLT": "Baltic States"}
ISO_FIX = {"UK": "GB"}  # WGSRPD writes the United Kingdom as UK; Natural Earth uses GB


def table(path: Path) -> list[list[str]]:
    with open(path, encoding="latin-1") as fh:
        return [line.rstrip("\r\n").split("*") for line in fh][1:]


def code(v: str) -> int:
    return int(float(v.replace(",", ".")))


def polys(g) -> list[Polygon]:
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for p in getattr(g, "geoms", []) if isinstance(p, Polygon)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ne-admin1", required=True)
    ap.add_argument("--wgsrpd", required=True)
    ap.add_argument("--locator", required=True)
    ap.add_argument("--simplify", type=float, default=0.15, help="toposimplify tolerance, degrees")
    ap.add_argument("--min-area", type=float, default=0.03, help="drop islets smaller than this (deg²) unless a unit's largest part")
    ap.add_argument("--globe-simplify", type=float, default=0.4, help="coarser tolerance for the globe file, degrees")
    a = ap.parse_args()
    w = Path(a.wgsrpd)

    l1 = {code(r[0]): r[1] for r in table(w / "tblLevel1.txt")}
    l2 = {code(r[0]): (r[1], code(r[2])) for r in table(w / "tblLevel2.txt")}
    l3 = {r[0]: (r[1], code(r[2])) for r in table(w / "tblLevel3.txt")}
    iso_to_l3: dict[str, set[str]] = defaultdict(set)
    for r in table(w / "tblLevel4.txt"):
        if r[3]:
            iso_to_l3[ISO_FIX.get(r[3], r[3])].add(r[2])

    # Locator only: WGSRPD polygons decide membership; none of their vertices is written out.
    loc = json.loads(Path(a.locator).read_text(encoding="utf-8"))
    loc_codes = [f["properties"]["LEVEL3_COD"] for f in loc["features"]]
    loc_geoms = [shape(f["geometry"]).buffer(0) for f in loc["features"]]
    tree = STRtree(loc_geoms)

    sf = shapefile.Reader(a.ne_admin1, encoding="utf-8", encodingErrors="replace")
    fields = [f[0] for f in sf.fields[1:]]
    parts: dict[str, list] = defaultdict(list)
    approx: set[str] = set()
    rows = []
    for sr in sf.iterShapeRecords():
        rec = dict(zip(fields, sr.record))
        g = shape(sr.shape.__geo_interface__).buffer(0)
        if g.is_empty:
            continue
        pt = g.representative_point()
        iso = rec.get("iso_a2") or ""
        uniq = next(iter(iso_to_l3[iso])) if len(iso_to_l3.get(iso, ())) == 1 else ""
        hit, method, split = "", "", ""
        for i in tree.query(pt, predicate="intersects"):
            hit, method = loc_codes[int(i)], "location"
            break
        if not hit and uniq:
            hit, method = uniq, "iso"
        if not hit:
            i = tree.query_nearest(pt, max_distance=1.0)
            if len(i):
                hit, method = loc_codes[int(i[0])], "nearest"
                approx.add(hit)
        rows.append({"adm1_code": rec["adm1_code"], "ne_name": rec["name"], "admin": rec["admin"], "iso_a2": iso,
                     "iso_unique_l3": uniq, "l3": hit, "method": method or "unassigned"})
        if hit:
            pieces = polys(g)
            moved = defaultdict(int)
            for q in pieces:
                dest = hit
                if len(pieces) > 1:
                    for i in tree.query(q.representative_point(), predicate="intersects"):
                        dest = loc_codes[int(i)]
                        break
                parts[dest].append(q)
                if dest != hit:
                    moved[dest] += 1
            if moved:
                rows[-1]["parts"] = "; ".join(f"{k}:{v}" for k, v in sorted(moved.items()))

    iou: dict[str, float] = {}
    for c3, gs in parts.items():
        if c3 not in loc_codes:
            continue
        ne_u = unary_union(gs)
        ref = loc_geoms[loc_codes.index(c3)]
        u = ne_u.union(ref).area
        iou[c3] = ne_u.intersection(ref).area / u if u else 0.0
        # Small islands always differ in coastline detail; only units above 2 deg² are judged.
        if iou[c3] < 0.9 and ref.area > 2.0:
            approx.add(c3)
    for r in rows:
        r.setdefault("parts", "")

    feats, meta = [], []
    missing = []
    for c3, (name3, c2) in sorted(l3.items()):
        name = RENAME.get(c3, name3)
        c1 = l2[c2][1]
        g = unary_union(parts[c3]) if parts.get(c3) else None
        if g is not None and not g.is_empty:
            ps = polys(g)
            big = max(ps, key=lambda q: q.area)
            keep = [q for q in ps if q.area >= a.min_area or q is big]
            geom = keep[0] if len(keep) == 1 else MultiPolygon(keep)
            pt = big.representative_point()
            has = True
        else:
            # A point-only unit: its label point comes from the locator polygon (a coordinate, not a boundary).
            i = loc_codes.index(c3) if c3 in loc_codes else -1
            pt = loc_geoms[i].representative_point() if i >= 0 else None
            geom, has = None, False
            missing.append(c3)
        props = {"id": c3, "name": name, "l2": c2, "l1": c1,
                 "lon": round(pt.x, 2) if pt else None, "lat": round(pt.y, 2) if pt else None,
                 "approx": c3 in approx, "geom": has, "iou": round(iou.get(c3, 0.0), 3) if has else None}
        if geom is not None:
            feats.append({"type": "Feature", "id": c3, "properties": props, "geometry": mapping(geom)})
        meta.append({**props, "l2_name": l2[c2][0], "l1_name": l1.get(c1)})

    topo = tp.Topology({"type": "FeatureCollection", "features": feats}, object_name="regions",
                       prequantize=1e5, topoquantize=2e4, toposimplify=a.simplify, simplify_with="shapely")
    t = json.loads(topo.to_json())
    t["levels"] = {"l1": {str(k): v for k, v in l1.items()}, "l2": {str(k): v[0] for k, v in sorted(l2.items())}}
    # Point-only units travel with the geometry so a map can dot them.
    t["points"] = [{k: m[k] for k in ("id", "name", "l2", "l1", "lon", "lat", "approx")} for m in meta if not m["geom"] and m["lon"] is not None]
    t["source"] = ("Boundaries: Natural Earth 1:10m admin-1 (public domain), dissolved into botanical-country units "
                   "after TDWG WGSRPD level 3 (Brummitt 2001), drawn approximately.")
    OUT.mkdir(parents=True, exist_ok=True)
    PROC.mkdir(parents=True, exist_ok=True)
    (OUT / "regions.topo.json").write_text(json.dumps(t, separators=(",", ":")), encoding="utf-8")
    # The globe redraws every frame while it turns, so it gets a coarser copy (same units, same properties).
    gfeats = []
    for f in feats:
        ps = [q for q in polys(shape(f["geometry"])) if q.area >= 0.12] or [max(polys(shape(f["geometry"])), key=lambda q: q.area)]
        gfeats.append({**f, "geometry": mapping(ps[0] if len(ps) == 1 else MultiPolygon(ps))})
    gt = json.loads(tp.Topology({"type": "FeatureCollection", "features": gfeats}, object_name="regions", prequantize=1e5,
                                topoquantize=1e4, toposimplify=a.globe_simplify, simplify_with="shapely").to_json())
    gt["levels"], gt["points"], gt["source"] = t["levels"], t["points"], t["source"]
    (OUT / "regions-globe.topo.json").write_text(json.dumps(gt, separators=(",", ":")), encoding="utf-8")
    (OUT / "regions.json").write_text(json.dumps({
        "about": "WGSRPD level-3 botanical countries used by every geo file; geometry is in regions.topo.json (object "
                 "'regions'; point-only units in 'points'). approx = boundary drawn approximately from Natural Earth units.",
        "source": t["source"], "crosswalk": "data/processed/geo/wgsrpd_ne_crosswalk.csv", "n": len(meta), "regions": meta,
    }, ensure_ascii=False, indent=0), encoding="utf-8")
    with open(PROC / "wgsrpd_ne_crosswalk.csv", "w", newline="", encoding="utf-8") as fh:
        wr = csv.DictWriter(fh, fieldnames=list(rows[0]))
        wr.writeheader()
        wr.writerows(sorted(rows, key=lambda r: (r["l3"], r["adm1_code"])))
    by = defaultdict(int)
    for r in rows:
        by[r["method"]] += 1
    print("admin-1 units", len(rows), dict(by))
    print("level-3 units", len(meta), "with geometry", len(feats), "approximate", len(approx), "point-only", len(missing))
    print("point-only:", " ".join(missing))
    print("topo bytes", (OUT / "regions.topo.json").stat().st_size, "globe bytes", (OUT / "regions-globe.topo.json").stat().st_size)


if __name__ == "__main__":
    main()
