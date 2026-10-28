// ROOT-only private CPU native execution. --syntax validates source serialization.
// Native topology/callback model copied at author time from combat-footer-follow;
// ej grid ownership follows combat-flow-smoke; reveal CSS follows dice-reveal-follow.
// This executes the exported desktop controllers against committed-Fiber models,
// not production React. No executable fixture imports, private pin or fake timing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const fixtureRoot = path.resolve(__dirname, '../..');
const runtimeRoot = process.env.FABLES_TEST_APP_ROOT || fixtureRoot;
const runtimeRequire = createRequire(path.join(runtimeRoot, 'package.json'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function prepare() {
  const cache = new Map(), sources = {};
  const load = name => {
    if (cache.has(name)) return cache.get(name);
    const filename = path.join(fixtureRoot, 'src', name + '.ts'), input = fs.readFileSync(filename, 'utf8'); sources[name] = sha(input);
    const code = runtimeRequire('esbuild').transformSync(input, { loader:'ts', target:'es2022', format:'cjs' }).code; new vm.Script(code);
    const module = { exports:{} }; cache.set(name,module.exports);
    new Function('module','exports','require',code)(module,module.exports, dependency => {
      assert.ok(dependency.startsWith('.'), 'Only pure relative source dependencies');
      return load(path.posix.normalize(path.posix.join(path.posix.dirname(name), dependency)));
    });
    cache.set(name,module.exports); return module.exports;
  };
  const { configureChatAppearance } = load('appearance/chat-appearance');
  const { configureCombatFlow } = load('combat/combat-flow');
  const { DEFAULT_APPEARANCE } = load('appearance/themes');
  const configure = { appearance: configureChatAppearance.toString(), combat: configureCombatFlow.toString() };
  for (const value of Object.values(configure)) new vm.Script('(' + value + ')');
  new vm.Script('(' + nativePage.toString() + ')');
  const html = `<!doctype html><meta charset="utf-8"><style>${css}${layout}${nativeCss}${compositionCss}</style><div id="surface" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><div id="native-stack"><div></div><div id="native-middle"><div id="footer"><div id="left"></div><div id="right"></div></div><section id="composer" data-ff-combat-docked data-ff-combat-panel-mode="actions"><form><input value="preserved native draft"><button id="submit" type="submit">Attack</button></form></section><div id="hints"></div></div><div></div></div></div><script>(${nativePage.toString()})()</script>`;
  return { html, configure, settings:DEFAULT_APPEARANCE, metadata:{fixtureSHA256:sha(fs.readFileSync(__filename)),sources, runtimeRoot,fixtureRoot,htmlSHA256:sha(html),functions:Object.fromEntries(Object.entries(configure).map(([key,value])=>[key,sha(value)]))} };
}
const nativeCss = `
.transition-all{transition-property:all;transition-duration:.15s;transition-timing-function:cubic-bezier(.4,0,.2,1)}
.duration-500{transition-duration:.5s}
@keyframes enter{0%{opacity:var(--tw-enter-opacity,1);transform:translate3d(var(--tw-enter-translate-x,0), var(--tw-enter-translate-y,0), 0) scale3d(var(--tw-enter-scale,1), var(--tw-enter-scale,1), var(--tw-enter-scale,1)) rotate(var(--tw-enter-rotate,0))}}
.animate-in{--tw-enter-opacity:initial;--tw-enter-scale:initial;--tw-enter-rotate:initial;--tw-enter-translate-x:initial;--tw-enter-translate-y:initial;animation-name:enter;animation-duration:.15s}
.fade-in,.fade-in-0{--tw-enter-opacity:0}
.slide-in-from-bottom-4{--tw-enter-translate-y:1rem}
.duration-500{animation-duration:.5s}
@keyframes spin{to{transform:rotate(360deg)}}.animate-spin{animation:1s linear infinite spin}
`;
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
    const panel = appendElement(card, 'div', 'relative py-4 px-3 md:py-6 md:px-6 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border-2 shadow-2xl backdrop-blur-sm overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500 transition-all'); panel.style.cssText = 'height:156px;border:2px solid #999';
    const panelHost = nodeFiber(panel, { className: panel.className }, cardHost);
    const dice = [];
    for (let index = 0; index < (advantage ? 2 : 1); index++) {
      const die = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      die.id = event.events_roll.roll_type === 'Damage' ? 'd10' : 'd20';
      die.setAttribute('data-name', event.events_roll.roll_type === 'Damage' ? 'd10' : 'd20');
      die.setAttribute('viewBox', '0 0 32 32'); die.style.cssText = 'width:40px;height:40px';
      die.setAttribute('class', `transition-all duration-700 ease-out ${spinning ? 'animate-spin blur-sm scale-105' : 'blur-none scale-100'}`);
      die.innerHTML = '<circle cx="16" cy="16" r="12" fill="gold" />'; panel.append(die);
      dice.push(nodeFiber(die, { className: die.getAttribute('class') }, panelHost, 'svg'));
    }
    const glyph = appendElement(panel, 'span', 'native-roll-glyph', String(event.events_roll.total_roll));
    link(panelHost, [...dice, nodeFiber(glyph, {}, panelHost, 'span')]); link(cardHost, [panelHost]); link(cardOwner, [cardHost]); link(native, [cardOwner]);
    return { fiber: native, event, card, panel, dice: dice.map(value => value.stateNode), glyph, glyphText:glyph.firstChild };
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
    event.preventDefault(); if (!event.isTrusted) throw Error('Untrusted attack submit'); state.submits++; state.sequence += 10;
    if (state.submits !== 1) throw Error('One attack per fresh native page'); state.rolls = []; state.damage = undefined; state.callsAtSubmit = state.calls;
    const attackId = state.sequence, request = `local-request-${attackId}`;
    const attack = { id: attackId, role: 'player', profile_id: state.profile, request_id: request, campaign_id: campaign.id, character_id: character.id, character, created_at: new Date().toISOString(), command_used: 'roll_attack', events_roll: { roll_type: 'Spell Attack', dc: 10, total_roll: state.mode === 'miss' ? 9 : 24, modifier_value: 8, proficiency_bonus: 8 } };
    state.attack = mountRoll(attack, true); state.lastEvent = attack;
    const dmId = attackId + 1;
    const choice = state.choice = { id: attackId + 2, event_id: dmId, character_id: character.id, type: 'Damage', accepted: null, dice_expression: '1d10', fixed_bonus: 3 };
    const dm = state.latestDm = { id: dmId, role: 'dm', request_id: request, campaign_id: campaign.id, profile_id: state.profile, command_used: 'encounter_player_turn_action_response', processed: false, rollChoices: ['miss', 'no-damage'].includes(state.mode) ? [] : [choice] };
    const dmOuter = appendElement($('#events-list'), 'div'); dmOuter.id = `event-${dmId}`;
    const dmRow = appendElement(dmOuter, 'div', 'native-event-grid'); dmRow.id = `event-container-${dmId}`;
    const dmOwner = component(function NativeEvent() {}, { event: dm, campaign }, root);
    const shell = component(function NativeEventShell() { return ['event-container-', 'grid-cols-[40px_1fr_30px]', 'avatarVariant', 'showFeedbackButtons']; }, { event: dm }, dmOwner);
    const dmHost = nodeFiber(dmRow, {}, shell); link(dmOwner, [shell]); link(shell, [dmHost]); rootChildren.push(dmOwner);
    const avatar = appendElement(dmRow, 'div', 'native-event-avatar'); appendElement(avatar, 'button', '', 'Franz audio').type = 'button';
    const middle = appendElement(dmRow, 'div', 'native-event-middle');
    const feedback = appendElement(dmRow, 'div', 'native-event-feedback'); appendElement(feedback, 'button', '', 'Feedback').type = 'button';
    const hosts = [avatar, middle, feedback].map(node => nodeFiber(node, {}, dmHost)); link(dmHost, hosts);
    const middleHost = hosts[1]; state.intermediate = { outer: dmOuter, row: dmRow, avatar, middle, feedback };
    const card = appendElement(middle, 'div', 'native-narration', 'Intermediate Franz'); card.id = `event-message-card-${dmId}`; state.intermediate.card = card;
    const cardOwner = component(function NativeNarrativeCard() { return 'event-message-card-'; }, { eventId: dmId }, middleHost); link(cardOwner, [nodeFiber(card, {}, cardOwner)]);
    const rollObserver = observer(async function ee({ rollResult, rollChoice, rollCharacter, campaign, shouldTriggerFranz }) { const events_choices_rolls = 'events_choices_rolls', INSERT_EVENT = 'INSERT_EVENT', insertEventIntoQueryData = 'insertEventIntoQueryData', continueMode_ = 'continueMode_'; if (shouldTriggerFranz && continueMode_ !== 'manual') await Promise.resolve('mutateAsync Franz'); return [events_choices_rolls, INSERT_EVENT, insertEventIntoQueryData, rollResult, rollChoice, rollCharacter, campaign]; });
    state.damageObserver = rollObserver;
    const choiceOwner = state.choiceOwner = component(function t5() {}, { rollChoice: choice, campaignId: campaign.id, usersCharacter: character }, middleHost); choiceOwner.memoizedState = { memoizedState: rollObserver };
    const prompt = appendElement(middle, 'div', 'native-prompt'); prompt.id = 'native-damage-prompt';
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
    link(middleHost, [cardOwner, choiceOwner]);
    if (state.mode === 'no-damage') { prompt.remove(); link(middleHost, [cardOwner]); }
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
      const row = appendElement($('#events-list'), 'div', 'history'); row.id = `event-${id}`;
      const card = appendElement(row, 'div'); card.id = `event-message-card-${id}`; appendElement(card, 'p', '', `Native narration ${id}`);
    }
  }
  historyRows();
  const feed = $('#feed'), list = $('#events-list'), originalScrollTo = feed.scrollTo;
  state.targets = [];
  feed.scrollTo = function(...args) {
    state.targets.push({ at: performance.now(), top: args[0]?.top ?? args[1], behavior: args[0]?.behavior ?? 'auto', height: this.clientHeight, scrollHeight: this.scrollHeight });
    return Reflect.apply(originalScrollTo, this, args);
  };
  state.nativeTrace = feed.scrollTo;
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
  state.phase = 'initial'; state.frames = []; state.ends = []; state.trustedSubmits = [];
  form.addEventListener('submit', event => state.trustedSubmits.push(event.isTrusted));
  feed.addEventListener('scrollend', event => state.ends.push({ phase: state.phase, trusted: event.isTrusted, at: performance.now(), top: feed.scrollTop }));
  const geometry = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, display: getComputedStyle(node).display }; };
  state.common = $('#event-message-card-24'); state.commonText = state.common.querySelector('p').firstChild;
  const glyphGeometry = roll => { if (!roll) return null; const range=document.createRange();range.selectNodeContents(roll.glyph);const r=range.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,sameText:roll.glyph.firstChild===roll.glyphText}; };
  const priorSnapshot = state.snapshot;
  state.snapshot = () => ({ ...priorSnapshot(), phase: state.phase, clientHeight: feed.clientHeight, tailGap: feed.scrollHeight - feed.clientHeight - feed.scrollTop,
    common: geometry(state.common), attackGlyph:glyphGeometry(state.attack), damageGlyph:glyphGeometry(state.damage), attack: geometry(state.attack?.card), damage: geometry(state.damage?.card),
    intermediate: geometry(state.intermediate?.outer), narration: geometry(state.intermediate?.card), avatar: geometry(state.intermediate?.avatar), feedback: geometry(state.intermediate?.feedback),
    footer: geometry($('#footer')), prompt: geometry($('#native-damage-prompt')),
    preferredPolicy: [...list.children].filter(row => row.style.getPropertyValue('overflow-anchor') === 'none').map(row => row.id),
    rightMinHeight: $('#right').style.getPropertyValue('min-height'), rightMinPriority: $('#right').style.getPropertyPriority('min-height'),
    sameCommon: state.common.isConnected && state.common.querySelector('p').firstChild === state.commonText && state.commonText.data === 'Native narration 24',
    panelAnimations: [state.attack, state.damage].filter(Boolean).flatMap(roll => roll.panel.getAnimations().filter(a => a.effect?.target === roll.panel).map(a => ({ name:a.animationName || a.transitionProperty, state:a.playState, time:a.currentTime, duration:a.effect.getComputedTiming().duration }))),
    outcome: [...(window.__friendsFablesDesktopCombatFlowOutcomes || new Map()).values()].map(value => ({ campaign:value.campaign, eventId:value.eventId, choiceId:value.choiceId, status:value.status, rollResultId:value.rollResultId, rollSucceeded:value.rollSucceeded }))
  });
  state.record = () => { state.recording = true; const frame = () => { if (!state.recording) return; if (state.frames.length >= 1000) throw Error('Frame evidence budget exceeded'); state.frames.push(state.snapshot()); state.frameId = requestAnimationFrame(frame); }; state.frameId = requestAnimationFrame(frame); };
  state.stop = () => { state.recording = false; cancelAnimationFrame(state.frameId); return { frames:state.frames, targets:state.targets, ends:state.ends }; };
  state.render();
}
const css = `*{box-sizing:border-box}body{margin:0;background:#18202c;color:white;font:14px Arial}button{color:inherit;font:inherit;background:none;border:0}#surface{width:min(950px,100%);margin:auto}#footer{display:flex;justify-content:space-between;gap:8px;padding:0 12px 8px}#right{display:flex;align-items:center;justify-content:flex-end;gap:8px}#left{flex:1}#composer{padding:8px}main{padding:8px}.flex{display:flex}.items-center{align-items:center}.gap-1{gap:4px}.gap-2{gap:8px}.rounded-full{border-radius:9999px}.border{border:1px solid #374151}.h-12{height:48px}.h-10{height:40px}.h-8{height:32px}.w-8{width:32px}.mt-2{margin-top:8px}.pl-1{padding-left:4px}.pr-4{padding-right:16px}.px-3{padding-left:12px;padding-right:12px}.py-2{padding-top:8px;padding-bottom:8px}.bg-gray-800\\/70{background:#1f2937}.bg-blue-600\\/20{background:#163962}.chevrons{font-size:10px}.animate-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}button:disabled{opacity:.5}#submit{padding:8px;border:1px solid #999}#native-continue{white-space:nowrap}`;
const layout = `html,body{height:100%;overflow:hidden}#surface{height:100%;display:flex;flex-direction:column}#feed{flex:1;min-height:0;overflow:auto;padding:16px}#events-list>.history{height:90px}#native-stack{flex:none;display:grid;position:relative;grid-template-columns:40px minmax(0,1fr) 30px}#native-middle{min-width:0;position:relative;margin-left:16px}#composer{height:52px}#footer{min-width:0}#right{min-width:0}#right img{flex:none}#left{min-width:0}#hints{height:30px}@media(max-width:767px){#native-stack{grid-template-columns:minmax(0,1fr)}#native-middle{margin-left:0}#hints{display:none}}`;
const compositionCss = `.native-event-grid{display:grid;grid-template-columns:40px minmax(0,1fr) 30px;column-gap:8px;padding:12px 0}.native-event-avatar{height:160px}.native-event-feedback{height:140px}.native-event-middle{margin-left:16px}.native-narration{min-height:120px}.native-prompt{height:52px}.relative{position:relative}#events-list>.history p{margin:0;padding:12px}#feed{overflow-anchor:auto;scroll-behavior:smooth}#events-list svg{width:84px!important;height:84px!important}`;
module.exports = { prepare };
if (!process.versions.electron) {
  assert.ok(process.argv.includes('--syntax'), 'Use --syntax for offline source-export checks');
  console.log('DAMAGE_CONTINUITY_SYNTAX', JSON.stringify(prepare().metadata));
} else {
  const { app, BrowserWindow, session } = runtimeRequire('electron');
  if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Use the ROOT private CPU/profile runner');
  app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
  let win;
  const watchdog = setTimeout(() => { console.error('Damage continuity deadline'); win?.destroy(); app.exit(1); }, 40000);
  app.on('window-all-closed', () => {});
  (async () => {
    const prepared = prepare(); console.log('DAMAGE_CONTINUITY_SOURCE', JSON.stringify(prepared.metadata));
    await app.whenReady(); const site = session.fromPartition('damage-continuity-' + process.pid);
    site.protocol.handle('https', () => new Response(prepared.html, { headers:{'Content-Type':'text/html'} }));
    win = new BrowserWindow({ show:false, width:1000, height:850, webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false} });
    const js = code => win.webContents.executeJavaScript(code);
    const paint = () => js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const until = async expression => {
      for (let count=0; count<150; count++) { if (await js(expression)) return; await new Promise(resolve=>setTimeout(resolve,10)); }
      throw Error('Functional readiness failed: ' + expression + '; ' + JSON.stringify(await js('({snapshot:fixture.snapshot(),targets:fixture.targets,frames:fixture.frames.slice(-8)})')));
    };
    const preferences = hide => js(`window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:true,hideIntermediateFranz:${hide},hideDamagePrompt:${hide}});void 0`);
    const reset = async hide => {
      await win.loadURL('https://play.fables.gg/campaign-a/play'); win.show(); win.focus(); win.webContents.focus();
      await until('document.visibilityState==="visible"&&document.hasFocus()'); await paint();
      // Initial real native tail arrival precedes adapter discovery. No private
      // pin flag or scrollend publication is used to establish this precondition.
      await js('document.getElementById("feed").scrollTo({top:document.getElementById("feed").scrollHeight,behavior:"instant"});void 0'); await paint();
      await js(`(${prepared.configure.appearance})(${JSON.stringify(prepared.settings)});(${prepared.configure.combat})(true,'en')`);
      await preferences(hide); await paint();
      const before = await js('fixture.snapshot()'); assert.ok(Math.abs(before.tailGap)<=1,'Actual initial tail arrival');
      assert.equal(before.nativeEnd,true,'Validated initial native End host'); assert.equal(before.sameCommon,true);
      await js('fixture.targets.length=0;fixture.record();void 0'); return before;
    };
    const clickAttack = async () => {
      await paint(); assert.ok(win.isVisible()&&win.isFocused()&&win.webContents.isFocused(),'Native focused input');
      const point=await js('(()=>{const n=document.getElementById("submit"),r=n.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return{x,y,hit:n.contains(document.elementFromPoint(x,y))}})()');
      assert.ok(point.hit,'Trusted Attack native hit target');
      for (const type of ['mouseDown','mouseUp']) win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:1});
      await until('fixture.submits===1&&fixture.gmPending');
      assert.deepEqual(await js('fixture.trustedSubmits'),[true],'Actual trusted native form submit');
    };
    const stable = async () => js(`new Promise((resolve,reject)=>{
      let count=0,steady=0,previous='';const frame=()=>{
        const s=fixture.snapshot();const current=JSON.stringify([s.scrollTop,s.scrollHeight,s.clientHeight,s.footerHeight,s.listHeight]);
        const finite=s.panelAnimations.filter(a=>a.name!=='spin').every(a=>a.state==='finished');
        steady=current===previous&&finite?steady+1:0;previous=current;
        if(steady>=6){resolve(s);return}if(++count>=180){reject(Error('Layout/motion did not settle: '+JSON.stringify(s)));return}requestAnimationFrame(frame)
      };requestAnimationFrame(frame)
    })`);
    const preserved = snapshot => {
      assert.ok(snapshot.sameForm&&snapshot.sameDraft&&snapshot.sameDice&&snapshot.sameCommon,'Native form/draft/dice/common Text identities');
      assert.equal(snapshot.draft,'preserved native draft'); assert.equal(snapshot.calls,1,'Exactly one native automatic Damage callback');
      assert.equal(snapshot.endCalls,0,'No End action generated'); assert.equal(snapshot.continueCalls,0,'Manual Continue never generated');
    };
    const cleanup = async () => {
      await js('fixture.stop();window.__friendsFablesDesktopCombatFlow.dispose();window.__friendsFablesDesktopChatAppearance.dispose();void 0'); await paint();
      const result = await js('({gm:fixture.gmObserver.count(),damage:fixture.damageObserver?.count()||0,shells:document.querySelectorAll("[data-ff-combat-turn-control],[data-ff-combat-damage-progress]").length,min:document.getElementById("right").style.getPropertyValue("min-height"),anchors:[...document.querySelectorAll("#events-list > div")].filter(n=>n.style.getPropertyValue("overflow-anchor")).length})');
      assert.deepEqual(result,{gm:0,damage:0,shells:0,min:'',anchors:0},'Disposed subscriptions, footprints, shell and anchor ownership'); return result;
    };
    // Authority controls run before any directional regression assertions. A
    // native wheel is delivered by Electron; selection is an actual DOM Range.
    const controls=[];
    for (const intent of ['wheel','selection','native','newer','route']) {
      await reset(true); await js('fixture.phase="attack"'); await clickAttack();
      if(['native','newer'].includes(intent)) await until('fixture.attack&&document.getElementById("feed").scrollTo!==fixture.nativeTrace&&fixture.snapshot().scrollTop<fixture.snapshot().target-20&&getComputedStyle(fixture.attack.panel).opacity>0');
      else await stable();
      if(intent==='wheel') {
        const point=await js('(()=>{const r=document.getElementById("feed").getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()');
        const before=await js('fixture.snapshot().scrollTop');
        win.webContents.sendInputEvent({type:'mouseWheel',x:point.x,y:point.y,deltaY:-220,deltaX:0});
        await until('fixture.snapshot().scrollTop<'+(before-20));
      } else if(intent==='selection') await js('const range=document.createRange();range.selectNodeContents(fixture.common);getSelection().removeAllRanges();getSelection().addRange(range);void 0');
      else if(intent==='route') await js('history.pushState({},"","/campaign-b/play");dispatchEvent(new PopStateEvent("popstate"));void 0');
      else await js(`(()=>{const feed=document.getElementById('feed');${intent==='newer'?"const prior=feed.scrollTo;fixture.newer=function(...args){return Reflect.apply(prior,this,args)};Object.defineProperty(feed,'scrollTo',{configurable:true,writable:true,value:fixture.newer});":""}feed.scrollTo({top:83,behavior:'instant'})})()`);
      await paint(); const stopped=await js('fixture.targets.length');
      await js('document.querySelector(".history").style.height="240px";void 0'); await paint(); await paint();
      assert.equal(await js('fixture.targets.length'),stopped,intent+': history growth cannot restart owned follow');
      if(intent==='selection') assert.equal(await js('getSelection().toString()'), 'Native narration 24','Selection remains native');
      if(intent==='newer') assert.equal(await js('document.getElementById("feed").scrollTo===fixture.newer'),true,'Newer method owner retained');
      const retired=await cleanup();
      if(intent==='newer') assert.equal(await js('document.getElementById("feed").scrollTo===fixture.newer'),true,'Disposal preserves newer method owner');
      controls.push({intent,retired});
    }
    console.log('DAMAGE_CONTINUITY_CONTROLS',JSON.stringify(controls));
    const results=[];
    for(const variant of ['automatic-conceal','public-settled-conceal']) {
      const initial=await reset(variant==='automatic-conceal'); await js('fixture.phase="attack"'); await clickAttack();
      const attack=await stable(); assert.ok(attack.gmSubscriptions>0,'Real GM observer subscription');
      assert.ok(attack.rightMinHeight&&attack.rightMinPriority==='important','Real native footer footprint reserved');
      assert.ok(attack.targets.some(value=>value.behavior==='smooth'),'Real browser smooth dispatch');
      // Exact GM result and settled Attack permit the actual automatic callback;
      // no direct callback call, synthetic acceptance, or forced flow state.
      await js('fixture.phase="auto-entry";fixture.setSpin("attack",false);fixture.finishGM();void 0');
      await until('fixture.calls===1&&!!fixture.damage'); const entry=await stable(); preserved(entry);
      assert.equal(entry.outcome.length,1,'One validated action outcome');
      assert.equal(entry.outcome[0].status,'accepted','Native mutation/choice accepted proof');
      assert.equal(entry.outcome[0].rollResultId,await js('fixture.damage.event.id'),'Accepted exact native result relationship');
      assert.ok(await js('fixture.frames.some(f=>f.phase==="auto-entry"&&f.panelAnimations.some(a=>a.name==="enter"&&a.state==="running"))'), 'Actual native CSS entrance animation sampled');
      if(variant==='automatic-conceal') {
        assert.equal(entry.intermediate.display,'none','Fully concealed validated ej outer row collapses');
        assert.equal(entry.narration.display,'none'); assert.equal(entry.avatar.display,'none'); assert.equal(entry.feedback.display,'none');
      } else assert.notEqual(entry.intermediate.display,'none','Control retains native intermediate before public preference change');
      await js('fixture.phase="damage-spinning";fixture.finishDamage();void 0'); await paint();
      const spinning=await js('fixture.snapshot()'); preserved(spinning); assert.equal(spinning.continueVisible,false,'Own spinning result retains busy presentation');
      await js('fixture.phase="settled";fixture.setSpin("damage",false);document.body.append(document.createElement("i"));void 0');
      await until('fixture.snapshot().continueVisible'); const settled=await stable(); preserved(settled);
      assert.equal(settled.gmSubscriptions,0); assert.equal(settled.damageSubscriptions,0);
      assert.equal(await js('document.querySelectorAll("[data-ff-combat-turn-control]").length'),0,'Settled Manual handoff releases busy shell');
      assert.equal(settled.listHeight,spinning.listHeight,'Footer-only handoff retains event extent');
      assert.deepEqual(settled.rollHeights,spinning.rollHeights,'Footer-only handoff retains native result heights');
      assert.equal(settled.feedHeight,spinning.feedHeight,'Footer-only handoff retains native viewport');
      assert.equal(settled.footerHeight,spinning.footerHeight,'Footer-only handoff retains validated footer height');
      assert.equal(settled.target,spinning.target,'Footer-only handoff retains native tail target');
      if(variant==='public-settled-conceal') {
        // Supported public preference control, NOT a claim that the video
        // changed preferences or that a native delayed commit was reproduced.
        await js('fixture.phase="public-settled-conceal"'); await preferences(true); await until('fixture.snapshot().intermediate.display==="none"');
        const concealed=await stable(); preserved(concealed);
        assert.ok(concealed.listHeight<settled.listHeight-100,'Validated public conceal removes meaningful intermediate extent');
      }
      const beforeFooter=await js('fixture.snapshot()');
      await js('fixture.phase="footer-handoff";fixture.lastEvent={role:"dm",profile_id:fixture.profile,command_used:"encounter_player_turn_action_response"};fixture.render();void 0');
      await until('fixture.snapshot().nativeEnd&&fixture.snapshot().rightMinHeight===""'); const final=await stable(); preserved(final);
      assert.equal(final.listHeight,beforeFooter.listHeight,'Footprint release retains native event content');
      const evidence=await js('fixture.stop()');
      assert.ok(evidence.frames.every(frame=>frame.sameCommon&&frame.sameForm&&frame.sameDraft&&frame.sameDice&&(!frame.attackGlyph||frame.attackGlyph.sameText)&&(!frame.damageGlyph||frame.damageGlyph.sameText)),'Every painted frame retains native identities');
      assert.ok(evidence.frames.some(frame=>frame.phase==='auto-entry'&&frame.panelAnimations.some(a=>a.name==='enter'&&a.state==='running')),'Sampled actual reveal frames');
      const retired=await cleanup();
      results.push({variant,initial,attack,entry,spinning,settled,final,evidence,retired});
      console.log('DAMAGE_CONTINUITY_FUNCTIONAL',JSON.stringify(results.at(-1)));
    }
    // Only after native proof, manual authority, identities, footer invariance,
    // preference behavior and cleanup pass may a failure be classified RED.
    console.log('DAMAGE_CONTINUITY_FUNCTIONAL_PASSED',JSON.stringify({controls:controls.length,variants:results.map(value=>value.variant)}));
    for(const result of results) {
      const excursions=[]; const frames=result.evidence.frames;
      for(let index=1;index<frames.length;index++) {
        const before=frames[index-1],after=frames[index];
        if(!before.attack||!after.attack||!['auto-entry','damage-spinning','settled','public-settled-conceal','footer-handoff'].includes(after.phase)) continue;
        // A browser clamp after extent shrink is legitimate. A native anchor
        // correction that keeps the same Attack card fixed is legitimate too.
        // An older-history excursion decreases actual scrollTop beyond a max
        // clamp AND moves the unchanged Attack card downward on the screen.
        if(after.scrollTop<Math.min(before.scrollTop,after.target)-2&&after.attack.top>before.attack.top+2) excursions.push({before,after});
      }
      const tails=['auto-entry','settled','public-settled-conceal','footer-handoff'].map(phase=>frames.filter(frame=>frame.phase===phase).at(-1)).filter(Boolean);
      console.log('DAMAGE_CONTINUITY_DIRECTION',JSON.stringify({variant:result.variant,excursions,tails:tails.map(value=>({phase:value.phase,top:value.scrollTop,height:value.scrollHeight,clientHeight:value.clientHeight,gap:value.tailGap}))}));
      assert.equal(excursions.length,0,result.variant+': no artificial painted older-history excursion');
      for(const tail of tails) assert.ok(Math.abs(tail.tailGap)<=2,result.variant+': settled tail gap at '+tail.phase+' = '+tail.tailGap);
    }
    console.log('Damage scroll continuity passed'); clearTimeout(watchdog); win.destroy(); app.exit(0);
  })().catch(error=>{console.error('Damage continuity fixture failure',error);clearTimeout(watchdog);win?.destroy();app.exit(1)});
}
