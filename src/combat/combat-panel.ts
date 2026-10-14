// Serialized into the sandboxed website. Keep this function self-contained.
export function configureCombatPanel(enabled: boolean, locale: 'en' | 'ru', css: string): void {
  type Controller = { update(locale: 'en' | 'ru', css: string): void; dispose(): void; closeForSettings(): HTMLElement | null | false };
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
    const label = document.createElement('span'); label.setAttribute('data-ff-combat-label', ''); label.setAttribute('aria-hidden', 'true'); label.className = 'font-header'; button.append(label);
    button.addEventListener('click', () => {
      if (button.disabled || otherLayer() || settingsClosing?.isConnected) return;
      settingsSuppressed = false;
      if (reserved && mode === name) { close(); return; }
      if (reserved || picker) close(true); requested = name; schedule();
    }); controls.append(button);
  }
  let reserved = false, pending = false, pendingReopened = false, internalLaunch = false;
  let settingsSuppressed = false, settingsClosing: HTMLElement | null = null;
  let retiringPicker: HTMLElement | null = null, retirementDeadline = 0;
  let retiringClose: HTMLElement | null = null, retiringHeading: HTMLElement | null = null;
  let retiringMode: 'actions' | 'skills' | null = null, retiringHeadingText = '';
  let retiringOwner: Fiber | undefined;
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
  function findNativeRail(): { aside: HTMLElement; group: HTMLElement; settings: HTMLElement } | null {
    for (const group of document.querySelectorAll<HTMLElement>('aside > div')) {
      if (!['flex', 'flex-col', 'relative', 'z-10'].every(token => group.classList.contains(token))) continue;
      const rows = Array.from(group.children);
      const expandedRows = rows.filter(node => node instanceof HTMLElement && node.matches('.font-body.group.flex.flex-row') && !!node.querySelector(':scope > .font-header'));
      const settings = rows.find((node): node is HTMLElement => node instanceof HTMLElement && (node instanceof HTMLButtonElement && !!node.querySelector('svg.lucide-settings')
        || expandedRows.length >= 3 && expandedRows.includes(node) && /^(Settings|Настройки)$/.test(node.textContent?.trim() ?? '')));
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
      const label = button.querySelector<HTMLElement>('[data-ff-combat-label]');
      const nativeHeader = found.settings.querySelector<HTMLElement>(':scope > .font-header');
      const labelClass = nativeHeader?.className || 'font-header';
      if (label && label.className !== labelClass) label.className = labelClass;
    }
    controls.removeAttribute('data-ff-combat-controls-fallback');
    if (controls.parentElement !== found.group || controls.nextElementSibling !== found.settings) found.group.insertBefore(controls, found.settings);
    const bottomGroup = Array.from(found.aside.children).find(node => node !== found.group && node instanceof HTMLElement && node.classList.contains('relative') && node.classList.contains('z-10'));
    const available = Math.max(0, found.aside.clientHeight - (bottomGroup?.getBoundingClientRect().height ?? 40) - 24);
    const expanded = found.aside.getBoundingClientRect().width > 120;
    const normalGapHeight = found.group.scrollHeight + (!expanded && found.group.hasAttribute('data-ff-combat-controls-compact') ? found.group.children.length * 8 : 0);
    setRailAttribute('data-ff-combat-controls-compact', !expanded && normalGapHeight > available ? '' : null);
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
  type LayoutUndo = { node: HTMLElement; owner: HTMLElement | null; restore(): void };
  let modalUndo: (() => void)[] = [], layoutUndo: LayoutUndo[] = [];
  let modalActive = false;
  const hiddenBefore = new Map<HTMLElement, string | null>();
  function rightWorkspacePanes(): HTMLElement[] {
    if (!chat) return [];
    const panes = new Set<HTMLElement>();
    for (const canvas of document.querySelectorAll<HTMLElement>('canvas.touch-none')) {
      const pane = canvas.closest<HTMLElement>('aside');
      if (!pane || pane.closest('form,[role="dialog"],[role="alertdialog"]') || pane.contains(chat)) continue;
      // The native play split groups chat and the map/character pane. Do not
      // grant modeless interaction to unrelated navigation or modal canvases.
      for (let workspace = chat.parentElement; workspace && workspace !== document.body; workspace = workspace.parentElement) {
        if (workspace.matches('[data-panel-group],.flex.h-full.w-full') && workspace.contains(pane)) {
          panes.add(pane); break;
        }
      }
    }
    return Array.from(panes);
  }
  function rememberBackground(): void {
    hiddenBefore.clear();
    for (const root of [chat, ...rightWorkspacePanes(), ...document.querySelectorAll<HTMLElement>('canvas.touch-none')]) {
      if (!root || root.closest('form,[role="dialog"]')) continue;
      for (let node: HTMLElement | null = root; node && node !== document.body; node = node.parentElement) hiddenBefore.set(node, node.getAttribute('aria-hidden'));
    }
  }
  let bodyBefore = ['pointer-events', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
  function attribute(node: HTMLElement, name: string, value: string | null, layout = false): void {
    const old = node.getAttribute(name);
    if (old === value) return;
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
    const restore = () => { if (node.getAttribute(name) !== value) return; if (old === null) node.removeAttribute(name); else node.setAttribute(name, old); };
    if (layout) layoutUndo.push({ node, owner: picker?.contains(node) ? picker : null, restore });
    else modalUndo.push(restore);
  }
  function pruneDetachedLayout(): void {
    // Ownership is captured before native descendants can move elsewhere.
    // Detached nodes lose our markers; connected reused nodes keep native writes.
    for (let index = layoutUndo.length - 1; index >= 0; index--) {
      const entry = layoutUndo[index];
      if (!entry.owner || entry.owner.isConnected) continue;
      if (!entry.node.isConnected) entry.restore();
      layoutUndo.splice(index, 1);
    }
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
  function release(nativeRemoved = false, keepLayout = false): void {
    suspendModal(nativeRemoved); restoreFiltered();
    pending = false; pendingReopened = false;
    // A mode switch keeps only already-owned layout until native exit/adoption.
    // Modal locks still return to the native layer during its close animation.
    if (keepLayout) { updateControls(); return; }
    retiringPicker = null; retiringClose = null; retiringHeading = null; retiringMode = null; retiringHeadingText = ''; retiringOwner = undefined; retirementDeadline = 0; reserved = false;
    pruneDetachedLayout();
    for (const entry of layoutUndo.reverse()) entry.restore();
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
  function concealedSpellHelper(node: Element): boolean {
    const helper = (window as unknown as { __friendsFablesDesktopSpellSlots?: { isConcealedHelper?(dialog: Element, dock: Element): boolean } }).__friendsFablesDesktopSpellSlots;
    return !!picker && helper?.isConcealedHelper?.(node, picker) === true;
  }
  function otherLayer(): boolean {
    return Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]'))
      .some(node => node !== picker && visible(node) && !concealedSpellHelper(node));
  }
  function background(target: EventTarget | null): boolean {
    if (!(target instanceof Node) || picker?.contains(target)) return false;
    return controls.contains(target) || !!chat?.contains(target) || rightWorkspacePanes().some(pane => pane.contains(target)) || Array.from(document.querySelectorAll('canvas.touch-none')).some(canvas => !canvas.closest('form,[role="dialog"]') && (canvas === target || canvas.parentElement?.contains(target)));
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
  function close(switching = false): void {
    const current = picker;
    const retain = switching && !!current?.isConnected && current.hasAttribute('data-ff-combat-docked');
    release(false, retain); attempted = true;
    if (retain) {
      retiringPicker = current; retiringMode = mode; retirementDeadline = Date.now() + 5000;
      retiringClose = current!.querySelector('button:has(.lucide-x)');
      // This node is already an owned dock: native Actions can advance into
      // targets/forms without retaining its initial Choose Action caption.
      retiringHeading = current!.querySelector<HTMLElement>('[data-ff-combat-heading]')
        ?? current!.querySelector<HTMLElement>('h2,h3,div.text-center.absolute');
      retiringHeadingText = retiringHeading?.textContent?.trim() ?? '';
      retiringOwner = Object.entries(current!).find(([name]) => name.startsWith('__reactFiber'))?.[1] as Fiber | undefined;
    }
    current?.querySelector<HTMLButtonElement>('button:has(.lucide-x)')?.click();
    picker = null; launched = null; requested = null; updateControls();
  }
  // Settings may dismiss only our live owned dock through its native handler.
  // Return the node so the caller can observe actual unmount, including animations.
  function closeForSettings(): HTMLElement | null | false {
    // Submission is already in flight during the mounted-picker capture phase.
    if (disposed || pending || launched || requested || otherLayer() || settingsClosing?.isConnected) return false;
    if (picker) {
      if (!picker.isConnected || !reserved || !picker.hasAttribute('data-ff-combat-docked')) return false;
      const nativeClose = picker.querySelector<HTMLButtonElement>('button:has(.lucide-x)');
      if (!nativeClose || nativeClose.disabled) return false;
      settingsClosing = picker;
      settingsSuppressed = true;
      close();
      return settingsClosing;
    }
    if (reserved) return false;
    settingsSuppressed = true;
    return null;
  }
  function labels(): void {
    for (const [button, label] of [[skillsTab, language === 'ru' ? 'Кости' : 'Dice'], [actionsTab, language === 'ru' ? 'Действия боя' : 'Combat actions']] as const) {
      button.setAttribute('aria-label', label); button.title = label;
      const caption = button.querySelector('[data-ff-combat-label]');
      if (caption && caption.textContent !== label) caption.textContent = label;
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
    // A proven replacement ends the handoff deadline; its layout entries stay
    // independent from the detached old picker's conditional cleanup.
    retirementDeadline = 0;
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
    for (const root of [chat, ...rightWorkspacePanes(), ...document.querySelectorAll<HTMLElement>('canvas.touch-none')]) {
      if (!root || root.closest('form,[role="dialog"]')) continue;
      for (let node: HTMLElement | null = root; node && node !== document.body; node = node.parentElement) {
        if (node.getAttribute('aria-hidden') === 'true' && hiddenBefore.has(node) && hiddenBefore.get(node) !== 'true') attribute(node, 'aria-hidden', null);
      }
    }
    modalActive = true; updateControls();
  }
  type Fiber = { tag?: number; type?: unknown; key?: string | null; memoizedProps?: Record<string, unknown>; memoizedState?: { memoizedState?: unknown; next?: unknown }; return?: Fiber; child?: Fiber; sibling?: Fiber; alternate?: Fiber; stateNode?: { current?: Fiber } };
  type NativeElement = { $$typeof: symbol; type: unknown; key: string | null; ref?: unknown; props: Record<string, unknown> };
  type NativeModal = { content?: NativeElement; [name: string]: unknown };
  type NativeModalState = { modalStack: NativeModal[]; openModal: unknown; closeModalAtIndex: unknown };
  type NativeModalStore = (() => unknown) & { getState(): NativeModalState; setState(value: { modalStack: NativeModal[] }): void };
  let modalStore: NativeModalStore | null = null, bridgeAttempted = false;
  let turnWarning: NativeElement | null = null;
  function fiberRoot(fiber: Fiber): Fiber | null {
    let root = fiber;
    for (let depth = 0; root.return && depth < 256; depth++) root = root.return;
    return root.return || root.tag !== 3 ? null : root;
  }
  function currentFiber(fiber: Fiber | null | undefined): Fiber | null {
    if (!fiber) return null;
    const alternate = fiber.alternate;
    if (!alternate) {
      const root = fiberRoot(fiber);
      const current = root?.stateNode?.current;
      return root && current && (current === root || current === root.alternate) ? fiber : null;
    }
    if (alternate.alternate !== fiber) return null;
    const root = fiberRoot(fiber), alternateRoot = fiberRoot(alternate), currentRoot = root?.stateNode?.current;
    if (!root || !alternateRoot || !currentRoot || alternateRoot.stateNode?.current !== currentRoot
      || (currentRoot !== root && currentRoot !== alternateRoot)) return null;
    // React can reuse a child in both trees without updating its return.
    // Resolve the alternate pair through parent child lists, as React's
    // current-fiber slow path does; a root-only return walk is insufficient.
    let a = fiber, b = alternate;
    for (let depth = 0; depth < 256; depth++) {
      const parentA = a.return;
      if (!parentA) {
        if (a.tag !== 3) return null;
        const current = a.stateNode?.current;
        return current === a ? fiber : current === b ? alternate : null;
      }
      const parentB = parentA.alternate;
      if (!parentB) {
        if (!parentA.return) return null;
        a = parentA.return;
        continue;
      }
      if (parentA.child === parentB.child) {
        const root = fiberRoot(parentA), current = root?.stateNode?.current;
        if (!root || !current || (current !== root && current !== root.alternate)) return null;
        let child = parentA.child;
        for (let count = 0; child && count < 350; count++, child = child.sibling) {
          if (child === a) return fiber;
          if (child === b) return alternate;
        }
        return null;
      }
      if (a.return !== b.return) { a = parentA; b = parentB; }
      else {
        let found = false;
        for (const parent of [parentA, parentB]) {
          let child = parent.child;
          for (let count = 0; child && count < 350; count++, child = child.sibling) {
            if (child === a) { a = parent; b = parent === parentA ? parentB : parentA; found = true; break; }
            if (child === b) { b = parent; a = parent === parentA ? parentB : parentA; found = true; break; }
          }
          if (found) break;
          if (child) return null;
        }
        if (!found) return null;
      }
      if (a.alternate !== b || b.alternate !== a) return null;
    }
    return null;
  }
  function committedFiber(node: Element): Fiber | null {
    const fiber = Object.entries(node).find(([name]) => name.startsWith('__reactFiber'))?.[1] as Fiber | undefined;
    return currentFiber(fiber);
  }
  function nativeElement(value: unknown): value is NativeElement {
    if (!value || typeof value !== 'object') return false;
    const node = value as NativeElement;
    return (node.$$typeof === Symbol.for('react.transitional.element') || node.$$typeof === Symbol.for('react.element'))
      && !!node.props && typeof node.props === 'object';
  }
  function discoverModalStore(): void {
    if (bridgeAttempted || disposed) return;
    bridgeAttempted = true;
    // Captured native Turbopack runtime exposes its initialized module cache to
    // module factories. Register only our entry; never import/instantiate a
    // native module, fetch bundles, or depend on a native numeric module ID.
    const runtime = (window as unknown as { TURBOPACK?: { push?: (chunk: unknown[]) => unknown } }).TURBOPACK;
    if (!runtime || Array.isArray(runtime) || typeof runtime.push !== 'function') return;
    const id = `ff-desktop-combat-turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `/__${id}.js`;
    try {
      runtime.push([path, id, (context: { c?: Record<string, { exports?: Record<string, unknown> }>; M?: Map<string, unknown> }) => {
        try {
          if (disposed || !context.c || !(context.M instanceof Map)) return;
          const candidates = new Set<NativeModalStore>();
          for (const module of Object.values(context.c)) {
            const exported = module.exports?.useModalStore as NativeModalStore | undefined;
            if (typeof exported !== 'function' || typeof exported.getState !== 'function' || typeof exported.setState !== 'function') continue;
            const state = exported.getState();
            if (Array.isArray(state?.modalStack) && typeof state.openModal === 'function' && typeof state.closeModalAtIndex === 'function') candidates.add(exported);
          }
          if (candidates.size === 1) modalStore = [...candidates][0];
        } catch { /* A changed native runtime/store must leave native UI alone. */ }
        finally { if (context.c) delete context.c[id]; context.M?.delete(id); schedule(); }
      }]);
      const registered = runtime.push([path, { otherChunks: [], runtimeModuleIds: [id] }]);
      if (registered && typeof (registered as PromiseLike<unknown>).then === 'function') void Promise.resolve(registered).catch(() => {});
    } catch { /* No fallback to opening or remounting a native modal. */ }
  }
  function syncNativeTurn(): void {
    if (!picker || mode !== 'actions' || !live() || pending || !action) return;
    if (!modalStore) { discoverModalStore(); return; }
    try {
      const form = picker.querySelector('form');
      if (!form) return;
      let formFiber = committedFiber(form);
      for (let depth = 0; formFiber && depth < 40; depth++, formFiber = currentFiber(formFiber.return)) {
        const props = formFiber.memoizedProps;
        if (typeof props?.isUsersCharacterTurn === 'boolean' && typeof props.isMultiplayerCampaign === 'boolean'
          && typeof props.campaignId === 'string' && props.encounterId != null && typeof formFiber.type === 'function') break;
      }
      const props = formFiber?.memoizedProps;
      if (!props || typeof props.isUsersCharacterTurn !== 'boolean' || !props.campaignId || props.encounterId == null) return;
      // The website already derives this boolean from its party/encounter
      // queries. Read the committed composer child; do not infer turn rules
      // from labels, character names, native disabled state, or query contents.
      let owner = committedFiber(action);
      for (let depth = 0; owner && typeof owner.type !== 'function' && depth < 30; depth++) owner = currentFiber(owner.return);
      if (!owner || typeof owner.type !== 'function') return;
      const queue: Fiber[] = [owner], permissions = new Set<boolean>();
      for (let count = 0; queue.length && count < 350; count++) {
        const current = queue.shift()!, value = current.memoizedProps;
        if (value?.campaignId === props.campaignId && value.encounterId === props.encounterId
          && value.isMultiplayerCampaign === props.isMultiplayerCampaign && typeof value.isUsersCharacterTurn === 'boolean') permissions.add(value.isUsersCharacterTurn);
        if (current.child) queue.push(current.child);
        if (current !== owner && current.sibling) queue.push(current.sibling);
      }
      if (queue.length || permissions.size !== 1) return;
      const permission = [...permissions][0], state = modalStore.getState();
      if (!Array.isArray(state.modalStack) || !state.modalStack.length) return;
      // Require the mounted modal renderer to own this exact store snapshot.
      // A store notification may precede React commit; wait for that commit.
      let ownsSnapshot = false;
      for (let ancestor = committedFiber(picker), depth = 0; ancestor && depth < 60; ancestor = currentFiber(ancestor.return), depth++) {
        for (let hook = ancestor.memoizedState, count = 0; hook && count < 100; hook = hook.next as typeof hook, count++) {
          const value = hook.memoizedState as { current?: { value?: NativeModalState } } | undefined;
          if (value?.current?.value?.modalStack === state.modalStack) ownsSnapshot = true;
        }
      }
      if (!ownsSnapshot) return;
      const index = state.modalStack.length - 1, modal = state.modalStack[index], content = modal.content;
      if (!nativeElement(content) || content.type !== 'div' || !Array.isArray(content.props.children) || content.props.children.length !== 2) return;
      const [element, warning] = content.props.children;
      if (!nativeElement(element) || element.type !== formFiber!.type || element.key !== (formFiber!.key ?? null) || element.props !== props) return;
      if (nativeElement(warning)) {
        const nativeWarning = warning.props.variant === 'warning';
        const ownedWarning = warning.type === 'p' && warning.props.role === 'status' && warning.props['data-ff-combat-turn-warning'] === '';
        if ((!nativeWarning && !ownedWarning) || warning.props.children !== 'It is not your turn - you will not be able to submit an attack until it is your turn.') return;
        turnWarning = warning;
      } else if (warning !== false) return;
      if (permission === props.isUsersCharacterTurn) return;
      if (!permission && !turnWarning) {
        // A panel opened during the user's turn has no native warning element
        // to retain. Add only informational status text in its empty slot;
        // the original native form continues to enforce every submit rule.
        turnWarning = { $$typeof: element.$$typeof, type: 'p', key: null, ref: null, props: { role: 'status', className: 'mt-4', 'data-ff-combat-turn-warning': '',
          children: 'It is not your turn - you will not be able to submit an attack until it is your turn.' } };
      }
      // Preserve every native element type/key and all unrelated modal/props.
      // React updates permissions and the native warning without losing form
      // hooks, selected attacks/targets, drafts, scroll or focus.
      const nextElement = { ...element, props: { ...element.props, isUsersCharacterTurn: permission } };
      const nextContent = { ...content, props: { ...content.props, children: [nextElement, permission ? false : turnWarning] } };
      const nextStack = state.modalStack.slice(); nextStack[index] = { ...modal, content: nextContent };
      if (disposed || modalStore.getState() !== state || !live()) return;
      modalStore.setState({ modalStack: nextStack });
    } catch { /* Unknown native ownership/shape is never an enabling signal. */ }
  }
  function scan(): void {
    queued = false; if (disposed) return;
    pruneDetachedLayout();
    // Never hold a refused native close forever, or adopt its old node as the
    // requested replacement. Reservation is released on invalid ownership/TTL.
    if (retirementDeadline && Date.now() > retirementDeadline) release();
    else if (retiringPicker) {
      if (!retiringPicker.isConnected) { retiringPicker = null; retiringClose = null; retiringHeading = null; retiringMode = null; retiringHeadingText = ''; retiringOwner = undefined; }
      else {
        const currentOwner = Object.entries(retiringPicker).find(([name]) => name.startsWith('__reactFiber'))?.[1] as Fiber | undefined;
        const sameOwner = retiringOwner ? !!currentOwner && (currentOwner === retiringOwner
          || currentOwner.alternate === retiringOwner || retiringOwner.alternate === currentOwner) : !currentOwner;
        const sameHeading = !!retiringHeadingText && retiringHeading?.textContent?.trim() === retiringHeadingText;
        if (retiringPicker.parentElement !== document.body || retiringPicker.getAttribute('role') !== 'dialog'
          || !retiringPicker.hasAttribute('data-ff-combat-docked') || !retiringPicker.hasAttribute('data-ff-combat-panel')
          || retiringPicker.getAttribute('data-ff-combat-panel-mode') !== retiringMode
          || !retiringClose?.isConnected || retiringPicker.querySelector('button:has(.lucide-x)') !== retiringClose
          || !retiringHeading?.isConnected || !retiringPicker.contains(retiringHeading) || !sameHeading || !sameOwner) release();
      }
    }
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
    // Native close can leave Actions visible until the delayed Dice mount.
    // Re-adopting it here would consume the launch token or block the requested
    // switch. Wait for the requested native surface instead.
    const awaitingDice = launched === 'skills' || requested === 'skills';
    const found = skills ?? (!awaitingDice ? Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(dialog => visible(dialog) && Array.from(dialog.querySelectorAll('h2')).some(heading => /^(Choose Action|Выберите действие)$/i.test(heading.textContent?.trim() ?? ''))) : undefined);
    if (settingsClosing && !settingsClosing.isConnected) settingsClosing = null;
    if (found && found !== retiringPicker && found !== settingsClosing && !preexisting.has(found)) { picker = found; mode = skills ? 'skills' : 'actions'; launched = null; }
    filterAdventure();
    if (picker) { if (otherLayer()) { if (modalActive) suspendModal(); } else dock(); }
    syncNativeTurn();
    updateControls();
    if (requested && !picker && !otherLayer()) { const next = requested; requested = null; open(next); }
    else if (pending && reserved && !picker && !pendingReopened && !otherLayer()) {
      // Native checks append their result to chat after unmounting the input.
      // Reopen once without giving back the reservation; never retry a missing
      // or deferred native capability, and let result/nested layers finish first.
      pendingReopened = true; open(mode);
    }
    else if (!settingsSuppressed && now && !attempted && !reserved && !pending && !found && !otherLayer()) open();
  }
  function schedule(): void { if (!queued && !disposed) { queued = true; queueMicrotask(scan); } }
  document.addEventListener('ff-spell-helper-change', schedule);
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
    if (!next || internalLaunch || otherLayer() || settingsClosing?.isConnected) return;
    settingsSuppressed = false;
    // Observe before native handlers; do not cancel or replace their event.
    if (picker || reserved) close(true);
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
    closeForSettings,
    update(value, nextCss) { language = value; if (style.textContent !== nextCss) style.textContent = nextCss; labels(); schedule(); },
    dispose() { disposed = true; observer.disconnect(); clearInterval(timer); if (picker || reserved) close();
      document.removeEventListener('ff-spell-helper-change', schedule);
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
