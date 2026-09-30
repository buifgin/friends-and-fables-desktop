# Roadmap

## 1. Local translation feasibility

- Start the LibreTranslate development service and install the English/Russian models.
- Try actual NPC descriptions, game terms, names, and mixed English/Russian passages.
- Measure translation latency and memory use on the target computer.
- Select and pin a tested container version after the initial evaluation.

## 2. Basic Electron wrapper

- Scaffold Electron with TypeScript and Electron Forge.
- Load Friends & Fables with sandboxing enabled and Node integration disabled for website content.
- Verify the user's login method, persistent sessions, and external-link handling.
- Test startup, resizing, and keyboard input under Hyprland and Windows.

## 3. Background customization

- Add theme presets and a custom background color picker.
- Save preferences and provide a reset-to-website-theme option.
- Inspect actual website selectors and verify text contrast across affected surfaces.

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
