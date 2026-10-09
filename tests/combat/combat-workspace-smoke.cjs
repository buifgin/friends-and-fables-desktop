// Native fixture: coordinator schedules execution on the isolated display.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0}#rail{position:fixed;left:0;top:60px;width:60px;height:700px}#chat{margin-left:60px;width:calc(100vw - 60px);height:700px}#map{position:fixed;right:0;bottom:0;width:40px;height:40px}[data-ff-combat-docked]{position:fixed;top:60px;left:60px;width:var(--ff-combat-width);height:calc(100vh - 60px);overflow:auto;background:#333;color:white}button.group{display:flex}input{max-width:100%;box-sizing:border-box}
</style><aside id="rail"></aside><div id="chat" data-ff-combat-chat><div contenteditable="true" id="draft">retained draft</div></div><canvas id="map"></canvas><section data-ff-combat-docked><h2 data-ff-combat-heading>Выберите проверку способности</h2><div data-ff-combat-body><div class="grid"><button class="group" id="check"><div><svg class="lucide lucide-person-standing"></svg></div><span>Проверка ловкости: Акробатика и сохранение равновесия</span></button></div><form><input value="retained roll"><button type="submit">Roll</button></form><div style="height:1400px"></div></div><button id="close" data-ff-combat-close>×</button></section><script>
window.original={panel:document.querySelector('[data-ff-combat-docked]'),check:document.querySelector('#check'),form:document.querySelector('form'),input:document.querySelector('input'),close:document.querySelector('#close'),draft:document.querySelector('#draft'),map:document.querySelector('#map')};window.selections=0;window.submits=0;window.ffCloseClicks=0;window.mapClicks=0;
original.check.onclick=()=>selections++;original.form.onsubmit=e=>{e.preventDefault();submits++};original.close.onclick=()=>ffCloseClicks++;original.map.onclick=()=>mapClicks++;
document.documentElement.setAttribute('data-ff-combat-open','true');document.documentElement.style.setProperty('--ff-combat-rail-width','60px');document.documentElement.style.setProperty('--ff-combat-rail-top','60px');
</script>`;
// Validate both embedded fixture code and serialized renderer code before launching Electron.
function checkEmbeddedSyntax() {
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
  const output = require('esbuild').transformSync(fs.readFileSync(path.join(root, 'src/combat/combat-workspace.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' });
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
  const js = source => window.webContents.executeJavaScript(source);
  const until = async expression => { for (let n = 0; n < 100; n++) { if (await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw Error('Timed out: ' + expression); };
  const configure = (enabled = true, locale = 'en') => js(`(${configureCombatWorkspace.toString()})(${enabled},${JSON.stringify(locale)})`);
  const pointer = async (type, x, y) => { window.webContents.sendInputEvent({ type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 }); await new Promise(resolve => setTimeout(resolve, 30)); };
  const click = async selector => { const b = await js(`(()=>{const b=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`); await pointer('mouseDown', b.x, b.y); await pointer('mouseUp', b.x, b.y); };
  const keyboard = async (key, modifiers = []) => { window.webContents.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers }); await new Promise(resolve => setTimeout(resolve, 30)); };
  const identity = () => js(`Object.entries(original).every(([key,node])=>node.isConnected)&&original.form===document.querySelector('form')&&original.input.value==='retained roll'&&original.draft.textContent==='retained draft'`);
  await window.loadURL('https://play.fables.gg/campaign-one/play');
  window.showInactive(); window.webContents.focus();
  await until("document.visibilityState==='visible'&&document.hasFocus()");
  await js(`document.head.append(Object.assign(document.createElement('style'),{textContent:${JSON.stringify(combatPanelCss)}}))`);
  await configure();
  await until("!!document.querySelector('[data-ff-combat-resizer]')");
  assert.equal(await js("document.querySelector('[data-ff-combat-density]').getAttribute('aria-pressed')"), 'false');
  assert.equal(await js("document.querySelector('[data-ff-combat-shortcuts-slot]').children.length"), 0);
  const before = await js("Number(document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-valuenow'))");
  const drag = await js("(()=>{const b=document.querySelector('[data-ff-combat-resizer]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+80}})()");
  await pointer('mouseDown', drag.x, drag.y); await pointer('mouseMove', drag.x + 100, drag.y); await pointer('mouseUp', drag.x + 100, drag.y);
  await until(`Number(document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-valuenow'))===${before + 100}`);
  const savedWidth = await js("JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width");
  assert.equal(savedWidth, before + 100, 'Actual pointer drag persists requested width.');
  await keyboard('Right');
  await until(`Number(document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-valuenow'))===${savedWidth + 10}`);
  const requested = savedWidth + 10;
  await click('[data-ff-combat-density]');
  await until("document.querySelector('[data-ff-combat-docked]').getAttribute('data-ff-combat-workspace-density')==='comfortable'");
  assert.equal(await js("getComputedStyle(original.check).minHeight"), '96px');
  assert.equal(await identity(), true);
  await configure(true, 'ru');
  assert.equal(await js("document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-label')"), 'Ширина панели боя');
  await js("document.documentElement.style.setProperty('--ff-combat-rail-width','240px')");
  window.setContentSize(820, 650);
  await until("innerWidth===820&&document.documentElement.style.getPropertyValue('--ff-combat-width')==='332px'");
  assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width"), requested, 'Viewport clamp preserves requested preference.');
  assert.equal(await js("getComputedStyle(document.querySelector('#chat')).paddingLeft"), '332px');
  assert.equal(await js("innerWidth-240-parseFloat(document.documentElement.style.getPropertyValue('--ff-combat-width'))>=240"), true);
  window.setContentSize(1100, 780);
  await until(`innerWidth===1100&&document.documentElement.style.getPropertyValue('--ff-combat-width')==='${requested}px'`);
  await js("document.documentElement.style.setProperty('--ff-combat-rail-width','60px')");
  await until("document.querySelector('[data-ff-combat-resizer]').getAttribute('aria-valuemax')==='792'");
  // Rail variables update before the native panel's 240ms left transition finishes.
  // Wait for the actual hit target and final panel geometry before native input.
  const edgeState = () => js("(()=>{const h=document.querySelector('[data-ff-combat-resizer]'),b=h.getBoundingClientRect(),p=original.panel.getBoundingClientRect(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+80),hit=document.elementFromPoint(x,y);return {x,y,max:Number(h.getAttribute('aria-valuemax')),now:Number(h.getAttribute('aria-valuenow')),panelLeft:p.left,panelRight:p.right,rail:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ff-combat-rail-width')),handleHit:h.contains(hit),hitTag:hit?.tagName,hitId:hit?.id,focused:document.hasFocus(),saved:JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width}})()");
  let edge;
  try {
    await until("(()=>{const h=document.querySelector('[data-ff-combat-resizer]'),b=h.getBoundingClientRect(),p=original.panel.getBoundingClientRect(),rail=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ff-combat-rail-width'));return Math.abs(p.left-rail)<.25&&document.hasFocus()&&h.contains(document.elementFromPoint(Math.round(b.x+b.width/2),Math.round(b.y+80)))})()");
    edge=await edgeState();
  } catch(error) { throw Error('Overshoot pointer readiness failed: '+JSON.stringify(await edgeState())+'; '+error.message); }
  await js("window.ffResizeTrace=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])document.querySelector('[data-ff-combat-resizer]').addEventListener(type,e=>{if(ffResizeTrace.length<12)ffResizeTrace.push({type:e.type,x:e.clientX,y:e.clientY,trusted:e.isTrusted,pointerId:e.pointerId})})");
  // A user overshoot saves the visible limit, rather than hidden extra width.
  await pointer('mouseDown', edge.x, edge.y); await pointer('mouseMove', 1090, edge.y); await pointer('mouseUp', 1090, edge.y);
  try { await until(`JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width===${edge.max}`); }
  catch(error) { throw Error('Overshoot persistence failed: '+JSON.stringify({before:edge,after:await edgeState(),trace:await js('ffResizeTrace')})+'; '+error.message); }
  await keyboard('Right');
  assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width"), edge.max, 'Keyboard cannot accumulate an invisible overshoot.');
  for (const width of [308, 390]) {
    await js(`localStorage.setItem('ff-desktop-combat-workspace-v1:/campaign-one',JSON.stringify({width:${width},density:'comfortable'}))`);
    await configure(false); await configure(true, 'ru');
    await until(`document.documentElement.style.getPropertyValue('--ff-combat-width')==='${width}px'`);
    assert.equal(await js("(()=>{const b=original.close.getBoundingClientRect();return b.width===34&&original.close.contains(document.elementFromPoint(b.x+17,b.y+17))})()"), true, 'Native close stays a 34px real hit target.');
    assert.equal(await js("(()=>{const b=original.check.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(original.check.querySelector('span'));return Array.from(r.getClientRects()).every(t=>t.left>=b.left&&t.right<=b.right&&t.top>=b.top&&t.bottom<=b.bottom)})()"), true, 'Long Russian labels remain within comfortable tile.');
    await js("original.panel.scrollTop=140");
    assert.equal(await js("(()=>{const b=original.close.getBoundingClientRect();return original.close.contains(document.elementFromPoint(b.x+17,b.y+17))})()"), true);
    await js("original.panel.scrollTop=0");
  }
  // Realistic populated shortcuts: Russian tray and expanded scrollable manager.
  const populateTools = () => js(`(()=>{
    const slot=document.querySelector('[data-ff-combat-shortcuts-slot]');
    slot.innerHTML='<section data-ff-combat-shortcuts style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:5px 8px;min-width:0;max-width:100%;box-sizing:border-box"><strong>Закреплённые проверки</strong><div style="display:flex;flex-wrap:wrap;gap:4px"><button type="button">Акробатика</button><button type="button">Внимательность</button></div><details open style="flex-basis:100%;min-width:0"><summary>Настроить закреплённые проверки</summary><div id="fixture-shortcut-list" style="display:flex;flex-wrap:wrap;gap:4px;max-height:min(40vh,240px);overflow:auto;padding:4px;box-sizing:border-box"></div></details><button type="button" id="fixture-favorites">Избранные атаки</button></section>';
    const list=document.querySelector('#fixture-shortcut-list');
    for(let n=0;n<25;n++){const label=document.createElement('label');label.style.cssText='display:flex;gap:3px;align-items:center;max-width:100%';label.innerHTML='<input type="checkbox">Проверка способности '+n;list.append(label)}
    for(const button of slot.querySelectorAll('button'))button.style.cssText='font:inherit;color:inherit;border:1px solid gray;border-radius:5px;padding:5px 8px;background:transparent';
    window.ffShortcutHits=0;slot.querySelector('#fixture-favorites').onclick=()=>ffShortcutHits++;
  })()`);
  for (const width of [308,390]) {
    await js(`localStorage.setItem('ff-desktop-combat-workspace-v1:/campaign-one',JSON.stringify({width:${width},density:'comfortable'}))`);
    await configure(false);await configure(true,'ru');await populateTools();
    window.setContentSize(1100,360);
    await until("innerHeight===360&&parseFloat(document.documentElement.style.getPropertyValue('--ff-combat-tools-height'))===Math.ceil(document.querySelector('[data-ff-combat-workspace-tools]').getBoundingClientRect().height)");
    assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-combat-workspace-tools]')).backgroundColor"), 'rgba(0, 0, 0, 0)', 'Toolbar inherits the translucent combat surface.');
    for (const scroll of [0,140]) {
      await js(`original.panel.scrollTop=${scroll}`);
      const geometry=await js("(()=>{const tools=document.querySelector('[data-ff-combat-workspace-tools]'),t=tools.getBoundingClientRect(),h=document.querySelector('[data-ff-combat-heading]').getBoundingClientRect(),c=original.close.getBoundingClientRect();return {separated:h.top>=t.bottom-1,headingVisible:h.bottom<=innerHeight,closeHit:original.close.contains(document.elementFromPoint(c.x+17,c.y+17)),toolbarScrollable:tools.scrollHeight>tools.clientHeight,height:t.height}})()");
      assert.equal(geometry.separated,true,'Measured toolbar offset separates sticky native heading.');
      assert.equal(geometry.headingVisible,true,'Short viewport retains the complete native heading.');
      assert.equal(geometry.closeHit,true,'Populated toolbar leaves the native close reachable.');
      assert.equal(geometry.toolbarScrollable,true,'Expanded shortcuts are bounded and independently scrollable.');
      assert.ok(geometry.height<=136,'Toolbar leaves room for native content in a short viewport.');
    }
    await js("document.querySelector('[data-ff-combat-workspace-tools]').scrollTop=10000");
    await click('#fixture-favorites');assert.equal(await js('ffShortcutHits'),1,'Bottom toolbar action remains reachable through toolbar scrolling.');
    await js("original.panel.scrollTop=0");
  }
  window.setContentSize(1100,780);await until('innerHeight===780');
  await click('#close'); assert.equal(await js('ffCloseClicks'), 1);
  await click('#map'); assert.equal(await js('mapClicks'), 1);
  await js("document.querySelector('[data-ff-combat-resizer]').focus()"); await keyboard('Home');
  await until("JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width===undefined");
  assert.equal(await js("document.documentElement.style.getPropertyValue('--ff-combat-width')"), '308px');
  await keyboard('Right');
  const double = await js("(()=>{const b=document.querySelector('[data-ff-combat-resizer]').getBoundingClientRect();return {x:Math.round(b.x+4),y:Math.round(b.y+80)}})()");
  window.webContents.sendInputEvent({type:'mouseDown',...double,button:'left',clickCount:2});
  window.webContents.sendInputEvent({type:'mouseUp',...double,button:'left',clickCount:2});
  await until("JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/campaign-one')).width===undefined");
  await js("history.pushState({},'', '/campaign-two/play');window.dispatchEvent(new PopStateEvent('popstate'))");
  await until("document.querySelector('[data-ff-combat-density]').getAttribute('aria-pressed')==='false'");
  await js("history.pushState({},'', '/campaign-one/play');window.dispatchEvent(new PopStateEvent('popstate'))");
  await until("document.querySelector('[data-ff-combat-density]').getAttribute('aria-pressed')==='true'");
  await js("history.pushState({},'', '/campaign-one/settings');window.dispatchEvent(new PopStateEvent('popstate'))");
  await until("!document.querySelector('[data-ff-combat-workspace-tools]')&&!document.documentElement.style.getPropertyValue('--ff-combat-width')");
  await js("history.pushState({},'', '/campaign-one/play');window.dispatchEvent(new PopStateEvent('popstate'));localStorage.setItem('ff-desktop-combat-workspace-v1:/campaign-one','{bad')");
  await configure(false); await configure();
  await until("document.querySelector('[data-ff-combat-density]').getAttribute('aria-pressed')==='false'");
  await js("original.panel.remove()");
  await until("!document.querySelector('[data-ff-combat-workspace-tools]')&&!document.documentElement.style.getPropertyValue('--ff-combat-width')");
  await js("document.body.append(original.panel)");
  await until("document.querySelectorAll('[data-ff-combat-workspace-tools]').length===1");
  await configure(false);
  assert.equal(await js("!!document.querySelector('[data-ff-combat-resizer], [data-ff-combat-workspace-tools]')"), false);
  assert.equal(await js("original.panel.hasAttribute('data-ff-combat-workspace-density')"), false);
  assert.equal(await js("document.documentElement.style.getPropertyValue('--ff-combat-tools-height')"), '');
  assert.equal(await identity(), true);
  assert.equal(await js('submits+selections'), 0, 'Layout controls never select or submit native controls.');
  await js("Object.defineProperty(window,'localStorage',{configurable:true,get(){throw Error('blocked')}});true");
  await configure(); await click('[data-ff-combat-density]');
  assert.equal(await js("document.querySelector('[data-ff-combat-density]').getAttribute('aria-pressed')"), 'true');
  await configure(false);
  console.log('Combat workspace native fixture PASS');
  clearTimeout(timer); window.destroy(); app.quit();
})().catch(error => { console.error(error); clearTimeout(timer); window?.destroy(); app.exit(1); });
