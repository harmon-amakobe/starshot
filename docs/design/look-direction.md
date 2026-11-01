# Chosen look direction

D32 records the owner's choice: Pocket observatory's playfulness, Deep field's
rounded forms, and a single-screen game shell. The details below are starting points
for iteration, not new physics or performance claims.

## World and shell

The sky fills the screen. Planets carry colour and light. Rounded controls leave the
current route clear. The live cockpit is translucent; reading menus are opaque. No hero heading,
audio section or footer sits below the game. Menus overlay the world and disappear
when dismissed. Menu bodies may scroll. The flight deck uses horizontal instrument
pages with fixed controls and no vertical scrolling.

| Role | Starting treatment |
|---|---|
| Shell base | `#0B0B0C` |
| World backdrop | Near-black blue, with quiet depth rather than animated grain |
| Main text | `#E8E6E1` |
| Metadata | `#8C8C90`, checked against the actual surface |
| Player | `#FFB000`, `#FFC24D`; craft, pull, primary player action and earned outcome |
| World colour | Cyan Earth, coral Mars and distinct body colours in the study; approved real imagery in the game |
| Controls | Rounded 24 px pills and 26 to 30 px panels as starting values |
| Boundaries | A neutral stroke with enough contrast to identify controls; decorative grey alone is insufficient |
| Type | IBM Plex Mono only; 400 body, 500 labels, 700 primary action, 300 or 400 for large quiet titles |

## Screen hierarchy

- Top: mission, compact wordmark and a labelled Menu control.
- World: target and departure body labels, craft, predicted path, scale and body-size cue.
- Bottom: a live cockpit with Trip time, To Mars and Route instruments, plus the
  current primary action and camera selection. Scientific adds instrument pages.
  On narrow screens, the camera selector becomes a cycle button with distinct
  Follow, System and Free icons and the
  route sits above the two numeric instruments. Collapse the sheet for more map space.
- Top Mission deck: route context expands downward without pausing travel.
- Secondary layer: menus, sound, help and results in one active modal.
- Eye beside Menu: open when UI is visible, closed when hidden. Show UI and
  playback remain available.

The cockpit remains live and leaves map controls active. Its distance readout can
draw a ruler on the map, connecting the number to its meaning. Use symbols, spatial
relationships, short labels and units together; do not assume an icon alone is understood
across languages. Test comprehension with players rather than claiming universal meaning.

Simplified uses a smile icon; Scientific uses an orbit icon. Expanded controls pair
the icons with their names. Collapsed and compact controls retain the icons,
accessible names and tooltips. Selected icons glow amber with stronger strokes.
The selected mode becomes a labelled amber pill when the deck opens. The other
mode stays an icon. Both become icons when the deck closes, while units keep their
icon and name in a pill. Both modes remain usable while collapsed. They link to enlarged and
realistic sizes by default; a manual size choice overrides the link. Instrument
pages support swipes, buttons and arrow keys.
One button in the centre of the deck header cycles Metric, Imperial and Light-time.
Its amber icon changes between styled km, mi and a plain waveform, beside the unit name.
Its tooltip and accessible name explain the current and next units. Each mode remembers its own
choice, initially Light-time for Simplified and Metric for Scientific. Imperial is
also available. Keep "light" visible in distance units to distinguish them from time
spent travelling. Scientific with Light-time units offers fractional and whole c
replay steps. Simplified keeps its existing temporal steps. Double-click the speed
pill to return to real time.

A modal pauses travel, makes world controls inert and cancels pending drags. Close
returns focus to the opener. Resume uses a fresh clock anchor. A panel header and its
primary action never scroll away. See the [interaction brief](interaction-brief.md).

## Voice

The flight computer is brief, useful and slightly fond of the craft. Put guidance
before humour. Do not comment on the player's intelligence or repeat a joke on each tap.

| Situation | Starting line |
|---|---|
| Ready | Ready when you are. |
| Paused | Paused. Space can wait. |
| Travelling | On our way. |
| Arrival | Hello, Mars. |
| Route complete | 303 days. One small craft. |
| Help | Make yourself at home. |

The 303-day line belongs to the recorded First Light route. Other routes use their
actual duration. A miss should name an available adjustment rather than deliver a joke.

## Motion and sound

Use Pocket's short anticipation and release responses with Deep field's stable,
unhurried framing. Start with 120 to 140 ms control and panel responses. No decorative
camera drift or automatic roll. Reduced motion shows final decorative states at once;
flight timing continues to follow D18.

The combined sound sketch pairs rounded plucks with soft sine and glass overtones.
A 76 BPM phrase is a starting audition, not a locked soundtrack. Immediate input cues
do not wait for the beat. Music and effects have separate settings; a global sound
control reflects both. Volume changes affect playing voices. Pausing stops movement
music and closing an audition panel stops its preview. Arrival has a short resolving cue.

Sound starts only after a deliberate interaction. Limit concurrent voices and handle
unavailable audio without leaving a control falsely enabled. Muted play remains complete.

## Rendering and honest detail

Keep D19's three.js presentation and Canvas fallback. Batch the star layer; cache the
fallback background. Give atmosphere, cloud and ring detail to bodies large enough
on screen to benefit. Keep route geometry crisp. Measure performance on a phone before
claiming 60 fps. The external shell study is a Canvas lighting sketch, not that renderer.

D15 still determines imagery and catalogue sources. The study's stars are decorative.
Its eight planetary maps come from
[Solar System Scope](https://www.solarsystemscope.com/textures/), under CC BY 4.0.
The Moon uses [NASA's CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/).
Local 1k display copies are projected onto reference shapes and lit in a worker. Source and
display hashes, attribution and transformations are recorded with the study assets.
Axes and rotation use [NAIF pck00011](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc).
Cloud maps are static illustrations, not a weather model. Other moons have untextured
reference shapes. The current camera looks down the ecliptic; Saturn's rings look
nearly circular from this direction. Ring brightness is illustrative.
The game's production textures and catalogue retain D15's separate asset pipeline.

Place the combined size glyph and label beside the map's scale bar. Tap a world for
a close-up action card. The Sun is selectable too. Menu contains the Sun, eight planets and 24 major
moons. Moons fits the selected planet's local system. Fast-forward controls replace
the speed dropdown. Close-ups put the title and subtitle at the map's top left,
with X at the top right. These sit outside the Flight deck.
X restores the previous camera and zoom. Use the existing camera controls below
to change view. Hide the world-size button while focused and Moons when absent.
Simplified shows replay multipliers and named inspection speeds;
Scientific shows simulated time per second. Inspection preserves the chosen speed.
Spin, orbits and the flight share ET.
Zooming must preserve the same distance and radius scale,
including visible planetary limbs when the centre is off screen. The craft remains
a labelled marker until physical craft dimensions and local flight are modelled.

The study replays the unchanged known First Light shot. Simplified and Scientific show the
same recorded route. No invented fuel tank, inclination control, aiming simulation
or capture burn is added. The current model limits in the interaction brief still apply.

## Next implementation step

Adopt the approved shell and title/menu inside `apps/game` in a bounded iteration.
Then integrate the map and existing accessible aiming controls, followed by flight
cameras, sound and results. The owner can adjust the shell study before that adoption.
