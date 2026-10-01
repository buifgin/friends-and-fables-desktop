import { app, BrowserWindow, ipcMain } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_HOST_INSTRUCTIONS, HOST_INSTRUCTIONS_URL, validateHostInstructions } from './host-instructions-core';
import type { HostInstructions } from './host-instructions-core';
import { DEFAULT_APPEARANCE, themeBackground } from './themes';
import type { AppearanceSettings } from './themes';

export class HostInstructionsManager {
  private settings=structuredClone(DEFAULT_HOST_INSTRUCTIONS);
  private window:BrowserWindow|null=null;
  private loading:Promise<void>|undefined;
  private file:string;
  private writes:Promise<void>=Promise.resolve();
  private locale:'en'|'ru'='en';
  private theme={preset:DEFAULT_APPEARANCE.preset,customColor:DEFAULT_APPEARANCE.customColor};
  onChange:((settings:HostInstructions)=>Promise<void>)|undefined;
  constructor(folder=app.getPath('userData')){this.file=path.join(folder,'host-instructions.json');}
  async initialize():Promise<void>{
    try{const stored=JSON.parse(await readFile(this.file,'utf8'));this.settings=validateHostInstructions(stored,stored.configured===true);}catch{/* Start disabled when preferences are missing or invalid. */}
    ipcMain.handle('host-instructions:get',async event=>{this.assertTrusted(event);await this.writes.catch(()=>{});return this.state();});
    ipcMain.handle('host-instructions:save',async(event,value:unknown)=>{this.assertTrusted(event);await this.save(value);return this.state();});
  }
  private assertTrusted(event:IpcMainInvokeEvent):void{
    if(event.sender!==this.window?.webContents || event.senderFrame!==event.sender.mainFrame || event.senderFrame.url!==HOST_INSTRUCTIONS_URL)throw new Error('Instructions are available only in the app settings window.');
  }
  getSettings():HostInstructions{return structuredClone(this.settings);}
  private state(){return {settings:this.getSettings(),locale:this.locale,theme:{...this.theme}};}
  save(value:unknown):Promise<void>{
    this.writes=this.writes.catch(()=>{}).then(async()=>{
      const next=validateHostInstructions(value,this.settings.configured);
      await mkdir(path.dirname(this.file),{recursive:true});await writeFile(`${this.file}.tmp`,`${JSON.stringify(next,null,2)}\n`,'utf8');await rename(`${this.file}.tmp`,this.file);
      this.settings=next;await this.onChange?.(this.getSettings());
    });return this.writes;
  }
  setInterface(settings:AppearanceSettings,locale:'en'|'ru'):void{
    this.theme={preset:settings.preset,customColor:settings.customColor};this.locale=locale;
    if(this.window&&!this.window.isDestroyed()){this.window.setBackgroundColor(themeBackground(this.theme));this.window.webContents.send('host-instructions:interface',this.state());}
  }
  handleOpenRequest(contents:WebContents,parent:BrowserWindow,url:string):boolean{
    if(url!==HOST_INSTRUCTIONS_URL || new URL(contents.getURL()).origin!=='https://play.fables.gg')return false;
    void this.open(parent).catch(console.error);return true;
  }
  async open(parent:BrowserWindow):Promise<BrowserWindow>{
    if(this.window&&!this.window.isDestroyed()){
      const existing=this.window;await this.loading;if(existing.isDestroyed()||this.window!==existing)return this.open(parent);existing.show();existing.focus();return existing;
    }
    const window=new BrowserWindow({parent,width:650,height:790,minWidth:500,minHeight:600,autoHideMenuBar:true,backgroundColor:themeBackground(this.theme),
      webPreferences:{partition:'fables-appearance',preload:path.join(__dirname,'host-instructions-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
    this.window=window;window.setMenu(null);
    window.webContents.on('will-navigate',event=>event.preventDefault());window.webContents.on('will-redirect',event=>event.preventDefault());window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    const closed=()=>{if(this.window===window){this.window=null;this.loading=undefined;}};window.on('close',closed);window.on('closed',closed);
    this.loading=window.loadURL(HOST_INSTRUCTIONS_URL);await this.loading;return window;
  }
  async shutdown():Promise<void>{this.window?.destroy();await this.writes.catch(()=>{});for(const name of ['get','save'])ipcMain.removeHandler(`host-instructions:${name}`);}
}
