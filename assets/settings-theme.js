// Shared palette for bundled settings. No website scripts or styles are used.
(() => {
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (color, target, amount) => `rgb(${color.map((c, i) => Math.round(c + (target[i] - c) * amount)).join(',')})`;
  window.settingsTheme = {
    apply(settings) {
      const base = { website: '#010b0e', amoled: '#000000', black: '#101010', light: '#f5f5f5' }[settings.preset] ?? settings.customColor;
      const color = rgb(base);
      const l = color.map(c => { const n = c / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      const light = l[0] * .2126 + l[1] * .7152 + l[2] * .0722 > .179;
      const target = light ? [0, 0, 0] : [255, 255, 255];
      const properties = { bg: base, fg: light ? '#111111' : '#f5f5f5', panel: mix(color, target, .065),
        muted: mix(color, target, .72), border: mix(color, target, .28), hover: mix(color, target, .5),
        selected: mix(color, target, .13), accent: light ? '#71501b' : '#d8bb82',
        'accent-text': light ? '#ffffff' : '#191713', focus: light ? '#78551c' : '#f1d9a8', error: light ? '#a02121' : '#efa199' };
      for (const [name, value] of Object.entries(properties)) document.documentElement.style.setProperty(`--ui-${name}`, value);
      document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    },
  };
})();
