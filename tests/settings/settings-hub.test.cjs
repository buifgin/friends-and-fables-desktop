const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),Module=require('node:module');
const handlers=new Map();
class Contents extends EventEmitter{constructor(){super();this.mainFrame={origin:'fables-desktop://settings',url:''};this.destroyed=false;}loadURL(url){this.mainFrame.url=url;return Promise.resolve();}setWindowOpenHandler(){}isDestroyed(){return this.destroyed;}send(){}focus(){}close(){this.destroyed=true;}}
class View{constructor(options){this.options=options;this.webContents=new Contents();}setVisible(v){this.visible=v;}setBounds(b){this.bounds=b;}setBackgroundColor(){}}
const original=Module._load;Module._load=function(name,...args){if(name==='electron')return {WebContentsView:View,ipcMain:{handle:(n,f)=>handlers.set(n,f),removeHandler:n=>handlers.delete(n)}};return original.call(this,name,...args);};
const {SettingsHub,SETTINGS_HUB_URL}=require('../../dist/settings/settings-hub');Module._load=original;
function fixture(){handlers.clear();const window=new EventEmitter();window.contentView={addChildView(){}};window.isDestroyed=()=>false;window.isFullScreen=()=>false;const created=[];const appearance={getLocale:()=> 'en',getSettings:()=>({preset:'custom',customColor:'#234567'}),createPanel:()=>{const v=new View();created.push(v);return v;}};let hub,closed=0;hub=new SettingsHub(window,appearance,{hideDesktopTopbarInFullscreen:false,save:async()=>{}},()=>{closed++;hub.setVisible(false);},()=>{},s=>hub.select(s));const manager={createPanel:()=>{const v=new View();created.push(v);return v;},setSettingsOpener(){}};hub.configure({translation:manager,instructions:manager});hub.layout({x:0,y:32,width:580,height:700});return {hub,window,created,get closed(){return closed;}};}
test('section switches retain editor view identity and unsaved state',async()=>{const f=fixture();await f.hub.select('appearance');const first=f.created[0];first.webContents.unsaved='draft';await f.hub.select('translation');assert.equal(first.visible,false);await f.hub.select('appearance');assert.equal(f.created.length,2);assert.equal(first.visible,true);assert.equal(first.webContents.unsaved,'draft');assert.deepEqual(first.bounds,{x:126,y:32,width:454,height:700});f.hub.setVisible(false);assert.ok(f.created.every(v=>!v.visible));});
test('navigation IPC rejects website, subframe, wrong route and invalid section',async()=>{const {hub}=fixture(),invoke=handlers.get('settings-hub:get');const sender=hub.view.webContents;const event={sender,senderFrame:sender.mainFrame};assert.equal(invoke(event).section,'appearance');assert.deepEqual(invoke(event).theme,{preset:'custom',customColor:'#234567'},'The hub receives the selected theme for palette rendering.');assert.throws(()=>invoke({sender:new Contents(),senderFrame:sender.mainFrame}));assert.throws(()=>invoke({sender,senderFrame:{...sender.mainFrame}}));const old=sender.mainFrame.url;sender.mainFrame.url=SETTINGS_HUB_URL+'?bypass';assert.throws(()=>invoke(event));sender.mainFrame.url=old;assert.throws(()=>handlers.get('settings-hub:select')(event,'../translation'));assert.throws(()=>invoke({sender,senderFrame:null}));});
test('campaign cannot open without native adapter and music creates no player',async()=>{const f=fixture();await assert.rejects(f.hub.select('campaign'),/not connected/);await f.hub.select('music');assert.equal(f.created.length,0);});
test('native campaign adapter receives content bounds and host covers nav only',async()=>{const f=fixture(),shown=[],manager={setSettingsOpener(){}};let hidden=0;f.hub.configure({translation:manager,instructions:manager,campaign:{show:b=>shown.push(b),hide:()=>hidden++}});await f.hub.select('campaign');assert.deepEqual(shown.at(-1),{x:126,y:32,width:454,height:700});assert.equal(f.hub.view.bounds.width,126);assert.equal(hidden,0);await f.hub.select('campaign');f.hub.layout({x:0,y:32,width:580,height:700});assert.equal(hidden,0);assert.equal(shown.length,1,'Repeated selection/layout does not relaunch native Campaign');await f.hub.select('general');assert.equal(hidden,1);assert.equal(f.hub.view.bounds.width,580);});
test('hide during pending editor load cancels opening',async()=>{const f=fixture();const opening=f.hub.select('appearance');f.hub.setVisible(false);await opening;assert.equal(f.hub.view.visible,false);});

test('combat IPC exposes campaign preferences only to trusted main settings frame and rejects stale saves',async()=>{
 const f=fixture(),manager={setSettingsOpener(){}};let current={campaignId:'a',automaticDamage:false,hideIntermediateFranz:false},saved=[];
 f.hub.configure({translation:manager,instructions:manager,combat:{get:async()=>current,save:async value=>{saved.push(value);current=value;return current;}}});
 const sender=f.hub.view.webContents,event={sender,senderFrame:sender.mainFrame},get=handlers.get('settings-hub:combat-get'),save=handlers.get('settings-hub:combat-save');
 await f.hub.select('combat');assert.equal(f.created.length,0);assert.deepEqual(await get(event),{...current,hideDamagePrompt:current.hideDamagePrompt??false});
 await save(event,{...current,automaticDamage:true,hideIntermediateFranz:true,hideDamagePrompt:true});assert.equal(saved.length,1);assert.equal(current.hideDamagePrompt,true);
 await save(event,{...current,automaticDamage:false});assert.equal(current.hideIntermediateFranz,false);assert.equal(current.hideDamagePrompt,false);
 for(const bad of [{...current,automaticDamage:'true'},{...current,campaignId:'b'},{...current,hideDamagePrompt:'true'},{...current,extra:true}])await assert.rejects(save(event,bad));
 await assert.rejects(get({sender:new Contents(),senderFrame:sender.mainFrame}));
 await assert.rejects(save({sender,senderFrame:{...sender.mainFrame}},current));
 current=null;assert.equal(await get(event),null);await assert.rejects(save(event,{campaignId:'a',automaticDamage:true,hideIntermediateFranz:false}));
 f.window.emit('closed');assert.equal(handlers.has('settings-hub:combat-save'),false);
});
test('combat get ignores older in-flight snapshots after campaign switch',async()=>{
 const f=fixture(),manager={setSettingsOpener(){}};let resolve,reads=0;
 const current={campaignId:'b',automaticDamage:false,hideIntermediateFranz:false};
 f.hub.configure({translation:manager,instructions:manager,combat:{get:()=>++reads===1?new Promise(r=>resolve=r):Promise.resolve(current),save:async()=>current}});
 const sender=f.hub.view.webContents,event={sender,senderFrame:sender.mainFrame},get=handlers.get('settings-hub:combat-get');
 const old=get(event);assert.deepEqual(await get(event),{...current,hideDamagePrompt:current.hideDamagePrompt??false});resolve({...current,campaignId:'a'});assert.deepEqual(await old,{...current,hideDamagePrompt:false});
});

test('Combat renderer disables off-campaign controls, enforces hide dependency and refreshes campaigns with one pending read',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,disabled:false,hidden:false,textContent:'',setAttribute(){},toggleAttribute(name,value){this[name]=value;},replaceChildren(...children){this.children=children;}});return nodes.get(id);};
 let onChange,poll,saves=[],snapshot=null,resolveRead,readCount=0;
 const state={section:'combat',locale:'ru',theme:{},campaignAvailable:true,hideDesktopTopbarInFullscreen:false,combat:null};
 const context={window:{settingsTheme:{apply(){}},settingsHub:{get:async()=>state,onChange:fn=>onChange=fn,select:async()=>{},close:async()=>{},saveGeneral:async()=>state,getCombat:async()=>{readCount++;return resolveRead?new Promise(r=>resolveRead=r):snapshot;},saveCombat:async value=>{saves.push(value);return snapshot={...value,hideIntermediateFranz:value.automaticDamage&&value.hideIntermediateFranz,hideDamagePrompt:value.automaticDamage&&value.hideDamagePrompt};}}},document:{visibilityState:'visible',getElementById:node,querySelector:node,createElement:()=>({setAttribute(){}})},setInterval:fn=>poll=fn};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/settings/settings-hub.js'),'utf8'),context);
 const drain=()=>new Promise(r=>setImmediate(r));await drain();
 assert.equal(node('close').hidden,false,'Inline section owns right-edge close');assert.equal(node('#content').hidden,false);assert.equal(node('automatic-damage').disabled,true);assert.equal(node('hide-intermediate-franz').disabled,true);assert.equal(node('hide-damage-prompt').disabled,true);assert.equal(node('#combat h2').textContent,'Бой');
 snapshot={campaignId:'a',automaticDamage:false,hideIntermediateFranz:false};poll();await drain();
 assert.equal(node('automatic-damage').disabled,false);assert.equal(node('hide-intermediate-franz').disabled,true);assert.equal(node('hide-damage-prompt').disabled,true);
 node('automatic-damage').checked=true;await node('automatic-damage').onchange();await drain();assert.equal(saves[0].campaignId,'a');assert.equal(node('hide-intermediate-franz').disabled,false);assert.equal(node('hide-damage-prompt').disabled,false);assert.equal(node('hide-damage-prompt').checked,false);
 node('hide-damage-prompt').checked=true;await node('hide-damage-prompt').onchange();await drain();assert.equal(saves.at(-1).hideDamagePrompt,true);assert.equal(saves.at(-1).hideIntermediateFranz,false);
 node('automatic-damage').checked=false;await node('automatic-damage').onchange();await drain();assert.equal(node('hide-damage-prompt').checked,false);assert.equal(node('hide-damage-prompt').disabled,true);
 snapshot={campaignId:'b',automaticDamage:false,hideIntermediateFranz:false};poll();await drain();assert.equal(node('automatic-damage').checked,false);
 resolveRead=true;const before=readCount;poll();poll();assert.equal(readCount,before+1);resolveRead(snapshot);resolveRead=null;await drain();
 onChange({...state,section:'campaign'});assert.equal(node('close').hidden,true);assert.equal(node('#content').hidden,true);onChange({...state,section:'general',campaignAvailable:false});assert.equal(node('close').hidden,false);assert.equal(node('#content').hidden,false);assert.equal(node('sections').children.length,5);const count=readCount;poll();await drain();assert.equal(readCount,count);
 onChange({...state,section:'combat',combat:snapshot});await drain();context.document.visibilityState='hidden';poll();assert.equal(readCount,count+1);
});

test('route availability hides campaign sections and rejects unavailable campaign navigation',async()=>{
 const f=fixture(),manager={setSettingsOpener(){}},shown=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{show:b=>shown.push(b),hide(){}}});
 f.hub.setCampaignAvailable(false);
 const sender=f.hub.view.webContents,event={sender,senderFrame:sender.mainFrame};
 assert.equal(handlers.get('settings-hub:get')(event).campaignAvailable,false);
 await assert.rejects(f.hub.select('campaign'),/not available/);await assert.rejects(f.hub.select('combat'),/not available/);
 f.hub.setCampaignAvailable(true);await f.hub.select('campaign');assert.equal(shown.length,1);
});
