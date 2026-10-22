// Serialized into the website; keep the entire adapter self-contained.
export function configureCombatFlow(enabled: boolean, locale: 'en' | 'ru'): void {
  type Snapshot = { campaignId: string; automaticDamage: boolean; hideIntermediateFranz: boolean; hideDamagePrompt: boolean };
  type Controller = { update(locale: 'en' | 'ru'): void; dispose(): void; getPreferences(): Snapshot | null; setPreferences(value: unknown): Snapshot };
  type Fiber = { tag?: number; type?: unknown; memoizedProps?: Record<string, unknown>; memoizedState?: { memoizedState?: unknown; next?: unknown }; return?: Fiber; child?: Fiber; sibling?: Fiber; alternate?: Fiber; stateNode?: { current?: Fiber } };
  type Native = Record<string, any>;
  type Observer = { options: { mutationFn: Function }; getCurrentResult(): Native; subscribe(listener: (result: Native) => void): () => void };
  type Ticket = { campaign: string; encounter: string | number; character: string | number; target: string | number; dc: number; rollType: string; modifier: number; proficiency: number; observer: Observer; baseline: Native; started: number; request?: string; attackId?: string | number; finished?: boolean; unsubscribe?: () => void; turnTemplate?: HTMLElement; turnName?: string; turnImage?: unknown; turnEntity?: string | number };
  type Outcome = { campaign: string; character: string | number; eventId: string | number; choiceId: string | number; started: number; status: 'claimed' | 'accepted' | 'failed' | 'unknown'; rollResultId?: string | number; rollSucceeded?: boolean; rollSignature?: string; final?: 'claimed' | 'success' | 'failed' | 'canceled' };
  type Preferences = { automaticDamage: boolean; hideIntermediateFranz: boolean; hideDamagePrompt: boolean };
  const key = '__friendsFablesDesktopCombatFlow';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  let disposed = false, frame = 0, campaign = '', route = '';
  let prefs: Preferences = { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false };
  let ticket: Ticket | null = null;
  type TurnPresentation = { source: Ticket; template: HTMLElement; operation: 'gm' | 'damage'; completed: boolean; request?: string; attackId?: string | number; outcomeKey?: string; unsubscribe?: () => void };
  let turnPresentation: TurnPresentation | null = null;
  let turnShell: HTMLElement | null = null;
  type TurnFootprint = { source: Ticket; right: HTMLElement; entity: string | number; value: string; priority: string; applied: string };
  let turnFootprint: TurnFootprint | null = null;
  const turnHidden = new Map<HTMLElement, { value: string; priority: string }>();
  let traversalBudget = 50000;
  const currentFiberCache = new Map<Fiber, Fiber | null>();
  const rootCache = new Map<Fiber, Fiber | null>();
  const ancestryCache = new Map<Element, { depth: number; fibers: Fiber[] }>();
  const claimHost = window as unknown as { __friendsFablesDesktopCombatFlowClaims?: Set<string>; __friendsFablesDesktopCombatFlowOutcomes?: Map<string, Outcome> };
  const claimed = claimHost.__friendsFablesDesktopCombatFlowClaims ??= new Set<string>();
  const outcomes = claimHost.__friendsFablesDesktopCombatFlowOutcomes ??= new Map<string, Outcome>();
  const linked = new Map<string | number, { campaign: string; encounter: string | number; request: string; attackId: string | number; outcomeKey: string; choiceOwner: Fiber }>();
  const pendingPrompts = new Map<string | number, { campaign: string; encounter: string | number; request: string; character: string | number; choiceId: string | number; choiceOwner: Fiber }>();
  const narrating = new Map<string | number, { campaign: string; encounter: string | number; request: string }>();
  const hidden = new Map<HTMLElement, { value: string; priority: string }>();
  const hiddenPrompts = new Map<HTMLElement, { value: string; priority: string }>();
  const narrationLayout = new Map<HTMLElement, Map<string, { value: string; priority: string }>>();
  const progress = new Map<string | number, { campaign: string; encounter: string | number; request: string; character: string | number; outcomeKey?: string }>();
  type NativeWatch = { outcome: Outcome; choice: Native; anchor: Element; baselineIds: Set<string | number>; observers: { observer: Observer; baseline: Native; unsubscribe?: () => void }[]; publication?: { observer: Observer; variables: Native; submittedAt: number; signature: string } };
  const nativeWatches = new Map<string, NativeWatch>();
  type FinalWatch = { observer: Observer; baseline: Native; kind: 'automatic' | 'continue'; unsubscribe?: () => void; invocation?: Native };
  type Completion = { source: Ticket; outcome: Outcome; watches: FinalWatch[]; state: 'waiting' | 'pending' | 'success' };
  const completions = new Map<string, Completion>();
  function retireCompletion(key: string): void {
    const value = completions.get(key); completions.delete(key);
    if (value && value.outcome.final !== 'success' && value.outcome.final !== 'failed') value.outcome.final = 'canceled';
    for (const watch of value?.watches ?? []) try { watch.unsubscribe?.(); } catch { /* Native teardown. */ }
    if (turnPresentation?.outcomeKey === key) releaseTurnPresentation();
  }
  function clearCompletions(): void { for (const key of completions.keys()) retireCompletion(key); }
  function gmObservers(owner: Fiber): Observer[] {
    const values = new Set<Observer>(); let hook = owner.memoizedState;
    for (let count = 0; hook && count < 240; count++, hook = hook.next as typeof hook) {
      const value = hook.memoizedState as Observer | undefined;
      if (typeof value?.getCurrentResult !== 'function' || typeof value.subscribe !== 'function' || typeof value.options?.mutationFn !== 'function') continue;
      if (['ENCOUNTER_GM_RESPONSE', 'GM_RESPONSE', 'lastEventId'].every(marker => String(value.options.mutationFn).includes(marker))) values.add(value);
    }
    return hook ? [] : [...values];
  }
  function addFinalWatch(value: Completion, observer: Observer, kind: FinalWatch['kind']): boolean {
    if (value.watches.some(watch => watch.observer === observer && watch.kind === kind)) return true;
    try {
      const watch: FinalWatch = { observer, baseline: observer.getCurrentResult(), kind };
      const result = watch.baseline, variables = result?.variables;
      const alreadyInvoked = kind === 'continue' && ['pending', 'success', 'error'].includes(result.status)
        && Number.isFinite(result.submittedAt) && result.submittedAt >= value.outcome.started
        && variables?.lastEventId === value.outcome.eventId && variables.requestId === undefined && variables.isRewrite !== true;
      if (alreadyInvoked) watch.baseline = { status: 'idle', submittedAt: 0 };
      else if (!['idle', 'success', 'error'].includes(result.status)) return false;
      watch.unsubscribe = observer.subscribe(() => schedule());
      if (typeof watch.unsubscribe !== 'function') return false;
      value.watches.push(watch); return true;
    } catch { /* Unknown observer cannot authorize continuation. */ }
    return false;
  }

  function clearNativeWatch(key: string): void { const watch = nativeWatches.get(key); nativeWatches.delete(key); for (const item of watch?.observers ?? []) try { item.unsubscribe?.(); } catch { /* Native owner may already be disposed. */ } }
  const statuses = new Map<HTMLElement, HTMLElement>();
  const emptyRows = new Map<HTMLElement, { value: string; priority: string }>();
  let language = locale;
  function restoreStatus(): void { for (const node of statuses.values()) node.remove(); statuses.clear(); }
  function restoreEmptyRows(): void { for (const [node, previous] of emptyRows) { if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display'); } emptyRows.clear(); }
  const storageKey = (): string => `ff-desktop-combat-flow-v1:${campaign}`;
  function cancel(keepTurnPresentation = false): void { if (!keepTurnPresentation) releaseTurnPresentation(); const current = ticket; ticket = null; if (current?.attackId) progress.delete(current.attackId); pendingPrompts.clear(); if (narrating.size) { narrating.clear(); schedule(); } try { current?.unsubscribe?.(); } catch { /* Native lifecycle may already be disposed. */ } }
  function restoreNode(node: HTMLElement): void {
    const previous = hidden.get(node); if (!previous) return;
    if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display');
    hidden.delete(node);
  }
  function restore(): void {
    for (const [node, previous] of hidden) {
      if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display');
    }
    hidden.clear();
    for (const [node, properties] of narrationLayout) for (const [property, previous] of properties) {
      if (previous.value) node.style.setProperty(property, previous.value, previous.priority); else node.style.removeProperty(property);
    }
    narrationLayout.clear();
  }
  function restorePrompts(): void {
    for (const [node, previous] of hiddenPrompts) {
      if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display');
    }
    hiddenPrompts.clear();
  }
  function restoreAll(): void { clearCompletions(); releaseTurnPresentation(); for (const key of nativeWatches.keys()) clearNativeWatch(key); restore(); restorePrompts(); restoreEmptyRows(); restoreStatus(); progress.clear(); }
  function read(): Preferences {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw || raw.length > 1024) return { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false };
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') return { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false };
      const p = value as Partial<Preferences>, keys = Object.keys(p);
      const hasPrompt = Object.prototype.hasOwnProperty.call(p, 'hideDamagePrompt');
      if (Array.isArray(p) || keys.length !== (hasPrompt ? 3 : 2) || keys.some(key => !['automaticDamage','hideIntermediateFranz','hideDamagePrompt'].includes(key))
        || typeof p.automaticDamage !== 'boolean' || typeof p.hideIntermediateFranz !== 'boolean' || hasPrompt && typeof p.hideDamagePrompt !== 'boolean') return { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false };
      return { automaticDamage: p.automaticDamage === true, hideIntermediateFranz: p.automaticDamage === true && p.hideIntermediateFranz === true, hideDamagePrompt: p.automaticDamage === true && p.hideDamagePrompt === true };
    } catch { return { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false }; }
  }
  // Preference reads correlate the current route without touching React fibers.
  function syncRoute(): void {
    const path = location.pathname;
    const match = /^\/([^/]+)\/play(?:\/|$)/.exec(path)?.[1] ?? '';
    const next = match.length <= 256 && !/[\s?#]/.test(match) ? match : '';
    if (path !== route || next !== campaign) {
      releaseQuery(); cancel(); linked.clear(); restoreAll(); route = path; campaign = next;
      prefs = campaign ? read() : { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false };
    }
  }
  function getPreferences(): Snapshot | null {
    syncRoute();
    return !disposed && campaign ? { campaignId: campaign, ...prefs } : null;
  }
  function setPreferences(value: unknown): Snapshot {
    syncRoute();
    if (disposed || !campaign || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Combat preferences require the current campaign.');
    const p = value as Partial<Snapshot>;
    const keys = Object.keys(p), hasPrompt = Object.prototype.hasOwnProperty.call(p, 'hideDamagePrompt');
    if (keys.length !== (hasPrompt ? 4 : 3) || keys.some(key => !['campaignId','automaticDamage','hideIntermediateFranz','hideDamagePrompt'].includes(key)) || p.campaignId !== campaign || typeof p.automaticDamage !== 'boolean' || typeof p.hideIntermediateFranz !== 'boolean' || hasPrompt && typeof p.hideDamagePrompt !== 'boolean') throw new Error('Invalid or stale combat preferences.');
    const next = { automaticDamage: p.automaticDamage, hideIntermediateFranz: p.automaticDamage && p.hideIntermediateFranz, hideDamagePrompt: p.automaticDamage && p.hideDamagePrompt === true };
    // Do not acknowledge a failed persistent write or disturb the active flow.
    localStorage.setItem(storageKey(), JSON.stringify(next));
    prefs = next;
    if (!prefs.automaticDamage) { releaseQuery(); cancel(); linked.clear(); restoreAll(); }
    else { if (!prefs.hideIntermediateFranz) restore(); if (!prefs.hideDamagePrompt) restorePrompts(); if (!prefs.hideIntermediateFranz || !prefs.hideDamagePrompt) restoreEmptyRows(); }
    schedule(); return { campaignId: campaign, ...prefs };
  }
  function fiberRoot(fiber: Fiber): Fiber | null {
    const path: Fiber[] = [];
    let root = fiber;
    for (let depth = 0; depth < 256 && traversalBudget-- > 0; depth++) {
      if (rootCache.has(root)) { const cached = rootCache.get(root)!; for (const item of path) rootCache.set(item, cached); return cached; }
      path.push(root);
      if (!root.return) { const result = root.tag === 3 ? root : null; for (const item of path) rootCache.set(item, result); return result; }
      root = root.return;
    }
    return null;
  }
  function currentFiber(fiber: Fiber | null | undefined): Fiber | null {
    if (!fiber || traversalBudget-- <= 0) return null;
    if (currentFiberCache.has(fiber)) return currentFiberCache.get(fiber)!;
    const result = resolveCurrentFiber(fiber);
    currentFiberCache.set(fiber, result);
    return result;
  }
  function resolveCurrentFiber(fiber: Fiber): Fiber | null {
    const pairs: [Fiber, Fiber][] = [];
    const finish = (result: Fiber | null): Fiber | null => {
      if (result) for (const [a, b] of pairs) {
        if (a.alternate !== b || b.alternate !== a) continue;
        const current = result === fiber ? a : b;
        currentFiberCache.set(a, current); currentFiberCache.set(b, current);
      }
      return result;
    };
    const alternate = fiber.alternate;
    if (!alternate) {
      const root = fiberRoot(fiber);
      const current = root?.stateNode?.current;
      if (!root || !current || (current !== root && current !== root.alternate)) return null;
      // A no-alternate expando can also be detached from the current child
      // lists. Verify membership; a shared child may retain an old return.
      if (current !== root) {
        const parent = currentFiber(fiber.return);
        for (let child = parent?.child, count = 0; child && count < 350 && traversalBudget-- > 0; count++, child = child.sibling) if (child === fiber) return fiber;
        return null;
      }
      for (let node = fiber, depth = 0; node.return && depth < 256 && traversalBudget-- > 0; node = node.return, depth++) {
        let found = false;
        for (let child = node.return.child, count = 0; child && count < 350 && traversalBudget-- > 0; count++, child = child.sibling) if (child === node) { found = true; break; }
        if (!found) return null;
      }
      return traversalBudget > 0 ? fiber : null;
    }
    if (alternate.alternate !== fiber) return null;
    const root = fiberRoot(fiber), alternateRoot = fiberRoot(alternate), currentRoot = root?.stateNode?.current;
    if (!root || !alternateRoot || !currentRoot || alternateRoot.stateNode?.current !== currentRoot
      || (currentRoot !== root && currentRoot !== alternateRoot)) return null;
    // React can reuse a child in both trees without updating its return.
    // Resolve the alternate pair through parent child lists, as React's
    // current-fiber slow path does; a root-only return walk is insufficient.
    let a = fiber, b = alternate;
    for (let depth = 0; depth < 256 && traversalBudget-- > 0; depth++) {
      if (a.alternate === b && b.alternate === a) {
        if (currentFiberCache.has(a)) {
          const current = currentFiberCache.get(a);
          if (current === a || current === b) return finish(current === a ? fiber : alternate);
          return null;
        }
        pairs.push([a, b]);
      }
      const parentA = a.return;
      if (!parentA) {
        if (a.tag !== 3) return null;
        const current = a.stateNode?.current;
        return finish(current === a ? fiber : current === b ? alternate : null);
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
        for (let count = 0; child && count < 350 && traversalBudget-- > 0; count++, child = child.sibling) {
          if (child === a) return finish(fiber);
          if (child === b) return finish(alternate);
        }
        return null;
      }
      if (a.return !== b.return) { a = parentA; b = parentB; }
      else {
        let found = false;
        for (const parent of [parentA, parentB]) {
          let child = parent.child;
          for (let count = 0; child && count < 350 && traversalBudget-- > 0; count++, child = child.sibling) {
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
  const id = (value: unknown): value is string | number => typeof value === 'string' && value.length > 0 && value.length < 200 || typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  function ancestry(node: Element, maxDepth = 40): Fiber[] {
    const cached = ancestryCache.get(node); if (cached && cached.depth >= maxDepth) return cached.fibers.slice(0, maxDepth);
    const result: Fiber[] = [];
    for (let fiber = committedFiber(node), depth = 0; fiber && depth < maxDepth; depth++, fiber = currentFiber(fiber.return)) result.push(fiber);
    ancestryCache.set(node, { depth: maxDepth, fibers: result }); return result;
  }
  function restoreTurnVisuals(): void {
    turnShell?.remove(); turnShell = null;
    for (const [node, previous] of turnHidden) {
      if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display');
    }
    turnHidden.clear();
  }
  function releaseTurnFootprint(): void {
    const footprint = turnFootprint; turnFootprint = null;
    if (!footprint || footprint.right.style.getPropertyValue('min-height') !== footprint.applied
      || footprint.right.style.getPropertyPriority('min-height') !== 'important') return;
    if (footprint.value) footprint.right.style.setProperty('min-height', footprint.value, footprint.priority);
    else footprint.right.style.removeProperty('min-height');
  }
  function releaseTurnPresentation(keepFootprint = false): void {
    if (!keepFootprint) releaseTurnFootprint();
    const current = turnPresentation; turnPresentation = null;
    try { current?.unsubscribe?.(); } catch { /* Native observer may already be disposed. */ }
    restoreTurnVisuals();
  }
  function turnFooter(character: string | number, encounter: string | number): { right: HTMLElement; props: Native; button?: HTMLButtonElement } | null {
    const matches: { right: HTMLElement; props: Native; button?: HTMLButtonElement }[] = [];
    const candidates = document.querySelectorAll<HTMLElement>('div.h-fit.flex.items-center.justify-between.gap-2');
    if (candidates.length > 12) return null;
    for (const node of Array.from(candidates)) {
      const host = committedFiber(node), owner = host && currentFiber(host.return), props = owner?.memoizedProps;
      const source = typeof owner?.type === 'function' ? String(owner.type) : '';
      const turn = (props?.encounter as Native)?.currentTurnEntity;
      if (host?.tag !== 5 || host.type !== 'div' || !props || !['shouldShowEndTurnButton', 'shouldShowDeathSaveButton', 'isUsersTurn', 'justify-end'].every(marker => source.includes(marker))
        || props.campaignId !== campaign || (props.campaign as Native)?.id !== campaign || (props.campaign as Native)?.active_encounter_id !== encounter
        || props.encounterId !== encounter || (props.encounter as Native)?.id !== encounter || (props.usersCharacter as Native)?.id !== character
        || turn?.characterId !== character || turn.is_npc !== false || !id(turn.entityId) || typeof turn.name !== 'string' || !turn.name || turn.name.length > 100
        || props.isUsersTurn !== true || props.showEncounterButtons !== true || props.shouldShowDeathSaveButton !== false
        || props.isAnotherPlayersTurn !== false || props.shouldShowRunNpcTurnButton !== false) continue;
      const right = Array.from(node.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('justify-end') && child.classList.contains('gap-2'));
      if (right.length !== 1) continue;
      const rightHost = committedFiber(right[0]);
      if (rightHost?.tag !== 5 || rightHost.type !== 'div' || currentFiber(rightHost.return) !== host) continue;
      const buttons = Array.from(right[0].querySelectorAll<HTMLButtonElement>('button')).filter(button => {
        const chain = ancestry(button, 8), native = chain[0]?.memoizedProps, classes = native?.className;
        return chain[0]?.tag === 5 && chain[0].type === 'button' && typeof native?.onClick === 'function'
          && ['currentTurnEntity', 'entityId', 'currentTurnEntityId'].every(marker => String(native.onClick).includes(marker))
          && chain.some(fiber => fiber.memoizedProps?.campaignId === campaign && fiber.memoizedProps.encounterId === encounter
            && fiber.memoizedProps.shouldShowEndTurnButton === true && (fiber.memoizedProps.usersCharacter as Native)?.id === character)
          && typeof classes === 'string' && ['rounded-full', 'h-12', 'mt-2'].every(marker => classes.split(/\s+/).includes(marker));
      });
      if (buttons.length > 1 || (props.shouldShowEndTurnButton === true) !== (buttons.length === 1)) continue;
      matches.push({ right: right[0], props, button: buttons[0] });
    }
    return matches.length === 1 && traversalBudget > 0 ? matches[0] : null;
  }
  function turnTemplate(current: Ticket): HTMLElement | undefined {
    const footer = turnFooter(current.character, current.encounter), button = footer?.button;
    if (!button || button.disabled || committedFiber(button)?.memoizedProps?.disabled === true || !button.firstElementChild) return;
    const template = document.createElement('div');
    template.className = button.className;
    template.style.setProperty('pointer-events', 'none');
    // Native themes may style BUTTON rather than its utility classes. Copy
    // appearance, not width/position/padding: responsive classes still govern.
    const appearance = getComputedStyle(button);
    for (const property of ['background-color', 'background-image', 'border-color', 'border-style', 'border-width', 'border-radius', 'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'box-shadow']) template.style.setProperty(property, appearance.getPropertyValue(property));
    const turn = (footer.props.encounter as Native).currentTurnEntity;
    // Reserve the validated native slot, including its native button margins.
    // This layout ownership survives settled Manual handoff independently of
    // the busy presentation; Continue remains entirely native and interactive.
    const height = footer.right.getBoundingClientRect().height;
    if (Number.isFinite(height) && height > 0) {
      const right = footer.right, applied = `${height}px`;
      turnFootprint = { source: current, right, entity: turn.entityId,
        value: right.style.getPropertyValue('min-height'), priority: right.style.getPropertyPriority('min-height'), applied };
      right.style.setProperty('min-height', applied, 'important');
    }
    current.turnName = turn.name; current.turnImage = turn.image;
    template.setAttribute('data-ff-combat-turn-control', 'true'); template.setAttribute('data-ff-translation-ignore', 'true'); template.setAttribute('aria-hidden', 'true');
    const avatar = button.firstElementChild.cloneNode(true) as Element;
    // Only the native avatar decoration is copied. Never clone an interactive
    // element, ID, event attribute, reference or translation presentation owner.
    const safeTags = new Set(['DIV', 'SPAN', 'IMG', 'SVG', 'PATH', 'CIRCLE', 'G', 'RECT', 'DEFS', 'CLIPPATH', 'POLYGON', 'POLYLINE', 'LINE', 'TITLE']);
    for (const node of [avatar, ...Array.from(avatar.querySelectorAll('*'))]) {
      if (!safeTags.has(node.tagName.toUpperCase())) { node.remove(); continue; }
      for (const attribute of Array.from(node.attributes)) if (!['class', 'style', 'src', 'alt', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'points', 'xmlns'].includes(attribute.name)) node.removeAttribute(attribute.name);
    }
    template.append(avatar);
    const label = document.createElement('span'); label.className = 'inline-block overflow-hidden text-ellipsis whitespace-nowrap max-w-[190px] sm:max-w-none'; template.append(label);
    return template;
  }
  function beginTurnPresentation(current: Ticket): void {
    releaseTurnPresentation();
    current.turnTemplate = turnTemplate(current);
    if (!current.turnTemplate) return;
    const presentation: TurnPresentation = { source: current, template: current.turnTemplate, operation: 'gm', completed: false };
    turnPresentation = presentation;
    presentation.unsubscribe = current.observer.subscribe(result => {
      if (turnPresentation !== presentation) return;
      if (result.status === 'error') { releaseTurnPresentation(); return; }
      if (result.status !== 'pending' && result.status !== 'success') return;
      const variables = result.variables;
      if (result === current.baseline || variables === current.baseline.variables || !Number.isFinite(result.submittedAt)
        || result.submittedAt <= (current.baseline.submittedAt ?? 0) || result.submittedAt < current.started || typeof variables?.requestId !== 'string'
        || !variables.requestId || !id(variables.lastEventId) || variables.isRewrite === true
        || presentation.request && (presentation.request !== variables.requestId || presentation.attackId !== variables.lastEventId)
        || result.status === 'success' && !presentation.request) { releaseTurnPresentation(); return; }
      presentation.request = variables.requestId; presentation.attackId = variables.lastEventId;
      presentation.completed = result.status === 'success'; schedule();
    });
  }
  function transferTurnPresentation(current: Ticket, outcomeKey: string): void {
    const template = current.turnTemplate;
    releaseTurnPresentation(true);
    if (template) turnPresentation = { source: current, template, operation: 'damage', completed: false, request: current.request, attackId: current.attackId, outcomeKey };
  }
  function ownRollState(presentation: Pick<TurnPresentation, 'source' | 'operation' | 'attackId' | 'request' | 'outcomeKey'>): 'spinning' | 'settled' | 'unknown' {
    const current = presentation.source, outcome = outcomes.get(presentation.outcomeKey ?? '');
    const eventId = presentation.operation === 'gm' ? presentation.attackId : outcome?.rollResultId;
    if (!id(eventId)) return 'unknown';
    const cards = Array.from(document.querySelectorAll('[id^="event-message-card-"]')).filter(node => node.id === `event-message-card-${eventId}`);
    if (cards.length !== 1) return 'unknown';
    const card = cards[0], chain = ancestry(card, 24);
    const owners = chain.filter(fiber => {
      const event = fiber.memoizedProps?.event as Native | undefined;
      return typeof fiber.type === 'function' && String(fiber.type).includes('animate-spin blur-sm scale-105')
        && event?.id === eventId && event.campaign_id === campaign && event.character_id === current.character
        && event.events_roll?.roll_type === (presentation.operation === 'gm' ? current.rollType : 'Damage')
        && (presentation.operation !== 'gm' || event.request_id === presentation.request && event.command_used === 'roll_attack');
    });
    if (owners.length !== 1 || !encounterMatches(card, current.encounter)) return 'unknown';
    const panels = card.querySelectorAll('div.relative.rounded-2xl.border-2.overflow-hidden'); if (panels.length !== 1) return 'unknown';
    const panelHost = committedFiber(panels[0]), classes = panelHost?.memoizedProps?.className;
    if (panelHost?.tag !== 5 || panelHost.type !== 'div' || typeof classes !== 'string'
      || !['relative', 'rounded-2xl', 'border-2', 'overflow-hidden'].every(marker => classes.split(/\s+/).includes(marker))
      || !ancestry(panels[0], 24).includes(owners[0])) return 'unknown';
    const dice = Array.from(panels[0].querySelectorAll('svg[data-name]'));
    if (!dice.length || dice.length > 20) return 'unknown';
    let spinning = false;
    for (const die of dice) {
      const host = committedFiber(die), classes = host?.memoizedProps?.className;
      if (!/^d(?:4|6|8|10|12|20)$/.test(die.getAttribute('data-name') ?? '') || host?.tag !== 5 || host.type !== 'svg'
        || typeof classes !== 'string' || !ancestry(die, 24).includes(owners[0])) return 'unknown';
      if (['animate-spin', 'blur-sm', 'scale-105'].every(marker => die.classList.contains(marker) && classes.split(/\s+/).includes(marker))) spinning = true;
      else if (!['blur-none', 'scale-100'].every(marker => die.classList.contains(marker) && classes.split(/\s+/).includes(marker)) || ['animate-spin', 'blur-sm', 'scale-105'].some(marker => die.classList.contains(marker) || classes.split(/\s+/).includes(marker))) return 'unknown';
    }
    return traversalBudget <= 0 ? 'unknown' : spinning ? 'spinning' : 'settled';
  }

  function syncCompletions(): void {
    for (const [key, value] of completions) {
      const { source, outcome } = value, proof = linked.get(outcome.eventId);
      const footer = turnFooter(source.character, source.encounter);
      const row = document.getElementById(`event-container-${outcome.eventId}`);
      const turn = (footer?.props.encounter as Native | undefined)?.currentTurnEntity;
      if (!id(source.turnEntity) || turn?.entityId !== source.turnEntity || turn.name !== source.turnName || turn.image !== source.turnImage
        || !prefs.automaticDamage || source.campaign !== campaign || location.pathname !== route || Date.now() - source.started > 120000
        || !proof || proof.outcomeKey !== key || !row || !encounterMatches(row, source.encounter) || !footer
        || ['failed', 'unknown'].includes(outcome.status) || ['failed', 'canceled'].includes(outcome.final ?? '')) { retireCompletion(key); continue; }
      // The native ordered collection is a committed query projection, not DOM
      // order or a guessed latest mutation. Reject duplicate/conflicting owners.
      const collections = new Set<Native[]>();
      for (const fiber of ancestry(row, 48)) {
        const events = fiber.memoizedProps?.events;
        if (typeof fiber.type === 'function' && Array.isArray(events) && events.length > 0 && events.length <= 45) collections.add(events);
      }
      if (collections.size !== 1) { retireCompletion(key); continue; }
      const events = [...collections][0], tail = events.at(-1);
      const damage = events.filter(event => event?.id === outcome.rollResultId);
      // uK can have no host button after its own once-ref suppresses the
      // wrapper. Inspect only the bounded committed subtree of this exact slot.
      const nativeOwners = new Set<Fiber>(), pending = [committedFiber(footer.right)];
      for (let count = 0; pending.length && count < 80; count++) {
        const fiber = currentFiber(pending.pop()); if (!fiber) continue;
        const p = fiber.memoizedProps, text = typeof fiber.type === 'function' ? String(fiber.type) : '';
        if (p?.campaignId === campaign && p.mostRecentDmEvent === footer.props.mostRecentDmEvent
          && (p.usersCharacter as Native)?.id === source.character && (p.encounter as Native)?.id === source.encounter
          && ['mostRecentDmEvent', 'isGmResponding', 'Continue', 'lastEventId', 'requestId'].every(marker => text.includes(marker))) nativeOwners.add(fiber);
        if (fiber.child) pending.push(fiber.child);
        if (fiber.sibling && fiber !== committedFiber(footer.right)) pending.push(fiber.sibling);
      }
      if (pending.length || nativeOwners.size > 1) { retireCompletion(key); continue; }
      const owner = [...nativeOwners][0], observers = owner ? gmObservers(owner) : [];
      const subscribed = observers.length === 1 && addFinalWatch(value, observers[0], 'continue');
      const candidates: { button: HTMLButtonElement; owner: Fiber; callback: Function }[] = [];
      if (owner && subscribed) for (const button of Array.from(footer.right.querySelectorAll<HTMLButtonElement>('button')).slice(0, 12)) {
        const chain = ancestry(button, 12), host = chain[0], props = host?.memoizedProps;
        if (chain.includes(owner) && host?.tag === 5 && host.type === 'button' && typeof props?.onClick === 'function') candidates.push({ button, owner, callback: props.onClick });
      }
      let ambiguous = false, awaitingProjection = false;
      for (const watch of value.watches) try {
        const result = watch.observer.getCurrentResult(), variables = result?.variables;
        if (result === watch.baseline || variables === watch.baseline.variables) continue;
        if (!Number.isFinite(result.submittedAt) || result.submittedAt < outcome.started || result.submittedAt <= (watch.baseline.submittedAt ?? 0)) continue;
        // Native ee may start its awaited GM before realtime accepted-choice
        // and result projection reaches this committed collection. Waiting is
        // presentation-only; never invoke Continue without the exact relation.
        if (watch.kind === 'automatic' && (!id(outcome.rollResultId) || damage.length === 0)
          && variables?.isRewrite !== true && id(variables?.lastEventId) && typeof variables.requestId === 'string' && variables.requestId
          && ['pending', 'success'].includes(result.status)) { awaitingProjection = true; continue; }
        const exact = variables?.isRewrite !== true && (watch.kind === 'automatic'
          ? damage.length === 1 && variables?.lastEventId === outcome.rollResultId && variables.requestId === damage[0].request_id
          : variables?.lastEventId === outcome.eventId && variables.requestId === undefined);
        if (!exact) { ambiguous = true; break; }
        if (watch.invocation && (watch.invocation.variables !== variables || watch.invocation.submittedAt !== result.submittedAt)) { ambiguous = true; break; }
        watch.invocation = result;
        if (result.status === 'error') { outcome.final = 'failed'; ambiguous = true; break; }
        if (result.status === 'pending' || result.status === 'success') {
          if (value.watches.some(other => other !== watch && other.invocation)) { ambiguous = true; break; }
          outcome.final = result.status === 'success' ? 'success' : 'claimed';
          value.state = result.status === 'success' ? 'success' : 'pending';
        }
      } catch { ambiguous = true; }
      if (ambiguous) { retireCompletion(key); continue; }
      if (awaitingProjection) continue;
      if (value.state === 'success') {
        // Native GM success precedes realtime/footer publication. Keep the
        // existing presentation, never generate again while awaiting native End.
        if (footer.button) retireCompletion(key);
        continue;
      }
      if (value.state === 'pending') continue;
      if (outcome.final || !outcome.rollSucceeded || outcome.status !== 'accepted') continue;
      if (damage.length !== 1 || tail !== damage[0] || damage[0].campaign_id !== campaign || damage[0].character_id !== source.character
        || damage[0].role !== 'player' || damage[0].command_used !== 'roll' || !id(damage[0].request_id)
        || !outcome.rollSignature || nativeRollSignature(damage[0].events_roll, true) !== outcome.rollSignature) { retireCompletion(key); continue; }
      const settled = ownRollState({ source, operation: 'damage', outcomeKey: key });
      if (settled === 'spinning') continue;
      if (settled !== 'settled') { retireCompletion(key); continue; }
      const dm = footer.props.mostRecentDmEvent;
      const choices = Array.isArray(dm?.rollChoices) ? dm.rollChoices.filter((choice: Native) => choice?.id === outcome.choiceId) : [];
      if (choices.length !== 1 || choices[0].accepted !== true || choices[0].roll_result_id !== outcome.rollResultId
        || choices[0].event_id !== outcome.eventId || choices[0].character_id !== source.character || choices[0].type !== 'Damage'
        || dm?.role !== 'dm' || dm.command_used !== 'encounter_player_turn_action_response' || dm.id !== outcome.eventId || dm.campaign_id !== campaign || dm.request_id !== proof.request
        || footer.props.continueMode !== 'manual' || footer.props.showContinueButton !== true
        || footer.props.hasAccess !== true || footer.props.globalIsPending !== false || footer.props.isGmResponding !== false
        || candidates.length !== 1 || value.watches.filter(watch => watch.kind === 'automatic').length !== 1) { retireCompletion(key); continue; }
      const candidate = candidates[0];
      ancestryCache.delete(candidate.button); currentFiberCache.clear(); rootCache.clear();
      const native = committedFiber(candidate.button)?.memoizedProps;
      const p = candidate.owner.memoizedProps;
      let visible = true;
      const concealed: { node: HTMLElement; previous: { value: string; priority: string } }[] = [];
      try {
        // Remove only our synchronous concealment while measuring native CSS.
        // Restore it before returning to the event loop/paint. A newer inline
        // owner is never overwritten or treated as our permission to invoke.
        for (const [node, previous] of turnHidden) if (node.contains(candidate.button)) {
          if (node.style.getPropertyValue('display') !== 'none' || node.style.getPropertyPriority('display') !== 'important') { visible = false; break; }
          concealed.push({ node, previous });
          if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display');
        }
        let ancestor: HTMLElement | null = candidate.button;
        for (let depth = 0; ancestor && depth < 24; depth++, ancestor = ancestor.parentElement) {
          const appearance = getComputedStyle(ancestor);
          if (ancestor.hidden || ancestor.getAttribute('aria-hidden') === 'true' || ['hidden', 'collapse'].includes(appearance.visibility) || appearance.display === 'none') { visible = false; break; }
        }
        if (ancestor || !candidate.button.getClientRects().length) visible = false;
      } finally {
        for (const { node, previous } of concealed) {
          if (node.style.getPropertyValue('display') === previous.value && node.style.getPropertyPriority('display') === previous.priority) node.style.setProperty('display', 'none', 'important');
          else turnHidden.delete(node);
        }
      }
      if (!visible || !candidate.button.isConnected || candidate.button.disabled || candidate.button.matches(':disabled') || native?.disabled === true || native?.['aria-disabled'] === true
        || native?.onClick !== candidate.callback || p?.hasAccess !== true || p.isPending !== false || p.isGmResponding !== false
        || !String(candidate.callback).includes('lastEventId') || !/requestId\s*:\s*(?:undefined|void\s*0)/.test(String(candidate.callback)) || traversalBudget <= 0) { retireCompletion(key); continue; }
      // Persist before calling native uK, including synchronous throw/reentry.
      outcome.final = 'claimed'; value.state = 'pending';
      try {
        candidate.callback({ preventDefault() {}, stopPropagation() {}, target: candidate.button, currentTarget: candidate.button });
        const published = value.watches.filter(watch => watch.kind === 'continue').some(watch => {
          const result = watch.observer.getCurrentResult();
          return result !== watch.baseline && result.variables !== watch.baseline.variables && result.submittedAt >= outcome.started
            && result.submittedAt > (watch.baseline.submittedAt ?? 0) && result.variables?.lastEventId === outcome.eventId
            && result.variables.requestId === undefined && ['pending', 'success', 'error'].includes(result.status);
        });
        if (!published) { outcome.final = 'failed'; retireCompletion(key); }
      }
      catch { outcome.final = 'failed'; retireCompletion(key); }
    }
  }
  function syncTurnPresentation(): void {
    const presentation = turnPresentation; if (!presentation) return;
    const current = presentation.source;
    const footer = turnFooter(current.character, current.encounter);
    const turn = (footer?.props.encounter as Native | undefined)?.currentTurnEntity;
    if (!prefs.automaticDamage || campaign !== current.campaign || location.pathname !== route || Date.now() - current.started > 120000 || !footer || turn?.name !== current.turnName || turn?.image !== current.turnImage
      || footer.button && (footer.button.disabled || committedFiber(footer.button)?.memoizedProps?.disabled === true)) { releaseTurnPresentation(); return; }
    if (presentation.completed && ownRollState(presentation) !== 'spinning' && !completions.has(presentation.outcomeKey ?? '')) { releaseTurnPresentation(true); return; }
    const desired = new Set<HTMLElement>();
    for (const node of Array.from(footer.right.children)) {
      if (!(node instanceof HTMLElement) || node === turnShell || node === footer.button) continue;
      const chain = ancestry(node, 8);
      const phase = chain.some(fiber => {
        const props = fiber.memoizedProps, source = typeof fiber.type === 'function' ? String(fiber.type) : '';
        return (props?.usersCharacter as Native)?.id === current.character
          && (source.includes('Your turn, ') && source.includes('bg-blue-600/20')
            || props?.campaignId === campaign && source.includes('Continue') && source.includes('isGmResponding'));
      });
      if (!phase) { releaseTurnPresentation(); return; }
      desired.add(node);
    }
    for (const [node, previous] of turnHidden) if (!desired.has(node)) {
      if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display'); turnHidden.delete(node);
    }
    for (const node of desired) if (!turnHidden.has(node)) {
      turnHidden.set(node, { value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') }); node.style.setProperty('display', 'none', 'important');
    }
    if (footer.button) { turnShell?.remove(); turnShell = null; }
    else {
      if (!turnShell) turnShell = presentation.template;
      const label = turnShell.lastElementChild as HTMLElement;
      const name = (footer.props.encounter as Native).currentTurnEntity.name;
      const text = language === 'ru' ? `Завершить ход ${name}` : `End ${name}'s Turn`;
      if (label.textContent !== text) label.textContent = text;
      if (turnShell.parentElement !== footer.right) footer.right.append(turnShell);
    }
  }
  function syncTurnFootprint(): void {
    const footprint = turnFootprint; if (!footprint) return;
    const current = footprint.source, footer = turnFooter(current.character, current.encounter);
    const turn = (footer?.props.encounter as Native | undefined)?.currentTurnEntity;
    if (!prefs.automaticDamage || campaign !== current.campaign || location.pathname !== route
      || !footer || footer.right !== footprint.right || turn?.entityId !== footprint.entity
      || turn?.name !== current.turnName || turn?.image !== current.turnImage
      || footprint.right.style.getPropertyValue('min-height') !== footprint.applied
      || footprint.right.style.getPropertyPriority('min-height') !== 'important'
      || footer.button && (!turnPresentation || footer.button.disabled || committedFiber(footer.button)?.memoizedProps?.disabled === true)) releaseTurnFootprint();
  }
  // Current public native module389261 INSERT updater only; unknown releases
  // bypass. Its duplicate INSERT replaces the entire event, unlike UPDATE.
  const nativeInsertSource = "e=>{if(!e?.pages?.length)return{pages:[{data:[i]}],pageParams:[{cursor:void 0,direction:\"backward\"}]};let s=!1,n=e.pages.map(e=>{let a=e.data.map(e=>null!==i.id&&null!==e.id&&e.id===i.id||null!==i.id&&null===e.id||null!==i.id&&null===e.id&&e.character_id===i.character_id&&\"talk\"===e.command_used&&\"talk\"===i.command_used&&\"Sending audio...\"===e.content?(s=!0,i):e);return{...e,data:a}});if(!s){let e=n[n.length-1];if(!e)return{pages:[{data:[i]}],pageParams:[{cursor:void 0,direction:\"backward\"}]};e.data||(e.data=[]),e.data.some(e=>null!==i.id&&e.id===i.id)?a.default.warn(\"Event already exists in last page, skipping\",{functionName:\"insertEventIntoQueryData\",campaignId:r,newEventId:i.id}):e.data.length>=t.CAMPAIGN_EVENTS_PAGE_SIZE?n.push({data:[i]}):e.data.push(i)}if(n.length>3){let e=n.length-3;n.splice(0,e)}let l=e.pageParams.slice(-n.length);for(;l.length<n.length;)l.unshift({cursor:void 0,direction:\"backward\"});return{pages:n,pageParams:l}}";
  type QueryBinding = { client: Native; original: Function; wrapper: Function; descriptor?: PropertyDescriptor; campaign: string };
  let queryBinding: QueryBinding | undefined;
  function releaseQuery(): void {
    const binding = queryBinding; queryBinding = undefined;
    if (!binding || binding.client.setQueryData !== binding.wrapper) return;
    if (binding.descriptor) Object.defineProperty(binding.client, 'setQueryData', binding.descriptor);
    else delete binding.client.setQueryData;
  }
  function queryEvents(data: Native | undefined): Native[] | null {
    if (!data || !Array.isArray(data.pages) || !data.pages.length || data.pages.length > 3) return null;
    const events: Native[] = [];
    for (const page of data.pages) { if (!page || !Array.isArray(page.data) || page.data.length > 120) return null; events.push(...page.data); }
    return events.length <= 120 && events.every(event => event && typeof event === 'object') ? events : null;
  }
  const positiveEventId = (value: unknown): boolean => typeof value === 'number' ? Number.isSafeInteger(value) && value > 0 : typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value);
  function completeRoll(event: Native): boolean {
    const roll = event.events_roll;
    return positiveEventId(event.id) && positiveEventId(event.character_id) && event.role === 'player' && event.campaign_id === campaign
      && ['roll', 'roll_damage', 'roll_attack'].includes(event.command_used) && !!event.character && typeof event.character === 'object' && !Array.isArray(event.character) && (event.character.id === undefined || event.character.id === event.character_id)
      && typeof event.request_id === 'string' && event.request_id.length > 0 && typeof event.created_at === 'string' && Number.isFinite(Date.parse(event.created_at))
      && !!roll && (roll.event_id === undefined || roll.event_id === event.id) && (roll.campaign_id === undefined || roll.campaign_id === campaign)
      && ['Damage', 'Melee', 'Ranged', 'Spell', 'Attack', 'Melee Attack', 'Ranged Attack', 'Spell Attack'].includes(roll.roll_type)
      && (event.command_used !== 'roll_damage' || roll.roll_type === 'Damage') && (event.command_used !== 'roll_attack' || roll.roll_type !== 'Damage')
      && ['base_roll', 'total_roll'].every(field => typeof roll[field] === 'number' && Number.isFinite(roll[field]))
      && ['modifier_value', 'proficiency_bonus'].every(field => roll[field] == null || typeof roll[field] === 'number' && Number.isFinite(roll[field]))
      && (roll.modifier_stat == null || typeof roll.modifier_stat === 'string') && (roll.vantage == null || ['normal', 'advantage', 'disadvantage'].includes(roll.vantage))
      && (roll.base_rolls_array == null || Array.isArray(roll.base_rolls_array) && roll.base_rolls_array.length > 0 && roll.base_rolls_array.every((value: unknown) => typeof value === 'number' && Number.isFinite(value)))
      && (roll.dice == null || Array.isArray(roll.dice) && roll.dice.length > 0 && roll.dice.every((value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0));
  }
  function retainRolls(before: Native | undefined, after: Native | undefined): Native | undefined {
    const previous = queryEvents(before), incoming = queryEvents(after);
    if (!previous || !incoming) return after;
    const replacements = new Map<Native, Native>();
    for (const event of incoming) {
      if (event.events_roll != null) continue;
      const matches = previous.filter(old => old.id === event.id);
      const old = matches.length === 1 ? matches[0] : undefined;
      if (!old || !completeRoll(old) || !['id', 'campaign_id', 'character_id', 'role', 'command_used', 'request_id', 'created_at'].every(field => old[field] === event[field])) continue;
      replacements.set(event, { ...event, events_roll: old.events_roll });
    }
    return replacements.size ? { ...after, pages: after!.pages.map((page: Native) => ({ ...page, data: page.data.map((event: Native) => replacements.get(event) ?? event) })) } : after;
  }
  function syncQuery(): void {
    if (!prefs.automaticDamage || !campaign) { releaseQuery(); return; }
    const feed = document.querySelector('#events-list'), clients = new Set<Native>();
    if (feed) for (const row of Array.from(document.querySelectorAll('[id^="event-container-"]')).slice(-30)) {
      if (!feed.contains(row)) continue;
      const event = eventFor(row); if (!event || event.campaign_id !== campaign) continue;
      for (const fiber of ancestry(row, 96)) {
        const client = fiber.tag === 10 ? fiber.memoizedProps?.value as Native | undefined : undefined;
        if (!client || typeof client.getQueryData !== 'function' || typeof client.setQueryData !== 'function') continue;
        try { if (queryEvents(client.getQueryData(['events', campaign]))?.includes(event)) clients.add(client); } catch { /* Unknown provider. */ }
      }
    }
    const client = clients.size === 1 ? [...clients][0] : undefined;
    if (queryBinding?.client === client) return;
    releaseQuery(); if (!client) return;
    const descriptor = Object.getOwnPropertyDescriptor(client, 'setQueryData'), original = client.setQueryData;
    if (descriptor && (!('value' in descriptor) || descriptor.writable !== true || descriptor.configurable !== true)) return;
    const binding: QueryBinding = { client, original, descriptor, campaign, wrapper: function(this: Native, ...args: any[]): any {
      const [key, updater] = args;
      if (queryBinding !== binding || this !== client || disposed || !prefs.automaticDamage || location.pathname !== route || campaign !== binding.campaign
        || !Array.isArray(key) || key.length !== 2 || key[0] !== 'events' || key[1] !== binding.campaign
        || typeof updater !== 'function' || Function.prototype.toString.call(updater) !== nativeInsertSource) return original.apply(this, args);
      const forwarded = [...args];
      forwarded[1] = function(this: unknown, data: Native | undefined): Native | undefined { return retainRolls(data, updater.call(this, data)); };
      return original.apply(this, forwarded);
    } };
    try { Object.defineProperty(client, 'setQueryData', { value: binding.wrapper, configurable: true, writable: true, enumerable: descriptor?.enumerable ?? false }); queryBinding = binding; } catch { /* Frozen or unknown QueryClient. */ }
  }
  function formContext(form: HTMLFormElement): { owner: Native; character: Native; methods: Native; observer: Observer } | null {
    let owner: Fiber | undefined, methods: Native | undefined;
    for (const fiber of ancestry(form)) {
      const props = fiber.memoizedProps;
      if (typeof props?.getValues === 'function' && props.control) methods = props;
      if (props?.campaignId === campaign && id(props.encounterId) && props.isUsersCharacterTurn === true && typeof props.isMultiplayerCampaign === 'boolean'
        && typeof fiber.type === 'function' && String(fiber.type).includes('sendAttackRoll')) { if (owner) return null; owner = fiber; }
    }
    if (!owner || !methods) return null;
    const observers = new Set<Observer>(), characters = new Map<string, Native>();
    let hook = owner.memoizedState;
    for (let count = 0; hook && count < 240; count++, hook = hook.next as typeof hook) {
      const value = hook.memoizedState as Native | undefined;
      const character = value?.data?.usersCharacter;
      if (character && id(character.id)) characters.set(String(character.id), character);
      if (typeof value?.getCurrentResult === 'function' && typeof value.subscribe === 'function' && typeof value.options?.mutationFn === 'function') {
        const source = String(value.options.mutationFn);
        if (source.includes('ENCOUNTER_GM_RESPONSE') && source.includes('GM_RESPONSE') && source.includes('lastEventId')) observers.add(value as Observer);
      }
    }
    if (hook || observers.size !== 1 || characters.size !== 1) return null;
    return { owner: owner.memoizedProps!, character: [...characters.values()][0], methods, observer: [...observers][0] };
  }
  function localResult(current: Ticket, result: Native): void {
    if (ticket !== current || disposed || !prefs.automaticDamage || location.pathname !== route || campaign !== current.campaign) return;
    if (result.status === 'error') { cancel(); return; }
    if (result.status !== 'pending' && result.status !== 'success') return;
    const variables = result.variables;
    if (result === current.baseline || result.variables === current.baseline.variables || !Number.isFinite(result.submittedAt)
      || result.submittedAt <= (current.baseline.submittedAt ?? 0) || result.submittedAt < current.started
      || typeof variables?.requestId !== 'string' || !variables.requestId || !id(variables.lastEventId) || variables.isRewrite === true) { cancel(); return; }
    if (current.request && (current.request !== variables.requestId || current.attackId !== variables.lastEventId)) { cancel(); return; }
    // Captured native GM mutation awaits GM_RESPONSE/ENCOUNTER_GM_RESPONSE;
    // onSuccess clears Franz's typing state before the observer reports success.
    // Success must belong to the same invocation, never an idle per-row observer.
    if (result.status === 'success' && (!current.request || !current.attackId)) { cancel(); return; }
    const changed = current.request !== variables.requestId || current.attackId !== variables.lastEventId || current.finished !== (result.status === 'success');
    current.request = variables.requestId; current.attackId = variables.lastEventId;
    current.finished = result.status === 'success'; if (changed) schedule();
  }
  function submitted(event: Event): void {
    traversalBudget = 50000; ancestryCache.clear(); currentFiberCache.clear(); rootCache.clear();
    if (!event.isTrusted || !(event.target instanceof HTMLFormElement) || !event.target.closest('[data-ff-combat-docked]')) return;
    // A second own submission cancels rather than batching or guessing ownership.
    if (ticket) { cancel(); return; }
    clearCompletions(); releaseTurnPresentation();
    if (!prefs.automaticDamage || !campaign) return;
    const context = formContext(event.target);
    if (!context) return;
    try {
      const attacks = context.methods.getValues('attacks');
      if (!Array.isArray(attacks) || attacks.length !== 1) return;
      const attack = attacks[0], targets = attack?.targets;
      if (attack?.requires_attack_roll !== true || attack.requires_spell_save === true || !Array.isArray(targets) || targets.length !== 1
        || !id(targets[0]?.id) || typeof targets[0].ac !== 'number' || !Number.isFinite(targets[0].ac)) return;
      const rollType = attack.type === 'melee' ? 'Melee Attack' : attack.type === 'ranged' ? 'Ranged Attack' : attack.type === 'spell' ? 'Spell Attack' : '';
      if (!rollType || typeof attack.modifier_value !== 'number' || typeof attack.proficiency_bonus !== 'number') return;
      const baseline = context.observer.getCurrentResult();
      if (baseline.status === 'pending') return;
      const current: Ticket = { campaign, encounter: context.owner.encounterId, character: context.character.id, target: targets[0].id, dc: targets[0].ac,
        rollType, modifier: attack.modifier_value, proficiency: attack.proficiency_bonus, observer: context.observer, baseline, started: Date.now() };
      const footer = turnFooter(current.character, current.encounter), turn = (footer?.props.encounter as Native | undefined)?.currentTurnEntity;
      if (turn && id(turn.entityId)) { current.turnEntity = turn.entityId; current.turnName = turn.name; current.turnImage = turn.image; }
      ticket = current;
      beginTurnPresentation(current);
      current.unsubscribe = context.observer.subscribe(result => localResult(current, result));
    } catch { cancel(); }
  }
  function eventFor(row: Element): Native | null {
    const events = new Map<string, Native>();
    for (const fiber of ancestry(row, 8)) {
      const event = fiber.memoizedProps?.event as Native | undefined;
      if (event && id(event.id) && (row.id === `event-container-${event.id}` || row.id === 'event-container-undefined')) events.set(String(event.id), event);
    }
    return events.size === 1 ? [...events.values()][0] : null;
  }
  function encounterMatches(node: Element, encounter: string | number): boolean {
    let found = false;
    for (const fiber of ancestry(node, 16)) {
      const nativeCampaign = fiber.memoizedProps?.campaign as Native | undefined;
      if (!nativeCampaign) continue;
      if (nativeCampaign.id !== campaign || nativeCampaign.active_encounter_id !== encounter) return false;
      found = true;
    }
    return found;
  }
  function pruneAbsentLinks(): void {
    // Loaded rows keep their proof. Retain only the 128 most recent absent
    // rows (above three native 15-row pages), without a guessed grace timer.
    const absent = [...linked.keys()].filter(eventId => !document.getElementById(`event-container-${eventId}`));
    for (let index = 0; index < absent.length - 128; index++) linked.delete(absent[index]);
  }
  function syncNarration(): void {
    if (!prefs.automaticDamage || !prefs.hideIntermediateFranz) { restore(); return; }
    const desired = new Set<HTMLElement>();
    const layouts = new Map<HTMLElement, Record<string, string>>();
    const narration = new Map<string | number, { campaign: string; encounter: string | number; request: string; outcomeKey?: string }>(narrating);
    for (const [eventId, proof] of linked) narration.set(eventId, proof);
    for (const [eventId, proof] of narration) {
      const outcome = outcomes.get(proof.outcomeKey ?? '');
      if (outcome?.status === 'failed' || outcome?.status === 'unknown') { linked.delete(eventId); continue; }
      const row = document.getElementById(`event-container-${eventId}`);
      if (proof.campaign !== campaign) { linked.delete(eventId); continue; }
      // A missing presentation row cannot disprove an already claimed action.
      // Revalidate its full committed context when the same event returns.
      if (!row) continue;
      if (!encounterMatches(row, proof.encounter)) { linked.delete(eventId); continue; }
      const event = eventFor(row);
      if (event?.role !== 'dm' || event.request_id !== proof.request || event.campaign_id !== campaign) { linked.delete(eventId); continue; }
      const cards = Array.from(row.querySelectorAll<HTMLElement>('[id^="event-message-card-"]')).filter(card => card.id === `event-message-card-${eventId}`);
      if (cards.length !== 1) continue;
      const card = cards[0], chain = ancestry(card, 8);
      const owner = chain[1]?.memoizedProps;
      // Captured eC host card is separately owned from the native choice region.
      // Require current structural ownership, not a positional/class-only guess.
      if (owner?.eventId !== eventId || typeof chain[1]?.type !== 'function' || !String(chain[1].type).includes('event-message-card-')
        || !chain.some(fiber => (fiber.memoizedProps?.event as Native)?.id === eventId)
        || card.querySelector('[data-ff-combat-flow],form,input,select,textarea')
        || Array.from(card.querySelectorAll('button')).some(button => ancestry(button, 16).some(fiber => fiber.memoizedProps?.rollChoice)) || traversalBudget <= 0) { continue; }
      desired.add(card);
      // Captured ej owns a three-column desktop grid: avatar/audio, middle
      // (eC narration + nT outcomes), and X feedback. Validate committed host
      // ownership and that exact shape before collapsing those visual regions.
      // Never hide the shared event container or the middle native outcomes.
      const rowHost = committedFiber(row), shell = currentFiber(rowHost?.return);
      const shellSource = typeof shell?.type === 'function' ? String(shell.type) : '';
      const children = Array.from(row.children);
      if (rowHost?.tag !== 5 || rowHost.type !== 'div' || (shell?.memoizedProps?.event as Native)?.id !== eventId
        || !['event-container-', 'grid-cols-[40px_1fr_30px]', 'avatarVariant', 'showFeedbackButtons'].every(marker => shellSource.includes(marker))
        || children.length !== 3 || !children.every(node => node instanceof HTMLElement)) continue;
      const [avatar, middle, actions] = children as HTMLElement[];
      if (!middle.contains(card) || avatar.contains(card) || actions.contains(card)) continue;
      const hosts = children.map(node => committedFiber(node));
      if (hosts.some((fiber, index) => !fiber || fiber.tag !== 5 || fiber.type !== 'div' || (fiber.stateNode as unknown) !== children[index]
        || currentFiber(fiber.return) !== rowHost)) continue;
      const unsafe = [avatar, actions].some(node => node.querySelector('[id^="event-message-card-"], [id^="event-container-"], form, input, select, textarea')
        || Array.from(node.querySelectorAll('button')).some(button => ancestry(button, 16).some(fiber => fiber.memoizedProps?.rollChoice)));
      if (unsafe || traversalBudget <= 0) continue;
      desired.add(avatar); desired.add(actions);
      layouts.set(row as HTMLElement, { 'grid-template-columns': 'minmax(0, 1fr)', 'column-gap': '0px' });
      layouts.set(middle, { 'margin-left': '0px' });
    }
    for (const node of hidden.keys()) if (!desired.has(node)) restoreNode(node);
    for (const node of desired) {
      if (!hidden.has(node)) hidden.set(node, { value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') });
      if (node.style.getPropertyValue('display') !== 'none' || node.style.getPropertyPriority('display') !== 'important') node.style.setProperty('display', 'none', 'important');
    }
    for (const [node, properties] of narrationLayout) if (!layouts.has(node)) {
      for (const [property, previous] of properties) {
        if (previous.value) node.style.setProperty(property, previous.value, previous.priority); else node.style.removeProperty(property);
      }
      narrationLayout.delete(node);
    }
    for (const [node, properties] of layouts) {
      let previous = narrationLayout.get(node);
      if (!previous) narrationLayout.set(node, previous = new Map());
      for (const [property, value] of Object.entries(properties)) {
        if (!previous.has(property)) previous.set(property, { value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property) });
        if (node.style.getPropertyValue(property) !== value || node.style.getPropertyPriority(property) !== 'important') node.style.setProperty(property, value, 'important');
      }
    }
  }
  function syncPrompts(): void {
    const desired = new Set<HTMLElement>();
    const proofs = new Map<string | number, { campaign: string; encounter: string | number; request: string; choiceOwner: Fiber; outcomeKey?: string; character?: string | number; choiceId?: string | number }>(pendingPrompts);
    for (const [eventId, proof] of linked) proofs.set(eventId, proof);
    if (prefs.automaticDamage && prefs.hideDamagePrompt) for (const [eventId, proof] of proofs) {
      const outcome = outcomes.get(proof.outcomeKey ?? '');
      if (proof.campaign !== campaign || outcome && (outcome.status === 'failed' || outcome.status === 'unknown' || outcome.campaign !== campaign || outcome.eventId !== eventId)) continue;
      const character = outcome?.character ?? proof.character, choiceId = outcome?.choiceId ?? proof.choiceId;
      const row = document.getElementById(`event-container-${eventId}`), event = row && eventFor(row);
      if (!row || !encounterMatches(row, proof.encounter) || event?.role !== 'dm' || event.campaign_id !== campaign || event.request_id !== proof.request) continue;
      const owner = currentFiber(proof.choiceOwner), props = owner?.memoizedProps, choice = props?.rollChoice as Native | undefined;
      const choices = Array.isArray(event.rollChoices) ? event.rollChoices.filter((value: Native) => value?.type === 'Damage' && value.character_id === character) : [];
      if (choices.length !== 1 || choices[0].id !== choiceId || choices[0].accepted === false || choices[0].type !== 'Damage' || choices[0].character_id !== character || choices[0].event_id !== eventId
        || props?.campaignId !== campaign || (props.usersCharacter as Native)?.id !== character
        || !choice || choice.id !== choiceId || choice.event_id !== eventId || choice.character_id !== character
        || choice.type !== 'Damage' || choice.accepted !== choices[0].accepted || choice.roll_result_id !== choices[0].roll_result_id
        || !['dice_expression', 'fixed_bonus', 'modifier_value', 'number_of_dice', 'proficiency_bonus'].every(field => choice[field] === choices[0][field])) continue;
      // Captured t5 returns a single outer div for the choice label/avatar and
      // pending/completed badge. Resolve that committed direct host child, never
      // a nearest DOM row; actual dice results and narration are sibling owners.
      const fiber = currentFiber(owner?.child), node = fiber?.stateNode as unknown;
      if (!owner || !fiber || fiber.tag !== 5 || fiber.type !== 'div' || currentFiber(fiber.return) !== owner
        || !(node instanceof HTMLElement) || !node.isConnected || node === row || !row.contains(node)
        || committedFiber(node) !== fiber || node.id.startsWith('event-message-card-')
        || node.querySelector('[id^="event-message-card-"], [id^="event-container-"], form, input, select, textarea') || traversalBudget <= 0) continue;
      desired.add(node);
    }
    for (const [node, previous] of hiddenPrompts) if (!desired.has(node)) {
      if (previous.value) node.style.setProperty('display', previous.value, previous.priority); else node.style.removeProperty('display');
      hiddenPrompts.delete(node);
    }
    for (const node of desired) {
      if (!hiddenPrompts.has(node)) hiddenPrompts.set(node, { value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') });
      if (node.style.getPropertyValue('display') !== 'none' || node.style.getPropertyPriority('display') !== 'important') node.style.setProperty('display', 'none', 'important');
    }
  }
  function syncPresentation(): void {
    restoreEmptyRows();
    // Collapse only a fully concealed, structurally validated intermediate.
    // Dice and other native outcomes make the row nonempty and remain visible.
    if (prefs.hideIntermediateFranz && prefs.hideDamagePrompt) {
      const concealed = (node: Element): boolean => {
        if (hidden.has(node as HTMLElement) || hiddenPrompts.has(node as HTMLElement)) return true;
        return node.children.length > 0 && Array.from(node.children).every(concealed) && !Array.from(node.childNodes).some(child => child.nodeType === 3 && child.textContent?.trim());
      };
      for (const [eventId] of new Map([...narrating, ...linked])) {
        const row = document.getElementById(`event-container-${eventId}`);
        if (!row || !narrationLayout.has(row) || !concealed(row)) continue;
        for (const node of [row, ...(row.parentElement?.id === `event-${eventId}` && row.parentElement.children.length === 1 ? [row.parentElement] : [])]) {
          emptyRows.set(node, { value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') }); node.style.setProperty('display', 'none', 'important');
        }
      }
    }
    const desired = new Set<HTMLElement>();
    if (prefs.automaticDamage) for (const [attackId, proof] of progress) {
      const outcome = outcomes.get(proof.outcomeKey ?? '');
      if (proof.campaign !== campaign || outcome?.status === 'failed' || outcome?.status === 'unknown') { progress.delete(attackId); continue; }
      const card = document.getElementById(`event-message-card-${attackId}`);
      const chain = card && ancestry(card, 24);
      const event = chain?.map(fiber => fiber.memoizedProps?.event as Native | undefined).find(event => event?.id === attackId);
      if (!card || !chain || event?.request_id !== proof.request || event.campaign_id !== campaign || event.character_id !== proof.character
        || event.command_used !== 'roll_attack' || !encounterMatches(card, proof.encounter)
        || !chain.some(fiber => fiber.memoizedProps?.eventId === attackId && typeof fiber.type === 'function' && String(fiber.type).includes('event-message-card-'))) {
        if (card) progress.delete(attackId); continue;
      }
      // Native nS starts its dice animation when the exact result mounts.
      // The native accepted choice points to that result; no latest-row guess.
      if (outcome && id(outcome.rollResultId)) {
        const resultCard = document.getElementById(`event-message-card-${outcome.rollResultId}`);
        const resultEvent = resultCard && ancestry(resultCard, 24).some(fiber => {
          const result = fiber.memoizedProps?.event as Native | undefined;
          return !!result && result.id === outcome.rollResultId && result.campaign_id === campaign && result.character_id === proof.character && result.events_roll?.roll_type === 'Damage';
        });
        // React may insert nS's dice DOM before its current event props can be
        // resolved. The already-proven native choice supplies the exact ID;
        // its event wrapper and unique native dice panel prove the mount even
        // in that commit gap. Never select a latest or nearby Damage row.
        const resultMount = resultCard && resultCard.closest(`[id="event-${outcome.rollResultId}"]`)
          && resultCard.querySelectorAll('div.relative.rounded-2xl.border-2.overflow-hidden').length === 1;
        if (resultEvent || resultMount) { progress.delete(attackId); continue; }
      }
      if (proof.outcomeKey && pendingNativeDiceMounted(proof.outcomeKey)) { progress.delete(attackId); continue; }
      const panels = Array.from(card.querySelectorAll<HTMLElement>('div')).filter(node => {
        const fiber = committedFiber(node), classes = fiber?.memoizedProps?.className;
        return fiber?.tag === 5 && fiber.type === 'div' && typeof classes === 'string'
          && ['relative', 'rounded-2xl', 'border-2', 'overflow-hidden'].every(marker => classes.split(/\s+/).includes(marker))
          && ancestry(node, 24).some(fiber => (fiber.memoizedProps?.event as Native)?.id === attackId);
      });
      if (panels.length !== 1) continue;
      const panel = panels[0]; desired.add(panel);
      let status = statuses.get(panel);
      if (!status) {
        status = document.createElement('span'); status.setAttribute('data-ff-combat-damage-progress', 'true'); status.setAttribute('data-ff-translation-ignore', 'true'); status.setAttribute('role', 'status');
        status.style.cssText = 'display:block;text-align:right;font:inherit;font-size:12px;line-height:1.4;color:inherit;opacity:.8;padding:4px 12px 8px;position:absolute;right:0;bottom:0;max-width:100%;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none';
        statuses.set(panel, status); panel.append(status);
      }
      const text = language === 'ru' ? 'Бросок урона выполняется…' : 'Damage roll in progress…';
      if (status.textContent !== text) status.textContent = text;
    }
    for (const [panel, status] of statuses) if (!desired.has(panel)) { status.remove(); statuses.delete(panel); }
  }
  function eventSnapshots(anchor: Element): Native[] {
    const snapshots: Native[] = [];
    for (const row of Array.from(document.querySelectorAll('[id^="event-container-"]')).slice(-30)) { const event = eventFor(row); if (event) snapshots.push(event); }
    for (const fiber of ancestry(anchor, 48)) {
      const events = fiber.memoizedProps?.events;
      if (Array.isArray(events)) snapshots.push(...events.slice(-30));
    }
    return snapshots;
  }
  function nativeRollSignature(value: Native | undefined, persisted = false): string | null {
    if (!value) return null;
    const fields = [['rollType','roll_type'], ['totalRoll','total_roll'], ['baseRoll','base_roll'], ['modifierStat','modifier_stat'], ['modifierValue','modifier_value'], ['proficiencyBonus','proficiency_bonus'], ['vantage','vantage'], ['dice','dice'], ['baseRollsArray','base_rolls_array']];
    const values = fields.map(pair => value[pair[persisted ? 1 : 0]]);
    if (values[0] !== 'Damage' || ![1,2,4,5].every(index => typeof values[index] === 'number' && Number.isFinite(values[index]))
      || values[3] !== null && typeof values[3] !== 'string' || typeof values[6] !== 'string'
      || ![7,8].every(index => Array.isArray(values[index]) && values[index].length > 0 && values[index].length <= 100 && values[index].every((number: unknown) => typeof number === 'number' && Number.isFinite(number)))
      || !values[7].every((die: number) => Number.isSafeInteger(die) && die > 0)) return null;
    return JSON.stringify(values);
  }
  function pendingNativeDiceMounted(key: string): boolean {
    const watch = nativeWatches.get(key), publication = watch?.publication;
    if (!watch || !publication || watch.outcome.status !== 'claimed') return false;
    // ee inserts its native event+dice before awaiting the choice link update.
    // During that interval only this uniquely owned pending invocation knows
    // the exact roll values. This proof removes UI status ONLY: it does not
    // accept a choice, record a rollResultId, or invoke any native operation.
    if ([...nativeWatches.values()].filter(value => value.outcome.campaign === watch.outcome.campaign && value.outcome.character === watch.outcome.character && value.publication).length !== 1) return false;
    let result: Native;
    try { result = publication.observer.getCurrentResult(); } catch { return false; }
    if (result.status !== 'pending' || result.variables !== publication.variables || result.submittedAt !== publication.submittedAt
      || nativeRollSignature(result.variables.rollResult) !== publication.signature) return false;
    const groups = new Map<string | number, Native[]>();
    for (const event of eventSnapshots(watch.anchor)) {
      if (!id(event?.id) || watch.baselineIds.has(event.id)) continue;
      const values = groups.get(event.id) ?? []; values.push(event); groups.set(event.id, values);
    }
    const fresh = [...groups].filter(([, values]) => values.some(event => event.campaign_id === watch.outcome.campaign && event.character_id === watch.outcome.character && Date.parse(event.created_at) >= watch.outcome.started));
    // Any other new event for this same character is competing activity. Do
    // not choose the most recent, or simply pick a matching number among them.
    if (fresh.length !== 1 || traversalBudget <= 0) return false;
    const [eventId, snapshots] = fresh[0], proof = linked.get(watch.outcome.eventId);
    const { variables } = publication;
    const complete = snapshots.filter(event => event.events_roll);
    if (!complete.length || snapshots.some(event => event.campaign_id !== watch.outcome.campaign || event.character_id !== watch.outcome.character
      || event.role !== 'player' || event.command_used !== 'roll' || !id(event.request_id) || event.request_id === proof?.request
      || !Number.isFinite(Date.parse(event.created_at)) || Date.parse(event.created_at) < watch.outcome.started || variables.rollCharacter.profile_id && event.profile_id !== variables.rollCharacter.profile_id)
      || complete.some(event => nativeRollSignature(event.events_roll, true) !== publication.signature
        || event.events_roll.event_id !== undefined && event.events_roll.event_id !== eventId
        || event.events_roll.campaign_id !== undefined && event.events_roll.campaign_id !== watch.outcome.campaign
        || (event.events_roll.message ?? null) !== (variables.message || null)
        || typeof watch.choice.dc === 'number' && watch.choice.dc !== 0 && event.events_roll.dc !== watch.choice.dc)) return false;
    const card = document.getElementById(`event-message-card-${eventId}`);
    return !!card?.closest(`[id="event-${eventId}"]`) && card.querySelectorAll('div.relative.rounded-2xl.border-2.overflow-hidden').length === 1;
  }
  function watchNativeRoll(key: string, outcome: Outcome, owner: Fiber, choice: Native): void {
    const observers = new Map<Observer, { observer: Observer; baseline: Native; unsubscribe?: () => void }>();
    let hook = owner.memoizedState;
    for (let count = 0; hook && count < 240; count++, hook = hook.next as typeof hook) {
      const value = hook.memoizedState as Observer | undefined;
      if (typeof value?.getCurrentResult !== 'function' || typeof value.subscribe !== 'function' || typeof value.options?.mutationFn !== 'function') continue;
      try { const baseline = value.getCurrentResult(); if (baseline?.status !== 'pending') observers.set(value, { observer: value, baseline }); } catch { /* Ignore unknown native hook values. */ }
    }
    if (hook || !observers.size) return;
    const anchor = document.getElementById(`event-container-${outcome.eventId}`); if (!anchor) return;
    const watch: NativeWatch = { outcome, choice, anchor, baselineIds: new Set(eventSnapshots(anchor).map(event => event.id).filter(id)), observers: [...observers.values()] };
    nativeWatches.set(key, watch);
    for (const item of watch.observers) try { item.unsubscribe = item.observer.subscribe(() => schedule()); } catch { observers.delete(item.observer); }
    watch.observers = watch.observers.filter(item => observers.has(item.observer));
  }
  function observeNativeRolls(): void {
    for (const [key, watch] of nativeWatches) {
      const outcome = watch.outcome;
      const proof = linked.get(outcome.eventId), row = document.getElementById(`event-container-${outcome.eventId}`);
      if (!proof || proof.outcomeKey !== key || !row || !encounterMatches(row, proof.encounter) || !prefs.automaticDamage || outcome.campaign !== campaign || outcome.status === 'failed' || outcome.status === 'unknown' || Date.now() - outcome.started > 120000) { if (turnPresentation?.outcomeKey === key) releaseTurnPresentation(); clearNativeWatch(key); continue; }
      const matches: { result: Native; observer: Observer }[] = [];
      for (const { observer, baseline } of watch.observers) try {
        const result = observer.getCurrentResult(), variables = result?.variables;
        // t5 passes these exact native arguments to B.mutate (which returns
        // void). Fresh observer state plus choice object identity ties failure
        // to our invocation; never inspect a latest global mutation/error.
        if (result !== baseline && variables !== baseline.variables && Number.isFinite(result.submittedAt)
          && result.submittedAt >= outcome.started && result.submittedAt > (baseline.submittedAt ?? 0)
          && variables?.rollChoice === watch.choice && variables.campaign?.id === outcome.campaign
          && variables.rollCharacter?.id === outcome.character && variables.rollChoice.id === outcome.choiceId
          && variables.rollChoice.event_id === outcome.eventId && variables.rollChoice.type === 'Damage'
          && variables.rollResult && typeof variables.rollResult === 'object') matches.push({ result, observer });
      } catch { /* Native observer teardown is not proof of backend failure. */ }
      if (matches.length !== 1) { if (turnPresentation?.outcomeKey === key) releaseTurnPresentation(); watch.publication = undefined; continue; }
      const { result, observer } = matches[0];
      if (turnPresentation?.outcomeKey === key && !['shouldTriggerFranz', 'continueMode_', 'mutateAsync', 'events_choices_rolls', 'insertEventIntoQueryData'].every(marker => String(observer.options.mutationFn).includes(marker))) releaseTurnPresentation();
      if (result.status === 'error') { outcome.status = 'failed'; if (turnPresentation?.outcomeKey === key) releaseTurnPresentation(); clearNativeWatch(key); }
      else if (result.status === 'success') { outcome.rollSucceeded = true; outcome.rollSignature = nativeRollSignature(result.variables.rollResult) ?? undefined; if (turnPresentation?.outcomeKey === key) turnPresentation.completed = true; clearNativeWatch(key); }
      else if (result.status === 'pending') {
        const source = String(observer.options.mutationFn), signature = nativeRollSignature(result.variables.rollResult);
        if (signature && ['rollResult', 'rollChoice', 'events_choices_rolls', 'INSERT_EVENT', 'insertEventIntoQueryData'].every(marker => source.includes(marker))) {
          if (!watch.publication) watch.publication = { observer, variables: result.variables, submittedAt: result.submittedAt, signature };
        }
      }
    }
  }
  function observeOutcomes(): void {
    for (const outcome of outcomes.values()) {
      if (outcome.campaign !== campaign || outcome.status !== 'claimed') continue;
      const row = document.getElementById(`event-container-${outcome.eventId}`), proof = linked.get(outcome.eventId);
      const resultIds = new Set<string | number>();
      if (row && proof?.outcomeKey && outcomes.get(proof.outcomeKey) === outcome && encounterMatches(row, proof.encounter)) {
        const snapshots: Native[] = [];
        const event = eventFor(row); if (event) snapshots.push(event);
        // uJ publishes its native events collection independently of memoized
        // per-row event/choice props. Read only the same committed ancestry,
        // bounded loaded history, and exact causal event/choice identity.
        for (const fiber of ancestry(row, 48)) {
          const events = fiber.memoizedProps?.events;
          if (Array.isArray(events)) snapshots.push(...events.slice(-30));
        }
        for (const event of snapshots) {
          if (event?.id !== outcome.eventId || event.role !== 'dm' || event.campaign_id !== outcome.campaign || event.request_id !== proof.request || !Array.isArray(event.rollChoices)) continue;
          const choices = event.rollChoices.filter((choice: Native) => choice?.id === outcome.choiceId);
          if (choices.length !== 1) continue;
          const choice = choices[0];
          if (choice.accepted === true && choice.type === 'Damage' && choice.event_id === outcome.eventId && choice.character_id === outcome.character && id(choice.roll_result_id)) resultIds.add(choice.roll_result_id);
        }
      }
      if (resultIds.size === 1) { outcome.status = 'accepted'; outcome.rollResultId = [...resultIds][0]; }
      else if (Date.now() - outcome.started > 120000) outcome.status = 'unknown';
    }
  }
  function applyFlow(): void {
    const current = ticket;
    if (!current) return;
    if (Date.now() - current.started > 120000 || campaign !== current.campaign || location.pathname !== route) { cancel(); return; }
    if (!current.request || !current.attackId || !prefs.automaticDamage) return;
    localResult(current, current.observer.getCurrentResult());
    if (ticket !== current) return;
    const rows = Array.from(document.querySelectorAll('[id^="event-container-"]')).slice(-30).reverse();
    const entries = rows.map(row => ({ row, event: eventFor(row) }));
    if (traversalBudget <= 0) { cancel(); return; }
    const attacks = entries.filter(entry => entry.event?.id === current.attackId);
    if (attacks.length > 1) { cancel(); return; }
    const attack = attacks[0]?.event, roll = attack?.events_roll;
    // Timestamps are used only to cancel competing activity, never to prove
    // local ownership or select a roll. The observer supplies that identity.
    if (entries.some(({ event }) => event?.campaign_id === campaign && event.character_id === current.character
      && event.command_used === 'roll_attack' && event.request_id !== current.request && Date.parse(event.created_at) >= current.started)) { cancel(); return; }
    if (!attack) return;
    if (!encounterMatches(attacks[0].row, current.encounter)) { cancel(); return; }
    if (attack.role !== 'player' || attack.command_used !== 'roll_attack' || attack.request_id !== current.request || attack.campaign_id !== campaign
      || attack.character_id !== current.character || !roll || roll.roll_type !== current.rollType || roll.dc !== current.dc
      || roll.modifier_value !== current.modifier || roll.proficiency_bonus !== current.proficiency || typeof roll.total_roll !== 'number' || !Number.isFinite(roll.total_roll)) { cancel(); return; }
    // This is the native eJ hit rule captured in its submit function. Critical
    // dice remain entirely owned by the following native Damage callback.
    if (roll.total_roll < roll.dc) { cancel(true); return; }
    progress.set(attack.id, { campaign, encounter: current.encounter, request: current.request, character: current.character });
    // The local observer + validated hit own this causal intermediate already
    // while it streams. Conceal its narration without claiming or accepting a
    // choice; cancellation restores it. A competing DM event is ambiguous.
    const intermediate = entries.filter(({ event }) => event?.role === 'dm' && event.campaign_id === campaign && event.request_id === current.request);
    if (intermediate.length > 1) { cancel(); return; }
    if (intermediate.length === 1) {
      const entry = intermediate[0];
      if (entry.event?.error) { cancel(); return; }
      if (entry.event?.command_used !== 'encounter_player_turn_action_response' || !encounterMatches(entry.row, current.encounter)) { cancel(); return; }
      // The exact GM invocation can finish without requesting Damage. Release
      // its final answer, but retain the ticket: realtime choice delivery may
      // still follow mutation success and must keep native once-only authority.
      if (current.finished && Array.isArray(entry.event.rollChoices)
        && !entry.event.rollChoices.some((choice: Native) => choice?.type === 'Damage' && choice.character_id === current.character)) {
        narrating.delete(entry.event.id); pendingPrompts.delete(entry.event.id); progress.delete(attack.id); return;
      }
      if (id(entry.event.id)) narrating.set(entry.event.id, { campaign, encounter: current.encounter, request: current.request });
      if (!entry.event.error && Array.isArray(entry.event.rollChoices)) {
        const choices = entry.event.rollChoices.filter((choice: Native) => choice?.type === 'Damage' && choice.character_id === current.character);
        if (choices.length === 1 && id(choices[0].id) && choices[0].event_id === entry.event.id && choices[0].accepted === null && typeof choices[0].dice_expression === 'string') {
          const owners = new Set<Fiber>();
          for (const button of Array.from(entry.row.querySelectorAll('button')).slice(0, 40)) for (const fiber of ancestry(button, 16)) {
            const props = fiber.memoizedProps, choice = props?.rollChoice as Native | undefined;
            if (choice && choice.id === choices[0].id && choice.event_id === entry.event.id && choice.character_id === current.character && props?.campaignId === campaign
              && (props.usersCharacter as Native)?.id === current.character && choice.accepted === null
              && ['type', 'dice_expression', 'fixed_bonus', 'modifier_value', 'number_of_dice', 'proficiency_bonus'].every(field => choice[field] === choices[0][field])) owners.add(fiber);
          }
          if (owners.size === 1) pendingPrompts.set(entry.event.id, { campaign, encounter: current.encounter, request: current.request, character: current.character, choiceId: choices[0].id, choiceOwner: [...owners][0] });
        }
      }
    }
    if (!current.finished) return;
    const matches: { row: Element; event: Native; choice: Native }[] = [];
    for (const { row, event } of entries) {
      if (event?.role !== 'dm' || event.campaign_id !== campaign || event.request_id !== current.request) continue;
      if (event.command_used !== 'encounter_player_turn_action_response' || !Array.isArray(event.rollChoices)) { cancel(); return; }
      const choices = event.rollChoices.filter((choice: Native) => choice?.type === 'Damage' && choice.character_id === current.character);
      if (choices.length === 0) continue; // A streamed DM event may precede its native roll choice.
      if (choices.length !== 1 || !id(choices[0].id) || choices[0].event_id !== event.id || choices[0].accepted !== null || typeof choices[0].dice_expression !== 'string') { cancel(); return; }
      matches.push({ row, event, choice: choices[0] });
    }
    if (matches.length === 0) return;
    if (matches.length !== 1) { cancel(); return; }
    const match = matches[0];
    // The captured causal GM observer already awaited the response and native
    // typing cleanup. event.processed only drives oM's Thoughts placeholder;
    // it can remain false while Damage is awaiting acceptance, so gating on it
    // would deadlock the native flow. Preserve native event-error protection.
    if (match.event.error) return;
    if (!encounterMatches(match.row, current.encounter)) { cancel(); return; }
    const candidates: { button: HTMLButtonElement; callback: (event: Native) => unknown }[] = [];
    const buttons = Array.from(match.row.querySelectorAll<HTMLButtonElement>('button'));
    if (buttons.length > 40) { cancel(); return; }
    for (const button of buttons) {
      if (!button.isConnected || button.disabled || button.matches(':disabled') || button.closest('[hidden],[aria-hidden="true"]') || !button.getClientRects().length && ![...hiddenPrompts.keys()].some(node => node.contains(button))) continue;
      const chain = ancestry(button, 16), props = chain[0]?.memoizedProps;
      const owners = chain.map(fiber => fiber.memoizedProps).filter(p => (p?.rollChoice as Native)?.id === match.choice.id && p?.campaignId === campaign
        && (p?.usersCharacter as Native)?.id === current.character && (p?.rollChoice as Native)?.event_id === match.event.id && (p?.rollChoice as Native)?.accepted === null
        && ['type', 'dice_expression', 'vantage', 'modifier', 'dice_type', 'fixed_bonus', 'modifier_value', 'number_of_dice', 'proficiency_bonus'].every(field => (p?.rollChoice as Native)[field] === match.choice[field]));
      // Source contract for the exact native quick-roll callback must be
      // captured; dismiss/custom-dice buttons may share the same t5 owner.
      if (owners.length === 1 && typeof props?.onClick === 'function' && String(props.onClick).includes('dice_expression')) candidates.push({ button, callback: props.onClick as (event: Native) => unknown });
    }
    if (candidates.length !== 1) return;
    const candidate = candidates[0], key = `${campaign}:${attack.id}:${match.choice.id}`;
    if (claimed.has(key)) { cancel(); return; }
    ancestryCache.delete(candidate.button); currentFiberCache.clear(); rootCache.clear();
    const latestChain = ancestry(candidate.button, 16), latest = latestChain[0]?.memoizedProps;
    const choiceOwner = latestChain.find(fiber => (fiber.memoizedProps?.rollChoice as Native)?.id === match.choice.id);
    const latestOwner = choiceOwner?.memoizedProps;
    if (!candidate.button.isConnected || candidate.button.disabled || candidate.button.matches(':disabled') || latest?.disabled === true || latest?.['aria-disabled'] === true
      || latest?.onClick !== candidate.callback || (latestOwner?.rollChoice as Native)?.accepted !== null || (latestOwner?.usersCharacter as Native)?.id !== current.character
      || latestOwner?.campaignId !== campaign || !encounterMatches(candidate.button, current.encounter)) { cancel(); return; }
    if (traversalBudget <= 0 || !choiceOwner) { cancel(); return; }
    const outcome: Outcome = { campaign, character: current.character, eventId: match.event.id, choiceId: match.choice.id, started: Date.now(), status: 'claimed' };
    outcomes.set(key, outcome);
    claimed.add(key); linked.set(match.event.id, { campaign, encounter: current.encounter, request: current.request, attackId: attack.id, outcomeKey: key, choiceOwner }); cancel(true);
    transferTurnPresentation(current, key);
    progress.set(attack.id, { campaign, encounter: current.encounter, request: current.request, character: current.character, outcomeKey: key });
    syncNarration(); syncPrompts(); syncPresentation();
    const completion: Completion = { source: current, outcome, watches: [], state: 'waiting' };
    completions.set(key, completion);
    for (const observer of gmObservers(choiceOwner)) addFinalWatch(completion, observer, 'automatic');
    watchNativeRoll(key, outcome, choiceOwner, latestOwner!.rollChoice as Native);
    if (!nativeWatches.has(key)) { retireCompletion(key); releaseTurnPresentation(); }
    try { const result = candidate.callback({ stopPropagation() {}, preventDefault() {}, currentTarget: candidate.button, target: candidate.button });
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') void Promise.resolve(result).catch(() => { outcome.status = 'failed'; if (turnPresentation?.outcomeKey === key) releaseTurnPresentation(); schedule(); });
    } catch { outcome.status = 'failed'; if (turnPresentation?.outcomeKey === key) releaseTurnPresentation(); schedule(); /* Unknown send outcome is terminal. Keep native manual controls. */ }
  }
  function sync(): void {
    frame = 0;
    traversalBudget = 50000; ancestryCache.clear(); currentFiberCache.clear(); rootCache.clear();
    if (disposed) return;
    syncRoute();
    if (!campaign) return;
    try { syncQuery(); observeNativeRolls(); observeOutcomes(); applyFlow(); pruneAbsentLinks(); syncNarration(); syncPrompts(); syncPresentation(); syncCompletions(); syncTurnPresentation(); syncTurnFootprint(); } catch { releaseQuery(); cancel(); restoreAll(); }
  }
  function schedule(): void { if (!disposed && !frame) frame = requestAnimationFrame(sync); }
  // Mutation delivery precedes paint; RAF-only concealment permits a first-frame flash.
  const observer = new MutationObserver(() => { if (frame) cancelAnimationFrame(frame); sync(); });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ff-combat-docked', 'data-ff-combat-panel-mode', 'hidden', 'aria-hidden'] });
  function storageChanged(event: StorageEvent): void {
    if (event.storageArea !== localStorage || event.key !== storageKey()) return;
    releaseQuery(); cancel(); linked.clear(); restoreAll(); syncRoute(); prefs = campaign ? read() : { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false }; schedule();
  }
  const timer = window.setInterval(schedule, 500);
  window.addEventListener('storage', storageChanged);
  document.addEventListener('submit', submitted, true);
  window.addEventListener('popstate', schedule);
  host[key] = {
    getPreferences, setPreferences,
    update(nextLocale) { language = nextLocale; schedule(); },
    dispose() { releaseQuery(); disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('submit', submitted, true); window.clearInterval(timer); window.removeEventListener('popstate', schedule); window.removeEventListener('storage', storageChanged); cancel(); restoreAll(); delete host[key]; }
  };
  schedule();
}
