# Local look prototype

Status: owner-authorized branch publication, followed by a playable lunar study.
This does not publish a site or replace the V1 program specs.

## Repository packaging

Preserve the approved launch-window study in `apps/prototype/public/observatory/`.
Use an isolated Vite workspace with `npm run dev:prototype` and
`npm run build:prototype`. Keep the production game and its physics unchanged.
Copy only runtime dependencies and validated data. Extract inline fonts into local
WOFF2 files. Credit textures, fonts and NASA/JPL data with source links, hashes and
REUSE records. Keep screenshots, test output and scratch installers out of the tree.
Make generation and validation tools portable. Preserve the current visual behavior.

Publish on `starshot/look-prototype`, based on `starshot/pr0-bootstrap`.
Do not modify either the bootstrap branch or other implementation branches.
Issues remain disabled on the repository, so no issue can be claimed for this study.
Record this inherited tracking limitation rather than enabling repository settings.

The owner selected Pocket observatory playfulness with Deep field's rounded forms.
The shell uses a nonmodal bottom cockpit, swipeable instrument pages, Simplified
and Scientific modes, Follow/System/Free cameras, and no document scrolling.

## Current pass

- Preserve the recorded First Light shot and existing physics.
- Keep the combined size icon and label beside the scale bar. Changing size preserves
  positions, camera and time. Map selection opens world actions; Menu lists all
  eight planets and 24 major moons.
- Expand mission context into a nonmodal top deck. Menus and end screens retain
  the separate modal layer.
- Keep mode toggles usable with the Flight deck collapsed. Link Scientific to
  realistic sizes and Simplified to enlarged sizes until the player overrides size.
- Move sound into Menu and use an open/closed eye beside Menu for UI visibility.
  Selected icon toggles use an amber glow and stronger strokes.
- Use bounded fast-forward steps with replay multipliers or scientific time units.
  Preserve speed during inspection and camera changes.
- Add per-view unit choices: Light-time by default in Simplified, Metric in
  Scientific, and Imperial available in both. Convert displayed distances and scale
  bars without changing positions. Imperial also converts speed and C3.
- Centre one cycling unit button, showing styled km, mi or a plain waveform beside
  the current unit name.
  Keep it usable with the deck collapsed. Use c replay presets only in
  Scientific with Light-time units. Keep the recorded route and shared ET, measuring
  distance along its Hermite curve. Simplified retains temporal replay steps.
- Reset the speed pill to real time on double-click or double-tap, with a keyboard
  equivalent on its central readout. Remove repeated "marker" suffixes from names.
- Use NAIF/IAU axes and signed spin with periodic terms, evaluated at flight ET.
- Use cached geometric JPL satellite states. Derive Earth's centre from EMB.
- Show ring systems in their physical planes, with optional symbolic guides.
- Verify source interpolation, rotation matrices, shared pause, close-up controls,
  small screens and existing cockpit interactions.
- Give close-ups an X that restores the previous camera and zoom. Keep the existing
  camera controls below. Keep return controls after panning and switching inspected worlds.
  Place the title and subtitle at the map's top left and X at the top right.
  Preserve playback and unit preferences. Escape closes the topmost active layer.
- Hide world-size controls while focused and Moons when no major moons exist.
- Make the Sun selectable on the map and in Worlds, with a physical-radius close-up.
  Preserve the existing flight. Solar-orbit missions remain future gameplay work.
- Use a white Sun in Scientific or at realistic size. Simplified with enlarged
  worlds uses gold. Add procedural granulation, sunspots, prominences and localized
  flare brightening. Pause freezes activity. Reduced motion stops decorative shape
  changes and brightening; reference rotation still follows the journey.
- Give labelled icon controls a pill. The selected detail mode shows its label only
  with the deck open; the other mode stays an icon. Closed mode controls are icons.
  The Flight deck disclosure has no separate pill; the deck provides its container.

Sources, the moon list and proposed production acceptance criteria are in
[plan proposals](../design/plan-proposals.md#planetary-systems-in-the-local-study).
The [interaction brief](../design/interaction-brief.md) describes player controls.

## Deviations and limits

Solar activity is an enhanced illustration, not a measurement or weather model.
Its gentle animation uses elapsed playback time so large replay rates cannot cause
rapid flashing. Reference rotation and body positions still use flight ET.
Sunspot patterns are fixed in body coordinates. Decorative activity does not claim
dated events, measured timescales or a literal single-exposure view of the Sun.

The expanded prototype is a standalone local app because its cached satellite
states exceed the compact inline study's size budget. The earlier inline study is
retained as a snapshot. The game packages and D19's production renderer are unchanged.

The current camera is an orthographic view down the ecliptic. Planet centres retain
the flattened Kepler model. Satellites use three-dimensional local JPL vectors.
Satellite interpolation accuracy does not imply equally precise global positions.
The departure and capture approximations still prevent authentic low-orbit craft shots.

Ring geometry uses mean circular bands and approximate dust envelopes. Saturn's
inclined Phoebe dust ring and minor moon-associated arcs are catalogued rather than
given invented geometry. Neptune's arcs have no dated longitude model in the study.
Unknown widths remain guide locations. This is recorded as unfinished rendering
detail, not omitted from the future renderer's scope.

Hyperion and Nereid lack spin models here. Other than Earth's Moon, major satellites
currently use untextured reference shapes. Static cloud maps do not model weather
or atmospheric circulation. Realistic mode changes physical size, not these limits.

## Validation evidence

The approved Observatory was published on `starshot/look-prototype`: snapshot
`42717a5`, followed by notice whitespace and hash cleanup in `ab15fba`.
The publication passed all 12 gates and 68 tests. Packaged browser verification passed
on phone, desktop and reduced-motion phone with exit 0. Asset and data checks exited 0.
No pull request was opened, following the owner's earlier ask-before-PR instruction.

The data preparation compares 207,651 withheld midpoint states against interpolation.
The largest measured local error is 0.744 km. Phobos and Deimos remain below 0.006 km.
The JavaScript evaluator also checks independent non-midpoint and endpoint probes.
Ninety-three orientation bases agree with CSPICE N0067 within 1.8e-11 per matrix component.
These measure agreement with source models, not their absolute uncertainty.

The first browser pass caught a Horizons uniform-step endpoint that ended less than
2 ms early. Measured padding states now bracket the replay. No extrapolation or
coverage-threshold relaxation is used. A review also corrected craft occlusion to
use the displayed Earth centre and the projected reference shape.
