export interface MusicTrack { id: string; title: string; url: string }
export interface MusicSettings {
  tracks: MusicTrack[];
  selected: string | null;
  volume: number;
  muted: boolean;
  loop: boolean;
}
export const DEFAULT_MUSIC: MusicSettings = { tracks: [], selected: null, volume: .5, muted: false, loop: false };

export function audioUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid audio link.');
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) throw new Error('Use an HTTPS audio link without credentials.');
  return url.href;
}

export function validateMusic(value: unknown): MusicSettings {
  if (!value || typeof value !== 'object') throw new Error('Invalid music preferences.');
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.tracks) || input.tracks.length > 50) throw new Error('The playlist supports up to 50 tracks.');
  const ids = new Set<string>();
  const tracks = input.tracks.map((item: unknown): MusicTrack => {
    if (!item || typeof item !== 'object') throw new Error('Invalid track.');
    const track = item as Record<string, unknown>;
    if (typeof track.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(track.id) || ids.has(track.id)) throw new Error('Invalid track ID.');
    if (typeof track.title !== 'string' || !track.title.trim() || track.title.length > 100) throw new Error('Invalid track title.');
    ids.add(track.id);
    return { id: track.id, title: track.title.trim(), url: audioUrl(track.url) };
  });
  if (input.selected !== null && (typeof input.selected !== 'string' || !ids.has(input.selected))) throw new Error('Invalid selected track.');
  if (typeof input.volume !== 'number' || !Number.isFinite(input.volume) || input.volume < 0 || input.volume > 1
    || typeof input.muted !== 'boolean' || typeof input.loop !== 'boolean') throw new Error('Invalid playback preferences.');
  return { tracks, selected: input.selected, volume: input.volume, muted: input.muted, loop: input.loop };
}
