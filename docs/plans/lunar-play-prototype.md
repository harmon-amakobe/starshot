# Lunar play prototype

Status: first playable study published; pull and shared flight-view iteration implemented and verified.

## Shared flight-view iteration

The owner requests one coherent game across the lunar lesson and the approved
launch-window Observatory. Centre the shot-fuel reading inside its ring at every
breakpoint. Put labelled Follow, System and Free controls in the flight deck,
using the Observatory's camera vocabulary. Zoom buttons and wheel zoom should
bring the craft into view; Free remains available for deliberate map exploration.
The collapsed level deck retains a horizontal shot-fuel meter, percentage, physical
aim angle and preview cue. Units sit beside the mode icons. Phones use a 44 px control
row above a shallow readout row; flight shows progress and Moon distance instead.
Pause and the camera controls remain reachable. The expanded instruments are unchanged.

Present Earth on the left and the Moon on the right at departure, viewed from the
north side of the lunar plane. This is a fixed display-basis rotation, not a change to the launch state, orbital plane or force
model. Convert pointer aim through that display basis so the craft, sleeve and
burn direction agree. Keep non-drag aiming and the existing lesson angle limits.

Draw the Moon's geocentric orbit from the existing cached rail. Distinguish the
current Moon from its predicted future position. A successful preview marks its
actual approach-zone entry and joins the craft and future Moon at the same ET.
Misses must not show a successful intercept. Labels explain the approach objective;
the study still does not model a landing or capture burn.

Make Launch window available from the level during aiming, flight and results.
Keep the level mounted and preserve the exact flight, request, playback position,
camera and user preferences across the round trip. The hosted Observatory must
receive the current lunar mission and flight instead of its standalone Mars
recording. Provide a visible Return to flight control and keyboard return path.
Only one view owns the active playback clock at a time. Shared preferences and
playback state must return coherently, without a page reload or an unsolicited
restart. The standalone approved Observatory must still work.

Verify the changed presentation against the physical path, independent prograde
heading checks, both camera zoom paths, map round trips from playing and paused
states, mobile layout, keyboard access and reduced motion. Update runtime hashes
with the existing manifest tool for changed Observatory source. Full gates,
prototype build and data verification precede publication.

## Pull interaction iteration

The owner corrected the mechanism: the craft stays anchored while the player pulls its rear engine ring. Add visible charging and a
short release snap. Treat the ring extension as a control gesture: the physical launch
state and computed flight remain unchanged. Hold the extended chamber if the latest
preview is pending, then play the snap once that exact shot is ready. Cancellation
must return to aim without launching. Keyboard aiming uses the same charge feedback.

Frame Earth and the Moon in the initial view and after restarting, with both clear
of the cockpit and other overlays. Keep distances linear. Simplified may enlarge
body display sizes for readability, with an explicit size cue; Scientific retains
physical radii. Close following and unrestricted manual level zoom remain available.

Fade the compact level title whenever charged or pulling and keep it out of the flight. Reduced motion
uses immediate state changes, without overshoot or flashing. Put Try again and
Replay directly on every result card, and add an explicit Restart level action to
the menu. Restart returns to the uncharged initial state; retry can preserve the aim.

The owner replaced the earlier moving-craft gesture with an anchored body and rear
engine ring. A cylindrical chamber connects the fixed mount to that aft collar.
Align normal pulls with the craft's heading, retaining the existing
35 degree aim limit with a visible cue at its boundary. In flight, face the craft
along its computed Earth-relative velocity and animate a cool engine plume.
Verify touch tracking, current preview ownership, cancellation, visible targets and
result actions on phone, landscape, desktop and reduced-motion layouts.

Implementation keeps the launch request and physical starting position unchanged.
`ui/pull-pose.ts` owns charge timing and the 180 ms snap; `ui/use-scene.ts`
updates the aft collar every animation frame and holds ET until the reducer completes the snap.
The previous path is dimmed while a replacement computes. Only the current response
can release the held pose. The body stays at its anchor; only the aft engine ring moves. The engine has its own emissive material and an extending
ring, so charging does not alter the drone's amber parts.

A separate north-facing display basis places Earth left and the Moon right. Pointer aim converts back through the unchanged departure burn basis. `render/overview.ts`
fits the two true body centres into the visible play area. Simplified uses minimum
display radii of 32 px for Earth and 22 px for the Moon. A short outward leader ties
the enlarged collector control to its physical point. Scientific removes the body
minimums. Pulling and snapping never move the camera. System flight retains that
frame; manual camera controls can change it afterward.

The chamber is original procedural 3D geometry with a translucent wall, nine thin
ribs, cyan-white filaments and a contained violet core. It connects the fixed rear
mount to the cream aft collar and compresses during the release snap.
Canvas draws the same straight ribbed silhouette. It does not model an elastic force.
The travel plume has a cool white core, softer outer layers and a gentle clock-driven pulse.
Pause, menus and inspection freeze its phase; reduced motion keeps it steady.
This powered appearance is a visual study. The integrator still applies one departure
impulse, with no new force or fuel consumption. `render/coordinates.ts` projects the
Earth-relative velocity; the rendered nose axis uses that heading after local tilt.
The title fades when charged and is absent during flight and results. Retry
restores the initial view with the previous aim; Restart level resets the shot to 0%.

The iteration passes the full gates and browser checks below. The targeted pose,
ownership, camera and bridge suite contains 20 tests. The physics, lunar model and
worker implementations are unchanged from the first playable publication.

## Shared view validation

| Command | Result |
| --- | --- |
| `npm run gates` | Exit 0, 12 of 12 gates and 88 tests passed |
| `npm run build:prototype` | Exit 0, TypeScript and Vite build passed |
| `npx vitest run apps/prototype/src --reporter=dot` | Exit 0, 20 prototype tests passed |
| `npm run verify:data -w @starshot/prototype` | Exit 0, 34 runtime files, orientation and JPL reference checks passed |
| `node scripts/verify-game.mjs --url http://127.0.0.1:8767/` with external steps | Exit 0, 39 criteria across phone, desktop and reduced motion |
| External responsive browser script | Exit 0, 89 gauge, ring, touch and layout checks |
| Final compact dashboard and error script | Exit 0, 14 compact, Scientific label and induced-error checks |
| External standalone Observatory rerun | Exit 0, two standalone replay and navigation criteria passed |
| `git diff --check` | Exit 0 |

The browser checks cover 360 px and 390 px phones, an 844 by 390 landscape view,
a 791 px app panel, a 1440 px desktop and the Canvas fallback. Clean runs reported
no console errors, page errors, failed requests, page overflow, unnamed controls
or targets below 44 px. The phone harness emitted four WebGL readback warnings.
The induced-error check deliberately blocks a data request in its own context.
Four recovery criteria passed in an earlier script before its catalogue selector
failed and the command exited 1. The standalone rerun corrected that selector.
The final full harness also corrected its catalogue selector and exited 0.

Independent review checked 1,704 charged-ring bounds cases and 20,001 local-orbit
marker samples. The largest marker step in that numerical sample was 0.04312 px.
Across 38 rendered flight samples, the nose differed from an independent path
tangent by at most 0.0008921 degrees. These are display checks, not new navigation
accuracy claims. The source model, integrator and frozen shot request are unchanged.

The final build contains 232.65 kB gzip JavaScript and a 9.41 kB worker, before
textures, fonts and lunar data. Vite reports a chunk-size warning. Headless browser
checks do not establish the physical mid-range phone frame-rate target.

## Shared view implementation

`render/mission-geometry.ts` caches one sampled month of the existing lunar rail.
The display normal is the lunar angular momentum direction. The Moon therefore moves
counterclockwise, consistent with the north view described in the
[Lunar Sourcebook, chapter 3](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/pdf/Chapter03.pdf).
The unchanged parking orbit is prograde in that lunar plane. It is not geostationary;
[NASA's orbit catalogue](https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits/)
describes geostationary motion in the equatorial plane. No radius or physical state
was changed to make the lesson face north. Screen-direction keys convert through
the display basis; Scientific burn angles retain the physical request convention.

Successful previews sample the craft and Moon at the exact approach-entry ET.
The real 65,000 km boundary surrounds the future Moon, with a link to the entry point.
The future label merges with the current Moon when they approach on screen. Misses
retain their measured closest reading and receive no successful-entry marker.

`ui/LaunchWindow.tsx` hosts the approved shell over the still-mounted level. The
level suspends rendering and playback while the child owns time. The bridge checks
origin, source, session, request and sequence, with finite bounded ET and preferences.
It checkpoints at 10 Hz and returns an atomic final snapshot. Failure falls back to
the last valid checkpoint; returning from an aim preview never launches it.

`ui/observatory-session.ts` trims the cloned path at its visible end and appends the
exact terminal knot. A separate clock copy subtracts Earth's position and velocity
at each knot. The clock uses full 3D distance, independent of camera and display sizes.
The parent retains the original Flight reference. It restores ET after phase-reset
logic and continues the returned temporal or light-time rate. Preferences stay shared;
pan and zoom coordinates stay local to each renderer. Only an explicit camera-mode
choice changes the returned level camera. Standalone Mars replay keeps its 24-second pace.

The field chamber is a fictional graviton collector. Its appearance changes no force,
mass or fuel accounting. The Hangar Engine tab uses the same rig and an isolated
`EngineDemo` state. Drag, Charge and Release test manipulate only that demonstration.
Canvas presents a matching flat side view with an operational grip and charge control.

## Scope

Build a 3D Earth-to-Moon level in the isolated prototype workspace. The first level
locks aiming to the departure plane. A side-on orthographic camera gives the pull
gesture a clear direction. Zoom can reach from craft inspection to the full system.
Later inclination lessons can unlock the third aiming axis without replacing the scene.

The loop is aim, pull, release, flight, lunar approach and retry. Use a live dotted
preview and readable fuel gauge. Keep fine angle and impulse controls available by
keyboard. Release launches only the current computed request. If it is still computing,
show that state and launch when that exact preview resolves. Cancellation never launches.

## Visual direction

Use the approved playful observatory palette and rounded shell. The first craft is
an original compact vehicle with a rounded cream crew pod, dark panoramic visor,
cool-lit engine ring and restrained structural details. A small service drone uses
a simple expressive face and matching materials. Model these procedurally as 3D
geometry. No generated raster assets or borrowed game characters are required.

Provide a hangar view with craft, engine, crew and drone inspection. This is a design
workbench, with clear return to the playable level. Keep the game viewport fixed and
use bounded overlays. Include sound feedback for pull, launch and arrival, with mute.

## Flight boundaries

The existing interplanetary shot API cannot represent a lunar departure: it starts
at the Earth-Moon barycentre and suppresses Earth gravity after launch. Do not change
that API or the existing level definitions for this design study.

Use a prototype-only adapter around the existing generic Dopri5 integrator. Physics
stays in heliocentric km, km/s and ET, in a worker. Derive Earth centre and Moon
states from the existing validated lunar rail and Earth-Moon barycentre ephemeris.
Add Earth and Moon forces without double-counting their mass. Use one frozen request
and one returned path for preview and launch. Do not invent a curved cinematic flight.

Start from a declared parking orbit. A pull represents an impulsive departure burn.
The first objective is entry into a named lunar approach zone, not an unmodelled
landing or automatic orbital capture. Keep physical distances linear. A craft symbol
may remain enlarged for visibility; close-up vehicle inspection is a separate view.

## Acceptance

- 3D meshes and lighting, with the first lesson's aim axis locked to its plane.
- Drag and keyboard aiming, cancel, release, pause, replay and retry.
- Zoom and fit controls reaching the full Earth-Moon separation.
- Preview and launch use identical data; worker responses cannot launch stale aims.
- A measured known success, miss and Earth impact case.
- Lunar state comparison, barycentre identity and integration convergence checks.
- Labelled controls, 44 px targets, live outcomes and reduced-motion behavior.
- Phone and desktop browser verification, no page scrolling, no console errors.
- An inspectable craft family: engine, crew pod and companion drone.

## Publication and tracking

The approved observatory is published first on the existing look-prototype branch.
The lunar study is a subsequent commit on that branch. No production campaign unlock
or settled physics decision is changed. Issues are disabled on the repository;
this study follows the inherited tracking limitation until the owner enables them.

## Deviations and evidence

The root of `apps/prototype` now hosts the level. The Observatory is available as a
hosted launch window and a preserved standalone study. D19's three.js renderer owns the new surface; a Canvas
fallback retains the flight loop without claiming 3D inspection there.

The known shot starts at ET 846853269.184, a 6,571 km parking radius and a 225 degree
phase in the instantaneous lunar plane. A 3.24 km/s prograde burn enters the fixed
65,000 km approach zone after 1.582776944585 days. A 20 degree outward burn misses;
a 20 degree inward burn impacts Earth. `apps/prototype/src/lunar/flight.test.ts`
recomputes these cases with the level request. It also checks a grazing entry
between accepted knots, stale responses and cancelled releases.

The same test compares independent JPL probes below 0.1 km position error and
0.000011 km/s velocity error. A tighter integration stays within 0.05 km over the
seven-day path and 0.01 seconds at zone entry. Barycentre identity is checked below
0.000001 km and 0.000000000001 km/s. These measure the adapter against its source
model, not absolute lunar navigation accuracy. Global EMB positions still use the
existing approximate Kepler ephemeris. The production Moon package remains future work.

Weak pulls use two estimated local orbital periods, capped at one day, when their
initial two-body apogee is below 100,000 km. The full force model computes that declared
window. This avoids integrating repeated low orbits for seven days on every pointer
move. Preview and launch retain that identical window. It is a local flight study,
not proof that a craft can never leave Earth at a later date.

Scientific uses linear radii, with an enlarged craft symbol. The original 1k JPEG
textures are reused for iteration. Production KTX2 tiers and higher-resolution near
surfaces are not built here. No atmospheric weather or landing terrain is claimed.
The crew model is a design concept; the playable mass is the 700 kg collector.
The seven-second replay uses a smooth time map. Event-specific production timing and
capture burns remain outside this first slice. Reduced motion removes automatic
camera zoom and starts in system framing while retaining essential flight progress.

The final compiled entry measured 223.02 kB gzip JavaScript plus a 9.41 kB worker before
textures, fonts and cached lunar data. This is build evidence, not a measured phone
frame-rate claim.

## First playable publication validation

| Command | Result |
| --- | --- |
| `npm run gates` | Exit 0, 12 of 12 gates and 76 tests passed |
| `npm run build:prototype` | Exit 0, TypeScript and Vite build passed |
| `npx vitest run apps/prototype` | Exit 0, eight prototype tests passed |
| `npm run verify:data -w @starshot/prototype` | Exit 0, runtime hashes and astronomy references passed |
| `node scripts/verify-game.mjs --url http://127.0.0.1:8767/` with external steps | Exit 0, final phone, desktop and reduced-motion checks passed |
| Focused external browser scripts | Exit 0, 32 touch, cancellation, layout and fallback checks passed |
| Final footer and reduced-camera checks | Exit 0, no footer overlap; 56 fixed-camera flight samples passed |
| `git diff --check` | Exit 0 |

The browser pass exercised 360 px and 390 px phones, 844 by 390 landscape, a 768 px
tablet and a 1440 px desktop. It covered Guide success, a miss, Earth impact, actual
drag release, touch cancellation, keyboard aiming and the Observatory return link.
No console errors, page errors, failed requests, page overflow or undersized control
targets remained. Chromium reported screenshot-related ReadPixels GPU warnings.
Headless frame-rate smoke results do not establish the mid-range phone target.

The final reduced-motion camera uses one cached complete-flight envelope. A numerical
test checks fixed framing; the browser independently held its centre and zoom constant
from normal Guide and Launch controls through successful approach.
