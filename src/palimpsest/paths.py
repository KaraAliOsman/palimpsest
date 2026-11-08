"""Canonical filesystem locations used by every pipeline step."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = DATA / "raw"
INTERIM = DATA / "interim"
CURATED = DATA / "curated"
LEXICONS = DATA / "lexicons"
ANNOTATIONS = DATA / "annotations"
CACHE = DATA / "cache"
PROCESSED = DATA / "processed"
RESULTS = ROOT / "results"
FIGURES = RESULTS / "figures"
TABLES = RESULTS / "tables"
WEB_DATA = ROOT / "web" / "public" / "data"

DIOSCORIDES_XML = RAW / "tlg0656.tlg001.1st1K-grc1.xml"
DIOSCORIDES_URL = (
    "https://raw.githubusercontent.com/OpenGreekAndLatin/First1KGreek/master/"
    "data/tlg0656/tlg001/tlg0656.tlg001.1st1K-grc1.xml"
)
CULPEPER_TXT = RAW / "culpeper_pg49513.txt"
CULPEPER_URL = "https://www.gutenberg.org/cache/epub/49513/pg49513.txt"

MONOGRAPHS = INTERIM / "monographs.jsonl"


def ensure_dirs() -> None:
    for p in (RAW, INTERIM, CURATED, LEXICONS, ANNOTATIONS, CACHE, PROCESSED,
              FIGURES, TABLES, WEB_DATA):
        p.mkdir(parents=True, exist_ok=True)
