const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, session } = require('electron');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..');
const { AppearanceManager, registerAppearanceScheme } = require(path.join(appRoot, 'dist/appearance'));
const { configureZoomShortcuts } = require(path.join(appRoot, 'dist/zoom'));

registerAppearanceScheme();
app.on('window-all-closed', () => {});
let userData;
const timeout = setTimeout(() => { console.error('Appearance smoke test timed out.'); app.exit(1); }, 30000);

async function until(contents, expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await contents.executeJavaScript(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function colors(contents) {
  return contents.executeJavaScript(`({
    background: getComputedStyle(document.body).backgroundColor,
    foreground: getComputedStyle(document.body).color,
    panel: getComputedStyle(document.querySelector('.panel')).backgroundColor,
    artwork: getComputedStyle(document.querySelector('.artwork')).backgroundImage,
    message: document.querySelector('input').value,
    bridge: typeof window.appearance,
    node: typeof window.require
  })`);
}

async function save(settings, window) {
  return window.webContents.executeJavaScript(`window.appearance.save(${JSON.stringify(settings)})`);
}

(async () => {
  userData = await mkdtemp(path.join(os.tmpdir(), 'fables-appearance-test-'));
  app.setPath('userData', userData);
  await app.whenReady();
  const manager = new AppearanceManager();
  await manager.initialize();

  const testSession = session.fromPartition('appearance-smoke');
  testSession.protocol.handle('https', () => new Response(`<!doctype html>
    <html><head><meta charset="utf-8"><style>
      :root { --background: 195 86% 3%; --foreground: 39 29% 93%; --card: 198 50% 5%; }
      body { background: hsl(var(--background)); color: hsl(var(--foreground)); }
      .panel { background: hsl(var(--card)); }
      .artwork { background-image: linear-gradient(45deg, #42315b, #172737); }
    </style></head><body><div class="panel">Panel</div><div class="artwork">Campaign artwork</div>
    <input value="Русский текст and English"></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));
  const website = new BrowserWindow({ show: false, webPreferences: {
    session: testSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
  } });
  manager.attach(website.webContents);
  configureZoomShortcuts(website.webContents);
  await website.loadURL('https://play.fables.gg/test');
  const original = await colors(website.webContents);
  assert.equal(original.bridge, 'undefined');
  assert.equal(original.node, 'undefined');

  const settingsWindow = await manager.open(website);
  settingsWindow.hide();
  await until(settingsWindow.webContents, "!document.querySelector('#apply').disabled");
  const settingsContents = settingsWindow.webContents;
  await save({ preset: 'amoled', customColor: '#161616' }, settingsWindow);
  const amoled = await colors(website.webContents);
  assert.equal(amoled.background, 'rgb(0, 0, 0)');
  assert.equal(amoled.panel, 'rgb(0, 0, 0)');
  assert.equal(amoled.artwork, original.artwork);
  assert.equal(amoled.message, original.message);
  assert.equal(amoled.bridge, 'undefined');

  const reloaded = new Promise((resolve) => website.webContents.once('did-finish-load', resolve));
  website.webContents.reload();
  await reloaded;
  await until(website.webContents, "getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)'");
  await save({ preset: 'black', customColor: '#161616' }, settingsWindow);
  assert.equal((await colors(website.webContents)).background, 'rgb(16, 16, 16)');
  await save({ preset: 'light', customColor: '#161616' }, settingsWindow);
  const light = await colors(website.webContents);
  assert.equal(light.background, 'rgb(245, 245, 245)');
  assert.equal(light.foreground, 'rgb(0, 0, 0)');
  assert.equal(light.artwork, original.artwork);
  await save({ preset: 'custom', customColor: '#123456' }, settingsWindow);
  assert.equal((await colors(website.webContents)).background, 'rgb(18, 52, 86)');
  await save({ preset: 'custom', customColor: '#747474' }, settingsWindow);
  const customContrast = await website.webContents.executeJavaScript(`(() => {
    const luminance = color => {
      const channels = color.match(/\\d+/g).slice(0, 3).map(Number).map(x => x / 255)
        .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const style = getComputedStyle(document.querySelector('.panel'));
    return (luminance(style.color) + .05) / (luminance(style.backgroundColor) + .05);
  })()`);
  assert(customContrast >= 4.5, 'Midtone custom backgrounds need readable panel text.');

  await assert.rejects(save({ preset: 'custom', customColor: '#000000; color:red' }, settingsWindow), /#RRGGBB/);
  await save({ preset: 'website', customColor: '#123456' }, settingsWindow);
  await until(website.webContents, `getComputedStyle(document.body).backgroundColor === ${JSON.stringify(original.background)}`);
  assert.deepEqual(await colors(website.webContents), original);

  // Even a window with the same preload cannot use the settings bridge.
  const outsider = new BrowserWindow({ show: false, webPreferences: {
    session: testSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
    preload: path.join(appRoot, 'dist/appearance-preload.js'),
  } });
  manager.attach(outsider.webContents);
  await outsider.loadURL('https://example.invalid/test');
  await assert.rejects(outsider.webContents.executeJavaScript('window.appearance.get()'), /only in the app settings window/);
  await save({ preset: 'amoled', customColor: '#123456' }, settingsWindow);
  assert.equal((await colors(outsider.webContents)).background, original.background);

  // Exercise the renderer controls and real preload, including the reset action.
  await settingsContents.executeJavaScript(`
    document.querySelector('input[value="light"]').click();
    document.querySelector('#appearance-form').requestSubmit();
  `);
  await until(settingsContents, "document.querySelector('#status').textContent.startsWith('Theme applied.')");
  assert.equal((await colors(website.webContents)).background, 'rgb(245, 245, 245)');
  await settingsContents.executeJavaScript("document.querySelector('#reset').click()");
  await until(settingsContents, "!document.querySelector('#apply').disabled");
  assert.deepEqual(await colors(website.webContents), original);
  if (process.env.FABLES_TEST_SCREENSHOT) {
    settingsWindow.show();
    await settingsContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await writeFile(process.env.FABLES_TEST_SCREENSHOT, (await settingsContents.capturePage()).toPNG());
    settingsWindow.hide();
  }

  // Simulate a fresh application manager reading preferences from disk.
  await save({ preset: 'custom', customColor: '#123456' }, settingsWindow);
  assert.deepEqual(JSON.parse(await readFile(path.join(userData, 'appearance.json'), 'utf8')),
    { preset: 'custom', customColor: '#123456' });
  settingsWindow.destroy();
  ipcMain.removeHandler('appearance:get');
  ipcMain.removeHandler('appearance:save');
  session.fromPartition('fables-appearance').protocol.unhandle('fables-desktop');
  const restarted = new AppearanceManager();
  await restarted.initialize();
  const reopened = await restarted.open(website);
  reopened.hide();
  assert.deepEqual(await reopened.webContents.executeJavaScript('window.appearance.get()'),
    { preset: 'custom', customColor: '#123456' });
  const restoredWebsite = new BrowserWindow({ show: false, webPreferences: {
    session: testSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
  } });
  restarted.attach(restoredWebsite.webContents);
  await restoredWebsite.loadURL('https://play.fables.gg/test');
  await until(restoredWebsite.webContents, "getComputedStyle(document.body).backgroundColor === 'rgb(18, 52, 86)'");

  // Dispatch Electron input objects directly so the test needs no OS key injection.
  website.webContents.setZoomLevel(0);
  for (const input of [
    { code: 'Equal', key: '=', shift: false, expected: 0.5 },
    { code: 'Equal', key: '+', shift: true, expected: 1 },
    { code: 'NumpadAdd', key: '+', shift: false, expected: 1.5 },
    { code: 'Minus', key: '-', shift: false, expected: 1 },
    { code: 'Digit0', key: '0', shift: false, expected: 0 },
  ]) {
    let prevented = false;
    website.webContents.emit('before-input-event', { preventDefault() { prevented = true; } },
      { type: 'keyDown', control: true, meta: false, alt: false, isComposing: false, ...input });
    assert(prevented);
    assert.equal(website.webContents.getZoomLevel(), input.expected);
  }
  console.log('PASS: theme presets, custom colors, reset, reload, artwork preservation, saved preferences, IPC access checks, and zoom shortcut handling.');
})().then(async () => {
  clearTimeout(timeout);
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  await rm(userData, { recursive: true, force: true });
  app.exit(0);
}).catch(async (error) => {
  console.error(error);
  clearTimeout(timeout);
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  if (userData) await rm(userData, { recursive: true, force: true });
  app.exit(1);
});
