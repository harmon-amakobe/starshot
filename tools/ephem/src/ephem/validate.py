# SPDX-License-Identifier: Apache-2.0
"""validate(): compare a pack with a reference and report each body as ephem.validation/1.

The reference is a position source, sampled every 432,000 s (5 days) over each body's
coverage, or a Horizons fixture, sampled at its epochs. `pass` is computed from the
metrics against the budget; trust it only beside the numbers (docs/astlo/directions.md).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from importlib.metadata import version
from pathlib import Path

import numpy as np

from .generate import PositionSource
from .pack import Pack

STEP_S = 432000.0
BUDGET_KM = 150.0


@dataclass(frozen=True)
class HorizonsFixture:
    """A fixture from write_horizons_fixture as a reference, at the epochs it lists."""

    data: dict

    @classmethod
    def from_file(cls, path: Path) -> HorizonsFixture:
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    def samples(self, body: str) -> tuple[np.ndarray, np.ndarray]:
        # The fixture keeps Table 1's names: "earth" is the Earth-Moon barycentre.
        group, name = {"EMB": ("states", "earth"), "MOON": ("geocentric", "moon")}.get(body, ("states", body.lower()))
        rows = self.data[group][name]
        ets = np.array([(row["jdTdb"] - 2451545.0) * 86400.0 for row in rows])
        return ets, np.array([row["r"] for row in rows], dtype=np.float64).T


Reference = PositionSource | HorizonsFixture


@dataclass(frozen=True)
class Report:
    records: list[dict]
    pack: dict  # what VALIDATION.md says about the pack: id, files, bytes, body fits

    @property
    def passed(self) -> bool:
        return all(r["pass"] for r in self.records)


def _samples(body: dict, reference: Reference, step_s: float, edges: list[float]):
    if isinstance(reference, HorizonsFixture):
        ets, ref = reference.samples(body["id"])
        sampling = {"from_et": float(ets[0]), "to_et": float(ets[-1]), "step_s": None, "points": int(ets.size)}
        d = reference.data
        about = {"name": "JPL Horizons", "via": "Horizons API", "api_signature": d.get("api_signature"), "ephemeris_source": d.get("ephemeris_source")}
        return ets, ref, sampling, about
    lo, hi = body["coverage_et"]
    # The 5-day grid misses the end and most decade edges, where segments and files change.
    ets = np.unique(np.concatenate([lo + step_s * np.arange(int(np.floor((hi - lo) / step_s)) + 1), edges, [hi]]))
    sampling = {"from_et": lo, "to_et": hi, "step_s": step_s, "points": int(ets.size)}
    src = getattr(reference, "source", {})
    about = {"name": "position source", "via": "function", "api_signature": None, "ephemeris_source": None}
    if src.get("kind") == "spk":
        about |= {"name": "JPL DE440", "via": "local kernel", "ephemeris_source": f"{src['file']} (MD5 {src['md5']})"}
    return ets, reference.position(body["naif_id"], body["center_naif_id"], ets), sampling, about


def validate(pack: Pack, reference: Reference, *, step_s: float = STEP_S, budget_km: float = BUDGET_KM) -> Report:
    """One ephem.validation/1 record per pack body; `pass` is max_position_km <= budget."""
    records = []
    for body in pack.manifest["bodies"]:
        ets, ref, sampling, about = _samples(body, reference, step_s, [e["from_et"] for e in pack.manifest["decades"]])
        got = pack.position(body["id"], ets)
        err = np.linalg.norm(got - ref, axis=0)
        angle = np.arctan2(np.linalg.norm(np.cross(got.T, ref.T), axis=1), np.sum(got * ref, axis=0))
        metrics = {
            "max_position_km": round(float(err.max()), 3),
            "max_direction_arcmin": round(float(np.degrees(angle.max()) * 60.0), 6),
            "rms_position_km": round(float(np.sqrt(np.mean(err**2))), 3),
        }
        records.append(
            {
                "schema": "ephem.validation/1",
                "subject": {"pack": pack.manifest["id"], "body": body["id"], "producer": f"starshot tools/ephem {version('starshot-ephem')}"},
                "reference": about,
                "sampling": sampling,
                "metrics": metrics,
                "budget": {"max_position_km": budget_km},
                "pass": bool(metrics["max_position_km"] <= budget_km),  # a NaN fails
            }
        )
    decades = pack.manifest["decades"]
    fits = {b["id"]: {"center": b["center"], **b["encoding"]} for b in pack.manifest["bodies"]}
    return Report(records, {"id": pack.manifest["id"], "files": len(decades), "bytes": sum(e["bytes"] for e in decades), "bodies": fits})


def write_report(report: Report, out_dir: Path) -> None:
    """validation/<BODY>.json for every record, and VALIDATION.md beside them."""
    out, p = Path(out_dir), report.pack
    (out / "validation").mkdir(parents=True, exist_ok=True)
    for r in report.records:
        (out / "validation" / f"{r['subject']['body']}.json").write_text(json.dumps(r, indent=2) + "\n", encoding="utf-8")
    first = report.records[0]
    s, ref = first["sampling"], first["reference"]
    step = f", every {s['step_s']:,.0f} s plus each decade edge and the end" if s["step_s"] else ""
    lines = [
        "# Validation of the rails pack\n\nWritten by `starshot-ephem validate`. Do not edit it by hand; rerun the command.\n",
        f"- Pack: `{p['id']}`, {p['files']} decade files, {p['bytes']:,} bytes in total.",
        f"- Reference: {ref['name']} through the {ref['via']}" + (f", {ref['ephemeris_source']}." if ref["ephemeris_source"] else "."),
        f"- Sampling: ET {s['from_et']:.0f} to {s['to_et']:.0f}{step}, {s['points']:,} points per body.",
        f"- Budget: {first['budget']['max_position_km']:g} km for every body. Pass means the largest position error is within it.\n",
        "| Body | Centre | Segment (days) | Degree | Max position (km) | RMS position (km) | Max direction (arcmin) | Pass |",
        "|---|---|---:|---:|---:|---:|---:|---|",
    ]
    for r in report.records:
        b, m = p["bodies"][r["subject"]["body"]], r["metrics"]
        cells = [r["subject"]["body"], b["center"], f"{b['segment_s'] / 86400:g}", b["degree"], f"{m['max_position_km']:.3f}"]
        cells += [f"{m['rms_position_km']:.3f}", f"{m['max_direction_arcmin']:.6f}", "pass" if r["pass"] else "FAIL"]
        lines.append("| " + " | ".join(map(str, cells)) + " |")
    (out / "VALIDATION.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
