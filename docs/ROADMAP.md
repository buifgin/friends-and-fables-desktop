# Roadmap

## 1. Basic Electron wrapper

- Build the minimal wrapper with TypeScript and Electron Forge.
- Load Friends & Fables with sandboxing enabled and Node integration disabled for website content.
- Email login and persistent sessions confirmed on Hyprland.
- Startup, resizing, copy/paste, and keyboard input confirmed on Hyprland.
- Support Ctrl+= and Ctrl+Shift+= for zoom-in, including numpad shortcuts.
- Verify external-link handling and test the starter on Windows.

## 2. Appearance customization

- [x] Add AMOLED black, soft black, light, and custom background colors.
- [x] Save preferences and provide a reset-to-website-theme option.
- [x] Use the website's shared neutral color variables and preserve chat artwork.
- [x] Verify application, reset, reload, persistence, and IPC restrictions with an offline Electron smoke test.
- [x] Import a local picture behind campaign chat, with cover/contain sizing and removal.
- [x] Add separate player and GM/NPC message background colors and opacity; apply the player style to campaign text inputs.
- [x] Add a black Linux menu bar with the existing menus and a system-menu option.
- [x] Verify image import, new message styling, campaign navigation, input styling, and the Linux menu layout with offline Electron checks.
- [x] Appearance presets confirmed by the user on Hyprland.
- [x] Apply player styling to composer buttons/icons, and GM styling to battle summaries.
- [x] Add automatic/custom text colors, including GM Thoughts and headings, and keep character fields readable under app themes.
- [x] Make the uploaded chat picture follow the website's background-image switch.
- [x] Give the expanded context panel and its blocks an independent, opaque default palette.
- [x] Add gradients and borders to player/GM messages and movement/action cards.
- [x] Add roll card styling and custom/preset face, edge, and number colors for all six SVG dice shapes.
- [x] Add chat picture blur, image opacity, and a color overlay.
- [x] Replace the native picker with in-app HSL/hex controls and avoid reparsing the image during color dragging.
- [x] Separate expanded context window, block-card, and collapsed-bar colors, opacity, gradients, and borders.
- [x] Add Ornate, Arcane, and Runic corner decorations and style dice breakdown/selection menus.
- [x] Keep imported pictures in a browseable library and remember a selected image folder across restarts.
- [x] Undo appearance reset across restarts, restoring settings and the selected picture.
- [x] Export/import portable themes with an optional embedded picture.
- [x] Add and verify floating/tiled Appearance switching on Hyprland, targeting only the app's settings window.
- [ ] Verify expanded context, decorative borders, dice menus/animations, gallery/sharing, picture effects, and picker responsiveness in a signed-in campaign.
- [ ] Review themes on logged-in campaign screens, NPC details, and menus.
- [ ] Check chat pictures, player/GM/NPC styles, message editors, and opacity in a signed-in campaign.
- [ ] Verify readable text and handle any components with fixed neutral colors.
- [x] User confirmed v0.1.0 runs successfully on Arch and Windows with no bugs spotted.
- [x] Add Alt+Enter/F11 fullscreen, separate gradient color opacity/proportions, independent dice result text, and WebP picture import.
- [x] Add sample roll-component fixtures and exclude full local references from Git and packages.
- [x] User confirmed the corrected v0.1.1 build works.
- [x] Sync Appearance settings to the app theme and add a resizable pinned panel beside the game, compatible with fullscreen.
- [x] Add a built-in Russian interface for Appearance and Translation settings tied to the translation switch.
- [x] Correct the website-wide `translate="no"` flag blocking translation; preserve nested exclusions and match Translation settings to app colors.
- [ ] Retest the v0.2.1 translation build in signed-in campaigns on both operating systems.

## 3. Local translation feasibility

- [x] Run the project’s local LibreTranslate service with English/Russian models.
- [x] Evaluate sample NPC descriptions, game terms, preserved names, and mixed English/Russian passages.
- [ ] Review translation quality on actual campaign descriptions.
- [x] Measure local translation latency and memory use; record results in TRANSLATION.md.
- [x] Pin tested LibreTranslate v1.9.6 by Docker digest; installed en/ru model packages are 1.9.

## 4. Russian translation

- [x] Add a local Russian dictionary for common interface text and game terminology.
- [x] Translate English descriptions and other displayed content while preserving Russian passages.
- [x] Handle mixed-language text and changes to text as the website renders it.
- [x] Keep typed messages, editable fields, and campaign data unchanged.
- [x] Keep requests in the main process, connected only to numeric loopback; the website retains ordinary DOM access without a preload or IPC API.
- [x] Cache translations locally and support original-text display.
- [x] Handle an unavailable translator without preventing use of the website.

## 5. Distribution

- [x] License the wrapper under MIT and preserve bundled Electron/Chromium notices.
- [x] Build Linux x86_64 AppImage and Windows x64 portable EXE releases.
- [x] Prepare the AUR binary-package recipe and publishing guide.
- [ ] Submit the prepared recipe through an AUR maintainer account.
- [x] Include pinned Windows translator/model resources and third-party license notices (v0.3.0).
- [x] Run the included Windows translator automatically without Docker or a separate installation (v0.3.0).
- Linux translator bundling is deferred at the user's request; retain separate LibreTranslate setup.
- [x] Prepare GitHub Actions checks, native Windows/Linux builds, packaged-resource tests, and checksums.
- [x] Run native Linux and Windows CI, including packaged-resource and Windows model checks (v0.3.0).
- [x] Test v0.1.0 packaged releases on both operating systems using dual boot.
- [x] Publish verified Linux/Windows releases through v0.4.0 with checksums.
- Verify AUR installation on a clean Arch system and maintain package updates.

## 6. Release 0.4.0

- [x] Add independent natural-20/natural-1 D20 colors with previews, persistence, localization, reset/undo, and theme sharing.
- [x] Add campaign map height resizing and top-layer expansion with two-dimensional resizing, keyboard controls, per-campaign sizes, reset, and Escape.
- [x] Add opt-in `/me` italic drafts and `/gm` `#text#` drafts, with review before sending, rich-text/mention preservation, and built-in Russian labels.
- [x] Make commands line-scoped, format on Enter, and start the next paragraph without inherited marks.
- [x] Expand fixed Russian UI copy, use КБ / Класс брони and Умение consistently, translate app menus and Франц, and preserve official model names.
- [x] Reserve a toolbar row for the pinned Appearance button on Windows to prevent overlap with game controls.
- [ ] Check these features in a signed-in campaign on Linux and Windows; selectors use the saved website component references.
- Host helpers and shared music playback remain planned. Private visibility between players requires support from the Friends & Fables service.

## 7. Release 0.5.0

- [x] Use soft breaks for Shift+Enter without paragraph spacing or inherited command marks.
- [x] Display completed sentences incrementally, share small batches across paragraphs, prioritize visible blocks, and show translation progress.
- [x] Add fixed battle-summary, inventory-event and progression translations; preserve canonical ability/spell names in prose.
- [x] Make expanded maps movable by dragging or keyboard, with remembered positions and viewport bounds.
- [x] Add world map resizing and expansion with independent per-campaign sizes.
- [ ] Verify new map controls against a signed-in live campaign; automated tests use the saved shared component structure and original canvas interactions.
