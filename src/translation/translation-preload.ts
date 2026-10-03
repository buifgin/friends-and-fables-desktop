import { contextBridge, ipcRenderer } from 'electron';
import type { TranslationSettings } from './translation-core';
import type { TranslationState } from './translation';

// Available only in the bundled local settings window.
contextBridge.exposeInMainWorld('translation', {
  close: (): Promise<void> => ipcRenderer.invoke('translation:close'),
  get: (): Promise<TranslationState> => ipcRenderer.invoke('translation:get'),
  save: (value: TranslationSettings): Promise<TranslationState> => ipcRenderer.invoke('translation:save', value),
  check: (): Promise<{ available: boolean; message: string }> => ipcRenderer.invoke('translation:check'),
  clearCache: (): Promise<TranslationState> => ipcRenderer.invoke('translation:clear-cache'),
  onTheme: (callback: (theme: TranslationState['theme']) => void): void => {
    ipcRenderer.on('translation:theme', (_event, theme: TranslationState['theme']) => callback(theme));
  },
  onChange: (callback: (settings: TranslationState) => void): void => {
    ipcRenderer.on('translation:changed', (_event, settings: TranslationState) => callback(settings));
  },
});
