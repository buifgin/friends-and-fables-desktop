const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { configureNativeCampaignPanel } = require('../../dist/settings/campaign-panel');
function fixture({ unrelated = false, wrongIdentity = false, expandedRail = false } = {}) {
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
    append(node) { node.parentElement = this; this.children.push(node); }
    remove() { this.isConnected = false; this.parentElement.children = this.parentElement.children.filter(n => n !== this); }
    querySelector(q) { return q.includes('lucide-x') ? this.close ?? null : q.includes('overflow-y-auto') ? this.scroller ?? null : q.includes('.font-header') ? this.caption ?? null : null; }
    closest() { return workspace; }
    matches() { return this === overlay; }
  }
  const body = new Element(), head = new Element(), background = new Element(), workspace = new Element(), editor = new Element(), gear = new Element(), overlay = new Element();
  body.append(background); background.append(workspace); workspace.append(editor);
  if (expandedRail) { gear.caption = new Element(); gear.textContent = 'Настройки'; }
  const dialogs = [], listeners = new Map(), microtasks = [];
  let clicks = 0, closes = 0, observe; const opened=[];
  const dialog = new Element(); dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true'); dialog.setAttribute('data-state','open');
  dialog.__reactFiber$fixture = { type:'div', memoizedProps: { role:'dialog' }, child: { type: wrongIdentity ? function Other(){} : function NativeCampaign(){return 'Campaign Settings';}, memoizedProps:{campaignId:'01a0d854-78d5-7064-ae41-f63d561c8e01',isHost:true} } };
  const close = new Element(); dialog.close = close; dialog.append(close);
  const scroller = new Element(); dialog.scroller = scroller; dialog.append(scroller);
  close.click = () => { closes++; dialog.remove(); dialogs.splice(dialogs.indexOf(dialog),1); if (!dialogs.length) { body.style.removeProperty('pointer-events'); body.style.removeProperty('overflow'); background.removeAttribute('aria-hidden'); } };
  gear.click = () => { assert.equal(gear.getAttribute('data-ff-native-campaign-launch'),'true'); clicks++; body.append(overlay); body.append(dialog); dialog.previousElementSibling = overlay; dialogs.push(dialog); body.style.setProperty('pointer-events','none'); body.style.setProperty('overflow','hidden'); background.setAttribute('aria-hidden','true'); };
  if (unrelated) { const other = new Element(); other.setAttribute('role','dialog'); body.append(other); dialogs.push(other); }
  const document = {body,head,createElement:()=>new Element(),querySelector:q=>q.startsWith('aside') ? expandedRail ? null : gear : editor, querySelectorAll:q=>q.startsWith('aside') && expandedRail ? [gear] : dialogs.filter(d=>d.isConnected),addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
  const location = {origin:'https://play.fables.gg',pathname:'/01a0d854-78d5-7064-ae41-f63d561c8e01/play',search:''};
  const window = {open:(...args)=>opened.push(args),setInterval:()=>1,addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
  const context = vm.createContext({window,document,location,Node:Element,Element,HTMLElement:Element,HTMLButtonElement:Element,MutationObserver:class{constructor(fn){observe=fn;}observe(){}disconnect(){}},getComputedStyle:()=>({display:'block'}),queueMicrotask:fn=>microtasks.push(fn),clearInterval(){},URLSearchParams});
  const configure = (show,w=400,h=700,palette)=>vm.runInContext(`(${configureNativeCampaignPanel.toString()})(${JSON.stringify(show)},${w},${h},${JSON.stringify(palette)})`,context);
  const flush = ()=>{while(microtasks.length) microtasks.shift()();};
  return {configure,flush,opened,scan:()=>{observe();flush();},body,head,background,workspace,dialog,dialogs,listeners,location,window,Element,gear,get clicks(){return clicks;},get closes(){return closes;}};
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
  const f=fixture(); f.configure(true); f.dialog.close.click(); f.scan(); f.configure(true,480,720); f.flush(); assert.equal(f.clicks,1); assert.equal(f.head.children.length,0); assert.deepEqual(f.opened,[['fables-desktop://settings/close-campaign','_blank']]); assert.equal(f.workspace.getAttribute('data-ff-campaign-workspace'),null); f.configure(false); f.configure(true); assert.equal(f.clicks,2);
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
