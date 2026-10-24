// Coordinator-only private CPU-native fixture. No executable fixture imports.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Use the private-profile fixture runner.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const { configureChatAppearance } = require(path.join(root, 'dist/appearance/chat-appearance'));
const { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
// Native07rvyszl7fdx0.js SHA77e91750…b86eb, nS panel339635.
// Native26tga4qeslul-.css SHA12a1aa8e67758f6ae4365728423704e2001379d779ebb72221be37517b623625.
// Exact entrance/transition rules, preserving their native cascade. No delay,
// fill or reduced-motion override exists for this panel in the five site sheets.
const nativeCss = `
.transition-all{transition-property:all;transition-duration:.15s;transition-timing-function:cubic-bezier(.4,0,.2,1)}
.duration-500{transition-duration:.5s}
@keyframes enter{0%{opacity:var(--tw-enter-opacity,1);transform:translate3d(var(--tw-enter-translate-x,0), var(--tw-enter-translate-y,0), 0) scale3d(var(--tw-enter-scale,1), var(--tw-enter-scale,1), var(--tw-enter-scale,1)) rotate(var(--tw-enter-rotate,0))}}
.animate-in{--tw-enter-opacity:initial;--tw-enter-scale:initial;--tw-enter-rotate:initial;--tw-enter-translate-x:initial;--tw-enter-translate-y:initial;animation-name:enter;animation-duration:.15s}
.fade-in,.fade-in-0{--tw-enter-opacity:0}
.slide-in-from-bottom-4{--tw-enter-translate-y:1rem}
.duration-500{animation-duration:.5s}
@keyframes spin{to{transform:rotate(360deg)}}.animate-spin{animation:1s linear infinite spin}
`;
function page() {
  const feed = document.getElementById('feed'), list = document.getElementById('events-list');
  const form = document.querySelector('form'), draft = form.querySelector('input');
  const state = window.fixture = { calls: [], phase: 'history', submits: 0, sequence: 100, noAttack: false, frames: [], form, draft };
  const panelClasses = 'relative py-4 px-3 md:py-6 md:px-6 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border-2 shadow-2xl backdrop-blur-sm overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500 transition-all';
  state.prose = (height = 90) => {
    const row = document.createElement('div'); row.id = `event-${++state.sequence}`; row.style.height = `${height}px`;
    row.innerHTML = `<div id="event-message-card-${state.sequence}"><div class="prose">Native narration ${state.sequence}</div></div>`; list.append(row); return row;
  };
  for (let i = 0; i < 20; i++) state.prose();
  state.emptyDamage = () => { const row = document.createElement('div'); row.id = `event-${++state.sequence}`; list.append(row); state.phase = 'damage-empty'; return state.empty = row; };
  state.roll = (kind, mode = 'entry', outer) => {
    const row = outer || document.createElement('div'); if (!outer) row.id = `event-${++state.sequence}`;
    const card = document.createElement('div'); card.id = `event-message-card-${row.id.slice(6)}`;
    const panel = document.createElement('div'); panel.className = panelClasses;
    panel.innerHTML = `<svg id="${kind === 'attack' ? 'd20' : 'd8'}" data-name="${kind === 'attack' ? 'd20' : 'd8'}" class="animate-spin" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="gold"/></svg><span>${kind}</span>`;
    if (mode === 'disabled') panel.style.animation = 'none';
    if (mode === 'paused') panel.style.animationPlayState = 'paused';
    if (mode === 'unknown') panel.style.animationName = 'unknown-entry';
    if (mode === 'ambiguous') card.append(panel.cloneNode(true));
    card.append(panel); row.append(card); if (!row.isConnected) list.append(row);
    state[kind] = { row, card, panel, svg: panel.querySelector('svg') }; state.phase = kind;
    return row;
  };
  const original = feed.scrollTo;
  const effect = panel => panel?.getAnimations().filter(animation => animation.effect?.target === panel && animation.animationName === 'enter').map(animation => {
    const timing = animation.effect.getComputedTiming();
    return { name: animation.animationName, currentTime: animation.currentTime, startTime: animation.startTime, pending: animation.pending, playState: animation.playState, progress: timing.progress, endTime: timing.endTime, duration: timing.duration };
  }) || [];
  state.snapshot = () => {
    const roll = state.damage || state.attack, panel = roll?.panel, rect = feed.getBoundingClientRect();
    return { at: performance.now(), phase: state.phase, top: feed.scrollTop, target: feed.scrollHeight - feed.clientHeight, clientHeight: feed.clientHeight, scrollHeight: feed.scrollHeight,
      opacity: panel ? Number(getComputedStyle(panel).opacity) : null, effects: effect(panel), connected: panel?.isConnected ?? false,
      rowTop: roll ? roll.row.getBoundingClientRect().top - rect.top + feed.scrollTop : null, paddingBottom: parseFloat(getComputedStyle(feed).paddingBottom),
      sameForm: document.querySelector('form') === form, sameDraft: document.querySelector('input') === draft, draft: draft.value,
      sameRoll: !state.damage || state.damage.panel.contains(state.damage.svg), reduced: matchMedia('(prefers-reduced-motion:reduce)').matches };
  };
  feed.scrollTo = function(...args) {
    if (state.calls.length === 96) throw Error('Bounded scroll trace exceeded');
    state.calls.push({ ...state.snapshot(), actor: state.actor || 'desktop', requested: args[0]?.top ?? args[1], behavior: args[0]?.behavior || 'auto' });
    const result = Reflect.apply(original, this, args);
    if (!state.actor && args[0]?.behavior === 'smooth' && state.phase === 'damage') state.onDamageMotion?.();
    return result;
  };
  state.tracedScroll = feed.scrollTo;
  state.nativeScroll = () => { state.actor = 'native'; feed.scrollTo({ top: 83, behavior: 'instant' }); state.actor = null; };
  // Exact trusted-form bridge used by combat-panel; the real appearance adapter
  // owns all pinned intent, animation scheduling and browser scroll dispatch.
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!event.isTrusted) throw Error('Untrusted fixture submit'); state.submits++;
    window.__friendsFablesDesktopChatAppearance.followAfterSubmit();
    if (!state.noAttack) state.roll('attack');
  });
  state.observeFrames = (count = 12) => new Promise(resolve => {
    const frames = []; const frame = () => { frames.push(state.snapshot()); if (frames.length === count) resolve(frames); else requestAnimationFrame(frame); }; requestAnimationFrame(frame);
  });
  // Observe this append after the adapter's already-registered observer, so
  // its first follow RAF runs before this boundary in the SAME initial frame.
  // A missed pending precondition is a fixture failure, never a late override.
  state.boundary = action => new Promise((resolve,reject) => {
    const observer = new MutationObserver(() => {
      observer.disconnect(); requestAnimationFrame(() => {
        const pending = state.snapshot();
        const dispatched = state.calls.some(call => call.phase === 'damage' && call.actor === 'desktop' && call.behavior === 'smooth');
        const method = Object.getOwnPropertyDescriptor(feed,'scrollTo')?.value;
        const wrapped = typeof method === 'function' && method !== state.tracedScroll;
        if (pending.opacity !== 0 || dispatched || !wrapped || !pending.effects.some(effect => effect.playState === 'running' && (effect.pending || effect.currentTime === 0))) {
          reject(Error('Missed actual pending reveal boundary: '+JSON.stringify({action,pending,dispatched,wrapped,calls:state.calls}))); return;
        }
        if (action === 'native' || action === 'retired') {
          const retired = feed.scrollTo; state.nativeScroll();
          if (action === 'retired') { state.actor = 'native'; retired.call(feed, {top:91,behavior:'instant'}); retired.call(feed, {top:91,behavior:'instant'}); state.actor = null; }
        }
        if (action === 'newer') {
          state.newer = function(...args) { state.actor = 'native'; const result = Reflect.apply(state.tracedScroll,this,args); state.actor = null; return result; };
          Object.defineProperty(feed,'scrollTo',{configurable:true,writable:true,value:state.newer}); state.nativeScroll();
        }
        // Synthetic intent covers the production handlers during the tiny pending
        // frame. Actual native wheel/keyboard behavior remains in existing suites.
        if (action === 'wheel') feed.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-120}));
        if (action === 'key') feed.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'PageUp'}));
        if (action === 'pointer') { feed.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); feed.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); }
        if (action === 'selection') { const range = document.createRange(); range.selectNodeContents(list.firstElementChild); getSelection().removeAllRanges(); getSelection().addRange(range); }
        if (action === 'prose') state.prose(110);
        if (action === 'prior-growth') list.firstElementChild.style.height = '210px';
        if (action === 'disconnect') state.damage.row.remove();
        if (action === 'route') { history.pushState({}, '', '/campaign-b/play'); dispatchEvent(new PopStateEvent('popstate')); }
        if (action === 'dispose') window.__friendsFablesDesktopChatAppearance.dispose();
        resolve({...state.snapshot(),pendingBeforeAction:pending});
      });
    });
    observer.observe(list,{childList:true});
  });
  // Observe a real opacity-positive dispatch, then hand off on the next visible
  // frame while its native smooth correction is still active. No adapter state
  // or scheduling is replaced. The queued variant publishes real row growth;
  // this observer is registered after the adapter's mutation observer, so native
  // authority arrives after that callback has queued its next follow frame.
  state.activeHandoff = queued => new Promise((resolve, reject) => {
    let observer, frame;
    const timer = setTimeout(() => finish(Error('Missed active native handoff: '+JSON.stringify({queued,snapshot:state.snapshot(),calls:state.calls}))), 900);
    const finish = (error, evidence) => { clearTimeout(timer); cancelAnimationFrame(frame); observer?.disconnect(); state.onDamageMotion = null; error ? reject(error) : resolve(evidence); };
    state.onDamageMotion = () => {
      state.onDamageMotion = null;
      frame = requestAnimationFrame(() => {
        const active = state.snapshot(), method = feed.scrollTo;
        const last = state.calls.filter(call => call.actor === 'desktop' && call.behavior === 'smooth').at(-1);
        if (document.visibilityState !== 'visible' || !document.hasFocus() || active.opacity <= 0 || active.top >= last.requested - 1 || method === state.tracedScroll) {
          finish(Error('Missed actual active correction: '+JSON.stringify({queued,active,last,wrapped:method!==state.tracedScroll}))); return;
        }
        const row = state.damage.row, panel = state.damage.panel, svg = state.damage.svg;
        const handoff = () => {
          const before = state.snapshot(), count = state.calls.length;
          // This is the actual current method, never a direct scrollTop write or
          // a bypass of the wrapper whose authority contract is under test.
          state.nativeScroll();
          finish(null, { queued, active, before, after: state.snapshot(), count,
            nativeCalls: state.calls.slice(count), sameMethod: feed.scrollTo === state.tracedScroll,
            sameRow: state.damage.row === row && row.isConnected,
            samePanel: state.damage.panel === panel && panel.contains(svg),
            queuedTarget: queued ? feed.scrollHeight - feed.clientHeight : null });
        };
        if (!queued) { handoff(); return; }
        observer = new MutationObserver(() => { observer.disconnect(); handoff(); });
        observer.observe(panel, { attributes: true, attributeFilter: ['style'] });
        panel.style.height = '216px';
      });
    };
  });
  // Keep native authority through the actual finite CSS height transition.
  // Rearm is tested separately once growth has stopped changing its target.
  state.growUnderNativeAuthority = height => new Promise((resolve, reject) => {
    const { row, panel, svg } = state.damage, frames = [];
    let frame, timer, finished = false, stable = 0, previousTarget;
    const finish = error => { cancelAnimationFrame(frame); clearTimeout(timer); error ? reject(error) : resolve(frames); };
    panel.style.height = `${height}px`;
    const transitions = panel.getAnimations().filter(animation => animation instanceof CSSTransition && animation.transitionProperty === 'height');
    const transition = transitions[0], timing = transition?.effect.getComputedTiming();
    if (transitions.length !== 1 || transition.playState !== 'running' || !Number.isFinite(timing?.endTime) || timing.endTime <= 0) {
      finish(Error('Missed actual finite height transition: '+JSON.stringify({count:transitions.length,timing,snapshot:state.snapshot()}))); return;
    }
    timer = setTimeout(() => finish(Error('Native growth did not finish: '+JSON.stringify({frames,timing}))), 1000);
    transition.finished.then(() => { finished = true; }, error => finish(error));
    const sample = () => {
      const snapshot = { ...state.snapshot(), height:panel.getBoundingClientRect().height,
        sameNodes:state.damage.row===row && row.isConnected && state.damage.panel===panel && panel.contains(svg),
        sameMethod:feed.scrollTo===state.tracedScroll, heightTime:transition.currentTime, heightState:transition.playState };
      frames.push(snapshot);
      if (document.visibilityState !== 'visible' || !document.hasFocus() || Math.abs(snapshot.top-83)>1 || !snapshot.sameNodes || !snapshot.sameMethod) {
        finish(Error('Native authority lost during height transition: '+JSON.stringify({snapshot,frames,calls:state.calls}))); return;
      }
      const growing = panel.getAnimations().some(animation => animation instanceof CSSTransition && animation.transitionProperty === 'height' && animation.playState !== 'finished');
      stable = finished && !growing && Math.abs(snapshot.height-height)<=1 && snapshot.target===previousTarget ? stable+1 : 0;
      previousTarget = snapshot.target;
      if (stable===2) { finish(); return; }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
  });
  // For the no-prior-motion boundary, establish pinned tail without a motion.
  state.pinWithoutMotion = () => { original.call(feed, { top: feed.scrollHeight, behavior: 'instant' }); state.noAttack = true; };
}
const css = `*{box-sizing:border-box}html,body{height:100%;margin:0}body{font:14px Arial;background:#18202c;color:white}#chat{height:100%;display:flex;flex-direction:column;width:min(950px,100%);margin:auto}#feed{flex:1;min-height:0;overflow:auto;padding:16px}#events-list{display:flex;flex-direction:column;gap:8px}#composer{height:64px;flex:none;padding:8px}#events-list .rounded-2xl{height:156px;border:2px solid #999;background:linear-gradient(#182434,#101824);border-radius:16px;padding:16px}svg{width:84px;height:84px}button{height:36px}input{max-width:65%}@keyframes unknown-entry{from{opacity:0}}`;
const html = `<!doctype html><style>${css}${nativeCss}</style><div id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><section id="composer"><form><input value="Preserved native draft"><button type="submit">Native attack</button></form></section></div><script>(${page.toString()})()</script>`;
let window;
const watchdog = setTimeout(() => { console.error('Dice reveal follow timeout'); window?.destroy(); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
(async () => {
  await app.whenReady(); const site = session.fromPartition(`dice-reveal-${process.pid}`);
  site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  window = new BrowserWindow({ show: false, width: 1000, height: 760, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const js = source => window.webContents.executeJavaScript(source);
  const paint = () => js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const until = async expression => { for (let i = 0; i < 80; i++) { if (await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw Error(`Timed out: ${expression}; ${JSON.stringify(await js('fixture.snapshot()'))}`); };
  const configure = () => js(`(${configureChatAppearance.toString()})(${JSON.stringify(DEFAULT_APPEARANCE)})`);
  const reset = async (width = 1000, reduced = false) => {
    window.setContentSize(width, 760); await window.loadURL('https://play.fables.gg/campaign-a/play'); window.show(); window.focus(); window.webContents.focus();
    await until('document.visibilityState==="visible"&&document.hasFocus()&&innerWidth==='+width);
    if (!window.webContents.debugger.isAttached()) window.webContents.debugger.attach('1.3');
    await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
    await configure(); await paint();
  };
  const submit = async () => {
    const expected = await js('fixture.submits+1');
    const point = await js('(()=>{const n=document.querySelector("button"),r=n.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return{x,y,hit:n.contains(document.elementFromPoint(x,y))}})()');
    assert.ok(point.hit && window.isFocused() && window.webContents.isFocused(), 'Trusted submit focus/hit');
    for (const type of ['mouseDown','mouseUp']) window.webContents.sendInputEvent({ type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await until('fixture.submits==='+expected);
  };
  const smooth = calls => calls.filter(call => call.actor === 'desktop' && call.behavior === 'smooth');
  const preserved = snapshot => { assert.ok(snapshot.sameForm && snapshot.sameDraft && snapshot.sameRoll); assert.equal(snapshot.draft, 'Preserved native draft'); };
  const begin = async () => { await submit(); await until('fixture.calls.some(call=>call.behavior==="smooth")&&fixture.snapshot().opacity>0'); };
  for (const [width,reduced] of [[1000,false],[420,false],[1000,true]]) {
    await reset(width,reduced); await begin();
    const before = await js('({snapshot:fixture.snapshot(),target:fixture.calls.filter(call=>call.actor==="desktop"&&call.behavior==="smooth").at(-1).requested})');
    assert.ok(before.snapshot.top < before.target - 1, 'Attack motion is still running');
    const mount = await js('fixture.roll("damage");fixture.snapshot()');
    assert.ok(before.target + mount.clientHeight <= mount.rowTop + mount.paddingBottom + 1, 'Old Attack target excludes appended Damage extent beyond native padding');
    const frames = await js('fixture.observeFrames()');
    const calls = await js('fixture.calls'); const damage = smooth(calls).filter(call => call.phase === 'damage');
    console.log('DICE_REVEAL_PHASE', JSON.stringify({ width, reduced, before, mount, frames, calls }));
    assert.ok(damage.length, 'New Damage extent receives a native smooth target');
    assert.ok(damage[0].opacity > 0, `First Damage retarget must follow first opacity-positive paint eligibility: ${JSON.stringify(damage[0])}`);
    assert.ok(damage[0].effects.some(effect => effect.name === 'enter' && effect.playState === 'running'), 'Follow does not wait until native fade completes');
    assert.equal(mount.opacity, 0, 'Causal case starts at native initial opacity without an invented delay');
    assert.equal(mount.effects[0]?.duration, 500, 'Exact source-native duration');
    assert.equal(mount.reduced, reduced); preserved(await js('fixture.snapshot()'));
    await until('Math.abs(fixture.snapshot().top-fixture.snapshot().target)<=1');
    const rollGrowth = await js('fixture.damage.panel.style.height="216px";fixture.snapshot().target');
    await until(`fixture.calls.some(call=>call.behavior==="smooth"&&call.requested===${rollGrowth})`);
    await js('fixture.prose(120);void 0'); await until('fixture.calls.some(call=>call.behavior==="smooth"&&call.requested===fixture.snapshot().target)');
  }
  for (const queued of [false, true]) {
    await reset(); await begin();
    const evidence = await js(`(()=>{const handoff=fixture.activeHandoff(${queued});fixture.roll('damage');return handoff})()`);
    console.log('DICE_NATIVE_ACTIVE_HANDOFF',JSON.stringify(evidence));
    assert.ok(evidence.sameMethod && evidence.sameRow && evidence.samePanel, 'Handoff restores the traced descriptor and preserves native roll nodes');
    assert.equal(evidence.nativeCalls.length,1,'Current wrapper delegates the native call exactly once without an injected stop');
    assert.equal(evidence.nativeCalls[0].actor,'native');
    assert.equal(evidence.nativeCalls[0].requested,83);
    assert.equal(evidence.nativeCalls[0].behavior,'instant');
    assert.ok(Math.abs(evidence.after.top-83)<=1,'Actual native method reaches its non-tail destination');
    const stages = [];
    // The queued variant must survive its already pending follow RAF before any
    // later growth. Both variants then receive ordinary same-tail/prose updates.
    stages.push({stage:'handoff',frames:await js('fixture.observeFrames(4)')});
    stages.push({stage:'same-tail-growth',frames:await js('fixture.growUnderNativeAuthority(276)')});
    await js('fixture.prose(120);void 0');
    stages.push({stage:'prose-growth',frames:await js('fixture.observeFrames(4)')});
    const calls = await js('fixture.calls');
    console.log('DICE_NATIVE_ACTIVE_GROWTH',JSON.stringify({queued,evidence,stages,calls}));
    assert.equal(smooth(calls.slice(evidence.count+1)).length,0,'Native authority survives queued follow and later native growth');
    for (const stage of stages) for (const snapshot of stage.frames) {
      assert.ok(Math.abs(snapshot.top-83)<=1,stage.stage+': desktop cannot reclaim the native destination'); preserved(snapshot);
    }
    assert.equal(await js('document.getElementById("feed").scrollTo===fixture.tracedScroll'),true,'Growth cannot reacquire the native method');
    const beforeRearm = calls.length;
    await js('fixture.noAttack=true;void 0'); await submit();
    await until(`fixture.calls.slice(${beforeRearm}).some(call=>call.actor==='desktop'&&call.behavior==='smooth'&&call.requested===fixture.snapshot().target)`);
    await until('Math.abs(fixture.snapshot().top-fixture.snapshot().target)<=1');
    preserved(await js('fixture.snapshot()'));
  }
  // Native publication may expose an empty event outer before roll enrichment.
  await reset(); await begin(); await js('fixture.emptyDamage();void 0'); await paint();
  const enriched = await js('fixture.roll("damage","entry",fixture.empty);fixture.snapshot()');
  const enrichedFrames = await js('fixture.observeFrames(4)'); const enrichedCalls = smooth(await js('fixture.calls')).filter(call=>call.phase==='damage');
  console.log('DICE_REVEAL_ENRICHED',JSON.stringify({enriched,enrichedFrames,enrichedCalls}));
  assert.equal(await js('fixture.damage.row===fixture.empty'),true,'Native enrichment retains exact event outer');
  assert.ok(enrichedCalls.length && enrichedCalls[0].opacity>0,'Empty new outer does not consume first native reveal hint');
  // Own overflow-anchor restoration is geometry-neutral, not new narration.
  await reset(); await begin();
  await js('fixture.roll("damage");requestAnimationFrame(()=>{const style=document.getElementById("events-list").firstElementChild.style;style.setProperty("overflow-anchor","none","important");style.removeProperty("overflow-anchor")});void 0');
  await paint(); const anchorCalls=smooth(await js('fixture.calls')).filter(call=>call.phase==='damage');
  assert.ok(anchorCalls.length && anchorCalls[0].opacity>0,'Anchor bookkeeping cannot retire first reveal hint');
  await reset(); await begin();
  await js('fixture.roll("damage");requestAnimationFrame(()=>document.getElementById("events-list").firstElementChild.style.height="210px");void 0');
  await paint(); const priorCalls=smooth(await js('fixture.calls')).filter(call=>call.phase==='damage');
  console.log('DICE_REVEAL_PRIOR_GROWTH',JSON.stringify(priorCalls));
  assert.ok(priorCalls.length && priorCalls[0].opacity===0,'Real prior narration CSS growth stays immediately followable during initial zero');

  await reset(); await js('window.__friendsFablesDesktopChatAppearance.dispose();fixture.roll("damage");void 0'); await configure();
  await js('fixture.noAttack=true;void 0'); await submit(); await paint();
  assert.ok(smooth(await js('fixture.calls')).some(call=>call.phase==='damage'),'Preexisting/hydrating native row retains ordinary follow');
  await reset(); await js('window.__friendsFablesDesktopChatAppearance.dispose();fixture.emptyDamage();void 0'); await configure();
  await js('fixture.roll("damage","entry",fixture.empty);window.__friendsFablesDesktopChatAppearance.followAfterSubmit();void 0'); await paint();
  const hydratedCalls=smooth(await js('fixture.calls')).filter(call=>call.phase==='damage');
  assert.ok(hydratedCalls.length && hydratedCalls[0].opacity===0,'Initially existing empty row remains exempt during hydration');
  // Negative scheduling boundaries are not evidence of the user bug's cause.
  for (const mode of ['disabled','paused','unknown','ambiguous']) {
    await reset(); await begin(); await js(`fixture.roll('damage',${JSON.stringify(mode)});void 0`); await paint();
    const calls = smooth(await js('fixture.calls')).filter(call => call.phase === 'damage');
    assert.ok(calls.length, mode+': unknown/non-running entry fails open');
  }
  for (const action of ['native','newer','retired','wheel','key','pointer','selection','route','dispose','disconnect','prose','prior-growth']) {
    for (const noPrior of ['native','newer','retired','dispose'].includes(action) ? [false,true] : [false]) {
      await reset(); if (noPrior) await js('fixture.pinWithoutMotion();void 0');
      if (noPrior) await submit(); else await begin();
      const evidence = await js(`(()=>{const pending=fixture.boundary(${JSON.stringify(action)});fixture.roll('damage');return pending})()`);
      const frames = await js('fixture.observeFrames(4)'); const calls = await js('fixture.calls');
      console.log('DICE_REVEAL_BOUNDARY', JSON.stringify({ action, noPrior, evidence, frames, calls }));
      const later = smooth(calls).filter(call => call.at >= evidence.at);
      if (action === 'prose' || action === 'prior-growth') assert.ok(later.length, 'Unrelated later prose remains immediately followable');
      else assert.equal(later.length, 0, action+': a deferred first target cannot regain authority');
      if (action === 'native' || action === 'newer') assert.ok(Math.abs((await js('fixture.snapshot().top'))-83)<=1, 'Native replacement remains in control');
      if (action === 'newer') assert.equal(await js('document.getElementById("feed").scrollTo===fixture.newer'),true,'Newer method owner retained');
      if (action === 'retired') assert.ok(Math.abs((await js('fixture.snapshot().top'))-91)<=1,'Reused retired wrapper is an inert native delegate');
      if (action === 'dispose' && noPrior) assert.equal(calls.filter(call=>call.phase==='damage'&&call.behavior==='instant').length,0,'Gate-only disposal cannot inject an instant scroll');
      preserved(await js('fixture.snapshot()'));
    }
  }
  console.log('Dice reveal follow passed'); clearTimeout(watchdog); window.webContents.debugger.detach(); window.destroy(); app.exit(0);
})().catch(error => { console.error(error); clearTimeout(watchdog); window?.destroy(); app.exit(1); });
