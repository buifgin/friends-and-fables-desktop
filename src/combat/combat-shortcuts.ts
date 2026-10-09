// Serialized into the campaign renderer; keep this controller DOM-only.
export function configureCombatShortcuts(enabled: boolean, locale: 'en' | 'ru'): void {
  type Controller = { update(value: 'en' | 'ru'): void; dispose(): void };
  const key = '__friendsFablesDesktopCombatShortcuts';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;

  type Item = { id: string; en: string; ru: string; aliases: string[]; group: 'check' | 'save' | 'skill' };
  const ability = (name: string, ruName: string, key: string, abbreviation: string) => ({
    check: { id: `ability.${key}`, en: `${name} Check`, ru: `Проверка ${ruName}`, aliases: [`${name} Check`, `${abbreviation} Check`], group: 'check' as const },
    save: { id: `save.${key}`, en: `${name} Saving Throw`, ru: `Спасбросок ${ruName}`, aliases: [`${name} Saving Throw`, `${abbreviation} Saving Throw`], group: 'save' as const },
  });
  const str = ability('Strength', 'силы', 'strength', 'STR'), dex = ability('Dexterity', 'ловкости', 'dexterity', 'DEX');
  const con = ability('Constitution', 'телосложения', 'constitution', 'CON'), int = ability('Intelligence', 'интеллекта', 'intelligence', 'INT');
  const wis = ability('Wisdom', 'мудрости', 'wisdom', 'WIS'), cha = ability('Charisma', 'харизмы', 'charisma', 'CHA');
  const items: Item[] = [
    str.check, dex.check, con.check, int.check, wis.check, cha.check,
    ...[
      ['acrobatics', 'Acrobatics', 'акробатики'], ['animal-handling', 'Animal Handling', 'ухода за животными'], ['arcana', 'Arcana', 'магии'],
      ['athletics', 'Athletics', 'атлетики'], ['deception', 'Deception', 'обмана'], ['history', 'History', 'истории'],
      ['insight', 'Insight', 'проницательности'], ['intimidation', 'Intimidation', 'запугивания'], ['investigation', 'Investigation', 'анализа'],
      ['medicine', 'Medicine', 'медицины'], ['nature', 'Nature', 'природы'], ['perception', 'Perception', 'внимательности'],
      ['performance', 'Performance', 'выступления'], ['persuasion', 'Persuasion', 'убеждения'], ['religion', 'Religion', 'религии'],
      ['sleight-of-hand', 'Sleight of Hand', 'ловкости рук'], ['stealth', 'Stealth', 'скрытности'], ['survival', 'Survival', 'выживания'],
    ].map(([id, name, ru]) => ({ id: `skill.${id}`, en: `${name} Check`, ru: `Проверка ${ru}`, aliases: [`${name} Check`], group: 'skill' as const })),
    str.save, dex.save, con.save, int.save, wis.save, cha.save,
  ];
  const byLabel = new Map(items.flatMap(item => [...item.aliases.map(label => [label, item] as const), [item.ru, item] as const]));
  let language = locale, disposed = false, queued = false, route = '', root: HTMLElement | null = null, slot: HTMLElement | null = null;
  const owned = document.createElement('section'); owned.dataset.ffCombatShortcuts = ''; owned.dataset.ffTranslationIgnore = 'true';
  owned.setAttribute('aria-label', 'Combat shortcuts');
  const style = document.createElement('style'); style.dataset.ffCombatShortcutsStyle = '';
  style.textContent = `
    [data-ff-combat-shortcuts]{font:inherit;color:inherit;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:5px 8px;border-bottom:1px solid hsl(var(--border,0 0% 35%));}
    [data-ff-combat-shortcuts] button{font:inherit;color:inherit;background:hsl(var(--muted,0 0% 20%));border:1px solid hsl(var(--border,0 0% 40%));border-radius:5px;padding:5px 8px;cursor:pointer;}
    [data-ff-combat-shortcuts] button:focus-visible,[data-ff-combat-shortcuts] input:focus-visible{outline:2px solid hsl(var(--ring,45 60% 55%));outline-offset:2px;}
    [data-ff-combat-shortcuts] [data-ff-shortcut-tray]{display:flex;flex-wrap:wrap;gap:4px;}
    [data-ff-combat-shortcuts] [data-ff-shortcut-manager]{display:flex;flex-wrap:wrap;gap:4px;align-items:center;}
    [data-ff-combat-shortcuts] [data-ff-shortcut-manager][open]{flex-basis:100%;}
    [data-ff-combat-shortcuts] [data-ff-shortcut-list]{display:flex;flex-wrap:wrap;gap:4px;max-height:min(40vh,240px);width:100%;overflow:auto;overscroll-behavior:contain;padding:4px;}
    [data-ff-combat-shortcuts] label{display:inline-flex;align-items:center;gap:3px;font-size:.85em;max-width:100%;}
    [data-ff-combat-shortcuts] [data-ff-shortcut-title]{font-weight:600;margin-inline-end:3px;}
  `;
  document.head.append(style);
  const text = (en: string, ru: string): string => language === 'ru' ? ru : en;
  const campaignId = (): string => /\/([^/]+)\/play\/?$/.exec(location.pathname)?.[1] ?? '';
  const storageKey = (campaign: string): string => `ff-desktop-combat-pins-v1:${campaign}`;
  function read(campaign: string): string[] {
    try {
      const value = localStorage.getItem(storageKey(campaign));
      if (!value || value.length > 2048) return [];
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && items.some(item => item.id === id)))] : [];
    } catch { return []; }
  }
  function save(): void { if (!campaignId()) return; try { localStorage.setItem(storageKey(campaignId()), JSON.stringify(pinned)); } catch { /* Storage may be blocked. */ } }
  let pinned = read(campaignId());
  const title = document.createElement('span'); title.dataset.ffShortcutTitle = ''; title.textContent = text('Pinned', 'Закреплённое');
  const tray = document.createElement('div'); tray.dataset.ffShortcutTray = ''; tray.setAttribute('aria-label', text('Pinned checks', 'Закреплённые проверки'));
  const manager = document.createElement('details'); manager.dataset.ffShortcutManager = '';
  const summary = document.createElement('summary'); summary.textContent = text('Manage pins', 'Настроить'); manager.append(summary);
  const list = document.createElement('div'); list.dataset.ffShortcutList = ''; manager.append(list);
  const favorites = document.createElement('button'); favorites.type = 'button'; favorites.dataset.ffNativeFavorites = '';
  owned.append(title, tray, manager, favorites);

  function currentDock(): HTMLElement | null { return document.querySelector<HTMLElement>('[data-ff-combat-docked]'); }
  function unavailable(node: HTMLElement): boolean {
    return node.matches(':disabled,[hidden],[aria-hidden="true"],[aria-disabled="true"],[data-disabled]') || !!node.closest('[hidden],[aria-hidden="true"]');
  }
  function findNative(item: Item, dock: HTMLElement): HTMLButtonElement | null {
    return Array.from(dock.querySelectorAll<HTMLButtonElement>('button')).find(button => !button.closest('[data-ff-combat-shortcuts]') && !unavailable(button) && byLabel.get(button.textContent?.trim() ?? '') === item) ?? null;
  }
  function findFavoriteTab(dock: HTMLElement): HTMLElement | null {
    return Array.from(dock.querySelectorAll<HTMLElement>('[role="tab"]')).find(tab => {
      const idRefs = `${tab.id} ${tab.getAttribute('aria-controls') ?? ''}`.toLowerCase();
      const identified = /favorit|избран/.test(idRefs);
      const label = tab.textContent?.trim().toLowerCase() ?? '';
      const labelled = label === 'favorites' || label === 'favourites' || label === 'избранное';
      return (identified || labelled) && !unavailable(tab);
    }) ?? null;
  }
  const trayButtons = new Map<string, HTMLButtonElement>();
  const managerRows = new Map<string, { label: HTMLLabelElement; input: HTMLInputElement; caption: Text }>();
  for (const item of items) {
    const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox';
    input.setAttribute('aria-label', text(`Pin ${item.en}`, `Закрепить: ${item.ru}`));
    const caption = document.createTextNode(language === 'ru' ? item.ru : item.en); label.append(input, caption); list.append(label);
    managerRows.set(item.id, { label, input, caption });
    input.addEventListener('change', () => { pinned = input.checked ? [...new Set([...pinned, item.id])] : pinned.filter(id => id !== item.id); save(); render(); });
  }
  let renderSignature = '';
  function render(): void {
    if (!root || !root.isConnected) return;
    title.textContent = text('Pinned', 'Закреплённое'); summary.textContent = text('Manage pins', 'Настроить');
    favorites.textContent = text('Favorites', 'Избранное'); favorites.setAttribute('aria-label', text('Open native Favorites tab', 'Открыть вкладку «Избранное»'));
    const dock = currentDock();
    const picks = items.filter(item => pinned.includes(item.id) && (item.group === 'check' || item.group === 'save' || item.group === 'skill'));
    const states = items.map(item => [item.id, !!(dock && findNative(item, dock))] as const);
    const tab = dock && findFavoriteTab(dock);
    const signature = JSON.stringify([language, pinned, states, !!tab]);
    if (signature === renderSignature) return;
    renderSignature = signature;
    tray.hidden = picks.length === 0;
    for (const item of picks) {
      let button = trayButtons.get(item.id);
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.addEventListener('click', () => { const current = currentDock(), target = current && findNative(item, current); if (target && !unavailable(target)) target.click(); });
        trayButtons.set(item.id, button);
      }
      button.textContent = language === 'ru' ? item.ru : item.en; button.disabled = !states.find(([id]) => id === item.id)?.[1];
      button.setAttribute('aria-disabled', String(button.disabled)); if (button.parentElement !== tray) tray.append(button);
    }
    for (const item of items) {
      const row = managerRows.get(item.id)!; row.input.checked = pinned.includes(item.id);
      row.input.setAttribute('aria-label', text(`Pin ${item.en}`, `Закрепить: ${item.ru}`)); row.caption.data = language === 'ru' ? item.ru : item.en;
      if (row.label.parentElement !== list) list.append(row.label);
    }
    favorites.disabled = !tab; favorites.setAttribute('aria-disabled', String(!tab));
  }
  function sync(): void {
    queued = false; if (disposed) return;
    const nextRoute = location.pathname + location.search;
    if (route !== nextRoute) { route = nextRoute; pinned = read(campaignId()); root = null; slot = null; }
    const dock = currentDock(), nextSlot = dock?.querySelector<HTMLElement>('[data-ff-combat-shortcuts-slot]') ?? null;
    if (nextSlot !== slot || !dock || !nextSlot) { if (owned.parentElement && owned.parentElement !== nextSlot) owned.remove(); slot = nextSlot; root = dock; }
    if (slot && owned.parentElement !== slot) slot.append(owned);
    render();
  }
  function schedule(): void { if (queued || disposed) return; queued = true; queueMicrotask(sync); }
  const observer = new MutationObserver(records => {
    if (records.some(record => !owned.contains(record.target) && record.target !== owned)) schedule();
  }); observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'data-disabled', 'hidden', 'aria-hidden', 'aria-selected', 'aria-controls', 'id'] });
  favorites.addEventListener('click', () => { const dock = currentDock(), tab = dock && findFavoriteTab(dock); if (tab && !unavailable(tab)) tab.click(); });
  function update(value: 'en' | 'ru'): void { language = value; render(); }
  function dispose(): void { if (disposed) return; disposed = true; observer.disconnect(); owned.remove(); style.remove(); delete host[key]; }
  host[key] = { update, dispose }; sync();
}
