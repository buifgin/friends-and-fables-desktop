import { app } from 'electron';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
export class GeneralSettings {
  private file = path.join(app.getPath('userData'), 'general-settings.json');
  private writes = Promise.resolve();
  hideDesktopTopbarInFullscreen = false;
  async initialize(): Promise<void> { try { const value = JSON.parse(await readFile(this.file,'utf8')); if (typeof value.hideDesktopTopbarInFullscreen === 'boolean') this.hideDesktopTopbarInFullscreen = value.hideDesktopTopbarInFullscreen; } catch { /* Default off. */ } }
  save(value: unknown): Promise<void> {
    if (typeof value !== 'boolean') throw new Error('Invalid fullscreen preference.');
    this.writes = this.writes.catch(()=>{}).then(async()=>{
      await mkdir(path.dirname(this.file),{recursive:true});
      await writeFile(`${this.file}.tmp`,JSON.stringify({hideDesktopTopbarInFullscreen:value})+'\n','utf8');
      await rename(`${this.file}.tmp`,this.file); this.hideDesktopTopbarInFullscreen=value;
    }); return this.writes;
  }
}
