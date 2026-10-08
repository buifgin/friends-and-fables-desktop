/** Scoped styles for the native battle action slide panel. */
export const combatPanelCss = `
  :root {
    --ff-combat-width: min(clamp(320px, 28vw, 390px), calc(100vw - 64px));
    --ff-combat-tools-height: 76px;
  }

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
    width: var(--ff-combat-width) !important;
    min-width: 0 !important;
    max-width: var(--ff-combat-width) !important;
    height: 100vh !important;
    height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    padding: var(--ff-combat-tools-height) 0 0 !important;
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
    box-sizing: border-box;
    width: var(--ff-combat-width);
    height: var(--ff-combat-tools-height);
    min-height: var(--ff-combat-tools-height);
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 10px;
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
    white-space: nowrap;
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

  [data-ff-combat-toolbar-close] {
    display: grid !important;
    width: 44px !important;
    min-width: 44px !important;
    height: 44px !important;
    flex: 0 0 44px !important;
    place-items: center !important;
    padding: 0 !important;
    border: 1px solid hsl(var(--border, 0 0% 50%)) !important;
    border-radius: 50% !important;
    background: transparent !important;
    color: inherit !important;
    cursor: pointer;
  }

  [data-ff-combat-toolbar-close]:hover { background: hsl(var(--muted, 0 0% 24%)) !important; }

  [data-ff-combat-docked] :is(form, fieldset, [role="tabpanel"]) {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  [data-ff-combat-docked] div[class*="min-w-"] {
    box-sizing: border-box;
    min-width: 0 !important;
    max-width: 100% !important;
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

  [data-ff-combat-docked] :is(p, [role="alert"]) {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    white-space: normal !important;
    overflow-wrap: anywhere;
  }

  [data-ff-combat-docked][data-ff-desktop-message="roll-menu"] .relative:has(> [role="combobox"]) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 8px;
    row-gap: 8px;
  }

  [data-ff-combat-docked][data-ff-desktop-message="roll-menu"] .relative:has(> [role="combobox"]) > button:has(.lucide-chevron-left) {
    grid-column: 1;
    grid-row: 1;
    justify-self: start;
    min-width: 0;
    max-width: 100%;
    padding-inline: 8px;
  }

  [data-ff-combat-docked][data-ff-desktop-message="roll-menu"] .relative:has(> [role="combobox"]) > [role="combobox"] {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    min-width: 0 !important;
    max-width: 100%;
    width: auto;
    padding-inline: 8px;
  }

  [data-ff-combat-docked][data-ff-desktop-message="roll-menu"] .relative:has(> [role="combobox"]) > div[class*="absolute"] {
    position: static !important;
    inset: auto !important;
    left: auto !important;
    top: auto !important;
    transform: none !important;
    translate: none !important;
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    text-align: center;
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
    left: calc(var(--ff-combat-width) + 12px);
  }

  html[data-ff-combat-open="true"] [data-ff-combat-chat] {
    padding-left: var(--ff-combat-width);
    box-sizing: border-box;
  }

  [data-ff-combat-heading] {
    position: sticky;
    z-index: 1;
    top: var(--ff-combat-tools-height);
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
      width: var(--ff-combat-width) !important;
      max-width: var(--ff-combat-width) !important;
    }
    html[data-ff-combat-open="true"] [data-ff-combat-launcher] { left: calc(var(--ff-combat-width) + 12px); }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-ff-combat-launcher], [data-ff-combat-panel], [data-ff-combat-docked], [data-ff-combat-tools] {
      scroll-behavior: auto;
      transition-duration: 0.01ms;
    }
  }
`;

/** Appearance overrides stay attached to the owned combat surfaces only. */
export function combatPanelAppearanceCss(settings: { enabled: boolean; color: string; opacity: number; blur: number }): string {
  if (!settings.enabled) return '';
  const color = /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#101010';
  const opacity = Number.isFinite(settings.opacity) && settings.opacity >= 0 && settings.opacity <= 100 ? settings.opacity / 100 : 0.92;
  const blur = Number.isFinite(settings.blur) && settings.blur >= 0 && settings.blur <= 30 ? settings.blur : 12;
  const fill = `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
  return `
    [data-ff-combat-docked], [data-ff-combat-panel] {
      background: ${fill} !important;
      -webkit-backdrop-filter: blur(${blur}px) !important;
      backdrop-filter: blur(${blur}px) !important;
    }
    [data-ff-combat-tools]:not([hidden]) {
      background: ${fill} !important;
      -webkit-backdrop-filter: blur(${blur}px) !important;
      backdrop-filter: blur(${blur}px) !important;
    }
    [data-ff-combat-docked] :is(div, section)[class*="bg-card"],
    [data-ff-combat-docked] :is(div, section)[class*="bg-background"],
    [data-ff-combat-docked] :is(div, section)[class*="bg-popover"],
    [data-ff-combat-docked] :is(div, section)[class*="bg-muted"],
    [data-ff-combat-panel] :is(div, section)[class*="bg-card"],
    [data-ff-combat-panel] :is(div, section)[class*="bg-background"],
    [data-ff-combat-panel] :is(div, section)[class*="bg-popover"],
    [data-ff-combat-panel] :is(div, section)[class*="bg-muted"] {
      background-color: transparent !important;
      background-image: none !important;
    }
  `;
}
