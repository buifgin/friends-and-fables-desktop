import { appPath } from '../shared/app-paths';
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
import { floatSettingsWindow } from '../shell/floating-appearance';
import { DEFAULT_APPEARANCE, themeBackground } from '../appearance/themes';
import type { AppearanceSettings } from '../appearance/themes';

export const TRANSLATION_URL = 'fables-desktop://settings/translation.html';
const DOM_KEY = '__friendsFablesDesktopTranslation';
interface Website { contents: WebContents; token: string; pending: Promise<void>; presentation?:{setVisible(value:boolean):void}; detach?:()=>void }
interface TextRequest { id: number; version: number; text: string }
interface TextResult { text: string | null; complete: boolean; retry?: boolean; pending?: {start:number;end:number}[] }
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
    ? (app.isPackaged ? path.join(process.resourcesPath, 'translator') : appPath('build', 'translator')) : null) {
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
    this.timer = setInterval(() => { void this.pump(); }, 50);
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
  attach(contents: WebContents,presentation?:{setVisible(value:boolean):void}): void {
    const website: Website = { contents, token: '', pending: Promise.resolve(),presentation };
    this.websites.add(website);
    const navigating=(details:Electron.Event<Electron.WebContentsDidStartNavigationEventParams>):void=>{
      if(!details.isMainFrame||details.isSameDocument)return;
      let game=false;try{game=new URL(details.url).origin==='https://play.fables.gg';}catch{/* A non-web navigation stays visible. */}
      presentation?.setVisible(!(game&&this.settings.enabled&&!this.settings.showOriginal&&this.settings.hideUntranslated));
    };
    const failed=(_event:Electron.Event,_code:number,_description:string,_url:string,isMainFrame:boolean):void=>{if(isMainFrame)presentation?.setVisible(true);};
    const ready=():void=>{void this.configure(website);};
    const destroyed=():void=>{website.token='';website.detach?.();this.websites.delete(website);};
    website.detach=()=>{contents.off('did-start-navigation',navigating);contents.off('did-fail-load',failed);contents.off('dom-ready',ready);contents.off('destroyed',destroyed);};
    contents.on('did-start-navigation',navigating);contents.on('did-fail-load',failed);contents.on('dom-ready',ready);contents.on('destroyed',destroyed);
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
      if(settings.enabled&&!settings.showOriginal&&settings.hideUntranslated)website.presentation?.setVisible(false);
      await website.contents.executeJavaScript(`window.${DOM_KEY}?.dispose()`);
      if (token !== website.token || !settings.enabled || settings.showOriginal || this.stopped) return;
      await website.contents.executeJavaScript(`(${installTranslationDom.toString()})(${JSON.stringify(token)},${JSON.stringify(RUSSIAN_DICTIONARY)},${settings.translateDescriptions},${JSON.stringify(settings.preservedNames)},(${localTranslation.toString()}),${settings.hideUntranslated})`);
    }).catch(() => { /* Navigation can discard an in-flight renderer call. */ }).finally(()=>{
      if(token===website.token&&!website.contents.isDestroyed())website.presentation?.setVisible(true);
    });
    return website.pending;
  }
  private async translateBatch(nodes: TextRequest[], progress: (results: TextResult[]) => Promise<void>): Promise<TextResult[]> {
    const plans = nodes.map(node => translationPlan(node.text, this.settings.preservedNames));
    const queues = plans.map(parts => parts.filter(part => part.translate && this.cache.get(part.request ?? part.text) === undefined).map(part => part.request ?? part.text));
    const requests = new Set<string>();
    // Interleave paragraphs so one long description cannot hold up the others.
    for (let index = 0; queues.some(queue => index < queue.length); index++) {
      for (const queue of queues) if (queue[index] !== undefined) requests.add(queue[index]);
    }
    const missing = [...requests];
    const failed = new Set<string>();
    const render = (): TextResult[] => plans.map(parts => {
      const pending=parts.filter(part=>part.translate && this.cache.get(part.request??part.text)===undefined);
      const complete=pending.length===0;
      const ranges: {start:number;end:number}[]=[]; let text='';
      for (const part of parts) {
        const unresolved=part.translate && this.cache.get(part.request??part.text)===undefined;
        if (unresolved) for (const range of part.untranslated??[]) ranges.push({start:text.length+range.start,end:text.length+range.end});
        text+=unresolved ? part.text : renderTranslation(part,part.translate?this.cache.get(part.request??part.text):undefined);
      }
      return {complete, pending:ranges, text,
        retry: !complete && (this.retryAfter>Date.now() || pending.some(part=>failed.has(part.request??part.text)))};
    });
    // Show cached sentences and local terms immediately, including model startup.
    await progress(render());
    if (missing.length && this.retryAfter <= Date.now()) {
      const engine = await this.readyEngine();
      const batch: string[] = []; let length = 0;
      // Yield after a small batch: other paragraphs and newly visible text can
      // progress on the next poll rather than waiting for an entire long page.
      while (missing.length && batch.length < 4 && length + missing[0].length <= 2400) {
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
    return render();
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
        if (!nodes.length) continue;
        if (nodes.length > 32 || nodes.some(node => !node || !Number.isInteger(node.id) || !Number.isInteger(node.version)
          || typeof node.text !== 'string' || node.text.length > 16000) || nodes.reduce((total, node) => total + node.text.length, 0) > 48000) continue;
        const publish = async (translated: TextResult[]): Promise<void> => {
          if (token !== website.token || !this.allowed(website.contents)) return;
          const results=nodes.map((node,index)=>({id:node.id,version:node.version,...translated[index]}));
          await website.contents.executeJavaScript(`window.${DOM_KEY}?.finish(${JSON.stringify(token)},${JSON.stringify(results)})`);
        };
        try { await publish(await this.translateBatch(nodes,publish)); }
        catch { await publish(nodes.map(()=>({text:null,complete:false,retry:true}))); }
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
    for(const website of this.websites)website.detach?.();this.websites.clear();
    await this.cache.flush().catch(() => {});
    for (const method of ['get', 'save', 'check', 'clear-cache']) ipcMain.removeHandler(`translation:${method}`);
  }
}
