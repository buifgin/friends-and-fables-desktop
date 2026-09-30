import { app, BrowserWindow, dialog, Menu, session, shell } from 'electron';
import { configureZoomShortcuts } from './zoom';
import { AppearanceManager, registerAppearanceScheme } from './appearance';

const APP_NAME = 'Friends & Fables Desktop';
const WEBSITE_URL = 'https://play.fables.gg/';
const SESSION_PARTITION = 'persist:friends-and-fables';

app.setName(APP_NAME);
registerAppearanceScheme();

let mainWindow: BrowserWindow | null = null;
let appearance: AppearanceManager;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function configureWebsiteWindow(window: BrowserWindow): void {
  configureZoomShortcuts(window.webContents);
  appearance.attach(window.webContents);
  // Keep HTTPS authentication redirects in the sandboxed browser session.
  // The website has no preload script, Node access, or application IPC bridge.
  window.webContents.on('will-navigate', (event, url) => {
    if (!isHttpsUrl(url)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event, url) => {
    if (!isHttpsUrl(url)) event.preventDefault();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
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
  window.webContents.on('did-create-window', (childWindow) => {
    configureWebsiteWindow(childWindow);
  });
}

async function loadWebsite(window: BrowserWindow): Promise<void> {
  try {
    await window.loadURL(WEBSITE_URL);
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
    if (response === 0) void loadWebsite(window);
    else window.close();
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      partition: SESSION_PARTITION,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  configureWebsiteWindow(mainWindow);
  mainWindow.on('closed', () => {
    mainWindow = null;
    appearance.close();
  });
  void loadWebsite(mainWindow);
}

function createMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Friends & Fables Home',
          accelerator: 'CmdOrCtrl+Home',
          click: () => {
            if (mainWindow) void loadWebsite(mainWindow);
          },
        },
        {
          label: 'Open in Browser',
          click: () => {
            void shell.openExternal(WEBSITE_URL).catch(console.error);
          },
        },
        { type: 'separator' },
        { role: 'close' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'Appearance',
      submenu: [{
        label: 'Background Theme…',
        click: () => {
          if (mainWindow) void appearance.open(mainWindow).catch(console.error);
        },
      }],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]));
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
