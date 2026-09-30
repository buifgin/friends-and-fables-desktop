import type { AppearanceSettings } from './themes';
import { messageForeground } from './themes';

// Runs in the website's renderer with ordinary DOM access and no Electron APIs.
// Targets are based on the public play-route components.
export function configureChatAppearance(settings: AppearanceSettings): void {
  const key = '__friendsFablesDesktopChatAppearance';
  const host = window as unknown as Record<string, { dispose(): void } | undefined>;
  host[key]?.dispose();
  if (!settings.backgroundImage && !settings.messages.enabled) return;

  let marked = new Map<Element, Set<string>>();
  let next = new Map<Element, Set<string>>();
  let frame = 0;
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
    const toggle = document.querySelector('[title="Hide background image"], [title="Show background image"]');
    if (toggle) return toggle.getAttribute('title') === 'Hide background image';
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
    next = new Map();
    const view = new URLSearchParams(location.search).get('view');
    if (!/\/play\/?$/.test(location.pathname) || (view && view !== 'play')) { clearMarks(); return; }
    const cards = Array.from(document.querySelectorAll('[id^="event-message-card-"]'));
    const anchor = document.getElementById('events-list') ?? cards[0];
    const chat = anchor?.closest('.flex-1.h-full.w-full');
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
        const role = roleFor(card);
        if (role) mark(card, 'data-ff-desktop-message', role);
      }
      for (const input of document.querySelectorAll('textarea, input:not([type]), input[type="text"], input[type="number"], input[type="search"], input[type="email"], input[type="url"], [contenteditable="true"]')) {
        if (inCharacterForm(input)) continue;
        const wrapper = input.classList.contains('tiptap')
          ? input.closest('[class~="bg-gray-800/80"]') ?? input : input;
        mark(wrapper, 'data-ff-desktop-message', 'input');
      }
      const composers = new Set<Element>();
      for (const anchor of document.querySelectorAll('#working-context-bar-spacer, [aria-label="Roll dice"], .tiptap[contenteditable="true"]')) {
        const root = anchor.closest('.grid.relative');
        if (root && chat?.contains(root) && !inCharacterForm(anchor)) composers.add(root);
      }
      for (const composer of composers) {
        mark(composer, 'data-ff-desktop-composer', 'true');
        for (const button of composer.querySelectorAll('button, [role="combobox"]')) mark(button, 'data-ff-desktop-message', 'control');
        // This wrapper remains present when the context bar is expanded.
        for (const bar of composer.querySelectorAll('[class~="bottom-full"][class~="left-0"][class~="right-0"] > [class~="bg-gray-800"]')) {
          mark(bar, 'data-ff-desktop-message', 'context');
        }
      }
      for (const row of document.querySelectorAll('[class~="bg-slate-800/60"][class~="backdrop-blur-sm"][class~="border-slate-700"]')) {
        const summary = row.closest('[class~="bg-black/40"][class~="border-slate-700"]');
        if (!summary?.closest('[id^="event-"]')) continue;
        mark(summary, 'data-ff-desktop-message', 'battle');
        mark(row, 'data-ff-desktop-message', 'battle');
      }
    }
    reconcile();
  }
  function schedule(): void { if (!frame) frame = requestAnimationFrame(scan); }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['id', 'class', 'src', 'type', 'name', 'contenteditable', 'title', 'aria-label', 'aria-pressed', 'data-state'],
  });
  window.addEventListener('popstate', schedule);
  window.addEventListener('storage', schedule);
  host[key] = { dispose() {
    observer.disconnect(); cancelAnimationFrame(frame);
    window.removeEventListener('popstate', schedule);
    window.removeEventListener('storage', schedule);
    clearMarks();
  } };
  scan();
}

export function chatCss(settings: AppearanceSettings, image: string | null): string {
  let css = '';
  if (image && settings.backgroundImage) {
    css += `[data-ff-desktop-chat] { position: relative !important; isolation: isolate; background-color: transparent !important; }
      [data-ff-desktop-chat]::before { content: ""; position: absolute; inset: 0; z-index: -1;
        pointer-events: none; background-image: url("${image}"); background-position: center;
        background-size: ${settings.backgroundFit}; background-repeat: no-repeat; }
      [data-ff-desktop-chat-layer] { background-color: transparent !important; background-image: none !important; }`;
  }
  if (settings.messages.enabled) {
    for (const role of ['player', 'gm', 'input', 'control', 'context', 'battle'] as const) {
      const style = role === 'gm' || role === 'battle' ? settings.messages.gm : settings.messages.player;
      const color = [1, 3, 5].map((offset) => parseInt(style.color.slice(offset, offset + 2), 16));
      const foreground = messageForeground(style, settings);
      const target = `[data-ff-desktop-message="${role}"]`;
      css += `${target} { background-color: rgba(${color.join(',')}, ${style.opacity}) !important;
        background-image: none !important; color: ${foreground} !important; }
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
      if (role === 'input' || role === 'control' || role === 'context') {
        css += `${target} :is(svg, span, button), ${target}:is(button,[role="combobox"]) { color: ${foreground} !important; }
          ${target} .tiptap { background-color: transparent !important; }
          ${target} [class*="hover:bg-gray-"]:hover { background-color: transparent !important; }`;
      }
      if (role === 'control') {
        css += `${target}:hover:not(:disabled) { box-shadow: inset 0 0 0 1px ${foreground}; }
          ${target}:focus-visible { outline: 2px solid ${foreground} !important; outline-offset: 2px; }`;
      }
      if (role === 'gm') css += `${target} :is(h1,h2,h3,h4,h5,h6,strong,b),
        ${target} button[aria-controls], ${target} button[aria-controls] :is(svg,span) { color: ${foreground} !important; }`;
      if (role === 'battle') css += `${target} [class~="bg-slate-700"] { background-color: color-mix(in srgb, ${foreground} 20%, transparent) !important; }`;
    }
  }
  return css;
}
