import http from 'node:http';

export class LocalTranslator {
  private requests = new Set<http.ClientRequest>();
  constructor(private port: number, private timeoutMs = 30000) {}
  abort(): void { for (const request of this.requests) request.destroy(new Error('Translation canceled.')); }
  private json(route: '/languages' | '/translate', body?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const data = body === undefined ? null : JSON.stringify(body);
      // Explicit numeric loopback, no proxy, credentials, DNS, or redirects.
      const request = http.request({ hostname: '127.0.0.1', port: this.port, path: route,
        method: data ? 'POST' : 'GET', agent: false,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
      }, response => {
        if (response.statusCode !== 200) { response.resume(); reject(new Error('The local translator rejected the request.')); return; }
        const chunks: Buffer[] = []; let bytes = 0;
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 128 * 1024) { request.destroy(new Error('The local translator response is too large.')); return; }
          chunks.push(chunk);
        });
        response.on('error', () => reject(new Error('Unable to read the local translator response.')));
        response.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
          catch { reject(new Error('The local translator returned an invalid response.')); } });
      });
      this.requests.add(request);
      const deadline = setTimeout(() => request.destroy(new Error('Local translator timed out.')), data ? this.timeoutMs : Math.min(2000, this.timeoutMs));
      request.on('close', () => { clearTimeout(deadline); this.requests.delete(request); });
      request.on('error', () => reject(new Error('Local translator unavailable. Start the English/Russian service and retry.')));
      request.setTimeout(data ? this.timeoutMs : Math.min(2000, this.timeoutMs), () => request.destroy(new Error('Local translator timed out.')));
      request.end(data ?? undefined);
    });
  }
  async available(): Promise<boolean> {
    const languages = await this.json('/languages');
    return Array.isArray(languages) && languages.some(language => language?.code === 'en' && Array.isArray(language.targets) && language.targets.includes('ru'));
  }
  async translate(texts: string[]): Promise<string[]> {
    if (texts.length < 1 || texts.length > 16 || texts.some(text => typeof text !== 'string' || text.length > 1500)
      || texts.join('').length > 8000) throw new Error('Invalid translation batch.');
    const result = await this.json('/translate', { q: texts, source: 'en', target: 'ru', format: 'text' }) as { translatedText?: unknown };
    if (!Array.isArray(result?.translatedText) || result.translatedText.length !== texts.length
      || result.translatedText.some(text => typeof text !== 'string' || !text.trim() || text.length > 8000)) throw new Error('The local translator returned an invalid translation.');
    return result.translatedText as string[];
  }
}
