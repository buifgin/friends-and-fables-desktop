import { ipcMain, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent, Rectangle } from 'electron';
import path from 'node:path';
import type { AppearanceManager } from '../appearance/appearance';
import type { TranslationManager } from '../translation/translation';
import type { HostInstructionsManager } from '../commands/host-instructions';
import { configureFullscreenShortcuts } from '../shell/window-shortcuts';
import { settingsSection, combatPreferences } from './settings-core';
import type { SettingsSection, CombatPreferences, CombatSettingsAdapter } from './settings-core';
import type { GeneralSettings } from './general-settings';
import { themeBackground } from '../appearance/themes';
export const SETTINGS_HUB_URL='fables-desktop://settings/settings-hub.html';
export interface CampaignSettingsAdapter { show(bounds: Rectangle): void | Promise<void>; suspend(bounds:Rectangle): void; hide(): void; }
export interface SettingsManagers { translation: TranslationManager; instructions: HostInstructionsManager; campaign?: CampaignSettingsAdapter; combat?: CombatSettingsAdapter; }
// Navigation has no feature bridge. Each editor retains its own manager, preload,
// exact URL and main-frame authorization; hidden editors are never reloaded.
export class SettingsHub {
 readonly view: WebContentsView;
 private editors = new Map<SettingsSection,{view:WebContentsView;ready:Promise<void>;document:number}>();
 private section:SettingsSection='appearance';
 private visible=false;
 private revision=0;
 private renderRevision=0;
 private document=0;
 private preparing?:{section:SettingsSection;revision:number;view:WebContentsView;url:string;paintBounds?:Rectangle;paintEditor?:boolean;restoreThrottling?:()=>void;expected?:{locale:'en'|'ru';preset:string;customColor:string}};
 private managers?:SettingsManagers;
 private ready:Promise<void>;
 private bounds?:Rectangle;
 private combat:CombatPreferences|null=null;
 private combatRevision=0;
 private campaignAvailable?:boolean;
 private campaignBounds?:Rectangle;
 private campaignRetained=false;
 constructor(private window:BrowserWindow,private appearance:AppearanceManager,private general:GeneralSettings,private close:()=>void,private generalChanged:()=>void,private navigate:(section:SettingsSection)=>Promise<void>) {
  this.view=new WebContentsView({webPreferences:{partition:'fables-appearance',preload:path.join(__dirname,'settings-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
  window.contentView.addChildView(this.view);this.view.setVisible(false);
  const contents=this.view.webContents;
  contents.on('will-navigate',event=>event.preventDefault());contents.on('will-redirect',event=>event.preventDefault());contents.setWindowOpenHandler(()=>({action:'deny'}));
  contents.on('did-navigate',()=>{this.document++;this.cancelPreparation();});
  contents.on('destroyed',()=>{this.revision++;this.cancelPreparation();});
  configureFullscreenShortcuts(contents,window);
  this.ready=contents.loadURL(SETTINGS_HUB_URL);
  ipcMain.handle('settings-hub:get',event=>{this.assertTrusted(event);return this.state();});
  ipcMain.handle('settings-hub:select',(event,section:unknown)=>{this.assertTrusted(event);return this.navigate(settingsSection(section));});
  ipcMain.handle('settings-hub:close',event=>{this.assertTrusted(event);this.close();});
  ipcMain.handle('settings-hub:general',async(event,value:unknown)=>{this.assertTrusted(event);await this.general.save(value);this.generalChanged();this.update();return this.state();});
  ipcMain.handle('settings-hub:combat-get',async event=>{this.assertTrusted(event);return this.refreshCombat();});
  ipcMain.handle('settings-hub:combat-save',async(event,value:unknown)=>{
   this.assertTrusted(event);const prefs=combatPreferences(value),adapter=this.managers?.combat;
   if(!adapter)throw new Error('Combat settings are not connected.');
   const current=await adapter.get();
   if(!current||combatPreferences(current).campaignId!==prefs.campaignId)throw new Error('Combat campaign changed. Refresh settings.');
   const saved=await adapter.save(prefs);
   if(!saved||combatPreferences(saved).campaignId!==prefs.campaignId)throw new Error('Combat campaign changed. Refresh settings.');
   return this.refreshCombat();
  });
  window.on('closed',()=>{this.revision++;this.cancelPreparation();for(const method of ['get','select','close','general','combat-get','combat-save'])ipcMain.removeHandler(`settings-hub:${method}`);for(const editor of this.editors.values())if(!editor.view.webContents.isDestroyed())editor.view.webContents.close();if(!contents.isDestroyed())contents.close();});
 }
 configure(managers:SettingsManagers):void {this.managers=managers; managers.translation.setSettingsOpener(()=>this.navigate('translation'));managers.instructions.setSettingsOpener(()=>this.navigate('instructions'));this.update();}
 private assertTrusted(event:IpcMainInvokeEvent):void {if(event.sender!==this.view.webContents||event.senderFrame!==event.sender.mainFrame||event.senderFrame.origin!=='fables-desktop://settings'||event.senderFrame.url!==SETTINGS_HUB_URL)throw new Error('Settings navigation is available only in the app settings panel.');}
 private async refreshCombat():Promise<CombatPreferences|null> {
  const revision=++this.combatRevision;
  const value=await this.managers?.combat?.get()??null;
  const prefs=value===null?null:combatPreferences(value);
  if(revision===this.combatRevision)this.combat=prefs;
  return this.combat;
 }
 setCampaignAvailable(available:boolean):void {
  if(this.campaignAvailable===available)return;
  this.campaignAvailable=available;this.revision++;this.cancelPreparation();
  if(!available){this.combatRevision++;this.combat=null;this.releaseCampaign();}
  this.update();
 }
 private state(){const {preset,customColor}=this.appearance.getSettings();return {section:this.preparing?.view===this.view?this.preparing.section:this.section,renderRevision:this.renderRevision,locale:this.appearance.getLocale(),theme:{preset,customColor},campaignAvailable:!!this.managers?.campaign&&this.campaignAvailable!==false,combat:this.combat,hideDesktopTopbarInFullscreen:this.general.hideDesktopTopbarInFullscreen};}
 currentSection():SettingsSection{return this.section;}
 hasRetainedCampaign():boolean{return this.campaignRetained;}
 private releaseCampaign():void {if(this.campaignRetained)this.managers?.campaign?.hide();this.campaignRetained=false;this.campaignBounds=undefined;}
 private expectedEditor(section:SettingsSection){
  const expected=this.expectedAppearance();
  if(section==='translation'){const settings=this.managers?.translation.getSettings();if(settings)expected.locale=settings.enabled&&!settings.showOriginal?'ru':'en';}
  return expected;
 }
 private expectedAppearance(){const {preset,customColor}=this.appearance.getSettings();return {locale:this.appearance.getLocale(),preset,customColor};}
 update():void {
  if(this.view.webContents.isDestroyed())return;
  this.renderRevision++;this.view.setBackgroundColor(themeBackground(this.appearance.getSettings()));this.view.webContents.send('settings-hub:update',this.state());
  const pending=this.preparing;
  if(pending&&pending.view!==this.view) {
   const contents=pending.view.webContents;pending.expected=this.expectedEditor(pending.section);
   if(!contents.isDestroyed()&&contents.getURL()===pending.url)void contents.executeJavaScript(`(()=>{const wait=window.__friendsFablesSettingsPaintWait;if(wait?.revision===${pending.revision}){wait.expected=${JSON.stringify(pending.expected)};wait.check();}return true})()`).catch(()=>{});
  }
 }
 private cancelPreparation():void {
  const pending=this.preparing;this.preparing=undefined;pending?.restoreThrottling?.();
  if(pending?.paintEditor&&!this.window.isDestroyed()&&!pending.view.webContents.isDestroyed()){pending.view.setVisible(false);this.window.contentView.addChildView(pending.view);}
  const contents=pending?.view.webContents;
  if(!pending||!contents||contents.isDestroyed()||contents.getURL()!==pending.url)return;
  void contents.executeJavaScript(`(()=>{const wait=window.__friendsFablesSettingsPaintWait;if(wait?.revision===${pending.revision})wait.finish(false);return true})()`).catch(()=>{});
 }
 private async rendered(section:SettingsSection,revision:number,view=this.view,url=SETTINGS_HUB_URL,paintBounds?:Rectangle):Promise<boolean> {
  const contents=view.webContents;
  if(contents.isDestroyed()||contents.getURL()!==url||paintBounds&&!view.getVisible())return false;
  const entry=this.editors.get(section),document=view===this.view?this.document:entry?.document;
  const minimum=this.renderRevision,external=view!==this.view,expected=this.expectedEditor(section);
  if(external&&this.preparing?.revision===revision)this.preparing.expected=expected;
  const marker=view===this.view?'data-ff-settings-rendered':section==='appearance'?'data-ff-appearance-rendered':section==='translation'?'data-ff-translation-rendered':'data-ff-instructions-rendered';
  const ready=view===this.view
   ? `const marker=root.getAttribute(${JSON.stringify(marker)})?.split(':');return !!marker&&Number(marker[0])>=${minimum}&&marker[1]===${JSON.stringify(section)}`
   : `try{const marker=JSON.parse(root.getAttribute(${JSON.stringify(marker)})||'null');return !!marker&&marker.locale===wait.expected.locale&&marker.preset===wait.expected.preset&&marker.customColor===wait.expected.customColor}catch{return false}`;
  try {
   // Observe only the exact local renderer's terminal DOM state. Hidden views
   // need no RAF; the committed Campaign remains painted until this resolves.
   const result=await contents.executeJavaScript(`new Promise(resolve=>{
    const root=document.documentElement;let observer,timer,frame,paintFrames=0;
    const wait={revision:${revision},expected:${JSON.stringify(expected)},check:()=>{},finish:value=>{observer?.disconnect();clearTimeout(timer);cancelAnimationFrame(frame);if(window.__friendsFablesSettingsPaintWait===wait)delete window.__friendsFablesSettingsPaintWait;resolve(value&&${external}?{ready:true,...wait.expected}:value)}};
    window.__friendsFablesSettingsPaintWait?.finish(false);window.__friendsFablesSettingsPaintWait=wait;
    const ready=()=>{${ready}};
    ${paintBounds?`const advance=()=>{if(document.visibilityState==='visible'&&window.innerWidth===${paintBounds.width}&&window.innerHeight===${paintBounds.height}&&ready())paintFrames++;else paintFrames=0;if(paintFrames>=2)wait.finish(true);else frame=requestAnimationFrame(advance)};frame=requestAnimationFrame(advance);timer=setTimeout(()=>wait.finish(false),1500);return;`:''}
    wait.check=()=>{if(ready())wait.finish(true)};
    if(ready()){wait.finish(true);return}
    observer=new MutationObserver(()=>{if(ready())wait.finish(true)});
    observer.observe(root,{attributes:true,attributeFilter:[${JSON.stringify(marker)}]});
    timer=setTimeout(()=>wait.finish(false),1500);
   })`);
   const latest=this.expectedEditor(section);
   const accepted=external?result?.ready===true&&result.locale===latest.locale&&result.preset===latest.preset&&result.customColor===latest.customColor:result===true;
   return accepted&&!this.window.isDestroyed()&&!contents.isDestroyed()
    &&contents.getURL()===url&&document===(view===this.view?this.document:entry?.document)&&revision===this.revision;
  } catch { return false; }
 }
 async select(section:SettingsSection,beforeLayout?:()=>void):Promise<void> {
  if(section==='campaign'&&!this.managers?.campaign)throw new Error('Campaign settings are not connected.');
  if((section==='campaign'||section==='combat')&&this.campaignAvailable===false)throw new Error('Campaign settings are not available on this page.');
  const revision=++this.revision;this.cancelPreparation();
  await this.ready;
  let editor=this.editors.get(section);
  if(!editor&&['appearance','translation','instructions'].includes(section)) {
   const view=section==='appearance'?this.appearance.createPanel(this.window):section==='translation'?this.managers?.translation.createPanel(this.window,this.close):this.managers?.instructions.createPanel(this.window,this.close);
   if(!view)throw new Error('Settings editor is not connected.');
   view.setVisible(false);this.window.contentView.addChildView(view);
   const url=section==='appearance'?'fables-desktop://settings/':section==='translation'?'fables-desktop://settings/translation.html':'fables-desktop://settings/host-instructions.html';
   const entry={view,ready:Promise.resolve(),document:0};
   view.webContents.on('did-navigate',()=>{entry.document++;if(this.preparing?.view===view)this.cancelPreparation();});
   editor=entry;entry.ready=view.webContents.loadURL(url);this.editors.set(section,entry);
  }
  await editor?.ready;
  if(section==='combat')await this.refreshCombat();
  if(this.window.isDestroyed()||revision!==this.revision)return;
  if(this.section==='campaign'&&section!=='campaign'&&!editor) {
   this.preparing={section,revision,view:this.view,url:SETTINGS_HUB_URL};this.update();
   let ready=await this.rendered(section,revision);
   if(ready&&this.bounds&&this.view.getVisible()) {
    // Resize the prepared, visible hub while the native Campaign still paints
    // underneath. Its narrow prior surface is not an expanded ready frame.
    if(this.preparing?.revision===revision)this.preparing.paintBounds={...this.bounds};
    this.view.setBounds(this.bounds);
    ready=await this.rendered(section,revision,this.view,SETTINGS_HUB_URL,this.bounds);
   }
   if(this.preparing?.revision===revision)this.preparing=undefined;
   if(!ready){if(revision===this.revision){if(this.bounds)this.layout(this.bounds);this.update();}return;}
  }
  if(editor) {
   const url=section==='appearance'?'fables-desktop://settings/':section==='translation'?'fables-desktop://settings/translation.html':'fables-desktop://settings/host-instructions.html';
   this.preparing={section,revision,view:editor.view,url};
   let ready=await this.rendered(section,revision,editor.view,url);
   if(ready&&section!=='appearance'&&section!==this.section&&this.visible&&this.bounds) {
    // A reused renderer can have a terminal DOM but no current compositor
    // surface. Paint underneath the committed outgoing child before promotion.
    const navWidth=Math.min(126,this.bounds.width),bounds={x:this.bounds.x+navWidth,y:this.bounds.y,width:Math.max(0,this.bounds.width-navWidth),height:this.bounds.height};
    if(this.preparing?.revision===revision){this.preparing.paintBounds={...this.bounds};this.preparing.paintEditor=true;}
    this.window.contentView.removeChildView(editor.view);this.window.contentView.addChildView(editor.view,0);editor.view.setBounds(bounds);editor.view.setVisible(true);
    try {
     const pending=this.preparing,contents=editor.view.webContents;
     if(pending?.revision!==revision)ready=false;
     else {
      // A fully occluded child is backgrounded even though View draws it.
      // Temporarily request painting only for this owned preparation phase.
      const previous=contents.getBackgroundThrottling();let restored=false;
      pending.restoreThrottling=()=>{if(restored)return;restored=true;if(!contents.isDestroyed())contents.setBackgroundThrottling(previous);};
      contents.setBackgroundThrottling(false);
      ready=await this.rendered(section,revision,editor.view,url,bounds);
     }
    } catch { ready=false; }
   }
   if(!ready){if(this.preparing?.revision===revision)this.cancelPreparation();return;}
   if(this.preparing?.revision===revision){if(this.preparing.paintEditor)this.window.contentView.addChildView(editor.view);this.preparing.restoreThrottling?.();this.preparing=undefined;}
  }
  if(this.section!==section&&(this.section==='campaign'||section==='campaign'))this.campaignBounds=undefined;this.section=section;this.visible=true;if(section==='campaign')this.update();
  // The outer dock commits the website strip before the native Campaign
  // adapter measures/mounts its content. Standalone callers need no callback.
  if(section==='campaign')this.campaignRetained=true;
  beforeLayout?.();
  if(this.bounds)this.layout(this.bounds);
  if(section!=='campaign')this.update();
  (editor?.view.webContents??this.view.webContents).focus();
 }
 refreshCampaign():void {if(this.visible&&this.section==='campaign'&&this.bounds){this.campaignBounds=undefined;this.layout(this.bounds);}}
 setVisible(visible:boolean):void {if(!visible){this.revision++;this.cancelPreparation();this.releaseCampaign();}this.visible=visible;this.view.setVisible(visible);for(const [section,editor]of this.editors)editor.view.setVisible(visible&&section===this.section);}
 layout(bounds:Rectangle):void {
  const painting=this.preparing?.paintBounds;
  if(painting&&Object.keys(bounds).some(key=>bounds[key as keyof Rectangle]!==painting[key as keyof Rectangle])){this.revision++;this.cancelPreparation();}
  this.bounds=bounds;this.view.setBounds(this.section==='campaign'&&(!this.preparing?.paintBounds||this.preparing.paintEditor)?{...bounds,width:Math.min(126,bounds.width)}:bounds);this.view.setVisible(this.visible);
  const navWidth=Math.min(126,bounds.width);
  const editorBounds={x:bounds.x+navWidth,y:bounds.y,width:Math.max(0,bounds.width-navWidth),height:bounds.height};
  for(const [section,editor]of this.editors){editor.view.setBounds(editorBounds);editor.view.setVisible(this.visible&&(section===this.section||this.preparing?.paintEditor===true&&this.preparing.view===editor.view));}
  if(this.visible&&this.campaignRetained&&(!this.campaignBounds||Object.keys(editorBounds).some(key=>editorBounds[key as keyof Rectangle]!==this.campaignBounds![key as keyof Rectangle]))) {
   this.campaignRetained=true;
   this.campaignBounds={...editorBounds};
   const adapter=this.managers?.campaign;
   void Promise.resolve(this.section==='campaign'?adapter?.show(editorBounds):adapter?.suspend(editorBounds)).catch(error=>{this.campaignBounds=undefined;console.error(error);});
  }
 }
}
