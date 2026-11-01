# Decision log

These are Starshot's binding decisions. Each one is cited by its number (D1, D2, ...)
in code comments, plans and pull requests.

**How this log works**

- A decision marked **Resolved** is settled. Do not reopen it in a pull request or a
  plan; build on it. If a decision seems wrong, open an issue that explains why. Only
  the owner reopens a decision.
- Entries are append-only. A change of mind is a **new** entry that names the one it
  supersedes; the old entry stays, marked "Superseded by D#".
- **Source** says where a decision came from: the owner's instruction, the project
  brief that set up the bootstrap, a fact (such as a licence), or a *(judgment)* call
  made while building, which the owner may revisit later through a new entry.
- Loosening an accuracy budget, changing a licence position or adding a hosted service
  always needs a new entry.

---

## D1. Starshot is a fork of Mark's repository; his files live unchanged in `third_party/astlo`

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** owner instruction.

**Decision.** Fork of Mark's repo by owner instruction; Mark's files live unchanged in
`third_party/astlo`.

**Why.** The owner asked for Starshot to live in a fork of
[iamnothimbutwe/astlopublic](https://github.com/iamnothimbutwe/astlopublic), which
keeps Mark's history and makes the project's origin visible. Moving his files into one
folder keeps them intact and clearly separated from Starshot's own code.

**Consequences.** The repository's `main` branch carries Mark's commits, followed by
Starshot's. His README, licence, assets and wheels are under `third_party/astlo/`,
byte-for-byte as published.

---

## D2. Mark's code is all rights reserved: never modified, copied or relicensed here

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** fact (astlo's licence terms).
**Revised by [D10](#d10-astlo-fixes-are-made-here-first-in-pythonastlo-shared-pending-marks-permission)
(2026-11-01, the owner's call).** `third_party/astlo` keeps every rule below. What D10
changes: Mark's v12 source, with Starshot's fixes, now also lives in `python/astlo/`
(still his rights, never relicensed), and the fixes are shown to him once Starshot is
finished instead of being sent privately as patches. The original text stays as decided.

**Decision.** Mark's code is all-rights-reserved: never modified/copied/relicensed
here. Fixes go to Mark privately as a patch until he grants a licence. A guard verifies
`third_party` hashes.

**Why.** astlo's licence and file headers reserve all rights: copying, modification and
distribution need Mark's written permission. The fork exists by his goodwill, and one
copied line would break both that trust and his licence.

**How it is enforced.**

- `third_party/astlo.sha256` records the hash of every file;
  `scripts/check-third-party-untouched.mjs` (the `third-party` gate) fails on any change.
- A Claude Code hook (`scripts/agent/guard-protected-paths.sh`) refuses edits under
  `third_party/`.
- Upstream syncs and private patches follow `.claude/skills/astlo-upstream/SKILL.md`.

---

## D3. Starshot's own code is MIT-licensed

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief.

**Decision.** Starshot's own code: MIT licence (permissive; does not affect the owner's
private projects).

**Why.** MIT lets anyone use, change and share the game and packages, including
commercially, with very little paperwork. It covers only this repository: it grants
nothing over, and places no obligation on, any other project the owner has.

**Consequences.** `LICENSE` holds the MIT text; `NOTICE.md` explains that
`third_party/astlo/**` is excluded. Every `package.json` declares `"license": "MIT"`.

**Note (2026-11-01, following [D10](#d10-astlo-fixes-are-made-here-first-in-pythonastlo-shared-pending-marks-permission)).**
`python/astlo/astlo/**` and `python/astlo/astlo-*.dist-info/**` are also excluded from
the MIT licence: they are Mark's astlo source and metadata with Starshot's fixes, under
his terms. Starshot's own files beside them in `python/astlo/` (its README,
`VERIFICATION.md`, `build_wheel.py`, `bench/`, `tests/`) are MIT. `NOTICE.md` lists both
exclusions. The decision above is unchanged.

---

## D4. Planet positions come from JPL's Table 1, validated against Horizons; astlo data only after a gate

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief, backed by a fact (the astlo evaluation).

**Decision.** Positions come from the JPL Table 1 TypeScript ephemeris, validated
against Horizons. astlo data may be used only after it passes a validation gate
(direction error vs JPL).

**Why.** NASA/JPL's "Keplerian Elements for Approximate Positions of the Major Planets"
(Table 1, valid 1800 to 2050) is public, tiny and accurate enough for a game and a map.
The [astlo evaluation](astlo-evaluation.md) found that astlo's published build puts
some planets in the wrong direction (Earth about 24 degrees off) even though its
distances from the Sun look right, so a direction check is the gate that matters.

**How it is enforced.** `packages/ephemeris/test/ephemeris.test.ts` compares every
planet with NASA/JPL Horizons at five dates (1977 to 2049) against per-planet budgets in
arcminutes. Any future astlo data must pass the same direction check, per body, before
it is used (method: `.claude/skills/astlo-upstream/reference.md`), and also needs a
licence from Mark that allows it (D2).

---

## D5. Stack: TypeScript monorepo, Vite + React, Canvas 2D; three.js later for a 3D map

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** *(judgment)*.

**Decision.** Stack: TypeScript, npm workspaces monorepo, Vite + React, Canvas 2D for
the game prototype; three.js/R3F reserved for a future 3D map app (`apps/orrery`, not
now).

**Why.** A 60 fps slingshot has to run its physics on the player's phone, so the engine
is TypeScript in the browser. npm workspaces let the game and the reusable packages
live and be tested together without extra tooling. Canvas 2D is light, fast to load and
enough for a top-down game. three.js with React Three Fiber (R3F) is the natural choice
for a 3D map of the Solar System, but it is heavy, so it waits for the app that needs
it.

**Consequences.** `apps/game` (Vite + React + Canvas 2D), `packages/ephemeris` and
`packages/physics`. A future `apps/orrery` reuses the same packages.

---

## D6. Game physics is 2D, with a patched-conic departure, and the preview equals the launch

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** partly *(judgment)*: the flat world and the departure model are judgment
calls; "preview equals launch" is a product rule from the project brief.

**Decision.** Game physics is 2D: `createEphemeris({flatten:true})`; patched-conic
Earth departure (`departFrom:'earth'`); preview and actual launch use IDENTICAL
`simulate` settings so what you see is what you get.

**Why.**

- *Flat (judgment).* A slingshot aimed on a flat screen cannot aim up or down. Real
  orbits are tilted by up to 7 degrees, so a perfectly aimed 2D shot could pass above or
  below its target. Flattening every orbit onto the ecliptic plane keeps aiming honest.
  The packages still work in full 3D for future apps.
- *Patched-conic departure (judgment).* The climb out of Earth's gravity takes less
  than a day of a months-long flight. The probe therefore starts at Earth's centre with
  Earth's velocity plus the launch speed, and Earth's pull is switched on once the
  probe is clear. This keeps the game's aim consistent with real launch-window maths.
- *Identical settings (product rule).* If the dotted preview and the real flight used
  different settings, a shot that looked perfect could miss. Both go through one
  function with one frozen settings object.

**How it is enforced.** `SIM_SETTINGS` and `simulateShot` in
`apps/game/src/sim/shot.ts` are the only path from an aim to a flight; the physics
worker (`apps/game/src/sim/sim.worker.ts`) uses them for both previews and launches.

**Note (2026-11-01): a clarification, not a reversal.** The settings are frozen **per
level**, not one object for the whole game. Each level carries its own frozen
`SimSettings` (`Level.sim` in `apps/game/src/levels.ts`): `SIM_SETTINGS` for the
campaign and the inner-planet sandbox, `OUTER_SIM_SETTINGS` for sandbox targets beyond
Mars (5 to 14 year flights). The level's settings travel inside every `ShotRequest`
(`sim`), and `simulateShot` is still the only path from an aim to a flight, so a level's
preview and its launch remain identical; so do the hint search and the level tests,
which build their requests the same way (`shotRequestFor`, `hintQueryFor`).

---

## D7. Hosting: GitHub Pages, fully static, no backend, no secrets

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief.

**Decision.** Hosting: GitHub Pages via GitHub Actions; fully static; no backend, no
secrets, no Firebase. A future leaderboard would use a separate, Starshot-only Firebase
project with config injected at build time from repo Variables — never any private
project's config.

**Why.** Pages is free for public repositories, needs no server, and deploys straight
from this repository. With nothing secret in the build, there is nothing to leak.
Keeping any future online feature in its own project means a mistake in Starshot can
never reach the owner's other work.

**Consequences.** `.github/workflows/pages.yml` builds and deploys on every push to
`main`. The `secrets` gate rejects Firebase-style configuration in files. Setup steps
and the future leaderboard plan are in [hosting.md](hosting.md).

---

## D8. The bootstrap ships as one pull request with layered commits

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** *(judgment: new repository)*.

**Decision.** This bootstrap ships as ONE PR with layered commits (judgment: new repo);
later work follows stacked PRs per the Kobe loop.

**Why.** The repository starts empty of Starshot code, so there is no existing work to
stack on, and the packages, game, harness and docs only make sense together (the gates
check all of them at once). Layered commits keep the single pull request reviewable
piece by piece.

**Consequences.** Branch `starshot/pr0-bootstrap` targets `main`. Every later change
follows the stacked-PR rule in `AGENTS.md`. The record of this PR is
[plans/pr0-bootstrap.md](plans/pr0-bootstrap.md).

---

## D9. The Kobe loop is adopted

**Resolved 2026-10-31. Do not re-litigate.**
**Source:** project brief.

**Decision.** Kobe loop adopted: `AGENTS.md` canonical core, `CLAUDE.md` pointer, roster
in `.claude/agents`, rubrics, skills, hooks, deterministic gate registry.

**Why.** Starshot is built largely by AI agents in a public repository. A single
working agreement, a fixed roster of roles, written review rubrics, and checks that
are scripts (not good intentions) keep changes honest, reviewable and safe to publish.

**Consequences.**

- `AGENTS.md` is the one canonical agreement; `CLAUDE.md` and
  `.github/copilot-instructions.md` only point to it (the `instruction-dedup` gate
  enforces this).
- Roles live in `.claude/agents/`, review rubrics in `.claude/rubrics/`, skills in
  `.claude/skills/`, hooks in `.claude/settings.json` and `scripts/agent/`.
- Every check is registered in `scripts/gates.mjs` and run by `npm run gates`, locally
  and in CI.

---

## D10. astlo fixes are made here first, in `python/astlo`, shared pending Mark's permission

**Resolved 2026-11-01. The owner's call. Do not re-litigate.**
**Source:** owner instruction. Revises D2 (the `third_party/astlo` rules are unchanged).

**Decision.** The owner wants the astlo fixes made in this repository first, packaged,
and shown to Mark once Starshot is finished. The owner expects Mark to allow it and
accepts the risk. Therefore:

- `python/astlo/` holds Mark's astlo v12 source plus Starshot's fixes, each fix a
  reviewable commit, shared in good faith pending Mark's written permission.
- Mark keeps all rights to his code. It is **not** under Starshot's MIT licence, and it
  keeps his copyright headers.
- `third_party/astlo/` stays the pristine, hash-pinned upstream reference (D1, D2).
- Starshot's TypeScript packages and game never copy astlo code and do not depend on
  astlo (D4 is unchanged).
- If Mark objects, `python/astlo/` is removed.
- Nothing has been offered to Mark yet; the owner shows him the work when Starshot is
  finished. Any draft message to him stays outside this repository.

**Why.** The owner's call. Each fix is a separate commit with its evidence against
NASA/JPL, so Mark can review, take or drop each one, and the packaged wheel shows that
together they work. The owner expects Mark to allow it, and accepts the risk of
publishing changed copies of all-rights-reserved code before his written permission.

**The risk, stated plainly.** astlo's licence reserves copying, modification and
distribution. Removing `python/astlo/` later takes it off the branch, but not out of git
history or out of forks and clones already made, and GitHub does not allow a fork of a
public repository to be made private.

**How it is enforced.**

- [`python/astlo/README.md`](../python/astlo/README.md) and [NOTICE.md](../NOTICE.md)
  state the licence status; Mark's headers and metadata stay as he wrote them.
- The import commit is his wheel's contents byte for byte; every later commit under
  `python/astlo/astlo` is one fix, measured in
  [`python/astlo/VERIFICATION.md`](../python/astlo/VERIFICATION.md).
- `.github/workflows/astlo.yml` builds the wheel, tests it offline against NASA/JPL
  Horizons fixtures, and keeps it as the workflow artifact `astlo-fixed-wheel`. It is
  not published to PyPI or as a release.
- The `secrets` gate skips only its email rule, and only in Mark's files
  (`python/astlo/astlo/` and `python/astlo/astlo-*.dist-info/`), where his published
  contact addresses are upstream content.
- Fixes, rebases onto a new upstream release, and the removal if Mark objects follow
  `.claude/skills/astlo-upstream/SKILL.md`.

## D11. The Mars-window physics test asserts a near miss of the two-body aim

*Date:* 2026-11-01. *Source:* orchestrator (judgment), under the owner's standing
instruction not to block on small calls. Revisit if the owner disagrees.

**Decision.** `packages/physics/test/physics.test.ts` ("reaches Mars' sphere of
influence on the 2026 window with the Lambert aim") asserts that the cheapest two-body
Lambert aim, flown through the full simulator with every planet pulling, passes within
**1.25** Mars spheres of influence. It used to assert that the flight enters the sphere.

**Why.** Fixing `lambert()` for long transfers let it find the window's true two-body
minimum (launch 2026-11-02, 326 days, v-infinity 2.982 km/s). The other planets' pull
deflects that aim to a 1.135-sphere near miss. That is physics, not a regression, and the
game's hint closes the gap with the simulator itself. The test still fails loudly if the
aim drifts: 1.25 leaves about 10% headroom over the measured miss. This is a behaviour
test of the Lambert-to-simulator hand-off, not one of the Horizons accuracy budgets in
`packages/ephemeris/test`, which are unchanged.
