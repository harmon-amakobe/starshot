# Game design

Starshot is a slingshot game in orbit: pull back a slingshot on Earth, let go, and try
to reach another planet. The twist is that everything is real: the planets are where NASA
says they were (or will be) on that date, and your probe is pulled by the Sun and the
planets all the way.

## The core loop

1. **Pick a mission.** Each level names a target planet and a real launch window, for
   example "Mars, late 2026".
2. **Choose a launch day** inside the window. The planets move to where they really are
   on that day.
3. **Aim.** Pull back from Earth like a slingshot. The direction sets where the probe
   goes; the length of the pull sets how fast it leaves Earth. A dotted line shows
   exactly where it will fly.
4. **Launch** and watch. The launch button waits until the dotted line for the aim on
   screen has been computed, then flies exactly that line. Time speeds up in empty space
   and slows down near planets so you can see close passes.
5. **Score** stars, see your numbers (fuel cost, flight time, closest approach), then
   try again, try for more stars, or move on. You can share a short text summary of
   your result.

The fun comes from a real orbital puzzle: you cannot aim straight at Mars, because Mars
will have moved by the time you arrive. You aim ahead of it, and the Sun's gravity
curves your path into an arc. Get the timing right and it looks effortless.

## Controls

Every action has a button, so the game works with touch, mouse, keyboard or a screen
reader.

**Touch and mouse**

- Drag back from Earth to aim; release to set the aim. Short taps are ignored.
- Pinch (two fingers) or the mouse wheel to zoom; drag with two fingers, or with
  Shift/Ctrl/Alt or the right mouse button held, to move the view.
- Buttons for: one day earlier/later, a launch-date slider, fine angle and speed
  steps, "fine steps" mode, hint, and launch.
- During the flight: **Fast-forward** and **Skip to end**.

**Keyboard** (while aiming)

| Key | Action |
|---|---|
| Left / Right arrow | Rotate the aim by 0.1° (Shift: 1°) |
| Up / Down arrow | Speed up or slow down by 0.01 km/s (Shift: 0.1 km/s) |
| Alt + arrow, or **F** | Fine steps: one tenth of the above |
| `[` and `]` | Launch one day earlier or later |
| Space or Enter | Launch |
| H | Show a hint, then press again to use it |
| R or 0 | Fit the view to the mission |
| + and − | Zoom in and out |
| Esc or S (during flight) | Skip to the end |

The key map is defined in `apps/game/src/ui/GameScreen.tsx`; if the two ever differ,
the code is right and this table needs updating.

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
| — | Sandbox | any planet | from today's date |

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
