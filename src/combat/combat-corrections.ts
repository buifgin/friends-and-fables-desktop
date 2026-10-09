// Serialized into the sandboxed website: no imports, Node, IPC or native data writes.
export function configureCombatCorrections(enabled: boolean, locale: 'en' | 'ru'): void {
  type Controller = { update(locale: 'en' | 'ru'): void; dispose(): void };
  type Values = { modifier_value: number; proficiency_bonus: number };
  type Preset = { name: string; values: Values };
  const key = '__friendsFablesDesktopCombatCorrections';
  const host = window as unknown as Record<string, Controller | undefined>;
  if (host[key]) { if (enabled) host[key]!.update(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  const ids = ['modifier_value', 'proficiency_bonus'] as const;
  let language = locale, disposed = false, frame = 0, route = '', campaign = '';
  let fields: HTMLInputElement[] = [], form: HTMLFormElement | null = null, panel: HTMLElement | null = null;
  let presets: Preset[] = [];
  const storageKey = (): string => `ff-desktop-combat-corrections-v1:${campaign}`;
  const number = (value: unknown): number | null => {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^[+-]?\d{1,3}(?:\.\d{1,2})?$/.test(value.trim())) return null;
    const result = Number(value);
    return Number.isFinite(result) && Math.abs(result) <= 100 && Math.abs(result * 100 - Math.round(result * 100)) < 1e-8 ? result : null;
  };
  const valid = (value: unknown): value is Values => !!value && typeof value === 'object' && ids.every(id => number((value as Values)[id]) !== null);
  function read(): Preset[] {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw || raw.length > 16384) return [];
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data) || data.length > 20) return [];
      const result: Preset[] = [];
      for (const item of data) {
        if (typeof item?.name !== 'string' || !item.name.trim() || item.name.length > 40 || !valid(item.values) || result.some(p => p.name === item.name)) return [];
        result.push({ name: item.name, values: { modifier_value: Number(item.values.modifier_value), proficiency_bonus: Number(item.values.proficiency_bonus) } });
      }
      return result;
    } catch { return []; }
  }
  const ui = document.createElement('details'); ui.setAttribute('data-ff-combat-corrections', ''); ui.setAttribute('data-ff-translation-ignore', 'true');
  const summary = document.createElement('summary'); ui.append(summary);
  const note = document.createElement('p'); ui.append(note);
  const labels: HTMLSpanElement[] = [], edits: HTMLInputElement[] = [], applies: HTMLButtonElement[] = [];
  function button(marker: string, action: () => void): HTMLButtonElement {
    const result = document.createElement('button'); result.type = 'button'; result.setAttribute(`data-ff-correction-${marker}`, ''); result.addEventListener('click', action); return result;
  }
  const writable = (field: HTMLInputElement): boolean => field.isConnected && !field.disabled && !field.readOnly && !field.matches(':disabled') && !field.closest('[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[hidden],[aria-hidden="true"]') && field.getClientRects().length > 0 && getComputedStyle(field).visibility !== 'hidden' && getComputedStyle(field).visibility !== 'collapse';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  function message(en: string, ru: string): void { status.textContent = language === 'ru' ? ru : en; }
  function write(index: number, value: number): boolean {
    const field = fields[index];
    if (!field || !writable(field) || number(value) === null) { message('This field is unavailable or the value is invalid.', 'Поле недоступно или значение некорректно.'); return false; }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) return false;
    setter.call(field, String(value));
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    edits[index].value = String(value);
    message('Applied to this roll form. Review before rolling.', 'Применено к этой форме броска. Проверьте перед броском.');
    return true;
  }
  ids.forEach((id, index) => {
    const row = document.createElement('div'); row.className = 'ff-correction-row';
    const label = document.createElement('label'), text = document.createElement('span'); labels.push(text);
    const edit = document.createElement('input'); edit.type = 'text'; edit.inputMode = 'decimal'; edit.maxLength = 7; edit.setAttribute('data-ff-correction-value', id); edits.push(edit); label.append(text, edit); row.append(label);
    const apply = button(`apply-${id}`, () => { const value = number(edit.value); if (value === null) message('Enter a number from −100 to 100 (up to 2 decimals).', 'Введите число от −100 до 100 (до 2 знаков после точки).'); else write(index, value); }); applies.push(apply); row.append(apply);
    for (const delta of [-1, 1, 0]) {
      const quick = button(`${id}-${delta === -1 ? 'minus' : delta === 1 ? 'plus' : 'zero'}`, () => { const current = number(fields[index]?.value); if (current === null) message('The native value is invalid.', 'Исходное значение некорректно.'); else write(index, delta === 0 ? 0 : current + delta); });
      quick.textContent = delta === -1 ? '−1' : delta === 1 ? '+1' : '0'; quick.setAttribute('data-ff-correction-delta', String(delta)); row.append(quick);
    }
    ui.append(row);
  });
  const shortcut = button('shortcut', () => { if (!panel || !ui.isConnected) return; ui.open = true; shortcut.setAttribute('aria-expanded', 'true'); ui.scrollIntoView({ block: 'start', behavior: 'auto' }); summary.focus({ preventScroll: true }); });
  shortcut.setAttribute('data-ff-translation-ignore', 'true');
  shortcut.setAttribute('aria-expanded', 'false');
  ui.addEventListener('toggle', () => shortcut.setAttribute('aria-expanded', String(ui.open)));
  const nameLabel = document.createElement('label'), nameText = document.createElement('span'), name = document.createElement('input');
  name.maxLength = 40; name.setAttribute('data-ff-correction-name', ''); nameLabel.append(nameText, name); ui.append(nameLabel);
  const select = document.createElement('select'); select.setAttribute('data-ff-correction-presets', ''); ui.append(select);
  function options(): void {
    const selected = select.value; select.replaceChildren();
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = language === 'ru' ? 'Выберите локальный набор' : 'Select a local preset'; select.append(empty);
    presets.forEach(p => { const option = document.createElement('option'); option.value = p.name; option.textContent = p.name; select.append(option); });
    select.value = presets.some(p => p.name === selected) ? selected : '';
  }
  function persist(next: Preset[]): boolean {
    try { localStorage.setItem(storageKey(), JSON.stringify(next)); presets = next; options(); return true; }
    catch { message('Local storage is unavailable. Nothing was saved.', 'Локальное хранилище недоступно. Ничего не сохранено.'); return false; }
  }
  const save = button('save', () => {
    const title = name.value.trim(), values = Object.fromEntries(ids.map((id, i) => [id, number(fields[i]?.value)]));
    if (!title || title.length > 40 || !valid(values) || (presets.length >= 20 && !presets.some(p => p.name === title))) { message('Use a name and valid native values. Maximum 20 presets.', 'Укажите имя и корректные значения. Не более 20 наборов.'); return; }
    const next = presets.filter(p => p.name !== title); next.push({ name: title, values });
    if (persist(next)) { select.value = title; message('Saved locally for this campaign.', 'Сохранено локально для этой кампании.'); }
  });
  const load = button('load', () => {
    const preset = presets.find(p => p.name === select.value);
    if (!preset || !valid(preset.values) || fields.length !== 2 || fields.some(f => !writable(f))) { message('Select a preset with both fields available.', 'Выберите набор; оба поля должны быть доступны.'); return; }
    // Only an explicit click applies values to the currently recognised form.
    for (let i = 0; i < ids.length; i++) if (!write(i, preset.values[ids[i]])) break;
  });
  const remove = button('delete', () => { if (presets.some(p => p.name === select.value) && persist(presets.filter(p => p.name !== select.value))) message('Local preset deleted.', 'Локальный набор удалён.'); });
  ui.append(save, load, remove, status);
  // Owned text inputs must never trigger the native form's implicit Enter submit.
  ui.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); });
  const style = document.createElement('style'); style.setAttribute('data-ff-combat-corrections-style', ''); style.textContent = `[data-ff-correction-shortcut]{font:inherit;font-size:12px;min-height:28px;color:inherit;background:transparent;border:1px solid currentColor;border-radius:4px;padding:3px 6px}[data-ff-combat-corrections]{margin:8px 0;padding:8px;border:1px solid currentColor;border-radius:6px;font-size:12px;overflow-wrap:anywhere}[data-ff-combat-corrections] p{margin:6px 0}[data-ff-combat-corrections] summary{cursor:pointer}[data-ff-combat-corrections] .ff-correction-row{display:flex;flex-wrap:wrap;align-items:end;gap:4px;margin:6px 0}[data-ff-combat-corrections] label{display:flex;flex-direction:column;gap:3px}[data-ff-combat-corrections] input{width:90px;max-width:100%;color:inherit;background:transparent;border:1px solid currentColor;border-radius:4px;padding:4px}[data-ff-combat-corrections] select{display:block;max-width:100%;color:inherit;background:hsl(var(--card,0 0% 12%));margin:6px 0}[data-ff-combat-corrections] button{color:inherit;background:transparent;border:1px solid currentColor;border-radius:4px;min-height:28px;padding:3px 6px;margin-right:3px}[data-ff-combat-corrections] button:disabled{opacity:.5}`;
  document.head.append(style);
  function translate(): void {
    shortcut.textContent = language === 'ru' ? 'Поправки' : 'Corrections';
    summary.textContent = language === 'ru' ? 'Поправки к броску' : 'Roll corrections';
    note.textContent = language === 'ru' ? 'Только эта форма. Наборы хранятся локально в кампании и загружаются вручную. Значения: −100…100.' : 'This form only. Presets stay local to this campaign and load manually. Values: −100…100.';
    labels.forEach((label, i) => label.textContent = language === 'ru' ? (i === 0 ? 'Модификатор' : 'Бонус умения') : (i === 0 ? 'Modifier' : 'Proficiency bonus'));
    for (const [i, row] of Array.from(ui.querySelectorAll('.ff-correction-row')).entries()) { for (const quick of row.querySelectorAll<HTMLButtonElement>('[data-ff-correction-delta]')) { const delta = Number(quick.getAttribute('data-ff-correction-delta')); quick.setAttribute('aria-label', `${labels[i].textContent}: ${language === 'ru' ? (delta === 0 ? 'сбросить на 0' : delta > 0 ? 'увеличить на 1' : 'уменьшить на 1') : (delta === 0 ? 'reset to 0' : delta > 0 ? 'increase by 1' : 'decrease by 1')}`); } }
    applies.forEach(b => b.textContent = language === 'ru' ? 'Применить' : 'Apply');
    nameText.textContent = language === 'ru' ? 'Имя локального набора' : 'Local preset name';
    select.setAttribute('aria-label', language === 'ru' ? 'Локальные наборы' : 'Local presets');
    save.textContent = language === 'ru' ? 'Сохранить' : 'Save'; load.textContent = language === 'ru' ? 'Загрузить' : 'Load'; remove.textContent = language === 'ru' ? 'Удалить' : 'Delete';
    status.textContent = ''; options();
  }
  function unmount(): void { shortcut.remove(); ui.remove(); ui.open = false; shortcut.setAttribute('aria-expanded', 'false'); fields = []; form = null; panel = null; status.textContent = ''; }
  function scan(): void {
    frame = 0; if (disposed) return;
    const nextRoute = location.pathname + location.search;
    if (route !== nextRoute) { unmount(); route = nextRoute; campaign = location.pathname.replace(/\/play\/?$/, ''); presets = read(); options(); }
    const search = new URLSearchParams(location.search);
    const play = /\/play\/?$/.test(location.pathname) && (!search.has('view') || search.get('view') === 'play');
    const dock = play ? document.querySelector<HTMLElement>('[data-ff-combat-docked]') : null;
    const candidates = ids.map(id => dock?.querySelectorAll<HTMLInputElement>(`input[id="${id}"]`));
    const next = candidates.map(nodes => nodes?.length === 1 ? nodes[0] : null);
    const recognised = next.every(f => f instanceof HTMLInputElement && (f.type === 'text' && f.inputMode === 'decimal' || f.type === 'number') && f.form && !f.closest('[data-ff-combat-corrections]')) && next[0]!.form === next[1]!.form;
    if (!recognised || !dock) { if (panel) unmount(); return; }
    if (panel !== dock || fields.some((field, i) => field !== next[i]) || !ui.isConnected) {
      unmount(); panel = dock; fields = next as HTMLInputElement[]; form = fields[0].form;
      edits.forEach((edit, i) => edit.value = fields[i].value); name.value = ''; translate();
      // Keep native fields, form and submit untouched, and mount adjacent to the form.
      form!.insertAdjacentElement('afterend', ui);
    }
    const slot = panel?.querySelector('[data-ff-combat-shortcuts-slot]');
    if (slot && shortcut.parentElement !== slot) slot.append(shortcut);
    else if (!slot) shortcut.remove();
    fields.forEach((field, i) => { const disabled = !writable(field); edits[i].disabled = disabled; for (const b of ui.querySelectorAll<HTMLButtonElement>(`.ff-correction-row:nth-of-type(${i + 1}) button`)) b.disabled = disabled; });
    load.disabled = fields.some(f => !writable(f));
  }
  function schedule(): void { if (!frame && !disposed) frame = requestAnimationFrame(scan); }
  const observer = new MutationObserver(records => { if (records.some(record => !(record.target instanceof Element ? record.target : record.target.parentElement)?.closest('[data-ff-combat-corrections],[data-ff-correction-shortcut]'))) schedule(); });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ff-combat-docked', 'disabled', 'readonly', 'id', 'type', 'inputmode', 'aria-disabled', 'data-disabled', 'hidden', 'aria-hidden', 'style', 'class'] });
  const timer = window.setInterval(schedule, 500); window.addEventListener('popstate', schedule);
  host[key] = { update(value) { language = value; translate(); schedule(); }, dispose() { disposed = true; observer.disconnect(); clearInterval(timer); cancelAnimationFrame(frame); window.removeEventListener('popstate', schedule); unmount(); style.remove(); delete host[key]; } };
  translate(); scan();
}
