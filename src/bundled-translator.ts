import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

export interface TranslatorEndpoint { port: number; token: string }
interface LaunchOptions { command?: string; args?: string[]; startupTimeoutMs?: number }

/** Owns a private service. Nothing in the website receives its port or secret. */
export class BundledTranslator {
  private child: ChildProcessWithoutNullStreams | undefined;
  private starting: Promise<TranslatorEndpoint> | undefined;
  private endpoint: TranslatorEndpoint | undefined;
  private cancel: (() => void) | undefined;
  constructor(private root: string, private options: LaunchOptions = {}) {}
  start(): Promise<TranslatorEndpoint> {
    if (this.endpoint) return Promise.resolve(this.endpoint);
    if (this.starting) return this.starting;
    const token = randomBytes(32).toString('hex');
    const child = this.child = spawn(this.options.command ?? path.join(this.root, 'python.exe'),
      this.options.args ?? ['-I', '-B', '-u', path.join(this.root, 'service.py')],
      { cwd: this.root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONUTF8: '1', PYTHONNOUSERSITE: '1' } });
    // Ignore diagnostic output rather than recording any model/source content.
    child.stderr.resume();
    child.stdin.on('error', () => {});
    const starting = new Promise<TranslatorEndpoint>((resolve, reject) => {
      let output = '', settled = false;
      const deadline = setTimeout(() => fail(), this.options.startupTimeoutMs ?? 45000);
      const fail = (): void => {
        if (settled) return;
        settled = true; clearTimeout(deadline); child.kill();
        reject(new Error('The included translator could not start. The dictionary and cached translations still work.'));
      };
      this.cancel = fail;
      child.on('error', fail);
      child.on('exit', () => {
        fail();
        if (this.child === child) { this.child = undefined; this.endpoint = undefined; }
      });
      child.stdout.on('data', (data: Buffer) => {
        if (settled) return;
        output += data.toString('utf8');
        if (output.length > 4096) { fail(); return; }
        if (!output.includes('\n')) return;
        try {
          const ready = JSON.parse(output.split('\n')[0]) as { port?: unknown };
          if (!Number.isInteger(ready.port) || Number(ready.port) < 1 || Number(ready.port) > 65535 || this.child !== child) { fail(); return; }
          settled = true; clearTimeout(deadline);
          this.endpoint = { port: Number(ready.port), token }; resolve(this.endpoint);
        } catch { fail(); }
      });
      child.stdin.write(JSON.stringify({ token }) + '\n');
    });
    this.starting = starting;
    void starting.finally(() => { if (this.starting === starting) { this.starting = undefined; this.cancel = undefined; } }).catch(() => {});
    return starting;
  }
  async stop(): Promise<void> {
    const child = this.child;
    this.cancel?.(); this.cancel = undefined; this.child = undefined; this.endpoint = undefined; this.starting = undefined;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>(resolve => {
      const deadline = setTimeout(() => { child.kill(); resolve(); }, 1500);
      child.once('exit', () => { clearTimeout(deadline); resolve(); });
      child.stdin.end();
    });
  }
}
