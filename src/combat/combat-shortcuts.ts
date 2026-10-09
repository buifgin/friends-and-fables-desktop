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
  let language = locale, disposed = false, queued = false, route = '', dock: HTMLElement | null = null;
  let view: 'favorites' | 'standard' | 'selection' = 'favorites';
  const text = (en: string, ru: string): string => language === 'ru' ? ru : en;
  const campaignId = (): string => /\/([^/]+)\/play\/?$/.exec(location.pathname)?.[1] ?? '';
  const storageKey = (): string => `ff-desktop-combat-pins-v1:${campaignId()}`;
  function read(): string[] {
    try {
      const value = localStorage.getItem(storageKey());
      if (!value || value.length > 2048) return [];
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && items.some(item => item.id === id)))] : [];
    } catch { return []; }
  }
  let pinned = read(), draft = new Set(pinned);
  const owned = document.createElement('section'); owned.dataset.ffCombatShortcuts = ''; owned.dataset.ffDiceNavigation = ''; owned.dataset.ffTranslationIgnore = 'true';
  const favorites = document.createElement('section'); favorites.dataset.ffDiceFavorites = ''; favorites.dataset.ffTranslationIgnore = 'true';
  const tiles = document.createElement('div'); tiles.dataset.ffDiceFavoriteTiles = '';
  const empty = document.createElement('p');
  const button = (marker: string, action: () => void): HTMLButtonElement => {
    const node = document.createElement('button'); node.type = 'button'; node.setAttribute(marker, ''); node.addEventListener('click', action); return node;
  };
  function change(next: typeof view): void { view = next; if (next === 'selection') draft = new Set(pinned); sync(); }
  const standard = button('data-ff-dice-standard', () => change('standard'));
  const favoriteNav = button('data-ff-dice-favorites-nav', () => change('favorites'));
  const cancel = button('data-ff-dice-selection-cancel', () => change('favorites'));
  const add = button('data-ff-dice-add', () => change('selection'));
  const confirm = button('data-ff-dice-selection-confirm', () => {
    pinned = items.filter(item => draft.has(item.id)).map(item => item.id);
    if (campaignId()) try { localStorage.setItem(storageKey(), JSON.stringify(pinned)); } catch { /* Storage may be blocked. */ }
    change('favorites');
  });
  owned.append(standard, favoriteNav, cancel); favorites.append(tiles, empty, add);
  const style = document.createElement('style'); style.dataset.ffCombatShortcutsStyle = '';
  style.textContent = `
    [data-ff-dice-native-hidden]{display:none!important;}
    [data-ff-combat-shortcuts][hidden],[data-ff-dice-favorites][hidden],[data-ff-dice-selection-confirm][hidden],[data-ff-combat-shortcuts] [hidden]{display:none!important;}
    [data-ff-dice-navigation]{display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;padding:8px;box-sizing:border-box;}
    [data-ff-dice-navigation] button,[data-ff-dice-add],[data-ff-dice-selection-confirm]{font:inherit;color:inherit;background:hsl(var(--background,0 0% 15%));border:1px solid hsl(var(--border,0 0% 40%));border-radius:6px;padding:6px 10px;cursor:pointer;}
    [data-ff-dice-favorites]{padding:8px;min-width:0;box-sizing:border-box;}
    [data-ff-dice-favorite-tiles]{display:flex;flex-direction:column;gap:8px;}
    [data-ff-dice-favorite-tiles]>button{width:100%;font:inherit;color:inherit;}
    [data-ff-dice-add]{display:block;margin:12px auto 0;}
    [data-ff-dice-selection-tile]{position:relative!important;}
    [data-ff-dice-selection-checkbox]{position:absolute!important;right:8px;top:8px;width:18px;height:18px;margin:0;z-index:1;accent-color:hsl(var(--primary,45 60% 55%));}
    [data-ff-dice-navigation] button:focus-visible,[data-ff-dice-favorites] button:focus-visible,[data-ff-dice-selection-confirm]:focus-visible,[data-ff-dice-selection-checkbox]:focus-visible{outline:2px solid hsl(var(--ring,45 60% 55%));outline-offset:2px;}
  `;
  document.head.append(style);
  const nativeHidden = new Set<HTMLElement>();
  const overlays = new Map<HTMLButtonElement, { item: Item; checkbox: HTMLInputElement; pressed: string | null }>();
  const favoriteButtons = new Map<string, HTMLButtonElement>();
  function unavailable(node: HTMLElement): boolean {
    return node.matches(':disabled,[hidden],[aria-hidden="true"],[aria-disabled="true"],[data-disabled]') || !!node.closest('[hidden],[aria-hidden="true"]');
  }
  function nativeOptions(): Map<Item, HTMLButtonElement> {
    const result = new Map<Item, HTMLButtonElement>();
    if (!dock) return result;
    for (const node of dock.querySelectorAll<HTMLButtonElement>('button')) {
      if (owned.contains(node) || favorites.contains(node) || node === confirm) continue;
      const item = byLabel.get(node.textContent?.trim() ?? '');
      if (item && !result.has(item)) result.set(item, node);
    }
    return result;
  }
  function restore(): void {
    for (const node of nativeHidden) node.removeAttribute('data-ff-dice-native-hidden'); nativeHidden.clear();
    for (const [node, overlay] of overlays) {
      overlay.checkbox.remove(); node.removeAttribute('data-ff-dice-selection-tile');
      if (overlay.pressed === null) node.removeAttribute('aria-pressed'); else node.setAttribute('aria-pressed', overlay.pressed);
    }
    overlays.clear(); dock?.removeAttribute('data-ff-dice-selection');
  }
  function detach(): void { restore(); owned.remove(); favorites.remove(); confirm.remove(); dock?.removeEventListener('click', capture, true); dock?.removeEventListener('keydown', capture, true); dock?.removeEventListener('pointerdown', capture, true); dock?.removeEventListener('mousedown', capture, true); }
  function toggle(item: Item): void { if (draft.has(item.id)) draft.delete(item.id); else draft.add(item.id); sync(); }
  function capture(event: Event): void {
    if (view !== 'selection' || dock?.dataset.ffCombatPanelMode !== 'skills' || !(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLButtonElement>('[data-ff-dice-selection-tile]');
    const overlay = target && overlays.get(target);
    if (!target || !overlay) return;
    if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.type !== 'pointerdown' && event.type !== 'mousedown' && !unavailable(target)) toggle(overlay.item);
  }
  let signature = '';
  let previousOptions = new Map<Item, HTMLButtonElement>();
  function sync(): void {
    queued = false; if (disposed) return;
    const nextRoute = location.pathname + location.search;
    const nextDock = document.querySelector<HTMLElement>('[data-ff-combat-docked]');
    if (nextRoute !== route || nextDock !== dock) {
      detach(); dock = nextDock; route = nextRoute; pinned = read(); draft = new Set(pinned); view = 'favorites'; signature = '';
      dock?.addEventListener('click', capture, true); dock?.addEventListener('keydown', capture, true); dock?.addEventListener('pointerdown', capture, true); dock?.addEventListener('mousedown', capture, true);
    }
    const options = nativeOptions();
    const slot = dock?.querySelector<HTMLElement>('[data-ff-combat-shortcuts-slot]');
    const active = !!slot && dock?.dataset.ffCombatPanelMode === 'skills' &&
      [...options.values()].some(node => !node.closest('[hidden],[aria-hidden="true"]'));
    const nextSignature = JSON.stringify([route, language, view, pinned, [...draft], active, [...options].map(([item, node]) => [item.id, node.textContent, node.className, node.innerHTML.replace(/<input[^>]*>/g, ''), unavailable(node)])]);
    // Identity matters in every view: identical replacement lists need fresh hiding and overlays.
    const sameNodes = options.size === previousOptions.size && [...options].every(([item, node]) => previousOptions.get(item) === node);
    if (signature === nextSignature && sameNodes && (!active || owned.parentElement === slot)) return;
    const focused = document.activeElement;
    const focusedTile = focused instanceof Element ? focused.closest<HTMLButtonElement>('[data-ff-dice-selection-tile]') : null;
    const focusCheckbox = focused instanceof HTMLInputElement && focused.hasAttribute('data-ff-dice-selection-checkbox');
    signature = nextSignature; previousOptions = options; restore();
    owned.hidden = favorites.hidden = confirm.hidden = !active;
    if (!active) { if (view === 'selection') { view = 'favorites'; draft = new Set(pinned); signature = ''; } return; }
    if (owned.parentElement !== slot) slot!.append(owned);
    if (favorites.parentElement !== dock) dock!.append(favorites);
    if (confirm.parentElement !== dock) dock!.append(confirm);
    standard.textContent = text('All checks', 'Все проверки'); favoriteNav.textContent = text('Favorites', 'Избранное');
    standard.setAttribute('aria-pressed', String(view !== 'favorites')); favoriteNav.setAttribute('aria-pressed', String(view === 'favorites'));
    cancel.textContent = text('Cancel', 'Отмена'); cancel.hidden = view !== 'selection';
    confirm.textContent = text('Confirm', 'Подтвердить'); confirm.hidden = view !== 'selection';
    favorites.hidden = view !== 'favorites';
    empty.textContent = text('No favorite checks yet', 'Нет избранных проверок'); empty.hidden = pinned.length > 0;
    add.textContent = pinned.length ? text('Add more', 'Добавить ещё') : text('Add', 'Добавить');
    const selected = new Set(pinned);
    for (const [id, node] of favoriteButtons) if (!selected.has(id)) { node.remove(); favoriteButtons.delete(id); }
    for (const item of items.filter(item => selected.has(item.id))) {
      const native = options.get(item);
      let tile = favoriteButtons.get(item.id);
      if (!tile) {
        tile = button('data-ff-dice-favorite-tile', () => {
          const target = nativeOptions().get(item);
          if (!target || unavailable(target)) return;
          // Restore the native list before activation; the native handler owns the detail and Back path.
          restore(); target.click(); schedule();
        });
        tile.dataset.ffDiceFavoriteTile = item.id; favoriteButtons.set(item.id, tile);
      }
      tile.className = native?.className ?? '';
      tile.replaceChildren();
      if (native) {
        // Keep native child wrappers so selectors such as button > div > svg still apply.
        for (const child of native.childNodes) tile.append(child.cloneNode(true));
        const walker = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
        let captionWritten = false;
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          if (node.parentElement?.closest('svg') || !node.data.trim()) continue;
          node.data = captionWritten ? '' : language === 'ru' ? item.ru : item.en; captionWritten = true;
        }
        if (!captionWritten) tile.append(document.createTextNode(language === 'ru' ? item.ru : item.en));
      } else tile.textContent = language === 'ru' ? item.ru : item.en;
      // Clones have no React handlers; strip identity/form wiring and transient owned markers.
      for (const child of tile.querySelectorAll<HTMLElement>('*')) {
        if (child.hasAttribute('data-ff-dice-selection-checkbox')) child.remove(); else { child.removeAttribute('id'); child.removeAttribute('name');
          for (const attribute of [...child.attributes]) if (attribute.name.startsWith('data-ff-')) child.removeAttribute(attribute.name); }
      }
      tile.disabled = !native || unavailable(native); tile.setAttribute('aria-disabled', String(tile.disabled));
      if (tile.parentElement !== tiles) tiles.append(tile);
    }
    if (view === 'favorites') {
      // Hide the smallest common native list branch; never hide the dock/header/owned slot.
      let common: HTMLElement | null = options.values().next().value?.parentElement ?? null;
      while (common && ![...options.values()].every(node => common!.contains(node))) common = common.parentElement;
      if (common && common !== dock && !common.contains(slot!)) {
        common.setAttribute('data-ff-dice-native-hidden', ''); nativeHidden.add(common);
      } else for (const node of options.values()) { node.setAttribute('data-ff-dice-native-hidden', ''); nativeHidden.add(node); }
    } else if (view === 'selection') {
      dock!.dataset.ffDiceSelection = '';
      for (const [item, node] of options) {
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.dataset.ffDiceSelectionCheckbox = '';
        checkbox.checked = draft.has(item.id); checkbox.disabled = unavailable(node);
        checkbox.setAttribute('aria-label', text(`Favorite: ${item.en}`, `В избранное: ${item.ru}`));
        const pressed = node.getAttribute('aria-pressed'); node.setAttribute('aria-pressed', String(checkbox.checked)); node.dataset.ffDiceSelectionTile = item.id;
        node.append(checkbox); overlays.set(node, { item, checkbox, pressed });
        if (node === focusedTile) (focusCheckbox ? checkbox : node).focus({ preventScroll: true });
      }
    }
  }
  function schedule(): void { if (queued || disposed) return; queued = true; queueMicrotask(sync); }
  const observer = new MutationObserver(records => {
    if (records.some(record => !owned.contains(record.target) && !favorites.contains(record.target) && record.target !== confirm &&
      !(record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(node => node instanceof Element && node.hasAttribute('data-ff-dice-selection-checkbox'))))) schedule();
  });
  observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'data-disabled', 'hidden', 'aria-hidden', 'data-ff-combat-panel-mode'] });
  function update(value: 'en' | 'ru'): void { language = value; sync(); }
  function dispose(): void { if (disposed) return; disposed = true; observer.disconnect(); detach(); style.remove(); delete host[key]; }
  host[key] = { update, dispose }; sync();
}
