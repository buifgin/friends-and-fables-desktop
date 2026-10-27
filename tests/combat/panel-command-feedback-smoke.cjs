// Native execution belongs to the coordinator. --syntax imports no Electron.
// Pending topology copied from combat-corrections-smoke.cjs; real Tiptap recipe
// from message-commands-smoke.cjs. No production source is rewritten by this fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fixtureRoot = path.join(__dirname, '..', '..');
const root = process.env.FABLES_TEST_APP_ROOT || fixtureRoot;
const route = '/11111111-1111-4111-8111-111111111111/play';
const definitions = { corrections: ['combat/combat-corrections', 'configureCombatCorrections'], commands: ['commands/message-commands', 'configureMessageCommands'], website: ['shell/website-settings', 'configureWebsiteSettings'] };
function sourceModules() {
  const cache = new Map();
  const load = name => {
    if (cache.has(name)) return cache.get(name);
    const code = require('esbuild').transformSync(fs.readFileSync(path.join(fixtureRoot, 'src', name + '.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' }).code;
    new Function(code);
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, dependency => {
      assert.ok(dependency.startsWith('.'), 'Only pure relative source dependencies are allowed.');
      return load(path.posix.join(path.posix.dirname(name), dependency));
    });
    cache.set(name, module.exports); return module.exports;
  };
  return load;
}
const editorScript = require('esbuild').buildSync({ stdin: { contents: `
import {Editor} from '@tiptap/core'; import StarterKit from '@tiptap/starter-kit';
window.sent=[];
window.editor=new Editor({element:document.getElementById('editor-content'),extensions:[StarterKit.configure({heading:false,blockquote:false,bulletList:false,orderedList:false})],content:'<p>/me preserved draft selection</p>'});
document.getElementById('send').addEventListener('click',()=>sent.push(editor.getHTML()));
`, resolveDir: fixtureRoot }, bundle: true, write: false, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:8px;font:14px Arial;background:#222;color:white}section{width:330px}button{font:inherit}header,header div.flex{display:flex;align-items:center;gap:8px}header{min-height:48px}header button{width:40px;height:40px}#composer{width:600px;border:1px solid gray}.tiptap{min-height:50px}textarea{display:block}#pending-list{height:220px!important}
</style><header><div class="flex flex-row items-center"><div class="hidden md:flex items-center gap-2"><button type="button"><svg class="lucide-panel-left"></svg></button><button type="button"><svg class="lucide-image"></svg></button></div><div><button type="button"><svg class="lucide-user-plus"></svg></button><div class="ml-1 flex flex-row space-x-1">Avatar</div></div></div></header>
<div class="grid relative"><div class="flex flex-col bg-gray-800/80 relative" id="composer"><button type="button" aria-label="More actions">Actions</button><div id="editor-content"></div><button type="button" id="send" aria-label="Send message">Send</button></div></div>
<section data-ff-combat-docked></section><script>
window.pendingMounts=0;window.pendingCharacterOverride={};window.pendingWeaponOverride={};window.pendingSpellOverride={};window.pendingBlocked=false;
window.mountPending=()=>{
 window.pendingMounts++;
 const dock=document.querySelector('section');dock.innerHTML='<form id="pending-form"><div id="pending-list" style="height:180px;overflow:auto"></div><textarea name="message">pending message</textarea><button type="submit">Submit Actions</button></form>';
 const form=dock.querySelector('form'),list=document.querySelector('#pending-list');
 window.pendingValues={attacks:[{name:'Vicious Weapon',image:'weapon.webp',type:'melee',requires_attack_roll:true,attack_roll_type:'normal',modifier_stat:'strength',modifier_value:0,proficiency_bonus:0,description:'weapon description',targets:[{id:1,name:'Wolf',ac:12}],damage_rolls:[{dice_count:1,dice_size:8,fixed_damage_bonus:0}]},{name:'Spell Attack',image:'spell.webp',type:'spell',requires_attack_roll:true,attack_roll_type:'normal',modifier_stat:'intelligence',modifier_value:2,proficiency_bonus:3,spell_id:'spell-catalog-1',targets:[{id:2}],damage_rolls:[]},{name:'Save spell',type:'spell',requires_attack_roll:false,targets:[],damage_rolls:[]}],message:'pending message'};
 Object.assign(pendingValues.attacks[0],pendingWeaponOverride);Object.assign(pendingValues.attacks[1],pendingSpellOverride);
 window.pendingWrites=[];window.pendingSubmits=0;window.pendingControl={};window.pendingDirty={};
 window.pendingMethods={control:pendingControl,getFieldState(name){return {isDirty:!!pendingDirty[name],isTouched:false}},getValues(name){return name?name.split('.').reduce((v,k)=>v?.[k],pendingValues):pendingValues},setValue(name,value,options){pendingWrites.push({name,value,options});if(options.shouldDirty)pendingDirty[name]=true;const keys=name.split('.'),leaf=keys.pop();keys.reduce((v,k)=>v[k],pendingValues)[leaf]=value}};
 const provider={memoizedProps:pendingMethods,return:null};
 window.pendingCards=[];
 pendingValues.attacks.forEach((attack,index)=>{
  const wrapper=document.createElement('div'),card=document.createElement('div'),target=document.createElement('button');card.className='rounded-lg border bg-card clickable';card.textContent=attack.name;target.type='button';target.setAttribute('role','checkbox');target.setAttribute('aria-checked','true');target.textContent='Wolf';wrapper.append(card,target);list.append(wrapper);
  const fieldAttack={...attack,id:'native-field-'+pendingMounts+'-'+index};
  const props={attack:fieldAttack,usersCharacter:{id:83026155,two_handed:{id:566,name:'Vicious Weapon',image:'weapon.webp'},right_hand:{id:571,name:'Longbow',image:'bow.webp'},inventory:[{item:{id:566,name:'Vicious Weapon'}}],spells:[{spell:{id:'spell-catalog-1',name:'Spell Attack',image:'spell.webp'}}],strength:10,dexterity:14,constitution:12,intelligence:14,wisdom:10,charisma:8,adjusted_stats:{dexterity:{adjusted:16}},...pendingCharacterOverride},showDropdown:true,onClick(){throw Error('Full editor must not open')},onEdit(){throw Error('Field array must not update')}};
  const wrapperFiber={key:fieldAttack.id,memoizedProps:{children:[{props},{props:{control:pendingControl,name:'attacks.'+index+'.targets'}}]},return:{memoizedProps:{},return:provider}};
  card.__reactFiber$fixture={memoizedProps:{className:card.className},return:{memoizedProps:props,return:wrapperFiber}};
  pendingCards.push({card,target,wrapper,fieldAttack});
 });
 form.querySelector('button[type=submit]').disabled=pendingBlocked;
 window.pendingNative={form,message:form.querySelector('textarea'),list,cards:pendingCards.slice()};form.addEventListener('submit',event=>{event.preventDefault();pendingSubmits++});
};
mountPending();
window.nativeCardText=pendingCards.map(item=>item.card.firstChild);
window.nativeSubmit=pendingNative.form.querySelector('button[type=submit]');
window.payload=JSON.stringify(pendingValues.attacks.map(({targets,damage_rolls,description})=>({targets,damage_rolls,description})));
</script><script src="/editor.js"></script>`;
function programs(load) {
  const features = Object.fromEntries(Object.entries(definitions).map(([key, [file, name]]) => [key, load(file)[name]]));
  const commands = load('commands/message-commands');
  const call = (key, enabled = true, locale = 'en') => `(${features[key].toString()})(${enabled},${JSON.stringify(locale)}${key === 'commands' ? ',(' + commands.formatMessageCommand.toString() + ')' : key === 'website' ? ',{token:"fixture-token",state:{paused:true,available:true,next:true,volume:0.5}}' : ''})`;
  return {features, call, updateMusic: load('shell/website-settings').updateWebsiteMusicState};
}
function installProbe(phase) {
  const started=performance.now(), maxRecords=12000, maxDeliveries=2000;
  const result={phase,elapsedMs:0,records:0,deliveries:0,capReached:false,owners:{corrections:{childList:0,attributes:0,sameAttributes:0},commands:{childList:0,attributes:0,sameAttributes:0},music:{childList:0,attributes:0,sameAttributes:0}},trace:[]};
  const owner=node=>{const element=node instanceof Element?node:node.parentElement;return element?.closest('[data-ff-pending-corrections]')?'corrections':element?.closest('[data-ff-desktop-command-controls]')?'commands':element?.closest('[data-ff-desktop-music-group]')?'music':null};
  const receive=records=>{
    if(result.capReached)return;
    result.deliveries++;
    const bounded=records.slice(0,maxRecords-result.records), next=new WeakMap(), writes=new Map();
    for(let i=bounded.length-1;i>=0;i--){const record=bounded[i];if(record.type!=='attributes')continue;let values=next.get(record.target);if(!values){values=new Map();next.set(record.target,values)}const value=values.has(record.attributeName)?values.get(record.attributeName):record.target.getAttribute(record.attributeName);values.set(record.attributeName,record.oldValue);writes.set(record,{value,same:record.oldValue===value})}
    for(const record of bounded){result.records++;const group=owner(record.target);if(!group)continue;const bucket=result.owners[group];if(record.type==='childList')bucket.childList++;else if(record.type==='attributes'){bucket.attributes++;if(writes.get(record).same)bucket.sameAttributes++}if(result.trace.length<100)result.trace.push({ms:+(performance.now()-started).toFixed(2),owner:group,type:record.type,target:record.target.nodeName,attribute:record.attributeName,old:record.oldValue,...writes.get(record),added:record.addedNodes.length,removed:record.removedNodes.length})}
    if(result.records>=maxRecords||result.deliveries>=maxDeliveries){result.capReached=true;observer.disconnect()}
  };
  const observer=new MutationObserver(receive);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['hidden','aria-label','title','disabled','aria-hidden','data-ff-pending-corrections']});
  window.feedbackProbe={stop(){receive(observer.takeRecords());observer.disconnect();result.elapsedMs=+(performance.now()-started).toFixed(2);return result}};
}
function snapshot() {
  const selection=getSelection();
  return {identity:pendingNative.form===document.querySelector('#pending-form')&&pendingNative.message===document.querySelector('textarea')&&nativeSubmit===pendingNative.form.querySelector('button[type=submit]')&&pendingCards.every((item,i)=>item.card.isConnected&&item.card.firstChild===nativeCardText[i])&&editor.view.dom===document.querySelector('.tiptap')&&window.editorParagraph===editor.view.dom.firstChild&&window.editorText===editor.view.dom.firstChild.firstChild,
    html:editor.getHTML(),selection:selection.anchorNode===editorText&&selection.focusNode===editorText&&selection.anchorOffset===2&&selection.focusOffset===11,
    message:pendingNative.message.value,payload:JSON.stringify(pendingValues.attacks.map(({targets,damage_rolls,description})=>({targets,damage_rolls,description}))),submits:pendingSubmits,sent:sent.length,writes:pendingWrites.length,scroll:pendingNative.list.scrollTop};
}
function selectionProgram(){window.editorParagraph=editor.view.dom.firstChild;window.editorText=editorParagraph.firstChild;const range=document.createRange();range.setStart(editorText,2);range.setEnd(editorText,11);getSelection().removeAllRanges();getSelection().addRange(range)}
function syntax() {
  const compiled=programs(sourceModules());
  new Function(editorScript);
  for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(match[1]);
  for(const key of Object.keys(definitions))for(const enabled of [true,false])for(const locale of ['en','ru'])new Function(compiled.call(key,enabled,locale));
  new Function('return ('+compiled.updateMusic.toString()+')');
  for(const fn of [installProbe,snapshot,selectionProgram])new Function('return ('+fn.toString()+')');
  const fixture=fs.readFileSync(__filename,'utf8');
  for(const match of fixture.matchAll(/\bjs\(\s*(["'])/g)){const quote=match[1],start=match.index+match[0].length-1;let end=start+1;while(end<fixture.length){if(fixture[end]==='\\'){end+=2;continue}if(fixture[end]===quote)break;end++}assert.ok(end<fixture.length);new Function(new Function('return ('+fixture.slice(start,end+1)+')')())}
  console.log('Panel command feedback embedded, editor bundle and serialized public programs syntax PASS');
}
if(process.argv.includes('--syntax')){syntax();process.exit(0)}
const {app,BrowserWindow,session}=require('electron');
if(!process.env.FABLES_TEST_PROFILE_DIR)throw Error('Use the coordinator private-profile runner.');
app.setPath('userData',process.env.FABLES_TEST_PROFILE_DIR);app.on('window-all-closed',()=>{});
// Load unchanged source exports from this fixture's worker checkout for native too.
// Electron and its environment still come from the coordinator's central runner.
const compiled=programs(sourceModules());
const provenance=Object.fromEntries(Object.entries(compiled.features).map(([name,fn])=>[name,crypto.createHash('sha256').update(fn.toString()).digest('hex')]));
let window,stage='startup';const reports=[];
const emit=reason=>console.log('PANEL_COMMAND_FEEDBACK_JSON='+JSON.stringify({reason,stage,root,fixtureRoot,provenance,reports}));
const deadline=setTimeout(()=>{emit('deadline');window?.destroy();app.exit(1)},40000);
(async()=>{
  await app.whenReady();const site=session.fromPartition('panel-command-feedback-'+process.pid);
  site.protocol.handle('https',request=>new Response(new URL(request.url).pathname==='/editor.js'?editorScript:html,{headers:{'content-type':new URL(request.url).pathname==='/editor.js'?'text/javascript':'text/html; charset=utf-8'}}));
  window=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const js=async source=>{try{return await window.webContents.executeJavaScript(source)}catch(error){throw Error(stage+': '+source.slice(0,180),{cause:error})}};
  const until=async expression=>{for(let i=0;i<100;i++){if(await js(expression))return;await new Promise(resolve=>setTimeout(resolve,20))}throw Error(stage+' timed out: '+expression)};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frames=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const call=(key,enabled=true,locale='en')=>js(compiled.call(key,enabled,locale));
  const weapon='[data-ff-pending-corrections="0"]';
  const click=selector=>js(`document.querySelector(${JSON.stringify(selector)}).click()`);
  for(const scenario of ['corrections','composer','combined','combined-music']){
    stage=scenario+'/setup';console.log('Panel feedback stage:',stage);
    await window.loadURL('https://play.fables.gg'+route);window.show();window.focus();window.webContents.focus();
    await until("!!window.editor&&document.visibilityState==='visible'&&document.hasFocus()");await frames();
    assert.ok(window.isVisible()&&window.isFocused()&&window.webContents.isFocused());
    const corrections=scenario!=='composer',commands=scenario!=='corrections',music=scenario==='combined-music';
    const active=[...(corrections?['corrections']:[]),...(commands?['commands']:[]),...(music?['website']:[])];
    for(const key of active)await call(key);
    if(corrections)await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
    if(commands)await until("document.querySelectorAll('[data-ff-desktop-command-controls]').length===1");
    if(music)await until("!!document.querySelector('[data-ff-desktop-music-launcher]')");
    stage=scenario+'/functional';
    if(corrections){
      await click(weapon+' summary');
      await js("document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-value=modifier_value]').value='4'");
      await click(weapon+' [data-ff-correction-apply-modifier_value]');
      assert.equal(await js('pendingValues.attacks[0].modifier_value'),4);
      assert.equal(await js('pendingCards[0].fieldAttack.modifier_value'),0,'Native field-array snapshot retains authority.');
      await click(weapon+' [data-ff-correction-modifier_value-plus]');assert.equal(await js('pendingValues.attacks[0].modifier_value'),5);
      // The restriction changes and the click occur in the same task, before a scan.
      await js("nativeSubmit.disabled=true;document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-modifier_value-plus]').click()");
      assert.equal(await js('pendingValues.attacks[0].modifier_value'),5,'Action-time authority rejects a newly disabled native form.');
      await until("document.querySelector('[data-ff-pending-corrections] input').disabled");
      await js('nativeSubmit.disabled=false');await until("!document.querySelector('[data-ff-pending-corrections] input').disabled");
      await click(weapon+' [data-ff-correction-modifier_value-plus]');assert.equal(await js('pendingValues.attacks[0].modifier_value'),6);
      assert.equal(await js("pendingWrites.every(write=>/^attacks\\.[01]\\.(modifier_value|proficiency_bonus|modifier_stat)$/.test(write.name)&&write.options.shouldDirty&&write.options.shouldValidate)"),true);
    }
    if(commands){
      await click('[data-ff-desktop-command-controls] button');assert.equal(await js('editor.getHTML()'),'<p><em>preserved draft selection</em></p>');assert.equal(await js('sent.length'),0,'Format does not submit.');
      await js("editor.commands.setContent('<p>/gm Send once.</p>');editor.view.dom.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#send').click()");
      await until('sent.length===1');assert.equal(await js('sent[0]'),'<p>#Send once.#</p>');
      await js("editor.commands.setContent('<p>preserved draft selection</p>');editor.view.dom.dispatchEvent(new Event('input',{bubbles:true}))");
    }
    if(commands)assert.equal(await js("document.querySelector('[data-ff-desktop-command-controls] button').hidden"),true,'Ordinary draft hides Format command.');
    for(const key of active)await call(key,true,'ru');
    if(corrections)assert.equal(await js("document.querySelector('[data-ff-pending-corrections] summary').textContent"),'Поправки к броску');
    if(commands)assert.equal(await js("document.querySelector('[data-ff-desktop-command-controls] button').textContent"),'Оформить команду');
    if(music){assert.equal(await js("document.querySelector('[data-ff-desktop-music-launcher]').title"),'Музыка');
      await js(`(${compiled.updateMusic.toString()})({paused:false,available:true,next:false,volume:0.25})`);
      assert.equal(await js("document.querySelector('[data-ff-music-control=play]').title"),'Пауза');assert.equal(await js("document.querySelector('[data-ff-music-control=next]').disabled"),true);
    }
    for(const key of active)await call(key,true,'en');
    await js("history.pushState({},'', '/home');dispatchEvent(new PopStateEvent('popstate'))");
    await until("!document.querySelector('[data-ff-pending-corrections],[data-ff-desktop-command-controls],[data-ff-desktop-music-group]')");
    await js(`history.pushState({},'',${JSON.stringify(route)});dispatchEvent(new PopStateEvent('popstate'))`);
    if(corrections)await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
    if(commands)await until("!!document.querySelector('[data-ff-desktop-command-controls]')");
    if(music)await until("!!document.querySelector('[data-ff-desktop-music-group]')");
    await js(`(${selectionProgram.toString()})()`);await wait(300);await frames();
    const before=await js(`(${snapshot.toString()})()`);assert.equal(before.identity&&before.selection,true);assert.equal(before.payload,await js('payload'));assert.equal(before.message,'pending message');assert.equal(before.submits,0);
    stage=scenario+'/settled-idle';await js(`(${installProbe.toString()})(${JSON.stringify(scenario)})`);
    await wait(1350);await frames();
    const metrics=await js('feedbackProbe.stop()');const after=await js(`(${snapshot.toString()})()`);
    assert.deepEqual(after,before,'Settled idle preserves native identity, payload, drafts, selection, scroll and action counts.');
    assert.ok(metrics.elapsedMs>=1250,'Observe at least two real 500ms correction ticks.');
    const report={scenario,functionalPassed:true,before,metrics};reports.push(report);console.log('PANEL_COMMAND_FEEDBACK_PHASE_JSON='+JSON.stringify(report));
    for(const key of active)await call(key,false);
    await frames();assert.equal(await js("document.querySelectorAll('[data-ff-pending-corrections],[data-ff-desktop-command-controls],[data-ff-desktop-music-group]').length"),0,'Public dispose removes owned UI.');
    assert.deepEqual(await js(`(${snapshot.toString()})()`),before,'Dispose preserves native document and action state.');
    for(const key of active)await call(key);await frames();
    if(corrections)assert.equal(await js("document.querySelectorAll('[data-ff-pending-corrections]').length"),2);
    if(commands)assert.equal(await js("document.querySelectorAll('[data-ff-desktop-command-controls]').length"),1);
    if(music)assert.equal(await js("document.querySelectorAll('[data-ff-desktop-music-group]').length"),1);
    for(const key of active)await call(key,false);
  }
  // All controls and captured native records are emitted before the expected baseline RED.
  stage='final-no-repeat';emit('functional-controls-complete');
  for(const report of reports){assert.equal(report.metrics.capReached,false,report.scenario+' record budget exceeded');for(const [owner,bucket]of Object.entries(report.metrics.owners)){assert.equal(bucket.childList,0,report.scenario+'/'+owner+' repeats unchanged owned childList after adoption');assert.equal(bucket.sameAttributes,0,report.scenario+'/'+owner+' repeats unchanged owned attributes after adoption')}}
  console.log('Panel command feedback native PASS');clearTimeout(deadline);window.destroy();app.exit(0);
})().catch(error=>{console.error('Panel feedback failure at',stage,error);emit('failure');clearTimeout(deadline);window?.destroy();app.exit(1)});
