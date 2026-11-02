# First leap: gameplay and vehicle study

This is the first visual form for the lunar level and vehicle workshop. It extends
the approved Observatory into the space immediately around the collector.

## The first view

A north-facing orthographic camera puts Earth left and the Moon right at departure.
The Moon moves counterclockwise. The level opens with both bodies above the flight deck.
Simplified enlarges their displayed radii for recognition. Scientific uses physical
radii. Their centres and the dotted trajectory always use the same linear scale.
Follow craft and continuous zoom retain the close Earth-limb view.

The enlarged collector symbol has a short leader to its physical position. This
keeps the control visible beside Earth at system scale. The body stays anchored while
the player pulls its rear engine ring. Repeated transverse ribs, fine field filaments
and an open collar make the extending chamber visible. The ring extends and brightens
while the worker updates the dotted trajectory. The physical launch point does not move.
The dimmed previous path remains visible while its replacement computes.

Release holds the charged pose until the exact current preview resolves, then the
chamber collapses over 180 ms before flight time advances. Reduced motion settles
immediately. Cancellation returns the gesture without launching. The camera stays
fixed during the pull and system flight. The sleeve compresses during release; it
does not represent a physical elastic force. The existing 35 degree angle limit is
shown when an extreme pull reaches it.

During flight, the collector faces its computed Earth-relative velocity in this
local view. The cool engine ring and soft plume pulse with the flight clock. Pausing,
menus and inspection freeze that animation. Reduced motion uses a steady plume.
This powered appearance is a visual study; the physics still applies one departure
impulse, with no continuous thrust or extra fuel consumption.

The flight deck keeps fuel and the immediate path result visible. Scientific adds
exact inputs in the same deck. Keyboard aiming also exists in Simplified. Controls
do not require opening a settings sidebar. Menus pause flight; the deck does not.
Collapsed, the deck keeps a horizontal fuel meter, percentage and signed burn angle.
A short preview cue remains beside them. Units sit next to the detail-mode icons.
On phones these readings form a shallow second row below the 44 px controls.
Flight replaces them with progress and Moon distance, while Pause stays available.
The compact title fades when charged or pulled. Result cards own Try again and Replay. Menu offers
Restart level for a fresh, uncharged shot. Retry retains the previous aim.

## A family of shapes

The collector pairs a cream rounded shell with a dark panoramic instrument visor.
Its engine combines ceramic and graphite hardware with cyan-white induction rings.
A restrained violet core sits within thin field filaments. Amber remains a UI accent.
The graviton collector is fictional lore; it does not add a physical force model.
The Engine hangar tab uses this same rig for an isolated charge-and-release test.
Its slider and rear-ring grip never mutate the live flight.

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
| `apps/prototype/src/render/overview.ts` | Viewport-safe system bounds |
| `apps/prototype/src/render/mission-geometry.ts` | North-facing basis, cached lunar orbit and exact approach marker |
| `apps/prototype/src/render/engine-geometry.ts` | Rear-ring projection and display-to-burn conversion |
| `apps/prototype/src/render/scene.ts` | 3D lighting, physical body orientation and route display |
| `apps/prototype/src/render/vehicle.ts` | Shared materials and procedural component shapes |
| `apps/prototype/src/render/charge-sleeve.ts` | Cylindrical pull sleeve and flat fallback |
| `apps/prototype/src/ui/FlightDeck.tsx` | Readable instruments and fine controls |
| `apps/prototype/src/ui/pull-pose.ts` | Charge ownership, camera lock and release timing |
| `apps/prototype/src/ui/engine-demo.ts` | Isolated hangar charge and collapse |
| `apps/prototype/src/ui/observatory-session.ts` | Exact flight copy, geocentric clock and checkpoint validation |
| `apps/prototype/public/observatory/hosted-mission.js` | Hosted lunar projection and mission content |
| `apps/prototype/src/style.css` | Shell palette, panel shapes and responsive spacing |

Cream, cool field light and dark glass are adjustable material tokens. The engine and cabin
proportions are deliberately easy to revise. Physical radii, the force model and
worker request ownership are load-bearing. A later inclination lesson should add
the third burn component to the request and controls, not flatten the ephemeris.

Designed against 360 px and 390 px phones, a medium portrait window and 1440 px
desktop. The world stays on one page. Only the menu may scroll internally.
