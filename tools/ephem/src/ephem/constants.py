# SPDX-License-Identifier: Apache-2.0
"""Constants taken from DE440's own published values rather than typed in by hand."""

from __future__ import annotations

import re
from pathlib import Path

from .kernel import ensure_gm_kernel, file_md5

DEFAULT_GM_KERNEL = Path(__file__).resolve().parents[2] / ".cache" / "gm_de440.tpc"
_ASSIGN = re.compile(r"\b(BODY\d+_GM)\s*=\s*\(\s*([-+0-9.EeDd]+)\s*\)")


def gm_values(text: str) -> dict[str, float]:
    """BODYnnn_GM values (km^3/s^2) from the data blocks of a NAIF text kernel. Only
    text between \\begindata and \\begintext counts, as in SPICE, so a value quoted in
    a comment is never read; NAIF writes Fortran D exponents as well as E ones."""
    values, in_data = {}, False
    for line in text.splitlines():
        if line.strip() in ("\\begindata", "\\begintext"):
            in_data = line.strip() == "\\begindata"
        elif in_data:
            values.update((k, float(v.upper().replace("D", "E"))) for k, v in _ASSIGN.findall(line))
    return values


def emrat(gm_kernel: Path | None = None) -> float:
    """The Earth-Moon mass ratio from DE440's GMs, BODY399_GM / BODY301_GM. With no
    argument, NAIF's gm_de440.tpc is fetched into tools/ephem/.cache once and
    MD5-checked; a path given here is read as it is."""
    path = Path(gm_kernel) if gm_kernel is not None else ensure_gm_kernel(DEFAULT_GM_KERNEL)
    gm = gm_values(path.read_text(encoding="ascii"))
    if not {"BODY399_GM", "BODY301_GM"} <= gm.keys():
        raise KeyError(f"{path} lacks BODY399_GM or BODY301_GM in its data blocks")
    return gm["BODY399_GM"] / gm["BODY301_GM"]


def pack_constants(gm_kernel: Path) -> dict:
    """pack.json's `constants`: EMRAT and the GM kernel it came from, by its own MD5."""
    source = {"kind": "pck", "file": Path(gm_kernel).name, "md5": file_md5(gm_kernel), "producer": "NASA/JPL"}
    return {"emrat": emrat(gm_kernel), "source": {**source, "emrat": "BODY399_GM / BODY301_GM"}}
