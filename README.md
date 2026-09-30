# Friends & Fables Desktop

An unofficial desktop wrapper for [Friends & Fables](https://play.fables.gg/), targeting Windows and Arch Linux.

The app opens the existing website and adds local background themes. English-to-Russian translation is planned for a later milestone.

## Current Electron starter

- Open the existing website in a native window.
- Use a persistent browser session for cookies and website storage.
- Keep website content sandboxed, with Node integration disabled.
- Allow HTTPS navigation and sandboxed sign-in popups in the same session.
- Provide standard menus for reload, zoom, copy/paste, developer tools, and opening the website in your browser.
- Choose AMOLED black, soft black, light, or a custom background color, with saved preferences.
- Package a portable ZIP for Linux or Windows.

## Run the app

Install Node.js 24 LTS with npm, then from the repository root run:

```sh
npm ci
npm start
```

`npm start` compiles the TypeScript code, then opens Electron. When editing `src/main.ts`, stop the app and run `npm start` again to load the changes. End users of a packaged app will not need Node.js.

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

`check` verifies TypeScript without emitting files. `test` runs an Electron smoke test with an offline page and a temporary profile; it checks theme application, reset, reload, preference storage, IPC access restrictions, and zoom handling. Its invalid-input and unauthorized-window cases deliberately produce rejection messages before the final PASS result.

`make` builds the application and writes the packaged folder and portable ZIP under `out/`. It targets the current operating system by default. On Windows, run the commands in PowerShell.

The initial ZIP is a development distribution; installers, signing, and AUR packaging come later.

## Appearance and zoom

Open **Appearance → Background Theme…** from the application menu.

- **AMOLED black:** neutral backgrounds and panels use pure black.
- **Soft black:** a black background with slightly lighter panels.
- **Light:** a light gray background with dark text.
- **Custom color:** choose a color with the picker or enter a `#RRGGBB` value.
- **Website default:** restore the site's original colors.

Click **Apply theme** to update the app and save your choice. The theme reapplies after page reloads and application restarts. Custom artwork behind the chat is preserved.

Themes use the website's shared neutral color variables. Components with their own fixed colors may need additional adjustments after checking logged-in pages. The app does not override background images.

Zoom in with **Ctrl+=** or **Ctrl+Shift+=** (the `+` key), zoom out with **Ctrl+-**, and reset with **Ctrl+0**. Numpad plus and minus also work. Physical key handling supports English and Russian keyboard layouts.

## Manual verification

1. Start the app and confirm the Friends & Fables login page appears.
2. Sign in using your usual method. Google sign-in still needs manual verification because providers may restrict embedded browsers.
3. Close and reopen the app and check whether the website preserves the session.
4. Check resize, zoom, reload, and copy/paste on Hyprland and Windows.
5. Launch the packaged executable and repeat the checks.
6. Try each theme in a campaign, open NPC details and menus, and check text readability and custom chat artwork.
7. Reload, restart, and restore the website theme to check preference persistence and reset.

Email login, persistent sessions, resizing, copy/paste, and keyboard input have been confirmed by the user on Hyprland. Windows and logged-in theme coverage still need manual verification.

Website permissions such as camera, microphone, and notifications are disabled in this initial starter. They can be added when needed.

## Planned features

- Display the existing Friends & Fables website and preserve login between launches.
- Offer theme presets and a color picker for background customization, with saved settings and a reset option.
- Translate English menus, descriptions, and other displayed text into Russian using a local translation engine.
- Preserve content already written in Russian, including player and GM messages.
- Cache translations and provide a way to view the original text.
- Apply changes locally to the displayed page, without changing campaign data or typed messages.
- Add custome background adder as a picture
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
- LibreTranslate with its Argos translation engine for local English-to-Russian translation.
- Local storage for settings and the translation cache.

`src/main.ts` manages the website window, session, and menus. `src/themes.ts` builds the color palette, and `src/appearance.ts` applies it and stores preferences. `assets/` contains the bundled appearance window; its isolated preload exposes only preference loading and saving. The remote website has no preload or application IPC bridge. `src/zoom.ts` handles zoom shortcuts.

Local translation will use LibreTranslate/Argos. Its setup and integration are deferred until the Electron starter works on both operating systems.

Translation can work offline after its models are installed. Friends & Fables itself still requires internet access.

See the [roadmap](docs/ROADMAP.md) for the implementation order.

## References

- [Electron Forge](https://www.electronforge.io/)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/)
- [LibreTranslate API](https://docs.libretranslate.com/guides/api_usage/)

This project is independent of the Friends & Fables service. A project license has not been selected yet.
