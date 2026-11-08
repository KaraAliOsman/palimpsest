"""Recorded occurrences per taxon from the GBIF maps API, binned to a 2.8125-degree grid.

For each taxon's GBIF backbone key we fetch the two zoom-0 vector tiles of the plate-carree density map
(https://api.gbif.org/v2/map/occurrence/density/0/{x}/0.mvt?srs=EPSG:4326&taxonKey=K&bin=square&squareSize=64),
which GBIF has already binned into 64 x 64 squares per 180 degrees, and keep each square's centre and count.
Raw tiles are cached in --cache (outside the repository); a rerun is offline.

Output: data/processed/geo/gbif_grid.csv.gz  (taxon, gbif_key, lon, lat, count)
GBIF occurrence data: CC BY 4.0, cite "GBIF.org (<date>) GBIF Occurrence Download / maps API".

Usage: python scripts/geo_gbif.py --cache <dir> [--sleep 0.15]
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed" / "geo"
URL = "https://api.gbif.org/v2/map/occurrence/density/0/{x}/0.mvt?srs=EPSG:4326&taxonKey={k}&bin=square&squareSize=64"
EXTENT, SPAN = 4096, 180.0


def fetch(url: str, path: Path, sleep: float) -> bytes:
    if path.exists():
        return path.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": "Palimpsest/0.1 (EthnoHack 2026; research explorer)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                b = r.read()
            path.write_bytes(b)
            time.sleep(sleep)
            return b
        except Exception as e:  # noqa: BLE001 - network: retry with backoff, then give up on this tile
            if attempt == 3:
                print("  failed", url, e)
                return b""
            time.sleep(2 ** attempt)
    return b""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--sleep", type=float, default=0.15)
    a = ap.parse_args()
    cache = Path(a.cache)
    cache.mkdir(parents=True, exist_ok=True)
    plants = json.loads((ROOT / "web" / "public" / "data" / "plants.json").read_text(encoding="utf-8"))
    rows = []
    for i, p in enumerate(plants):
        k = p.get("gbif_key")
        if not k:
            continue
        for x in (0, 1):
            b = fetch(URL.format(x=x, k=k), cache / f"{k}_{x}.mvt", a.sleep)
            if not b:
                continue
            layer = mvt.decode(b).get("occurrence")
            if not layer:
                continue
            for f in layer["features"]:
                ring = f["geometry"]["coordinates"][0]
                xs = [q[0] for q in ring]
                ys = [q[1] for q in ring]
                cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2  # tile units, y up
                lon = cx / EXTENT * SPAN + (x * SPAN - 180.0)
                lat = cy / EXTENT * SPAN - 90.0
                rows.append((p["taxon"], k, round(lon, 3), round(lat, 3), int(f["properties"]["total"])))
        if i % 50 == 0:
            print(i, p["taxon"], len(rows))
    OUT.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(rows, columns=["taxon", "gbif_key", "lon", "lat", "count"])
    df.to_csv(OUT / "gbif_grid.csv.gz", index=False, compression="gzip")
    print("cells", len(df), "taxa", df.taxon.nunique(), "occurrences", int(df["count"].sum()))


if __name__ == "__main__":
    main()
