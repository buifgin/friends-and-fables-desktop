import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('settingsHub', {
 get:()=>ipcRenderer.invoke('settings-hub:get'), select:(section:string)=>ipcRenderer.invoke('settings-hub:select',section),
 close:()=>ipcRenderer.invoke('settings-hub:close'), saveGeneral:(hide:boolean)=>ipcRenderer.invoke('settings-hub:general',hide),
 getCombat:()=>ipcRenderer.invoke('settings-hub:combat-get'), saveCombat:(value:unknown)=>ipcRenderer.invoke('settings-hub:combat-save',value),
 onChange:(callback:(state:unknown)=>void)=>ipcRenderer.on('settings-hub:update',(_event,state:unknown)=>callback(state)),
});
