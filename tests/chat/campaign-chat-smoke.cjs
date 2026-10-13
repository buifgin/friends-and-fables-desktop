const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const campaign = '01a0d854-78d5-7064-ae41-f63d561c8e01';
const modulePath = path.join(appRoot, 'dist/chat/campaign-chat.js');
const configure = fs.existsSync(modulePath) ? require(modulePath).configureCampaignChatPages.toString() : 'function configureCampaignChatPages() {}';
// The append operation reproduces the captured native maxPages=3 updater.
const fixture = `
const campaign=${JSON.stringify(campaign)};
const event=id=>({id,role:id%3===0?'dm':id%3===1?'player':'roll',message:'native '+id});
const server=(start,end)=>({data:Array.from({length:end-start+1},(_,i)=>event(start+i)),hasPreviousPage:true,hasNextPage:false,previousCursor:start,nextCursor:end,direction:'backward',nativeMetadata:{retained:true}});
const listeners=new Set();let writes=0;
const query={options:{maxPages:3},queryKey:['events',campaign],state:{data:{pages:[server(100,114)],pageParams:[{cursor:115,direction:'backward'}]},dataUpdatedAt:123,fetchStatus:'idle',status:'success'},
 setData(data,options){writes++;this.state={...this.state,data};if(options.updatedAt!==123||options.manual!==true)throw Error('Cache timestamps/manual contract');for(const listener of [...listeners])listener({});},setState(state){Object.assign(this.state,state)}};
const observerForQuery=()=>({active:0,options:{maxPages:3,queryKey:query.queryKey},getCurrentQuery:()=>query,subscribe(listener){this.active++;listeners.add(listener);return()=>{this.active--;listeners.delete(listener)}}});
const observer=observerForQuery(),duplicate=observerForQuery();
const card=document.createElement('div');card.id='event-container-100';card.__reactFiber$fixture={memoizedState:{memoizedState:observer,next:{memoizedState:duplicate,next:null}},return:null};document.body.appendChild(card);
const ids=()=>query.state.data.pages.flatMap(page=>page.data.map(e=>e.id));
const append=id=>{const old=query.state.data;query.setData({...old,pages:[...old.pages,{data:[event(id)],previousCursor:100,nextCursor:undefined,hasPreviousPage:true,hasNextPage:false}].slice(-3),pageParams:[...old.pageParams,null].slice(-3)},{updatedAt:123,manual:true})};
(${configure})(true);
if(listeners.size!==1||observer.active+duplicate.active!==1)throw Error('Same query subscribed through multiple observers');
const remounted=observerForQuery();card.__reactFiber$fixture.memoizedState={memoizedState:remounted,next:null};window.dispatchEvent(new Event('click'));
if(observer.active!==0||duplicate.active!==0||remounted.active!==1||listeners.size!==1)throw Error('Remount retained stale observer');
card.__reactFiber$fixture.memoizedState=null;window.dispatchEvent(new Event('click'));if(listeners.size!==0)throw Error('Unmount retained observer');
card.__reactFiber$fixture.memoizedState={memoizedState:remounted,next:null};window.dispatchEvent(new Event('click'));
append(115);append(116);append(117);
if(ids().join(',')!==Array.from({length:18},(_,i)=>100+i).join(','))throw Error('Third native append evicted original messages: '+ids());
const original=query.state.data.pages[0],originalEvent=original.data[0];
for(let id=118;id<=129;id++)append(id);
if(query.state.data.pages.length!==2||query.state.data.pages[1].data.length!==15)throw Error('Incremental pages were not packed to native limit');
if(query.state.data.pages[0]!==original||query.state.data.pages[0].data[0]!==originalEvent)throw Error('Server page/event identity changed');
append(130);
if(query.state.data.pages.length!==3||query.state.data.pages[2].data.length!==1)throw Error('Full incremental page overflow');
if(query.state.data.pages[1].previousCursor!==115||query.state.data.pages[1].nextCursor!==129||query.state.data.pages[1].hasNextPage!==true)throw Error('Intermediate cursor boundaries');
if(query.state.data.pages[2].previousCursor!==130||query.state.data.pages[2].hasNextPage!==false)throw Error('Tail cursor boundaries');
append(131);
if(ids().includes(100)||ids().length!==17||query.state.data.pages.length!==2)throw Error('Native bounded eviction did not preserve packed tail');
const edited={...query.state.data.pages[1].data[1],message:'edited'};
query.setData({...query.state.data,pages:query.state.data.pages.map((p,i)=>i===1?{...p,data:[edited]}:p)},{updatedAt:123,manual:true});
append(132);
if(ids().includes(130)||!query.state.data.pages.flatMap(p=>p.data).includes(edited))throw Error('Deletion/edit resurrected or lost');
const oldPage=server(85,99),param={cursor:100,direction:'backward'};
query.setData({pages:[oldPage,...query.state.data.pages].slice(0,3),pageParams:[param,...query.state.data.pageParams].slice(0,3)},{updatedAt:123,manual:true});
if(query.state.data.pages[0]!==oldPage||query.state.data.pageParams[0]!==param)throw Error('Genuine backward pagination modified');
// Synthetic native backward truncation: preserve actual metadata, even when
// a genuine formerly-final page cannot advertise an evicted incremental tail.
const finalServer=server(100,114),olderServer=server(85,99),oldestServer=server(70,84);
query.setData({pages:[olderServer,finalServer,{data:[event(115)],hasPreviousPage:true,hasNextPage:false,previousCursor:100}],pageParams:[{cursor:100,direction:'backward'},{cursor:115,direction:'backward'},null]},{updatedAt:123,manual:true});
query.setData({pages:[oldestServer,...query.state.data.pages].slice(0,3),pageParams:[{cursor:85,direction:'backward'},...query.state.data.pageParams].slice(0,3)},{updatedAt:123,manual:true});
if(ids().includes(115)||query.state.data.pages[2]!==finalServer||query.state.data.pages[2].hasNextPage!==false)throw Error('Genuine backward truncation metadata was guessed/rewritten');
const clean={pages:[server(120,134)],pageParams:[{cursor:135,direction:'backward'}]};query.setData(clean,{updatedAt:123,manual:true});
if(query.state.data!==clean)throw Error('Refetch was merged with stale history');
const before=writes;(${configure})(true);if(writes!==before||listeners.size!==1)throw Error('Repeated configure rewrote cache/subscribed twice');
const unsupported={pages:[{...server(120,134),data:[event(134),event(120)]}],pageParams:[null]};query.setData(unsupported,{updatedAt:123,manual:true});if(query.state.data!==unsupported)throw Error('Unsupported descending shape modified');
query.setData(clean,{updatedAt:123,manual:true});
if(card!==document.querySelectorAll('[id^=\"event-container-\"]')[0])throw Error('Native card identity modified');
(${configure})(false);if(listeners.size!==0)throw Error('Disable did not unsubscribe');
append(135);append(136);append(137);if(ids().length!==3)throw Error('Disabled adapter still active');
(${configure})(true);history.replaceState({},'', '/settings');window.dispatchEvent(new Event('popstate'));if(listeners.size!==0)throw Error('Route did not unsubscribe');
(${configure})(false);
`;
async function main() {
 if (!process.versions.electron) {
  const listeners = new Map();
  const document = {body:{appendChild(e){document.elements.push(e)}},elements:[],documentElement:{},createElement:()=>({}),querySelectorAll:()=>document.elements};
  const context = {document,location:{protocol:'https:',hostname:'play.fables.gg',pathname:`/${campaign}/play`},console,queueMicrotask,setInterval:()=>1,clearInterval(){},Event:class{constructor(type){this.type=type}},MutationObserver:class{observe(){}disconnect(){}},window:{addEventListener(type,fn){listeners.set(type,fn)},removeEventListener(type){listeners.delete(type)},dispatchEvent(event){listeners.get(event.type)?.()}},history:{replaceState(_a,_b,url){context.location.pathname=url}}};
  vm.runInNewContext(fixture,context);console.log('Campaign chat cache fixture passed (Node simulated DOM).');return;
 }
 const {app,BrowserWindow,session}=require('electron');const os=require('node:os');let window,profile,passed=false;
 const timer=setTimeout(()=>app.exit(1),30000);
 try{profile=fs.mkdtempSync(path.join(os.tmpdir(),'ff-chat-'));app.setPath('userData',profile);await app.whenReady();const site=session.fromPartition('chat-pages');site.protocol.handle('https',()=>new Response('<!doctype html><body></body>',{headers:{'Content-Type':'text/html'}}));window=new BrowserWindow({show:false,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});await window.loadURL(`https://play.fables.gg/${campaign}/play`);assert.equal(await window.webContents.executeJavaScript(`(()=>{${fixture};return true})()`),true);console.log('Campaign chat native cache fixture passed.');passed=true;}
 finally{clearTimeout(timer);window?.destroy();if(profile)fs.rmSync(profile,{recursive:true,force:true});app.exit(passed?0:1);}
}
main().catch(error=>{console.error(error);if(process.versions.electron)require('electron').app.exit(1);else process.exitCode=1});
