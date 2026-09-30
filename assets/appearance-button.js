const button = document.getElementById('appearance-button');
function update(state) {
  window.settingsTheme.apply(state.settings);
  window.settingsLocale.set(state.locale);
  button.setAttribute('aria-expanded', String(state.open));
}
button.addEventListener('click', () => { void window.appearanceButton.toggle().catch(console.error); });
window.appearanceButton.onChange(update);
window.appearanceButton.get().then(update).catch(console.error);
