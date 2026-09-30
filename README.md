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
- Import a local picture behind campaign chat, with cover/contain sizing, blur, image opacity, and a color overlay. Browse previously imported pictures or a permanently selected image folder.
- Set separate colors, opacity, gradients, and borders for player and GM/NPC messages. Campaign inputs and bottom buttons use the player style; battle summaries use the GM palette.
- Set independent colors, opacity, gradients, and borders for the expanded context window, its block cards, and the collapsed bar above the input.
- Customize movement/action cards, dice roll cards, and dice menus. Choose plain borders or Ornate, Arcane, and Runic corner decorations for messages, inputs, context surfaces, events, and dice.
- Choose black, white, purple, or custom SVG dice face/edge/number colors while preserving animations and results.
- Use an in-app color picker with hue, saturation, lightness, and hex controls. Preview updates are coalesced, and color dragging does not reload the picture.
- Keep character editor fields readable using the app theme's foreground color.
- Undo the last appearance reset, including the selected picture, even after restarting.
- Export and import themes, optionally including the selected picture for friends.
- Use a black application menu bar on Linux, with an option to restore the system menu bar. Open Appearance as a floating window on Hyprland.
- Build a Linux x86_64 AppImage and Windows x64 portable EXE; keep the development ZIP option.

## Download the app

Download the Linux AppImage or Windows portable EXE from [GitHub Releases](https://github.com/buifgin/friends-and-fables-desktop/releases). No Node.js installation is needed to run these files.

On Arch/Linux, make the AppImage executable and run it:

```sh
chmod +x friends-and-fables-desktop-0.1.0-linux-x86_64.AppImage
./friends-and-fables-desktop-0.1.0-linux-x86_64.AppImage
```

On Windows, run `friends-and-fables-desktop-0.1.0-windows-x64.exe`. The first build is unsigned and still needs manual Windows verification.

The [AUR guide](docs/AUR.md) includes a prepared binary-package recipe and submission steps. AUR publication requires an AUR account and SSH key.

## Run the app from source

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

`check` verifies TypeScript without emitting files. `test` runs an Electron smoke test with an offline page and a temporary profile; it checks themes, image import and effects, the background switch, three independent context surfaces, decorative borders, dice menus, SVG dice paint, the in-app picker and drag performance, text and icon colors, character fields, newly rendered components, campaign navigation, reset and undo across restarts, folder persistence and pagination, picture-library browsing, portable theme export/import, reload, preference storage, the Linux menu bar, IPC access restrictions, and zoom handling. Its invalid-input and unauthorized-window cases deliberately produce rejection messages before the final PASS result.

`make` builds the application and writes the packaged folder and portable ZIP under `out/`. It targets the current operating system by default. On Windows, run the commands in PowerShell.

For single-file releases, use `npm run dist:linux` or `npm run dist:windows`. See [release instructions](docs/RELEASING.md) for builds, checksums, and GitHub uploads. The AppImage and portable EXE are written to `out/releases/`; signing and automatic updates are deferred.

## Appearance and zoom

Open **Appearance → Customize Appearance…** from the application menu. The window has eight tabs: **Theme**, **Chat picture**, **Messages**, **Context**, **Events**, **Dice**, **Sharing**, and **App**.

In **Theme**, choose one of these presets:

- **AMOLED black:** neutral backgrounds and panels use pure black.
- **Soft black:** a black background with slightly lighter panels.
- **Light:** a light gray background with dark text.
- **Custom color:** choose a color with the picker or enter a `#RRGGBB` value.
- **Website default:** restore the site's original colors.

In **Chat picture**, click **Choose picture…** to import a PNG or JPEG from your computer. Pictures must be at most 20 MB and 16 million pixels; the stored PNG must also fit within 20 MB. Choose **Cover the chat area** to fill the area, or **Show the whole picture** to keep the entire image visible. **Remove picture** restores the campaign's existing background when applied. The picture is copied into the app's local profile and used only in this desktop app. Removing or resetting it deselects it; the copy stays in the picture library.

Click **Browse pictures…** to see **Imported pictures** or **Selected folder**. **Choose folder…** saves a permanent folder choice: after restarting, the browser opens that folder again until you choose another one or the folder is moved/deleted. It lists the folder's PNG/JPEG files, loads more thumbnails with **Show more**, and refreshes the list each time you open it. Subfolders are not scanned. Choosing a folder picture copies it into the library, so an applied theme keeps its picture even if the source folder later moves. If the folder is unavailable, use the library or select another folder.

Use **Image blur**, **Image opacity**, **Overlay color**, and **Overlay opacity** to soften the picture or tint it. For a blurred image under black, choose a black overlay and increase its opacity. Message text and controls stay sharp. These effects apply only to your uploaded chat picture.

The uploaded picture follows the website's background-image button at the top of the campaign. Enable that button to show the picture; disable it to hide the picture. Your selected file stays saved while hidden.

In **Messages**, enable **Customize message backgrounds**, then choose separate colors and background opacity for **Player messages & inputs** and **Game master & NPC messages**. At 0%, the background is transparent; at 100%, it is solid. Text remains opaque. The message editor, its placeholder, campaign text inputs, bottom buttons and their icons use the player settings. Character editor fields follow the app theme so chat transparency cannot hide their values.

**Automatic text color** chooses black or white based on the message background's opacity over the app theme. To choose your own color, disable it and set **Text & icons** for player or GM messages. This is useful over pictures with bright or dark areas. GM text settings also cover the **Thoughts** control and bold headings. Battle summaries and character damage cards use the GM background and text settings, while damage/healing/distance colors are preserved.

Open **Gradient & border** inside either message editor to enable a second background color and direction, or choose a border color, width, and corner radius. Choose **Plain**, **Ornate corners**, **Arcane diamonds**, or **Runic corners** as the border style. The three decorative variants use your border color and width. A disabled border removes the card outline; backgrounds can still be transparent.

In **Context**, enable customization and use **Customize** to switch between **Expanded window**, **Messages / block cards**, and **Collapsed bar above input**. Each has its own background, opacity, text color, gradient, and border. They start with solid dark backgrounds; keeping the expanded window opaque prevents the story from showing through it when player messages are transparent. The expanded window palette covers its header, search, tabs, and footer; the block palette covers the formerly blue/purple cards. Category dots and the usage meter retain their category colors.

In **Events**, customize the compact movement/action cards with their own colors, opacity, gradient, and border. In **Dice**, customize the roll card background and border independently, and optionally enable dice colors. The roll breakdown popup and dice-selection dialog use the same roll-card palette and decorative border. The **Black**, **White**, and **Purple** buttons set face, edge, and number colors; the individual pickers allow any color. D4, D6, D8, D10, D12, and D20 keep their geometry, roll values, and animations.

Color swatches open an in-app picker. Drag hue, saturation, or lightness, or enter a hex color; **Use color** keeps the draft and **Cancel** restores the previous color. Click **Apply changes** in Appearance to save it.

In **Sharing**, click **Export theme…** to save the current preview as a `.fables-theme.json` file. **Include the selected chat picture** embeds that picture so friends can import the same look without copying a separate file. **Import theme…** loads a theme into the preview; click **Apply changes** to use it. A theme without an embedded picture keeps the recipient's selected picture. Login, campaign data, folder paths, and Linux window/menu preferences are not exported.

In **App** on Linux, **Black Linux menu bar** replaces the File/Edit/Appearance/View/Window strip with a black app-owned bar and native dropdown menus. Turn it off to use the system menu bar. Window decorations are still managed by your desktop. **Floating Appearance window** is enabled by default: on Hyprland, the app targets only its own Appearance window through `hyprctl`; other Linux desktops receive a dialog-window hint. This does not edit compositor configuration. On Hyprland, turning it off and applying tiles the current Appearance window.

Click **Apply changes** to update the app and save your choices. Settings reapply after page reloads and application restarts. **Reset appearance** restores the website theme, campaign artwork, and original message/input/context/event/dice styling; it keeps your menu-bar and floating-window preferences. **Undo last reset** restores all previous choices and the picture, including after a restart. The saved image folder and imported-picture library are retained. Closing the settings window without applying keeps the previous choices.

Color themes use the website's shared neutral color variables and preserve artwork unless you import a chat picture. Message and input styling targets the current campaign page components, so website changes may require updates to those selectors. Components with fixed colors may need further adjustments after checking logged-in pages.

Zoom in with **Ctrl+=** or **Ctrl+Shift+=** (the `+` key), zoom out with **Ctrl+-**, and reset with **Ctrl+0**. Numpad plus and minus also work. Physical key handling supports English and Russian keyboard layouts.

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
10. On Linux, switch the black menu bar off and on. Check resizing, menu commands, and zoom shortcuts. On Hyprland, switch Appearance between floating and tiled.
11. Browse a folder with more than 12 pictures, restart, and confirm the same folder appears. Add/remove a picture and reopen the browser to refresh the list. Check that imported pictures remain after removal/reset.
12. Reset appearance, restart, and undo the reset. Export a theme with a picture and import it on another profile or machine; check preview and application.

Email login, persistent sessions, resizing, copy/paste, keyboard input, and appearance presets have been confirmed by the user on Hyprland. The latest context, decorative borders, dice menus, picture browser, sharing, and picker changes have offline Electron checks; they still need a check in a signed-in campaign. Floating/tiled Appearance switching was separately verified on Hyprland without changing the parent window. Windows verification remains pending.

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
- Add resizable map feature.
- Add opacity for gradiend and chosing how much will fill with 1-st color and how much with second(custom ratio).
- Add custom color of text under the dice (damage etc.)

## Stack

- Electron, TypeScript, and Electron Forge for the desktop app.
- CSS for themes.
- LibreTranslate with its Argos translation engine for planned local English-to-Russian translation.
- Local storage for settings and the translation cache.

`src/main.ts` manages the website window, session, and menus. `src/themes.ts` validates settings and builds theme colors; `src/appearance.ts` applies styles and stores preferences. `src/backgrounds.ts` maintains the picture library, `src/image-folder.ts` stores the selected folder, and `src/theme-files.ts` handles portable themes. `src/chat-appearance.ts` styles campaign components; `src/borders.ts` builds decorative corners, and `src/floating-appearance.ts` targets the Appearance window on Hyprland. `assets/` contains the bundled appearance window and black Linux menu strip, with their own isolated preloads. The appearance bridge exposes validated preferences, reset/undo, native file/folder pickers, opaque picture IDs, and theme import/export; the menu bridge opens only predefined application menus. The remote website has no preload or application IPC bridge. `src/zoom.ts` handles zoom shortcuts.

Local translation will use LibreTranslate/Argos. Its setup and integration are deferred until the Electron starter works on both operating systems.

Translation can work offline after its models are installed. Friends & Fables itself still requires internet access.

See the [roadmap](docs/ROADMAP.md) for the implementation order.

## References

- [Electron Forge](https://www.electronforge.io/)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/)
- [LibreTranslate API](https://docs.libretranslate.com/guides/api_usage/)

This project is independent of the Friends & Fables service. The desktop wrapper is [MIT licensed](LICENSE); bundled Electron/Chromium components retain their own license notices.
