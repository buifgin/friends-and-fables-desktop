const assert = require('node:assert/strict');
const http = require('node:http');
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { AppearanceManager, registerAppearanceScheme } = require(path.join(appRoot, 'dist/appearance/appearance'));
const { TranslationManager, TRANSLATION_URL } = require(path.join(appRoot, 'dist/translation/translation'));
registerAppearanceScheme();
app.on('window-all-closed', () => {});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (contents, expression, limit = 5000) => {
  for (let elapsed = 0; elapsed < limit; elapsed += 25) {
    if (await contents.executeJavaScript(expression)) return;
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};
let parent, manager, server, profile, serviceChecks = 0;
let failure, finishing = false;
const timeout = setTimeout(() => { failure = new Error('Translation Settings sync fixture timed out.'); void finish(); }, 30000);
async function finish() {
  if (finishing) return;
  finishing = true;
  clearTimeout(timeout);
  if (parent && !parent.isDestroyed()) parent.destroy();
  await manager?.shutdown().catch(error => { failure ??= error; });
  if (server) await new Promise(resolve => server.close(resolve));
  if (failure) { console.error(failure.stack || failure); app.exit(1); }
  else app.exit(0);
}
(async () => {
  try {
    profile = process.env.FABLES_TEST_PROFILE_DIR;
    if (!profile) throw new Error('Run this native fixture with scripts/run-electron-test.cjs to provide an isolated profile.');
    app.setPath('userData', profile);
    await app.whenReady();
    server = http.createServer((request, response) => {
      if (request.url === '/languages' && request.method === 'GET') {
        serviceChecks++;
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify([{ code: 'en', targets: ['ru'] }]));
        return;
      }
      response.writeHead(404); response.end();
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const appearance = new AppearanceManager();
    await appearance.initialize();
    manager = new TranslationManager(profile, null);
    await manager.initialize();
    manager.setAppearance(appearance.getSettings());
    const port = server.address().port;
    const initial = { ...manager.getSettings(), port, enabled: false, showOriginal: false, translateDescriptions: false, preservedNames: ['Initial Name'] };
    await manager.save(initial);

    parent = new BrowserWindow({ show: false, width: 800, height: 800, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    const panel = manager.createPanel(parent, () => {});
    parent.contentView.addChildView(panel);
    panel.setBounds({ x: 0, y: 0, width: 800, height: 800 });
    await panel.webContents.loadURL(TRANSLATION_URL);
    const contents = panel.webContents;
    await until(contents, `document.getElementById('apply') && !document.getElementById('apply').disabled`);
    await until(contents, `document.getElementById('service-status').dataset.ready === 'true'`);
    assert.equal(await contents.executeJavaScript('document.documentElement.lang'), 'en');
    assert.equal(await contents.executeJavaScript("document.getElementById('preserved-names').value"), 'Initial Name');

    const cleanRefresh = { ...initial, enabled: true, showOriginal: false, translateDescriptions: false, preservedNames: ['Clean Saved Name'] };
    await manager.save(cleanRefresh);
    await until(contents, `document.documentElement.lang === 'ru' && document.getElementById('enabled').checked && document.getElementById('preserved-names').value === 'Clean Saved Name'`);

    await contents.executeJavaScript(`(() => {
      const names=document.getElementById('preserved-names');names.value='Draft Name\\nDraft Place';names.dispatchEvent(new Event('input',{bubbles:true}));
      const enabled=document.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new Event('change',{bubbles:true}));
      const original=document.getElementById('show-original');original.checked=false;original.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    const externalUpdate = { ...cleanRefresh, enabled: true, showOriginal: true, preservedNames: ['External Saved Name'] };
    await manager.save(externalUpdate);
    await until(contents, `document.documentElement.lang === 'en' && document.getElementById('cache-count').textContent === '0 cached translation fragments.'`);
    assert.equal(await contents.executeJavaScript("document.getElementById('enabled').checked"), false, 'External saved state must not overwrite a dirty enabled checkbox.');
    assert.equal(await contents.executeJavaScript("document.getElementById('show-original').checked"), false, 'External saved state must not overwrite a dirty Show Original checkbox.');
    assert.equal(await contents.executeJavaScript("document.getElementById('preserved-names').value"), 'Draft Name\nDraft Place', 'External saved names must not overwrite the draft.');

    const beforeManualCheck = serviceChecks;
    await contents.executeJavaScript("document.getElementById('check').click()");
    await until(contents, `document.getElementById('service-status').dataset.ready === 'true'`);
    assert(serviceChecks > beforeManualCheck, 'The Check button should call the saved local service even when the form has unsaved edits.');

    await contents.executeJavaScript("document.getElementById('apply').click()");
    await until(contents, `document.getElementById('status').textContent === 'Translation settings applied.' && !document.getElementById('enabled').checked`);
    await until(contents, `document.getElementById('service-status').dataset.ready === 'true'`);
    assert.equal(await contents.executeJavaScript("document.getElementById('preserved-names').value"), 'Draft Name\nDraft Place', 'Apply should save and render the draft.');
    const afterApply = { ...manager.getSettings(), enabled: true, showOriginal: false, translateDescriptions: false, preservedNames: ['After Apply Saved Name'] };
    await manager.save(afterApply);
    await until(contents, `document.documentElement.lang === 'ru' && document.getElementById('enabled').checked && document.getElementById('preserved-names').value === 'After Apply Saved Name'`);

    let bundledStarts = 0;
    manager.bundled = { stop: async () => {}, start: async () => { bundledStarts++; throw new Error('The test must not start the bundled service.'); } };
    await manager.save({ ...afterApply, enabled: false, showOriginal: false });
    await until(contents, `document.documentElement.lang === 'en' && !document.getElementById('enabled').checked`);
    await contents.executeJavaScript(`(() => {const enabled=document.getElementById('enabled');enabled.checked=true;enabled.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const beforeBundledCheck = serviceChecks;
    await contents.executeJavaScript("document.getElementById('check').click()");
    await until(contents, `document.getElementById('service-status').textContent === 'The included translator starts when translation is enabled.'`);
    assert.equal(bundledStarts, 0, 'Check must use the latest saved disabled state, not the dirty enabled draft, and must not start the bundled service.');
    assert.equal(serviceChecks, beforeBundledCheck, 'A disabled bundled translator must not be probed.');
  } catch (error) { failure = error; }
  await finish();
})().catch(async error => { failure = error; await finish(); });
