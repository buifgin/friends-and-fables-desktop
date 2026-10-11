import { ipcMain, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent, Rectangle } from 'electron';
import path from 'node:path';
import type { AppearanceManager } from '../appearance/appearance';
import type { TranslationManager } from '../translation/translation';
import type { HostInstructionsManager } from '../commands/host-instructions';
import { configureFullscreenShortcuts } from '../shell/window-shortcuts';
import { settingsSection } from './settings-core';
import type { SettingsSection } from './settings-core';
import type { GeneralSettings } from './general-settings';
import { themeBackground } from '../appearance/themes';
export const SETTINGS_HUB_URL='fables-desktop://settings/settings-hub.html';
export interface CampaignSettingsAdapter { show(bounds: Rectangle): void | Promise<void>; hide(): void; }
export interface SettingsManagers { translation: TranslationManager; instructions: HostInstructionsManager; campaign?: CampaignSettingsAdapter; }
// Navigation has no feature bridge. Each editor retains its own manager, preload,
// exact URL and main-frame authorization; hidden editors are never reloaded.
export class SettingsHub {
 readonly view: WebContentsView;
 private editors = new Map<SettingsSection,{view:WebContentsView;ready:Promise<void>}>();
 private section:SettingsSection='appearance';
 private visible=false;
 private revision=0;
 private managers?:SettingsManagers;
 private ready:Promise<void>;
 private bounds?:Rectangle;
 constructor(private window:BrowserWindow,private appearance:AppearanceManager,private general:GeneralSettings,private close:()=>void,private generalChanged:()=>void,private navigate:(section:SettingsSection)=>Promise<void>) {
  this.view=new WebContentsView({webPreferences:{partition:'fables-appearance',preload:path.join(__dirname,'settings-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
  window.contentView.addChildView(this.view);this.view.setVisible(false);
  const contents=this.view.webContents;
  contents.on('will-navigate',event=>event.preventDefault());contents.on('will-redirect',event=>event.preventDefault());contents.setWindowOpenHandler(()=>({action:'deny'}));
  configureFullscreenShortcuts(contents,window);
  this.ready=contents.loadURL(SETTINGS_HUB_URL);
  ipcMain.handle('settings-hub:get',event=>{this.assertTrusted(event);return this.state();});
  ipcMain.handle('settings-hub:select',(event,section:unknown)=>{this.assertTrusted(event);return this.navigate(settingsSection(section));});
  ipcMain.handle('settings-hub:close',event=>{this.assertTrusted(event);this.close();});
  ipcMain.handle('settings-hub:general',async(event,value:unknown)=>{this.assertTrusted(event);await this.general.save(value);this.generalChanged();this.update();return this.state();});
  window.on('closed',()=>{this.revision++;for(const method of ['get','select','close','general'])ipcMain.removeHandler(`settings-hub:${method}`);for(const editor of this.editors.values())if(!editor.view.webContents.isDestroyed())editor.view.webContents.close();if(!contents.isDestroyed())contents.close();});
 }
 configure(managers:SettingsManagers):void {this.managers=managers; managers.translation.setSettingsOpener(()=>this.navigate('translation'));managers.instructions.setSettingsOpener(()=>this.navigate('instructions'));this.update();}
 private assertTrusted(event:IpcMainInvokeEvent):void {if(event.sender!==this.view.webContents||event.senderFrame!==event.sender.mainFrame||event.senderFrame.origin!=='fables-desktop://settings'||event.senderFrame.url!==SETTINGS_HUB_URL)throw new Error('Settings navigation is available only in the app settings panel.');}
 private state(){const {preset,customColor}=this.appearance.getSettings();return {section:this.section,locale:this.appearance.getLocale(),theme:{preset,customColor},campaignAvailable:!!this.managers?.campaign,hideDesktopTopbarInFullscreen:this.general.hideDesktopTopbarInFullscreen};}
 currentSection():SettingsSection{return this.section;}
 update():void {if(!this.view.webContents.isDestroyed()){this.view.setBackgroundColor(themeBackground(this.appearance.getSettings()));this.view.webContents.send('settings-hub:update',this.state());}}
 async select(section:SettingsSection):Promise<void> {
  if(section==='campaign'&&!this.managers?.campaign)throw new Error('Campaign settings are not connected.');
  const revision=++this.revision;
  await this.ready;
  let editor=this.editors.get(section);
  if(!editor&&['appearance','translation','instructions'].includes(section)) {
   const view=section==='appearance'?this.appearance.createPanel(this.window):section==='translation'?this.managers?.translation.createPanel(this.window,this.close):this.managers?.instructions.createPanel(this.window,this.close);
   if(!view)throw new Error('Settings editor is not connected.');
   view.setVisible(false);this.window.contentView.addChildView(view);
   const url=section==='appearance'?'fables-desktop://settings/':section==='translation'?'fables-desktop://settings/translation.html':'fables-desktop://settings/host-instructions.html';
   editor={view,ready:view.webContents.loadURL(url)};this.editors.set(section,editor);
  }
  await editor?.ready;
  if(this.window.isDestroyed()||revision!==this.revision)return;
  this.managers?.campaign?.hide();this.section=section;this.visible=true;this.update();
  if(this.bounds)this.layout(this.bounds);
  (editor?.view.webContents??this.view.webContents).focus();
 }
 setVisible(visible:boolean):void {if(!visible){this.revision++;this.managers?.campaign?.hide();}this.visible=visible;this.view.setVisible(visible);for(const [section,editor]of this.editors)editor.view.setVisible(visible&&section===this.section);}
 layout(bounds:Rectangle):void {
  this.bounds=bounds;this.view.setBounds(this.section==='campaign'?{...bounds,width:Math.min(126,bounds.width)}:bounds);this.view.setVisible(this.visible);
  const navWidth=Math.min(126,bounds.width);
  const editorBounds={x:bounds.x+navWidth,y:bounds.y,width:Math.max(0,bounds.width-navWidth),height:bounds.height};
  for(const [section,editor]of this.editors){editor.view.setBounds(editorBounds);editor.view.setVisible(this.visible&&section===this.section);}
  if(this.visible&&this.section==='campaign')void Promise.resolve(this.managers?.campaign?.show(editorBounds)).catch(console.error);
 }
}
