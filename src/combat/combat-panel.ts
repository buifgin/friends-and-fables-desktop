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
  const controls = document.createElement('div'); controls.setAttribute('data-ff-combat-controls', '');
  controls.setAttribute('data-ff-translation-ignore', 'true'); controls.hidden = true;
  const actionsTab = document.createElement('button'), skillsTab = document.createElement('button');
  for (const [button, name] of [[skillsTab, 'skills'], [actionsTab, 'actions']] as const) {
    button.type = 'button'; button.setAttribute('data-ff-combat-mode', name);
    button.innerHTML = name === 'skills'
      ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/></svg>'
      : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/></svg>';
    button.addEventListener('click', () => {
      if (button.disabled || otherLayer()) return;
      if (reserved && mode === name) { close(); return; }
      if (reserved || picker) close(); requested = name; schedule();
    }); controls.append(button);
  }
  let reserved = false, pending = false, pendingReopened = false, internalLaunch = false;
  const railBefore = ['--ff-combat-rail-width', '--ff-combat-rail-top', '--ff-combat-controls-bottom'].map(name => [name, document.documentElement.style.getPropertyValue(name), document.documentElement.style.getPropertyPriority(name)]);
  const railWritten = new Map<string, string>();
  let mountedRail: HTMLElement | null = null, mountedRailAside: HTMLElement | null = null;
  let railResizeObserver: ResizeObserver | null = null;
  const railAttributes = new Map<string, { before: string | null; written: string }>();
  function setRailAttribute(name: string, value: string | null): void {
    if (!mountedRail) return;
    const saved = railAttributes.get(name);
    if (value === null) {
      if (saved && mountedRail.getAttribute(name) === saved.written) {
        if (saved.before === null) mountedRail.removeAttribute(name); else mountedRail.setAttribute(name, saved.before);
      }
      railAttributes.delete(name); return;
    }
    if (!saved) railAttributes.set(name, { before: mountedRail.getAttribute(name), written: value });
    else saved.written = value;
    if (mountedRail.getAttribute(name) !== value) mountedRail.setAttribute(name, value);
  }
  function restoreRailMount(): void {
    controls.remove(); railResizeObserver?.disconnect();
    if (mountedRail) for (const [name, saved] of railAttributes) {
      if (mountedRail.getAttribute(name) !== saved.written) continue;
      if (saved.before === null) mountedRail.removeAttribute(name); else mountedRail.setAttribute(name, saved.before);
    }
    railAttributes.clear(); mountedRail = null; mountedRailAside = null;
  }
  function resetRailGeometry(): void {
    for (const [name, value, priority] of railBefore) {
      if (document.documentElement.style.getPropertyValue(name) !== railWritten.get(name)) continue;
      if (value) document.documentElement.style.setProperty(name, value, priority); else document.documentElement.style.removeProperty(name);
    }
    railWritten.clear();
  }
  function findNativeRail(): { aside: HTMLElement; group: HTMLElement; settings: HTMLButtonElement } | null {
    for (const group of document.querySelectorAll<HTMLElement>('aside > div')) {
      if (!['flex', 'flex-col', 'gap-4', 'items-center', 'relative', 'z-10'].every(token => group.classList.contains(token))) continue;
      const settings = Array.from(group.children).find((node): node is HTMLButtonElement => node instanceof HTMLButtonElement && !!node.querySelector('svg.lucide-settings'));
      const aside = group.parentElement;
      if (!settings || !(aside instanceof HTMLElement)) continue;
      const box = aside.getBoundingClientRect();
      if (!visible(aside) || box.left !== 0 || box.width < 40 || box.width > 360 || box.height <= 200) continue;
      return { aside, group, settings };
    }
    return null;
  }
  function syncRail(showControls: boolean): void {
    if (!showControls) { restoreRailMount(); resetRailGeometry(); return; }
    const found = findNativeRail();
    if (!found) {
      if (mountedRail) restoreRailMount(); else railResizeObserver?.disconnect();
      resetRailGeometry(); controls.setAttribute('data-ff-combat-controls-fallback', '');
      if (controls.parentElement !== document.body) document.body.append(controls);
      return;
    }
    const railChanged = mountedRail !== found.group || mountedRailAside !== found.aside;
    if (mountedRail !== found.group) {
      restoreRailMount(); mountedRail = found.group; mountedRailAside = found.aside;
      setRailAttribute('data-ff-combat-controls-group', '');
    } else mountedRailAside = found.aside;
    for (const button of controls.querySelectorAll<HTMLButtonElement>('[data-ff-combat-mode]')) {
      if (button.className !== found.settings.className) button.className = found.settings.className;
    }
    controls.removeAttribute('data-ff-combat-controls-fallback');
    if (controls.parentElement !== found.group || controls.nextElementSibling !== found.settings) found.group.insertBefore(controls, found.settings);
    const bottomGroup = Array.from(found.aside.children).find(node => node !== found.group && node instanceof HTMLElement && node.classList.contains('relative') && node.classList.contains('z-10'));
    const available = Math.max(0, found.aside.clientHeight - (bottomGroup?.getBoundingClientRect().height ?? 40) - 24);
    const normalGapHeight = found.group.scrollHeight + (found.group.hasAttribute('data-ff-combat-controls-compact') ? found.group.children.length * 8 : 0);
    setRailAttribute('data-ff-combat-controls-compact', normalGapHeight > available ? '' : null);
    const box = found.aside.getBoundingClientRect();
    setRailAttribute('data-ff-combat-controls-expanded', box.width > 120 ? '' : null);
    const groupBox = found.group.getBoundingClientRect();
    const controlsBottom = groupBox.bottom - box.top + found.aside.scrollTop - 48 + 8;
    for (const [name, value] of [['--ff-combat-rail-width', `${box.width}px`], ['--ff-combat-rail-top', `${box.top}px`], ['--ff-combat-controls-bottom', `${controlsBottom}px`]]) {
      if (document.documentElement.style.getPropertyValue(name) !== value) document.documentElement.style.setProperty(name, value);
      railWritten.set(name, value);
    }
    if (railChanged && railResizeObserver) { railResizeObserver.disconnect(); railResizeObserver.observe(found.aside); railResizeObserver.observe(found.group); }
  }
  const filtered = new Map<HTMLElement, string | null>();
  function restoreFiltered(): void {
    for (const [node, previous] of filtered) {
      if (node.getAttribute('hidden') !== '') continue;
      if (previous === null) node.removeAttribute('hidden'); else node.setAttribute('hidden', previous);
    }
    filtered.clear();
  }
  function filterAdventure(): void {
    if (!picker || mode !== 'skills') return;
    if (encounter) { restoreFiltered(); return; }
    // Exact native list labels only; never filter detail forms or custom dice.
    if (!Array.from(picker.querySelectorAll('h3')).some(node => /^(Skills|Навыки)$/i.test(node.textContent?.trim() ?? ''))) return;
    for (const button of picker.querySelectorAll<HTMLElement>('button')) {
      if (!/^(Attack|Attack Roll|Melee Attack|Ranged Attack|Spell Attack|Spell Attack Roll|Атака|Бросок атаки|Атака в ближнем бою|Атака в дальнем бою|Атака заклинанием|Бросок атаки заклинанием)$/i.test(button.innerText.trim())) continue;
      if (!filtered.has(button)) filtered.set(button, button.getAttribute('hidden'));
      if (!button.hasAttribute('hidden')) button.setAttribute('hidden', '');
    }
  }
  // Keep geometry until the picker closes. Suspend only modal overrides for
  // nested layers, restoring native locks without moving their anchor.
  let modalUndo: (() => void)[] = [], layoutUndo: (() => void)[] = [];
  let modalActive = false;
  const hiddenBefore = new Map<HTMLElement, string | null>();
  function rememberBackground(): void {
    hiddenBefore.clear();
    for (const root of [chat, ...document.querySelectorAll<HTMLElement>('canvas.touch-none')]) {
      if (!root || root.closest('form,[role="dialog"]')) continue;
      for (let node: HTMLElement | null = root; node && node !== document.body; node = node.parentElement) hiddenBefore.set(node, node.getAttribute('aria-hidden'));
    }
  }
  let bodyBefore = ['pointer-events', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
  function attribute(node: HTMLElement, name: string, value: string | null, layout = false): void {
    const old = node.getAttribute(name);
    if (old === value) return;
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
    (layout ? layoutUndo : modalUndo).push(() => { if (node.getAttribute(name) !== value) return; if (old === null) node.removeAttribute(name); else node.setAttribute(name, old); });
  }
  function property(node: HTMLElement, name: string, value: string): void {
    const old = node.style.getPropertyValue(name), priority = node.style.getPropertyPriority(name);
    node.style.setProperty(name, value, 'important');
    modalUndo.push(() => { if (node.style.getPropertyValue(name) !== value || node.style.getPropertyPriority(name) !== 'important') return;
      if (old) node.style.setProperty(name, old, priority); else node.style.removeProperty(name); });
  }
  function suspendModal(nativeRemoved = false): void {
    // Native unmount has already restored aria/body; replaying modal snapshots
    // afterwards would hide the campaign and lock its pointer again.
    if (!nativeRemoved) for (const restore of modalUndo.reverse()) restore();
    else for (const [name, value, priority] of bodyBefore) {
      if (document.body.style.getPropertyPriority(name) !== 'important' || document.body.style.getPropertyValue(name) !== 'auto') continue;
      if (value) document.body.style.setProperty(name, value, priority); else document.body.style.removeProperty(name);
    }
    modalUndo = []; modalActive = false;
  }
  function release(nativeRemoved = false): void {
    suspendModal(nativeRemoved); restoreFiltered();
    reserved = false; pending = false; pendingReopened = false;
    for (const restore of layoutUndo.reverse()) restore();
    layoutUndo = [];
    document.documentElement.removeAttribute('data-ff-combat-open');
    chat?.removeAttribute('data-ff-combat-chat');
    picker?.removeAttribute('data-ff-combat-panel'); picker?.removeAttribute('data-ff-combat-docked');
    picker?.removeAttribute('data-ff-combat-panel-mode');
    picker?.querySelector('[data-ff-combat-heading]')?.removeAttribute('data-ff-combat-heading');
    picker?.querySelector('[data-ff-combat-close]')?.removeAttribute('data-ff-combat-close');
    updateControls();
  }
  const visible = (element: Element): boolean => element.getAttribute('data-state') !== 'closed' && !element.hasAttribute('hidden') && getComputedStyle(element).display !== 'none';
  function otherLayer(): boolean {
    return Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]'))
      .some(node => node !== picker && visible(node));
  }
  function background(target: EventTarget | null): boolean {
    if (!(target instanceof Node) || picker?.contains(target)) return false;
    return controls.contains(target) || !!chat?.contains(target) || Array.from(document.querySelectorAll('canvas.touch-none')).some(canvas => !canvas.closest('form,[role="dialog"]') && (canvas === target || canvas.parentElement?.contains(target)));
  }
  function live(): boolean { return modalActive && !!picker?.isConnected && picker.hasAttribute('data-ff-combat-docked') && !otherLayer(); }
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
    picker = null; launched = null; requested = null; updateControls();
  }
  function labels(): void {
    for (const [button, label] of [[skillsTab, language === 'ru' ? 'Кости' : 'Dice'], [actionsTab, language === 'ru' ? 'Действия боя' : 'Combat actions']] as const) {
      button.setAttribute('aria-label', label); button.title = label;
    }
  }
  function updateControls(): void {
    actionsTab.disabled = !encounter || !action; skillsTab.disabled = !dice;
    for (const [button, name] of [[actionsTab, 'actions'], [skillsTab, 'skills']] as const) {
      const value = String(reserved && mode === name);
      for (const name of ['aria-pressed', 'aria-expanded']) if (button.getAttribute(name) !== value) button.setAttribute(name, value);
    }
  }
  function active(root: HTMLElement): boolean {
    let observed: boolean | undefined;
    for (const node of [root, ...root.querySelectorAll('button')]) {
      let fiber = Object.entries(node).find(([name]) => name.startsWith('__reactFiber'))?.[1] as { memoizedProps?: Record<string, unknown>; return?: unknown } | undefined;
      for (let depth = 0; fiber && depth < 30; depth++, fiber = fiber.return as typeof fiber) {
        const props = fiber.memoizedProps;
        if (typeof props?.encounterActive === 'boolean' && observed === undefined) observed = props.encounterActive;
        const value = props?.value as { campaign?: Record<string, unknown> } | undefined;
        const campaign = (props?.campaign ?? value?.campaign) as Record<string, unknown> | undefined;
        if (campaign && Object.hasOwn(campaign, 'active_encounter_id')) {
          const id = campaign.active_encounter_id; return typeof id === 'string' && !!id || typeof id === 'number' && Number.isFinite(id) && id > 0;
        }
      }
    }
    return observed ?? !!action;
  }
  function open(nextMode: 'actions' | 'skills' = 'actions'): void {
    attempted = true;
    const trigger = nextMode === 'skills' ? dice : action;
    if (!trigger || nextMode === 'actions' && !encounter || otherLayer() || picker) return;
    mode = nextMode; launched = nextMode; rememberBackground();
    bodyBefore = ['pointer-events', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
    internalLaunch = true;
    try { trigger.click(); } finally { internalLaunch = false; }
    schedule();
  }
  function dock(): void {
    if (!picker || modalActive || otherLayer()) return;
    attribute(picker, 'data-ff-combat-docked', '', true); attribute(picker, 'data-ff-combat-panel', '', true);
    attribute(picker, 'data-ff-combat-panel-mode', mode, true);
    const heading = Array.from(picker.querySelectorAll<HTMLElement>('h2')).find(node => /^(Choose Action|Выберите действие)$/i.test(node.textContent?.trim() ?? ''));
    if (heading) attribute(heading, 'data-ff-combat-heading', '', true);
    const closeButton = picker.querySelector<HTMLElement>('button:has(.lucide-x)'); if (closeButton) attribute(closeButton, 'data-ff-combat-close', '', true);
    if (!reserved) {
      reserved = true;
      if (chat) attribute(chat, 'data-ff-combat-chat', '', true);
      attribute(document.documentElement, 'data-ff-combat-open', 'true', true);
    }
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
    modalActive = true; updateControls();
  }
  function scan(): void {
    queued = false; if (disposed) return;
    const nextRoute = location.pathname + location.search;
    if (route !== nextRoute) { if (picker || reserved) close(); route = nextRoute; encounter = false; attempted = false; requested = null; }
    const play = /\/play\/?$/.test(location.pathname) && (!new URLSearchParams(location.search).has('view') || new URLSearchParams(location.search).get('view') === 'play');
    const editor = document.querySelector<HTMLElement>('.tiptap[contenteditable="true"]');
    let composer = editor?.parentElement ?? null;
    while (composer && !composer.querySelector('button .lucide-dice-3,button .lucide-dice3')) composer = composer.parentElement;
    dice = composer?.querySelector<HTMLButtonElement>('button:has(.lucide-dice-3),button:has(.lucide-dice3)') ?? null;
    action = composer?.querySelector<HTMLButtonElement>('button:has(.lucide-swords)') ?? null;
    chat = editor?.closest<HTMLElement>('.flex-1.h-full.w-full') ?? composer;
    const now = !!(play && composer && active(composer));
    controls.hidden = !play || !dice;
    syncRail(play && !!dice);
    if (picker && !picker.isConnected) {
      if (pending) { suspendModal(true); restoreFiltered(); } else release(true);
      picker = null;
    }
    if (!now && encounter && (picker || reserved)) close();
    if (now !== encounter) { encounter = now; attempted = false; }
    updateControls();
    if (!play || !composer) { if (reserved || picker) close(); return; }
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(visible);
    if (!dialogs.length && !picker) rememberBackground();
    const skills = (launched === 'skills' || reserved && mode === 'skills') ? dialogs.find(dialog => {
      if (preexisting.has(dialog)) return false;
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const list = Array.from(dialog.querySelectorAll('h3')).some(heading => /^(Skills|Навыки)$/i.test(heading.textContent?.trim() ?? ''))
        && buttons.some(button => /Acrobatics|акробатик/i.test(button.textContent ?? ''));
      // The native dice launcher remembers its last selected check. On reopen
      // it can render this detail directly, without ever showing the list.
      // Require the observed native controls/title together, and only after
      // our own dice launch; generic Title dialogs are not sufficient.
      // Native die artwork embeds SVG title/style text inside the Roll
      // button. Match its rendered label, not that non-rendered metadata.
      const detail = buttons.some(button => button.querySelector('.lucide-chevron-left') && /^(List|Список)$/i.test(button.innerText.trim()))
        && buttons.some(button => /^(Roll|Бросок)$/i.test(button.innerText.trim()))
        && !!dialog.querySelector('[role="combobox"]') && !!dialog.querySelector('svg:is(#d4,#d6,#d8,#d10,#d12,#d20,#d100)')
        && Array.from(dialog.querySelectorAll('div.text-center.absolute')).some(title => /^(Roll|Бросок)\s+\S/i.test(title.textContent?.trim() ?? ''));
      return list || detail;
    }) : undefined;
    const found = skills ?? Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(dialog => visible(dialog) && Array.from(dialog.querySelectorAll('h2')).some(heading => /^(Choose Action|Выберите действие)$/i.test(heading.textContent?.trim() ?? '')));
    if (found && !preexisting.has(found)) { picker = found; mode = skills ? 'skills' : 'actions'; launched = null; }
    filterAdventure();
    if (picker) { if (otherLayer()) { if (modalActive) suspendModal(); } else dock(); }
    updateControls();
    if (requested && !picker && !otherLayer()) { const next = requested; requested = null; open(next); }
    else if (pending && reserved && !picker && !pendingReopened && !otherLayer()) {
      // Native checks append their result to chat after unmounting the input.
      // Reopen once without giving back the reservation; never retry a missing
      // or deferred native capability, and let result/nested layers finish first.
      pendingReopened = true; open(mode);
    }
    else if (now && !attempted && !reserved && !pending && !found && !otherLayer()) open();
  }
  function schedule(): void { if (!queued && !disposed) { queued = true; queueMicrotask(scan); } }
  const observer = new MutationObserver(schedule); observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'aria-expanded'] });
  railResizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  window.addEventListener('resize', schedule);
  const timer = window.setInterval(schedule, 500);
  function nativeIntent(event: MouseEvent): void {
    if (!(event.target instanceof Node)) return;
    const clicked = event.target instanceof Element ? event.target.closest('button') : null;
    if (clicked && picker?.contains(clicked) && mode === 'skills' && clicked.querySelector('svg:is(#d4,#d6,#d8,#d10,#d12,#d20,#d100)') && /^(Roll|Бросок)$/i.test(clicked.innerText.trim())) { pending = true; pendingReopened = false; attempted = true; }
    if (picker?.querySelector('button:has(.lucide-x)')?.contains(event.target) && !otherLayer()) pending = false;
    const next = dice?.contains(event.target) ? 'skills' : action?.contains(event.target) ? 'actions' : null;
    if (!next || internalLaunch || otherLayer()) return;
    // Observe before native handlers; do not cancel or replace their event.
    if (picker || reserved) close();
    mode = next; launched = next; attempted = true; rememberBackground();
    bodyBefore = ['pointer-events', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
    schedule();
  }
  function submitting(event: Event): void {
    if (picker && event.target instanceof HTMLFormElement && picker.contains(event.target)) {
      pending = true; pendingReopened = false; attempted = true;
    }
  }
  function nativeEscape(event: KeyboardEvent): void { if (event.key === 'Escape' && picker && !otherLayer()) pending = false; }
  document.addEventListener('keydown', nativeEscape, true);
  document.addEventListener('click', nativeIntent, true);
  document.addEventListener('submit', submitting, true);
  // Native Escape handles picker dismissal, including its own nested layers.
  document.addEventListener('click', schedule, true); window.addEventListener('popstate', schedule);
  host[key] = {
    update(value, nextCss) { language = value; if (style.textContent !== nextCss) style.textContent = nextCss; labels(); schedule(); },
    dispose() { disposed = true; observer.disconnect(); clearInterval(timer); if (picker || reserved) close();
      document.removeEventListener('wheel', wheelGate);
      document.removeEventListener('focusin', focusGate); document.removeEventListener('focusout', focusGate);
      document.removeEventListener('dismissableLayer.pointerDownOutside', cancelOutside, true); document.removeEventListener('dismissableLayer.focusOutside', cancelOutside, true);
      document.removeEventListener('keydown', nativeEscape, true); document.removeEventListener('click', nativeIntent, true); document.removeEventListener('submit', submitting, true);
      document.removeEventListener('click', schedule, true); window.removeEventListener('popstate', schedule); window.removeEventListener('resize', schedule);
      restoreRailMount(); resetRailGeometry(); controls.remove(); style.remove();
      delete host[key]; }
  };
  labels(); scan();
}
