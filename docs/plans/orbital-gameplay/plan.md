# Local orbital gameplay

Issue [#14](https://github.com/harmon-amakobe/starshot/issues/14), decisions D33 and D38.
The owner accepted the local preview and requested a pull request and release to
beta and production on 2026-11-03. Use the existing D35 candidate and D37 promotion
process before handing off the remaining program.

## Scope

Connect the tested Moon study to the existing campaign and worker. Preserve the
approved menu, craft art, planetary shot model and known solutions. New pilots start
at Moonshot. Existing pilots keep saved sessions, stars and previously earned access.

The parking craft follows a circular Earth-relative initial condition at 200 km
altitude. Its fixed plane is the Moon's orbital plane at 2026-11-02 01:00 UTC.
The coasting clock has a separate epoch. Play advances ET and phase at the displayed
rate; reduced motion begins paused. Pulling freezes ET before changing the burn.
Cancelling restores the prior aim and coasting state without launching.
Each pilot defaults to Plan and launch: releasing accepts the aim and keeps time
paused for inspection and adjustment. The optional YOLO setting launches on
release. The captured mode and pilot must still match; changing settings never launches.

At paused ET, Orbit position deliberately chooses a new circular initial condition.
Changing Launch date preserves that Earth-relative position and velocity, while the
Moon moves to the selected date. This planning control is not a free in-flight burn.
The worker starts the burn from the exact same state used by the scene. It then
integrates Sun, Earth and Moon gravity. Success is first entry into the real lunar
sphere of influence, not capture into lunar orbit.

## Acceptance

- Craft follows the craft. Orbit fits the complete parking ring or computed path.
  System fits the relevant full planetary or lunar orbits and the flight path.
- Wheel and pinch retain their world point. Inspecting a body keeps the path visible.
  Distances use a linear kilometre scale. Enlarged symbols have true-position markers.
- Date, phase, Pause and Play controls stay visible and labelled. Fine aim uses a
  burn from prograde on Moonshot and the unchanged excess velocity on planetary missions.
- Direct pulling retains at least 160 pixels of input range even on short screens.
  Both kinds retain numeric fine controls and keyboard aiming.
- Solid orbit lines, the dotted forecast, target at arrival and the labelled closest
  approach connector remain distinguishable. The Moon overview is one button away.
- Both release modes preserve the exact frozen shot with a pending preview. Plan
  mode waits for explicit Launch; YOLO waits for the matching preview. Cancel,
  mode changes and profile restore cannot launch a stale request.
- Hit, miss, Earth impact, retry, replay and next mission work through the worker.
  A saved sub-day launch restores the same request. Stale worker answers cannot launch.
- v1 pilots migrate into a separate v2 key without changing v1 or legacy progress.
  One invalid pilot does not discard the others. Playtest access records no unearned stars.
- Phone, short landscape, desktop, reduced motion, Canvas and WebGL are checked locally.

## Deliberate deviations from the saved PR3a and PR3b specs

1. Build the two slices together before the saved screen split. Do not import the
   unreviewed saved refactor. Its source remains available for the later program.
2. Keep the original planetary catalogue and types intact. `missions.ts` adds the
   typed lunar level and campaign order; this avoids changing planetary solutions.
3. Reuse the study's measured 3.240 km/s guide at 01:00 UTC and phase 225 degrees.
   The same value is an explicitly labelled reference par, not a global optimum.
   A broader optimal-burn search remains future work. The guide is re-flown in the worker.
4. D38 separates fixed plane, coasting epoch and date selection. The circular parking
   model is an initial-condition approximation. Only the released trajectory uses the
   full lunar force model. No visual orbit substitutes for the launch state.
5. Preserve the study's Earth GM digits to retain its numerical oracle. Planetary
   constants remain unchanged. Both values represent Earth's own mass, excluding the Moon.

## Verification and handoff

Run `npm run gates`, both app builds and the focused lunar tests. The lunar tests
retain JPL probes and barycentre identity, first SOI entry, deterministic preview
and launch, circular closure and fixed-position date changes. Campaign tests cover
migration, playtest scoring, guide ownership, saved launch ET and camera bounds.
Browser evidence must show actual pointer and keyboard interaction, a measured hit
and miss, profile restoration and responsive layouts. Record exact commands and
exit codes at handoff. CI generates the version proposal; stage the stable candidate
on beta and promote those exact bytes after hosted verification and owner approval.
