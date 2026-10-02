import type { WebContents } from 'electron';

export function configureZoomShortcuts(contents: WebContents): void {
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isComposing || input.alt) return;
    if (process.platform === 'darwin' ? !input.meta : !input.control) return;

    // Physical key codes work with both English and Russian keyboard layouts.
    // Accept Ctrl+=, Ctrl+Shift+=, and the numpad plus key for zooming in.
    let change: number | null = null;
    if (['Equal', 'NumpadAdd'].includes(input.code) || ['=', '+'].includes(input.key)) {
      change = 0.5;
    } else if (['Minus', 'NumpadSubtract'].includes(input.code) || input.key === '-') {
      change = -0.5;
    } else if (['Digit0', 'Numpad0'].includes(input.code) || input.key === '0') {
      change = 0;
    }
    if (change === null) return;

    // Prevent the menu accelerator from handling this same key a second time.
    event.preventDefault();
    contents.setZoomLevel(change === 0 ? 0 : Math.max(-5, Math.min(5, contents.getZoomLevel() + change)));
  });
}
