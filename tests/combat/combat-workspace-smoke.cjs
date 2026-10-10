// Native layout fixture. The coordinator owns the isolated Xvfb/WM launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const fixtureRoot = path.join(__dirname, '..', '..');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0}#chat{margin-left:60px;height:700px}[data-ff-combat-docked]{position:fixed;top:60px;left:60px;width:var(--ff-combat-width);height:calc(100vh - 60px);display:flex;flex-direction:column;gap:8px;overflow:auto;background:#333;color:white}button.group{display:flex}input{max-width:100%;box-sizing:border-box}.target-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.target-card{display:flex;align-items:center;gap:12px;box-sizing:border-box;width:100%;padding:16px;border:1px solid #888}.target-details{display:flex;flex-direction:row;align-items:center;gap:8px}.target-avatar{display:block;flex:none;width:40px;height:40px;border-radius:50%;background:#777}.target-name{font-size:14px;font-weight:500}label.font-header{display:block;line-height:1.2}.grid{display:grid;gap:16px}
</style><div id="chat" data-ff-combat-chat><div contenteditable="true" id="draft">retained draft</div></div><section data-ff-combat-docked><h2 data-ff-combat-heading>Choose a check</h2><div data-ff-combat-body><div class="grid"><button class="group" id="check"><div><svg class="lucide lucide-person-standing"></svg></div><span>Long native check label remains intact</span></button></div><div class="target-grid"><label class="target-card flex items-center space-x-3 rounded border p-4 clickable" id="target-card"><button type="button" role="checkbox" aria-checked="false" id="target-checkbox" style="width:16px;height:16px;flex:none"></button><input aria-hidden="true" tabindex="-1" type="checkbox" value="on" style="position:absolute;pointer-events:none;opacity:0;margin:0;transform:translateX(-100%);width:16px;height:16px"><div class="target-details flex flex-row items-center gap-2"><span class="target-avatar relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">A</span><div class="target-name text-sm font-medium" id="target-name">Писькогрыз jr.</div></div></label><label class="target-card flex items-center space-x-3 rounded border p-4 clickable" id="target-card-next"><button type="button" role="checkbox" aria-checked="false" id="target-checkbox-next" style="width:16px;height:16px;flex:none"></button><input aria-hidden="true" tabindex="-1" type="checkbox" value="on" style="position:absolute;pointer-events:none;opacity:0;margin:0;transform:translateX(-100%);width:16px;height:16px"><div class="target-details flex flex-row items-center gap-2"><span class="target-avatar relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">B</span><div class="target-name text-sm font-medium">Second target</div></div></label></div><div data-ff-desktop-detail-card="true"><div class="grid gap-4 sm:grid-cols-3"><div class="space-y-2"><div class="flex items-center gap-1 w-full"><label class="text-sm font-medium leading-none font-header">Характеристика</label></div><button id="attack-stat" type="button">СИЛ</button><select aria-hidden="true" tabindex="-1"><option>STR</option></select></div><div class="space-y-2"><div class="flex items-center gap-1 w-full"><label class="text-sm font-medium leading-none font-header">Значение модификатора</label></div><div class="space-y-2"><div class="relative flex items-center"><input id="modifier_value" value="0"></div></div></div><div class="space-y-2"><div class="flex items-center gap-1 w-full"><label class="text-sm font-medium leading-none font-header">Бонус умения</label></div><div class="space-y-2"><div class="relative flex items-center"><input value="0"></div></div></div></div></div><div class="relative group rounded-lg border bg-card p-4"><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Бросок костей</label><div class="flex items-center gap-1.5"><div class="space-y-2"><div class="relative flex items-center"><input id="damage-dice" value="1d6"></div></div></div></div><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Модификатор характеристики</label><div class="flex items-center gap-1.5"><button id="damage-stat" type="button" role="combobox">СИЛ</button></div></div><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Фиксированный бонус</label><div class="flex items-center gap-1.5"><input value="0"></div></div><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Тип урона</label><div class="flex items-center gap-1.5"><button type="button">Дробящий</button></div></div></div></div><form><input value="retained roll"><button type="submit">Roll</button></form><div style="height:1400px"></div></div><button id="close" data-ff-combat-close>×</button></section><script>
window.original={panel:document.querySelector('[data-ff-combat-docked]'),check:document.querySelector('#check'),form:document.querySelector('form'),input:document.querySelector('form input'),close:document.querySelector('#close'),draft:document.querySelector('#draft'),targetCard:document.querySelector('#target-card'),targetCheckbox:document.querySelector('#target-checkbox'),targetAvatar:document.querySelector('.target-avatar'),targetName:document.querySelector('#target-name'),attackStat:document.querySelector('#attack-stat'),modifierValue:document.querySelector('#modifier_value'),damageDice:document.querySelector('#damage-dice'),damageStat:document.querySelector('#damage-stat')};window.selections=0;window.submits=0;window.ffCloseClicks=0;window.targetSelections=0;
original.check.onclick=()=>selections++;original.form.onsubmit=e=>{e.preventDefault();submits++};original.close.onclick=()=>ffCloseClicks++;original.targetCard.onclick=()=>targetSelections++;window.originalTargetHandler=original.targetCard.onclick;
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
  for (const [width, name] of [[280, 'Писькогрыз jr.'], [280, 'Писькогрызjr.ОченьдлинноеимяцелиБезПробелов'], [390, 'TargetName'.repeat(24)]]) {
    await js(`original.targetName.textContent=${JSON.stringify(name)};localStorage.setItem('ff-desktop-combat-workspace-v1:/campaign-one',JSON.stringify({width:${width}}));`);
    await configure(false); await configure(true, 'en');
    await until(`document.documentElement.style.getPropertyValue('--ff-combat-width')==='${width}px'`);
    const target = await js("(()=>{const card=original.targetCard,name=original.targetName,range=document.createRange();range.selectNodeContents(name);const text=range.getBoundingClientRect(),c=card.getBoundingClientRect(),checkbox=original.targetCheckbox.getBoundingClientRect(),avatar=original.targetAvatar.getBoundingClientRect();return {name:name.textContent,text:{left:text.left,right:text.right,top:text.top,bottom:text.bottom},card:{left:c.left,right:c.right,top:c.top,bottom:c.bottom,width:c.width,scrollWidth:card.scrollWidth,clientWidth:card.clientWidth},next:{left:document.querySelector('#target-card-next').getBoundingClientRect().left,right:document.querySelector('#target-card-next').getBoundingClientRect().right},panelWidth:original.panel.getBoundingClientRect().width,dock:{scrollWidth:original.panel.scrollWidth,clientWidth:original.panel.clientWidth},lines:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),checkbox:{width:checkbox.width,height:checkbox.height,checked:original.targetCheckbox.getAttribute('aria-checked')},avatar:{width:avatar.width,height:avatar.height},retained:original.targetCard.isConnected&&original.targetName.isConnected&&document.querySelector('#target-card')===original.targetCard&&document.querySelector('#target-name')===original.targetName&&original.targetCard.onclick===originalTargetHandler}}})()");
    const alignment = await js("(()=>{const rangeFor=e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].map(x=>({left:x.left,right:x.right,top:x.top,bottom:x.bottom}))},info=e=>({text:e.textContent.trim(),whiteSpace:getComputedStyle(e).whiteSpace,box:(()=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}})(),lines:rangeFor(e)}),attackStat=original.attackStat.getBoundingClientRect(),modifierValue=original.modifierValue.getBoundingClientRect(),damageDice=original.damageDice.getBoundingClientRect(),damageStat=original.damageStat.getBoundingClientRect();return {attackStatTop:attackStat.top,modifierValueTop:modifierValue.top,damageDiceTop:damageDice.top,damageStatTop:damageStat.top,attackLabels:[info(document.querySelector('[data-ff-desktop-detail-card] label')),info(document.querySelector('[data-ff-desktop-detail-card] .grid > .space-y-2:nth-child(2) > .flex label'))],damageLabels:[info(document.querySelector('.relative.group.rounded-lg.border.bg-card.p-4 label')),info(document.querySelector('.relative.group.rounded-lg.border.bg-card.p-4 .space-y-1\\.5:nth-child(2) label'))],values:{modifier:original.modifierValue.value,dice:original.damageDice.value}}})()");
    assert.ok(Math.abs(alignment.attackStatTop - alignment.modifierValueTop) <= 1, `Custom attack characteristic and modifier controls align at ${width}px: ${JSON.stringify(alignment)}`);
    assert.ok(Math.abs(alignment.damageDiceTop - alignment.damageStatTop) <= 1, `Damage dice and characteristic modifier controls align at ${width}px: ${JSON.stringify(alignment)}`);
    for (const label of [...alignment.attackLabels, ...alignment.damageLabels]) {
      assert.equal(label.whiteSpace, 'normal', `Native row label wraps instead of truncating: ${JSON.stringify(label)}`);
      assert.ok(label.lines.length > 0 && label.lines.every(line => line.left >= label.box.left && line.right <= label.box.right && line.top >= label.box.top && line.bottom <= label.box.bottom), `Full row label remains readable: ${JSON.stringify(label)}`);
    }
    assert.deepEqual(alignment.values, { modifier: '0', dice: '1d6' }, 'Native field values remain intact.');
    assert.equal(target.name, name, 'Full native target name remains unchanged.');
    assert.ok(target.card.width < target.panelWidth / 2 + 1, `Target card remains a two-column half-width card at ${width}px: ${JSON.stringify(target)}`);
    assert.ok(target.lines.length > 0 && target.lines.every(line => line.left >= target.card.left && line.right <= target.card.right && line.top >= target.card.top && line.bottom <= target.card.bottom), `Every target-name range rect remains inside its card at ${width}px: ${JSON.stringify(target)}`);
    assert.ok(target.card.right <= target.next.left, `Adjacent target cards do not overlap at ${width}px: ${JSON.stringify(target)}`);
    if (name === 'Писькогрыз jr.') assert.ok(target.lines.length > 1, `The original target name wraps in its narrow card: ${JSON.stringify(target)}`);
    assert.ok(target.card.scrollWidth <= target.card.clientWidth && target.dock.scrollWidth <= target.dock.clientWidth, `Target card has no horizontal overflow at ${width}px: ${JSON.stringify(target)}`);
    assert.deepEqual(target.checkbox, { width: 16, height: 16, checked: 'false' }, 'Native target checkbox size and selected state remain intact.');
    assert.deepEqual(target.avatar, { width: 40, height: 40 }, 'Native target avatar size remains intact.');
    assert.equal(target.retained, true, 'Native target card and name node identity remain intact.');
  }
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
