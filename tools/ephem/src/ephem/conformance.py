# SPDX-License-Identifier: Apache-2.0
"""fixtures/conformance/rails.json: the committed pack evaluated by this tool, through
pack.read and chebyshev.evaluate, as the oracle the Rust reader is held to (PR10).

Every value is an f64 written as 16 hex digits of its bits, so no decimal round trip moves
a last bit. The points are all 9 bodies at every 73rd epoch of the 5-day validation grid,
at each decade file's first instant and at the pack's last, plus the Moon every 5 days
over the 2020 file. Each follows the pack's boundary rule: a decade or segment edge
belongs to what starts there, the pack's last instant to the last segment.
"""

from __future__ import annotations

import json
import struct

import numpy as np

from .pack import Pack
from .validate import STEP_S

SCHEMA = "starshot.conformance-rails/1"
GENERATOR = "uv run --project tools/ephem --locked starshot-ephem conformance --pack data/ephem/de440s-100km"
EVERY = 73
MOON_FILE = "2020.bin"


def _bits(x: float) -> str:
    return struct.pack(">d", float(x)).hex()


def rails_conformance(pack: Pack) -> dict:
    """The points and positions as a JSON-ready dict; no file I/O."""
    lo, hi = pack.coverage_et
    grid = lo + STEP_S * np.arange(int(np.floor((hi - lo) / STEP_S)) + 1)
    decades = pack.manifest["decades"]
    edges = np.array([d["from_et"] for d in decades] + [hi])
    common = np.unique(np.concatenate([grid[::EVERY], edges]))
    moon = next(d for d in decades if d["file"] == MOON_FILE)
    span = moon["to_et"] - moon["from_et"]
    moon_ets = moon["from_et"] + STEP_S * np.arange(int(np.floor(span / STEP_S)) + 1)
    moon_ets = moon_ets[moon_ets < moon["to_et"]]
    rows = []
    for body in (b["id"] for b in pack.manifest["bodies"]):
        ets = np.unique(np.concatenate([common, moon_ets])) if body == "MOON" else common
        xyz = pack.position(body, ets)
        rows += [[body, _bits(t), *(_bits(v) for v in xyz[:, i])] for i, t in enumerate(ets)]
    return {
        "schema": SCHEMA,
        "generator": GENERATOR,
        "pack": {"id": pack.manifest["id"], "build": pack.manifest["build"]},
        "columns": ["body", "et", "x", "y", "z"],
        "points": rows,
    }


def conformance_text(data: dict) -> str:
    """The file's text: one point per line, so a diff names the points that moved."""
    head = {k: v for k, v in data.items() if k != "points"}
    lines = [f"  {json.dumps(k)}: {json.dumps(v)}," for k, v in head.items()]
    points = ",\n".join(f"    {json.dumps(row, separators=(',', ':'))}" for row in data["points"])
    return "{\n" + "\n".join(lines) + '\n  "points": [\n' + points + "\n  ]\n}\n"
