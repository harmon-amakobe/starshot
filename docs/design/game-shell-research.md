# Game shell research

The owner requested a viewport-filling game, with temporary overlays and scrolling
inside long panels. The sources below support that direction. Applications are design
judgments for starshot; no source UI, artwork or code is copied.

| Source | Evidence | Application |
|---|---|---|
| [Google Playables design guidance](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design) | A browser game should fill its game area without scrollbars, with intentional scrolling allowed for long UI lists. It recommends visible dismissal and clear pause/resume states. | One screen for the world and HUD; bounded scroll regions for menus. |
| [Horizon Forbidden West accessibility](https://blog.playstation.com/2022/02/10/accessibility-features-in-horizon-forbidden-west/) | Guerrilla describes controls over which HUD information appears and when. | Keep scientific detail optional. Hide controls only through a discoverable action; never hide the focused control on a timer. |
| [No Man's Sky NEXT](https://www.nomanssky.com/next-update/) | Hello Games describes reducing HUD intrusion and prioritizing message locations. | Assign mission, action and outcome stable places. Leave the path clear. |
| [Sky support instructions](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/537-how-can-i-chat-with-customer-support/) | Its utility menu is revealed by tapping the top-right corner. | Use an overlay utility layer, but retain a visible Menu label so players do not need to discover an invisible corner. |
| [Minecraft Bedrock 1.21.70](https://www.minecraft.net/en-us/article/minecraft-1-21-70-bedrock-changelog) | Mojang documents single-player pausing, pause-state notifications and fixes for movement continuing after menus open. | Freeze travel and block map gestures during a modal. A dismissed menu must not release a pending shot. |

## Accessibility and input

[Xbox XAG 112](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112)
and [XAG 113](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113)
support predictable navigation and visible focus. The
[W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
specifies contained focus, an inert background, Escape dismissal and focus return.
The [MDN overflow guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow#accessibility)
explains why a scroll region may need a name and explicit keyboard focusability.

Apply those to settings and help with a fixed header and footer. Keep their bodies
scrollable by pointer and keyboard. Menu navigation must not launch, pan or resume the
world behind a modal. The owner's live cockpit is a separate nonmodal region: it must
not inherit focus containment, a scrim or automatic pause from the settings menu.

[Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/indicate-allow-reminder-of-controls-during-gameplay/)
recommends making control reminders available during play. Hide UI therefore keeps
Show UI visible and leaves playback reachable. All targets retain the repository's
44 CSS px minimum. A native camera selector replaces the segmented controls on phones.

## Viewport and reading

[Apple's game design guidance](https://developer.apple.com/design/human-interface-guidelines/designing-for-games)
and [WebKit's safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
support filling the display while keeping important controls inside usable bounds.
[Dynamic viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length)
allow the shell to follow visible browser height. Test resizing and browser chrome
on real phones; an emulated viewport is not that evidence.

[XAG 117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117)
discusses distracting visual movement. The proposed shell pauses its world behind
reading menus and uses an opaque menu surface. The live instruments use a dark
translucent surface with brighter secondary text to preserve contrast over the map.
Reduced motion removes panel travel.
Camera selection is explicit and never automatically rotates the scene.
