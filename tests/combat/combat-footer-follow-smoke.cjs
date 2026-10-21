// Native scheduling belongs to the coordinator. This fixture uses its private
// CPU-only profile; it never connects to the game or imports another test entry.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Use the private-profile fixture runner.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const { configureCombatFlow } = require(path.join(appRoot, 'dist/combat/combat-flow'));
const { configureChatAppearance } = require(path.join(appRoot, 'dist/appearance/chat-appearance'));
const { DEFAULT_APPEARANCE } = require(path.join(appRoot, 'dist/appearance/themes'));

// Captured contracts: public07rvyszl7fdx0, SHA77e91750…b86eb,
// uQ695686/uZ698356/uD685553/uO686007/uG699907/uK700532/nS336078.
// This is a committed-Fiber DOM model, not a claim to execute production React.
// It deliberately preserves native branch ABSENCE, source classes, exclusive
// flags, callback identity and independent mutation/publication/spin phases.
// Same retained chunk: uY703750/704016 is a column: et(uJ), then in-flow uQ.
// et42229 is only an audio Context Provider. uJ708330/708717 is flex:1 overflow
// feed + #events-list. uQ697360 is grid > middle(uZ, composer, desktop30px hints).
// Therefore the footer can resize this feed without any event content change.
function nativePage() {
  const $ = selector => document.querySelector(selector);
  const character = { id: 83026155, name: 'Fixture Hero', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="gold"/%3E%3C/svg%3E' };
  const campaign = { id: 'campaign-a', active_encounter_id: 412456 };
  const encounter = { id: 412456, currentTurnEntity: { entityId: 301, characterId: character.id, name: character.name, image: character.image, is_npc: false, type: 'player', hp: 20, conditions: [] } };
  const root = { tag: 3, stateNode: {} }; root.stateNode.current = root;
  const state = window.fixture = { campaign, character, encounter, root, sequence: 100, mode: 'hit', profile: 'profile-a', manual: true, endPending: false, gmPending: false, damagePending: false, calls: 0, endCalls: [], continueCalls: 0, submits: 0, lastEvent: { role: 'dm', command_used: 'encounter_player_turn_action_response', profile_id: 'profile-a' }, latestDm: null, footerEnabled: true, footerCommitted: true, otherSpinner: false };
  const rootChildren = [];
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
    const outer = appendElement($('#events-list'), 'div'); outer.id = `event-${event.id}`;
    const row = appendElement(outer, 'div'); row.id = 'event-container-undefined';
    const eventOwner = component(function NativeEvent() {}, { event, campaign }, root);
    const host = nodeFiber(row, {}, eventOwner); link(eventOwner, [host]);
    const roll = nS({ event, spinning, advantage: state.advantage }, host, row); link(host, [roll.fiber]);
    roll.fiberRoot = eventOwner; roll.outer = outer; state.rolls.push(roll); rootChildren.push(eventOwner); return roll;
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
  const nativeContinue = () => { if (!state.gmPending && !state.damagePending && !state.continueBusy) state.continueCalls++; };
  window.addEventListener('keydown', event => { if (state.continueMounted && event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !state.gmPending && !state.damagePending) { event.preventDefault(); nativeContinue(); } });
  function uK(props, parent, container) {
    const value = component(uK, props, parent); state.continueMounted = true;
    if (props.isPending) return value;
    const wrapper = appendElement(container, 'div', 'continue-button-wrapper'); wrapper.id = 'native-continue-wrapper';
    const button = appendElement(wrapper, 'button', 'flex items-center gap-1 rounded-full border border-gray-700/50 bg-gray-800/70 transition-colors pl-1 pr-1 md:pr-4 py-1 h-12', 'Continue'); button.type = 'button'; button.id = 'native-continue'; button.disabled = props.isPending || !props.hasAccess || props.isGmResponding; button.onclick = nativeContinue;
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
    link(root, [owner, ...rootChildren, ...(state.footerCommitted ? [footer] : [])]);
  };
  state.finishGM = (error = false) => {
    state.gmPending = false;
    // Nonautomatic/manual Continue remains a player-roll lastEvent. Own DM
    // streaming presence must not be mistaken for native footer eligibility.
    if (state.mode === 'no-damage') state.lastEvent = state.latestDm;
    gmObserver.publish({ ...gmObserver.getCurrentResult(), status: error ? 'error' : 'success' }); state.render();
  };
  state.finishDamage = (error = false) => { state.damagePending = false; const watch = state.damageObserver; watch.publish({ ...watch.getCurrentResult(), status: error ? 'error' : 'success' }); state.render(); };
  state.publishLateChoice = () => { state.latestDm.rollChoices = [state.choice]; state.choice.accepted = null; state.choiceOwner.memoizedProps.rollChoice = state.choice; state.render(); document.body.append(document.createElement('i')); };
  form.addEventListener('submit', event => {
    event.preventDefault(); state.submits++; state.sequence += 10;
    rootChildren.length = 0; $('#events-list').replaceChildren(); historyRows(); state.rolls = []; state.damage = undefined; state.callsAtSubmit = state.calls;
    const attackId = state.sequence, request = `local-request-${attackId}`;
    const attack = { id: attackId, role: 'player', profile_id: state.profile, request_id: request, campaign_id: campaign.id, character_id: character.id, character, created_at: new Date().toISOString(), command_used: 'roll_attack', events_roll: { roll_type: 'Spell Attack', dc: 10, total_roll: state.mode === 'miss' ? 9 : 24, modifier_value: 8, proficiency_bonus: 8 } };
    state.attack = mountRoll(attack, true); state.lastEvent = attack;
    const dmId = attackId + 1;
    const choice = state.choice = { id: attackId + 2, event_id: dmId, character_id: character.id, type: 'Damage', accepted: null, dice_expression: '1d10', fixed_bonus: 3 };
    const dm = state.latestDm = { id: dmId, role: 'dm', request_id: request, campaign_id: campaign.id, profile_id: state.profile, command_used: 'encounter_player_turn_action_response', processed: false, rollChoices: ['miss', 'no-damage'].includes(state.mode) ? [] : [choice] };
    const dmRow = appendElement($('#events-list'), 'div'); dmRow.id = `event-container-${dmId}`;
    const dmOwner = component(function NativeEvent() {}, { event: dm, campaign }, root);
    const dmHost = nodeFiber(dmRow, {}, dmOwner); link(dmOwner, [dmHost]); rootChildren.push(dmOwner);
    const card = appendElement(dmRow, 'div', '', state.mode === 'no-damage' ? 'Final answer without Damage' : 'Intermediate Franz'); card.id = `event-message-card-${dmId}`;
    const cardOwner = component(function NativeNarrativeCard() { return 'event-message-card-'; }, { eventId: dmId }, dmHost); link(cardOwner, [nodeFiber(card, {}, cardOwner)]);
    const rollObserver = observer(async function ee({ rollResult, rollChoice, rollCharacter, campaign, shouldTriggerFranz }) { const events_choices_rolls = 'events_choices_rolls', INSERT_EVENT = 'INSERT_EVENT', insertEventIntoQueryData = 'insertEventIntoQueryData', continueMode_ = 'continueMode_'; if (shouldTriggerFranz && continueMode_ !== 'manual') await Promise.resolve('mutateAsync Franz'); return [events_choices_rolls, INSERT_EVENT, insertEventIntoQueryData, rollResult, rollChoice, rollCharacter, campaign]; });
    state.damageObserver = rollObserver;
    const choiceOwner = state.choiceOwner = component(function t5() {}, { rollChoice: choice, campaignId: campaign.id, usersCharacter: character }, dmHost); choiceOwner.memoizedState = { memoizedState: rollObserver };
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
      state.damage = mountRoll(damageEvent, true); state.lastEvent = damageEvent; state.render(); return dice_expression && undefined;
    };
    button.onclick = callback; link(promptHost, [nodeFiber(button, { disabled: false, onClick: callback }, promptHost)]);
    link(dmHost, [cardOwner, choiceOwner]);
    if (state.mode === 'no-damage') { prompt.remove(); link(dmHost, [cardOwner]); }
    state.gmPending = true; state.render();
    gmObserver.publish({ status: 'pending', submittedAt: Date.now(), variables: { requestId: request, lastEventId: attackId, isMultiplayer: true } });
  });
  state.restoreLatePrompt = () => { const dmHost = state.choiceOwner.return; const row = dmHost.stateNode; row.append(state.choiceOwner.child.stateNode); link(dmHost, [dmHost.child, state.choiceOwner]); state.publishLateChoice(); };
  state.snapshot = () => {
    const right = $('#right'), rect = right.getBoundingClientRect();
    const visible = [...right.children].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
    const image = right.querySelector('img');
    const appearance = visible[0] && getComputedStyle(visible[0]);
    const shape = appearance ? { radius: appearance.borderRadius, border: appearance.borderTopWidth, borderColor: appearance.borderTopColor, background: appearance.backgroundColor } : null;
    return { shape, label: visible.map(node => node.textContent.trim()).join(' | '), image: image?.getAttribute('src') || '', width: rect.width, height: rect.height, right: rect.right, top: rect.top, viewport: innerWidth, nativeEnd: !!$('#native-end'), disabled: $('#native-end')?.disabled ?? null, badgeVisible: !!$('#native-your-turn')?.getClientRects().length && getComputedStyle($('#native-your-turn')).visibility !== 'hidden', continueVisible: !!$('#native-continue-wrapper')?.getClientRects().length && getComputedStyle($('#native-continue-wrapper')).visibility !== 'hidden', endCalls: state.endCalls.length, continueCalls: state.continueCalls, calls: state.calls, submits: state.submits, sameForm: $('form') === form, sameDraft: $('input') === draft, draft: draft.value, gmSubscriptions: gmObserver.count(), damageSubscriptions: state.damageObserver?.count() || 0 };
  };
  function historyRows() {
    for (let id = 1; id <= 24; id++) {
      const row = appendElement($('#events-list'), 'div', 'history', `Native narration ${id}`); row.id = `event-${id}`;
      const card = appendElement(row, 'div'); card.id = `event-message-card-${id}`;
    }
  }
  historyRows();
  const feed = $('#feed'), originalScrollTo = feed.scrollTo;
  state.targets = [];
  feed.scrollTo = function(...args) {
    state.targets.push({ at: performance.now(), top: args[0]?.top ?? args[1], behavior: args[0]?.behavior ?? 'auto', height: this.clientHeight, scrollHeight: this.scrollHeight });
    return Reflect.apply(originalScrollTo, this, args);
  };
  // Combat-panel's trusted, owned-form bridge calls this public appearance API.
  // Keep the actual scroll adapter; no replacement smooth-scroll algorithm.
  form.addEventListener('submit', event => {
    if (event.isTrusted && event.target === form) window.__friendsFablesDesktopChatAppearance.followAfterSubmit();
  }, true);
  const nativeSnapshot = state.snapshot;
  state.snapshot = () => {
    const right = $('#right').getBoundingClientRect(), footer = $('#footer').getBoundingClientRect();
    return { ...nativeSnapshot(), at: performance.now(), feedHeight: feed.clientHeight, scrollHeight: feed.scrollHeight,
      listHeight: $('#events-list').getBoundingClientRect().height, scrollTop: feed.scrollTop, target: feed.scrollHeight - feed.clientHeight,
      footerHeight: footer.height, footerTop: footer.top, rightHeight: right.height,
      rollHeights: state.rolls.map(roll => roll.panel.getBoundingClientRect().height),
      sameDice: !state.damage || state.damage.dice.every(die => die.isConnected && die.__reactFiber$fixture.stateNode === die), targets: state.targets.slice(-16) };
  };
  state.render();
}
const css = `*{box-sizing:border-box}body{margin:0;background:#18202c;color:white;font:14px Arial}button{color:inherit;font:inherit;background:none;border:0}#surface{width:min(950px,100%);margin:auto}#footer{display:flex;justify-content:space-between;gap:8px;padding:0 12px 8px}#right{display:flex;align-items:center;justify-content:flex-end;gap:8px}#left{flex:1}#composer{padding:8px}main{padding:8px}.flex{display:flex}.items-center{align-items:center}.gap-1{gap:4px}.gap-2{gap:8px}.rounded-full{border-radius:9999px}.border{border:1px solid #374151}.h-12{height:48px}.h-10{height:40px}.h-8{height:32px}.w-8{width:32px}.mt-2{margin-top:8px}.pl-1{padding-left:4px}.pr-4{padding-right:16px}.px-3{padding-left:12px;padding-right:12px}.py-2{padding-top:8px;padding-bottom:8px}.bg-gray-800\\/70{background:#1f2937}.bg-blue-600\\/20{background:#163962}.chevrons{font-size:10px}.animate-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}button:disabled{opacity:.5}#submit{padding:8px;border:1px solid #999}#native-continue{white-space:nowrap}`;
const layout = `html,body{height:100%;overflow:hidden}#surface{height:100%;display:flex;flex-direction:column}#feed{flex:1;min-height:0;overflow:auto;padding:16px}#events-list>.history{height:90px}#native-stack{flex:none;display:grid;position:relative;grid-template-columns:40px minmax(0,1fr) 30px}#native-middle{min-width:0;position:relative;margin-left:16px}#composer{height:52px}#footer{min-width:0}#right{min-width:0}#right img{flex:none}#left{min-width:0}#hints{height:30px}@media(max-width:767px){#native-stack{grid-template-columns:minmax(0,1fr)}#native-middle{margin-left:0}#hints{display:none}}`;
const html = `<!doctype html><meta charset="utf-8"><style>${css}${layout}</style><div id="surface" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><div id="native-stack"><div></div><div id="native-middle"><div id="footer"><div id="left"></div><div id="right"></div></div><section id="composer" data-ff-combat-docked data-ff-combat-panel-mode="actions"><form><input value="preserved native draft"><button id="submit" type="submit">Attack</button></form></section><div id="hints"></div></div><div></div></div></div><script>(${nativePage.toString()})()</script>`;
let window;
const watchdog = setTimeout(() => { console.error('Combat footer follow fixture timeout'); window?.destroy(); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
(async () => {
  await app.whenReady();
  const site = session.fromPartition(`footer-follow-${process.pid}`);
  site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  window = new BrowserWindow({ show: false, width: 1000, height: 850, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const js = code => window.webContents.executeJavaScript(code);
  const paint = () => js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))');
  const until = async expression => { for (let count = 0; count < 80; count++) { if (await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw Error(`Timed out: ${expression}; ${JSON.stringify(await js('fixture.snapshot()'))}`); };
  const sample = async phase => { await paint(); const value = await js('fixture.snapshot()'); console.log('FOOTER_FOLLOW_PHASE', JSON.stringify({ phase, ...value })); return value; };
  const configure = enabled => js(`(${configureCombatFlow.toString()})(${enabled},'en')`);
  const reset = async width => {
    window.setContentSize(width, 850); await window.loadURL('https://play.fables.gg/campaign-a/play'); window.show(); window.focus(); window.webContents.focus();
    await until('document.visibilityState==="visible"&&document.hasFocus()&&innerWidth==='+width);
    await js(`(${configureChatAppearance.toString()})(${JSON.stringify(DEFAULT_APPEARANCE)})`); await configure(true);
    await js(`window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:true,hideIntermediateFranz:false,hideDamagePrompt:false});void 0`); await paint();
  };
  const click = async selector => {
    assert.ok(window.isVisible() && window.isFocused() && window.webContents.isFocused());
    const point = await js(`(()=>{const node=document.querySelector(${JSON.stringify(selector)}),r=node.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return {x,y,hit:node.contains(document.elementFromPoint(x,y))}})()`);
    assert.ok(point.hit, 'Native hit target '+selector);
    for (const type of ['mouseDown','mouseUp']) window.webContents.sendInputEvent({ type, x:point.x, y:point.y, button:'left', clickCount:1 });
  };
  const preserved = value => { assert.ok(value.sameForm && value.sameDraft && value.sameDice); assert.equal(value.draft,'preserved native draft'); assert.equal(value.calls,1); assert.equal(value.endCalls,0); };
  for (const width of [1000,420]) {
    await reset(width); const initial = await sample('idle-'+width);
    await click('#submit'); await until('fixture.submits===1&&fixture.gmPending');
    const attack = await sample('attack-'+width); assert.equal(attack.nativeEnd,false); assert.equal(attack.feedHeight,initial.feedHeight);
    await js('fixture.setSpin("attack",false);fixture.finishGM();void 0'); await until('fixture.calls===1');
    const damage = await sample('damage-append-'+width); assert.ok(damage.listHeight>attack.listHeight,'Damage content grows');
    await js('fixture.damageProof=fixture.damage;fixture.finishDamage();void 0');
    const spinning = await sample('operation-success-spin-'+width); preserved(spinning); assert.equal(spinning.continueVisible,false);
    // Bounded painted frames retain the complete release/resize/retarget ordering.
    const frames = await js(`new Promise(resolve=>{const frames=[];fixture.setSpin('damage',false);document.body.append(document.createElement('i'));let count=0;const frame=()=>{frames.push(fixture.snapshot());if(++count===18)resolve(frames);else requestAnimationFrame(frame)};requestAnimationFrame(frame)})`);
    console.log('FOOTER_FOLLOW_HANDOFF',JSON.stringify({width,frames}));
    await until('fixture.snapshot().continueVisible'); const manual = await sample('manual-'+width); preserved(manual);
    assert.equal(manual.badgeVisible,true); assert.equal(await js('fixture.damage===fixture.damageProof'),true,'Same native result owner');
    assert.equal(manual.listHeight,spinning.listHeight,'Footer-only handoff leaves list height unchanged');
    assert.deepEqual(manual.rollHeights,spinning.rollHeights,'Footer-only handoff leaves rolls unchanged');
    assert.equal(manual.footerHeight,spinning.footerHeight,'Settled Manual handoff retains validated native footer footprint');
    assert.equal(manual.feedHeight,spinning.feedHeight,'Footer-only handoff retains feed viewport');
    assert.equal(manual.target,spinning.target,'Footer-only handoff retains smooth tail target');
    assert.ok(manual.targets.some(call=>call.behavior==='smooth'),'Real browser smooth follow dispatched');
    // Growth still follows; this deliberately permits a new legitimate target.
    await js('const row=document.createElement("div");row.id="event-999";row.style.height="120px";row.textContent="Later native narration";document.getElementById("events-list").append(row);void 0');
    await until('fixture.targets.some(call=>call.behavior==="smooth"&&call.top===fixture.snapshot().target)');
    const growth=await sample('later-growth-'+width); assert.ok(growth.target>manual.target);
    window.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter',modifiers:['control']}); window.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter',modifiers:['control']}); await until('fixture.continueCalls===1');
    await js('fixture.lastEvent={role:"dm",profile_id:fixture.profile,command_used:"encounter_player_turn_action_response"};fixture.render();void 0'); await until('fixture.snapshot().nativeEnd');
    const final=await sample('final-native-end-'+width); assert.equal(final.footerHeight,initial.footerHeight); assert.equal(final.endCalls,0);
    await configure(false);
  }
  // A real wheel gesture and an actual DOM selection each revoke pinned follow.
  for (const intent of ['wheel','selection']) {
    await reset(1000); await click('#submit'); await until('fixture.submits===1'); await paint();
    if (intent==='wheel') {
      const point=await js('(()=>{const r=document.getElementById("feed").getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()');
      window.webContents.sendInputEvent({type:'mouseWheel',x:point.x,y:point.y,deltaY:-220,deltaX:0});
    } else await js('const range=document.createRange();range.selectNodeContents(document.querySelector(".history"));getSelection().removeAllRanges();getSelection().addRange(range);void 0');
    await paint(); const stopped=await js('fixture.targets.length');
    await js('document.querySelector(".history").style.height="240px";void 0'); await paint();
    assert.equal(await js('fixture.targets.length'),stopped,intent+': later growth cannot restart follow');
    await configure(false);
  }
  for (const action of ['off','dispose','route','turn','encounter','owner','newer-style']) {
    await reset(1000); const before=await js('document.getElementById("right").style.getPropertyValue("min-height")');
    await click('#submit'); await until('fixture.submits===1'); await paint();
    const actions={off:'window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:"campaign-a",automaticDamage:false,hideIntermediateFranz:false,hideDamagePrompt:false})',route:'history.pushState({},"","/campaign-b/play");dispatchEvent(new PopStateEvent("popstate"))',turn:'fixture.encounter.currentTurnEntity.characterId=999;fixture.render()',encounter:'fixture.campaign.active_encounter_id=999;fixture.render()',owner:'fixture.footerCommitted=false;fixture.render()'};
    if(action==='newer-style') await js('document.getElementById("right").style.setProperty("min-height","73px","important");void 0');
    if(['dispose','newer-style'].includes(action)) await configure(false); else await js(actions[action]+';void 0');
    await paint();
    assert.equal(await js('document.getElementById("right").style.getPropertyValue("min-height")'),action==='newer-style'?'73px':before,action+': owned layout restored without overwriting native style');
    assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'),0,action+': shell removed');
    assert.equal(await js('fixture.gmObserver.count()'),0,action+': independent presentation subscription removed');
  }
  console.log('Combat footer follow passed'); clearTimeout(watchdog); window.destroy(); app.exit(0);
})().catch(error=>{console.error(error);clearTimeout(watchdog);window?.destroy();app.exit(1)});
