// ROOT-scheduled native regression; no app entrypoint imports or source rewrites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function prepare() {
  const root = process.env.FABLES_TEST_APP_ROOT || path.resolve(__dirname, '../..');
  const compiled = path.join(root, 'dist/appearance/chat-appearance.js');
  const themes = path.join(root, 'dist/appearance/themes.js');
  const { configureChatAppearance, chatCss } = require(compiled);
  const { DEFAULT_APPEARANCE } = require(themes);
  const source = configureChatAppearance.toString();
  const settings = {
    ...DEFAULT_APPEARANCE,
    dice: {
      ...DEFAULT_APPEARANCE.dice,
      enabled: true,
      colorsEnabled: true,
      natural20: { enabled: true, faceColor: '#e5b73b', edgeColor: '#fff1b8', numberColor: '#16120a' },
      natural1: { enabled: true, faceColor: '#a51d2d', edgeColor: '#efb0b8', numberColor: '#ffffff' },
    },
  };
  const css = chatCss(settings, null);
  new vm.Script(`(${source})`);
  new vm.Script(`(${scenario.toString()})`);
  return {
    root, source, settings, css,
    metadata: {
      functionSHA256: sha(source), compiledSHA256: sha(fs.readFileSync(compiled)),
      chatCssSHA256: sha(css),
      fixtureSHA256: sha(fs.readFileSync(__filename)),
    },
  };
}

async function scenario(source, settings, css) {
  const cardSelector = '[id^="event-message-card-"]';
  const check = (condition, message, evidence) => {
    if (!condition) throw Error(`${message}: ${JSON.stringify(evidence)}`);
  };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const until = async (predicate, label, limit = 180) => {
    for (let index = 0; index < limit; index++) {
      await frame();
      check(document.visibilityState === 'visible' && document.hasFocus(), 'Visible focused fixture required', { label });
      if (predicate()) return;
    }
    throw Error(`Timed out: ${label}`);
  };
  const rect = element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  };
  const localRect = element => {
    const box = element.getBBox();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  };
  window.__friendsFablesDesktopChatAppearance?.dispose();
  document.body.innerHTML = '<style>' +
    'html,body{margin:0;min-height:100%;font:16px sans-serif}#chat{width:900px;height:700px;overflow-y:auto;margin:20px auto}' +
    '#events-list{display:flex;flex-direction:column;gap:8px}.history{flex:none;height:90px;padding:8px;border:1px solid #777}' +
    '.prose{height:100%;overflow:hidden}.prose p{margin:0}.roll-panel{height:180px;padding:12px}' +
    'svg#d20{width:128px;height:128px;display:block}.cls-4{fill:#203da6}.cls-1{stroke:#c59045}' +
    '@keyframes fixture-spin{to{transform:rotate(360deg)}}.animate-spin{animation:fixture-spin 1s linear infinite}' +
    '</style><main id="chat" class="flex-1 h-full w-full"><div id="events-list"></div></main>' +
    '<div class="tiptap" contenteditable="true">Preserve editor draft.</div>';
  history.replaceState({}, '', '/campaign-a/play');
  const list = document.getElementById('events-list');
  const cards = [], prose = [], proseNodes = [];
  for (let index = 1; index <= 40; index++) {
    const row = document.createElement('div');
    row.id = `event-container-${index}`;
    const card = document.createElement('article');
    card.id = `event-message-card-${index}`;
    card.className = 'history';
    const body = document.createElement('div');
    body.className = 'prose';
    const paragraph = document.createElement('p');
    paragraph.append(document.createTextNode(`Native history ${index}`));
    body.append(paragraph);
    card.append(body);
    if (index === 40) {
      const roll = document.createElement('div');
      roll.className = 'roll-panel from-slate-900/95 to-slate-950/95 rounded-2xl border';
      const die = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      die.id = 'd20';
      die.setAttribute('viewBox', '0 0 100 100');
      die.innerHTML = '<path class="cls-4" d="M50 5 95 90H5Z"></path>' +
        '<path class="cls-1" d="M50 5 95 90H5Z" fill="none"></path><text x="50" y="58" text-anchor="middle">20</text>';
      roll.append(die);
      card.append(roll);
    }
    row.append(card);
    list.append(row);
    cards.push(card);
    prose.push(body);
    proseNodes.push(paragraph.firstChild);
  }
  const draft = document.querySelector('.tiptap');
  const draftNode = draft.firstChild;
  const die = document.getElementById('d20');
  const face = die.querySelector('text').firstChild;
  die.scrollIntoView({ block: 'center' });
  const appearanceStyle = document.createElement('style');
  appearanceStyle.dataset.fixtureAppearance = 'true';
  appearanceStyle.textContent = css;
  document.head.append(appearanceStyle);
  const originalQuerySelectorAll = document.querySelectorAll;
  const querySelectorAllDescriptor = Object.getOwnPropertyDescriptor(document, 'querySelectorAll');
  const scans = { cards: 0 };
  Object.defineProperty(document, 'querySelectorAll', { configurable: true, writable: true, value: function (selector) {
    if (selector === cardSelector) scans.cards++;
    return Reflect.apply(originalQuerySelectorAll, this, arguments);
  } });
  let textObserver;
  try {
    check(cards.length === 40 && cards.every(card => card.isConnected), 'Forty native history cards required');
    eval(`(${source})`)(settings);
    await until(() => die.dataset.ffDesktopCriticalDie === 'natural20', 'Initial settled natural 20 paint');
    check(getComputedStyle(die.querySelector('.cls-4')).fill === 'rgb(229, 183, 59)', 'Initial critical face paint', {
      critical: die.dataset.ffDesktopCriticalDie, fill: getComputedStyle(die.querySelector('.cls-4')).fill,
    });
    const initial20 = rect(cards[39]);
    const initialScans = scans.cards;
    const beforeSpinScan = scans.cards;
    die.classList.add('animate-spin');
    await until(() => !die.hasAttribute('data-ff-desktop-critical-die') && scans.cards > beforeSpinScan,
      'Global card scan removes spinning critical paint');
    const spinAnimations = die.getAnimations().filter(animation => animation.animationName === 'fixture-spin');
    check(spinAnimations.length === 1 && spinAnimations[0].playState === 'running', 'Native CSS spin must be running', spinAnimations.map(item => ({ name: item.animationName, state: item.playState })));
    const spin = spinAnimations[0];
    const spinningAtStart = Number(spin.currentTime);
    const cardAtStart = rect(cards[39]);
    const chat = document.getElementById('chat');
    const chatBox = chat.getBoundingClientRect(), dieBox = die.getBoundingClientRect();
    check(dieBox.bottom > chatBox.top && dieBox.top < chatBox.bottom && dieBox.right > chatBox.left && dieBox.left < chatBox.right,
      'D20 must be in the visible chat viewport before mutation sampling', { chat: rect(chat), die: rect(die) });
    const dieGeometryAtStart = { box: localRect(die), width: getComputedStyle(die).width, height: getComputedStyle(die).height,
      clientWidth: die.clientWidth, clientHeight: die.clientHeight };
    scans.cards = 0;
    const changes = [];
    textObserver = new MutationObserver(records => {
      for (const record of records) if (record.type === 'characterData' && record.target === face) {
        changes.push({ oldValue: record.oldValue, value: record.target.data, at: performance.now() });
      }
    });
    textObserver.observe(document.documentElement, { subtree: true, characterData: true, characterDataOldValue: true });
    const faces = ['1', '13', '7', '4', '18', '6'];
    await Promise.all(faces.map((value, index) => new Promise(resolve => {
      setTimeout(() => { face.data = value; resolve(); }, (index + 1) * 50);
    })));
    await until(() => changes.length === faces.length, 'All six native D20 face mutations observed', 40);
    await frame(); await frame();
    const cadence = changes.slice(1).map((item, index) => item.at - changes[index].at);
    const expectedOldValues = ['20', ...faces.slice(0, -1)];
    check(changes.length === faces.length && changes.every((item, index) => item.value === faces[index] && item.oldValue === expectedOldValues[index]), 'Exact native face text mutations', changes);
    check(cadence.every(delta => delta >= 40 && delta <= 80), 'Captured 50 ms face cadence', cadence);
    check(scans.cards === 0, 'Known spinning D20 face changes must not enumerate all message cards', { scans: scans.cards, mutations: changes });
    const spinningPasses = scans.cards;
    check(die.getAnimations().includes(spin) && spin.playState === 'running' && Number(spin.currentTime) > spinningAtStart,
      'Native animation identity and progress must survive changing faces', { sameAnimation: die.getAnimations().includes(spin), state: spin.playState, start: spinningAtStart, end: spin.currentTime });
    const spinningEvidence = { sameObject: die.getAnimations().includes(spin), animationName: spin.animationName,
      playState: spin.playState, start: spinningAtStart, end: spin.currentTime };
    const cardAtEnd = rect(cards[39]);
    const dieGeometryAtEnd = { box: localRect(die), width: getComputedStyle(die).width, height: getComputedStyle(die).height,
      clientWidth: die.clientWidth, clientHeight: die.clientHeight };
    const closeRect = (a, b) => ['x', 'y', 'width', 'height'].every(key => Math.abs(a[key] - b[key]) <= 1);
    check(closeRect(cardAtStart, cardAtEnd) && JSON.stringify(dieGeometryAtStart) === JSON.stringify(dieGeometryAtEnd),
      'Card layout and SVG local geometry remain stable through intended rotation', { cardAtStart, cardAtEnd, dieGeometryAtStart, dieGeometryAtEnd });
    textObserver.disconnect(); textObserver = null;
    check(cards.every((card, index) => card === list.children[index].firstElementChild && card.isConnected), 'Native card identities retained');
    check(prose.every((body, index) => body === cards[index].firstElementChild && body.isConnected)
      && proseNodes.every((node, index) => node === prose[index].firstChild.firstChild && node.isConnected), 'Native prose identities retained');
    check(draft.firstChild === draftNode && draft.textContent === 'Preserve editor draft.', 'Editor draft identity retained');

    die.classList.remove('animate-spin');
    await until(() => die.getAnimations().every(animation => animation.animationName !== 'fixture-spin'), 'Native spin class removal');
    face.data = '20';
    await until(() => die.dataset.ffDesktopCriticalDie === 'natural20', 'Settled natural 20 restored');
    check(getComputedStyle(die.querySelector('.cls-4')).fill === 'rgb(229, 183, 59)', 'Settled natural 20 critical paint');
    face.data = '1';
    await until(() => die.dataset.ffDesktopCriticalDie === 'natural1', 'Settled natural 1 critical paint');
    check(getComputedStyle(die.querySelector('.cls-4')).fill === 'rgb(165, 29, 45)', 'Settled natural 1 critical paint');
    face.data = '13';
    await until(() => !die.hasAttribute('data-ff-desktop-critical-die'), 'Ordinary settled face clears critical paint');

    const beforeNativeClass = scans.cards;
    cards[1].classList.add('native-class-change');
    await until(() => scans.cards > beforeNativeClass, 'Ordinary native class mutation still schedules a scan');
    check(cards[39].getBoundingClientRect().height === initial20.height, 'History card geometry remains stable after ordinary scan');
    return {
      passed: true,
      initialScans,
      spinningCardEnumerationPasses: spinningPasses,
      changes,
      cadence,
      spin: spinningEvidence,
      geometry: { cardAtStart, cardAtEnd, dieGeometryAtStart, dieGeometryAtEnd },
      retained: { cards: cards.length, proseNodes: proseNodes.length, draft: draftNode.data },
      settled: { natural20: 'rgb(229, 183, 59)', natural1: 'rgb(165, 29, 45)', ordinaryFace: face.data },
      ordinaryMutationScans: scans.cards - beforeNativeClass,
    };
  } finally {
    textObserver?.disconnect();
    window.__friendsFablesDesktopChatAppearance?.dispose();
    if (querySelectorAllDescriptor) Object.defineProperty(document, 'querySelectorAll', querySelectorAllDescriptor);
    else delete document.querySelectorAll;
  }
}

module.exports = { prepare, scenario };
if (!process.versions.electron) {
  console.log('ROLLING_D20_SCAN_STATIC', JSON.stringify(prepare().metadata));
} else {
  const { app, BrowserWindow, session } = require('electron');
  let win, ownedProfile;
  app.on('window-all-closed', () => {});
  const deadline = setTimeout(() => { console.error('Rolling D20 scan fixture hard 15s deadline'); win?.destroy(); app.exit(1); }, 15000);
  (async () => {
    let passed = false;
    try {
      const code = prepare(); console.log('ROLLING_D20_SCAN_SOURCE', JSON.stringify(code.metadata));
      ownedProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-rolling-d20-scan-'));
      app.setPath('userData', ownedProfile);
      await app.whenReady();
      const site = session.fromPartition(`rolling-d20-scan-${process.pid}`);
      site.protocol.handle('https', () => new Response('<!doctype html><html><head></head><body></body></html>', { headers: { 'Content-Type': 'text/html' } }));
      win = new BrowserWindow({ show: false, width: 1100, height: 900, webPreferences: { session: site, sandbox: true, contextIsolation: true, nodeIntegration: false } });
      await win.loadURL('https://play.fables.gg/campaign-a/play');
      win.show(); win.focus(); win.webContents.focus();
      const readyBy = Date.now() + 2000;
      let ready = false;
      while (Date.now() < readyBy) {
        ready = await win.webContents.executeJavaScript("document.visibilityState === 'visible' && document.hasFocus()");
        if (win.isVisible() && win.isFocused() && ready) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert(win.isVisible() && win.isFocused() && ready, 'Fixture visibility/focus precondition');
      const result = await win.webContents.executeJavaScript(`(${scenario.toString()})(${JSON.stringify(code.source)},${JSON.stringify(code.settings)},${JSON.stringify(code.css)})`);
      console.log('ROLLING_D20_SCAN_RESULT', JSON.stringify(result));
      assert.equal(result.passed, true, 'Rolling D20 scan contract');
      passed = true;
    } catch (error) {
      console.error(error);
    } finally {
      clearTimeout(deadline); win?.destroy();
      if (ownedProfile) fs.rmSync(ownedProfile, { recursive: true, force: true });
      app.exit(passed ? 0 : 1);
    }
  })();
}
