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
// JSON-shaped native replaceEqualDeep: retain equal subtrees, copy changed
// arrays/objects (including own undefined metadata keys).
const replaceEqualDeep=(a,b)=>{if(a===b)return a;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return b;const keys=Object.keys(b),copy=Array.isArray(b)?[]:{};let equal=Object.keys(a).length===keys.length;for(const key of keys){copy[key]=replaceEqualDeep(a[key],b[key]);if(copy[key]!==a[key]||!Object.hasOwn(a,key))equal=false;}return equal?a:copy};
const jobs=[];let batch=false;
const flush=()=>{let runs=0;while(jobs.length){if(++runs>100)throw Error('Native batched notification loop exceeded100');jobs.shift()();}};
const query={options:{maxPages:3},queryKey:['events',campaign],state:{data:{pages:[server(100,114)],pageParams:[{cursor:115,direction:'backward'}]},dataUpdatedAt:123,fetchStatus:'idle',status:'success'},
 setData(data,options){this.latestArgs=[...arguments];writes++;this.state={...this.state,data:replaceEqualDeep(this.state.data,data)};if(options.updatedAt!==123||options.manual!==true)throw Error('Cache timestamps/manual contract');for(const listener of [...listeners]){if(batch)jobs.push(()=>listener({}));else listener({});}if(batch)jobs.push(()=>window.dispatchEvent(new Event('click')));return this.state.data;},setState(state){Object.assign(this.state,state)}};
const nativeSetData=query.setData,nativeDescriptor=Object.getOwnPropertyDescriptor(query,'setData');
const observerForQuery=()=>({active:0,options:{maxPages:3,queryKey:query.queryKey},getCurrentQuery:()=>query,subscribe(listener){this.active++;listeners.add(listener);return()=>{this.active--;listeners.delete(listener)}}});
const observer=observerForQuery(),duplicate=observerForQuery();
const card=document.createElement('div');card.id='event-container-100';card.__reactFiber$fixture={memoizedState:{memoizedState:observer,next:{memoizedState:duplicate,next:null}},return:null};document.body.appendChild(card);
const ids=()=>query.state.data.pages.flatMap(page=>page.data.map(e=>e.id));
const append=id=>{
 const old=query.state.data,temporary={data:[{id:null,isOptimistic:true,message:'native pending'}],previousCursor:100,nextCursor:undefined,hasPreviousPage:true,hasNextPage:false};
 query.setData({...old,pages:[...old.pages,temporary],pageParams:[...old.pageParams,null]},{updatedAt:123,manual:true});
 const pending=query.state.data.pages.at(-1);
 if(pending.data[0].id!==null||pending.data[0].isOptimistic!==true||pending.data[0].message!==temporary.data[0].message||pending.data.length!==1)throw Error('Optimistic tail lost or packed with confirmed rows');
 const current=query.state.data,confirmed=current.pages.filter(page=>!page.data.some(row=>row.isOptimistic===true)).map(page=>({...page}));
 const incomingPages=[...confirmed,{data:[event(id)],previousCursor:100,nextCursor:undefined,hasPreviousPage:true,hasNextPage:false}].slice(-3),incomingParams=[...current.pageParams.slice(0,confirmed.length),null].slice(-3);
 incomingParams[0]={cursor:incomingPages[0].previousCursor,direction:'backward'};
 query.setData({...current,pages:incomingPages,pageParams:incomingParams},{updatedAt:123,manual:true});
};
(${configure})(true);
if(listeners.size!==1||observer.active+duplicate.active!==1)throw Error('Same query subscribed through multiple observers');
const remounted=observerForQuery();card.__reactFiber$fixture.memoizedState={memoizedState:remounted,next:null};window.dispatchEvent(new Event('click'));
if(observer.active!==0||duplicate.active!==0||remounted.active!==1||listeners.size!==1)throw Error('Remount retained stale observer');
card.__reactFiber$fixture.memoizedState=null;window.dispatchEvent(new Event('click'));if(listeners.size!==0)throw Error('Unmount retained observer');
card.__reactFiber$fixture.memoizedState={memoizedState:remounted,next:null};window.dispatchEvent(new Event('click'));
// Scoped duplicate reproduction: saved actual website insertion helper, copied
// verbatim at author time (no website/native entry import). Source native-chat-60.js
// line1, zero-based characters 361306..362439, SHA256 320ae5aff309fe8d8fa58d85f3e74f2dedba2e7be003c9502aa2b33e39f45f5c.
// Helper SHA256 25bf30f20706840325adbd83caab2afd61934753b9c3f93b8640ced45c91b897. Its replacement branch assigns the SAME newEvent
// to every null row. User19Oct append pages have params null/null and inherited
// previousCursor109198198; captured duplicate639 appears in both append pages.
{
 const a={default:{warn(){}}},t={CAMPAIGN_EVENTS_PAGE_SIZE:15},s={eventsQueries:{campaign:id=>['events',id]}};
 let sameReferenceInput=false;
 const queryClient={setQueryData(key,update){
  if(key[0]!=='events'||key[1]!==campaign)throw Error('Native insertion targeted wrong query');
  const incoming=update(query.state.data),copies=incoming.pages.flatMap(page=>page.data).filter(row=>row.id===109241639);
  if(copies.length===2)sameReferenceInput=sameReferenceInput||copies[0]===copies[1];
  return query.setData(incoming,{updatedAt:123,manual:true});
 }};
 const insertEventIntoQueryData=({queryClient:e,campaignId:r,newEvent:i})=>{i&&(!i.monster&&"monster_instance"in i&&i.monster_instance&&(i.monster=i.monster_instance),e.setQueryData(s.eventsQueries.campaign(r),e=>{if(!e?.pages?.length)return{pages:[{data:[i]}],pageParams:[{cursor:void 0,direction:"backward"}]};let s=!1,n=e.pages.map(e=>{let a=e.data.map(e=>null!==i.id&&null!==e.id&&e.id===i.id||null!==i.id&&null===e.id||null!==i.id&&null===e.id&&e.character_id===i.character_id&&"talk"===e.command_used&&"talk"===i.command_used&&"Sending audio..."===e.content?(s=!0,i):e);return{...e,data:a}});if(!s){let e=n[n.length-1];if(!e)return{pages:[{data:[i]}],pageParams:[{cursor:void 0,direction:"backward"}]};e.data||(e.data=[]),e.data.some(e=>null!==i.id&&e.id===i.id)?a.default.warn("Event already exists in last page, skipping",{functionName:"insertEventIntoQueryData",campaignId:r,newEventId:i.id}):e.data.length>=t.CAMPAIGN_EVENTS_PAGE_SIZE?n.push({data:[i]}):e.data.push(i)}if(n.length>3){let e=n.length-3;n.splice(0,e)}let l=e.pageParams.slice(-n.length);for(;l.length<n.length;)l.unshift({cursor:void 0,direction:"backward"});return{pages:n,pageParams:l}}))};
 const capturedIDs=[109086365,109086390,109086500,109086510,109086523,109086528,109086539,109086549,109086560,109086572,109086579,109087306,109087309,109087319,109198197];
 const capturedServer={data:capturedIDs.map(event),hasPreviousPage:true,hasNextPage:false,previousCursor:capturedIDs[0],nextCursor:capturedIDs.at(-1),direction:'backward',nativeMetadata:{retained:true}};
 const capturedParam={cursor:109198198,direction:'backward'};
 query.setData({pages:[capturedServer],pageParams:[capturedParam]},{updatedAt:123,manual:true});
 const retainedServer=query.state.data.pages[0],retainedParam=query.state.data.pageParams[0];
 // Two actual onMutate-style appends before a confirmation. This is a bounded
 // candidate path, not proof that the user's overlapping sequence was identical.
 for(const message of ['first pending','second pending']){
  const old=query.state.data,tail=old.pages.at(-1);if(tail.hasNextPage)throw Error('Native pending append unexpectedly blocked');
  const temporary={data:[{id:null,isOptimistic:true,message}],nextCursor:undefined,previousCursor:109198198,hasNextPage:false,hasPreviousPage:true};
  query.setData({pages:[...old.pages,temporary],pageParams:[...old.pageParams,null]},{updatedAt:123,manual:true});
 }
 const confirmed=event(109241639),later=event(109241641);
 insertEventIntoQueryData({queryClient,campaignId:campaign,newEvent:confirmed});
 if(!sameReferenceInput)throw Error('Saved native helper did not produce proven identical-reference duplicate input');
 insertEventIntoQueryData({queryClient,campaignId:campaign,newEvent:later});
 const actual=ids();console.log('Identical append duplicate diagnostic: '+JSON.stringify({sameReferenceInput,pages:query.state.data.pages.map(page=>page.data.map(row=>row.id)),unique:new Set(actual).size,rows:actual.length}));
 if(actual.filter(id=>id===109241639).length!==1||actual.filter(id=>id===109241641).length!==1)throw Error('Identical confirmed event duplicated across adjacent native append pages: '+actual);
 if(query.state.data.pages[0].data!==retainedServer.data||query.state.data.pageParams[0]!==retainedParam)throw Error('Duplicate correction changed genuine server page/parameter identity');
 if(actual.includes(109241640))throw Error('Duplicate correction invented uncaptured event640');
 insertEventIntoQueryData({queryClient,campaignId:campaign,newEvent:later});
 if(ids().filter(id=>id===109241641).length!==1)throw Error('Repeated native confirmation duplicated confirmed event');
 query.setData({pages:[server(100,114)],pageParams:[{cursor:115,direction:'backward'}]},{updatedAt:123,manual:true});
}
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
if(!ids().includes(100)||ids().length!==32||query.state.data.pages.length!==3)throw Error('Premature eviction at32rowsbelow45capacity');
const edited={...query.state.data.pages[2].data[1],message:'edited'};
query.setData({...query.state.data,pages:query.state.data.pages.map((p,i)=>i===2?{...p,data:[edited]}:p)},{updatedAt:123,manual:true});
append(132);
if(ids().includes(130)||!query.state.data.pages.flatMap(p=>p.data).some(row=>row.id===edited.id&&row.message===edited.message))throw Error('Deletion/edit resurrected or lost');
const oldPage=server(85,99),param={cursor:100,direction:'backward'};
query.setData({pages:[oldPage,...query.state.data.pages].slice(0,3),pageParams:[param,...query.state.data.pageParams].slice(0,3)},{updatedAt:123,manual:true});
if(query.state.data.pages[0].data[0].id!==85||query.state.data.pageParams[0].cursor!==param.cursor)throw Error('Genuine backward pagination modified');
// Synthetic native backward truncation: preserve actual metadata, even when
// a genuine formerly-final page cannot advertise an evicted incremental tail.
const finalServer=server(100,114),olderServer=server(85,99),oldestServer=server(70,84);
query.setData({pages:[olderServer,finalServer,{data:[event(115)],hasPreviousPage:true,hasNextPage:false,previousCursor:100}],pageParams:[{cursor:100,direction:'backward'},{cursor:115,direction:'backward'},null]},{updatedAt:123,manual:true});
query.setData({pages:[oldestServer,...query.state.data.pages].slice(0,3),pageParams:[{cursor:85,direction:'backward'},...query.state.data.pageParams].slice(0,3)},{updatedAt:123,manual:true});
if(ids().includes(115)||query.state.data.pages[2].data[0].id!==100||query.state.data.pages[2].hasNextPage!==true||query.state.data.pages[2].nextCursor!==114)throw Error('Evicted newer events have no proven forwardcursor');
const clean={pages:[server(120,134)],pageParams:[{cursor:135,direction:'backward'}]};query.setData(clean,{updatedAt:123,manual:true});
if(query.state.data.pages[0].data.map(e=>e.id).join(',')!==clean.pages[0].data.map(e=>e.id).join(',')||query.state.data.pages.length!==1)throw Error('Refetch was merged with stale history');
batch=true;const batchBefore=writes;append(135);flush();
if(writes-batchBefore>2)throw Error('Unchanged append repeatedly normalized');
const batchStable=writes;for(let i=0;i<30;i++){window.dispatchEvent(new Event('click'));for(const listener of listeners)jobs.push(()=>listener({}));flush();}
if(writes!==batchStable)throw Error('Structural-sharing/batched rescans rewrote unchanged content');
const changedRow={...query.state.data.pages.at(-1).data[0],message:'edited under batched sharing'};
query.setData({...query.state.data,pages:query.state.data.pages.map((p,i)=>i===query.state.data.pages.length-1?{...p,data:[changedRow]}:p)},{updatedAt:123,manual:true});flush();
if(query.state.data.pages.at(-1).data[0].message!==changedRow.message)throw Error('Batched edit lost');
// A native effect can replay its same unnormalized update in a later batch.
// Diagnose replays separately from an unsolicited notification/render loop.
const replay={pages:[server(120,134),{data:[event(135)],hasPreviousPage:true,hasNextPage:false,previousCursor:120,nextCursor:undefined}],pageParams:[{cursor:135,direction:'backward'},null]};
query.setData(replay,{updatedAt:123,manual:true});flush();const replayBefore=writes;
for(let i=0;i<5;i++){query.setData(replay,{updatedAt:123,manual:true});flush();}
if(writes-replayBefore>10)throw Error('Native replay produced more than one correction per actual update');
console.log('Native replay diagnostic: '+(writes-replayBefore-5)+' corrections for5 explicit native updates.');
batch=false;query.setData(clean,{updatedAt:123,manual:true});
const capacity={pages:[server(100,114)],pageParams:[{cursor:115,direction:'backward'}]};query.setData(capacity,{updatedAt:123,manual:true});
for(let id=115;id<=144;id++)append(id);if(ids().length!==45||query.state.data.pages.length!==3||!ids().includes(100))throw Error('Native45rowcapacitynotused');
append(145);if(ids().length!==31||ids().includes(100)||!ids().includes(145))throw Error('Full45capacitydidnotboundeviction');
query.setData(clean,{updatedAt:123,manual:true});
const nativeOptions={updatedAt:123,manual:true},extraArgument={native:true};
const result=query.setData(clean,nativeOptions,extraArgument);if(result!==query.state.data||query.latestArgs[1]!==nativeOptions||query.latestArgs[2]!==extraArgument)throw Error('Setterreturn/options/extraargumentslost');
const foreign={state:{data:clean}},foreignResult=query.setData.call(foreign,clean,nativeOptions,extraArgument);if(foreignResult!==foreign.state.data||foreign.latestArgs[2]!==extraArgument)throw Error('Foreignthiscontractlost');
const before=writes;(${configure})(true);if(writes!==before||listeners.size!==1)throw Error('Repeated configure rewrote cache/subscribed twice');
const unknownTemporary={pages:[{data:[{id:null,isOptimistic:false,message:'unsupported pending'}],hasPreviousPage:true,hasNextPage:false}],pageParams:[null]};query.setData(unknownTemporary,{updatedAt:123,manual:true});if(query.state.data.pages[0].data[0].message!=='unsupported pending'||query.state.data.pages[0].data[0].id!==null)throw Error('Unsupported temporaryrowaltered');
const unsupported={pages:[{...server(120,134),data:[event(134),event(120)]}],pageParams:[null]};query.setData(unsupported,{updatedAt:123,manual:true});if(query.state.data.pages[0].data[0].id!==134||query.state.data.pages[0].data[1].id!==120)throw Error('Unsupported descending shape modified');
query.setData(clean,{updatedAt:123,manual:true});
if(card!==document.querySelectorAll('[id^=\"event-container-\"]')[0])throw Error('Native card identity modified');
(${configure})(false);if(listeners.size!==0)throw Error('Disable did not unsubscribe');
if(query.setData!==nativeSetData||Object.getOwnPropertyDescriptor(query,'setData').writable!==nativeDescriptor.writable)throw Error('Native setterdescriptor notrestored');
append(135);append(136);append(137);if(ids().length!==3)throw Error('Disabled adapter still active');
(${configure})(true);history.replaceState({},'', '/settings');window.dispatchEvent(new Event('popstate'));if(listeners.size!==0)throw Error('Route did not unsubscribe');
(${configure})(false);
history.replaceState({},'', '/'+campaign+'/play');(${configure})(true);const replacement=function(...args){return Reflect.apply(nativeSetData,this,args)};query.setData=replacement;(${configure})(false);if(query.setData!==replacement)throw Error('Cleanupoverwroteanotherwrapper');query.setData=nativeSetData;
const prototype={setData:nativeSetData};delete query.setData;Object.setPrototypeOf(query,prototype);(${configure})(true);if(!Object.hasOwn(query,'setData'))throw Error('Inheritedsetterwasnotintercepted');(${configure})(false);if(Object.hasOwn(query,'setData')||query.setData!==nativeSetData)throw Error('Inheriteddescriptorwasnotrestored');
Object.preventExtensions(query);(${configure})(true);if(Object.hasOwn(query,'setData')||query.setData!==nativeSetData||listeners.size!==0)throw Error('Unsupportednonextensibleinstancewasadapted');(${configure})(false);
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
