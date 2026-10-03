const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { app, BrowserWindow, Menu } = require('electron');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const { WindowMinimizer } = require(path.join(appRoot, 'dist/shell/window-minimizer'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, description) {
  const deadline = Date.now() + 1500;
  while (!await predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out: ${description}`);
    await pause(25);
  }
}
function compositorShowsWindow() {
  return JSON.parse(execFileSync('hyprctl', ['clients', '-j'], { encoding: 'utf8' }))
    .some(client => client.pid === process.pid && client.mapped && !client.hidden);
}
app.on('window-all-closed', () => {});
const timer = setTimeout(() => app.exit(1), 10000);
(async () => {
  if (process.env.FABLES_TEST_PROFILE_DIR) app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
  await app.whenReady();
  let locale = 'ru', menu;
  const build = Menu.buildFromTemplate;
  Menu.buildFromTemplate = function (...args) { menu = build.apply(this, args); return menu; };
  const window = new BrowserWindow({ show: false, width: 700, height: 400,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const minimizer = new WindowMinimizer(window, () => locale);
  await window.loadURL('data:text/html,<input id="draft" value="Unsaved draft"><script>window.paintFrames=0;function tick(){paintFrames++;requestAnimationFrame(tick)}tick()</script>');
  window.showInactive();
  const contents = window.webContents, read = source => contents.executeJavaScript(source);
  await until(async () => await read('paintFrames') > 2, 'initial painting');
  if (minimizer.trayMode) await until(compositorShowsWindow, 'initial compositor mapping');
  minimizer.minimize();
  if (minimizer.trayMode) {
    assert.equal(window.isVisible(), false);
    assert.equal(window.isMinimized(), false, 'Avoid Chromium’s phantom minimized state.');
    await until(() => !compositorShowsWindow(), 'compositor window really disappears');
    assert(minimizer.tray && !minimizer.tray.isDestroyed());
    assert.equal(menu.items[0].label, 'Показать приложение');
    const hiddenFrames = await read('paintFrames');
    minimizer.tray.emit('click');
    await until(compositorShowsWindow, 'tray-click compositor restore');
    await until(async () => await read('paintFrames') > hiddenFrames, 'restore resumes painting without refocusing');
    assert.equal(window.isVisible(), true);
    assert.equal(window.webContents, contents);
    assert.equal(await read('document.getElementById("draft").value'), 'Unsaved draft');
    locale = 'en';
    minimizer.sync();
    assert.equal(menu.items[0].label, 'Show app');
    minimizer.minimize();
    await until(() => !compositorShowsWindow(), 'second hide');
    menu.items[0].click();
    await until(compositorShowsWindow, 'tray-menu restore');
    assert.equal(window.isVisible(), true, 'Tray menu restores the same window.');
    const quit = app.quit;
    let calls = 0;
    app.quit = () => calls++;
    try { menu.items[2].click(); assert.equal(calls, 1); } finally { app.quit = quit; }
    const tray = minimizer.tray;
    window.destroy();
    assert.equal(tray.isDestroyed(), true, 'Window close destroys its tray icon.');
  } else {
    await until(() => window.isMinimized(), 'native minimize');
    minimizer.restore();
    await until(() => !window.isMinimized(), 'native restore');
    assert.equal(await read('document.getElementById("draft").value'), 'Unsaved draft');
    window.destroy();
  }
  Menu.buildFromTemplate = build;
  clearTimeout(timer);
  console.log('PASS: compositor hide/restore, same renderer/draft/painting, tray localization/actions and cleanup.');
  app.exit(0);
})().catch(error => {
  console.error(error);
  clearTimeout(timer);
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  app.exit(1);
});
