const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),Module=require('node:module');
const handlers=new Map();
class Contents extends EventEmitter{constructor(){super();this.mainFrame={origin:'fables-desktop://settings',url:''};this.destroyed=false;this.throttling=true;this.throttlingWrites=[];}getBackgroundThrottling(){return this.throttling;}setBackgroundThrottling(value){this.throttling=value;this.throttlingWrites.push(value);}loadURL(url){this.mainFrame.url=url;return Promise.resolve();}setWindowOpenHandler(){}getURL(){return this.mainFrame.url;}executeJavaScript(source){return Promise.resolve(/data-ff-(appearance|translation|instructions)-rendered/.test(source)?{ready:true,locale:'en',preset:'custom',customColor:'#234567'}:true);}isDestroyed(){return this.destroyed;}send(){}focus(){}close(){this.destroyed=true;}}
class View{constructor(options){this.options=options;this.webContents=new Contents();}setVisible(v){this.visible=v;}getVisible(){return this.visible;}setBounds(b){this.bounds=b;}setBackgroundColor(){}}
const original=Module._load;Module._load=function(name,...args){if(name==='electron')return {WebContentsView:View,ipcMain:{handle:(n,f)=>handlers.set(n,f),removeHandler:n=>handlers.delete(n)}};return original.call(this,name,...args);};
const {SettingsHub,SETTINGS_HUB_URL}=require('../../dist/settings/settings-hub');Module._load=original;
function fixture(){handlers.clear();const window=new EventEmitter();window.contentView={children:[],addChildView(view,index){const old=this.children.indexOf(view);if(old>=0){this.children.splice(old,1);this.children.push(view);}else this.children.splice(index??this.children.length,0,view);},removeChildView(view){this.children.splice(this.children.indexOf(view),1);}};window.isDestroyed=()=>false;window.isFullScreen=()=>false;const created=[];const appearance={getLocale:()=> 'en',getSettings:()=>({preset:'custom',customColor:'#234567'}),createPanel:()=>{const v=new View();created.push(v);return v;}};const remembered=[];const general={hideDesktopTopbarInFullscreen:false,save:async()=>{},saveSection:async section=>{remembered.push(section);general.lastSettingsSection=section;}};let hub,closed=0;hub=new SettingsHub(window,appearance,general,()=>{closed++;hub.setVisible(false);},()=>{},s=>hub.select(s));const manager={createPanel:()=>{const v=new View();created.push(v);return v;},getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};hub.configure({translation:manager,instructions:manager});hub.layout({x:0,y:32,width:580,height:700});return {hub,window,created,general,remembered,get closed(){return closed;}};}
test('section switches retain editor view identity and unsaved state',async()=>{const f=fixture();await f.hub.select('appearance');const first=f.created[0];first.webContents.unsaved='draft';await f.hub.select('translation');assert.equal(first.visible,false);await f.hub.select('appearance');assert.equal(f.created.length,2);assert.equal(first.visible,true);assert.equal(first.webContents.unsaved,'draft');assert.deepEqual(first.bounds,{x:126,y:32,width:454,height:700});f.hub.setVisible(false);assert.ok(f.created.every(v=>!v.visible));});
test('navigation IPC rejects website, subframe, wrong route and invalid section',async()=>{const {hub}=fixture(),invoke=handlers.get('settings-hub:get');const sender=hub.view.webContents;const event={sender,senderFrame:sender.mainFrame};assert.equal(invoke(event).section,'appearance');assert.deepEqual(invoke(event).theme,{preset:'custom',customColor:'#234567'},'The hub receives the selected theme for palette rendering.');assert.throws(()=>invoke({sender:new Contents(),senderFrame:sender.mainFrame}));assert.throws(()=>invoke({sender,senderFrame:{...sender.mainFrame}}));const old=sender.mainFrame.url;sender.mainFrame.url=SETTINGS_HUB_URL+'?bypass';assert.throws(()=>invoke(event));sender.mainFrame.url=old;assert.throws(()=>handlers.get('settings-hub:select')(event,'../translation'));assert.throws(()=>invoke({sender,senderFrame:null}));});
test('campaign cannot open without native adapter and music creates no player',async()=>{const f=fixture();await assert.rejects(f.hub.select('campaign'),/not connected/);await f.hub.select('music');assert.equal(f.created.length,0);});
test('native campaign adapter receives content bounds and host covers nav only',async()=>{const f=fixture(),shown=[],manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let hidden=0;f.hub.configure({translation:manager,instructions:manager,campaign:{suspend(){},show:b=>shown.push(b),hide:()=>hidden++}});await f.hub.select('campaign');assert.deepEqual(shown.at(-1),{x:126,y:32,width:454,height:700});assert.equal(f.hub.view.bounds.width,126);assert.equal(hidden,0);await f.hub.select('campaign');f.hub.layout({x:0,y:32,width:580,height:700});assert.equal(hidden,0);assert.equal(shown.length,1,'Repeated selection/layout does not relaunch native Campaign');await f.hub.select('general');assert.equal(hidden,0);assert.equal(f.hub.hasRetainedCampaign(),true);f.hub.setVisible(false);assert.equal(hidden,1);assert.equal(f.hub.view.bounds.width,580);});
test('hide during pending editor load cancels opening',async()=>{const f=fixture();const opening=f.hub.select('appearance');f.hub.setVisible(false);await opening;assert.equal(f.hub.view.visible,false);});

test('combat IPC exposes campaign preferences only to trusted main settings frame and rejects stale saves',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let current={campaignId:'a',automaticDamage:false,hideIntermediateFranz:false},saved=[];
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
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let resolve,reads=0;
 const current={campaignId:'b',automaticDamage:false,hideIntermediateFranz:false};
 f.hub.configure({translation:manager,instructions:manager,combat:{get:()=>++reads===1?new Promise(r=>resolve=r):Promise.resolve(current),save:async()=>current}});
 const sender=f.hub.view.webContents,event={sender,senderFrame:sender.mainFrame},get=handlers.get('settings-hub:combat-get');
 const old=get(event);assert.deepEqual(await get(event),{...current,hideDamagePrompt:current.hideDamagePrompt??false});resolve({...current,campaignId:'a'});assert.deepEqual(await old,{...current,hideDamagePrompt:false});
});

test('Settings renderer localizes document metadata and navigation while retaining preference state across locales',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,disabled:false,hidden:false,textContent:'',attributes:{},setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name]??null;},toggleAttribute(name,value){this[name]=value;},replaceChildren(...children){this.children=children;}});return nodes.get(id);};
 let onChange,poll,saves=[],snapshot=null,resolveRead,readCount=0;
 let state={section:'combat',locale:'ru',theme:{},campaignAvailable:true,hideDesktopTopbarInFullscreen:false,combat:null};
 const context={window:{settingsTheme:{apply(){}},settingsHub:{get:async()=>state,onChange:fn=>onChange=fn,select:async()=>{},close:async()=>{},saveGeneral:async()=>state,getCombat:async()=>{readCount++;return resolveRead?new Promise(r=>resolveRead=r):snapshot;},saveCombat:async value=>{saves.push(value);return snapshot={...value,hideIntermediateFranz:value.automaticDamage&&value.hideIntermediateFranz,hideDamagePrompt:value.automaticDamage&&value.hideDamagePrompt};}}},document:{documentElement:{lang:'',attributes:{},setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name]??null;}},visibilityState:'visible',getElementById:node,querySelector:node,createElement:()=>({attributes:{},setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name]??null;}})},setInterval:fn=>poll=fn};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/settings/settings-hub.js'),'utf8'),context);
 const drain=()=>new Promise(r=>setImmediate(r));await drain();
 const enLabels=['Campaign','Appearance','Translation','/sp','Music','Combat','General'],ruLabels=['Кампания','Оформление','Перевод','/sp','Музыка','Бой','Общие'];
 assert.equal(context.document.documentElement.lang,'ru');assert.equal(node('nav').getAttribute('aria-label'),'Разделы настроек');assert.equal(node('title').textContent,'Настройки');assert.equal(node('close').ariaLabel,'Закрыть настройки');assert.equal(node('close').title,'Закрыть настройки');
 assert.deepEqual(node('sections').children.map(button=>button.textContent),ruLabels);assert.deepEqual(node('sections').children.map(button=>button.getAttribute('aria-current')),['false','false','false','false','false','page','false']);
 assert.equal(node('#music h1').textContent,'Музыка');assert.equal(node('#music p').textContent,'Настройки музыки появятся здесь, когда будут доступны.');assert.equal(node('#general h1').textContent,'Общие');assert.equal(node('hide-label').textContent,'Скрывать верхнюю панель приложения в полноэкранном режиме');assert.match(node('help').textContent,/Alt\+Enter или F11/);
 state={...state,locale:'en',hideDesktopTopbarInFullscreen:true};onChange(state);assert.equal(context.document.documentElement.lang,'en');assert.equal(node('nav').getAttribute('aria-label'),'Settings sections');assert.equal(node('close').ariaLabel,'Close settings');assert.deepEqual(node('sections').children.map(button=>button.textContent),enLabels);assert.equal(node('hide-bar').checked,true);
 state={...state,locale:'ru'};onChange(state);assert.equal(context.document.documentElement.lang,'ru');assert.deepEqual(node('sections').children.map(button=>button.textContent),ruLabels);assert.equal(node('hide-bar').checked,true,'EN→RU refresh preserves the saved preference value.');
 state={...state,locale:'en'};onChange(state);assert.equal(context.document.documentElement.lang,'en');assert.deepEqual(node('sections').children.map(button=>button.textContent),enLabels);assert.equal(node('hide-bar').checked,true,'RU→EN refresh preserves the saved preference value.');
 state={...state,locale:'ru',campaignAvailable:false,section:'general'};onChange(state);assert.deepEqual(node('sections').children.map(button=>button.textContent),['Оформление','Перевод','/sp','Музыка','Общие'],'Unavailable campaign-only sections are omitted without changing remaining labels.');
 state={...state,locale:'ru',campaignAvailable:true,section:'combat',hideDesktopTopbarInFullscreen:false};onChange(state);await drain();
 assert.equal(node('close').hidden,false,'Inline section owns right-edge close');assert.equal(node('#content').hidden,false);assert.equal(node('automatic-damage').disabled,true);assert.equal(node('hide-intermediate-franz').disabled,true);assert.equal(node('hide-damage-prompt').disabled,true);assert.equal(node('#combat h1').textContent,'Бой');
 const hubHtml=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../assets/settings/settings-hub.html'),'utf8');
 assert.match(hubHtml,/<section id="combat" hidden>\s*<h1>Combat<\/h1>/,'Combat section uses the heading element consumed by the renderer.');
 snapshot={campaignId:'a',automaticDamage:false,hideIntermediateFranz:false};poll();await drain();
 assert.equal(node('automatic-damage').disabled,false);assert.equal(node('hide-intermediate-franz').disabled,true);assert.equal(node('hide-damage-prompt').disabled,true);
 node('automatic-damage').checked=true;await node('automatic-damage').onchange();await drain();assert.equal(saves[0].campaignId,'a');assert.equal(node('hide-intermediate-franz').disabled,false);assert.equal(node('hide-damage-prompt').disabled,false);assert.equal(node('hide-damage-prompt').checked,false);
 node('hide-damage-prompt').checked=true;await node('hide-damage-prompt').onchange();await drain();assert.equal(saves.at(-1).hideDamagePrompt,true);assert.equal(saves.at(-1).hideIntermediateFranz,false);
 node('automatic-damage').checked=false;await node('automatic-damage').onchange();await drain();assert.equal(node('hide-damage-prompt').checked,false);assert.equal(node('hide-damage-prompt').disabled,true);
 snapshot={campaignId:'b',automaticDamage:false,hideIntermediateFranz:false};poll();await drain();assert.equal(node('automatic-damage').checked,false);
 resolveRead=true;const before=readCount;poll();poll();assert.equal(readCount,before+1);resolveRead(snapshot);resolveRead=null;await drain();
 onChange({...state,section:'campaign'});assert.equal(node('close').hidden,true);assert.equal(node('#content').hidden,true);onChange({...state,section:'general',campaignAvailable:false});assert.equal(node('close').hidden,false);assert.equal(node('#content').hidden,false);assert.equal(node('sections').children.length,5);const count=readCount;poll();await drain();assert.equal(readCount,count);
 onChange({...state,section:'general',renderRevision:20});assert.equal(context.document.documentElement.getAttribute('data-ff-settings-rendered'),'20:general');
 onChange({...state,section:'campaign',renderRevision:19});assert.equal(node('#content').hidden,false,'An older Campaign snapshot cannot blank completed General content');assert.equal(context.document.documentElement.getAttribute('data-ff-settings-rendered'),'20:general');
 onChange({...state,section:'campaign',renderRevision:21});assert.equal(node('#content').hidden,true);assert.equal(context.document.documentElement.getAttribute('data-ff-settings-rendered'),'21:campaign');
 onChange({...state,section:'combat',combat:snapshot});await drain();context.document.visibilityState='hidden';poll();assert.equal(readCount,count+1);
});

test('route availability hides campaign sections and rejects unavailable campaign navigation',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}},shown=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{suspend(){},show:b=>shown.push(b),hide(){}}});
 f.hub.setCampaignAvailable(false);
 const sender=f.hub.view.webContents,event={sender,senderFrame:sender.mainFrame};
 assert.equal(handlers.get('settings-hub:get')(event).campaignAvailable,false);
 await assert.rejects(f.hub.select('campaign'),/not available/);await assert.rejects(f.hub.select('combat'),/not available/);
 f.hub.setCampaignAvailable(true);await f.hub.select('campaign');assert.equal(shown.length,1);
});

test('renderer Campaign geometry is ready before dock promotion and active theme refresh does not reopen',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}},trace=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{suspend(){},show:b=>trace.push(['show',b]),hide:()=>trace.push(['hide'])}});
 await f.hub.select('campaign',()=>trace.push(['website-strip-committed']));
 assert.deepEqual(trace.map(x=>x[0]),['show','website-strip-committed']);
 f.hub.refreshCampaign();assert.deepEqual(trace.map(x=>x[0]),['show','website-strip-committed','show']);
 await f.hub.select('campaign');assert.equal(trace.length,3,'Repeated selection preserves mounted native section');
 await f.hub.select('general');f.hub.refreshCampaign();assert.equal(trace.length,3,'Off-section theme update cannot mount Campaign');
});


test('Campaign to Translation/General and back retains adapter and reservation until hub close',async()=>{
 const f=fixture(),trace=[],manager={createPanel:()=>new View(),getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show:b=>trace.push(['show',b]),suspend:()=>trace.push(['suspend']),hide:()=>trace.push(['dispose'])}});
 const websiteBounds=[];
 // The dock reserves native Campaign's strip even when local editors cover it.
 const commit=()=>websiteBounds.push({x:f.hub.hasRetainedCampaign()?126:580,width:f.hub.hasRetainedCampaign()?1154:700});
 await f.hub.select('campaign',commit);
 for(const section of ['translation','general']){await f.hub.select(section,commit);assert.equal(f.hub.view.bounds.width,580);assert.equal(f.hub.hasRetainedCampaign(),true);await f.hub.select('campaign',commit);}
 assert.ok(websiteBounds.every(b=>b.x===126&&b.width===1154));assert.deepEqual(trace.map(x=>x[0]),['show','suspend','show','suspend','show']);
 assert.ok(trace.filter(x=>x[0]==='show').every(x=>x[1].width===454));
 await f.hub.select('general',commit);f.hub.setVisible(false);f.hub.setVisible(false);assert.equal(f.hub.hasRetainedCampaign(),false);assert.equal(trace.filter(x=>x[0]==='dispose').length,1);
});
test('route unavailability releases a retained Campaign while a different section is active',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}},trace=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend:()=>trace.push('suspend'),hide:()=>trace.push('dispose')}});
 await f.hub.select('campaign');await f.hub.select('general');f.hub.setCampaignAvailable(false);f.hub.setVisible(false);
 assert.deepEqual(trace,['suspend','dispose']);assert.equal(f.hub.hasRetainedCampaign(),false);await assert.rejects(f.hub.select('campaign'),/not available/);
});


test('actual Settings dock keeps website bounds across native Campaign cross-switches and restores full width on close/departure',async()=>{
 handlers.clear();
 class Controls{sync(){}layout(){}setVisible(){}raise(){}}
 class General{hideDesktopTopbarInFullscreen=false;saved=[];saveSection(section){this.saved.push(section);this.lastSettingsSection=section;return Promise.resolve();}initialize(){return Promise.resolve();}flush(){return Promise.resolve();}}
 Module._load=function(name,...args){
  if(name==='electron')return {WebContentsView:View,ipcMain:{handle:(n,f)=>handlers.set(n,f),removeHandler:n=>handlers.delete(n)}};
  if(name==='./window-controls')return {WindowControls:Controls};
  if(name==='../settings/general-settings')return {GeneralSettings:General};
  return original.call(this,name,...args);
 };
 let AppearanceDock;try{({AppearanceDock}=require('../../dist/shell/appearance-dock'));}finally{Module._load=original;}
 const window=new EventEmitter();window.isDestroyed=()=>false;window.isFullScreen=()=>false;window.getContentSize=()=>[1280,800];window.setMenuBarVisibility=()=>{};window.contentView={children:[],addChildView(view,index){const old=this.children.indexOf(view);if(old>=0){this.children.splice(old,1);this.children.push(view);}else this.children.splice(index??this.children.length,0,view);},removeChildView(view){this.children.splice(this.children.indexOf(view),1);}};
 const website=new View(),history=[];website.setBounds=b=>{website.bounds=b;history.push({...b});};
 const appearance={getLocale:()=> 'en',getSettings:()=>({preset:'custom',customColor:'#234567',appearancePanelWidth:580}),createPanel:()=>new View()};
 const dock=new AppearanceDock(window,website,appearance),trace=[],manager={createPanel:()=>new View(),getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};
 dock.configureSettings({translation:manager,instructions:manager,campaign:{show:b=>trace.push(['show',b]),suspend:b=>trace.push(['suspend',b]),hide:()=>trace.push(['dispose'])}});
 const early=dock.openSettings();dock.hide();await early;assert.equal(dock.isOpen(),false,'Hide cancels a generic open still awaiting persisted preference initialization');
 await dock.generalReady;
 const pending=dock.openSettings();await Promise.resolve();dock.hide();await pending;
 assert.equal(dock.isOpen(),false);assert.equal(dock.hub.view.getVisible(),false,'Hide between generic and section initialization awaits keeps the hub hidden');assert.deepEqual(dock.general.saved,[],'Canceled generic opening cannot persist a section');
 const initialized=dock.generalReady;let releaseInitialize;dock.generalReady=new Promise(resolve=>releaseInitialize=resolve);
 const selected=[],select=dock.hub.select.bind(dock.hub);dock.hub.select=(section,...args)=>{selected.push(section);return select(section,...args);};
 const older=dock.openSection('general'),newer=dock.openSection('music');releaseInitialize();await Promise.all([older,newer]);
 assert.deepEqual(selected,['music'],'Only the newest explicit request may enter hub selection after initialization');assert.equal(dock.hub.currentSection(),'music');assert.deepEqual(dock.general.saved,['music'],'The older explicit request cannot persist a superseded section');
 dock.generalReady=initialized;dock.hub.select=select;dock.hide();

 await dock.openSection('general');assert.deepEqual(website.bounds,{x:580,y:32,width:700,height:768});
 await dock.openSection('campaign');const reserved={...website.bounds};assert.deepEqual(reserved,{x:0,y:32,width:1280,height:768});
 history.length=0;
 for(const section of ['translation','general']){await dock.openSection(section);await dock.openSection('campaign');}
 assert.ok(history.length>0);assert.ok(history.every(b=>JSON.stringify(b)===JSON.stringify(reserved)),'Every actual dock layout preserves reserved website bounds');
 assert.deepEqual(trace.map(x=>x[0]),['show','suspend','show','suspend','show']);assert.ok(trace.filter(x=>x[0]!=='dispose').every(x=>x[1].width===454));
 await dock.openSection('general');dock.hide();assert.deepEqual(website.bounds,{x:0,y:32,width:1280,height:768});assert.equal(trace.filter(x=>x[0]==='dispose').length,1);
 await dock.openSection('campaign');await dock.openSection('general');await dock.setCampaignAvailable(false);
 assert.deepEqual(website.bounds,{x:580,y:32,width:700,height:768});assert.equal(trace.filter(x=>x[0]==='dispose').length,2);dock.hide();assert.equal(trace.filter(x=>x[0]==='dispose').length,2);
 // An old native close delivery must not cancel an unrelated new local opening.
 await dock.setCampaignAvailable(true);await dock.openSection('campaign');const deliverOldClose=()=>dock.closeCampaign();dock.hide();
 const appearanceEditor=dock.hub.editors.get('appearance')??null;
 if(!appearanceEditor){await dock.open();dock.hide();}
 const local=dock.hub.editors.get('appearance').view.webContents,execute=local.executeJavaScript;let releaseLocal;
 local.executeJavaScript=()=>new Promise(resolve=>releaseLocal=resolve);
 const localOpening=dock.openSection('appearance');await new Promise(resolve=>setImmediate(resolve));const releasePaint=releaseLocal;
 try {deliverOldClose();assert.equal(dock.opening,true,'Delayed native close cannot cancel a newer Appearance opening');}
 finally {releasePaint({ready:true,locale:'en',preset:'custom',customColor:'#234567'});await localOpening;local.executeJavaScript=execute;}
 assert.equal(dock.isOpen(),true);assert.equal(dock.hub.currentSection(),'appearance');dock.hide();
 await dock.openSection('music');dock.hide();await dock.openSettings();assert.equal(dock.hub.currentSection(),'music','Real generic entrypoint reopens the committed section');dock.hide();await dock.open();assert.equal(dock.hub.currentSection(),'appearance','Explicit Appearance opening keeps feature semantics');dock.hide();
});

test('Campaign remains committed until the exact local renderer completes target state',async()=>{
 const f=fixture(),trace=[],manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){trace.push('suspend');},hide(){}}});
 await f.hub.select('campaign');const nativeBounds={...f.hub.view.bounds};let finishReady;
 f.hub.view.webContents.executeJavaScript=source=>{assert.match(source,/data-ff-settings-rendered/);return source.includes('const advance=')?Promise.resolve(true):new Promise(resolve=>finishReady=resolve);};
 const switching=f.hub.select('general',()=>trace.push('layout'));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.hub.currentSection(),'campaign');assert.deepEqual(f.hub.view.bounds,nativeBounds);assert.deepEqual(trace,[]);
 const sender=f.hub.view.webContents;assert.equal(handlers.get('settings-hub:get')({sender,senderFrame:sender.mainFrame}).section,'general','Only prepared renderer state advances before native layout');
 finishReady(true);await switching;assert.equal(f.hub.currentSection(),'general');assert.equal(f.hub.view.bounds.width,580);assert.deepEqual(trace,['layout','suspend']);
});

for(const section of ['general','appearance'])for(const cancel of ['newer-section','hidden','unavailable','closed','wrong-url','new-document','not-rendered','renderer-error'])test(section+' pending ready cannot commit after '+cancel,async()=>{
 const f=fixture(),trace=[],manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){trace.push('suspend');},hide(){trace.push('hide');}}});
 await f.hub.select('campaign');let finishReady,contents,cancelObserved=false;
 const install=target=>{contents=target;target.executeJavaScript=source=>{if(source.startsWith('(()=>{const wait=')&&!source.includes('wait.expected=')){cancelObserved=true;finishReady(false);return Promise.resolve(true);}return new Promise((resolve,reject)=>finishReady=value=>value==='error'?reject(Error('owned renderer unavailable')):resolve(value));};};
 if(section==='general')install(f.hub.view.webContents);
 else {const create=f.hub.appearance.createPanel;f.hub.appearance.createPanel=()=>{const view=create();install(view.webContents);return view;};}
 const switching=f.hub.select(section,()=>trace.push('stale-layout'));await new Promise(resolve=>setImmediate(resolve));
 if(cancel==='newer-section')await f.hub.select('campaign');
 if(cancel==='hidden')f.hub.setVisible(false);
 if(cancel==='unavailable')f.hub.setCampaignAvailable(false);
 if(cancel==='closed')f.window.emit('closed');
 if(cancel==='wrong-url')contents.mainFrame.url='fables-desktop://settings/wrong';
 if(cancel==='new-document')contents.emit('did-navigate');
 finishReady(cancel==='renderer-error'?'error':cancel==='not-rendered'?false:section==='appearance'?{ready:true,locale:'en',preset:'custom',customColor:'#234567'}:true);await switching;
 assert.equal(f.hub.currentSection(),'campaign');assert.equal(trace.includes('stale-layout'),false);assert.equal(trace.includes('suspend'),false);
 assert.equal(f.hub.preparing,undefined,'Pending state is cleared on cancellation, failure or stale ownership');
 if(cancel==='hidden')assert.equal(f.hub.view.visible,false);
 if(cancel==='closed')assert.equal(contents.isDestroyed(),true);
 if(['newer-section','hidden','unavailable','closed','new-document'].includes(cancel))assert.equal(cancelObserved,true,'Cancellation actively disconnects pending renderer observation');
});

test('passive DOM wait accepts a newer same-section state and drops observer/timer on success or cancellation',async()=>{
 const vm=require('node:vm'),f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){},hide(){}}});await f.hub.select('campaign');
 let snapshot,marker=null;const observers=new Set(),timers=new Map(),context={window:{innerWidth:580,innerHeight:700},document:{visibilityState:'visible',documentElement:{getAttribute:()=>marker}},requestAnimationFrame:callback=>setImmediate(callback),cancelAnimationFrame:handle=>clearImmediate(handle),MutationObserver:class{constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}},setTimeout(callback){const id={};timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);}};
 const contents=f.hub.view.webContents;contents.send=(_channel,state)=>snapshot=state;contents.executeJavaScript=source=>Promise.resolve(vm.runInNewContext(source,context));
 let opening=f.hub.select('general');await new Promise(resolve=>setImmediate(resolve));assert.equal(observers.size,1);assert.equal(timers.size,1);const first=snapshot.renderRevision;
 f.hub.update();assert.ok(snapshot.renderRevision>first);marker=snapshot.renderRevision+':general';for(const observer of observers)observer.callback();await opening;
 assert.equal(f.hub.currentSection(),'general');assert.equal(observers.size,0);assert.equal(timers.size,0);assert.equal(context.window.__friendsFablesSettingsPaintWait,undefined);
 await f.hub.select('campaign');marker=null;opening=f.hub.select('general');await new Promise(resolve=>setImmediate(resolve));assert.equal(observers.size,1);f.hub.setVisible(false);await opening;assert.equal(observers.size,0);assert.equal(timers.size,0);assert.equal(context.window.__friendsFablesSettingsPaintWait,undefined);
});

test('General remains painted during cold Appearance preparation and editor is shown before external hub state is sent',async()=>{
 const f=fixture();await f.hub.select('general');const trace=[];let finishReady;
 const create=f.hub.appearance.createPanel;f.hub.appearance.createPanel=()=>{const view=create();view.webContents.executeJavaScript=source=>source.includes('wait.expected=')?Promise.resolve(true):new Promise(resolve=>finishReady=resolve);view.setVisible=value=>{view.visible=value;if(value)trace.push('editor-visible');};return view;};
 f.hub.view.webContents.send=(_channel,state)=>trace.push('hub-'+state.section);
 const opening=f.hub.select('appearance');await new Promise(resolve=>setImmediate(resolve));f.hub.update();
 const sender=f.hub.view.webContents;assert.equal(handlers.get('settings-hub:get')({sender,senderFrame:sender.mainFrame}).section,'general');assert.equal(f.hub.currentSection(),'general');assert.equal(f.created[0].visible,false);assert.deepEqual(trace,['hub-general']);
 finishReady({ready:true,locale:'en',preset:'custom',customColor:'#234567'});await opening;assert.deepEqual(trace,['hub-general','editor-visible','hub-appearance']);assert.equal(f.hub.currentSection(),'appearance');
});

test('cold Appearance passive wait rejects malformed or wrong-locale marker and cleans up after terminal chosen state',async()=>{
 const vm=require('node:vm'),f=fixture();await f.hub.select('general');let marker='not-json';const observers=new Set(),timers=new Map(),context={window:{innerWidth:580,innerHeight:700},document:{visibilityState:'visible',documentElement:{getAttribute:()=>marker}},requestAnimationFrame:callback=>setImmediate(callback),cancelAnimationFrame:handle=>clearImmediate(handle),MutationObserver:class{constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}},setTimeout(callback){const id={};timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);}};
 const create=f.hub.appearance.createPanel;f.hub.appearance.createPanel=()=>{const view=create();view.webContents.executeJavaScript=source=>Promise.resolve(vm.runInNewContext(source,context));return view;};
 const opening=f.hub.select('appearance');await new Promise(resolve=>setImmediate(resolve));assert.equal(observers.size,1);marker=JSON.stringify({locale:'ru',preset:'custom',customColor:'#234567'});for(const observer of observers)observer.callback();assert.equal(f.hub.currentSection(),'general');assert.equal(observers.size,1);
 marker=JSON.stringify({locale:'en',preset:'custom',customColor:'#234567'});for(const observer of observers)observer.callback();await opening;assert.equal(f.hub.currentSection(),'appearance');assert.equal(observers.size,0);assert.equal(timers.size,0);assert.equal(context.window.__friendsFablesSettingsPaintWait,undefined);
});

for(const cancel of ['newer-section','hidden','unavailable','closed','resize','not-painted','paint-error'])test('expanded visible hub keeps native Campaign until paint, rejects '+cancel,async()=>{
 const f=fixture(),trace=[],manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){trace.push('suspend');},hide(){}}});await f.hub.select('campaign');let finishPaint,canceled=false;
 f.hub.view.webContents.executeJavaScript=source=>{if(source.startsWith('(()=>{const wait=')){canceled=true;finishPaint(false);return Promise.resolve(true);}if(source.includes('const advance='))return new Promise((resolve,reject)=>finishPaint=value=>value==='error'?reject(Error('visible renderer unavailable')):resolve(value));return Promise.resolve(true);};
 const opening=f.hub.select('general',()=>trace.push('layout'));await new Promise(resolve=>setImmediate(resolve));assert.equal(f.hub.currentSection(),'campaign');assert.equal(f.hub.view.bounds.width,580,'Prepared visible hub resizes while committed native content remains');assert.deepEqual(trace,[]);
 if(cancel==='newer-section')await f.hub.select('campaign');if(cancel==='hidden')f.hub.setVisible(false);if(cancel==='unavailable')f.hub.setCampaignAvailable(false);if(cancel==='closed')f.window.emit('closed');if(cancel==='resize')f.hub.layout({x:0,y:32,width:640,height:710});
 finishPaint(cancel==='paint-error'?'error':false);await opening;assert.equal(f.hub.currentSection(),'campaign');assert.deepEqual(trace,[]);assert.equal(f.hub.preparing,undefined);
 if(['newer-section','hidden','unavailable','closed','resize'].includes(cancel))assert.equal(canceled,true,'Paint RAF/timer wait is canceled actively');
 if(cancel==='not-painted'||cancel==='paint-error')assert.equal(f.hub.view.bounds.width,126,'Failure restores prior committed geometry');
});

test('superseding expanded General paint with a cold editor restores committed Campaign during load',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){},hide(){}}});await f.hub.select('campaign');
 let finishPaint,finishLoad,lastSection;
 f.hub.view.webContents.send=(channel,state)=>{if(channel==='settings-hub:update')lastSection=state.section;};
 f.hub.view.webContents.executeJavaScript=source=>{
  if(source.startsWith('(()=>{const wait=')){finishPaint(false);return Promise.resolve(true);}
  return source.includes('const advance=')?new Promise(resolve=>finishPaint=resolve):Promise.resolve(true);
 };
 const general=f.hub.select('general');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.hub.view.bounds.width,580);assert.equal(lastSection,'general');
 const create=f.hub.appearance.createPanel;f.hub.appearance.createPanel=()=>{const view=create();view.webContents.loadURL=url=>{view.webContents.mainFrame.url=url;return new Promise(resolve=>finishLoad=resolve);};return view;};
 const appearance=f.hub.select('appearance');await new Promise(resolve=>setImmediate(resolve));await general;
 try {
  assert.equal(f.hub.currentSection(),'campaign');assert.equal(f.hub.hasRetainedCampaign(),true);assert.equal(f.created[0].visible,false);
  assert.equal(f.hub.view.bounds.width,126,'Canceled General must not remain expanded while the next editor loads');
  assert.equal(lastSection,'campaign','Canceled General renderer state must return to the committed section');
 } finally {f.hub.setVisible(false);finishLoad();await appearance;}
});

test('same-bounds layout and Campaign refresh preserve expanded preparation until visible paint completes',async()=>{
 const f=fixture(),trace=[],manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){trace.push('suspend');},hide(){}}});await f.hub.select('campaign');let finishPaint;
 f.hub.view.webContents.executeJavaScript=source=>source.includes('const advance=')?new Promise(resolve=>finishPaint=resolve):Promise.resolve(true);
 const opening=f.hub.select('general');await new Promise(resolve=>setImmediate(resolve));f.hub.layout({x:0,y:32,width:580,height:700});assert.equal(f.hub.view.bounds.width,580);f.hub.refreshCampaign();assert.equal(f.hub.view.bounds.width,580);assert.equal(f.hub.currentSection(),'campaign');assert.deepEqual(trace,[]);
 finishPaint(true);await opening;assert.equal(f.hub.currentSection(),'general');assert.deepEqual(trace,['suspend']);
});

test('accepted Appearance state readiness waits for interactive initial settlement, follows locale without draft replay, rejects stale preferences independently',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{DEFAULT_APPEARANCE}=require('../../dist/appearance/themes');
 const source=fs.readFileSync(path.join(__dirname,'../../assets/appearance/appearance.js'),'utf8'),start=source.indexOf('function markRendered()'),end=source.indexOf('function appearanceError('),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false,hidden:false,disabled:false,classList:{toggle(){}},querySelectorAll:()=>[]});return nodes.get(id);};
 const root={lang:'en',attributes:{},setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name]??null;}};
 const context={busy:true,interactive:false,renderedSettings:undefined,appliedRevision:-1,appliedLocaleRevision:-1,roles:[],canUndoReset:false,panelWidth:0,panelNavigationWidth:0,customColor:'#161616',backgroundImage:null,backgroundName:'',imagePreview:null,form:{elements:{preset:{value:'website'}}},colorInput:node('custom-color'),hexInput:node('custom-hex'),element:node,document:{documentElement:root,body:{classList:{toggle(){}}}},window:{settingsLocale:{set:locale=>root.lang=locale}},showThemes(){},readDicePalette(){}};
 vm.createContext(context);context.updatePreview=()=>{node('theme-options').disabled=context.busy;context.markRendered();};vm.runInContext(source.slice(start,end),context);
 const state={...structuredClone(DEFAULT_APPEARANCE),preset:'custom',customColor:'#203040',locale:'en',localeRevision:0,revision:0,platform:'linux'};
 context.showSettings(state);assert.equal(root.getAttribute('data-ff-appearance-rendered'),null,'A notification while initial get is pending cannot advertise loading controls');assert.equal(node('theme-options').disabled,true);
 context.applyInterfaceLocale({locale:'ru',localeRevision:1});assert.equal(root.lang,'ru');assert.equal(root.getAttribute('data-ff-appearance-rendered'),null,'Interface locale alone cannot make initial preferences interactive');
 context.showSettings({...state,revision:1,customColor:'#112233'});assert.equal(context.hexInput.value,'#112233','Before first interactive settlement, newer preferences apply despite older locale metadata');assert.equal(root.getAttribute('data-ff-appearance-rendered'),null,'Initial busy notification is not interactive');
 context.busy=false;context.showSettings(state);assert.equal(context.form.elements.preset.value,'custom');assert.equal(context.hexInput.value,'#112233');assert.equal(node('theme-options').disabled,false);let ready=JSON.parse(root.getAttribute('data-ff-appearance-rendered'));assert.equal(ready.locale,'ru');assert.equal(ready.localeRevision,1,'Old locale metadata cannot discard fresh initial preference fields');
 context.hexInput.value='#345678';node('theme-name').value='unsaved draft';
 context.showSettings({...state,revision:1,locale:'en',localeRevision:0,customColor:'#000000'});assert.equal(context.hexInput.value,'#345678','Equal preference revision with stale locale must not replay fields over an unsaved draft');
 context.showSettings({...state,revision:3,locale:'en',localeRevision:0,customColor:'#000000'});assert.equal(context.hexInput.value,'#345678','Warm stale-locale reply cannot replay fields even if resize advanced manager preference revision');assert.equal(root.lang,'ru');assert.equal(JSON.parse(root.getAttribute('data-ff-appearance-rendered')).customColor,'#112233');assert.equal(JSON.parse(root.getAttribute('data-ff-appearance-rendered')).revision,1);
 context.hexInput.value='#345678';context.applyInterfaceLocale({locale:'en',localeRevision:2});ready=JSON.parse(root.getAttribute('data-ff-appearance-rendered'));assert.equal(ready.locale,'en');assert.equal(context.hexInput.value,'#345678');assert.equal(node('theme-name').value,'unsaved draft','Interface readiness refresh preserves local drafts');
 context.busy=true;context.showSettings({...state,customColor:'#456789',revision:4,localeRevision:2});context.busy=false;context.showSettings({...state,customColor:'#203040',revision:3,localeRevision:0});assert.equal(context.hexInput.value,'#456789');assert.equal(node('theme-options').disabled,false);ready=JSON.parse(root.getAttribute('data-ff-appearance-rendered'));assert.equal(ready.revision,4);assert.equal(ready.customColor,'#456789','Initial settlement unlocks newest accepted preferences without overwriting them with stale data');
});

test('pending Appearance follows latest expected provider on update and cannot commit returned older ready metadata',async()=>{
 const vm=require('node:vm'),f=fixture();let locale='en',customColor='#234567',marker=null;f.hub.appearance.getLocale=()=>locale;f.hub.appearance.getSettings=()=>({preset:'custom',customColor});await f.hub.select('general');
 const observers=new Set(),timers=new Map(),context={window:{},document:{documentElement:{getAttribute:()=>marker}},requestAnimationFrame:()=>{},cancelAnimationFrame(){},MutationObserver:class{constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}},setTimeout(callback){const id={};timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);}};
 const create=f.hub.appearance.createPanel;f.hub.appearance.createPanel=()=>{const view=create();view.webContents.executeJavaScript=source=>Promise.resolve(vm.runInNewContext(source,context));return view;};
 let opening=f.hub.select('appearance');await new Promise(resolve=>setImmediate(resolve));locale='ru';customColor='#345678';f.hub.update();marker=JSON.stringify({locale:'en',preset:'custom',customColor:'#234567'});for(const observer of observers)observer.callback();assert.equal(f.hub.currentSection(),'general');assert.equal(observers.size,1);marker=JSON.stringify({locale,preset:'custom',customColor});for(const observer of observers)observer.callback();await opening;assert.equal(f.hub.currentSection(),'appearance');assert.equal(observers.size,0);assert.equal(timers.size,0);
 await f.hub.select('general');let finish;f.created[0].webContents.executeJavaScript=()=>new Promise(resolve=>finish=resolve);opening=f.hub.select('appearance');await new Promise(resolve=>setImmediate(resolve));finish({ready:true,locale,preset:'custom',customColor});customColor='#567890';await opening;assert.equal(f.hub.currentSection(),'general','Provider changed after renderer response; old ready result cannot commit');assert.equal(f.hub.preparing,undefined);
});

function externalWaitFixture(section){
 const vm=require('node:vm'),f=fixture(),observers=new Set(),timers=new Map(),frames=new Map();let marker=null,nextFrame=0;
 const root={getAttribute:()=>marker};
 const context=vm.createContext({window:{innerWidth:454,innerHeight:700},document:{visibilityState:'hidden',documentElement:root},requestAnimationFrame(callback){const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),MutationObserver:class{constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}},setTimeout(callback){const id={};timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id)});
 f.hub.managers[section].createPanel=()=>{const view=new View();f.created.push(view);const setVisible=view.setVisible.bind(view),setThrottling=view.webContents.setBackgroundThrottling.bind(view.webContents);view.setVisible=value=>{setVisible(value);context.document.visibilityState=value&&!view.webContents.getBackgroundThrottling()?'visible':'hidden';};view.webContents.setBackgroundThrottling=value=>{setThrottling(value);context.document.visibilityState=view.visible&&!value?'visible':'hidden';};view.webContents.executeJavaScript=source=>Promise.resolve(vm.runInContext(source,context));return view;};
 return {...f,context,observers,timers,frames,mark(value){marker=typeof value==='string'?value:JSON.stringify(value);for(const observer of [...observers])observer.callback();},tick(){const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
for(const section of ['translation','instructions']){
 test(section+' actual terminal wait keeps General until exact visible viewport paints and retains editor identity',async()=>{
  const f=externalWaitFixture(section);await f.hub.select('general');let committed=0;const opening=f.hub.select(section,()=>committed++);await flush();
  assert.equal(f.hub.currentSection(),'general');assert.equal(f.created[0].visible,false);assert.equal(f.observers.size,1);assert.equal(f.frames.size,0,'Hidden readiness never awaits RAF');
  for(const invalid of ['broken',{locale:'ru',preset:'custom',customColor:'#234567'},{locale:'en',preset:'website',customColor:'#234567'}]){f.mark(invalid);await flush();assert.equal(f.hub.currentSection(),'general');assert.equal(f.created[0].visible,false);}
  f.mark({locale:'en',preset:'custom',customColor:'#234567'});await flush();const editor=f.created[0];
  assert.equal(editor.visible,true,'Surface draws while outgoing covers it');assert.equal(editor.webContents.getBackgroundThrottling(),false);assert.equal(f.context.document.visibilityState,'visible','Real throttling API changes Page Visibility before RAF');assert.equal(f.window.contentView.children[0],editor,'Preparation is underneath outgoing hub');assert.equal(f.hub.view.visible,true);assert.equal(f.hub.currentSection(),'general');assert.equal(committed,0);
  f.context.window.innerWidth=450;f.tick();f.tick();await flush();assert.equal(f.hub.currentSection(),'general','Wrong viewport cannot commit');
  f.context.window.innerWidth=454;f.tick();await flush();assert.equal(committed,0);f.tick();await opening;
  assert.equal(f.hub.currentSection(),section);assert.deepEqual(editor.webContents.throttlingWrites,[false,true]);assert.equal(editor.webContents.getBackgroundThrottling(),true);assert.equal(f.window.contentView.children.at(-1),editor);assert.equal(committed,1);assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);assert.equal(f.observers.size,0);assert.equal(f.context.window.__friendsFablesSettingsPaintWait,undefined);
  editor.webContents.unsaved='kept draft';await f.hub.select('general');const warm=f.hub.select(section);await flush();assert.equal(f.created.length,1);f.tick();f.tick();await warm;assert.equal(editor.webContents.unsaved,'kept draft');
  const order=[...f.window.contentView.children],visibility=[];const setVisible=editor.setVisible.bind(editor);editor.setVisible=value=>{visibility.push(value);setVisible(value);};await f.hub.select(section);assert.deepEqual(f.window.contentView.children,order,'Same-section focus never lowers the sole committed editor');assert.ok(visibility.every(Boolean));assert.equal(f.frames.size,0);assert.equal(editor.webContents.unsaved,'kept draft');
 });
 for(const cancel of ['newer-section','hidden','unavailable','closed','resize','timeout','navigation','hub-destroyed'])test(section+' actual prepared surface cleans up on '+cancel,async()=>{
  const f=externalWaitFixture(section);await f.hub.select('general');let committed=0;const opening=f.hub.select(section,()=>committed++);await flush();f.mark({locale:'en',preset:'custom',customColor:'#234567'});await flush();const editor=f.created[0];assert.equal(editor.visible,true);
  if(cancel==='newer-section')await f.hub.select('music');if(cancel==='hidden')f.hub.setVisible(false);if(cancel==='unavailable')f.hub.setCampaignAvailable(false);if(cancel==='closed')f.window.emit('closed');if(cancel==='resize')f.hub.layout({x:0,y:32,width:640,height:710});if(cancel==='navigation')editor.webContents.emit('did-navigate');if(cancel==='hub-destroyed'){f.hub.view.webContents.destroyed=true;f.hub.view.webContents.emit('destroyed');}if(cancel==='timeout')for(const callback of [...f.timers.values()])callback();
  await opening;assert.equal(f.hub.currentSection(),cancel==='newer-section'?'music':'general');assert.equal(committed,0);assert.equal(editor.visible,false);assert.equal(editor.webContents.getBackgroundThrottling(),true);assert.deepEqual(editor.webContents.throttlingWrites,[false,true]);assert.equal(f.hub.preparing,undefined);assert.equal(f.frames.size,0);assert.equal(f.observers.size,0);assert.equal(f.timers.size,0);assert.equal(f.context.window.__friendsFablesSettingsPaintWait,undefined);
 });
 test(section+' missing marker times out without showing editor or replacing committed content',async()=>{const f=externalWaitFixture(section);await f.hub.select('general');const opening=f.hub.select(section);await flush();for(const callback of [...f.timers.values()])callback();await opening;assert.equal(f.hub.currentSection(),'general');assert.equal(f.created[0].visible,false);assert.equal(f.observers.size,0);assert.equal(f.timers.size,0);});
 test(section+' pending wait tracks latest provider and refuses stale metadata at commit',async()=>{
  const f=externalWaitFixture(section);let locale='en',color='#234567',enabled=false;f.hub.appearance.getLocale=()=>locale;f.hub.appearance.getSettings=()=>({preset:'custom',customColor:color});f.hub.managers.translation.getSettings=()=>({enabled,showOriginal:false});await f.hub.select('general');let opening=f.hub.select(section);await flush();locale='ru';enabled=true;color='#345678';f.hub.update();f.mark({locale:'en',preset:'custom',customColor:'#234567'});await flush();assert.equal(f.created[0].visible,false);
  f.mark({locale,preset:'custom',customColor:color});await flush();f.tick();color='#456789';f.hub.update();f.tick();await flush();assert.equal(f.hub.currentSection(),'general','A changed expectation resets painted-frame readiness');f.mark({locale,preset:'custom',customColor:color});f.tick();f.tick();await opening;assert.equal(f.hub.currentSection(),section);
  await f.hub.select('general');let finish;f.created[0].webContents.executeJavaScript=()=>new Promise(resolve=>finish=resolve);opening=f.hub.select(section);await flush();finish({ready:true,locale,preset:'custom',customColor:color});color='#567890';await opening;assert.equal(f.hub.currentSection(),'general','Provider changed after renderer response cannot commit');assert.equal(f.created[0].visible,false);
 });
}

test('external terminal markers require initial interactive settlement and interface updates preserve draft fields',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 for(const section of ['translation','instructions']){
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false,disabled:['translation-options','options','apply'].includes(id),textContent:'',hidden:false,addEventListener(){},setAttribute(){},classList:{toggle(){}}});return nodes.get(id);};
  const root={lang:'en',attributes:{},setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];},getAttribute(name){return this.attributes[name]??null;}};let finish,onTheme,onChange,onInterface;
  const state=section==='translation'?{enabled:false,showOriginal:false,translateDescriptions:false,preservedNames:[],theme:{preset:'custom',customColor:'#234567'},cacheEntries:0,bundled:true}:{settings:{text:'stored',combatText:'',enabled:false,hideMarked:true},locale:'en',theme:{preset:'custom',customColor:'#234567'}};
  const context={window:{settingsTheme:{apply(){}},settingsLocale:{set:locale=>root.lang=locale},translation:{get:()=>new Promise(resolve=>finish=resolve),onTheme:fn=>onTheme=fn,onChange:fn=>onChange=fn},hostInstructions:{get:()=>new Promise(resolve=>finish=resolve),onInterface:fn=>onInterface=fn}},document:{documentElement:root,getElementById:node,querySelectorAll:()=>[]}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets',section==='translation'?'translation/translation.js':'commands/host-instructions.js'),'utf8'),context);
  const marker='data-ff-'+section+'-rendered';assert.equal(root.getAttribute(marker),null);
  if(section==='translation'){onChange({...state,enabled:true});onTheme({preset:'custom',customColor:'#345678'});}else onInterface({...state,locale:'ru',theme:{preset:'custom',customColor:'#345678'}});
  assert.equal(root.getAttribute(marker),null,'Interface/notification cannot advertise initial loading renderer');finish(state);await flush();let ready=JSON.parse(root.getAttribute(marker));assert.equal(ready.locale,'ru');assert.equal(ready.customColor,'#345678','Initial GET cannot undo newer interface theme');assert.equal(ready.preset,'custom');
  const draft=node(section==='translation'?'preserved-names':'instructions');draft.value='unsaved draft';
  if(section==='translation')onTheme({preset:'custom',customColor:'#456789'});else onInterface({...state,locale:'en',theme:{preset:'custom',customColor:'#456789'}});
  ready=JSON.parse(root.getAttribute(marker));assert.equal(ready.customColor,'#456789');assert.equal(draft.value,'unsaved draft','Interface refresh advertises latest appearance without replaying preference fields');
 }
});

for(const previous of [true,false])for(const ending of ['success','cancel','paint-error'])test('prepared external child restores exact prior throttling '+previous+' after '+ending,async()=>{
 const f=externalWaitFixture('translation');await f.hub.select('general');const opening=f.hub.select('translation');await flush();const editor=f.created[0];editor.webContents.throttling=previous;
 if(ending==='paint-error'){const execute=editor.webContents.executeJavaScript.bind(editor.webContents);editor.webContents.executeJavaScript=source=>source.includes('const advance=')?Promise.reject(Error('paint unavailable')):execute(source);}
 f.mark({locale:'en',preset:'custom',customColor:'#234567'});await flush();
 if(ending==='success'){f.tick();f.tick();}if(ending==='cancel')f.hub.setVisible(false);await opening;
 assert.equal(editor.webContents.getBackgroundThrottling(),previous);assert.deepEqual(editor.webContents.throttlingWrites,[false,previous]);assert.equal(f.hub.preparing,undefined);
 assert.equal(f.hub.currentSection(),ending==='success'?'translation':'general');
 if(ending!=='success'){assert.equal(editor.visible,false);assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);}
});

test('retired preparation cannot restore throttling over a newer owner on the same editor',async()=>{
 const f=externalWaitFixture('translation');await f.hub.select('general');let opening=f.hub.select('translation');await flush();f.mark({locale:'en',preset:'custom',customColor:'#234567'});await flush();const editor=f.created[0],restore=f.hub.preparing.restoreThrottling;
 f.hub.setVisible(false);await opening;assert.equal(editor.webContents.getBackgroundThrottling(),true);await f.hub.select('general');opening=f.hub.select('translation');await flush();assert.equal(editor.webContents.getBackgroundThrottling(),false);restore();assert.equal(editor.webContents.getBackgroundThrottling(),false,'Old idempotent cleanup cannot overwrite current preparation');f.tick();f.tick();await opening;assert.deepEqual(editor.webContents.throttlingWrites,[false,true,false,true]);
});

test('incoming Campaign keeps the outgoing section and full coverage until the actual native adapter is ready',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finishShow,started=false;
 const ready=new Promise(resolve=>finishShow=resolve);
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){started=true;return ready;},suspend(){},hide(){}}});
 await f.hub.select('general');const selecting=f.hub.select('campaign');await new Promise(resolve=>setImmediate(resolve));
 try {assert.equal(started,true);assert.equal(f.hub.currentSection(),'general','A pending native mount must not commit Campaign');assert.equal(f.hub.view.bounds.width,580,'Outgoing Settings continues covering the whole panel');}
 finally {finishShow(true);await selecting;}
 assert.equal(f.hub.currentSection(),'campaign');assert.equal(f.hub.view.bounds.width,126);
});

for(const cancel of ['hidden','newer-section','unavailable','resize'])test('incoming Campaign cannot commit stale native readiness after '+cancel,async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finishShow,suspends=0;
 f.hub.configure({translation:manager,instructions:manager,campaign:{show:()=>new Promise(resolve=>finishShow=resolve),suspend(){suspends++;},hide(){}}});
 await f.hub.select('general');const selecting=f.hub.select('campaign');await new Promise(resolve=>setImmediate(resolve));
 if(cancel==='hidden')f.hub.setVisible(false);
 if(cancel==='newer-section')await f.hub.select('music');
 if(cancel==='unavailable')f.hub.setCampaignAvailable(false);
 if(cancel==='resize')f.hub.layout({x:0,y:32,width:620,height:740});
 assert.ok(suspends>0,'Cancelling pending native readiness immediately suspends the adapter so its wait can release');finishShow(true);await selecting;assert.notEqual(f.hub.currentSection(),'campaign','Cancelled native readiness cannot select Campaign');if(cancel==='hidden')assert.equal(f.hub.view.getVisible(),false);
});

test('hiding during the outgoing surface paint phase cancels its owned wait before native Campaign launch',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finish,showCalls=0,cancelled=false;
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){showCalls++;},suspend(){},hide(){}}});await f.hub.select('general');
 f.hub.view.webContents.executeJavaScript=source=>{if(source.startsWith('(()=>{const wait=')&&!source.includes('wait.expected=')){cancelled=true;finish(false);return Promise.resolve(true);}return new Promise(resolve=>finish=resolve);};
 const selecting=f.hub.select('campaign',()=>{});await new Promise(resolve=>setImmediate(resolve));f.hub.setVisible(false);
 try {assert.equal(cancelled,true,'Closing Settings immediately disconnects the outgoing paint observer and RAF');}
 finally {finish(false);await selecting;}
 assert.equal(showCalls,0);assert.equal(f.hub.currentSection(),'general');assert.equal(f.hub.view.getVisible(),false);
});

test('generic Settings resolves committed section before reopening and keeps explicit navigation',async()=>{
 const f=fixture();assert.equal(f.hub.resolveSettingsSection(),'general');
 const manager={setSettingsOpener(){},getSettings:()=>({enabled:false,showOriginal:false})};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show:()=>true,suspend(){},hide(){}}});
 assert.equal(f.hub.resolveSettingsSection(),'campaign','First Campaign entry preserves its current default');
 await f.hub.select('appearance');f.hub.setVisible(false);
 await f.hub.select(f.hub.resolveSettingsSection());assert.equal(f.hub.currentSection(),'appearance');
 await f.hub.select('music');assert.equal(f.hub.resolveSettingsSection(),'music','Explicit feature selection commits and remembers itself');
 await f.hub.select('campaign');f.hub.setCampaignAvailable(false);assert.equal(f.hub.resolveSettingsSection(),'general');
 f.general.lastSettingsSection='combat';assert.equal(f.hub.resolveSettingsSection(),'general');
});
test('failed and canceled preparation cannot replace remembered committed section',async()=>{
 const f=fixture();await f.hub.select('general');
 f.hub.view.webContents.executeJavaScript=()=>Promise.resolve(false);
 const manager={setSettingsOpener(){},getSettings:()=>({enabled:false,showOriginal:false})};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show:()=>false,suspend(){},hide(){}}});
 await f.hub.select('campaign',()=>{});assert.deepEqual(f.remembered,['general']);
 f.hub.view.webContents.executeJavaScript=()=>Promise.resolve(true);await f.hub.select('campaign',()=>{});assert.deepEqual(f.remembered,['general'],'Native readiness failure cannot be remembered');
 let release;f.hub.view.webContents.executeJavaScript=source=>{if(source.includes('wait.finish(false)')&&!source.startsWith('new Promise')){release?.(false);return Promise.resolve(true);}return new Promise(resolve=>release=resolve);};
 const pending=f.hub.select('campaign',()=>{});await new Promise(resolve=>setImmediate(resolve));
 f.hub.setVisible(false);release(false);await pending;assert.deepEqual(f.remembered,['general']);
});

for(const section of ['general','appearance'])test('first '+section+' paints its actual surface before passive reservation and dock promotion',async()=>{
 const f=fixture(),trace=[],manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finishReserve;
 f.hub.configure({translation:manager,instructions:manager,campaign:{reserve:b=>{trace.push(['reserve',b]);assert.equal(f.hub.view.getVisible(),true);assert.equal(f.hub.preparing.section,section);assert.equal(f.hub.preparing.staged,true);if(section==='appearance')assert.equal(f.created[0].getVisible(),true);return new Promise(resolve=>finishReserve=resolve);},show(){throw Error('Local section must not launch Campaign');},suspend(){},hide(){}}});
 const opening=f.hub.select(section,()=>trace.push(['promote']));await flush();assert.equal(trace.length,1);assert.equal(f.hub.hasCampaignReservation(),false);assert.deepEqual(f.remembered,[]);finishReserve(true);await opening;assert.equal(f.hub.hasCampaignReservation(),true);assert.deepEqual(trace.map(x=>x[0]),['reserve','promote']);assert.deepEqual(f.remembered,[section]);
 f.hub.layout({...f.hub.bounds});f.hub.layout({...f.hub.bounds});assert.equal(trace.length,2,'Unchanged layout does not enqueue reserve over native preparation');
});
for(const ending of ['hidden','unavailable','resize','navigation','destroyed','closed'])test('pending passive reservation cannot revive after '+ending,async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finishReserve,hides=0,promoted=0;
 f.hub.configure({translation:manager,instructions:manager,campaign:{reserve:()=>new Promise(resolve=>finishReserve=resolve),show(){throw Error('Unexpected launch');},suspend(){},hide(){hides++;}}});
 const opening=f.hub.select('general',()=>promoted++);await flush();assert.equal(typeof finishReserve,'function');
 if(ending==='hidden')f.hub.setVisible(false);if(ending==='unavailable')f.hub.setCampaignAvailable(false);if(ending==='resize')f.hub.layout({x:0,y:32,width:620,height:740});if(ending==='navigation')f.hub.view.webContents.emit('did-navigate');if(ending==='destroyed'){f.hub.view.webContents.destroyed=true;f.hub.view.webContents.emit('destroyed');}if(ending==='closed')f.window.emit('closed');
 finishReserve(true);await opening;assert.equal(hides,1,'Cancel invalidates exactly the pending adapter request');assert.equal(promoted,0);assert.equal(f.hub.hasCampaignReservation(),false);assert.deepEqual(f.remembered,[]);assert.equal(f.hub.view.getVisible(),false);
});
test('stale reservation result cannot hide or replace a newer reserved section',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}},pending=[];let hides=0;
 f.hub.configure({translation:manager,instructions:manager,campaign:{reserve:()=>new Promise(resolve=>pending.push(resolve)),show(){},suspend(){},hide(){hides++;}}});
 const older=f.hub.select('general');await flush();const newer=f.hub.select('music');await flush();assert.equal(pending.length,2);pending[1](true);await newer;const before=hides;pending[0](false);await older;assert.equal(hides,before);assert.equal(f.hub.currentSection(),'music');assert.equal(f.hub.hasCampaignReservation(),true);assert.deepEqual(f.remembered,['music']);
});
test('direct first Campaign stages only Campaign navigation, remembers only after native readiness',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finishShow;
 f.hub.configure({translation:manager,instructions:manager,campaign:{reserve(){throw Error('No passive gutter before direct native adoption');},show:()=>new Promise(resolve=>finishShow=resolve),suspend(){},hide(){}}});
 const opening=f.hub.select('campaign');await flush();const sender=f.hub.view.webContents;assert.equal(handlers.get('settings-hub:get')({sender,senderFrame:sender.mainFrame}).section,'campaign');assert.equal(f.hub.view.bounds.width,126);assert.equal(f.created.length,0);assert.deepEqual(f.remembered,[]);finishShow(true);await opening;assert.equal(f.hub.hasCampaignReservation(),true);assert.deepEqual(f.remembered,['campaign']);
});

test('failed native readiness preserves General and direct failure falls back to General',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let shows=0;
 f.hub.configure({translation:manager,instructions:manager,campaign:{reserve:async()=>false,show:()=>{shows++;return false;},suspend(){},hide(){}}});
 await f.hub.select('campaign');assert.equal(shows,1,'Unavailable native workspace is handled through actual adapter readiness');assert.equal(f.hub.currentSection(),'general');assert.equal(f.hub.hasCampaignReservation(),false);assert.deepEqual(f.remembered,['general']);assert.equal(f.hub.view.bounds.width,580);
 await f.hub.select('campaign');assert.equal(f.hub.currentSection(),'general');assert.deepEqual(f.remembered,['general'],'Failed incoming Campaign preserves the committed General section');
});

test('unsupported passive workspace preserves native Campaign capability and commits full website before mount',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}},trace=[];let finishShow;
 f.hub.configure({translation:manager,instructions:manager,campaign:{reserve:async()=>false,show:b=>{trace.push(['show',b]);return new Promise(resolve=>finishShow=resolve);},suspend(){},hide(){}}});
 await f.hub.select('general');assert.equal(f.hub.hasCampaignReservation(),false);assert.equal(f.hub.view.bounds.width,580);
 const opening=f.hub.select('campaign',()=>trace.push(['layout',f.hub.hasRetainedCampaign()]));await flush();assert.deepEqual(trace.map(row=>row[0]),['layout','show']);assert.equal(trace[0][1],true);assert.equal(trace[1][1].x,126);assert.equal(f.hub.currentSection(),'general');assert.equal(f.hub.view.bounds.width,580);finishShow(true);await opening;assert.equal(f.hub.currentSection(),'campaign');assert.equal(f.hub.view.bounds.width,126);assert.deepEqual(f.remembered,['general','campaign']);
});

test('direct Campaign without passive workspace opens native form with its own navigation',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finishShow;const trace=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{reserve:async()=>false,show:b=>{trace.push(['show',b]);return new Promise(resolve=>finishShow=resolve);},suspend(){},hide(){}}});
 const opening=f.hub.select('campaign',()=>trace.push(['layout']));await flush();assert.equal(f.hub.view.bounds.width,126);assert.equal(f.created.length,0);assert.deepEqual(trace.map(row=>row[0]),['show']);assert.equal(trace[0][1].x,126);assert.equal(trace[0][1].width,454);assert.deepEqual(f.remembered,[]);finishShow(true);await opening;assert.equal(f.hub.currentSection(),'campaign');assert.deepEqual(f.remembered,['campaign']);
});

test('coherent Campaign keeps local rail hidden through preparation and only accepts the committed ticket',async()=>{
 const f=fixture(),trace=[],manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let release,model;
 f.hub.configure({translation:manager,instructions:manager,campaign:{prepare:(bounds,navigation)=>{model=navigation;trace.push('prepare');return new Promise(resolve=>release=resolve);},reveal:async(bounds,ticket)=>{assert.equal(ticket,model.ticket);trace.push('reveal');return true;},show:()=>{trace.push('show');return true;},suspend:()=>trace.push('suspend'),hide:()=>trace.push('hide')}});
 const opening=f.hub.select('campaign',()=>trace.push('commit'));await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(trace,['prepare']);assert.equal(f.hub.view.getVisible(),false);assert.equal(f.hub.isVisible(),false);assert.equal(f.remembered.length,0);assert.equal(f.hub.canNavigateCampaignSection('general',model.ticket),false);
 assert.match(model.ticket,/^[A-Za-z0-9_-]{1,128}$/);assert.equal(model.destinations.includes('combat'),false);
 release(true);await opening;assert.deepEqual(trace,['prepare','reveal','commit']);assert.equal(f.hub.view.getVisible(),false);assert.equal(f.hub.canNavigateCampaignSection('general','stale'),false);assert.equal(f.hub.canNavigateCampaignSection('general',model.ticket),true);assert.deepEqual(f.remembered,['campaign']);
 const old=model.ticket;assert.equal(f.hub.consumeCampaignNavigation('general',old),true);assert.equal(f.hub.consumeCampaignNavigation('general',old),false);assert.equal(f.hub.canNavigateCampaignSection('general',old),false);await f.hub.select('general');assert.equal(f.hub.view.getVisible(),true);assert.equal(f.hub.canNavigateCampaignSection('general',old),false);assert.equal(trace.at(-1),'suspend');
});
test('close or a newer local request invalidates prepared Campaign before late success can reveal it',async()=>{
 for(const cancel of [f=>f.hub.setVisible(false),f=>f.hub.select('general')]){
  const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let release,reveals=0;
  f.hub.configure({translation:manager,instructions:manager,campaign:{prepare:()=>new Promise(resolve=>release=resolve),reveal:async()=>{reveals++;return true;},show(){},suspend(){},hide(){}}});
  const opening=f.hub.select('campaign');await new Promise(resolve=>setImmediate(resolve));await cancel(f);release(true);await opening;assert.equal(reveals,0);assert.equal(f.hub.view.getVisible(),f.hub.currentSection()==='general');assert.ok(!f.remembered.includes('campaign'));
 }
});

test('first-painted navigation consumes only the eligible revealing ticket and cancels late reveal history',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let finishReveal,model,reachedReveal=false;
 f.hub.configure({translation:manager,instructions:manager,campaign:{prepare:async(bounds,navigation)=>{model=navigation;assert.equal(f.hub.canNavigateCampaignSection('general',model.ticket),false);return true;},reveal:()=>{reachedReveal=true;return new Promise(resolve=>finishReveal=resolve);},show(){},suspend(){},hide(){}}});
 const opening=f.hub.select('campaign');await new Promise(resolve=>setImmediate(resolve));assert.equal(reachedReveal,true);
 assert.equal(f.hub.consumeCampaignNavigation('general','stale'),false);assert.equal(f.hub.consumeCampaignNavigation('general',model.ticket),true);assert.equal(f.hub.consumeCampaignNavigation('general',model.ticket),false);
 await f.hub.select('general');finishReveal(true);await opening;
 assert.equal(f.hub.currentSection(),'general');assert.deepEqual(f.remembered,['general']);assert.equal(f.hub.view.getVisible(),true);
});

test('direct local navigation invalidates Campaign ticket before awaiting a cold editor load',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let model,release;
 const editor=new View();editor.webContents.loadURL=url=>{editor.webContents.mainFrame.url=url;return new Promise(resolve=>release=resolve);};
 f.hub.configure({translation:{...manager,createPanel:()=>editor},instructions:manager,campaign:{prepare:async(bounds,navigation)=>{model=navigation;return true;},reveal:async()=>true,show(){},suspend(){},hide(){}}});
 await f.hub.select('campaign');assert.equal(f.hub.canNavigateCampaignSection('general',model.ticket),true);
 const local=f.hub.select('translation');assert.equal(f.hub.canNavigateCampaignSection('general',model.ticket),false,'Ticket is consumed synchronously before any local load await');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.hub.consumeCampaignNavigation('general',model.ticket),false);release();await local;assert.equal(f.hub.currentSection(),'translation');
});
test('Dock rejects Campaign navigation while a local opening owns the next operation',async()=>{
 const f=fixture(),manager={getSettings:()=>({enabled:false,showOriginal:false}),setSettingsOpener(){}};let model,opens=0;
 f.hub.configure({translation:manager,instructions:manager,campaign:{prepare:async(bounds,navigation)=>{model=navigation;return true;},reveal:async()=>true,show(){},suspend(){},hide(){}}});await f.hub.select('campaign');
 const {AppearanceDock}=require('../../dist/shell/appearance-dock');const dock=Object.create(AppearanceDock.prototype);dock.window=f.window;dock.hub=f.hub;dock.opened=true;dock.opening=true;dock.openingSection='general';dock.openSection=async()=>{opens++;};
 assert.equal(await dock.navigateCampaignSection('general',model.ticket),false);assert.equal(opens,0);assert.equal(f.hub.canNavigateCampaignSection('general',model.ticket),true,'Rejected dispatch cannot consume another operation ticket');
 dock.opening=false;assert.equal(await dock.navigateCampaignSection('general',model.ticket),true);assert.equal(opens,1);assert.equal(await dock.navigateCampaignSection('general',model.ticket),false);assert.equal(opens,1);
});
