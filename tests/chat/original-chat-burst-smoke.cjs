// ROOT-scheduled finite native fixture; no live session, translator, model or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function instrument(fn, rules) {
  let source = fn.toString();
  for (const [needle, name, amount = '1'] of rules) {
    assert.equal(source.split(needle).length - 1, 1, `Instrumentation boundary ${name}`);
    source = source.replace(needle, `${needle} window.__burstCounts.${name}=(window.__burstCounts.${name}||0)+(${amount});`);
  }
  new vm.Script(`(${source})`);
  return source;
}

function sources(root) {
  const { configureChatAppearance } = require(path.join(root, 'dist/appearance/chat-appearance'));
  const { configureMessageCommands, formatMessageCommand } = require(path.join(root, 'dist/commands/message-commands'));
  const { configureCampaignChatPages } = require(path.join(root, 'dist/chat/campaign-chat'));
  const { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
  return {
    appearance: instrument(configureChatAppearance, [
      ['function scan() {', 'appearanceScan'], ['function snapshotMessages(cards, changedBodies = new Set()) {', 'snapshotPass'],
      ['function safeClone(body, translationPreview = false) {', 'safeClone'], ['function preferScrollAnchor() {', 'anchorPass'],
      [`for (const card of cards ?? document.querySelectorAll('[id^="event-message-card-"]')) {`, 'snapshotCards'],
      ['const observer = new MutationObserver(records => {', 'appearanceRecords', 'records.length'],
    ]),
    commands: instrument(configureMessageCommands, [['function scan() {', 'commandsScan'], ['function render(entry) {', 'commandsRender']]),
    pages: instrument(configureCampaignChatPages, [['function scan() {', 'pageScan'], ['function normalize(query) {', 'normalize']]),
    format: formatMessageCommand.toString(), settings: DEFAULT_APPEARANCE,
  };
}

async function scenario(mode, code) {
  const check = (condition, message) => { if (!condition) throw Error(`${mode}: ${message}`); };
  const task = () => new Promise(resolve => setTimeout(resolve, 0));
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { await task(); await frame(); await frame(); };
  const count = name => { window.__burstCounts[name] = (window.__burstCounts[name] || 0) + 1; };
  const absent = () => check(!window.__friendsFablesDesktopTranslation, 'Translator must stay absent');
  window.__burstCounts = {};
  const campaign = '01a0d854-78d5-7064-ae41-f63d561c8e01';
  document.body.innerHTML = '<section id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><footer id="footer"><div class="grid relative"><div id="composer" class="bg-gray-800/80"><button aria-label="More actions">Actions</button><div id="editor-content"></div><button id="send" aria-label="Send message">Send</button></div></div></footer></section>';
  const editor = window.createBurstEditor(document.getElementById('editor-content'));
  const editorElement = editor.view.dom;
  editorElement.editor = editor;
  const feed = document.getElementById('feed'), list = document.getElementById('events-list');
  const send = document.getElementById('send'), footer = document.getElementById('footer');
  // Observe native completion throughout the fixture, including motion already
  // in progress when a checkpoint begins. Position stability alone precedes
  // Chromium's scrollend and the adapter's finite anchor/style cleanup.
  let scrollActive = false;
  const scrollActivity = () => { scrollActive = true; };
  const scrollCompletion = () => { scrollActive = false; };
  feed.addEventListener('scroll', scrollActivity);
  feed.addEventListener('scrollend', scrollCompletion);
  const draftIdentity = editorElement;
  const event = (id, content = `Native narration ${id}`) => ({ id, role: id === null || id >= 140 ? 'player' : 'dm', content, campaign_id: campaign, character_id: 42, ...(id === null ? { isOptimistic: true } : {}) });
  const page = (start, end, direction) => ({ data: Array.from({ length: end - start + 1 }, (_, i) => event(start + i)), hasPreviousPage: true, hasNextPage: false, previousCursor: start, nextCursor: end, ...(direction ? { direction } : {}) });
  const listeners = new Set(), cards = new Map(), blank = new Set(), deleted = new Set();
  const accepted = [], trusted = [], samples = [], keyEvents = [];
  let nextID = 140, pending = null;
  const query = { queryKey: ['events', campaign], options: { maxPages: 3 }, state: { dataUpdatedAt: 123, data: { pages: [page(100, 114, 'backward'), page(115, 129), page(130, 139)], pageParams: [{ cursor: 115, direction: 'backward' }, null, null] } },
    setData(data, options) {
      check(options.updatedAt === 123 && options.manual === true, 'Native query metadata changed');
      count('nativeWrites'); this.state.data = data;
      for (const listener of [...listeners]) listener({});
      render(); return this.state.data;
    },
  };
  const originalSetter = query.setData;
  const observer = { options: { queryKey: query.queryKey, maxPages: 3 }, getCurrentQuery: () => query, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
  const hook = { memoizedState: observer, next: null };
  function render() {
    count('nativeRender');
    const rows = query.state.data.pages.flatMap(item => item.data), wanted = new Set(rows.map(item => item.id));
    for (const [id, item] of cards) if (!wanted.has(id)) { item.row.remove(); cards.delete(id); }
    for (const native of rows) {
      let item = cards.get(native.id);
      if (!item) {
        const row = document.createElement('div'); row.id = `event-${native.id}`;
        row.innerHTML = `<div id="event-container-${native.id}"><div class="card" id="event-message-card-${native.id}"><div class="author">Native author</div><div class="prose"><div class="space-y-4 whitespace-normal"><p></p></div></div></div></div>`;
        const card = row.querySelector('.card'), body = card.querySelector('.prose'), text = body.querySelector('p').appendChild(document.createTextNode(''));
        if (native.id === null) { const hidden = document.createElement('p'); hidden.setAttribute('data-ff-desktop-hidden-instructions', 'true'); hidden.style.display = 'none'; hidden.textContent = '[[FF-SP:1]] PRIVATE-FIXTURE-GUIDANCE [[/FF-SP:1]]'; body.append(hidden); }
        item = { row, card, body, text }; cards.set(native.id, item); list.append(row);
      }
      item.card.__reactFiber$fixture = { memoizedProps: { event: native }, memoizedState: hook, return: null };
      const value = blank.has(native.id) ? '' : native.content;
      if (item.text.data !== value) item.text.data = value;
    }
  }
  render();
  // Register before production window capture handlers may stop propagation.
  window.addEventListener('keydown', input => {
    if (input.key !== 'Enter') return;
    trusted.push(input.isTrusted);
    const entry = { trusted: input.isTrusted, target: input.target?.id || input.target?.className || input.target?.nodeName, editorTarget: editorElement.contains(input.target), defaultPreventedAtCapture: input.defaultPrevented };
    keyEvents.push(entry); queueMicrotask(() => { entry.defaultPreventedAfterDispatch = input.defaultPrevented; });
  }, true);
  const configure = eval(`(${code.appearance})`); configure(code.settings);
  if (mode !== 'appearance') eval(`(${code.commands})`)(true, 'en', eval(`(${code.format})`));
  if (mode === 'combined') eval(`(${code.pages})`)(true);
  function nativeSend() {
    count('nativeSendAttempts');
    if (pending || send.disabled || !editor.getText().trim()) return;
    const content = editor.getText(); accepted.push(content); count('accepted');
    send.disabled = true; pending = { content, id: nextID++ };
    const current = query.state.data;
    const temporary = { data: [event(null, content)], previousCursor: 100, nextCursor: undefined, hasPreviousPage: true, hasNextPage: false };
    query.setData({ ...current, pages: [...current.pages, temporary], pageParams: [...current.pageParams, null] }, { updatedAt: 123, manual: true });
    window.__friendsFablesDesktopChatAppearance.followAfterSubmit();
  }
  send.addEventListener('click', nativeSend);
  // Commands intercepts Enter at window capture; baseline uses the native editor handler.
  document.getElementById('editor-content').addEventListener('keydown', input => {
    if (input.key !== 'Enter' || input.shiftKey) return;
    count('nativeEditorEnter');
    check(input.isTrusted, 'Native editor received a synthetic Enter'); input.preventDefault(); nativeSend();
  }, true);
  await settle(); feed.scrollTop = feed.scrollHeight - feed.clientHeight; await settle();
  const glyph = item => {
    const shown = item.card.querySelector('[data-ff-desktop-message-snapshot]') || item.body;
    const walker = document.createTreeWalker(shown, NodeFilter.SHOW_TEXT); let text;
    while ((text = walker.nextNode())) { if (!text.data.trim()) continue; const range = document.createRange(); range.selectNodeContents(text); if ([...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0)) return true; }
    return false;
  };
  function identity() {
    absent(); check(editor.view.dom === draftIdentity && editorElement.isConnected, 'Native editor replaced');
    const ids = query.state.data.pages.flatMap(item => item.data.map(row => row.id));
    check(ids.length === new Set(ids).size, 'Duplicate native event IDs');
    for (const id of deleted) check(!ids.includes(id) && !document.getElementById(`event-message-card-${id}`), 'Deleted history resurrected');
    for (const id of ids) { const item = cards.get(id); check(item?.row.isConnected && item.card.querySelector('.prose') === item.body && item.text.isConnected, `Native body identity lost: ${id}`); }
    check(!document.querySelector('[data-ff-desktop-message-snapshot] [data-ff-desktop-hidden-instructions]'), 'Private guidance copied');
    for (const overlay of document.querySelectorAll('[data-ff-desktop-message-snapshot]')) check(!overlay.textContent.includes('PRIVATE-FIXTURE-GUIDANCE'), 'Private guidance text resurrected');
  }
  async function checkpoint(label, visibleIDs = []) {
    // Quiet work is measured only after native motion and its finite cleanup.
    const position = () => ({ scrollTop: feed.scrollTop, target: feed.scrollHeight - feed.clientHeight, scrollActive, counts: { ...window.__burstCounts } });
    const quietKeys = ['appearanceRecords', 'appearanceScan', 'snapshotPass', 'snapshotCards', 'safeClone', 'commandsScan', 'commandsRender', 'nativeWrites', 'nativeRender'];
    const entry = position(), scrollEnds = [], completionSamples = [];
    const ended = () => scrollEnds.push(position());
    feed.addEventListener('scrollend', ended);
    let baseline, after;
    try {
      await settle(); identity();
      for (const id of visibleIDs) check(glyph(cards.get(id)), `Previously ready body blank: ${label}/${id}`);
      let completionFrames = 0;
      const unchanged = (left, right) => Math.abs(left.scrollTop - right.scrollTop) <= .5 && left.target === right.target
        && quietKeys.every(key => (left.counts[key] || 0) === (right.counts[key] || 0));
      const completionFrame = async () => {
        check(completionFrames < 90, `Native scroll/cleanup did not become quiet: ${label}; ${JSON.stringify({ entry, current: position(), scrollEnds, completionSamples })}`);
        await frame(); completionFrames++; const current = position(); completionSamples.push(current); return current;
      };
      let previous = position(), stable = 0;
      for (;;) {
        const current = await completionFrame();
        stable = unchanged(previous, current) ? stable + 1 : 0; previous = current;
        if (stable < 2) continue;
        // Instant/clamped scroll events need not provide scrollend. Require
        // measured position AND work counters to settle, then drain pending
        // event/anchor cleanup before starting the unchanged strict quiet test.
        await task(); const first = await completionFrame(), last = await completionFrame();
        if (unchanged(current, first) && unchanged(first, last)) break;
        previous = last; stable = 0;
      }
      identity();
      for (const id of visibleIDs) check(glyph(cards.get(id)), `Previously ready body blank: ${label}/${id}`);
      baseline = position(); baseline.completionFrames = completionFrames;
      await settle(); after = position();
    } finally { feed.removeEventListener('scrollend', ended); }
    const before = baseline.counts;
    const quietMotion = { entry, baseline, after, scrollEnds, completionSamples };
    // Interval discovery is allowed. Its normalization call is counted separately.
    for (const key of quietKeys) check((window.__burstCounts[key] || 0) === (before[key] || 0), `Unsolicited quiet work: ${label}/${key}; scroll diagnostic ${JSON.stringify(quietMotion)}`);
    const sample = { label, counts: { ...window.__burstCounts }, quietMotion, pageLengths: query.state.data.pages.map(item => item.data.length), accepted: accepted.length, pending: !!pending, trusted: [...trusted] };
    samples.push(sample); return sample;
  }

  window.__burst = {
    async prepare(content) {
      absent(); editor.commands.setContent(`<p>${content}</p>`); editor.commands.focus('end'); editorElement.dispatchEvent(new Event('input', { bubbles: true }));
      const deadline = performance.now() + 1000;
      const ready = () => { const selection = window.getSelection(); return document.hasFocus() && (document.activeElement === editorElement || editorElement.contains(document.activeElement)) && selection && editorElement.contains(selection.anchorNode) && editorElement.contains(selection.focusNode); };
      while (!ready()) { if (performance.now() >= deadline) throw Error('Native input focus/selection not ready: ' + JSON.stringify(await window.__burst.diagnostic('focus-readiness-failed'))); await frame(); }
      return { ready: true, content, pending: !!pending };
    },
    async checkpoint(label) { return checkpoint(label, pending ? [null] : []); },
    async sentReady(label) {
      const deadline = performance.now() + 1000;
      while (!pending) { if (performance.now() >= deadline) throw Error('Native submission not ready: ' + JSON.stringify(await window.__burst.diagnostic(label + '/send-readiness-failed'))); await new Promise(resolve => setTimeout(resolve, 4)); }
      return checkpoint(label, [null]);
    },
    async diagnostic(label, heartbeat = false) {
      if (heartbeat) { await settle(); count('diagnosticHeartbeat'); }
      const selection = window.getSelection();
      return { label, heartbeat, documentFocused: document.hasFocus(), activeElement: document.activeElement?.id || document.activeElement?.className || document.activeElement?.nodeName, editorFocused: editorElement === document.activeElement || editorElement.contains(document.activeElement), editorSelectionOwned: !!selection && editorElement.contains(selection.anchorNode) && editorElement.contains(selection.focusNode), editorConnected: editorElement.isConnected, draft: editor.getText(), draftHTML: editor.getHTML(), accepted: [...accepted], pending, sendDisabled: send.disabled, keys: keyEvents.map(item => ({ ...item })), counts: { ...window.__burstCounts } };
    },
    async confirm() {
      check(pending, 'No accepted native submission');
      const { id, content } = pending, temporary = cards.get(null); check(temporary && glyph(temporary), 'Optimistic card was never visibly ready');
      const current = query.state.data, confirmed = current.pages.filter(item => !item.data.some(row => row.isOptimistic === true)).map(item => ({ ...item }));
      const incomingPages = [...confirmed, { data: [event(id, content)], previousCursor: 100, nextCursor: undefined, hasPreviousPage: true, hasNextPage: false }].slice(-3);
      const incomingParams = [...current.pageParams.slice(0, confirmed.length), null].slice(-3); incomingParams[0] = { cursor: incomingPages[0].previousCursor, direction: 'backward' };
      const beforeIDs = new Set(current.pages.flatMap(item => item.data.map(row => row.id)).filter(value => value !== null));
      blank.add(id); query.setData({ ...current, pages: incomingPages, pageParams: incomingParams }, { updatedAt: 123, manual: true });
      await frame(); identity(); check(glyph(cards.get(id)), 'Optimistic-confirmed gap lost visible body');
      if (mode === 'combined' && beforeIDs.size + 1 <= 45) for (const old of beforeIDs) check(cards.has(old), `Ordinary append discarded history below capacity: ${old}`);
      const item = cards.get(id), textIdentity = item.text;
      blank.delete(id); render(); await checkpoint(`confirmed-${id}`, [id]);
      item.text.data = ''; await frame(); check(glyph(item), 'Same-body hydration gap blank');
      item.text.data = content; await checkpoint(`hydrated-${id}`, [id]); check(item.text === textIdentity, 'Hydration replaced native Text');
      pending = null; send.disabled = false;
      return { id, content, accepted: [...accepted] };
    },
    async deletion() {
      deleted.add(110); const current = query.state.data;
      query.setData({ ...current, pages: current.pages.map(item => ({ ...item, data: item.data.filter(row => row.id !== 110) })) }, { updatedAt: 123, manual: true });
      return checkpoint('explicit-history-delete');
    },
    async finish() {
      editor.commands.setContent('<p>Preserve native draft.</p>'); const draftText = editorElement.querySelector('p').firstChild;
      await checkpoint('final');
      check(editor.getText() === 'Preserve native draft.' && editorElement.querySelector('p').firstChild === draftText, 'Quiet phase changed draft');
      check(trusted.length === 8 && trusted.every(Boolean), 'Eight actual native Enter events required');
      check(accepted.length === 5, 'Four ordinary sends and one native-pending rapid send required');
      const tail = cards.get(nextID - 1), range = document.createRange(); range.selectNodeContents(tail.text);
      check(range.getBoundingClientRect().bottom <= Math.min(feed.getBoundingClientRect().bottom, footer.getBoundingClientRect().top) + .5, 'Final glyph occluded by footer');
      const retained = tail.text; feed.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -300 })); feed.scrollTop = 200;
      feed.dispatchEvent(new Event('scrollend')); await settle();
      const top = feed.scrollTop; tail.text.data += ' Native late growth.'; await checkpoint('manual-reader');
      check(Math.abs(feed.scrollTop - top) <= .5 && retained === tail.text, 'Manual reader overridden');
      const final = { mode, passed: true, accepted, trusted, samples, counts: { ...window.__burstCounts } };
      window.__friendsFablesDesktopCommands?.dispose(); window.__friendsFablesDesktopCampaignChatPages?.dispose(); window.__friendsFablesDesktopChatAppearance.dispose();
      check(!listeners.size && query.setData === originalSetter, 'Query subscription/setter leaked');
      check(!document.querySelector('[data-ff-desktop-message-snapshot],[data-ff-desktop-command-controls]'), 'Owned presentation leaked after dispose'); feed.removeEventListener('scroll', scrollActivity); feed.removeEventListener('scrollend', scrollCompletion); editor.destroy();
      return final;
    },
  };
  return checkpoint('ready');
}

module.exports = { instrument, sources, scenario };

if (process.argv.includes('--syntax')) {
  const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
  const code = sources(root); new vm.Script(`(${scenario.toString()})`);
  console.log('Original chat fixture serialized sources parsed; exact counter boundaries matched.');
} else if (process.versions.electron) {
  const { app, BrowserWindow, session } = require('electron');
  const os = require('node:os');
  const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
  let window, profile, passed = false;
  const started = Date.now(); let stage = 'startup';
  const timer = setTimeout(() => { console.error('Original chat fixture deadline', { stage, elapsedMs: Date.now() - started }); window?.destroy(); app.exit(1); }, 45000);
  app.on('window-all-closed', () => {});
  (async () => {
    try {
      const code = sources(root);
      const editorScript = require('esbuild').buildSync({ stdin: { contents: "import {Editor} from '@tiptap/core';import StarterKit from '@tiptap/starter-kit';window.createBurstEditor=element=>new Editor({element,extensions:[StarterKit],content:'<p></p>'});", resolveDir: root }, bundle: true, write: false, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
      profile = process.env.FABLES_TEST_PROFILE_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'ff-original-chat-'));
      app.setPath('userData', profile); await app.whenReady();
      for (const mode of ['appearance', 'commands', 'combined']) {
        const site = session.fromPartition(`original-chat-${mode}`);
        site.protocol.handle('https', request => {
          assert.equal(new URL(request.url).hostname, 'play.fables.gg');
          return new Response('<!doctype html><meta charset="utf-8"><style>body{margin:0}#chat{position:relative;height:620px;width:850px;margin:20px}#feed{box-sizing:border-box;height:100%;overflow-y:auto;padding-bottom:160px}.card{position:relative;padding:8px}.author{height:18px}.prose p{margin:0;line-height:24px}#footer{position:absolute;bottom:0;left:0;right:0;height:120px;background:#123}.tiptap{min-height:32px}#composer{position:relative}</style><body></body>', { headers: { 'Content-Type': 'text/html' } });
        });
        window = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
        const contents = window.webContents;
        const step = async (name, source) => { stage = `${mode}/${name}`; console.log('Original chat step', stage); return contents.executeJavaScript(source); };
        await contents.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play'); window.show(); window.focus(); contents.focus(); assert(window.isVisible());
        await step('editor-bootstrap', editorScript);
        await step('install', `(${scenario.toString()})(${JSON.stringify(mode)},${JSON.stringify(code)})`);
        await step('delete-history', '__burst.deletion()');
        const enter = () => { contents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); contents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' }); };
        for (const draft of ['qaz', 'wsxed', 'rfvtg', 'yhnuj']) {
          await step(`prepare-${draft}`, `__burst.prepare(${JSON.stringify(draft)})`);
          enter();
          // Observe actual commands16ms/native send state; parent deadline bounds this wait.
          await step(`send-ready-${draft}`, '__burst.sentReady("ordinary-send")');
          await step(`confirm-${draft}`, '__burst.confirm()');
        }
        for (const draft of ['plmok', 'ijnuh', 'bygvt', 'crdxz']) { await step(`rapid-${draft}`, `__burst.prepare(${JSON.stringify(draft)})`); enter(); }
        await step('rapid-ready', '__burst.sentReady("rapid-send")');
        await step('rapid-confirm', '__burst.confirm()');
        const result = await step('finish', '__burst.finish()'); assert.equal(result.passed, true); console.log('Original chat result', JSON.stringify(result)); window.destroy(); window = null;
      }
      passed = true;
    } catch (error) { console.error('Original chat fixture failed', { stage }, error); }
    finally { clearTimeout(timer); window?.destroy(); if (profile && !process.env.FABLES_TEST_PROFILE_DIR) fs.rmSync(profile, { recursive: true, force: true }); app.exit(passed ? 0 : 1); }
  })();
}
