"""Command-line entry point: ``python -m palimpsest <step>``.

Steps run in this order (``all`` runs them in sequence):

  download   fetch the two public-domain / CC BY-SA source texts
  corpus     parse them into data/interim/monographs.jsonl
  taxa       merge curated identifications and resolve them on the GBIF backbone
  extract    run the Greek and English lexicons -> data/processed/claims.csv
  evaluate   precision / recall against the blind reference annotation
  evidence   query Europe PMC, ClinicalTrials.gov, GBIF, Wikidata (cached)
  naming     check name concordance against Wikidata Greek / GBIF English names
  analyze    transmission test, modern-evidence models, leads, figures
  kg         export the knowledge graph (CSV + GraphML)
  web        export JSON for the web explorer
"""
from __future__ import annotations

import argparse
import json
import sys
import time


def _download() -> None:
    import requests

    from .paths import CULPEPER_TXT, CULPEPER_URL, DIOSCORIDES_URL, DIOSCORIDES_XML, ensure_dirs

    ensure_dirs()
    for url, path in ((DIOSCORIDES_URL, DIOSCORIDES_XML), (CULPEPER_URL, CULPEPER_TXT)):
        if path.exists():
            print(f"exists  {path.name}")
            continue
        r = requests.get(url, timeout=60, headers={"User-Agent": "palimpsest-ethnohack/0.1"})
        r.raise_for_status()
        path.write_bytes(r.content)
        print(f"fetched {path.name} ({len(r.content):,} bytes)")


def _step(name: str) -> None:
    t0 = time.time()
    if name == "download":
        _download()
    elif name == "corpus":
        from .corpora import build_monographs
        print(build_monographs())
    elif name == "taxa":
        from .taxa import merge_parts, resolve
        print(merge_parts())
        df = resolve()
        print(df.groupby("source").taxon.apply(lambda s: (s != "").sum()).to_dict(), "resolved")
    elif name == "extract":
        from .extract import run_extraction
        df = run_extraction()
        print(df.groupby(["source", "polarity"]).size().to_dict())
    elif name == "evaluate":
        from .evaluate import evaluate
        res = evaluate()
        print(json.dumps({s: {k: {m: round(v[m], 3) for m in ("precision", "recall", "f1")}
                              for k, v in r.items()} for s, r in res.items()}, indent=1))
    elif name == "evidence":
        from .evidence import run_evidence
        print(run_evidence())
    elif name == "naming":
        from .naming import name_validation
        print(json.dumps(name_validation(), indent=1, ensure_ascii=False))
    elif name == "analyze":
        from .analysis.run import run_analysis
        s = run_analysis()
        t = s["transmission"]
        print(f"transmission: observed {t['observed_overlap']} vs chance {t['null_mean']:.1f} "
              f"({t['fold_enrichment']:.2f}x, p={t['p_value']:.2g})")
    elif name == "kg":
        from .export import export_kg
        print(export_kg())
    elif name == "web":
        from .export import export_web
        print(export_web())
    else:
        raise SystemExit(f"unknown step {name}")
    print(f"[{name}] done in {time.time() - t0:.1f}s")


STEPS = ["download", "corpus", "taxa", "extract", "evaluate", "evidence", "naming", "analyze", "kg",
         "web"]


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="palimpsest", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("steps", nargs="+", choices=STEPS + ["all"])
    args = ap.parse_args(argv)
    steps = STEPS if "all" in args.steps else args.steps
    for s in steps:
        _step(s)


if __name__ == "__main__":
    main(sys.argv[1:])
