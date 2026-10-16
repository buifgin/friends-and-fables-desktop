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
 window.submits=[];const list=document.getElementById('events-list');
 for(let id=1;id<=18;id++){const row=document.createElement('div');row.id='event-'+id;row.innerHTML='<div id="event-container-'+id+'"><div id="event-message-card-'+id+'"><div class="prose"><p>Native narration '+id+'</p></div></div></div>';list.append(row)}
 attack.onclick=()=>{if(document.querySelector('[role=dialog]'))return;const panel=document.createElement('div');panel.className='native';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.innerHTML='<h2>Choose Action</h2><button id="close" type="button"><svg class="lucide-x"></svg>Close</button><form><input value="Native attack draft"><button type="submit">Attack</button></form>';document.body.append(panel);panel.querySelector('#close').onclick=()=>panel.remove();panel.querySelector('form').onsubmit=event=>{event.preventDefault();submits.push(event.isTrusted)}};
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
 const older=async()=>{await js("feed.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-500}));feed.scrollTop=400;feed.dispatchEvent(new Event('scrollend',{bubbles:true}))");await settled();assert.equal(await js('feed.scrollTop'),400)};
 await older();
 await js("document.querySelector('[data-ff-combat-docked] form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));unrelated.requestSubmit()");await settled();
 assert.equal(await js('feed.scrollTop'),400,'synthetic docked and unrelated native submits preserve history');
 const trustedSubmit=async()=>{const point=await js("(()=>{const b=document.querySelector('[data-ff-combat-docked] button[type=submit]'),r=b.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return{x,y,hit:b.contains(document.elementFromPoint(x,y))}})()");assert(point.hit,'native submit hit target');for(const type of ['mouseDown','mouseUp'])window.webContents.sendInputEvent({type,button:'left',clickCount:1,x:point.x,y:point.y});await settled()};
 await trustedSubmit();assert.equal(await js('submits.at(-1)'),true,'real input dispatches trusted native submit');
 let result=await js('({top:feed.scrollTop,max:feed.scrollHeight-feed.clientHeight})');console.log('Trusted docked submit follows history',JSON.stringify(result));assert.ok(Math.abs(result.top-result.max)<=1,'own native docked submit follows newest result from older history');
 await js("const row=document.createElement('div');row.id='event-19';row.textContent='Native attack result';document.getElementById('events-list').append(row)");await settled();
 result=await js('({top:feed.scrollTop,max:feed.scrollHeight-feed.clientHeight})');assert.ok(Math.abs(result.top-result.max)<=1,'new native result remains followed');
 await older();await js("const range=document.createRange();range.selectNodeContents(document.querySelector('#event-message-card-8 p'));getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'))");await settled();
 const selected=await js('getSelection().toString()');await trustedSubmit();assert.equal(await js('feed.scrollTop'),400,'submit preserves selected history');assert.equal(await js('getSelection().toString()'),selected);
 assert.equal(await js("document.querySelector('.tiptap').textContent"),'Unsent composer draft');assert.equal(await js("document.querySelector('[data-ff-combat-docked] input').value"),'Native attack draft');
 await js('getSelection().removeAllRanges();window.__friendsFablesDesktopCombatPanel.dispose();window.__friendsFablesDesktopChatAppearance.dispose()');
 console.log('Combat/chat native submit follow fixture passed');passed=true;
 }catch(error){console.error(error)}finally{clearTimeout(timeout);window?.destroy();app.exit(passed?0:1)}})();
