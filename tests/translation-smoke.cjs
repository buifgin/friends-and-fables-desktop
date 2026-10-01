const assert=require('node:assert/strict');
const http=require('node:http');
const {mkdtemp,readFile,rm,writeFile}=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');
const {app,BrowserWindow,session}=require('electron');
const appRoot=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'..');
const {AppearanceManager,registerAppearanceScheme}=require(path.join(appRoot,'dist/appearance'));
const {TranslationManager,TRANSLATION_URL}=require(path.join(appRoot,'dist/translation'));
registerAppearanceScheme();app.on('window-all-closed',()=>{});
let profile,manager,server,mode='ready',calls=[],delays=0,batches=[];
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
 assert.equal(unchanged.login,'Sign in with your account.');assert.equal(unchanged.title,'Hide background image');
 assert.deepEqual(unchanged.record,{text:'The forest is quiet.',name:'Aria Moonwhisper',message:'Hello, friends!'});
 await until(contents,"document.getElementById('raw').textContent.startsWith('<img')");
 assert.equal(await contents.executeJavaScript("document.querySelector('#raw img')"),null);assert.equal(await contents.executeJavaScript('window.injected'),undefined);
 await contents.executeJavaScript("document.getElementById('save').click()");assert.equal(await contents.executeJavaScript('window.saveClicks'),1);

 const shared={details:'Сведения',race:'Раса',class:'Класс',subclass:'Подкласс',pronouns:'Местоимения',voice:'Голос',faction:'Фракция',none:'Нет',currencies:'Валюты',gold:'Золотые монеты',silver:'Серебряные монеты',copper:'Медные монеты',backstory:'Предыстория',mannerisms:'Манеры',carrying:'Грузоподъёмность',weight:'10 / 150 фунт.',armor:'Доспехи',head:'Голова',neck:'Шея','equipment-back':'Спина',gloves:'Перчатки',belt:'Пояс',ring:'Кольцо',legs:'Ноги',feet:'Ступни',back:'Назад','campaign-settings':'Настройки кампании',pacing:'Темп кампании',adventure:'Приключение',downtime:'Спокойная игра','model-help':'Выберите модель повествования Франца.',model:'Gemini 3.1 Pro',credits:'2 кредита / ход',franz:'Франц',ac:'КБ','armor-class':'Класс брони',pb:'БУ',proficiency:'Умение',bonus:'Бонусы: +2 Мудрость, +2 Умение','bonus-fragment':'+2 Умение',speed:'30 фт.','split-xp':'1,799 опыта до уровня 4','spellbook-open':'Открыть книгу заклинаний','full-inventory':'Открыть полный инвентарь','voice-franz':'Франц (британский, мужской голос)'};
 for(const [id,text] of Object.entries(shared))assert.equal(await contents.executeJavaScript(`document.getElementById(${JSON.stringify(id)}).textContent`),text,id);
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
 console.log('PASS: site-wide browser opt-outs, preserved nested opt-outs, themed translation settings and unsaved drafts, home/game labels, glossary-only dropdowns, accessibility masking, instant React restoration, placeholder hints, model batching, translation controls, dictionary, mixed Russian, names/URLs/dice preservation, immutable drafts/records, reversible DOM, late/streaming content, model failure/recovery, restart cache, exact origins, and restricted IPC.');
})().then(async()=>{clearTimeout(timer);await manager?.shutdown();for(const window of BrowserWindow.getAllWindows())window.destroy();server?.closeAllConnections();await new Promise(resolve=>server?server.close(resolve):resolve());if(profile && !process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(0);}).catch(async error=>{console.error(error);clearTimeout(timer);await manager?.shutdown();for(const window of BrowserWindow.getAllWindows())window.destroy();server?.closeAllConnections();if(server)server.close();if(profile && !process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(1);});
