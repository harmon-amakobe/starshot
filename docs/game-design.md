# Game design

Starshot is a slingshot game in orbit: extend the craft's engine ring, let go, and try
to reach another planet. Everything in the flight is real: the planets are where NASA
says they were (or will be) on that date, and your probe is pulled by the Sun and the
planets all the way.

## The core loop

1. **Pick a mission.** Each level names a target planet and a real launch window, for
   example "Mars, late 2026".
2. **Choose a launch day** inside the window. The planets move to where they really are
   on that day.
3. **Aim.** Pull the rear engine ring away from the anchored collector. The direction
   sets the heliocentric departure excess velocity; the length adds speed. A dotted
   line shows exactly where it will fly.
4. **Release** and watch. Release or Launch captures the final aim and waits until
   its dotted path has been computed, then flies exactly that line. Time speeds up in empty space
   and slows down near planets so you can see close passes.
5. **Score** stars, see your numbers (fuel cost, flight time, closest approach), then
   try again, replay the shot, try for more stars, or move on.

The fun comes from a real orbital puzzle: you cannot aim straight at Mars, because Mars
will have moved by the time you arrive. You aim ahead of it, and the Sun's gravity
curves your path into an arc. Get the timing right and the trip needs less launch speed.

## Controls

Every action has a button, so the game works with touch, mouse, keyboard or a screen
reader.

**Touch and mouse**

- Pull the rear engine ring to aim; release to launch. Short taps are ignored.
- Pinch or use the mouse wheel to zoom. Drag empty space to pan; hold Shift while
  dragging to orbit the Free camera. Follow and System remain one button away.
- Use the top mission deck for the launch date. The bottom flight deck has Overview,
  Fine aim and Telemetry pages, with both swipe and button navigation.
- During flight, use pause, the timeline and speed steps. Double-click the speed pill
  for real time. Scientific Light-time uses apparent multiples of c for replay pacing.

**Keyboard** (while aiming)

| Key | Action |
|---|---|
| Left / Right arrow on the engine handle | Rotate the aim by 1° |
| Up / Down arrow on the engine handle | Change departure excess speed by 0.05 km/s |
| Fine aim number fields | Enter exact angles to 0.01° and speeds to 0.001 km/s |
| Space or Enter on the engine handle | Launch the current aim |
| Escape during a pull | Cancel the release |
| Escape in a close-up or hangar | Return to the previous view |
| Escape during ordinary play | Open the main menu |
| Tab and Enter | Reach and activate every other labelled control |

The current controls live in `apps/game/src/campaign/`. The old `GameScreen.tsx`
remains a reference and is not the default route. The compact dashboard retains
Launch/Pause, cameras, units and detail toggles. Menus may scroll inside their own
window; the game shell and flight deck do not scroll vertically.

## Scoring

Each mission awards up to three stars (`apps/game/src/scoring.ts`):

| Star | How to earn it |
|---|---|
| 1 | **Hit**: reach the target's capture zone, which is its sphere of influence (the zone where its gravity takes over from the Sun's), or its surface. On level 1, First Light, the capture zone is a training zone three times the real size, and the game says so |
| 2 | **Efficient**: a launch costing no more than 10% above the level's *par* (the cheapest shot found in the window); 5% on the Grand Tour, where 10% would allow nearly the full slingshot speed |
| 3 | **Skill**: a *bullseye* (passing within 10 planet radii of the target) or, on a flyby level, swinging through the required planet on the way |

- A miss scores zero stars, however close it came.
- Using a **hint** caps that attempt at two stars, and the game says so.
- The **sandbox** has no par, so it awards at most two stars.
- The cost shown is the *delta-v* (change in speed) a rocket would need from a 200 km
  parking orbit around Earth, the number real mission planners compare.
- Progress (best stars and cheapest hit per level) is kept on the device only
  (`localStorage`). Each campaign level unlocks after earning a star on the one before.
  Labelled playtest access can open all cards without granting stars or changing
  those earned unlocks. Pilots keep independent progress and saved flights.

## Presentation and physical state

Simplified defaults to enlarged worlds and Light-time distances. Scientific defaults
to realistic radii and Metric units. The unit pill also offers Imperial distances;
independent world-size changes decouple sizing from detail mode. Planet centres,
route samples and displayed linear distances stay in the campaign's flattened frame.

The collector is an enlarged control symbol with a leader to physical departure at
Earth centre. Its engine extension represents charge, while the fuel meter represents
`deltaVFromLeo` as a percentage of the level's maximum departure burn. Earth escape
still costs fuel at zero excess speed. The existing campaign does not simulate the
local parking orbit used by the separate Moon study.

Launch window, inspection and return share the current campaign session. Date changes
are locked after launch. The next stage of inclination-based progression is not part
of this integration; moving a 3D camera does not change this chapter's planar dynamics.

## Level philosophy

- **Real windows only.** Every level is a launch window a real spacecraft could use, in
  the game's physics. Windows are found with the physics package's Lambert search
  (`bestDirectTransfer`), and each level's blurb states a fact you could check.
- **Solvable, and proven so.** Every campaign level carries a known solution in
  `apps/game/src/levels.test.ts`, flown with the game's exact simulator settings on
  every change. A level cannot quietly become impossible.
- **Par from measurement.** Par values come from the cheapest shot actually found in
  the window, with the source written next to the number: the cheapest direct transfer,
  or on the Grand Tour the cheapest Jupiter-assisted hit a fine search found.
- **One level, one set of physics settings.** Each level freezes its own simulator
  settings, and its preview, launch, hint and tests all use them, so the dotted line
  is the flight (decision D6).
- **Gravity assists are earned, not scripted.** The Grand Tour level is only solvable
  through Jupiter; the tests check that no direct shot under the speed cap reaches
  Saturn, and that without Jupiter's gravity no shot on a coarse grid does.
- **Honest scale.** The game view is drawn to a linear scale, so the angle you see is
  the angle you get.

The campaign at the time of writing:

| # | Level | Target | Window |
|---|---|---|---|
| 1 | First Light | Mars (training capture zone, 3× real) | late 2026 (the real 26-month Mars window) |
| 2 | Morning Star | Venus | early 2028 |
| 3 | Big Game | Jupiter | late 2028 |
| 4 | Grand Tour | Saturn, via Jupiter | August 1977, like Voyager 2 |
| none | Sandbox | any planet | from today's date |

How to add one: [CONTRIBUTING.md](../CONTRIBUTING.md#how-to-add-a-level).

## Accessibility

Accessibility is built in from the first version, not added later:

- Every control is a real, labelled button or slider, reachable with the keyboard.
- Aiming does not require dragging: the fine-tune buttons and arrow keys do everything a
  drag does.
- Outcomes and status changes are announced to screen readers through a polite live
  region.
- `prefers-reduced-motion` is honoured: shorter animations and no pulsing effects.
- Colour never carries meaning on its own; text labels accompany it.
- Touch targets are at least 44 CSS pixels.
- Numbers use plain units (km, km/s, days).

## Roadmap

These are ideas in rough priority order, each to be its own stacked pull request. None
is promised.

1. **3D orrery** (`apps/orrery`): an explorable 3D map of the Solar System with a time
   scrubber, built with three.js and React Three Fiber on the same ephemeris
   ([architecture](architecture.md#future-a-3d-map-of-the-solar-system-appsorrery)).
2. **Daily challenge**: one puzzle a day using today's real planet positions, the same
   for everyone, with a shareable result.
3. **Kiswahili localisation**: the interface translated into Kiswahili. Translations
   ship only after review by a native speaker.
4. **"Sky tonight"**: what is above your horizon right now and where to look, using the
   open-source [astronomy-engine](https://github.com/cosinekitty/astronomy) library.
5. **Satellites**: track Earth satellites using [satellite.js](https://github.com/shashwatak/satellite-js),
   the standard SGP4 orbit model, with orbit data cached daily.
6. **More levels**: Mercury, the outer planets, and multi-flyby tours.
7. **Leaderboard** (only with a separate, Starshot-only backend; see
   [hosting.md](hosting.md) and decision D7).
