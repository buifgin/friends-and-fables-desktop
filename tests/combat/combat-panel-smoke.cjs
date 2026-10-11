// Coordinator-scheduled Electron fixture; syntax-check before launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { configureCombatPanel } = require(path.join(root, 'dist/combat/combat-panel'));
const { combatPanelCss, combatPanelAppearanceCss } = require(path.join(root, 'dist/combat/combat-panel-style'));
const { DEFAULT_APPEARANCE, themeCss } = require(path.join(root, 'dist/appearance/themes'));
const { chatCss } = require(path.join(root, 'dist/appearance/chat-appearance'));
const sharedAppearance=structuredClone(DEFAULT_APPEARANCE);
sharedAppearance.preset='black';sharedAppearance.dice.enabled=true;
sharedAppearance.dice.style.border={enabled:true,color:'#ff0000',width:4,radius:18,variant:'ornate'};
assert.match(combatPanelAppearanceCss({ enabled: false, color: '#101010', opacity: .92, blur: 12 }), /var\(--card/, 'Default appearance inherits the theme even without an image.');
const transparentAppearance = combatPanelAppearanceCss({ enabled: true, color: '#336699', opacity: 0, blur: 7 });
assert.match(transparentAppearance, /#336699 0%/);
assert.match(transparentAppearance, /blur\(7px\)/);
assert.match(transparentAppearance, /\[data-ff-combat-docked\]/);
assert.doesNotMatch(transparentAppearance.split('::before')[0], /(?:^|[;{\s])opacity\s*:/, 'Appearance must not fade text or controls.');
assert.doesNotMatch(transparentAppearance, /body|\.overlay|#chat|canvas/i, 'Appearance must stay scoped to combat surfaces.');
let window;
const timer = setTimeout(() => { console.error('Combat fixture timed out'); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0}.hidden{display:none}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}button.group{display:flex;flex-direction:row;align-items:center;padding:24px;gap:16px;height:120px;background:#334155}button.group svg{width:64px;height:64px}/* Give the expanded-rail baseline the entire visible viewport; a 60px top reservation made the 1008x655 Windows work area compact before its assertion. */#sidebar{position:fixed;z-index:2;left:0;top:0;width:60px;height:100vh;box-sizing:border-box;overflow-y:auto;display:flex;flex-direction:column;justify-content:space-between;padding:16px 4px 8px}.flex.flex-col.gap-4.items-center.relative.z-10{display:flex;flex-direction:column;gap:16px;align-items:center;position:relative;z-index:10}.native-side-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;border:0;border-radius:6px;background:transparent;color:#777}.native-side-btn svg{width:20px;height:20px}.sidebar-profile{display:flex;justify-content:center;height:40px;margin-top:24px}.absolute{position:absolute}.sidebar-expand{right:0;top:50%;width:40px;height:40px;z-index:20}.sidebar-background{position:absolute;inset:0;z-index:0}#campaign{display:flex;margin-left:76px;height:650px}#chat{width:750px;flex:none}#right-pane{width:260px;height:650px;overflow-y:scroll;flex:none;overscroll-behavior:contain}#map{margin-left:20px;width:240px;height:240px}#characters{height:1200px;padding:20px}#foreign-pane{position:fixed;right:0;bottom:0;width:80px;height:80px;overflow:auto}#foreign-content{height:500px}canvas{width:240px;height:240px}.fixed{position:fixed}.inset-0{inset:0}.z-50{z-index:50}.overlay{background:#0008}.native{top:60px;left:200px;width:650px;min-height:300px;background:white;z-index:50;pointer-events:auto}.native-close{position:absolute;top:8px;right:8px;width:32px;height:32px}[class~="md:min-w-[980px]"]{min-width:980px;min-height:600px;max-height:600px;overflow-y:auto;padding-block:1rem}
</style><aside id="sidebar"><div class="sidebar-background"></div><div id="native-nav" class="flex flex-col gap-4 items-center relative z-10"><button id="native-play" class="native-side-btn"><svg class="lucide-messages-square"></svg></button><button id="native-sheet" class="native-side-btn"><svg class="lucide-user-pen"></svg></button><button id="native-group" class="native-side-btn"><svg class="lucide-users"></svg></button><button id="native-quests" class="native-side-btn"><svg class="lucide-book-open"></svg></button><button id="native-world" class="native-side-btn"><svg class="lucide-globe"></svg></button><button id="native-memory" class="native-side-btn"><svg class="lucide-brain"></svg></button><button id="native-settings" class="native-side-btn"><svg class="lucide-settings"></svg></button></div><div class="sidebar-profile">Profile</div><div class="absolute sidebar-expand"><button id="sidebar-expand-button" class="native-side-btn"><svg class="lucide-chevron-right"></svg>Expand</button></div></aside><div id="campaign" class="flex h-full w-full"><div id="chat" class="flex-1 h-full w-full"><div id="events-list"></div><div id="composer"><div class="tiptap" contenteditable="true">preserved draft</div><button aria-label="Roll dice"><svg class="lucide-dice-3"></svg></button><button id="actions"><svg class="lucide-swords"></svg></button></div></div><aside id="right-pane"><div id="map"><canvas class="touch-none" tabindex="0"></canvas></div><div id="characters"><button id="character">Native character row</button></div></aside></div><aside id="foreign-pane"><div id="foreign-map"><canvas class="touch-none" style="width:10px;height:10px"></canvas></div><div id="foreign-content">Unrelated pane</div></aside>
<script>
window.backgroundWheels=0;window.opens=0;window.skillSelections=0;window.rememberedSkill=false;window.submits=0;window.mapClicks=0;window.reactFocus=0;window.encounter=true;window.settingsClicks=0;window.sidebarExpandClicks=0;window.originalSettings=document.getElementById('native-settings');window.originalSettings.addEventListener('click',()=>window.settingsClicks++);window.originalSidebarExpand=document.getElementById('sidebar-expand-button');window.originalSidebarExpand.addEventListener('click',()=>window.sidebarExpandClicks++);
const campaign=document.getElementById('campaign'),editor=document.querySelector('.tiptap'),canvas=document.querySelector('canvas');
window.originalEditor=editor;window.originalCanvas=canvas;window.originalRightPane=document.getElementById('right-pane');window.mapWheels=0;canvas.addEventListener('wheel',()=>window.mapWheels++);
document.getElementById('composer').__reactFiberFixture={memoizedProps:{encounterActive:true}};
// Captured native ownership: Zustand stores an immutable React-element snapshot,
// while a committed composer child receives live, native-derived permission.
// This imperative renderer models that contract; the coordinator also verifies
// React reconciliation and DOM identity against the actual signed-in website.
const element=(type,props,key=null)=>({$$typeof:Symbol.for('react.transitional.element'),type,key,ref:null,props});
function NativeActionsForm(){};function NativeWarning(){};
window.permissionProps={campaignId:'fixture',encounterId:412456,isMultiplayerCampaign:true,isUsersCharacterTurn:false};
const permissionFiber={type:function NativeMoreActions(){},memoizedProps:permissionProps};
const actionOwner={type:function NativeComposer(){},memoizedProps:{},child:permissionFiber};
// Actual composer ancestry has 140 return edges to HostRoot. Exercise both
// bounded walks: the DOM points at the previous tree, its alternate is current.
const currentActionFiber={type:'button',return:actionOwner};
const previousActionFiber={type:'button',return:{type:actionOwner.type,memoizedProps:{}}};
currentActionFiber.alternate=previousActionFiber;previousActionFiber.alternate=currentActionFiber;
actionOwner.alternate=previousActionFiber.return;previousActionFiber.return.alternate=actionOwner;
actionOwner.child=permissionFiber;previousActionFiber.return.child=previousActionFiber;
let currentActionRoot=actionOwner,previousActionRoot=previousActionFiber.return;
for(let depth=2;depth<=140;depth++){
 const currentParent={type:'div',child:currentActionRoot},previousParent={type:'div',child:previousActionRoot};
 currentActionRoot.return=currentParent;previousActionRoot.return=previousParent;
 currentParent.alternate=previousParent;previousParent.alternate=currentParent;
 currentActionRoot=currentParent;previousActionRoot=previousParent;
}
const actionRootState={current:currentActionRoot};
currentActionRoot.tag=previousActionRoot.tag=3;currentActionRoot.stateNode=actionRootState;previousActionRoot.stateNode=actionRootState;
document.getElementById('actions').__reactFiberFixture=previousActionFiber;
let modalState={modalStack:[],openModal:modal=>{modalState={...modalState,modalStack:[...modalState.modalStack,modal]}},closeModalAtIndex:index=>{modalState={...modalState,modalStack:modalState.modalStack.filter((_,i)=>i!==index)}}};
window.storeWrites=0;window.nativeBusy=false;window.renderModal=null;
function useModalStore(){};useModalStore.getState=()=>modalState;useModalStore.setState=next=>{window.storeWrites++;modalState={...modalState,...next};window.renderModal?.()};
window.nativeModuleCache={nativeStore:{exports:{useModalStore}}};window.nativeFactories=new Map();
window.TURBOPACK={push:chunk=>{if(chunk.length===2){Promise.resolve().then(()=>{for(const id of chunk[1].runtimeModuleIds){const ctx={c:nativeModuleCache,M:nativeFactories};nativeModuleCache[id]={exports:{}};nativeFactories.get(id)(ctx)}})}else{for(let i=1;i<chunk.length-1;i++)nativeFactories.set(chunk[i],chunk[chunk.length-1])}}};
window.setNativeEncounter=id=>{permissionFiber.memoizedProps={...permissionFiber.memoizedProps,encounterId:id}};
window.setNativePermission=value=>{permissionFiber.memoizedProps={...permissionFiber.memoizedProps,isUsersCharacterTurn:value};document.getElementById('events-list').append(document.createComment('native turn change'))};

campaign.addEventListener('wheel',()=>window.backgroundWheels++);
campaign.addEventListener('focusin',()=>window.reactFocus++);canvas.addEventListener('click',()=>window.mapClicks++);
window.nativeClose=()=>{};
window.openNative=(diceMode=false)=>{
 window.opens++; const overlay=document.createElement('div');overlay.className='fixed inset-0 z-50 overlay';overlay.dataset.state='open';
 const dialog=document.createElement('div');dialog.className='fixed native bg-card';dialog.setAttribute('role','dialog');dialog.dataset.state='open';dialog.tabIndex=-1;
 dialog.innerHTML='<h2>Choose Action</h2><div role="tablist"><button role="tab">Weapons</button><button role="tab">Spells</button><button role="tab">Custom</button></div><div class="md:min-w-[980px] md:min-h-[600px] md:max-h-[600px] overflow-y-auto py-4 bg-slate-800"><form><input name="description" value="custom draft"><button type="submit">Attack</button></form></div><button id="nested">Ability selector</button><button id="x" class="native-close"><svg class="lucide-x"></svg>Close</button>';
 if(diceMode){
 dialog.querySelector('h2').textContent='Title';dialog.querySelector('h2').className='hidden';const skills=document.createElement('section');skills.className='relative bg-background';dialog.append(skills);
 let list;const detail=()=>{dialog.setAttribute('data-ff-desktop-message','roll-menu');skills.innerHTML='<button id="native-back" type="button"><svg class="lucide-chevron-left"></svg>List</button><div class="text-center absolute left-1/2">Roll Acrobatics Check</div><button type="button" role="combobox">Normal</button>';skills.querySelector('#native-back').onclick=()=>{window.rememberedSkill=false;list()};dialog.querySelector('button[type=submit]').onclick=e=>{e.preventDefault();dialog.querySelector('form').requestSubmit()};dialog.querySelector('button[type=submit]').innerHTML='<svg id="d20" data-ff-desktop-die="d20" width="20" height="20"><title>D20</title><defs><style>.native-die-art{fill:none;stroke:currentColor}</style></defs><path class="native-die-art" d="M2 2h16v16H2z"/></svg><span>Бросок</span>'};
 {list=()=>{dialog.removeAttribute('data-ff-desktop-message');skills.innerHTML='<h3>Ability checks</h3><h3>Skills</h3><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"><button id="acrobatics" class="group bg-[#2a2f34]"><div class="bg-[#1a1f2e]"><svg class="lucide lucide-person-standing"></svg></div><span>Acrobatics Check</span></button></div><button id="native-save">Dexterity Save</button><button id="native-custom">Custom Dice</button><button id="native-attack">Атака в ближнем бою</button><button id="native-spell">Атака заклинанием</button>';skills.querySelector('#acrobatics').onclick=()=>{window.skillSelections++;window.rememberedSkill=true;detail()}};if(window.rememberedSkill)detail();else list()}
 }
 if(!diceMode){
 const props={...permissionFiber.memoizedProps};const content=element('div',{children:[element(NativeActionsForm,props),!props.isUsersCharacterTurn&&element(NativeWarning,{variant:'warning',className:'mt-4',children:'It is not your turn - you will not be able to submit an attack until it is your turn.'})]});
 modalState={...modalState,modalStack:[{content}]};
 const renderer={type:function NativeModalRenderer(){},memoizedProps:{},memoizedState:{memoizedState:{current:{value:modalState}},next:null}};
 const previousRenderer={type:renderer.type,memoizedProps:{}};
 const formFiber={type:NativeActionsForm,key:null,memoizedProps:props,return:renderer};
 // React bailout shares a host child whose return still points at the old
 // component. Both component returns can point at the same current parent;
 // its child list, not a root-only return walk, selects the current alternate.
 const previousFormFiber={type:NativeActionsForm,key:null,memoizedProps:{...props,isUsersCharacterTurn:!props.isUsersCharacterTurn},return:renderer};
 formFiber.alternate=previousFormFiber;previousFormFiber.alternate=formFiber;
 const sharedFormHost={type:'form',return:previousFormFiber};
 formFiber.child=previousFormFiber.child=sharedFormHost;
 renderer.child=formFiber;previousRenderer.child=previousFormFiber;
 renderer.alternate=previousRenderer;previousRenderer.alternate=renderer;
 const currentRoot={tag:3,child:renderer},previousRoot={tag:3,child:previousRenderer};
 currentRoot.alternate=previousRoot;previousRoot.alternate=currentRoot;
 currentRoot.stateNode=previousRoot.stateNode={current:currentRoot};
 renderer.return=currentRoot;previousRenderer.return=previousRoot;
 window.setFormPropsMismatch=value=>{const mountedProps=modalState.modalStack[0].content.props.children[0].props;previousFormFiber.memoizedProps=mountedProps;formFiber.memoizedProps=value?{...mountedProps}:mountedProps};
 dialog.querySelector('form').__reactFiberFixture=sharedFormHost;dialog.__reactFiberFixture={type:'div',return:renderer};
 window.renderModal=()=>{const entry=modalState.modalStack[0];if(!entry)return;if(formFiber.memoizedProps!==entry.content.props.children[0].props)previousFormFiber.memoizedProps=formFiber.memoizedProps;formFiber.memoizedProps=entry.content.props.children[0].props;renderer.memoizedState.memoizedState.current.value=modalState;dialog.querySelector('button[type=submit]').disabled=!formFiber.memoizedProps.isUsersCharacterTurn||nativeBusy;let warning=dialog.querySelector('#native-turn-warning');if(entry.content.props.children[1]){if(!warning){warning=document.createElement('p');warning.id='native-turn-warning';dialog.querySelector('form').after(warning)}warning.textContent=entry.content.props.children[1].props.children}else warning?.remove()};renderModal();
}
 document.body.append(overlay,dialog);document.body.style.pointerEvents='none';document.body.style.overflow='hidden';campaign.setAttribute('aria-hidden','true');
 window.originalForm=dialog.querySelector('form');originalForm.onsubmit=e=>{e.preventDefault();window.submits++;if(window.asyncSubmit){close();window.submitPhase='pending';setTimeout(()=>{if(window.resultAsChat){document.getElementById('events-list').append(document.createTextNode('Native roll result appended to story'));window.submitPhase='complete';return}window.submitPhase='result';const result=document.createElement('div');result.id='native-result';result.setAttribute('role','dialog');result.innerHTML='<h2>Native roll result</h2><button id="result-close">Continue</button>';result.style.cssText='position:fixed;inset:100px;z-index:100;pointer-events:auto;background:white';document.body.append(result);document.body.style.pointerEvents='none';document.body.style.overflow='hidden';campaign.setAttribute('aria-hidden','true');result.querySelector('button').onclick=()=>{result.remove();document.body.style.cssText='';campaign.removeAttribute('aria-hidden');window.submitPhase='complete'}},100)}};
 let last=dialog.querySelector('input'),nested=null;
 const trap=e=>{if(nested)return;let target=e.type==='focusout'?e.relatedTarget:e.target;if(!target)return;if(dialog.contains(target)){last=target}else last.focus()};
 const pointer=e=>{if(dialog.contains(e.target)||nested)return;const outside=new CustomEvent('dismissableLayer.pointerDownOutside',{bubbles:false,cancelable:true,detail:{originalEvent:e}});e.target.dispatchEvent(outside);if(!outside.defaultPrevented)close()};
 const scrollLock=e=>{if(!dialog.contains(e.target))e.preventDefault()};document.addEventListener('wheel',scrollLock,{passive:false});
 const escape=e=>{if(e.key==='Escape'&&!nested)close()};
 const close=()=>{window.renderModal=null;modalState={...modalState,modalStack:[]};document.removeEventListener('wheel',scrollLock);document.removeEventListener('focusin',trap);document.removeEventListener('focusout',trap);document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',escape);dialog.remove();overlay.remove();document.body.style.pointerEvents='';document.body.style.overflow='';campaign.removeAttribute('aria-hidden')};
 window.nativeClose=close;window.originalNativeX=document.getElementById('x');window.originalNativeX.onclick=close;
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
// node --check cannot parse JavaScript inside an HTML template. Validate it
// before creating any window so a fixture typo cannot mimic a product failure.
new (require('node:vm').Script)(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
(async () => {
 await app.whenReady();
 const site=session.fromPartition('combat-fixture');site.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
 window=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const js=async source=>{try{return await window.webContents.executeJavaScript(source)}catch(error){console.error('Combat renderer evaluation failed:',source);throw error}};
 const until=async expression=>{for(let n=0;n<100;n++){if(await js(expression))return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Timed out: '+expression)};
 // Trusted wheel input proves Chromium's real scroll default, rather than
 // merely checking whether a synthetic event was canceled.
 const wheelAt=async selector=>{
   // Dock disposal changes renderer styles before Chromium commits its native
   // hit-test/scroll data. Paint first, then move the pointer to the measured
   // target and wait for native hover before starting a new wheel sequence.
   const paint=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   await paint();
   const point=await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),b=e.getBoundingClientRect(),x=Math.round(b.left+Math.min(b.width/2,40)),y=Math.round(b.top+Math.min(b.height/2,40));return {x,y,hit:e.contains(document.elementFromPoint(x,y))}})()`);
   assert.equal(point.hit,true,`Wheel target must be visible: ${selector} ${JSON.stringify(point)}`);
   window.webContents.sendInputEvent({type:'mouseMove',x:point.x,y:point.y});
   await until(`document.querySelector(${JSON.stringify(selector)}).matches(':hover')`);
   await paint();
   assert.equal(await js(`document.querySelector(${JSON.stringify(selector)}).contains(document.elementFromPoint(${point.x},${point.y}))`),true,`Wheel target must remain under the native pointer: ${selector}`);
   window.webContents.sendInputEvent({type:'mouseWheel',x:point.x,y:point.y,deltaY:-180,deltaX:0,canScroll:true});
   await paint();
 };
 const configure=(enabled=true,locale='en',appearance={enabled:false,color:'#101010',opacity:.92,blur:12},ambient)=>js(`(${configureCombatPanel.toString()})(${enabled},${JSON.stringify(locale)},${JSON.stringify(combatPanelCss + combatPanelAppearanceCss(appearance,ambient))})`);
 await window.loadURL('https://play.fables.gg/fixture/play');
 // Focus assertions require a visible renderer. showInactive keeps placement
 // silent; the coordinator's scoped native guard owns desktop focus policy.
 window.showInactive();window.webContents.focus();
 console.log('Combat focus readiness', await js('({visibility:document.visibilityState,focused:document.hasFocus(),active:document.activeElement?.tagName,width:innerWidth,height:innerHeight})'));
 await until("document.visibilityState==='visible' && document.hasFocus()");
 await js(`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(themeCss(sharedAppearance)+chatCss(sharedAppearance,null))};document.head.append(style)})()`);
 await configure();
 await until("!!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]').getAttribute('data-ff-combat-panel-mode')"),'actions','Native action docking exposes explicit context to extension controllers.');
 // Regression must fail before the store bridge: an already mounted native
 // form still holds false after the composer permission changes to true.
 await js("window.turnDialog=document.querySelector('[data-ff-combat-docked]');window.turnForm=turnDialog.querySelector('form');window.turnInput=turnForm.querySelector('input');turnInput.value='turn-preserved draft';window.turnTarget=document.createElement('input');turnTarget.type='checkbox';turnTarget.checked=true;turnForm.append(turnTarget);window.turnSpacer=document.createElement('div');turnSpacer.style.height='1000px';turnForm.after(turnSpacer);turnDialog.scrollTop=50;window.turnScroll=turnDialog.scrollTop;turnInput.focus();window.turnOpens=opens;setNativePermission(true)");
 await until("!turnForm.querySelector('button[type=submit]').disabled");
 assert.equal(await js("document.querySelector('#native-turn-warning')===null"),true,'Native stale turn warning clears after permission changes.');
 assert.deepEqual(await js("({dialog:document.querySelector('[data-ff-combat-docked]')===turnDialog,form:document.querySelector('form')===turnForm,input:turnForm.querySelector('input')===turnInput,draft:turnInput.value,focused:document.activeElement===turnInput,targets:turnTarget.isConnected&&turnTarget.checked,scroll:turnDialog.scrollTop===turnScroll,opens,submits})"),{dialog:true,form:true,input:true,draft:'turn-preserved draft',focused:true,targets:true,scroll:true,opens:1,submits:0},'Native store update preserves the mounted form and focus without reopening/submitting.');
 // An old alternate matching the store is insufficient: only the resolved
 // current component may prove exact mounted props ownership.
 await js('window.beforePropsMismatch=storeWrites;setFormPropsMismatch(true);setNativePermission(false)');await new Promise(resolve=>setTimeout(resolve,600));
 assert.equal(await js('storeWrites'),await js('beforePropsMismatch'),'Matching old-alternate props cannot authorize a write when current props do not match.');
 await js('setFormPropsMismatch(false);setNativePermission(true)');
 await js('window.beforeMismatch=storeWrites;setNativeEncounter(999999);setNativePermission(false)');await new Promise(resolve=>setTimeout(resolve,600));
 assert.equal(await js('storeWrites'),await js('beforeMismatch'),'A different encounter cannot update the mounted native form.');
 await js('setNativeEncounter(412456);document.getElementById("nested").click();window.beforeNestedTurn=storeWrites');await new Promise(resolve=>setTimeout(resolve,600));
 assert.equal(await js('storeWrites'),await js('beforeNestedTurn'),'Turn synchronization yields to nested native layers.');
 await js('nestedClose()');await until("turnForm.querySelector('button[type=submit]').disabled && !!document.querySelector('#native-turn-warning')");
 await js("window.nativeBusy=true;setNativePermission(true)");await until("!document.querySelector('#native-turn-warning')");
 assert.equal(await js("turnForm.querySelector('button[type=submit]').disabled"),true,'Native busy permission continues to own disabled state.');
 await js("window.nativeBusy=false;renderModal();turnTarget.remove();turnSpacer.remove();turnInput.value='custom draft';window.turnWrites=storeWrites");
 await new Promise(resolve=>setTimeout(resolve,1100));
 assert.equal(await js('storeWrites'),await js('turnWrites'),'Unchanged scans never write the native modal store.');
 assert.equal(await js('nativeFactories.size'),0,'Runtime bridge removes its own factory.');
 assert.deepEqual(await js('Object.keys(nativeModuleCache)'),['nativeStore'],'Runtime bridge removes its own cache entry.');

 const inheritedImage='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=';
 const ambient={image:inheritedImage,fit:'contain',effects:{blur:3,opacity:.6,overlayColor:'#224466',overlayOpacity:.25}};
 const expectedForeground=await js("getComputedStyle(document.querySelector('[data-ff-combat-docked]')).color");
 const verifySurface=async(state)=>{
   const identity=await js('document.querySelector("form")===originalForm');
   for(const [appearance,background] of [[{enabled:false,color:'#101010',opacity:.92,blur:12},ambient],[{enabled:false,color:'#101010',opacity:.92,blur:12},{...ambient,image:null}],[{enabled:true,color:'#336699',opacity:0,blur:7},ambient],[{enabled:true,color:'#336699',opacity:1,blur:7},ambient]]){
     await configure(true,'en',appearance,background);
     const expectedImageOpacity=appearance.enabled?1:(background.image?background.effects.opacity:1);
     await until(`(()=>{const panel=document.querySelector('[data-ff-combat-docked]');return getComputedStyle(panel,'::before').opacity==='${expectedImageOpacity}'&&getComputedStyle(panel,'::after').opacity==='1'})()`);
     const styles=await js(`(()=>{const panel=document.querySelector('[data-ff-combat-docked]'),style=getComputedStyle(panel),before=getComputedStyle(panel,'::before'),after=getComputedStyle(panel,'::after'),wrapper=panel.querySelector('[class*="md:min-w-"]'),canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=style.backgroundColor;ctx.fillRect(0,0,1,1);return {fill:Array.from(ctx.getImageData(0,0,1,1).data),opacity:style.opacity,foreground:style.color,transform:style.transform,filter:style.backdropFilter,border:style.borderRightWidth,radius:style.borderRadius,image:before.backgroundImage,fit:before.backgroundSize,imageBlur:before.filter,imageOpacity:before.opacity,blur:before.backdropFilter,overlay:after.backgroundColor,afterContent:after.content,wrapper:getComputedStyle(wrapper).backgroundColor,inputOpacity:getComputedStyle(panel.querySelector('input')).opacity}})()`);
     assert.equal(styles.foreground,expectedForeground,state+' foreground follows theme through transitions');
     assert.equal(styles.opacity,'1',state+' content remains opaque');
     assert.equal(styles.inputOpacity,'1',state+' input remains opaque');
     assert.equal(styles.transform,'none');assert.equal(styles.filter,'none');
     assert.equal(styles.border,'1px');assert.equal(styles.radius,'0px');
     assert.equal(styles.wrapper,'rgba(0, 0, 0, 0)',state+' native opaque wrapper no longer masks the surface');
     assert.equal(await js('document.querySelector("form")===originalForm'),identity,state+' appearance preserves native form');
     if(appearance.enabled){assert.equal(styles.fill[3],appearance.opacity===0?0:255);assert.equal(styles.image,'none');assert.match(styles.blur,/blur\(7px\)/)}
     else if(background.image){assert.ok(styles.image.includes(inheritedImage));assert.equal(styles.fit,'contain');assert.equal(styles.imageBlur,'blur(3px)');assert.equal(styles.imageOpacity,'0.6');assert.notEqual(styles.afterContent,'none');assert.notEqual(styles.overlay,'rgba(0, 0, 0, 0)')}
     else {assert.equal(styles.image,'none');assert.ok(styles.fill[3]>220);assert.equal(styles.blur,'blur(12px)')}
   }
   await configure();
 };
 await verifySurface('actions');
 assert.equal(await js("document.querySelectorAll('[data-ff-combat-controls] button').length"),2);
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=skills]').getAttribute('aria-label')"),'Dice');
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=actions]').disabled"),false);
 assert.equal(await js("document.querySelectorAll('[data-ff-combat-tools],[data-ff-combat-launcher],[data-ff-combat-toolbar-close]').length"),0);
 assert.equal(await js("!!document.querySelector('[data-ff-combat-mode=skills] svg') && !!document.querySelector('[data-ff-combat-mode=actions] svg')"),true);
 const nativeRailGeometry=await js("(()=>{const controls=document.querySelector('[data-ff-combat-controls]'),buttons=Array.from(controls.children),settings=document.querySelector('#native-settings'),native=document.querySelector('#native-play').getBoundingClientRect(),owned=buttons.map(button=>button.getBoundingClientRect()),styles=buttons.map(button=>getComputedStyle(button)),rail=document.querySelector('#sidebar').getBoundingClientRect();return {parent:controls.parentElement.id,beforeSettings:controls.nextElementSibling===settings,settingsIdentity:settings===originalSettings,display:getComputedStyle(controls).display,ownedSizes:owned.map(box=>[box.width,box.height]),nativeSize:[native.width,native.height],buttonClasses:buttons.map(button=>button.className),nativeClass:document.querySelector('#native-play').className,navGap:getComputedStyle(controls.parentElement).rowGap,controlsAboveSettings:owned.every(box=>box.bottom<=settings.getBoundingClientRect().top),rail:{top:rail.top,bottom:rail.bottom,viewport:innerHeight,withinViewport:rail.top>=0&&rail.bottom<=innerHeight}}})()");
 assert.equal(nativeRailGeometry.parent,'native-nav',`Owned controls must use the native rail flow: ${JSON.stringify(nativeRailGeometry)}`);
 assert.equal(nativeRailGeometry.beforeSettings,true,`Dice and swords must precede the native Settings button: ${JSON.stringify(nativeRailGeometry)}`);
 assert.equal(nativeRailGeometry.settingsIdentity,true,'Native Settings button identity and handler must remain untouched.');
 assert.equal(nativeRailGeometry.display,'contents',`Owned wrapper must preserve native flex flow: ${JSON.stringify(nativeRailGeometry)}`);
 assert.deepEqual(nativeRailGeometry.ownedSizes,[nativeRailGeometry.nativeSize,nativeRailGeometry.nativeSize],`Owned buttons must match native 40px rail sizing: ${JSON.stringify(nativeRailGeometry)}`);
 assert.equal(nativeRailGeometry.buttonClasses.every(value=>value===nativeRailGeometry.nativeClass),true,'Owned buttons reuse native class tokens without cloning handlers.');
 assert.equal(nativeRailGeometry.navGap,'16px','The native rail group supplies the button spacing.');
 assert.equal(nativeRailGeometry.controlsAboveSettings,true);
 assert.equal(nativeRailGeometry.rail.withinViewport,true,`Expanded baseline keeps the complete rail and its hit targets inside the actual viewport: ${JSON.stringify(nativeRailGeometry.rail)}`);
 const sidebarExpanderGeometry=()=>js("(()=>{const controls=document.querySelector('[data-ff-combat-controls]'),buttons=Array.from(controls.children).map(node=>node.getBoundingClientRect()),group=controls.parentElement,profile=document.querySelector('.sidebar-profile').getBoundingClientRect(),button=document.querySelector('#sidebar-expand-button'),b=button.getBoundingClientRect(),x=Math.round(b.left+b.width/2),y=Math.round(b.top+b.height/2);return {top:b.top,bottom:b.bottom,ownedBottom:Math.max(...buttons.map(rect=>rect.bottom)),profileTop:profile.top,groupPaddingBottom:getComputedStyle(group).paddingBottom,hit:button.contains(document.elementFromPoint(x,y)),identity:button===originalSidebarExpand}})()");
 const firstExpanderGeometry=await sidebarExpanderGeometry();
 assert.ok(firstExpanderGeometry.top>=firstExpanderGeometry.ownedBottom+7,`Native expansion control must sit below the owned controls: ${JSON.stringify(firstExpanderGeometry)}`);
 assert.equal(firstExpanderGeometry.hit,true,`Native expansion control must remain the real hit target: ${JSON.stringify(firstExpanderGeometry)}`);
 assert.equal(firstExpanderGeometry.identity,true,'Native expansion control identity is preserved.');
 await js('originalSidebarExpand.click()');assert.equal(await js('sidebarExpandClicks'),1,'Native expansion handler remains live after mounting controls.');
 await js('originalSettings.click()');assert.equal(await js('settingsClicks'),1,'Native Settings handler remains live after mounting controls.');
 await js("document.querySelector('#sidebar').style.height='420px';window.dispatchEvent(new Event('resize'))");
 await until("document.querySelector('#native-nav').hasAttribute('data-ff-combat-controls-compact')");
 assert.equal(await js("getComputedStyle(document.querySelector('#native-nav')).rowGap"),'8px','Short rails compact the marked native group only.');
 const compactExpanderGeometry=await sidebarExpanderGeometry();
 assert.equal(compactExpanderGeometry.groupPaddingBottom,'48px','Mounted controls reserve a real 48px flow slot for the expander.');
 assert.ok(compactExpanderGeometry.bottom<=compactExpanderGeometry.profileTop,`Short-rail expander must not overlap the profile: ${JSON.stringify(compactExpanderGeometry)}`);
 assert.ok(compactExpanderGeometry.top>=compactExpanderGeometry.ownedBottom+7,`Short-rail expander remains below the owned controls: ${JSON.stringify(compactExpanderGeometry)}`);
 assert.equal(await js("document.querySelector('#native-settings')===originalSettings"),true,'Short-rail compaction preserves native Settings identity.');
 await js("document.querySelector('#sidebar').style.height='100vh';window.dispatchEvent(new Event('resize'))");
 await until("!document.querySelector('#native-nav').hasAttribute('data-ff-combat-controls-compact')");
 assert.equal(await js("getComputedStyle(document.querySelector('#native-nav')).rowGap"),'16px','Restoring rail height restores the native gap.');
 await js("(()=>{const old=document.querySelector('#native-nav'),next=document.createElement('div');next.id='native-nav-remounted';next.className=old.className;for(const icon of ['messages-square','user-pen','users','book-open','globe','brain']){const button=document.createElement('button');button.className=document.querySelector('#native-play').className;button.innerHTML='<svg class=\"lucide-'+icon+'\"></svg>';next.append(button)}next.append(originalSettings);old.replaceWith(next)})()");
 await until("document.querySelector('[data-ff-combat-controls]')?.parentElement.id==='native-nav-remounted'");
 assert.equal(await js("document.querySelector('[data-ff-combat-controls]').nextElementSibling===originalSettings"),true,'Sidebar remount reattaches owned controls before the same native Settings node.');
 const remountedExpanderGeometry=await sidebarExpanderGeometry();
 assert.ok(remountedExpanderGeometry.top>=remountedExpanderGeometry.ownedBottom+7,`Remounted native expansion control must remain below the owned controls: ${JSON.stringify(remountedExpanderGeometry)}`);
 assert.equal(remountedExpanderGeometry.hit,true,`Remounted native expansion control must remain hittable: ${JSON.stringify(remountedExpanderGeometry)}`);
 assert.equal(remountedExpanderGeometry.identity,true,'Remount preserves the original native expansion control.');
 await js("document.querySelector('#sidebar').style.width='240px';window.dispatchEvent(new Event('resize'))");
 await until("document.documentElement.style.getPropertyValue('--ff-combat-rail-width')==='240px'");
 await until("document.querySelector('[data-ff-combat-docked]').getBoundingClientRect().left===240");
 const expandedRail=await js("(()=>{const panel=document.querySelector('[data-ff-combat-docked]').getBoundingClientRect(),controls=document.querySelector('[data-ff-combat-controls]');return {width:getComputedStyle(document.querySelector('#sidebar')).width,left:panel.left,controlsParent:controls.parentElement.id,beforeSettings:controls.nextElementSibling===originalSettings}})()");
 assert.equal(expandedRail.width,'240px',`Expanded native rail must be recognized: ${JSON.stringify(expandedRail)}`);
 assert.equal(expandedRail.left,240,`Dock follows the expanded rail width: ${JSON.stringify(expandedRail)}`);
 assert.equal(expandedRail.controlsParent,'native-nav-remounted','Expanded rail keeps controls in native flow.');
 assert.equal(expandedRail.beforeSettings,true,'Expanded rail keeps controls above the original Settings button.');
 await js("document.querySelector('#sidebar').style.width='60px';window.dispatchEvent(new Event('resize'))");
 await until("document.documentElement.style.getPropertyValue('--ff-combat-rail-width')==='60px'");
 await until("document.querySelector('[data-ff-combat-docked]').getBoundingClientRect().left===60");
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]').getBoundingClientRect().left"),60,'Collapsing the rail returns the dock to its measured position.');
 assert.equal(await js('opens'),1,'Auto activation opens native picker once; never submits.');
 assert.equal(await js('submits'),0);
 assert.equal(await js("document.body.style.pointerEvents"),'auto');
 assert.equal(await js("document.getElementById('campaign').hasAttribute('aria-hidden')"),false);

 assert.equal(await js("getComputedStyle(document.querySelector('.overlay')).display"),'none');
 assert.equal(await js("document.querySelector('form')===originalForm && document.querySelector('canvas')===originalCanvas && document.querySelector('.tiptap')===originalEditor"),true);
 const closeHeadingGeometry=async(title,width)=>js(`(()=>{const panel=document.querySelector('[data-ff-combat-docked]'),heading=panel.querySelector('[data-ff-combat-heading]'),close=panel.querySelector('[data-ff-combat-close]');document.documentElement.style.setProperty('--ff-combat-width','${width}px');heading.textContent=${JSON.stringify(title)};let spacer=panel.querySelector('#close-scroll-spacer');if(!spacer){spacer=document.createElement('div');spacer.id='close-scroll-spacer';spacer.style.height='1000px';close.before(spacer)}const measure=()=>{const p=panel.getBoundingClientRect(),c=close.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(heading);const text=Array.from(range.getClientRects()).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));const x=Math.round(c.left+c.width/2),y=Math.round(c.top+c.height/2);return {panel:{left:p.left,right:p.right,top:p.top,bottom:p.bottom},heading:text,close:{left:c.left,right:c.right,top:c.top,bottom:c.bottom,width:c.width,height:c.height},closeHit:close.contains(document.elementFromPoint(x,y)),closeIdentity:close===originalNativeX,closeWithinPanel:c.left>=p.left&&c.right<=p.right&&c.top>=p.top&&c.bottom<=p.bottom,textOverlapsClose:text.some(r=>r.right>c.left&&r.left<c.right&&r.bottom>c.top&&r.top<c.bottom)}};panel.scrollTop=0;const initial=measure();panel.scrollTop=160;return {initial,scrolled:measure(),scrollTop:panel.scrollTop}})()`);
 await js("document.querySelector('[data-ff-combat-docked]').style.setProperty('height','300px','important');document.querySelector('[data-ff-combat-docked]').style.setProperty('min-height','0','important')");
 for (const [title,width] of [['Choose Action',390],['Выберите действие, чтобы выполнить проверку',390],['Выберите действие, чтобы выполнить проверку',308]]) {
   const geometry=await closeHeadingGeometry(title,width);
   assert.ok(geometry.scrollTop>0,`Close-button scroll case must actually scroll: ${JSON.stringify(geometry)}`);
   for (const [state,position] of [['before scroll',geometry.initial],['after scroll',geometry.scrolled]]) {
     assert.ok(position.close.width>=32 && position.close.height>=32,`Native close remains a usable hit target ${state}: ${JSON.stringify(geometry)}`);
     assert.equal(position.closeHit,true,`Native close center must remain the real hit target ${state} for ${width}px ${title}: ${JSON.stringify(geometry)}`);
     assert.equal(position.closeWithinPanel,true,`Native close must stay visible ${state} for ${width}px ${title}: ${JSON.stringify(geometry)}`);
     assert.equal(position.closeIdentity,true,'Docking must preserve the original native close button and handler.');
     assert.equal(position.textOverlapsClose,false,`Native title text must not overlap the close target ${state} for ${width}px ${title}: ${JSON.stringify(geometry)}`);
   }
 }
 await js("document.querySelector('[data-ff-combat-docked]').style.removeProperty('height');document.querySelector('[data-ff-combat-docked]').style.removeProperty('min-height');document.documentElement.style.removeProperty('--ff-combat-width');document.querySelector('[data-ff-combat-docked]').querySelector('#close-scroll-spacer')?.remove();document.querySelector('[data-ff-combat-heading]').textContent='Choose Action';document.querySelector('[data-ff-combat-docked]').scrollTop=0");
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
 await js("originalRightPane.scrollTop=0;window.beforeRightScroll={chat:document.getElementById('chat').scrollTop,dock:document.querySelector('[data-ff-combat-docked]').scrollTop};window.rightWheelTrusted=false;originalRightPane.addEventListener('wheel',event=>{rightWheelTrusted=event.isTrusted},{once:true})");
 await wheelAt('#characters');
 await until('originalRightPane.scrollTop>0');
 assert.equal(await js('rightWheelTrusted'),true,'Right character scrolling uses trusted native wheel input.');
 assert.equal(await js("document.getElementById('chat').scrollTop===beforeRightScroll.chat&&document.querySelector('[data-ff-combat-docked]').scrollTop===beforeRightScroll.dock"),true,'Right scrolling leaves chat and dock scroll positions independent.');
 assert.equal(await js("document.querySelector('#right-pane')===originalRightPane&&document.querySelector('canvas')===originalCanvas"),true,'Native right pane and map node identity are preserved.');
 await js('originalRightPane.scrollTop=0');
 await wheelAt('canvas');await until('mapWheels>0');
 assert.equal(await js("document.getElementById('foreign-content').dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:50}))"),false,'Unrelated sidebars retain native modal wheel locking.');
 await js('originalRightPane.scrollTop=0');

 await js('originalForm.requestSubmit()');assert.equal(await js('submits'),1,'Native submit handler remains the only submission path.');
 await configure(true,'ru');assert.equal(await js("document.querySelectorAll('[data-ff-combat-controls]').length"),1);
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=skills]').getAttribute('aria-label')"),'Кости');
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=actions]').title"),'Действия боя');
 const identityBeforeAppearance=await js('document.querySelector("form")===originalForm');
 const panelFillPixel=()=>js("(()=>{const color=getComputedStyle(document.querySelector('[data-ff-combat-docked]')).backgroundColor,canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d');context.fillStyle=color;context.fillRect(0,0,1,1);return Array.from(context.getImageData(0,0,1,1).data)})()");
 await configure(true,'ru',{enabled:true,color:'#336699',opacity:0,blur:7});
 assert.equal(await js('document.querySelector("form")===originalForm'),identityBeforeAppearance,'Appearance reinjection preserves the native form identity.');
 assert.equal((await panelFillPixel())[3],0,'Opacity zero makes the panel fill transparent.');
 assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-combat-docked]')).backdropFilter"),'none','Docked panel must not create a fixed-descendant containing block.');
 assert.match(await js("getComputedStyle(document.querySelector('[data-ff-combat-docked]'),'::before').backdropFilter"),/blur\(7px\)/);
 assert.equal(await js("document.querySelector('input').value"),'custom draft');
 const transparentAppearanceClose=await closeHeadingGeometry('Выберите действие, чтобы выполнить проверку',308);
 assert.equal(transparentAppearanceClose.scrolled.closeHit,true,`Transparent custom appearance must preserve close hit after scroll: ${JSON.stringify(transparentAppearanceClose)}`);
 await configure(true,'ru',{enabled:true,color:'#336699',opacity:1,blur:7});
 assert.deepEqual(await panelFillPixel(),[51,102,153,255],'Opacity one fills the panel with the selected RGB color.');
 assert.match(await js("getComputedStyle(document.querySelector('[data-ff-combat-docked]'),'::before').backdropFilter"),/blur\(7px\)/);
 const opaqueAppearanceClose=await closeHeadingGeometry('Выберите действие, чтобы выполнить проверку',390);
 assert.equal(opaqueAppearanceClose.scrolled.closeHit,true,`Opaque custom appearance must preserve close hit after scroll: ${JSON.stringify(opaqueAppearanceClose)}`);
 await js("document.documentElement.style.removeProperty('--ff-combat-width');document.querySelector('[data-ff-combat-docked] #close-scroll-spacer')?.remove();document.querySelector('[data-ff-combat-heading]').textContent='Choose Action';document.querySelector('[data-ff-combat-docked]').scrollTop=0");
 const panelBounds=()=>js("(()=>{const b=document.querySelector('[data-ff-combat-docked]').getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}})()");
 const beforeNested=await panelBounds();
 const chatBeforeNested=await js("document.getElementById('chat').getBoundingClientRect().width");
 await js("window.nestedParent=document.querySelector('[data-ff-combat-docked]');document.getElementById('nested').click()");
 await until("document.body.style.pointerEvents==='none' && document.querySelector('[data-ff-combat-mode=actions]').getAttribute('aria-pressed')==='true'");
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')===nestedParent && document.querySelector('form')===originalForm"),true,'Nested native popup retains original dock and form.');
 assert.deepEqual(await panelBounds(),beforeNested,'Opening a nested native popup must keep its parent bounds stable.');
 assert.equal(await js("document.getElementById('chat').getBoundingClientRect().width"),chatBeforeNested,'Chat reservation stays stable under a nested modal.');
 assert.equal(await js("document.getElementById('campaign').getAttribute('aria-hidden')"),'true');
 assert.equal(await js("document.body.style.overflow"),'hidden');
 assert.notEqual(await js("getComputedStyle(document.querySelector('.overlay')).display"),'none','Native overlay protection resumes.');
 await js('originalEditor.focus()');
 assert.equal(await js("document.activeElement===document.querySelector('[role=listbox]')"),true,'Adapter focus gate yields to nested native focus trap.');
 assert.equal(await js("originalEditor.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:50}))"),false,'Adapter wheel gate yields to native nested scroll lock.');
 assert.equal(await js("document.getElementById('characters').dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:50}))"),false,'Right pane also yields to nested native modal wheel locking.');

 assert.equal(await js("(()=>{const event=new CustomEvent('dismissableLayer.pointerDownOutside',{bubbles:false,cancelable:true,detail:{originalEvent:{target:originalEditor}}});originalEditor.dispatchEvent(event);return event.defaultPrevented})()"),false,'Adapter must not cancel nested native outside dismissal.');
 assert.equal(await js("document.querySelector('input').value"),'custom draft');
 await js('window.nestedClose()');await until("document.body.style.pointerEvents==='auto' && document.querySelector('[data-ff-combat-mode=actions]').getAttribute('aria-pressed')==='true'");
 assert.deepEqual(await panelBounds(),beforeNested,'Closing nested popup must retain parent bounds.');
 await js('originalEditor.focus()');assert.equal(await js('document.activeElement===originalEditor'),true,'Background focus resumes without resetting native draft.');
 assert.equal(await js("document.querySelector('input').value"),'custom draft');
 await js("document.querySelector('[data-ff-combat-mode=skills]').click()");await until("!!document.querySelector('#acrobatics') && !!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]').getAttribute('data-ff-combat-panel-mode')"),'skills','Dice context stays explicit through native panel switching.');
 assert.equal(await js('submits'),1,'Switching to native skills never rolls.');
 await verifySurface('checks');
 await js(`(()=>{const panel=document.querySelector('[data-ff-combat-docked]'),holder=document.createElement('div');holder.id='native-theme-field-fixture';holder.innerHTML='<input id="theme-input" class="native-theme-field" value="native input" style="background-color:hsl(var(--background));border:1px solid hsl(var(--input));color:hsl(var(--foreground))"><select id="theme-select" class="native-theme-field" style="background-color:hsl(var(--background));border:1px solid hsl(var(--input));color:hsl(var(--foreground))"><option selected>native select</option></select><textarea id="theme-textarea" class="native-theme-field" style="background-color:hsl(var(--background));border:1px solid hsl(var(--input));color:hsl(var(--foreground))">native textarea</textarea><div id="theme-combobox" role="combobox" tabindex="0" class="native-theme-field" style="background-color:hsl(var(--background));border:1px solid hsl(var(--input));color:hsl(var(--foreground))">native combo</div>';panel.append(holder);const reference=document.createElement('input');reference.style.cssText='background-color:hsl(var(--background));border:1px solid hsl(var(--input));color:hsl(var(--foreground))';document.body.append(reference);const style=getComputedStyle(reference);window.nativeThemeExpected={background:style.backgroundColor,borderColor:style.borderTopColor,borderWidth:style.borderTopWidth,borderStyle:style.borderTopStyle};reference.remove();window.nativeThemeFields=[...holder.querySelectorAll('.native-theme-field')];window.nativeThemeOriginal=[...nativeThemeFields];window.nativeThemeValues=nativeThemeFields.map(node=>node.value??node.textContent);nativeThemeFields[0].focus();return true})()`);
 const nativeThemeExpected=await js('window.nativeThemeExpected');
 for(const [name,appearance] of [['default',{enabled:false,color:'#101010',opacity:.92,blur:12}],['custom',{enabled:true,color:'#204060',opacity:.9,blur:5}]]){
   await configure(true,'en',appearance);
   const nativeThemeActual=await js(`(()=>({fields:window.nativeThemeFields.map(node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,borderColor:style.borderTopColor,borderWidth:style.borderTopWidth,borderStyle:style.borderTopStyle}}),identity:nativeThemeFields.every((node,index)=>node===nativeThemeOriginal[index]),values:nativeThemeFields.map(node=>node.value??node.textContent),focused:document.activeElement===nativeThemeFields[0]}))()`);
   assert.deepEqual(nativeThemeActual.fields,Array(4).fill(nativeThemeExpected),`${name} combat appearance preserves native background and input border tokens`);
   assert.equal(nativeThemeActual.identity,true,`${name} combat appearance preserves native field nodes`);
   assert.deepEqual(nativeThemeActual.values,await js('window.nativeThemeValues'),`${name} combat appearance preserves native field values`);
   assert.equal(nativeThemeActual.focused,true,`${name} combat appearance preserves native field focus`);
 }
 await js(`document.activeElement.blur();document.querySelector('#native-theme-field-fixture').remove()`);
 await configure();
 for(const width of [308,390]){
   await js(`document.documentElement.style.setProperty('--ff-combat-width','${width}px');document.querySelector('#acrobatics span').textContent='Проверка ловкости: Акробатика и сохранение равновесия';document.querySelector('[data-ff-combat-docked]').style.setProperty('height','300px','important')`);
   const tile=await js("(()=>{const panel=document.querySelector('[data-ff-combat-docked]'),button=document.querySelector('#acrobatics'),label=button.querySelector('span'),icon=button.querySelector('svg'),b=button.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(label);return {overflow:panel.scrollWidth>panel.clientWidth,height:b.height,scrollHeight:button.scrollHeight,clientHeight:button.clientHeight,icon:getComputedStyle(icon).width,textWithin:Array.from(r.getClientRects()).every(rect=>rect.left>=b.left&&rect.right<=b.right&&rect.top>=b.top&&rect.bottom<=b.bottom),background:getComputedStyle(button).backgroundColor}})()");
   assert.equal(tile.overflow,false,`${width}px checks must not overflow horizontally: ${JSON.stringify(tile)}`);
   assert.equal(tile.textWithin,true,`${width}px Russian check label must wrap inside tile: ${JSON.stringify(tile)}`);
   assert.equal(tile.scrollHeight,tile.clientHeight,'Tile must grow to fit wrapped label');assert.ok(tile.height>=72);assert.equal(tile.icon,'24px');assert.notEqual(tile.background,'rgb(255, 255, 255)');
 }
 await js(`(()=>{const panel=document.querySelector('[data-ff-combat-docked]'),card=document.createElement('section');card.id='label-gap-fixture';card.dataset.ffDesktopDetailCard='';card.className='relative group rounded-lg border bg-card p-4';card.innerHTML='<div id="label-row-one" class="grid sm:grid-cols-3 gap-4"><div class="space-y-2"><div><label id="label-one-long">Модификатор характеристики</label></div><input id="control-one-long" value="native one" style="width:100%;min-width:0;box-sizing:border-box"></div><div class="space-y-2"><div><label id="label-one-short">Сила</label></div><input id="control-one-short" value="native two" style="width:100%;min-width:0;box-sizing:border-box"></div><div class="space-y-2"><div><label>Ловкость</label></div><input value="native three" style="width:100%;min-width:0;box-sizing:border-box"></div></div><div id="label-row-two" class="grid lg:grid-cols-4 gap-4"><div class="space-y-1.5"><label id="label-two-long">Модификатор характеристики</label><input id="control-two-long" value="native four" style="width:100%;min-width:0;box-sizing:border-box"></div><div class="space-y-1.5"><label id="label-two-short">Сила</label><input id="control-two-short" value="native five" style="width:100%;min-width:0;box-sizing:border-box"></div><div class="space-y-1.5"><label>Ловкость</label><input value="native six" style="width:100%;min-width:0;box-sizing:border-box"></div></div>';panel.append(card);window.labelGapInputs=[...card.querySelectorAll('input')];window.labelGapOriginal=[...labelGapInputs];window.labelGapInputs[1].focus();return true})()`);
 for(const width of [390,280]){
   const gap=await js(`(()=>{const panel=document.querySelector('[data-ff-combat-docked]'),card=document.querySelector('#label-gap-fixture');document.documentElement.style.setProperty('--ff-combat-width','${width}px');const row=(id,inputs)=>{const grid=document.getElementById(id),controls=inputs.map(selector=>grid.querySelector(selector)),rects=controls.map(node=>node.getBoundingClientRect()),long=grid.querySelector(id==='label-row-one'?'#label-one-long':'#label-two-long'),short=grid.querySelector(id==='label-row-one'?'#label-one-short':'#label-two-short'),range=document.createRange();range.selectNodeContents(long);const lineRects=[...range.getClientRects()];return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,controlTops:rects.slice(0,2).map(rect=>rect.top),longLines:lineRects.length,longTextHeight:lineRects.reduce((sum,rect)=>sum+rect.height,0),shortHeight:short.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(short).lineHeight)||parseFloat(getComputedStyle(short).fontSize)*1.2}};return {overflow:panel.scrollWidth>panel.clientWidth,rowOne:row('label-row-one',['#control-one-long','#control-one-short']),rowTwo:row('label-row-two',['#control-two-long','#control-two-short']),identity:labelGapInputs.every((node,index)=>node===labelGapOriginal[index]),values:labelGapInputs.map(node=>node.value),focus:document.activeElement===labelGapInputs[1]}})()`);
   assert.equal(gap.overflow,false,`${width}px custom rows must not overflow horizontally: ${JSON.stringify(gap)}`);
   assert.equal(gap.rowOne.columns,width===390?2:1,`${width}px first row uses responsive columns: ${JSON.stringify(gap.rowOne)}`);
   assert.equal(gap.rowTwo.columns,width===390?2:1,`${width}px second row uses responsive columns: ${JSON.stringify(gap.rowTwo)}`);
   if(width===390){
     assert.ok(Math.abs(gap.rowOne.controlTops[0]-gap.rowOne.controlTops[1])<1,`First-row controls align under the tallest wrapped label: ${JSON.stringify(gap.rowOne)}`);
     assert.ok(Math.abs(gap.rowTwo.controlTops[0]-gap.rowTwo.controlTops[1])<1,`Second-row controls align under the tallest wrapped label: ${JSON.stringify(gap.rowTwo)}`);
     assert.ok(gap.rowOne.longLines>=2&&gap.rowTwo.longLines>=2,`Long Russian labels actually wrap at 390px: ${JSON.stringify(gap)}`);
     assert.ok(gap.rowOne.shortHeight<=gap.rowOne.longTextHeight+2,`First-row short labels reserve only the actual tallest label height: ${JSON.stringify(gap.rowOne)}`);
     assert.ok(gap.rowTwo.shortHeight<=gap.rowTwo.longTextHeight+2,`Second-row short labels reserve only the actual tallest label height: ${JSON.stringify(gap.rowTwo)}`);
   }else{
     assert.ok(gap.rowOne.shortHeight<gap.rowOne.lineHeight*2,`One-line labels reserve no artificial three-line height at 280px: ${JSON.stringify(gap.rowOne)}`);
   }
   assert.deepEqual(gap.values,['native one','native two','native three','native four','native five','native six']);
   assert.equal(gap.identity,true,'Native control nodes remain unchanged across responsive layout.');
   assert.equal(gap.focus,true,'Responsive layout preserves the focused native control.');
 }
 await js("document.querySelector('#label-gap-fixture').remove();document.documentElement.style.removeProperty('--ff-combat-width')");
 await js("document.documentElement.style.removeProperty('--ff-combat-width');document.querySelector('[data-ff-combat-docked]').style.removeProperty('height')");

 await js("document.getElementById('acrobatics').click()");await until("!document.querySelector('#acrobatics')");
 assert.equal(await js('skillSelections'),1);
 await verifySurface('detail with SVG');
 const detailHeader=await js("(()=>{const back=document.querySelector('#native-back'),combo=document.querySelector('[role=combobox]'),b=back.getBoundingClientRect(),c=combo.getBoundingClientRect();return {backHit:back.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)),sameRow:Math.abs(b.top+b.height/2-c.top-c.height/2)<1,backHeight:b.height}})()");
 assert.equal(detailHeader.backHit,true,'Native back stays the real hit target');assert.equal(detailHeader.sameRow,true,'Back and roll mode align in the shared detail header');assert.ok(detailHeader.backHeight>=32);

 await configure(true,'en',{enabled:false,color:'#101010',opacity:.92,blur:12},ambient);
 await js("document.querySelector('#native-back').click()");await until("!!document.querySelector('#acrobatics')");
 assert.ok((await js("getComputedStyle(document.querySelector('[data-ff-combat-docked]'),'::before').backgroundImage")).includes(inheritedImage),'Back to checks preserves inherited background');
 await js("document.querySelector('#acrobatics').click()");await until("!!document.querySelector('#d20')");
 assert.equal(await js('skillSelections'),2,'Back uses the native selection handler');
 await configure(true,'en');
 assert.equal(await js("!!document.querySelector('[data-ff-combat-docked]')"),true,'Native selected skill detail remains docked on reinjection.');
 await js('originalEditor.focus()');assert.equal(await js('document.activeElement===originalEditor'),true);
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");await until("!!document.querySelector('h2') && document.querySelector('h2').textContent==='Choose Action' && !!document.querySelector('[data-ff-combat-docked]')");
 await js("document.querySelector('[data-ff-combat-mode=skills]').click()");
 await until("!!document.querySelector('[data-ff-combat-docked]') && !!document.querySelector('#d20')");
 assert.equal(await js("document.querySelector('h3')===null && document.querySelector('#acrobatics')===null"),true,'Native remembered selection reopens detail directly without Skills list.');
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')===document.querySelector('[data-ff-desktop-message=roll-menu]')"),true,'Directly reopened native roll detail must dock.');
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=skills]').getAttribute('aria-pressed')"),'true');
 assert.equal(await js("document.querySelector('button[type=submit]').innerText.trim()"),'Бросок','Native visible Roll label excludes embedded die SVG metadata.');
 assert.equal(await js("/^Бросок$/.test(document.querySelector('button[type=submit]').textContent.trim())"),false,'Regression must include SVG title/style text that broke exact textContent matching.');
 assert.equal(await js('skillSelections'),2,'Reopen preserves native selected skill without another selection.');
 assert.equal(await js('submits'),1,'Reopened native detail never rolls automatically.');
 await js('originalEditor.focus()');assert.equal(await js('document.activeElement===originalEditor'),true,'Chat remains usable with directly reopened skill detail.');
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");await until("!!document.querySelector('h2') && document.querySelector('h2').textContent==='Choose Action' && !!document.querySelector('[data-ff-combat-docked]')");
 const toolbarHit=await js("(()=>{const close=document.querySelector('[data-ff-combat-mode=actions]'),b=close.getBoundingClientRect(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2);window.combatCloseInputTrace=[];const describe=el=>el?.id||el?.getAttribute?.('data-ff-combat-mode')!==null&&el?.hasAttribute?.('data-ff-combat-mode')?'toolbar-close':el?.tagName?.toLowerCase()||null;for(const type of ['pointerdown','mousedown','pointerup','mouseup','click']){document.addEventListener(type,e=>window.combatCloseInputTrace.push({scope:'document',type:e.type,target:describe(e.target),trusted:e.isTrusted,x:e.clientX,y:e.clientY}),true);close.addEventListener(type,e=>window.combatCloseInputTrace.push({scope:'button',type:e.type,target:describe(e.target),trusted:e.isTrusted,x:e.clientX,y:e.clientY}),true)}return {x,y,hit:close.contains(document.elementFromPoint(x,y)),close:describe(close)}})()");
 assert.equal(toolbarHit.hit,true,'Owned toolbar close must be the real hit target.');
 window.webContents.focus();window.webContents.sendInputEvent({type:'mouseMove',x:toolbarHit.x,y:toolbarHit.y});
 const inputWait=async expression=>{for(let n=0;n<50;n++){if(await js(expression))return true;await new Promise(resolve=>setTimeout(resolve,20));}return false};
 const hoverReady=await inputWait("document.querySelector('[data-ff-combat-mode=actions]')?.matches(':hover')");
 const inputState=()=>js("(()=>{const close=document.querySelector('[data-ff-combat-mode=actions]'),tools=document.querySelector('[data-ff-combat-controls]'),b=close?.getBoundingClientRect(),x=Math.round((b?.x||0)+(b?.width||0)/2),y=Math.round((b?.y||0)+(b?.height||0)/2),hit=document.elementFromPoint(x,y),describe=el=>el?.hasAttribute?.('data-ff-combat-mode')?'toolbar-close':el?.id||el?.getAttribute?.('data-ff-combat-mode')||el?.tagName?.toLowerCase()||null;return {trace:window.combatCloseInputTrace,hover:!!close?.matches(':hover'),hit:describe(hit),hitClose:!!close?.contains(hit),active:describe(document.activeElement),hasFocus:document.hasFocus(),visibility:document.visibilityState,dialogs:document.querySelectorAll('[role=dialog]').length,toolsHidden:tools?.hidden}})()");
 console.log('Combat toolbar close input readiness',{hoverReady,...await inputState()});
 window.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:toolbarHit.x,y:toolbarHit.y});
 const mouseDownSeen=await inputWait("window.combatCloseInputTrace?.some(event=>event.scope==='button'&&event.type==='mousedown')");
 if(mouseDownSeen)window.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:toolbarHit.x,y:toolbarHit.y});
 try{await until("!document.querySelector('[role=dialog]')");}
 catch(error){console.error('Combat toolbar close input failed',{mouseDownSeen,...await inputState()});throw error;}
 await new Promise(resolve=>setTimeout(resolve,600));assert.equal(await js('opens'),5,'Manual collapse lasts through encounter.');
 assert.equal(await js("document.body.style.cssText"),'');
 assert.equal(await js("originalEditor.textContent"),'preserved draft typed');
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");await until("!!document.querySelector('[data-ff-combat-docked]')");
 await js('nativeClose()');await until("!document.documentElement.hasAttribute('data-ff-combat-open')");
 assert.equal(await js("document.body.style.cssText"),'','External native close must not replay stale modal locks.');
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");await until("!!document.querySelector('[data-ff-combat-docked]')");
 await js("document.querySelector('[data-ff-combat-mode=skills]').click()");await until("!!document.querySelector('#d20') && !!document.querySelector('[data-ff-combat-docked]')");
 const beforeAsync=await js("({chat:document.getElementById('chat').getBoundingClientRect().width,map:originalCanvas.getBoundingClientRect().x,opens})");
 await js("window.layoutFlips=[];window.layoutObserver=new MutationObserver(records=>{for(const record of records)layoutFlips.push({old:record.oldValue,current:document.documentElement.getAttribute('data-ff-combat-open')})});layoutObserver.observe(document.documentElement,{attributes:true,attributeOldValue:true,attributeFilter:['data-ff-combat-open']});window.asyncSubmit=true;document.querySelector('button[type=submit]').click()");
 await until("submitPhase==='pending' && !!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js("document.documentElement.getAttribute('data-ff-combat-open')"),'true','Pending native unmount retains reservation.');
 await until("submitPhase==='result'");
 assert.equal(await js("document.body.style.pointerEvents"),'none','Native result remains modal.');
 assert.equal(await js("document.body.style.overflow"),'hidden');
 assert.equal(await js("document.querySelector('#native-result').hasAttribute('data-ff-combat-docked')"),false);
 assert.deepEqual(await js("({chat:document.getElementById('chat').getBoundingClientRect().width,map:originalCanvas.getBoundingClientRect().x,opens})"),{...beforeAsync,opens:beforeAsync.opens+1},'Pending/result keep chat/map geometry with exactly one native reopen.');
 await js("document.querySelector('#result-close').click()");await until("submitPhase==='complete'");
 await new Promise(resolve=>setTimeout(resolve,600));
 assert.deepEqual(await js('layoutFlips'),[],'No layout reservation flip through native pending, result, and completion.');
 assert.equal(await js('opens'),beforeAsync.opens+1,'Result completion never retries the native reopen.');
 const beforeChatResult=await js('opens');
 await js("window.resultAsChat=true;document.querySelector('button[type=submit]').click()");
 await until("submitPhase==='complete' && !!document.querySelector('[data-ff-combat-docked]')");
 await new Promise(resolve=>setTimeout(resolve,600));
 assert.equal(await js('opens'),beforeChatResult+1,'Append-only native result reopens exactly once.');
 assert.equal(await js("document.getElementById('events-list').textContent"),'Native roll result appended to story');
 assert.deepEqual(await js('layoutFlips'),[],'Chat-appended result never releases and re-reserves layout.');
 assert.deepEqual(await js("({chat:document.getElementById('chat').getBoundingClientRect().width,map:originalCanvas.getBoundingClientRect().x})"),{chat:beforeAsync.chat,map:beforeAsync.map});
 const beforeManualPending=await js('opens');
 await js("document.querySelector('button[type=submit]').click();document.querySelector('[data-ff-combat-mode=skills]').click()");
 await until("submitPhase==='complete' && !document.documentElement.hasAttribute('data-ff-combat-open')");
 await new Promise(resolve=>setTimeout(resolve,600));
 assert.equal(await js('opens'),beforeManualPending,'Manual close during native pending cancels the one-shot reopen.');
 await js("layoutObserver.disconnect();window.asyncSubmit=false;document.getElementById('composer').__reactFiberFixture.memoizedProps.encounterActive=false;window.rememberedSkill=false");
 await until("document.querySelector('[data-ff-combat-mode=actions]').disabled && !document.documentElement.hasAttribute('data-ff-combat-open')");
 const adventureOpens=await js('opens');
 await js("document.querySelector('[data-ff-combat-mode=actions]').click()");assert.equal(await js('opens'),adventureOpens,'Disabled swords cannot launch adventure actions.');
 await js("document.querySelector('[data-ff-combat-mode=skills]').click()");await until("!!document.querySelector('#acrobatics') && !!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=actions]').disabled"),true,'Swords stays disabled while dice dock is open.');
 assert.equal(await js("document.querySelector('#native-attack').hidden && document.querySelector('#native-spell').hidden"),true,'Adventure excludes native combat-only entries.');
 assert.equal(await js("!document.querySelector('#native-save').hidden && !document.querySelector('#native-custom').hidden"),true,'Native saves and generic custom dice stay available.');
 await js("window.filteredAttack=document.querySelector('#native-attack');document.querySelector('[data-ff-combat-mode=skills]').click()");await until("!document.querySelector('[role=dialog]')");
 assert.equal(await js('filteredAttack.hidden'),false,'Adventure filtering is reversible on the owned native node.');
 await js("document.querySelector('[aria-label=\"Roll dice\"]').click()");await until("!!document.querySelector('[data-ff-combat-docked]')");
 assert.equal(await js("document.querySelector('[data-ff-combat-mode=skills]').getAttribute('aria-pressed')"),'true','Composer native dice entry uses same dock.');
 await js("document.querySelector('[data-ff-combat-mode=skills]').click();document.getElementById('composer').__reactFiberFixture.memoizedProps.encounterActive=true");await until("!!document.querySelector('[data-ff-combat-docked]')");
 await js("history.pushState({},'', '/fixture/details');dispatchEvent(new PopStateEvent('popstate'))");await until("!document.querySelector('[role=dialog]')");
 await js("history.pushState({},'', '/fixture/play');dispatchEvent(new PopStateEvent('popstate'))");await until("!!document.querySelector('[data-ff-combat-docked]')");
 await configure(false);await until("!document.querySelector('[role=dialog]')");
 assert.equal(await js("document.body.style.cssText"),'','Disposal of active panel lets native modal cleanup finish.');
 await js('originalRightPane.scrollTop=0');await wheelAt('#characters');await until('originalRightPane.scrollTop>0');
 assert.equal(await js("document.querySelector('#right-pane')===originalRightPane"),true,'Disposal restores normal native sidebar scrolling without replacing its node.');
 await js('originalRightPane.scrollTop=0');

 assert.equal(await js("document.querySelector('[data-ff-combat-controls]')===null"),true);

 assert.equal(await js("document.getElementById('campaign').hasAttribute('aria-hidden')"),false);
 // A fresh controller has no captured warning when the native panel opens on
 // the user's turn. The empty sibling slot still updates without remounting.
 await js('setNativePermission(true)');await configure();await until("!!document.querySelector('[data-ff-combat-docked]')");
 await js("window.initialTrueForm=document.querySelector('form');window.initialTrueInput=initialTrueForm.querySelector('input');initialTrueInput.value='initial true draft';initialTrueInput.focus();window.initialTrueOpens=opens;setNativePermission(false)");
 await until("initialTrueForm.querySelector('button[type=submit]').disabled && !!document.querySelector('#native-turn-warning')");
 assert.equal(await js("modalState.modalStack[0].content.props.children[1].type==='p'"),true,'Missing native warning receives an informational host status, without replacing the form.');
 assert.equal(await js("modalState.modalStack[0].content.props.children[1].props.role"),'status');
 assert.deepEqual(await js("({same:document.querySelector('form')===initialTrueForm,draft:initialTrueInput.value,focused:document.activeElement===initialTrueInput,unchangedOpens:opens===initialTrueOpens})"),{same:true,draft:'initial true draft',focused:true,unchangedOpens:true});
 await js('setNativePermission(true)');await until("!initialTrueForm.querySelector('button[type=submit]').disabled && !document.querySelector('#native-turn-warning')");
 await configure(false);await until("!document.querySelector('[role=dialog]')");

 await js("openNative();document.querySelector('input').value='already open draft'");await configure();
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')===null"),true,'Do not adapt preexisting modal with unknown focus-listener ordering.');
 assert.equal(await js("document.querySelector('input').value"),'already open draft');await configure(false);await js('nativeClose()');
 await js('window.rememberedSkill=true;openNative(true)');await configure();
 assert.equal(await js("document.querySelector('[data-ff-combat-docked]')===null"),true,'Even native-shaped remembered skill detail must stay modal when it predates the adapter.');
 assert.equal(await js("document.querySelector('#d20')!==null"),true);await configure(false);await js('nativeClose()');
 console.log('Combat modal fidelity fixture passed');window.destroy();clearTimeout(timer);app.exit(0);
})().catch(error=>{console.error(error);window?.destroy();clearTimeout(timer);app.exit(1)});
