(() => {
  const $ = id => document.getElementById(id), audio = $('audio');
  const russian = {
    'Up to 16 folders and 1,000 tracks per folder. MP3, OGG, WAV, FLAC, M4A, OPUS, AAC, and WEBM are supported.':'До 16 папок и 1 000 треков в каждой. Поддерживаются MP3, OGG, WAV, FLAC, M4A, OPUS, AAC и WEBM.',
    'Local file':'Локальный файл','Local folders':'Папки с музыкой','Add folder':'Добавить папку','Refresh':'Обновить','Search local music':'Поиск своей музыки','Track or folder name':'Название трека или папки','Music folder':'Папка с музыкой','All folders':'Все папки','No local tracks found.':'Локальные треки не найдены.','Folder unavailable':'Папка недоступна','Close library':'Закрыть библиотеку','Could not update music folders.':'Не удалось обновить папки с музыкой.','Choose folders containing downloaded music. Removing a folder does not delete its files.':'Выберите папки со скачанной музыкой. Удаление папки из библиотеки не удаляет файлы.','Music continues when this library is closed. Use the toolbar to control playback. Local files stay on this computer. Saved tracks start paused.':'После закрытия библиотеки музыка продолжает играть. Управляйте ею кнопками сверху. Локальные файлы остаются на этом компьютере. Сохранённые треки запускаются с паузы.',
    'Music':'Музыка','Your campaign soundtrack.':'Музыка для вашей кампании.','Playback':'Воспроизведение','NOW PLAYING':'ТЕКУЩИЙ ТРЕК','Choose a track':'Выберите трек',
    'Previous':'Назад','Play':'Играть','Pause':'Пауза','Next':'Далее','Stop':'Стоп','Playback position':'Позиция воспроизведения','Mute':'Без звука','Unmute':'Включить звук','Volume':'Громкость','Loop track':'Повторять трек','Copy track link':'Копировать ссылку',
    'Playlist':'Список треков','Add a direct audio link to get started.':'Добавьте прямую ссылку на аудио.','Add a track':'Добавить трек','Track name':'Название трека','Audio link (HTTPS)':'Ссылка на аудио (HTTPS)','Save track':'Сохранить трек','Remove':'Удалить',
    'Use a direct MP3, OGG, WAV, or other supported audio link. YouTube and Spotify pages cannot play here.':'Нужна прямая ссылка на MP3, OGG, WAV или другой поддерживаемый аудиофайл. Страницы YouTube и Spotify здесь не воспроизводятся.',
    'Loading…':'Загрузка…','Playing':'Воспроизводится','Paused':'Пауза','Stopped':'Остановлено','Track link copied.':'Ссылка на трек скопирована.','Track saved.':'Трек сохранён.',
    'Could not save preferences. Try again.':'Не удалось сохранить настройки. Повторите попытку.','Could not copy this link.':'Не удалось скопировать ссылку.',
    'Could not play this link. Check the connection and use a direct audio file URL.':'Не удалось воспроизвести ссылку. Проверьте соединение и укажите прямую ссылку на аудиофайл.',
    'Use an HTTPS audio link without credentials.':'Укажите ссылку HTTPS без логина и пароля.','The playlist supports up to 50 tracks.':'Можно сохранить до 50 треков.',
    'Add a track name.':'Введите название трека.','This is a website page. Use a direct audio file link.':'Это ссылка на веб-страницу. Укажите прямую ссылку на аудиофайл.',
    'Could not load music preferences.':'Не удалось загрузить настройки музыки.',
    'Music catalog':'Каталог музыки','Music library':'Музыкальная библиотека','Search music':'Поиск музыки','Title, artist, mood, or instrument':'Название, автор, настроение или инструмент',
    'Mood':'Настроение','Genre':'Жанр','All moods':'Все настроения','All genres':'Все жанры','No matching tracks.':'Подходящих треков нет.',
    'Add to playlist':'Добавить в список','In playlist':'В списке','Source':'Источник','License':'Лицензия','Show more':'Показать ещё','Copy attribution':'Копировать авторство',
    'Attribution copied.':'Сведения об авторстве скопированы.','Could not copy attribution.':'Не удалось скопировать сведения об авторстве.','Could not open this link.':'Не удалось открыть ссылку.',
    'Search the built-in catalog. Add tracks to your playlist or play them now.':'Найдите музыку во встроенном каталоге. Добавьте треки в свой список или включите сразу.',
    'Music by Scott Buckley, licensed under CC BY 4.0. Attribution is available for each track. Audio loads only when you press Play.':'Музыка Scott Buckley по лицензии CC BY 4.0. Для каждого трека доступны сведения об авторстве. Аудио загружается только при нажатии «Играть».',
  };
  const tagsRu={
    adventurous:'Приключение',angry:'Гнев',bittersweet:'Светлая грусть',blissful:'Блаженство',brooding:'Мрачные размышления',calm:'Спокойствие',christmas:'Рождество',comedic:'Комедия',cute:'Милое',dark:'Мрак',depressed:'Подавленность',dreamy:'Мечтательность',driving:'Движение',emotional:'Эмоции',energetic:'Энергия',epic:'Эпическое',excited:'Волнение',fun:'Веселье',grandiose:'Величие',happy:'Радость',heroic:'Героизм',hopeful:'Надежда',industrial:'Индустриальное',innocent:'Невинность',inspirational:'Вдохновение',intense:'Напряжение',lonely:'Одиночество',meditative:'Медитация',melancholy:'Меланхолия',militaristic:'Военное',mysterious:'Таинственное',nostalgic:'Ностальгия',ominous:'Зловещее',passionate:'Страсть',peaceful:'Мирное',playful:'Игривое',reflective:'Размышления',relaxed:'Расслабление',romantic:'Романтика',sad:'Печаль',sinister:'Угроза',sleepy:'Сонное',somber:'Сумрачное',sombre:'Сумрачное',spiritual:'Духовное',thoughtful:'Задумчивость',uplifting:'Воодушевление',
    ambient:'Эмбиент','electronica-2':'Электроника',folk:'Фолк',halloween:'Хэллоуин','hip-hop':'Хип-хоп',jazz:'Джаз',neoclassical:'Неоклассика',noir:'Нуар',orchestral:'Оркестровое','pop-2':'Поп','rock-2':'Рок',techno:'Техно',
    accordion:'Аккордеон',bass:'Бас','bass-acoustic':'Контрабас',brass:'Медные духовые',cello:'Виолончель',choir:'Хор',clarinet:'Кларнет','drums-acoustic':'Ударные','drums-electronic':'Электронные ударные','drums-epic':'Эпические ударные','flute-ethnic':'Этническая флейта',glockenspiel:'Колокольчики','guitar-acoustic':'Акустическая гитара','guitar-electric':'Электрогитара',harp:'Арфа',mandolin:'Мандолина',orchestra:'Оркестр',organ:'Орган',percussion:'Перкуссия',piano:'Фортепиано','piano-electric':'Электропиано',recorder:'Блокфлейта',saxophone:'Саксофон',strings:'Струнные','synth-atmospherics':'Атмосферный синтезатор','synth-lead':'Ведущий синтезатор','synth-pad':'Фоновый синтезатор',trumpet:'Труба',ukulele:'Укулеле',vibes:'Вибрафон',violin:'Скрипка','vocals-female':'Женский вокал','vocals-male':'Мужской вокал',woodwinds:'Деревянные духовые',xylophone:'Ксилофон',
  };
  const aliases={epic:'battle combat boss битва бой босс',militaristic:'battle combat march битва бой марш',adventurous:'adventure путешествие приключение',mysterious:'mystery dungeon тайна подземелье',ominous:'horror dungeon ужас подземелье',peaceful:'rest camp town отдых лагерь город',folk:'tavern village таверна деревня',orchestral:'fantasy фэнтези',ambient:'atmosphere атмосфера'};
  let locale = 'en', settings, catalog=[], folderLibrary={folders:[],tracks:[]}, localLimit=30, folderBusy=false, catalogLimit=12, loaded = false, pending = Promise.resolve(), adding = false, playbackNote = '', playbackError = false, saveNote = '', saveError = false, generation = 0;
  const text = value => locale === 'ru' ? russian[value] ?? value : value;
  const current = () => settings?.tracks.find(track => track.id === settings.selected);
  const isLocal=track=>track?.url.startsWith('fables-desktop://music/audio/');
  const hostname = track => { if(isLocal(track))return text('Local file');try { return new URL(track.url).hostname; } catch { return ''; } };
  const catalogTrack=track=>catalog.find(item=>item.url===track?.url);
  const attribution=track=>`${track.title} by ${track.artist} — ${track.license}`;
  const tagLabel=(tag,language=locale)=>language==='ru'?tagsRu[tag]??tag:tag.replace(/-2$/,'').replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());
  const normalize=value=>value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g,'').replaceAll('ё','е');
  function message(target,note,error) { $(target).textContent = text(note); $(target).classList.toggle('error',error); }
  function playback(note,error = false) { playbackNote = note; playbackError = error; message('playback-status',note,error); }
  function saved(note,error = false) { saveNote = note; saveError = error; message('save-status',note,error); }
  function interfaceState(state) {
    locale = state.locale; document.documentElement.lang = locale;
    document.title = `${text('Music')} — Friends & Fables Desktop`; window.settingsTheme.apply(state.theme);
    for (const element of document.querySelectorAll('[data-label]')) element.textContent = text(element.dataset.label);
    for (const element of document.querySelectorAll('[data-aria]')) element.setAttribute('aria-label',text(element.dataset.aria));
    for (const element of document.querySelectorAll('[data-placeholder]')) element.setAttribute('placeholder',text(element.dataset.placeholder));
    for(const [id,key,label] of [['catalog-mood','moods','All moods'],['catalog-genre','genres','All genres']]){
      const filter=$(id),selected=filter.value;filter.replaceChildren();const all=document.createElement('option');all.value='';all.textContent=text(label);filter.append(all);
      for(const value of [...new Set(catalog.flatMap(track=>track[key]))].sort((a,b)=>tagLabel(a).localeCompare(tagLabel(b),locale))){const option=document.createElement('option');option.value=value;option.textContent=tagLabel(value);filter.append(option);}filter.value=selected;
    }
    render(); message('playback-status',playbackNote,playbackError); message('save-status',saveNote,saveError);
  }
  function persist() {
    const snapshot = structuredClone(settings);
    const result = window.music.save(snapshot).then(() => true).catch(() => { saved('Could not save preferences. Try again.',true); return false; });
    pending = Promise.all([pending,result]).then(() => {}); return result;
  }
  function render() {
    const track = current();
    $('track-title').textContent = track?.title ?? text('Choose a track'); $('track-host').textContent = track ? hostname(track) : '';
    const credit=catalogTrack(track);$('track-credit').hidden=!credit;$('track-credit').textContent=credit?attribution(credit):'';$('copy-credit').hidden=!credit;
    for (const id of ['play','stop','copy']) $(id).disabled = !track; $('copy').disabled=!track||isLocal(track);
    for (const id of ['previous','next']) $(id).disabled = !track || settings.tracks.length < 2;
    $('play').textContent = text(audio.paused ? 'Play' : 'Pause'); $('mute').textContent = text(settings.muted ? 'Unmute' : 'Mute'); $('mute').setAttribute('aria-pressed',String(settings.muted));
    $('volume').value = Math.round(settings.volume * 100); $('volume-value').value = `${Math.round(settings.volume * 100)}%`; $('loop').checked = settings.loop;
    $('track-count').textContent = `${settings.tracks.length} / 50`; $('empty').hidden = settings.tracks.length > 0; $('add').disabled = adding || settings.tracks.length >= 50;
    const list = document.createDocumentFragment();
    for (const item of settings.tracks) {
      const row = document.createElement('li'); row.setAttribute('aria-current',String(item.id === settings.selected)); row.dataset.trackId = item.id;
      const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'track';
      const title = document.createElement('span'); title.textContent = item.title; const host = document.createElement('small'); host.textContent = hostname(item); choose.append(title,host);
      choose.addEventListener('click',() => { select(item.id); void play(); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove'; remove.textContent = '×'; remove.setAttribute('aria-label',`${text('Remove')}: ${item.title}`);
      remove.addEventListener('click',() => {
        if (settings.selected === item.id) { resetAudio(); settings.selected = null; }
        settings.tracks = settings.tracks.filter(track => track.id !== item.id);
        settings.selected ??= settings.tracks[0]?.id ?? null; void persist(); render();
      });
      row.append(choose,remove); list.append(row);
    }
    $('playlist').replaceChildren(list);
    renderCatalog(); renderLocal(); report();
  }
  function report(){if(loaded)void window.music.reportPlayback({paused:audio.paused,selected:settings.selected}).catch(console.error);}
  function renderLocal(){
    const selected=$('local-folder-filter').value,filter=$('local-folder-filter');filter.replaceChildren();const all=document.createElement('option');all.value='';all.textContent=text('All folders');filter.append(all);
    const folders=document.createDocumentFragment();
    for(const folder of folderLibrary.folders){const option=document.createElement('option');option.value=folder.id;option.textContent=folder.name;filter.append(option);
      const row=document.createElement('li'),name=document.createElement('span');name.textContent=`${folder.name} · ${folder.unavailable?text('Folder unavailable'):folder.count}`;
      const remove=document.createElement('button');remove.className='secondary';remove.textContent='×';remove.setAttribute('aria-label',`${text('Remove')}: ${folder.name}`);remove.disabled=folderBusy;remove.addEventListener('click',()=>void foldersAction(()=>window.music.removeFolder(folder.id)));row.append(name,remove);folders.append(row);
    }
    $('folders').replaceChildren(folders);filter.value=selected;
    const tokens=normalize($('local-search').value).split(/\s+/).filter(Boolean);
    const matches=folderLibrary.tracks.filter(track=>(!filter.value||track.folderId===filter.value)&&tokens.every(token=>normalize(track.relativePath+' '+(folderLibrary.folders.find(folder=>folder.id===track.folderId)?.name??'')).includes(token)));
    $('local-count').textContent=`${matches.length} / ${folderLibrary.tracks.length}`;$('local-empty').hidden=matches.length>0;$('local-more').hidden=matches.length<=localLimit;
    const list=document.createDocumentFragment();for(const track of matches.slice(0,localLimit)){const row=document.createElement('li'),heading=document.createElement('h3'),detail=document.createElement('p'),actions=document.createElement('div');row.dataset.localId=track.id;heading.textContent=track.title;detail.textContent=track.relativePath;actions.className='catalog-actions';
      const existing=settings.tracks.some(item=>item.url===track.url);
      for(const [action,label] of [['play','Play'],['add',existing?'In playlist':'Add to playlist']]){const button=document.createElement('button');button.textContent=text(label);button.dataset.action=action;button.disabled=adding||(!existing&&settings.tracks.length>=50)||(action==='add'&&existing);button.addEventListener('click',()=>void addCatalog(track,action==='play'));actions.append(button);}
      row.append(heading,detail,actions);list.append(row);
    }$('local-tracks').replaceChildren(list);$('choose-folder').disabled=folderBusy||folderLibrary.folders.length>=16;$('refresh-folders').disabled=folderBusy;
  }
  async function foldersAction(action){if(folderBusy)return;folderBusy=true;renderLocal();try{folderLibrary=await action();$('folder-status').textContent='';}catch{message('folder-status','Could not update music folders.',true);}finally{folderBusy=false;renderLocal();}}
  function renderCatalog(){
    const tokens=normalize($('catalog-search').value).split(/\s+/).filter(Boolean),mood=$('catalog-mood').value,genre=$('catalog-genre').value;
    const matches=catalog.filter(track=>{
      if(mood&&!track.moods.includes(mood)||genre&&!track.genres.includes(genre))return false;
      const tags=[...track.moods,...track.genres,...track.instruments],haystack=normalize([track.title,track.artist,'скотт бакли',...tags,...tags.map(tag=>tagLabel(tag,'ru')),...tags.map(tag=>tagLabel(tag,'en')),...tags.map(tag=>aliases[tag]??'')].join(' '));
      return tokens.every(token=>haystack.includes(token));
    });
    $('catalog-count').textContent=`${matches.length} / ${catalog.length}`;$('catalog-empty').hidden=matches.length>0;$('catalog-more').hidden=matches.length<=catalogLimit;
    const list=document.createDocumentFragment();
    for(const track of matches.slice(0,catalogLimit)){
      const row=document.createElement('li');row.dataset.catalogId=track.id;const heading=document.createElement('h3');heading.textContent=track.title;
      const meta=document.createElement('p');meta.textContent=[track.artist,track.license,...track.genres.map(tag=>tagLabel(tag)),...track.moods.slice(0,3).map(tag=>tagLabel(tag))].join(' · ');
      const actions=document.createElement('div');actions.className='catalog-actions';
      const existing=settings.tracks.some(item=>item.url===track.url);
      for(const [action,label] of [['play','Play'],['add',existing?'In playlist':'Add to playlist'],['source','Source'],['license','License']]){
        const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=text(label);if(action!=='play')button.className='secondary';
        button.disabled=(action==='add'&&existing)||(['play','add'].includes(action)&&(adding||!existing&&settings.tracks.length>=50));
        button.addEventListener('click',()=>{if(action==='play'||action==='add')void addCatalog(track,action==='play');else void window.music.openCatalogLink(track.id,action).catch(()=>message('catalog-status','Could not open this link.',true));});actions.append(button);
      }
      row.append(heading,meta,actions);list.append(row);
    }
    $('catalog').replaceChildren(list);
  }
  async function addCatalog(track,startPlaying){
    if(!loaded||adding)return;let item=settings.tracks.find(item=>item.url===track.url);
    if(item){if(startPlaying){select(item.id);void play();}return;}
    if(settings.tracks.length>=50){message('catalog-status','The playlist supports up to 50 tracks.',true);return;}
    const previous=settings.selected;item={id:crypto.randomUUID(),title:track.title,url:track.url};adding=true;settings.tracks.push(item);settings.selected??=item.id;render();
    try{
      if(await persist()){saved('Track saved.');if(startPlaying){select(item.id);await play();}}
      else{settings.tracks=settings.tracks.filter(value=>value.id!==item.id);settings.selected=previous;}
    }finally{adding=false;render();}
  }
  const time = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60, rest = String(Math.floor(seconds % 60)).padStart(2,'0');
    return hours ? `${hours}:${String(minutes).padStart(2,'0')}:${rest}` : `${minutes}:${rest}`;
  };
  function progress() {
    $('elapsed').textContent = time(audio.currentTime); $('duration').textContent = time(audio.duration);
    $('seek').disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
    if (!$('seek').disabled) $('seek').value = Math.round(audio.currentTime / audio.duration * 1000); else $('seek').value = 0;
  }
  function resetAudio() {
    generation++; audio.pause(); audio.removeAttribute('src'); audio.load(); progress(); playback('Stopped');
  }
  function select(id) {
    if (settings.selected !== id) { resetAudio(); settings.selected = id; void persist(); }
    render();
  }
  async function play() {
    const track = current(); if (!track) return;
    const token = ++generation;
    if (audio.getAttribute('src') !== track.url) audio.src = track.url;
    audio.volume = settings.volume; audio.muted = settings.muted; audio.loop = settings.loop; playback('Loading…');
    try { await audio.play(); if (token === generation) { playback('Playing'); render(); } }
    catch { if (token === generation) { playback('Could not play this link. Check the connection and use a direct audio file URL.',true); render(); } }
  }
  function skip(offset) {
    const index = settings.tracks.findIndex(track => track.id === settings.selected), wasPlaying = !audio.paused;
    if (index < 0 || settings.tracks.length < 2) return;
    select(settings.tracks[(index + offset + settings.tracks.length) % settings.tracks.length].id); if (wasPlaying) void play();
  }
  $('play').addEventListener('click',() => { if (audio.paused) void play(); else { generation++; audio.pause(); playback('Paused'); render(); } });
  $('stop').addEventListener('click',() => { resetAudio(); render(); });
  $('previous').addEventListener('click',() => skip(-1)); $('next').addEventListener('click',() => skip(1));
  $('mute').addEventListener('click',() => { settings.muted = !settings.muted; audio.muted = settings.muted; void persist(); render(); });
  $('volume').addEventListener('input',() => { settings.volume = Number($('volume').value) / 100; audio.volume = settings.volume; $('volume-value').value = `${Math.round(settings.volume * 100)}%`; void persist(); report(); });
  $('loop').addEventListener('change',() => { settings.loop = $('loop').checked; audio.loop = settings.loop; void persist(); render(); });
  $('seek').addEventListener('input',() => { if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = audio.duration * Number($('seek').value) / 1000; progress(); });
  $('copy').addEventListener('click',async () => { try { await pending; await window.music.copyLink(settings.selected); saved('Track link copied.'); } catch { saved('Could not copy this link.',true); } });
  $('copy-credit').addEventListener('click',async()=>{try{await pending;await window.music.copyAttribution(settings.selected);saved('Attribution copied.');}catch{saved('Could not copy attribution.',true);}});
  const tabs=['playlist','catalog','folders'];
  function library(selected){for(const key of tabs){$(`${key}-tab`).setAttribute('aria-selected',String(key===selected));$(`${key}-tab`).tabIndex=key===selected?0:-1;$(`${key}-panel`).hidden=key!==selected;}}
  for(const [index,key] of tabs.entries()){
    $(`${key}-tab`).addEventListener('click',()=>library(key));
    $(`${key}-tab`).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(index+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length];library(next);$(`${next}-tab`).focus();}});
  }
  library('playlist');
  $('close-library').addEventListener('click',()=>void window.music.hide().catch(console.error));
  $('choose-folder').addEventListener('click',()=>void foldersAction(()=>window.music.chooseFolder()));
  $('refresh-folders').addEventListener('click',()=>void foldersAction(()=>window.music.refreshFolders()));
  for(const id of ['local-search','local-folder-filter'])$(id).addEventListener(id==='local-search'?'input':'change',()=>{localLimit=30;renderLocal();});
  $('local-more').addEventListener('click',()=>{localLimit+=30;renderLocal();});
  for(const id of ['catalog-search','catalog-mood','catalog-genre'])$(id).addEventListener(id==='catalog-search'?'input':'change',()=>{catalogLimit=12;$('catalog-status').textContent='';renderCatalog();});
  $('catalog-more').addEventListener('click',()=>{catalogLimit+=12;renderCatalog();});
  for (const event of ['timeupdate','durationchange','loadedmetadata']) audio.addEventListener(event,progress);
  audio.addEventListener('playing',() => { playback('Playing'); render(); });
  audio.addEventListener('waiting',() => { if (!audio.paused) playback('Loading…'); });
  audio.addEventListener('error',() => { if (audio.hasAttribute('src')) { playback('Could not play this link. Check the connection and use a direct audio file URL.',true); render(); } });
  audio.addEventListener('ended',() => {
    const index = settings.tracks.findIndex(track => track.id === settings.selected);
    if (!settings.loop && index >= 0 && index < settings.tracks.length - 1) { select(settings.tracks[index + 1].id); void play(); }
    else { playback('Stopped'); render(); }
  });
  $('add-track').addEventListener('submit',async event => {
    event.preventDefault();
    if (!loaded || adding) return;
    try {
      if (settings.tracks.length >= 50) throw Error('The playlist supports up to 50 tracks.');
      const submittedTitle = $('title').value, submittedUrl = $('url').value;
      const title = submittedTitle.trim(); if (!title) throw Error('Add a track name.');
      let url; try { url = new URL(submittedUrl.trim()); } catch { throw Error('Use an HTTPS audio link without credentials.'); }
      if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use an HTTPS audio link without credentials.');
      if (/(^|\.)(youtube\.com|youtu\.be|spotify\.com)$/.test(url.hostname)) throw Error('This is a website page. Use a direct audio file link.');
      const item = {id:crypto.randomUUID(),title,url:url.href};
      adding = true; settings.tracks.push(item); settings.selected ??= item.id; render();
      if (await persist()) {
        if ($('title').value === submittedTitle && $('url').value === submittedUrl) { $('title').value = ''; $('url').value = ''; }
        saved('Track saved.');
      }
    } catch (error) { saved(error.message,true); }
    finally { adding = false; render(); }
  });
  window.music.onLibrary(state=>{folderLibrary=state;renderLocal();});
  window.music.onControl((command,value)=>{if(!loaded)return;if(command==='volume'){settings.volume=value;audio.volume=value;void persist();render();}else if(command==='repeat'){$('loop').checked=!settings.loop;$('loop').dispatchEvent(new Event('change'));}else $(command)?.click();});
  for(const name of ['pause','play'])audio.addEventListener(name,report);
  window.music.onInterface(state => { if (loaded) interfaceState(state); });
  for (const element of document.querySelectorAll('button,input,select')) element.disabled = true;
  void window.music.get().then(state => {
    settings = state.settings;catalog=state.catalog;folderLibrary=state.library;loaded = true;
    audio.volume = settings.volume; audio.muted = settings.muted; audio.loop = settings.loop;
    for (const element of document.querySelectorAll('button,input,select')) element.disabled = false;
    interfaceState(state); progress();
  }).catch(() => saved('Could not load music preferences.',true));
})();
