# Notices

This file explains who owns what in this repository. The licence text itself is in
[LICENSE](LICENSE).

## Starshot's own code: MIT

Everything in this repository is Starshot's own work, released under the
[MIT licence](LICENSE) (decision D3 in [docs/decisions.md](docs/decisions.md)),
**except** Mark Macharia's astlo code, in the two places listed in the next sections.

That includes the game (`apps/`), the packages (`packages/`), the tools (`tools/`), the
scripts (`scripts/`), the documentation (`docs/` and the files at the top level), the
agent configuration (`.claude/`, `.github/`, `AGENTS.md`, `CLAUDE.md`), and Starshot's
own files in `python/astlo/`: its README, `VERIFICATION.md`, `build_wheel.py`, `bench/`
and `tests/`.

## `third_party/astlo/`: not covered by the MIT licence

`third_party/astlo/**` is **astlo**, copyright (c) Mark Macharia
([@iamnothimbutwe](https://github.com/iamnothimbutwe)). **All rights reserved.**

- It is here only because this repository is a GitHub fork of
  [iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic). Mark's
  original files were moved into that folder, **unmodified** (decision D1).
- Starshot's MIT licence does **not** apply to those files. Their terms are Mark's own;
  see `third_party/astlo/LICENSE` and the notices inside his files. In short, copying,
  modification and distribution need his written permission.
- Starshot never modifies those files, never copies them into its own code, and never
  relicenses them (decision D2; the copy in `python/astlo/`, below, stays under Mark's
  terms). An automated check pins their exact bytes
  (`third_party/astlo.sha256`, checked by `scripts/check-third-party-untouched.mjs`).
- Starshot does not use astlo's code or data at run time.

## `python/astlo/astlo/` and its `.dist-info/`: Mark's code with Starshot's fixes

`python/astlo/astlo/` and `python/astlo/astlo-*.dist-info/` are also **astlo**,
copyright (c) Mark Macharia. **All rights reserved. Not covered by the MIT licence.**

- They hold the source and metadata of his published astlo v12 wheel, imported
  unmodified, followed by Starshot's fixes, each one a separate, reviewable commit
  (decision D10). His copyright notices stay exactly as he wrote them, and his licence
  file is in `python/astlo/astlo-*.dist-info/licenses/LICENSE`.
- They are shared here in good faith, **pending Mark's written permission**. The owner
  of this repository plans to show him the fixes once Starshot is finished; they have
  not been sent to him yet. If Mark objects, `python/astlo/` is removed.
- The wheel that CI builds from them (the `astlo-fixed-wheel` workflow artifact,
  version `12.5.5130000+starshot.1`, whose description opens by saying it is a
  Starshot-patched build and not an official astlo release) is astlo too, under the
  same terms.
- Starshot's game and packages do not copy, import or depend on this code.
- `third_party/astlo/` (above) is unchanged: it stays the exact upstream reference.

## NASA/JPL data

- Planet positions come from NASA/JPL's
  [Keplerian Elements for Approximate Positions of the Major Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
  (E. M. Standish, Table 1, valid 1800 to 2050).
- The reference positions used by the tests come from NASA/JPL's
  [Horizons](https://ssd.jpl.nasa.gov/horizons/) system, fetched with
  `tools/horizons/fetch_fixtures.py` (Starshot's packages) and
  `python/astlo/bench/fetch_fixtures.py` (the astlo fixes' test).

We thank the Solar System Dynamics group at JPL for making this data freely available.

## No endorsement

Starshot is an independent fan project. It is not affiliated with, sponsored by or
endorsed by NASA, JPL, Caltech, or Mark Macharia and astlo. Names of real missions and
organisations appear only to describe real history (for example, Voyager 2's 1977
launch).
