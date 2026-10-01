# Message commands (0.5.0)

In Appearance → App, enable **Enable /me and /gm commands** and apply. The setting starts disabled and stays local when importing or exporting themes.

- `/me I look closer.` makes only its own line italic in the campaign composer.
- `/gm Keep the party together.` wraps only its own line as `#Keep the party together.#`.
- Enter formats the command on the current line and starts a plain new paragraph. Shift+Enter formats the current line and inserts a soft break in the same paragraph, without paragraph margins or inherited italics. An existing soft break is reused, so formatting a previous line does not create an extra empty line. Other lines stay independent.
- Ctrl+Enter formats the current line without adding a break. **Format command** or the first click on Send prepares all command lines independently for review. Holding Enter during preparation cannot send the prepared draft.
- Empty commands ask for text. Other commands and ordinary messages use the website's normal behavior. Enter only formats the current line; other command lines wait for their own Enter or an explicit Format command / Send preparation.

Formatting is part of the draft's rich text, so it is included in the message when you send it. Mentions, links, Russian text, and literal characters are preserved. `/me` leaves code formatting intact. Character forms, dialogs, and context-block editors receive no command handler.

The app locates the existing editor through the current website's React component properties and operates on its document JSON. It creates no network request or application IPC bridge. Its controls have built-in English/Russian labels tied to the translation switch.

Tests use a real Tiptap editor in a sandboxed offline browser and simulate the website's delayed draft state and send actions. The bundled test editor is a development dependency; it is excluded from application releases. A signed-in campaign check remains needed because the website can change independently.

Editor API references: [document JSON and editor methods](https://tiptap.dev/docs/editor/api/editor), [setContent](https://tiptap.dev/docs/editor/api/commands/content/set-content), and [italic marks](https://tiptap.dev/docs/editor/extensions/marks/italic).
