# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Harmon Amakobe and Starshot contributors
"""Offline checks of the fixed astlo against NASA/JPL Horizons (standard library unittest).

This test is Starshot's own code (MIT). It imports astlo (Mark Macharia's code with
Starshot's fixes, python/astlo/README.md), freezes the wall clock that astlo reads, and
compares its answers with python/astlo/tests/fixtures/horizons.json, which
python/astlo/bench/fetch_fixtures.py fetched once from Horizons. No network is used.

Budgets come from python/astlo/VERIFICATION.md ("Budgets used by the test"): a margin of
30% or more over the worst value measured for the fixed build, and far below the errors
of the build as published (Earth 24 degrees, Venus 33, Ceres 87).

Run it against the installed wheel, from the repository root:

    python -I -m unittest discover -s python/astlo/tests -v

or against the source tree without installing (astlo's dependencies still needed):

    ASTLO_SRC=python/astlo python -m unittest discover -s python/astlo/tests -v
"""
from __future__ import annotations

import contextlib
import io
import json
import math
import os
import pathlib
import subprocess
import sys
import unittest
import warnings
from unittest import mock

HERE = pathlib.Path(__file__).resolve().parent
FIXTURE = json.loads((HERE / "fixtures" / "horizons.json").read_text(encoding="utf-8"))
FREEZE = float(FIXTURE["freeze_unix"])  # 2026-10-31T21:00:00Z, the instant VERIFICATION.md uses
SRC = os.environ.get("ASTLO_SRC")
if SRC:
    sys.path.insert(0, str(pathlib.Path(SRC).resolve()))

# Heliocentric direction budgets, arcminutes, at every fixture epoch (1986 to 2029).
BUDGET_ARCMIN = {
    "MERCURY": 1.5, "VENUS": 1.0, "EARTH": 1.0, "MARS": 2.5,
    "JUPITER": 8.0, "SATURN": 12.0, "URANUS": 2.0, "NEPTUNE": 1.5,
    "PLUTO": 6.0, "HAUMEA": 6.0, "MAKEMAKE": 8.0, "ERIS": 2.0,
    "CERES": 180.0, "VESTA": 150.0, "PALLAS": 600.0, "HYGIEA": 840.0,
}
# Main-belt asteroids drift away from their 2026 osculating elements over decades
# (Jupiter changes their mean motion), so they get a tighter budget near 2026.
NEAR_EPOCH_DAYS = 3 * 365.25
NEAR_BUDGET_ARCMIN = {"CERES": 15.0, "VESTA": 15.0, "PALLAS": 15.0, "HYGIEA": 15.0}
MOON_BUDGET_DEG = 3.0       # measured: worst 2.32 deg over a month (published build: 116 deg)
SKY_BUDGET_DEG = 0.1        # measured: worst 0.055 deg (published build: 1.4 to 26 deg)
RK4_SUN_BUDGET_KM = 1500.0  # measured: 545 km, the Sun/SSB model error (published build: Sun X = -0.22 m)


def angle_arcmin(a, b) -> float:
    dot = sum(x * y for x, y in zip(a, b)) / (math.hypot(*a) * math.hypot(*b))
    return math.degrees(math.acos(max(-1.0, min(1.0, dot)))) * 60.0


def sky_separation_deg(az1, el1, az2, el2) -> float:
    a1, e1, a2, e2 = map(math.radians, (az1, el1, az2, el2))
    c = math.sin(e1) * math.sin(e2) + math.cos(e1) * math.cos(e2) * math.cos(a1 - a2)
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


@contextlib.contextmanager
def frozen_and_quiet():
    """Freeze the clock astlo reads (it calls time.time() for "now") and swallow its prints."""
    with mock.patch("time.time", return_value=FREEZE), contextlib.redirect_stdout(io.StringIO()):
        yield


astlo = None
contin = None


def setUpModule():
    global astlo, contin
    with frozen_and_quiet():
        import astlo as _astlo  # noqa: PLC0415 (imported here so ASTLO_SRC applies first)
        astlo = _astlo
        contin = astlo.Contin()


class HeliocentricDirections(unittest.TestCase):
    """Patch 'data' (consistent J2000 elements): direction seen from the Sun, 16 bodies."""

    def test_directions_within_budget(self):
        epochs = FIXTURE["epochs"]
        refs = FIXTURE["helio"]["r"]
        self.assertEqual(sorted(refs), sorted(BUDGET_ARCMIN))
        for body, budget in BUDGET_ARCMIN.items():
            for i, epoch in enumerate(epochs):
                with self.subTest(body=body, epoch=epoch["label"]):
                    with frozen_and_quiet():
                        r = contin.barycentric(body, epoch["days"]) if epoch["days"] else contin.barycentric(body)
                    est = [r["X_helio"] / 1000.0, r["Y_helio"] / 1000.0, r["Z_helio"] / 1000.0]
                    err = angle_arcmin(est, refs[body][i])
                    limit = budget
                    if abs(epoch["days"]) <= NEAR_EPOCH_DAYS:
                        limit = NEAR_BUDGET_ARCMIN.get(body, budget)
                    self.assertLessEqual(err, limit, f"{body} at {epoch['label']}: {err:.2f}' > {limit}'")

    def test_distances_within_one_percent_for_planets(self):
        # The published build already had good distances; keep them while fixing directions.
        refs = FIXTURE["helio"]["r"]
        for body in ("MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE"):
            with self.subTest(body=body):
                with frozen_and_quiet():
                    r = contin.barycentric(body)
                est = math.hypot(r["X_helio"], r["Y_helio"], r["Z_helio"]) / 1000.0
                ref = math.hypot(*refs[body][0])
                self.assertLess(abs(est / ref - 1.0), 0.01, f"{body}: {est:.0f} km vs {ref:.0f} km")


class Moon(unittest.TestCase):
    """Patches 'moon' (radians, a*(cos E - e), moving node/perigee): geocentric direction."""

    def test_direction_over_a_month(self):
        for days, ref in zip(FIXTURE["moon"]["days"], FIXTURE["moon"]["r"]):
            with self.subTest(days=days):
                with frozen_and_quiet():
                    r = contin.lunars("EARTH", days if days else None)
                est = [r["X"] / 1000.0, r["Y"] / 1000.0, r["Z"] / 1000.0]
                err = angle_arcmin(est, ref) / 60.0
                self.assertLessEqual(err, MOON_BUDGET_DEG, f"Moon at +{days} d: {err:.2f} deg")


class RungeKutta(unittest.TestCase):
    """Patch 'rk4': one-hour step in seconds, the Sun's X kept, v_Z used for velk4Z."""

    def test_sun_x_is_a_position_not_a_velocity(self):
        with frozen_and_quiet():
            r = contin.rungekutta()
        self.assertAlmostEqual(float(r["delta_t"]), 3600.0, places=6)
        sun = [x / 1000.0 for x in r["new_pos_vectors"][0]]
        ref = FIXTURE["sun_ssb_plus_1h"]["r"]
        self.assertGreater(abs(sun[0]), 10_000.0, f"Sun X is {sun[0] * 1000:.3f} m, i.e. about 0")
        err = math.dist(sun, ref)
        self.assertLess(err, RK4_SUN_BUDGET_KM, f"Sun after one RK4 step is {err:.0f} km from JPL")


class SkyFromNairobi(unittest.TestCase):
    """Patches 'topocentric': ecliptic to equatorial, precession, GMST at the requested time."""

    def test_azimuth_elevation(self):
        site = FIXTURE["sky"]["site"]
        with frozen_and_quiet():
            tp = astlo.Topocentric()
        for body, ref in FIXTURE["sky"]["bodies"].items():
            with self.subTest(body=body):
                with frozen_and_quiet():
                    r = tp.topo(body, site["lat"], site["lon"], site["alt_km"] * 1000.0)
                sep = sky_separation_deg(float(r["azimuth_deg"]), float(r["elevation_deg"]), ref["az_deg"], ref["el_deg"])
                self.assertLessEqual(sep, SKY_BUDGET_DEG, f"{body}: {sep:.3f} deg from JPL")


class LibraryBehaviour(unittest.TestCase):
    """Patches 'errors' and 'packaging'."""

    def assert_value_error(self, fn, *args):
        try:
            with frozen_and_quiet():
                fn(*args)
        except SystemExit as e:  # what the published build did: it ended the caller's process
            self.fail(f"{fn.__name__}{args} raised SystemExit({e.code}) instead of ValueError")
        except ValueError:
            return
        self.fail(f"{fn.__name__}{args} returned instead of raising ValueError")

    def test_unknown_body_raises_value_error(self):
        for name in ("APOPHIS", "HALLEY"):
            with self.subTest(name=name):
                self.assert_value_error(contin.barycentric, name)
        self.assert_value_error(contin.orbits, "APOPHIS")

    def test_import_prints_nothing_and_uses_agg_without_a_display(self):
        env = {k: v for k, v in os.environ.items() if k not in ("MPLBACKEND", "DISPLAY", "WAYLAND_DISPLAY")}
        code = "import astlo, matplotlib, sys; sys.stdout.write('BACKEND=' + matplotlib.get_backend().lower())"
        if SRC:
            code = f"import sys; sys.path.insert(0, {str(pathlib.Path(SRC).resolve())!r}); " + code
        out = subprocess.run([sys.executable, "-I", "-B", "-c", code], capture_output=True, text=True, env=env, timeout=300)
        self.assertEqual(out.returncode, 0, out.stderr[-2000:])
        self.assertEqual(out.stdout, "BACKEND=agg", "import astlo printed something, or did not pick Agg")
        self.assertNotIn("TkAgg", out.stderr)

    def test_sources_compile_without_syntax_warnings(self):
        files = sorted(pathlib.Path(astlo.__file__).resolve().parent.glob("*.py"))
        self.assertGreater(len(files), 10)
        for path in files:
            with self.subTest(file=path.name), warnings.catch_warnings():
                warnings.simplefilter("error")  # turns SyntaxWarning (e.g. an invalid '\#' escape) into an error
                compile(path.read_text(encoding="utf-8"), str(path), "exec")

    def test_metadata_requires_python_312(self):
        if SRC:
            self.skipTest("testing a source tree; no installed metadata")
        from importlib import metadata

        self.assertEqual(metadata.metadata("astlo")["Requires-Python"], ">=3.12")


if __name__ == "__main__":
    unittest.main()
