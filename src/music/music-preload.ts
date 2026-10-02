import { contextBridge, ipcRenderer } from 'electron';
import type { MusicSettings } from './music-settings';

contextBridge.exposeInMainWorld('music', {
  hide: (): Promise<void> => ipcRenderer.invoke('music:hide'),
  chooseFolder: (): Promise<unknown> => ipcRenderer.invoke('music:choose-folder'),
  refreshFolders: (): Promise<unknown> => ipcRenderer.invoke('music:refresh-folders'),
  removeFolder: (id: string): Promise<unknown> => ipcRenderer.invoke('music:remove-folder',id),
  reportPlayback: (status: {paused:boolean;selected:string|null}): Promise<void> => ipcRenderer.invoke('music:playback',status),
  onControl: (callback: (command: string,value: unknown) => void): void => { ipcRenderer.on('music:control',(_event,command: string,value: unknown) => callback(command,value)); },
  onLibrary: (callback: (state: unknown) => void): void => { ipcRenderer.on('music:library',(_event,state: unknown) => callback(state)); },
  get: (): Promise<unknown> => ipcRenderer.invoke('music:get'),
  save: (settings: MusicSettings): Promise<unknown> => ipcRenderer.invoke('music:save',settings),
  copyLink: (id: string): Promise<void> => ipcRenderer.invoke('music:copy-link',id),
  copyAttribution:(id:string):Promise<void>=>ipcRenderer.invoke('music:copy-attribution',id),
  openCatalogLink:(id:string,kind:'source'|'license'):Promise<void>=>ipcRenderer.invoke('music:open-catalog-link',id,kind),
  onInterface: (callback: (state: unknown) => void): void => { ipcRenderer.on('music:interface',(_event,state: unknown) => callback(state)); },
});
