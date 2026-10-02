# Changes from 0.5.0 to the current source

The current release is **0.5.2**. It includes music, saved instructions, appearance themes, the latest hotfix, and the feature-folder layout described below.

## 0.5.0

- Shift+Enter inserts a soft line break; command formatting stays on its line and later text does not inherit italics.
- Translation displays finished sentences progressively, shares small batches across paragraphs, and prioritizes visible text. A badge and dotted marks show pending work.
- Russian terminology covers battle summaries, damage/healing/movement, inventory events, sorcerer progression, ability terms, and draconic spells. Campaign names remain preserved.
- Expanded battle/world maps support moving, resizing, bounds, Reset, and Escape, with separate saved positions and sizes per campaign.
- Windows portable builds include the local English–Russian translator. Linux uses the optional separate loopback translator.

## 0.5.1

- Built-in Russian labels cover campaign/discovery lists, workshop categories, image studio, account/profile/notifications, credit history, sidebar account menus, and navigation tooltips.
- Character counters, context counts, split stat-adjustment labels, and composer placeholders translate locally. Email addresses retain their spelling.
- Dotted marks target untranslated sentence ranges. Search controls retain icon padding, and the sidebar account tile follows the selected theme.
- Enter and Send prepare every command line, convert `№` outside code, validate the editor result, and submit once through native Send. Empty commands and edits during queued sending cancel submission.

## Music and saved instructions

- A searchable bundled catalog contains 266 Scott Buckley tracks, with mood/genre filters, official audio/source/license links, and attribution copying.
- Playlists support play/pause, stop, previous/next, seeking, volume, mute, and repeat, with local persistence.
- `/sp` opens saved guidance settings. Enabled guidance is attached once per eligible message using reserved markers, with templates and reversible local hiding. Players Only skips guidance.
- Guidance remains part of the stored shared message; hiding it in this app does not create a private GM channel.

## 0.5.2 hotfix

- Normal and combat composers are detected using their current native action surface. Enter intercepts the key before native submission and uses the working Send button. First-use `/sp` also works with the redesigned input.
- Optional separate adventure/combat `/sp` texts switch using the native encounter state. The composer badge shows the active profile. Changes of encounter state during queued submission cancel sending.
- Music playback lives in the main window. Hiding the library keeps audio playing; compact top buttons provide appearance, library, play/pause, stop, next, repeat, mute, and a volume slider.
- Downloaded music can be browsed through chosen folders, including nested folders, searched, and added to the playlist. Removing a folder removes its library reference and does not delete files.
- Music shutdown uses stable WebContents references, avoiding the window-close exception.
- Appearance includes prebuilt palettes and locally saved named themes, with circular multi-color previews and names on hover/focus.
- Composer styling is independent of player-message styling. Expanded input uses the context-panel style and closes on outside click or Escape while preserving the original editor.
- Native outcome cards follow event appearance. Briefly emptying an existing player-message body retains its recent visible content until the native text returns.
- Native editor hints render through CSS without rewriting ProseMirror decorations, avoiding an editor/translation feedback loop.
- Numeric native encounter IDs select combat instructions correctly.
- Linux menus keep the appearance/music toolbar above their overlays.
- Loading and jump-to-bottom screens suppress the native wallpaper in favor of the configured picture or black fallback.
- Russian fixes include ability/skill checks, natural lowercase terms in compound labels, health states, turn actions, typing indicators, Event ID, Collapse All, Entity/Encounter, HP and weight units, and common spell/action labels.
- **Hide text until translated** shows animated dots while a block is pending. It reveals only its completed result, preserves native nodes and drafts, and restores originals when disabled. Glossary changes are applied before the next paint. Initial main-window navigation is held until the first local translation scan.

## Development layout (0.5.2)

- Source, renderer assets and tests are grouped by appearance, music, translation, commands, map and shared shell responsibilities. The main entry remains dist/main.js.
- Bundled resource/preload paths, documentation and CI commands follow the new folders. Builds clean generated output so moved modules cannot remain in release packages.
- Local agent ownership guides are excluded from Git and both package formats. Shared integration has one owner; parallel changes use isolated worktrees and disjoint file assignments.
- Folder refactor verified with 25 unit tests, all seven Electron suites from source and the Linux app.asar package, and the Python adapter test. Native Windows verification remains in CI.

## Validation

The hotfix has TypeScript, core/unit, and offline Electron regression coverage. The fixtures exercise real Tiptap and Chromium keyboard input, both instruction profiles, blank translation, appearance persistence, music playback and teardown, and settings/file access boundaries. Release artifacts are verified separately by native Linux and Windows CI.
