const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
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
const timeout = setTimeout(() => { console.error('Appearance smoke test timed out.'); app.exit(1); }, 30000);

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
    </div><input type="text" value="Русский текст and English"><textarea>Input text</textarea>
      <div class="grid relative" id="fixture-composer"><div id="working-context-bar-spacer"></div>
        <div class="absolute bottom-full left-0 right-0"><div class="bg-gray-800" id="context-bar">
          <span class="text-gray-400">9 Active / 0 Idle</span><button aria-label="Expand working context"><svg></svg></button>
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
  for (const value of [expanded.icons,expanded.buttonText,expanded.contextText,expanded.editor,expanded.placeholder]) assert.equal(value, 'rgb(170, 187, 204)');
  assert.equal(expanded.context, chat.player);
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

  // Even a window with the same preload cannot use the settings bridge.
  const outsider = new BrowserWindow({ show: false, webPreferences: {
    session: testSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
    preload: path.join(appRoot, 'dist/appearance-preload.js'),
  } });
  manager.attach(outsider.webContents);
  await outsider.loadURL('https://example.invalid/test');
  await assert.rejects(outsider.webContents.executeJavaScript('window.appearance.get()'), /only in the app settings window/);
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
  const finalState = await save({ ...explicitText, preset: 'custom', customColor: '#123456' }, settingsWindow);
  if (process.env.FABLES_TEST_SCREENSHOT) {
    await settingsContents.executeJavaScript('window.appearance.get().then(showSettings)');
    settingsWindow.show();
    for (const panel of ['picture', 'messages', 'app']) {
      await settingsContents.executeJavaScript(`document.querySelector('[data-panel="${panel}-panel"]').click(); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      await writeFile(process.env.FABLES_TEST_SCREENSHOT.replace(/\.png$/, `-${panel}.png`), (await settingsContents.capturePage()).toPNG());
    }
    settingsWindow.hide();
  }
  const { imagePreview: _preview, platform: _platform, ...persisted } = finalState;
  assert.deepEqual(JSON.parse(await readFile(path.join(userData, 'appearance.json'), 'utf8')),
    persisted);
  settingsWindow.destroy();
  ipcMain.removeHandler('appearance:get');
  ipcMain.removeHandler('appearance:save');
  ipcMain.removeHandler('appearance:import-image');
  session.fromPartition('fables-appearance').protocol.unhandle('fables-desktop');
  const restarted = new AppearanceManager();
  await restarted.initialize();
  const reopened = await restarted.open(website);
  reopened.hide();
  assert.deepEqual(await reopened.webContents.executeJavaScript('window.appearance.get()'),
    finalState);
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
  console.log('PASS: themes, image import and background toggle, player/GM/input/button/context/battle styling, text and icons, character fields, opacity, new messages, reset, saved preferences, IPC restrictions, Linux menu bar, and zoom.');
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
