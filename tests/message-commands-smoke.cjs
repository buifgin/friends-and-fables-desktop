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
document.getElementById('editor-content').__reactFiber$fixture={memoizedProps:{editor:window.editor}};
window.formEditor=new Editor({element:document.getElementById('form-content'),extensions,content:'<p>Character notes</p>'});
document.getElementById('form-content').__reactFiber$fixture={memoizedProps:{editor:window.formEditor}};
window.contextEditor=new Editor({element:document.getElementById('context-content'),extensions,content:'<p>Context notes</p>'});
document.getElementById('context-content').__reactFiber$fixture={memoizedProps:{editor:window.contextEditor}};
document.getElementById('editor-content').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sent.push(window.draftHTML)}},true);
document.getElementById('send').addEventListener('click',()=>window.sent.push(window.draftHTML));
`,resolveDir:path.join(__dirname,'..')},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
const html=`<!doctype html><html><meta charset="utf-8"><body><div class="grid relative" id="composer">
<div id="working-context-bar-spacer"></div><div id="editor-content"></div><button id="send" aria-label="Send message">Send</button>
<div class="bottom-full"><div id="context-content"></div></div></div>
<form><div class="grid relative"><div id="form-content"></div></div><input value="Untouched field"></form>
<script src="/editor.js"></script></body></html>`;
(async()=>{
 profile=process.env.FABLES_TEST_PROFILE_DIR||await mkdtemp(path.join(os.tmpdir(),'fables-commands-test-'));app.setPath('userData',profile);await app.whenReady();
 const manager=new AppearanceManager();await manager.initialize();
 const site=session.fromPartition('commands-test');site.protocol.handle('https',request=>new Response(new URL(request.url).pathname==='/editor.js'?script:html,{headers:{'Content-Type':new URL(request.url).pathname==='/editor.js'?'text/javascript':'text/html'}}));
 window=new BrowserWindow({show:false,width:1100,height:820,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const contents=window.webContents;manager.attach(contents);
 const js=source=>contents.executeJavaScript(source);
 const until=async source=>{for(let i=0;i<200;i++){if(await js(source))return;await sleep(25);}throw Error('Timed out: '+source)};
 const draft=async value=>{await js(`editor.commands.setContent(${JSON.stringify(value)});editor.view.dom.dispatchEvent(new Event('input',{bubbles:true}))`);await sleep(30)};
 const enter=async(shift=false)=>{await js(`editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',shiftKey:${shift},bubbles:true,cancelable:true}));editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))`);await sleep(30)};
 await contents.loadURL('https://play.fables.gg/sample/play');await until('!!window.editor');
 assert.equal(await js('typeof window.require'),'undefined');
 await manager.save({...manager.getSettings(),messageCommands:true,preset:'amoled'});
 await until("document.querySelector('[data-ff-desktop-command-controls]')!==null");
 assert.equal(await js("document.querySelectorAll('[data-ff-desktop-command-controls]').length"),1,'Only the main composer receives commands.');
 await draft('<p>/me <strong>I greet </strong><span data-mention-id="aria" data-mention-label="Aria" data-mention-type="character">@Aria</span> at <a href="https://example.com/room">the room</a>.</p><pre><code>literal code</code></pre>');
 const mentionBefore=await js("editor.getJSON().content[0].content.find(node=>node.type==='mention')");
 assert.equal(mentionBefore.attrs.id,'aria');assert.equal(mentionBefore.attrs.label,'Aria');assert.equal(mentionBefore.attrs.entityType,'character');
 await enter();assert.equal(await js('sent.length'),0,'The first Enter formats without sending.');
 assert.match(await js('editor.getHTML()'),/<em>/);assert(!/\/me/.test(await js('editor.getHTML()')));
 assert.deepEqual(await js("editor.getJSON().content[0].content.find(node=>node.type==='mention')"),mentionBefore);
 assert.match(await js('editor.getHTML()'),/href="https:\/\/example.com\/room"/);assert.match(await js('editor.getHTML()'),/<pre><code>literal code<\/code><\/pre>/);
 await enter();assert.equal(await js('sent.length'),1);assert.match(await js('sent[0]'),/<em>/);
 await draft('<p>/gm Keep the party together.</p>');await js("document.getElementById('send').click()");await sleep(30);
 assert.equal(await js('sent.length'),1,'The first Send click also prepares the draft.');
 assert.equal(await js('editor.getText()'),'#Keep the party together.#');
 await js("document.getElementById('send').click()");assert.equal(await js('sent.length'),2);assert.match(await js('sent[1]'),/#Keep the party together\.#/);
 await draft('<p>/me &lt;img src=x onerror="window.injected=true"&gt; Привет, Mira.</p>');await enter();
 assert.equal(await js('window.injected'),undefined);assert.equal(await js("editor.view.dom.querySelector('img')"),null);
 assert.match(await js('editor.getText()'),/<img src=x/);assert.match(await js('editor.getText()'),/Привет, Mira/);
 await draft('<p>/me </p>');const emptyBefore=await js('editor.getHTML()');await enter();assert.equal(await js('editor.getHTML()'),emptyBefore);assert.equal(await js('sent.length'),2);
 await until("document.querySelector('[data-ff-desktop-command-controls] [role=status]').textContent==='Add text after the command.'");
 await draft('<p>/gm A multiline note.</p><p>Second line.</p>');await enter();assert.equal(await js('editor.getText()'),'#A multiline note.\n\nSecond line.#');
 await draft('<p>/gm Control Enter.</p>');await js("editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))");
 assert.equal(await js('editor.getText()'),'#Control Enter.#');assert.equal(await js('sent.length'),2);
 await draft('<p>/me Hold Enter.</p>');
 await js("editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}))");
 assert.equal(await js('sent.length'),2,'Holding Enter must not send the newly prepared draft.');
 await js("editor.view.dom.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))");
 manager.setLocale('ru');await until("document.querySelector('[data-ff-desktop-command-controls] [role=status]').textContent==='Текст оформлен. Проверьте его и отправьте обычным способом.'");
 await draft('<p>/me Keep the newline.</p>');await enter(true);assert.match(await js('editor.getHTML()'),/\/me Keep the newline\.<br>/);assert(!/<em>/.test(await js('editor.getHTML()')));
 await js("document.querySelector('[data-ff-desktop-command-controls] button').click()");assert.match(await js('editor.getHTML()'),/<em>/);assert.equal(await js('sent.length'),2);
 await draft('<p>/other An ordinary command.</p>');await enter();assert.equal(await js('sent.length'),3);assert.match(await js('sent[2]'),/\/other/);
 await draft('<p>Ordinary <strong>formatted</strong> text.</p>');const normalBefore=await js('editor.getHTML()');await enter();assert.equal(await js('editor.getHTML()'),normalBefore);assert.equal(await js('sent.length'),4);
 assert.equal(await js('formEditor.getText()'),'Character notes');assert.equal(await js('contextEditor.getText()'),'Context notes');assert.equal(await js("document.querySelector('input').value"),'Untouched field');
 await draft('<p>/me Disabled command.</p>');await manager.save({...manager.getSettings(),messageCommands:false});await enter();assert.equal(await js('sent.length'),5);assert.match(await js('editor.getHTML()'),/\/me/);assert.equal(await js("document.querySelector('[data-ff-desktop-command-controls]')"),null);
 await manager.save({...manager.getSettings(),messageCommands:true});await js("history.pushState(null,'','/');dispatchEvent(new PopStateEvent('popstate'))");await until("document.querySelector('[data-ff-desktop-command-controls]')===null");
 console.log('PASS: real Tiptap command formatting, mentions/links/code/literal text, send review, key repeats, empty drafts, localization, ordinary inputs, editor exclusions, disable, and navigation.');
})().then(async()=>{clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(0)}).catch(async error=>{console.error(error);clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(1)});
