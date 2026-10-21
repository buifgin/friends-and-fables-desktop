// Coordinator alone schedules this native fixture through the private runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Use the central private-profile fixture runner.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const { configureCombatFlow } = require(path.join(root, 'dist/combat/combat-flow'));
const { nativeFactory, createNativeEventQuery } = require('./fixtures/native-event-query.cjs');
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

};mountRows('historical',sequence);
window.finishGeneration=()=>{result={...result,status:'success'};record('success');for(const fn of listeners)fn(result);document.querySelector('main').append(document.createElement('span'))};
form.addEventListener('submit',event=>{event.preventDefault();submits++;sequence+=10;const request='local-request-'+sequence;mountRows(request,sequence);result={status:'pending',submittedAt:Date.now(),variables:{requestId:request,lastEventId:sequence,isMultiplayer:true}};record('pending',{subscriptions:listeners.size,submittedAt:result.submittedAt});const frameSequence=sequence;requestAnimationFrame(()=>{if(frameSequence!==sequence)return;presentationFrames.push({sequence:frameSequence,promptVisible:mode==='no-damage'?false:document.querySelector('#damage-prompt').getClientRects().length>0,rowVisible:document.querySelector('.native-grid').getClientRects().length>0,status:document.querySelector('[data-ff-combat-damage-progress]')?.textContent})});for(const fn of listeners)fn(result);if(!holdStreaming)finishGeneration()});
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
  const noDamageContract=async()=>{
    await setPreferences(true,true,true);
    const before=await js('({calls,submits})');
    await js("mode='no-damage';holdStreaming=true;done=false");
    await nativeClick('#submit');await until(`submits===${before.submits+1}&&result.status==='pending'`);
    await js("window.noDamageProof={card:document.getElementById('event-message-card-'+(sequence+1)),avatar:document.getElementById('native-avatar'),actions:document.getElementById('native-actions'),form:document.querySelector('form'),draft:document.querySelector('form input'),event:currentDM,choices:currentDM.rollChoices}");
    await until("noDamageProof.card.getClientRects().length===0&&noDamageProof.avatar.getClientRects().length===0&&noDamageProof.actions.getClientRects().length===0&&!!document.querySelector('[data-ff-combat-damage-progress]')");
    assert.equal(await js("document.querySelector('[data-native-damage-result]')===null&&document.querySelector('#damage-prompt')===null&&currentDM.rollChoices.length===0"),true,'No native Damage event or choice exists');
    await js('finishGeneration()');
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const final=await js("({cardVisible:noDamageProof.card.getClientRects().length>0,avatarVisible:noDamageProof.avatar.getClientRects().length>0,actionsVisible:noDamageProof.actions.getClientRects().length>0,progress:!!document.querySelector('[data-ff-combat-damage-progress]'),calls,sameCard:document.getElementById('event-message-card-'+(sequence+1))===noDamageProof.card,sameEvent:currentDM===noDamageProof.event,sameChoices:currentDM.rollChoices===noDamageProof.choices,sameForm:document.querySelector('form')===noDamageProof.form,sameDraft:document.querySelector('form input')===noDamageProof.draft,draft:noDamageProof.draft.value})");
    assert.equal(final.calls,before.calls,'Final no-Damage answer never invokes a roll');
    for(const field of ['sameCard','sameEvent','sameChoices','sameForm','sameDraft'])assert.equal(final[field],true,field);
    assert.equal(final.draft,'preserved native draft');
    for(const field of ['cardVisible','avatarVisible','actionsVisible'])assert.equal(final[field],true,'Final no-Damage '+field);
    assert.equal(final.progress,false,'Final no-Damage clears progress');
    await js("publishLateDamageChoice();document.querySelector('main').append(document.createElement('span'))");
    await until(`calls===${before.calls+1}&&done===true`);
    await js('finishGeneration()');await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    assert.equal(await js('calls'),before.calls+1,'A late native Damage choice still executes exactly once');
    assert.equal(await js("document.querySelector('form')===noDamageProof.form&&document.querySelector('form input')===noDamageProof.draft"),true);
  };
  if(process.env.FABLES_COMBAT_SCENARIO==='no-damage-final'){
    await noDamageContract();console.log('Combat no-Damage final response contract passed');clearTimeout(watchdog);window.destroy();app.exit(0);return;
  }
  const proofAbsenceContract=async()=>{
    await setPreferences(true,true,true);
    const before=await js("({calls,submits})");
    await js("mode='hit';holdStreaming=false;delayDamageIdentity=false;delayDamageProps=false;done=false");
    await nativeClick('#submit');await until(`calls===${before.calls+1}&&submits===${before.submits+1}&&done===true`);
    await until("[...window.__friendsFablesDesktopCombatFlowOutcomes.values()].some(value=>value.eventId===sequence+1&&value.status==='accepted')");
    await until("document.querySelector('#damage-prompt').style.display==='none'&&document.getElementById('event-message-card-'+(sequence+1)).style.display==='none'");
    await js("window.proofAbsence={row:document.querySelector('.native-grid'),card:document.getElementById('event-message-card-'+(sequence+1)),prompt:document.querySelector('#damage-prompt'),damage:document.querySelector('[data-native-damage-result]'),reply:document.querySelector('#final-reply'),form:document.querySelector('form'),draft:document.querySelector('form input'),dm:currentDM,choice:currentChoice};proofAbsence.parent=proofAbsence.row.parentNode;proofAbsence.next=proofAbsence.row.nextSibling;proofAbsence.rowFiber=proofAbsence.row.__reactFiber$fixture;proofAbsence.outcomes=JSON.stringify([...window.__friendsFablesDesktopCombatFlowOutcomes]);proofAbsence.row.remove()");
    // Cross a separately observed absence scan. No native props, Fiber objects,
    // ownership IDs or callback results are replaced to simulate presentation loss.
    await until("!proofAbsence.row.isConnected&&proofAbsence.card.style.display===''&&proofAbsence.prompt.style.display===''");
    const absent=await js("({connected:proofAbsence.row.isConnected,narration:proofAbsence.card.style.display,prompt:proofAbsence.prompt.style.display,calls,actualDamageVisible:proofAbsence.damage.getClientRects().length>0,finalReplyVisible:proofAbsence.reply.getClientRects().length>0})");
    console.log('COMBAT_PROOF_ABSENCE observed absent rescan',JSON.stringify(absent));
    assert.equal(absent.calls,before.calls+1);assert.equal(absent.actualDamageVisible,true);assert.equal(absent.finalReplyVisible,true);
    await js("proofAbsence.parent.insertBefore(proofAbsence.row,proofAbsence.next);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    const restored=await js("({sameRow:document.querySelector('.native-grid')===proofAbsence.row,sameRowFiber:proofAbsence.row.__reactFiber$fixture===proofAbsence.rowFiber,sameDM:currentDM===proofAbsence.dm,sameChoice:currentChoice===proofAbsence.choice,outcomesUnchanged:JSON.stringify([...window.__friendsFablesDesktopCombatFlowOutcomes])===proofAbsence.outcomes,narrationHidden:proofAbsence.card.getClientRects().length===0,promptHidden:proofAbsence.prompt.getClientRects().length===0,actualDamageVisible:proofAbsence.damage.isConnected&&proofAbsence.damage.getClientRects().length>0,finalReplyVisible:proofAbsence.reply.isConnected&&proofAbsence.reply.getClientRects().length>0,sameForm:document.querySelector('form')===proofAbsence.form,sameDraft:document.querySelector('form input')===proofAbsence.draft,draft:proofAbsence.draft.value,calls})");
    console.log('COMBAT_PROOF_ABSENCE same-row reinsertion',JSON.stringify(restored));
    for(const field of ['sameRow','sameRowFiber','sameDM','sameChoice','outcomesUnchanged','actualDamageVisible','finalReplyVisible','sameForm','sameDraft'])assert.equal(restored[field],true,field+' remains unchanged across presentation absence');
    assert.equal(restored.draft,'preserved native draft');assert.equal(restored.calls,before.calls+1,'Presentation absence never rolls Damage again');
    assert.equal(restored.narrationHidden,true,'Still-owned narration re-hides after the same row returns');
    assert.equal(restored.promptHidden,true,'Still-owned completed Damage prompt re-hides after the same row returns');
  };
  const rollContinuityContract=async()=>{
    await setPreferences(true);
    await js(`window.createNativeEventQuery=(${createNativeEventQuery.toString()});window.capturedNativeFactory=(${nativeFactory.toString()});void 0;`);
    await js(`(()=>{
      // Model the captured nS null guard, not a React commit: missing native
      // relation unmounts its card; enriched INSERT creates a fresh card.
      const feed=document.querySelector('main');feed.id='events-list';feed.replaceChildren();
      const event={id:109467696,campaign_id:'campaign-a',character_id:83026155,character:{name:'Fixture character',image:null,voice:null},role:'player',command_used:'roll_damage',request_id:'continuity-request',created_at:'2026-10-20T12:00:00Z',events_roll:{roll_type:'Damage',base_roll:3,total_roll:3,base_rolls_array:[3],dice:[8],modifier_stat:null,modifier_value:null,proficiency_bonus:null}};
      const query=createNativeEventQuery(capturedNativeFactory,'campaign-a',[event]);
      const queryProvider={tag:10,memoizedProps:{value:query.client},return:root,child:owner};root.child=queryProvider;owner.return=queryProvider;
      const eventFiber={memoizedProps:{event},return:queryProvider};owner.sibling=eventFiber;
      const outer=document.createElement('div');outer.id='event-'+event.id;
      const row=document.createElement('div');row.id='event-container-undefined';outer.append(row);feed.append(outer);
      const host={tag:5,type:'div',stateNode:row,memoizedProps:{},return:eventFiber};eventFiber.child=host;row.__reactFiber$fixture=host;
      const render=()=>{const current=query.events()[0];eventFiber.memoizedProps={event:current};
        if(!current.events_roll||(!current.character&&!current.monster)){row.replaceChildren();return;}
        if(!row.firstElementChild){const card=document.createElement('div');card.id='event-message-card-'+event.id;const panel=document.createElement('div');panel.className='relative rounded-2xl border-2 overflow-hidden';panel.style.cssText='height:72px;border:2px solid white';panel.innerHTML='<svg width="32" height="32"><circle cx="16" cy="16" r="12" /></svg><span>Damage 3</span>';card.append(panel);row.append(card);}
      };
      render();query.client.onChange=render;
      window.continuity={query,event,outer,row,card:row.firstElementChild,panel:row.firstElementChild.firstElementChild,svg:row.querySelector('svg'),form,draft:form.querySelector('input'),calls,submits,original:query.client.setQueryData,hadOwn:Object.hasOwn(query.client,'setQueryData'),render};
    })()`);
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await js("continuity.height=continuity.card.getBoundingClientRect().height;continuity.editorHeight=continuity.form.getBoundingClientRect().height;continuity.scrollTop=document.querySelector('main').scrollTop;continuity.query.exports.insertEventIntoQueryData({queryClient:continuity.query.client,campaignId:'campaign-a',newEvent:{...continuity.event,events_roll:null}})");
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const raw=await js(`({visible:continuity.card.isConnected&&continuity.card.getClientRects().length>0,sameCard:continuity.row.firstElementChild===continuity.card,samePanel:continuity.row.firstElementChild?.firstElementChild===continuity.panel,sameSvg:continuity.row.querySelector('svg')===continuity.svg,rollPresent:!!continuity.query.events()[0].events_roll,height:continuity.row.firstElementChild?.getBoundingClientRect().height??0,expectedHeight:continuity.height,sameOuter:document.getElementById('event-'+continuity.event.id)===continuity.outer,sameForm:document.querySelector('form')===continuity.form,sameDraft:document.querySelector('form input')===continuity.draft,draft:continuity.draft.value,editorHeight:continuity.form.getBoundingClientRect().height,expectedEditorHeight:continuity.editorHeight,scrollTop:document.querySelector('main').scrollTop,expectedScrollTop:continuity.scrollTop,calls,submits,writes:continuity.query.writes.length})`);
    // Always exercise enriched recovery and disposal even when the RED card gap
    // will fail below, so failure evidence includes cleanup and no callback replay.
    await js("continuity.query.exports.insertEventIntoQueryData({queryClient:continuity.query.client,campaignId:'campaign-a',newEvent:continuity.event})");
    await configure(false);
    const cleanup=await js("({restored:continuity.query.client.setQueryData===continuity.original,ownRestored:Object.hasOwn(continuity.query.client,'setQueryData')===continuity.hadOwn,recovered:!!continuity.row.firstElementChild,cardReplaced:continuity.row.firstElementChild!==continuity.card,calls,submits})");
    console.log('ROLL_RELATION_CONTINUITY captured-native INSERT/null-guard model',JSON.stringify({raw,cleanup}));
    for(const field of ['sameOuter','sameForm','sameDraft'])assert.equal(raw[field],true,field);
    assert.equal(raw.draft,'preserved native draft');assert.equal(raw.editorHeight,raw.expectedEditorHeight);assert.equal(raw.scrollTop,raw.expectedScrollTop);
    assert.equal(raw.calls,0);assert.equal(raw.submits,0);assert.equal(raw.writes,1,'Exactly one native updater invocation');
    assert.equal(cleanup.restored,true,'Dispose restores exact original method');assert.equal(cleanup.ownRestored,true,'Dispose restores inherited method descriptor');assert.equal(cleanup.recovered,true);
    for(const field of ['visible','sameCard','samePanel','sameSvg','rollPresent'])assert.equal(raw[field],true,field+' survives duplicate native INSERT');
    assert.equal(raw.height,raw.expectedHeight,'No empty dice reserve or resize');
    assert.equal(cleanup.cardReplaced,false,'Enriched recovery never remounts a retained card');
  };
  if(process.env.FABLES_COMBAT_SCENARIO==='roll-relation-continuity'){
    await rollContinuityContract();console.log('Roll relation continuity contract passed');clearTimeout(watchdog);window.destroy();app.exit(0);return;
  }
  if(process.env.FABLES_COMBAT_SCENARIO==='proof-absence'){
    await proofAbsenceContract();console.log('Combat proof-absence lifecycle contract passed');clearTimeout(watchdog);window.destroy();app.exit(0);return;
  }
  await rollContinuityContract();
  await window.loadURL('https://play.fables.gg/campaign-a/play');await nativeReady();await configure();
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
  assert.equal(await js("(()=>{const status=document.querySelector('[data-ff-combat-damage-progress]'),panel=status?.parentElement,heightWith=status?.parentElement.getBoundingClientRect().height,position=status&&getComputedStyle(status).position,rect=status?.getBoundingClientRect(),box=panel?.getBoundingClientRect();if(!status||!panel)return false;status.remove();const heightWithout=panel.getBoundingClientRect().height;panel.append(status);return position==='absolute'&&Math.abs(heightWith-heightWithout)<0.1&&rect.right<=box.right+0.1&&rect.bottom<=box.bottom+0.1&&Math.abs(rect.right-box.right)<1&&Math.abs(rect.bottom-box.bottom)<1})()"),true,'Progress stays inside the native relative attack panel at its bottom-right without changing card height');
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
  await noDamageContract();
  await proofAbsenceContract();
  await configure(false); assert.equal(await js("document.querySelector('[data-ff-combat-flow]')===null"), true);
  assert.equal(await js("document.querySelector('form input').value"), 'preserved native draft');
  console.log('Combat flow native fixture passed'); clearTimeout(watchdog); window.destroy(); app.exit(0);
})().catch(error => { console.error(error); clearTimeout(watchdog); window?.destroy(); app.exit(1); });
