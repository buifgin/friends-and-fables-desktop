const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {mkdtemp,readFile,rm} = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {translationPlan,renderTranslation,validateTranslationMarkers,validateTranslation,DEFAULT_TRANSLATION,RUSSIAN_DICTIONARY}=require('../dist/translation-core');
const {TranslationCache}=require('../dist/translation-cache');
const {LocalTranslator}=require('../dist/local-translator');

test('mixed Russian, names, dice, URLs, whitespace, and long prose are preserved around English fragments',()=>{
 for(const value of ['The inn is open. Привет, путник! Take a seat.','Franz greets Aria. Брось 1d20 + 5. Visit https://example.com/room.',
  '  Wisdom saving throw\n','Visit https://example.com/Русская-страница then greet E. Mira. ','Привет, мир!','A quiet road.\n\nA bright moon.', 'The tall forest grows. '.repeat(200)]){
  const plan=translationPlan(value,['Franz','Aria','E. Mira']);assert.equal(plan.map(part=>part.text).join(''),value);
  for(const part of plan.filter(part=>part.translate)){
   const source=part.request??part.text;assert(!/[\p{Script=Cyrillic}]/u.test(source));assert(!/Franz|Aria|1d20|https:\/\//.test(source));assert(source.length<=1500);
  }
 }
 assert.equal(RUSSIAN_DICTIONARY['wisdom saving throw'],'Спасбросок Мудрости');
 assert.equal(translationPlan('Привет, мир!').some(part=>part.translate),false);
 assert.equal(translationPlan('Franziska greets Franz.',['Franz'])[0].request,'Franziska greets ZXQ0ZXQ.');
 const part=translationPlan('Franz greets Aria.',['Franz','Aria'])[0];
 assert.equal(renderTranslation(part,'ZXQ0ZXQ приветствует ZXQ1ZXQ.'),'Франц приветствует Aria.');
 assert.throws(()=>validateTranslationMarkers(part.request,'Приветствие.'),/protected/);
 const url=translationPlan('Visit https://example.com/room.',['Franz'])[0];
 assert.equal(renderTranslation(url,'Посетите ZXQ0ZXQ'),'Посетите https://example.com/room.');
 assert.equal(translationPlan('Make a Wisdom saving throw.')[0].local,'Совершите спасбросок Мудрости.');
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
 const {localTranslation}=require('../dist/translation-core');
 const {DND_GLOSSARY,INTERFACE_GLOSSARY}=require('../dist/russian-glossary');
 assert(Object.keys(DND_GLOSSARY).length>=500);assert(Object.keys(INTERFACE_GLOSSARY).length>=70);
 for(const [source,expected] of Object.entries({'Spellbook':'Книга заклинаний','Memories':'Воспоминания','Class Features':'Умения класса','Spellcasting':'Использование заклинаний','Prone':'Сбитый с ног','Action Surge: 0/1':'Всплеск действий: 0/1','Second Wind:1/2':'Второе дыхание:1/2','Bonuses: +2 Proficiency':'Бонусы: +2 Умение','1 Topic Researched':'1 Тема изучена','1,699 XP until level 6':'1,699 опыта до уровня 6','Level 5 Drow Fighter (Spellblade)':'Уровень 5 Дроу Воин (Клинок заклинаний)','Mira says or does...':'Mira говорит или делает…','  Add Spell\n':'  Добавить заклинание\n'})){
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),expected);assert.equal(renderTranslation(translationPlan(source)[0]),expected);
 }
 assert.equal(localTranslation('constructor',RUSSIAN_DICTIONARY),undefined);
 assert.equal(translationPlan('Light',['Light']).map(part=>renderTranslation(part)).join(''),'Light');
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
 const {localTranslation}=require('../dist/translation-core');
 const samples={
  'AC':'КБ','Armor Class':'Класс брони','Base AC':'Базовый КБ','PB':'БУ','Proficiency':'Умение','Proficiency Bonus':'Бонус умения',
  'Bonuses: +2 Wisdom, +2 Proficiency':'Бонусы: +2 Мудрость, +2 Умение','+2 Proficiency':'+2 Умение','+2 Wisdom, +2 Proficiency':'+2 Мудрость, +2 Умение',
  'Details':'Сведения','Armor':'Доспехи','Open Spellbook':'Открыть книгу заклинаний','Gold Pieces':'Золотые монеты','Backstory':'Предыстория','Mannerisms':'Манеры',
  'Campaign Settings':'Настройки кампании','Campaign Pacing Mode':'Темп кампании','Select Franz’s narration model.':'Выберите модель повествования Франца.',
  "Select Franz's narration model.":'Выберите модель повествования Франца.','Franz':'Франц','Gemini 3.1 Pro':'Gemini 3.1 Pro',
  'XP until level':'опыта до уровня','30ft':'30 фт.','10 / 150 lbs':'10 / 150 фунт.','1 credit/turn':'1 кредит / ход','2 credits/turn':'2 кредита / ход','11 credits/turn':'11 кредитов / ход',
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
 const {SHARED_INTERFACE_GLOSSARY}=require('../dist/interface-russian');
 const {localTranslation}=require('../dist/translation-core');
 assert(Object.keys(SHARED_INTERFACE_GLOSSARY).length>900);
 for(const [source,target] of Object.entries(SHARED_INTERFACE_GLOSSARY)){
  assert.equal(localTranslation(source,RUSSIAN_DICTIONARY),target,source);
  assert.equal(localTranslation('  '+source.toUpperCase()+'\n',RUSSIAN_DICTIONARY),'  '+target+'\n',source);
  const plan=translationPlan(source);assert(!plan.some(p=>p.translate),source);assert.equal(plan.map(p=>renderTranslation(p)).join(''),target,source);
 }
});
