// Hide complete marked blocks using attributes; React keeps its original nodes.
// The stored message is unchanged and other clients can still read its content.
export function configureInstructionHiding(enabled: boolean): void {
  const key='__friendsFablesDesktopInstructionHiding';
  const host=window as unknown as Record<string,{setEnabled(value:boolean):void}|undefined>;
  if(host[key]){host[key]!.setEnabled(enabled);return;}
  const style=document.createElement('style');style.textContent='[data-ff-desktop-hidden-instructions],[data-ff-desktop-sp-draft]>.tiptap[contenteditable="true"]>p:last-child{display:none!important}'
    // Hidden guidance still owns :last-child. Preserve the native prose terminal
    // margin on the visible body, while leaving inline margins and not-prose alone.
    +'[data-ff-desktop-sp-draft]>.tiptap.prose[contenteditable="true"]:has(>p:last-child)>:nth-last-child(2):not(:where([class~="not-prose"],[class~="not-prose"] *)){margin-bottom:0}';document.documentElement.append(style);
  let hidden=enabled,queued=false;
  const ignored=new WeakMap<Element,string|null>();
  function scan():void {
    queued=false;
    for(const parent of document.querySelectorAll('[data-ff-desktop-sp-draft]')){
      const value=parent.querySelector(':scope>.tiptap>p:last-child')?.textContent?.trim()??'';
      if(!value.startsWith('[[FF-SP:1]]')||!value.endsWith('[[/FF-SP:1]]'))parent.removeAttribute('data-ff-desktop-sp-draft');
    }
    const next=new Set<Element>();
    for(const root of document.querySelectorAll('.prose')) {
      if(root.closest('form'))continue;
      for(const first of root.querySelectorAll<HTMLElement>('p')) {
        const value=first.textContent?.trim()??'';
        if(!value.startsWith('[[FF-SP:1]]') || first.closest('pre,code,[contenteditable]:not([contenteditable="false"])') || first.firstElementChild?.matches('code')&&first.firstElementChild.textContent?.trim().startsWith('[[FF-SP:1]]'))continue;
        const nodes:Element[]=[first];let last:Element|null=first,total=value.length;
        while(last && !last.textContent?.trim().endsWith('[[/FF-SP:1]]') && nodes.length<128 && total<6000) {
          last=last.nextElementSibling;
          if(last){nodes.push(last);total+=last.textContent?.length??0;}
        }
        if(last?.textContent?.trim().endsWith('[[/FF-SP:1]]'))for(const node of nodes)next.add(node);
      }
    }
    const mark=(element:Element,name:string,value:string|null):void=>{
      if(element.getAttribute(name)===value)return;
      if(value===null)element.removeAttribute(name);else element.setAttribute(name,value);
    };
    // Keep stable instruction markers intact. Their removal/reapplication wakes
    // translation and message snapshot observers even on unrelated native writes.
    for(const element of document.querySelectorAll('[data-ff-desktop-instruction-block]'))if(!next.has(element)){
      mark(element,'data-ff-desktop-hidden-instructions',null);mark(element,'data-ff-desktop-instruction-block',null);
      const original=ignored.get(element);if(original!==undefined)mark(element,'data-ff-translation-ignore',original);ignored.delete(element);
    }
    for(const element of next){
      if(!ignored.has(element))ignored.set(element,element.getAttribute('data-ff-translation-ignore'));
      mark(element,'data-ff-translation-ignore','true');mark(element,'data-ff-desktop-instruction-block','true');
      mark(element,'data-ff-desktop-hidden-instructions',hidden?'true':null);
    }
  }
  const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(scan);}});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  // /sp can open its editor before any instructions or commands are enabled.
  function launcher(target:EventTarget|null):HTMLElement|null{
    if(!(target instanceof Element)||!/\/play\/?$/.test(location.pathname))return null;
    const root=target.closest<HTMLElement>('[class~="bg-gray-800/80"]')??target.closest<HTMLElement>('.grid.relative');
    if(!root?.querySelector('#working-context-bar-spacer,button[aria-label="Roll dice"],button[aria-label="Бросить кости"],button[aria-label="More actions"],button[aria-label="Другие действия"]')||root.closest('form,[role="dialog"],.bottom-full'))return null;
    const editor=root.querySelector<HTMLElement>('.tiptap[contenteditable="true"]');
    return editor?.textContent?.trim()==='/sp'&&!editor.querySelector('code,pre')?editor:null;
  }
  window.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.shiftKey||event.isComposing)return;
    const editor=launcher(event.target);if(!editor?.contains(event.target as Node))return;
    event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)window.open('fables-desktop://settings/host-instructions.html','_blank');
  },true);
  window.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('button[id="send"],button[aria-label="Send message"],button[aria-label="Send message (V2)"],button[aria-label="Отправить сообщение"]'):null;
    if(!button||!launcher(button))return;event.preventDefault();event.stopImmediatePropagation();window.open('fables-desktop://settings/host-instructions.html','_blank');
  },true);
  host[key]={setEnabled(value){hidden=value;scan();}};scan();
}
