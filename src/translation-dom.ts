// Serialized into the website. This function has ordinary DOM access only:
// no preload, IPC, network requests, or Electron APIs are exposed to the page.
export function installTranslationDom(token: string, dictionary: Record<string, string>, descriptions: boolean, names: string[], local: (text: string, dictionary: Record<string,string>) => string | undefined): void {
  type Entry = { id: number; node: Text | Attr; original: string; rendered: string | null; version: number; due: number; waiting: boolean; complete?: boolean; fragments?: boolean; pending?: {start:number;end:number}[] };
  type Result = { id: number; version: number; text: string | null; complete: boolean; retry?: boolean; pending?: {start:number;end:number}[] };
  type Controller = { collect(): unknown; retry(): void; finish(token: string, results: Result[]): void; dispose(): void };
  const key = '__friendsFablesDesktopTranslation';
  const host = window as unknown as Record<string, Controller | undefined>;
  host[key]?.dispose();
  const entries = new Map<number, Entry>();
  const nodes = new WeakMap<Text | Attr, Entry>();
  const roots = new Set<Node>([document.body]);
  const protectedSelector = 'script,style,noscript,template,svg,math,textarea,input,select,option,code,pre,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[data-ff-translation-ignore]';
  const sensitiveForm = 'form:has(input[type="password"]),form:has(input[type="email"])';
  const highlightName='ff-desktop-untranslated';
  const oldHighlight=CSS.highlights.get(highlightName);
  const memo = new Map<string,string>();
  const marked = new Map<Element,string|null>();
  let completed=0;
  const status=document.createElement('div');status.setAttribute('data-ff-translation-status','true');status.setAttribute('data-ff-translation-ignore','true');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483000;display:none;align-items:center;gap:8px;padding:7px 10px;border:1px solid hsl(var(--border,0 0% 40%));border-radius:8px;background:hsl(var(--background,0 0% 8%));color:hsl(var(--foreground,0 0% 96%));box-shadow:0 2px 8px #0004;font:12px system-ui;pointer-events:none';
  const spinner=document.createElement('span');spinner.textContent='↻';spinner.setAttribute('aria-hidden','true');spinner.style.cssText='display:inline-block;animation:ff-translation-spin 1s linear infinite';
  const label=document.createElement('span');status.append(spinner,label);
  const style=document.createElement('style');style.setAttribute('data-ff-translation-ignore','true');style.textContent='@keyframes ff-translation-spin{to{transform:rotate(360deg)}} ::highlight(ff-desktop-untranslated){text-decoration:underline dotted;text-underline-offset:.2em} @media(prefers-reduced-motion:reduce){[data-ff-translation-status] span{animation:none!important}}';
  document.body.append(style,status);
  const read = (node: Text | Attr): string => node instanceof Attr ? node.value : node.data;
  const write = (node: Text | Attr, text: string): void => { if(node instanceof Attr) node.value=text; else node.data=text; };
  const parent = (node: Text | Attr): Element | null => node instanceof Attr ? node.ownerElement : node.parentElement;
  let next = 0, timer: ReturnType<typeof setTimeout> | undefined;
  function eligible(node: Text | Attr): boolean {
    const element = parent(node);
    // Friends & Fables disables browser translation on its entire document.
    // The user's app toggle overrides that page-wide flag. Local exclusions
    // (names, editors, individual blocks) still protect their original text.
    const exclusion = element?.closest('[translate="no"],.notranslate');
    const editorPlaceholder=node instanceof Attr && ['placeholder','data-placeholder'].includes(node.name) && !!element?.closest('[contenteditable]');
    return !!element && element.isConnected && (node instanceof Attr
      ? !element.closest('[data-ff-translation-ignore]') && !element.matches('input[type="password"],input[type="email"]')
      : !element.closest(protectedSelector))
      && (!exclusion || exclusion === document.documentElement || exclusion === document.body || editorPlaceholder)
      && !element.closest('[hidden]') && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== 'hidden';
  }
  function restore(entry: Entry): void {
    if (entry.rendered !== null && read(entry.node) === entry.rendered) write(entry.node, entry.original);
    entries.delete(entry.id); nodes.delete(entry.node);
  }
  function updateStatus(): void {
    const pending=[...entries.values()].filter(entry=>!entry.complete && (entry.waiting || entry.due<=performance.now()) && eligible(entry.node));
    const parents=new Set(pending.filter(entry=>entry.node instanceof Text).map(entry=>parent(entry.node)!));
    for(const [element,value] of marked) if(!parents.has(element)) { if(value===null) element.removeAttribute('data-ff-translation-pending'); else element.setAttribute('data-ff-translation-pending',value); marked.delete(element); }
    for(const element of parents) if(!marked.has(element)) { marked.set(element,element.getAttribute('data-ff-translation-pending')); element.setAttribute('data-ff-translation-pending','true'); }
    const ranges: Range[]=[];
    for (const entry of pending) if (entry.node instanceof Text) for (const span of entry.pending??[]) {
      if (span.start<0 || span.end>entry.node.length || span.end<=span.start) continue;
      const range=new Range(); range.setStart(entry.node,span.start); range.setEnd(entry.node,span.end); ranges.push(range);
    }
    CSS.highlights.set(highlightName,new Highlight(...ranges));
    status.style.display=pending.length?'flex':'none';
    const text=`Перевод: ${completed} / ${completed+pending.length}`;if(label.textContent!==text) label.textContent=text;
    if(!pending.length) completed=0;
  }
  // React renders these labels as adjacent text nodes. Translate the complete
  // grammatical unit without replacing nodes, comments, or numeric counters.
  // The whitelist keeps this treatment away from narration and user names.
  function examineFragments(element: Element): boolean {
    const parts = [...element.childNodes].filter((node): node is Text => node instanceof Text);
    const reset = (): false => { for (const node of parts) { const entry=nodes.get(node); if(entry?.fragments) restore(entry); } return false; };
    if (element.childElementCount || parts.length < 2 || parts.length > 12) return reset();
    const originals = parts.map(node => { const entry=nodes.get(node); return entry && read(node)===entry.rendered ? entry.original : read(node); });
    const source = originals.join('');
    if (source.length > 512 || !/^(?:\s*(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Modifier\s*|\s*Level\s+\d+\s+spell slot\s+(?:consumed|restored)[.!]?\s*|\s*Custom Instructions\s*\(\s*\d+\s*\/\s*\d+\s*\)\s*|\s*Battle lasted\s+\d+\s+turns?[.!]?\s*|\s*\(\s*\d+\s+characters? remaining\s*\)\s*|\s*(?:\(\s*)?\d+\s+active\s*[,/]\s*\d+\s+idle\s*\)?\s*|\s*General Feat\s*|\s*Configure\s+(?:Flat Adjustment|Override|Modifier)\s*)$/i.test(source)
      || names.some(name => [source,...originals].some(value=>value.trim().toLowerCase()===name.toLowerCase()))
      || parts.some(node=>!eligible(node)) || entries.size + parts.filter(node=>!nodes.has(node)).length > 4000) return reset();
    const translated = local(source,dictionary);
    if (translated === undefined) return reset();
    const rendered = parts.map(()=>'');
    let start=0, offset=0;
    for (let i=0;i<parts.length;i++) {
      if (!/^\d+$/.test(originals[i])) continue;
      const at=translated.indexOf(originals[i],offset);
      if (at<0 || i===start && at!==offset) return reset();
      if (i>start) rendered[start]=translated.slice(offset,at);
      rendered[i]=originals[i]; offset=at+originals[i].length; start=i+1;
    }
    if (start<parts.length) rendered[start]=translated.slice(offset);
    else if (offset!==translated.length) return reset();
    for (let i=0;i<parts.length;i++) {
      const node=parts[i]; let entry=nodes.get(node);
      if (entry?.fragments && entry.original===originals[i] && entry.rendered===rendered[i] && read(node)===rendered[i]) continue;
      if (!entry) { entry={id:++next,node,original:originals[i],rendered:null,version:0,due:0,waiting:false}; entries.set(entry.id,entry); nodes.set(node,entry); }
      entry.original=originals[i]; entry.rendered=rendered[i]; entry.version++; entry.waiting=false; entry.complete=true; entry.fragments=true;
      if (read(node)!==rendered[i]) write(node,rendered[i]);
    }
    return true;
  }
  function examine(node: Text | Attr): void {
    let entry = nodes.get(node);
    if (!eligible(node)) { if (entry) restore(entry); return; }
    if (entry && (read(node) === entry.rendered || (read(node) === entry.original && !entry.rendered))) return;
    const original = read(node), core = original.trim();
    const preserved = core.toLowerCase() !== 'franz' && names.some(name => name.toLocaleLowerCase() === core.toLocaleLowerCase());
    let translated = preserved ? undefined : local(original,dictionary);
    // "Back" is navigation elsewhere, but a slot on the equipment diagram.
    if (!preserved && core.toLowerCase() === 'back') {
      const card = parent(node)?.closest('.border,section,[data-equipment]');
      if (card && [...card.querySelectorAll('h2,h3,h4,.font-semibold.leading-none.tracking-tight')].some(heading => heading.closest('.border,section,[data-equipment]') === card && /^(Equipped Items|Надетые предметы)$/i.test(heading.textContent?.trim() ?? ''))) translated = original.replace(/Back/i,'Спина');
    }
    const known = translated !== undefined;
    const prose = descriptions && !parent(node)?.closest(sensitiveForm) && (!(node instanceof Attr) || ['placeholder','data-placeholder'].includes(node.name)) && !/DSML|<\|[^>]*\|>|"(?:tool_calls|function_call)"\s*:/.test(core)
      && (!parent(node)?.closest('h1,h2,h3,h4,h5,h6') || /\b(?:the|to|of|in|at|with|for|and|your)\b/i.test(core))
      && (core.match(/[A-Za-z]{2,}/g)?.length ?? 0) >= 2;
    if ((!known && !prose) || !/[A-Za-z]/.test(core) || original.length > 16000 || entries.size >= 4000 && !entry) {
      if (entry) { entry.rendered = null; entries.delete(entry.id); nodes.delete(node); } return;
    }
    if (!entry) { entry = { id: ++next, node, original, rendered: null, version: 0, due: 0, waiting: false }; entries.set(entry.id, entry); nodes.set(node, entry); }
    entry.original = original; entry.rendered = null; entry.version++; entry.waiting = false; entry.complete=false; entry.pending=undefined; entry.due = performance.now() + (/[.!?]\s*$/.test(original)?80:180);
    const cached = translated ?? memo.get(original);
    if (cached !== undefined) { entry.rendered=cached; entry.complete=true; write(node,cached); }
  }
  function scan(): void {
    if (timer) clearTimeout(timer); timer = undefined;
    for (const entry of entries.values()) if (!parent(entry.node)?.isConnected) { entries.delete(entry.id); nodes.delete(entry.node); }
    for (const root of roots) {
      if (root.nodeType === Node.TEXT_NODE) { if (!root.parentElement || !examineFragments(root.parentElement)) examine(root as Text); continue; }
      if (!(root instanceof Element)) continue;
      const attributes = (element: Element): void => { for(const name of ['placeholder','data-placeholder','title','aria-label']) { const attribute=element.getAttributeNode(name); if(attribute) examine(attribute); } };
      attributes(root);
      if (examineFragments(root)) continue;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) { const node=walker.currentNode; if(node instanceof Element) { attributes(node); examineFragments(node); } else examine(node as Text); }
    }
    roots.clear();
    updateStatus();
  }
  function schedule(root: Node): void {
    roots.add(root);
    if (!timer) timer = setTimeout(scan, 16);
  }
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if ((mutation.target instanceof Element ? mutation.target : mutation.target.parentElement)?.closest('[data-ff-translation-status],[data-ff-translation-ignore]')) continue;
      if (mutation.type === 'childList') { schedule(mutation.target); for (const node of mutation.addedNodes) schedule(node); }
      else schedule(mutation.target);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['contenteditable', 'hidden', 'translate', 'class', 'style','placeholder','data-placeholder','title','aria-label'] });
  const onScroll = (): void => schedule(document.body);
  const onFocus = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest('[contenteditable]:not([contenteditable="false"]),[role="textbox"]') : null;
    if (target) for (const entry of entries.values()) if (entry.node instanceof Text && target.contains(entry.node)) restore(entry);
    updateStatus();
  };
  document.addEventListener('scroll', onScroll, true);
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('beforeinput', onFocus, true);
  window.addEventListener('resize', onScroll);
  host[key] = {
    retry() { for (const entry of entries.values()) if (!entry.complete && !entry.waiting) entry.due = 0; updateStatus(); },
    collect() {
      scan();
      const result: { id: number; version: number; text: string }[] = []; let length = 0;
      const pending=[...entries.values()].filter(entry=>!entry.complete && !entry.waiting && entry.due<=performance.now() && eligible(entry.node));
      // Finish visible blocks first; off-screen descriptions remain queued.
      const priority=new Map(pending.map(entry=>{const rect=parent(entry.node)!.getBoundingClientRect();return [entry.id,rect.bottom>0 && rect.top<innerHeight ? 0 : 1] as const;}));
      pending.sort((a,b)=>priority.get(a.id)!-priority.get(b.id)!||a.id-b.id);
      for (const entry of pending) {
        if (result.length >= 32 || length + entry.original.length > 48000) break;
        entry.waiting = true; length += entry.original.length;
        result.push({ id: entry.id, version: entry.version, text: entry.original });
      }
      updateStatus();
      return { token, nodes: result };
    },
    finish(expected, results) {
      if (expected !== token) return;
      for (const result of results) {
        const entry = entries.get(result.id);
        if (!entry || entry.version !== result.version) continue;
        entry.waiting = false;
        if (!eligible(entry.node)) { restore(entry); continue; }
        if (read(entry.node) !== entry.original && read(entry.node)!==entry.rendered) { schedule(entry.node); continue; }
        if (result.text === null) { entry.due = performance.now() + 15000; continue; }
        if(result.complete && !entry.complete) completed++;
        entry.pending=result.pending;entry.complete=result.complete;entry.due=performance.now()+(result.retry?15000:0);
        entry.rendered = result.text; if(result.complete) memo.set(entry.original,result.text);
        if(memo.size>3000) memo.delete(memo.keys().next().value!);
        if(read(entry.node)!==result.text) write(entry.node,result.text);
      }
      updateStatus();
    },
    dispose() {
      observer.disconnect(); if (timer) clearTimeout(timer);
      document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('beforeinput', onFocus, true);
      for (const entry of entries.values()) restore(entry);
      for(const [element,value] of marked) { if(value===null) element.removeAttribute('data-ff-translation-pending'); else element.setAttribute('data-ff-translation-pending',value); }
      marked.clear();status.remove();style.remove();
      if(oldHighlight) CSS.highlights.set(highlightName,oldHighlight); else CSS.highlights.delete(highlightName);
      roots.clear(); memo.clear(); delete host[key];
    },
  };
  scan();
}
