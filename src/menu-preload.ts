import { contextBridge, ipcRenderer } from 'electron';

// Only the bundled menu page gets this API; website content has no preload.
contextBridge.exposeInMainWorld('desktopMenu', {
  open: (id: string, x: number): Promise<void> => ipcRenderer.invoke('desktop-menu:open', id, x),
});
