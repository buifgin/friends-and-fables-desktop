const form = document.querySelector('#appearance-form');
const fieldset = document.querySelector('#theme-options');
const colorInput = document.querySelector('#custom-color');
const hexInput = document.querySelector('#custom-hex');
const preview = document.querySelector('#preview');
const status = document.querySelector('#status');
const element = (id) => document.getElementById(id);
let busy = true;
let saved = null;
let customColor = '#161616';
let backgroundImage = null;
let backgroundName = '';
let imagePreview = null;

function selection() {
  return {
    preset: form.elements.preset.value, customColor,
    backgroundImage, backgroundName, backgroundFit: element('image-fit').value,
    messages: { enabled: element('message-styles').checked,
      player: { color: element('player-color').value, opacity: Number(element('player-opacity').value) / 100 },
      gm: { color: element('gm-color').value, opacity: Number(element('gm-opacity').value) / 100 } },
    linuxBlackMenu: element('black-menu').checked,
  };
}
function showSettings(settings) {
  form.elements.preset.value = settings.preset;
  customColor = settings.customColor;
  colorInput.value = customColor;
  hexInput.value = customColor;
  backgroundImage = settings.backgroundImage;
  backgroundName = settings.backgroundName;
  imagePreview = settings.imagePreview;
  element('image-fit').value = settings.backgroundFit;
  element('message-styles').checked = settings.messages.enabled;
  for (const role of ['player', 'gm']) {
    element(`${role}-color`).value = settings.messages[role].color;
    element(`${role}-opacity`).value = Math.round(settings.messages[role].opacity * 100);
  }
  element('black-menu').checked = settings.linuxBlackMenu;
  element('linux-menu-setting').hidden = settings.platform !== 'linux';
  element('app-platform-note').hidden = settings.platform === 'linux';
  updatePreview();
}
function foreground(color) {
  const channels = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const lightness = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  return 1.05 / (lightness + .05) >= (lightness + .05) / .05 ? '#fff' : '#000';
}
function updatePreview() {
  const settings = selection();
  fieldset.disabled = busy;
  for (const id of ['apply', 'reset', 'import-image', 'message-styles', 'black-menu']) element(id).disabled = busy;
  colorInput.disabled = hexInput.disabled = busy || settings.preset !== 'custom';
  element('remove-image').disabled = element('image-fit').disabled = busy || !backgroundImage;
  for (const role of ['player', 'gm']) {
    element(`${role}-color`).disabled = element(`${role}-opacity`).disabled = busy || !settings.messages.enabled;
    element(`${role}-opacity-label`).value = `${Math.round(settings.messages[role].opacity * 100)}%`;
    const style = settings.messages[role];
    const rgb = [1, 3, 5].map(offset => parseInt(style.color.slice(offset, offset + 2), 16));
    preview.style.setProperty(`--${role}-bg`, settings.messages.enabled ? `rgba(${rgb.join(',')},${style.opacity})` : '#1f2937cc');
    preview.style.setProperty(`--${role}-fg`, settings.messages.enabled ? foreground(style.color) : '#fff');
  }
  const colors = { website: '#010b0e', amoled: '#000000', black: '#101010', light: '#f5f5f5' };
  const color = colors[settings.preset] ?? customColor;
  preview.style.setProperty('--preview-bg', color);
  preview.style.setProperty('--preview-fg', foreground(color));
  preview.style.setProperty('--preview-image', imagePreview ? `url("${imagePreview}")` : 'none');
  preview.style.setProperty('--preview-fit', settings.backgroundFit);
  element('image-name').textContent = backgroundName || "Using the campaign's existing background.";
}
function notify(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}
async function save(settings) {
  busy = true;
  updatePreview();
  notify('Applying appearance…');
  try {
    saved = await window.appearance.save(settings);
    showSettings(saved);
    notify('Appearance applied and saved for next time.');
  } catch (error) {
    notify(`Could not apply changes: ${error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')}`, true);
  } finally {
    busy = false;
    updatePreview();
  }
}
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    for (const other of document.querySelectorAll('.tab')) {
      const selected = other === tab;
      other.classList.toggle('active', selected);
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      element(other.dataset.panel).hidden = !selected;
    }
  });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const next = tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.click(); next.focus();
  });
}
form.addEventListener('change', () => { updatePreview(); notify('Preview ready. Apply to change the app.'); });
form.addEventListener('input', updatePreview);
colorInput.addEventListener('input', () => { customColor = colorInput.value; hexInput.value = customColor; updatePreview(); });
hexInput.addEventListener('input', () => {
  if (/^#[\da-f]{6}$/i.test(hexInput.value)) { customColor = hexInput.value.toLowerCase(); colorInput.value = customColor; }
  updatePreview();
});
form.addEventListener('submit', event => { event.preventDefault(); if (!busy) void save(selection()); });
element('reset').addEventListener('click', () => {
  if (!busy) void save({ ...selection(), preset: 'website', backgroundImage: null, backgroundName: '',
    messages: { ...selection().messages, enabled: false } });
});
element('import-image').addEventListener('click', async () => {
  if (busy) return;
  busy = true; updatePreview();
  try {
    const image = await window.appearance.importImage();
    if (image) {
      backgroundImage = image.id; backgroundName = image.name; imagePreview = image.preview;
      notify('Picture imported. Apply to use it behind campaign chat.');
    }
  } catch (error) { notify(error.message.replace(/^Error invoking remote method '[^']+': Error: /, ''), true); }
  finally { busy = false; updatePreview(); }
});
element('remove-image').addEventListener('click', () => {
  backgroundImage = null; backgroundName = ''; imagePreview = null;
  updatePreview(); notify('Picture removed from preview. Apply to restore the campaign background.');
});
window.appearance.get().then(settings => { saved = settings; busy = false; showSettings(settings); notify('Choose your settings, then apply them.'); })
  .catch(error => { notify('Could not load preferences. Close this window and try again.', true); console.error(error); });
