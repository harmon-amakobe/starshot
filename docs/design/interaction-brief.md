# Interaction brief

Status: owner requirements captured during baseline play. Placement and transitions
below are proposals for review, not edits to the program plan or physics decisions.

## One screen, with overlays

D32 requires a game shell that fits the visible viewport. The world fills the stage;
the page does not scroll. Long menus scroll inside bounded panels. The title, close
control and primary panel action stay visible. Flight instruments use horizontal
pages instead of vertical scrolling. Swipe, previous/next buttons and arrow keys
provide equivalent ways to change pages. Playback and camera controls stay fixed.

Keep mission context at the top and the current action in a rounded bottom dock.
Camera and pause controls remain within reach. Flight instruments form a live,
translucent bottom sheet. It is nonmodal: opening Scientific, changing its detail level
or inspecting a measurement does not pause travel, block the map or trap focus.
The sheet shares space with playback controls instead of stacking above a separate
dock. It can collapse to give the map more room.

The Earth to Mars control expands a translucent Mission deck from the top. It
shows route context and replay controls while the map stays interactive. It does
not pause travel or trap focus. Planet selection opens a small action card on the
map. Both decks collapse to leave more map space on small screens.

Settings, help and end screens use a separate modal layer. Only one
modal is active at a time. Opening it pauses travel and cancels pending map gestures.
Closing restores focus and the previous playback state without advancing through
paused wall time.

The eye button beside Menu shows an open eye when the UI is visible and a closed
eye when hidden. Hiding is an explicit choice, not a timeout. It retains Show UI
and Play/Pause. Sound on/off lives in Menu beside Audio settings.
The day counter stays visible in the trip
instrument or the collapsed dock. On a narrow phone, collapse the instruments to
reach the scrubber; the expanded trip instrument already shows elapsed time.

Use dynamic viewport height and safe-area insets. Verify portrait, landscape and
200% zoom. A labelled, keyboard-focusable panel body provides a non-pointer scrolling
path. Tab remains within a modal; Escape and its visible Close button dismiss it.
The live cockpit keeps normal tab order. [Sources and rationale](game-shell-research.md)
distinguish evidence from proposals.

The Simplified cockpit has three instruments. Trip time uses a progress arc and elapsed
days. To Mars shows current craft-to-Mars separation and can draw a ruler on the map.
Route pairs distinct body symbols with the departure and destination names. Distance
can increase during a flight, so it is not presented as a completion gauge. Scientific
adds pages for the available departure measurements with their units. No fuel reserve or
editable inclination is invented.

## Simplified by default, scientific on request

The owner wants a simple pull/snap interface, with the planned fuel presentation.
Players who want exact measurements and fine controls should be able to reveal them.
These are two presentations of the same aim, preview, flight and score.

The Simplified / Scientific selector stays available in the Flight deck header,
including when the deck is collapsed. Changing it does not expand the deck.
Remember the preference.
Changing it must preserve date, aim, hint use, camera, preview and keyboard focus.
Scientific is not a difficulty mode. Camera selection is independent of this setting.
Use a smile icon for Simplified and an orbit icon for Scientific. Pair icons with
labels when space allows. The collapsed deck and compact layouts show icons only,
retaining accessible names, tooltips, selection feedback and 44 px touch targets.
Icon-only toggles use an amber glow and stronger strokes, without a pale circle.
Controls with an icon and text use a pill. With the deck open, the selected detail
mode shows its icon and label in an amber pill; the other mode shows only its icon.
Both detail controls become icons when the deck closes. Units keep their labelled pill.
World sizes are linked by default: Simplified enlarges worlds; Scientific uses
realistic sizes. Manually switching size makes it independent. A Menu option
restores the link and applies the current detail mode.

One centred button cycles Metric, Imperial and Light-time without opening the deck.
Its icon changes to a styled km, mi or plain light wave beside the current unit name.
Its tooltip and accessible name state the current units and next choice.
Simplified defaults to Light-time; Scientific defaults to Metric. Each
mode remembers its own choice. Metric uses metres or kilometres; Imperial uses
feet or international miles. Light-time shows distance in light-seconds, minutes,
hours or smaller units at close range. Trip duration remains a separate measurement.
Imperial also converts launch speed and C3. Light-time retains labelled metric
flight-dynamics measurements.

These are presentation conversions. Use exact definitions of
[light speed](https://www.bipm.org/en/si-base-units/metre) and the
[international mile](https://www.nist.gov/pml/us-surveyfoot/revised-unit-conversion-factors).
[NASA's light-time convention](https://science.nasa.gov/learn/basics-of-space-flight/chapter1-1/)
describes distance through light travel time. It does not predict a signal's arrival
at a moving receiver.

| Simplified view | Scientific view adds |
|---|---|
| Target, launch window and one clear outcome prediction | Exact date, flight days and closest approach |
| Pull gesture and a compact accessible Aim controls drawer | Existing angle and speed increments, plus Fine steps |
| Planned fuel graphic with a short cost label | Delta-v from the 200 km parking orbit, departure excess speed and C3 |
| A labelled target/action cue | Encounter, periapsis and other available measurements with units |
| Plain result and retry | The detailed flight table |

Keyboard and non-drag aiming remain available in Simplified. A player should not need
to turn on science terminology to use accessible controls.

## Measurements must remain honest

The current model has a launch cost but no fuel tank, craft mass or burn reserve.
Those arrive through PR19 and PR20. Until then, use Pull and Launch cost rather than
inventing remaining fuel or changing the meaning of an existing number.
The initial known solution costs about 3.62 km/s from parking orbit; it cannot be
presented as fitting the future 3.55 km/s starting tank without the planned model work.

Inclination is not an editable flight parameter in this chapter. D6 flattens the
game, and `vInfFromAim` returns zero out-of-plane velocity. Scientific can explain
"Flight plane: 2D". A future body-information card could show a separately sourced
real orbital inclination, clearly distinguished from the playable flight plane.
Never label an azimuth or pull angle as inclination.

The baseline's "captured" result means it reached the capture zone, not that a burn
put it into a stable orbit. Capture controls and orbital claims wait for PR20.
Snapping must update the authoritative aim before computing the preview. It must
not change the launched trajectory behind the displayed path. Keep current hint
scoring explicit until assistance scoring is separately specified.

## Travel cameras

The owner requests all three modes, zoom and the ability to pause while inspecting.
Camera controls remain labelled DOM controls in both Simplified and Scientific views.

| View | Framing | Interaction |
|---|---|---|
| Follow craft | Craft stays near centre with a modest look-ahead along travel; north stays stable | Zoom changes viewing distance. Dragging enters Free with a clear Return to craft action. No automatic camera roll. |
| System | Fit the craft and relevant departure, encounter and destination bodies; retain quiet context | Highlight current bodies with labelled rings and shape, not colour alone. Provide Fit route after manual zoom. |
| Free | Existing pan, pinch and wheel interaction | Pan and zoom while travel plays or is paused. Reset returns to System. |

Proposed normal-motion default: System while aiming, Follow craft during travel.
Remember an explicit camera choice and do not override it at encounters.
Reduced motion starts in the stable System view unless the player explicitly selects
Follow. Mode changes cut directly instead of sweeping. This default is still a proposal.

Pause freezes the presentation time, not a newly computed simulation. The craft,
planets, event cues and day counter all stop together. Camera inspection still works.
Resume resets the frame-clock anchor so paused wall time cannot create a jump.
An encounter already heard must not sound again merely because the player resumed.
Pause and camera switches cannot change the shot request, outcome or score.

Follow needs a separate camera zoom per view so a close inspection does not make
System unusable. Keep a visible scale cue and enlarged-body indication. Offscreen
target direction can be labelled when following the craft.

## World sizes and close inspection

Keep the size switch beside the scale bar. Its planet glyph and current label form
one button, changing between Worlds enlarged and Realistic size. The glyph shows
a large or small disc inside the same dotted orbit. A size change preserves time,
camera centre, zoom and every body
position. Distances stay linear in the chapter's 2D projection. Realistic bodies use
published radii or triaxial reference shapes through the position transform. Craft glyphs and
tiny-world location markers remain identifiable as markers, not physical silhouettes.

Tap a visible planet or its label for a close-up action and world notes. Overlapping
targets offer a choice. Dragging, pinching or cancelling a gesture does not select
a world. Keyboard users can select visible map targets or open Worlds in Menu,
which lists the Sun, all eight planets and 24 major moons. A close-up centres the camera
on the selected body and adjusts zoom. It follows the world's position until the player
pans or chooses another camera. The world title and subtitle sit at the map's top left.
X sits at the top right, outside the Flight deck.
X or Escape restores the camera and zoom from before inspection, including
after panning or visiting other worlds. The existing camera controls remain below.
Fit full route frames the system. These
actions preserve playback, journey time and unit choices. On short screens,
inspection temporarily collapses the decks; X restores their previous layout.
The title and X stay available while the Mission deck is open. The scale
bar uses the selected units; its length always matches the displayed value.
World-size controls hide while focused. Moons hides for bodies without major moons.
The Sun uses its physical radius and an emissive surface. Scientific or realistic
size uses a white photosphere; Simplified with enlarged worlds uses gold.
Granulation, sunspots, prominences and flare brightening are enhanced illustrations.
Play animates the activity gently; Pause freezes it. Reduced motion stops decorative
shape changes and brightening. Reference rotation still follows the journey.
Its reference rotation shares flight ET; it does not model solar weather.
Planet labels retain their names at realistic size. Symbolic location cues are
explained in world notes instead of repeating "marker" after every name.

Moons fits the selected planet and its major moons at their current distances.
Ring guides mark faint or unresolved bands with dashed location cues. They never
inflate physical widths. Every planet keeps its real pole orientation in the current
top-down ecliptic view. One clock drives the flight, spin and satellite positions.
Inspection, size changes and camera changes preserve playback speed. Slower and
faster buttons replace the speed dropdown, with a row of lit chevrons showing the
step. Simplified uses named inspection speeds and 1x to 4x replay speeds; Scientific
shows simulated time per real second. In this recorded study, 1x plays the full
trip in 24 seconds. Real time means one simulated second per real second. Speed
limits retain keyboard focus and do not wrap around.
Only Scientific with Light-time units uses distance-based replay presets: Real
time, 0.25c, 0.5c, 0.75c, 1c, 2c, 5c, 10c, 30c, 100c and 300c. At 1c, replay
covers one light-second along the recorded heliocentric path per real second.
It advances the clock along the original Hermite curve; it does not change the
physical flight. Worlds use the same resulting ET. Real time still advances one
simulated second per real second. Simplified retains its temporal replay controls
with every unit choice. The c pace is remembered separately from the temporal pace.
Double-clicking anywhere on the speed pill resets to real time. Double-tap provides
the same shortcut on touch screens. The central speed readout supports Enter or
Space as the keyboard equivalent. Resetting speed preserves playback and position.
Hyperion and Nereid have no spin model in this study; disclose that in their notes.

The shell study now uses the original simulation knots and the existing Hermite
sampler (`packages/physics/src/simulate.ts:239`). Planet positions use the unchanged
ephemeris at the same ET. Its previous 161 rounded display frames were insufficient
for close inspection. View changes never recompute a different flight.

Low-orbit craft shots require the planned departure and capture work. The current
patched-conic departure starts at the Earth-Moon barycentre (`packages/physics/src/launch.ts:8`).
First light uses an enlarged capture zone (`apps/game/src/levels.ts:151`). Do not
move a craft toward a surface to make a close-up attractive. The current inspector
can show planetary detail without claiming an unmodelled orbit or craft dimension.

## Source anchors

Line numbers describe the current prototype base and may move. Locate by symbol.

- [D6 and D18](../decisions.md): flattened chapter, identical preview/launch and planned fuel model.
- `apps/game/src/sim/shot.ts:82`: `ShotRequest`; no tank or inclination control.
- `apps/game/src/sim/shot.ts:240`: `ShotAnalysis`; available cost and encounter measurements.
- `apps/game/src/sim/shot.ts:363`: `vInfFromAim`; in-plane departure vector.
- `apps/game/src/ui/Controls.tsx:86`: current readouts and fine controls.
- `apps/game/src/ui/GameScreen.tsx:379`: displayed sample and scene construction.
- `apps/game/src/ui/GameScreen.tsx:448`: flight playback clock.
- `apps/game/src/render/camera.ts`: existing projection, pan, zoom and fit operations.

## Verification for implementation

Use the same known shot in each disclosure and camera combination. Switching views
must leave the request and final result identical. Test paused time while panning,
resume without catch-up, and repeat encounters without duplicate audio.
Verify pointer, keyboard, touch, muted and reduced-motion paths. Test a narrow phone
and landscape layout with science expanded. Measure frame time on the owner's phone;
headless requestAnimationFrame counts are not that measurement.
