// ROOT schedules native execution. --syntax loads pure source exports only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const crypto = require('node:crypto');
const fixtureRoot = path.resolve(__dirname, '../..');
const runtimeRoot = process.env.FABLES_TEST_APP_ROOT || fixtureRoot;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function prepare() {
  const cache = new Map();
  const load = name => {
    if (cache.has(name)) return cache.get(name);
    const code = require('esbuild').transformSync(fs.readFileSync(path.join(fixtureRoot, 'src', name + '.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' }).code;
    new vm.Script(code);
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, dependency => {
      assert.ok(dependency.startsWith('.'), 'Only pure relative source dependencies');
      return load(path.posix.join(path.posix.dirname(name), dependency));
    });
    cache.set(name, module.exports); return module.exports;
  };
  const { configureChatAppearance, chatCss } = load('appearance/chat-appearance');
  const { DEFAULT_APPEARANCE } = load('appearance/themes');
  const settings = { ...structuredClone(DEFAULT_APPEARANCE), preset: 'black' };
  const source = configureChatAppearance.toString(), css = chatCss(settings, null);
  const program = `(${scenario.toString()})(${JSON.stringify(source)},${JSON.stringify(settings)},${JSON.stringify(css)})`;
  new vm.Script(`(${source})`); new vm.Script(program);
  return { program, metadata: { fixtureSHA256: sha(fs.readFileSync(__filename)), sourceSHA256: sha(fs.readFileSync(path.join(fixtureRoot, 'src/appearance/chat-appearance.ts'))), functionSHA256: sha(source), cssSHA256: sha(css), runtimeRoot } };
}
async function scenario(source, settings, css) {
  const check = (condition, label, evidence) => { if (!condition) throw Error(label + ': ' + JSON.stringify(evidence)); };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { await frame(); await frame(); await frame(); check(document.visibilityState === 'visible' && document.hasFocus(), 'Visible focused fixture'); };
  const configure = (0, eval)('(' + source + ')');
  const attribute = 'data-ff-desktop-detail-card';
  const selector = 'div.border.rounded-md, div.border.rounded-lg, [class~="rounded-md"][class~="border"][class~="bg-card"]';
  document.head.innerHTML = '<style>html,body{margin:0;font:14px Arial}*{box-sizing:border-box}#history{position:absolute;left:8px;top:220px;width:580px;height:260px;overflow:auto}.history{height:28px;border:1px solid #777}#grid{position:absolute;left:8px;top:8px;width:580px;height:180px}#composer{height:80px}.tiptap{height:30px}#dialogs{position:absolute;left:620px;top:8px;width:430px}#dialogs .border{border:1px solid #666;padding:2px}h3{margin:0;font-size:14px}#stimulus{position:absolute;top:510px}</style>';
  const skin = document.createElement('style'); skin.textContent = css; document.head.append(skin);
  document.body.innerHTML = '<main id="history"><div id="events-list"></div></main><div id="grid" class="grid relative"><div id="composer" class="bg-gray-800/80"><div class="tiptap" contenteditable="true">Native editor draft selection</div><button type="button" aria-label="Roll dice">Dice</button></div><div class="bottom-full left-0 right-0"><div id="context" class="bg-gray-800"></div></div></div><div id="dialogs"></div><div id="stimulus"></div>';
  const outside = new Set(), tracked = new Map(), expected = new Set(), retained = [];
  const card = (parent, id, classes = 'border rounded-md', tag = 'div', content = '<h3>Native detail</h3>') => {
    const node = document.createElement(tag); node.id = id; node.className = classes; node.innerHTML = content; parent.append(node); tracked.set(id, node); return node;
  };
  const list = document.getElementById('events-list');
  for (let i = 0; i < 240; i++) {
    const node = card(list, 'event-message-card-' + (i + 1), i % 3 === 0 ? 'history border rounded-md' : i % 3 === 1 ? 'history border rounded-lg' : 'history rounded-md border bg-card', i % 3 === 2 ? 'article' : 'div');
    outside.add(node); retained.push([node, node.firstChild, node.firstChild.firstChild]);
  }
  const dialogs = document.getElementById('dialogs');
  const root = card(dialogs, 'matching-dialog-root'); root.setAttribute('role', 'dialog'); expected.add(root.id);
  const md = card(root, 'branch-md', 'border rounded-md', 'div', '<img alt="native" width="8" height="8">'); expected.add(md.id);
  const lg = card(root, 'branch-lg', 'border rounded-lg', 'div', '<input type="number" value="2">'); expected.add(lg.id);
  const third = card(root, 'branch-card', 'border rounded-md bg-card', 'article', '<strong>Native strong</strong>'); expected.add(third.id);
  const overlap = card(root, 'overlapping-branches', 'border rounded-md bg-card'); expected.add(overlap.id);
  const nested = card(root, 'nested-dialog', 'border rounded-lg'); nested.setAttribute('role', 'dialog'); expected.add(nested.id);
  const deep = card(nested, 'nested-detail'); expected.add(deep.id);
  const sibling = document.createElement('section'); sibling.setAttribute('role', 'dialog'); dialogs.append(sibling);
  const other = card(sibling, 'other-dialog-detail', 'border rounded-lg'); expected.add(other.id);
  card(sibling, 'no-native-content', 'border rounded-md', 'div', '<span>Ordinary text</span><input type="text" value="keep">');
  for (const [id, tag, attr, value] of [['editable', 'section', 'contenteditable', 'true'], ['navigation', 'nav'], ['aside', 'aside'], ['sidebar', 'section', 'data-sidebar', 'native'], ['event', 'section', 'id', 'event-native-wrapper']]) {
    const wrapper = document.createElement(tag); if (attr) wrapper.setAttribute(attr, value); sibling.append(wrapper); card(wrapper, 'excluded-' + id);
  }
  // Context/composer discovery uses actual native anchors outside their nested dialogs.
  for (const id of ['context', 'composer']) {
    const portal = document.createElement('section'); portal.setAttribute('role', 'dialog'); document.getElementById(id).append(portal); card(portal, 'excluded-' + id);
  }
  const detailIdentities = [...tracked.values()].filter(node => !outside.has(node)).map(node => [node, node.firstChild, node.firstChild?.firstChild]);
  const editor = document.querySelector('.tiptap'), text = editor.firstChild, draft = text.data;
  editor.focus(); const range = document.createRange(); range.setStart(text, 2); range.setEnd(text, 11); getSelection().removeAllRanges(); getSelection().addRange(range);
  const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const stable = () => ({ history: box(document.getElementById('history')), editor: box(editor), first: box(retained[0][0]) });
  let originalGeometry = stable();
  const invariant = () => {
    const selection = getSelection();
    check(editor.isConnected && editor.firstChild === text && text.data === draft, 'Native draft/Text identity');
    check(selection.anchorNode === text && selection.focusNode === text && selection.anchorOffset === 2 && selection.focusOffset === 11, 'Native selection retained');
    check(detailIdentities.every(([node, child, leaf]) => node.firstChild === child && child?.firstChild === leaf), 'Native detail/control Text identities');
    check(retained.every(([node, heading, leaf]) => node.isConnected && node.firstChild === heading && heading.firstChild === leaf), 'History native element/Text identities');
    check(JSON.stringify(stable()) === JSON.stringify(originalGeometry), 'Native history/editor geometry retained', { before: originalGeometry, after: stable() });
  };
  const exact = label => {
    const actual = [...document.querySelectorAll('[' + attribute + ']')].map(node => node.id);
    const wanted = [...document.querySelectorAll('*')].filter(node => expected.has(node.id)).map(node => node.id);
    check(JSON.stringify(actual) === JSON.stringify(wanted), label + ' exact eligible set in document order', { actual, wanted }); invariant();
  };
  const counts = { outside: 0, positive: {}, visitOrder: [], queries: 0, outsideResults: 0, stimulusDeliveries: 0, capped: false };
  const proto = Element.prototype, originalClosest = Object.getOwnPropertyDescriptor(proto, 'closest'), originalElementQuery = Object.getOwnPropertyDescriptor(proto, 'querySelectorAll'), originalDocumentQuery = Object.getOwnPropertyDescriptor(Document.prototype, 'querySelectorAll');
  let measuring = false;
  const closest = new Proxy(originalClosest.value, { apply(target, receiver, args) {
    const result = Reflect.apply(target, receiver, args);
    if (measuring && args[0] === '[role="dialog"]') {
      if (outside.has(receiver)) counts.outside++;
      else if (tracked.get(receiver?.id) === receiver && expected.has(receiver.id)) { counts.positive[receiver.id] = (counts.positive[receiver.id] || 0) + 1; if (counts.visitOrder.length < 256) counts.visitOrder.push(receiver.id); else counts.capped = true; }
      if (counts.outside > 200000) counts.capped = true;
    }
    return result;
  } });
  const query = original => new Proxy(original, { apply(target, receiver, args) {
    const result = Reflect.apply(target, receiver, args);
    if (measuring && args[0] === selector) { counts.queries++; for (const node of result) if (outside.has(node)) counts.outsideResults++; }
    return result;
  } });
  const elementQuery = query(originalElementQuery.value), documentQuery = query(originalDocumentQuery.value);
  Object.defineProperty(proto, 'closest', { ...originalClosest, value: closest });
  Object.defineProperty(proto, 'querySelectorAll', { ...originalElementQuery, value: elementQuery });
  Object.defineProperty(Document.prototype, 'querySelectorAll', { ...originalDocumentQuery, value: documentQuery });
  const cleanup = () => {
    for (const [owner, name, owned, original] of [[proto, 'closest', closest, originalClosest], [proto, 'querySelectorAll', elementQuery, originalElementQuery], [Document.prototype, 'querySelectorAll', documentQuery, originalDocumentQuery]]) {
      if (Object.getOwnPropertyDescriptor(owner, name)?.value === owned) Object.defineProperty(owner, name, original);
    }
  };
  const stimulusObserver = new MutationObserver(records => { if (measuring) counts.stimulusDeliveries += records.length; });
  stimulusObserver.observe(document.getElementById('stimulus'), { attributes: true, attributeFilter: ['class'] });
  const phases = [];
  try {
    configure({ ...settings, preset: 'website' }); await settle();
    check(!document.querySelector('[' + attribute + ']'), 'Website preset leaves native detail cards alone'); originalGeometry = stable(); invariant();
    configure(settings); await settle(); exact('Normal preset');
    // Measure six actual distinct class mutation deliveries, with native RAFs.
    measuring = true;
    for (let i = 0; i < 6; i++) { document.getElementById('stimulus').className = 'native-state-' + i; await settle(); }
    measuring = false; exact('Measured ordinary updates');
    check(!counts.capped && counts.queries > 0, 'Observed native detail queries within count budget', counts);
    check(counts.stimulusDeliveries === 6, 'Six distinct native class mutation deliveries', counts);
    check(counts.positive[md.id] > 0, 'Measured eligible native detail discovery', counts);
    check(Object.values(counts.positive).every(value => value === counts.positive[md.id]), 'Nested/overlapping candidates visited once per discovery pass', counts.positive);
    const discoveryOrder = [...document.querySelectorAll('*')].filter(node => expected.has(node.id)).map(node => node.id);
    check(counts.visitOrder.length === counts.positive[md.id] * discoveryOrder.length && counts.visitOrder.every((id, index) => id === discoveryOrder[index % discoveryOrder.length]), 'Candidate discovery preserves document order and nested deduplication', counts.visitOrder);
    phases.push({ phase: 'ordinary-native-updates', ...structuredClone(counts) });
    const dynamic = card(sibling, 'dynamic-detail'); expected.add(dynamic.id); await settle(); exact('New detail mount');
    dynamic.className = 'native-plain'; expected.delete(dynamic.id); await settle(); exact('Matching class removed');
    dynamic.className = 'border rounded-lg'; expected.add(dynamic.id); await settle(); exact('Matching class restored');
    list.append(dynamic); expected.delete(dynamic.id); await settle(); exact('Detail moves out of dialog');
    sibling.append(dynamic); expected.add(dynamic.id); await settle(); exact('Same detail moves into current dialog');
    sibling.removeAttribute('role'); expected.delete(other.id); expected.delete(dynamic.id); await settle(); exact('Dialog role removed');
    sibling.setAttribute('role', 'dialog'); expected.add(other.id); expected.add(dynamic.id); await settle(); exact('Dialog role restored');
    dynamic.remove(); expected.delete(dynamic.id); await settle(); exact('Native detail removed');
    const replacement = card(sibling, dynamic.id); expected.add(replacement.id); await settle(); exact('Native replacement detail mounted');
    check(replacement !== dynamic && dynamic.firstChild.textContent === 'Native detail', 'Replacement is fresh; detached native content preserved');
    const oldRootClass = root.className; root.className = 'native-dialog'; expected.delete(root.id); await settle(); exact('Matching dialog root class removed');
    root.className = oldRootClass; expected.add(root.id); await settle(); exact('Matching dialog root class restored');
    const detached = [...expected].filter(id => root.contains(tracked.get(id))); root.remove(); for (const id of detached) expected.delete(id); await settle(); exact('Whole nested native dialog unmounted');
    dialogs.prepend(root); for (const id of detached) expected.add(id); await settle(); exact('Same nested native dialog remounted');
    configure({ ...settings, preset: 'amoled' }); await settle(); exact('Another normal preset');
    configure({ ...settings, preset: 'website' }); await settle(); check(!document.querySelector('[' + attribute + ']'), 'Website switch clears owned detail markers'); invariant();
    configure(settings); await settle(); exact('Normal preset reapplied');
    window.__friendsFablesDesktopChatAppearance.dispose(); await settle();
    check(!document.querySelector('[' + attribute + ']'), 'Controller disposal clears owned detail markers'); invariant();
    const newer = new Proxy(closest, { apply: Reflect.apply }); Object.defineProperty(proto, 'closest', { ...originalClosest, value: newer });
    cleanup(); check(proto.closest === newer, 'Probe cleanup preserves a newer wrapper');
    Object.defineProperty(proto, 'closest', originalClosest);
    check(proto.querySelectorAll === originalElementQuery.value && Document.prototype.querySelectorAll === originalDocumentQuery.value, 'Probe query hooks restored');
    return { functionalPassed: true, historyCandidates: outside.size, phases, geometry: originalGeometry, draftPreserved: true, selectionPreserved: true, cleanupPassed: true };
  } finally {
    measuring = false; stimulusObserver.disconnect(); window.__friendsFablesDesktopChatAppearance?.dispose(); cleanup();
  }
}
module.exports = { prepare, scenario };
if (!process.versions.electron) {
  assert.ok(process.argv.includes('--syntax'), 'Use --syntax for offline checks');
  console.log('DIALOG_DETAIL_SCAN_SYNTAX', JSON.stringify(prepare().metadata));
} else {
  const electron = require('electron');
  let win, profile;
  const deadline = setTimeout(() => { console.error('Dialog detail fixture deadline'); win?.destroy(); electron.app.exit(1); }, 20000);
  (async () => {
    let passed = false;
    try {
      const code = prepare(); console.log('DIALOG_DETAIL_SCAN_SOURCE', JSON.stringify(code.metadata));
      profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-dialog-detail-')); electron.app.setPath('userData', profile);
      await electron.app.whenReady(); const site = electron.session.fromPartition('dialog-detail-' + process.pid);
      site.protocol.handle('https', () => new Response('<!doctype html><html><head></head><body></body></html>', { headers: { 'Content-Type': 'text/html' } }));
      win = new electron.BrowserWindow({ show: false, width: 1100, height: 800, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
      await win.loadURL('https://play.fables.gg/campaign-a/play'); win.show(); win.focus(); win.webContents.focus();
      const readyBy = Date.now() + 2000; let ready = false;
      while (Date.now() < readyBy) { ready = await win.webContents.executeJavaScript("document.visibilityState==='visible'&&document.hasFocus()"); if (ready && win.isVisible() && win.isFocused()) break; await new Promise(resolve => setTimeout(resolve, 20)); }
      assert.ok(ready && win.isVisible() && win.isFocused(), 'Visible focused native fixture');
      const result = await win.webContents.executeJavaScript(code.program);
      console.log('DIALOG_DETAIL_SCAN_FUNCTIONAL', JSON.stringify(result));
      assert.equal(result.functionalPassed && result.cleanupPassed, true, 'Functional and cleanup controls complete before work assertion');
      assert.equal(result.phases[0].outside, 0, 'Dialog-only detail discovery must not inspect matching history candidates outside dialogs');
      passed = true;
    } catch (error) { console.error('Dialog detail fixture failure', error); }
    finally { clearTimeout(deadline); win?.destroy(); if (profile) fs.rmSync(profile, { recursive: true, force: true }); electron.app.exit(passed ? 0 : 1); }
  })();
}
