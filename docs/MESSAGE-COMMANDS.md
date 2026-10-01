# Message commands (0.4.0 source build)

In Appearance → App, enable **Enable /me and /gm commands** and apply. The setting starts disabled and stays local when importing or exporting themes.

- `/me I look closer.` prepares italic text in the campaign composer.
- `/gm Keep the party together.` prepares `#Keep the party together.#`.
- **Format command**, Enter, or the first click on Send prepares a recognized command for review. After reviewing it, send through the website normally. Holding Enter during preparation cannot send the prepared draft.
- Shift+Enter keeps the editor's normal newline behavior. Empty commands ask for text. Other commands and ordinary messages use the website's normal behavior.

Formatting is part of the draft's rich text, so it is included in the message when you send it. Mentions, links, Russian text, and literal characters are preserved. `/me` leaves code formatting intact. Character forms, dialogs, and context-block editors receive no command handler.

The app locates the existing editor through the current website's React component properties and operates on its document JSON. It creates no network request or application IPC bridge. Its controls have built-in English/Russian labels tied to the translation switch.

Tests use a real Tiptap editor in a sandboxed offline browser and simulate the website's delayed draft state and send actions. The bundled test editor is a development dependency; it is excluded from application releases. A signed-in campaign check remains needed because the website can change independently.

Editor API references: [document JSON and editor methods](https://tiptap.dev/docs/editor/api/editor), [setContent](https://tiptap.dev/docs/editor/api/commands/content/set-content), and [italic marks](https://tiptap.dev/docs/editor/extensions/marks/italic).
