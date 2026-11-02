# Proposed plan changes from the look prototype

Status: proposals for the owner. The program specs have not been changed.
The owner selected Pocket observatory plus Deep field's rounded forms in D32.
Detailed visual and sound parameters remain open to iteration.

| Spec | Proposed addition |
|---|---|
| PR19, craft and fuel | Separate compact fuel presentation from scientific readouts. Show cost, planned brake and reserve from the real budget. Keep a small km/s value available, as D18 requires. Do not invent a tank in the current baseline. |
| PR20, capture | Simple hold-to-burn action with the detailed burn and periapsis values in Scientific. Keep current capture-zone entry distinct from future stable orbit capture. |
| PR21, lock states and cues | One shared semantic state model feeds Simplified and Scientific. Preserve all six cue channels. Snap the authoritative aim before preview. Specify how assistance differs from a scored hint. |
| PR22, time map | Add Pause/Resume to presentation time. Freeze body positions and encounter cues together. Reset the wall-clock anchor on resume. Assert identical final outcomes across pause schedules. |
| PR23, launch window | Prototype Simplified / Scientific selection here, then retain access during aiming. Switching view preserves the selected day, aim, preview and assistance history. |
| PR25, renderer | Add Follow craft, System and Free cameras over the same simulation. Use a viewport-filling shell with bounded overlay panels and no page scroll. Keep zoom, visible scale, labelled enlarged bodies, accessible controls and Canvas fallback. Reduced motion removes camera sweeps. |
| PR26, textures | Tier atmosphere, clouds and ring shadows by projected body size and measured device budget. Texture and material limits apply to Follow close-ups as well as System view. |
| PR27, stars and sky | Catalogue magnitude/colour hierarchy, cached fallback sky, route legibility and no forced decorative twinkle. Distinguish aesthetic effects from astronomical data. |
| PR28, audio and haptics | Define an event palette and optional adaptive music. Cue input immediately, rate-limit fine adjustments, honour pause, and avoid replaying event sounds on resume. Text and visual equivalents work while muted. |
| PR29, settings | Persist Simplified / Scientific and preferred camera independently from music, effects, haptics and reduced motion. Settings use one active modal with focus containment, Escape dismissal and focus return. The live flight deck stays nonmodal and uses swipeable instrument pages. Pause belongs to the current playback session. |

The owner requested a merged shell study before implementation. It uses a recorded
flight and does not add aiming or a fuel model to the game.

First playable game iteration: title and menu in the chosen shell.
Second: one level map with real imagery and a dense catalogue sky.
Third: pull, flight cameras, pause and procedural sound, respecting available model data.
Fourth: result screen and the technical-details disclosure.

Each iteration retains the full gates, development-server browser checks and the
production-build verifier. The development check must enter a level and prove the
canvas drew, since a title-screen smoke check missed the previous blank-map defect.

## Planetary systems in the local study

The owner selected all eight planets, ring systems and major moons. The current
coverage is Moon; Phobos and Deimos; Io, Europa, Ganymede and Callisto; Mimas,
Enceladus, Tethys, Dione, Rhea, Titan, Hyperion, Iapetus and Phoebe; Ariel, Umbriel,
Titania, Oberon and Miranda; Triton, Nereid and Proteus. This is 24 moons, not the
full catalogue of small irregular satellites.

For PR25 and PR26, add body-fixed axes, signed rotation, satellite inspection and
ring-plane occlusion to acceptance criteria. Use the same ET for every presentation
state. Keep source interpolation errors separate from the underlying ephemeris error.
Use IAU periodic orientation terms, not only a fixed tilt and a nominal spin period.

The external study uses geometric, parent-centred [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)
states and validates interpolation against held-out states. Its planets retain the
existing Kepler model; local moon accuracy does not make global positions precise.
Earth's centre is derived from EMB using the Moon vector and
[DE440 masses](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc).
The recorded shot and game physics remain unchanged.

### Explicit study limits

- The Sun is selectable and inspectable. Its radius of 695700 km and IAU reference
  orientation come from the [NAIF PCK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc),
  checked against CSPICE. The luminous surface and glow are illustrations.
  Scientific or realistic size shows a white photosphere, consistent with
  [NASA's description of visible solar light](https://science.nasa.gov/reference/the-heliopedia/).
  Simplified with enlarged worlds uses gold. Granulation and sunspots are procedural.
  The animated limb loops represent [prominences](https://www.nasa.gov/image-article/what-solar-prominence/);
  localized brightening suggests [flares](https://science.nasa.gov/sun/solar-storms-and-flares/).
  Contrast is enhanced: the bright photosphere normally overwhelms much of the
  [outer atmosphere](https://science.nasa.gov/sun/facts/). These are not observed events.
  [Solar rotation varies with latitude](https://science.nasa.gov/sun/facts/);
  this reference-frame rotation does not model differential rotation or solar activity.
  Inspection adds no new flight or orbit. Solar-orbit gameplay must separately
  address the current simulation boundary at ten solar radii.

- [NAIF's text orientation model](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc)
  is an approximation. Hyperion and Nereid have no animated spin model here.
- [PDS ring dimensions](https://pds-rings.seti.org/) supply mean circular bands.
  Narrow unresolved bands have optional dashed guides. Diffuse ring envelopes are
  simplified; opacity is an artistic exposure, not measured optical depth.
- Saturn's inclined Phoebe dust ring and minor moon-associated arcs are catalogued
  in world notes, not drawn with invented geometry. Neptune's Adams arcs have no
  dated longitude model. Unknown ring widths remain guide locations.
- Moon imagery comes from [NASA's CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/).
  Other major moons currently show untextured reference shapes. Cloud maps do not
  simulate atmospheric circulation or current weather.
- The expanded study is a standalone local app with cached assets and data. The
  earlier compact inline study remains a snapshot. Neither changes D19's production
  renderer choice or claims phone performance without a device measurement.
