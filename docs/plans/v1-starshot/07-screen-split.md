# PR2 and PR3: split the current campaign

This executable mapping for `v1-screen-split-render` and `v1-screen-split-state`
supersedes their legacy `ui/screen/` tables in [00-plan.md](00-plan.md). Both build in
`codex/v1-pr02-screen-split`, based on `codex/v1-program-pr0`. The accepted baseline is
`main` at `7f325a61b77a43c98d95a7644d7d03834829b1a1`; re-locate symbols before editing.

Use `git show` on saved commit `611a9d81cbfecfbdfa5549d4962e472e492eed5a` to read its
`docs/architecture.md:101` module map and extracted files. They predate accepted lunar
gameplay: move current bodies into the boundaries instead of replacing them with copies.

## Scope and sequence

PR2 deletes the unmounted screen and extracts shell effects/views. PR3 splits the
controller and deck/menu views. Preserve behavior, DOM, copy, styles, physics and saves.
New features, lunar changes and the CSS split belong to their separate groups.

Record the browser baseline before edits. Format only modules being split with Prettier
3.6.2, in a separately reviewable diff. Preserve effect dependencies, ref writes,
callback order and hook/renderer lifetimes. Each focused hook returns at most ten
members; use grouped domain objects without creating another broad state hook.

At the baseline, `CampaignApp.tsx` has 125 physical lines, `use-campaign.ts` 173,
`HomeMenu.tsx` 53 and `FlightDeck.tsx` 60. Their compressed expressions hide the actual
size. After splitting, every new module and these four files must stay under 300 code
lines. The existing size checker governs code-line counts; the baseline may only shrink.
Record any cap deviation before building it. PR3c owns the compressed-line warning.

## Current ownership and destination

All paths in this table are under `apps/game/src/campaign/`. Line references identify
the audited base. Existing pure modules remain authoritative.

| Current source | Target | Contract to preserve |
|---|---|---|
| `CampaignApp.tsx:25`, selected pilot, `useCampaign`, `useCloud` | `pilot-session.ts` | One controller/worker for the shell; selected pilot and revision form owner identity; record through the latest pilot ref |
| `CampaignApp.tsx:54`, autosave effect | `autosave.ts` | Save every 1.2 seconds and on `pagehide`; skip hydration and mismatched owner/revision; cleanup both timer and listener |
| `CampaignApp.tsx:31`, home/panel/hidden, `play`, `menu` | `use-menu.ts` | Menu cancels gestures, stashes the exact snapshot and syncs the local cloud demo; entry does not remount the scene |
| `CampaignApp.tsx:32`, focus/selected/map and camera return refs | `use-camera-views.ts` | Preserve camera return values, focus and map transitions, full orbit bounds and current world-point zoom behavior |
| `CampaignApp.tsx:33`, inspection/demoCharge and hangar return refs | `use-hangar.ts` | Inspection suspends flight consistently; preserve demo drag and the previous camera on return |
| `CampaignApp.tsx:34,42,49` | `reduced-motion.ts`, `fonts.ts`, `flight-audio.ts` | Match media listener disposal, reduced-motion parking freeze, asset font URLs and one audio object with disposal; do not add legacy 0.6 flight pacing |
| `CampaignApp.tsx:39`, intro and mission state | `mission-header.ts`, `IntroCaption.tsx` | Reset intro on owner/mission/window changes, dismiss on first pull; preserve current controls and labels |
| `CampaignApp.tsx:62`, Escape effect | `escape.ts` | Same priority: drag/pending cancellation, hangar, focus, selection, then menu; read current handlers |
| `CampaignApp.tsx:43`, scene input | `scene-view.ts` | Keep parking, lunar aim, lock, snap, preferences and measured deck height; no physics or geometry duplication |
| `CampaignApp.tsx:64`, debug getter | `debug-hook.ts` | Preserve all `__starshotCampaign` fields used by browser proof, including canonical shot, owner, visit, physical/display coordinates and renderer/worker identity |
| `CampaignApp.tsx` JSX | `AimHandle.tsx`, `BodyPopup.tsx`, `FocusTitle.tsx`, `MapTools.tsx`, `ResultCard.tsx` | Move current JSX and handlers without changing accessible names, announcement order, touch targets or class names |
| `use-campaign.ts:21-36`, session/ref/shot | `session-store.ts` | One `useSimulation<FlightRequest>` instance; `change` writes the ref before React state; `finalRequest` owns canonical lunar/planetary construction |
| `use-campaign.ts:38-67`, restore and matching preview | `use-restore.ts` | Preserve visit/owner token, layout-effect order, matching-shot hydration, sub-day launch ET, result restoration and failed-preview recovery |
| `use-campaign.ts:37,68-125`, aim/release/date/phase | `use-release.ts` | Preserve `ReleaseOwner`, Plan/YOLO capture, freeze-before-aim, cancel restoring prior coast state, date preserving phase, frozen request and preview/launch summary equality |
| `use-campaign.ts:44-50`, finish | `use-result.ts` | Score with the current mission settings, record once, preserve impact-specific notice and hinted star cap |
| `use-campaign.ts:126-138`, guide/apply | `use-hints.ts` | Keep visit/owner guards, lunar guide parking and exact sub-day ET; cancelled or old responses cannot affect a new pilot |
| `use-campaign.ts:140-171`, tick/retry/replay/seek/pause/snapshot | `flight-clock.ts` | Keep authoritative ET ref, parking coast limit, pause committing render ET, current rate modes, snapshot semantics and result callback ordering |
| `HomeMenu.tsx` panels | `MenuHome.tsx`, `LevelsPanel.tsx`, `ProfilesPanel.tsx`, `SettingsPanel.tsx`, `InfoPanels.tsx` | Preserve earned access, local cloud demo, release-mode settings, release footer/About versions and credits/support links |
| `FlightDeck.tsx:13-29`, units/modes/speed | `DeckControls.tsx` | Preserve parking rate steps, unit-specific rates, expanded instrument state and button labels |
| `FlightDeck.tsx:31-58`, pages and planning controls | `DeckPages.tsx`, thin `FlightDeck.tsx` | Preserve burn versus excess-speed meaning, date/phase/pause controls, swipe bounds, timeline and Launch/Guide behavior |
| `use-view.ts:19-41` | Keep existing render-loop owner | The effect still creates one `CampaignScene`, reads `live.current`, measures safe rectangles, ticks once per frame and disposes once |
| `contracts.ts:8-13`, `release.ts:5-14` | Keep existing pure contracts | Canonical request keys and restore matching, captured release intent and generation acceptance stay single-source |
| `session.ts:30-72`, `profiles.ts:18-57` | Keep existing serialization and migration | D38 parking fields, v2 writes, untouched v1/legacy storage, valid-pilot recovery and earned-access scoring remain unchanged |
| `orbit-path.ts:18-27`, `world.ts:11-24`, `scene-geometry.ts:20-70` | Keep current path and world modules | Preserve all three coordinates, lunar `relativeSamples`, fixed reference plane, moving Earth centre and current camera extents |

Pass shared refs/callbacks explicitly and preserve update order across cyclic needs.
No child hook reads another hook's internals. Audit all `CampaignController` callers:
gestures, deck, menu, mission panel and view. Keep one worker and scene per shell.

## Deletions and mirrors

`apps/game/src/main.tsx:3` mounts `CampaignApp`. The old `App.tsx:7` alone imports
`GameScreen`; old UI modules own all legacy render/input/format callers. Confirm the
caller search again immediately before deletion.

| Path | Disposition |
|---|---|
| `apps/game/src/App.tsx`, `ui/*` | Delete the unmounted island. No new `ui/screen/` modules |
| `apps/game/src/input/useSlingshot.ts` | Delete with its only live-in-that-island caller, old `GameScreen` |
| `apps/game/src/render/*` | Delete legacy camera/draw/starfield modules after caller check; keep `campaign/scene.ts` and `three-scene.ts` |
| `apps/game/src/format.ts`, `styles.css` | Delete only with confirmed isolated callers/imports |
| Saved `campaign/path.ts` | Do not import. Saved lines 3-29 store only t/x/y. Current `orbit-path.ts` preserves z and lunar relative samples |
| `scripts/size-baseline.json:4-6` | Lower with `node scripts/check-file-size.mjs --update`; expect the three dead-file entries to disappear |
| `docs/architecture.md:102`, `apps/game/README.md:116,185` | Replace obsolete reference-shell claims with the actual resulting module map |
| `CREDITS.md:50` | Resolve the legacy starfield reference against live asset provenance; do not claim an asset licence from a deleted code path |

Keep the prototype, shared packages and fixtures until proven cutover. Dead-screen-only
features remain accounted for in deviation 15; cleanup does not reintroduce them.

## Verification recipe

Create `scripts/verify-steps/screen-split.mjs` as a reusable criterion-specific probe.
The current tree has no tracked steps directory. The saved 30-step probe description
is evidence of an earlier method, not proof of the accepted lunar baseline.

Before changes, build the base and run the probe on a clean local profile, then a
seeded v1 profile. Use the same build mode, URL and seed after the split. Record
normalized `<main>` markup, `__starshotCampaign` and screenshots at each checkpoint.
Normalize only nondeterministic identity/timing fields; separately assert worker and
renderer identities do not change during menu, level or pilot navigation. Keep shot
keys, captured ET, parking fields, ownership, mission, score and phase unnormalized.

Check menu/pilot creation, every menu panel, release version and About, settings,
reduced motion and entry. Exercise aim and numeric edits, both release modes,
pause/play, independent date/phase edits, cancel and pending-preview switching.
Record hit/miss/Earth impact, retry/replay/next, each planetary mission and sandbox.
Cover every camera mode, map/focus, hangar, profile restoration and saved sub-day
flight. Stale preview, success, failure and hint results cannot launch, cancel or award
progress to another pilot.

The matrix covers phone portrait including 390x664, short landscape, desktop and
reduced motion, with WebGL and forced Canvas, root and repository subpath. Use actual
pointer and keyboard controls. Compare snapshots only at controlled ET/animation
checkpoints. Existing short-phone crowding belongs to PR3b; capture it unchanged here.

Run these commands, each with exit code and report summary in the PR:

```text
npm run gates
node scripts/check-file-size.mjs
npx vitest run apps/game
npm run build
node scripts/verify-game.mjs --steps scripts/verify-steps/screen-split.mjs
git diff --check
```

Run the verifier against each served build/renderer mode using its current options.
The probe must assert zero console/page errors, labelled keyboard controls, required
44 px targets, exact preview/launch identity and unchanged results. Compare screenshots
and baseline/post-split snapshots; explain every intentional normalization. Repeat the
current offline release verifier if cache or build inputs changed. Store screenshots
outside the repository; publish portable evidence without private paths.

An adversary reviews all moved bodies and the deletion caller search. A verification
driver reviews the probe and actual UI evidence. Run the physics lens only if a
numerical behavior changes; such a change must leave this behavior-preserving group or
be explicitly justified and logged. Every new module stays below 300 code lines, the
size baseline is empty, and no `CampaignApp` shape warning remains.
