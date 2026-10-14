// Root-scheduled isolated CPU/X11 fixture. Never run on the user's desktop.
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const websiteHtml=`<!doctype html><style>html,body{margin:0;height:100%;background:#5a1020;color:white}#campaign{position:absolute;left:0;top:0;width:454px;height:660px;overflow:auto;background:#203040}h2{margin:22px}textarea{margin:22px;width:300px}#native-marker{position:sticky;top:0;display:block;margin-left:300px;width:18px;height:18px;background:#217a4d}#spacer{height:1200px}</style><aside id="campaign"><span id="native-marker"></span><h2>Native Campaign settings</h2><textarea>native campaign draft</textarea><div id="spacer">Native form retained</div></aside>`;
const scripts={
 website:`window.originalCampaign=document.querySelector('#campaign');originalCampaign.scrollTop=113;window.originalDraft=originalCampaign.querySelector('textarea');window.originalDraftValue=originalDraft.value;true`,
 websiteSnapshot:`(()=>{const node=document.querySelector('#campaign'),r=node.getBoundingClientRect(),s=getComputedStyle(node);return {same:node===originalCampaign,connected:node.isConnected,scroll:node.scrollTop,draftSame:node.querySelector('textarea')===originalDraft,draft:originalDraft.value,visibility:s.visibility,pointer:s.pointerEvents,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`,
 hubSnapshot:`(()=>{const content=document.querySelector('#content'),heading=document.querySelector('#general h1'),r=heading.getBoundingClientRect();return {url:location.href,bridge:typeof window.settingsHub,section:document.querySelector('[aria-current="page"]')?.textContent,contentHidden:content.hidden,generalHidden:document.querySelector('#general').hidden,locale:document.documentElement.lang,background:getComputedStyle(document.body).backgroundColor,theme:document.documentElement.style.getPropertyValue('--ui-bg'),heading:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`,
 editorSnapshot:`(()=>{const form=document.querySelector('#appearance-form'),r=form.getBoundingClientRect();return {url:location.href,bridge:typeof window.appearance,status:document.querySelector('#status').textContent,disabled:document.querySelector('#theme-options').disabled,locale:document.documentElement.lang,heading:document.querySelector('h1').textContent,ready:document.documentElement.getAttribute('data-ff-appearance-rendered'),theme:document.documentElement.style.getPropertyValue('--ui-bg'),preset:form.elements.preset.value,hex:document.querySelector('#custom-hex').value,draft:document.querySelector('#theme-name').value,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`,
 frame:`new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Visible RAF budget exhausted')),1200);requestAnimationFrame(()=>{clearTimeout(timer);resolve(performance.now())})})`,
};
for(const source of Object.values(scripts))new vm.Script(source);
if(!process.versions.electron){module.exports={scripts,websiteHtml};}else{
 const stage=name=>console.log('Settings paint stage '+name+' '+performance.now());stage('native entry');
 const fs=require('node:fs/promises'),os=require('node:os'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
 const exec=promisify(execFile),{app,BrowserWindow,WebContentsView,session,nativeImage}=require('electron');
 const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
 const {AppearanceManager,registerAppearanceScheme}=require(path.join(root,'dist/appearance/appearance'));
 const {DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
 const {SettingsHub,SETTINGS_HUB_URL}=require(path.join(root,'dist/settings/settings-hub'));
 const {GeneralSettings}=require(path.join(root,'dist/settings/general-settings'));
 stage('dependencies loaded');registerAppearanceScheme();app.on('window-all-closed',()=>{});
 let window,profile,evidence,manager;const samples=[],failures=[],trace=[];
 const timeout=setTimeout(()=>{console.error('Settings paint fixture bounded timeout');window?.destroy();app.exit(1)},30000);
 const js=(contents,source)=>{new vm.Script(source);return contents.executeJavaScript(source)};
 const frame=contents=>js(contents,scripts.frame);
 async function until(contents,source){for(let n=0;n<100;n++){if(await js(contents,source))return;await new Promise(r=>setTimeout(r,10))}throw Error('Settings fixture readiness: '+source)}
 function deferred(){let resolve;return {promise:new Promise(r=>resolve=r),resolve:()=>resolve()}}
 function color(image,x,y){const b=image.toBitmap(),w=image.getSize().width,i=(Math.floor(y)*w+Math.floor(x))*4;return [b[i+2],b[i+1],b[i]]}
 function glyphs(image,rect){const size=image.getSize(),left=Math.max(0,Math.ceil(rect.x)),top=Math.max(0,Math.ceil(rect.y)),width=Math.min(Math.floor(rect.width),size.width-left),height=Math.min(Math.floor(rect.height),size.height-top);if(width<=0||height<=0)return 0;const crop=image.crop({x:left,y:top,width,height}),pixels=crop.toBitmap(),colors=new Map();for(let i=0;i<pixels.length;i+=4){const c=pixels.readUInt32LE(i);colors.set(c,(colors.get(c)||0)+1)}return pixels.length/4-Math.max(...colors.values())}
 async function ownX11Capture(){assert.ok(process.env.DISPLAY,'Root private X11 display required');assert.equal(Boolean(process.env.WAYLAND_DISPLAY),false,'No host Wayland surface');const handle=window.getNativeWindowHandle(),id=handle.length>=8?handle.readBigUInt64LE():BigInt(handle.readUInt32LE());assert.ok(id>0);trace.push({event:'own native window capture',id:'0x'+id.toString(16),display:process.env.DISPLAY,time:performance.now()});const {stdout}=await exec('/usr/bin/import',['-window','0x'+id.toString(16),'png:-'],{encoding:'buffer',maxBuffer:8*1024*1024,timeout:2000});return nativeImage.createFromBuffer(stdout)}
 async function save(name,image){await fs.writeFile(path.join(evidence,name+'.png'),image.toPNG())}
 async function runLocale(locale,cross=false){
  stage('locale '+locale+(cross?' general-cross':''));manager.setLocale(locale);window=new BrowserWindow({show:false,frame:false,width:1000,height:700,backgroundColor:'#ff00ff',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await window.loadURL('data:text/html,<style>html,body{margin:0;background:%23ff00ff}</style>');stage('parent loaded');
  const site=session.fromPartition('settings-paint-native-'+locale+(cross?'-cross':''));site.protocol.handle('https',request=>new URL(request.url).pathname==='/fixture/play'?new Response(websiteHtml,{headers:{'content-type':'text/html'}}):new Response('Not found',{status:404}));
  const website=new WebContentsView({webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});window.contentView.addChildView(website);website.setBounds({x:126,y:0,width:874,height:700});
  const websiteBounds=()=>website.getBounds();const retainedBounds=websiteBounds();let navigations=0;website.webContents.on('did-navigate',()=>navigations++);await website.webContents.loadURL('https://play.fables.gg/fixture/play');await js(website.webContents,scripts.website);stage('website loaded');const nativeNavigations=navigations;
  const general=new GeneralSettings();await general.initialize();let saveCalls=0;general.save=async()=>{saveCalls++;throw Error('Fixture must not save General preferences')};
  const originalSave=manager.save;manager.save=async()=>{saveCalls++;throw Error('Fixture must not save Appearance preferences')};
  let hub,editor,gatedUpdate=null,updateGate=false,initialGate=null,initialReadSeen=false;
  const create=manager.createPanel.bind(manager);manager.createPanel=parent=>{editor=create(parent);editor.webContents.on('console-message',details=>{if(details.level==='error'||details.level===3)console.error('Appearance renderer:',details.message)});return editor};
  const originalState=manager.state.bind(manager);manager.state=async contents=>{const state=await originalState(contents);if(initialGate&&!initialReadSeen&&contents===editor?.webContents){initialReadSeen=true;trace.push({locale,event:'trusted appearance:get state held',time:performance.now()});await initialGate.promise}return state};
  const adapter={show:async bounds=>{assert.equal(website.webContents.getURL(),'https://play.fables.gg/fixture/play');assert.deepEqual(websiteBounds(),retainedBounds);trace.push({locale,event:'campaign show',bounds,time:performance.now()});await js(website.webContents,`originalCampaign.style.visibility='visible';originalCampaign.style.pointerEvents='';true`)},suspend:bounds=>{trace.push({locale,event:'campaign suspend',bounds,time:performance.now()});void js(website.webContents,`originalCampaign.style.visibility='hidden';originalCampaign.style.pointerEvents='none';true`)},hide:()=>{}};
  const inert={setSettingsOpener(){},createPanel(){throw Error('Unassigned editor')}};
  hub=new SettingsHub(window,manager,general,()=>hub.setVisible(false),()=>{},section=>hub.select(section));hub.configure({translation:inert,instructions:inert,campaign:adapter});hub.setCampaignAvailable(true);hub.layout({x:0,y:0,width:580,height:700});
  const send=hub.view.webContents.send.bind(hub.view.webContents);hub.view.webContents.send=(channel,...args)=>{trace.push({locale,event:channel,section:args[0]?.section,time:performance.now()});if(updateGate&&channel==='settings-hub:update'){gatedUpdate={channel,args};return}send(channel,...args)};
  stage('hub constructed');window.showInactive();hub.view.webContents.focus();await hub.select('campaign');stage('campaign selected');await until(hub.view.webContents,`document.querySelector('[aria-current="page"]')?.textContent===${JSON.stringify(locale==='ru'?'Кампания':'Campaign')}`);await frame(hub.view.webContents);
  assert.equal(await js(hub.view.webContents,'document.hasFocus()'),true,'Fixture visible/focused for RAF');assert.equal(await js(hub.view.webContents,'typeof window.require'),'undefined','Settings sandbox has no Node bridge');assert.equal(hub.view.webContents.getURL(),SETTINGS_HUB_URL);
  // Validate composition rather than treating a parent page snapshot as child views.
  stage('composition validation');const parentImage=await window.capturePage(),siteImage=await website.webContents.capturePage(),composed=await ownX11Capture();
  const probe={locale,native:await js(website.webContents,scripts.websiteSnapshot),siteSize:siteImage.getSize(),parentSize:parentImage.getSize(),composedSize:composed.getSize(),sitePixel:color(siteImage,400,30),composedPixel:color(composed,526,30),greenPixel:color(composed,434,8)};console.log('Settings composition probe '+JSON.stringify(probe));trace.push({event:'composition probe',...probe});await save(locale+(cross?'-cross':'')+'-site-probe',siteImage);await save(locale+(cross?'-cross':'')+'-parent-probe',parentImage);await save(locale+(cross?'-cross':'')+'-composition-probe',composed);
  assert.deepEqual(color(siteImage,400,30),[32,48,64],'Native Campaign screenshot known sentinel');assert.deepEqual(color(composed,526,30),[32,48,64],'Exact X11 window capture includes actual native child surface');assert.deepEqual(color(composed,434,8),[33,122,77],'Composed capture proves visible retained native marker');
  const parentComposed=JSON.stringify(color(parentImage,526,30))===JSON.stringify([32,48,64]);trace.push({locale,event:'composition validation',parentComposed,windowSize:composed.getSize(),websiteBounds:retainedBounds});
  const capture=parentComposed?()=>window.capturePage():ownX11Capture;
  async function sample(label,section,index){
   await frame(hub.view.webContents);const campaign=await js(website.webContents,scripts.websiteSnapshot),hubState=await js(hub.view.webContents,scripts.hubSnapshot),editorState=editor&&!editor.webContents.isDestroyed()?await js(editor.webContents,scripts.editorSnapshot):null;
   const image=await capture(),hubBounds=hub.view.getBounds(),editorVisible=!!editor?.getVisible(),nativeVisible=campaign.visibility==='visible';
   const incomingReady=section==='general'?hubBounds.width>126&&!hubState.contentHidden&&!hubState.generalHidden:editorVisible&&editorState?.preset==='custom'&&editorState?.hex==='#203040'&&editorState?.theme==='#203040'&&editorState?.locale===locale&&editorState?.heading===(locale==='ru'?'Настройте под себя.':'Make it yours.');
   const generalGlyphs=hubBounds.width>126&&!hubState.contentHidden&&!hubState.generalHidden?glyphs(image,{...hubState.heading,x:hubState.heading.x+hubBounds.x,y:hubState.heading.y+hubBounds.y}):null;
   const nativePainted=JSON.stringify(color(image,434,8))===JSON.stringify([33,122,77]);
   const record={label,locale,index,section,time:performance.now(),hubBounds,websiteBounds:websiteBounds(),campaign,hub:hubState,editor:editorState,editorVisible,nativeVisible,nativePainted,incomingReady,generalGlyphs,contentPixel:color(image,426,30)};samples.push(record);console.log('Settings paint sample '+JSON.stringify(record));await save(locale+(cross?'-cross':'')+'-'+label+'-'+index,image);
   assert.equal(campaign.same&&campaign.connected&&campaign.draftSame,true,'Native Campaign node/draft identity remains exact');assert.equal(campaign.scroll,113,'Native Campaign scroll remains');assert.equal(campaign.draft,'native campaign draft');assert.deepEqual(websiteBounds(),retainedBounds);assert.equal(navigations,nativeNavigations,'No native document navigation');
   if(!incomingReady&&!nativePainted&&!(generalGlyphs>20))failures.push({label,locale,index,reason:'Neither retained native Campaign nor ready requested content is painted',record});
   if(section==='general'&&incomingReady&&generalGlyphs<=20)failures.push({label,locale,index,reason:'General claims ready but composed heading does not paint glyphs',record});
  }
  async function transition(label,section,gate,outgoing='campaign'){
   await hub.select(outgoing);if(outgoing==='campaign'){await until(hub.view.webContents,`document.querySelector('#content').hidden&&document.querySelector('[aria-current="page"]')?.textContent===${JSON.stringify(locale==='ru'?'Кампания':'Campaign')}`);await until(website.webContents,`getComputedStyle(originalCampaign).visibility==='visible'`)}else await until(hub.view.webContents,`!document.querySelector('#content').hidden&&!document.querySelector('#general').hidden`);await frame(hub.view.webContents);
   if(gate==='hub')updateGate=true;if(gate==='editor'){initialGate=deferred();initialReadSeen=false}
   trace.push({locale,event:'select requested',label,section,time:performance.now()});const selecting=hub.select(section);
   if(gate==='hub'){for(let n=0;n<100&&!gatedUpdate;n++)await new Promise(r=>setTimeout(r,10));assert.ok(gatedUpdate,'Exact update delivery reached gate')}
   else if(gate==='editor'){for(let n=0;n<100&&!initialReadSeen;n++)await new Promise(r=>setTimeout(r,10));assert.ok(initialReadSeen,'Trusted initial editor state read reached gate');await until(editor.webContents,`!!document.querySelector('#appearance-form')`)}
   else await selecting;
   for(let i=0;i<2;i++)await sample(label,section,i);
   if(gate==='hub'){updateGate=false;send(gatedUpdate.channel,...gatedUpdate.args);gatedUpdate=null}
   if(gate==='editor'){initialGate.resolve();initialGate=null}
   await selecting;
   if(section==='general')await until(hub.view.webContents,`!document.querySelector('#content').hidden&&!document.querySelector('#general').hidden`);
   else await until(editor.webContents,`document.querySelector('#appearance-form').elements.preset.value==='custom'&&document.querySelector('#custom-hex').value==='#203040'`);
   await sample(label,section,2);
  }
  const mode=process.env.FABLES_SETTINGS_PAINT_CASES;
  if(mode==='warm-locale'){
   await hub.select('appearance');await until(editor.webContents,`document.querySelector('#custom-hex').value==='#203040'`);const editorId=editor.webContents.id;
   await js(editor.webContents,`document.querySelector('#theme-name').value='warm locale draft';true`);await hub.select('general');manager.setLocale('ru');hub.update();await until(editor.webContents,`document.documentElement.lang==='ru'`);
   console.log('Warm locale before '+JSON.stringify({section:hub.currentSection(),editor:await js(editor.webContents,scripts.editorSnapshot)}));await hub.select('appearance');
   const result={section:hub.currentSection(),visible:editor.getVisible(),sameEditor:editor.webContents.id===editorId,editor:await js(editor.webContents,scripts.editorSnapshot)};console.log('Warm locale result '+JSON.stringify(result));await save('warm-locale-result',await capture());samples.push({label:'warm-locale',...result});
   assert.equal(result.section,'appearance','Warm editor with interface locale update reopens');assert.equal(result.visible,true);assert.equal(result.sameEditor,true);assert.equal(result.editor.draft,'warm locale draft');assert.equal(result.editor.locale,'ru');assert.equal(result.editor.heading,'Настройте под себя.');
  }else if(mode==='initial-update'||mode==='locale-during-get'){
   await hub.select('general');await until(hub.view.webContents,`!document.querySelector('#general').hidden`);initialGate=deferred();initialReadSeen=false;const opening=hub.select('appearance');
   for(let n=0;n<100&&!initialReadSeen;n++)await new Promise(r=>setTimeout(r,10));assert.ok(initialReadSeen,'Initial trusted state request held');await until(editor.webContents,`!!document.querySelector('#appearance-form')`);
   if(mode==='initial-update'){
    await manager.refreshPanel();await until(editor.webContents,`document.querySelector('#custom-hex').value==='#203040'`);await frame(hub.view.webContents);await frame(hub.view.webContents);
    const result={section:hub.currentSection(),visible:editor.getVisible(),editor:await js(editor.webContents,scripts.editorSnapshot)};console.log('Initial update result '+JSON.stringify(result));samples.push({label:mode,...result});await save(mode+'-held',await capture());
    if(result.visible)failures.push({label:mode,reason:'Initial settings notification exposes disabled/loading editor before trusted initial get completes',result});
   }else{manager.setLocale('ru');hub.update();await until(editor.webContents,`document.documentElement.lang==='ru'`);}
   initialGate.resolve();initialGate=null;await opening;
   const final={section:hub.currentSection(),visible:editor.getVisible(),editor:await js(editor.webContents,scripts.editorSnapshot)};console.log(mode+' final '+JSON.stringify(final));samples.push({label:mode+' final',...final});await save(mode+'-final',await capture());
   assert.equal(final.section,'appearance','Accepted preferences complete after independent interface updates');assert.equal(final.visible,true);assert.equal(final.editor.preset,'custom');assert.equal(final.editor.hex,'#203040');assert.equal(final.editor.disabled,false);assert.equal(final.editor.locale,mode==='locale-during-get'?'ru':'en');
  }else if(cross)await transition('general-to-cold-appearance','appearance','editor','general');
  else {
  await transition('cold-general-update-gate','general','hub');
  if(process.env.FABLES_SETTINGS_PAINT_CASES==='all'){
  await transition('cold-appearance-state-gate','appearance','editor');
  const editorIdentity=editor.webContents.id;await js(editor.webContents,`document.querySelector('#theme-name').value='unsaved editor draft';true`);
  await transition('warm-general-natural','general');await transition('warm-appearance-natural','appearance');
  assert.equal(editor.webContents.id,editorIdentity,'Appearance editor is reused');assert.equal(await js(editor.webContents,`document.querySelector('#theme-name').value`),'unsaved editor draft','Warm editor draft retained');
  }
  }
  assert.equal(saveCalls,0,'No settings saves in any fixture case');
  hub.setVisible(false);manager.createPanel=create;manager.state=originalState;manager.save=originalSave;window.close();window=null;
 }
 (async()=>{
  profile=process.env.FABLES_TEST_PROFILE_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'settings-paint-'));await fs.mkdir(profile,{recursive:true});app.setPath('userData',profile);stage('profile set');await app.whenReady();stage('app ready');evidence=process.env.FABLES_TEST_EVIDENCE_DIR||path.join(profile,'settings-paint-evidence');await fs.mkdir(evidence,{recursive:true});console.log('Settings paint evidence '+evidence);
  manager=new AppearanceManager();await manager.initialize();stage('manager initialized');manager.settings={...structuredClone(DEFAULT_APPEARANCE),preset:'custom',customColor:'#203040'};
  for(const locale of process.env.FABLES_SETTINGS_PAINT_CASES==='all'?['en','ru']:['en']){await runLocale(locale);if(process.env.FABLES_SETTINGS_PAINT_CASES==='all')await runLocale(locale,true);}
  for(const name of ['appearance.json','general-settings.json'])assert.equal(await fs.stat(path.join(profile,name)).then(()=>true,()=>false),false,'No preferences written');
  await fs.writeFile(path.join(evidence,'settings-paint-samples.json'),JSON.stringify({samples,trace,failures},null,2));console.log('Settings paint summary '+JSON.stringify({samples:samples.length,failures:failures.length,evidence}));assert.deepEqual(failures,[],'Settings transition never paints empty/unready requested content');
  clearTimeout(timeout);app.quit();
 })().catch(async error=>{console.error(error);if(evidence)await fs.writeFile(path.join(evidence,'settings-paint-failure.json'),JSON.stringify({samples,trace,failures,error:String(error.stack)},null,2)).catch(()=>{});clearTimeout(timeout);window?.destroy();app.exit(1)});
}
