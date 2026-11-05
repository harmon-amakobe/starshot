# SPDX-License-Identifier: Apache-2.0
"""fixtures/conformance/rails.json is what `starshot-ephem conformance` writes from the
committed pack, so the Rust reader is held to this tool's own evaluation (PR10)."""

import json
import struct
from pathlib import Path

from ephem import conformance_text, decade_start_et, rails_conformance, read_pack
from ephem.cli import _parser, main

ROOT = Path(__file__).resolve().parents[3]
PACK = ROOT / "data" / "ephem" / "de440s-100km"
COMMITTED = ROOT / "fixtures" / "conformance" / "rails.json"


def _et(bits: str) -> float:
    return struct.unpack(">d", bytes.fromhex(bits))[0]


def test_the_committed_file_is_the_commands_output():
    assert COMMITTED.read_text(encoding="utf-8") == conformance_text(rails_conformance(read_pack(PACK)))


def test_the_command_writes_the_same_bytes_and_defaults_to_the_committed_path(tmp_path):
    out = tmp_path / "r.json"
    assert main(["conformance", "--pack", str(PACK), "--out", str(out)]) == 0
    assert out.read_bytes() == COMMITTED.read_bytes()
    assert _parser().parse_args(["conformance", "--pack", "x"]).out == COMMITTED


def test_every_body_has_every_decade_edge_and_the_last_instant():
    data = json.loads(COMMITTED.read_text(encoding="utf-8"))
    edges = {decade_start_et(y) for y in range(1950, 2160, 10)}
    by_body: dict[str, set[float]] = {}
    for body, et, *_ in data["points"]:
        by_body.setdefault(body, set()).add(_et(et))
    assert sorted(by_body) == sorted(["MERCURY", "VENUS", "EMB", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "MOON"])
    for body, ets in by_body.items():
        assert edges <= ets, body
        assert len(ets) == (951 if body == "MOON" else 221), body
