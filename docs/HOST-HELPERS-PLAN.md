# Host helpers: behavior to confirm

The next helper should prepare instructions for review and leave sending to the campaign's existing controls. Character-targeted narration remains ordinary shared message content: participating supported desktop clients should display only what the selected character can see plus common narration, without changing the original message. Users should be able to disable the filter and restore the unfiltered shared display. This client display filter does not provide privacy, and clients without the filter continue to display shared content normally. Private GM delivery is a separate feature that requires a verified service route; local settings or hidden text do not create message access controls.

## Open design question

The user prefers explicit character addressing or recognizable character-section headings, for example `/sp` guidance asking Franz to write “Тем временем у «Имя персонажа»”. These are candidate representations, not a final format. Define exact syntax, section boundaries, and how group or common headings work before implementation; do not use generic automatic interpretation as the plan. If a heading is unrecognized or ambiguous, keep its text visible instead of silently hiding it. Do not promise that Franz will always follow the heading guidance.

Suggested editable instruction templates, based on the README examples:

- When party members are separated, briefly describe each group's current situation when relevant, without inventing events the characters could not observe.
- Base NPC reactions on the character's established appearance, background, and behavior. Mention the relevant detail in the narration.
- Keep continuity with the established scene and character details. Ask for clarification when those details conflict.

These are narration prompts, not guarantees that the model retrieves every record or updates game mechanics. Nothing in this plan has been sent or added to a campaign.

## Verified service behavior

- [Custom Instructions](https://help.fables.gg/en/help/articles/8680638-custom-instructions): the current guide directs narration instructions into Working Context blocks of type `instruction`; the old campaign-settings instruction system is deprecated. It distinguishes narration guidance from game-state mechanics.
- [Working Context Blocks](https://help.fables.gg/en/help/articles/8560008-working-context-blocks): context blocks are shared between players and the AI. They must not be presented as a private GM channel.
- [Message modes](https://fables.gg/patch-notes/input-bar-redesign-player-chat-mode-toggles): Players Only excludes Franz and therefore cannot deliver GM instructions.

A private GM send route has not been verified. Character-targeted display filtering is a separate client behavior and does not claim service-level confidentiality.

Shared music remains separate work. The plan still needs a choice of supported audio source and whether sharing a track link is sufficient or synchronized playback is required.
