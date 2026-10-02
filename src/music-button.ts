// Runs as ordinary DOM code. Opening the player gives the website no IPC API.
export function configureMusicButton(locale: 'en' | 'ru', playerUrl: string): void {
  const host = window as unknown as Record<string, { setLocale(locale: 'en' | 'ru'): void } | undefined>;
  const key = '__friendsFablesDesktopMusic';
  if (host[key]) { host[key]!.setLocale(locale); return; }
  let language = locale, scheduled = false;
  const buttons = new Map<HTMLButtonElement, HTMLButtonElement>();
  function label(button: HTMLButtonElement): void {
    const title = language === 'ru' ? 'Музыкальный проигрыватель' : 'Music player';
    button.title = title; button.setAttribute('aria-label', title);
  }
  function scan(): void {
    scheduled = false;
    for (const [dice, button] of buttons) if (!dice.isConnected || !button.isConnected) { button.remove(); buttons.delete(dice); }
    const playing = /\/play\/?$/.test(location.pathname) && (!new URL(location.href).searchParams.has('view') || new URL(location.href).searchParams.get('view') === 'play');
    if (!playing) { for (const button of buttons.values()) button.remove(); buttons.clear(); return; }
    for (const dice of document.querySelectorAll<HTMLButtonElement>('button[aria-label="Roll dice"],button[aria-label="Бросить кости"]')) {
      const composer = dice.closest('[class~="bg-gray-800/80"]') ?? dice.closest('.grid.relative');
      if (!composer || !composer.querySelector('.tiptap[contenteditable="true"]')
        || dice.closest('form,[role="dialog"],.bottom-full') || buttons.has(dice)) continue;
      const button = document.createElement('button'); button.type = 'button';
      button.className = dice.className; button.setAttribute('data-ff-desktop-music-button', 'true'); button.setAttribute('translate', 'no');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [name, value] of Object.entries({width:'16',height:'16',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(name,value);
      for (const d of ['M9 18V5l12-2v13', 'M9 5l12-2', 'M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3', 'M21 16a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3']) {
        const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d',d); svg.append(path);
      }
      button.append(svg); label(button);
      button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); window.open(playerUrl,'_blank'); });
      dice.after(button); buttons.set(dice,button);
    }
  }
  const observer = new MutationObserver(() => { if (!scheduled) { scheduled = true; queueMicrotask(scan); } });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});
  host[key] = { setLocale(value) { language = value; for (const button of buttons.values()) label(button); scan(); } };
  window.addEventListener('popstate',scan); scan();
}
