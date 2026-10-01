type RichNode = { type: string; text?: string; marks?: { type: string; [key: string]: unknown }[]; content?: RichNode[]; [key: string]: unknown };
type FormattedCommand = { command: 'me' | 'gm' | null; invalid?: boolean; document: RichNode | null; lineEnd?: number };

// Operate on editor JSON so literal text, mentions, links, and formatting remain structured.
export function formatMessageCommand(document: RichNode, position?: number): FormattedCommand | null {
  if (document?.type !== 'doc') return null;
  const copy: RichNode = JSON.parse(JSON.stringify(document));
  let command: 'me' | 'gm' | undefined, changed = false, invalid = false, lineEnd: number | undefined;
  const size = (node: RichNode): number => node.type === 'text' ? node.text?.length ?? 0 : node.content || ['paragraph','heading','codeBlock','blockquote','bulletList','orderedList','listItem'].includes(node.type) ? 2 + (node.content ?? []).reduce((sum, child) => sum + size(child), 0) : 1;
  function visit(node: RichNode, start: number): void {
    if (node.type === 'codeBlock') return;
    if (node.type === 'paragraph') {
      const output: RichNode[] = []; let line: RichNode[] = [], originalStart = start + 1, outputStart = start + 1;
      function finish(): void {
        const length = line.reduce((sum, child) => sum + size(child), 0);
        const selected=position === undefined || position >= originalStart && position <= originalStart + length;
        if (position===undefined) for (const child of line) if (child.type==='text' && !child.marks?.some(mark=>mark.type==='code') && child.text?.includes('№')) { child.text=child.text.replaceAll('№','#'); changed=true; }
        let leading = '';
        for (const child of line) { if (child.type !== 'text') break; leading += child.text ?? ''; }
        const prefix = /^\/(me|gm)(?:[ \t]+|$)/i.exec(leading);
        if (prefix && selected) {
          command ??= prefix[1].toLowerCase() as 'me' | 'gm';
          const body = line.map(child => child.type === 'text' ? child.text : child.type === 'hardBreak' ? '' : 'x').join('').slice(prefix[0].length);
          if (!body.trim()) invalid=true;
          if (body.trim()) {
            let remaining = prefix[0].length;
            while (remaining > 0 && line[0]?.type === 'text') {
              const first = line[0], removed = Math.min(remaining, first.text!.length);
              first.text = first.text!.slice(removed); remaining -= removed; if (!first.text) line.shift();
            }
            if (prefix[1].toLowerCase() === 'me') {
              for (const child of line) if (child.type === 'text' && !child.marks?.some(mark => mark.type === 'code' || mark.type === 'italic')) child.marks = [...(child.marks ?? []), { type: 'italic' }];
            } else { line.unshift({ type: 'text', text: '#' }); line.push({ type: 'text', text: '#' }); }
            changed = true; lineEnd = outputStart + line.reduce((sum, child) => sum + size(child), 0);
          }
        }
        output.push(...line); outputStart += line.reduce((sum, child) => sum + size(child), 0) + 1; originalStart += length + 1; line = [];
      }
      for (const child of node.content ?? []) { if (child.type === 'hardBreak') { finish(); output.push(child); } else line.push(child); }
      finish(); node.content = output;
      return;
    }
    let offset = node.type === 'doc' ? 0 : start + 1;
    for (const child of node.content ?? []) { const originalSize = size(child); visit(child, offset); offset += originalSize; }
  }
  visit(copy, 0);
  return command || changed ? { command:command??null, invalid, document: changed ? copy : null, lineEnd } : null;
}

// Serialized into the ordinary website renderer, without a preload or application IPC.
export function configureMessageCommands(enabled: boolean, locale: 'en' | 'ru', format: typeof formatMessageCommand): void {
  type Editor = { isDestroyed?: boolean; view: { dom: HTMLElement }; state: { selection: { from: number }; doc: { nodeAt(position: number): { type: { name: string } } | null } }; getJSON(): RichNode;
    commands: { setContent(value: RichNode, options: { emitUpdate: boolean }): boolean; focus(position?: 'end'): boolean;
      setTextSelection(position: number): boolean; splitBlock(options: { keepMarks: boolean }): boolean; setHardBreak(): boolean;
      deleteRange(range: { from: number; to: number }): boolean; unsetAllMarks(): boolean;
      command(action: (context: { tr: { setStoredMarks(marks: []): unknown } }) => boolean): boolean } };
  type Entry = { root: HTMLElement; editorElement: HTMLElement; controls: HTMLElement; button: HTMLButtonElement; status: HTMLElement; note: 'ready' | 'empty' | 'unavailable' | null; blockEnter: boolean; pending: boolean; sequence: number; bypass: HTMLButtonElement | null };
  const key = '__friendsFablesDesktopCommands';
  const host = window as unknown as Record<string, { dispose(): void; setLocale(value: 'en' | 'ru'): void } | undefined>;
  if (host[key]) { if (enabled) host[key]!.setLocale(locale); else host[key]!.dispose(); return; }
  if (!enabled) return;
  let language = locale, frame = 0, disposed=false;
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
    const editor = editorFor(entry.editorElement);
    return !!editor && !!format(editor.getJSON());
  }
  function render(entry: Entry): void {
    const active = hasCommand(entry);
    entry.button.textContent = text('Format command', 'Оформить команду');
    entry.button.hidden = !active;
    entry.status.textContent = entry.note === 'ready' ? text('Draft formatted. Enter checks and sends it.', 'Текст оформлен. Enter проверяет и отправляет сообщение.')
      : entry.note === 'empty' ? text('Add text after the command.', 'Добавьте текст после команды.')
      : entry.note === 'unavailable' ? text('Could not format this draft. Use the editor controls.', 'Не удалось оформить текст. Используйте кнопки редактора.') : text('/me: italic text · /gm: #text#', '/me: курсив · /gm: #текст#');
    entry.controls.hidden = !active && !entry.note;
    entry.controls.style.display = entry.controls.hidden ? 'none' : 'flex';
  }
  function prepare(entry: Entry, newline?: 'paragraph' | 'soft' | 'none'): boolean {
    const editor = editorFor(entry.editorElement);
    if (!editor) return false;
    const result = format(editor.getJSON(), newline ? editor.state.selection.from : undefined);
    if (!result) return false;
    if (result.invalid) entry.note = 'empty';
    else if (!result.document) return false;
    else {
      try {
        if (editor.commands.setContent(result.document, { emitUpdate: true })) {
          if (newline && newline !== 'none' && result.lineEnd !== undefined) {
            const end=result.lineEnd, existingBreak=editor.state.doc.nodeAt(end)?.type.name==='hardBreak';
            editor.commands.setTextSelection(end);
            editor.commands.command(({tr})=>{tr.setStoredMarks([]);return true;});
            if (newline === 'soft') {
              if (existingBreak) editor.commands.setTextSelection(end+1);
              else editor.commands.setHardBreak();
            } else {
              if (existingBreak) editor.commands.deleteRange({from:end,to:end+1});
              editor.commands.splitBlock({ keepMarks: false });
            }
            editor.commands.command(({tr})=>{tr.setStoredMarks([]);return true;}); editor.commands.focus();
          } else editor.commands.focus('end');
          entry.note = 'ready';
        }
        else entry.note = 'unavailable';
      } catch { entry.note = 'unavailable'; }
    }
    render(entry);
    return true;
  }
  function add(root: HTMLElement, editorElement: HTMLElement): void {
    const controls = document.createElement('div'); controls.setAttribute('data-ff-desktop-command-controls', 'true'); controls.setAttribute('translate', 'no');
    controls.style.cssText = 'display:flex;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;gap:10px;padding:4px 8px;font:12px system-ui;grid-column:1/-1;width:100%;box-sizing:border-box';
    const button = document.createElement('button'); button.type = 'button'; button.style.cssText = 'font:inherit;padding:4px 8px;border:1px solid currentColor;border-radius:5px;background:transparent;color:inherit;cursor:pointer';
    const status = document.createElement('span'); status.setAttribute('role', 'status'); controls.append(button, status);
    const entry: Entry = { root, editorElement, controls, button, status, note: null, blockEnter: false, pending:false, sequence:0, bypass:null };
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
  function onInput(event: Event): void { const entry = entryFor(event.target); if (entry && entry.editorElement.contains(event.target as Node)) { entry.note = null; entry.pending=false; entry.sequence++; render(entry); } }
  const sendSelector='button[id="send"],button[aria-label="Send message"],button[aria-label="Send message (V2)"],button[aria-label="Отправить сообщение"]';
  function submit(entry: Entry): void {
    if (entry.pending) return;
    const editor=editorFor(entry.editorElement);
    if (!editor) { entry.note='unavailable'; render(entry); return; }
    const source=editor.getJSON(), result=format(source);
    const hasContent=(node:RichNode):boolean=>!!node.text?.trim() || node.type==='mention' || !!node.content?.some(hasContent);
    if (!hasContent(source) || result?.invalid) { entry.note='empty'; render(entry); return; }
    try {
      if (result?.document && !editor.commands.setContent(result.document,{emitUpdate:true})) throw new Error('Editor refused the draft.');
      // Round-trip through the editor schema, then check that no command remains
      // unformatted. The JSON comparison below also detects edits while queued.
      const expected=JSON.stringify(editor.getJSON()), check=format(editor.getJSON());
      if (check?.invalid || check?.document) throw new Error('Draft formatting did not complete.');
      entry.pending=true;const sequence=++entry.sequence, route=location.href;
      // React commits its draft state after Tiptap emits the update. Use the
      // site's normal Send button after a task boundary and a frame interval.
      // A timer also settles hidden/minimized windows where animation frames pause.
      setTimeout(()=>{
        if (sequence!==entry.sequence) return;
        entry.pending=false;
        if (disposed || location.href!==route || entries.get(entry.root)!==entry || !entry.root.isConnected || editorFor(entry.editorElement)!==editor
          || JSON.stringify(editor.getJSON())!==expected) return;
        const send=entry.root.querySelector<HTMLButtonElement>(sendSelector);
        if (!send || send.disabled) {entry.note='unavailable';render(entry);return;}
        entry.bypass=send;
        try { send.click(); } finally { entry.bypass=null; }
      },16);
    } catch {entry.note='unavailable';render(entry);}
  }
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing) return;
    const entry = entryFor(event.target);
    if (!entry || !entry.editorElement.contains(event.target as Node)) return;
    if (event.shiftKey && !entry.blockEnter && !event.repeat) {
      if (!prepare(entry,'soft')) return;
    } else if (!entry.blockEnter && !event.repeat) submit(entry);
    entry.blockEnter=true;event.preventDefault();event.stopImmediatePropagation();
  }
  function onKeyUp(event: KeyboardEvent): void { if (event.key === 'Enter') for (const entry of entries.values()) entry.blockEnter = false; }
  function onClick(event: MouseEvent): void {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(sendSelector) : null;
    const entry = entryFor(button);
    if (button && entry && entry.bypass!==button) { event.preventDefault(); event.stopImmediatePropagation(); submit(entry); }
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class','contenteditable'] });
  const onNavigation = (): void => schedule();
  document.addEventListener('input', onInput, true); document.addEventListener('keydown', onKeyDown, true); document.addEventListener('keyup', onKeyUp, true); document.addEventListener('click', onClick, true); window.addEventListener('popstate', onNavigation);
  host[key] = {
    setLocale(value) { language = value; for (const entry of entries.values()) render(entry); },
    dispose() {
      disposed=true;observer.disconnect(); cancelAnimationFrame(frame);
      document.removeEventListener('input', onInput, true); document.removeEventListener('keydown', onKeyDown, true); document.removeEventListener('keyup', onKeyUp, true); document.removeEventListener('click', onClick, true); window.removeEventListener('popstate', onNavigation);
      for (const entry of entries.values()) entry.controls.remove(); entries.clear(); delete host[key];
    },
  };
  scan();
}
