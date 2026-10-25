// ROOT-scheduled native fixture. Pure serialized helpers never import fixture entrypoints.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const css = `body{margin:0;font:14px Arial}#chat{position:relative;width:700px;height:456px;margin:40px}.feed{box-sizing:border-box;width:100%;height:400px;overflow-y:auto;overflow-anchor:auto}.card{box-sizing:border-box;padding:4px}.prose p{margin:0;line-height:16px}#footer{height:56px;background:#123;color:white}#footer form{margin:0}#footer input{width:250px}`;
async function scenario(configure,settings) {
  const check=(condition,message,data)=>{if(!condition)throw Error(message+': '+JSON.stringify(data));};
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const paint=async()=>{await frame();await frame();};
  const wait=async(label,predicate)=>{for(let i=0;i<180;i++){await frame();check(document.visibilityState==='visible'&&document.hasFocus(),'Visible focused native fixture required',{stage});if(predicate())return;}throw Error(label+': '+JSON.stringify({stage,ends,samples:samples.slice(-12),writes:writes.slice(-12)}));};
  document.body.innerHTML='<section id="chat"><main id="feed" class="feed"><div id="events-list"></div></main><footer id="footer"><form><input value="Native retained draft"><button>Native action</button></form></footer></section>';
  let feed=document.getElementById('feed');const list=document.getElementById('events-list'),footer=document.getElementById('footer'),form=footer.querySelector('form'),draft=form.querySelector('input');
  let actions=0;form.addEventListener('submit',event=>{event.preventDefault();actions++;});
  const items=[];
  const message=(id,height,text,roll=false)=>{
    const row=document.createElement('div');row.id='event-'+id;const container=document.createElement('div');container.id='event-container-'+id;
    const card=document.createElement('div');card.id='event-message-card-'+id;card.className='card';card.style.height=height+'px';
    if(roll){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='d8';svg.setAttribute('width','18');svg.setAttribute('height','18');card.append(svg);}
    const prose=document.createElement('div');prose.className='prose';const p=document.createElement('p'),textNode=document.createTextNode(text);p.append(textNode);prose.append(p);card.append(prose);container.append(card);row.append(container);list.append(row);
    const item={row,container,card,prose,p,text:textNode,source:text};items.push(item);return item;
  };
  const top=document.createElement('div');top.style.height='520px';list.append(top);
  for(let id=1;id<=45;id++)message(id,32,'Native history '+id);
  const earlier=[document.createElement('div'),document.createElement('div')];list.append(...earlier);
  const gm=message(140,100,'Native narration remains readable.');const heading=document.createElement('div');heading.style.height='40px';gm.card.prepend(heading);const choices=document.createElement('div');gm.container.append(choices);
  const roll=message(149,120,'Damage 8 remains anchored.',true),following=message(184,100,'Final native response.');
  const bottom=document.createElement('div');bottom.style.height='520px';list.append(bottom);
  const box=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};};
  const glyph=item=>{const range=document.createRange();range.selectNodeContents(item.text);const r=range.getClientRects()[0];return r&&{top:r.top,bottom:r.bottom,left:r.left};};
  const own=()=>items.filter(item=>item.row.style.getPropertyValue('overflow-anchor')==='none'&&item.row.style.getPropertyPriority('overflow-anchor')==='important').map(item=>item.row.id);
  const identity=()=>form===footer.querySelector('form')&&draft===form.querySelector('input')&&draft.value==='Native retained draft'&&actions===0&&items.every(item=>item.row.isConnected&&item.container.parentElement===item.row&&item.card.parentElement===item.container&&item.text.parentElement===item.p&&item.text.data===item.source);
  const snapshot=()=>({top:feed.scrollTop,feed:box(feed),footer:box(footer),gm:box(gm.card),roll:box(roll.card),glyph:glyph(roll),owned:own(),identity:identity()});
  let stage='setup',scrollEvents=0,intermediates=0,wheelEvents=0,nativeWriters=null;
  const writes=[],records=[],ends=[],samples=[],styleOwners=new Map(items.map(item=>[item.row.style,item.row.id]));
  const setDescriptor=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,'setProperty'),removeDescriptor=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,'removeProperty');
  const recordWrite=(style,property,invoke)=>{
    const id=styleOwners.get(style),before=id&&property==='overflow-anchor'?style.cssText:null,result=invoke();
    if(before!==null&&style.cssText!==before){check(writes.length<800,'Targeted style write budget',{stage});writes.push({stage,id,at:performance.now(),before,after:style.cssText,value:style.getPropertyValue('overflow-anchor'),priority:style.getPropertyPriority('overflow-anchor')});}return result;
  };
  Object.defineProperty(CSSStyleDeclaration.prototype,'setProperty',{...setDescriptor,value:function(...args){return recordWrite(this,args[0],()=>Reflect.apply(setDescriptor.value,this,args));}});
  Object.defineProperty(CSSStyleDeclaration.prototype,'removeProperty',{...removeDescriptor,value:function(...args){return recordWrite(this,args[0],()=>Reflect.apply(removeDescriptor.value,this,args));}});
  const observer=new MutationObserver(delivery=>{for(const record of delivery)if(record.target instanceof HTMLElement&&styleOwners.has(record.target.style)){check(records.length<1000,'Targeted style record budget',{stage});records.push({stage,id:record.target.id,oldValue:record.oldValue,at:performance.now()});}});
  observer.observe(list,{attributes:true,subtree:true,attributeFilter:['style'],attributeOldValue:true});
  // Registered before the product so this capture observes the exact style set
  // before scrollFinished executes. No dispatched/synthetic scroll completion.
  const ended=event=>{
    if(event.target!==feed)return;check(ends.length<16,'Native completion budget',{stage});
    if(stage==='native-writer-completion'&&nativeWriters&&!nativeWriters.applied){
      check(event.isTrusted&&Math.abs(feed.scrollTop-nativeWriters.target)<=1&&nativeWriters.rows.every(row=>own().includes(row.id)),'Native writer must replace currently owned declarations before genuine completion');
      nativeWriters.rows[0].style.setProperty('overflow-anchor','auto','important');nativeWriters.rows[1].style.setProperty('overflow-anchor','none','');
      nativeWriters.applied={at:performance.now(),top:feed.scrollTop,trusted:event.isTrusted,values:nativeWriters.rows.map(row=>({id:row.id,value:row.style.getPropertyValue('overflow-anchor'),priority:row.style.getPropertyPriority('overflow-anchor')}))};
    }
    ends.push({stage,trusted:event.isTrusted,at:performance.now(),writeStart:writes.length,recordStart:records.length,before:snapshot()});
  };
  const scrolled=event=>{if(event.target===feed){scrollEvents++;if(stage==='stable-motion'&&feed.scrollTop>startTop+1&&feed.scrollTop<target-1)intermediates++;}};
  const wheeled=event=>{if(feed.contains(event.target)&&event.isTrusted)wheelEvents++;};
  document.addEventListener('scrollend',ended,true);document.addEventListener('scroll',scrolled,true);document.addEventListener('wheel',wheeled,true);
  const cleanup=()=>{observer.disconnect();document.removeEventListener('scrollend',ended,true);document.removeEventListener('scroll',scrolled,true);document.removeEventListener('wheel',wheeled,true);Object.defineProperty(CSSStyleDeclaration.prototype,'setProperty',setDescriptor);Object.defineProperty(CSSStyleDeclaration.prototype,'removeProperty',removeDescriptor);};
  window.__scrollendAnchorFixture={cleanup};
  let startTop=0,target=0;
  try {
    target=gm.row.offsetTop+30;feed.scrollTo({top:target-120,behavior:'instant'});await paint();
    configure(settings);await paint();await paint();
    check(items.length===48&&own().length>=3&&own().length<=39&&items.slice(0,8).every(item=>!own().includes(item.row.id)),'Actual bounded last40 suppression prerequisite',{cards:items.length,owned:own()});
    startTop=feed.scrollTop;stage='stable-motion';const endStart=ends.length,scrollStart=scrollEvents;
    const nativeOptions={top:target,behavior:'smooth'};feed.scrollTo(nativeOptions);
    await wait('Actual intermediate native smooth motion and genuine scrollend',()=>{
      check(samples.length<180,'Motion sample budget');samples.push({top:feed.scrollTop,at:performance.now(),ends:ends.length});
      return ends.length>endStart&&Math.abs(feed.scrollTop-target)<=1;
    });
    const completion=ends.at(-1);await paint();const after=snapshot(),completionWrites=writes.slice(completion.writeStart),completionRecords=records.slice(completion.recordStart);
    check(completion.trusted&&scrollEvents>scrollStart&&intermediates>0,'Genuine native motion/completion prerequisite',{completion,scrollEvents,intermediates,startTop,target});
    check(JSON.stringify(completion.before.owned)===JSON.stringify(after.owned)&&after.owned.length>=3&&Math.abs(after.top-completion.before.top)<=.5&&Math.abs(after.glyph.top-completion.before.glyph.top)<=.5&&JSON.stringify(after.feed)===JSON.stringify(completion.before.feed)&&JSON.stringify(after.footer)===JSON.stringify(completion.before.footer)&&after.identity,'Stable suppression set/geometry prerequisite',{completion,after});
    const stable={passed:completionWrites.length===0,startTop,target,scrollEvents:scrollEvents-scrollStart,intermediates,completion,after,writes:completionWrites,records:completionRecords};
    window.__scrollendAnchorFixture.partial={stable};
    stage='late-native-hydration';const hydrationBefore=snapshot();
    for(const owner of earlier){const result=document.createElement('div');result.style.height='82px';result.textContent='Native earlier result';owner.append(result);}const branch=document.createElement('div');branch.style.height='82px';branch.textContent='Damage / Rolled';choices.append(branch);
    await paint();await paint();const hydrationAfter=snapshot();
    check(Math.abs(hydrationAfter.glyph.top-hydrationBefore.glyph.top)<=.5&&Math.abs(hydrationAfter.roll.top-hydrationBefore.roll.top)<=.5&&Math.abs(hydrationAfter.top-hydrationBefore.top-246)<=1&&branch.getBoundingClientRect().height===82&&hydrationAfter.identity,'Real Chromium late hydration must retain glyph without product scroll compensation',{hydrationBefore,hydrationAfter});
    stage='preferred-row-change';const oldOwned=own(),oldEnd=ends.length,newTarget=feed.scrollTop+gm.row.getBoundingClientRect().top-feed.getBoundingClientRect().top-260;
    feed.scrollTo({top:newTarget,behavior:'smooth'});await wait('Second actual native non-tail request completes',()=>ends.length>oldEnd&&Math.abs(feed.scrollTop-newTarget)<=1);await paint();
    const preferred={before:oldOwned,after:own(),top:feed.scrollTop,target:newTarget};
    check(preferred.after.length>0&&JSON.stringify(preferred.before)!==JSON.stringify(preferred.after)&&preferred.before.filter(id=>!preferred.after.includes(id)).every(id=>!document.getElementById(id).style.getPropertyValue('overflow-anchor')),'Preferred row change must reconcile membership',preferred);
    stage='manual-wheel';const wheelStart=wheelEvents,wheelTop=feed.scrollTop,wheelEnds=ends.length,point=box(feed);
    window.__scrollendAnchorFixture.finish=async()=>{
      await wait('Trusted native wheel moves reader and completes',()=>wheelEvents>wheelStart&&feed.scrollTop<wheelTop-10&&ends.length>wheelEnds);await paint();
      const reader=items.find(item=>{const r=box(item.card),f=box(feed);return r.top>=f.top&&r.bottom<=f.bottom;});check(reader,'Native wheel reader target');
      const reading=glyph(reader),manualTop=feed.scrollTop;stage='selection';const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(reader.text);selection.removeAllRanges();selection.addRange(range);await paint();
      const selected=selection.toString();following.card.style.height='180px';await paint();await paint();
      check(selection.anchorNode===reader.text&&selection.toString()===selected&&Math.abs(glyph(reader).top-reading.top)<=.5&&Math.abs(feed.scrollTop-manualTop)<=.5&&identity(),'Manual/selection authority after native tail growth',{reading,after:glyph(reader),manualTop,top:feed.scrollTop});
      selection.removeAllRanges();await paint();await paint();
      stage='native-writer-completion';const writerRows=items.filter(item=>own().includes(item.row.id)).slice(0,2).map(item=>item.row);check(writerRows.length===2,'Two native ownership targets');
      nativeWriters={rows:writerRows,applied:null,target:feed.scrollTop+40};const writerEnds=ends.length,writerTarget=nativeWriters.target;
      feed.scrollTo({top:writerTarget,behavior:'smooth'});await wait('Native writer requires genuine completion before reconciliation',()=>ends.length>writerEnds&&nativeWriters.applied&&Math.abs(feed.scrollTop-writerTarget)<=1);await paint();
      const reconciled=writerRows.map(row=>({id:row.id,value:row.style.getPropertyValue('overflow-anchor'),priority:row.style.getPropertyPriority('overflow-anchor')}));
      check(reconciled.every(row=>row.value==='none'&&row.priority==='important'),'Still-desired rows must undergo normal policy reconciliation',reconciled);
      window.__friendsFablesDesktopChatAppearance.dispose();await paint();
      const released=writerRows.map(row=>({id:row.id,value:row.style.getPropertyValue('overflow-anchor'),priority:row.style.getPropertyPriority('overflow-anchor')}));
      const writerOwnership={applied:nativeWriters.applied,target:writerTarget,reconciled,released,restored:JSON.stringify(released)===JSON.stringify(nativeWriters.applied.values)};
      window.__scrollendAnchorFixture.partial={stable,writerOwnership};
      check(writerOwnership.restored&&identity(),'Completion cleanup restores newer native value/priority, not stale prior',writerOwnership);
      // Remount only after the cleanup assertion: later resets cannot mask it.
      configure(settings);await paint();await paint();check(own().length>=2,'Remounted current feed after native ownership control');
      stage='feed-replacement';const retired=feed,replacement=feed.cloneNode(false),retainedTop=feed.scrollTop;replacement.append(list);retired.replaceWith(replacement);feed=replacement;feed.scrollTop=retainedTop;
      await wait('Replacement feed adopts bounded anchor ownership',()=>own().length>=2);await paint();check(!retired.isConnected&&identity(),'Replacement native identity');
      stage='route-leave';history.pushState({},'', '/fixture/settings');window.dispatchEvent(new PopStateEvent('popstate'));await wait('Route exit restores owned styles',()=>own().length===0);check(identity(),'Route identity');
      stage='route-return';history.pushState({},'', '/fixture/play');window.dispatchEvent(new PopStateEvent('popstate'));await wait('Route returns to current native feed',()=>own().length>=2);
      stage='newer-native-dispose';const owned=items.filter(item=>own().includes(item.row.id)),value=owned[0].row,priority=owned[1].row;
      value.style.setProperty('overflow-anchor','auto','important');priority.style.setProperty('overflow-anchor','none','');
      window.__friendsFablesDesktopChatAppearance.dispose();await paint();
      check(value.style.getPropertyValue('overflow-anchor')==='auto'&&value.style.getPropertyPriority('overflow-anchor')==='important'&&priority.style.getPropertyValue('overflow-anchor')==='none'&&priority.style.getPropertyPriority('overflow-anchor')===''&&own().length===0&&identity(),'Dispose preserves newer native value/priority and restores only owned rows');
      const result={passed:stable.passed,stable,controls:{hydrationBefore,hydrationAfter,preferred,manual:{wheelEvents:wheelEvents-wheelStart,top:manualTop,selected},writerOwnership,replacement:true,route:true,newerValue:value.id,newerPriority:priority.id,identity:identity(),actions},totalWrites:writes.length,totalRecords:records.length};cleanup();return result;
    };
    return {stable,controls:{hydrationBefore,hydrationAfter,preferred},wheel:{x:Math.round(point.width/2+40),y:Math.round(point.top+100)}};
  }catch(error){cleanup();throw error;}
}
function prepare(){
  const root=process.env.FABLES_TEST_APP_ROOT||process.env.FABLES_APP_ROOT||path.resolve(__dirname,'../..'),filename=path.join(root,'dist/appearance/chat-appearance.js');
  const {configureChatAppearance}=require(filename),{DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
  for(const fn of [scenario,configureChatAppearance])new vm.Script(`(${fn.toString()})`);
  return {source:configureChatAppearance.toString(),settings:DEFAULT_APPEARANCE,metadata:{root,compiledSHA256:sha(fs.readFileSync(filename)),functionSHA256:sha(configureChatAppearance.toString()),fixtureSHA256:sha(fs.readFileSync(__filename))}};
}
module.exports={scenario,prepare};
if(!process.versions.electron){new vm.Script(`(${scenario.toString()})`);console.log('SCROLLEND_ANCHOR_STATIC',JSON.stringify({fixtureSHA256:sha(fs.readFileSync(__filename)),scenarioSHA256:sha(scenario.toString())}));}
else {
  const {app,BrowserWindow,session}=require('electron');app.on('window-all-closed',()=>{});let win,ownedProfile,passed=false;
  const timer=setTimeout(()=>{console.error('Scrollend anchor hard30s deadline');win?.destroy();app.exit(1);},30000);
  (async()=>{try{
    const code=prepare();console.log('SCROLLEND_ANCHOR_SOURCE',JSON.stringify(code.metadata));
    const profile=process.env.FABLES_TEST_PROFILE_DIR||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'ff-scrollend-anchor-'));if(!process.env.FABLES_TEST_PROFILE_DIR)ownedProfile=profile;
    app.setPath('userData',profile);await app.whenReady();const site=session.fromPartition('scrollend-anchor-private');site.protocol.handle('https',()=>new Response('<!doctype html><meta charset="utf-8"><style>'+css+'</style>',{headers:{'Content-Type':'text/html'}}));
    win=new BrowserWindow({show:false,width:1000,height:800,useContentSize:true,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});await win.loadURL('https://play.fables.gg/fixture/play');win.show();win.focus();win.webContents.focus();
    const deadline=Date.now()+2000;let ready=false;while(Date.now()<deadline){ready=await win.webContents.executeJavaScript("document.visibilityState==='visible'&&document.hasFocus()");if(win.isVisible()&&win.isFocused()&&ready)break;await new Promise(resolve=>setTimeout(resolve,25));}assert(win.isVisible()&&win.isFocused()&&ready,'Visible focused native window');
    const first=await win.webContents.executeJavaScript(`(${scenario.toString()})(${code.source},${JSON.stringify(code.settings)})`);console.log('SCROLLEND_ANCHOR_BEFORE_WHEEL',JSON.stringify(first));
    win.webContents.sendInputEvent({type:'mouseMove',...first.wheel});win.webContents.sendInputEvent({type:'mouseWheel',...first.wheel,deltaX:0,deltaY:120,canScroll:true});
    const result=await win.webContents.executeJavaScript('window.__scrollendAnchorFixture.finish()');console.log('SCROLLEND_ANCHOR_RESULT',JSON.stringify(result));assert.equal(result.passed,true,'Stable actual scrollend must not clear/reapply unchanged suppression set');passed=true;
  }catch(error){console.error(error);if(win&&!win.isDestroyed())console.error('SCROLLEND_ANCHOR_PARTIAL',JSON.stringify(await win.webContents.executeJavaScript('window.__scrollendAnchorFixture?.partial').catch(()=>null)));}finally{
    if(win&&!win.isDestroyed())await win.webContents.executeJavaScript('window.__scrollendAnchorFixture?.cleanup()').catch(()=>{});clearTimeout(timer);win?.destroy();if(ownedProfile)fs.rmSync(ownedProfile,{recursive:true,force:true});app.exit(passed?0:1);
  }})();
}
