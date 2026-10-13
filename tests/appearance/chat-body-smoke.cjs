const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {app,BrowserWindow,session}=require('electron');
app.on('window-all-closed',()=>{});
const root=process.env.FABLES_TEST_APP_ROOT||path.join(__dirname,'../..');
const {configureChatAppearance,chatCss}=require(path.join(root,'dist/appearance/chat-appearance'));
const {DEFAULT_APPEARANCE}=require(path.join(root,'dist/appearance/themes'));
const settings={...DEFAULT_APPEARANCE,preset:'website',messages:{...DEFAULT_APPEARANCE.messages,enabled:true}};
const campaign='01a0d854-78d5-7064-ae41-f63d561c8e01';
const html='<!doctype html><style>.card{position:relative;padding:10px;width:500px;box-sizing:border-box}.author{height:40px}.prose>div:not(:empty){padding:21px 0;line-height:24px}.prose p{margin:0}</style><body><main id="feed"></main></body>';
let window,profile,passed=false;
const timer=setTimeout(()=>{console.error('Chat body fixture timed out');app.exit(1)},30000);
(async()=>{
 try{
  profile=await fs.mkdtemp(path.join(os.tmpdir(),'ff-body-'));app.setPath('userData',profile);await app.whenReady();
  const site=session.fromPartition('chat-body');site.protocol.handle('https',()=>new Response(html,{headers:{'Content-Type':'text/html'}}));
  window=new BrowserWindow({show:false,width:1100,height:820,webPreferences:{session:site,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await window.loadURL(`https://play.fables.gg/${campaign}/play`);
  window.show();window.focus();window.webContents.focus();assert.equal(window.isVisible(),true);
  const result=await window.webContents.executeJavaScript(`(async()=>{
   const campaign=${JSON.stringify(campaign)},settings=${JSON.stringify(settings)};
   const configure=${configureChatAppearance.toString()};
   const style=document.createElement('style');style.textContent=${JSON.stringify(chatCss(settings,null))};document.head.append(style);
   let now=Date.now();const realNow=Date.now;Date.now=()=>now;
   const firstFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const settle=async()=>{await firstFrame();await firstFrame()};
   const check=(condition,message)=>{if(!condition)throw Error(message)};
   const event=(id,content='Chat geometry check 18',author=83026155,role='player')=>({id,content,character_id:author,profile_id:'172b6f15-24d5-4daf-82be-e51edfe9699b',campaign_id:campaign,role,...(id===null?{isOptimistic:true}:{})});
   const card=(native,visible='')=>{const card=document.createElement('div');card.className='card';card.id='event-message-card-'+native.id;card.innerHTML='<div class="author">Могнус</div><div class="prose"><div></div></div>';card.querySelector('.prose>div').textContent=visible;card.__reactFiber$fixture={memoizedProps:{event:native}};document.getElementById('feed').append(card);return card};
   const overlay=card=>card.querySelector('[data-ff-desktop-message-snapshot]');
   const temporary=card(event(null),'Chat geometry check 18');configure(settings);await settle();
   const observed=temporary.getBoundingClientRect().height;
   now+=4100; // A visible optimistic body stays eligible during a slow POST.
   temporary.remove();const confirmed=card(event(108077984));const body=confirmed.querySelector('.prose'),nativeChild=body.firstElementChild;await firstFrame();
   check(overlay(confirmed)?.textContent==='Chat geometry check 18','Verified optimistic-to-confirmed body lost before native hydration');
   check(confirmed.getAttribute('data-ff-desktop-message')==='player','First-frame role was not marked');
   check(confirmed.getBoundingClientRect().height===observed,'Observed card geometry collapsed during native body gap');
   check(confirmed.querySelector('.prose')===body&&body.firstElementChild===nativeChild,'Native prose identity was replaced');
   nativeChild.textContent='Chat geometry check 18';await settle();check(!overlay(confirmed),'Fallback remained after native body became ready');
   check(confirmed.style.getPropertyValue('min-height')==='','Reserved geometry remained after ready');
   // Unrelated renderer churn must not inspect or re-clone unchanged prose.
   const stable=card(event(300,'Stable body'),'Stable body');
   const navigation=document.createElement('header');document.body.append(navigation);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');confirmed.append(svg);await settle();
   const realClone=Node.prototype.cloneNode,realComputed=window.getComputedStyle;
   let proseClones=0,stableClones=0,styleReads=0;
   Node.prototype.cloneNode=function(deep){if(this instanceof Element&&this.matches('.prose')){proseClones++;if(this===stable.querySelector('.prose'))stableClones++}return realClone.call(this,deep)};
   window.getComputedStyle=function(...args){styleReads++;return realComputed.apply(this,args)};
   for(let i=0;i<3;i++){navigation.style.opacity=String(.8+i*.05);svg.style.transform='rotate('+i+'deg)';await settle()}
   check(styleReads===0&&proseClones===0,'Unrelated header/SVG updates performed snapshot visibility or cloning work');
   confirmed.append(document.createElement('i'));await settle();
   check(proseClones===0,'Unchanged visible body was re-cloned');
   nativeChild.textContent='Changed visible body';await settle();
   check(proseClones>0&&stableClones===0,'A body update failed to refresh only its own snapshot');
   Node.prototype.cloneNode=realClone;window.getComputedStyle=realComputed;
   nativeChild.textContent='Chat geometry check 18';await settle();
   // Same-ID visible GM/player hydration, without resurrecting hidden narration.
   now+=4100; // Quiet, still-visible history must remain eligible for hydration.
   nativeChild.textContent='';await settle();check(overlay(confirmed)?.textContent==='Chat geometry check 18','Same-ID player body gap after quiet visible time');
   nativeChild.textContent='Chat geometry check 18';await settle();
   const gm=card(event(200,'Franz visible',83026155,'dm'),'Franz visible');await settle();gm.querySelector('.prose>div').textContent='';await settle();check(overlay(gm)?.textContent==='Franz visible','Same-ID visible Franz body gap');
   gm.querySelector('.prose').style.setProperty('display','none','important');gm.append(document.createElement('i'));await settle();check(!overlay(gm),'Hidden AutoDamage narration leaked');
   const expiredTemporary=card(event(null,'Detached expired'),'Detached expired');await settle();expiredTemporary.remove();await settle();now+=4100;
   const expiredConfirmed=card(event(203,'Detached expired'));await firstFrame();check(!overlay(expiredConfirmed),'Detached optimistic snapshot exceeded four-second TTL');
   const unrelated=card(event(201,'Different content'));await settle();check(!overlay(unrelated),'Arbitrary positive ID received previous body');
   const foreign=card(event(202,'Chat geometry check 18',999));await settle();check(!overlay(foreign),'Another author received fallback');
   // Escaped guidance belongs in the association only, never its visible clone.
   confirmed.__reactFiber$fixture.memoizedProps.event=event(108077984,'Chat geometry check 18\\n\\[\\[FF-SP:1\\]\\] private guidance');nativeChild.textContent='Chat geometry check 18';const hidden=document.createElement('p');hidden.setAttribute('data-ff-desktop-hidden-instructions','true');hidden.textContent='[[FF-SP:1]] private guidance [[/FF-SP:1]]';body.append(hidden);await settle();nativeChild.textContent='';hidden.remove();await settle();check(!overlay(confirmed)?.textContent.includes('private guidance'),'Hidden guidance leaked');
   body.setAttribute('data-ff-translation-blank','');body.setAttribute('data-ff-translation-pending','');await settle();check(!overlay(confirmed),'Pending English exposed by continuity');
   body.removeAttribute('data-ff-translation-blank');body.removeAttribute('data-ff-translation-pending');nativeChild.textContent='Переведённый текст';document.dispatchEvent(new Event('ff-desktop-translation-ready'));await settle();nativeChild.textContent='';await settle();check(overlay(confirmed)?.textContent==='Переведённый текст','Translated visible text was not retained');
   now+=4100;confirmed.append(document.createElement('i'));await settle();check(!overlay(confirmed)&&confirmed.style.getPropertyValue('min-height')==='','Expired body/geometry remained');
   nativeChild.textContent='Ready again';await settle();nativeChild.textContent='';await settle();check(overlay(confirmed),'Expected same-ID overlay for disposal');
   window.__friendsFablesDesktopChatAppearance.dispose();check(!document.querySelector('[data-ff-desktop-message-snapshot]')&&confirmed.style.getPropertyValue('min-height')==='','Dispose retained body/geometry');
   configure(settings);nativeChild.textContent='Ready again';await settle();nativeChild.textContent='';await settle();history.replaceState({},'', '/settings');window.dispatchEvent(new Event('popstate'));await settle();check(!document.querySelector('[data-ff-desktop-message-snapshot]'),'Route change retained body');
   window.__friendsFablesDesktopChatAppearance.dispose();Date.now=realNow;return {passed:true,observed};
  })()`);
  assert.equal(result.passed,true);console.log('Chat body continuity fixture passed:',result);passed=true;
 }catch(error){console.error('Chat body fixture failed:',error);}finally{clearTimeout(timer);window?.destroy();if(profile)await fs.rm(profile,{recursive:true,force:true});app.exit(passed?0:1);}
})().catch(error=>{console.error(error);app.exit(1)});
