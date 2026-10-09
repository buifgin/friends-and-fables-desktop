// Coordinator-scheduled Electron fixture; syntax-check before launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
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
  if (process.env.FABLES_TEST_PROFILE_DIR) app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
  await app.whenReady();
  const testSession = session.fromPartition('combat-shortcuts-smoke');
  testSession.protocol.handle('https', () => new Response(`<!doctype html><body>
    <div data-ff-combat-docked><div data-ff-combat-shortcuts-slot></div>
      <button id="check">Проверка силы</button><button id="save">Спасбросок силы</button><button id="skill">Проверка акробатики</button>
      <button role="tab" id="favorites-tab" aria-controls="favorites-panel">Избранное</button>
    </div>
    <button role="tab" id="unrelated-tab">Favorites</button>
    <script>window.rolls=0;window.selections=0;window.favoritesSelected=0;window.unrelatedSelected=0;document.querySelector('#check').onclick=()=>window.selections++;
      document.querySelector('#save').onclick=()=>window.selections++;document.querySelector('#skill').onclick=()=>window.selections++;
      document.querySelector('#favorites-tab').onclick=()=>window.favoritesSelected++;
      document.querySelector('#unrelated-tab').onclick=()=>window.unrelatedSelected++;</script></body>`, { headers: { 'content-type': 'text/html' } }));
  window = new BrowserWindow({ show: false, webPreferences: { partition: 'combat-shortcuts-smoke', contextIsolation: true, nodeIntegration: false } });
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
  await contents.executeJavaScript(`history.pushState({},'', '/other/play');document.body.append(document.createElement('aside'))`);
  await wait(contents, `document.querySelector('[data-ff-shortcut-tray]').hidden`);
  assert.equal(await contents.executeJavaScript(`document.querySelectorAll('[data-ff-shortcut-tray] button').length`), 0, 'A campaign with no pins has no stale shortcuts.');
  await contents.executeJavaScript(`history.pushState({},'', '/campaign/play');document.body.append(document.createElement('aside'))`);
  await wait(contents, `document.querySelectorAll('[data-ff-shortcut-tray] button').length===1`);
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray] button').textContent`), 'Проверка силы', 'Returning to the campaign restores its canonical pins.');
  await contents.executeJavaScript(`window.__friendsFablesDesktopCombatShortcuts.update('en')`);
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray] button').textContent`), 'Strength Check');
  await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-list] input[aria-label="Pin Acrobatics Check"]').click();document.querySelector('#skill').textContent='Acrobatics Check'`);
  await wait(contents, `document.querySelectorAll('[data-ff-shortcut-tray] button').length===2`);
  await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray] button:last-child').click()`);
  assert.equal(await contents.executeJavaScript('window.selections'), 2, 'The exact English skill label selects its native button.');
  await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-list] input[aria-label="Pin Strength Saving Throw"]').click();document.querySelector('#save').textContent='STR Saving Throw'`);
  await wait(contents, `document.querySelectorAll('[data-ff-shortcut-tray] button').length===3`);
  await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray] button:last-child').click()`);
  assert.equal(await contents.executeJavaScript('window.selections'), 3, 'The exact abbreviated saving throw label selects its native button.');
  await contents.executeJavaScript(`[...document.querySelectorAll('[data-ff-shortcut-list] input')].find(x=>x.getAttribute('aria-label')==='Pin Strength Check').click()`);
  assert.equal(await contents.executeJavaScript(`document.querySelectorAll('[data-ff-shortcut-tray] button').length`), 2, 'Partial unpin removes only the corresponding tray shortcut.');
  assert.equal(await contents.executeJavaScript(`[...document.querySelectorAll('[data-ff-shortcut-tray] button')].some(x=>x.textContent==='Strength Check')`), false);
  await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-manager] summary').focus();document.body.append(document.createElement('aside'))`);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(await contents.executeJavaScript(`document.activeElement === document.querySelector('[data-ff-shortcut-manager] summary')`), true, 'Unrelated page mutations preserve keyboard focus.');
  await contents.executeJavaScript(`document.querySelector('#skill').setAttribute('aria-disabled','true')`);
  await wait(contents, `[...document.querySelectorAll('[data-ff-shortcut-tray] button')].find(x=>x.textContent==='Acrobatics Check')?.disabled`);
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-native-favorites]').disabled`), false);
  await contents.executeJavaScript(`window.__friendsFablesDesktopCombatShortcuts.dispose(); (${configureCombatShortcuts.toString()})(true, 'en')`);
  assert.equal(await contents.executeJavaScript(`JSON.stringify([...document.querySelectorAll('[data-ff-shortcut-list] input')].filter(x=>x.checked).map(x=>x.getAttribute('aria-label')))`), '["Pin Acrobatics Check","Pin Strength Saving Throw"]', 'Disposal/reconfiguration restores the remaining campaign pins.');
  await contents.executeJavaScript(`[...document.querySelectorAll('[data-ff-shortcut-list] input')].find(x=>x.getAttribute('aria-label')==='Pin Acrobatics Check').click();[...document.querySelectorAll('[data-ff-shortcut-list] input')].find(x=>x.getAttribute('aria-label')==='Pin Strength Saving Throw').click()`);
  assert.equal(await contents.executeJavaScript(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), '[]', 'Unpin removes the canonical ID.');
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-shortcut-tray]').hidden`), true);
  await contents.executeJavaScript(`document.querySelector('[data-ff-native-favorites]').click()`);
  assert.equal(await contents.executeJavaScript('window.favoritesSelected'), 1, 'Favorites activates the original tab.');
  assert.equal(await contents.executeJavaScript('window.unrelatedSelected'), 0, 'An unrelated Favorites tab outside the dock is ignored.');
  await contents.executeJavaScript(`document.querySelector('#favorites-tab').remove()`);
  await wait(contents, `document.querySelector('[data-ff-native-favorites]')?.disabled`);
  await contents.executeJavaScript(`window.__friendsFablesDesktopCombatShortcuts.dispose()`);
  assert.equal(await contents.executeJavaScript(`document.querySelector('[data-ff-combat-shortcuts]')`), null, 'Dispose removes owned UI.');
  console.log('Combat shortcuts fixture passed');
})().catch(error => { console.error(error); app.exitCode = 1; }).finally(() => { clearTimeout(timeout); window?.close(); app.quit(); });
