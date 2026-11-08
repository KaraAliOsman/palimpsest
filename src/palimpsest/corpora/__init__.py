"""Corpus readers. Each yields monograph dicts following docs/DATA_CONTRACT.md."""
from __future__ import annotations

import json

from ..paths import MONOGRAPHS, ensure_dirs
from . import culpeper, dioscorides


def build_monographs() -> dict[str, int]:
    ensure_dirs()
    counts = {"dioscorides": 0, "culpeper": 0}
    with MONOGRAPHS.open("w", encoding="utf-8") as fh:
        for rec in dioscorides.iter_chapters():
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            counts["dioscorides"] += 1
        for rec in culpeper.iter_monographs():
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            counts["culpeper"] += 1
    return counts


def load_monographs() -> list[dict]:
    with MONOGRAPHS.open(encoding="utf-8") as fh:
        return [json.loads(l) for l in fh if l.strip()]
