// Coordinator-scheduled Electron fixture; syntax-check before launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, protocol } = require('electron');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { configureCombatShortcuts } = require(path.join(root, 'dist/combat/combat-shortcuts'));
app.on('window-all-closed', () => {});
let window;
const timeout = setTimeout(() => { console.error('Combat shortcuts fixture timed out'); app.exit(1); }, 30000);
const wait = async (contents, expression) => {
  for (let i = 0; i < 100; i++) { if (await contents.executeJavaScript(expression)) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  throw new Error(`Timed out waiting for ${expression}`);
};
(async () => {
  await app.whenReady();
  protocol.handle('https', () => new Response(`<!doctype html><body>
    <div data-ff-combat-docked><div data-ff-combat-shortcuts-slot></div>
      <button id="check">Проверка силы</button><button id="save">Спасбросок силы</button><button id="skill">Проверка акробатики</button>
    </div><button role="tab" id="favorites-tab" aria-controls="favorites-panel">Избранное</button>
    <script>window.rolls=0;window.selections=0;document.querySelector('#check').onclick=()=>window.selections++;
      document.querySelector('#save').onclick=()=>window.selections++;document.querySelector('#skill').onclick=()=>window.selections++;
      document.querySelector('[role=tab]').onclick=()=>window.favoritesSelected=(window.favoritesSelected||0)+1;</script></body>`, { headers: { 'content-type': 'text/html' } }));
  window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, nodeIntegration: false } });
  await window.loadURL('https://combat.test/campaign/play');
  const source = `(${configureCombatShortcuts.toString()})(true, 'ru')`;
  const contents = window.webContents;
  await contents.executeJavaScript(source);
  await wait(contents, `!!document.querySelector('[data-ff-combat-shortcuts]')`);
  let state = await contents.executeJavaScript(`(() => { const box=[...document.querySelectorAll('[data-ff-shortcut-list] input')].find(x=>x.getAttribute('aria-label')==='Закрепить: Проверка силы'); box.click(); return {checked:box.checked, pins:localStorage.getItem('ff-desktop-combat-pins-v1:campaign')}; })()`);
  assert.equal(state.checked, true);
  assert.match(state.pins || '', /ability\.strength/);
  await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray] button')?.click()`);
  assert.equal(await contents.executeJavaScript('window.selections'), 1, 'The shortcut selects the existing native control once.');
  assert.equal(await contents.executeJavaScript('window.rolls'), 0, 'The shortcut never submits or rolls.');
  assert.equal(await contents.executeJavaScript(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), '["ability.strength"]', 'Only the canonical ID is persisted for this campaign.');
  await contents.executeJavaScript(`window.__friendsFablesDesktopCombatShortcuts.update('en')`);
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray] button').textContent`), 'Strength Check');
  await contents.executeJavaScript(`document.querySelector('#check').disabled=true`);
  await wait(contents, `document.querySelector('[data-ff-shortcut-tray] button')?.disabled`);
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-native-favorites]').disabled`), false);
  await contents.executeJavaScript(`window.__friendsFablesDesktopCombatShortcuts.dispose(); (${configureCombatShortcuts.toString()})(true, 'en')`);
  await wait(contents, `[...document.querySelectorAll('[data-ff-shortcut-list] input')].some(x=>x.getAttribute('aria-label')==='Pin Strength Check' && x.checked)`);
  await contents.executeJavaScript(`[...document.querySelectorAll('[data-ff-shortcut-list] input')].find(x=>x.getAttribute('aria-label')==='Pin Strength Check').click()`);
  assert.equal(await contents.executeJavaScript(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), '[]', 'Unpin removes the canonical ID.');
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray]').hidden`), true);
  await contents.executeJavaScript(`document.querySelector('[data-ff-native-favorites]').click()`);
  assert.equal(await contents.executeJavaScript('window.favoritesSelected'), 1, 'Favorites activates the original tab.');
  await contents.executeJavaScript(`document.querySelector('#favorites-tab').remove()`);
  await wait(contents, `document.querySelector('[data-ff-native-favorites]')?.disabled`);
  await contents.executeJavaScript(`window.__friendsFablesDesktopCombatShortcuts.dispose()`);
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-combat-shortcuts]')`), null, 'Dispose removes owned UI.');
  console.log('Combat shortcuts fixture passed');
})().catch(error => { console.error(error); app.exitCode = 1; }).finally(() => { clearTimeout(timeout); window?.close(); app.quit(); });
