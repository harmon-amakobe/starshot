#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""The Moon's geocentric direction error over a month (every 3 days), astlo vs Horizons.

Starshot's own code (Apache-2.0); it contains no astlo code. Run it with the Python of a
virtualenv where one astlo build is installed, from a scratch directory:

    <venv>/bin/python -I <repo>/python/astlo/bench/moon_series.py

The Horizons reference is fetched (and cached, see hz.py) before the clock is frozen.
ASTLO_SRC=<folder holding astlo/> tests a source tree instead of the installed build.
"""
import contextlib
import io
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I leaves the script dir off sys.path
import hz  # noqa: E402

FREEZE = 1793480400.0  # 2026-10-31T21:00:00Z
DAYS = [3.0 * k for k in range(10)]
ref = hz.vectors("301", "500@399", [FREEZE / 86400 + 2440587.5 + d for d in DAYS])

time.time = lambda: FREEZE  # astlo reads time.time() for "now"
if os.environ.get("ASTLO_SRC"):
    sys.path.insert(0, os.path.abspath(os.environ["ASTLO_SRC"]))
with contextlib.redirect_stdout(io.StringIO()):
    from astlo import Contin

    c = Contin()
    est = []
    for d in DAYS:
        r = c.lunars("EARTH", d if d else None)
        est.append([r["X"] / 1000, r["Y"] / 1000, r["Z"] / 1000])

errs = []
for e, r in zip(est, ref):
    dot = sum(a * b for a, b in zip(e, r[:3])) / (math.hypot(*e) * math.hypot(*r[:3]))
    errs.append(math.degrees(math.acos(max(-1.0, min(1.0, dot)))))
print(json.dumps({"days": DAYS, "ang_deg": [round(x, 3) for x in errs], "max": round(max(errs), 3),
                  "mean": round(sum(errs) / len(errs), 3),
                  "dist_err_km": [round(math.hypot(*e) - math.hypot(*r[:3])) for e, r in zip(est, ref)]}))
