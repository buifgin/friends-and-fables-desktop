/**
 * Self-contained controller injected into the trusted Fables website renderer.
 * Keep this function free of module-scope references: main injects its source.
 */
export function configureWebsiteSettings(enabled: boolean, locale: 'en' | 'ru'): void {
  const controllerKey = '__fablesDesktopWebsiteSettingsCleanup';
  const existing = (window as any)[controllerKey] as (() => void) | undefined;
  if (existing) existing();
  if (!enabled) {
    delete (window as any)[controllerKey];
    return;
  }

  const campaignPath = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/play$/i;
  const isCampaignRoute = () => {
    const current = new URL(window.location.href);
    return current.origin === 'https://play.fables.gg' && campaignPath.test(current.pathname);
  };
  if (!isCampaignRoute()) return;

  const buttonKey = 'data-ff-desktop-music-launcher';
  const translations = locale === 'ru' ? { music: 'Музыка' } : { music: 'Music' };
  let observer: MutationObserver | undefined;
  let queued = false;
  let active = true;
  let frame = 0;

  const cleanup = () => {
    if (!active) return;
    active = false;
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    document.removeEventListener('click', interceptGear, true);
    window.removeEventListener('popstate', checkRoute);
    document.querySelectorAll(`[${buttonKey}]`).forEach(button => button.remove());
    if ((window as any)[controllerKey] === cleanup) delete (window as any)[controllerKey];
  };

  const mount = () => {
    if (!active) return;
    queued = false;
    frame = 0;
    if (!isCampaignRoute()) {
      cleanup();
      return;
    }
    const avatarContainer = document.querySelector<HTMLElement>(
      'header div.ml-1.flex.flex-row.space-x-1, [role="banner"] div.ml-1.flex.flex-row.space-x-1'
    );
    if (!avatarContainer || !avatarContainer.parentElement) return;
    const actions = avatarContainer.parentElement;
    const nativeInvite = actions.querySelector<HTMLButtonElement>('button:has(svg.lucide-user-plus)');
    if (!nativeInvite || nativeInvite.closest('header') === null && !nativeInvite.closest('[role="banner"]')) return;

    let button = actions.querySelector<HTMLButtonElement>(`button[${buttonKey}]`);
    if (button && button.parentElement !== actions) {
      button.remove();
      button = null;
    }
    if (!button) {
      button = nativeInvite.cloneNode(false) as HTMLButtonElement;
      button.setAttribute(buttonKey, '');
      button.type = 'button';
      button.classList.add('flex-shrink-0');
      button.setAttribute('aria-label', translations.music);
      button.title = translations.music;
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('width', '16');
      icon.setAttribute('height', '16');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.setAttribute('aria-hidden', 'true');
      const note = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      note.setAttribute('d', 'M9 18V5l12-2v13');
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      stem.setAttribute('d', 'M9 9l12-2');
      const first = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      first.setAttribute('cx', '6'); first.setAttribute('cy', '18'); first.setAttribute('rx', '3'); first.setAttribute('ry', '2');
      const second = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      second.setAttribute('cx', '18'); second.setAttribute('cy', '16'); second.setAttribute('rx', '3'); second.setAttribute('ry', '2');
      icon.append(note, stem, first, second);
      button.append(icon);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!isCampaignRoute()) {
          cleanup();
          return;
        }
        window.open('fables-desktop://music/', '_blank');
      });
    }
    button.setAttribute('aria-label', translations.music);
    button.title = translations.music;
    button.style.flexShrink = '0';
    if (button.nextElementSibling !== avatarContainer) actions.insertBefore(button, avatarContainer);
  };

  const scheduleMount = () => {
    if (!active || queued) return;
    queued = true;
    frame = requestAnimationFrame(mount);
  };

  const checkRoute = () => {
    if (isCampaignRoute()) scheduleMount();
    else cleanup();
  };

  const interceptGear = (event: MouseEvent) => {
    if (!isCampaignRoute()) {
      cleanup();
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const gear = target.closest<HTMLButtonElement>('button:has(svg.lucide-settings)');
    if (!gear || gear.hasAttribute('data-ff-native-campaign-launch')) return;
    if (gear.closest('form, [role="dialog"], dialog, header, [role="banner"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.open('fables-desktop://settings/open-campaign', '_blank');
  };

  document.addEventListener('click', interceptGear, true);
  window.addEventListener('popstate', checkRoute);
  observer = new MutationObserver(scheduleMount);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  (window as any)[controllerKey] = cleanup;
  mount();
}
