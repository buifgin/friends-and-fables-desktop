// Combined native submit -> chat follow contract; isolated ROOT scheduling only.
const assert=require('node:assert/strict'),path=require('node:path');
const {app,BrowserWindow,session}=require('electron');
const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
const {configureCombatPanel}=require(path.join(root,'dist/combat/combat-panel'));
const {combatPanelCss}=require(path.join(root,'dist/combat/combat-panel-style'));
const {configureChatAppearance}=require(path.join(root,'dist/appearance/chat-appearance'));
const {DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
app.on('window-all-closed',()=>{});
let window,passed=false;const timeout=setTimeout(()=>app.exit(1),20000);
(async()=>{try{
 if(process.env.FABLES_TEST_PROFILE_DIR)app.setPath('userData',process.env.FABLES_TEST_PROFILE_DIR);
 await app.whenReady();
 const site=session.fromPartition('combat-chat-follow');
 site.protocol.handle('https',()=>new Response(`<!doctype html><style>
 body{margin:0}#chat{margin-left:70px}#feed{height:400px;overflow:auto;box-sizing:border-box;padding-bottom:64px}
 #events-list>div{height:90px}.native{position:fixed;inset:40px;background:white;pointer-events:auto}button{min-height:32px}
 </style><div id="chat" class="flex-1 h-full w-full"><main id="feed"><div id="events-list"></div></main>
 <div id="composer"><div class="tiptap" contenteditable="true">Unsent composer draft</div><button id="dice"><svg class="lucide-dice-3"></svg>Dice</button><button id="attack"><svg class="lucide-swords"></svg>Attack</button></div></div>
 <form id="unrelated"><button type="submit">Other</button></form>
 <script>
 window.submits=[];window.opens=0;composer.__reactFiberFixture={memoizedProps:{encounterActive:true}};const list=document.getElementById('events-list');
 for(let id=1;id<=18;id++){const row=document.createElement('div');row.id='event-'+id;row.innerHTML='<div id="event-container-'+id+'"><div id="event-message-card-'+id+'"><div class="prose"><p>Native narration '+id+'</p></div></div></div>';list.append(row)}
 attack.onclick=()=>{if(document.querySelector('[role=dialog]'))return;opens++;const panel=document.createElement('div');panel.className='native';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.innerHTML='<h2>Choose Action</h2><button id="close" type="button"><svg class="lucide-x"></svg>Close</button><form><input value="Native attack draft"><button type="submit">Attack</button></form>';document.body.append(panel);panel.querySelector('#close').onclick=()=>panel.remove();panel.querySelector('form').onsubmit=event=>{event.preventDefault();submits.push(event.isTrusted)}};
 unrelated.onsubmit=event=>event.preventDefault();
 </script>`,{headers:{'Content-Type':'text/html'}}));
 window=new BrowserWindow({show:false,width:1100,height:760,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 await window.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f00000000000/play');window.show();window.focus();window.webContents.focus();
 const js=source=>window.webContents.executeJavaScript(source);
 const settled=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
 const until=async expression=>{for(let i=0;i<80;i++){if(await js(expression))return;await new Promise(resolve=>setTimeout(resolve,10))}throw Error('Timed out: '+expression)};
 await js(`(${configureChatAppearance.toString()})(${JSON.stringify(DEFAULT_APPEARANCE)})`);
 await js(`(${configureCombatPanel.toString()})(true,'en',${JSON.stringify(combatPanelCss)})`);
 await until("!!document.querySelector('[data-ff-combat-docked]')");await settled();
 // A trusted submit starts browser-owned smooth motion on the next frame;
 // a few painted frames prove dispatch, not arrival. Keep the existing800ms
 // readiness budget and resolve only on the actual tail for two painted frames.
 const tailCompletionProgram=`new Promise((resolve,reject)=>{
  const node=document.getElementById('feed'),start=performance.now();let frame=0,stable=0,frames=0,scrollEnds=0,min=node.scrollTop,max=min;
  const ended=()=>{scrollEnds++};node.addEventListener('scrollend',ended);
  const cleanup=()=>{cancelAnimationFrame(frame);clearTimeout(timer);node.removeEventListener('scrollend',ended)};
  const snapshot=()=>({top:node.scrollTop,max:node.scrollHeight-node.clientHeight,elapsed:performance.now()-start,frames,scrollEnds,min,maxObserved:max});
  const timer=setTimeout(()=>{const evidence=snapshot();cleanup();reject(Error('Smooth follow did not reach tail: '+JSON.stringify(evidence)))},800);
  const sample=()=>{frames++;const top=node.scrollTop,target=node.scrollHeight-node.clientHeight;min=Math.min(min,top);max=Math.max(max,top);stable=Math.abs(top-target)<=1?stable+1:0;
   if(stable>=2){const evidence=snapshot();cleanup();resolve(evidence);return}frame=requestAnimationFrame(sample)};
  frame=requestAnimationFrame(sample);
 })`;
 const tailCompletion=async label=>{const evidence=await js(tailCompletionProgram);console.log(label,JSON.stringify(evidence));return evidence};
 const trustedSubmit=async()=>{const point=await js("(()=>{const b=document.querySelector('[data-ff-combat-docked] button[type=submit]'),r=b.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return{x,y,hit:b.contains(document.elementFromPoint(x,y))}})()");assert(point.hit,'native submit hit target');for(const type of ['mouseDown','mouseUp'])window.webContents.sendInputEvent({type,button:'left',clickCount:1,x:point.x,y:point.y});await settled()};
 const reopenFocus=process.env.FABLES_COMBAT_CHAT_FOCUS;
 if(reopenFocus?.startsWith('reopen')){
  const fullscreen=new Promise(resolve=>window.once('enter-full-screen',resolve));window.setFullScreen(true);await fullscreen;await settled();
  if(reopenFocus!=='reopen'){
   assert.ok(['reopen-missing','reopen-no-mount'].includes(reopenFocus),'known bounded native reopen mode');
   await js(`window.reopenClicks=0;window.originalTrigger=document.getElementById('attack');window.originalNativeOpen=originalTrigger.onclick;window.submittedForm=document.querySelector('[data-ff-combat-docked] form');submittedForm.querySelector('input').value='Retained submitted draft';submittedForm.onsubmit=event=>{event.preventDefault();submits.push(event.isTrusted);${reopenFocus==='reopen-missing'?'originalTrigger.remove()':"originalTrigger.onclick=()=>{reopenClicks++}"};submittedForm.closest('[role=dialog]').remove()};true`);
   await trustedSubmit();
   if(reopenFocus==='reopen-no-mount')await until('reopenClicks===1');
   const released=await js(`new Promise((resolve,reject)=>{const start=performance.now(),root=document.documentElement;const finish=()=>{if(root.hasAttribute('data-ff-combat-open'))return;observer.disconnect();clearTimeout(timer);resolve({elapsed:performance.now()-start,opens,clicks:reopenClicks,trusted:submits.at(-1),docked:!!document.querySelector('[data-ff-combat-docked]'),reserved:root.getAttribute('data-ff-combat-open'),chat:document.querySelector('#chat').hasAttribute('data-ff-combat-chat'),submittedDraft:submittedForm.querySelector('input').value,draft:document.querySelector('.tiptap').textContent})};const observer=new MutationObserver(finish),timer=setTimeout(()=>{observer.disconnect();reject(Error('Blank pending native reservation survived bounded missing/failed capability deadline'))},6100);observer.observe(root,{attributes:true,attributeFilter:['data-ff-combat-open']});finish()})`);
   console.log('Bounded native reopen '+reopenFocus,JSON.stringify(released));
   assert.ok(released.elapsed<=6100,'blank reservation cleanup remains bounded');
   assert.deepEqual({...released,elapsed:0},{elapsed:0,opens:1,clicks:reopenFocus==='reopen-no-mount'?1:0,trusted:true,docked:false,reserved:null,chat:false,submittedDraft:'Retained submitted draft',draft:'Unsent composer draft'},'missing native capability releases only owned layout without losing drafts or retrying dispatched clicks');
   // Restoring capability after cleanup must not resurrect the cancelled
   // pending submission. A fresh user launch remains available separately.
   await js('originalTrigger.onclick=originalNativeOpen;if(!originalTrigger.isConnected)composer.append(originalTrigger);composer.append(document.createComment("native capability restored after bound"));true');await settled();
   assert.equal(await js('opens'),1,'late capability restoration never reopens expired submission');
   assert.equal(await js('reopenClicks'),reopenFocus==='reopen-no-mount'?1:0,'failed actual native dispatch is never retried');
   await js('window.__friendsFablesDesktopCombatPanel.dispose();window.__friendsFablesDesktopChatAppearance.dispose()');passed=true;return;
  }
  await js("window.restoreLauncher=false;const panel=document.querySelector('[data-ff-combat-docked]'),trigger=document.getElementById('attack');panel.querySelector('form').onsubmit=event=>{event.preventDefault();submits.push(event.isTrusted);trigger.remove();panel.remove();setTimeout(()=>{composer.append(trigger);restoreLauncher=true},120)};true");
  await trustedSubmit();await until('restoreLauncher');await settled();
  const state=await js("({opens,trusted:submits.at(-1),docked:!!document.querySelector('[data-ff-combat-docked]'),reserved:document.documentElement.getAttribute('data-ff-combat-open'),launcher:!!document.getElementById('attack')?.isConnected,draft:document.querySelector('.tiptap').textContent})");
  console.log('Fullscreen native submit temporary launcher recovery',JSON.stringify(state));assert.deepEqual(state,{opens:2,trusted:true,docked:true,reserved:'true',launcher:true,draft:'Unsent composer draft'},'restored native capability reopens once instead of leaving a blank reserved panel');
  await js('window.__friendsFablesDesktopCombatPanel.dispose();window.__friendsFablesDesktopChatAppearance.dispose()');console.log('Fullscreen temporary native launcher fixture passed');passed=true;return;
 }
 const older=async()=>{await js("feed.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-500}));feed.scrollTop=400;feed.dispatchEvent(new Event('scrollend',{bubbles:true}))");await settled();assert.equal(await js('feed.scrollTop'),400)};
 await older();
 await js("document.querySelector('[data-ff-combat-docked] form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));unrelated.requestSubmit()");await settled();
 assert.equal(await js('feed.scrollTop'),400,'synthetic docked and unrelated native submits preserve history');
 await trustedSubmit();assert.equal(await js('submits.at(-1)'),true,'real input dispatches trusted native submit');
 let result=await tailCompletion('Trusted docked submit follows history');assert.ok(Math.abs(result.top-result.max)<=1,'own native docked submit follows newest result from older history');
 await js("const row=document.createElement('div');row.id='event-19';row.textContent='Native attack result';document.getElementById('events-list').append(row)");await settled();
 result=await tailCompletion('New native result follow completion');assert.ok(Math.abs(result.top-result.max)<=1,'new native result remains followed');
 await older();await js("const range=document.createRange();range.selectNodeContents(document.querySelector('#event-message-card-8 p'));getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'))");await settled();
 const selected=await js('getSelection().toString()');await trustedSubmit();assert.equal(await js('feed.scrollTop'),400,'submit preserves selected history');assert.equal(await js('getSelection().toString()'),selected);
 assert.equal(await js("document.querySelector('.tiptap').textContent"),'Unsent composer draft');assert.equal(await js("document.querySelector('[data-ff-combat-docked] input').value"),'Native attack draft');
 await js('getSelection().removeAllRanges();window.__friendsFablesDesktopCombatPanel.dispose();window.__friendsFablesDesktopChatAppearance.dispose()');
 console.log('Combat/chat native submit follow fixture passed');passed=true;
 }catch(error){console.error(error)}finally{clearTimeout(timeout);window?.destroy();app.exit(passed?0:1)}})();
