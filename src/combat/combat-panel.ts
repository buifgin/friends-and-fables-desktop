// Serialized into the sandboxed website. Keep this function self-contained.
export function configureCombatPanel(enabled: boolean, locale: 'en' | 'ru', css: string): void {
  type Controller = { update(locale: 'en' | 'ru', css: string): void; dispose(): void };
  const key = '__friendsFablesDesktopCombatPanel';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale, css); else host[key]!.dispose(); return; }
  if (!enabled) return;
  let language = locale, disposed = false, queued = false, route = '', encounter = false, attempted = false;
  let picker: HTMLElement | null = null, chat: HTMLElement | null = null, action: HTMLButtonElement | null = null, dice: HTMLButtonElement | null = null;
  let mode: 'actions' | 'skills' = 'actions', launched: 'actions' | 'skills' | null = null, requested: 'actions' | 'skills' | null = null;
  const preexisting = new WeakSet(document.querySelectorAll('[role="dialog"]'));
  const style = document.createElement('style'); style.textContent = css; document.head.append(style);
  const launcher = document.createElement('button'); launcher.type = 'button'; launcher.setAttribute('data-ff-combat-launcher', '');
  launcher.setAttribute('data-ff-translation-ignore', 'true'); launcher.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 3 3 4l12 12m5-13 1 1L9 16M3 3l1 5 4-4m13-1-1 5-4-4M13 17l4-4M7 13l4 4M16 16l5 5M8 16l-5 5"/></svg>'; launcher.hidden = true; document.body.append(launcher);
  const tools = document.createElement('div'); tools.setAttribute('data-ff-combat-tools', ''); tools.setAttribute('data-ff-translation-ignore', 'true'); tools.hidden = true;
  const actionsTab = document.createElement('button'), skillsTab = document.createElement('button');
  for (const [button, name] of [[actionsTab, 'actions'], [skillsTab, 'skills']] as const) {
    button.type = 'button'; button.setAttribute('data-ff-combat-mode', name);
    button.addEventListener('click', () => { if (otherLayer()) return; if (picker && mode === name) return; if (picker) close(); requested = name; schedule(); }); tools.append(button);
  }
  const toolbarClose = document.createElement('button'); toolbarClose.type = 'button';
  toolbarClose.setAttribute('data-ff-combat-toolbar-close', ''); toolbarClose.setAttribute('data-ff-combat-close', '');
  toolbarClose.setAttribute('data-ff-translation-ignore', 'true');
  toolbarClose.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  toolbarClose.addEventListener('click', () => { if (!otherLayer() && picker) close(); });
  tools.append(toolbarClose);
  document.body.append(tools);
  // Snapshots describe the native modal state, not the pre-modal state. Restore
  // them before native closing so Radix can then perform its own cleanup.
  let undo: (() => void)[] = [];
  const hiddenBefore = new Map<HTMLElement, string | null>();
  function rememberBackground(): void {
    hiddenBefore.clear();
    for (const root of [chat, ...document.querySelectorAll<HTMLElement>('canvas.touch-none')]) {
      if (!root || root.closest('form,[role="dialog"]')) continue;
      for (let node: HTMLElement | null = root; node && node !== document.body; node = node.parentElement) hiddenBefore.set(node, node.getAttribute('aria-hidden'));
    }
  }
  let bodyBefore = ['pointer-events', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
  function attribute(node: HTMLElement, name: string, value: string | null): void {
    const old = node.getAttribute(name);
    if (old === value) return;
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
    undo.push(() => { if (node.getAttribute(name) !== value) return; if (old === null) node.removeAttribute(name); else node.setAttribute(name, old); });
  }
  function property(node: HTMLElement, name: string, value: string): void {
    const old = node.style.getPropertyValue(name), priority = node.style.getPropertyPriority(name);
    node.style.setProperty(name, value, 'important');
    undo.push(() => { if (node.style.getPropertyValue(name) !== value || node.style.getPropertyPriority(name) !== 'important') return;
      if (old) node.style.setProperty(name, old, priority); else node.style.removeProperty(name); });
  }
  function release(nativeRemoved = false): void {
    // Native unmount has already restored aria/body; replaying modal snapshots
    // afterwards would hide the campaign and lock its pointer again.
    if (!nativeRemoved) for (const restore of undo.reverse()) restore();
    else for (const [name, value, priority] of bodyBefore) {
      if (document.body.style.getPropertyPriority(name) !== 'important' || document.body.style.getPropertyValue(name) !== 'auto') continue;
      if (value) document.body.style.setProperty(name, value, priority); else document.body.style.removeProperty(name);
    }
    undo = [];
    document.documentElement.removeAttribute('data-ff-combat-open');
    chat?.removeAttribute('data-ff-combat-chat');
    picker?.removeAttribute('data-ff-combat-panel'); picker?.removeAttribute('data-ff-combat-docked');
    picker?.querySelector('[data-ff-combat-heading]')?.removeAttribute('data-ff-combat-heading');
    picker?.querySelector('[data-ff-combat-close]')?.removeAttribute('data-ff-combat-close');
    launcher.setAttribute('aria-expanded', 'false'); tools.hidden = true;
  }
  const visible = (element: Element): boolean => element.getAttribute('data-state') !== 'closed' && !element.hasAttribute('hidden') && getComputedStyle(element).display !== 'none';
  function otherLayer(): boolean {
    return Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]'))
      .some(node => node !== picker && visible(node));
  }
  function background(target: EventTarget | null): boolean {
    if (!(target instanceof Node) || picker?.contains(target)) return false;
    return launcher.contains(target) || tools.contains(target) || !!chat?.contains(target) || Array.from(document.querySelectorAll('canvas.touch-none')).some(canvas => !canvas.closest('form,[role="dialog"]') && (canvas === target || canvas.parentElement?.contains(target)));
  }
  function live(): boolean { return !!picker?.isConnected && picker.hasAttribute('data-ff-combat-docked') && !otherLayer(); }
  function cancelOutside(event: Event): void {
    const original = (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent;
    if (live() && background(original?.target ?? null)) event.preventDefault();
  }
  // Registered before new native FocusScope listeners. Root/target React
  // handlers have already received the event by document bubble phase.
  function focusGate(event: FocusEvent): void {
    if (live() && background(event.type === 'focusout' ? event.relatedTarget : event.target)) event.stopImmediatePropagation();
  }
  function wheelGate(event: WheelEvent): void { if (live() && background(event.target)) event.stopImmediatePropagation(); }
  document.addEventListener('wheel', wheelGate);
  document.addEventListener('focusin', focusGate); document.addEventListener('focusout', focusGate);
  document.addEventListener('dismissableLayer.pointerDownOutside', cancelOutside, true);
  document.addEventListener('dismissableLayer.focusOutside', cancelOutside, true);
  function close(): void {
    const current = picker; release(); attempted = true;
    current?.querySelector<HTMLButtonElement>('button:has(.lucide-x)')?.click();
    picker = null; launched = null;
  }
  function labels(): void {
    launcher.setAttribute('aria-label', language === 'ru' ? 'Действия в бою' : 'Combat actions');
    launcher.title = launcher.getAttribute('aria-label')!;
    toolbarClose.setAttribute('aria-label', language === 'ru' ? 'Закрыть панель действий' : 'Close combat actions panel');
    toolbarClose.title = toolbarClose.getAttribute('aria-label')!;
    actionsTab.textContent = language === 'ru' ? 'Действия' : 'Actions'; skillsTab.textContent = language === 'ru' ? 'Навыки / проверки' : 'Skills / checks';
  }
  function active(root: HTMLElement): boolean {
    for (const node of [root, ...root.querySelectorAll('button')]) {
      let fiber = Object.entries(node).find(([name]) => name.startsWith('__reactFiber'))?.[1] as { memoizedProps?: Record<string, unknown>; return?: unknown } | undefined;
      for (let depth = 0; fiber && depth < 30; depth++, fiber = fiber.return as typeof fiber) {
        const props = fiber.memoizedProps;
        if (typeof props?.encounterActive === 'boolean') return props.encounterActive;
        const value = props?.value as { campaign?: Record<string, unknown> } | undefined;
        const campaign = (props?.campaign ?? value?.campaign) as Record<string, unknown> | undefined;
        if (campaign && Object.hasOwn(campaign, 'active_encounter_id')) {
          const id = campaign.active_encounter_id; return typeof id === 'string' && !!id || typeof id === 'number' && Number.isFinite(id) && id > 0;
        }
      }
    }
    return !!action;
  }
  function open(nextMode: 'actions' | 'skills' = 'actions'): void {
    attempted = true;
    const trigger = nextMode === 'skills' ? dice : action;
    if (!trigger || otherLayer() || picker) return;
    mode = nextMode; launched = nextMode; rememberBackground();
    bodyBefore = ['pointer-events', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
    trigger.click(); schedule();
  }
  function dock(): void {
    if (!picker || undo.length || otherLayer()) return;
    attribute(picker, 'data-ff-combat-docked', ''); attribute(picker, 'data-ff-combat-panel', '');
    const heading = Array.from(picker.querySelectorAll<HTMLElement>('h2')).find(node => /^(Choose Action|Выберите действие)$/i.test(node.textContent?.trim() ?? ''));
    if (heading) attribute(heading, 'data-ff-combat-heading', '');
    const closeButton = picker.querySelector<HTMLElement>('button:has(.lucide-x)'); if (closeButton) attribute(closeButton, 'data-ff-combat-close', '');
    if (chat) attribute(chat, 'data-ff-combat-chat', '');
    attribute(document.documentElement, 'data-ff-combat-open', 'true');
    attribute(picker, 'aria-modal', 'false');
    const overlay = picker.previousElementSibling;
    if (overlay instanceof HTMLElement && !overlay.children.length && overlay.matches('[data-state="open"].fixed.inset-0.z-50')) {
      property(overlay, 'display', 'none'); property(overlay, 'pointer-events', 'none');
    }
    // Only lift the native lock while this is the sole layer. Nested native
    // layers inherit restored modal state before any interaction is allowed.
    if (document.body.style.pointerEvents === 'none') property(document.body, 'pointer-events', 'auto');
    if (document.body.style.overflow === 'hidden') property(document.body, 'overflow', 'auto');
    for (const root of [chat, ...document.querySelectorAll<HTMLElement>('canvas.touch-none')]) {
      if (!root || root.closest('form,[role="dialog"]')) continue;
      for (let node: HTMLElement | null = root; node && node !== document.body; node = node.parentElement) {
        if (node.getAttribute('aria-hidden') === 'true' && hiddenBefore.has(node) && hiddenBefore.get(node) !== 'true') attribute(node, 'aria-hidden', null);
      }
    }
    launcher.setAttribute('aria-expanded', 'true'); tools.hidden = false;
    actionsTab.setAttribute('aria-pressed', String(mode === 'actions')); skillsTab.setAttribute('aria-pressed', String(mode === 'skills')); skillsTab.disabled = !dice;
  }
  function scan(): void {
    queued = false; if (disposed) return;
    const nextRoute = location.pathname + location.search;
    if (route !== nextRoute) { if (picker) close(); route = nextRoute; encounter = false; attempted = false; requested = null; }
    const play = /\/play\/?$/.test(location.pathname) && (!new URLSearchParams(location.search).has('view') || new URLSearchParams(location.search).get('view') === 'play');
    const editor = document.querySelector<HTMLElement>('.tiptap[contenteditable="true"]');
    let composer = editor?.parentElement ?? null;
    while (composer && !composer.querySelector('button .lucide-dice-3,button .lucide-dice3')) composer = composer.parentElement;
    dice = composer?.querySelector<HTMLButtonElement>('button:has(.lucide-dice-3),button:has(.lucide-dice3)') ?? null;
    action = composer?.querySelector<HTMLButtonElement>('button:has(.lucide-swords)') ?? null;
    chat = editor?.closest<HTMLElement>('.flex-1.h-full.w-full') ?? composer;
    const now = !!(play && composer && active(composer));
    launcher.hidden = !play || !action;
    if (picker && !picker.isConnected) { release(true); picker = null; }
    if (!now && encounter && picker) close();
    if (now !== encounter) { encounter = now; attempted = false; }
    if (!play) return;
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(visible);
    if (!dialogs.length && !picker) rememberBackground();
    const skills = launched === 'skills' ? dialogs.find(dialog => !preexisting.has(dialog) && Array.from(dialog.querySelectorAll('h3')).some(heading => /^(Skills|Навыки)$/i.test(heading.textContent?.trim() ?? '')) && Array.from(dialog.querySelectorAll('button')).some(button => /Acrobatics|акробатик/i.test(button.textContent ?? ''))) : undefined;
    const found = skills ?? Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(dialog => visible(dialog) && Array.from(dialog.querySelectorAll('h2')).some(heading => /^(Choose Action|Выберите действие)$/i.test(heading.textContent?.trim() ?? '')));
    if (found && !preexisting.has(found)) { picker = found; mode = skills ? 'skills' : 'actions'; launched = null; }
    if (picker) { if (otherLayer()) { if (undo.length) release(); } else dock(); }
    launcher.hidden = !play || !action || otherLayer();
    if (requested && !picker && !otherLayer()) { const next = requested; requested = null; open(next); }
    else if (now && !attempted && !found && !otherLayer()) open();
  }
  function schedule(): void { if (!queued && !disposed) { queued = true; queueMicrotask(scan); } }
  const observer = new MutationObserver(schedule); observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'aria-expanded'] });
  const timer = window.setInterval(schedule, 500);
  launcher.addEventListener('click', () => { if (picker) close(); else open(); });
  // Native Escape handles picker dismissal, including its own nested layers.
  document.addEventListener('click', schedule, true); window.addEventListener('popstate', schedule);
  host[key] = {
    update(value, nextCss) { language = value; if (style.textContent !== nextCss) style.textContent = nextCss; labels(); schedule(); },
    dispose() { disposed = true; observer.disconnect(); clearInterval(timer); if (picker) close();
      document.removeEventListener('wheel', wheelGate);
      document.removeEventListener('focusin', focusGate); document.removeEventListener('focusout', focusGate);
      document.removeEventListener('dismissableLayer.pointerDownOutside', cancelOutside, true); document.removeEventListener('dismissableLayer.focusOutside', cancelOutside, true);
      document.removeEventListener('click', schedule, true); window.removeEventListener('popstate', schedule); launcher.remove(); tools.remove(); style.remove(); delete host[key]; }
  };
  labels(); scan();
}
