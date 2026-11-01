# Game feel rubric

For judging anything a player sees or touches, as a person meeting it for the first
time on a phone. Separate **defect** (reproducible, has a right answer) from **taste**
(an opinion the author may decline), and label which you are reporting.

## Clarity and affordance

- If the screen needs a sentence to explain how to aim, the control is the problem.
- The slingshot looks pullable; the launch is obviously the primary action; nothing
  static looks interactive.
- The preview line reads as a prediction, and it is exactly the flight (D6). A preview
  that differs from the launch is a blocker, not a feel issue.
- Targets, flyby requirements and the win condition are visible before the first shot.

## Juice, with restraint

- Anticipation: the pull stretches, the probe and trail respond as the aim changes.
- Release: a short, clear launch beat (sound off by default until the player opts in).
- Flight: time compression is shown (a date or day counter), the camera eases, never
  snaps.
- Outcome: arrival, flyby and miss each have a distinct, quick payoff and a next action.
- Every effect has a reason. Anything over ~300 ms on a repeated action feels sluggish
  by the fiftieth time.

## Mobile ergonomics

- Primary controls sit in thumb reach; nothing important under the notch or home bar
  (safe-area insets respected).
- Touch targets at least 44 by 44 CSS px; no hover-only affordance.
- The canvas uses `touch-action: none` for aiming only; the page never pinch-zooms or
  pull-to-refreshes during a drag, and the rest of the page still scrolls.
- Portrait and landscape both work; no horizontal scroll at 360 px.
- 60 fps while aiming on a mid-range phone; no main-thread stall over one frame;
  `devicePixelRatio` capped where full resolution costs frames.

## Accessibility (a blocker when broken)

- Every control is a real, labelled DOM element in a sensible focus order with a
  visible focus ring.
- Aiming has a non-drag path: keyboard (arrow keys or inputs for angle and speed) and
  buttons for touch.
- The canvas has a text equivalent of what matters (target, current aim, outcome); the
  outcome is announced in a polite live region that exists before the first update.
- `prefers-reduced-motion`: no camera shake or swooping, instant transitions, and the
  final state still shown.
- Colour is never the only carrier: planets and paths carry labels or patterns.
  Text contrast at least 4.5:1, UI graphics 3:1, computed, not eyeballed.

## Layout correctness

Check 360, 390, 768 and 1440 px wide, plus 200% zoom: cut-off text, phantom scrollbars,
overlapping HUD, long level titles, empty and completed states.

## Reporting

Each finding names the viewport, the state, and `file:line` where it is fixed, plus the
screenshot path that shows it. "Feels off on mobile" is not reproducible; "at 390 px
the launch button sits under the home indicator (`apps/game/src/campaign/FlightDeck.tsx:377`)" is.
