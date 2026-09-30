import type { AppearanceSettings } from './themes';

// Runs in the website's renderer with ordinary DOM access and no Electron APIs.
// Targets are based on the public play-route components (event-message-card IDs).
export function configureChatAppearance(settings: AppearanceSettings): void {
  const key = '__friendsFablesDesktopChatAppearance';
  const host = window as unknown as Record<string, { dispose(): void } | undefined>;
  host[key]?.dispose();
  if (!settings.backgroundImage && !settings.messages.enabled) return;

  const marked = new Set<Element>();
  let frame = 0;
  function mark(element: Element, name: string, value: string): void {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    marked.add(element);
  }
  function clearMarks(): void {
    for (const element of marked) {
      element.removeAttribute('data-ff-desktop-chat');
      element.removeAttribute('data-ff-desktop-chat-layer');
      element.removeAttribute('data-ff-desktop-message');
    }
    marked.clear();
  }
  function roleFor(card: Element): 'player' | 'gm' | null {
    // The site does not render event.role as an HTML attribute. React's nearest
    // component props provide just the role, including NPC and streaming events.
    const fiberKey = Object.keys(card).find((name) => name.startsWith('__reactFiber$'));
    type Fiber = { memoizedProps?: { event?: { role?: string } }; return?: Fiber };
    let fiber: Fiber | undefined = fiberKey ? (card as unknown as Record<string, Fiber>)[fiberKey] : undefined;
    for (let depth = 0; fiber && depth < 30; depth++, fiber = fiber.return) {
      const role = fiber.memoizedProps?.event?.role;
      if (role === 'player') return 'player';
      if (role === 'dm' || role === 'npc') return 'gm';
    }
    // Streaming GM cards may not yet have an event. Their avatar is still Franz.
    const container = card.closest('[id^="event-container-"]');
    if (container && Array.from(container.querySelectorAll('img')).some((image) => {
      try { return decodeURIComponent(image.getAttribute('src') ?? '').includes('/franz/'); } catch { return false; }
    })) return 'gm';
    return null;
  }
  function scan(): void {
    frame = 0;
    for (const element of marked) if (!element.isConnected) marked.delete(element);
    if (!/\/play\/?$/.test(location.pathname)) { clearMarks(); return; }
    const cards = Array.from(document.querySelectorAll('[id^="event-message-card-"]'));
    const anchor = document.getElementById('events-list') ?? cards[0];
    const chat = anchor?.closest('.flex-1.h-full.w-full');
    if (chat && settings.backgroundImage) {
      mark(chat, 'data-ff-desktop-chat', 'true');
      // Only wrappers between the event list and chat root become transparent.
      // Message cards keep their own backgrounds unless message styling is on.
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
      for (const input of document.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"]')) {
        const wrapper = input.classList.contains('tiptap')
          ? input.closest('[class~="bg-gray-800/80"]') ?? input : input;
        mark(wrapper, 'data-ff-desktop-message', 'input');
      }
    }
  }
  const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(scan); });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['id', 'class', 'src', 'contenteditable'],
  });
  host[key] = { dispose() {
    observer.disconnect();
    cancelAnimationFrame(frame);
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
    for (const role of ['player', 'gm', 'input'] as const) {
      const style = role === 'gm' ? settings.messages.gm : settings.messages.player;
      const color = [1, 3, 5].map((offset) => parseInt(style.color.slice(offset, offset + 2), 16));
      const luminance = color.map((channel) => channel / 255)
        .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
      const foreground = 1.05 / (luminance + .05) >= (luminance + .05) / .05 ? '#ffffff' : '#000000';
      const target = `[data-ff-desktop-message="${role}"]`;
      css += `${target} { background-color: rgba(${color.join(',')}, ${style.opacity}) !important;
        background-image: none !important; color: ${foreground} !important; }
        ${target}, ${target} .prose { --tw-prose-body: ${foreground} !important;
          --tw-prose-headings: ${foreground} !important; --tw-prose-bold: ${foreground} !important;
          --tw-prose-lead: ${foreground} !important; --tw-prose-links: ${foreground} !important;
          --tw-prose-quotes: ${foreground} !important; --tw-prose-code: ${foreground} !important;
          --tw-prose-counters: ${foreground} !important; --tw-prose-bullets: ${foreground} !important; }
        ${target} .prose { color: ${foreground} !important; }
        ${target} :is(.tiptap, textarea, input), ${target}:is(textarea,input,[contenteditable]) { color: ${foreground} !important; }
        ${target}::placeholder, ${target} :is(textarea,input)::placeholder { color: ${foreground} !important; opacity: .65; }`;
    }
  }
  return css;
}
