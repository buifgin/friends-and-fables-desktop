// Coordinator-scheduled Electron fixture; syntax-check before launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { configureCombatPanel } = require(path.join(root, 'dist/combat/combat-panel'));
const { combatPanelCss } = require(path.join(root, 'dist/combat/combat-panel-style'));
let window;
const timer = setTimeout(() => { console.error('Combat fixture timed out'); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0}#campaign{display:flex;margin-left:76px;height:650px}#chat{width:750px}#map{margin-left:20px;width:240px;height:240px}canvas{width:240px;height:240px}.fixed{position:fixed}.inset-0{inset:0}.z-50{z-index:50}.overlay{background:#0008}.native{top:60px;left:200px;width:650px;min-height:300px;background:white;z-index:50;pointer-events:auto}
</style><div id="campaign"><div id="chat" class="flex-1 h-full w-full"><div id="events-list"></div><div id="composer"><div class="tiptap" contenteditable="true">preserved draft</div><button aria-label="Roll dice"><svg class="lucide-dice-3"></svg></button><button id="actions"><svg class="lucide-swords"></svg></button></div></div><div id="map"><canvas class="touch-none" tabindex="0"></canvas></div></div>
<script>
window.backgroundWheels=0;window.opens=0;window.skillSelections=0;window.submits=0;window.mapClicks=0;window.reactFocus=0;window.encounter=true;
const campaign=document.getElementById('campaign'),editor=document.querySelector('.tiptap'),canvas=document.querySelector('canvas');
window.originalEditor=editor;window.originalCanvas=canvas;
document.getElementById('composer').__reactFiberFixture={memoizedProps:{encounterActive:true}};
campaign.addEventListener('wheel',()=>window.backgroundWheels++);
campaign.addEventListener('focusin',()=>window.reactFocus++);canvas.addEventListener('click',()=>window.mapClicks++);
window.nativeClose=()=>{};
window.openNative=(diceMode=false)=>{
 window.opens++; const overlay=document.createElement('div');overlay.className='fixed inset-0 z-50 overlay';overlay.dataset.state='open';
 const dialog=document.createElement('div');dialog.className='fixed native';dialog.setAttribute('role','dialog');dialog.dataset.state='open';dialog.tabIndex=-1;
 dialog.innerHTML='<h2>Choose Action</h2><div role="tablist"><button role="tab">Weapons</button><button role="tab">Spells</button><button role="tab">Custom</button></div><form><input name="description" value="custom draft"><button type="submit">Attack</button></form><button id="nested">Ability selector</button><button id="x"><svg class="lucide-x"></svg>Close</button>';
 if(diceMode){dialog.querySelector('h2').textContent='Title';const skills=document.createElement('section');skills.innerHTML='<h3>Ability checks</h3><h3>Skills</h3><button id=\"acrobatics\">Acrobatics Check</button>';dialog.append(skills);skills.querySelector('button').onclick=()=>{window.skillSelections++;skills.innerHTML='<h4>Roll Acrobatics Check</h4><button type=\"button\">List</button>';dialog.querySelector('button[type=submit]').textContent='Roll'}}
 document.body.append(overlay,dialog);document.body.style.pointerEvents='none';document.body.style.overflow='hidden';campaign.setAttribute('aria-hidden','true');
 window.originalForm=dialog.querySelector('form');originalForm.onsubmit=e=>{e.preventDefault();window.submits++};
 let last=dialog.querySelector('input'),nested=null;
 const trap=e=>{if(nested)return;let target=e.type==='focusout'?e.relatedTarget:e.target;if(!target)return;if(dialog.contains(target)){last=target}else last.focus()};
 const pointer=e=>{if(dialog.contains(e.target)||nested)return;const outside=new CustomEvent('dismissableLayer.pointerDownOutside',{bubbles:false,cancelable:true,detail:{originalEvent:e}});e.target.dispatchEvent(outside);if(!outside.defaultPrevented)close()};
 const scrollLock=e=>{if(!dialog.contains(e.target))e.preventDefault()};document.addEventListener('wheel',scrollLock,{passive:false});
 const escape=e=>{if(e.key==='Escape'&&!nested)close()};
 const close=()=>{document.removeEventListener('wheel',scrollLock);document.removeEventListener('focusin',trap);document.removeEventListener('focusout',trap);document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',escape);dialog.remove();overlay.remove();document.body.style.pointerEvents='';document.body.style.overflow='';campaign.removeAttribute('aria-hidden')};
 window.nativeClose=close;document.getElementById('x').onclick=close;
 document.getElementById('nested').onclick=()=>{nested=document.createElement('div');nested.setAttribute('role','listbox');nested.tabIndex=0;nested.textContent='Native nested options';document.body.append(nested);window.nestedClose=()=>{nested.remove();nested=null};nested.focus()};
 // Matches native effect ordering: these listeners are installed after open.
 document.addEventListener('focusin',trap);document.addEventListener('focusout',trap);document.addEventListener('pointerdown',pointer);document.addEventListener('keydown',escape);last.focus();
};
document.getElementById('actions').onclick=()=>openNative();document.querySelector('[aria-label=\"Roll dice\"]').onclick=()=>openNative(true);
</script>`;
(async () => {
 await app.whenReady();
 const site=session.fromPartition('combat-fixture');site.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
 window=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const js=source=>window.webContents.executeJavaScript(source);
 const until=async expression=>{for(let n=0;n<100;n++){if(await js(expression))return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Timed out: '+expression)};
 const configure=(enabled=true,locale='en')=>js(`(${configureCombatPanel.toString()})(${enabled},${JSON.stringify(locale)},${JSON.stringify(combatPanelCss)})`);
 await window.loadURL('https://play.fables.gg/fixture/play');await configure();
 await until("!!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js('opens'),1,'Auto activation opens native picker once; never submits.');
 assert.equal(await js('submits'),0);
 assert.equal(await js("document.body.style.pointerEvents"),'auto');
 assert.equal(await js("document.getElementById('campaign').hasAttribute('aria-hidden')"),false);
 assert.equal(await js("getComputedStyle(document.querySelector('.overlay')).display"),'none');
 assert.equal(await js("document.querySelector('form')===originalForm && document.querySelector('canvas')===originalCanvas && document.querySelector('.tiptap')===originalEditor"),true);
 await js("originalEditor.focus();originalEditor.textContent+=' typed';originalCanvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));originalCanvas.click()");
 assert.equal(await js('document.activeElement===originalEditor'),true,'FocusScope permits actual background focus.');
 assert.equal(await js('reactFocus>0'),true,'Root React-style focus handler still runs.');
 assert.equal(await js('mapClicks'),1);
 assert.equal(await js("!!document.querySelector('[data-ff-combat-docked]')"),true,'Outside pointer must not dismiss picker.');
 assert.equal(await js("originalEditor.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:50}))"),true,'Background wheel keeps its default behavior despite native document scroll lock.');
 assert.equal(await js('backgroundWheels'),1,'Root wheel handlers still run.');
 await js('originalForm.requestSubmit()');assert.equal(await js('submits'),1,'Native submit handler remains the only submission path.');
 await configure(true,'ru');assert.equal(await js("document.querySelectorAll('[data-ff-combat-launcher]').length"),1);
 assert.equal(await js("document.querySelector('input').value"),'custom draft');
 await js("document.getElementById('nested').click()");await until("!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js("document.body.style.pointerEvents"),'none','Nested native layer restores modal pointer protection.');
 assert.equal(await js("document.getElementById('campaign').getAttribute('aria-hidden')"),'true');
 await js('window.nestedClose()');await until("!!document.querySelector('[data-ff-combat-docked]')");
 await js("document.querySelector('[data-ff-combat-mode=skills]').click()");await until("!!document.querySelector('#acrobatics') && !!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js('submits'),1,'Switching to native skills never rolls.');
 await js("document.getElementById('acrobatics').click()");await until("!document.querySelector('#acrobatics')");
 assert.equal(await js('skillSelections'),1);await configure(true,'en');
 assert.equal(await js("!!document.querySelector('[data-ff-combat-docked]')"),true,'Native selected skill detail remains docked on reinjection.');
 await js('originalEditor.focus()');assert.equal(await js('document.activeElement===originalEditor'),true);
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");await until("!!document.querySelector('h2') && document.querySelector('h2').textContent==='Choose Action' && !!document.querySelector('[data-ff-combat-docked]')");
 await js("document.querySelector('[data-ff-combat-launcher]').click()");await until("!document.querySelector('[role=dialog]')");
 await new Promise(resolve=>setTimeout(resolve,600));assert.equal(await js('opens'),3,'Manual collapse lasts through encounter.');
 assert.equal(await js("document.body.style.cssText"),'');
 assert.equal(await js("originalEditor.textContent"),'preserved draft typed');
 await js("document.querySelector('[data-ff-combat-launcher]').click()");await until("!!document.querySelector('[data-ff-combat-docked]')");
 await js('nativeClose()');await until("!document.documentElement.hasAttribute('data-ff-combat-open')");
 assert.equal(await js("document.body.style.cssText"),'','External native close must not replay stale modal locks.');
 await js("document.querySelector('[data-ff-combat-launcher]').click()");await until("!!document.querySelector('[data-ff-combat-docked]')");
 await js("history.pushState({},'', '/fixture/details');dispatchEvent(new PopStateEvent('popstate'))");await until("!document.querySelector('[role=dialog]')");
 await js("history.pushState({},'', '/fixture/play');dispatchEvent(new PopStateEvent('popstate'))");await until("!!document.querySelector('[data-ff-combat-docked]')");
 await configure(false);await until("!document.querySelector('[role=dialog]')");
 assert.equal(await js("document.body.style.cssText"),'','Disposal of active panel lets native modal cleanup finish.');
 assert.equal(await js("document.querySelector('[data-ff-combat-tools]')"),null);
 assert.equal(await js("document.querySelector('[data-ff-combat-launcher]')"),null);
 assert.equal(await js("document.getElementById('campaign').hasAttribute('aria-hidden')"),false);
 await js("openNative();document.querySelector('input').value='already open draft'");await configure();
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')"),null,'Do not adapt preexisting modal with unknown focus-listener ordering.');
 assert.equal(await js("document.querySelector('input').value"),'already open draft');await configure(false);await js('nativeClose()');
 console.log('Combat modal fidelity fixture passed');window.destroy();clearTimeout(timer);app.exit(0);
})().catch(error=>{console.error(error);window?.destroy();clearTimeout(timer);app.exit(1)});
