# starshot look research

Status: the owner chose Pocket observatory's playfulness with Deep field's rounded
forms. D32 records that choice and the single-screen shell. The three studies below
remain the research record; [look-direction.md](look-direction.md) describes the merge.

## What the owner wants

The baseline is fun. Its main screen is too scientific and it is too quiet.
Simple play should lead with pulling, snapping and the planned fuel budget.
An optional science view should expose real measurements and fine controls.
Travel needs Follow craft, System and Free camera views, with zoom and pause.
The [interaction brief](interaction-brief.md) records those requirements and model limits.

The supplied visual brief fixes a dark neutral shell, IBM Plex Mono and amber for
the player. Saturated colour belongs to the universe. The source design was inspected
read-only. No source-design files, identity, personal story or marks are included here.
These proposals use the owner's explicit game voice and typography instructions.

## References and useful lessons

The evidence column describes the source. The application column is design judgment
for starshot, not a claim about the reference's implementation. No reference imagery,
music, characters or UI files have been copied or hotlinked into the game.

| Reference | Evidence | Application to starshot |
|---|---|---|
| [Portal 2](https://store.steampowered.com/app/620/Portal_2/) | The owner names its dry wit as a reference. The official page identifies the Valve game. | A calm computer gives useful information first and a short original aside occasionally. Never borrow dialogue, characters or the testing-facility identity. |
| [Astroneer](https://astroneer.space/) | Its official presentation centres on colourful worlds and interplanetary exploration. | Strong planet identities, approachable proportions and saturated colour against quiet controls. Real maps replace invented terrain. |
| [Kerbal Space Program](https://www.kerbalspaceprogram.com/) | Its official description combines spacecraft construction with orbital physics. | Make an earnest small craft worth caring about. Keep the measurements available without making the default screen a cockpit of numbers. No borrowed creatures or parts. |
| [Outer Wilds art direction](https://www.mobiusdigitalgames.com/news/our-new-style) | Its art director describes broad gradients, simplified textures and shapes that read at different distances. | Preserve Jupiter's bands, Saturn's rings and Earth's blue-white separation at small sizes. Detail should not erase identity. |
| [Outer Wilds cloud effects](https://www.mobiusdigitalgames.com/news/giants-deep-visual-effects-vfx) | The developer explains layered moving cloud textures. | A separate cloud layer can add life in close views. Keep it slow and optional; the surface should stay readable. |
| [SpaceEngine planet manual](https://spaceengine.org/manual/making-addons/creating-a-planet/) | The manual separates surface, atmosphere, cloud and ring rendering. | Use a coherent day/night boundary, thin illuminated atmosphere and rings with clear front/back depth. Avoid giving airless worlds the same glowing rim as Earth. |
| [Stellarium guide](https://stellarium.org/guide/) | Its controls distinguish star magnitude, brightness, twinkling and adaptation to bright objects. | Many faint stars, fewer medium stars and a handful of bright anchors. Space has no atmospheric twinkle; any decorative shimmer must be optional and outside the active route. |
| [NASA Eyes](https://science.nasa.gov/eyes/) | NASA presents time-based exploration of bodies and missions with real data. | Keep destination, camera selection and mission date understandable. Show technical detail on request. |
| [An Orbit Map of the Solar System](https://tabletopwhale.com/2019/06/10/the-solar-system.html), Eleanor Lutz | The artist documents data-derived paths and a logarithmic radial projection for a non-navigation map. | Borrow the hierarchy of contextual curves and deliberate label placement. Keep starshot's aiming distances linear; do not borrow the projection or artwork. |
| [Mini Metro audio](https://dinopoloclub.com/support/mini-metro/) | The developer describes procedural audio responding to game actions. | Pulling and encounters can contribute to an original musical arrangement. Immediate control cues must never wait for a beat. |
| [A Short Hike](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/) | Its creator describes musical layers changing with location and movement. | Let flight open the arrangement, while aiming leaves room for precise cues. No borrowed themes or recordings. |
| [Osmos](https://www.hemispheregames.com/new_blog/2009/09/23/thanks-and-interviews/) | The developer distinguishes an ambient musical bed from important event sounds. | Quiet music can coexist with a clear, satisfying launch. Do not make every moving dot chirp. |

The strongest visual combination is broad planetary forms from Outer Wilds,
lighting cues from SpaceEngine and NASA, and the star hierarchy of Stellarium.
Mini Metro and A Short Hike are the strongest interaction-audio references.

## Shared design rules

| Role | Token or treatment |
|---|---|
| Shell | `#0B0B0C`; opaque controls when over the sky |
| Main text | `#E8E6E1` |
| Metadata | `#8C8C90`; test contrast on each actual panel |
| Decorative rules | `#5A5A5E`; never essential text or control boundaries |
| Player | `#FFB000`, with `#FFC24D` highlights; craft, pull and earned outcome |
| Typography | IBM Plex Mono, weights 300, 400, 500 and 700; size and weight establish hierarchy |
| Target | Body colour plus label and target shape |
| Lock state | D18 sky blue for brake and orange for boost, with distinct icon, text and shape; amber alone never means success |
| Touch and keys | Labelled DOM controls of at least 44 CSS px; simple mode retains non-drag aiming |
| Motion | Brief anticipation; reduced motion makes decorative transitions immediate. Flight retains D18's 0.6 duration factor. |

The Sun retains its real body colour. Player amber is a UI semantic, not a reason
to recolour astronomical imagery. Likewise, D18's boost orange stays distinct
through its icon, text and shape; colour reservations do not remove required cues.

## Direction A: Pocket observatory

**Recommendation.** A small, friendly craft in a beautiful, substantial universe.
The controls feel like a well-made instrument with one useful job at a time.

- **References:** [Outer Wilds shapes](https://www.mobiusdigitalgames.com/news/our-new-style),
  [Astroneer](https://astroneer.space/), [Mini Metro audio](https://dinopoloclub.com/support/mini-metro/).
- **Palette:** shared shell and amber player; Earth cyan `#55C9F5`, Mars coral
  `#F16C55`, cloud white `#D5F4FF`. These are interface study colours, not replacements
  for the eventual real planet textures.
- **Type and layout:** 700-weight lowercase title; 400-weight invitation; compact
  500-weight action labels. A generous map above one rounded, opaque control shelf.
  Fine controls unfold from that shelf rather than surrounding the map.
- **Motion:** a 140 ms pull response and short damped release recoil. A confirmed
  target lock settles into a complete shape. No perpetual UI bobbing.
- **Original copy:** "Ready when you are." "Route found. Nicely pulled."
  "Mars reached. You did that." A miss names the next useful adjustment.
- **Sound:** rounded plucks, a soft elastic snap, low wooden ticks and brief radio-like
  replies. An original 76 BPM sketch adds a second voice during travel. Encounters
  briefly change timbre. Arrival resolves; a miss has a soft, short falling cue.
- **Phone approach:** one batched star layer, simple Sun-relative planet shading,
  cloud detail only at useful screen sizes, cached route geometry and no full-screen
  bloom on the low tier. Cap audio voices at eight as a starting budget.
- **Risk:** too much softness could hide aiming precision. Keep the trajectory crisp
  and give every playful response a short duration.

## Direction B: Flight computer

A precise, playful instrument. Space is vivid, while the interface resembles a
small flight computer that has become unexpectedly invested in your success.

- **References:** [Portal 2](https://store.steampowered.com/app/620/Portal_2/),
  [NASA Eyes](https://science.nasa.gov/eyes/), [Eleanor Lutz](https://tabletopwhale.com/2019/06/10/the-solar-system.html).
- **Palette:** shared charcoal and player amber; pale ice `#A9DCEF`, volcanic
  red `#EC735C`, cool planet violet `#9C91F4`. Neutral lines keep coloured paths readable.
- **Type and layout:** 500-weight compact title, strong left alignment and a narrow
  status rail. A flat bottom command strip replaces the rounded shelf. Technical
  values remain behind Scientific, even in this more instrumental direction.
- **Motion:** short boot checks, 90 ms button responses, one deliberate cursor-like
  acknowledgement per completed action. Reduced motion reveals the finished checks.
- **Original copy:** "Flight plan: yours." "Trajectory checked. Space remains large."
  "Destination reached. Filing this under good decisions."
- **Sound:** dry switches, muted sine bleeps, a concise bass snap and a small rising
  interval on lock. An original 96 BPM pulse enters during flight, with fewer sustained
  tones than A. Repeated fine-control input is rate-limited to avoid chatter.
- **Phone approach:** mostly static DOM, one star draw, minimal glow and one shared
  event-sound bus. No animated grain or full-screen scanline passes.
- **Risk:** this is closest to the current scientific feel. The disclosure boundary
  must be strict, and jokes cannot replace guidance.

## Direction C: Deep field

A quiet observatory with moments of scale. The planet and its light lead;
controls sit at the edge of a broad, carefully composed sky.

- **References:** [Stellarium](https://stellarium.org/guide/),
  [SpaceEngine](https://spaceengine.org/manual/making-addons/creating-a-planet/),
  [NASA Moon visualization](https://svs.gsfc.nasa.gov/5587/),
  [Osmos](https://www.hemispheregames.com/new_blog/2009/09/23/thanks-and-interviews/).
- **Palette:** shared charcoal and amber; planetary blue `#568AF4`, atmospheric
  cyan `#83D9E8`, deep violet `#9C8ADF`. Space stays predominantly dark.
- **Type and layout:** 300-weight large title, 400-weight body, 500-weight controls.
  A spacious edge-aligned date and target, with a thin horizontal action shelf.
- **Motion:** deliberate framing and restrained 240 ms transitions. Follow craft
  uses translation with a stable orientation. No automatic orbiting camera.
- **Original copy:** "A little farther." "Earth is behind you. Your route is ahead."
  "Mars reached. Take a moment."
- **Sound:** soft sine mallets, glass-like overtones, warm sustained intervals and a
  low airy bed. An original 54 BPM phrase leaves long gaps. Launch still has an
  immediate tactile snap, so quiet does not mean unresponsive.
- **Phone approach:** a single close body receives the best available texture;
  distant bodies simplify. Low tier omits clouds, decorative shimmer and bloom.
  One bounded shared reverb uses a generated impulse response.
- **Risk:** it can feel slow or too quiet. Keep gameplay cues prominent and avoid
  stretching flight time to suit the music.

All timings and budgets above are proposed starting values, not measured guarantees.
The target remains 60 fps on the owner's phone and a preview response under 100 ms.

## Planet and sky treatment

Use the direction's composition, then real imagery. The
[Solar System Scope texture page](https://play.solarsystemscope.com/textures/) offers
CC BY 4.0 planetary maps. It also documents colour adjustment and filled map gaps;
these are presentation maps, not raw scientific measurements. The
[NASA SVS Moon kit](https://svs.gsfc.nasa.gov/4720/) provides rendering maps from LRO
data and similarly distinguishes aesthetic rendering from scientific use.

Compute the day/night boundary from the Sun direction. Use a narrow atmosphere
only on appropriate bodies, a separate Earth cloud layer, and an inexpensive analytic
ring shadow where visible. Avoid shadow-map passes per planet. At tiny radii, render
a clear body marker; only larger projected bodies need texture sampling and relief.

Use an approved star catalogue with magnitude and colour, packed as a separate file.
[HYG's licence](https://github.com/astronexus/HYG-Database/blob/main/LICENSE) is CC BY-SA
4.0. Confirm provenance and pin a release before ingestion; do not substitute newer
Gaia-derived data. Keep Yale conditional on confirmed terms. No catalogue is bundled
by this research step. Cache the Canvas fallback sky. Bright bodies may locally lower
faint-star contrast; the active route and labels always win.

No shader or camera may change the aim-to-world mapping. Camera-relative coordinates
and linear distances follow D19. All enlarged body sizes need the scale treatment
and true-size option already required by that decision.

## Audio and asset implementation boundaries

Create or resume the audio context from a deliberate gesture. Keep music and effects
separate, with mute and volume controls. Stop or duck musical motion cues when travel
pauses. Handle interrupted audio and resume only through an appropriate interaction.
See [Web Audio practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
and [context states](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state).

Use oscillators, filtered generated noise and authored note patterns. These studies
contain no sampled soundtrack. Final music composition or external CC BY tracks still
follow D15. Every meaningful sound has a visual and text equivalent; muted play is complete.
Use one context and a capped voice pool. Schedule envelopes on the audio clock,
independently from simulation time. Suppress duplicate event sounds after pause/resume.

[IBM Plex](https://github.com/IBM/plex) uses
[OFL-1.1](https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt).
Before the font ships in the game, add its licence under `LICENSES/`, record it in
`REUSE.toml`, and add manifest hashes and credits. Every other shipped asset needs its
source, licence, attribution and hash. No AI-generated media is approved.

The comparison study is outside the repository. Its planet discs are lighting
sketches, its stars are decorative layout marks, and its music is an original procedural
audition. Its travel positions are sampled from the unchanged First Light known solution.
It is a design comparison, not the next game renderer or a new fuel model.

## Next choice

The owner selected A's playfulness and C's rounded nature, then requested a combined
app-shell study with overlays and no page scrolling. That study precedes adoption in
`apps/game`. The title/menu, map, pull/flight and result implementation steps remain
separate. [Game-shell research](game-shell-research.md) records the UI references.
