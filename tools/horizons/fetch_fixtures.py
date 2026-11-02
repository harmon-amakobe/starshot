#!/usr/bin/env python3
"""Fetch reference state vectors from NASA/JPL Horizons for Starshot's tests.

Writes packages/ephemeris/test/fixtures/horizons.json with heliocentric
(center 500@10) state vectors in the ecliptic-and-equinox-of-J2000 frame,
km and km/s, at fixed TDB epochs. Uses only the Python standard library so it
runs anywhere (including Termux). Re-run only when you change the epoch list.

    python3 tools/horizons/fetch_fixtures.py
"""
from __future__ import annotations

import json
import pathlib
import urllib.parse
import urllib.request

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
# Horizons IDs. Earth uses the Earth-Moon barycenter (3) and the giant planets
# their system barycenters (5..8), because that is what JPL's approximate
# elements describe.
TARGETS = {
    "mercury": "199",
    "venus": "299",
    "earth": "3",
    "mars": "4",
    "jupiter": "5",
    "saturn": "6",
    "uranus": "7",
    "neptune": "8",
}
# Julian dates (TDB): Voyager 2 launch day, J2000, 2026-10-31, 2040-01-01, 2050-01-01
EPOCHS_JD_TDB = [2443375.5, 2451545.0, 2461344.5, 2466154.5, 2469807.5]

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "packages/ephemeris/test/fixtures/horizons.json"


def fetch(command: str) -> list[dict]:
    params = {
        "format": "json",
        "COMMAND": f"'{command}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'VECTORS'",
        "CENTER": "'500@10'",
        "REF_PLANE": "'ECLIPTIC'",
        "REF_SYSTEM": "'ICRF'",
        "VEC_TABLE": "'2'",
        "OUT_UNITS": "'KM-S'",
        "CSV_FORMAT": "'YES'",
        "TIME_TYPE": "'TDB'",
        "TLIST_TYPE": "'JD'",
        "TLIST": "'" + " ".join(f"{jd:.1f}" for jd in EPOCHS_JD_TDB) + "'",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=60) as resp:
        result = json.load(resp)["result"]
    rows = result.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines()
    out = []
    for row in rows:
        cells = [c.strip() for c in row.split(",")]
        out.append(
            {
                "jdTdb": float(cells[0]),
                "r": [float(cells[2]), float(cells[3]), float(cells[4])],
                "v": [float(cells[5]), float(cells[6]), float(cells[7])],
            }
        )
    return sorted(out, key=lambda s: s["jdTdb"])


def main() -> None:
    data = {
        "source": "NASA/JPL Horizons API (https://ssd.jpl.nasa.gov/horizons/)",
        "frame": "heliocentric, ecliptic and mean equinox of J2000",
        "units": {"r": "km", "v": "km/s", "time": "JD (TDB)"},
        "targets": TARGETS,
        "states": {name: fetch(cmd) for name, cmd in TARGETS.items()},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
