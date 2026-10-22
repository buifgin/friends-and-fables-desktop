import { SettingsHub } from '../settings/settings-hub';
import type { SettingsManagers } from '../settings/settings-hub';
import type { CampaignNavDestination } from '../settings/campaign-panel';
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
  private opening = false;
  private openingSection?:SettingsSection;
  private inset = 0;
  private width: number;
  private revision = 0;

  constructor(readonly window: BrowserWindow, private website: WebContentsView, private manager: AppearanceManager) {
    this.width = manager.getSettings().appearancePanelWidth;
    this.windowControls = new WindowControls(window, manager);
    this.generalReady=this.general.initialize().then(()=>this.layout());
    this.hub=new SettingsHub(window,manager,this.general,()=>this.hide(),()=>{this.barOverride=false;this.barManualHidden=false;this.layout();},section=>this.openSection(section));
    setSettingsEscape(window,()=>{if(!this.opened&&!this.opening)return false;if(this.opened&&this.hub.currentSection()==='campaign'&&this.website.webContents.isFocused())return false;this.hide();return true;});
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
    ipcMain.handle('appearance-dock:popup', (event,open: unknown) => { this.assertTrusted(event); if (typeof open !== 'boolean') throw new Error('Invalid popup state.'); });
    window.on('blur', () => { if (!contents.isDestroyed()) contents.send('appearance-dock:popup-close'); });
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
    this.layout(); this.update(); this.hub.update(); this.windowControls.sync();
  }
  isOpen(): boolean { return this.opened; }
  async setCampaignAvailable(available:boolean):Promise<void> {
    this.hub.setCampaignAvailable(available);
    if(!available&&this.opened){
      if(['campaign','combat'].includes(this.hub.currentSection()))await this.openSection('general');
      else this.layout();
    }
  }
  refreshCampaign():void { this.hub.refreshCampaign(); }
  closeCampaign(): void { if (this.opening?this.openingSection==='campaign':this.opened&&this.hub.currentSection()==='campaign') this.hide(); }

  async navigateCampaignSection(destination:CampaignNavDestination,ticket:string):Promise<boolean> {
    if(this.window.isDestroyed()||!(this.opened||this.opening&&this.openingSection==='campaign')||!this.hub.consumeCampaignNavigation(destination,ticket))return false;
    this.opened=true;
    await this.openSection(destination);return true;
  }

  async flushSettings(): Promise<void> { await this.generalReady; await this.general.flush(); }
  configureSettings(managers: SettingsManagers): void { this.hub.configure(managers); }
  async toggle(): Promise<void> { if (this.opened||this.opening) this.hide(); else await this.openSettings(); }
  async openSettings():Promise<void> {
    const revision=this.revision;
    await this.generalReady;
    if(revision!==this.revision||this.window.isDestroyed())return;
    await this.openSection(this.hub.resolveSettingsSection());
  }
  async open(refresh = false): Promise<void> { await this.openSection('appearance'); if(refresh)await this.manager.refreshPanel(); }
  async openSection(section:SettingsSection):Promise<void> {
    if(this.window.isDestroyed())return;
    const revision=++this.revision;
    await this.generalReady;
    if(revision!==this.revision||this.window.isDestroyed())return;
    this.opening=true;this.openingSection=section;
    try {await this.hub.select(section,()=>{
      if(revision!==this.revision||this.window.isDestroyed())return;
      this.opened=true;this.layout();
    });}finally{if(revision===this.revision){this.opening=false;this.openingSection=undefined;}}
    if(revision!==this.revision||this.window.isDestroyed()||!this.hub.isVisible()){return;}
    this.opened=true;this.layout();this.update();
    if(this.hub.currentSection()==='campaign'&&!this.hub.view.getVisible()&&!this.website.webContents.isDestroyed())this.website.webContents.focus();
  }
  hide(): void {
    this.revision++; this.opened = false;this.opening=false;this.openingSection=undefined;
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
    // Reserve only the desktop menu row; music now lives in the website header.
    const barVisible=desktopBarVisible(this.window.isFullScreen(),this.general.hideDesktopTopbarInFullscreen,this.barOverride)&&!this.barManualHidden;
    const inset = barVisible ? Math.max(this.inset,32) : 0;
    const geometry=settingsGeometry(width,height,this.width,inset);
    const panelWidth = this.opened ? geometry.panel.width : 0;
    // The renderer owns the entire horizontal reservation on Campaign routes.
    // Keep native website bounds full width for every reserved Settings section.
    const campaign=this.opened&&(this.hub.hasCampaignReservation()||this.hub.hasRetainedCampaign());
    const websiteX=campaign?0:panelWidth;
    this.website.setBounds({x:websiteX,y:inset,width:Math.max(0,width-websiteX),height:Math.max(0,height-inset)});
    this.hub.layout(geometry.panel);this.hub.setVisible(this.opened);
    this.windowControls.layout(width, 0);this.windowControls.setVisible(barVisible);
    this.launcher.setBounds({x:0,y:0,width:0,height:0});
    this.launcher.setVisible(false);
    this.window.setMenuBarVisibility(barVisible);
    this.onTopBarVisibilityChange?.(barVisible);

  }
}
