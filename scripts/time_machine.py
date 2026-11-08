"""P5 - time-machine (pseudo-prospective) test of the modern-evidence signal.

Did the herbals PREDICT later research? For every scored pair (claimed + the 12
seeded unclaimed controls per plant) we re-count Europe PMC co-mentions with
publication-year windows, take the pairs that had **no** paper up to a cutoff
year, and ask whether claimed pairs gained >= 1 paper after the cutoff more
often than unclaimed indications of the same plants.

Usage (repo root, PYTHONPATH=src)::

    python scripts/time_machine.py fetch     # ~15k cached Europe PMC queries (~30 min first run)
    python scripts/time_machine.py analyze   # offline: models, JSON, markdown, figure

Outputs: data/processed/extensions/time_machine_counts.csv,
results/extensions/time_machine.{json,md}, results/extensions/fig_time_machine.png,
web/public/data/extra/time_machine.json. Primary outputs are never touched.
"""
from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from palimpsest.evidence import concept_terms  # noqa: E402
from palimpsest.paths import PROCESSED, RESULTS, WEB_DATA  # noqa: E402

OUT = RESULTS / "extensions"
OUTP = PROCESSED / "extensions"
WEB = WEB_DATA / "extra"
COUNTS = OUTP / "time_machine_counts.csv"
CUTOFFS = (2005, 2010, 2015)
PRIMARY = 2010


def _pmap(fn, items, workers=16):
    with ThreadPoolExecutor(max_workers=workers) as ex:
        return list(ex.map(fn, items))


def fetch() -> None:
    from palimpsest.sources import europepmc_years as Y

    OUTP.mkdir(parents=True, exist_ok=True)
    ps = pd.read_csv(PROCESSED / "pairs_scored.csv")
    terms = concept_terms()
    taxa = sorted(ps[ps.taxon_total > 0].taxon.unique())
    print(f"{len(taxa)} taxa, {len(ps)} pairs, {(ps.pair > 0).sum()} with >= 1 paper", flush=True)

    # plant research volume by window (only what was knowable at each cutoff)
    tv = {}
    for name, lo, hi in [("t_le2005", None, 2005), ("t_le2010", None, 2010), ("t_gt2010", 2011, None),
                         ("t_le2015", None, 2015)]:
        tv[name] = dict(zip(taxa, _pmap(lambda t: Y.taxon_count_window(t, lo, hi), taxa)))
        print("taxon window", name, "done", flush=True)

    # pair counts: only pairs with >= 1 paper today can have >= 1 in any window
    need = ps[(ps.pair > 0) & (ps.taxon_total > 0)][["taxon", "concept_id"]].drop_duplicates()
    keys = list(need.itertuples(index=False, name=None))
    res = {}
    for name, lo, hi in [("c_le2010", None, 2010), ("c_gt2010", 2011, None), ("c_le2005", None, 2005),
                         ("c_le2015", None, 2015)]:
        res[name] = dict(zip(keys, _pmap(lambda k: Y.pair_count_window(k[0], terms[k[1]], lo, hi), keys)))
        print("pair window", name, "done", flush=True)

    out = ps[["taxon", "concept_id", "group", "pair", "taxon_total", "concept_total", "n_dsc", "n_cul"]].copy()
    for name in res:
        out[name] = [res[name].get((t, c), 0) for t, c in zip(out.taxon, out.concept_id)]
    for name in tv:
        out[name] = out.taxon.map(tv[name]).fillna(0).astype(int)
    out.to_csv(COUNTS, index=False)
    print("wrote", COUNTS, flush=True)


def analyze() -> None:
    from palimpsest.analysis import time_machine as T

    for d in (OUT, WEB):
        d.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(COUNTS)
    res = T.run_all(df, CUTOFFS, PRIMARY)
    res["reproduce"] = ["PYTHONPATH=src python scripts/time_machine.py fetch",
                        "PYTHONPATH=src python scripts/time_machine.py analyze"]
    res["generated"] = date.today().isoformat()
    (OUT / "time_machine.json").write_text(json.dumps(res, indent=2, ensure_ascii=False, default=float),
                                           encoding="utf-8")
    web = {k: res[k] for k in ("question", "design", "verdict", "headline", "by_cutoff", "consistency",
                               "caveats", "reproduce", "generated")}
    (WEB / "time_machine.json").write_text(json.dumps(web, indent=1, ensure_ascii=False, default=float),
                                           encoding="utf-8")
    T.figure(res, OUT / "fig_time_machine.png")
    (OUT / "time_machine.md").write_text(T.markdown(res), encoding="utf-8")
    print(json.dumps(res["headline"], indent=1, default=float))
    print(res["verdict"])


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "analyze"
    {"fetch": fetch, "analyze": analyze}[step]()
