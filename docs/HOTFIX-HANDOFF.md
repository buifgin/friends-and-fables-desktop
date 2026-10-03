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
- New implementation modules: `src/music/music-library.ts`, `src/appearance/theme-library.ts`; the working tree contains the remaining modified source, assets, and regression tests.
- All parallel agent work is complete. No further feature implementation is pending from the current hotfix. Resume by reading this file and the change history, inspecting the working tree, and following the user's next instruction. Do not repeat already passed checks unless source changes or new failures justify it.

## Feature layout follow-up (2026-10-02)

Source, assets and regression tests now use feature subfolders. Read docs/ARCHITECTURE.md for the map and nested local AGENTS.md for ownership. Runtime behavior, settings and protocol URLs are preserved. New builds clean dist before compilation; moved preloads and assets were verified in a real Linux app.asar. All seven Electron suites passed both from source and that package, along with 25 unit tests and the Python protocol test. No native Windows verification was run locally. The local worktree helper also copies nested guides; its 13 offline tests pass. Local guides/config/worktrees are ignored and excluded from Forge and builder packages. This follow-up is saved in the working tree; no release was published.


## Latest completed live-test follow-up — 2026-10-02

This section supersedes the earlier completion/checkpoint status. Current branch main, base0529cb0, version0.5.1. Follow-up source/tests and this handoff are saved uncommitted; no release/package version change.

Completed fixes:
- Embedded chat loading uses the selected wallpaper or black and preserves the combat map/sidebar.
- Edit Encounter translates immediately to Редактировать бой.
- All seven Linux top menus keep music/appearance controls visible and clickable; clicking volume dismisses the menu.
- Fixed translation-induced editor freeze: Russian hints render through CSS, preserving native Tiptap placeholder attributes and drafts instead of repeatedly fighting editor reconciliation. Real Tiptap regression covers quiescence, async/source updates, replacement, restoration and ordinary textbox inputs.
- Combat /sp detection now accepts the native numeric encounter ID as well as strings. Native boolean mode and queued-send cancellation remain supported.

Final live campaign checks passed: translation enabled and renderer responsive; visible Russian hint with original native attribute; encounter and all four health labels Russian; custom wallpaper while jumping to bottom and intact combat sidebar; all menus/toolbars clickable. Intercepted Chromium keyboard check selected combat instructions, formatted /gm, triggered one Send click and preserved Shift+Enter soft break. No test messages reached the campaign; dummy draft/configuration were restored. Saved separate combat instructions remain an optional user setting, currently disabled; tests enabled them only in memory.

Verification: type check/build/diff check passed. Full source suite after placeholder fix passed26 units and all seven Electron suites. After numeric-ID fix, full run passed26 units and first six fixtures; new hidden-window badge assertion used an unreliable fixed RAF wait. Corrected test synchronization to native input; final focused instructions fixture passed. Latest production behavior also passed the real campaign keyboard check. No updated package or Windows native runtime test for these follow-up edits.

Final source app was left open in the chosen campaign. Temporary renderer debugging detached; main inspector closed; both diagnostic ports verified closed. No active test windows/parallel implementation remain. Existing preference/game state was preserved; user explicitly authorized discarding the earlier unsent draft when restarting the frozen diagnostic. Actual theme saves/folder selection/audio changes were not performed live; passing fixtures cover them.

Full private results, selected campaign, worker branches/commits, logs and reproduction details: `.codex/workflow/tasks/live-campaign-2026-10-02/LIVE-REPORT.md`. Workflow files/guides/config remain privately ignored and must not be committed or packaged. Worker patches were reviewed and integrated sequentially without a primary commit, per the recorded task exception. Resume by inspecting the saved primary diff and following the user's next request; do not rerun already passed checks without a reason.

## Release checkpoint — 0.5.2

The user authorized committing the completed hotfix and publishing 0.5.2 before further work. The release includes the completed changes above and prior music/themes/instructions/layout changes since 0.5.1. A new two-campaign built-in translation sweep and requested centered toolbar/window controls are separate follow-up work, outside this release. Release verification and publication records are in docs/RELEASING.md. Local workflow artifacts remain excluded.

0.5.2 is published at https://github.com/buifgin/friends-and-fables-desktop/releases/tag/v0.5.2. Exact release source is c9ceb0e; native Linux/Windows workflow37036457745 passed source/packages and Windows model. Both CI binaries and combined checksums were uploaded unchanged; Arch recipe source verification passed. Future toolbar/translation requests remain separate follow-up work.


## Local toolbar and translation follow-up — 2026-10-02

The v0.5.2 release checkpoint above remains published. These newer changes are separate, currently uncommitted source changes:

- Removed the composer music shortcut. Main-window playback and the library shortcut remain available.
- Centered matching round Appearance/music controls in a dedicated toolbar row. Controls stay above open native menus; the volume dropdown remains usable.
- Added restricted local fullscreen, minimize-to-taskbar/panel, and normal Exit controls. Minimizing preserves playback.
- Corrected confirmed built-in labels, memory helper/time labels, model credit units, research/memory counts, movement/XP/HP summaries, and the combat turn notice. Split numeric labels retain native page nodes and translate before paint.

Read-only checks covered two signed-in campaigns, combat and adventure, including dice menus, health/turn order, character details, party/quests/world, memories, and campaign settings. Proper names/model names remain literal. No campaign messages, rolls, turn advances, entity edits, or preference saves were made. Drafts were empty before each app restart; paused music and user appearance were preserved. This checks the sampled GUI surfaces, not every possible generated story.

Verification: the combined source suite passed27 unit tests and all seven Electron suites; type check/build/diff check passed. Native live checks passed centered geometry, matching circles, all seven menus, volume, fullscreen, minimize/restore and normal Exit. Additional final focused translation/unit checks cover the combat notice found in the visual pass. The updated source app is left running in the original campaign; temporary windows and debugger connections are closed. No new Windows package or release was produced for this follow-up.


## 2026-10-03 resumed hotfix

Implemented: consistent thirteen damage labels, native ability-save/DC/dice sums, source-based glossary casing, whole-sentence pending placeholders, growing partial previews, and `/sp` ignore restoration when translation attaches first. Action-picker dialogs retain a thin neutral app border; only the selected tab gets a thin app-accent border. Music starts as two toolbar buttons, expands animated outlined controls, keeps a library shortcut, and removes the toolbar Stop button. Window controls are ordered minimize, fullscreen, exit. Separate settings windows open inactive. Future progression paragraph formatting and an unplanned curated-class translation idea are in ROADMAP.md.

Verification: type check/build and 34 unit tests passed. Appearance, translation, map, commands, music, and instruction fixtures passed; the updated selected-tab appearance fixture passed separately. Live checks used a temporary profile on DP-1 in the combat campaign ХАЪХАХАХАХАХАХХА and adventure campaign The Chronicles of Odrun Fell. Combat saves, damage and dice labels were correct; all four picker tabs had the selected-tab accent and normal dialog border. Progression checks counted 24 and 34 paragraphs with no card overflow. The hidden `/sp` block had no translation overlays. Compact toolbar behavior and window-control order were checked. No campaign action, roll or message was sent.

The full combined command stopped at the panel fixture's minimize assertion under the no-focus compositor rule. Other suites were completed separately with retained evidence; do not call this a fully passing npm test run. The user explicitly chose to leave native minimize verification unverified so testing remains silent. No release or commit was made for this batch. The user's running app was preserved; source changes take effect on its next normal restart. Temporary validation windows/profile and compositor rules were cleaned up.

## 2026-10-03 tray and custom-attack follow-up

Resolved the Hyprland minimize freeze: Electron previously paused painting while the compositor left the window visible. Toolbar and Window-menu Minimize now hide to a native tray icon; clicking it or choosing Show app restores the same renderer/draft, with music preserved. Other desktops retain native minimization. This supersedes the earlier minimize-test waiver.

Corrected custom attack headings, roll-type wording and composed damage labels. Both toggle states retain a thin theme border. Blank translation shows only the ready prefix, with one indicator per description/card, and holds later cached fragments until earlier content is ready. Catalog world/campaign names remain literal. Added round icon-only close controls for Appearance/Translation settings, trusted close IPC, and centered window-control SVGs.

Final npm run check and npm test passed on the stable combined source, including the new real Hyprland compositor hide/remap fixture and all other native suites. Native checks ran silently on DP-1. A live catalog sample preserved29 card titles with0 queued for the model; labels still translated. Existing app/draft/audio were preserved and no campaign action was sent. Local routing instructions record the user's estimates and prefer Luna for trivial work; those instruments remain ignored. No new release/primary commit; use a normal app restart to load source changes.


## 2026-10-03 progression, glossary and settings close follow-up

Progression now drains the earliest unfinished text/card/level before later model requests, preserving order across partial batches and retry backoff. Split damage headings, preview dice and bonus labels translate as complete mechanics while preserving native form values and nodes. Standalone Roll uses «Бросок»; bonus ability capitalization follows source. Resistance damage lists use canonical inflected Russian and glossary cache namespace9 isolates stale text. Researched core coverage and sources are in RPG-GLOSSARY.md.

Battle summaries and their rows use simple app-theme borders; dice breakdowns use a plain translucent blurred surface. Chat and main dice cards retain selected decorative frames. Appearance, Translation and Saved Instructions have centered accessible SVG close buttons; /sp closes its own settings without saving edits.

Verification:38 unit tests, typecheck/build and all8 native suites passed. The original npmtest command stopped on fixture assumptions; affected recovery completed coverage after test-only repairs, with exact logs in the local workflow. Native checks were silent on DP-1; original app drafts/audio untouched, no live campaign action. No new release/primary commit. Normal restart loads source changes. Progress saved after user reported8% remaining; no optional sweep. All owned windows closed; an inert uniquely matched anonymous validation rule remains until normal compositor config reload because current Hyprland cannot unset anonymous rules individually. Future probes must use named disableable rules.
