import { themeBackground } from '../appearance/themes';
import type { AppearanceSettings } from '../appearance/themes';
import type { CampaignPanelPalette } from './campaign-panel';

// Match the bundled Settings palette when styling the native Campaign section.
export function settingsPalette(settings:Pick<AppearanceSettings,'preset'|'customColor'>):CampaignPanelPalette {
  const background=themeBackground(settings);
  const color=[1,3,5].map(i=>parseInt(background.slice(i,i+2),16));
  const linear=color.map(c=>{const n=c/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});
  const light=linear[0]*.2126+linear[1]*.7152+linear[2]*.0722>.179;
  const target=light?[0,0,0]:[255,255,255];
  const mix=(amount:number)=>`rgb(${color.map((c,i)=>Math.round(c+(target[i]-c)*amount)).join(',')})`;
  return {background,foreground:light?'#111111':'#f5f5f5',border:mix(.28),panel:mix(.065),selected:mix(.13),accent:light?'#71501b':'#d8bb82'};
}
