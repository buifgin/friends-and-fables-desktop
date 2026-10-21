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
// Saved native-chat-81.js:704200-706100 scrolls to the first new event with
// smooth behavior and a 100px top inset. This tests that public submit intent
// survives native programmatic scrolling before a later standalone HP result.
// It does not assert that the synthetic footer is the current site's exact DOM.
async function submitNativeScrollScenario(configure,settings){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const settle=async()=>{await frame();await frame();await frame();};
 const box=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
 const glyph=node=>{const range=document.createRange();range.selectNodeContents(node);const rects=range.getClientRects(),r=rects[rects.length-1];range.detach();return r?{top:r.top,bottom:r.bottom,height:r.height}:null;};
 const cases=[];
 for(const manual of [false,true]){
  const enabled=true;
  window.__friendsFablesDesktopChatAppearance?.dispose();
  document.body.innerHTML='<section id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><footer id="turn-controls" class="absolute bottom-0"><div id="composer" hidden><div class="tiptap" contenteditable="true">Preserve native draft.</div></div><button type="button">Show Input</button><button type="button">End turn Magnus</button><div>Native footer controls</div></footer></section>';
  const feed=document.getElementById('feed'),list=document.getElementById('events-list'),footer=document.getElementById('turn-controls'),composer=document.getElementById('composer'),draft=document.querySelector('.tiptap'),draftNode=draft.firstChild;
  const message=(id,height,text)=>{const row=document.createElement('div');row.id='event-'+id;row.innerHTML='<div id="event-container-'+id+'"><div id="event-message-card-'+id+'"><div class="prose"><p></p></div></div></div>';const card=row.firstElementChild.firstElementChild;card.style.minHeight=height+'px';card.querySelector('p').textContent=text;list.append(row);return {row,card,text:card.querySelector('p').firstChild};};
  for(let id=1;id<=12;id++)message(id,90,'Earlier narration '+id);
  const prior=message(100,160,'Earlier completed narration.');
  feed.scrollTop=feed.scrollHeight-feed.clientHeight;
  if(enabled)configure(settings);await settle();
  const geometry=tail=>({scrollTop:feed.scrollTop,scrollHeight:feed.scrollHeight,clientHeight:feed.clientHeight,distanceToMax:feed.scrollHeight-feed.clientHeight-feed.scrollTop,feed:box(feed),footer:box(footer),tail:box(tail.card),composerHidden:composer.hidden});
  const before=geometry(prior);
  if(before.distanceToMax>1||before.tail.bottom>before.footer.top+.5)throw Error('Submit/native-scroll fixture not initially pinned/unobstructed: '+JSON.stringify(before));
  // This is the validated adapter API, not a real campaign form submission.
  window.__friendsFablesDesktopChatAppearance?.followAfterSubmit();
  const submitted=message(101,120,'The submitted attack action.'),narration=message(102,360,'Franz narration before the delayed HP effect.');
  await settle();const afterSubmit=geometry(narration);
  // Native first-new-event alignment runs after the adapter's initial follow.
  // Its saved calculation is copied here without timers or invented user input.
  const startTop=feed.scrollTop,target=Math.max(0,Math.min(feed.scrollHeight-feed.clientHeight,startTop+submitted.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-100));
  if(startTop-target<20)throw Error('Native first-new-event scroll did not have a meaningful non-tail target');
  let scrollEvents=0,scrollEnds=0;const scrolled=()=>scrollEvents++,ended=()=>scrollEnds++;
  feed.addEventListener('scroll',scrolled);feed.addEventListener('scrollend',ended);
  let scrollFrames=0;
  try{
   feed.scrollTo({top:target,behavior:'smooth'});
   for(;scrollFrames<90;scrollFrames++){await frame();if(scrollEvents&&scrollEnds&&Math.abs(feed.scrollTop-target)<=1)break;}
   if(scrollFrames===90)throw Error('Native smooth scroll did not finish at its first-new-event target: '+JSON.stringify({target,actual:feed.scrollTop,scrollEvents,scrollEnds}));
  }finally{feed.removeEventListener('scroll',scrolled);feed.removeEventListener('scrollend',ended);}
  const afterNative=geometry(narration);
  if(afterNative.distanceToMax<=20)throw Error('Native alignment failed to leave a non-tail viewport');
  const older=document.getElementById('event-message-card-8'),readerText=older.querySelector('p').firstChild;
  let readerBefore=null;
  if(manual){
   feed.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-400}));
   feed.scrollTo({top:feed.scrollTop+older.getBoundingClientRect().top-feed.getBoundingClientRect().top-60,behavior:'instant'});
   await settle();readerBefore=glyph(readerText);
  }
  // The delayed result has an event wrapper, but no message-card/container.
  const row=document.createElement('div');row.id='event-103';
  const card=document.createElement('div');card.className='bg-card border rounded-md damage';card.style.minHeight='64px';
  card.innerHTML='<strong>Target takes 6 damage</strong><div class="hp">HP 14 / 20</div>';row.append(card);list.append(row);
  const hp=card.querySelector('.hp'),hpText=hp.firstChild;
  await settle();const appended=geometry({card});
  let finalText=hpText;
  for(const text of ['The native HP effect expands.','Additional effect details.','Final HP result.']){const p=document.createElement('p');p.style.cssText='margin:0;line-height:24px';p.textContent=text;hp.append(p);finalText=p.firstChild;}
  await settle();const after=geometry({card}),lastGlyph=glyph(finalText),readerAfter=glyph(readerText);
  const identity=list.contains(row)&&row.firstElementChild===card&&card.querySelector('.hp')===hp&&hp.firstChild===hpText&&prior.text.isConnected&&submitted.text.isConnected&&narration.text.isConnected&&older.querySelector('p').firstChild===readerText&&draft.firstChild===draftNode&&draft.textContent==='Preserve native draft.';
  const nativeGrowth=after.tail.height>appended.tail.height+.5;
  const fullyVisible=after.tail.top>=after.feed.top-.5&&after.tail.bottom<=Math.min(after.feed.bottom,after.footer.top)+.5&&!!lastGlyph&&lastGlyph.height>0&&lastGlyph.top>=after.feed.top-.5&&lastGlyph.bottom<=Math.min(after.feed.bottom,after.footer.top)+.5;
  const follow=after.distanceToMax<=1;
  const readerPreserved=!manual||!!readerBefore&&!!readerAfter&&Math.abs(readerAfter.top-readerBefore.top)<=.5&&after.distanceToMax>20;
  const passed=identity&&nativeGrowth&&composer.hidden&&readerPreserved&&(manual||fullyVisible&&follow);
  cases.push({name:manual?'submit-native-scroll-manual-reader':'submit-native-scroll-late-hp',adapter:enabled?'on':'off',passed,identity,nativeGrowth,fullyVisible,follow,readerPreserved,target,scrollFrames,scrollEvents,scrollEnds,before,afterSubmit,afterNative,appended,after,lastGlyph,readerBefore,readerAfter});
  window.__friendsFablesDesktopChatAppearance?.dispose();
 }
 return {passed:cases.filter(item=>item.adapter==='on').every(item=>item.passed),case:'public-submit-native-scroll-delayed-hp',cases};
}
// Same saved native first-new-event calculation as submitNativeScrollScenario.
// Here the new rows fit above the footer, so its clamped target is the real tail.
// Start the native animation before observer RAFs can overwrite it; OFF must
// demonstrate rendered intermediate positions before ON can expose an app snap.
async function smoothTailTrajectoryScenario(configure,settings){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const settle=async()=>{await frame();await frame();await frame();};
 const box=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
 const glyph=node=>{const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();range.detach();return {top:r.top,bottom:r.bottom,height:r.height};};
 const cases=[];
 for(const enabled of [false,true]){
  window.__friendsFablesDesktopChatAppearance?.dispose();
  document.body.innerHTML='<section id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><footer id="turn-controls" class="absolute bottom-0"><div id="composer" hidden><div class="tiptap" contenteditable="true">Preserve smooth-follow draft.</div></div><button type="button">Show Input</button><button type="button">End turn Magnus</button></footer></section>';
  const feed=document.getElementById('feed'),list=document.getElementById('events-list'),footer=document.getElementById('turn-controls'),composer=document.getElementById('composer'),draft=composer.querySelector('.tiptap'),draftText=draft.firstChild;
  const retained=[];
  const message=(id,height,text)=>{const row=document.createElement('div');row.id='event-'+id;row.innerHTML='<div id="event-container-'+id+'"><div id="event-message-card-'+id+'"><div class="prose"><p></p></div></div></div>';const card=row.firstElementChild.firstElementChild;card.style.minHeight=height+'px';card.querySelector('p').textContent=text;list.append(row);const item={row,card,text:card.querySelector('p').firstChild,height:card.getBoundingClientRect().height};retained.push(item);return item;};
  for(let id=1;id<=12;id++)message(id,90,'Earlier narration '+id);
  const prior=message(100,160,'Earlier completed narration.');
  feed.scrollTop=feed.scrollHeight-feed.clientHeight;await settle();
  if(enabled)configure(settings);await settle();
  const geometry=card=>({scrollTop:feed.scrollTop,scrollHeight:feed.scrollHeight,clientHeight:feed.clientHeight,distanceToMax:feed.scrollHeight-feed.clientHeight-feed.scrollTop,feed:box(feed),footer:box(footer),tail:box(card)});
  const before=geometry(prior.card);
  if(before.distanceToMax>1||before.tail.bottom>before.footer.top+.5)throw Error('Smooth trajectory setup must start pinned/unobstructed: '+JSON.stringify(before));
  if(enabled)window.__friendsFablesDesktopChatAppearance.followAfterSubmit();
  const submitted=message(101,120,'The submitted attack action.');
  message(102,120,'Franz final narration.');
  const row=document.createElement('div');row.id='event-103';const card=document.createElement('div');card.className='bg-card border rounded-md damage';card.style.cssText='height:120px;display:flex;flex-direction:column;justify-content:flex-end';card.innerHTML='<strong>Target takes 6 damage</strong><p style="margin:0;line-height:24px">Final HP 14 / 20</p>';row.append(card);list.append(row);
  const hpText=card.querySelector('p').firstChild,startTop=feed.scrollTop,max=feed.scrollHeight-feed.clientHeight;
  const target=Math.max(0,Math.min(max,startTop+submitted.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-100));
  // This guard prevents the old already-at-tail false setup. No RAF has run
  // since the append and there are no later DOM/size changes in this case.
  if(Math.abs(startTop-before.scrollTop)>.5||target-startTop<200||Math.abs(target-max)>.5)throw Error('Smooth trajectory needs a real off-tail native target: '+JSON.stringify({before,startTop,target,max}));
  const pending=geometry(card),samples=[{frame:0,scrollTop:startTop}];let terminalFrames=0,scrollEvents=0,scrollEnds=0;
  const scrolled=()=>scrollEvents++,ended=()=>scrollEnds++;
  feed.addEventListener('scroll',scrolled);feed.addEventListener('scrollend',ended);
  try{
   feed.scrollTo({top:target,behavior:'smooth'});
   for(let index=1;index<=90;index++){
    const timestamp=await frame(),scrollTop=feed.scrollTop;samples.push({frame:index,timestamp,scrollTop});
    terminalFrames=Math.abs(scrollTop-target)<=1?terminalFrames+1:0;
    if(terminalFrames===3)break;
   }
  }finally{feed.removeEventListener('scroll',scrolled);feed.removeEventListener('scrollend',ended);}
  const after=geometry(card),lastGlyph=glyph(hpText);
  const intermediate=samples.filter(sample=>sample.scrollTop>startTop+1&&sample.scrollTop<target-1);
  const distinctIntermediate=new Set(intermediate.map(sample=>Math.round(sample.scrollTop))).size;
  const smooth=distinctIntermediate>=2,follow=after.distanceToMax<=1&&terminalFrames===3;
  const fullyVisible=after.tail.top>=after.feed.top-.5&&after.tail.bottom<=Math.min(after.feed.bottom,after.footer.top)+.5&&lastGlyph.height>0&&lastGlyph.top>=after.feed.top-.5&&lastGlyph.bottom<=Math.min(after.feed.bottom,after.footer.top)+.5;
  const identity=document.getElementById('turn-controls')===footer&&document.querySelector('.tiptap')===draft&&draft.firstChild===draftText&&draft.textContent==='Preserve smooth-follow draft.'&&composer.hidden&&row.firstElementChild===card&&card.querySelector('p').firstChild===hpText&&retained.every(item=>item.row.isConnected&&item.row.firstElementChild.firstElementChild===item.card&&item.card.querySelector('p').firstChild===item.text&&Math.abs(item.card.getBoundingClientRect().height-item.height)<=.5);
  const noLaterGrowth=after.scrollHeight===pending.scrollHeight&&after.clientHeight===pending.clientHeight&&Math.abs(after.tail.height-pending.tail.height)<=.5&&Math.abs(after.footer.top-pending.footer.top)<=.5;
  const result={adapter:enabled?'on':'off',passed:smooth&&follow&&fullyVisible&&identity&&noLaterGrowth,smooth,distinctIntermediate,follow,fullyVisible,identity,noLaterGrowth,startTop,target,max,scrollEvents,scrollEnds,before,pending,after,lastGlyph,samples};
  cases.push(result);window.__friendsFablesDesktopChatAppearance?.dispose();
  if(!enabled&&!result.passed)throw Error('OFF native smooth trajectory control invalid: '+JSON.stringify(result));
 }
 return {case:'smooth-tail-trajectory',passed:cases.every(item=>item.passed),cases};
}
// Current user capture: four old roll rows contribute three bottom ornaments
// each before the real external footer. Native feed padding is p-4 (16px).
async function footerCandidateBudgetScenario(configure,settings){
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),settle=async()=>{await frame();await frame();await frame();};
 const box=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};};
 const glyph=node=>{const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();range.detach();return {top:r.top,bottom:r.bottom,height:r.height};};
 const cases=[];
 for(const mode of ['off-crowded','on-uncluttered','on-crowded','on-crowded-manual']){
  const enabled=mode!=='off-crowded',crowded=mode!=='on-uncluttered',manual=mode.endsWith('-manual');
  window.__friendsFablesDesktopChatAppearance?.dispose();
  document.body.innerHTML='<section id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main><footer id="turn-controls" class="absolute bottom-0"><div id="composer" hidden><div class="tiptap" contenteditable="true">Preserve native draft.</div></div><button type="button">Show Input</button><button type="button">End turn Magnus</button></footer></section>';
  const feed=document.getElementById('feed'),list=document.getElementById('events-list'),footer=document.getElementById('turn-controls'),composer=document.getElementById('composer'),draft=document.querySelector('.tiptap'),draftNode=draft.firstChild;
  feed.style.cssText='display:flex;flex-direction:column;padding:16px';
  const history=[];
  for(let id=1;id<=12;id++){
   const row=document.createElement('div');row.id='event-'+id;row.innerHTML='<div id="event-container-'+id+'"><div id="event-message-card-'+id+'"><div class="prose"><p>Earlier narration '+id+'</p></div></div></div>';
   const card=row.firstElementChild.firstElementChild;card.style.cssText='min-height:90px;position:relative';
   if(crowded&&id<=4)for(const classes of ['absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3','absolute bottom-0 left-0 w-14 h-14 md:w-18 md:h-18','absolute bottom-0 right-0 w-14 h-14 md:w-18 md:h-18']){const ornament=document.createElement('div');ornament.className=classes;ornament.style.cssText='position:absolute;bottom:0';card.append(ornament);}
   list.append(row);history.push({row,card,text:card.querySelector('p').firstChild,height:card.getBoundingClientRect().height});
  }
  const nativeFooter=box(footer),nativePadding=getComputedStyle(feed).paddingBottom;
  if(nativePadding!=='16px')throw Error('Footer budget fixture must start at captured native16px padding');
  const prefix=[...document.getElementById('chat').querySelectorAll('footer,[class~="absolute"][class~="bottom-0"],[class~="fixed"][class~="bottom-0"]')];
  if(crowded&&(prefix.length!==13||!prefix.slice(0,12).every(node=>feed.contains(node))||prefix[12]!==footer))throw Error('Captured twelve in-feed decorations must precede the real footer');
  feed.scrollTop=feed.scrollHeight-feed.clientHeight;if(enabled)configure(settings);await settle();
  const older=history[3];let readerBefore=null;
  if(manual){
   const previousTop=feed.scrollTop;feed.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-400}));feed.scrollTop+=glyph(older.text).top-feed.getBoundingClientRect().top-60;await settle();feed.dispatchEvent(new Event('scrollend',{bubbles:true}));await settle();readerBefore=glyph(older.text);
   if(feed.scrollTop>=previousTop-.5||feed.scrollHeight-feed.clientHeight-feed.scrollTop<=20||Math.abs(readerBefore.top-feed.getBoundingClientRect().top-60)>.5)throw Error('Manual footer case must actually navigate upward to the60px text anchor: '+JSON.stringify({previousTop,scrollTop:feed.scrollTop,readerBefore,feed:box(feed)}));
  }
  const row=document.createElement('div');row.id='event-103';const card=document.createElement('div');card.className='bg-card border rounded-md damage';card.style.cssText='min-height:120px;display:flex;flex-direction:column;justify-content:flex-end';card.innerHTML='<strong>Target takes 6 damage</strong><p style="margin:0;line-height:24px">Final HP 14 / 20</p>';row.append(card);list.append(row);
  const finalText=card.querySelector('p').firstChild,nativeCardHeight=card.getBoundingClientRect().height;
  if(!enabled)feed.scrollTop=feed.scrollHeight-feed.clientHeight;
  await settle();
  const after={feed:box(feed),footer:box(footer),tail:box(card),lastGlyph:glyph(finalText),paddingBottom:getComputedStyle(feed).paddingBottom,distanceToMax:feed.scrollHeight-feed.clientHeight-feed.scrollTop},readerAfter=manual?glyph(older.text):null;
  const identity=document.getElementById('turn-controls')===footer&&row.firstElementChild===card&&card.querySelector('p').firstChild===finalText&&document.querySelector('.tiptap')===draft&&draft.firstChild===draftNode&&draft.textContent==='Preserve native draft.'&&history.every(item=>item.text.isConnected&&item.card.querySelector('p').firstChild===item.text);
  const unchangedHeights=Math.abs(after.footer.height-nativeFooter.height)<=.5&&Math.abs(after.footer.top-nativeFooter.top)<=.5&&Math.abs(after.tail.height-nativeCardHeight)<=.5&&history.every(item=>Math.abs(item.card.getBoundingClientRect().height-item.height)<=.5);
  const fullyVisible=after.tail.top>=after.feed.top-.5&&after.tail.bottom<=Math.min(after.feed.bottom,after.footer.top)+.5&&after.lastGlyph.height>0&&after.lastGlyph.bottom<=Math.min(after.feed.bottom,after.footer.top)+.5;
  const follow=after.distanceToMax<=1,readerPreserved=!manual||Math.abs(readerAfter.top-readerBefore.top)<=.5&&after.distanceToMax>20;
  cases.push({mode,passed:identity&&unchangedHeights&&composer.hidden&&readerPreserved&&(manual||!enabled||fullyVisible&&follow),identity,unchangedHeights,composerHidden:composer.hidden,nativePadding,candidateCount:prefix.length,firstTwelveInsideFeed:prefix.slice(0,12).every(node=>feed.contains(node)),fullyVisible,follow,readerPreserved,readerBefore,readerAfter,after});
  window.__friendsFablesDesktopChatAppearance?.dispose();
  const restoredPadding=getComputedStyle(feed).paddingBottom;cases.at(-1).restoredPadding=restoredPadding;cases.at(-1).passed=cases.at(-1).passed&&restoredPadding==='16px';
 }
 const control=cases.find(item=>item.mode==='off-crowded');
 if(!control.follow||control.fullyVisible||control.after.paddingBottom!=='16px')throw Error('Native OFF control must be pinned yet clipped with only16px reserve: '+JSON.stringify(control));
 return {passed:cases.every(item=>item.passed),case:'footer-candidate-budget',cases};
}
module.exports={followScenario,submitNativeScrollScenario,smoothTailTrajectoryScenario,footerCandidateBudgetScenario};
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
  if(!['submit-native-scroll','smooth-tail-trajectory','footer-candidate-budget'].includes(selected)){
   const result=await window.webContents.executeJavaScript(`(${followScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(DEFAULT_APPEARANCE)},${JSON.stringify(selected)})`);
   console.log('Chat bottom follow cases',JSON.stringify(result));assert.equal(result.passed,true,'Pinned tail or manual reader contract failed');
  }
  if(selected==='all'||selected==='submit-native-scroll'){
   const result=await window.webContents.executeJavaScript(`(${submitNativeScrollScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(DEFAULT_APPEARANCE)})`);
   console.log('Submit native scroll delayed HP result',JSON.stringify(result));assert.equal(result.passed,true,'Submitted follow intent was lost after native programmatic scroll or manual reader moved');
  }
  if(selected==='all'||selected==='smooth-tail-trajectory'){
   const result=await window.webContents.executeJavaScript(`(${smoothTailTrajectoryScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(DEFAULT_APPEARANCE)})`);
   console.log('Smooth tail trajectory result',JSON.stringify(result));assert.equal(result.passed,true,'Adapter must preserve native smooth rendered trajectory and final HP/footer clearance');
  }
  if(selected==='all'||selected==='footer-candidate-budget'){
   const result=await window.webContents.executeJavaScript(`(${footerCandidateBudgetScenario.toString()})(${configureChatAppearance.toString()},${JSON.stringify(DEFAULT_APPEARANCE)})`);
   console.log('Footer candidate budget result',JSON.stringify(result));assert.equal(result.passed,true,'Native message ornaments must not exhaust the external footer candidate budget');
  }
  passed=true;
 }catch(error){console.error('Chat follow fixture failed:',error);}finally{clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await fs.rm(profile,{recursive:true,force:true});app.exit(passed?0:1);}})().catch(error=>{console.error(error);app.exit(1);});
}
