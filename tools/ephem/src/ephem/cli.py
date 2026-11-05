# SPDX-License-Identifier: Apache-2.0
"""starshot-ephem: a thin command line over the package's public functions."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import BODIES, KernelSource, ensure_gm_kernel, ensure_kernel, generate, pack_constants
from . import conformance_text, rails_conformance, read_pack, validate, write_horizons_fixture, write_pack, write_report
from .fixtures import DEFAULT_CACHE, DEFAULT_FIXTURE, ROOT


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="starshot-ephem", description="Starshot's ephemeris tool (D17).")
    sub = p.add_subparsers(dest="command", required=True)
    f = sub.add_parser("fixtures", help="write the Horizons test fixture")
    f.add_argument("--out", type=Path, default=DEFAULT_FIXTURE, help="default: fixtures/horizons/horizons.json")
    f.add_argument("--cache", type=Path, default=DEFAULT_CACHE, help="Horizons answer cache")
    k = sub.add_parser("kernel", help="download and MD5-check de440s.bsp and gm_de440.tpc")
    k.add_argument("--path", type=Path, required=True, help="where de440s.bsp lives")
    b = sub.add_parser("build", help="fit the rails pack from the kernel")
    for flag, kind in (("--kernel", Path), ("--from-year", int), ("--to-year", int), ("--out", Path)):
        b.add_argument(flag, type=kind, required=True)
    b.add_argument("--tolerance-km", type=float, default=100.0)
    v = sub.add_parser("validate", help="check a pack against the kernel every 5 days")
    for flag in ("--kernel", "--pack"):
        v.add_argument(flag, type=Path, required=True)
    v.add_argument("--out", type=Path, help="where the reports go (default: the pack)")
    c = sub.add_parser("conformance", help="write the rails oracle the Rust reader is tested against")
    c.add_argument("--pack", type=Path, required=True)
    c.add_argument("--out", type=Path, default=ROOT / "fixtures" / "conformance" / "rails.json")
    return p


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "fixtures":
        write_horizons_fixture(args.out, cache_dir=args.cache)
        print(f"wrote {args.out}")
    elif args.command == "kernel":
        # The GM kernel sits beside the SPK, so one cache holds both.
        print(ensure_kernel(args.path), ensure_gm_kernel(args.path.parent / "gm_de440.tpc"))
    elif args.command == "build":
        kernel = ensure_kernel(args.kernel)
        constants = pack_constants(ensure_gm_kernel(kernel.parent / "gm_de440.tpc"))
        pack = generate(KernelSource(kernel), list(BODIES), (args.from_year, args.to_year), args.tolerance_km, constants=constants)
        write_pack(pack, args.out)
        print(f"wrote {len(pack.decades)} decade files and pack.json to {args.out}")
    elif args.command == "validate":
        report = validate(read_pack(args.pack), KernelSource(ensure_kernel(args.kernel)))
        write_report(report, args.out or args.pack)
        for r in report.records:
            print(f"{r['subject']['body']:8} max {r['metrics']['max_position_km']:9.3f} km  {'pass' if r['pass'] else 'FAIL'}")
        if not report.passed:
            print("validate: a body is over its budget", file=sys.stderr)
            return 1
    elif args.command == "conformance":
        data = rails_conformance(read_pack(args.pack))
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(conformance_text(data), encoding="utf-8")
        print(f"wrote {len(data['points'])} points to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
