import { ipcMain, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent, KeyboardEvent, Menu, MenuItem, WebContents } from 'electron';
import path from 'node:path';
import { configureFullscreenShortcuts } from './window-shortcuts';

export const MENU_HEIGHT = 32;
export const MENU_URL = 'fables-desktop://settings/menu.html';

export class LinuxMenuBar {
  private black = true;
  private overlay: WebContentsView;
  private ready: Promise<void>;
  private active: string | null = null;
  private revision = 0;

  constructor(private window: BrowserWindow, private website: WebContentsView, private menu: Menu, private onInsetChange?: (inset: number) => void) {
    this.overlay = new WebContentsView({ webPreferences: {
      partition: 'fables-appearance', preload: path.join(__dirname, 'menu-preload.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true,
    } });
    this.overlay.setBackgroundColor('#00000000');
    this.overlay.setVisible(false);
    window.contentView.addChildView(this.overlay);
    const contents = this.overlay.webContents;
    contents.on('will-navigate', event => event.preventDefault());
    contents.on('will-redirect', event => event.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    configureFullscreenShortcuts(contents, window);
    this.ready = contents.loadURL(MENU_URL);
    void this.ready.catch(console.error);
    ipcMain.handle('desktop-menu:open', (event, id: unknown, x: unknown) => {
      this.assertTrusted(event);
      if (typeof id !== 'string' || typeof x !== 'number' || !Number.isFinite(x)) throw new Error('Invalid menu request.');
      return this.open(id, x);
    });
    ipcMain.handle('desktop-menu:close', event => { this.assertTrusted(event); this.close(); });
    ipcMain.handle('desktop-menu:choose', (event, index: unknown) => {
      this.assertTrusted(event);
      if (event.sender !== contents || !this.active || !Number.isInteger(index)) throw new Error('Invalid menu command.');
      const item = this.menu.getMenuItemById(this.active)?.submenu?.items[index as number];
      if (!item?.visible || !item.enabled || item.type === 'separator' || item.submenu) throw new Error('Unavailable menu command.');
      this.close();
      this.invoke(item);
    });
    window.on('resize', () => this.resize());
    window.on('enter-full-screen', () => this.resize());
    window.on('leave-full-screen', () => this.resize());
    window.on('blur', () => this.close(false));
    window.on('closed', () => {
      this.revision++;
      for (const method of ['open', 'close', 'choose']) ipcMain.removeHandler(`desktop-menu:${method}`);
      if (!contents.isDestroyed()) contents.close();
    });
    website.webContents.on('before-input-event', (event, input) => {
      if (!this.black || input.type !== 'keyDown') return;
      const menus: Record<string, string> = { KeyF: 'file', KeyE: 'edit', KeyA: 'appearance', KeyT: 'translation', KeyV: 'view', KeyW: 'window' };
      if (input.alt && !input.control && menus[input.code]) {
        event.preventDefault(); void this.open(menus[input.code], 0).catch(console.error); return;
      }
      // Removing a native menu also removes its accelerator registration.
      // Dispatch remaining commands by the same menu IDs so both paths agree.
      const command = input.code === 'F5' ? (input.control ? 'force-reload' : 'reload')
        : input.code === 'F12' ? 'devtools'
        : input.control && !input.alt && input.code === 'KeyR' ? (input.shift ? 'force-reload' : 'reload')
        : input.control && input.shift && input.code === 'KeyI' ? 'devtools'
        : input.control && input.code === 'Home' ? 'home'
        : input.control && input.code === 'KeyQ' ? 'quit'
        : input.control && input.code === 'KeyW' ? 'close-window' : undefined;
      if (command) {
        event.preventDefault();
        const item = this.menu.getMenuItemById(command);
        if (item) this.invoke(item);
      }
    });
  }

  setBlack(black: boolean): void {
    this.close(false);
    this.black = black;
    this.window.setMenu(black ? null : this.menu);
    this.resize();
  }

  resize(): void {
    this.close(false);
    const [width, height] = this.window.getContentSize();
    const inset = this.black ? MENU_HEIGHT : 0;
    if (this.onInsetChange) this.onInsetChange(inset);
    else this.website.setBounds({ x: 0, y: inset, width, height: Math.max(0, height - inset) });
    this.overlay.setBounds({ x: 0, y: 0, width, height });
  }

  private assertTrusted(event: IpcMainInvokeEvent): void {
    if ((event.sender !== this.window.webContents && event.sender !== this.overlay.webContents)
      || event.senderFrame !== event.sender.mainFrame || event.senderFrame.origin !== 'fables-desktop://settings'
      || event.senderFrame.url !== MENU_URL) throw new Error('Menu controls are available only in the app menu bar.');
  }

  private invoke(item: MenuItem): void {
    // Electron wraps menu callbacks in a dispatcher that also executes roles.
    // Give it the website as the edit target after restoring its focus.
    const dispatch = item.click as unknown as (event: KeyboardEvent, window: BrowserWindow, contents: WebContents) => void;
    dispatch({}, this.window, this.website.webContents);
  }

  private close(focus = true): void {
    this.revision++;
    this.active = null;
    this.overlay.setVisible(false);
    if (!this.overlay.webContents.isDestroyed()) this.overlay.webContents.send('desktop-menu:hide');
    if (focus && !this.website.webContents.isDestroyed()) this.website.webContents.focus();
  }

  private async open(id: string, x: number): Promise<void> {
    const submenu = this.menu.getMenuItemById(id)?.submenu;
    if (!this.black || !submenu || this.website.webContents.isDestroyed()) return;
    if (this.active === id) { this.close(); return; }
    const revision = ++this.revision;
    await this.ready;
    if (revision !== this.revision || this.window.isDestroyed()) return;
    this.active = id;
    this.window.contentView.addChildView(this.overlay);
    this.overlay.setVisible(true);
    this.overlay.webContents.send('desktop-menu:show', {
      id, x: Math.round(Math.max(0, Math.min(this.window.getContentSize()[0], x))),
      items: submenu.items.flatMap((item, index) => item.visible ? [{ index, label: item.label,
        accelerator: item.accelerator?.replace(/CmdOrCtrl|CommandOrControl/g, 'Ctrl') ?? '',
        separator: item.type === 'separator', enabled: item.enabled && !item.submenu, checked: item.checked,
      }] : []),
    });
    this.overlay.webContents.focus();
  }
}
