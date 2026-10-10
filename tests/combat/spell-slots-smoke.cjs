// Native execution belongs to the coordinator. This fixture never calls an online API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const html = `<!doctype html><html><body><aside id="sidebar"><div class="container-[size]"><div id="rows"></div><button id="open" type="button">Open Spellbook</button></div></aside><textarea id="draft">preserve this draft</textarea><script>
window.calls=[];window.opens=0;window.closes=0;window.cacheInvalidations=0;window.toasts=0;
window.config={characterId:123,campaignId:'fixture',phase:'campaign',viewOnly:false,pending:false,used:2,max:4};
window.mountSidebar=()=>{
 const rows=document.querySelector('#rows');rows.innerHTML='<div class="flex flex-col items-center"><span>Level 1</span><div class="flex gap-1 mt-1" id="circles"></div></div><div><span>Cantrips</span><svg id="infinity"></svg></div>';
 const owner={memoizedProps:{character:{id:123}},return:null};
 const row=rows.firstChild;row.__reactFiber$fixture={key:'1',memoizedProps:{},return:owner};
 for(let i=0;i<4;i++){const node=document.createElement('div');node.className='w-3 h-3 rounded-full border '+(i<2?'bg-primary/70 border-primary':'bg-muted border-muted-foreground/30');node.__reactFiber$fixture={memoizedProps:{className:node.className},return:row.__reactFiber$fixture};document.querySelector('#circles').append(node)}
 document.querySelector('#open').__reactProps$fixture={onClick:()=>{const options={defaultTab:"spells"};window.opens++;window.mountBook(options)}};
};
window.mountBook=()=>{
 const c=window.config;const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.id='book';dialog.setAttribute('data-state','open');const portal={tag:4,return:null};const overlay=document.createElement('div');overlay.className='fixed inset-0';overlay.setAttribute('data-state','open');overlay.__reactFiber$fixture={return:portal};dialog.__reactFiber$fixture={return:portal};
 const close=document.createElement('button');close.type='button';close.innerHTML='<svg class="lucide-x"></svg>';close.setAttribute('aria-label','Close');close.onclick=()=>{window.closes++;dialog.remove();overlay.remove()};
 close.__reactProps$fixture={onClick:close.onclick};close.__reactFiber$fixture={memoizedProps:close.__reactProps$fixture,return:{memoizedProps:{preventClose:false,onClose:close.onclick},return:portal}};dialog.append(close);
 const observer={options:{mutationFn:async function({characterId,campaignId,level,maxSlots,usedSlots}){return {characterId,campaignId,level,maxSlots,usedSlots}},onSuccess(){window.cacheInvalidations++}},getCurrentResult(){return {isPending:window.config.pending,status:window.config.pending?'pending':'idle'}}};
 const owner={memoizedProps:{characterId:c.characterId,campaignId:c.campaignId,phase:c.phase,viewOnly:c.viewOnly},memoizedState:{memoizedState:observer,next:{memoizedState:{options:{queryKey:['spellSlots',c.characterId]},getCurrentResult(){return {status:'success',isPending:false,isLoading:false,isFetching:false,data:[{level:1,max_slots:c.max,used_slots:c.used}]}}},next:null}},return:portal};
 const row=document.createElement('div');row.className='flex flex-col gap-1';row.__reactFiber$fixture={key:'1',memoizedProps:{},return:owner};row.innerHTML='<p>Level 1</p><div class="flex flex-row"></div>';dialog.append(row);
 for(let i=0;i<c.max;i++){
  const node=document.createElement('button');node.type='button';node.className='h-4 w-4 rounded-full '+(i<c.max-c.used?'bg-primary':'bg-gray-800');node.disabled=c.viewOnly||c.phase!=='campaign';
  const nativeCallback=()=>{const usedSlots=i<c.max-c.used?c.used+1:c.used-1;window.calls.push({characterId:c.characterId,campaignId:c.campaignId,level:1,maxSlots:c.max,usedSlots});observer.options.onSuccess();window.toasts++};
  node.__reactProps$fixture={onClick:nativeCallback,disabled:node.disabled,className:node.className};node.__reactFiber$fixture={memoizedProps:node.__reactProps$fixture,return:row.__reactFiber$fixture};row.lastChild.append(node);
 }
 document.body.append(overlay,dialog);
};window.mountSidebar();
</script></body></html>`;
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
const output = require('esbuild').transformSync(fs.readFileSync(path.join(root,'src/combat/spell-slots.ts'),'utf8'), {loader:'ts',target:'es2022',format:'cjs'});
new Function(output.code);
if(process.argv.includes('--syntax')){console.log('Spell slots serialized fixture syntax PASS');process.exit(0)}
const {app,BrowserWindow,session}=require('electron');
if(!process.env.FABLES_TEST_PROFILE_DIR)throw Error('Use central fixture runner/private profile');
app.setPath('userData',process.env.FABLES_TEST_PROFILE_DIR);
let win;const timer=setTimeout(()=>{console.error('Spell slots fixture timed out');win?.destroy();app.exit(1)},20000);
app.on('window-all-closed',()=>{});
(async()=>{
 await app.whenReady();const site=session.fromPartition('spell-slots-'+process.pid);site.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
 win=new BrowserWindow({show:false,width:900,height:800,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 await win.loadURL('https://fixture.invalid/campaign/fixture/play');
 const js=source=>win.webContents.executeJavaScript(source);
 const {configureSpellSlots}=require(path.join(root,'dist/combat/spell-slots'));
 await js('('+configureSpellSlots.toString()+')(true,"en")');
 const wait=async source=>{for(let i=0;i<80;i++){if(await js(source))return;await new Promise(r=>setTimeout(r,25))}throw Error('Not ready: '+source)};
 await wait('document.querySelector("[data-ff-spell-slot]")');
 assert.equal(await js('document.querySelector("#infinity").hasAttribute("data-ff-spell-slot")'),false);
 await js('document.querySelectorAll("[data-ff-spell-slot]")[2].click()');
 await wait('calls.length===1');
 assert.deepEqual(await js('calls[0]'),{characterId:123,campaignId:'fixture',level:1,maxSlots:4,usedSlots:1});
 assert.equal(await js('cacheInvalidations'),1);assert.equal(await js('toasts'),1);
 assert.equal(await js('document.querySelector("#draft").value'),'preserve this draft');
 await wait('!document.querySelector("#book")');
 for(const override of [{viewOnly:true},{characterId:999},{campaignId:'other'},{pending:true},{max:2},{phase:'template'}]){
  await js('Object.assign(config,{characterId:123,campaignId:"fixture",phase:"campaign",viewOnly:false,pending:false,used:2,max:4},'+JSON.stringify(override)+');document.querySelectorAll("[data-ff-spell-slot]")[2].click()');
  await wait('!document.querySelector("[aria-busy=true]")');await js('document.querySelector("#book button")?.click()');await new Promise(r=>setTimeout(r,100));assert.equal(await js('calls.length'),1,JSON.stringify(override));
 }
 await js('Object.assign(config,{characterId:123,campaignId:"fixture",phase:"campaign",viewOnly:false,pending:false,used:2,max:4});const existing=document.createElement("div");existing.setAttribute("role","dialog");existing.id="existing";document.body.append(existing);document.querySelectorAll("[data-ff-spell-slot]")[2].click()');
 assert.equal(await js('calls.length'),1);assert.equal(await js('document.querySelector("#existing").isConnected'),true);
 await js('document.querySelector("#existing").remove();('+configureSpellSlots.toString()+')(false,"en")');
 assert.equal(await js('document.querySelectorAll("[data-ff-spell-slot]").length'),0);
 console.log('Spell slots native payload/cache/permission/identity/busy/bounds/lifecycle PASS');clearTimeout(timer);win.destroy();app.exit(0);
})().catch(error=>{console.error(error);clearTimeout(timer);win?.destroy();app.exit(1)});
