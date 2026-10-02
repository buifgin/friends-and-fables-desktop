import type { BrowserWindow } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
export const APPEARANCE_TITLE = 'Appearance — Friends & Fables Desktop';

export function floatAppearance(window: BrowserWindow, enabled: boolean): Promise<void> {
  return floatSettingsWindow(window, APPEARANCE_TITLE, enabled);
}

export async function floatSettingsWindow(window: BrowserWindow, title: string, enabled: boolean): Promise<void> {
  if (process.platform !== 'linux' || !process.env.HYPRLAND_INSTANCE_SIGNATURE || window.isDestroyed()) return;
  // Use a compositor address belonging to this process, never the focused window.
  // No persistent Hyprland rules or user configuration files are changed.
  for (let attempt = 0; attempt < 4 && !window.isDestroyed(); attempt++) {
    try {
      const { stdout } = await run('hyprctl', ['-j', 'clients'], { timeout: 1500, maxBuffer: 1024 * 1024 });
      const clients: unknown = JSON.parse(stdout);
      if (!Array.isArray(clients)) return;
      const client = clients.find(c => c && c.pid === process.pid && c.title === title
        && typeof c.address === 'string' && /^0x[\da-f]+$/i.test(c.address));
      if (client && !window.isDestroyed()) {
        await run('hyprctl', ['dispatch', enabled ? 'setfloating' : 'settiled', `address:${client.address}`], { timeout: 1500 });
        return;
      }
    } catch (error) { console.warn('Could not set Appearance floating mode:', (error as Error).message); return; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
