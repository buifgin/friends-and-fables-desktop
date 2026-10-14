// Root-scheduled isolated CPU/X11 fixture. Never run on the user's desktop.
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const websiteHtml=`<!doctype html><style>html,body{margin:0;height:100%;background:#5a1020;color:white}#campaign{position:absolute;left:0;top:0;width:454px;height:660px;overflow:auto;background:#203040}h2{margin:22px}textarea{margin:22px;width:300px}#native-marker{position:sticky;top:0;display:block;margin-left:300px;width:18px;height:18px;background:#217a4d}#spacer{height:1200px}</style><aside id="campaign"><span id="native-marker"></span><h2>Native Campaign settings</h2><textarea>native campaign draft</textarea><div id="spacer">Native form retained</div></aside>`;
const scripts={
 website:`window.originalCampaign=document.querySelector('#campaign');originalCampaign.scrollTop=113;window.originalDraft=originalCampaign.querySelector('textarea');window.originalDraftValue=originalDraft.value;true`,
 websiteSnapshot:`(()=>{const node=document.querySelector('#campaign'),r=node.getBoundingClientRect(),s=getComputedStyle(node);return {same:node===originalCampaign,connected:node.isConnected,scroll:node.scrollTop,draftSame:node.querySelector('textarea')===originalDraft,draft:originalDraft.value,visibility:s.visibility,pointer:s.pointerEvents,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`,
 hubSnapshot:`(()=>{const content=document.querySelector('#content'),heading=document.querySelector('#general h1'),r=heading.getBoundingClientRect();return {url:location.href,bridge:typeof window.settingsHub,section:document.querySelector('[aria-current="page"]')?.textContent,contentHidden:content.hidden,generalHidden:document.querySelector('#general').hidden,locale:document.documentElement.lang,background:getComputedStyle(document.body).backgroundColor,theme:document.documentElement.style.getPropertyValue('--ui-bg'),heading:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`,
 editorSnapshot:`(()=>{const translation=!!document.querySelector('#translation-form'),form=document.querySelector('form'),fieldset=document.querySelector(translation?'#translation-options':'#options'),draft=document.querySelector(translation?'#preserved-names':'#instructions'),heading=document.querySelector('h1'),r=heading.getBoundingClientRect();return {url:location.href,bridge:typeof window[translation?'translation':'hostInstructions'],node:!!form,disabled:fieldset.disabled,applyDisabled:document.querySelector(translation?'#apply':'#save').disabled,locale:document.documentElement.lang,heading:heading.textContent,status:document.querySelector('#status').textContent,theme:document.documentElement.style.getPropertyValue('--ui-bg'),background:getComputedStyle(document.body).backgroundColor,draft:draft.value,sameDraft:!window.originalEditorDraft||draft===window.originalEditorDraft,scroll:document.scrollingElement.scrollTop,headingRect:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`,
 frame:`new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Visible RAF budget exhausted')),1200);requestAnimationFrame(()=>{clearTimeout(timer);resolve(performance.now())})})`,
};
for(const source of Object.values(scripts))new vm.Script(source);
if(!process.versions.electron){module.exports={scripts,websiteHtml};}else{
 const fs=require('node:fs/promises'),os=require('node:os'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
 const exec=promisify(execFile),{app,BrowserWindow,WebContentsView,session,nativeImage,ipcMain}=require('electron');
 const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
 const {AppearanceManager,registerAppearanceScheme}=require(path.join(root,'dist/appearance/appearance'));
 const {DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
 const {SettingsHub,SETTINGS_HUB_URL}=require(path.join(root,'dist/settings/settings-hub'));
 const {GeneralSettings}=require(path.join(root,'dist/settings/general-settings'));
 const {TranslationManager}=require(path.join(root,'dist/translation/translation'));
 const {HostInstructionsManager}=require(path.join(root,'dist/commands/host-instructions'));
 registerAppearanceScheme();app.on('window-all-closed',()=>{});
 let window,profile,evidence,appearance,translation,appearanceSaves=0;const samples=[],failures=[],trace=[];
 const timeout=setTimeout(()=>{console.error('External editor paint bounded timeout');window?.destroy();app.exit(1)},30000);
 const js=(contents,source)=>{new vm.Script(source);return contents.executeJavaScript(source)};
 const frame=contents=>js(contents,scripts.frame);
 async function until(contents,source){for(let n=0;n<100;n++){if(await js(contents,source))return;await new Promise(r=>setTimeout(r,10))}throw Error('External editor readiness: '+source)}
 function deferred(){let resolve;return {promise:new Promise(r=>resolve=r),resolve:()=>resolve()}}
 function color(image,x,y){const b=image.toBitmap(),w=image.getSize().width,i=(Math.floor(y)*w+Math.floor(x))*4;return [b[i+2],b[i+1],b[i]]}
 function glyphs(image,rect){const size=image.getSize(),left=Math.max(0,Math.ceil(rect.x)),top=Math.max(0,Math.ceil(rect.y)),width=Math.min(Math.floor(rect.width),size.width-left),height=Math.min(Math.floor(rect.height),size.height-top);if(width<=0||height<=0)return 0;const crop=image.crop({x:left,y:top,width,height}),pixels=crop.toBitmap(),colors=new Map();for(let i=0;i<pixels.length;i+=4){const c=pixels.readUInt32LE(i);colors.set(c,(colors.get(c)||0)+1)}return pixels.length/4-Math.max(...colors.values())}
 async function ownX11Capture(){assert.ok(process.env.DISPLAY,'Root private X11 display required');assert.equal(Boolean(process.env.WAYLAND_DISPLAY),false,'No host Wayland surface');const handle=window.getNativeWindowHandle(),id=handle.length>=8?handle.readBigUInt64LE():BigInt(handle.readUInt32LE());assert.ok(id>0);trace.push({event:'own native window capture',id:'0x'+id.toString(16),display:process.env.DISPLAY,time:performance.now()});const {stdout}=await exec('/usr/bin/import',['-window','0x'+id.toString(16),'png:-'],{encoding:'buffer',maxBuffer:8*1024*1024,timeout:2000});return nativeImage.createFromBuffer(stdout)}
 async function save(name,image){await fs.writeFile(path.join(evidence,name+'.png'),image.toPNG())}
 async function preferences(){const result={};for(const name of ['appearance.json','general-settings.json','translation.json','host-instructions.json'])result[name]=await fs.readFile(path.join(profile,name),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error});return result}
 async function runCase(section,locale,outgoing){
  const label=locale+'-'+outgoing+'-to-'+section;console.log('External editor stage '+label);
  appearance.setLocale(locale);
  window=new BrowserWindow({show:false,frame:false,width:1000,height:700,backgroundColor:'#ff00ff',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await window.loadURL('data:text/html,<style>html,body{margin:0;background:%23ff00ff}</style>');
  const site=session.fromPartition('external-paint-'+label);site.protocol.handle('https',request=>new URL(request.url).pathname==='/fixture/play'?new Response(websiteHtml,{headers:{'content-type':'text/html'}}):new Response('Not found',{status:404}));
  const website=new WebContentsView({webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});window.contentView.addChildView(website);website.setBounds({x:126,y:0,width:874,height:700});
  const retainedBounds=website.getBounds();let navigations=0;website.webContents.on('did-navigate',()=>navigations++);await website.webContents.loadURL('https://play.fables.gg/fixture/play');await js(website.webContents,scripts.website);const nativeNavigations=navigations;
  const general=new GeneralSettings();await general.initialize();translation=new TranslationManager(profile,null);const instructions=new HostInstructionsManager(profile);
  // Preserve original authorization: gate only the registered first GET after its real handler succeeds.
  const channel=section==='translation'?'translation:get':'host-instructions:get',gate=deferred();let seen=false,editor,editorThrottling,hub,saveCalls=0,checkCalls=0;
  const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(name,listener)=>handle(name,name===channel?async(event,...args)=>{const state=await listener(event,...args);if(!seen){assert.equal(event.sender,editor.webContents);assert.equal(event.senderFrame,event.sender.mainFrame);seen=true;trace.push({label,event:'trusted initial get held',url:event.senderFrame.url});await gate.promise}return state}:listener);
  try{await translation.initialize();await instructions.initialize()}finally{ipcMain.handle=handle}
  // Translation's actual locale follows its enabled/showOriginal settings, not an unrelated locale setter.
  translation.settings={...translation.getSettings(),enabled:locale==='ru',showOriginal:false,translateDescriptions:false};
  translation.setAppearance(appearance.getSettings());instructions.setInterface(appearance.getSettings(),locale);
  translation.check=async()=>{checkCalls++;return {available:false,message:'Fixture has no local translation service.'}};
  for(const manager of [general,translation,instructions])manager.save=async()=>{saveCalls++;throw Error('Paint fixture must not save preferences')};
  const prefsBefore=await preferences();const owner=section==='translation'?translation:instructions,create=owner.createPanel.bind(owner);owner.createPanel=(...args)=>{editor=create(...args);editorThrottling=editor.webContents.getBackgroundThrottling();return editor};
  const adapter={show:async bounds=>{assert.deepEqual(website.getBounds(),retainedBounds);trace.push({label,event:'campaign show',bounds});await js(website.webContents,`originalCampaign.style.visibility='visible';originalCampaign.style.pointerEvents='';true`)},suspend:bounds=>{trace.push({label,event:'campaign suspend',bounds});void js(website.webContents,`originalCampaign.style.visibility='hidden';originalCampaign.style.pointerEvents='none';true`)},hide:()=>{}};
  hub=new SettingsHub(window,appearance,general,()=>hub.setVisible(false),()=>{},target=>hub.select(target));hub.configure({translation,instructions,campaign:adapter});hub.setCampaignAvailable(true);hub.layout({x:0,y:0,width:580,height:700});
  window.showInactive();hub.view.webContents.focus();await hub.select('campaign');await until(website.webContents,`getComputedStyle(originalCampaign).visibility==='visible'`);await frame(hub.view.webContents);
  assert.equal(await js(hub.view.webContents,'document.hasFocus()'),true,'Owned fixture focused for RAF');assert.equal(hub.view.webContents.getURL(),SETTINGS_HUB_URL);
  const composed=await ownX11Capture();assert.deepEqual(color(composed,526,30),[32,48,64],'Composed capture includes child Campaign background');assert.deepEqual(color(composed,434,8),[33,122,77],'Composed capture includes independent native child marker');await save(label+'-sentinel',composed);
  async function selectOutgoing(){await hub.select(outgoing);await until(hub.view.webContents,outgoing==='general'?`!document.querySelector('#content').hidden&&!document.querySelector('#general').hidden`:`document.querySelector('#content').hidden`);if(outgoing==='campaign')await until(website.webContents,`getComputedStyle(originalCampaign).visibility==='visible'`);await frame(hub.view.webContents)}
  await selectOutgoing();const outgoingHub=await js(hub.view.webContents,scripts.hubSnapshot),outgoingHubBounds=hub.view.getBounds();
  const expectedHeading=section==='translation'?(locale==='ru'?'Читайте на русском.':'Read in Russian.'):(locale==='ru'?'Сохранённые инструкции /sp':'Saved /sp instructions');
  async function sample(phase,index){
   await frame(hub.view.webContents);const native=await js(website.webContents,scripts.websiteSnapshot),hubState=await js(hub.view.webContents,scripts.hubSnapshot),state=await js(editor.webContents,scripts.editorSnapshot),image=await ownX11Capture(),bounds=editor.getBounds(),hubBounds=hub.view.getBounds(),visible=editor.getVisible();
   const ready=state.node&&!state.disabled&&!state.applyDisabled&&state.theme==='#203040'&&state.locale===locale&&state.heading===expectedHeading;
   const nativePainted=JSON.stringify(color(image,434,8))===JSON.stringify([33,122,77]);
   const generalGlyphs=hubBounds.width>126&&!hubState.contentHidden&&!hubState.generalHidden?glyphs(image,{...hubState.heading,x:hubState.heading.x+hubBounds.x,y:hubState.heading.y+hubBounds.y}):0;
   const editorGlyphs=visible?glyphs(image,{...state.headingRect,x:state.headingRect.x+bounds.x,y:state.headingRect.y+bounds.y}):0;
   const editorPixel=visible?color(image,bounds.x+bounds.width-8,8):null;
   const incomingPainted=visible&&ready&&editorGlyphs>20&&JSON.stringify(editorPixel)===JSON.stringify([32,48,64]);
   const throttling=editor.webContents.getBackgroundThrottling();assert.equal(throttling,editorThrottling,'Owned preparation restores exact prior background throttling');
   const record={label,phase,index,section,locale,outgoing,throttling,selected:hub.currentSection(),visible,ready,nativePainted,generalGlyphs,editorGlyphs,editorPixel,incomingPainted,bounds,hubBounds,native,hub:hubState,editor:state};samples.push(record);console.log('External editor paint sample '+JSON.stringify(record));await save(label+'-'+phase+'-'+index,image);
   assert.equal(native.same&&native.connected&&native.draftSame,true,'Campaign native node and draft identities preserved');assert.deepEqual(native.rect,{x:0,y:0,width:454,height:660},'Native Campaign geometry preserved');assert.equal(native.scroll,113);assert.equal(native.draft,'native campaign draft');assert.deepEqual(website.getBounds(),retainedBounds);assert.equal(navigations,nativeNavigations);assert.equal(state.bridge,'object');assert.equal(await js(editor.webContents,'typeof window.require'),'undefined');
   if(visible)assert.deepEqual(bounds,{x:126,y:0,width:454,height:700},'Requested editor stays in exact left content bounds');
   if(phase==='held'&&!visible&&outgoing==='general'){assert.deepEqual(hubBounds,outgoingHubBounds);assert.deepEqual(hubState.heading,outgoingHub.heading,'Retained General heading geometry remains stable')}
   if(visible&&!ready)failures.push({label,phase,index,reason:'Requested editor replaces outgoing content while loading/default theme/locale/controls',record});
   if(!incomingPainted&&!(outgoing==='campaign'?nativePainted:generalGlyphs>20))failures.push({label,phase,index,reason:'Neither outgoing content nor interactive chosen-theme localized editor is composed',record});
   if(phase!=='held'&&!incomingPainted)failures.push({label,phase,index,reason:'Settled editor is not composed with chosen theme, locale and interactive controls',record});
   return state;
  }
  const opening=hub.select(section);for(let n=0;n<100&&!seen;n++)await new Promise(r=>setTimeout(r,10));assert.ok(seen,'Trusted first GET reached exact gate');await until(editor.webContents,`!!document.querySelector('form fieldset')`);
  await sample('held',0);await sample('held',1);gate.resolve();await opening;
  await until(editor.webContents,`!document.querySelector('fieldset').disabled`);await sample('ready',0);
  const id=editor.webContents.id,url=editor.webContents.getURL(),draft='unsaved '+label;
  await js(editor.webContents,`window.originalEditorDraft=document.querySelector(${JSON.stringify(section==='translation'?'#preserved-names':'#instructions')});originalEditorDraft.value=${JSON.stringify(draft)};originalEditorDraft.dispatchEvent(new Event('input',{bubbles:true}));document.scrollingElement.scrollTop=71;true`);
  const editorScroll=await js(editor.webContents,'document.scrollingElement.scrollTop');await selectOutgoing();await hub.select(section);const warm=await sample('warm',0);
  assert.equal(editor.webContents.id,id,'Warm open reuses exact editor');assert.equal(editor.webContents.getURL(),url);assert.equal(warm.sameDraft,true,'Exact unsaved draft node survives hidden reuse');assert.equal(warm.draft,draft);assert.equal(warm.scroll,editorScroll,'Editor scroll preserved');assert.equal(saveCalls,0);assert.equal(appearanceSaves,0);assert.deepEqual(await preferences(),prefsBefore,'Profile preferences unchanged');trace.push({label,event:'preservation complete',saveCalls,checkCalls,editorId:id,editorScroll});
  hub.setVisible(false);window.close();window=null;await translation.shutdown();translation=null;for(const method of ['get','save','close'])ipcMain.removeHandler('host-instructions:'+method);
 }
 (async()=>{
  profile=process.env.FABLES_TEST_PROFILE_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'settings-external-paint-'));await fs.mkdir(profile,{recursive:true});app.setPath('userData',profile);await app.whenReady();evidence=process.env.FABLES_TEST_EVIDENCE_DIR||path.join(profile,'external-paint-evidence');await fs.mkdir(evidence,{recursive:true});
  appearance=new AppearanceManager();await appearance.initialize();appearance.settings={...structuredClone(DEFAULT_APPEARANCE),preset:'custom',customColor:'#203040'};appearance.save=async()=>{appearanceSaves++;throw Error('Paint fixture must not save Appearance')};
  const sections=process.env.FABLES_SETTINGS_EXTERNAL_CASES?process.env.FABLES_SETTINGS_EXTERNAL_CASES.split(','):['translation','instructions'];const locales=process.env.FABLES_SETTINGS_EXTERNAL_LOCALES?process.env.FABLES_SETTINGS_EXTERNAL_LOCALES.split(','):['en','ru'];const outgoing=process.env.FABLES_SETTINGS_EXTERNAL_OUTGOING?process.env.FABLES_SETTINGS_EXTERNAL_OUTGOING.split(','):['campaign','general'];
  assert.ok(sections.every(v=>['translation','instructions'].includes(v)));assert.ok(locales.every(v=>['en','ru'].includes(v)));assert.ok(outgoing.every(v=>['campaign','general'].includes(v)));
  for(const section of sections)for(const locale of locales)for(const previous of outgoing)await runCase(section,locale,previous);
  await fs.writeFile(path.join(evidence,'settings-external-paint-samples.json'),JSON.stringify({samples,trace,failures},null,2));console.log('External editor paint summary '+JSON.stringify({samples:samples.length,failures:failures.length,evidence}));assert.deepEqual(failures,[],'Cold/warm external Settings never replace content with loading/default/blank frames');clearTimeout(timeout);app.quit();
 })().catch(async error=>{console.error(error);if(evidence)await fs.writeFile(path.join(evidence,'settings-external-paint-failure.json'),JSON.stringify({samples,trace,failures,error:String(error.stack)},null,2)).catch(()=>{});clearTimeout(timeout);window?.destroy();await translation?.shutdown().catch(()=>{});app.exit(1)});
}
