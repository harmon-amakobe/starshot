# SPDX-License-Identifier: Apache-2.0
"""EMRAT, the Earth-Moon mass ratio, from DE440's own GMs and nowhere else."""

import json
import re
from pathlib import Path

from ephem import emrat, gm_values

ROOT = Path(__file__).resolve().parents[3]
# JPL's published value: EMRAT in the DE440 header, group 1041,
# https://ssd.jpl.nasa.gov/ftp/eph/planets/ascii/de440/header.440
# (read 2026-11-05: "EMRAT ... 0.813005682214972154D+02").
DE440_EMRAT = 0.813005682214972154e02
# The two lines of NAIF's gm_de440.tpc that emrat() reads (MD5 pinned in kernel.py),
# https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc, then a decoy in a
# comment block that would overwrite the real value if a parser read outside the data.
GM_EXCERPT = """KPL/PCK
\\begindata
     BODY301_GM     = ( 4.9028001184575496D+03 )
     BODY399_GM     = ( 3.9860043550702266D+05 )
\\begintext
     BODY399_GM     = ( 1.0D+00 )
"""


def test_emrat_equals_the_ratio_jpl_publishes_for_de440(tmp_path):
    (tmp_path / "gm_de440.tpc").write_text(GM_EXCERPT, encoding="ascii")
    assert abs(emrat(tmp_path / "gm_de440.tpc") / DE440_EMRAT - 1) < 1e-9
    assert gm_values(GM_EXCERPT) == {"BODY301_GM": 4902.8001184575496, "BODY399_GM": 398600.43550702266}


def test_the_committed_pack_records_that_emrat():
    constants = json.loads((ROOT / "data/ephem/de440s-100km/pack.json").read_text(encoding="utf-8"))["constants"]
    assert abs(constants["emrat"] / DE440_EMRAT - 1) < 1e-9
    assert (constants["source"]["file"], constants["source"]["md5"]) == ("gm_de440.tpc", "a6bb37afab6815c9573a3ec208a8199a")


def test_the_repository_gms_agree_to_five_decimals():
    # Earth alone (launch.ts) and the Earth-Moon system (bodies.ts), read from the
    # TypeScript sources so a change there is seen here: EMRAT = Earth / (system - Earth).
    launch = (ROOT / "packages/physics/src/launch.ts").read_text(encoding="utf-8")
    bodies = (ROOT / "packages/ephemeris/src/bodies.ts").read_text(encoding="utf-8")
    earth = float(re.search(r"export const EARTH_GM = ([0-9.]+);", launch).group(1))
    system = float(re.search(r'earth: \{ id: "earth",[^}]*?gm: ([0-9.]+)', bodies).group(1))
    assert (earth, system) == (398600.435507, 403503.235502)
    assert round(earth / (system - earth), 5) == round(DE440_EMRAT, 5) == 81.30057
