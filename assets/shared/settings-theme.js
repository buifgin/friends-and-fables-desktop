// Shared palette for bundled settings. No website scripts or styles are used.
(() => {
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (color, target, amount) => `rgb(${color.map((c, i) => Math.round(c + (target[i] - c) * amount)).join(',')})`;
  const scope = ':root[data-ff-settings-controls]';
  const buttonExclusions = ':not([aria-current]):not([role="tab"]):not(.tab):not(.track):not(.remove):not(.settings-close-button):not(.close-library):not(#close):not(.theme-circle):not(.remove-saved-theme):not(.picture-choice)';
  const rules = [
    `${scope} body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }`,
    `${scope} body :is(button, input, select, textarea) { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }`,
    `${scope} body button${buttonExclusions} { color: var(--ui-accent-text); background-color: var(--ui-accent); border: 1px solid var(--ui-accent); border-radius: 8px; }`,
    `${scope} body button.secondary${buttonExclusions} { color: var(--ui-fg); background-color: transparent; border-color: var(--ui-border); }`,
    `${scope} body button${buttonExclusions}:not(:disabled):hover { background-color: var(--ui-hover); border-color: var(--ui-hover); filter: none; }`,
    `${scope} body button.secondary${buttonExclusions}:not(:disabled):hover { color: var(--ui-fg); background-color: var(--ui-selected); border-color: var(--ui-hover); }`,
    `${scope} body :is(input, select, textarea):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="hidden"]) { color: var(--ui-fg); background-color: var(--ui-panel); border: 1px solid var(--ui-border); border-radius: 6px; }`,
    `${scope} body input[type="text"]:invalid { border-color: var(--ui-error); }`,
    `${scope} body :is(button, input, select, textarea):focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }`,
  ];

  function installControlsStyle() {
    const root = document.documentElement;
    root.setAttribute('data-ff-settings-controls', '');
    const owner = document.querySelector('link[rel="stylesheet"]');
    const sheet = owner?.sheet;
    if (!owner || !sheet || owner.hasAttribute('data-ff-settings-controls-sheet')) return;
    const firstRule = sheet.cssRules.length;
    try {
      for (const rule of rules) sheet.insertRule(rule, sheet.cssRules.length);
      owner.setAttribute('data-ff-settings-controls-sheet', '');
    } catch (error) {
      while (sheet.cssRules.length > firstRule) sheet.deleteRule(firstRule);
      root.removeAttribute('data-ff-settings-controls');
      throw error;
    }
  }

  window.settingsTheme = {
    apply(settings) {
      installControlsStyle();
      const base = { website: '#010b0e', amoled: '#000000', black: '#101010', light: '#f5f5f5' }[settings.preset] ?? settings.customColor;
      const color = rgb(base);
      const l = color.map(c => { const n = c / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      const light = l[0] * .2126 + l[1] * .7152 + l[2] * .0722 > .179;
      const target = light ? [0, 0, 0] : [255, 255, 255];
      const properties = { bg: base, fg: light ? '#111111' : '#f5f5f5', panel: mix(color, target, .065),
        muted: mix(color, target, .72), border: mix(color, target, .28), hover: mix(color, target, .5),
        selected: mix(color, target, .13), accent: light ? '#71501b' : '#d8bb82', success: light ? '#285c26' : '#b4d1a7',
        'accent-text': light ? '#ffffff' : '#191713', focus: light ? '#78551c' : '#f1d9a8', error: light ? '#a02121' : '#efa199' };
      for (const [name, value] of Object.entries(properties)) document.documentElement.style.setProperty(`--ui-${name}`, value);
      document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    },
  };
})();
