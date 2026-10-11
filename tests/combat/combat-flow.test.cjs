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
  const context = { HTMLFormElement: Element, module: { exports: {} }, Element, window: { setInterval() { return 1; }, clearInterval() {}, addEventListener() {}, removeEventListener() {} }, location: { pathname: '/campaign-a/play' }, localStorage: { getItem(k) { return savedMap.get(k) ?? null; }, setItem(k, v) { savedMap.set(k, v); } }, document: { addEventListener(k, fn) { documentListeners[k] = fn; }, removeEventListener(k) { delete documentListeners[k]; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement(tag) { return new Element(tag); }, documentElement: new Element(), querySelector() { return dock; } }, requestAnimationFrame(fn) { frame = fn; return 1; }, cancelAnimationFrame() { frame = undefined; }, MutationObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() {} } };
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
  assert.deepEqual(JSON.parse(JSON.stringify(f.preferences())), {campaignId:'campaign-a',automaticDamage:false,hideIntermediateFranz:false});
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
 assert.deepEqual(JSON.parse(f.savedMap.get('ff-desktop-combat-flow-v1:campaign-a')),{automaticDamage:false,hideIntermediateFranz:false});
 assert.deepEqual(JSON.parse(f.savedMap.get('ff-desktop-combat-flow-v1:campaign-b')),{automaticDamage:true,hideIntermediateFranz:false});
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
  const f = fixture({ automaticDamage: true, hideIntermediateFranz: !!options.hide });
  const { Element, root, form, formFiber, context } = f;
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
  const dmEvent = { id: 107655722, role: 'dm', request_id: options.unrelated ? 'request-other' : request, campaign_id: 'campaign-a', command_used: 'encounter_player_turn_action_response', rollChoices: [choice] };
  const attackRow = new Element(), dmRow = new Element(), button = new Element('button');
  attackRow.id = 'event-container-undefined'; dmRow.id = 'event-container-107655722'; dmRow.append(button);
  button.isConnected = true; button.disabled = false; button.matches = () => false; button.getClientRects = () => [{}];
  const nativeCampaign = { id: 'campaign-a', active_encounter_id: 412456 };
  const rowFiber = { memoizedProps: { event: dmEvent, campaign: nativeCampaign }, return: root };
  const t5 = { memoizedProps: { rollChoice: choice, campaignId: 'campaign-a', usersCharacter: character }, return: rowFiber };
  const callback = function nativeQuickRoll(event) { event.stopPropagation(); const dice_expression = choice.dice_expression; passedChoice = { ...choice, dice_expression }; calls++; if (options.failure) throw Error('native unknown outcome'); if (options.reject) return Promise.reject(Error('native async unknown outcome')); };
  const buttonFiber = { memoizedProps: { onClick: callback }, return: t5 }; t5.child = buttonFiber; rowFiber.child = t5; button.__reactFiber$fixture = buttonFiber;
  dmRow.__reactFiber$fixture = rowFiber; attackRow.__reactFiber$fixture = { memoizedProps: { event: attackEvent, campaign: nativeCampaign }, return: root };
  owner.sibling = attackRow.__reactFiber$fixture; attackRow.__reactFiber$fixture.sibling = rowFiber;
  const card = new Element(); card.id = 'event-message-card-107655722'; dmRow.append(card);
  const cardOwner = { type: function NativeNarrativeCard() { return 'event-message-card-'; }, memoizedProps: { eventId: dmEvent.id }, return: rowFiber };
  card.__reactFiber$fixture = { memoizedProps: { id: card.id }, return: cardOwner }; cardOwner.child = card.__reactFiber$fixture; t5.sibling = cardOwner;
  card.querySelectorAll = () => [];
  dmRow.querySelectorAll = selector => selector === 'button' ? [button] : selector === '[id^="event-message-card-"]' ? [card] : [];
  context.document.getElementById = value => value === dmRow.id ? dmRow : null;
  const rows = [attackRow, dmRow]; context.document.querySelectorAll = () => rows;
  return { ...f, observer, owner, character, attack, choice, dmEvent, attackEvent, button, t5, rows, card, nativeCampaign, result: () => result, calls: () => calls, passedChoice: () => passedChoice, unsubscribed: () => unsubscribed,
    submit(trusted = true) { f.documentListeners.submit({ isTrusted: trusted, target: form }); },
    pending(extra = {}) { result = { status: 'pending', submittedAt: Date.now() + 1, variables: { requestId: request, lastEventId: attackEvent.id, isMultiplayer: true }, ...extra }; listener?.(result); f.notify(); },
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
