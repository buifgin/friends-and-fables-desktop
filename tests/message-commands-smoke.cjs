const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const {mkdtemp,rm}=require('node:fs/promises');
const {app,BrowserWindow,session}=require('electron');
const appRoot=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'..');
const {AppearanceManager,registerAppearanceScheme}=require(path.join(appRoot,'dist/appearance'));
registerAppearanceScheme();app.on('window-all-closed',()=>{});
let profile,window;
const timer=setTimeout(()=>{console.error('Message commands test timed out.');app.exit(1)},40000);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const script=require('esbuild').buildSync({stdin:{contents:`
import {Editor,Node} from '@tiptap/core';import StarterKit from '@tiptap/starter-kit';
const Mention=Node.create({name:'mention',group:'inline',inline:true,atom:true,
 addAttributes(){return {id:{default:null,parseHTML:e=>e.getAttribute('data-mention-id')},label:{default:null,parseHTML:e=>e.getAttribute('data-mention-label')},entityType:{default:null,parseHTML:e=>e.getAttribute('data-mention-type')}}},
 parseHTML(){return [{tag:'span[data-mention-id]'}]},
 renderHTML({node}){return ['span',{'data-mention-id':node.attrs.id,'data-mention-label':node.attrs.label,'data-mention-type':node.attrs.entityType},'@'+node.attrs.label]}});
window.sent=[];window.draftHTML='';
const extensions=[StarterKit.configure({heading:false,blockquote:false,bulletList:false,orderedList:false}),Mention];
window.editor=new Editor({element:document.getElementById('editor-content'),extensions,content:'<p></p>',
 onUpdate({editor}){const html=editor.getHTML();setTimeout(()=>window.draftHTML=html,0)}});
window.formEditor=new Editor({element:document.getElementById('form-content'),extensions,content:'<p>Character notes</p>'});
window.contextEditor=new Editor({element:document.getElementById('context-content'),extensions,content:'<p>Context notes</p>'});
document.getElementById('editor-content').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sent.push(window.draftHTML)}},true);
document.getElementById('send').addEventListener('click',()=>window.sent.push(window.draftHTML));
`,resolveDir:path.join(__dirname,'..')},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
const html=`<!doctype html><html><meta charset="utf-8"><body><div class="grid relative"><div class="flex flex-col bg-gray-800/80 relative" id="composer">
<button aria-label="More actions">Actions</button><div id="editor-content"></div><button id="send" aria-label="Send message">Send</button>
<div class="bottom-full"><div id="context-content"></div></div></div>
</div><form><div class="grid relative"><div id="form-content"></div></div><input value="Untouched field"></form>
<script src="/editor.js"></script></body></html>`;
(async()=>{
 profile=process.env.FABLES_TEST_PROFILE_DIR||await mkdtemp(path.join(os.tmpdir(),'fables-commands-test-'));app.setPath('userData',profile);await app.whenReady();
 const manager=new AppearanceManager();await manager.initialize();
 const site=session.fromPartition('commands-test');site.protocol.handle('https',request=>new Response(new URL(request.url).pathname==='/editor.js'?script:html,{headers:{'Content-Type':new URL(request.url).pathname==='/editor.js'?'text/javascript':'text/html'}}));
 window=new BrowserWindow({show:false,width:1100,height:820,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const contents=window.webContents;manager.attach(contents);
 const js=source=>contents.executeJavaScript(source);
 const until=async source=>{for(let i=0;i<200;i++){if(await js(source))return;await sleep(25);}console.error(await js("({sent:sent.length, draft:draftHTML,html:editor.getHTML(),status:document.querySelector('[data-ff-desktop-command-controls]')?.textContent})"));throw Error('Timed out: '+source)};
 const draft=async(value,position)=>{await js(`editor.commands.setContent(${JSON.stringify(value)});editor.commands.setTextSelection(${position??'editor.state.doc.firstChild.nodeSize-1'});editor.view.dom.dispatchEvent(new Event('input',{bubbles:true}))`);await sleep(30)};
 const enter=async(shift=false)=>{await js(`editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',shiftKey:${shift},bubbles:true,cancelable:true}));editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))`);await sleep(30)};
 await contents.loadURL('https://play.fables.gg/sample/play');await until('!!window.editor');
 assert.equal(await js('typeof window.require'),'undefined');
 await manager.save({...manager.getSettings(),messageCommands:true,preset:'amoled'});
 await until("document.querySelector('[data-ff-desktop-command-controls]')!==null");
 assert.equal(await js("document.querySelectorAll('[data-ff-desktop-command-controls]').length"),1,'Only the main composer receives commands.');
 const sent=()=>js('sent.length');
 const sendCount=async count=>until(`sent.length===${count}`);
 await draft('<p>/me <strong>I greet </strong><span data-mention-id="aria" data-mention-label="Aria" data-mention-type="character">@Aria</span> at <a href="https://example.com/room">the room</a>.</p><pre><code>literal № code</code></pre>');
 const mentionBefore=await js("editor.getJSON().content[0].content.find(node=>node.type==='mention')");
 await enter();await sendCount(1);
 assert.match(await js('sent[0]'),/<em>/);assert(!/\/me/.test(await js('sent[0]')));
 assert.deepEqual(await js("editor.getJSON().content[0].content.find(node=>node.type==='mention')"),mentionBefore);
 assert.match(await js('sent[0]'),/href="https:\/\/example.com\/room"/);assert.match(await js('sent[0]'),/<pre><code>literal № code<\/code><\/pre>/);
 assert.equal(await js('sent[0]===editor.getHTML()'),true,'Send receives the committed, formatted draft.');
 await draft('<p>/gm Keep the party together.</p>');await js("document.getElementById('send').click();document.getElementById('send').click()");await sendCount(2);
 assert.equal(await js('sent[1]'),'<p>#Keep the party together.#</p>','Send prepares and submits once.');
 await draft('<p>/me &lt;img src=x onerror="window.injected=true"&gt; Привет, Mira.</p>');await enter();await sendCount(3);
 assert.equal(await js('window.injected'),undefined);assert.equal(await js("editor.view.dom.querySelector('img')"),null);
 assert.match(await js('sent[2]'),/Привет, Mira/);
 await draft('<p>/me </p><p>/gm Complete note.</p>');await enter();await sleep(80);assert.equal(await sent(),3,'An empty command on any line blocks the entire submission.');
 await until("document.querySelector('[data-ff-desktop-command-controls] [role=status]').textContent==='Add text after the command.'");
 await draft('<p>Ordinary №1.</p><p>/me First action.<br>/gm Later note.</p>');await enter();await sendCount(4);
 assert.equal(await js('sent[3]'),'<p>Ordinary #1.</p><p><em>First action.</em><br>#Later note.#</p>','Every command line and number sign is formatted before a single Enter submits.');
 await draft('<p>/gm Control Enter.</p>');await js("editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))");await sendCount(5);
 await draft('<p>/me A soft action.</p>');await enter(true);
 assert.equal(await js('editor.getHTML()'),'<p><em>A soft action.</em><br></p>');assert.equal(await sent(),5);
 await js("editor.commands.insertContent('Plain after.');editor.view.dom.dispatchEvent(new Event('input',{bubbles:true}))");
 assert.equal(await js('editor.getHTML()'),'<p><em>A soft action.</em><br>Plain after.</p>','Soft breaks have no paragraph margins or inherited italics.');
 await draft('<p>/me First action.<br>Plain next line.<br>/gm Later note.</p>',8);await enter(true);
 assert.equal(await js('editor.getHTML()'),'<p><em>First action.</em><br>Plain next line.<br>/gm Later note.</p>','Reuse an existing soft break.');
 await js("document.querySelector('[data-ff-desktop-command-controls] button').click()");
 assert.equal(await js('editor.getHTML()'),'<p><em>First action.</em><br>Plain next line.<br>#Later note.#</p>');assert.equal(await sent(),5,'The explicit format button allows review without sending.');
 assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-desktop-command-controls]')).justifyContent"),'center');
 await draft('<p><strong>/m</strong>e Marked prefix.</p><p>/gm Independent note.</p>');
 await js("for(let i=0;i<5;i++)editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:i>0,bubbles:true,cancelable:true}));editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))");await sendCount(6);await sleep(80);assert.equal(await sent(),6,'Holding Enter sends at most once.');
 assert.equal(await js('sent[5]'),'<p><em>Marked prefix.</em></p><p>#Independent note.#</p>');
 await draft('<p>/gm Before pending edit.</p>');await js("editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));editor.commands.insertContent('Changed while pending.');editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))");await sleep(100);assert.equal(await sent(),6,'Editing a queued draft cancels its submission.');
 await draft('<p>Ordinary <strong>formatted</strong> text.</p>');const normalBefore=await js('editor.getHTML()');await enter();await sendCount(7);assert.equal(await js('sent[6]'),normalBefore);
 await draft('<p>   </p>');await enter();await sleep(80);assert.equal(await sent(),7,'Whitespace-only drafts never send.');
 assert.equal(await js('formEditor.getText()'),'Character notes');assert.equal(await js('contextEditor.getText()'),'Context notes');assert.equal(await js("document.querySelector('input').value"),'Untouched field');
 await draft('<p>/gm Проверка Enter.</p>');await enter();await sendCount(8);
 assert.equal(await js('sent[7]'),'<p>#Проверка Enter.#</p>','Plain Enter formats /gm before the native Send handler.');
 await draft('<p>/me Disabled command.</p>');await manager.save({...manager.getSettings(),messageCommands:false});await enter();await sendCount(9);assert.match(await js('editor.getHTML()'),/\/me/);assert.equal(await js("document.querySelector('[data-ff-desktop-command-controls]')"),null);
 // Chromium keyboard input exercises the real native key path as well as DOM fixtures.
 await manager.save({...manager.getSettings(),messageCommands:true});
 await draft('<p></p>');await js('editor.view.dom.focus()');
 contents.debugger.attach('1.3');
 try{await contents.debugger.sendCommand('Input.insertText',{text:'/gm Native keyboard in combat.'});await sleep(35);
 await js("{const button=document.createElement('button');button.id='combat-action';button.innerHTML='<svg class=\"lucide-swords\"></svg>';document.getElementById('composer').append(button)}");
 await contents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
 await contents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
 }finally{contents.debugger.detach();}
 await sendCount(10);assert.equal(await js('sent[9]'),'<p>#Native keyboard in combat.#</p>');
 await sleep(40);assert.equal(await sent(),10,'One native Enter triggers one Send click.');
 await manager.save({...manager.getSettings(),messageCommands:true});await js("history.pushState(null,'','/');dispatchEvent(new PopStateEvent('popstate'))");await until("document.querySelector('[data-ff-desktop-command-controls]')===null");
 console.log('PASS: real Tiptap whole-draft preparation and validated submission after state commit, № conversion, soft breaks, split prefixes, mentions/links/code, review button, held Enter, duplicate clicks, pending edits, empty commands, editor exclusions, disable, and navigation.');
})().then(async()=>{clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(0)}).catch(async error=>{console.error(error);clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(1)});
