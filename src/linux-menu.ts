import { ipcMain } from 'electron';
import type { BrowserWindow, Menu, WebContentsView } from 'electron';

export const MENU_HEIGHT = 32;
export const MENU_URL = 'fables-desktop://settings/menu.html';

export class LinuxMenuBar {
  private black = true;

  constructor(private window: BrowserWindow, private website: WebContentsView, private menu: Menu) {
    ipcMain.handle('desktop-menu:open', (event, id: unknown, x: unknown) => {
      if (event.sender !== window.webContents || event.senderFrame !== event.sender.mainFrame
        || event.senderFrame.origin !== 'fables-desktop://settings' || event.senderFrame.url !== MENU_URL) {
        throw new Error('Menu controls are available only in the app menu bar.');
      }
      if (typeof id !== 'string' || typeof x !== 'number' || !Number.isFinite(x)) throw new Error('Invalid menu request.');
      this.open(id, x);
    });
    window.on('resize', () => this.resize());
    window.on('closed', () => ipcMain.removeHandler('desktop-menu:open'));
    website.webContents.on('before-input-event', (event, input) => {
      if (!this.black || input.type !== 'keyDown') return;
      const menus: Record<string, string> = { KeyF: 'file', KeyE: 'edit', KeyA: 'appearance', KeyV: 'view', KeyW: 'window' };
      if (input.alt && !input.control && menus[input.code]) {
        event.preventDefault(); this.open(menus[input.code], 0); return;
      }
      // Removing a native menu also removes its accelerator registration.
      // Dispatch remaining commands by the same menu IDs so both paths agree.
      const command = input.code === 'F5' ? (input.control ? 'force-reload' : 'reload')
        : input.code === 'F12' ? 'devtools'
        : input.code === 'F11' ? 'fullscreen'
        : input.control && !input.alt && input.code === 'KeyR' ? (input.shift ? 'force-reload' : 'reload')
        : input.control && input.shift && input.code === 'KeyI' ? 'devtools'
        : input.control && input.code === 'Home' ? 'home'
        : input.control && input.code === 'KeyQ' ? 'quit'
        : input.control && input.code === 'KeyW' ? 'close-window' : undefined;
      if (command) {
        event.preventDefault();
        const item = this.menu.getMenuItemById(command);
        item?.click(item, this.window, input);
      }
    });
  }

  setBlack(black: boolean): void {
    this.black = black;
    this.window.setMenu(black ? null : this.menu);
    this.resize();
  }

  resize(): void {
    const [width, height] = this.window.getContentSize();
    const inset = this.black ? MENU_HEIGHT : 0;
    this.website.setBounds({ x: 0, y: inset, width, height: Math.max(0, height - inset) });
  }

  private open(id: string, x: number): void {
    const submenu = this.menu.getMenuItemById(id)?.submenu;
    if (!submenu || this.website.webContents.isDestroyed()) return;
    this.website.webContents.focus();
    submenu.popup({ window: this.window, frame: this.website.webContents.mainFrame,
      x: Math.round(Math.max(0, Math.min(this.window.getContentSize()[0], x))), y: MENU_HEIGHT,
      callback: () => { if (!this.website.webContents.isDestroyed()) this.website.webContents.focus(); },
    });
  }
}
