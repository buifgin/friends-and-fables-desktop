# Build and publish a release

The release targets are Linux x86_64 AppImage and Windows x64 portable EXE. End users do not need Node.js. The Windows executable extracts its bundled files into a temporary directory when launched and stores preferences in the normal user profile; it does not install the app or require administrator access.

## Build

From the repository root, with Node.js 24 or newer:

```sh
npm ci
npm run check
npm test
```

Build Linux on Arch or another Linux host:

```sh
npm run dist:linux
```

Build Windows on Windows, using PowerShell, or cross-package this app's portable target on Linux:

```sh
npm run dist:windows
```

The pinned builder's resource editor and portable NSIS target can package this application from Linux. There are no application native Node dependencies to rebuild. Always launch and check the EXE on Windows before claiming Windows runtime verification.

Both commands place release files in `out/releases/`:

- `friends-and-fables-desktop-0.1.1-linux-x86_64.AppImage`
- `friends-and-fables-desktop-0.1.1-windows-x64.exe`

The AppImage uses the modern static AppImage runtime. The Windows release is unsigned; it may display a Windows publisher/reputation prompt. Automatic updates are not included in this version.

`npm start`, `npm run package`, and `npm run make` retain the Forge development/ZIP workflow. Distribution builds use `electron-builder.config.cjs`, including only compiled code, bundled assets, package metadata, and the MIT license. Website accounts, local pictures, and user settings are stored outside the build.

## Check the artifacts

Run the Linux AppImage without root:

```sh
chmod +x out/releases/friends-and-fables-desktop-0.1.1-linux-x86_64.AppImage
./out/releases/friends-and-fables-desktop-0.1.1-linux-x86_64.AppImage
```

Check login, restart persistence, zoom, Appearance, picture browsing, and context/dice styles. Repeat on Windows with the portable EXE. If AppImage mounting is unavailable, the runtime also supports `--appimage-extract-and-run`.

Generate checksums for the current package version from the repository root:

```sh
npm run checksums
cd out/releases
sha256sum -c SHA256SUMS
```

The checksum script uses the exact filenames for `package.json`’s version, so old release files cannot enter the new checksum list. CI generates a separate list for each platform.

The workflow in `.github/workflows/build.yml` performs checks, tests, native builds, packaged-resource tests, and artifact uploads on Linux and Windows. It needs no release credentials and does not publish releases. Download the artifacts from a successful workflow run, verify them manually, and use the publication steps below for the selected version.

## Publish on GitHub

The first published release is `v0.1.0`; the working version below is `v0.1.1`. For each release, update `package.json`/`package-lock.json`, rebuild, and update the AUR version/checksum. Publish the exact files you checked.

From the repository root:

```sh
git add .gitignore package.json package-lock.json src assets tests scripts .github electron-builder.config.cjs forge.config.cjs build LICENSE README.md docs packaging
git commit -m "Prepare desktop release v0.1.1"
git tag -a v0.1.1 -m "Friends & Fables Desktop 0.1.1"
git push origin main
git push origin v0.1.1
gh release create v0.1.1 --verify-tag --title "Friends & Fables Desktop 0.1.1" --notes-file docs/releases/v0.1.1.md --draft
gh release upload v0.1.1 out/releases/friends-and-fables-desktop-0.1.1-linux-x86_64.AppImage out/releases/friends-and-fables-desktop-0.1.1-windows-x64.exe out/releases/SHA256SUMS
gh release edit v0.1.1 --draft=false
```

If a tag/release already exists, upload to it rather than recreating it. Never replace a published AppImage with different bytes under the same name: the AUR checksum is tied to it. Use a new version for changed builds.

See [AUR publishing](AUR.md) for installing and submitting the binary package.

References: [electron-builder AppImage](https://www.electron.build/v26/docs/appimage/), [multi-platform builds](https://www.electron.build/v26/docs/features/multi-platform-build/), [GitHub CLI release commands](https://cli.github.com/manual/gh_release).
