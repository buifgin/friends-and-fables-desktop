export const SETTINGS_SECTIONS = ['campaign', 'appearance', 'translation', 'instructions', 'music', 'general'] as const;
export type SettingsSection = typeof SETTINGS_SECTIONS[number];
export function settingsSection(value: unknown): SettingsSection {
  if (typeof value !== 'string' || !SETTINGS_SECTIONS.includes(value as SettingsSection)) throw new Error('Invalid settings section.');
  return value as SettingsSection;
}
export function desktopBarVisible(fullscreen: boolean, hide: boolean, override: boolean): boolean { return !(fullscreen && hide) || override; }
export function settingsGeometry(width: number, height: number, requested: number, inset: number) {
  const panelWidth = Math.max(0, Math.min(width, Math.max(460, Math.min(1000, width - 360, requested))));
  const navWidth = Math.min(126, panelWidth);
  const y = Math.max(0, inset), h = Math.max(0, height - y);
  return {panel: {x:0,y,width:panelWidth,height:h}, navigation: {x:0,y,width:navWidth,height:h},
    editor: {x:navWidth,y,width:Math.max(0,panelWidth-navWidth),height:h},
    website:{x:panelWidth,y,width:Math.max(0,width-panelWidth),height:h}};
}
