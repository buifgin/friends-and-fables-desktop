const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {mkdtemp,readFile,rm} = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {translationPlan,renderTranslation,validateTranslationMarkers,validateTranslation,DEFAULT_TRANSLATION,RUSSIAN_DICTIONARY}=require('../../dist/translation/translation-core');
const {TranslationCache}=require('../../dist/translation/translation-cache');
const {LocalTranslator}=require('../../dist/translation/local-translator');

test('mixed Russian, names, dice, URLs, whitespace, and long prose are preserved around English fragments',()=>{
 for(const value of ['The inn is open. Привет, путник! Take a seat.','Franz greets Aria. Брось 1d20 + 5. Visit https://example.com/room.',
  '  Wisdom saving throw\n','Visit https://example.com/Русская-страница then greet E. Mira. ','Привет, мир!','A quiet road.\n\nA bright moon.', 'The tall forest grows. '.repeat(200)]){
  const plan=translationPlan(value,['Franz','Aria','E. Mira']);assert.equal(plan.map(part=>part.text).join(''),value);
  for(const part of plan.filter(part=>part.translate)){
   const source=part.request??part.text;assert(!/[\p{Script=Cyrillic}]/u.test(source));assert(!/Franz|Aria|1d20|https:\/\//.test(source));assert(source.length<=1500);
  }
 }
 assert.equal(RUSSIAN_DICTIONARY['wisdom saving throw'],'Спасбросок мудрости');
 assert.equal(translationPlan('Привет, мир!').some(part=>part.translate),false);
 assert.equal(translationPlan('Franziska greets Franz.',['Franz'])[0].request,'Franziska greets ZXQ0ZXQ.');
 const part=translationPlan('Franz greets Aria.',['Franz','Aria'])[0];
 assert.equal(renderTranslation(part,'ZXQ0ZXQ приветствует ZXQ1ZXQ.'),'Франц приветствует Aria.');
 assert.throws(()=>validateTranslationMarkers(part.request,'Приветствие.'),/protected/);
 const url=translationPlan('Visit https://example.com/room.',['Franz'])[0];
 assert.equal(renderTranslation(url,'Посетите ZXQ0ZXQ'),'Посетите https://example.com/room.');
 assert.equal(translationPlan('Make a Wisdom saving throw.')[0].local,'Совершите спасбросок мудрости.');
});

test('translation preferences reject external endpoints and malformed options',()=>{
 assert.deepEqual(validateTranslation(DEFAULT_TRANSLATION),DEFAULT_TRANSLATION);
 for(const change of [{port:0},{port:65536},{port:'5000'},{enabled:1},{preservedNames:['a\nb']},{preservedNames:Array(31).fill('Name')}])
  assert.throws(()=>validateTranslation({...DEFAULT_TRANSLATION,...change}));
 assert.equal(validateTranslation({...DEFAULT_TRANSLATION,url:'https://example.com'}).url,undefined);
});

test('bounded cache survives restart, stores source hashes, and clears persistently',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'fables-translation-cache-'));
 try {
  const file=path.join(directory,'cache.json'),cache=new TranslationCache(file);
  await cache.initialize();cache.set('Private sample source sentence.','Пробная строка.');await cache.flush();
  assert(!(await readFile(file,'utf8')).includes('Private sample'));
  const reloaded=new TranslationCache(file);await reloaded.initialize();assert.equal(reloaded.get('Private sample source sentence.'),'Пробная строка.');
  for(let i=0;i<2001;i++)reloaded.set('source '+i,'cached '+i);
  assert.equal(reloaded.size,2000);assert.equal(reloaded.get('source 0'),undefined);await reloaded.clear();
  const empty=new TranslationCache(file);await empty.initialize();assert.equal(empty.size,0);
 } finally { await rm(directory,{recursive:true,force:true}); }
});

test('loopback client uses bounded plain-text batches and refuses redirects, oversized results, and hangs',async()=>{
 let mode='ready',requests=[];
 const server=http.createServer(async(req,res)=>{
  requests.push({url:req.url,host:req.headers.host,authorization:req.headers.authorization,cookie:req.headers.cookie});
  if(mode==='hang')return;
  if(mode==='redirect'){res.writeHead(302,{Location:'http://example.com/translate'});res.end();return;}
  if(mode==='large'){res.end('A'.repeat(129*1024));return;}
  let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Content-Type','application/json');
  if(req.url==='/languages')res.end(JSON.stringify([{code:'en',targets:['ru']}]));
  else {const value=JSON.parse(body);assert.equal(value.source,'en');assert.equal(value.target,'ru');assert.equal(value.format,'text');
   res.end(JSON.stringify({translatedText:mode==='wrong'?['wrong','count']:value.q.map(()=>'<b>Перевод</b>')}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const client=new LocalTranslator(server.address().port,150);
 try {
  assert.equal(await client.available(),true);assert.deepEqual(await client.translate(['The old road.']),['<b>Перевод</b>']);
  assert.equal(requests[0].cookie,undefined);assert.equal(requests[0].authorization,undefined);assert.match(requests[0].host,/^127\.0\.0\.1:/);
  await assert.rejects(client.translate(Array(17).fill('text')),/Invalid/);
  for(const next of ['redirect','large','wrong','hang']){mode=next;await assert.rejects(client.translate(['Text to translate.']));}
  assert.equal(requests.filter(r=>r.url!=='/translate'&&r.url!=='/languages').length,0);
 } finally {client.abort();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('glossary covers screenshot labels and numeric UI immediately, including whitespace and preserved names',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 const {DND_GLOSSARY,INTERFACE_GLOSSARY}=require('../../dist/translation/russian-glossary');
 assert(Object.keys(DND_GLOSSARY).length>=500);assert(Object.keys(INTERFACE_GLOSSARY).length>=70);
 for(const [source,expected] of Object.entries({'Spellbook':'Книга заклинаний','Memories':'Воспоминания','Class Features':'Умения класса','Spellcasting':'Использование заклинаний','Prone':'Сбитый с ног','Action Surge: 0/1':'Всплеск действий: 0/1','Second Wind:1/2':'Второе дыхание:1/2','Bonuses: +2 Proficiency':'Бонусы: +2 Умение','1 Topic Researched':'1 тема исследована','1,699 XP until level 6':'1,699 опыта до уровня 6','Level 5 Drow Fighter (Spellblade)':'Уровень 5 Дроу Воин (Клинок заклинаний)','Mira says or does...':'Mira говорит или делает…','  Add Spell\n':'  Добавить заклинание\n'})){
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),expected);assert.equal(renderTranslation(translationPlan(source)[0]),expected);
 }
 assert.equal(localTranslation('constructor',RUSSIAN_DICTIONARY),undefined);
 assert.equal(translationPlan('Light',['Light']).map(part=>renderTranslation(part)).join(''),'Light');
});

test('custom attack headings and damage labels use bounded Russian interface terms',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,target] of Object.entries({
  'Attack Modifiers':'Модификаторы атаки',
  'Spell Options':'Параметры заклинания',
  'Roll Type':'Тип броска',
  'Bludgeoning Damage':'Дробящий урон',
  'Add Damage Roll':'Добавить бросок урона',
  'Roll Attack':'Бросок атаки',
 })) {
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
  assert.equal(localTranslation(source.toLowerCase(),RUSSIAN_DICTIONARY),target[0].toLowerCase()+target.slice(1),source+' casing');
 }
 assert.equal(localTranslation('the attack modifiers changed the spell options and roll type',RUSSIAN_DICTIONARY),undefined,
  'Specific interface labels do not trigger broad prose rewriting.');
});

test('specialized terms retain canonical Russian names in prose without changing literal names or ordinary words',()=>{
 const sample='Mira uses Second Wind and casts Mage Armor. Her friends see the light.';
 const parts=translationPlan(sample,['Mira']);assert.equal(parts.map(p=>p.text).join(''),sample);
 const request=parts.filter(p=>p.translate).map(p=>p.request).join('');assert(!/Second Wind|Mage Armor|Mira/.test(request));assert.match(request,/friends/);assert.match(request,/light/);
 const first=parts.find(p=>p.translate);
 const markers=first.request.match(/ZXQ\d+ZXQ/g);assert.equal(markers.length,3);
 assert.equal(renderTranslation(first,`${markers[0]} использует ${markers[1]} и накладывает ${markers[2]}.`),'Mira использует Второе дыхание и накладывает Доспехи мага.');
 assert.equal(translationPlan('Second Wind + Action Surge').map(p=>renderTranslation(p)).join(''),'Второе дыхание + Всплеск действий');
 for(const value of ['< | DSML | invoke name="magic_tool">','{"tool_calls": [{"name":"update_character"}]}'])assert.deepEqual(translationPlan(value),[{text:value,translate:false}]);
});


test('shared GUI and composite dice bonuses use the chosen vocabulary without a model',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 const samples={
  'AC':'КБ','Armor Class':'Класс брони','Base AC':'Базовый КБ','PB':'БУ','Proficiency':'Умение','Proficiency Bonus':'Бонус умения',
  'Bonuses: +2 Wisdom, +2 Proficiency':'Бонусы: +2 Мудрости, +2 Умение','+2 Proficiency':'+2 Умение','+2 Wisdom, +2 Proficiency':'+2 Мудрости, +2 Умение',
  'Bonuses: +5 Dexterity':'Бонусы: +5 Ловкости','Bonuses: +5 dexterity':'Бонусы: +5 ловкости',
  'Details':'Сведения','Armor':'Доспехи','Open Spellbook':'Открыть книгу заклинаний','Gold Pieces':'Золотые монеты','Backstory':'Предыстория','Mannerisms':'Манеры',
  'Campaign Settings':'Настройки кампании','Campaign Pacing Mode':'Темп кампании','Select Franz’s narration model.':'Выберите модель повествования Франца.',
  "Select Franz's narration model.":'Выберите модель повествования Франца.','Franz':'Франц','Gemini 3.1 Pro':'Gemini 3.1 Pro',
  'XP until level':'Опыта до уровня','30ft':'30 фт.','10 / 150 lbs':'10 / 150 фунт.','1 credit/turn':'1 кредит / ход','2 credits/turn':'2 кредита / ход','11 credits/turn':'11 кредитов / ход',
  'Source *':'Источник *','Select race':'Выберите расу','Select subclass':'Выберите подкласс','STR - Strength':'СИЛ — Сила',
 };
 for(const [source,target] of Object.entries(samples)) assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
 assert.equal(renderTranslation(translationPlan('Franz',['Franz'])[0]),'Франц','Old preserved-name preferences must not keep the service NPC in English.');
 const brand=translationPlan('Franz uses Gemini 3.1 Pro.');
 assert.equal(brand.map(p=>p.text).join(''),'Franz uses Gemini 3.1 Pro.');
 assert(!brand.filter(p=>p.translate).some(p=>/Franz|Gemini/.test(p.request)));
 assert.equal(brand.map(p=>p.translate?renderTranslation(p,'ZXQ0ZXQ использует ZXQ1ZXQ.'):renderTranslation(p)).join(''),'Франц использует Gemini 3.1 Pro.');
});

test('every authored shared interface string is deterministic, with whitespace and case variants',()=>{
 const {SHARED_INTERFACE_GLOSSARY}=require('../../dist/translation/interface-russian');
 const {localTranslation}=require('../../dist/translation/translation-core');
 assert(Object.keys(SHARED_INTERFACE_GLOSSARY).length>900);
 for(const [source,target] of Object.entries(SHARED_INTERFACE_GLOSSARY)){
  const lower=/^[А-ЯЁ]{2,}(?!\p{L})/u.test(target)||target.startsWith('Франц')?target:target.replace(/^(\p{L})/u,l=>l.toLowerCase());
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),lower,source);
  const upper=/^к\d+$/i.test(target)?target:target.replace(/^(\p{L})/u,l=>l.toUpperCase());
  assert.equal(localTranslation('  '+source.toUpperCase()+'\n',RUSSIAN_DICTIONARY),'  '+upper+'\n',source);
  const plan=translationPlan(source);assert(!plan.some(p=>p.translate),source);assert.equal(plan.map(p=>renderTranslation(p)).join(''),lower,source);
 }
});

test('roll outcomes, period-separated bonuses, healing and spell-slot events never use the model',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 const samples={
  'OTHER':'Другое','Flee':'Отступление','Heal':'Лечение','Known':'Известные',
  'Melee Attack':'Атака в ближнем бою','Ranged Attack':'Атака в дальнем бою',
  'SUCCESS!':'Успех!','FAILURE!':'Провал!','CRITICAL SUCCESS!':'Критический успех!','CRITICAL FAILURE!':'Критический провал!',
  'Bonuses: +4 Strength. +2 Proficiency':'Бонусы: +4 Силы. +2 Умение',
  '+2 Wisdom. +2 Proficiency':'+2 Мудрости. +2 Умение',
  '  Bonuses: -1 Dexterity, +2 Proficiency. +3 Expertise.\n':'  Бонусы: -1 Ловкости, +2 Умение. +3 Компетентность.\n',
  '+3 Modifier':'+3 Модификатор',
  'Custom Instructions (1/15)':'Дополнительные инструкции (1/15)',
  '  Custom Instructions ( 0 / 15 )\n':'  Дополнительные инструкции ( 0 / 15 )\n',
  'Level 1 Spell Slot consumed':'Ячейка заклинания 1-го уровня использована',
  '  Level 9 spell slot restored!\n':'  Ячейка заклинания 9-го уровня восстановлена!\n',
  'Cantrip used - no spell slot consumed':'Использован заговор — ячейка заклинания не потрачена',
  'Spell slot consumed!':'Ячейка заклинания использована!',
  'Spell slot restored!':'Ячейка заклинания восстановлена!',
  '4 HP Healed':'4 ОЗ восстановлено','8 HP Recovered':'8 ОЗ восстановлено','18 Damage':'18 Урон',
  '0 HP Healed!':'0 ОЗ восстановлено!','1,234 HP Recovered':'1,234 ОЗ восстановлено',
  'Base Roll':'Базовый бросок','Base Roll (advantage)':'Базовый бросок (Преимущество)',
  '(disadvantage)':'(Помеха)',
  'Strength Modifier':'Модификатор силы','Dexterity Modifier':'Модификатор ловкости',
  'Constitution Modifier':'Модификатор телосложения','Intelligence Modifier':'Модификатор интеллекта',
  'Wisdom Modifier':'Модификатор мудрости','Charisma Modifier':'Модификатор харизмы',
 };
 for(const [source,target] of Object.entries(samples)){
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
  const plan=translationPlan(source);assert(!plan.some(p=>p.translate),source);
  assert.equal(plan.map(p=>p.text).join(''),source);
  assert.equal(plan.map(p=>renderTranslation(p)).join(''),target,source);
 }
 for(const source of ['Mira healed 4 HP.','Bonuses: +2 Mira','Custom Instructions from Mira','HP Healed by Mira'])
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),undefined,source+' is not a shared control');
 assert.equal(renderTranslation(translationPlan('Heal',['Heal'])[0]),'Heal','Listed world-specific names still take priority.');
});

test('battle summaries, inventory outcomes and progression terminology are deterministic',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,target] of Object.entries({
  'VICTORY':'Победа','DEFEAT':'Поражение','ALLY':'Союзник','ENEMY':'Враг',
  'Battle lasted 1 turn':'Битва продолжалась 1 ход','Battle lasted 2 turns':'Битва продолжалась 2 хода','Battle lasted 16 turns':'Битва продолжалась 16 ходов',
  'Damage Dealt: 20':'Нанесённый урон: 20','Healing Done: 4':'Восстановленные ОЗ: 4','Distance Moved: 40ft':'Пройденное расстояние: 40фт.',
  'found 1 ':'находит 1 ','Могнус found 1 Маленький латунный ключ':'Могнус находит 1 Маленький латунный ключ',
  'Aria Moonwhisper found 2 Arcane Eye':'Aria Moonwhisper находит 2 Магический глаз',
  'Sorcerer Subclass':'Подкласс чародея','Draconic Resilience':'Драконья устойчивость','Draconic Spells':'Драконьи заклинания','General Feat':'Общая черта',
 })) assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
 const source='The Sorcerer uses Dexterity and Charisma modifiers and casts Command, Dragon’s Breath, Fear, Fly, Arcane Eye, Charm Monster, Legend Lore, and Summon Dragon.';
 const plan=translationPlan(source);assert.equal(plan.map(p=>p.text).join(''),source);
 const terms=plan.flatMap(p=>p.protected??[]).map(p=>p.text);
 for(const term of ['Чародей','Модификаторы ловкости и харизмы','Приказ','Дыхание дракона','Ужас','Полёт','Магический глаз','Очарование чудовища','Знание легенд','Призыв дракона']) assert(terms.includes(term),term);
 const ordinary=translationPlan('They command an army, fear the dark, and fly home.');
 assert(ordinary.filter(p=>p.translate).some(p=>/command.*fear.*fly/.test(p.request)),'Ordinary verbs remain prose.');
 const named=translationPlan('Command greets Fly.',['Command','Fly']);
 assert.deepEqual(named.flatMap(p=>p.protected??[]).map(p=>p.text),['Command','Fly'],'World-specific names override spell titles.');
});


test('hotfix common pages, counts, addresses, and partial progress spans',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [input,expected] of Object.entries({
  '(284 characters remaining)':'(осталось символов: 284)',
  '(2 active, 0 idle)':'(2 активных, 0 неактивных)',
  'Configure Flat Adjustment':'Настроить фиксированное изменение',
  'General Feat':'Общая черта', 'Skill':'Навык', 'Magic':'Магия',
  'Races':'Расы','Classes':'Классы','Factions':'Фракции','Items':'Предметы',
  'Email Address':'Адрес электронной почты','Google Account':'Аккаунт Google',
  'Account Connections':'Подключённые аккаунты','Monthly':'Ежемесячно',
  'October 25, 2026':'25 октября 2026','55 total transactions':'Всего операций: 55',
  'Recent Generations':'Последние изображения','Landscape 4:3':'Горизонтальное 4:3',
  'Aria says or does...':'Aria говорит или делает…',
  'Могнус says or does...':'Могнус говорит или делает…',
  'Public Profile':'Открытый профиль','PC':'ПИ','Message Details':'Сведения о сообщении'
 })) assert.equal(localTranslation(input,RUSSIAN_DICTIONARY),expected,input);
 const address="first.last+game@example.com";
 assert.equal(translationPlan(address).some(part=>part.translate),false);
 const plan=translationPlan('Contact '+address+' and Aria. Привет! Wait here.',['Aria']);
 assert.equal(plan.map(part=>part.text).join(''),'Contact '+address+' and Aria. Привет! Wait here.');
 for(const part of plan.filter(part=>part.translate)) {
  assert(!part.request.includes(address));assert(!part.request.includes('Aria'));
  for(const range of part.untranslated) assert(!part.text.slice(range.start,range.end).match(/@|Aria|Привет/));
 }
});

test('whole draft commands are idempotent, preserve code, and reject every empty command',()=>{
 const {formatMessageCommand}=require('../../dist/commands/message-commands');
 const source={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'/me Hello №1.'},{type:'hardBreak'},{type:'text',text:'/gm Note №2.'}]},{type:'codeBlock',content:[{type:'text',text:'№ /me literal'}]}]};
 const result=formatMessageCommand(source);assert.equal(result.invalid,false);
 assert.equal(formatMessageCommand(result.document),null);
 assert.equal(result.document.content[0].content[0].text,'Hello #1.');
 assert.equal(result.document.content[1].content[0].text,'№ /me literal');
 assert.equal(source.content[0].content[0].text,'/me Hello №1.');
 assert(formatMessageCommand(source,5).document.content[0].content[0].text.includes('№'),'Soft-break formatting leaves № conversion for whole-draft preparation.');
 const empty={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'/gm Complete.'}]},{type:'paragraph',content:[{type:'text',text:'/me ' }]}]};
 assert.equal(formatMessageCommand(empty).invalid,true);
});

test('profile, workshop, likes, and notification screenshot labels stay local',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 const samples={
  'Create your first race!':'Создайте свою первую расу!', 'Create your first class!':'Создайте свой первый класс!',
  'Create your first world!':'Создайте свой первый мир!', 'Followers':'Подписчики', 'Following':'Подписки', '0 Followers':'0 подписчиков', '1 Followers':'1 подписчик', '2 Followers':'2 подписчика', '11 Followers':'11 подписчиков', '1 Following':'1 подписка', '2 Following':'2 подписки',
  'No items published yet!':'Пока ничего не опубликовано в разделе «Предметы»!', 'No unread notifications':'Нет непрочитанных уведомлений',
  'Your Likes':'Понравившееся', 'One Shots':'Короткие приключения', 'Browse Worlds':'Обзор миров',
  'Discover and like your first world!':'Найдите мир и отметьте «Нравится»!', 'Monthly bonus credits!':'Ежемесячные бонусные кредиты!',
  'You received 100 bonus credits from your subscription!':'По вашей подписке начислено 100 бонусных кредитов!',
 };
 for(const [source,target] of Object.entries(samples)){
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);const plan=translationPlan(source);assert(!plan.some(part=>part.translate),source);assert.equal(plan.map(part=>renderTranslation(part)).join(''),target);
 }
});


test('combat health, turn labels, skill casing, and remaining screenshot UI stay local',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,expected]of Object.entries({
  'ABILITY CHECKS':'Проверки характеристик','Strength Check':'Проверка силы','Animal Handling Check':'Проверка ухода за животными',
  'Unscathed':'Невредим','Severely Injured':'Тяжело ранен','Copy Event ID':'Копировать ID события','Collapse All':'Свернуть все','Entity':'Сущности',
  "End Могнус's Turn":'Завершить ход Могнус',"Waiting for Писькогрыз jr.'s Turn":'Ожидание хода Писькогрыз jr.',
  'Executor: Encounter':'Исполнитель: бой','Franz is imagining...':'Франц обдумывает ответ…','Franz is starting an encounter...':'Франц начинает бой…',
  '2.0 / 150 lbs':'2.0 / 150 фунт.','+4 HP':'+4 ОЗ','Roll 1D20':'Бросить 1к20','Писькогрыз jr. cast Cure Wounds (Level 1)':'Писькогрыз jr. использует Лечение ран (уровень 1)',
 }))assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),expected,source);
 assert.equal(RUSSIAN_DICTIONARY.strength,'Сила','Standalone headings retain their initial capital.');
 assert.equal(validateTranslation({...DEFAULT_TRANSLATION,hideUntranslated:true}).hideUntranslated,true);
 assert.throws(()=>validateTranslation({...DEFAULT_TRANSLATION,hideUntranslated:'yes'}));
 const legacy={...DEFAULT_TRANSLATION};delete legacy.hideUntranslated;assert.equal(validateTranslation(legacy).hideUntranslated,false);
});

test('Edit Encounter combat button is local across case and whitespace variants',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,expected] of Object.entries({
  'Edit Encounter':'Редактировать бой',
  '  EDIT ENCOUNTER\n':'  Редактировать бой\n',
  '  edit   encounter  ':'  редактировать бой  ',
 })) assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),expected,source);
});

test('confirmed campaign labels and numeric counters use natural Russian locally',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,target] of Object.entries({
  'Your turn, Могнус':'Ваш ход, Могнус',
  'Hide panels':'Скрыть панели','Load Previous':'Загрузить предыдущие','Play audio':'Воспроизвести аудио',
  'Show stats':'Показать характеристики','Add entity to map':'Добавить сущность на карту',
  'Open left hand slot menu':'Открыть меню слота левой руки','Open armor slot menu':'Открыть меню слота доспехов',
  'Open right hand slot menu':'Открыть меню слота правой руки','Open Card Dropdown Menu':'Открыть выпадающее меню карточки',
  'Change Image':'Изменить изображение','Previous slide':'Предыдущий слайд','Next slide':'Следующий слайд',
  'Campaign Dropdown Menu':'Выпадающее меню кампании','Like':'Нравится','Add Generation Instruction':'Добавить инструкцию для генерации',
  'Generate Areas':'Создать области','Allow the AI to generate new areas.':'Разрешить ИИ создавать новые области.',
  'Generate Races':'Создать расы','Allow the AI to generate new character races.':'Разрешить ИИ создавать новые расы персонажей.',
  'Generate Items':'Создать предметы','Allow the AI to generate new items.':'Разрешить ИИ создавать новые предметы.',
  'Newer':'Более новые','Older':'Более старые','Topics Researched':'Исследовано тем:',
  'Topic Researched':'Исследована тема','Blocks Created':'Создано блоков:','Block Created':'Создан блок',
  '1 Topic Researched':'1 тема исследована','2 Topics Researched':'2 темы исследованы',
  '5 Topics Researched':'5 тем исследовано','21 Topics Researched':'21 тема исследована',
  '2 Blocks Created':'2 блока создано','5 Blocks Created':'5 блоков создано','21 Blocks Created':'21 блок создан',
  '2 Topics Researched 2 Blocks Created':'2 темы исследованы, 2 блока создано',
  '1 Block Created':'1 блок создан','3 Topic Researched':'3 темы исследованы','11 Topic Researched':'11 тем исследовано',
  '1 credit/turn':'1 кредит / ход','2 credits/turn':'2 кредита / ход','5 credits/turn':'5 кредитов / ход','2 credits + /turn':'2 кредита + / ход',
  'credit':'кредит','credits':'кредиты','/turn':'/ход',
  'Memory':'Воспоминание','Saved':'Сохранено',
  '2 days ago':'2 дня назад','1 hour ago':'1 час назад','3 minutes ago':'3 минуты назад',
  'Сареф, Салазар , Элендар, and Догун traveled 0.001 KM South West':'Сареф, Салазар , Элендар и Догун переместились на 0.001 км на юго-запад',
  '4 characters traveled 0.001 KM South West':'4 персонажа переместились на 0.001 км на юго-запад',
  'Сареф, Догун, Салазар получает 450 XP each.':'Сареф, Догун, Салазар получают 450 опыта каждый.',
  'Светожильный кабан was reduced to 0 HP':'Светожильный кабан: ОЗ снижено до 0',
  'These memories are searchable by the GM and may be automatically brought into context when relevant. To guarantee a specific memory is in the current Working Context, you can manually add it as a Working Context block.':'Эти воспоминания доступны мастеру для поиска и могут автоматически добавляться в контекст при необходимости. Чтобы гарантированно включить конкретное воспоминание в текущий рабочий контекст, добавьте его вручную в виде блока рабочего контекста.',
 })) assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
});


test('dynamic blank layout is opt-in, validated and survives preference normalization',()=>{
 assert.equal(DEFAULT_TRANSLATION.dynamicTranslationLayout,false);
 assert.equal(validateTranslation({...DEFAULT_TRANSLATION,dynamicTranslationLayout:true}).dynamicTranslationLayout,true);
 const legacy={...DEFAULT_TRANSLATION};delete legacy.dynamicTranslationLayout;
 assert.equal(validateTranslation(legacy).dynamicTranslationLayout,false);
 assert.throws(()=>validateTranslation({...DEFAULT_TRANSLATION,dynamicTranslationLayout:'yes'}));
});

test('dice controls localize D notation and combat menu labels without matching names',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,target] of Object.entries({'1D20':'1к20','D6':'к6','Roll 2D6 + 3':'Бросить 2к6 + 3','Attacks':'Атаки','Skills & Attacks':'Навыки и атаки','Choose Action':'Выберите действие','Weapons':'Оружие','Spells':'Заклинания','Favorited':'В избранном',"You don't have any weapons equipped. Go to your inventory and equip a weapon!":'У вас нет оружия в руках. Откройте инвентарь и возьмите оружие.'}))
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
 assert.equal(localTranslation('D20 Drake',RUSSIAN_DICTIONARY),undefined);
});


test('combat damage labels, abbreviated saves, and compound dice are deterministic',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 const types={acid:'Кислотный',bludgeoning:'Дробящий',cold:'Холодовой',fire:'Огненный',force:'Силовой',lightning:'Электрический',necrotic:'Некротический',piercing:'Колющий',poison:'Ядовитый',psychic:'Психический',radiant:'Лучистый',slashing:'Рубящий',thunder:'Звуковой'};
 for(const [type,label] of Object.entries(types)) {
  assert.equal(localTranslation(type,RUSSIAN_DICTIONARY),label[0].toLowerCase()+label.slice(1));
  assert.equal(localTranslation(type[0].toUpperCase()+type.slice(1),RUSSIAN_DICTIONARY),label);
  assert.equal(localTranslation(type+' damage',RUSSIAN_DICTIONARY),label[0].toLowerCase()+label.slice(1)+' урон');
 }
 for(const [ability,label] of Object.entries({Strength:'силы',Dexterity:'ловкости',Constitution:'телосложения',Intelligence:'интеллекта',Wisdom:'мудрости',Charisma:'харизмы'}))
  assert.equal(localTranslation(ability+' Save',RUSSIAN_DICTIONARY),'Спасбросок '+label);
 assert.equal(translationPlan('They deal force damage.')[0].protected[0].text,'силовой урон');
 assert.equal(translationPlan('Force damage hurts.')[0].protected[0].text,'Силовой урон');
 assert.equal(localTranslation('Save',RUSSIAN_DICTIONARY),'Сохранить');
 assert.equal(localTranslation('DC 12',RUSSIAN_DICTIONARY),'Сл 12');
 assert.equal(localTranslation('1d4 + 1d4 + 1d4',RUSSIAN_DICTIONARY),'1к4 + 1к4 + 1к4');
 assert.equal(localTranslation('2d6 + 1d4 - 3',RUSSIAN_DICTIONARY),'2к6 + 1к4 - 3');
 assert.equal(localTranslation('.Intelligence modifier.',RUSSIAN_DICTIONARY),'.Модификатор интеллекта.');
 assert.equal(localTranslation('1d4 + invalid',RUSSIAN_DICTIONARY),undefined);
});

test('damage type lists are protected as canonical terms and preview dice render locally',()=>{
 const source='You have Resistance to Bludgeoning, Piercing, and Slashing damage.';
 const part=translationPlan(source)[0];
 assert.deepEqual(part.protected.map(item=>item.text),['Сопротивление Дробящему, Колющему и Рубящему урону']);
 assert.equal(renderTranslation(part,'У вас ZXQ0ZXQ.'),'У вас Сопротивление Дробящему, Колющему и Рубящему урону.');
 assert(!renderTranslation(part,'У вас ZXQ0ZXQ.').match(/Resistance|Bludgeoning|Piercing|Slashing/));
 assert.equal(translationPlan('You have resistance to bludgeoning, piercing, and slashing damage.')[0].protected[0].text,'сопротивление дробящему, колющему и рубящему урону');
 const {localTranslation}=require('../../dist/translation/translation-core');
 assert.equal(localTranslation('Preview: 1d6 bludgeoning',RUSSIAN_DICTIONARY),'Предпросмотр: 1к6 дробящий');
 assert.equal(localTranslation('Preview: 2d8 + 3 fire',RUSSIAN_DICTIONARY),'Предпросмотр: 2к8 + 3 огненный');
});

test('critical RPG terms have scoped canonical labels and roll keeps its noun/verb context',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,target] of Object.entries({
  'Roll':'Бросок','roll':'бросок','Roll Dice':'Бросить кости','Roll Attack':'Бросок атаки',
  'D20 Test':'Проверка к20','D20 Tests':'Проверки к20','Ability Check':'Проверка характеристики',
  'Attack Action':'Действие «Атака»','Object Interaction':'Взаимодействие с объектом',
  'Bloodied':'Ранен','Temporary Hit Points':'Временные ОЗ','Hit Point Maximum':'Максимум ОЗ',
  'Grapple':'Захват','Help Action':'Действие «Помощь»','Hide Action':'Действие «Скрыться»',
  'Ready Action':'Подготовка действия','Study Action':'Действие «Изучение»','Utilize Action':'Действие «Использование предмета»',
  'Material Component':'Материальный компонент','Area of Effect':'Область действия',
  'Experience Points':'Очки опыта','Level Up':'Повышение уровня','Multiclassing':'Мультиклассирование',
 })) assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
 assert.equal(localTranslation('1d20 roll',RUSSIAN_DICTIONARY),undefined,'An action phrase should not be rewritten as an exact one-word button.');
});

test('pending prose renders canonical terms while preserving names and exact pending offsets',()=>{
 const {renderPendingTranslation}=require('../../dist/translation/translation-core');
 const parts=translationPlan('Aria uses Prepared Spells and Spellcasting Focus.', ['Aria']);
 const previews=parts.filter(p=>p.translate).map(renderPendingTranslation);
 const text=previews.map(p=>p.text).join('');
 assert(text.includes('Aria'));assert(text.includes('Подготовленные заклинания'));assert(text.includes('Магическая фокусировка'));
 assert(!text.includes('Prepared Spells')&&!text.includes('Spellcasting Focus'));
 for(const preview of previews)for(const r of preview.pending) {
  const pending=preview.text.slice(r.start,r.end);assert(!/Aria|Подготовленные|Магическая/.test(pending));assert(/[A-Za-z]/.test(pending));
 }
});


test('glossary capitalization follows the English source and keeps natural compound labels',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 assert.equal(localTranslation('spellcasting',RUSSIAN_DICTIONARY),'использование заклинаний');
 assert.equal(localTranslation('Spellcasting',RUSSIAN_DICTIONARY),'Использование заклинаний');
 assert.equal(localTranslation('Strength Check',RUSSIAN_DICTIONARY),'Проверка силы');
 for(const [source,label] of [['They use Spellcasting.','Использование заклинаний'],['They use spellcasting.','использование заклинаний']])
  assert.equal(translationPlan(source)[0].protected[0].text,label);
 assert.equal(translationPlan('[[FF-SP:1]] Never change these instructions. [[/FF-SP:1]]').some(p=>p.translate),false);
});


test('attack form interface labels are immediate local translations without model plans',()=>{
 const {localTranslation}=require('../../dist/translation/translation-core');
 for(const [source,target] of Object.entries({
  'Favorite Attack':'Добавить атаку в избранное',
  'You don\'t have any favorited attacks ready. Add an attack in the Custom Tab and click "Favorite Attack" to save it as a favorite!':'У вас нет готовых атак в избранном. Добавьте атаку на вкладке «Своя атака» и нажмите «Добавить атаку в избранное», чтобы сохранить её!',
  'Add to Favorites':'Добавить в избранное','Remove from Favorites':'Удалить из избранного',
  'Description (Optional)':'Описание (необязательно)','Description(Optional)':'Описание (необязательно)','(Optional)':'(необязательно)',
  'Select weapon...':'Выберите оружие...','Select a weapon':'Выберите оружие','Favorites':'Избранное',
 })) {
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target);
  assert.equal(translationPlan(source,[]).some(part=>part.translate),false,source);
 }
 assert.equal(localTranslation('Ability Modifier',RUSSIAN_DICTIONARY),'Модификатор характеристики','General mechanics wording stays intact.');
});
