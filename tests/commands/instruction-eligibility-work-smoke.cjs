// ROOT-scheduled private CPU-native fixture; no executable fixture imports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
async function scenario(configure) {
  const results = { eligibility: [], work: null, controls: {} };
  let stage = 'setup';
  const check = (condition, message, detail) => { if (!condition) throw Error(message + ': ' + JSON.stringify({ stage, detail, results })); };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { await frame(); await frame(); };
  document.body.innerHTML = '<main id="feed"></main><div id="dice"></div><section id="outside"></section><div class="tiptap" contenteditable="true">Preserve instruction draft.</div>';
  const feed = document.getElementById('feed'), outside = document.getElementById('outside'), dice = document.getElementById('dice');
  const draft = document.querySelector('.tiptap'), draftText = draft.firstChild, roots = [], ordinary = [], restores = [];
  const complete = '[[FF-SP:1]] Preserve complete native guidance. [[/FF-SP:1]]';
  const originalIgnore = [null, 'false', 'true'];
  for (let index = 0; index < 40; index++) {
    const root = document.createElement('article'); root.className = 'prose';
    const p = document.createElement('p'); p.textContent = 'Stable native narration ' + index + '.'; root.append(p); feed.append(root); roots.push(root); ordinary.push({ p, text: p.firstChild });
  }
  const article = roots[0], ancestor = document.createElement('section'); article.append(ancestor);
  const paragraphs = originalIgnore.map(value => {
    const p = document.createElement('p'); p.textContent = complete; if (value !== null) p.setAttribute('data-ff-translation-ignore', value); ancestor.append(p); return { p, text: p.firstChild, original: value };
  });
  const split = document.createElement('div'); split.innerHTML = '<p>[[FF-SP:1]]</p><ul><li>Split native guidance.</li></ul><p>[[/FF-SP:1]]</p>'; article.append(split);
  const splitNodes = [...split.children], splitClosing = split.lastElementChild.firstChild;
  const excluded = document.createElement('section'); excluded.innerHTML = '<p><code>[[FF-SP:1]] literal [[/FF-SP:1]]</code></p><pre><p>[[FF-SP:1]] code [[/FF-SP:1]]</p></pre><p>[[FF-SP:1]] incomplete</p>'; article.append(excluded);
  const svgText = (parent, value) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
    const label = document.createElementNS(svg.namespaceURI, 'text'), text = document.createTextNode(value); label.append(text); svg.append(label); parent.append(svg); return { svg, label, text };
  };
  const diceNodes = Array.from({ length: 6 }, (_,index) => svgText(dice, String(index + 1)));
  const marked = element => element.getAttribute('data-ff-desktop-instruction-block') === 'true' && element.getAttribute('data-ff-translation-ignore') === 'true';
  const hidden = element => marked(element) && element.getAttribute('data-ff-desktop-hidden-instructions') === 'true' && getComputedStyle(element).display === 'none';
  const clean = ({p, original}) => !p.hasAttribute('data-ff-desktop-instruction-block') && !p.hasAttribute('data-ff-desktop-hidden-instructions') && p.getAttribute('data-ff-translation-ignore') === original && getComputedStyle(p).display !== 'none';
  const identity = () => paragraphs.every(item => item.p.firstChild === item.text && item.text.isConnected) && ordinary.every(item => item.p.firstChild === item.text && item.text.isConnected)
    && draft.firstChild === draftText && draft.textContent === 'Preserve instruction draft.' && diceNodes.every(item => item.svg.contains(item.label) && item.label.firstChild === item.text);
  configure(true); const controller = window.__friendsFablesDesktopInstructionHiding; await settle();
  check(controller && paragraphs.every(item => hidden(item.p)) && splitNodes.every(hidden), 'Initial complete/split guidance must be hidden');
  check(!excluded.querySelector('[data-ff-desktop-instruction-block]'), 'Code/incomplete exclusions');
  const selection = getSelection(), selected = ordinary[1].text, range = document.createRange(); range.selectNodeContents(selected); selection.removeAllRanges(); selection.addRange(range);
  const selectedValue = selection.toString();
  // Eligibility outcomes are contract results, not setup assertions. Record the
  // first painted state before any unrelated SVG mutation, then keep controls.
  for (const mode of ['contenteditable', 'prose-class']) {
    stage = 'eligibility-' + mode;
    if (mode === 'contenteditable') ancestor.setAttribute('contenteditable', 'true'); else article.classList.remove('prose');
    await frame(); const cleanupBeforeUnrelated = paragraphs.every(clean);
    const first = paragraphs.map(item => ({ hidden: item.p.hasAttribute('data-ff-desktop-hidden-instructions'), marked: item.p.hasAttribute('data-ff-desktop-instruction-block'), ignore: item.p.getAttribute('data-ff-translation-ignore') }));
    // The old implementation relies on this incidental nudge. A corrected
    // implementation already cleaned up; both must retain correct authority.
    diceNodes[0].text.data = mode === 'contenteditable' ? '101' : '102'; await settle();
    const cleanupAfterNudge = paragraphs.every(clean); check(cleanupAfterNudge, 'Cleanup must work after eligibility change/nudge', first);
    if (mode === 'contenteditable') ancestor.removeAttribute('contenteditable'); else article.classList.add('prose');
    await frame(); const rehiddenWithoutNudge = paragraphs.every(item => hidden(item.p));
    results.eligibility.push({ mode, passed: cleanupBeforeUnrelated && rehiddenWithoutNudge, cleanupBeforeUnrelated, rehiddenWithoutNudge, cleanupAfterNudge, first, identity: identity() });
    controller.setEnabled(true); await settle(); check(paragraphs.every(item => hidden(item.p)), 'Rebase valid marked state');
  }
  const queries = { prose: 0, drafts: 0, markers: 0, paragraphPasses: 0, paragraphVisits: 0 };
  const documentDescriptor = Object.getOwnPropertyDescriptor(document, 'querySelectorAll'), documentOriginal = document.querySelectorAll;
  const documentWrapper = function(selector) {
    if (selector === '.prose') queries.prose++; else if (selector === '[data-ff-desktop-sp-draft]') queries.drafts++; else if (selector === '[data-ff-desktop-instruction-block]') queries.markers++;
    check(queries.prose < 128, 'Global scan diagnostic cap exhausted'); return Reflect.apply(documentOriginal, this, arguments);
  };
  Object.defineProperty(document, 'querySelectorAll', { configurable: true, writable: true, value: documentWrapper });
  restores.push(() => { if (documentDescriptor) Object.defineProperty(document, 'querySelectorAll', documentDescriptor); else delete document.querySelectorAll; });
  for (const root of roots) {
    const descriptor = Object.getOwnPropertyDescriptor(root, 'querySelectorAll'), original = root.querySelectorAll;
    Object.defineProperty(root, 'querySelectorAll', { configurable: true, writable: true, value: function(selector) {
      const value = Reflect.apply(original, this, arguments); if (selector === 'p') { queries.paragraphPasses++; queries.paragraphVisits += value.length; } return value;
    } });
    restores.push(() => { if (descriptor) Object.defineProperty(root, 'querySelectorAll', descriptor); else delete root.querySelectorAll; });
  }
  const diceTexts = new Set(diceNodes.map(item => item.text)); let measuring = false, deliveries = 0, svgRecords = 0, stableMarkerWrites = 0, unexpected = 0;
  const observer = new MutationObserver(records => {
    if (!measuring) return;
    let matched = false;
    for (const record of records) {
      if (record.type === 'characterData' && diceTexts.has(record.target)) { svgRecords++; matched = true; }
      else if (record.type === 'attributes' && ['data-ff-desktop-instruction-block','data-ff-desktop-hidden-instructions','data-ff-translation-ignore'].includes(record.attributeName)) stableMarkerWrites++;
      else unexpected++;
    }
    if (matched) deliveries++;
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  try {
    stage = 'stable-outside-svg'; await settle(); measuring = true;
    for (let batch = 0; batch < 8; batch++) { for (let index = 0; index < 6; index++) diceNodes[index].text.data = String(200 + batch * 6 + index); await frame(); }
    await settle(); measuring = false;
    results.work = { passed: queries.prose === 0 && queries.paragraphVisits === 0, ...queries, deliveries, svgRecords, stableMarkerWrites, unexpected, identity: identity() };
    check(deliveries === 8 && svgRecords === 48 && stableMarkerWrites === 0 && unexpected === 0 && results.work.identity, 'Real stable SVG-only delivery preconditions', results.work);
    stage = 'native-svg-in-prose';
    const native = document.createElement('p'); native.append(document.createTextNode('[[FF-SP:1]] Native SVG closes guidance. ')); const inside = svgText(native, '[[/FF-SP:1]]'); ancestor.append(native); await settle();
    check(hidden(native), 'Native SVG paragraph complete setup'); inside.text.data = 'Incomplete'; await settle(); check(!marked(native) && getComputedStyle(native).display !== 'none', 'SVG inside prose must invalidate block');
    inside.text.data = '[[/FF-SP:1]]'; await settle(); check(hidden(native) && inside.label.firstChild === inside.text, 'SVG inside prose must rehide native block');
    stage = 'foreign-object';
    const foreignSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), foreign = document.createElementNS(foreignSvg.namespaceURI, 'foreignObject');
    const foreignRoot = document.createElement('article'), foreignP = document.createElement('p'); foreignRoot.className = 'prose'; foreignP.textContent = complete; const foreignText = foreignP.firstChild;
    foreignRoot.append(foreignP); foreign.append(foreignRoot); foreignSvg.append(foreign); outside.append(foreignSvg); await settle(); check(hidden(foreignP), 'ForeignObject complete setup');
    foreignText.data = 'Foreign ordinary content.'; await settle(); check(!marked(foreignP), 'ForeignObject prose text must remain relevant'); foreignText.data = complete; await settle(); check(hidden(foreignP), 'ForeignObject complete reuse');
    stage = 'draft-svg';
    const draftOwner = document.createElement('section'), editor = document.createElement('div'), draftP = document.createElement('p'); editor.className = 'tiptap'; editor.contentEditable = 'true';
    draftP.append(document.createTextNode('[[FF-SP:1]] Draft guidance. ')); const draftSvg = svgText(draftP, '[[/FF-SP:1]]'); editor.append(draftP); draftOwner.append(editor); draftOwner.setAttribute('data-ff-desktop-sp-draft', 'true'); outside.append(draftOwner); await settle();
    check(draftOwner.hasAttribute('data-ff-desktop-sp-draft'), 'Complete marked draft setup'); draftSvg.text.data = 'Incomplete'; await settle(); check(!draftOwner.hasAttribute('data-ff-desktop-sp-draft') && draftSvg.label.firstChild === draftSvg.text, 'Draft SVG change must release stale draft marker');
    stage = 'mixed-and-reuse';
    const reused = paragraphs[0]; reused.text.data = 'Ordinary reused content.'; await settle(); check(clean(reused), 'Ceased block restores original ignore');
    diceNodes[0].text.data = '501'; reused.text.data = complete; await settle(); check(hidden(reused.p), 'Mixed outside SVG/native prose batch must process prose');
    splitClosing.data = 'Incomplete'; await settle(); check(splitNodes.every(node => !marked(node)), 'Split incomplete cleanup'); splitClosing.data = '[[/FF-SP:1]]'; await settle(); check(splitNodes.every(hidden), 'Split complete reuse');
    stage = 'childlist-and-reparent';
    const beforeChild = queries.prose, comment = document.createComment('Native SVG child update'); diceNodes[1].svg.append(comment); await settle(); check(queries.prose > beforeChild, 'SVG childList must retain discovery'); comment.remove(); await settle();
    const moved = paragraphs[1]; outside.append(moved.p); await settle(); check(clean(moved), 'Native reparent cleanup restores false ignore'); ancestor.append(moved.p); await settle(); check(hidden(moved.p), 'Native reparent back rehide');
    const fresh = document.createElement('p'); fresh.textContent = complete; ancestor.append(fresh); await settle(); check(hidden(fresh), 'New native complete guidance childList');
    stage = 'public-toggles'; controller.setEnabled(false); await settle();
    check(paragraphs.every(item => marked(item.p) && !item.p.hasAttribute('data-ff-desktop-hidden-instructions') && getComputedStyle(item.p).display !== 'none'), 'Public show retains raw ignored guidance');
    controller.setEnabled(true); await settle(); check(paragraphs.every(item => hidden(item.p)) && !excluded.querySelector('[data-ff-desktop-instruction-block]'), 'Public hide/code/incomplete preservation');
    for (const item of paragraphs) item.text.data = 'Ordinary native paragraph retained.'; await settle(); check(paragraphs.every(clean), 'Final original ignore null/false/true restoration');
    results.controls = { passed: identity() && selection.anchorNode === selected && selection.toString() === selectedValue, svgInProse: true, foreignObject: true, draftCleanup: true, mixed: true, childList: true, reparent: true, split: true, codeIncomplete: true, toggles: true, originalIgnoreValues: paragraphs.map(item => item.p.getAttribute('data-ff-translation-ignore')), identity: identity(), selection: selection.toString() === selectedValue };
    check(results.controls.passed, 'Final native Text/editor/draft/selection preservation');
    return { passed: results.eligibility.every(value => value.passed) && results.work.passed && results.controls.passed, ...results };
  } finally { observer.disconnect(); for (const restore of restores.reverse()) restore(); selection.removeAllRanges(); }
}
function prepare() {
  const root = process.env.FABLES_TEST_APP_ROOT || path.resolve(__dirname, '../..'), file = path.join(root, 'dist/commands/host-instructions-dom.js');
  const { configureInstructionHiding } = require(file); new vm.Script(`(${configureInstructionHiding.toString()})`); new vm.Script(`(${scenario.toString()})`);
  return { configure: configureInstructionHiding.toString(), metadata: { root, compiledSHA256: sha(fs.readFileSync(file)), functionSHA256: sha(configureInstructionHiding.toString()), fixtureSHA256: sha(fs.readFileSync(__filename)) } };
}
module.exports = { scenario, prepare };
if (!process.versions.electron) { new vm.Script(`(${scenario.toString()})`); console.log('INSTRUCTION_ELIGIBILITY_STATIC', JSON.stringify({ fixtureSHA256: sha(fs.readFileSync(__filename)) })); }
else {
  const { app, BrowserWindow, session } = require('electron'); app.on('window-all-closed', () => {}); let win, ownedProfile, passed = false;
  const timer = setTimeout(() => { console.error('Instruction eligibility fixture hard20s deadline'); win?.destroy(); app.exit(1); }, 20000);
  (async () => { try {
    const code = prepare(); console.log('INSTRUCTION_ELIGIBILITY_SOURCE', JSON.stringify(code.metadata));
    const profile = process.env.FABLES_TEST_PROFILE_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ff-instruction-eligibility-')); if (!process.env.FABLES_TEST_PROFILE_DIR) ownedProfile = profile;
    app.setPath('userData', profile); await app.whenReady(); const site = session.fromPartition('instruction-eligibility-private'); site.protocol.handle('https', () => new Response('<!doctype html><style>body{margin:0}.prose{font:16px sans-serif}.prose p{margin:0;line-height:20px}svg{overflow:visible}</style>', { headers: { 'Content-Type': 'text/html' } }));
    win = new BrowserWindow({ show: false, width: 1100, height: 820, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await win.loadURL('https://play.fables.gg/fixture/play'); win.show(); win.focus(); win.webContents.focus();
    const until = Date.now() + 2000; let ready = false;
    while (Date.now() < until) { ready = await win.webContents.executeJavaScript("document.visibilityState==='visible'&&document.hasFocus()"); if (win.isVisible() && win.isFocused() && ready) break; await new Promise(resolve => setTimeout(resolve, 25)); }
    assert(win.isVisible() && win.isFocused() && ready, 'Visible focused native fixture required');
    const result = await win.webContents.executeJavaScript(`(${scenario.toString()})(${code.configure})`);
    console.log('INSTRUCTION_ELIGIBILITY_RESULT', JSON.stringify(result)); assert.equal(result.passed, true, 'Eligibility cleanup/rehide or irrelevant SVG scan work contract failed'); passed = true;
  } catch(error) { console.error(error); } finally { clearTimeout(timer); win?.destroy(); if (ownedProfile) fs.rmSync(ownedProfile, { recursive: true, force: true }); app.exit(passed ? 0 : 1); } })();
}
