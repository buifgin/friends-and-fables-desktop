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
  profile = process.env.FABLES_TEST_PROFILE_DIR || await fs.mkdtemp(path.join(os.tmpdir(), 'ff-settings-main-'));
  app.setPath('userData', profile);
  app.on('window-all-closed', () => {});
  app.on('will-quit', () => {
    clearTimeout(timer);
    if (finished) console.log('PASS: actual main generic Settings opener retains the last successful section and editor draft');
  });
  void app.whenReady().then(async () => {
    await session.fromPartition('persist:friends-and-fables').protocol.handle('https', () => new Response(
      '<!doctype html><title>Offline Settings routing</title><section id="chat" class="flex-1 h-full w-full"><div id="events-list"></div><div class="tiptap" contenteditable="true">Fixture composer</div><input id="native-draft" value="Keep this native draft"></section>',
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
    dock.hide();
    await site.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play');
    await until(() => !site.isLoading(), 'offline campaign document');
    await site.executeJavaScript("window.open('fables-desktop://settings/open-campaign','_blank');true");
    await until(() => dock.isOpen(), 'generic campaign handler opened Settings');
    assert.equal(dock.hub.currentSection(), 'appearance', 'Campaign generic Settings also retains the last successful section');
    assert.equal(editor.getVisible(), true);
    assert.equal(editor.webContents.id, editorId);
    assert.equal(await editor.webContents.executeJavaScript("document.querySelector('#theme-name').value"), 'Keep this editor draft');
    assert.equal(await site.executeJavaScript("document.getElementById('native-draft').value"), 'Keep this native draft');
    await dock.flushSettings();
    dock.hide();
    await until(() => site.executeJavaScript("!window.__friendsFablesDesktopCampaignPanel"), 'previous owned reservation removed');
    const execute = site.executeJavaScript.bind(site);
    let releaseAck, reachedAck = false, held = false;
    const ack = new Promise(resolve => { releaseAck = resolve; });
    site.executeJavaScript = (source, ...args) => {
      const result = execute(source, ...args);
      if (!held && source.includes(')("reserve",')) {
        held = true;
        return result.then(async value => { reachedAck = true; await ack; return value; });
      }
      return result;
    };
    try {
      const opening = dock.openSection('general');
      await until(() => reachedAck, 'real main reserve response held after renderer installation');
      assert.equal(dock.isOpen(), false, 'An initial reserve cannot promote Settings before acknowledgement');
      assert.equal(await execute("!!document.querySelector('[data-ff-campaign-workspace]')"), true);
      await execute("history.pushState({}, '', '/home');true");
      await until(() => dock.hub.campaignAvailable === false, 'real main observes off-Campaign SPA route');
      releaseAck();
      await opening;
      await until(() => execute("!document.querySelector('[data-ff-campaign-workspace]') && !window.__friendsFablesDesktopCampaignPanel"), 'owned pending reservation cleaned on off-Campaign route');
      assert.equal(dock.isOpen(), false);
      assert.equal(dock.hub.isVisible(), false);
      assert.equal(dock.general.lastSettingsSection, 'appearance', 'Canceled pending section cannot replace the last successful selection');
      assert.equal(await execute("document.getElementById('native-draft').value"), 'Keep this native draft');
    } finally {
      releaseAck();
      site.executeJavaScript = execute;
    }
    await dock.flushSettings();
    finished = true;
    dock.hide();
    host.close();
    app.quit();
  }).catch(error => { console.error(error); clearTimeout(timer); host?.destroy(); app.exit(1); });
  require(path.join(root, 'dist/main'));
})().catch(error => { console.error(error); clearTimeout(timer); app.exit(1); });
