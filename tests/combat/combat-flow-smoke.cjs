// Coordinator alone schedules this native fixture through the private runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Use the central private-profile fixture runner.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const { configureCombatFlow } = require(path.join(root, 'dist/combat/combat-flow'));
const html = `<!doctype html><meta charset="utf-8"><style>body{background:#222;color:white}section{width:400px}button{padding:12px}label{display:block}fieldset{max-width:380px}</style>
<section data-ff-combat-docked data-ff-combat-panel-mode="actions"><form><input value="preserved native draft"><button type="submit" id="submit">Attack</button></form></section><main></main><script>
window.calls=0;window.submits=0;window.mode='hit';window.sequence=100;window.nativeCharacter={id:83026155};window.nativeCampaign={id:'campaign-a',active_encounter_id:412456};
const root={tag:3,stateNode:{}};root.stateNode.current=root;
let result={status:'idle',submittedAt:0};const listeners=new Set();
// Keep bounded fixture-owned evidence; do not expose or alter the adapter's state.
const trace=[];const record=(kind,detail={})=>{trace.push({kind,at:Date.now(),...detail});if(trace.length>16)trace.shift()};
for(const type of ['mousedown','mouseup','click','submit'])document.addEventListener(type,event=>record(type,{trusted:event.isTrusted,target:event.target.id||event.target.tagName}),true);
window.flowFixtureState=()=>({calls,submits,mode,sequence,result,subscriptions:listeners.size,trace,choice:window.currentChoice,choices:window.currentDM?.rollChoices,visibility:document.visibilityState,focused:document.hasFocus(),activeElement:document.activeElement?.id||document.activeElement?.tagName,controller:!!window.__friendsFablesDesktopCombatFlow,preferences:window.__friendsFablesDesktopCombatFlow?.getPreferences(),claims:[...(window.__friendsFablesDesktopCombatFlowClaims||[])],outcomes:[...(window.__friendsFablesDesktopCombatFlowOutcomes||new Map())]});
const observer={options:{mutationFn:function nativeGM({lastEventId}){return ['ENCOUNTER_GM_RESPONSE','GM_RESPONSE',lastEventId]}},getCurrentResult(){return result},subscribe(fn){listeners.add(fn);record('subscribe');return ()=>{record('unsubscribe');listeners.delete(fn)}}};
const form=document.querySelector('form');const owner={type:function NativeExecuteActions(){const sendAttackRoll=null;return sendAttackRoll},memoizedProps:{campaignId:'campaign-a',encounterId:412456,isUsersCharacterTurn:true,isMultiplayerCampaign:true},memoizedState:{memoizedState:{data:{usersCharacter:nativeCharacter}},next:{memoizedState:observer}},return:root};
const provider={memoizedProps:{control:{},getValues(){return [{type:'spell',requires_attack_roll:true,modifier_value:8,proficiency_bonus:8,targets:[{id:2217533,ac:10}]}]}},return:owner};
const formFiber={memoizedProps:{},return:provider};form.__reactFiber$fixture=formFiber;provider.child=formFiber;owner.child=provider;root.child=owner;
window.mountRows=(request,attackId)=>{
 const dmId=attackId+1;const choice={id:attackId+2,event_id:dmId,character_id:83026155,type:'Damage',accepted:null,dice_expression:mode==='crit'?'2d10+3':'1d10',fixed_bonus:3};
 const attack={id:attackId,role:'player',request_id:request,campaign_id:'campaign-a',character_id:83026155,command_used:'roll_attack',events_roll:{roll_type:'Spell Attack',dc:10,total_roll:mode==='miss'?9:24,modifier_value:8,proficiency_bonus:8}};
 const dm={id:dmId,role:'dm',request_id:request,campaign_id:'campaign-a',command_used:'encounter_player_turn_action_response',rollChoices:mode==='miss'?[]:[choice]};
 window.currentDM=dm;window.currentChoice=choice;document.querySelector('main').innerHTML='<div id="event-container-undefined">Attack result</div><div id="event-container-'+dmId+'"><div id="event-message-card-'+dmId+'">Intermediate narration</div><div><button type="button" id="damage">Roll Damage</button></div></div>';
 const rows=document.querySelector('main').children;const attackFiber={memoizedProps:{event:attack,campaign:nativeCampaign},return:root};const dmFiber={memoizedProps:{event:dm,campaign:nativeCampaign},return:root};owner.sibling=attackFiber;attackFiber.sibling=dmFiber;
 rows[0].__reactFiber$fixture=attackFiber;rows[1].__reactFiber$fixture=dmFiber;
 const card=rows[1].querySelector('[id^=event-message-card-]'),cardOwner={type:function NativeNarrativeCard(){return 'event-message-card-'},memoizedProps:{eventId:dmId},return:dmFiber};const cardFiber={memoizedProps:{},return:cardOwner};cardOwner.child=cardFiber;card.__reactFiber$fixture=cardFiber;dmFiber.child=cardOwner;
 const t5={memoizedProps:{rollChoice:choice,campaignId:'campaign-a',usersCharacter:nativeCharacter},return:dmFiber};cardOwner.sibling=t5;
 const button=document.querySelector('#damage');const callback=function nativeQuickRoll(event){event.stopPropagation();const dice_expression=choice.dice_expression;calls++;window.lastChoice={...choice,dice_expression};if(mode==='failure')throw Error('Unknown send outcome');choice.accepted=true;window.done=true};
 const buttonFiber={memoizedProps:{onClick:callback,disabled:false},return:t5};button.__reactFiber$fixture=buttonFiber;t5.child=buttonFiber;
};mountRows('historical',sequence);
form.addEventListener('submit',event=>{event.preventDefault();submits++;sequence+=10;const request='local-request-'+sequence;mountRows(request,sequence);if(mode!=='miss'){const pendingDM=currentDM,pendingChoice=currentChoice;pendingDM.rollChoices=[];setTimeout(()=>{pendingDM.rollChoices=[pendingChoice];document.querySelector('main').append(document.createElement('span'))},50)}result={status:'pending',submittedAt:Date.now(),variables:{requestId:request,lastEventId:sequence,isMultiplayer:true}};record('pending',{subscriptions:listeners.size,submittedAt:result.submittedAt});for(const fn of listeners)fn(result);result={...result,status:'success'}});
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
  const setPreferences = (automaticDamage, hideIntermediateFranz = false) => js(`window.__friendsFablesDesktopCombatFlow.setPreferences({campaignId:'campaign-a',automaticDamage:${automaticDamage},hideIntermediateFranz:${hideIntermediateFranz}})`);
  await setPreferences(true);
  assert.equal(await js('calls'), 0, 'Historical choice remains manual after enabling');
  await setPreferences(true, true);
  await nativeClick('#submit'); await until('calls===1');
  assert.equal(await js("document.querySelector('[id^=event-message-card-]').style.display"), 'none');
  assert.equal(await js("document.querySelector('#damage').getClientRects().length>0"), true);
  assert.equal(await js("document.querySelector('[id^=event-container-]').style.display"), '');
  await js("document.querySelector('main').append(document.createElement('span'))"); await until('done===true'); assert.equal(await js('calls'), 1);
  await setPreferences(false);
  assert.equal(await js("document.querySelector('[id^=event-message-card-]').style.display"), '');
  assert.equal(await js("window.__friendsFablesDesktopCombatFlow.getPreferences().hideIntermediateFranz"), false);
  await setPreferences(true); await js("mode='miss';done=false"); await nativeClick('#submit'); await until('submits===2');
  // A later frame is a readiness boundary; mutation processing must not roll a miss.
  await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert.equal(await js('calls'), 1);
  await js("mode='crit'"); await nativeClick('#submit'); await until('calls===2'); assert.equal(await js('lastChoice.dice_expression'), '2d10+3'); assert.equal(await js('lastChoice.fixed_bonus'), 3);
  await js("mode='failure'"); await nativeClick('#submit'); await until('calls===3'); await js("document.querySelector('main').append(document.createElement('span'))");
  await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert.equal(await js('calls'), 3);
  await configure(false); assert.equal(await js("document.querySelector('[data-ff-combat-flow]')===null"), true);
  assert.equal(await js("document.querySelector('form input').value"), 'preserved native draft');
  console.log('Combat flow native fixture passed'); clearTimeout(watchdog); window.destroy(); app.exit(0);
})().catch(error => { console.error(error); clearTimeout(watchdog); window?.destroy(); app.exit(1); });
