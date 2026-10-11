// Coordinator-scheduled Electron fixture; syntax-check before launch.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
const root = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { DEFAULT_APPEARANCE } = require(path.join(root, 'dist/appearance/themes'));
const { combatPanelAppearanceCss } = require(path.join(root, 'dist/combat/combat-panel-style'));
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
  testSession.protocol.handle('https', () => new Response(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0}.p-6{box-sizing:border-box;padding:12px}.p-4{box-sizing:border-box;padding:8px}
    [data-ff-combat-docked]{box-sizing:border-box;padding-right:11px}/* Captured 388px panel has a 377px client area. */
    .space-y-6>:not([hidden])~:not([hidden]){margin-block-start:24px}.space-y-3>:not([hidden])~:not([hidden]){margin-block-start:12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:8px}
    h3{margin:0}.native-tile{box-sizing:border-box;width:100%;min-width:0;padding:8px}.text-\\[\\#C5A766\\]{color:rgb(197,167,102)}
    .font-semibold{font-weight:600}.text-sm{font-size:14px;line-height:20px}.uppercase{text-transform:uppercase}.tracking-wider{letter-spacing:.7px}.px-1{padding-left:4px;padding-right:4px}
  </style></head><body>
    <div data-ff-combat-docked data-ff-combat-panel-mode="skills"><h2>Dice</h2><div data-ff-combat-shortcuts-slot></div>
      <div id="native-list" class="p-6 h-full"><div class="w-full flex-1 flex flex-col justify-start items-start overflow-hidden"><div id="native-content" class="flex-1 w-full overflow-y-auto p-4 space-y-6">
        <div class="space-y-3"><h3 class="text-[#C5A766] font-semibold text-sm uppercase tracking-wider px-1">Проверки характеристик</h3><div id="check-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <button id="check" class="native-tile"><div><svg id="d20" class="lucide" width="24" height="24" viewBox="0 0 24 24"><path id="icon-path"/></svg></div><span>Проверка силы</span></button><button id="dex-check" class="native-tile"><div><svg class="lucide" width="24" height="24" viewBox="0 0 24 24"></svg></div><span>Проверка ловкости</span></button>
        </div></div>
        <div class="space-y-3"><h3 class="text-[#C5A766] font-semibold text-sm uppercase tracking-wider px-1">Навыки</h3><div id="skill-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"><button id="skill" class="native-tile"><div><svg class="lucide" width="24" height="24" viewBox="0 0 24 24"></svg></div><span>Проверка акробатики</span></button></div></div>
        <div class="space-y-3"><h3 class="text-[#C5A766] font-semibold text-sm uppercase tracking-wider px-1">Спасброски</h3><div id="save-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"><button id="save" class="native-tile"><div><svg class="lucide" width="24" height="24" viewBox="0 0 24 24"></svg></div><span>Спасбросок силы</span></button></div></div>
        <button id="custom">Custom roll</button>
      </div></div></div>
      <form id="detail" hidden><button type="button" id="back">Back</button><input id="draft" value="untouched"><button type="submit">Roll</button></form>
    </div>
    <script>localStorage.clear();window.rolls=0;window.selections=0;window.pointerSelections=0;
      window.originalCheck=document.querySelector('#check');window.originalDraft=document.querySelector('#draft');
      document.querySelector('#detail').onsubmit=event=>{event.preventDefault();window.rolls++};
      for(const id of ['check','dex-check','save','skill']){
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
  const assertHeadingPaint = async label => {
    const rect = await run(`(()=>{const h=document.querySelector('[data-ff-dice-favorite-group] h3');h.scrollIntoView({block:'center'});return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const r=h.getBoundingClientRect();resolve({x:Math.ceil(r.x),y:Math.ceil(r.y),width:Math.floor(r.width)-1,height:Math.floor(r.height)-1})})))})()`);
    assert.ok(rect.width > 0 && rect.height > 0, label + ' heading has capture geometry');
    const image = await contents.capturePage(rect), pixels = image.toBitmap(), colors = new Map();
    for (let i = 0; i < pixels.length; i += 4) { const color = pixels.readUInt32LE(i); colors.set(color, (colors.get(color) || 0) + 1); }
    assert.ok(pixels.length / 4 - Math.max(...colors.values()) > 20, label + ' heading crop paints glyph pixels against its uniform background');
  };
  await run(`(${configureCombatShortcuts.toString()})(true, 'ru')`);
  await wait(contents, `!!document.querySelector('[data-ff-dice-favorites]')`);
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorites]').hidden`), false, 'Favorites is the initial view; the former manager cannot satisfy this.');
  assert.equal(await run(`document.querySelector('[data-ff-dice-add]').textContent`), 'Добавить');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-favorite-group]').length`), 0, 'Empty favorites do not show empty category headings.');
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorites] p').hidden`), false, 'Empty favorites explain that nothing is selected.');
  assert.equal(await run(`document.querySelector('[data-ff-shortcut-manager],[data-ff-shortcut-tray],[data-ff-native-favorites]')`), null);
  assert.deepEqual(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].filter(x=>!x.hidden).map(x=>x.getAttribute('aria-label'))`), ['Все проверки', 'Избранное']);
  assert.equal(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].filter(x=>!x.hidden).every(x=>x.textContent.trim()===''&&x.title===x.getAttribute('aria-label')&&x.querySelector('svg[aria-hidden="true"]'))`), true, 'Visible top navigation is icon-only with Russian accessible names and tooltips.');
  await click('[data-ff-dice-standard]');
  assert.equal(await run(`document.querySelector('#native-content').hasAttribute('data-ff-dice-native-hidden')`), false, 'Standard dice restores the actual native content branch.');
  await click('[data-ff-dice-favorites-nav]'); await click('[data-ff-dice-add]');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-selection-checkbox]').length`), 4, 'Only real native canonical tiles get checkboxes.');
  await run(`document.querySelector('#check').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));document.querySelector('#check').click()`);
  assert.equal(await run('window.pointerSelections+window.selections'), 0, 'Selection blocks native pointer/click handlers.');
  assert.equal(await run(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), null, 'Draft changes do not persist.');
  assert.equal(await run(`document.querySelector('#check input').checked`), true);
  window.show(); window.focus();
  await wait(contents, `document.visibilityState==='visible'&&document.hasFocus()`);
  await run(`document.querySelector('#save').dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}))`);
  await run(`document.querySelector('#dex-check').dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}))`);
  await run(`document.querySelector('#skill input').focus();document.querySelector('#skill input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))`);
  assert.equal(await run(`document.activeElement===document.querySelector('#skill input')`), true, 'Checkbox selection retains keyboard focus.');
  assert.equal(await run(`(()=>{const b=document.querySelector('[data-ff-dice-selection-confirm]'),s=b.querySelector('svg');return b.getAttribute('aria-label')==='Подтвердить'&&b.title==='Подтвердить'&&b.textContent.trim()===''&&b.tabIndex===0&&s?.getAttribute('aria-hidden')==='true'&&s?.getAttribute('focusable')==='false'&&s?.getAttribute('viewBox')==='0 0 24 24'&&getComputedStyle(b).width==='40px'&&getComputedStyle(b).height==='40px'&&getComputedStyle(s).width==='20px'&&getComputedStyle(s).height==='20px'})()`), true, 'Russian confirm is icon-only, keyboard-focusable, accessible, decorative, and has a 40px target with a centered 20px icon.');
  await run(`document.querySelector('[data-ff-dice-selection-confirm]').focus()`);
  assert.equal(await run(`document.activeElement===document.querySelector('[data-ff-dice-selection-confirm]')&&!document.querySelector('[data-ff-dice-selection-confirm]').hidden`), true, 'Confirm remains focusable and visible during selection.');
  await click('[data-ff-dice-selection-cancel]');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-favorite-tile]').length`), 0, 'Cancel discards the entire draft.');
  await click('[data-ff-dice-add]'); await click('#check'); await click('#dex-check input'); await click('#skill input'); await click('#save input');
  await click('[data-ff-dice-selection-confirm]');
  assert.equal(await run(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), '["ability.strength","ability.dexterity","skill.acrobatics","save.strength"]');
  assert.equal(await run(`document.querySelector('[data-ff-dice-add]').textContent`), 'Добавить ещё');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-selection-checkbox]').length`), 0);
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorite-tile]').className`), 'native-tile');
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorite-tile] svg')!==null`), true, 'Favorite tile retains the native icon.');
  assert.equal(await run(`getComputedStyle(document.querySelector('[data-ff-dice-favorite-tile] svg')).width`), '24px', 'Fixture native dice art keeps its captured 24px dimensions.');
  assert.equal(await run(`document.querySelectorAll('#d20').length`), 1, 'Cloned visuals never duplicate native IDs.');
  assert.equal(await run(`!!document.querySelector('[data-ff-dice-favorite-tile] > div > svg')`), true, 'Cloned native icon wrappers retain normal tile CSS structure.');
  assert.deepEqual(await run(`Array.from(document.querySelectorAll('[data-ff-dice-favorite-group]'),group=>({name:group.dataset.ffDiceFavoriteGroup,title:group.querySelector('h3')?.textContent,items:[...group.querySelectorAll('[data-ff-dice-favorite-tile]')].map(tile=>tile.dataset.ffDiceFavoriteTile)}))`), [
    { name: 'check', title: 'Проверки характеристик', items: ['ability.strength', 'ability.dexterity'] },
    { name: 'skill', title: 'Навыки', items: ['skill.acrobatics'] },
    { name: 'save', title: 'Спасброски', items: ['save.strength'] },
  ], 'Only populated favorites render, in native standard-dice category order.');
  assert.equal(await run(`(()=>{const h=document.querySelector('[data-ff-dice-favorite-group] h3');return getComputedStyle(h).textTransform==='uppercase'&&getComputedStyle(h).color!=='rgb(255, 255, 255)'})()`), true, 'Favorite group headings use the standard gold-accent heading treatment.');
  for (const customSpacing of [false,true]) for (const width of [388, 280]) {
    await run(`(()=>{let style=document.getElementById('appearance-spacing');if(!style){style=document.createElement('style');style.id='appearance-spacing';document.head.append(style)}style.textContent=${JSON.stringify(customSpacing ? combatPanelAppearanceCss({...DEFAULT_APPEARANCE.combatPanel,enabled:true,customizeSpacing:true,tileGap:10,contentPadding:24}) : '')};})()`);

    await run(`document.querySelector('[data-ff-combat-docked]').style.width='${width}px'`);
    await click('[data-ff-dice-standard]');
    const standardGeometry = await run(`(()=>{const dock=document.querySelector('[data-ff-combat-docked]'),groups=[...document.querySelectorAll('#native-content>.space-y-3')],group=groups[0],heading=group.querySelector('h3'),grid=group.querySelector('.grid'),cards=[...grid.querySelectorAll('button')],rect=grid.getBoundingClientRect(),h=heading.getBoundingClientRect(),category=groups[1].getBoundingClientRect();return {headingTop:h.top-dock.getBoundingClientRect().top,gridTop:rect.top-dock.getBoundingClientRect().top,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,gridLeft:rect.left-dock.getBoundingClientRect().left,tileWidth:cards[0].getBoundingClientRect().width,headingGridGap:rect.top-h.bottom,categoryGap:category.top-groups[0].getBoundingClientRect().bottom,headingStyle:(()=>{const s=getComputedStyle(heading);return {font:s.font,fontWeight:s.fontWeight,color:s.color,letterSpacing:s.letterSpacing,padding:s.padding}})()}})()`);
    await click('[data-ff-dice-favorites-nav]');
    const geometry = await run(`(()=>{const dock=document.querySelector('[data-ff-combat-docked]'),groups=[...document.querySelectorAll('[data-ff-dice-favorite-group]')],group=groups[0],heading=group.querySelector('h3'),grid=group.querySelector('[data-ff-dice-favorite-group-tiles]'),cards=[...grid.querySelectorAll('[data-ff-dice-favorite-tile]')],rect=grid.getBoundingClientRect(),h=heading.getBoundingClientRect(),category=groups[1].getBoundingClientRect(),box=document.querySelector('[data-ff-dice-favorite-tiles]').getBoundingClientRect();return {headingTop:h.top-dock.getBoundingClientRect().top,gridTop:rect.top-dock.getBoundingClientRect().top,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,gridLeft:rect.left-dock.getBoundingClientRect().left,tileWidth:cards[0].getBoundingClientRect().width,headingGridGap:rect.top-h.bottom,categoryGap:category.top-groups[0].getBoundingClientRect().bottom,headingStyle:(()=>{const s=getComputedStyle(heading);return {font:s.font,fontWeight:s.fontWeight,color:s.color,letterSpacing:s.letterSpacing,padding:s.padding}})(),overflow:dock.scrollWidth>dock.clientWidth,within:cards.every(node=>{const r=node.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right}),sameRow:Math.abs(cards[0].getBoundingClientRect().top-cards[1].getBoundingClientRect().top)<1,clipped:cards.some(node=>node.scrollWidth>node.clientWidth||node.scrollHeight>node.clientHeight)}})()`);
    assert.equal(geometry.columns, width === 388 ? 2 : 1, `${width}px favorites use a compact responsive grid: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.overflow, false, `${width}px favorites stay within the panel: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.within, true, `${width}px favorite tiles remain inside their group grid: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.clipped, false, `${width}px favorite labels and icons are not clipped: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.columns, standardGeometry.columns, `${width}px favorite and standard dice use the same column count.`);
    assert.ok(Math.abs(geometry.headingTop-standardGeometry.headingTop)<1, `${width}px favorite heading starts at the same vertical position as standard dice: ${JSON.stringify({geometry,standardGeometry})}`);
    assert.ok(Math.abs(geometry.gridTop-standardGeometry.gridTop)<1, `${width}px favorite grid starts at the same vertical position as standard dice: ${JSON.stringify({geometry,standardGeometry})}`);
    assert.ok(Math.abs(geometry.gridLeft-standardGeometry.gridLeft)<1, `${width}px favorite and standard dice share the same left inset: ${JSON.stringify({geometry,standardGeometry})}`);
    assert.ok(Math.abs(geometry.tileWidth-standardGeometry.tileWidth)<1, `${width}px favorite and standard tiles have equal widths: ${JSON.stringify({geometry,standardGeometry})}`);
    assert.ok(Math.abs(geometry.headingGridGap-standardGeometry.headingGridGap)<1, `${width}px favorite headings match standard heading-to-grid spacing: ${JSON.stringify({geometry,standardGeometry})}`);
    assert.ok(Math.abs(geometry.categoryGap-standardGeometry.categoryGap)<1, `${width}px favorite categories match standard category spacing: ${JSON.stringify({geometry,standardGeometry})}`);
    assert.deepEqual(geometry.headingStyle, standardGeometry.headingStyle, `${width}px favorite headings reuse the standard native heading treatment.`);
    if(width===388)assert.equal(geometry.sameRow,true,'Both ability checks appear in one standard-dice style row.');
  }
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorites]').previousElementSibling===document.querySelector('#native-content') && document.querySelector('[data-ff-dice-favorites]').hasAttribute('data-ff-dice-favorites-inline')`),true,'Favorites occupies the actual native list layout slot.');
  await run(`document.getElementById('appearance-spacing').textContent='';document.querySelector('[data-ff-combat-docked]').style.removeProperty('width')`);
  await run(`window.ownedHeading=document.querySelector('[data-ff-dice-favorite-group] h3');window.ownedFavorite=document.querySelector('[data-ff-dice-favorite-tile="ability.strength"]');const old=document.querySelector('#native-list');const replacement=old.cloneNode(true);replacement.querySelectorAll('[data-ff-dice-favorites],[data-ff-combat-shortcuts],[data-ff-dice-selection-confirm]').forEach(node=>node.remove());replacement.removeAttribute('data-ff-dice-native-hidden');replacement.querySelectorAll('[data-ff-dice-native-hidden]').forEach(node=>node.removeAttribute('data-ff-dice-native-hidden'));old.replaceWith(replacement);for(const id of ['check','dex-check','save','skill'])document.getElementById(id).onclick=()=>{window.selections++;document.querySelector('#native-list').hidden=true;document.querySelector('#detail').hidden=false};window.originalCheck=document.querySelector('#check');true`);
  await wait(contents, `document.querySelector('#native-content').hasAttribute('data-ff-dice-native-hidden')`);
  assert.equal(await run(`document.querySelector('#native-list').hasAttribute('data-ff-dice-native-hidden')`), false, 'Favorites hides the deepest common native branch after list remount.');
  assert.deepEqual(await run(`[...document.querySelectorAll('[data-ff-dice-native-hidden]')].map(node=>node.id)`), ['native-content'], 'Remount cleanup removes stale hidden markers before Favorites reapplies ownership.');
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-favorites]').length`),1,'React-shaped native remount does not duplicate the owned Favorites section.');
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorites]').previousElementSibling===document.querySelector('#native-content')`),true,'Native remount moves the existing Favorites section to the replacement list slot.');
  assert.equal(await run(`window.ownedFavorite===document.querySelector('[data-ff-dice-favorite-tile="ability.strength"]')`), true, 'Identical native list remount preserves the owned favorite button.');
  assert.equal(await run(`window.ownedHeading!==document.querySelector('[data-ff-dice-favorite-group] h3')`), true, 'Native list remount refreshes only the owned heading element for painting.');
  await assertHeadingPaint('Native list remount');
  await run(`window.stableHeading=document.querySelector('[data-ff-dice-favorite-group] h3');window.stableText=stableHeading.firstChild;window.__friendsFablesDesktopCombatShortcuts.update('ru');document.body.append(document.createElement('aside'));true`);
  await run(`new Promise(resolve=>setTimeout(resolve,30))`);
  assert.equal(await run(`stableHeading===document.querySelector('[data-ff-dice-favorite-group] h3')&&stableText===stableHeading.firstChild`), true, 'Unchanged scans preserve the heading and its text node.');
  await click('[data-ff-dice-favorite-tile="ability.strength"]');
  await wait(contents, `document.querySelector('[data-ff-dice-navigation]').hidden`);
  assert.equal(await run('window.selections'), 1, 'Favorite opens its original native check once.');
  assert.equal(await run('window.rolls'), 0);
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorites]').hidden && document.querySelector('[data-ff-dice-selection-confirm]').hidden`), true, 'Detail hides all owned dice UI.');
  await click('#back'); await wait(contents, `!document.querySelector('[data-ff-dice-favorites]').hidden`);
  await assertHeadingPaint('Native detail Back');
  await click('[data-ff-dice-standard]');
  assert.equal(await run(`!document.querySelector('#native-content').hasAttribute('data-ff-dice-native-hidden')&&getComputedStyle(document.querySelector('#native-content')).display!=='none'`), true, 'Standard view restores the native content branch after remount.');
  await click('#save');
  await wait(contents, `document.querySelector('[data-ff-dice-navigation]').hidden`);
  assert.equal(await run('window.selections'), 2, 'Standard view keeps the original native click handler.');
  await click('#back'); await wait(contents, `!document.querySelector('[data-ff-dice-navigation]').hidden`);
  await click('[data-ff-dice-favorites-nav]');
  await run(`window.__friendsFablesDesktopCombatShortcuts.update('en')`);
  assert.deepEqual(await run(`[...document.querySelectorAll('[data-ff-dice-favorite-group] h3')].map(x=>x.textContent)`), ['Ability Checks', 'Skills', 'Saving Throws']);
  assert.deepEqual(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].filter(x=>!x.hidden).map(x=>x.getAttribute('aria-label'))`), ['All checks', 'Favorites']);
  assert.equal(await run(`[...document.querySelector('[data-ff-dice-navigation]').querySelectorAll('button')].filter(x=>!x.hidden).every(x=>x.title===x.getAttribute('aria-label'))`), true, 'Visible navigation tooltips follow the English locale.');
  await click('[data-ff-dice-add]');
  assert.equal(await run(`(()=>{const b=document.querySelector('[data-ff-dice-selection-confirm]');return b.getAttribute('aria-label')==='Confirm'&&b.title==='Confirm'&&b.textContent.trim()===''&&!!b.querySelector('svg[aria-hidden="true"][focusable="false"]')})()`), true, 'English confirm keeps a localized accessible name and tooltip with decorative icon only.');
  await click('[data-ff-dice-selection-cancel]');
  assert.equal(await run(`document.querySelector('[data-ff-dice-favorite-tile]').textContent`), 'Strength Check');
  const savedPins = await run(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`);
  await run(`window.__friendsFablesDesktopCombatShortcuts.dispose();localStorage.setItem('ff-desktop-combat-pins-v1:campaign','["save.strength"]');(${configureCombatShortcuts.toString()})(true,'en')`);
  await wait(contents, `document.querySelectorAll('[data-ff-dice-favorite-group]').length===1`);
  assert.deepEqual(await run(`[...document.querySelectorAll('[data-ff-dice-favorite-group]')].map(x=>x.dataset.ffDiceFavoriteGroup)`), ['save'], 'Save-only favorites render only the later group.');
  await click('[data-ff-dice-add]'); await click('#dex-check input'); await click('[data-ff-dice-selection-confirm]');
  assert.equal(await run(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), '["ability.dexterity","save.strength"]', 'Adding an earlier check preserves the save.');
  assert.deepEqual(await run(`[...document.querySelectorAll('[data-ff-dice-favorite-group]')].map(x=>x.dataset.ffDiceFavoriteGroup)`), ['check', 'save'], 'A newly added earlier category is inserted before the existing save group.');
  await click('[data-ff-dice-add]'); await click('#check input'); await click('[data-ff-dice-selection-confirm]');
  assert.deepEqual(await run(`[...document.querySelectorAll('[data-ff-dice-favorite-group="check"] [data-ff-dice-favorite-tile]')].map(x=>x.dataset.ffDiceFavoriteTile)`), ['ability.strength', 'ability.dexterity'], 'A newly added earlier check is inserted before the existing check tile.');
  assert.equal(await run(`localStorage.getItem('ff-desktop-combat-pins-v1:campaign')`), '["ability.strength","ability.dexterity","save.strength"]', 'The saved selection remains in canonical native item order.');
  await run(`window.__friendsFablesDesktopCombatShortcuts.dispose();localStorage.setItem('ff-desktop-combat-pins-v1:campaign',${JSON.stringify(savedPins)});(${configureCombatShortcuts.toString()})(true,'en')`);
  await wait(contents, `document.querySelectorAll('[data-ff-dice-favorite-tile]').length===4`);
  await run(`document.querySelector('#skill').setAttribute('aria-disabled','true')`);
  await wait(contents, `document.querySelector('[data-ff-dice-favorite-tile="skill.acrobatics"]').disabled`);
  await click('[data-ff-dice-favorite-tile="skill.acrobatics"]'); assert.equal(await run('window.selections'), 2);
  await run(`document.querySelector('[data-ff-combat-docked]').dataset.ffCombatPanelMode='actions'`);
  await wait(contents, `document.querySelector('[data-ff-dice-navigation]').hidden`);
  assert.equal(await run(`!document.querySelector('#native-content').hasAttribute('data-ff-dice-native-hidden')&&getComputedStyle(document.querySelector('#native-content')).display!=='none'`), true, 'Actions/spell targeting restores the native content branch.');
  await run(`document.querySelector('[data-ff-combat-docked]').removeAttribute('data-ff-combat-panel-mode')`);
  await wait(contents, `document.querySelector('[data-ff-dice-favorites]').hidden`);
  await run(`document.querySelector('[data-ff-combat-docked]').dataset.ffCombatPanelMode='skills';history.pushState({},'', '/other/play');document.body.append(document.createElement('aside'));true`);
  await wait(contents, `document.querySelectorAll('[data-ff-dice-favorite-tile]').length===0`);
  await run(`localStorage.setItem('ff-desktop-combat-pins-v1:other','broken');window.__friendsFablesDesktopCombatShortcuts.dispose();(${configureCombatShortcuts.toString()})(true,'en')`);
  assert.equal(await run(`document.querySelectorAll('[data-ff-dice-favorite-tile]').length`), 0, 'Malformed storage is safe.');
  await run(`history.pushState({},'', '/campaign/play');document.body.append(document.createElement('aside'));true`);
  await wait(contents, `document.querySelectorAll('[data-ff-dice-favorite-tile]').length===4`);
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
