import { nativeImage } from 'electron';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ImportedBackground { id: string; name: string; preview: string }
export interface BackgroundPage { items: { id: string; name: string; thumbnail: string; addedAt: number }[]; total: number; nextOffset: number | null }
const MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_ID = /^[a-f0-9]{64}\.png$/;
type Index = Record<string, { name: string; addedAt: number }>;
async function index(directory: string): Promise<Index> {
  try {
    const raw: unknown = JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const entries = Object.entries(raw).filter(([id, entry]) => IMAGE_ID.test(id) && entry && typeof entry.name === 'string' && Number.isFinite(entry.addedAt));
    return Object.fromEntries(entries);
  } catch { return {}; }
}
export async function storeBackground(buffer: Buffer, name: string, directory: string): Promise<ImportedBackground> {
  if (buffer.length > MAX_BYTES) throw new Error('Choose an image smaller than 20 MB.');
  const image = nativeImage.createFromBuffer(buffer);
  if (image.isEmpty()) throw new Error('This file could not be read as an image.');
  const size = image.getSize();
  if (size.width * size.height > 16_000_000) throw new Error('Choose an image with at most 16 million pixels.');
  const png = image.toPNG();
  if (png.length > MAX_BYTES) throw new Error('The decoded image is too large. Try a smaller picture.');
  const id = `${createHash('sha256').update(png).digest('hex')}.png`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, id), png);
  const safeName = path.basename(name).replace(/[\x00-\x1f]/g, '').slice(0, 150) || 'Imported picture';
  const metadata = await index(directory);
  metadata[id] = { name: safeName, addedAt: Date.now() };
  await writeFile(path.join(directory, 'index.json.tmp'), JSON.stringify(metadata), 'utf8');
  await rename(path.join(directory, 'index.json.tmp'), path.join(directory, 'index.json'));
  return { id, name: safeName, preview: `data:image/png;base64,${png.toString('base64')}` };
}
export async function importBackground(file: string, directory: string): Promise<ImportedBackground> {
  if (!['.png', '.jpg', '.jpeg'].includes(path.extname(file).toLowerCase())) throw new Error('Choose a PNG or JPEG image.');
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_BYTES) throw new Error('Choose an image smaller than 20 MB.');
  return storeBackground(await readFile(file), path.basename(file), directory);
}
export async function backgroundPreview(directory: string, id: string | null): Promise<string | null> {
  if (!id) return null;
  if (!IMAGE_ID.test(id)) throw new Error('Invalid imported image.');
  return `data:image/png;base64,${(await readFile(path.join(directory, id))).toString('base64')}`;
}
export async function backgroundLibrary(directory: string, offset: unknown, names: Record<string, string>): Promise<BackgroundPage> {
  if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) throw new Error('Invalid picture library page.');
  const metadata = await index(directory);
  let files: string[];
  try { files = (await readdir(directory)).filter(id => IMAGE_ID.test(id)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { items: [], total: 0, nextOffset: null }; throw error; }
  const all = await Promise.all(files.map(async id => ({ id, name: metadata[id]?.name ?? names[id] ?? `Imported picture ${id.slice(0,8)}`,
    addedAt: metadata[id]?.addedAt ?? (await stat(path.join(directory,id))).mtimeMs })));
  all.sort((a,b) => b.addedAt - a.addedAt || a.id.localeCompare(b.id));
  const items = await Promise.all(all.slice(offset,offset+12).map(async entry => {
    const image = nativeImage.createFromBuffer(await readFile(path.join(directory,entry.id)));
    const size = image.getSize();
    const scale = Math.min(1,160/Math.max(size.width,size.height));
    const thumbnail = image.isEmpty() ? '' : image.resize({width:Math.max(1,Math.round(size.width*scale)),height:Math.max(1,Math.round(size.height*scale))}).toDataURL();
    return {...entry,thumbnail};
  }));
  return { items, total: all.length, nextOffset: offset+12<all.length ? offset+12 : null };
}
export async function selectBackground(directory: string, id: unknown, names: Record<string,string>): Promise<ImportedBackground> {
  if (typeof id !== 'string' || !IMAGE_ID.test(id)) throw new Error('Invalid imported image.');
  const preview = await backgroundPreview(directory,id);
  const metadata = await index(directory);
  return { id, name: metadata[id]?.name ?? names[id] ?? `Imported picture ${id.slice(0,8)}`, preview: preview! };
}
