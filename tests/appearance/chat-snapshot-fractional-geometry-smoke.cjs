// ROOT-scheduled native CSSOM/continuity ownership regression; no fixture imports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const css = 'body{margin:0;font:16px Arial}#events-list{margin:20px}.card{position:relative;box-sizing:border-box;width:480px;padding:4px 16px 16px;border:1px solid transparent}.author{height:40px}.prose{font-size:16px;line-height:23.9971px}.integer .prose{line-height:24px}.prose p{margin:0}.space-y-4>p+p{margin-top:16px}';
async function scenario(configure, hide, settings) {
  const modes = ['fractional-empty-prior', 'fractional-existing-prior', 'integer-control', 'newer-native-value', 'newer-native-priority', 'dispose'];
  const cases = [];
  const check = (condition, message, detail) => { if (!condition) throw Error(message + ': ' + JSON.stringify(detail)); };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { await frame(); await frame(); await frame(); };
  const ordinary = 'Смотрю по сторонам.';
  const guidance = '[[FF-SP:1]] Additional guidance for Franz; apply to this message, not as player dialogue: ' + 'Keep the current scene consistent and preserve the characters and their intentions. '.repeat(8) + '[[/FF-SP:1]]';
  const content = ordinary + '\n\n' + guidance;
  const declaration = card => ({ value: card.style.getPropertyValue('min-height'), priority: card.style.getPropertyPriority('min-height') });
  const sameDeclaration = (a,b) => a.value === b.value && a.priority === b.priority;
  for (let index = 0; index < modes.length; index++) {
    const mode = modes[index]; window.__friendsFablesDesktopChatAppearance?.dispose(); history.replaceState({}, '', '/fixture/play');
    document.body.innerHTML = '<p id="retained">Retain native selection.</p><main><div id="events-list"></div></main><div class="tiptap" contenteditable="true">Preserve fractional draft.</div>';
    const list = document.getElementById('events-list'), draft = document.querySelector('.tiptap'), draftText = draft.firstChild;
    const selected = document.getElementById('retained').firstChild, selection = getSelection(), range = document.createRange(); range.selectNodeContents(selected); selection.removeAllRanges(); selection.addRange(range);
    const selectedValue = selection.toString();
    const nativeEvent = id => ({ id, role: 'player', character_id: 83026155, campaign_id: 'fixture', content, ...(id === null ? { isOptimistic: true } : {}) });
    const mount = (id, ready) => {
      const row = document.createElement('div'); row.id = 'event-' + id;
      row.innerHTML = `<div id="event-container-${id}"><div class="card${mode === 'integer-control' ? ' integer' : ''}" id="event-message-card-${id}"><div class="author">Могнус</div><div class="prose"><div class="space-y-4 whitespace-normal"><p></p><p></p></div></div></div></div>`;
      const card = row.querySelector('.card'), body = card.querySelector('.prose'), wrapper = body.firstChild, p = wrapper.firstChild, guide = wrapper.lastChild;
      const text = document.createTextNode(ready ? ordinary : ''), guideText = document.createTextNode(ready ? guidance : ''); p.append(text); guide.append(guideText);
      card.__reactFiber$fixture = { memoizedProps: { event: nativeEvent(id) } }; list.append(row);
      return { row, card, body, wrapper, p, text, guide, guideText };
    };
    const overlay = item => item.card.querySelector('[data-ff-desktop-message-snapshot]');
    const sample = item => ({ cardHeight: item.card.getBoundingClientRect().height, bodyHeight: item.body.getBoundingClientRect().height, minHeight: declaration(item.card), overlay: !!overlay(item), hiddenGuidance: item.guide.getAttribute('data-ff-desktop-hidden-instructions'), guidanceDisplay: getComputedStyle(item.guide).display });
    try {
      hide(false);
      const temporary = mount(null, true); configure(settings); await settle();
      check(document.visibilityState === 'visible' && document.hasFocus(), 'Visible focused native fixture required', mode);
      const snapshotHeight = temporary.card.getBoundingClientRect().height, rawApplied = `${snapshotHeight}px`;
      check(snapshotHeight > 150 && temporary.text.data === ordinary && getComputedStyle(temporary.guide).display !== 'none', 'Real naturally tall visible body prerequisite', { mode, snapshotHeight });
      // This is the existing optimistic→confirmed hydration-gap contract, before
      // any SP hide action; SP toggle is never represented as emptying native text.
      temporary.row.remove(); const confirmed = mount(500 + index, false);
      if (mode === 'fractional-existing-prior') confirmed.card.style.setProperty('min-height', '12px', 'important');
      const prior = declaration(confirmed.card); await settle();
      check(overlay(confirmed)?.textContent === ordinary && confirmed.text.data === '' && confirmed.guideText.data === '', 'Native continuity fallback prerequisite', { mode, state: sample(confirmed) });
      const during = sample(confirmed), serializedApplied = during.minHeight.value;
      check(getComputedStyle(confirmed.card).boxSizing === 'border-box' && during.minHeight.priority === 'important', 'Actual owned geometry prerequisite', { mode, during });
      const normalized = rawApplied !== serializedApplied;
      if (mode === 'integer-control') check(!normalized && Math.abs(snapshotHeight - Math.round(snapshotHeight)) < .001, 'Integer normalization control must match', { snapshotHeight, rawApplied, serializedApplied });
      else check(normalized && Math.abs(snapshotHeight - Math.round(snapshotHeight)) > .001, 'Fractional native CSSOM normalization must actually occur (otherwise inconclusive)', { mode, snapshotHeight, rawApplied, serializedApplied });
      let expected = prior;
      if (mode === 'newer-native-value') { confirmed.card.style.setProperty('min-height', '120px', 'important'); expected = declaration(confirmed.card); }
      if (mode === 'newer-native-priority') { confirmed.card.style.setProperty('min-height', serializedApplied, ''); expected = declaration(confirmed.card); }
      if (mode === 'dispose') window.__friendsFablesDesktopChatAppearance.dispose();
      confirmed.text.data = ordinary; confirmed.guideText.data = guidance;
      window.__friendsFablesDesktopInstructionHiding.setEnabled(true);
      await frame(); const firstPaint = sample(confirmed); await frame(); const secondPaint = sample(confirmed);
      check(!firstPaint.overlay && !secondPaint.overlay && confirmed.text.data === ordinary && getComputedStyle(confirmed.guide).display === 'none', 'Hydrated body/hide must remove fallback without native text loss', { mode, firstPaint, secondPaint });
      const control = mount(800 + index, true);
      if (expected.value) control.card.style.setProperty('min-height', expected.value, expected.priority);
      await settle(); const controlState = sample(control), final = sample(confirmed);
      check(getComputedStyle(control.guide).display === 'none' && !overlay(control), 'Matched initially-hidden control', { mode, controlState });
      const sourceIdentity = temporary.card.querySelector('.prose') === temporary.body && temporary.p.firstChild === temporary.text && temporary.text.data === ordinary && temporary.guide.firstChild === temporary.guideText && temporary.guideText.data === guidance;
      const confirmedIdentity = document.getElementById(confirmed.card.id) === confirmed.card && confirmed.card.querySelector('.prose') === confirmed.body && confirmed.body.firstChild === confirmed.wrapper && confirmed.wrapper.firstChild === confirmed.p && confirmed.p.firstChild === confirmed.text && confirmed.guide.firstChild === confirmed.guideText && confirmed.text.data === ordinary && confirmed.guideText.data === guidance;
      const preserved = sourceIdentity && confirmedIdentity && draft.firstChild === draftText && draft.textContent === 'Preserve fractional draft.' && selection.anchorNode === selected && selection.toString() === selectedValue;
      check(preserved, 'Native source/card/prose/Text/editor/draft/selection identity', { mode, sourceIdentity, confirmedIdentity });
      const restored = sameDeclaration(final.minHeight, expected), geometry = Math.abs(final.cardHeight - controlState.cardHeight) <= .1 && Math.abs(final.bodyHeight - controlState.bodyHeight) <= .1;
      const glyph = node => { const r = document.createRange(); r.selectNodeContents(node); const ink = r.getBoundingClientRect(); return { top: ink.top - node.parentElement.closest('.card').getBoundingClientRect().top, height: ink.height }; };
      const ink = glyph(confirmed.text), controlInk = glyph(control.text), glyphPreserved = ink.height > 0 && Math.abs(ink.top - controlInk.top) <= .1;
      check(glyphPreserved, 'Native recovered ordinary glyph anchor', { mode, ink, controlInk });
      cases.push({ mode, passed: restored && geometry && preserved && glyphPreserved, snapshotHeight, rawApplied, serializedApplied, normalized, prior, expected, during, firstPaint, secondPaint, final, control: controlState, restored, geometry, preserved, ink, controlInk });
      // Ownership failures remain result flags so integer/newer-owner/disposal
      // controls still run on the same frozen baseline.
    } finally { window.__friendsFablesDesktopChatAppearance?.dispose(); selection.removeAllRanges(); }
  }
  return { passed: cases.every(value => value.passed), cases };
}
function prepare() {
  const root = process.env.FABLES_TEST_APP_ROOT || path.resolve(__dirname, '../..'), filename = path.join(root, 'dist/appearance/chat-appearance.js');
  const { configureChatAppearance, chatCss } = require(filename), { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
  const { configureInstructionHiding } = require(path.join(root, 'dist/commands/host-instructions-dom'));
  const settings = { ...DEFAULT_APPEARANCE, preset: 'website', messages: { ...DEFAULT_APPEARANCE.messages, enabled: true } };
  for (const fn of [scenario, configureChatAppearance, configureInstructionHiding]) new vm.Script(`(${fn.toString()})`);
  return { configure: configureChatAppearance.toString(), hide: configureInstructionHiding.toString(), settings, css: chatCss(settings, null), metadata: { root, compiledSHA256: sha(fs.readFileSync(filename)), functionSHA256: sha(configureChatAppearance.toString()), fixtureSHA256: sha(fs.readFileSync(__filename)) } };
}
module.exports = { scenario, prepare };
if (!process.versions.electron) { new vm.Script(`(${scenario.toString()})`); console.log('FRACTIONAL_SNAPSHOT_STATIC', JSON.stringify({ fixtureSHA256: sha(fs.readFileSync(__filename)) })); }
else {
  const { app, BrowserWindow, session } = require('electron'); app.on('window-all-closed', () => {}); let win, ownedProfile, passed = false;
  const timer = setTimeout(() => { console.error('Fractional snapshot fixture hard20s deadline'); win?.destroy(); app.exit(1); }, 20000);
  (async () => { try {
    const code = prepare(); console.log('FRACTIONAL_SNAPSHOT_SOURCE', JSON.stringify(code.metadata));
    const profile = process.env.FABLES_TEST_PROFILE_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ff-snapshot-fractional-')); if (!process.env.FABLES_TEST_PROFILE_DIR) ownedProfile = profile;
    app.setPath('userData', profile); await app.whenReady(); const site = session.fromPartition('snapshot-fractional-private'); site.protocol.handle('https', () => new Response('<!doctype html><style>' + css + code.css + '</style>', { headers: { 'Content-Type': 'text/html' } }));
    win = new BrowserWindow({ show: false, width: 1100, height: 820, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await win.loadURL('https://play.fables.gg/fixture/play'); win.show(); win.focus(); win.webContents.focus();
    const until = Date.now() + 2000; let ready = false;
    while (Date.now() < until) { ready = await win.webContents.executeJavaScript("document.visibilityState==='visible'&&document.hasFocus()"); if (win.isVisible() && win.isFocused() && ready) break; await new Promise(resolve => setTimeout(resolve, 25)); }
    assert(win.isVisible() && win.isFocused() && ready, 'Visible focused native window required');
    const result = await win.webContents.executeJavaScript(`(${scenario.toString()})(${code.configure},${code.hide},${JSON.stringify(code.settings)})`);
    console.log('FRACTIONAL_SNAPSHOT_RESULT', JSON.stringify(result)); assert.equal(result.passed, true, 'Snapshot fractional geometry restoration or newer native ownership failed'); passed = true;
  } catch(error) { console.error(error); } finally { clearTimeout(timer); win?.destroy(); if (ownedProfile) fs.rmSync(ownedProfile, { recursive: true, force: true }); app.exit(passed ? 0 : 1); } })();
}
