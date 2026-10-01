import { app, BrowserWindow, clipboard, ipcMain, session, shell } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_MUSIC, validateMusic } from './music-settings';
import type { MusicSettings } from './music-settings';
import { DEFAULT_APPEARANCE, themeBackground } from './themes';
import type { AppearanceSettings } from './themes';
import { configureMusicButton } from './music-button';
import { MUSIC_CATALOG, catalogAttribution } from './music-catalog';

export const MUSIC_URL = 'fables-desktop://music/';
export class MusicManager {
  private settings = structuredClone(DEFAULT_MUSIC);
  private window: BrowserWindow | null = null;
  private loading: Promise<void> | undefined;
  private locale: 'en' | 'ru' = 'en';
  private theme = {preset:DEFAULT_APPEARANCE.preset,customColor:DEFAULT_APPEARANCE.customColor};
  private websites = new Set<WebContents>();
  private writes: Promise<void> = Promise.resolve();
  private stopped = false;
  private file: string;
  constructor(folder = app.getPath('userData')) { this.file = path.join(folder,'music.json'); }
  async initialize(): Promise<void> {
    try { this.settings = validateMusic(JSON.parse(await readFile(this.file,'utf8'))); }
    catch { /* Missing or invalid preferences start with an empty, paused playlist. */ }
    const playerSession = session.fromPartition('fables-music');
    playerSession.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
    playerSession.setPermissionCheckHandler(() => false);
    const assets: Record<string,[string,string]> = {
      '/':['music.html','text/html; charset=utf-8'], '/music.css':['music.css','text/css; charset=utf-8'],
      '/music.js':['music.js','text/javascript; charset=utf-8'], '/settings-theme.js':['settings-theme.js','text/javascript; charset=utf-8'],
    };
    playerSession.protocol.handle('fables-desktop',async request => {
      const url = new URL(request.url), asset = url.host === 'music' ? assets[url.pathname] : undefined;
      if (request.method !== 'GET' || !asset) return new Response('Not found',{status:404});
      return new Response(await readFile(path.join(__dirname,'../assets',asset[0]),'utf8'),{headers:{'Content-Type':asset[1],'X-Content-Type-Options':'nosniff'}});
    });
    ipcMain.handle('music:get',event => { this.assertTrusted(event); return this.state(); });
    ipcMain.handle('music:save',async (event,value: unknown) => { this.assertTrusted(event); await this.save(value); return this.state(); });
    ipcMain.handle('music:copy-link',(event,id: unknown) => {
      this.assertTrusted(event);
      const track = this.settings.tracks.find(track => track.id === id);
      if (!track) throw new Error('Unknown track.');
      clipboard.writeText(track.url);
    });
    ipcMain.handle('music:copy-attribution',(event,id:unknown)=>{
      this.assertTrusted(event);
      const selected=this.settings.tracks.find(track=>track.id===id),track=MUSIC_CATALOG.find(track=>track.url===selected?.url);
      if(!track)throw new Error('Unknown catalog track.');
      clipboard.writeText(catalogAttribution(track));
    });
    ipcMain.handle('music:open-catalog-link',async(event,id:unknown,kind:unknown)=>{
      this.assertTrusted(event);
      const track=MUSIC_CATALOG.find(track=>track.id===id);
      if(!track||(kind!=='source'&&kind!=='license'))throw new Error('Unknown catalog link.');
      await shell.openExternal(kind==='source'?track.source:track.licenseUrl);
    });
  }
  private assertTrusted(event: IpcMainInvokeEvent): void {
    if (event.sender !== this.window?.webContents || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== MUSIC_URL) {
      throw new Error('Music preferences are available only in the app player.');
    }
  }
  getSettings(): MusicSettings { return structuredClone(this.settings); }
  private state() { return {settings:this.getSettings(),locale:this.locale,theme:{...this.theme},catalog:MUSIC_CATALOG}; }
  save(value: unknown): Promise<void> {
    const next = validateMusic(value);
    this.writes = this.writes.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.file),{recursive:true});
      await writeFile(`${this.file}.tmp`,`${JSON.stringify(next,null,2)}\n`,'utf8');
      await rename(`${this.file}.tmp`,this.file); this.settings = next;
    });
    return this.writes;
  }
  setInterface(settings: AppearanceSettings,locale: 'en' | 'ru'): void {
    this.theme = {preset:settings.preset,customColor:settings.customColor}; this.locale = locale;
    if (this.window && !this.window.isDestroyed()) {
      this.window.setBackgroundColor(themeBackground(this.theme)); this.window.setTitle(locale === 'ru' ? 'Музыка — Friends & Fables Desktop' : 'Music — Friends & Fables Desktop');
      this.window.webContents.send('music:interface',this.state());
    }
    for (const contents of this.websites) void this.configure(contents).catch(() => {});
  }
  attach(contents: WebContents): void {
    this.websites.add(contents);
    contents.on('did-finish-load',() => { void this.configure(contents).catch(console.error); });
    contents.on('did-navigate-in-page',() => { void this.configure(contents).catch(console.error); });
    contents.on('destroyed',() => this.websites.delete(contents));
  }
  handleOpenRequest(contents: WebContents,parent: BrowserWindow,url: string): boolean {
    if (url !== MUSIC_URL || !this.websites.has(contents) || new URL(contents.getURL()).origin !== 'https://play.fables.gg') return false;
    void this.open(parent).catch(console.error); return true;
  }
  private async configure(contents: WebContents): Promise<void> {
    if (contents.isDestroyed() || !contents.getURL().startsWith('https://play.fables.gg/')) return;
    await contents.executeJavaScript(`(${configureMusicButton.toString()})(${JSON.stringify(this.locale)},${JSON.stringify(MUSIC_URL)})`);
  }
  async open(parent: BrowserWindow): Promise<BrowserWindow> {
    if (this.stopped) throw new Error('The music player has stopped.');
    if (this.window && !this.window.isDestroyed()) {
      const existing = this.window; await this.loading;
      if (this.window !== existing || existing.isDestroyed()) return this.open(parent);
      existing.show(); existing.focus(); return existing;
    }
    const window = new BrowserWindow({parent,width:520,height:740,minWidth:420,minHeight:580,autoHideMenuBar:true,
      backgroundColor:themeBackground(this.theme),title:this.locale === 'ru' ? 'Музыка — Friends & Fables Desktop' : 'Music — Friends & Fables Desktop',
      webPreferences:{partition:'fables-music',preload:path.join(__dirname,'music-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,backgroundThrottling:false}});
    this.window = window; window.setMenu(null);
    window.webContents.on('will-navigate',event => event.preventDefault()); window.webContents.on('will-redirect',event => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    window.on('close',() => { if (this.window === window) { this.window = null; this.loading = undefined; } });
    window.on('closed',() => { if (this.window === window) { this.window = null; this.loading = undefined; } });
    this.loading = window.loadURL(MUSIC_URL); await this.loading; return window;
  }
  async shutdown(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true; this.window?.destroy(); await this.writes.catch(() => {});
    for (const name of ['get','save','copy-link','copy-attribution','open-catalog-link']) ipcMain.removeHandler(`music:${name}`);
    session.fromPartition('fables-music').protocol.unhandle('fables-desktop');
  }
}
