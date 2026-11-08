import os
import sys
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "network: live smoke test against a public API (responses are cached in "
        "data/cache; skipped when PALIMPSEST_OFFLINE=1; deselect with -m 'not network')",
    )


def pytest_collection_modifyitems(config, items):
    if os.environ.get("PALIMPSEST_OFFLINE", "").strip().lower() in {"1", "true", "yes", "on"}:
        skip = pytest.mark.skip(reason="PALIMPSEST_OFFLINE=1")
        for item in items:
            if "network" in item.keywords:
                item.add_marker(skip)
