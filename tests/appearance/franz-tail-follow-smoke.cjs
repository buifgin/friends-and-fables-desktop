// ROOT-scheduled private native fixture; no native fixture imports or video attribution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const css = 'body{margin:0}#chat{position:relative;width:900px;height:556px;margin:40px}#feed{box-sizing:border-box;height:100%;overflow-y:auto;overflow-anchor:auto;scroll-behavior:smooth;padding:0 0 64px}#turn-controls{position:absolute;bottom:0;left:0;right:0;height:56px;background:#123;z-index:5}.prose{box-sizing:border-box;height:100%;padding:10px;display:flex;flex-direction:column;justify-content:flex-end}.prose p{margin:0;line-height:24px}';
async function scenario(configure, settings, selected = 'all') {
  const names = ['bottom-options', 'bottom-numeric', 'non-tail', 'bottom-after-arrival', 'manual-wheel', 'selection', 'accessor-top', 'coerced-top', 'nonfinite-top', 'throwing-behavior', 'foreign-this', 'newer-owner'];
  const check = (condition, message, data) => { if (!condition) throw Error(message + ': ' + JSON.stringify(data)); };
  check(selected === 'all' || names.includes(selected), 'Unknown case', selected);
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const cases = [];
  for (const name of names.filter(value => selected === 'all' || value === selected)) {
    window.__friendsFablesDesktopChatAppearance?.dispose();
    document.body.innerHTML = '<section id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><footer id="turn-controls"><div hidden><div class="tiptap" contenteditable="true">Preserve Franz draft.</div></div><button type="button">End turn Magnus</button></footer></section>';
    const feed = document.getElementById('feed'), list = document.getElementById('events-list'), footer = document.getElementById('turn-controls');
    const draft = document.querySelector('.tiptap'), draftText = draft.firstChild, retained = [], calls = [], ends = [], samples = [];
    let actor = 'desktop', stage = 'setup', events = 0, nativeArguments, nativeThis;
    let topReads = 0, coercions = 0, behaviorReads = 0, inheritedNativeResult, nativeReturned = false;
    const maximum = () => feed.scrollHeight - feed.clientHeight;
    const box = node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
    const message = (id, height, text) => {
      const row = document.createElement('div'); row.id = 'event-' + id;
      row.innerHTML = `<div id="event-container-${id}"><div id="event-message-card-${id}"><div class="prose"><p></p></div></div></div>`;
      const card = row.firstElementChild.firstElementChild, body = card.querySelector('.prose'), textNode = body.firstChild.appendChild(document.createTextNode(text));
      card.style.height = height + 'px';
      card.__reactFiber$fixture = { memoizedProps: { event: { id, role: 'dm', campaign_id: 'fixture', content: text } } };
      list.append(row); const item = { row, card, body, text: textNode }; retained.push(item); return item;
    };
    for (let id = 1; id <= 12; id++) message(id, 90, 'Earlier narration ' + id);
    const prior = message(100, 160, 'Earlier completed Franz narration.');
    const foreign = document.createElement('div'); foreign.style.cssText = 'position:fixed;left:980px;top:40px;width:50px;height:100px;overflow:auto'; foreign.innerHTML = '<div style="height:1000px"></div>'; document.body.append(foreign);
    const inherited = feed.scrollTo;
    Reflect.apply(inherited, feed, [{ top: maximum(), behavior: 'instant' }]);
    for (let index = 0; index < 3; index++) await frame();
    const traced = function(...args) {
      check(calls.length < 96, 'Scroll trace budget exhausted', { name, stage });
      const top = typeof args[0] === 'number' ? args[1] : args[0] && Object.getOwnPropertyDescriptor(args[0], 'top');
      const value = typeof args[0] === 'number' ? top : top && 'value' in top ? top.value : 'accessor';
      const behavior = typeof args[0] === 'number' ? 'css-smooth' : Object.getOwnPropertyDescriptor(args[0], 'behavior');
      calls.push({ stage, actor, at: performance.now(), thisFeed: this === feed, requested: typeof value === 'object' ? 'coercible-object' : value,
        sameArguments: actor !== 'native' || this === nativeThis && args.length === nativeArguments.length && args.every((arg,index) => Object.is(arg,nativeArguments[index])),
        behavior: typeof behavior === 'string' ? behavior : behavior && 'value' in behavior ? behavior.value : 'accessor', numeric: typeof args[0] === 'number', top: feed.scrollTop, max: maximum() });
      const result = Reflect.apply(inherited, this, args);
      if (actor === 'native') { inheritedNativeResult = result; nativeReturned = true; }
      return result;
    };
    Object.defineProperty(feed, 'scrollTo', { configurable: true, writable: true, value: traced });
    const scrolled = () => events++;
    const ended = () => { check(ends.length < 32, 'Scrollend budget exhausted', { name, stage }); ends.push({ at: performance.now(), top: feed.scrollTop, max: maximum(), stage }); };
    feed.addEventListener('scroll', scrolled); feed.addEventListener('scrollend', ended);
    const wait = async (label, predicate, budget = 120) => {
      for (let index = 0; index < budget; index++) {
        await frame();
        check(document.visibilityState === 'visible' && document.hasFocus(), 'Visible focused fixture required', { name, stage });
        check(samples.length < 480, 'Frame trace budget exhausted', { name, stage });
        samples.push({ stage, at: performance.now(), top: feed.scrollTop, max: maximum(), ends: ends.length });
        if (predicate()) return;
      }
      throw Error(label + ': ' + JSON.stringify({ name, stage, calls, ends, samples }));
    };
    try {
      configure(settings); await frame(); await frame(); await frame();
      check(maximum() - feed.scrollTop <= 1, 'Initial tail pin', { top: feed.scrollTop, max: maximum() });
      stage = 'owned-start'; const startTop = feed.scrollTop;
      const franz = message(101, 280, 'Franz reply begins here.');
      const initialMax = maximum();
      check(initialMax - startTop > 200, 'Meaningful follow distance', { initialMax, startTop });
      await wait('No actual active owned smooth motion', () => calls.some(call => call.actor === 'desktop' && call.behavior === 'smooth') && feed.scrollTop > startTop + 30 && feed.scrollTop < initialMax - 30 && feed.scrollTo !== traced);
      const active = { top: feed.scrollTop, max: maximum(), wrapped: feed.scrollTo !== traced, at: performance.now(), calls: calls.length };
      check(active.wrapped && active.max === initialMax, 'Active takeover precondition', active);
      stage = 'native-handoff';
      const oldMax = maximum(), nativeTarget = ['non-tail','foreign-this'].includes(name) ? 83 : oldMax, callStart = calls.length, endStart = ends.length;
      const marker = new Error('Native behavior getter marker'); let nativeError, nativeResult;
      nativeThis = name === 'foreign-this' ? foreign : feed;
      const options = { top: nativeTarget, behavior: name === 'non-tail' || name === 'nonfinite-top' || name === 'foreign-this' ? 'instant' : 'smooth' };
      if (name === 'accessor-top') Object.defineProperty(options,'top',{get(){topReads++;return oldMax;}});
      if (name === 'coerced-top') options.top = { valueOf(){coercions++;return oldMax;} };
      if (name === 'nonfinite-top') options.top = Infinity;
      if (name === 'throwing-behavior') Object.defineProperty(options,'behavior',{get(){behaviorReads++;throw marker;}});
      nativeArguments = name === 'bottom-numeric' ? [0,nativeTarget] : [options];
      const nativeMethod = feed.scrollTo;
      const newer = function(...args){return Reflect.apply(traced,this,args);};
      if(name === 'newer-owner')Object.defineProperty(feed,'scrollTo',{configurable:true,writable:true,value:newer});
      actor = 'native';
      try { nativeResult = Reflect.apply(nativeMethod, nativeThis, nativeArguments); } catch(error) { nativeError = error; }
      actor = 'desktop';
      const delegated = calls.slice(callStart);
      check(delegated.length === 1 && delegated[0].actor === 'native' && delegated[0].sameArguments, 'Native must delegate exactly once with original this/args and no inserted stop', delegated);
      const nativeReturn = { type: typeof nativeResult, null: nativeResult === null, returned: nativeReturned, sameIdentity: Object.is(nativeResult, inheritedNativeResult) };
      let observedFailure = nativeError, failureMode = nativeError === undefined ? 'none' : 'synchronous';
      if (name === 'throwing-behavior' && nativeReturned) {
        // Modern native scroll APIs may report dictionary conversion failure by
        // rejecting the original return. Observe only this error case; positive
        // cases retain their real in-flight timing without awaiting completion.
        let deadline;
        try {
          await Promise.race([Promise.resolve(nativeResult), new Promise((resolve,reject) => {
            deadline = setTimeout(() => reject(Error('Native getter failure observation deadline')), 1000);
          })]);
        } catch(error) { observedFailure = error; failureMode = 'returned-rejection'; }
        finally { clearTimeout(deadline); }
      }
      check(name === 'throwing-behavior' ? observedFailure === marker && behaviorReads === 1 && (!nativeReturned || nativeReturn.sameIdentity) : nativeError === undefined && nativeReturned && nativeReturn.sameIdentity, 'Native return/exception semantics', {nativeError:String(nativeError),observedFailure:String(observedFailure),failureMode,behaviorReads,nativeReturn});
      check(topReads === (name === 'accessor-top' ? 1 : 0) && coercions === (name === 'coerced-top' ? 1 : 0), 'Native alone owns target getters/coercion', {topReads,coercions});
      const handoff = { at: performance.now(), top: feed.scrollTop, oldMax, nativeTarget, delegated, restored: feed.scrollTo === traced };
      // The test does not prescribe whether a future valid design keeps/replaces
      // the wrapper; exact native dispatch and observable intent are the contract.
      if (name === 'bottom-after-arrival') await wait('Native bottom did not complete before growth', () => ends.slice(endStart).some(end => Math.abs(end.top - oldMax) <= 1) && Math.abs(feed.scrollTop - oldMax) <= 1);
      else if (!['non-tail','nonfinite-top'].includes(name)) check(feed.scrollTop < oldMax - 20 && !ends.slice(endStart).some(end => Math.abs(end.top - oldMax) <= 1), 'Growth must precede physical old-bottom arrival', { handoff, ends });
      let selectedText;
      if (name === 'manual-wheel') {
        feed.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }));
        nativeArguments = [{top:83,behavior:'instant'}]; nativeThis = feed; actor = 'native'; Reflect.apply(feed.scrollTo,feed,nativeArguments); actor = 'desktop';
      }
      if (name === 'selection') {
        const range = document.createRange(); range.selectNodeContents(prior.text); getSelection().removeAllRanges(); getSelection().addRange(range);
        document.dispatchEvent(new Event('selectionchange')); selectedText = getSelection().toString();
      }
      stage = 'same-franz-growth'; const growthAt = performance.now(), growthEndStart = ends.length, growthCallStart = calls.length;
      const paragraph = document.createElement('p'), finalText = paragraph.appendChild(document.createTextNode('Final Franz reply line.'));
      franz.body.append(paragraph); franz.card.style.height = '400px';
      const newMax = maximum();
      check(newMax - oldMax === 120 && franz.row === list.lastElementChild, 'Finite same-row native growth', { oldMax, newMax });
      const readerTarget = name === 'nonfinite-top' ? 0 : ['non-tail','manual-wheel'].includes(name) ? 83 : undefined;
      const expectedReader = readerTarget !== undefined;
      // Require a real destination scrollend AND six quiet frames after it.
      // If old-target completion queues another correction, movement resets the
      // quiet count and its final scrollend must match the new physical position.
      let quiet = 0, previous = feed.scrollTop;
      await wait('Native/retargeted motion did not complete', () => {
        const last = ends.at(-1), top = feed.scrollTop;
        const completedDestination = last && ends.length > (name === 'bottom-after-arrival' ? growthEndStart : endStart)
          && Math.abs(last.top - top) <= 1
          && (name === 'selection' || (expectedReader ? Math.abs(top - readerTarget) <= 1 : Math.abs(top - oldMax) <= 1 || Math.abs(top - newMax) <= 1));
        quiet = completedDestination && Math.abs(top - previous) <= .5 ? quiet + 1 : 0;
        previous = top; return quiet >= 6;
      });
      const range = document.createRange(); range.selectNodeContents(finalText); const ink = box(range); range.detach();
      const after = { top: feed.scrollTop, max: maximum(), distance: maximum() - feed.scrollTop, feed: box(feed), footer: box(footer), card: box(franz.card), glyph: ink };
      const identity = retained.every(item => item.row.isConnected && item.row.firstElementChild.firstElementChild === item.card && item.card.querySelector('.prose') === item.body && item.body.firstChild.firstChild === item.text) && franz.body.lastChild === paragraph && paragraph.firstChild === finalText && draft.firstChild === draftText && draft.textContent === 'Preserve Franz draft.';
      const laterDesktop = calls.slice(growthCallStart).filter(call => call.actor === 'desktop');
      const negative = expectedReader || ['selection','accessor-top','coerced-top','throwing-behavior','newer-owner'].includes(name);
      const visible = ink.height > 0 && ink.top >= after.feed.top - .5 && ink.bottom <= Math.min(after.feed.bottom, after.footer.top) + .5;
      const selectionPreserved = name !== 'selection' || getSelection().toString() === selectedText;
      const passed = identity && selectionPreserved && (name !== 'newer-owner' || feed.scrollTo === newer) && (name !== 'foreign-this' || Math.abs(foreign.scrollTop - nativeTarget) <= 1) && (negative ? laterDesktop.length === 0 && (!expectedReader || Math.abs(after.top - readerTarget) <= 1) : after.distance <= 1 && visible);
      const result = { name, passed, identity, nativeReturn, argumentEffects: {topReads,coercions,behaviorReads,exceptionPreserved:observedFailure===marker,failureMode}, selectionPreserved, visible, active, handoff, growthAt, oldMax, newMax, after, calls, ends, samples };
      cases.push(result); console.log('FRANZ_TAIL_CASE', JSON.stringify(result));
    } finally {
      feed.removeEventListener('scroll', scrolled); feed.removeEventListener('scrollend', ended);
      window.__friendsFablesDesktopChatAppearance?.dispose(); getSelection().removeAllRanges();
    }
  }
  return { passed: cases.every(value => value.passed), cases };
}
function prepare() {
  const root = process.env.FABLES_TEST_APP_ROOT || path.resolve(__dirname, '../..');
  const file = path.join(root, 'dist/appearance/chat-appearance.js');
  const { configureChatAppearance } = require(file), { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
  new vm.Script(`(${scenario.toString()})`); new vm.Script(`(${configureChatAppearance.toString()})`);
  return { configure: configureChatAppearance.toString(), settings: DEFAULT_APPEARANCE, metadata: { root, compiledSHA256: sha(fs.readFileSync(file)), functionSHA256: sha(configureChatAppearance.toString()), fixtureSHA256: sha(fs.readFileSync(__filename)) } };
}
module.exports = { scenario, prepare };
if (!process.versions.electron) {
  new vm.Script(`(${scenario.toString()})`);
  console.log('FRANZ_TAIL_STATIC', JSON.stringify({ fixtureSHA256: sha(fs.readFileSync(__filename)), scenarioSHA256: sha(scenario.toString()) }));
} else {
  const { app, BrowserWindow, session } = require('electron'); app.on('window-all-closed', () => {});
  let win, ownedProfile, passed = false;
  const timer = setTimeout(() => { console.error('Franz tail fixture hard30s deadline'); win?.destroy(); app.exit(1); }, 30000);
  (async () => { try {
    const code = prepare(); console.log('FRANZ_TAIL_SOURCE', JSON.stringify(code.metadata));
    const profile = process.env.FABLES_TEST_PROFILE_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ff-franz-tail-')); if (!process.env.FABLES_TEST_PROFILE_DIR) ownedProfile = profile;
    app.setPath('userData', profile); await app.whenReady();
    const site = session.fromPartition('franz-tail-private'); site.protocol.handle('https', () => new Response('<!doctype html><style>' + css + '</style>', { headers: { 'Content-Type': 'text/html' } }));
    win = new BrowserWindow({ show: false, width: 1100, height: 820, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await win.loadURL('https://play.fables.gg/fixture/play'); win.show(); win.focus(); win.webContents.focus();
    const until = Date.now() + 2000; let ready = false;
    while (Date.now() < until) { ready = await win.webContents.executeJavaScript("document.visibilityState==='visible'&&document.hasFocus()"); if (win.isVisible() && win.isFocused() && ready) break; await new Promise(resolve => setTimeout(resolve, 25)); }
    assert(win.isVisible() && win.isFocused() && ready, 'Visible focused native window required');
    const selected = process.env.FABLES_FRANZ_TAIL_CASE || 'all';
    const result = await win.webContents.executeJavaScript(`(${scenario.toString()})(${code.configure},${JSON.stringify(code.settings)},${JSON.stringify(selected)})`);
    console.log('FRANZ_TAIL_RESULT', JSON.stringify(result)); assert.equal(result.passed, true, 'Native bottom intent lost after same-Franz growth or native reader authority violated'); passed = true;
  } catch (error) { console.error(error); } finally { clearTimeout(timer); win?.destroy(); if (ownedProfile) fs.rmSync(ownedProfile, { recursive: true, force: true }); app.exit(passed ? 0 : 1); } })();
}
