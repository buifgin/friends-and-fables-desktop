import type { AppearanceSettings } from './themes';
import { messageForeground, rgba, styleBackground } from './themes';
import { borderCss } from './borders';

// Runs in the website's renderer with ordinary DOM access and no Electron APIs.
// Targets are based on the public play-route components.
export function configureChatAppearance(settings: AppearanceSettings): void {
  const key = '__friendsFablesDesktopChatAppearance';
  const host = window as unknown as Record<string, { dispose(): void; followAfterSubmit(): void } | undefined>;
  host[key]?.dispose();


  let marked = new Map<Element, Set<string>>();
  let next = new Map<Element, Set<string>>();
  let frame = 0;
  let disposed = false;
  let expandedComposer: HTMLElement | null = null;
  const expandButtons = new Map<HTMLElement, HTMLButtonElement>();
  type NativeEvent = { id?: number | null; role?: string; content?: string; campaign_id?: string; character_id?: number | string | null; isOptimistic?: boolean };
  type Snapshot = { clone: HTMLElement; at: number; gapAt?: number; card: HTMLElement; event?: NativeEvent; signature?: string; optimistic: boolean;
    body: HTMLElement; text: string; anchorNode?: Text; anchorTop?: number; height: number; width: number; top: number; left: number; overlay?: HTMLElement;
    translationPreview?: boolean;
    geometry?: { card: HTMLElement; properties: Map<string, { value: string; priority: string; applied: string }> } };
  const snapshots = new Map<string, Snapshot>();
  let snapshotCampaign: string | undefined;
  let snapshotTimer = 0;
  function closeExpanded(): void {
    expandedComposer?.removeAttribute('data-ff-desktop-input-expanded'); expandedComposer = null;
    for (const button of expandButtons.values()) { button.setAttribute('aria-expanded', 'false'); button.textContent = '↗'; button.title = 'Expand message input'; button.setAttribute('aria-label', 'Expand message input'); }
    schedule();
  }
  function nativeEvent(card: Element): NativeEvent | undefined {
    const fiberKey = Object.keys(card).find(name => name.startsWith('__reactFiber$'));
    type Fiber = { memoizedProps?: { event?: NativeEvent }; return?: Fiber };
    let fiber = fiberKey ? (card as unknown as Record<string, Fiber>)[fiberKey] : undefined;
    for (let depth = 0; fiber && depth < 30; depth++, fiber = fiber.return) {
      const event = fiber.memoizedProps?.event;
      if (event?.role === 'player' || event?.role === 'dm' || event?.role === 'npc') return event;
    }
    return;
  }
  // Only a newly mounted, trusted normal-prose row can wait for first ink.
  // Existing/hydrating rows are already presented and never enter this gate.
  const presentedRows = new WeakSet<Element>(document.querySelectorAll('[id^="event-message-card-"]'));
  const firstRows = new Map<HTMLElement, { row: HTMLElement; value: string; priority: string; inert: string | null;
    flow?: { wrapper: HTMLElement; properties: Map<string, { value: string; priority: string; applied: string }> } }>();
  function releaseFirst(card: HTMLElement): void {
    const owned = firstRows.get(card); if (!owned) return;
    // Restore flow before revealing ink, without overwriting newer native writes.
    if (owned.flow) for (const [name, previous] of owned.flow.properties) {
      if (owned.flow.wrapper.style.getPropertyValue(name) !== previous.applied || owned.flow.wrapper.style.getPropertyPriority(name) !== 'important') continue;
      if (previous.value) owned.flow.wrapper.style.setProperty(name, previous.value, previous.priority);
      else owned.flow.wrapper.style.removeProperty(name);
    }
    if (owned.row.style.getPropertyValue('opacity') === '0' && owned.row.style.getPropertyPriority('opacity') === 'important') {
      if (owned.value) owned.row.style.setProperty('opacity', owned.value, owned.priority);
      else owned.row.style.removeProperty('opacity');
    }
    if (owned.row.getAttribute('inert') === '') {
      if (owned.inert === null) owned.row.removeAttribute('inert'); else owned.row.setAttribute('inert', owned.inert);
    }
    firstRows.delete(card);
  }
  function clearFirst(): void { for (const card of firstRows.keys()) releaseFirst(card); }
  function firstPresentation(cards: Iterable<HTMLElement>, campaign: string): void {
    for (const [card, owned] of firstRows) if (!card.isConnected || !owned.row.contains(card)) releaseFirst(card);
    for (const card of cards) {
      const owned = firstRows.get(card);
      if (!owned && presentedRows.has(card)) continue;
      const event = nativeEvent(card) as (NativeEvent & { command_used?: string | null; attachments?: unknown[]; reasoning?: unknown; processed?: boolean; tool_calls?: unknown; events_roll?: unknown }) | undefined;
      const id = event?.id, suffix = id == null ? 'null' : String(id);
      const row = card.closest<HTMLElement>(`[id="event-container-${suffix}"]`);
      const body = card.querySelector<HTMLElement>('.prose');
      // Native oq dispatches rolls/outcomes/scenes separately. Normal oB/oF
      // prose includes these text commands; oM preserves DM Thoughts/loading.
      const normal = event && (event.role === 'player' || event.role === 'dm') && event.campaign_id === campaign
        && typeof event.content === 'string' && event.content.length <= 40000 && (id == null ? event.isOptimistic === true : Number.isSafeInteger(id) && id > 0)
        && card.id === `event-message-card-${suffix}` && row?.closest('#events-list') && row.querySelectorAll('[id^="event-message-card-"]').length === 1
        && (!event.command_used || ['talk','player_chat','cast_spell','encounter_player_turn_action_response'].includes(event.command_used)) && !event.attachments?.length && !(event.role === 'dm' && event.processed === false) && (event.tool_calls == null || Array.isArray(event.tool_calls) && event.tool_calls.length === 0) && !event.events_roll
        && body && !row.querySelector('[role="progressbar"],[aria-busy="true"]:not(.prose):not([data-ff-translation-blank]),.custom-spin,.animate-spin,[data-reasoning],[data-loading],[data-attachment],[data-attachments],audio,video,iframe')
        && !body.querySelector('img,svg,canvas,button,input,textarea,select,[contenteditable],a[download]');
      if (!normal || !row || !body) { presentedRows.add(card); releaseFirst(card); continue; }
      // Respect newer native opacity writes; ownership ends rather than fighting.
      if (owned && (row !== owned.row || row.style.getPropertyValue('opacity') !== '0' || row.style.getPropertyPriority('opacity') !== 'important' || row.getAttribute('inert') !== ''
        || owned.flow && (row.parentElement !== owned.flow.wrapper || Array.from(owned.flow.properties).some(([name, previous]) => owned.flow!.wrapper.style.getPropertyValue(name) !== previous.applied || owned.flow!.wrapper.style.getPropertyPriority(name) !== 'important')))) { presentedRows.add(card); releaseFirst(card); continue; }
      const readable = (element: Element): boolean => {
        for (let node: Element | null = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (node.hasAttribute('hidden') || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse'
            || style.contentVisibility === 'hidden' || style.opacity === '0' && !(owned && node === row)) return false;
        }
        const style = getComputedStyle(element);
        return style.color !== 'transparent' && style.color !== 'rgba(0, 0, 0, 0)' && style.webkitTextFillColor !== 'transparent' && style.webkitTextFillColor !== 'rgba(0, 0, 0, 0)';
      };
      // A collapsed static Thoughts header is not progress. Preserve genuine
      // visible native reasoning content (oM), including expansion while waiting.
      if (Array.from(row.querySelectorAll('[class~="bg-muted/30"][class~="italic"]')).some(element => element.textContent?.trim() && readable(element))) { presentedRows.add(card); releaseFirst(card); continue; }
      let ready = false;
      const presentedRoot = card.querySelector('[data-ff-desktop-message-snapshot]') ?? body;
      const walker = document.createTreeWalker(presentedRoot, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) if (node.textContent?.trim() && node.parentElement && readable(node.parentElement)) { ready = true; break; }
      if (!ready) for (const dot of presentedRoot.querySelectorAll('[data-ff-translation-dot]')) {
        const style = getComputedStyle(dot, '::after');
        if (readable(dot) && style.content && style.content !== 'none' && style.content !== '""') { ready = true; break; }
      }
      if (ready) { presentedRows.add(card); releaseFirst(card); continue; }
      if (!owned) {
        // Opacity preserves translation eligibility and native subtree width. Never
        // claim native-hidden rows or overwrite a previous inline declaration.
        if (!readable(row) || row.closest('[inert]') || row.contains(document.activeElement)) continue;
        presentedRows.add(card);
        firstRows.set(card, { row, value: row.style.getPropertyValue('opacity'), priority: row.style.getPropertyPriority('opacity'), inert: row.getAttribute('inert') });
        row.style.setProperty('opacity', '0', 'important'); row.setAttribute('inert', '');
        const wrapper = row.parentElement;
        if (wrapper?.id === `event-${suffix}` && wrapper.parentElement?.id === 'events-list' && wrapper.children.length === 1) {
          const properties = new Map<string, { value: string; priority: string; applied: string }>();
          const own = (name: string, value: string): void => {
            const previous = { value: wrapper.style.getPropertyValue(name), priority: wrapper.style.getPropertyPriority(name), applied: '' };
            wrapper.style.setProperty(name, value, 'important'); previous.applied = wrapper.style.getPropertyValue(name); properties.set(name, previous);
          };
          // Clip only the zero-height outer wrapper: its native descendants keep
          // measurable client rects and responsive width for real translation.
          const listStyle = getComputedStyle(wrapper.parentElement), margin = getComputedStyle(wrapper).marginTop;
          own('height', '0px'); own('min-height', '0px'); own('overflow-x', 'clip'); own('overflow-y', 'clip');
          if (wrapper.previousElementSibling && listStyle.display === 'flex' && listStyle.flexDirection === 'column' && parseFloat(listStyle.rowGap) > 0) own('margin-top', `calc(${margin} - ${listStyle.rowGap})`);
          firstRows.get(card)!.flow = { wrapper, properties };
        }
      }
    }
    // Pending rows are bounded; already-seen rows remain latched in a WeakSet.
    while (firstRows.size > 32) releaseFirst(firstRows.keys().next().value!);
  }
  function signature(event: NativeEvent | undefined, campaign: string): string | undefined {
    if (!event || typeof event.content !== 'string' || !event.content.trim() || event.content.length > 40000 || event.campaign_id !== campaign) return;
    if (event.role === 'player' && !((typeof event.character_id === 'number' && Number.isSafeInteger(event.character_id) && event.character_id > 0) || (typeof event.character_id === 'string' && event.character_id.length > 0 && event.character_id.length < 128))) return;
    return JSON.stringify([campaign, event.role, event.character_id ?? null, event.content]);
  }
  function visible(element: Element): boolean {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.opacity === '0' || style.contentVisibility === 'hidden') return false;
    }
    return true;
  }
  function removeOverlay(snapshot: Snapshot): void {
    snapshot.overlay?.remove(); snapshot.overlay = undefined;
    if (snapshot.geometry) {
      const { card, properties } = snapshot.geometry;
      for (const [name, previous] of properties) {
        // Do not overwrite a newer native/other-feature inline declaration.
        if (card.style.getPropertyValue(name) !== previous.applied || card.style.getPropertyPriority(name) !== 'important') continue;
        if (previous.value) card.style.setProperty(name, previous.value, previous.priority);
        else card.style.removeProperty(name);
      }
      snapshot.geometry = undefined;
    }
  }
  function clearSnapshots(): void {
    for (const snapshot of snapshots.values()) removeOverlay(snapshot);
    snapshots.clear(); clearTimeout(snapshotTimer);
  }
  function textTop(node: Text): number | undefined {
    const range = document.createRange(); range.selectNodeContents(node);
    const rect = Array.from(range.getClientRects()).find(rect => rect.width > 0 && rect.height > 0);
    return rect?.top;
  }
  function firstText(root: HTMLElement): Text | undefined {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) if (node.textContent?.trim()) return node as Text;
    return;
  }
  function safeClone(body: HTMLElement, translationPreview = false): { clone: HTMLElement; anchorNode?: Text } | undefined {
    const clone = body.cloneNode(true) as HTMLElement;
    // Pair text nodes before sanitization removes hidden/interactive descendants.
    // The first surviving clone text then identifies its exact native source.
    const sourceText = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const cloneText = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const sources = new Map<Node, Text>();
    let copyText: Node | null;
    while ((copyText = cloneText.nextNode())) {
      const source = sourceText.nextNode(); if (source) sources.set(copyText, source as Text);
    }
    const sourceNodes = [body, ...body.querySelectorAll<HTMLElement>('*')];
    const cloneNodes = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
    const excluded = '[data-ff-desktop-hidden-instructions],[data-ff-desktop-sp-draft],script,style,button,input,textarea,select,iframe,video,audio' + (translationPreview ? '' : ',[data-ff-translation-placeholder]');
    for (let index = 0; index < sourceNodes.length; index++) {
      const source = sourceNodes[index], copy = cloneNodes[index];
      if (source.matches(excluded) || !visible(source)) { if (index === 0) return; copy.remove(); continue; }
      copy.removeAttribute('id'); copy.removeAttribute('contenteditable');
      for (const attribute of Array.from(copy.attributes)) if (/^on/i.test(attribute.name)) copy.removeAttribute(attribute.name);
    }
    for (const paragraph of clone.querySelectorAll('p')) if (/^\s*\[\[FF-SP:1\]\][\s\S]*\[\[\/FF-SP:1\]\]\s*$/.test(paragraph.textContent ?? '')) paragraph.remove();
    const text = clone.textContent?.trim() ?? '';
    if ((!text && !(translationPreview && clone.querySelector('[data-ff-translation-dot]'))) || /\[\[\/?FF-SP:1\]\]/.test(text.replace(/\\/g, ''))) return;
    const anchor = firstText(clone);
    return { clone, anchorNode: anchor ? sources.get(anchor) : undefined };
  }
  function showOverlay(snapshot: Snapshot, card: HTMLElement): void {
    if (snapshot.overlay?.isConnected) return;
    snapshot.gapAt ??= Date.now();
    const properties = new Map<string, { value: string; priority: string; applied: string }>();
    const own = (name: string, applied: string): void => {
      properties.set(name, { value: card.style.getPropertyValue(name), priority: card.style.getPropertyPriority(name), applied });
      card.style.setProperty(name, applied, 'important');
    };
    const style = getComputedStyle(card);
    if (style.position === 'static') own('position', 'relative');
    const extra = style.boxSizing === 'border-box' ? 0 : ['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum, name) => sum + (parseFloat(style[name as keyof CSSStyleDeclaration] as string) || 0), 0);
    own('min-height', `${Math.max(0, snapshot.height - extra)}px`);
    snapshot.geometry = { card, properties };
    const overlay = snapshot.clone.cloneNode(true) as HTMLElement;
    overlay.setAttribute('data-ff-desktop-message-snapshot', 'true'); overlay.setAttribute('data-ff-translation-ignore', 'true'); overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText += `;position:absolute!important;top:${snapshot.top}px!important;left:${snapshot.left}px!important;width:${snapshot.width}px!important;max-width:none!important;margin:0!important;pointer-events:none!important;opacity:1!important;visibility:visible!important;animation:none!important;transition:none!important;`;
    snapshot.overlay = overlay; card.append(overlay);
    // Absolute positioning stops the native prose boundary margin collapse.
    // Align the first retained glyph before paint without changing any paragraph
    // margins or internal spacing, and without touching the native body nodes.
    const anchor = firstText(overlay), top = anchor ? textTop(anchor) : undefined;
    if (snapshot.anchorTop !== undefined && top !== undefined) {
      const delta = snapshot.anchorTop - (top - card.getBoundingClientRect().top);
      if (Number.isFinite(delta)) overlay.style.setProperty('top', `${snapshot.top + delta}px`, 'important');
    }
  }
  function snapshotMessages(cards?: Set<HTMLElement>, changedBodies = new Set<HTMLElement>()): void {
    if (disposed) return;
    const campaign = /^\/([^/]+)\/play\/?$/.exec(location.pathname)?.[1];
    const view = new URLSearchParams(location.search).get('view');
    if (!campaign || view && view !== 'play') { clearFirst(); clearSnapshots(); snapshotCampaign = undefined; return; }
    if (snapshotCampaign !== campaign) { clearFirst(); clearSnapshots(); snapshotCampaign = campaign; }
    const now = Date.now();
    // Expire before matching so an old temporary message cannot bridge a new ID.
    for (const [id, snapshot] of snapshots) {
      // Visible bodies remain eligible after quiet time. The four-second limit
      // starts at a real hydration gap/detachment and never refreshes while blank.
      if (!snapshot.card.isConnected && snapshot.optimistic) snapshot.gapAt ??= now;
      if (snapshot.gapAt !== undefined && now - snapshot.gapAt >= 4000 || !snapshot.card.isConnected && !snapshot.optimistic) { removeOverlay(snapshot); snapshots.delete(id); }
    }
    for (const card of cards ?? document.querySelectorAll<HTMLElement>('[id^="event-message-card-"]')) {
      if (!card.isConnected) continue;
      const role = roleFor(card);
      if (!role || settings.dice.enabled && card.querySelector('[class~=\"from-slate-900/95\"][class~=\"to-slate-950/95\"]')) continue;
      if (settings.messages.enabled) mark(card, 'data-ff-desktop-message', role);
      const event = nativeEvent(card), currentSignature = signature(event, campaign);
      const body = Array.from(card.querySelectorAll<HTMLElement>('.prose')).find(element => !element.closest('[contenteditable="true"],[data-ff-desktop-message-snapshot]'));
      let old = snapshots.get(card.id);
      const pending = !!body && (!!body.closest('[data-ff-translation-blank],[data-ff-translation-pending]') || !!body.querySelector('[data-ff-translation-blank],[data-ff-translation-pending],[data-ff-translation-placeholder]'));
      const concealedNarration = role === 'gm' && !!body && Array.from(body.querySelectorAll('p,div,blockquote,ul,ol,pre')).some(element => !visible(element));
      if (pending && body && visible(card) && visible(body) && currentSignature) {
        if (old) removeOverlay(old);
        snapshots.delete(card.id);
        // Retain only what the real translator already painted, including its
        // pending dot. Hidden source text and interactive descendants never enter.
        const preview = body.querySelector<HTMLElement>('[data-ff-translation-placeholder][data-ff-translation-ignore]');
        const safe = preview && preview.textContent!.length <= 20000 ? safeClone(preview, true) : undefined;
        if (safe && preview) {
          const rect = card.getBoundingClientRect(), shown = preview.getBoundingClientRect(), style = getComputedStyle(card);
          const anchor = safe.anchorNode ? textTop(safe.anchorNode) : undefined;
          if (rect.height > 0 && rect.height <= 4000 && shown.width > 0 && shown.height > 0) snapshots.set(card.id, {
            clone: safe.clone, anchorNode: safe.anchorNode, anchorTop: anchor !== undefined ? anchor - rect.top : undefined,
            at: now, card, event, body, text: '', signature: currentSignature,
            optimistic: role === 'player' && event?.isOptimistic === true && event.id == null && card.id === 'event-message-card-null', translationPreview: true,
            height: rect.height, width: shown.width, top: shown.top - rect.top - (parseFloat(style.borderTopWidth) || 0), left: shown.left - rect.left - (parseFloat(style.borderLeftWidth) || 0),
          });
        }
        // Retain only this card's real preview. A confirmed pending body consumes
        // every matching temporary association, including translated previews.
        for (const [id, snapshot] of snapshots) if (id !== card.id && snapshot.optimistic && snapshot.signature === currentSignature) { removeOverlay(snapshot); snapshots.delete(id); }
        continue;
      }
      if (!visible(card) || !body || !visible(body) || pending || concealedNarration) {
        if (old) removeOverlay(old); snapshots.delete(card.id);
        // A pending confirmed body must also invalidate its matching temporary
        // English snapshot; translation-ready cannot later resurrect it.
        for (const [id, snapshot] of snapshots) if (snapshot.optimistic && currentSignature && snapshot.signature === currentSignature) { removeOverlay(snapshot); snapshots.delete(id); }
        continue;
      }
      if (old && !(old.signature !== undefined || currentSignature !== undefined ? old.signature === currentSignature : old.card === card && old.event === event)) { removeOverlay(old); snapshots.delete(card.id); old = undefined; }
      if (body.textContent?.trim()) {
        if (old) removeOverlay(old);
        const text = body.textContent ?? '', rect = card.getBoundingClientRect(), bodyRect = body.getBoundingClientRect();
        // Keep the sanitized clone while native prose is unchanged. Geometry and
        // freshness still track the visible card; unrelated cards need no cloning.
        const safe = old?.body === body && old.text === text && !changedBodies.has(body)
          ? { clone: old.clone, anchorNode: old.anchorNode } : text.length <= 20000 ? safeClone(body) : undefined;
        if (!safe || rect.height <= 0 || rect.height > 4000 || bodyRect.width <= 0 || bodyRect.height <= 0) { snapshots.delete(card.id); continue; }
        const style = getComputedStyle(card);
        const anchor = safe.anchorNode ? textTop(safe.anchorNode) : undefined;
        snapshots.set(card.id, { clone: safe.clone, anchorNode: safe.anchorNode, anchorTop: anchor !== undefined ? anchor - rect.top : undefined,
          at: now, card, event, body, text, signature: currentSignature,
          optimistic: role === 'player' && event?.isOptimistic === true && event.id == null && card.id === 'event-message-card-null' && !!currentSignature,
          height: rect.height, width: bodyRect.width, top: bodyRect.top - rect.top - (parseFloat(style.borderTopWidth) || 0), left: bodyRect.left - rect.left - (parseFloat(style.borderLeftWidth) || 0) });
      } else {
        if (old?.translationPreview && !(window as unknown as Record<string, unknown>).__friendsFablesDesktopTranslation) { removeOverlay(old); snapshots.delete(card.id); old = undefined; }
        if (!old && role === 'player' && event?.role === 'player' && typeof event.id === 'number' && Number.isSafeInteger(event.id) && event.id > 0 && card.id === `event-message-card-${event.id}` && currentSignature && event.isOptimistic !== true) {
          const candidates = Array.from(snapshots.entries()).filter(([, snapshot]) => snapshot.optimistic && !snapshot.card.isConnected && snapshot.signature === currentSignature);
          if (candidates.length === 1) {
            const [id, snapshot] = candidates[0]; snapshots.delete(id); removeOverlay(snapshot);
            old = { ...snapshot, card, event, body, text: '', optimistic: false }; snapshots.set(card.id, old);
          }
        }
        if (old && (old.gapAt === undefined || now - old.gapAt < 4000)) showOverlay(old, card);
      }
    }
    firstPresentation(cards ?? document.querySelectorAll<HTMLElement>('[id^="event-message-card-"]'), campaign);
    while (snapshots.size > 32) { const id = snapshots.keys().next().value!; removeOverlay(snapshots.get(id)!); snapshots.delete(id); }
    clearTimeout(snapshotTimer);
    const gaps = Array.from(snapshots.values()).filter(snapshot => snapshot.gapAt !== undefined);
    if (gaps.length) snapshotTimer = window.setTimeout(() => snapshotMessages(), Math.max(1, Math.min(...gaps.map(snapshot => 4000 - (now - snapshot.gapAt!)))));
  }
  // Prefer a fully visible result over a partially visible preceding narration.
  // Chromium keeps older reading anchors. Only an already-pinned reader receives
  // a finite tail correction when native content grows; manual intent cancels it.
  let scrollFeed: HTMLElement | null = null, scrollTried = false, scrollFrame = 0;
  let scrollYield = false, scrollGesture = false, scrollSeen = false, scrollSelectionYield = false;
  let scrollResize: ResizeObserver | null = null, scrollSize: { width: number; height: number } | null = null;
  let scrollRoute = location.pathname + location.search;
  let scrollFooter: HTMLElement | null = null;
  let tailSpace: { node: HTMLElement; value: string; priority: string; baseline: number; applied?: string } | null = null;
  function releaseTailSpace(): void {
    if (tailSpace?.applied && tailSpace.node.style.getPropertyValue('padding-bottom') === tailSpace.applied && tailSpace.node.style.getPropertyPriority('padding-bottom') === 'important') {
      if (tailSpace.value) tailSpace.node.style.setProperty('padding-bottom', tailSpace.value, tailSpace.priority); else tailSpace.node.style.removeProperty('padding-bottom');
    }
    tailSpace = null; scrollFooter = null;
  }
  function updateTailSpace(): void {
    if (!scrollFeed?.isConnected) return;
    const chat = scrollFeed.closest<HTMLElement>('.flex-1.h-full.w-full');
    const bounds = scrollFeed.getBoundingClientRect();
    // Only a bottom overlay inside this native chat stack may reserve space.
    // Unrelated panels, dialogs and in-flow footers retain native geometry.
    const footer = Array.from(chat?.querySelectorAll<HTMLElement>('footer,[class~="absolute"][class~="bottom-0"],[class~="fixed"][class~="bottom-0"]') ?? [])
      // Native roll corners and TTS badges precede the footer in DOM order.
      // Exclude ineligible scopes before spending the bounded geometry budget.
      .filter(node => !scrollFeed!.contains(node) && !node.closest('form,[role="dialog"],aside,[data-sidebar]'))
      .slice(0, 12).filter(node => {
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      return ['absolute', 'fixed'].includes(style.position) && style.visibility !== 'hidden' && style.display !== 'none' && rect.height > 0
        && rect.bottom >= bounds.bottom - .5 && rect.top < bounds.bottom && rect.left <= bounds.left + bounds.width / 2 && rect.right >= bounds.left + bounds.width / 2;
    }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] ?? null;
    if (footer !== scrollFooter) { if (scrollFooter) scrollResize?.unobserve(scrollFooter); scrollFooter = footer; if (footer) scrollResize?.observe(footer); }
    if (!tailSpace) tailSpace = { node: scrollFeed, value: scrollFeed.style.getPropertyValue('padding-bottom'), priority: scrollFeed.style.getPropertyPriority('padding-bottom'), baseline: parseFloat(getComputedStyle(scrollFeed).paddingBottom) || 0 };
    if (tailSpace.applied && (scrollFeed.style.getPropertyValue('padding-bottom') !== tailSpace.applied || scrollFeed.style.getPropertyPriority('padding-bottom') !== 'important')) {
      // A newer native inline owner wins; adopt its reserve before measuring.
      tailSpace = { node: scrollFeed, value: scrollFeed.style.getPropertyValue('padding-bottom'), priority: scrollFeed.style.getPropertyPriority('padding-bottom'), baseline: parseFloat(getComputedStyle(scrollFeed).paddingBottom) || 0 };
    }
    const overlap = footer ? Math.max(0, bounds.bottom - footer.getBoundingClientRect().top) : 0;
    const desired = Math.max(tailSpace.baseline, Math.ceil(overlap));
    if (desired <= tailSpace.baseline) {
      if (tailSpace.applied) { const retainedFooter = scrollFooter; releaseTailSpace(); scrollFooter = retainedFooter; followTail(); }
      return;
    }
    const value = `${desired}px`;
    if (scrollFeed.style.getPropertyValue('padding-bottom') !== value || scrollFeed.style.getPropertyPriority('padding-bottom') !== 'important') {
      scrollFeed.style.setProperty('padding-bottom', value, 'important'); tailSpace.applied = scrollFeed.style.getPropertyValue('padding-bottom'); followTail();
    }
  }
  let tailPinned = false, tailFrame = 0;
  type TailEntry = { row: HTMLElement; panel: HTMLElement; animation: CSSAnimation; expires: number; target: number; height: number; frames: number; time: number | null; stalled: number };
  let tailEntry: TailEntry | null = null;
  // Existing/hydrating rows never acquire a first-reveal scheduling hint.
  const knownTailRows = new WeakSet<Element>(document.querySelectorAll('#events-list > [id^="event-"]'));
  type TailMotion = { feed: HTMLElement; target?: number; original: typeof HTMLElement.prototype.scrollTo; descriptor?: PropertyDescriptor; wrapper: typeof HTMLElement.prototype.scrollTo };
  let tailMotion: TailMotion | null = null;
  function releaseTailMotion(stop = false): void {
    const motion = tailMotion;
    if (!motion) return;
    tailMotion = null;
    // A newer native method owner wins. Retained wrappers simply delegate once
    // retired; only ordinary calls through this feed's method are attributable.
    const ours = Object.getOwnPropertyDescriptor(motion.feed, 'scrollTo')?.value === motion.wrapper;
    if (ours) {
      try {
        if (motion.descriptor) Object.defineProperty(motion.feed, 'scrollTo', motion.descriptor); else delete (motion.feed as Partial<HTMLElement>).scrollTo;
      } catch { /* A feed sealed during motion retains an inert delegate. */ }
      if (stop && motion.target !== undefined && motion.feed.isConnected) Reflect.apply(motion.original, motion.feed, [{ top: motion.feed.scrollTop, left: motion.feed.scrollLeft, behavior: 'instant' }]);
    }
  }
  function ownTailMotion(feed: HTMLElement): TailMotion | null {
    if (tailMotion) {
      if (Object.getOwnPropertyDescriptor(feed, 'scrollTo')?.value !== tailMotion.wrapper) { cancelTail(); return null; }
      return tailMotion;
    }
    const descriptor = Object.getOwnPropertyDescriptor(feed, 'scrollTo'), original = feed.scrollTo;
    if (typeof original !== 'function' || descriptor && !('value' in descriptor)) return null;
    const motion: TailMotion = { feed, original, descriptor, wrapper: original };
    motion.wrapper = function(this: HTMLElement, ...args: unknown[]) {
      // Native calls retire queued targets. Only an explicit bottom request can
      // retain existing pinned intent for later growth on this same surface.
      if (this === feed && tailMotion === motion && Object.getOwnPropertyDescriptor(feed, 'scrollTo')?.value === motion.wrapper) {
        const valid = (): boolean => !disposed && scrollFeed === feed && feed.isConnected
          && scrollRoute === location.pathname + location.search && !scrollYield && !scrollGesture && !selectedInFeed();
        let top: unknown;
        const eligible = tailPinned && valid();
        if (eligible) {
          if (args.length > 1 && typeof args[0] === 'number') top = args[1];
          else if (args.length === 1 && args[0] !== null && typeof args[0] === 'object') {
            // Rich dictionaries can fail asynchronously during native conversion.
            // Retain intent only for plain known data, without reading getters,
            // coercing values or observing/changing the native returned promise.
            try {
              const prototype = Object.getPrototypeOf(args[0]);
              if (prototype === Object.prototype || prototype === null) {
                const target = Object.getOwnPropertyDescriptor(args[0], 'top');
                const left = Object.getOwnPropertyDescriptor(args[0], 'left');
                const behavior = Object.getOwnPropertyDescriptor(args[0], 'behavior');
                if (target && 'value' in target
                  && (!left || 'value' in left && (left.value === undefined || typeof left.value === 'number' && Number.isFinite(left.value)))
                  && (!behavior || 'value' in behavior && (behavior.value === undefined || behavior.value === 'auto' || behavior.value === 'instant' || behavior.value === 'smooth'))) top = target.value;
              }
            } catch { /* An opaque dictionary retains native authority. */ }
          }
        }
        const pinned = eligible && typeof top === 'number' && Number.isFinite(top) && top >= Math.max(0, feed.scrollHeight - feed.clientHeight);
        tailEntry = null; cancelAnimationFrame(tailFrame); tailFrame = 0; tailPinned = false;
        releaseTailMotion();
        const result = Reflect.apply(original, this, args);
        const restored = Object.getOwnPropertyDescriptor(feed, 'scrollTo');
        const unchanged = motion.descriptor ? restored?.value === original
          && restored.configurable === motion.descriptor.configurable && restored.enumerable === motion.descriptor.enumerable
          && restored.writable === motion.descriptor.writable : restored === undefined;
        // A synchronous native failure never reaches restoration. New intent or
        // a newer method owner during native conversion keeps its own state.
        if (pinned && unchanged && valid() && !tailMotion && !tailFrame && !tailPinned) tailPinned = true;
        return result;
      }
      return Reflect.apply(original, this, args);
    } as typeof original;
    try { Object.defineProperty(feed, 'scrollTo', descriptor ? { ...descriptor, value: motion.wrapper } : { configurable: true, writable: true, value: motion.wrapper }); }
    catch { return null; } // Sealed/unsupported feeds retain native authority.
    tailMotion = motion; return motion;
  }
  function moveTail(feed: HTMLElement, target: number): void {
    if (Math.abs(feed.scrollTop - target) <= 1) {
      if (tailMotion && tailMotion.target === undefined) releaseTailMotion();
      return;
    }
    if (tailMotion?.feed === feed && tailMotion.target === target) return;
    const motion = ownTailMotion(feed); if (!motion) return;
    motion.target = target;
    Reflect.apply(motion.original, feed, [{ top: target, behavior: 'smooth' }]);
  }
  function nativeTailPanel(row: HTMLElement): HTMLElement | null {
    const cards = row.querySelectorAll<HTMLElement>('[id^="event-message-card-"]');
    if (cards.length !== 1 || cards[0].id !== `event-message-card-${row.id.slice(6)}`) return null;
    const panels = cards[0].querySelectorAll<HTMLElement>('div.relative.rounded-2xl.border-2.overflow-hidden');
    if (panels.length !== 1) return null;
    const panel = panels[0];
    // Public nS native entrance and gradient; this hint changes scheduling only,
    // and grants no action/event ownership. Unknown native releases fail open.
    if (!['from-slate-900/95','to-slate-950/95','animate-in','fade-in-0','slide-in-from-bottom-4','duration-500','transition-all'].every(name => panel.classList.contains(name))
      || !panel.querySelector('svg:is([id="d4"],[id="d6"],[id="d8"],[id="d10"],[id="d12"],[id="d20"])')) return null;
    return panel;
  }
  function noteTailEntry(row: HTMLElement | undefined, list: HTMLElement | null): void {
    if (!row || knownTailRows.has(row)) return;
    const panel = nativeTailPanel(row);
    // A newly published empty outer can precede its roll relation/panel. Only
    // initial/hydrating rows are exempt before their first native panel exists.
    if (!panel) return;
    knownTailRows.add(row);
    if (!tailPinned || list?.lastElementChild !== row || scrollYield || scrollGesture || selectedInFeed()) return;
    if (typeof CSSAnimation === 'undefined' || typeof panel.getAnimations !== 'function') return;
    const entries = panel.getAnimations().filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation
      && animation.animationName === 'enter' && (animation.effect as KeyframeEffect | null)?.target === panel);
    if (entries.length !== 1 || getComputedStyle(panel).opacity !== '0') return;
    const animation = entries[0], timing = animation.effect!.getComputedTiming();
    if (animation.playState !== 'running' || !Number.isFinite(animation.playbackRate) || animation.playbackRate <= 0
      || typeof timing.endTime !== 'number' || !Number.isFinite(timing.endTime) || timing.endTime <= 0) return;
    tailEntry = { row, panel, animation, expires: performance.now() + timing.endTime / animation.playbackRate, target: scrollFeed!.scrollHeight - scrollFeed!.clientHeight, height: row.getBoundingClientRect().height, frames: 0, time: null, stalled: 0 };
  }
  function waitingForTailEntry(feed: HTMLElement): boolean {
    const entry = tailEntry; if (!entry) return false;
    const { row, panel, animation } = entry;
    const time = animation.currentTime;
    if (!row.isConnected || row.parentElement?.id !== 'events-list' || row.parentElement.lastElementChild !== row || !feed.contains(row)
      || nativeTailPanel(row) !== panel || getComputedStyle(panel).opacity !== '0'
      // Outside layout changes must remain responsive. Own scroll-anchor style
      // bookkeeping does not grow content; only the exact new row may account
      // for a changed target while its entrance is still transparent.
      || Math.abs((feed.scrollHeight - feed.clientHeight - entry.target) - (row.getBoundingClientRect().height - entry.height)) > 1
      || animation.playState !== 'running' || !panel.getAnimations().includes(animation)
      || !Number.isFinite(animation.playbackRate) || animation.playbackRate <= 0
      || performance.now() >= entry.expires || ++entry.frames > 32
      || time !== null && (typeof time !== 'number' || !Number.isFinite(time))) { tailEntry = null; return false; }
    // A finite native effect bounds this local continuation. Paused, stalled or
    // replaced effects never become an indefinite wait or a copied native clock.
    if (!animation.pending && time === entry.time) entry.stalled++; else entry.stalled = 0;
    entry.time = time as number | null;
    if (entry.stalled > 1) { tailEntry = null; return false; }
    return !!ownTailMotion(feed);
  }
  let tailResize: ResizeObserver | null = null;
  const tailSizes = new Map<HTMLElement, number>();
  function atTail(): boolean {
    return !!scrollFeed && scrollFeed.scrollHeight - scrollFeed.clientHeight - scrollFeed.scrollTop <= 1;
  }
  function cancelTail(): void { cancelAnimationFrame(tailFrame); tailFrame = 0; tailPinned = false; tailEntry = null; releaseTailMotion(true); }
  function followTail(): void {
    if (!tailPinned || tailFrame || scrollYield || scrollGesture || selectedInFeed()) return;
    const feed = scrollFeed, route = scrollRoute;
    tailFrame = requestAnimationFrame(() => {
      tailFrame = 0;
      if (disposed || !feed?.isConnected || feed !== scrollFeed || route !== location.pathname + location.search
        || !tailPinned || scrollYield || scrollGesture || selectedInFeed()) return;
      if (waitingForTailEntry(feed)) { followTail(); return; }
      if (tailPinned) moveTail(feed, Math.max(0, feed.scrollHeight - feed.clientHeight));
    });
  }
  // Called only by the adapter path that validated a trusted current form submit.
  function followAfterSubmit(): void {
    if (disposed || !/\/play\/?$/.test(location.pathname)
      || new URLSearchParams(location.search).get('view') && new URLSearchParams(location.search).get('view') !== 'play') return;
    preferScrollAnchor();
    if (!scrollFeed?.isConnected || scrollYield || scrollGesture || selectedInFeed()) return;
    tailPinned = true; followTail();
  }
  function observeTail(): void {
    if (!scrollFeed || !tailResize) return;
    const list = scrollFeed.querySelector<HTMLElement>('#events-list');
    const last = Array.from((list ?? scrollFeed).children).filter((node): node is HTMLElement => node instanceof HTMLElement && /^event-\d+$/.test(node.id)).at(-1);
    noteTailEntry(last, list);
    const owners = new Set([list, last].filter((node): node is HTMLElement => !!node));
    for (const node of tailSizes.keys()) if (!owners.has(node)) { tailResize.unobserve(node); tailSizes.delete(node); }
    for (const node of owners) if (!tailSizes.has(node)) {
      tailSizes.set(node, node.getBoundingClientRect().height); tailResize.observe(node);
    }
  }
  const scrollStyles = new Map<HTMLElement, { value: string; priority: string }>();
  type ScrollMutation = { before: string | null; after: string | null };
  const scrollMutationLimit = 128;
  let scrollMutationWrites = new Map<HTMLElement, ScrollMutation[]>(), scrollMutationCount = 0, scrollMutationAmbiguous = false;
  function clearScrollMutations(): void {
    scrollMutationWrites = new Map(); scrollMutationCount = 0; scrollMutationAmbiguous = false;
  }
  function writeScrollAnchor(node: HTMLElement, value: string, priority: string): void {
    const before = node.getAttribute('style');
    if (value) node.style.setProperty('overflow-anchor', value, priority); else node.style.removeProperty('overflow-anchor');
    const after = node.getAttribute('style');
    if (disposed) return;
    // A no-op, unobserved target or exhausted ledger cannot establish ownership.
    if (!node.isConnected || node.ownerDocument !== document || before === after || ++scrollMutationCount > scrollMutationLimit) {
      scrollMutationWrites.clear(); scrollMutationAmbiguous = true; return;
    }
    if (scrollMutationAmbiguous) return;
    const writes = scrollMutationWrites.get(node) ?? [];
    writes.push({ before, after }); scrollMutationWrites.set(node, writes);
  }
  function nativeScrollMutations(records: MutationRecord[]): MutationRecord[] {
    // Writes made while handling this delivery belong only to the next delivery.
    const writes = scrollMutationWrites, ambiguous = scrollMutationAmbiguous;
    clearScrollMutations();
    if (ambiguous || !writes.size) return records;
    const styles = new Map<HTMLElement, MutationRecord[]>();
    for (const record of records) if (record.type === 'attributes' && record.attributeName === 'style' && record.target instanceof HTMLElement) {
      const chain = styles.get(record.target) ?? []; chain.push(record); styles.set(record.target, chain);
    }
    const owned = new Set<MutationRecord>();
    for (const [node, expected] of writes) {
      const chain = styles.get(node);
      if (!node.isConnected || node.ownerDocument !== document || !chain || chain.length !== expected.length
        || records.some(record => record.type === 'childList' && Array.from(record.removedNodes).some(removed => removed.contains(node)))) continue;
      const finalStyle = node.getAttribute('style');
      // A native write anywhere in this target's chain retains the entire chain.
      // Never match a subsequence or infer ownership from the current anchor value.
      if (chain.every((record, index) => record.oldValue === expected[index].before
        && (index + 1 < chain.length ? chain[index + 1].oldValue : finalStyle) === expected[index].after)) {
        for (const record of chain) owned.add(record);
      }
    }
    return owned.size ? records.filter(record => !owned.has(record)) : records;
  }

  function restoreScrollStyles(): void {
    for (const [node, previous] of scrollStyles) {
      if (node.style.getPropertyValue('overflow-anchor') !== 'none' || node.style.getPropertyPriority('overflow-anchor') !== 'important') continue;
      writeScrollAnchor(node, previous.value, previous.priority);
    }
    scrollStyles.clear();
  }
  function releaseScrollFeed(): void {
    cancelTail(); tailResize?.disconnect(); tailResize = null; tailSizes.clear();
    releaseTailSpace(); restoreScrollStyles(); scrollResize?.disconnect(); scrollResize = null; scrollSize = null;
    clearScrollMutations();
    scrollFeed = null; scrollTried = false; scrollSelectionYield = false;
    // A retired feed may never deliver scrollend/pointerup. Its intent must not
    // suspend anchoring on the next native surface.
    scrollYield = false; scrollGesture = false; scrollSeen = false;
  }
  function selectedInFeed(): boolean {
    const selection = window.getSelection();
    return !!scrollFeed && (!!selection && !selection.isCollapsed && (!!selection.anchorNode && scrollFeed.contains(selection.anchorNode) || !!selection.focusNode && scrollFeed.contains(selection.focusNode))
      || !!document.activeElement && scrollFeed.contains(document.activeElement) && document.activeElement.matches('input,textarea,[contenteditable="true"]'));
  }
  function preferScrollAnchor(): void {
    if (disposed) return;
    const route = location.pathname + location.search;
    if (route !== scrollRoute) { releaseScrollFeed(); scrollRoute = route; }
    if (scrollFeed && !scrollFeed.isConnected) releaseScrollFeed();
    if (!/\/play\/?$/.test(location.pathname) || new URLSearchParams(location.search).get('view') && new URLSearchParams(location.search).get('view') !== 'play') { restoreScrollStyles(); return; }
    // Yield only to intent belonging to the still-current connected feed.
    if (scrollYield || scrollGesture) return;
    if (!scrollFeed && !scrollTried) {
      scrollTried = true;
      let node = document.querySelector<HTMLElement>('[id^="event-message-card-"]')?.parentElement;
      for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
        if (node.clientHeight > 0 && /^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) {
          scrollFeed = node; scrollSize = { width: node.clientWidth, height: node.clientHeight };
          tailPinned = atTail() && !selectedInFeed();
          tailResize = new ResizeObserver(entries => {
            if (!scrollFeed?.isConnected) { releaseScrollFeed(); return; }
            let grew = false;
            for (const entry of entries) {
              const owner = entry.target as HTMLElement, previous = tailSizes.get(owner);
              if (previous === undefined) continue;
              const height = owner.getBoundingClientRect().height;
              if (height > previous + .5) grew = true;
              tailSizes.set(owner, height);
            }
            if (grew) followTail();
          });
          observeTail();
          scrollResize = new ResizeObserver(() => {
            if (!scrollFeed?.isConnected) { releaseScrollFeed(); return; }
            updateTailSpace();
            const size = { width: scrollFeed.clientWidth, height: scrollFeed.clientHeight };
            if (scrollSize?.width === size.width && scrollSize?.height === size.height) return;
            scrollSize = size; tailEntry = null; rebaseScrollAnchor(); followTail();
          });
          scrollResize.observe(node); updateTailSpace(); break;
        }
      }
    }
    if (!scrollFeed || selectedInFeed()) { restoreScrollStyles(); return; }
    const bounds = scrollFeed.getBoundingClientRect(), top = Math.max(0, bounds.top), bottom = Math.min(innerHeight, bounds.bottom, scrollFooter?.getBoundingClientRect().top ?? Infinity);
    const cards = Array.from(scrollFeed.querySelectorAll<HTMLElement>('[id^="event-message-card-"]')).slice(-40);
    const fullyVisible = cards.filter(card => { const r = card.getBoundingClientRect(); return r.height > 0 && r.top >= top && r.bottom <= bottom; });
    const preferred = fullyVisible.find(card => card.querySelector('svg:is([id="d4"],[id="d6"],[id="d8"],[id="d10"],[id="d12"],[id="d20"])')) ?? fullyVisible[0];
    const desired = new Set<HTMLElement>();
    if (preferred) for (const card of cards.slice(0, cards.indexOf(preferred))) {
      const id = /^event-message-card-(\d+)$/.exec(card.id)?.[1], row = id ? document.getElementById(`event-${id}`) : null;
      if (row && scrollFeed.contains(row) && row.contains(card)) desired.add(row);
    }
    for (const [node, previous] of scrollStyles) if (!desired.has(node)) {
      if (node.style.getPropertyValue('overflow-anchor') === 'none' && node.style.getPropertyPriority('overflow-anchor') === 'important') {
        writeScrollAnchor(node, previous.value, previous.priority);
      }
      scrollStyles.delete(node);
    }
    for (const node of desired) {
      if (!scrollStyles.has(node)) scrollStyles.set(node, { value: node.style.getPropertyValue('overflow-anchor'), priority: node.style.getPropertyPriority('overflow-anchor') });
      if (node.style.getPropertyValue('overflow-anchor') !== 'none' || node.style.getPropertyPriority('overflow-anchor') !== 'important') writeScrollAnchor(node, 'none', 'important');
    }
  }
  function rebaseScrollAnchor(): void {
    restoreScrollStyles(); cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; preferScrollAnchor(); });
  }
  function scrollIntent(event: Event): void {
    if (!scrollFeed || !(event.target instanceof Node) || !scrollFeed.contains(event.target)) return;
    if (event instanceof KeyboardEvent && !['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) return;
    cancelTail(); scrollYield = true; scrollSeen = false;
    if (event.type === 'touchstart' || event.type === 'pointerdown') scrollGesture = true;
    rebaseScrollAnchor();
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; if (!scrollSeen && !scrollGesture) { scrollYield = false; tailPinned = atTail() && !selectedInFeed(); preferScrollAnchor(); } });
  }
  function feedScrolled(event: Event): void {
    if (event.target !== scrollFeed) return;
    if (scrollYield || scrollGesture) { scrollSeen = true; restoreScrollStyles(); } else {
      // Native smooth scrolling and anchoring do not revoke pinned intent.
      // Manual intent and selection cancel it through their existing listeners.
      if (!tailFrame) tailPinned = (tailPinned || atTail()) && !selectedInFeed();
      preferScrollAnchor();
    }
  }
  function scrollFinished(event: Event): void {
    if (event.type === 'scrollend' ? event.target !== scrollFeed : !scrollGesture && !scrollYield) return;
    if (event.type === 'scrollend' && tailMotion?.target !== undefined && Math.abs(tailMotion.feed.scrollTop - tailMotion.target) <= 1) {
      if (tailEntry) tailMotion.target = undefined; else releaseTailMotion();
    }
    const navigated = scrollGesture || scrollYield;
    scrollGesture = false; scrollYield = false;
    if (navigated) tailPinned = atTail() && !selectedInFeed();
    rebaseScrollAnchor();
  }
  function scrollSelection(): void {
    if (!scrollFeed) return;
    const selection = window.getSelection();
    if (!scrollSelectionYield && !(selection?.anchorNode && scrollFeed.contains(selection.anchorNode) || selection?.focusNode && scrollFeed.contains(selection.focusNode))) return;
    if (selectedInFeed()) { cancelTail(); scrollSelectionYield = true; restoreScrollStyles(); }
    else if (scrollSelectionYield) { scrollSelectionYield = false; tailPinned = atTail(); rebaseScrollAnchor(); }
  }
  function scrollMutations(records: MutationRecord[]): void {
    if (scrollFeed && !scrollFeed.isConnected) releaseScrollFeed();
    if (scrollFeed && records.some(record => record.target instanceof Element && (scrollFooter?.contains(record.target) || record.type === 'childList' && Array.from(record.removedNodes).some(node => node.contains(scrollFooter))))) updateTailSpace();
    const relevant = records.some(record => {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!target || target.closest('[data-ff-desktop-message-snapshot],svg,button,input,textarea,select')) return false;
      if (scrollFeed?.contains(target) && (target.closest('[id^="event-container-"],[id^="event-"]') || record.type === 'childList' && Array.from(record.addedNodes).some(node => node instanceof Element && /^event-\d+$/.test(node.id)))) return true;
      if (!scrollFeed && record.type === 'childList' && Array.from(record.addedNodes).some(node => node instanceof Element && (node.id.startsWith('event-message-card-') || !!node.querySelector('[id^="event-message-card-"]')))) { scrollTried = false; return true; }
      return false;
    });
    if (relevant) {
      // Unrelated narration/growth may proceed immediately; only duplicate
      // notifications belonging to this exact new dice row share its hint.
      if (tailEntry && records.some(record => {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        return record.type !== 'attributes' && target && scrollFeed?.contains(target) && !tailEntry!.row.contains(target);
      })) tailEntry = null;
      preferScrollAnchor(); observeTail(); followTail();
    }
  }
  function outside(event: PointerEvent): void {
    if (!(event.target instanceof Element) || event.target.closest('[role="dialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper]')) return;
    if (expandedComposer && !expandedComposer.contains(event.target)) closeExpanded();
    for (const root of document.querySelectorAll<HTMLElement>('[data-ff-desktop-context="panel"]')) {
      const shell = root.closest('[class~="bottom-full"]');
      if (!shell || shell.contains(event.target)) continue;
      const toggle = shell.querySelector<HTMLButtonElement>('[aria-label="Expand working context"],[aria-label="Развернуть рабочий контекст"],button[aria-label="Collapse working context"],button[aria-label="Свернуть рабочий контекст"]');
      toggle?.click();
    }
  }
  function onEscape(event: KeyboardEvent): void { if (event.key === 'Escape' && expandedComposer) closeExpanded(); }

  function mark(element: Element, name: string, value: string): void {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    if (!next.has(element)) next.set(element, new Set());
    next.get(element)!.add(name);
  }
  function reconcile(): void {
    for (const [element, names] of marked) {
      for (const name of names) if (!next.get(element)?.has(name)) element.removeAttribute(name);
    }
    marked = next;
  }
  function clearMarks(): void { next = new Map(); reconcile(); }
  function roleFor(card: Element): 'player' | 'gm' | null {
    // The site does not render event.role as an HTML attribute. Read only this
    // cosmetic role from the nearest React component, including NPC events.
    const role = nativeEvent(card)?.role;
    if (role === 'player') return 'player';
    if (role === 'dm' || role === 'npc') return 'gm';
    const container = card.closest('[id^="event-container-"]');
    if (container && Array.from(container.querySelectorAll('img')).some((image) => {
      try { return decodeURIComponent(image.getAttribute('src') ?? '').includes('/franz/'); } catch { return false; }
    })) return 'gm';
    return null;
  }
  function backgroundEnabled(): boolean {
    // The title describes the action, so "Hide" means the background is on.
    const toggle = document.querySelector('[title="Hide background image"], [title="Show background image"], [title="Скрыть фоновое изображение"], [title="Показать фоновое изображение"]');
    if (toggle) return ['Hide background image','Скрыть фоновое изображение'].includes(toggle.getAttribute('title')??'');
    const campaign = location.pathname.match(/^\/([^/]+)\/play\/?$/)?.[1];
    try { return !!campaign && localStorage.getItem(`play-show-poi-background-${campaign}`) === 'true'; }
    catch { return false; }
  }
  function backgroundOwner(chat: Element): Element {
    // The native scroll main loses client width/height when its scrollbars
    // appear. Its dedicated resizable panel keeps the wallpaper's viewport
    // stable, including both scrollbar gutters. Reject broader/shared panes.
    const main = chat.parentElement;
    const panel = main?.parentElement;
    if (chat.matches('div.flex.flex-col.flex-1.w-full.mx-auto.h-full')
      && main?.matches('main.w-full.h-full.overflow-y-auto')
      && main.children.length === 1 && main.firstElementChild === chat
      && panel?.matches('div[data-panel][data-panel-group-id][data-panel-id][data-panel-size]')
      && panel.children.length === 1 && panel.firstElementChild === main
      && !panel.closest('form,[role="dialog"],aside,[data-sidebar]')) return panel;
    return chat;
  }
  function inCharacterForm(element: Element): boolean {
    // Character forms are app surfaces; their fields must follow the app theme
    // even if campaign messages use a different color or transparent background.
    return !!element.closest('form')?.querySelector('input[name="max_hp"], input[name="strength"]');
  }
  function scan(): void {
    frame = 0;
    if (disposed) return;
    next = new Map();
    const view = new URLSearchParams(location.search).get('view');
    if (!/\/play\/?$/.test(location.pathname) || (view && view !== 'play')) { clearMarks(); return; }
    mark(document.documentElement, 'data-ff-desktop-play', 'true');
    for (const spinner of document.querySelectorAll('svg.custom-spin')) {
      const page = spinner.closest('[class~="h-[100dvh]"][class~="justify-center"][class~="items-center"]');
      if (page) mark(page, 'data-ff-desktop-loading', 'true');
      // Resetting chat history replaces the feed with LoadingSpinner directly
      // inside main. The combat sidebar is a separate resizable panel.
      const wrapper = spinner.parentElement;
      const panel = wrapper?.parentElement;
      if (wrapper?.matches('[class~="w-full"][class~="h-full"][class~="flex"][class~="items-center"][class~="justify-center"]')
        && panel?.matches('main[class~="w-full"][class~="h-full"]')
        && !panel.closest('form,[role="dialog"],aside,[data-sidebar]')) mark(panel, 'data-ff-desktop-loading', 'true');
    }
    const cards = Array.from(document.querySelectorAll('[id^="event-message-card-"]'));
    const anchor = document.getElementById('events-list') ?? cards[0];
    const chat = anchor?.closest('.flex-1.h-full.w-full');
    const composers = new Set<Element>();
    for (const anchor of document.querySelectorAll('#working-context-bar-spacer, [aria-label="Roll dice"], [aria-label="Бросить кости"], .tiptap[contenteditable="true"]')) {
      const grid = anchor.closest('.grid.relative');
      // The adventure context spacer is outside the bordered input. Resolve
      // that grid through its editor so all anchors identify one native surface.
      const editor = Array.from(grid?.querySelectorAll('.tiptap[contenteditable="true"]') ?? [])
        .find(element => !element.closest('form,[role="dialog"],[class~="bottom-full"]'));
      const native = editor?.closest('[class~="bg-gray-800/80"]');
      const root = anchor.closest('[class~="bg-gray-800/80"]') ?? (native && grid?.contains(native) ? native : grid);
      if (root && !anchor.closest('form,[role="dialog"],[class~="bottom-full"]') && !inCharacterForm(anchor)
        && root.querySelector('.tiptap[contenteditable="true"]') && root.querySelector('[aria-label="Roll dice"],[aria-label="Бросить кости"],[aria-label="More actions"],[aria-label="Другие действия"]')) composers.add(root);
    }
    const contextRoots = new Set<Element>();
    const contextExpanded = new Set<Element>();
    for (const composer of composers) {
      // The expanded content and the tab bar are sibling surfaces in this wrapper.
      for (const bar of (composer.closest('[class~="z-100"]') ?? composer.closest('.grid.relative') ?? composer).querySelectorAll('[class~="bottom-full"][class~="left-0"][class~="right-0"] > [class~="bg-gray-800"]')) {
        contextRoots.add(bar);
        // Native expanded context replaces the expand header with its panel.
        // Read that native state independently of our optional input popup.
        if (!bar.querySelector('[aria-label="Expand working context"],[aria-label="Развернуть рабочий контекст"]')
          && (bar.querySelector('[aria-label="Collapse working context"],[aria-label="Свернуть рабочий контекст"]') || bar.parentElement?.firstElementChild === bar)) contextExpanded.add(composer);
        if (settings.context.enabled) {
          mark(bar, 'data-ff-desktop-context', bar.querySelector('[aria-label="Expand working context"],[aria-label="Развернуть рабочий контекст"]') ? 'bar' : 'panel');
          for (const block of bar.querySelectorAll('.group.rounded-lg.border')) mark(block,'data-ff-desktop-context-block','true');
        }
      }
    }
    const inContext = (element: Element): boolean => Array.from(contextRoots).some(root => root.contains(element));
    if (settings.preset !== 'website') {
      // Character dialogs are application surfaces. Limit these neutral-card
      // overrides to dialogs rather than classifying arbitrary campaign rows.
      for (const detail of document.querySelectorAll('div.border.rounded-md, div.border.rounded-lg, [class~="rounded-md"][class~="border"][class~="bg-card"]')) {
        if (!detail.closest('[role="dialog"]') || detail.closest('[id^="event-"],[contenteditable="true"],nav,aside,[data-sidebar]') || inContext(detail) || Array.from(composers).some(composer => composer.contains(detail))) continue;
        if (!detail.querySelector('img,h2,h3,h4,strong,input[type="number"]')) continue;
        mark(detail, 'data-ff-desktop-detail-card', 'true');
      }
    }

    if (chat && settings.backgroundImage && backgroundEnabled()) {
      mark(chat, 'data-ff-desktop-chat', 'true');
      const owner = backgroundOwner(chat);
      mark(owner, 'data-ff-desktop-chat-background', 'true');
      let layer: Element | null | undefined = anchor;
      while (layer && layer !== owner) {
        if (!layer.id.startsWith('event-message-card-')) mark(layer, 'data-ff-desktop-chat-layer', 'true');
        layer = layer.parentElement;
      }
    }
    if (settings.messages.enabled) {
      for (const card of cards) {
        if (settings.dice.enabled && card.querySelector('[class~="from-slate-900/95"][class~="to-slate-950/95"]')) continue;
        const role = roleFor(card);
        if (role) mark(card, 'data-ff-desktop-message', role);
      }
      for (const row of document.querySelectorAll('[class~="bg-slate-800/60"][class~="backdrop-blur-sm"][class~="border-slate-700"]')) {
        const summary = row.closest('[class~="bg-black/40"][class~="border-slate-700"]');
        if (!summary?.closest('[id^="event-"]')) continue;
        mark(summary, 'data-ff-desktop-message', 'battle');
        mark(row, 'data-ff-desktop-message', 'battle');
      }
    }
    for (const element of composers) {
      const composer = element as HTMLElement;
      mark(composer, 'data-ff-desktop-composer', 'true');
      const useContext = expandedComposer === composer || settings.context.enabled && contextExpanded.has(composer);
      if (settings.input.enabled || useContext) {
        mark(composer, 'data-ff-desktop-message', useContext ? 'input-expanded' : 'input');
        for (const button of composer.querySelectorAll('button, [role="combobox"]')) if (!inContext(button)) mark(button, 'data-ff-desktop-message', useContext ? 'control-expanded' : 'control');
      }
      const nativeExpand = composer.querySelector('button:not([data-ff-desktop-expand-input]):is([aria-label="Expand message input"],[aria-label="Развернуть поле сообщения"],[title="Expand message input"])');
      if (nativeExpand && expandButtons.has(composer)) { expandButtons.get(composer)!.remove(); expandButtons.delete(composer); if (expandedComposer === composer) closeExpanded(); }
      if (settings.expandMessageInput && !nativeExpand && !expandButtons.has(composer)) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = '↗'; button.title = 'Expand message input'; button.setAttribute('aria-label', 'Expand message input'); button.setAttribute('aria-expanded', 'false');
        button.setAttribute('data-ff-desktop-expand-input', 'true');
        button.addEventListener('click', () => { if (expandedComposer === composer) closeExpanded(); else { closeExpanded(); expandedComposer = composer; composer.setAttribute('data-ff-desktop-input-expanded', 'true'); button.setAttribute('aria-expanded', 'true'); button.textContent = '↙'; button.title = 'Collapse message input'; button.setAttribute('aria-label', 'Collapse message input'); schedule(); } });
        const tools = composer.querySelector('[aria-label="Roll dice"],[aria-label="Бросить кости"]')?.parentElement;
        (tools ?? composer).append(button); expandButtons.set(composer, button);
      }
    }
    for (const [composer, button] of expandButtons) if (!settings.expandMessageInput || !composers.has(composer)) { button.remove(); expandButtons.delete(composer); if (composer === expandedComposer) closeExpanded(); }
    if (settings.events.enabled) {
      for (const event of document.querySelectorAll('[id^="event-"] :is([class~="bg-card-light"][class~="rounded-md"],[class~="bg-card"][class~="border"][class~="rounded-md"])')) {
        if (!event.closest('[id^="event-message-card-"]')) mark(event, 'data-ff-desktop-message', 'event');
      }
    }
    for (const die of document.querySelectorAll('svg:is([id="d4"],[id="d6"],[id="d8"],[id="d10"],[id="d12"],[id="d20"])')) {
      if (inCharacterForm(die)) continue;
      if (settings.dice.colorsEnabled) mark(die, 'data-ff-desktop-die', die.id);
      // Read the natural face value, never the total or the number printed on a menu icon.
      // Rolling SVGs have animate-spin; preserve their normal paint until they settle.
      if (die.id === 'd20' && die.closest('[id^="event-message-card-"]')
        && die.closest('[class~="from-slate-900/95"][class~="to-slate-950/95"]')
        && !die.closest('[class~="animate-spin"]')) {
        const value = die.querySelector('text')?.textContent?.trim();
        const result = value === '20' ? 'natural20' : value === '1' ? 'natural1' : null;
        if (result && settings.dice[result].enabled) mark(die, 'data-ff-desktop-critical-die', result);
      }
      if (settings.dice.enabled || settings.dice.resultTextColor) {
        const roll = die.closest('[class~="from-slate-900/95"][class~="to-slate-950/95"]');
        if (roll) {
          if (settings.dice.enabled) {
            mark(roll, 'data-ff-desktop-message', 'roll');
            const container = roll.closest('[id^="event-message-card-"]');
            if (container) mark(container, 'data-ff-desktop-roll-container', 'true');
          }
          if (settings.dice.resultTextColor) {
            // The site's calculation and outcome/damage text sit below the SVGs.
            for (const text of roll.querySelectorAll('[class~="font-mono"][class~="tracking-wider"], [class~="text-center"][class~="mt-4"][class~="transition-all"]')) {
              if (!text.querySelector('svg')) mark(text, 'data-ff-desktop-roll-text', 'true');
            }
          }
        }
      }
    }
    // The action picker keeps the app palette and accent border on every tab.
    for (const dialog of document.querySelectorAll('[role="dialog"]')) {
      if([...dialog.querySelectorAll('h2')].some(title=>/^(?:Choose Action|Выберите действие)$/i.test(title.textContent?.trim()??'')))mark(dialog,'data-ff-desktop-action-picker','true');
    }
    if (settings.dice.enabled) {
      // This roll-breakdown popover is rendered in a Radix portal, outside its card.
      for (const menu of document.querySelectorAll('[role="dialog"][class~="bg-slate-900/95"][class~="border-amber-600/50"]')) {
        mark(menu,'data-ff-desktop-message','roll-menu');
      }
      for (const dialog of document.querySelectorAll('[role="dialog"]')) {
        const actionPicker=next.get(dialog)?.has('data-ff-desktop-action-picker');
        if (!actionPicker && dialog.querySelector('svg:is([id="d4"],[id="d6"],[id="d8"],[id="d10"],[id="d12"],[id="d20"])')) mark(dialog,'data-ff-desktop-message','roll-menu');
      }
    }
    reconcile();
  }
  function schedule(): void { if (!disposed && !frame) frame = requestAnimationFrame(scan); }
  const observer = new MutationObserver(records => {
    records = nativeScrollMutations(records);
    if (!records.length) return;
    // MutationObserver runs before paint; a RAF-only scan leaves one empty
    // native body frame during optimistic/confirmed component replacement.
    const cards = new Set<HTMLElement>(), changedBodies = new Set<HTMLElement>();
    let detached = false;
    const cardSelector = '[id^="event-message-card-"]';
    const owned = '[data-ff-desktop-message-snapshot]';
    const add = (card: HTMLElement, bodyChanged = false): void => {
      cards.add(card);
      if (bodyChanged) for (const body of card.querySelectorAll<HTMLElement>('.prose')) {
        if (!body.closest(owned)) changedBodies.add(body);
      }
    };
    for (const record of records) {
      if (record.type === 'childList' && record.removedNodes.length) {
        for (const snapshot of snapshots.values()) if (snapshot.optimistic && !snapshot.card.isConnected && snapshot.gapAt === undefined
          && Array.from(record.removedNodes).some(node => node.contains(snapshot.card))) {
          snapshot.gapAt = Date.now(); detached = true;
        }
      }
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!target || target.closest(owned)) continue;
      const card = target.closest<HTMLElement>(cardSelector);
      if (card) {
        if (firstRows.has(card)) add(card);
        // Dice animations and unrelated author/header controls cannot change the
        // native prose. Card/ancestor concealment and prose mutations can.
        if (target.closest('svg') && !target.closest('.prose') || target.closest('button,input,textarea,select')) continue;
        const prose = target.closest('.prose');
        const nodes = record.type === 'childList' ? [...record.addedNodes, ...record.removedNodes].filter(node => !(node instanceof Element && node.matches(owned))) : [];
        const hasProse = nodes.some(node => node instanceof Element && (node.matches('.prose') || !!node.querySelector('.prose')));
        if (record.type === 'childList' || prose || target === card || target.querySelector('.prose')) add(card, !!prose || hasProse || record.type === 'attributes');
      } else if (record.type === 'childList') {
        // Only mounted cards enter the immediate pass. Removing a temporary card
        // retains its bounded snapshot for the exact confirmed association.
        for (const node of record.addedNodes) if (node instanceof Element && !node.closest(owned)) {
          if (node.matches(cardSelector)) add(node as HTMLElement, true);
          for (const mounted of node.querySelectorAll<HTMLElement>(cardSelector)) add(mounted, true);
        }
      } else if (record.type === 'attributes' && ['class','style','hidden','inert','aria-hidden','data-ff-translation-blank','data-ff-translation-pending'].includes(record.attributeName ?? '')) {
        // A container can conceal every card without touching the prose itself.
        for (const descendant of target.querySelectorAll<HTMLElement>(cardSelector)) add(descendant, true);
      }
    }
    if (cards.size || detached || firstRows.size) snapshotMessages(cards, changedBodies);
    scrollMutations(records);
    if (records.some(record => {
      if (record.type !== 'characterData') return true;
      const die = record.target.parentElement?.closest('svg[id="d20"]');
      if (!die) return false;
      const nativeCard = die.closest('[id^="event-message-card-"]');
      const rollPanel = die.closest('[class~="from-slate-900/95"][class~="to-slate-950/95"]');
      const spinning = die.closest('[class~="animate-spin"]');
      return !(nativeCard && rollPanel && spinning);
    })) schedule();
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeOldValue: true, characterData: true,
    attributeFilter: ['id', 'class', 'src', 'type', 'name', 'contenteditable', 'title', 'role', 'aria-label', 'aria-pressed', 'data-state', 'data-panel', 'data-panel-group-id', 'data-panel-id', 'data-panel-size', 'style', 'hidden', 'inert', 'aria-hidden', 'data-ff-translation-blank', 'data-ff-translation-pending', 'data-ff-desktop-hidden-instructions'],
  });
  function translationReady(): void { clearSnapshots(); snapshotMessages(); rebaseScrollAnchor(); }
  function routeChanged(): void { clearFirst(); for (const card of document.querySelectorAll('[id^="event-message-card-"]')) presentedRows.add(card); clearSnapshots(); snapshotCampaign = undefined; snapshotMessages(); releaseScrollFeed(); scrollYield = false; scrollGesture = false; rebaseScrollAnchor(); schedule(); }
  document.addEventListener('ff-desktop-translation-ready', translationReady);
  for (const type of ['wheel','touchstart','pointerdown','keydown']) document.addEventListener(type, scrollIntent, { capture: true, passive: true });
  document.addEventListener('scroll', feedScrolled, true); document.addEventListener('scrollend', scrollFinished, true);
  document.addEventListener('selectionchange', scrollSelection);
  for (const type of ['touchend','touchcancel','pointerup','pointercancel']) window.addEventListener(type, scrollFinished, true);
  window.addEventListener('resize', rebaseScrollAnchor);
  window.addEventListener('pointerdown', outside, true);
  window.addEventListener('keydown', onEscape, true);
  window.addEventListener('popstate', routeChanged);
  window.addEventListener('storage', schedule);
  host[key] = { followAfterSubmit, dispose() {
    disposed = true; observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(snapshotTimer);
    closeExpanded(); for (const button of expandButtons.values()) button.remove();
    clearFirst(); clearSnapshots(); releaseScrollFeed(); cancelAnimationFrame(scrollFrame);
    for (const type of ['wheel','touchstart','pointerdown','keydown']) document.removeEventListener(type, scrollIntent, true);
    document.removeEventListener('scroll', feedScrolled, true); document.removeEventListener('scrollend', scrollFinished, true); document.removeEventListener('selectionchange', scrollSelection);
    for (const type of ['touchend','touchcancel','pointerup','pointercancel']) window.removeEventListener(type, scrollFinished, true);
    window.removeEventListener('resize', rebaseScrollAnchor);
    document.removeEventListener('ff-desktop-translation-ready', translationReady);
    window.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', onEscape, true);
    window.removeEventListener('popstate', routeChanged);
    window.removeEventListener('storage', schedule);
    clearMarks();
  } };
  scan();
  preferScrollAnchor();
  queueMicrotask(() => queueMicrotask(() => snapshotMessages()));
}

export function chatCss(settings: AppearanceSettings, image: string | null): string {
  let css = `[data-ff-desktop-expand-input] { border:1px solid currentColor; background:transparent; color:inherit; border-radius:50%; height:32px; width:32px; cursor:pointer; font-size:18px; flex-shrink:0; }
    [data-ff-desktop-input-expanded] { position:fixed !important; inset:12vh 10vw auto !important; z-index:1000 !important; width:80vw !important; max-height:76vh !important; box-shadow:0 16px 80px #0009; }
    [data-ff-desktop-input-expanded] .tiptap { min-height:35vh !important; max-height:60vh !important; overflow:auto !important; }
    [data-ff-desktop-message-snapshot] { pointer-events:none !important; }
    [data-ff-desktop-chat] > [class~="flex"][class~="flex-row"] > [class~="relative"][class~="max-w-[950px]"][class~="w-full"][class~="mx-auto"] > [class~="grid"][class~="relative"][class~="grid-cols-[40px_1fr_30px]"] > [class~="min-w-0"][class~="relative"][class~="ml-4"] > [class~="h-[30px]"][class~="pl-4"][class~="hidden"][class~="md:flex"][class~="items-center"][class~="relative"]:has(> span.text-gray-500.text-xs.text-center.w-full.z-0.absolute.left-0.right-0),
    [data-ff-desktop-chat] > [class~="flex"][class~="flex-row"] > [class~="relative"][class~="max-w-[950px]"][class~="w-full"][class~="mx-auto"] > [class~="grid"][class~="relative"][class~="grid-cols-[40px_1fr_30px]"] > [class~="min-w-0"][class~="relative"][class~="ml-4"] > [class~="h-[30px]"][class~="pl-4"][class~="hidden"][class~="md:flex"][class~="items-center"][class~="relative"]:has(> div.flex.flex-row.items-center.gap-1.z-0.absolute.left-0.right-0) { height:auto !important; min-height:30px !important; }
    [data-ff-desktop-chat] > [class~="flex"][class~="flex-row"] > [class~="relative"][class~="max-w-[950px]"][class~="w-full"][class~="mx-auto"] > [class~="grid"][class~="relative"][class~="grid-cols-[40px_1fr_30px]"] > [class~="min-w-0"][class~="relative"][class~="ml-4"] > [class~="h-[30px]"][class~="pl-4"][class~="hidden"][class~="md:flex"][class~="items-center"][class~="relative"]:has(> span.text-gray-500.text-xs.text-center.w-full.z-0.absolute.left-0.right-0) > span.text-gray-500.text-xs.text-center.w-full.z-0.absolute.left-0.right-0 { position:static !important; }
    [data-ff-desktop-chat] > [class~="flex"][class~="flex-row"] > [class~="relative"][class~="max-w-[950px]"][class~="w-full"][class~="mx-auto"] > [class~="grid"][class~="relative"][class~="grid-cols-[40px_1fr_30px]"] > [class~="min-w-0"][class~="relative"][class~="ml-4"] > [class~="h-[30px]"][class~="pl-4"][class~="hidden"][class~="md:flex"][class~="items-center"][class~="relative"]:has(> div.flex.flex-row.items-center.gap-1.z-0.absolute.left-0.right-0) > div.flex.flex-row.items-center.gap-1.z-0.absolute.left-0.right-0 { position:static !important; width:100% !important; min-width:0 !important; box-sizing:border-box !important; }
    [data-ff-desktop-chat] > [class~="flex"][class~="flex-row"] > [class~="relative"][class~="max-w-[950px]"][class~="w-full"][class~="mx-auto"] > [class~="grid"][class~="relative"][class~="grid-cols-[40px_1fr_30px]"] > [class~="min-w-0"][class~="relative"][class~="ml-4"] > [class~="h-[30px]"][class~="pl-4"][class~="hidden"][class~="md:flex"][class~="items-center"][class~="relative"]:has(> div.flex.flex-row.items-center.gap-1.z-0.absolute.left-0.right-0) > div.flex.flex-row.items-center.gap-1.z-0.absolute.left-0.right-0 > div.text-gray-400.text-base { flex:1 1 auto; min-width:0 !important; box-sizing:border-box; }
    html[data-ff-desktop-play] [role="dialog"][data-ff-desktop-action-picker] { border:1px solid hsl(var(--border)) !important; }
    html[data-ff-desktop-play] button[role="switch"] { box-sizing:border-box; border:1px solid hsl(var(--border, 0 0% 50%)) !important; }
    html[data-ff-desktop-play] [data-ff-desktop-action-picker] [role="tab"] { border:1px solid transparent !important; }
    html[data-ff-desktop-play] [data-ff-desktop-action-picker] [role="tab"][data-state="active"] { border-color:hsl(var(--primary)) !important; }
    [data-ff-desktop-detail-card] { background-color:hsl(var(--card)) !important; background-image:none !important; border-color:hsl(var(--border)) !important; color:hsl(var(--foreground)) !important; }
    [data-ff-desktop-detail-card] :is(h1,h2,h3,h4,p,strong,b,a) { color:hsl(var(--foreground)) !important; }
    @media (max-width:600px) { [data-ff-desktop-input-expanded] { inset:8vh 4vw auto !important; width:92vw !important; } }`;

  const loading = `html[data-ff-desktop-play] [data-ff-desktop-loading],
    html[data-ff-desktop-play] main[class~="w-full"][class~="h-full"]:not(form *,[role="dialog"] *,aside *,[data-sidebar] *):has(> [class~="w-full"][class~="h-full"][class~="flex"][class~="items-center"][class~="justify-center"] > svg.custom-spin),
    [class~="h-[100dvh]"][class~="justify-center"][class~="items-center"]:has(> [class~="w-full"][class~="h-full"] > svg.custom-spin),
    html[data-ff-desktop-play] [class~="flex-1"][class~="h-full"][class~="w-full"]:has(> [class~="w-full"][class~="h-full"][class~="justify-center"] > svg.custom-spin)`;
  css += `${loading} { background-color:#000000 !important; background-image:${image && settings.backgroundImage ? `linear-gradient(${rgba(settings.backgroundEffects.overlayColor, settings.backgroundEffects.overlayOpacity)},${rgba(settings.backgroundEffects.overlayColor, settings.backgroundEffects.overlayOpacity)}),url("${image}")` : 'none'} !important;
    background-position:center !important; background-size:${settings.backgroundFit} !important; background-repeat:no-repeat !important; isolation:isolate; }
    :is(${loading}) > :is(img,[class~="absolute"][class~="inset-0"]) { display:none !important; }`;
  if (image && settings.backgroundImage) {
    css += `[data-ff-desktop-chat-background] { position: relative !important; isolation: isolate; background-color: transparent !important; background-image: none !important; }
      [data-ff-desktop-chat] { position: relative !important; isolation: isolate; background-color: transparent !important; }
      [data-ff-desktop-chat-background]::before { content: ""; position: absolute; inset: 0; z-index: -1;
        pointer-events: none; background-image: url("${image}"); background-position: center;
        background-size: ${settings.backgroundFit}; background-repeat: no-repeat;
        opacity: ${settings.backgroundEffects.opacity}; filter: blur(${settings.backgroundEffects.blur}px); clip-path: inset(0); }
      [data-ff-desktop-chat-background]::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
        background: ${rgba(settings.backgroundEffects.overlayColor, settings.backgroundEffects.overlayOpacity)}; }
      [data-ff-desktop-chat-layer] { background-color: transparent !important; background-image: none !important; }`;
  }
  {
    const roles = [
      ...(settings.messages.enabled ? ['player', 'gm', 'battle'] : []),
      ...(settings.input.enabled ? ['input', 'control'] : []), 'input-expanded', 'control-expanded',
      ...(settings.events.enabled ? ['event'] : []), ...(settings.dice.enabled ? ['roll','roll-menu'] : []),
    ];
    for (const role of roles) {
      const style = role === 'roll' || role === 'roll-menu' ? settings.dice.style : role === 'event' ? settings.events.style
        : role === 'input-expanded' || role === 'control-expanded' ? settings.context.style
        : role === 'input' || role === 'control' ? settings.input.style
        : role === 'gm' || role === 'battle' ? settings.messages.gm : settings.messages.player;
      const foreground = messageForeground(style, settings);
      const target = `[data-ff-desktop-message="${role}"]`;
      css += `${target} { background-color: ${style.gradient.enabled ? 'transparent' : rgba(style.color, style.opacity)} !important;
        background-image: ${styleBackground(style)} !important; color: ${foreground} !important; }
        ${target}, ${target} .prose { --tw-prose-body: ${foreground} !important;
          --tw-prose-headings: ${foreground} !important; --tw-prose-bold: ${foreground} !important;
          --tw-prose-lead: ${foreground} !important; --tw-prose-links: ${foreground} !important;
          --tw-prose-quotes: ${foreground} !important; --tw-prose-code: ${foreground} !important;
          --tw-prose-counters: ${foreground} !important; --tw-prose-bullets: ${foreground} !important; }
        ${target} .prose, ${target} .prose :is(p, span, strong, b, em, i, h1, h2, h3, h4, h5, h6, a, code, blockquote, li) {
          color: ${foreground} !important; }
        ${target} :is(.tiptap, textarea, input), ${target}:is(textarea,input,[contenteditable]) {
          color: ${foreground} !important; -webkit-text-fill-color: ${foreground} !important; caret-color: ${foreground} !important; }
        ${target}::placeholder, ${target} :is(textarea,input)::placeholder,
        ${target} [contenteditable] [data-placeholder]::before, ${target}[contenteditable] [data-placeholder]::before {
          color: ${foreground} !important; -webkit-text-fill-color: ${foreground} !important; opacity: .65; }
        ${target} :is([class*="text-gray-"], [class*="text-slate-"], .text-muted-foreground, .text-foreground-muted) {
          color: ${foreground} !important; }`;
      if (role.startsWith('input') || role.startsWith('control')) {
        css += `${target} :is(svg, span, button), ${target}:is(button,[role="combobox"]) { color: ${foreground} !important; }
          ${target} .tiptap { background-color: transparent !important; }
          ${target} [class*="hover:bg-gray-"]:hover { background-color: transparent !important; }`;
      }
      if (role.startsWith('control')) {
        css += `${target}:hover:not(:disabled) { box-shadow: inset 0 0 0 1px ${foreground}; }
          ${target}:focus-visible { outline: 2px solid ${foreground} !important; outline-offset: 2px; }`;
      }
      if (role === 'gm') css += `${target} :is(h1,h2,h3,h4,h5,h6,strong,b),
        ${target} button[aria-controls], ${target} button[aria-controls] :is(svg,span) { color: ${foreground} !important; }`;
      if (role === 'battle') css += `${target} [class~="bg-slate-700"] { background-color: color-mix(in srgb, ${foreground} 20%, transparent) !important; }`;
      if (role === 'battle' || role === 'roll-menu') {
        // Battle summaries and native dice subwindows follow the app's simple
        // surface outline while chat cards continue to use their chosen frame.
        css += `${target} { border:1px solid hsl(var(--border, 0 0% 50%)) !important; border-radius:4px !important;
          box-shadow:none !important; }
          ${target}::after { content:none !important; background:none !important; border:0 !important; }`;
        if (role === 'roll-menu') css += `${target} { background-color:color-mix(in srgb, hsl(var(--card)) 88%, transparent) !important;
          background-image:none !important; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); }`;
      } else if (!role.startsWith('control')) css += borderCss(style,target,role.startsWith('input'),role.startsWith('input'));
      if (role === 'event' || role === 'roll' || role === 'roll-menu') css += `${target} :is(span,button,h1,h2,h3,h4,p) { color: ${foreground} !important; }`;
      if (role === 'roll-menu') css += `${target} :is([class*="bg-slate-"],[class*="bg-amber-"]) { background-color: transparent !important; background-image: none !important; }
        ${target} [class*="border-amber-"] { border-color: ${style.border.color} !important; }`;
      if (role === 'roll') css += `${target} > [class~="absolute"][class~="inset-0"][class~="pointer-events-none"] { display: none !important; }
        [data-ff-desktop-roll-container] { background: transparent !important; border: 0 !important; }`;
    }
  }
  if (settings.context.enabled) {
    for (const [part,style] of [['panel',settings.context.style],['bar',settings.context.bar]] as const) {
      const fg = messageForeground(style,settings);
      const root = `[data-ff-desktop-context="${part}"]`;
      css += `${root} { background-color: ${style.gradient.enabled ? 'transparent' : rgba(style.color, style.opacity)} !important;
        background-image: ${styleBackground(style)} !important; color: ${fg} !important; }
      ${root} :is([class*="bg-gray-"], [class*="bg-slate-"], [class*="bg-card"], button, input, textarea) {
        background-color: transparent !important; background-image: none !important; border-color: ${style.border.color} !important; }
      ${root} :is(span,p,div,button,input,textarea,svg,h1,h2,h3,h4,label,a,strong) { color: ${fg} !important; }
      ${root} :is(input,textarea,[contenteditable]) { -webkit-text-fill-color: ${fg} !important; caret-color: ${fg} !important; }
      ${root} :is(input,textarea)::placeholder { color: ${fg} !important; opacity: .65; }
      ${root} button:hover { box-shadow: inset 0 0 0 1px ${style.border.color}; }
      ${root} [class*="text-"]:not(svg) { color: ${fg} !important; }`;
      css += borderCss(style,root,part==='bar');
    }
    const block=settings.context.blocks;
    const fg=messageForeground(block,settings);
    const target='[data-ff-desktop-context] [data-ff-desktop-context-block].group.rounded-lg.border';
    css += `${target} { background-color: ${block.gradient.enabled?'transparent':rgba(block.color,block.opacity)} !important;
      background-image: ${styleBackground(block)} !important; color:${fg} !important; }
      ${target} :is(span,p,div,button,input,textarea,svg,label,a,strong) { color:${fg} !important; }
      ${target} :is(input,textarea,[contenteditable]) { -webkit-text-fill-color:${fg} !important; caret-color:${fg} !important; }
      ${target} :is(input,textarea)::placeholder {color:${fg} !important;}`;
    css += borderCss(block,target);
  }
  if (settings.dice.resultTextColor) {
    css += `[data-ff-desktop-roll-text], [data-ff-desktop-roll-text] :is(div,span,p,strong,b,em) {
      color: ${settings.dice.resultTextColor} !important; }`;
  }
  {
    // Keep each die's geometry and animation. These classes are its SVG paint layers.
    const layers: Record<string, [string[], string[], string[], string[], string[]]> = {
      d20: [['cls-2'], ['cls-4'], ['cls-3'], ['cls-5','cls-6','cls-7'], ['cls-1']],
      d4: [[], ['d4-cls-2'], ['d4-cls-1'], ['d4-cls-3'], []],
      d6: [['d6-cls-1'], ['d6-cls-3'], ['d6-cls-2'], ['d6-cls-4'], []],
      d8: [['d8-cls-2'], ['d8-cls-4'], ['d8-cls-3'], ['d8-cls-5'], ['d8-cls-1']],
      d10: [['d10-cls-1'], ['d10-cls-3'], ['d10-cls-2'], ['d10-cls-4'], []],
      d12: [['d12-cls-1'], ['d12-cls-3'], ['d12-cls-2'], ['d12-cls-4'], []],
    };
    function paint(target: string, die: string, palette: { faceColor: string; edgeColor: string; numberColor: string }): void {
      const { faceColor: face, edgeColor: edge, numberColor: number } = palette;
      const paints = [`color-mix(in srgb, ${face} 65%, black)`, face, `color-mix(in srgb, ${face} 85%, white)`, edge, edge];
      layers[die].forEach((classes, index) => {
        for (const name of classes) css += `${target} .${name} { ${index === 4 ? 'stroke' : 'fill'}: ${paints[index]} !important; }`;
      });
      css += `${target} text { fill: ${number} !important; }`;
    }
    if (settings.dice.colorsEnabled) {
      for (const die of Object.keys(layers)) paint(`[data-ff-desktop-die="${die}"]`, die, settings.dice);
    }
    for (const result of ['natural20','natural1'] as const) {
      if (settings.dice[result].enabled) paint(`[data-ff-desktop-critical-die="${result}"]`, 'd20', settings.dice[result]);
    }
  }
  return css;
}
