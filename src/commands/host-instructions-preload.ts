import { contextBridge, ipcRenderer } from 'electron';
import type { HostInstructions } from './host-instructions-core';
contextBridge.exposeInMainWorld('hostInstructions',{
  get:():Promise<unknown>=>ipcRenderer.invoke('host-instructions:get'),
  save:(settings:HostInstructions):Promise<unknown>=>ipcRenderer.invoke('host-instructions:save',settings),
  onInterface:(callback:(state:unknown)=>void):void=>{ipcRenderer.on('host-instructions:interface',(_event,state:unknown)=>callback(state));},
});
