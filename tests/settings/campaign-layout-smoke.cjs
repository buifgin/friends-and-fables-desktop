// Coordinator-scheduled private CPU/X11 fixture. Never launch on the host desktop.
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const campaignId='01a0d854-78d5-7064-ae41-f63d561c8e01';
const websiteHtml=`<!doctype html><style>html,body{margin:0;height:100%;background:#5a1020;color:white}aside{width:80px}#native{position:fixed;right:0;top:5vh;width:500px;height:90vh;background:#203040}#native .overflow-y-auto{overflow:auto}#native textarea{width:180px}#native .mx-auto{min-height:1300px}#native-marker{position:absolute;left:200px;top:12px;width:16px;height:16px;background:#217a4d;z-index:200}#native button{height:30px}</style><aside><button type="button" id="gear"><svg class="lucide-settings"></svg>Settings</button></aside><div class="flex-1 h-full w-full"><div id="events-list"></div><div class="tiptap" contenteditable="true">composer draft</div></div><script>
window.mountAllowed=true;window.launchPending=false;window.nativeMounts=0;window.fixtureLocale='en';
function mount(){if(!mountAllowed){launchPending=true;return}if(document.querySelector('#native'))return;launchPending=false;nativeMounts++;const overlay=document.createElement('div');overlay.className='fixed inset-0 z-50';overlay.dataset.state='open';document.body.append(overlay);const dialog=document.createElement('div');dialog.id='native';dialog.role='dialog';dialog.dataset.state='open';dialog.setAttribute('aria-modal','true');dialog.innerHTML='<button type="button"><svg class="lucide-x"></svg>Close</button><span id="native-marker"></span><div class="overflow-y-auto h-full"><div class="p-6 h-full"><div class="flex-1 items-center overflow-y-auto"><div class="mx-auto"><div><div><h3 class="font-header">'+(fixtureLocale==='ru'?'Кампания':'Campaign Settings')+'</h3></div><div><label>Name<textarea>native campaign draft</textarea></label><button type="button">Native control</button></div></div></div></div></div></div>';
dialog.__reactFiber$fixture={type:'div',child:{type:function NativeCampaign(){return 'Campaign Settings'},memoizedProps:{campaignId:'${campaignId}',isHost:true}}};dialog.querySelector('button').onclick=()=>{dialog.dataset.state='closed';dialog.remove();overlay.remove();document.body.style.pointerEvents='';document.body.style.overflow=''};document.body.append(dialog);document.body.style.pointerEvents='none';document.body.style.overflow='hidden';if(!window.originalNative){window.originalNative=dialog;window.originalField=dialog.querySelector('textarea')}}
document.addEventListener('keydown',event=>{if(event.key==='Escape'){window.lastNativeEscapeTrusted=event.isTrusted;document.querySelector('#native > button')?.click();}});
window.releaseMount=()=>{mountAllowed=true;mount()};document.querySelector('#gear').onclick=()=>{launchPending=true;queueMicrotask(mount)};
</script>`;
const scripts={
 frame:`new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Visible RAF budget')),1500);requestAnimationFrame(()=>{clearTimeout(timer);resolve(true)})})`,
 snapshot:`(()=>{const n=document.querySelector('#native'),r=n?.getBoundingClientRect(),s=n&&getComputedStyle(n);return {innerWidth,innerHeight,visibility:document.visibilityState,mountPending:launchPending,mounts:nativeMounts,node:!!n,adopted:!!n?.hasAttribute('data-ff-campaign-panel'),same:n===window.originalNative,fieldSame:n?.querySelector('textarea')===window.originalField,draft:n?.querySelector('textarea').value,display:s?.display,visibilityCss:s?.visibility,rect:r&&{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}})()`,
 geometry:`(()=>{const field=document.querySelector('.tiptap'),workspace=field.closest('.flex-1.h-full.w-full'),rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {epoch:performance.timeOrigin+performance.now(),viewport:{width:innerWidth,height:innerHeight},composer:rect(field),workspace:rect(workspace),padding:getComputedStyle(workspace).paddingLeft,composerSame:field===window.geometryComposer,composerDraft:field.textContent,nativeDraft:window.originalField?.value,nativeFieldSame:window.originalNative?.querySelector('textarea')===window.originalField,nativeConnected:!!window.originalNative?.isConnected}})()`,
 hubIdentity:`(()=>{const h=document.querySelector('#general h1'),r=h.getBoundingClientRect();return {marker:document.documentElement.getAttribute('data-ff-settings-rendered'),generalHidden:document.querySelector('#general').hidden,contentHidden:document.querySelector('#content').hidden,heading:{x:r.x,y:r.y,width:r.width,height:r.height},paintGateReached:window.__ffFixtureGeneralPaintReached===true}})()`,
};
scripts.geometryFrames=`new Promise(resolve=>{const records=[];const take=()=>{records.push(${scripts.geometry});if(records.length===16)resolve(records);else requestAnimationFrame(take)};requestAnimationFrame(take)})`;
for(const source of Object.values(scripts))new vm.Script(source);
new vm.Script(websiteHtml.match(/<script>([\s\S]*)<\/script>/)[1]);
if(!process.versions.electron){module.exports={websiteHtml,scripts};}else{
 const fs=require('node:fs/promises'),os=require('node:os'),{promisify}=require('node:util'),exec=promisify(require('node:child_process').execFile);
 const {app,BrowserWindow,WebContentsView,session,nativeImage}=require('electron');
 const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
 const {AppearanceManager,registerAppearanceScheme}=require(path.join(root,'dist/appearance/appearance'));
 const {DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
 const {TranslationManager}=require(path.join(root,'dist/translation/translation'));
 const {HostInstructionsManager}=require(path.join(root,'dist/commands/host-instructions'));
 const {configureFullscreenShortcuts}=require(path.join(root,'dist/shell/window-shortcuts'));
 const {configureNativeCampaignPanel}=require(path.join(root,'dist/settings/campaign-panel'));
 registerAppearanceScheme();app.on('window-all-closed',()=>{});
 let window,profile,evidence,appearance,translation,website,dock,closeDeliveryGate;const samples=[],trace=[],websiteBounds=[];
 const mode=process.env.FABLES_CAMPAIGN_LAYOUT_CASE||'geometry',locale=process.env.FABLES_CAMPAIGN_LAYOUT_LOCALE||'en';
 assert.ok(['hidden-composer','no-workspace','escape-native-held','escape-editor-held','escape-native','escape-editor','geometry','incoming','incoming-geometry','incoming-appearance-geometry','first-open','cancel','cancel-outgoing','outgoing-general','outgoing-translation','outgoing-appearance'].includes(mode));assert.ok(['en','ru'].includes(locale));
 const timeout=setTimeout(()=>{console.error('Campaign layout bounded timeout');window?.destroy();app.exit(1)},30000);
 const js=(c,s)=>{new vm.Script(s);return c.executeJavaScript(s)};
 const frame=c=>js(c,scripts.frame);
 async function until(c,s){for(let i=0;i<100;i++){if(await js(c,s))return;await new Promise(r=>setTimeout(r,10))}throw Error('Readiness '+s)}
 function color(image,x,y){const b=image.toBitmap(),w=image.getSize().width,i=(Math.floor(y)*w+Math.floor(x))*4;return [b[i+2],b[i+1],b[i]]}
 async function capture(label){assert.ok(process.env.DISPLAY);assert.equal(Boolean(process.env.WAYLAND_DISPLAY),false);const handle=window.getNativeWindowHandle(),id=handle.length>=8?handle.readBigUInt64LE():BigInt(handle.readUInt32LE());const {stdout}=await exec('/usr/bin/import',['-window','0x'+id.toString(16),'png:-'],{encoding:'buffer',maxBuffer:10*1024*1024,timeout:2000});const image=nativeImage.createFromBuffer(stdout);await fs.writeFile(path.join(evidence,label+'.png'),image.toPNG());return image}
 async function sample(label){const native=await js(website.webContents,scripts.snapshot),bounds=website.getBounds(),hub=dock.hub,record={label,selected:hub.currentSection(),website:bounds,hub:hub.view.getBounds(),zoom:website.webContents.getZoomFactor(),native,editors:Array.from(hub.editors,([section,entry])=>({section,visible:entry.view.getVisible(),bounds:entry.view.getBounds(),id:entry.view.webContents.id})),time:performance.now()};samples.push(record);console.log('Campaign layout sample '+JSON.stringify(record));return record}
 function assertIdentity(record){assert.equal(record.native.same,true);assert.equal(record.native.fieldSame,true);assert.equal(record.native.draft,'native campaign draft');assert.equal(record.native.mounts,1)}
 function assertGeometry(record){const {native:n,website:b,zoom:z}=record;assert.ok(n.adopted);assert.ok(Math.abs(n.rect.height*z-b.height)<=1.5,'Campaign bottom fills Settings: '+JSON.stringify(record));const panel=dock.hub.bounds;assert.ok(Math.abs(n.rect.width*z-(panel.width-126))<=1.5,'Campaign right edge matches reserved content');assert.ok(Math.abs(b.x+n.rect.x*z-126)<=1,'Composed native form starts after Settings navigation');assert.ok(Math.abs(n.rect.y*z)<=1)}
 async function settled(){await until(website.webContents,`document.querySelector('#native')?.hasAttribute('data-ff-campaign-panel')`);await frame(dock.hub.view.webContents);await frame(dock.hub.view.webContents)}
 async function assertComposed(label,expected){const record=await sample(label),image=await capture(label),panel=dock.hub.bounds;assert.equal(image.getSize().width,window.getContentSize()[0]);const point={x:panel.width-12,y:panel.y+panel.height-12},pixel=color(image,point.x,point.y);record.contentPixel=pixel;record.point=point;assert.deepEqual(pixel,[32,48,64],expected+' content bottom is opaque selected Settings, never underlying game');return record}
 async function select(section){await dock.openSection(section);await frame(dock.hub.view.webContents)}
 async function run(){
 profile=process.env.FABLES_TEST_PROFILE_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'campaign-layout-'));await fs.mkdir(profile,{recursive:true});app.setPath('userData',profile);await app.whenReady();evidence=process.env.FABLES_TEST_EVIDENCE_DIR||path.join(profile,'evidence');await fs.mkdir(evidence,{recursive:true});
 appearance=new AppearanceManager();await appearance.initialize();appearance.settings={...structuredClone(DEFAULT_APPEARANCE),preset:'custom',customColor:'#203040',appearancePanelWidth:580};appearance.setLocale(locale);
 window=new BrowserWindow({show:false,frame:false,width:1000,height:1000,backgroundColor:'#ff00ff',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});await window.loadURL('data:text/html,<style>html,body{margin:0;background:%23ff00ff}</style>');
 const site=session.fromPartition('campaign-layout-'+mode+'-'+locale);site.protocol.handle('https',()=>new Response(websiteHtml,{headers:{'content-type':'text/html'}}));website=new WebContentsView({webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});window.contentView.addChildView(website);dock=appearance.attachMain(window,website);
 configureFullscreenShortcuts(website.webContents,window);
 const setWebsiteBounds=website.setBounds.bind(website);website.setBounds=b=>{setWebsiteBounds(b);websiteBounds.push({epoch:performance.timeOrigin+performance.now(),bounds:website.getBounds()});};
 website.webContents.setWindowOpenHandler(({url})=>{if(url==='fables-desktop://settings/close-campaign'){trace.push({nativeCloseRequest:true,time:performance.now()});const gate=closeDeliveryGate;if(gate?.kind==='native'){gate.reach();void gate.released.then(()=>dock.closeCampaign());}else dock.closeCampaign();}return {action:'deny'};});
 translation=new TranslationManager(profile,null);const instructions=new HostInstructionsManager(profile);await translation.initialize();await instructions.initialize();translation.settings={...translation.getSettings(),enabled:locale==='ru',showOriginal:false,translateDescriptions:false};translation.setAppearance(appearance.getSettings());instructions.setInterface(appearance.getSettings(),locale);translation.check=async()=>({available:false,message:'No fixture service'});
 let updates=Promise.resolve(),request=0;const update=(show,bounds={width:0,height:0})=>{const current=++request,c=website.webContents;void js(c,'window.__friendsFablesDesktopCampaignPanel?.cancelPending?.();true').catch(()=>{});updates=updates.then(async()=>{if(current!==request)return false;const gate=closeDeliveryGate;if(show===false&&gate?.kind==='editor'){gate.reach();await gate.released;if(current!==request)return false;}trace.push({show,bounds,website:website.getBounds(),time:performance.now()});const previous=c.getBackgroundThrottling();if(show===true)c.setBackgroundThrottling(false);try{return await js(c,`(${configureNativeCampaignPanel.toString()})(${JSON.stringify(show)},${bounds.width},${bounds.height},${JSON.stringify({background:'#203040',foreground:'#f5f5f5',border:'#465050',accent:'#d8bb82',panel:'#17181a',selected:'#383a3e'})},${bounds.x??0})`)}finally{if(show===true&&!c.isDestroyed())c.setBackgroundThrottling(previous)}});return updates};
 dock.configureSettings({translation,instructions,campaign:{reserve:b=>update('reserve',b),show:b=>update(true,b),suspend:b=>{void update('suspend',b)},hide:()=>{void update(false)}}});await website.webContents.loadURL('https://play.fables.gg/'+campaignId+'/play');await js(website.webContents,`fixtureLocale=${JSON.stringify(locale)};true`);await dock.setCampaignAvailable(true);if(mode==='hidden-composer')await js(website.webContents,`document.querySelector('.tiptap').remove();true`);if(mode==='no-workspace')await js(website.webContents,`document.querySelector('.flex-1.h-full.w-full').remove();true`);window.showInactive();if(mode!=='first-open')await dock.openSection('general');const focus=mode==='first-open'?website.webContents:dock.hub.view.webContents;focus.focus();await frame(focus);
 assert.equal(await js(focus,'document.hasFocus()'),true);assert.equal(await js(website.webContents,'typeof window.require'),'undefined');
 if(mode==='hidden-composer'||mode==='no-workspace'){
  assert.equal(await js(website.webContents,'nativeMounts'),0,'Passive local opening never launches native Campaign');
  if(mode==='hidden-composer'){assert.equal(website.getBounds().x,0);assert.equal(await js(website.webContents,`getComputedStyle(document.querySelector('#events-list').closest('.flex-1.h-full.w-full')).paddingLeft`),'580px');}else assert.equal(website.getBounds().x,580,'Unknown workspace retains legacy local geometry');
  await select('campaign');await settled();const record=await assertComposed(mode+'-campaign','Campaign');assertIdentity(record);assertGeometry(record);assert.equal(record.website.x,0);assert.equal(record.website.width,1000);assert.equal(trace.findLast(row=>row.show===true).website.x,0,'Native form mounts within full-width website even without passive reservation');
 }else if(mode.startsWith('escape-')){
  const held=mode.endsWith('-held'),nativeEscape=mode.startsWith('escape-native');
  await select('campaign');await settled();assertIdentity(await sample('escape-ready'));assertGeometry(samples.at(-1));
  await js(website.webContents,"window.geometryComposer=document.querySelector('.tiptap');true");
  if(!nativeEscape)await select('general');
  assertIdentity(await sample('escape-retained'));const initial=await js(website.webContents,scripts.geometry),zoom=website.webContents.getZoomFactor();
  assert.equal(zoom,1);assert.equal(initial.composerSame,true);assert.equal(initial.nativeConnected,true);assert.equal(initial.composerDraft,'composer draft');assert.equal(initial.nativeDraft,'native campaign draft');
  websiteBounds.push({epoch:performance.timeOrigin+performance.now(),bounds:website.getBounds()});
  // Sample only the exact retained composer/workspace for sixteen visible frames.
  // Epochs join each DOMRect to the actual native child-view bounds history.
  const sampler=scripts.geometryFrames;
  new vm.Script(sampler);
  const input=nativeEscape?website.webContents:dock.hub.view.webContents;input.focus();assert.equal(await js(input,'document.hasFocus()'),true);
  const heldFrames=[];let releaseGate=()=>{},reached;
  if(held){
   let reach;reached=new Promise(resolve=>reach=resolve);const released=new Promise(resolve=>releaseGate=resolve);
   closeDeliveryGate={kind:nativeEscape?'native':'editor',reach:()=>{trace.push({gateReached:mode,epoch:performance.timeOrigin+performance.now()});reach();},released};
  }
  const collecting=js(website.webContents,sampler);
  try {
   input.sendInputEvent({type:'keyDown',keyCode:'Escape'});input.sendInputEvent({type:'keyUp',keyCode:'Escape'});
   if(held){
    await reached;
    // Adversarial delivery contract: hold only the real asynchronous receiver.
    // Sender DOM/disposal and native child-view layout continue unchanged.
    for(let i=0;i<2;i++){
     await frame(website.webContents);assert.equal(await js(website.webContents,"document.visibilityState==='visible'"),true);
     const geometry=await js(website.webContents,scripts.geometry),bounds=website.getBounds();
     heldFrames.push({...geometry,native:bounds,composedComposerX:bounds.x+geometry.composer.x*zoom});
    }
    const image=await capture(mode+'-delivery-held');assert.equal(image.getSize().width,window.getContentSize()[0]);
    await fs.writeFile(path.join(evidence,'campaign-escape-held.json'),JSON.stringify({mode,contract:'adversarial existing async delivery boundary; not a natural user-cause claim',frames:heldFrames,trace},null,2));
    console.log('Campaign Escape held delivery '+JSON.stringify({mode,frames:heldFrames}));
   }
  }finally{releaseGate();closeDeliveryGate=undefined;trace.push({gateReleased:held?mode:null,epoch:performance.timeOrigin+performance.now()});}
  const frames=await collecting;frames.push(...heldFrames);await updates;assert.equal(dock.isOpen(),false,'Trusted Escape closes actual Settings');
  if(nativeEscape)assert.equal(await js(website.webContents,'lastNativeEscapeTrusted'),true,'Website native dialog receives real Escape');
  const final=await js(website.webContents,scripts.geometry);frames.push(final);
  const composed=frames.map(frame=>{const native=websiteBounds.findLast(item=>item.epoch<=frame.epoch)?.bounds;assert.ok(native,'Every renderer frame has native view bounds provenance');return {...frame,native,composedComposer:{x:native.x+frame.composer.x*zoom,y:native.y+frame.composer.y*zoom,width:frame.composer.width*zoom,height:frame.composer.height*zoom},composedWorkspace:{x:native.x+frame.workspace.x*zoom,y:native.y+frame.workspace.y*zoom,width:frame.workspace.width*zoom,height:frame.workspace.height*zoom}}});
  const start=websiteBounds.findLast(item=>item.epoch<=initial.epoch)?.bounds||{x:126};const startX=start.x+initial.composer.x*zoom,endX=composed.at(-1).composedComposer.x;
  const record={mode,contract:held?'adversarial existing async delivery boundary; not a natural user-cause claim':'natural Escape delivery',initial,startX,endX,websiteBounds,frames:composed};await fs.writeFile(path.join(evidence,'campaign-escape-geometry.json'),JSON.stringify(record,null,2));console.log('Campaign Escape composed geometry '+JSON.stringify(record));
  assert.equal(startX,580);assert.equal(endX,0);assert.equal(composed.at(-1).native.x,0);assert.equal(composed.at(-1).padding,'0px');
  for(const frame of composed){assert.equal(frame.composerSame,true);assert.equal(frame.composerDraft,'composer draft');assert.equal(frame.nativeFieldSame,true);assert.equal(frame.nativeDraft,'native campaign draft');const x=frame.composedComposer.x;assert.ok(Math.abs(x-startX)<=1||Math.abs(x-endX)<=1,'Escape shows only outgoing or final composed composer edge, never a split geometry handoff: '+JSON.stringify(frame));}
 }else if(mode==='geometry'){
  website.webContents.setZoomLevel(0);await select('campaign');await settled();assertGeometry(await assertComposed('zoom0','Campaign'));assertIdentity(samples.at(-1));
  for(const level of [-.5,.5,0]){website.webContents.setZoomLevel(level);await until(website.webContents,`Math.abs(innerHeight-${website.getBounds().height}/Math.pow(1.2,${level}))<2`);await frame(website.webContents);const state=await sample('zoom'+level);assertIdentity(state);assertGeometry(state);await assertComposed('zoom'+level+'-paint','Campaign')}
  window.setContentSize(1100,900);await until(website.webContents,`innerHeight<900`);await until(website.webContents,`Math.abs(innerHeight-${website.getBounds().height})<2`);assert.equal(await updates,true,'Resized native adapter reaches its actual geometry/paint readiness');await frame(website.webContents);await frame(website.webContents);const resized=await sample('resized');assertIdentity(resized);assertGeometry(resized);await assertComposed('resized-paint','Campaign');
 }else if(mode==='cancel-outgoing'){
  await select('campaign');await settled();const control=await assertComposed('cancel-outgoing-control','Campaign');assertIdentity(control);assertGeometry(control);
  const sentinel={x:control.website.x+control.native.rect.x*control.zoom+205,y:control.website.y+17};assert.deepEqual(color(await capture('cancel-outgoing-child-sentinel'),sentinel.x,sentinel.y),[33,122,77]);
  const hub=dock.hub,contents=hub.view.webContents,execute=contents.executeJavaScript.bind(contents),create=appearance.createPanel.bind(appearance);
  function headingGlyphs(image,rect){if(rect.width<=0||rect.height<=0)return 0;const crop=image.crop({x:Math.ceil(rect.x+hub.bounds.x),y:Math.ceil(rect.y+hub.bounds.y),width:Math.floor(rect.width),height:Math.floor(rect.height)}),pixels=crop.toBitmap(),counts=new Map();for(let i=0;i<pixels.length;i+=4){const value=pixels.readUInt32LE(i);counts.set(value,(counts.get(value)||0)+1);}return pixels.length/4-Math.max(...counts.values());}
  let releaseLoad,loadReached=false,heldPaintCalls=0;
  const loadGate=new Promise(resolve=>releaseLoad=resolve);
  // Delay only the existing readiness acceptance. Actual General DOM/layout/RAF
  // continue painting; cancellation still runs the unchanged wait.finish(false).
  contents.executeJavaScript=(source,...args)=>{if(source.includes('const advance=')&&source.includes('data-ff-settings-rendered')){assert.ok(source.includes('if(paintFrames>=2)'));heldPaintCalls++;source=source.replace('const advance=()=>{','const advance=()=>{window.__ffFixtureGeneralPaintReached=true;').replace('if(paintFrames>=2)','if(paintFrames>=2&&!window.__ffFixtureHoldGeneralPaint)');new vm.Script(source);}return execute(source,...args);};
  appearance.createPanel=parent=>{const view=create(parent),load=view.webContents.loadURL.bind(view.webContents);view.webContents.loadURL=async(...args)=>{loadReached=true;await loadGate;return load(...args);};return view;};
  let general,opening;const observations=[];
  try {
   await js(contents,'window.__ffFixtureHoldGeneralPaint=true;window.__ffFixtureGeneralPaintReached=false;true');general=dock.openSection('general');
   await until(contents,'window.__ffFixtureGeneralPaintReached===true');assert.equal(heldPaintCalls,1);assert.equal(hub.currentSection(),'campaign');assert.equal(hub.view.getBounds().width,hub.bounds.width);
   await frame(contents);await frame(contents);const prepared=await js(contents,scripts.hubIdentity);assert.equal(prepared.generalHidden,false);assert.equal(prepared.contentHidden,false);assert.match(prepared.marker,/:general$/);
   const heldImage=await capture('cancel-outgoing-general-prepared');assert.notDeepEqual(color(heldImage,sentinel.x,sentinel.y),[33,122,77],'Prepared General actually covers native Campaign sentinel');assert.ok(headingGlyphs(heldImage,prepared.heading)>20,'Prepared General heading actually paints composed glyphs');
   opening=dock.openSection('appearance');for(let i=0;i<100&&!loadReached;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.equal(loadReached,true,'New cold Appearance reaches exact local load gate');await general;
   for(let i=0;i<2;i++){await frame(contents);const state=await js(contents,scripts.hubIdentity),record=await sample('cancel-outgoing-held-'+i),image=await capture('cancel-outgoing-held-'+i);assertIdentity(record);observations.push({...state,hubWidth:hub.view.getBounds().width,nativePixel:color(image,sentinel.x,sentinel.y),generalGlyphs:headingGlyphs(image,state.heading),appearanceVisible:hub.editors.get('appearance').view.getVisible()});record.hubIdentity=observations.at(-1);console.log('Campaign canceled outgoing identity '+JSON.stringify(record.hubIdentity));assert.equal(record.selected,'campaign');assert.equal(observations.at(-1).appearanceVisible,false);}
  } finally {
   contents.executeJavaScript=execute;appearance.createPanel=create;await js(contents,'window.__ffFixtureHoldGeneralPaint=false;true');releaseLoad();await Promise.allSettled([general,opening].filter(Boolean));
  }
  assert.equal(hub.currentSection(),'appearance');const editor=hub.editors.get('appearance').view;assert.equal(editor.getVisible(),true);await frame(editor.webContents);assertIdentity(await sample('cancel-outgoing-final-appearance'));
  for(const state of observations){assert.deepEqual(state.nativePixel,[33,122,77],'Canceled General must uncover painted committed Campaign during cold Appearance load');assert.equal(state.hubWidth,126);assert.match(state.marker,/:campaign$/);assert.equal(state.generalHidden,true);}
 }else if(mode==='cancel'){
  await select('general');await js(website.webContents,'mountAllowed=false;true');const opening=dock.openSection('campaign');await until(website.webContents,'launchPending');const started=performance.now();dock.hide();let budget;try{await Promise.race([opening,new Promise((_,reject)=>budget=setTimeout(()=>reject(Error('Cancelled native readiness blocks the queue')),500))])}finally{clearTimeout(budget)}assert.ok(performance.now()-started<500);await updates;await js(website.webContents,'releaseMount();true');await until(website.webContents,`!document.querySelector('#native')`);await frame(website.webContents);const record=await sample('cancelled-late-mount');assert.equal(dock.isOpen(),false);assert.equal(record.native.node,false,'A cancelled async native mount never survives as a stray modal');assert.equal(await js(website.webContents,'window.__friendsFablesDesktopCampaignPanel===undefined'),true);
 }else if(mode==='first-open'){
  assert.equal(dock.isOpen(),false);assert.equal(dock.hub.currentSection(),'appearance');await js(website.webContents,'mountAllowed=false;true');const opening=dock.openSection('campaign');await until(website.webContents,'launchPending');await frame(dock.hub.view.webContents);const held=await sample('first-open-held');assert.equal(held.native.node,false);assert.equal(dock.hub.view.getBounds().width,126);assert.ok(held.editors.every(editor=>!editor.visible),'Direct Campaign opening never stages another Settings editor');const semantic=await js(dock.hub.view.webContents,`({marker:document.documentElement.getAttribute('data-ff-settings-rendered'),selected:document.querySelector('[aria-current=page]')?.textContent,contentHidden:document.querySelector('#content').hidden})`);assert.ok(semantic.marker.endsWith(':campaign'));assert.equal(semantic.contentHidden,true);assert.equal(semantic.selected,locale==='ru'?'Кампания':'Campaign');const game=await js(website.webContents,scripts.geometry);assert.equal(website.getBounds().x,0);assert.equal(game.composer.x,0,'Direct Campaign keeps game unreserved until actual form adoption');assert.equal(game.composer.width,1000);const image=await capture('first-open-held');assert.deepEqual(color(image,568,950),[90,16,32],'Actual game remains painted where no form has mounted; no blank Settings cover');await js(website.webContents,'releaseMount();true');await opening;await settled();assertIdentity(await assertComposed('first-open-ready','First Campaign'));assertGeometry(samples.at(-1));
 }else if(mode==='incoming'||mode==='incoming-geometry'||mode==='incoming-appearance-geometry'){
  const outgoingSection=mode==='incoming-appearance-geometry'?'appearance':'general';
  await select(outgoingSection);
  const outgoingEditor=dock.hub.editors.get(outgoingSection);if(outgoingEditor)await js(outgoingEditor.view.webContents,"window.originalDraft=document.querySelector('#theme-name');originalDraft.value='unsaved editor draft';true");await js(website.webContents,'mountAllowed=false;window.geometryComposer=document.querySelector(".tiptap");true');
  const incomingFrames=[];const incomingGeometry=async label=>{const geometry=await js(website.webContents,scripts.geometry),bounds=website.getBounds(),zoom=website.webContents.getZoomFactor();const record={label,...geometry,native:bounds,zoom,composedComposer:{x:bounds.x+geometry.composer.x*zoom,y:bounds.y+geometry.composer.y*zoom,width:geometry.composer.width*zoom,height:geometry.composer.height*zoom}};incomingFrames.push(record);return record;};
  const outgoing=mode.endsWith('-geometry')?await incomingGeometry('outgoing-'+outgoingSection):null;
  const opening=dock.openSection('campaign');
  try {
   await until(website.webContents,'launchPending');await frame(dock.hub.view.webContents);const held=await assertComposed('incoming-held','Outgoing General');assert.equal(held.selected,outgoingSection,'Outgoing section stays committed until actual Campaign mount/paint');
   if(outgoingEditor)assert.equal(await js(outgoingEditor.view.webContents,"document.querySelector('#theme-name')===originalDraft&&originalDraft.value==='unsaved editor draft'"),true,'Held incoming preserves outgoing native editor field and draft');
   if(outgoing){for(let i=0;i<2;i++){await frame(website.webContents);await incomingGeometry('held-native-mount-'+i);}await capture('incoming-geometry-held');}
  }finally{await js(website.webContents,'releaseMount();true');await opening;}
  await settled();assertIdentity(await assertComposed('incoming-ready','Campaign'));assertGeometry(samples.at(-1));
  if(outgoing){
   await incomingGeometry('incoming-ready');await fs.writeFile(path.join(evidence,'campaign-incoming-geometry.json'),JSON.stringify({mode,frames:incomingFrames},null,2));console.log('Campaign incoming composed geometry '+JSON.stringify(incomingFrames));
   assert.equal(outgoing.composedComposer.x,580);for(const record of incomingFrames){assert.equal(record.composerSame,true);assert.equal(record.composerDraft,'composer draft');assert.ok(Math.abs(record.composedComposer.x-outgoing.composedComposer.x)<=1,'Held incoming mount preserves outgoing composed composer edge: '+JSON.stringify(record));assert.ok(Math.abs(record.composedComposer.width-outgoing.composedComposer.width)<=1,'Held incoming mount preserves outgoing composer width: '+JSON.stringify(record));}
  }
  for(const section of ['general','translation','appearance']){await select(section);await frame(dock.hub.view.webContents);const returning=dock.openSection('campaign');for(let i=0;i<2;i++){await frame(dock.hub.view.webContents);await assertComposed('return-'+section+'-'+i,'Return handoff')}await returning;assertIdentity(await sample('return-'+section+'-ready'));}
 }else{
  const section=mode.slice('outgoing-'.length);await select('campaign');await settled();const control=await assertComposed('composed-control','Campaign');assertIdentity(control);assertGeometry(control);
  // Independent green native sentinel proves the capture includes the child view.
  const image=await capture('child-sentinel');assert.deepEqual(color(image,control.website.x+control.native.rect.x*control.zoom+205,control.website.y+17),[33,122,77]);
  for(const phase of ['cold','warm']){if(phase==='warm')await select('campaign');const selecting=dock.openSection(section);for(let i=0;i<3;i++){await frame(dock.hub.view.webContents);assertIdentity(await assertComposed(phase+'-'+section+'-'+i,'Campaign outgoing handoff'))}await selecting;assertIdentity(await sample(phase+'-'+section+'-ready'));const editor=dock.hub.editors.get(section);if(editor){const field=section==='appearance'?'#theme-name':'#preserved-names';if(phase==='cold')await js(editor.view.webContents,`window.originalDraft=document.querySelector(${JSON.stringify(field)});originalDraft.value='unsaved editor draft';true`);else assert.equal(await js(editor.view.webContents,`document.querySelector(${JSON.stringify(field)})===originalDraft&&originalDraft.value==='unsaved editor draft'`),true)}}
 }
 await fs.writeFile(path.join(evidence,'campaign-layout-samples.json'),JSON.stringify({mode,locale,samples,trace},null,2));console.log('Campaign layout PASS '+JSON.stringify({mode,locale,samples:samples.length,evidence}));dock.hide();await updates;window.close();window=null;await translation.shutdown();translation=null;clearTimeout(timeout);app.quit();
 }
 run().catch(async error=>{console.error(error);if(evidence)await fs.writeFile(path.join(evidence,'campaign-layout-failure.json'),JSON.stringify({mode,locale,samples,trace,error:String(error.stack)},null,2)).catch(()=>{});clearTimeout(timeout);window?.destroy();await translation?.shutdown().catch(()=>{});app.exit(1)});
}
