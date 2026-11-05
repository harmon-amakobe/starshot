# SPDX-License-Identifier: Apache-2.0
"""generate() and validate() on an analytic source: the growth-path interface (D29).

The test uses only the two signatures, the body table type and the pack format, so
another producer of ephem.pack/1 could be put in their place.
"""

import struct

import numpy as np
import pytest

from ephem import BodySpec, FitError, Pack, generate, validate

# Circular, slightly inclined orbits: radius km, period days, phase rad.
ORBITS = {(1, 10): (5.79e7, 87.97, 0.3), (5, 10): (7.78e8, 4332.6, 1.1), (301, 399): (3.844e5, 27.32, 2.0)}
BODIES = [BodySpec("MERCURY", 1, 10, "SUN", 32, 12), BodySpec("JUPITER", 5, 10, "SUN", 512, 8), BodySpec("MOON", 301, 399, "EARTH", 32, 15)]


class CircularOrbits:
    def position(self, target, center, et):
        radius, period_days, phase = ORBITS[(target, center)]
        angle = phase + 2.0 * np.pi * np.asarray(et, dtype=float) / (period_days * 86400.0)
        return np.stack([radius * np.cos(angle), radius * np.sin(angle), 0.05 * radius * np.sin(angle)])


@pytest.fixture(scope="module")
def pack():
    return generate(CircularOrbits(), BODIES, (2000, 2020), 100.0)


def test_generate_then_validate_passes_within_the_tolerance(pack):
    assert (pack.manifest["schema"], list(pack.decades)) == ("ephem.pack/1", ["2000.bin", "2010.bin"])
    report = validate(pack, CircularOrbits())
    assert report.passed and [r["subject"]["body"] for r in report.records] == ["MERCURY", "JUPITER", "MOON"]
    for r in report.records:
        # 20 years every 5 days, both ends included, plus the 2010 edge the grid misses.
        assert (r["schema"], r["sampling"]["step_s"], r["sampling"]["points"]) == ("ephem.validation/1", 432000.0, 1463)
        assert r["metrics"]["max_position_km"] <= 100.0


def test_a_segment_over_the_tolerance_is_an_error_naming_it():
    with pytest.raises(FitError, match=r"MOON segment 0 of decade 2000"):
        generate(CircularOrbits(), [BodySpec("MOON", 301, 399, "EARTH", 32, 4)], (2000, 2010), 100.0)


def test_a_planted_coefficient_error_fails_validation(pack):
    blob = bytearray(pack.decades["2010.bin"])
    code, degree, _count, _seg, offset, _ = struct.unpack_from("<HHIdII", blob, 32 + 24 * 2)
    assert code == 301
    at = offset + 40 * (24 + 12 * degree)  # segment 40's c0 for x
    struct.pack_into("<d", blob, at, struct.unpack_from("<d", blob, at)[0] + 500.0)
    report = validate(Pack(pack.manifest, {**pack.decades, "2010.bin": bytes(blob)}), CircularOrbits())
    assert {r["subject"]["body"]: r["pass"] for r in report.records} == {"MERCURY": True, "JUPITER": True, "MOON": False}
    assert not report.passed
