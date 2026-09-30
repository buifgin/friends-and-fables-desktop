import { readFile, stat, writeFile } from 'node:fs/promises';
import { validateAppearance } from './themes';
import type { AppearanceSettings } from './themes';
import { backgroundPreview, storeBackground } from './backgrounds';

const MAX_THEME_BYTES = 30 * 1024 * 1024;
export async function exportTheme(file: string, settings: AppearanceSettings, includePicture: boolean, images: string): Promise<void> {
  const preview = includePicture ? await backgroundPreview(images,settings.backgroundImage) : null;
  const { linuxBlackMenu: _menu, linuxFloatingAppearance: _floating, ...portable } = settings;
  const theme = { format:'friends-and-fables-desktop-theme', version:1,
    appearance:{...portable,backgroundImage:null,backgroundName:''},
    image:preview ? {name:settings.backgroundName,pngBase64:preview.slice('data:image/png;base64,'.length)} : null };
  await writeFile(file,`${JSON.stringify(theme,null,2)}\n`,'utf8');
}
export async function importTheme(file: string, current: AppearanceSettings, images: string): Promise<AppearanceSettings> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_THEME_BYTES) throw new Error('Choose a theme file smaller than 30 MB.');
  const raw: unknown = JSON.parse(await readFile(file,'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid theme file.');
  const theme = raw as Record<string,unknown>;
  if (theme.format !== 'friends-and-fables-desktop-theme' || theme.version !== 1) throw new Error('Unsupported theme file format or version.');
  const settings = validateAppearance(theme.appearance);
  let selected = {backgroundImage:current.backgroundImage,backgroundName:current.backgroundName};
  if (theme.image !== null && theme.image !== undefined) {
    if (!theme.image || typeof theme.image !== 'object') throw new Error('Invalid theme picture.');
    const image = theme.image as Record<string,unknown>;
    if (typeof image.name !== 'string' || image.name.length > 150 || typeof image.pngBase64 !== 'string'
      || image.pngBase64.length > 28 * 1024 * 1024 || image.pngBase64.length % 4 !== 0
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.pngBase64)) throw new Error('Invalid theme picture.');
    const buffer = Buffer.from(image.pngBase64,'base64');
    if (!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Theme pictures must be PNG images.');
    const imported = await storeBackground(buffer,image.name,images);
    selected = {backgroundImage:imported.id,backgroundName:imported.name};
  }
  // A portable theme cannot import filesystem paths or another machine's menu preferences.
  return {...settings,...selected,linuxBlackMenu:current.linuxBlackMenu,linuxFloatingAppearance:current.linuxFloatingAppearance};
}
