// Coordinator schedules native execution on the isolated display; --syntax needs no Electron.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const fixtureRoot = path.join(__dirname, '..', '..');
const html = `<!doctype html><meta charset="utf-8"><style>:root{--border:210 10% 30%;--input:210 10% 35%;--foreground:0 0% 90%;--background:210 10% 12%;--primary:41 62% 65%;--primary-focus:41 62% 55%;--primary-foreground:0 0% 13%;--secondary:210 10% 22%;--secondary-foreground:0 0% 90%;--accent:210 10% 26%;--accent-foreground:0 0% 95%;--ring:210 50% 55%}body{background:#222;color:white}section{width:308px}input{max-width:100%}</style>
<div contenteditable id="draft">preserved draft</div><canvas id="canvas"></canvas><section data-ff-combat-docked></section><script>
window.submits=[];window.changes=0;window.inputs=0;
window.mount=()=>{
 const dock=document.querySelector('section');dock.innerHTML='<form id="native-form"><input id="description" value="attack draft"><label>Modifier<input id="modifier_value" inputmode="decimal" value="0"></label><label>Proficiency<input id="proficiency_bonus" inputmode="decimal" value="2"></label><input id="unrecognised" value="keep"><button id="submit" type="submit">Attack</button></form>';
 window.state={modifier_value:'0',proficiency_bonus:'2'};window.native={form:document.querySelector('form'),submit:document.querySelector('#submit'),modifier:document.querySelector('#modifier_value'),proficiency:document.querySelector('#proficiency_bonus'),description:document.querySelector('#description'),draft:document.querySelector('#draft'),canvas:document.querySelector('#canvas')};
 for(const id of ['modifier_value','proficiency_bonus']){
  const input=document.getElementById(id),descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');let tracked=input.value;
  Object.defineProperty(input,'value',{get(){return descriptor.get.call(this)},set(value){tracked=String(value);descriptor.set.call(this,value)},configurable:true});
  input.addEventListener('input',()=>{inputs++;if(input.value!==tracked){tracked=input.value;state[id]=input.value;}});
  input.addEventListener('change',()=>changes++);
 }
 native.form.addEventListener('submit',event=>{event.preventDefault();submits.push({...state,description:native.description.value})});
};mount();
window.attachCustomMode=(requires=true)=>{
 const form=document.querySelector('#native-form'),trigger=document.createElement('button'),select=document.createElement('select');trigger.type='button';trigger.setAttribute('role','combobox');trigger.textContent='Normal';
 select.setAttribute('aria-hidden','true');select.tabIndex=-1;select.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden';
 for(const value of ['normal','advantage','disadvantage']){const option=document.createElement('option');option.value=value;select.append(option)}
 form.append(trigger,select);window.customModeValues={requires_attack_roll:requires,attack_roll_type:'normal'};window.customModeWrites=[];const control={};
 window.customModeMethods={control,getValues(name){return customModeValues[name]},getFieldState(){return {isDirty:false,isTouched:false}},setValue(name,value,options){if(name!=='attack_roll_type')throw Error('Unexpected leaf');customModeValues[name]=value;customModeWrites.push({name,value,options});select.value=value;trigger.textContent=value}};
 select.__reactFiber$fixture={memoizedProps:{},return:{memoizedProps:{trigger},return:{memoizedProps:{name:'attack_roll_type',control},return:{memoizedProps:customModeMethods}}}};
 window.customModeTrigger=trigger;window.customModeSelect=select;
};
// Captured native Dice tW/tG: no RHF or native form, shared enum setter.
window.mountCheckMode=()=>{
 const dock=document.querySelector('section');dock.innerHTML='<div id="native-check"><button id="vantage" type="button" role="combobox">Normal</button></div>';
 window.checkMode='normal';window.checkModeWrites=[];const trigger=document.querySelector('#vantage');
 const setSelectedVantage=value=>{checkMode=value;checkModeWrites.push(value);owner.memoizedProps.selectedVantage=value;parent.memoizedProps.selectedVantage=value;trigger.textContent=value};
 const parent={memoizedProps:{numberOfDice:1,setNumberOfDice(){},typeOfDie:'d20',setTypeOfDie(){},modifierValue:0,setModifierValue(){},proficiencyBonus:0,setProficiencyBonus(){},selectedVantage:'normal',setSelectedVantage}};
 const owner={memoizedProps:{selectedVantage:'normal',setSelectedVantage},return:parent};trigger.__reactFiber$fixture={memoizedProps:{id:'vantage',role:'combobox'},return:owner};window.checkModeTrigger=trigger;window.checkModeOwner=owner;window.checkModeParent=parent;
};
// Captured ExecuteActionsForm: FormProvider props, keyed field-array wrapper,
// AttackCard props and sibling FormField(control, name=attacks.N.targets).
window.pendingMounts=0;window.pendingCharacterOverride={};window.pendingWeaponOverride={};window.pendingBlocked=false;
window.mountPending=()=>{
 window.pendingMounts++;
 const dock=document.querySelector('section');dock.innerHTML='<form id="pending-form"><div id="pending-list" style="height:180px;overflow:auto"></div><textarea name="message">pending message</textarea><button type="submit">Submit Actions</button></form>';
 const form=dock.querySelector('form'),list=document.querySelector('#pending-list');
 window.pendingValues={attacks:[{name:'Vicious Weapon',image:'weapon.webp',type:'melee',requires_attack_roll:true,attack_roll_type:'normal',modifier_stat:'strength',modifier_value:0,proficiency_bonus:0,description:'weapon description',targets:[{id:1,name:'Wolf',ac:12}],damage_rolls:[{dice_count:1,dice_size:8,fixed_damage_bonus:0}]},{name:'Spell Attack',image:'spell.webp',type:'spell',requires_attack_roll:true,attack_roll_type:'normal',modifier_stat:'intelligence',modifier_value:2,proficiency_bonus:3,spell_id:4,targets:[{id:2}],damage_rolls:[]},{name:'Save spell',type:'spell',requires_attack_roll:false,targets:[],damage_rolls:[]}],message:'pending message'};
 Object.assign(pendingValues.attacks[0],pendingWeaponOverride);
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
</script>`;
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
const output = require('esbuild').transformSync(fs.readFileSync(path.join(fixtureRoot, 'src/combat/combat-corrections.ts'), 'utf8'), { loader: 'ts', target: 'es2022', format: 'cjs' });
new Function(output.code);
if (process.argv.includes('--syntax')) { console.log('Combat corrections embedded/serialized syntax PASS'); process.exit(0); }
const { app, BrowserWindow, session } = require('electron');
if (!process.env.FABLES_TEST_PROFILE_DIR) throw Error('Run through the central fixture runner for a private profile.');
app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const { configureCombatCorrections } = require(path.join(root, 'dist/combat/combat-corrections'));
let window;
const timer = setTimeout(() => { console.error('Combat corrections fixture timed out'); window?.destroy(); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
(async () => {
 await app.whenReady();
 const site = session.fromPartition(`combat-corrections-${process.pid}`);
 site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
 window = new BrowserWindow({ show: false, width: 900, height: 800, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
 const js = async (source, phase = 'renderer evaluation') => {
  try { return await window.webContents.executeJavaScript(source); }
  catch (error) { throw new Error(`${phase} failed for: ${source.slice(0, 240)}`, { cause: error }); }
 };
 const mutate = (source, phase = 'fixture mutation') => js(`(()=>{${source};return true;})()`, phase);
 const until = async expression => { for (let n=0;n<100;n++) { if(await js(expression))return; await new Promise(resolve=>setTimeout(resolve,20)); } throw Error('Timed out: '+expression); };
 const configure = (enabled=true,locale='en') => js(`(${configureCombatCorrections.toString()})(${enabled},${JSON.stringify(locale)})`);
 const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const testDisclosure=async selector=>{
  for(const side of ['arrow','text']){
   const point=await js(`(()=>{const summary=document.querySelector(${JSON.stringify(selector)}),rect=summary.getBoundingClientRect();return {x:Math.round(${JSON.stringify(side)}==='arrow'?rect.left+12:rect.right-8),y:Math.round(rect.top+rect.height/2),before:summary.parentElement.open,hit:summary.contains(document.elementFromPoint(${JSON.stringify(side)}==='arrow'?rect.left+12:rect.right-8,rect.top+rect.height/2))}})()`);
   assert.equal(point.hit,true,side+' lies in the whole summary hit area.');
   window.webContents.sendInputEvent({type:'mouseDown',x:point.x,y:point.y,button:'left',clickCount:1});window.webContents.sendInputEvent({type:'mouseUp',x:point.x,y:point.y,button:'left',clickCount:1});await until(`document.querySelector(${JSON.stringify(selector)}).parentElement.open===${!point.before}`);
  }
  for(const keyCode of ['Enter','Space']){
   const before=await js(`document.querySelector(${JSON.stringify(selector)}).parentElement.open`);await js(`document.querySelector(${JSON.stringify(selector)}).focus()`);
   window.webContents.sendInputEvent({type:'keyDown',keyCode});window.webContents.sendInputEvent({type:'char',keyCode:keyCode==='Enter'?'\r':' '});window.webContents.sendInputEvent({type:'keyUp',keyCode});await until(`document.querySelector(${JSON.stringify(selector)}).parentElement.open===${!before}`);
  }
 };
 const set = (selector,value) => js(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);
 const identity = () => js("native.form===document.querySelector('form')&&native.submit===document.querySelector('#submit')&&native.modifier===document.querySelector('#modifier_value')&&native.proficiency===document.querySelector('#proficiency_bonus')&&native.description.value==='attack draft'&&native.draft.textContent==='preserved draft'&&native.canvas===document.querySelector('canvas')&&document.querySelector('#unrecognised').value==='keep'");
 await window.loadURL('https://play.fables.gg/campaign-one/play'); window.showInactive(); window.webContents.focus();
 await until("document.visibilityState==='visible'&&document.hasFocus()");
 // A direct assignment plus events fools a controlled value tracker. Ensure this fixture detects it.
 await mutate("native.modifier.value='9';native.modifier.dispatchEvent(new Event('input',{bubbles:true}))");
 assert.equal(await js('state.modifier_value'),'0');
 await mutate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(native.modifier,'0');native.modifier.dispatchEvent(new Event('input',{bubbles:true}))");
 await configure(); await until("!!document.querySelector('[data-ff-combat-corrections]')");
 assert.equal(await identity(),true);
 assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]')"),null,'No top correction jump button is injected.');
 await click('[data-ff-combat-corrections] summary');
 assert.equal(await js("document.querySelector('[data-ff-combat-corrections]').open"),true);
 assert.equal(await js('submits.length'),0,'Opening correction details never submits the native form.');
 await testDisclosure('[data-ff-combat-corrections] summary');assert.equal(await js('submits.length'),0,'Native summary clicks and keyboard never submit.');
 assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-combat-corrections]')).borderTopColor"),'rgb(69, 77, 84)','Correction border follows native border token.');
 assert.equal(await js("getComputedStyle(document.querySelector('[data-ff-combat-corrections] input')).backgroundColor"),'rgb(28, 31, 34)','Correction input follows native background token.');
 assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]')"),null);
 assert.equal(await js("document.querySelector('[data-ff-combat-corrections]').closest('form')"),null,'Owned controls cannot implicitly submit the native form.');
 await set('[data-ff-correction-value=modifier_value]','3'); await click('[data-ff-correction-apply-modifier_value]');
 assert.equal(await js('state.modifier_value'),'3','Native event state updates, not just DOM value.');
 await click('[data-ff-correction-proficiency_bonus-plus]'); assert.equal(await js('state.proficiency_bonus'),'3');
 assert.equal(await js('submits.length'),0,'Corrections never roll.');
 await click('#submit'); assert.deepEqual(await js('submits[0]'),{modifier_value:'3',proficiency_bonus:'3',description:'attack draft'});
 await set('[data-ff-correction-name]','My local attack'); await click('[data-ff-correction-save]');
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-combat-corrections-v1:/campaign-one'))[0].name"),'My local attack');
 await click('[data-ff-correction-modifier_value-zero]'); assert.equal(await js('state.modifier_value'),'0');
 await configure(false); await configure(); await until("!!document.querySelector('[data-ff-combat-corrections]')");
 assert.equal(await js('state.modifier_value'),'0','Re-enable never auto-applies a saved preset.');
 await set('[data-ff-correction-presets]','My local attack'); await click('[data-ff-correction-load]'); assert.equal(await js('state.modifier_value'),'3');
 await set('[data-ff-correction-value=modifier_value]','101'); await click('[data-ff-correction-apply-modifier_value]');
 await set('[data-ff-correction-value=modifier_value]','1e2'); await click('[data-ff-correction-apply-modifier_value]'); assert.equal(await js('state.modifier_value'),'3','Out of bounds/exponent input rejected.');
 await mutate("native.proficiency.disabled=true"); await until("document.querySelector('[data-ff-correction-load]').disabled");
 await click('[data-ff-correction-modifier_value-zero]'); await click('[data-ff-correction-load]'); assert.equal(await js('state.modifier_value'),'0','Unavailable field prevents partial preset load.');
 await mutate("native.proficiency.disabled=false;native.modifier.readOnly=true"); await until("document.querySelector('[data-ff-correction-value=modifier_value]').disabled");
 await click('[data-ff-correction-modifier_value-plus]'); assert.equal(await js('state.modifier_value'),'0');
 await mutate('native.modifier.readOnly=false'); await until("!document.querySelector('[data-ff-correction-load]').disabled");
 for (const [attribute,value] of [['aria-disabled','true'],['data-disabled',''],['hidden','']]) {
  await mutate(`native.modifier.setAttribute(${JSON.stringify(attribute)},${JSON.stringify(value)})`);
  await until("document.querySelector('[data-ff-correction-value=modifier_value]').disabled");
  await click('[data-ff-correction-modifier_value-plus]'); assert.equal(await js('state.modifier_value'),'0','Hidden/ARIA/data-disabled fields cannot be corrected.');
  await mutate(`native.modifier.removeAttribute(${JSON.stringify(attribute)})`);
  await until("!document.querySelector('[data-ff-correction-value=modifier_value]').disabled");
 }
 // Exact captured Radix Controller + own FormProvider binding. The enum
 // alone does not authorize a mode on damage-only custom forms.
 await mutate('attachCustomMode(false)');await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js("document.querySelector('[data-ff-combat-corrections] [data-ff-correction-roll-mode]').getClientRects().length"),0);
 await mutate('customModeValues.requires_attack_roll=true');await configure();await until("document.querySelector('[data-ff-combat-corrections] [data-ff-correction-roll-mode]').getClientRects().length>0");
 for(const value of ['advantage','disadvantage','normal']){await mutate(`const mode=document.querySelector('[data-ff-combat-corrections] [data-ff-correction-roll-mode]');mode.value='${value}';mode.dispatchEvent(new Event('change',{bubbles:true}))`);assert.equal(await js('customModeValues.attack_roll_type'),value);}
 assert.equal(await js("customModeWrites.every(write=>write.name==='attack_roll_type'&&write.options.shouldDirty&&write.options.shouldValidate)"),true);
 assert.equal(await js("localStorage.getItem('ff-desktop-combat-corrections-v1:/campaign-one').includes('attack_roll_type')"),false,'Manual custom presets exclude transient roll mode.');
 await mutate('customModeTrigger.disabled=true');await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js("document.querySelector('[data-ff-combat-corrections] [data-ff-correction-roll-mode]').getClientRects().length"),0);await mutate('customModeTrigger.disabled=false');
 await click('[data-ff-correction-delete]'); assert.deepEqual(await js("JSON.parse(localStorage.getItem('ff-desktop-combat-corrections-v1:/campaign-one'))"),[]);
 assert.equal(await identity(),true); assert.equal(await js('submits.length'),1);
 await configure(true,'ru'); assert.equal(await js("document.querySelector('[data-ff-combat-corrections] summary').textContent"),'Поправки к броску'); assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]')"),null);
 assert.equal(await js("document.querySelector('[data-ff-combat-corrections]').getAttribute('data-ff-translation-ignore')"),'true');
 await configure(true,'en'); assert.equal(await js("document.querySelector('[data-ff-combat-corrections] summary').textContent"),'Roll corrections');
 await mutate('mount()'); await until("document.querySelectorAll('[data-ff-combat-corrections]').length===1"); assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]')"),null); assert.equal(await js('state.modifier_value'),'0'); assert.equal(await identity(),true);
 await configure(false); await mutate("localStorage.setItem('ff-desktop-combat-corrections-v1:/campaign-one','[{\"name\":\"bad\",\"values\":{\"modifier_value\":999,\"proficiency_bonus\":2}}]')");
 await configure(); assert.equal(await js("document.querySelector('[data-ff-correction-presets]').options.length"),1,'Malformed presets ignored.');
 await configure(false); await mutate("window.storageDescriptor=Object.getOwnPropertyDescriptor(Storage.prototype,'setItem');Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError')}");
 await configure(); await set('[data-ff-correction-name]','Blocked'); await click('[data-ff-correction-save]');
 assert.match(await js("document.querySelector('[data-ff-combat-corrections] [role=status]').textContent"),/unavailable/);
 assert.equal(await js("document.querySelector('[data-ff-correction-presets]').options.length"),1);
 await click('[data-ff-correction-modifier_value-plus]'); assert.equal(await js('state.modifier_value'),'1','Storage failures do not break manual corrections.');
 await configure(false); await mutate("window.getDescriptor=Object.getOwnPropertyDescriptor(Storage.prototype,'getItem');Storage.prototype.getItem=function(){throw new DOMException('blocked','SecurityError')}"); await configure(); assert.equal(await js("document.querySelector('[data-ff-correction-presets]').options.length"),1); await mutate("Object.defineProperty(Storage.prototype,'getItem',getDescriptor)");
 await mutate("Object.defineProperty(Storage.prototype,'setItem',storageDescriptor);history.pushState({},'', '/campaign-two/play');dispatchEvent(new PopStateEvent('popstate'))");
 await until("document.querySelector('[data-ff-correction-presets]').options.length===1"); assert.equal(await js('state.modifier_value'),'1');
 await mutate("history.pushState({},'', '/campaign-two/details');dispatchEvent(new PopStateEvent('popstate'))"); await until("!document.querySelector('[data-ff-combat-corrections]')");
 await mutate("history.pushState({},'', '/campaign-two/play');dispatchEvent(new PopStateEvent('popstate'))"); await until("!!document.querySelector('[data-ff-combat-corrections]')");
 await configure(false); assert.equal(await js("document.querySelector('[data-ff-correction-shortcut]')"),null); assert.equal(await js("document.querySelector('[data-ff-combat-corrections-style]')"),null); assert.equal(await js("document.querySelector('[data-ff-combat-corrections]')"),null); assert.equal(await identity(),true);
 assert.equal(await js('submits.length'),1); assert.ok(await js('changes>0&&inputs>0'));
 await configure(false); await mutate('mountPending()');
 const pendingIdentity=()=>js("pendingNative.form===document.querySelector('#pending-form')&&pendingNative.message===document.querySelector('textarea')&&pendingNative.message.value==='pending message'&&pendingNative.cards.every(x=>x.card.isConnected&&x.target.isConnected&&x.target.getAttribute('aria-checked')==='true')");
 await configure(); await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
 await mutate("pendingNative.list.scrollTop=12;window.pendingScroll=pendingNative.list.scrollTop");
 assert.equal(await pendingIdentity(),true);
 assert.equal(await js('pendingWrites.length'),0,'Discovery must never change native values.');
 const weapon='[data-ff-pending-corrections="0"]',spell='[data-ff-pending-corrections="1"]';
 await click(weapon+' summary');await testDisclosure(weapon+' summary');assert.equal(await js('pendingSubmits'),0);
 await set(weapon+' [data-ff-correction-value=modifier_value]','4');await click(weapon+' [data-ff-correction-apply-modifier_value]');
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),4,'Actual RHF pending value changes.');
 assert.equal(await js('pendingCards[0].fieldAttack.modifier_value'),0,'Native field-array snapshot is never counterfeited.');
 assert.equal(await js('pendingNative.list.scrollTop===pendingScroll'),true,'Correction preserves native scroll.');
 await mutate("const ability=document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-ability]');ability.value='dexterity';ability.dispatchEvent(new Event('change',{bubbles:true}))");
 assert.equal(await js('pendingValues.attacks[0].modifier_stat'),'dexterity');assert.equal(await js('pendingValues.attacks[0].modifier_value'),3,'Ability uses native adjusted character stat.');
 await click(spell+' summary'); await click(spell+' [data-ff-correction-proficiency_bonus-plus]');assert.equal(await js('pendingValues.attacks[1].proficiency_bonus'),4,'Spell uses its own exact array index.');
 for(const value of ['11','-11','1e1']){await set(weapon+' [data-ff-correction-value=modifier_value]',value);await click(weapon+' [data-ff-correction-apply-modifier_value]');}
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),3,'Native bounds and decimal input rules enforced.');
 await set(spell+' [data-ff-correction-value=proficiency_bonus]','-1');await click(spell+' [data-ff-correction-apply-proficiency_bonus]');assert.equal(await js('pendingValues.attacks[1].proficiency_bonus'),4);
 assert.equal(await js("pendingWrites.every(x=>/^attacks\\.[01]\\.(modifier_stat|modifier_value|proficiency_bonus)$/.test(x.name)&&x.options.shouldDirty===true&&x.options.shouldValidate===true)"),true,'Only permitted native leaves are written with validation.');
 assert.deepEqual(await js('pendingValues.attacks[0].targets'),[{id:1,name:'Wolf',ac:12}]);assert.deepEqual(await js('pendingValues.attacks[0].damage_rolls'),[{dice_count:1,dice_size:8,fixed_damage_bonus:0}]);
 assert.equal(await js("pendingValues.message==='pending message'&&pendingValues.attacks[0].description==='weapon description'"),true);
 await mutate("document.querySelector('#pending-form button[type=submit]').disabled=true");await until("document.querySelector('[data-ff-pending-corrections=\"0\"] input')?.disabled===true");await click(weapon+' [data-ff-correction-modifier_value-plus]');assert.equal(await js('pendingValues.attacks[0].modifier_value'),3,'Current native turn/submitting restriction respected.');
 await mutate("document.querySelector('#pending-form button[type=submit]').disabled=false");await until("document.querySelector('[data-ff-pending-corrections=\"0\"] input')?.disabled===false");
 await configure(true,'ru');assert.equal(await js("document.querySelector('[data-ff-pending-corrections] summary').textContent"),'Поправки к броску');assert.deepEqual(await js("Array.from(document.querySelector('[data-ff-correction-ability]').options).slice(1).map(option=>option.textContent)"),['СИЛ — Сила','ЛОВ — Ловкость','ТЕЛ — Телосложение','ИНТ — Интеллект','МДР — Мудрость','ХАР — Харизма']);assert.equal(await pendingIdentity(),true);assert.equal(await js('pendingSubmits'),0);
 // Explicitly save once, then a new RHF control and ephemeral row UUID
 // must reuse the stable equipped/inventory catalog identity automatically.
 await configure(true,'en');
 assert.equal(await js("!!document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-save-here]')"),true,'Selected weapon exposes Save here.');
 for(const width of [280,390]){
  await mutate(`document.querySelector('section').style.width='${width}px'`);await configure(true,'ru');
  const fit=await js("(()=>{const node=document.querySelector('[data-ff-pending-corrections=\"0\"]'),box=node.getBoundingClientRect();return ['save-here','clear-default'].every(marker=>{const button=node.querySelector('[data-ff-correction-'+marker+']'),rect=button.getBoundingClientRect();return rect.width>0&&rect.height>=28&&rect.left>=box.left&&rect.right<=box.right})})()");
  assert.equal(fit,true,'Localized default controls fit '+width+'px without truncation.');
 }
 await mutate("document.querySelector('section').style.width='308px'");await configure(true,'en');
 await click(weapon+' [data-ff-correction-proficiency_bonus-plus]');
 await click(weapon+' [data-ff-correction-save-here]');
 assert.match(await js("document.querySelector('[data-ff-pending-corrections=\"0\"] [role=status]').textContent"),/saved/i);
 await mutate('mountPending()');await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
 await until("pendingValues.attacks[0].modifier_stat==='dexterity'&&pendingValues.attacks[0].modifier_value===3");
 assert.equal(await js('pendingValues.attacks[0].proficiency_bonus'),1);
 assert.equal(await js('pendingWrites.length'),3,'Saved default writes only three permitted leaves once.');
 assert.equal(await pendingIdentity(),true);assert.equal(await js('pendingSubmits'),0);
 await click(weapon+' summary');await click(weapon+' [data-ff-correction-modifier_value-plus]');
 await new Promise(resolve=>setTimeout(resolve,650));
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),4,'Manual correction survives subsequent polling.');
 // Removing owned details keeps the same control/row handled, including
 // controller restart while native leaf state records a manual correction.
 await mutate("document.querySelector('[data-ff-pending-corrections=\"0\"]').remove()");await until("!!document.querySelector('[data-ff-pending-corrections=\"0\"]')");
 await new Promise(resolve=>setTimeout(resolve,600));assert.equal(await js('pendingValues.attacks[0].modifier_value'),4);
 await configure(false);await configure();await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),4,'Pre-existing dirty leaves block reapplication after controller restart.');
 await configure(false);await mutate('mountPending()');await configure();await until("pendingValues.attacks[0].modifier_value===3");
 assert.equal(await js('pendingValues.attacks[0].modifier_stat'),'dexterity','Persistence survives controller restart on a fresh native form.');
 await mutate("window.savedDefaults=localStorage.getItem('ff-desktop-attack-defaults-v1:/campaign-two')");
 // A unique no-image catalog entry is still identifiable; images must
 // match exactly whenever either side supplies one.
 await mutate("pendingWeaponOverride={image:undefined};pendingCharacterOverride={two_handed:{id:568,name:'Vicious Weapon'},inventory:[{item:{id:568,name:'Vicious Weapon'}}]};mountPending()");await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
 assert.equal(await js("document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-save-here]').disabled"),false,'Unique catalog entries without images can be saved.');
 await click(weapon+' summary');await click(weapon+' [data-ff-correction-proficiency_bonus-plus]');await click(weapon+' [data-ff-correction-save-here]');
 await mutate('mountPending()');await until("pendingValues.attacks[0].proficiency_bonus===1");assert.equal(await js('pendingWrites.length'),3);
 await click(weapon+' summary');await click(weapon+' [data-ff-correction-clear-default]');await mutate('pendingWeaponOverride={};pendingCharacterOverride={};mountPending()');await until("pendingValues.attacks[0].modifier_value===3");
 // Scopes use stable catalog identities, never ephemeral row UUIDs.
 assert.equal(await js("savedDefaults.includes('native-field-')"),false);
 await mutate("pendingWeaponOverride={type:'ranged'};mountPending()");await until("pendingValues.attacks[0].modifier_value===3");assert.equal(await js('pendingValues.attacks[0].modifier_stat'),'dexterity','Per-weapon override also applies to its ranged attack.');await mutate('pendingWeaponOverride={}');
 for(const mutation of ["pendingCharacterOverride={id:83026156}","pendingWeaponOverride={image:'foreign.webp'}","pendingCharacterOverride={two_handed:{id:567,name:'Vicious Weapon',image:'weapon.webp'},inventory:[]}","pendingCharacterOverride={two_handed:null,inventory:[]}","pendingCharacterOverride={inventory:[{item:{id:567,name:'Vicious Weapon',image:'weapon.webp'}}]}"]){
  await mutate(mutation+';mountPending()');await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js('pendingWrites.length'),0,'Foreign, missing or ambiguous catalog identity cannot auto-apply.');
  await mutate('pendingCharacterOverride={};pendingWeaponOverride={}');
 }
 await mutate("history.pushState({},'', '/campaign-three/play');dispatchEvent(new PopStateEvent('popstate'));mountPending()");await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js('pendingWrites.length'),0,'Campaign scope is isolated.');
 await mutate("history.pushState({},'', '/campaign-two/play');dispatchEvent(new PopStateEvent('popstate'));pendingBlocked=true;mountPending()");await until("document.querySelector('[data-ff-pending-corrections=\"0\"] input')?.disabled===true");
 assert.equal(await js('pendingWrites.length'),0,'Wait for writable native form before applying.');
 await mutate("pendingBlocked=false;document.querySelector('#pending-form button[type=submit]').disabled=false");await until("pendingValues.attacks[0].modifier_value===3");
 await mutate('pendingBlocked=true;mountPending()');await until("document.querySelector('[data-ff-pending-corrections=\"0\"] input')?.disabled===true");
 await mutate("pendingMethods.setValue('attacks.0.modifier_value',9,{shouldDirty:true,shouldValidate:true});pendingBlocked=false;document.querySelector('#pending-form button[type=submit]').disabled=false");await until("document.querySelector('[data-ff-pending-corrections=\"0\"] input')?.disabled===false");
 await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js('pendingValues.attacks[0].modifier_value'),9,'Edits while awaiting writable form prevent later automatic apply.');
 await configure(false);await mutate("mountPending();pendingMethods.setValue('attacks.0.modifier_stat','strength',{shouldDirty:true,shouldValidate:true})");await configure();await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");await new Promise(resolve=>setTimeout(resolve,550));
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),0,'Dirty native leaf before discovery blocks auto-fill even when its value matches the initial snapshot.');assert.equal(await js('pendingWrites.length'),1);
 await configure(false);await mutate('mountPending();delete pendingMethods.getFieldState');await configure();await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js('pendingWrites.length'),0,'Missing native dirty-state proof fails closed.');
 await mutate("Storage.prototype.getItem=function(){throw new DOMException('blocked','SecurityError')};mountPending()");await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js('pendingWrites.length'),0);await mutate("Object.defineProperty(Storage.prototype,'getItem',getDescriptor)");
 // Invalid, oversized and unavailable storage never supplies defaults.
 for(const raw of ['{bad','{\"version\":2,\"entries\":[]}',JSON.stringify({version:1,entries:[{character:'n:83026155',catalog:'n:566',type:'melee',ability:'dexterity',modifier_value:11,proficiency_bonus:0}]}),'x'.repeat(32769)]){
  await mutate(`localStorage.setItem('ff-desktop-attack-defaults-v1:/campaign-two',${JSON.stringify(raw)});mountPending()`);await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js('pendingWrites.length'),0);
 }
 await mutate("localStorage.setItem('ff-desktop-attack-defaults-v1:/campaign-two',savedDefaults);Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError')};mountPending()");await until("pendingValues.attacks[0].modifier_value===3");
 await click(weapon+' summary');await click(weapon+' [data-ff-correction-save-here]');assert.match(await js("document.querySelector('[data-ff-pending-corrections=\"0\"] [role=status]').textContent"),/unavailable/);
 await mutate("Object.defineProperty(Storage.prototype,'setItem',storageDescriptor)");
 await click(weapon+' [data-ff-correction-modifier_value-plus]');
 await click(weapon+' [data-ff-correction-clear-default]');
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),4,'Clear leaves the pending form intact.');
 await mutate('mountPending()');await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
 await new Promise(resolve=>setTimeout(resolve,600));assert.equal(await js('pendingWrites.length'),0,'Cleared default cannot affect future forms.');
 await click(spell+' summary');await click(spell+' [data-ff-correction-proficiency_bonus-plus]');await click(spell+' [data-ff-correction-save-here]');
 await mutate('mountPending()');await until("pendingValues.attacks[1].proficiency_bonus===4");
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),0,'Spell default cannot affect weapon row.');assert.equal(await js('pendingValues.attacks[1].modifier_stat'),'intelligence');assert.equal(await js('pendingValues.attacks[1].modifier_value'),2);
 assert.equal(await js("pendingWrites.length===3&&pendingWrites.every(write=>write.name.startsWith('attacks.1.'))"),true,'Spell catalog default writes only matching spell leaves.');
 await click(spell+' summary');await click(spell+' [data-ff-correction-clear-default]');await mutate('mountPending()');await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js('pendingWrites.length'),0);
 // Four scopes: individual overrides take precedence over weapon/spell
 // defaults; destructive overwrite remains within this character/category.
 await mutate("localStorage.setItem('ff-desktop-attack-defaults-v1:/campaign-two',JSON.stringify({version:1,entries:[]}));mountPending()");await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
 assert.equal(await js("['save-here','clear-default','save-default','overwrite-all'].every(marker=>document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-'+marker+']'))"),true,'Four separate saved correction actions are available.');
 await click(weapon+' summary');await click(weapon+' [data-ff-correction-modifier_value-plus]');await click(weapon+' [data-ff-correction-save-here]');
 await click(weapon+' [data-ff-correction-modifier_value-plus]');await click(weapon+' [data-ff-correction-save-default]');
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),2,'Saving category default preserves the current edited form.');
 await mutate('mountPending()');await until("pendingValues.attacks[0].modifier_value===1");
 await mutate("pendingWeaponOverride={name:'Longbow',type:'ranged',image:'bow.webp'};mountPending()");await until("pendingValues.attacks[0].modifier_value===2");
 assert.equal(await js('pendingValues.attacks[1].modifier_value'),2,'Weapon default does not change spells.');
 await click(spell+' summary');await click(spell+' [data-ff-correction-save-here]');await set(spell+' [data-ff-correction-value=modifier_value]','5');await click(spell+' [data-ff-correction-apply-modifier_value]');await click(spell+' [data-ff-correction-save-default]');
 await mutate("const key='ff-desktop-attack-defaults-v1:/campaign-two',data=JSON.parse(localStorage.getItem(key));data.entries.push({...data.entries[0],character:'n:83026156'});localStorage.setItem(key,JSON.stringify(data));window.foreignDefault=JSON.stringify(data.entries[data.entries.length-1]);window.customPresetBefore=localStorage.getItem('ff-desktop-combat-corrections-v1:/campaign-two');localStorage.setItem('ff-desktop-attack-defaults-v1:/foreign-campaign','other campaign unchanged')");
 await click(weapon+' summary');await set(weapon+' [data-ff-correction-value=modifier_value]','6');await click(weapon+' [data-ff-correction-apply-modifier_value]');await click(weapon+' [data-ff-correction-overwrite-all]');
 await mutate('pendingWeaponOverride={};mountPending()');await until("pendingValues.attacks[0].modifier_value===6");assert.equal(await js('pendingValues.attacks[1].modifier_value'),2,'Weapon overwrite retains spell override.');
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-attack-defaults-v1:/campaign-two')).version"),2,'Validated v1 storage migrates atomically to v2 on explicit save.');
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-attack-defaults-v1:/campaign-two')).entries.some(entry=>JSON.stringify(entry)===foreignDefault)"),true,'Overwrite preserves foreign-character overrides.');
 assert.equal(await js("localStorage.getItem('ff-desktop-attack-defaults-v1:/foreign-campaign')"),'other campaign unchanged');assert.equal(await js("localStorage.getItem('ff-desktop-combat-corrections-v1:/campaign-two')===customPresetBefore"),true,'Category writes preserve manual presets.');
 await click(weapon+' summary');await set(weapon+' [data-ff-correction-value=modifier_value]','4');await click(weapon+' [data-ff-correction-apply-modifier_value]');await click(weapon+' [data-ff-correction-save-here]');await click(weapon+' [data-ff-correction-clear-default]');
 assert.equal(await js('pendingValues.attacks[0].modifier_value'),4,'Delete here removes only the override, preserving current values.');
 await mutate('mountPending()');await until("pendingValues.attacks[0].modifier_value===6");
 // Native roll mode is explicitly current-roll only, never part of defaults.
 await click(weapon+' summary');await mutate("const mode=document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-roll-mode]');mode.value='advantage';mode.dispatchEvent(new Event('change',{bubbles:true}))");
 assert.equal(await js('pendingValues.attacks[0].attack_roll_type'),'advantage');
 await mutate("const mode=document.querySelector('[data-ff-pending-corrections=\"0\"] [data-ff-correction-roll-mode]');mode.value='disadvantage';mode.dispatchEvent(new Event('change',{bubbles:true}))");assert.equal(await js('pendingValues.attacks[0].attack_roll_type'),'disadvantage');await click(weapon+' [data-ff-correction-save-here]');
 assert.equal(await js("localStorage.getItem('ff-desktop-attack-defaults-v1:/campaign-two').includes('attack_roll_type')"),false);
 await mutate('mountPending()');await until("pendingValues.attacks[0].modifier_value===6");assert.equal(await js('pendingValues.attacks[0].attack_roll_type'),'normal','New native rows retain native roll mode, never saved advantage.');
 await click(spell+' summary');await click(spell+' [data-ff-correction-overwrite-all]');
 await mutate('mountPending()');try{await until("pendingValues.attacks[0].modifier_value===6&&pendingValues.attacks[1].modifier_value===2&&pendingWrites.length===6")}catch(error){const diagnostic=await js("({values:pendingValues.attacks.map(attack=>({type:attack.type,modifier_stat:attack.modifier_stat,modifier_value:attack.modifier_value,proficiency_bonus:attack.proficiency_bonus})),writes:pendingWrites.slice(),storage:localStorage.getItem('ff-desktop-attack-defaults-v1:/campaign-two')})");throw Error(`Spell overwrite defaults did not settle: ${JSON.stringify(diagnostic)}; ${error.message}`)}assert.equal(await js('pendingValues.attacks[0].modifier_value'),6,'Spell overwrite preserves weapon override/default.');assert.equal(await js('pendingValues.attacks[1].modifier_value'),2,'Spell overwrite preserves its current displayed value when overwriting the category default.');
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-attack-defaults-v1:/campaign-two')).entries.some(entry=>entry.character==='n:83026155'&&entry.type==='spell')"),false);
 for(const unsupported of ["pendingWeaponOverride={attack_roll_type:undefined}","pendingWeaponOverride={attack_roll_type:'invented'}"]){
  await mutate(unsupported+';mountPending()');await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");assert.equal(await js("pendingCards[0].card.querySelector('[data-ff-correction-roll-mode]').getClientRects().length"),0,'Unsupported native mode never creates a visible control.');
 }
 await mutate('pendingWeaponOverride={};mountPending()');await until("document.querySelectorAll('[data-ff-pending-corrections]').length===2");
 assert.equal(await pendingIdentity(),true);assert.equal(await js('pendingSubmits'),0);
 await mutate('pendingCards[0].wrapper.remove()');await until("document.querySelectorAll('[data-ff-pending-corrections]').length===1");
 await configure(false);assert.equal(await js("document.querySelector('[data-ff-pending-corrections]')"),null);assert.equal(await js('pendingSubmits'),0);
 await configure();await mutate('mountCheckMode()');await until("document.querySelector('[data-ff-check-corrections]')");
 await click('[data-ff-check-corrections] summary');
 for(const value of ['advantage','disadvantage','normal']){await mutate(`const mode=document.querySelector('[data-ff-check-corrections] select');mode.value='${value}';mode.dispatchEvent(new Event('change',{bubbles:true}))`);assert.equal(await js('checkMode'),value);}
 assert.deepEqual(await js('checkModeWrites'),['advantage','disadvantage','normal']);
 assert.equal(await js("document.querySelectorAll('[data-ff-check-corrections] button,[data-ff-check-corrections] input').length"),0,'Check mode has no save controls or fabricated numeric fields.');
 await mutate("delete checkModeParent.memoizedProps.numberOfDice;delete checkModeParent.memoizedProps.setNumberOfDice;delete checkModeParent.memoizedProps.typeOfDie;delete checkModeParent.memoizedProps.setTypeOfDie;checkModeParent.memoizedProps.standardDiceNotation='1d20';checkModeParent.memoizedProps.setStandardDiceNotation=()=>{}");await configure();await until("document.querySelector('[data-ff-check-corrections]')");
 await mutate("const mode=document.querySelector('[data-ff-check-corrections] select');mode.value='advantage';mode.dispatchEvent(new Event('change',{bubbles:true}))");assert.equal(await js('checkMode'),'advantage','Native standard notation uses its own shared advantage setter.');
 await mutate('delete checkModeParent.memoizedProps.standardDiceNotation;delete checkModeParent.memoizedProps.setStandardDiceNotation;checkModeParent.memoizedProps.manualRollTotal=20;checkModeParent.memoizedProps.manualDiceResults=[]');await until("!document.querySelector('[data-ff-check-corrections]')");
 await mutate('mountCheckMode()');await until("document.querySelector('[data-ff-check-corrections]')");
 await mutate('checkModeTrigger.hidden=true');await until("!document.querySelector('[data-ff-check-corrections]')");
 await mutate('checkModeTrigger.hidden=false;checkModeParent.memoizedProps.setSelectedVantage=()=>{}');await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js("!!document.querySelector('[data-ff-check-corrections]')"),false,'Mismatched native setter fails closed.');
 await mutate('mountCheckMode();checkModeTrigger.disabled=true');await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js("!!document.querySelector('[data-ff-check-corrections]')"),false);
 await mutate('mountCheckMode();checkModeOwner.memoizedProps.selectedVantage="invented"');await new Promise(resolve=>setTimeout(resolve,550));assert.equal(await js("!!document.querySelector('[data-ff-check-corrections]')"),false);
 await mutate('mountCheckMode()');await until("document.querySelector('[data-ff-check-corrections]')");await configure(false);assert.equal(await js("!!document.querySelector('[data-ff-check-corrections]')"),false);
 console.log('Combat corrections fixture PASS'); window.destroy(); clearTimeout(timer); app.exit(0);
})().catch(error=>{console.error(error);window?.destroy();clearTimeout(timer);app.exit(1)});
