// Exercise actual main routing with a fresh offline profile.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
if (!process.versions.electron) throw new Error('Run this native fixture through scripts/run-electron-test.cjs.');
const { app, BrowserWindow, session, webContents } = require('electron');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
function nativeCampaignPage() {
  const campaignId = '01a0d854-78d5-7064-ae41-f63d561c8e01';
  document.getElementById('campaign-gear').onclick = () => {
    if (document.getElementById('native')) return;
    const overlay = document.createElement('div'); overlay.className = 'fixed inset-0 z-50'; overlay.dataset.state = 'open'; document.body.append(overlay);
    const dialog = document.createElement('div'); dialog.id = 'native'; dialog.role = 'dialog'; dialog.dataset.state = 'open'; dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = '<button type="button"><svg class="lucide-x"></svg>Close</button><div class="overflow-y-auto h-full"><div class="p-6 h-full"><div class="flex-1 items-center overflow-y-auto"><div class="mx-auto"><div><div><h3 class="font-header">Campaign Settings</h3></div><div><label>Name<textarea>Campaign draft</textarea></label></div></div></div></div></div></div>';
    dialog.__reactFiber$fixture = { type: 'div', child: { type: function NativeCampaign() { return 'Campaign Settings'; }, memoizedProps: { campaignId, isHost: true } } };
    dialog.querySelector('button').onclick = () => { dialog.dataset.state = 'closed'; dialog.remove(); overlay.remove(); document.body.style.pointerEvents = ''; document.body.style.overflow = ''; };
    document.body.append(dialog); document.body.style.pointerEvents = 'none'; document.body.style.overflow = 'hidden';
  };
}
const websiteHtml = '<!doctype html><title>Offline Settings routing</title><style>body{margin:0}#native{position:fixed;right:0;top:5vh;width:500px;height:90vh;background:#203040}#native .mx-auto{min-height:1200px}</style><aside><button id="campaign-gear"><svg class="lucide-settings"></svg>Settings</button></aside><section id="chat" class="flex-1 h-full w-full"><div id="events-list"></div><div class="tiptap" contenteditable="true">Fixture composer</div><input id="native-draft" value="Keep this native draft"></section><script>(' + nativeCampaignPage.toString() + ')()</script>';
let dock, profile, host, finished = false, websiteOpenRequest;
const timer = setTimeout(() => { console.error('FAIL: generic Settings routing deadline'); app.exit(1); }, 20000);
const { AppearanceManager } = require(path.join(root, 'dist/appearance/appearance'));
const attach = AppearanceManager.prototype.attachMain;
AppearanceManager.prototype.attachMain = function (...args) {
  const contents = args[1].webContents, setOpenHandler = contents.setWindowOpenHandler.bind(contents);
  contents.setWindowOpenHandler = handler => { websiteOpenRequest = handler; setOpenHandler(handler); };
  dock = attach.apply(this, args);
  return dock;
};
async function until(predicate, label) {
  const end = Date.now() + 4000;
  while (!await predicate()) {
    if (Date.now() >= end) {
      const site = webContents.getAllWebContents().find(c => !c.isDestroyed() && c.getURL().startsWith('https://play.fables.gg/'));
      console.error('Routing diagnostic', { section: dock?.hub.currentSection(), open: dock?.isOpen(), page: site && await site.executeJavaScript("({url:location.href,controller:!!window.__friendsFablesDesktopCampaignPanel,nav:!!document.querySelector('[data-ff-campaign-navigation]'),native:!!document.querySelector('#native'),adopted:!!document.querySelector('[data-ff-campaign-panel]')})") });
      throw Error('Routing prerequisite: ' + label);
    }
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
      websiteHtml,
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
    const observeCampaign = site.executeJavaScript.bind(site);
    site.executeJavaScript = (source, ...args) => {
      const result = observeCampaign(source, ...args);
      return source.includes('function configureNativeCampaignPanel') ? result.then(value => { console.log('Campaign transport diagnostic', source.slice(-500), value); return value; }) : result;
    };
    await dock.openSection('campaign');
    await until(() => site.executeJavaScript("!!document.querySelector('[data-ff-campaign-navigation]') && !!document.querySelector('[data-ff-campaign-panel]')"), 'real main coherent Campaign presentation');
    assert.equal(await site.executeJavaScript("typeof window.settingsHub"), 'undefined', 'Website navigation has no privileged Hub bridge');
    assert.equal(dock.hub.view.getVisible(), false, 'Campaign uses the website rail, not a second local navigation view');
    const link = await site.executeJavaScript("document.querySelector('[data-ff-campaign-navigation] a[href*=\"section=general\"]').href");
    await site.executeJavaScript(`window.open(${JSON.stringify(link + '&extra=1')},'_blank');true`);
    await site.executeJavaScript(`window.open(${JSON.stringify(link.replace(/ticket=[^&]+/, 'ticket=stale'))},'_blank');true`);
    assert.equal(dock.hub.currentSection(), 'campaign', 'Malformed/stale navigation does not change the selected section');
    await site.executeJavaScript("window.nativeCampaignIdentity=document.querySelector('[data-ff-campaign-panel]');window.nativeCampaignField=nativeCampaignIdentity.querySelector('textarea');nativeCampaignField.value='Keep Campaign draft';true");
    await site.executeJavaScript(`window.open(${JSON.stringify(link)},'_blank');true`);
    await until(() => dock.isOpen() && dock.hub.currentSection() === 'general', 'valid Campaign navigation requests only the existing local section');
    assert.equal(await site.executeJavaScript("nativeCampaignIdentity.isConnected && nativeCampaignField.value==='Keep Campaign draft'"), true);
    await site.executeJavaScript(`window.open(${JSON.stringify(link)},'_blank');true`);
    assert.equal(dock.hub.currentSection(), 'general', 'An opening ticket cannot replay after the handoff');
    await dock.openSection('campaign');
    const currentLink = await site.executeJavaScript("document.querySelector('[data-ff-campaign-navigation] a[href*=\"section=general\"]').href");
    assert.notEqual(currentLink, link, 'A new opening receives a new stale-operation identity');
    await site.executeJavaScript(`window.open(${JSON.stringify(link)},'_blank');true`);
    assert.equal(dock.hub.currentSection(), 'campaign', 'Old opening identity cannot navigate a newer Campaign');
    dock.hide();
    // Hold the main acknowledgment after genuine reveal. Its already-painted
    // link may cancel that opening; the late acknowledgment cannot commit it.
    const nativeExecute = site.executeJavaScript.bind(site);
    let releaseReveal, revealReached = false;
    const revealAck = new Promise(resolve => { releaseReveal = resolve; });
    site.executeJavaScript = (source, ...args) => {
      const result = nativeExecute(source, ...args);
      return source.includes(')("reveal",') ? result.then(async value => { revealReached = true; await revealAck; return value; }) : result;
    };
    try {
      const campaignOpening = dock.openSection('campaign');
      await until(() => revealReached, 'real main reveal is painted while acknowledgment is held');
      await nativeExecute("document.querySelector('[data-ff-campaign-navigation] a[href*=\"section=general\"]').click();true");
      await until(() => dock.hub.currentSection() === 'general' && dock.isOpen(), 'first-painted navigation cancels the old reveal');
      releaseReveal(); await campaignOpening;
      assert.equal(dock.hub.currentSection(), 'general');
      assert.equal(dock.hub.resolveSettingsSection(), 'general', 'Late reveal cannot replace the committed selection');
      await dock.flushSettings();
      assert.equal(dock.general.lastSettingsSection, 'general', 'Late reveal cannot overwrite committed local navigation');
    } finally { releaseReveal(); site.executeJavaScript = nativeExecute; }
    dock.hide();
    await until(() => site.executeJavaScript("!window.__friendsFablesDesktopCampaignPanel"), 'previous reveal cleanup');
    const prepareExecute = site.executeJavaScript.bind(site), nativeNavigate = dock.navigateCampaignSection.bind(dock);
    let releasePrepare, prepareReached = false, staleNavigationAttempts = 0;
    const prepareAck = new Promise(resolve => { releasePrepare = resolve; });
    site.executeJavaScript = (source, ...args) => {
      const result = prepareExecute(source, ...args);
      return source.includes(')("prepare",') ? result.then(async value => { prepareReached = true; await prepareAck; return value; }) : result;
    };
    dock.navigateCampaignSection = (...args) => { staleNavigationAttempts++; return nativeNavigate(...args); };
    try {
      const oldOpening = dock.openSection('campaign');
      await until(() => prepareReached, 'prepared Campaign acknowledgment held');
      const oldLink = await prepareExecute("document.querySelector('[data-ff-campaign-navigation] a[href*=\"section=general\"]').href");
      const oldURL = site.getURL();
      // Model the real Electron navigation-start signal while the previous URL
      // is still committed. No network or future document is needed for this
      // exact queued-operation invalidation boundary.
      site.emit('did-start-navigation', { isMainFrame: true }, 'https://play.fables.gg/pending-document', false, true);
      assert.equal(site.getURL(), oldURL);
      releasePrepare(); await oldOpening;
      assert.equal(dock.isOpen(), false, 'Navigation start cancels the owned opening before its late acknowledgment');
      websiteOpenRequest({ url: oldLink });
      assert.equal(staleNavigationAttempts, 0, 'Late preparation cannot re-arm old navigation authority');
    } finally { releasePrepare(); site.executeJavaScript = prepareExecute; dock.navigateCampaignSection = nativeNavigate; }
    await until(() => site.executeJavaScript("!window.__friendsFablesDesktopCampaignPanel"), 'previous owned reservation removed');
    const rememberedBeforeCanceledOpening = dock.general.lastSettingsSection;
    assert.equal(rememberedBeforeCanceledOpening, 'general');
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
      assert.equal(dock.general.lastSettingsSection, rememberedBeforeCanceledOpening, 'Canceled pending section cannot replace the last successful selection');
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
