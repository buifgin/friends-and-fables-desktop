// Hide complete marked blocks using attributes; React keeps its original nodes.
// The stored message is unchanged and other clients can still read its content.
export function configureInstructionHiding(enabled: boolean): void {
  const key='__friendsFablesDesktopInstructionHiding';
  const host=window as unknown as Record<string,{setEnabled(value:boolean):void}|undefined>;
  if(host[key]){host[key]!.setEnabled(enabled);return;}
  const style=document.createElement('style');style.textContent='[data-ff-desktop-hidden-instructions],[data-ff-desktop-sp-draft]>.tiptap[contenteditable="true"]>p:last-child{display:none!important}';document.documentElement.append(style);
  let hidden=enabled,queued=false;
  const ignored=new WeakMap<Element,string|null>();
  function scan():void {
    queued=false;
    for(const parent of document.querySelectorAll('[data-ff-desktop-sp-draft]')){
      const value=parent.querySelector(':scope>.tiptap>p:last-child')?.textContent?.trim()??'';
      if(!value.startsWith('[[FF-SP:1]]')||!value.endsWith('[[/FF-SP:1]]'))parent.removeAttribute('data-ff-desktop-sp-draft');
    }
    for(const element of document.querySelectorAll('[data-ff-desktop-instruction-block]')){
      element.removeAttribute('data-ff-desktop-hidden-instructions');element.removeAttribute('data-ff-desktop-instruction-block');
      const original=ignored.get(element);if(original===null)element.removeAttribute('data-ff-translation-ignore');else if(original!==undefined)element.setAttribute('data-ff-translation-ignore',original);ignored.delete(element);
    }
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
        if(last?.textContent?.trim().endsWith('[[/FF-SP:1]]'))for(const node of nodes){
          if(!ignored.has(node))ignored.set(node,node.getAttribute('data-ff-translation-ignore'));node.setAttribute('data-ff-translation-ignore','true');node.setAttribute('data-ff-desktop-instruction-block','true');
          if(hidden)node.setAttribute('data-ff-desktop-hidden-instructions','true');
        }
      }
    }
  }
  const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(scan);}});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  // /sp can open its editor before any instructions or commands are enabled.
  function launcher(target:EventTarget|null):HTMLElement|null{
    if(!(target instanceof Element)||!/\/play\/?$/.test(location.pathname))return null;
    const root=target.closest<HTMLElement>('[class~="bg-gray-800/80"]')??target.closest<HTMLElement>('.grid.relative');
    if(!root?.querySelector('#working-context-bar-spacer,button[aria-label="Roll dice"],button[aria-label="Бросить кости"],button[aria-label="More actions"]')||root.closest('form,[role="dialog"],.bottom-full'))return null;
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
