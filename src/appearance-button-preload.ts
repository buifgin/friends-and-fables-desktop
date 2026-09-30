import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('appearanceButton', {
  get: () => ipcRenderer.invoke('appearance-dock:get'),
  toggle: () => ipcRenderer.invoke('appearance-dock:toggle'),
  onChange: (callback: (state: unknown) => void) => { ipcRenderer.on('appearance-dock:update', (_event, state: unknown) => callback(state)); },
});
