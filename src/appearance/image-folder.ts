import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { importBackground } from './backgrounds';
import { decodeBackground } from './image-decoder';
import type { BackgroundPage, ImportedBackground } from './backgrounds';
export interface FolderPage extends BackgroundPage { folderName: string | null }
export class ImageFolder {
  private directory: string | null = null;
  private known = new Map<string,string>();
  constructor(private file: string) {}
  async initialize(): Promise<void> {
    try {
      const raw: unknown = JSON.parse(await readFile(this.file,'utf8'));
      if (typeof raw === 'string' && (await stat(raw)).isDirectory()) this.directory = raw;
    } catch { /* A removed folder can be selected again in the picture browser. */ }
  }
  async choose(directory: string): Promise<FolderPage> {
    if (!(await stat(directory)).isDirectory()) throw new Error('Choose an image folder.');
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(`${this.file}.tmp`,JSON.stringify(directory),'utf8');
    await rename(`${this.file}.tmp`,this.file);
    this.directory=directory;this.known.clear();
    return this.page(0);
  }
  async page(offset: unknown): Promise<FolderPage> {
    if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) throw new Error('Invalid folder page.');
    if (!this.directory) return {folderName:null,items:[],total:0,nextOffset:null};
    const directory=this.directory;
    const entries=(await readdir(directory,{withFileTypes:true})).filter(e=>e.isFile() && /\.(png|jpe?g|webp)$/i.test(e.name))
      .sort((a,b)=>a.name.localeCompare(b.name));
    const items=await Promise.all(entries.slice(offset,offset+12).map(async e=>{
      const file=path.join(directory,e.name);const id=createHash('sha256').update(file).digest('hex');
      this.known.set(id,file);
      let thumbnail='', addedAt=0;
      try {
        const info=await lstat(file);addedAt=info.mtimeMs;
        if (info.isFile() && info.size <= 20*1024*1024) {
          const image=await decodeBackground(await readFile(file));const size=image.getSize();
          if (!image.isEmpty() && size.width*size.height<=16_000_000) {
            const scale=Math.min(1,160/Math.max(size.width,size.height));
            thumbnail=image.resize({width:Math.max(1,Math.round(size.width*scale)),height:Math.max(1,Math.round(size.height*scale))}).toDataURL();
          }
        }
      } catch { /* A moved or unreadable picture must not hide the rest of the folder. */ }
      return {id,name:e.name,thumbnail,addedAt};
    }));
    return {folderName:path.basename(directory),items,total:entries.length,nextOffset:offset+12<entries.length?offset+12:null};
  }
  async select(id: unknown, images: string): Promise<ImportedBackground> {
    const file=typeof id==='string'?this.known.get(id):undefined;
    if (!file || path.dirname(file)!==this.directory || !(await lstat(file)).isFile()) throw new Error('Choose a picture from the selected folder.');
    return importBackground(file,images);
  }
}
