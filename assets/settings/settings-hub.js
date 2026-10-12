'use strict';
const api=window.settingsHub,sections=['campaign','appearance','translation','instructions','music','combat','general'];
const labels={en:['Campaign','Appearance','Translation','/sp','Music','Combat','General'],ru:['Кампания','Оформление','Перевод','/sp','Музыка','Бой','Общие']};
let state, combat, savingCombat=false, combatRead=0, readingCombat=false;
function render(value){state=value;combat=state.combat;const ru=state.locale==='ru';window.settingsTheme.apply(state.theme);document.querySelector('nav').setAttribute('aria-label',ru?'Разделы настроек':'Settings sections');document.getElementById('title').textContent=ru?'Настройки':'Settings';document.getElementById('close').ariaLabel=ru?'Закрыть настройки':'Close settings';document.getElementById('close').title=ru?'Закрыть настройки':'Close settings';const external=['campaign','appearance','translation','instructions'].includes(state.section);document.querySelector('#content').hidden=external;document.getElementById('close').hidden=external;document.getElementById('sections').replaceChildren(...sections.flatMap((s,i)=>{if(!state.campaignAvailable&&['campaign','combat'].includes(s))return []; const b=document.createElement('button');b.textContent=labels[ru?'ru':'en'][i];b.disabled=s==='campaign'&&!state.campaignAvailable;b.setAttribute('aria-current',s===state.section?'page':'false');b.onclick=()=>api.select(s).catch(showError);return b;}));for(const s of ['music','combat','general'])document.getElementById(s).hidden=s!==state.section;document.querySelector('#music h1').textContent=ru?'Музыка':'Music';document.querySelector('#music p').textContent=ru?'Настройки музыки появятся здесь, когда будут доступны.':'Music preferences will appear here when available.';document.querySelector('#general h1').textContent=ru?'Общие':'General';document.getElementById('hide-label').textContent=ru?'Скрывать верхнюю панель приложения в полноэкранном режиме':'Hide desktop top bar in fullscreen';document.getElementById('help').textContent=ru?'Alt+Enter или F11 — полноэкранный режим. Ctrl+Shift+B — показать или скрыть верхнюю панель приложения.':'Alt+Enter or F11 enters/exits fullscreen. Ctrl+Shift+B toggles the desktop top bar.';document.getElementById('hide-bar').checked=state.hideDesktopTopbarInFullscreen;renderCombat();if(state.section==='combat')void refreshCombat();}
function showError(error){document.getElementById('error').textContent=String(error.message||error);}
document.getElementById('close').onclick=()=>api.close().catch(showError);
document.getElementById('hide-bar').onchange=async event=>{const input=event.target;input.disabled=true;try{render(await api.saveGeneral(input.checked));}catch(error){showError(error);input.checked=state.hideDesktopTopbarInFullscreen;renderCombat();if(state.section==='combat')void refreshCombat();}finally{input.disabled=false;}};
api.onChange(render);api.get().then(render).catch(showError);

function renderCombat(){
 const ru=state.locale==='ru';
 document.querySelector('#combat h1').textContent=ru?'Бой':'Combat';
 document.getElementById('combat-unavailable').textContent=combat?'':ru?'Откройте кампанию, чтобы изменить настройки боя.':'Open a campaign to change combat settings.';
 document.getElementById('automatic-damage-label').textContent=ru?'Автоматический урон после моего попадания':'Automatic damage after my hit';
 document.getElementById('hide-intermediate-franz-label').textContent=ru?'Скрывать связанный промежуточный ответ Франца':"Hide Franz’s linked intermediate response";
 document.getElementById('hide-damage-prompt-label').textContent=ru?'Скрывать связанную карточку запроса урона после автоматического броска':'Hide the linked damage prompt after the automatic roll';
 document.getElementById('combat-note').textContent=ru?'Для одной атаки и одной цели. Ожидает кнопку урона игры. Скрытие действует только локально; генерация ответа и расходы сохраняются.':'For one attack and one target. Waits for the game’s Damage button. Hiding affects local display only; response generation and costs remain.';
 const auto=document.getElementById('automatic-damage'),hide=document.getElementById('hide-intermediate-franz'),prompt=document.getElementById('hide-damage-prompt');
 auto.checked=!!combat?.automaticDamage;hide.checked=!!combat?.hideIntermediateFranz;prompt.checked=!!combat?.hideDamagePrompt;
 auto.disabled=savingCombat||!combat;hide.disabled=savingCombat||!combat?.automaticDamage;prompt.disabled=savingCombat||!combat?.automaticDamage;
}
function combatError(error){document.getElementById('combat-error').textContent=String(error.message||error);}
async function refreshCombat(){
 if(savingCombat||readingCombat)return;
 readingCombat=true;const read=++combatRead;
 try{const value=await api.getCombat();if(read===combatRead&&!savingCombat){combat=value;renderCombat();}}catch(error){if(read===combatRead){combat=null;renderCombat();combatError(error);}}finally{readingCombat=false;}
}
async function saveCombat(){
 if(!combat||savingCombat)return;
 const value={campaignId:combat.campaignId,automaticDamage:document.getElementById('automatic-damage').checked,hideIntermediateFranz:document.getElementById('hide-intermediate-franz').checked,hideDamagePrompt:document.getElementById('hide-damage-prompt').checked};
 savingCombat=true;++combatRead;renderCombat();document.getElementById('combat-error').textContent='';
 try{combat=await api.saveCombat(value);}catch(error){combatError(error);combat=null;}finally{savingCombat=false;renderCombat();void refreshCombat();}
}
document.getElementById('automatic-damage').onchange=saveCombat;
document.getElementById('hide-intermediate-franz').onchange=saveCombat;
document.getElementById('hide-damage-prompt').onchange=saveCombat;
// Only the active, visible Combat section polls one bounded preference read.
setInterval(()=>{if(state?.section==='combat'&&document.visibilityState==='visible')void refreshCombat();},1000);
