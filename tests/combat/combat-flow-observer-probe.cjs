// Read-only, bounded diagnostic for the coordinator's authorized native form.
// No mutation callbacks, hook calls, network reads or root-wide tree traversal.
module.exports = function probeCombatFlowObservers() {
  const form = document.querySelector('[data-ff-combat-docked] form');
  if (!form) return { unavailable: 'native form' };
  let fiber = Object.entries(form).find(([key]) => key.startsWith('__reactFiber$'))?.[1];
  const output = [];
  for (let depth = 0; fiber && depth < 40; depth++, fiber = fiber.return) {
    if (typeof fiber.type !== 'function' || !String(fiber.type).includes('sendAttackRoll')) continue;
    let hook = fiber.memoizedState;
    for (let index = 0; hook && index < 100; index++, hook = hook.next) {
      const value = hook.memoizedState;
      if (!value || typeof value.getCurrentResult !== 'function' || typeof value.options?.mutationFn !== 'function') continue;
      const source = String(value.options.mutationFn);
      const result = value.getCurrentResult();
      const variables = result?.variables, data = result?.data;
      output.push({
        index, source: source.slice(0, 8000), status: result?.status,
        variableKeys: variables && typeof variables === 'object' ? Object.keys(variables) : [],
        variables: variables && {
          campaignId: variables.campaignId, encounterId: variables.encounterId,
          requestId: variables.requestId, eventId: variables.eventId,
          characterId: variables.characterId, commandUsed: variables.commandUsed,
          rollType: variables.rollResult?.rollType,
          targetAC: variables.targetAC,
        },
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
        data: data && { id: data.id, request_id: data.request_id, campaign_id: data.campaign_id, character_id: data.character_id, command_used: data.command_used },
        supportsSubscribe: typeof value.subscribe === 'function',
      });
    }
    break;
  }
  return { observers: output };
};
