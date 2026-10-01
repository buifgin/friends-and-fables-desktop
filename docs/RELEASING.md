# Build and publish a release

The release targets are Linux x86_64 AppImage and Windows x64 portable EXE. End users do not need Node.js. Windows includes a private translator and English–Russian model; Linux machine translation uses a separate local LibreTranslate service; see [translation setup](TRANSLATION.md). The Windows executable extracts its bundled files into a temporary directory when launched and stores preferences in the normal user profile; it does not install the app or require administrator access.

## Build

From the repository root, with Node.js 24 or newer:

```sh
npm ci
npm run install:electron
npm run check
npm test
```

The pinned Electron version downloads its binary lazily. `install:electron` makes this explicit before Linux sandbox configuration and CI tests; see [Electron installation](https://www.electronjs.org/docs/latest/tutorial/installation#binary-download-step).

Build Linux on Arch or another Linux host:

```sh
npm run dist:linux
```

Build Windows on Windows, using PowerShell, or cross-package this app's portable target on Linux:

```sh
npm run dist:windows
```

The pinned builder's resource editor and portable NSIS target can package this application from Linux. There are no application native Node dependencies to rebuild. The Windows preparation step needs Python 3 on the build computer and downloads checksum-pinned Python/wheels/model from official providers; it caches them in `.cache/windows-translator`. End users need none of these build tools. The embedded runtime is packaged outside ASAR in `resources/translator`, with a complete file manifest and license notices. Always launch and check the EXE on Windows before claiming Windows runtime verification.

Both commands place release files in `out/releases/`:

- `friends-and-fables-desktop-0.4.0-linux-x86_64.AppImage`
- `friends-and-fables-desktop-0.4.0-windows-x64.exe`

The AppImage uses the modern static AppImage runtime. The Windows release is unsigned; it may display a Windows publisher/reputation prompt. Automatic updates are not included in this version.

`npm start`, `npm run package`, and `npm run make` retain the Forge development/ZIP workflow. Distribution builds use `electron-builder.config.cjs`, including compiled code, bundled assets, package metadata, the MIT license, and the Windows-only translator resources. Before Windows development/Forge packaging, run `npm run prepare:translator:windows`; the portable build does this automatically. Website accounts, local pictures, and user settings are stored outside the build.

## Check the artifacts

Run the Linux AppImage without root:

```sh
chmod +x out/releases/friends-and-fables-desktop-0.4.0-linux-x86_64.AppImage
./out/releases/friends-and-fables-desktop-0.4.0-linux-x86_64.AppImage
```

Check login, restart persistence, zoom, Appearance, picture browsing, and context/dice styles. Check light/custom Appearance themes, pin/unpin, panel dragging and remembered width, fullscreen, and built-in Russian settings labels. Check Translation on/off, original-text switching, preserved names and Russian text, editable drafts, streamed messages, cache reuse, and service failure/recovery. Repeat on Windows with the portable EXE, without an installed Python/Docker/service. Enable translation, open menus, restart, and confirm the model starts and exits with the app. Run `npm run test:bundled-model` against the unpacked Windows package for an offline model/authentication smoke test. If AppImage mounting is unavailable, the runtime also supports `--appimage-extract-and-run`.

Generate checksums for the current package version from the repository root:

```sh
npm run checksums
cd out/releases
sha256sum -c SHA256SUMS
```

The checksum script uses the exact filenames for `package.json`’s version, so old release files cannot enter the new checksum list. CI generates a separate list for each platform.

The workflow in `.github/workflows/build.yml` performs checks, tests, native builds, packaged-resource tests, and artifact uploads on Linux and Windows. It needs no release credentials and does not publish releases. Download the artifacts from a successful workflow run, verify them manually, and use the publication steps below for the selected version.

If GitHub rejects a workflow push with `without workflow scope`, the pull succeeded but the active credential cannot upload workflow files. Authorize the missing scope in the browser, then configure Git to use that login:

```sh
gh auth refresh --hostname github.com --scopes workflow
gh auth setup-git --hostname github.com
git push origin main
```

Local commits are preserved; a reset or another pull is unnecessary. See [GitHub CLI authentication scopes](https://cli.github.com/manual/gh_auth_refresh).

## Publish on GitHub

The first published release is `v0.1.0`; the working version below is `v0.4.0`. For each release, update `package.json`/`package-lock.json`, rebuild, and update the AUR version/checksum. Publish the exact files you checked.

From the repository root:

```sh
git add .gitignore package.json package-lock.json src assets tests scripts .github electron-builder.config.cjs forge.config.cjs build LICENSE README.md docs packaging compose.translate.yaml
git commit -m "Prepare desktop release v0.4.0"
git tag -a v0.4.0 -m "Friends & Fables Desktop 0.4.0"
git push origin main
git push origin v0.4.0
gh release create v0.4.0 --verify-tag --title "Friends & Fables Desktop 0.4.0" --notes-file docs/releases/v0.4.0.md --draft
gh release upload v0.4.0 out/releases/friends-and-fables-desktop-0.4.0-linux-x86_64.AppImage out/releases/friends-and-fables-desktop-0.4.0-windows-x64.exe out/releases/SHA256SUMS
gh release edit v0.4.0 --draft=false
```

If a tag/release already exists, upload to it rather than recreating it. Never replace a published AppImage with different bytes under the same name: the AUR checksum is tied to it. Use a new version for changed builds.

See [AUR publishing](AUR.md) for installing and submitting the binary package.

References: [electron-builder AppImage](https://www.electron.build/v26/docs/appimage/), [multi-platform builds](https://www.electron.build/v26/docs/features/multi-platform-build/), [GitHub CLI release commands](https://cli.github.com/manual/gh_release).
