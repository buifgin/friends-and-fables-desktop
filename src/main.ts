import { app, BrowserWindow, dialog, Menu, nativeTheme, session, shell, webContents, WebContentsView } from 'electron';
import type { WebContents, MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import { configureZoomShortcuts } from './zoom';
import { AppearanceManager, registerAppearanceScheme } from './appearance';
import { LinuxMenuBar, MENU_URL } from './linux-menu';

const APP_NAME = 'Friends & Fables Desktop';
const WEBSITE_URL = 'https://play.fables.gg/';
const SESSION_PARTITION = 'persist:friends-and-fables';

app.setName(APP_NAME);
registerAppearanceScheme();

let mainWindow: BrowserWindow | null = null;
let appearance: AppearanceManager;
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

function configureWebsiteContents(contents: WebContents): void {
  configureZoomShortcuts(contents);
  appearance.attach(contents);
  // Keep HTTPS authentication redirects in the sandboxed browser session.
  // The website has no preload script, Node access, or application IPC bridge.
  contents.on('will-navigate', (event, url) => {
    if (!isHttpsUrl(url)) event.preventDefault();
  });
  contents.on('will-redirect', (event, url) => {
    if (!isHttpsUrl(url)) event.preventDefault();
  });

  contents.setWindowOpenHandler(({ url }) => {
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
    configureWebsiteContents(childWindow.webContents);
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
      message: 'Friends & Fables could not be opened.',
      detail: 'Check your internet connection and try again.',
      buttons: ['Retry', 'Close'],
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
      partition: linux ? 'fables-appearance' : SESSION_PARTITION,
      ...(linux ? { preload: path.join(__dirname, 'menu-preload.js') } : {}),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  if (linux) {
    const view = new WebContentsView({ webPreferences: {
      partition: SESSION_PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true,
    } });
    mainWindow.contentView.addChildView(view);
    websiteContents = view.webContents;
    linuxMenu = new LinuxMenuBar(mainWindow, view, applicationMenu);
    linuxMenu.setBlack(appearance.getSettings().linuxBlackMenu);
    mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
    mainWindow.webContents.on('will-redirect', (event) => event.preventDefault());
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    void mainWindow.loadURL(MENU_URL).catch(console.error);
  } else websiteContents = mainWindow.webContents;
  const contents = websiteContents;
  configureWebsiteContents(contents);
  contents.once('did-finish-load', () => contents.focus());
  mainWindow.on('closed', () => {
    mainWindow = null;
    appearance.close();
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
  applicationMenu = Menu.buildFromTemplate([
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
        { id: 'quit', role: 'quit' },
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
      }],
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
        { id: 'fullscreen', role: 'togglefullscreen' },
      ],
    },
    { id: 'window', label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
  ]);
  Menu.setApplicationMenu(applicationMenu);
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
    if (process.platform === 'linux') nativeTheme.themeSource = 'dark';
    appearance.onChange = (settings) => linuxMenu?.setBlack(settings.linuxBlackMenu);
    const websiteSession = session.fromPartition(SESSION_PARTITION);
    // Additional site permissions can be introduced when those features are added.
    websiteSession.setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false);
    });
    websiteSession.setPermissionCheckHandler(() => false);

    createMenu();
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
}
