# Hotfix handoff — 2026-10-02

The user requested saving all progress because their usage limit is low. Source changes are saved in the working tree. Do not discard them or the user's existing README.md edits. No commit, push, release, or package version bump has been performed. Package version remains 0.5.1; current branch is main, base commit b34b126.

## Implemented

- Current adventure and combat composer detection; Enter prepares commands and clicks native Send once. User confirmed Enter works in combat. Shift+Enter remains a line break.
- Optional different adventure/combat `/sp` text, selected using native encounter state; profile badge and cancellation if encounter state changes during a queued send. First-use launcher works with redesigned input.
- Music playback hosted in the main window, persistent when the library is hidden. Compact Appearance/music toolbar with play/pause, stop, next, repeat, mute, and volume dropdown.
- Searchable user-selected local music folders, including nested folders, and existing 266-track catalog. Safe app-owned audio registry and folder containment checks.
- Fixed reported music window-close exception by capturing stable WebContents references. Lifecycle tests now fail on uncaught exceptions instead of displaying a false PASS followed by an error dialog.
- Six preset themes and saved named themes, circular color swatches with hover/focus names.
- Independent input appearance; expanded input uses context styling and closes on outside click/Escape without replacing the native editor.
- Loading/jump-to-bottom screens use the custom wallpaper or black fallback. Native outcome cards follow appearance settings. Recent player-message snapshots cover transient empty bodies without revealing untranslated text.
- Russian combat/health/turn labels, narrator status fragments, ability/skill checks, natural lowercase compound nouns, Event ID, Collapse All, Entity/Encounter, HP/weight and spell/action fixes. Glossary version 7 invalidates older cached results.
- Optional Hide text until translated: animated dots, complete-result reveal, native nodes/drafts preserved, initial navigation visibility gate. Local labels translate before the next paint.
- Appearance locale timing fix: monotonically increasing locale revisions reject delayed English replies and preserve unsaved settings.

## Verification

- `npm run check` passed.
- `git diff --check -- src assets tests docs package.json` passed. README.md has preexisting user whitespace; preserve it.
- Music units and Electron smoke passed, including playback, local folder security, and teardown.
- Commands, map, instructions, translation, and appearance suites passed individually. Commands use real Tiptap and Chromium keyboard input.
- Latest appearance locale race tests: panel passed twice consecutively and appearance passed; deterministic stale English reply cannot override Russian or an unsaved color.
- Final full `npm test` passed with exit code 0: 22 unit tests and all seven Electron suites. Test log: `/tmp/fables-hotfix-final2.log`.

## Important context

- `/sp` markers hide guidance locally; guidance remains in shared server-stored messages. There is no server-side private GM channel. Do not promise secrecy from other clients.
- User authorized Electron debugger testing and parallel agents for music/appearance. Native computer-control tool cannot control Electron windows. All temporary live debugger windows have been closed; no live campaign messages were sent by root tests.
- Run native Electron fixtures sequentially because they share display focus. Some logged IPC rejection errors are intentional access-boundary tests; suite exit status and PASS lines determine success.
- Source updates require restarting the app with `npm start`; a background AppImage can activate Electron's single-instance behavior. There is no updated published AppImage yet.
- No Windows native runtime verification was performed.

## Files and resuming

- Full change history: `docs/CHANGES-SINCE-0.5.0.md`.
- Updated user guides: `docs/MUSIC.md`, `docs/HOST-INSTRUCTIONS.md`, `docs/MESSAGE-COMMANDS.md`, `docs/TRANSLATION.md`.
- New implementation modules: `src/music-library.ts`, `src/theme-library.ts`; the working tree contains the remaining modified source, assets, and regression tests.
- All parallel agent work is complete. No further feature implementation is pending from the current hotfix. Resume by reading this file and the change history, inspecting the working tree, and following the user's next instruction. Do not repeat already passed checks unless source changes or new failures justify it.
