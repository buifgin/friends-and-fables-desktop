// Serialized into the campaign renderer: keep all helpers inside this function.
export function configureCampaignChatPages(enabled: boolean): void {
  type EventRow = { id: number; [key: string]: unknown };
  type Page = { data: EventRow[]; hasPreviousPage: boolean; hasNextPage: boolean;
    previousCursor?: number; nextCursor?: number; direction?: unknown; [key: string]: unknown };
  type Data = { pages: Page[]; pageParams: unknown[]; [key: string]: unknown };
  type Query = { queryKey: unknown; options: { maxPages?: number }; state: { data?: Data; dataUpdatedAt: number };
    setData(data: Data, options: { updatedAt: number; manual: boolean }): unknown };
  type Observer = { options: { queryKey?: unknown; maxPages?: number }; getCurrentQuery(): Query;
    subscribe(listener: () => void): () => void };
  type Fiber = { memoizedState?: { memoizedState?: unknown; next?: unknown }; return?: Fiber; alternate?: Fiber };
  const key = '__friendsFablesDesktopCampaignChatPages';
  const host = window as unknown as Record<string, { dispose(): void } | undefined>;
  if (host[key]) { if (!enabled) host[key]!.dispose(); return; }
  if (!enabled) return;
  let disposed = false, scanning = false;
  const subscriptions = new Map<Query, { observer: Observer; unsubscribe: () => void }>();
  const busy = new Set<Query>();
  function campaign(): string | undefined {
    if (location.protocol !== 'https:' || location.hostname !== 'play.fables.gg') return;
    return /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/play\/?$/i.exec(location.pathname)?.[1];
  }
  function matches(value: unknown, id: string): boolean {
    return Array.isArray(value) && value.length === 2 && value[0] === 'events' && value[1] === id;
  }
  function normalize(query: Query): void {
    const id = campaign();
    if (disposed || !id || !matches(query.queryKey, id) || query.options?.maxPages !== 3 || busy.has(query)) return;
    const data = query.state?.data;
    if (!data || !Array.isArray(data.pages) || !Array.isArray(data.pageParams) || data.pages.length !== data.pageParams.length || data.pages.length > 3) return;
    // Null parameters are the captured native append shape. Genuine server
    // requests have cursor/direction objects and are never repacked.
    let previous = -Infinity;
    for (const page of data.pages) {
      if (!page || !Array.isArray(page.data) || page.data.length > 15 || typeof page.hasPreviousPage !== 'boolean' || typeof page.hasNextPage !== 'boolean') return;
      for (const row of page.data) {
        if (!row || !Number.isSafeInteger(row.id) || row.id <= previous) return;
        previous = row.id;
      }
    }
    const pages: Page[] = [], pageParams: unknown[] = [];
    let changed = false;
    for (let index = 0; index < data.pages.length;) {
      const first = data.pages[index];
      if (data.pageParams[index] !== null || first.direction !== undefined || first.data.length === 0 || !first.hasPreviousPage) {
        pages.push(first); pageParams.push(data.pageParams[index++]); continue;
      }
      let end = index + 1;
      while (end < data.pages.length && data.pageParams[end] === null && data.pages[end].direction === undefined && data.pages[end].hasPreviousPage && data.pages[end].data.length > 0) end++;
      const rows = data.pages.slice(index, end).flatMap(page => page.data);
      const last = data.pages[end - 1];
      for (let offset = 0; offset < rows.length; offset += 15) {
        const chunk = rows.slice(offset, offset + 15), more = offset + 15 < rows.length;
        // Cursors denote the first/last actual event, as captured on native
        // server pages. Inherited append previousCursor points at stale history.
        const page: Page = { ...(offset === 0 ? first : last), data: chunk,
          previousCursor: chunk[0].id, nextCursor: chunk[chunk.length - 1].id,
          hasPreviousPage: first.hasPreviousPage, hasNextPage: more || last.hasNextPage };
        const existing = data.pages[index + offset / 15];
        if (existing && existing.data.length === chunk.length && existing.data.every((row, i) => row === chunk[i]) && existing.previousCursor === page.previousCursor && existing.nextCursor === page.nextCursor && existing.hasNextPage === page.hasNextPage) pages.push(existing);
        else { pages.push(page); changed = true; }
        pageParams.push(null);
      }
      if (pages.length !== end) changed = true;
      index = end;
    }
    if (!changed) return;
    busy.add(query);
    try { query.setData({ ...data, pages, pageParams }, { updatedAt: query.state.dataUpdatedAt, manual: true }); }
    finally { busy.delete(query); }
  }
  function scan(): void {
    if (disposed || scanning) return;
    scanning = true;
    try {
      const id = campaign();
      if (!id) { dispose(); return; }
      const mounted = new Map<Query, Set<Observer>>();
      const seen = new Set<Fiber>();
      for (const element of document.querySelectorAll('[id^="event-container-"], [id^="event-message-card-"], .tiptap[contenteditable="true"]')) {
        const fiberKey = Object.keys(element).find(name => name.startsWith('__reactFiber$'));
        let fiber = fiberKey ? (element as unknown as Record<string, Fiber>)[fiberKey] : undefined;
        for (let depth = 0; fiber && depth < 80; depth++, fiber = fiber.return) {
          if (seen.has(fiber)) break;
          seen.add(fiber);
          let hook = fiber.memoizedState;
          for (let count = 0; hook && count < 80; count++, hook = hook.next as typeof hook) {
            const observer = hook.memoizedState as Observer | undefined;
            if (!observer || !matches(observer.options?.queryKey, id) || observer.options?.maxPages !== 3 || typeof observer.getCurrentQuery !== 'function' || typeof observer.subscribe !== 'function') continue;
            const query = observer.getCurrentQuery();
            if (!query || !matches(query.queryKey, id) || query.options?.maxPages !== 3 || typeof query.setData !== 'function') continue;
            const observers = mounted.get(query) ?? new Set<Observer>();
            observers.add(observer); mounted.set(query, observers);
          }
        }
      }
      // Discovery is complete before changing subscriptions: retain an existing
      // observer only while its hook is still present on a mounted DOM fiber.
      for (const [query, subscription] of subscriptions) {
        if (!mounted.get(query)?.has(subscription.observer)) {
          subscription.unsubscribe(); subscriptions.delete(query);
        }
      }
      for (const [query, observers] of mounted) {
        if (!subscriptions.has(query)) {
          const observer = observers.values().next().value!;
          const unsubscribe = observer.subscribe(() => normalize(query));
          subscriptions.set(query, { observer, unsubscribe });
        }
        normalize(query);
      }
    } finally { scanning = false; }
  }
  const mutations = new MutationObserver(scan);
  // Capture before native send handlers as well as discovering async mounts.
  window.addEventListener('click', scan, true);
  window.addEventListener('keydown', scan, true);
  window.addEventListener('popstate', scan);
  window.addEventListener('pagehide', dispose);
  const timer = setInterval(scan, 1000);
  function dispose(): void {
    if (disposed) return;
    disposed = true; mutations.disconnect(); clearInterval(timer);
    for (const entry of subscriptions.values()) entry.unsubscribe();
    subscriptions.clear();
    window.removeEventListener('click', scan, true); window.removeEventListener('keydown', scan, true);
    window.removeEventListener('popstate', scan); window.removeEventListener('pagehide', dispose);
    delete host[key];
  }
  host[key] = { dispose };
  mutations.observe(document.documentElement, { childList: true, subtree: true });
  scan();
}
