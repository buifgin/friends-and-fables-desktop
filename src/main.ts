import { app, BrowserWindow, dialog, Menu, nativeTheme, session, shell, webContents, WebContentsView } from 'electron';
import type { WebContents, MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import { configureZoomShortcuts } from './shell/zoom';
import { configureFullscreenShortcuts } from './shell/window-shortcuts';
import { AppearanceManager, registerAppearanceScheme } from './appearance/appearance';
import { LinuxMenuBar, MENU_URL } from './shell/linux-menu';
import { TranslationManager } from './translation/translation';
import { appText, localizeMenu } from './shell/app-menu-locale';
import { MusicManager } from './music/music';
import { HostInstructionsManager } from './commands/host-instructions';

const APP_NAME = 'Friends & Fables Desktop';
const WEBSITE_URL = 'https://play.fables.gg/';
const SESSION_PARTITION = 'persist:friends-and-fables';

app.setName(APP_NAME);
registerAppearanceScheme();

let mainWindow: BrowserWindow | null = null;
let appearance: AppearanceManager;
let translation: TranslationManager;
let music: MusicManager;
let hostInstructions:HostInstructionsManager;
let websiteContents: WebContents | null = null;
let applicationMenu: Menu;
let linuxMenu: LinuxMenuBar | undefined;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function configureWebsiteContents(contents: WebContents, window: BrowserWindow, presentation?: WebContentsView): void {
  configureZoomShortcuts(contents);
  configureFullscreenShortcuts(contents, window);
  appearance.attach(contents);
  translation.attach(contents,presentation);
  music.attach(contents);
  // Keep HTTPS authentication redirects in the sandboxed browser session.
  // The website has no preload script, Node access, or application IPC bridge.
  contents.on('will-navigate', (event, url) => {
    if (!isHttpsUrl(url)) event.preventDefault();
  });
  contents.on('will-redirect', (event, url) => {
    if (!isHttpsUrl(url)) event.preventDefault();
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (music.handleOpenRequest(contents,window,url)) {
      return { action: 'deny' };
    }
    if(hostInstructions.handleOpenRequest(contents,window,url))return {action:'deny'};
    // Some sign-in flows create a blank popup before navigating it to HTTPS.
    if (url !== 'about:blank' && !isHttpsUrl(url)) return { action: 'deny' };

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: {
          partition: SESSION_PARTITION,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
        },
      },
    };
  });
  contents.on('did-create-window', (childWindow) => {
    configureWebsiteContents(childWindow.webContents, childWindow);
  });
}

async function loadWebsite(window: BrowserWindow, contents: WebContents): Promise<void> {
  try {
    await contents.loadURL(WEBSITE_URL);
  } catch (error) {
    if (window.isDestroyed()) return;
    // A newer navigation can cancel the previous one during authentication.
    if ((error as { code?: string }).code === 'ERR_ABORTED') return;

    console.error('Unable to load Friends & Fables:', error);
    const { response } = await dialog.showMessageBox(window, {
      type: 'error',
      title: APP_NAME,
      message: appText('Friends & Fables could not be opened.', appearance.getLocale()),
      detail: appText('Check your internet connection and try again.', appearance.getLocale()),
      buttons: ['Retry', 'Close'].map(label => appText(label, appearance.getLocale())),
      defaultId: 0,
      cancelId: 1,
    });

    if (window.isDestroyed()) return;
    if (response === 0) void loadWebsite(window, contents);
    else window.close();
  }
}

function createWindow(): void {
  const linux = process.platform === 'linux';
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#000000',
    webPreferences: {
      partition: 'fables-appearance',
      ...(linux ? { preload: path.join(__dirname, 'shell/menu-preload.js') } : {}),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  const view = new WebContentsView({ webPreferences: {
    partition: SESSION_PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true,
  } });
  mainWindow.contentView.addChildView(view);
  websiteContents = view.webContents;
  const dock = appearance.attachMain(mainWindow, view);
  music.attachMain(mainWindow,dock.getLauncherContents(),view.webContents);
  if (linux) {
    linuxMenu = new LinuxMenuBar(mainWindow, view, applicationMenu, inset => { dock.setInset(inset); music.setInset(inset); });
    linuxMenu.setMenu(applicationMenu, appearance.getLocale());
    linuxMenu.setBlack(appearance.getSettings().linuxBlackMenu);
  }
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-redirect', (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  configureFullscreenShortcuts(mainWindow.webContents, mainWindow);
  if (!linux) mainWindow.webContents.on('did-finish-load', () => { void mainWindow?.webContents.insertCSS('html,body{margin:0;background:#000;}'); });
  void mainWindow.loadURL(linux ? MENU_URL : 'about:blank').catch(console.error);
  const contents = websiteContents;
  configureWebsiteContents(contents, mainWindow,view);
  contents.once('did-finish-load', () => contents.focus());
  mainWindow.on('closed', () => {
    mainWindow = null;
    appearance.close();
    translation.closeWindow();
    linuxMenu = undefined;
    if (!contents.isDestroyed()) contents.close();
    websiteContents = null;
  });
  void loadWebsite(mainWindow, contents);
}

function targetContents(): WebContents | undefined {
  const focused = webContents.getFocusedWebContents();
  return focused && focused !== mainWindow?.webContents ? focused : websiteContents ?? undefined;
}

function createMenu(): void {
  const editItems: MenuItemConstructorOptions[] = [
    { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => targetContents()?.undo() },
    { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => targetContents()?.redo() },
    { type: 'separator' },
    { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => targetContents()?.cut() },
    { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => targetContents()?.copy() },
    { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => targetContents()?.paste() },
    { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => targetContents()?.selectAll() },
  ];
  applicationMenu = Menu.buildFromTemplate(localizeMenu([
    {
      id: 'file', label: 'File',
      submenu: [
        {
          label: 'Friends & Fables Home',
          id: 'home',
          accelerator: 'CmdOrCtrl+Home',
          click: () => {
            if (mainWindow && websiteContents) void loadWebsite(mainWindow, websiteContents);
          },
        },
        {
          label: 'Open in Browser',
          click: () => {
            void shell.openExternal(WEBSITE_URL).catch(console.error);
          },
        },
        { type: 'separator' },
        { id: 'close-window', label: 'Close Window', accelerator: 'CmdOrCtrl+W', click: () => BrowserWindow.getFocusedWindow()?.close() },
        { id: 'quit', label: 'Quit', role: 'quit' },
      ],
    },
    { id: 'edit', label: 'Edit', submenu: editItems },
    {
      id: 'appearance', label: 'Appearance',
      submenu: [{
        label: 'Customize Appearance…',
        click: () => {
          if (mainWindow) void appearance.open(mainWindow).catch(console.error);
        },
      },{id:'sp-settings',label:'Saved /sp Instructions…',accelerator:'CmdOrCtrl+Shift+P',click:()=>{if(mainWindow)void hostInstructions.open(mainWindow).catch(console.error);}}],
    },
    {
      id: 'translation', label: 'Translation',
      submenu: [
        { id: 'russian-translation', label: 'Translate into Russian', type: 'checkbox',
          checked: translation.getSettings().enabled,
          click: () => { void translation.save({ ...translation.getSettings(), enabled: !translation.getSettings().enabled, showOriginal: false }).catch(console.error); } },
        { id: 'original-text', label: 'Show original text', type: 'checkbox',
          enabled: translation.getSettings().enabled, checked: translation.getSettings().showOriginal,
          click: () => { void translation.save({ ...translation.getSettings(), showOriginal: !translation.getSettings().showOriginal }).catch(console.error); } },
        { type: 'separator' },
        { label: 'Translation Settings…', click: () => { if (mainWindow) void translation.open(mainWindow).catch(console.error); } },
      ],
    },
    {
      id: 'music', label: 'Music',
      submenu: [{ id: 'music-player', label: 'Music Player…', accelerator: 'CmdOrCtrl+Shift+M',
        click: () => { if (mainWindow) void music.open(mainWindow).catch(console.error); } }],
    },
    {
      id: 'view', label: 'View',
      submenu: [
        { id: 'reload', label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => targetContents()?.reload() },
        { id: 'force-reload', label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => targetContents()?.reloadIgnoringCache() },
        { id: 'devtools', label: 'Developer Tools', accelerator: 'F12', click: () => targetContents()?.toggleDevTools() },
        { type: 'separator' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => targetContents()?.setZoomLevel(0) },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => { const target = targetContents(); if (target) target.setZoomLevel(Math.min(5, target.getZoomLevel() + .5)); } },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => { const target = targetContents(); if (target) target.setZoomLevel(Math.max(-5, target.getZoomLevel() - .5)); } },
        { type: 'separator' },
        { id: 'fullscreen', label: 'Toggle Fullscreen (Alt+Enter)', accelerator: 'F11',
          click: () => { if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen()); } },
      ],
    },
    { id: 'window', label: 'Window', submenu: [{ label: 'Minimize', role: 'minimize' }, { label: 'Close', role: 'close' }] },
  ], appearance.getLocale()));
  Menu.setApplicationMenu(applicationMenu);
  linuxMenu?.setMenu(applicationMenu, appearance.getLocale());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  void app.whenReady().then(async () => {
    appearance = new AppearanceManager();
    await appearance.initialize();
    translation = new TranslationManager();
    await translation.initialize();
    music = new MusicManager();
    await music.initialize();
    hostInstructions=new HostInstructionsManager();await hostInstructions.initialize();
    hostInstructions.onChange=settings=>appearance.setHostInstructions(settings);
    await appearance.setHostInstructions(hostInstructions.getSettings());
    if (process.platform === 'linux') nativeTheme.themeSource = 'dark';
    translation.setAppearance(appearance.getSettings());
    appearance.onChange = (settings) => {
      linuxMenu?.setBlack(settings.linuxBlackMenu);
      translation.setAppearance(settings);
      music.setInterface(settings,appearance.getLocale());
      hostInstructions.setInterface(settings,appearance.getLocale());
    };
    const websiteSession = session.fromPartition(SESSION_PARTITION);
    // Additional site permissions can be introduced when those features are added.
    websiteSession.setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false);
    });
    websiteSession.setPermissionCheckHandler(() => false);

    appearance.setLocale(translation.getSettings().enabled && !translation.getSettings().showOriginal ? 'ru' : 'en');
    music.setInterface(appearance.getSettings(),appearance.getLocale());
    hostInstructions.setInterface(appearance.getSettings(),appearance.getLocale());
    createMenu();
    translation.onChange = settings => {
      appearance.setLocale(settings.enabled && !settings.showOriginal ? 'ru' : 'en');
      music.setInterface(appearance.getSettings(),appearance.getLocale());
      hostInstructions.setInterface(appearance.getSettings(),appearance.getLocale());
      createMenu();
    };
    createWindow();
  }).catch((error) => {
    console.error('Unable to start the application:', error);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.on('window-all-closed', () => {
    app.quit();
  });
  let quitting = false;
  app.on('before-quit', event => {
    if (!translation || quitting) return;
    event.preventDefault(); quitting = true;
    void Promise.allSettled([translation.shutdown(),music?.shutdown(),hostInstructions?.shutdown()]).finally(() => app.quit());
  });
}
