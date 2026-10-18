import { app } from 'electron';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { settingsSection } from './settings-core';
import type { SettingsSection } from './settings-core';
export class GeneralSettings {
  private file = path.join(app.getPath('userData'), 'general-settings.json');
  private writes = Promise.resolve();
  hideDesktopTopbarInFullscreen = false;
  lastSettingsSection?: SettingsSection;
  async initialize(): Promise<void> { try { const value = JSON.parse(await readFile(this.file,'utf8')); if (typeof value.hideDesktopTopbarInFullscreen === 'boolean') this.hideDesktopTopbarInFullscreen = value.hideDesktopTopbarInFullscreen;
    try { this.lastSettingsSection = settingsSection(value.lastSettingsSection); } catch { /* No valid remembered section. */ }
  } catch { /* Use defaults. */ } }
  // Surface the last queued write failure to the shutdown coordinator.
  async flush(): Promise<void> { await this.writes; }
  save(value: unknown): Promise<void> {
    if (typeof value !== 'boolean') throw new Error('Invalid fullscreen preference.');
    return this.persist({hideDesktopTopbarInFullscreen:value});
  }
  saveSection(value: unknown): Promise<void> {
    return this.persist({lastSettingsSection:settingsSection(value)});
  }
  private persist(patch: {hideDesktopTopbarInFullscreen?:boolean;lastSettingsSection?:SettingsSection}):Promise<void> {
    this.writes = this.writes.catch(()=>{}).then(async()=>{
      const value={hideDesktopTopbarInFullscreen:this.hideDesktopTopbarInFullscreen,...(this.lastSettingsSection?{lastSettingsSection:this.lastSettingsSection}:{}),...patch};
      await mkdir(path.dirname(this.file),{recursive:true});
      await writeFile(`${this.file}.tmp`,JSON.stringify(value)+'\n','utf8');
      await rename(`${this.file}.tmp`,this.file);
      this.hideDesktopTopbarInFullscreen=value.hideDesktopTopbarInFullscreen;
      this.lastSettingsSection=value.lastSettingsSection;
    }); return this.writes;
  }
}
