import type { BrowserWindow, WebContents } from 'electron';

export function configureFullscreenShortcuts(contents: WebContents, window: BrowserWindow): void {
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isComposing || input.control || input.meta || input.shift) return;
    const toggle = input.alt && ['Enter', 'NumpadEnter'].includes(input.code)
      || !input.alt && input.code === 'F11';
    if (!toggle || window.isDestroyed()) return;
    event.preventDefault();
    if (!input.isAutoRepeat) window.setFullScreen(!window.isFullScreen());
  });
}
