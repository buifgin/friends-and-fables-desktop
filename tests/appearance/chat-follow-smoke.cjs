// Root-scheduled native fixture: isolated website DOM, no campaign/profile/network actions.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function followScenario(configure,settings,selected='all'){
 const names=['pinned-append','late-event-growth','franz-footer','css-only-growth','manual-reader','key-reader','pointer-reader','touch-reader','selection','pending-cancel','own-submit','own-submit-selection','own-submit-pointer','own-submit-cancel','own-submit-route','own-submit-disposed'];
 if(selected!=='all'&&!names.includes(selected))throw Error('Unknown chat follow case: '+selected);
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const settle=async()=>{await frame();await frame();await frame();};
 const rect=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right};};
 const cases=[];
 for(const name of names.filter(name=>selected==='all'||name===selected))for(const enabled of [false,true]){
  window.__friendsFablesDesktopChatAppearance?.dispose();
  document.body.innerHTML='<section id="chat"><main id="feed"><div id="events-list"></div></main><footer id="turn-controls"><button type="button">End turn Magnus</button></footer></section>';
  const feed=document.getElementById('feed'),list=document.getElementById('events-list'),footer=document.getElementById('turn-controls');
  const message=(id,height,text)=>{const row=document.createElement('div');row.id='event-'+id;row.innerHTML='<div id="event-container-'+id+'"><div id="event-message-card-'+id+'"><div class="prose"><p></p></div></div></div>';const card=row.firstElementChild.firstElementChild;card.style.minHeight=height+'px';card.querySelector('p').textContent=text;list.append(row);return {row,card,text:card.querySelector('p').firstChild};};
  const damage=(id,height)=>{const row=document.createElement('div');row.id='event-'+id;const card=document.createElement('div');card.className='bg-card border rounded-md damage';card.style.height=height+'px';card.innerHTML='<strong>Heart: target takes <span>6</span> damage</strong>';row.append(card);list.append(row);return {row,card,text:card.querySelector('span').firstChild};};
  for(let i=1;i<=12;i++)message(i,90,'Earlier narration '+i);
  const franz=message(100,160,'Franz: Would you like to do anything else? End your turn when ready.');
  let tail=['late-event-growth','css-only-growth'].includes(name)?damage(101,44):franz;
  const negative=['own-submit-selection','own-submit-pointer','own-submit-cancel','own-submit-route','own-submit-disposed','manual-reader','key-reader','pointer-reader','touch-reader','selection','pending-cancel'].includes(name);
  feed.scrollTop=feed.scrollHeight-feed.clientHeight;await settle();
  if(enabled)configure(settings);await settle();
  const geometry=()=>({scrollTop:feed.scrollTop,scrollHeight:feed.scrollHeight,clientHeight:feed.clientHeight,distanceToMax:feed.scrollHeight-feed.clientHeight-feed.scrollTop,feed:rect(feed),list:rect(list),tail:rect(tail.card),footer:rect(footer),paddingBottom:getComputedStyle(feed).paddingBottom,footerPosition:getComputedStyle(footer).position,tailParent:tail.row.id,tailMessage:tail.card.id||null});
  const initial=geometry();
  if(initial.distanceToMax>1||initial.tail.bottom>initial.footer.top+.5)throw Error('Fixture not initially pinned and unobstructed: '+JSON.stringify(initial));
  let selectionText,readingY,readingText;
  const older=document.getElementById('event-message-card-8');
  const glyphTop=()=>{const range=document.createRange();range.selectNodeContents(older.querySelector('p').firstChild);return range.getBoundingClientRect().top;};
  if((negative&&name!=='pending-cancel')||name==='own-submit'){
   const intent=name==='key-reader'?new KeyboardEvent('keydown',{bubbles:true,key:'PageUp'}):name==='pointer-reader'?new PointerEvent('pointerdown',{bubbles:true}):name==='touch-reader'?new Event('touchstart',{bubbles:true}):new WheelEvent('wheel',{bubbles:true,deltaY:-400});
   feed.dispatchEvent(intent);
   feed.scrollTop+=older.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;await settle();feed.dispatchEvent(new Event('scrollend',{bubbles:true}));await settle();
   readingText=older.querySelector('p').firstChild;readingY=glyphTop();
   if(name==='selection'||name==='own-submit-selection'){const range=document.createRange();range.selectNodeContents(readingText);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));selectionText=selection.toString();await settle();}
  }
  const before=geometry();const retainedText=tail.text;
  if(name.startsWith('own-submit')){
   if(name==='own-submit-pointer')feed.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
   // This proves the public causal API contract only. The coordinator separately
   // verifies the actual trusted native form submit crosswire.
   const controller=window.__friendsFablesDesktopChatAppearance;
   if(name==='own-submit-route')history.replaceState({},'', '/settings');
   if(name==='own-submit-disposed')controller?.dispose();
   controller?.followAfterSubmit();
   if(name==='own-submit-cancel')feed.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  }
  if(name==='css-only-growth'){
   // CSSOM changes produce no DOM mutation. The unchanged feed client size
   // requires the scoped content/final-event ResizeObserver to notice growth.
   document.styleSheets[0].insertRule('#event-101 .damage{height:164px!important}',document.styleSheets[0].cssRules.length);
  }else if(name==='late-event-growth'){
   // Existing standalone event grows outside every event-container/message-card.
   const lower=document.createElement('div');lower.className='hp';lower.textContent='HP 14 / 20';tail.card.append(lower);tail.card.style.height='164px';
  }else if(name==='franz-footer'){
   // Existing final narration grows while the footer overlaps the scroller's box.
   const paragraph=document.createElement('p');paragraph.textContent='Final Franz reply continues here.';paragraph.style.height='120px';tail.card.querySelector('.prose').append(paragraph);tail.card.style.minHeight='280px';
  }else tail=damage(102,120);
  if(name==='pending-cancel'){
   // Let the mutation observer queue its RAF, then navigate before that write.
   await Promise.resolve();
   feed.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'PageUp'}));
   feed.scrollTop+=older.getBoundingClientRect().top-feed.getBoundingClientRect().top-60;
   readingText=older.querySelector('p').firstChild;readingY=glyphTop();
  }
  await settle();const after=geometry();
  const fullyVisible=after.tail.bottom<=Math.min(after.feed.bottom,after.footer.top)+.5;
  const identity=negative?older.querySelector('p').firstChild===readingText:retainedText.isConnected;
  const follow=after.distanceToMax<=1;
  const readerPreserved=!negative||Math.abs(glyphTop()-readingY)<=.5;
  const selectionPreserved=!['selection','own-submit-selection'].includes(name)||window.getSelection().toString()===selectionText;
  const passed=identity&&readerPreserved&&selectionPreserved&&(negative||fullyVisible&&follow);
  cases.push({name,adapter:enabled?'on':'off',passed,fullyVisible,follow,identity,readerPreserved,selectionPreserved,before,after});
  window.getSelection().removeAllRanges();window.__friendsFablesDesktopChatAppearance?.dispose();
  if(name==='own-submit-route')history.replaceState({},'', '/fixture/play');
  if(name==='css-only-growth')document.styleSheets[0].deleteRule(document.styleSheets[0].cssRules.length-1);
 }
 return {passed:cases.filter(item=>item.adapter==='on').every(item=>item.passed),cases};
}
module.exports={followScenario};
if(process.versions.electron){
 const {app,BrowserWindow,session}=require('electron');app.on('window-all-closed',()=>{});
 let window,profile,passed=false;const timer=setTimeout(()=>{console.error('Chat follow fixture timed out');app.exit(1);},30000);
 (async()=>{try{
  profile=process.env.FABLES_TEST_PROFILE_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'ff-chat-follow-'));app.setPath('userData',profile);await app.whenReady();
  const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
  // Production modules are pure here; never import another Electron fixture.
  const {configureChatAppearance}=require(path.join(root,'dist/appearance/chat-appearance')),{DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
  const site=session.fromPartition('chat-follow');site.protocol.handle('https',()=>new Response('<!doctype html><style>body{margin:0}#chat{position:relative;width:900px;height:556px;margin:40px}#feed{box-sizing:border-box;height:100%;overflow-y:auto;overflow-anchor:auto;padding:0 0 64px}#turn-controls{position:absolute;bottom:0;left:0;right:0;height:56px;background:#123;z-index:5}.prose{padding:10px}.prose p{margin:0;line-height:24px}.damage{box-sizing:border-box;padding:10px;background:#812}</style>',{headers:{'Content-Type':'text/html'}}));
  window=new BrowserWindow({show:false,width:1920,height:1080,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});await window.loadURL('https://play.fables.gg/fixture/play');window.show();window.focus();window.webContents.focus();assert(window.isVisible());
  const selected=process.env.FABLES_CHAT_FOLLOW_CASE||'all';
  const result=await window.webContents.executeJavaScript(`(${followScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(DEFAULT_APPEARANCE)},${JSON.stringify(selected)})`);
  console.log('Chat bottom follow cases',JSON.stringify(result));assert.equal(result.passed,true,'Pinned tail or manual reader contract failed');passed=true;
 }catch(error){console.error('Chat follow fixture failed:',error);}finally{clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await fs.rm(profile,{recursive:true,force:true});app.exit(passed?0:1);}})().catch(error=>{console.error(error);app.exit(1);});
}
