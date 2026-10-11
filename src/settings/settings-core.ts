export const SETTINGS_SECTIONS = ['campaign', 'appearance', 'translation', 'instructions', 'music', 'combat', 'general'] as const;
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

export interface CombatPreferences { campaignId: string; automaticDamage: boolean; hideIntermediateFranz: boolean; }
export interface CombatSettingsAdapter {
  get(): Promise<CombatPreferences | null>;
  save(value: CombatPreferences): Promise<CombatPreferences | null>;
}
export function combatPreferences(value: unknown): CombatPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid combat preferences.');
  const p = value as Partial<CombatPreferences>;
  if (Object.keys(p).length !== 3 || typeof p.campaignId !== 'string' || !p.campaignId || p.campaignId.length > 256 || /[\/\s?#]/.test(p.campaignId)
    || typeof p.automaticDamage !== 'boolean' || typeof p.hideIntermediateFranz !== 'boolean') throw new Error('Invalid combat preferences.');
  return { campaignId: p.campaignId, automaticDamage: p.automaticDamage, hideIntermediateFranz: p.automaticDamage && p.hideIntermediateFranz };
}
