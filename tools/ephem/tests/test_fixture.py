# SPDX-License-Identifier: Apache-2.0
"""The committed Horizons fixture is complete and says where its numbers came from."""

import json
import math
from pathlib import Path

from ephem import EPOCHS_JD_TDB, SERIES, TARGETS
from ephem.cli import _parser

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = json.loads((ROOT / "fixtures/horizons/horizons.json").read_text(encoding="utf-8"))


def test_the_fixtures_command_writes_this_file_by_default():
    assert _parser().parse_args(["fixtures"]).out == ROOT / "fixtures" / "horizons" / "horizons.json"


def test_every_series_is_present_at_the_five_epochs():
    assert FIXTURE["targets"] == TARGETS and set(FIXTURE["states"]) == set(TARGETS)
    for section, name, _command, _center in SERIES:
        rows = FIXTURE[section][name]
        assert [row["jdTdb"] for row in rows] == EPOCHS_JD_TDB, f"{section}.{name}"
        assert all(len(row["r"]) == 3 and len(row["v"]) == 3 for row in rows)


def test_the_fixture_records_what_horizons_said_about_itself():
    assert FIXTURE["api_signature"] and FIXTURE["ephemeris_source"] and FIXTURE["fetched_utc"].endswith("Z")
    asked = {q["series"]: q for q in FIXTURE["queries"]}
    assert set(asked) == {f"{section}.{name}" for section, name, _c, _z in SERIES}
    for section, name, command, center in SERIES:
        q = asked[f"{section}.{name}"]
        assert (q["command"], q["center"]) == (command, center)
        assert (q["api_signature"], q["ephemeris_source"]) == (FIXTURE["api_signature"], FIXTURE["ephemeris_source"])
        # The parameters that give the states their meaning (the old fixture script's).
        for param in ("REF_PLANE=%27ECLIPTIC%27", "REF_SYSTEM=%27ICRF%27", "OUT_UNITS=%27KM-S%27", "TIME_TYPE=%27TDB%27"):
            assert param in q["query"], f"{section}.{name} lacks {param}"


def test_moon_and_earth_centre_are_physically_sane():
    # The Moon stays 356,000 to 407,000 km from Earth, and Earth's centre sits that
    # distance over 1 + EMRAT (about 82.3) from the Earth-Moon barycentre.
    rows = zip(FIXTURE["geocentric"]["moon"], FIXTURE["states"]["earth"], FIXTURE["heliocentric_extra"]["earth"], strict=True)
    for moon, emb, earth in rows:
        moon_km = math.dist(moon["r"], [0, 0, 0])
        assert 356_000 < moon_km < 407_000
        assert abs(math.dist(emb["r"], earth["r"]) - moon_km / 82.3005682) < 1.0
