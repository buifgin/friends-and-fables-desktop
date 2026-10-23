const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { configureNativeCampaignPanel } = require('../../dist/settings/campaign-panel');
function fixture({ unrelated = false, wrongIdentity = false, expandedRail = false,missingWorkspace=false,removedComposer=false,knownWorkspace='' } = {}) {
  class Style {
    constructor() { this.values = new Map(); }
    getPropertyValue(k) { return this.values.get(k)?.[0] ?? ''; }
    getPropertyPriority(k) { return this.values.get(k)?.[1] ?? ''; }
    setProperty(k, v, p = '') { this.values.set(k, [v, p]); }
    removeProperty(k) { this.values.delete(k); }
    get pointerEvents() { return this.getPropertyValue('pointer-events'); }
    get overflow() { return this.getPropertyValue('overflow'); }
  }
  class Element {
    constructor() { this.attrs = new Map(); this.children = []; this.style = new Style(); this.isConnected = true; }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    hasAttribute(k) { return this.attrs.has(k); }
    setAttribute(k,v) { this.attrs.set(k,v); }
    removeAttribute(k) { this.attrs.delete(k); }
    contains(node) { return node === this || this.children.some(c => c.contains(node)); }
    append(node) { node.isConnected=true;node.parentElement = this; this.children.push(node); }
    remove() { this.isConnected = false; this.parentElement.children = this.parentElement.children.filter(n => n !== this); }
    querySelector(q) { return q.includes('lucide-x') ? this.close ?? null : q.includes('overflow-y-auto') ? this.scroller ?? null : q.includes('.font-header') ? this.caption ?? null : null; }
    closest(selector) { return selector==='.flex-1.h-full.w-full'?workspace:null; }
    matches() { return this === overlay; }
  }
  const body = new Element(), head = new Element(), background = new Element(), workspace = new Element(), editor = new Element(), gear = new Element(), overlay = new Element();
  body.append(background); background.append(workspace); workspace.append(editor);
  if (expandedRail) { gear.caption = new Element(); gear.textContent = 'Настройки'; }
  const dialogs = [], listeners = new Map(), microtasks = [],frames=new Map(),timers=new Map();let nextId=0;
  const requestAnimationFrame=callback=>{const id=++nextId;frames.set(id,callback);return id;},cancelAnimationFrame=id=>frames.delete(id),setTimeout=callback=>{const id=++nextId;timers.set(id,callback);return id;},clearTimeout=id=>timers.delete(id);
  let clicks = 0, closes = 0, observe; const opened=[];
  const dialog = new Element(); dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true'); dialog.setAttribute('data-state','open');
  dialog.__reactFiber$fixture = { type:'div', memoizedProps: { role:'dialog' }, child: { type: wrongIdentity ? function Other(){} : function NativeCampaign(){return 'Campaign Settings';}, memoizedProps:{campaignId:'01a0d854-78d5-7064-ae41-f63d561c8e01',isHost:true} } };
  const close = new Element(); dialog.close = close; dialog.append(close);
  const scroller = new Element(); dialog.scroller = scroller; dialog.append(scroller);
  close.click = () => { closes++; dialog.remove(); dialogs.splice(dialogs.indexOf(dialog),1); if (!dialogs.length) { body.style.removeProperty('pointer-events'); body.style.removeProperty('overflow'); background.removeAttribute('aria-hidden'); } };
  gear.click = () => { assert.equal(gear.getAttribute('data-ff-native-campaign-launch'),'true'); clicks++; body.append(overlay); body.append(dialog); dialog.previousElementSibling = overlay; dialogs.push(dialog); body.style.setProperty('pointer-events','none'); body.style.setProperty('overflow','hidden'); background.setAttribute('aria-hidden','true'); };
  if (unrelated) { const other = new Element(); other.setAttribute('role','dialog'); body.append(other); dialogs.push(other); }
  const document = {visibilityState:'visible',body,head,getElementById:id=>!missingWorkspace&&id==='events-list'&&knownWorkspace==='feed'?editor:null,createElement:()=>new Element(),querySelector:q=>q.startsWith('aside')?expandedRail?null:gear:missingWorkspace?null:q==='.tiptap[contenteditable="true"]'?removedComposer?null:editor:q.includes('data-ff-desktop-chat')?knownWorkspace==='marker'?workspace:null:q.includes('events-list')||q.includes('event-message-card-')?knownWorkspace==='card'?editor:null:null, querySelectorAll:q=>q.startsWith('aside') && expandedRail ? [gear] : dialogs.filter(d=>d.isConnected),addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
  const location = {origin:'https://play.fables.gg',pathname:'/01a0d854-78d5-7064-ae41-f63d561c8e01/play',search:''};
  const window = {setTimeout,open:(...args)=>opened.push(args),setInterval:()=>1,addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
  const context = vm.createContext({window,document,location,Node:Element,Element,HTMLElement:Element,HTMLButtonElement:Element,MutationObserver:class{constructor(fn){observe=fn;}observe(){}disconnect(){}},getComputedStyle:node=>({display:node.hasAttribute('hidden')?'none':node.style.getPropertyValue('display')||'block',visibility:node.style.getPropertyValue('visibility')||'visible',paddingLeft:/padding-left:([\d.]+)px!important/.exec(head.children[0]?.textContent??'')?.[1]??'0'}),requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,queueMicrotask:fn=>microtasks.push(fn),clearInterval(){},URLSearchParams});
  dialog.getBoundingClientRect=()=>{const css=head.children[0]?.textContent??'';return {x:Number(/left:([\d.]+)px!important/.exec(css)?.[1]??0),y:0,width:Number(/width:([\d.]+)px!important/.exec(css)?.[1]??0),height:Number(/height:([\d.]+)px!important/.exec(css)?.[1]??0)};};
  const configure = (show,w=400,h=700,palette,offset=0,navigation)=>vm.runInContext(`(${configureNativeCampaignPanel.toString()})(${JSON.stringify(show)},${w},${h},${JSON.stringify(palette)},${offset},${JSON.stringify(navigation)})`,context);
  const flush = ()=>{while(microtasks.length) microtasks.shift()();};
  return {configure,flush,paint(){const batch=Array.from(frames.values());frames.clear();for(const callback of batch)callback();flush();},frames,timers,opened,scan:()=>{observe();flush();},body,head,background,workspace,dialog,dialogs,listeners,location,window,Element,gear,get clicks(){return clicks;},get closes(){return closes;}};
}
test('off is inert; repeated layouts preserve native form and close once',()=>{
  const f=fixture(); f.configure(false); assert.equal(f.head.children.length,0); assert.equal(f.clicks,0);
  f.configure(true); assert.equal(f.clicks,1); assert.equal(f.dialog.getAttribute('data-ff-campaign-panel'),''); assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),''); assert.equal(f.body.style.pointerEvents,'auto'); assert.equal(f.background.getAttribute('aria-hidden'),null);
  f.configure(true,450,650); f.flush(); assert.equal(f.clicks,1); assert.match(f.head.children[0].textContent,/width:450px/); assert.match(f.head.children[0].textContent,/height:650px/);
  f.configure(false); f.configure(false); assert.equal(f.closes,1); assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null); assert.equal(f.body.style.pointerEvents,''); assert.equal(f.dialog.getAttribute('aria-modal'),'true'); assert.equal(f.head.children.length,0);
});
test('unrelated dialog blocks launching; component identity blocks adoption and closure',()=>{
  const f=fixture({unrelated:true}); f.configure(true); assert.equal(f.clicks,0); f.configure(false); assert.equal(f.closes,0);
  const g=fixture({wrongIdentity:true}); g.configure(true); assert.equal(g.dialog.getAttribute('data-ff-campaign-panel'),null); g.configure(false); assert.equal(g.closes,0); assert.equal(g.body.style.pointerEvents,'none');
});
test('nested layers retain native locks and accessibility; resume and route cleanup restore ownership',()=>{
  const f=fixture(); f.configure(true); const nested=new f.Element(); nested.setAttribute('role','dialog'); f.body.append(nested); f.dialogs.push(nested); f.scan();
  assert.equal(f.body.style.pointerEvents,'none'); assert.equal(f.body.style.overflow,'hidden'); assert.equal(f.background.getAttribute('aria-hidden'),'true'); assert.equal(f.dialog.getAttribute('aria-modal'),'true');
  let stopped=false; f.listeners.get('wheel')({target:f.workspace,stopImmediatePropagation:()=>stopped=true}); assert.equal(stopped,false);
  nested.remove(); f.dialogs.pop(); f.scan(); assert.equal(f.body.style.pointerEvents,'auto'); f.listeners.get('wheel')({target:f.workspace,stopImmediatePropagation:()=>stopped=true}); assert.equal(stopped,true);
  f.location.pathname='/other/play'; f.scan(); assert.equal(f.closes,1); assert.equal(f.head.children.length,0); assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);
});
test('hide during nested modal closes only owned campaign and preserves nested lock',()=>{
  const f=fixture(); f.configure(true); const nested=new f.Element(); f.body.append(nested); f.dialogs.push(nested); f.scan(); f.configure(false); assert.equal(f.closes,1); assert.deepEqual(f.opened,[]); assert.equal(nested.isConnected,true); assert.equal(f.body.style.pointerEvents,'none'); assert.equal(f.background.getAttribute('aria-hidden'),'true');
});

test('native dismissal does not reopen on subsequent layout updates',()=>{
  const f=fixture(); f.configure(true); f.dialog.close.click(); f.scan(); f.configure(true,480,720); f.flush(); assert.equal(f.clicks,1); assert.equal(f.head.children.length,1); assert.deepEqual(f.opened,[['fables-desktop://settings/close-campaign','_blank']]); assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),'','Native dismissal preserves the reservation until the close receiver runs'); f.configure(false); f.configure(true); assert.equal(f.clicks,2);
});

test('wrong origin/route is inert; wrong campaign and another portal sibling never establish ownership',()=>{
  for(const change of [f=>f.location.origin='https://example.com',f=>f.location.pathname='/settings']) {const f=fixture();change(f);f.configure(true);assert.equal(f.clicks,0);assert.equal(f.head.children.length,0);}
  const f=fixture(); f.dialog.__reactFiber$fixture.child.memoizedProps.campaignId='other'; f.dialog.__reactFiber$fixture.sibling={type:function NativeCampaign(){return 'Campaign Settings';},memoizedProps:{campaignId:'01a0d854-78d5-7064-ae41-f63d561c8e01',isHost:true}};f.configure(true);assert.equal(f.dialog.getAttribute('data-ff-campaign-panel'),null);f.configure(false);assert.equal(f.closes,0);assert.deepEqual(f.opened,[]);
});

test('desktop palette overrides owned Campaign styling and survives layout updates',()=>{
 const f=fixture(),palette={background:'#202124',foreground:'#f5f5f5',border:'rgb(70, 71, 72)',accent:'#d8bb82',panel:'#17181a',selected:'#383a3e'};
 f.configure(true,400,700,palette);assert.match(f.head.children[0].textContent,/background:#202124!important/);assert.match(f.head.children[0].textContent,/font:14px system-ui/);
 const css=f.head.children[0].textContent;
 assert.match(css,/border:1px solid!important;border-radius:8px!important;overflow:hidden!important/,'The dock keeps a thin rounded desktop frame without scrolling the outer dialog.');
 assert.match(css,/div\.flex-1\.items-center\.overflow-y-auto\{overflow:auto!important;[^}]*scrollbar-width:thin!important/,'Only the captured native content scroller owns overflow and a thin scrollbar.');
 assert.match(css,/h3\.font-header\{font-size:30px!important/,'The first campaign card title receives the desktop heading size.');
 assert.match(css,/div\.mx-auto > div:first-child > div > h3\.font-header::before\{content:"FRIENDS & FABLES DESKTOP";display:block;[^}]*font-size:10px;[^}]*letter-spacing:\.15em/,'The exact desktop eyebrow label is limited to the captured first card heading.');
 assert.doesNotMatch(css,/\[data-ff-desktop-detail-card="true"\]/,'Heading matching follows the captured first-card structure without requiring the optional appearance marker.');
 assert.match(css,/div\.p-6\.h-full\{padding:0!important;/,'Captured wrapper padding is reset before applying desktop main spacing.');
 assert.match(css,/div\.mx-auto\{padding:28px 32px!important\}/,'Native content receives the desktop editor main padding.');
 assert.doesNotMatch(css,/\[data-ff-campaign-panel\] h3\s*\{/,'Ordinary campaign section headings keep their native size.');
 assert.match(css,/button:has\(> \.lucide-x\)[^}]*width:34px!important[^}]*height:34px!important[^}]*border-radius:50%!important/,'Only the direct native close button receives the circular 34px target.');
 assert.match(css,/button:has\(> \.lucide-x\) > \.lucide-x\{display:block!important;width:18px!important;height:18px!important/,'The native close icon uses the shared 18px SVG size.');
 assert.match(css,/--ff-campaign-accent:#d8bb82/,'The campaign title and close focus state use the player accent.');
 assert.ok(css.includes('button[class~="bg-green-500/10"][class~="border-green-500/30"]')&&css.includes('[role="radio"][data-state="on"]')&&css.includes('[role="radio"][aria-checked="true"]'), 'Known selected Campaign model and pacing controls receive a dedicated state rule.');
 assert.ok(css.includes('background:#383a3e!important;border-color:#d8bb82!important;color:#f5f5f5!important'), 'Selected controls retain the desktop selected fill, accent border and readable foreground.');
 assert.match(css,/:is\(button,input,textarea,\[role="combobox"\]\):focus-visible\{outline:2px solid #d8bb82!important/,'Selected-state styling retains the palette focus-visible outline.');
 f.configure(true,450,650);assert.equal(f.clicks,1);assert.match(f.head.children[0].textContent,/background:#202124!important/);f.configure(false);assert.equal(f.closes,1);
 const g=fixture();g.configure(true,400,700,{...palette,background:'red;}body{display:none'});assert.doesNotMatch(g.head.children[0].textContent,/body\{|display:none/);
});

test('Settings Hub centers a 620px content column in the space beside its retained navigation',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../../assets/settings/settings-hub.css'),'utf8');
 assert.match(css,/nav\{[^}]*width:126px/);
 assert.match(css,/main\{[^}]*margin-left:max\(126px,calc\(\(100% - 494px\)\/2\)\);width:min\(620px,calc\(100% - 126px\)\);max-width:620px/);
 assert.match(css,/main\{[^}]*padding:28px 32px/);
});


test('Campaign asks the combat owner once and waits for actual native unmount before snapshot/launch',()=>{
 const f=fixture(),combat=new f.Element();combat.setAttribute('role','dialog');f.body.append(combat);f.dialogs.push(combat);
 let calls=0;f.window.__friendsFablesDesktopCombatPanel={closeForSettings(){calls++;return combat;}};
 f.body.style.setProperty('pointer-events','none');f.background.setAttribute('aria-hidden','true');
 f.configure(true);f.configure(true,420,710);f.flush();assert.equal(calls,1);assert.equal(f.clicks,0);
 combat.setAttribute('data-state','closed');f.scan();assert.equal(f.clicks,0,'Closing animation still owns native locks.');
 combat.remove();f.dialogs.splice(f.dialogs.indexOf(combat),1);f.body.style.removeProperty('pointer-events');f.background.removeAttribute('aria-hidden');
 f.scan();assert.equal(f.clicks,1);assert.equal(calls,1);assert.equal(f.background.getAttribute('aria-hidden'),null);
 f.configure(false);assert.equal(f.body.style.pointerEvents,'');assert.equal(f.background.getAttribute('aria-hidden'),null);
});
test('blocked combat handoff and a layer arriving during unmount prevent Campaign launch',()=>{
 const f=fixture({unrelated:true});let calls=0;f.window.__friendsFablesDesktopCombatPanel={closeForSettings(){calls++;return false;}};
 f.configure(true);assert.equal(f.clicks,0);assert.equal(calls,1);f.configure(false);assert.equal(f.closes,0);
 const g=fixture(),combat=new g.Element();g.body.append(combat);g.dialogs.push(combat);let accepted=0;
 g.window.__friendsFablesDesktopCombatPanel={closeForSettings(){accepted++;return combat;}};g.configure(true);
 const nested=new g.Element();nested.setAttribute('role','listbox');g.body.append(nested);g.dialogs.push(nested);
 combat.remove();g.dialogs.shift();g.scan();assert.equal(g.clicks,0);assert.equal(accepted,1);assert.equal(nested.isConnected,true);
 nested.remove();g.dialogs.pop();g.scan();assert.equal(g.clicks,1);assert.equal(accepted,1);
});


test('Campaign section suspension retains native form, reserved workspace and unlocked body until full close',()=>{
 const f=fixture();f.configure(true);f.dialog.unsaved='native draft';const controller=f.window.__friendsFablesDesktopCampaignPanel;
 const workspaceCSS=f.head.children[0].textContent.match(/\[data-ff-campaign-workspace\][^}]+}/)[0];
 for(const section of ['translation','general']){
  f.configure('suspend');f.scan();assert.equal(f.closes,0);assert.equal(f.dialog.isConnected,true);assert.equal(f.dialog.unsaved,'native draft');
  assert.equal(f.window.__friendsFablesDesktopCampaignPanel,controller);assert.match(f.head.children[0].textContent,/visibility:hidden!important/);
  assert.ok(f.head.children[0].textContent.includes(workspaceCSS),'Reserved game strip remains during '+section);
  assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),'');assert.equal(f.body.style.pointerEvents,'auto');assert.equal(f.body.style.overflow,'auto');
  assert.equal(f.background.getAttribute('aria-hidden'),null);assert.equal(f.dialog.getAttribute('aria-modal'),'false');
  f.configure(true);f.flush();assert.equal(f.clicks,1);assert.equal(f.closes,0);assert.doesNotMatch(f.head.children[0].textContent,/visibility:hidden/);
 }
 f.configure('suspend');f.configure(false);f.configure(false);assert.equal(f.closes,1);assert.equal(f.head.children.length,0);
 assert.equal(f.window.__friendsFablesDesktopCampaignPanel,undefined);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);
 assert.equal(f.body.style.pointerEvents,'');assert.equal(f.body.style.overflow,'');assert.equal(f.listeners.size,0);
});
test('route departure disposes a suspended native Campaign exactly once',()=>{
 const f=fixture();f.configure(true);f.configure('suspend');f.location.pathname='/settings';f.scan();
 assert.equal(f.closes,1);assert.equal(f.head.children.length,0);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);
 f.configure(false);assert.equal(f.closes,1);
});


test('Campaign flex chain bounds its sole content scroller and removes nested first-card framing',()=>{
 const f=fixture();f.configure(true);const css=f.head.children[0].textContent;
 assert.match(css,/div\.overflow-y-auto\.h-full\{[^}]*min-height:0!important[^}]*flex:1 1 0%!important/,'Outer native flex child must shrink within the fixed dock.');
 assert.match(css,/div\.p-6\.h-full\{[^}]*height:100%!important[^}]*min-height:0!important[^}]*display:flex!important/,'Padding wrapper constrains the content instead of growing with it.');
 assert.match(css,/div\.flex-1\.items-center\.overflow-y-auto\{[^}]*min-height:0!important[^}]*overflow-y:auto!important/,'The only intended content scroller has a bounded flex height.');
 assert.match(css,/div\.mx-auto > div:first-child\{[^}]*padding:0!important[^}]*border:0!important/,'The desktop content gutter replaces the native double card frame.');
 assert.match(css,/\[data-ff-campaign-panel\] :is\(label,h3\.font-medium\)\{font-size:13px!important/,'Ordinary labels use the same 13px desktop settings typography.');
});


test('Campaign content is keyboard focusable while mounted and restores native tabindex on disposal',()=>{
 const f=fixture();f.configure(true);assert.equal(f.dialog.scroller.getAttribute('tabindex'),'0');f.configure('suspend');f.configure(true);assert.equal(f.dialog.scroller.getAttribute('tabindex'),'0');f.configure(false);assert.equal(f.dialog.scroller.getAttribute('tabindex'),null);
 const g=fixture();g.dialog.scroller.setAttribute('tabindex','-1');g.configure(true);assert.equal(g.dialog.scroller.getAttribute('tabindex'),'-1');g.configure(false);assert.equal(g.dialog.scroller.getAttribute('tabindex'),'-1','Existing native focus ownership is retained.');
});


test('Campaign launches through the expanded native labelled Settings row without replacing it',()=>{
 const f=fixture({expandedRail:true}),nativeRow=f.gear;f.configure(true);assert.equal(f.clicks,1);assert.equal(f.gear,nativeRow);f.configure('suspend');f.configure(true);assert.equal(f.clicks,1);f.configure(false);assert.equal(f.closes,1);assert.equal(f.gear,nativeRow);
});

test('native Campaign converts reserved DIP dimensions to the current CSS viewport and reflows on website zoom',async()=>{
 const f=fixture();f.window.innerHeight=700;let opening=f.configure(true,400,700);f.paint();f.paint();assert.equal(await opening,true);
 f.window.innerHeight=800;f.listeners.get('resize')();f.flush();let css=f.head.children[0].textContent;
 assert.equal(Number(/height:([\d.]+)px!important/.exec(css)[1]),800,'A zoomed website still fills its CSS viewport');
 assert.ok(Math.abs(Number(/width:([\d.]+)px!important/.exec(css)[1])-400*800/700)<.01,'Reserved native width is converted with the same scale');
 opening=f.configure(true,450,750);f.paint();f.paint();assert.equal(await opening,true);css=f.head.children[0].textContent;assert.equal(Number(/height:([\d.]+)px!important/.exec(css)[1]),800);assert.ok(Math.abs(Number(/width:([\d.]+)px!important/.exec(css)[1])-480)<.01);assert.equal(f.clicks,1);f.configure(false);
});

test('native readiness waits for asynchronous adoption and two target geometry paint frames, then cancels promptly',async()=>{
 const f=fixture(),mount=f.gear.click;f.gear.click=()=>{};
 let done=false;const opening=f.configure(true).then(value=>{done=true;return value});f.paint();f.paint();await Promise.resolve();assert.equal(done,false,'Missing native form is never ready');
 f.gear.setAttribute('data-ff-native-campaign-launch','true');mount();f.gear.removeAttribute('data-ff-native-campaign-launch');f.scan();f.paint();await Promise.resolve();assert.equal(done,false,'One painted frame is insufficient');f.paint();assert.equal(await opening,true);assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);
 const waiting=f.configure(true);f.window.__friendsFablesDesktopCampaignPanel.cancelPending();assert.equal(await waiting,false);assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);assert.equal(f.closes,0,'Cancelling readiness preserves the native form/draft');f.configure(false);
});

test('closing a requested but not yet mounted Campaign closes its exact late native dialog before docking',async()=>{
 const f=fixture(),mount=f.gear.click;f.gear.click=()=>{};const opening=f.configure(true);f.configure(false);assert.equal(await opening,false);assert.equal(f.frames.size,0);assert.equal(f.timers.size,1,'Only the bounded late-mount retirement deadline remains');assert.equal(f.closes,0);
 f.gear.setAttribute('data-ff-native-campaign-launch','true');mount();f.gear.removeAttribute('data-ff-native-campaign-launch');f.scan();assert.equal(f.closes,1);assert.equal(f.dialog.isConnected,false);assert.equal(f.head.children.length,0);assert.equal(f.window.__friendsFablesDesktopCampaignPanel,undefined);
});

test('a cancelled pending launch retires on its deadline and cannot close a fresh native gear launch',async()=>{
 for(const reason of ['deadline','new-gear-click']){
  const f=fixture(),mount=f.gear.click;f.gear.click=()=>{};const opening=f.configure(true);f.configure(false);assert.equal(await opening,false);
  if(reason==='deadline'){const [id,expire]=f.timers.entries().next().value;f.timers.delete(id);expire();}
  else f.listeners.get('click')({target:f.gear});
  assert.equal(f.window.__friendsFablesDesktopCampaignPanel,undefined,reason+' clears retired controller');assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);assert.equal(f.head.children.length,0);
  f.gear.setAttribute('data-ff-native-campaign-launch','true');mount();f.gear.removeAttribute('data-ff-native-campaign-launch');f.scan();assert.equal(f.closes,0,'A fresh dialog after ownership retirement is not cancelled');assert.equal(f.dialog.isConnected,true);
 }
});

// Reservation is observable workspace behavior, independent of native gear launch.
test('passive eligible Campaign reservation keeps workspace gutter without launching native Settings',async()=>{
 const f=fixture();f.window.innerHeight=700;
 const reserved=f.configure('reserve',580,700);
 assert.equal(f.clicks,0,'General and Appearance reserve without opening native Campaign');
 assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),'','Eligible workspace owns the total Settings gutter before native mount');
 assert.match(f.head.children[0].textContent,/padding-left:580px!important/);
 f.paint();f.paint();assert.equal(await reserved,true,'A passive reserved workspace reaches geometry readiness');
 f.configure(false);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);assert.equal(f.head.children.length,0);assert.equal(f.clicks,0);assert.equal(f.closes,0);
});

test('passive gutter shares offset/zoom dimensions with adoption and survives native dismissal until close delivery',async()=>{
 const f=fixture();f.window.innerHeight=700;let ready=f.configure('reserve',580,700);f.paint();f.paint();assert.equal(await ready,true);assert.equal(f.clicks,0);
 ready=f.configure(true,454,700,undefined,126);f.flush();f.paint();f.paint();assert.equal(await ready,true);assert.equal(f.clicks,1);assert.match(f.head.children[0].textContent,/left:126px!important/);assert.match(f.head.children[0].textContent,/padding-left:580px!important/);
 f.window.innerHeight=350;f.listeners.get('resize')();f.flush();assert.match(f.head.children[0].textContent,/left:63px!important/);assert.match(f.head.children[0].textContent,/padding-left:290px!important/);
 f.dialog.close.click();f.scan();assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),'');assert.equal(f.body.style.pointerEvents,'');assert.equal(f.dialog.getAttribute('data-ff-campaign-panel'),null);assert.equal(f.opened.length,1);
 f.configure(false);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);assert.equal(f.head.children.length,0);assert.equal(f.window.__friendsFablesDesktopCampaignPanel,undefined);
});
test('closing pending native mount immediately releases passive gutter while preserving late-mount cancellation',async()=>{
 const f=fixture();f.window.innerHeight=700;let ready=f.configure('reserve',580,700);f.paint();f.paint();assert.equal(await ready,true);
 const mount=f.gear.click;f.gear.click=()=>{};ready=f.configure(true,454,700,undefined,126);f.flush();f.configure(false);assert.equal(await ready,false);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);assert.equal(f.timers.size,1);
 f.gear.setAttribute('data-ff-native-campaign-launch','true');mount();f.gear.removeAttribute('data-ff-native-campaign-launch');f.scan();assert.equal(f.closes,1);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);assert.equal(f.head.children.length,0);
});

test('passive reservation rejects unknown workspace and route departure restores only its owned gutter',async()=>{
 const f=fixture();f.window.innerHeight=700;let ready=f.configure('reserve',580,700);f.paint();f.paint();assert.equal(await ready,true);assert.equal(f.clicks,0);f.location.pathname='/home';f.listeners.get('popstate')();f.flush();assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);assert.equal(f.head.children.length,0);assert.equal(f.window.__friendsFablesDesktopCampaignPanel,undefined);
 const unknown=fixture({missingWorkspace:true});assert.equal(await unknown.configure('reserve',580,700),false);assert.equal(unknown.head.children.length,0);assert.equal(unknown.clicks,0);const native=unknown.configure(true,454,700,undefined,126);unknown.paint();unknown.paint();assert.equal(await native,true,'Missing workspace does not disable known native Campaign form');assert.equal(unknown.clicks,1);assert.equal(unknown.workspace.getAttribute('data-ff-campaign-workspace'),null);assert.match(unknown.head.children[0].textContent,/left:126px!important/);unknown.configure(false);assert.equal(unknown.closes,1);
 const g=fixture();g.location.pathname='/home';assert.equal(await g.configure('reserve',580,700),false);assert.equal(g.head.children.length,0);assert.equal(g.clicks,0);
});

for(const knownWorkspace of ['feed','marker','card'])test('removed composer preserves passive and native Campaign capability through known '+knownWorkspace+' workspace',async()=>{
 const f=fixture({removedComposer:true,knownWorkspace});f.window.innerHeight=700;let ready=f.configure('reserve',580,700);assert.equal(f.clicks,0);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),'','Known chat root remains reservable without Tiptap');f.paint();f.paint();assert.equal(await ready,true);
 ready=f.configure(true,454,700,undefined,126);f.flush();f.paint();f.paint();assert.equal(await ready,true);assert.equal(f.clicks,1);assert.equal(f.dialog.getAttribute('data-ff-campaign-panel'),'');assert.match(f.head.children[0].textContent,/left:126px!important/);assert.match(f.head.children[0].textContent,/padding-left:580px!important/);f.configure(false);assert.equal(f.closes,1);
});

test('same-document off-route cleanup removes passive reservation without requiring popstate',async()=>{
 const f=fixture();f.window.innerHeight=700;const ready=f.configure('reserve',580,700);f.paint();f.paint();assert.equal(await ready,true);f.location.pathname='/home';f.configure(false);assert.equal(f.head.children.length,0);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);assert.equal(f.window.__friendsFablesDesktopCampaignPanel,undefined);assert.equal(f.clicks,0);
});
test('same-document Campaign reselection retires old native ownership before adopting the new campaign identity',async()=>{
 const f=fixture();f.window.innerHeight=700;let ready=f.configure(true,454,700,undefined,126);f.paint();f.paint();assert.equal(await ready,true);const old=f.window.__friendsFablesDesktopCampaignPanel;
 const next='01a0d854-78d5-7064-ae41-f63d561c8e02';f.location.pathname='/'+next+'/play';f.dialog.__reactFiber$fixture.child.memoizedProps.campaignId=next;
 ready=f.configure(true,454,700,undefined,126);f.paint();f.paint();assert.equal(await ready,true);assert.notEqual(f.window.__friendsFablesDesktopCampaignPanel,old);assert.equal(f.window.__friendsFablesDesktopCampaignPanel.route,f.location.pathname);assert.equal(f.clicks,2);assert.equal(f.closes,1,'Only previous owned form closed before current native launch');assert.equal(f.dialog.getAttribute('data-ff-campaign-panel'),'');assert.equal(f.head.children.length,1);f.configure(false);assert.equal(f.closes,2);
});

const navigation={ticket:'fixture-ticket',locale:'en',destinations:['appearance','translation','instructions','music','combat','general']};
test('navigation preparation reveals genuine form, rail and reservation together, with fixed navigation-only links',async()=>{
 const f=fixture(),preparing=f.configure('prepare',454,700,undefined,126,navigation);
 assert.equal(f.dialog.getAttribute('data-ff-campaign-panel'),'');assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);
 assert.match(f.head.children[0].textContent,/visibility:hidden!important/);
 const nav=f.body.children.find(node=>node.hasAttribute('data-ff-campaign-navigation'));assert.ok(nav);assert.equal(nav.children[0].textContent,'Settings');
 assert.deepEqual(nav.children.slice(1).map(node=>node.textContent),['Campaign','Appearance','Translation','/sp','Music','Combat','General']);
 assert.equal(nav.children[1].getAttribute('aria-current'),'page');assert.equal(nav.children[1].getAttribute('href'),null);
 for(const link of nav.children.slice(2)){const url=new URL(link.getAttribute('href'));assert.equal(url.protocol,'fables-desktop:');assert.equal(url.pathname,'/select-campaign-section');assert.equal(url.searchParams.get('ticket'),navigation.ticket);assert.equal([...url.searchParams].length,2);}
 f.paint();f.paint();assert.equal(await preparing,true);
 assert.equal(await f.configure('reveal',454,700,undefined,126,{...navigation,ticket:'stale'}),false);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);
 const revealing=f.configure('reveal',454,700,undefined,126,navigation);assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),'');assert.doesNotMatch(f.head.children[0].textContent,/visibility:hidden!important/);f.paint();f.paint();assert.equal(await revealing,true);
 assert.equal(f.clicks,1);f.configure('suspend',454,700,undefined,126);assert.equal(nav.isConnected,false);assert.equal(await f.configure('reveal',454,700,undefined,126,navigation),false);
 f.configure(false);assert.equal(f.head.children.length,0);
});
test('reveal cannot create a controller, relaunch a disposed native form, or accept a canceled preparation',async()=>{
 const f=fixture();assert.equal(await f.configure('reveal',454,700,undefined,126,navigation),false);assert.equal(f.clicks,0);
 const preparing=f.configure('prepare',454,700,undefined,126,navigation);f.configure(false);assert.equal(await preparing,false);assert.equal(await f.configure('reveal',454,700,undefined,126,navigation),false);assert.equal(f.clicks,1);assert.equal(f.closes,1);
});
test('localized navigation show remains separate from standalone no-navigation compatibility',async()=>{
 const f=fixture(),shown=f.configure(true,454,700,undefined,126,{...navigation,locale:'ru',destinations:['general']});assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null);f.paint();f.paint();f.paint();f.paint();assert.equal(await shown,true);
 const nav=f.body.children.find(node=>node.hasAttribute('data-ff-campaign-navigation'));assert.deepEqual(nav.children.map(node=>node.textContent),['Настройки','Кампания','Общие']);
 f.configure(false);assert.equal(nav.isConnected,false);
});

// Robustness counterexample, not evidence of the live website's native shape.
// Preserve the connected closed-animation + locked body negative above.
test('positively completed native close with retained hidden shell cannot poison Campaign handoff',()=>{
 const f=fixture(),combat=new f.Element();combat.setAttribute('role','dialog');f.body.append(combat);f.dialogs.push(combat);let calls=0;
 f.window.__friendsFablesDesktopCombatPanel={closeForSettings(){calls++;return combat;}};
 f.body.style.setProperty('pointer-events','none');f.body.style.setProperty('overflow','hidden');f.background.setAttribute('aria-hidden','true');f.configure(true);assert.equal(f.clicks,0);
 combat.setAttribute('data-state','closed');f.scan();assert.equal(f.clicks,0,'A still-visible close animation retains native locks');
 combat.setAttribute('hidden','');combat.style.setProperty('display','none');f.body.style.removeProperty('pointer-events');f.body.style.removeProperty('overflow');f.background.removeAttribute('aria-hidden');f.scan();
 assert.equal(combat.isConnected,true,'Native completed close retains its exact terminal shell');assert.equal(f.clicks,1,'A positive native terminal state with restored locks permits Settings');assert.equal(calls,1,'Native close is never dispatched twice');f.configure(false);assert.equal(f.body.style.pointerEvents,'');assert.equal(f.background.getAttribute('aria-hidden'),null);
});
