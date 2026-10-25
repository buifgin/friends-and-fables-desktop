// ROOT schedules this private, visible native fixture. No executable fixture imports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const css = `*{box-sizing:border-box}body{margin:0;font:16px Arial}#outside{position:fixed;right:4px;bottom:4px}#draft{margin-left:480px}[data-ff-combat-docked]{position:fixed;left:var(--ff-combat-rail-width);top:60px;width:var(--ff-combat-width);height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:auto;background:#ddd}form{margin:10px}nav{height:36px;flex:none}`;
async function scenario(install) {
  const check = (value, label, data) => { if (!value) throw Error(label + ': ' + JSON.stringify(data)); };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const paint = async () => { await frame(); await frame(); };
  const wait = async (label, condition) => { for (let i=0;i<120;i++) { await frame(); if (condition()) return; } throw Error(label); };
  const root = document.documentElement;
  root.style.setProperty('--ff-combat-rail-width','60px'); root.style.setProperty('--ff-combat-rail-top','60px');
  root.setAttribute('data-ff-combat-open','true');
  document.body.innerHTML = '<div id="outside">Unrelated native content</div><div id="draft" contenteditable="true">Retained native chat draft</div><section data-ff-combat-docked><h2>Native check form</h2><form><input value="retained roll draft"><button>Roll</button></form></section>';
  let panel = document.querySelector('section');
  const form = panel.querySelector('form'), field = form.querySelector('input'), draft = document.getElementById('draft'), text = draft.firstChild, heading = panel.querySelector('h2');
  const outside = document.getElementById('outside'), outsideText = outside.firstChild;
  let actions = 0; form.addEventListener('submit', event => { event.preventDefault(); actions++; });
  const selection = window.getSelection(), range = document.createRange(); range.setStart(text,3); range.setEnd(text,11); selection.removeAllRanges(); selection.addRange(range);
  const selected = selection.toString();
  const identity = () => form === panel.querySelector('form') && field === form.querySelector('input') && field.value === 'retained roll draft' && heading === panel.querySelector('h2') && heading.textContent === 'Native check form' && draft.firstChild === text && text.data === 'Retained native chat draft' && outside.firstChild === outsideText && outsideText.data === 'Unrelated native content' && selection.anchorNode === text && selection.focusNode === text && selection.toString() === selected && actions === 0 && JSON.parse(localStorage.getItem('ff-desktop-combat-workspace-v1:/fixture') || '{}').width === 350;
  localStorage.setItem('ff-desktop-combat-workspace-v1:/fixture',JSON.stringify({width:350}));
  install(true,'en');
  await wait('Real public workspace must mount tools', () => panel.querySelector('[data-ff-combat-workspace-tools]'));
  const tools = panel.querySelector('[data-ff-combat-workspace-tools]'), handle = panel.querySelector('[data-ff-combat-resizer]'), slot = tools.firstElementChild;
  const nav = document.createElement('nav'); nav.textContent = 'Native shortcut navigation'; slot.append(nav);
  await paint(); await paint();
  const computedDescriptor = Object.getOwnPropertyDescriptor(window,'getComputedStyle');
  const rectDescriptor = Object.getOwnPropertyDescriptor(Element.prototype,'getBoundingClientRect');
  const computed = window.getComputedStyle, rect = rectDescriptor.value;
  let stage = 'setup', outsideDeliveries = 0, outsideWrites = 0;
  const counters = {};
  const count = key => { const current = counters[stage] ||= { rootStyle:0, toolsRect:0 }; current[key]++; };
  window.getComputedStyle = function(...args) { if (args[0] === root) count('rootStyle'); return Reflect.apply(computed,this,args); };
  Object.defineProperty(Element.prototype,'getBoundingClientRect',{...rectDescriptor,value:function(...args) { if (this === tools) count('toolsRect'); return Reflect.apply(rect,this,args); }});
  const observer = new MutationObserver(records => { outsideDeliveries += records.filter(record => record.target === outside && record.attributeName === 'style').length; });
  observer.observe(outside,{attributes:true,attributeFilter:['style']});
  const readRect = element => Reflect.apply(rect,element,[]).toJSON();
  const snapshot = () => ({ width:root.style.getPropertyValue('--ff-combat-width'), toolsHeight:root.style.getPropertyValue('--ff-combat-tools-height'), panel:readRect(panel), tools:readRect(tools), handle:readRect(handle), now:Number(handle.getAttribute('aria-valuenow')), minimum:Number(handle.getAttribute('aria-valuemin')), maximum:Number(handle.getAttribute('aria-valuemax')), innerWidth, identity:identity(), actions });
  const closeEnough = (a,b) => Math.abs(a-b)<=1;
  const geometry = () => { const s=snapshot(); check(s.identity && s.panel.width === s.now && closeEnough(s.handle.left,parseFloat(root.style.getPropertyValue('--ff-combat-rail-width'))+s.now-4) && closeEnough(s.handle.top,60+Math.ceil(s.tools.height)) && parseFloat(s.toolsHeight) === Math.ceil(s.tools.height) && s.now>=s.minimum && s.now<=s.maximum,'Native workspace/handle geometry and identity',s); return s; };
  const cleanup = () => { observer.disconnect(); if (computedDescriptor) Object.defineProperty(window,'getComputedStyle',computedDescriptor); else delete window.getComputedStyle; Object.defineProperty(Element.prototype,'getBoundingClientRect',rectDescriptor); };
  window.__workspaceWorkFixture = { cleanup };
  try {
    const before = geometry();
    const phase = async mutate => {
      stage = mutate ? 'unrelated-style' : 'unchanged'; counters[stage]={rootStyle:0,toolsRect:0}; const start=performance.now(), deliveries=outsideDeliveries;
      for(let index=0;index<6;index++) { await frame(); if(mutate) { outside.style.color=index%2?'rgb(30, 40, 50)':'rgb(60, 70, 80)'; outsideWrites++; } await frame(); }
      await paint(); const elapsed=performance.now()-start;
      check(document.visibilityState==='visible' && document.hasFocus(),'Foreground phase prerequisite');
      check(elapsed<400,'SETUP INCONCLUSIVE: measured phase must fit below unchanged real500ms fallback period',{stage,elapsed});
      const result={...counters[stage],elapsed,deliveries:outsideDeliveries-deliveries,writes:mutate?6:0,geometry:snapshot()};
      check(result.geometry.identity && result.geometry.width===before.width && result.geometry.toolsHeight===before.toolsHeight && closeEnough(result.geometry.panel.height,before.panel.height),'Stable native layout prerequisite',result);
      if(mutate) check(result.deliveries===6,'Six distinct real external style records required',result);
      return result;
    };
    const unchanged=await phase(false), unrelated=await phase(true);
    check(unchanged.rootStyle<=1 && unchanged.toolsRect<=1,'SETUP INCONCLUSIVE: unchanged phase must be settled except one fallback tick',unchanged);
    // A sub500ms phase may cross one existing fallback tick. Do not disable or
    // rewrite the interval: >1 delegated read proves additional discovery work.
    const stable={passed:unrelated.rootStyle<=1 && unrelated.toolsRect<=1 && unrelated.rootStyle<=unchanged.rootStyle+1 && unrelated.toolsRect<=unchanged.toolsRect+1,unchanged,unrelated,before};
    window.__workspaceWorkFixture.partial={stable,counters};
    stage='fallback-observation'; counters[stage]={rootStyle:0,toolsRect:0}; const fallbackStart=performance.now();
    await new Promise(resolve=>setTimeout(resolve,650)); await paint();
    const fallback={...counters[stage],elapsed:performance.now()-fallbackStart};
    stage='rail-change'; root.style.setProperty('--ff-combat-rail-width','900px');
    await wait('Root rail must update width constraints',()=>handle.getAttribute('aria-valuenow')==='192'); const rail=geometry();
    root.style.setProperty('--ff-combat-rail-width','60px'); await wait('Restore root rail',()=>handle.getAttribute('aria-valuenow')==='350');
    stage='tools-size-content'; nav.textContent += ' resized'; nav.style.height='54px';
    await wait('Real toolbar resize must update height',()=>root.style.getPropertyValue('--ff-combat-tools-height')==='55px'); const toolbar=geometry();
    stage='panel-replacement'; const previous=panel, replacement=document.createElement('section'); replacement.setAttribute('data-ff-combat-docked',''); replacement.append(heading,form); previous.replaceWith(replacement); panel=replacement;
    await wait('Actual panel replacement must remount owned tools',()=>tools.parentElement===panel && handle.parentElement===panel); const replaced=geometry();
    stage='close'; root.setAttribute('data-ff-combat-open','false'); await wait('Close removes tools/restores owned variables',()=>!tools.isConnected && !root.style.getPropertyValue('--ff-combat-width')); check(identity(),'Close preserves native identity');
    stage='open'; root.setAttribute('data-ff-combat-open','true'); await wait('Reopen mounts tools',()=>tools.parentElement===panel && root.style.getPropertyValue('--ff-combat-width')==='350px'); const reopened=geometry();
    window.__workspaceWorkFixture.afterResize = async () => {
      stage='actual-viewport'; await wait('Actual native viewport resized',()=>innerWidth===600 && handle.getAttribute('aria-valuenow')==='292'); const viewport=geometry();
      window.__workspaceWorkFixture.finish = async () => {
        stage='restored-viewport'; await wait('Viewport restoration',()=>innerWidth===1100 && handle.getAttribute('aria-valuenow')==='350'); geometry();
        stage='route-leave'; history.pushState({},'', '/fixture/settings'); window.dispatchEvent(new PopStateEvent('popstate'));
        await wait('Route exit releases workspace geometry',()=>!tools.isConnected && !root.style.getPropertyValue('--ff-combat-width')); check(identity(),'Route cleanup identity');
        stage='route-return'; history.pushState({},'', '/fixture/play'); window.dispatchEvent(new PopStateEvent('popstate'));
        await wait('Route return remounts geometry',()=>tools.isConnected && root.style.getPropertyValue('--ff-combat-width')==='350px'); geometry();
        install(false,'en'); await paint(); check(!tools.isConnected && !handle.isConnected && !root.style.getPropertyValue('--ff-combat-width') && !root.style.getPropertyValue('--ff-combat-tools-height'),'Dispose releases owned layout');
        stage='disposed'; counters[stage]={rootStyle:0,toolsRect:0}; outside.style.color='rgb(90, 100, 110)'; window.dispatchEvent(new Event('resize')); await new Promise(resolve=>setTimeout(resolve,650)); await paint();
        const disposed={...counters[stage]}; check(disposed.rootStyle===0 && disposed.toolsRect===0 && identity(),'Dispose leaves no geometry reads/actions',{disposed,identity:identity()});
        const result={passed:stable.passed,stable,fallback,controls:{rail,toolbar,replaced,reopened,viewport,disposed,identity:identity(),actions},counters,outsideWrites,outsideDeliveries}; cleanup(); return result;
      };
      return viewport;
    };
    return {stable,fallback,controls:{rail,toolbar,replaced,reopened}};
  } catch(error) { cleanup(); throw error; }
}
function prepare() {
  const root=process.env.FABLES_APP_ROOT || process.env.FABLES_TEST_APP_ROOT || path.resolve(__dirname,'../..');
  const filename=path.join(root,'dist/combat/combat-workspace.js'),{configureCombatWorkspace}=require(filename);
  for(const fn of [scenario,configureCombatWorkspace]) new vm.Script(`(${fn.toString()})`);
  return {source:configureCombatWorkspace.toString(),metadata:{root,compiledSHA256:sha(fs.readFileSync(filename)),functionSHA256:sha(configureCombatWorkspace.toString()),fixtureSHA256:sha(fs.readFileSync(__filename))}};
}
module.exports={scenario,prepare};
if(!process.versions.electron) {
  new vm.Script(`(${scenario.toString()})`); console.log('WORKSPACE_GEOMETRY_STATIC',JSON.stringify({fixtureSHA256:sha(fs.readFileSync(__filename)),scenarioSHA256:sha(scenario.toString())}));
} else {
  const {app,BrowserWindow,session}=require('electron'); app.on('window-all-closed',()=>{});
  let win,ownedProfile,passed=false;
  const timer=setTimeout(()=>{console.error('Workspace geometry hard30s deadline');win?.destroy();app.exit(1);},30000);
  (async()=>{try {
    const code=prepare(); console.log('WORKSPACE_GEOMETRY_SOURCE',JSON.stringify(code.metadata));
    const profile=process.env.FABLES_TEST_PROFILE_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(),'ff-workspace-work-')); if(!process.env.FABLES_TEST_PROFILE_DIR) ownedProfile=profile;
    app.setPath('userData',profile); await app.whenReady();
    const site=session.fromPartition('workspace-geometry-private'); site.protocol.handle('https',()=>new Response('<!doctype html><meta charset="utf-8"><style>'+css+'</style>',{headers:{'Content-Type':'text/html'}}));
    win=new BrowserWindow({show:false,width:1100,height:780,useContentSize:true,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
    await win.loadURL('https://play.fables.gg/fixture/play'); win.show();win.focus();win.webContents.focus();
    const deadline=Date.now()+2000;let ready=false;while(Date.now()<deadline){ready=await win.webContents.executeJavaScript("document.visibilityState==='visible'&&document.hasFocus()");if(win.isVisible()&&win.isFocused()&&ready)break;await new Promise(resolve=>setTimeout(resolve,25));}
    assert(win.isVisible()&&win.isFocused()&&ready,'Visible focused fixture required');
    const first=await win.webContents.executeJavaScript(`(${scenario.toString()})(${code.source})`); console.log('WORKSPACE_GEOMETRY_BEFORE_RESIZE',JSON.stringify(first));
    win.setContentSize(600,780);const viewport=await win.webContents.executeJavaScript('window.__workspaceWorkFixture.afterResize()');console.log('WORKSPACE_GEOMETRY_VIEWPORT',JSON.stringify(viewport));
    win.setContentSize(1100,780);const result=await win.webContents.executeJavaScript('window.__workspaceWorkFixture.finish()');console.log('WORKSPACE_GEOMETRY_RESULT',JSON.stringify(result));
    assert.equal(result.passed,true,'Unrelated external style changes must not repeatedly read workspace geometry');passed=true;
  }catch(error){console.error(error);if(win&&!win.isDestroyed())console.error('WORKSPACE_GEOMETRY_PARTIAL',JSON.stringify(await win.webContents.executeJavaScript('window.__workspaceWorkFixture?.partial').catch(()=>null)));}finally {
    if(win&&!win.isDestroyed())await win.webContents.executeJavaScript('window.__workspaceWorkFixture?.cleanup()').catch(()=>{});
    clearTimeout(timer);win?.destroy();if(ownedProfile)fs.rmSync(ownedProfile,{recursive:true,force:true});app.exit(passed?0:1);
  }})();
}
