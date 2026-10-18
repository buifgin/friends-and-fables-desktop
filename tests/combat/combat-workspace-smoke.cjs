// Native layout fixture. The coordinator owns the isolated Xvfb/WM launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const fixtureRoot = path.join(__dirname, '..', '..');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0}#play-workspace{display:flex;margin-left:60px;height:calc(100vh - 60px)}#chat-main{width:calc(100% - 260px);height:100%;overflow-y:auto;background:linear-gradient(red,maroon)}#chat{position:relative;isolation:isolate;width:100%;height:100%;box-sizing:border-box}#chat::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(blue,navy)}#right-pane{width:260px;flex:none;height:100%;background:#222}#chat-main::-webkit-scrollbar{width:10px}[data-ff-combat-docked]{position:fixed;top:60px;left:60px;width:var(--ff-combat-width);height:calc(100vh - 60px);display:flex;flex-direction:column;gap:8px;overflow:auto;background:#333;color:white}button.group{display:flex}input{max-width:100%;box-sizing:border-box}.target-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.target-card{display:flex;align-items:center;gap:12px;box-sizing:border-box;width:100%;padding:16px;border:1px solid #888}.target-details{display:flex;flex-direction:row;align-items:center;gap:8px}.target-avatar{display:block;flex:none;width:40px;height:40px;border-radius:50%;background:#777}.target-name{font-size:14px;font-weight:500}label.font-header{display:block;line-height:1.2}.grid{display:grid;gap:16px}
</style><div id="play-workspace"><main id="chat-main"><div id="chat" data-ff-combat-chat><div contenteditable="true" id="draft">retained draft</div></div></main><aside id="right-pane">Native right pane</aside></div><section data-ff-combat-docked><h2 data-ff-combat-heading>Choose a check</h2><div data-ff-combat-body><div class="grid"><button class="group" id="check"><div><svg class="lucide lucide-person-standing"></svg></div><span>Long native check label remains intact</span></button></div><div class="target-grid"><label class="target-card flex items-center space-x-3 rounded border p-4 clickable" id="target-card"><button type="button" role="checkbox" aria-checked="false" id="target-checkbox" style="width:16px;height:16px;flex:none"></button><input aria-hidden="true" tabindex="-1" type="checkbox" value="on" style="position:absolute;pointer-events:none;opacity:0;margin:0;transform:translateX(-100%);width:16px;height:16px"><div class="target-details flex flex-row items-center gap-2"><span class="target-avatar relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">A</span><div class="target-name text-sm font-medium" id="target-name">Писькогрыз jr.</div></div></label><label class="target-card flex items-center space-x-3 rounded border p-4 clickable" id="target-card-next"><button type="button" role="checkbox" aria-checked="false" id="target-checkbox-next" style="width:16px;height:16px;flex:none"></button><input aria-hidden="true" tabindex="-1" type="checkbox" value="on" style="position:absolute;pointer-events:none;opacity:0;margin:0;transform:translateX(-100%);width:16px;height:16px"><div class="target-details flex flex-row items-center gap-2"><span class="target-avatar relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">B</span><div class="target-name text-sm font-medium">Second target</div></div></label></div><div data-ff-desktop-detail-card="true"><div class="grid gap-4 sm:grid-cols-3"><div class="space-y-2"><div class="flex items-center gap-1 w-full"><label class="text-sm font-medium leading-none font-header">Характеристика</label></div><button id="attack-stat" type="button">СИЛ</button><select aria-hidden="true" tabindex="-1" style="position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"><option>STR</option></select></div><div class="space-y-2"><div class="flex items-center gap-1 w-full"><label class="text-sm font-medium leading-none font-header">Значение модификатора</label></div><div class="space-y-2"><div class="relative flex items-center"><input id="modifier_value" value="0"></div></div></div><div class="space-y-2"><div class="flex items-center gap-1 w-full"><label class="text-sm font-medium leading-none font-header">Бонус умения</label></div><div class="space-y-2"><div class="relative flex items-center"><input value="0"></div></div></div></div></div><div class="relative group rounded-lg border bg-card p-4"><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Бросок костей</label><div class="flex items-center gap-1.5"><div class="space-y-2"><div class="relative flex items-center"><input id="damage-dice" value="1d6"></div></div></div></div><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Модификатор характеристики</label><div class="flex items-center gap-1.5"><button id="damage-stat" type="button" role="combobox">СИЛ</button></div></div><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Фиксированный бонус</label><div class="flex items-center gap-1.5"><input value="0"></div></div><div class="space-y-1.5"><label class="font-header text-xs font-medium text-muted-foreground">Тип урона</label><div class="flex items-center gap-1.5"><button type="button">Дробящий</button></div></div></div></div><div data-ff-combat-corrections><label>Correction text<input id="correction-text" type="text" value="keep text"></label><label>Correction number<input id="correction-number" type="number" value="7"></label></div><div id="field-probes"><input id="field-text" type="text" value="retain text"><input id="field-number" type="number" value="3"><select id="field-select"><option selected>Retain option</option></select><textarea id="field-area">retain area</textarea><button id="field-combo" type="button" role="combobox">Retain combo</button><button id="field-button" type="button">Retain button</button><input id="field-input-button" type="button" value="Retain input button"><input id="field-submit" type="submit" value="Retain submit"><input id="field-reset" type="reset" value="Retain reset"><input id="field-checkbox" type="checkbox" checked><input id="field-radio" type="radio" checked><input id="field-range" type="range" value="35"><input id="field-color" type="color" value="#abcdef"></div><form><input value="retained roll"><button type="submit">Roll</button></form><div style="height:1400px"></div></div><button id="close" data-ff-combat-close>×</button></section><script>
window.original={panel:document.querySelector('[data-ff-combat-docked]'),check:document.querySelector('#check'),form:document.querySelector('form'),input:document.querySelector('form input'),close:document.querySelector('#close'),draft:document.querySelector('#draft'),targetCard:document.querySelector('#target-card'),targetCheckbox:document.querySelector('#target-checkbox'),targetAvatar:document.querySelector('.target-avatar'),targetName:document.querySelector('#target-name'),attackStat:document.querySelector('#attack-stat'),modifierValue:document.querySelector('#modifier_value'),damageDice:document.querySelector('#damage-dice'),damageStat:document.querySelector('#damage-stat')};window.selections=0;window.submits=0;window.ffCloseClicks=0;window.targetSelections=0;
original.check.onclick=()=>selections++;original.form.onsubmit=e=>{e.preventDefault();submits++};original.close.onclick=()=>ffCloseClicks++;original.targetCard.onclick=()=>targetSelections++;window.originalTargetHandler=original.targetCard.onclick;
document.documentElement.setAttribute('data-ff-combat-open','true');document.documentElement.style.setProperty('--ff-combat-rail-width','60px');document.documentElement.style.setProperty('--ff-combat-rail-top','60px');
</script>`;
function checkEmbeddedSyntax() {
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
  const fixture = fs.readFileSync(__filename, 'utf8');
  for (const match of fixture.matchAll(/\bjs\(\s*(["'])/g)) {
    const quote = match[1];
    const start = match.index + match[0].length - 1;
    let end = start + 1;
    while (end < fixture.length) {
      if (fixture[end] === '\\') { end += 2; continue; }
      if (fixture[end] === quote) break;
      end++;
    }
    if (end >= fixture.length) throw new Error('Unterminated serialized js() expression.');
    const script = new Function(`return (${fixture.slice(start, end + 1)})`)();
    try { new Function(script); }
    catch (error) { throw new Error(`Serialized js() expression syntax failed: ${error.message}`); }
  }
  const output = require('esbuild').transformSync(fs.readFileSync(path.join(fixtureRoot, 'src/combat/combat-workspace.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' });
  new Function(output.code);
}
checkEmbeddedSyntax();
if (process.argv.includes('--syntax')) { console.log('Combat workspace embedded syntax PASS'); process.exit(0); }
const { app, BrowserWindow, session } = require('electron');
if (process.env.FABLES_TEST_PROFILE_DIR) app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const { configureCombatWorkspace } = require(path.join(root, 'dist/combat/combat-workspace'));
const { combatPanelCss, combatPanelAppearanceCss } = require(path.join(root, 'dist/combat/combat-panel-style'));
const { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
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
    catch (error) { throw new Error(`Fixture evaluate failed for ${source.slice(0, 180)}: ${JSON.stringify({ name: error.name, message: error.message, stack: error.stack, code: error.code })}`); }
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
  await js(`original.panel.setAttribute('data-ff-combat-panel-mode','actions');document.head.append(Object.assign(document.createElement('style'),{id:'appearance-style'}));`);
  const setAppearance = settings => js(`document.getElementById('appearance-style').textContent=${JSON.stringify(combatPanelAppearanceCss(settings))}`);
  // A reserved gutter on main exposes native wallpaper beyond the custom
  // chat pseudo-layer even when the feed does not overflow (live strip:10px).
  const verifyChatBoundary=async()=>{
    const samples=await js(`new Promise(resolve=>{const samples=[];const sample=()=>{const main=document.querySelector('#chat-main'),chat=document.querySelector('#chat'),m=main.getBoundingClientRect(),c=chat.getBoundingClientRect(),right=document.querySelector('#right-pane').getBoundingClientRect();samples.push({mainRight:m.right,chatRight:c.right,rightLeft:right.left,mainWidth:m.width,chatWidth:c.width,mainClient:main.clientWidth,scroll:main.scrollHeight>main.clientHeight,padding:getComputedStyle(chat).paddingLeft,wallpaper:getComputedStyle(chat,'::before').backgroundImage,draft:original.draft.textContent,identity:document.querySelector('#draft')===original.draft});if(samples.length<24)requestAnimationFrame(sample);else resolve(samples)};requestAnimationFrame(sample)})`);
    assert.equal(samples.every(sample=>!sample.scroll),true,'Nonoverflow feed reproduces the reserved-gutter boundary.');
    assert.equal(samples.every(sample=>Math.abs(sample.mainRight-sample.chatRight)<.5),true,`Custom chat wallpaper reaches the split boundary without exposing native main wallpaper: ${JSON.stringify(samples)}`);
    assert.equal(samples.every(sample=>Math.abs(sample.rightLeft-sample.mainRight)<.5),true,'Right pane starts at the same split boundary.');
    assert.equal(samples.every(sample=>sample.mainWidth===samples[0].mainWidth&&sample.chatWidth===samples[0].chatWidth&&sample.padding===samples[0].padding),true,'Settled chat geometry stays stable across24 visible frames.');
    assert.equal(samples.every(sample=>sample.wallpaper.includes('gradient')&&sample.identity&&sample.draft==='retained draft'),true,'Custom wallpaper and native draft node remain intact.');
  };
  await verifyChatBoundary();
  await until("!!document.querySelector('[data-ff-combat-resizer]')");
  const fieldSelectors = ['#field-text','#field-number','#field-select','#field-area','#field-combo','#correction-text','#correction-number'];
  const fieldIds = ['field-text','field-number','field-select','field-area','field-combo','correction-text','correction-number'];
  const fieldValues = await js(`Object.fromEntries(${JSON.stringify(fieldIds)}.map(id=>[id,document.getElementById(id).value ?? document.getElementById(id).textContent]))`);
  await setAppearance({...DEFAULT_APPEARANCE.combatPanel,enabled:true,customizeButtons:true,cardBackground:'#123456',cardBackgroundOpacity:1});
  const stableCard = await js("document.querySelector('#target-card').getBoundingClientRect().toJSON()");
  const appearanceProbe = async (alpha, expected) => {
    await setAppearance({...DEFAULT_APPEARANCE.combatPanel,enabled:true,customizeButtons:true,cardBackground:'#123456',cardBackgroundOpacity:alpha});
    const state = await js(`(()=>({fields:${JSON.stringify(fieldSelectors)}.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),c=getComputedStyle(e);return {selector,bg:c.backgroundColor,color:c.color,outlineStyle:c.outlineStyle,outlineWidth:c.outlineWidth,rect:{x:r.x,y:r.y,width:r.width,height:r.height},connected:e.isConnected}}),unrelated:['#field-checkbox','#field-radio','#field-range','#field-color','#field-button','#field-input-button','#field-submit','#field-reset'].map(selector=>{const e=document.querySelector(selector),c=getComputedStyle(e);return {selector,bg:c.backgroundColor,appearance:c.appearance}}),card:document.querySelector('#target-card').getBoundingClientRect().toJSON()}))()`);
    for (const field of state.fields) assert.equal(field.bg,expected,`Attack field ${field.selector} receives the shared card color at opacity ${alpha}: ${JSON.stringify(field)}`);
    assert.ok(state.fields.every(field=>field.connected&&field.rect.width>0&&field.rect.height>0),`Attack field identities and geometry stay present: ${JSON.stringify(state.fields)}`);
    assert.ok(state.unrelated.every(field=>field.appearance!=='none'),`Checkbox/radio/range/color controls retain native appearance: ${JSON.stringify(state.unrelated)}`);
    assert.ok(state.unrelated.filter(field=>field.selector.includes('button')||field.selector==='#field-submit'||field.selector==='#field-reset').every(field=>field.bg!=='rgb(18, 52, 86)'),`Plain buttons retain button styling while only the role=combobox button receives the field card color: ${JSON.stringify(state.unrelated)}`);
    assert.equal(await js(`Object.fromEntries(${JSON.stringify(fieldIds)}.map(id=>[id,document.getElementById(id).value ?? document.getElementById(id).textContent]))`).then(value=>JSON.stringify(value)),JSON.stringify(fieldValues),'Field values remain intact.');
    assert.deepEqual(state.card,stableCard,'Card geometry remains stable while field appearance changes.');
    await js("document.querySelector('#field-text').focus({preventScroll:true})");
    const focus = await js("(()=>{const e=document.querySelector('#field-text'),c=getComputedStyle(e);return {active:document.activeElement===e,outline:c.outlineStyle,width:c.outlineWidth}})()");
    assert.equal(focus.active,true,'Native field remains focusable.');
    assert.equal(focus.outline,'solid','Appearance preserves a visible keyboard focus outline.');
  };
  await appearanceProbe(1,'rgb(18, 52, 86)');
  await appearanceProbe(.5,'rgba(18, 52, 86, 0.5)');
  await appearanceProbe(0,'rgba(18, 52, 86, 0)');
  await setAppearance({...DEFAULT_APPEARANCE.combatPanel,enabled:false,cardBackground:'#123456',cardBackgroundOpacity:1});
  const appearanceOff = await js("(()=>({fields:['#field-text','#field-number','#field-select','#field-area','#field-combo','#correction-text','#correction-number'].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor),native:['#field-checkbox','#field-radio','#field-range','#field-color'].map(s=>getComputedStyle(document.querySelector(s)).appearance)}))()");
  assert.equal(appearanceOff.fields.some(color=>color==='rgb(18, 52, 86)'),false,'Appearance-off keeps native attack fields on default styling.');
  assert.ok(appearanceOff.native.every(value=>value!=='none'),'Appearance-off preserves native checkbox, radio, range and color controls.');
  assert.equal(await js("document.querySelector('[data-ff-combat-density]')"), null, 'Density control is removed.');
  assert.equal(await js("document.querySelector('[data-ff-combat-workspace-tools]').getBoundingClientRect().height"), 0, 'Empty shortcut host has no toolbar spacing.');
  assert.equal(await js("getComputedStyle(original.panel).display"), 'flex', 'Dock is a real flex-column root.');
  for (const [width, name] of [[280, 'Писькогрыз jr.'], [280, 'Писькогрызjr.ОченьдлинноеимяцелиБезПробелов'], [390, 'TargetName'.repeat(24)]]) {
    await js(`original.targetName.textContent=${JSON.stringify(name)};localStorage.setItem('ff-desktop-combat-workspace-v1:/campaign-one',JSON.stringify({width:${width}}));`);
    await configure(false); await configure(true, 'en');
    await until(`document.documentElement.style.getPropertyValue('--ff-combat-width')==='${width}px'`);
    const target = await js("(()=>{try{const card=original.targetCard,name=original.targetName,range=document.createRange();range.selectNodeContents(name);const text=range.getBoundingClientRect(),c=card.getBoundingClientRect(),checkbox=original.targetCheckbox.getBoundingClientRect(),avatar=original.targetAvatar.getBoundingClientRect();return {name:name.textContent,text:{left:text.left,right:text.right,top:text.top,bottom:text.bottom},card:{left:c.left,right:c.right,top:c.top,bottom:c.bottom,width:c.width,scrollWidth:card.scrollWidth,clientWidth:card.clientWidth},next:{left:document.querySelector('#target-card-next').getBoundingClientRect().left,right:document.querySelector('#target-card-next').getBoundingClientRect().right},panelWidth:original.panel.getBoundingClientRect().width,dock:{scrollWidth:original.panel.scrollWidth,clientWidth:original.panel.clientWidth},lines:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),checkbox:{width:checkbox.width,height:checkbox.height,checked:original.targetCheckbox.getAttribute('aria-checked')},avatar:{width:avatar.width,height:avatar.height},retained:original.targetCard.isConnected&&original.targetName.isConnected&&document.querySelector('#target-card')===original.targetCard&&document.querySelector('#target-name')===original.targetName&&original.targetCard.onclick===originalTargetHandler}}catch(error){return {__fixtureEvaluationError:{name:error.name,message:error.message,stack:error.stack}}}})()");
    assert.equal(target.__fixtureEvaluationError, undefined, `Target geometry evaluation failed: ${JSON.stringify(target.__fixtureEvaluationError)}`);
    assert.equal(target.name, name, 'Full native target name remains unchanged.');
    assert.ok(target.card.width < target.panelWidth / 2 + 1, `Target card remains a two-column half-width card at ${width}px: ${JSON.stringify(target)}`);
    assert.ok(target.lines.length > 0 && target.lines.every(line => line.left >= target.card.left && line.right <= target.card.right && line.top >= target.card.top && line.bottom <= target.card.bottom), `Every target-name range rect remains inside its card at ${width}px: ${JSON.stringify(target)}`);
    assert.ok(target.card.right <= target.next.left, `Adjacent target cards do not overlap at ${width}px: ${JSON.stringify(target)}`);
    if (name === 'Писькогрыз jr.') assert.ok(target.lines.length > 1, `The original target name wraps in its narrow card: ${JSON.stringify(target)}`);
    assert.ok(target.card.scrollWidth <= target.card.clientWidth && target.dock.scrollWidth <= target.dock.clientWidth, `Target card has no horizontal overflow at ${width}px: ${JSON.stringify(target)}`);
    assert.deepEqual(target.checkbox, { width: 16, height: 16, checked: 'false' }, 'Native target checkbox size and selected state remain intact.');
    assert.deepEqual(target.avatar, { width: 40, height: 40 }, 'Native target avatar size remains intact.');
    assert.equal(target.retained, true, 'Native target card and name node identity remain intact.');
    const alignment = await js("(()=>{try{const rangeFor=e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].map(x=>({left:x.left,right:x.right,top:x.top,bottom:x.bottom}))},info=e=>({text:e.textContent.trim(),whiteSpace:getComputedStyle(e).whiteSpace,box:(()=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}})(),lines:rangeFor(e)}),attackStat=original.attackStat.getBoundingClientRect(),modifierValue=original.modifierValue.getBoundingClientRect(),damageDice=original.damageDice.getBoundingClientRect(),damageStat=original.damageStat.getBoundingClientRect(),attackGrid=document.querySelector('[data-ff-desktop-detail-card] > .grid'),damageGrid=document.querySelector('.relative.group.rounded-lg.border.bg-card.p-4 > .grid'),columnCount=grid=>getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length;return {attackColumns:columnCount(attackGrid),damageColumns:columnCount(damageGrid),attackOverflow:attackGrid.scrollWidth>attackGrid.clientWidth,damageOverflow:damageGrid.scrollWidth>damageGrid.clientWidth,attackStatTop:attackStat.top,modifierValueTop:modifierValue.top,damageDiceTop:damageDice.top,damageStatTop:damageStat.top,attackLabels:[info(document.querySelector('[data-ff-desktop-detail-card] label')),info(document.querySelector('[data-ff-desktop-detail-card] .grid > .space-y-2:nth-child(2) > .flex label'))],damageLabels:[info(document.querySelector('.relative.group.rounded-lg.border.bg-card.p-4 label')),info(document.querySelector('.relative.group.rounded-lg.border.bg-card.p-4 [class~='+JSON.stringify('space-y-1.5')+']:nth-child(2) label'))],values:{modifier:original.modifierValue.value,dice:original.damageDice.value}}}catch(error){return {__fixtureEvaluationError:{name:error.name,message:error.message,stack:error.stack}}}})()");
    assert.equal(alignment.__fixtureEvaluationError, undefined, `Row alignment evaluation failed: ${JSON.stringify(alignment.__fixtureEvaluationError)}`);
    assert.equal(alignment.attackColumns, width === 280 ? 1 : 2, `Custom attack grid uses the native column count at ${width}px: ${JSON.stringify(alignment)}`);
    assert.equal(alignment.damageColumns, width === 280 ? 1 : 2, `Damage grid uses the native column count at ${width}px: ${JSON.stringify(alignment)}`);
    assert.equal(alignment.attackOverflow, false, `Custom attack grid has no horizontal overflow at ${width}px: ${JSON.stringify(alignment)}`);
    assert.equal(alignment.damageOverflow, false, `Damage grid has no horizontal overflow at ${width}px: ${JSON.stringify(alignment)}`);
    if (alignment.attackColumns > 1) assert.ok(Math.abs(alignment.attackStatTop - alignment.modifierValueTop) <= 1, `Custom attack characteristic and modifier controls align in the same row at ${width}px: ${JSON.stringify(alignment)}`);
    if (alignment.damageColumns > 1) assert.ok(Math.abs(alignment.damageDiceTop - alignment.damageStatTop) <= 1, `Damage dice and characteristic modifier controls align in the same row at ${width}px: ${JSON.stringify(alignment)}`);
    for (const label of [...alignment.attackLabels, ...alignment.damageLabels]) {
      assert.equal(label.whiteSpace, 'normal', `Native row label wraps instead of truncating: ${JSON.stringify(label)}`);
      assert.ok(label.lines.length > 0 && label.lines.every(line => line.left >= label.box.left && line.right <= label.box.right && line.top >= label.box.top && line.bottom <= label.box.bottom), `Full row label remains readable: ${JSON.stringify(label)}`);
    }
    assert.deepEqual(alignment.values, { modifier: '0', dice: '1d6' }, 'Native field values remain intact.');
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
  await window.setContentSize(980,780);await until('innerWidth===980');await verifyChatBoundary();
  await window.setContentSize(1100,780);await until('innerWidth===1100');
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
