const assert = require('node:assert/strict');
const { mkdir, mkdtemp, readFile, rename, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, session, WebContentsView } = require('electron');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..');
const { AppearanceManager, registerAppearanceScheme } = require(path.join(appRoot, 'dist/appearance'));
const { configureZoomShortcuts } = require(path.join(appRoot, 'dist/zoom'));
const { LinuxMenuBar, MENU_URL } = require(path.join(appRoot, 'dist/linux-menu'));

registerAppearanceScheme();
app.on('window-all-closed', () => {});
let userData;
const timeout = setTimeout(() => { console.error('Appearance smoke test timed out.'); app.exit(1); }, 45000);

async function until(contents, expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await contents.executeJavaScript(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function colors(contents) {
  return contents.executeJavaScript(`({
    background: getComputedStyle(document.body).backgroundColor,
    foreground: getComputedStyle(document.body).color,
    panel: getComputedStyle(document.querySelector('.panel')).backgroundColor,
    artwork: getComputedStyle(document.querySelector('.artwork')).backgroundImage,
    message: document.querySelector('input').value,
    bridge: typeof window.appearance,
    node: typeof window.require
  })`);
}

async function save(settings, window) {
  return window.webContents.executeJavaScript(`window.appearance.save(${JSON.stringify(settings)})`);
}

(async () => {
  userData = await mkdtemp(path.join(os.tmpdir(), 'fables-appearance-test-'));
  app.setPath('userData', userData);
  await app.whenReady();
  const manager = new AppearanceManager();
  await manager.initialize();

  const testSession = session.fromPartition('appearance-smoke');
  testSession.protocol.handle('https', () => new Response(`<!doctype html>
    <html><head><meta charset="utf-8"><style>
      :root { --background: 195 86% 3%; --foreground: 39 29% 93%; --card: 198 50% 5%; }
      body { background: hsl(var(--background)); color: hsl(var(--foreground)); }
      .panel { background: hsl(var(--card)); }
      .artwork { background-image: linear-gradient(45deg, #42315b, #172737); }
      [id^="event-message-card-"], .composer { background-color: #1f2937cc; }
      .prose { color: #f3f3f3; --tw-prose-body: #f3f3f3; }
      .prose p { color: var(--tw-prose-body); }
      input { color: #000; background: transparent; }
      .text-gray-400, .text-muted-foreground { color: #6b7280; }
      .fixed-white { color: #fff; }
      .text-red-400 { color: #f87171; }
      .bg-gray-800 { background: #1f2937; }
      .bg-slate-700 { background: #334155; }
      .bg-cyan-600 { background: #0891b2; }
      #context-block { background: #164e6366; border: 1px solid #0891b299; color:#a5f3fc; }
      #context-search-bar, #context-footer { background:#1f2937; }
      #movement-card { background:linear-gradient(90deg,#172554,#000);border:2px solid #172554; }
      #roll-card { background:linear-gradient(#0f172af2,#020617f2);border:2px solid #d97706; }
      .transition-all { transition-property: all; }
      .duration-700 { transition-duration: .7s; }
      .tiptap [data-placeholder]::before { content: attr(data-placeholder); color: #777; }
    </style></head><body><button id="background-toggle" title="Hide background image">Background</button>
    <div class="panel">Panel</div><div class="artwork">Campaign artwork</div>
    <div class="flex-1 h-full w-full"><div id="events-list">
      <div id="event-container-1"><div id="event-message-card-1"><p>Player text</p></div></div>
      <div id="event-container-2"><div id="event-message-card-2">
        <button id="thoughts" aria-controls="thoughts-content" class="text-gray-400"><svg></svg><span>Thoughts</span></button>
        <div class="prose"><p>GM text</p><strong id="gm-heading" class="fixed-white">Бой завершён</strong></div>
      </div></div>
      <div id="event-result"><div id="battle-summary" class="bg-black/40 border-slate-700">
        <h2 class="text-gray-400">Battle</h2>
        <div id="battle-row" class="bg-slate-800/60 backdrop-blur-sm border-slate-700">
          <h3>Character</h3><span>24 damage</span><svg id="damage-icon" class="text-red-400"></svg>
          <div id="damage-track" class="bg-slate-700"><div id="damage-fill" style="background:red;width:50%"></div></div>
        </div>
      </div></div>
      <div id="event-move"><div id="movement-card" class="p-2 md:p-4 bg-card-light rounded-md relative flex items-center border-solid border-2 border-blue-950 bg-gradient-to-l from-card to-blue-950"><span>Player Moves 5 feet south to (7, 8)</span></div></div>
      <div id="event-dice"><div id="event-message-card-roll" class="rounded-md relative bg-transparent p-0"><div id="roll-card" class="relative from-slate-900/95 to-slate-950/95 rounded-2xl border-2 backdrop-blur-sm animate-in fade-in-0">
        <div class="absolute inset-0 pointer-events-none" id="roll-ornament">Decoration</div><h3 class="text-amber-300">Death Save</h3>
        <svg id="d20" class="transition-all duration-700 ease-out"><defs><style>.cls-2 { fill: #203d73; }.cls-4 { fill: #203da6; }.cls-3 { fill: #203de3; }.cls-1 { fill: none; stroke: #c59045; }.cls-6 { fill: #DABD74; }.number-text { fill: #F8C134; }</style></defs><polygon class="cls-6" points="0,0 40,0 20,40"/><path class="cls-4" d="M0 0h40v40Z"/><path class="cls-2" d="M0 0h10v10Z"/><path class="cls-3" d="M10 10h10v10Z"/><polyline class="cls-1" points="0,0 40,40"/><text class="number-text">16</text></svg>
        <svg id="d8"><path class="d8-cls-4"/><path class="d8-cls-5"/><text class="d8-number-text">4</text></svg>
      </div></div></div>
    </div><input type="text" value="Русский текст and English"><textarea>Input text</textarea>
      <div class="grid relative" id="fixture-composer"><div id="working-context-bar-spacer"></div>
        <div class="absolute bottom-full left-0 right-0"><div class="bg-gray-800" id="context-bar">
          <span class="text-gray-400">9 Active / 0 Idle</span><button aria-label="Expand working context"><svg></svg></button>
        </div><div class="relative bg-gray-800 border-x border-b border-gray-700/50 overflow-hidden shadow-md flex flex-col max-h-[calc(90dvh-200px)]" id="context-panel-root">
          <div class="flex-1 overflow-y-auto"><div class="flex flex-col h-full">
            <div class="bg-gray-800" id="context-usage"><div class="bg-gray-700"><span class="bg-cyan-600" id="context-category">Category</span></div></div>
            <div class="bg-gray-800" id="context-search-bar"><input id="context-search" placeholder="Search context blocks..." class="bg-gray-900/50 text-gray-400"><button><svg class="text-gray-400"></svg></button></div>
            <div class="flex-1 overflow-y-auto min-h-0"><div class="group rounded-lg border cursor-pointer bg-cyan-900/40 border-cyan-600/60" id="context-block"><div class="p-3 relative"><span class="text-cyan-200">Instruction</span><p class="text-cyan-100">Campaign note</p><button aria-label="Context Block Actions. Use up and down arrow keys to navigate."><svg></svg></button></div></div></div>
            <div class="bg-gray-900/50" id="context-footer"><button>Add Context Block</button></div>
          </div></div>
        </div></div>
        <div class="composer bg-gray-800/80"><div class="tiptap prose" contenteditable="true"><p data-placeholder="Player says or does…">Editor text</p></div>
          <button id="dice-button" aria-label="Roll dice" class="text-muted-foreground"><svg></svg><span>Dice</span></button>
          <button id="spell-button" aria-label="Cast Spell"><svg></svg><span>Spell</span></button>
          <button id="model-button"><span class="text-gray-400">Model</span></button>
          <button id="manual-button"><svg class="text-gray-400"></svg><span>Manual</span></button>
        </div>
      </div>
    </div>
    <form id="character-form"><input name="name" type="text" value="Character"><input name="max_hp" type="text" value="24"><input name="strength" type="number" value="12"></form>
    <div role="dialog" id="roll-breakdown" class="w-80 bg-slate-900/95 border-amber-600/50 text-amber-100"><span class="text-amber-200">Base Roll</span><b>17</b><div class="border-amber-600/50">Total 21</div></div>
    <script>
      document.getElementById('event-message-card-1').__reactFiber$test = {memoizedProps:{event:{role:'player'}}};
      document.getElementById('event-message-card-2').__reactFiber$test = {memoizedProps:{event:{role:'dm'}}};
    </script></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));
  const website = new BrowserWindow({ show: false, webPreferences: {
    session: testSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
  } });
  manager.attach(website.webContents);
  configureZoomShortcuts(website.webContents);
  await website.loadURL('https://play.fables.gg/test/play');
  const original = await colors(website.webContents);
  assert.equal(original.bridge, 'undefined');
  assert.equal(original.node, 'undefined');

  const settingsWindow = await manager.open(website);
  settingsWindow.hide();
  await until(settingsWindow.webContents, "!document.querySelector('#apply').disabled");
  const settingsContents = settingsWindow.webContents;
  await save({ preset: 'amoled', customColor: '#161616' }, settingsWindow);
  const amoled = await colors(website.webContents);
  assert.equal(amoled.background, 'rgb(0, 0, 0)');
  assert.equal(amoled.panel, 'rgb(0, 0, 0)');
  assert.equal(amoled.artwork, original.artwork);
  assert.equal(amoled.message, original.message);
  assert.equal(amoled.bridge, 'undefined');

  const reloaded = new Promise((resolve) => website.webContents.once('did-finish-load', resolve));
  website.webContents.reload();
  await reloaded;
  await until(website.webContents, "getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)'");
  await save({ preset: 'black', customColor: '#161616' }, settingsWindow);
  assert.equal((await colors(website.webContents)).background, 'rgb(16, 16, 16)');
  await save({ preset: 'light', customColor: '#161616' }, settingsWindow);
  const light = await colors(website.webContents);
  assert.equal(light.background, 'rgb(245, 245, 245)');
  assert.equal(light.foreground, 'rgb(0, 0, 0)');
  assert.equal(light.artwork, original.artwork);
  await save({ preset: 'custom', customColor: '#123456' }, settingsWindow);
  assert.equal((await colors(website.webContents)).background, 'rgb(18, 52, 86)');
  await save({ preset: 'custom', customColor: '#747474' }, settingsWindow);
  const customContrast = await website.webContents.executeJavaScript(`(() => {
    const luminance = color => {
      const channels = color.match(/\\d+/g).slice(0, 3).map(Number).map(x => x / 255)
        .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const style = getComputedStyle(document.querySelector('.panel'));
    return (luminance(style.color) + .05) / (luminance(style.backgroundColor) + .05);
  })()`);
  assert(customContrast >= 4.5, 'Midtone custom backgrounds need readable panel text.');

  await assert.rejects(save({ preset: 'custom', customColor: '#000000; color:red' }, settingsWindow), /#RRGGBB/);
  await save({ preset: 'website', customColor: '#123456' }, settingsWindow);
  await until(website.webContents, `getComputedStyle(document.body).backgroundColor === ${JSON.stringify(original.background)}`);
  assert.deepEqual(await colors(website.webContents), original);

  const picture = path.join(userData, 'picture.png');
  await writeFile(picture, nativeImage.createFromBitmap(Buffer.from([0,0,255,255,255,0,0,255,0,255,0,255,0,0,0,255]), {width:2,height:2}).toPNG());
  const showDialog = dialog.showOpenDialog;
  dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
  assert.equal(await settingsContents.executeJavaScript('window.appearance.importImage()'), null);
  const invalidPicture = path.join(userData, 'invalid.png');
  await writeFile(invalidPicture, 'This is not an image.');
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [invalidPicture] });
  await assert.rejects(settingsContents.executeJavaScript('window.appearance.importImage()'), /could not be read as an image/);
  const jpegPicture = path.join(userData, 'picture.jpg');
  await writeFile(jpegPicture, nativeImage.createFromPath(picture).toJPEG(90));
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [jpegPicture] });
  const jpegImport = await settingsContents.executeJavaScript('window.appearance.importImage()');
  assert.match(jpegImport.preview, /^data:image\/png;base64,/);
  assert.deepEqual(nativeImage.createFromDataURL(jpegImport.preview).getSize(), {width:2,height:2});
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [picture] });
  const imported = await settingsContents.executeJavaScript('window.appearance.importImage()');
  dialog.showOpenDialog = showDialog;
  assert.match(imported.id, /^[a-f0-9]{64}\.png$/);
  const chatSettings = { preset: 'website', customColor: '#123456', backgroundImage: imported.id,
    backgroundName: imported.name, backgroundFit: 'contain', messages: { enabled: true,
      player: {color:'#123456',opacity:.4}, gm:{color:'#654321',opacity:.7} } };
  await save(chatSettings, settingsWindow);
  const chat = await website.webContents.executeJavaScript(`({
    player:getComputedStyle(document.getElementById('event-message-card-1')).backgroundColor,
    gm:getComputedStyle(document.getElementById('event-message-card-2')).backgroundColor,
    input:getComputedStyle(document.querySelector('input')).backgroundColor,
    textarea:getComputedStyle(document.querySelector('textarea')).backgroundColor,
    composer:getComputedStyle(document.querySelector('.composer')).backgroundColor,
    opacity:getComputedStyle(document.getElementById('event-message-card-1')).opacity,
    image:getComputedStyle(document.querySelector('[data-ff-desktop-chat]'),'::before').backgroundImage,
    fit:getComputedStyle(document.querySelector('[data-ff-desktop-chat]'),'::before').backgroundSize
  })`);
  assert.equal(chat.player, 'rgba(18, 52, 86, 0.4)');
  assert.equal(chat.gm, 'rgba(101, 67, 33, 0.7)');
  assert.equal(chat.input, chat.player);
  assert.equal(chat.textarea, chat.player);
  assert.equal(chat.composer, chat.player);
  assert.equal(chat.opacity, '1');
  assert(chat.image.includes(imported.preview));
  assert.equal(chat.fit, 'contain');
  assert.equal((await colors(website.webContents)).artwork, original.artwork);
  // The site's existing background switch controls the local picture as well.
  await website.webContents.executeJavaScript("document.getElementById('background-toggle').title = 'Show background image'");
  await until(website.webContents, "!document.querySelector('[data-ff-desktop-chat]')");
  assert.equal(await website.webContents.executeJavaScript("document.getElementById('event-message-card-1').dataset.ffDesktopMessage"), 'player');
  await website.webContents.executeJavaScript("document.getElementById('background-toggle').title = 'Hide background image'");
  await until(website.webContents, "!!document.querySelector('[data-ff-desktop-chat]')");
  await website.webContents.executeJavaScript("document.getElementById('background-toggle').remove(); localStorage.setItem('play-show-poi-background-test', 'false')");
  await until(website.webContents, "!document.querySelector('[data-ff-desktop-chat]')");
  await website.webContents.executeJavaScript("localStorage.setItem('play-show-poi-background-test', 'true'); dispatchEvent(new StorageEvent('storage'))");
  await until(website.webContents, "!!document.querySelector('[data-ff-desktop-chat]')");
  const explicitText = {...chatSettings,messages:{enabled:true,
    player:{color:'#123456',opacity:.4,textColor:'#aabbcc'},gm:{color:'#654321',opacity:.7,textColor:'#ffeeaa'}}};
  await save(explicitText, settingsWindow);
  const expanded = await website.webContents.executeJavaScript(`(() => {
    const bg = id => getComputedStyle(document.getElementById(id)).backgroundColor;
    const fg = selector => getComputedStyle(document.querySelector(selector)).color;
    return {buttons:['dice-button','spell-button','model-button','manual-button'].map(bg),
      icons:fg('#dice-button svg'),buttonText:fg('#model-button span'),context:bg('context-bar'),contextText:fg('#context-bar span'),
      editor:fg('.tiptap p'),placeholder:getComputedStyle(document.querySelector('.tiptap [data-placeholder]'),'::before').color,
      battle:bg('battle-row'),summary:bg('battle-summary'),damageIcon:fg('#damage-icon'),damageFill:bg('damage-fill'),
      thoughts:fg('#thoughts span'),heading:fg('#gm-heading')};
  })()`);
  assert.deepEqual(expanded.buttons, Array(4).fill(chat.player));
  for (const value of [expanded.icons,expanded.buttonText,expanded.editor,expanded.placeholder]) assert.equal(value, 'rgb(170, 187, 204)');
  assert.equal(expanded.context, 'rgb(16, 16, 16)');
  assert.equal(expanded.contextText, 'rgb(255, 255, 255)');
  assert.equal(expanded.battle, chat.gm);
  assert.equal(expanded.summary, chat.gm);
  assert.equal(expanded.damageIcon, 'rgb(248, 113, 113)');
  assert.equal(expanded.damageFill, 'rgb(255, 0, 0)');
  assert.equal(expanded.thoughts, 'rgb(255, 238, 170)');
  assert.equal(expanded.heading, 'rgb(255, 238, 170)');
  await save({...explicitText,preset:'amoled',messages:{...explicitText.messages,
    player:{color:'#ffffff',opacity:0,textColor:'#000000'}}}, settingsWindow);
  assert.deepEqual(await website.webContents.executeJavaScript("Array.from(document.querySelectorAll('#character-form input'), input => getComputedStyle(input).color)"),
    Array(3).fill('rgb(255, 255, 255)'));
  assert.equal(await website.webContents.executeJavaScript("document.querySelector('#character-form input').hasAttribute('data-ff-desktop-message')"), false);
  // Automatic text color uses the app color when the message is transparent.
  await save({...chatSettings,preset:'amoled',messages:{...chatSettings.messages,player:{color:'#ffffff',opacity:0}}}, settingsWindow);
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('.tiptap')).color"), 'rgb(255, 255, 255)');
  await save(chatSettings, settingsWindow);
  await save({...chatSettings,messages:{...chatSettings.messages,gm:{color:'#eeeeee',opacity:1}}}, settingsWindow);
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('#event-message-card-2 p')).color"), 'rgb(0, 0, 0)');
  await save(chatSettings, settingsWindow);
  // Exercise the new renderer controls, including a completely transparent card.
  await settingsContents.executeJavaScript(`window.appearance.get().then(settings => {
    showSettings(settings);
    document.querySelector('[data-panel="messages-panel"]').click();
    document.querySelector('#player-auto-text').click();
    document.querySelector('#player-text-color').value = '#aabbcc';
    document.querySelector('#gm-auto-text').click();
    document.querySelector('#gm-text-color').value = '#ffeeaa';
    document.querySelector('#player-opacity').value = 0;
    document.querySelector('#player-opacity').dispatchEvent(new Event('input', {bubbles:true}));
    document.querySelector('#appearance-form').requestSubmit();
  })`);
  await until(settingsContents, "!document.querySelector('#apply').disabled");
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('.composer')).backgroundColor"), 'rgba(18, 52, 86, 0)');
  assert.equal(await settingsContents.executeJavaScript("document.querySelector('#player-opacity-label').value"), '0%');
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('.tiptap p')).color"), 'rgb(170, 187, 204)');
  assert.equal(await settingsContents.executeJavaScript('window.appearance.get().then(s => s.messages.gm.textColor)'), '#ffeeaa');
  await save(chatSettings, settingsWindow);
  // Independent context styling must remain opaque when player messages disappear.
  const newSettings = { ...explicitText, preset:'amoled',
    backgroundEffects:{blur:8,opacity:.7,overlayColor:'#000000',overlayOpacity:.6},
    messages:{enabled:true,
      player:{color:'#ffffff',opacity:0,textColor:'#aabbcc',border:{enabled:true,color:'#778899',width:2,radius:12}},
      gm:{color:'#654321',opacity:.7,textColor:'#ffeeaa',gradient:{enabled:true,color:'#222222',angle:135},border:{enabled:true,color:'#abcdef',width:3,radius:10}}},
    context:{enabled:true,style:{color:'#111111',opacity:1,textColor:'#eeeeee',border:{enabled:true,color:'#555555',width:2,radius:6}}},
    events:{enabled:true,style:{color:'#303040',opacity:.8,textColor:'#ddeeff',gradient:{enabled:true,color:'#010101',angle:90},border:{enabled:true,color:'#aa77ff',width:2,radius:4}}},
    dice:{enabled:true,style:{color:'#080808',opacity:1,textColor:'#dddddd',border:{enabled:true,color:'#777777',width:1,radius:16}},colorsEnabled:true,faceColor:'#7c3aed',edgeColor:'#aaaaaa',numberColor:'#ffffff'} };
  await save(newSettings,settingsWindow);
  const newStyles = await website.webContents.executeJavaScript(`(() => {
    const style = id => { const c=getComputedStyle(document.getElementById(id));return {bg:c.backgroundColor,image:c.backgroundImage,fg:c.color,border:c.borderTopColor,width:c.borderTopWidth,radius:c.borderRadius}; };
    const root=document.querySelector('[data-ff-desktop-chat]');
    return {context:['context-bar','context-panel-root','context-block','context-footer'].map(style),
      contextText:getComputedStyle(document.querySelector('#context-block p')).color,contextSearch:style('context-search'),
      category:getComputedStyle(document.getElementById('context-category')).backgroundColor,
      player:style('event-message-card-1'),gm:style('event-message-card-2'),event:style('movement-card'),roll:style('roll-card'),
      face:getComputedStyle(document.querySelector('#d20 .cls-4')).fill,edge:getComputedStyle(document.querySelector('#d20 .cls-1')).stroke,
      number:getComputedStyle(document.querySelector('#d20 text')).fill,d8:getComputedStyle(document.querySelector('#d8 .d8-cls-4')).fill,
      numberValue:document.querySelector('#d20 text').textContent,transition:getComputedStyle(document.querySelector('#d20')).transitionDuration,
      ornament:getComputedStyle(document.getElementById('roll-ornament')).display,
      blur:getComputedStyle(root,'::before').filter,imageOpacity:getComputedStyle(root,'::before').opacity,overlay:getComputedStyle(root,'::after').backgroundColor};
  })()`);
  for (const c of newStyles.context.slice(0,3)) assert.equal(c.bg,'rgb(17, 17, 17)');
  assert.equal(newStyles.context[3].bg,'rgba(0, 0, 0, 0)'); // Transparent footer over the solid panel.
  assert.equal(newStyles.contextText,'rgb(238, 238, 238)');
  assert.equal(newStyles.contextSearch.fg,'rgb(238, 238, 238)');
  assert.equal(newStyles.category,'rgb(8, 145, 178)');
  assert.equal(newStyles.player.bg,'rgba(255, 255, 255, 0)');
  assert.equal(newStyles.player.width,'2px'); assert.equal(newStyles.player.radius,'12px');
  assert.equal(newStyles.gm.width,'3px'); assert.equal(newStyles.gm.border,'rgb(171, 205, 239)');
  assert.match(newStyles.gm.image,/135deg/); assert.match(newStyles.event.image,/linear-gradient/);
  assert.equal(newStyles.event.width,'2px'); assert.equal(newStyles.event.radius,'4px');
  assert.equal(newStyles.roll.bg,'rgb(8, 8, 8)'); assert.equal(newStyles.ornament,'none');
  assert.equal(newStyles.face,'rgb(124, 58, 237)'); assert.equal(newStyles.d8,newStyles.face);
  assert.equal(newStyles.edge,'rgb(170, 170, 170)'); assert.equal(newStyles.number,'rgb(255, 255, 255)');
  assert.equal(newStyles.numberValue,'16');
  assert.equal(newStyles.transition,'0.7s');
  assert.equal(newStyles.blur,'blur(8px)');assert.equal(newStyles.imageOpacity,'0.7');assert.equal(newStyles.overlay,'rgba(0, 0, 0, 0.6)');
  await save({...newSettings,context:{enabled:true,style:{color:'#ffffff',opacity:0}}},settingsWindow);
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.getElementById('context-panel-root')).backgroundColor"),'rgba(255, 255, 255, 0)');
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.getElementById('context-block')).backgroundColor"),'rgb(255, 255, 255)');
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('#context-block p')).color"),'rgb(0, 0, 0)');
  await save(newSettings,settingsWindow);
  // A future die added by the website receives paint without replacing its SVG or result.
  await website.webContents.executeJavaScript(`{const die=document.createElementNS('http://www.w3.org/2000/svg','svg');die.id='d4';die.innerHTML='<path class="d4-cls-2"/><text>3</text>';document.getElementById('roll-card').append(die);}`);
  await until(website.webContents, "document.getElementById('d4').dataset.ffDesktopDie === 'd4'");
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('#d4 path')).fill"),'rgb(124, 58, 237)');
  await assert.rejects(save({...newSettings,backgroundEffects:{...newSettings.backgroundEffects,blur:Infinity}},settingsWindow),/between/);
  await assert.rejects(save({...newSettings,dice:{...newSettings.dice,faceColor:'red; fill:url(secret)'}},settingsWindow),/#RRGGBB/);
  await assert.rejects(save({...newSettings,context:{enabled:true,style:{...newSettings.context.style,border:{enabled:true,color:'#ffffff',width:100,radius:8}}}},settingsWindow),/between/);
  // Exercise the in-app picker and a burst of color changes with a large preview URL.
  settingsWindow.show(); // Hidden windows throttle requestAnimationFrame.
  await settingsContents.executeJavaScript('window.appearance.get().then(showSettings)');
  await settingsContents.executeJavaScript(`document.querySelector('[data-panel="messages-panel"]').click();document.getElementById('player-color').click();`);
  assert.equal(await settingsContents.executeJavaScript("document.getElementById('color-picker').open"),true);
  const drag = await settingsContents.executeJavaScript(`(async () => {
    imagePreview='data:image/png;base64,'+'A'.repeat(4*1024*1024);updatePreview();
    element('picker-s').value=70;element('picker-s').dispatchEvent(new Event('input',{bubbles:true}));
    element('picker-l').value=50;element('picker-l').dispatchEvent(new Event('input',{bubbles:true}));
    const style=preview.style, original=style.setProperty.bind(style);let imageWrites=0;
    style.setProperty=(name,value)=>{if(name==='--preview-image')imageWrites++;original(name,value);};
    const start=performance.now();
    for(let i=0;i<200;i++){element('picker-h').value=i;element('picker-h').dispatchEvent(new Event('input',{bubbles:true}));}
    await new Promise(resolve=>requestAnimationFrame(resolve));
    style.setProperty=original;
    return {imageWrites,elapsed:performance.now()-start,color:element('player-color').value};
  })()`);
  assert.equal(drag.imageWrites,0,'Dragging must not reparse the image data URL.');
  assert(drag.elapsed < 1000, `Color drag burst took ${drag.elapsed}ms`);
  console.log(`Picker check: 200 color inputs in ${Math.round(drag.elapsed)}ms; image URL writes: ${drag.imageWrites}.`);
  if (process.env.FABLES_TEST_SCREENSHOT) {
    await new Promise(resolve => setTimeout(resolve, 100));
    await writeFile(process.env.FABLES_TEST_SCREENSHOT.replace(/\.png$/, '-picker.png'), (await settingsContents.capturePage()).toPNG());
  }
  await settingsContents.executeJavaScript("document.getElementById('picker-cancel').click()");
  settingsWindow.hide();
  assert.equal(await settingsContents.executeJavaScript("document.getElementById('player-color').value"),'#ffffff');
  await settingsContents.executeJavaScript(`document.querySelector('[data-panel="dice-panel"]').click();document.querySelector('[data-dice-preset="white"]').click();document.getElementById('appearance-form').requestSubmit();`);
  await until(settingsContents,"!document.getElementById('apply').disabled");
  assert.equal(await settingsContents.executeJavaScript('window.appearance.get().then(s=>s.dice.faceColor)'),'#eeeeee');
  await save(chatSettings, settingsWindow);
  // Three independent context surfaces and decorated dice popovers.
  const separateContext={enabled:true,
    style:{color:'#223344',opacity:1,textColor:'#abcdef',border:{enabled:true,color:'#aa7722',width:1,radius:8,variant:'ornate'}},
    blocks:{color:'#556677',opacity:.6,textColor:'#ffeeaa',border:{enabled:true,color:'#cc9955',width:2,radius:6,variant:'arcane'}},
    bar:{color:'#112233',opacity:.9,textColor:'#eeddcc',border:{enabled:true,color:'#bbbbbb',width:1,radius:10,variant:'runic'}}};
  const decorated={...newSettings,context:separateContext,dice:{...newSettings.dice,style:{...newSettings.dice.style,border:{enabled:true,color:'#cdaa55',width:2,radius:12,variant:'ornate'}}}};
  await save(decorated,settingsWindow);
  const surfaces=await website.webContents.executeJavaScript(`(()=>{
    const get=(id)=>{const e=document.getElementById(id),c=getComputedStyle(e);return {bg:c.backgroundColor,fg:c.color,ornament:getComputedStyle(e,'::after').backgroundImage,events:getComputedStyle(e,'::after').pointerEvents};};
    return {panel:get('context-panel-root'),block:get('context-block'),bar:get('context-bar'),menu:get('roll-breakdown'),text:getComputedStyle(document.querySelector('#roll-breakdown span')).color};
  })()`);
  assert.equal(surfaces.panel.bg,'rgb(34, 51, 68)');assert.equal(surfaces.block.bg,'rgba(85, 102, 119, 0.6)');assert.equal(surfaces.bar.bg,'rgba(17, 34, 51, 0.9)');
  assert.equal(surfaces.panel.fg,'rgb(171, 205, 239)');assert.equal(surfaces.block.fg,'rgb(255, 238, 170)');assert.equal(surfaces.bar.fg,'rgb(238, 221, 204)');
  for(const surface of Object.values(surfaces).filter(v=>typeof v==='object')){assert.match(surface.ornament,/data:image\/svg\+xml/);assert.equal(surface.events,'none');}
  assert.equal(surfaces.menu.bg,'rgb(8, 8, 8)');assert.equal(surfaces.text,'rgb(221, 221, 221)');
  if(process.env.FABLES_TEST_SCREENSHOT){
    await settingsContents.executeJavaScript("window.appearance.get().then(showSettings);document.querySelector('[data-panel=\"context-panel\"]').click()");
    website.show();settingsWindow.show();
    const {floatAppearance}=require(path.join(appRoot,'dist/floating-appearance'));
    await floatAppearance(settingsWindow,true);await new Promise(resolve=>setTimeout(resolve,250));
    await writeFile(process.env.FABLES_TEST_SCREENSHOT.replace(/\.png$/,'-ornaments.png'),(await settingsContents.capturePage()).toPNG());
    settingsWindow.hide();
  }
  // Expanding the header switches it from the bar palette to the panel palette.
  await website.webContents.executeJavaScript("document.querySelector('[aria-label=\"Expand working context\"]').remove()");
  await until(website.webContents,"document.getElementById('context-bar').dataset.ffDesktopContext==='panel'");
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.getElementById('context-bar')).backgroundColor"),'rgb(34, 51, 68)');
  await website.webContents.executeJavaScript(`document.getElementById('context-bar').insertAdjacentHTML('beforeend','<button aria-label="Expand working context"></button>')`);
  await until(website.webContents,"document.getElementById('context-bar').dataset.ffDesktopContext==='bar'");
  // Export/import includes a portable picture without paths or machine preferences.
  const saveDialog=dialog.showSaveDialog;
  const themeFile=path.join(userData,'shared.fables-theme.json');
  dialog.showSaveDialog=async()=>({canceled:false,filePath:themeFile});
  assert.equal(await settingsContents.executeJavaScript(`window.appearance.exportTheme(${JSON.stringify(decorated)},true)`),true);
  dialog.showSaveDialog=saveDialog;
  const shared=JSON.parse(await readFile(themeFile,'utf8'));
  assert.equal(shared.version,1);assert(shared.image.pngBase64);assert.equal(shared.appearance.backgroundImage,null);
  assert.equal(shared.appearance.linuxBlackMenu,undefined);assert.equal(shared.appearance.linuxFloatingAppearance,undefined);
  dialog.showSaveDialog=async()=>({canceled:false,filePath:themeFile});
  await settingsContents.executeJavaScript(`window.appearance.exportTheme(${JSON.stringify(decorated)},false)`);
  assert.equal(JSON.parse(await readFile(themeFile,'utf8')).image,null);
  dialog.showOpenDialog=async()=>({canceled:false,filePaths:[themeFile]});
  const colorOnly=await settingsContents.executeJavaScript('window.appearance.importTheme()');
  assert.equal(colorOnly.backgroundImage,decorated.backgroundImage);
  assert.equal(colorOnly.linuxFloatingAppearance,manager.getSettings().linuxFloatingAppearance);
  await writeFile(themeFile,JSON.stringify(shared));dialog.showSaveDialog=saveDialog;
  dialog.showOpenDialog=async()=>({canceled:false,filePaths:[themeFile]});
  const importedTheme=await settingsContents.executeJavaScript('window.appearance.importTheme()');
  assert.deepEqual(importedTheme.context, (await settingsContents.executeJavaScript('window.appearance.get()')).context);
  assert.equal(importedTheme.imagePreview,imported.preview);
  dialog.showOpenDialog=showDialog;
  const invalidTheme=path.join(userData,'bad-theme.json');
  await writeFile(invalidTheme,JSON.stringify({...shared,appearance:{...shared.appearance,context:{...shared.appearance.context,style:{...shared.appearance.context.style,border:{...shared.appearance.context.style.border,variant:'url(secret)'}}}}}));
  dialog.showOpenDialog=async()=>({canceled:false,filePaths:[invalidTheme]});
  await assert.rejects(settingsContents.executeJavaScript('window.appearance.importTheme()'),/supported border/);
  dialog.showOpenDialog=showDialog;
  // The selected folder survives restarts and paginates all supported files.
  const folder=path.join(userData,'background-options');await mkdir(folder);
  for(let i=0;i<14;i++)await writeFile(path.join(folder,`picture-${String(i).padStart(2,'0')}.png`),nativeImage.createFromBitmap(Buffer.from([i,120,240,255]),{width:1,height:1}).toPNG());
  await writeFile(path.join(folder,'notes.txt'),'not a picture');
  dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});
  const folderPage=await settingsContents.executeJavaScript('window.appearance.chooseFolder()');
  dialog.showOpenDialog=showDialog;
  assert.equal(folderPage.folderName,'background-options');assert.equal(folderPage.total,14);assert.equal(folderPage.items.length,12);assert.equal(folderPage.nextOffset,12);
  const secondPage=await settingsContents.executeJavaScript('window.appearance.folderPictures(12)');assert.equal(secondPage.items.length,2);assert.equal(secondPage.nextOffset,null);
  await writeFile(path.join(folder,'new.png'),nativeImage.createFromBitmap(Buffer.from([250,10,30,255]),{width:1,height:1}).toPNG());
  assert.equal((await settingsContents.executeJavaScript('window.appearance.folderPictures()')).total,15);
  await rm(path.join(folder,'new.png'));
  await rename(folder,`${folder}-moved`);
  await assert.rejects(settingsContents.executeJavaScript('window.appearance.folderPictures()'),/ENOENT/);
  await rename(`${folder}-moved`,folder);
  const folderPicture=await settingsContents.executeJavaScript(`window.appearance.selectFolderPicture(${JSON.stringify(folderPage.items[0].id)})`);
  assert.match(folderPicture.id,/^[a-f0-9]{64}\.png$/);
  await assert.rejects(settingsContents.executeJavaScript("window.appearance.selectFolderPicture('../private')"),/selected folder/);
  await assert.rejects(settingsContents.executeJavaScript("window.appearance.selectPicture('../../private')"),/Invalid imported/);
  const library=await settingsContents.executeJavaScript('window.appearance.pictures()');assert(library.items.some(item=>item.id===folderPicture.id));
  await settingsContents.executeJavaScript('window.appearance.get().then(showSettings)');
  await settingsContents.executeJavaScript("document.querySelector('[data-panel=\"picture-panel\"]').click();document.getElementById('browse-images').click()");
  await until(settingsContents,"document.querySelectorAll('#picture-grid .picture-choice').length===12 && !document.getElementById('choose-folder').disabled");
  assert.equal(await settingsContents.executeJavaScript("document.getElementById('browser-status').textContent"),'background-options · 14 pictures');
  if(process.env.FABLES_TEST_SCREENSHOT){
    website.show();settingsWindow.show();
    const {floatAppearance}=require(path.join(appRoot,'dist/floating-appearance'));
    await floatAppearance(settingsWindow,true);await new Promise(resolve=>setTimeout(resolve,250));
    await writeFile(process.env.FABLES_TEST_SCREENSHOT.replace(/\.png$/,'-gallery.png'),(await settingsContents.capturePage()).toPNG());
    settingsWindow.hide();
  }
  await settingsContents.executeJavaScript("document.querySelector('#picture-grid .picture-choice').click()");
  await until(settingsContents,"!document.getElementById('picture-browser').open");
  assert.equal(await settingsContents.executeJavaScript('selection().backgroundImage'),folderPicture.id);
  // Reset is reversible, including picture and all three context palettes.
  const beforeReset=await save(decorated,settingsWindow);
  const reset=await settingsContents.executeJavaScript(`window.appearance.reset(${JSON.stringify(decorated)})`);
  assert.equal(reset.backgroundImage,null);assert.equal(reset.canUndoReset,true);
  const afterUndo=await settingsContents.executeJavaScript('window.appearance.undoReset()');
  assert.deepEqual({...afterUndo,canUndoReset:beforeReset.canUndoReset},beforeReset);
  assert.equal(afterUndo.canUndoReset,false);
  assert((await settingsContents.executeJavaScript('window.appearance.pictures()')).items.some(item=>item.id===imported.id));
  await save(chatSettings,settingsWindow);
  // SPA route changes must not keep campaign styles on other screens.
  await website.webContents.executeJavaScript("history.pushState({}, '', '/account'); document.body.append(document.createElement('span'))");
  await until(website.webContents, "!document.querySelector('[data-ff-desktop-message]')");
  await website.webContents.executeJavaScript("history.pushState({}, '', '/test/play'); document.body.append(document.createElement('span'))");
  await until(website.webContents, "!!document.querySelector('[data-ff-desktop-chat]')");
  await website.webContents.executeJavaScript(`{
    const card=document.createElement('div'); card.id='event-message-card-3';
    card.__reactFiber$test={memoizedProps:{event:{role:'npc'}}};
    document.getElementById('events-list').append(card);
  }`);
  await until(website.webContents, "document.getElementById('event-message-card-3').dataset.ffDesktopMessage === 'gm'");
  await assert.rejects(save({...chatSettings,backgroundImage:'../../secret.png'},settingsWindow), /imported background/);
  await assert.rejects(save({...chatSettings,messages:{...chatSettings.messages,player:{color:'#fff',opacity:2}}},settingsWindow), /opacity/);
  await assert.rejects(save({...chatSettings,messages:{...chatSettings.messages,player:{color:'#ffffff',opacity:.5,textColor:'white; color:red'}}},settingsWindow), /Text colors/);
  await save({preset:'website',customColor:'#123456'},settingsWindow);
  assert.equal(await website.webContents.executeJavaScript("document.querySelector('[data-ff-desktop-chat]')"), null);
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('.composer')).backgroundColor"), 'rgba(31, 41, 55, 0.8)');
  assert.equal(await website.webContents.executeJavaScript("document.querySelector('[data-ff-desktop-context],[data-ff-desktop-die],[data-ff-desktop-roll-container]')"),null);
  assert.equal(await website.webContents.executeJavaScript("getComputedStyle(document.querySelector('#d20 .cls-4')).fill"),'rgb(32, 61, 166)');

  // Even a window with the same preload cannot use the settings bridge.
  const outsider = new BrowserWindow({ show: false, webPreferences: {
    session: testSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
    preload: path.join(appRoot, 'dist/appearance-preload.js'),
  } });
  manager.attach(outsider.webContents);
  await outsider.loadURL('https://example.invalid/test');
  await assert.rejects(outsider.webContents.executeJavaScript('window.appearance.get()'), /only in the app settings window/);
  for(const method of ['pictures()','folderPictures()','chooseFolder()','undoReset()','importTheme()']){
    await assert.rejects(outsider.webContents.executeJavaScript(`window.appearance.${method}`),/only in the app settings window/);
  }
  await save({ preset: 'amoled', customColor: '#123456' }, settingsWindow);
  assert.equal((await colors(outsider.webContents)).background, original.background);

  // Exercise the renderer controls and real preload, including the reset action.
  await settingsContents.executeJavaScript(`
    document.querySelector('input[value="light"]').click();
    document.querySelector('#appearance-form').requestSubmit();
  `);
  await until(settingsContents, "document.querySelector('#status').textContent.startsWith('Appearance applied')");
  assert.equal((await colors(website.webContents)).background, 'rgb(245, 245, 245)');
  await settingsContents.executeJavaScript("document.querySelector('#reset').click()");
  await until(settingsContents, "!document.querySelector('#apply').disabled");
  assert.deepEqual(await colors(website.webContents), original);
  if (process.env.FABLES_TEST_SCREENSHOT) {
    settingsWindow.show();
    await settingsContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await writeFile(process.env.FABLES_TEST_SCREENSHOT, (await settingsContents.capturePage()).toPNG());
    settingsWindow.hide();
  }

  // Simulate a fresh application manager reading preferences from disk.
  const finalState = await save({ ...newSettings, preset: 'custom', customColor: '#123456' }, settingsWindow);
  if (process.env.FABLES_TEST_SCREENSHOT) {
    await settingsContents.executeJavaScript('window.appearance.get().then(showSettings)');
    settingsWindow.show();
    for (const panel of ['picture', 'messages', 'context', 'events', 'dice', 'sharing', 'app']) {
      await settingsContents.executeJavaScript(`document.querySelector('[data-panel="${panel}-panel"]').click(); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      await new Promise(resolve => setTimeout(resolve, 100));
      await writeFile(process.env.FABLES_TEST_SCREENSHOT.replace(/\.png$/, `-${panel}.png`), (await settingsContents.capturePage()).toPNG());
    }
    settingsWindow.hide();
  }
  // Leave a reset backup on disk to exercise Undo after a fresh manager starts.
  await settingsContents.executeJavaScript(`window.appearance.reset(${JSON.stringify(finalState)})`);
  await save(finalState,settingsWindow);
  const { imagePreview: _preview, platform: _platform, canUndoReset: _undo, ...persisted } = finalState;
  assert.deepEqual(JSON.parse(await readFile(path.join(userData, 'appearance.json'), 'utf8')),
    persisted);
  settingsWindow.destroy();
  for(const method of ['get','save','import-image','pictures','select-picture','folder-pictures','choose-folder','select-folder-picture','reset','undo-reset','export-theme','import-theme'])ipcMain.removeHandler(`appearance:${method}`);
  session.fromPartition('fables-appearance').protocol.unhandle('fables-desktop');
  const restarted = new AppearanceManager();
  await restarted.initialize();
  const reopened = await restarted.open(website);
  reopened.hide();
  assert.deepEqual(await reopened.webContents.executeJavaScript('window.appearance.get()'),
    {...finalState,canUndoReset:true});
  assert.equal((await reopened.webContents.executeJavaScript('window.appearance.folderPictures()')).folderName,'background-options');
  const restoredUndo=await reopened.webContents.executeJavaScript('window.appearance.undoReset()');assert.equal(restoredUndo.canUndoReset,false);assert.equal(restoredUndo.backgroundImage,finalState.backgroundImage);
  const restoredWebsite = new BrowserWindow({ show: false, webPreferences: {
    session: testSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
  } });
  restarted.attach(restoredWebsite.webContents);
  await restoredWebsite.loadURL('https://play.fables.gg/test/play');
  await until(restoredWebsite.webContents, "getComputedStyle(document.body).backgroundColor === 'rgb(18, 52, 86)'");
  await until(restoredWebsite.webContents, "!!document.querySelector('[data-ff-desktop-chat]')");

  if (process.platform === 'linux') {
    const frame = new BrowserWindow({show:false,webPreferences:{partition:'fables-appearance',sandbox:true,
      contextIsolation:true,nodeIntegration:false,preload:path.join(appRoot,'dist/menu-preload.js')}});
    const view = new WebContentsView({webPreferences:{session:testSession,sandbox:true,nodeIntegration:false}});
    frame.contentView.addChildView(view);
    let reloads = 0;
    const menu = Menu.buildFromTemplate([{id:'view',label:'View',submenu:[{id:'reload',label:'Reload',click:()=>reloads++}]}]);
    const bar = new LinuxMenuBar(frame,view,menu);
    bar.setBlack(true);
    await frame.loadURL(MENU_URL);
    assert.equal(await frame.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor'), 'rgb(0, 0, 0)');
    assert.equal(view.getBounds().y,32);
    view.webContents.emit('before-input-event',{preventDefault(){}},{type:'keyDown',code:'KeyR',control:true,shift:false});
    assert.equal(reloads,1);
    bar.setBlack(false);
    assert.equal(view.getBounds().y,0);
    view.webContents.close();
    frame.destroy();
  }

  // Dispatch Electron input objects directly so the test needs no OS key injection.
  website.webContents.setZoomLevel(0);
  for (const input of [
    { code: 'Equal', key: '=', shift: false, expected: 0.5 },
    { code: 'Equal', key: '+', shift: true, expected: 1 },
    { code: 'NumpadAdd', key: '+', shift: false, expected: 1.5 },
    { code: 'Minus', key: '-', shift: false, expected: 1 },
    { code: 'Digit0', key: '0', shift: false, expected: 0 },
  ]) {
    let prevented = false;
    website.webContents.emit('before-input-event', { preventDefault() { prevented = true; } },
      { type: 'keyDown', control: true, meta: false, alt: false, isComposing: false, ...input });
    assert(prevented);
    assert.equal(website.webContents.getZoomLevel(), input.expected);
  }
  console.log('PASS: themes, image effects, persistent folder and picture library, theme sharing, reset undo across restarts, three context palettes, decorative borders and dice menus, picker performance, SVG dice paint, text and inputs, navigation, IPC restrictions, Linux menu, and zoom.');
})().then(async () => {
  clearTimeout(timeout);
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  await rm(userData, { recursive: true, force: true });
  app.exit(0);
}).catch(async (error) => {
  console.error(error);
  clearTimeout(timeout);
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  if (userData) await rm(userData, { recursive: true, force: true });
  app.exit(1);
});
