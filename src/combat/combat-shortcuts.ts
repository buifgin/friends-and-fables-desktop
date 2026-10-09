// Serialized into the campaign renderer; keep this controller DOM-only.
export function configureCombatShortcuts(enabled: boolean, locale: 'en' | 'ru'): void {
  type Controller = { update(value: 'en' | 'ru'): void; dispose(): void };
  const key = '__friendsFablesDesktopCombatShortcuts';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;

  type Item = { id: string; en: string; ru: string; group: 'check' | 'save' | 'skill' };
  const items: Item[] = [
    { id: 'ability.strength', en: 'Strength Check', ru: 'Проверка силы', group: 'check' },
    { id: 'ability.dexterity', en: 'Dexterity Check', ru: 'Проверка ловкости', group: 'check' },
    { id: 'ability.constitution', en: 'Constitution Check', ru: 'Проверка телосложения', group: 'check' },
    { id: 'ability.intelligence', en: 'Intelligence Check', ru: 'Проверка интеллекта', group: 'check' },
    { id: 'ability.wisdom', en: 'Wisdom Check', ru: 'Проверка мудрости', group: 'check' },
    { id: 'ability.charisma', en: 'Charisma Check', ru: 'Проверка харизмы', group: 'check' },
    { id: 'skill.acrobatics', en: 'Acrobatics', ru: 'Проверка акробатики', group: 'skill' },
    { id: 'skill.animal-handling', en: 'Animal Handling', ru: 'Проверка ухода за животными', group: 'skill' },
    { id: 'skill.arcana', en: 'Arcana', ru: 'Проверка магии', group: 'skill' },
    { id: 'skill.athletics', en: 'Athletics', ru: 'Проверка атлетики', group: 'skill' },
    { id: 'skill.deception', en: 'Deception', ru: 'Проверка обмана', group: 'skill' },
    { id: 'skill.history', en: 'History', ru: 'Проверка истории', group: 'skill' },
    { id: 'skill.insight', en: 'Insight', ru: 'Проверка проницательности', group: 'skill' },
    { id: 'skill.intimidation', en: 'Intimidation', ru: 'Проверка запугивания', group: 'skill' },
    { id: 'skill.investigation', en: 'Investigation', ru: 'Проверка анализа', group: 'skill' },
    { id: 'skill.medicine', en: 'Medicine', ru: 'Проверка медицины', group: 'skill' },
    { id: 'skill.nature', en: 'Nature', ru: 'Проверка природы', group: 'skill' },
    { id: 'skill.perception', en: 'Perception', ru: 'Проверка внимательности', group: 'skill' },
    { id: 'skill.performance', en: 'Performance', ru: 'Проверка выступления', group: 'skill' },
    { id: 'skill.persuasion', en: 'Persuasion', ru: 'Проверка убеждения', group: 'skill' },
    { id: 'skill.religion', en: 'Religion', ru: 'Проверка религии', group: 'skill' },
    { id: 'skill.sleight-of-hand', en: 'Sleight of Hand', ru: 'Проверка ловкости рук', group: 'skill' },
    { id: 'skill.stealth', en: 'Stealth', ru: 'Проверка скрытности', group: 'skill' },
    { id: 'skill.survival', en: 'Survival', ru: 'Проверка выживания', group: 'skill' },
    { id: 'save.strength', en: 'Strength Saving Throw', ru: 'Спасбросок силы', group: 'save' },
    { id: 'save.dexterity', en: 'Dexterity Saving Throw', ru: 'Спасбросок ловкости', group: 'save' },
    { id: 'save.constitution', en: 'Constitution Saving Throw', ru: 'Спасбросок телосложения', group: 'save' },
    { id: 'save.intelligence', en: 'Intelligence Saving Throw', ru: 'Спасбросок интеллекта', group: 'save' },
    { id: 'save.wisdom', en: 'Wisdom Saving Throw', ru: 'Спасбросок мудрости', group: 'save' },
    { id: 'save.charisma', en: 'Charisma Saving Throw', ru: 'Спасбросок харизмы', group: 'save' },
  ];
  const byLabel = new Map(items.flatMap(item => [[item.en, item], [item.ru, item]]));
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
    [data-ff-combat-shortcuts] label{display:inline-flex;align-items:center;gap:3px;font-size:.85em;}
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
  function findNative(item: Item, dock: HTMLElement): HTMLButtonElement | null {
    return Array.from(dock.querySelectorAll<HTMLButtonElement>('button')).find(button => !button.closest('[data-ff-combat-shortcuts]') && !button.disabled && byLabel.get(button.textContent?.trim() ?? '') === item) ?? null;
  }
  function findFavoriteTab(): HTMLButtonElement | null {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(tab => {
      const idRefs = `${tab.id} ${tab.getAttribute('aria-controls') ?? ''}`.toLowerCase();
      const identified = /favorit|избран/.test(idRefs);
      const label = tab.textContent?.trim().toLowerCase() ?? '';
      const labelled = label === 'favorites' || label === 'favourites' || label === 'избранное';
      return (identified || labelled) && !tab.disabled;
    }) ?? null;
  }
  function render(): void {
    if (!root || !root.isConnected) return;
    title.textContent = text('Pinned', 'Закреплённое'); summary.textContent = text('Manage pins', 'Настроить');
    favorites.textContent = text('Favorites', 'Избранное'); favorites.setAttribute('aria-label', text('Open native Favorites tab', 'Открыть вкладку «Избранное»'));
    const dock = currentDock();
    const picks = items.filter(item => pinned.includes(item.id) && (item.group === 'check' || item.group === 'save' || item.group === 'skill'));
    tray.replaceChildren(); tray.hidden = picks.length === 0;
    for (const item of picks) {
      const native = dock && findNative(item, dock), button = document.createElement('button'); button.type = 'button'; button.textContent = language === 'ru' ? item.ru : item.en;
      button.disabled = !native; button.setAttribute('aria-disabled', String(!native));
      button.addEventListener('click', () => { const current = currentDock(), target = current && findNative(item, current); if (target && !target.disabled) target.click(); }); tray.append(button);
    }
    list.replaceChildren();
    for (const item of items) {
      const label = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = pinned.includes(item.id);
      checkbox.setAttribute('aria-label', text(`Pin ${item.en}`, `Закрепить: ${item.ru}`));
      checkbox.addEventListener('change', () => { pinned = checkbox.checked ? [...new Set([...pinned, item.id])] : pinned.filter(id => id !== item.id); save(); render(); });
      label.append(checkbox, document.createTextNode(language === 'ru' ? item.ru : item.en)); list.append(label);
    }
    const tab = findFavoriteTab(); favorites.disabled = !tab; favorites.setAttribute('aria-disabled', String(!tab));
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
  }); observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-selected', 'aria-controls', 'id'] });
  favorites.addEventListener('click', () => { const tab = findFavoriteTab(); if (tab && !tab.disabled) tab.click(); });
  function update(value: 'en' | 'ru'): void { language = value; render(); }
  function dispose(): void { if (disposed) return; disposed = true; observer.disconnect(); owned.remove(); style.remove(); delete host[key]; }
  host[key] = { update, dispose }; sync();
}
