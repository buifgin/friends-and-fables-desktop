# Combat workspace plan

## User requirements

- Add a slide-out action panel on the left for attacks, spells, skills/checks, and custom actions. Keep the existing battlefield, chat, map, and character HP/status arrangement. This supersedes the initial full three-column redesign.
- Selecting an action opens its details in the left area while chat and map remain visible and usable.
- Allow quick edits to proficiency or base modifiers when the displayed values are wrong, with optional saving. Support action roles such as “main hand” without requiring a specific item name.

These describe the requested workspace, not implementation decisions or permission to modify campaign state.

## Confirmed decisions

- Open the action panel automatically when combat begins, with a manual open/collapse button. Respect manual collapse for the current encounter.
- Local presets affect submitted rolls. Provide an optional toggle for updating the website character sheet; investigate whether the website supports the needed fields and writes before promising this behavior.
- The first version supports the active player character. Switching to GM-controlled characters is a separate explicit future feature.

## Coordinator recommendations, not confirmed requirements

Consider resizable columns, one searchable/favoritable action list with kind filters, inline detail back-navigation, and an action gear button. Show attack and damage formulas with ability, proficiency, and other bonuses separated; allow automatic or manual modifier adjustments with reset. Consider presets keyed by character, action, and mode (main hand, off hand, two-handed), plus responsive column collapsing for narrow windows. Save rules from underlying values such as Strength, proficiency, and main-hand role instead of fixed numeric bonuses so character changes can recalculate them. Restore the previous layout after combat. Recommend the sheet-update toggle default to off; this is not a user-confirmed default.

## Implementation investigation

The initial batch docks the website's native action and skill/check dialogs in place. It preserves native form controls and submission handlers. Switching Actions/Skills explicitly opens the corresponding native picker; unfinished form fields follow the website's normal close/open behavior. Chat and map use must keep the current form open. Existing dialogs opened before the desktop adapter remain ordinary modals to preserve their current state. Saved modifiers and optional sheet writes belong to a later batch.

Before implementation, inspect the website's action state, default modifier recalculation, supported character-sheet fields, and write path. Verify submitted rolls by their actual result, not only the action label. Exact column widths, preset identity, and mapping presets to native website actions remain to be designed. Preserve existing chat drafts, map state, resource and target controls, and website submission behavior. Avoid cloned interactive DOM or duplicate handlers. Add an explicit Roll action; do not execute a roll automatically. No campaign updates are authorized by this planning document.
