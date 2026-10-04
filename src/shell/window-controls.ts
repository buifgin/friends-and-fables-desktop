import { app, ipcMain, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import type { AppearanceManager } from '../appearance/appearance';
import { WindowMinimizer } from './window-minimizer';
import { configureFullscreenShortcuts } from './window-shortcuts';

export const WINDOW_CONTROLS_URL = 'fables-desktop://settings/window-controls.html';

export class WindowControls {
  readonly view: WebContentsView;
  readonly minimizer: WindowMinimizer;
  constructor(private window: BrowserWindow, private manager: AppearanceManager) {
    this.minimizer = new WindowMinimizer(window, () => manager.getLocale());
    this.view = new WebContentsView({ webPreferences: {
      partition: 'fables-appearance', preload: path.join(__dirname, 'window-controls-preload.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true,
    } });
    const contents = this.view.webContents;
    this.view.setBackgroundColor('#00000000');
    window.contentView.addChildView(this.view);
    contents.on('will-navigate', event => event.preventDefault());
    contents.on('will-redirect', event => event.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    configureFullscreenShortcuts(contents, window);
    ipcMain.handle('window-controls:get', event => { this.assertTrusted(event); return this.state(); });
    ipcMain.handle('window-controls:action', (event, action: unknown) => {
      this.assertTrusted(event);
      if (action === 'fullscreen') {
        window.setFullScreen(!window.isFullScreen());
        // Windows can commit the native state without delivering a fullscreen event.
        // Publish the actual state now; native events still reconcile async transitions.
        this.sync();
      }
      else if (action === 'minimize') this.minimizer.minimize();
      else if (action === 'quit') app.quit();
      else throw new Error('Invalid window action.');
    });
    window.on('enter-full-screen', () => this.sync());
    window.on('leave-full-screen', () => this.sync());
    window.on('closed', () => {
      for (const action of ['get', 'action']) ipcMain.removeHandler(`window-controls:${action}`);
      if (!contents.isDestroyed()) contents.close();
    });
    void contents.loadURL(WINDOW_CONTROLS_URL).then(() => this.sync()).catch(console.error);
  }
  private assertTrusted(event: IpcMainInvokeEvent): void {
    if (event.sender !== this.view.webContents || event.senderFrame !== event.sender.mainFrame
      || event.senderFrame.origin !== 'fables-desktop://settings' || event.senderFrame.url !== WINDOW_CONTROLS_URL) {
      throw new Error('Window controls are available only in the app toolbar.');
    }
  }
  private state() {
    return { settings: this.manager.getSettings(), locale: this.manager.getLocale(), fullscreen: !this.window.isDestroyed() && this.window.isFullScreen() };
  }
  sync(): void {
    this.minimizer.sync();
    if (!this.view.webContents.isDestroyed()) this.view.webContents.send('window-controls:update', this.state());
  }
  layout(width: number, top: number): void {
    this.view.setBounds({ x: Math.max(0, width - 108), y: top, width: 108, height: 32 });
  }
  raise(): void { if (!this.window.isDestroyed()) this.window.contentView.addChildView(this.view); }
}
