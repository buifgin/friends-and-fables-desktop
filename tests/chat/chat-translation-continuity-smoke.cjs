// ROOT schedules this finite visible native fixture. No real session/model/network.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function continuityScenario(configure,settings,install,dictionary,local){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const settle=async()=>{await frame();await frame();};
 const check=(value,message)=>{if(!value)throw Error(message);};
 const campaign='01a0d854-78d5-7064-ae41-f63d561c8e01',token='combined-continuity';
 document.body.innerHTML='<main id="feed"><div id="events-list"></div></main><section class="grid relative"><div class="tiptap" contenteditable="true">Preserve the native draft.</div></section>';
 const list=document.getElementById('events-list'),draft=document.querySelector('.tiptap'),draftNode=draft.firstChild;
 const card=(id,source)=>{const row=document.createElement('div');row.id='event-'+id;const card=document.createElement('div');card.id='event-message-card-'+id;card.className='card';card.innerHTML='<div class="author">Native author</div><div class="prose"><div class="space-y-4 whitespace-normal"><p></p></div></div>';
  const text=card.querySelector('p').appendChild(document.createTextNode(source));
  const event={id,role:'dm',content:source,campaign_id:campaign};card.__reactFiber$fixture={memoizedProps:{event}};
  row.append(card);list.append(row);return {row,card,text,event,body:card.querySelector('.prose')};};
 const source='The amber river curves beneath the silent tower.',native=card(1,source);
 configure(settings);install(token,dictionary,true,[],local,true,false);await settle();
 const controller=window.__friendsFablesDesktopTranslation;
 // Drive the actual DOM controller as TranslationManager would. A native
 // deferred Promise owns completion; no network/model or hand-written markers.
 const collect=async()=>{await new Promise(resolve=>setTimeout(resolve,220));return controller.collect().nodes;};
 const initial=await collect();check(initial.length>0,'Combined fixture produced no real translation request');
 let resolveInitial;const firstResponse=new Promise(resolve=>{resolveInitial=resolve;}).then(results=>controller.finish(token,results));
 resolveInitial(initial.map(node=>({id:node.id,version:node.version,text:'Река огибает тихую башню.',complete:true})));await firstResponse;await settle();
 check(native.text.data==='Река огибает тихую башню.','Real translation completion prerequisite');
 const sourceUpdate=source+' Another lantern appears beside the river.';native.event.content=sourceUpdate;native.text.data=sourceUpdate;
 const newcomer=card(2,'The distant mountain shines above the misty forest.');
 await settle();const pending=await collect();check(pending.length>=2,'Existing/new native cards did not enter real pending translation');
 let resolveFinal;const finalResponse=new Promise(resolve=>{resolveFinal=resolve;}).then(results=>controller.finish(token,results));
 // Real partial publication retains a visible translated prefix and pending dot.
 controller.finish(token,pending.map(node=>({id:node.id,version:node.version,text:'Готовая часть. Pending remainder.',complete:false,pending:[{start:14,end:32}]})));
 await settle();
 const visible=element=>{for(let node=element;node;node=node.parentElement){const s=getComputedStyle(node);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0'||s.contentVisibility==='hidden')return false;}return true;};
 const ink=s=>s.color!=='transparent'&&s.color!=='rgba(0, 0, 0, 0)'&&s.webkitTextFillColor!=='transparent'&&s.webkitTextFillColor!=='rgba(0, 0, 0, 0)';
 const sample=()=>{const read=item=>{
   const presented=item.card.querySelector('[data-ff-translation-placeholder]')||item.card.querySelector('[data-ff-desktop-message-snapshot]')||item.body;
   const walker=document.createTreeWalker(presented,NodeFilter.SHOW_TEXT);let n,glyph=false;
   while(n=walker.nextNode()){if(!n.data.trim())continue;const range=document.createRange();range.selectNodeContents(n);const r=range.getClientRects()[0];const s=getComputedStyle(n.parentElement);if(r?.width>0&&r.height>0&&visible(n.parentElement)&&ink(s))glyph=true;}
   const dots=presented.querySelector('[data-ff-translation-dot]');const progress=!!dots&&visible(dots)&&ink(getComputedStyle(dots,'::after'))&&getComputedStyle(dots,'::after').content!=='none'&&dots.getBoundingClientRect().height>0;
   return {glyph,progress,presentation:presented.hasAttribute('data-ff-translation-placeholder')?'translation':presented.hasAttribute('data-ff-desktop-message-snapshot')?'continuity':'native',nativeEmpty:!item.text.data.trim(),sameBody:item.card.querySelector('.prose')===item.body,textConnected:item.text.isConnected};
  };return {at:performance.now(),existing:read(native),newCard:read(newcomer),draftSame:draft.firstChild===draftNode&&draft.textContent==='Preserve the native draft.'};};
 const before=sample();check(before.existing.glyph||before.existing.progress,'Partial existing-card presentation prerequisite');check(before.newCard.glyph||before.newCard.progress,'Partial new-card presentation prerequisite');
 // A native hydration gap clears the same live Text nodes while the streamed
 // translation Promise remains unresolved. No fake pending attributes are set.
 native.text.data='';newcomer.text.data='';
 const frames=[];for(let i=0;i<3;i++){await frame();frames.push(sample());}
 resolveFinal([]);await finalResponse;
 const retained=native.text.isConnected&&newcomer.text.isConnected&&frames.every(s=>s.existing.sameBody&&s.newCard.sameBody&&s.draftSame);
 const nonblank=frames.every(s=>(s.existing.glyph||s.existing.progress)&&(s.newCard.glyph||s.newCard.progress));
 window.__friendsFablesDesktopTranslation.dispose();window.__friendsFablesDesktopChatAppearance.dispose();
 return {passed:retained&&nonblank,case:'real-translation-pending-native-hydration',before,frames,retained,nonblank};
}
// Begins with the controllers already installed, as on a running campaign.
// Only native card/text writes drive pending state; production code owns markers.
async function firstPaintScenario(configure,settings,install,dictionary,local,dynamic,role='dm'){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const check=(value,message)=>{if(!value)throw Error(`First paint role=${role} dynamic=${dynamic}: ${message}`);};
 const token=`first-paint-${role}-${dynamic}`,campaign='01a0d854-78d5-7064-ae41-f63d561c8e01';
 document.body.innerHTML='<main id="feed"><div id="events-list"></div></main><section class="grid relative"><div class="tiptap" contenteditable="true">Preserve the native draft.</div></section>';
 const list=document.getElementById('events-list'),draft=document.querySelector('.tiptap'),draftNode=draft.firstChild;
 configure(settings);install(token,dictionary,true,[],local,true,dynamic);
 const controller=window.__friendsFablesDesktopTranslation;
 const id=role==='player'?4:3;
 const row=document.createElement('div');row.id=`event-${id}`;
 const card=document.createElement('div');card.id=`event-message-card-${id}`;card.className='card';
 card.innerHTML='<div class="author">Mira</div><div class="prose"><div class="space-y-4 whitespace-normal"><p></p></div></div>';
 const body=card.querySelector('.prose'),paragraph=card.querySelector('p'),text=paragraph.appendChild(document.createTextNode(''));
 const source='The amber river curves beneath the silent tower. Another lantern appears beside the river.';
 const event={id,role,content:'',campaign_id:campaign,...(role==='player'?{character_id:42}:{})};card.__reactFiber$fixture={memoizedProps:{event}};
 row.append(card);list.append(row);
 const visible=element=>{for(let node=element;node;node=node.parentElement){const s=getComputedStyle(node);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0'||s.contentVisibility==='hidden')return false;}return true;};
 const ink=style=>style.color!=='transparent'&&style.color!=='rgba(0, 0, 0, 0)'&&style.webkitTextFillColor!=='transparent'&&style.webkitTextFillColor!=='rgba(0, 0, 0, 0)';
 const sample=stage=>{
  const presented=card.querySelector('[data-ff-translation-placeholder]')||card.querySelector('[data-ff-desktop-message-snapshot]')||body;
  const walker=document.createTreeWalker(presented,NodeFilter.SHOW_TEXT);let node,glyph=false;
  while(node=walker.nextNode())if(node.data.trim()&&visible(node.parentElement)){
   const range=document.createRange();range.selectNodeContents(node);const r=range.getClientRects()[0],s=getComputedStyle(node.parentElement);
   if(r?.width>0&&r.height>0&&ink(s))glyph=true;
  }
  const dot=presented.querySelector('[data-ff-translation-dot]'),dotStyle=dot&&getComputedStyle(dot,'::after');
  const progress=!!dot&&visible(dot)&&ink(dotStyle)&&!!dotStyle?.content&&dotStyle.content!=='none'&&dotStyle.content!=='""'&&dot.getBoundingClientRect().height>0;
  const englishVisible=/[A-Za-z]{2,}/.test(text.data)&&visible(paragraph)&&ink(getComputedStyle(paragraph));
  const rect=body.getBoundingClientRect(),shown=presented.getBoundingClientRect();
  return {stage,glyph,progress,englishVisible,presentation:presented===body?'native':presented.hasAttribute('data-ff-translation-placeholder')?'translation':'continuity',
   sameBody:card.querySelector('.prose')===body,sameText:paragraph.firstChild===text&&text.isConnected,
   draftSame:draft.firstChild===draftNode&&draft.textContent==='Preserve the native draft.',
   nativeCount:paragraph.childNodes.length,bodyHeight:rect.height,presentationHeight:shown.height,at:performance.now()};
 };
 await frame();const authorOnly=sample('author-only');
 check(!body.querySelector('[data-ff-translation-placeholder]'),'author-only card was given a fake pending indicator');
 event.content=source;text.data=source;
 const frames=[];
 const capture=async stage=>{await frame();const value=sample(stage);frames.push(value);return value;};
 for(let i=0;i<3;i++)await capture(`insert-${i}`);
 await new Promise(resolve=>setTimeout(resolve,220));
 const requested=controller.collect().nodes.filter(node=>node.text===source);
 check(requested.length===1,'native source did not produce exactly one real translation request');
 await capture('no-response');
 const partial='Готовая часть. Pending remainder.';
 controller.finish(token,requested.map(node=>({id:node.id,version:node.version,text:partial,complete:false,pending:[{start:partial.indexOf('Pending'),end:partial.length}]})));
 await capture('partial');await capture('partial-settled');
 text.data='';for(let i=0;i<3;i++)await capture(`native-gap-${i}`);
 // Native hydration restores the same source node. Collect its current version,
 // rather than publishing a stale pre-hydration translation result.
 text.data=source;await capture('rehydrated');
 await new Promise(resolve=>setTimeout(resolve,220));
 const hydrated=controller.collect().nodes.filter(node=>node.text===source);
 check(hydrated.length===1,'rehydrated native source did not enter the controller');
 controller.finish(token,hydrated.map(node=>({id:node.id,version:node.version,text:'Река огибает тихую башню.',complete:true})));
 await capture('final');
 const final=text.data==='Река огибает тихую башню.'&&!body.querySelector('[data-ff-translation-placeholder]');
 // Show-original toggle disposes the real translation controller.
 controller.dispose();await frame();await frame();
 const originalRestored=text.data===source&&!document.querySelector('[data-ff-translation-blank],[data-ff-translation-pending],[data-ff-translation-placeholder],[data-ff-desktop-message-snapshot]');
 window.__friendsFablesDesktopChatAppearance.dispose();
 const retained=frames.every(s=>s.sameBody&&s.sameText&&s.draftSame&&s.nativeCount===1);
 const nonblank=frames.every(s=>s.glyph||s.progress),hiddenEnglish=frames.every(s=>!s.englishVisible);
 return {passed:retained&&nonblank&&hiddenEnglish&&final&&originalRestored,case:'initial-native-chat-first-paint',dynamic,role,authorOnly,frames,retained,nonblank,hiddenEnglish,final,originalRestored};
}
module.exports={continuityScenario,firstPaintScenario};
if(process.versions.electron){
 const {app,BrowserWindow,session}=require('electron');app.on('window-all-closed',()=>{});
 let window,profile,passed=false;const timer=setTimeout(()=>{console.error('Combined chat translation fixture timed out');app.exit(1);},30000);
 (async()=>{try{
  profile=await fs.mkdtemp(path.join(os.tmpdir(),'ff-chat-translation-'));app.setPath('userData',profile);await app.whenReady();
  const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
  const {configureChatAppearance}=require(path.join(root,'dist/appearance/chat-appearance')),{DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
  const {installTranslationDom}=require(path.join(root,'dist/translation/translation-dom')),{RUSSIAN_DICTIONARY,localTranslation}=require(path.join(root,'dist/translation/translation-core'));
  const site=session.fromPartition('chat-translation-continuity');site.protocol.handle('https',()=>new Response('<!doctype html><style>body{margin:0}#feed{height:600px;overflow:auto}.card{position:relative;width:500px;padding:12px;box-sizing:border-box}.author{height:24px}.prose p{margin:0;line-height:24px}</style>',{headers:{'Content-Type':'text/html'}}));
  window=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await window.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play');window.show();window.focus();window.webContents.focus();assert(window.isVisible());
  const settings={...DEFAULT_APPEARANCE,preset:'website',messages:{...DEFAULT_APPEARANCE.messages,enabled:true}};
  for(const dynamic of [true,false])for(const role of ['player','dm']){
   const first=await window.webContents.executeJavaScript(`(${firstPaintScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()},${dynamic},${JSON.stringify(role)})`);
   console.log('Initial chat translation result',JSON.stringify(first));assert.equal(first.passed,true,'Initial native translated chat presentation became blank or lost identity');
  }
  const result=await window.webContents.executeJavaScript(`(${continuityScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()})`);
  console.log('Combined chat translation result',JSON.stringify(result));assert.equal(result.passed,true,'Native pending chat presentation became blank or lost identity');passed=true;
 }catch(error){console.error('Combined chat translation fixture failed:',error);}finally{clearTimeout(timer);window?.destroy();if(profile)await fs.rm(profile,{recursive:true,force:true});app.exit(passed?0:1);}})().catch(error=>{console.error(error);app.exit(1);});
}
