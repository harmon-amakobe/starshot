# First leap: gameplay and vehicle study

This is the first visual form for the lunar level and vehicle workshop. It extends
the approved Observatory into the space immediately around the collector.

## The first view

A side-on orthographic camera puts prograde motion to the right and the local
vertical upward. Earth's curved limb provides a reference under the ship. A dashed
amber grab ring identifies the movable control. Pulling stretches a pair of light
strands while the worker updates the dotted trajectory. The ship's physical launch
point does not move with the finger. Release applies one departure impulse there.

A top-down map would show the full route immediately, but make a small pull hard to
read. The level instead opens near the collector; Whole system and continuous zoom
keep the complete separation available. A physical elastic slingshot was rejected:
the visible strands explain the gesture, not a fictitious force acting on the craft.

The flight deck keeps fuel and the immediate path result visible. Scientific adds
exact inputs in the same deck. Keyboard aiming also exists in Simplified. Controls
do not require opening a settings sidebar. Menus pause flight; the deck does not.

## A family of shapes

The collector pairs a cream rounded shell with a dark panoramic instrument visor.
Its open engine ring carries the amber player colour. Eight small braces and three
inner conductors give the ring a recognizable structure from front and side views.

The crew concept extends the same shell upward into a pressure cabin. Its extra mass
is explicit; it is not silently substituted into the collector's measured flight.
The drone repeats the cream shell and ring thrusters, with two soft blue eyes and
an antenna. It can carry feedback later without depending on spoken English.

Sharp fighter-like wings and a tall rocket silhouette were rejected. They suggest
airplane controls or a surface launch, while this level starts in a parking orbit.
The current short fins are service structures, not aerodynamic steering surfaces.

## Extension points

| Location | Owns |
| --- | --- |
| `apps/prototype/src/lunar/model.ts` | Reference Moon states, Earth centre and departure basis |
| `apps/prototype/src/lunar/flight.ts` | Frozen shot, integration and approach detection |
| `apps/prototype/src/lunar/shot-state.ts` | Current preview ownership and release cancellation |
| `apps/prototype/src/use-flight.ts` | Worker lifecycle and latest-aim coalescing |
| `apps/prototype/src/render/coordinates.ts` | Local plot and camera framing |
| `apps/prototype/src/render/scene.ts` | 3D lighting, physical body orientation and route display |
| `apps/prototype/src/render/vehicle.ts` | Shared materials and procedural component shapes |
| `apps/prototype/src/ui/FlightDeck.tsx` | Readable instruments and fine controls |
| `apps/prototype/src/style.css` | Shell palette, panel shapes and responsive spacing |

Amber, cream and dark glass are adjustable material tokens. The engine and cabin
proportions are deliberately easy to revise. Physical radii, the force model and
worker request ownership are load-bearing. A later inclination lesson should add
the third burn component to the request and controls, not flatten the ephemeris.

Designed against 360 px and 390 px phones, a medium portrait window and 1440 px
desktop. The world stays on one page. Only the menu may scroll internally.
