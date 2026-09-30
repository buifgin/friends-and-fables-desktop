// Serialized into the website. This function has ordinary DOM access only:
// no preload, IPC, network requests, or Electron APIs are exposed to the page.
export function installTranslationDom(token: string, dictionary: Record<string, string>, descriptions: boolean, names: string[]): void {
  type Entry = { id: number; node: Text; original: string; rendered: string | null; version: number; due: number; waiting: boolean };
  type Result = { id: number; version: number; text: string | null };
  type Controller = { collect(): unknown; retry(): void; finish(token: string, results: Result[]): void; dispose(): void };
  const key = '__friendsFablesDesktopTranslation';
  const host = window as unknown as Record<string, Controller | undefined>;
  host[key]?.dispose();
  const entries = new Map<number, Entry>();
  const nodes = new WeakMap<Text, Entry>();
  const roots = new Set<Node>([document.body]);
  const protectedSelector = 'script,style,noscript,template,svg,math,textarea,input,select,option,code,pre,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[data-ff-translation-ignore],form:has(input[type="password"]),form:has(input[type="email"])';
  let next = 0, timer: ReturnType<typeof setTimeout> | undefined;
  function eligible(node: Text): boolean {
    const parent = node.parentElement;
    // Friends & Fables disables browser translation on its entire document.
    // The user's app toggle overrides that page-wide flag. Local exclusions
    // (names, editors, individual blocks) still protect their original text.
    const exclusion = parent?.closest('[translate="no"],.notranslate');
    return !!parent && node.isConnected && !parent.closest(protectedSelector)
      && (!exclusion || exclusion === document.documentElement || exclusion === document.body)
      && !parent.closest('[hidden],[aria-hidden="true"]') && parent.getClientRects().length > 0
      && getComputedStyle(parent).visibility !== 'hidden';
  }
  function restore(entry: Entry): void {
    if (entry.rendered !== null && entry.node.data === entry.rendered) entry.node.data = entry.original;
    entries.delete(entry.id); nodes.delete(entry.node);
  }
  function examine(node: Text): void {
    let entry = nodes.get(node);
    if (!eligible(node)) { if (entry) restore(entry); return; }
    if (entry && (node.data === entry.rendered || (node.data === entry.original && !entry.rendered))) return;
    const original = node.data, core = original.trim();
    const preserved = names.some(name => name.toLocaleLowerCase() === core.toLocaleLowerCase());
    const known = Object.hasOwn(dictionary, core.toLowerCase()) && !preserved;
    const prose = descriptions && !node.parentElement?.closest('h1,h2,h3,h4,h5,h6')
      && (core.match(/[A-Za-z]{2,}/g)?.length ?? 0) >= 2;
    if ((!known && !prose) || !/[A-Za-z]/.test(core) || original.length > 4000 || entries.size >= 2000 && !entry) {
      if (entry) { entry.rendered = null; entries.delete(entry.id); nodes.delete(node); } return;
    }
    if (!entry) { entry = { id: ++next, node, original, rendered: null, version: 0, due: 0, waiting: false }; entries.set(entry.id, entry); nodes.set(node, entry); }
    entry.original = original; entry.rendered = null; entry.version++; entry.waiting = false; entry.due = performance.now() + 500;
    if (known) {
      const start = original.indexOf(core);
      entry.rendered = original.slice(0, start) + dictionary[core.toLowerCase()] + original.slice(start + core.length);
      node.data = entry.rendered;
    }
  }
  function scan(): void {
    if (timer) clearTimeout(timer); timer = undefined;
    for (const entry of entries.values()) if (!entry.node.isConnected) { entries.delete(entry.id); nodes.delete(entry.node); }
    for (const root of roots) {
      if (root.nodeType === Node.TEXT_NODE) { examine(root as Text); continue; }
      if (!(root instanceof Element)) continue;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) examine(walker.currentNode as Text);
    }
    roots.clear();
  }
  function schedule(root: Node): void {
    roots.add(root);
    if (!timer) timer = setTimeout(scan, 120);
  }
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') { for (const node of mutation.addedNodes) schedule(node); }
      else schedule(mutation.target);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['contenteditable', 'hidden', 'aria-hidden', 'translate', 'class', 'style'] });
  const onScroll = (): void => schedule(document.body);
  const onFocus = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest('[contenteditable]:not([contenteditable="false"]),[role="textbox"]') : null;
    if (target) for (const entry of entries.values()) if (target.contains(entry.node)) restore(entry);
  };
  document.addEventListener('scroll', onScroll, true);
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('beforeinput', onFocus, true);
  window.addEventListener('resize', onScroll);
  host[key] = {
    retry() { for (const entry of entries.values()) if (entry.rendered === null && !entry.waiting) entry.due = 0; },
    collect() {
      scan();
      const result: { id: number; version: number; text: string }[] = []; let length = 0;
      for (const entry of entries.values()) {
        if (entry.rendered !== null || entry.waiting || entry.due > performance.now() || !eligible(entry.node)) continue;
        if (result.length >= 8 || length + entry.original.length > 12000) break;
        entry.waiting = true; length += entry.original.length;
        result.push({ id: entry.id, version: entry.version, text: entry.original });
      }
      return { token, nodes: result };
    },
    finish(expected, results) {
      if (expected !== token) return;
      for (const result of results) {
        const entry = entries.get(result.id);
        if (!entry || entry.version !== result.version) continue;
        entry.waiting = false;
        if (!eligible(entry.node)) { restore(entry); continue; }
        if (entry.node.data !== entry.original) { schedule(entry.node); continue; }
        if (result.text === null) { entry.due = performance.now() + 15000; continue; }
        entry.rendered = result.text; entry.node.data = result.text;
      }
    },
    dispose() {
      observer.disconnect(); if (timer) clearTimeout(timer);
      document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('beforeinput', onFocus, true);
      for (const entry of entries.values()) restore(entry);
      roots.clear(); delete host[key];
    },
  };
  scan();
}
