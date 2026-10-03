(() => {
  const $=id=>document.getElementById(id);
  const russian={
    'Saved /sp instructions':'Сохранённые инструкции /sp','Close saved instructions settings':'Закрыть настройки инструкций','Attach your saved guidance when sending a message to Franz.':'Добавляйте сохранённые указания к сообщениям для Франца.',
    'Append /sp to my messages':'Добавлять /sp к моим сообщениям','Instructions for Franz':'Инструкции для Франца','Adventure instructions':'Инструкции для приключения','Combat instructions':'Инструкции для боя','Use different instructions during combat':'Другие инструкции во время боя',
    'Combat starts and ends select the profile automatically. Leave this option off to use adventure instructions everywhere.':'При начале и завершении боя профиль переключается автоматически. Отключите эту настройку, чтобы всегда использовать инструкции для приключения.',
    'Add combat instructions before enabling the combat profile.':'Введите инструкции для боя, прежде чем включить боевой профиль.','Scene continuity':'Согласованность сцены','Character reactions':'Реакции персонажей','Separated party':'Разделённая группа',
    'Templates are editable. They add narration guidance and do not change game mechanics.':'Шаблоны можно редактировать. Они задают стиль повествования и не меняют игровые механики.',
    'Show marked instructions in chat':'Показывать отмеченные инструкции в чате',
    'Instructions are included in the shared message sent to the website. This app hides the marked sections by default. Browser users and other clients can still read the stored text. Use this for narration guidance, not secrets.':'Инструкции включаются в общее сообщение, отправляемое сайту. Это приложение скрывает отмеченные части по умолчанию. Пользователи браузера и других клиентов могут прочитать сохранённый текст. Используйте эту функцию для указаний по повествованию, а не для секретов.',
    'Saved on this computer for all campaigns. Players Only messages skip /sp. /sp opens these settings; Shift+Enter never sends. Settings are excluded from exported themes.':'Настройки сохраняются на этом компьютере для всех кампаний. В режиме «Только игроки» /sp не добавляется. Команда /sp открывает это окно; Shift+Enter не отправляет сообщение. Настройки не включаются в экспорт тем.',
    'Preview the attached text':'Посмотреть добавляемый текст','Save instructions':'Сохранить инструкции','Loading preferences…':'Загрузка настроек…',
    'Instructions saved.':'Инструкции сохранены.','Could not load preferences.':'Не удалось загрузить настройки.','Could not save instructions.':'Не удалось сохранить инструкции.',
    'Unsaved changes.':'Есть несохранённые изменения.',
    'Add instructions before enabling /sp.':'Введите инструкции, прежде чем включить /sp.','Use up to 4,000 characters without reserved /sp markers.':'Введите до 4 000 символов без служебных меток /sp.',
  };
  const templates={
    continuity:['Keep continuity with the established scene and character details. Ask for clarification when those details conflict.','Сохраняй согласованность с установленными деталями сцены и персонажей. Если детали противоречат друг другу, уточни их.'],
    characters:["Base NPC reactions on the character's established appearance, background, and behavior. Mention relevant details in the narration.",'Основывай реакции НИП на установленной внешности, предыстории и поведении персонажа. Упоминай уместные детали в повествовании.'],
    party:["When party members are separated, briefly describe each group's current situation when relevant, without inventing events the characters could not observe.",'Когда участники группы разделены, при необходимости кратко описывай положение каждой части группы. Не выдумывай события, которых персонажи не могли наблюдать.'],
  };
  let locale='en',note='Loading preferences…',failed=false,busy=false;
  const text=value=>locale==='ru'?russian[value]??value:value;
  function status(value,error=false){note=value;failed=error;$('status').textContent=text(value);$('status').classList.toggle('error',error);}
  function preview(){$('combat-count').textContent=`${$('combat-instructions').value.length.toLocaleString(locale==='ru'?'ru-RU':'en-US')} / ${locale==='ru'?'4 000':'4,000'}`;const value=$('instructions').value.trim();$('count').textContent=`${$('instructions').value.length.toLocaleString(locale==='ru'?'ru-RU':'en-US')} / ${locale==='ru'?'4 000':'4,000'}`;$('preview').textContent=value?`[[FF-SP:1]]\nAdditional guidance for Franz; apply to this message, not as player dialogue:\n${value}\n[[/FF-SP:1]]`:'';}
  function applyInterface(state){locale=state.locale;document.documentElement.lang=locale;document.title=`${text('Saved /sp instructions')} — Friends & Fables Desktop`;window.settingsTheme.apply(state.theme);for(const element of document.querySelectorAll('[data-label]'))element.textContent=text(element.dataset.label);const close=$('close-instructions');close.setAttribute('aria-label',text('Close saved instructions settings'));close.title=text('Close saved instructions settings');status(note,failed);preview();}
  for(const [id,values] of Object.entries(templates))$(id).addEventListener('click',()=>{const existing=$('instructions').value.trim(),addition=values[locale==='ru'?1:0];const value=[existing,addition].filter(Boolean).join('\n');if(value.length>4000){status('Use up to 4,000 characters without reserved /sp markers.',true);return;}$('instructions').value=value;preview();status('Unsaved changes.');});
  for(const id of ['instructions','combat-instructions'])$(id).addEventListener('input',()=>{preview();status('Unsaved changes.');});
  for(const id of ['enabled','show-marked','combat-enabled'])$(id).addEventListener('change',()=>status('Unsaved changes.'));
  $('close-instructions').addEventListener('click',()=>{void window.hostInstructions.close().catch(console.error);});
  $('instructions-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const value={text:$('instructions').value,combatText:$('combat-instructions').value,combatEnabled:$('combat-enabled').checked,enabled:$('enabled').checked,hideMarked:!$('show-marked').checked};
    if([value.text,value.combatText].some(text=>text.length>4000||/\[\[(?:\/)?FF-SP:1\]\]/.test(text)||text.includes('\0'))){status('Use up to 4,000 characters without reserved /sp markers.',true);return;}
    if(value.enabled&&!value.text.trim()){status('Add instructions before enabling /sp.',true);return;}
    if(value.combatEnabled&&!value.combatText.trim()){status('Add combat instructions before enabling the combat profile.',true);return;}
    busy=true;$('save').disabled=true;
    try{await window.hostInstructions.save(value);status($('instructions').value===value.text&&$('combat-instructions').value===value.combatText&&$('combat-enabled').checked===value.combatEnabled&&$('enabled').checked===value.enabled&&!$('show-marked').checked===value.hideMarked?'Instructions saved.':'Unsaved changes.');}catch{status('Could not save instructions.',true);}
    finally{busy=false;$('save').disabled=false;}
  });
  window.hostInstructions.onInterface(applyInterface);
  void window.hostInstructions.get().then(state=>{$('instructions').value=state.settings.text;$('combat-instructions').value=state.settings.combatText??'';$('combat-enabled').checked=state.settings.combatEnabled===true;$('enabled').checked=state.settings.enabled;$('show-marked').checked=!state.settings.hideMarked;$('options').disabled=false;note='';applyInterface(state);}).catch(()=>status('Could not load preferences.',true));
})();
