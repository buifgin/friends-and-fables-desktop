type RichNode = { type: string; text?: string; marks?: { type: string; [key: string]: unknown }[]; content?: RichNode[]; [key: string]: unknown };
type FormattedCommand = { command: 'me' | 'gm'; document: RichNode | null };

// Operate on editor JSON so literal text, mentions, links, and formatting remain structured.
export function formatMessageCommand(document: RichNode): FormattedCommand | null {
  const first = document?.content?.[0]?.content?.[0];
  if (document?.type !== 'doc' || document.content?.[0]?.type !== 'paragraph' || first?.type !== 'text' || typeof first.text !== 'string') return null;
  const prefix = /^\/(me|gm)(?:[ \t]+|$)/i.exec(first.text);
  if (!prefix) return null;
  const command = prefix[1].toLowerCase() as 'me' | 'gm';
  const copy: RichNode = JSON.parse(JSON.stringify(document));
  const paragraph = copy.content![0];
  paragraph.content![0].text = paragraph.content![0].text!.slice(prefix[0].length);
  if (!paragraph.content![0].text) paragraph.content!.shift();
  if (!paragraph.content!.length && copy.content!.length > 1) copy.content!.shift();
  function hasBody(node: RichNode): boolean {
    return (node.type === 'text' && !!node.text?.trim()) || node.type === 'mention' || !!node.content?.some(hasBody);
  }
  if (!hasBody(copy)) return { command, document: null };
  if (command === 'me') {
    function italic(node: RichNode): void {
      if (node.type === 'codeBlock') return;
      if (node.type === 'text' && !node.marks?.some(mark => mark.type === 'code' || mark.type === 'italic')) node.marks = [...(node.marks ?? []), { type: 'italic' }];
      node.content?.forEach(italic);
    }
    italic(copy);
  } else {
    let start = copy.content![0], end = copy.content!.at(-1)!;
    if (start.type !== 'paragraph') { start = { type: 'paragraph', content: [] }; copy.content!.unshift(start); }
    if (end.type !== 'paragraph') { end = { type: 'paragraph', content: [] }; copy.content!.push(end); }
    (start.content ??= []).unshift({ type: 'text', text: '#' });
    (end.content ??= []).push({ type: 'text', text: '#' });
  }
  return { command, document: copy };
}

// Serialized into the ordinary website renderer, without a preload or application IPC.
export function configureMessageCommands(enabled: boolean, locale: 'en' | 'ru', format: typeof formatMessageCommand): void {
  type Editor = { isDestroyed?: boolean; view: { dom: HTMLElement }; getJSON(): RichNode;
    commands: { setContent(value: RichNode, options: { emitUpdate: boolean }): boolean; focus(position: 'end'): boolean } };
  type Entry = { root: HTMLElement; editorElement: HTMLElement; controls: HTMLElement; button: HTMLButtonElement; status: HTMLElement; note: 'ready' | 'empty' | 'unavailable' | null; blockEnter: boolean };
  const key = '__friendsFablesDesktopCommands';
  const host = window as unknown as Record<string, { dispose(): void; setLocale(value: 'en' | 'ru'): void } | undefined>;
  if (host[key]) { if (enabled) host[key]!.setLocale(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  let language = locale, frame = 0;
  const entries = new Map<HTMLElement, Entry>();
  const text = (en: string, ru: string): string => language === 'ru' ? ru : en;
  function editorFor(element: HTMLElement): Editor | null {
    type Fiber = { memoizedProps?: { editor?: Editor }; return?: Fiber };
    for (let parent: HTMLElement | null = element, depth = 0; parent && depth < 8; parent = parent.parentElement, depth++) {
      const fiberKey = Object.keys(parent).find(name => name.startsWith('__reactFiber$'));
      let fiber = fiberKey ? (parent as unknown as Record<string, Fiber>)[fiberKey] : undefined;
      for (let count = 0; fiber && count < 30; count++, fiber = fiber.return) {
        const editor = fiber.memoizedProps?.editor;
        if (editor && !editor.isDestroyed && editor.view?.dom === element && typeof editor.getJSON === 'function' && typeof editor.commands?.setContent === 'function') return editor;
      }
    }
    return null;
  }
  function hasCommand(entry: Entry): boolean {
    const first = editorFor(entry.editorElement)?.getJSON()?.content?.[0]?.content?.[0];
    return first?.type === 'text' && typeof first.text === 'string' && /^\/(me|gm)(?:[ \t]+|$)/i.test(first.text);
  }
  function render(entry: Entry): void {
    const active = hasCommand(entry);
    entry.button.textContent = text('Format command', 'Оформить команду');
    entry.button.hidden = !active;
    entry.status.textContent = entry.note === 'ready' ? text('Formatted. Review and send normally.', 'Текст оформлен. Проверьте его и отправьте обычным способом.')
      : entry.note === 'empty' ? text('Add text after the command.', 'Добавьте текст после команды.')
      : entry.note === 'unavailable' ? text('Could not format this draft. Use the editor controls.', 'Не удалось оформить текст. Используйте кнопки редактора.') : text('/me: italic text · /gm: #text#', '/me: курсив · /gm: #текст#');
    entry.controls.hidden = !active && !entry.note;
  }
  function prepare(entry: Entry): boolean {
    const editor = editorFor(entry.editorElement);
    if (!editor) return false;
    const result = format(editor.getJSON());
    if (!result) return false;
    if (!result.document) entry.note = 'empty';
    else {
      try {
        if (editor.commands.setContent(result.document, { emitUpdate: true })) { editor.commands.focus('end'); entry.note = 'ready'; }
        else entry.note = 'unavailable';
      } catch { entry.note = 'unavailable'; }
    }
    render(entry);
    return true;
  }
  function add(root: HTMLElement, editorElement: HTMLElement): void {
    const controls = document.createElement('div'); controls.setAttribute('data-ff-desktop-command-controls', 'true'); controls.setAttribute('translate', 'no');
    controls.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 8px;font:12px system-ui;grid-column:1/-1';
    const button = document.createElement('button'); button.type = 'button'; button.style.cssText = 'font:inherit;padding:4px 8px;border:1px solid currentColor;border-radius:5px;background:transparent;color:inherit;cursor:pointer';
    const status = document.createElement('span'); status.setAttribute('role', 'status'); controls.append(button, status);
    const entry: Entry = { root, editorElement, controls, button, status, note: null, blockEnter: false };
    entries.set(root, entry); root.append(controls);
    button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); prepare(entry); });
    render(entry);
  }
  function scan(): void {
    frame = 0;
    const view = new URLSearchParams(location.search).get('view'), found = new Map<HTMLElement, HTMLElement>();
    if (/\/play\/?$/.test(location.pathname) && (!view || view === 'play')) {
      for (const element of document.querySelectorAll<HTMLElement>('.tiptap[contenteditable="true"]')) {
        if (element.closest('form,[role="dialog"],[class~="bottom-full"]')) continue;
        const root = element.closest<HTMLElement>('.grid.relative');
        if (root?.querySelector('#working-context-bar-spacer') && editorFor(element)) found.set(root, element);
      }
    }
    for (const [root, entry] of entries) {
      if (found.get(root) !== entry.editorElement) { entry.controls.remove(); entries.delete(root); }
      else { if (!root.contains(entry.controls)) root.append(entry.controls); render(entry); }
    }
    for (const [root, element] of found) if (!entries.has(root)) add(root, element);
  }
  function schedule(records?: MutationRecord[]): void {
    if (records && records.every(record => (record.target instanceof Element ? record.target : record.target.parentElement)?.closest('[data-ff-desktop-command-controls]'))) return;
    if (!frame) frame = requestAnimationFrame(scan);
  }
  function entryFor(target: EventTarget | null): Entry | undefined {
    if (!(target instanceof Element)) return;
    for (const entry of entries.values()) if (entry.root.contains(target)) return entry;
  }
  function onInput(event: Event): void { const entry = entryFor(event.target); if (entry && entry.editorElement.contains(event.target as Node)) { entry.note = null; render(entry); } }
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    const entry = entryFor(event.target);
    if (!entry || !entry.editorElement.contains(event.target as Node)) return;
    if (entry.blockEnter || prepare(entry)) { entry.blockEnter = true; event.preventDefault(); event.stopImmediatePropagation(); }
  }
  function onKeyUp(event: KeyboardEvent): void { if (event.key === 'Enter') for (const entry of entries.values()) entry.blockEnter = false; }
  function onClick(event: MouseEvent): void {
    const button = event.target instanceof Element ? event.target.closest('button[id="send"],button[aria-label="Send message"],button[aria-label="Send message (V2)"]') : null;
    const entry = entryFor(button);
    if (button && entry && prepare(entry)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class','contenteditable'] });
  const onNavigation = (): void => schedule();
  document.addEventListener('input', onInput, true); document.addEventListener('keydown', onKeyDown, true); document.addEventListener('keyup', onKeyUp, true); document.addEventListener('click', onClick, true); window.addEventListener('popstate', onNavigation);
  host[key] = {
    setLocale(value) { language = value; for (const entry of entries.values()) render(entry); },
    dispose() {
      observer.disconnect(); cancelAnimationFrame(frame);
      document.removeEventListener('input', onInput, true); document.removeEventListener('keydown', onKeyDown, true); document.removeEventListener('keyup', onKeyUp, true); document.removeEventListener('click', onClick, true); window.removeEventListener('popstate', onNavigation);
      for (const entry of entries.values()) entry.controls.remove(); entries.clear(); delete host[key];
    },
  };
  scan();
}
