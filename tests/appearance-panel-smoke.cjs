const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu, session, WebContentsView } = require('electron');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..');
const { AppearanceManager, registerAppearanceScheme } = require(path.join(appRoot, 'dist/appearance'));
const { TranslationManager } = require(path.join(appRoot, 'dist/translation'));
const { floatSettingsWindow } = require(path.join(appRoot, 'dist/floating-appearance'));
const { LinuxMenuBar, MENU_URL } = require(path.join(appRoot, 'dist/linux-menu'));
registerAppearanceScheme(); app.on('window-all-closed', () => {});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async check => { for (let i = 0; i < 150; i++) { if (await check()) return; await sleep(25); } throw Error('Condition timed out.'); };
let profile, translation;
const timer = setTimeout(() => { console.error('Appearance panel test timed out.'); app.exit(1); }, 40000);

(async () => {
  profile = process.env.FABLES_TEST_PROFILE_DIR || await mkdtemp(path.join(os.tmpdir(), 'fables-panel-test-')); app.setPath('userData', profile); await app.whenReady();
  const manager = new AppearanceManager(); await manager.initialize();
  translation = new TranslationManager(); await translation.initialize();
  translation.onChange = settings => manager.setLocale(settings.enabled && !settings.showOriginal ? 'ru' : 'en');
  const host = new BrowserWindow({ show: false, type: process.platform==='linux'?'dialog':undefined, width: 1100, height: 820, webPreferences: {
    partition: 'fables-appearance', preload: path.join(appRoot, 'dist/menu-preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false,
  } });
  const websiteSession = session.fromPartition('panel-test');
  websiteSession.protocol.handle('https', () => new Response('<!doctype html><html><meta charset="utf-8"><style>body{background:hsl(var(--background,195 86% 3%));color:hsl(var(--foreground,0 0% 100%))}</style><body><h1>Sample game</h1><input value="My draft stays unchanged."></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  const website = new WebContentsView({ webPreferences: { session: websiteSession, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  host.contentView.addChildView(website); manager.attach(website.webContents);
  const dock = manager.attachMain(host, website);
  const menu = Menu.buildFromTemplate(['file','edit','appearance','translation','view','window'].map(id => ({ id, label: id, submenu: [{ label: 'One option', click() {} }] })));
  const bar = new LinuxMenuBar(host, website, menu, inset => dock.setInset(inset)); bar.setBlack(true);
  await host.loadURL(MENU_URL); await website.webContents.loadURL('https://play.fables.gg/');
  const separate = await manager.open(host); separate.hide();
  await until(() => separate.webContents.executeJavaScript('!document.getElementById("apply").disabled'));
  assert.equal(await separate.webContents.executeJavaScript('document.documentElement.lang'), 'en');
  // Pin through the actual editor: apply moves settings into the main window.
  await separate.webContents.executeJavaScript("document.getElementById('pin-appearance').checked=true;document.getElementById('appearance-form').requestSubmit()");
  await until(() => separate.isDestroyed() && dock.isOpen());
  assert.equal(BrowserWindow.getAllWindows().length, 1, 'Pinned Appearance must not require a second window.');
  const panel = dock.panel, contents = panel.webContents;
  await until(() => contents.executeJavaScript('!document.getElementById("apply").disabled'));
  assert.equal(await contents.executeJavaScript("document.body.classList.contains('docked')"), true);
  assert.equal(panel.getBounds().x, 0); assert.equal(panel.getBounds().y, 32);
  assert.equal(website.getBounds().x, panel.getBounds().width);
  assert.equal(await website.webContents.executeJavaScript('typeof window.appearance'), 'undefined');
  assert.equal(await website.webContents.executeJavaScript('typeof window.appearanceButton'), 'undefined');
  assert.equal(await website.webContents.executeJavaScript('typeof window.require'), 'undefined');
  await assert.rejects(contents.executeJavaScript('window.appearance.resizePanel("wide",true)'), /Invalid panel resize/);
  assert.equal(await contents.executeJavaScript('window.appearance.resizePanel(560,true)'), 560);
  assert.equal(panel.getBounds().width, 560); assert.equal(website.getBounds().x, 560);
  assert.equal(JSON.parse(await readFile(path.join(profile, 'appearance.json'), 'utf8')).appearancePanelWidth, 560);
  host.setTitle('Fables Appearance Panel Test');host.show();host.focus();
  await floatSettingsWindow(host,'Fables Appearance Panel Test',true);
  await sleep(150);
  await until(() => contents.executeJavaScript('innerWidth === 560'));
  await contents.executeJavaScript("document.getElementById('panel-resizer').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))");
  await until(() => panel.getBounds().width === 540);
  // A small viewport clamps the panel while remembering the requested width.
  host.setContentSize(820, 680); await until(() => host.getContentSize()[0] === 820);
  assert.equal(panel.getBounds().width, 460); assert.equal(website.getBounds().width, 360);
  host.setContentSize(1100, 820); await until(() => host.getContentSize()[0] === 1100); assert.equal(panel.getBounds().width, 540);
  // The shared layout also works without the Linux app bar (Windows/fullscreen).
  dock.setInset(0); assert.equal(panel.getBounds().y, 0); assert.equal(website.getBounds().y, 0);
  dock.setInset(32);
  host.show(); host.focus(); host.setFullScreen(true); await until(() => host.isFullScreen()); await sleep(150);
  assert.equal(panel.getBounds().height, host.getContentSize()[1] - 32);
  assert.equal(website.getBounds().width + panel.getBounds().width, host.getContentSize()[0]);
  // Actual pointer events exercise the resize handle and persist the result.
  const startWidth = panel.getBounds().width;
  await until(() => contents.executeJavaScript(`innerWidth === ${startWidth}`));
  contents.focus();
  const point=host.getContentBounds(),inset=panel.getBounds().y;
  const screenX=point.x+startWidth-4,screenY=point.y+inset+100;
  contents.sendInputEvent({type:'mouseMove',globalX:screenX,globalY:screenY,x:startWidth-4,y:100});
  await sleep(50);
  contents.sendInputEvent({type:'mouseDown',globalX:screenX,globalY:screenY,x:startWidth-4,y:100,button:'left',clickCount:1});
  await sleep(50);
  // Drag inward so injected pointer motion stays inside this native view.
  contents.sendInputEvent({type:'mouseMove',globalX:screenX-40,globalY:screenY,modifiers:['leftButtonDown'],x:startWidth-44,y:100,movementX:-40,movementY:0});
  await until(() => panel.getBounds().width < startWidth);
  contents.sendInputEvent({type:'mouseUp',globalX:screenX-40,globalY:screenY,x:panel.getBounds().width-4,y:100,button:'left',clickCount:1});
  await until(() => manager.getSettings().appearancePanelWidth < startWidth);
  // Built-in labels change without a model and preserve unsaved color values.
  await contents.executeJavaScript("document.getElementById('custom-hex').value='#abcdef'");
  await translation.save({ ...translation.getSettings(), enabled: true, translateDescriptions: false });
  await until(() => contents.executeJavaScript('document.documentElement.lang === "ru"'));
  assert.equal(await contents.executeJavaScript("document.querySelector('h1').textContent"), 'Настройте под себя.');
  assert.equal(await contents.executeJavaScript("document.getElementById('close-panel').textContent"), 'Закрыть панель');
  assert.equal(await contents.executeJavaScript("document.getElementById('custom-hex').value"), '#abcdef');
  assert.equal(await contents.executeJavaScript("document.getElementById('player-gradient-second-opacity').closest('fieldset').querySelector('[data-label=gradient-second-opacity]').firstChild.textContent.trim()"), 'Непрозрачность второго цвета');
  await until(() => dock.launcher.webContents.executeJavaScript('document.getElementById("appearance-button").textContent === "Оформление"'));
  assert.equal(await contents.executeJavaScript("document.getElementById('panel-resizer').getAttribute('aria-label')"), 'Изменить ширину панели оформления');
  await contents.executeJavaScript('window.appearance.resizePanel(320,false)');
  await until(()=>contents.executeJavaScript('innerWidth===320'));
  for(const category of ['theme','picture','messages','context','events','dice','sharing','app']) {
    await contents.executeJavaScript(`document.querySelector('[data-panel=${category}-panel]').click();new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    assert(await contents.executeJavaScript('document.documentElement.scrollWidth <= innerWidth'),`Russian ${category} controls must fit the narrow panel.`);
  }
  await contents.executeJavaScript(`window.appearance.resizePanel(${startWidth+40},false)`);
  await translation.save({ ...translation.getSettings(), showOriginal: true });
  await until(() => contents.executeJavaScript('document.documentElement.lang === "en"'));
  assert.equal(await contents.executeJavaScript("document.querySelector('h1').textContent"), 'Make it yours.');
  // Light and custom presets update the entire editor as well as the game.
  await contents.executeJavaScript("document.querySelector('[name=preset][value=light]').checked=true;document.getElementById('appearance-form').dispatchEvent(new Event('input',{bubbles:true}))");
  await until(() => contents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor === "rgb(245, 245, 245)"'));
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.documentElement).colorScheme'), 'light');
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.getElementById("apply")).color'),'rgb(255, 255, 255)');
  if(process.env.FABLES_PANEL_SCREENSHOT)await writeFile(process.env.FABLES_PANEL_SCREENSHOT.replace(/\.png$/,'-light.png'),(await contents.capturePage()).toPNG());
  await contents.executeJavaScript("document.getElementById('appearance-form').requestSubmit()");
  await until(() => manager.getSettings().preset === 'light');
  assert.equal(await website.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor'), 'rgb(245, 245, 245)');
  await manager.save({ ...manager.getSettings(), preset: 'custom', customColor: '#234567' });
  await contents.executeJavaScript('window.appearance.get().then(showSettings)');
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'), 'rgb(35, 69, 103)');
  // Closing/reopening preserves the live editor, its active category and drafts.
  await contents.executeJavaScript("document.querySelector('[data-panel=messages-panel]').click();document.getElementById('player-opacity').value=37;document.getElementById('close-panel').click()");
  await until(() => !dock.isOpen()); assert.equal(website.getBounds().x, 0);
  await dock.launcher.webContents.executeJavaScript("document.getElementById('appearance-button').click()"); await until(() => dock.isOpen());
  assert.equal(await contents.executeJavaScript("document.getElementById('player-opacity').value"), '37');
  // A local impostor cannot access either editor IPC or launcher IPC.
  const impostor = new BrowserWindow({ show: false, webPreferences: { partition: 'fables-appearance', preload: path.join(appRoot, 'dist/appearance-preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await impostor.loadURL('fables-desktop://settings/');
  await assert.rejects(impostor.webContents.executeJavaScript('window.appearance.get()'), /only in the app settings window/); impostor.destroy();
  // Menus appear above the dock, without moving the website back over it.
  await host.webContents.executeJavaScript("window.desktopMenu.open('appearance',100)");
  assert.equal(host.contentView.children.at(-1), bar.overlay); assert.equal(website.getBounds().x, panel.getBounds().width);
  await host.webContents.executeJavaScript('window.desktopMenu.close()');
  if (process.env.FABLES_PANEL_SCREENSHOT) {
    await translation.save({ ...translation.getSettings(), showOriginal: false });
    await contents.executeJavaScript("document.querySelector('[data-panel=theme-panel]').click()"); await sleep(150);
    await writeFile(process.env.FABLES_PANEL_SCREENSHOT.replace(/\.png$/, '-editor.png'), (await contents.capturePage()).toPNG());
    if (process.platform === 'linux' && process.env.HYPRLAND_INSTANCE_SIGNATURE) {
      const {execFileSync}=require('node:child_process');
      const own=JSON.parse(execFileSync('hyprctl',['clients','-j'],{encoding:'utf8'})).find(client=>client.pid===process.pid && client.title==='Fables Appearance Panel Test');
      assert(own);execFileSync('grim',['-g',`${own.at[0]},${own.at[1]} ${own.size[0]}x${own.size[1]}`,process.env.FABLES_PANEL_SCREENSHOT]);
    }
  }
  host.setFullScreen(false); await until(() => !host.isFullScreen());
  // Disabling the pin restores the standalone editor and full game width.
  await contents.executeJavaScript("document.getElementById('pin-appearance').checked=false;document.getElementById('appearance-form').requestSubmit()");
  await until(() => !manager.getSettings().appearancePinned && BrowserWindow.getAllWindows().length === 2);
  assert.equal(dock.isOpen(), false); assert.equal(website.getBounds().x, 0);
  const reopened = manager.window;
  await until(() => reopened.webContents.executeJavaScript('!document.getElementById("apply").disabled'));
  assert.equal(await reopened.webContents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'), 'rgb(35, 69, 103)');
  const savedWidth = manager.getSettings().appearancePanelWidth;
  assert(savedWidth > startWidth);
  // A fresh theme selected in the standalone editor replaces stale panel state.
  await reopened.webContents.executeJavaScript("document.querySelector('[name=preset][value=black]').checked=true;document.getElementById('pin-appearance').checked=true;document.getElementById('appearance-form').requestSubmit()");
  await until(() => reopened.isDestroyed() && dock.isOpen());
  assert.equal(await contents.executeJavaScript('document.getElementById("pin-appearance").checked'),true);
  assert.equal(await contents.executeJavaScript('document.getElementById("appearance-form").elements.preset.value'),'black');
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'),'rgb(16, 16, 16)');
  const persisted=JSON.parse(await readFile(path.join(profile,'appearance.json'),'utf8'));
  assert.equal(persisted.appearancePinned,true);assert.equal(persisted.appearancePanelWidth,savedWidth);
  await translation.save({...translation.getSettings(),showOriginal:false});
  host.destroy();
  for(const method of ['get','save','import-image','pictures','select-picture','folder-pictures','choose-folder','select-folder-picture','reset','undo-reset','export-theme','import-theme','close-panel','resize-panel'])ipcMain.removeHandler(`appearance:${method}`);
  session.fromPartition('fables-appearance').protocol.unhandle('fables-desktop');
  const restarted=new AppearanceManager();await restarted.initialize();
  restarted.setLocale(translation.getSettings().enabled&&!translation.getSettings().showOriginal?'ru':'en');
  assert.equal(restarted.getSettings().appearancePinned,true);assert.equal(restarted.getSettings().appearancePanelWidth,savedWidth);
  const freshHost=new BrowserWindow({show:false,width:1100,height:820,webPreferences:{partition:'fables-appearance',sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const freshSite=new WebContentsView({webPreferences:{session:websiteSession,sandbox:true,contextIsolation:true,nodeIntegration:false}});freshHost.contentView.addChildView(freshSite);
  const freshDock=restarted.attachMain(freshHost,freshSite);await freshDock.ready;
  assert.equal(freshDock.isOpen(),false);assert.equal(freshSite.getBounds().x,0);
  await freshDock.launcher.webContents.executeJavaScript("document.getElementById('appearance-button').click()");await until(()=>freshDock.isOpen());
  assert.equal(freshDock.panel.getBounds().width,savedWidth);assert.equal(BrowserWindow.getAllWindows().length,1);
  await until(()=>freshDock.panel.webContents.executeJavaScript('document.documentElement.lang==="ru"'));
  console.log('PASS: themed settings, built-in Russian labels, preserved drafts, pin/unpin, button, mouse/keyboard resizing, persisted width, viewport clamping, fullscreen, menu overlay ordering, website isolation, and restricted editor IPC.');
})().then(async () => { clearTimeout(timer); await translation?.shutdown(); for (const window of BrowserWindow.getAllWindows()) window.destroy(); if (profile && !process.env.FABLES_TEST_PROFILE_DIR) await rm(profile, { recursive: true, force: true }); app.exit(0); })
  .catch(async error => { console.error(error); clearTimeout(timer); await translation?.shutdown(); for (const window of BrowserWindow.getAllWindows()) window.destroy(); if (profile && !process.env.FABLES_TEST_PROFILE_DIR) await rm(profile, { recursive: true, force: true }); app.exit(1); });
