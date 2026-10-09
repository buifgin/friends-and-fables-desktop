// Native layout fixture. The coordinator owns the isolated Xvfb/WM launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const fixtureRoot = path.join(__dirname, '..', '..');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0}#chat{margin-left:60px;height:700px}[data-ff-combat-docked]{position:fixed;top:60px;left:60px;width:var(--ff-combat-width);height:calc(100vh - 60px);display:flex;flex-direction:column;gap:8px;overflow:auto;background:#333;color:white}button.group{display:flex}input{max-width:100%;box-sizing:border-box}
</style><div id="chat" data-ff-combat-chat><div contenteditable="true" id="draft">retained draft</div></div><section data-ff-combat-docked><h2 data-ff-combat-heading>Choose a check</h2><div data-ff-combat-body><div class="grid"><button class="group" id="check"><div><svg class="lucide lucide-person-standing"></svg></div><span>Long native check label remains intact</span></button></div><form><input value="retained roll"><button type="submit">Roll</button></form><div style="height:1400px"></div></div><button id="close" data-ff-combat-close>×</button></section><script>
window.original={panel:document.querySelector('[data-ff-combat-docked]'),check:document.querySelector('#check'),form:document.querySelector('form'),input:document.querySelector('input'),close:document.querySelector('#close'),draft:document.querySelector('#draft')};window.selections=0;window.submits=0;window.ffCloseClicks=0;
original.check.onclick=()=>selections++;original.form.onsubmit=e=>{e.preventDefault();submits++};original.close.onclick=()=>ffCloseClicks++;
document.documentElement.setAttribute('data-ff-combat-open','true');document.documentElement.style.setProperty('--ff-combat-rail-width','60px');document.documentElement.style.setProperty('--ff-combat-rail-top','60px');
</script>`;
function checkEmbeddedSyntax() {
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
  const output = require('esbuild').transformSync(fs.readFileSync(path.join(fixtureRoot, 'src/combat/combat-workspace.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' });
  new Function(output.code);
}
checkEmbeddedSyntax();
if (process.argv.includes('--syntax')) { console.log('Combat workspace embedded syntax PASS'); process.exit(0); }
const { app, BrowserWindow, session } = require('electron');
if (process.env.FABLES_TEST_PROFILE_DIR) app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const { configureCombatWorkspace } = require(path.join(root, 'dist/combat/combat-workspace'));
const { combatPanelCss } = require(path.join(root, 'dist/combat/combat-panel-style'));
let window;
const timer = setTimeout(() => { console.error('Combat workspace fixture timed out'); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
(async () => {
  await app.whenReady();
  const site = session.fromPartition(`combat-workspace-${process.pid}`);
  site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  window = new BrowserWindow({ show: false, width: 1100, height: 780, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const js = async source => {
    try { return await window.webContents.executeJavaScript(source); }
    catch (error) { throw new Error(`Fixture evaluate failed for ${source.slice(0, 180)}: ${error.message}`); }
  };
  const until = async expression => { for (let n = 0; n < 100; n++) { if (await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw Error('Timed out: ' + expression); };
  const configure = (enabled = true, locale = 'en') => js(`(${configureCombatWorkspace.toString()})(${enabled},${JSON.stringify(locale)})`);
  const pointer = async (type, x, y) => { window.webContents.sendInputEvent({ type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 }); await new Promise(resolve => setTimeout(resolve, 30)); };
  const click = async selector => {
    const point = () => js(`(()=>{const target=document.querySelector(${JSON.stringify(selector)}),b=target.getBoundingClientRect(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2),hit=document.elementFromPoint(x,y);return {x,y,left:b.left,right:b.right,top:b.top,bottom:b.bottom,hit:target.contains(hit),hitTag:hit?.tagName,hitId:hit?.id}})()`);
    const initial = await point();
    await pointer('mouseMove', initial.x, initial.y);
    const ready = await point();
    assert.equal(ready.hit, true, `Native click target moved or became obscured after hover: ${JSON.stringify({ initial, ready })}`);
    await pointer('mouseDown', ready.x, ready.y);
    await pointer('mouseUp', ready.x, ready.y);
  };
  const keyboard = async key => { window.webContents.sendInputEvent({ type: 'keyDown', keyCode: key }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: key }); await new Promise(resolve => setTimeout(resolve, 30)); };
  const identity = () => js(`Object.entries(original).every(([key,node])=>node.isConnected)&&original.form===document.querySelector('form')&&original.input.value==='retained roll'&&original.draft.textContent==='retained draft'`);
  await window.loadURL('https://play.fables.gg/campaign-one/play');
  window.showInactive(); window.webContents.focus();
  await until("document.visibilityState==='visible'&&document.hasFocus()");
  await js(`document.head.append(Object.assign(document.createElement('style'),{textContent:${JSON.stringify(combatPanelCss)}}))`);
  await configure();
  await until("!!document.querySelector('[data-ff-combat-resizer]')");
  assert.equal(await js("document.querySelector('[data-ff-combat-density]')"), null, 'Density control is removed.');
  assert.equal(await js("document.querySelector('[data-ff-combat-workspace-tools]').getBoundingClientRect().height"), 0, 'Empty shortcut host has no toolbar spacing.');
  assert.equal(await js("getComputedStyle(original.panel).display"), 'flex', 'Dock is a real flex-column root.');
  const initialWidth = await js("Number(document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-valuenow'))");
  const grip = await js("(()=>{const b=document.querySelector('[data-ff-combat-resizer]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+80}})()");
  await pointer('mouseDown', grip.x, grip.y); await pointer('mouseMove', grip.x + 40, grip.y); await pointer('mouseUp', grip.x + 40, grip.y);
  await until(`Number(document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-valuenow'))===${initialWidth + 40}`);
  assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width"), initialWidth + 40, 'Pointer resize preference persists.');
  await js("document.querySelector('[data-ff-combat-resizer]').focus()"); await keyboard('Right');
  await until(`Number(document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-valuenow'))===${initialWidth + 50}`);
  await js(`document.querySelector('[data-ff-combat-shortcuts-slot]').innerHTML='<nav data-ff-dice-navigation><button>All checks</button><button>Favorites</button></nav>';const dock=document.querySelector('[data-ff-combat-docked]');dock.insertAdjacentHTML('beforeend','<div data-ff-dice-favorites></div><div data-ff-dice-selection></div>');const confirm=document.createElement('button');confirm.textContent='Confirm';confirm.setAttribute('data-ff-dice-selection-confirm','');dock.append(confirm);window.confirmHits=0;window.confirmInputTrace=[];for(const type of ['pointerdown','mousedown','pointerup','mouseup','click'])document.addEventListener(type,event=>{const b=confirm.getBoundingClientRect(),x=event.clientX,y=event.clientY,hit=document.elementFromPoint(x,y);if(confirmInputTrace.length<24&&(confirm.contains(event.target)||(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)))confirmInputTrace.push({type:event.type,trusted:event.isTrusted,target:event.target?.tagName,targetId:event.target?.id,x,y,hitTag:hit?.tagName,hitId:hit?.id})},true);confirm.onclick=()=>confirmHits++;true`);
  await until("document.querySelector('[data-ff-combat-workspace-tools]').getBoundingClientRect().height>0");
  await js("original.panel.setAttribute('data-ff-combat-panel-mode','actions')");
  assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-dice-navigation]')).display"), 'none', 'Explicit actions mode hides dice navigation.');
  assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-dice-selection-confirm]')).display"), 'none', 'Explicit actions mode hides selection confirmation.');
  await js("original.panel.setAttribute('data-ff-combat-panel-mode','skills')");
  assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-dice-navigation]')).display"), 'grid', 'Explicit skills mode preserves dice navigation.');
  for (const width of [280, 308, 390]) {
    await js(`localStorage.setItem('ff-desktop-combat-workspace-v1:/campaign-one',JSON.stringify({width:${width}}));`);
    await configure(false); await configure(true, 'en');
    await js("document.querySelector('[data-ff-combat-shortcuts-slot]').innerHTML='<nav data-ff-dice-navigation><button>All checks</button><button>Favorites</button></nav>'");
    await until("document.querySelector('[data-ff-combat-workspace-tools]').getBoundingClientRect().height>0");
    window.setContentSize(1100, 360);
    await until(`innerHeight===360&&document.documentElement.style.getPropertyValue('--ff-combat-width')==='${width}px'`);
    const sample = await js(`(()=>{const tools=document.querySelector('[data-ff-combat-workspace-tools]'),nav=document.querySelector('[data-ff-dice-navigation]'),title=document.querySelector('[data-ff-combat-heading]').getBoundingClientRect(),form=original.form.getBoundingClientRect(),close=original.close.getBoundingClientRect(),confirm=document.querySelector('[data-ff-dice-selection-confirm]'),c=confirm.getBoundingClientRect();return {toolbarBg:getComputedStyle(tools).backgroundColor,sticky:getComputedStyle(tools).position,shrink:getComputedStyle(tools).flexShrink,navHit:nav.contains(document.elementFromPoint(nav.getBoundingClientRect().left+nav.getBoundingClientRect().width/2,nav.getBoundingClientRect().top+nav.getBoundingClientRect().height/2)),flow:title.bottom<=form.top,closeWidth:close.width,closeHit:original.close.contains(document.elementFromPoint(close.x+17,close.y+17)),confirmLeft:c.left,confirmRight:c.right,confirmBottom:c.bottom,confirmHit:confirm.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2))}})()`);
    assert.notEqual(sample.toolbarBg, 'rgba(0, 0, 0, 0)', 'Sticky navigation has an opaque background.');
    assert.equal(sample.sticky, 'sticky'); assert.equal(sample.shrink, '0');
    assert.equal(sample.navHit, true, 'Both-button navigation stays a real hit target.');
    assert.equal(sample.flow, true, 'The title stays above the native form in real layout flow.');
    assert.equal(sample.closeWidth, 34); assert.equal(sample.closeHit, true, 'Native close remains a 34px hit target.');
    assert.ok(sample.confirmLeft >= 60 && sample.confirmRight <= 60 + width, 'Floating confirmation stays within the dock at narrow widths.');
    assert.ok(sample.confirmBottom <= 360, 'Floating confirmation stays inside the short viewport.');
    assert.equal(sample.confirmHit, true, 'Floating confirmation remains a real hit target.');
    await js('original.panel.scrollTop=200');
    assert.equal(await js("(()=>{const h=document.querySelector('[data-ff-combat-heading]').getBoundingClientRect(),f=original.form.getBoundingClientRect();return h.bottom<=f.top||h.top>=f.bottom})()"), true, 'Scrolled native title does not paint over the form.');
    assert.equal(await js("(()=>{const b=original.close.getBoundingClientRect();return original.close.contains(document.elementFromPoint(b.x+17,b.y+17))})()"), true, 'Close remains reachable after scrolling.');
    const confirmation = await js("(()=>{const button=document.querySelector('[data-ff-dice-selection-confirm]'),b=button.getBoundingClientRect(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2);return {x,y,left:b.left,right:b.right,top:b.top,bottom:b.bottom,hit:button.contains(document.elementFromPoint(x,y)),hits:window.confirmHits}})()");
    assert.equal(confirmation.hit, true, `Floating confirmation is the native hit target after scroll: ${JSON.stringify(confirmation)}`);
    await click('[data-ff-dice-selection-confirm]');
    try { await until(`confirmHits===${confirmation.hits + 1}`); }
    catch (error) {
      const state = await js("(()=>{const button=document.querySelector('[data-ff-dice-selection-confirm]'),b=button.getBoundingClientRect();return {focus:document.hasFocus(),active:document.activeElement?.tagName,button:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},hits:window.confirmHits,trace:window.confirmInputTrace.slice(-12)}})()");
      throw new Error(`Native confirmation click did not fire once: ${JSON.stringify({ confirmation, state, cause: error.message })}`);
    }
    assert.equal(await js('confirmHits'), confirmation.hits + 1, `Each real native confirmation click fires exactly once: ${JSON.stringify(confirmation)}`);
    await js('original.panel.scrollTop=0');
  }
  await window.setContentSize(1100, 780); await until('innerHeight===780');
  await click('#close'); assert.equal(await js('ffCloseClicks'), 1);
  await js("document.querySelector('[data-ff-combat-resizer]').focus()");
  await keyboard('Home');
  await until("JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width===undefined");
  await js("history.pushState({},'', '/campaign-one/settings');window.dispatchEvent(new PopStateEvent('popstate'))");
  await until("!document.querySelector('[data-ff-combat-workspace-tools]')&&!document.documentElement.style.getPropertyValue('--ff-combat-width')");
  await configure(false);
  assert.equal(await js("!!document.querySelector('[data-ff-combat-resizer], [data-ff-combat-workspace-tools]')"), false);
  assert.equal(await identity(), true, 'Native nodes, form draft, and chat draft remain intact.');
  assert.equal(await js('submits+selections'), 0, 'Layout controls never activate native selection or roll handlers.');
  console.log('Combat workspace native fixture PASS');
  clearTimeout(timer); window.destroy(); app.quit();
})().catch(error => { console.error(error); clearTimeout(timer); window?.destroy(); app.exit(1); });
