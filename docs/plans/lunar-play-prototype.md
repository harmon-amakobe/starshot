# Lunar play prototype

Status: first playable design study implemented and verified; ready for branch publication.

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
amber-lit engine ring and restrained structural details. A small service drone uses
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

The root of `apps/prototype` now hosts the level. The Observatory remains separate,
with navigation in both menus. D19's three.js renderer owns the new surface; a Canvas
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

The new stage uses linear radii, with an enlarged craft symbol. The original 1k JPEG
textures are reused for iteration. Production KTX2 tiers and higher-resolution near
surfaces are not built here. No atmospheric weather or landing terrain is claimed.
The crew model is a design concept; the playable mass is the 700 kg collector.
The seven-second replay uses a smooth time map. Event-specific production timing and
capture burns remain outside this first slice. Reduced motion removes automatic
camera zoom and starts in system framing while retaining essential flight progress.

The final compiled entry measured 223.02 kB gzip JavaScript plus a 9.41 kB worker before
textures, fonts and cached lunar data. This is build evidence, not a measured phone
frame-rate claim.

## Validation

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
