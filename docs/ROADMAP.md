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
- [x] Apply player styling to composer buttons/icons and the working-context bar, and GM styling to battle summaries.
- [x] Add automatic/custom text colors, including GM Thoughts and headings, and keep character fields readable under app themes.
- [x] Make the uploaded chat picture follow the website's background-image switch.
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

- Choose a project license and account for the licenses of distributed dependencies and models.
- Evaluate how to package and manage the local translation engine on Windows and Arch.
- Aim for a user setup that does not require Docker.
- Build Windows and Linux artifacts through GitHub Actions.
- Test packaged releases on both operating systems using dual boot.
- Investigate an AUR package after the Arch release is verified.
