# Combat workspace

## Current source behavior

The current source docks the website's native action and skill/check dialogs in a resizable left panel while keeping chat and the map usable. The native form controls and submission handlers remain in place. Switching between Actions and Skills opens the corresponding native picker; open forms preserve their normal website close/open behavior. Existing dialogs opened before the desktop adapter remain ordinary modals to preserve their state. The initial three-column redesign was not implemented.

The dice panel opens Favorites first. **All checks** and **Favorites** switch views; **Add** / **Add more** opens the native check tiles for campaign-local selection. Favorite tiles open the native check form without rolling. The workspace preserves native attack and spell correction controls and defaults. Saved weapon and spell overrides are separate and scoped to the current attack for the character and campaign, with separate character-and-campaign category defaults. Advantage/disadvantage changes apply only to the current form. Current source removes the duplicated quick-correction block for ordinary checks. Named local presets can be saved, loaded, and deleted manually; they do not apply automatically and shortcuts do not roll or write to character sheets. Workspace preferences stay local and are excluded from shared themes.

The current source also adds campaign-local **Automatic Damage**, **Hide intermediate Franz response**, and **Hide completed Damage prompt** controls in unified Settings. The two hide options require Automatic Damage. The second option hides only the completed Damage prompt/card linked to the automatic attack; it does not hide the actual damage-number/dice event. Attack results, final Franz responses, unrelated events, and text-based attacks remain visible. Hiding is a local display choice: it does not stop server generation or reduce context and credit use. The supported automatic-damage flow uses the native damage prompt and its native callback; no combined attack-and-damage fast path is supported.

These current-source UI corrections are unpublished and are not part of release 0.7.2.7. The original combat workspace implementation and its evidence are documented in the local `ui-corrections-0-8-0` task report.

## Original request and confirmed boundaries

The request was for a left slide-out action panel covering attacks, spells, skills/checks, and custom actions while preserving the existing battlefield, chat, map, and character HP/status arrangement. Selecting an action should show details while chat and map remain usable. Modifier corrections were requested, with action roles such as “main hand” that do not depend on a particular item name.

The panel opens automatically when combat begins and has a manual control. The first version supports the active player character; GM-controlled characters are a separate future feature. No campaign updates are authorized by this planning document.

The initial implementation docks the website's native action and skill/check dialogs in place. It preserves native form controls and submission handlers. Switching Actions/Skills explicitly opens the corresponding native picker; chat and map use keep the current form open. Existing dialogs opened before the adapter remain ordinary modals to preserve their state.

## Unapproved future design ideas

The following are recommendations for a later, explicitly scoped design; they are not implemented requirements or authorization:

- Resizable columns, a searchable/favoritable action list with kind filters, inline detail back-navigation, or an action gear button.
- Displaying attack and damage formulas with ability, proficiency, and other bonuses separated, plus automatic/manual modifier adjustments and reset.
- Presets keyed by character, action, and mode (main hand, off hand, two-handed), with rules derived from underlying stats and role rather than fixed numeric bonuses.
- Responsive column collapse and restoring the prior layout after combat.
- Applying local presets automatically to submitted rolls.
- An optional character-sheet update switch. Before considering it, inspect whether the website supports the necessary fields, modifier recalculation, and write path. The suggested default-off behavior is a recommendation, not a user-confirmed decision.

Before any such implementation, verify submitted rolls by their actual result, not only the action label. Preserve existing chat drafts, map state, resource and target controls, and website submission behavior. Avoid cloned interactive DOM or duplicate handlers. Any future roll action must be explicit; do not execute a roll automatically. No campaign updates are authorized here.
