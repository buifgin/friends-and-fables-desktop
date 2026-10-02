import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('appearanceButton', {
  popup: (open: boolean) => ipcRenderer.invoke('appearance-dock:popup',open),
  getMusic: () => ipcRenderer.invoke('music:toolbar-get'),
  control: (command: string,value?: number) => ipcRenderer.invoke('music:control',command,value),
  onPopupClose: (callback: () => void) => { ipcRenderer.on('appearance-dock:popup-close', callback); },
  onMusic: (callback: (state: unknown) => void) => { ipcRenderer.on('music:toolbar-update',(_event,state: unknown) => callback(state)); },
  get: () => ipcRenderer.invoke('appearance-dock:get'),
  toggle: () => ipcRenderer.invoke('appearance-dock:toggle'),
  onChange: (callback: (state: unknown) => void) => { ipcRenderer.on('appearance-dock:update', (_event, state: unknown) => callback(state)); },
});
