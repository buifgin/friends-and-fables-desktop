const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),Module=require('node:module');
const handlers=new Map();
class Contents extends EventEmitter{constructor(){super();this.mainFrame={origin:'fables-desktop://settings',url:''};this.destroyed=false;}loadURL(url){this.mainFrame.url=url;return Promise.resolve();}setWindowOpenHandler(){}getURL(){return this.mainFrame.url;}executeJavaScript(source){return Promise.resolve(source.includes('data-ff-appearance-rendered')?{ready:true,locale:'en',preset:'custom',customColor:'#234567'}:true);}isDestroyed(){return this.destroyed;}send(){}focus(){}close(){this.destroyed=true;}}
class View{constructor(options){this.options=options;this.webContents=new Contents();}setVisible(v){this.visible=v;}getVisible(){return this.visible;}setBounds(b){this.bounds=b;}setBackgroundColor(){}}
const original=Module._load;Module._load=function(name,...args){if(name==='electron')return {WebContentsView:View,ipcMain:{handle:(n,f)=>handlers.set(n,f),removeHandler:n=>handlers.delete(n)}};return original.call(this,name,...args);};
const {SettingsHub,SETTINGS_HUB_URL}=require('../../dist/settings/settings-hub');Module._load=original;
function fixture(){handlers.clear();const window=new EventEmitter();window.contentView={addChildView(){}};window.isDestroyed=()=>false;window.isFullScreen=()=>false;const created=[];const appearance={getLocale:()=> 'en',getSettings:()=>({preset:'custom',customColor:'#234567'}),createPanel:()=>{const v=new View();created.push(v);return v;}};let hub,closed=0;hub=new SettingsHub(window,appearance,{hideDesktopTopbarInFullscreen:false,save:async()=>{}},()=>{closed++;hub.setVisible(false);},()=>{},s=>hub.select(s));const manager={createPanel:()=>{const v=new View();created.push(v);return v;},setSettingsOpener(){}};hub.configure({translation:manager,instructions:manager});hub.layout({x:0,y:32,width:580,height:700});return {hub,window,created,get closed(){return closed;}};}
test('section switches retain editor view identity and unsaved state',async()=>{const f=fixture();await f.hub.select('appearance');const first=f.created[0];first.webContents.unsaved='draft';await f.hub.select('translation');assert.equal(first.visible,false);await f.hub.select('appearance');assert.equal(f.created.length,2);assert.equal(first.visible,true);assert.equal(first.webContents.unsaved,'draft');assert.deepEqual(first.bounds,{x:126,y:32,width:454,height:700});f.hub.setVisible(false);assert.ok(f.created.every(v=>!v.visible));});
test('navigation IPC rejects website, subframe, wrong route and invalid section',async()=>{const {hub}=fixture(),invoke=handlers.get('settings-hub:get');const sender=hub.view.webContents;const event={sender,senderFrame:sender.mainFrame};assert.equal(invoke(event).section,'appearance');assert.deepEqual(invoke(event).theme,{preset:'custom',customColor:'#234567'},'The hub receives the selected theme for palette rendering.');assert.throws(()=>invoke({sender:new Contents(),senderFrame:sender.mainFrame}));assert.throws(()=>invoke({sender,senderFrame:{...sender.mainFrame}}));const old=sender.mainFrame.url;sender.mainFrame.url=SETTINGS_HUB_URL+'?bypass';assert.throws(()=>invoke(event));sender.mainFrame.url=old;assert.throws(()=>handlers.get('settings-hub:select')(event,'../translation'));assert.throws(()=>invoke({sender,senderFrame:null}));});
test('campaign cannot open without native adapter and music creates no player',async()=>{const f=fixture();await assert.rejects(f.hub.select('campaign'),/not connected/);await f.hub.select('music');assert.equal(f.created.length,0);});
test('native campaign adapter receives content bounds and host covers nav only',async()=>{const f=fixture(),shown=[],manager={setSettingsOpener(){}};let hidden=0;f.hub.configure({translation:manager,instructions:manager,campaign:{suspend(){},show:b=>shown.push(b),hide:()=>hidden++}});await f.hub.select('campaign');assert.deepEqual(shown.at(-1),{x:126,y:32,width:454,height:700});assert.equal(f.hub.view.bounds.width,126);assert.equal(hidden,0);await f.hub.select('campaign');f.hub.layout({x:0,y:32,width:580,height:700});assert.equal(hidden,0);assert.equal(shown.length,1,'Repeated selection/layout does not relaunch native Campaign');await f.hub.select('general');assert.equal(hidden,0);assert.equal(f.hub.hasRetainedCampaign(),true);f.hub.setVisible(false);assert.equal(hidden,1);assert.equal(f.hub.view.bounds.width,580);});
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
 const f=fixture(),manager={setSettingsOpener(){}},shown=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{suspend(){},show:b=>shown.push(b),hide(){}}});
 f.hub.setCampaignAvailable(false);
 const sender=f.hub.view.webContents,event={sender,senderFrame:sender.mainFrame};
 assert.equal(handlers.get('settings-hub:get')(event).campaignAvailable,false);
 await assert.rejects(f.hub.select('campaign'),/not available/);await assert.rejects(f.hub.select('combat'),/not available/);
 f.hub.setCampaignAvailable(true);await f.hub.select('campaign');assert.equal(shown.length,1);
});

test('outer website geometry commits before Campaign adapter mounts and active theme refresh does not reopen',async()=>{
 const f=fixture(),manager={setSettingsOpener(){}},trace=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{suspend(){},show:b=>trace.push(['show',b]),hide:()=>trace.push(['hide'])}});
 await f.hub.select('campaign',()=>trace.push(['website-strip-committed']));
 assert.deepEqual(trace.map(x=>x[0]),['website-strip-committed','show']);
 f.hub.refreshCampaign();assert.deepEqual(trace.map(x=>x[0]),['website-strip-committed','show','show']);
 await f.hub.select('campaign');assert.equal(trace.length,3,'Repeated selection preserves mounted native section');
 await f.hub.select('general');f.hub.refreshCampaign();assert.equal(trace.length,3,'Off-section theme update cannot mount Campaign');
});


test('Campaign to Translation/General and back retains adapter and reservation until hub close',async()=>{
 const f=fixture(),trace=[],manager={createPanel:()=>new View(),setSettingsOpener(){}};
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
 const f=fixture(),manager={setSettingsOpener(){}},trace=[];
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend:()=>trace.push('suspend'),hide:()=>trace.push('dispose')}});
 await f.hub.select('campaign');await f.hub.select('general');f.hub.setCampaignAvailable(false);f.hub.setVisible(false);
 assert.deepEqual(trace,['suspend','dispose']);assert.equal(f.hub.hasRetainedCampaign(),false);await assert.rejects(f.hub.select('campaign'),/not available/);
});


test('actual Settings dock keeps website bounds across native Campaign cross-switches and restores full width on close/departure',async()=>{
 handlers.clear();
 class Controls{sync(){}layout(){}setVisible(){}raise(){}}
 class General{hideDesktopTopbarInFullscreen=false;initialize(){return Promise.resolve();}flush(){return Promise.resolve();}}
 Module._load=function(name,...args){
  if(name==='electron')return {WebContentsView:View,ipcMain:{handle:(n,f)=>handlers.set(n,f),removeHandler:n=>handlers.delete(n)}};
  if(name==='./window-controls')return {WindowControls:Controls};
  if(name==='../settings/general-settings')return {GeneralSettings:General};
  return original.call(this,name,...args);
 };
 let AppearanceDock;try{({AppearanceDock}=require('../../dist/shell/appearance-dock'));}finally{Module._load=original;}
 const window=new EventEmitter();window.isDestroyed=()=>false;window.isFullScreen=()=>false;window.getContentSize=()=>[1280,800];window.setMenuBarVisibility=()=>{};window.contentView={addChildView(){}};
 const website=new View(),history=[];website.setBounds=b=>{website.bounds=b;history.push({...b});};
 const appearance={getLocale:()=> 'en',getSettings:()=>({preset:'custom',customColor:'#234567',appearancePanelWidth:580}),createPanel:()=>new View()};
 const dock=new AppearanceDock(window,website,appearance),trace=[],manager={createPanel:()=>new View(),setSettingsOpener(){}};
 dock.configureSettings({translation:manager,instructions:manager,campaign:{show:b=>trace.push(['show',b]),suspend:b=>trace.push(['suspend',b]),hide:()=>trace.push(['dispose'])}});
 await dock.openSection('general');assert.deepEqual(website.bounds,{x:580,y:32,width:700,height:768});
 await dock.openSection('campaign');const reserved={...website.bounds};assert.deepEqual(reserved,{x:126,y:32,width:1154,height:768});
 history.length=0;
 for(const section of ['translation','general']){await dock.openSection(section);await dock.openSection('campaign');}
 assert.ok(history.length>0);assert.ok(history.every(b=>JSON.stringify(b)===JSON.stringify(reserved)),'Every actual dock layout preserves reserved website bounds');
 assert.deepEqual(trace.map(x=>x[0]),['show','suspend','show','suspend','show']);assert.ok(trace.filter(x=>x[0]!=='dispose').every(x=>x[1].width===454));
 await dock.openSection('general');dock.hide();assert.deepEqual(website.bounds,{x:0,y:32,width:1280,height:768});assert.equal(trace.filter(x=>x[0]==='dispose').length,1);
 await dock.openSection('campaign');await dock.openSection('general');await dock.setCampaignAvailable(false);
 assert.deepEqual(website.bounds,{x:580,y:32,width:700,height:768});assert.equal(trace.filter(x=>x[0]==='dispose').length,2);dock.hide();assert.equal(trace.filter(x=>x[0]==='dispose').length,2);
});

test('Campaign remains committed until the exact local renderer completes target state',async()=>{
 const f=fixture(),trace=[],manager={setSettingsOpener(){}};
 f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){trace.push('suspend');},hide(){}}});
 await f.hub.select('campaign');const nativeBounds={...f.hub.view.bounds};let finishReady;
 f.hub.view.webContents.executeJavaScript=source=>{assert.match(source,/data-ff-settings-rendered/);return source.includes('const advance=')?Promise.resolve(true):new Promise(resolve=>finishReady=resolve);};
 const switching=f.hub.select('general',()=>trace.push('layout'));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.hub.currentSection(),'campaign');assert.deepEqual(f.hub.view.bounds,nativeBounds);assert.deepEqual(trace,[]);
 const sender=f.hub.view.webContents;assert.equal(handlers.get('settings-hub:get')({sender,senderFrame:sender.mainFrame}).section,'general','Only prepared renderer state advances before native layout');
 finishReady(true);await switching;assert.equal(f.hub.currentSection(),'general');assert.equal(f.hub.view.bounds.width,580);assert.deepEqual(trace,['layout','suspend']);
});

for(const section of ['general','appearance'])for(const cancel of ['newer-section','hidden','unavailable','closed','wrong-url','new-document','not-rendered','renderer-error'])test(section+' pending ready cannot commit after '+cancel,async()=>{
 const f=fixture(),trace=[],manager={setSettingsOpener(){}};
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
 const vm=require('node:vm'),f=fixture(),manager={setSettingsOpener(){}};
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
 const f=fixture(),trace=[],manager={setSettingsOpener(){}};f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){trace.push('suspend');},hide(){}}});await f.hub.select('campaign');let finishPaint,canceled=false;
 f.hub.view.webContents.executeJavaScript=source=>{if(source.startsWith('(()=>{const wait=')){canceled=true;finishPaint(false);return Promise.resolve(true);}if(source.includes('const advance='))return new Promise((resolve,reject)=>finishPaint=value=>value==='error'?reject(Error('visible renderer unavailable')):resolve(value));return Promise.resolve(true);};
 const opening=f.hub.select('general',()=>trace.push('layout'));await new Promise(resolve=>setImmediate(resolve));assert.equal(f.hub.currentSection(),'campaign');assert.equal(f.hub.view.bounds.width,580,'Prepared visible hub resizes while committed native content remains');assert.deepEqual(trace,[]);
 if(cancel==='newer-section')await f.hub.select('campaign');if(cancel==='hidden')f.hub.setVisible(false);if(cancel==='unavailable')f.hub.setCampaignAvailable(false);if(cancel==='closed')f.window.emit('closed');if(cancel==='resize')f.hub.layout({x:0,y:32,width:640,height:710});
 finishPaint(cancel==='paint-error'?'error':false);await opening;assert.equal(f.hub.currentSection(),'campaign');assert.deepEqual(trace,[]);assert.equal(f.hub.preparing,undefined);
 if(['newer-section','hidden','unavailable','closed','resize'].includes(cancel))assert.equal(canceled,true,'Paint RAF/timer wait is canceled actively');
 if(cancel==='not-painted'||cancel==='paint-error')assert.equal(f.hub.view.bounds.width,126,'Failure restores prior committed geometry');
});

test('same-bounds layout and Campaign refresh preserve expanded preparation until visible paint completes',async()=>{
 const f=fixture(),trace=[],manager={setSettingsOpener(){}};f.hub.configure({translation:manager,instructions:manager,campaign:{show(){},suspend(){trace.push('suspend');},hide(){}}});await f.hub.select('campaign');let finishPaint;
 f.hub.view.webContents.executeJavaScript=source=>source.includes('const advance=')?new Promise(resolve=>finishPaint=resolve):Promise.resolve(true);
 const opening=f.hub.select('general');await new Promise(resolve=>setImmediate(resolve));f.hub.layout({x:0,y:32,width:580,height:700});assert.equal(f.hub.view.bounds.width,580);f.hub.refreshCampaign();assert.equal(f.hub.view.bounds.width,580);assert.equal(f.hub.currentSection(),'campaign');assert.deepEqual(trace,[]);
 finishPaint(true);await opening;assert.equal(f.hub.currentSection(),'general');assert.deepEqual(trace,['suspend']);
});

test('accepted Appearance state readiness waits for interactive initial settlement, follows locale without draft replay, rejects stale preferences independently',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{DEFAULT_APPEARANCE}=require('../../dist/appearance/themes');
 const source=fs.readFileSync(path.join(__dirname,'../../assets/appearance/appearance.js'),'utf8'),start=source.indexOf('function markRendered()'),end=source.indexOf('function appearanceError('),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false,hidden:false,disabled:false,classList:{toggle(){}},querySelectorAll:()=>[]});return nodes.get(id);};
 const root={lang:'en',attributes:{},setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name]??null;}};
 const context={busy:true,renderedSettings:undefined,appliedRevision:-1,appliedLocaleRevision:-1,roles:[],canUndoReset:false,panelWidth:0,panelNavigationWidth:0,customColor:'#161616',backgroundImage:null,backgroundName:'',imagePreview:null,form:{elements:{preset:{value:'website'}}},colorInput:node('custom-color'),hexInput:node('custom-hex'),element:node,document:{documentElement:root,body:{classList:{toggle(){}}}},window:{settingsLocale:{set:locale=>root.lang=locale}},showThemes(){},readDicePalette(){}};
 vm.createContext(context);context.updatePreview=()=>{node('theme-options').disabled=context.busy;context.markRendered();};vm.runInContext(source.slice(start,end),context);
 const state={...structuredClone(DEFAULT_APPEARANCE),preset:'custom',customColor:'#203040',locale:'en',localeRevision:0,revision:0,platform:'linux'};
 context.showSettings(state);assert.equal(root.getAttribute('data-ff-appearance-rendered'),null,'A notification while initial get is pending cannot advertise loading controls');assert.equal(node('theme-options').disabled,true);
 context.applyInterfaceLocale({locale:'ru',localeRevision:1});assert.equal(root.lang,'ru');assert.equal(root.getAttribute('data-ff-appearance-rendered'),null,'Interface locale alone cannot make initial preferences interactive');
 context.busy=false;context.showSettings(state);assert.equal(context.form.elements.preset.value,'custom');assert.equal(context.hexInput.value,'#203040');assert.equal(node('theme-options').disabled,false);let ready=JSON.parse(root.getAttribute('data-ff-appearance-rendered'));assert.equal(ready.locale,'ru');assert.equal(ready.localeRevision,1,'Old locale metadata cannot discard fresh initial preference fields');
 context.hexInput.value='#345678';node('theme-name').value='unsaved draft';context.applyInterfaceLocale({locale:'en',localeRevision:2});ready=JSON.parse(root.getAttribute('data-ff-appearance-rendered'));assert.equal(ready.locale,'en');assert.equal(context.hexInput.value,'#345678');assert.equal(node('theme-name').value,'unsaved draft','Interface readiness refresh preserves local drafts');
 context.busy=true;context.showSettings({...state,customColor:'#456789',revision:2,localeRevision:2});context.busy=false;context.showSettings({...state,customColor:'#203040',revision:1,localeRevision:0});assert.equal(context.hexInput.value,'#456789');assert.equal(node('theme-options').disabled,false);ready=JSON.parse(root.getAttribute('data-ff-appearance-rendered'));assert.equal(ready.revision,2);assert.equal(ready.customColor,'#456789','Initial settlement unlocks newest accepted preferences without overwriting them with stale data');
});

test('pending Appearance follows latest expected provider on update and cannot commit returned older ready metadata',async()=>{
 const vm=require('node:vm'),f=fixture();let locale='en',customColor='#234567',marker=null;f.hub.appearance.getLocale=()=>locale;f.hub.appearance.getSettings=()=>({preset:'custom',customColor});await f.hub.select('general');
 const observers=new Set(),timers=new Map(),context={window:{},document:{documentElement:{getAttribute:()=>marker}},requestAnimationFrame:()=>{},cancelAnimationFrame(){},MutationObserver:class{constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}},setTimeout(callback){const id={};timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);}};
 const create=f.hub.appearance.createPanel;f.hub.appearance.createPanel=()=>{const view=create();view.webContents.executeJavaScript=source=>Promise.resolve(vm.runInNewContext(source,context));return view;};
 let opening=f.hub.select('appearance');await new Promise(resolve=>setImmediate(resolve));locale='ru';customColor='#345678';f.hub.update();marker=JSON.stringify({locale:'en',preset:'custom',customColor:'#234567'});for(const observer of observers)observer.callback();assert.equal(f.hub.currentSection(),'general');assert.equal(observers.size,1);marker=JSON.stringify({locale,preset:'custom',customColor});for(const observer of observers)observer.callback();await opening;assert.equal(f.hub.currentSection(),'appearance');assert.equal(observers.size,0);assert.equal(timers.size,0);
 await f.hub.select('general');let finish;f.created[0].webContents.executeJavaScript=()=>new Promise(resolve=>finish=resolve);opening=f.hub.select('appearance');await new Promise(resolve=>setImmediate(resolve));finish({ready:true,locale,preset:'custom',customColor});customColor='#567890';await opening;assert.equal(f.hub.currentSection(),'general','Provider changed after renderer response; old ready result cannot commit');assert.equal(f.hub.preparing,undefined);
});
