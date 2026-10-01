const form = document.querySelector('#appearance-form');
const fieldset = document.querySelector('#theme-options');
const colorInput = document.querySelector('#custom-color');
const hexInput = document.querySelector('#custom-hex');
const preview = document.querySelector('#preview');
const status = document.querySelector('#status');
const element = id => document.getElementById(id);
const roles = ['player', 'gm', 'context', 'context-block', 'context-bar', 'event', 'roll'];
let busy = true;
let customColor = '#161616';
let backgroundImage = null;
let backgroundName = '';
let imagePreview = null;
let previousImage;
let previewFrame = 0;
let activePanel = 'theme-panel';
let canUndoReset = false;
let panelWidth = 420;
let appliedRevision = -1;
const previousStyles = new Map();

for (const field of document.querySelectorAll('[data-style]')) {
  const role = field.dataset.style;
  const editor = element('style-editor').content.cloneNode(true);
  for (const control of editor.querySelectorAll('[data-control]')) control.id = `${role}-${control.dataset.control}`;
  for (const label of editor.querySelectorAll('[data-label]')) label.htmlFor = `${role}-${label.dataset.label}`;
  field.append(editor);
}
for (const field of document.querySelectorAll('[data-critical]')) {
  const paints = document.createElement('div'); paints.className = 'dice-paints';
  for (const [part,title] of [['face','Faces'],['edge','Edges'],['number','Numbers']]) {
    const label = document.createElement('label'); label.className = 'setting-row'; label.append(document.createTextNode(title));
    const input = document.createElement('input'); input.type = 'color'; input.id = `${field.dataset.critical}-${part}-color`;
    label.append(input); paints.append(label);
  }
  field.append(paints);
}
function readDicePalette(result) {
  return { enabled: element(`${result}-colors`).checked, ...Object.fromEntries(['face','edge','number'].map(part => [`${part}Color`,element(`${result}-${part}-color`).value])) };
}
function readStyle(role) {
  return { color: element(`${role}-color`).value, opacity: Number(element(`${role}-opacity`).value) / 100,
    textColor: element(`${role}-auto-text`).checked ? null : element(`${role}-text-color`).value,
    gradient: { enabled: element(`${role}-gradient`).checked, color: element(`${role}-gradient-color`).value,
      angle: Number(element(`${role}-gradient-angle`).value), secondOpacity: Number(element(`${role}-gradient-second-opacity`).value) / 100,
      balance: Number(element(`${role}-gradient-balance`).value) },
    border: { enabled: element(`${role}-border`).checked, color: element(`${role}-border-color`).value,
      width: Number(element(`${role}-border-width`).value), radius: Number(element(`${role}-border-radius`).value), variant: element(`${role}-border-variant`).value } };
}
function selection() {
  return {
    preset: form.elements.preset.value, customColor,
    backgroundImage, backgroundName, backgroundFit: element('image-fit').value,
    backgroundEffects: { blur: Number(element('image-blur').value), opacity: Number(element('image-opacity').value) / 100,
      overlayColor: element('image-overlay-color').value, overlayOpacity: Number(element('image-overlay-opacity').value) / 100 },
    messages: { enabled: element('message-styles').checked, player: readStyle('player'), gm: readStyle('gm') },
    context: { enabled: element('context-styles').checked, style: readStyle('context'), blocks: readStyle('context-block'), bar: readStyle('context-bar') },
    events: { enabled: element('event-styles').checked, style: readStyle('event') },
    dice: { enabled: element('roll-styles').checked, style: readStyle('roll'), colorsEnabled: element('dice-colors').checked,
      faceColor: element('dice-face-color').value, edgeColor: element('dice-edge-color').value, numberColor: element('dice-number-color').value,
      resultTextColor: element('dice-result-auto').checked ? null : element('dice-result-color').value,
      natural20: readDicePalette('natural20'), natural1: readDicePalette('natural1') },
    appearancePinned: element('pin-appearance').checked, appearancePanelWidth: panelWidth,
    resizableMap: element('resizable-map').checked,
    linuxBlackMenu: element('black-menu').checked, linuxFloatingAppearance: element('floating-appearance').checked,
  };
}
function showSettings(settings) {
  if (settings.revision < appliedRevision) return;
  appliedRevision = settings.revision;
  canUndoReset = settings.canUndoReset;
  panelWidth = settings.appearancePanelWidth;
  element('pin-appearance').checked = settings.appearancePinned;
  element('resizable-map').checked = settings.resizableMap;
  window.settingsLocale.set(settings.locale);
  if (settings.presentation) {
    document.body.classList.toggle('docked', settings.presentation === 'panel');
    element('panel-toolbar').hidden = element('panel-resizer').hidden = settings.presentation !== 'panel';
  }
  form.elements.preset.value = settings.preset;
  customColor = settings.customColor;
  colorInput.value = customColor; hexInput.value = customColor;
  backgroundImage = settings.backgroundImage; backgroundName = settings.backgroundName; imagePreview = settings.imagePreview;
  element('image-fit').value = settings.backgroundFit;
  element('image-blur').value = settings.backgroundEffects.blur;
  element('image-opacity').value = settings.backgroundEffects.opacity * 100;
  element('image-overlay-color').value = settings.backgroundEffects.overlayColor;
  element('image-overlay-opacity').value = settings.backgroundEffects.overlayOpacity * 100;
  element('message-styles').checked = settings.messages.enabled;
  element('context-styles').checked = settings.context.enabled;
  element('event-styles').checked = settings.events.enabled;
  element('roll-styles').checked = settings.dice.enabled;
  element('dice-colors').checked = settings.dice.colorsEnabled;
  element('dice-result-auto').checked = !settings.dice.resultTextColor;
  element('dice-result-color').value = settings.dice.resultTextColor ?? '#ffffff';
  for (const part of ['face','edge','number']) element(`dice-${part}-color`).value = settings.dice[`${part}Color`];
  for (const result of ['natural20','natural1']) {
    element(`${result}-colors`).checked = settings.dice[result].enabled;
    for (const part of ['face','edge','number']) element(`${result}-${part}-color`).value = settings.dice[result][`${part}Color`];
  }
  for (const role of roles) {
    const style = role === 'player' || role === 'gm' ? settings.messages[role]
      : role === 'context' ? settings.context.style : role === 'context-block' ? settings.context.blocks : role === 'context-bar' ? settings.context.bar : role === 'event' ? settings.events.style : settings.dice.style;
    element(`${role}-color`).value = style.color;
    element(`${role}-opacity`).value = Math.round(style.opacity * 100);
    element(`${role}-auto-text`).checked = !style.textColor;
    element(`${role}-text-color`).value = style.textColor ?? '#ffffff';
    element(`${role}-gradient`).checked = style.gradient.enabled;
    element(`${role}-gradient-color`).value = style.gradient.color;
    element(`${role}-gradient-angle`).value = style.gradient.angle;
    element(`${role}-gradient-second-opacity`).value = Math.round(style.gradient.secondOpacity * 100);
    element(`${role}-gradient-balance`).value = style.gradient.balance;
    element(`${role}-border`).checked = style.border.enabled;
    for (const part of ['color','width','radius','variant']) element(`${role}-border-${part}`).value = style.border[part];
  }
  element('black-menu').checked = settings.linuxBlackMenu;
  element('floating-appearance').checked = settings.linuxFloatingAppearance;
  element('linux-menu-setting').hidden = settings.platform !== 'linux';
  element('app-platform-note').hidden = settings.platform === 'linux';
  updatePreview();
}
function luminance(color, opacity, background) {
  const channels = [1, 3, 5].map(offset => {
    const base = parseInt(background.slice(offset, offset + 2), 16);
    return Math.round(base + (parseInt(color.slice(offset, offset + 2), 16) - base) * opacity) / 255;
  }).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function foreground(color, opacity = 1, background = '#010b0e', second = null, balance = 50, secondOpacity = opacity) {
  const values = [...(!second || balance > 0 ? [[color,opacity]] : []), ...(second && balance < 100 ? [[second,secondOpacity]] : [])].map(([c,a]) => luminance(c, a, background));
  return Math.min(...values.map(l => 1.05 / (l + .05))) >= Math.min(...values.map(l => (l + .05) / .05)) ? '#ffffff' : '#000000';
}
function rgba(hex, opacity) { return `rgba(${[1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(',')},${opacity})`; }
function setPreview(name, value) {
  if (previousStyles.get(name) === value) return;
  preview.style.setProperty(name, value); previousStyles.set(name, value);
}
function schedulePreview() { if (!previewFrame) previewFrame = requestAnimationFrame(updatePreview); }
function updatePreview() {
  cancelAnimationFrame(previewFrame); previewFrame = 0;
  const settings = selection();
  window.settingsTheme.apply(settings);
  fieldset.disabled = busy;
  for (const id of ['apply','reset','undo-reset','import-image','browse-images','import-theme','export-theme','export-picture','message-styles','context-styles','context-part','event-styles','roll-styles','dice-colors','black-menu','floating-appearance','pin-appearance','resizable-map']) element(id).disabled = busy;
  element('floating-appearance').disabled = busy || settings.appearancePinned;
  element('undo-reset').hidden = !canUndoReset;
  element('dice-result-auto').disabled = busy;
  element('dice-result-color').disabled = busy || !settings.dice.resultTextColor;
  colorInput.disabled = hexInput.disabled = busy || settings.preset !== 'custom';
  element('remove-image').disabled = element('image-fit').disabled = busy || !backgroundImage;
  for (const id of ['image-blur','image-opacity','image-overlay-color','image-overlay-opacity']) element(id).disabled = busy || !backgroundImage;
  element('image-blur-label').value = `${settings.backgroundEffects.blur} px`;
  element('image-opacity-label').value = `${Math.round(settings.backgroundEffects.opacity * 100)}%`;
  element('image-overlay-opacity-label').value = `${Math.round(settings.backgroundEffects.overlayOpacity * 100)}%`;
  const colors = { website: '#010b0e', amoled: '#000000', black: '#101010', light: '#f5f5f5' };
  const color = colors[settings.preset] ?? customColor;
  for (const role of roles) {
    const enabled = role.startsWith('context') ? settings.context.enabled : role === 'event' ? settings.events.enabled
      : role === 'roll' ? settings.dice.enabled : settings.messages.enabled;
    const style = readStyle(role);
    for (const control of document.querySelectorAll(`[data-style="${role}"] input, [data-style="${role}"] select`)) {
      const part = control.dataset.control;
      control.disabled = busy || !enabled || (part === 'text-color' && !style.textColor)
        || (part.startsWith('gradient-') && !style.gradient.enabled)
        || (['border-color','border-width','border-variant'].includes(part) && !style.border.enabled);
    }
    element(`${role}-opacity-title`).textContent = style.gradient.enabled ? 'First color opacity' : 'Background opacity';
    for (const [part, unit, value] of [['opacity','%',style.opacity*100], ['gradient-angle','°',style.gradient.angle], ['gradient-second-opacity','%',style.gradient.secondOpacity*100],
      ['border-width',' px',style.border.width], ['border-radius',' px',style.border.radius]]) element(`${role}-${part}-label`).value = `${Math.round(value)}${unit}`;
    element(`${role}-gradient-balance-label`).value = `${Math.round(style.gradient.balance)}% / ${Math.round(100-style.gradient.balance)}%`;
    const first = rgba(style.color, style.opacity);
    const bg = style.gradient.enabled ? `linear-gradient(${style.gradient.angle}deg,${first} ${Math.max(0,style.gradient.balance*2-100)}%,${rgba(style.gradient.color,style.gradient.secondOpacity)} ${Math.min(100,style.gradient.balance*2)}%)` : first;
    setPreview(`--${role}-bg`, enabled ? bg : role === 'context' ? '#1f2937' : '#1f2937cc');
    setPreview(`--${role}-fg`, enabled ? style.textColor ?? foreground(style.color, style.opacity, color, style.gradient.enabled ? style.gradient.color : null, style.gradient.balance, style.gradient.secondOpacity) : '#fff');
    setPreview(`--${role}-border`, enabled && style.border.enabled ? `${style.border.width}px solid ${style.border.color}` : '0 solid transparent');
    setPreview(`--${role}-radius`, enabled ? `${style.border.radius}px` : '8px');
    setPreview(`--${role}-ornament`, enabled && style.border.enabled ? borderImages(style.border) : 'none');
    setPreview(`--${role}-inner-border`, enabled && style.border.enabled && style.border.variant==='ornate' ? `1px solid ${style.border.color}` : '0 solid transparent');
    const decorated = enabled && style.border.enabled && style.border.variant !== 'plain';
    setPreview(`--${role}-padding`, decorated ? role==='context-bar'?'12px':'20px' : role==='context-bar'?'8px 14px':role==='roll'?'12px':role==='event'?'14px':'10px');
    setPreview(`--${role}-min-height`, decorated ? role==='context-bar'?'40px':'72px' : '0');
    if(role==='player'){
      setPreview('--input-padding',decorated?'12px':'10px');
      setPreview('--input-min-height',decorated?'40px':'0');
    }
  }
  for (const result of ['natural20','natural1']) {
    element(`${result}-colors`).disabled = busy;
    for (const part of ['face','edge','number']) element(`${result}-${part}-color`).disabled = busy || !settings.dice[result].enabled;
  }
  element('dice-preview-result').disabled = busy;
  const previewValue = element('dice-preview-result').value;
  const result = previewValue === '20' ? 'natural20' : previewValue === '1' ? 'natural1' : null;
  const palette = result && settings.dice[result].enabled ? settings.dice[result] : settings.dice.colorsEnabled ? settings.dice : null;
  for (const part of ['face','edge','number']) {
    element(`dice-${part}-color`).disabled = busy || !settings.dice.colorsEnabled;
    setPreview(`--dice-${part}`, palette ? palette[`${part}Color`] : {face:'#203da6',edge:'#d8bb82',number:'#f8c134'}[part]);
  }
  preview.querySelector('.die-number').textContent = previewValue;
  preview.querySelector('.sample-roll-result').textContent = result ? (previewValue === '20' ? 'Natural 20' : 'Natural 1') : '16 = 16 · 16 Damage';
  for (const button of document.querySelectorAll('[data-dice-preset]')) button.disabled = busy;
  setPreview('--roll-result-fg', settings.dice.resultTextColor ?? 'inherit');
  setPreview('--preview-bg', color); setPreview('--preview-fg', foreground(color));
  // Never rebuild or parse a multi-megabyte data URL during color dragging.
  if (previousImage !== imagePreview) { setPreview('--preview-image', imagePreview ? `url("${imagePreview}")` : 'none'); previousImage = imagePreview; }
  setPreview('--preview-fit', settings.backgroundFit);
  setPreview('--preview-blur', `${settings.backgroundEffects.blur}px`);
  setPreview('--preview-image-opacity', String(settings.backgroundEffects.opacity));
  setPreview('--preview-overlay', imagePreview ? rgba(settings.backgroundEffects.overlayColor,settings.backgroundEffects.overlayOpacity) : 'transparent');
  element('image-name').toggleAttribute('data-no-localize',!!backgroundName);
  element('image-name').textContent = backgroundName || "Using the campaign's existing background.";
  for (const [selector, show] of [ ['.sample-message', !['context-panel','events-panel','dice-panel'].includes(activePanel)],
    ['.sample-context',activePanel==='context-panel'], ['.sample-context-bar',activePanel==='context-panel'], ['.sample-event',activePanel==='events-panel'],
    ['.sample-roll',activePanel==='dice-panel'], ['.sample-input',activePanel==='messages-panel'], ['.sample-controls',activePanel==='messages-panel'] ]) {
    for (const sample of preview.querySelectorAll(selector)) sample.hidden = !show;
  }
}
function notify(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
async function save(settings) {
  busy = true; updatePreview(); notify('Applying appearance…');
  try { showSettings(await window.appearance.save(settings)); notify('Appearance applied and saved for next time.'); }
  catch (error) { notify(`Could not apply changes: ${error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')}`, true); }
  finally { busy = false; updatePreview(); }
}
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    activePanel = tab.dataset.panel;
    for (const other of document.querySelectorAll('.tab')) {
      const selected = other === tab;
      other.classList.toggle('active', selected); other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1; element(other.dataset.panel).hidden = !selected;
    }
    updatePreview();
  });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault(); const tabs = Array.from(document.querySelectorAll('.tab'));
    const next = tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; next.click(); next.focus();
  });
}
form.addEventListener('input', event => {
  if (event.target === colorInput) { customColor = colorInput.value; hexInput.value = customColor; }
  if (event.target === hexInput && /^#[\da-f]{6}$/i.test(hexInput.value)) { customColor = hexInput.value.toLowerCase(); colorInput.value = customColor; }
  schedulePreview();
});
form.addEventListener('change', () => { schedulePreview(); notify('Preview ready. Apply to change the app.'); });
form.addEventListener('submit', event => { event.preventDefault(); if (!busy) void save(selection()); });
async function runAction(action, success) {
  if (busy) return;
  busy=true;updatePreview();
  try {const state=await action();if(state)showSettings(state);notify(success);}
  catch(error){notify(error.message.replace(/^Error invoking remote method '[^']+': Error: /,''),true);}
  finally{busy=false;updatePreview();}
}
element('reset').addEventListener('click', () => void runAction(()=>window.appearance.reset(selection()),'Appearance reset. Undo last reset restores your choices and picture.'));
element('undo-reset').addEventListener('click', () => void runAction(()=>window.appearance.undoReset(),'Previous appearance and picture restored.'));
element('context-part').addEventListener('change',()=>{
  for(const field of document.querySelectorAll('.context-editors fieldset'))field.hidden=field.dataset.style!==element('context-part').value;
});
element('export-theme').addEventListener('click', async()=>{
  if(busy)return;busy=true;updatePreview();
  try {const done=await window.appearance.exportTheme(selection(),element('export-picture').checked);notify(done?'Theme exported. Share the file with your friends.':'Export canceled.');}
  catch(error){notify(error.message.replace(/^Error invoking remote method '[^']+': Error: /,''),true);}
  finally{busy=false;updatePreview();}
});
element('import-theme').addEventListener('click', async()=>{
  if(busy)return;busy=true;updatePreview();
  try {const state=await window.appearance.importTheme();if(state){showSettings(state);notify('Theme imported into preview. Apply changes to use it.');}else notify('Import canceled.');}
  catch(error){notify(error.message.replace(/^Error invoking remote method '[^']+': Error: /,''),true);}
  finally{busy=false;updatePreview();}
});
element('import-image').addEventListener('click', async () => {
  if (busy) return;
  busy = true; updatePreview();
  try {
    const image = await window.appearance.importImage();
    if (image) { backgroundImage = image.id; backgroundName = image.name; imagePreview = image.preview; notify('Picture imported. Apply to use it behind campaign chat.'); }
  } catch (error) { notify(error.message.replace(/^Error invoking remote method '[^']+': Error: /, ''), true); }
  finally { busy = false; updatePreview(); }
});
element('remove-image').addEventListener('click', () => {
  backgroundImage = null; backgroundName = ''; imagePreview = null; updatePreview();
  notify('Picture removed from preview. Apply to restore the campaign background.');
});
const dicePresets = { black:['#111111','#aaaaaa','#ffffff'], white:['#eeeeee','#555555','#111111'], purple:['#7c3aed','#d8bb82','#ffffff'] };
for (const button of document.querySelectorAll('[data-dice-preset]')) button.addEventListener('click', () => {
  element('dice-colors').checked = true;
  ['face','edge','number'].forEach((part,index) => { element(`dice-${part}-color`).value = dicePresets[button.dataset.dicePreset][index]; });
  updatePreview(); notify('Dice colors previewed. Apply to save.');
});

function borderImages(border) {
  const motifs={ornate:'<path d="M3 36V12Q3 3 12 3H36 M7 32V13Q7 7 13 7H32 M11 27V11H27 M34 3l6 6 M3 34l6 6"/>',arcane:'<path d="M3 33V3H33 M8 28V8H28 M15 3l6 6-6 6-6-6Z M3 15l6 6 6-6-6-6Z M30 3l7 7 M3 30l7 7"/>',runic:'<path d="M3 34V3H34 M8 29V8H29 M13 3v9l6 6v-9l-6-6 M3 13h9l6 6H9l-6-6 M25 3v7h7 M3 25h7v7"/>'};
  if(border.variant==='plain')return 'none';
  return ['', 'translate(42 0) scale(-1 1)', 'translate(0 42) scale(1 -1)', 'translate(42 42) scale(-1 -1)'].map(transform=>{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42"><g transform="${transform}" fill="none" stroke="${border.color}" stroke-width="${Math.max(.8,border.width/1.5)}" stroke-linecap="round" stroke-linejoin="round">${motifs[border.variant]}</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }).join(',');
}
const browser=element('picture-browser');
let browserSource='recent',nextPictures=null,browserBusy=false;
function setBrowserBusy(value){browserBusy=value;for(const button of browser.querySelectorAll('button'))button.disabled=value||button.dataset.unavailable==='true';}
function renderPictures(page,append=false){
  if(!append)element('picture-grid').replaceChildren();
  nextPictures=page.nextOffset;element('more-pictures').hidden=nextPictures===null;
  element('browser-status').textContent=browserSource==='folder'?(page.folderName?`${page.folderName} · ${page.total} pictures`:'Choose a folder to browse its pictures.'):`${page.total} imported pictures · newest first`;
  for(const item of page.items){
    const button=document.createElement('button');button.type='button';button.className='picture-choice';
    if(item.thumbnail){const img=document.createElement('img');img.src=item.thumbnail;img.alt='';button.append(img);}
    const label=document.createElement('span');label.textContent=item.name;button.append(label);
    if(!item.thumbnail){button.disabled=true;button.dataset.unavailable='true';button.title='Picture cannot be read or exceeds the import limits.';}
    button.addEventListener('click',async()=>{
      if(browserBusy)return;setBrowserBusy(true);
      try {const image=await (browserSource==='folder'?window.appearance.selectFolderPicture(item.id):window.appearance.selectPicture(item.id));backgroundImage=image.id;backgroundName=image.name;imagePreview=image.preview;browser.close();updatePreview();notify('Picture selected. Apply changes to use it.');}
      catch(error){element('browser-status').textContent=error.message.replace(/^Error invoking remote method '[^']+': Error: /,'');}
      finally{setBrowserBusy(false);}
    });
    element('picture-grid').append(button);
  }
}
async function loadPictures(source,offset=0){
  if(browserBusy)return;browserSource=source;setBrowserBusy(true);element('browser-status').textContent='Loading pictures…';
  try {renderPictures(await(source==='folder'?window.appearance.folderPictures(offset):window.appearance.pictures(offset)),offset>0);}
  catch(error){element('browser-status').textContent='Folder unavailable. Choose another folder, or browse imported pictures.';}
  finally{setBrowserBusy(false);}
}
element('browse-images').addEventListener('click',async()=>{
  if(busy)return;browser.showModal();setBrowserBusy(true);element('browser-status').textContent='Loading pictures…';
  try {const folder=await window.appearance.folderPictures();browserSource=folder.folderName?'folder':'recent';renderPictures(folder.folderName?folder:await window.appearance.pictures());}
  catch{
    browserSource='recent';
    try {renderPictures(await window.appearance.pictures());}
    catch(error){element('browser-status').textContent=error.message.replace(/^Error invoking remote method '[^']+': Error: /,'');}
  }
  finally{setBrowserBusy(false);}
});
element('close-browser').addEventListener('click',()=>browser.close());
element('recent-pictures').addEventListener('click',()=>void loadPictures('recent'));
element('folder-pictures').addEventListener('click',()=>void loadPictures('folder'));
element('more-pictures').addEventListener('click',()=>{if(nextPictures!==null)void loadPictures(browserSource,nextPictures);});
element('choose-folder').addEventListener('click',async()=>{
  if(browserBusy)return;setBrowserBusy(true);
  try {const page=await window.appearance.chooseFolder();if(page){browserSource='folder';renderPictures(page);}}
  catch(error){element('browser-status').textContent=error.message.replace(/^Error invoking remote method '[^']+': Error: /,'');}
  finally{setBrowserBusy(false);}
});

// In-app HSL picker avoids a slow native color popup on Wayland and coalesces
// drag events into the same preview frame. It edits the draft, never the website.
const picker = element('color-picker');
let pickerTarget = null;
let pickerOriginal = '';
function rgbToHsl(hex) {
  const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min, l = (max+min)/2;
  let h = d ? max===r ? ((g-b)/d)%6 : max===g ? (b-r)/d+2 : (r-g)/d+4 : 0;
  return [(h*60+360)%360, d ? d/(1-Math.abs(2*l-1))*100 : 0, l*100];
}
function hslToHex(h,s,l) {
  s/=100; l/=100;
  const a = s*Math.min(l,1-l);
  return '#'+[0,8,4].map(n => { const k=(n+h/30)%12; return Math.round((l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255).toString(16).padStart(2,'0'); }).join('');
}
function updatePicker(hex, sliders = false) {
  if (sliders) rgbToHsl(hex).forEach((n,i) => { element(['picker-h','picker-s','picker-l'][i]).value = n; });
  element('picker-hex').value = hex;
  element('picker-done').disabled = false;
  element('picker-swatch').style.backgroundColor = hex;
  const hue = element('picker-h').value;
  element('picker-s').style.backgroundImage = `linear-gradient(90deg,hsl(${hue} 0% 50%),hsl(${hue} 100% 50%))`;
  element('picker-l').style.backgroundImage = `linear-gradient(90deg,#000,hsl(${hue} ${element('picker-s').value}% 50%),#fff)`;
  for (const [id,unit] of [['h','°'],['s','%'],['l','%']]) element(`picker-${id}-label`).value = `${Math.round(element(`picker-${id}`).value)}${unit}`;
}
for (const input of document.querySelectorAll('input[type="color"]')) input.addEventListener('click', event => {
  event.preventDefault(); if (input.disabled || busy) return;
  pickerTarget = input; pickerOriginal = input.value;
  element('picker-title').textContent = window.settingsLocale.source(input,'aria-label') ?? (input.closest('label') ? window.settingsLocale.source(input.closest('label')).trim() : null) ?? 'Choose color';
  updatePicker(input.value, true); picker.showModal();
});
function paintDraft(hex) {
  if (!pickerTarget) return;
  pickerTarget.value = hex; pickerTarget.dispatchEvent(new Event('input',{bubbles:true}));
}
for (const id of ['picker-h','picker-s','picker-l']) element(id).addEventListener('input', () => {
  const hex = hslToHex(Number(element('picker-h').value),Number(element('picker-s').value),Number(element('picker-l').value));
  updatePicker(hex); paintDraft(hex);
});
element('picker-hex').addEventListener('input', () => {
  const hex = element('picker-hex').value;
  if (/^#[\da-f]{6}$/i.test(hex)) { updatePicker(hex,true); paintDraft(hex); }
  else element('picker-done').disabled = true;
});
function closePicker(cancel) {
  if (cancel) paintDraft(pickerOriginal);
  picker.close(); pickerTarget?.focus(); pickerTarget = null;
}
element('picker-done').addEventListener('click', () => closePicker(false));
element('picker-cancel').addEventListener('click', () => closePicker(true));
picker.addEventListener('cancel', event => { event.preventDefault(); closePicker(true); });
window.appearance.get().then(settings => { busy = false; showSettings(settings); notify('Choose your settings, then apply them.'); })
  .catch(error => { notify('Could not load preferences. Close this window and try again.', true); console.error(error); });

window.appearance.onInterface(state => { window.settingsLocale.set(state.locale); panelWidth = state.width; });
window.appearance.onSettings(showSettings);
element('close-panel').addEventListener('click', () => { void window.appearance.closePanel().catch(console.error); });
const resizer = element('panel-resizer');
let drag = null, resizeFrame = 0, desiredWidth = 420;
const resizePanel = async (width, finish = false) => {
  try { panelWidth = await window.appearance.resizePanel(width, finish); resizer.setAttribute('aria-valuenow', String(panelWidth)); }
  catch (error) { console.error(error); }
};
resizer.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault(); drag = { x: event.screenX, width: innerWidth }; desiredWidth = innerWidth;
  resizer.setPointerCapture(event.pointerId);
});
resizer.addEventListener('pointermove', event => {
  if (!drag) return;
  desiredWidth = Math.max(320, Math.min(900, drag.width + event.screenX - drag.x));
  if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; void resizePanel(desiredWidth); });
});
const finishResize = () => {
  if (!drag) return;
  drag = null; cancelAnimationFrame(resizeFrame); resizeFrame = 0; void resizePanel(desiredWidth, true);
};
resizer.addEventListener('pointerup', finishResize);
resizer.addEventListener('pointercancel', finishResize);
resizer.addEventListener('lostpointercapture', finishResize);
resizer.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  void resizePanel(event.key === 'Home' ? 320 : event.key === 'End' ? 900 : innerWidth + (event.key === 'ArrowLeft' ? -20 : 20), true);
});
