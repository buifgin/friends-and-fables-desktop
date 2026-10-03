(() => {
 const $=id=>document.getElementById(id), bridge=window.appearanceButton;
 let locale='en', status={paused:true,available:false,next:false,loop:false,volume:.5,muted:false,title:''};
 const words={Appearance:'Внешний вид',Music:'Музыка','Music library':'Музыкальная библиотека',Play:'Играть',Pause:'Пауза',Stop:'Стоп','Next track':'Следующий трек','Repeat track':'Повторять трек',Volume:'Громкость',Mute:'Без звука',Unmute:'Включить звук','Choose a track':'Выберите трек','Campaign controls':'Управление кампанией'};
 const text=value=>locale==='ru'?words[value]??value:value;
 function label(id,value){$(id).title=text(value);$(id).setAttribute('aria-label',text(value));}
 function render(){
  document.querySelector('nav').setAttribute('aria-label',text('Campaign controls'));$('volume-popup').setAttribute('aria-label',text('Volume'));
  for(const [id,value] of [['appearance-button','Appearance'],['library','Music'],['open-library','Music library'],['play',status.paused?'Play':'Pause'],['next','Next track'],['repeat','Repeat track'],['volume-button','Volume']])label(id,value);
  $('play-icon').toggleAttribute('hidden',!status.paused);$('pause-icon').toggleAttribute('hidden',status.paused);$('play').disabled=!status.available;$('next').disabled=!status.next;
  $('repeat').setAttribute('aria-pressed',String(status.loop));
  $('volume-wave').toggleAttribute('hidden',status.muted);$('mute').textContent=text(status.muted?'Unmute':'Mute');$('mute').setAttribute('aria-pressed',String(status.muted));
  $('volume').value=Math.round(status.volume*100);$('volume-value').value=`${Math.round(status.volume*100)}%`;
  document.querySelector('label[for=volume]').textContent=text('Volume');$('track-name').textContent=status.title||text('Choose a track');
 }
 function popup(open){$('volume-popup').hidden=!open;$('volume-button').setAttribute('aria-expanded',String(open));void bridge.popup(open).catch(console.error);}
 function musicControls(open){const group=$('music-controls');group.inert=!open;group.setAttribute('aria-hidden',String(!open));$('library').setAttribute('aria-expanded',String(open));if(!open){if(group.contains(document.activeElement))$('library').focus();popup(false);}}
 $('appearance-button').addEventListener('click',()=>{popup(false);void bridge.toggle().catch(console.error);});
 $('library').addEventListener('click',()=>musicControls($('library').getAttribute('aria-expanded')!=='true'));
 $('open-library').addEventListener('click',()=>void bridge.control('library').catch(console.error));
 for(const id of ['play','next','repeat','mute'])$(id).addEventListener('click',()=>void bridge.control(id).catch(console.error));
 $('volume-button').addEventListener('click',()=>popup($('volume-popup').hidden));
 $('volume').addEventListener('input',()=>{const value=Number($('volume').value)/100;status.volume=value;$('volume-value').value=`${Math.round(value*100)}%`;void bridge.control('volume',value).catch(console.error);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')popup(false);});window.addEventListener('blur',()=>popup(false));bridge.onPopupClose(()=>popup(false));
 function appearance(state){window.settingsTheme.apply(state.settings);locale=state.locale;document.documentElement.lang=locale;$('appearance-button').setAttribute('aria-expanded',String(state.open));render();}
 function music(state){status=state;locale=state.locale;render();}
 bridge.onChange(appearance);bridge.onMusic(music);bridge.get().then(appearance).catch(console.error);bridge.getMusic().then(music).catch(console.error);
})();
