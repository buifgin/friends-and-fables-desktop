// Serialized into the sandboxed website; keep all dependencies inside this function.
export function configureCombatWorkspace(enabled: boolean, locale: 'en' | 'ru'): void {
  type Preferences = { width?: number };
  type Controller = { update(value: 'en' | 'ru'): void; dispose(): void };
  const key = '__friendsFablesDesktopCombatWorkspace';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  const root = document.documentElement;
  let language = locale, disposed = false, frame = 0, campaign = '', route = '';
  let panel: HTMLElement | null = null;
  let preferences: Preferences = {};
  let drag: { id: number; x: number; width: number } | null = null;
  let minimum = 280, maximum = 720, applied = 308;
  const properties = new Map<string, { before: string; priority: string; written: string }>();
  const storageKey = (): string => `ff-desktop-combat-workspace-v1:${campaign}`;
  function read(): Preferences {
    try {
      const value = localStorage.getItem(storageKey());
      if (!value || value.length > 256) return {};
      const raw = JSON.parse(value);
      return { width: typeof raw?.width === 'number' && Number.isFinite(raw.width) && raw.width >= 280 && raw.width <= 1200 ? Math.round(raw.width) : undefined };
    } catch { return {}; }
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
    [data-ff-combat-workspace-tools]{position:sticky;top:0;z-index:2;display:flex;flex:0 0 auto;box-sizing:border-box;padding-right:50px;color:hsl(var(--foreground,0 0% 96%));background:hsl(var(--card,0 0% 12%));border-bottom:1px solid hsl(var(--border,0 0% 50%))}
    [data-ff-combat-workspace-tools]:has(> [data-ff-combat-shortcuts-slot]:empty){display:none}
    [data-ff-combat-shortcuts-slot]{display:block;flex:1 1 auto;min-width:0}
    [data-ff-combat-resizer]{position:fixed;left:calc(var(--ff-combat-rail-width) + var(--ff-combat-width) - 4px);top:calc(var(--ff-combat-rail-top) + var(--ff-combat-tools-height,0px));bottom:0;width:8px;z-index:3;cursor:ew-resize;touch-action:none;user-select:none;background:transparent}
    [data-ff-combat-resizer]:hover,[data-ff-combat-resizer]:focus-visible{background:hsl(var(--ring,var(--primary,0 0% 70%)));outline:2px solid hsl(var(--ring,var(--primary,0 0% 70%)));outline-offset:-2px}
  `;
  document.head.append(style);
  const tools = document.createElement('div'); tools.setAttribute('data-ff-combat-workspace-tools', ''); tools.setAttribute('data-ff-translation-ignore', 'true');
  const slot = document.createElement('div'); slot.setAttribute('data-ff-combat-shortcuts-slot', ''); tools.append(slot);
  const handle = document.createElement('div'); handle.setAttribute('data-ff-combat-resizer', ''); handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical'); handle.setAttribute('data-ff-translation-ignore', 'true'); handle.tabIndex = 0;
  function labels(): void {
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
      if (panel) { panel.prepend(tools); panel.append(handle); resize.observe(tools); resize.observe(panel); }
    }
    geometry();
  }
  function schedule(): void { if (!disposed && !frame) frame = requestAnimationFrame(scan); }
  function requestWidth(width?: number): void { preferences.width = width === undefined ? undefined : Math.round(Math.max(280, Math.min(maximum, width))); geometry(); save(); }
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !panel) return;
    event.preventDefault(); handle.focus(); drag = { id: event.pointerId, x: event.clientX, width: applied }; handle.setPointerCapture(event.pointerId);
  });
  function move(event: PointerEvent): void { if (drag?.id === event.pointerId) { preferences.width = Math.round(Math.max(280, Math.min(maximum, drag.width + event.clientX - drag.x))); geometry(); } }
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
