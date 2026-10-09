// Coordinator-scheduled Electron fixture; syntax-check before launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { configureCombatShortcuts } = require(path.join(root, 'dist/combat/combat-shortcuts'));
app.on('window-all-closed', () => {});
let window;
const timeout = setTimeout(() => { console.error('Combat favorites fixture timed out'); app.exit(1); }, 30000);
const wait = async (contents, expression) => {
  for (let i = 0; i < 100; i++) { if (await contents.executeJavaScript(expression)) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  throw new Error(`Timed out waiting for ${expression}`);
};
(async () => {
  if (process.env.FABLES_TEST_PROFILE_DIR) app.setPath('userData', process.env.FABLES_TEST_PROFILE_DIR);
  await app.whenReady();
  const testSession = session.fromPartition('combat-shortcuts-smoke');
  testSession.protocol.handle('https', () => new Response(`<!doctype html><html><head><meta charset="utf-8"></head><body>
    <div data-ff-combat-docked data-ff-combat-panel-mode="skills"><h2>Dice</h2><div data-ff-combat-shortcuts-slot></div>
      <div id="native-list"><button id="check" class="native-tile"><div><svg id="d20"><path id="icon-path"/></svg><span>Проверка силы</span></div></button>
        <button id="save">Спасбросок силы</button><button id="skill">Проверка акробатики</button><button id="custom">Custom roll</button></div>
      <form id="detail" hidden><button type="button" id="back">Back</button><input id="draft" value="untouched"><button type="submit">Roll</button></form>
    </div>
    <script>localStorage.clear();window.rolls=0;window.selections=0;window.pointerSelections=0;
      window.originalCheck=document.querySelector('#check');window.originalDraft=document.querySelector('#draft');
      document.querySelector('#detail').onsubmit=event=>{event.preventDefault();window.rolls++};
      for(const id of ['check','save','skill']){
        document.getElementById(id).onmousedown=()=>window.pointerSelections++;
        document.getElementById(id).onclick=()=>{window.selections++;document.querySelector('#native-list').hidden=true;document.querySelector('#detail').hidden=false};
      }
      document.querySelector('#back').onclick=()=>{document.querySelector('#native-list').hidden=false;document.querySelector('#detail').hidden=true};
    </script></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
  window = new BrowserWindow({ show: false, webPreferences: { partition: 'combat-shortcuts-smoke', contextIsolation: true, nodeIntegration: false } });
  await window.loadURL('https://combat.test/campaign/play');
  const contents = window.webContents;
  const run = async expression => {
    try { return await contents.executeJavaScript(expression); }
    catch (error) { throw new Error(`Fixture evaluate failed for ${expression.slice(0, 180)}: ${error.message}`); }
  };
  const click = selector => run(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await run(`(${configureCombatShortcuts.toString()})(true, 'ru')`);
  await wait(contents, `!!document.querySelector('[data-ff-dice-favorites]')`);
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorites]').hidden`), false, 'Favorites is the initial view; the former manager cannot satisfy this.');
  assert.equal(await run(`document.querySelector('[data-ff-dice-add]').textContent`), 'Добавить');
  assert.equal(await run(`document.querySelector('[data-ff-shortcut-manager],[data-ff-shortcut-tray],[data-ff-native-favorites]')`), null);
  assert.deepEqual(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].filter(x=>!x.hidden).map(x=>x.getAttribute('aria-label'))`), ['Все проверки', 'Избранное']);
  assert.equal(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].every(x=>x.textContent.trim()===''&&x.title===x.getAttribute('aria-label')&&x.querySelector('svg[aria-hidden="true"]'))`), true, 'Top navigation is icon-only with Russian accessible names and tooltips.');
  await click('[data-ff-dice-standard]');
  assert.equal(await run(`document.querySelector('#native-list').hasAttribute('data-ff-dice-native-hidden')`), false);
  await click('[data-ff-dice-favorites-nav]'); await click('[data-ff-dice-add]');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-selection-checkbox]').length`), 3, 'Only real native canonical tiles get checkboxes.');
  await run(`document.querySelector('#check').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));document.querySelector('#check').click()`);
  assert.equal(await run('window.pointerSelections+window.selections'), 0, 'Selection blocks native pointer/click handlers.');
  assert.equal(await run(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), null, 'Draft changes do not persist.');
  assert.equal(await run(`document.querySelector('#check input').checked`), true);
  await run(`document.querySelector('#save').dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}))`);
  await run(`document.querySelector('#skill input').focus();document.querySelector('#skill input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))`);
  assert.equal(await run(`document.activeElement===document.querySelector('#skill input')`), true, 'Checkbox selection retains keyboard focus.');
  await click('[data-ff-dice-selection-cancel]');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-favorite-tile]').length`), 0, 'Cancel discards the entire draft.');
  await click('[data-ff-dice-add]'); await click('#check'); await click('#skill input');
  await click('[data-ff-dice-selection-confirm]');
  assert.equal(await run(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), '["ability.strength","skill.acrobatics"]');
  assert.equal(await run(`document.querySelector('[data-ff-dice-add]').textContent`), 'Добавить ещё');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-selection-checkbox]').length`), 0);
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorite-tile]').className`), 'native-tile');
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorite-tile] svg')!==null`), true, 'Favorite tile retains the native icon.');
  assert.equal(await run(`document.querySelectorAll('#d20').length`), 1, 'Cloned visuals never duplicate native IDs.');
  assert.equal(await run(`!!document.querySelector('[data-ff-dice-favorite-tile] > div > svg')`), true, 'Cloned native icon wrappers retain normal tile CSS structure.');
  await run(`window.ownedFavorite=document.querySelector('[data-ff-dice-favorite-tile="ability.strength"]');const old=document.querySelector('#native-list');const replacement=old.cloneNode(true);replacement.removeAttribute('data-ff-dice-native-hidden');old.replaceWith(replacement);for(const id of ['check','save','skill'])document.getElementById(id).onclick=()=>{window.selections++;document.querySelector('#native-list').hidden=true;document.querySelector('#detail').hidden=false};window.originalCheck=document.querySelector('#check');true`);
  await wait(contents, `document.querySelector('#native-list').hasAttribute('data-ff-dice-native-hidden')`);
  assert.equal(await run(`window.ownedFavorite===document.querySelector('[data-ff-dice-favorite-tile="ability.strength"]')`), true, 'Identical native list remount preserves the owned favorite button.');
  await click('[data-ff-dice-favorite-tile="ability.strength"]');
  await wait(contents, `document.querySelector('[data-ff-dice-navigation]').hidden`);
  assert.equal(await run('window.selections'), 1, 'Favorite opens its original native check once.');
  assert.equal(await run('window.rolls'), 0);
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorites]').hidden && document.querySelector('[data-ff-dice-selection-confirm]').hidden`), true, 'Detail hides all owned dice UI.');
  await click('#back'); await wait(contents, `!document.querySelector('[data-ff-dice-favorites]').hidden`);
  await click('[data-ff-dice-standard]'); await click('#save');
  await wait(contents, `document.querySelector('[data-ff-dice-navigation]').hidden`);
  assert.equal(await run('window.selections'), 2, 'Standard view keeps the original native click handler.');
  await click('#back'); await wait(contents, `!document.querySelector('[data-ff-dice-navigation]').hidden`);
  await click('[data-ff-dice-favorites-nav]');
  await run(`window.__friendsFablesDesktopCombatShortcuts.update('en')`);
  assert.deepEqual(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].map(x=>x.getAttribute('aria-label'))`), ['All checks', 'Favorites']);
  assert.equal(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].every(x=>x.title===x.getAttribute('aria-label'))`), true, 'Navigation tooltips follow the English locale.');
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorite-tile]').textContent`), 'Strength Check');
  await run(`document.querySelector('#skill').setAttribute('aria-disabled','true')`);
  await wait(contents, `document.querySelector('[data-ff-dice-favorite-tile="skill.acrobatics"]').disabled`);
  await click('[data-ff-dice-favorite-tile="skill.acrobatics"]'); assert.equal(await run('window.selections'), 2);
  await run(`document.querySelector('[data-ff-combat-docked]').dataset.ffCombatPanelMode='actions'`);
  await wait(contents, `document.querySelector('[data-ff-dice-navigation]').hidden`);
  assert.equal(await run(`document.querySelector('#native-list').hasAttribute('data-ff-dice-native-hidden')`), false, 'Actions/spell targeting restores native content.');
  await run(`document.querySelector('[data-ff-combat-docked]').removeAttribute('data-ff-combat-panel-mode')`);
  await wait(contents, `document.querySelector('[data-ff-dice-favorites]').hidden`);
  await run(`document.querySelector('[data-ff-combat-docked]').dataset.ffCombatPanelMode='skills';history.pushState({},'', '/other/play');document.body.append(document.createElement('aside'));true`);
  await wait(contents, `document.querySelectorAll('[data-ff-dice-favorite-tile]').length===0`);
  await run(`localStorage.setItem('ff-desktop-combat-pins-v1:other','broken');window.__friendsFablesDesktopCombatShortcuts.dispose();(${configureCombatShortcuts.toString()})(true,'en')`);
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-favorite-tile]').length`), 0, 'Malformed storage is safe.');
  await run(`history.pushState({},'', '/campaign/play');document.body.append(document.createElement('aside'));true`);
  await wait(contents, `document.querySelectorAll('[data-ff-dice-favorite-tile]').length===2`);
  await run(`window.__friendsFablesDesktopCombatShortcuts.dispose()`);
  assert.equal(await run(`document.querySelector('[data-ff-combat-shortcuts],[data-ff-dice-favorites],[data-ff-dice-selection-confirm],[data-ff-dice-native-hidden],[data-ff-dice-selection-tile]')`), null);
  assert.equal(await run(`window.originalCheck===document.querySelector('#check')&&window.originalDraft===document.querySelector('#draft')&&document.querySelector('#draft').value==='untouched'`), true, 'Cleanup preserves original native nodes and draft.');
  await run(`Object.defineProperty(Storage.prototype,'getItem',{configurable:true,value(){throw Error('blocked')}});Object.defineProperty(Storage.prototype,'setItem',{configurable:true,value(){throw Error('blocked')}});(${configureCombatShortcuts.toString()})(true,'en')`);
  await click('[data-ff-dice-add]'); await click('#check'); await click('[data-ff-dice-selection-confirm]');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-favorite-tile]').length`), 1, 'Blocked storage keeps the confirmed selection in memory.');
  await run(`window.__friendsFablesDesktopCombatShortcuts.dispose();document.querySelector('[data-ff-combat-docked]').replaceWith(document.querySelector('[data-ff-combat-docked]').cloneNode(true));(${configureCombatShortcuts.toString()})(true,'en')`);
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-navigation]').length`), 1, 'Remount creates only one owned navigation.');
  await run(`window.__friendsFablesDesktopCombatShortcuts.dispose()`);
  console.log('Combat favorites fixture passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  clearTimeout(timeout);
  window?.close();
  if (process.exitCode) app.exit(process.exitCode);
  else app.quit();
});
