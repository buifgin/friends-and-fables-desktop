// Coordinator alone schedules this native fixture through the private runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Use the central private-profile fixture runner.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const { configureCombatFlow } = require(path.join(root, 'dist/combat/combat-flow'));
const html = `<!doctype html><meta charset="utf-8"><style>body{background:#222;color:white}section{width:400px}button{padding:12px}label{display:block}fieldset{max-width:380px}.native-grid{display:grid;grid-template-columns:40px 1fr 30px;column-gap:8px}.native-avatar{height:160px}.native-middle{margin-left:16px}.native-actions{height:140px}</style>
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
 const dm={id:dmId,role:'dm',request_id:request,campaign_id:'campaign-a',command_used:'encounter_player_turn_action_response',processed:false,rollChoices:mode==='miss'?[]:[choice]};
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
};mountRows('historical',sequence);
window.finishGeneration=()=>{result={...result,status:'success'};record('success');for(const fn of listeners)fn(result);document.querySelector('main').append(document.createElement('span'))};
form.addEventListener('submit',event=>{event.preventDefault();submits++;sequence+=10;const request='local-request-'+sequence;mountRows(request,sequence);result={status:'pending',submittedAt:Date.now(),variables:{requestId:request,lastEventId:sequence,isMultiplayer:true}};record('pending',{subscriptions:listeners.size,submittedAt:result.submittedAt});const frameSequence=sequence;requestAnimationFrame(()=>{if(frameSequence!==sequence)return;presentationFrames.push({sequence:frameSequence,promptVisible:document.querySelector('#damage-prompt').getClientRects().length>0,rowVisible:document.querySelector('.native-grid').getClientRects().length>0,status:document.querySelector('[data-ff-combat-damage-progress]')?.textContent})});for(const fn of listeners)fn(result);if(!holdStreaming)finishGeneration()});
</script>`;
let window;
const watchdog = setTimeout(() => { console.error('Combat flow fixture timed out'); window?.destroy(); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
(async () => {
  await app.whenReady();
  const site = session.fromPartition(`combat-flow-${process.pid}`);
  site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  window = new BrowserWindow({ show: false, width: 1000, height: 900, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const js = source => window.webContents.executeJavaScript(source);
  const diagnose = async expression => {
    const renderer = await js('window.flowFixtureState?.()').catch(error => ({ error: String(error) }));
    console.error('Combat flow fixture state:', JSON.stringify({ expression, root, native: { visible: window.isVisible(), focused: window.isFocused(), contentsFocused: window.webContents.isFocused(), bounds: window.getContentBounds() }, renderer }));
  };
  const until = async (expression, nativeFocus = false) => { for (let n = 0; n < 100; n++) { if ((!nativeFocus || (window.isVisible() && window.isFocused() && window.webContents.isFocused())) && await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 20)); } await diagnose(expression); throw Error('Timed out: ' + expression); };
  const nativeReady = async () => {
   await until("document.visibilityState==='visible'&&document.hasFocus()", true);
   // DOM layout can lead Chromium's submitted hit-test regions after mount/open.
   // Cross a painted frame before measuring the native input target.
   try { await js('new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("Native input paint readiness timed out")),2000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve()}))})'); }
   catch(error) { await diagnose('native input paint readiness');throw error; }
   assert.ok(window.isVisible()&&window.isFocused()&&window.webContents.isFocused(), 'Native input requires a visible, focused fixture');
  };
  const configure = (enabled = true) => js(`(${configureCombatFlow.toString()})(${enabled},'en')`);
  const nativeClick = async selector => {
    await nativeReady();
    const point = await js(`(()=>{const node=document.querySelector(${JSON.stringify(selector)}),rect=node.getBoundingClientRect();return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2),hit:node.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2))}})()`);
    assert.equal(point.hit, true, 'Native target must be visible and unobstructed');
    window.webContents.sendInputEvent({ type: 'mouseDown', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    window.webContents.sendInputEvent({ type: 'mouseUp', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  };
  await window.loadURL('https://play.fables.gg/campaign-a/play'); window.showInactive(); window.focus(); window.webContents.focus();
  await until("document.visibilityState==='visible'&&document.hasFocus()",true);
  await configure(); await until('!!window.__friendsFablesDesktopCombatFlow');
  assert.equal(await js("document.querySelector('[data-ff-combat-flow]')===null"), true);
  const setPreferences = (automaticDamage, hideIntermediateFranz = false, hideDamagePrompt = false) => js(`window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:${automaticDamage},hideIntermediateFranz:${hideIntermediateFranz},hideDamagePrompt:${hideDamagePrompt}})`);
  await setPreferences(true);
  assert.equal(await js('calls'), 0, 'Historical choice remains manual after enabling');
  await setPreferences(true, true);
  await nativeClick('#submit'); await until('submits===1&&result.status==="pending"');
  await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');assert.equal(await js('calls'),0,'Native choice arrival during streaming must not interrupt Franz');
  assert.equal(await js("document.querySelector('#native-avatar').getClientRects().length===0&&document.querySelector('#native-actions').getClientRects().length===0&&document.getElementById('event-message-card-'+(sequence+1)).getClientRects().length===0"),true,'Causal streaming intermediate is already entirely concealed');
  await js("currentDM.processed=true;document.querySelector('main').append(document.createElement('span'))");
  await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');assert.equal(await js('calls'),0,'Processed event alone cannot bypass pending causal generation');
  await js('currentDM.processed=false;finishGeneration();holdStreaming=false');await until('calls===1');assert.equal(await js('currentDM.processed'),false,'Thoughts processing flag may remain false after native GM completion');
  assert.equal(await js("document.getElementById('event-message-card-'+(sequence+1)).style.display"), 'none');
  assert.equal(await js("document.querySelector('#damage-prompt').getClientRects().length>0"), true);
  assert.equal(await js("document.querySelector('#native-avatar').getClientRects().length===0&&document.querySelector('#native-actions').getClientRects().length===0"),true,'Entire native narration avatar/audio/feedback region must disappear');
  assert.equal(await js("(()=>{const row=document.querySelector('.native-grid'),middle=document.querySelector('#native-middle'),prompt=document.querySelector('#damage-prompt');return Math.abs(row.getBoundingClientRect().height-prompt.getBoundingClientRect().height)<1&&getComputedStyle(middle).marginLeft==='0px'})()"),true,'No tall avatar/action blank grid space remains');
  assert.equal(await js("document.querySelector('[data-native-damage-result]').getClientRects().length>0&&document.querySelector('#final-reply').getClientRects().length>0"),true);
  assert.equal(await js("document.querySelector('[id^=event-container-]').style.display"), '');
  await js("document.querySelector('main').append(document.createElement('span'))"); await until('done===true'); assert.equal(await js('calls'), 1);
  await setPreferences(false);
  assert.equal(await js("document.getElementById('event-message-card-'+(sequence+1)).style.display"), '');
  assert.equal(await js("window.__friendsFablesDesktopCombatFlow.getPreferences().hideIntermediateFranz"), false);
  assert.equal(await js("document.querySelector('#native-avatar').getClientRects().length>0&&document.querySelector('#native-actions').getClientRects().length>0&&getComputedStyle(document.querySelector('#native-middle')).marginLeft==='16px'"),true);
  await setPreferences(true); await js("mode='miss';done=false"); await nativeClick('#submit'); await until('submits===2');
  // A later frame is a readiness boundary; mutation processing must not roll a miss.
  await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert.equal(await js('calls'), 1);
  await js("mode='crit'"); await nativeClick('#submit'); await until('calls===2'); assert.equal(await js('lastChoice.dice_expression'), '2d10+3'); assert.equal(await js('lastChoice.fixed_bonus'), 3);
  await setPreferences(true,false,true);await js("mode='failure'"); await nativeClick('#submit'); await until('calls===3'); await js("document.querySelector('main').append(document.createElement('span'))");
  await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert.equal(await js('calls'), 3);assert.equal(await js("document.querySelector('#damage-prompt').style.display"),'','Failed callback leaves native prompt visible');
  await setPreferences(true, false, true); await js("mode='hit';done=false"); await nativeClick('#submit');await until('calls===4&&done===true');
  await until("document.querySelector('#damage-prompt').style.display==='none'");
  assert.equal(await js("document.querySelector('[data-native-damage-result]').getClientRects().length>0 && document.querySelector('#final-reply').getClientRects().length>0 && document.getElementById('event-message-card-'+(sequence+1)).getClientRects().length>0"),true,'Only completed prompt hides, never actual damage, final reply or separate narration');
  await setPreferences(true, false, false);assert.equal(await js("document.querySelector('#damage-prompt').style.display"),'');
  await setPreferences(true, true, true);await until("document.querySelector('#damage-prompt').style.display==='none'");assert.equal(await js("document.getElementById('event-message-card-'+(sequence+1)).style.display"),'none');
  await setPreferences(false);assert.equal(await js("document.querySelector('#damage-prompt').style.display"),'');assert.equal(await js('window.__friendsFablesDesktopCombatFlow.getPreferences().hideDamagePrompt'),false);
  await setPreferences(true,true,true);await js("mode='text'");await nativeClick('#submit');await until('submits===6');await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');assert.equal(await js('calls'),4);assert.equal(await js("document.querySelector('#damage-prompt').style.display"),'');assert.equal(await js("document.getElementById('event-message-card-'+(sequence+1)).style.display"),'','Text-based attacks keep all native messages');
  await setPreferences(true,true,true);await js("mode='hit';holdStreaming=true;done=false");await nativeClick('#submit');await until('submits===7&&result.status==="pending"');
  assert.equal(await js("document.querySelector('#damage-prompt').getClientRects().length===0&&document.querySelector('.native-grid').getClientRects().length===0"),true,'Ready prompt and empty intermediate slot hide during native generation');
  assert.equal(await js("document.querySelector('[data-ff-combat-damage-progress]')?.parentElement.parentElement.id==='event-message-card-'+sequence"),true,'Progress belongs inside the exact attack card');
  await until('presentationFrames.some(frame=>frame.sequence===sequence)');assert.equal(await js('presentationFrames.find(frame=>frame.sequence===sequence).promptVisible'),false,'First painted frame has no ready prompt');assert.equal(await js('presentationFrames.find(frame=>frame.sequence===sequence).rowVisible'),false,'First painted frame has no intermediate slot');
  await js('finishGeneration()');await until('calls===5&&done===true');await until("document.querySelector('[data-ff-combat-damage-progress]')===null");
  assert.equal(await js("document.querySelector('[data-native-damage-result]').getClientRects().length>0&&document.querySelector('#final-reply').getClientRects().length>0"),true);
  await js('delayDamageProps=true;done=false');await nativeClick('#submit');await until('submits===8&&result.status==="pending"');
  assert.equal(await js("!!document.querySelector('[data-ff-combat-damage-progress]')"),true);
  await js('finishGeneration()');await until('calls===6&&done===true&&damageMountFrames.some(frame=>frame.sequence===sequence)');
  assert.deepEqual(await js('(()=>{const frame=damageMountFrames.find(frame=>frame.sequence===sequence);return {progress:frame.progress,rowChoiceAccepted:frame.rowChoiceAccepted,resultHasFiber:frame.resultHasFiber,visible:frame.visible}})()'),{progress:false,rowChoiceAccepted:null,resultHasFiber:false,visible:true},'Exact collection result ID and native dice DOM remove status before first paint despite delayed row/result props');
  await js('publishDamageProps()');assert.equal(await js("document.querySelector('[data-ff-combat-damage-progress]')===null"),true);
  await js('delayDamageIdentity=true;done=false');await nativeClick('#submit');await until('submits===9&&result.status==="pending"');await js('finishGeneration()');await until('calls===7&&damageMountFrames.some(frame=>frame.sequence===sequence)');
  assert.equal(await js('damageMountFrames.find(frame=>frame.sequence===sequence).progress'),false,'Native pending exact roll removes progress at FIRST dice frame before backend choice-ID update');
  assert.equal(await js('currentChoice.accepted'),null);assert.equal(await js('currentChoice.roll_result_id'),undefined);assert.equal(await js('currentNativeRollState().status'),'pending');
  assert.equal(await js('[...window.__friendsFablesDesktopCombatFlowOutcomes.values()].find(value=>value.eventId===sequence+1).status'),'claimed','Presentation fingerprint never forges native acceptance');
  assert.equal(await js("document.querySelector('#damage-prompt').getClientRects().length===0&&document.querySelector('[data-native-damage-result]').getClientRects().length>0"),true);
  await configure(false); assert.equal(await js("document.querySelector('[data-ff-combat-flow]')===null"), true);
  assert.equal(await js("document.querySelector('form input').value"), 'preserved native draft');
  console.log('Combat flow native fixture passed'); clearTimeout(watchdog); window.destroy(); app.exit(0);
})().catch(error => { console.error(error); clearTimeout(watchdog); window?.destroy(); app.exit(1); });
