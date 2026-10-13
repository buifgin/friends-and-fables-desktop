const assert=require('node:assert/strict'),path=require('node:path');
const {mkdtemp,rm}=require('node:fs/promises'),os=require('node:os');
const {app,BrowserWindow,session}=require('electron');
const appRoot=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname, '..', '..');
const {AppearanceManager,registerAppearanceScheme}=require(path.join(appRoot,'dist/appearance/appearance'));
const {floatSettingsWindow}=require(path.join(appRoot,'dist/shell/floating-appearance'));
registerAppearanceScheme();app.on('window-all-closed',()=>{});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let profile,window;
const timer=setTimeout(()=>{console.error('Campaign map test timed out.');app.exit(1);},40000);
const html=`<!doctype html><html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#101010;color:white}#sidebar{width:400px;overflow:hidden;transform:translateZ(0)}
.map{height:300px;min-height:300px;display:flex;flex-direction:column}.viewport{position:relative;flex:1}
canvas{position:absolute;inset:0;width:100%;height:100%}
.world{width:400px;height:500px;display:flex;position:relative}.worldstage{display:flex;flex:1;min-height:400px;position:relative;overflow:hidden}
#native-map{position:relative;width:241px}.native-map-box{position:relative;width:100%}.native-map-box canvas{position:relative;width:241px;height:241px}.native-map-toolbar{position:absolute;right:0;bottom:0;display:flex}
</style><body><div id="sidebar"><div id="map" class="map min-h-[300px]"><div class="viewport"><canvas class="touch-none absolute inset-0"></canvas></div></div></div>
<div style="position:absolute;left:430px;top:0;overflow:hidden"><div id="world" class="world w-full h-full flex flex-1 relative"><div class="worldstage flex flex-1 min-h-[400px] overflow-hidden group"><canvas class="absolute inset-0 flex-1"></canvas></div></div></div>
<div id="native-map" class="w-full relative"><div class="native-map-box relative"><canvas class="touch-none border-line rounded-md border-2 bg-zinc-950/50" width="241" height="241" style="cursor:grab;touch-action:none;width:241px;height:241px"></canvas><div class="native-map-toolbar absolute bottom-0 right-0 flex flex-row items-center divide-x-2 divide-gray-800"><button type="button" title="Zoom in"><svg class="lucide lucide-zoom-in"></svg></button><button type="button" title="Zoom out"><svg class="lucide lucide-zoom-out"></svg></button><button type="button" title="Show objects"><svg class="lucide lucide-group"></svg></button><button type="button" title="Show entire map"><svg class="lucide lucide-grid3x3"></svg></button><button type="button" title="Ruler"><svg class="lucide lucide-ruler"></svg></button></div></div></div>
<div id="lookalike-map" class="w-full relative"><div class="relative"><canvas class="touch-none border-line rounded-md border-2 bg-zinc-950/50" width="241" height="241"></canvas></div></div>
<canvas id="ordinary-canvas" class="touch-none border-line rounded-md border-2 bg-zinc-950/50" width="241" height="241"></canvas>
<form><div class="map min-h-[300px]"><div class="viewport"><canvas class="touch-none absolute inset-0"></canvas></div></div><div id="form-native-map" class="w-full relative"><div class="relative"><canvas class="touch-none border-line rounded-md border-2 bg-zinc-950/50" width="241" height="241"></canvas><div class="absolute bottom-0 right-0 flex flex-row items-center"><button><svg class="lucide lucide-zoom-in"></svg></button><button><svg class="lucide lucide-zoom-out"></svg></button><button><svg class="lucide lucide-grid3x3"></svg></button><button><svg class="lucide lucide-ruler"></svg></button></div></div></div><input value="My campaign draft"></form>
<div role="dialog"><div class="map min-h-[300px]"><div class="viewport"><canvas class="touch-none absolute inset-0"></canvas></div></div><div id="dialog-native-map" class="w-full relative"><div class="relative"><canvas class="touch-none border-line rounded-md border-2 bg-zinc-950/50" width="241" height="241"></canvas><div class="absolute bottom-0 right-0 flex flex-row items-center"><button><svg class="lucide lucide-zoom-in"></svg></button><button><svg class="lucide lucide-zoom-out"></svg></button><button><svg class="lucide lucide-grid3x3"></svg></button><button><svg class="lucide lucide-ruler"></svg></button></div></div></div></div>
<script>window.originalCanvas=document.querySelector('#map canvas');window.canvasClicks=0;
originalCanvas.addEventListener('click',()=>window.canvasClicks++);
new ResizeObserver(()=>{originalCanvas.width=originalCanvas.parentElement.clientWidth;originalCanvas.height=originalCanvas.parentElement.clientHeight;originalCanvas.getContext('2d').fillRect(0,0,originalCanvas.width,originalCanvas.height)}).observe(originalCanvas.parentElement);
window.worldCanvas=document.querySelector('#world canvas');window.worldClicks=0;worldCanvas.addEventListener('click',()=>worldClicks++);
new ResizeObserver(()=>{worldCanvas.width=worldCanvas.parentElement.clientWidth;worldCanvas.height=worldCanvas.parentElement.clientHeight;worldCanvas.getContext('2d').fillRect(0,0,worldCanvas.width,worldCanvas.height)}).observe(worldCanvas.parentElement);
window.nativeMapCanvas=document.querySelector('#native-map canvas');window.nativeMapToolbar=document.querySelector('#native-map .native-map-toolbar');window.nativeMapCanvasClicks=0;window.nativeMapDrawCount=0;window.nativeMapWidthCommitCount=0;window.nativeMapLastFrame=null;window.nativeToolbarClicks=0;window.nativeOriginalCss={root:document.getElementById('native-map').style.cssText,stage:nativeMapCanvas.parentElement.style.cssText,canvas:nativeMapCanvas.style.cssText};window.nativeMapCanvas.addEventListener('click',()=>window.nativeMapCanvasClicks++);window.nativeMapToolbar.querySelector('.lucide-zoom-in').closest('button').addEventListener('click',()=>window.nativeToolbarClicks++);
window.nativeMapCanvas.addEventListener('pointerdown',event=>{const r=nativeMapCanvas.getBoundingClientRect();window.nativeMapPointer={x:event.clientX-r.left,y:event.clientY-r.top,width:r.width,height:r.height}});
let nativeMapWidth=nativeMapCanvas.parentElement.clientWidth;new ResizeObserver(entries=>{const stage=entries[0].target,width=entries[0].contentRect.width;if(Math.abs(width-nativeMapWidth)>1){nativeMapWidth=width;requestAnimationFrame(()=>{if(!stage.isConnected)return;const dpr=window.devicePixelRatio||1;nativeMapCanvas.style.width=width+'px';nativeMapCanvas.style.height=width+'px';nativeMapCanvas.width=Math.floor(width*dpr);nativeMapCanvas.height=Math.floor(width*dpr);window.nativeMapWidthCommitCount++})}}).observe(nativeMapCanvas.parentElement);
const renderNativeMap=()=>{const canvas=nativeMapCanvas,context=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,width=canvas.clientWidth,height=canvas.clientHeight;context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);context.fillStyle='#101820';context.fillRect(0,0,width,height);context.strokeStyle='#617080';context.lineWidth=1;context.beginPath();for(let x=20;x<width;x+=20){context.moveTo(x,0);context.lineTo(x,height)}for(let y=20;y<height;y+=20){context.moveTo(0,y);context.lineTo(width,y)}context.stroke();window.nativeMapDrawCount++;window.nativeMapLastFrame={bitmapWidth:canvas.width,bitmapHeight:canvas.height,clientWidth:width,clientHeight:height,drawCount:window.nativeMapDrawCount,widthCommitCount:window.nativeMapWidthCommitCount};requestAnimationFrame(renderNativeMap)};requestAnimationFrame(renderNativeMap);
</script></body></html>`;
(async()=>{
 profile=process.env.FABLES_TEST_PROFILE_DIR||await mkdtemp(path.join(os.tmpdir(),'fables-map-test-'));app.setPath('userData',profile);await app.whenReady();
 const manager=new AppearanceManager();await manager.initialize();
 const site=session.fromPartition('map-test');site.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
 window=new BrowserWindow({show:false,width:1200,height:820,type:process.platform==='linux'?'dialog':undefined,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const contents=window.webContents;manager.attach(contents);
 const js=source=>contents.executeJavaScript(source);
 const until=async source=>{for(let i=0;i<160;i++){if(await js(source))return;await sleep(25);}throw Error('Timed out: '+source)};
 const size=()=>js('(()=>{const b=document.getElementById("map").getBoundingClientRect();return {width:Math.round(b.width),height:Math.round(b.height),left:b.left,top:b.top}})()');
 const key=code=>js(`document.querySelector('#map [data-ff-desktop-map-resizer]').dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(code)},bubbles:true}))`);
 const expand=()=>js("document.querySelector('#map [data-ff-desktop-map-controls] button').click()");
 await contents.loadURL('https://play.fables.gg/sample/play');
 assert.equal(await js("document.querySelector('[data-ff-desktop-map-resizer]')"),null);
 const originalStyle=await js("document.getElementById('map').style.cssText");
 await manager.save({...manager.getSettings(),resizableMap:true,preset:'amoled'});
 await until("document.querySelector('#map [data-ff-desktop-map-resizer]')!==null");
 assert.equal(await js("document.querySelectorAll('[data-ff-desktop-map-resizer]').length"),3,'Legacy battle/world and the current native-toolbar battlemap receive controls; editors and dialogs are excluded.');assert.equal(await js("document.querySelectorAll('#native-map [data-ff-desktop-map-resizer]').length"),1,'The current native-toolbar battlemap is recognized.');
 assert.equal(await js('typeof window.require'),'undefined');
 await key('ArrowDown');assert.equal((await size()).height,324);
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-map-size-v1:sample')).height"),324);
 assert.equal(await js("document.querySelector('#map [data-ff-desktop-map-resizer]').getAttribute('aria-label')"),'Resize map height');
 await until("originalCanvas.height===324");
 await expand();await until("document.getElementById('map').matches(':popover-open')");
 const expanded=await size();assert(expanded.width>400);assert(expanded.height>324);
 assert.equal(await js("document.querySelector('#map canvas')===window.originalCanvas"),true);
 assert.equal(await js("document.elementFromPoint(document.getElementById('map').getBoundingClientRect().right-30,document.getElementById('map').getBoundingClientRect().bottom-30)===window.originalCanvas"),true,'Expanded canvas must escape sidebar clipping.');
 await key('ArrowRight');await key('ArrowDown');
 assert.equal((await size()).width,expanded.width+24);assert.equal((await size()).height,expanded.height+24);
 await until('originalCanvas.width===Math.round(originalCanvas.parentElement.clientWidth)');
 const moverKey=(id,code,shift=false)=>js(`document.querySelector('#${id} [data-ff-desktop-map-mover]').dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(code)},shiftKey:${shift},bubbles:true}))`);
 const centered=await size();await moverKey('map','ArrowLeft');await moverKey('map','ArrowDown',true);
 assert.equal((await size()).left,centered.left-24);assert.equal((await size()).top,await js(`Math.min(${centered.top+64},innerHeight-${centered.height}-12)`));
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-map-size-v1:sample')).left"),centered.left-24);
 await moverKey('map','Home');assert.equal((await size()).left,await js(`Math.round((innerWidth-${centered.width})/2)`));assert.equal((await size()).top,await js(`Math.round((innerHeight-${centered.height})/2)`));
 await js("originalCanvas.dispatchEvent(new MouseEvent('click',{bubbles:true}))");assert.equal(await js('window.canvasClicks'),1);
 manager.setLocale('ru');await until("document.querySelector('#map [data-ff-desktop-map-controls] button').textContent==='Закрыть карту'");
 assert.equal(await js("document.getElementById('map').matches(':popover-open')"),true,'Changing locale keeps the map open.');
 assert.equal(await js("document.querySelector('#map [data-ff-desktop-map-controls] button:nth-child(2)').textContent"),'Сбросить размер');
 assert.equal(await js("document.querySelector('#map [data-ff-desktop-map-mover]').textContent"),'Переместить карту');
 assert.match(await js("document.querySelector('#map [data-ff-desktop-map-mover]').title"),/Стрелки перемещают окно/);
 assert.equal(await js("document.querySelector('#map [data-ff-desktop-map-resizer]').getAttribute('aria-label')"),'Изменить размер развёрнутой карты');
 assert.match(await js("document.querySelector('#map [data-ff-desktop-map-resizer]').title"),/При фокусе используйте стрелки/);
 window.setTitle('Fables Campaign Map Test');window.show();window.focus();await floatSettingsWindow(window,'Fables Campaign Map Test',true);await sleep(150);contents.focus();
 const before=await size(),point=await js("(()=>{const b=document.querySelector('#map [data-ff-desktop-map-resizer]').getBoundingClientRect();return {x:Math.round(b.left+5),y:Math.round(b.top+5)}})()");
 const bounds=window.getContentBounds();
 contents.sendInputEvent({type:'mouseMove',x:point.x,y:point.y,globalX:bounds.x+point.x,globalY:bounds.y+point.y});await sleep(50);
 contents.sendInputEvent({type:'mouseDown',x:point.x,y:point.y,globalX:bounds.x+point.x,globalY:bounds.y+point.y,button:'left',clickCount:1});await sleep(50);
 contents.sendInputEvent({type:'mouseMove',x:point.x-32,y:point.y-24,globalX:bounds.x+point.x-32,globalY:bounds.y+point.y-24,modifiers:['leftButtonDown'],movementX:-32,movementY:-24});
 try { await until(`Math.round(document.getElementById('map').getBoundingClientRect().width)===${before.width-32}`); }
 catch(error) { console.error('Resize diagnostic', {before,point,bounds,actual:await size(),hit:await js(`document.elementFromPoint(${point.x},${point.y})?.outerHTML`),viewport:await js('({width:innerWidth,height:innerHeight,focused:document.hasFocus()})')});throw error; }
 contents.sendInputEvent({type:'mouseUp',x:point.x-32,y:point.y-24,globalX:bounds.x+point.x-32,globalY:bounds.y+point.y-24,button:'left',clickCount:1});
 await until(`JSON.parse(localStorage.getItem('ff-desktop-map-size-v1:sample')).width===${before.width-32}`);
 const moveBefore=await size(),movePoint=await js("(()=>{const b=document.querySelector('#map [data-ff-desktop-map-mover]').getBoundingClientRect();return {x:Math.round(b.left+15),y:Math.round(b.top+10)}})()");
 const moveLeft=await js(`Math.min(${moveBefore.left+32},innerWidth-${moveBefore.width}-12)`);
 contents.sendInputEvent({type:'mouseMove',x:movePoint.x,y:movePoint.y});await sleep(40);
 contents.sendInputEvent({type:'mouseDown',x:movePoint.x,y:movePoint.y,button:'left',clickCount:1});await sleep(40);
 contents.sendInputEvent({type:'mouseMove',x:movePoint.x+32,y:movePoint.y+24,modifiers:['leftButtonDown'],movementX:32,movementY:24});
 await until(`document.getElementById('map').getBoundingClientRect().left===${moveLeft}`);
 contents.sendInputEvent({type:'mouseUp',x:movePoint.x+32,y:movePoint.y+24,button:'left',clickCount:1});
 await until(`JSON.parse(localStorage.getItem('ff-desktop-map-size-v1:sample')).left===${moveLeft}`);
 assert.notEqual(moveLeft,moveBefore.left,'Real pointer dragging moves the expanded window.');
 assert.equal((await size()).width,moveBefore.width);assert.equal((await size()).height,moveBefore.height);
 const saved=await size();
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
 assert.equal((await size()).height,324);assert.equal(await js("document.getElementById('map').hasAttribute('popover')"),false);
 assert.equal(await js("document.querySelector('#map [data-ff-desktop-map-resizer]').getAttribute('aria-label')"),'Изменить высоту карты','The collapsed map exposes its Russian accessible label after the locale switches to RU.');
 await new Promise(resolve=>{contents.once('did-finish-load',resolve);contents.reload()});await until("document.querySelector('#map [data-ff-desktop-map-resizer]')!==null");assert.equal((await size()).height,324);
 await expand();assert.equal((await size()).width,saved.width);assert.equal((await size()).height,saved.height);assert.equal((await size()).left,saved.left);assert.equal((await size()).top,saved.top);assert.equal(await js("document.querySelector('#map canvas')===window.originalCanvas"),true,'Restoring the expanded RU map preserves its native canvas.');assert.equal(await js("document.querySelector('#map [data-ff-desktop-map-resizer]').getAttribute('aria-label')"),'Изменить размер развёрнутой карты');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));history.pushState(null,'','/sample/play?view=world');dispatchEvent(new PopStateEvent('popstate'))");
 const worldSize=()=>js("(()=>{const b=document.getElementById('world').getBoundingClientRect();return {width:Math.round(b.width),height:Math.round(b.height),left:b.left,top:b.top}})()");
 const worldKey=code=>js(`document.querySelector('#world [data-ff-desktop-map-resizer]').dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(code)},bubbles:true}))`);
 await worldKey('ArrowDown');assert.equal((await worldSize()).height,524);await until('worldCanvas.height===524');
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-map-size-v1:sample:world')).height"),524);
 assert.equal(await js("JSON.parse(localStorage.getItem('ff-desktop-map-size-v1:sample')).height"),324,'World sizing leaves the battle map preference intact.');
 await js("document.querySelector('#world [data-ff-desktop-map-controls] button').click()");await until("document.getElementById('world').matches(':popover-open')");
 await worldKey('ArrowRight');await moverKey('world','ArrowRight');
 assert.equal(await js("document.querySelector('#world canvas')===worldCanvas"),true);
 await js("worldCanvas.dispatchEvent(new MouseEvent('click',{bubbles:true}))");assert.equal(await js('worldClicks'),1);
 window.setContentSize(720,400);await until("innerWidth===720 && document.getElementById('world').getBoundingClientRect().height<=376 && worldCanvas.height===document.querySelector('#world .worldstage').clientHeight");
 assert((await worldSize()).top>=12);assert.equal(await js("document.querySelector('#world .worldstage').clientHeight"),(await worldSize()).height-2,'World stage redraws within a viewport smaller than its original minimum.');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");assert.equal((await worldSize()).height,524);
 await expand();
 window.setContentSize(720,540);await until("innerWidth===720 && document.getElementById('map').getBoundingClientRect().width<=696 && document.getElementById('map').getBoundingClientRect().height<=516");
 const small=await size();assert(small.width<=696);assert(small.height<=516);assert(small.left>=12);assert(small.top>=12);
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
 await js("history.pushState(null,'','/second/play');dispatchEvent(new PopStateEvent('popstate'))");
 await until("document.querySelector('#map [data-ff-desktop-map-controls] button').textContent==='Развернуть карту'");
 await sleep(60);assert.equal((await size()).height,300,'Map sizes are per campaign.');
 await js("history.pushState(null,'','/sample/play');dispatchEvent(new PopStateEvent('popstate'))");await until("document.getElementById('map').getBoundingClientRect().height===324");
 await js("document.querySelector('#map [data-ff-desktop-map-controls] button:nth-child(2)').click()");assert.equal((await size()).height,300);
 await js("{const root=document.getElementById('map');root.replaceChildren(root.querySelector('.viewport').cloneNode(true))}");
 await until("document.querySelector('#map [data-ff-desktop-map-resizer]')!==null");
 assert.equal(await js("document.querySelectorAll('#map [data-ff-desktop-map-resizer]').length"),1);
 await expand();
 await js(`{window.oldMap=document.getElementById('map');oldMap.remove();const next=document.createElement('div');next.id='map';next.className='map min-h-[300px]';next.innerHTML='<div class="viewport"><canvas class="touch-none absolute inset-0"></canvas></div>';document.getElementById('sidebar').append(next)}`);
 await until("document.querySelector('#map [data-ff-desktop-map-resizer]')!==null && !oldMap.hasAttribute('popover')");
 assert.equal(await js('oldMap.style.cssText'),originalStyle);
 await manager.save({...manager.getSettings(),resizableMap:false});
 assert.equal(await js("document.querySelector('[data-ff-desktop-map-resizer]')"),null);assert.equal(await js("document.getElementById('map').style.cssText"),originalStyle);
 assert.equal(await js("document.querySelector('input').value"),'My campaign draft');
 await manager.save({...manager.getSettings(),resizableMap:true});
 await js("history.pushState(null,'','/');dispatchEvent(new PopStateEvent('popstate'))");await until("document.querySelector('[data-ff-desktop-map-resizer]')===null");
 assert.equal(await js("document.getElementById('map').style.cssText"),originalStyle);
 assert.equal(await js("document.getElementById('world').style.cssText"),'');assert.equal(await js("document.querySelector('#world .worldstage').style.cssText"),'');
 // Current Friends & Fables battlemap shape: square touch canvas plus its native five-action zoom/object/grid/ruler toolbar.
 await js("document.getElementById('map').remove();document.getElementById('world').remove();history.pushState(null,'','/native/play');dispatchEvent(new PopStateEvent('popstate'))");
 await until("document.querySelector('#native-map [data-ff-desktop-map-resizer]')!==null");
 assert.equal(await js("document.querySelectorAll('#native-map [data-ff-desktop-map-controls]').length"),1,'The live-shaped battlemap host receives one settings control group.');
 assert.equal(await js("document.querySelector('#native-map canvas')===window.nativeMapCanvas"),true,'The native canvas keeps its identity.');
 assert.equal(await js("document.querySelector('#lookalike-map [data-ff-desktop-map-resizer]')"),null,'A matching native touch canvas without the complete toolbar fingerprint is not treated as the campaign map.');assert.equal(await js("document.querySelector('#ordinary-canvas [data-ff-desktop-map-resizer]')"),null);
 assert.equal(await js("document.querySelectorAll('form [data-ff-desktop-map-controls], [role=dialog] [data-ff-desktop-map-controls]').length"),0,'Form and dialog native-shaped canvases remain excluded.');
 const nativeSize=()=>js("(()=>{const b=document.getElementById('native-map').getBoundingClientRect();return {width:Math.round(b.width),height:Math.round(b.height),left:b.left,top:b.top}})()");
 const nativeKey=key=>js(`document.querySelector('#native-map [data-ff-desktop-map-resizer]').dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},bubbles:true}))`);
 const nativeBefore=await nativeSize();await nativeKey('ArrowDown');assert.equal((await nativeSize()).height,nativeBefore.height+24,'Keyboard resize applies to the current square canvas host.');
 await until('nativeMapCanvas.width===Math.floor(nativeMapCanvas.clientWidth*(window.devicePixelRatio||1)) && nativeMapCanvas.height===Math.floor(nativeMapCanvas.clientHeight*(window.devicePixelRatio||1))');
 const nativeDrawsBeforeExpand=await js('nativeMapDrawCount'),nativeWidthCommitsBeforeExpand=await js('nativeMapWidthCommitCount');await js("document.querySelector('#native-map [data-ff-desktop-map-controls] button').click()");await until("document.getElementById('native-map').matches(':popover-open')");
 assert.equal(await js("document.querySelector('#native-map [data-ff-desktop-map-controls] button').textContent"),'Закрыть карту');assert.equal(await js("document.querySelector('#native-map [data-ff-desktop-map-controls] button:nth-child(2)').textContent"),'Сбросить размер');assert.equal(await js("document.querySelector('#native-map [data-ff-desktop-map-mover]').textContent"),'Переместить карту');assert.equal(await js("document.querySelector('#native-map [data-ff-desktop-map-resizer]').getAttribute('aria-label')"),'Изменить размер развёрнутой карты');
 await until(`nativeMapWidthCommitCount>${nativeWidthCommitsBeforeExpand} && nativeMapCanvas.width===Math.floor(nativeMapCanvas.clientWidth*(window.devicePixelRatio||1)) && nativeMapCanvas.height===Math.floor(nativeMapCanvas.clientHeight*(window.devicePixelRatio||1)) && nativeMapLastFrame && nativeMapLastFrame.drawCount>${nativeDrawsBeforeExpand} && nativeMapLastFrame.widthCommitCount===nativeMapWidthCommitCount && nativeMapLastFrame.bitmapWidth===nativeMapCanvas.width && nativeMapLastFrame.bitmapHeight===nativeMapCanvas.height && nativeMapLastFrame.clientWidth===nativeMapCanvas.clientWidth && nativeMapLastFrame.clientHeight===nativeMapCanvas.clientHeight && nativeMapCanvas.getContext('2d').getImageData(10,10,1,1).data[3]===255`);
 assert((await js('nativeMapDrawCount'))>nativeDrawsBeforeExpand,'The continuous native renderer paints after the width observer and rectangular bitmap repair.');assert.deepEqual(await js('(()=>{const data=nativeMapCanvas.getContext("2d").getImageData(10,10,1,1).data;return [...data]})()'),[16,24,32,255],'The native canvas contains a completed nonblank repaint after the managed bitmap repair.');
 const expandedCanvas=await js("(()=>{const r=nativeMapCanvas.getBoundingClientRect();return {width:r.width,height:r.height,bitmapWidth:nativeMapCanvas.width,bitmapHeight:nativeMapCanvas.height,dpr:window.devicePixelRatio||1}})()");assert.notEqual(Math.round(expandedCanvas.width),Math.round(expandedCanvas.height),'Expanded native canvas follows the rectangular managed stage, not its original square inline dimensions.');assert.equal(expandedCanvas.bitmapWidth,Math.floor(expandedCanvas.width*expandedCanvas.dpr));assert.equal(expandedCanvas.bitmapHeight,Math.floor(expandedCanvas.height*expandedCanvas.dpr));assert.equal(await js("document.querySelector('#native-map .native-map-toolbar')===window.nativeMapToolbar"),true,'The captured native toolbar retains identity.');
 const nativeExpanded=await nativeSize();await moverKey('native-map','ArrowRight');assert.equal((await nativeSize()).left,nativeExpanded.left+24,'The current map host can move by keyboard.');
 assert.equal(await js("document.querySelector('#native-map canvas')===window.nativeMapCanvas"),true);const pointerPoint=await js("(()=>{const r=nativeMapCanvas.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),width:r.width,height:r.height}})()");await js(`nativeMapCanvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:${pointerPoint.x},clientY:${pointerPoint.y},pointerId:17,button:0}))`);const nativePointer=await js('nativeMapPointer');assert(Math.abs(nativePointer.x-pointerPoint.width/2)<=1&&Math.abs(nativePointer.y-pointerPoint.height/2)<=1,`Native pointer coordinate maps to rendered canvas center: ${JSON.stringify(nativePointer)}`);assert.equal(nativePointer.width,pointerPoint.width);assert.equal(nativePointer.height,pointerPoint.height);await js("nativeMapCanvas.dispatchEvent(new MouseEvent('click',{bubbles:true}))");assert.equal(await js('nativeMapCanvasClicks'),1,'The existing native canvas remains interactive while expanded.');
 await js("nativeMapToolbar.querySelector('.lucide-zoom-in').closest('button').click()");assert.equal(await js('nativeToolbarClicks'),1,'Native zoom toolbar controls remain usable after instrumentation.');assert.equal(await js("document.querySelector('#native-map .native-map-toolbar')===window.nativeMapToolbar"),true);
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");assert.equal(await js("document.getElementById('native-map').matches(':popover-open')"),false,'Escape closes the expanded native map.');await js("document.querySelector('#native-map [data-ff-desktop-map-controls] button:nth-child(2)').click()");assert.equal((await nativeSize()).height,241,'Reset restores native canvas height.');assert.deepEqual(await js("JSON.parse(localStorage.getItem('ff-desktop-map-size-v1:native'))"),{},'Reset clears the current map size preference.');
 await manager.save({...manager.getSettings(),resizableMap:false});await until("document.querySelector('#native-map [data-ff-desktop-map-resizer]')===null && nativeMapCanvas.style.cssText===nativeOriginalCss.canvas && nativeMapCanvas.parentElement.style.cssText===nativeOriginalCss.stage");assert.equal(await js("document.querySelector('#native-map').style.cssText"),await js('nativeOriginalCss.root'),'Disabling restores the map host style.');assert.equal(await js("nativeMapCanvas.style.cssText"),await js('nativeOriginalCss.canvas'),'Disabling restores native canvas styles.');assert.equal(await js("nativeMapCanvas.parentElement.style.cssText"),await js('nativeOriginalCss.stage'),'Disabling restores the native stage.');assert.equal(await js("document.querySelector('#native-map .native-map-toolbar')===window.nativeMapToolbar"),true,'Disabling support leaves the native toolbar intact.');
 await manager.save({...manager.getSettings(),resizableMap:true});await js("history.pushState(null,'','/');dispatchEvent(new PopStateEvent('popstate'))");await until("document.querySelector('#native-map [data-ff-desktop-map-controls]')===null");assert.equal(await js("document.querySelector('#native-map .native-map-toolbar')===window.nativeMapToolbar"),true,'Leaving the campaign removes only injected map controls.');
 console.log('PASS: campaign map drag and keyboard resize, top-layer expansion, existing canvas/redraw, localized controls, per-campaign persistence, viewport bounds, reset, navigation, editor exclusions, and restoration.');
})().then(async()=>{clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(0)}).catch(async error=>{console.error(error);clearTimeout(timer);window?.destroy();if(profile&&!process.env.FABLES_TEST_PROFILE_DIR)await rm(profile,{recursive:true,force:true});app.exit(1)});
