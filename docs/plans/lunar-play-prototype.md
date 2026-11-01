# Lunar play prototype

Status: first playable design study, authorized by the owner.

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

Record implementation limits and measured validation here as the study develops.
