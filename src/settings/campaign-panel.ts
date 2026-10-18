export interface CampaignPanelPalette { background:string; foreground:string; border:string; accent:string; panel:string; selected:string; }

// Serialized into the website: all runtime dependencies must remain local.
export function configureNativeCampaignPanel(show: boolean | 'suspend' | 'reserve', width: number, height: number, palette?:CampaignPanelPalette, offset = 0): Promise<boolean> {
  type Controller = { route:string;update(width: number, height: number, palette?:CampaignPanelPalette,offset?:number): void; suspend(width: number,height: number,palette?:CampaignPanelPalette,offset?:number): void; reserve(width:number,height:number):Promise<boolean>; dispose(retainClosed?:boolean): void; ready(): Promise<boolean>; cancelPending(): void };
  type Fiber = { type?: unknown; memoizedProps?: Record<string, unknown>; return?: Fiber; child?: Fiber; sibling?: Fiber };
  const key = '__friendsFablesDesktopCampaignPanel';
  const host = window as unknown as Record<string, Controller | undefined>;
  const route=location.pathname+location.search;
  if(location.origin!=='https://play.fables.gg')return Promise.resolve(false);
  if(host[key]&&host[key]!.route!==route){host[key]!.dispose(true);delete host[key];}
  if(show===false){host[key]?.dispose();return Promise.resolve(false);}
  const match=/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/play\/?$/i.exec(location.pathname);
  if(!match)return Promise.resolve(false);
  if(host[key]){if(show==='reserve')return host[key]!.reserve(width,height);if(show==='suspend'){host[key]!.suspend(width,height,palette,offset);return Promise.resolve(false);}host[key]!.update(width,height,palette,offset);return host[key]!.ready();}
  if(show!==true&&show!=='reserve')return Promise.resolve(false);
  const campaignId = match[1].toLowerCase();
  let disposed = false, queued = false, attempted = false, panel: HTMLElement | null = null;
  let panelWidth = width, panelHeight = height, panelOffset=offset, modalActive = false;
  let workspace:HTMLElement|null=null,nativeClosed=false;
  const reservationUndo:(()=>void)[]=[];
  let desktopPalette=palette, sectionSuspended=show==='reserve', closingRequested=false;
  let retirementTimer=0,launchGear:HTMLElement|null=null;
  let cssWidth=0,cssHeight=0,cssOffset=0,pendingReady:((ready:boolean)=>void)|undefined;
  const cancelPending=():void=>{pendingReady?.(false);};
  // Snapshot only after the previous dock has natively unmounted: its temporary
  // modal locks and accessibility attributes are not Campaign's initial state.
  let handoffAccepted = false, closingCombat: HTMLElement | null = null;
  const existing = new Set<Element>();
  let bodyBefore: string[][] = [];
  const beforeAria = new Map<HTMLElement, string | null>();
  const layoutUndo: (() => void)[] = [], modalUndo: (() => void)[] = [];
  const eligibleWorkspace=():HTMLElement|null=>{
    const editor=document.querySelector<HTMLElement>('.tiptap[contenteditable="true"]');
    const marked=document.querySelector<HTMLElement>('.flex-1.h-full.w-full[data-ff-desktop-chat="true"]');
    const feed=document.getElementById('events-list')??document.querySelector<HTMLElement>('[id^="event-message-card-"]');
    const root=editor?.closest<HTMLElement>('.flex-1.h-full.w-full')??marked??feed?.closest<HTMLElement>('.flex-1.h-full.w-full');
    return root&&!root.closest('form,[role="dialog"],aside,[data-sidebar]')?root:null;
  };
  if(show==='reserve'&&!eligibleWorkspace())return Promise.resolve(false);
  const style = document.createElement('style');
  document.head.append(style);
  function dimensions(): void {
    panelWidth = Number.isFinite(panelWidth) ? Math.max(0, Math.round(panelWidth)) : 0;
    panelOffset=Number.isFinite(panelOffset)?Math.max(0,Math.round(panelOffset)):0;
    panelHeight = Number.isFinite(panelHeight) ? Math.max(0, Math.round(panelHeight)) : 0;
    // The adapter supplies native DIP. Campaign fills the website viewport,
    // whose native height is the same as the reserved Settings content height.
    // Derive CSS units from that viewport so website zoom remains untouched.
    const viewportHeight=window.visualViewport?.height??window.innerHeight;
    cssHeight=Number.isFinite(viewportHeight)&&viewportHeight>0?viewportHeight:panelHeight;
    cssWidth=panelHeight>0?panelWidth*cssHeight/panelHeight:0;
    cssOffset=panelHeight>0?panelOffset*cssHeight/panelHeight:0;
    style.textContent = `[data-ff-campaign-panel]{position:fixed!important;left:${cssOffset}px!important;top:0!important;right:auto!important;bottom:auto!important;transform:none!important;translate:none!important;width:${cssWidth}px!important;height:${cssHeight}px!important;min-width:0!important;max-width:${cssWidth}px!important;max-height:${cssHeight}px!important;box-sizing:border-box!important;border:1px solid!important;border-radius:8px!important;overflow:hidden!important;animation:none!important;transition:none!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full{overflow:hidden!important;min-height:0!important;flex:1 1 0%!important;height:100%!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full{padding:0!important;height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important;box-sizing:border-box!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto > div.mx-auto{padding:28px 32px!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto{overflow:auto!important;min-height:0!important;flex:1 1 0%!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-width:thin!important;scrollbar-color:color-mix(in srgb,currentColor 35%,transparent) transparent!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto::-webkit-scrollbar{width:6px;height:6px}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto::-webkit-scrollbar-track{background:transparent}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto::-webkit-scrollbar-thumb{background:color-mix(in srgb,currentColor 35%,transparent);border-radius:6px}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto > div.mx-auto > div:first-child > div > h3.font-header{font-size:30px!important;font-weight:650!important;letter-spacing:-.04em!important;line-height:1.2!important;margin:0!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto > div.mx-auto > div:first-child > div > h3.font-header::before{content:"FRIENDS & FABLES DESKTOP";display:block;margin:0 0 12px;color:var(--ff-campaign-accent,currentColor);font-size:10px;font-weight:400;letter-spacing:.15em;line-height:1.5;text-transform:uppercase}[data-ff-campaign-panel] > button:has(> .lucide-x){position:absolute!important;top:12px!important;right:12px!important;display:grid!important;place-items:center!important;width:34px!important;height:34px!important;padding:0!important;border:1px solid var(--ff-campaign-border,currentColor)!important;border-radius:50%!important;background:transparent!important;color:inherit!important;font-size:0!important;line-height:0!important;opacity:1!important}[data-ff-campaign-panel] > button:has(> .lucide-x) > .lucide-x{display:block!important;width:18px!important;height:18px!important}[data-ff-campaign-panel] > button:has(> .lucide-x):hover{border-color:var(--ff-campaign-accent,currentColor)!important;background:var(--ff-campaign-button,var(--ff-campaign-border,currentColor))!important;color:inherit!important}[data-ff-campaign-panel] > button:has(> .lucide-x):focus-visible{outline:2px solid var(--ff-campaign-accent,currentColor)!important;outline-offset:2px!important}[data-ff-campaign-workspace]{padding-left:${cssWidth+cssOffset}px!important;box-sizing:border-box!important;min-width:0!important}`;
    // The native dialog is a flex column. Its h-full wrappers otherwise keep
    // their content-sized minimum, so hiding the outer overflow clips the bottom.
    const content = '[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto > div.mx-auto';
    style.textContent += `${content} > div:first-child{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}${content} > div:first-child > div{padding:0!important}${content} > div:first-child > div:first-child{margin-bottom:22px!important;gap:14px!important}${content} > div:first-child > div:last-child{gap:18px!important}[data-ff-campaign-panel]{font:14px system-ui,-apple-system,"Segoe UI",sans-serif!important;line-height:1.5!important}[data-ff-campaign-panel] *{box-sizing:border-box;font-family:inherit!important}[data-ff-campaign-panel] :is(label,h3.font-medium){font-size:13px!important;font-weight:600!important;line-height:1.5!important}[data-ff-campaign-panel] p{font-size:13px!important;line-height:1.5!important}[data-ff-campaign-panel] :is(.text-xs,.text-muted-foreground){font-size:12px!important;line-height:1.5!important}`;
    if(sectionSuspended)style.textContent+='[data-ff-campaign-panel]{visibility:hidden!important;pointer-events:none!important}';
    const p=desktopPalette;
    // Only app-generated CSS colors are accepted; never interpolate arbitrary CSS.
    const color=(value:unknown):value is string=>typeof value==='string'&&/^(?:#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(value);
    if(p&&[p.background,p.foreground,p.border,p.accent,p.panel,p.selected].every(color))style.textContent+=`[data-ff-campaign-panel]{font:14px system-ui,-apple-system,"Segoe UI",sans-serif!important;color:${p.foreground}!important;background:${p.background}!important;border-color:${p.border}!important;--ff-campaign-accent:${p.accent};--ff-campaign-border:${p.border};--ff-campaign-button:${p.panel}}[data-ff-campaign-panel] :is(.bg-card,.border){border-color:${p.border}!important}[data-ff-campaign-panel] .bg-card{background:${p.panel}!important;color:${p.foreground}!important}[data-ff-campaign-panel] :is(.text-muted-foreground,.text-gray-400){color:color-mix(in srgb,${p.foreground} 72%,${p.background})!important}[data-ff-campaign-panel] *{font-family:inherit!important}[data-ff-campaign-panel] :is(button,input,textarea,[role="combobox"]){font-size:14px!important;color:${p.foreground}!important;background:${p.panel}!important;border:1px solid ${p.border}!important;border-radius:8px!important}[data-ff-campaign-panel] button:hover{background:${p.selected}!important;border-color:${p.accent}!important}[data-ff-campaign-panel] :is(button,input,textarea,[role="combobox"]):focus-visible{outline:2px solid ${p.accent}!important;outline-offset:2px}[data-ff-campaign-panel] :is(input[type="checkbox"],[role="checkbox"],[role="switch"]){accent-color:${p.accent}!important}[data-ff-campaign-panel] :is([role="checkbox"],[role="switch"])[data-state="checked"]{background:${p.accent}!important}`;
    if(p&&[p.foreground,p.accent,p.selected].every(color))style.textContent+=`[data-ff-campaign-panel] :is(button[class~="bg-green-500/10"][class~="border-green-500/30"],[role="radio"][data-state="on"],[role="radio"][aria-checked="true"],button[data-state="on"],button[aria-pressed="true"]){background:${p.selected}!important;border-color:${p.accent}!important;color:${p.foreground}!important}`;
  }
  function attr(node: HTMLElement, name: string, value: string | null, undo: (() => void)[]): void {
    const old = node.getAttribute(name);
    if (old === value) return;
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
    undo.push(() => { if (node.getAttribute(name) !== value) return; if (old === null) node.removeAttribute(name); else node.setAttribute(name, old); });
  }
  function reserveWorkspace():boolean {
    if(workspace?.isConnected)return true;
    workspace=eligibleWorkspace();
    if(!workspace)return false;
    attr(workspace,'data-ff-campaign-workspace','',reservationUndo);return true;
  }
  function releaseReservation():void {for(const undo of reservationUndo.reverse())undo();reservationUndo.length=0;workspace=null;}
  function property(node: HTMLElement, name: string, value: string): void {
    const old = node.style.getPropertyValue(name), priority = node.style.getPropertyPriority(name);
    node.style.setProperty(name, value, 'important');
    modalUndo.push(() => { if (node.style.getPropertyValue(name) !== value || node.style.getPropertyPriority(name) !== 'important') return; if (old) node.style.setProperty(name, old, priority); else node.style.removeProperty(name); });
  }
  const visible = (node: Element): boolean => node.isConnected && !node.hasAttribute('hidden') && node.getAttribute('data-state') !== 'closed' && getComputedStyle(node).display !== 'none';
  function concealedSpellHelper(node: Element): boolean {
    const helper = (window as unknown as { __friendsFablesDesktopSpellSlots?: { isConcealedHelper?(dialog: Element, dock: Element): boolean } }).__friendsFablesDesktopSpellSlots;
    return !!panel && helper?.isConcealedHelper?.(node, panel) === true;
  }
  function otherLayer(): boolean {
    return Array.from(document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper]')).some(node => node !== panel && visible(node) && !concealedSpellHelper(node));
  }
  function fiber(node: Element): Fiber | undefined {
    return Object.entries(node).find(([name]) => name.startsWith('__reactFiber'))?.[1] as Fiber | undefined;
  }
  function campaignDialog(node: HTMLElement): boolean {
    if (node.parentElement !== document.body || !node.querySelector('button:has(.lucide-x)')) return false;
    // Inspect only this dialog's mounted subtree and its short ancestor chain.
    // A campaign provider elsewhere in the app is not ownership evidence.
    const start = fiber(node);
    if (!start) return false;
    const candidates: Fiber[] = [start];
    for (let count = 0; candidates.length && count < 350; count++) {
      const current = candidates.shift()!, props = current.memoizedProps;
      if (typeof current.type === 'function' && typeof props?.campaignId === 'string'
        && props.campaignId.toLowerCase() === campaignId && typeof props.isHost === 'boolean'
        && String(current.type).includes('Campaign Settings')) return true;
      if (current.child) candidates.push(current.child);
      // Never follow this dialog root's siblings into another portal/dialog.
      if (current !== start && current.sibling) candidates.push(current.sibling);
    }
    return false;
  }
  function suspend(removed = false): void {
    // Native unmount already restores its locks. Do not replay stale snapshots.
    if (!removed) for (const undo of modalUndo.reverse()) undo();
    else for (const [name, value, priority] of bodyBefore) {
      if (document.body.style.getPropertyPriority(name) === 'important' && document.body.style.getPropertyValue(name) === 'auto') { if (value) document.body.style.setProperty(name, value, priority); else document.body.style.removeProperty(name); }
    }
    modalUndo.length = 0; modalActive = false;
  }
  function background(target: EventTarget | null): boolean {
    return target instanceof Node && !panel?.contains(target) && document.body.contains(target);
  }
  function live(): boolean { return !disposed && modalActive && !!panel?.isConnected && !otherLayer(); }
  function focusGate(event: FocusEvent): void { if (live() && background(event.type === 'focusout' ? event.relatedTarget : event.target)) event.stopImmediatePropagation(); }
  function wheelGate(event: WheelEvent): void { if (live() && event.target instanceof Node && document.body.contains(event.target)) event.stopImmediatePropagation(); }
  function outside(event: Event): void { if (live() && background((event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent?.target ?? null)) event.preventDefault(); }
  function dock(): void {
    if (!panel || modalActive || otherLayer()) return;
    attr(panel, 'aria-modal', 'false', modalUndo);
    const overlay = panel.previousElementSibling;
    if (overlay instanceof HTMLElement && !overlay.children.length && overlay.matches('[data-state="open"].fixed.inset-0.z-50')) { property(overlay, 'display', 'none'); property(overlay, 'pointer-events', 'none'); }
    if (document.body.style.pointerEvents === 'none') property(document.body, 'pointer-events', 'auto');
    if (document.body.style.overflow === 'hidden') property(document.body, 'overflow', 'auto');
    for (const [node, old] of beforeAria) if (old !== 'true' && node.getAttribute('aria-hidden') === 'true') attr(node, 'aria-hidden', old, modalUndo);
    modalActive = true;
  }
  function scan(): void {
    queued = false; if (disposed) return;
    if (location.pathname + location.search !== route) { dispose(true);if(host[key]===controller)delete host[key];return; }
    if (panel && (!panel.isConnected || panel.getAttribute('data-state') === 'closed')) { suspend(true);for(const undo of layoutUndo.reverse())undo();layoutUndo.length=0;panel=null;nativeClosed=true;sectionSuspended=true;cancelPending();window.open('fables-desktop://settings/close-campaign', '_blank');return; }
    if(sectionSuspended&&!attempted)return;
    if (!handoffAccepted) {
      const combat = (window as unknown as { __friendsFablesDesktopCombatPanel?: { closeForSettings?(): HTMLElement | null | false } }).__friendsFablesDesktopCombatPanel;
      const result = combat?.closeForSettings?.();
      if (result === false) return;
      closingCombat = result ?? null;
      handoffAccepted = true;
    }
    if (closingCombat?.isConnected) return;
    closingCombat = null;
    if (!attempted && !sectionSuspended && !otherLayer()) {
      const gear = document.querySelector<HTMLButtonElement>('aside button:has(svg.lucide-settings)')
        ?? Array.from(document.querySelectorAll<HTMLElement>('aside > div.flex.flex-col.relative.z-10 > div.font-body.group.flex.flex-row')).find(node => !!node.querySelector(':scope > .font-header') && /^(Settings|Настройки)$/.test(node.textContent?.trim() ?? ''));
      if (!gear || gear instanceof HTMLButtonElement && gear.disabled) return;
      attempted = true;launchGear=gear;
      for (const node of document.querySelectorAll('[role="dialog"]')) existing.add(node);
      bodyBefore = ['pointer-events', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
      for (const node of document.body.children) if (node instanceof HTMLElement) beforeAria.set(node, node.getAttribute('aria-hidden'));
      const old = gear.getAttribute('data-ff-native-campaign-launch');
      gear.setAttribute('data-ff-native-campaign-launch', 'true');
      try { gear.click(); } finally { if (old === null) gear.removeAttribute('data-ff-native-campaign-launch'); else gear.setAttribute('data-ff-native-campaign-launch', old); }
    }
    if (!panel && attempted) {
      panel = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(node => !existing.has(node) && visible(node) && campaignDialog(node)) ?? null;
      if (panel) {
        attr(panel, 'data-ff-campaign-panel', '', layoutUndo);
        const scroller = panel.querySelector<HTMLElement>(':scope > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto');
        if (scroller && !scroller.hasAttribute('tabindex')) attr(scroller, 'tabindex', '0', layoutUndo);
        if(!closingRequested)reserveWorkspace();
      }
    }
    if(panel&&closingRequested){dispose();return;}
    if (panel) { if (otherLayer()) { if (modalActive) suspend(); } else dock(); }
  }
  function ready():Promise<boolean> {
    cancelPending();
    return new Promise(resolve=>{
      let frame=0,timer=0,painted=0,finished=false;
      const finish=(value:boolean):void=>{if(finished)return;finished=true;cancelAnimationFrame(frame);clearTimeout(timer);if(pendingReady===finish)pendingReady=undefined;resolve(value);};
      pendingReady=finish;
      const advance=():void=>{
        if(disposed||sectionSuspended||location.pathname+location.search!==route){finish(false);return;}
        const rect=panel?.isConnected?panel.getBoundingClientRect():null;
        const visible=panel&&getComputedStyle(panel).visibility!=='hidden'&&getComputedStyle(panel).display!=='none';
        if(document.visibilityState==='visible'&&visible&&modalActive&&rect&&Math.abs(rect.x-cssOffset)<1&&Math.abs(rect.y)<1&&Math.abs(rect.width-cssWidth)<1&&Math.abs(rect.height-cssHeight)<1)painted++;else painted=0;
        if(painted>=2){finish(true);return;}
        frame=requestAnimationFrame(advance);
      };
      frame=requestAnimationFrame(advance);timer=window.setTimeout(()=>finish(false),1500);
    });
  }
  function reserve(nextWidth:number,nextHeight:number):Promise<boolean> {
    if(disposed||closingRequested||nativeClosed||location.pathname+location.search!==route||!reserveWorkspace())return Promise.resolve(false);
    panelWidth=nextWidth;panelHeight=nextHeight;panelOffset=0;dimensions();cancelPending();
    return new Promise(resolve=>{let frame=0,timer=0,painted=0,finished=false;
      const finish=(value:boolean):void=>{if(finished)return;finished=true;cancelAnimationFrame(frame);clearTimeout(timer);if(pendingReady===finish)pendingReady=undefined;resolve(value);};pendingReady=finish;
      const advance=():void=>{if(disposed||closingRequested||location.pathname+location.search!==route||!workspace?.isConnected){finish(false);return;}
        if(document.visibilityState==='visible'&&Math.abs(parseFloat(getComputedStyle(workspace).paddingLeft)-cssWidth)<1)painted++;else painted=0;
        if(painted>=2)finish(true);else frame=requestAnimationFrame(advance);};frame=requestAnimationFrame(advance);timer=window.setTimeout(()=>finish(false),1500);
    });
  }
  function retirePending():void {if(!closingRequested)return;dispose(true);if(host[key]===controller)delete host[key];}
  function newLaunch(event:Event):void {if(closingRequested&&event.target instanceof Node&&launchGear?.contains(event.target))retirePending();}
  function resize():void {dimensions();schedule();}
  function schedule(): void { if (!queued && !disposed) { queued = true; queueMicrotask(scan); } }
  document.addEventListener('ff-spell-helper-change', schedule);
  let observer:MutationObserver|undefined,timer=0;
  function watchNative():void {
    if(observer)return;observer=new MutationObserver(schedule);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-state','aria-hidden','style']});
    timer=window.setInterval(schedule,500);
  }
  function dispose(retainClosed = false): void {
    if (disposed) { if (!retainClosed) delete host[key]; return; }
    // React can mount the already requested native dialog after Settings closes.
    // Keep this existing ownership observer for one bounded late-mount window.
    // A new click on the original gear retires this owner before native launch;
    // after the deadline a future dialog has no safe cancellation provenance.
    releaseReservation();
    if(!retainClosed&&attempted&&!panel&&!nativeClosed){closingRequested=true;sectionSuspended=true;cancelPending();dimensions();if(!retirementTimer)retirementTimer=window.setTimeout(retirePending,1500);return;}
    disposed = true;cancelPending();clearTimeout(retirementTimer);retirementTimer=0;document.removeEventListener('click',newLaunch,true);
    document.removeEventListener('ff-spell-helper-change', schedule); observer?.disconnect(); clearInterval(timer);
    const owned = panel;
    suspend(!owned?.isConnected);
    for (const undo of layoutUndo.reverse()) undo();
    style.remove(); panel = null;
    document.removeEventListener('wheel', wheelGate); document.removeEventListener('focusin', focusGate); document.removeEventListener('focusout', focusGate);
    document.removeEventListener('dismissableLayer.pointerDownOutside', outside, true); document.removeEventListener('dismissableLayer.focusOutside', outside, true);
    window.removeEventListener('popstate', schedule); window.removeEventListener('resize', resize);
    if (!retainClosed) delete host[key];
    if (owned?.isConnected && owned.getAttribute('data-state') !== 'closed') owned.querySelector<HTMLButtonElement>('button:has(.lucide-x)')?.click();
  }
  document.addEventListener('wheel', wheelGate); document.addEventListener('focusin', focusGate); document.addEventListener('focusout', focusGate);
  document.addEventListener('dismissableLayer.pointerDownOutside', outside, true); document.addEventListener('dismissableLayer.focusOutside', outside, true);
  window.addEventListener('popstate', schedule); window.addEventListener('resize', resize);
  document.addEventListener('click',newLaunch,true);
  const controller:Controller = { route,update(nextWidth, nextHeight, nextPalette,nextOffset=0) { if (disposed||nativeClosed) return; cancelPending();clearTimeout(retirementTimer);retirementTimer=0;closingRequested=false;sectionSuspended=false;watchNative(); panelWidth = nextWidth; panelHeight = nextHeight;panelOffset=nextOffset;if(nextPalette)desktopPalette=nextPalette; dimensions(); schedule(); }, suspend(nextWidth,nextHeight,nextPalette,nextOffset=0) { if(disposed)return; cancelPending();sectionSuspended=true; panelWidth=nextWidth;panelHeight=nextHeight;panelOffset=nextOffset;if(nextPalette)desktopPalette=nextPalette;dimensions(); }, reserve,dispose,ready,cancelPending };
  host[key]=controller;
  dimensions(); if(show==='reserve')return reserve(width,height);watchNative();scan();return ready();
}
