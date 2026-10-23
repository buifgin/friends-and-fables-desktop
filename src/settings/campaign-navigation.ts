import { SETTINGS_SECTIONS, type SettingsSection } from './settings-core';

type Destination = Exclude<SettingsSection, 'campaign'>;
export interface CampaignNavigationContext { contentsId: number; url: string; document: number; request: number; }
export interface CampaignNavigationCapability extends CampaignNavigationContext { ticket: string; destinations: readonly Destination[]; }
export interface CampaignNavigationRequest { section: Destination; ticket: string; }

export function parseCampaignNavigationRequest(value: unknown): CampaignNavigationRequest | null {
  if (typeof value !== 'string' || value.length > 1024 || /[\u0000-\u0020\u007f]/.test(value) || !value.startsWith('fables-desktop://settings/select-campaign-section?')) return null;
  try {
    const url = new URL(value), keys = [...url.searchParams.keys()];
    if (url.protocol !== 'fables-desktop:' || url.hostname !== 'settings' || url.port || url.username || url.password || url.hash
      || url.pathname !== '/select-campaign-section' || keys.length !== 2 || keys.some(key => key !== 'section' && key !== 'ticket')
      || url.searchParams.getAll('section').length !== 1 || url.searchParams.getAll('ticket').length !== 1) return null;
    const section = url.searchParams.get('section'), ticket = url.searchParams.get('ticket');
    if (!section || section === 'campaign' || !SETTINGS_SECTIONS.includes(section as SettingsSection)
      || !ticket || !/^[A-Za-z0-9_-]{1,128}$/.test(ticket)) return null;
    return { section: section as Destination, ticket };
  } catch { return null; }
}

export function authorizeCampaignNavigation(value: unknown, capability: CampaignNavigationCapability | null, current: CampaignNavigationContext): CampaignNavigationRequest | null {
  const parsed = parseCampaignNavigationRequest(value);
  if (!parsed || !capability || parsed.ticket !== capability.ticket || !capability.destinations.includes(parsed.section)
    || capability.contentsId !== current.contentsId || capability.url !== current.url
    || capability.document !== current.document || capability.request !== current.request) return null;
  try {
    const url = new URL(current.url);
    if (url.origin !== 'https://play.fables.gg' || url.username || url.password
      || !/^\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/play\/?$/i.test(url.pathname)) return null;
  } catch { return null; }
  return parsed;
}
