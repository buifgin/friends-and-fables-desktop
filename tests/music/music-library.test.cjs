const {test}=require('node:test'),assert=require('node:assert/strict');
const {mkdtemp,mkdir,writeFile,symlink,rm}=require('node:fs/promises');
const path=require('node:path'),os=require('node:os');
const {MusicLibrary,chosenFolder,validateFolders}=require('../../dist/music/music-library');
test('Folder sources restore stable audio URLs and restrict links to authorized files',async()=>{
 const temporary=await mkdtemp(path.join(os.tmpdir(),'fables-local-music-'));
 try {
  const root=path.join(temporary,'songs');await mkdir(path.join(root,'nested'),{recursive:true});
  await writeFile(path.join(root,'song.MP3'),'audio');await writeFile(path.join(root,'nested','battle.ogg'),'audio');await writeFile(path.join(root,'notes.txt'),'private');
  const folder=await chosenFolder(root),library=new MusicLibrary();await library.scan([folder]);
  const first=library.state();assert.equal(first.tracks.length,2);assert.equal(first.folders[0].count,2);assert(!JSON.stringify(first).includes(root));
  const restored=new MusicLibrary();await restored.scan(validateFolders(JSON.parse(JSON.stringify([folder]))));assert.deepEqual(restored.state(),first,'Reopening preserves opaque audio URLs without revealing filesystem paths.');
  const song=first.tracks.find(track=>track.title==='song');assert.equal(await restored.file(song.id),path.join(root,'song.MP3'));assert.equal(await restored.file('..'),null);
  if(process.platform!=='win32'){
   await symlink(temporary,path.join(root,'external-directory'));await restored.scan([folder]);assert.equal(restored.state().tracks.length,2,'Symlink directories are not followed.');
   await rm(path.join(root,'song.MP3'));await symlink(path.join(temporary,'private.mp3'),path.join(root,'song.MP3'));await writeFile(path.join(temporary,'private.mp3'),'private');
   assert.equal(await restored.file(song.id),null,'A replaced symlink cannot escape its chosen source.');
  }
  await restored.scan([]);assert.equal(await restored.file(song.id),null);assert.deepEqual(restored.state(),{folders:[],tracks:[]});
  for(const input of [[{id:'a',path:'relative'}],[folder,folder],[{id:'../escape',path:root}],Array.from({length:17},(_,i)=>({id:String(i),path:path.join(temporary,String(i))}))])assert.throws(()=>validateFolders(input));
 } finally {await rm(temporary,{recursive:true,force:true});}
});
