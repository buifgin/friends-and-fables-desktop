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
  const style = document.createElement('style'); style.setAttribute('data-ff-combat-corrections-style', ''); style.textContent = `[data-ff-combat-corrections]{margin:8px 0;padding:8px;border:1px solid hsl(var(--border));border-radius:6px;font-size:12px;color:hsl(var(--foreground));overflow-wrap:anywhere}[data-ff-combat-corrections] p{margin:6px 0}[data-ff-combat-corrections] summary{cursor:pointer;box-sizing:border-box;padding:6px 8px;min-height:32px;width:100%;border-radius:4px} [data-ff-combat-corrections] summary:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}[data-ff-combat-corrections] .ff-correction-row{display:flex;flex-wrap:wrap;align-items:end;gap:4px;margin:6px 0}[data-ff-combat-corrections] label{display:flex;flex-direction:column;gap:3px}[data-ff-combat-corrections] input{width:90px;max-width:100%;color:hsl(var(--foreground));background:hsl(var(--background));border:1px solid hsl(var(--input));border-radius:4px;padding:4px}[data-ff-combat-corrections] select{display:block;max-width:100%;color:hsl(var(--foreground));background:hsl(var(--background));border:1px solid hsl(var(--input));border-radius:4px;margin:6px 0}[data-ff-combat-corrections] button{color:hsl(var(--primary-foreground));background:linear-gradient(to bottom,hsl(var(--primary)),hsl(var(--primary-focus,var(--primary))));border:1px solid hsl(var(--primary-focus,var(--primary)));border-radius:4px;min-height:28px;padding:3px 6px;margin-right:3px}[data-ff-combat-corrections] button:disabled{opacity:.5}[data-ff-combat-corrections] [hidden]{display:none!important}[data-ff-combat-corrections] button:hover:not(:disabled){filter:brightness(1.1)}[data-ff-combat-corrections] :is(input,select,button):focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}[data-ff-pending-corrections] .ff-pending-correction-label{min-height:2.4em;display:flex;align-items:end}[data-ff-pending-corrections] .ff-correction-row{align-items:end}[data-ff-pending-corrections] select{margin:0;min-height:28px}`;
  document.head.append(style);
  function translate(): void {
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
  // The selected-action cards have no native numeric inputs. Bind only the
  // captured field-array wrapper and its own FormProvider, never item data.
  type NativeAttack = { id?: string; spell_id?: unknown; name?: string; image?: string; type?: string; requires_attack_roll?: boolean; attack_roll_type?: string; modifier_stat?: string; modifier_value?: number; proficiency_bonus?: number };
  type NativeMethods = { control: unknown; getFieldState?(name: string): { isDirty?: boolean; isTouched?: boolean }; getValues(name: string): unknown; setValue(name: string, value: string | number, options: { shouldDirty: boolean; shouldValidate: boolean }): void };
  type NativeProps = { attack?: NativeAttack; usersCharacter?: Record<string, unknown>; children?: unknown; control?: unknown; name?: string; value?: NativeMethods; getValues?: NativeMethods['getValues']; setValue?: NativeMethods['setValue']; showDropdown?: boolean; trigger?: HTMLElement; disabled?: boolean; onEdit?: unknown; selectedVantage?: string; setSelectedVantage?: (value: string) => void; numberOfDice?: number; setNumberOfDice?: unknown; typeOfDie?: string; setTypeOfDie?: unknown; modifierValue?: number; setModifierValue?: unknown; proficiencyBonus?: number; setProficiencyBonus?: unknown; standardDiceNotation?: string; setStandardDiceNotation?: unknown };
  type Fiber = { memoizedProps?: NativeProps; return?: Fiber; alternate?: Fiber; key?: string; stateNode?: { current?: Fiber } };
  type Binding = { methods: NativeMethods; index: number; id: string; attack: NativeAttack; snapshot: NativeAttack; character: Record<string, unknown>; form: HTMLFormElement; submit: HTMLButtonElement };
  type PendingUI = { node: HTMLDetailsElement; control: unknown; id: string; refresh(): void };
  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const pending = new Map<HTMLElement, PendingUI>();
  function binding(card: HTMLElement): Binding | null {
    if (!card.isConnected || !card.closest('[data-ff-combat-docked]')) return null;
    const nativeForm = card.closest('form'), submits = nativeForm?.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
    if (!nativeForm || submits?.length !== 1) return null;
    let fiber = Object.entries(card).find(([name]) => name.startsWith('__reactFiber$'))?.[1] as Fiber | undefined;
    // DOM React expandos may point at the alternate from the last committed render.
    let root = fiber; for (let depth = 0; root?.return && depth < 100; depth++) root = root.return;
    if (root?.alternate && root.stateNode?.current === root.alternate) fiber = fiber?.alternate ?? fiber;
    let props: NativeProps | undefined, index = -1, control: unknown, id = '';
    for (let depth = 0; fiber && depth < 35; depth++, fiber = fiber.return) {
      const current = fiber.memoizedProps;
      if (!current) continue;
      if (!props && current.attack && current.usersCharacter && current.showDropdown === true && typeof current.onEdit === 'function') props = current;
      if (props && index < 0 && fiber.key === props.attack?.id && Array.isArray(current.children)) {
        const fields = current.children.map(child => (child as { props?: NativeProps })?.props).filter(child => /^attacks\.\d+\.targets$/.test(child?.name ?? '') && !!child?.control);
        if (fields.length === 1) { index = Number(fields[0]!.name!.split('.')[1]); control = fields[0]!.control; id = fiber.key!; }
      }
      const methods = (typeof current.getValues === 'function' && typeof current.setValue === 'function' ? current : current.value) as NativeMethods | undefined;
      if (index >= 0 && methods && methods.control === control && typeof methods.getValues === 'function' && typeof methods.setValue === 'function') {
        try {
          const attack = methods.getValues(`attacks.${index}`) as NativeAttack | undefined;
          if (!attack || !props?.attack || !['melee', 'ranged', 'spell'].includes(attack.type ?? '') || attack.requires_attack_roll !== true || attack.name !== props.attack.name || attack.type !== props.attack.type) return null;
          return { methods, index, id, attack, snapshot: props.attack, character: props.usersCharacter!, form: nativeForm, submit: submits[0] };
        } catch { return null; }
      }
    }
    return null;
  }
  const nativeModes = ['normal', 'advantage', 'disadvantage'];
  type ModeBinding = { methods: NativeMethods; trigger: HTMLElement; field: string; value: string };
  function customModeBinding(): ModeBinding | null {
    if (!form || !panel || !form.isConnected || fields.some(field => !writable(field))) return null;
    const submits = form.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
    if (submits.length !== 1 || submits[0].disabled || submits[0].matches(':disabled')) return null;
    const candidates: ModeBinding[] = [];
    for (const select of Array.from(form.querySelectorAll<HTMLSelectElement>('select[aria-hidden="true"]')).slice(0, 8)) {
      const values = Array.from(select.options).map(option => option.value);
      if (values.length !== 3 || nativeModes.some(value => !values.includes(value)) || select.disabled) continue;
      let fiber = Object.entries(select).find(([name]) => name.startsWith('__reactFiber$'))?.[1] as Fiber | undefined;
      let trigger: HTMLElement | null = null, control: unknown;
      for (let depth = 0; fiber && depth < 35; depth++, fiber = fiber.return) {
        const props = fiber.memoizedProps; if (!props) continue;
        if (!trigger && props.trigger instanceof HTMLElement && props.trigger.closest('form') === form) trigger = props.trigger;
        if (props.name === 'attack_roll_type' && props.control) { if (control && control !== props.control) break; control = props.control; }
        const methods = (typeof props.getValues === 'function' && typeof props.setValue === 'function' ? props : props.value) as NativeMethods | undefined;
        if (control && trigger && methods?.control === control && typeof methods.getValues === 'function' && typeof methods.setValue === 'function') {
          try {
            const value = methods.getValues('attack_roll_type');
            // Captured custom damage forms expose the enum too. It is not an
            // attack-roll control unless the native form explicitly says so.
            if (methods.getValues('requires_attack_roll') !== true || typeof value !== 'string' || !nativeModes.includes(value)
              || !trigger.isConnected || trigger.hasAttribute('disabled') || trigger.matches(':disabled')
              || trigger.closest('[hidden],[aria-hidden="true"],[aria-disabled="true"]') || !trigger.getClientRects().length
              || getComputedStyle(trigger).visibility !== 'visible') break;
            candidates.push({ methods, trigger, field: 'attack_roll_type', value });
          } catch { /* Unknown native context has no owned mode control. */ }
          break;
        }
      }
    }
    return candidates.length === 1 ? candidates[0] : null;
  }
  const customModeLabel = document.createElement('label'), customModeText = document.createElement('span'), customMode = document.createElement('select');
  customMode.setAttribute('data-ff-correction-roll-mode', ''); customModeLabel.append(customModeText, customMode); customModeLabel.hidden = true;
  for (const value of nativeModes) { const option = document.createElement('option'); option.value = value; customMode.append(option); }
  ui.insertBefore(customModeLabel, nameLabel);
  function refreshCustomMode(): void {
    const current = customModeBinding(); customModeLabel.hidden = !current; customMode.disabled = !current;
    customModeText.textContent = language === 'ru' ? 'Тип броска' : 'Roll mode';
    Array.from(customMode.options).forEach((option, i) => option.textContent = language === 'ru' ? ['Обычный', 'Преимущество', 'Помеха'][i] : ['Normal', 'Advantage', 'Disadvantage'][i]);
    if (current && document.activeElement !== customMode) customMode.value = current.value;
  }
  customMode.addEventListener('change', () => {
    const current = customModeBinding(), value = customMode.value;
    if (!current || !nativeModes.includes(value)) { message('Native roll mode is unavailable.', 'Тип исходного броска недоступен.'); refreshCustomMode(); return; }
    try { current.methods.setValue(current.field, value, { shouldDirty: true, shouldValidate: true }); refreshCustomMode(); message('Applied to this roll only.', 'Применено только к текущему броску.'); }
    catch { message('Native roll mode is unavailable.', 'Тип исходного броска недоступен.'); }
  });
  type CheckModeBinding = { trigger: HTMLElement; value: string; set(value: string): void };
  function checkModeBinding(dock: HTMLElement | null): CheckModeBinding | null {
    const triggers = dock?.querySelectorAll<HTMLElement>('#vantage[role="combobox"]');
    if (triggers?.length !== 1) return null;
    const trigger = triggers[0];
    if (!trigger.isConnected || trigger.hasAttribute('disabled') || trigger.matches(':disabled')
      || trigger.closest('[hidden],[aria-hidden="true"],[aria-disabled="true"]') || !trigger.getClientRects().length
      || getComputedStyle(trigger).visibility !== 'visible') return null;
    let fiber = Object.entries(trigger).find(([name]) => name.startsWith('__reactFiber$'))?.[1] as Fiber | undefined;
    let root = fiber; for (let depth = 0; root?.return && depth < 256; depth++) root = root.return;
    if (root?.return) return null;
    if (root?.alternate && root.stateNode?.current === root.alternate) fiber = fiber?.alternate ?? fiber;
    let owner: NativeProps | undefined;
    for (let depth = 0; fiber && depth < 35; depth++, fiber = fiber.return) {
      const props = fiber.memoizedProps;
      if (!props || typeof props.setSelectedVantage !== 'function' || typeof props.selectedVantage !== 'string' || !nativeModes.includes(props.selectedVantage)) continue;
      if (!owner) { owner = props; continue; }
      if (props.setSelectedVantage !== owner.setSelectedVantage || props.selectedVantage !== owner.selectedVantage) return null;
      // The captured renderer mounts tG for automatic dice, tK for
      // standard notation, and a different tX shape for manual results.
      const automatic = typeof props.numberOfDice === 'number' && typeof props.typeOfDie === 'string'
        && typeof props.setNumberOfDice === 'function' && typeof props.setTypeOfDie === 'function';
      const standard = typeof props.standardDiceNotation === 'string' && typeof props.setStandardDiceNotation === 'function';
      if ((!automatic && !standard) || typeof props.modifierValue !== 'number' || typeof props.setModifierValue !== 'function'
        || typeof props.proficiencyBonus !== 'number' || typeof props.setProficiencyBonus !== 'function') return null;
      return { trigger, value: props.selectedVantage, set: props.setSelectedVantage };
    }
    return null;
  }
  const checkUI = document.createElement('details'); checkUI.setAttribute('data-ff-combat-corrections', ''); checkUI.setAttribute('data-ff-check-corrections', ''); checkUI.setAttribute('data-ff-translation-ignore', 'true');
  const checkSummary = document.createElement('summary'), checkLabel = document.createElement('label'), checkText = document.createElement('span'), checkMode = document.createElement('select'), checkStatus = document.createElement('p');
  checkStatus.setAttribute('role', 'status'); checkStatus.setAttribute('aria-live', 'polite'); checkMode.setAttribute('data-ff-correction-roll-mode', '');
  for (const value of nativeModes) { const option = document.createElement('option'); option.value = value; checkMode.append(option); }
  checkLabel.append(checkText, checkMode); checkUI.append(checkSummary, checkLabel, checkStatus);
  let checkTrigger: HTMLElement | null = null;
  function refreshCheckMode(dock: HTMLElement | null): void {
    const current = checkModeBinding(dock);
    if (!current) { checkUI.remove(); checkTrigger = null; checkUI.open = false; checkStatus.textContent = ''; return; }
    if (checkTrigger !== current.trigger || !checkUI.isConnected) { checkUI.remove(); checkTrigger = current.trigger; checkUI.open = false; checkStatus.textContent = ''; current.trigger.parentElement?.insertAdjacentElement('afterend', checkUI); }
    checkSummary.textContent = language === 'ru' ? 'Быстрые поправки' : 'Quick corrections'; checkText.textContent = language === 'ru' ? 'Тип броска' : 'Roll mode';
    Array.from(checkMode.options).forEach((option, i) => option.textContent = language === 'ru' ? ['Обычный', 'Преимущество', 'Помеха'][i] : ['Normal', 'Advantage', 'Disadvantage'][i]);
    if (document.activeElement !== checkMode) checkMode.value = current.value;
  }
  checkMode.addEventListener('change', () => {
    const current = checkModeBinding(checkTrigger?.closest<HTMLElement>('[data-ff-combat-docked]') ?? null), value = checkMode.value;
    if (!current || current.trigger !== checkTrigger || !nativeModes.includes(value)) return;
    try { current.set(value); checkStatus.textContent = language === 'ru' ? 'Применено только к текущему броску.' : 'Applied to this roll only.'; }
    catch { checkStatus.textContent = language === 'ru' ? 'Тип исходного броска недоступен.' : 'Native roll mode is unavailable.'; }
    schedule();
  });
  const pendingWritable = (card: HTMLElement, current: Binding): boolean => !current.submit.disabled && !current.submit.matches(':disabled') && !card.closest('[aria-disabled="true"],[hidden],[aria-hidden="true"]') && card.getClientRects().length > 0 && getComputedStyle(card).visibility === 'visible';
  const pendingNumber = (value: unknown, id: typeof ids[number]): number | null => { const result = number(value); return result !== null && result >= (id === 'modifier_value' ? -10 : 0) && result <= 10 ? result : null; };
  type AttackDefault = { character: string; catalog: string; type: string; ability: string; modifier_value: number; proficiency_bonus: number };
  type CategoryDefault = Omit<AttackDefault, 'catalog'>;
  const category = (type: string): 'weapon' | 'spell' => type === 'spell' ? 'spell' : 'weapon';
  type RowState = { consumed: boolean; edited: boolean; initial: string };
  const rows = new WeakMap<object, Map<string, RowState>>();
  const defaultKey = (): string => `ff-desktop-attack-defaults-v1:${campaign}`;
  const stableId = (value: unknown): string | null => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? `n:${value}`
    : typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? `s:${value}` : null;
  const storedId = (value: unknown): boolean => typeof value === 'string' && (value.startsWith('n:') ? stableId(Number(value.slice(2))) === value : value.startsWith('s:') && stableId(value.slice(2)) === value);
  const identityKey = (value: Pick<AttackDefault, 'character' | 'catalog' | 'type'>): string => JSON.stringify([value.character, value.catalog, value.type]);
  const defaultValues = (value: unknown): boolean => {
    const data = value as AttackDefault | null;
    return !!data && abilities.includes(data.ability) && typeof data.modifier_value === 'number' && typeof data.proficiency_bonus === 'number'
      && pendingNumber(data.modifier_value, 'modifier_value') !== null && pendingNumber(data.proficiency_bonus, 'proficiency_bonus') !== null;
  };
  function attackIdentity(current: Binding): Pick<AttackDefault, 'character' | 'catalog' | 'type'> | null {
    const character = stableId(current.character.id), attack = current.attack;
    const rawImage = attack.image ?? current.snapshot.image;
    if (rawImage != null && typeof rawImage !== 'string' || attack.image && current.snapshot.image && attack.image !== current.snapshot.image) return null;
    const image = typeof rawImage === 'string' && rawImage ? rawImage : undefined;
    if (!character || typeof attack.name !== 'string' || !attack.name || attack.name.length > 200
      || image && image.length > 2048 || !['melee', 'ranged', 'spell'].includes(attack.type ?? '')) return null;
    // The field-array id is ephemeral. Native spell_id identifies a known
    // catalog spell even when the selected attack omits its catalog image.
    const rawSpellId = attack.spell_id ?? current.snapshot.spell_id;
    const explicitSpell = attack.type === 'spell' && rawSpellId != null;
    const spellId = explicitSpell ? stableId(rawSpellId) : null;
    if (explicitSpell && (!spellId || attack.spell_id != null && current.snapshot.spell_id != null
      && stableId(attack.spell_id) !== stableId(current.snapshot.spell_id))) return null;
    const catalog: unknown[] = [];
    if (attack.type === 'spell') {
      const spells = current.character.spells;
      if (!Array.isArray(spells) || spells.length > 1000) return null;
      for (const entry of spells) catalog.push(entry?.spell);
    } else {
      for (const slot of ['right_hand', 'left_hand', 'two_handed']) if (current.character[slot]) catalog.push(current.character[slot]);
      const inventory = current.character.inventory;
      if (!Array.isArray(inventory) || inventory.length > 1000) return null;
      for (const entry of inventory) catalog.push(entry?.item);
    }
    const items = new Map<string, { name: string; image?: string }>();
    for (const candidate of catalog) {
      if (!candidate || typeof candidate !== 'object') continue;
      const item = candidate as { id?: unknown; name?: unknown; image?: unknown }, id = stableId(item.id);
      if (explicitSpell ? id !== spellId : item.name !== attack.name) continue;
      if (item.name !== attack.name || !id || item.image != null && typeof item.image !== 'string') return null;
      const prior = items.get(id), itemImage = typeof item.image === 'string' && item.image ? item.image : undefined;
      if (prior?.image && itemImage && prior.image !== itemImage) return null;
      items.set(id, { name: attack.name, image: itemImage ?? prior?.image });
    }
    const matches = [...items].filter(([, item]) => image === undefined || !item.image || item.image === image);
    if (matches.length !== 1 || (explicitSpell ? image !== undefined && matches[0][1].image !== image : matches[0][1].image !== image)) return null;
    return { character, catalog: matches[0][0], type: attack.type! };
  }
  function readDefaults(): { entries: AttackDefault[]; defaults: CategoryDefault[]; valid: boolean; available: boolean } {
    const invalid = (available: boolean) => ({ entries: [], defaults: [], valid: false, available });
    try {
      const raw = localStorage.getItem(defaultKey());
      if (raw === null) return { entries: [], defaults: [], valid: true, available: true };
      if (raw.length > 32768) return invalid(true);
      const data = JSON.parse(raw), entries: AttackDefault[] = [], defaults: CategoryDefault[] = [], seen = new Set<string>();
      if (![1, 2].includes(data?.version) || !Array.isArray(data.entries) || data.entries.length > 100
        || data.version === 2 && (!Array.isArray(data.defaults) || data.defaults.length + data.entries.length > 100)) return invalid(true);
      // Retain v1 melee/ranged records exactly. New writes use a weapon-wide
      // override; this avoids losing distinct legacy values during migration.
      for (const value of data.entries) {
        if (!defaultValues(value) || !storedId(value.character) || !storedId(value.catalog)
          || !(data.version === 1 ? ['melee', 'ranged', 'spell'] : ['weapon', 'melee', 'ranged', 'spell']).includes(value.type)) return invalid(true);
        const id = identityKey(value); if (seen.has(id)) return invalid(true); seen.add(id);
        entries.push({ character: value.character, catalog: value.catalog, type: value.type, ability: value.ability, modifier_value: value.modifier_value, proficiency_bonus: value.proficiency_bonus });
      }
      for (const value of data.version === 2 ? data.defaults : []) {
        if (!defaultValues(value) || !storedId(value.character) || !['weapon', 'spell'].includes(value.type)) return invalid(true);
        const id = JSON.stringify([value.character, value.type]); if (seen.has(id)) return invalid(true); seen.add(id);
        defaults.push({ character: value.character, type: value.type, ability: value.ability, modifier_value: value.modifier_value, proficiency_bonus: value.proficiency_bonus });
      }
      return { entries, defaults, valid: true, available: true };
    } catch { return invalid(false); }
  }
  function rowState(current: Binding): RowState | null {
    const control = current.methods.control;
    if (!control || typeof control !== 'object') return null;
    let states = rows.get(control); if (!states) { states = new Map(); rows.set(control, states); }
    let state = states.get(current.id);
    if (!state) {
      if (states.size >= 100) return null;
      const snapshot = JSON.stringify([current.snapshot.modifier_stat, current.snapshot.modifier_value, current.snapshot.proficiency_bonus]);
      state = { consumed: false, edited: snapshot !== rowValues(current), initial: rowValues(current) }; states.set(current.id, state);
    }
    return state;
  }
  const rowValues = (current: Binding): string => JSON.stringify([current.attack.modifier_stat, current.attack.modifier_value, current.attack.proficiency_bonus]);
  const editedEvent = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const editedForm = target.closest('form'); if (!editedForm) return;
    for (const card of pending.keys()) { const current = binding(card); if (current?.form === editedForm) { const state = rowState(current); if (state) state.edited = true; } }
  };
  document.addEventListener('input', editedEvent, true); document.addEventListener('change', editedEvent, true);
  function mountPending(card: HTMLElement, initial: Binding): PendingUI {
    const node = document.createElement('details'); node.setAttribute('data-ff-combat-corrections', ''); node.setAttribute('data-ff-pending-corrections', String(initial.index)); node.setAttribute('data-ff-translation-ignore', 'true');
    const title = document.createElement('summary'), abilityLabel = document.createElement('label'), abilityText = document.createElement('span'), ability = document.createElement('select');
    ability.setAttribute('data-ff-correction-ability', ''); abilityLabel.append(abilityText, ability); node.append(title, abilityLabel);
    const empty = document.createElement('option'); empty.value = ''; empty.disabled = true; ability.append(empty);
    abilities.forEach((stat, i) => { const option = document.createElement('option'); option.value = stat; option.textContent = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'][i]; ability.append(option); });
    const pendingStatus = document.createElement('p'); pendingStatus.setAttribute('role', 'status'); pendingStatus.setAttribute('aria-live', 'polite');
    const total = document.createElement('p'); total.setAttribute('data-ff-correction-to-hit', '');
    const inputs: HTMLInputElement[] = [], texts: HTMLSpanElement[] = [], applyButtons: HTMLButtonElement[] = [], buttons: HTMLButtonElement[] = [];
    const native = (): Binding | null => { const current = binding(card); return current?.id === initial.id && current.methods.control === initial.methods.control ? current : null; };
    const say = (ok: boolean): void => { pendingStatus.textContent = language === 'ru' ? (ok ? 'Применено к этой форме броска.' : 'Поле недоступно или значение некорректно.') : (ok ? 'Applied to this roll form.' : 'This field is unavailable or the value is invalid.'); };
    function apply(id: typeof ids[number], value: unknown): void {
      const current = native(), parsed = pendingNumber(value, id);
      if (!current || !pendingWritable(card, current) || parsed === null) { say(false); return; }
      const state = rowState(current); if (state) state.edited = true;
      try { current.methods.setValue(`attacks.${current.index}.${id}`, parsed, { shouldDirty: true, shouldValidate: true }); refresh(true); say(true); } catch { say(false); }
    }
    ids.forEach(id => {
      const row = document.createElement('div'); row.className = 'ff-correction-row';
      const label = document.createElement('label'), text = document.createElement('span'), edit = document.createElement('input'); text.className = 'ff-pending-correction-label'; edit.type = 'text'; edit.inputMode = 'decimal'; edit.maxLength = 7; edit.setAttribute('data-ff-correction-value', id); texts.push(text); inputs.push(edit); label.append(text, edit); row.append(label);
      const applyButton = button(`apply-${id}`, () => apply(id, edit.value)); applyButtons.push(applyButton); buttons.push(applyButton); row.append(applyButton);
      for (const delta of [-1, 1, 0]) { const quick = button(`${id}-${delta === -1 ? 'minus' : delta === 1 ? 'plus' : 'zero'}`, () => { const value = native()?.attack[id]; apply(id, delta === 0 ? 0 : typeof value === 'number' ? value + delta : NaN); }); quick.textContent = delta === -1 ? '−1' : delta === 1 ? '+1' : '0'; quick.setAttribute('data-ff-correction-delta', String(delta)); quick.setAttribute('data-ff-correction-field', id); buttons.push(quick); row.append(quick); }
      node.append(row);
    });
    ability.addEventListener('change', () => {
      const current = native(), stat = ability.value;
      if (!current || !pendingWritable(card, current) || !abilities.includes(stat)) { say(false); return; }
      const adjusted = (current.character.adjusted_stats as Record<string, { adjusted?: number }> | undefined)?.[stat]?.adjusted;
      const score = adjusted || current.character[stat] || 0;
      const modifier = typeof score === 'number' && Number.isFinite(score) ? pendingNumber(Math.floor((score - 10) / 2), 'modifier_value') : null;
      if (modifier === null) { say(false); return; }
      const state = rowState(current); if (state) state.edited = true;
      try { current.methods.setValue(`attacks.${current.index}.modifier_stat`, stat, { shouldDirty: true, shouldValidate: true }); current.methods.setValue(`attacks.${current.index}.modifier_value`, modifier, { shouldDirty: true, shouldValidate: true }); refresh(true); say(true); } catch { say(false); }
    });
    const feedback = (en: string, ru: string): void => { pendingStatus.textContent = language === 'ru' ? ru : en; };
    function persistDefault(action: 'here' | 'delete' | 'general' | 'overwrite'): void {
      const current = native(), identity = current && attackIdentity(current), stored = readDefaults();
      const character = current && stableId(current.character.id), kind = current && category(current.attack.type!);
      const clear = action === 'delete';
      if (!current || !character || !kind || (action === 'here' || clear) && !identity
        || !clear && (!pendingWritable(card, current) || !defaultValues({ ability: current.attack.modifier_stat, ...current.attack }))) {
        feedback('A valid attack identity and values are required.', 'Нужны корректная атака и значения.'); return;
      }
      if (!stored.available || !stored.valid) { feedback('Local storage is unavailable or invalid. Nothing was saved.', 'Локальное хранилище недоступно или повреждено. Ничего не сохранено.'); return; }
      let next = stored.entries.slice(), defaults = stored.defaults.slice();
      const sameCategory = (value: AttackDefault): boolean => value.character === character && category(value.type) === kind;
      const values = { ability: current.attack.modifier_stat!, modifier_value: current.attack.modifier_value!, proficiency_bonus: current.attack.proficiency_bonus! };
      if (action === 'here' || clear) {
        next = next.filter(value => !(sameCategory(value) && value.catalog === identity!.catalog));
        if (!clear) next.push({ character, catalog: identity!.catalog, type: kind, ...values });
      } else {
        defaults = defaults.filter(value => value.character !== character || value.type !== kind);
        defaults.push({ character, type: kind, ...values });
        if (action === 'overwrite') next = next.filter(value => !sameCategory(value));
      }
      const serialized = JSON.stringify({ version: 2, entries: next, defaults });
      if (next.length + defaults.length > 100 || serialized.length > 32768) { feedback('Saved defaults are full. Clear an unused override first.', 'Хранилище заполнено. Сначала удалите ненужную настройку.'); return; }
      try {
        // One atomic replacement migrates validated v1 and preserves every
        // unrelated scope. The old record remains intact on write failure.
        localStorage.setItem(defaultKey(), serialized);
        rowState(current);
        if (current.methods.control && typeof current.methods.control === 'object') for (const state of rows.get(current.methods.control)?.values() ?? []) state.consumed = true;
        if (clear) feedback('Attack override removed. Future attacks use the category default. Current form unchanged.', 'Настройка атаки удалена. Следующие атаки используют общую настройку. Текущая форма не изменена.');
        else if (action === 'here') feedback('Attack override saved for this character and campaign.', 'Настройка этой атаки сохранена для персонажа в кампании.');
        else feedback(action === 'overwrite' ? 'Category default saved; this category’s attack overrides removed.' : 'Category default saved for future attacks without overrides.', action === 'overwrite' ? 'Общая настройка сохранена; индивидуальные настройки этой категории удалены.' : 'Общая настройка сохранена для следующих атак без индивидуальных настроек.');
      } catch { feedback('Local storage is unavailable. Nothing was saved.', 'Локальное хранилище недоступно. Ничего не сохранено.'); }
    }
    const saveHere = button('save-here', () => persistDefault('here')), clearDefault = button('clear-default', () => persistDefault('delete'));
    const saveDefault = button('save-default', () => persistDefault('general')), overwriteAll = button('overwrite-all', () => persistDefault('overwrite'));
    function autoDefault(current: Binding): void {
      const state = rowState(current); if (!state || state.consumed) return;
      if (state.edited || rowValues(current) !== state.initial) { state.consumed = true; return; }
      const identity = attackIdentity(current), stored = readDefaults();
      if (!identity || !stored.valid || !stored.available) { state.consumed = true; return; }
      const kind = category(identity.type);
      const saved = stored.entries.find(value => value.character === identity.character && value.catalog === identity.catalog && value.type === kind)
        ?? stored.entries.find(value => identityKey(value) === identityKey(identity))
        ?? stored.defaults.find(value => value.character === identity.character && value.type === kind);
      if (!saved) { state.consumed = true; return; }
      try {
        if (typeof current.methods.getFieldState !== 'function') { state.consumed = true; return; }
        for (const leaf of ['modifier_stat', ...ids, ...(['normal', 'advantage', 'disadvantage'].includes(current.attack.attack_roll_type ?? '') ? ['attack_roll_type'] : [])]) { const field = current.methods.getFieldState(`attacks.${current.index}.${leaf}`); if (field?.isDirty !== false || field.isTouched !== false) { state.consumed = true; return; } }
        if (!pendingWritable(card, current)) return;
        state.consumed = true;
        current.methods.setValue(`attacks.${current.index}.modifier_stat`, saved.ability, { shouldDirty: true, shouldValidate: true });
        for (const id of ids) current.methods.setValue(`attacks.${current.index}.${id}`, saved[id], { shouldDirty: true, shouldValidate: true });
        feedback('Saved attack default applied.', 'Сохранённая настройка атаки применена.');
      } catch { state.consumed = true; feedback('Saved default could not be applied.', 'Не удалось применить сохранённую настройку.'); }
    }
    const rollModes = ['normal', 'advantage', 'disadvantage'];
    const modeLabel = document.createElement('label'), modeText = document.createElement('span'), rollMode = document.createElement('select');
    rollMode.setAttribute('data-ff-correction-roll-mode', ''); modeLabel.append(modeText, rollMode);
    for (const value of rollModes) { const option = document.createElement('option'); option.value = value; rollMode.append(option); }
    rollMode.addEventListener('change', () => {
      const current = native(), value = rollMode.value;
      if (!current || !pendingWritable(card, current) || !rollModes.includes(current.attack.attack_roll_type ?? '')
        || !rollModes.includes(current.snapshot.attack_roll_type ?? '') || !rollModes.includes(value)) { say(false); return; }
      const state = rowState(current); if (state) state.edited = true;
      try { current.methods.setValue(`attacks.${current.index}.attack_roll_type`, value, { shouldDirty: true, shouldValidate: true }); refresh(); say(true); } catch { say(false); }
    });
    node.append(modeLabel);
    node.append(saveHere, clearDefault, saveDefault, overwriteAll, total, pendingStatus);
    node.addEventListener('click', event => event.stopPropagation());
    node.addEventListener('keydown', event => { event.stopPropagation(); if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); });
    const last: unknown[] = [];
    function refresh(force = false): void {
      const current = native(); if (current) autoDefault(current);
      const disabled = !current || !pendingWritable(card, current);
      saveHere.textContent = language === 'ru' ? 'Сохранить здесь' : 'Save here'; clearDefault.textContent = language === 'ru' ? 'Удалить настройку' : 'Delete here';
      saveDefault.textContent = language === 'ru' ? 'Сохранить по умолчанию' : 'Save default'; overwriteAll.textContent = language === 'ru' ? 'Перезаписать всё' : 'Overwrite all';
      const identity = current && attackIdentity(current); saveHere.disabled = disabled || !identity; clearDefault.disabled = !identity; saveDefault.disabled = overwriteAll.disabled = disabled || !current || !stableId(current.character.id);
      modeLabel.hidden = !current || !rollModes.includes(current.attack.attack_roll_type ?? '') || !rollModes.includes(current.snapshot.attack_roll_type ?? '');
      rollMode.disabled = disabled || modeLabel.hidden; modeText.textContent = language === 'ru' ? 'Тип броска' : 'Roll mode';
      Array.from(rollMode.options).forEach((option, i) => option.textContent = language === 'ru' ? ['Обычный', 'Преимущество', 'Помеха'][i] : ['Normal', 'Advantage', 'Disadvantage'][i]);
      if (current && !modeLabel.hidden) rollMode.value = current.attack.attack_roll_type!;
      title.textContent = language === 'ru' ? 'Поправки к броску' : 'Roll corrections'; abilityText.textContent = language === 'ru' ? 'Характеристика' : 'Ability'; empty.textContent = '—';
      texts.forEach((text, i) => text.textContent = language === 'ru' ? (i === 0 ? 'Модификатор' : 'Бонус умения') : (i === 0 ? 'Modifier' : 'Proficiency bonus')); applyButtons.forEach(b => b.textContent = language === 'ru' ? 'Применить' : 'Apply');
      Array.from(ability.options).slice(1).forEach((option, i) => option.textContent = language === 'ru' ? ['СИЛ — Сила', 'ЛОВ — Ловкость', 'ТЕЛ — Телосложение', 'ИНТ — Интеллект', 'МДР — Мудрость', 'ХАР — Харизма'][i] : ['STR — Strength', 'DEX — Dexterity', 'CON — Constitution', 'INT — Intelligence', 'WIS — Wisdom', 'CHA — Charisma'][i]);
      ability.disabled = disabled; if (current && (force || document.activeElement !== ability)) ability.value = current.attack.modifier_stat ?? '';
      inputs.forEach((edit, i) => { edit.disabled = disabled; const value = current?.attack[ids[i]]; if (force || last[i] !== value && document.activeElement !== edit) edit.value = value === undefined ? '' : String(value); last[i] = value; }); buttons.forEach(b => b.disabled = disabled);
      for (const quick of node.querySelectorAll<HTMLButtonElement>('[data-ff-correction-delta]')) {
        const delta = Number(quick.getAttribute('data-ff-correction-delta')), label = texts[quick.getAttribute('data-ff-correction-field') === 'modifier_value' ? 0 : 1].textContent;
        quick.setAttribute('aria-label', `${label}: ${language === 'ru' ? (delta === 0 ? 'сбросить на 0' : delta > 0 ? 'увеличить на 1' : 'уменьшить на 1') : (delta === 0 ? 'reset to 0' : delta > 0 ? 'increase by 1' : 'decrease by 1')}`);
      }
      const sum = Number(current?.attack.modifier_value) + Number(current?.attack.proficiency_bonus); total.textContent = `${language === 'ru' ? 'К попаданию' : 'To Hit'}: ${Number.isFinite(sum) ? (sum >= 0 ? '+' : '') + sum : '—'}`;
      node.setAttribute('data-ff-pending-corrections', String(current?.index ?? initial.index));
    }
    card.append(node); refresh(true); return { node, control: initial.methods.control, id: initial.id, refresh };
  }
  function scanPending(dock: HTMLElement | null): void {
    const seen = new Set<HTMLElement>();
    for (const card of dock?.querySelectorAll<HTMLElement>('form div.clickable') ?? []) {
      if (card.closest('[data-ff-combat-corrections]')) continue;
      const current = binding(card); if (!current) continue;
      seen.add(card); if (!pending.has(card) || !pending.get(card)!.node.isConnected || pending.get(card)!.id !== current.id || pending.get(card)!.control !== current.methods.control) { pending.get(card)?.node.remove(); pending.set(card, mountPending(card, current)); } else pending.get(card)!.refresh();
    }
    for (const [card, item] of pending) if (!seen.has(card)) { item.node.remove(); pending.delete(card); }
  }
  function unmount(): void { customModeLabel.hidden = true; ui.remove(); ui.open = false; fields = []; form = null; panel = null; status.textContent = ''; }
  function scan(): void {
    frame = 0; if (disposed) return;
    const nextRoute = location.pathname + location.search;
    if (route !== nextRoute) { unmount(); route = nextRoute; campaign = location.pathname.replace(/\/play\/?$/, ''); presets = read(); options(); }
    const search = new URLSearchParams(location.search);
    const play = /\/play\/?$/.test(location.pathname) && (!search.has('view') || search.get('view') === 'play');
    const dock = play ? document.querySelector<HTMLElement>('[data-ff-combat-docked]') : null;
    scanPending(dock); refreshCheckMode(dock);
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
    fields.forEach((field, i) => { const disabled = !writable(field); edits[i].disabled = disabled; for (const b of ui.querySelectorAll<HTMLButtonElement>(`.ff-correction-row:nth-of-type(${i + 1}) button`)) b.disabled = disabled; });
    load.disabled = fields.some(f => !writable(f)); refreshCustomMode();
  }
  function schedule(): void { if (!frame && !disposed) frame = requestAnimationFrame(scan); }
  const observer = new MutationObserver(records => { if (records.some(record => !(record.target instanceof Element ? record.target : record.target.parentElement)?.closest('[data-ff-combat-corrections]'))) schedule(); });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ff-combat-docked', 'disabled', 'readonly', 'id', 'type', 'inputmode', 'aria-disabled', 'data-disabled', 'hidden', 'aria-hidden', 'style', 'class'] });
  const timer = window.setInterval(schedule, 500); window.addEventListener('popstate', schedule);
  host[key] = { update(value) { language = value; translate(); refreshCustomMode(); for (const item of pending.values()) item.refresh(); schedule(); }, dispose() { disposed = true; observer.disconnect(); clearInterval(timer); cancelAnimationFrame(frame); window.removeEventListener('popstate', schedule); checkUI.remove(); document.removeEventListener('input', editedEvent, true); document.removeEventListener('change', editedEvent, true); unmount(); for (const item of pending.values()) item.node.remove(); pending.clear(); style.remove(); delete host[key]; } };
  translate(); scan();
}
