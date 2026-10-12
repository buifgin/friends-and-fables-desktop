const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { configureNativeCampaignPanel } = require('../../dist/settings/campaign-panel');
function fixture({ unrelated = false, wrongIdentity = false } = {}) {
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
    querySelector(q) { return q.includes('lucide-x') ? this.close ?? null : null; }
    closest() { return workspace; }
    matches() { return this === overlay; }
  }
  const body = new Element(), head = new Element(), background = new Element(), workspace = new Element(), editor = new Element(), gear = new Element(), overlay = new Element();
  body.append(background); background.append(workspace); workspace.append(editor);
  const dialogs = [], listeners = new Map(), microtasks = [];
  let clicks = 0, closes = 0, observe; const opened=[];
  const dialog = new Element(); dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true'); dialog.setAttribute('data-state','open');
  dialog.__reactFiber$fixture = { type:'div', memoizedProps: { role:'dialog' }, child: { type: wrongIdentity ? function Other(){} : function NativeCampaign(){return 'Campaign Settings';}, memoizedProps:{campaignId:'01a0d854-78d5-7064-ae41-f63d561c8e01',isHost:true} } };
  const close = new Element(); dialog.close = close; dialog.append(close);
  close.click = () => { closes++; dialog.remove(); dialogs.splice(dialogs.indexOf(dialog),1); if (!dialogs.length) { body.style.removeProperty('pointer-events'); body.style.removeProperty('overflow'); background.removeAttribute('aria-hidden'); } };
  gear.click = () => { assert.equal(gear.getAttribute('data-ff-native-campaign-launch'),'true'); clicks++; body.append(overlay); body.append(dialog); dialog.previousElementSibling = overlay; dialogs.push(dialog); body.style.setProperty('pointer-events','none'); body.style.setProperty('overflow','hidden'); background.setAttribute('aria-hidden','true'); };
  if (unrelated) { const other = new Element(); other.setAttribute('role','dialog'); body.append(other); dialogs.push(other); }
  const document = {body,head,createElement:()=>new Element(),querySelector:q=>q.startsWith('aside') ? gear : editor, querySelectorAll:()=>dialogs.filter(d=>d.isConnected),addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
  const location = {origin:'https://play.fables.gg',pathname:'/01a0d854-78d5-7064-ae41-f63d561c8e01/play',search:''};
  const window = {open:(...args)=>opened.push(args),setInterval:()=>1,addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
  const context = vm.createContext({window,document,location,Node:Element,Element,HTMLElement:Element,MutationObserver:class{constructor(fn){observe=fn;}observe(){}disconnect(){}},getComputedStyle:()=>({display:'block'}),queueMicrotask:fn=>microtasks.push(fn),clearInterval(){},URLSearchParams});
  const configure = (show,w=400,h=700,palette)=>vm.runInContext(`(${configureNativeCampaignPanel.toString()})(${show},${w},${h},${JSON.stringify(palette)})`,context);
  const flush = ()=>{while(microtasks.length) microtasks.shift()();};
  return {configure,flush,opened,scan:()=>{observe();flush();},body,head,background,workspace,dialog,dialogs,listeners,location,window,Element,get clicks(){return clicks;},get closes(){return closes;}};
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
 f.configure(true,450,650);assert.equal(f.clicks,1);assert.match(f.head.children[0].textContent,/background:#202124!important/);f.configure(false);assert.equal(f.closes,1);
 const g=fixture();g.configure(true,400,700,{...palette,background:'red;}body{display:none'});assert.doesNotMatch(g.head.children[0].textContent,/body\{|display:none/);
});
