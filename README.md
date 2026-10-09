# Friends & Fables Desktop

An unofficial desktop wrapper for [Friends & Fables](https://play.fables.gg/), targeting Windows and Arch Linux.

The app opens the existing website and adds local themes, campaign chat pictures, and message styling. Optional local English-to-Russian translation is available from the Translation menu.

The current release is [0.6.0](https://github.com/buifgin/friends-and-fables-desktop/releases/tag/v0.6.0), with animated music controls, improved translation and progression handling, and centered window controls. See [release notes](docs/releases/v0.6.0.md).

## Current features

- Open the existing website in a native window.
- Translate displayed English into Russian with a built-in D&D glossary and local translation engine. The Windows portable EXE includes the runtime and English–Russian model; Linux uses the local LibreTranslate service. Preserve Russian passages, names, URLs, and dice notation; switch back to originals and cache translations locally.
- Use a persistent browser session for cookies and website storage.
- Keep website content sandboxed, with Node integration disabled.
- Allow HTTPS navigation and sandboxed sign-in popups in the same session.
- Provide standard menus for reload, zoom, copy/paste, developer tools, and opening the website in your browser.
- Choose AMOLED black, soft black, light, or a custom background color, with saved preferences.
- Import a local PNG, JPEG, or WebP picture behind campaign chat, with cover/contain sizing, blur, image opacity, and a color overlay. Browse previously imported pictures or a permanently selected image folder.
- Set separate colors, opacity, gradients with separate opacity for each color, color proportions, and borders for player and GM/NPC messages. Campaign inputs have their own style; battle summaries use the GM palette.
- Set independent colors, opacity, gradients, and borders for the expanded context window, its block cards, and the collapsed bar above the input.
- Customize movement/action cards, dice roll cards, and dice menus. Choose plain borders or Ornate, Arcane, and Runic corner decorations for messages, inputs, context surfaces, events, and dice.
- Choose black, white, purple, or custom SVG dice face/edge/number colors while preserving animations and results. Set an independent color for calculations, outcomes, and damage beneath dice.
- Choose independent natural-20 and natural-1 D20 colors, with previews and portable theme sharing. Finished natural face values select these palettes; roll totals and menu icons use their normal colors.
- Enable a map height handle and an expanded map with mouse/keyboard resizing. Keep sizes per campaign, close with Escape, and reset the layout.
- Enable `/me` for italic drafts and `/gm` for `#text#` drafts. Prepare and review the rich text before sending through the website normally.
- Use an in-app color picker with hue, saturation, lightness, and hex controls. Preview updates are coalesced, and color dragging does not reload the picture.
- Keep character editor fields readable using the app theme's foreground color.
- Undo the last appearance reset, including the selected picture, even after restarting.
- Export and import themes, optionally including the selected picture for friends.
- Use a black application menu bar and dropdowns on Linux, with an option to restore the system menu bar. Open Appearance as a floating window on Hyprland.
- Build a Linux x86_64 AppImage and Windows x64 portable EXE; keep the development ZIP option.

- Play music from the searchable bundled catalog or local folders, with persistent main-window playback.
- Save separate adventure/combat `/sp` guidance and named appearance themes.
- Hide unfinished translations behind animated dots when desired.

## Download the app

Download the Linux AppImage or Windows portable EXE from [GitHub Releases](https://github.com/buifgin/friends-and-fables-desktop/releases). No Node.js installation is needed to run these files.

On Arch/Linux, make the AppImage executable and run it:

```sh
chmod +x friends-and-fables-desktop-0.6.0-linux-x86_64.AppImage
./friends-and-fables-desktop-0.6.0-linux-x86_64.AppImage
```

On Windows, run `friends-and-fables-desktop-0.6.0-windows-x64.exe`. The build is unsigned. The Windows package includes the English–Russian translator and model.

The [AUR guide](docs/AUR.md) includes a prepared binary-package recipe and submission steps. AUR publication requires an AUR account and SSH key.

## Run the app from source

Install Node.js 24 LTS with npm, then from the repository root run:

```sh
npm ci
npm run install:electron
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

`check` verifies TypeScript without emitting files. `test` runs an Electron smoke test with an offline page and a temporary profile; it checks themes, image import and effects, the background switch, three independent context surfaces, decorative borders, dice menus, SVG dice paint, the in-app picker and drag performance, text and icon colors, character fields, newly rendered components, campaign navigation, reset and undo across restarts, folder persistence and pagination, picture-library browsing, portable theme export/import, reload, preference storage, the Linux menu bar, IPC access restrictions, and zoom handling. Its invalid-input and unauthorized-window cases deliberately produce rejection messages before the final PASS result.

`make` builds the application and writes the packaged folder and portable ZIP under `out/`. It targets the current operating system by default. On Windows, run the commands in PowerShell.

For single-file releases, use `npm run dist:linux` or `npm run dist:windows`. See [release instructions](docs/RELEASING.md) for builds, checksums, and GitHub uploads. The AppImage and portable EXE are written to `out/releases/`; signing and automatic updates are deferred.

## Appearance and zoom

Open **Appearance → Customize Appearance…** from the application menu. The editor has eight tabs: **Theme**, **Chat picture**, **Messages**, **Context**, **Events**, **Dice**, **Sharing**, and **App**.

In **Theme**, choose one of these presets:

- **AMOLED black:** neutral backgrounds and panels use pure black.
- **Soft black:** a black background with slightly lighter panels.
- **Light:** a light gray background with dark text.
- **Custom color:** choose a color with the picker or enter a `#RRGGBB` value.
- **Website default:** restore the site's original colors.

In **Chat picture**, click **Choose picture…** to import a PNG, JPEG, or WebP from your computer. WebP pictures are converted to PNG with transparency preserved; animated WebP imports as a still picture. Pictures must be at most 20 MB and 16 million pixels; the stored PNG must also fit within 20 MB. Choose **Cover the chat area** to fill the area, or **Show the whole picture** to keep the entire image visible. **Remove picture** restores the campaign's existing background when applied. The picture is copied into the app's local profile and used only in this desktop app. Removing or resetting it deselects it; the copy stays in the picture library.

Click **Browse pictures…** to see **Imported pictures** or **Selected folder**. **Choose folder…** saves a permanent folder choice: after restarting, the browser opens that folder again until you choose another one or the folder is moved/deleted. It lists the folder's PNG/JPEG/WebP files, loads more thumbnails with **Show more**, and refreshes the list each time you open it. Subfolders are not scanned. Choosing a folder picture copies it into the library, so an applied theme keeps its picture even if the source folder later moves. If the folder is unavailable, use the library or select another folder.

Use **Image blur**, **Image opacity**, **Overlay color**, and **Overlay opacity** to soften the picture or tint it. For a blurred image under black, choose a black overlay and increase its opacity. Message text and controls stay sharp. These effects apply only to your uploaded chat picture.

The uploaded picture follows the website's background-image button at the top of the campaign. Enable that button to show the picture; disable it to hide the picture. Your selected file stays saved while hidden.

In **Messages**, enable **Customize message backgrounds**, then choose separate colors and background opacity for **Player messages & inputs** and **Game master & NPC messages**. At 0%, the background is transparent; at 100%, it is solid. Text remains opaque. The message editor, its placeholder, campaign text inputs, bottom buttons and their icons use the player settings. Character editor fields follow the app theme so chat transparency cannot hide their values.

**Automatic text color** chooses black or white based on the message background's opacity over the app theme. To choose your own color, disable it and set **Text & icons** for player or GM messages. This is useful over pictures with bright or dark areas. GM text settings also cover the **Thoughts** control and bold headings. Battle summaries and character damage cards use the GM background and text settings, while damage/healing/distance colors are preserved.

Open **Gradient & border** inside either message editor to enable a second background color and direction, or choose a border color, width, and corner radius. Choose **Plain**, **Ornate corners**, **Arcane diamonds**, or **Runic corners** as the border style. The three decorative variants use your border color and width. A disabled border removes the card outline; backgrounds can still be transparent.

In **Context**, enable customization and use **Customize** to switch between **Expanded window**, **Messages / block cards**, and **Collapsed bar above input**. Each has its own background, opacity, text color, gradient, and border. They start with solid dark backgrounds; keeping the expanded window opaque prevents the story from showing through it when player messages are transparent. The expanded window palette covers its header, search, tabs, and footer; the block palette covers the formerly blue/purple cards. Category dots and the usage meter retain their category colors.

When a gradient is enabled, **First color opacity** controls the main background color and **Second color opacity** controls the added color independently. Text remains opaque. Each **Gradient & border** editor also includes **First color share**. A 50% / 50% share blends across the whole surface; increasing one color’s share gives it a longer solid region before or after the blend. Older themes keep their current opacity and default to an even share.

In **Events**, customize the compact movement/action cards with their own colors, opacity, gradient, and border. In **Dice**, customize the roll card background and border independently, and optionally enable dice colors. The roll breakdown popup and dice-selection dialog use the same roll-card palette and decorative border. The **Black**, **White**, and **Purple** buttons set face, edge, and number colors; the individual pickers allow any color. D4, D6, D8, D10, D12, and D20 keep their geometry, roll values, and animations. Disable **Use the current roll text color** to choose a separate **Text beneath dice** color for calculations, success/failure, and damage. This works even with roll-card and SVG customization disabled.

In source version 0.4.0, **Critical dice colors** has independent **Customize natural 20** and **Customize natural 1** switches and face, edge, and number pickers. These work without general dice recoloring. **Preview result** shows the normal, natural-20, or natural-1 palette. The special colors apply after a D20 stops spinning; a total of 20 from modifiers does not activate them. Shared themes include these palettes, and resetting appearance disables them until restored with Undo.

In source version 0.4.0, open **App**, enable **Resizable campaign map**, and apply. Drag the map's lower edge or focus it and press Up/Down to change height. **Expand map** opens the same interactive canvas above the sidebar; drag its lower-right corner, or use all four arrow keys. Hold Shift for larger keyboard steps. **Close map** or Escape returns it to the sidebar, and **Reset size** restores the site's dimensions. Sizes are saved locally for each campaign. This preference stays local when importing/exporting themes; editors and existing map dialogs receive no extra controls.

### In-development combat workspace

The combat workspace is under development and is not included in published release **0.6.0**. In a development build, open the dice panel with the dice button; the actions panel opens automatically during combat, and its button can close it or reopen it. Both panels sit on the left while chat and the map remain visible. Drag a panel's right edge or focus it and use the arrow keys to resize; hold Shift for larger steps, and press Home or double-click the edge to reset. The layout starts compact; toggle **Comfortable layout** for more spacing. Width and density are stored per campaign. Appearance → **Side panel** → **Customize side panel appearance** changes panel styling only.

Use **Manage pins** to keep native checks and saving throws in a campaign-local shortcut tray; **Favorites** activates the website's native Favorites tab. **Corrections** recognizes the native custom-attack modifier and proficiency fields and offers decrement, increment, zero, and apply controls. Named local presets can be saved, loaded, and deleted manually. Presets never apply automatically, and shortcuts do not roll or write to character sheets. Workspace preferences stay local and are excluded from shared themes.

In source version 0.4.0, **App → Enable /me and /gm commands** adds an opt-in draft formatter. `/me I look closer.` becomes italic rich text, while `/gm Keep the party together.` becomes `#Keep the party together.#`. Enter, **Format command**, or the first Send click prepares a command for review; then send normally. Shift+Enter keeps newline behavior. Mentions, links, literal text, and code remain structured. See [message-command behavior](docs/MESSAGE-COMMANDS.md).

Color swatches open an in-app picker. Drag hue, saturation, or lightness, or enter a hex color; **Use color** keeps the draft and **Cancel** restores the previous color. Click **Apply changes** in Appearance to save it.

In **Sharing**, click **Export theme…** to save the current preview as a `.fables-theme.json` file. **Include the selected chat picture** embeds that picture so friends can import the same look without copying a separate file. **Import theme…** loads a theme into the preview; click **Apply changes** to use it. A theme without an embedded picture keeps the recipient's selected picture. Login, campaign data, folder paths, and Linux window/menu preferences are not exported.

The Appearance editor follows the selected app theme, including light and custom colors. In **App**, enable **Pin Appearance to the main interface** and apply. A button opens the settings in a resizable panel on the left of the game, including in fullscreen. Drag its right edge to resize, or focus the separator and use the arrow keys. Closing the panel preserves its draft; disabling the pin restores the separate window. The panel width is saved locally and stays out of shared themes.

The application menus, centered round Appearance/music controls and right window controls share one toolbar row. Windows starts without a native title bar or border; **App → Show native Windows title bar and border** restores it after restarting. **Show extra expand-input button** is off by default. Command hints stay below the native input border, and opening working context applies its palette to that input. Event styles apply to event cards, while character dialogs follow the app theme. These changes are in the current source hotfix.

Appearance and Translation settings both follow the saved app theme. Changing the theme keeps unsaved translation choices intact.

Enabling Russian translation also switches Appearance and Translation settings to their built-in Russian labels, help text, and dialogs. This works without the model service. **Show original text** restores English labels and keeps unsaved settings intact.

In **App** on Linux, **Black Linux menu bar** replaces the File/Edit/Appearance/Translation/View/Window strip with a black app-owned bar and black dropdown menus. Menus fit both windowed and fullscreen views; Escape or clicking outside closes them, and arrow keys navigate their options. Turn it off to use the system menu bar. Window decorations are still managed by your desktop. **Floating Appearance window** is enabled by default: on Hyprland, the app targets only its own Appearance window through `hyprctl`; other Linux desktops receive a dialog-window hint. This does not edit compositor configuration. On Hyprland, turning it off and applying tiles the current Appearance window.

Click **Apply changes** to update the app and save your choices. Settings reapply after page reloads and application restarts. **Reset appearance** restores the website theme, campaign artwork, and original message/input/context/event/dice styling; it keeps your menu-bar and floating-window preferences. **Undo last reset** restores all previous choices and the picture, including after a restart. The saved image folder and imported-picture library are retained. Closing the settings window without applying keeps the previous choices.

Color themes use the website's shared neutral color variables and preserve artwork unless you import a chat picture. Message and input styling targets the current campaign page components, so website changes may require updates to those selectors. Components with fixed colors may need further adjustments after checking logged-in pages.

Zoom in with **Ctrl+=** or **Ctrl+Shift+=** (the `+` key), zoom out with **Ctrl+-**, and reset with **Ctrl+0**. Numpad plus and minus also work. Physical key handling supports English and Russian keyboard layouts. Toggle fullscreen with **Alt+Enter**, **Alt+numpad Enter**, or **F11**; holding the key does not repeatedly toggle the window.

## Manual verification

1. Start the app and confirm the Friends & Fables login page appears.
2. Sign in using your usual method. Google sign-in still needs manual verification because providers may restrict embedded browsers.
3. Close and reopen the app and check whether the website preserves the session.
4. Check resize, zoom, reload, and copy/paste on Hyprland and Windows.
5. Launch the packaged executable and repeat the checks.
6. In a campaign, import a picture and try both sizing options. Turn the website's background-image button off and on, and check that the uploaded picture follows it while other campaign artwork is preserved.
7. Set player and GM colors and opacity, including 0% and 100%. Try gradients, borders, and automatic/custom text colors. Check messages, editor text/placeholder, bottom buttons/icons, GM Thoughts/headings, and battle summaries. Open character editors and check names, HP, and stats under dark/light themes.
8. Expand context with transparent player messages. Try different palettes for the expanded window, block cards, and collapsed bar. Check search, tabs, and footer; try all three decorative border styles on messages and movement/roll cards. Open a dice breakdown popup and dice-selection dialog. Try black/white/purple and custom dice colors during and after a roll.
9. Drag the in-app color controls with a large chat picture selected. Check blur, picture opacity, and overlay tint without blurring the text.
10. On Linux, switch the black menu bar off and on. Check all six dropdowns in windowed and fullscreen views: options should be fully visible on a black background without scrolling. Check menu commands, arrow keys, Escape, clicking outside, and zoom shortcuts. On Hyprland, switch Appearance between floating and tiled.
11. Browse a folder with more than 12 pictures, restart, and confirm the same folder appears. Add/remove a picture and reopen the browser to refresh the list. Check that imported pictures remain after removal/reset.
12. Reset appearance, restart, and undo the reset. Export a theme with a picture and import it on another profile or machine; check preview and application.

Email login, persistent sessions, resizing, copy/paste, keyboard input, and appearance presets have been confirmed by the user on Hyprland. The latest context, decorative borders, dice menus, picture browser, sharing, and picker changes have offline Electron checks; they still need a check in a signed-in campaign. Floating/tiled Appearance switching was separately verified on Hyprland without changing the parent window. The user reported successful v0.1.0 runs on Arch and Windows with no bugs spotted. The corrected black dropdowns were verified in windowed and fullscreen Hyprland views, with every menu fully visible. Separate gradient color opacity, theme migration, persistence, and preview have offline Electron checks. The user confirmed the corrected v0.1.1 build works. The v0.2.1 translation fix overrides the website’s page-wide browser translation opt-out and includes matching Translation-window themes. Regression checks cover this document flag, local exclusions, home/game labels, drafts, persistence, and theme changes; the engine also has a real local-model benchmark. Version 0.3.0 additionally keeps translated backgrounds visible when dropdowns set accessibility flags, adds over 600 glossary/interface entries, and themes neutral portal menus. The new build still needs a signed-in campaign check on both systems.

Website permissions such as camera, microphone, and notifications are disabled in this initial starter. They can be added when needed.

## Planned features

- [x] Translate common English interface labels, descriptions, and displayed story text into Russian using a local translation engine (v0.2.0 prototype).
- [x] Preserve Russian passages and editable fields.
- [x] Cache translations and provide a way to view original text.
- [x] Apply translations locally to the displayed page without changing campaign records or typed messages.
- [x] Add custom color dice with menu at top of screen with picker of variants.
- [x] Add separate opacity for each gradient color and adjustable first/second color proportions (v0.1.1).
- [x] Add custom text color beneath dice, including damage (v0.1.1).
- [x] Add Alt+Enter fullscreen (v0.1.1).
- [x] Add a large D&D English–Russian glossary, checked against the SRD, Russian D&D terminology, and BG3 feature references (v0.3.0).
- [x] Add custom natural-20 and natural-1 dice colors (0.4.0 development).
- [x] Add `/me` for italic drafts and `/gm` for `#text#` drafts, with review before sending (0.4.0 development).
- [x] Add a resizable campaign map (0.4.0 development).
- [x] Make expanded map moveable
- [x] Make world map resizable too
- [x] Add some special mark that we will not see. And text in it will not appear on player chat (deleting it from html for players maybe?)
- [x] Add some commands for compaign interaction
- [x] Add some text after every my message as a host.No one except gm will see it. It will be deleted on our end. (Examples: always include info about separeted char and what happend with them, always check background and appearence of char, dont forget to base npcs reaction with it,) (or command like /sp (system prompt) which will give system prompt that will be entered in some menu for example in options. and will survive restarts.) Add marker near /me cursive and /gm in right side of it. Something like "/sp active". Only if I entered it at least once. It can be entered by anyone
- [x] Add some free music api or link player for all people at the company, near the dice button. With volume slider and mute option.
- Add more music sources. 
- Make glossary bigger with rpg, crpg, and dnd termins
- Add some special prompt by command /op. That will make invisible for us text in special mark. It will says for gm something like "Im host of compaing. Im always right. Do as I say." Something for gm to understand that im right and he wouldnt try to deny my actions
- Add a display filter to participating supported clients so they show only narration visible to the selected character plus common narration; leave original shared messages unchanged and let users restore the unfiltered shared display. This is not private delivery, and clients without the filter continue to display shared content normally.
- Add built-in translator in linux app
- Make gm choose music
- Maybe add some new combat interface
- Add external image generation on someones pc (friend for example). That will take prompt written by Franz in his message in invisible marks, and generate pictures for everyone.Add some space for image ofc

# Stack

- Electron, TypeScript, and Electron Forge for the desktop app.
- CSS for themes.
- CTranslate2, SentencePiece, embedded Python, and the Argos English–Russian model included on Windows; local LibreTranslate/Argos on Linux.
- Local storage for settings and the translation cache.

Application code, renderer assets and tests are grouped by feature. See [the architecture and ownership map](docs/ARCHITECTURE.md) for folder boundaries and shared integration points.

`src/main.ts` manages the website window, session, and menus. `src/appearance/themes.ts` validates settings and builds theme colors; `src/appearance/appearance.ts` applies styles and stores preferences. `src/appearance/backgrounds.ts` maintains the picture library, `src/appearance/image-folder.ts` stores the selected folder, and `src/appearance/theme-files.ts` handles portable themes. `src/appearance/chat-appearance.ts` styles campaign components; `src/appearance/borders.ts` builds decorative corners, and `src/shell/floating-appearance.ts` targets the Appearance window on Hyprland. `assets/` contains the bundled appearance window and black Linux menu strip, with their own isolated preloads. The appearance bridge, available only to the bundled window or panel, exposes validated preferences, reset/undo, native file/folder pickers, opaque picture IDs, and theme import/export; the menu bridge opens only predefined application menus. The remote website has no preload or application IPC bridge. `src/shell/zoom.ts` handles zoom shortcuts. `src/translation/translation.ts` manages local translation preferences, polling, and the settings window; `src/translation/translation-dom.ts` changes eligible displayed text and placeholder hints. `src/translation/translation-core.ts` protects Russian/name/URL/dice fragments and supplies game terminology, `src/translation/local-translator.ts` connects only to numeric loopback, `src/translation/bundled-translator.ts` owns the included Windows service, and `src/translation/translation-cache.ts` keeps a bounded local cache.

Open **Translation → Translate into Russian** to enable translation. **Show original text** restores the English display. **Translation Settings…** lets you disable machine-translated prose for dictionary-only mode, preserve additional names, check the local service, and clear the cache. Translation starts disabled.

The local service on this Linux computer was verified with English/Russian models. Version 0.3.0 includes the translator and English–Russian model inside the Windows EXE. Enable translation and the private local service starts automatically; no Docker, Python installation, or separate model download is needed. Linux continues to use a separate LibreTranslate service. See [translation setup and test results](docs/TRANSLATION.md) and [glossary coverage and sources](docs/GLOSSARY.md).

Windows translation works offline with the included model; Linux translation works offline after its service models are installed. Friends & Fables itself still requires internet access.

See the [roadmap](docs/ROADMAP.md) for the implementation order.

## Development references and builds

Keep full saved campaign pages and their assets under `references/`. This folder stays local and is excluded from Git and both packaging workflows. Small fixtures with sample text live under `tests/fixtures/`.

The GitHub Actions workflow checks TypeScript, runs offline Electron tests, builds an AppImage on Linux and a portable EXE on Windows, tests packaged resources, and uploads build artifacts with checksums. It runs after pushes to `main`, version tags, pull requests, or manual dispatch once committed to GitHub. Release publication remains a separate step.

## References

- [Electron Forge](https://www.electronforge.io/)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/)
- [LibreTranslate API](https://docs.libretranslate.com/guides/api_usage/)

This project is independent of the Friends & Fables service. The desktop wrapper is [MIT licensed](LICENSE); bundled Electron/Chromium components retain their own license notices.
