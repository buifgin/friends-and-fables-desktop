# Combat workspace

## Current source behavior

The current source docks the website's native action and skill/check dialogs in a resizable left panel while keeping chat and the map usable. The native form controls and submission handlers remain in place. Switching between Actions and Skills opens the corresponding native picker; open forms preserve their normal website close/open behavior. Existing dialogs opened before the desktop adapter remain ordinary modals to preserve their state. The initial three-column redesign was superseded by the left-panel workspace request.

The dice panel opens Favorites first. **All checks** and **Favorites** switch views; **Add** / **Add more** opens the native check tiles for campaign-local selection. Favorite tiles open the native check form without rolling. The workspace preserves native attack and spell correction controls and defaults. Saved weapon and spell overrides are separate. An override can match a specific stable attack identity for a character in the current campaign, or act as a weapon/spell category default for that character and campaign. Saved modifier defaults apply automatically to matching untouched native attack forms; named presets are a separate feature and are loaded manually. Advantage/disadvantage changes apply only to the current form and are not saved in these defaults. Current source removes the duplicated quick-correction block for ordinary checks. Shortcuts do not roll or write to character sheets. Workspace preferences stay local and are excluded from shared themes.

Unified Settings provides campaign-local **Automatic Damage**, **Hide intermediate Franz response**, and **Hide completed Damage prompt** controls. The two hide options require Automatic Damage. The second option hides only the completed Damage prompt/card linked to the automatic attack; it does not hide the actual damage-number/dice event. Attack results, final Franz responses, unrelated events, and text-based attacks remain visible. Hiding is a local display choice: it does not stop server generation or reduce context and credit use. Automatic damage currently handles only a native form with one attack and one target. The flow waits for the native damage prompt and uses its native callback; no supported combined attack-and-damage path has been verified.

The native-dialog docking changes and removal of the duplicate ordinary-check correction block are unpublished current-source changes. The **Hide completed Damage prompt** flag is also new after release 0.7.2.7; Automatic Damage and **Hide intermediate Franz response** were already in release 0.7.2.7.

## Original request and confirmed boundaries

The request was for a left slide-out action panel covering attacks, spells, skills/checks, and custom actions while preserving the existing battlefield, chat, map, and character HP/status arrangement. Selecting an action should show details while chat and map remain usable. Modifier corrections were requested, with action roles such as “main hand” that do not depend on a particular item name.

The panel opens automatically when combat begins and has a manual control. The first version supports the active player character; GM-controlled characters are a separate future feature. No campaign updates are authorized by this planning document.

The initial implementation docks the website's native action and skill/check dialogs in place. It preserves native form controls and submission handlers. Switching Actions/Skills explicitly opens the corresponding native picker; chat and map use keep the current form open. Existing dialogs opened before the adapter remain ordinary modals to preserve their state.

## Unapproved future design ideas

The following are recommendations for a later, explicitly scoped design; they are not implemented requirements or authorization:

- A searchable unified action list with kind filters and inline detail back-navigation.
- Displaying attack and damage formulas with ability, proficiency, and other bonuses separated, plus automatic/manual modifier adjustments and reset.
- Presets keyed by character, action, and mode (main hand, off hand, two-handed), with rules derived from underlying stats and role rather than fixed numeric bonuses.
- Restoring a prior layout after combat.
- Automatically applying named presets remains a separate possible change; current saved weapon/spell action and category defaults already apply to matching untouched native attack forms.
- An optional character-sheet update switch. Before considering it, inspect whether the website supports the necessary fields, modifier recalculation, and write path. The suggested default-off behavior is a recommendation, not a user-confirmed decision.

Before any such implementation, verify submitted rolls by their actual result, not only the action label. Preserve existing chat drafts, map state, resource and target controls, and website submission behavior. Avoid cloned interactive DOM or duplicate handlers. Any future roll action must be explicit; do not execute a roll automatically. No campaign updates are authorized here.
