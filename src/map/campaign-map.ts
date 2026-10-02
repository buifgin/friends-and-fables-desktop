// Serialized into the website renderer. Uses only DOM APIs and local layout preferences.
export function configureCampaignMap(enabled: boolean, locale: 'en' | 'ru'): void {
  type Size = { height?: number; width?: number; expandedHeight?: number; left?: number; top?: number };
  type Entry = { root: HTMLElement; controls: HTMLElement; expand: HTMLButtonElement; reset: HTMLButtonElement; move: HTMLButtonElement; kind: 'battle' | 'world';
    handle: HTMLElement; styles: Map<HTMLElement, Map<string, [string, string]>>; size: Size; campaign: string; expanded: boolean; popover: boolean; left?: number; top?: number;
    drag?: { x: number; y: number; width: number; height: number }; moving?: { x: number; y: number; left: number; top: number } };
  const key = '__friendsFablesDesktopMap';
  const host = window as unknown as Record<string, { dispose(): void; setLocale(value: 'en' | 'ru'): void } | undefined>;
  if (host[key]) {
    if (enabled) host[key]!.setLocale(locale); else host[key]!.dispose();
    return;
  }
  if (!enabled) return;
  let language = locale;
  let frame = 0;
  const entries = new Map<HTMLElement, Entry>();
  const text = (en: string, ru: string): string => language === 'ru' ? ru : en;
  const storageKey = (campaign: string, kind: 'battle' | 'world'): string => `ff-desktop-map-size-v1:${campaign}${kind==='world'?':world':''}`;
  const minimum = (entry: Entry): number => entry.kind==='world'?400:240;
  const clamp = (value: number, min: number, max: number): number => Math.round(Math.max(Math.min(min, max), Math.min(max, value)));
  function readSize(campaign: string, kind: 'battle' | 'world'): Size {
    try {
      const source = localStorage.getItem(storageKey(campaign,kind));
      if (!source || source.length > 512) return {};
      const raw = JSON.parse(source);
      const result: Size = {};
      for (const name of ['height', 'width', 'expandedHeight', 'left', 'top'] as const) {
        if (typeof raw?.[name] === 'number' && Number.isFinite(raw[name]) && raw[name] >= (name==='left'||name==='top'?0:100) && raw[name] <= 4000) result[name] = raw[name];
      }
      return result;
    } catch { return {}; }
  }
  function saveSize(entry: Entry): void {
    try { localStorage.setItem(storageKey(entry.campaign,entry.kind), JSON.stringify(entry.size)); } catch { /* Storage may be unavailable. */ }
  }
  function set(entry: Entry, property: string, value: string, target = entry.root): void {
    let styles = entry.styles.get(target);
    if (!styles) { styles = new Map(); entry.styles.set(target, styles); }
    if (!styles.has(property)) styles.set(property, [target.style.getPropertyValue(property), target.style.getPropertyPriority(property)]);
    if (target.style.getPropertyValue(property) !== value || target.style.getPropertyPriority(property) !== 'important') target.style.setProperty(property, value, 'important');
  }
  function restoreStyles(entry: Entry): void {
    for (const [target, styles] of entry.styles) for (const [property, [value, priority]] of styles) {
      if (value) target.style.setProperty(property, value, priority); else target.style.removeProperty(property);
    }
    entry.styles.clear();
  }
  function labels(entry: Entry): void {
    entry.expand.textContent = entry.expanded ? text('Close map', 'Закрыть карту') : text('Expand map', 'Развернуть карту');
    entry.expand.setAttribute('aria-expanded', String(entry.expanded));
    entry.reset.textContent = text('Reset size', 'Сбросить размер');
    entry.move.textContent=text('Move map','Переместить карту');entry.move.hidden=!entry.expanded;
    entry.move.title=text('Drag to move. Arrow keys move the window; Home centers it.','Перетаскивайте для перемещения. Стрелки перемещают окно, Home возвращает в центр.');
    entry.handle.setAttribute('aria-label', entry.expanded ? text('Resize expanded map', 'Изменить размер развёрнутой карты') : text('Resize map height', 'Изменить высоту карты'));
    entry.handle.title = text('Drag to resize. Use arrow keys when focused.', 'Перетаскивайте для изменения размера. При фокусе используйте стрелки.');
  }
  function layout(entry: Entry): void {
    if (entry.kind === 'world' && (entry.expanded || entry.size.height !== undefined)) {
      const stage = entry.root.querySelector<HTMLElement>('[class~="min-h-[400px]"].overflow-hidden.group');
      if (stage) set(entry, 'min-height', '0px', stage);
    }
    if (entry.expanded) {
      const width = clamp(entry.size.width ?? innerWidth * .8, 320, Math.max(100, innerWidth - 24));
      const height = clamp(entry.size.expandedHeight ?? innerHeight * .72, 240, Math.max(100, innerHeight - 24));
      entry.left = clamp(entry.left ?? (innerWidth - width) / 2, 12, Math.max(12, innerWidth - width - 12));
      entry.top = clamp(entry.top ?? (innerHeight - height) / 2, 12, Math.max(12, innerHeight - height - 12));
      for (const [property, value] of Object.entries({ position: 'fixed', left: `${entry.left}px`, top: `${entry.top}px`, 'box-sizing': 'border-box',
        width: `${width}px`, height: `${height}px`, 'min-height': '0px', 'max-height': 'none', 'min-width': '0px', 'max-width': 'none',
        flex: 'none', margin: '0', padding: '0', border: '1px solid hsl(var(--border, 0 0% 40%))',
        'border-radius': '8px', background: 'hsl(var(--background, 0 0% 6%))', color: 'hsl(var(--foreground, 0 0% 96%))', 'z-index': '10000' })) set(entry, property, value);
      entry.handle.style.cssText = 'position:absolute;right:0;bottom:0;width:22px;height:22px;z-index:30;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,hsl(var(--foreground,0 0% 96%)) 50%,transparent 58%,hsl(var(--foreground,0 0% 96%)) 68%,transparent 76%);border-radius:0 0 6px 0';
      entry.handle.setAttribute('aria-orientation', 'vertical');
      entry.handle.setAttribute('aria-valuemin', String(Math.min(320, innerWidth - 24)));
      entry.handle.setAttribute('aria-valuemax', String(Math.max(100, innerWidth - 24)));
      entry.handle.setAttribute('aria-valuenow', String(width));
      entry.handle.setAttribute('aria-valuetext', `${width} × ${height}`);
    } else {
      if (entry.size.height !== undefined) {
        set(entry, 'height', `${clamp(entry.size.height, minimum(entry), 1600)}px`); set(entry, 'min-height', '0px'); set(entry, 'flex', 'none');
      }
      // The map canvas is already positioned against this box; the controls share it.
      set(entry, 'position', 'relative');
      entry.handle.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:10px;z-index:30;cursor:row-resize;touch-action:none;background:hsl(var(--border,0 0% 40%)/.6);border-radius:4px';
      entry.handle.setAttribute('aria-orientation', 'horizontal');
      entry.handle.setAttribute('aria-valuemin', String(minimum(entry))); entry.handle.setAttribute('aria-valuemax', '1600');
      entry.handle.setAttribute('aria-valuenow', String(Math.round(entry.root.getBoundingClientRect().height)));
      entry.handle.removeAttribute('aria-valuetext');
    }
    labels(entry);
  }
  function close(entry: Entry): void {
    if (!entry.expanded) return;
    if (entry.popover) {
      // React may have removed the map and automatically closed its popover.
      if (entry.root.matches(':popover-open')) entry.root.hidePopover();
      entry.root.removeAttribute('popover'); entry.popover = false;
    }
    entry.expanded = false; entry.drag = undefined; entry.moving=undefined;
    restoreStyles(entry); layout(entry);
  }
  function toggle(entry: Entry): void {
    if (entry.expanded) close(entry);
    else {
      entry.expanded = true;
      entry.left=entry.size.left;entry.top=entry.size.top;
      // The top layer avoids clipping by the website's scrolling/sidebar containers.
      // Keep the existing canvas in its React parent so its map interactions continue.
      try { entry.root.setAttribute('popover', 'manual'); entry.root.showPopover(); entry.popover = true; }
      catch { entry.root.removeAttribute('popover'); }
      layout(entry);
    }
    entry.expand.focus({ preventScroll: true });
  }
  function resize(entry: Entry, width: number, height: number): void {
    if (entry.expanded) {
      entry.size.width = clamp(width, 320, Math.max(100, innerWidth - 24));
      entry.size.expandedHeight = clamp(height, 240, Math.max(100, innerHeight - 24));
    } else entry.size.height = clamp(height, minimum(entry), 1600);
    layout(entry);
  }
  function remove(entry: Entry): void {
    close(entry); entry.controls.remove(); entry.handle.remove(); restoreStyles(entry);
    entries.delete(entry.root);
  }
  function add(root: HTMLElement, campaign: string, kind: 'battle' | 'world'): void {
    const controls = document.createElement('div'); controls.setAttribute('data-ff-desktop-map-controls', 'true'); controls.setAttribute('translate', 'no');
    controls.style.cssText = 'position:absolute;left:8px;top:8px;z-index:30;display:flex;gap:6px;max-width:calc(100% - 52px);flex-wrap:wrap';
    const expand = document.createElement('button'), reset = document.createElement('button');
    for (const button of [expand, reset]) {
      button.type = 'button'; button.style.cssText = 'font:12px system-ui;padding:5px 8px;border:1px solid hsl(var(--border,0 0% 40%));border-radius:5px;background:hsl(var(--background,0 0% 6%));color:hsl(var(--foreground,0 0% 96%));cursor:pointer';
      controls.append(button);
    }
    const move=document.createElement('button');move.type='button';move.setAttribute('data-ff-desktop-map-mover','true');move.style.cssText=expand.style.cssText+';cursor:grab;touch-action:none';controls.append(move);
    const handle = document.createElement('div'); handle.tabIndex = 0; handle.setAttribute('role', 'separator'); handle.setAttribute('translate', 'no'); handle.setAttribute('data-ff-desktop-map-resizer', 'true');
    const entry: Entry = { root, controls, expand, reset, move, kind, handle, styles: new Map(), size: readSize(campaign,kind), campaign, expanded: false, popover: false };
    entries.set(root, entry); root.append(controls, handle);
    controls.addEventListener('pointerdown', event => event.stopPropagation());
    expand.addEventListener('click', event => { event.stopPropagation(); toggle(entry); });
    reset.addEventListener('click', event => {
      event.stopPropagation(); entry.size = {}; entry.left=entry.top=undefined; saveSize(entry); restoreStyles(entry); layout(entry);
    });
    const savePosition=():void=>{entry.size.left=entry.left;entry.size.top=entry.top;saveSize(entry);};
    move.addEventListener('pointerdown',event=>{if(!entry.expanded||event.button!==0)return;event.preventDefault();event.stopPropagation();entry.moving={x:event.clientX,y:event.clientY,left:entry.left!,top:entry.top!};move.setPointerCapture(event.pointerId);});
    move.addEventListener('pointermove',event=>{if(!entry.moving)return;event.preventDefault();event.stopPropagation();entry.left=entry.moving.left+event.clientX-entry.moving.x;entry.top=entry.moving.top+event.clientY-entry.moving.y;layout(entry);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])move.addEventListener(type,()=>{if(entry.moving){entry.moving=undefined;savePosition();}});
    move.addEventListener('keydown',event=>{if(!entry.expanded||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();event.stopPropagation();const step=event.shiftKey?64:24;if(event.key==='Home')entry.left=entry.top=undefined;else{entry.left!+=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;entry.top!+=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;}layout(entry);savePosition();});
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const box = root.getBoundingClientRect(); entry.drag = { x: event.clientX, y: event.clientY, width: box.width, height: box.height };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!entry.drag) return;
      event.preventDefault(); event.stopPropagation();
      resize(entry, entry.drag.width + event.clientX - entry.drag.x, entry.drag.height + event.clientY - entry.drag.y);
    });
    const finish = (): void => { if (entry.drag) { entry.drag = undefined; saveSize(entry); } };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, finish);
    handle.addEventListener('keydown', event => {
      const step = event.shiftKey ? 64 : 24, box = root.getBoundingClientRect();
      if (['ArrowUp', 'ArrowDown', ...(entry.expanded ? ['ArrowLeft', 'ArrowRight'] : [])].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        resize(entry, box.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), box.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
        saveSize(entry);
      }
    });
    layout(entry);
  }
  function scan(): void {
    frame = 0;
    const campaign = /\/([^/]+)\/play\/?$/.exec(location.pathname)?.[1];
    const roots = new Map<HTMLElement,'battle'|'world'>();
    if (campaign) {
      for (const canvas of document.querySelectorAll('canvas.absolute.inset-0')) {
        if (canvas.closest('[role="dialog"],form')) continue;
        const root = canvas.classList.contains('touch-none') ? canvas.closest<HTMLElement>('[class~="min-h-[300px]"]') : null;
        if (root) roots.set(root,'battle');
        else {
          const stage=canvas.closest<HTMLElement>('[class~="min-h-[400px]"].overflow-hidden.group');
          const world=stage?.parentElement;
          if(world?.matches('.w-full.h-full.flex.flex-1.relative'))roots.set(world,'world');
        }
      }
    }
    for (const entry of entries.values()) {
      if (!roots.has(entry.root) || entry.campaign !== campaign) remove(entry);
      else {
        // React can replace the canvas children while keeping the same map box.
        if (!entry.root.contains(entry.controls)) entry.root.append(entry.controls);
        if (!entry.root.contains(entry.handle)) entry.root.append(entry.handle);
      }
    }
    if (campaign) for (const [root,kind] of roots) if (!entries.has(root) && !root.hasAttribute('popover')) add(root, campaign,kind);
  }
  function schedule(): void { if (!frame) frame = requestAnimationFrame(scan); }
  function onResize(): void { for (const entry of entries.values()) layout(entry); }
  function onEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    for (const entry of entries.values()) if (entry.expanded) { close(entry); entry.expand.focus({ preventScroll: true }); event.preventDefault(); break; }
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','id','role'] });
  window.addEventListener('popstate', schedule); window.addEventListener('resize', onResize); document.addEventListener('keydown', onEscape);
  host[key] = {
    setLocale(value) { language = value; for (const entry of entries.values()) labels(entry); },
    dispose() {
      observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('popstate', schedule); window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onEscape);
      for (const entry of entries.values()) remove(entry);
      delete host[key];
    },
  };
  scan();
}
