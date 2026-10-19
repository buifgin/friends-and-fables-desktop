// Serialized into the campaign renderer: keep all helpers inside this function.
export function configureCampaignChatPages(enabled: boolean): void {
  type EventRow = { id: number | null; isOptimistic?: boolean; [key: string]: unknown };
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
  const subscriptions = new Map<Query, { observer: Observer; unsubscribe: () => void; restore(): void }>();
  const busy = new Set<Query>();
  function campaign(): string | undefined {
    if (location.protocol !== 'https:' || location.hostname !== 'play.fables.gg') return;
    return /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/play\/?$/i.exec(location.pathname)?.[1];
  }
  function matches(value: unknown, id: string): boolean {
    return Array.isArray(value) && value.length === 2 && value[0] === 'events' && value[1] === id;
  }
  function temporary(page: Page | undefined, param: unknown): boolean {
    return param === null && !!page && Array.isArray(page.data) && page.data.length === 1 && page.direction === undefined && page.hasPreviousPage === true && page.hasNextPage === false && page.data[0]?.isOptimistic === true && page.data[0].id == null;
  }
  function pack(data: Data): Data {
    if (!data || !Array.isArray(data.pages) || !Array.isArray(data.pageParams) || data.pages.length !== data.pageParams.length || data.pages.length > 4) return data;
    // Null parameters are the captured native append shape. Genuine server
    // requests have cursor/direction objects and are never repacked.
    let previous = -Infinity, previousPage = -1;
    let previousRow: EventRow | undefined;
    const checkedPages: Page[] = [], checkedParams: unknown[] = [];
    let changed = false;
    const sameAppendBoundary = (left: number, right: number, id: number): boolean => {
      if (left + 1 !== right || id <= 0) return false;
      const a = data.pages[left], b = data.pages[right];
      const cursor = (value: unknown): boolean => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= id;
      return data.pageParams[left] === null && data.pageParams[right] === null
        && a.direction === undefined && b.direction === undefined && a.hasPreviousPage && b.hasPreviousPage
        && !a.hasNextPage && !b.hasNextPage && a.previousCursor === b.previousCursor && cursor(a.previousCursor)
        && a.nextCursor === b.nextCursor && (a.nextCursor === undefined || cursor(a.nextCursor));
    };
    for (const [index, page] of data.pages.entries()) {
      if (!page || !Array.isArray(page.data) || page.data.length > 15 || typeof page.hasPreviousPage !== 'boolean' || typeof page.hasNextPage !== 'boolean') return data;
      if (index === data.pages.length - 1 && temporary(page, data.pageParams[index])) {
        checkedPages.push(page); checkedParams.push(data.pageParams[index]); continue;
      }
      let rows: EventRow[] | undefined;
      for (const [offset, row] of page.data.entries()) {
        if (!row || row.isOptimistic === true || typeof row.id !== 'number' || !Number.isSafeInteger(row.id)) return data;
        if (row.id <= previous) {
          // Native confirmation can assign one event object to multiple pending
          // pages. Only that proven boundary alias is safe to discard; a later
          // conflicting/unsupported row still rejects the entire candidate.
          if (row.id !== previous || row !== previousRow || !sameAppendBoundary(previousPage, index, row.id)) return data;
          rows ??= page.data.slice(0, offset); changed = true; previousPage = index; continue;
        }
        rows?.push(row); previous = row.id; previousRow = row; previousPage = index;
      }
      if (!rows || rows.length) {
        checkedPages.push(rows ? { ...page, data: rows } : page); checkedParams.push(data.pageParams[index]);
      }
    }
    if (changed) data = { ...data, pages: checkedPages, pageParams: checkedParams };
    const pages: Page[] = [], pageParams: unknown[] = [];
    for (let index = 0; index < data.pages.length;) {
      const first = data.pages[index];
      if (temporary(first, data.pageParams[index]) || data.pageParams[index] !== null || first.direction !== undefined || first.data.length === 0 || !first.hasPreviousPage) {
        pages.push(first); pageParams.push(data.pageParams[index++]); continue;
      }
      let end = index + 1;
      while (end < data.pages.length && !temporary(data.pages[end], data.pageParams[end]) && data.pageParams[end] === null && data.pages[end].direction === undefined && data.pages[end].hasPreviousPage && data.pages[end].data.length > 0) end++;
      const rows = data.pages.slice(index, end).flatMap(page => page.data);
      const last = data.pages[end - 1];
      for (let offset = 0; offset < rows.length; offset += 15) {
        const chunk = rows.slice(offset, offset + 15), more = offset + 15 < rows.length;
        // Cursors denote the first/last actual event, as captured on native
        // server pages. Inherited append previousCursor points at stale history.
        const page: Page = { ...(offset === 0 ? first : last), data: chunk,
          previousCursor: chunk[0].id!, nextCursor: chunk[chunk.length - 1].id!,
          hasPreviousPage: first.hasPreviousPage, hasNextPage: more || last.hasNextPage };
        const existing = data.pages[index + offset / 15];
        if (existing && existing.data.length === chunk.length && existing.data.every((row, i) => row === chunk[i]) && existing.previousCursor === page.previousCursor && existing.nextCursor === page.nextCursor && existing.hasNextPage === page.hasNextPage) pages.push(existing);
        else { pages.push(page); changed = true; }
        pageParams.push(null);
      }
      if (pages.length !== end) changed = true;
      index = end;
    }
    // Actual adjacent newer rows prove forward availability. Keep this cursor
    // when backward pagination later evicts the newer page from its window.
    for (let index = 0; index + 1 < pages.length; index++) {
      const page = pages[index], next = pages[index + 1], last = page.data.at(-1);
      if (last && typeof last.id === 'number' && next.data.length && typeof next.data[0].id === 'number' && next.data[0].id > last.id && (!page.hasNextPage || page.nextCursor !== last.id)) {
        pages[index] = { ...page, hasNextPage: true, nextCursor: last.id }; changed = true;
      }
    }
    return changed ? { ...data, pages, pageParams } : data;
  }
  function normalize(query: Query): void {
    const id = campaign();
    if (disposed || !id || !matches(query.queryKey, id) || query.options?.maxPages !== 3 || busy.has(query)) return;
    const data = query.state.data;
    if (!data || temporary(data.pages?.at(-1), data.pageParams?.at(-1))) return;
    const normalized = pack(data);
    if (normalized === data) return;
    busy.add(query);
    try { query.setData(normalized, { updatedAt: query.state.dataUpdatedAt, manual: true }); }
    finally { busy.delete(query); }
  }
  function intercept(query: Query): (() => void) | undefined {
    const descriptor = Object.getOwnPropertyDescriptor(query, 'setData');
    if (descriptor && (!('value' in descriptor) || !descriptor.writable)) return;
    const original = query.setData;
    const wrapper = function(this: Query, ...args: unknown[]): unknown {
      const id = campaign();
      if (this === query && !disposed && id && matches(query.queryKey, id) && query.options.maxPages === 3) {
        const incoming = args[0] as Data | undefined, current = query.state.data;
        let candidate = incoming;
        if (incoming && temporary(incoming.pages?.at(-1), incoming.pageParams?.at(-1))) {
          // Only the captured append of one separate temporary page qualifies.
          const prefix = current && Array.isArray(current.pages) && Array.isArray(current.pageParams) && incoming.pages.length === current.pages.length + 1 && incoming.pageParams.length === current.pageParams.length + 1 && current.pages.every((page, index) => page === incoming.pages[index] && current.pageParams[index] === incoming.pageParams[index]) && !current.pages.some((page, index) => temporary(page, current.pageParams[index]));
          if (!prefix) candidate = undefined;
        }
        // A confirmed resolution can clone page metadata and truncate the
        // currently committed four-page optimistic window. Recover only exact
        // still-current suffix rows, never archived or edited/deleted history.
        if (incoming && current && Array.isArray(incoming.pages) && Array.isArray(incoming.pageParams) && Array.isArray(current.pages) && Array.isArray(current.pageParams) && incoming.pages.length === 3 && incoming.pageParams.length === 3 && current.pages.length === 4 && current.pageParams.length === 4 && temporary(current.pages[3], current.pageParams[3]) && incoming.pageParams[2] === null) {
          const sameRows = (a: Page, b: Page): boolean => Array.isArray(a?.data) && Array.isArray(b?.data) && a.data.length === b.data.length && a.data.every((row, index) => row === b.data[index]);
          const sameMetadata = (a: Page, b: Page): boolean => {
            const keys = Object.keys(a).filter(key => key !== 'data');
            return keys.length === Object.keys(b).filter(key => key !== 'data').length && keys.every(key => Object.hasOwn(b, key) && a[key] === b[key]);
          };
          const tail = current.pages[1], pending = current.pages[2], firstAlias = incoming.pages[1], lastAlias = incoming.pages[2];
          const row = firstAlias?.data?.[0], prior = tail?.data?.at(-1);
          if (temporary(pending, current.pageParams[2]) && current.pageParams[1] === null && incoming.pageParams.every(param => param === null)
            && tail && tail.direction === undefined && tail.hasPreviousPage === true && tail.hasNextPage === false
            && sameRows(incoming.pages[0], tail) && sameMetadata(incoming.pages[0], tail)
            && firstAlias?.data?.length === 1 && lastAlias?.data?.length === 1 && row === lastAlias.data[0]
            && row && typeof row.id === 'number' && Number.isSafeInteger(row.id) && row.id > 0 && row.isOptimistic !== true
            && prior && typeof prior.id === 'number' && row.id > prior.id
            && sameMetadata(firstAlias, pending) && sameMetadata(lastAlias, current.pages[3]) && sameMetadata(pending, current.pages[3])
            && tail.previousCursor === pending.previousCursor && tail.nextCursor === pending.nextCursor) {
            // The native insertion helper trims its oldest page after resolving
            // both pending pages to one event. Recover only the still-current
            // prefix, with unchanged suffix rows/metadata proving this transition.
            const recovered = pack({ ...incoming, pages: [current.pages[0], ...incoming.pages], pageParams: [current.pageParams[0], ...incoming.pageParams] });
            if (recovered.pages.length <= 3) candidate = recovered;
          }
          const last = incoming.pages[2], previous = current.pages[2]?.data?.at(-1);
          if (sameRows(incoming.pages[0], current.pages[1]) && sameRows(incoming.pages[1], current.pages[2]) && last?.data?.length === 1 && last.direction === undefined && last.hasPreviousPage === true && last.hasNextPage === false && previous && typeof previous.id === 'number' && typeof last.data[0]?.id === 'number' && Number.isSafeInteger(last.data[0].id) && last.data[0].id > previous.id && last.data[0].isOptimistic !== true) {
            const recovered = pack({ ...incoming, pages: [current.pages[0], ...incoming.pages], pageParams: [...current.pageParams.slice(0, 3), null] });
            if (recovered.pages.length <= 3) candidate = recovered;
          }
        }
        if (candidate) args[0] = pack(candidate);
      }
      return Reflect.apply(original, this, args);
    };
    try { Object.defineProperty(query, 'setData', descriptor ? { ...descriptor, value: wrapper } : { configurable: true, writable: true, value: wrapper }); }
    catch { return; } // Unsupported sealed/nonextensible native instance.
    return () => {
      if (query.setData !== wrapper) return;
      if (descriptor) Object.defineProperty(query, 'setData', descriptor);
      else delete (query as unknown as Record<string, unknown>).setData;
    };
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
          subscription.unsubscribe(); subscription.restore(); subscriptions.delete(query);
        }
      }
      for (const [query, observers] of mounted) {
        if (!subscriptions.has(query)) {
          const observer = observers.values().next().value!;
          const restore = intercept(query);
          if (!restore) continue;
          const unsubscribe = observer.subscribe(() => normalize(query));
          subscriptions.set(query, { observer, unsubscribe, restore });
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
    for (const entry of subscriptions.values()) { entry.unsubscribe(); entry.restore(); }
    subscriptions.clear();
    window.removeEventListener('click', scan, true); window.removeEventListener('keydown', scan, true);
    window.removeEventListener('popstate', scan); window.removeEventListener('pagehide', dispose);
    delete host[key];
  }
  host[key] = { dispose };
  mutations.observe(document.documentElement, { childList: true, subtree: true });
  scan();
}
