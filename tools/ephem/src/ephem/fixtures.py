# SPDX-License-Identifier: Apache-2.0
"""The Horizons fixture that the TypeScript ephemeris tests read.

`states` keeps the shape and meaning the tests have always used: Horizons ids for the
planets (barycentres for the Earth-Moon system and the giants, as Table 1 describes
them), centre 500@10, ecliptic of J2000, at five TDB epochs. The fixture adds the
geocentric Moon and Earth's own centre, and records what Horizons said about itself.
"""

from __future__ import annotations

import json
from pathlib import Path

from .horizons import HorizonsError, fetch_vectors

DEFAULT_CACHE = Path(__file__).resolve().parents[2] / ".cache" / "horizons"
SUN, EARTH = "500@10", "500@399"
TARGETS = {"mercury": "199", "venus": "299", "earth": "3", "mars": "4", "jupiter": "5", "saturn": "6", "uranus": "7", "neptune": "8"}
# Julian dates (TDB): Voyager 2 launch day, J2000, 2026-10-31, 2040-01-01, 2050-01-01.
EPOCHS_JD_TDB = [2443375.5, 2451545.0, 2461344.5, 2466154.5, 2469807.5]
# Fixture section, entry, Horizons target, centre.
SERIES = [("states", name, cmd, SUN) for name, cmd in TARGETS.items()]
SERIES += [("geocentric", "moon", "301", EARTH), ("heliocentric_extra", "earth", "399", SUN)]


def write_horizons_fixture(out: Path, *, cache_dir: Path = DEFAULT_CACHE) -> dict:
    """Fetch (or read from the cache) every series and write the fixture to `out`."""
    data: dict = {
        "source": "NASA/JPL Horizons API (https://ssd.jpl.nasa.gov/horizons/)",
        "frame": "ecliptic and mean equinox of J2000",
        "centers": {"states": SUN, "geocentric": EARTH, "heliocentric_extra": SUN},
        "units": {"r": "km", "v": "km/s", "time": "JD (TDB)"},
        "targets": TARGETS,
    }
    queries = []
    for section, name, command, center in SERIES:
        answer = fetch_vectors(command, center, EPOCHS_JD_TDB, cache_dir=cache_dir)
        if [row["jdTdb"] for row in answer["rows"]] != EPOCHS_JD_TDB:
            raise HorizonsError(f"{section}.{name}: Horizons answered other epochs than the five asked for")
        data.setdefault(section, {})[name] = answer["rows"]
        keep = ("query", "fetched_utc", "api_signature", "ephemeris_source")
        queries.append({"series": f"{section}.{name}", "command": command, "center": center, **{k: answer[k] for k in keep}})
    data["fetched_utc"] = max(q["fetched_utc"] for q in queries)
    for key in ("api_signature", "ephemeris_source"):
        # One fixture, one Horizons: answers from two versions would mix two references.
        values = {q[key] for q in queries}
        if len(values) != 1:
            raise HorizonsError(f"the answers disagree on {key} ({sorted(map(str, values))}); clear the cache and fetch again")
        data[key] = values.pop()
    data["queries"] = queries
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
    return data
