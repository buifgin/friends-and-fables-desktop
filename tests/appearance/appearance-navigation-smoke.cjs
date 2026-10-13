const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { app, BrowserWindow, session } = require('electron');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { AppearanceManager, registerAppearanceScheme } = require(path.join(appRoot, 'dist/appearance/appearance'));
const { DEFAULT_APPEARANCE } = require(path.join(appRoot, 'dist/appearance/themes'));
const { MusicManager } = require(path.join(appRoot, 'dist/music/music'));
registerAppearanceScheme();
app.on('window-all-closed', () => {});
const timer = setTimeout(() => { console.error('Appearance navigation fixture timed out'); app.exit(1); }, 30000);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label) {
  for (let i = 0; i < 200; i++) { if (await predicate()) return; await pause(10); }
  throw new Error(`Timed out: ${label}`);
}
let profile, window, music;
const events = [];
const diagnosticJson = value => JSON.stringify(value).replace(/token=[a-f0-9]{48}/g, 'token=[redacted]');
const html = `<!doctype html><html><head><style>:root { --background: 210 51.16279% 16.862745%; --foreground: 210 20% 57% } body { background: hsl(var(--background)); color: hsl(var(--foreground)) }</style></head><body><header><div><button type="button"><svg class="lucide-user-plus"></svg></button><div class="ml-1 flex flex-row space-x-1"></div></div></header><div class="tiptap" contenteditable="true">Retained draft</div></body></html>`;
(async () => {
  profile = await mkdtemp(path.join(os.tmpdir(), 'fables-appearance-navigation-'));
  app.setPath('userData', profile);
  await writeFile(path.join(profile, 'appearance.json'), JSON.stringify({ ...DEFAULT_APPEARANCE, preset: 'custom', customColor: '#123456' }));
  await app.whenReady();
  const appearance = new AppearanceManager(); await appearance.initialize();
  music = new MusicManager(); await music.initialize();
  const site = session.fromPartition('appearance-navigation-fixture');
  site.protocol.handle('https', () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  window = new BrowserWindow({ show: false, width: 900, height: 700, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const contents = window.webContents, js = source => contents.executeJavaScript(source);
  for (const name of ['did-start-navigation', 'will-frame-navigate', 'did-navigate', 'dom-ready', 'did-finish-load', 'did-fail-load']) {
    contents.on(name, (event, ...args) => events.push({ name, url: event.url || args.find(value => typeof value === 'string'), main: event.isMainFrame, sameDocument: event.isSameDocument }));
  }
  contents.on('will-frame-navigate', event => {
    if (event.url.startsWith('fables-desktop://music/control')) console.log('Music dispatch authority', diagnosticJson({ main: event.isMainFrame, frame: event.frame === contents.mainFrame, initiator: event.initiator === contents.mainFrame, trusted: music.trustedWebsite(contents, window), command: !!music.websiteCommand(contents, window, event.url), player: !!music.player, loading: !!music.loading, selected: music.getSettings().selected }));
  });
  appearance.attach(contents); music.attach(contents); music.attachMain(window, undefined, contents);
  contents.on('will-frame-navigate', event => { if (event.url.includes('/blocked')) event.preventDefault(); });
  const website = [...appearance.websites][0];
  const settle = async () => { await website.pending; await js('0'); };
  const snapshot = () => js(`({ document:document===window.fixtureDocument, composer:document.querySelector('.tiptap')===window.fixtureComposer, draft:document.querySelector('.tiptap').textContent, background:getComputedStyle(document.body).backgroundColor, foreground:getComputedStyle(document.body).color, url:location.href, bridge:typeof window.music, node:typeof window.require })`);
  const url = 'https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play';
  await window.loadURL(url); await settle();
  await until(() => music.siteToken && website.cssKey, 'initial theme and Music credential');
  await js("window.fixtureDocument=document;window.fixtureComposer=document.querySelector('.tiptap')");
  const before = await snapshot();
  assert.equal(before.background, 'rgb(18, 52, 86)', 'Fixture starts with the customized Appearance theme.');
  assert.equal(before.bridge, 'undefined'); assert.equal(before.node, 'undefined');
  const preserved = async (target, label) => {
    const start = events.length, key = website.cssKey, token = music.siteToken;
    await js(`location.assign(${JSON.stringify(target)})`);
    await until(() => events.slice(start).some(event => event.name === 'will-frame-navigate' && event.url === target), `${label} cancellation`);
    await settle();
    const observed = events.slice(start);
    console.log(label, diagnosticJson({ events: observed, beforeKey: key, afterKey: website.cssKey, snapshot: await snapshot() }));
    assert(observed.some(event => event.name === 'did-start-navigation'), 'Regression exercises the actual pre-cancellation start event.');
    assert(!observed.some(event => event.name === 'did-navigate' || event.name === 'dom-ready'), `${label} never commits or recreates its document.`);
    assert.deepEqual(await snapshot(), before, `${label} retains document, draft and computed Appearance colors.`);
    assert.equal(website.cssKey, key, `${label} retains the existing stylesheet identity.`);
    assert.equal(website.ready, true, `${label} remains ready for subsequent Appearance updates.`);
    assert.equal(music.siteToken, token, `${label} retains the document-scoped Music credential.`);
  };
  const command = name => `fables-desktop://music/control?command=${name}&token=${music.siteToken}`;
  for (const name of ['previous', 'next']) await preserved(command(name), `unselected ${name}`);
  await preserved('https://play.fables.gg/blocked', 'ordinary canceled navigation');
  const player = await music.open(window); music.hide();
  const tracks = [{ id: 'first', title: 'First', url: 'https://audio.fixture/first.wav' }, { id: 'second', title: 'Second', url: 'https://audio.fixture/second.wav' }];
  await until(() => player.webContents.executeJavaScript("!document.getElementById('title').disabled"), 'player ready');
  for (const [index, track] of tracks.entries()) {
    await player.webContents.executeJavaScript(`document.getElementById('title').value=${JSON.stringify(track.title)};document.getElementById('url').value=${JSON.stringify(track.url)};document.getElementById('add-track').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);
    await until(() => music.getSettings().tracks.length === index + 1, 'committed playlist addition');
    await until(() => player.webContents.executeJavaScript("!document.getElementById('title').disabled"), 'playlist form ready');
  }
  const savedTracks = music.getSettings().tracks;
  assert.equal(music.getSettings().selected, savedTracks[0].id);
  assert.equal(await player.webContents.executeJavaScript("document.querySelectorAll('#playlist li').length"), 2, 'Renderer and manager both hold the selected playlist.');
  for (const [name, selected] of [['next', savedTracks[1].id], ['previous', savedTracks[0].id]]) {
    await preserved(command(name), `selected ${name}`);
    await until(() => music.getSettings().selected === selected, `actual ${name} command delivery`);
  }
  await window.loadURL('https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e02/play'); await settle();
  assert.equal(await js('document===window.fixtureDocument'), false, 'Committed navigation replaces the document.');
  assert.equal(await js('getComputedStyle(document.body).backgroundColor'), before.background, 'Committed campaign navigation reapplies Appearance.');
  // Pause a real serialized apply while its image lookup is outstanding, then
  // commit an authentication document before allowing it to insert any CSS.
  const picture = appearance.picture.bind(appearance);
  let releasePicture, pictureEntered;
  const entered = new Promise(resolve => { pictureEntered = resolve; });
  const release = new Promise(resolve => { releasePicture = resolve; });
  let blocked = false, staleInsertions = 0;
  appearance.picture = async settings => {
    if (!blocked) { blocked = true; pictureEntered(); await release; }
    return picture(settings);
  };
  const insertCSS = contents.insertCSS.bind(contents);
  contents.insertCSS = (...args) => {
    if (contents.getURL().startsWith('https://auth.fixture/')) staleInsertions++;
    return insertCSS(...args);
  };
  const inFlight = appearance.setHostInstructions(structuredClone(appearance.instructions));
  await entered;
  await window.loadURL('https://auth.fixture/login');
  releasePicture(); await inFlight; await settle();
  appearance.picture = picture; contents.insertCSS = insertCSS;
  assert.equal(staleInsertions, 0, 'An apply begun on the previous document cannot insert CSS into authentication.');
  assert.equal(await js('getComputedStyle(document.body).backgroundColor'), 'rgb(21, 43, 65)', 'Committed authentication document keeps its native theme.');
  await window.loadURL(url); await settle();
  assert.equal(await js('getComputedStyle(document.body).backgroundColor'), before.background, 'Returning from authentication reapplies Appearance.');
  console.log('Appearance navigation lifecycle fixture passed.');
})().then(async () => {
  clearTimeout(timer); await music?.shutdown(); window?.destroy(); await rm(profile, { recursive: true, force: true }); app.exit(0);
}).catch(async error => {
  console.error(error, diagnosticJson(events)); clearTimeout(timer);
  await music?.shutdown().catch(console.error); window?.destroy(); if (profile) await rm(profile, { recursive: true, force: true }); app.exit(1);
});
