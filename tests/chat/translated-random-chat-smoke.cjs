// ROOT-scheduled private native fixture: eight accepted random-English sends.
// Query/render/readiness shapes copied at author time from original-chat-burst;
// never import that Electron entry point from this fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const drafts = ['qaz', 'wsxed', 'rfvtg', 'yhnuj', 'plmokijnuh', 'qazwsxedcrfvtgbyhnujmikolp', 'bygvt crdxz', 'tgbnhy ujmkiol'];
function sources(root) {
  const { configureChatAppearance } = require(path.join(root, 'dist/appearance/chat-appearance'));
  const { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
  const { configureInstructionHiding } = require(path.join(root, 'dist/commands/host-instructions-dom'));
  const { configureMessageCommands, formatMessageCommand } = require(path.join(root, 'dist/commands/message-commands'));
  const { instructionDocument } = require(path.join(root, 'dist/commands/host-instructions-core'));
  const { configureCampaignChatPages } = require(path.join(root, 'dist/chat/campaign-chat'));
  const { installTranslationDom } = require(path.join(root, 'dist/translation/translation-dom'));
  const { localTranslation, RUSSIAN_DICTIONARY } = require(path.join(root, 'dist/translation/translation-core'));
  const dictionary = { ...RUSSIAN_DICTIONARY };
  // Finite local-cache equivalent: historical English sources paint their known
  // Russian translations through the real controller, without model requests.
  for (let id = 100; id < 140; id++) dictionary[`fixture archive ${id}.`] = `Архивная запись ${id}.`;
  return { appearance: configureChatAppearance.toString(), hiding: configureInstructionHiding.toString(), commands: configureMessageCommands.toString(), format: formatMessageCommand.toString(), instruction: instructionDocument.toString(), pages: configureCampaignChatPages.toString(), install: installTranslationDom.toString(), local: localTranslation.toString(), dictionary,
    settings: { ...DEFAULT_APPEARANCE, preset: 'website', messages: { ...DEFAULT_APPEARANCE.messages, enabled: true } } };
}
async function randomScenario(code, expectedDrafts) {
  const check = (value, message) => { if (!value) throw Error(`Translated random chat: ${message}`); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { await pause(0); await frame(); await frame(); };
  const stage = name => console.log('RANDOM-STAGE', name);
  const campaign = '01a0d854-78d5-7064-ae41-f63d561c8e01', token = 'translated-random-eight';
  document.body.innerHTML = '<section id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><footer id="footer"><div class="grid relative"><div id="composer" class="bg-gray-800/80"><button aria-label="More actions">Actions</button><div id="editor-content"></div><button id="send" aria-label="Send message">Send</button></div></div></footer></section>';
  const editor = window.createRandomEditor(document.getElementById('editor-content'));
  const editorElement = editor.view.dom; editorElement.editor = editor;
  const list = document.getElementById('events-list'), feed = document.getElementById('feed'), send = document.getElementById('send');
  const cards = new Map(), listeners = new Set(), accepted = [], trusted = [], blank = new Set(), phases = [];
  const counts = { records: 0, childList: 0, characterData: 0, attributes: 0, connectedRemovals: 0, detachedRemovals: 0, nativeWrites: 0, nativeRenders: 0, beats: 0, capHit: false };
  const heartbeat = setInterval(() => counts.beats++, 25);
  const diagnostics = new MutationObserver(records => { for (const record of records) { if (counts.records >= 4096) { counts.capHit = true; diagnostics.disconnect(); break; } counts.records++; counts[record.type]++; } });
  diagnostics.observe(list, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'data-ff-translation-ignore', 'data-ff-translation-blank', 'data-ff-translation-pending', 'data-ff-desktop-hidden-instructions', 'data-ff-desktop-instruction-block'] });
  const originalRemove = Element.prototype.remove;
  Element.prototype.remove = function () { counts[this.isConnected ? 'connectedRemovals' : 'detachedRemovals']++; return Reflect.apply(originalRemove, this, arguments); };
  let nextID = 140, pending;
  const event = (id, bodySource = `Fixture archive ${id}.`, fullContent = bodySource, html) => ({ id, role: 'player', content: fullContent, bodySource, html, campaign_id: campaign, character_id: 42, ...(id === null ? { isOptimistic: true } : {}) });
  const page = (start, end, direction) => ({ data: Array.from({ length: end - start + 1 }, (_, i) => event(start + i)), hasPreviousPage: true, hasNextPage: false, previousCursor: start, nextCursor: end, ...(direction ? { direction } : {}) });
  const query = { queryKey: ['events', campaign], options: { maxPages: 3 }, state: { dataUpdatedAt: 123, data: { pages: [page(100, 114, 'backward'), page(115, 129), page(130, 139)], pageParams: [{ cursor: 115, direction: 'backward' }, null, null] } },
    setData(data, options) { check(options.updatedAt === 123 && options.manual === true, 'native query metadata changed'); counts.nativeWrites++; this.state.data = data; for (const listener of [...listeners]) listener({}); render(); return this.state.data; } };
  const originalSetter = query.setData;
  const queryObserver = { options: { queryKey: query.queryKey, maxPages: 3 }, getCurrentQuery: () => query, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
  const hook = { memoizedState: queryObserver, next: null };
  function render() {
    counts.nativeRenders++;
    const rows = query.state.data.pages.flatMap(item => item.data), wanted = new Set(rows.map(item => item.id));
    for (const [id, item] of cards) if (!wanted.has(id)) { item.row.remove(); cards.delete(id); }
    for (const native of rows) {
      let item = cards.get(native.id);
      if (!item) {
        const row = document.createElement('div'); row.id = `event-${native.id}`;
        row.innerHTML = `<div id="event-container-${native.id}"><div class="card" id="event-message-card-${native.id}"><div class="author">Мира</div><div class="prose"><div class="space-y-4 whitespace-normal"><p></p></div></div></div></div>`;
        const card = row.querySelector('.card'), body = card.querySelector('.prose'), paragraph = body.querySelector('p'), text = paragraph.appendChild(document.createTextNode(''));
        let guidance, guidanceText;
        if (native.html) {
          const parsed = document.createElement('template'); parsed.innerHTML = native.html;
          const blocks = [...parsed.content.children]; check(blocks.length === 2 && blocks[1].textContent.startsWith('[[FF-SP:1]]') && blocks[1].textContent.endsWith('[[/FF-SP:1]]'), 'native submitted HTML lacks one actual guidance block');
          guidance = blocks[1]; guidanceText = guidance.firstChild; paragraph.after(guidance);
        }
        item = { row, card, body, paragraph, text, guidance, guidanceText, source: native.bodySource }; cards.set(native.id, item); list.append(row);
      }
      item.card.__reactFiber$fixture = { memoizedProps: { event: native }, memoizedState: hook, return: null };
      const value = blank.has(native.id) ? '' : native.bodySource;
      // React owns the source prop, while translation owns its presentation.
      // An unchanged native prop must not reset legitimately translated text.
      if (item.nativeValue !== value) { if (item.text.data !== value) item.text.data = value; item.nativeValue = value; }
    }
  }
  render();
  // Observe trusted keys before the production capture handler can stop them.
  window.addEventListener('keydown', input => { if (input.key === 'Enter') trusted.push(input.isTrusted); }, true);
  function nativeSend() {
    if (pending || send.disabled || !editor.getText().trim()) return;
    const json = editor.getJSON(), html = editor.getHTML(), fullContent = editor.getText();
    const sourceDoc = eval(`(${code.instruction})`)(json, null);
    const bodySource = (sourceDoc.content || []).flatMap(node => (node.content || []).map(child => child.text || '')).join('');
    check(bodySource === expectedDrafts[accepted.length], 'accepted draft differs from prepared random input');
    check((html.match(/\[\[FF-SP:1\]\]/g) || []).length === 1, 'actual commands did not attach exactly one guidance block');
    pending = { id: nextID++, bodySource, fullContent, html }; accepted.push({ ...pending }); send.disabled = true;
    stage(`native-accepted-${accepted.length}`);
    const current = query.state.data;
    const temporary = { data: [event(null, bodySource, fullContent, html)], previousCursor: 100, nextCursor: undefined, hasPreviousPage: true, hasNextPage: false };
    query.setData({ ...current, pages: [...current.pages, temporary], pageParams: [...current.pageParams, null] }, { updatedAt: 123, manual: true });
    window.__friendsFablesDesktopChatAppearance.followAfterSubmit();
  }
  send.addEventListener('click', nativeSend);
  document.getElementById('editor-content').addEventListener('keydown', input => { if (input.key === 'Enter' && !input.shiftKey) { check(input.isTrusted, 'synthetic native editor Enter'); input.preventDefault(); nativeSend(); } }, true);
  eval(`(${code.hiding})`)(true); eval(`(${code.appearance})`)(code.settings);
  eval(`(${code.commands})`)(true, 'ru', eval(`(${code.format})`), { text: 'PRIVATE-FIXTURE-GUIDANCE', enabled: true, configured: true, hideMarked: true }, eval(`(${code.instruction})`));
  eval(`(${code.pages})`)(true);
  eval(`(${code.install})`)(token, code.dictionary, true, [], eval(`(${code.local})`), true, true);
  const translation = window.__friendsFablesDesktopTranslation;
  const snapshot = () => ({ ...counts });
  const quiet = (a, b) => ['records', 'connectedRemovals', 'detachedRemovals', 'nativeWrites', 'nativeRenders'].every(key => a[key] === b[key]);
  const identities = () => {
    check(window.__friendsFablesDesktopTranslation === translation && editor.view.dom === editorElement && editorElement.isConnected, 'active translator/native editor identity lost');
    const ids = query.state.data.pages.flatMap(item => item.data.map(row => row.id)); check(ids.length === new Set(ids).size, 'duplicate native IDs');
    for (const id of ids) { const item = cards.get(id); check(item?.row.isConnected && item.card.querySelector('.prose') === item.body && item.paragraph.firstChild === item.text && item.text.isConnected, `native body/Text identity lost: ${id}`); if (item.guidance) check(item.guidance.firstChild === item.guidanceText && item.guidance.isConnected && item.guidance.getAttribute('data-ff-translation-ignore') === 'true' && getComputedStyle(item.guidance).display === 'none', `guidance identity/visibility lost: ${id}`); }
    for (const overlay of list.querySelectorAll('[data-ff-desktop-message-snapshot]')) check(!overlay.textContent.includes('PRIVATE-FIXTURE-GUIDANCE'), 'snapshot exposed hidden guidance');
    check(!counts.capHit, 'diagnostic 4096-record budget exhausted (fixture budget, not freeze RED)');
  };
  // Finite glyph/geometry samples only at initial and final boundaries.
  const anchor = item => {
    if (!item) return undefined;
    const shown = item.body.querySelector('[data-ff-translation-placeholder]') || item.card.querySelector('[data-ff-desktop-message-snapshot]') || item.body;
    const walker = document.createTreeWalker(shown, NodeFilter.SHOW_TEXT); let text, glyph;
    while ((text = walker.nextNode())) {
      if (!text.data.trim()) continue;
      let visible = true;
      for (let parent = text.parentElement; parent; parent = parent.parentElement) { const style = getComputedStyle(parent); if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden' || style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)') visible = false; }
      if (!visible) continue;
      const range = document.createRange(); range.selectNodeContents(text); const rect = range.getClientRects()[0]; if (rect?.width > 0 && rect.height > 0) { glyph = { top: rect.top, left: rect.left }; break; }
    }
    const rect = item.card.getBoundingClientRect(); return { id: item.card.id, top: rect.top, left: rect.left, height: rect.height, glyph };
  };
  await settle(); feed.scrollTop = feed.scrollHeight - feed.clientHeight; await settle(); identities();
  const initialAnchor = anchor(cards.get(139)); check(initialAnchor.glyph, 'translated historical seed has no glyph');
  check(cards.get(139).text.data === 'Архивная запись 139.', 'known historical source was not translated through real local lookup');
  window.__random = {
    async prepare(content) {
      stage(`prepare-${accepted.length + 1}`); check(!pending, 'prior accepted send still pending');
      editor.commands.setContent(`<p>${content}</p>`); editor.commands.focus('end'); editorElement.dispatchEvent(new Event('input', { bubbles: true }));
      const deadline = performance.now() + 1000;
      while (!document.hasFocus() || document.activeElement !== editorElement || !editorElement.contains(window.getSelection()?.anchorNode)) { if (performance.now() >= deadline) throw Error('native editor focus/selection readiness failed'); await frame(); }
      return { ready: true, accepted: accepted.length };
    },
    async sentReady() {
      const deadline = performance.now() + 1000; while (!pending) { if (performance.now() >= deadline) throw Error('trusted Enter was not accepted'); await pause(4); }
      await settle(); identities(); return { accepted: accepted.length, source: pending.bodySource };
    },
    async confirm() {
      const { id, bodySource, fullContent, html } = pending; stage(`confirm-${id}`);
      const current = query.state.data, confirmed = current.pages.filter(item => !item.data.some(row => row.isOptimistic === true)).map(item => ({ ...item }));
      const pages = [...confirmed, { data: [event(id, bodySource, fullContent, html)], previousCursor: 100, nextCursor: undefined, hasPreviousPage: true, hasNextPage: false }].slice(-3);
      const pageParams = [...current.pageParams.slice(0, confirmed.length), null].slice(-3); pageParams[0] = { cursor: pages[0].previousCursor, direction: 'backward' };
      blank.add(id); query.setData({ ...current, pages, pageParams }, { updatedAt: 123, manual: true }); await settle(); identities();
      const item = cards.get(id), nativeText = item.text;
      blank.delete(id); render(); await settle(); identities(); check(item.text === nativeText, 'confirmation hydration replaced native Text');
      pending = null; send.disabled = false; return { accepted: accepted.length, id, pageLengths: query.state.data.pages.map(page => page.data.length) };
    },
    async finish() {
      stage('eight-accepted-producers-stopped');
      check(accepted.length === 8 && trusted.length === 8 && trusted.every(Boolean), 'exactly eight accepted sends/trusted Enters required');
      check(accepted.every((entry, i) => entry.bodySource === expectedDrafts[i]), 'accepted random strings changed');
      const ids = query.state.data.pages.flatMap(item => item.data.map(row => row.id));
      check(accepted.every(entry => ids.includes(entry.id)) && ids.length <= 45 && query.state.data.pages.length <= 3, 'latest eight IDs/capacity eviction contract');
      const request = [], requestIDs = new Set(), readyDeadline = performance.now() + 1000;
      while (request.length < 2) {
        const collected = translation.collect().nodes;
        check(collected.every(node => expectedDrafts.slice(6).includes(node.text) && !requestIDs.has(node.id)), `unexpected prose-gate request: ${JSON.stringify(collected)}`);
        for (const node of collected) { request.push(node); requestIDs.add(node.id); }
        check(request.length <= 2, 'prose gate produced more than two random requests');
        if (request.length === 2) break;
        if (performance.now() >= readyDeadline) throw Error(`real random translation request readiness timed out: ${JSON.stringify(request)}`);
        await pause(4);
      }
      stage('real-null-retry'); translation.finish(token, request.map(node => ({ id: node.id, version: node.version, text: null, complete: false, retry: true }))); await settle();
      stage('real-partial-whole-pending'); translation.finish(token, request.map(node => ({ id: node.id, version: node.version, text: node.text, complete: false, pending: [{ start: 0, end: node.text.length }] }))); await settle();
      // Re-collect marks real eligible entries waiting; the subsequent unchanged
      // poll must produce no second request and no connected presentation work.
      const waiting = translation.collect().nodes; check(waiting.length === 2 && waiting.every(node => request.some(original => original.id === node.id && original.version === node.version)), 'real partial entries did not immediately become collectable with unchanged versions'); await settle();
      for (const entry of accepted.slice(6)) { const item = cards.get(entry.id); check(item.body.hasAttribute('data-ff-translation-blank') && item.body.querySelector('[data-ff-translation-dot]') && Array.from((function* () { for (let node = item.paragraph; node && item.body.contains(node); node = node.parentElement) yield node; })()).some(node => { const style = getComputedStyle(node); return style.opacity === '0' || style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)'; }), 'actual pending random source lacks hidden-source/progress presentation'); }
      for (const entry of accepted.slice(0, 6)) check(cards.get(entry.id).text.data === entry.bodySource, 'single-token random text unexpectedly translated');
      editor.commands.setContent('<p>Сохранить родной черновик.</p>'); await settle(); const draftText = editorElement.querySelector('p').firstChild;
      await pause(250); phases.push(snapshot());
      const duplicate = translation.collect().nodes; check(duplicate.length === 0, 'unchanged waiting poll duplicated requests');
      await pause(250); phases.push(snapshot()); await pause(250); phases.push(snapshot());
      identities(); check(quiet(phases[0], phases[1]) && quiet(phases[1], phases[2]), 'connected mutations/removals continued after producers/partial results settled');
      check(phases[2].beats > phases[0].beats, 'renderer timer heartbeat stopped');
      check(editor.getText() === 'Сохранить родной черновик.' && editorElement.querySelector('p').firstChild === draftText, 'quiet phase changed native draft/Text');
      const finalAnchor = anchor(cards.get(139));
      // The seed may be legally evicted once the native window exceeds capacity.
      if (finalAnchor) check(finalAnchor.glyph && Math.abs(initialAnchor.height - finalAnchor.height) <= 1 && Math.abs((initialAnchor.glyph.top - initialAnchor.top) - (finalAnchor.glyph.top - finalAnchor.top)) <= 1, 'retained historical seed relative glyph/card anchor moved');
      const final = { passed: true, layout: 'dynamic', drafts: expectedDrafts, accepted: accepted.map(({ id, bodySource, fullContent }) => ({ id, bodySource, fullContent })), trusted, initialAnchor, finalAnchor, retainedIDs: ids, requests: request.map(({ text }) => text), phases, counts: snapshot(), noFreezeReproduced: true };
      window.__random.cleanup(); return final;
    },
    cleanup() { diagnostics.disconnect(); clearInterval(heartbeat); Element.prototype.remove = originalRemove; translation.dispose(); window.__friendsFablesDesktopCommands?.dispose(); window.__friendsFablesDesktopCampaignChatPages?.dispose(); window.__friendsFablesDesktopChatAppearance?.dispose(); check(!listeners.size && query.setData === originalSetter, 'query setter/subscription leaked'); editor.destroy(); },
  };
  return { ready: true, initialAnchor, historicalRows: cards.size };
}
module.exports = { sources, randomScenario, drafts };
if (process.argv.includes('--syntax')) {
  const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..'), code = sources(root);
  for (const name of ['appearance', 'hiding', 'commands', 'format', 'instruction', 'pages', 'install', 'local']) new vm.Script(`(${code[name]})`);
  new vm.Script(`(${randomScenario.toString()})(${JSON.stringify(code)},${JSON.stringify(drafts)})`); console.log('PASS: eight production controllers and random scenario serialize');
} else if (process.versions.electron) {
  const { app, BrowserWindow, session } = require('electron');
  const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..'); let window, profile, passed = false, stage = 'startup';
  const deadline = setTimeout(() => { console.error('Translated random hard15s deadline', { stage }); window?.destroy(); app.exit(1); }, 15000);
  app.on('window-all-closed', () => {});
  (async () => {
    try {
      const code = sources(root);
      const editorScript = require('esbuild').buildSync({ stdin: { contents: "import {Editor} from '@tiptap/core';import StarterKit from '@tiptap/starter-kit';window.createRandomEditor=element=>new Editor({element,extensions:[StarterKit],content:'<p></p>'});", resolveDir: root }, bundle: true, write: false, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
      profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-translated-random-')); app.setPath('userData', profile); await app.whenReady();
      const site = session.fromPartition('translated-random-eight');
      site.protocol.handle('https', request => { assert.equal(new URL(request.url).hostname, 'play.fables.gg'); return new Response('<!doctype html><meta charset="utf-8"><style>body{margin:0;color:#ddd;background:#222}#chat{position:relative;height:620px;width:850px;margin:20px}#feed{box-sizing:border-box;height:100%;overflow-y:auto;padding-bottom:160px}.card{position:relative;padding:8px}.author{height:18px}.prose p{margin:0;line-height:24px}#footer{position:absolute;bottom:0;left:0;right:0;height:120px;background:#123}.tiptap{min-height:32px}#composer{position:relative}</style><body></body>', { headers: { 'Content-Type': 'text/html' } }); });
      window = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
      const contents = window.webContents;
      contents.on('console-message', event => { if (/^RANDOM-STAGE\b/.test(event.message)) { stage = event.message; console.log(event.message); } });
      const step = async (label, source) => { stage = label; console.log('Random native step', stage); return contents.executeJavaScript(source); };
      await contents.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play'); window.show(); window.focus(); contents.focus(); assert(window.isVisible());
      await step('editor-bootstrap', editorScript); await step('install', `(${randomScenario.toString()})(${JSON.stringify(code)},${JSON.stringify(drafts)})`);
      for (const draft of drafts) {
        await step(`prepare-${draft}`, `__random.prepare(${JSON.stringify(draft)})`);
        contents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); contents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
        await step(`accepted-${draft}`, '__random.sentReady()'); await step(`confirm-${draft}`, '__random.confirm()');
      }
      const result = await step('finish', '__random.finish()'); assert.equal(result.passed, true); console.log('Translated random result', JSON.stringify(result)); passed = true;
    } catch (error) { console.error('Translated random fixture failed', { stage }, error); }
    finally { clearTimeout(deadline); window?.destroy(); if (profile) fs.rmSync(profile, { recursive: true, force: true }); app.exit(passed ? 0 : 1); }
  })().catch(error => { console.error(error); app.exit(1); });
}
