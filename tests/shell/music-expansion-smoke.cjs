// Focused native geometry contract for the production Music header injector.
// Run through scripts/run-electron-test.cjs after the coordinator schedules
// the private CPU fixture.
const assert=require('node:assert/strict');
const {mkdir,writeFile}=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const {app,BrowserWindow,session}=require('electron');
const appRoot=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
const {configureWebsiteSettings}=require(path.join(appRoot,'dist/shell/website-settings'));
if(process.env.FABLES_TEST_PROFILE_DIR)app.setPath('userData',process.env.FABLES_TEST_PROFILE_DIR);
const INJECTOR_SCRIPT=`(${configureWebsiteSettings.toString()})(true,'en',{token:'fixture-token',state:{paused:true,available:true,next:true,volume:.5}})`;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label){const deadline=Date.now()+3000;while(!await predicate()){if(Date.now()>=deadline)throw new Error(`Timed out: ${label}`);await pause(20);}}
const nativeButton=(id,icon,extra='')=>`<button id="${id}" class="native-themed-control" type="button" ${extra} style="width:40px;height:40px;flex:0 0 40px;box-sizing:border-box;padding:0;border:0"><svg class="${icon}" viewBox="0 0 24 24" width="16" height="16"><path d="M4 4h16v16H4z"></path></svg></button>`;
// Preserve the established captured header structure and widths from the
// production Music smoke fixture, right-aligned within the viewport.
const nativeHeader=`<style>:root{--background:0 0% 8%;--border:0 0% 50%;--foreground:0 0% 96%;--muted:0 0% 24%;--primary:41 62% 65%}#native-desktop-controls{display:none;flex:0 0 auto;align-items:center;gap:8px}@media(min-width:768px){#native-desktop-controls{display:flex}}.native-themed-control{border-color:#374151!important;color:#6b7280!important;background-color:transparent!important}.native-themed-control[aria-pressed="true"]{background-color:#111827!important}.native-themed-control:disabled{opacity:.35}</style><header style="height:40px;display:flex;justify-content:flex-end"><div id="native-header-actions" class="flex flex-row items-center" data-ff-music-actions="native-outer" style="display:flex;align-items:center;width:480px;height:40px"><div id="native-desktop-controls" class="hidden md:flex items-center gap-2">${nativeButton('native-panels','lucide-panel-left','aria-pressed="true"')}${nativeButton('native-background','lucide-image','disabled')}</div><div id="native-avatar-actions" class="w-full justify-end flex flex-row flex-1" data-ff-music-native-actions="native-inner" style="display:flex;flex:1 1 0%;width:100%;justify-content:flex-end;align-items:center"><div id="native-search-wrapper" class="mx-2" style="margin:0 8px;flex:0 0 auto">${nativeButton('native-search','lucide-search')}</div>${nativeButton('native-invite','lucide-user-plus')}<div class="ml-1 flex flex-row space-x-1" id="native-avatar-container" style="display:flex;gap:4px;margin-left:4px">${Array.from({length:6},(_,i)=>`<button type="button" class="native-avatar" data-avatar="${i}" style="width:28px;height:28px;flex:0 0 28px;border-radius:50%"><img alt="Player ${i+1}" width="24" height="24"></button>`).join('')}</div></div></div></header>`;
const html=`<!doctype html><html><body style="margin:0;padding-top:32px;background:hsl(var(--background));color:hsl(var(--foreground))">${nativeHeader}<div class="grid relative" id="composer"><div id="working-context-bar-spacer"></div><div class="tiptap" contenteditable="true">Draft unchanged</div><button aria-label="Roll dice" id="dice">Dice</button></div></body></html>`;
const FRAME_SCRIPT=`(()=>{const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};const controls=document.querySelector('[data-ff-music-inline-controls]');const hitRects=[...controls.querySelectorAll('button,input')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,hit:hit===e||e.contains(hit)}});return {viewport:{width:innerWidth,height:innerHeight},launcher:box('[data-ff-desktop-music-launcher]'),group:box('[data-ff-desktop-music-group]'),header:box('header'),adjacent:['#native-panels','#native-background','#native-search','#native-invite','.native-avatar'].map(s=>box(s)),controlsBox:box('[data-ff-music-inline-controls]'),placement:controls.dataset.placement,controls:[...controls.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,width:r.width,height:r.height}}),hitRects,hidden:controls.hidden,inert:controls.inert}})()`;
new vm.Script(FRAME_SCRIPT,{filename:'music-expansion-frame.js'});
new vm.Script(INJECTOR_SCRIPT,{filename:'music-expansion-injector.js'});
if(!process.versions.electron)console.log('PASS: exact renderer frame and production injector scripts parse offline.');
if(process.versions.electron) runNative();
async function runNative(){
  const timer=setTimeout(()=>{console.error('Music expansion fixture timed out');app.exit(1)},20000);
  let parent,stage='app-ready';
  try{
    await app.whenReady();
    const site=session.fromPartition('music-expansion-fixture');
    site.protocol.handle('https',request=>new Response(html,{headers:{'Content-Type':'text/html'}}));
    parent=new BrowserWindow({show:false,width:1100,height:600,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
    parent.webContents.on('console-message',(_event,level,message,line,source)=>console.error(`renderer console level=${level} ${source}:${line}: ${message}`));
    parent.webContents.on('render-process-gone',(_event,details)=>console.error('renderer gone',JSON.stringify(details)));
    const js=async source=>{new vm.Script(source,{filename:`renderer-${stage}.js`});try{return await parent.webContents.executeJavaScript(source)}catch(error){throw new Error(`renderer stage=${stage} source=${source.slice(0,180)}: ${error.stack||error.message}`)}};
    stage='load captured native header';await parent.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play');
    stage='wait captured native header';await until(()=>js("!!document.querySelector('header #native-invite')"),'captured native header');
    stage='inject production website settings';
    await js(INJECTOR_SCRIPT);
    await until(()=>js("!!document.querySelector('[data-ff-desktop-music-launcher]')"),'production Music launcher');
    parent.show();parent.focus();parent.webContents.focus();
    await until(()=>parent.isVisible()&&parent.webContents.isFocused(),'visible focused fixture');
    const settleLayout=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))');
    const frame=()=>js(FRAME_SCRIPT);
    const finishReveal=()=>js("new Promise(resolve=>requestAnimationFrame(()=>{const controls=document.querySelector('[data-ff-music-inline-controls]');void controls.getBoundingClientRect();Promise.all(controls.getAnimations().filter(animation=>animation.transitionProperty==='width').map(animation=>animation.finished.catch(()=>undefined))).then(()=>resolve())}))");
    const sampleFrames=async()=>{const values=[];for(let i=0;i<24;i++){await js('new Promise(resolve=>requestAnimationFrame(()=>resolve()))');values.push(await frame());}return values;};
    const captureEvidence=async(name,geometry)=>{const directory=process.env.FABLES_TEST_EVIDENCE_DIR;if(!directory)return;await mkdir(directory,{recursive:true});const image=await parent.capturePage();await writeFile(path.join(directory,`${name}.png`),image.toPNG());await writeFile(path.join(directory,`${name}.json`),JSON.stringify({name,viewport:await js('({width:innerWidth,height:innerHeight,devicePixelRatio})'),geometry},null,2));};
    stage='configure wide naturally-sized right-aligned row';
    await js("(()=>{const row=document.getElementById('native-header-actions'),actions=document.getElementById('native-avatar-actions');row.style.width='max-content';row.style.marginLeft='auto';actions.style.flex='0 0 auto';actions.style.width='auto'})()");
    await settleLayout();const wideBefore=await frame();
    await captureEvidence('music-wide-collapsed',wideBefore);
    stage='wide open Music';await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");
    const wideOpening=await sampleFrames(),wideExpanded=wideOpening.at(-1);
    assert.equal(wideExpanded.launcher.x,wideBefore.launcher.x,'Wide right-aligned row keeps the Music trigger at its x coordinate.');
    assert.equal(wideExpanded.launcher.y,wideBefore.launcher.y,'Wide right-aligned row keeps the Music trigger at its y coordinate.');
    assert.equal(wideExpanded.header.height,wideBefore.header.height,'Wide right-aligned row keeps header height fixed.');
    assert.equal(wideExpanded.controlsBox.right+8,wideExpanded.launcher.x,'The complete wide playback reveal ends one native gap to the launcher left.');
    const wideWidths=wideOpening.map(state=>state.controlsBox.width);
    assert(wideWidths.some(width=>width>0&&width<wideExpanded.controlsBox.width),'Wide opening visibly interpolates the playback reveal width.');
    await captureEvidence('music-wide-expanded',wideExpanded);
    stage='locale refresh while expanded';await js("window.__fablesDesktopWebsiteSettingsCleanup.update('ru',{token:'fixture-token',state:{paused:true,available:true,next:true,volume:.5}})");
    const russianOpen=await frame();assert.equal(russianOpen.header.height,wideExpanded.header.height,'Locale refresh does not resize the expanded header.');assert(russianOpen.hitRects.every(control=>control.hit),'Every expanded transport control remains hit-testable after locale refresh.');
    await js("window.__fablesDesktopWebsiteSettingsCleanup.update('en',{token:'fixture-token',state:{paused:true,available:true,next:true,volume:.5}})");
    for(const state of wideOpening){assert.equal(state.launcher.x,wideBefore.launcher.x,'Wide launcher x stays fixed on each reveal frame.');assert.equal(state.launcher.y,wideBefore.launcher.y,'Wide launcher y stays fixed on each reveal frame.');assert.equal(state.header.height,wideBefore.header.height,'Wide header height stays fixed on each reveal frame.');}
    stage='wide close Music';await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");await sampleFrames();
    stage='rapid open-close before animation frame';await js("(()=>{const launcher=document.querySelector('[data-ff-desktop-music-launcher]');launcher.click();launcher.click()})()");
    assert.equal((await frame()).hidden,true,'Rapid open-close before the first animation frame does not leave empty expanded controls visible.');assert.equal((await frame()).inert,true,'Rapid open-close leaves controls inert.');
    stage='restore narrow captured row';await js("(()=>{const row=document.getElementById('native-header-actions'),actions=document.getElementById('native-avatar-actions');row.style.width='480px';row.style.marginLeft='';actions.style.flex='1 1 0%';actions.style.width='100%'})()");
    stage='measure collapsed baseline';await settleLayout();const before=await frame();await captureEvidence('music-narrow-collapsed',before);
    await js("window.fixtureAvatars=[...document.querySelectorAll('.native-avatar')]");
    stage='open Music';await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");
    const opening=await sampleFrames();
    const expanded=opening.at(-1);
    await captureEvidence('music-narrow-expanded',expanded);
    assert.equal(expanded.hidden,false,'Expanded state reveals inline controls.');
    assert.equal(expanded.inert,false,'Expanded controls are interactive.');
    assert.equal(expanded.controls.length,4,'Previous, play, next and library controls appear.');
    assert.equal(expanded.launcher.x,before.launcher.x,'Launcher x stays fixed while controls reveal.');
    assert.equal(expanded.launcher.y,before.launcher.y,'Launcher y stays fixed while controls reveal.');
    assert.equal(expanded.header.height,before.header.height,'Header height stays fixed while expanded.');
    if(expanded.placement==='left')assert.equal(expanded.controlsBox.right+8,expanded.launcher.x,'The complete inline playback reveal ends one native gap to the launcher left.');
    else assert(expanded.controlsBox.x>=0&&expanded.controlsBox.right<=expanded.viewport.width,'Narrow responsive fallback stays inside the viewport.');
    const openWidths=opening.map(state=>state.controlsBox.width);
    assert(openWidths.some(width=>width>0&&width<expanded.controlsBox.width),'Opening visibly interpolates the playback reveal width.');
    assert(opening.every((state,i)=>i===0||state.controlsBox.width+1>=opening[i-1].controlsBox.width),'Playback reveal width does not reverse while opening.');
    assert(opening.some(state=>state.controls[0]?.x<expanded.launcher.x),'Playback controls reveal to the launcher left.');
    for(const state of opening){assert.equal(state.launcher.x,before.launcher.x,'Launcher x is stable on every rendered opening frame.');assert.equal(state.launcher.y,before.launcher.y,'Launcher y is stable on every rendered opening frame.');assert.equal(state.header.height,before.header.height,'Header height is stable on every rendered opening frame.');}
    assert.equal(await js("[...document.querySelectorAll('.native-avatar')].every((e,i)=>e===window.fixtureAvatars[i])"),true,'Native avatar nodes remain in place.');
    const openNative=expanded.adjacent;for(let i=0;i<openNative.length;i++){assert.equal(openNative[i].x,before.adjacent[i].x,`Adjacent native control ${i} keeps x.`);assert.equal(openNative[i].y,before.adjacent[i].y,`Adjacent native control ${i} keeps y.`);}
    await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");
    const closing=await sampleFrames(),collapsed=closing.at(-1);
    assert.equal(collapsed.hidden,true,'Collapsed controls are hidden.');assert.equal(collapsed.inert,true,'Collapsed controls are inert.');
    assert.equal(collapsed.launcher.x,before.launcher.x,'Launcher x returns to its original position after close.');assert.equal(collapsed.launcher.y,before.launcher.y,'Launcher y returns to its original position after close.');assert.equal(collapsed.header.height,before.header.height,'Header height remains fixed after close.');
    const closeWidths=closing.map(state=>state.controlsBox.width);
    assert(closeWidths.some(width=>width>0&&width<closing[0].controlsBox.width),'Closing visibly interpolates the playback reveal width.');
    assert(closing.every((state,i)=>i===0||state.controlsBox.width<=closing[i-1].controlsBox.width+1),'Playback reveal width does not reverse while closing.');
    for(const state of closing){assert.equal(state.launcher.x,before.launcher.x,'Launcher x is stable on every rendered closing frame.');assert.equal(state.launcher.y,before.launcher.y,'Launcher y is stable on every rendered closing frame.');}
    stage='configure no-left-space responsive row';await js("(()=>{const row=document.getElementById('native-header-actions'),actions=document.getElementById('native-avatar-actions');row.style.width='100%';row.style.marginLeft='';actions.style.flex='1 1 0%';actions.style.width='100%'})()");
    await settleLayout();const fallbackBefore=await frame();await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");
    await until(()=>js("document.querySelector('[data-ff-music-inline-controls]').dataset.placement==='popover'"),'responsive popover placement');
    await finishReveal();const fallbackExpanded=await frame();
    assert.equal(fallbackExpanded.launcher.x,fallbackBefore.launcher.x,'Responsive popover keeps launcher x fixed.');assert.equal(fallbackExpanded.launcher.y,fallbackBefore.launcher.y,'Responsive popover keeps launcher y fixed.');assert.equal(fallbackExpanded.header.height,fallbackBefore.header.height,'Responsive popover does not resize the header.');
    assert.equal(fallbackExpanded.controls.length,4,'Responsive popover keeps all transport buttons available.');assert(fallbackExpanded.controlsBox.x>=0&&fallbackExpanded.controlsBox.right<=fallbackExpanded.viewport.width,'Responsive popover remains inside the viewport.');
    assert(fallbackExpanded.hitRects.every(control=>control.hit&&control.x>=0&&control.right<=fallbackExpanded.viewport.width&&control.y>=0&&control.bottom<=fallbackExpanded.viewport.height),'Every responsive popover control remains visible and hit-testable.');
    await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");await until(()=>js("document.querySelector('[data-ff-music-inline-controls]').hidden"),'popover closed before rapid open-close');
    stage='popover rapid open-close before animation frame';await js("(()=>{const launcher=document.querySelector('[data-ff-desktop-music-launcher]');launcher.click();launcher.click()})()");assert.equal((await frame()).hidden,true,'Popover rapid open-close hides its zero-width controls immediately.');assert.equal((await frame()).inert,true,'Popover rapid open-close leaves controls inert.');
    await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");await until(()=>js("!document.querySelector('[data-ff-music-inline-controls]').hidden"),'popover reopened after rapid close');
    await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");await until(()=>js("document.querySelector('[data-ff-music-inline-controls]').hidden"),'responsive popover collapse');
    stage='resize expanded popover to 360px viewport';parent.setContentSize(360,600);await until(()=>js('innerWidth===360'),'360px viewport');await js("document.getElementById('native-header-actions').style.width='100%'");await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");await until(()=>js("!document.querySelector('[data-ff-music-inline-controls]').hidden"),'360px expanded popover');
    await finishReveal();const tinyExpanded=await frame();assert.equal(tinyExpanded.controls.length,4,'360px fallback keeps all transport buttons available.');assert(tinyExpanded.hitRects.every(control=>control.hit&&control.x>=0&&control.right<=tinyExpanded.viewport.width&&control.y>=0&&control.bottom<=tinyExpanded.viewport.height),'Every 360px popover control stays inside the viewport and hit-testable.');
    const tinyBounds=JSON.stringify(tinyExpanded.controlsBox);parent.setContentSize(1100,600);await until(()=>js('innerWidth===1100'),'1100px viewport restored');await js("window.__fablesDesktopWebsiteSettingsCleanup.update('ru',{token:'fixture-token',state:{paused:true,available:true,next:true,volume:.5}})");const resizedOpen=await frame();assert(resizedOpen.hitRects.every(control=>control.hit&&control.x>=0&&control.right<=resizedOpen.viewport.width),'Resized expanded controls remain viewport-bounded and hit-testable.');assert(tinyBounds.length>0);
    await js("document.querySelector('[data-ff-desktop-music-launcher]').click()");await until(()=>js("document.querySelector('[data-ff-music-inline-controls]').hidden"),'360px fallback collapse');await js("window.__fablesDesktopWebsiteSettingsCleanup.update('en',{token:'fixture-token',state:{paused:true,available:true,next:true,volume:.5}})");
    stage='emulate reduced motion';parent.webContents.debugger.attach('1.3');
    await parent.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await js("matchMedia('(prefers-reduced-motion: reduce)').matches"),true,'Fixture can exercise the reduced-motion media preference.');
    const keyboard=async key=>{for(const type of ['keyDown','char','keyUp'])parent.webContents.sendInputEvent({type,keyCode:key});};
    stage='keyboard open';
    await js("document.querySelector('[data-ff-desktop-music-launcher]').focus()");await keyboard('Enter');
    await until(()=>js("!document.querySelector('[data-ff-music-inline-controls]').hidden"),'Enter activation');
    assert.equal(await js("document.querySelector('[data-ff-music-inline-controls]').hidden"),false,'Keyboard focus can open the group.');
    assert.equal(await js("document.querySelector('[data-ff-music-inline-controls]').getAnimations().filter(animation=>animation.playState==='running'&&animation.transitionProperty==='width').length"),0,'Reduced motion prevents a running width reveal while open.');
    stage='keyboard escape close';await js("document.querySelector('[data-ff-music-control=play]').focus()");await keyboard('Escape');
    await until(()=>js("document.querySelector('[data-ff-music-inline-controls]').hidden"),'Escape collapse');
    assert.equal(await js("document.activeElement===document.querySelector('[data-ff-desktop-music-launcher]')"),true,'Escape restores focus to the Music launcher.');
    assert.equal(await js("document.querySelector('[data-ff-music-inline-controls]').getAnimations().filter(animation=>animation.playState==='running').length"),0,'Reduced-motion preference leaves no running reveal animation after Escape.');
    parent.webContents.debugger.detach();
    stage='native min-height ownership';await js("document.querySelector('header').style.minHeight='123px';document.getElementById('native-header-actions').style.width='320px'");await settleLayout();
    assert.equal(await js("document.querySelector('header').style.minHeight"),'123px','Native later min-height writes take priority over row fitting.');
    await js('window.__fablesDesktopWebsiteSettingsCleanup()');
    assert.equal(await js("document.querySelector('header').style.minHeight"),'123px','Cleanup preserves native later min-height writes.');
    console.log(`PASS: Music fixed-anchor reveal, leftward controls, adjacent native geometry, fixed header height, close/inert, and Escape focus. frames=${opening.length+closing.length}`);
    clearTimeout(timer);parent.destroy();app.exit(0);
  }catch(error){console.error(error);clearTimeout(timer);for(const window of BrowserWindow.getAllWindows())window.destroy();app.exit(1);}
}
