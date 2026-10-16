// Native fixture for the shared toolbar stylesheet. Safe to syntax-check or
// import from ordinary Node; Electron setup starts only in Electron itself.
if (process.versions.electron) runNative();

async function runNative() {
  const assert = require('node:assert/strict');
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const { app, BrowserWindow, WebContentsView, protocol } = require('electron');
  const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
  const { WindowControls } = require(path.join(appRoot, 'dist/shell/window-controls'));
  const { DEFAULT_APPEARANCE } = require(path.join(appRoot, 'dist/appearance/themes'));
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(predicate, label) {
    const deadline = Date.now() + 2500;
    while (!await predicate()) {
      if (Date.now() >= deadline) throw new Error(`Timed out: ${label}`);
      await pause(20);
    }
  }
  const timer = setTimeout(() => app.exit(1), 15000);
  let host, retired;
  try {
    if (process.env.FABLES_TEST_PROFILE_DIR) app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
    protocol.registerSchemesAsPrivileged([{ scheme: 'fables-desktop', privileges: { standard: true, secure: true, stream: true } }]);
    await app.whenReady();
    const session = require('electron').session.fromPartition('fables-appearance');
    session.protocol.handle('fables-desktop', async request => {
      const url = new URL(request.url);
      const assets = {
        '/window-controls.html': ['shell/window-controls.html', 'text/html; charset=utf-8'],
        '/appearance-button.html': ['shell/appearance-button.html', 'text/html; charset=utf-8'],
        '/appearance-button.css': ['shell/appearance-button.css', 'text/css; charset=utf-8'],
        '/window-controls.js': ['shell/window-controls.js', 'text/javascript; charset=utf-8'],
        '/settings-theme.js': ['shared/settings-theme.js', 'text/javascript; charset=utf-8'],
        '/appearance-button.js': ['shell/appearance-button.js', 'text/javascript; charset=utf-8'],
      };
      const entry = url.host === 'settings' ? assets[url.pathname] : undefined;
      if (request.method !== 'GET' || !entry) return new Response('Not found', { status: 404 });
      return new Response(await fs.readFile(path.join(appRoot, 'assets', entry[0]), 'utf8'), {
        headers: { 'Content-Type': entry[1], 'X-Content-Type-Options': 'nosniff' },
      });
    });
    host = new BrowserWindow({ show: false, width: 640, height: 420,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await host.loadURL('data:text/html,<title>Window controls fixture</title>');
    let locale = 'en';
    const manager = { getSettings: () => structuredClone(DEFAULT_APPEARANCE), getLocale: () => locale };
    const controls = new WindowControls(host, manager);
    controls.layout(640, 4);
    host.show(); host.focus();
    const contents = controls.view.webContents;
    await until(() => !contents.isLoading() && contents.getURL().endsWith('/window-controls.html'), 'trusted toolbar page');
    await until(async () => await contents.executeJavaScript("document.documentElement.lang === 'en' && document.getElementById('minimize').getAttribute('aria-label') === 'Minimize'"), 'initial trusted renderer state');
    const geometry = await contents.executeJavaScript(`(() => {
      const nav = document.querySelector('nav');
      return { nav: nav.getBoundingClientRect().toJSON(), buttons: [...nav.querySelectorAll('button')].map(button => {
        const r = button.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        return { id: button.id, x, y, width: r.width, height: r.height,
          pointerEvents: getComputedStyle(button).pointerEvents,
          appRegion: getComputedStyle(button).webkitAppRegion,
          hit: document.elementFromPoint(x, y)?.closest('button')?.id || null };
      }), lang: document.documentElement.lang };
    })()`);
    assert.deepEqual(geometry.buttons.map(item => item.id), ['minimize', 'fullscreen', 'quit']);
    for (const item of geometry.buttons) {
      assert.equal(item.width, 28, `${item.id} has the production 28px target.`);
      assert.equal(item.height, 28, `${item.id} has the production 28px target.`);
      assert.equal(item.pointerEvents, 'auto', `${item.id} accepts pointer input.`);
      assert.equal(item.appRegion, 'no-drag', `${item.id} remains a no-drag control.`);
      assert.equal(item.hit, item.id, `${item.id} is the elementFromPoint target.`);
    }
    assert.equal(geometry.nav.height, 28, 'Active toolbar retains its 28px navigation row.');

    // Verify the retired launcher independently: it is still explicitly inert
    // in CSS and hidden/zero-sized by its owner.
    retired = new WebContentsView({ webPreferences: { partition: 'fables-appearance', sandbox: true, contextIsolation: true, nodeIntegration: false } });
    host.contentView.addChildView(retired);
    retired.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    retired.setVisible(false);
    await retired.webContents.loadURL('fables-desktop://settings/appearance-button.html');
    const retiredState = await retired.webContents.executeJavaScript(`({
      retired: document.body.classList.contains('retired-appearance-launcher'),
      pointerEvents: getComputedStyle(document.body).pointerEvents,
      launcherDisplay: getComputedStyle(document.querySelector('nav')).display,
      launcherHeight: getComputedStyle(document.querySelector('nav')).height,
      buttonPointerEvents: getComputedStyle(document.querySelector('nav button')).pointerEvents
    })`);
    assert.deepEqual(retiredState, { retired: true, pointerEvents: 'none', launcherDisplay: 'flex', launcherHeight: '0px', buttonPointerEvents: 'none' });
    assert.equal(retired.getVisible(), false);
    assert.deepEqual(retired.getBounds(), { x: 0, y: 0, width: 0, height: 0 });

    const click = async id => {
      const point = await contents.executeJavaScript(`(() => {const r=document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
      for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
        contents.sendInputEvent({ type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
      }
    };
    await click('fullscreen');
    await until(() => host.isFullScreen(), 'fullscreen click enters fullscreen');
    await until(async () => await contents.executeJavaScript("document.getElementById('fullscreen').getAttribute('aria-pressed')") === 'true', 'fullscreen UI state');
    await click('fullscreen');
    await until(() => !host.isFullScreen(), 'second fullscreen click exits fullscreen');
    await until(async () => await contents.executeJavaScript("document.getElementById('fullscreen').getAttribute('aria-pressed')") === 'false', 'restored fullscreen UI state');

    await click('minimize');
    if (controls.minimizer.trayMode) await until(() => !host.isVisible(), 'minimize click hides owned fixture');
    else await until(() => host.isMinimized(), 'minimize click minimizes owned fixture');
    controls.minimizer.restore();
    await until(() => host.isVisible() && !host.isMinimized(), 'fixture restore');

    let quitCalls = 0;
    const originalQuit = app.quit;
    app.quit = () => { quitCalls++; };
    try {
      await click('quit');
      await until(() => quitCalls === 1, 'quit button dispatches exactly once');
      await pause(100);
      assert.equal(quitCalls, 1, 'Quit click dispatches exactly once.');
    } finally { app.quit = originalQuit; }
    assert.equal(await contents.executeJavaScript('window.windowControls ? "trusted" : "missing"'), 'trusted');
    assert.equal(await contents.executeJavaScript('document.documentElement.lang'), 'en');
    assert.equal(await contents.executeJavaScript("document.getElementById('fullscreen').getAttribute('aria-pressed')"), 'false');
    locale = 'ru'; controls.sync();
    await until(async () => await contents.executeJavaScript('document.documentElement.lang') === 'ru', 'Russian control labels');
    assert.equal(await contents.executeJavaScript("document.getElementById('minimize').getAttribute('aria-label')"), 'Свернуть');
    assert.equal(await contents.executeJavaScript("document.getElementById('fullscreen').getAttribute('aria-label')"), 'Полный экран');
    assert.equal(await contents.executeJavaScript("document.getElementById('quit').getAttribute('aria-label')"), 'Выйти из приложения');
    locale = 'en'; controls.sync();
    await until(async () => await contents.executeJavaScript('document.documentElement.lang') === 'en', 'English control labels restored');
    console.log('PASS: real toolbar elementFromPoint and mouse input, fullscreen twice, minimize/restore, quit spy, retired launcher isolation.');
    clearTimeout(timer);
    host.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(timer);
    for (const window of BrowserWindow.getAllWindows()) window.destroy();
    app.exit(1);
  }
}
