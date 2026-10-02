import { contextBridge, ipcRenderer } from 'electron';

// Only the bundled menu page gets this API; website content has no preload.
contextBridge.exposeInMainWorld('desktopMenu', {
  open: (id: string, x: number): Promise<void> => ipcRenderer.invoke('desktop-menu:open', id, x),
  close: (): Promise<void> => ipcRenderer.invoke('desktop-menu:close'),
  choose: (index: number): Promise<void> => ipcRenderer.invoke('desktop-menu:choose', index),
  getLabels: (): Promise<unknown> => ipcRenderer.invoke('desktop-menu:labels'),
  onLabels: (callback: (state: unknown) => void): void => {
    ipcRenderer.on('desktop-menu:labels', (_event, state: unknown) => callback(state));
  },
  onShow: (callback: (menu: unknown) => void): void => {
    ipcRenderer.on('desktop-menu:show', (_event, menu: unknown) => callback(menu));
  },
  onHide: (callback: () => void): void => { ipcRenderer.on('desktop-menu:hide', () => callback()); },
});
