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
// Native optimistic replacement shape is shared with original-chat-burst and
// chat-body fixtures: detached null-ID player, matching positive ID with an
// empty native prose child, then hydration into its retained native Text.
async function handoffScenario(configure,settings,install,dictionary,local,kind){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const check=(value,message)=>{if(!value)throw Error(`Handoff ${kind}: ${message}`);};
 const campaign='01a0d854-78d5-7064-ae41-f63d561c8e01',token=`handoff-${kind}`;
 const negative=kind==='foreign-author',consumed=kind==='consumed-preview';
 const source=kind==='russian'?'Мой герой осторожно подходит к тихой башне.':'The amber river curves beneath the silent tower.';
 document.body.innerHTML='<main id="feed"><div id="events-list"></div></main><section class="grid relative"><div class="tiptap" contenteditable="true">Preserve the native draft.</div></section>';
 const list=document.getElementById('events-list'),draft=document.querySelector('.tiptap'),draftNode=draft.firstChild;
 configure(settings);install(token,dictionary,true,[],local,true,true);
 const controller=window.__friendsFablesDesktopTranslation;
 const card=(id,content)=>{
  const row=document.createElement('div');row.id=`event-${id}`;
  row.innerHTML=`<div id="event-container-${id}"><div class="card" id="event-message-card-${id}"><div class="author">Мира</div><div class="prose"><div class="space-y-4 whitespace-normal"><p></p></div></div></div></div>`;
  const card=row.querySelector('.card'),body=card.querySelector('.prose'),paragraph=body.querySelector('p'),text=paragraph.appendChild(document.createTextNode(content));
  const event={id,role:'player',content:source,campaign_id:campaign,character_id:id!==null&&negative?99:42,...(id===null?{isOptimistic:true}:{})};
  card.__reactFiber$fixture={memoizedProps:{event}};list.append(row);return {row,card,body,paragraph,text};
 };
 const visible=element=>{for(let node=element;node;node=node.parentElement){const s=getComputedStyle(node);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0'||s.contentVisibility==='hidden')return false;}return true;};
 const ink=s=>s.color!=='transparent'&&s.color!=='rgba(0, 0, 0, 0)'&&s.webkitTextFillColor!=='transparent'&&s.webkitTextFillColor!=='rgba(0, 0, 0, 0)';
 const frames=[];
 const sample=(item,stage)=>{
  const presented=item.card.querySelector('[data-ff-translation-placeholder]')||item.card.querySelector('[data-ff-desktop-message-snapshot]')||item.body;
  const walker=document.createTreeWalker(presented,NodeFilter.SHOW_TEXT);let node,glyph=false;
  while(node=walker.nextNode())if(node.data.trim()&&visible(node.parentElement)&&ink(getComputedStyle(node.parentElement))){const range=document.createRange();range.selectNodeContents(node);const r=range.getClientRects()[0];if(r?.width>0&&r.height>0)glyph=true;}
  const dot=presented.querySelector('[data-ff-translation-dot]'),style=dot&&getComputedStyle(dot,'::after');
  const progress=!!dot&&visible(dot)&&ink(style)&&!!style.content&&style.content!=='none'&&style.content!=='""'&&dot.getBoundingClientRect().height>0;
  const englishVisible=/[A-Za-z]{2,}/.test(presented.textContent??'')&&glyph;
  const value={stage,glyph,progress,englishVisible,nativeEmpty:!item.text.data.trim(),presentation:presented===item.body?'native':presented.hasAttribute('data-ff-translation-placeholder')?'translation':'continuity',
   sameBody:item.card.querySelector('.prose')===item.body,sameText:item.paragraph.firstChild===item.text&&item.text.isConnected,nativeCount:item.paragraph.childNodes.length,
   draftSame:draft.firstChild===draftNode&&draft.textContent==='Preserve the native draft.',bodyHeight:item.body.getBoundingClientRect().height,at:performance.now()};
  frames.push(value);return value;
 };
 const capture=async(item,stage)=>{await frame();return sample(item,stage);};
 const temporary=card(null,source);
 for(let i=0;i<3;i++)await capture(temporary,`optimistic-insert-${i}`);
 if(kind!=='russian'){
  await new Promise(resolve=>setTimeout(resolve,220));
  const request=controller.collect().nodes.filter(node=>node.text===source);check(request.length===1,'optimistic prose did not request real translation');
  if(kind==='partial'||negative||consumed){
   const partial='Готовая часть. Pending remainder.';
   controller.finish(token,request.map(node=>({id:node.id,version:node.version,text:partial,complete:false,pending:[{start:partial.indexOf('Pending'),end:partial.length}]})));
  }
  await capture(temporary,'optimistic-before-confirm');await capture(temporary,'optimistic-before-confirm-settled');
 }
 temporary.row.remove();const confirmed=card(140,consumed?source:'');
 for(let i=0;i<3;i++)await capture(confirmed,`${consumed?'confirmed-direct':'confirmed-gap'}-${i}`);
 if(consumed){
  // A confirmed card with its own real pending preview consumes the matching
  // temporary association. An unrelated later ID cannot reuse that preview.
  const unassociated=card(141,'');
  for(let i=0;i<3;i++)await capture(unassociated,`unassociated-gap-${i}`);
  unassociated.row.remove();
 }
 confirmed.text.data=source;
 for(let i=0;i<3;i++)await capture(confirmed,`confirmed-hydrated-${i}`);
 if(kind!=='russian'){
  await new Promise(resolve=>setTimeout(resolve,220));
  const request=controller.collect().nodes.filter(node=>node.text===source);check(request.length===1,'confirmed prose did not request real translation');
  controller.finish(token,request.map(node=>({id:node.id,version:node.version,text:'Река огибает тихую башню.',complete:true})));
  await capture(confirmed,'confirmed-final');
 }
 controller.dispose();window.__friendsFablesDesktopChatAppearance.dispose();
 const clean=!document.querySelector('[data-ff-translation-blank],[data-ff-translation-pending],[data-ff-translation-placeholder],[data-ff-desktop-message-snapshot]');
 const retained=frames.every(s=>s.sameBody&&s.sameText&&s.nativeCount===1&&s.draftSame);
 const forbidden=s=>negative&&s.stage.startsWith('confirmed-gap-')||consumed&&s.stage.startsWith('unassociated-gap-');
 const gaps=frames.filter(s=>negative||consumed?forbidden(s):s.stage.startsWith('confirmed-gap-'));
 const association=negative||consumed?gaps.every(s=>!s.glyph&&!s.progress&&s.presentation==='native'):gaps.every(s=>s.glyph||s.progress);
 const nonblank=frames.filter(s=>!forbidden(s)).every(s=>s.glyph||s.progress),hiddenEnglish=frames.every(s=>!s.englishVisible);
 return {passed:retained&&nonblank&&hiddenEnglish&&clean&&association,case:'player-optimistic-confirmed-translation-handoff',kind,frames,retained,nonblank,hiddenEnglish,clean,association};
}
// New atomic-first-presentation UX contract, not proof of translator causation.
// Captured native shape: event-container owns an external desktop avatar sibling
// and the content/card column; .prose initially contains an empty renderer DIV.
// Evidence: chat-association-one.json frames 1/3/4; native-chat-81.js eC/ej/oA
// retained under the ignored live-campaign/post-audit task evidence (see REPORT).
async function atomicFirstPresentationScenario(configure,settings,install,dictionary,local,options={}){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const {role='player',sourceEmpty=false,translated=true,dynamic=true,english=false}=options;
 const token='atomic-'+role,source=english?'The amber river curves beneath the silent tower.':'Мой герой осторожно подходит к тихой башне.';
 document.body.innerHTML='<main id="feed"><div id="events-list"></div></main><section class="grid relative"><div class="tiptap" contenteditable="true">Preserve the native draft.</div></section>';
 const list=document.getElementById('events-list'),draft=document.querySelector('.tiptap'),draftNode=draft.firstChild;
 configure(settings);if(translated)install(token,dictionary,true,[],local,true,dynamic);
 const row=document.createElement('div');row.id='event-152';
 row.innerHTML='<div id="event-container-152" style="display:flex;gap:8px"><div class="native-avatar-column" style="width:40px;flex:none"><div class="native-avatar" style="width:40px;height:40px;background:rgb(90,100,110)"></div></div><div class="native-content-column"><div class="card" id="event-message-card-152" style="border:1px solid rgb(110,120,130)"><div class="author">Мира</div><div class="prose"><div class="space-y-4 whitespace-normal"></div></div></div></div></div>';
 const container=row.firstElementChild,card=row.querySelector('.card'),avatar=row.querySelector('.native-avatar'),body=card.querySelector('.prose'),renderer=body.firstElementChild;
 if(role==='dm'){const thoughts=document.createElement('div');thoughts.className='mt-2 mb-2';thoughts.innerHTML='<button aria-expanded="false" data-state="closed">Thoughts</button><div hidden data-state="closed"><div class="text-sm italic bg-muted/30 p-3 rounded-md text-foreground-muted">Native reasoning detail.</div></div>';body.before(thoughts);}
 const event={id:152,role,processed:true,reasoning:role==='dm'?'Native reasoning detail.':null,command_used:role==='dm'?'encounter_player_turn_action_response':'talk',content:sourceEmpty?'':source,campaign_id:'01a0d854-78d5-7064-ae41-f63d561c8e01',character_id:42,...(options.emptyToolCalls?{tool_calls:[]}: {})};
 card.__reactFiber$fixture={memoizedProps:{event}};list.append(row);
 const neighbor=document.createElement('div');neighbor.style.height='16px';list.append(neighbor);
 const visible=element=>{for(let node=element;node;node=node.parentElement){const s=getComputedStyle(node);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0||s.contentVisibility==='hidden')return false;}return true;};
 const ink=s=>s.color!=='transparent'&&s.color!=='rgba(0, 0, 0, 0)'&&s.webkitTextFillColor!=='transparent'&&s.webkitTextFillColor!=='rgba(0, 0, 0, 0)';
 const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 let paragraph,text;
 const frames=[];
 const sample=(stage,geometry=false)=>{
  const presented=card.querySelector('[data-ff-translation-placeholder]')||card.querySelector('[data-ff-desktop-message-snapshot]')||body;
  const walker=document.createTreeWalker(presented,NodeFilter.SHOW_TEXT);let node,glyph=false;
  while(node=walker.nextNode())if(node.data.trim()&&visible(node.parentElement)&&ink(getComputedStyle(node.parentElement)))glyph=true;
  const dot=presented.querySelector('[data-ff-translation-dot]'),dotStyle=dot&&getComputedStyle(dot,'::after');
  const progress=!!dot&&visible(dot)&&ink(dotStyle)&&!!dotStyle.content&&dotStyle.content!=='none'&&dotStyle.content!=='""';
  const value={stage,rowVisible:visible(row),containerVisible:visible(container),avatarVisible:visible(avatar),cardVisible:visible(card),bodyVisible:visible(body),glyph,progress,
   englishVisible:/[A-Za-z]{2,}/.test(presented.textContent??'')&&glyph,nativeBodyEmpty:!body.textContent.trim(),sameRow:list.firstElementChild===row,sameContainer:row.firstElementChild===container,sameAvatar:row.querySelector('.native-avatar')===avatar,
   sameCard:row.querySelector('.card')===card,sameBody:card.querySelector('.prose')===body,sameRenderer:body.firstElementChild===renderer,
   sameNativeText:!text||paragraph.firstChild===text&&text.isConnected,draftSame:draft.firstChild===draftNode&&draft.textContent==='Preserve the native draft.',at:performance.now()};
  if(geometry)value.geometry={row:rect(row),avatar:rect(avatar),card:rect(card),body:rect(body),neighborGap:neighbor.getBoundingClientRect().top-row.getBoundingClientRect().bottom};
  frames.push(value);return value;
 };
 // Both empty paints belong to acceptance: unlike the older authorOnly sample.
 await frame();sample('native-empty-first-paint',true);
 await frame();sample('native-empty-second-paint');
 event.content=source;paragraph=document.createElement('p');text=document.createTextNode(english?source:'Мой герой');paragraph.append(text);renderer.append(paragraph);
 await frame();sample('native-first-chunk');
 let requestCount=0;
 if(english&&translated){
  await new Promise(resolve=>setTimeout(resolve,220));
  const controller=window.__friendsFablesDesktopTranslation,requests=controller.collect().nodes.filter(node=>node.text===source);requestCount=requests.length;
  if(requestCount!==1)throw Error('Atomic English prose did not enter actual translation controller');
  controller.finish(token,requests.map(node=>({id:node.id,version:node.version,text:'Река огибает тихую башню.',complete:true})));
 }else text.data=source;
 await frame();const final=sample('native-complete',true);
 // Only one finite glyph Range, after the mutation window, proves native ink.
 const range=document.createRange();range.selectNodeContents(text);const glyphRect=range.getClientRects()[0];
 const nativeGlyph=!!glyphRect&&glyphRect.width>0&&glyphRect.height>0&&visible(paragraph)&&ink(getComputedStyle(paragraph));range.detach();
 const retained=frames.every(s=>s.sameRow&&s.sameContainer&&s.sameAvatar&&s.sameCard&&s.sameBody&&s.sameRenderer&&s.sameNativeText&&s.draftSame);
 const atomic=frames.every(s=>(!s.avatarVisible&&!s.cardVisible)||s.glyph||s.progress);
 const revealed=final.avatarVisible&&final.cardVisible&&final.glyph&&nativeGlyph;
 const noFakePending=!card.querySelector('[data-ff-translation-placeholder],[data-ff-translation-pending],[data-ff-translation-dot]');
 const geometryStable=Math.abs(frames[0].geometry.neighborGap-final.geometry.neighborGap)<1;
 const cleanGate=!container.hasAttribute('inert')&&!container.style.getPropertyValue('opacity');
 const sourceHidden=!english||!translated||frames.filter(s=>s.stage==='native-first-chunk').every(s=>!s.englishVisible);
 // First presentation is latched. Later native hydration cannot hide the row.
 const completed=text.data;text.data='';await frame();const hydration=sample('presented-native-hydration');
 const neverRehidden=hydration.avatarVisible&&hydration.cardVisible;
 text.data=completed;await frame();
 window.__friendsFablesDesktopTranslation?.dispose();window.__friendsFablesDesktopChatAppearance.dispose();
 return {passed:retained&&atomic&&revealed&&noFakePending&&sourceHidden&&neverRehidden&&geometryStable&&cleanGate,case:'atomic-first-presentation-russian-player',contract:'new-UX-not-translator-cause',dynamic,role,sourceEmpty,translated,english,...(options.emptyToolCalls?{emptyToolCalls:true}: {}),frames,retained,atomic,revealed,nativeGlyph,noFakePending,sourceHidden,neverRehidden,geometryStable,cleanGate,requestCount};
}
// Bounded ownership/cleanup controls use real appearance, no fake pending state.
async function firstPresentationPreservationScenario(configure,settings){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),settle=async()=>{await frame();await frame();};
 const check=(value,message)=>{if(!value)throw Error('First presentation preservation: '+message);};
 document.body.innerHTML='<main id="feed"><div id="events-list"></div></main><div class="tiptap" contenteditable="true">Retained draft</div>';
 const list=document.getElementById('events-list'),draft=document.querySelector('.tiptap'),draftNode=draft.firstChild;
 let id=200;
 const make=(changes={},extra='')=>{
  const event={id:++id,role:'dm',command_used:'talk',content:'',campaign_id:location.pathname.split('/')[1],...changes};
  const wrapper=document.createElement('div');wrapper.id='event-'+id;
  wrapper.innerHTML=`<div id="event-container-${id}"><div class="avatar" style="height:40px;width:40px"></div><div class="card" id="event-message-card-${id}"><div class="author">Franz<button type="button">Menu</button></div><div class="prose"><div></div></div>${extra}</div></div>`;
  const row=wrapper.firstElementChild,card=row.querySelector('.card'),renderer=card.querySelector('.prose>div');
  card.__reactFiber$fixture={memoizedProps:{event}};
  return {wrapper,row,card,event,renderer,mount(){list.append(wrapper);return this;}};
 };
 const existing=make().mount();configure(settings);await settle();
 check(!existing.row.style.opacity,'existing empty row was hidden');
 const styled=make();styled.row.style.setProperty('opacity','.65','important');styled.mount();await settle();
 check(styled.row.style.opacity==='0'&&styled.row.inert,'new empty row not gated/noninteractive');
 draft.focus();styled.card.querySelector('button').focus();check(document.activeElement===draft,'invisible menu received focus');
 styled.renderer.append(document.createTextNode('Первая часть.'));await settle();
 check(styled.row.style.opacity==='0.65'&&styled.row.style.getPropertyPriority('opacity')==='important'&&!styled.row.inert,'prior style/interaction not restored at first text');
 styled.renderer.textContent='';await settle();check(styled.row.style.opacity==='0.65'&&!styled.row.inert,'presented hydration was gated again');
 const native=make().mount();await settle();native.row.style.opacity='.4';native.row.setAttribute('inert','native-owner');await settle();
 check(native.row.style.opacity==='0.4'&&native.row.getAttribute('inert')==='native-owner','newer native declarations overwritten');
 const hidden=make();hidden.row.style.opacity='0';hidden.mount();await settle();check(!hidden.row.inert,'native hidden row was claimed');
 hidden.row.style.opacity='1';await settle();check(hidden.row.style.opacity==='0'&&hidden.row.inert,'native-hidden new row exposed empty shell on reveal');hidden.renderer.textContent='Готово.';await settle();check(hidden.row.style.opacity==='1'&&!hidden.row.inert,'native opacity was not restored');
 const detached=make();detached.row.style.opacity='.7';detached.mount();await settle();detached.wrapper.remove();await settle();
 check(detached.row.style.opacity==='0.7'&&!detached.row.inert,'detached row retained owned gate');
 const exclusions=[{command_used:'roll_attack'},{command_used:'outcome'},{command_used:'scene_generation'},{command_used:'unknown_future_command'},{role:'npc'},{attachments:[{}]},{processed:false,reasoning:'active'},{tool_calls:[{}]},{tool_calls:{unexpected:true}},{events_roll:{}}].map(change=>make(change).mount());
 const loading=make({},'<div role="progressbar">Loading</div>').mount(),image=make();image.renderer.append(document.createElement('img'));image.mount();
 const thoughts=make({processed:false,reasoning:null},'<div class="mt-2 mb-2"><button aria-expanded="false">Thoughts</button><div hidden>Reasoning loading...</div></div>').mount();
 const expanded=make({processed:true,reasoning:'Native reasoning detail.'},'<div><button aria-expanded="true">Thoughts</button><div data-state="open"><div class="text-sm italic bg-muted/30 p-3 rounded-md text-foreground-muted">Native reasoning detail.</div></div></div>').mount();
 const busy=make();busy.renderer.setAttribute('aria-busy','true');busy.mount();
 const nativeInert=make();nativeInert.row.setAttribute('inert','native-inert');nativeInert.mount();
 await settle();check([...exclusions,loading,image,busy,nativeInert,thoughts,expanded].every(item=>!item.row.style.opacity),'legitimate nonprose/loading/unknown row was gated');
 const route=make();route.row.style.opacity='.8';route.mount();await settle();
 const url=location.href;history.pushState({},'',location.pathname+'?view=settings');dispatchEvent(new PopStateEvent('popstate'));await settle();
 check(route.row.style.opacity==='0.8'&&!route.row.inert,'route cleanup failed');
 history.replaceState({},'',url);dispatchEvent(new PopStateEvent('popstate'));await settle();check(route.row.style.opacity==='0.8','route return hid existing row');
 const disposed=make();disposed.row.style.setProperty('opacity','.3','important');disposed.mount();await settle();
 check(disposed.row.style.opacity==='0','dispose prerequisite was not gated');
 window.__friendsFablesDesktopChatAppearance.dispose();
 check(disposed.row.style.opacity==='0.3'&&disposed.row.style.getPropertyPriority('opacity')==='important'&&!disposed.row.inert,'dispose cleanup failed');
 check(native.row.style.opacity==='0.4'&&native.row.getAttribute('inert')==='native-owner','dispose overwrote native authority');
 check(draft.firstChild===draftNode&&draft.textContent==='Retained draft','draft identity changed');
 return {passed:true,case:'atomic-first-presentation-preservations',excluded:exclusions.length+6,styleAuthority:true,route:true,detach:true,dispose:true,inertFocus:true,existingHydration:true};
}
module.exports={continuityScenario,firstPaintScenario,handoffScenario,atomicFirstPresentationScenario,firstPresentationPreservationScenario};
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
  const selected=process.env.FABLES_CHAT_TRANSLATION_SCENARIO;
  if(!selected||selected==='atomic-first-presentation-matrix'){
   const cases=[{}, {role:'dm',sourceEmpty:true}, {role:'dm',sourceEmpty:true,translated:false}, {english:true,dynamic:false}, {role:'dm',english:true}, {dynamic:false}, {translated:false}, {english:true,translated:false}, {role:'dm',sourceEmpty:true,emptyToolCalls:true}];
   for(const options of cases){
    const result=await window.webContents.executeJavaScript(`(${atomicFirstPresentationScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()},${JSON.stringify(options)})`);
    console.log('Atomic first presentation matrix result',JSON.stringify(result));assert.equal(result.passed,true,'Atomic first presentation matrix failed');
   }
   const preservation=await window.webContents.executeJavaScript(`(${firstPresentationPreservationScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)})`);
   console.log('Atomic first presentation preservation result',JSON.stringify(preservation));assert.equal(preservation.passed,true);passed=true;
  }
  if(selected==='atomic-empty-tool-calls'){
   const result=await window.webContents.executeJavaScript(`(${atomicFirstPresentationScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()},${JSON.stringify({role:'dm',sourceEmpty:true,emptyToolCalls:true})})`);
   console.log('Atomic empty tool calls result',JSON.stringify(result));assert.equal(result.passed,true,'Completed DM with zero tool calls painted an empty shell');passed=true;
  }else if(selected==='atomic-first-presentation'){
   const result=await window.webContents.executeJavaScript(`(${atomicFirstPresentationScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()})`);
   console.log('Atomic first presentation result',JSON.stringify(result));assert.equal(result.passed,true,'New row painted avatar/border without native body glyph or real progress');passed=true;
  }else if(selected!=='atomic-first-presentation-matrix'){
  {
   const results=[];for(const kind of ['pending','partial','russian','foreign-author','consumed-preview']){
    const result=await window.webContents.executeJavaScript(`(${handoffScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()},${JSON.stringify(kind)})`);
    results.push(result);console.log('Player handoff translation result',JSON.stringify(result));
   }
   assert(results.every(result=>result.passed),'Player optimistic-confirmed translated presentation became blank or lost identity');passed=true;
  }
  if(process.env.FABLES_CHAT_TRANSLATION_SCENARIO!=='handoff'){
  for(const dynamic of [true,false])for(const role of ['player','dm']){
   const first=await window.webContents.executeJavaScript(`(${firstPaintScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()},${dynamic},${JSON.stringify(role)})`);
   console.log('Initial chat translation result',JSON.stringify(first));assert.equal(first.passed,true,'Initial native translated chat presentation became blank or lost identity');
  }
  const result=await window.webContents.executeJavaScript(`(${continuityScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(settings)},${installTranslationDom.toString()},${JSON.stringify(RUSSIAN_DICTIONARY)},${localTranslation.toString()})`);
  console.log('Combined chat translation result',JSON.stringify(result));assert.equal(result.passed,true,'Native pending chat presentation became blank or lost identity');passed=true;
  }
  }
 }catch(error){passed=false;console.error('Combined chat translation fixture failed:',error);}finally{clearTimeout(timer);window?.destroy();if(profile)await fs.rm(profile,{recursive:true,force:true});app.exit(passed?0:1);}})().catch(error=>{console.error(error);app.exit(1);});
}
