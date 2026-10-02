import { createHash, randomUUID } from 'node:crypto';
import { lstat, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

export interface MusicFolder { id: string; path: string }
export interface LibraryTrack { id: string; title: string; url: string; folderId: string; relativePath: string }
const audioExtensions = new Set(['.mp3','.ogg','.wav','.flac','.m4a','.opus','.aac','.webm']);
export const LOCAL_AUDIO = /^fables-desktop:\/\/music\/audio\/[a-f0-9]{64}$/;
export function validateFolders(value: unknown): MusicFolder[] {
  if (!Array.isArray(value) || value.length > 16) throw new Error('Invalid music folders.');
  const ids = new Set<string>(), paths = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid music folder.');
    const input = item as Record<string, unknown>;
    if (typeof input.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(input.id) || ids.has(input.id)
      || typeof input.path !== 'string' || !path.isAbsolute(input.path) || input.path.length > 4096 || paths.has(input.path)) throw new Error('Invalid music folder.');
    ids.add(input.id); paths.add(input.path); return {id:input.id,path:input.path};
  });
}
export async function chosenFolder(location: string): Promise<MusicFolder> {
  const resolved = await realpath(location);
  if (!(await lstat(resolved)).isDirectory()) throw new Error('Choose a music folder.');
  return {id:randomUUID(),path:resolved};
}
export class MusicLibrary {
  private files = new Map<string,{file:string;root:string}>();
  private tracks: LibraryTrack[] = [];
  private folders: MusicFolder[] = [];
  private unavailable = new Set<string>();
  async scan(folders: MusicFolder[]): Promise<void> {
    const files = new Map<string,{file:string;root:string}>(), tracks: LibraryTrack[] = [], unavailable = new Set<string>();
    for (const folder of folders) {
      let count = 0, visited = 0;
      const walk = async (directory: string,depth: number): Promise<void> => {
        if (depth > 8 || count >= 1000 || visited >= 10000) return;
        const entries = await readdir(directory,{withFileTypes:true});
        entries.sort((a,b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
          if (++visited > 10000 || count >= 1000) break;
          if (entry.isSymbolicLink()) continue;
          const file = path.join(directory,entry.name);
          if (entry.isDirectory()) { try { await walk(file,depth+1); } catch { /* An unreadable nested folder can be skipped. */ } }
          else if (entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase())) {
            const relativePath = path.relative(folder.path,file), id = createHash('sha256').update(folder.id+'\0'+relativePath).digest('hex');
            files.set(id,{file,root:folder.path}); tracks.push({id,title:path.parse(entry.name).name.slice(0,100),url:`fables-desktop://music/audio/${id}`,folderId:folder.id,relativePath}); count++;
          }
        }
      };
      try { if ((await realpath(folder.path)) !== folder.path) throw new Error('Folder moved.'); await walk(folder.path,0); }
      catch { unavailable.add(folder.id); }
    }
    this.files = files; this.tracks = tracks; this.folders = folders; this.unavailable = unavailable;
  }
  state() {
    return {folders:this.folders.map(folder=>({id:folder.id,name:path.basename(folder.path),count:this.tracks.filter(track=>track.folderId===folder.id).length,unavailable:this.unavailable.has(folder.id)})),tracks:structuredClone(this.tracks)};
  }
  has(url: string): boolean { return LOCAL_AUDIO.test(url) && this.files.has(url.split('/').at(-1)!); }
  async file(id: string): Promise<string | null> {
    const allowed = this.files.get(id); if (!allowed) return null;
    try {
      const resolved = await realpath(allowed.file), relative = path.relative(allowed.root,resolved);
      if (relative.startsWith('..'+path.sep) || relative === '..' || path.isAbsolute(relative) || !(await lstat(resolved)).isFile()) return null;
      return resolved;
    } catch { return null; }
  }
}
