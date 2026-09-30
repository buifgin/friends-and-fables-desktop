# Friends & Fables Desktop

An unofficial desktop wrapper for [Friends & Fables](https://play.fables.gg/), targeting Windows and Arch Linux.

The first milestone is a minimal Electron app that opens the existing website. Themes and local English-to-Russian translation will follow after the wrapper is verified.

## Current Electron starter

- Open the existing website in a native window.
- Use a persistent browser session for cookies and website storage.
- Keep website content sandboxed, with Node integration disabled.
- Allow HTTPS navigation and sandboxed sign-in popups in the same session.
- Provide standard menus for reload, zoom, copy/paste, developer tools, and opening the website in your browser.
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
npm run make
```

`check` verifies TypeScript without emitting files. `make` builds the application and writes the packaged folder and portable ZIP under `out/`. It targets the current operating system by default. On Windows, run the commands in PowerShell.

The initial ZIP is a development distribution; installers, signing, and AUR packaging come later.

## Manual verification

1. Start the app and confirm the Friends & Fables login page appears.
2. Sign in using your usual method. Google sign-in still needs manual verification because providers may restrict embedded browsers.
3. Close and reopen the app and check whether the website preserves the session.
4. Check resize, zoom, reload, and copy/paste on Hyprland and Windows.
5. Launch the packaged executable and repeat the checks.

Website permissions such as camera, microphone, and notifications are disabled in this initial starter. They can be added when needed.

## Planned features

- Display the existing Friends & Fables website and preserve login between launches.
- Offer theme presets and a color picker for background customization, with saved settings and a reset option.
- Translate English menus, descriptions, and other displayed text into Russian using a local translation engine.
- Preserve content already written in Russian, including player and GM messages.
- Cache translations and provide a way to view the original text.
- Apply changes locally to the displayed page, without changing campaign data or typed messages.

## Stack

- Electron, TypeScript, and Electron Forge for the desktop app.
- CSS for themes.
- LibreTranslate with its Argos translation engine for local English-to-Russian translation.
- Local storage for settings and the translation cache.

The app currently consists of `src/main.ts` (window, session, and menus), `tsconfig.json` (TypeScript compilation), and `forge.config.cjs` (packaging). There is no custom renderer or preload script yet.

Local translation will use LibreTranslate/Argos. Its setup and integration are deferred until the Electron starter works on both operating systems.

Translation can work offline after its models are installed. Friends & Fables itself still requires internet access.

See the [roadmap](docs/ROADMAP.md) for the implementation order.

## References

- [Electron Forge](https://www.electronforge.io/)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/)
- [LibreTranslate API](https://docs.libretranslate.com/guides/api_usage/)

This project is independent of the Friends & Fables service. A project license has not been selected yet.
