#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Fetch the NASA/JPL Horizons reference data for python/astlo/tests (stdlib only).

Writes python/astlo/tests/fixtures/horizons.json, which test_against_jpl.py reads
offline. Run it once, commit the result, and re-run it only when the epochs, bodies
or sites below change; never hand-edit the JSON. It does not import astlo, and it
bypasses the bench cache so the fixture always reflects a fresh Horizons answer.

    python3 -I python/astlo/bench/fetch_fixtures.py        # about 20 requests, ~1 minute

The instants are the ones python/astlo/VERIFICATION.md uses: the wall clock frozen at
2026-10-31 21:00:00 UTC and astlo's day offsets to J2000, 1986-02-09 and 2029-04-13.
astlo counts time in UTC Unix seconds, so the queries use TIME_TYPE UT.
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))  # -I leaves the script dir off sys.path
import hz  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[1]  # python/astlo
OUT = ROOT / "tests" / "fixtures" / "horizons.json"

FREEZE_UNIX = 1793480400  # 2026-10-31T21:00:00Z
EPOCHS = [  # (label, astlo day offset from FREEZE_UNIX)
    ("2026-10-31 21:00 UTC (now)", 0.0),
    ("2000-01-01 12:00 UTC (J2000)", -9800.375),
    ("1986-02-09 00:00 UTC", -14874.875),
    ("2029-04-13 21:46 UTC", 895.0319444444444),
]
# Horizons IDs, as in VERIFICATION.md: Earth's centre (399) and Pluto's centre (999),
# planet centres for the rest; small bodies by record number (the trailing ';').
TARGETS = {
    "MERCURY": "199", "VENUS": "299", "EARTH": "399", "MARS": "499",
    "CERES": "1;", "VESTA": "4;", "PALLAS": "2;", "HYGIEA": "10;",
    "JUPITER": "599", "SATURN": "699", "URANUS": "799", "NEPTUNE": "899",
    "PLUTO": "999", "HAUMEA": "136108;", "MAKEMAKE": "136472;", "ERIS": "136199;",
}
MOON_DAYS = [3.0 * k for k in range(10)]  # every 3 days for a month, as in VERIFICATION.md
SITE = {"name": "Nairobi", "lat": -1.2921, "lon": 36.8219, "alt_km": 1.795}
SKY = {"SUN": "10", "VENUS": "299", "MARS": "499", "JUPITER": "599", "SATURN": "699", "URANUS": "799", "NEPTUNE": "899"}


def jd_ut(days: float) -> float:
    return (FREEZE_UNIX + days * 86400.0) / 86400.0 + 2440587.5


def main() -> None:
    jds = [jd_ut(d) for _, d in EPOCHS]

    def vec(cmd: str, center: str, when: list[float]) -> list[list[float]]:
        rows = hz.vectors(cmd, center, when, use_cache=False)
        return [[round(x, 6) for x in r[:3]] for r in rows]

    helio = {}
    for name, cmd in TARGETS.items():
        print(f"  {name:9} {cmd}", file=sys.stderr)
        helio[name] = vec(cmd, "500@10", jds)
    moon = vec("301", "500@399", [jd_ut(d) for d in MOON_DAYS])
    sun_ssb_plus_1h = vec("10", "500@0", [jd_ut(1 / 24)])[0]
    sky = {}
    for name, cmd in SKY.items():
        az, el = hz.observer_azel(cmd, jd_ut(0.0), SITE["lon"], SITE["lat"], SITE["alt_km"], use_cache=False)
        sky[name] = {"az_deg": round(az, 6), "el_deg": round(el, 6)}
    probe = hz.query_full({"COMMAND": "399", "MAKE_EPHEM": "NO"}, use_cache=False)
    signature = probe.get("signature") or {}

    data = {
        "source": "NASA/JPL Horizons API (https://ssd.jpl.nasa.gov/api/horizons.api)",
        "horizons_signature": signature,
        "fetched_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"),
        "fetched_by": "python/astlo/bench/fetch_fixtures.py",
        "freeze_unix": FREEZE_UNIX,
        "epochs": [{"label": label, "days": d, "jd_ut": jd} for (label, d), jd in zip(EPOCHS, jds)],
        "helio": {
            "frame": "Sun-centred (500@10), ecliptic and mean equinox of J2000 (ICRF), geometric",
            "units": "km",
            "targets": TARGETS,
            "r": helio,
        },
        "moon": {
            "frame": "Earth-centred (301 from 500@399), ecliptic J2000, geometric",
            "units": "km",
            "days": MOON_DAYS,
            "r": moon,
        },
        "sun_ssb_plus_1h": {
            "frame": "Sun (10) from the solar-system barycentre (500@0), ecliptic J2000, at now + 1 h",
            "units": "km",
            "r": sun_ssb_plus_1h,
        },
        "sky": {
            "what": "apparent, airless azimuth and elevation (QUANTITIES 4) at now",
            "site": SITE,
            "units": "degrees",
            "bodies": sky,
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=1)
    # one [x, y, z] vector per line keeps the file short and its diffs readable
    text = re.sub(r"\[\s+(-?[\d.eE+-]+),\s+(-?[\d.eE+-]+),\s+(-?[\d.eE+-]+)\s+\]", r"[\1, \2, \3]", text)
    OUT.write_text(text + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT.parents[1]).as_posix()}")


if __name__ == "__main__":
    main()
