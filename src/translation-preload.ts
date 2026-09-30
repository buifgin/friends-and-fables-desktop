import { contextBridge, ipcRenderer } from 'electron';
import type { TranslationSettings } from './translation-core';

// Available only in the bundled local settings window.
contextBridge.exposeInMainWorld('translation', {
  get: (): Promise<TranslationSettings & { cacheEntries: number }> => ipcRenderer.invoke('translation:get'),
  save: (value: TranslationSettings): Promise<TranslationSettings & { cacheEntries: number }> => ipcRenderer.invoke('translation:save', value),
  check: (): Promise<{ available: boolean; message: string }> => ipcRenderer.invoke('translation:check'),
  clearCache: (): Promise<TranslationSettings & { cacheEntries: number }> => ipcRenderer.invoke('translation:clear-cache'),
  onChange: (callback: (settings: TranslationSettings & { cacheEntries: number }) => void): void => {
    ipcRenderer.on('translation:changed', (_event, settings) => callback(settings));
  },
});
