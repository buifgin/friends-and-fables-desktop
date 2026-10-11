import type { BrowserWindow, WebContents } from 'electron';

const settingsEscapes = new WeakMap<BrowserWindow, () => boolean>();
export function setSettingsEscape(window: BrowserWindow, callback: () => boolean): void { settingsEscapes.set(window,callback); }
const quickBarToggles = new WeakMap<BrowserWindow, () => void>();
export function setQuickBarToggle(window: BrowserWindow, callback: () => void): void { quickBarToggles.set(window,callback); }

export function configureFullscreenShortcuts(contents: WebContents, window: BrowserWindow): void {
  contents.on('before-input-event', (event, input) => {
    if(input.type==='keyDown'&&!input.isComposing&&!input.control&&!input.meta&&!input.alt&&!input.shift&&input.code==='Escape'&&!window.isDestroyed()&&settingsEscapes.get(window)?.()){event.preventDefault();return;}
    if(input.type==='keyDown'&&!input.isComposing&&input.control&&input.shift&&!input.meta&&!input.alt&&input.code==='KeyB'&&!window.isDestroyed()){const toggle=quickBarToggles.get(window);if(toggle){event.preventDefault();if(!input.isAutoRepeat)toggle();}return;}
    if (input.type !== 'keyDown' || input.isComposing || input.control || input.meta || input.shift) return;
    const toggle = input.alt && ['Enter', 'NumpadEnter'].includes(input.code)
      || !input.alt && input.code === 'F11';
    if (!toggle || window.isDestroyed()) return;
    event.preventDefault();
    if (!input.isAutoRepeat) window.setFullScreen(!window.isFullScreen());
  });
}
