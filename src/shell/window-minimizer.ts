import { app, Menu, nativeImage, Tray } from 'electron';
import type { BrowserWindow } from 'electron';
import { appPath } from '../shared/app-paths';
import { usesTrayForMinimize } from './window-chrome';

// Hyprland leaves a native minimize request onscreen while Chromium stops painting.
export class WindowMinimizer {
  private tray: Tray | undefined;
  readonly trayMode = usesTrayForMinimize(process.platform, process.env);

  constructor(private window: BrowserWindow, private locale: () => 'en' | 'ru') {
    window.once('closed', () => { this.tray?.destroy(); this.tray = undefined; });
  }

  minimize(): void {
    if (this.window.isDestroyed()) return;
    if (!this.trayMode) { this.window.minimize(); return; }
    if (!this.tray) {
      const image = nativeImage.createFromPath(appPath('assets', 'shell', 'tray-icon.png'));
      if (image.isEmpty()) throw new Error('The app tray icon could not be loaded.');
      this.tray = new Tray(image.resize({ width: 22, height: 22 }));
      this.tray.setToolTip('Friends & Fables Desktop');
      this.tray.on('click', () => this.restore());
      this.tray.on('double-click', () => this.restore());
    }
    this.sync();
    this.window.hide();
  }

  restore(): void {
    if (this.window.isDestroyed()) return;
    if (this.window.isMinimized()) this.window.restore();
    this.window.show();
    this.window.focus();
  }

  sync(): void {
    if (!this.tray) return;
    const ru = this.locale() === 'ru';
    this.tray.setContextMenu(Menu.buildFromTemplate([
      { label: ru ? 'Показать приложение' : 'Show app', click: () => this.restore() },
      { type: 'separator' },
      { label: ru ? 'Выйти из приложения' : 'Exit app', click: () => app.quit() },
    ]));
  }
}
