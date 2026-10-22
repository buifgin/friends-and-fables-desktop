import { ipcMain, WebContentsView } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent, Rectangle } from 'electron';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CampaignNavigationModel, CampaignNavDestination } from './campaign-panel';
import type { AppearanceManager } from '../appearance/appearance';
import type { TranslationManager } from '../translation/translation';
import type { HostInstructionsManager } from '../commands/host-instructions';
import { configureFullscreenShortcuts } from '../shell/window-shortcuts';
import { settingsSection, combatPreferences } from './settings-core';
import type { SettingsSection, CombatPreferences, CombatSettingsAdapter } from './settings-core';
import type { GeneralSettings } from './general-settings';
import { themeBackground } from '../appearance/themes';
export const SETTINGS_HUB_URL='fables-desktop://settings/settings-hub.html';
export interface CampaignSettingsAdapter { prepare?(bounds:Rectangle,navigation:CampaignNavigationModel):Promise<boolean>; reveal?(bounds:Rectangle,ticket:string):Promise<boolean>; reserve?(bounds:Rectangle):Promise<boolean>; show(bounds: Rectangle,navigation?:CampaignNavigationModel): void | boolean | Promise<void | boolean>; suspend(bounds:Rectangle): void; hide(): void; }
export interface SettingsManagers { translation: TranslationManager; instructions: HostInstructionsManager; campaign?: CampaignSettingsAdapter; combat?: CombatSettingsAdapter; }
// Navigation has no feature bridge. Each editor retains its own manager, preload,
// exact URL and main-frame authorization; hidden editors are never reloaded.
export class SettingsHub {
 readonly view: WebContentsView;
 private editors = new Map<SettingsSection,{view:WebContentsView;ready:Promise<void>;document:number}>();
 private section:SettingsSection='appearance';
 private lastCommittedSection?:SettingsSection;
 private visible=false;
 private revision=0;
 private renderRevision=0;
 private document=0;
 private preparing?:{staged?:boolean;section:SettingsSection;revision:number;view:WebContentsView;url:string;paintBounds?:Rectangle;paintEditor?:boolean;restoreThrottling?:()=>void;expected?:{locale:'en'|'ru';preset:string;customColor:string}};
 private managers?:SettingsManagers;
 private ready:Promise<void>;
 private bounds?:Rectangle;
 private combat:CombatPreferences|null=null;
 private combatRevision=0;
 private campaignAvailable?:boolean;
 private campaignBounds?:Rectangle;
 private campaignRetained=false;
 private campaignReserved=false;
 private reservationBounds?:Rectangle;
 private preparingReservation?:{revision:number;bounds:Rectangle};
 private preparingCampaign?:{revision:number;bounds:Rectangle;revealing?:boolean};
 private campaignNavigation?:CampaignNavigationModel;
 private campaignNavigationConsumed=false;
 private coherentCampaign():boolean{return !!this.managers?.campaign?.prepare&&!!this.managers.campaign.reveal;}
 canNavigateCampaignSection(destination:CampaignNavDestination,ticket:string):boolean {return !this.campaignNavigationConsumed&&!this.preparing&&(this.preparingCampaign?.revealing===true||this.visible&&this.section==='campaign'&&!this.preparingCampaign)&&this.campaignAvailable!==false&&!!this.campaignNavigation&&this.campaignNavigation.ticket===ticket&&this.campaignNavigation.destinations.includes(destination);}
 consumeCampaignNavigation(destination:CampaignNavDestination,ticket:string):boolean {if(!this.canNavigateCampaignSection(destination,ticket))return false;this.campaignNavigationConsumed=true;
  const pending=this.preparingCampaign;
  if(pending?.revealing){
   // A painted link owns the next operation even if its reveal acknowledgment
   // is still in flight. Keep that genuine presentation as the outgoing section.
   this.revision++;this.preparingCampaign=undefined;this.section='campaign';this.visible=true;this.campaignReserved=true;this.reservationBounds={...pending.bounds};
  }
  return true;}
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
 private state(){const {preset,customColor}=this.appearance.getSettings();return {section:this.preparing&&(this.preparing.view===this.view||this.section==='campaign'&&this.coherentCampaign())?this.preparing.section:this.section,renderRevision:this.renderRevision,locale:this.appearance.getLocale(),theme:{preset,customColor},campaignAvailable:!!this.managers?.campaign&&this.campaignAvailable!==false,combat:this.combat,hideDesktopTopbarInFullscreen:this.general.hideDesktopTopbarInFullscreen};}
 resolveSettingsSection():SettingsSection {
  const remembered=this.lastCommittedSection??this.general.lastSettingsSection;
  const campaign=!!this.managers?.campaign&&this.campaignAvailable!==false;
  if(!remembered)return campaign?'campaign':'general';
  if(remembered==='campaign'&&!campaign||remembered==='combat'&&(!campaign||!this.managers?.combat))return 'general';
  return remembered;
 }
 isVisible():boolean{return this.visible;}
 currentSection():SettingsSection{return this.section;}
 hasRetainedCampaign():boolean{return this.campaignRetained;}
 hasCampaignReservation():boolean{return this.campaignReserved;}
 private releaseCampaign():void {this.campaignNavigation=undefined;if(this.campaignRetained||this.campaignReserved||this.preparingReservation)this.managers?.campaign?.hide();this.campaignRetained=false;this.campaignReserved=false;this.preparingReservation=undefined;this.reservationBounds=undefined;this.campaignBounds=undefined;}
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
  if(this.preparingReservation){this.preparingReservation=undefined;if(!this.campaignReserved)this.managers?.campaign?.hide();}
  if(this.preparing?.staged){this.visible=false;this.view.setVisible(false);for(const editor of this.editors.values())editor.view.setVisible(false);}
  const native=this.preparingCampaign;if(native)this.campaignNavigation=undefined;this.preparingCampaign=undefined;
  if(native){const navWidth=Math.min(126,native.bounds.width);this.managers?.campaign?.suspend({x:native.bounds.x+navWidth,y:native.bounds.y,width:Math.max(0,native.bounds.width-navWidth),height:native.bounds.height});}
  const pending=this.preparing;this.preparing=undefined;pending?.restoreThrottling?.();
  if(this.coherentCampaign()&&this.section==='campaign')this.view.setVisible(false);
  if(pending?.paintEditor&&!this.window.isDestroyed()&&!pending.view.webContents.isDestroyed()){pending.view.setVisible(false);this.window.contentView.addChildView(pending.view);}
  const contents=pending?.view.webContents;
  if(!pending||!contents||contents.isDestroyed()||contents.getURL()!==pending.url)return;
  void contents.executeJavaScript(`(()=>{const wait=window.__friendsFablesSettingsPaintWait;if(wait?.revision===${pending.revision})wait.finish(false);return true})()`).catch(()=>{});
  if(pending.view===this.view&&pending.paintBounds&&!pending.paintEditor&&this.section==='campaign'&&!this.window.isDestroyed()) {
   // A newer cold editor can await its load before any layout runs. Retire the
   // canceled expanded hub now so the committed native Campaign stays painted.
   if(this.bounds)this.view.setBounds({...this.bounds,width:Math.min(126,this.bounds.width)});
   this.update();
  }
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
   if(ready&&this.bounds&&(this.view.getVisible()||this.coherentCampaign())) {
    // Resize the prepared, visible hub while the native Campaign still paints
    // underneath. Its narrow prior surface is not an expanded ready frame.
    if(this.preparing?.revision===revision)this.preparing.paintBounds={...this.bounds};
    this.view.setBounds(this.bounds);
    if(this.coherentCampaign()){this.window.contentView.removeChildView(this.view);this.window.contentView.addChildView(this.view,0);this.view.setVisible(true);const contents=this.view.webContents,previous=contents.getBackgroundThrottling();contents.setBackgroundThrottling(false);if(this.preparing)this.preparing.restoreThrottling=()=>{if(!contents.isDestroyed())contents.setBackgroundThrottling(previous);};}
    ready=await this.rendered(section,revision,this.view,SETTINGS_HUB_URL,this.bounds);
   }
   if(this.preparing?.revision===revision){this.preparing.restoreThrottling?.();this.preparing=undefined;}
   if(!ready){if(revision===this.revision){if(this.bounds)this.layout(this.bounds);this.update();}return;}
  }
  if(editor) {
   const url=section==='appearance'?'fables-desktop://settings/':section==='translation'?'fables-desktop://settings/translation.html':'fables-desktop://settings/host-instructions.html';
   this.preparing={section,revision,view:editor.view,url};
   let ready=await this.rendered(section,revision,editor.view,url);
   if(ready&&this.section==='campaign'&&this.coherentCampaign()&&this.visible&&this.bounds){
    // Prepare the genuine local navigation under the website alongside its
    // editor. Neither local surface is promoted before its rendered state.
    const navBounds={...this.bounds,width:Math.min(126,this.bounds.width)},contents=this.view.webContents,previous=contents.getBackgroundThrottling();
    this.window.contentView.removeChildView(this.view);this.window.contentView.addChildView(this.view,0);this.view.setBounds(navBounds);this.view.setVisible(true);this.update();
    const pending=this.preparing;
    if(pending)pending.restoreThrottling=()=>{if(!contents.isDestroyed())contents.setBackgroundThrottling(previous);};
    contents.setBackgroundThrottling(false);
    ready=await this.rendered(section,revision,this.view,SETTINGS_HUB_URL,navBounds);
    if(this.preparing===pending){pending?.restoreThrottling?.();if(pending)pending.restoreThrottling=undefined;}
   }
   if(ready&&(section!=='appearance'||this.section==='campaign'&&this.coherentCampaign())&&section!==this.section&&this.visible&&this.bounds) {
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
  // A local first-open surface covers the future gutter before it is installed.
  // Direct Campaign entry stages only its own navigation; the game remains full
  // width until the native form is actually adopted, with no substitute editor.
  const reserve=this.managers?.campaign?.reserve;
  if(section!=='campaign'&&!this.campaignReserved&&reserve&&this.campaignAvailable!==false&&this.bounds) {
   const wasVisible=this.visible,url=editor?section==='appearance'?'fables-desktop://settings/':section==='translation'?'fables-desktop://settings/translation.html':'fables-desktop://settings/host-instructions.html':SETTINGS_HUB_URL;
   if(!wasVisible){
    this.preparing={section,revision,view:this.view,url:SETTINGS_HUB_URL,staged:true,paintBounds:{...this.bounds}};this.update();
    if(!await this.rendered(section,revision)){if(revision===this.revision)this.cancelPreparation();return;}
    this.visible=true;this.layout(this.bounds);
    const nav=editor?{...this.bounds,width:Math.min(126,this.bounds.width)}:this.bounds;
    let painted=await this.rendered(section,revision,this.view,SETTINGS_HUB_URL,nav);
    if(painted&&editor){const navWidth=Math.min(126,this.bounds.width),editorBounds={x:this.bounds.x+navWidth,y:this.bounds.y,width:Math.max(0,this.bounds.width-navWidth),height:this.bounds.height};painted=await this.rendered(section,revision,editor.view,url,editorBounds);}
    if(!painted){if(revision===this.revision)this.cancelPreparation();return;}
   }
   if(revision!==this.revision||this.window.isDestroyed())return;
   const pending={revision,bounds:{...this.bounds}};this.preparingReservation=pending;
   let reserved=false;try{reserved=await reserve.call(this.managers!.campaign,pending.bounds);}catch(error){console.error(error);}
   if(this.preparingReservation!==pending||revision!==this.revision||this.window.isDestroyed())return;
   this.preparingReservation=undefined;if(!reserved)this.managers?.campaign?.hide();this.campaignReserved=reserved;this.reservationBounds=reserved?pending.bounds:undefined;
   if(this.preparing?.staged)this.preparing=undefined;
  }
  let campaignPrepared=false;
  if(section==='campaign'&&this.coherentCampaign()&&(!this.campaignRetained||this.section!=='campaign')&&this.bounds) {
   const adapter=this.managers!.campaign!,wasVisible=this.visible,hadRetained=this.campaignRetained;
   const navigation:CampaignNavigationModel={ticket:randomUUID(),locale:this.appearance.getLocale(),destinations:['combat','appearance','translation','instructions','music','general'].filter(value=>value!=='combat'||!!this.managers?.combat) as CampaignNavDestination[]};
   const pending:{revision:number;bounds:Rectangle;revealing?:boolean}={revision,bounds:{...this.bounds}};this.preparingCampaign=pending;this.campaignNavigation=navigation;this.campaignNavigationConsumed=false;
   this.campaignRetained=true;
   // Passive reservations already keep local Settings and the website aligned.
   // Unsupported workspaces retain the existing full-width handoff behavior.
   if(wasVisible&&!this.campaignReserved)beforeLayout?.();
   const navWidth=Math.min(126,this.bounds.width),nativeBounds={x:this.bounds.x+navWidth,y:this.bounds.y,width:Math.max(0,this.bounds.width-navWidth),height:this.bounds.height};
   this.campaignBounds={...nativeBounds};let ready=false;
   try {
    ready=await adapter.prepare!(nativeBounds,navigation);
    if(this.preparingCampaign!==pending||revision!==this.revision||this.window.isDestroyed())return;
    if(ready){pending.revealing=true;ready=await adapter.reveal!(nativeBounds,navigation.ticket);}
   }catch(error){console.error(error);}
   if(this.preparingCampaign!==pending||revision!==this.revision||this.window.isDestroyed())return;
   this.preparingCampaign=undefined;
   if(!ready){this.campaignNavigation=undefined;adapter.suspend(nativeBounds);if(wasVisible&&!this.campaignReserved&&!hadRetained){this.releaseCampaign();beforeLayout?.();}if(!wasVisible){this.releaseCampaign();await this.select('general',beforeLayout);}return;}
   this.campaignReserved=true;this.reservationBounds={...this.bounds};campaignPrepared=true;
  }
  if(section==='campaign'&&!this.coherentCampaign()&&(!this.campaignRetained||this.section!=='campaign')&&this.bounds) {
   const wasVisible=this.visible,hadRetained=this.campaignRetained;
   if(!wasVisible){
    this.preparing={section,revision,view:this.view,url:SETTINGS_HUB_URL,staged:true,paintBounds:{...this.bounds}};this.update();
    if(!await this.rendered(section,revision)){if(revision===this.revision)this.cancelPreparation();return;}
    this.visible=true;this.layout(this.bounds);
    const navBounds={...this.bounds,width:Math.min(126,this.bounds.width)};
    if(!await this.rendered(section,revision,this.view,SETTINGS_HUB_URL,navBounds)){if(revision===this.revision)this.cancelPreparation();return;}
   }else if(beforeLayout){
    this.preparing={section:this.section,revision,view:this.view,url:SETTINGS_HUB_URL,paintBounds:{...this.bounds}};
    this.update();const painted=await this.rendered(this.section,revision,this.view,SETTINGS_HUB_URL,this.bounds);
    if(this.preparing?.revision===revision)this.preparing=undefined;
    if(!painted)return;
   }
   if(revision!==this.revision||this.window.isDestroyed())return;
   const pending={revision,bounds:{...this.bounds}};this.preparingCampaign=pending;this.campaignRetained=true;
   // An unsupported passive workspace keeps legacy local geometry until now.
   // Move that website to its native full-width coordinate system before mount.
   if(wasVisible&&!this.campaignReserved)beforeLayout?.();
   const navWidth=Math.min(126,this.bounds.width),nativeBounds={x:this.bounds.x+navWidth,y:this.bounds.y,width:Math.max(0,this.bounds.width-navWidth),height:this.bounds.height};
   this.campaignBounds={...nativeBounds};
   let ready=false;try{ready=await this.managers?.campaign?.show(nativeBounds)!==false;}catch(error){console.error(error);}
   if(this.preparingCampaign!==pending||revision!==this.revision||this.window.isDestroyed())return;
   this.preparingCampaign=undefined;
   if(!ready){this.managers?.campaign?.suspend(nativeBounds);if(wasVisible&&!this.campaignReserved&&!hadRetained){this.releaseCampaign();beforeLayout?.();}if(!wasVisible){this.cancelPreparation();this.releaseCampaign();await this.select('general',beforeLayout);}return;}
   if(this.preparing?.staged)this.preparing=undefined;
   this.campaignReserved=true;this.reservationBounds={...this.bounds};campaignPrepared=true;
  }
  if(!campaignPrepared&&this.section!==section&&(this.section==='campaign'||section==='campaign'))this.campaignBounds=undefined;this.section=section;this.visible=true;if(section==='campaign')this.update();
  // Commit the dock only after the renderer owns its horizontal reservation.
  if(section==='campaign')this.campaignRetained=true;
  if(section!=='campaign'&&this.coherentCampaign()){this.campaignNavigation=undefined;this.window.contentView.addChildView(this.view);if(editor)this.window.contentView.addChildView(editor.view);}
  beforeLayout?.();
  if(this.bounds)this.layout(this.bounds);
  if(section!=='campaign')this.update();
  this.lastCommittedSection=section;
  void this.general.saveSection(section).catch(console.error);
  if(section!=='campaign'||!this.coherentCampaign())(editor?.view.webContents??this.view.webContents).focus();
 }
 refreshCampaign():void {if(this.visible&&this.section==='campaign'&&this.bounds){if(this.campaignNavigation)this.campaignNavigation={...this.campaignNavigation,locale:this.appearance.getLocale()};this.campaignBounds=undefined;this.layout(this.bounds);}}
 setVisible(visible:boolean):void {if(!visible){this.revision++;this.cancelPreparation();this.releaseCampaign();}this.visible=visible;this.view.setVisible(visible&&!(this.section==='campaign'&&this.coherentCampaign()));for(const [section,editor]of this.editors)editor.view.setVisible(visible&&section===(this.preparing?.staged?this.preparing.section:this.section));}
 layout(bounds:Rectangle):void {
  const nativePreparation=this.preparingCampaign;
  if(nativePreparation&&Object.keys(bounds).some(key=>bounds[key as keyof Rectangle]!==nativePreparation.bounds[key as keyof Rectangle])){this.revision++;this.cancelPreparation();}
  const painting=this.preparing?.paintBounds;
  if(painting&&Object.keys(bounds).some(key=>bounds[key as keyof Rectangle]!==painting[key as keyof Rectangle])){this.revision++;this.cancelPreparation();}
  this.bounds=bounds;const section=this.preparing?.staged?this.preparing.section:this.section;this.view.setBounds((section==='campaign'||this.preparing?.staged&&this.editors.has(section))&&(!this.preparing?.paintBounds||this.preparing.paintEditor||this.preparing.staged)?{...bounds,width:Math.min(126,bounds.width)}:bounds);this.view.setVisible(this.visible&&!(section==='campaign'&&this.coherentCampaign()));
  const navWidth=Math.min(126,bounds.width);
  const editorBounds={x:bounds.x+navWidth,y:bounds.y,width:Math.max(0,bounds.width-navWidth),height:bounds.height};
  for(const [name,editor]of this.editors){editor.view.setBounds(editorBounds);editor.view.setVisible(this.visible&&(name===section||this.preparing?.paintEditor===true&&this.preparing.view===editor.view));}
  if(this.visible&&this.campaignReserved&&!this.campaignRetained&&!this.preparingReservation&&this.managers?.campaign?.reserve&&(!this.reservationBounds||Object.keys(bounds).some(key=>bounds[key as keyof Rectangle]!==this.reservationBounds![key as keyof Rectangle]))) {
   this.reservationBounds={...bounds};const revision=this.revision;void this.managers.campaign.reserve(bounds).then(ready=>{if(revision===this.revision&&!ready)this.reservationBounds=undefined;}).catch(error=>{this.reservationBounds=undefined;console.error(error);});
  }
  if(this.visible&&this.campaignRetained&&!this.preparingCampaign&&(!this.campaignBounds||Object.keys(editorBounds).some(key=>editorBounds[key as keyof Rectangle]!==this.campaignBounds![key as keyof Rectangle]))) {
   this.campaignRetained=true;
   this.campaignBounds={...editorBounds};
   const adapter=this.managers?.campaign;
   void Promise.resolve(this.section==='campaign'?adapter?.show(editorBounds,this.campaignNavigation):adapter?.suspend(editorBounds)).catch(error=>{this.campaignBounds=undefined;console.error(error);});
  }
 }
}
