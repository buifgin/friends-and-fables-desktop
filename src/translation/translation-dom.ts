// Serialized into the website. This function has ordinary DOM access only:
// no preload, IPC, network requests, or Electron APIs are exposed to the page.
export function installTranslationDom(token: string, dictionary: Record<string, string>, descriptions: boolean, names: string[], local: (text: string, dictionary: Record<string,string>) => string | undefined, hideUntranslated = false, dynamicTranslationLayout = false): void {
  type Entry = { id: number; node: Text | Attr; original: string; rendered: string | null; version: number; due: number; waiting: boolean; complete?: boolean; fragments?: boolean; pending?: {start:number;end:number}[]; visual?:string };
  type Result = { id: number; version: number; text: string | null; complete: boolean; retry?: boolean; pending?: {start:number;end:number}[] };
  type Controller = { collect(): unknown; retry(): void; finish(token: string, results: Result[]): void; dispose(): void };
  const key = '__friendsFablesDesktopTranslation';
  const host = window as unknown as Record<string, Controller | undefined>;
  host[key]?.dispose();
  const entries = new Map<number, Entry>();
  const nodes = new WeakMap<Text | Attr, Entry>();
  const roots = new Set<Node>([document.body]);
  const fragmentOwners = new WeakMap<Text, Element>();
  const protectedSelector = 'script,style,noscript,template,svg,math,textarea,input,select,option,code,pre,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[data-ff-translation-ignore]';
  const sensitiveForm = 'form:has(input[type="password"]),form:has(input[type="email"])';
  const highlightName='ff-desktop-untranslated';
  const oldHighlight=CSS.highlights.get(highlightName);
  const memo = new Map<string,string>();
  const marked = new Map<Element,string|null>();
  const blanked = new Map<Element,{overlay:HTMLElement;position:string;priority:string;minHeight:string;minHeightPriority:string;busy:string|null}>();
  let completed=0;
  const status=document.createElement('div');status.setAttribute('data-ff-translation-status','true');status.setAttribute('data-ff-translation-ignore','true');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483000;display:none;align-items:center;gap:8px;padding:7px 10px;border:1px solid hsl(var(--border,0 0% 40%));border-radius:8px;background:hsl(var(--background,0 0% 8%));color:hsl(var(--foreground,0 0% 96%));box-shadow:0 2px 8px #0004;font:12px system-ui;pointer-events:none';
  const spinner=document.createElement('span');spinner.textContent='↻';spinner.setAttribute('aria-hidden','true');spinner.style.cssText='display:inline-block;animation:ff-translation-spin 1s linear infinite';
  const label=document.createElement('span');status.append(spinner,label);
  const style=document.createElement('style');style.setAttribute('data-ff-translation-ignore','true');style.textContent='@keyframes ff-translation-spin{to{transform:rotate(360deg)}} ::highlight(ff-desktop-untranslated){text-decoration:underline dotted;text-underline-offset:.2em} @media(prefers-reduced-motion:reduce){[data-ff-translation-status] span{animation:none!important}}';
  document.body.append(style,status);
  style.textContent += '[data-ff-translation-blank]:not(#ff-translation-never){color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important} [data-ff-translation-blank]>*:not([data-ff-translation-placeholder]){opacity:0!important} [data-ff-translation-placeholder]{position:absolute;inset-inline-start:0;inset-inline-end:0;top:0;color:var(--ff-translation-ink,#aaa)!important;-webkit-text-fill-color:var(--ff-translation-ink,#aaa)!important;opacity:1!important;pointer-events:none;white-space:pre-wrap!important} [data-ff-translation-dot]::after{content:".";animation:ff-translation-dots 1.2s steps(1,end) infinite}@keyframes ff-translation-dots{0%,100%{content:"."}20%,80%{content:".."}40%,60%{content:"..."}}';
  const read = (node: Text | Attr): string => node instanceof Attr ? node.value : node.data;
  const editorSelector = '[contenteditable]:not([contenteditable="false"])';
  const editorPlaceholder = (node: Text | Attr): node is Attr => node instanceof Attr && ['placeholder','data-placeholder'].includes(node.name) && !!node.ownerElement?.closest(editorSelector);
  const placeholderRules = new Map<Attr, CSSStyleRule>();
  function clearPlaceholder(node: Text | Attr): boolean {
    if (!(node instanceof Attr)) return false;
    const rule=placeholderRules.get(node);if(!rule)return false;
    const sheet=style.sheet;
    if(sheet)for(let i=0;i<sheet.cssRules.length;i++)if(sheet.cssRules[i]===rule){sheet.deleteRule(i);break;}
    placeholderRules.delete(node);return true;
  }
  const write = (node: Text | Attr, text: string): void => {
    if(editorPlaceholder(node)) {
      // ProseMirror owns the decoration attributes and will restore them after
      // any external write. CSSOM changes render the hint without waking its
      // DOM observer or changing the user's draft.
      clearPlaceholder(node);
      const sheet=style.sheet;if(!sheet)return;
      const attribute=`[${node.name}="${CSS.escape(node.value)}"]`;
      const editor=`:is(${editorSelector})`;
      const index=sheet.insertRule(`${editor}${attribute}::before,${editor} ${attribute}::before{content:"${CSS.escape(text)}"!important}`,sheet.cssRules.length);
      placeholderRules.set(node,sheet.cssRules[index] as CSSStyleRule);
    } else if(node instanceof Attr) node.value=text; else node.data=text;
  };
  const parent = (node: Text | Attr): Element | null => node instanceof Attr ? node.ownerElement : node.parentElement;
  let next = 0, timer: ReturnType<typeof setTimeout> | undefined, queued=false,disposed=false;
  function reveal(element:Element):void {
    const previous=blanked.get(element);if(!previous)return;
    previewSizes.unobserve(previous.overlay);previous.overlay.remove();element.removeAttribute('data-ff-translation-blank');
    if(element instanceof HTMLElement){element.style.setProperty('position',previous.position,previous.priority);element.style.removeProperty('--ff-translation-ink');element.style.setProperty('min-height',previous.minHeight,previous.minHeightPriority);}
    if(previous.busy===null)element.removeAttribute('aria-busy');else element.setAttribute('aria-busy',previous.busy);
    blanked.delete(element);
  }
  function eligible(node: Text | Attr): boolean {
    const element = parent(node);
    // Catalog card headings are creator-owned world/campaign names, including
    // titles that happen to match a glossary term. Protect before local lookup.
    const namedHeading=element?.closest('h1,h2,h3,h4,[role="heading"]');
    if(namedHeading && (namedHeading.closest('[data-world-name],[data-world-title],a[href*="/worlds/"],a[href*="/world/"]') ||
      namedHeading.matches('h3.font-header') && namedHeading.closest('.clickable.bg-card') ||
      namedHeading.matches('h1') && /^\/worlds?\//.test(location.pathname)))return false;
    // Never consume instruction delimiters before the hiding controller scans them.
    if(node instanceof Text && /\[\[\/?FF-SP:1\]\]/.test(nodes.get(node)?.original??node.data))return false;
    // Friends & Fables disables browser translation on its entire document.
    // The user's app toggle overrides that page-wide flag. Local exclusions
    // (names, editors, individual blocks) still protect their original text.
    const exclusion = element?.closest('[translate="no"],.notranslate');
    const isEditorPlaceholder=editorPlaceholder(node);
    return !!element && element.isConnected && (node instanceof Attr
      ? (!element.closest(editorSelector) || isEditorPlaceholder) && !element.closest('[data-ff-translation-ignore]') && !element.matches('input[type="password"],input[type="email"]')
      : !element.closest(protectedSelector))
      && (!exclusion || exclusion === document.documentElement || exclusion === document.body || isEditorPlaceholder)
      && !element.closest('[hidden]') && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== 'hidden';
  }
  function restore(entry: Entry): void {
    if (!clearPlaceholder(entry.node) && entry.rendered !== null && read(entry.node) === entry.rendered) write(entry.node, entry.original);
    entries.delete(entry.id); nodes.delete(entry.node);
  }
  function fitPreview(element:Element,overlay:HTMLElement):void {
    const record=blanked.get(element);if(!record || !(element instanceof HTMLElement))return;
    const computed=getComputedStyle(element);
    const extra=computed.boxSizing==='border-box' ? ['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+(parseFloat(computed[key as keyof CSSStyleDeclaration] as string)||0),0) : 0;
    const height=Math.ceil(overlay.getBoundingClientRect().height+extra);
    const value=`max(${record.minHeight||'0px'}, ${height}px)`;
    if(element.style.getPropertyValue('min-height')!==value)element.style.setProperty('min-height',value,'important');
  }
  const previewSizes=new ResizeObserver(records=>{
    if(disposed)return;
    for(const record of records){const overlay=record.target as HTMLElement;const element=overlay.parentElement;if(element)fitPreview(element,overlay);}
  });
  function updateStatus(): void {
    // Paint a reversible presentation over native text. A ready prefix
    // is visible immediately; later fragments wait behind the first unresolved range.
    const unfinished=[...entries.values()].filter(entry=>!entry.complete&&eligible(entry.node));
    const hiddenParents=new Set(hideUntranslated?unfinished.filter(entry=>entry.node instanceof Text).map(entry=>parent(entry.node)!.closest('[data-ff-desktop-detail-card],.prose')??parent(entry.node)!):[]);
    for(const element of blanked.keys())if(!hiddenParents.has(element))reveal(element);
    // Capture ink before concealing ancestors, so nested blocks retain their color.
    const ink=new Map([...hiddenParents].filter(element=>!blanked.has(element)).map(element=>[element,getComputedStyle(element).color]));
    for(const element of hiddenParents)if(!blanked.has(element)&&element instanceof HTMLElement){
      const overlay=document.createElement('span');overlay.setAttribute('data-ff-translation-placeholder','true');overlay.setAttribute('data-ff-translation-ignore','true');overlay.setAttribute('aria-label','Переводится');overlay.setAttribute('role','status');
      const position=element.style.getPropertyValue('position'),priority=element.style.getPropertyPriority('position');
      blanked.set(element,{overlay,position,priority,minHeight:element.style.getPropertyValue('min-height'),minHeightPriority:element.style.getPropertyPriority('min-height'),busy:element.getAttribute('aria-busy')});
      element.style.setProperty('--ff-translation-ink',ink.get(element)??'currentColor');if(getComputedStyle(element).position==='static')element.style.position='relative';
      element.setAttribute('data-ff-translation-blank','true');element.setAttribute('aria-busy','true');element.append(overlay);previewSizes.observe(overlay);
    }
    for(const [element,{overlay}] of blanked){
      let blocked=false;
      const render=(node:Node):Node|null=>{
        if(blocked)return null;
        if(node===overlay || node instanceof Element && node.hasAttribute('data-ff-translation-placeholder'))return null;
        if(node instanceof Text){
          const entry=nodes.get(node);
          if(!entry || entry.complete)return document.createTextNode(entry?.rendered??node.data);
          const value=entry.visual??entry.original;
          const ranges=entry.pending??[{start:0,end:value.length}];
          const fragment=document.createDocumentFragment();
          const first=ranges.find(range=>range.start>=0 && range.end<=value.length && range.end>range.start);
          if(!first)return document.createTextNode(value);
          fragment.append(document.createTextNode(value.slice(0,first.start)));
          const dots=document.createElement('span');dots.setAttribute('data-ff-translation-dot','true');dots.setAttribute('aria-label','Переводится');fragment.append(dots);
          blocked=true;return fragment;
        }
        if(node instanceof Element){
          const clone=node.cloneNode(false) as Element;clone.removeAttribute('id');clone.removeAttribute('data-ff-translation-blank');clone.removeAttribute('aria-busy');
          for(const child of node.childNodes){const rendered=render(child);if(rendered)clone.append(rendered);}return clone;
        }
        return node.cloneNode(false);
      };
      const fragment=document.createDocumentFragment();for(const node of element.childNodes){const rendered=render(node);if(rendered)fragment.append(rendered);}
      // Do not restart dot animations or mutate the DOM for unchanged polls.
      const preview=document.createElement('span');preview.append(fragment);
      if(overlay.innerHTML!==preview.innerHTML)overlay.replaceChildren(...preview.childNodes);
      fitPreview(element,overlay);
    }
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
    let parts = [...element.childNodes].filter((node): node is Text => node instanceof Text);
    const children = [...element.children].filter(child=>!child.hasAttribute('data-ff-translation-placeholder'));
    // Research summaries use one leaf span per count/label. Keep those native
    // spans and their numeric text nodes intact while translating the unit.
    const leaves = [2,3,4].includes(children.length) && children.every(child=>child.tagName==='SPAN' && child.children.length===0 && [...child.childNodes].every(node=>node instanceof Text || node.nodeType===Node.COMMENT_NODE))
      ? children.flatMap(child=>[...child.childNodes].filter((node): node is Text=>node instanceof Text)) : [];
    const original = (node: Text): string => { const entry=nodes.get(node); return entry && read(node)===entry.rendered ? entry.original : read(node); };
    // Short form labels can mix native text, comments, leaf spans and an icon.
    // Only exact known grammatical units qualify, never arbitrary joined names.
    const labelParts: Text[]=[];
    const labelShape=[...element.childNodes].every(node=>{
      if(node instanceof Text){labelParts.push(node);return true;}
      if(node.nodeType===Node.COMMENT_NODE)return true;
      if(!(node instanceof Element))return false;
      if(node.matches('svg,[data-ff-translation-placeholder]'))return true;
      if(node.tagName!=='SPAN' || node.children.length)return false;
      for(const child of node.childNodes){if(child instanceof Text)labelParts.push(child);else if(child.nodeType!==Node.COMMENT_NODE)return false;}
      return true;
    });
    const labelSource=labelParts.map(original).join('');
    const emptyFavoriteLabel=labelSource.replace(/\s+/g,' ').trim().toLowerCase()==='you don\'t have any favorited attacks ready. add an attack in the custom tab and click "favorite attack" to save it as a favorite!';
    const labelGroup=labelShape && (emptyFavoriteLabel || /^\s*(?:Add to Favorites|Remove from Favorites|Description\s*\(\s*Optional\s*\)|Select (?:a )?weapon(?:\.\.\.|…)?|Add damage roll|Roll attack|Favorite attack)\s*$/i.test(labelSource));
    const counterSource = leaves.map(original).join(' ').replace(/\s+/g,' ').trim();
    const counterGroup = /^[\d,]+\s+XP until level\s+\d+$/i.test(counterSource) || /^\d+ (?:Topics? Researched|Blocks? Created|Memor(?:y|ies) Saved)(?: \d+ Blocks? Created)?$/i.test(counterSource);
    const mechanicsGroup=/^(?:(?:acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder) damage|Preview:\s*\d+d\d+(?:\s*[+−-]\s*\d+)?\s+(?:acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)|Bonuses:\s*[+−-]?\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Proficiency|Expertise)(?:[.,]\s*[+−-]?\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Proficiency|Expertise))*)$/i.test(counterSource);
    if(labelGroup) parts=labelParts;
    else if(leaves.length) parts=leaves;
    const reset = (): false => { for (const node of parts) { const entry=nodes.get(node); if(entry?.fragments && fragmentOwners.get(node)===element) { restore(entry); fragmentOwners.delete(node); } } return false; };
    if ((!labelGroup && !counterGroup && !mechanicsGroup && children.length>0) || parts.length < 2 || parts.length > 12) return reset();
    const originals = parts.map(node => { const entry=nodes.get(node); return entry && read(node)===entry.rendered ? entry.original : read(node); });
    const source = counterGroup || mechanicsGroup ? originals.join(' ').replace(/\s+/g,' ').trim() : originals.join('');
    if (source.length > 512 || !labelGroup && !counterGroup && !mechanicsGroup && !/^(?:\s*[\d,]+\s*XP until level\s*\d+\s*|\s*DC\s+\d+\s*|\s*Your turn,\s*.{1,100}\s*|\s*\d+\s+(?:Topics? Researched|Blocks? Created|Memor(?:y|ies) Saved)\s*|\s*\d+\s+credits?(?:\s*\+)?\s*\/\s*turn\s*|\s*(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(?:Modifier|Save)\s*|\s*Level\s+\d+\s+spell slot\s+(?:consumed|restored)[.!]?\s*|\s*Custom Instructions\s*\(\s*\d+\s*\/\s*\d+\s*\)\s*|\s*Battle lasted\s+\d+\s+turns?[.!]?\s*|\s*\(\s*\d+\s+characters? remaining\s*\)\s*|\s*(?:\(\s*)?\d+\s+active\s*[,/]\s*\d+\s+idle\s*\)?\s*|\s*[\d,.]+\s+(?:Followers|Following)\s*|\s*[+−\-]?[\d.,]+(?:\s*\/\s*[\d.,]+)?\s*(?:lbs?\.?|ft\.?|HP)\s*|\s*(?:End|Waiting for|Run|Skip)\s+.{1,100}?Turn\s*|\s*(?:Franz|Франц)\s+is\s+(?:thinking|imagining|envisioning|starting (?:an? )?encounter|starting combat|generating)(?:\.\.\.|…)?\s*|\s*Executor\s*:\s*(?:Encounter|Adventure)\s*|\s*General Feat\s*|\s*Configure\s+(?:Flat Adjustment|Override|Modifier)\s*|\s*(?:acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s+damage\s*|\s*Preview:\s*\d+d\d+(?:\s*[+−-]\s*\d+)?\s+(?:acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s*|\s*Bonuses:\s*[+−-]?\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Proficiency|Expertise)(?:[.,]\s*[+−-]?\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Proficiency|Expertise))*\s*)$/i.test(source)
      || names.some(name => name.toLowerCase()!=='franz'&&[source,...originals].some(value=>value.trim().toLowerCase()===name.toLowerCase()))
      || parts.some(node=>!eligible(node)) || entries.size + parts.filter(node=>!nodes.has(node)).length > 4000) return reset();
    const translated = local(source,dictionary);
    if (translated === undefined) return reset();
    const rendered = parts.map(()=>'');
    let start=0, offset=0;
    for (let i=0;i<parts.length;i++) {
      if (!/^\s*\d[\d,.]*\s*$/.test(originals[i])) continue;
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
      fragmentOwners.set(node,element);
      entry.original=originals[i]; entry.rendered=rendered[i]; entry.version++; entry.waiting=false; entry.complete=true; entry.fragments=true;
      if (read(node)!==rendered[i]) write(node,rendered[i]);
    }
    return true;
  }
  function examine(node: Text | Attr): void {
    let entry = nodes.get(node);
    if (!eligible(node)) { if (entry) restore(entry); return; }
    if (entry && (read(node) === entry.rendered || (read(node) === entry.original && (!entry.rendered || node instanceof Attr && placeholderRules.has(node))))) return;
    clearPlaceholder(node);
    const original = read(node), core = original.trim();
    const preserved = core.toLowerCase() !== 'franz' && names.some(name => name.toLocaleLowerCase() === core.toLocaleLowerCase());
    let translated = preserved ? undefined : local(original,dictionary);
    // "Back" is navigation elsewhere, but a slot on the equipment diagram.
    if (!preserved && core.toLowerCase() === 'back') {
      const card = parent(node)?.closest('.border,section,[data-equipment]');
      if (card && [...card.querySelectorAll('h2,h3,h4,.font-semibold.leading-none.tracking-tight')].some(heading => heading.closest('.border,section,[data-equipment]') === card && /^(Equipped Items|Надетые предметы)$/i.test(heading.textContent?.trim() ?? ''))) translated = original.replace(/Back/i,'Спина');
    }
    const actionDialog=parent(node)?.closest('[role=dialog]');
    if(!preserved && core.toLowerCase()==='custom' && actionDialog && [...actionDialog.querySelectorAll('h2')].some(title=>/^(?:Choose Action|Выберите действие)$/i.test(title.textContent?.trim()??'')))translated=original.replace(/custom/i,'Своя атака');
    // The dice operator is a presentation label beside native quantity/faces controls.
    // Restrict this to the attack/dice dialog; never rewrite form values or a general letter d.
    if(!preserved && core==='d' && actionDialog && [...actionDialog.querySelectorAll('h2')].some(title=>/^(?:Choose Action|Выберите действие|Roll Dice|Бросить кости|Бросок костей)$/i.test(title.textContent?.trim()??''))) {
      const row=parent(node)?.parentElement;
      if(row?.querySelector('input[type=number]') && row.querySelector('select,[role=combobox]'))translated=original.replace('d','к');
    }
    // The attack form selects a characteristic separately from its numeric bonus.
    const attackPanel=parent(node)?.closest('[data-ff-combat-panel-mode="actions"],[role=dialog]');
    if(!preserved && core.toLowerCase()==='ability modifier' && attackPanel &&
      [...attackPanel.querySelectorAll('h2,h3,[role=heading]')].some(title=>/^(?:Choose Action|Roll Attack|Attack Roll|Выберите действие|Бросок атаки)$/i.test(title.textContent?.trim()??'')))translated=original.replace(/ability modifier/i,'Характеристика');
    const known = translated !== undefined;
    const element=parent(node);
    const headingElement=element?.closest('h1,h2,h3,h4,h5,h6,[role=heading],.font-semibold.leading-none.tracking-tight');
    const heading=!!headingElement;
    // A dialog also contains the character's name. Restrict model fallback to
    // feature card headings in its active panel, independently of translated tabs.
    const panel=element?.closest('[role=tabpanel],[data-progression],[data-skills],[data-class]');
    const featureLabels=/^(?:progression|class features|skills|class|прогрессия|развитие|особенности класса|умения класса|навыки|класс)$/i;
    const panelTab=panel?.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)).find(tab=>tab?.matches('[role=tab]'));
    const featurePanel=!!panel && !panel.matches('[data-state=inactive],[aria-hidden=true],[hidden]') &&
      (panel.matches('[data-progression],[data-skills],[data-class]') || featureLabels.test(panelTab?.textContent?.trim()??'') ||
       [...panel.querySelectorAll('h2,h3,[role=heading]')].some(title=>featureLabels.test(title.textContent?.trim()??'')));
    const customHeading=featurePanel && !!headingElement?.matches('h3,h4,h5,h6,[role=heading]:not([aria-level="1"]):not([aria-level="2"])') &&
      !!headingElement.closest('.border,[data-progression],[data-skills],[data-class]');
    const dialogTitle=!!headingElement?.matches('h1,h2,[role=heading][aria-level="1"],[role=heading][aria-level="2"]') && !!headingElement.closest('[role=dialog]');
    if(translated!==undefined && heading)translated=translated.replace(/^(\s*)(\p{L})/u,(_,space,letter)=>space+(core.match(/[A-Za-z]/)?.[0]===core.match(/[a-z]/)?.[0]?letter.toLocaleLowerCase('ru'):letter.toLocaleUpperCase('ru')));
    const shortInterface=core.length<=120 && (core.match(/[A-Za-z]{2,}/g)?.length??0)<=8 &&
      (node instanceof Attr ? !editorPlaceholder(node) : !!element?.closest('button,label,[role=button],[role=combobox],[role=tab],[role=menuitem]'));
    const prose = !shortInterface && !preserved && !dialogTitle && descriptions && !parent(node)?.closest(sensitiveForm) && (!(node instanceof Attr) || ['placeholder','data-placeholder'].includes(node.name)) && !/DSML|<\|[^>]*\|>|"(?:tool_calls|function_call)"\s*:/.test(core)
      && (customHeading || !heading || /\b(?:the|to|of|in|at|with|for|and|your)\b/i.test(core))
      && (core.match(/[A-Za-z]{2,}/g)?.length ?? 0) >= (customHeading?1:2);
    if ((!known && !prose) || !/[A-Za-z]/.test(core) || original.length > 16000 || entries.size >= 4000 && !entry) {
      if (entry) { entry.rendered = null; entries.delete(entry.id); nodes.delete(node); } return;
    }
    if (!entry) { entry = { id: ++next, node, original, rendered: null, version: 0, due: 0, waiting: false }; entries.set(entry.id, entry); nodes.set(node, entry); }
    entry.original = original; entry.rendered = null; entry.version++; entry.waiting = false; entry.complete=false; entry.pending=undefined;entry.visual=undefined; entry.due = performance.now() + (/[.!?]\s*$/.test(original)?80:180);
    const cached = translated ?? memo.get(original);
    if (cached !== undefined) { entry.rendered=cached; entry.complete=true; write(node,cached); }
    else if(hideUntranslated&&dynamicTranslationLayout&&node instanceof Text){entry.rendered='…';write(node,'…');}
    else if(hideUntranslated&&node instanceof Attr&&['placeholder','data-placeholder'].includes(node.name)){entry.rendered='…';write(node,'…');}
  }
  function scan(): void {
    if(disposed)return;
    queued=false;
    if (timer) clearTimeout(timer); timer = undefined;
    for (const entry of entries.values()) if (!parent(entry.node)?.isConnected) { clearPlaceholder(entry.node); entries.delete(entry.id); nodes.delete(entry.node); }
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
    if(disposed)return;
    const owner=root instanceof Text ? fragmentOwners.get(root) : root instanceof Element && root.firstChild instanceof Text ? fragmentOwners.get(root.firstChild) : undefined;
    roots.add(owner?.isConnected ? owner : root);
    // A microtask translates glossary labels and hides pending prose before
    // the browser paints newly rendered English, including streaming updates.
    if (!queued){queued=true;queueMicrotask(scan);}
  }
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      const ignoreChanged=mutation.type==='attributes' && ['data-ff-translation-ignore','data-ff-desktop-instruction-block'].includes(mutation.attributeName ?? '');
      if (!ignoreChanged && (mutation.target instanceof Element ? mutation.target : mutation.target.parentElement)?.closest('[data-ff-translation-status],[data-ff-translation-ignore]')) continue;
      if (mutation.type === 'childList') { schedule(mutation.target); for (const node of mutation.addedNodes) schedule(node); }
      else schedule(mutation.target);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true,
    // Favorites hide the native list through this CSS marker rather than hidden.
    // Rescan its subtree when All checks reveals the original native captions.
    attributeFilter: ['contenteditable', 'hidden', 'data-ff-dice-native-hidden', 'translate', 'class', 'style','placeholder','data-placeholder','title','aria-label','data-ff-translation-ignore','data-ff-desktop-instruction-block'] });
  const onScroll = (): void => schedule(document.body);
  function progressionRegion(node:Text|Attr):Element|null {
    const panel=parent(node)?.closest('[role=tabpanel],[data-progression]');
    if(!panel || panel.matches('[data-state=inactive],[aria-hidden=true],[hidden]'))return null;
    const tab=panel.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)).find(element=>element?.matches('[role=tab]'));
    return panel.matches('[data-progression]') || /^(progression|прогрессия|развитие)$/i.test(tab?.textContent?.trim()??'') ||
      [...panel.querySelectorAll('h2,h3,[role=heading]')].some(title=>/^(class features|особенности класса|умения класса)$/i.test(title.textContent?.trim()??'')) ? panel : null;
  }
  function documentOrder(a:Entry,b:Entry):number {
    const left=a.node instanceof Attr?parent(a.node)!:a.node,right=b.node instanceof Attr?parent(b.node)!:b.node;
    const position=left.compareDocumentPosition(right);
    return position&Node.DOCUMENT_POSITION_FOLLOWING?-1:position&Node.DOCUMENT_POSITION_PRECEDING?1:a.id-b.id;
  }
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
      const result: { id: number; version: number; text: string; ordered?:boolean }[] = []; let length = 0;
      const unfinished=[...entries.values()].filter(entry=>!entry.complete && eligible(entry.node));
      // Each progression pane drains its earliest unfinished node completely.
      // Include waiting/backoff entries in the barrier so later levels cannot leapfrog.
      const earliest=new Map<Element,Entry>();
      for(const entry of unfinished){const region=progressionRegion(entry.node);if(region){const before=earliest.get(region);if(!before||documentOrder(entry,before)<0)earliest.set(region,entry);}}
      const pending=unfinished.filter(entry=>!entry.waiting && entry.due<=performance.now() && (!progressionRegion(entry.node)||earliest.get(progressionRegion(entry.node)!)===entry));
      // General prose keeps viewport priority; progression respects document order.
      const priority=new Map(pending.map(entry=>{const rect=parent(entry.node)!.getBoundingClientRect();return [entry.id,rect.bottom>0 && rect.top<innerHeight ? 0 : 1] as const;}));
      pending.sort((a,b)=>priority.get(a.id)!-priority.get(b.id)!||a.id-b.id);
      for (const entry of pending) {
        if (result.length >= 32 || length + entry.original.length > 48000) break;
        entry.waiting = true; length += entry.original.length;
        result.push({ id: entry.id, version: entry.version, text: entry.original, ...(progressionRegion(entry.node)?{ordered:true}:{}) });
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
        if(parent(entry.node)?.closest('h1,h2,h3,h4,h5,h6,[role=heading],.font-semibold.leading-none.tracking-tight'))result.text=result.text.replace(/^(\s*)(\p{L})/u,(_,space,letter)=>space+(entry.original.match(/[A-Za-z]/)?.[0]===entry.original.match(/[a-z]/)?.[0]?letter.toLocaleLowerCase('ru'):letter.toLocaleUpperCase('ru')));
        entry.visual=result.text;
        if(hideUntranslated&&!result.complete){
          if(dynamicTranslationLayout && entry.node instanceof Text){
            const first=(result.pending??[{start:0,end:result.text.length}]).find(range=>range.start>=0 && range.end<=result.text!.length && range.end>range.start);
            const masked=first?result.text.slice(0,first.start)+'…':result.text;
            entry.rendered=masked;if(read(entry.node)!==masked)write(entry.node,masked);
          }
          continue;
        }
        entry.rendered = result.text; if(result.complete) memo.set(entry.original,result.text);
        if(memo.size>3000) memo.delete(memo.keys().next().value!);
        if(read(entry.node)!==result.text) write(entry.node,result.text);
      }
      updateStatus();
    },
    dispose() {
      disposed=true;
      observer.disconnect();previewSizes.disconnect(); if (timer) clearTimeout(timer);
      document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('beforeinput', onFocus, true);
      for (const entry of entries.values()) restore(entry);
      for(const [element,value] of marked) { if(value===null) element.removeAttribute('data-ff-translation-pending'); else element.setAttribute('data-ff-translation-pending',value); }
      marked.clear();status.remove();style.remove();
      for(const element of blanked.keys())reveal(element);
      if(oldHighlight) CSS.highlights.set(highlightName,oldHighlight); else CSS.highlights.delete(highlightName);
      roots.clear(); memo.clear(); delete host[key];
    },
  };
  scan();
  document.dispatchEvent(new Event('ff-desktop-translation-ready'));
}
