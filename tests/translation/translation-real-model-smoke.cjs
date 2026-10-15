/* Native, synthetic-only integration: run through the coordinator's isolated-native
 * runner with FABLES_REAL_MODEL_SOCKET and FABLES_TEST_APP_ROOT. Node import is
 * deliberately offline and exports every renderer program for vm.Script checks. */
const assert=require('node:assert/strict');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs/promises');
const sentences=[
 'The silver lantern illuminates a narrow path through the ancient forest.',
 'A quiet traveler watches the distant mountains beneath the evening sky.',
 'The wooden bridge crosses a deep river beside the abandoned village.',
 'A gentle wind carries the scent of flowers across the peaceful valley.',
 'The old tower stands above the trees while clouds gather on the horizon.',
 'A small boat waits near the shore until the morning sunlight returns.'
];
const source=sentences.join(' ');
const protectedSource='Franz accompanies Aria Moonwhisper along the road with 1d20 + 5 near https://example.com/room.';
const recoverySource='The unfamiliar cavern opens beneath the distant waterfall.';
const html=`<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;height:100%;overflow:hidden;background:#161820;color:#eee;font:16px/24px sans-serif}
#viewport{height:520px;width:620px;overflow:hidden;margin:16px}#feed{height:100%;overflow-y:auto;overflow-x:hidden;overflow-anchor:none}
article{box-sizing:border-box;width:100%;padding:12px;border:1px solid #555}p{margin:0 0 12px}#anchor{height:24px}input,textarea{display:block}button{font:inherit}
</style><main id="viewport"><div id="feed"><div style="height:100px" translate="no">Synthetic fixture</div><div id="anchor" translate="no">Stable anchor</div>
<article id="card"><div class="prose"><p id="story">${source}</p><p id="protected">${protectedSource}</p><p id="russian">Путник идёт по тихой дороге.</p></div></article>
<article id="late-card"><div class="prose" id="late"></div></article>
<input id="draft" value="The original input draft."><textarea id="textarea">The original textarea draft.</textarea><div id="editor" contenteditable="true">The original editable draft.</div>
<button id="listener" type="button" translate="no">Native action</button><div style="height:700px" translate="no">Synthetic spacer</div></div></main>
<script>window.refs={card:document.getElementById('card'),late:document.getElementById('late-card'),story:document.getElementById('story').firstChild,protected:document.getElementById('protected').firstChild,draft:document.getElementById('draft'),editor:document.getElementById('editor')};window.clicks=0;document.getElementById('listener').addEventListener('click',()=>window.clicks++);document.getElementById('feed').scrollTop=80;</script>`;
function snapshot(){
 const get=id=>document.getElementById(id),rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 const glyph=node=>{const range=document.createRange();range.selectNodeContents(node);const r=range.getClientRects()[0];return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null;};
 const story=get('story'),protectedText=get('protected').textContent;
 return {story:story.textContent,protectedText,recovery:get('recovery')?.textContent,
  russian:get('russian').textContent,draft:get('draft').value,textarea:get('textarea').value,editor:get('editor').textContent,
  same:refs.card===get('card')&&refs.late===get('late-card')&&refs.story===story.firstChild&&refs.protected===get('protected').firstChild&&refs.draft===get('draft')&&refs.editor===get('editor'),
  card:rect(get('card')),storyRect:rect(story),viewport:rect(get('viewport')),anchor:glyph(get('anchor')),storyGlyph:glyph(story),
  scroll:get('feed').scrollTop,feed:{client:get('feed').clientHeight,scroll:get('feed').scrollHeight,width:get('feed').clientWidth,scrollWidth:get('feed').scrollWidth},
  outer:{client:get('viewport').clientHeight,scroll:get('viewport').scrollHeight,bodyClient:document.documentElement.clientHeight,bodyScroll:document.documentElement.scrollHeight},
  pending:!!story.closest('[data-ff-translation-blank]'),visible:document.visibilityState,
  protectedVisible:!get('protected').closest('[data-ff-translation-blank]')};
}
function frame(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(SNAPSHOT()))));}
const scripts={snapshot:`(${snapshot.toString()})()`,frame:`(${frame.toString().replace('SNAPSHOT()',`(${snapshot.toString()})()`)})()`};
module.exports={html,scripts,source,protectedSource,recoverySource};
if(process.versions.electron)void native();
async function native(){
 const {app,BrowserWindow,session}=require('electron');
 const appRoot=process.env.FABLES_TEST_APP_ROOT||path.resolve(__dirname,'../..');
 const {TranslationManager}=require(path.join(appRoot,'dist/translation/translation'));
 let manager,server,profile,window,evidenceDir,stage='startup',mode='hold',release,backendCalls=0,attempts=0,failures=0,languageCalls=0;
 const requests=new Set(),samples=[],batches=[];
 const started=Date.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const wait=async(predicate,label,limit=12000)=>{const end=Date.now()+limit;while(Date.now()<end){if(await predicate())return;await sleep(25);}throw Error(`Timed out at ${label}`);};
 const log=value=>console.log(JSON.stringify({stage,elapsedMs:Date.now()-started,...value}));
 const timer=setTimeout(()=>{console.error(`Real-model fixture exceeded 55s at ${stage}`);app.exit(1);},55000);
 app.on('window-all-closed',()=>{});
 try{
  assert(path.isAbsolute(process.env.FABLES_REAL_MODEL_SOCKET||''),'An absolute coordinator-owned Unix bridge is required.');
  if(process.env.FABLES_REAL_MODEL_EVIDENCE_DIR){
   const requested=process.env.FABLES_REAL_MODEL_EVIDENCE_DIR;
   const liveRoot=path.join(appRoot,'.codex/workflow/tasks/post-audit-regressions-2026-10-13/live');
   const inside=(root,target)=>{const relative=path.relative(root,target);return relative!==''&&!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative);};
   assert(path.isAbsolute(requested)&&inside(liveRoot,path.resolve(requested)),'Native evidence directory must be an absolute child of the coordinator task live directory.');
   await fs.mkdir(requested,{recursive:true});
   evidenceDir=await fs.realpath(requested);
   assert(inside(await fs.realpath(liveRoot),evidenceDir),'Native evidence directory must remain inside task live after resolving symlinks.');
  }
  // Never accept a user profile path: both preferences and cache are disposable.
  profile=await fs.mkdtemp(path.join(os.tmpdir(),'fables-real-model-dom-'));app.setPath('userData',profile);await app.whenReady();
  server=http.createServer(async(req,res)=>{
   try{
    const languages=req.method==='GET'&&req.url==='/languages',translate=req.method==='POST'&&req.url==='/translate';
    if(!languages&&!translate){res.writeHead(404).end();return;}
    let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>32768)throw Error('Oversized private request');body+=chunk;}
    if(languages){assert.equal(bytes,0);languageCalls++;}
    if(translate){
     const value=JSON.parse(body);assert.deepEqual(Object.keys(value).sort(),['format','q','source','target']);
     assert.equal(value.source,'en');assert.equal(value.target,'ru');assert.equal(value.format,'text');
     assert(Array.isArray(value.q)&&value.q.length>0&&value.q.length<=16&&value.q.every(q=>typeof q==='string'&&q.length<=1500)&&value.q.join('').length<=8000);
     assert(value.q.every(q=>!/[\p{Script=Cyrillic}]/u.test(q)&&!q.includes('Franz')&&!q.includes('Aria Moonwhisper')&&!q.includes('https://')&&!q.includes('1d20')),'Protected literals cannot reach the English model.');
     attempts++;batches.push(value.q);log({attempt:attempts,mode,batchSize:value.q.length});
     if(mode==='fail'){failures++;res.writeHead(503).end();return;}
     if(mode==='hold'||mode==='progress')await new Promise((resolve,reject)=>{const deadline=setTimeout(()=>reject(Error('Private request gate exceeded 12s')),12000);release=()=>{clearTimeout(deadline);release=undefined;resolve();};});
     backendCalls++;
    }
    if(res.destroyed)return;
    await new Promise((resolve,reject)=>{
     const upstream=http.request({socketPath:process.env.FABLES_REAL_MODEL_SOCKET,path:req.url,method:req.method,agent:false,headers:translate?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}},response=>{
      const chunks=[];let size=0;response.on('data',chunk=>{size+=chunk.length;if(size>131072)upstream.destroy(Error('Oversized bridge response'));else chunks.push(chunk);});
      response.on('error',reject);response.on('end',()=>{res.writeHead(response.statusCode||502,{'Content-Type':'application/json'});res.end(Buffer.concat(chunks));resolve();});
     });requests.add(upstream);const deadline=setTimeout(()=>upstream.destroy(Error('Bridge protocol deadline exceeded')),10000);
     upstream.on('close',()=>{clearTimeout(deadline);requests.delete(upstream);});upstream.on('error',reject);res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});upstream.end(body||undefined);
    });
   }catch(error){log({forwarderError:String(error)});if(!res.headersSent)res.writeHead(502);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  manager=new TranslationManager(profile,null);await manager.initialize();
  await manager.save({...manager.getSettings(),enabled:true,translateDescriptions:true,hideUntranslated:true,dynamicTranslationLayout:true,showOriginal:false,port:server.address().port,preservedNames:['Franz','Aria Moonwhisper']});
  assert.equal((await manager.check()).available,true,'The bridge must expose the actual English/Russian model.');
  const privateSession=session.fromPartition(`real-model-dom-${process.pid}`);
  privateSession.protocol.handle('https',request=>{assert.equal(new URL(request.url).origin,'https://play.fables.gg');return new Response(html,{headers:{'Content-Type':'text/html'}});});
  window=new BrowserWindow({show:false,width:700,height:650,webPreferences:{session:privateSession,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const contents=window.webContents;let presented=true;const presentation=[];
  manager.attach(contents,{setVisible(value){presented=value;presentation.push(value);}});
  const capture=async label=>{
   assert(window.isVisible(),'Paint fixture must remain visible');
   const sample=await contents.executeJavaScript(scripts.frame);sample.label=label;samples.push(sample);log({sample});
   if(evidenceDir&&['pending','progressive','ready','recovered','restored','cached'].includes(label)){
    // This owned BrowserWindow has no child views, so capturePage captures its
    // complete fixture surface; no host desktop or user app region is captured.
    const image=await window.capturePage();assert(!image.isEmpty(),`${label}: native capture is nonempty`);
    const file=path.join(evidenceDir,`${label}.png`);await fs.writeFile(file,image.toPNG(),{mode:0o600});log({capture:{label,file,size:image.getSize()}});
   }
   return sample;
  };
  // Baseline uses the same nodes before enabling the prepared pipeline. No frame
  // assertion is made about source English before initialization is committed.
  await manager.save({...manager.getSettings(),showOriginal:true});await window.loadURL('https://play.fables.gg/campaign/play');window.show();window.focus();contents.focus();
  const baseline=await capture('original-baseline');assert.equal(baseline.story,source);
  stage='prepared-initialization';await manager.save({...manager.getSettings(),showOriginal:false});
  await wait(()=>Boolean(release),'first held actual request');
  const pending=await capture('pending');assert(presented&&presentation.includes(false),'Prepared initialization must gate initial presentation.');
  assert.equal(pending.story,'…','Uncached eligible English is replaced before the sampled paint.');assert(pending.storyRect.height<baseline.storyRect.height,'Dynamic layout intentionally shrinks pending prose.');
  mode='progress';release();await wait(()=>attempts>=2&&Boolean(release),'second held batch');
  const progressive=await capture('progressive');assert(/[\p{Script=Cyrillic}]/u.test(progressive.story)&&progressive.story.includes('…'),'A real first batch paints a Russian prefix before the next completes.');
  assert(!/[A-Za-z]/.test(progressive.story),'Unresolved eligible English must not paint in progressive prose.');
  mode='ready';release();await wait(async()=>{const s=await contents.executeJavaScript(scripts.snapshot);return /[\p{Script=Cyrillic}]/u.test(s.story)&&!s.story.includes('…')&&!s.pending&&s.protectedVisible;},'real Russian completion');
  const ready=await capture('ready');assert(!/[A-Za-z]/.test(ready.story));
  // The built-in narrator has canonical Russian spelling even when old saved
  // preservedNames includes Franz; actual custom names retain their spelling.
  assert(ready.protectedText.includes('Франц')&&!ready.protectedText.includes('Franz'),'The service narrator uses canonical Франц.');
  for(const token of ['Aria Moonwhisper','1d20 + 5','https://example.com/room'])assert(ready.protectedText.includes(token),`Protected ${token} survives actual translation`);
  stage='controlled-failure';mode='fail';
  await contents.executeJavaScript(`document.getElementById('late').innerHTML='<p id="recovery">${recoverySource}</p>'`);
  await wait(()=>failures===1,'private forwarder failure');
  // Observe the real pump's completion; a server-side 503 alone is earlier than
  // retryAfter/renderer publication and is not a committed failure boundary.
  await wait(()=>!manager.busy,'first failed pump committed');
  assert.equal((await manager.check()).available,true,'Availability check retries even after a translate-only failure.');
  await wait(()=>failures>=2,'check-triggered failed retry');
  await wait(()=>!manager.busy,'second failed pump committed');
  const failed=await capture('failed');assert(!/[A-Za-z]/.test(failed.recovery),'Failed uncached prose stays pending.');
  mode='ready';assert.equal((await manager.check()).available,true);
  await wait(async()=>{const s=await contents.executeJavaScript(scripts.snapshot);return /[\p{Script=Cyrillic}]/u.test(s.recovery)&&!s.recovery.includes('…');},'check-triggered recovery');
  await capture('recovered');
  stage='original-and-cache';await manager.save({...manager.getSettings(),showOriginal:true});
  const restored=await capture('restored');assert.equal(restored.story,source);assert.equal(restored.protectedText,protectedSource);assert.equal(restored.recovery,recoverySource);
  await contents.executeJavaScript("document.getElementById('listener').click()");assert.equal(await contents.executeJavaScript('window.clicks'),1,'Original listener survives translation and restoration.');
  const beforeCache=attempts;mode='fail';await manager.save({...manager.getSettings(),showOriginal:false});
  await wait(async()=>{const s=await contents.executeJavaScript(scripts.snapshot);return s.story===ready.story&&s.recovery!==recoverySource&&!s.recovery.includes('…');},'cached replay');
  await capture('cached');assert.equal(attempts,beforeCache,'Cached prose must finish without another model request.');
  for(const s of samples){
   assert(s.same,`${s.label}: native cards, text nodes and editable nodes survive`);assert.equal(s.visible,'visible');
   assert.equal(s.russian,'Путник идёт по тихой дороге.');assert.equal(s.draft,'The original input draft.');assert.equal(s.textarea,'The original textarea draft.');assert.equal(s.editor,'The original editable draft.');
   assert.equal(s.card.width,baseline.card.width,`${s.label}: stable card width`);assert.equal(s.viewport.width,baseline.viewport.width);
   assert.equal(s.feed.scrollWidth,s.feed.width,`${s.label}: no horizontal overflow`);assert.equal(s.outer.scroll,s.outer.client,`${s.label}: no second vertical scroll owner`);assert.equal(s.outer.bodyScroll,s.outer.bodyClient);
   assert.equal(s.scroll,baseline.scroll,`${s.label}: no unexpected scroll jump`);assert.deepEqual(s.anchor,baseline.anchor,`${s.label}: unaffected glyph anchor remains fixed`);
   assert(s.storyGlyph&&s.storyGlyph.height>0,`${s.label}: sampled prose has a rendered glyph range`);
  }
  assert(backendCalls>0&&languageCalls>0);await manager.shutdown();manager=undefined;
  const cache=JSON.parse(await fs.readFile(path.join(profile,'translation-cache.json'),'utf8'));assert(cache.entries.length>0,'Actual results persist only in the private cache.');
  log({result:'PASS',backendCalls,attempts,failures,languageCalls,batches,cacheEntries:cache.entries.length,appRoot,node:process.versions.node,electron:process.versions.electron});
 }catch(error){console.error({stage,elapsedMs:Date.now()-started,backendCalls,attempts,failures,samples},error);process.exitCode=1;
 }finally{
  clearTimeout(timer);release?.();for(const request of requests)request.destroy();await manager?.shutdown();window?.destroy();server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));if(profile)await fs.rm(profile,{recursive:true,force:true});app.exit(process.exitCode||0);
 }
}
