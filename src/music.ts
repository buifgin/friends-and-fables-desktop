import { app, clipboard, dialog, ipcMain, net, session, shell, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent, WebContents } from 'electron';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_MUSIC, validateMusic } from './music-settings';
import type { MusicSettings } from './music-settings';
import { DEFAULT_APPEARANCE, themeBackground } from './themes';
import type { AppearanceSettings } from './themes';
import { configureMusicButton } from './music-button';
import { MUSIC_CATALOG, catalogAttribution } from './music-catalog';
import { chosenFolder, LOCAL_AUDIO, MusicLibrary, validateFolders } from './music-library';
import type { MusicFolder } from './music-library';
import { DOCK_URL } from './appearance-dock';

export const MUSIC_URL = 'fables-desktop://music/';
export type MusicControl = 'play' | 'stop' | 'next' | 'repeat' | 'mute' | 'volume' | 'library';
export class MusicManager {
  private settings = structuredClone(DEFAULT_MUSIC);
  private player: WebContentsView | null = null;
  private parent: BrowserWindow | null = null;
  private launcher: WebContents | null = null;
  private activeWebsite: WebContents | null = null;
  private visible = false;
  private inset = 32;
  private loading: Promise<void> | undefined;
  private locale: 'en' | 'ru' = 'en';
  private theme = {preset:DEFAULT_APPEARANCE.preset,customColor:DEFAULT_APPEARANCE.customColor};
  private websites = new Set<WebContents>();
  private writes: Promise<void> = Promise.resolve();
  private stopped = false;
  private file: string;
  private folderFile: string;
  private folders: MusicFolder[] = [];
  private library = new MusicLibrary();
  private libraryWrites: Promise<void> = Promise.resolve();
  private playback = {paused:true,title:'',available:false,next:false,volume:.5,muted:false,loop:false};
  constructor(folder = app.getPath('userData')) { this.file = path.join(folder,'music.json'); this.folderFile = path.join(folder,'music-folders.json'); }
  async initialize(): Promise<void> {
    try { this.settings = validateMusic(JSON.parse(await readFile(this.file,'utf8'))); }
    catch { /* Missing or invalid preferences start with an empty, paused playlist. */ }
    try { this.folders = validateFolders(JSON.parse(await readFile(this.folderFile,'utf8'))); }
    catch { /* Only previously chosen folders can be restored. */ }
    await this.library.scan(this.folders);
    this.playback = {...this.playback,volume:this.settings.volume,muted:this.settings.muted,loop:this.settings.loop};
    const playerSession = session.fromPartition('fables-music');
    playerSession.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
    playerSession.setPermissionCheckHandler(() => false);
    const assets: Record<string,[string,string]> = {
      '/':['music.html','text/html; charset=utf-8'], '/music.css':['music.css','text/css; charset=utf-8'],
      '/music.js':['music.js','text/javascript; charset=utf-8'], '/settings-theme.js':['settings-theme.js','text/javascript; charset=utf-8'],
    };
    playerSession.protocol.handle('fables-desktop',async request => {
      const url = new URL(request.url);
      if (request.method !== 'GET' || url.host !== 'music') return new Response('Not found',{status:404});
      const id = /^\/audio\/([a-f0-9]{64})$/.exec(url.pathname)?.[1];
      if (id && !url.search && !url.hash) {
        const file = await this.library.file(id);
        if (!file) return new Response('Not found',{status:404});
        return net.fetch(pathToFileURL(file).href,{headers:request.headers});
      }
      const asset = assets[url.pathname]; if (!asset) return new Response('Not found',{status:404});
      return new Response(await readFile(path.join(__dirname,'../assets',asset[0]),'utf8'),{headers:{'Content-Type':asset[1],'X-Content-Type-Options':'nosniff'}});
    });
    ipcMain.handle('music:get',event => { this.assertTrusted(event); return this.state(); });
    ipcMain.handle('music:save',async (event,value: unknown) => { this.assertTrusted(event); await this.save(value); return this.state(); });
    ipcMain.handle('music:hide',event => { this.assertTrusted(event); this.hide(); });
    ipcMain.handle('music:playback',(event,value: unknown) => {
      this.assertTrusted(event);
      if (!value || typeof value !== 'object') throw new Error('Invalid playback status.');
      const input = value as Record<string,unknown>;
      if (typeof input.paused !== 'boolean') throw new Error('Invalid playback status.');
      this.playback = {...this.playback,paused:input.paused,title:this.settings.tracks.find(track=>track.id===input.selected)?.title ?? '',available:this.settings.selected!==null,next:this.settings.selected!==null&&this.settings.tracks.length>1};
      this.broadcast();
    });
    ipcMain.handle('music:toolbar-get',event => { this.assertToolbar(event); return this.toolbarState(); });
    ipcMain.handle('music:control',async(event,command: unknown,value: unknown) => {
      this.assertToolbar(event);
      if (!['play','stop','next','repeat','mute','volume','library'].includes(String(command))) throw new Error('Invalid music control.');
      if (command === 'volume' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) throw new Error('Invalid volume.');
      if (command === 'library') { if (this.visible) this.hide(); else if (this.parent) await this.open(this.parent); return; }
      await this.loading;
      if (this.player && !this.player.webContents.isDestroyed()) this.player.webContents.send('music:control',command,value);
    });
    ipcMain.handle('music:choose-folder',event => { this.assertTrusted(event); return this.updateFolders(async() => {
      if (this.folders.length >= 16) throw new Error('The library supports up to 16 folders.');
      const options = {title:this.locale === 'ru' ? 'Выберите папку с музыкой' : 'Choose a music folder',properties:['openDirectory'] as Array<'openDirectory'>};
      const selected = this.parent ? await dialog.showOpenDialog(this.parent,options) : await dialog.showOpenDialog(options);
      if (selected.canceled || !selected.filePaths[0]) return;
      const folder = await chosenFolder(selected.filePaths[0]);
      if (!this.folders.some(item=>item.path === folder.path)) this.folders.push(folder);
    }); });
    ipcMain.handle('music:refresh-folders',event => { this.assertTrusted(event); return this.updateFolders(async() => {}); });
    ipcMain.handle('music:remove-folder',(event,id: unknown) => { this.assertTrusted(event); return this.updateFolders(async() => {
      if (typeof id !== 'string' || !this.folders.some(folder=>folder.id === id)) throw new Error('Unknown music folder.');
      this.folders = this.folders.filter(folder=>folder.id !== id);
    }); });
    ipcMain.handle('music:copy-link',(event,id: unknown) => {
      this.assertTrusted(event); const track = this.settings.tracks.find(track => track.id === id);
      if (!track || LOCAL_AUDIO.test(track.url)) throw new Error('Only public audio links can be shared.');
      clipboard.writeText(track.url);
    });
    ipcMain.handle('music:copy-attribution',(event,id:unknown)=>{
      this.assertTrusted(event); const selected=this.settings.tracks.find(track=>track.id===id),track=MUSIC_CATALOG.find(track=>track.url===selected?.url);
      if(!track)throw new Error('Unknown catalog track.'); clipboard.writeText(catalogAttribution(track));
    });
    ipcMain.handle('music:open-catalog-link',async(event,id:unknown,kind:unknown)=>{
      this.assertTrusted(event); const track=MUSIC_CATALOG.find(track=>track.id===id);
      if(!track||(kind!=='source'&&kind!=='license'))throw new Error('Unknown catalog link.');
      await shell.openExternal(kind==='source'?track.source:track.licenseUrl);
    });
  }
  private assertTrusted(event: IpcMainInvokeEvent): void {
    if (event.sender !== this.player?.webContents || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== MUSIC_URL) throw new Error('Music preferences are available only in the app player.');
  }
  private assertToolbar(event: IpcMainInvokeEvent): void {
    if (event.sender !== this.launcher || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== DOCK_URL) throw new Error('Music controls are available only in the app toolbar.');
  }
  getSettings(): MusicSettings { return structuredClone(this.settings); }
  private state() { return {settings:this.getSettings(),locale:this.locale,theme:{...this.theme},catalog:MUSIC_CATALOG,library:this.library.state()}; }
  private toolbarState() { return {...this.playback,open:this.visible,locale:this.locale}; }
  private broadcast(): void { if (this.launcher && !this.launcher.isDestroyed()) this.launcher.send('music:toolbar-update',this.toolbarState()); }
  private updateFolders(mutation: () => Promise<void>): Promise<unknown> {
    const operation = this.libraryWrites.catch(() => {}).then(async() => {
      await mutation(); await this.library.scan(this.folders);
      await mkdir(path.dirname(this.folderFile),{recursive:true});
      await writeFile(`${this.folderFile}.tmp`,`${JSON.stringify(this.folders,null,2)}\n`,'utf8');
      await rename(`${this.folderFile}.tmp`,this.folderFile);
      if (this.player && !this.player.webContents.isDestroyed()) this.player.webContents.send('music:library',this.library.state());
      return this.library.state();
    });
    this.libraryWrites = operation.then(()=>{}); return operation;
  }
  save(value: unknown): Promise<void> {
    const next = validateMusic(value);
    // Unknown virtual URLs never become a new authorization to read a file.
    if (next.tracks.some(track=>LOCAL_AUDIO.test(track.url) && !this.library.has(track.url) && !this.settings.tracks.some(saved=>saved.url === track.url))) return Promise.reject(new Error('Unknown local audio track.'));
    this.writes = this.writes.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.file),{recursive:true}); await writeFile(`${this.file}.tmp`,`${JSON.stringify(next,null,2)}\n`,'utf8');
      await rename(`${this.file}.tmp`,this.file); this.settings = next;
      this.playback = {...this.playback,volume:next.volume,muted:next.muted,loop:next.loop,title:next.tracks.find(track=>track.id===next.selected)?.title ?? '',available:next.selected!==null,next:next.selected!==null&&next.tracks.length>1}; this.broadcast();
    }); return this.writes;
  }
  setInterface(settings: AppearanceSettings,locale: 'en' | 'ru'): void {
    this.theme = {preset:settings.preset,customColor:settings.customColor}; this.locale = locale;
    if (this.player && !this.player.webContents.isDestroyed()) { this.player.setBackgroundColor(themeBackground(this.theme)); this.player.webContents.send('music:interface',this.state()); }
    this.broadcast(); for (const contents of this.websites) void this.configure(contents).catch(() => {});
  }
  attach(contents: WebContents): void {
    this.websites.add(contents); contents.on('did-finish-load',() => { void this.configure(contents).catch(console.error); });
    contents.on('did-navigate-in-page',() => { void this.configure(contents).catch(console.error); }); contents.on('destroyed',() => this.websites.delete(contents));
  }
  attachMain(parent: BrowserWindow,launcher?: WebContents,website?: WebContents): void {
    if (this.parent === parent && this.player) { if (launcher) this.launcher = launcher; if (website) this.activeWebsite = website; return; }
    if (this.player) { if (this.parent && !this.parent.isDestroyed()) this.parent.contentView.removeChildView(this.player); if (!this.player.webContents.isDestroyed()) this.player.webContents.close(); }
    this.parent = parent; this.launcher = launcher ?? null; this.activeWebsite = website ?? parent.webContents; this.visible = false;
    const player = new WebContentsView({webPreferences:{partition:'fables-music',preload:path.join(__dirname,'music-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,backgroundThrottling:false}});
    const contents = player.webContents;
    this.player = player; player.setBackgroundColor(themeBackground(this.theme)); player.setVisible(false); parent.contentView.addChildView(player);
    player.webContents.on('will-navigate',event => event.preventDefault()); player.webContents.on('will-redirect',event => event.preventDefault()); player.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    parent.on('resize',() => this.layout()); parent.on('enter-full-screen',() => this.layout()); parent.on('leave-full-screen',() => this.layout());
    parent.once('closed',() => { if (this.parent === parent) { this.visible = false; this.parent = null; this.launcher = null; this.activeWebsite = null; this.player = null; this.loading = undefined; if (!contents.isDestroyed()) contents.close(); } });
    this.loading = player.webContents.loadURL(MUSIC_URL); void this.loading.catch(console.error); this.layout(); this.broadcast();
  }
  setInset(inset: number): void { this.inset = Math.max(32,inset); this.layout(); }
  hide(): void { this.visible = false; this.player?.setVisible(false); if (this.activeWebsite && !this.activeWebsite.isDestroyed()) this.activeWebsite.focus(); this.broadcast(); }
  private layout(): void {
    if (!this.parent || this.parent.isDestroyed() || !this.player) return;
    const [width,height] = this.parent.getContentSize(), panelWidth = Math.min(520,Math.max(360,width-320));
    this.player.setBounds({x:Math.max(0,width-panelWidth),y:this.inset,width:panelWidth,height:Math.max(0,height-this.inset)}); this.player.setVisible(this.visible);
  }
  handleOpenRequest(contents: WebContents,parent: BrowserWindow,url: string): boolean {
    if (url !== MUSIC_URL || !this.websites.has(contents) || new URL(contents.getURL()).origin !== 'https://play.fables.gg') return false;
    void this.open(parent).catch(console.error); return true;
  }
  private async configure(contents: WebContents): Promise<void> {
    if (contents.isDestroyed() || !contents.getURL().startsWith('https://play.fables.gg/')) return;
    await contents.executeJavaScript(`(${configureMusicButton.toString()})(${JSON.stringify(this.locale)},${JSON.stringify(MUSIC_URL)})`);
  }
  async open(parent: BrowserWindow): Promise<WebContentsView> {
    if (this.stopped) throw new Error('The music player has stopped.');
    if (this.parent !== parent || !this.player) this.attachMain(parent);
    const player = this.player!; await this.loading;
    if (this.player !== player || parent.isDestroyed()) throw new Error('The main window has closed.');
    this.visible = true; this.layout(); this.broadcast(); player.webContents.focus(); return player;
  }
  async shutdown(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true; if (this.player) { if (this.parent && !this.parent.isDestroyed()) this.parent.contentView.removeChildView(this.player); if (!this.player.webContents.isDestroyed()) this.player.webContents.close(); } this.player = null;
    await Promise.all([this.writes.catch(() => {}),this.libraryWrites.catch(() => {})]);
    for (const name of ['get','save','hide','playback','toolbar-get','control','choose-folder','refresh-folders','remove-folder','copy-link','copy-attribution','open-catalog-link']) ipcMain.removeHandler(`music:${name}`);
    session.fromPartition('fables-music').protocol.unhandle('fables-desktop');
  }
}
