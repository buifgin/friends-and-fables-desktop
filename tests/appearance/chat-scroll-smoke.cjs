const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
// Export the browser scenario for syntax/offline inspection without launching Electron.
async function scrollScenario(configure,settings){
 const check=(value,message)=>{if(!value)throw Error(message);},frame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),settle=async()=>{await frame();await frame();};
 const feed=document.getElementById('feed');
 const card=(id,height,text,roll=false)=>{const row=document.createElement('div');row.id='event-'+id;const container=document.createElement('div');container.id='event-container-'+id;const body=document.createElement('div');body.id='event-message-card-'+id;body.style.height=height+'px';body.className='card';body.innerHTML=(roll?'<svg id="d8" width="18" height="18"></svg>':'')+'<div class="prose"><p></p></div>';body.querySelector('p').textContent=text;container.append(body);row.append(container);feed.append(row);return {row,container,body};};
 const top=document.createElement('div');top.style.height='520px';feed.append(top);
 const older=[document.createElement('div'),document.createElement('div')];for(const node of older)feed.append(node);
 const gm=card(140,100,'Native narration');const heading=document.createElement('div');heading.style.height='40px';gm.body.prepend(heading);const choices=document.createElement('div');gm.container.append(choices);
 const roll=card(149,120,'Damage 8',true),following=card(184,100,'Final native response');
 const bottom=document.createElement('div');bottom.style.height='520px';feed.append(bottom);
 const glyph=()=>{const range=document.createRange();range.selectNodeContents(roll.body.querySelector('p').firstChild);const r=range.getClientRects()[0];return {x:r.x,y:r.y,height:r.height};};
 const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
 const snapshot=()=>({rollY:roll.body.getBoundingClientRect().y,glyph:glyph(),scroll:feed.scrollTop,gmHeight:gm.body.getBoundingClientRect().height,gm:rect(gm.body),narration:rect(gm.body.querySelector('.prose')),roll:rect(roll.body),feed:rect(feed),branch:choices.getBoundingClientRect().height,text:roll.body.textContent});
 const readPosition=()=>{feed.scrollTop+=gm.row.getBoundingClientRect().top-feed.getBoundingClientRect().top+30;};
 const clear=async()=>{choices.replaceChildren();for(const node of older)node.replaceChildren();await settle();readPosition();await settle();};
 const hydrate=()=>{for(const node of older){const result=document.createElement('div');result.style.height='82px';result.textContent='Native earlier result';node.append(result);}const branch=document.createElement('div');branch.style.height='82px';branch.textContent='Damage / Rolled';choices.append(branch);};
 readPosition();configure(settings);await settle();await frame();
 const before=snapshot(),nativeRoll=roll.body,nativeText=roll.body.querySelector('p').firstChild;
 check(before.gm.y<before.feed.y&&before.gm.bottom>before.feed.y,'Fixture GM must be partially visible');
 check(before.narration.y>=before.feed.y&&before.narration.bottom<=before.feed.bottom,'Fixture GM prose must be visible for native browser anchor');
 check(before.roll.y>=before.feed.y&&before.roll.bottom<=before.feed.bottom,'Fixture numeric roll must be fully visible');
 // Native browser anchoring remains enabled. Two earlier82px branches precede
 // visible GM prose, while another82px choice mounts below that same narration.
 // Let Chromium choose its own anchor/scroll delta; no forced programmatic scroll.
 hydrate();await settle();const after=snapshot();
 check(Math.abs(after.rollY-before.rollY)<=.5&&Math.abs(after.glyph.y-before.glyph.y)<=.5,'Late82px native branch shifted reading roll/glyph: '+JSON.stringify({before,after}));
 check(roll.body===nativeRoll&&roll.body.querySelector('p').firstChild===nativeText&&after.text===before.text&&after.gmHeight===before.gmHeight&&after.branch===82,'Anchor mitigation changed native content/identity or concealed branch');
 const cases=[{name:'late-branch',before,after}];
 // Trusted native wheel/key/touch/pointer intent is covered through the same
 // capture listeners; fixtures dispatch intent to test precedence without OS input.
 for(const type of ['wheel','touchstart','pointerdown','keydown']){
  await clear();const event=type==='keydown'?new KeyboardEvent(type,{key:'PageDown',bubbles:true}):type==='pointerdown'?new PointerEvent(type,{bubbles:true,clientX:feed.getBoundingClientRect().right-1,clientY:150}):new Event(type,{bubbles:true});
  feed.dispatchEvent(event);feed.scrollTop+=following.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;await frame();const intended=following.body.getBoundingClientRect().y;hydrate();await settle();
  check(Math.abs(following.body.getBoundingClientRect().y-intended)<=.5,'User '+type+' selected reading position was overwritten');cases.push({name:type,readingY:following.body.getBoundingClientRect().y});feed.dispatchEvent(new Event('scrollend'));window.dispatchEvent(new PointerEvent('pointerup'));feed.dispatchEvent(new Event('touchend'));
 }
 await clear();feed.dispatchEvent(new Event('wheel',{bubbles:true}));feed.scrollTop+=following.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;await settle();
 const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(following.body.querySelector('p'));selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));await frame();
 const selectionY=following.body.getBoundingClientRect().y,selectionText=selection.toString();hydrate();await settle();check(selection.toString()===selectionText&&Math.abs(following.body.getBoundingClientRect().y-selectionY)<=.5,'Selected native reading text moved or selection changed');selection.removeAllRanges();feed.dispatchEvent(new Event('scrollend'));cases.push({name:'selection'});
 // An unrelated header must not cause visibility/style work in the feed.
 await clear();const header=document.createElement('header');document.body.append(header);await settle();const computed=window.getComputedStyle;let styleReads=0;window.getComputedStyle=function(...args){styleReads++;return computed.apply(this,args);};
 try{for(let i=0;i<3;i++){header.style.opacity=String(.8+i*.05);header.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));header.dispatchEvent(new Event('touchend',{bubbles:true}));document.dispatchEvent(new Event('selectionchange'));await settle();}check(styleReads===0,'Unrelated header caused style reads: '+styleReads);}finally{window.getComputedStyle=computed;header.remove();}cases.push({name:'unrelated-header',styleReads});
 // More history may exist, but preference ownership must stay within40 cards.
 await clear();const old=[];for(let i=0;i<45;i++){const item=card(1000+i,4,'Older native history');feed.insertBefore(item.row,gm.row);old.push(item.row);}readPosition();await settle();
 const owned=old.filter(row=>row.style.getPropertyValue('overflow-anchor')==='none');check(owned.length<=39&&old.slice(0,5).every(row=>row.style.getPropertyValue('overflow-anchor')===''),'Anchor preference exceeded bounded40-card history');for(const row of old)row.remove();await settle();cases.push({name:'bounded-history',owned:owned.length});
 await clear();feed.scrollTop=feed.scrollHeight-feed.clientHeight;await settle();hydrate();await settle();
 check(Math.abs(feed.scrollHeight-feed.clientHeight-feed.scrollTop)<=1,'Bottom-pinned reader stopped following native content');cases.push({name:'bottom-follow'});
 await clear();window.dispatchEvent(new Event('resize'));feed.scrollTop+=following.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;await frame();const resizeY=following.body.getBoundingClientRect().y;hydrate();await settle();check(Math.abs(following.body.getBoundingClientRect().y-resizeY)<=.5,'Resize rebasing replayed stale reading position');cases.push({name:'resize'});
 await clear();document.dispatchEvent(new Event('ff-desktop-translation-ready'));feed.scrollTop+=following.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;await frame();const localeY=following.body.getBoundingClientRect().y;hydrate();await settle();check(Math.abs(following.body.getBoundingClientRect().y-localeY)<=.5,'Locale rebasing replayed stale reading position');cases.push({name:'locale'});
 await clear();feed.style.height='160px';feed.style.width='580px';await settle();await frame();
 const small=snapshot();check(small.roll.bottom>small.feed.bottom&&small.narration.y>=small.feed.y&&small.narration.bottom<=small.feed.bottom,'Native resize fixture needs partial roll and fully visible narration');
 hydrate();await settle();const resized=snapshot();check(Math.abs(resized.narration.y-small.narration.y)<=.5&&resized.branch===82,'Actual feed-only resize retained stale roll preference instead of native visible narration');cases.push({name:'feed-resize',before:small.narration.y,after:resized.narration.y});feed.style.height='400px';feed.style.width='600px';await settle();
 await clear();history.replaceState({},'', '/settings');window.dispatchEvent(new Event('popstate'));feed.scrollTop+=following.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;await frame();const routeY=following.body.getBoundingClientRect().y;hydrate();await settle();check(Math.abs(following.body.getBoundingClientRect().y-routeY)<=.5,'Route change retained stale reading correction');cases.push({name:'route'});
 history.replaceState({},'', '/fixture/play');window.dispatchEvent(new Event('popstate'));await clear();
 gm.row.style.setProperty('overflow-anchor','auto','important');
 window.__friendsFablesDesktopChatAppearance.dispose();check(gm.row.style.getPropertyValue('overflow-anchor')==='auto'&&gm.row.style.getPropertyPriority('overflow-anchor')==='important','Dispose overwrote a newer native style owner');
 check([...feed.querySelectorAll('[id^="event-"]')].every(node=>node===gm.row||node.style.getPropertyValue('overflow-anchor')!=='none'),'Dispose retained owned overflow-anchor styles');feed.scrollTop+=following.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;await frame();const disposedY=following.body.getBoundingClientRect().y;hydrate();await settle();check(Math.abs(following.body.getBoundingClientRect().y-disposedY)<=.5,'Disposed controller retained stale reading correction');cases.push({name:'dispose'});
 return {passed:true,cases};
}
module.exports={scrollScenario};
if(process.versions.electron){
 const {app,BrowserWindow,session}=require('electron');app.on('window-all-closed',()=>{});
 let window,profile,passed=false;const timer=setTimeout(()=>{console.error('Chat scroll fixture timed out');app.exit(1)},30000);
 (async()=>{try{
  profile=await fs.mkdtemp(path.join(os.tmpdir(),'ff-chat-scroll-'));app.setPath('userData',profile);await app.whenReady();
  const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..'),{configureChatAppearance}=require(path.join(root,'dist/appearance/chat-appearance')),{DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
  const site=session.fromPartition('chat-scroll');site.protocol.handle('https',()=>new Response('<!doctype html><style>body{margin:0}#feed{position:relative;height:400px;width:600px;overflow-y:scroll;overflow-anchor:auto;margin-top:40px}.card{box-sizing:border-box;padding:10px}.prose p{margin:0;line-height:24px}</style><main id="feed"></main>',{headers:{'Content-Type':'text/html'}}));
  window=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});await window.loadURL('https://play.fables.gg/fixture/play');window.show();window.focus();window.webContents.focus();assert(window.isVisible());
  const result=await window.webContents.executeJavaScript(`(${scrollScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(DEFAULT_APPEARANCE)})`);assert.equal(result.passed,true);console.log('Chat scroll anchor fixture passed',JSON.stringify(result));passed=true;
 }catch(error){console.error('Chat scroll anchor fixture failed:',error);}finally{clearTimeout(timer);window?.destroy();if(profile)await fs.rm(profile,{recursive:true,force:true});app.exit(passed?0:1);}})().catch(error=>{console.error(error);app.exit(1)});
}
