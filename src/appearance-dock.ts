import { ipcMain, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import type { AppearanceManager } from './appearance';
import { configureFullscreenShortcuts } from './window-shortcuts';

export const DOCK_URL = 'fables-desktop://settings/appearance-button.html';

// Every local view has its own preload. The website remains an ordinary,
// sandboxed browser with no access to settings or filesystem APIs.
export class AppearanceDock {
  private launcher: WebContentsView;
  private panel: WebContentsView | null = null;
  private ready: Promise<void>;
  private panelReady: Promise<void> | null = null;
  private opened = false;
  private inset = 0;
  private popup = false;
  private width: number;
  private revision = 0;

  constructor(readonly window: BrowserWindow, private website: WebContentsView, private manager: AppearanceManager) {
    this.width = manager.getSettings().appearancePanelWidth;
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
    window.on('enter-full-screen', () => this.layout());
    window.on('leave-full-screen', () => this.layout());
    window.on('closed', () => {
      this.revision++;
      for (const name of ['get', 'toggle', 'popup']) ipcMain.removeHandler(`appearance-dock:${name}`);
      if (!contents.isDestroyed()) contents.close();
      const panelContents = this.panel?.webContents;
      if (panelContents && !panelContents.isDestroyed()) panelContents.close();
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
  setInset(inset: number): void { this.inset = inset; this.layout(); }
  sync(): void {
    if (!this.manager.getSettings().appearancePinned) this.hide();
    this.width = this.manager.getSettings().appearancePanelWidth;
    this.layout(); this.update();
  }
  isOpen(): boolean { return this.opened; }

  async toggle(): Promise<void> { if (!this.manager.getSettings().appearancePinned) { await this.manager.open(this.window); return; } if (this.opened) this.hide(); else await this.open(); }
  async open(refresh = false): Promise<void> {
    if (!this.manager.getSettings().appearancePinned || this.window.isDestroyed()) return;
    const revision = ++this.revision;
    if (!this.panel) {
      this.panel = this.manager.createPanel(this.window);
      this.panel.setVisible(false);
      this.window.contentView.addChildView(this.panel);
      this.panelReady = this.panel.webContents.loadURL('fables-desktop://settings/');
    }
    await this.panelReady;
    if (revision !== this.revision || this.window.isDestroyed() || !this.manager.getSettings().appearancePinned) return;
    if (refresh) await this.manager.refreshPanel();
    this.opened = true;
    this.layout(); this.update();
    this.panel.webContents.focus();
  }
  hide(): void {
    this.revision++; this.opened = false;
    this.panel?.setVisible(false);
    if (!this.window.isDestroyed()) { this.layout(); this.update(); }
    if (!this.website.webContents.isDestroyed()) this.website.webContents.focus();
  }
  resize(width: number): number {
    this.width = this.clamp(width); this.layout();
    return this.width;
  }
  private clamp(width: number): number {
    return Math.round(Math.max(320, Math.min(900, this.window.getContentSize()[0] - 360, width)));
  }
  private layout(): void {
    if (this.window.isDestroyed()) return;
    const [width, height] = this.window.getContentSize();
    // Reserve an app-owned row when there is no Linux toolbar. The launcher
    // must never cover the website's avatars, navigation, or map controls.
    const inset = this.inset || 32;
    const panelWidth = this.opened ? this.clamp(this.width) : 0;
    this.website.setBounds({ x: panelWidth, y: inset, width: Math.max(0, width - panelWidth), height: Math.max(0, height - inset) });
    this.panel?.setBounds({ x: 0, y: inset, width: panelWidth || this.clamp(this.width), height: Math.max(0, height - inset) });
    this.panel?.setVisible(this.opened);
    this.launcher.setBounds({ x: Math.max(0, width - 238), y: 0, width: 232, height: this.popup ? 166 : 32 });
    this.launcher.setVisible(true);
  }
}
