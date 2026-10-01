import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GLOSSARY_VERSION } from './russian-glossary';

export class TranslationCache {
  private entries = new Map<string, string>();
  private bytes = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private writes: Promise<void> = Promise.resolve();
  constructor(private file: string) {}
  private key(text: string): string { return createHash('sha256').update(`en-ru:argos:3:glossary${GLOSSARY_VERSION}\n` + text).digest('hex'); }
  async initialize(): Promise<void> {
    try {
      if ((await stat(this.file)).size > 8 * 1024 * 1024) return;
      const value = JSON.parse(await readFile(this.file, 'utf8'));
      if (value.version !== 1 || !Array.isArray(value.entries)) return;
      for (const entry of value.entries.slice(-2000)) {
        if (Array.isArray(entry) && typeof entry[0] === 'string' && /^[a-f0-9]{64}$/.test(entry[0])
          && typeof entry[1] === 'string' && entry[1].length <= 8000) this.store(entry[0], entry[1]);
      }
    } catch { /* Missing or damaged cache never prevents the app opening. */ }
  }
  get(text: string): string | undefined {
    const key = this.key(text), value = this.entries.get(key);
    if (value !== undefined) { this.entries.delete(key); this.entries.set(key, value); }
    return value;
  }
  set(text: string, translated: string): void {
    this.store(this.key(text), translated);
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush().catch(() => console.warn('Unable to save the local translation cache.')); }, 500);
  }
  private store(key: string, value: string): void {
    const previous = this.entries.get(key);
    if (previous !== undefined) this.bytes -= Buffer.byteLength(previous) + 64;
    this.entries.delete(key); this.entries.set(key, value); this.bytes += Buffer.byteLength(value) + 64;
    while (this.entries.size > 2000 || this.bytes > 6 * 1024 * 1024) {
      const [first, text] = this.entries.entries().next().value!;
      this.entries.delete(first); this.bytes -= Buffer.byteLength(text) + 64;
    }
  }
  get size(): number { return this.entries.size; }
  async clear(): Promise<void> { this.entries.clear(); this.bytes = 0; await this.flush(); }
  flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    const value = JSON.stringify({ version: 1, entries: [...this.entries] });
    this.writes = this.writes.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(this.file + '.tmp', value, { mode: 0o600 });
      await rename(this.file + '.tmp', this.file);
    });
    return this.writes;
  }
}
