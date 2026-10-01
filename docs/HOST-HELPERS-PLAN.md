# Host helpers: behavior to confirm

The next helper should prepare instructions for review and leave sending to the campaign's existing controls. Before implementing it, choose whether instructions belong in the normal shared message or require a private GM channel. A local app setting or hidden text does not establish message access controls.

Suggested editable instruction templates, based on the README examples:

- When party members are separated, briefly describe each group's current situation when relevant, without inventing events the characters could not observe.
- Base NPC reactions on the character's established appearance, background, and behavior. Mention the relevant detail in the narration.
- Keep continuity with the established scene and character details. Ask for clarification when those details conflict.

These are narration prompts, not guarantees that the model retrieves every record or updates game mechanics. Nothing in this plan has been sent or added to a campaign.

## Verified service behavior

- [Custom Instructions](https://help.fables.gg/en/help/articles/8680638-custom-instructions): the current guide directs narration instructions into Working Context blocks of type `instruction`; the old campaign-settings instruction system is deprecated. It distinguishes narration guidance from game-state mechanics.
- [Working Context Blocks](https://help.fables.gg/en/help/articles/8560008-working-context-blocks): context blocks are shared between players and the AI. They must not be presented as a private GM channel.
- [Message modes](https://fables.gg/patch-notes/input-bar-redesign-player-chat-mode-toggles): Players Only excludes Franz and therefore cannot deliver GM instructions.

A private GM send route has not been verified. Per-character secret messages also need service-level recipient enforcement; a wrapper-only display filter cannot provide that property.

Shared music remains separate work. The plan still needs a choice of supported audio source and whether sharing a track link is sufficient or synchronized playback is required.
