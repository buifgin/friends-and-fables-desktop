import { contextBridge, ipcRenderer } from 'electron';
import type { AppearanceSettings } from './themes';

// This preload is used only by the bundled appearance window, never by the site.
contextBridge.exposeInMainWorld('appearance', {
  get: (): Promise<AppearanceSettings> => ipcRenderer.invoke('appearance:get'),
  save: (settings: AppearanceSettings): Promise<AppearanceSettings> =>
    ipcRenderer.invoke('appearance:save', settings),
});
