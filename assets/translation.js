const form = document.getElementById('translation-form');
const element = id => document.getElementById(id);
let busy = false;
window.translation.onChange(settings => { if (!busy) show(settings); });
window.translation.onTheme(theme => window.settingsTheme.apply(theme));
function show(settings) {
  window.settingsTheme.apply(settings.theme);
  window.settingsLocale.set(settings.enabled && !settings.showOriginal ? 'ru' : 'en');
  element('enabled').checked = settings.enabled;
  element('show-original').checked = settings.showOriginal;
  element('descriptions').checked = settings.translateDescriptions;
  element('port').value = settings.port;
  element('preserved-names').value = settings.preservedNames.join('\n');
  element('cache-count').textContent = `${settings.cacheEntries} cached translation fragments.`;
  element('translation-options').disabled = false;
  element('apply').disabled = false;
  element('show-original').disabled = !settings.enabled;
}
function selection() {
  return { enabled: element('enabled').checked, showOriginal: element('enabled').checked && element('show-original').checked,
    translateDescriptions: element('descriptions').checked, port: Number(element('port').value),
    preservedNames: element('preserved-names').value.split(/\r?\n/).map(name => name.trim()).filter(Boolean) };
}
async function check() {
  element('check').disabled = true;
  element('service-status').textContent = 'Checking local service…';
  try { const result = await window.translation.check(); element('service-status').textContent = result.message;
    element('service-status').dataset.ready = result.available; }
  catch { element('service-status').textContent = 'Unable to check the local service.'; }
  finally { element('check').disabled = false; }
}
element('enabled').addEventListener('change', () => {
  element('show-original').disabled = !element('enabled').checked;
  if (!element('enabled').checked) element('show-original').checked = false;
});
form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  busy = true; element('apply').disabled = true;
  try { show(await window.translation.save(selection())); element('status').textContent = 'Translation settings applied.'; void check(); }
  catch (error) { element('status').textContent = error.message; }
  finally { busy = false; element('apply').disabled = false; }
});
element('check').addEventListener('click', () => { void check(); });
element('clear-cache').addEventListener('click', async () => {
  element('clear-cache').disabled = true;
  try { const state = await window.translation.clearCache(); element('cache-count').textContent = `${state.cacheEntries} cached translation fragments.`;
    element('status').textContent = 'Translation cache cleared.'; }
  catch (error) { element('status').textContent = error.message; }
  finally { element('clear-cache').disabled = false; }
});
void window.translation.get().then(settings => { show(settings); element('status').textContent = 'Changes stay local to this app.'; void check(); })
  .catch(error => { element('status').textContent = error.message; });
