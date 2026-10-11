// Serialized into the website; keep the entire adapter self-contained.
export function configureCombatFlow(enabled: boolean, locale: 'en' | 'ru'): void {
  type Controller = { update(locale: 'en' | 'ru'): void; dispose(): void };
  type Fiber = { tag?: number; type?: unknown; memoizedProps?: Record<string, unknown>; memoizedState?: { memoizedState?: unknown; next?: unknown }; return?: Fiber; child?: Fiber; sibling?: Fiber; alternate?: Fiber; stateNode?: { current?: Fiber } };
  type Preferences = { automaticDamage: boolean; hideIntermediateFranz: boolean };
  const key = '__friendsFablesDesktopCombatFlow';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  let language = locale, disposed = false, frame = 0, campaign = '', route = '';
  let prefs: Preferences = { automaticDamage: false, hideIntermediateFranz: false };
  const ui = document.createElement('fieldset');
  ui.setAttribute('data-ff-combat-flow', ''); ui.setAttribute('data-ff-translation-ignore', 'true');
  ui.style.cssText = 'margin:12px 0;padding:10px;border:1px solid hsl(var(--border));border-radius:6px;display:grid;gap:8px';
  const legend = document.createElement('legend'); ui.append(legend);
  const autoLabel = document.createElement('label'), auto = document.createElement('input'), autoText = document.createElement('span');
  const hideLabel = document.createElement('label'), hide = document.createElement('input'), hideText = document.createElement('span');
  auto.type = hide.type = 'checkbox'; auto.setAttribute('data-ff-automatic-damage', ''); hide.setAttribute('data-ff-hide-intermediate-franz', '');
  autoLabel.append(auto, autoText); hideLabel.append(hide, hideText); ui.append(autoLabel, hideLabel);
  const note = document.createElement('p'); note.style.cssText = 'margin:0;font-size:12px'; ui.append(note);
  const hidden = new Map<HTMLElement, { value: string; priority: string }>();
  const storageKey = (): string => `ff-desktop-combat-flow-v1:${campaign}`;
  function restore(): void {
    for (const [node, previous] of hidden) {
      if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display');
    }
    hidden.clear();
  }
  function read(): Preferences {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw || raw.length > 1024) return { automaticDamage: false, hideIntermediateFranz: false };
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') return { automaticDamage: false, hideIntermediateFranz: false };
      const p = value as Partial<Preferences>;
      return { automaticDamage: p.automaticDamage === true, hideIntermediateFranz: p.automaticDamage === true && p.hideIntermediateFranz === true };
    } catch { return { automaticDamage: false, hideIntermediateFranz: false }; }
  }
  function save(): void { try { localStorage.setItem(storageKey(), JSON.stringify(prefs)); } catch { /* Session preferences still work. */ } }
  function paint(): void {
    const ru = language === 'ru';
    legend.textContent = ru ? 'Автоматизация урона' : 'Damage automation';
    autoText.textContent = ru ? 'Автоматический урон после моего попадания' : 'Automatic damage after my hit';
    hideText.textContent = ru ? 'Скрывать связанный промежуточный ответ Франца' : "Hide Franz’s linked intermediate response";
    note.textContent = ru ? 'Ожидает кнопку урона игры. Скрытие действует только локально; генерация ответа и расходы сохраняются.' : 'Waits for the game’s Damage button. Hiding affects local display only; response generation and costs remain.';
    auto.checked = prefs.automaticDamage; hide.checked = prefs.hideIntermediateFranz; hide.disabled = !prefs.automaticDamage;
  }
  auto.addEventListener('change', () => { prefs.automaticDamage = auto.checked; if (!auto.checked) { prefs.hideIntermediateFranz = false; restore(); } save(); paint(); });
  hide.addEventListener('change', () => { prefs.hideIntermediateFranz = prefs.automaticDamage && hide.checked; if (!prefs.hideIntermediateFranz) restore(); save(); paint(); });
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
  // Native form/event correlation is installed below only after its captured
  // local mutation-result ownership contract has been validated.
  function sync(): void {
    frame = 0;
    if (disposed) return;
    const path = location.pathname;
    const match = /^\/([^/]+)\/play(?:\/|$)/.exec(path);
    const next = match?.[1] ?? '';
    if (path !== route || next !== campaign) {
      restore(); route = path; campaign = next; prefs = read(); ui.remove();
    }
    if (!campaign) return;
    const dock = document.querySelector<HTMLElement>('[data-ff-combat-docked][data-ff-combat-panel-mode="actions"]');
    if (!dock || dock.closest('[hidden],[aria-hidden="true"]')) { ui.remove(); return; }
    const form = dock.querySelector('form');
    // Never insert extension settings into the native form or its fieldset.
    // Committed ownership is also the compatibility gate for this surface.
    if (!form || !committedFiber(form)) { ui.remove(); return; }
    if (ui.parentElement !== dock) dock.append(ui);
    paint();
  }
  function schedule(): void { if (!disposed && !frame) frame = requestAnimationFrame(sync); }
  const observer = new MutationObserver(records => { if (records.some(record => !ui.contains(record.target))) schedule(); });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ff-combat-docked', 'data-ff-combat-panel-mode', 'hidden', 'aria-hidden'] });
  const timer = window.setInterval(schedule, 500);
  window.addEventListener('popstate', schedule);
  host[key] = {
    update(value) { language = value; schedule(); },
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); window.clearInterval(timer); window.removeEventListener('popstate', schedule); restore(); ui.remove(); delete host[key]; }
  };
  schedule();
}
