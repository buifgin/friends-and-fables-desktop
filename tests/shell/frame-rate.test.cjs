const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('esbuild');

const sourcePath = path.join(__dirname, '../../src/shell/frame-rate.ts');
function loadConfigure(page) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const { code } = transformSync(source, { loader: 'ts', format: 'cjs' });
  const module = { exports: {} };
  new Function('module', 'exports', 'window', 'document', code)(module, module.exports, page.window, page.document);
  return module.exports.configureFrameRateOverlay;
}

function makePage() {
  const callbacks = new Map();
  const listeners = new Map();
  let nextId = 1;
  const children = [];
  const body = {
    appendChild(node) { children.push(node); node.parentNode = body; return node; },
    removeChild(node) { const i = children.indexOf(node); if (i >= 0) children.splice(i, 1); node.parentNode = null; },
  };
  const document = {
    hidden: false,
    body,
    createElement() {
      const node = { style: { cssText: '' }, textContent: '', parentNode: null, setAttribute() {}, remove() { this.parentNode?.removeChild(this); } };
      return node;
    },
    addEventListener(type, fn) { const set = listeners.get(type) || new Set(); set.add(fn); listeners.set(type, set); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  };
  const window = {
    document,
    location: { origin: 'https://play.fables.gg' },
    requestAnimationFrame(fn) { const id = nextId++; callbacks.set(id, fn); return id; },
    cancelAnimationFrame(id) { callbacks.delete(id); },
  };
  window.top = window;
  return {
    window, document, children, callbacks, listeners,
    paint(timestamp) { const [id, fn] = callbacks.entries().next().value || []; assert.ok(fn, 'a frame should be scheduled'); callbacks.delete(id); fn(timestamp); },
    visibility(hidden) { document.hidden = hidden; for (const fn of listeners.get('visibilitychange') || []) fn(); },
  };
}

test('serialized overlay measures 120Hz, reports jank, and caps retained samples', () => {
  const page = makePage();
  const configure = loadConfigure(page);
  configure(true);
  assert.equal(page.children.length, 1);
  const overlay = page.children[0];
  assert.match(overlay.textContent, /warming/i);
  assert.match(overlay.textContent, /page frame/i);
  for (let i = 0; i <= 150; i++) page.paint(i * (1000 / 120));
  assert.match(overlay.textContent, /120\s*FPS/i);
  assert.match(overlay.textContent, /8\.3\s*ms/i);
  for (let i = 1; i <= 10; i++) page.paint(1250 + i * 30);
  assert.match(overlay.textContent, /p95/i);
  assert.match(overlay.textContent, /30\.0\s*ms/i);
  for (let i = 1; i <= 650; i++) page.paint(1550 + i * 0.5);
  assert.equal(page.window.__ffFrameRateOverlay.samples.length, 600);
});

test('enable is idempotent, hidden pages pause and restart fresh, and disable fully cleans up', () => {
  const page = makePage();
  const configure = loadConfigure(page);
  configure(true);
  const overlay = page.children[0];
  const firstFrame = [...page.callbacks.keys()][0];
  configure(true);
  assert.equal(page.children.length, 1);
  assert.equal(page.callbacks.size, 1);
  assert.equal([...page.callbacks.keys()][0], firstFrame);
  page.paint(0);
  page.visibility(true);
  assert.equal(page.callbacks.size, 0);
  assert.match(overlay.textContent, /warming/i);
  page.visibility(false);
  assert.equal(page.callbacks.size, 1);
  configure(false);
  assert.equal(page.children.length, 0);
  assert.equal(page.callbacks.size, 0);
  assert.equal(page.listeners.get('visibilitychange').size, 0);
  assert.equal(page.window.__ffFrameRateOverlay, undefined);
  configure(false);
  assert.equal(page.children.length, 0);
});

test('enable is restricted to the top-level play origin', () => {
  const topLevelWrongOrigin = makePage();
  topLevelWrongOrigin.window.location.origin = 'https://example.com';
  loadConfigure(topLevelWrongOrigin)(true);
  assert.equal(topLevelWrongOrigin.children.length, 0);
  assert.equal(topLevelWrongOrigin.callbacks.size, 0);

  const embedded = makePage();
  embedded.window.top = {};
  loadConfigure(embedded)(true);
  assert.equal(embedded.children.length, 0);
  assert.equal(embedded.callbacks.size, 0);
});
