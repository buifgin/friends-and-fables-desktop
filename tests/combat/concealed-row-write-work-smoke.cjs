// Coordinator schedules native execution through the private CPU runner.
// Author-time copied native HTML/Fiber/payload and input recipe from
// combat-flow-smoke.cjs (baseline b6fed05). Do not import that executable fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
function sourceModules() {
  const cache = new Map();
  const load = name => {
    if (cache.has(name)) return cache.get(name);
    const code = require('esbuild').transformSync(fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' }).code;
    new Function(code);
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, dependency => {
      assert.ok(dependency.startsWith('.'), 'Only pure relative source dependencies allowed');
      return load(path.posix.join(path.posix.dirname(name), dependency));
    });
    cache.set(name, module.exports);return module.exports;
  };
  return load;
}
const configureCombatFlow = sourceModules()('combat/combat-flow').configureCombatFlow;
const html = `<!doctype html><meta charset="utf-8"><style>body{background:#222;color:white}section{width:400px}.relative{position:relative}button{padding:12px}label{display:block}fieldset{max-width:380px}.native-grid{display:grid;grid-template-columns:40px 1fr 30px;column-gap:8px}.native-avatar{height:160px}.native-middle{margin-left:16px}.native-actions{height:140px}</style>
<section data-ff-combat-docked data-ff-combat-panel-mode="actions"><form><input value="preserved native draft"><button type="submit" id="submit">Attack</button></form></section><main></main><script>
window.delayDamageIdentity=false;window.damageMountFrames=[];window.delayDamageProps=false;window.presentationFrames=[];window.calls=0;window.submits=0;window.mode='hit';window.holdStreaming=true;window.sequence=100;window.nativeCharacter={id:83026155};window.nativeCampaign={id:'campaign-a',active_encounter_id:412456};
const root={tag:3,stateNode:{}};root.stateNode.current=root;
let result={status:'idle',submittedAt:0};const listeners=new Set();
// Keep bounded fixture-owned evidence; do not expose or alter the adapter's state.
const trace=[];const record=(kind,detail={})=>{trace.push({kind,at:Date.now(),...detail});if(trace.length>16)trace.shift()};
for(const type of ['mousedown','mouseup','click','submit'])document.addEventListener(type,event=>record(type,{trusted:event.isTrusted,target:event.target.id||event.target.tagName}),true);
window.flowFixtureState=()=>({calls,submits,mode,sequence,result,subscriptions:listeners.size,trace,choice:window.currentChoice,choices:window.currentDM?.rollChoices,visibility:document.visibilityState,focused:document.hasFocus(),activeElement:document.activeElement?.id||document.activeElement?.tagName,controller:!!window.__friendsFablesDesktopCombatFlow,preferences:window.__friendsFablesDesktopCombatFlow?.getPreferences(),claims:[...(window.__friendsFablesDesktopCombatFlowClaims||[])],outcomes:[...(window.__friendsFablesDesktopCombatFlowOutcomes||new Map())]});
const observer={options:{mutationFn:function nativeGM({lastEventId}){return ['ENCOUNTER_GM_RESPONSE','GM_RESPONSE',lastEventId]}},getCurrentResult(){return result},subscribe(fn){listeners.add(fn);record('subscribe');return ()=>{record('unsubscribe');listeners.delete(fn)}}};
const form=document.querySelector('form');const owner={type:function NativeExecuteActions(){const sendAttackRoll=null;return sendAttackRoll},memoizedProps:{campaignId:'campaign-a',encounterId:412456,isUsersCharacterTurn:true,isMultiplayerCampaign:true},memoizedState:{memoizedState:{data:{usersCharacter:nativeCharacter}},next:{memoizedState:observer}},return:root};
const provider={memoizedProps:{control:{},getValues(){return [{type:'spell',requires_attack_roll:mode!=='text',modifier_value:8,proficiency_bonus:8,targets:[{id:2217533,ac:10}]}]}},return:owner};
const formFiber={memoizedProps:{},return:provider};form.__reactFiber$fixture=formFiber;provider.child=formFiber;owner.child=provider;root.child=owner;
window.mountRows=(request,attackId)=>{
 root.memoizedProps={};
 const dmId=attackId+1;const choice={id:attackId+2,event_id:dmId,character_id:83026155,type:'Damage',accepted:null,dice_expression:mode==='crit'?'2d10+3':'1d10',fixed_bonus:3};
 const attack={id:attackId,role:'player',request_id:request,campaign_id:'campaign-a',character_id:83026155,command_used:'roll_attack',events_roll:{roll_type:'Spell Attack',dc:10,total_roll:mode==='miss'?9:24,modifier_value:8,proficiency_bonus:8}};
 const dm={id:dmId,role:'dm',request_id:request,campaign_id:'campaign-a',command_used:'encounter_player_turn_action_response',processed:false,rollChoices:['miss','no-damage'].includes(mode)?[]:[choice]};
 window.currentDM=dm;window.currentChoice=choice;document.querySelector('main').innerHTML='<div id="event-container-undefined"><div id="event-message-card-'+attackId+'"><div class="relative rounded-2xl border-2 overflow-hidden">Attack result</div></div></div><div class="native-grid" id="event-container-'+dmId+'"><div id="native-avatar" class="native-avatar"><button>Franz audio</button></div><div id="native-middle" class="native-middle"><div id="event-message-card-'+dmId+'">Intermediate narration</div><div id="damage-prompt"><span>Damage</span><button type="button" id="damage">Roll Damage</button></div></div><div id="native-actions" class="native-actions"><button>Feedback</button></div></div><div id="native-damage-wrapper"><div data-native-damage-result id="actual-damage-result">Damage total: 12</div></div><div id="final-reply">Final Franz reply</div>';
 const rows=document.querySelector('main').children;const attackFiber={memoizedProps:{event:attack,campaign:nativeCampaign},return:root};const dmFiber={memoizedProps:{event:dm,campaign:nativeCampaign},return:root};owner.sibling=attackFiber;attackFiber.sibling=dmFiber;
 rows[0].__reactFiber$fixture=attackFiber;
 const attackCard=document.getElementById('event-message-card-'+attackId),attackPanel=attackCard.firstElementChild,attackCardOwner={type:function NativeNarrativeCard(){return 'event-message-card-'},memoizedProps:{eventId:attackId},return:attackFiber},attackCardHost={tag:5,type:'div',stateNode:attackCard,memoizedProps:{},return:attackCardOwner},attackPanelHost={tag:5,type:'div',stateNode:attackPanel,memoizedProps:{className:attackPanel.className},return:attackCardHost};attackFiber.child=attackCardOwner;attackCardOwner.child=attackCardHost;attackCardHost.child=attackPanelHost;attackCard.__reactFiber$fixture=attackCardHost;attackPanel.__reactFiber$fixture=attackPanelHost;
 const shell={type:function NativeEventShell(){return ['event-container-','grid-cols-[40px_1fr_30px]','avatarVariant','showFeedbackButtons']},memoizedProps:{event:dm},return:dmFiber};dmFiber.child=shell;
 const rowHost={tag:5,type:'div',stateNode:rows[1],memoizedProps:{},return:shell};shell.child=rowHost;rows[1].__reactFiber$fixture=rowHost;
 const hostNodes=[...rows[1].children],hosts=hostNodes.map(node=>({tag:5,type:'div',stateNode:node,memoizedProps:{},return:rowHost}));
 hosts.forEach((host,index)=>{hostNodes[index].__reactFiber$fixture=host;if(index<2)host.sibling=hosts[index+1]});rowHost.child=hosts[0];const middleHost=hosts[1];
 const card=rows[1].querySelector('[id^=event-message-card-]'),cardOwner={type:function NativeNarrativeCard(){return 'event-message-card-'},memoizedProps:{eventId:dmId},return:middleHost};const cardFiber={memoizedProps:{},return:cardOwner};cardOwner.child=cardFiber;card.__reactFiber$fixture=cardFiber;middleHost.child=cardOwner;
 const rollListeners=new Set();let nativeRollState={status:'idle',submittedAt:0};const nativeRollObserver={options:{mutationFn:function ee({rollResult,rollChoice,rollCharacter,campaign}){return ['events_choices_rolls','INSERT_EVENT','insertEventIntoQueryData',rollResult,rollChoice,rollCharacter,campaign]}},getCurrentResult(){return nativeRollState},subscribe(fn){rollListeners.add(fn);return()=>rollListeners.delete(fn)}};
 const t5={memoizedState:{memoizedState:nativeRollObserver},memoizedProps:{rollChoice:choice,campaignId:'campaign-a',usersCharacter:nativeCharacter},return:middleHost};cardOwner.sibling=t5;
 const prompt=document.querySelector('#damage-prompt'),promptFiber={tag:5,type:'div',stateNode:prompt,memoizedProps:{},return:t5};prompt.__reactFiber$fixture=promptFiber;t5.child=promptFiber;
 const button=document.querySelector('#damage');const callback=function nativeQuickRoll(event){event.stopPropagation();const dice_expression=choice.dice_expression;calls++;window.lastChoice={...choice,dice_expression};if(mode==='failure')throw Error('Unknown send outcome');const acceptedChoice={...choice,accepted:true,roll_result_id:attackId+3};const rollResult={rollType:'Damage',totalRoll:12,baseRoll:9,baseRollsArray:mode==='crit'?[4,5]:[9],dice:mode==='crit'?[10,10]:[10],modifierStat:'strength',modifierValue:0,proficiencyBonus:0,vantage:'normal'};nativeRollState={status:'pending',submittedAt:Date.now(),data:null,variables:{rollResult,rollChoice:choice,rollCharacter:nativeCharacter,campaign:nativeCampaign}};for(const fn of rollListeners)fn(nativeRollState);window.currentNativeRollState=()=>nativeRollState;const damageEvent={id:attackId+3,role:'player',command_used:'roll',request_id:'native-damage-'+attackId,created_at:new Date().toISOString(),campaign_id:'campaign-a',character_id:nativeCharacter.id,events_roll:{event_id:attackId+3,campaign_id:'campaign-a',roll_type:rollResult.rollType,total_roll:rollResult.totalRoll,base_roll:rollResult.baseRoll,base_rolls_array:rollResult.baseRollsArray,dice:rollResult.dice,modifier_stat:rollResult.modifierStat,modifier_value:rollResult.modifierValue,proficiency_bonus:rollResult.proficiencyBonus,vantage:rollResult.vantage,message:null,dc:null}};
 const resultCard=document.getElementById('actual-damage-result');resultCard.id='event-message-card-'+(attackId+3);document.getElementById('native-damage-wrapper').id='event-'+(attackId+3);resultCard.innerHTML='<div class="relative rounded-2xl border-2 overflow-hidden">Damage total: 12</div>';
 window.publishDamageProps=()=>{Object.assign(choice,acceptedChoice);prompt.innerHTML='<span>Damage</span><span>Rolled</span>';promptFiber.child=undefined;const damageFiber={memoizedProps:{event:damageEvent},return:root},damageHost={tag:5,type:'div',stateNode:resultCard,memoizedProps:{},return:damageFiber};dmFiber.sibling=damageFiber;damageFiber.child=damageHost;resultCard.__reactFiber$fixture=damageHost};
 if(delayDamageIdentity)root.memoizedProps={events:[dm,damageEvent]};else if(delayDamageProps)root.memoizedProps={events:[{...dm,rollChoices:[acceptedChoice]},damageEvent]};else publishDamageProps();window.done=true;
 requestAnimationFrame(()=>damageMountFrames.push({sequence:attackId,progress:!!document.querySelector('[data-ff-combat-damage-progress]'),rowChoiceAccepted:choice.accepted,resultHasFiber:!!resultCard.__reactFiber$fixture,visible:resultCard.getClientRects().length>0}))};
 const buttonFiber={memoizedProps:{onClick:callback,disabled:false},return:promptFiber};button.__reactFiber$fixture=buttonFiber;promptFiber.child=buttonFiber;
 if(mode==='no-damage'){
  const resultWrapper=document.getElementById('native-damage-wrapper'),reply=document.getElementById('final-reply');
  prompt.remove();resultWrapper.remove();reply.remove();cardOwner.sibling=undefined;
  card.textContent='The target is out of reach.';
  window.publishLateDamageChoice=()=>{dm.rollChoices=[choice];cardOwner.sibling=t5;document.querySelector('#native-middle').append(prompt);document.querySelector('main').append(resultWrapper,reply)};
 }

 // Native inline presentation and sole outer event shape; established before
 // the real submit's observer delivery, never used as ownership authority.
 const row=document.querySelector('.native-grid');
 const presentation=window.initialRowPresentation||{value:'',priority:''};
 if(presentation.value)row.style.setProperty('display',presentation.value,presentation.priority);
 row.style.setProperty('border-top-width','7px');
 const outer=document.createElement('div');outer.id='event-'+dmId;
 row.before(outer);outer.append(row);
 if(presentation.value)outer.style.setProperty('display',presentation.value,presentation.priority);
 outer.style.setProperty('border-top-width','9px');
};mountRows('historical',sequence);
window.finishGeneration=()=>{result={...result,status:'success'};record('success');for(const fn of listeners)fn(result);document.querySelector('main').append(document.createElement('span'))};
form.addEventListener('submit',event=>{event.preventDefault();submits++;sequence+=10;const request='local-request-'+sequence;mountRows(request,sequence);result={status:'pending',submittedAt:Date.now(),variables:{requestId:request,lastEventId:sequence,isMultiplayer:true}};record('pending',{subscriptions:listeners.size,submittedAt:result.submittedAt});const frameSequence=sequence;requestAnimationFrame(()=>{if(frameSequence!==sequence)return;presentationFrames.push({sequence:frameSequence,promptVisible:mode==='no-damage'?false:document.querySelector('#damage-prompt').getClientRects().length>0,rowVisible:document.querySelector('.native-grid').getClientRects().length>0,status:document.querySelector('[data-ff-combat-damage-progress]')?.textContent})});for(const fn of listeners)fn(result);if(!holdStreaming)finishGeneration()});
</script>`;
// All renderer programs are serialized and checked by --syntax without Electron.
const P = {
  prepare(presentation) {
    window.initialRowPresentation=presentation;window.holdStreaming=true;window.mode='hit';
    const stimulus=document.createElement('div');stimulus.id='external-stimulus';document.body.append(stimulus);
  },
  ready() {return document.visibilityState==='visible'&&document.hasFocus();},
  point() {const node=document.querySelector('#submit'),rect=node.getBoundingClientRect();return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2),hit:node.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2))};},
  pending() {return submits===1&&result.status==='pending'&&document.querySelector('.native-grid').style.getPropertyValue('display')==='none'&&document.querySelector('.native-grid').parentElement.style.getPropertyValue('display')==='none';},
  frames() {return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Native frame readiness timed out')),2000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));});},
  preferences(patch) {const controller=window.__friendsFablesDesktopCombatFlow;return controller.setPreferences({...controller.getPreferences(),...patch});},
  capture() {
    const row=document.querySelector('.native-grid'),input=document.querySelector('form input');
    input.focus();input.setSelectionRange(2,8);
    window.nativeIdentity={row,outer:row.parentElement,host:row.__reactFiber$fixture,event:currentDM,choice:currentChoice,choices:currentDM.rollChoices,payload:JSON.stringify(currentChoice),form:document.querySelector('form'),input,card:document.getElementById('event-message-card-'+(sequence+1)),avatar:document.getElementById('native-avatar'),actions:document.getElementById('native-actions'),prompt:document.getElementById('damage-prompt'),damage:document.querySelector('[data-native-damage-result]'),reply:document.getElementById('final-reply'),attack:document.getElementById('event-message-card-'+sequence)};
  },
  snapshot() {
    const n=nativeIdentity,style=node=>({value:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display')}),visible=node=>node.isConnected&&node.getClientRects().length>0;
    const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {identity:(!n.row.isConnected||(document.getElementById(n.row.id)===n.row&&n.row.parentElement===n.outer))&&n.row.querySelector('[id^=event-message-card-]')===n.card&&n.row.querySelector('#damage-prompt')===n.prompt&&n.row.__reactFiber$fixture===n.host&&currentDM===n.event&&currentChoice===n.choice&&currentDM.rollChoices===n.choices&&document.querySelector('form')===n.form&&document.querySelector('form input')===n.input,
      connected:n.row.isConnected,payload:JSON.stringify(currentChoice),draft:n.input.value,selection:[n.input.selectionStart,n.input.selectionEnd,n.input.selectionDirection],calls,submits,
      nativeContext:{actor:nativeCharacter.id,campaign:nativeCampaign.id,encounter:nativeCampaign.active_encounter_id,request:currentDM.request_id,event:currentDM.id},
      row:style(n.row),outer:style(n.outer),border:[n.row.style.getPropertyValue('border-top-width'),n.outer.style.getPropertyValue('border-top-width')],
      rowVisible:visible(n.row),outerVisible:visible(n.outer),cardVisible:visible(n.card),promptVisible:visible(n.prompt),avatarVisible:visible(n.avatar),actionsVisible:visible(n.actions),damageVisible:visible(n.damage),replyVisible:visible(n.reply),
      geometry:[rect(n.attack),rect(n.damage),rect(n.reply)],firstFrame:presentationFrames.find(frame=>frame.sequence===sequence),progress:!!document.querySelector('[data-ff-combat-damage-progress]')};
  },
  release(action) {
    const n=nativeIdentity;
    if(action==='hide-narration')window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:true,hideIntermediateFranz:false,hideDamagePrompt:true});
    if(action==='hide-prompt')window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:true,hideIntermediateFranz:true,hideDamagePrompt:false});
    if(action==='auto-off')window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:false,hideIntermediateFranz:false,hideDamagePrompt:false});
    if(action==='route'){history.pushState({},'', '/campaign-b/play');window.dispatchEvent(new PopStateEvent('popstate'));}
    if(action==='dispose')window.__friendsFablesDesktopCombatFlow.dispose();
    if(action==='proof-loss')n.row.remove();
    if(action==='content'){const text=document.createTextNode('New native visible content');n.row.querySelector('#native-middle').append(text);window.newNativeContent=text;}
    if(action==='outcome')n.row.querySelector('#native-middle').append(n.damage);
  },
  removeContent() {newNativeContent.remove();},
  overwrite() {for(const node of [nativeIdentity.row,nativeIdentity.outer])node.style.setProperty('display','inline-flex','important');window.__friendsFablesDesktopCombatFlow.update('en');},
  finish() {finishGeneration();},
  completed() {return calls===1&&done===true&&currentChoice.accepted===true;},
  completedSnapshot() {return {calls,submits,dice:lastChoice.dice_expression,bonus:lastChoice.fixed_bonus,accepted:currentChoice.accepted,status:currentNativeRollState().status,draft:document.querySelector('form input').value,damageVisible:nativeIdentity.damage.getClientRects().length>0,replyVisible:nativeIdentity.reply.getClientRects().length>0};},
  installProbe() {
    let records=[],deliveries=0,capReached=false;
    const receive=batch=>{if(records.length+batch.length>2000){capReached=true;observer.disconnect();}records.push(...batch.slice(0,2000-records.length).map(record=>({target:record.target===nativeIdentity.row?'row':'outer',old:record.oldValue,current:record.target.getAttribute('style')})));};
    const observer=new MutationObserver(receive);
    for(const node of [nativeIdentity.row,nativeIdentity.outer])observer.observe(node,{attributes:true,attributeFilter:['style'],attributeOldValue:true});
    const stimulusObserver=new MutationObserver(batch=>{if(batch.some(record=>record.type==='childList'))deliveries++;});
    stimulusObserver.observe(document.getElementById('external-stimulus'),{childList:true});
    window.rowProbe={take(){receive(observer.takeRecords());const value={records,deliveries,capReached};records=[];deliveries=0;return value;},stop(){observer.disconnect();stimulusObserver.disconnect();}};
  },
  trigger(kind,index) {if(kind==='childList'){const node=document.createElement('span');node.textContent='External native update '+index;document.getElementById('external-stimulus').append(node);}else window.__friendsFablesDesktopCombatFlow.update('en');},
  takeProbe() {return rowProbe.take();},
  cleanup() {window.rowProbe?.stop();window.__friendsFablesDesktopCombatFlow?.dispose();},
  diagnostic() {return window.flowFixtureState?.();}
};
const serialized=(fn,args=[])=>{const source=fn.toString();return `(${source.startsWith('function')?source:'function '+source})(...${JSON.stringify(args)})`;};
new Function(`(${configureCombatFlow.toString()})(true,'en')`);
for(const fn of Object.values(P))new Function(serialized(fn));
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new Function(script);
if(process.argv.includes('--syntax')){
  console.log('Concealed-row source export, HTML and '+Object.keys(P).length+' serialized renderer programs syntax PASS');
}else{
  if(!process.env.FABLES_TEST_PROFILE_DIR)throw Error('Use the central private-profile fixture runner.');
  const {app,BrowserWindow,session}=require('electron');
  app.setPath('userData',process.env.FABLES_TEST_PROFILE_DIR);
  let window,stage='startup';const reports=[];
  const watchdog=setTimeout(()=>{console.error('Concealed-row fixture timed out at '+stage);window?.destroy();app.exit(1);},60000);
  app.on('window-all-closed',()=>{});
  (async()=>{
    await app.whenReady();const site=session.fromPartition('concealed-rows-'+process.pid);
    site.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
    window=new BrowserWindow({show:false,width:1000,height:900,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
    const run=(fn,...args)=>window.webContents.executeJavaScript(serialized(fn,args));
    const frames=()=>run(P.frames);
    const until=async fn=>{for(let attempt=0;attempt<100;attempt++){if(await run(fn))return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Timed out at '+stage+': '+fn.name);};
    const configure=()=>window.webContents.executeJavaScript(`(${configureCombatFlow.toString()})(true,'en')`);
    const start=async(value='',priority='')=>{
      await window.loadURL('https://play.fables.gg/campaign-a/play');window.showInactive();window.focus();window.webContents.focus();await until(P.ready);await frames();
      assert.ok(window.isVisible()&&window.isFocused()&&window.webContents.isFocused(),'Visible focused native input');
      await run(P.prepare,{value,priority});await configure();await run(P.preferences,{automaticDamage:true,hideIntermediateFranz:true,hideDamagePrompt:true});await frames();
      const point=await run(P.point);assert.equal(point.hit,true,'Native submit hit target');
      window.webContents.sendInputEvent({type:'mouseDown',x:point.x,y:point.y,button:'left',clickCount:1});window.webContents.sendInputEvent({type:'mouseUp',x:point.x,y:point.y,button:'left',clickCount:1});
      await until(P.pending);await frames();await run(P.capture);const snapshot=await run(P.snapshot);assertPending(snapshot);return snapshot;
    };
    function assertStable(snapshot,before){
      assert.equal(snapshot.identity,true,'Native nodes/Fibers/event/choice/form remain identical');assert.equal(snapshot.payload,before.payload,'Native choice payload');assert.deepEqual(snapshot.nativeContext,before.nativeContext,'Native request/actor/campaign/encounter proof');
      assert.equal(snapshot.calls,0,'Pending generation never rolls Damage');assert.equal(snapshot.submits,1);assert.equal(snapshot.draft,'preserved native draft');assert.deepEqual(snapshot.selection,[2,8,'forward']);assert.deepEqual(snapshot.border,['7px','9px']);
    }
    function assertPending(snapshot){
      assertStable(snapshot,snapshot);assert.equal(snapshot.connected,true);for(const key of ['row','outer'])assert.deepEqual(snapshot[key],{value:'none',priority:'important'},key+' concealed');
      for(const key of ['rowVisible','outerVisible','cardVisible','promptVisible','avatarVisible','actionsVisible'])assert.equal(snapshot[key],false,key);
      assert.equal(snapshot.damageVisible,true);assert.equal(snapshot.replyVisible,true);assert.equal(snapshot.progress,true);assert.equal(snapshot.firstFrame.rowVisible,false);assert.equal(snapshot.firstFrame.promptVisible,false);
    }
    const priorStyles=[{value:'',priority:''},{value:'grid',priority:''},{value:'flex',priority:'important'},{value:'none',priority:''},{value:'none',priority:'important'}];
    for(const prior of priorStyles)for(const action of ['auto-off','route','dispose']){
      stage='restore/'+JSON.stringify(prior)+'/'+action;const before=await start(prior.value,prior.priority);await run(P.release,action);await frames();const after=await run(P.snapshot);assertStable(after,before);
      assert.deepEqual(after.row,prior,'Exact native row display/priority restoration');assert.deepEqual(after.outer,prior,'Exact native outer display/priority restoration');assert.equal(after.cardVisible,prior.value!=='none');assert.equal(after.promptVisible,prior.value!=='none');reports.push({stage,passed:true});await run(P.cleanup);
    }
    for(const action of ['hide-narration','hide-prompt','content','outcome','proof-loss']){
      stage='eligibility/'+action;const before=await start('grid','important');await run(P.release,action);await frames();const after=await run(P.snapshot);assertStable(after,before);
      assert.deepEqual(after.row,{value:'grid',priority:'important'});assert.deepEqual(after.outer,{value:'grid',priority:'important'});
      if(action==='hide-narration'){assert.equal(after.cardVisible,true);assert.equal(after.promptVisible,false);}
      if(action==='hide-prompt'){assert.equal(after.cardVisible,false);assert.equal(after.promptVisible,true);}
      if(action==='outcome')assert.equal(after.damageVisible,true,'Native visible result inside middle prevents concealment');
      if(action==='proof-loss'){assert.equal(after.connected,false);assert.equal(after.damageVisible,true);assert.equal(after.replyVisible,true);}
      if(action==='content'){await run(P.removeContent);await frames();const retained=await run(P.snapshot);assertStable(retained,before);assertPending(retained);}
      reports.push({stage,passed:true});await run(P.cleanup);
    }
    stage='overwrite-original-lease';const beforeOverwrite=await start('grid','');await run(P.overwrite);await frames();const overwritten=await run(P.snapshot);assertStable(overwritten,beforeOverwrite);assertPending(overwritten);
    await run(P.release,'auto-off');await frames();const released=await run(P.snapshot);assertStable(released,beforeOverwrite);assert.deepEqual(released.row,{value:'grid',priority:''});assert.deepEqual(released.outer,{value:'grid',priority:''});reports.push({stage,passed:true});await run(P.cleanup);
    stage='native-callback';await start();await run(P.finish);await until(P.completed);await frames();const completed=await run(P.completedSnapshot);
    assert.deepEqual(completed,{calls:1,submits:1,dice:'1d10',bonus:3,accepted:true,status:'pending',draft:'preserved native draft',damageVisible:true,replyVisible:true});reports.push({stage,passed:true,completed});await run(P.cleanup);
    console.log('CONCEALED_ROW_FUNCTIONAL_JSON='+JSON.stringify({functionalPassed:true,reports}));
    stage='unchanged-style-writes';const before=await start();await run(P.installProbe);await frames();await run(P.takeProbe);const phases=[];
    for(const [index,kind]of ['childList','childList','childList','public-update'].entries()){
      await run(P.trigger,kind,index);await frames();const metrics=await run(P.takeProbe),after=await run(P.snapshot);assertStable(after,before);assertPending(after);assert.deepEqual(after.geometry,before.geometry,'Unchanged native result/attack/reply geometry');
      assert.equal(metrics.capReached,false,'Bounded exact-node observer');assert.equal(metrics.deliveries,kind==='childList'?1:0,'Separate real external childList deliveries');phases.push({kind,index,...metrics});
    }
    const evidence={functionalPassed:true,root,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/combat/combat-flow.ts'))).digest('hex'),before,phases};
    console.log('CONCEALED_ROW_WRITES_JSON='+JSON.stringify(evidence));await run(P.cleanup);
    // Baseline expected RED only here, after every native functional guard.
    for(const phase of phases)assert.equal(phase.records.length,0,'Unchanged proven concealed row/outer must not restore and reapply display: '+phase.kind+'/'+phase.index);
    console.log('Concealed-row native PASS');clearTimeout(watchdog);window.destroy();app.exit(0);
  })().catch(async error=>{console.error('Concealed-row failure at '+stage,error);if(window&&!window.isDestroyed()){console.error('CONCEALED_ROW_DIAGNOSTIC='+JSON.stringify(await window.webContents.executeJavaScript(serialized(P.diagnostic)).catch(error=>({error:String(error)}))));await window.webContents.executeJavaScript(serialized(P.cleanup)).catch(()=>{});}clearTimeout(watchdog);window?.destroy();app.exit(1);});
}
