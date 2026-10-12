// Serialized into the website; keep the entire adapter self-contained.
export function configureCombatFlow(enabled: boolean, locale: 'en' | 'ru'): void {
  type Snapshot = { campaignId: string; automaticDamage: boolean; hideIntermediateFranz: boolean; hideDamagePrompt: boolean };
  type Controller = { update(locale: 'en' | 'ru'): void; dispose(): void; getPreferences(): Snapshot | null; setPreferences(value: unknown): Snapshot };
  type Fiber = { tag?: number; type?: unknown; memoizedProps?: Record<string, unknown>; memoizedState?: { memoizedState?: unknown; next?: unknown }; return?: Fiber; child?: Fiber; sibling?: Fiber; alternate?: Fiber; stateNode?: { current?: Fiber } };
  type Native = Record<string, any>;
  type Observer = { options: { mutationFn: Function }; getCurrentResult(): Native; subscribe(listener: (result: Native) => void): () => void };
  type Ticket = { campaign: string; encounter: string | number; character: string | number; target: string | number; dc: number; rollType: string; modifier: number; proficiency: number; observer: Observer; baseline: Native; started: number; request?: string; attackId?: string | number; finished?: boolean; unsubscribe?: () => void };
  type Outcome = { campaign: string; character: string | number; eventId: string | number; choiceId: string | number; started: number; status: 'claimed' | 'accepted' | 'failed' | 'unknown'; rollResultId?: string | number };
  type Preferences = { automaticDamage: boolean; hideIntermediateFranz: boolean; hideDamagePrompt: boolean };
  const key = '__friendsFablesDesktopCombatFlow';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  let disposed = false, frame = 0, campaign = '', route = '';
  let prefs: Preferences = { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false };
  let ticket: Ticket | null = null;
  let traversalBudget = 50000;
  const currentFiberCache = new Map<Fiber, Fiber | null>();
  const rootCache = new Map<Fiber, Fiber | null>();
  const ancestryCache = new Map<Element, { depth: number; fibers: Fiber[] }>();
  const claimHost = window as unknown as { __friendsFablesDesktopCombatFlowClaims?: Set<string>; __friendsFablesDesktopCombatFlowOutcomes?: Map<string, Outcome> };
  const claimed = claimHost.__friendsFablesDesktopCombatFlowClaims ??= new Set<string>();
  const outcomes = claimHost.__friendsFablesDesktopCombatFlowOutcomes ??= new Map<string, Outcome>();
  const linked = new Map<string | number, { campaign: string; encounter: string | number; request: string; outcomeKey: string; choiceOwner: Fiber }>();
  const narrating = new Map<string | number, { campaign: string; encounter: string | number; request: string }>();
  const hidden = new Map<HTMLElement, { value: string; priority: string }>();
  const hiddenPrompts = new Map<HTMLElement, { value: string; priority: string }>();
  const narrationLayout = new Map<HTMLElement, Map<string, { value: string; priority: string }>>();
  const storageKey = (): string => `ff-desktop-combat-flow-v1:${campaign}`;
  function cancel(): void { const current = ticket; ticket = null; if (narrating.size) { narrating.clear(); schedule(); } try { current?.unsubscribe?.(); } catch { /* Native lifecycle may already be disposed. */ } }
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
  function restoreAll(): void { restore(); restorePrompts(); }
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
      cancel(); linked.clear(); restoreAll(); route = path; campaign = next;
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
    if (!prefs.automaticDamage) { cancel(); linked.clear(); restoreAll(); }
    else { if (!prefs.hideIntermediateFranz) restore(); if (!prefs.hideDamagePrompt) restorePrompts(); }
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
      ticket = current;
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
      if (!row || proof.campaign !== campaign || !encounterMatches(row, proof.encounter)) { linked.delete(eventId); continue; }
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
    if (prefs.automaticDamage && prefs.hideDamagePrompt) for (const [eventId, proof] of linked) {
      const outcome = outcomes.get(proof.outcomeKey);
      if (outcome?.status !== 'accepted' || outcome.campaign !== campaign || outcome.eventId !== eventId || proof.campaign !== campaign) continue;
      const row = document.getElementById(`event-container-${eventId}`), event = row && eventFor(row);
      if (!row || !encounterMatches(row, proof.encounter) || event?.role !== 'dm' || event.campaign_id !== campaign || event.request_id !== proof.request) continue;
      const owner = currentFiber(proof.choiceOwner), props = owner?.memoizedProps, choice = props?.rollChoice as Native | undefined;
      const choices = Array.isArray(event.rollChoices) ? event.rollChoices.filter((value: Native) => value?.id === outcome.choiceId) : [];
      if (choices.length !== 1 || choices[0].accepted !== true || choices[0].type !== 'Damage' || choices[0].roll_result_id !== outcome.rollResultId
        || choices[0].character_id !== outcome.character || choices[0].event_id !== eventId
        || props?.campaignId !== campaign || (props.usersCharacter as Native)?.id !== outcome.character
        || choice?.id !== outcome.choiceId || choice.event_id !== eventId || choice.character_id !== outcome.character
        || choice.type !== 'Damage' || choice.accepted !== true || choice.roll_result_id !== outcome.rollResultId) continue;
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
  function observeOutcomes(): void {
    for (const outcome of outcomes.values()) {
      if (outcome.campaign !== campaign || outcome.status !== 'claimed') continue;
      const row = document.getElementById(`event-container-${outcome.eventId}`), event = row && eventFor(row);
      const choice = Array.isArray(event?.rollChoices) && event.rollChoices.find((value: Native) => value?.id === outcome.choiceId);
      if (choice?.accepted === true && choice.character_id === outcome.character && id(choice.roll_result_id)) {
        outcome.status = 'accepted'; outcome.rollResultId = choice.roll_result_id;
      } else if (outcome.status === 'claimed' && Date.now() - outcome.started > 120000) outcome.status = 'unknown';
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
    if (roll.total_roll < roll.dc) { cancel(); return; }
    // The local observer + validated hit own this causal intermediate already
    // while it streams. Conceal its narration without claiming or accepting a
    // choice; cancellation restores it. A competing DM event is ambiguous.
    const intermediate = entries.filter(({ event }) => event?.role === 'dm' && event.campaign_id === campaign && event.request_id === current.request);
    if (intermediate.length > 1) { cancel(); return; }
    if (intermediate.length === 1) {
      const entry = intermediate[0];
      if (entry.event?.command_used !== 'encounter_player_turn_action_response' || !encounterMatches(entry.row, current.encounter)) { cancel(); return; }
      if (id(entry.event.id)) narrating.set(entry.event.id, { campaign, encounter: current.encounter, request: current.request });
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
      if (!button.isConnected || button.disabled || button.matches(':disabled') || button.closest('[hidden],[aria-hidden="true"]') || !button.getClientRects().length) continue;
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
    claimed.add(key); linked.set(match.event.id, { campaign, encounter: current.encounter, request: current.request, outcomeKey: key, choiceOwner }); cancel();
    syncNarration();
    try { const result = candidate.callback({ stopPropagation() {}, preventDefault() {}, currentTarget: candidate.button, target: candidate.button });
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') void Promise.resolve(result).catch(() => { outcome.status = 'failed'; schedule(); });
    } catch { outcome.status = 'failed'; schedule(); /* Unknown send outcome is terminal. Keep native manual controls. */ }
  }
  function sync(): void {
    frame = 0;
    traversalBudget = 50000; ancestryCache.clear(); currentFiberCache.clear(); rootCache.clear();
    if (disposed) return;
    syncRoute();
    if (!campaign) return;
    try { observeOutcomes(); applyFlow(); syncNarration(); syncPrompts(); } catch { cancel(); restoreAll(); }
  }
  function schedule(): void { if (!disposed && !frame) frame = requestAnimationFrame(sync); }
  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ff-combat-docked', 'data-ff-combat-panel-mode', 'hidden', 'aria-hidden'] });
  function storageChanged(event: StorageEvent): void {
    if (event.storageArea !== localStorage || event.key !== storageKey()) return;
    cancel(); linked.clear(); restoreAll(); syncRoute(); prefs = campaign ? read() : { automaticDamage: false, hideIntermediateFranz: false, hideDamagePrompt: false }; schedule();
  }
  const timer = window.setInterval(schedule, 500);
  window.addEventListener('storage', storageChanged);
  document.addEventListener('submit', submitted, true);
  window.addEventListener('popstate', schedule);
  host[key] = {
    getPreferences, setPreferences,
    update() { schedule(); },
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('submit', submitted, true); window.clearInterval(timer); window.removeEventListener('popstate', schedule); window.removeEventListener('storage', storageChanged); cancel(); restoreAll(); delete host[key]; }
  };
  schedule();
}
