const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');
const source = esbuild.transformSync(fs.readFileSync(process.env.FABLES_FLOW_TEST_SOURCE || require('node:path').join(__dirname, '../../src/combat/combat-flow.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
function fixture(saved) {
  class Element {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attributes = new Map(); this.listeners = {}; this.parentElement = null; this.styles = new Map(); this.style = { cssText: '', setProperty: (k, v, priority = '') => this.styles.set(k, { v, priority }), removeProperty: k => this.styles.delete(k), getPropertyValue: k => this.styles.get(k)?.v ?? '', getPropertyPriority: k => this.styles.get(k)?.priority ?? '' }; }
    setAttribute(k, v) { this.attributes.set(k, v); }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = null; }
    get childNodes() { return this.children; }
    contains(node) { return node === this || this.children.some(n => n.contains(node)); }
    closest() { return null; }
    querySelector(selector) { return this.children.find(n => n.tagName === selector) || null; }
    addEventListener(k, fn) { this.listeners[k] = fn; }
    change(value) { this.checked = value; this.listeners.change(); }
  }
  const dock = new Element(), form = new Element('form'); dock.append(form);
  const root = { tag: 3, stateNode: {} }; root.stateNode.current = root;
  const formFiber = { memoizedProps: {}, return: root }; root.child = formFiber; form.__reactFiber$fixture = formFiber;
  const savedMap = new Map(saved ? [['ff-desktop-combat-flow-v1:campaign-a', JSON.stringify(saved)]] : []);
  let frame, observer;
  const documentListeners = {};
  const context = { HTMLFormElement: Element, HTMLElement: Element, module: { exports: {} }, Element, window: { setInterval() { return 1; }, clearInterval() {}, addEventListener() {}, removeEventListener() {} }, location: { pathname: '/campaign-a/play' }, localStorage: { getItem(k) { return savedMap.get(k) ?? null; }, setItem(k, v) { savedMap.set(k, v); } }, document: { addEventListener(k, fn) { documentListeners[k] = fn; }, removeEventListener(k) { delete documentListeners[k]; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement(tag) { return new Element(tag); }, documentElement: new Element(), querySelector() { return dock; } }, requestAnimationFrame(fn) { frame = fn; return 1; }, cancelAnimationFrame() { frame = undefined; }, MutationObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() {} } };
  vm.runInNewContext(source, context);
  // Production injects only function.toString(), with no CommonJS helpers.
  const injected = context.module.exports.configureCombatFlow.toString();
  delete context.module;
  context.configure = vm.runInNewContext(`(${injected})`, context);
  const flush = () => { const callback = frame; frame = undefined; callback?.(); };
  const install = (enabled = true, locale = 'en') => { context.configure(enabled, locale); flush(); };
  const notify = () => { observer([{ target: form }]); flush(); };
  install();
  const controller = () => context.window.__friendsFablesDesktopCombatFlow;
  const preferences = () => controller().getPreferences();
  const setPreferences = patch => controller().setPreferences({ ...preferences(), ...patch });
  // Existing flow regressions exercise disable/restore through the new narrow API.
  const controls = () => ({ auto: { change: value => setPreferences({ automaticDamage: value }) }, hide: { change: value => setPreferences({ hideIntermediateFranz: value }) } });
  return { context, dock, form, root, formFiber, savedMap, controls, preferences, setPreferences, controller, install, notify, Element, documentListeners };
}
test('default-off preferences create no inline website fieldset', () => {
  const f = fixture();
  assert.deepEqual(JSON.parse(JSON.stringify(f.preferences())), {campaignId:'campaign-a',automaticDamage:false,hideIntermediateFranz:false,hideDamagePrompt:false});
  assert.equal(f.dock.children.length,1);assert.equal(f.form.children.length,0);
});
test('saved malformed and dependent settings fail closed', () => {
  for(const value of [{automaticDamage:false,hideIntermediateFranz:true},{automaticDamage:'true',hideIntermediateFranz:true},null]) {
    const p=fixture(value).preferences();assert.equal(p.automaticDamage,false);assert.equal(p.hideIntermediateFranz,false);
  }
});
test('preference roundtrip isolates campaigns and auto off clears hide immediately', () => {
 const f=fixture();f.setPreferences({automaticDamage:true,hideIntermediateFranz:true});f.setPreferences({automaticDamage:false});
 assert.equal(f.preferences().hideIntermediateFranz,false);
 f.context.location.pathname='/campaign-b/play'; // No RAF needed for route correlation.
 assert.equal(f.preferences().automaticDamage,false);f.setPreferences({automaticDamage:true});
 assert.deepEqual(JSON.parse(f.savedMap.get('ff-desktop-combat-flow-v1:campaign-a')),{automaticDamage:false,hideIntermediateFranz:false,hideDamagePrompt:false});
 assert.deepEqual(JSON.parse(f.savedMap.get('ff-desktop-combat-flow-v1:campaign-b')),{automaticDamage:true,hideIntermediateFranz:false,hideDamagePrompt:false});
});
test('malformed, stale and off-campaign preference saves reject without writes', () => {
 const f=fixture(),p=f.preferences();
 for(const value of [null,[],{...p,automaticDamage:'true'},{...p,hideIntermediateFranz:1},{...p,extra:true}])assert.throws(()=>f.controller().setPreferences(value));
 f.context.location.pathname='/campaign-b/play';assert.throws(()=>f.controller().setPreferences(p));
 f.context.location.pathname='/campaign-b/settings';assert.equal(f.preferences(),null);assert.throws(()=>f.controller().setPreferences(p));assert.equal(f.savedMap.size,0);
});
test('update and dispose retain native form identity', () => {
 const f=fixture();f.install(true,'ru');assert.equal(f.dock.children[0],f.form);f.install(false);assert.equal(f.context.window.__friendsFablesDesktopCombatFlow,undefined);
});
test('preference reads do not scan DOM or React and duplicate config retains state', () => {
 const f=fixture({automaticDamage:true,hideIntermediateFranz:true});f.install();f.install();
 f.context.document.querySelector=()=>{throw Error('DOM scan');};f.context.document.querySelectorAll=()=>{throw Error('DOM scan');};
 assert.equal(f.preferences().hideIntermediateFranz,true);assert.equal(f.dock.children.length,1);
});

function flowFixture(options = {}) {
  const f = fixture({ automaticDamage: true, hideIntermediateFranz: !!options.hide, hideDamagePrompt: !!options.hidePrompt });
  const { Element, root, form, formFiber, context } = f;
  let damageListener, damageResultState = {status:'idle',submittedAt:0};
  const damageObserver={options:{mutationFn:function nativeSendRoll({rollResult,rollChoice,campaign,rollCharacter}){return ['events_choices_rolls','INSERT_EVENT','insertEventIntoQueryData',{rollResult,rollChoice,campaign,rollCharacter}]}},getCurrentResult(){return damageResultState},subscribe(fn){damageListener=fn;return()=>{damageListener=null}}};
  let listener, result = { status: 'idle', submittedAt: 0 }, calls = 0, passedChoice, unsubscribed = 0;
  const observer = { options: { mutationFn: function nativeGM({ lastEventId }) { return ['ENCOUNTER_GM_RESPONSE', 'GM_RESPONSE', lastEventId]; } }, getCurrentResult() { return result; }, subscribe(fn) { listener = fn; return () => { listener = null; unsubscribed++; }; } };
  const character = { id: 83026155 };
  const attack = { type: 'spell', requires_attack_roll: true, modifier_value: 8, proficiency_bonus: 8, targets: [{ id: 2217533, ac: 10 }] };
  const methods = { control: {}, getValues() { return options.multi ? [attack, attack] : [attack]; } };
  const owner = { type: function nativeExecuteActions() { const sendAttackRoll = null; return sendAttackRoll; }, memoizedProps: { campaignId: 'campaign-a', encounterId: 412456, isUsersCharacterTurn: true, isMultiplayerCampaign: true }, memoizedState: { memoizedState: { data: { usersCharacter: character } }, next: { memoizedState: observer } }, return: root };
  const provider = { memoizedProps: methods, return: owner }; formFiber.return = provider; provider.child = formFiber; owner.child = provider; root.child = owner;
  form.closest = () => f.dock;
  const request = 'request-new', attackEvent = { id: 107655713, role: 'player', request_id: request, campaign_id: 'campaign-a', character_id: 83026155, command_used: 'roll_attack', events_roll: { dc: 10, total_roll: options.miss ? 9 : 24, roll_type: 'Spell Attack', modifier_value: 8, proficiency_bonus: 8 } };
  const choice = { id: 6840826, event_id: 107655722, character_id: 83026155, type: 'Damage', accepted: options.accepted ?? null, dice_expression: options.crit ? '2d10+3' : '1d10', fixed_bonus: 3 };
  const dmEvent = { id: 107655722, role: 'dm', request_id: options.unrelated ? 'request-other' : request, campaign_id: 'campaign-a', command_used: 'encounter_player_turn_action_response', processed: !options.streaming, rollChoices: [choice] };
  const attackRow = new Element(), dmRow = new Element(), button = new Element('button');
  attackRow.id = 'event-container-undefined'; dmRow.id = 'event-container-107655722'; dmRow.append(button);
  button.isConnected = true; button.disabled = false; button.matches = () => false; button.getClientRects = () => [{}];
  const nativeCampaign = { id: 'campaign-a', active_encounter_id: 412456 };
  const rowFiber = { memoizedProps: { event: dmEvent, campaign: nativeCampaign }, return: root };
  const t5 = { memoizedProps: { rollChoice: choice, campaignId: 'campaign-a', usersCharacter: character }, memoizedState:{memoizedState:damageObserver}, return: rowFiber };
  const callback = function nativeQuickRoll(event) { event.stopPropagation(); const dice_expression = choice.dice_expression; passedChoice = { ...choice, dice_expression }; calls++; if(options.voidMutation){damageResultState={status:'pending',submittedAt:Date.now()+1,variables:{rollChoice:choice,campaign:nativeCampaign,rollCharacter:character,rollResult:options.nativeRollResult??{}}};damageListener?.(damageResultState);} if (options.failure) throw Error('native unknown outcome'); if (options.reject) return Promise.reject(Error('native async unknown outcome')); };
  const buttonFiber = { memoizedProps: { onClick: callback }, return: t5 }; t5.child = buttonFiber; rowFiber.child = t5; button.__reactFiber$fixture = buttonFiber;
  dmRow.__reactFiber$fixture = rowFiber; attackRow.__reactFiber$fixture = { memoizedProps: { event: attackEvent, campaign: nativeCampaign }, return: root };
  owner.sibling = attackRow.__reactFiber$fixture; attackRow.__reactFiber$fixture.sibling = rowFiber;
  const card = new Element(); card.id = 'event-message-card-107655722'; dmRow.append(card);
  const cardOwner = { type: function NativeNarrativeCard() { return 'event-message-card-'; }, memoizedProps: { eventId: dmEvent.id }, return: rowFiber };
  card.__reactFiber$fixture = { memoizedProps: { id: card.id }, return: cardOwner }; cardOwner.child = card.__reactFiber$fixture; t5.sibling = cardOwner;
  const prompt = new Element(), damageResult = new Element(), finalReply = new Element();
  if (options.prompt) {
    prompt.id = ''; prompt.isConnected = true; prompt.tagName = 'DIV'; prompt.querySelector = () => null;
    dmRow.append(prompt, damageResult, finalReply); prompt.append(button);
    const host = { tag: 5, type: 'div', stateNode: prompt, memoizedProps: {}, return: t5, child: buttonFiber };
    t5.child = host; buttonFiber.return = host; prompt.__reactFiber$fixture = host;
  }
  let avatar, middle, actions, shell, rowHost;
  if (options.wrapper) {
    avatar = new Element(); middle = new Element(); actions = new Element();
    const audio = new Element('button'), feedback = new Element('button'); avatar.append(audio); actions.append(feedback);
    avatar.querySelectorAll = () => [audio]; actions.querySelectorAll = () => [feedback];
    dmRow.append(avatar, middle, actions); middle.append(card, ...(options.prompt ? [prompt, damageResult, finalReply] : [button]));
    shell = { type: function NativeEventShell() { return ['event-container-', 'grid-cols-[40px_1fr_30px]', 'avatarVariant', 'showFeedbackButtons']; }, memoizedProps: {event:dmEvent}, return:rowFiber };
    rowHost = {tag:5,type:'div',stateNode:dmRow,memoizedProps:{},return:shell}; shell.child=rowHost; rowFiber.child=shell; dmRow.__reactFiber$fixture=rowHost;
    const hosts=[avatar,middle,actions].map(node=>({tag:5,type:'div',stateNode:node,memoizedProps:{},return:rowHost}));
    hosts.forEach((host,index)=>{[avatar,middle,actions][index].__reactFiber$fixture=host;if(index<2)host.sibling=hosts[index+1]});rowHost.child=hosts[0];
    hosts[1].child=cardOwner;cardOwner.return=hosts[1];cardOwner.sibling=t5;t5.return=hosts[1];t5.sibling=undefined;
  }
  card.querySelectorAll = () => [];
  dmRow.querySelectorAll = selector => selector === 'button' ? [button] : selector === '[id^="event-message-card-"]' ? [card] : [];
  const attackCard = new Element(), attackPanel = new Element();attackCard.id='event-message-card-'+attackEvent.id;attackRow.append(attackCard);attackCard.append(attackPanel);
  const attackFiber=attackRow.__reactFiber$fixture,attackCardOwner={type:function NativeNarrativeCard(){return 'event-message-card-'},memoizedProps:{eventId:attackEvent.id},return:attackFiber},attackCardHost={tag:5,type:'div',stateNode:attackCard,memoizedProps:{},return:attackCardOwner},attackPanelHost={tag:5,type:'div',stateNode:attackPanel,memoizedProps:{className:'relative rounded-2xl border-2 overflow-hidden'},return:attackCardHost};
  attackFiber.child=attackCardOwner;attackCardOwner.child=attackCardHost;attackCardHost.child=attackPanelHost;attackCard.__reactFiber$fixture=attackCardHost;attackPanel.__reactFiber$fixture=attackPanelHost;attackCard.querySelectorAll=()=>[attackPanel];
  context.document.getElementById = value => value === dmRow.id ? dmRow : value===attackCard.id?attackCard: rows.find(row=>row.resultCard?.id===value)?.resultCard ?? null;
  const rows = [attackRow, dmRow]; context.document.querySelectorAll = () => rows;
  return { ...f, observer, owner, character, attack, choice, dmEvent, attackEvent, button, t5, rows, card, attackCard, attackPanel, prompt, damageResult, finalReply, nativeCampaign, avatar, middle, actions, shell, rowHost, result: () => result, calls: () => calls, passedChoice: () => passedChoice, unsubscribed: () => unsubscribed,
    submit(trusted = true) { f.documentListeners.submit({ isTrusted: trusted, target: form }); },
    pending(extra = {}) { result = { status: 'pending', submittedAt: Date.now() + 1, variables: { requestId: request, lastEventId: attackEvent.id, isMultiplayer: true }, ...extra }; listener?.(result); if (!options.streaming) { result = { ...result, status: 'success' }; listener?.(result); } f.notify(); },
    damageFailure(extra={}) {damageResultState={...damageResultState,status:'error',error:Error('native backend rejection'),...extra};damageListener?.(damageResultState);f.notify();},
    damageState:()=>damageResultState,damageObserver,
    finish(extra = {}) { result = { ...result, status: 'success', ...extra }; listener?.(result); f.notify(); },
  };
}
test('trusted native submit + local pending result activates linked Damage exactly once', () => {
  const f = flowFixture(); f.submit(); f.pending(); assert.equal(f.calls(), 1); f.notify(); f.pending(); assert.equal(f.calls(), 1); assert.equal(f.unsubscribed(), 1);
  assert.deepEqual(f.passedChoice(), f.choice);
});
test('historical/other-device events do not launch damage without this local invocation', () => {
  const f = flowFixture(); f.notify(); f.pending(); assert.equal(f.calls(), 0);
  const untrusted = flowFixture(); untrusted.submit(false); untrusted.pending(); assert.equal(untrusted.calls(), 0);
});
test('native miss, unrelated DM, accepted choice, multiattack remain manual', () => {
  for (const options of [{ miss: true }, { unrelated: true }, { accepted: true }, { accepted: false }, { multi: true }]) { const f = flowFixture(options); f.submit(); f.pending(); assert.equal(f.calls(), 0); }
});
test('critical native choice expression and fixed bonus forwarded unchanged', () => {
  const f = flowFixture({ crit: true }); f.submit(); f.pending(); assert.equal(f.calls(), 1); assert.equal(f.passedChoice().dice_expression, '2d10+3'); assert.equal(f.passedChoice().fixed_bonus, 3);
});
test('claim precedes unknown callback failure and never retries', () => {
  const f = flowFixture({ failure: true }); f.submit(); f.pending(); f.notify(); f.pending(); assert.equal(f.calls(), 1);
});
test('second submission, disable and route change cancel pending ticket', () => {
  for (const action of [f => f.submit(), f => f.controls().auto.change(false), f => { f.context.location.pathname = '/campaign-b/play'; f.notify(); }, f => f.install(false)]) {
    const f = flowFixture(); f.submit(); action(f); f.pending(); assert.equal(f.calls(), 0);
  }
});
test('old observer result, competing request and malformed local variables cancel', () => {
  for (const extra of [{ submittedAt: 0 }, { variables: { requestId: 'request-other', lastEventId: 99 } }, { variables: { requestId: 'request-new' } }, { variables: { requestId: 'request-new', lastEventId: 107655713, isRewrite: true } }]) {
    const f = flowFixture(); f.submit(); f.pending(extra); assert.equal(f.calls(), 0);
  }
});
test('changed own character or duplicate choice owner never autoacts', () => {
  const f = flowFixture(); f.submit(); f.character.id = 123; f.pending(); assert.equal(f.calls(), 0);
  const multiple = flowFixture(); multiple.dmEvent.rollChoices.push({ ...multiple.choice, id: 2 }); multiple.submit(); multiple.pending(); assert.equal(multiple.calls(), 0);
});
test('hides only proven intermediate native card; preserves choices and unrelated/final rows', () => {
  const f = flowFixture({ hide: true }); f.submit(); f.pending();
  assert.equal(f.card.style.getPropertyValue('display'), 'none'); assert.equal(f.button.style.getPropertyValue('display'), '');
  assert.equal(f.rows[1].style.getPropertyValue('display'), ''); assert.equal(f.rows[0].style.getPropertyValue('display'), '');
  f.controls().hide.change(false); assert.equal(f.card.style.getPropertyValue('display'), '');
});
test('auto off, route change and dispose restore exact prior narrative display', () => {
  for (const action of [f => f.controls().auto.change(false), f => { f.context.location.pathname = '/campaign-b/play'; f.notify(); }, f => f.install(false)]) {
    const f = flowFixture({ hide: true }); f.card.style.setProperty('display', 'grid', 'important'); f.submit(); f.pending(); assert.equal(f.card.style.getPropertyValue('display'), 'none');
    action(f); assert.equal(f.card.style.getPropertyValue('display'), 'grid'); assert.equal(f.card.style.getPropertyPriority('display'), 'important');
  }
});
test('historical choice or mixed roll controls never concealed', () => {
  const old = flowFixture({ hide: true }); old.notify(); assert.equal(old.card.style.getPropertyValue('display'), '');
  const mixed = flowFixture({ hide: true }); mixed.card.querySelectorAll = () => [mixed.button]; mixed.submit(); mixed.pending(); assert.equal(mixed.calls(), 1); assert.equal(mixed.card.style.getPropertyValue('display'), '');
});
test('encounter switch cancels action and restores linked card', () => {
  const before = flowFixture(); before.submit(); before.nativeCampaign.active_encounter_id = 999; before.pending(); assert.equal(before.calls(), 0);
  const after = flowFixture({ hide: true }); after.submit(); after.pending(); assert.equal(after.card.style.getPropertyValue('display'), 'none'); after.nativeCampaign.active_encounter_id = 999; after.notify(); assert.equal(after.card.style.getPropertyValue('display'), '');
});
test('changed current rollChoice fields and detached leaf stay manual', () => {
  const changed = flowFixture(); changed.t5.memoizedProps.rollChoice = { ...changed.choice, dice_expression: '9d20' }; changed.submit(); changed.pending(); assert.equal(changed.calls(), 0);
  const detached = flowFixture(); detached.t5.child = undefined; detached.submit(); detached.pending(); assert.equal(detached.calls(), 0);
});
test('backfilled own event and another device request cannot replace observer event', () => {
  const f = flowFixture(); f.attackEvent.id = 999; f.submit(); f.pending({ variables: { requestId: 'request-new', lastEventId: 107655713 } }); assert.equal(f.calls(), 0);
  const competing = flowFixture(); const row = new competing.Element(); row.id = 'event-container-undefined'; row.__reactFiber$fixture = { memoizedProps: { event: { ...competing.attackEvent, id: 999, request_id: 'other-device', created_at: new Date(Date.now() + 1000).toISOString() } }, return: competing.root }; competing.rows.push(row); competing.rows[1].__reactFiber$fixture.sibling = row.__reactFiber$fixture; competing.submit(); competing.pending(); assert.equal(competing.calls(), 0);
});
test('stale React alternate callback resolves to current native choice callback', () => {
  const f = flowFixture(); const currentRow = f.rows[1].__reactFiber$fixture, currentButton = f.button.__reactFiber$fixture;
  const alternateRoot = { tag: 3, stateNode: f.root.stateNode, alternate: f.root }; f.root.alternate = alternateRoot;
  const alternateRow = { memoizedProps: { event: f.dmEvent, campaign: f.nativeCampaign }, return: alternateRoot, alternate: currentRow }; currentRow.alternate = alternateRow;
  const alternateOwner = { memoizedProps: { ...f.t5.memoizedProps }, return: alternateRow, alternate: f.t5 }; f.t5.alternate = alternateOwner;
  let staleCalls = 0;
  const alternateButton = { memoizedProps: { onClick: function staleQuickRoll() { const dice_expression = 'stale'; staleCalls++; return dice_expression; } }, return: alternateOwner, alternate: currentButton }; currentButton.alternate = alternateButton;
  alternateRoot.child = alternateRow; alternateRow.child = alternateOwner; alternateOwner.child = alternateButton;
  f.button.__reactFiber$fixture = alternateButton; f.submit(); f.pending(); assert.equal(f.calls(), 1); assert.equal(staleCalls, 0);
});
test('shared React child retains committed native callback and reciprocal alternates required', () => {
  const f = flowFixture(); const currentRow = f.rows[1].__reactFiber$fixture;
  const alternateRoot = { tag: 3, stateNode: f.root.stateNode, alternate: f.root }; f.root.alternate = alternateRoot;
  const alternateRow = { memoizedProps: currentRow.memoizedProps, return: alternateRoot, alternate: currentRow, child: currentRow.child }; currentRow.alternate = alternateRow; alternateRoot.child = alternateRow;
  f.submit(); f.pending(); assert.equal(f.calls(), 1);
  const malformed = flowFixture(); malformed.button.__reactFiber$fixture.alternate = { alternate: {} }; malformed.submit(); malformed.pending(); assert.equal(malformed.calls(), 0);
});
test('native disabled control waits for exact current callback rather than another button', () => {
  const f = flowFixture(); f.button.disabled = true; f.submit(); f.pending(); assert.equal(f.calls(), 0); f.button.disabled = false; f.notify(); assert.equal(f.calls(), 1);
});
test('completion requires native accepted state and roll result identity', () => {
  const f = flowFixture(); f.submit(); f.pending();
  const outcome = [...f.context.window.__friendsFablesDesktopCombatFlowOutcomes.values()][0]; assert.equal(outcome.status, 'claimed');
  f.notify(); assert.equal(outcome.status, 'claimed');
  f.choice.accepted = true; f.choice.roll_result_id = 107655730; f.notify(); assert.equal(outcome.status, 'accepted'); assert.equal(outcome.rollResultId, 107655730);
});
test('narration reused for mixed native controls restores rather than hiding them', () => {
  const f = flowFixture({ hide: true }); f.submit(); f.pending(); assert.equal(f.card.style.getPropertyValue('display'), 'none');
  f.card.querySelectorAll = () => [f.button]; f.notify(); assert.equal(f.card.style.getPropertyValue('display'), '');
});
test('malformed native event and bounded history leave manual control available', () => {
  const malformed = flowFixture(); delete malformed.attackEvent.events_roll.dc; malformed.submit(); malformed.pending(); assert.equal(malformed.calls(), 0);
  const old = flowFixture(); old.submit(); for (let n = 0; n < 31; n++) old.rows.push(new old.Element()); old.pending(); assert.equal(old.calls(), 0);
});
test('callback failure restores narration and preserves native manual control without retry', () => {
  const f = flowFixture({ hide: true, failure: true }); f.submit(); f.pending(); f.notify();
  assert.equal(f.card.style.getPropertyValue('display'), ''); assert.equal(f.button.style.getPropertyValue('display'), '');
  assert.equal(f.calls(), 1); f.notify(); assert.equal(f.calls(), 1);
  assert.equal([...f.context.window.__friendsFablesDesktopCombatFlowOutcomes.values()][0].status, 'failed');
});
test('bounded native acceptance timeout restores narration without treating resolved callback as completion', () => {
  const f = flowFixture({ hide: true }); f.submit(); f.pending(); assert.equal(f.card.style.getPropertyValue('display'), 'none');
  const outcome = [...f.context.window.__friendsFablesDesktopCombatFlowOutcomes.values()][0]; f.context.Date = class extends Date { static now() { return super.now() + 120001; } }; f.notify();
  assert.equal(outcome.status, 'unknown'); assert.equal(f.card.style.getPropertyValue('display'), ''); assert.equal(f.button.style.getPropertyValue('display'), '');
  f.notify(); assert.equal(f.calls(), 1);
});
test('asynchronous native rejection restores instructions and cannot be concealed again', async () => {
  const f = flowFixture({ hide: true, reject: true }); f.submit(); f.pending();
  await new Promise(resolve => setImmediate(resolve)); f.notify();
  assert.equal(f.card.style.getPropertyValue('display'), ''); assert.equal(f.calls(), 1);
  f.controls().hide.change(false); f.controls().hide.change(true); f.notify();
  assert.equal(f.card.style.getPropertyValue('display'), ''); assert.equal(f.calls(), 1);
});
test('waits through empty streamed DM response until native Damage choice arrives', () => {
  const f = flowFixture(); f.dmEvent.rollChoices = []; f.submit(); f.pending(); assert.equal(f.calls(), 0);
  f.dmEvent.rollChoices = [f.choice]; f.notify(); assert.equal(f.calls(), 1);
});
test('deep native React tree with30 loaded rows resolves under unchanged work budget', () => {
  const f = flowFixture(); const top = f.root.child;
  let parent = f.root;
  for (let n = 0; n < 120; n++) { const wrapper = { memoizedProps: {}, return: parent }; parent.child = wrapper; parent = wrapper; }
  parent.child = top; f.owner.return = parent;
  const attackFiber = f.rows[0].__reactFiber$fixture, dmFiber = f.rows[1].__reactFiber$fixture;
  attackFiber.return = dmFiber.return = parent;
  const historical = []; let previous = f.owner;
  for (let n = 0; n < 28; n++) {
    const row = new f.Element(); row.id = 'event-container-' + (1000 + n);
    const fiber = { memoizedProps: { event: { id: 1000 + n, campaign_id: 'campaign-a', role: 'dm', request_id: 'historical-' + n, rollChoices: [] }, campaign: f.nativeCampaign }, return: parent };
    previous.sibling = fiber; previous = fiber; row.__reactFiber$fixture = fiber; historical.push(row);
  }
  previous.sibling = attackFiber; attackFiber.sibling = dmFiber;
  f.rows.unshift(...historical);
  const alternateRoot = { tag: 3, stateNode: f.root.stateNode, alternate: f.root }; f.root.alternate = alternateRoot;
  function alternateChildren(currentParent, alternateParent) {
    let prior;
    for (let child = currentParent.child; child; child = child.sibling) {
      const alt = { ...child, child: undefined, sibling: undefined, return: alternateParent, alternate: child }; child.alternate = alt;
      if (prior) prior.sibling = alt; else alternateParent.child = alt; prior = alt;
      alternateChildren(child, alt);
    }
  }
  alternateChildren(f.root, alternateRoot);
  for (const row of f.rows) row.__reactFiber$fixture = row.__reactFiber$fixture.alternate;
  f.button.__reactFiber$fixture = f.button.__reactFiber$fixture.alternate;
  f.submit(); f.pending(); assert.equal(f.calls(), 1, 'Current native callback must survive realistic shared ancestry and bounded loaded history');
});

test('failed preference persistence and malformed saves preserve current ticket and settings',()=>{
 const f=flowFixture();f.submit();
 f.context.localStorage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>f.setPreferences({automaticDamage:false}),/quota/);
 assert.throws(()=>f.controller().setPreferences({...f.preferences(),campaignId:'stale'}));
 assert.throws(()=>f.controller().setPreferences({...f.preferences(),hideIntermediateFranz:'true'}));
 assert.equal(f.preferences().automaticDamage,true);assert.equal(f.unsubscribed(),0);
 f.preferences();f.preferences();assert.equal(f.unsubscribed(),0);
 f.pending();assert.equal(f.calls(),1);
});


test('legacy preferences migrate the new prompt flag off and invalid storage fails closed',()=>{
 const legacy=fixture({automaticDamage:true,hideIntermediateFranz:true});assert.equal(legacy.preferences().hideDamagePrompt,false);
 for(const value of [{automaticDamage:true,hideIntermediateFranz:false,extra:true},{automaticDamage:true,hideIntermediateFranz:false,hideDamagePrompt:'true'}])assert.equal(fixture(value).preferences().automaticDamage,false);
 const f=fixture();assert.throws(()=>f.controller().setPreferences({...f.preferences(),hideDamagePrompt:1}));
 f.controller().setPreferences({campaignId:'campaign-a',automaticDamage:true,hideIntermediateFranz:false});assert.equal(f.preferences().hideDamagePrompt,false);
});
test('prompt hides on local causal claim before acceptance and preserves actual dice and final reply',()=>{
 const f=flowFixture({prompt:true,hidePrompt:true});f.prompt.style.setProperty('display','flex','important');f.submit();f.pending();
 assert.equal(f.prompt.style.getPropertyValue('display'),'none','Owned automatic prompt hides before native acceptance');
 f.choice.accepted=true;f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'none','Owned prompt stays hidden during native rolling');
 f.choice.roll_result_id=107655730;f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'none');
 for(const node of [f.card,f.rows[0],f.rows[1],f.damageResult,f.finalReply])assert.equal(node.style.getPropertyValue('display'),'');
 f.setPreferences({hideIntermediateFranz:true});f.notify();assert.equal(f.card.style.getPropertyValue('display'),'none');assert.equal(f.prompt.style.getPropertyValue('display'),'none');
 f.setPreferences({hideDamagePrompt:false});f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'flex');assert.equal(f.prompt.style.getPropertyPriority('display'),'important');assert.equal(f.card.style.getPropertyValue('display'),'none');
});
test('prompt accepted display restores on auto off, route, encounter, disposal and owner reuse',()=>{
 for(const action of [f=>f.setPreferences({automaticDamage:false}),f=>{f.context.location.pathname='/campaign-b/play';f.notify();},f=>{f.nativeCampaign.active_encounter_id=999;f.notify();},f=>f.install(false),f=>{f.t5.memoizedProps.rollChoice={...f.choice,id:999};f.notify();}]){
  const f=flowFixture({prompt:true,hidePrompt:true});f.prompt.style.setProperty('display','grid','important');f.submit();f.pending();f.choice.accepted=true;f.choice.roll_result_id=107655730;f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'none');
  action(f);assert.equal(f.prompt.style.getPropertyValue('display'),'grid');assert.equal(f.prompt.style.getPropertyPriority('display'),'important');
 }
});
test('historical, failed, unknown, text-based and mixed host choices stay visible without callback replay',async()=>{
 for(const options of [{failure:true},{reject:true},{unrelated:true},{accepted:true},{miss:true}]){
  const f=flowFixture({...options,prompt:true,hidePrompt:true});f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'');f.submit();f.pending();await new Promise(resolve=>setImmediate(resolve));f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'');
 }
 const text=flowFixture({prompt:true,hidePrompt:true});text.attack.requires_attack_roll=false;text.submit();text.pending();assert.equal(text.calls(),0);assert.equal(text.prompt.style.getPropertyValue('display'),'');
 const failed=flowFixture({prompt:true,hidePrompt:true,failure:true});failed.submit();failed.pending();failed.choice.accepted=true;failed.choice.roll_result_id=107655730;failed.notify();assert.equal(failed.prompt.style.getPropertyValue('display'),'');assert.equal([...failed.context.window.__friendsFablesDesktopCombatFlowOutcomes.values()][0].status,'failed');
 const unknown=flowFixture({prompt:true,hidePrompt:true});unknown.submit();unknown.pending();unknown.context.Date=class extends Date{static now(){return super.now()+120001}};unknown.notify();unknown.choice.accepted=true;unknown.choice.roll_result_id=107655730;unknown.notify();assert.equal(unknown.prompt.style.getPropertyValue('display'),'');assert.equal(unknown.calls(),1);
 const mixed=flowFixture({prompt:true,hidePrompt:true});mixed.submit();mixed.pending();mixed.prompt.querySelector=()=>mixed.card;mixed.choice.accepted=true;mixed.choice.roll_result_id=107655730;mixed.notify();assert.equal(mixed.prompt.style.getPropertyValue('display'),'');
});

test('claimed hiding survives presentation absence but rejects a known conflicting request',()=>{
 for(const conflict of [false,true]){
  const f=flowFixture({prompt:true,hide:true,hidePrompt:true});f.submit();f.pending();f.choice.accepted=true;f.choice.roll_result_id=107655730;f.notify();
  const lookup=f.context.document.getElementById,row=f.rows[1];
  f.context.document.getElementById=value=>value===row.id?null:lookup(value);f.notify();
  assert.equal(f.card.style.getPropertyValue('display'),'');assert.equal(f.prompt.style.getPropertyValue('display'),'');
  if(conflict)f.dmEvent.request_id='known-competing-request';
  f.context.document.getElementById=lookup;f.notify();
  assert.equal(f.card.style.getPropertyValue('display'),conflict?'':'none');assert.equal(f.prompt.style.getPropertyValue('display'),conflict?'':'none');assert.equal(f.calls(),1);
  if(conflict){f.dmEvent.request_id='request-new';f.notify();assert.equal(f.card.style.getPropertyValue('display'),'');assert.equal(f.prompt.style.getPropertyValue('display'),'','Positive conflicting authority still invalidates the claim');}
 }
});
test('accepted prompt resolves a replacement committed t5 host and restores detached original',()=>{
 const f=flowFixture({prompt:true,hidePrompt:true});f.submit();f.pending();f.choice.accepted=true;f.choice.roll_result_id=107655730;f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'none');
 const next=new f.Element();next.id='';next.isConnected=true;next.querySelector=()=>null;f.rows[1].append(next);
 const host={tag:5,type:'div',stateNode:next,memoizedProps:{},return:f.t5};next.__reactFiber$fixture=host;f.t5.child=host;f.prompt.isConnected=false;f.notify();
 assert.equal(f.prompt.style.getPropertyValue('display'),'');assert.equal(next.style.getPropertyValue('display'),'none');
 f.install(false);assert.equal(next.style.getPropertyValue('display'),'');
});
test('late asynchronous rejection restores even a previously confirmed prompt and never retries',async()=>{
 const f=flowFixture({prompt:true,hidePrompt:true,reject:true});f.submit();f.pending();f.choice.accepted=true;f.choice.roll_result_id=107655730;f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'none');
 await new Promise(resolve=>setImmediate(resolve));f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'');assert.equal(f.calls(),1);
});

test('native choice waits for causal GM success regardless of Thoughts processing flag', () => {
 for (const processed of [true, false, undefined, null, 'true']) {
  const f = flowFixture({ streaming: true, hide: true }); f.dmEvent.processed=processed;f.submit(); f.pending();
  assert.equal(f.calls(), 0); assert.equal(f.card.style.getPropertyValue('display'), 'none');
  f.notify();assert.equal(f.calls(),0);f.finish();assert.equal(f.calls(),1);
  f.finish(); f.notify(); assert.equal(f.calls(), 1);
 }
});
test('unrelated, malformed and error GM completion leave native choice manual', () => {
 for (const extra of [{status:'error'}, {variables:{requestId:'other',lastEventId:107655713}}, {variables:{requestId:'request-new',lastEventId:999}}, {submittedAt:0}]) {
  const f = flowFixture({streaming:true}); f.submit(); f.pending(); f.dmEvent.processed=true; f.finish(extra); f.notify(); assert.equal(f.calls(),0);
 }
 const error=flowFixture({streaming:true});error.submit();error.pending();error.dmEvent.error='native error';error.finish();assert.equal(error.calls(),0);
});
test('finished native GM request accepts exact scaled Damage while processed remains false', () => {
 const f=flowFixture({streaming:true,crit:true,prompt:true,wrapper:true,hide:true});
 f.choice.dice_expression='6d8+5';f.choice.fixed_bonus=5;f.submit();f.pending();assert.equal(f.calls(),0);
 f.finish();assert.equal(f.dmEvent.processed,false);assert.equal(f.calls(),1);assert.equal(f.passedChoice().dice_expression,'6d8+5');assert.equal(f.passedChoice().fixed_bonus,5);
 f.notify();assert.equal(f.calls(),1);assert.equal(f.prompt.style.getPropertyValue('display'),'');
});
test('captured native grid hides avatar/audio/actions and collapses columns while outcomes remain functional', () => {
 const f=flowFixture({hide:true,prompt:true,wrapper:true});
 f.avatar.style.setProperty('display','flex','important');f.rows[1].style.setProperty('grid-template-columns','40px 1fr 30px');f.middle.style.setProperty('margin-left','16px','important');
 f.submit();f.pending();assert.equal(f.calls(),1);
 for(const node of [f.card,f.avatar,f.actions])assert.equal(node.style.getPropertyValue('display'),'none');
 assert.equal(f.rows[1].style.getPropertyValue('display'),'');assert.equal(f.prompt.style.getPropertyValue('display'),'');
 assert.equal(f.rows[1].style.getPropertyValue('grid-template-columns'),'minmax(0, 1fr)');assert.equal(f.middle.style.getPropertyValue('margin-left'),'0px');
 for(const node of [f.rows[0],f.damageResult,f.finalReply])assert.equal(node.style.getPropertyValue('display'),'');
 f.controls().hide.change(false);assert.equal(f.avatar.style.getPropertyValue('display'),'flex');assert.equal(f.avatar.style.getPropertyPriority('display'),'important');
 assert.equal(f.rows[1].style.getPropertyValue('grid-template-columns'),'40px 1fr 30px');assert.equal(f.middle.style.getPropertyValue('margin-left'),'16px');assert.equal(f.middle.style.getPropertyPriority('margin-left'),'important');
});
test('native grid concealment restores on failure, disposal, encounter switch and host reuse', () => {
 for(const action of [f=>f.install(false),f=>{f.nativeCampaign.active_encounter_id=999;f.notify()},f=>{f.shell.memoizedProps.event={...f.dmEvent,id:999};f.notify()},f=>{f.rowHost.child.return=f.root;f.notify()}]) {
  const f=flowFixture({hide:true,prompt:true,wrapper:true});f.submit();f.pending();assert.equal(f.avatar.style.getPropertyValue('display'),'none');action(f);
  assert.equal(f.avatar.style.getPropertyValue('display'),'');assert.equal(f.actions.style.getPropertyValue('display'),'');assert.equal(f.rows[1].style.getPropertyValue('grid-template-columns'),'');assert.equal(f.middle.style.getPropertyValue('margin-left'),'');
 }
 const f=flowFixture({hide:true,prompt:true,wrapper:true,failure:true});f.submit();f.pending();f.notify();assert.equal(f.avatar.style.getPropertyValue('display'),'');assert.equal(f.card.style.getPropertyValue('display'),'');
});
test('ambiguous wrapper or mixed native choice region never hides avatar/actions', () => {
 for(const change of [f=>{f.shell.type=function Unknown(){return 'event-container-'}},f=>{f.avatar.querySelectorAll=()=>[f.button]},f=>{f.actions.querySelector=()=>f.prompt}]) {
  const f=flowFixture({hide:true,prompt:true,wrapper:true});change(f);f.submit();f.pending();assert.equal(f.calls(),1);
  assert.equal(f.avatar.style.getPropertyValue('display'),'');assert.equal(f.actions.style.getPropertyValue('display'),'');assert.equal(f.rows[1].style.getPropertyValue('grid-template-columns'),'');
 }
});

test('causal streaming narration hides before choice arrival, errors and cancellations restore', () => {
 for(const action of [f=>f.finish({status:'error'}),f=>f.submit(),f=>f.controls().auto.change(false),f=>{f.context.location.pathname='/campaign-b/play';f.notify()}]) {
  const f=flowFixture({streaming:true,hide:true,prompt:true,wrapper:true});f.dmEvent.rollChoices=[];f.submit();f.pending();
  for(const node of [f.card,f.avatar,f.actions])assert.equal(node.style.getPropertyValue('display'),'none');assert.equal(f.calls(),0);assert.equal(f.prompt.style.getPropertyValue('display'),'');
  action(f);f.notify();for(const node of [f.card,f.avatar,f.actions])assert.equal(node.style.getPropertyValue('display'),'');assert.equal(f.calls(),0);
 }
 const f=flowFixture({streaming:true,hide:true,prompt:true,wrapper:true,unrelated:true});f.submit();f.pending();assert.equal(f.card.style.getPropertyValue('display'),'');assert.equal(f.avatar.style.getPropertyValue('display'),'');
});

test('pending causal prompt hides before generation finishes and before the next animation frame',()=>{
 const f=flowFixture({streaming:true,prompt:true,wrapper:true,hide:true,hidePrompt:true});f.submit();f.pending();
 assert.equal(f.calls(),0);assert.equal(f.prompt.style.getPropertyValue('display'),'none');
 f.button.getClientRects=()=>[];f.finish();assert.equal(f.calls(),1,'Concealing the owned prompt must not prevent its native callback');
});
test('pending prehidden prompt restores on cancellation and independent toggles',()=>{
 for(const action of [f=>f.submit(),f=>f.finish({status:'error'}),f=>f.setPreferences({automaticDamage:false}),f=>f.install(false)]){
 const f=flowFixture({streaming:true,prompt:true,hide:true,hidePrompt:true});f.submit();f.pending();assert.equal(f.prompt.style.getPropertyValue('display'),'none');action(f);f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'');}
 const f=flowFixture({streaming:true,prompt:true,hide:true,hidePrompt:true});f.submit();f.pending();f.setPreferences({hideDamagePrompt:false});f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'');assert.equal(f.card.style.getPropertyValue('display'),'none');
});

test('status belongs inside exact hit card and ends at native Damage result mount before final reply',()=>{
 const f=flowFixture({streaming:true,prompt:true,hide:true,hidePrompt:true});f.install(true,'ru');f.submit();f.pending();
 assert.equal(f.attackPanel.children.length,1);assert.equal(f.attackPanel.children[0].textContent,'Бросок урона выполняется…');assert.equal(f.calls(),0);
 f.finish();assert.equal(f.attackPanel.children.length,1);f.choice.accepted=true;f.choice.roll_result_id=107655730;f.notify();assert.equal(f.attackPanel.children.length,1,'Acceptance alone is not dice appearance');
 const row=new f.Element(),card=new f.Element();row.id='event-container-undefined';card.id='event-message-card-107655730';row.append(card);row.resultCard=card;
 const fiber={memoizedProps:{event:{id:107655730,campaign_id:'campaign-a',character_id:f.character.id,events_roll:{roll_type:'Damage'}}},return:f.root};f.rows[1].__reactFiber$fixture.sibling=fiber;row.__reactFiber$fixture=fiber;const host={memoizedProps:{},return:fiber};fiber.child=host;card.__reactFiber$fixture=host;f.rows.push(row);f.notify();
 assert.equal(f.attackPanel.children.length,0);assert.equal(f.finalReply.style.getPropertyValue('display'),'');f.notify();assert.equal(f.attackPanel.children.length,0);
});
test('status absent for manual misses and unrelated flows, restores on failure and cancellation',()=>{
 for(const options of [{miss:true},{failure:true}]){const f=flowFixture(options);f.submit();f.pending();f.notify();assert.equal(f.attackPanel.children.length,0);}
 const manual=flowFixture({unrelated:true});manual.notify();assert.equal(manual.attackPanel.children.length,0);
 for(const action of [f=>f.submit(),f=>f.setPreferences({automaticDamage:false}),f=>f.install(false),f=>{f.context.location.pathname='/campaign-b/play';f.notify()}]){const f=flowFixture({streaming:true});f.submit();f.pending();assert.equal(f.attackPanel.children.length,1);action(f);f.notify();assert.equal(f.attackPanel.children.length,0);}
});

test('fully concealed intermediate contributes no outer event slot; native result sibling prevents collapse',()=>{
 const f=flowFixture({streaming:true,prompt:true,wrapper:true,hide:true,hidePrompt:true});
 f.damageResult.remove();f.finalReply.remove();const outer=new f.Element();outer.id='event-'+f.dmEvent.id;outer.append(f.rows[1]);f.submit();f.pending();
 assert.equal(f.rows[1].style.getPropertyValue('display'),'none');assert.equal(outer.style.getPropertyValue('display'),'none');
 f.middle.append(f.damageResult);f.notify();assert.equal(f.rows[1].style.getPropertyValue('display'),'');assert.equal(outer.style.getPropertyValue('display'),'');
 f.setPreferences({hideDamagePrompt:false});f.notify();assert.equal(f.prompt.style.getPropertyValue('display'),'');assert.equal(f.card.style.getPropertyValue('display'),'none');
});

test('native void mutation failure restores owned presentation immediately and never autoretries',()=>{
 const f=flowFixture({voidMutation:true,prompt:true,wrapper:true,hide:true,hidePrompt:true});f.damageResult.remove();f.finalReply.remove();f.submit();f.pending();
 assert.equal(f.calls(),1);assert.equal(f.prompt.style.getPropertyValue('display'),'none');assert.equal(f.rows[1].style.getPropertyValue('display'),'none');assert.equal(f.attackPanel.children.length,1);
 f.damageFailure();assert.equal(f.prompt.style.getPropertyValue('display'),'');assert.equal(f.rows[1].style.getPropertyValue('display'),'');assert.equal(f.card.style.getPropertyValue('display'),'');assert.equal(f.attackPanel.children.length,0);f.notify();assert.equal(f.calls(),1);
 assert.equal([...f.context.window.__friendsFablesDesktopCombatFlowOutcomes.values()][0].status,'failed');
});
test('native void mutation stale or unrelated error cannot restore another automatic prompt',()=>{
 for(const patch of [{submittedAt:0},{variables:{rollChoice:{id:999},campaign:{id:'campaign-a'},rollCharacter:{id:83026155}}},{variables:{rollChoice:null,campaign:{id:'campaign-a'},rollCharacter:{id:83026155}}}]){
 const f=flowFixture({voidMutation:true,prompt:true,hidePrompt:true});f.submit();f.pending();f.damageFailure(patch);assert.equal(f.prompt.style.getPropertyValue('display'),'none');assert.equal(f.calls(),1);}
});

test('ambiguous native mutation observers fail closed and valid choice errors stay scoped',()=>{
 const f=flowFixture({voidMutation:true,prompt:true,hidePrompt:true});
 f.t5.memoizedState.next={memoizedState:{...f.damageObserver,subscribe(){return()=>{}}}};f.submit();f.pending();f.damageFailure();
 assert.equal(f.prompt.style.getPropertyValue('display'),'none','Two exact mutation owners are ambiguous');
 const other=flowFixture({voidMutation:true,prompt:true,hidePrompt:true});other.submit();other.pending();const variables={...other.damageState().variables,rollCharacter:{id:999}};other.damageFailure({variables});
 assert.equal(other.prompt.style.getPropertyValue('display'),'none');
});

function mountDamageWithLaggingProps(f, resultId) {
 const outer=new f.Element(),row=new f.Element(),card=new f.Element(),panel=new f.Element();
 outer.id='event-'+resultId;row.id='event-container-undefined';card.id='event-message-card-'+resultId;outer.append(row);row.append(card);card.append(panel);row.resultCard=card;
 card.closest=selector=>selector==='[id="event-'+resultId+'"]'?outer:null;card.querySelectorAll=selector=>selector==='div.relative.rounded-2xl.border-2.overflow-hidden'?[panel]:[];
 f.rows.push(row);return {outer,row,card,panel};
}
test('exact native result DOM ends progress before result Fiber props publish',()=>{
 const f=flowFixture({prompt:true,hide:true,hidePrompt:true});f.submit();f.pending();f.choice.accepted=true;f.choice.roll_result_id=107655730;f.notify();
 assert.equal(f.attackPanel.children.length,1,'Accepted choice without visible dice retains progress');
 mountDamageWithLaggingProps(f,107655730);f.notify();assert.equal(f.attackPanel.children.length,0,'Exact owned dice DOM ends status in mutation microtask, without result Fiber props');
});
test('ancestor native event collection supplies exact accepted result before per-row choice props',()=>{
 const f=flowFixture({prompt:true,hide:true,hidePrompt:true});f.submit();f.pending();assert.equal(f.choice.accepted,null);
 f.root.memoizedProps={events:[{...f.dmEvent,rollChoices:[{...f.choice,accepted:true,roll_result_id:107655730}]}]};
 mountDamageWithLaggingProps(f,107655730);f.notify();assert.equal(f.choice.accepted,null,'Per-row choice stays delayed');assert.equal(f.attackPanel.children.length,0);
});
test('unrelated or unknown-ID native dice never terminate owned pending status',()=>{
 const f=flowFixture({prompt:true,hidePrompt:true});f.submit();f.pending();mountDamageWithLaggingProps(f,999);f.notify();assert.equal(f.attackPanel.children.length,1);
 f.root.memoizedProps={events:[{...f.dmEvent,request_id:'other',rollChoices:[{...f.choice,accepted:true,roll_result_id:999}]}]};f.notify();assert.equal(f.attackPanel.children.length,1);
 f.root.memoizedProps={events:[{...f.dmEvent,rollChoices:[{...f.choice,accepted:true,roll_result_id:107655730}]}]};f.notify();assert.equal(f.attackPanel.children.length,1,'Unrelated dice DOM cannot terminate exact different result');
});

test('exact result ID still requires native dice card mount and conflicting collection IDs fail closed',()=>{
 const f=flowFixture({prompt:true,hidePrompt:true});f.submit();f.pending();
 f.root.memoizedProps={events:[{...f.dmEvent,rollChoices:[{...f.choice,accepted:true,roll_result_id:107655730}]},{...f.dmEvent,rollChoices:[{...f.choice,accepted:true,roll_result_id:107655731}]}]};
 const mounted=mountDamageWithLaggingProps(f,107655730);f.notify();assert.equal(f.attackPanel.children.length,1,'Conflicting accepted results cannot establish ownership');
 f.root.memoizedProps.events.pop();mounted.card.querySelectorAll=()=>[];f.notify();assert.equal(f.attackPanel.children.length,1,'Exact ID with no native dice panel retains waiting status');
 mounted.card.querySelectorAll=()=>[mounted.panel];mounted.card.closest=()=>null;f.notify();assert.equal(f.attackPanel.children.length,1,'Unknown outer event wrapper retains waiting status');
});

const nativeDamageRoll={totalRoll:3,baseRoll:3,rollType:'Damage',modifierStat:'strength',modifierValue:0,baseRollsArray:[3],dice:[8],proficiencyBonus:0,vantage:'normal'};
function pendingNativeFixture(){const f=flowFixture({voidMutation:true,nativeRollResult:{...nativeDamageRoll},prompt:true,wrapper:true,hide:true,hidePrompt:true});f.choice.dc=12;f.character.profile_id='native-profile';return f;}
function freshNativeDamage(f,id=107655740){return {id,request_id:'native-damage-request-'+id,role:'player',command_used:'roll',campaign_id:'campaign-a',character_id:f.character.id,profile_id:f.character.profile_id,created_at:new Date(Date.now()+10).toISOString(),events_roll:{event_id:id,campaign_id:'campaign-a',roll_type:'Damage',total_roll:3,base_roll:3,modifier_stat:'strength',modifier_value:0,base_rolls_array:[3],dice:[8],proficiency_bonus:0,vantage:'normal',dc:12,message:null}};}
function publishNativeDamage(f,events){f.root.memoizedProps={events:[f.attackEvent,f.dmEvent,...events]};for(const event of events)mountDamageWithLaggingProps(f,event.id);f.notify();}
test('native exact pending roll stops progress at first dice DOM before any choice result-ID publication',()=>{
 const f=pendingNativeFixture();f.submit();f.pending();assert.equal(f.calls(),1);assert.equal(f.attackPanel.children.length,1);
 const outcome=[...f.context.window.__friendsFablesDesktopCombatFlowOutcomes.values()][0];publishNativeDamage(f,[freshNativeDamage(f)]);
 assert.equal(f.choice.accepted,null);assert.equal(f.choice.roll_result_id,undefined);assert.equal(outcome.status,'claimed');assert.equal(outcome.rollResultId,undefined,'UI fingerprint must not forge native result-ID acceptance');
 assert.equal(f.damageState().status,'pending');assert.equal(f.attackPanel.children.length,0,'First native dice mount removes status before choice/GM completion');assert.equal(f.prompt.style.getPropertyValue('display'),'none');assert.equal(f.calls(),1);
 f.damageFailure();assert.equal(f.prompt.style.getPropertyValue('display'),'','Late exact backend failure still restores retry after dice start');assert.equal(f.calls(),1);
});
test('pending native dice matching rejects unrelated fields, scope, stale identity and malformed results',()=>{
 const changes=[e=>e.events_roll.total_roll++,e=>e.events_roll.base_roll++,e=>e.events_roll.base_rolls_array=[4],e=>e.events_roll.dice=[10],e=>e.events_roll.modifier_stat='charisma',e=>e.events_roll.modifier_value++,e=>e.events_roll.proficiency_bonus++,e=>e.events_roll.vantage='advantage',e=>e.events_roll.dc++,e=>e.events_roll.message='manual',e=>e.events_roll.roll_type='Heal',e=>e.events_roll.event_id++,e=>e.events_roll.campaign_id='other',e=>e.character_id++,e=>e.campaign_id='other',e=>e.profile_id='other',e=>e.command_used='roll_attack',e=>e.role='dm',e=>e.request_id=fixedAttackRequest,e=>e.created_at='2000-01-01T00:00:00Z'];
 const fixedAttackRequest='request-new';
 for(const change of changes){const f=pendingNativeFixture();f.submit();f.pending();const event=freshNativeDamage(f);change(event);publishNativeDamage(f,[event]);assert.equal(f.attackPanel.children.length,1);assert.equal(f.calls(),1);}
 const stale=pendingNativeFixture();stale.submit();stale.pending();stale.damageState().submittedAt=0;publishNativeDamage(stale,[freshNativeDamage(stale)]);assert.equal(stale.attackPanel.children.length,1);
});
test('native pending roll excludes baseline results and refuses competing same-character new events',()=>{
 const old=pendingNativeFixture(),history=freshNativeDamage(old);publishNativeDamage(old,[history]);old.submit();old.pending();old.notify();assert.equal(old.attackPanel.children.length,1,'Already loaded exact dice are never this invocation');
 for(const matching of [true,false]){const f=pendingNativeFixture();f.submit();f.pending();const own=freshNativeDamage(f),competing=freshNativeDamage(f,107655741);if(!matching)competing.events_roll.total_roll++;publishNativeDamage(f,[own,competing]);assert.equal(f.attackPanel.children.length,1,'Multiple newly published own-character events are ambiguous');}
 const multiple=pendingNativeFixture();multiple.t5.memoizedState.next={memoizedState:{...multiple.damageObserver,subscribe(){return()=>{}}}};multiple.submit();multiple.pending();publishNativeDamage(multiple,[freshNativeDamage(multiple)]);assert.equal(multiple.attackPanel.children.length,1,'Two pending native observers are ambiguous');
});

// Actual captured INSERT factory through public controller lifecycle. Fake Fiber
// provides ownership only; native paint is covered separately by the smoke model.
const {nativeFactory,createNativeEventQuery}=require('./fixtures/native-event-query.cjs');
function continuityFixture(){
 const f=flowFixture();Object.assign(f.attackEvent,{character:{...f.character,name:'Fixture character',image:null},command_used:'roll_damage',created_at:'2026-10-20T00:00:00Z'});
 f.attackEvent.events_roll={event_id:f.attackEvent.id,campaign_id:'campaign-a',roll_type:'Damage',base_roll:8,base_rolls_array:[8],dice:[8],total_roll:8,modifier_stat:'strength',modifier_value:0,proficiency_bonus:0,vantage:'normal'};
 const query=createNativeEventQuery(nativeFactory,'campaign-a',[f.attackEvent,f.dmEvent]);
 const original=query.client.setQueryData,descriptor=Object.getOwnPropertyDescriptor(query.client,'setQueryData');
 const provider={tag:10,memoizedProps:{value:query.client},return:f.root,child:f.root.child};for(let child=provider.child;child;child=child.sibling)child.return=provider;f.root.child=provider;
 const list=new f.Element();list.id='events-list';list.append(...f.rows);for(const row of f.rows)row.closest=selector=>selector==='#events-list'?list:null;
 f.context.document.querySelector=selector=>selector==='#events-list'?list:f.dock;f.notify();
 return {f,query,original,descriptor,insert:event=>query.exports.insertEventIntoQueryData({queryClient:query.client,campaignId:'campaign-a',newEvent:event})};
}
test('native INSERT relation continuity through current provider and controller lifecycle',()=>{
 const crypto=require('node:crypto');assert.equal(crypto.createHash('sha256').update(nativeFactory.toString()).digest('hex'),'755b0dd7c840984fc2f93316701142f0a0da106557b89521a051af85327c6e91');
 const {f,query,insert}=continuityFixture();assert.equal(query.events()[0],f.attackEvent,'Native row event is exact querycache object');
 const oldRoll=f.attackEvent.events_roll;insert({...f.attackEvent,content:'incoming content remains authoritative',events_roll:null});
 assert.equal(query.writes.length,1,'Native updater executes once');
 assert.equal(query.events()[0].content,'incoming content remains authoritative');
 assert.equal(query.events()[0].events_roll,oldRoll,'Recognized duplicate native INSERT must retain already observed complete roll');
 assert.equal(f.attackEvent.events_roll,oldRoll,'Previous cache object is not mutated');
});
test('continuity boundary preserves authoritative clear, deletion, direct data and unknown updater semantics',()=>{
 for(const operation of ['update','delete','direct','unknown']){
  const {f,query}=continuityFixture(),incoming={...f.attackEvent,events_roll:null};
  if(operation==='update')query.exports.updateEventInQueryData({queryClient:query.client,campaignId:'campaign-a',newEvent:incoming});
  if(operation==='delete')query.client.setQueryData(query.key,data=>({...data,pages:data.pages.map(page=>({...page,data:page.data.filter(event=>event.id!==incoming.id)}))}));
  if(operation==='direct')query.client.setQueryData(query.key,{pages:[{data:[incoming]}],pageParams:[]});
  if(operation==='unknown')query.client.setQueryData(query.key,data=>({...data,pages:[{data:[incoming]}]}));
  if(operation==='delete')assert.equal(query.events().some(event=>event.id===incoming.id),false);else assert.equal(query.events()[0].events_roll,null,operation);
  assert.equal(query.writes.length,1);
 }
});
test('continuity refuses changed immutable ownership and accepts complete incoming rolls',()=>{
 for(const patch of [{id:null},{campaign_id:'other'},{character_id:99},{role:'dm'},{command_used:'talk'},{request_id:'other'},{created_at:'2026-10-21T00:00:00Z'}]){
  const {f,query,insert}=continuityFixture();const incoming={...f.attackEvent,...patch,events_roll:null};insert(incoming);
  assert.equal(query.events().some(event=>event===incoming&&event.events_roll===null),true,JSON.stringify(patch));
 }
 const {f,query,insert}=continuityFixture(),roll={...f.attackEvent.events_roll,total_roll:9};insert({...f.attackEvent,events_roll:roll});assert.equal(query.events()[0].events_roll,roll);
});
test('unrecognized updater preserves receiver, options, return, exception and exactly-once invocation',()=>{
 const {query}=continuityFixture(),options={updatedAt:123};let calls=0;const updater=data=>{calls++;return data};
 const returned=query.client.setQueryData(query.key,updater,options);assert.equal(calls,1);assert.equal(returned,query.client.getQueryData(query.key));
 assert.equal(query.writes[0].receiver,query.client);assert.equal(query.writes[0].options,options);
 const error=Error('native updater failure');assert.throws(()=>query.client.setQueryData(query.key,()=>{calls++;throw error}),value=>value===error);assert.equal(calls,2);
});
test('continuity lifecycle restores own method descriptor on disable, route and dispose',()=>{
 for(const action of ['disable','route','dispose']){const {f,query,original,descriptor}=continuityFixture();
  if(action==='disable')f.setPreferences({automaticDamage:false});
  if(action==='route'){f.context.location.pathname='/campaign-b/play';f.notify();}
  if(action==='dispose')f.install(false);
  assert.equal(query.client.setQueryData,original,action);assert.deepEqual(Object.getOwnPropertyDescriptor(query.client,'setQueryData'),descriptor,action);
 }
});

test('other campaign/client writes and malformed existing rolls remain untouched',()=>{
 const {f,query}=continuityFixture();
 const other=createNativeEventQuery(nativeFactory,'campaign-a',[f.attackEvent]);other.exports.insertEventIntoQueryData({queryClient:other.client,campaignId:'campaign-a',newEvent:{...f.attackEvent,events_roll:null}});assert.equal(other.events()[0].events_roll,null);
 query.client.setQueryData(['events','other'],{pages:[{data:[f.attackEvent]}],pageParams:[]});query.exports.insertEventIntoQueryData({queryClient:query.client,campaignId:'other',newEvent:{...f.attackEvent,events_roll:null}});assert.equal(query.client.getQueryData(['events','other']).pages[0].data[0].events_roll,null);
 for(const roll of [null,{roll_type:'Damage',base_roll:NaN},{}]){const fresh=continuityFixture();fresh.f.attackEvent.events_roll=roll;fresh.insert({...fresh.f.attackEvent,events_roll:null});assert.equal(fresh.query.events()[0].events_roll,null);}
});
test('dispose preserves a later independent instance method wrapper',()=>{
 const {f,query}=continuityFixture();const ours=query.client.setQueryData;const later=function(...args){return ours.apply(this,args)};query.client.setQueryData=later;f.install(false);assert.equal(query.client.setQueryData,later);
});
