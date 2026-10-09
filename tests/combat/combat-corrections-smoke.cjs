// Coordinator schedules native execution on the isolated display; --syntax needs no Electron.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const html = `<!doctype html><meta charset="utf-8"><style>body{background:#222;color:white}section{width:308px}input{max-width:100%}</style>
<div contenteditable id="draft">preserved draft</div><canvas id="canvas"></canvas><section data-ff-combat-docked></section><script>
window.submits=[];window.changes=0;window.inputs=0;
window.mount=()=>{
 const dock=document.querySelector('section');dock.innerHTML='<div data-ff-combat-shortcuts-slot></div><form id="native-form"><input id="description" value="attack draft"><label>Modifier<input id="modifier_value" inputmode="decimal" value="0"></label><label>Proficiency<input id="proficiency_bonus" inputmode="decimal" value="2"></label><input id="unrecognised" value="keep"><button id="submit" type="submit">Attack</button></form>';
 window.state={modifier_value:'0',proficiency_bonus:'2'};window.native={form:document.querySelector('form'),submit:document.querySelector('#submit'),modifier:document.querySelector('#modifier_value'),proficiency:document.querySelector('#proficiency_bonus'),description:document.querySelector('#description'),draft:document.querySelector('#draft'),canvas:document.querySelector('#canvas')};
 for(const id of ['modifier_value','proficiency_bonus']){
  const input=document.getElementById(id),descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');let tracked=input.value;
  Object.defineProperty(input,'value',{get(){return descriptor.get.call(this)},set(value){tracked=String(value);descriptor.set.call(this,value)},configurable:true});
  input.addEventListener('input',()=>{inputs++;if(input.value!==tracked){tracked=input.value;state[id]=input.value;}});
  input.addEventListener('change',()=>changes++);
 }
 native.form.addEventListener('submit',event=>{event.preventDefault();submits.push({...state,description:native.description.value})});
};mount();
</script>`;
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
const output = require('esbuild').transformSync(fs.readFileSync(path.join(root, 'src/combat/combat-corrections.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' });
new Function(output.code);
if (process.argv.includes('--syntax')) { console.log('Combat corrections embedded/serialized syntax PASS'); process.exit(0); }
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Run through the central fixture runner for a private profile.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const { configureCombatCorrections } = require(path.join(root, 'dist/combat/combat-corrections'));
let window;
const timer = setTimeout(() => { console.error('Combat corrections fixture timed out'); window?.destroy(); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
(async () => {
 await app.whenReady();
 const site = session.fromPartition(`combat-corrections-${process.pid}`);
 site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
 window = new BrowserWindow({ show: false, width: 900, height: 800, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
 const js = source => window.webContents.executeJavaScript(source);
 const until = async expression => { for (let n=0;n<100;n++) { if(await js(expression))return; await new Promise(resolve=>setTimeout(resolve,20)); } throw Error('Timed out: '+expression); };
 const configure = (enabled=true,locale='en') => js(`(${configureCombatCorrections.toString()})(${enabled},${JSON.stringify(locale)})`);
 const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const set = (selector,value) => js(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);
 const identity = () => js("native.form===document.querySelector('form')&&native.submit===document.querySelector('#submit')&&native.modifier===document.querySelector('#modifier_value')&&native.proficiency===document.querySelector('#proficiency_bonus')&&native.description.value==='attack draft'&&native.draft.textContent==='preserved draft'&&native.canvas===document.querySelector('canvas')&&document.querySelector('#unrecognised').value==='keep'");
 await window.loadURL('https://play.fables.gg/campaign-one/play'); window.showInactive(); window.webContents.focus();
 await until("document.visibilityState==='visible'&&document.hasFocus()");
 // A direct assignment plus events fools a controlled value tracker. Ensure this fixture detects it.
 await js("native.modifier.value='9';native.modifier.dispatchEvent(new Event('input',{bubbles:true}))");
 assert.equal(await js('state.modifier_value'),'0');
 await js("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(native.modifier,'0');native.modifier.dispatchEvent(new Event('input',{bubbles:true}))");
 await configure(); await until("!!document.querySelector('[data-ff-combat-corrections]')");
 assert.equal(await identity(),true);
 await js("window.scrollCalls=0;document.querySelector('[data-ff-combat-corrections]').scrollIntoView=()=>scrollCalls++");
 await click('[data-ff-correction-shortcut]');
 assert.equal(await js("document.querySelector('[data-ff-combat-corrections]').open"),true);
 assert.equal(await js('scrollCalls'),1,'Shortcut opens and scrolls to corrections.');
 assert.equal(await js('submits.length'),0,'Toolbar shortcut never submits the native form.');
 assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]').parentElement.hasAttribute('data-ff-combat-shortcuts-slot')"),true);
 await js("document.querySelector('[data-ff-combat-shortcuts-slot]').remove()"); await until("!document.querySelector('[data-ff-correction-shortcut]')");
 await js("const slot=document.createElement('div');slot.setAttribute('data-ff-combat-shortcuts-slot','');document.querySelector('section').prepend(slot)"); await until("document.querySelectorAll('[data-ff-correction-shortcut]').length===1");
 assert.equal(await js("document.querySelector('[data-ff-combat-corrections]').closest('form')"),null,'Owned controls cannot implicitly submit the native form.');
 await set('[data-ff-correction-value=modifier_value]','3'); await click('[data-ff-correction-apply-modifier_value]');
 assert.equal(await js('state.modifier_value'),'3','Native event state updates, not just DOM value.');
 await click('[data-ff-correction-proficiency_bonus-plus]'); assert.equal(await js('state.proficiency_bonus'),'3');
 assert.equal(await js('submits.length'),0,'Corrections never roll.');
 await click('#submit'); assert.deepEqual(await js('submits[0]'),{modifier_value:'3',proficiency_bonus:'3',description:'attack draft'});
 await set('[data-ff-correction-name]','My local attack'); await click('[data-ff-correction-save]');
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-combat-corrections-v1:/campaign-one'))[0].name"),'My local attack');
 await click('[data-ff-correction-modifier_value-zero]'); assert.equal(await js('state.modifier_value'),'0');
 await configure(false); await configure(); await until("!!document.querySelector('[data-ff-combat-corrections]')");
 assert.equal(await js('state.modifier_value'),'0','Re-enable never auto-applies a saved preset.');
 await set('[data-ff-correction-presets]','My local attack'); await click('[data-ff-correction-load]'); assert.equal(await js('state.modifier_value'),'3');
 await set('[data-ff-correction-value=modifier_value]','101'); await click('[data-ff-correction-apply-modifier_value]');
 await set('[data-ff-correction-value=modifier_value]','1e2'); await click('[data-ff-correction-apply-modifier_value]'); assert.equal(await js('state.modifier_value'),'3','Out of bounds/exponent input rejected.');
 await js("native.proficiency.disabled=true"); await until("document.querySelector('[data-ff-correction-load]').disabled");
 await click('[data-ff-correction-modifier_value-zero]'); await click('[data-ff-correction-load]'); assert.equal(await js('state.modifier_value'),'0','Unavailable field prevents partial preset load.');
 await js("native.proficiency.disabled=false;native.modifier.readOnly=true"); await until("document.querySelector('[data-ff-correction-value=modifier_value]').disabled");
 await click('[data-ff-correction-modifier_value-plus]'); assert.equal(await js('state.modifier_value'),'0');
 await js('native.modifier.readOnly=false'); await until("!document.querySelector('[data-ff-correction-load]').disabled");
 for (const [attribute,value] of [['aria-disabled','true'],['data-disabled',''],['hidden','']]) {
  await js(`native.modifier.setAttribute(${JSON.stringify(attribute)},${JSON.stringify(value)})`);
  await until("document.querySelector('[data-ff-correction-value=modifier_value]').disabled");
  await click('[data-ff-correction-modifier_value-plus]'); assert.equal(await js('state.modifier_value'),'0','Hidden/ARIA/data-disabled fields cannot be corrected.');
  await js(`native.modifier.removeAttribute(${JSON.stringify(attribute)})`);
  await until("!document.querySelector('[data-ff-correction-value=modifier_value]').disabled");
 }
 await click('[data-ff-correction-delete]'); assert.deepEqual(await js("JSON.parse(localStorage.getItem('ff-desktop-combat-corrections-v1:/campaign-one'))"),[]);
 assert.equal(await identity(),true); assert.equal(await js('submits.length'),1);
 await configure(true,'ru'); assert.equal(await js("document.querySelector('[data-ff-combat-corrections] summary').textContent"),'Поправки к броску'); assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]').textContent"),'Поправки');
 assert.equal(await js("document.querySelector('[data-ff-combat-corrections]').getAttribute('data-ff-translation-ignore')"),'true');
 await configure(true,'en'); assert.equal(await js("document.querySelector('[data-ff-combat-corrections] summary').textContent"),'Roll corrections');
 await js('mount()'); await until("document.querySelectorAll('[data-ff-combat-corrections]').length===1&&document.querySelectorAll('[data-ff-correction-shortcut]').length===1"); assert.equal(await js('state.modifier_value'),'0'); assert.equal(await identity(),true);
 await configure(false); await js("localStorage.setItem('ff-desktop-combat-corrections-v1:/campaign-one','[{\"name\":\"bad\",\"values\":{\"modifier_value\":999,\"proficiency_bonus\":2}}]')");
 await configure(); assert.equal(await js("document.querySelector('[data-ff-correction-presets]').options.length"),1,'Malformed presets ignored.');
 await configure(false); await js("window.storageDescriptor=Object.getOwnPropertyDescriptor(Storage.prototype,'setItem');Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError')}");
 await configure(); await set('[data-ff-correction-name]','Blocked'); await click('[data-ff-correction-save]');
 assert.match(await js("document.querySelector('[data-ff-combat-corrections] [role=status]').textContent"),/unavailable/);
 assert.equal(await js("document.querySelector('[data-ff-correction-presets]').options.length"),1);
 await click('[data-ff-correction-modifier_value-plus]'); assert.equal(await js('state.modifier_value'),'1','Storage failures do not break manual corrections.');
 await configure(false); await js("window.getDescriptor=Object.getOwnPropertyDescriptor(Storage.prototype,'getItem');Storage.prototype.getItem=function(){throw new DOMException('blocked','SecurityError')}"); await configure(); assert.equal(await js("document.querySelector('[data-ff-correction-presets]').options.length"),1); await js("Object.defineProperty(Storage.prototype,'getItem',getDescriptor)");
 await js("Object.defineProperty(Storage.prototype,'setItem',storageDescriptor);history.pushState({},'', '/campaign-two/play');dispatchEvent(new PopStateEvent('popstate'))");
 await until("document.querySelector('[data-ff-correction-presets]').options.length===1"); assert.equal(await js('state.modifier_value'),'1');
 await js("history.pushState({},'', '/campaign-two/details');dispatchEvent(new PopStateEvent('popstate'))"); await until("!document.querySelector('[data-ff-combat-corrections]')&&!document.querySelector('[data-ff-correction-shortcut]')");
 await js("history.pushState({},'', '/campaign-two/play');dispatchEvent(new PopStateEvent('popstate'))"); await until("!!document.querySelector('[data-ff-combat-corrections]')");
 await configure(false); assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]')"),null); assert.equal(await js("document.querySelector('[data-ff-combat-corrections-style]')"),null); assert.equal(await js("document.querySelector('[data-ff-combat-corrections]')"),null); assert.equal(await identity(),true);
 assert.equal(await js('submits.length'),1); assert.ok(await js('changes>0&&inputs>0'));
 console.log('Combat corrections fixture PASS'); window.destroy(); clearTimeout(timer); app.exit(0);
})().catch(error=>{console.error(error);window?.destroy();clearTimeout(timer);app.exit(1)});
