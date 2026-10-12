export interface WebsiteMusicState { paused:boolean; available:boolean; next:boolean; volume:number; }
export interface WebsiteMusicAccess { token:string; state:WebsiteMusicState; }

/** Serialized into the trusted main website frame; no preload or IPC bridge. */
export function configureWebsiteSettings(enabled:boolean, locale:'en'|'ru', access?:WebsiteMusicAccess):void {
  type State={paused:boolean;available:boolean;next:boolean;volume:number};
  type Access={token:string;state:State};
  type Controller=(()=>void)&{update(locale:'en'|'ru',access?:Access):void;music(state:State):void};
  const host=window as unknown as Record<string,Controller|undefined>,key='__fablesDesktopWebsiteSettingsCleanup';
  if(host[key]){if(enabled)host[key]!.update(locale,access);else host[key]!();return;}
  if(!enabled||window!==window.top||location.origin!=='https://play.fables.gg')return;
  const campaign=()=>/^\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/play\/?$/i.test(location.pathname);
  let language=locale,token=access?.token??'',status:State=access?.state??{paused:true,available:false,next:false,volume:.5};
  let active=true,frame=0,root:HTMLElement|undefined,actions:HTMLElement|undefined,header:HTMLElement|undefined,home:HTMLButtonElement|undefined;
  let expanded=false;
  const words:Record<string,string>={'Music':'Музыка','Play':'Играть','Pause':'Пауза','Previous track':'Предыдущий трек','Next track':'Следующий трек','Music library':'Музыкальная библиотека','Volume':'Громкость','Settings':'Настройки'};
  const text=(value:string)=>language==='ru'?words[value]??value:value;
  const style=document.createElement('style');style.dataset.ffMusicHeaderStyle='';
  style.textContent=`[data-ff-music-actions]{max-width:100%!important;min-width:0!important;flex-wrap:wrap!important;gap:4px!important}[data-ff-music-header-expanded]{height:auto!important;min-height:40px!important}[data-ff-desktop-music-group]{display:flex;align-items:center;flex:0 0 auto;gap:4px;max-width:100%;font:14px system-ui,sans-serif;color:hsl(var(--foreground));box-sizing:border-box}[data-ff-desktop-music-group] button{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;min-width:0;padding:0;border:1px solid hsl(var(--foreground)/.3);border-radius:6px;background:transparent;color:inherit;cursor:pointer}[data-ff-desktop-music-group] button:disabled{opacity:.45;cursor:default}[data-ff-desktop-music-group] button:focus-visible,[data-ff-desktop-music-group] input:focus-visible{outline:2px solid hsl(var(--primary));outline-offset:2px}[data-ff-desktop-music-group] svg{display:block;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}[data-ff-music-inline-controls]{display:flex;align-items:center;flex-wrap:wrap;gap:4px;min-width:0}[data-ff-music-inline-controls][hidden]{display:none!important}[data-ff-music-volume]{display:flex;align-items:center;gap:4px}[data-ff-music-volume] input{width:56px;min-width:0;accent-color:hsl(var(--primary))}[data-ff-music-volume] span{font-size:12px}[data-ff-music-actions]>div.ml-1.flex.flex-row.space-x-1{flex-shrink:0!important}`;
  document.head.append(style);
  function icon(paths:string[]):SVGSVGElement {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    for(const path of paths){const child=document.createElementNS(svg.namespaceURI,'path');child.setAttribute('d',path);svg.append(child);}return svg;
  }
  function command(event:Event,command:string,value?:number):void {
    if(!event.isTrusted||!campaign()||!token)return;
    event.preventDefault();event.stopPropagation();
    if(command==='library'){window.open('fables-desktop://music/','_blank');return;}
    location.assign(`fables-desktop://music/control?command=${command}&token=${token}${value===undefined?'':`&value=${value}`}`);
  }
  function collapse(open:boolean,restoreFocus=false):void {
    expanded=open;
    const controls=root?.querySelector<HTMLElement>('[data-ff-music-inline-controls]'),button=root?.querySelector<HTMLButtonElement>('[data-ff-desktop-music-launcher]');
    if(controls){controls.hidden=!open;controls.inert=!open;}
    button?.setAttribute('aria-expanded',String(open));
    header?.toggleAttribute('data-ff-music-header-expanded',open);
    if(!open&&restoreFocus)button?.focus();
  }
  function render():void {
    if(!root)return;
    for(const button of root.querySelectorAll<HTMLButtonElement>('button')){
      const name=button.dataset.ffMusicControl;
      const label=name==='play'?(status.paused?'Play':'Pause'):name==='previous'?'Previous track':name==='next'?'Next track':name==='library'?'Music library':'Music';
      button.title=text(label);button.setAttribute('aria-label',text(label));
      if(name==='play'){button.disabled=!token||!status.available;if(button.dataset.ffPaused!==String(status.paused)){button.dataset.ffPaused=String(status.paused);button.replaceChildren(icon([status.paused?'m8 5 11 7-11 7z':'M8 5v14M16 5v14']));}}
      if(name==='next'||name==='previous')button.disabled=!token||!status.next;
      if(name==='library')button.disabled=!token;
    }
    const range=root.querySelector<HTMLInputElement>('input');if(range){range.setAttribute('aria-label',text('Volume'));range.disabled=!token;range.value=String(Math.round(status.volume*100));}
    const label=root.querySelector<HTMLElement>('[data-ff-music-volume] span');if(label&&label.textContent!==text('Volume'))label.textContent=text('Volume');
  }
  function unmountMusic():void {
    root?.remove();root=undefined;actions?.removeAttribute('data-ff-music-actions');actions=undefined;header?.removeAttribute('data-ff-music-header-expanded');header=undefined;expanded=false;
  }
  function mountMusic():void {
    const avatars=document.querySelector<HTMLElement>('header div.ml-1.flex.flex-row.space-x-1,[role="banner"] div.ml-1.flex.flex-row.space-x-1');
    const container=avatars?.parentElement,invite=container?.querySelector<HTMLButtonElement>('button:has(svg.lucide-user-plus)');
    if(!avatars||!container||!invite||!invite.closest('header,[role="banner"]')){unmountMusic();return;}
    if(actions!==container||!root?.isConnected){
      unmountMusic();container.querySelectorAll('[data-ff-desktop-music-group]').forEach(node=>node.remove());actions=container;header=container.closest<HTMLElement>('header,[role="banner"]')??undefined;
      actions.setAttribute('data-ff-music-actions','');root=document.createElement('div');root.dataset.ffDesktopMusicGroup='';
      const button=document.createElement('button');button.type='button';button.dataset.ffDesktopMusicLauncher='';button.setAttribute('aria-expanded','false');button.append(icon(['M9 18V5l12-2v13M9 9l12-2M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6']));root.append(button);
      const controls=document.createElement('div');controls.dataset.ffMusicInlineControls='';controls.hidden=true;controls.inert=true;controls.id='ff-desktop-music-controls';button.setAttribute('aria-controls',controls.id);
      for(const [name,path] of [['previous','m19 6-9 6 9 6zM5 6v12'],['play','m8 5 11 7-11 7z'],['next','m5 6 9 6-9 6zM19 6v12'],['library','M4 5h16v14H4zM8 9h8M8 13h8']]){
        const control=document.createElement('button');control.type='button';control.dataset.ffMusicControl=name;control.append(icon([path]));control.addEventListener('click',event=>command(event,name));controls.append(control);
      }
      const volume=document.createElement('label');volume.dataset.ffMusicVolume='';const label=document.createElement('span'),range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.step='1';range.addEventListener('input',event=>command(event,'volume',Number(range.value)/100));volume.append(label,range);controls.append(volume);root.append(controls);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();collapse(!expanded);});
      root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();collapse(false,true);}});
    }
    if(container.firstElementChild!==root)container.insertBefore(root!,container.firstChild);render();
  }
  function mountHome():void {
    // Require a recognized native sidebar, never a composer/header/arbitrary nav.
    const nav=Array.from(document.querySelectorAll<HTMLElement>('aside nav')).find(node=>{
      const links=Array.from(node.querySelectorAll<HTMLAnchorElement>('a[href]')).map(link=>{try{return new URL(link.href).pathname;}catch{return '';}});
      return links.some(path=>path==='/'||path==='/home')&&links.includes('/campaigns');
    });
    if(!nav){home?.remove();home=undefined;return;}
    if(home?.parentElement!==nav){home?.remove();home=document.createElement('button');home.type='button';home.dataset.ffDesktopSettingsLauncher='';const native=nav.querySelector<HTMLAnchorElement>('a[href]');if(native)home.className=native.className;home.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(location.origin==='https://play.fables.gg'&&!campaign())window.open('fables-desktop://settings/open-global','_blank');});nav.append(home);}
    if(home.textContent!==text('Settings'))home.textContent=text('Settings');home.setAttribute('aria-label',text('Settings'));
  }
  function mount():void {frame=0;if(!active)return;if(location.origin!=='https://play.fables.gg'){cleanup();return;}if(campaign()){home?.remove();home=undefined;mountMusic();}else{unmountMusic();mountHome();}}
  function schedule():void {if(active&&!frame)frame=requestAnimationFrame(mount);}
  function interceptGear(event:MouseEvent):void {
    if(!campaign()||!(event.target instanceof Element))return;
    const gear=event.target.closest<HTMLButtonElement>('button:has(svg.lucide-settings)');
    if(!gear||gear.hasAttribute('data-ff-native-campaign-launch')||gear.closest('form,[role="dialog"],dialog,header,[role="banner"]'))return;
    event.preventDefault();event.stopImmediatePropagation();window.open('fables-desktop://settings/open-campaign','_blank');
  }
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  function cleanup():void {if(!active)return;active=false;observer.disconnect();if(frame)cancelAnimationFrame(frame);unmountMusic();home?.remove();style.remove();document.removeEventListener('click',interceptGear,true);window.removeEventListener('popstate',schedule);delete host[key];}
  const controller=cleanup as Controller;
  controller.update=(nextLocale,nextAccess)=>{language=nextLocale;if(nextAccess){token=nextAccess.token;status=nextAccess.state;}mount();};
  controller.music=state=>{status=state;render();};host[key]=controller;
  document.addEventListener('click',interceptGear,true);window.addEventListener('popstate',schedule);mount();
}

/** Main process publishes only transport booleans/volume, never track names or paths. */
export function updateWebsiteMusicState(state:WebsiteMusicState):void {
  const host=window as unknown as {__fablesDesktopWebsiteSettingsCleanup?:{music?:(state:WebsiteMusicState)=>void}};
  host.__fablesDesktopWebsiteSettingsCleanup?.music?.(state);
}
