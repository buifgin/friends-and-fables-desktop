const assert=require('node:assert/strict');
const http=require('node:http');
const {mkdtemp,readFile,rm,writeFile}=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');
const {app,BrowserWindow,session}=require('electron');
const appRoot=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'..');
const {AppearanceManager,registerAppearanceScheme}=require(path.join(appRoot,'dist/appearance'));
const {TranslationManager,TRANSLATION_URL}=require(path.join(appRoot,'dist/translation'));
registerAppearanceScheme();app.on('window-all-closed',()=>{});
let profile,manager,server,mode='ready',calls=[],delays=0,batches=[],progressBatches=0,releaseProgress;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async(contents,expression,limit=5000)=>{for(let i=0;i<limit/25;i++){if(await contents.executeJavaScript(expression))return;await sleep(25);}throw Error('Timed out: '+expression);};
const timer=setTimeout(()=>{console.error('Translation smoke test timed out.');app.exit(1);},45000);
(async()=>{
 profile=process.env.FABLES_TEST_PROFILE_DIR || await mkdtemp(path.join(os.tmpdir(),'fables-translation-smoke-'));app.setPath('userData',profile);await app.whenReady();
 server=http.createServer(async(req,res)=>{
  if(mode==='offline'){res.writeHead(503);res.end();return;}
  res.setHeader('Content-Type','application/json');
  if(req.url==='/languages'){res.end(JSON.stringify([{code:'en',targets:['ru']}])) ;return;}
  let text='';for await(const chunk of req)text+=chunk;
  const body=JSON.parse(text);calls.push(...body.q);batches.push(body.q);
  assert.equal(body.source,'en');assert.equal(body.target,'ru');assert.equal(body.format,'text');
  for(const value of body.q)assert(!/[\p{Script=Cyrillic}]/u.test(value),'Russian must never reach the English model.');
  if(body.q.some(value=>value.includes('streaming sentence'))){delays++;await sleep(400);}
  if(body.q.some(value=>value.includes('Progress sample'))){
   progressBatches++;assert(body.q.length<=4,'A small batch allows earlier results.');
   if(progressBatches===2)await new Promise(resolve=>{releaseProgress=resolve;});else await sleep(120);
  }
  const dictionary={'The forest is quiet.':'Лес тих.','A lantern lights the road.':'Фонарь освещает дорогу.',
   'The door opens.':'Дверь открывается.','Take a seat.':'Присаживайся.',
   'Dangerous sample text.':'<img src=x onerror="window.injected=true">',
   'The final streaming sentence.':'Последнее предложение.'};
  res.end(JSON.stringify({translatedText:body.q.map(value=>dictionary[value]??`Перевод(${value})`)}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const appearance=new AppearanceManager();await appearance.initialize();
 manager=new TranslationManager(undefined, null);await manager.initialize();
 appearance.onChange=value=>manager.setAppearance(value);manager.setAppearance(appearance.getSettings());
 assert.equal(manager.getSettings().enabled,false);
 const preferences={...manager.getSettings(),port:server.address().port,preservedNames:['Franz','Aria Moonwhisper']};
 await manager.save(preferences);
 const html=await readFile(path.join(__dirname,'fixtures/translation-page.html'),'utf8');
 const siteSession=session.fromPartition('translation-smoke');siteSession.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
 const website=new BrowserWindow({show:false,width:1000,height:900,webPreferences:{session:siteSession,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 manager.attach(website.webContents);await website.loadURL('https://play.fables.gg/campaign/play');
 const contents=website.webContents;
 assert.equal(await contents.executeJavaScript('typeof window.translation'),'undefined');
 assert.equal(await contents.executeJavaScript('typeof window.require'),'undefined');
 assert.equal(await contents.executeJavaScript('typeof window.__friendsFablesDesktopTranslation'),'undefined');
 assert.equal(calls.length,0);
 const original=await contents.executeJavaScript('document.body.innerHTML');
 const settings=await manager.open(website);settings.hide();
 await until(settings.webContents,'!document.getElementById("apply").disabled');
 await appearance.save({...appearance.getSettings(),preset:'amoled'});
 await until(settings.webContents,'getComputedStyle(document.documentElement).backgroundColor === "rgb(0, 0, 0)"');
 await settings.webContents.executeJavaScript("document.getElementById('preserved-names').value='Aria Moonwhisper\\nUnsaved Place'");
 await appearance.save({...appearance.getSettings(),preset:'light'});
 await until(settings.webContents,'getComputedStyle(document.documentElement).backgroundColor === "rgb(245, 245, 245)"');
 assert.equal(await settings.webContents.executeJavaScript('getComputedStyle(document.getElementById("apply")).color'),'rgb(255, 255, 255)');
 assert.equal(await settings.webContents.executeJavaScript('document.getElementById("preserved-names").value'),'Aria Moonwhisper\nUnsaved Place');
 await appearance.save({...appearance.getSettings(),preset:'custom',customColor:'#234567'});
 await until(settings.webContents,'getComputedStyle(document.documentElement).backgroundColor === "rgb(35, 69, 103)"');
 await settings.webContents.executeJavaScript(`document.getElementById('preserved-names').value=${JSON.stringify(preferences.preservedNames.join('\n'))}`);
 await settings.webContents.executeJavaScript("document.getElementById('enabled').checked=true;document.getElementById('translation-form').requestSubmit()");
 await until(contents,"document.querySelector('#story strong').textContent==='Лес тих.'");
 await until(contents,"document.getElementById('mixed').textContent==='Дверь открывается. Привет, путник! Присаживайся.'");
 await until(contents,"getComputedStyle(document.querySelector('[data-ff-translation-status]')).display==='none'");
 assert.equal(await contents.executeJavaScript("document.getElementById('term').textContent"),'Спасбросок Мудрости');
 for(const [id,text] of Object.entries({home:'Главная',create:'Создать',discover:'Обзор',workshop:'Мастерская',studio:'Студия изображений',spellbook:'Книга заклинаний',resource:'Второе дыхание:1/2',feature:'Использование заклинаний','skill-check':'Проверка Акробатики',stats:'Характеристики',alignment:'Законно-добрый'}))assert.equal(await contents.executeJavaScript(`document.getElementById(${JSON.stringify(id)}).textContent`),text);
 assert.equal(await contents.executeJavaScript('document.documentElement.getAttribute("translate")'),'no');
 assert.equal(await contents.executeJavaScript('document.documentElement.classList.contains("notranslate")'),true);
 assert.equal(await contents.executeJavaScript('document.getElementById("untranslated-name").textContent'),'The Protected Name');
 assert.equal(await contents.executeJavaScript("document.getElementById('mixed').textContent"),'Дверь открывается. Привет, путник! Присаживайся.');
 assert.equal(await contents.executeJavaScript("document.getElementById('character-name').textContent"),'Aria Moonwhisper');
 assert(!calls.some(value=>/Franz|Aria Moonwhisper|https:\/\/|1d20/.test(value)));
 const unchanged=await contents.executeJavaScript(`({russian:document.getElementById('russian').textContent,
 input:document.getElementById('typed').value,textarea:document.getElementById('textarea').value,editor:document.getElementById('editor').textContent,
 code:document.getElementById('code').textContent,ignored:document.getElementById('ignored').textContent,login:document.getElementById('login').textContent,
 title:document.getElementById('save').title,record:window.campaignRecord})`);
 assert.equal(unchanged.russian,'Путник идёт по тихой дороге.');assert.equal(unchanged.input,'Hello, friends!');
 assert.equal(unchanged.textarea,'The original draft stays here.');assert.equal(unchanged.editor,'The editable draft stays here.');
 assert.equal(unchanged.code,'The sample code stays here.');assert.equal(unchanged.ignored,'The ignored story stays here.');
 assert.equal(unchanged.login,'Sign in with your account.');assert.equal(unchanged.title,'Скрыть фоновое изображение');
 assert.deepEqual(unchanged.record,{text:'The forest is quiet.',name:'Aria Moonwhisper',message:'Hello, friends!'});
 await until(contents,"document.getElementById('raw').textContent.startsWith('<img')");
 assert.equal(await contents.executeJavaScript("document.querySelector('#raw img')"),null);assert.equal(await contents.executeJavaScript('window.injected'),undefined);
 await contents.executeJavaScript("document.getElementById('save').click()");assert.equal(await contents.executeJavaScript('window.saveClicks'),1);

 const shared={details:'Сведения',race:'Раса',class:'Класс',subclass:'Подкласс',pronouns:'Местоимения',voice:'Голос',faction:'Фракция',none:'Нет',currencies:'Валюты',gold:'Золотые монеты',silver:'Серебряные монеты',copper:'Медные монеты',backstory:'Предыстория',mannerisms:'Манеры',carrying:'Грузоподъёмность',weight:'10 / 150 фунт.',armor:'Доспехи',head:'Голова',neck:'Шея','equipment-back':'Спина',gloves:'Перчатки',belt:'Пояс',ring:'Кольцо',legs:'Ноги',feet:'Ступни',back:'Назад','campaign-settings':'Настройки кампании',pacing:'Темп кампании',adventure:'Приключение',downtime:'Спокойная игра','model-help':'Выберите модель повествования Франца.',model:'Gemini 3.1 Pro',credits:'2 кредита / ход',franz:'Франц',ac:'КБ','armor-class':'Класс брони',pb:'БУ',proficiency:'Умение',bonus:'Бонусы: +2 Мудрость, +2 Умение','bonus-fragment':'+2 Умение',speed:'30 фт.','split-xp':'1,799 опыта до уровня 4','spellbook-open':'Открыть книгу заклинаний','full-inventory':'Открыть полный инвентарь','voice-franz':'Франц (британский, мужской голос)'};
 for(const [id,text] of Object.entries(shared))assert.equal(await contents.executeJavaScript(`document.getElementById(${JSON.stringify(id)}).textContent`),text,id);
 const rolls={'roll-other':'Другое','roll-flee':'Отступление','roll-heal':'Лечение','roll-melee':'Атака в ближнем бою','roll-ranged':'Атака в дальнем бою','roll-bonus':'Бонусы: +4 Сила. +2 Умение','roll-bonus-combined':'Бонусы: +2 Мудрость. +2 Умение','roll-success':'Успех!','roll-failure':'Провал!','roll-critical-success':'Критический успех!','roll-critical-failure':'Критический провал!','spells-known':'Известные','custom-instructions':'Дополнительные инструкции (1/15)','slot-event':'Ячейка заклинания 1-го уровня использована','slot-restored':'Ячейка заклинания 2-го уровня восстановлена','roll-healed':'4 ОЗ восстановлено','roll-recovered':'8 ОЗ восстановлено','roll-damage':'18 Урон','roll-base':'Базовый бросок (Преимущество)','roll-modifier':'Модификатор Мудрости','roll-proficiency':'Бонус умения'};
 for(const [id,text] of Object.entries(rolls))assert.equal(await contents.executeJavaScript(`document.getElementById(${JSON.stringify(id)}).textContent`),text,id);
 const summaries={victory:'Победа',ally:'Союзник',enemy:'Враг','battle-lasted':'Битва продолжалась 16 ходов','damage-dealt':'Нанесённый урон: 20','healing-done':'Восстановленные ОЗ: 4','distance-moved':'Пройденное расстояние: 40фт.','item-found':'Могнус находит 1 Маленький латунный ключ с трезубой головой','sorcerer-subclass':'Подкласс чародея','draconic-resilience':'Драконья устойчивость','draconic-spells':'Драконьи заклинания','general-feat':'Общая черта'};
 for(const [id,text] of Object.entries(summaries))assert.equal(await contents.executeJavaScript(`document.getElementById(${JSON.stringify(id)}).textContent`),text,id);
 assert(!calls.some(value=>/VICTORY|Battle lasted|Damage Dealt|found|Sorcerer Subclass|Draconic Resilience|Draconic Spells|General Feat/.test(value)),'Shared summary and progression labels never wait for the model.');
 assert(!calls.some(value=>/Melee Attack|Ranged Attack|SUCCESS|FAILURE|HP Healed|HP Recovered|spell slot|Custom Instructions|Base Roll|Modifier/.test(value)),'Roll labels and split counters must stay local.');
 assert(!calls.some(value=>/Proficiency|Armor Class|Gold Pieces|Campaign Settings|Franz|Gemini/.test(value)),'Shared GUI and model names must not reach the machine translator.');
 // Opening a Radix-style portal hides the background only from accessibility APIs.
 const beforePopup=calls.length;
 await contents.executeJavaScript(`document.getElementById('page').setAttribute('aria-hidden','true');document.getElementById('page').inert=true;
 document.getElementById('portal').innerHTML='<div role="menu"><h3>GM Continue Mode</h3><span>Controls whether the GM continues automatically after player messages.</span><button role="menuitem">Players Only</button><span>Credits</span><span>Add Credits</span><span>Blinded</span><span>Necrotic</span></div>'`);
 await until(contents,"document.querySelector('#portal h3').textContent==='Режим продолжения мастера'");
 await sleep(120);
 assert.equal(await contents.executeJavaScript("document.getElementById('home').textContent"),'Главная');
 assert.equal(await contents.executeJavaScript("document.querySelector('#story strong').textContent"),'Лес тих.');
 assert.equal(await contents.executeJavaScript("document.querySelector('#portal [role=menuitem]').textContent"),'Только игроки');
 assert.equal(calls.length,beforePopup,'Popup labels should use the glossary immediately.');
 for(const [id,text] of Object.entries(shared))assert.equal(await contents.executeJavaScript(`document.getElementById(${JSON.stringify(id)}).textContent`),text,id+' while a menu is open');
 for(const [id,text] of Object.entries(rolls))assert.equal(await contents.executeJavaScript(`document.getElementById(${JSON.stringify(id)}).textContent`),text,id+' while a menu is open');
 // React replacing translated DOM with source gets the memoized display promptly.
 await contents.executeJavaScript("document.querySelector('#story strong').textContent='The forest is quiet.'");
 await until(contents,"document.querySelector('#story strong').textContent==='Лес тих.'",200);
 assert.equal(calls.length,beforePopup);
 assert.equal(await contents.executeJavaScript("document.getElementById('typed').placeholder"),'Mira говорит или делает…');
 assert.equal(await contents.executeJavaScript("document.querySelector('#editor p').dataset.placeholder"),'Mira говорит или делает…');
 assert.equal(await contents.executeJavaScript("document.querySelector('input[type=password]').placeholder"),'Password');
 await contents.executeJavaScript("document.getElementById('portal').innerHTML='';document.getElementById('page').removeAttribute('aria-hidden');document.getElementById('page').removeAttribute('inert')");
 assert(batches.some(batch=>batch.length>1),'Visible prose should share model requests.');
 // Restoring originals retains HTML structure and event listeners.
 await manager.save({...manager.getSettings(),showOriginal:true});
 assert.equal(await contents.executeJavaScript("document.body.innerHTML"),original);
 // Body-level browser translation flags are also overridden by explicit opt-in.
 await contents.executeJavaScript('document.body.setAttribute("translate","no");document.body.classList.add("notranslate")');
 await contents.executeJavaScript("document.getElementById('save').click()");assert.equal(await contents.executeJavaScript('window.saveClicks'),2);
 const count=calls.length;await manager.save({...manager.getSettings(),showOriginal:false});
 await until(contents,"document.querySelector('#story strong').textContent==='Лес тих.'");assert.equal(calls.length,count,'Previously translated text should use the cache.');
 // Hold a later response: earlier sentences, cache hits and progress must already be visible.
 await contents.executeJavaScript(`{const block=document.createElement('p');block.id='progress';block.textContent=Array.from({length:8},(_,i)=>'Progress sample '+(i+1)+'.').join(' ');document.getElementById('late').append(block);window.progressNode=block.firstChild;window.progressOriginal=block.textContent;block.scrollIntoView()}`);
 await until(contents,"document.getElementById('progress').textContent.includes('Перевод(Progress sample 1.)') && document.getElementById('progress').textContent.endsWith('Progress sample 8.')");
 for(let i=0;i<120&&!releaseProgress;i++)await sleep(25);assert(releaseProgress,'Second response is held until partial output is verified.');
 assert.equal(await contents.executeJavaScript("document.getElementById('progress').firstChild===progressNode"),true);
 assert.equal(await contents.executeJavaScript("document.getElementById('progress').getAttribute('data-ff-translation-pending')"),'true');
 assert.equal(await contents.executeJavaScript("getComputedStyle(document.querySelector('[data-ff-translation-status]')).display"),'flex');
 const dotted=await contents.executeJavaScript("[...CSS.highlights.get('ff-desktop-untranslated')].filter(range=>range.startContainer===progressNode).map(range=>range.toString())");
 assert.deepEqual(dotted,['Progress sample 5.','Progress sample 6.','Progress sample 7.','Progress sample 8.'],'Dots cover only pending source sentences, never translated sentences.');
 assert.equal(await contents.executeJavaScript("getComputedStyle(document.getElementById('progress')).textDecorationLine"),'none','No paragraph-wide underline.');
 assert.equal(await contents.executeJavaScript("getComputedStyle(document.getElementById('progress'),'::highlight(ff-desktop-untranslated)').textDecorationLine"),'underline');
 if(process.env.FABLES_TEST_SCREENSHOT){website.show();await sleep(150);await writeFile(process.env.FABLES_TEST_SCREENSHOT.replace(/\.png$/,'-partial.png'),(await contents.capturePage()).toPNG());}


 await contents.executeJavaScript("document.getElementById('late').insertAdjacentHTML('beforeend','<p id=cache-during-progress>The forest is quiet.</p>')");
 await until(contents,"document.getElementById('cache-during-progress').textContent==='Лес тих.'",250);
 releaseProgress();releaseProgress=undefined;
 await until(contents,"document.getElementById('progress').textContent.includes('Перевод(Progress sample 8.)') && !document.getElementById('progress').hasAttribute('data-ff-translation-pending')");
 assert.equal(progressBatches,2);
 await until(contents,"getComputedStyle(document.querySelector('[data-ff-translation-status]')).display==='none'");
 await manager.save({...manager.getSettings(),showOriginal:true});
 assert.equal(await contents.executeJavaScript("document.getElementById('progress').textContent===progressOriginal && document.getElementById('progress').firstChild===progressNode"),true);
 assert.equal(await contents.executeJavaScript("document.querySelector('[data-ff-translation-status]')"),null);
 await manager.save({...manager.getSettings(),showOriginal:false});
 await until(contents,"document.getElementById('progress').textContent.includes('Перевод(Progress sample 8.)')");assert.equal(progressBatches,2,'Completed sentences survive reconfiguration in the cache.');
 progressBatches=0;
 await contents.executeJavaScript(`document.getElementById('late').insertAdjacentHTML('beforeend',Array.from({length:4},(_,i)=>'<p class="fair-progress">Progress sample block '+i+' first. Progress sample block '+i+' second.</p>').join(''))`);
 await until(contents,"[...document.querySelectorAll('.fair-progress')].every(block=>block.textContent.includes('first.)') && !block.textContent.includes('second.)'))");
 for(let i=0;i<120&&!releaseProgress;i++)await sleep(25);assert(releaseProgress);
 releaseProgress();releaseProgress=undefined;
 await until(contents,"[...document.querySelectorAll('.fair-progress')].every(block=>block.textContent.includes('second.)'))");assert.equal(progressBatches,2,'Paragraphs share a small batch rather than waiting behind the first paragraph.');
 // A displayed node becoming editable restores the original before editing.
 website.show();website.focus();await sleep(150);contents.focus();
 await contents.executeJavaScript("window.editFocus=[];document.addEventListener('focusin',e=>editFocus.push(e.target.id));document.getElementById('save').focus()");
 const beforeEditing=await contents.executeJavaScript("document.getElementById('story').contentEditable='true';document.getElementById('story').focus();document.querySelector('#story strong').textContent");
 if(beforeEditing!=='The forest is quiet.')console.error('Edit focus diagnostic',await contents.executeJavaScript("({focus:editFocus,active:document.activeElement.id,editable:document.getElementById('story').contentEditable,focused:document.hasFocus(),controller:!!window.__friendsFablesDesktopTranslation})"));
 assert.equal(beforeEditing,'The forest is quiet.','Restore originals synchronously when an editor receives focus.');
 await until(contents,"document.querySelector('#story strong').textContent==='The forest is quiet.'");
 await contents.executeJavaScript("document.getElementById('story').contentEditable='false';document.getElementById('hidden').hidden=false;document.getElementById('late').innerHTML='<p id=stream>The first streaming sentence.</p>'");
 await until(contents,"document.getElementById('hidden').textContent.startsWith('Перевод')");
 for(let i=0;i<100&&!delays;i++)await sleep(20);assert(delays>0);
 await contents.executeJavaScript("document.getElementById('stream').textContent='The final streaming sentence.'");
 await until(contents,"document.getElementById('stream').textContent==='Последнее предложение.'");
 assert(!await contents.executeJavaScript("document.getElementById('stream').textContent.includes('first')"));
 // Service failure keeps originals; cached text and the dictionary still work.
 mode='offline';await contents.executeJavaScript("document.getElementById('late').insertAdjacentHTML('beforeend','<p id=offline>The unfamiliar cave appears.</p>')");
 await sleep(1300);assert.equal(await contents.executeJavaScript("document.getElementById('offline').textContent"),'The unfamiliar cave appears.');
 assert.equal((await manager.check()).available,false);
 const offlineCalls=calls.length;await manager.save({...manager.getSettings(),translateDescriptions:false});
 // Fixed common UI works with the service offline and descriptions disabled.
 await contents.executeJavaScript(`const box=document.createElement('section');box.id='hotfix-ui';box.innerHTML='<form><label>Email Address</label><input type="email" value="player.test@example.com"><p>Changing your email requires confirmation via both your current and new email addresses.</p><span id="literal-email">player.test@example.com</span></form><p id="outside-email">player.test@example.com</p><span id="count"></span><span id="category"></span><span id="configure"></span><span id="context-count"></span><button id="left-tooltip" title="Character Sheet" aria-label="Character Sheet"></button><div contenteditable="true" translate="no"><p id="composer-placeholder" data-placeholder="Могнус says or does..."></p></div>';document.getElementById('late').append(box);
 const fragments=(id,parts)=>{const element=document.getElementById(id);for(const text of parts){element.append(document.createTextNode(text),document.createComment('react'))}return [...element.childNodes]};
 window.hotfixNodes={count:fragments('count',['(','284',' characters remaining)']),category:fragments('category',['General',' ','Feat']),configure:fragments('configure',['Configure',' ','Flat Adjustment']),context:fragments('context-count',['(','2',' active, ','0',' idle)'])};`);
 await until(contents,"document.getElementById('count').textContent==='(осталось символов: 284)'");
 await until(contents,"document.getElementById('category').textContent==='Общая черта' && document.getElementById('configure').textContent==='Настроить фиксированное изменение'");
 await until(contents,"document.getElementById('context-count').textContent==='(2 активных, 0 неактивных)'");
 await until(contents,"document.getElementById('composer-placeholder').getAttribute('data-placeholder')==='Могнус говорит или делает…'");
 assert.equal(await contents.executeJavaScript("document.querySelector('#hotfix-ui label').textContent"),'Адрес электронной почты');
 assert.equal(await contents.executeJavaScript("document.getElementById('left-tooltip').title"),'Лист персонажа');
 assert.equal(await contents.executeJavaScript("document.getElementById('left-tooltip').getAttribute('aria-label')"),'Лист персонажа');
 assert.equal(await contents.executeJavaScript("document.querySelector('#hotfix-ui input').value"),'player.test@example.com');
 assert.equal(await contents.executeJavaScript("document.getElementById('outside-email').textContent"),'player.test@example.com');
 assert.equal(await contents.executeJavaScript("Object.entries(hotfixNodes).every(([key,nodes])=>nodes.every((node,i)=>node===document.getElementById(key==='context'?'context-count':key).childNodes[i]))"),true);
 assert.equal(calls.length,offlineCalls,'Common interface translations never call the model.');
 // Keep React text/comment identities and update only the changed source nodes.
 await contents.executeJavaScript(`window.rollNodes={modifier:[...document.getElementById('roll-modifier').childNodes],slot:[...document.getElementById('slot-event').childNodes],instructions:[...document.getElementById('custom-instructions').childNodes]};
 rollNodes.modifier[0].data='Strength';rollNodes.slot[2].data='3';rollNodes.slot[8].data='restored';rollNodes.instructions[2].data='2'`);
 await until(contents,"document.getElementById('roll-modifier').textContent==='Модификатор Силы'");
 await until(contents,"document.getElementById('slot-event').textContent==='Ячейка заклинания 3-го уровня восстановлена'");
 assert.equal(await contents.executeJavaScript("document.getElementById('custom-instructions').textContent"),'Дополнительные инструкции (2/15)');
 assert(await contents.executeJavaScript("Object.entries(rollNodes).every(([key,nodes])=>nodes.every((node,i)=>node===document.getElementById(key==='modifier'?'roll-modifier':key==='slot'?'slot-event':'custom-instructions').childNodes[i]))"),'Local translation must retain React text/comment nodes.');
 assert.equal(await contents.executeJavaScript('rollNodes.slot[2].data'),'3');
 await contents.executeJavaScript(`const label=document.createElement('span');label.id='dynamic-modifier';label.append(document.createTextNode('Wisdom'),document.createTextNode(' '),document.createTextNode('Modifier'));document.getElementById('late').append(label)`);
 await until(contents,"document.getElementById('dynamic-modifier').textContent==='Модификатор Мудрости'");
 await contents.executeJavaScript("document.getElementById('dynamic-modifier').firstChild.data='Magic'");
 await until(contents,"document.getElementById('dynamic-modifier').textContent==='Магия Модификатор'");
 assert.equal(await contents.executeJavaScript("document.getElementById('dynamic-modifier').childNodes.length"),3,'Leaving a known label restores its fragments before ordinary translation.');
 await manager.save({...manager.getSettings(),showOriginal:true});
 assert.equal(await contents.executeJavaScript("document.getElementById('roll-modifier').textContent"),'Strength Modifier');
 assert.equal(await contents.executeJavaScript("document.getElementById('slot-event').textContent"),'Level 3 spell slot restored');
 assert.equal(await contents.executeJavaScript("document.getElementById('custom-instructions').textContent"),'Custom Instructions (2/15)');
 await manager.save({...manager.getSettings(),showOriginal:false});
 await until(contents,"document.getElementById('roll-modifier').textContent==='Модификатор Силы'");
 assert.equal(calls.length,offlineCalls,'All roll translations work with descriptions off and the translator unavailable.');
 await contents.executeJavaScript("document.getElementById('bonus').textContent='Bonuses: +3 Wisdom, +2 Proficiency';document.getElementById('portal').innerHTML='<div role=menu><span>Campaign Settings</span><span>Race</span><span>Class</span><span>AC</span></div>'");
 await until(contents,"document.getElementById('bonus').textContent==='Бонусы: +3 Мудрость, +2 Умение'");
 assert.equal(await contents.executeJavaScript("document.getElementById('portal').textContent"),'Настройки кампанииРасаКлассКБ');assert.equal(calls.length,offlineCalls);
 await manager.save({...manager.getSettings(),translateDescriptions:true});
 await website.loadURL('https://play.fables.gg/campaign/play');
 await until(contents,"document.querySelector('#story strong').textContent==='Лес тих.'");
 assert.equal(await contents.executeJavaScript("document.getElementById('term').textContent"),'Спасбросок Мудрости');
 mode='ready';assert.equal((await manager.check()).available,true);
 await contents.executeJavaScript("document.getElementById('late').innerHTML='<p id=recovered>The unfamiliar cave appears.</p>'");
 await until(contents,"document.getElementById('recovered').textContent.startsWith('Перевод')");
 await assert.rejects(settings.webContents.executeJavaScript(`window.translation.save(${JSON.stringify({...manager.getSettings(),port:'https://example.com'})})`),/local port/);
 const impostor=new BrowserWindow({show:false,webPreferences:{partition:'fables-appearance',sandbox:true,contextIsolation:true,nodeIntegration:false,preload:path.join(appRoot,'dist/translation-preload.js')}});
 await impostor.loadURL(TRANSLATION_URL);await assert.rejects(impostor.webContents.executeJavaScript('window.translation.get()'),/only in the app translation window/);impostor.destroy();
 await website.loadURL('https://accounts.example.com/login');await sleep(800);
 assert.equal(await contents.executeJavaScript('typeof window.__friendsFablesDesktopTranslation'),'undefined');
 assert.equal(await contents.executeJavaScript("document.querySelector('h1').textContent"),'Characters');
 // Preferences and cache survive an application restart.
 settings.destroy();await manager.shutdown();manager=new TranslationManager(undefined, null);await manager.initialize();manager.attach(contents);
 assert.equal(manager.getSettings().enabled,true);assert.equal(manager.getSettings().port,preferences.port);
 mode='offline';await website.loadURL('https://play.fables.gg/campaign/play');
 await until(contents,"document.querySelector('#story strong').textContent==='Лес тих.'");
 const reopened=await manager.open(website);reopened.hide();await until(reopened.webContents,'!document.getElementById("apply").disabled');
 await manager.save({...manager.getSettings(),enabled:false});
 assert.equal(await contents.executeJavaScript("document.querySelector('#story strong').textContent"),'The forest is quiet.');
 assert.equal((await reopened.webContents.executeJavaScript('window.translation.clearCache()')).cacheEntries,0);
 if(process.env.FABLES_TEST_SCREENSHOT){reopened.show();await sleep(150);await writeFile(process.env.FABLES_TEST_SCREENSHOT,(await reopened.webContents.capturePage()).toPNG());}
 console.log('PASS: site-wide browser opt-outs, preserved nested opt-outs, themed translation settings and unsaved drafts, home/game labels, local roll outcomes/bonuses/healing, split React labels/counters and original node identities, glossary-only dropdowns, accessibility masking, instant React restoration, placeholder hints, model batching, translation controls, dictionary, mixed Russian, names/URLs/dice preservation, immutable drafts/records, reversible DOM, late/streaming content, model failure/recovery, restart cache, exact origins, and restricted IPC.');
})().then(async()=>{clearTimeout(timer);await manager?.shutdown();for(const window of BrowserWindow.getAllWindows())window.destroy();server?.closeAllConnections();await new Promise(resolve=>server?server.close(resolve):resolve());if(profile && !process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(0);}).catch(async error=>{console.error(error);clearTimeout(timer);await manager?.shutdown();for(const window of BrowserWindow.getAllWindows())window.destroy();server?.closeAllConnections();if(server)server.close();if(profile && !process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(1);});
