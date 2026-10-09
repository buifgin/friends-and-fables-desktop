const assert = require('node:assert/strict');

// WM_NCHITTEST must come from another process: sending synchronously on Electron's
// main thread would block the same event loop that needs to answer the message.
function windowsHitTestScript(request) {
  const payload = Buffer.from(JSON.stringify(request)).toString('base64');
  return `$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ToolbarHitTest {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool GetClientRect(IntPtr hwnd, out Rect rect);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool ClientToScreen(IntPtr hwnd, ref Point point);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr hwnd, uint message, UIntPtr wparam, IntPtr lparam, uint flags, uint timeout, out UIntPtr result);
}
'@
$request = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json
$hwnd = [IntPtr]::new([long]::Parse($request.hwnd))
[uint32]$owner = 0
[void][ToolbarHitTest]::GetWindowThreadProcessId($hwnd, [ref]$owner)
if ($owner -ne $request.pid) { throw 'Hit-test HWND is not owned by the fixture process.' }
# Per-monitor awareness prevents helper DPI virtualization; Electron coordinates
# are DIP, while GetClientRect/ClientToScreen now supply physical pixels.
$previous = [ToolbarHitTest]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
if ($previous -eq [IntPtr]::Zero) { throw 'Cannot enable physical-coordinate DPI awareness.' }
try {
  $rect = New-Object ToolbarHitTest+Rect
  if (![ToolbarHitTest]::GetClientRect($hwnd, [ref]$rect)) { throw 'GetClientRect failed.' }
  $scale = ($rect.Right - $rect.Left) / [double]$request.width
  if ($scale -le 0) { throw 'Invalid client scale.' }
  $rows = @(foreach ($sample in $request.samples) {
    $point = New-Object ToolbarHitTest+Point
    $point.X = [int][Math]::Round($sample.x * $scale)
    $point.Y = [int][Math]::Round($sample.y * $scale)
    if (![ToolbarHitTest]::ClientToScreen($hwnd, [ref]$point)) { throw 'ClientToScreen failed.' }
    if ($point.X -lt -32768 -or $point.X -gt 32767 -or $point.Y -lt -32768 -or $point.Y -gt 32767) { throw 'Screen point exceeds WM_NCHITTEST signed coordinate range.' }
    $packed = [int](($point.Y -band 65535) -shl 16) -bor ($point.X -band 65535)
    [UIntPtr]$result = [UIntPtr]::Zero
    # SMTO_BLOCK | SMTO_ABORTIFHUNG, 200ms per point; never move/focus the cursor/window.
    $sent = [ToolbarHitTest]::SendMessageTimeout($hwnd, 0x84, [UIntPtr]::Zero, [IntPtr]::new($packed), 3, 200, [ref]$result)
    if ($sent -eq [IntPtr]::Zero) { throw "WM_NCHITTEST failed or timed out: $($sample.name)" }
    @{ name = $sample.name; hit = [int]$result.ToUInt64(); screenX = $point.X; screenY = $point.Y }
  })
  ConvertTo-Json -InputObject $rows -Compress
} finally { [void][ToolbarHitTest]::SetThreadDpiAwarenessContext($previous) }
`;
}
function readWindowsHitTests(request, execFile = require('node:child_process').execFile) {
  const encoded = Buffer.from(windowsHitTestScript(request), 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { timeout: 6000, windowsHide: true, maxBuffer: 64 * 1024 }, (error, stdout, stderr) => {
        if (error) { reject(new Error(`Windows toolbar hit-test helper failed: ${error.message}\n${stderr || ''}`)); return; }
        try { resolve(JSON.parse(stdout.trim())); } catch (error) { reject(new Error(`Invalid Windows hit-test output: ${error.message}\n${stdout}\n${stderr}`)); }
      });
  });
}
function assertWindowsHitTests(samples, rows, label) {
  assert(Array.isArray(rows), `${label}: helper returns a sample array.`);
  assert.equal(rows.length, samples.length, `${label}: every native point was sampled.`);
  samples.forEach((sample, index) => {
    assert.equal(rows[index].name, sample.name, `${label}: sample ordering is retained.`);
    assert.equal(rows[index].hit, sample.expected, `${label}: ${sample.name} must return ${sample.expected === 1 ? 'HTCLIENT' : 'HTCAPTION'}; native evidence ${JSON.stringify(rows[index])}`);
  });
}
if (process.argv.includes('--windows-hit-test-unit')) {
  (async () => {
    const samples = [{ name: 'icon', x: 100, y: 16, expected: 1 }, { name: 'blank gap', x: 700, y: 16, expected: 2 }];
    const request = { hwnd: '1234', pid: 123, width: 1100, samples };
    const rows = samples.map(sample => ({ name: sample.name, hit: sample.expected }));
    assertWindowsHitTests(samples, rows, 'fixed');
    assert.throws(() => assertWindowsHitTests(samples, [{ name: 'icon', hit: 2 }, rows[1]], 'baseline'), /icon must return HTCLIENT/);
    assert.throws(() => assertWindowsHitTests(samples, [rows[0], { name: 'blank gap', hit: 1 }], 'lost drag'), /blank gap must return HTCAPTION/);
    assert.throws(() => assertWindowsHitTests(samples, [rows[0]], 'missing'), /every native point/);
    let callback;
    const pending = readWindowsHitTests(request, (file, args, options, done) => {
      assert.equal(file, 'powershell.exe'); assert.equal(options.timeout, 6000); assert.equal(options.windowsHide, true);
      const script = Buffer.from(args.at(-1), 'base64').toString('utf16le');
      assert.equal(script, windowsHitTestScript(request));
      const payload = script.match(/FromBase64String\('([^']+)'\)/)[1];
      assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64').toString()), request);
      callback = done;
    });
    // The caller regains control before the helper completes, leaving Electron responsive.
    callback(null, JSON.stringify(rows), ''); assert.deepEqual(await pending, rows);
    await assert.rejects(readWindowsHitTests(request, (_file, _args, _options, done) => done(new Error('timed out'), '', 'owned helper')), /timed out/);
    await assert.rejects(readWindowsHitTests(request, (_file, _args, _options, done) => done(null, 'bad json', '')), /Invalid Windows hit-test output/);
    console.log('PASS: Windows hit-test client/caption assertions, baseline rejection, asynchronous helper encoding, timeout and invalid-output failures.');
  })().catch(error => { console.error(error); process.exitCode = 1; });
  return;
}

// Also runnable without Electron: node tests/appearance/appearance-panel-smoke.cjs --window-controls-unit
function checkWindowControlsState() {
  const { readFileSync, existsSync } = require('node:fs');
  const { EventEmitter } = require('node:events');
  const vm = require('node:vm');
  const root = process.env.FABLES_TEST_APP_ROOT || require('node:path').join(__dirname, '..', '..');
  const sourcePath = require('node:path').join(root, 'src/shell/window-controls.ts');
  const code = process.argv.includes('--window-controls-unit') && existsSync(sourcePath)
    ? require('esbuild').transformSync(readFileSync(sourcePath, 'utf8'), { loader: 'ts', format: 'cjs' }).code
    : readFileSync(require('node:path').join(root, 'dist/shell/window-controls.js'), 'utf8');
  const handlers = new Map(), updates = [];
  class Contents extends EventEmitter {
    mainFrame = { origin: 'fables-desktop://settings', url: 'fables-desktop://settings/window-controls.html' };
    isDestroyed() { return false; }
    setWindowOpenHandler() {}
    send(channel, state) { updates.push({ channel, state }); }
    loadURL() { return { then: () => ({ catch() {} }) }; }
  }
  class View {
    webContents = new Contents();
    setBackgroundColor() {}
  }
  const exported = { exports: {} };
  vm.runInNewContext(code, { module: exported, exports: exported.exports, __dirname: root, console, require(id) {
    if (id === 'electron') return { app: {}, WebContentsView: View, ipcMain: { handle: (name, callback) => handlers.set(name, callback) } };
    if (id === './window-minimizer') return { WindowMinimizer: class { sync() {} } };
    if (id === './window-shortcuts') return { configureFullscreenShortcuts() {} };
    return require(id);
  } });
  const host = new EventEmitter();
  let fullscreen = false, asynchronous = false;
  Object.assign(host, { contentView: { addChildView() {} }, isDestroyed: () => false,
    isFullScreen: () => fullscreen, setFullScreen(value) { if (!asynchronous) fullscreen = value; } });
  const controls = new exported.exports.WindowControls(host, { getSettings: () => ({}), getLocale: () => 'en' });
  const sender = controls.view.webContents, event = { sender, senderFrame: sender.mainFrame };
  const action = handlers.get('window-controls:action');
  for (const expected of [true, false]) {
    updates.length = 0;
    action(event, 'fullscreen');
    assert.equal(fullscreen, expected);
    assert.equal(updates.at(-1)?.state.fullscreen, expected, 'Toolbar publishes actual native state even without a fullscreen event.');
  }
  asynchronous = true;
  action(event, 'fullscreen');
  assert.equal(updates.at(-1).state.fullscreen, false, 'An asynchronous transition must not publish an optimistic fullscreen state.');
  for (const [name, expected] of [['enter-full-screen', true], ['leave-full-screen', false]]) {
    fullscreen = expected;
    host.emit(name);
    assert.equal(updates.at(-1).state.fullscreen, expected, 'Native events still reconcile asynchronous and system transitions.');
  }
  assert.throws(() => action({ ...event, senderFrame: {} }, 'fullscreen'), /only in the app toolbar/);
  assert.throws(() => action(event, 'delete'), /Invalid window action/);

  const renderer = readFileSync(require('node:path').join(root, 'assets/shell/window-controls.js'), 'utf8');
  function rendererCase(pushFirst) {
    let bootstrap, update;
    const buttons = Object.fromEntries(['fullscreen', 'minimize', 'quit'].map(id => [id, { attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; }, addEventListener() {} }]));
    vm.runInNewContext(renderer, { console, window: { settingsTheme: { apply() {} }, windowControls: {
      action() {}, onChange(callback) { update = callback; }, get() { return { then(callback) { bootstrap = callback; return { catch() {} }; } }; },
    } }, document: { documentElement: {}, querySelector: () => ({ setAttribute() {} }), getElementById: id => buttons[id] } });
    const state = value => ({ settings: {}, locale: 'en', fullscreen: value });
    if (pushFirst) update(state(true));
    bootstrap(state(false));
    assert.equal(buttons.fullscreen.attributes['aria-pressed'], String(pushFirst), 'A stale bootstrap response cannot replace a newer pushed native state.');
    update(state(true)); update(state(false));
    assert.equal(buttons.fullscreen.attributes['aria-pressed'], 'false');
  }
  rendererCase(false); rendererCase(true);
}
checkWindowControlsState();
if (process.argv.includes('--window-controls-unit')) {
  console.log('PASS: fullscreen action reconciliation, native event synchronization, trusted IPC and renderer bootstrap ordering.');
  process.exit(0);
}
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu, screen, session, WebContentsView } = require('electron');
const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '..', '..');
const { AppearanceManager, registerAppearanceScheme } = require(path.join(appRoot, 'dist/appearance/appearance'));
const { TranslationManager } = require(path.join(appRoot, 'dist/translation/translation'));
const { floatSettingsWindow } = require(path.join(appRoot, 'dist/shell/floating-appearance'));
const {localizeMenu}=require(path.join(appRoot,'dist/shell/app-menu-locale'));
const { LinuxMenuBar, MENU_URL } = require(path.join(appRoot, 'dist/shell/linux-menu'));
registerAppearanceScheme(); app.on('window-all-closed', () => {});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async check => { for (let i = 0; i < 150; i++) { if (await check()) return; await sleep(25); } throw Error('Condition timed out.'); };
let profile, translation;
const timer = setTimeout(() => { console.error('Appearance panel test timed out.'); app.exit(1); }, 40000);

(async () => {
  profile = process.env.FABLES_TEST_PROFILE_DIR || await mkdtemp(path.join(os.tmpdir(), 'fables-panel-test-')); app.setPath('userData', profile); await app.whenReady();
  const manager = new AppearanceManager(); await manager.initialize();
  // This fixture exercises Appearance only; use an inert owned toolbar state.
  ipcMain.handle('music:toolbar-get', event => {
    assert.equal(event.senderFrame, event.sender.mainFrame);
    assert.equal(event.senderFrame.url, 'fables-desktop://settings/appearance-button.html');
    return { paused:true,available:false,next:false,loop:false,volume:.5,muted:false,title:'',open:false,locale:manager.getLocale() };
  });
  translation = new TranslationManager(); await translation.initialize();
  let bar; let chosen=0;
  const template=['File','Edit','Appearance','Translation','Music','View','Window'].map(label=>({id:label.toLowerCase(),label,submenu:[{label:label==='Appearance'?'Customize Appearance…':'Copy',click(){chosen++;}}]}));
  template[2].submenu.push({id:'sp-settings',label:'Saved /sp Instructions…',accelerator:'CmdOrCtrl+Shift+P',click(){chosen++;}});
  template[3].submenu=[{id:'translate-ru',label:'Translate into Russian',type:'checkbox',checked:false}];
  template[4].submenu=[{id:'music-player',label:'Music Player…',accelerator:'CmdOrCtrl+Shift+M',click(){chosen++;}}];
  translation.onChange = settings => {const locale=settings.enabled&&!settings.showOriginal?'ru':'en';manager.setLocale(locale);const translated=localizeMenu(template,locale);translated[3].submenu[0].checked=settings.enabled;bar?.setMenu(Menu.buildFromTemplate(translated),locale);};
  const host = new BrowserWindow({ show: false, frame: process.platform !== 'win32', useContentSize: process.platform === 'win32', type: process.platform==='linux'?'dialog':undefined, width: 960, height: 680, webPreferences: {
    partition: 'fables-appearance', preload: path.join(appRoot, 'dist/shell/menu-preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false,
  } });
  const websiteSession = session.fromPartition('panel-test');
  websiteSession.protocol.handle('https', () => new Response('<!doctype html><html><meta charset="utf-8"><style>body{background:hsl(var(--background,195 86% 3%));color:hsl(var(--foreground,0 0% 100%))}</style><body><h1>Sample game</h1><input value="My draft stays unchanged."></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  const website = new WebContentsView({ webPreferences: { session: websiteSession, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  host.contentView.addChildView(website); manager.attach(website.webContents);
  const dock = manager.attachMain(host, website);
  const menu = Menu.buildFromTemplate(template);
  bar = new LinuxMenuBar(host, website, menu, inset => dock.setInset(inset), () => dock.raiseControls()); bar.setBlack(true);
  await host.loadURL(MENU_URL); await website.webContents.loadURL('https://play.fables.gg/');
  const separate = await manager.open(host); separate.hide();
  await until(() => separate.webContents.executeJavaScript('!document.getElementById("apply").disabled'));
  assert.equal(await separate.webContents.executeJavaScript('document.documentElement.lang'), 'en');
  // Pin through the actual editor: apply moves settings into the main window.
  await separate.webContents.executeJavaScript("document.getElementById('pin-appearance').checked=true;document.getElementById('appearance-form').requestSubmit()");
  await until(() => separate.isDestroyed() && dock.isOpen());
  assert.equal(BrowserWindow.getAllWindows().length, 1, 'Pinned Appearance must not require a second window.');
  const panel = dock.panel, contents = panel.webContents;
  for (const checked of [contents,host.webContents,dock.launcher.webContents,bar.overlay.webContents]) {
    const execute = checked.executeJavaScript.bind(checked);
    checked.executeJavaScript = (script, ...args) => execute(script, ...args).catch(error => { console.error('Failed test renderer script:', script); throw error; });
  }
  await until(() => contents.executeJavaScript('!document.getElementById("apply").disabled'));
  assert.equal(await contents.executeJavaScript("document.body.classList.contains('docked')"), true);
  assert.equal(panel.getBounds().x, 0); assert.equal(panel.getBounds().y, 32, 'Menus and centered controls share one row above the game.');
  const centered=dock.launcher.getBounds();assert.equal(centered.y,0,'Toolbar shares menu baseline.');assert(Math.abs(centered.x+centered.width/2-host.getContentSize()[0]/2)<=1, 'Toolbar is centered in the main window.');
  async function assertToolbarHitMasks(contents, width, label) {
    try { await until(() => contents.executeJavaScript(`innerWidth === ${width}`)); }
    catch(error) {
      const actualInnerWidth = await contents.executeJavaScript('innerWidth').catch(() => null);
      console.error('Toolbar hit mask viewport diagnostic', JSON.stringify({label,expectedWidth:width,actualInnerWidth,hostContentSize:host.getContentSize(),visible:host.isVisible()}));
      throw error;
    }
    const masks = await contents.executeJavaScript(`(()=>{const read=id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,width:r.width,height:r.height,region:s.webkitAppRegion,pointerEvents:s.pointerEvents}};return {center:read('appearance-dock-hit-mask'),right:read('window-controls-hit-mask'),viewport:innerWidth}})()`);
    assert.equal(masks.viewport, width, `${label}: menu document tracks the resized window.`);
    assert.deepEqual(masks.center, {x:(width-232)/2,width:232,height:32,region:'no-drag',pointerEvents:'none'}, `${label}: centered launcher footprint stays in the native client region and passes pointer input through.`);
    assert.deepEqual(masks.right, {x:width-108,width:108,height:32,region:'no-drag',pointerEvents:'none'}, `${label}: right controls footprint stays in the native client region and passes pointer input through.`);
  }
  async function assertNativeToolbarHitTests(label) {
    if (process.platform !== 'win32') return;
    assert.equal(host.isFullScreen(), false, 'Caption regression uses the normal frameless product window.');
    const [width] = host.getContentSize();
    const samples = [];
    // Expand the real music group so every top-row icon has a visible center.
    const launcherContents = dock.launcher.webContents;
    const wasExpanded = await launcherContents.executeJavaScript("document.getElementById('library').getAttribute('aria-expanded')==='true'");
    if (!wasExpanded) await launcherContents.executeJavaScript("document.getElementById('library').click()");
    try {
      await until(() => launcherContents.executeJavaScript("document.getElementById('music-controls').getBoundingClientRect().width >= 155"));
      for (const [view, prefix, count] of [[dock.launcher, 'launcher', 7], [dock.windowControls.view, 'window', 3]]) {
        const bounds = view.getBounds();
        const centers = await view.webContents.executeJavaScript(`Array.from(document.querySelectorAll('nav button')).map(button=>{const r=button.getBoundingClientRect();return {name:button.id,x:r.x+r.width/2,y:r.y+r.height/2}})`);
        assert.equal(centers.length, count, `${label}: all ${prefix} icons are sampled.`);
        for (const center of centers) {
          assert(center.x > 0 && center.x < bounds.width && center.y > 0 && center.y < 32, `${label}: ${center.name} has a visible toolbar center.`);
          samples.push({ name: `${prefix}/${center.name}`, x: bounds.x + center.x, y: bounds.y + center.y, expected: 1 });
        }
      }
      const centerRight = dock.launcher.getBounds().x + dock.launcher.getBounds().width;
      const rightLeft = dock.windowControls.view.getBounds().x;
      assert(rightLeft - centerRight > 32, `${label}: a blank safe drag gap exists.`);
      samples.push({ name: 'blank safe gap', x: (centerRight + rightLeft) / 2, y: 16, expected: 2 });
      const nativeHandle = host.getNativeWindowHandle();
      const hwnd = (nativeHandle.length === 8 ? nativeHandle.readBigUInt64LE() : BigInt(nativeHandle.readUInt32LE())).toString();
      const rows = await readWindowsHitTests({ hwnd, pid: process.pid, width, samples });
      console.log('Windows toolbar native hit tests', label, JSON.stringify(rows));
      assertWindowsHitTests(samples, rows, label);
    } finally {
      if (!wasExpanded) await launcherContents.executeJavaScript("document.getElementById('library').click()");
    }
  }
  await assertToolbarHitMasks(host.webContents, 960, 'Main menu');
  const windowControls=dock.windowControls.view.webContents;
  await until(()=>windowControls.executeJavaScript('!!window.windowControls'));
  const centeredWindowIcons=await windowControls.executeJavaScript(`Array.from(document.querySelectorAll('nav button')).map(button=>{const b=button.getBoundingClientRect(),s=button.querySelector('svg').getBoundingClientRect();return {x:Math.abs(b.x+b.width/2-s.x-s.width/2),y:Math.abs(b.y+b.height/2-s.y-s.height/2)}})`);
  assert(centeredWindowIcons.every(value=>value.x<=.5&&value.y<=.5),'Window icons stay geometrically centered in their circles.');
  const right=dock.windowControls.view.getBounds();assert.equal(right.x+right.width,host.getContentSize()[0]);assert.equal(right.y,0);
  await until(()=>dock.launcher.webContents.executeJavaScript("getComputedStyle(document.getElementById('appearance-button')).borderRadius==='50%'"));
  assert.equal(await dock.launcher.webContents.executeJavaScript("getComputedStyle(document.getElementById('appearance-button')).borderRadius===getComputedStyle(document.getElementById('library')).borderRadius"),true);

  assert.equal(website.getBounds().x, panel.getBounds().width);
  assert.equal(await website.webContents.executeJavaScript('typeof window.appearance'), 'undefined');
  assert.equal(await website.webContents.executeJavaScript('typeof window.appearanceButton'), 'undefined');
  assert.equal(await website.webContents.executeJavaScript('typeof window.require'), 'undefined');
  await assert.rejects(contents.executeJavaScript('window.appearance.resizePanel("wide",true)'), /Invalid panel resize/);
  assert.equal(await contents.executeJavaScript('window.appearance.resizePanel(560,true)'), 560);
  assert.equal(panel.getBounds().width, 560); assert.equal(website.getBounds().x, 560);
  assert.equal(JSON.parse(await readFile(path.join(profile, 'appearance.json'), 'utf8')).appearancePanelWidth, 560);
  host.setTitle('Fables Appearance Panel Test');host.show();host.focus();
  await floatSettingsWindow(host,'Fables Appearance Panel Test',true);
  await sleep(150);
  await assertNativeToolbarHitTests('Initial frameless toolbar');
  await until(() => contents.executeJavaScript('innerWidth === 560'));
  await contents.executeJavaScript("document.getElementById('panel-resizer').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))");
  await until(() => panel.getBounds().width === 540);
  // A small viewport clamps the panel while remembering the requested width.
  host.setContentSize(820, 680); await until(() => host.getContentSize()[0] === 820);
  await assertToolbarHitMasks(host.webContents, 820, 'Resized main menu');
  await assertNativeToolbarHitTests('Resized frameless toolbar');
  assert.equal(panel.getBounds().width, 460); assert.equal(website.getBounds().width, 360);
  const narrow=dock.launcher.getBounds();assert(Math.abs(narrow.x+narrow.width/2-host.getContentSize()[0]/2)<=1);assert(narrow.y+narrow.height<=website.getBounds().y);assert.equal(dock.windowControls.view.getBounds().x+108,host.getContentSize()[0]);
  host.setContentSize(960, 680); await until(() => host.getContentSize()[0] === 960); await assertToolbarHitMasks(host.webContents, 960, 'Restored main menu'); assert.equal(panel.getBounds().width, 540);
  await assertNativeToolbarHitTests('Restored frameless toolbar');
  // The shared layout also works without the Linux app bar (Windows/fullscreen).
  dock.setInset(0); assert.equal(panel.getBounds().y, 32); assert.equal(website.getBounds().y, 32);
  const launcher=dock.launcher.getBounds();assert(launcher.y+launcher.height<=website.getBounds().y,'The Windows launcher must not cover website controls.');
  dock.hide();assert.equal(website.getBounds().y,32);await dock.open();assert.equal(panel.getBounds().y,32);
  dock.setInset(32);
  if (process.platform === 'win32') {
    await host.webContents.executeJavaScript("window.desktopMenu.open('appearance',100)");
    await until(() => bar.overlay.webContents.executeJavaScript("!document.getElementById('dropdown').hidden"));
    await assertToolbarHitMasks(bar.overlay.webContents, 960, 'Frameless open menu overlay');
    await assertNativeToolbarHitTests('Frameless open menu overlay');
    assert.equal(await bar.overlay.webContents.executeJavaScript("document.getElementById('dropdown').hidden"), false, 'Native hit-test sampling leaves the menu open.');
    await host.webContents.executeJavaScript('window.desktopMenu.close()');
  }
  host.show(); host.focus(); host.setFullScreen(true); await until(() => host.isFullScreen()); await sleep(150);
  const fullscreenGeometry={fullscreen:host.isFullScreen(),hostBounds:host.getBounds(),hostContentSize:host.getContentSize(),display:screen.getDisplayMatching(host.getBounds()),panelBounds:panel.getBounds(),websiteBounds:website.getBounds(),panelRenderer:await contents.executeJavaScript('({innerWidth,innerHeight,outerWidth,outerHeight})')};
  console.log('Fullscreen geometry diagnostic',JSON.stringify(fullscreenGeometry));
  assert.equal(panel.getBounds().height, host.getContentSize()[1] - 32);
  assert.equal(website.getBounds().width + panel.getBounds().width, host.getContentSize()[0]);
  // Actual pointer events exercise the resize handle and persist the result.
  const startWidth = panel.getBounds().width;
  await until(() => contents.executeJavaScript(`innerWidth === ${startWidth}`));
  contents.focus();
  // Classic Windows scrollbars shift the fixed handle away from innerWidth.
  const handle=await contents.executeJavaScript(`(()=>{const r=document.getElementById('panel-resizer').getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.min(100,Math.round(r.top+r.height/2))};})()`);
  assert.equal(await contents.executeJavaScript(`document.elementFromPoint(${handle.x},${handle.y})?.id`),'panel-resizer');
  const point=host.getContentBounds(),bounds=panel.getBounds();
  const screenX=point.x+bounds.x+handle.x,screenY=point.y+bounds.y+handle.y;
  await contents.executeJavaScript(`window.resizeTrace=[];for(const type of ['pointerdown','pointermove','pointerup','lostpointercapture'])document.addEventListener(type,event=>window.resizeTrace.push({type,x:event.screenX,client:event.clientX,target:event.target.id,buttons:event.buttons}),true)`);
  contents.sendInputEvent({type:'mouseMove',globalX:screenX,globalY:screenY,x:handle.x,y:handle.y});
  await sleep(50);
  contents.sendInputEvent({type:'mouseDown',globalX:screenX,globalY:screenY,x:handle.x,y:handle.y,button:'left',clickCount:1});
  await sleep(50);
  contents.sendInputEvent({type:'mouseMove',globalX:screenX-40,globalY:screenY,modifiers:['leftButtonDown'],x:handle.x-40,y:handle.y,movementX:-40,movementY:0});
  try { await until(() => panel.getBounds().width < startWidth); }
  catch(error){console.error('Resize diagnostic',JSON.stringify({startWidth,handle,focused:host.isFocused(),trace:await contents.executeJavaScript('window.resizeTrace')}));throw error;}
  await until(()=>contents.executeJavaScript(`innerWidth===${panel.getBounds().width}`));
  await contents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>resolve(true)))');
  contents.sendInputEvent({type:'mouseUp',globalX:screenX-40,globalY:screenY,x:handle.x-40,y:handle.y,button:'left',clickCount:1});
  try { await until(() => manager.getSettings().appearancePanelWidth < startWidth); }
  catch(error){console.error('Persist resize diagnostic',JSON.stringify({startWidth,width:panel.getBounds().width,saved:manager.getSettings().appearancePanelWidth,trace:await contents.executeJavaScript('window.resizeTrace'),drag:await contents.executeJavaScript('({drag,desiredWidth,resizeFrame})')}));throw error;}
  // Built-in labels change without a model and preserve unsaved color values.
  await contents.executeJavaScript("document.getElementById('custom-hex').value='#abcdef'");
  await translation.save({ ...translation.getSettings(), enabled: true, translateDescriptions: false });
  await until(() => contents.executeJavaScript('document.documentElement.lang === "ru"'));
  // A drag-save/get reply captured before the locale toggle must not restore English or reset a draft.
  await contents.executeJavaScript(`window.appearance.get().then(state => showSettings({...state,locale:'en',localeRevision:0,customColor:'#000000'}))`);
  assert.equal(await contents.executeJavaScript('document.documentElement.lang'),'ru');
  assert.equal(await contents.executeJavaScript('document.getElementById("custom-hex").value'),'#abcdef');

  await until(()=>host.webContents.executeJavaScript("document.querySelector('[data-menu=translation]').textContent==='Перевод'"));
  assert.deepEqual(await host.webContents.executeJavaScript("[...document.querySelectorAll('[data-menu]')].map(b=>b.textContent)"),['Файл','Правка','Перевод','Вид','Окно']);
  await host.webContents.executeJavaScript("window.desktopMenu.open('appearance',100)");
  await assertToolbarHitMasks(bar.overlay.webContents, host.getContentSize()[0], 'Open fullscreen menu overlay');
  await until(()=>bar.overlay.webContents.executeJavaScript("document.querySelector('#dropdown .label')?.textContent==='Настроить оформление…'"));
  assert(await bar.overlay.webContents.executeJavaScript("document.getElementById('dropdown').scrollHeight<=document.getElementById('dropdown').clientHeight"),'The settings dropdown must fit without scrolling.');
  assert.equal(await bar.overlay.webContents.executeJavaScript("document.querySelectorAll('#dropdown .label')[1].textContent"),'Сохранённые инструкции /sp…');
  await bar.overlay.webContents.executeJavaScript("window.desktopMenu.choose(0)");assert.equal(chosen,1,'Localized callbacks retain their actions.');
  await host.webContents.executeJavaScript("window.desktopMenu.open('music',100)");
  await until(()=>bar.overlay.webContents.executeJavaScript("document.querySelector('#dropdown .label')?.textContent==='Музыкальный проигрыватель…'"));
  await bar.overlay.webContents.executeJavaScript("window.desktopMenu.choose(0)");assert.equal(chosen,2);
  let prevented=false;
  website.webContents.emit('before-input-event',{preventDefault(){prevented=true}},{type:'keyDown',code:'KeyM',control:true,shift:true,alt:false});
  assert(prevented);assert.equal(chosen,3,'The custom Linux toolbar dispatches the music shortcut.');
  prevented=false;
  website.webContents.emit('before-input-event',{preventDefault(){prevented=true}},{type:'keyDown',code:'KeyP',control:true,shift:true,alt:false});
  assert(prevented);assert.equal(chosen,4,'The custom Linux toolbar dispatches the instruction shortcut.');
  await host.webContents.executeJavaScript("window.desktopMenu.open('translation',100)");
  await until(()=>bar.overlay.webContents.executeJavaScript("document.querySelector('#dropdown .label')?.textContent==='✓ Переводить на русский'"));
  await host.webContents.executeJavaScript('window.desktopMenu.close()');
  bar.setBlack(false);await until(()=>host.webContents.executeJavaScript("document.querySelector('nav').hidden"));assert.equal(website.getBounds().y,32);assert.equal(bar.menu.items[0].label,'Файл');
  bar.setBlack(true);
  assert.equal(await contents.executeJavaScript("document.querySelector('h1').textContent"), 'Настройте под себя.');
  assert.equal(await contents.executeJavaScript("document.querySelector('#close-panel svg')?.getAttribute('aria-hidden')"), 'true');
  assert.equal(await contents.executeJavaScript("document.getElementById('close-panel').getAttribute('aria-label')"),'Закрыть панель');
  assert.equal(await contents.executeJavaScript("getComputedStyle(document.getElementById('close-panel')).borderRadius"),'50%');
  assert.equal(await contents.executeJavaScript("(()=>{const b=document.getElementById('close-panel').getBoundingClientRect(),g=document.querySelector('#close-panel svg').getBoundingClientRect();return Math.abs(b.x+b.width/2-g.x-g.width/2)<=.5&&Math.abs(b.y+b.height/2-g.y-g.height/2)<=.5})()"),true);
  assert.equal(await contents.executeJavaScript("document.getElementById('custom-hex').value"), '#abcdef');
  assert.equal(await contents.executeJavaScript("document.getElementById('player-gradient-second-opacity').closest('fieldset').querySelector('[data-label=gradient-second-opacity]').firstChild.textContent.trim()"), 'Непрозрачность второго цвета');
  await until(() => dock.launcher.webContents.executeJavaScript('document.getElementById("appearance-button").getAttribute("aria-label") === "Внешний вид"'));
  assert.equal(await contents.executeJavaScript("document.getElementById('panel-resizer').getAttribute('aria-label')"), 'Изменить ширину панели оформления');
  await contents.executeJavaScript('window.appearance.resizePanel(320,false)');
  await until(()=>contents.executeJavaScript('innerWidth===320'));
  for(const category of ['theme','picture','messages','context','events','dice','sharing','app']) {
    await contents.executeJavaScript(`document.querySelector('[data-panel=${category}-panel]').click();new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    assert(await contents.executeJavaScript('document.documentElement.scrollWidth <= innerWidth'),`Russian ${category} controls must fit the narrow panel.`);
  }
  await contents.executeJavaScript(`window.appearance.resizePanel(${startWidth+40},false)`);
  await translation.save({ ...translation.getSettings(), showOriginal: true });
  await until(() => contents.executeJavaScript('document.documentElement.lang === "en"'));
  assert.equal(await contents.executeJavaScript("document.querySelector('h1').textContent"), 'Make it yours.');
  await until(()=>host.webContents.executeJavaScript("document.querySelector('[data-menu=translation]').textContent==='Translation'"));
  // Light and custom presets update the entire editor as well as the game.
  await contents.executeJavaScript("document.querySelector('[name=preset][value=light]').checked=true;document.getElementById('appearance-form').dispatchEvent(new Event('input',{bubbles:true}))");
  await until(() => contents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor === "rgb(245, 245, 245)"'));
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.documentElement).colorScheme'), 'light');
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.getElementById("apply")).color'),'rgb(255, 255, 255)');
  if(process.env.FABLES_PANEL_SCREENSHOT)await writeFile(process.env.FABLES_PANEL_SCREENSHOT.replace(/\.png$/,'-light.png'),(await contents.capturePage()).toPNG());
  await contents.executeJavaScript("document.getElementById('appearance-form').requestSubmit()");
  await until(() => manager.getSettings().preset === 'light');
  assert.equal(await website.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor'), 'rgb(245, 245, 245)');
  await manager.save({ ...manager.getSettings(), preset: 'custom', customColor: '#234567' });
  await contents.executeJavaScript('window.appearance.get().then(showSettings)');
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'), 'rgb(35, 69, 103)');
  // Closing/reopening preserves the live editor, its active category and drafts.
  await contents.executeJavaScript("document.querySelector('[data-panel=messages-panel]').click();document.getElementById('player-opacity').value=37;document.getElementById('close-panel').click()");
  await until(() => !dock.isOpen()); assert.equal(website.getBounds().x, 0);
  await dock.launcher.webContents.executeJavaScript("document.getElementById('appearance-button').click()"); await until(() => dock.isOpen());
  assert.equal(await contents.executeJavaScript("document.getElementById('player-opacity').value"), '37');
  // A local impostor cannot access either editor IPC or launcher IPC.
  const impostor = new BrowserWindow({ show: false, webPreferences: { partition: 'fables-appearance', preload: path.join(appRoot, 'dist/appearance/appearance-preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await impostor.loadURL('fables-desktop://settings/');
  await assert.rejects(impostor.webContents.executeJavaScript('window.appearance.get()'), /only in the app settings window/); impostor.destroy();
  // Menus appear above the dock, without moving the website back over it.
  await host.webContents.executeJavaScript("window.desktopMenu.open('appearance',100)");
  assert.equal(host.contentView.children.at(-1), dock.launcher, 'Music/appearance controls remain above an open menu.');
  assert(host.contentView.children.indexOf(dock.windowControls.view)>host.contentView.children.indexOf(bar.overlay), 'Window controls stay above menu overlays.');
  await until(()=>bar.overlay.webContents.executeJavaScript("getComputedStyle(document.getElementById('dropdown')).top==='32px'"));
  assert(host.contentView.children.indexOf(bar.overlay)>host.contentView.children.indexOf(panel), 'Dropdown remains above the settings panel.');
  assert.equal(website.getBounds().x, panel.getBounds().width);
  await host.webContents.executeJavaScript('window.desktopMenu.close()');
  if (process.env.FABLES_PANEL_SCREENSHOT) {
    await translation.save({ ...translation.getSettings(), showOriginal: false });
    await contents.executeJavaScript("document.querySelector('[data-panel=theme-panel]').click()"); await sleep(150);
    await writeFile(process.env.FABLES_PANEL_SCREENSHOT.replace(/\.png$/, '-editor.png'), (await contents.capturePage()).toPNG());
    if (process.platform === 'linux' && process.env.HYPRLAND_INSTANCE_SIGNATURE) {
      const {execFileSync}=require('node:child_process');
      const own=JSON.parse(execFileSync('hyprctl',['clients','-j'],{encoding:'utf8'})).find(client=>client.pid===process.pid && client.title==='Fables Appearance Panel Test');
      assert(own);execFileSync('grim',['-g',`${own.at[0]},${own.at[1]} ${own.size[0]}x${own.size[1]}`,process.env.FABLES_PANEL_SCREENSHOT]);
    }
  }
  host.setFullScreen(false); await until(() => !host.isFullScreen());bar.setBlack(false);
  // Disabling the pin restores the standalone editor and full game width.
  await contents.executeJavaScript("document.getElementById('pin-appearance').checked=false;document.getElementById('appearance-form').requestSubmit()");
  await until(() => !manager.getSettings().appearancePinned && BrowserWindow.getAllWindows().length === 2);
  assert.equal(dock.isOpen(), false); assert.equal(website.getBounds().x, 0);assert.equal(website.getBounds().y,32,'The centered controls retain their row above the website with native menus after unpinning.');
  const reopened = manager.window;
  await until(() => reopened.webContents.executeJavaScript('!document.getElementById("apply").disabled'));
  assert.equal(await reopened.webContents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'), 'rgb(35, 69, 103)');
  const savedWidth = manager.getSettings().appearancePanelWidth;
  assert(savedWidth < startWidth);
  // A fresh theme selected in the standalone editor replaces stale panel state.
  await reopened.webContents.executeJavaScript("document.querySelector('[name=preset][value=black]').checked=true;document.getElementById('pin-appearance').checked=true;document.getElementById('appearance-form').requestSubmit()");
  await until(() => reopened.isDestroyed() && dock.isOpen());
  assert.equal(await contents.executeJavaScript('document.getElementById("pin-appearance").checked'),true);
  assert.equal(await contents.executeJavaScript('document.getElementById("appearance-form").elements.preset.value'),'black');
  assert.equal(await contents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'),'rgb(16, 16, 16)');
  const persisted=JSON.parse(await readFile(path.join(profile,'appearance.json'),'utf8'));
  assert.equal(persisted.appearancePinned,true);assert.equal(persisted.appearancePanelWidth,savedWidth);
  await translation.save({...translation.getSettings(),showOriginal:false});
  // Only the registered sandboxed toolbar may control the native window.
  const forgedControls=new BrowserWindow({show:false,webPreferences:{partition:'fables-appearance',preload:path.join(appRoot,'dist/shell/window-controls-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await forgedControls.loadURL('fables-desktop://settings/window-controls.html');
  await assert.rejects(forgedControls.webContents.executeJavaScript('window.windowControls.get()'),/only in the app toolbar/);
  await assert.rejects(forgedControls.webContents.executeJavaScript("window.windowControls.action('quit')"),/only in the app toolbar/);forgedControls.destroy();
  await assert.rejects(windowControls.executeJavaScript("window.windowControls.action('delete')"),/Invalid window action/);
  await until(()=>windowControls.executeJavaScript("document.getElementById('minimize').title==='Свернуть'"));
  const wasFull=host.isFullScreen();await windowControls.executeJavaScript("document.getElementById('fullscreen').click()");await until(()=>host.isFullScreen()!==wasFull);
  await until(()=>windowControls.executeJavaScript(`document.getElementById('fullscreen').getAttribute('aria-pressed')==='${!wasFull}'`));
  await windowControls.executeJavaScript("document.getElementById('fullscreen').click()");await until(()=>host.isFullScreen()===wasFull);
  await until(()=>windowControls.executeJavaScript(`document.getElementById('fullscreen').getAttribute('aria-pressed')==='${wasFull}'`));
  // Test minimize independently after the fullscreen toggle contract above.
  host.setFullScreen(false);await until(()=>!host.isFullScreen());
  host.show();await windowControls.executeJavaScript("document.getElementById('minimize').click()");if(dock.windowControls.minimizer.trayMode){await until(()=>!host.isVisible());assert.equal(host.isMinimized(),false,'Hyprland hides without entering a frozen native minimized state.');dock.windowControls.minimizer.restore();await until(()=>host.isVisible());}else{await until(()=>host.isMinimized());host.restore();await until(()=>!host.isMinimized());}
  const originalQuit=app.quit;let quitRequests=0;app.quit=()=>{quitRequests++};
  try{await windowControls.executeJavaScript("window.windowControls.action('quit')");assert.equal(quitRequests,1,'Exit dispatches normal app.quit exactly once.')}finally{app.quit=originalQuit;}
  host.destroy();
  for(const method of ['get','save','import-image','pictures','select-picture','folder-pictures','choose-folder','select-folder-picture','reset','undo-reset','export-theme','import-theme','close-panel','resize-panel','save-theme','remove-theme','preview-theme'])ipcMain.removeHandler(`appearance:${method}`);
  session.fromPartition('fables-appearance').protocol.unhandle('fables-desktop');
  const restarted=new AppearanceManager();await restarted.initialize();
  restarted.setLocale(translation.getSettings().enabled&&!translation.getSettings().showOriginal?'ru':'en');
  assert.equal(restarted.getSettings().appearancePinned,true);assert.equal(restarted.getSettings().appearancePanelWidth,savedWidth);
  const freshHost=new BrowserWindow({show:false,width:1100,height:820,webPreferences:{partition:'fables-appearance',sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const freshSite=new WebContentsView({webPreferences:{session:websiteSession,sandbox:true,contextIsolation:true,nodeIntegration:false}});freshHost.contentView.addChildView(freshSite);
  const freshDock=restarted.attachMain(freshHost,freshSite);await freshDock.ready;
  assert.equal(freshDock.isOpen(),false);assert.equal(freshSite.getBounds().x,0);assert.equal(freshSite.getBounds().y,32);assert(freshDock.launcher.getBounds().height<=freshSite.getBounds().y);
  await freshDock.launcher.webContents.executeJavaScript("document.getElementById('appearance-button').click()");await until(()=>freshDock.isOpen());
  assert.equal(freshDock.panel.getBounds().width,savedWidth);assert.equal(BrowserWindow.getAllWindows().length,1);
  await until(()=>freshDock.panel.webContents.executeJavaScript('document.documentElement.lang==="ru"'));
  console.log('PASS: themed settings, built-in Russian labels, preserved drafts, pin/unpin, button, mouse/keyboard resizing, persisted width, viewport clamping, fullscreen, localized menus/actions/checkboxes, native menu mode, non-overlapping Windows launcher, menu overlay ordering, website isolation, and restricted editor IPC.');
})().then(async () => { clearTimeout(timer); await translation?.shutdown(); for (const window of BrowserWindow.getAllWindows()) window.destroy(); if (profile && !process.env.FABLES_TEST_PROFILE_DIR) await rm(profile, { recursive: true, force: true }); app.exit(0); })
  .catch(async error => { console.error(error); clearTimeout(timer); await translation?.shutdown(); for (const window of BrowserWindow.getAllWindows()) window.destroy(); if (profile && !process.env.FABLES_TEST_PROFILE_DIR) await rm(profile, { recursive: true, force: true }); app.exit(1); });
