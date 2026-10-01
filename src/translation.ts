import { app, BrowserWindow, ipcMain } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_TRANSLATION, RUSSIAN_DICTIONARY, localTranslation, renderTranslation, translationPlan, validateTranslation, validateTranslationMarkers } from './translation-core';
import type { TranslationSettings } from './translation-core';
import { TranslationCache } from './translation-cache';
import { installTranslationDom } from './translation-dom';
import { LocalTranslator } from './local-translator';
import { BundledTranslator } from './bundled-translator';
import type { TranslatorEndpoint } from './bundled-translator';
import { floatSettingsWindow } from './floating-appearance';
import { DEFAULT_APPEARANCE, themeBackground } from './themes';
import type { AppearanceSettings } from './themes';

export const TRANSLATION_URL = 'fables-desktop://settings/translation.html';
const DOM_KEY = '__friendsFablesDesktopTranslation';
interface Website { contents: WebContents; token: string; pending: Promise<void> }
interface TextRequest { id: number; version: number; text: string }
export interface TranslationState extends TranslationSettings {
  cacheEntries: number;
  theme: Pick<AppearanceSettings, 'preset' | 'customColor'>;
  bundled: boolean;
}
export class TranslationManager {
  private settings = structuredClone(DEFAULT_TRANSLATION);
  private file: string;
  private cache: TranslationCache;
  private engine = new LocalTranslator(DEFAULT_TRANSLATION.port);
  private websites = new Set<Website>();
  private window: BrowserWindow | null = null;
  private writes: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false;
  private retryAfter = 0;
  private stopped = false;
  private bundled: BundledTranslator | undefined;
  private endpoint: TranslatorEndpoint | undefined;
  private theme = { preset: DEFAULT_APPEARANCE.preset, customColor: DEFAULT_APPEARANCE.customColor };
  onChange: ((settings: TranslationSettings) => void) | undefined;
  constructor(folder = app.getPath('userData'), bundledRoot: string | null = process.platform === 'win32'
    ? (app.isPackaged ? path.join(process.resourcesPath, 'translator') : path.join(__dirname, '../build/translator')) : null) {
    this.file = path.join(folder, 'translation.json');
    this.cache = new TranslationCache(path.join(folder, 'translation-cache.json'));
    if (bundledRoot) this.bundled = new BundledTranslator(bundledRoot);
  }
  async initialize(): Promise<void> {
    try { this.settings = validateTranslation(JSON.parse(await readFile(this.file, 'utf8'))); }
    catch { /* Translation starts disabled when settings are absent or invalid. */ }
    this.resetEngine();
    await this.cache.initialize();
    ipcMain.handle('translation:get', event => { this.assertTrusted(event); return this.state(); });
    ipcMain.handle('translation:save', (event, value: unknown) => { this.assertTrusted(event); return this.save(value).then(() => this.state()); });
    ipcMain.handle('translation:check', async event => { this.assertTrusted(event); return this.check(); });
    ipcMain.handle('translation:clear-cache', async event => {
      this.assertTrusted(event); this.resetEngine();
      await this.cache.clear();
      await Promise.all([...this.websites].map(website => this.configure(website)));
      return this.state();
    });
    this.timer = setInterval(() => { void this.pump(); }, 100);
    if (this.settings.enabled && this.settings.translateDescriptions && !this.settings.showOriginal) void this.readyEngine().catch(() => {});
  }
  private resetEngine(): void {
    this.engine.abort(); this.engine = new LocalTranslator(this.endpoint?.port ?? this.settings.port, 30000, this.endpoint?.token);
  }
  private async readyEngine(): Promise<LocalTranslator> {
    if (this.bundled) {
      const endpoint = await this.bundled.start();
      if (this.stopped) throw new Error('Translation canceled.');
      if (this.endpoint !== endpoint) { this.endpoint = endpoint; this.resetEngine(); }
    }
    return this.engine;
  }
  getSettings(): TranslationSettings { return structuredClone(this.settings); }
  private state(): TranslationState { return { ...this.getSettings(), cacheEntries: this.cache.size, theme: { ...this.theme }, bundled: Boolean(this.bundled) }; }
  setAppearance(settings: AppearanceSettings): void {
    this.theme = { preset: settings.preset, customColor: settings.customColor };
    if (this.window && !this.window.isDestroyed()) {
      this.window.setBackgroundColor(themeBackground(this.theme));
      this.window.webContents.send('translation:theme', this.theme);
    }
  }
  async check(): Promise<{ available: boolean; message: string }> {
    try {
      const available = await (await this.readyEngine()).available();
      if (available) {
        this.retryAfter = 0;
        await Promise.all([...this.websites].filter(website => this.allowed(website.contents))
          .map(website => website.contents.executeJavaScript(`window.${DOM_KEY}?.retry()`).catch(() => {})));
      }
      return { available, message: available ? 'English → Russian model is ready.' : 'The local service needs an English → Russian model.' };
    } catch { return { available: false, message: this.bundled ? 'The included translator could not start. The dictionary and cached translations still work.'
      : 'Local service unavailable. The dictionary and cached translations still work.' }; }
  }
  save(value: unknown): Promise<void> {
    const settings = validateTranslation(value);
    this.writes = this.writes.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(this.file + '.tmp', JSON.stringify(settings), { mode: 0o600 });
      await rename(this.file + '.tmp', this.file);
      this.settings = settings; this.resetEngine(); this.retryAfter = 0;
      if (this.bundled && (!settings.enabled || settings.showOriginal || !settings.translateDescriptions)) {
        await this.bundled.stop(); this.endpoint = undefined; this.resetEngine();
      } else if (this.bundled) void this.readyEngine().catch(() => {});
      await Promise.all([...this.websites].map(website => this.configure(website)));
      this.onChange?.(this.getSettings());
      if (this.window && !this.window.isDestroyed()) this.window.webContents.send('translation:changed', this.state());
    });
    return this.writes;
  }
  attach(contents: WebContents): void {
    const website: Website = { contents, token: '', pending: Promise.resolve() };
    this.websites.add(website);
    contents.on('did-finish-load', () => { void this.configure(website); });
    contents.on('destroyed', () => { website.token = ''; this.websites.delete(website); });
  }
  private allowed(contents: WebContents): boolean {
    if (contents.isDestroyed()) return false;
    try { return new URL(contents.getURL()).origin === 'https://play.fables.gg'; } catch { return false; }
  }
  private configure(website: Website): Promise<void> {
    const token = website.token = randomUUID();
    website.pending = website.pending.catch(() => {}).then(async () => {
      if (token !== website.token || !this.allowed(website.contents)) return;
      const settings = this.getSettings();
      await website.contents.executeJavaScript(`window.${DOM_KEY}?.dispose()`);
      if (token !== website.token || !settings.enabled || settings.showOriginal || this.stopped) return;
      await website.contents.executeJavaScript(`(${installTranslationDom.toString()})(${JSON.stringify(token)},${JSON.stringify(RUSSIAN_DICTIONARY)},${settings.translateDescriptions},${JSON.stringify(settings.preservedNames)},(${localTranslation.toString()}))`);
    }).catch(() => { /* Navigation can discard an in-flight renderer call. */ });
    return website.pending;
  }
  private async translateBatch(nodes: TextRequest[]): Promise<(string | null)[]> {
    const plans = nodes.map(node => translationPlan(node.text, this.settings.preservedNames));
    const missing = [...new Set(plans.flat().filter(part => part.translate && this.cache.get(part.request ?? part.text) === undefined).map(part => part.request ?? part.text))];
    const failed = new Set<string>();
    // Cached text and local labels do not wait for model startup.
    const engine = missing.length && this.retryAfter <= Date.now() ? await this.readyEngine() : this.engine;
    while (missing.length && this.retryAfter <= Date.now()) {
      const batch: string[] = []; let length = 0;
      while (missing.length && batch.length < 16 && length + missing[0].length <= 8000) {
        const value = missing.shift()!; batch.push(value); length += value.length;
      }
      if (engine !== this.engine || this.stopped) throw new Error('Translation canceled.');
      try {
        const translated = await engine.translate(batch);
        if (engine !== this.engine || this.stopped) throw new Error('Translation canceled.');
        batch.forEach((value, index) => {
          try { validateTranslationMarkers(value, translated[index]); this.cache.set(value, translated[index]); }
          catch { failed.add(value); }
        });
      } catch { this.retryAfter = Date.now() + 15000; }
    }
    return plans.map(parts => {
      if (parts.some(part => part.translate && (failed.has(part.request ?? part.text) || this.cache.get(part.request ?? part.text) === undefined))) return null;
      return parts.map(part => renderTranslation(part, part.translate ? this.cache.get(part.request ?? part.text) : undefined)).join('');
    });
  }
  private async pump(): Promise<void> {
    if (this.busy || this.stopped || !this.settings.enabled || this.settings.showOriginal || !this.settings.translateDescriptions) return;
    this.busy = true;
    try {
      for (const website of this.websites) {
        await website.pending;
        if (!this.allowed(website.contents)) continue;
        const token = website.token;
        const collected = await website.contents.executeJavaScript(`window.${DOM_KEY}?.collect()`) as { token?: unknown; nodes?: unknown } | undefined;
        if (token !== website.token || collected?.token !== token || !Array.isArray(collected.nodes)) continue;
        const nodes = collected.nodes as TextRequest[];
        if (nodes.length > 32 || nodes.some(node => !node || !Number.isInteger(node.id) || !Number.isInteger(node.version)
          || typeof node.text !== 'string' || node.text.length > 16000) || nodes.reduce((total, node) => total + node.text.length, 0) > 48000) continue;
        let translated: (string | null)[] = nodes.map(() => null);
        try { translated = await this.translateBatch(nodes); } catch { /* Canceled by a settings change. */ }
        const results = nodes.map((node,index) => ({ id:node.id,version:node.version,text:translated[index] }));
        if (token === website.token && this.allowed(website.contents)) {
          await website.contents.executeJavaScript(`window.${DOM_KEY}?.finish(${JSON.stringify(token)},${JSON.stringify(results)})`);
        }
      }
    } catch { /* A closed or navigating page cannot block the next poll. */ }
    finally { this.busy = false; }
  }
  private assertTrusted(event: IpcMainInvokeEvent): void {
    if (!this.window || event.sender !== this.window.webContents || event.senderFrame !== event.sender.mainFrame
      || event.senderFrame.origin !== 'fables-desktop://settings' || event.senderFrame.url !== TRANSLATION_URL) throw new Error('Translation preferences are available only in the app translation window.');
  }
  async open(parent: BrowserWindow): Promise<BrowserWindow> {
    if (this.window && !this.window.isDestroyed()) { this.window.show(); this.window.focus(); return this.window; }
    const window = this.window = new BrowserWindow({ parent, title: 'Translation — Friends & Fables Desktop',
      width: 720, height: 750, minWidth: 580, minHeight: 600, backgroundColor: themeBackground(this.theme), autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { type: 'dialog' } : {}),
      webPreferences: { partition: 'fables-appearance', preload: path.join(__dirname, 'translation-preload.js'),
        sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true },
    });
    window.setMenu(null);
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.on('will-redirect', event => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.on('closed', () => { if (this.window === window) this.window = null; });
    await window.loadURL(TRANSLATION_URL);
    await floatSettingsWindow(window, 'Translation — Friends & Fables Desktop', true);
    return window;
  }
  closeWindow(): void { this.window?.close(); }
  async shutdown(): Promise<void> {
    this.stopped = true; this.engine.abort(); if (this.timer) clearInterval(this.timer);
    await this.writes.catch(() => {});
    await this.bundled?.stop();
    await Promise.all([...this.websites].map(website => this.configure(website)));
    await this.cache.flush().catch(() => {});
    for (const method of ['get', 'save', 'check', 'clear-cache']) ipcMain.removeHandler(`translation:${method}`);
  }
}
