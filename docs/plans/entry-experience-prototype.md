# Entry experience prototype

Status: implemented and verified on the existing look-prototype branch.

## Owner direction

The first visit to playstarshot.com should already feel like entering the game.
Show the latest level behind the main menu, close to the collector with its planet
in view and the target visible where the camera permits. Play or Continue pulls the
camera out into the level. The scene stays mounted throughout. No page navigation,
blank transition or separate loading screen separates menu and play.

This is the first form of the entry surface. One UI originator builds it, including
its level and profile panels. Existing flight rendering is extension work within
the same sequential implementation. No second writer shares the worktree.

Use the approved Pocket observatory and Deep field direction: rounded controls,
warm amber actions, cream craft and cool engine light over the real orbital scene.
The owner's KSP reference supplies the idea of a live orbital backdrop, not copied
art, characters or menu graphics. Keep Play primary and onboarding optional, as
[Google's Playables guidance](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design)
recommends. The viewport never scrolls. Long menu contents may scroll internally.

## Entry, profiles and levels

- First visit offers Play immediately, without requiring a name or account.
- A returning local profile offers Continue with its latest level and progress.
- Levels, Profiles, settings and sign-in have clear secondary actions.
- The owner chose local profiles for this prototype. Create, rename and switch
  profiles, preserving each profile's own progress, aim and presentation settings.
- Persist a versioned, validated save under a prototype-only storage key. Keep
  production progress untouched. Storage failure leaves a playable memory session.
- Save canonical shot inputs and bounded playback state, not arbitrary integrator
  settings or large trajectory arrays. Recompute through the existing worker on
  reload. Never let a stale worker reply restore another profile's shot.
- Continue preserves aim or flight/result phase, ET, pause state and camera settings.
  Autosave must not overwrite a saved session with intermediate hydration defaults.
- Save import/export may provide a local restore path. Validate data and reject
  unsupported versions and invalid values without replacing the active profile.
- The level picker clearly separates the playable lunar lesson from future chapters.
  Future cards may preview destinations, but must not pretend those missions work.
- App Store and Google Play appear in the menu with honest coming-soon states.
  No fabricated store URL or unrelated app listing. Sign-in opens the locally simulated
  cloud-profile loop requested by the owner. It does not collect credentials.

The first public release still follows D13's Firebase decision. This isolated design
study neither configures a cloud service nor replaces that release requirement.

## Cloud-profile interaction preview

The owner's follow-up asks to experience the future Firebase profile loop. This
prototype has a clearly labelled local adapter, with no Firebase SDK or backend.
Google sign-in uses a sample-account choice. Email-link sign-in uses the fixed
`pilot@example.com` identity, a simulated link-ready state and Open demo email.
No message is sent and no real email or password is collected. The intended production
patterns are [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
and [email-link authentication](https://firebase.google.com/docs/auth/web/email-link-auth).

The demo lists a saved pilot, restores its canonical shot through the existing worker,
and can create a fresh pilot. Play uses that restored pilot. Sync now, a downloaded
sample save and scenario controls make the loop inspectable. The offline scenario
keeps a draft keyed by pilot and base revision. Reconnecting syncs it when the remote
revision matches. A simulated second device changes the remote revision and presents
Keep this device or Use cloud save with both progress summaries.

This version choice is proposed game behavior. Firestore's documented same-document
behavior is last-write-wins, as described in its
[offline persistence documentation](https://firebase.google.com/docs/firestore/manage-data/enable-offline).
The prototype does not claim that Firebase creates this conflict UI automatically.
Sign-out restores the prior local profile. Pending drafts survive sign-out and reload.
Demo pilots stay outside the ordinary local-profile list.

## Implementation and boundaries

`entry/HomeMenu.tsx` owns the new shell and subordinate panels. The level canvas stays
mounted beneath it. `EntryPresentation` freezes mission time during the camera handoff;
the renderer blends an elevated perspective view toward the existing orthographic map.
The departure pose uses real Earth, Moon and craft positions. The enlarged collector
is rendered in a separate foreground depth pass at its true anchor, with a soft fill
light. This preserves readable self-occlusion without the map's artificial craft depth.
World lighting remains tied to the actual Sun. Saved flights farther from Earth use
the nearer body for orientation and an honest projected target cue when needed.

`entry/profiles.ts` validates version 1 of `starshot.prototype.profiles.v1`.
It stores bounded canonical shot inputs, playback state and preferences, never a
trajectory or arbitrary integrator settings. Hydration increments the existing request
ID, waits for its current preview and requires a matching scene acknowledgment before
autosave. Hosted-map saves use the latest validated matching child checkpoint.
Cold prewarming does not turn a first visit into Continue before the player enters.
Storage errors fall back to memory. Save import/export for local profiles is deferred;
the cloud preview can download its sample save.

`entry/cloud-demo.ts` validates the separate `starshot.prototype.cloud-demo.v1` data.
Its mock remote revisions and per-pilot drafts never contact a service. Active-owner
guards prevent a local guest from being written into a cloud pilot. Profile departures
flush the current owner before switching. These tests do not verify Firebase security
rules, delivery, authentication or network persistence.

`render/coordinates.ts` now separates the vessel only along its actual radial bearing.
The overview reserves space for the complete rear-ring cone, including its retracted
position. `render/orbital-context.ts` builds the true 6,571 km parking reference from
the unchanged launch basis. `RouteView` splits the same cached physical path at ET:
travelled segments are solid and dim; future segments are dotted and bright. Canvas
retains the same orbital context and offers a flat entry reference.

The title reads `starshot`, without a terminal period. The parking-orbit action lives
in the flight deck's camera strip. Phone aiming help sits above zoom controls, clear
of the target label. The landscape overview and rear-ring bounds include the measured
expanded Scientific deck and the full 56 px touch target.

Independent review checked 5,112 radial display and rear-ring cases, including
retracted and half-charged states, with exit 0. Actual browser geometry remains the
final check because the rendered deck height varies with its controls and viewport.

## One scene and camera handoff

Keep the canvas, renderer, worker and current Flight mounted when entering play or
returning to the main menu. Prewarm the scene and preview while the menu is visible.
Show the menu shell promptly on a cold visit. Do not enable entry before its scene
and current flight are ready, and do not create a separate full-screen loader.

The cinematic camera is presentation state, separate from Follow, System and Free
preferences. Use actual Earth, Moon and craft positions at the saved ET. Place the
camera above the plane when needed to see around Earth. The craft can retain its
declared enlarged visual convention. Never reposition the Moon to decorate the menu.

Gameplay handles and XY labels hide while the cinematic camera is active. Any menu
labels use actual camera projection. Avoid the map craft's artificial overlay depth
in an oblique view. Keep mission time fixed behind the menu and during the camera
handoff. Resume only the saved playing state afterward. Reduced motion cuts directly
to the final view and removes decorative camera drift.

Main-menu and profile panels must not receive gameplay gestures through them.
Provide labelled DOM controls, contained modal focus, Escape/back, focus restoration,
polite status messages and 44 px targets. Test phone portrait and landscape.

## Prograde appearance and orbital context

The existing display offset rotates the enlarged craft away from its physical radial
bearing while retaining the true velocity heading. Independent review reproduced a
negative displayed radius-cross-nose value even though physical motion is prograde.
Remove that angular relocation. Separate the craft radially only, retain its physical
heading and leader, and refit the camera around the entire rear-ring control envelope.
Do not regain space by rotating just the nose or moving the target body.

Draw the declared parking reference orbit from the request's radius and launch basis.
Place the burn node at the physical departure point. Keep this geometry at true scale.
A labelled parking-orbit zoom should reveal it when the enlarged globe hides it at
the full Earth-Moon view. Do not enlarge an orbital line and label it to scale.

The exact cached Flight remains the post-burn prediction. During flight, distinguish
the travelled portion from the remaining predicted portion by pattern as well as
colour. The Moon's rail remains separate. Do not invent a closed current orbit after
a transfer burn. No launch state, tolerance, force, fuel or known solution changes.

## Verification and publication

Test fresh entry, Play, returning Continue, profile switching, reload restoration,
storage failures and invalid saves. Verify one renderer/worker across menu handoffs,
unchanged shot data, no time advancement while reading, and no click-through launch.
Check the visible craft's orbital direction, not only its physical velocity vector.
Retest ring bounds after restoring the correct radial bearing and inspect orbit lines
at local and system scales. Review screenshots at 360, 390, 791 and 1440 px widths,
landscape, reduced motion and Canvas fallback.

Run the full gates, prototype build, data checks and focused browser verification.
Record exact command exits and limitations. Follow public hygiene before pushing the
existing branch. No production deployment, app-store submission or PR is part of this
iteration. Repository issues remain disabled; this plan carries the inherited tracking
limitation from the earlier prototype work.

## Verification evidence

`npm run gates` exited 0 with 97 passing tests. The final table was:

| Gate | Result | Time |
| --- | --- | --- |
| secrets | pass | 2,302 ms |
| third-party | pass | 519 ms |
| licence | pass | 419 ms |
| copy | pass | 913 ms |
| size | pass | 323 ms |
| instruction-dedup | pass | 99 ms |
| agent-frontmatter | pass | 105 ms |
| guard-scan-coverage | pass | 103 ms |
| hook-fixtures | pass | 35,629 ms |
| typecheck | pass | 2,924 ms |
| test | pass | 7,830 ms |
| build | pass | 1,998 ms |

`gates: 12/12 passed in 53164 ms`. Copy and size reported non-failing warnings.
`npm run build:prototype` exited 0 with 73 modules. The coordinate regression exited
0 with all six tests passing, including resting, half and full charge. The full gate
test run includes all 29 prototype tests.

The repository browser harness with entry-specific steps exited 0: 21 criteria passed
across phone, desktop and reduced motion. It checked initial Play focus, provider-step
focus, unchanged canvas/renderer/worker identity, frozen transition time, playing-flight
reload, hosted-map checkpoint restoration, route styles, contrast and page bounds.
No console errors, page errors or failed requests were reported.

The profile-flow probes checked local create, rename and switch; both demo sign-in
routes; exact sample-flight restoration; both conflict choices; offline draft survival;
cloud-pilot creation and sign-out to the original local guest. A 1,462 ms departure
preserved an aim change before the 1,500 ms autosave interval. Corrupt JSON, unsupported
versions, invalid sessions and blocked storage each left a playable fallback. Canvas
handoff interpolation passed. No external authentication or network requests occurred.

Browser review caught lost focus when a provider step unmounted and controls crossing
the Moon label or engine ring. Focus now moves to the new step heading. The camera-strip
action and reserved ring clearance address the geometry findings. The Moon annotation
chooses the closest clear position around zoom and aiming help; its physical position
does not change. A final independent probe passed 213 Scientific landscape cases across
71 angles and three charge states, with at least 8.39 px between the full touch target
and deck. Representative screenshots were inspected, with artifacts kept outside the
public repository.

The final browser geometry closure exited 0 with five criteria passing. It measured
at least 8.40625 px between the landscape resting ring target and the actual deck,
checked the corrected phone Moon label and tested a held pull with a fixed camera.
The final compact-camera and provider-panel checks exited 0 with four criteria passing.
All verification browsers were closed after the run. The local preview remains open
on its sign-in choices for the owner to try.

`npm run verify:data -w @starshot/prototype` exited 0: 34 runtime asset hashes,
93 orientation matrices, 24 satellite rails, 120 JPL probes and 1,001 unchanged-source
replay probes passed. The 207,651 satellite holdout measurements are cached evidence.
No physics package, lunar model, force, tolerance or worker integration changed.

Limits: Chromium here is a desktop test environment, not a measured mid-range phone.
The existing Vite chunk-size warning remains. Browser ReadPixels warnings did not
produce failed requests or rendering errors. Firebase authentication, delivery,
security rules and real cross-device persistence are not implemented or verified.
