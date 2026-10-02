const buttons = [...document.querySelectorAll('button[data-menu]')];
const dropdown = document.getElementById('dropdown');
let active = null;
function setLabels(state) {
  document.documentElement.lang = state.locale;
  document.querySelector('nav').hidden = !state.black;
  document.querySelector('nav').setAttribute('aria-label', state.locale === 'ru' ? 'Меню приложения' : 'Application menu');
  for (const item of state.items) {
    const button = buttons.find(button => button.dataset.menu === item.id);
    if (button) button.textContent = item.label;
  }
}
window.desktopMenu.onLabels(setLabels);
void window.desktopMenu.getLabels().then(setLabels).catch(console.error);

function open(button) {
  void window.desktopMenu.open(button.dataset.menu, button.getBoundingClientRect().left).catch(console.error);
}
function close() {
  hide();
  void window.desktopMenu.close().catch(console.error);
}
function hide() {
  active = null;
  dropdown.hidden = true;
  for (const button of buttons) button.setAttribute('aria-expanded', 'false');
}
window.desktopMenu.onHide(hide);
for (const button of buttons) {
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => open(button));
  button.addEventListener('mouseenter', () => { if (active && active !== button.dataset.menu) open(button); });
}
window.desktopMenu.onShow(menu => {
  active = menu.id;
  document.body.classList.add('menu-open');
  dropdown.replaceChildren();
  for (const item of menu.items) {
    if (item.separator) {
      const separator = document.createElement('hr');
      separator.setAttribute('role', 'separator');
      dropdown.append(separator);
      continue;
    }
    const button = document.createElement('button');
    button.setAttribute('role', 'menuitem');
    button.dataset.index = item.index;
    button.disabled = !item.enabled;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = `${item.checked ? '✓ ' : ''}${item.label}`;
    const shortcut = document.createElement('span');
    shortcut.className = 'accelerator';
    shortcut.textContent = item.accelerator;
    button.append(label, shortcut);
    button.addEventListener('click', () => { void window.desktopMenu.choose(item.index).catch(console.error); });
    dropdown.append(button);
  }
  for (const button of buttons) button.setAttribute('aria-expanded', String(button.dataset.menu === active));
  dropdown.hidden = false;
  const owner = buttons.find(button => button.dataset.menu === active);
  dropdown.setAttribute('aria-label', owner?.textContent ?? 'Application menu');
  dropdown.style.left = `${Math.max(4, Math.min(owner?.getBoundingClientRect().left ?? menu.x, innerWidth - dropdown.offsetWidth - 4))}px`;
  dropdown.querySelector('button:enabled')?.focus();
});
document.addEventListener('pointerdown', event => {
  if (active && !event.target.closest('nav, #dropdown')) close();
});
document.addEventListener('keydown', event => {
  if (!active) return;
  if (event.key === 'Escape') { event.preventDefault(); close(); return; }
  const index = buttons.findIndex(button => button.dataset.menu === active);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    open(buttons[(index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length]);
    return;
  }
  const items = [...dropdown.querySelectorAll('button:enabled')];
  const focused = items.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key)) {
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (focused + (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey) ? items.length - 1 : 1)) % items.length;
    items[next]?.focus();
  }
});
