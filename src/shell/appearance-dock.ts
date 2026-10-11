import { SettingsHub } from '../settings/settings-hub';
import type { SettingsManagers } from '../settings/settings-hub';
import type { SettingsSection } from '../settings/settings-core';
import { desktopBarVisible, settingsGeometry } from '../settings/settings-core';
import { GeneralSettings } from '../settings/general-settings';
import { setQuickBarToggle, setSettingsEscape } from './window-shortcuts';
import { ipcMain, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import type { AppearanceManager } from '../appearance/appearance';
import { configureFullscreenShortcuts } from './window-shortcuts';
import { WindowControls } from './window-controls';

export const DOCK_URL = 'fables-desktop://settings/appearance-button.html';

// Every local view has its own preload. The website remains an ordinary,
// sandboxed browser with no access to settings or filesystem APIs.
export class AppearanceDock {
  private launcher: WebContentsView;
  readonly windowControls: WindowControls;
  private hub: SettingsHub;
  private general = new GeneralSettings();
  private generalReady: Promise<void>;
  private barOverride = false;
  private barManualHidden = false;
  onTopBarVisibilityChange?: (visible: boolean) => void;
  private ready: Promise<void>;

  private opened = false;
  private inset = 0;
  private popup = false;
  private width: number;
  private revision = 0;

  constructor(readonly window: BrowserWindow, private website: WebContentsView, private manager: AppearanceManager) {
    this.width = manager.getSettings().appearancePanelWidth;
    this.windowControls = new WindowControls(window, manager);
    this.generalReady=this.general.initialize().then(()=>this.layout());
    this.hub=new SettingsHub(window,manager,this.general,()=>this.hide(),()=>{this.barOverride=false;this.barManualHidden=false;this.layout();},section=>this.openSection(section));
    setSettingsEscape(window,()=>{if(!this.opened)return false;this.hide();return true;});
    setQuickBarToggle(window,()=>{
      if(window.isFullScreen()&&this.general.hideDesktopTopbarInFullscreen)this.barOverride=!this.barOverride;
      else this.barManualHidden=!this.barManualHidden;
      this.layout();
    });
    this.launcher = new WebContentsView({ webPreferences: {
      partition: 'fables-appearance', preload: path.join(__dirname, 'appearance-button-preload.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true,
    } });
    this.launcher.setBackgroundColor('#00000000');
    this.launcher.setVisible(false);
    window.contentView.addChildView(this.launcher);
    const contents = this.launcher.webContents;
    contents.on('will-navigate', event => event.preventDefault());
    contents.on('will-redirect', event => event.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    configureFullscreenShortcuts(contents, window);
    this.ready = contents.loadURL(DOCK_URL).then(() => this.update());
    void this.ready.catch(console.error);
    ipcMain.handle('appearance-dock:get', event => { this.assertTrusted(event); return this.state(); });
    ipcMain.handle('appearance-dock:toggle', event => { this.assertTrusted(event); return this.toggle(); });
    ipcMain.handle('appearance-dock:popup', (event,open: unknown) => { this.assertTrusted(event); if (typeof open !== 'boolean') throw new Error('Invalid popup state.'); this.popup = open; if (open) window.contentView.addChildView(this.launcher); this.layout(); });
    window.on('blur', () => { this.popup = false; this.layout(); if (!contents.isDestroyed()) contents.send('appearance-dock:popup-close'); });
    window.on('resize', () => this.layout());
    window.on('enter-full-screen', () => {this.barOverride=false;this.barManualHidden=false;this.layout();});
    window.on('leave-full-screen', () => {this.barOverride=false;this.barManualHidden=false;this.layout();});
    window.on('closed', () => {
      this.revision++;
      for (const name of ['get', 'toggle', 'popup']) ipcMain.removeHandler(`appearance-dock:${name}`);
      if (!contents.isDestroyed()) contents.close();

    });
    this.sync();
  }

  private assertTrusted(event: IpcMainInvokeEvent): void {
    if (event.sender !== this.launcher.webContents || event.senderFrame !== event.sender.mainFrame
      || event.senderFrame.origin !== 'fables-desktop://settings' || event.senderFrame.url !== DOCK_URL) {
      throw new Error('The appearance button is available only in the app interface.');
    }
  }

  private state() { return { settings: this.manager.getSettings(), locale: this.manager.getLocale(), open: this.opened }; }
  private update(): void {
    if (!this.launcher.webContents.isDestroyed()) this.launcher.webContents.send('appearance-dock:update', this.state());
  }

  getLauncherContents() { return this.launcher.webContents; }
  raiseControls(): void { this.windowControls.raise(); if (!this.window.isDestroyed()) this.window.contentView.addChildView(this.launcher); }
  setInset(inset: number): void { this.inset = inset; this.layout(); }
  sync(): void {

    this.width = this.manager.getSettings().appearancePanelWidth;
    this.layout(); this.update(); this.windowControls.sync();
  }
  isOpen(): boolean { return this.opened; }

  async flushSettings(): Promise<void> { await this.generalReady; await this.general.flush(); }
  configureSettings(managers: SettingsManagers): void { this.hub.configure(managers); }
  async toggle(): Promise<void> { if (this.opened) this.hide(); else await this.open(); }
  async open(refresh = false): Promise<void> { await this.openSection('appearance'); if(refresh)await this.manager.refreshPanel(); }
  async openSection(section:SettingsSection):Promise<void> {
    if(this.window.isDestroyed())return;
    const revision=++this.revision;
    await this.generalReady;
    await this.hub.select(section);
    if(revision!==this.revision||this.window.isDestroyed()){return;}
    this.opened=true;this.layout();this.update();
  }
  hide(): void {
    this.revision++; this.opened = false;
    this.hub.setVisible(false);
    if (!this.window.isDestroyed()) { this.layout(); this.update(); }
    if (!this.website.webContents.isDestroyed()) this.website.webContents.focus();
  }
  resize(width: number): number {
    this.width = this.clamp(width); this.layout();
    return this.width;
  }
  private clamp(width: number): number {
    return Math.round(Math.max(460, Math.min(1000, this.window.getContentSize()[0] - 360, width)));
  }
  private layout(): void {
    if (this.window.isDestroyed()) return;
    const [width, height] = this.window.getContentSize();
    // Share the menu row, reserving one app-owned row with native menus. The launcher
    // must never cover the website's avatars, navigation, or map controls.
    const barVisible=desktopBarVisible(this.window.isFullScreen(),this.general.hideDesktopTopbarInFullscreen,this.barOverride)&&!this.barManualHidden;
    const inset = barVisible ? Math.max(this.inset,32) : 0;
    const geometry=settingsGeometry(width,height,this.width,inset);
    const panelWidth = this.opened ? geometry.panel.width : 0;
    // Native Campaign settings paint inside the website; its adapter reserves
    // the content strip, while the hub's own view covers only the navigation.
    const campaign=this.opened&&this.hub.currentSection()==='campaign';
    const websiteX=campaign?geometry.navigation.width:panelWidth;
    this.website.setBounds({x:websiteX,y:inset,width:Math.max(0,width-websiteX),height:Math.max(0,height-inset)});
    this.hub.layout(geometry.panel);this.hub.setVisible(this.opened);
    this.windowControls.layout(width, 0);this.windowControls.setVisible(barVisible);
    this.launcher.setBounds({ x: Math.max(0, Math.round((width - 232) / 2)), y: 0, width: 232, height: this.popup ? 166 : 32 });
    this.launcher.setVisible(barVisible);
    this.window.setMenuBarVisibility(barVisible);
    this.onTopBarVisibilityChange?.(barVisible);

  }
}
