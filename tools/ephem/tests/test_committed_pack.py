# SPDX-License-Identifier: Apache-2.0
"""The committed DE440 rails pack: intact, validated, and still where JPL puts things.

These tests read committed files only, never the kernel or the network: the pack in
data/ephem is the source of truth (a rebuild elsewhere may differ in last bits).
"""

import hashlib
import json
from pathlib import Path

from ephem import HorizonsFixture, decade_start_et, read_pack, validate

ROOT = Path(__file__).resolve().parents[3]
PACK = ROOT / "data" / "ephem" / "de440s-100km"
BODIES = ["MERCURY", "VENUS", "EMB", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "MOON"]
MANIFEST = json.loads((PACK / "pack.json").read_text(encoding="utf-8"))


def test_pack_json_hashes_match_the_decade_files():
    assert [d["file"] for d in MANIFEST["decades"]] == [f"{y}.bin" for y in range(1950, 2150, 10)]
    for d in MANIFEST["decades"]:
        blob = (PACK / d["file"]).read_bytes()
        assert (len(blob), hashlib.sha256(blob).hexdigest()) == (d["bytes"], d["sha256"]), d["file"]
    read_pack(PACK)  # also checks every header and the shared build value


def test_every_report_passes_every_five_days_from_1950_to_2150():
    assert sorted(p.stem for p in (PACK / "validation").glob("*.json")) == sorted(BODIES)
    for body in BODIES:
        report = json.loads((PACK / "validation" / f"{body}.json").read_text(encoding="utf-8"))
        assert (report["schema"], report["subject"]["pack"], report["subject"]["body"]) == ("ephem.validation/1", MANIFEST["id"], body)
        assert (report["reference"]["name"], report["reference"]["via"]) == ("JPL DE440", "local kernel")
        s = report["sampling"]
        assert (s["from_et"], s["to_et"], s["step_s"], s["points"]) == (decade_start_et(1950), decade_start_et(2150), 432000.0, 14623)
        assert report["budget"]["max_position_km"] == 150.0
        assert report["metrics"]["max_position_km"] <= 150.0 and report["pass"] is True, body


def test_the_moon_and_the_sources_are_as_specified():
    moon = next(b for b in MANIFEST["bodies"] if b["id"] == "MOON")
    assert (moon["naif_id"], moon["center_naif_id"], moon["encoding"]["segment_s"], moon["encoding"]["degree"]) == (301, 399, 32 * 86400.0, 15)
    assert MANIFEST["generated"]["last_modifier"] == "Starshot"
    for body in MANIFEST["bodies"]:
        assert (body["source"]["file"], body["source"]["md5"]) == ("de440s.bsp", "3917ee56769db332790c751e2168843d")


def test_the_pack_agrees_with_horizons_at_the_fixture_epochs():
    # An independent check: Horizons (DE441 through the API) at five dates from 1977 to
    # 2049, against the same 150 km budget.
    report = validate(read_pack(PACK), HorizonsFixture.from_file(ROOT / "packages/ephemeris/test/fixtures/horizons.json"))
    assert [r["subject"]["body"] for r in report.records] == BODIES
    for r in report.records:
        assert r["sampling"]["points"] == 5 and r["metrics"]["max_position_km"] <= 150.0, r["subject"]["body"]
