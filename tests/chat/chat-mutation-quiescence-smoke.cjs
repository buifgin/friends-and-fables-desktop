// ROOT schedules this bounded CPU-native fixture. No live session/model/network.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

function sources(root) {
  const { configureChatAppearance } = require(path.join(root, 'dist/appearance/chat-appearance'));
  const { configureInstructionHiding } = require(path.join(root, 'dist/commands/host-instructions-dom'));
  const { installTranslationDom } = require(path.join(root, 'dist/translation/translation-dom'));
  const { RUSSIAN_DICTIONARY, localTranslation } = require(path.join(root, 'dist/translation/translation-core'));
  const { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
  return { appearance: configureChatAppearance.toString(), hiding: configureInstructionHiding.toString(),
    install: installTranslationDom.toString(), local: localTranslation.toString(), dictionary: RUSSIAN_DICTIONARY,
    settings: { ...DEFAULT_APPEARANCE, preset: 'website', messages: { ...DEFAULT_APPEARANCE.messages, enabled: true } } };
}

async function quiescenceScenario(mode, code, scenario = 'workload') {
  const translated = mode !== 'original-English', dynamic = mode === 'Russian-dynamic';
  const check = (condition, message) => { if (!condition) throw Error(`${mode}: ${message}`); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const turn = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  const stage = name => console.log('MUTATION-STAGE', mode, name);
  const campaign = '01a0d854-78d5-7064-ae41-f63d561c8e01', token = `quiescence-${mode}`;
  document.body.innerHTML = '<main id="feed"><div id="events-list"></div></main><section class="grid relative"><div class="tiptap" contenteditable="true">Preserve the native draft.</div></section>';
  const list = document.getElementById('events-list'), draft = document.querySelector('.tiptap'), draftNode = draft.firstChild;
  const counters = { records: 0, childList: 0, characterData: 0, attributes: 0, instructionAttributes: 0, connectedRemovals: 0, detachedRemovals: 0, instructionRemovals: 0, capHit: false };
  let beats = 0;
  const heartbeat = setInterval(() => beats++, 25);
  // No writes, geometry or Range allocation in diagnostic callbacks. Stop this
  // observer at a fixed record budget; cap exhaustion is distinct from product RED.
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (counters.records >= 4096) { counters.capHit = true; observer.disconnect(); break; }
      counters.records++; counters[record.type]++;
      if (record.type === 'attributes' && ['data-ff-desktop-hidden-instructions', 'data-ff-desktop-instruction-block', 'data-ff-translation-ignore'].includes(record.attributeName)) counters.instructionAttributes++;
    }
  });
  observer.observe(list, { subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['style', 'class', 'hidden', 'aria-hidden', 'data-ff-translation-blank', 'data-ff-translation-pending', 'data-ff-translation-ignore', 'data-ff-desktop-instruction-block', 'data-ff-desktop-hidden-instructions'] });
  const originalRemove = Element.prototype.remove;
  // Forward exactly, including detached clone removals that a DOM observer cannot
  // see. Counts are diagnostic; no arbitrary removal-volume failure threshold.
  Element.prototype.remove = function () {
    counters[this.isConnected ? 'connectedRemovals' : 'detachedRemovals']++;
    if (this.hasAttribute('data-ff-desktop-hidden-instructions') || this.textContent?.startsWith('[[FF-SP:1]]')) counters.instructionRemovals++;
    return Reflect.apply(originalRemove, this, arguments);
  };
  const items = [], checkpoints = [], pendingChecks = [];
  let stableInstructions;
  const counts = () => ({ ...counters, beats });
  const stable = (a, b) => ['records', 'connectedRemovals', 'detachedRemovals'].every(key => a[key] === b[key]);
  const card = (id, role, source, includeEnglish = false) => {
    const row = document.createElement('div'); row.id = `event-${id}`;
    row.innerHTML = `<div id="event-container-${id}"><div id="event-message-card-${id}" class="card"><div class="author">${role === 'player' ? 'Мира' : 'Franz'}</div><div class="prose"><div class="space-y-4 whitespace-normal"><p></p><p></p></div></div></div></div>`;
    const element = row.querySelector('.card'), body = element.querySelector('.prose'), paragraphs = body.querySelectorAll('p');
    const text = paragraphs[0].appendChild(document.createTextNode(source));
    const guidance = paragraphs[1]; guidance.textContent = '[[FF-SP:1]] PRIVATE-FIXTURE-GUIDANCE [[/FF-SP:1]]';
    let extra;
    if (includeEnglish) { const paragraph = document.createElement('p'); extra = paragraph.appendChild(document.createTextNode('')); guidance.before(paragraph); }
    const event = { id, role, content: source, campaign_id: campaign, ...(role === 'player' ? { character_id: 42 } : {}), ...(id === null ? { isOptimistic: true } : {}) };
    element.__reactFiber$fixture = { memoizedProps: { event } }; list.append(row);
    return { row, card: element, body, paragraph: paragraphs[0], text, guidance, guidanceText: guidance.firstChild, extra, event, expectedText: source };
  };
  const visibleInk = element => {
    for (let node = element; node; node = node.parentElement) { const s = getComputedStyle(node); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false; }
    const s = getComputedStyle(element); return s.color !== 'transparent' && s.color !== 'rgba(0, 0, 0, 0)' && s.webkitTextFillColor !== 'transparent' && s.webkitTextFillColor !== 'rgba(0, 0, 0, 0)';
  };
  // Called only outside the producer/removal measurement window.
  const anchors = () => items.map(item => {
    const presented = item.body.querySelector('[data-ff-translation-placeholder]') || item.card.querySelector('[data-ff-desktop-message-snapshot]') || item.body;
    const walker = document.createTreeWalker(presented, NodeFilter.SHOW_TEXT); let node, glyph;
    while ((node = walker.nextNode())) if (node.data.trim() && visibleInk(node.parentElement)) {
      const range = document.createRange(); range.selectNodeContents(node); const rect = range.getClientRects()[0];
      if (rect?.width > 0 && rect.height > 0) { glyph = { top: rect.top, left: rect.left }; break; }
    }
    const rect = item.card.getBoundingClientRect();
    return { id: item.card.id, glyph, top: rect.top, left: rect.left, height: rect.height, text: presented.textContent,
      guidanceHidden: getComputedStyle(item.guidance).display === 'none', sourceVisible: !!item.extra && /[A-Za-z]{2,}/.test(item.extra.data) && visibleInk(item.extra.parentElement) };
  });
  let translation;
  try {
    stage('install-real-controllers');
    eval(`(${code.hiding})`)(true); eval(`(${code.appearance})`)(code.settings);
    if (translated) { eval(`(${code.install})`)(token, code.dictionary, true, [], eval(`(${code.local})`), true, dynamic); translation = window.__friendsFablesDesktopTranslation; }
    // A native seed gives an initial ink/style/Range anchor before the bounded
    // workload. Russian-only source must not require a fake translation result.
    const seed = card(1, 'player', translated ? 'Мой герой ждёт у тихой башни.' : 'My hero waits beside the silent tower.'); items.push(seed);
    await turn(); await turn(); const initialAnchors = anchors();
    check(initialAnchors.every(value => value.glyph && value.guidanceHidden), 'initial native text/instruction presentation');
    // Establish quiescence first: installation, ResizeObserver and native scroll
    // reactions must finish before an unrelated mutation becomes the sole input.
    await turn(); await turn(); await pause(250); const settledSeed = counts();
    await pause(250); check(stable(settledSeed, counts()), 'seed was not quiescent before unrelated input');
    stage('stable-instructions-before-unrelated-change'); const beforeUnrelated = counts();
    const unrelated = document.createElement('div'); document.body.append(unrelated);
    await turn(); await turn();
    // Empty/non-text content cannot become a translation request. This second
    // outside-list childList change crosses its own actual frame/task boundary.
    unrelated.append(document.createComment('inert fixture change'));
    await turn(); await turn(); await pause(250);
    const afterUnrelated = counts(), stableAnchors = anchors();
    const seedIdentity = seed.card.querySelector('.prose') === seed.body && seed.paragraph.firstChild === seed.text && seed.guidance.firstChild === seed.guidanceText && seed.text.isConnected && draft.firstChild === draftNode && draft.textContent === 'Preserve the native draft.';
    const firstAnchor = initialAnchors[0], stableAnchor = stableAnchors[0];
    const seedAnchor = !!stableAnchor.glyph && Math.abs(firstAnchor.height - stableAnchor.height) <= 1 && Math.abs((firstAnchor.glyph.top - firstAnchor.top) - (stableAnchor.glyph.top - stableAnchor.top)) <= 1 && Math.abs((firstAnchor.glyph.left - firstAnchor.left) - (stableAnchor.glyph.left - stableAnchor.left)) <= 1;
    stableInstructions = { beforeUnrelated, afterUnrelated, seedIdentity, seedAnchor, stableAnchors };
    console.log('MUTATION-DIAGNOSTIC', mode, JSON.stringify({ phase: 'stable-instructions', ...stableInstructions }));
    check(!counters.capHit, 'diagnostic record budget exhausted (not a causal product RED)');
    check(afterUnrelated.instructionAttributes === beforeUnrelated.instructionAttributes && afterUnrelated.detachedRemovals === beforeUnrelated.detachedRemovals, 'unrelated childList changes rewrote stable instruction markers or sanitized clones');
    check(seedIdentity && seedAnchor && stableAnchor.guidanceHidden, 'unrelated change disturbed native seed identity/ink/anchor');
    if (scenario === 'stable-instructions') return { passed: true, mode, scenario, stableInstructions, counters: counts() };
    for (let pair = 0; pair < 6; pair++) {
      stage(`pair-${pair}-optimistic`);
      const source = translated ? `Мой герой осторожно подходит к башне номер ${pair + 1}.` : `My hero approaches the silent tower number ${pair + 1}.`;
      const temporary = card(null, 'player', source); await turn();
      stage(`pair-${pair}-confirmed-gap`);
      temporary.row.remove(); const confirmed = card(100 + pair, 'player', ''); confirmed.event.content = source; confirmed.expectedText = source; items.push(confirmed); await turn();
      stage(`pair-${pair}-hydrated`); confirmed.text.data = source; await turn();
      const narration = translated ? `Франц замечает свет у башни номер ${pair + 1}.` : `Franz notices a light beside tower number ${pair + 1}.`;
      stage(`pair-${pair}-author-only`); const dm = card(200 + pair, 'dm', '', translated); dm.expectedText = narration; items.push(dm); await turn();
      for (let part = 1; part <= 3; part++) {
        stage(`pair-${pair}-stream-${part}`);
        dm.text.data = narration.slice(0, Math.ceil(narration.length * part / 3));
        if (dm.extra) dm.extra.data = `The amber river curves beneath the silent tower number ${pair + 1}.`.slice(0, 18 * part + 15);
        dm.event.content = dm.text.data + (dm.extra?.data || ''); await turn();
      }
    }
    stage('producers-stopped');
    if (translation) {
      await pause(220); const requests = translation.collect().nodes;
      check(requests.length === 6, `expected six real pending English fragments in Russian narration, got ${requests.length}`);
      await turn(); await pause(250); const beforePoll = counts();
      const duplicate = translation.collect().nodes; await turn(); await pause(250); const afterPoll = counts();
      pendingChecks.push({ beforePoll, afterPoll, duplicateRequests: duplicate.length });
      check(duplicate.length === 0 && stable(beforePoll, afterPoll), 'unchanged pending collect produced mutations/removals');
      stage('real-partial-results');
      const partial = 'Готовая часть. Pending remainder.';
      translation.finish(token, requests.map(node => ({ id: node.id, version: node.version, text: partial, complete: false, pending: [{ start: 14, end: partial.length }] })));
      await turn(); await turn();
      // A single finite presentation sample verifies the real source-hiding
      // policy between partial and final results, without Range/layout sampling.
      check(items.filter(item => item.extra).every(item => item.body.querySelector('[data-ff-translation-placeholder]') && !visibleInk(item.extra.parentElement)), 'pending source became visible');
      stage('real-final-results');
      translation.finish(token, requests.map(node => ({ id: node.id, version: node.version, text: 'Река огибает тихую башню.', complete: true })));
    }
    await turn(); await turn(); await pause(250); checkpoints.push(counts());
    await pause(250); checkpoints.push(counts());
    await pause(250); checkpoints.push(counts());
    check(!counters.capHit, 'diagnostic record budget exhausted (not a causal product RED)');
    check(stable(checkpoints[0], checkpoints[1]) && stable(checkpoints[1], checkpoints[2]), 'work continued after producers/results settled');
    check(checkpoints[2].beats > checkpoints[0].beats, 'timer heartbeat stopped');
    stage('final-identity-and-anchors'); const finalAnchors = anchors();
    const identity = items.every(item => item.card.querySelector('.prose') === item.body && item.paragraph.firstChild === item.text && item.text.isConnected && item.guidance.firstChild === item.guidanceText && item.guidance.isConnected);
    check(items.every(item => item.text.data === item.expectedText && (!item.extra || item.extra.data === 'Река огибает тихую башню.')), 'native Russian/original text or final translated fragment changed');
    const initialSeed = initialAnchors[0], finalSeed = finalAnchors[0];
    check(finalSeed.glyph && Math.abs(initialSeed.height - finalSeed.height) <= 1 && Math.abs((initialSeed.glyph.top - initialSeed.top) - (finalSeed.glyph.top - finalSeed.top)) <= 1 && Math.abs((initialSeed.glyph.left - initialSeed.left) - (finalSeed.glyph.left - finalSeed.left)) <= 1, 'unchanged seed card/glyph anchor shifted');
    check(identity && draft.firstChild === draftNode && draft.textContent === 'Preserve the native draft.', 'native card/body/Text/instruction/draft identity changed');
    check(finalAnchors.every(value => value.glyph && value.guidanceHidden && !value.sourceVisible), 'final ink/hidden-instruction/source policy failed');
    check(!list.querySelector('[data-ff-translation-placeholder],[data-ff-desktop-message-snapshot]'), 'settled presentation retained an overlay');
    return { passed: true, mode, workload: { pairs: 6, streamParts: 3, RussianPlayerSource: translated, mixedRussianNarration: translated }, initialAnchors, finalAnchors, stableInstructions, identity, counters: counts(), checkpoints, pendingChecks };
  } catch (error) { console.error('MUTATION-DIAGNOSTIC', mode, JSON.stringify({ counters: counts(), checkpoints, pendingChecks, stableInstructions })); throw error; }
  finally { observer.disconnect(); clearInterval(heartbeat); Element.prototype.remove = originalRemove; translation?.dispose(); window.__friendsFablesDesktopChatAppearance?.dispose(); }
}
module.exports = { sources, quiescenceScenario };

if (process.versions.electron) {
  const { app, BrowserWindow, session } = require('electron');
  app.on('window-all-closed', () => {});
  let window, profile, passed = false;
  // Main-process deadline still fires if renderer microtasks starve its timers.
  const deadline = setTimeout(() => { console.error('Mutation quiescence hard 15s deadline'); window?.destroy(); app.exit(1); }, 15000);
  (async () => {
    try {
      profile = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-mutation-quiescence-')); app.setPath('userData', profile); await app.whenReady();
      const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..'), code = sources(root);
      const scenario = process.env.FABLES_MUTATION_SCENARIO || 'workload';
      assert(['workload', 'stable-instructions'].includes(scenario), 'Unknown mutation scenario');
      const modes = process.env.FABLES_MUTATION_MODE ? [process.env.FABLES_MUTATION_MODE] : ['original-English', 'Russian-static', 'Russian-dynamic'];
      assert(modes.every(mode => ['original-English', 'Russian-static', 'Russian-dynamic'].includes(mode)), 'Unknown mutation mode');
      for (const mode of modes) {
        // Hiding has no dispose API. A new document/window owns each controller.
        const site = session.fromPartition(`mutation-quiescence-${mode}`);
        site.protocol.handle('https', () => new Response('<!doctype html><style>body{margin:0;color:#eee;background:#222}#feed{height:600px;overflow:auto}.card{position:relative;width:500px;padding:12px;box-sizing:border-box}.author{height:24px}.prose p{margin:0;line-height:24px}</style>', { headers: { 'Content-Type': 'text/html' } }));
        window = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
        window.webContents.on('console-message', event => { if (/^MUTATION-(?:STAGE|DIAGNOSTIC)\b/.test(event.message)) console.log(event.message); });
        await window.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play'); window.show(); window.focus(); window.webContents.focus(); assert(window.isVisible());
        const result = await window.webContents.executeJavaScript(`(${quiescenceScenario.toString()})(${JSON.stringify(mode)},${JSON.stringify(code)},${JSON.stringify(scenario)})`);
        console.log('Mutation quiescence result', JSON.stringify(result)); assert.equal(result.passed, true); window.destroy(); window = undefined;
      }
      passed = true;
    } catch (error) { console.error('Mutation quiescence fixture failed:', error); }
    finally { clearTimeout(deadline); window?.destroy(); if (profile) await fs.rm(profile, { recursive: true, force: true }); app.exit(passed ? 0 : 1); }
  })().catch(error => { console.error(error); app.exit(1); });
}
