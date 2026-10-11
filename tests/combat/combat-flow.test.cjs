const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');
const source = esbuild.transformSync(fs.readFileSync(require('node:path').join(__dirname, '../../src/combat/combat-flow.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
function fixture(saved) {
  class Element {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attributes = new Map(); this.listeners = {}; this.parentElement = null; this.style = { cssText: '', setProperty() {}, removeProperty() {} }; }
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
  const context = { module: { exports: {} }, Element, window: { setInterval() { return 1; }, clearInterval() {}, addEventListener() {}, removeEventListener() {} }, location: { pathname: '/campaign-a/play' }, localStorage: { getItem(k) { return savedMap.get(k) ?? null; }, setItem(k, v) { savedMap.set(k, v); } }, document: { createElement(tag) { return new Element(tag); }, documentElement: new Element(), querySelector() { return dock; } }, requestAnimationFrame(fn) { frame = fn; return 1; }, cancelAnimationFrame() { frame = undefined; }, MutationObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() {} } };
  vm.runInNewContext(source, context);
  // Production injects only function.toString(), with no CommonJS helpers.
  const injected = context.module.exports.configureCombatFlow.toString();
  delete context.module;
  context.configure = vm.runInNewContext(`(${injected})`, context);
  const flush = () => { const callback = frame; frame = undefined; callback?.(); };
  const install = (enabled = true, locale = 'en') => { context.configure(enabled, locale); flush(); };
  const notify = () => { observer([{ target: form }]); flush(); };
  install();
  const controls = () => { const ui = dock.children.find(n => n.tagName === 'fieldset'); return { ui, auto: ui?.children[1].children[0], hide: ui?.children[2].children[0] }; };
  return { context, dock, form, root, formFiber, savedMap, controls, install, notify };
}
test('exactly two default-off campaign controls outside native form', () => {
  const f = fixture(), { ui, auto, hide } = f.controls();
  assert.equal(ui.parentElement, f.dock); assert.equal(f.form.children.length, 0);
  assert.equal(auto.type, 'checkbox'); assert.equal(hide.type, 'checkbox');
  assert.equal(auto.checked, false); assert.equal(hide.checked, false); assert.equal(hide.disabled, true);
});
test('saved malformed and dependent settings fail closed', () => {
  for (const value of [{ automaticDamage: false, hideIntermediateFranz: true }, { automaticDamage: 'true', hideIntermediateFranz: true }, null]) {
    const { auto, hide } = fixture(value).controls(); assert.equal(auto.checked, false); assert.equal(hide.checked, false); assert.equal(hide.disabled, true);
  }
});
test('toggle roundtrip is campaign-local and auto off clears hide', () => {
  const f = fixture(), c = f.controls(); c.auto.change(true); c.hide.change(true);
  assert.deepEqual(JSON.parse(f.savedMap.get('ff-desktop-combat-flow-v1:campaign-a')), { automaticDamage: true, hideIntermediateFranz: true });
  c.auto.change(false); assert.equal(c.hide.checked, false); assert.equal(c.hide.disabled, true);
  f.context.location.pathname = '/campaign-b/play'; f.notify();
  assert.equal(f.controls().auto.checked, false); f.controls().auto.change(true);
  assert.deepEqual(JSON.parse(f.savedMap.get('ff-desktop-combat-flow-v1:campaign-a')), { automaticDamage: false, hideIntermediateFranz: false });
  assert.deepEqual(JSON.parse(f.savedMap.get('ff-desktop-combat-flow-v1:campaign-b')), { automaticDamage: true, hideIntermediateFranz: false });
});
test('update localization and dispose retain native form identity', () => {
  const f = fixture(); f.install(true, 'ru'); assert.match(f.controls().ui.children[0].textContent, /Автоматизация/);
  f.install(false); assert.equal(f.controls().ui, undefined); assert.equal(f.dock.children[0], f.form);
  assert.equal(f.context.window.__friendsFablesDesktopCombatFlow, undefined);
});
test('detached/uncommitted form and noncampaign routes remove controls', () => {
  const f = fixture(); f.root.stateNode.current = {}; f.notify(); assert.equal(f.controls().ui, undefined);
  f.root.stateNode.current = f.root; f.notify(); assert.ok(f.controls().ui);
  f.context.location.pathname = '/campaign-a/settings'; f.notify(); assert.equal(f.controls().ui, undefined);
});
test('duplicate configuration does not create duplicate controls', () => {
  const f = fixture({ automaticDamage: true, hideIntermediateFranz: true }); f.install(); f.install(); f.notify();
  assert.equal(f.dock.children.filter(n => n.tagName === 'fieldset').length, 1); assert.equal(f.controls().hide.checked, true);
});
