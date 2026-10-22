// Native scheduling belongs to the coordinator. This fixture uses its private
// CPU-only profile; it never connects to the game or imports another test entry.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Use the private-profile fixture runner.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const { configureCombatFlow } = require(path.join(appRoot, 'dist/combat/combat-flow'));

// Captured contracts: public07rvyszl7fdx0, SHA77e91750…b86eb,
// uQ695686/uZ698356/uD685553/uO686007/uG699907/uK700532/nS336078.
// This is a committed-Fiber DOM model, not a claim to execute production React.
// It deliberately preserves native branch ABSENCE, source classes, exclusive
// flags, callback identity and independent mutation/publication/spin phases.
function nativePage() {
  const $ = selector => document.querySelector(selector);
  const character = { id: 83026155, name: 'Fixture Hero', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="gold"/%3E%3C/svg%3E' };
  const campaign = { id: 'campaign-a', active_encounter_id: 412456 };
  const encounter = { id: 412456, currentTurnEntity: { entityId: 301, characterId: character.id, name: character.name, image: character.image, is_npc: false, type: 'player', hp: 20, conditions: [] } };
  const root = { tag: 3, stateNode: {} }; root.stateNode.current = root;
  const state = window.fixture = { campaign, character, encounter, root, sequence: 100, mode: 'hit', profile: 'profile-a', manual: true, endPending: false, gmPending: false, damagePending: false, calls: 0, endCalls: [], continueCalls: 0, submits: 0, lastEvent: { role: 'dm', command_used: 'encounter_player_turn_action_response', profile_id: 'profile-a' }, latestDm: null, footerEnabled: true, footerCommitted: true, otherSpinner: false };
  const rootChildren = [];
  // Native useCampaignEventsQuery: pages.flatMap(page=>page.data), lastEvent=events.at(-1).
  // public2zwjnwy9btd1s SHA2f06d6d8…a53d, query430490 / ee315275 / GM4264xx.
  const events = state.events = [];
  const eventsOwner = component(function uJ() { return 'useCampaignEventsQuery mostRecentDmEvent'; }, { events, campaign }, root);
  function link(parent, children) { parent.child = children[0]; children.forEach((child, index) => { child.return = parent; child.sibling = children[index + 1]; }); }
  function nodeFiber(node, props, parent, type = node.tagName.toLowerCase()) { const value = { tag: 5, type, stateNode: node, memoizedProps: props, return: parent }; node.__reactFiber$fixture = value; return value; }
  function component(type, props, parent) { return { type, memoizedProps: props, return: parent }; }
  function appendElement(parent, tag, className, text) { const node = document.createElement(tag); node.className = className || ''; if (text) node.textContent = text; parent.append(node); return node; }
  function observer(mutationFn) {
    let result = { status: 'idle', submittedAt: 0 }; const listeners = new Set();
    return { options: { mutationFn }, getCurrentResult: () => result, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, publish(next) { result = next; for (const listener of [...listeners]) listener(result); }, count: () => listeners.size };
  }
  const gmObserver = observer(function nativeGM({ lastEventId }) { return ['ENCOUNTER_GM_RESPONSE', 'GM_RESPONSE', lastEventId]; });
  state.gmObserver = gmObserver;
  const continueGMObserver = state.continueGMObserver = observer(function nativeGM({ lastEventId }) { return ['ENCOUNTER_GM_RESPONSE', 'GM_RESPONSE', lastEventId]; });
  continueGMObserver.mutate = variables => startFinal(continueGMObserver, variables, 'continue');
  state.finalCalls = [];
  function startFinal(observer, variables, kind) {
    if (state.finalThrow) throw Error('Native GM mutation failure');
    state.finalCalls.push({ kind, ...variables }); state.activeFinalObserver = observer;
    state.gmPending = true;
    observer.publish({ status: 'pending', submittedAt: Date.now(), variables });
    state.render();
  }
  state.finishFinalGM = (error = false) => {
    const watch = state.activeFinalObserver; if (!watch) throw Error('No final GM invocation');
    state.gmPending = false;
    watch.publish({ ...watch.getCurrentResult(), status: error ? 'error' : 'success' });
    // ee awaits its nested automatic GM before resolving the Damage operation.
    if (state.finalCalls.at(-1).kind === 'automatic') {
      state.damagePending = false;
      state.damageObserver.publish({ ...state.damageObserver.getCurrentResult(), status: error ? 'error' : 'success' });
    }
    state.render();
  };
  state.publishFinalResponse = () => {
    const final = { id: state.sequence + 4, role: 'dm', campaign_id: campaign.id, profile_id: state.profile, command_used: 'encounter_player_turn_action_response', request_id: state.finalCalls.at(-1)?.requestId };
    state.lastEvent = state.latestDm = final; events.push(final);
    const row = appendElement($('main'), 'div', '', 'Final Franz answer'); row.id = `event-container-${final.id}`;
    const value = component(function NativeEvent() {}, { event: final, campaign }, eventsOwner);
    link(value, [nodeFiber(row, {}, value)]); rootChildren.push(value); state.render();
  };
  const form = $('form'), draft = $('input'); state.form = form; state.draft = draft;
  const owner = component(function NativeExecuteActions() { const sendAttackRoll = null; return sendAttackRoll; }, { campaignId: campaign.id, encounterId: encounter.id, isUsersCharacterTurn: true, isMultiplayerCampaign: true }, root);
  owner.memoizedState = { memoizedState: { data: { usersCharacter: character } }, next: { memoizedState: gmObserver } };
  const provider = component(function NativeFormProvider() {}, { control: {}, getValues() { return [{ type: 'spell', requires_attack_roll: state.mode !== 'unsupported', modifier_value: 8, proficiency_bonus: 8, targets: [{ id: 2217533, ac: 10 }] }]; } }, owner);
  const formHost = nodeFiber(form, {}, provider); link(provider, [formHost]); link(owner, [provider]);

  // nS's named rolling state drives these exact class alternatives in BOTH
  // ordinary and advantage dice branches. No copied duration or hook index.
  function nS({ event, spinning, advantage }, parent, container) {
    const native = component(nS, { event }, parent);
    const card = appendElement(container, 'div'); card.id = `event-message-card-${event.id}`;
    const cardOwner = component(function NativeNarrativeCard() { return 'event-message-card-'; }, { eventId: event.id }, native);
    const cardHost = nodeFiber(card, {}, cardOwner);
    const panel = appendElement(card, 'div', 'relative rounded-2xl border-2 overflow-hidden'); panel.style.cssText = 'height:76px;border:2px solid #999';
    const panelHost = nodeFiber(panel, { className: panel.className }, cardHost);
    const dice = [];
    for (let index = 0; index < (advantage ? 2 : 1); index++) {
      const die = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      die.setAttribute('data-name', event.events_roll.roll_type === 'Damage' ? 'd10' : 'd20');
      die.setAttribute('viewBox', '0 0 32 32'); die.style.cssText = 'width:40px;height:40px';
      die.setAttribute('class', `transition-all duration-700 ease-out ${spinning ? 'animate-spin blur-sm scale-105' : 'blur-none scale-100'}`);
      die.innerHTML = '<circle cx="16" cy="16" r="12" fill="gold" />'; panel.append(die);
      dice.push(nodeFiber(die, { className: die.getAttribute('class') }, panelHost, 'svg'));
    }
    link(panelHost, dice); link(cardHost, [panelHost]); link(cardOwner, [cardHost]); link(native, [cardOwner]);
    return { fiber: native, event, card, panel, dice: dice.map(value => value.stateNode) };
  }
  state.rolls = [];
  function mountRoll(event, spinning = true) {
    const outer = appendElement($('main'), 'div'); outer.id = `event-${event.id}`;
    const row = appendElement(outer, 'div'); row.id = 'event-container-undefined';
    const eventOwner = component(function NativeEvent() {}, { event, campaign }, root);
    const host = nodeFiber(row, {}, eventOwner); link(eventOwner, [host]);
    const roll = nS({ event, spinning, advantage: state.advantage }, host, row); link(host, [roll.fiber]);
    events.push(event); roll.fiberRoot = eventOwner; roll.outer = outer; state.rolls.push(roll); rootChildren.push(eventOwner); return roll;
  }
  state.setSpin = (kind, spinning) => {
    const roll = state[kind]; if (!roll) return;
    for (const die of roll.dice) {
      const classes = `transition-all duration-700 ease-out ${spinning ? 'animate-spin blur-sm scale-105' : 'blur-none scale-100'}`;
      die.setAttribute('class', classes); die.__reactFiber$fixture.memoizedProps = { className: classes };
    }
    // React's class update need not trigger the adapter's filtered observer;
    // the existing500ms adapter schedule is an allowed completion fallback.
  };
  function nativeAvatar(parent, turn) { const avatar = appendElement(parent, 'div', 'relative flex items-center'); const image = appendElement(avatar, 'img', 'h-8 w-8'); image.src = turn.image; image.alt = turn.name; appendElement(avatar, 'span', 'chevrons', '»'); return avatar; }
  const nativeEndCallback = () => { state.endCalls.push({ entityId: encounter.currentTurnEntity.entityId, currentTurnEntityId: encounter.currentTurnEntity.entityId }); };
  state.nativeEndCallback = nativeEndCallback;
  function uO({ campaignId, encounterId, usersCharacter, shouldShowEndTurnButton, shouldShowRunNpcTurnButton, isHost }, parent, container) {
    const value = component(uO, { campaignId, encounterId, usersCharacter, shouldShowEndTurnButton, shouldShowRunNpcTurnButton, isHost }, parent);
    const turn = encounter.currentTurnEntity;
    if (!turn || (turn.characterId === usersCharacter.id && state.latestDm?.command_used === 'encounter_npc_turn_narration')) return value;
    if (shouldShowEndTurnButton) {
      let button = state.nativeEnd;
      if (!button?.isConnected) { button = document.createElement('button'); button.type = 'button'; button.id = 'native-end'; state.nativeEnd = button; }
      button.className = 'flex items-center gap-1 rounded-full border border-gray-700/50 bg-gray-800/70 hover:bg-gray-700 hover:border-gray-600/70 transition-colors pl-1 pr-4 py-1 mt-2 h-12';
      button.disabled = state.endPending; button.onclick = nativeEndCallback; button.replaceChildren();
      nativeAvatar(button, turn); appendElement(button, 'span', 'flex items-center', state.endPending ? 'Ending' : `End ${turn.name}'s Turn`); container.append(button);
      const host = nodeFiber(button, { className: button.className, onClick: nativeEndCallback, disabled: state.endPending }, value); link(value, [host]);
    }
    return value;
  }
  function uG({ usersCharacter }, parent, container) {
    const value = component(uG, { usersCharacter }, parent);
    const badge = appendElement(container, 'div', 'flex items-center gap-2 rounded-full border border-blue-500/50 bg-blue-600/20 px-3 py-2 h-10'); badge.id = 'native-your-turn';
    appendElement(badge, 'span', 'warning-pulse', '⚠'); appendElement(badge, 'span', 'text-sm font-medium text-blue-200', `Your turn, ${usersCharacter.name || 'Player'}`);
    link(value, [nodeFiber(badge, { className: badge.className }, value)]); return value;
  }
  // Captured uK owns a window Ctrl/Cmd+Enter listener independent of wrapper
  // visibility. The adapter may conceal its visual; this handler is untouched.
  let nativeContinue = () => {};
  window.addEventListener('keydown', event => { if (state.continueMounted && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); nativeContinue(); } });
  function uK({ campaignId, mostRecentDmEvent, usersCharacter, encounter, campaign, hasAccess, isPending, isGmResponding }, parent, container) {
    const props = { campaignId, mostRecentDmEvent, usersCharacter, encounter, campaign, hasAccess, isPending, isGmResponding };
    const value = component(uK, props, parent); state.continueMounted = true;
    value.memoizedState = { memoizedState: continueGMObserver, next: { memoizedState: { current: state.continueLastDm } } };
    // Captured uK callback uses mostRecentDmEvent.id, NOT the Damage lastEvent.
    // Its internal generated request UUID is not part of mutation variables.
    nativeContinue = function nativeContinueResponse() {
      const p = isPending || !hasAccess || isGmResponding;
      if (!mostRecentDmEvent?.id || p || state.continueBusy) return;
      state.continueLastDm = mostRecentDmEvent.id; state.continueBusy = true; state.continueCalls++;
      const generateFranzResponseMutation = continueGMObserver;
      generateFranzResponseMutation.mutate({ isRewrite: false, lastEventId: mostRecentDmEvent.id, requestId: undefined, isPlayerEncounterTurn: encounter.currentTurnEntity.characterId === usersCharacter.id, isMultiplayer: true });
    };
    state.continueNow = () => nativeContinue();
    if (isPending || state.continueLastDm === mostRecentDmEvent?.id) return value;
    const wrapper = appendElement(container, 'div', 'continue-button-wrapper'); wrapper.id = 'native-continue-wrapper';
    const button = appendElement(wrapper, 'button', 'flex items-center gap-1 rounded-full border border-gray-700/50 bg-gray-800/70 transition-colors pl-1 pr-1 md:pr-4 py-1 h-12', 'Continue'); button.type = 'button'; button.id = 'native-continue'; button.disabled = isPending || !hasAccess || isGmResponding || !!state.continueBusy; button.onclick = nativeContinue;
    const host = nodeFiber(wrapper, { className: wrapper.className }, value); link(value, [host]); link(host, [nodeFiber(button, { disabled: button.disabled, onClick: nativeContinue, className: button.className }, host)]); return value;
  }
  function uD(props, parent, container) {
    const value = component(uD, props, parent);
    if (props.shouldShowDeathSaveButton || props.isAnotherPlayersTurn || props.shouldShowRunNpcTurnButton) {
      const waiting = appendElement(container, 'div', 'native-exclusive', props.shouldShowDeathSaveButton ? 'Roll Death Save' : props.isAnotherPlayersTurn ? 'Waiting for Player' : 'Run NPC Turn'); link(value, [nodeFiber(waiting, {}, value)]);
    } else link(value, [uO(props, value, container)]);
    return value;
  }
  // uZ preserves the native right slot and native child absence. The DOM model
  // emits these branches from the captured semantic props, never a label guess.
  function uZ({ campaignId, campaign, encounter, usersCharacter, mostRecentDmEvent, hasAccess, continueMode, globalIsPending, showContinueButton, isGmResponding, showEncounterButtons, encounterId, shouldShowEndTurnButton, shouldShowRunNpcTurnButton, shouldShowDeathSaveButton, isAnotherPlayersTurn, currentTurnEntityName, isUsersTurn, isInputBarMinimized, isHost }) {
    const props = { campaignId, campaign, encounter, usersCharacter, mostRecentDmEvent, hasAccess, continueMode, globalIsPending, showContinueButton, isGmResponding, showEncounterButtons, encounterId, shouldShowEndTurnButton, shouldShowRunNpcTurnButton, shouldShowDeathSaveButton, isAnotherPlayersTurn, currentTurnEntityName, isUsersTurn, isInputBarMinimized, isHost };
    const value = component(uZ, props, root);
    const footer = $('#footer'); footer.className = 'h-fit flex items-center justify-between gap-2 px-3 pb-2';
    const host = nodeFiber(footer, { className: footer.className }, value); link(value, [host]);
    const right = $('#right'); right.className = 'flex items-center justify-end gap-2';
    // Preserve any mounted native End host through a native pending update.
    const priorEnd = state.nativeEnd; const wasMounted = priorEnd?.parentElement === right;
    for (const child of [...right.children]) if (child !== priorEnd) child.remove();
    if (!shouldShowEndTurnButton) priorEnd?.remove();
    const rightHost = nodeFiber(right, { className: right.className }, host); const children = [];
    if (showEncounterButtons && encounterId) children.push(uD({ ...props }, rightHost, right));
    if (isUsersTurn && !shouldShowEndTurnButton) children.push(uG({ usersCharacter }, rightHost, right));
    state.continueMounted = false;
    if (showContinueButton) children.push(uK({ campaignId, mostRecentDmEvent, usersCharacter, encounter, campaign, hasAccess, isPending: globalIsPending, isGmResponding }, rightHost, right));
    link(rightHost, children); link(host, [nodeFiber($('#left'), {}, host), rightHost]);
    if (wasMounted && shouldShowEndTurnButton && priorEnd !== state.nativeEnd) throw Error('Fixture replaced still-mounted native button');
    return value;
  }
  state.render = () => {
    const turn = encounter.currentTurnEntity;
    const isUsersTurn = turn?.characterId === character.id && !turn?.is_npc;
    const shouldShowEndTurnButton = isUsersTurn && ['encounter_player_turn_action_narration', 'encounter_player_turn_action_response', 'encounter_state_agent_response', 'encounter_player_turn_movement_narration'].includes(state.lastEvent?.command_used) && state.lastEvent?.profile_id === state.profile;
    const footer = uZ({ campaignId: campaign.id, campaign, encounter, usersCharacter: character, mostRecentDmEvent: state.latestDm, hasAccess: true, continueMode: state.manual ? 'manual' : 'auto', globalIsPending: state.gmPending || state.damagePending, showContinueButton: state.manual && state.lastEvent?.role !== 'dm' && !state.gmPending, isGmResponding: state.gmPending, showEncounterButtons: !!campaign.active_encounter_id, encounterId: campaign.active_encounter_id, shouldShowEndTurnButton, shouldShowRunNpcTurnButton: !!turn?.is_npc, shouldShowDeathSaveButton: turn?.hp <= 0, isAnotherPlayersTurn: turn?.characterId !== character.id && turn?.type === 'player', currentTurnEntityName: turn?.name, isUsersTurn, isInputBarMinimized: false, isHost: true });
    if (!state.footerEnabled) $('#footer').remove();
    link(eventsOwner, [owner, ...rootChildren, ...(state.footerCommitted ? [footer] : [])]); link(root, [eventsOwner]);
  };
  state.finishGM = (error = false) => {
    state.gmPending = false;
    // Nonautomatic/manual Continue remains a player-roll lastEvent. Own DM
    // streaming presence must not be mistaken for native footer eligibility.
    if (state.mode === 'no-damage') state.lastEvent = state.latestDm;
    gmObserver.publish({ ...gmObserver.getCurrentResult(), status: error ? 'error' : 'success' }); state.render();
  };
  state.finishDamage = (error = false) => { if (!error && !state.manual) { const damage = state.damage.event; startFinal(state.nestedGMObserver, { isRewrite: false, lastEventId: damage.id, requestId: damage.request_id, isPlayerEncounterTurn: true, isMultiplayer: true }, 'automatic'); return; } state.damagePending = false; const watch = state.damageObserver; watch.publish({ ...watch.getCurrentResult(), status: error ? 'error' : 'success' }); state.render(); };
  state.publishLateChoice = () => { state.latestDm.rollChoices = [state.choice]; state.choice.accepted = null; state.choiceOwner.memoizedProps.rollChoice = state.choice; state.render(); document.body.append(document.createElement('i')); };
  form.addEventListener('submit', event => {
    event.preventDefault(); state.submits++; state.sequence += 10;
    rootChildren.length = 0; events.length = 0; $('main').replaceChildren(); state.rolls = []; state.damage = undefined; state.callsAtSubmit = state.calls;
    const attackId = state.sequence, request = `local-request-${attackId}`;
    const attack = { id: attackId, role: 'player', profile_id: state.profile, request_id: request, campaign_id: campaign.id, character_id: character.id, character, created_at: new Date().toISOString(), command_used: 'roll_attack', events_roll: { roll_type: 'Spell Attack', dc: 10, total_roll: state.mode === 'miss' ? 9 : 24, modifier_value: 8, proficiency_bonus: 8 } };
    state.attack = mountRoll(attack, true); state.lastEvent = attack;
    const dmId = attackId + 1;
    const choice = state.choice = { id: attackId + 2, event_id: dmId, character_id: character.id, type: 'Damage', accepted: null, dice_expression: '1d10', fixed_bonus: 3 };
    const dm = state.latestDm = { id: dmId, role: 'dm', request_id: request, campaign_id: campaign.id, profile_id: state.profile, command_used: 'encounter_player_turn_action_response', processed: false, rollChoices: ['miss', 'no-damage'].includes(state.mode) ? [] : [choice] };
    events.push(dm);
    const dmRow = appendElement($('main'), 'div'); dmRow.id = `event-container-${dmId}`;
    const dmOwner = component(function NativeEvent() {}, { event: dm, campaign }, root);
    const dmHost = nodeFiber(dmRow, {}, dmOwner); link(dmOwner, [dmHost]); rootChildren.push(dmOwner);
    const card = appendElement(dmRow, 'div', '', state.mode === 'no-damage' ? 'Final answer without Damage' : 'Intermediate Franz'); card.id = `event-message-card-${dmId}`;
    const cardOwner = component(function NativeNarrativeCard() { return 'event-message-card-'; }, { eventId: dmId }, dmHost); link(cardOwner, [nodeFiber(card, {}, cardOwner)]);
    const rollObserver = observer(async function ee({ rollResult, rollChoice, rollCharacter, campaign, shouldTriggerFranz }) { const events_choices_rolls = 'events_choices_rolls', INSERT_EVENT = 'INSERT_EVENT', insertEventIntoQueryData = 'insertEventIntoQueryData', continueMode_ = 'continueMode_'; if (shouldTriggerFranz && continueMode_ !== 'manual') await Promise.resolve('mutateAsync Franz'); return [events_choices_rolls, INSERT_EVENT, insertEventIntoQueryData, rollResult, rollChoice, rollCharacter, campaign]; });
    state.damageObserver = rollObserver;
    const nestedGMObserver = state.nestedGMObserver = observer(function nativeGM({ lastEventId }) { return ['ENCOUNTER_GM_RESPONSE', 'GM_RESPONSE', lastEventId]; });
    const choiceOwner = state.choiceOwner = component(function t5() {}, { rollChoice: choice, campaignId: campaign.id, usersCharacter: character }, dmHost); choiceOwner.memoizedState = { memoizedState: rollObserver, next: { memoizedState: nestedGMObserver } };
    const prompt = appendElement(dmRow, 'div'); prompt.id = 'native-damage-prompt';
    const promptHost = nodeFiber(prompt, {}, choiceOwner); link(choiceOwner, [promptHost]);
    const button = appendElement(prompt, 'button', '', 'Roll Damage'); button.type = 'button';
    const callback = function nativeQuickRoll(event) {
      event.stopPropagation(); const dice_expression = choice.dice_expression; state.calls++;
      if (state.mode === 'callback-error') throw Error('native callback failure');
      const rollResult = { rollType: 'Damage', totalRoll: 12, baseRoll: 9, baseRollsArray: [9], dice: [10], modifierStat: 'strength', modifierValue: 0, proficiencyBonus: 0, vantage: 'normal' };
      state.damagePending = true;
      rollObserver.publish({ status: 'pending', submittedAt: Date.now(), variables: { rollResult, rollChoice: choice, rollCharacter: character, campaign, shouldTriggerFranz: true }, data: null });
      const damageEvent = { id: attackId + 3, role: 'player', request_id: `damage-${attackId}`, campaign_id: campaign.id, character_id: character.id, character, created_at: new Date().toISOString(), command_used: 'roll', events_roll: { event_id: attackId + 3, campaign_id: campaign.id, roll_type: 'Damage', total_roll: 12, base_roll: 9, base_rolls_array: [9], dice: [10], modifier_stat: 'strength', modifier_value: 0, proficiency_bonus: 0, vantage: 'normal' } };
      Object.assign(choice, { accepted: true, roll_result_id: damageEvent.id });
      state.damage = mountRoll(damageEvent, true); state.lastEvent = damageEvent;
      if (state.holdProjection) { events.splice(events.indexOf(damageEvent), 1); choice.accepted = null; delete choice.roll_result_id; }
      state.render(); return dice_expression && undefined;
    };
    button.onclick = callback; link(promptHost, [nodeFiber(button, { disabled: false, onClick: callback }, promptHost)]);
    link(dmHost, [cardOwner, choiceOwner]);
    if (state.mode === 'no-damage') { prompt.remove(); link(dmHost, [cardOwner]); }
    state.gmPending = true; state.render();
    gmObserver.publish({ status: 'pending', submittedAt: Date.now(), variables: { requestId: request, lastEventId: attackId, isMultiplayer: true } });
  });
  state.releaseProjection = () => { Object.assign(state.choice, { accepted: true, roll_result_id: state.damage.event.id }); events.push(state.damage.event); state.render(); };
  state.restoreLatePrompt = () => { const dmHost = state.choiceOwner.return; const row = dmHost.stateNode; row.append(state.choiceOwner.child.stateNode); link(dmHost, [dmHost.child, state.choiceOwner]); state.publishLateChoice(); };
  state.snapshot = () => {
    const right = $('#right'), rect = right.getBoundingClientRect();
    const visible = [...right.children].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
    const image = right.querySelector('img');
    const appearance = visible[0] && getComputedStyle(visible[0]);
    const shape = appearance ? { radius: appearance.borderRadius, border: appearance.borderTopWidth, borderColor: appearance.borderTopColor, background: appearance.backgroundColor } : null;
    return { finalCalls: state.finalCalls, finalStatus: state.activeFinalObserver?.getCurrentResult().status, shape, label: visible.map(node => node.textContent.trim()).join(' | '), image: image?.getAttribute('src') || '', width: rect.width, height: rect.height, right: rect.right, top: rect.top, viewport: innerWidth, nativeEnd: !!$('#native-end'), disabled: $('#native-end')?.disabled ?? null, badgeVisible: !!$('#native-your-turn')?.getClientRects().length && getComputedStyle($('#native-your-turn')).visibility !== 'hidden', continueVisible: !!$('#native-continue-wrapper')?.getClientRects().length && getComputedStyle($('#native-continue-wrapper')).visibility !== 'hidden', endCalls: state.endCalls.length, continueCalls: state.continueCalls, calls: state.calls, submits: state.submits, sameForm: $('form') === form, sameDraft: $('input') === draft, draft: draft.value, gmSubscriptions: gmObserver.count(), damageSubscriptions: state.damageObserver?.count() || 0 };
  };
  state.render();
}
const css = `*{box-sizing:border-box}body{margin:0;background:#18202c;color:white;font:14px Arial}button{color:inherit;font:inherit;background:none;border:0}#surface{width:min(760px,100%);margin:auto}#footer{display:flex;justify-content:space-between;gap:8px;padding:0 12px 8px}#right{display:flex;align-items:center;justify-content:flex-end;gap:8px}#left{flex:1}#composer{padding:8px}main{padding:8px}.flex{display:flex}.items-center{align-items:center}.gap-1{gap:4px}.gap-2{gap:8px}.rounded-full{border-radius:9999px}.border{border:1px solid #374151}.h-12{height:48px}.h-10{height:40px}.h-8{height:32px}.w-8{width:32px}.mt-2{margin-top:8px}.pl-1{padding-left:4px}.pr-4{padding-right:16px}.px-3{padding-left:12px;padding-right:12px}.py-2{padding-top:8px;padding-bottom:8px}.bg-gray-800\\/70{background:#1f2937}.bg-blue-600\\/20{background:#163962}.chevrons{font-size:10px}.animate-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}button:disabled{opacity:.5}#submit{padding:8px;border:1px solid #999}#native-continue{white-space:nowrap}`;
const html = `<!doctype html><meta charset="utf-8"><style>${css}</style><div id="surface"><div id="footer"><div id="left"></div><div id="right"></div></div><section id="composer" data-ff-combat-docked data-ff-combat-panel-mode="actions"><form><input value="preserved native draft"><button id="submit" type="submit">Attack</button></form></section><main></main></div><script>(${nativePage.toString()})()</script>`;
let window;
const watchdog = setTimeout(() => { console.error('Automatic turn control fixture timeout'); window?.destroy(); app.exit(1); }, 40000);
app.on('window-all-closed', () => {});
(async () => {
  await app.whenReady();
  const site = session.fromPartition(`automatic-turn-${process.pid}`);
  site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  window = new BrowserWindow({ show: false, width: 1000, height: 850, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const js = code => window.webContents.executeJavaScript(code);
  const until = async expression => { for (let count = 0; count < 70; count++) { if (await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw Error(`Timed out: ${expression}; ${JSON.stringify(await js('fixture.snapshot()'))}`); };
  const paint = () => js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))');
  const configure = (enabled = true, locale = 'en') => js(`(${configureCombatFlow.toString()})(${enabled},${JSON.stringify(locale)})`);
  const click = async selector => {
    assert.ok(window.isVisible() && window.isFocused() && window.webContents.isFocused());
    await until('document.visibilityState==="visible"&&document.hasFocus()'); await paint();
    const point = await js(`(()=>{const node=document.querySelector(${JSON.stringify(selector)}),rect=node.getBoundingClientRect();return {x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2),hit:node.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))}})()`);
    assert.equal(point.hit, true, `Native hit target: ${selector}`);
    window.webContents.sendInputEvent({ type: 'mouseDown', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    window.webContents.sendInputEvent({ type: 'mouseUp', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  };
  const reset = async (auto = true) => {
    await window.loadURL('https://play.fables.gg/campaign-a/play'); window.show(); window.focus(); window.webContents.focus();
    await until('document.visibilityState==="visible"&&document.hasFocus()'); await configure();
    await js(`window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:${auto},hideIntermediateFranz:false,hideDamagePrompt:false});void 0`); await paint();
  };
  const sample = async phase => { await paint(); const value = await js('fixture.snapshot()'); console.log('TURN_CONTROL_PHASE', JSON.stringify({ phase, ...value })); return value; };
  const stable = (actual, reference, phase) => {
    assert.equal(actual.label, reference.label, `${phase}: stable rendered End Turn label`);
    assert.equal(actual.image, reference.image, `${phase}: native current avatar`);
    assert.deepEqual(actual.shape, reference.shape, `${phase}: native radius/border/background`);
    for (const field of ['width', 'height', 'right', 'top']) assert.ok(Math.abs(actual[field] - reference[field]) < 1, `${phase}: stable ${field}: ${actual[field]} vs ${reference[field]}`);
    assert.equal(actual.badgeVisible, false, `${phase}: transient badge concealed`); assert.equal(actual.continueVisible, false, `${phase}: transient Continue concealed`);
    assert.equal(actual.endCalls, 0); assert.equal(actual.continueCalls, 0); assert.equal(actual.sameForm, true); assert.equal(actual.sameDraft, true); assert.equal(actual.draft, 'preserved native draft');
  };
  const begin = async mode => { await js(`fixture.mode=${JSON.stringify(mode)};void 0`); await click('#submit'); await until('fixture.submits===1&&fixture.gmObserver.getCurrentResult().status==="pending"'); };
  const phases = async () => {
    for (const width of [1000, 420]) {
      window.setContentSize(width, 850); await reset(); const initial = await sample(`idle-${width}`);
      assert.ok(initial.right <= width - 11 && initial.width < width - 24, 'Native initial slot fits responsive viewport');
      assert.equal(initial.shape.radius, '9999px'); assert.equal(initial.shape.border, '1px');
      await begin('hit'); const attack = await sample(`attack-${width}`);
      // Keep diagnostic native raw behavior even on baseline RED.
      assert.equal(attack.nativeEnd, false, 'Native branch really has no button during Attack');
      stable(attack, initial, `attack-${width}`);
      await js('fixture.setSpin("attack",false);fixture.finishGM();void 0'); await until('fixture.calls===1');
      stable(await sample(`damage-pending-${width}`), initial, `damage-pending-${width}`);
      await js('fixture.finishDamage();void 0');
      stable(await sample(`damage-operation-success-still-spinning-${width}`), initial, `damage-operation-success-still-spinning-${width}`);
      await js('fixture.setSpin("damage",false);window.__friendsFablesDesktopCombatFlow.update("en");void 0'); await until('fixture.finalCalls.length===1');
      const completed = await sample(`final-pending-${width}`); stable({ ...completed, continueCalls: 0 }, initial, `final-pending-${width}`);
      assert.equal(completed.continueCalls, 1); assert.equal(completed.calls, 1);
      await js('fixture.finishFinalGM();void 0');
      stable({ ...await sample(`final-success-${width}`), continueCalls: 0 }, initial, `final-success-${width}`);
      await js('fixture.publishFinalResponse();void 0'); await until('fixture.snapshot().nativeEnd');
      await configure(false);
    }
  };
  const completion = async mode => {
    await reset(); const initial = await sample(`${mode}-idle`); await begin(mode);
    stable(await sample(`${mode}-pending`), initial, `${mode}-pending`);
    await js('fixture.finishGM();void 0'); stable(await sample(`${mode}-success-spin`), initial, `${mode}-success-spin`);
    await js('fixture.setSpin("attack",false);void 0');
    await until('fixture.snapshot().nativeEnd||fixture.snapshot().continueVisible');
    assert.equal(await js('fixture.calls'), 0, `${mode}: no Damage call`);
    if (mode === 'no-damage') {
      assert.equal(await js('document.getElementById("event-message-card-"+(fixture.sequence+1)).getClientRects().length>0'), true, '937 no-Damage answer remains visible');
      await js('fixture.restoreLatePrompt();void 0'); await until('fixture.calls===1');
      await js('fixture.setSpin("attack",false);fixture.finishDamage();fixture.setSpin("damage",false);void 0');
      await until('fixture.finalCalls.length===1'); assert.equal(await js('fixture.calls'), 1, 'Late choice accepted only once');
    }
  };
  const nativeSafety = async () => {
    await reset(); await js('window.proof={button:fixture.nativeEnd,callback:fixture.nativeEndCallback,form:fixture.form,draft:fixture.draft};fixture.endPending=true;fixture.render();void 0'); await paint();
    assert.equal(await js('fixture.nativeEnd===proof.button&&fixture.nativeEnd.onclick===proof.callback&&fixture.nativeEnd.disabled'), true, 'Native busy node/callback/disabled retained');
    await click('#native-end'); assert.equal(await js('fixture.endCalls.length'), 0);
    await js('fixture.endPending=false;fixture.render();void 0'); await click('#native-end'); await until('fixture.endCalls.length===1');
    assert.deepEqual(await js('fixture.endCalls[0]'), { entityId: 301, currentTurnEntityId: 301 });
    await reset(); await begin('hit'); await paint();
    // Click the inert presentation wherever it lies. It must never forward to
    // an absent native button; keyboard activation on the slot is also inert.
    await click('#right'); await js('document.activeElement?.blur();void 0'); window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' }); await paint();
    assert.equal(await js('fixture.endCalls.length'), 0); assert.equal(await js('fixture.continueCalls'), 0); assert.equal(await js('fixture.calls'), 0);
    for (const action of ['off', 'dispose', 'error', 'turn', 'encounter', 'owner', 'route']) {
      await reset(); await begin('hit');
      const actions = { off: 'window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:"campaign-a",automaticDamage:false,hideIntermediateFranz:false,hideDamagePrompt:false})', error: 'fixture.finishGM(true)', turn: 'fixture.encounter.currentTurnEntity.characterId=999;fixture.render()', encounter: 'fixture.campaign.active_encounter_id=999;fixture.render()', owner: 'fixture.footerCommitted=false;fixture.render()', route: 'history.pushState({},"","/campaign-b/play");window.dispatchEvent(new PopStateEvent("popstate"))' };
      if (action === 'dispose') await configure(false); else await js(`${actions[action]};void 0`);
      await paint(); await js('new Promise(resolve=>setTimeout(resolve,550))');
      const restored = await sample(`cleanup-${action}`);
      assert.equal(restored.endCalls, 0); assert.equal(restored.calls, 0); assert.equal(restored.continueCalls, 0);
      assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'), 0, `${action}: passive presentation removed`);
      if (!['turn', 'encounter', 'owner', 'route'].includes(action)) assert.equal(restored.badgeVisible, true, `${action}: native badge restored`);
    }
  };
  const negatives = async () => {
    for (const mode of ['manual', 'unsupported', 'uncommitted', 'npc', 'death', 'remote']) {
      await reset(mode !== 'manual');
      if (mode === 'unsupported') await js('fixture.mode="unsupported";void 0');
      if (mode === 'uncommitted') await js('fixture.footerCommitted=false;fixture.render();void 0');
      if (mode === 'npc') await js('fixture.encounter.currentTurnEntity.is_npc=true;fixture.render();void 0');
      if (mode === 'death') await js('fixture.encounter.currentTurnEntity.hp=0;fixture.render();void 0');
      if (mode === 'remote') await js('fixture.encounter.currentTurnEntity.characterId=999;fixture.render();void 0');
      if (mode === 'unsupported') await click('#submit'); else if (['manual', 'uncommitted'].includes(mode)) await begin('hit');
      await paint(); assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'), 0, `${mode}: no passive shell`);
      assert.equal(await js('fixture.endCalls.length'), 0); assert.equal(await js('fixture.continueCalls'), 0);
      if (mode === 'manual' || mode === 'unsupported') assert.equal(await js('fixture.snapshot().badgeVisible'), true);
    }
  };
  const wholeAttack = async (automatic = false, projection = false) => {
    await reset(); const initial = await sample(`whole-${automatic ? 'automatic' : 'manual'}-idle`);
    if (automatic) await js(`fixture.manual=false;fixture.holdProjection=${projection};fixture.render();void 0`);
    await js('window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:"campaign-a",automaticDamage:true,hideIntermediateFranz:true,hideDamagePrompt:true});void 0');
    await begin('hit'); await js('fixture.setSpin("attack",false);fixture.finishGM();void 0'); await until('fixture.calls===1');
    await js('fixture.finishDamage();void 0');
    assert.equal(await js('fixture.continueCalls'), 0, 'No continuation before positively settled Damage');
    if (automatic) {
      await until('fixture.finalCalls.length===1');
      if (projection) {
        const held = await sample('nested-GM-before-accepted-result-projection');
        stable(held, initial, 'Waiting for exact committed result projection');
        assert.equal(await js('fixture.choice.accepted===null&&!fixture.events.includes(fixture.damage.event)'), true);
        await js('fixture.releaseProjection();void 0');
      }
      assert.deepEqual(await js('fixture.finalCalls[0]'), { kind: 'automatic', isRewrite: false, lastEventId: 113, requestId: 'damage-110', isPlayerEncounterTurn: true, isMultiplayer: true });
      // Auto→Manual while already-awaited native GM is pending: never duplicate.
      await js('fixture.manual=true;fixture.render();fixture.finishFinalGM();fixture.setSpin("damage",false);void 0');
    } else {
      await js('fixture.setSpin("damage",false);void 0');
      await until('fixture.finalCalls.length===1');
      assert.equal(await js('fixture.finalCalls[0].requestId===undefined'), true, 'Native uK leaves requestId undefined');
      assert.deepEqual(await js('JSON.parse(JSON.stringify(fixture.finalCalls[0]))'), { kind: 'continue', isRewrite: false, lastEventId: 111, isPlayerEncounterTurn: true, isMultiplayer: true });
      const pending = await sample('whole-manual-final-pending');
      stable({ ...pending, continueCalls: 0 }, initial, 'whole-manual-final-pending');
      assert.equal(pending.continueCalls, 1, 'Exact native Continue callback once');
      await js('fixture.finishFinalGM();void 0');
    }
    // Hold success separately from native event/footer publication. This gap is
    // visible in22October clips; no invented delay or claim that GM is missing.
    // Explicit public update queues evaluation even when native class updates
    // are outside the adapter MutationObserver filter; no elapsed-time gate.
    await js('window.__friendsFablesDesktopCombatFlow.update("en");void 0');
    const gap = await sample(`whole-${automatic ? 'automatic' : 'manual'}-success-before-native-End`);
    assert.equal(gap.nativeEnd, false, 'Final native eligibility really remains unpublished');
    stable({ ...gap, continueCalls: 0 }, initial, 'Final success publication gap');
    assert.equal(gap.finalCalls.length, 1, 'No duplicate final GM in publication gap');
    assert.equal(gap.continueCalls, automatic ? 0 : 1);
    for (let frame = 0; frame < 3; frame++) {
      const held = await sample(`whole-held-frame-${frame}`);
      assert.equal(held.continueVisible, false, 'No Continue flash in held native publication frames');
      assert.equal(held.finalCalls.length, 1);
    }
    await js('fixture.publishFinalResponse();void 0'); await until('fixture.snapshot().nativeEnd');
    const finished = await sample('whole-native-End-ready');
    assert.equal(finished.finalCalls.length, 1); assert.equal(finished.continueVisible, false);
    assert.equal(finished.calls, 1); assert.equal(finished.endCalls, 0);
    assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'), 0, 'Owned shell retires at native End readiness');
    assert.equal(await js('document.getElementById("event-container-114").getClientRects().length>0'), true, 'Final Franz remains visible');
  };
  const completionSafety = async () => {
    const prepare = async setup => {
      await reset(); if (setup) await js(setup+';void 0'); await begin('hit');
      await js('fixture.setSpin("attack",false);fixture.finishGM();void 0'); await until('fixture.calls===1');
      await js('fixture.finishDamage();void 0'); await paint();
      assert.equal(await js('fixture.finalCalls.length'), 0, 'Boundary starts with spinning Damage/no final GM');
    };
    const cancelCases = {
      'same-character-new-turn': 'fixture.encounter.currentTurnEntity={...fixture.encounter.currentTurnEntity,entityId:302,name:"New turn",image:"different"};fixture.render()',
      'missing-card': 'fixture.damage.card.remove()',
      'duplicate-card': 'fixture.damage.card.after(fixture.damage.card.cloneNode(true))',
      'unknown-die-state': 'fixture.damage.dice[0].setAttribute("class","transition-all");fixture.damage.dice[0].__reactFiber$fixture.memoizedProps={className:"transition-all"}',
      'uncommitted-die': 'delete fixture.damage.dice[0].__reactFiber$fixture',
      'competing-tail': 'fixture.events.push({id:999,role:"player",campaign_id:fixture.campaign.id});fixture.render()',
      'native-hidden-attribute': 'document.getElementById("native-continue-wrapper").hidden=true',
      'native-hidden-css-after-owned-concealment': 'const style=document.createElement("style");style.textContent=".native-hidden-proof{display:none!important}";document.head.append(style);document.getElementById("native-continue-wrapper").classList.add("native-hidden-proof")',
      'native-disabled': 'const button=document.getElementById("native-continue");button.disabled=true;button.__reactFiber$fixture.memoizedProps.disabled=true',
      'off': 'window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:"campaign-a",automaticDamage:false,hideIntermediateFranz:false,hideDamagePrompt:false})',
      'route': 'history.pushState({},"","/campaign-b/play");window.dispatchEvent(new PopStateEvent("popstate"))',
      'encounter': 'fixture.campaign.active_encounter_id=999;fixture.render()'
    };
    for (const [name, action] of Object.entries(cancelCases)) {
      await prepare(); await js(`fixture.setSpin("damage",false);${action};window.__friendsFablesDesktopCombatFlow.update("en");void 0`);
      const actual = await sample(`final-boundary-${name}`);
      assert.equal(actual.finalCalls.length, 0, name+': no automatic continuation');
      assert.equal(actual.continueCalls, 0); assert.equal(actual.endCalls, 0);
      assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'), 0, name+': release owned shell');
    }
    await prepare('fixture.continueGMObserver.subscribe=()=>{throw Error("native observer unavailable")}');
    await js('fixture.setSpin("damage",false);window.__friendsFablesDesktopCombatFlow.update("en");void 0');
    const unsubscribed = await sample('continue-observer-subscribe-failure');
    assert.equal(unsubscribed.finalCalls.length, 0); assert.equal(unsubscribed.continueCalls, 0); assert.equal(unsubscribed.continueVisible, true);
    for (const reinject of [false, true]) {
      await prepare(); await configure(false); if (reinject) await configure(true);
      await js('fixture.setSpin("damage",false);void 0'); await paint();
      assert.equal(await js('fixture.finalCalls.length'), 0, reinject?'Reinjection cannot replay retired outcome':'Disposed callback cannot continue');
    }
    // Actual native Ctrl+Enter after subscription is adopted, including success
    // before native footer publication; Desktop never generates a second GM.
    await prepare();
    window.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter',modifiers:['control']}); window.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter',modifiers:['control']});
    await until('fixture.finalCalls.length===1');
    await js('fixture.finishFinalGM();fixture.setSpin("damage",false);window.__friendsFablesDesktopCombatFlow.update("en");void 0');
    let actual = await sample('native-shortcut-success-adopted');
    assert.equal(actual.finalCalls.length, 1); assert.equal(actual.continueCalls, 1); assert.equal(actual.continueVisible, false);
    // Synchronous native request+success before the first eligible wrapper sync:
    // uK's own once-ref removes its button but committed hooks remain available.
    await reset(); await begin('hit'); await js('fixture.setSpin("attack",false);fixture.finishGM();void 0'); await until('fixture.calls===1');
    await js('fixture.finishDamage();fixture.continueNow();fixture.finishFinalGM();fixture.setSpin("damage",false);window.__friendsFablesDesktopCombatFlow.update("en");void 0');
    actual = await sample('native-success-before-first-uK-watch');
    assert.equal(actual.finalCalls.length, 1); assert.equal(actual.continueCalls, 1); assert.equal(actual.continueVisible, false);
    assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'), 1, 'Adopt exact fresh success without host button');
    for (const failure of ['error', 'throw']) {
      await prepare(failure==='throw'?'fixture.finalThrow=true':null);
      await js('fixture.setSpin("damage",false);window.__friendsFablesDesktopCombatFlow.update("en");void 0');
      await until('fixture.continueCalls===1');
      if (failure==='error') await js('fixture.finishFinalGM(true);void 0');
      await paint(); await js('fixture.render();window.__friendsFablesDesktopCombatFlow.update("en");void 0'); await paint();
      assert.equal(await js('fixture.continueCalls'), 1, 'Failed/unknown final never retries');
      assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'), 0, 'Failed final releases owned presentation');
    }
  };
  const scenario = process.env.FABLES_TURN_CONTROL_SCENARIO || 'all';
  if (['all', 'whole-safety'].includes(scenario)) await completionSafety();
  if (['all', 'whole-projection'].includes(scenario)) await wholeAttack(true, true);
  if (['all', 'whole-manual'].includes(scenario)) await wholeAttack(false);
  if (['all', 'whole-automatic-gap'].includes(scenario)) await wholeAttack(true);
  if (['all', 'phases'].includes(scenario)) await phases();
  if (['all', 'completion'].includes(scenario)) { await completion('miss'); await completion('no-damage'); }
  if (['all', 'safety'].includes(scenario)) await nativeSafety();
  if (['all', 'negatives'].includes(scenario)) await negatives();
  assert.ok(['all', 'whole-safety', 'whole-projection', 'whole-manual', 'whole-automatic-gap', 'phases', 'completion', 'safety', 'negatives'].includes(scenario), 'Known fixture scenario');
  console.log(`Automatic turn control ${scenario} passed`); clearTimeout(watchdog); window.destroy(); app.exit(0);
})().catch(error => { console.error(error); clearTimeout(watchdog); window?.destroy(); app.exit(1); });
