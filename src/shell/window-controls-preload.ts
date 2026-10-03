import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('windowControls', {
  get: () => ipcRenderer.invoke('window-controls:get'),
  action: (action: string) => ipcRenderer.invoke('window-controls:action', action),
  onChange: (callback: (state: unknown) => void) => { ipcRenderer.on('window-controls:update', (_event, state: unknown) => callback(state)); },
});
