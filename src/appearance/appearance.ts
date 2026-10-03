import { appPath } from '../shared/app-paths';
import { app, BrowserWindow, dialog, ipcMain, protocol, session, WebContentsView } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_APPEARANCE, themeBackground, themeCss, validateAppearance } from './themes';
import type { AppearanceSettings, AppearanceState } from './themes';
import { backgroundLibrary, backgroundPreview, importBackground, selectBackground } from './backgrounds';
import { chatCss, configureChatAppearance } from './chat-appearance';
import { exportTheme, importTheme } from './theme-files';
import { BUILT_IN_THEMES, applyLibraryTheme, makeSavedTheme, themeSummary, validateThemeLibrary } from './theme-library';
import type { SavedTheme } from './theme-library';
import { APPEARANCE_TITLE, floatAppearance } from '../shell/floating-appearance';
import { ImageFolder } from './image-folder';
import { AppearanceDock } from '../shell/appearance-dock';
import { configureFullscreenShortcuts } from '../shell/window-shortcuts';
import { configureCampaignMap } from '../map/campaign-map';
import { configureMessageCommands, formatMessageCommand } from '../commands/message-commands';
import { DEFAULT_HOST_INSTRUCTIONS, instructionDocument } from '../commands/host-instructions-core';
import type { HostInstructions } from '../commands/host-instructions-core';
import { configureInstructionHiding } from '../commands/host-instructions-dom';

const SCHEME = 'fables-desktop';
const SETTINGS_ORIGIN = `${SCHEME}://settings`;
const SETTINGS_URL = `${SETTINGS_ORIGIN}/`;
const WEBSITE_ORIGIN = 'https://play.fables.gg';

export function registerAppearanceScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, stream: true } },
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
  private instructions:HostInstructions=structuredClone(DEFAULT_HOST_INSTRUCTIONS);
  private window: BrowserWindow | null = null;
  private panel: WebContentsView | null = null;
  private panelParent: BrowserWindow | null = null;
  private dock: AppearanceDock | null = null;
  private locale: 'en' | 'ru' = 'en';
  private settingsRevision = 0;
  private localeRevision = 0;
  private websites = new Set<WebsiteTheme>();
  private saves: Promise<unknown> = Promise.resolve();
  private file = path.join(app.getPath('userData'), 'appearance.json');
  private cachedBackground: { id: string | null; preview: string | null } | undefined;
  private images = path.join(app.getPath('userData'), 'backgrounds');
  private backupFile = path.join(app.getPath('userData'), 'appearance-before-reset.json');
  private themesFile = path.join(app.getPath('userData'), 'themes.json');
  private savedThemes: SavedTheme[] = [];
  private themeSaves: Promise<unknown> = Promise.resolve();
  private resetBackup: AppearanceSettings | null = null;
  private folder = new ImageFolder(path.join(app.getPath('userData'), 'background-folder.json'));
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
      this.resetBackup = validateAppearance(JSON.parse(await readFile(this.backupFile, 'utf8')));
      await backgroundPreview(this.images, this.resetBackup.backgroundImage);
    } catch { this.resetBackup = null; }
    try { this.savedThemes = validateThemeLibrary(JSON.parse(await readFile(this.themesFile, 'utf8'))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Unable to read saved themes:', error); }
    await this.folder.initialize();
    try {
      await this.picture(this.settings);
    } catch (error) {
      console.warn('Saved background is unavailable; using the campaign background:', error);
      this.settings = { ...this.settings, backgroundImage: null, backgroundName: '' };
    }

    const settingsSession = session.fromPartition('fables-appearance');
    settingsSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    settingsSession.setPermissionCheckHandler(() => false);
    const assets: Record<string, [string, string]> = {
      '/': ['appearance/appearance.html', 'text/html; charset=utf-8'],
      '/appearance.css': ['appearance/appearance.css', 'text/css; charset=utf-8'],
      '/appearance.js': ['appearance/appearance.js', 'text/javascript; charset=utf-8'],
      '/settings-theme.js': ['shared/settings-theme.js', 'text/javascript; charset=utf-8'],
      '/settings-locale.js': ['shared/settings-locale.js', 'text/javascript; charset=utf-8'],
      '/appearance-button.html': ['shell/appearance-button.html', 'text/html; charset=utf-8'],
      '/appearance-button.js': ['shell/appearance-button.js', 'text/javascript; charset=utf-8'],
      '/appearance-button.css': ['shell/appearance-button.css', 'text/css; charset=utf-8'],
      '/window-controls.html': ['shell/window-controls.html', 'text/html; charset=utf-8'],
      '/window-controls.js': ['shell/window-controls.js', 'text/javascript; charset=utf-8'],
      '/menu.html': ['shell/menu.html', 'text/html; charset=utf-8'],
      '/menu.css': ['shell/menu.css', 'text/css; charset=utf-8'],
      '/menu.js': ['shell/menu.js', 'text/javascript; charset=utf-8'],
      '/translation.html': ['translation/translation.html', 'text/html; charset=utf-8'],
      '/translation.css': ['translation/translation.css', 'text/css; charset=utf-8'],
      '/translation.js': ['translation/translation.js', 'text/javascript; charset=utf-8'],
      '/host-instructions.html':['commands/host-instructions.html','text/html; charset=utf-8'],
      '/host-instructions.css':['commands/host-instructions.css','text/css; charset=utf-8'],
      '/host-instructions.js':['commands/host-instructions.js','text/javascript; charset=utf-8'],
    };
    settingsSession.protocol.handle(SCHEME, async (request) => {
      const url = new URL(request.url);
      const asset = url.host === 'settings' ? assets[url.pathname] : undefined;
      if (request.method !== 'GET' || !asset) return new Response('Not found', { status: 404 });
      return new Response(await readFile(appPath('assets', asset[0]), 'utf8'), {
        headers: { 'Content-Type': asset[1], 'X-Content-Type-Options': 'nosniff' },
      });
    });

    ipcMain.handle('appearance:get', (event) => {
      this.assertTrusted(event);
      return this.state(event.sender);
    });
    ipcMain.handle('appearance:save', async (event, value: unknown) => {
      this.assertTrusted(event);
      await this.save(value);
      const result = await this.state(event.sender);
      if (this.settings.appearancePinned && this.dock && event.sender === this.window?.webContents) {
        await this.dock.open(true);
        const oldWindow = this.window;
        // Let the invoke response reach the old editor before closing it.
        setTimeout(() => { if (oldWindow && !oldWindow.isDestroyed()) oldWindow.close(); }, 150);
      } else if (!this.settings.appearancePinned && event.sender === this.panel?.webContents && this.panelParent) {
        await this.open(this.panelParent);
      }
      return result;
    });
    ipcMain.handle('appearance:save-theme', (event, name: unknown, value: unknown) => {
      this.assertTrusted(event);
      const theme = makeSavedTheme(name, value);
      return this.updateThemes(async () => {
        await backgroundPreview(this.images, theme.appearance.backgroundImage);
        if (this.savedThemes.length >= 50) throw new Error('Save up to 50 themes.');
        this.savedThemes.push(theme);
      });
    });
    ipcMain.handle('appearance:remove-theme', (event, id: unknown) => {
      this.assertTrusted(event);
      if (typeof id !== 'string' || !this.savedThemes.some(theme => theme.id === id)) throw new Error('Choose a saved theme.');
      return this.updateThemes(async () => { this.savedThemes = this.savedThemes.filter(theme => theme.id !== id); });
    });
    ipcMain.handle('appearance:preview-theme', async (event, id: unknown, value: unknown) => {
      this.assertTrusted(event);
      const theme = [...BUILT_IN_THEMES, ...this.savedThemes].find(theme => theme.id === id);
      if (!theme) throw new Error('Choose a theme from the library.');
      const settings = applyLibraryTheme(theme, validateAppearance(value));
      const imagePreview = await this.picture(settings);
      return { ...await this.state(event.sender), ...settings, imagePreview };
    });
    ipcMain.handle('appearance:close-panel', event => { this.assertPanel(event); this.dock?.hide(); });
    ipcMain.handle('appearance:resize-panel', async (event, width: unknown, finish: unknown) => {
      this.assertPanel(event);
      if (typeof width !== 'number' || !Number.isFinite(width) || width < 0 || width > 10000 || typeof finish !== 'boolean') throw new Error('Invalid panel resize.');
      const actual = this.dock!.resize(width);
      if (finish) await this.persist({ ...this.settings, appearancePanelWidth: actual });
      return actual;
    });
    ipcMain.handle('appearance:import-image', async (event) => {
      this.assertTrusted(event);
      const result = await dialog.showOpenDialog(this.dialogParent(event), {
        title: 'Choose a campaign chat background', properties: ['openFile'],
        filters: [{ name: 'Pictures', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (result.canceled || !result.filePaths[0]) return null;
      return importBackground(result.filePaths[0], this.images);
    });
    ipcMain.handle('appearance:pictures', (event, offset: unknown = 0) => { this.assertTrusted(event); return backgroundLibrary(this.images,offset,this.imageNames()); });
    ipcMain.handle('appearance:select-picture', (event, id: unknown) => { this.assertTrusted(event); return selectBackground(this.images,id,this.imageNames()); });
    ipcMain.handle('appearance:folder-pictures', (event, offset: unknown = 0) => { this.assertTrusted(event); return this.folder.page(offset); });
    ipcMain.handle('appearance:choose-folder', async event => {
      this.assertTrusted(event);
      const result=await dialog.showOpenDialog(this.dialogParent(event),{title:'Choose a background image folder',properties:['openDirectory']});
      return result.canceled || !result.filePaths[0] ? null : this.folder.choose(result.filePaths[0]);
    });
    ipcMain.handle('appearance:select-folder-picture', (event, id: unknown) => { this.assertTrusted(event); return this.folder.select(id,this.images); });
    ipcMain.handle('appearance:reset', (event, value: unknown) => { this.assertTrusted(event); return this.reset(value); });
    ipcMain.handle('appearance:undo-reset', event => {
      this.assertTrusted(event);
      if (!this.resetBackup) throw new Error('There is no reset to undo.');
      return this.persist(this.resetBackup,undefined,true);
    });
    ipcMain.handle('appearance:export-theme', async (event, value: unknown, includePicture: unknown) => {
      this.assertTrusted(event);
      const settings=validateAppearance(value);
      if (typeof includePicture !== 'boolean') throw new Error('Invalid picture export option.');
      const result=await dialog.showSaveDialog(this.dialogParent(event),{title:'Export appearance theme',defaultPath:'Friends-and-Fables.fables-theme.json',filters:[{name:'Friends & Fables theme',extensions:['json']}]});
      if (result.canceled || !result.filePath) return false;
      await exportTheme(result.filePath,settings,includePicture,this.images);return true;
    });
    ipcMain.handle('appearance:import-theme', async event => {
      this.assertTrusted(event);
      const result=await dialog.showOpenDialog(this.dialogParent(event),{title:'Import appearance theme',properties:['openFile'],filters:[{name:'Friends & Fables theme',extensions:['json']}]});
      if (result.canceled || !result.filePaths[0]) return null;
      const imported=await importTheme(result.filePaths[0],this.settings,this.images);
      return {...imported,themes:this.themeSummaries(),imagePreview:await backgroundPreview(this.images,imported.backgroundImage),platform:process.platform,canUndoReset:!!this.resetBackup,presentation:event.sender===this.panel?.webContents?'panel':'window',locale:this.locale,localeRevision:this.localeRevision,revision:this.settingsRevision};
    });
  }

  getSettings(): AppearanceSettings { return this.settings; }
  async setHostInstructions(settings:HostInstructions):Promise<void>{
    this.instructions=structuredClone(settings);
    await Promise.all([...this.websites].map(website=>this.apply(website)));
  }

  private async picture(settings: AppearanceSettings): Promise<string | null> {
    if (this.cachedBackground?.id === settings.backgroundImage) return this.cachedBackground.preview;
    const preview = await backgroundPreview(this.images, settings.backgroundImage);
    this.cachedBackground = { id: settings.backgroundImage, preview }; return preview;
  }
  private async state(contents?: WebContents): Promise<AppearanceState> {
    const settings = this.settings, revision = this.settingsRevision;
    const imagePreview = await this.picture(settings);
    return { ...settings, themes: this.themeSummaries(), imagePreview, revision, platform: process.platform, canUndoReset: !!this.resetBackup,
      presentation: (contents ? contents === this.panel?.webContents : this.dock?.isOpen()) ? 'panel' : 'window', locale: this.locale, localeRevision: this.localeRevision };
  }
  private themeSummaries() { return [...BUILT_IN_THEMES.map(theme => themeSummary(theme, false)), ...this.savedThemes.map(theme => themeSummary(theme, true))]; }
  private updateThemes(update: () => Promise<void>): Promise<ReturnType<AppearanceManager['themeSummaries']>> {
    const save = this.themeSaves.catch(() => undefined).then(async () => {
      const before = this.savedThemes.slice();
      try {
        await update(); await mkdir(path.dirname(this.themesFile), { recursive: true });
        await writeFile(`${this.themesFile}.tmp`, `${JSON.stringify(this.savedThemes, null, 2)}\n`, 'utf8');
        await rename(`${this.themesFile}.tmp`, this.themesFile);
      } catch (error) { this.savedThemes = before; throw error; }
      return this.themeSummaries();
    });
    this.themeSaves = save; return save;
  }
  private imageNames(): Record<string,string> {
    return Object.fromEntries([this.settings,this.resetBackup,...this.savedThemes.map(theme => theme.appearance)].filter(s=>s?.backgroundImage).map(s=>[s!.backgroundImage!,s!.backgroundName]));
  }

  private assertTrusted(event: IpcMainInvokeEvent): void {
    if ((event.sender !== this.window?.webContents && event.sender !== this.panel?.webContents)
      || event.senderFrame !== event.sender.mainFrame
      || event.senderFrame.origin !== SETTINGS_ORIGIN
      || event.senderFrame.url !== SETTINGS_URL) {
      throw new Error('Appearance preferences are available only in the app settings window.');
    }
  }

  private assertPanel(event: IpcMainInvokeEvent): void {
    this.assertTrusted(event);
    if (!this.dock || event.sender !== this.panel?.webContents) throw new Error('Panel controls require the embedded Appearance editor.');
  }
  private dialogParent(event: IpcMainInvokeEvent): BrowserWindow {
    return event.sender === this.panel?.webContents ? this.panelParent! : this.window!;
  }
  getLocale(): 'en' | 'ru' { return this.locale; }
  async refreshPanel(): Promise<void> {
    if (this.panel && !this.panel.webContents.isDestroyed()) this.panel.webContents.send('appearance:settings', await this.state(this.panel.webContents));
  }
  setLocale(locale: 'en' | 'ru'): void {
    const changed = this.locale !== locale;
    this.locale = locale;
    if (changed) this.localeRevision++;
    this.sendInterface(); this.dock?.sync();
    if (changed) for (const website of this.websites) void this.apply(website).catch(console.error);
  }
  private sendInterface(): void {
    for (const contents of [this.window?.webContents, this.panel?.webContents]) {
      if (contents && !contents.isDestroyed()) contents.send('appearance:interface', { locale: this.locale, localeRevision: this.localeRevision, width: this.settings.appearancePanelWidth });
    }
  }
  attachMain(window: BrowserWindow, website: WebContentsView): AppearanceDock {
    this.dock = new AppearanceDock(window, website, this);
    window.on('closed', () => { this.dock = null; this.panel = null; this.panelParent = null; });
    return this.dock;
  }
  createPanel(parent: BrowserWindow): WebContentsView {
    const view = new WebContentsView({ webPreferences: {
      partition: 'fables-appearance', preload: path.join(__dirname, 'appearance-preload.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true,
    } });
    this.panel = view; this.panelParent = parent;
    view.setBackgroundColor(themeBackground(this.settings));
    view.webContents.on('will-navigate', event => event.preventDefault());
    view.webContents.on('will-redirect', event => event.preventDefault());
    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    configureFullscreenShortcuts(view.webContents, parent);
    return view;
  }

  async open(parent: BrowserWindow): Promise<BrowserWindow> {
    if (this.settings.appearancePinned && this.dock?.window === parent) { await this.dock.toggle(); return parent; }
    if (this.window) {
      this.window.showInactive();
      if (this.settings.linuxFloatingAppearance) await floatAppearance(this.window,true);
      return this.window;
    }
    const window = new BrowserWindow({
      title: APPEARANCE_TITLE,
      show: false,
      parent,
      type: process.platform === 'linux' && this.settings.linuxFloatingAppearance ? 'dialog' : undefined,
      width: 740,
      height: 900,
      minWidth: 520,
      minHeight: 600,
      backgroundColor: themeBackground(this.settings),
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
    configureFullscreenShortcuts(window.webContents, window);
    window.setMenu(null);
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.on('will-redirect', (event) => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.on('closed', () => { this.window = null; });
    window.on('show', () => { if (this.settings.linuxFloatingAppearance) void floatAppearance(window,true); });
    await window.loadURL(SETTINGS_URL);
    window.showInactive();
    if (this.settings.linuxFloatingAppearance) await floatAppearance(window,true);
    return window;
  }

  close(): void {
    this.window?.close();
    this.dock?.hide();
  }

  save(value: unknown): Promise<AppearanceState> {
    const next = validateAppearance(value);
    return this.persist(next);
  }
  reset(value: unknown): Promise<AppearanceState> {
    const before=validateAppearance(value);
    return this.persist({...before,preset:'website',backgroundImage:null,backgroundName:'',
      input:{...before.input,enabled:false},messages:{...before.messages,enabled:false},context:{...before.context,enabled:false},events:{...before.events,enabled:false},dice:{...before.dice,enabled:false,colorsEnabled:false,
        natural20:{...before.dice.natural20,enabled:false},natural1:{...before.dice.natural1,enabled:false}},resizableMap:false,messageCommands:false},before);
  }
  private persist(next: AppearanceSettings, before?: AppearanceSettings, consumeReset = false): Promise<AppearanceState> {
    const save = this.saves.catch(() => undefined).then(async () => {
      // Verify an imported ID exists before saving it; renderers cannot supply paths.
      await backgroundPreview(this.images, next.backgroundImage);
      if (before) await backgroundPreview(this.images,before.backgroundImage);
      await mkdir(path.dirname(this.file), { recursive: true });
      if (before) {
        await writeFile(`${this.backupFile}.tmp`,`${JSON.stringify(before,null,2)}\n`,'utf8');
        await rename(`${this.backupFile}.tmp`,this.backupFile);
      }
      await writeFile(`${this.file}.tmp`, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      await rename(`${this.file}.tmp`, this.file);
      const floatingChanged=this.settings.linuxFloatingAppearance!==next.linuxFloatingAppearance;
      this.settings = next;
      this.settingsRevision++;
      if (before) this.resetBackup=before;
      if (consumeReset) { await rm(this.backupFile,{force:true});this.resetBackup=null; }
      if (floatingChanged && this.window) await floatAppearance(this.window,next.linuxFloatingAppearance);
      this.window?.setBackgroundColor(themeBackground(next));
      this.panel?.setBackgroundColor(themeBackground(next));
      this.dock?.sync(); this.sendInterface();
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
    contents.on('dom-ready', () => {
      website.ready = true; void this.apply(website).catch(console.error);
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
      const image = await this.picture(settings);
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
      if (contents.isDestroyed() || document !== website.document) return;
      await contents.executeJavaScript(`(${configureCampaignMap.toString()})(${settings.resizableMap},${JSON.stringify(this.locale)})`);
      if (contents.isDestroyed() || document !== website.document) return;
      await contents.executeJavaScript(`(${configureInstructionHiding.toString()})(${this.instructions.hideMarked})`);
      await contents.executeJavaScript(`(${configureMessageCommands.toString()})(${settings.messageCommands},${JSON.stringify(this.locale)},(${formatMessageCommand.toString()}),${JSON.stringify(this.instructions)},(${instructionDocument.toString()}))`);
    });
    website.pending = apply;
    return apply;
  }
}
