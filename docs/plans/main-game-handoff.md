# Main-game implementation handoff

## Owner direction and starting point

Build the main game from the approved design, with Earth to Moon as its first
playable mission. Continue from the Moon into the existing planetary campaign.
The owner requested this work after merging the prototype into PR0. No Moon
integration or gameplay change belongs to that merge itself.

Use the prototype as the visual and interaction reference. Its current component
structure is not the production architecture. Preserve the approved feel while
removing duplicated behavior, unused screens and components with too many duties.

The accepted runtime baseline is `3baee8cc66b7f214a8d4c26532e346b11fbf5ce0`,
from `starshot/look-prototype`, incorporated into `starshot/pr0-bootstrap`.
PR0 is [pull request 1](https://github.com/harmon-amakobe/starshot/pull/1), based on
`main`. It is still open. This incorporation does not merge PR0 into `main`.
Fetch the current remote tip before starting; later documentation commits may follow.

Run `npm run dev` for the integrated campaign. Run `npm run dev:prototype` for the
Earth-Moon reference and hangar. The main entry already mounts `CampaignApp`.
Do not rebuild the discarded Canvas screen as the primary experience.

## Read first

- `AGENTS.md`, `docs/copy-standard.md` and `docs/architecture.md`.
- `docs/decisions.md`: D1 through D32 are resolved. D16, D17, D18, D19, D28,
  D30 and D32 govern this implementation.
- `docs/plans/v1-starshot/00-plan.md#pr-groups-d30` and
  `docs/plans/v1-starshot/05-deviation-log.md`.
- `docs/design/look-direction.md`, `docs/design/interaction-brief.md`,
  `docs/design/lunar-play.md` and `docs/design/entry-experience.md`.
- `docs/plans/campaign-ux-integration.md#preserve-the-game-contract` and
  `#conservative-adaptations-and-remaining-scope`.
- `docs/plans/lunar-play-prototype.md`, especially its measured verification.

## First group and subsequent delivery

The next group is PR2, containing these existing specs:

| Member | Exact spec heading | Work id |
|---|---|---|
| PR2 | [PR2: GameScreen split, render loop](v1-starshot/00-plan.md#pr2-gamescreen-split-render-loop) | `v1-screen-split-render` |
| PR3 | [PR3: GameScreen split, state hooks](v1-starshot/00-plan.md#pr3-gamescreen-split-state-hooks) | `v1-screen-split-state` |

Use branch `starshot/v1-pr02-screen-split`, based on the current PR0 tip, unless
a live PR audit shows that group already exists. Resume existing work in that case.
Only the bottom PR targets `main`; later groups target the branch below them.

Before building, reconcile these specs with the accepted runtime. They name the
legacy `ui/GameScreen.tsx`; the active screen is now `campaign/CampaignApp.tsx`.
Keep their behavior-preserving foundation goal. Update the implementation mapping
and work descriptions, then record the deviation. Refactor the active shell and
remove legacy code only after proving it has no remaining caller or contract.
Do not declare the group complete after splitting an unused screen.

Issues were disabled when this handoff was prepared. No issue numbers exist for
these work ids. Recheck repository settings and `work.lock.json`; follow
`track-work` if Issues are enabled. Otherwise retain deviation 11, keep the work
file valid, and do not invent issue numbers or change repository settings.

After this group, follow the program's dependency order. The requested end state
is a playable Moon-first main campaign, not a cleanup-only delivery. Carry that
objective into every handoff until it is testable. During Band C planning, schedule
the Moon-first slice at the earliest point its core, rails and flight contracts
support it. It need not wait for cloud accounts or store publishing. Reconcile the
provisional groups and PR34's lunar scope explicitly, with dependencies and proof.
Do not silently bypass the Rust core or add a second permanent production engine.

## Required architecture

1. Keep the root view as composition. Separate simulation ownership, playback,
   profile persistence, menu navigation, camera state and audio by responsibility.
   Prefer focused typed hooks or state machines. Do not move the root into one
   large hook, one untyped context or a generic controller with dozens of methods.
2. Use one main-game level catalogue, request pipeline, worker lifecycle, scoring
   path and save model. Lunar and planetary departures may have explicit typed
   variants. Their units and frames must be visible at those boundaries.
3. React owns labelled DOM controls and view models. The imperative renderer owns
   scene resources and camera-relative coordinates. Physics remains in the worker.
   Neither UI components nor render frames integrate a trajectory.
4. Reuse `packages/presentation` for craft, engine, audio, icons and entry timing.
   Consolidate equivalent cameras, units and interaction behavior where their
   contracts match. Packages never import apps; the main game never imports lunar
   runtime code directly from `apps/prototype`.
5. Establish shared asset ownership in the planned asset work. Today
   `apps/game/observatory-assets.ts` reads the prototype's public assets. Preserve
   their manifest, hashes, licences and credits while removing that ownership debt.
   Do not check in copies of textures or parallel asset catalogues.
6. Use readable formatting. Keep views below 300 code lines where practical and
   all new code below the 500-line limit. The rebuilt active shell must have no
   god-component warnings. No baseline growth, line compression or new exemptions
   to conceal complexity. Keep hook return surfaces small, around ten members.
7. Audit duplicate CSS and obsolete adapters after behavior coverage exists.
   Remove unused legacy screens and styles, while retaining the working Canvas
   fallback and accessibility behavior. Do not delete fallback code by assumption.
8. Preserve cancellation and ownership guards. Delayed previews, releases, hints
   and restore completions cannot launch stale input or affect another pilot.
   Keep canonical requests immutable and saved state validated at the boundary.

The current size gate passes but reports shape warnings. `CampaignApp` has 36
hooks, 12 state calls and imports from four areas. The legacy `GameScreen` remains
on the size baseline. These are cleanup targets, not evidence of finished design.
Inspect `campaign/use-campaign.ts` as well; avoid replacing it with another broad hook.

## Earth to Moon and progression

- Add a stable Moon mission id as the first campaign entry. Retain `first-light`
  for Mars, `morning-star` for Venus, `big-game` for Jupiter and `grand-tour` for
  Saturn via Jupiter. Keep these missions available for regression playtests.
- Make mission order and next-mission lookup explicit. New pilots start at Moon.
  A successful lunar attempt continues into the planetary sequence in the same
  app, with the same menus, deck, cameras and profiles.
- Migrate saves without erasing stars, reinterpreting an existing mission id,
  resetting pilots or relocking previously earned access. Preserve current
  sessions and the legacy `starshot.progress.v1` import. Test both new and old saves.
- Distinguish earned progression from the existing labelled playtest access.
  A debug bypass never grants stars or silently changes the production unlock rule.
- Define lunar success, miss, impact, retry, replay, hint use and scoring. An
  encounter is not a stable orbit. The study's 65000 km approach radius is a study
  threshold, not a validated capture rule to copy into the campaign.
- Specify departure altitude, phase, frame, launch date, body coverage, integrator
  settings and a known successful request before building the level. Keep these
  in level data and the canonical request, not in the renderer or a tutorial branch.

The current campaign uses heliocentric excess velocity from Earth's ephemeris
centre (`apps/game/src/sim/shot.ts`, `packages/physics/src/launch.ts`). The lunar
study uses a local parking-orbit tangent plus a burn, an actual lunar plane and
separate Earth/Moon gravity (`apps/prototype/src/lunar/flight.ts` and `model.ts`).
Do not reinterpret excess velocity as a parking-orbit burn or rotate one frame
into another without validation. Inspect `flight.test.ts` for the lunar oracle.
Its successful 3.24 km/s, zero-degree request is an approach, not captured orbit.

D16's Rust core and D17's rails are the production destination. Preserve the
TypeScript oracle until conformance proves the cutover. Preview, release, hints,
replays and tests must use the same captured request and frozen level settings.
Use km, km/s and ET internally. Keep UTC and display-unit conversion at the edges.
Generate new reference data through the documented toolchain and compare to JPL.
Do not loosen tolerances, clamp out-of-coverage dates or invent lunar positions.

The game renders in 3D, with early missions presented in an accessible planar view.
D18 keeps chapter one flattened. The owner's future inclination lesson remains
an explicit follow-up requiring its own resolved decision and tests. Free camera
rotation does not enable physical inclination. Do not expand that scope here.

## Approved experience to preserve

- Pocket observatory playfulness with Deep field's rounded forms. Lowercase
  `starshot`, without a trailing period. One screen; the page never scrolls.
- Live entry menu over the latest level's craft and planet. Play or Continue
  transitions within the mounted scene and worker, without reload or flicker.
  Keep local profiles and level selection. Cloud sign-in remains an explicitly
  local interaction demo until the planned backend work lands; stores say Coming soon.
- A translucent bottom flight deck with horizontal instrument pages. Collapsed
  state keeps a horizontal fuel/charge meter, angle or flight progress, expansion
  caret, units on the right and detail toggles. Do not turn it into a settings list.
- Nonmodal mission details expand from the top route control. Side panels serve
  menus and results. The map remains interactive around active instruments.
- Simplified and Scientific remain switchable while collapsed. Expanded selected
  mode uses an icon and label pill; collapsed modes use icons. Icon-only selection
  glows amber. Unit cycling uses waveform/km/mi plus Light-time/Metric/Imperial.
  Simplified defaults to Light-time and enlarged worlds; Scientific to Metric and
  realistic worlds. Manual world-size changes decouple that preference.
- The craft stays anchored while the player extends its rear engine ring straight
  back. A cylindrical field chamber charges, then snaps closed on release. The
  dotted path responds to authoritative aim. Preserve non-drag fine controls and
  a usable touch target. The craft turns prograde and fires visually during travel.
- The initial lunar camera shows both Earth and Moon with opposing screen positions.
  Use the north-facing, counterclockwise reference, visible departure/target orbits
  and understandable encounter cues. Labels clear the craft, pull ring and art.
  Intro copy fades on the first pull. Test clearance at every supported screen size.
- Follow, System and Free views, craft-centred zoom, pause and full-system zoom-out.
  Launch window stays reachable in flight. Inspection has title/subtitle top-left
  and X top-right; return restores camera, ET and pause state. Hide irrelevant controls.
- Stepped fast-forward icons instead of dropdowns; double-click or keyboard reset
  returns to real time. Scientific Light-time c presets describe apparent replay
  pacing, not changes to the physical velocity or score.
- Linear distances, explicit enlarged bodies and true radii in realistic views.
  Preserve sourced rotation, tilt, rings and major moons where data covers the date.
  The Sun is white in scientific/realistic view and warm in simplified view, with
  clearly illustrative solar activity. Preserve coverage notices and Canvas fallback.
- Try again and Replay sit together on the result card. Next mission follows
  canonical progression. Restart is easy to find. Sound and the open/closed-eye
  Hide UI control remain in the menu. The hangar shares the craft and engine demo.
- Labelled keyboard controls, 44 CSS px targets, non-drag aiming, focus return,
  polite outcome announcements, reduced motion and muted equivalents for audio cues.

## Proof and publication

Use the repository skills `verify-gates`, `verify-game`, `verify-physics`,
`public-hygiene`, `stacked-pr` and `track-work` where their triggers apply.
Record commands with exit codes and inspect the screenshots, not only test logs.

For the first refactor group, retain all known campaign solutions, hint penalties,
misses, sandbox targets, session ownership and exact preview/release identity.
Compare before and after through the real browser and worker. No feature changes
belong in a behavior-preserving extraction.

For the lunar group, prove a measured encounter, miss and impact; preview equals
release; retry and replay; Moon-to-next-level progression; save migration; and
stale worker responses during level/profile switches. Test real touch release,
keyboard aiming, phone portrait, short landscape, desktop, reduced motion,
WebGL and Canvas, and deployment under a repository subpath. Enter every level
and verify a visible rendered scene; a passing title screen missed an earlier blank map.

Run `npm run gates` for every completed group. Run both app builds while the
reference app remains supported, plus data validation when its pipeline changes.
Physics work requires the physics verifier and a physics-auditor review. Player
changes require the browser verifier; harness changes require rules-reviewer.
Never substitute `gates:fast` for the Definition of Done. Measure phone performance;
headless frame counts do not certify the 60 fps or 100 ms preview targets.

Baseline evidence is in `campaign-ux-integration.md#integration-verification`:
107 tests, both builds, validated assets/data and 93 retained browser criteria.
Known gaps include physical-phone performance, 200 percent zoom and blocked/corrupt
storage recovery. Treat those as verification work, not prior passes. Shape warnings
and the current bundle warning also remain; do not call the baseline production-ready.

Act as orchestrator. Route by "would anything be lost with the cheaper tier?" and
read `.claude/agents/`. Use one builder at a time, with only read-only work fanned
out. Run one fresh adversary review per group against `.claude/rubrics/`, plus the
domain lenses required by the diff. Executors never commit, push or open PRs.
Publish with owner authorship and sign-off under D24; keep secrets and personal
paths out of the public tree. Keep all work in the linear stack.

At about 70 percent context, finish the current group's publish step and provide
a fresh `handoff-prompt` record. State the actual next group and what remains to
make Moon-first playable. Do not mark the broader objective complete after cleanup.
