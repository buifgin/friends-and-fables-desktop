'use strict';

// Offline harness for the exact native rating-row shape captured in B12.
// The coordinator owns Electron scheduling; this file never opens campaigns or
// imports another Electron fixture.
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const campaignId = '01a0d854-78d5-7064-ae41-f63d561c8e01';

const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;font:12px system-ui,sans-serif}
aside{display:none}.flex-1.h-full.w-full{position:absolute;inset:0}
.metrics{display:flex;flex-direction:column;align-items:flex-end}
.flex.items-center[class~="gap-1.5"]{display:flex;align-items:center;gap:6px;width:max-content;height:18px;margin:4px 0;white-space:nowrap}
.flex.items-center[class~="gap-1.5"]>span.w-14{display:block;flex:0 1 auto;width:56px;white-space:nowrap;line-height:18px}
.flex[class~="gap-0.5"]{display:flex;flex:0 0 auto;gap:2px}
.rounded-full{display:block;width:6px;height:6px;border-radius:50%;background:#888}
.bg-blue-400{background:#48f}
.metric-card{box-sizing:border-box;width:426px;max-width:100%;padding:24px;border:1px solid #777}.metric-card .metrics{margin-left:auto;width:max-content}
</style><aside><button id="gear"><svg class="lucide-settings"></svg>Settings</button></aside>
<section class="flex-1 h-full w-full"><div id="events-list"></div><div class="tiptap" contenteditable="true">draft preserved</div></section>
<script>
window.mountMetrics=()=>{
 if(document.querySelector('[role=dialog]')) return;
 const panel=document.createElement('div');panel.setAttribute('role','dialog');panel.dataset.state='open';
 panel.innerHTML='<button type="button"><svg class="lucide-x"></svg>Close</button><div class="overflow-y-auto h-full"><div class="p-6 h-full"><div class="flex-1 items-center overflow-y-auto"><div class="mx-auto"><div><div><h3 class="font-header">Campaign Settings</h3></div><div class="metric-card"><div class="metrics"><div class="flex items-center gap-1.5"><span class="w-14 text-xs">Speed</span><div class="flex gap-0.5">'+dots(3)+'</div></div><div class="flex items-center gap-1.5"><span class="w-14 text-xs">Intelligence</span><div class="flex gap-0.5">'+dots(5)+'</div></div><div class="flex items-center gap-1.5"><span class="w-14 text-xs">Скорость</span><div class="flex gap-0.5">'+dots(3)+'</div></div><div class="flex items-center gap-1.5"><span class="w-14 text-xs">Интеллект</span><div class="flex gap-0.5">'+dots(5)+'</div></div></div></div><input id="native-value" value="keep native value"></div></div></div></div>';
 panel.__reactFiber$fixture={type:'div',child:{type:function NativeCampaignSettings(){return 'Campaign Settings'},memoizedProps:{campaignId:'${campaignId}',isHost:true}}};
 panel.querySelector('button').onclick=()=>{panel.dataset.state='closed';panel.remove();document.body.style.pointerEvents='';document.body.style.overflow=''};
 document.body.append(panel);document.body.style.pointerEvents='none';document.body.style.overflow='hidden';window.nativePanel=panel;window.nativeInput=panel.querySelector('#native-value');window.nativeNodes=[...panel.querySelectorAll('.metrics span,.metrics i')];
};
function dots(count){return Array.from({length:5},(_,i)=>'<i class="w-1.5 h-1.5 rounded-full '+(i<count?'bg-blue-400':'bg-gray-600')+'"></i>').join('')}
document.querySelector('#gear').onclick=()=>queueMicrotask(window.mountMetrics);
</script>`;

const geometry = `(()=>{
 const panel=window.nativePanel, rows=[...panel.querySelectorAll('.flex.items-center[class~="gap-1.5"]')];
 const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
 const glyph=span=>{const range=document.createRange();range.selectNodeContents(span);const r=range.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
 return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},panel:rect(panel),rows:rows.map(row=>({label:row.querySelector(':scope>span').textContent,glyph:glyph(row.querySelector(':scope>span')),labelBox:rect(row.querySelector(':scope>span')),row:rect(row),dotGroup:rect(row.querySelector(':scope>div')),dots:[...row.querySelectorAll(':scope>div>i')].map(rect)})),card:rect(panel.querySelector('.metric-card')),input:window.nativeInput.value,identity:window.nativeInput===panel.querySelector('#native-value'),nodesSame:window.nativeNodes.every((node,i)=>node===[...panel.querySelectorAll('.metrics span,.metrics i')][i]),draft:document.querySelector('.tiptap').textContent}
})()`;
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
new vm.Script(geometry);

if (!process.versions.electron) {
  module.exports = { html, geometry };
} else {
  const { app, BrowserWindow, session } = require('electron');
  const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
  const { configureNativeCampaignPanel } = require(path.join(root, 'dist/settings/campaign-panel'));
  let window;
  const deadline = setTimeout(() => { console.error('FAIL: campaign metrics fixture deadline'); window?.destroy(); app.exit(1); }, 15000);
  void app.whenReady().then(async () => {
    const site=session.fromPartition('campaign-metrics-'+Date.now());
    site.protocol.handle('https',()=>new Response(html,{headers:{'content-type':'text/html'}}));
    window = new BrowserWindow({ width:1280,height:868,useContentSize:true,show:true,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false} });
    await window.loadURL('https://play.fables.gg/'+campaignId+'/play');
    const wc = window.webContents;
    wc.on('console-message',event=>console.error('metrics renderer '+event.message));
    const run = async (source,stage='renderer') => {
      new vm.Script(source);
      const envelope=await wc.executeJavaScript(`(async()=>{try{return {ok:true,value:await (${source})}}catch(error){return {ok:false,error:{message:String(error?.message??error),stack:String(error?.stack??'')}}}})()`);
      if(!envelope.ok)throw Error(stage+': '+envelope.error.message+'\n'+envelope.error.stack);
      return envelope.value;
    };
    await wc.focus();
    const palette={background:'#203040',foreground:'#f5f5f5',border:'#465050',accent:'#d8bb82',panel:'#17181a',selected:'#383a3e'};
    const configure=(show,width=552)=>run(`(${configureNativeCampaignPanel.toString()})(${JSON.stringify(show)},${width},868,${JSON.stringify(palette)},126)`, 'configure '+show+' width '+width);
    assert.equal(await configure(true),true,'production Campaign adapter ready');
    assert.equal(await run('window.nativePanel?.hasAttribute("data-ff-campaign-panel")'),true,'native dialog adopted');
    for(const sample of [{name:'ordinary',width:552,zoom:1},{name:'narrow',width:360,zoom:1},{name:'zoom',width:552,zoom:1.25}]) {
    wc.setZoomFactor(sample.zoom);
    assert.equal(await configure(true,sample.width),true,'Campaign ready '+sample.name);
    const state=await run(geometry,'geometry '+sample.name);
    console.log('Campaign metrics geometry '+sample.name+' '+JSON.stringify(state));
    const byLabel=new Map(state.rows.map(row=>[row.label,row]));
    for (const label of ['Speed','Intelligence','Скорость','Интеллект']) {
      const row=byLabel.get(label); assert.ok(row, 'captured label '+label);
      const gap=row.dots[0].x-row.glyph.right;
      assert.ok(gap>=6, `${label} glyph gap must be >=6px; got ${gap}`);
      assert.equal(row.dots.length,5,'native rating dot count preserved');
      assert.ok(row.row.x>=state.card.x&&row.row.right<=state.card.right,'rating remains in card');
      assert.ok(Math.abs(row.dots[0].x-state.rows[0].dots[0].x)<0.5,'dot columns align across labels and values');
      assert.ok(Math.abs(row.dots[0].width-6)<0.1,'native dot size retained');
    }
    assert.ok(state.card.x>=state.panel.x&&state.card.right<=state.panel.right,'metric card stays within Campaign panel');
    assert.equal(state.input,'keep native value');assert.equal(state.identity,true);assert.equal(state.nodesSame,true);assert.equal(state.draft,'draft preserved');
    }
    await configure(false);
    assert.equal(await run('!!document.querySelector("[data-ff-campaign-panel]")'),false,'owned marker retired');
    assert.equal(await run('!!window.__friendsFablesDesktopCampaignPanel'),false,'controller retired');
    assert.equal(await run('[...document.head.querySelectorAll("style")].some(s=>s.textContent.includes("data-ff-campaign-panel"))'),false,'owned CSS retired');
    console.log('Campaign metrics fixture PASS');
    clearTimeout(deadline); window.close(); app.quit();
  }).catch(error=>{console.error(error);clearTimeout(deadline);window?.destroy();app.exit(1);});
}
