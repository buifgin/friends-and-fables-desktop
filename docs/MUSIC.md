# Music player

Use the top music button, press **Ctrl+Shift+M**, or use the music button beside the dice button in campaign chat. The player follows the app's appearance and English/Russian interface setting.

Add a track name and a direct HTTPS audio link. MP3, OGG, WAV, and other formats supported by the included Chromium runtime can play. YouTube and Spotify page links are not audio files. Links must remain accessible; expiring download links will eventually stop working.

The built-in **Music catalog** contains 266 tracks from [Scott Buckley's official Creative Commons library](https://www.scottbuckley.com.au/library/). Search by title, artist, mood, genre, or instrument in English or Russian; use the mood and genre filters to narrow results. Common scene keywords such as battle, dungeon, tavern, and their Russian equivalents also work. **Add to playlist** saves a track without starting audio; **Play** saves and starts it. Adding the same track again reuses the existing entry. The catalog is separate from the 50-track saved playlist.

Each entry includes the artist, license, and buttons for its official source and license pages. **Copy attribution** copies the selected catalog track's title, artist, source URL, and license URL. These tracks are offered under [CC BY 4.0](https://www.scottbuckley.com.au/library/using-this-music/); include credit when using them in published recordings. The metadata and all 266 direct audio URLs were checked on 2026-10-01. This is a bundled snapshot: browsing/search needs no music API or account, and audio is fetched from the artist only when playback starts. Links can change later.

The player provides Play/Pause, Stop, Previous/Next, seeking, volume, mute, and repeat for the current track. The playlist advances when a track ends; repeat keeps the current track playing. Selecting a track starts it. Previous/Next preserve paused playback.

Up to 50 tracks, the selected track, volume, mute, and repeat are saved in the app profile's `music.json`, separate from portable appearance themes. The player starts paused when the app launches and makes no audio request until Play. Campaign reloads and hiding the music library do not interrupt playback. Closing the main app window stops playback. Top controls provide play/pause, stop, next, repeat, mute, and a volume dropdown.

The **Music folders** tab lets you choose folders containing downloaded MP3, OGG, WAV, FLAC, M4A, OPUS, AAC, or WEBM files, subject to Chromium format support. Search by title or relative path, choose a folder filter, then play or add tracks to the playlist. Up to 16 folders and 1,000 tracks per folder are indexed through eight nested levels. Refresh to discover new files. Removing a source does not delete music. Local playback uses app URLs mapped only to chosen folders, with symlinks and outside paths excluded; these links cannot be shared as public audio URLs. Sources persist in `music-folders.json`.

**Copy track link** copies the selected audio URL for sharing. This first player plays audio locally; it does not synchronize playback or control other campaign members' players. No campaign message is sent automatically.

The player runs in a persistent sandboxed main-window view and its own browser session. Only that view can read/save music preferences or copy a saved link. The app-owned toolbar has a restricted transport API. The Friends & Fables website receives an ordinary DOM button and no preload or application IPC API. Audio links load as media, with no remote scripts or embedded website players.

Run `npm run build`, `node --test tests/music/music-settings.test.cjs`, and `npm run test:music` to check validation, real offline WAV playback, seeking, mute/volume/repeat, saved playlists, button placement, theme/localization changes, and IPC restrictions. Native CI repeats the Electron test against packaged assets on Linux and Windows.
