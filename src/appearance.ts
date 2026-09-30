import { app, BrowserWindow, dialog, ipcMain, protocol, session } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_APPEARANCE, themeCss, validateAppearance } from './themes';
import type { AppearanceSettings, AppearanceState } from './themes';
import { backgroundPreview, importBackground } from './backgrounds';
import { chatCss, configureChatAppearance } from './chat-appearance';

const SCHEME = 'fables-desktop';
const SETTINGS_ORIGIN = `${SCHEME}://settings`;
const SETTINGS_URL = `${SETTINGS_ORIGIN}/`;
const WEBSITE_ORIGIN = 'https://play.fables.gg';

export function registerAppearanceScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true } },
  ]);
}

interface WebsiteTheme {
  contents: WebContents;
  cssKey?: string;
  ready: boolean;
  document: number;
  pending: Promise<void>;
}

export class AppearanceManager {
  private settings: AppearanceSettings = { ...DEFAULT_APPEARANCE };
  private window: BrowserWindow | null = null;
  private websites = new Set<WebsiteTheme>();
  private saves: Promise<unknown> = Promise.resolve();
  private file = path.join(app.getPath('userData'), 'appearance.json');
  private images = path.join(app.getPath('userData'), 'backgrounds');
  onChange: ((settings: AppearanceSettings) => void) | undefined;

  async initialize(): Promise<void> {
    try {
      this.settings = validateAppearance(JSON.parse(await readFile(this.file, 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Unable to read appearance preferences; using the website theme:', error);
      }
    }
    try {
      await backgroundPreview(this.images, this.settings.backgroundImage);
    } catch (error) {
      console.warn('Saved background is unavailable; using the campaign background:', error);
      this.settings = { ...this.settings, backgroundImage: null, backgroundName: '' };
    }

    const settingsSession = session.fromPartition('fables-appearance');
    settingsSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    settingsSession.setPermissionCheckHandler(() => false);
    const assets: Record<string, [string, string]> = {
      '/': ['appearance.html', 'text/html; charset=utf-8'],
      '/appearance.css': ['appearance.css', 'text/css; charset=utf-8'],
      '/appearance.js': ['appearance.js', 'text/javascript; charset=utf-8'],
      '/menu.html': ['menu.html', 'text/html; charset=utf-8'],
      '/menu.css': ['menu.css', 'text/css; charset=utf-8'],
      '/menu.js': ['menu.js', 'text/javascript; charset=utf-8'],
    };
    settingsSession.protocol.handle(SCHEME, async (request) => {
      const url = new URL(request.url);
      const asset = url.host === 'settings' ? assets[url.pathname] : undefined;
      if (request.method !== 'GET' || !asset) return new Response('Not found', { status: 404 });
      return new Response(await readFile(path.join(__dirname, '../assets', asset[0]), 'utf8'), {
        headers: { 'Content-Type': asset[1], 'X-Content-Type-Options': 'nosniff' },
      });
    });

    ipcMain.handle('appearance:get', (event) => {
      this.assertTrusted(event);
      return this.state();
    });
    ipcMain.handle('appearance:save', (event, value: unknown) => {
      this.assertTrusted(event);
      return this.save(value);
    });
    ipcMain.handle('appearance:import-image', async (event) => {
      this.assertTrusted(event);
      const result = await dialog.showOpenDialog(this.window!, {
        title: 'Choose a campaign chat background', properties: ['openFile'],
        filters: [{ name: 'Pictures', extensions: ['png', 'jpg', 'jpeg'] }],
      });
      if (result.canceled || !result.filePaths[0]) return null;
      return importBackground(result.filePaths[0], this.images);
    });
  }

  getSettings(): AppearanceSettings { return this.settings; }

  private async state(): Promise<AppearanceState> {
    return { ...this.settings, imagePreview: await backgroundPreview(this.images, this.settings.backgroundImage), platform: process.platform };
  }

  private assertTrusted(event: IpcMainInvokeEvent): void {
    if (!this.window || event.sender !== this.window.webContents
      || event.senderFrame !== event.sender.mainFrame
      || event.senderFrame.origin !== SETTINGS_ORIGIN
      || event.senderFrame.url !== SETTINGS_URL) {
      throw new Error('Appearance preferences are available only in the app settings window.');
    }
  }

  async open(parent: BrowserWindow): Promise<BrowserWindow> {
    if (this.window) {
      this.window.show();
      this.window.focus();
      return this.window;
    }
    const window = new BrowserWindow({
      title: 'Appearance — Friends & Fables Desktop',
      parent,
      width: 740,
      height: 900,
      minWidth: 520,
      minHeight: 600,
      backgroundColor: '#111318',
      autoHideMenuBar: true,
      webPreferences: {
        partition: 'fables-appearance',
        preload: path.join(__dirname, 'appearance-preload.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });
    this.window = window;
    window.setMenu(null);
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.on('will-redirect', (event) => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.on('closed', () => { this.window = null; });
    await window.loadURL(SETTINGS_URL);
    return window;
  }

  close(): void {
    this.window?.close();
  }

  save(value: unknown): Promise<AppearanceState> {
    const next = validateAppearance(value);
    const save = this.saves.catch(() => undefined).then(async () => {
      // Verify an imported ID exists before saving it; renderers cannot supply paths.
      await backgroundPreview(this.images, next.backgroundImage);
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(`${this.file}.tmp`, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      await rename(`${this.file}.tmp`, this.file);
      this.settings = next;
      this.onChange?.(next);
      await Promise.all(Array.from(this.websites, (website) => this.apply(website)));
      return this.state();
    });
    this.saves = save;
    return save;
  }

  attach(contents: WebContents): void {
    const website: WebsiteTheme = { contents, ready: false, document: 0, pending: Promise.resolve() };
    this.websites.add(website);
    contents.on('did-start-navigation', (details) => {
      if (!details.isMainFrame || details.isSameDocument) return;
      website.document++;
      website.ready = false;
      // Clear the old theme before the next document, including authentication.
      website.pending = website.pending.catch(() => undefined).then(async () => {
        const key = website.cssKey;
        website.cssKey = undefined;
        if (key && !contents.isDestroyed()) await contents.removeInsertedCSS(key);
      });
    });
    contents.on('did-finish-load', () => {
      website.ready = true;
      void this.apply(website).catch(console.error);
    });
    contents.on('destroyed', () => { this.websites.delete(website); });
  }

  private apply(website: WebsiteTheme): Promise<void> {
    const apply = website.pending.catch(() => undefined).then(async () => {
      const { contents } = website;
      if (!website.ready || contents.isDestroyed()) return;
      if (new URL(contents.getURL()).origin !== WEBSITE_ORIGIN) return;
      const document = website.document;
      const settings = this.settings;
      const previous = website.cssKey;
      const image = await backgroundPreview(this.images, settings.backgroundImage);
      if (contents.isDestroyed() || document !== website.document) return;
      const css = themeCss(settings) + chatCss(settings, image);
      // Author styles can be removed reliably by this Electron version. User
      // styles remained active after removeInsertedCSS in the runtime check.
      const key = css ? await contents.insertCSS(css, { cssOrigin: 'author' }) : undefined;
      if (contents.isDestroyed()) return;
      if (document !== website.document) {
        if (key) await contents.removeInsertedCSS(key);
        return;
      }
      website.cssKey = key;
      if (previous) await contents.removeInsertedCSS(previous);
      if (contents.isDestroyed() || document !== website.document) return;
      // No IPC bridge or Node access is added to the remote website.
      await contents.executeJavaScript(`(${configureChatAppearance.toString()})(${JSON.stringify(settings)})`);
    });
    website.pending = apply;
    return apply;
  }
}
