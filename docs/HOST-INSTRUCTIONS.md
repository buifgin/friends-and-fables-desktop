# Saved /sp instructions (unreleased)

Open **Appearance → Saved /sp Instructions…**, press **Ctrl+Shift+P**, or enter `/sp` by itself in campaign chat. This opens the app's settings window without sending a message.

Write up to 4,000 characters of guidance, enable **Append /sp to my messages**, and save. Scene-continuity, character-reaction, and separated-party templates can be inserted and edited. The settings apply to messages sent from this computer across campaigns and survive restarts in `host-instructions.json`. They are excluded from portable appearance themes.

Enable **Use different instructions during combat** and enter a second text to switch automatically when an encounter starts or ends. Combat text replaces adventure text. The badge then shows `/sp · adventure` or `/sp · combat`; turning this option off uses the adventure text everywhere. Both texts support up to 4,000 characters. A queued send is canceled if encounter state changes during preparation.

The command hint shows `/sp active` after instructions have been configured. Click its badge to edit settings. Disable the option to stop attaching instructions; the badge then shows `/sp inactive`. In Players Only mode it shows a paused state and attaches nothing. [Players Only excludes Franz](https://fables.gg/patch-notes/input-bar-redesign-player-chat-mode-toggles).

Enter and Send prepare the ordinary draft, append one marked block, verify the editor's resulting content, and use the site's existing Send button. Retries replace the previous block instead of accumulating copies. Empty drafts, unavailable Send buttons, mode changes, or edits during queued submission stay unsent. Shift+Enter and Format command never attach or send instructions.

The attached block uses `[[FF-SP:1]]` and `[[/FF-SP:1]]` around ordinary guidance for Franz. These are reserved markers and cannot be entered inside the saved instructions. The block is ordinary message text and counts toward its size; it does not establish a system-message role, grant game authority, or guarantee model behavior.

Completed marked sections are hidden by default in this app. Enable **Show marked instructions in chat** to review them. Hiding preserves the website's original message nodes and records. This is client-side display filtering: the shared message still includes the guidance, and browser users or other clients can read it. The feature should not be used to send secrets. It does not create a private GM channel or per-character access controls. [Working Context blocks are also shared with players and the AI](https://help.fables.gg/en/help/articles/8560008-working-context-blocks).

The website receives no preload or application IPC API. Only the owned app instruction window can read/save preferences. The instruction text reaches the ordinary website renderer when enabled, as required for preparing the message.

Run `npm run build`, `node --test tests/commands/host-instructions-core.test.cjs`, and `npm run test:instructions`. The offline Electron test uses a real Tiptap editor and synthetic messages; it sends nothing to a live campaign. It checks persistence, first-use `/sp`, native schema normalization, retries, mode/edit/disabled guards, reversible hiding, original node preservation, translated settings, and IPC restrictions.
