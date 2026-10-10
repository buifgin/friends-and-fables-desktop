const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { app, BrowserWindow, session, webContents } = require('electron');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
if (process.env.FABLES_TEST_PROFILE_DIR) app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
const { TranslationManager } = require(path.join(appRoot, 'dist/translation/translation'));
let translation, releaseFlush, pendingSave, rendererCalls = 0, flushStarted = false, flushFinished = false, quitEvents = 0;
const flushGate = new Promise(resolve => { releaseFlush = resolve; });
const initialize = TranslationManager.prototype.initialize;
TranslationManager.prototype.initialize = async function (...args) {
  await initialize.apply(this, args);
  translation = this;
  this.cache.set('Shutdown persistence probe.', 'Проверка сохранения при выходе.');
  const flush = this.cache.flush.bind(this.cache);
  this.cache.flush = async () => {
    flushStarted = true;
    await flushGate;
    await flush();
    flushFinished = true;
  };
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, description) {
  const deadline = Date.now() + 3000;
  while (!await predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out: ${description}`);
    await pause(10);
  }
}
const timer = setTimeout(() => {
  console.error('FAIL: window close did not finish normal app shutdown.');
  app.exit(1);
}, 10000);
app.on('before-quit', () => { quitEvents++; });
app.on('will-quit', () => {
  try {
    assert(flushFinished, 'Normal quit must drain the cache write before exiting.');
    const preferences = JSON.parse(readFileSync(path.join(app.getPath('userData'), 'translation.json'), 'utf8'));
    assert.equal(preferences.enabled, true);
    assert.equal(preferences.showOriginal, true);
    const saved = JSON.parse(readFileSync(path.join(app.getPath('userData'), 'translation-cache.json'), 'utf8'));
    assert(saved.entries.some(entry => entry[1] === 'Проверка сохранения при выходе.'));
    assert(quitEvents >= 2, 'The prevented quit must resume after shutdown.');
    assert.equal(BrowserWindow.getAllWindows().length, 0);
    assert.equal(webContents.getAllWebContents().filter(contents => !contents.isDestroyed()).length, 0);
    clearTimeout(timer);
    console.log('PASS: normal main-window close drains persistence and completes app quit.');
  } catch (error) { console.error(error); app.exit(1); }
});
void app.whenReady().then(async () => {
  await session.fromPartition('persist:friends-and-fables').protocol.handle('https', () => new Response(
    '<!doctype html><title>Shutdown fixture</title><input id="draft" value="Preserved draft">',
    { headers: { 'Content-Type': 'text/html' } }));
  await until(() => translation && webContents.getAllWebContents().some(contents =>
    !contents.isDestroyed() && contents.getURL() === 'https://play.fables.gg/'), 'main website');
  const contents = webContents.getAllWebContents().find(contents => contents.getURL() === 'https://play.fables.gg/');
  await until(() => !contents.isLoading(), 'offline website loaded');
  assert.equal(await contents.executeJavaScript('document.getElementById("draft").value'), 'Preserved draft');
  // Model Chromium discarding a renderer invocation without settling its promise.
  // Queue a real preferences save behind it, just as the native failing trace did.
  contents.executeJavaScript = () => { rendererCalls++; return new Promise(() => {}); };
  pendingSave = translation.save({ ...translation.getSettings(), enabled: true, showOriginal: true });
  await until(() => rendererCalls > 0, 'renderer configuration is pending');
  const main = BrowserWindow.getAllWindows()[0];
  assert(main, 'The real entry point must create its main window.');
  main.close();
  await until(() => flushStarted, 'shutdown reaches cache persistence');
  assert.equal(flushFinished, false);
  assert.equal(quitEvents, 1, 'App must remain in the prevented quit while persistence is pending.');
  await pendingSave;
  releaseFlush();

}).catch(error => { console.error(error); clearTimeout(timer); app.exit(1); });
require(path.join(appRoot, 'dist/main'));
