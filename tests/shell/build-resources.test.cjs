const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,mkdir,writeFile,readFile,access,rm}=require('node:fs/promises');
const path=require('node:path'),os=require('node:os');
const {packagerConfig}=require('../../forge.config.cjs');

test('Forge excludes local agent instruments but includes nested app assets',()=>{
 const ignored=name=>packagerConfig.ignore.some(rule=>rule.test(name));
 for(const name of ['/.codex/config.toml','/.codex/worktrees/task/worker/src/main.ts','/AGENTS.md','/assets/music/AGENTS.md','/src/music/AGENTS.md']) assert.equal(ignored(name),true,name);
 for(const name of ['/dist/main.js','/dist/music/music-preload.js','/assets/music/music.html','/assets/shared/settings-theme.js','/assets/shell/tray-icon.png']) assert.equal(ignored(name),false,name);
});

test('electron-builder excludes local guides inside otherwise included asset folders',()=>{
 const {files}=require('../../electron-builder.config.cjs');
 const included=name=>files.some(pattern=>!pattern.startsWith('!')&&path.posix.matchesGlob(name,pattern)) &&
  !files.some(pattern=>pattern.startsWith('!')&&path.posix.matchesGlob(name,pattern.slice(1)));
 for(const name of ['assets/music/AGENTS.md','assets/shared/AGENTS.md','AGENTS.md','.codex/config.toml']) assert.equal(included(name),false,name);
 for(const name of ['dist/main.js','dist/music/music-preload.js','assets/music/music.html','assets/shared/settings-theme.js','assets/shell/tray-icon.png']) assert.equal(included(name),true,name);
});

test('clean builds remove stale compiled modules without removing source or assets',async()=>{
 const {cleanDist}=require('../../scripts/clean-dist.cjs');
 const root=await mkdtemp(path.join(os.tmpdir(),'fables-build-test-'));
 try {
  for(const directory of ['dist/music','src/music','assets/music']) await mkdir(path.join(root,directory),{recursive:true});
  await writeFile(path.join(root,'dist/old-preload.js'),'stale');
  await writeFile(path.join(root,'dist/music/removed.js'),'stale');
  await writeFile(path.join(root,'src/music/music.ts'),'source');
  await writeFile(path.join(root,'assets/music/music.html'),'asset');
  await cleanDist(root);
  await assert.rejects(access(path.join(root,'dist')),error=>error.code==='ENOENT');
  assert.equal(await readFile(path.join(root,'src/music/music.ts'),'utf8'),'source');
  assert.equal(await readFile(path.join(root,'assets/music/music.html'),'utf8'),'asset');
  await cleanDist(root);
 } finally {await rm(root,{recursive:true,force:true});}
});
