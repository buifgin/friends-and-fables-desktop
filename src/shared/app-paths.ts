import path from 'node:path';

// Compiles to dist/shared; works unchanged under resources/app.asar.
// Callers use fixed relative paths or protocol whitelist entries, never request paths.
export function appPath(...parts: string[]): string {
  return path.join(__dirname, '../..', ...parts);
}
