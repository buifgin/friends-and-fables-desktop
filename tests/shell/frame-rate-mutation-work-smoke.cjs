// Native focused-page fixture for redundant same-value FPS caption writes.
// This is standalone by design: it does not load the application entrypoint.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const appRoot = process.env.FABLES_TEST_APP_ROOT || path.join(__dirname, '../..');
const sourcePath = path.join(appRoot, 'dist/shell/frame-rate.js');
const html = `<!doctype html><meta charset="utf-8"><title>FPS mutation fixture</title>
<style>html,body{margin:0;min-height:100%;font:16px sans-serif}#feed{height:1300px;padding:24px;box-sizing:border-box}
.native-card{width:420px;height:180px;padding:16px;box-sizing:border-box;background:#eee}
#editor{margin-top:24px;width:380px;min-height:70px;border:1px solid #777}</style>
<main id="feed"><article class="native-card" id="card"><p id="prose">Native story text remains exactly in place.</p></article>
<div id="editor" contenteditable="true">Preserve this editor draft.</div><p style="margin-top:850px">Scroll anchor</p></main>
<script>window.fixtureReady=true;</script>`;

async function scenario(configure) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const waitFor = async (predicate, label, maxFrames = 360) => {
    for (let index = 0; index < maxFrames; index++) {
      if (predicate()) return;
      await waitFrame();
    }
    throw new Error(`Timed out waiting for ${label} after ${maxFrames} native frames`);
  };
  const visibleAndFocused = () => !document.hidden && document.hasFocus();
  assert(visibleAndFocused(), 'fixture must be visible and focused before measuring native RAF');
  const card = document.getElementById('card');
  const prose = document.getElementById('prose');
  const proseText = prose.firstChild;
  const editor = document.getElementById('editor');
  const editorText = editor.firstChild;
  const range = document.createRange();
  range.setStart(proseText, 0);
  range.setEnd(proseText, proseText.data.length);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  const nativeBefore = {
    cardRect: card.getBoundingClientRect().toJSON(),
    proseText: proseText.data,
    selection: selection.toString(),
    editorText: editorText.data,
    scrollY,
  };
  const observedLabels = new Set();
  const writes = [];
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData' && observedLabels.has(record.target)) {
        writes.push({ oldValue: record.oldValue, value: record.target.data, at: performance.now() });
      }
    }
  });
  observer.observe(document.body, { subtree: true, characterData: true, characterDataOldValue: true });

  configure(true);
  const firstState = window.__ffFrameRateOverlay;
  const firstNode = firstState?.node;
  const firstLabel = firstNode?.firstChild;
  assert(firstState && firstNode && firstLabel?.nodeType === Node.TEXT_NODE, 'enable creates a native overlay and text node');
  observedLabels.add(firstLabel);
  const firstFrame = firstState.frame;
  configure(true);
  assert(window.__ffFrameRateOverlay === firstState, 'repeated enable preserves the active controller');
  assert(firstState.node === firstNode && firstState.node.firstChild === firstLabel, 'repeated enable preserves node and label identity');
  assert(firstState.frame === firstFrame, 'repeated enable preserves the scheduled native frame');

  const warmCaption = 'Page frame cadence · warming up…';
  await waitFor(() => firstState.samples.length > 0 && performance.now() - firstState.samples[0] >= 850, 'initial warmup sampling');
  await new Promise(resolve => setTimeout(resolve, 0));
  const warmupWrites = writes.filter(write => write.oldValue === warmCaption && write.value === warmCaption).length;
  const warmupRed = warmupWrites > 0;
  const numeric = () => /^Page frame cadence · \d+ FPS · mean \d+\.\d+ ms · p95 \d+\.\d+ ms$/.test(firstLabel.data);
  await waitFor(() => numeric() && firstState.samples.length > 1 && firstState.samples.at(-1) - firstState.samples[0] >= 1000,
    'numeric FPS, mean/p95, and a full native sample window');
  assert(visibleAndFocused(), 'fixture remained visible and focused through cadence measurement');
  assert(firstState.samples.length > 2, 'native RAF samples continued accumulating');
  assert(firstState.samples.at(-1) > firstState.samples[0], 'native RAF sample timestamps advanced');

  const stateBeforeDisable = firstState.samples.length;
  const frameBeforeDisable = firstState.frame;
  assert(frameBeforeDisable !== null, 'active controller has a pending native frame');
  configure(false);
  await waitFrame();
  assert(window.__ffFrameRateOverlay === undefined && !firstNode.isConnected, 'disable removes the overlay and controller');
  assert(firstState.samples.length === stateBeforeDisable, 'disable cancels the pending frame loop');

  configure(true);
  const secondState = window.__ffFrameRateOverlay;
  const secondNode = secondState?.node;
  const secondLabel = secondNode?.firstChild;
  assert(secondState && secondState !== firstState, 'reenable creates a fresh controller');
  assert(secondNode && secondNode !== firstNode && secondLabel?.nodeType === Node.TEXT_NODE, 'reenable creates a fresh overlay and label');
  observedLabels.add(secondLabel);
  assert(secondLabel.data === warmCaption && secondState.samples.length === 0, 'reenable begins with a fresh warming state');
  await waitFor(() => secondState.samples.length > 0, 'fresh reenabled sample');
  configure(false);
  await waitFrame();
  observer.disconnect();

  const nativeAfter = {
    cardRect: card.getBoundingClientRect().toJSON(),
    proseText: proseText.data,
    selection: window.getSelection().toString(),
    editorText: editorText.data,
    scrollY,
  };
  assert(card === document.getElementById('card'), 'native card identity is unchanged');
  assert(proseText === prose.firstChild && proseText.data === nativeBefore.proseText, 'native prose text node and contents are unchanged');
  assert(editorText === editor.firstChild && editorText.data === nativeBefore.editorText, 'editor draft text node and contents are unchanged');
  assert(nativeAfter.selection === nativeBefore.selection, 'selected native text is unchanged');
  assert(JSON.stringify(nativeAfter.cardRect) === JSON.stringify(nativeBefore.cardRect), 'native card geometry is unchanged');
  assert(nativeAfter.scrollY === nativeBefore.scrollY, 'native page scroll position is unchanged');
  return {
    warmupRed,
    warmupWrites,
    observedSameValueWrites: writes.filter(write => write.oldValue === write.value).length,
    numericLabel: firstLabel.data,
    sampleCount: stateBeforeDisable,
    sampleSpanMs: firstState.samples.at(-1) - firstState.samples[0],
    repeatedEnablePreservedController: true,
    disableCancelledFrameAndRemovedNode: true,
    reenableCreatedFreshWarmup: true,
    nativeCardTextSelectionEditorAndGeometryPreserved: true,
  };
}

function validatePrograms(configureFrameRateOverlay) {
  const configureSource = configureFrameRateOverlay.toString();
  new vm.Script(`(${configureSource})`, { filename: 'compiled-configureFrameRateOverlay.js' });
  new vm.Script(`(${scenario.toString()})`, { filename: 'frame-rate-mutation-scenario.js' });
  new vm.Script(`(${scenario.toString()})(${configureSource})`, { filename: 'serialized-frame-rate-fixture.js' });
}

if (!fs.existsSync(sourcePath)) throw new Error(`Compiled candidate is missing: ${sourcePath}`);
const compiled = require(sourcePath);
if (typeof compiled.configureFrameRateOverlay !== 'function') throw new Error('Compiled candidate lacks configureFrameRateOverlay');
validatePrograms(compiled.configureFrameRateOverlay);

if (process.env.FABLES_TEST_PARSE_ONLY === '1' || !process.versions.electron) {
  console.log(`PASS: serialized FPS mutation fixture parses; compiled source ${sourcePath}`);
} else {
  const { app, BrowserWindow, session } = require('electron');
  let host;
  const deadline = setTimeout(() => { console.error('FAIL: FPS mutation fixture deadline'); app.exit(1); }, 15000);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-fps-mutation-'));
  app.setPath('userData', profile);
  app.on('window-all-closed', () => {});
  void app.whenReady().then(async () => {
    await session.fromPartition('fps-mutation-fixture').protocol.handle('https', () =>
      new Response(html, { headers: { 'Content-Type': 'text/html' } }));
    host = new BrowserWindow({ width: 900, height: 700, show: true, webPreferences: { partition: 'fps-mutation-fixture' } });
    host.on('closed', () => {});
    await host.loadURL('https://play.fables.gg/fps-mutation-fixture');
    host.show(); host.focus();
    const site = host.webContents;
    site.focus();
    const ready = await site.executeJavaScript('window.fixtureReady && !document.hidden && document.hasFocus()');
    assert.equal(ready, true, 'fixture page is loaded, visible, and focused');
    const scenarioSource = `(${scenario.toString()})(${compiled.configureFrameRateOverlay.toString()})`;
    const result = await site.executeJavaScript(scenarioSource);
    console.log(JSON.stringify({ result, passed: !result.warmupRed }, null, 2));
    assert.equal(result.warmupRed, false, `${result.warmupWrites} redundant same-value warmup Text writes observed`);
    clearTimeout(deadline);
    host.close();
    app.quit();
  }).catch(error => {
    console.error('FAIL: FPS mutation fixture', error);
    clearTimeout(deadline);
    if (host && !host.isDestroyed()) host.destroy();
    app.exit(1);
  });
  app.on('will-quit', () => clearTimeout(deadline));
}
