(() => {
  const bridge = window.windowControls;
  const words = { Fullscreen: 'Полный экран', 'Exit fullscreen': 'Выйти из полного экрана', Minimize: 'Свернуть', 'Exit app': 'Выйти из приложения', 'Window controls': 'Управление окном' };
  function render(state) {
    window.settingsTheme.apply(state.settings);
    document.documentElement.lang = state.locale;
    const text = value => state.locale === 'ru' ? words[value] : value;
    document.querySelector('nav').setAttribute('aria-label', text('Window controls'));
    for (const [id, label] of [['fullscreen', state.fullscreen ? 'Exit fullscreen' : 'Fullscreen'], ['minimize', 'Minimize'], ['quit', 'Exit app']]) {
      const button = document.getElementById(id);
      button.title = text(label); button.setAttribute('aria-label', text(label));
    }
    document.getElementById('fullscreen').setAttribute('aria-pressed', String(state.fullscreen));
  }
  for (const action of ['fullscreen', 'minimize', 'quit']) document.getElementById(action).addEventListener('click', () => void bridge.action(action).catch(console.error));
  bridge.onChange(render); bridge.get().then(render).catch(console.error);
})();
