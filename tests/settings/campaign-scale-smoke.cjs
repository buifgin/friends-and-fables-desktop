// Coordinator-scheduled private CPU/X11 scale proof. Never launch on the host desktop.
// Native page factory copied at author time from campaign-layout-smoke.cjs (ee0a987);
// retain real native form topology and React ownership without importing an entrypoint.
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

// These pure programs are parsed by ordinary Node before any native run.
function measure(selectors) {
  const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  const result={viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},visibility:document.visibilityState,focus:document.hasFocus(),nodes:{}};
  for(const [name,selector] of Object.entries(selectors)) {
    const node=document.querySelector(selector);
    if(!node)throw Error('Missing measurement '+name+': '+selector);
    const style=getComputedStyle(node),range=document.createRange();range.selectNodeContents(node);
    const r=range.getBoundingClientRect();
    result.nodes[name]={text:node.textContent,rect:rect(node),glyph:{width:r.width,height:r.height},fontSize:parseFloat(style.fontSize),lineHeight:style.lineHeight,paddingLeft:style.paddingLeft,paddingTop:style.paddingTop,scrollTop:node.scrollTop,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight};
  }
  return result;
}
const selectors={
 campaign:{rail:'[data-ff-campaign-navigation]',navTitle:'[data-ff-campaign-navigation-title]',navText:'[data-ff-campaign-navigation] a[aria-current="page"]',close:'#native > button',title:'#native h3.font-header',label:'#native label',field:'#native textarea',scroller:'#native .flex-1.items-center.overflow-y-auto',content:'#native .mx-auto',panel:'#native',marker:'#native-marker',workspace:'.flex-1.h-full.w-full',composer:'.tiptap'},
 hub:{rail:'nav',navTitle:'#title',navText:'#sections button:first-child'},
 appearance:{close:'#close-panel',title:'main h1',label:'label[for="theme-name"]',content:'main',field:'#theme-name'},
};
const frameSource=`new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Visible RAF budget')),1500);requestAnimationFrame(()=>{clearTimeout(timer);resolve(true)})})`;
const identitySource=`(()=>({nativeSame:document.querySelector('#native')===window.originalNative,fieldSame:document.querySelector('#native textarea')===window.originalField,nativeConnected:window.originalNative?.isConnected,nativeDraft:window.originalField?.value,mounts:nativeMounts,composerSame:document.querySelector('.tiptap')===window.originalComposer,composerDraft:document.querySelector('.tiptap').textContent}))()`;
// Probe only the retained native textarea; no popup/portal markup is synthesized.
const fieldProbePrograms={
 prepare:`(()=>{
  const field=document.querySelector('#native textarea'),scroller=document.querySelector('#native .flex-1.items-center.overflow-y-auto'),panel=document.querySelector('#native');
  if(field!==window.originalField)throw Error('Pointer probe requires original native field');
  const saved={value:field.value,start:field.selectionStart,end:field.selectionEnd,direction:field.selectionDirection,scrollTop:scroller.scrollTop,scrollLeft:scroller.scrollLeft,fieldTop:field.scrollTop,fieldLeft:field.scrollLeft};
  const probe=window.__ffScaleFieldProbe={field,scroller,saved};
  probe.pointerReady=new Promise(resolve=>{probe.pointerListener=event=>{probe.pointer={trusted:event.isTrusted,targetSame:event.target===field};resolve();};});
  probe.inputReady=new Promise(resolve=>{probe.inputListener=event=>{probe.input={trusted:event.isTrusted,data:event.data,targetSame:event.target===field};resolve();};});
  field.addEventListener('mousedown',probe.pointerListener,{once:true});field.addEventListener('input',probe.inputListener,{once:true});
  // Establish a non-focused field precondition; only the real pointer may focus it.
  if(document.activeElement===field)field.blur();
  const r=field.getBoundingClientRect(),v=scroller.getBoundingClientRect(),q=parseFloat(getComputedStyle(panel).zoom)||1;
  scroller.scrollTop+=(r.y-v.y-(v.height-r.height)/2)/q;
  return {saved,unfocused:document.activeElement!==field};
 })()`,
 point:`(()=>{const p=window.__ffScaleFieldProbe,r=p.field.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}})()`,
 pointer:`(async()=>{const p=window.__ffScaleFieldProbe;await p.pointerReady;await new Promise(resolve=>requestAnimationFrame(resolve));return {...p.pointer,focused:document.activeElement===p.field,fieldSame:p.field===window.originalField}})()`,
 input:`(async()=>{const p=window.__ffScaleFieldProbe;await p.inputReady;return {...p.input,focused:document.activeElement===p.field,value:p.field.value,fieldSame:p.field===window.originalField}})()`,
 restore:`(()=>{const p=window.__ffScaleFieldProbe;if(!p)return null;const {field,scroller,saved}=p;field.removeEventListener('mousedown',p.pointerListener);field.removeEventListener('input',p.inputListener);field.value=saved.value;field.setSelectionRange(saved.start,saved.end,saved.direction);field.blur();field.scrollTop=saved.fieldTop;field.scrollLeft=saved.fieldLeft;scroller.scrollTop=saved.scrollTop;scroller.scrollLeft=saved.scrollLeft;delete window.__ffScaleFieldProbe;return {value:field.value,start:field.selectionStart,end:field.selectionEnd,direction:field.selectionDirection,scrollTop:scroller.scrollTop,scrollLeft:scroller.scrollLeft,fieldTop:field.scrollTop,fieldLeft:field.scrollLeft}})()`,
};
const programs=Object.fromEntries(Object.entries(selectors).map(([name,value])=>[name,`(${measure.toString()})(${JSON.stringify(value)})`]));
for(const program of [...Object.values(programs),...Object.values(fieldProbePrograms),frameSource,identitySource,websiteHtml.match(/<script>([\s\S]*)<\/script>/)[1]])new vm.Script(program);
if(!process.versions.electron) {
 module.exports={websiteHtml,programs,fieldProbePrograms,frameSource,identitySource};
} else {
 const fs=require('node:fs/promises'),os=require('node:os'),crypto=require('node:crypto');
 const {promisify}=require('node:util'),exec=promisify(require('node:child_process').execFile);
 const {app,BrowserWindow,WebContentsView,session,nativeImage}=require('electron');
 const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
 const {AppearanceManager,registerAppearanceScheme}=require(path.join(root,'dist/appearance/appearance'));
 const {DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
 const {TranslationManager}=require(path.join(root,'dist/translation/translation'));
 const {HostInstructionsManager}=require(path.join(root,'dist/commands/host-instructions'));
 const {configureFullscreenShortcuts}=require(path.join(root,'dist/shell/window-shortcuts'));
 const {configureNativeCampaignPanel}=require(path.join(root,'dist/settings/campaign-panel'));
 registerAppearanceScheme();app.on('window-all-closed',()=>{});
 let window,profile,evidence,appearance,translation,website,dock,stage='startup';
 const records=[],trace=[],websiteBounds=[];
 const locale=process.env.FABLES_CAMPAIGN_SCALE_LOCALE||'en';
 const levels=[...new Set([0,...(process.env.FABLES_CAMPAIGN_SCALE_ZOOMS||'-.5,.5').split(',').map(Number)])];
 assert.ok(['en','ru'].includes(locale));assert.ok(levels.every(level=>[0,-.5,.5].includes(level)));
 const captures=process.env.FABLES_CAMPAIGN_SCALE_CAPTURE==='1';
 const deadline=setTimeout(()=>{console.error('Campaign scale deadline at '+stage);window?.destroy();app.exit(1)},25000);
 function bounded(promise,label,ms=4000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Stage deadline: '+label)),ms)})]).finally(()=>clearTimeout(timer));}
 const js=(contents,program)=>{new vm.Script(program);return bounded(contents.executeJavaScript(program),stage+' renderer');};
 async function frame(contents){assert.equal(await js(contents,"document.visibilityState"),'visible','RAF target visible');await js(contents,frameSource);}
 async function painted(contents){contents.focus();assert.equal(await js(contents,'document.hasFocus()'),true);await frame(contents);await frame(contents);}
 async function select(section){stage='open '+section;console.log('Campaign scale stage '+stage);await bounded(dock.openSection(section),stage);const contents=section==='campaign'?website.webContents:dock.hub.editors.get(section).view.webContents;await painted(contents);}
 async function probeField(record){
  const contents=website.webContents,probe=record.inputProbe={};stage='native pointer/input zoom '+record.level;
  try {
   probe.prepared=await js(contents,fieldProbePrograms.prepare);assert.equal(probe.prepared.unfocused,true,'Field is not already focused before native pointer');
   await frame(contents);const point=await js(contents,fieldProbePrograms.point),factor=contents.getZoomFactor();
   assert.ok(point.width>0&&point.height>0);probe.point={css:point,x:Math.round(point.x*factor),y:Math.round(point.y*factor),factor,viewBounds:website.getBounds()};
   assert.ok(probe.point.x>=0&&probe.point.x<website.getBounds().width&&probe.point.y>=0&&probe.point.y<website.getBounds().height,'Pointer lies within native website view');
   const hit=`document.elementFromPoint(${probe.point.x/factor},${probe.point.y/factor})===window.originalField`;
   probe.hit=await js(contents,hit);assert.equal(probe.hit,true,'Rounded native DIP pointer hits exact textarea');
   contents.sendInputEvent({type:'mouseMove',x:probe.point.x,y:probe.point.y});
   contents.sendInputEvent({type:'mouseDown',x:probe.point.x,y:probe.point.y,button:'left',clickCount:1});
   contents.sendInputEvent({type:'mouseUp',x:probe.point.x,y:probe.point.y,button:'left',clickCount:1});
   probe.pointer=await js(contents,fieldProbePrograms.pointer);
   assert.deepEqual(probe.pointer,{trusted:true,targetSame:true,focused:true,fieldSame:true},'Trusted native pointer focuses retained textarea');
   contents.sendInputEvent({type:'keyDown',keyCode:'X'});contents.sendInputEvent({type:'char',keyCode:'X'});contents.sendInputEvent({type:'keyUp',keyCode:'X'});
   probe.input=await js(contents,fieldProbePrograms.input);
   assert.equal(probe.input.trusted,true);assert.equal(probe.input.targetSame,true);assert.equal(probe.input.focused,true);assert.equal(probe.input.fieldSame,true);
   assert.equal(probe.input.data,'X');assert.notEqual(probe.input.value,probe.prepared.saved.value,'Native keyboard changes textarea draft');
   assert.equal(probe.input.value.length,probe.prepared.saved.value.length+1,'Exactly one native character is inserted');
  } finally {
   probe.restored=await js(contents,fieldProbePrograms.restore);
   if(probe.prepared)assert.deepEqual(probe.restored,probe.prepared.saved,'Fixture value, selection and native scroll restored after input probe');
  }
 }
 async function capture(label,marker){
  if(!captures)return;
  assert.ok(process.env.DISPLAY,'Private X11 DISPLAY required');assert.equal(Boolean(process.env.WAYLAND_DISPLAY),false);
  // BrowserWindow.capturePage omits child views on Linux. Capture exact owned X11 window.
  const handle=window.getNativeWindowHandle(),id=handle.length>=8?handle.readBigUInt64LE():BigInt(handle.readUInt32LE());
  const {stdout}=await exec('/usr/bin/import',['-window','0x'+id.toString(16),'png:-'],{encoding:'buffer',maxBuffer:10*1024*1024,timeout:2000});
  const image=nativeImage.createFromBuffer(stdout);assert.equal(image.getSize().width,window.getContentSize()[0],'Exact owned window capture width');
  if(marker){const r=marker.physical.rect,x=Math.floor(r.x+r.width/2),y=Math.floor(r.y+r.height/2),pixels=image.toBitmap(),offset=(y*image.getSize().width+x)*4;assert.deepEqual([pixels[offset+2],pixels[offset+1],pixels[offset]],[33,122,77],'Independent native child sentinel proves composed capture');}
  await fs.writeFile(path.join(evidence,label+'.png'),stdout);
 }
 function physical(sample,factor,bounds){return {...sample,factor,bounds,nodes:Object.fromEntries(Object.entries(sample.nodes).map(([name,node])=>[name,{...node,physical:{fontSize:node.fontSize*factor,glyph:{width:node.glyph.width*factor,height:node.glyph.height*factor},rect:Object.fromEntries(Object.entries(node.rect).map(([key,value])=>[key,value*factor+(key==='x'||key==='right'?bounds.x:key==='y'||key==='bottom'?bounds.y:0)]))}}]))};}
 async function sample(contents,kind,view){return physical(await js(contents,programs[kind]),contents.getZoomFactor(),view.getBounds());}
 async function save(error){if(!evidence)return;const files=['dist/settings/campaign-panel.js','dist/settings/settings-hub.js','dist/shell/appearance-dock.js','assets/appearance/appearance.css','assets/settings/settings-hub.css'];const hashes={fixture:crypto.createHash('sha256').update(await fs.readFile(__filename)).digest('hex')};for(const file of files)hashes[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');await fs.writeFile(path.join(evidence,'campaign-scale.json'),JSON.stringify({appRoot:root,locale,levels,stage,versions:process.versions,display:process.env.DISPLAY,captures,hashes,records,trace,websiteBounds,error:error&&String(error.stack)},null,2));}
 const close=(actual,expected,label,tolerance=.65)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} vs ${expected}`);
 async function run(){
 profile=process.env.FABLES_TEST_PROFILE_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'campaign-scale-'));await fs.mkdir(profile,{recursive:true});app.setPath('userData',profile);await app.whenReady();evidence=process.env.FABLES_TEST_EVIDENCE_DIR||path.join(profile,'evidence');await fs.mkdir(evidence,{recursive:true});
 appearance=new AppearanceManager();await appearance.initialize();appearance.settings={...structuredClone(DEFAULT_APPEARANCE),preset:'custom',customColor:'#203040',appearancePanelWidth:580};appearance.setLocale(locale);
 window=new BrowserWindow({show:false,frame:false,width:1000,height:1000,backgroundColor:'#ff00ff',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});await window.loadURL('data:text/html,<style>html,body{margin:0;background:%23ff00ff}</style>');
 const site=session.fromPartition('campaign-scale-'+locale);site.protocol.handle('https',()=>new Response(websiteHtml,{headers:{'content-type':'text/html'}}));website=new WebContentsView({webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});window.contentView.addChildView(website);dock=appearance.attachMain(window,website);
 configureFullscreenShortcuts(website.webContents,window);
 const setWebsiteBounds=website.setBounds.bind(website);website.setBounds=b=>{setWebsiteBounds(b);websiteBounds.push({epoch:performance.timeOrigin+performance.now(),bounds:website.getBounds()});};
 website.webContents.setWindowOpenHandler(({url})=>{const navigation=/^fables-desktop:\/\/settings\/select-campaign-section\?section=(appearance|translation|instructions|music|combat|general)&ticket=([A-Za-z0-9_-]{1,128})$/.exec(url);if(navigation)void dock.navigateCampaignSection(navigation[1],navigation[2]);if(url==='fables-desktop://settings/close-campaign'){trace.push({nativeCloseRequest:true,time:performance.now()});dock.closeCampaign();}return {action:'deny'};});
 translation=new TranslationManager(profile,null);const instructions=new HostInstructionsManager(profile);await translation.initialize();await instructions.initialize();translation.settings={...translation.getSettings(),enabled:locale==='ru',showOriginal:false,translateDescriptions:false};translation.setAppearance(appearance.getSettings());instructions.setInterface(appearance.getSettings(),locale);translation.check=async()=>({available:false,message:'No fixture service'});
 let updates=Promise.resolve(),request=0,preparedNavigation;const update=(show,bounds={width:0,height:0},navigation)=>{const current=++request,c=website.webContents;if(show==='suspend'||show===false)preparedNavigation=undefined;void js(c,'window.__friendsFablesDesktopCampaignPanel?.cancelPending?.();true').catch(()=>{});updates=updates.then(async()=>{if(current!==request)return false;trace.push({show,bounds,website:website.getBounds(),time:performance.now()});const previous=c.getBackgroundThrottling();if(show===true||show==='prepare'||show==='reveal')c.setBackgroundThrottling(false);try{return await js(c,`(${configureNativeCampaignPanel.toString()})(${JSON.stringify(show)},${bounds.width},${bounds.height},${JSON.stringify({background:'#203040',foreground:'#f5f5f5',border:'#465050',accent:'#d8bb82',panel:'#17181a',selected:'#383a3e'})},${bounds.x??0},${JSON.stringify(navigation)})`)}finally{if((show===true||show==='prepare'||show==='reveal')&&!c.isDestroyed())c.setBackgroundThrottling(previous)}});return updates};
 dock.configureSettings({translation,instructions,campaign:{prepare:(b,navigation)=>{preparedNavigation=navigation;return update('prepare',b,navigation);},reveal:(b,ticket)=>preparedNavigation?.ticket===ticket?update('reveal',b,preparedNavigation):Promise.resolve(false),reserve:b=>update('reserve',b),show:(b,navigation)=>update(true,b,navigation),suspend:b=>{void update('suspend',b)},hide:()=>{void update(false)}}});await website.webContents.loadURL('https://play.fables.gg/'+campaignId+'/play');await js(website.webContents,`fixtureLocale=${JSON.stringify(locale)};true`);await dock.setCampaignAvailable(true);window.show();window.focus();website.webContents.focus();await frame(website.webContents);const focus=website.webContents;
 assert.equal(await js(focus,'document.hasFocus()'),true);assert.equal(await js(website.webContents,'typeof window.require'),'undefined');

 await js(website.webContents,"window.originalComposer=document.querySelector('.tiptap');true");
 for(const level of levels){
  stage='zoom '+level;website.webContents.setZoomLevel(level);const factor=website.webContents.getZoomFactor();
  await select('appearance');const editor=dock.hub.editors.get('appearance').view;
  if(level===0)await js(editor.webContents,"window.originalAppearanceField=document.querySelector('#theme-name');originalAppearanceField.value='unsaved Appearance draft';true");
  const local={hub:await sample(dock.hub.view.webContents,'hub',dock.hub.view),appearance:await sample(editor.webContents,'appearance',editor)};
  assert.equal(await js(editor.webContents,"document.querySelector('#theme-name')===window.originalAppearanceField&&originalAppearanceField.value==='unsaved Appearance draft'"),true);
  await capture('local-'+level);
  await select('campaign');
  if(level===0)await js(website.webContents,"document.querySelector('#native .flex-1.items-center.overflow-y-auto').scrollTop=123;true");
  const beforeScroll=await js(website.webContents,"document.querySelector('#native .flex-1.items-center.overflow-y-auto').scrollTop");
  const campaign=await sample(website.webContents,'campaign',website);
  const record={level,factor,local,campaign,identity:await js(website.webContents,identitySource),beforeScroll,hubBounds:dock.hub.bounds,editorId:editor.webContents.id,windowSize:window.getContentSize()};records.push(record);
  console.log('Campaign physical scale '+JSON.stringify(record));await capture('campaign-'+level,campaign.nodes.marker);
  await probeField(record);
  await select('appearance');await select('campaign');
  record.returnIdentity=await js(website.webContents,identitySource);
  record.afterScroll=await js(website.webContents,"document.querySelector('#native .flex-1.items-center.overflow-y-auto').scrollTop");
  record.afterZoom=website.webContents.getZoomFactor();
 }
 // Retain all zoom measurements before the first product assertion fails.
 stage='assert physical peer scale';await save();
 const baseline=records[0];
 for(const row of records){
  const {campaign:c,local:l,identity:i}=row,n=c.nodes;
  assert.equal(i.nativeSame,true);assert.equal(i.fieldSame,true);assert.equal(i.nativeConnected,true);assert.equal(i.mounts,1);assert.equal(i.nativeDraft,'native campaign draft');assert.equal(i.composerSame,true);assert.equal(i.composerDraft,'composer draft');assert.deepEqual(row.returnIdentity,i);
  assert.equal(row.afterScroll,row.beforeScroll,'Native scroll preserved across local handoff');close(row.afterZoom,row.factor,'Website zoom retained',1e-9);
  assert.equal(l.hub.factor,baseline.local.hub.factor);assert.equal(l.appearance.factor,baseline.local.appearance.factor);
  close(n.rail.physical.rect.width,126,'126 DIP navigation');close(n.panel.physical.rect.x,126,'Native form begins after rail');close(n.panel.physical.rect.width,row.hubBounds.width-126,'Native content width');close(n.panel.physical.rect.height,row.hubBounds.height,'Native content height');close(n.panel.physical.rect.y,row.hubBounds.y,'Native content top');close(n.composer.physical.rect.x,row.hubBounds.width,'Composer gutter');
  // Shared navigation and close are exact semantic peers. Content titles/labels
  // retain their own zoom-zero design size (Appearance may intentionally differ).
  for(const name of ['navTitle','navText']){
   close(n[name].physical.glyph.height,l.hub.nodes[name].physical.glyph.height,name+' physical glyph peer');
   close(n[name].physical.glyph.width,l.hub.nodes[name].physical.glyph.width,name+' physical glyph width peer',1);
  }
  close(n.close.physical.rect.width,l.appearance.nodes.close.physical.rect.width,'Close physical width matches local Appearance');
  close(n.close.physical.rect.height,34,'Close physical height is 34 DIP');
  for(const name of ['title','label'])close(n[name].physical.glyph.height,baseline.campaign.nodes[name].physical.glyph.height,name+' retains physical zoom-zero glyph height');
  for(const name of ['close','title','label'])close(l.appearance.nodes[name].physical.glyph.height,baseline.local.appearance.nodes[name].physical.glyph.height,'Local peer stable '+name);
 }
 stage='complete';await save();console.log('Campaign scale PASS '+JSON.stringify({locale,levels,evidence}));dock.hide();await bounded(updates,'cleanup');await translation.shutdown();translation=null;clearTimeout(deadline);window.close();window=null;app.quit();
 }
 run().catch(async error=>{console.error('Campaign scale FAIL at '+stage,error);await save(error).catch(console.error);clearTimeout(deadline);window?.destroy();await translation?.shutdown().catch(()=>{});app.exit(1)});
}
