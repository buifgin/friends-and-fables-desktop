const form = document.querySelector('#appearance-form');
const options = document.querySelector('#theme-options');
const colorInput = document.querySelector('#custom-color');
const hexInput = document.querySelector('#custom-hex');
const preview = document.querySelector('#preview');
const applyButton = document.querySelector('#apply');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');
let busy = true;
let saved = null;
let customColor = '#161616';

function selection() {
  return { preset: form.elements.preset.value, customColor };
}

function showSettings(settings) {
  form.elements.preset.value = settings.preset;
  customColor = settings.customColor;
  colorInput.value = settings.customColor;
  hexInput.value = settings.customColor;
  updatePreview();
}

function updatePreview() {
  const settings = selection();
  const custom = settings.preset === 'custom';
  options.disabled = busy;
  colorInput.disabled = busy || !custom;
  hexInput.disabled = busy || !custom;
  applyButton.disabled = busy;
  resetButton.disabled = busy;
  const colors = { website: '#010b0e', amoled: '#000000', black: '#101010', light: '#f5f5f5' };
  const color = colors[settings.preset] ?? settings.customColor;
  if (!/^#[\da-f]{6}$/i.test(color)) return;
  const channels = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const dark = 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05;
  preview.style.setProperty('--preview-bg', color);
  preview.style.setProperty('--preview-fg', dark ? '#ffffff' : '#000000');
}

function notify(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

async function save(settings) {
  busy = true;
  updatePreview();
  notify('Applying theme…');
  try {
    saved = await window.appearance.save(settings);
    showSettings(saved);
    notify('Theme applied. Your choice is saved for next time.');
  } catch (error) {
    if (saved) showSettings(saved);
    notify('Could not save the theme. Please try again.', true);
    console.error(error);
  } finally {
    busy = false;
    updatePreview();
  }
}

form.addEventListener('change', () => { updatePreview(); notify('Preview ready. Apply to change the app.'); });
colorInput.addEventListener('input', () => {
  customColor = colorInput.value;
  hexInput.value = customColor;
  updatePreview();
});
hexInput.addEventListener('input', () => {
  if (/^#[\da-f]{6}$/i.test(hexInput.value)) {
    customColor = hexInput.value.toLowerCase();
    colorInput.value = customColor;
  }
  updatePreview();
});
form.addEventListener('submit', (event) => { event.preventDefault(); if (!busy) void save(selection()); });
resetButton.addEventListener('click', () => { if (!busy) void save({ ...saved, preset: 'website' }); });

window.appearance.get().then((settings) => {
  saved = settings;
  busy = false;
  showSettings(settings);
  notify('Choose a theme, then apply it.');
}).catch((error) => {
  notify('Could not load preferences. Close this window and try again.', true);
  console.error(error);
});
