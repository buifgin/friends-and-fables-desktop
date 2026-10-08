/** Scoped styles for the native battle action slide panel. */
export const combatPanelCss = `
  [data-ff-combat-launcher],
  [data-ff-combat-panel],
  [data-ff-combat-docked],
  [data-ff-combat-chat] {
    box-sizing: border-box;
    font: inherit;
  }

  [data-ff-combat-launcher] {
    position: fixed;
    z-index: 49;
    left: 12px;
    top: 50%;
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    padding: 0;
    border: 1px solid hsl(var(--border, 0 0% 50%));
    border-radius: 50%;
    background: color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 90%, transparent);
    color: hsl(var(--foreground, 0 0% 96%));
    box-shadow: 0 3px 14px #0005;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    cursor: pointer;
    transform: translateY(-50%);
    transition: left 220ms ease, background-color 160ms ease, box-shadow 160ms ease;
  }

  [data-ff-combat-launcher]:hover {
    background: hsl(var(--muted, 0 0% 24%));
    box-shadow: 0 4px 18px #0007;
  }

  [data-ff-combat-launcher]:focus-visible,
  [data-ff-combat-close]:focus-visible {
    outline: 2px solid hsl(var(--ring, var(--primary, 0 0% 70%)));
    outline-offset: 3px;
  }

  [data-ff-combat-launcher] svg,
  [data-ff-combat-close] svg {
    display: block;
    width: 21px;
    height: 21px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  [data-ff-combat-panel],
  [data-ff-combat-docked] {
    position: fixed !important;
    z-index: 49 !important;
    inset: 0 auto 0 0 !important;
    top: 0 !important;
    left: 0 !important;
    width: min(390px, calc(100vw - 64px)) !important;
    min-width: 0 !important;
    max-width: min(390px, calc(100vw - 64px)) !important;
    height: 100vh !important;
    height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    padding: 56px 0 0 !important;
    overflow: auto;
    overscroll-behavior: contain;
    border: 0 !important;
    border-right: 1px solid hsl(var(--border, 0 0% 50%)) !important;
    border-radius: 0 !important;
    background: color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 92%, transparent) !important;
    color: hsl(var(--foreground, 0 0% 96%)) !important;
    box-shadow: 5px 0 24px #0003 !important;
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    transform: translateX(-102%) !important;
    translate: none !important;
    transition: transform 240ms cubic-bezier(.2, .75, .25, 1);
    scrollbar-gutter: stable;
  }

  html[data-ff-combat-open="true"] [data-ff-combat-panel],
  html[data-ff-combat-open="true"] [data-ff-combat-docked] {
    transform: translateX(0) !important;
  }

  [data-ff-combat-tools]:not([hidden]) {
    position: fixed;
    z-index: 51;
    top: 0;
    left: 0;
    display: flex;
    width: min(390px, calc(100vw - 64px));
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 7px 12px;
    border-bottom: 1px solid hsl(var(--border, 0 0% 50%));
    background: color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 96%, transparent);
    color: hsl(var(--foreground, 0 0% 96%));
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  [data-ff-combat-mode] {
    min-width: 0;
    min-height: 34px;
    flex: 1 1 0;
    padding: 5px 10px;
    border: 1px solid hsl(var(--border, 0 0% 50%));
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: 1.25;
    text-align: center;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  [data-ff-combat-mode]:hover:not(:disabled) {
    background: hsl(var(--muted, 0 0% 24%));
  }

  [data-ff-combat-mode][aria-pressed="true"] {
    border-color: hsl(var(--primary, var(--border, 0 0% 50%)));
    background: hsl(var(--muted, 0 0% 24%));
  }

  [data-ff-combat-mode]:disabled { cursor: not-allowed; opacity: .55; }

  [data-ff-combat-docked] :is(form, fieldset, [role="tabpanel"]) {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  [data-ff-combat-docked] :is([role="tablist"], [role="list"]) {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 6px !important;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  [data-ff-combat-docked] [role="tab"] {
    min-width: 0 !important;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: center;
  }

  [data-ff-combat-docked] :is([class*="grid-cols"], [role="tabpanel"] > div) {
    min-width: 0;
    max-width: 100%;
  }

  [data-ff-combat-docked] :is([class*="grid-cols"], [role="tabpanel"] > div[class*="grid"]) {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)) !important;
  }

  [data-ff-combat-docked] :is(input, select, textarea, button, [role="combobox"]) {
    max-width: 100%;
    min-width: 0;
  }

  [data-ff-combat-docked] :is(table, pre) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }

  [data-ff-combat-tools]:not([hidden]) [data-ff-combat-mode]:focus-visible {
    outline: 2px solid hsl(var(--ring, var(--primary, 0 0% 70%)));
    outline-offset: 2px;
  }

  [data-ff-combat-docked]::backdrop {
    background: transparent;
    pointer-events: none;
  }

  html[data-ff-combat-open="true"] [data-ff-combat-launcher] {
    z-index: 51;
    left: calc(min(clamp(320px, 28vw, 390px), calc(100vw - 64px)) + 12px);
  }

  html[data-ff-combat-open="true"] [data-ff-combat-chat] {
    --ff-combat-width: min(clamp(320px, 28vw, 390px), calc(100vw - 64px));
    padding-left: var(--ff-combat-width);
    box-sizing: border-box;
  }

  [data-ff-combat-heading] {
    position: sticky;
    z-index: 1;
    top: 56px;
    display: flex;
    min-height: 48px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid hsl(var(--border, 0 0% 50%));
    background: color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 94%, transparent);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  [data-ff-combat-close] {
    display: grid !important;
    width: 34px !important;
    min-width: 34px !important;
    height: 34px !important;
    flex: none !important;
    place-items: center !important;
    padding: 0 !important;
    border: 1px solid hsl(var(--border, 0 0% 50%)) !important;
    border-radius: 50% !important;
    background: transparent !important;
    color: inherit !important;
    cursor: pointer;
  }

  [data-ff-combat-close]:hover { background: hsl(var(--muted, 0 0% 24%)); }

  [data-ff-combat-body] {
    min-width: 0;
    padding: 12px;
  }

  [data-ff-combat-panel] :is(button, input, select, textarea, [role="combobox"], [tabindex]):focus-visible,
  [data-ff-combat-docked] :is(button, input, select, textarea, [role="combobox"], [tabindex]):focus-visible {
    outline: 2px solid hsl(var(--ring, var(--primary, 0 0% 70%)));
    outline-offset: 2px;
  }

  [data-ff-combat-panel] :is(img, svg),
  [data-ff-combat-docked] :is(img, svg) { max-width: 100%; }

  @media (max-width: 520px) {
    [data-ff-combat-panel], [data-ff-combat-docked], [data-ff-combat-tools]:not([hidden]) {
      width: calc(100vw - 64px) !important;
      max-width: calc(100vw - 64px) !important;
    }
    html[data-ff-combat-open="true"] [data-ff-combat-launcher] { left: calc(100vw - 52px); }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-ff-combat-launcher], [data-ff-combat-panel], [data-ff-combat-docked], [data-ff-combat-tools] {
      scroll-behavior: auto;
      transition-duration: 0.01ms;
    }
  }
`;
