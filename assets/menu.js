for (const button of document.querySelectorAll('button[data-menu]')) {
  button.addEventListener('click', () => {
    void window.desktopMenu.open(button.dataset.menu, button.getBoundingClientRect().left).catch(console.error);
  });
}
