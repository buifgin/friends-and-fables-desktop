import { contextBridge, ipcRenderer } from 'electron';
import type { MusicSettings } from './music-settings';

contextBridge.exposeInMainWorld('music', {
  get: (): Promise<unknown> => ipcRenderer.invoke('music:get'),
  save: (settings: MusicSettings): Promise<unknown> => ipcRenderer.invoke('music:save',settings),
  copyLink: (id: string): Promise<void> => ipcRenderer.invoke('music:copy-link',id),
  copyAttribution:(id:string):Promise<void>=>ipcRenderer.invoke('music:copy-attribution',id),
  openCatalogLink:(id:string,kind:'source'|'license'):Promise<void>=>ipcRenderer.invoke('music:open-catalog-link',id,kind),
  onInterface: (callback: (state: unknown) => void): void => { ipcRenderer.on('music:interface',(_event,state: unknown) => callback(state)); },
});
