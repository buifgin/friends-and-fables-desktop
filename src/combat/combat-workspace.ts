// Serialized into the sandboxed website; keep all dependencies inside this function.
export function configureCombatWorkspace(enabled: boolean, locale: 'en' | 'ru'): void {
  type Preferences = { width?: number; density: 'compact' | 'comfortable' };
  type Controller = { update(value: 'en' | 'ru'): void; dispose(): void };
  const key = '__friendsFablesDesktopCombatWorkspace';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  const root = document.documentElement;
  let language = locale, disposed = false, frame = 0, campaign = '', route = '';
  let panel: HTMLElement | null = null, densityBefore: string | null = null;
  let preferences: Preferences = { density: 'compact' };
  let drag: { id: number; x: number; width: number } | null = null;
  let minimum = 280, maximum = 720, applied = 308;
  const properties = new Map<string, { before: string; priority: string; written: string }>();
  const storageKey = (): string => `ff-desktop-combat-workspace-v1:${campaign}`;
  function read(): Preferences {
    try {
      const value = localStorage.getItem(storageKey());
      if (!value || value.length > 256) return { density: 'compact' };
      const raw = JSON.parse(value);
      return { density: raw?.density === 'comfortable' ? 'comfortable' : 'compact',
        width: typeof raw?.width === 'number' && Number.isFinite(raw.width) && raw.width >= 280 && raw.width <= 1200 ? Math.round(raw.width) : undefined };
    } catch { return { density: 'compact' }; }
  }
  function save(): void { try { localStorage.setItem(storageKey(), JSON.stringify(preferences)); } catch { /* Restricted storage still allows local controls. */ } }
  function set(name: string, value: string): void {
    let record = properties.get(name);
    if (!record) { record = { before: root.style.getPropertyValue(name), priority: root.style.getPropertyPriority(name), written: value }; properties.set(name, record); }
    record.written = value;
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  }
  function restore(): void {
    for (const [name, record] of properties) {
      if (root.style.getPropertyValue(name) !== record.written) continue;
      if (record.before) root.style.setProperty(name, record.before, record.priority); else root.style.removeProperty(name);
    }
    properties.clear();
  }
  const style = document.createElement('style');
  style.textContent = `
    [data-ff-combat-workspace-tools]{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:6px;box-sizing:border-box;min-height:50px;padding:8px 48px 8px 12px;background:hsl(var(--card,0 0% 12%));color:inherit;border-bottom:1px solid hsl(var(--border,0 0% 50%))}
    [data-ff-combat-shortcuts-slot]{display:contents}
    [data-ff-combat-density]{font:inherit;font-size:12px;line-height:1.3;white-space:normal;overflow-wrap:anywhere;max-width:100%;min-height:30px;border:1px solid hsl(var(--border,0 0% 50%));border-radius:6px;padding:4px 8px;color:inherit;background:transparent;cursor:pointer}
    [data-ff-combat-workspace-density] [data-ff-combat-heading], [data-ff-combat-workspace-density] > h2:not(.hidden):not([hidden]){top:var(--ff-combat-tools-height,50px)}
    [data-ff-combat-workspace-density=comfortable] button.group:has(> div > svg.lucide){min-height:96px!important;padding:14px!important;gap:10px!important}
    [data-ff-combat-workspace-density=comfortable] [data-ff-combat-body]{padding:16px}
    [data-ff-combat-workspace-density=comfortable] .grid:has(> button.group){gap:12px!important}
    [data-ff-combat-resizer]{position:fixed;left:calc(var(--ff-combat-rail-width) + var(--ff-combat-width) - 4px);top:calc(var(--ff-combat-rail-top) + 50px);bottom:0;width:8px;z-index:3;cursor:ew-resize;touch-action:none;user-select:none;background:transparent}
    [data-ff-combat-resizer]:hover,[data-ff-combat-resizer]:focus-visible{background:hsl(var(--ring,var(--primary,0 0% 70%)));outline:2px solid hsl(var(--ring,var(--primary,0 0% 70%)));outline-offset:-2px}
  `;
  document.head.append(style);
  const tools = document.createElement('div'); tools.setAttribute('data-ff-combat-workspace-tools', ''); tools.setAttribute('data-ff-translation-ignore', 'true');
  const density = document.createElement('button'); density.type = 'button'; density.setAttribute('data-ff-combat-density', '');
  const slot = document.createElement('div'); slot.setAttribute('data-ff-combat-shortcuts-slot', ''); tools.append(density, slot);
  const handle = document.createElement('div'); handle.setAttribute('data-ff-combat-resizer', ''); handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical'); handle.setAttribute('data-ff-translation-ignore', 'true'); handle.tabIndex = 0;
  function labels(): void {
    const comfortable = preferences.density === 'comfortable';
    const label = language === 'ru' ? 'Просторный вид' : 'Comfortable layout';
    if (density.textContent !== label) density.textContent = label;
    density.setAttribute('aria-pressed', String(comfortable));
    density.title = language === 'ru' ? 'Переключить плотность: компактный / просторный' : 'Toggle density: compact / comfortable';
    handle.setAttribute('aria-label', language === 'ru' ? 'Ширина панели боя' : 'Combat panel width');
    handle.title = language === 'ru' ? 'Перетащите или используйте стрелки. Home или двойной щелчок — сброс.' : 'Drag or use arrow keys. Home or double-click resets width.';
    handle.setAttribute('aria-valuetext', `${applied} ${language === 'ru' ? 'пикселей' : 'pixels'}`);
  }
  function geometry(): void {
    if (!panel) return;
    const rail = Math.max(0, parseFloat(getComputedStyle(root).getPropertyValue('--ff-combat-rail-width')) || 64);
    const available = Math.max(1, innerWidth - rail - 8);
    // Preserve 240px for chat whenever the minimum usable panel also fits.
    maximum = Math.min(1200, available >= 520 ? available - 240 : available);
    minimum = Math.min(280, maximum);
    const defaultWidth = Math.max(280, Math.min(390, innerWidth * .28));
    applied = Math.round(Math.max(minimum, Math.min(maximum, preferences.width ?? defaultWidth)));
    set('--ff-combat-width', `${applied}px`);
    const height = Math.ceil(tools.getBoundingClientRect().height);
    set('--ff-combat-tools-height', `${height}px`);
    if (panel.getAttribute('data-ff-combat-workspace-density') !== preferences.density) panel.setAttribute('data-ff-combat-workspace-density', preferences.density);
    for (const [name, value] of [['aria-valuemin', minimum], ['aria-valuemax', maximum], ['aria-valuenow', applied]] as const) {
      if (handle.getAttribute(name) !== String(value)) handle.setAttribute(name, String(value));
    }
    labels();
  }
  function stopDrag(): void {
    if (drag && handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
    drag = null;
  }
  function unmount(): void {
    stopDrag(); resize.disconnect(); tools.remove(); handle.remove();
    if (panel && panel.getAttribute('data-ff-combat-workspace-density') === preferences.density) {
      if (densityBefore === null) panel.removeAttribute('data-ff-combat-workspace-density'); else panel.setAttribute('data-ff-combat-workspace-density', densityBefore);
    }
    panel = null; restore();
  }
  function scan(): void {
    frame = 0; if (disposed) return;
    const nextRoute = location.pathname + location.search;
    const play = /\/play\/?$/.test(location.pathname) && (!new URLSearchParams(location.search).has('view') || new URLSearchParams(location.search).get('view') === 'play');
    if (nextRoute !== route) { unmount(); route = nextRoute; campaign = location.pathname.replace(/\/play\/?$/, ''); preferences = read(); }
    const next = play && root.getAttribute('data-ff-combat-open') === 'true' ? document.querySelector<HTMLElement>('[data-ff-combat-docked]') : null;
    if (next !== panel) {
      unmount(); panel = next;
      if (panel) { densityBefore = panel.getAttribute('data-ff-combat-workspace-density'); panel.prepend(tools); panel.append(handle); resize.observe(tools); resize.observe(panel); }
    }
    geometry();
  }
  function schedule(): void { if (!disposed && !frame) frame = requestAnimationFrame(scan); }
  function requestWidth(width?: number): void { preferences.width = width === undefined ? undefined : Math.round(Math.max(280, Math.min(1200, width))); geometry(); save(); }
  density.addEventListener('click', () => { preferences.density = preferences.density === 'compact' ? 'comfortable' : 'compact'; geometry(); save(); });
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !panel) return;
    event.preventDefault(); handle.focus(); drag = { id: event.pointerId, x: event.clientX, width: applied }; handle.setPointerCapture(event.pointerId);
  });
  function move(event: PointerEvent): void { if (drag?.id === event.pointerId) { preferences.width = Math.round(Math.max(280, Math.min(1200, drag.width + event.clientX - drag.x))); geometry(); } }
  function end(event: PointerEvent): void { if (drag?.id === event.pointerId) { stopDrag(); save(); } }
  handle.addEventListener('dblclick', () => requestWidth());
  handle.addEventListener('keydown', event => {
    if (event.key === 'Home') { event.preventDefault(); requestWidth(); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); requestWidth(applied + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 40 : 10)); }
  });
  const resize = new ResizeObserver(schedule);
  const observer = new MutationObserver(records => {
    if (records.some(record => !tools.contains(record.target) && record.target !== handle)) schedule();
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ff-combat-open', 'data-ff-combat-docked', 'style'] });
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  window.addEventListener('resize', schedule); window.addEventListener('popstate', schedule);
  const timer = window.setInterval(schedule, 500);
  host[key] = {
    update(value) { language = value; labels(); schedule(); },
    dispose() { disposed = true; cancelAnimationFrame(frame); clearInterval(timer); observer.disconnect(); unmount();
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      window.removeEventListener('resize', schedule); window.removeEventListener('popstate', schedule); style.remove(); delete host[key]; }
  };
  scan();
}
