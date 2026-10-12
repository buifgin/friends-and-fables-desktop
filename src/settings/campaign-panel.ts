export interface CampaignPanelPalette { background:string; foreground:string; border:string; accent:string; panel:string; selected:string; }

// Serialized into the website: all runtime dependencies must remain local.
export function configureNativeCampaignPanel(show: boolean | 'suspend', width: number, height: number, palette?:CampaignPanelPalette): void {
  type Controller = { update(width: number, height: number, palette?:CampaignPanelPalette): void; suspend(width: number,height: number,palette?:CampaignPanelPalette): void; dispose(): void };
  type Fiber = { type?: unknown; memoizedProps?: Record<string, unknown>; return?: Fiber; child?: Fiber; sibling?: Fiber };
  const key = '__friendsFablesDesktopCampaignPanel';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (show === 'suspend') host[key]!.suspend(width,height,palette); else if (show) host[key]!.update(width, height, palette); else host[key]!.dispose(); return; }
  if (show !== true) return;
  const match = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/play\/?$/i.exec(location.pathname);
  if (location.origin !== 'https://play.fables.gg' || !match) return;
  const campaignId = match[1].toLowerCase();
  let disposed = false, queued = false, attempted = false, panel: HTMLElement | null = null;
  let panelWidth = width, panelHeight = height, modalActive = false;
  let desktopPalette=palette, sectionSuspended=false;
  const route = location.pathname + location.search;
  // Snapshot only after the previous dock has natively unmounted: its temporary
  // modal locks and accessibility attributes are not Campaign's initial state.
  let handoffAccepted = false, closingCombat: HTMLElement | null = null;
  const existing = new Set<Element>();
  let bodyBefore: string[][] = [];
  const beforeAria = new Map<HTMLElement, string | null>();
  const layoutUndo: (() => void)[] = [], modalUndo: (() => void)[] = [];
  const style = document.createElement('style');
  document.head.append(style);
  function dimensions(): void {
    panelWidth = Number.isFinite(panelWidth) ? Math.max(0, Math.round(panelWidth)) : 0;
    panelHeight = Number.isFinite(panelHeight) ? Math.max(0, Math.round(panelHeight)) : 0;
    style.textContent = `[data-ff-campaign-panel]{position:fixed!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;transform:none!important;translate:none!important;width:${panelWidth}px!important;height:${panelHeight}px!important;min-width:0!important;max-width:${panelWidth}px!important;max-height:${panelHeight}px!important;box-sizing:border-box!important;border:1px solid!important;border-radius:8px!important;overflow:hidden!important;animation:none!important;transition:none!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full{overflow:hidden!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full{padding:0!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto > div.mx-auto{padding:28px 32px!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto{overflow:auto!important;scrollbar-width:thin!important;scrollbar-color:color-mix(in srgb,currentColor 35%,transparent) transparent!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto::-webkit-scrollbar{width:6px;height:6px}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto::-webkit-scrollbar-track{background:transparent}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto::-webkit-scrollbar-thumb{background:color-mix(in srgb,currentColor 35%,transparent);border-radius:6px}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto > div.mx-auto > div:first-child > div > h3.font-header{font-size:30px!important;font-weight:650!important;letter-spacing:-.04em!important;line-height:1.2!important;margin:0!important}[data-ff-campaign-panel] > div.overflow-y-auto.h-full > div.p-6.h-full > div.flex-1.items-center.overflow-y-auto > div.mx-auto > div:first-child > div > h3.font-header::before{content:"FRIENDS & FABLES DESKTOP";display:block;margin:0 0 12px;color:var(--ff-campaign-accent,currentColor);font-size:10px;font-weight:400;letter-spacing:.15em;line-height:1.5;text-transform:uppercase}[data-ff-campaign-panel] > button:has(> .lucide-x){position:absolute!important;top:12px!important;right:12px!important;display:grid!important;place-items:center!important;width:34px!important;height:34px!important;padding:0!important;border:1px solid var(--ff-campaign-border,currentColor)!important;border-radius:50%!important;background:transparent!important;color:inherit!important;font-size:0!important;line-height:0!important;opacity:1!important}[data-ff-campaign-panel] > button:has(> .lucide-x) > .lucide-x{display:block!important;width:18px!important;height:18px!important}[data-ff-campaign-panel] > button:has(> .lucide-x):hover{border-color:var(--ff-campaign-accent,currentColor)!important;background:var(--ff-campaign-button,var(--ff-campaign-border,currentColor))!important;color:inherit!important}[data-ff-campaign-panel] > button:has(> .lucide-x):focus-visible{outline:2px solid var(--ff-campaign-accent,currentColor)!important;outline-offset:2px!important}[data-ff-campaign-workspace]{padding-left:${panelWidth}px!important;box-sizing:border-box!important;min-width:0!important}`;
    if(sectionSuspended)style.textContent+='[data-ff-campaign-panel]{visibility:hidden!important;pointer-events:none!important}';
    const p=desktopPalette;
    // Only app-generated CSS colors are accepted; never interpolate arbitrary CSS.
    const color=(value:unknown):value is string=>typeof value==='string'&&/^(?:#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(value);
    if(p&&[p.background,p.foreground,p.border,p.accent,p.panel,p.selected].every(color))style.textContent+=`[data-ff-campaign-panel]{font:14px system-ui,sans-serif!important;color:${p.foreground}!important;background:${p.background}!important;border-color:${p.border}!important;--ff-campaign-accent:${p.accent};--ff-campaign-border:${p.border};--ff-campaign-button:${p.panel}}[data-ff-campaign-panel] *{font-family:inherit!important}[data-ff-campaign-panel] :is(button,input,textarea,[role="combobox"]){font-size:14px!important;color:${p.foreground}!important;background:${p.panel}!important;border:1px solid ${p.border}!important;border-radius:8px!important}[data-ff-campaign-panel] button:hover{background:${p.selected}!important;border-color:${p.accent}!important}[data-ff-campaign-panel] :is(button,input,textarea,[role="combobox"]):focus-visible{outline:2px solid ${p.accent}!important;outline-offset:2px}[data-ff-campaign-panel] :is(input[type="checkbox"],[role="checkbox"],[role="switch"]){accent-color:${p.accent}!important}[data-ff-campaign-panel] :is([role="checkbox"],[role="switch"])[data-state="checked"]{background:${p.accent}!important}`;
  }
  function attr(node: HTMLElement, name: string, value: string | null, undo: (() => void)[]): void {
    const old = node.getAttribute(name);
    if (old === value) return;
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
    undo.push(() => { if (node.getAttribute(name) !== value) return; if (old === null) node.removeAttribute(name); else node.setAttribute(name, old); });
  }
  function property(node: HTMLElement, name: string, value: string): void {
    const old = node.style.getPropertyValue(name), priority = node.style.getPropertyPriority(name);
    node.style.setProperty(name, value, 'important');
    modalUndo.push(() => { if (node.style.getPropertyValue(name) !== value || node.style.getPropertyPriority(name) !== 'important') return; if (old) node.style.setProperty(name, old, priority); else node.style.removeProperty(name); });
  }
  const visible = (node: Element): boolean => node.isConnected && !node.hasAttribute('hidden') && node.getAttribute('data-state') !== 'closed' && getComputedStyle(node).display !== 'none';
  function otherLayer(): boolean {
    return Array.from(document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper]')).some(node => node !== panel && visible(node));
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
    if (location.pathname + location.search !== route) { dispose(true); return; }
    if (panel && (!panel.isConnected || panel.getAttribute('data-state') === 'closed')) { suspend(true); panel = null; try { window.open('fables-desktop://settings/close-campaign', '_blank'); } finally { dispose(true); } return; }
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
      const gear = document.querySelector<HTMLButtonElement>('aside button:has(svg.lucide-settings)');
      if (!gear || gear.disabled) return;
      attempted = true;
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
        const chat = document.querySelector<HTMLElement>('.tiptap[contenteditable="true"]')?.closest<HTMLElement>('.flex-1.h-full.w-full');
        if (chat) attr(chat, 'data-ff-campaign-workspace', '', layoutUndo);
      }
    }
    if (panel) { if (otherLayer()) { if (modalActive) suspend(); } else dock(); }
  }
  function schedule(): void { if (!queued && !disposed) { queued = true; queueMicrotask(scan); } }
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state', 'aria-hidden', 'style'] });
  const timer = window.setInterval(schedule, 500);
  function dispose(retainClosed = false): void {
    if (disposed) { if (!retainClosed) delete host[key]; return; }
    disposed = true; observer.disconnect(); clearInterval(timer);
    const owned = panel;
    suspend(!owned?.isConnected);
    for (const undo of layoutUndo.reverse()) undo();
    style.remove(); panel = null;
    document.removeEventListener('wheel', wheelGate); document.removeEventListener('focusin', focusGate); document.removeEventListener('focusout', focusGate);
    document.removeEventListener('dismissableLayer.pointerDownOutside', outside, true); document.removeEventListener('dismissableLayer.focusOutside', outside, true);
    window.removeEventListener('popstate', schedule); window.removeEventListener('resize', schedule);
    if (!retainClosed) delete host[key];
    if (owned?.isConnected && owned.getAttribute('data-state') !== 'closed') owned.querySelector<HTMLButtonElement>('button:has(.lucide-x)')?.click();
  }
  document.addEventListener('wheel', wheelGate); document.addEventListener('focusin', focusGate); document.addEventListener('focusout', focusGate);
  document.addEventListener('dismissableLayer.pointerDownOutside', outside, true); document.addEventListener('dismissableLayer.focusOutside', outside, true);
  window.addEventListener('popstate', schedule); window.addEventListener('resize', schedule);
  host[key] = { update(nextWidth, nextHeight, nextPalette) { if (disposed) return; sectionSuspended=false; panelWidth = nextWidth; panelHeight = nextHeight;if(nextPalette)desktopPalette=nextPalette; dimensions(); schedule(); }, suspend(nextWidth,nextHeight,nextPalette) { if(disposed)return; sectionSuspended=true; panelWidth=nextWidth;panelHeight=nextHeight;if(nextPalette)desktopPalette=nextPalette;dimensions(); }, dispose };
  dimensions(); scan();
}
