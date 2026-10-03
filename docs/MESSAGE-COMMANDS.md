# Message commands (0.5.1)

In Appearance → App, enable **Enable /me and /gm commands** and apply. The setting starts disabled and stays local when importing or exporting themes.

- `/me I look closer.` makes its own line italic in the campaign composer.
- `/gm Keep the party together.` wraps its own line as `#Keep the party together.#`.
- Enter (including Ctrl+Enter) prepares every command line in the draft, converts `№` to `#` outside code, checks the result through the editor schema, and submits through the website's normal Send button after its draft state updates. Clicking Send uses the same preparation and check.
- Shift+Enter formats only the current command line and inserts a soft break without paragraph margins or inherited italics. An existing break is reused. It never submits.
- **Format command** prepares the whole draft for review without sending it. The hint is centered under the composer.
- An empty command anywhere in the draft blocks submission and asks for text. Whitespace-only drafts also stay unsent. Held Enter and repeated clicks cannot duplicate a queued submission. Editing a queued draft cancels that submission.

Mentions, links, Russian text, literal HTML characters, and existing rich text stay structured. Code blocks and inline code are left intact. Character forms, dialogs, and context-block editors receive no command handler. Optional [saved /sp instructions](HOST-INSTRUCTIONS.md) can append ordinary narration guidance at submission; they are hidden locally and remain part of the stored shared message.

Disabling the setting restores the site's normal keyboard and Send behavior when saved /sp instructions have not been configured. `/sp` by itself opens its settings independently of the /me and /gm option.

The current adventure and combat inputs share one redesigned action surface. The handler finds that surface without relying on the former working-context spacer and captures Enter at the window level before native input handlers.

The composer uses Tiptap’s native editor reference, with a React lookup fallback. Enter and Send format `/gm` and attach enabled `/sp` guidance before the website receives the message. Offline integration tests use that native reference without fabricated React fibers.

The formatting hint and saved `/sp` status appear in a row below the native composer border. They do not change the editor’s layout or add another enclosing border.
