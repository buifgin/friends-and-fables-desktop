# Friends & Fables Desktop

An unofficial desktop wrapper for [Friends & Fables](https://play.fables.gg/), targeting Windows and Arch Linux.

The app opens the existing website and adds local themes, campaign chat pictures, and message styling. English-to-Russian translation is planned for a later milestone.

## Current features

- Open the existing website in a native window.
- Use a persistent browser session for cookies and website storage.
- Keep website content sandboxed, with Node integration disabled.
- Allow HTTPS navigation and sandboxed sign-in popups in the same session.
- Provide standard menus for reload, zoom, copy/paste, developer tools, and opening the website in your browser.
- Choose AMOLED black, soft black, light, or a custom background color, with saved preferences.
- Import a local picture behind campaign chat, with cover or contain sizing.
- Set separate background colors and opacity for player and GM/NPC messages. Campaign text inputs use the player style.
- Use a black application menu bar on Linux, with an option to restore the system menu bar.
- Package a portable ZIP for Linux or Windows.

## Run the app

Install Node.js 24 LTS with npm, then from the repository root run:

```sh
npm ci
npm start
```

`npm start` compiles the TypeScript code, then opens Electron. After changing application code or bundled appearance assets, close the app and run `npm start` again. End users of a packaged app will not need Node.js.

On Arch, Electron automatically selects Wayland in a Wayland session. If you need to compare XWayland behavior while troubleshooting:

```sh
npm start -- -- --ozone-platform=x11
```

## Check and package

```sh
npm run check
npm test
npm run make
```

`check` verifies TypeScript without emitting files. `test` runs an Electron smoke test with an offline page and a temporary profile; it checks themes, image import, player/GM/input styling, opacity, newly rendered messages, campaign navigation, reset, reload, preference storage, the Linux menu bar, IPC access restrictions, and zoom handling. Its invalid-input and unauthorized-window cases deliberately produce rejection messages before the final PASS result.

`make` builds the application and writes the packaged folder and portable ZIP under `out/`. It targets the current operating system by default. On Windows, run the commands in PowerShell.

The initial ZIP is a development distribution; installers, signing, and AUR packaging come later.

## Appearance and zoom

Open **Appearance → Customize Appearance…** from the application menu. The window has four tabs: **Theme**, **Chat picture**, **Messages**, and **App**.

In **Theme**, choose one of these presets:

- **AMOLED black:** neutral backgrounds and panels use pure black.
- **Soft black:** a black background with slightly lighter panels.
- **Light:** a light gray background with dark text.
- **Custom color:** choose a color with the picker or enter a `#RRGGBB` value.
- **Website default:** restore the site's original colors.

In **Chat picture**, click **Choose picture…** to import a PNG or JPEG from your computer. Pictures must be at most 20 MB and 16 million pixels; the stored PNG must also fit within 20 MB. Choose **Cover the chat area** to fill the area, or **Show the whole picture** to keep the entire image visible. **Remove picture** restores the campaign's existing background when applied. The picture is copied into the app's local profile and used only in this desktop app.

In **Messages**, enable **Customize message backgrounds**, then choose separate colors and background opacity for **Player messages & inputs** and **Game master & NPC messages**. At 0%, the background is transparent; at 100%, it is solid. Text remains opaque. Campaign text fields, including the message editor, use the player settings.

In **App** on Linux, **Black Linux menu bar** replaces the File/Edit/Appearance/View/Window strip with a black app-owned bar and native dropdown menus. Turn it off to use the system menu bar. Window decorations are still managed by your desktop.

Click **Apply changes** to update the app and save your choices. Settings reapply after page reloads and application restarts. **Reset appearance** restores the website theme, campaign artwork, and original message/input backgrounds; it keeps your menu-bar preference. Closing the settings window without applying keeps the previous choices.

Color themes use the website's shared neutral color variables and preserve artwork unless you import a chat picture. Message and input styling targets the current campaign page components, so website changes may require updates to those selectors. Components with fixed colors may need further adjustments after checking logged-in pages.

Zoom in with **Ctrl+=** or **Ctrl+Shift+=** (the `+` key), zoom out with **Ctrl+-**, and reset with **Ctrl+0**. Numpad plus and minus also work. Physical key handling supports English and Russian keyboard layouts.

## Manual verification

1. Start the app and confirm the Friends & Fables login page appears.
2. Sign in using your usual method. Google sign-in still needs manual verification because providers may restrict embedded browsers.
3. Close and reopen the app and check whether the website preserves the session.
4. Check resize, zoom, reload, and copy/paste on Hyprland and Windows.
5. Launch the packaged executable and repeat the checks.
6. In a campaign, import a picture and try both sizing options. Check that it stays behind chat while other campaign artwork is preserved.
7. Set different player and GM colors and opacity, including 0% and 100%. Check existing and new messages, the message editor, text inputs, and NPC messages.
8. On Linux, switch the black menu bar off and on. Check resizing, menu commands, and zoom shortcuts.
9. Reload, restart, remove the picture, and reset appearance to check persistence and restoration.

Email login, persistent sessions, resizing, copy/paste, keyboard input, and appearance presets have been confirmed by the user on Hyprland. The new picture/message/input controls still need a check in a signed-in campaign. Windows verification remains pending.

Website permissions such as camera, microphone, and notifications are disabled in this initial starter. They can be added when needed.

## Planned features

- Translate English menus, descriptions, and other displayed text into Russian using a local translation engine.
- Preserve content already written in Russian, including player and GM messages.
- Cache translations and provide a way to view the original text.
- Apply changes locally to the displayed page, without changing campaign data or typed messages.
- Add command /me for cursive sentences and /gm will set # mark at start and end of sentece
- Add some special mark that we will not see. 
- Add admin version app for me. Private ofc
- Add some text after my message as a host. Only for admin version app. (Examples: always include info about separeted char and what happend with them, always check background and appearence of char, dont forget to base npcs reaction with it,)
- Text that not adressed to that char will not be seen by him
- Add custom color dice with menu at top of screen with picker of variants.
- Add some free music api or link player for all people at the company, near the dice button. With volume slider and mute option.

## Stack

- Electron, TypeScript, and Electron Forge for the desktop app.
- CSS for themes.
- LibreTranslate with its Argos translation engine for planned local English-to-Russian translation.
- Local storage for settings and the translation cache.

`src/main.ts` manages the website window, session, and menus. `src/themes.ts` validates settings and builds theme colors; `src/appearance.ts` applies styles and stores preferences. `src/backgrounds.ts` imports pictures, and `src/chat-appearance.ts` styles campaign messages and inputs. `assets/` contains the bundled appearance window and black Linux menu strip, with their own isolated preloads. The appearance bridge exposes preference loading/saving and the app's image picker; the menu bridge opens only predefined application menus. The remote website has no preload or application IPC bridge. `src/zoom.ts` handles zoom shortcuts.

Local translation will use LibreTranslate/Argos. Its setup and integration are deferred until the Electron starter works on both operating systems.

Translation can work offline after its models are installed. Friends & Fables itself still requires internet access.

See the [roadmap](docs/ROADMAP.md) for the implementation order.

## References

- [Electron Forge](https://www.electronforge.io/)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/)
- [LibreTranslate API](https://docs.libretranslate.com/guides/api_usage/)

This project is independent of the Friends & Fables service. A project license has not been selected yet.
