import { nativeImage } from 'electron';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ImportedBackground { id: string; name: string; preview: string }
const MAX_BYTES = 20 * 1024 * 1024;

export async function importBackground(file: string, directory: string): Promise<ImportedBackground> {
  if (!['.png', '.jpg', '.jpeg'].includes(path.extname(file).toLowerCase())) {
    throw new Error('Choose a PNG or JPEG image.');
  }
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_BYTES) throw new Error('Choose an image smaller than 20 MB.');
  const image = nativeImage.createFromBuffer(await readFile(file));
  if (image.isEmpty()) throw new Error('This file could not be read as an image.');
  const size = image.getSize();
  if (size.width * size.height > 16_000_000) throw new Error('Choose an image with at most 16 million pixels.');
  // Store a decoded PNG rather than trusting an extension or keeping a source path.
  const png = image.toPNG();
  if (png.length > MAX_BYTES) throw new Error('The decoded image is too large. Try a smaller picture.');
  const id = `${createHash('sha256').update(png).digest('hex')}.png`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, id), png);
  return { id, name: path.basename(file).replace(/[\x00-\x1f]/g, '').slice(0, 150), preview: `data:image/png;base64,${png.toString('base64')}` };
}

export async function backgroundPreview(directory: string, id: string | null): Promise<string | null> {
  if (!id) return null;
  if (!/^[a-f0-9]{64}\.png$/.test(id)) throw new Error('Invalid imported image.');
  return `data:image/png;base64,${(await readFile(path.join(directory, id))).toString('base64')}`;
}
