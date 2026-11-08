"""P7 - write the 'tests we wrote down' ledger from the committed result files.

Usage (repo root, PYTHONPATH=src)::

    python scripts/tests_ledger.py

Writes web/public/data/extra/tests_ledger.json and results/extensions/tests_ledger.md.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from palimpsest.analysis import ledger as LG  # noqa: E402
from palimpsest.paths import RESULTS, WEB_DATA  # noqa: E402


def main() -> None:
    led = LG.build(ROOT)
    counts = dict(Counter(e["status"] for e in led))
    out = {"title": "Tests we wrote down", "generated": date.today().isoformat(),
           "status_definitions": {"held": "the stated prediction's criterion is met",
                                  "did not hold": "estimate in the opposite direction, CI excluding the null",
                                  "null": "CI includes the null value - no detectable effect",
                                  "indicative": "descriptive quality check without a pre-set threshold"},
           "timing_note": "'recorded' is the modification date of the result file (the repository has no git "
                          "history); 'prediction_timing' marks criteria fixed only when this ledger was written.",
           "counts": counts, "n_tests": len(led), "tests": led}
    (WEB_DATA / "extra").mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "extra" / "tests_ledger.json").write_text(json.dumps(out, indent=1, ensure_ascii=False, default=float),
                                                         encoding="utf-8")
    md = ["# P7 · Tests we wrote down", "", f"*Generated {out['generated']} · reproduce: "
          "`PYTHONPATH=src python scripts/tests_ledger.py`*", "",
          f"{len(led)} tests: " + ", ".join(f"{v} {k}" for k, v in sorted(counts.items())) + ".", "",
          "| ID | Area | Question | Prediction | Result | Status | Timing |", "|---|---|---|---|---|---|---|"]
    for e in led:
        md.append(f"| {e['id']} | {e['area']} | {e['question']} | {e['prediction']} | {e['result']} | "
                  f"**{e['status']}** | {e['prediction_timing']} |")
    md += ["", "Reproduce commands and machine-readable numbers: `web/public/data/extra/tests_ledger.json`.", ""]
    (RESULTS / "extensions" / "tests_ledger.md").write_text("\n".join(md), encoding="utf-8")
    print(len(led), counts)


if __name__ == "__main__":
    main()
