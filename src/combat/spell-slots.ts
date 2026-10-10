// Serialized into the renderer. Resolve native handlers from the current mounted tree only.
export function configureSpellSlots(enabled: boolean, locale: 'en' | 'ru'): void {
  type Controller = { update(value: 'en' | 'ru'): void; dispose(): void };
  const key = '__friendsFablesDesktopSpellSlots';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  type Props = { character?: { id?: unknown }; characterId?: unknown; campaignId?: unknown; phase?: unknown; viewOnly?: unknown; onClick?: () => void; disabled?: boolean; preventClose?: boolean; onClose?: () => void; open?: boolean; onOpenChange?: (value: boolean) => void; contentId?: string };
  type Fiber = { key?: string | null; tag?: number; memoizedProps?: Props; return?: Fiber; alternate?: Fiber; stateNode?: { current?: Fiber; containerInfo?: unknown }; memoizedState?: Hook };
  type Hook = { memoizedState?: unknown; next?: Hook };
  type Binding = { node: HTMLElement; row: HTMLElement; owner: Fiber; character: string; level: number; index: number; max: number; available: boolean; sheet: boolean };
  let language = locale, disposed = false, queued = false;
  const saved = new Map<HTMLElement, Map<string, string | null>>();
  const text = (en: string, ru: string) => language === 'ru' ? ru : en;
  const campaign = () => /\/([^/]+)\/play\/?$/.exec(location.pathname)?.[1] ?? '';
  function fiber(node: HTMLElement): Fiber | undefined {
    let result = Object.entries(node).find(([name]) => name.startsWith('__reactFiber$'))?.[1] as Fiber | undefined;
    let root = result; for (let i = 0; root?.return && i < 256; i++) root = root.return;
    if (!root || root.return) return;
    if (root?.alternate && root.stateNode?.current === root.alternate) result = result?.alternate;
    return result;
  }
  function props(node: HTMLElement): Props | undefined {
    return Object.entries(node).find(([name]) => name.startsWith('__reactProps$'))?.[1] as Props | undefined ?? fiber(node)?.memoizedProps;
  }
  function binding(node: HTMLElement): Binding | undefined {
    if (!node.isConnected || !node.classList.contains('rounded-full')) return;
    const sheet = node.tagName === 'BUTTON';
    if (!(sheet ? node.classList.contains('h-4') && node.classList.contains('w-4') : node.classList.contains('h-3') && node.classList.contains('w-3'))) return;
    const row = node.parentElement; if (!row) return;
    const circles = Array.from(row.children).filter((entry): entry is HTMLElement => entry instanceof HTMLElement && entry.tagName === node.tagName && entry.classList.contains('rounded-full'));
    const index = circles.indexOf(node); if (index < 0 || circles.length < 1 || circles.length > 20) return;
    let current = fiber(row.parentElement!), level = 0, owner: Fiber | undefined;
    for (let i = 0; current && i < 40; i++, current = current.return) {
      if (!level && current.key && /^[1-9]$/.test(current.key)) level = Number(current.key);
      const p = current.memoizedProps;
      if (sheet ? p?.characterId !== undefined && p?.phase !== undefined : p?.character?.id !== undefined) { owner = current; break; }
    }
    if (!owner || !level) return;
    const p = owner.memoizedProps!, id = sheet ? p.characterId : p.character?.id;
    if (typeof id !== 'number' && typeof id !== 'string' || !String(id)) return;
    // Native available and used colours carry state; we never change these classes or counts.
    const available = node.classList.contains(sheet ? 'bg-primary' : 'bg-primary/70');
    if (!available && !node.classList.contains(sheet ? 'bg-gray-800' : 'bg-muted')) return;
    return { node, row, owner, character: String(id), level, index, max: circles.length, available, sheet };
  }
  function attribute(node: HTMLElement, name: string, value: string | null): void {
    let values = saved.get(node); if (!values) { values = new Map(); saved.set(node, values); }
    if (!values.has(name)) values.set(name, node.getAttribute(name));
    if (value === null) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  }
  function restore(node: HTMLElement): void {
    const values = saved.get(node); if (!values) return;
    for (const [name, value] of values) { if (value === null) node.removeAttribute(name); else node.setAttribute(name, value); }
    saved.delete(node);
  }
  const style = document.createElement('style'); style.dataset.ffSpellSlotsStyle = '';
  style.textContent = `[data-ff-spell-slot]{box-shadow:inset 0 0 0 1px hsl(var(--foreground)/.65)!important}[data-ff-spell-slot][data-ff-spell-available="false"]{background:transparent!important}[data-ff-spell-slot]:focus-visible{outline:2px solid hsl(var(--primary))!important;outline-offset:3px}[data-ff-spell-slot][aria-busy="true"]{opacity:.6;cursor:wait}`;
  document.head.append(style);
  function sync(): void {
    if (disposed) return;
    const found = new Set<HTMLElement>();
    for (const node of document.querySelectorAll<HTMLElement>('.rounded-full')) {
      const b = binding(node); if (!b || !campaign()) continue;
      found.add(node);
      const action = b.available ? text('Consume', 'Использовать') : text('Restore', 'Восстановить');
      const label = text(`${action} level ${b.level} spell slot ${b.index + 1}`, `${action} ячейку заклинания ${b.level}-го уровня, ${b.index + 1}`);
      attribute(node, 'data-ff-spell-slot', ''); attribute(node, 'data-ff-spell-available', String(b.available));
      attribute(node, 'aria-label', label); attribute(node, 'title', label);
      if (!b.sheet) { attribute(node, 'role', 'button'); attribute(node, 'tabindex', '0'); }
    }
    for (const node of saved.keys()) if (!found.has(node)) restore(node);
  }
  function queue(): void { if (disposed || queued) return; queued = true; queueMicrotask(() => { queued = false; sync(); advance(); }); }
  const observer = new MutationObserver(queue);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled'] });
  host[key] = { update(value) { language = value; sync(); }, dispose() { disposed = true; observer.disconnect(); for (const node of saved.keys()) restore(node); style.remove(); delete host[key]; } };
  type NativeObserver = { options?: { queryKey?: unknown[]; mutationFn?: Function }; getCurrentResult?: () => { status?: string; isPending?: boolean; isLoading?: boolean; isFetching?: boolean; data?: { level: number; max_slots: number; used_slots: number }[] } };
  function observers(owner: Fiber): NativeObserver[] {
    const result: NativeObserver[] = []; let hook = owner.memoizedState;
    for (let i = 0; hook && i < 150; i++, hook = hook.next) {
      const value = hook.memoizedState as NativeObserver | undefined;
      if (value && typeof value.getCurrentResult === 'function') result.push(value);
    }
    return result;
  }
  function ready(b: Binding): boolean {
    const p = b.owner.memoizedProps;
    if (p?.phase !== 'campaign' || p.viewOnly !== false || p.campaignId !== campaign()) return false;
    const values = observers(b.owner);
    const mutation = values.find(value => value.options?.mutationFn && /maxSlots/.test(String(value.options.mutationFn)) && /usedSlots/.test(String(value.options.mutationFn)));
    const query = values.find(value => value.options?.queryKey?.[0] === 'spellSlots' && String(value.options.queryKey[1]) === b.character);
    const m = mutation?.getCurrentResult?.(), q = query?.getCurrentResult?.();
    if (!m || m.isPending || m.status === 'pending' || !q || q.status !== 'success' || q.isPending || q.isLoading || q.isFetching) return false;
    const entry = q.data?.find(value => value.level === b.level);
    if (!entry || !Number.isInteger(entry.max_slots) || !Number.isInteger(entry.used_slots) || entry.max_slots !== b.max || entry.used_slots < 0 || entry.used_slots > entry.max_slots) return false;
    return b.index >= 0 && b.index < entry.max_slots && b.available === (b.index < entry.max_slots - entry.used_slots);
  }
  type Request = { b: Binding; route: string; focus: Element | null; deadline: number; dialog?: HTMLElement; overlay?: HTMLElement; close?: HTMLButtonElement; styles?: (string | null)[]; injectedStyles?: (string | null)[]; provider?: Fiber; called: boolean; mutation?: NativeObserver };
  let request: Request | undefined;
  function portal(node: HTMLElement): Fiber | undefined { let f = fiber(node); for (let i = 0; f && i < 60; i++, f = f.return) if (f.tag === 4) return f; return; }
  function closeButton(dialog: HTMLElement): HTMLButtonElement | undefined {
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('button')) {
      if (!button.querySelector('svg.lucide-x') || button.disabled || typeof props(button)?.onClick !== 'function') continue;
      let f = fiber(button), allowed = false;
      for (let i = 0; f && i < 40; i++, f = f.return) {
        const p = f.memoizedProps;
        if (p && 'preventClose' in p) { allowed = p.preventClose !== true; break; }
      }
      if (allowed) return button;
    }
    return;
  }
  function dialogProvider(dialog: HTMLElement, overlay: HTMLElement): Fiber | undefined {
    const dPortal = portal(dialog), oPortal = portal(overlay);
    if (dPortal?.stateNode?.containerInfo !== document.body || oPortal?.stateNode?.containerInfo !== document.body) return;
    const ancestors: Fiber[] = []; let f = fiber(dialog);
    for (let i = 0; f && i < 100; i++, f = f.return) {
      const p = f.memoizedProps;
      if (p?.open === true && p.contentId === dialog.id && typeof p.onOpenChange === 'function') ancestors.push(f);
    }
    f = fiber(overlay);
    for (let i = 0; f && i < 100; i++, f = f.return) {
      const p = f.memoizedProps;
      if (p?.open !== true || p.contentId !== dialog.id || typeof p.onOpenChange !== 'function') continue;
      const match = ancestors.find(value => value === f || value.alternate === f || value.memoizedProps?.onOpenChange === p.onOpenChange);
      if (match) return match;
    }
    return;
  }
  function matchingIdentity(dialog: HTMLElement, character: string, route: string): boolean {
    return Array.from(dialog.querySelectorAll<HTMLElement>('*')).some(node => {
      let f = fiber(node); for (let i = 0; f && i < 40; i++, f = f.return) {
        const p = f.memoizedProps;
        if (String(p?.characterId) === character && p?.campaignId === route && p?.phase === 'campaign') return true;
      }
      return false;
    });
  }
  function owned(r: Request): boolean {
    const current = r.dialog && r.overlay ? dialogProvider(r.dialog, r.overlay) : undefined;
    const sameProvider = !!current && (current === r.provider || current.alternate === r.provider);
    return !!r.dialog?.isConnected && !!r.overlay?.isConnected && r.dialog.previousElementSibling === r.overlay && !!r.close?.isConnected && r.dialog.contains(r.close) && closeButton(r.dialog) === r.close && sameProvider && matchingIdentity(r.dialog, r.b.character, r.route);
  }
  function finish(): void {
    const r = request; if (!r) return;
    request = undefined;
    // A user may replace a mounted modal or change its identity while the request waits.
    if (owned(r)) r.close!.click();
    window.setTimeout(() => {
      // Preserve user/native style writes that occurred after our concealment.
      for (const [index, node] of [r.dialog, r.overlay].entries()) {
        if (!node || !r.styles || !r.injectedStyles || node.getAttribute('style') !== r.injectedStyles[index]) continue;
        const original = r.styles[index];
        if (original === null) node.removeAttribute('style'); else if (original !== undefined) node.setAttribute('style', original);
      }
      if (r.focus instanceof HTMLElement && r.focus.isConnected && !document.querySelector('[role="dialog"], [role="alertdialog"]')) r.focus.focus({ preventScroll: true });
    }, 300);
    attribute(r.b.node, 'aria-busy', null);
  }
  function advance(): void {
    const r = request; if (!r) return;
    if (disposed || campaign() !== r.route || !r.b.node.isConnected || Date.now() > r.deadline) { finish(); return; }
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
    if (!r.dialog && dialogs.length === 1) {
      const d = dialogs[0]!, overlay = d.previousElementSibling;
      const close = closeButton(d);
      // Bind before concealing: exact character modal descendants, native close and common portal.
      const provider = overlay instanceof HTMLElement ? dialogProvider(d, overlay) : undefined;
      if (matchingIdentity(d, r.b.character, r.route) && close && overlay instanceof HTMLElement && overlay.classList.contains('fixed') && overlay.classList.contains('inset-0') && overlay.getAttribute('data-state') === 'open' && provider) {
        r.dialog = d; r.overlay = overlay; r.close = close; r.provider = provider; r.styles = [d.getAttribute('style'), overlay.getAttribute('style')];
        d.style.setProperty('opacity', '0', 'important'); overlay.style.setProperty('opacity', '0', 'important');
        r.injectedStyles = [d.getAttribute('style'), overlay.getAttribute('style')];
      } else if (Date.now() > r.deadline - 4000) { finish(); return; }
    }
    if (!r.dialog) return;
    if (dialogs.length !== 1 || dialogs[0] !== r.dialog || !owned(r)) { finish(); return; }
    if (r.called) {
      if (!r.mutation?.getCurrentResult?.().isPending) finish();
      return;
    }
    const candidates = Array.from(r.dialog.querySelectorAll<HTMLElement>('button.rounded-full')).map(binding).filter((b): b is Binding => !!b && b.character === r.b.character && b.level === r.b.level && b.index === r.b.index);
    const b = candidates.length === 1 ? candidates[0] : undefined;
    if (!b) return;
    const original = binding(r.b.node);
    if (!original || original.character !== r.b.character || original.level !== r.b.level || original.index !== r.b.index || original.available !== r.b.available || b.max !== r.b.max || b.available !== r.b.available || !ready(b) || props(b.node)?.disabled || typeof props(b.node)?.onClick !== 'function') { finish(); return; }
    r.mutation = observers(b.owner).find(value => value.options?.mutationFn && /maxSlots/.test(String(value.options.mutationFn)) && /usedSlots/.test(String(value.options.mutationFn)));
    r.called = true;
    // The native callback owns payload, error handling, toast and query invalidation.
    props(b.node)!.onClick!();
  }
  function activate(node: HTMLElement): void {
    const b = binding(node); if (!b || b.sheet || request || !campaign() || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
    let container: HTMLElement | null = node.parentElement;
    let open: HTMLButtonElement | undefined;
    for (let i = 0; container && i < 10; i++, container = container.parentElement) {
      open = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(button => {
        const action = props(button)?.onClick;
        let candidate = fiber(button), owner: Fiber | undefined;
        for (let depth = 0; candidate && depth < 40; depth++, candidate = candidate.return) {
          if (candidate.memoizedProps?.character?.id !== undefined) { owner = candidate; break; }
        }
        return !!owner && (owner === b.owner || owner.alternate === b.owner || b.owner.alternate === owner) && typeof action === 'function' && /defaultTab:["']spells["']/.test(String(action));
      });
      if (open) break;
    }
    if (!open || open.disabled) return;
    request = { b, route: campaign(), focus: document.activeElement, deadline: Date.now() + 5000, called: false };
    attribute(node, 'aria-busy', 'true');
    props(open)!.onClick!(); advance();
  }
  function click(event: Event): void { const node = (event.target as Element)?.closest<HTMLElement>('[data-ff-spell-slot]'); if (node?.tagName === 'BUTTON') { const b = binding(node); if (!b || !ready(b)) { event.preventDefault(); event.stopImmediatePropagation(); } return; } if (node) { event.preventDefault(); event.stopPropagation(); activate(node); } }
  function keyboard(event: KeyboardEvent): void { if (event.key !== ' ' && event.key !== 'Enter') return; const node = (event.target as Element)?.closest<HTMLElement>('[data-ff-spell-slot]'); if (node && node.tagName !== 'BUTTON') { event.preventDefault(); event.stopPropagation(); if (!event.repeat) activate(node); } }
  document.addEventListener('click', click, true); document.addEventListener('keydown', keyboard, true);
  const timer = window.setInterval(advance, 50);
  const initialDispose = host[key]!.dispose;
  host[key]!.dispose = () => { finish(); window.clearInterval(timer); document.removeEventListener('click', click, true); document.removeEventListener('keydown', keyboard, true); initialDispose(); };
  sync();
}

export function clearSpellSlots(): void {
  const host = window as unknown as Record<string, { dispose(): void } | undefined>;
  host.__friendsFablesDesktopSpellSlots?.dispose();
}
