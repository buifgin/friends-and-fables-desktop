// ROOT-scheduled private CPU-native fixture; no executable fixture imports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const css = 'body{margin:0}#feed{height:400px;width:700px;overflow-y:auto;margin:40px}.card{padding:24px 16px;border-bottom:1px solid #aaa}.card p{margin:0;line-height:24px}.native-hidden,#resize-only{display:none}@media(min-width:1200px){#resize-only{display:block}}';
async function scenario(install, local) {
  const check = (condition, message, data) => { if (!condition) throw Error(message + ': ' + JSON.stringify(data)); };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { for (let index = 0; index < 4; index++) await frame(); };
  document.body.innerHTML = '<main id="feed"><div id="events-list"></div></main><p id="class-only" class="native-hidden">Class visibility reveals ordinary narration.</p><p id="resize-only">Window sizing reveals ordinary narration.</p><div class="tiptap" contenteditable="true">Preserve translation draft.</div>';
  const feed = document.getElementById('feed'), list = document.getElementById('events-list'), draft = document.querySelector('.tiptap'), draftText = draft.firstChild;
  const history = [], trace = [], walkerRestores = [];
  let stage = 'setup', scrollEvents = 0, endEvents = 0, nativeMutations = 0, observedMutations = 0;
  const counts = { bodyPasses: 0, bodyVisited: 0, allPasses: 0, allVisited: 0 };
  const record = value => { check(trace.length < 240, 'Motion trace cap exhausted', { stage }); trace.push({ stage, ...value }); };
  const createMessage = (id, text, prepend = false) => {
    const card = document.createElement('article'); card.className = 'card'; card.id = 'event-message-card-' + id;
    const prose = document.createElement('div'); prose.className = 'prose'; const p = document.createElement('p'), node = document.createTextNode(text); p.append(node); prose.append(p); card.append(prose);
    if (prepend) list.prepend(card); else list.append(card); return { card, prose, p, node };
  };
  for (let id = 1; id <= 40; id++) history.push(createMessage(id, 'Stable ordinary history narration number ' + id + '.'));
  const token = 'translation-scroll-work'; install(token, {}, true, [], local, false, false);
  const controller = window.__friendsFablesDesktopTranslation;
  const wait = async (label, predicate, frames = 150) => {
    for (let index = 0; index < frames; index++) {
      await frame(); check(document.visibilityState === 'visible' && document.hasFocus(), 'Visible focused fixture required', { stage });
      if (predicate()) return;
    }
    throw Error(label + ': ' + JSON.stringify({ stage, counts, scrollEvents, endEvents, top: feed.scrollTop, trace }));
  };
  const finishBatch = (batch, prefix) => controller.finish(token, batch.nodes.map(item => ({ id: item.id, version: item.version, text: prefix + item.id + '.', complete: true })));
  const take = async source => {
    let found;
    await wait('Expected native text not collected', () => {
      controller.retry(); const batch = controller.collect(); found = batch.nodes.find(item => item.text === source);
      check(batch.nodes.every(item => item === found), 'Unexpected pending control text', batch.nodes);
      return !!found;
    });
    return { token, nodes: [found] };
  };
  // Finish real public requests before instrumentation; no pending provider or
  // presentation updates remain in the stable-history measurement.
  for (let index = 0; index < 4; index++) {
    controller.retry(); const batch = controller.collect(); if (!batch.nodes.length) break; finishBatch(batch, 'Готовая история '); await settle();
  }
  await settle();
  check(history.every(item => item.node.data.startsWith('Готовая история ')), 'Forty history entries must be ready', history.map(item => item.node.data));
  controller.retry(); check(controller.collect().nodes.length === 0, 'History still pending'); await settle();
  const readyValues = history.map(item => item.node.data);
  const selection = getSelection(), selected = history[1].node, range = document.createRange(); range.selectNodeContents(selected); selection.removeAllRanges(); selection.addRange(range);
  const selectionText = selection.toString(); await settle();
  const treeDescriptor = Object.getOwnPropertyDescriptor(document, 'createTreeWalker'), treeOriginal = document.createTreeWalker;
  const treeWrapped = function(...args) {
    const walker = Reflect.apply(treeOriginal, this, args), body = args[0] === document.body;
    check(++counts.allPasses <= 256, 'TreeWalker pass cap exhausted', { stage, counts }); if (body) counts.bodyPasses++;
    const descriptor = Object.getOwnPropertyDescriptor(walker, 'nextNode'), next = walker.nextNode;
    const wrapped = function(...values) {
      const value = Reflect.apply(next, this, values);
      if (value) { check(++counts.allVisited <= 100000, 'TreeWalker visit cap exhausted', { stage, counts }); if (body) counts.bodyVisited++; }
      return value;
    };
    Object.defineProperty(walker, 'nextNode', { configurable: true, writable: true, value: wrapped });
    walkerRestores.push(() => { if (descriptor) Object.defineProperty(walker, 'nextNode', descriptor); else delete walker.nextNode; });
    return walker;
  };
  Object.defineProperty(document, 'createTreeWalker', { configurable: true, writable: true, value: treeWrapped });
  const mutations = new MutationObserver(records => {
    observedMutations += records.length;
    for (const mutation of records) {
      const element = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (!element || element.closest('[data-ff-translation-ignore]')) continue;
      if (feed.contains(element) || draft.contains(element)) nativeMutations++;
    }
    check(observedMutations < 10000, 'Mutation diagnostic cap exhausted', { stage });
  });
  mutations.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
  const scrolled = () => scrollEvents++, ended = () => endEvents++;
  feed.addEventListener('scroll', scrolled); feed.addEventListener('scrollend', ended);
  const motion = async (target, during) => {
    const start = feed.scrollTop, firstEvents = scrollEvents, firstEnds = endEvents, samples = [], oldHeight = feed.scrollHeight;
    check(Math.abs(target - start) > 150, 'Meaningful native motion required', { start, target });
    feed.scrollTo({ top: target, behavior: 'smooth' }); let acted = false;
    await wait('Native smooth motion did not complete', () => {
      samples.push(feed.scrollTop); record({ top: feed.scrollTop, target, ends: endEvents });
      const intermediate = Math.min(start, target) + 20 < feed.scrollTop && feed.scrollTop < Math.max(start, target) - 20;
      if (during && intermediate && !acted) { acted = true; during(); }
      return scrollEvents > firstEvents && endEvents > firstEnds && Math.abs(feed.scrollTop - target) <= 1;
    });
    await settle();
    const distinct = new Set(samples.filter(top => top > Math.min(start, target) + 1 && top < Math.max(start, target) - 1).map(Math.round)).size;
    check(distinct >= 3 && scrollEvents - firstEvents >= 3 && (!during || acted), 'Actual native smooth intermediate trajectory required', { start, target, samples, acted });
    check(Math.abs(feed.scrollTop - target) <= 1, 'Native target changed after completion', { target, actual: feed.scrollTop });
    return { start, target, actual: feed.scrollTop, events: scrollEvents - firstEvents, ends: endEvents - firstEnds, distinctIntermediate: distinct, oldHeight, newHeight: feed.scrollHeight, samples };
  };
  const identity = () => history.every((item,index) => item.card.isConnected && item.card.firstChild === item.prose && item.prose.firstChild === item.p && item.p.firstChild === item.node && item.node.data === readyValues[index])
    && draft.firstChild === draftText && draft.textContent === 'Preserve translation draft.' && selection.anchorNode === selected && selection.toString() === selectionText;
  const cleanup = () => {
    feed.removeEventListener('scroll', scrolled); feed.removeEventListener('scrollend', ended); mutations.disconnect();
    if (Object.getOwnPropertyDescriptor(document, 'createTreeWalker')?.value === treeWrapped) { if (treeDescriptor) Object.defineProperty(document, 'createTreeWalker', treeDescriptor); else delete document.createTreeWalker; }
    for (const restore of walkerRestores) restore(); controller.dispose(); selection.removeAllRanges(); delete window.__translationScrollFixture;
  };
  window.__translationScrollFixture = { cleanup };
  try {
    stage = 'stable-ready-motion';
    const pureMotion = await motion(1500), stable = { motion: pureMotion, ...counts, nativeMutations, observedMutations, identity: identity(), readyCount: history.length };
    check(stable.nativeMutations === 0 && stable.identity && pureMotion.oldHeight === pureMotion.newHeight, 'Pure-motion preconditions', stable);
    stable.passed = stable.bodyPasses === 0 && stable.bodyVisited === 0;
    stage = 'new-prose-during-motion'; let addition;
    const addedSource = 'New native narration arrives during smooth scrolling.';
    const newMotion = await motion(2200, () => { addition = createMessage(101, addedSource); });
    const addedBatch = await take(addedSource); finishBatch(addedBatch, 'Новое повествование '); await settle();
    check(addition.node.data.startsWith('Новое повествование '), 'New prose translation missing');
    stage = 'class-reveal'; const hidden = document.getElementById('class-only'), hiddenNode = hidden.firstChild, hiddenSource = hiddenNode.data;
    check(getComputedStyle(hidden).display === 'none', 'Class reveal setup'); hidden.classList.remove('native-hidden');
    const revealedBatch = await take(hiddenSource); finishBatch(revealedBatch, 'Открытое повествование '); await settle();
    check(hidden.firstChild === hiddenNode && hiddenNode.data.startsWith('Открытое повествование '), 'Class reveal discovery/identity');
    check(getComputedStyle(document.getElementById('resize-only')).display === 'none', 'Resize CSS setup requires narrow viewport', { width: innerWidth });
    const preResize = { stable, newMotion, newText: addition.node.data, classText: hiddenNode.data, identity: identity(), width: innerWidth };
    window.__translationScrollFixture.resize = async () => {
      stage = 'actual-window-resize'; const resize = document.getElementById('resize-only'), resizeNode = resize.firstChild, resizeSource = resizeNode.data;
      await wait('Actual resize CSS visibility did not change', () => innerWidth >= 1200 && getComputedStyle(resize).display !== 'none');
      const resizeBatch = await take(resizeSource); finishBatch(resizeBatch, 'Изменённое окно '); await settle();
      check(resize.firstChild === resizeNode && resizeNode.data.startsWith('Изменённое окно '), 'Resize-only discovery/identity');
      stage = 'pending-viewport-priority';
      const topSource = 'Earlier pending ordinary narration needs translation.', bottomSource = 'Latest pending ordinary narration needs translation.';
      const top = createMessage(201, topSource, true), bottom = createMessage(202, bottomSource); await settle();
      const priorityMotion = await motion(feed.scrollHeight - feed.clientHeight);
      controller.retry(); const batch = controller.collect();
      const topRect = top.p.getBoundingClientRect(), bottomRect = bottom.p.getBoundingClientRect();
      check(topRect.bottom < 0 && bottomRect.top >= 0 && bottomRect.bottom < innerHeight, 'Viewport priority geometry', { top: topRect.toJSON(), bottom: bottomRect.toJSON(), viewport: innerHeight });
      check(batch.nodes.length === 2 && batch.nodes[0].text === bottomSource && batch.nodes[1].text === topSource, 'Public collect must use current viewport priority', batch.nodes);
      const result = { passed: stable.passed && identity(), stable, controls: { passed: identity(), newMotion, classDiscovered: true, actualResize: { before: preResize.width, after: innerWidth, text: resizeNode.data }, priorityMotion, pendingOrder: batch.nodes.map(item => item.text) }, counts: { ...counts }, identity: identity() };
      cleanup(); return result;
    };
    return preResize;
  } catch(error) { cleanup(); throw error; }
}
function prepare() {
  const root = process.env.FABLES_TEST_APP_ROOT || path.resolve(__dirname, '../..');
  const filename = path.join(root, 'dist/translation/translation-dom.js');
  const { installTranslationDom } = require(filename), { localTranslation } = require(path.join(root, 'dist/translation/translation-core'));
  for (const source of [scenario, installTranslationDom, localTranslation]) new vm.Script(`(${source.toString()})`);
  return { install: installTranslationDom.toString(), local: localTranslation.toString(), metadata: { root, compiledSHA256: sha(fs.readFileSync(filename)), functionSHA256: sha(installTranslationDom.toString()), fixtureSHA256: sha(fs.readFileSync(__filename)) } };
}
module.exports = { scenario, prepare };
if (!process.versions.electron) {
  new vm.Script(`(${scenario.toString()})`); console.log('TRANSLATION_SCROLL_STATIC', JSON.stringify({ fixtureSHA256: sha(fs.readFileSync(__filename)), scenarioSHA256: sha(scenario.toString()) }));
} else {
  const { app, BrowserWindow, session } = require('electron'); app.on('window-all-closed', () => {});
  let win, ownedProfile, passed = false;
  const timer = setTimeout(() => { console.error('Translation scroll fixture hard30s deadline'); win?.destroy(); app.exit(1); }, 30000);
  (async () => { try {
    const code = prepare(); console.log('TRANSLATION_SCROLL_SOURCE', JSON.stringify(code.metadata));
    const profile = process.env.FABLES_TEST_PROFILE_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ff-translation-scroll-')); if (!process.env.FABLES_TEST_PROFILE_DIR) ownedProfile = profile;
    app.setPath('userData', profile); await app.whenReady();
    const site = session.fromPartition('translation-scroll-private'); site.protocol.handle('https', () => new Response('<!doctype html><style>' + css + '</style>', { headers: { 'Content-Type': 'text/html' } }));
    win = new BrowserWindow({ show: false, width: 1100, height: 820, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await win.loadURL('https://play.fables.gg/fixture/play'); win.show(); win.focus(); win.webContents.focus();
    const until = Date.now() + 2000; let ready = false;
    while (Date.now() < until) { ready = await win.webContents.executeJavaScript("document.visibilityState==='visible'&&document.hasFocus()"); if (win.isVisible() && win.isFocused() && ready) break; await new Promise(resolve => setTimeout(resolve, 25)); }
    assert(win.isVisible() && win.isFocused() && ready, 'Visible focused native window required');
    const first = await win.webContents.executeJavaScript(`(${scenario.toString()})(${code.install},${code.local})`);
    console.log('TRANSLATION_SCROLL_BEFORE_RESIZE', JSON.stringify(first));
    win.setContentSize(1300, 820);
    const result = await win.webContents.executeJavaScript('window.__translationScrollFixture.resize()');
    console.log('TRANSLATION_SCROLL_RESULT', JSON.stringify(result)); assert.equal(result.passed, true, 'Pure native scrolling walked unchanged document or discovery/preservation failed'); passed = true;
  } catch(error) { console.error(error); } finally {
    if (win && !win.isDestroyed()) await win.webContents.executeJavaScript('window.__translationScrollFixture?.cleanup()').catch(() => {});
    clearTimeout(timer); win?.destroy(); if (ownedProfile) fs.rmSync(ownedProfile, { recursive: true, force: true }); app.exit(passed ? 0 : 1);
  } })();
}
