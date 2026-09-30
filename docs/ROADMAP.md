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
- [ ] Test the packaged app and themes on Windows.

## 3. Local translation feasibility

- Start a local LibreTranslate service and install the English/Russian models.
- Try actual NPC descriptions, game terms, names, and mixed English/Russian passages.
- Measure translation latency and memory use on the target computer.
- Select and pin a tested service version after the initial evaluation.

## 4. Russian translation

- Add a local Russian dictionary for common interface text and game terminology.
- Translate English descriptions and other displayed content while preserving Russian passages.
- Handle mixed-language text and changes to text as the website renders it.
- Keep typed messages, editable fields, and campaign data unchanged.
- Route translation requests through a controlled main-process bridge.
- Cache translations locally and support original-text display.
- Handle an unavailable translator without preventing use of the website.

## 5. Distribution

- [x] License the wrapper under MIT and preserve bundled Electron/Chromium notices.
- [x] Build Linux x86_64 AppImage and Windows x64 portable EXE releases.
- [x] Prepare the AUR binary-package recipe and publishing guide.
- [ ] Submit the prepared recipe through an AUR maintainer account.
- [ ] Account for translation model licenses before bundling them.
- Evaluate how to package and manage the local translation engine on Windows and Arch.
- Aim for a user setup that does not require Docker.
- Build Windows and Linux artifacts through GitHub Actions.
- Test packaged releases on both operating systems using dual boot.
- Verify AUR installation on a clean Arch system and maintain package updates.
