const form = document.querySelector('#appearance-form');
const fieldset = document.querySelector('#theme-options');
const colorInput = document.querySelector('#custom-color');
const hexInput = document.querySelector('#custom-hex');
const preview = document.querySelector('#preview');
const status = document.querySelector('#status');
const element = id => document.getElementById(id);
const roles = ['player', 'gm', 'context', 'event', 'roll'];
let busy = true;
let customColor = '#161616';
let backgroundImage = null;
let backgroundName = '';
let imagePreview = null;
let previousImage;
let previewFrame = 0;
let activePanel = 'theme-panel';
const previousStyles = new Map();

for (const field of document.querySelectorAll('[data-style]')) {
  const role = field.dataset.style;
  const editor = element('style-editor').content.cloneNode(true);
  for (const control of editor.querySelectorAll('[data-control]')) control.id = `${role}-${control.dataset.control}`;
  for (const label of editor.querySelectorAll('[data-label]')) label.htmlFor = `${role}-${label.dataset.label}`;
  field.append(editor);
}
function readStyle(role) {
  return { color: element(`${role}-color`).value, opacity: Number(element(`${role}-opacity`).value) / 100,
    textColor: element(`${role}-auto-text`).checked ? null : element(`${role}-text-color`).value,
    gradient: { enabled: element(`${role}-gradient`).checked, color: element(`${role}-gradient-color`).value,
      angle: Number(element(`${role}-gradient-angle`).value) },
    border: { enabled: element(`${role}-border`).checked, color: element(`${role}-border-color`).value,
      width: Number(element(`${role}-border-width`).value), radius: Number(element(`${role}-border-radius`).value) } };
}
function selection() {
  return {
    preset: form.elements.preset.value, customColor,
    backgroundImage, backgroundName, backgroundFit: element('image-fit').value,
    backgroundEffects: { blur: Number(element('image-blur').value), opacity: Number(element('image-opacity').value) / 100,
      overlayColor: element('image-overlay-color').value, overlayOpacity: Number(element('image-overlay-opacity').value) / 100 },
    messages: { enabled: element('message-styles').checked, player: readStyle('player'), gm: readStyle('gm') },
    context: { enabled: element('context-styles').checked, style: readStyle('context') },
    events: { enabled: element('event-styles').checked, style: readStyle('event') },
    dice: { enabled: element('roll-styles').checked, style: readStyle('roll'), colorsEnabled: element('dice-colors').checked,
      faceColor: element('dice-face-color').value, edgeColor: element('dice-edge-color').value, numberColor: element('dice-number-color').value },
    linuxBlackMenu: element('black-menu').checked,
  };
}
function showSettings(settings) {
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
  for (const part of ['face','edge','number']) element(`dice-${part}-color`).value = settings.dice[`${part}Color`];
  for (const role of roles) {
    const style = role === 'player' || role === 'gm' ? settings.messages[role]
      : role === 'context' ? settings.context.style : role === 'event' ? settings.events.style : settings.dice.style;
    element(`${role}-color`).value = style.color;
    element(`${role}-opacity`).value = Math.round(style.opacity * 100);
    element(`${role}-auto-text`).checked = !style.textColor;
    element(`${role}-text-color`).value = style.textColor ?? '#ffffff';
    element(`${role}-gradient`).checked = style.gradient.enabled;
    element(`${role}-gradient-color`).value = style.gradient.color;
    element(`${role}-gradient-angle`).value = style.gradient.angle;
    element(`${role}-border`).checked = style.border.enabled;
    for (const part of ['color','width','radius']) element(`${role}-border-${part}`).value = style.border[part];
  }
  element('black-menu').checked = settings.linuxBlackMenu;
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
function foreground(color, opacity = 1, background = '#010b0e', second = null) {
  const values = [color, ...(second ? [second] : [])].map(c => luminance(c, opacity, background));
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
  fieldset.disabled = busy;
  for (const id of ['apply','reset','import-image','message-styles','context-styles','event-styles','roll-styles','dice-colors','black-menu']) element(id).disabled = busy;
  colorInput.disabled = hexInput.disabled = busy || settings.preset !== 'custom';
  element('remove-image').disabled = element('image-fit').disabled = busy || !backgroundImage;
  for (const id of ['image-blur','image-opacity','image-overlay-color','image-overlay-opacity']) element(id).disabled = busy || !backgroundImage;
  element('image-blur-label').value = `${settings.backgroundEffects.blur} px`;
  element('image-opacity-label').value = `${Math.round(settings.backgroundEffects.opacity * 100)}%`;
  element('image-overlay-opacity-label').value = `${Math.round(settings.backgroundEffects.overlayOpacity * 100)}%`;
  const colors = { website: '#010b0e', amoled: '#000000', black: '#101010', light: '#f5f5f5' };
  const color = colors[settings.preset] ?? customColor;
  for (const role of roles) {
    const enabled = role === 'context' ? settings.context.enabled : role === 'event' ? settings.events.enabled
      : role === 'roll' ? settings.dice.enabled : settings.messages.enabled;
    const style = readStyle(role);
    for (const control of document.querySelectorAll(`[data-style="${role}"] input`)) {
      const part = control.dataset.control;
      control.disabled = busy || !enabled || (part === 'text-color' && !style.textColor)
        || (part.startsWith('gradient-') && !style.gradient.enabled)
        || (['border-color','border-width'].includes(part) && !style.border.enabled);
    }
    for (const [part, unit, value] of [['opacity','%',style.opacity*100], ['gradient-angle','°',style.gradient.angle],
      ['border-width',' px',style.border.width], ['border-radius',' px',style.border.radius]]) element(`${role}-${part}-label`).value = `${Math.round(value)}${unit}`;
    const first = rgba(style.color, style.opacity);
    const bg = style.gradient.enabled ? `linear-gradient(${style.gradient.angle}deg,${first},${rgba(style.gradient.color,style.opacity)})` : first;
    setPreview(`--${role}-bg`, enabled ? bg : role === 'context' ? '#1f2937' : '#1f2937cc');
    setPreview(`--${role}-fg`, enabled ? style.textColor ?? foreground(style.color, style.opacity, color, style.gradient.enabled ? style.gradient.color : null) : '#fff');
    setPreview(`--${role}-border`, enabled && style.border.enabled ? `${style.border.width}px solid ${style.border.color}` : '0 solid transparent');
    setPreview(`--${role}-radius`, enabled ? `${style.border.radius}px` : '8px');
    if (role === 'context') {
      setPreview('--context-card-bg', enabled ? style.gradient.enabled
        ? `linear-gradient(${style.gradient.angle}deg,${style.color},${style.gradient.color})` : style.color : '#1f2937');
      setPreview('--context-card-fg', enabled ? style.textColor ?? foreground(style.color,1,color,style.gradient.enabled ? style.gradient.color : null) : '#fff');
    }
  }
  for (const part of ['face','edge','number']) {
    element(`dice-${part}-color`).disabled = busy || !settings.dice.colorsEnabled;
    setPreview(`--dice-${part}`, settings.dice.colorsEnabled ? settings.dice[`${part}Color`] : {face:'#203da6',edge:'#d8bb82',number:'#f8c134'}[part]);
  }
  for (const button of document.querySelectorAll('[data-dice-preset]')) button.disabled = busy;
  setPreview('--preview-bg', color); setPreview('--preview-fg', foreground(color));
  // Never rebuild or parse a multi-megabyte data URL during color dragging.
  if (previousImage !== imagePreview) { setPreview('--preview-image', imagePreview ? `url("${imagePreview}")` : 'none'); previousImage = imagePreview; }
  setPreview('--preview-fit', settings.backgroundFit);
  setPreview('--preview-blur', `${settings.backgroundEffects.blur}px`);
  setPreview('--preview-image-opacity', String(settings.backgroundEffects.opacity));
  setPreview('--preview-overlay', imagePreview ? rgba(settings.backgroundEffects.overlayColor,settings.backgroundEffects.overlayOpacity) : 'transparent');
  element('image-name').textContent = backgroundName || "Using the campaign's existing background.";
  for (const [selector, show] of [ ['.sample-message', !['context-panel','events-panel','dice-panel'].includes(activePanel)],
    ['.sample-context',activePanel==='context-panel'], ['.sample-event',activePanel==='events-panel'],
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
element('reset').addEventListener('click', () => {
  if (busy) return;
  const s = selection();
  void save({ ...s, preset:'website', backgroundImage:null, backgroundName:'', messages:{...s.messages,enabled:false},
    context:{...s.context,enabled:false},events:{...s.events,enabled:false},dice:{...s.dice,enabled:false,colorsEnabled:false} });
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
  element('picker-title').textContent = input.getAttribute('aria-label') ?? input.closest('label')?.textContent.trim() ?? 'Choose color';
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
