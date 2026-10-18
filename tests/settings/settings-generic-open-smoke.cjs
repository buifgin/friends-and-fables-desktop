// Exercise actual main routing with a fresh offline profile.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
if (!process.versions.electron) throw new Error('Run this native fixture through scripts/run-electron-test.cjs.');
const { app, BrowserWindow, session, webContents } = require('electron');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
let dock, profile, host, finished = false;
const timer = setTimeout(() => { console.error('FAIL: generic Settings routing deadline'); app.exit(1); }, 20000);
const { AppearanceManager } = require(path.join(root, 'dist/appearance/appearance'));
const attach = AppearanceManager.prototype.attachMain;
AppearanceManager.prototype.attachMain = function (...args) {
  dock = attach.apply(this, args);
  return dock;
};
async function until(predicate, label) {
  const end = Date.now() + 4000;
  while (!await predicate()) {
    if (Date.now() >= end) throw Error('Routing prerequisite: ' + label);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
void (async () => {
  profile = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-settings-main-'));
  app.setPath('userData', profile);
  app.on('window-all-closed', () => {});
  app.on('will-quit', () => {
    clearTimeout(timer);
    if (finished) console.log('PASS: actual main generic Settings opener retains the last successful section and editor draft');
  });
  void app.whenReady().then(async () => {
    await session.fromPartition('persist:friends-and-fables').protocol.handle('https', () => new Response(
      '<!doctype html><title>Offline Settings routing</title><input id="native-draft" value="Keep this native draft">',
      { headers: { 'Content-Type': 'text/html' } }));
    await until(() => dock && webContents.getAllWebContents().some(c => !c.isDestroyed() && c.getURL() === 'https://play.fables.gg/'), 'actual main website');
    const site = webContents.getAllWebContents().find(c => !c.isDestroyed() && c.getURL() === 'https://play.fables.gg/');
    await until(() => !site.isLoading(), 'offline document');
    host = BrowserWindow.getAllWindows().find(w => w.contentView.children.some(v => v.webContents === site));
    host.show(); host.focus(); site.focus();
    await dock.openSection('appearance');
    assert.equal(dock.hub.currentSection(), 'appearance');
    const editor = host.contentView.children.find(v => v.webContents.getURL() === 'fables-desktop://settings/');
    assert(editor, 'Real Appearance editor exists');
    await editor.webContents.executeJavaScript("document.querySelector('#theme-name').value='Keep this editor draft';true");
    const editorId = editor.webContents.id;
    dock.hide();
    await dock.flushSettings();
    console.log('Generic routing stage: request Home Settings after committed Appearance');
    await site.executeJavaScript("window.open('fables-desktop://settings/open-global','_blank');true");
    await until(() => dock.isOpen(), 'generic handler opened Settings');
    console.log('Generic routing result ' + JSON.stringify({ section: dock.hub.currentSection(), editorId, editorVisible: editor.getVisible() }));
    assert.equal(dock.hub.currentSection(), 'appearance', 'A generic Settings request must retain the last successful section');
    assert.equal(editor.getVisible(), true);
    assert.equal(editor.webContents.id, editorId);
    assert.equal(await editor.webContents.executeJavaScript("document.querySelector('#theme-name').value"), 'Keep this editor draft');
    assert.equal(await site.executeJavaScript("document.getElementById('native-draft').value"), 'Keep this native draft');
    await dock.flushSettings();
    finished = true;
    dock.hide();
    host.close();
    app.quit();
  }).catch(error => { console.error(error); clearTimeout(timer); host?.destroy(); app.exit(1); });
  require(path.join(root, 'dist/main'));
})().catch(error => { console.error(error); clearTimeout(timer); app.exit(1); });
