// Native execution belongs to the coordinator. This fixture never calls an online API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const html = `<!doctype html><html><head><style>:root{--foreground:220 10% 90%;--primary:45 100% 50%}body{background:#080808;color:#eee}.flex{display:flex}.flex-col{flex-direction:column}.gap-1{gap:4px}.h-3{height:12px}.w-3{width:12px}.h-4{height:16px}.w-4{width:16px}.rounded-full{border-radius:999px;box-sizing:border-box}.border{border:1px solid #999}[class~="bg-primary/70"]{background:hsl(var(--primary)/.7)}.bg-primary{background:hsl(var(--primary))}.bg-muted,.bg-gray-800{background:#222}[role=dialog]{position:fixed;inset:100px;background:#080808}.fixed{position:fixed}.inset-0{inset:0}</style></head><body><aside id="sidebar"><div class="container-[size]"><div id="rows"></div><button id="open" type="button">Open Spellbook</button></div></aside><textarea id="draft">preserve this draft</textarea><script>
window.keydowns=[];document.addEventListener('keydown',event=>window.keydowns.push({key:event.key,repeat:event.repeat}),true);window.calls=[];window.opens=0;window.closes=0;window.cacheInvalidations=0;window.toasts=0;
window.config={characterId:123,campaignId:'fixture',phase:'campaign',viewOnly:false,pending:false,used:2,max:4};
window.mountSidebar=()=>{
 const rows=document.querySelector('#rows');rows.innerHTML='<div class="flex flex-col items-center"><span>Level 1</span><div class="flex gap-1 mt-1" id="circles"></div></div><div><span>Cantrips</span><svg id="infinity"></svg></div>';
 const owner={memoizedProps:{character:{id:123}},return:null};
 const row=rows.firstChild;row.__reactFiber$fixture={key:'1',memoizedProps:{},return:owner};
 for(let i=0;i<4;i++){const node=document.createElement('div');node.className='w-3 h-3 rounded-full border '+(i<2?'bg-primary/70 border-primary':'bg-muted border-muted-foreground/30');node.__reactFiber$fixture={memoizedProps:{className:node.className},return:row.__reactFiber$fixture};document.querySelector('#circles').append(node)}
 document.querySelector('#open').__reactFiber$fixture={return:owner};document.querySelector('#open').__reactProps$fixture={onClick:()=>{const options={defaultTab:"spells"};window.opens++;window.mountBook(options)}};
};
window.mountBook=()=>{
 const c=window.config;const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.id='book';dialog.setAttribute('data-state','open');const provider={memoizedProps:{contentId:'book',open:true,onOpenChange(value){if(!value){window.closes++;dialog.remove();overlay.remove()}}},return:null};const providerAlternate={memoizedProps:provider.memoizedProps,return:null,alternate:provider};provider.alternate=providerAlternate;const portal={tag:4,stateNode:{containerInfo:document.body},return:provider};const overlayPortal={tag:4,stateNode:{containerInfo:document.body},return:providerAlternate};const overlay=document.createElement('div');overlay.className='fixed inset-0';overlay.setAttribute('data-state','open');overlay.__reactFiber$fixture={return:overlayPortal};dialog.__reactFiber$fixture={return:portal};
 const close=document.createElement('button');close.type='button';close.innerHTML='<svg class="lucide-x"></svg>';close.setAttribute('aria-label','Close');close.onclick=()=>{provider.memoizedProps.onOpenChange(false)};
 close.__reactProps$fixture={onClick:close.onclick};close.__reactFiber$fixture={memoizedProps:close.__reactProps$fixture,return:{memoizedProps:{preventClose:undefined,onClose:undefined},return:portal}};dialog.append(close);
 const observer={options:{mutationFn:async function({characterId,campaignId,level,maxSlots,usedSlots}){return {characterId,campaignId,level,maxSlots,usedSlots}},onSuccess(){window.cacheInvalidations++}},getCurrentResult(){return {isPending:window.config.pending,status:window.config.pending?'pending':'idle'}}};
 const owner={memoizedProps:{characterId:c.characterId,campaignId:c.campaignId,phase:c.phase,viewOnly:c.viewOnly},memoizedState:{memoizedState:observer,next:{memoizedState:{options:{queryKey:['spellSlots',c.characterId]},getCurrentResult(){return {status:'success',isPending:false,isLoading:false,isFetching:false,data:[{level:1,max_slots:c.max,used_slots:c.used}]}}},next:null}},return:portal};
 const row=document.createElement('div');row.className='flex flex-col gap-1';row.__reactFiber$fixture={key:'1',memoizedProps:{},return:owner};row.innerHTML='<p>Level 1</p><div class="flex flex-row"></div>';dialog.append(row);
 for(let i=0;i<c.max;i++){
  const node=document.createElement('button');node.type='button';node.className='h-4 w-4 rounded-full '+(i<c.max-c.used?'bg-primary':'bg-gray-800');node.disabled=c.viewOnly||c.phase!=='campaign';
  const nativeCallback=()=>{const usedSlots=i<c.max-c.used?c.used+1:c.used-1;window.calls.push({characterId:c.characterId,campaignId:c.campaignId,level:1,maxSlots:c.max,usedSlots});observer.options.onSuccess();window.toasts++};
  node.__reactProps$fixture={onClick:nativeCallback,disabled:node.disabled,className:node.className};node.__reactFiber$fixture={memoizedProps:node.__reactProps$fixture,return:row.__reactFiber$fixture};row.lastChild.append(node);
 }
 window.lastDialog=dialog;window.lastOverlay=overlay;window.lastOwner=owner;document.body.append(overlay,dialog);
};window.mountSidebar();
</script></body></html>`;
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
const output = require('esbuild').transformSync(fs.readFileSync(path.join(root,'src/combat/spell-slots.ts'),'utf8'), {loader:'ts',target:'es2022',format:'cjs'});
new Function(output.code);
if(process.argv.includes('--syntax')){console.log('Spell slots serialized fixture syntax PASS');process.exit(0)}
const {app,BrowserWindow,session}=require('electron');
if(!process.env.FABLES_TEST_PROFILE_DIR)throw Error('Use central fixture runner/private profile');
app.setPath('userData',process.env.FABLES_TEST_PROFILE_DIR);
let win;const fixtureDeadline=Date.now()+20000;const timer=setTimeout(()=>{console.error('Spell slots fixture timed out');win?.destroy();app.exit(1)},20000);
app.on('window-all-closed',()=>{});
(async()=>{
 await app.whenReady();const site=session.fromPartition('spell-slots-'+process.pid);site.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
 win=new BrowserWindow({show:true,width:900,height:800,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 let nativeFocusEvents=0;win.on('focus',()=>nativeFocusEvents++);
 await win.loadURL('https://fixture.invalid/campaign/fixture/play');win.focus();win.webContents.focus();
 const js=source=>win.webContents.executeJavaScript(source);
 const focusDiagnostics=async()=>({bounds:win.getBounds(),visible:win.isVisible(),focused:win.isFocused(),documentHasFocus:await js('document.hasFocus()').catch(()=>false),nativeFocusEvents});
 let readiness;
 while(Date.now()<fixtureDeadline){
  readiness=await focusDiagnostics();
  if(readiness.visible&&readiness.focused&&readiness.documentHasFocus)break;
  await new Promise(r=>setTimeout(r,25));
 }
 assert.equal(readiness?.visible,true,'fixture window did not become visible before native input: '+JSON.stringify(readiness));
 assert.equal(readiness?.focused,true,'fixture window did not receive native focus before native input: '+JSON.stringify(readiness));
 assert.equal(readiness?.documentHasFocus,true,'fixture document did not receive focus before native input: '+JSON.stringify(readiness));
 const {configureSpellSlots}=require(path.join(root,'dist/combat/spell-slots'));
 await js('('+configureSpellSlots.toString()+')(true,"en")');
 const wait=async source=>{for(let i=0;i<80;i++){if(await js(source))return;await new Promise(r=>setTimeout(r,25))}throw Error('Not ready: '+source)};
 await wait('document.querySelector("[data-ff-spell-slot]")');
 const assertAppearance=async(selector,size)=>{
  const circles=await js('Array.from(document.querySelectorAll('+JSON.stringify(selector)+')).map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,shadow:getComputedStyle(node).boxShadow,background:getComputedStyle(node).backgroundColor,available:node.dataset.ffSpellAvailable}))');
  assert.equal(circles.length,4);
  for(const circle of circles){assert.equal(circle.width,size);assert.equal(circle.height,size);assert.match(circle.shadow,/inset/);assert.match(circle.shadow,/rgba?\(/);assert.notEqual(circle.shadow,'none')}
  assert.equal(circles[0].available,'true');assert.equal(circles[2].available,'false');assert.notEqual(circles[0].background,circles[2].background);assert.match(circles[0].background,/255, 191, 0/);assert.match(circles[2].background,/rgba\(0, 0, 0, 0\)/);
 };
 assert.equal(await js('getComputedStyle(document.body).backgroundColor'),'rgb(8, 8, 8)');
 await assertAppearance('#sidebar [data-ff-spell-slot]',12);
 await js('mountBook()');await wait('document.querySelectorAll("#book [data-ff-spell-slot]").length===4');await assertAppearance('#book [data-ff-spell-slot]',16);await js('document.querySelector("#book button").click()');
 // Matching callback text is insufficient when it belongs to another character owner.
 await js('window.originalOpenFiber=document.querySelector("#open").__reactFiber$fixture;document.querySelector("#open").__reactFiber$fixture={return:{memoizedProps:{character:{id:123}},return:null}};document.querySelectorAll("#sidebar [data-ff-spell-slot]")[2].click()');
 assert.equal(await js('opens'),0);assert.equal(await js('calls.length'),0);
 await js('document.querySelector("#open").__reactFiber$fixture=originalOpenFiber');
 assert.equal(await js('document.querySelector("#infinity").hasAttribute("data-ff-spell-slot")'),false);
 await js('document.querySelectorAll("[data-ff-spell-slot]")[2].click()');
 await wait('calls.length===1');
 assert.deepEqual(await js('calls[0]'),{characterId:123,campaignId:'fixture',level:1,maxSlots:4,usedSlots:1});
 assert.equal(await js('cacheInvalidations'),1);assert.equal(await js('toasts'),1);
 assert.equal(await js('document.querySelector("#draft").value'),'preserve this draft');
 await wait('!document.querySelector("#book")');await new Promise(r=>setTimeout(r,350));assert.equal(await js('lastDialog.getAttribute("style")'),null);assert.equal(await js('lastOverlay.getAttribute("style")'),null);
 for(const [index,key] of ['Enter','Space'].entries()){
  await js('document.querySelectorAll("#sidebar [data-ff-spell-slot]")[3].focus()');
  assert.equal(await js('document.activeElement===document.querySelectorAll("#sidebar [data-ff-spell-slot]")[3]'),true);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:key});
  win.webContents.sendInputEvent({type:'char',keyCode:key==='Space'?' ':key});
  win.webContents.sendInputEvent({type:'keyDown',keyCode:key,modifiers:['isautorepeat']});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:key});
  await wait('calls.length==='+String(index+2));await wait('!document.querySelector("#book")');await new Promise(r=>setTimeout(r,350));
  assert.equal(await js('calls.length'),index+2,'one native callback per keyboard activation including repeat');
 }
 assert.deepEqual(await js('keydowns'),[{key:'Enter',repeat:false},{key:'Enter',repeat:true},{key:' ',repeat:false},{key:' ',repeat:true}]);
 assert.deepEqual(await js('calls.slice(1)'),[{characterId:123,campaignId:'fixture',level:1,maxSlots:4,usedSlots:1},{characterId:123,campaignId:'fixture',level:1,maxSlots:4,usedSlots:1}]);
 // Available slots use the same fresh native callback and increase used_slots.
 await js('document.querySelectorAll("#sidebar [data-ff-spell-slot]")[0].click()');await wait('calls.length===4');await wait('!document.querySelector("#book")');await new Promise(r=>setTimeout(r,350));
 assert.deepEqual(await js('calls[3]'),{characterId:123,campaignId:'fixture',level:1,maxSlots:4,usedSlots:3});
 for(const override of [{viewOnly:true},{characterId:999},{campaignId:'other'},{pending:true},{max:2},{phase:'template'}]){
  await js('Object.assign(config,{characterId:123,campaignId:"fixture",phase:"campaign",viewOnly:false,pending:false,used:2,max:4},'+JSON.stringify(override)+');document.querySelectorAll("[data-ff-spell-slot]")[2].click()');
  try { await wait('!document.querySelector("[aria-busy=true]")'); }
  catch(error){error.message+=' guard='+JSON.stringify(override)+' state='+JSON.stringify(await js('({calls:calls.length,slots:document.querySelectorAll("#book button.rounded-full").length,dialog:!!document.querySelector("#book")})'));throw error}
  assert.equal(await js('calls.length'),4,JSON.stringify(override));
  assert.equal(await js('cacheInvalidations'),4,JSON.stringify(override));assert.equal(await js('toasts'),4,JSON.stringify(override));
  if(override.max===2)assert.equal(await js('document.querySelector("#book")'),null,'ready native bounds mismatch refuses and closes owned book without waiting for mount deadline');
  await js('document.querySelector("#book button")?.click()');await new Promise(r=>setTimeout(r,100));
 }
 await js('Object.assign(config,{characterId:123,campaignId:"fixture",phase:"campaign",viewOnly:false,pending:false,used:2,max:4});const existing=document.createElement("div");existing.setAttribute("role","dialog");existing.id="existing";document.body.append(existing);document.querySelectorAll("[data-ff-spell-slot]")[2].click()');
 assert.equal(await js('calls.length'),4);assert.equal(await js('document.querySelector("#existing").isConnected'),true);
 await js('document.querySelector("#existing").remove();('+configureSpellSlots.toString()+')(false,"en")');
 assert.equal(await js('document.querySelectorAll("[data-ff-spell-slot]").length'),0);
 console.log('Spell slots native payload/cache/permission/identity/busy/bounds/lifecycle PASS');clearTimeout(timer);win.destroy();app.exit(0);
})().catch(error=>{console.error(error);clearTimeout(timer);win?.destroy();app.exit(1)});
