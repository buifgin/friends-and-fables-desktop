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
body{margin:0}#campaign{display:flex;margin-left:76px;height:650px}#chat{width:750px}#map{margin-left:20px;width:240px;height:240px}canvas{width:240px;height:240px}.fixed{position:fixed}.inset-0{inset:0}.z-50{z-index:50}.overlay{background:#0008}.native{top:60px;left:200px;width:650px;min-height:300px;background:white;z-index:50;pointer-events:auto}[class~="md:min-w-[980px]"]{min-width:980px;min-height:600px;max-height:600px;overflow-y:auto;padding-block:1rem}
</style><div id="campaign"><div id="chat" class="flex-1 h-full w-full"><div id="events-list"></div><div id="composer"><div class="tiptap" contenteditable="true">preserved draft</div><button aria-label="Roll dice"><svg class="lucide-dice-3"></svg></button><button id="actions"><svg class="lucide-swords"></svg></button></div></div><div id="map"><canvas class="touch-none" tabindex="0"></canvas></div></div>
<script>
window.backgroundWheels=0;window.opens=0;window.skillSelections=0;window.rememberedSkill=false;window.submits=0;window.mapClicks=0;window.reactFocus=0;window.encounter=true;
const campaign=document.getElementById('campaign'),editor=document.querySelector('.tiptap'),canvas=document.querySelector('canvas');
window.originalEditor=editor;window.originalCanvas=canvas;
document.getElementById('composer').__reactFiberFixture={memoizedProps:{encounterActive:true}};
campaign.addEventListener('wheel',()=>window.backgroundWheels++);
campaign.addEventListener('focusin',()=>window.reactFocus++);canvas.addEventListener('click',()=>window.mapClicks++);
window.nativeClose=()=>{};
window.openNative=(diceMode=false)=>{
 window.opens++; const overlay=document.createElement('div');overlay.className='fixed inset-0 z-50 overlay';overlay.dataset.state='open';
 const dialog=document.createElement('div');dialog.className='fixed native';dialog.setAttribute('role','dialog');dialog.dataset.state='open';dialog.tabIndex=-1;
 dialog.innerHTML='<h2>Choose Action</h2><div role="tablist"><button role="tab">Weapons</button><button role="tab">Spells</button><button role="tab">Custom</button></div><div class="md:min-w-[980px] md:min-h-[600px] md:max-h-[600px] overflow-y-auto py-4"><form><input name="description" value="custom draft"><button type="submit">Attack</button></form></div><button id="nested">Ability selector</button><button id="x"><svg class="lucide-x"></svg>Close</button>';
 if(diceMode){
 dialog.querySelector('h2').textContent='Title';const skills=document.createElement('section');dialog.append(skills);
 const detail=()=>{dialog.setAttribute('data-ff-desktop-message','roll-menu');skills.innerHTML='<button type="button"><svg class="lucide-chevron-left"></svg>List</button><div class="text-center absolute left-1/2">Roll Acrobatics Check</div><button type="button" role="combobox">Normal</button><svg id="d20" data-ff-desktop-die="d20"></svg>';dialog.querySelector('button[type=submit]').textContent='Roll'};
 if(window.rememberedSkill)detail();
 else {skills.innerHTML='<h3>Ability checks</h3><h3>Skills</h3><button id="acrobatics">Acrobatics Check</button>';skills.querySelector('button').onclick=()=>{window.skillSelections++;window.rememberedSkill=true;detail()}}
 }
 document.body.append(overlay,dialog);document.body.style.pointerEvents='none';document.body.style.overflow='hidden';campaign.setAttribute('aria-hidden','true');
 window.originalForm=dialog.querySelector('form');originalForm.onsubmit=e=>{e.preventDefault();window.submits++};
 let last=dialog.querySelector('input'),nested=null;
 const trap=e=>{if(nested)return;let target=e.type==='focusout'?e.relatedTarget:e.target;if(!target)return;if(dialog.contains(target)){last=target}else last.focus()};
 const pointer=e=>{if(dialog.contains(e.target)||nested)return;const outside=new CustomEvent('dismissableLayer.pointerDownOutside',{bubbles:false,cancelable:true,detail:{originalEvent:e}});e.target.dispatchEvent(outside);if(!outside.defaultPrevented)close()};
 const scrollLock=e=>{if(!dialog.contains(e.target))e.preventDefault()};document.addEventListener('wheel',scrollLock,{passive:false});
 const escape=e=>{if(e.key==='Escape'&&!nested)close()};
 const close=()=>{document.removeEventListener('wheel',scrollLock);document.removeEventListener('focusin',trap);document.removeEventListener('focusout',trap);document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',escape);dialog.remove();overlay.remove();document.body.style.pointerEvents='';document.body.style.overflow='';campaign.removeAttribute('aria-hidden')};
 window.nativeClose=close;document.getElementById('x').onclick=close;
 document.getElementById('nested').onclick=()=>{
 nested=document.createElement('div');nested.setAttribute('role','listbox');nested.tabIndex=0;nested.style.cssText='position:fixed;left:180px;top:200px;z-index:50;pointer-events:auto;background:white';nested.textContent='Native nested options';document.body.append(nested);
 const nestedTrap=e=>{const target=e.type==='focusout'?e.relatedTarget:e.target;if(target && nested && !nested.contains(target))nested.focus()};
 document.addEventListener('focusin',nestedTrap);document.addEventListener('focusout',nestedTrap);
 window.nestedClose=()=>{document.removeEventListener('focusin',nestedTrap);document.removeEventListener('focusout',nestedTrap);nested.remove();nested=null;last.focus()};nested.focus();
 };
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
 await window.loadURL('https://play.fables.gg/fixture/play');
 // Focus assertions require a visible renderer. showInactive keeps placement
 // silent; the coordinator's scoped native guard owns desktop focus policy.
 window.showInactive();window.webContents.focus();
 console.log('Combat focus readiness', await js('({visibility:document.visibilityState,focused:document.hasFocus(),active:document.activeElement?.tagName,width:innerWidth,height:innerHeight})'));
 await until("document.visibilityState==='visible' && document.hasFocus()");
 await configure();
 await until("!!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js('opens'),1,'Auto activation opens native picker once; never submits.');
 assert.equal(await js('submits'),0);
 assert.equal(await js("document.body.style.pointerEvents"),'auto');
 assert.equal(await js("document.getElementById('campaign').hasAttribute('aria-hidden')"),false);
 assert.equal(await js("getComputedStyle(document.querySelector('.overlay')).display"),'none');
 assert.equal(await js("document.querySelector('form')===originalForm && document.querySelector('canvas')===originalCanvas && document.querySelector('.tiptap')===originalEditor"),true);
 const nativeFormGeometry=await js("(()=>{const panel=document.querySelector('[data-ff-combat-docked]').getBoundingClientRect(),wrapper=document.querySelector('[class~=\"md:min-w-[980px]\"]').getBoundingClientRect(),form=document.querySelector('form').getBoundingClientRect(),input=document.querySelector('input'),b=input.getBoundingClientRect(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2);return {panel:{left:panel.left,right:panel.right,width:panel.width},wrapper:{left:wrapper.left,right:wrapper.right,width:wrapper.width},form:{left:form.left,right:form.right,width:form.width},input:{left:b.left,right:b.right,width:b.width},wrapperWithin:wrapper.left>=panel.left&&wrapper.right<=panel.right,formWithin:form.left>=panel.left&&form.right<=panel.right,inputWithin:b.left>=panel.left&&b.right<=panel.right,inputHit:document.elementFromPoint(x,y)===input}})()");
 assert.equal(nativeFormGeometry.wrapperWithin,true,`Native 980px child must fit inside the dock: ${JSON.stringify(nativeFormGeometry)}`);
 assert.equal(nativeFormGeometry.formWithin,true,`Native form must fit inside the dock: ${JSON.stringify(nativeFormGeometry)}`);
 assert.equal(nativeFormGeometry.inputWithin,true,`Native input must fit inside the dock: ${JSON.stringify(nativeFormGeometry)}`);
 assert.equal(nativeFormGeometry.inputHit,true,`Native input center must hit the input: ${JSON.stringify(nativeFormGeometry)}`);
 await js("originalEditor.focus();originalEditor.textContent+=' typed';originalCanvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));originalCanvas.click()");
 assert.equal(await js('document.activeElement===originalEditor'),true,'FocusScope permits actual background focus.');
 const focusState=await js('({focused:document.hasFocus(),visibility:document.visibilityState,active:document.activeElement?.className,rootFocusEvents:reactFocus})');
 console.log('Combat outside focus state',focusState);
 assert.equal(focusState.rootFocusEvents>0,true,'Root React-style focus handler still runs.');
 assert.equal(await js('mapClicks'),1);
 assert.equal(await js("!!document.querySelector('[data-ff-combat-docked]')"),true,'Outside pointer must not dismiss picker.');
 assert.equal(await js("originalEditor.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:50}))"),true,'Background wheel keeps its default behavior despite native document scroll lock.');
 assert.equal(await js('backgroundWheels'),1,'Root wheel handlers still run.');
 await js('originalForm.requestSubmit()');assert.equal(await js('submits'),1,'Native submit handler remains the only submission path.');
 await configure(true,'ru');assert.equal(await js("document.querySelectorAll('[data-ff-combat-launcher]').length"),1);
 assert.equal(await js("document.querySelector('input').value"),'custom draft');
 const panelBounds=()=>js("(()=>{const b=document.querySelector('[data-ff-combat-docked]').getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}})()");
 const beforeNested=await panelBounds();
 const chatBeforeNested=await js("document.getElementById('chat').getBoundingClientRect().width");
 await js("window.nestedParent=document.querySelector('[data-ff-combat-docked]');document.getElementById('nested').click()");
 await until("document.body.style.pointerEvents==='none' && document.querySelector('[data-ff-combat-tools]').hidden");
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')===nestedParent && document.querySelector('form')===originalForm"),true,'Nested native popup retains original dock and form.');
 assert.deepEqual(await panelBounds(),beforeNested,'Opening a nested native popup must keep its parent bounds stable.');
 assert.equal(await js("document.getElementById('chat').getBoundingClientRect().width"),chatBeforeNested,'Chat reservation stays stable under a nested modal.');
 assert.equal(await js("document.getElementById('campaign').getAttribute('aria-hidden')"),'true');
 assert.equal(await js("document.body.style.overflow"),'hidden');
 assert.notEqual(await js("getComputedStyle(document.querySelector('.overlay')).display"),'none','Native overlay protection resumes.');
 await js('originalEditor.focus()');
 assert.equal(await js("document.activeElement===document.querySelector('[role=listbox]')"),true,'Adapter focus gate yields to nested native focus trap.');
 assert.equal(await js("originalEditor.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:50}))"),false,'Adapter wheel gate yields to native nested scroll lock.');
 assert.equal(await js("(()=>{const event=new CustomEvent('dismissableLayer.pointerDownOutside',{bubbles:false,cancelable:true,detail:{originalEvent:{target:originalEditor}}});originalEditor.dispatchEvent(event);return event.defaultPrevented})()"),false,'Adapter must not cancel nested native outside dismissal.');
 assert.equal(await js("document.querySelector('input').value"),'custom draft');
 await js('window.nestedClose()');await until("document.body.style.pointerEvents==='auto' && !document.querySelector('[data-ff-combat-tools]').hidden");
 assert.deepEqual(await panelBounds(),beforeNested,'Closing nested popup must retain parent bounds.');
 await js('originalEditor.focus()');assert.equal(await js('document.activeElement===originalEditor'),true,'Background focus resumes without resetting native draft.');
 assert.equal(await js("document.querySelector('input').value"),'custom draft');
 await js("document.querySelector('[data-ff-combat-mode=skills]').click()");await until("!!document.querySelector('#acrobatics') && !!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js('submits'),1,'Switching to native skills never rolls.');
 await js("document.getElementById('acrobatics').click()");await until("!document.querySelector('#acrobatics')");
 assert.equal(await js('skillSelections'),1);await configure(true,'en');
 assert.equal(await js("!!document.querySelector('[data-ff-combat-docked]')"),true,'Native selected skill detail remains docked on reinjection.');
 await js('originalEditor.focus()');assert.equal(await js('document.activeElement===originalEditor'),true);
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");await until("!!document.querySelector('h2') && document.querySelector('h2').textContent==='Choose Action' && !!document.querySelector('[data-ff-combat-docked]')");
 await js("document.querySelector('[data-ff-combat-mode=skills]').click()");
 await until("!!document.querySelector('[data-ff-combat-docked]') && !!document.querySelector('#d20')");
 assert.equal(await js("document.querySelector('h3')===null && document.querySelector('#acrobatics')===null"),true,'Native remembered selection reopens detail directly without Skills list.');
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')===document.querySelector('[data-ff-desktop-message=roll-menu]')"),true,'Directly reopened native roll detail must dock.');
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=skills]').getAttribute('aria-pressed')"),'true');
 assert.equal(await js('skillSelections'),1,'Reopen preserves native selected skill without another selection.');
 assert.equal(await js('submits'),1,'Reopened native detail never rolls automatically.');
 await js('originalEditor.focus()');assert.equal(await js('document.activeElement===originalEditor'),true,'Chat remains usable with directly reopened skill detail.');
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");await until("!!document.querySelector('h2') && document.querySelector('h2').textContent==='Choose Action' && !!document.querySelector('[data-ff-combat-docked]')");
 const toolbarHit=await js("(()=>{const close=document.querySelector('[data-ff-combat-toolbar-close]'),b=close.getBoundingClientRect(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2);window.combatCloseInputTrace=[];const describe=el=>el?.id||el?.getAttribute?.('data-ff-combat-toolbar-close')!==null&&el?.hasAttribute?.('data-ff-combat-toolbar-close')?'toolbar-close':el?.tagName?.toLowerCase()||null;for(const type of ['pointerdown','mousedown','pointerup','mouseup','click']){document.addEventListener(type,e=>window.combatCloseInputTrace.push({scope:'document',type:e.type,target:describe(e.target),trusted:e.isTrusted,x:e.clientX,y:e.clientY}),true);close.addEventListener(type,e=>window.combatCloseInputTrace.push({scope:'button',type:e.type,target:describe(e.target),trusted:e.isTrusted,x:e.clientX,y:e.clientY}),true)}return {x,y,hit:close.contains(document.elementFromPoint(x,y)),close:describe(close)}})()");
 assert.equal(toolbarHit.hit,true,'Owned toolbar close must be the real hit target.');
 window.webContents.focus();window.webContents.sendInputEvent({type:'mouseMove',x:toolbarHit.x,y:toolbarHit.y});
 const inputWait=async expression=>{for(let n=0;n<50;n++){if(await js(expression))return true;await new Promise(resolve=>setTimeout(resolve,20));}return false};
 const hoverReady=await inputWait("document.querySelector('[data-ff-combat-toolbar-close]')?.matches(':hover')");
 const inputState=()=>js("(()=>{const close=document.querySelector('[data-ff-combat-toolbar-close]'),tools=document.querySelector('[data-ff-combat-tools]'),b=close?.getBoundingClientRect(),x=Math.round((b?.x||0)+(b?.width||0)/2),y=Math.round((b?.y||0)+(b?.height||0)/2),hit=document.elementFromPoint(x,y),describe=el=>el?.hasAttribute?.('data-ff-combat-toolbar-close')?'toolbar-close':el?.id||el?.getAttribute?.('data-ff-combat-mode')||el?.tagName?.toLowerCase()||null;return {trace:window.combatCloseInputTrace,hover:!!close?.matches(':hover'),hit:describe(hit),hitClose:!!close?.contains(hit),active:describe(document.activeElement),hasFocus:document.hasFocus(),visibility:document.visibilityState,dialogs:document.querySelectorAll('[role=dialog]').length,toolsHidden:tools?.hidden}})()");
 console.log('Combat toolbar close input readiness',{hoverReady,...await inputState()});
 window.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:toolbarHit.x,y:toolbarHit.y});
 const mouseDownSeen=await inputWait("window.combatCloseInputTrace?.some(event=>event.scope==='button'&&event.type==='mousedown')");
 if(mouseDownSeen)window.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:toolbarHit.x,y:toolbarHit.y});
 try{await until("!document.querySelector('[role=dialog]')");}
 catch(error){console.error('Combat toolbar close input failed',{mouseDownSeen,...await inputState()});throw error;}
 await new Promise(resolve=>setTimeout(resolve,600));assert.equal(await js('opens'),5,'Manual collapse lasts through encounter.');
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
 await js('openNative(true)');await configure();
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')"),null,'Even native-shaped remembered skill detail must stay modal when it predates the adapter.');
 assert.equal(await js("document.querySelector('#d20')!==null"),true);await configure(false);await js('nativeClose()');
 console.log('Combat modal fidelity fixture passed');window.destroy();clearTimeout(timer);app.exit(0);
})().catch(error=>{console.error(error);window?.destroy();clearTimeout(timer);app.exit(1)});
