import { randomUUID } from 'node:crypto';
import { DEFAULT_APPEARANCE, themeBackground, validateAppearance } from './themes';
import type { AppearanceSettings, MessageStyle, ThemeSummary } from './themes';

export interface SavedTheme { id: string; name: string; appearance: AppearanceSettings }
const palettes = [
  ['midnight', 'Midnight', '#0c1220', '#14233b', '#101b2d', '#7396c7'],
  ['forest', 'Forest', '#0b1712', '#183c2b', '#152b24', '#80bc96'],
  ['arcane', 'Arcane', '#171022', '#39204d', '#271b3c', '#b494da'],
  ['ember', 'Ember', '#21130f', '#48251b', '#2c1b17', '#dca17b'],
  ['parchment', 'Parchment', '#f3ead5', '#e6d6b6', '#efe1c4', '#866645'],
  ['obsidian', 'Obsidian', '#000000', '#080808', '#000000', '#b9b9b9'],
];
export const BUILT_IN_THEMES: SavedTheme[] = palettes.map(([id, name, background, player, gm, accent]) => {
  const settings = structuredClone(DEFAULT_APPEARANCE);
  const style = (color: string): MessageStyle => ({ ...structuredClone(settings.input.style), color, opacity: .94,
    border: { enabled: true, color: accent, width: 1, radius: 10, variant: 'plain' } });
  settings.preset = 'custom'; settings.customColor = background;
  settings.messages = { enabled: true, player: style(player), gm: style(gm) };
  settings.input = { enabled: true, style: style(gm) };
  settings.context = { enabled: true, style: style(gm), blocks: style(player), bar: style(gm) };
  settings.events = { enabled: true, style: style(player) };
  settings.dice = { ...settings.dice, enabled: true, style: style(gm), colorsEnabled: true,
    faceColor: player, edgeColor: accent, numberColor: id === 'parchment' ? '#20180f' : '#ffffff' };
  return { id: `builtin-${id}`, name, appearance: settings };
});
export function themeSummary(theme: SavedTheme, saved: boolean): ThemeSummary {
  return { id: theme.id, name: theme.name, saved, colors: [themeBackground(theme.appearance),
    theme.appearance.messages.player.color, theme.appearance.messages.gm.color,
    theme.appearance.context.style.color, theme.appearance.input.style.border.color] };
}
export function validateThemeLibrary(value: unknown): SavedTheme[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error('Save up to 50 themes.');
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid saved theme.');
    const { id, name, appearance } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !/^saved-[a-f0-9-]{36}$/.test(id) || ids.has(id)) throw new Error('Invalid saved theme ID.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) throw new Error('Enter a theme name of 1–60 characters.');
    ids.add(id);
    return { id, name: name.trim(), appearance: validateAppearance(appearance) };
  });
}
export function makeSavedTheme(name: unknown, appearance: unknown): SavedTheme {
  return validateThemeLibrary([{ id: `saved-${randomUUID()}`, name, appearance }])[0];
}
export function applyLibraryTheme(theme: SavedTheme, current: AppearanceSettings): AppearanceSettings {
  const { appearancePinned, appearancePanelWidth, resizableMap, messageCommands, linuxBlackMenu, linuxFloatingAppearance } = current;
  return { ...structuredClone(theme.appearance), appearancePinned, appearancePanelWidth, resizableMap, messageCommands, linuxBlackMenu, linuxFloatingAppearance,
    ...(theme.id.startsWith('builtin-') ? { backgroundImage: current.backgroundImage, backgroundName: current.backgroundName } : {}) };
}
