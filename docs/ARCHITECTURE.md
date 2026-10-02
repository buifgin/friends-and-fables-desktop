# Application structure

The project groups related source, renderer UI and regression tests by feature. This lets a change stay in one ownership area while exposing shared integration points for review.

| Feature | Source | Renderer assets | Tests |
| --- | --- | --- | --- |
| Appearance | src/appearance/ | assets/appearance/ | tests/appearance/ |
| Music | src/music/ | assets/music/ | tests/music/ |
| Translation | src/translation/ | assets/translation/ | tests/translation/ |
| Commands and host instructions | src/commands/ | assets/commands/ | tests/commands/ |
| Campaign map | src/map/ | Injected by the feature | tests/map/ |
| Shared desktop shell | src/shell/ | assets/shell/ | tests/shell/ and feature integration suites |
| Shared runtime/settings helpers | src/shared/ | assets/shared/ | Feature integration suites |

src/main.ts remains the entry point and compiles to dist/main.js. It owns application lifecycle and connects feature managers. src/shell/ owns the common toolbar, menus, shortcuts and floating settings windows. src/appearance/appearance.ts currently also owns the settings protocol whitelist and installation of map/composer integrations; changes there need review across feature boundaries. src/shared/app-paths.ts anchors bundled assets and development translator files relative to the application root, including app.asar packages.

Renderer protocol URLs and IPC channels stay stable. Only the physical files move: for example, fables-desktop://settings/translation.html resolves to assets/translation/translation.html. Whitelists remain fixed; the website has no application preload or IPC bridge. Feature preloads compile beside their manager, while shell preloads live in dist/shell/.

Shared handwritten fixtures stay under tests/fixtures/. Build/release/test runners stay under scripts/; the external Python translator adapter stays under translator/. npm run build removes generated dist before compiling so deleted or moved preloads cannot remain in a release.

For new development, keep feature behavior, UI and tests together. Assign shared integration files to one owner and serialize changes that touch the same file. Parallel implementation requires disjoint file ownership and isolated worktrees; merge and test one contribution at a time.

Run npm run check and npm test for the complete TypeScript/unit/Electron checks. Native Electron suites run sequentially because they share display focus. Run python3 -B tests/translation/translator-protocol.test.py for the Python adapter. CI also repeats the Electron suites against packaged resources on Linux and Windows.
