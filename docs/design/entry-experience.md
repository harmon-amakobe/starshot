# Entry experience

The main menu is part of the orbital scene. The collector remains the point of
attention while the left side offers one primary action: Play or Continue. A local
profile appears in the corner. Levels and Profiles sit beside each other beneath
Play; settings and sign-in have less visual weight. Stores remain explicit previews.

The following composition notes first describe the standalone Moon study. The main
game now adopts the same hierarchy and presentation through its campaign adapter;
the frame and departure differences are recorded below.

## Composition and handoff

The original close camera put Earth on its night side and hid the Moon. An elevated,
wider perspective makes the daylit limb and the real lunar position visible at
departure. The craft stays enlarged for recognition. It receives its own soft fill
light and foreground depth pass; Earth keeps its physical lighting. The renderer uses
actual camera projection for menu annotations. A target outside the useful view gets
a direction and distance cue, rather than a relocated Moon.

A static illustrated splash would be easy to stage, but it would separate the menu
from the player's current flight. Reloading a level behind Play would also discard
the exact cached request. The chosen handoff keeps one scene and worker mounted.
It moves the presentation camera while holding ET. Reduced motion cuts directly.
The saved Follow, System or Free view remains separate from the menu camera.

On phones, the wordmark sits above the ship and the controls sit below it. Desktop
uses a left control column and a right scene. Subordinate panels occupy a bounded
window and may scroll internally. The game page never scrolls. During entry and
transition, gameplay controls remain mounted but hidden and inert.

## Profiles and honest service previews

First Play needs no account or name. Local profiles isolate aim, progress and controls.
Continue restores a canonical request through the existing worker, then restores time
only after the matching response. A scene acknowledgment prevents hydration defaults
from replacing a saved flight. Storage failure leaves a working memory session.

The cloud flow is a locally simulated interaction study. Its persistent demo label
distinguishes it from a real provider. The sample identity never asks for credentials.
The Google account-choice and email-link return steps lead to the same pilot manager.
Offline drafts, a second-device change and explicit save-version choices can be tested
without a backend. The demo keeps each draft with its pilot and revision, and preserves
the previous local profile when signing out. Production Firebase behavior remains
unimplemented and unverified.

## Orbital readability

The old angular offset made the enlarged collector appear to move backward around
Earth despite its correct velocity. Radial-only separation preserves the visible
relationship between position and prograde heading. The camera reserves annotation
space for the entire ring gesture. A true-scale parking circle and burn marker explain
where the shot starts. The parking-orbit action in the camera strip reveals the
reference at local scale without placing a button over the engine gesture.
The travelled and future portions share the exact flight path and differ in pattern.

## Extension points

| Module | Responsibility |
| --- | --- |
| `apps/prototype/src/entry/HomeMenu.tsx` | Entry hierarchy, Levels and local-profile panels |
| `apps/prototype/src/entry/entry.css` | Responsive spacing, typography and menu surfaces |
| `apps/prototype/src/entry/profiles.ts` | Versioned save validation and canonical copying |
| `apps/prototype/src/entry/use-profiles.ts` | Ownership, hydration and local persistence |
| `apps/prototype/src/entry/presentation.ts` | Camera handoff timing and reduced motion |
| `apps/prototype/src/render/entry-camera.ts` | Actual perspective camera and depth bounds |
| `apps/prototype/src/entry/cloud-demo.ts` | Mock remote revisions and isolated drafts |
| `apps/prototype/src/entry/CloudPreview.tsx` | Provider, pilot, sync and conflict screens |
| `apps/prototype/src/render/route-view.ts` | Parking reference, burn node and route split |

Palette, proportions and transition duration are adjustable design values. Canonical
requests, profile ownership and exact preview-to-flight identity are fixed contracts.
The cloud adapter is an explicit replacement point for future authenticated services.
Designed against 360 px and 390 px phones, 791 px windows, 1440 px desktop and landscape.

## Campaign adoption

`apps/game/src/campaign/CampaignApp.tsx` is the main game's default route. It keeps
one scene and worker mounted through entry, play, menus, Launch window and inspection.
The shared collector, charge chamber, icons, audio and entry timing live in
`packages/presentation`; the Moon study re-exports them without changing its dynamics.

Campaign departure starts at Earth centre with Earth's velocity plus the selected
excess velocity. A declared enlarged control symbol and leader take the place of the
Moon study's parking-orbit reference. Full-circle pull input is inverted through the
current projected frame, and the craft faces heliocentric velocity during travel.
The menu uses a close Earth portrait with an enlarged collector, then blends back to
the saved Follow, System or Free camera. The portrait is presentation composition,
not a new physical parking-orbit state.

Campaign profile validation stores the original sandbox window and hint use along
with aim, phase, time and preferences. Restoring a pilot recomputes its canonical
request; neither paths nor simulation settings come from the saved document. A
generation guard isolates responses across pilot and level changes, even when two
pilots have the same shot key. The original legacy progress store remains intact.

The campaign's Launch window is another view of the same renderer. It does not use
the lunar Observatory iframe bridge, which has a different coordinate contract.
The rings and sourced rotation data are shared; unavailable historical moon rails
are hidden with a coverage note. The Canvas fallback retains gameplay, paths and
sourced ring projections with simpler body and vehicle art. Its moon close-ups do
not yet match the WebGL presentation.
