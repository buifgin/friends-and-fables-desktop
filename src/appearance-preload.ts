import { contextBridge, ipcRenderer } from 'electron';
import type { AppearanceSettings, AppearanceState } from './themes';
import type { ImportedBackground } from './backgrounds';
import type { BackgroundPage } from './backgrounds';
import type { FolderPage } from './image-folder';

// Used only by the bundled Appearance window and embedded editor, never by the site.
contextBridge.exposeInMainWorld('appearance', {
  closePanel: (): Promise<void> => ipcRenderer.invoke('appearance:close-panel'),
  resizePanel: (width: number, finish = false): Promise<number> => ipcRenderer.invoke('appearance:resize-panel', width, finish),
  onInterface: (callback: (state: unknown) => void): void => { ipcRenderer.on('appearance:interface', (_event, state: unknown) => callback(state)); },
  onSettings: (callback: (state: AppearanceState) => void): void => { ipcRenderer.on('appearance:settings', (_event, state: AppearanceState) => callback(state)); },
  get: (): Promise<AppearanceState> => ipcRenderer.invoke('appearance:get'),
  importImage: (): Promise<ImportedBackground | null> => ipcRenderer.invoke('appearance:import-image'),
  pictures: (offset = 0): Promise<BackgroundPage> => ipcRenderer.invoke('appearance:pictures',offset),
  selectPicture: (id: string): Promise<ImportedBackground> => ipcRenderer.invoke('appearance:select-picture',id),
  folderPictures: (offset = 0): Promise<FolderPage> => ipcRenderer.invoke('appearance:folder-pictures',offset),
  chooseFolder: (): Promise<FolderPage | null> => ipcRenderer.invoke('appearance:choose-folder'),
  selectFolderPicture: (id: string): Promise<ImportedBackground> => ipcRenderer.invoke('appearance:select-folder-picture',id),
  reset: (settings: AppearanceSettings): Promise<AppearanceState> => ipcRenderer.invoke('appearance:reset',settings),
  undoReset: (): Promise<AppearanceState> => ipcRenderer.invoke('appearance:undo-reset'),
  exportTheme: (settings: AppearanceSettings, includePicture: boolean): Promise<boolean> => ipcRenderer.invoke('appearance:export-theme',settings,includePicture),
  importTheme: (): Promise<AppearanceState | null> => ipcRenderer.invoke('appearance:import-theme'),
  save: (settings: AppearanceSettings): Promise<AppearanceState> =>
    ipcRenderer.invoke('appearance:save', settings),
});
