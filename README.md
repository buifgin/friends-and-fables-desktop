# Friends & Fables Desktop

An unofficial desktop app for [Friends & Fables](https://play.fables.gg/), built with Electron. It adds local appearance controls, translation, music, and campaign tools around the existing website. This community project is not affiliated with or officially supported by Friends & Fables.

The latest release is **0.8.0**. Download the [Linux x86_64 AppImage](https://github.com/buifgin/friends-and-fables-desktop/releases/download/v0.8.0/friends-and-fables-desktop-0.8.0-linux-x86_64.AppImage) or [Windows x64 portable app](https://github.com/buifgin/friends-and-fables-desktop/releases/download/v0.8.0/friends-and-fables-desktop-0.8.0-windows-x64.exe). See the [release notes](docs/releases/v0.8.0.md) or [all releases](https://github.com/buifgin/friends-and-fables-desktop/releases).

On Linux, make the AppImage executable and run it:

```sh
chmod +x friends-and-fables-desktop-0.8.0-linux-x86_64.AppImage
./friends-and-fables-desktop-0.8.0-linux-x86_64.AppImage
```

The Windows app is portable and unsigned. No Node.js installation is needed to run either download.

## Features

- Customize themes, chat pictures, messages, context panels, events, and dice.
- Translate displayed English into Russian with the bundled glossary and local translation options.
- Save campaign chat settings, favorites, and combat corrections.
- Play music from the built-in catalog or local folders.
- Resize campaign maps and use the left combat workspace.
- Keep website login and preferences in a local app profile.

## Run from source

Install Node.js 24 or newer, then run:

```sh
npm ci
npm run install:electron
npm start
```

## Project docs

- [Release notes](docs/releases/v0.8.0.md)
- [Build and release guide](docs/RELEASING.md)
- [Translation setup](docs/TRANSLATION.md)
- [Music guide](docs/MUSIC.md)
- [Roadmap and known issues](docs/ROADMAP.md)

Development is paused after this release; no future work is promised.

## License

The project source is available under the [MIT License](LICENSE). Bundled third-party components retain their own license notices.
