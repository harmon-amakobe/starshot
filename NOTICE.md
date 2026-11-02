# Notices

This file explains who owns what in this repository. Starshot's licence text is in
[LICENSE](LICENSE), and [REUSE.toml](REUSE.toml) records the licence of every path in a
form that tools can read.

Copyright 2026 Harmon Amakobe and Starshot contributors.

## Starshot's own code: Apache-2.0

Everything in this repository is Starshot's own work, released under the
[Apache License, Version 2.0](LICENSE). That is decision D12 in
[docs/decisions.md](docs/decisions.md), which supersedes the MIT choice in D3. The
exceptions are the media, the brand files and Mark Macharia's astlo code, listed in the
sections below.

That includes the game (`apps/`), the packages (`packages/`), the tools (`tools/`), the
scripts (`scripts/`), the documentation (`docs/` and the files at the top level), the
agent configuration (`.claude/`, `.github/`, `AGENTS.md`, `CLAUDE.md`), and Starshot's
own files in `python/astlo/`: its README, `VERIFICATION.md`, `build_wheel.py`, `bench/`
and `tests/`.

Commits made before D12 carried the MIT licence. Anyone who received a copy under it
keeps those terms for that copy.

## Original media: CC BY 4.0

Original art, audio and screenshots made for Starshot are released under
[CC BY 4.0](LICENSES/CC-BY-4.0.txt) (D12). Media from other sources keep their own
licences. Every shipped asset, original or not, is listed in [CREDITS.md](CREDITS.md)
with its source, licence and attribution. None has shipped yet.

## The name, logo and icon: all rights reserved

The name "Starshot", the Starshot logo and the app icon (`apps/game/public/icon.svg`
and `apps/game/public/brand/`) are not covered by Apache-2.0 or by CC BY 4.0. Section 6
of the Apache licence grants no permission to use them. What you may do without asking
is set out in [TRADEMARK.md](TRADEMARK.md).

## `third_party/astlo/`: not covered by Starshot's licences

`third_party/astlo/**` is **astlo**, copyright (c) Mark Macharia
([@iamnothimbutwe](https://github.com/iamnothimbutwe)). **All rights reserved.**

- It is here only because this repository is a GitHub fork of
  [iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic). Mark's
  original files were moved into that folder, **unmodified** (decision D1).
- Starshot's licences do **not** apply to those files. Their terms are Mark's own; see
  `third_party/astlo/LICENSE` and the notices inside his files. In short, copying,
  modification and distribution need his written permission.
- `third_party/astlo/LICENSE` grants no permission to copy, modify or distribute. It
  has the layout of an MIT notice, with a copyright line and a warranty disclaimer, but
  no permission paragraph.
- `third_party/astlo/CODEOWNERS` is inert. GitHub reads a CODEOWNERS file only at the
  repository root, in `.github/` or in `docs/`, so it assigns no reviews here.
- Starshot never modifies those files, never copies them into its own code, and never
  relicenses them (decision D2; the copy in `python/astlo/`, below, stays under Mark's
  terms). An automated check pins their exact bytes
  (`third_party/astlo.sha256`, checked by `scripts/check-third-party-untouched.mjs`).
- Starshot does not use astlo's code or data at run time.

## `python/astlo/astlo/` and its `.dist-info/`: Mark's code with Starshot's fixes

`python/astlo/astlo/` and `python/astlo/astlo-*.dist-info/` are also **astlo**,
copyright (c) Mark Macharia. **All rights reserved. Not covered by Starshot's
licences.** `REUSE.toml` labels both, and `third_party/astlo/`, as `LicenseRef-astlo`.

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
