const form = document.getElementById('translation-form');
const element = id => document.getElementById(id);
let busy = false;
let dirty = false;
let syncing = false;
let savedSettings;
let initialPending = true;
let initialNotification;
let interfaceTheme;
let renderedTheme;
function markRendered() {
  const root = document.documentElement;
  if (initialPending || !renderedTheme || busy || element('translation-options').disabled || element('apply').disabled) { root.removeAttribute('data-ff-translation-rendered'); return; }
  root.setAttribute('data-ff-translation-rendered', JSON.stringify({ locale: root.lang, ...renderedTheme }));
}
function applyTheme(theme) {
  renderedTheme = { preset: theme.preset, customColor: theme.customColor };
  window.settingsTheme.apply(theme);markRendered();
}
element('close-translation').addEventListener('click', () => { void window.translation.close().catch(console.error); });
window.translation.onChange(settings => {
  if (initialPending) initialNotification = settings;
  syncSavedState(settings);
  if (!busy && !dirty) syncForm(settings);
});
window.translation.onTheme(theme => { interfaceTheme = theme; applyTheme(theme); });
function syncSavedState(settings) {
  savedSettings = settings;
  applyTheme(interfaceTheme ?? settings.theme);
  window.settingsLocale.set(settings.enabled && !settings.showOriginal ? 'ru' : 'en');
  element('port-row').hidden = settings.bundled;
  element('service-help').textContent = settings.bundled
    ? 'The translator and English → Russian model are included. They start automatically on this computer; no separate install or download is needed.'
    : 'The app connects only to 127.0.0.1 on this computer. Translation starts disabled. The model is a separate service; ordinary app use does not need it.';
  element('model-help').textContent = 'Interface labels and D&D terms use the built-in glossary immediately. Longer text uses the local model and cache. Turn descriptions off for glossary-only translation.';
  element('cache-count').textContent = `${settings.cacheEntries} cached translation fragments.`;
  markRendered();
}
function syncForm(settings) {
  syncing = true;
  try {
    element('enabled').checked = settings.enabled;
    element('show-original').checked = settings.showOriginal;
    element('descriptions').checked = settings.translateDescriptions;
    element('hide-untranslated').checked = settings.hideUntranslated;
    element('dynamic-layout').checked = settings.dynamicTranslationLayout;
    element('port').value = settings.port;
    element('preserved-names').value = settings.preservedNames.join('\n');
    element('translation-options').disabled = false;
    element('apply').disabled = false;
    element('show-original').disabled = !settings.enabled;
    dirty = false;
  } finally { syncing = false; markRendered(); }
}
function show(settings) {
  syncSavedState(settings);
  syncForm(settings);
}
function selection() {
  return { enabled: element('enabled').checked, showOriginal: element('enabled').checked && element('show-original').checked,
    translateDescriptions: element('descriptions').checked, hideUntranslated: element('hide-untranslated').checked, dynamicTranslationLayout: element('dynamic-layout').checked, port: Number(element('port').value),
    preservedNames: element('preserved-names').value.split(/\r?\n/).map(name => name.trim()).filter(Boolean) };
}
async function check() {
  element('check').disabled = true;
  element('service-status').textContent = 'Checking local service…';
  delete element('service-status').dataset.ready;
  try { const result = await window.translation.check(); element('service-status').textContent = result.message;
    element('service-status').dataset.ready = result.available; }
  catch { element('service-status').textContent = 'Unable to check the local service.'; }
  finally { element('check').disabled = false; }
}
for (const eventName of ['input', 'change']) form.addEventListener(eventName, () => { if (!syncing) dirty = true; });
element('enabled').addEventListener('change', () => {
  element('show-original').disabled = !element('enabled').checked;
  if (!element('enabled').checked) element('show-original').checked = false;
});
form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  busy = true; element('apply').disabled = true; markRendered();
  try { const settings = await window.translation.save(selection()); show(settings); element('status').textContent = 'Translation settings applied.';
    if (!settings.bundled || settings.enabled && settings.translateDescriptions && !settings.showOriginal) void check();
    else element('service-status').textContent = 'The included translator starts when translation is enabled.'; }
  catch (error) { element('status').textContent = error.message; }
  finally { busy = false; element('apply').disabled = false; markRendered(); }
});
element('check').addEventListener('click', () => {
  const settings = savedSettings;
  if (!settings) return;
  if (settings.enabled || !settings.bundled) void check();
  else element('service-status').textContent = 'The included translator starts when translation is enabled.';
});
element('clear-cache').addEventListener('click', async () => {
  element('clear-cache').disabled = true;
  try { const state = await window.translation.clearCache(); syncSavedState(state); element('cache-count').textContent = `${state.cacheEntries} cached translation fragments.`;
    element('status').textContent = 'Translation cache cleared.'; }
  catch (error) { element('status').textContent = error.message; }
  finally { element('clear-cache').disabled = false; }
});
void window.translation.get().then(settings => { settings = initialNotification ?? settings; initialPending = false; show(settings); element('status').textContent = 'Changes stay local to this app.'; if (!settings.bundled || settings.enabled && settings.translateDescriptions && !settings.showOriginal) void check(); else element('service-status').textContent = 'The included translator starts when translation is enabled.'; })
  .catch(error => { element('status').textContent = error.message; });
