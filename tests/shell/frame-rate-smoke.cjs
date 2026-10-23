// Actual-main offline fixture for the View > Show FPS and Frame Times toggle.
// Coordinator owns native execution; this file can be syntax checked in Node.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');

const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const websiteHtml = `<!doctype html><meta charset="utf-8"><title>Offline FPS fixture</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:auto}#feed{height:1600px;padding:24px;box-sizing:border-box}
#native{position:fixed;left:24px;top:24px;width:320px;height:120px;background:#ddd;z-index:2}
#draft{position:fixed;left:24px;top:170px;z-index:2}</style>
<main id="feed"><div id="native">Native feed content</div><textarea id="draft">Keep this draft</textarea>
<div style="margin-top:900px">Scroll anchor</div></main>
<script>window.fixtureReady=true;window.nativeIdentity=document.getElementById('native');window.draftIdentity=document.getElementById('draft');</script>`;

function validateSerializedPrograms() {
  new Function('return ' + websiteHtml.match(/<script>([\s\S]*?)<\/script>/)[1]);
}
validateSerializedPrograms();
if (process.env.FABLES_TEST_PARSE_ONLY === '1') {
  console.log('PASS: FPS fixture browser program parses');
} else {
  if (!process.versions.electron) throw new Error('Run through the isolated Electron fixture runner.');
  const { app, BrowserWindow, Menu, session, webContents } = require('electron');
  let host, site, profile, finished = false;
  const deadline = setTimeout(() => { console.error('FAIL: FPS overlay fixture deadline'); app.exit(1); }, 25000);

  async function until(predicate, label, timeoutMs = 8000) {
    const stop = Date.now() + timeoutMs;
    while (Date.now() < stop) {
      if (await predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('Timed out waiting for ' + label);
  }

  function menuItem() {
    const item = Menu.getApplicationMenu()?.getMenuItemById('show-fps');
    assert.ok(item, 'actual application menu exposes show-fps checkbox');
    assert.equal(item.type, 'checkbox');
    return item;
  }

  async function pageState() {
    return site.executeJavaScript(`({ready:!!window.fixtureReady,url:location.href,hidden:document.hidden,
      overlay:[...document.querySelectorAll('div[aria-hidden="true"]')].find(node=>node.textContent.startsWith('Page frame cadence'))?.textContent||null,
      overlayPointer:[...document.querySelectorAll('div[aria-hidden="true"]')].find(node=>node.textContent.startsWith('Page frame cadence'))?.style.pointerEvents||null,
      overlayFixed:[...document.querySelectorAll('div[aria-hidden="true"]')].find(node=>node.textContent.startsWith('Page frame cadence'))?.style.position||null,
      feed:document.getElementById('feed').getBoundingClientRect().toJSON(),
      nativeSame:window.nativeIdentity===document.getElementById('native'),
      draftSame:window.draftIdentity===document.getElementById('draft'),
      draft:document.getElementById('draft').value,scrollY,rafState:!!window.__ffFrameRateOverlay})`);
  }

  function toggle(item, expected) {
    // Use Electron's menu dispatcher so checkbox state and click semantics run.
    item.click({}, host, site);
    assert.equal(item.checked, expected, 'menu checkbox state follows click');
  }

  void app.whenReady().then(async () => {
    profile = process.env.FABLES_TEST_PROFILE_DIR || await fs.mkdtemp(path.join(os.tmpdir(), 'ff-frame-rate-'));
    app.setPath('userData', profile);
    app.on('window-all-closed', () => {});
    await session.fromPartition('persist:friends-and-fables').protocol.handle('https', () =>
      new Response(websiteHtml, { headers: { 'Content-Type': 'text/html' } }));
    await until(() => webContents.getAllWebContents().some(contents => !contents.isDestroyed() && contents.getURL().startsWith('https://play.fables.gg/')), 'main play page');
    site = webContents.getAllWebContents().find(contents => !contents.isDestroyed() && contents.getURL().startsWith('https://play.fables.gg/'));
    await until(() => !site.isLoading(), 'offline play document');
    host = BrowserWindow.getAllWindows().find(win => win.contentView.children.some(child => child.webContents === site));
    assert.ok(host, 'play page belongs to the actual main window');
    host.show(); host.focus(); site.focus();
    await until(() => site.executeJavaScript('!!window.fixtureReady'), 'fixture document ready');

    const item = menuItem();
    assert.equal(item.checked, false, 'overlay defaults off');
    let state = await pageState();
    assert.equal(state.overlay, null);
    await site.executeJavaScript('window.scrollTo(0,300);document.getElementById("draft").value="Preserve FPS fixture draft";true');
    const baseline = await pageState();
    toggle(item, true);
    await until(async () => {
      const current = await pageState();
      return !!current.overlay && /warming up|FPS/.test(current.overlay) && current.rafState;
    }, 'overlay and RAF state');
    await until(async () => /\bFPS\b/.test((await pageState()).overlay || ''), 'one-second cadence measurement', 5000);
    state = await pageState();
    assert.equal(state.overlayPointer, 'none', 'counter does not intercept pointer input');
    assert.equal(state.overlayFixed, 'fixed', 'counter is fixed over the page');
    assert.deepEqual(state.feed, baseline.feed, 'feed geometry is unchanged');
    assert.equal(state.scrollY, baseline.scrollY, 'feed scroll position is unchanged');
    assert.equal(state.nativeSame, true, 'native feed node identity is preserved');
    assert.equal(state.draftSame, true, 'draft input identity is preserved');
    assert.equal(state.draft, 'Preserve FPS fixture draft');

    toggle(item, false);
    await until(async () => {
      const current = await pageState();
      return current.overlay === null && !current.rafState;
    }, 'overlay and RAF cleanup');
    toggle(item, true);
    await until(async () => (await pageState()).rafState, 're-enabled overlay');
    await site.reload();
    await until(() => !site.isLoading(), 'main document reload');
    await until(async () => (await pageState()).rafState && !!(await pageState()).overlay, 'toggle reapplied after reload');
    assert.equal(menuItem().checked, true);

    // A popup gets its own document. It must not inherit a main-page overlay.
    let popup;
    site.setWindowOpenHandler(({ url }) => {
      if (url === 'https://play.fables.gg/popup') {
        setImmediate(() => { popup = webContents.getAllWebContents().find(contents => contents !== site && !contents.isDestroyed() && contents.getURL() === url); });
        return { action: 'allow' };
      }
      return { action: 'deny' };
    });
    await site.executeJavaScript('window.open("https://play.fables.gg/popup","fps-popup");true');
    await until(() => popup && !popup.isLoading(), 'offline popup document');
    assert.equal(await popup.executeJavaScript('!!window.__ffFrameRateOverlay'), false, 'popup does not inherit main-page overlay');

    toggle(menuItem(), false);
    await until(async () => !(await pageState()).rafState, 'final overlay cleanup');
    if (popup && !popup.isDestroyed()) popup.close();
    finished = true;
    console.log('PASS: actual-main FPS menu toggle, measurement, page preservation, reload and popup scope');
  }).catch(error => {
    console.error('FAIL: FPS overlay fixture', error);
    app.exit(1);
  });

  app.on('will-quit', () => clearTimeout(deadline));
}
