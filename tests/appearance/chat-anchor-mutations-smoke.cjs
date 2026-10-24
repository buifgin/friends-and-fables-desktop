// ROOT-scheduled CPU-native regression; ordinary Node verifies injection syntax only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = process.env.FABLES_TEST_APP_ROOT || path.resolve(__dirname, '../..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function prepare(lowerCap = false) {
  const filename = path.join(root, 'dist/appearance/chat-appearance.js');
  const { configureChatAppearance } = require(filename);
  const { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
  let source = configureChatAppearance.toString();
  const functionSHA256 = sha(source);
  const capBoundary = 'const scrollMutationLimit = 128;';
  const capSupported = source.includes(capBoundary);
  if (lowerCap && capSupported) {
    assert.equal(source.split(capBoundary).length - 1, 1, 'Unique finite-cap seam');
    source = source.replace(capBoundary, 'const scrollMutationLimit = 1;');
  }
  const once = (text, before, after) => { assert.equal(text.split(before).length - 1, 1, `Unique boundary: ${before}`); return text.replace(before, after); };
  const scope = (begin, end, edit) => {
    const start = source.indexOf(begin), stop = source.indexOf(end, start + begin.length);
    assert(start >= 0 && stop > start, `Scope ${begin}`);
    const original = source.slice(start, stop); source = once(source, original, edit(original));
  };
  source = once(source, 'function preferScrollAnchor() {', `function preferScrollAnchor() {
    const __g=window.__anchorMeasure,__pass=[1,__g.bucket,__g.origin,0,0];__g.origin=0;
    try {`);
  scope('function preferScrollAnchor()', 'function rebaseScrollAnchor()', text => {
    text = once(text, 'const r = card.getBoundingClientRect(); return r.height', 'const r = card.getBoundingClientRect(); __pass[3]++; return r.height');
    text = once(text, 'const desired = new Set();', 'const desired = new Set(); __pass[4]=preferred ? Number(preferred.id.slice(19)) : -1;');
    const end = text.lastIndexOf('}'); assert(end > 0);
    return text.slice(0, end) + '} finally { __g.push(__pass); }' + text.slice(end);
  });
  scope('function feedScrolled(event)', 'function scrollFinished(event)', text => once(text, 'preferScrollAnchor();', 'window.__anchorMeasure.origin=1; preferScrollAnchor();'));
  scope('function scrollMutations(records)', 'function outside(event)', text => {
    text = once(text, 'function scrollMutations(records) {', `function scrollMutations(records) {
      window.__anchorMeasure.process(records);`);
    return once(text, 'preferScrollAnchor();', 'window.__anchorMeasure.origin=2; preferScrollAnchor();');
  });
  source = once(source, 'function snapshotMessages(cards, changedBodies = new Set()) {', 'function snapshotMessages(cards, changedBodies = new Set()) { window.__anchorMeasure.snapshots++;');
  source = once(source, 'function scan() {', 'function scan() { window.__anchorMeasure.scans++;');
  source = once(source, 'const observer = new MutationObserver(records => {', `const observer = new MutationObserver(records => {
    window.__anchorMeasure.delivered+=records.length;`);
  new vm.Script(`(${source})`); new vm.Script(`(${scenario.toString()})`);
  return { source, capSupported, settings: { ...DEFAULT_APPEARANCE, messages: { ...DEFAULT_APPEARANCE.messages, enabled: true } },
    metadata: { root, functionSHA256, compiledSHA256: sha(fs.readFileSync(filename)), injectedSHA256: sha(source), fixtureSHA256: sha(fs.readFileSync(__filename)),
      capSupported, loweredCap: lowerCap && capSupported } };
}
async function scenario(source, settings, selected = 'all') {
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { for (let index = 0; index < 8; index++) await frame(); };
  const names = ['natural', 'native-before', 'native-after', 'native-revert', 'native-noop', 'class-hidden', 'hidden', 'inert', 'body-gap', 'newer-owner', 'detach', 'route', 'cap'];
  check(selected === 'all' || names.includes(selected), 'Unknown anchor mutation case');
  const cases = [];
  for (const name of names.filter(value => selected === 'all' ? value !== 'cap' : value === selected)) {
    const trace = [], processed = [], restores = [];
    const g = window.__anchorMeasure = { bucket: 0, origin: 0, delivered: 0, snapshots: 0, scans: 0, overflow: false,
      push(row) { if (trace.length < 256) trace.push(row); else this.overflow = true; },
      process(records) { for (const record of records) { if (processed.length < 256) processed.push([record.type, record.target.id || record.target.parentElement?.id || '', record.attributeName || '']); else this.overflow = true; } } };
    let ticking = true, raf = 0;
    const tick = stamp => { g.bucket = stamp; if (ticking) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
    history.replaceState({}, '', '/fixture/play');
    document.body.innerHTML = '<style>body{margin:0}.card{height:100px;box-sizing:border-box;padding:12px}.prose p{margin:0;line-height:24px}.native-hidden{display:none}#feed{height:400px;width:640px;overflow-y:scroll;margin:40px}</style><main id="feed"><div id="events-list"></div></main><div class="tiptap" contenteditable="true">Preserve draft.</div>';
    const feed = document.getElementById('feed'), list = document.getElementById('events-list'), draft = document.querySelector('.tiptap'), draftText = draft.firstChild, items = [];
    for (let id = 1; id <= 40; id++) {
      const row = document.createElement('div'); row.id = `event-${id}`;
      row.innerHTML = `<div id="event-container-${id}"><div class="card" id="event-message-card-${id}">${id === 3 ? '<svg id="d8" width="18" height="18"></svg>' : ''}<div class="prose"><p>Native history ${id}</p></div></div></div>`;
      const card = row.querySelector('.card'), body = row.querySelector('.prose'), text = body.firstChild.firstChild;
      card.__reactFiber$fixture = { memoizedProps: { event: { id, role: 'dm', content: text.data, campaign_id: 'fixture' } } };
      list.append(row); items.push({ row, card, body, text });
    }
    const victim = items[2]; let armed = false, injected = false, ownWrites = 0;
    for (const item of items) {
      const style = item.row.style, original = style.setProperty, descriptor = Object.getOwnPropertyDescriptor(style, 'setProperty');
      Object.defineProperty(style, 'setProperty', { configurable: true, value: function (property, value, priority) {
        const trigger = armed && !injected && item === victim && property === 'overflow-anchor' && value === 'none';
        const nativeWrite = () => Reflect.apply(original, style, ['opacity', '.8', '']);
        if (trigger) {
          injected = true;
          if (name === 'native-before' || name === 'native-revert') nativeWrite();
        }
        const result = Reflect.apply(original, this, arguments);
        if (property === 'overflow-anchor') ownWrites++;
        if (trigger) {
          if (name === 'native-after') nativeWrite();
          if (name === 'native-revert') Reflect.apply(original, style, ['opacity', '1', '']);
          // Native revert makes the complete owned operation a raw-style no-op.
          if (name === 'native-noop') style.removeProperty('overflow-anchor');
          if (name === 'class-hidden') victim.card.classList.add('native-hidden');
          if (name === 'hidden') victim.card.hidden = true;
          if (name === 'inert') victim.card.inert = true;
          if (name === 'body-gap') victim.text.data = '';
        }
        return result;
      } });
      restores.push(() => { if (descriptor) Object.defineProperty(style, 'setProperty', descriptor); else delete style.setProperty; });
    }
    const glyph = () => { const range = document.createRange(); range.selectNodeContents(items[10].text); const ink = range.getBoundingClientRect(), card = items[10].card.getBoundingClientRect(); return { offset: ink.top - card.top, height: ink.height }; };
    try {
      check(document.visibilityState === 'visible' && document.hasFocus(), 'Visible focused document required');
      feed.scrollTop = 15; await frame(); await frame(); eval(`(${source})`)(settings); await settle();
      const initialInk = glyph(); trace.length = 0; processed.length = 0; g.delivered = g.snapshots = g.scans = 0; ownWrites = 0;
      async function move(target, smooth) {
        let events = 0, ended = false; const scrolled = () => events++, finished = () => { ended = true; };
        feed.addEventListener('scroll', scrolled); feed.addEventListener('scrollend', finished);
        try {
          feed.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'instant' });
          let stable = 0, prior = feed.scrollTop, count = 0;
          for (; count < 90; count++) { await frame(); const top = feed.scrollTop; stable = Math.abs(top - prior) <= .5 ? stable + 1 : 0; prior = top; if (events && Math.abs(top - target) <= 1 && stable >= 3) break; }
          check(count < 90, 'Native scroll did not settle'); await settle();
          return { target, actual: feed.scrollTop, events, ended, frames: count };
        } finally { feed.removeEventListener('scroll', scrolled); feed.removeEventListener('scrollend', finished); }
      }
      let natural, outcome;
      if (name === 'natural') {
        const control = await move(25, true), controlEnd = trace.length;
        const changing = await move(625, true);
        const preferenceSet = rows => [...new Set(rows.filter(row => row[0] === 1 && row[3] > 0).map(row => row[4]))];
        const controlPreferences = preferenceSet(trace.slice(0, controlEnd)), changingPreferences = preferenceSet(trace.slice(controlEnd));
        const observerCardReads = trace.filter(row => row[2] === 2).reduce((total, row) => total + row[3], 0);
        const observedTransition = ownWrites > 0 && controlPreferences.length === 1 && changingPreferences.length > 1;
        natural = { control, changing, controlPreferences, changingPreferences, observedTransition, observerCardReads, snapshots: g.snapshots, scans: g.scans, processedRecords: processed.length, delivered: g.delivered, ownWrites };
        outcome = observedTransition && observerCardReads === 0 && g.snapshots === 0 && g.scans === 0 && processed.length === 0;
      } else if (name === 'cap') {
        const motion = await move(625, false);
        const affected = processed.filter(row => row[0] === 'attributes' && /^event-[3-7]$/.test(row[1]) && row[2] === 'style');
        outcome = affected.some(row => row[1] === 'event-3') && affected.some(row => row[1] === 'event-4') && g.snapshots > 0;
        natural = { motion, affected, snapshots: g.snapshots, delivered: g.delivered };
      } else if (name === 'detach') {
        await move(625, false); window.dispatchEvent(new Event('resize'));
        const replacement = feed.cloneNode(false); replacement.append(...feed.childNodes); feed.replaceWith(replacement); replacement.scrollTop = 625;
        await settle(); victim.card.setAttribute('aria-hidden', 'true'); await settle();
        outcome = !feed.isConnected && list.isConnected && replacement.scrollTop === 625
          && processed.some(row => row[0] === 'attributes' && row[1] === victim.card.id && row[2] === 'aria-hidden')
          && !victim.card.querySelector('[data-ff-desktop-message-snapshot]');
        natural = { replacementTop: replacement.scrollTop, oldConnected: feed.isConnected, delivered: g.delivered };
      } else if (name === 'route') {
        await move(625, false); window.dispatchEvent(new Event('resize'));
        history.replaceState({}, '', '/settings'); window.dispatchEvent(new Event('popstate'));
        victim.row.style.setProperty('overflow-anchor', 'auto', 'important'); await settle();
        window.__friendsFablesDesktopChatAppearance.dispose();
        outcome = victim.row.style.getPropertyValue('overflow-anchor') === 'auto' && victim.row.style.getPropertyPriority('overflow-anchor') === 'important';
        natural = { path: location.pathname, delivered: g.delivered, processed: processed.length };
      } else if (name === 'newer-owner') {
        await move(625, false);
        // Real pending own restores plus a newer native inline owner in the same task.
        window.dispatchEvent(new Event('resize'));
        victim.row.style.setProperty('overflow-anchor', 'auto', 'important'); victim.row.style.setProperty('opacity', '.7');
        window.__friendsFablesDesktopChatAppearance.dispose(); await settle();
        outcome = victim.row.style.getPropertyValue('overflow-anchor') === 'auto' && victim.row.style.getPropertyPriority('overflow-anchor') === 'important' && victim.row.style.opacity === '0.7';
      } else {
        armed = true; const motion = await move(625, false); armed = false;
        const ownOnlyTargetProcessed = processed.some(row => row[0] === 'attributes' && row[1] === 'event-4' && row[2] === 'style');
        const mixedStyleProcessed = processed.some(row => row[0] === 'attributes' && row[1] === 'event-3' && row[2] === 'style');
        const attr = name === 'class-hidden' ? 'class' : name;
        const nativeAttributeProcessed = processed.some(row => row[0] === 'attributes' && row[1] === victim.card.id && row[2] === attr);
        const overlay = victim.card.querySelector('[data-ff-desktop-message-snapshot]');
        let functional = true;
        if (name === 'class-hidden' || name === 'hidden') functional = getComputedStyle(victim.card).display === 'none' && !overlay;
        if (name === 'inert') functional = victim.card.inert && !overlay;
        if (name === 'body-gap') functional = overlay?.textContent === 'Native history 3' && victim.text.data === '';
        const nativePreserved = name.startsWith('native-') ? mixedStyleProcessed : name === 'body-gap' ? processed.some(row => row[0] === 'characterData') : nativeAttributeProcessed;
        outcome = injected && nativePreserved && functional && (name === 'native-noop' ? ownOnlyTargetProcessed : !ownOnlyTargetProcessed);
        natural = { motion, injected, nativePreserved, functional, ownOnlyTargetProcessed, mixedStyleProcessed, processed, delivered: g.delivered, snapshots: g.snapshots, scans: g.scans };
      }
      const finalInk = glyph();
      check(items.every(item => item.card.parentElement.parentElement === item.row && item.card.querySelector('.prose') === item.body && item.body.firstChild.firstChild === item.text && item.text.isConnected), `${name}: native identity changed`);
      check(draft.firstChild === draftText && draft.textContent === 'Preserve draft.', `${name}: draft changed`);
      check(finalInk.height > 0 && Math.abs(finalInk.offset - initialInk.offset) <= .5, `${name}: glyph baseline changed`);
      check(!g.overflow, `${name}: diagnostic cap exhausted (inconclusive)`);
      cases.push({ name, passed: !!outcome, natural, trace, initialInk, finalInk });
    } finally {
      ticking = false; cancelAnimationFrame(raf); for (const restore of restores) restore(); window.__friendsFablesDesktopChatAppearance?.dispose(); delete window.__anchorMeasure;
    }
  }
  return { passed: cases.every(value => value.passed), cases };
}
module.exports = { prepare, scenario };
if (!process.versions.electron) console.log('ANCHOR_MUTATIONS_STATIC', JSON.stringify(prepare().metadata));
else {
  const { app, BrowserWindow, session } = require('electron'); let win, ownedProfile; app.on('window-all-closed', () => {});
  const timer = setTimeout(() => { console.error('Anchor mutation hard30s deadline'); win?.destroy(); app.exit(1); }, 30000);
  (async () => { let passed = false; try {
    const selected = process.env.FABLES_ANCHOR_MUTATION_CASE || 'all';
    const code = prepare(selected === 'cap'); console.log('ANCHOR_MUTATIONS_SOURCE', JSON.stringify(code.metadata));
    const profile = process.env.FABLES_TEST_PROFILE_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ff-anchor-mutations-')); if (!process.env.FABLES_TEST_PROFILE_DIR) ownedProfile = profile;
    app.setPath('userData', profile); await app.whenReady();
    const site = session.fromPartition('anchor-mutations-private'); site.protocol.handle('https', () => new Response('<!doctype html><body></body>', { headers: { 'Content-Type': 'text/html' } }));
    win = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await win.loadURL('https://play.fables.gg/fixture/play'); win.show(); win.focus(); win.webContents.focus();
    const readyUntil = Date.now() + 2000; let ready = false;
    while (Date.now() < readyUntil) { ready = await win.webContents.executeJavaScript("document.visibilityState==='visible' && document.hasFocus()"); if (win.isVisible() && win.isFocused() && ready) break; await new Promise(resolve => setTimeout(resolve, 25)); }
    assert(win.isVisible() && win.isFocused() && ready, 'Fixture visibility/focus precondition');
    const result = await win.webContents.executeJavaScript(`(${scenario.toString()})(${JSON.stringify(code.source)},${JSON.stringify(code.settings)},${JSON.stringify(selected)})`);
    console.log('ANCHOR_MUTATIONS_RESULT', JSON.stringify(result));
    if (selected === 'all' && code.capSupported) {
      const capped = prepare(true);
      const capResult = await win.webContents.executeJavaScript(`(${scenario.toString()})(${JSON.stringify(capped.source)},${JSON.stringify(capped.settings)},'cap')`);
      console.log('ANCHOR_MUTATIONS_CAP', JSON.stringify({ metadata: capped.metadata, ...capResult })); assert.equal(capResult.passed, true, 'Finite bookkeeping overflow did not fail open');
    } else if (!code.capSupported) console.log('ANCHOR_MUTATIONS_PENDING', 'Baseline has no finite-ledger seam; cap coverage pending product contract, not a baseline failure.');
    assert.equal(result.passed, true, 'Owned anchor delivery reprocessed or native mixed mutation lost'); passed = true;
  } catch (error) { console.error(error); } finally { clearTimeout(timer); win?.destroy(); if (ownedProfile) fs.rmSync(ownedProfile, { recursive: true, force: true }); app.exit(passed ? 0 : 1); } })();
}
