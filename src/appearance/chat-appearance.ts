import type { AppearanceSettings } from './themes';
import { messageForeground, rgba, styleBackground } from './themes';
import { borderCss } from './borders';

// Runs in the website's renderer with ordinary DOM access and no Electron APIs.
// Targets are based on the public play-route components.
export function configureChatAppearance(settings: AppearanceSettings): void {
  const key = '__friendsFablesDesktopChatAppearance';
  const host = window as unknown as Record<string, { dispose(): void } | undefined>;
  host[key]?.dispose();


  let marked = new Map<Element, Set<string>>();
  let next = new Map<Element, Set<string>>();
  let frame = 0;
  let disposed = false;
  let expandedComposer: HTMLElement | null = null;
  const expandButtons = new Map<HTMLElement, HTMLButtonElement>();
  const snapshots = new Map<string, { clone: HTMLElement; at: number; overlay?: HTMLElement }>();
  let snapshotTimer = 0;
  function closeExpanded(): void {
    expandedComposer?.removeAttribute('data-ff-desktop-input-expanded'); expandedComposer = null;
    for (const button of expandButtons.values()) { button.setAttribute('aria-expanded', 'false'); button.textContent = '↗'; button.title = 'Expand message input'; button.setAttribute('aria-label', 'Expand message input'); }
    schedule();
  }
  function snapshotMessages(): void {
    if (disposed) return;
    const now = Date.now();
    for (const card of document.querySelectorAll<HTMLElement>('[id^="event-message-card-"]')) {
      if (roleFor(card) !== 'player') continue;
      const body = Array.from(card.querySelectorAll<HTMLElement>('.prose')).find(element => !element.closest('[contenteditable="true"],[data-ff-desktop-message-snapshot]'));
      const old = snapshots.get(card.id);
      if (body && (body.closest('[data-ff-translation-blank],[data-ff-translation-pending]') || body.querySelector('[data-ff-translation-blank],[data-ff-translation-pending],[data-ff-translation-placeholder]'))) {
        old?.overlay?.remove(); snapshots.delete(card.id); continue;
      }
      if (body?.textContent?.trim()) {
        old?.overlay?.remove();
        const clone = body.cloneNode(true) as HTMLElement;
        for (const hidden of clone.querySelectorAll('[data-ff-desktop-hidden-instructions],[data-ff-desktop-sp-draft],script,style,[data-ff-translation-placeholder]')) hidden.remove();
        for (const paragraph of clone.querySelectorAll('p')) if (/^\s*\[\[FF-SP:1\]\][\s\S]*\[\[\/FF-SP:1\]\]\s*$/.test(paragraph.textContent ?? '')) paragraph.remove();
        if (!clone.textContent?.trim() || clone.textContent.includes('[[FF-SP:1]]') || clone.textContent.includes('[[/FF-SP:1]]')) continue;
        clone.removeAttribute('id'); clone.removeAttribute('contenteditable');
        for (const child of clone.querySelectorAll('[id]')) child.removeAttribute('id');
        snapshots.set(card.id, { clone, at: now });
      } else if (old && now - old.at < 4000) {
        if (!old.overlay?.isConnected) {
          old.overlay = old.clone.cloneNode(true) as HTMLElement;
          old.overlay.setAttribute('data-ff-desktop-message-snapshot', 'true'); old.overlay.setAttribute('data-ff-translation-ignore', 'true');
          old.overlay.setAttribute('aria-hidden', 'true'); old.overlay.style.pointerEvents = 'none';
          card.append(old.overlay);
        }
      }
    }
    for (const [id, snapshot] of snapshots) if (now - snapshot.at > 4000 || !document.getElementById(id)) { snapshot.overlay?.remove(); snapshots.delete(id); }
    while (snapshots.size > 32) { const id = snapshots.keys().next().value!; snapshots.get(id)?.overlay?.remove(); snapshots.delete(id); }
    clearTimeout(snapshotTimer);
    if (Array.from(snapshots.values()).some(snapshot => snapshot.overlay?.isConnected)) snapshotTimer = window.setTimeout(snapshotMessages, 4000);
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
    const fiberKey = Object.keys(card).find((name) => name.startsWith('__reactFiber$'));
    type Fiber = { memoizedProps?: { event?: { role?: string } }; return?: Fiber };
    let fiber: Fiber | undefined = fiberKey ? (card as unknown as Record<string, Fiber>)[fiberKey] : undefined;
    for (let depth = 0; fiber && depth < 30; depth++, fiber = fiber.return) {
      const role = fiber.memoizedProps?.event?.role;
      if (role === 'player') return 'player';
      if (role === 'dm' || role === 'npc') return 'gm';
    }
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
      const root = anchor.closest('[class~="bg-gray-800/80"]') ?? anchor.closest('.grid.relative');
      if (root && !anchor.closest('form,[role="dialog"],[class~="bottom-full"]') && !inCharacterForm(anchor)
        && root.querySelector('.tiptap[contenteditable="true"]') && root.querySelector('[aria-label="Roll dice"],[aria-label="Бросить кости"],[aria-label="More actions"]')) composers.add(root);
    }
    const contextRoots = new Set<Element>();
    for (const composer of composers) {
      // The expanded content and the tab bar are sibling surfaces in this wrapper.
      for (const bar of (composer.closest('[class~="z-100"]') ?? composer.closest('.grid.relative') ?? composer).querySelectorAll('[class~="bottom-full"][class~="left-0"][class~="right-0"] > [class~="bg-gray-800"]')) {
        contextRoots.add(bar);
        if (settings.context.enabled) {
          mark(bar, 'data-ff-desktop-context', bar.querySelector('[aria-label="Expand working context"],[aria-label="Развернуть рабочий контекст"]') ? 'bar' : 'panel');
          for (const block of bar.querySelectorAll('.group.rounded-lg.border')) mark(block,'data-ff-desktop-context-block','true');
        }
      }
    }
    const inContext = (element: Element): boolean => Array.from(contextRoots).some(root => root.contains(element));
    if (settings.events.enabled || settings.preset !== 'website') {
      // Spellbook, feat, and character detail rows are bordered neutral cards.
      // Preserve editable controls and status/level badges inside them.
      for (const detail of document.querySelectorAll('div.border.rounded-md, div.border.rounded-lg, [class~="rounded-md"][class~="border"][class~="bg-card"]')) {
        if (detail.closest('[id^="event-"],[data-ff-desktop-composer],[contenteditable="true"],nav,aside,[data-sidebar]') || inContext(detail)) continue;
        if (!detail.querySelector('img,h2,h3,h4,strong,input[type="number"]')) continue;
        mark(detail, 'data-ff-desktop-detail-card', 'true');
      }
    }

    if (chat && settings.backgroundImage && backgroundEnabled()) {
      mark(chat, 'data-ff-desktop-chat', 'true');
      let layer: Element | null | undefined = anchor;
      while (layer && layer !== chat) {
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
      if (settings.input.enabled || expandedComposer === composer) {
        mark(composer, 'data-ff-desktop-message', composer === expandedComposer ? 'input-expanded' : 'input');
        for (const button of composer.querySelectorAll('button, [role="combobox"]')) if (!inContext(button)) mark(button, 'data-ff-desktop-message', composer === expandedComposer ? 'control-expanded' : 'control');
      }
      if (!expandButtons.has(composer)) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = '↗'; button.title = 'Expand message input'; button.setAttribute('aria-label', 'Expand message input'); button.setAttribute('aria-expanded', 'false');
        button.setAttribute('data-ff-desktop-expand-input', 'true');
        button.addEventListener('click', () => { if (expandedComposer === composer) closeExpanded(); else { closeExpanded(); expandedComposer = composer; composer.setAttribute('data-ff-desktop-input-expanded', 'true'); button.setAttribute('aria-expanded', 'true'); button.textContent = '↙'; button.title = 'Collapse message input'; button.setAttribute('aria-label', 'Collapse message input'); schedule(); } });
        const tools = composer.querySelector('[aria-label="Roll dice"],[aria-label="Бросить кости"]')?.parentElement;
        (tools ?? composer).append(button); expandButtons.set(composer, button);
      }
    }
    for (const [composer, button] of expandButtons) if (!composers.has(composer)) { button.remove(); expandButtons.delete(composer); if (composer === expandedComposer) closeExpanded(); }
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
    if (settings.dice.enabled) {
      // This roll-breakdown popover is rendered in a Radix portal, outside its card.
      for (const menu of document.querySelectorAll('[role="dialog"][class~="bg-slate-900/95"][class~="border-amber-600/50"]')) {
        mark(menu,'data-ff-desktop-message','roll-menu');
      }
      for (const dialog of document.querySelectorAll('[role="dialog"]')) {
        if (dialog.querySelector('svg:is([id="d4"],[id="d6"],[id="d8"],[id="d10"],[id="d12"],[id="d20"])')) mark(dialog,'data-ff-desktop-message','roll-menu');
      }
    }
    reconcile();
    queueMicrotask(() => queueMicrotask(snapshotMessages));
  }
  function schedule(): void { if (!disposed && !frame) frame = requestAnimationFrame(scan); }
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.type === 'characterData')) queueMicrotask(() => queueMicrotask(snapshotMessages));
    if (records.some(record => record.type !== 'characterData' || record.target.parentElement?.closest('svg[id="d20"]'))) schedule();
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, characterData: true,
    attributeFilter: ['id', 'class', 'src', 'type', 'name', 'contenteditable', 'title', 'role', 'aria-label', 'aria-pressed', 'data-state'],
  });
  function translationReady(): void { for (const snapshot of snapshots.values()) snapshot.overlay?.remove(); snapshots.clear(); queueMicrotask(() => queueMicrotask(snapshotMessages)); }
  document.addEventListener('ff-desktop-translation-ready', translationReady);
  window.addEventListener('pointerdown', outside, true);
  window.addEventListener('keydown', onEscape, true);
  window.addEventListener('popstate', schedule);
  window.addEventListener('storage', schedule);
  host[key] = { dispose() {
    disposed = true; observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(snapshotTimer);
    closeExpanded(); for (const button of expandButtons.values()) button.remove();
    for (const snapshot of snapshots.values()) snapshot.overlay?.remove();
    document.removeEventListener('ff-desktop-translation-ready', translationReady);
    window.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', onEscape, true);
    window.removeEventListener('popstate', schedule);
    window.removeEventListener('storage', schedule);
    clearMarks();
  } };
  scan();
}

export function chatCss(settings: AppearanceSettings, image: string | null): string {
  let css = `[data-ff-desktop-expand-input] { border:1px solid currentColor; background:transparent; color:inherit; border-radius:50%; height:32px; width:32px; cursor:pointer; font-size:18px; flex-shrink:0; }
    [data-ff-desktop-input-expanded] { position:fixed !important; inset:12vh 10vw auto !important; z-index:1000 !important; width:80vw !important; max-height:76vh !important; box-shadow:0 16px 80px #0009; }
    [data-ff-desktop-input-expanded] .tiptap { min-height:35vh !important; max-height:60vh !important; overflow:auto !important; }
    [data-ff-desktop-message-snapshot] { pointer-events:none !important; }
    [data-ff-desktop-detail-card] { background-color:hsl(var(--card)) !important; background-image:none !important; border-color:hsl(var(--border)) !important; color:hsl(var(--foreground)) !important; }
    @media (max-width:600px) { [data-ff-desktop-input-expanded] { inset:8vh 4vw auto !important; width:92vw !important; } }`;

  const loading = `html[data-ff-desktop-play] [data-ff-desktop-loading],
    html[data-ff-desktop-play] main[class~="w-full"][class~="h-full"]:not(form *,[role="dialog"] *,aside *,[data-sidebar] *):has(> [class~="w-full"][class~="h-full"][class~="flex"][class~="items-center"][class~="justify-center"] > svg.custom-spin),
    [class~="h-[100dvh]"][class~="justify-center"][class~="items-center"]:has(> [class~="w-full"][class~="h-full"] > svg.custom-spin),
    html[data-ff-desktop-play] [class~="flex-1"][class~="h-full"][class~="w-full"]:has(> [class~="w-full"][class~="h-full"][class~="justify-center"] > svg.custom-spin)`;
  css += `${loading} { background-color:#000000 !important; background-image:${image && settings.backgroundImage ? `linear-gradient(${rgba(settings.backgroundEffects.overlayColor, settings.backgroundEffects.overlayOpacity)},${rgba(settings.backgroundEffects.overlayColor, settings.backgroundEffects.overlayOpacity)}),url("${image}")` : 'none'} !important;
    background-position:center !important; background-size:${settings.backgroundFit} !important; background-repeat:no-repeat !important; isolation:isolate; }
    :is(${loading}) > :is(img,[class~="absolute"][class~="inset-0"]) { display:none !important; }`;
  if (image && settings.backgroundImage) {
    css += `[data-ff-desktop-chat] { position: relative !important; isolation: isolate; background-color: transparent !important; }
      [data-ff-desktop-chat]::before { content: ""; position: absolute; inset: 0; z-index: -1;
        pointer-events: none; background-image: url("${image}"); background-position: center;
        background-size: ${settings.backgroundFit}; background-repeat: no-repeat;
        opacity: ${settings.backgroundEffects.opacity}; filter: blur(${settings.backgroundEffects.blur}px); clip-path: inset(0); }
      [data-ff-desktop-chat]::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
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
      if (!role.startsWith('control')) css += borderCss(style,target,role.startsWith('input'),role.startsWith('input'));
      if (role === 'event' || role === 'roll' || role === 'roll-menu') css += `${target} :is(span,button,h1,h2,h3,h4,p) { color: ${foreground} !important; }`;
      if (role === 'roll-menu') css += `${target} :is([class*="bg-slate-"],[class*="bg-amber-"]) { background-color: transparent !important; background-image: none !important; }
        ${target} [class*="border-amber-"] { border-color: ${style.border.color} !important; }`;
      if (role === 'roll') css += `${target} > [class~="absolute"][class~="inset-0"][class~="pointer-events-none"] { display: none !important; }
        [data-ff-desktop-roll-container] { background: transparent !important; border: 0 !important; }`;
    }
  }
  if (settings.events.enabled) {
    const style = settings.events.style;
    css += `[data-ff-desktop-detail-card] { background-color:${style.gradient.enabled ? 'transparent' : rgba(style.color, style.opacity)} !important; background-image:${styleBackground(style)} !important; color:${messageForeground(style, settings)} !important; }
      [data-ff-desktop-detail-card] :is(h1,h2,h3,h4,p,strong,b,a) { color:${messageForeground(style, settings)} !important; }`;
    css += borderCss(style, '[data-ff-desktop-detail-card]');
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
