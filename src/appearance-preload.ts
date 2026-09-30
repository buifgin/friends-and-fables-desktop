import { contextBridge, ipcRenderer } from 'electron';
import type { AppearanceSettings, AppearanceState } from './themes';
import type { ImportedBackground } from './backgrounds';

// This preload is used only by the bundled appearance window, never by the site.
contextBridge.exposeInMainWorld('appearance', {
  get: (): Promise<AppearanceState> => ipcRenderer.invoke('appearance:get'),
  importImage: (): Promise<ImportedBackground | null> => ipcRenderer.invoke('appearance:import-image'),
  save: (settings: AppearanceSettings): Promise<AppearanceState> =>
    ipcRenderer.invoke('appearance:save', settings),
});
