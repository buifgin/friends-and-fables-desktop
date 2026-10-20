const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const {mkdtemp,readFile,rm,writeFile}=require('node:fs/promises');
const {app,BrowserWindow,session}=require('electron');
const appRoot=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname, '..', '..');
const {AppearanceManager,registerAppearanceScheme}=require(path.join(appRoot,'dist/appearance/appearance'));
const {HostInstructionsManager}=require(path.join(appRoot,'dist/commands/host-instructions'));
const {HOST_INSTRUCTIONS_URL}=require(path.join(appRoot,'dist/commands/host-instructions-core'));
registerAppearanceScheme();app.on('window-all-closed',()=>{});
let parent,settingsWindow,forged,profile,host,appearance,stage='initialize';
let lastParentReadiness=null;
const timer=setTimeout(()=>{const parentState=parent&&!parent.isDestroyed()?{nativeVisible:parent.isVisible(),nativeFocused:parent.isFocused(),loading:parent.webContents.isLoading(),url:parent.webContents.getURL(),lastReadiness:lastParentReadiness}:null;console.error('Instruction test timed out.',{stage,parent:parentState});app.exit(1)},50000);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const script=require('esbuild').buildSync({stdin:{contents:`
import {Editor,Node} from '@tiptap/core';import StarterKit from '@tiptap/starter-kit';
const Paragraph=Node.create({name:'paragraph',priority:1000,group:'block',content:'inline*',addAttributes(){return {kind:{default:null}}},parseHTML(){return [{tag:'p'}]},renderHTML({HTMLAttributes}){return ['p',HTMLAttributes,0]}});
const options={extensions:[StarterKit.configure({paragraph:false}),Paragraph]};
window.sent=[];window.draftHTML='';window.originalNodes=[];
window.editor=new Editor({...options,element:document.getElementById('editor-content'),content:'<p></p>',onUpdate({editor}){const html=editor.getHTML();setTimeout(()=>window.draftHTML=html,0)}});
window.formEditor=new Editor({...options,element:document.getElementById('form-content'),content:'<p>/sp</p>'});
document.getElementById('send').addEventListener('click',()=>{window.sent.push({html:window.draftHTML,json:window.editor.getJSON()});const article=document.createElement('article');article.className='prose';article.innerHTML=window.draftHTML;window.originalNodes.push(article.lastElementChild.firstChild);document.getElementById('feed').append(article)});
document.getElementById('editor-content').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();document.getElementById('send').click()}},true);
`,resolveDir:path.join(__dirname, '..', '..')},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;

// Runs against the already installed production hiding controller. Every wait is
// a finite task boundary; no new production observer or native nodes are replaced.
async function instructionMarkerPreservation() {
 const check=(value,message)=>{if(!value)throw Error(`Instruction preservation: ${message}`)};
 const settle=async()=>{await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));};
 const controller=window.__friendsFablesDesktopInstructionHiding;
 check(controller,'production hiding controller missing');
 const article=document.createElement('article');article.className='prose';
 const originals=[null,'false','true'];
 const paragraphs=originals.map(value=>{const p=document.createElement('p');p.textContent='[[FF-SP:1]] Preserve raw guidance. [[/FF-SP:1]]';if(value!==null)p.setAttribute('data-ff-translation-ignore',value);article.append(p);return {p,text:p.firstChild,original:value};});
 const split=document.createElement('div');split.innerHTML='<p>[[FF-SP:1]]</p><ul><li>Split guidance.</li></ul><p>[[/FF-SP:1]]</p>';article.append(split);
 const splitNodes=[...split.children],closing=split.lastElementChild,closingText=closing.firstChild;
 const excluded=document.createElement('div');excluded.innerHTML='<p><code>[[FF-SP:1]] literal example [[/FF-SP:1]]</code></p><pre><p>[[FF-SP:1]] code block [[/FF-SP:1]]</p></pre><p>[[FF-SP:1]] incomplete</p>';article.append(excluded);
 document.getElementById('feed').append(article);controller.setEnabled(true);await settle();
 const marked=node=>node.getAttribute('data-ff-desktop-instruction-block')==='true'&&node.getAttribute('data-ff-translation-ignore')==='true';
 const retained=()=>paragraphs.every(({p,text})=>p.firstChild===text&&text.isConnected)&&closing.firstChild===closingText;
 try {
  check(paragraphs.every(({p})=>marked(p)&&getComputedStyle(p).display==='none')&&splitNodes.every(marked),'complete/split blocks not hidden');
  check(!excluded.querySelector('[data-ff-desktop-instruction-block]'),'coded or incomplete blocks marked');
  let writes=0;const observer=new MutationObserver(records=>{writes+=records.length;});observer.observe(article,{subtree:true,attributes:true,attributeFilter:['data-ff-desktop-instruction-block','data-ff-desktop-hidden-instructions','data-ff-translation-ignore']});
  try {const inert=document.createElement('div');document.body.append(inert);await settle();inert.append(document.createComment('unrelated'));await settle();check(writes===0,'stable markers rewritten by unrelated childList');inert.remove();await settle();check(writes===0,'stable markers rewritten by unrelated removal');}finally{observer.disconnect();}
  controller.setEnabled(false);await settle();check(paragraphs.every(({p})=>marked(p)&&!p.hasAttribute('data-ff-desktop-hidden-instructions')&&getComputedStyle(p).display!=='none'),'review toggle did not reveal raw ignored guidance');
  check(paragraphs.every(({p})=>p.textContent==='[[FF-SP:1]] Preserve raw guidance. [[/FF-SP:1]]')&&retained(),'review toggle changed native text/identity');
  controller.setEnabled(true);await settle();check(paragraphs.every(({p})=>p.hasAttribute('data-ff-desktop-hidden-instructions')),'hide toggle did not reapply');
  for(const {text} of paragraphs)text.data='Обычный повторно используемый абзац.';closingText.data='Incomplete ending';await settle();
  check(paragraphs.every(({p,original})=>!p.hasAttribute('data-ff-desktop-instruction-block')&&!p.hasAttribute('data-ff-desktop-hidden-instructions')&&p.getAttribute('data-ff-translation-ignore')===original),'ceased blocks did not restore null/false/true ignore values');
  check(splitNodes.every(node=>!node.hasAttribute('data-ff-desktop-instruction-block')&&!node.hasAttribute('data-ff-translation-ignore')),'incomplete split retained markers');
  for(const {text} of paragraphs)text.data='[[FF-SP:1]] Reused guidance. [[/FF-SP:1]]';closingText.data='[[/FF-SP:1]]';await settle();
  check(paragraphs.every(({p})=>marked(p))&&splitNodes.every(marked)&&retained(),'reused complete blocks lost markers/native identity');
  for(const {text} of paragraphs)text.data='Обычный повторно используемый абзац снова.';await settle();
  check(paragraphs.every(({p,original})=>p.getAttribute('data-ff-translation-ignore')===original),'reuse lost original ignore value');
  return {passed:true,originalIgnoreValues:originals,stableMarkerWrites:writes,nativeIdentity:retained()};
 } finally {article.remove();controller.setEnabled(true);await settle();}
}

// Selected diagnostic only: observe the existing fixture layout without adding
// native CSS, autoresize callbacks, editor clears, or send/layout delays.
async function enterGeometryProbe(shift=false) {
 const editor=window.editor,dom=editor.view.dom,parent=dom.parentElement;
 const composer=document.getElementById('composer'),send=document.getElementById('send');
 const footer=document.querySelector('[data-ff-desktop-command-controls]');
 if(!footer)throw Error('Geometry probe requires installed command footer');
 const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop};};
 const samples=[],events=[];
 const sample=phase=>({phase,time:performance.now(),visibility:document.visibilityState,focused:document.hasFocus(),editor:rect(dom),composer:rect(composer),footer:rect(footer),send:rect(send),paragraphs:dom.querySelectorAll(':scope>p').length,marked:parent.hasAttribute('data-ff-desktop-sp-draft')});
 const baseline=sample('before'),sentBefore=window.sent.length;
 const observe=event=>()=>{if(events.length<4)events.push(sample(event));};
 const observers=['transaction','update','selectionUpdate'].map(event=>[event,observe(event)]);
 let sendSample=null,resolveSend;
 const sent=new Promise(resolve=>{resolveSend=resolve;});
 const onSend=()=>{sendSample=sample('send-click');resolveSend();};
 const paint=()=>new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Geometry probe did not receive two visible frames')),1500);
  const frame=()=>{const value=sample('raf-'+(samples.length+1));samples.push(value);if(value.visibility!=='visible'||!value.focused){clearTimeout(timeout);reject(Error('Geometry probe lost visible/focused renderer'));return;}if(samples.length===2){clearTimeout(timeout);resolve();}else requestAnimationFrame(frame);};
  requestAnimationFrame(frame);
 });
 for(const [event,callback] of observers)editor.on(event,callback);
 send.addEventListener('click',onSend,true);
 let sendTimeout;
 try {
  // The same DOM key adapter as this fixture's existing Enter tests. Both paint
  // requests and dispatch start in one renderer task; no pre-key frame is sampled.
  const paints=paint();
  dom.focus();
  dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',shiftKey:shift,bubbles:true,cancelable:true}));
  dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}));
  const submitted=shift?Promise.resolve():Promise.race([sent,new Promise((_,reject)=>{sendTimeout=setTimeout(()=>reject(Error('Geometry probe Send click missing')),1500);})]);
  await Promise.all([paints,submitted]);
  return {input:'existing DOM KeyboardEvent adapter',layout:'existing fixture; native site prose CSS absent',baseline,events,paints:samples,send:sendSample,sends:window.sent.length-sentBefore,payload:window.sent[sentBefore]??null,html:editor.getHTML(),json:editor.getJSON(),nativeEditorIdentity:window.editor===editor&&editor.view.dom===dom&&dom.parentElement===parent&&document.getElementById('composer')===composer&&document.getElementById('send')===send};
 } finally {
  clearTimeout(sendTimeout);
  for(const [event,callback] of observers)editor.off(event,callback);
  send.removeEventListener('click',onSend,true);
 }
}

function assertStableEnterGeometry(result,label) {
 assert.equal(result.nativeEditorIdentity,true,label+' retains native editor/composer/send identity');
 assert.equal(result.sends,1,label+' sends exactly once');
 assert.equal(result.paints.length,2);assert(result.send,label+' records actual Send click');
 // Synchronous events intentionally remain diagnostic: an unmarked transaction
 // may grow before hiding in the same JS task without any visible flicker.
 for(const sample of [...result.paints,result.send])for(const surface of ['editor','composer','footer']){
  for(const property of ['x','y','width','height','scrollHeight','scrollTop'])assert(Math.abs(sample[surface][property]-result.baseline[surface][property])<=0.5,`${label} ${sample.phase} ${surface}.${property} changed: ${JSON.stringify(result)}`);
 }
}

const html='<!doctype html><html><meta charset="utf-8"><body><div class="flex flex-col bg-gray-800/80 relative" id="composer"><button aria-label="More actions">More actions</button><div id="editor-content"></div><button role="combobox" id="mode">Manual</button><button id="send" aria-label="Send message">Send</button></div><div id="feed"></div><form><div class="grid relative"><div id="working-context-bar-spacer"></div><div id="form-content"></div></div></form><script src="/editor.js"></script></body></html>';
(async()=>{
 profile=process.env.FABLES_TEST_PROFILE_DIR||await mkdtemp(path.join(os.tmpdir(),'fables-sp-test-'));app.setPath('userData',profile);await app.whenReady();
 appearance=new AppearanceManager();await appearance.initialize();host=new HostInstructionsManager();await host.initialize();host.onChange=value=>appearance.setHostInstructions(value);await appearance.setHostInstructions(host.getSettings());
 const site=session.fromPartition('instructions-test');site.protocol.handle('https',request=>new Response(new URL(request.url).pathname==='/editor.js'?script:html,{headers:{'Content-Type':new URL(request.url).pathname==='/editor.js'?'text/javascript':'text/html'}}));
 parent=new BrowserWindow({show:false,width:1100,height:820,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});appearance.attach(parent.webContents);
 parent.webContents.on('console-message',details=>{if(details.level==='error')console.error('Fixture renderer:',details.message)});
 let opens=0;parent.webContents.setWindowOpenHandler(({url})=>{if(host.handleOpenRequest(parent.webContents,parent,url))opens++;return {action:'deny'}});
 stage='page';await parent.loadURL('https://play.fables.gg/campaign/play');const js=async source=>{try{return await parent.webContents.executeJavaScript(source)}catch(error){console.error('Failed fixture expression:',source);throw error}};
 const until=async(predicate,label='state')=>{for(let i=0;i<250;i++){if(await predicate())return;await sleep(20)}console.error(await js("({html:editor.getHTML(),sent:sent.length,status:document.querySelector('[data-ff-desktop-command-controls]')?.textContent})"));throw Error('Timed out: '+label)};
 const focusParent=async(label)=>{stage=label;parent.show();parent.focus();parent.webContents.focus();let state;for(let i=0;i<100;i++){state=await js("({visibility:document.visibilityState,focused:document.hasFocus(),readyState:document.readyState})");lastParentReadiness={...state,nativeVisible:parent.isVisible(),nativeFocused:parent.isFocused(),loading:parent.webContents.isLoading()};if(state.visibility==='visible'&&state.focused)break;await sleep(20)}if(state?.visibility!=='visible'||!state.focused)assert.fail(`Parent renderer did not become visible and focused before frame-dependent work: ${JSON.stringify(lastParentReadiness)}`);const paint=await js("new Promise(resolve=>{let frames=0;const fallback=setTimeout(()=>resolve({frames,timedOut:true,visibility:document.visibilityState,focused:document.hasFocus()}),1500);const tick=()=>{frames++;if(frames===2){clearTimeout(fallback);resolve({frames,timedOut:false,visibility:document.visibilityState,focused:document.hasFocus()})}else requestAnimationFrame(tick)};requestAnimationFrame(tick)})");lastParentReadiness={...lastParentReadiness,paint};assert.equal(paint.frames,2,`Parent renderer must complete two animation frames before frame-dependent work: ${JSON.stringify(lastParentReadiness)}`);assert.equal(paint.timedOut,false,`Parent animation-frame readiness timed out: ${JSON.stringify(lastParentReadiness)}`);assert.equal(paint.visibility,'visible');assert.equal(paint.focused,true)};
 await focusParent('page readiness');
 await until(()=>js('!!window.editor'));await sleep(40);
 const draft=async value=>{await js(`editor.commands.setContent(${JSON.stringify(value)});editor.view.dom.dispatchEvent(new Event('input',{bubbles:true}))`);await sleep(25)};
 const enter=async shift=>{await js(`editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',shiftKey:${!!shift},bubbles:true,cancelable:true}));editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))`);await sleep(30)};
 const preferenceFile=()=>readFile(path.join(profile,'host-instructions.json'),'utf8').then(JSON.parse).catch(()=>null);
 if(process.env.FABLES_SP_SCENARIO==='enter-geometry'){
  stage='enter geometry configuration';
  const body='<p>I look around.</p>',guidance='Keep scene continuity.\nRespect the current scene.';
  await appearance.save({...appearance.getSettings(),messageCommands:true});
  await host.save({...host.getSettings(),configured:true,text:guidance,enabled:false,hideMarked:true});
  await until(()=>js("!!document.querySelector('[data-ff-desktop-command-controls]')"),'geometry command footer');
  await draft(body);await js('editor.commands.focus("end")');await focusParent('geometry guidance OFF');
  const off=await js(`(${enterGeometryProbe.toString()})()`);
  console.log('ENTER_GEOMETRY guidance OFF',JSON.stringify(off));
  assert.equal(off.payload.html,body);assert.deepEqual(off.payload.json,off.json);assertStableEnterGeometry(off,'guidance OFF');
  await host.save({...host.getSettings(),enabled:true});
  await until(()=>js("document.querySelector('[data-ff-desktop-sp-status]')?.textContent==='/sp active'"),'geometry guidance ON');
  await draft(body);await js('editor.commands.focus("end")');await focusParent('geometry guidance ON');
  const on=await js(`(${enterGeometryProbe.toString()})()`);
  console.log('ENTER_GEOMETRY guidance ON',JSON.stringify(on));
  const expected='<p>I look around.</p><p>[[FF-SP:1]]<br>Additional guidance for Franz; apply to this message, not as player dialogue:<br>Keep scene continuity.<br>Respect the current scene.<br>[[/FF-SP:1]]</p>';
  assert.equal(on.payload.html,expected,'Exact ordinary body and multiline guidance reach Send');
  assert.deepEqual(on.payload.json,on.json);assert.equal(on.send.marked,true,'Guidance is hidden at Send');
  assertStableEnterGeometry(on,'guidance ON');
  stage='enter geometry legitimate multiline controls';
  await draft(body);await js('editor.commands.focus("end")');
  const soft=await js(`(${enterGeometryProbe.toString()})(true)`);
  console.log('ENTER_GEOMETRY Shift+Enter',JSON.stringify(soft));
  assert.equal(soft.nativeEditorIdentity,true);assert.equal(soft.sends,0);assert.equal(soft.html,'<p>I look around.<br></p>');
  assert(soft.paints[1].editor.height>soft.baseline.editor.height+0.5,'Shift+Enter must retain legitimate visible growth');
  await draft('<p>I look around.</p><p>A second visible paragraph.</p>');
  const multiline=await js("({height:editor.view.dom.getBoundingClientRect().height,html:editor.getHTML(),sends:sent.length})");
  console.log('ENTER_GEOMETRY multiline',JSON.stringify(multiline));
  assert(multiline.height>off.baseline.editor.height+0.5,'Ordinary multiline draft must retain visible expansion');
  assert.equal(multiline.sends,2,'Multiline controls do not send');
  console.log('PASS: selected Enter geometry; stable next two visible frames and Send click. Synchronous samples are ordering evidence only; native prose CSS and OS keyboard path remain untested.');
  return;
 }

 assert.equal(await js("document.querySelector('[data-ff-desktop-sp-status]')"),null,'No badge before first configuration.');
 stage='launcher';await draft('<p>/sp</p>');await enter();assert.equal(await js('sent.length'),0);await until(()=>opens===1,'first /sp opens');
 stage='settings open';settingsWindow=await host.open(parent);settingsWindow.hide();await focusParent('settings closed; restore parent');const settingsJs=async source=>{try{return await settingsWindow.webContents.executeJavaScript(source)}catch(error){console.error('Failed settings expression:',source);throw error}};
 await until(()=>settingsJs("!document.getElementById('options').disabled"));
 assert.equal(await settingsJs("document.getElementById('close-instructions').querySelector('svg')?.getAttribute('viewBox')"),'0 0 18 18');assert.equal(await settingsJs("document.getElementById('close-instructions').querySelector('svg')?.getAttribute('aria-hidden')"),'true');assert.equal(await settingsJs("document.getElementById('close-instructions').getAttribute('aria-label')"),'Close saved instructions settings');
 stage='save';await settingsJs("document.getElementById('instructions').value="+JSON.stringify('Keep scene continuity.\n/me is a literal example. <img src=x>')+";document.getElementById('enabled').checked=true;document.getElementById('save').click()");
 await until(()=>js("document.querySelector('[data-ff-desktop-sp-status]')?.textContent==='/sp active'"),'active badge');
 assert.equal((await preferenceFile()).configured,true);assert.equal(await js('typeof window.hostInstructions'),'undefined');assert.equal(await js('typeof window.require'),'undefined');
 await draft('<p> </p>');await enter();assert.equal(await js('sent.length'),0);assert.equal(await js("editor.getHTML().includes('FF-SP')"),false,'Instructions do not turn an empty draft into a sent message.');
 await draft('<p>I look around.</p>');await enter();await until(()=>js('sent.length===1'),'first send');
 assert.equal(await js("(sent[0].html.match(/\\[\\[FF-SP:1\\]\\]/g)||[]).length"),1);assert.match(await js('sent[0].html'),/&lt;img src=x&gt;/);
 assert.match(await js('sent[0].html'),/Keep scene continuity/);assert.equal(await js("sent[0].json.content.at(-1).attrs.kind"),null,'Native paragraph attributes are accepted.');
 await until(()=>js("getComputedStyle(document.querySelector('#feed article p:last-child')).display==='none'"),'hidden sent guidance');
 assert.equal(await js("document.querySelector('#feed article p:last-child').firstChild===originalNodes[0]"),true,'Hiding preserves native message nodes.');
 assert.equal(await js("getComputedStyle(document.querySelector('#feed article p:first-child')).display==='none'"),false);
 await enter();await until(()=>js('sent.length===2'),'retry');assert.equal(await js("(sent[1].html.match(/\\[\\[FF-SP:1\\]\\]/g)||[]).length"),1,'Retries do not accumulate instructions.');
 await appearance.save({...appearance.getSettings(),messageCommands:true});await draft('<p>/me I listen.</p>');await enter(true);assert.equal(await js('sent.length'),2);assert.equal(await js("editor.getHTML().includes('FF-SP')"),false);assert.match(await js('editor.getHTML()'),/<em>I listen\.<\/em><br>/);
 await draft('<p>/gm Watch the door.</p>');await js("document.getElementById('send').click();document.getElementById('send').click()");await until(()=>js('sent.length===3'),'single click send');assert.match(await js('sent[2].html'),/#Watch the door\.#/);
 await js("document.getElementById('mode').textContent='Players Only'");await draft('<p>Player conversation.</p>');await enter();await until(()=>js('sent.length===4'),'players send');assert.equal(await js("sent[3].html.includes('FF-SP')"),false);assert.match(await js("document.querySelector('[data-ff-desktop-sp-status]').textContent"),/paused/);
 await js("document.getElementById('mode').textContent='Только игроки'");await draft('<p>Разговор игроков.</p>');await enter();await until(()=>js('sent.length===5'));assert.equal(await js("sent[4].html.includes('FF-SP')"),false);
 await js("document.getElementById('mode').textContent='Manual'");await draft('<p>Cancel after a mode change.</p>');await js("document.getElementById('send').click();document.getElementById('mode').textContent='Players Only'");await sleep(50);assert.equal(await js('sent.length'),5);assert.equal(await js("editor.getHTML().includes('FF-SP')"),false,'A queued mode change removes the unsent instruction block.');
 await js("document.getElementById('mode').textContent='Manual'");await draft('<p>Cancel an immediate mode change.</p>');await js("window.changeMode=()=>document.getElementById('mode').textContent='Players Only';editor.on('update',changeMode);document.getElementById('send').click();editor.off('update',changeMode);void 0");await sleep(40);assert.equal(await js('sent.length'),5);assert.equal(await js("editor.getHTML().includes('FF-SP')"),false,'A mode change during editor commit cannot send guidance to Players Only.');
 await js("document.getElementById('mode').textContent='Manual';document.getElementById('send').disabled=true");await draft('<p>Disabled send.</p>');await enter();assert.equal(await js('sent.length'),5);assert.equal(await js("editor.getHTML().includes('FF-SP')"),false);await js("document.getElementById('send').disabled=false");
 await draft('<p>Original draft.</p>');await js("document.getElementById('send').click();editor.commands.insertContent(' Edited.');editor.view.dom.dispatchEvent(new Event('input',{bubbles:true}))");await sleep(50);assert.equal(await js('sent.length'),5);assert.equal(await js("editor.getHTML().includes('FF-SP')"),false);assert.match(await js('editor.getHTML()'),/Edited\./);
 await draft('<p>/sp</p>');await js("document.getElementById('send').click()");await until(()=>opens===2);assert.equal(await js('sent.length'),5);
 await js("formEditor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))");assert.equal(opens,2,'Character forms do not receive /sp commands.');
 await settingsJs("document.getElementById('instructions').value='Unsaved instruction draft.'");appearance.setLocale('ru');host.setInterface({...appearance.getSettings(),preset:'light'},'ru');
 await until(()=>settingsJs("document.documentElement.lang==='ru'"));assert.equal(await settingsJs("document.getElementById('instructions').value"),'Unsaved instruction draft.');assert.equal(await settingsJs("document.querySelector('h1').textContent"),'Сохранённые инструкции /sp');assert.equal(await settingsJs("document.getElementById('close-instructions').getAttribute('aria-label')"),'Закрыть настройки инструкций');assert.equal(await settingsJs("document.getElementById('close-instructions').title"),'Закрыть настройки инструкций');assert.equal(await settingsJs("document.documentElement.style.getPropertyValue('--ui-bg')"),'#f5f5f5');
 await until(()=>js("document.querySelector('[data-ff-desktop-sp-status]')?.textContent==='/sp активен'"),'Russian /sp badge');
 const savedBeforeInvalid=host.getSettings();await settingsJs("document.getElementById('instructions').value='[[FF-SP:1]]';document.getElementById('save').click()");assert.equal(await settingsJs("document.getElementById('status').textContent"),'Введите до 4 000 символов без служебных меток /sp.','Reserved /sp markers show the Russian validation message.');assert.deepEqual(host.getSettings(),savedBeforeInvalid,'Invalid Russian settings do not modify saved guidance.');await settingsJs("document.getElementById('instructions').value='Unsaved instruction draft.'");
 await host.save({...host.getSettings(),hideMarked:false});await until(()=>js("getComputedStyle(document.querySelector('#feed article p:last-child')).display!=='none'"));
 assert.equal(await js("document.querySelector('#feed article p:last-child').firstChild===originalNodes[0]"),true);assert.equal(await js("document.querySelector('#feed article p:last-child').hasAttribute('data-ff-translation-ignore')"),true,'Displayed guidance remains raw when reviewing it.');
 await js("const article=document.createElement('article');article.className='prose';article.id='split-block';article.innerHTML='<div><p>[[FF-SP:1]]</p><ul><li>Guidance across markdown blocks.</li></ul><p>[[/FF-SP:1]]</p><p id=ordinary-after>Ordinary content remains.</p></div>';document.getElementById('feed').append(article);const incomplete=document.createElement('article');incomplete.className='prose';incomplete.id='incomplete';incomplete.innerHTML='<p>[[FF-SP:1]] incomplete text</p><p>Other message</p>';document.getElementById('feed').append(incomplete)");
 await host.save({...host.getSettings(),hideMarked:true});await until(()=>js("document.querySelector('#split-block ul').hasAttribute('data-ff-desktop-hidden-instructions')"));assert.equal(await js("getComputedStyle(document.getElementById('ordinary-after')).display==='none'"),false);assert.equal(await js("document.querySelectorAll('#incomplete [data-ff-desktop-hidden-instructions]').length"),0,'Unbalanced markers do not hide unrelated messages.');
 await js("{const article=document.createElement('article');article.className='prose';article.id='inline-code';article.innerHTML='<p>[[FF-SP:1]]<br>Use <code>literal code</code> in guidance.<br>[[/FF-SP:1]]</p><p><code>[[FF-SP:1]] literal example [[/FF-SP:1]]</code></p>';document.getElementById('feed').append(article)}");
 await until(()=>js("document.querySelector('#inline-code p:first-child').hasAttribute('data-ff-desktop-hidden-instructions')"));assert.equal(await js("document.querySelector('#inline-code p:last-child').hasAttribute('data-ff-desktop-hidden-instructions')"),false,'Literal marker examples in code remain visible.');
 stage='instruction marker preservation';const markerPreservation=await js(`(${instructionMarkerPreservation.toString()})()`);console.log('Instruction marker preservation',JSON.stringify(markerPreservation));assert.equal(markerPreservation.passed,true);
 forged=new BrowserWindow({show:false,webPreferences:{partition:'fables-appearance',preload:path.join(appRoot,'dist/commands/host-instructions-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}});await forged.loadURL(HOST_INSTRUCTIONS_URL);
 assert.match(await forged.webContents.executeJavaScript("window.hostInstructions.get().then(()=> 'allowed',error=>error.message)"),/only in the app settings/);assert.match(await forged.webContents.executeJavaScript("window.hostInstructions.save({}).then(()=> 'allowed',error=>error.message)"),/only in the app settings/);assert.match(await forged.webContents.executeJavaScript("window.hostInstructions.close().then(()=> 'allowed',error=>error.message)"),/only in the app settings/);forged.destroy();forged=null;
 if(process.env.FABLES_SP_SCREENSHOT){settingsWindow.show();await writeFile(process.env.FABLES_SP_SCREENSHOT,(await settingsWindow.webContents.capturePage()).toPNG());}
 const stored=host.getSettings();stage='manager restart';await host.shutdown();host=new HostInstructionsManager();await host.initialize();host.onChange=value=>appearance.setHostInstructions(value);assert.deepEqual(host.getSettings(),stored,'Instructions survive restart.');
 stage='post-restart adventure send';await focusParent('parent ready after manager restart');await draft('<p>/gm Проверка Enter и инструкций.</p>');await enter();await until(()=>js('sent.length===6'));
 assert.match(await js('sent[5].html'),/#Проверка Enter и инструкций\.#/);assert.match(await js('sent[5].html'),/Keep scene continuity/);assert.equal(await js("sent[5].html.includes('/gm')"),false,'Plain Enter sends formatted text and saved guidance together.');
 stage='combat profile';await host.save({...host.getSettings(),combatText:'Respect combat turn order.',combatEnabled:true});
 await js("document.getElementById('composer').__reactFiberFixture={memoizedProps:{campaign:{active_encounter_id:42}}};document.getElementById('composer').append(document.createElement('i'))");
 await draft('<p>/gm Combat guidance.</p>');assert.match(await js("document.querySelector('[data-ff-desktop-sp-status]').textContent"),/бой/,'Numeric native encounter IDs select combat instructions.');await enter();await until(()=>js('sent.length===7'));
 assert.match(await js('sent[6].html'),/Respect combat turn order/);assert(!await js("sent[6].html.includes('Keep scene continuity')"),'Combat instructions replace the adventure profile.');
 stage='combat string encounter';await js("document.getElementById('composer').__reactFiberFixture.memoizedProps={campaign:{active_encounter_id:'encounter-fixture'}};document.getElementById('composer').append(document.createElement('i'))");await draft('<p>Still in combat.</p>');assert.match(await js("document.querySelector('[data-ff-desktop-sp-status]').textContent"),/бой/,'String IDs remain supported.');
 await js("document.getElementById('composer').__reactFiberFixture.memoizedProps={encounterActive:false};document.getElementById('composer').append(document.createElement('i'))");
 stage='combat adventure return';await draft('<p>Adventure again.</p>');await enter();await until(()=>js('sent.length===8'));assert.match(await js('sent[7].html'),/Keep scene continuity/);assert(!await js("sent[7].html.includes('Respect combat turn order')"));
 stage='combat queued cancellation';await draft('<p>Encounter changes while queued.</p>');await js("document.getElementById('send').click();document.getElementById('composer').__reactFiberFixture.memoizedProps.encounterActive=true");await sleep(50);assert.equal(await js('sent.length'),8);assert.equal(await js("editor.getHTML().includes('FF-SP')"),false,'Changing encounter state cancels a queued instruction send.');
 stage='commands-disabled send';await host.save({...host.getSettings(),text:'',enabled:false});await appearance.save({...appearance.getSettings(),messageCommands:false});await draft('<p>/me Plain because commands are disabled.</p>');await enter();await until(()=>js('sent.length===9'));assert.equal(await js("sent[8].html.includes('FF-SP')"),false);assert.match(await js('sent[8].html'),/\/me Plain/);assert.equal((await preferenceFile()).configured,true,'The badge appears only after configuration and remembers its inactive state.');
 stage='reopened settings readiness';settingsWindow=await host.open(parent);settingsWindow.hide();await focusParent('settings reopened; parent restored');await until(()=>settingsWindow.webContents.executeJavaScript("!document.getElementById('options').disabled"),'reopened settings ready');
 stage='reopened settings close geometry';
 const closeGeometry=await settingsWindow.webContents.executeJavaScript("(()=>{const button=document.getElementById('close-instructions'),glyph=button.querySelector('svg'),buttonRect=button.getBoundingClientRect(),glyphRect=glyph.getBoundingClientRect();return {display:getComputedStyle(button).display,buttonWidth:buttonRect.width,buttonHeight:buttonRect.height,glyphWidth:glyphRect.width,glyphHeight:glyphRect.height,centerOffsetX:Math.abs((buttonRect.left+buttonRect.right-glyphRect.left-glyphRect.right)/2),centerOffsetY:Math.abs((buttonRect.top+buttonRect.bottom-glyphRect.top-glyphRect.bottom)/2)}})()");
 assert.equal(closeGeometry.display,'grid');assert.equal(closeGeometry.buttonWidth,34);assert.equal(closeGeometry.buttonHeight,34);assert.equal(closeGeometry.glyphWidth,18);assert.equal(closeGeometry.glyphHeight,18);assert(closeGeometry.centerOffsetX<=0.5&&closeGeometry.centerOffsetY<=0.5,`Close glyph center offset: ${JSON.stringify(closeGeometry)}`);
 stage='settings close';const savedBeforeClose=host.getSettings(),fileBeforeClose=await preferenceFile();await settingsJs("document.getElementById('instructions').value='Unsaved close draft.';document.getElementById('close-instructions').click()");for(let attempts=0;!settingsWindow.isDestroyed()&&attempts<50;attempts++)await sleep(20);assert.equal(settingsWindow.isDestroyed(),true,'Close button closes the settings window.');assert.deepEqual(host.getSettings(),savedBeforeClose,'Closing does not save unsaved instruction edits.');assert.deepEqual(await preferenceFile(),fileBeforeClose,'Closing leaves saved instructions unchanged.');await focusParent('settings destroyed; parent restored');stage='final settings reopen';settingsWindow=await host.open(parent);settingsWindow.hide();await focusParent('final settings hidden; parent restored');await until(()=>settingsWindow.webContents.executeJavaScript("!document.getElementById('options').disabled"));assert.equal(await settingsWindow.webContents.executeJavaScript("document.getElementById('instructions').value"),savedBeforeClose.text,'Reopening restores only saved instructions.');
 console.log('PASS: persistent /sp settings, first-use launcher, real Tiptap validated sends, retry replacement, mode/empty/disabled/edit guards, reversible marked-block hiding, preserved nodes, Russian/theme changes, and restricted IPC.');
})().then(()=>finish(0),async error=>{console.error('Failed stage:',stage,error);await finish(1)});
async function finish(code){clearTimeout(timer);for(const window of BrowserWindow.getAllWindows())window.destroy();await host?.shutdown();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});app.exit(code)}
