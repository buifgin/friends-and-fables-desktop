/** Scoped styles for the native battle action slide panel. */
export const combatPanelCss = `
  :root {
    --ff-combat-rail-width: 64px;
    --ff-combat-rail-top: 0px;
    --ff-combat-width: min(clamp(280px, 28vw, 390px), calc(100vw - var(--ff-combat-rail-width) - 8px));
  }

  [data-ff-combat-controls],
  [data-ff-combat-panel],
  [data-ff-combat-docked],
  [data-ff-combat-chat] {
    box-sizing: border-box;
    font: inherit;
  }

  [data-ff-combat-controls] {
    display: contents;
  }

  [data-ff-combat-controls][hidden] {
    display: none !important;
  }

  [data-ff-combat-controls][data-ff-combat-controls-fallback] {
    position: fixed;
    z-index: 52;
    left: 0;
    top: calc(var(--ff-combat-rail-top) + (100dvh - var(--ff-combat-rail-top)) / 2);
    display: flex;
    width: var(--ff-combat-rail-width);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transform: translateY(-50%);
    pointer-events: none;
  }

  [data-ff-combat-controls-group][data-ff-combat-controls-compact] {
    gap: 8px !important;
  }

  [data-ff-combat-controls-group] {
    padding-bottom: 48px !important;
  }

  [data-ff-combat-controls-group] ~ .absolute:has(> button > svg:is(.lucide-chevron-right, .lucide-chevron-left)) {
    top: var(--ff-combat-controls-bottom, 50%) !important;
    transform: none !important;
  }

  [data-ff-combat-controls] [data-ff-combat-mode] {
    display: inline-flex !important;
    box-sizing: border-box;
    width: 40px !important;
    min-width: 40px !important;
    height: 40px !important;
    min-height: 40px !important;
    flex: none;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    cursor: pointer;
    pointer-events: auto;
    transition: color 200ms ease, background-color 200ms ease;
  }

  [data-ff-combat-controls] [data-ff-combat-mode]:hover:not(:disabled) {
    background: transparent;
  }

  [data-ff-combat-controls] [data-ff-combat-mode]:focus-visible {
    outline: 2px solid hsl(var(--ring, var(--primary, 0 0% 70%)));
    outline-offset: 3px;
  }

  [data-ff-combat-controls] [data-ff-combat-mode] svg {
    display: block;
    width: 20px;
    height: 20px;
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
    inset: var(--ff-combat-rail-top) auto 0 calc(var(--ff-combat-rail-width) - var(--ff-combat-width)) !important;
    top: var(--ff-combat-rail-top) !important;
    left: calc(var(--ff-combat-rail-width) - var(--ff-combat-width)) !important;
    width: var(--ff-combat-width) !important;
    min-width: 0 !important;
    max-width: var(--ff-combat-width) !important;
    height: calc(100vh - var(--ff-combat-rail-top)) !important;
    height: calc(100dvh - var(--ff-combat-rail-top)) !important;
    max-height: calc(100vh - var(--ff-combat-rail-top)) !important;
    max-height: calc(100dvh - var(--ff-combat-rail-top)) !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: auto;
    overscroll-behavior: contain;
    border: 0 !important;
    border-right: 1px solid hsl(var(--border, 0 0% 50%)) !important;
    border-radius: 0 !important;
    background: color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 92%, transparent) !important;
    color: hsl(var(--foreground, 0 0% 96%)) !important;
    box-shadow: none !important;
    transform: none !important;
    translate: none !important;
    transition: left 240ms cubic-bezier(.2, .75, .25, 1);
    scrollbar-gutter: stable;
  }

  html[data-ff-combat-open="true"] [data-ff-combat-panel],
  html[data-ff-combat-open="true"] [data-ff-combat-docked] {
    left: var(--ff-combat-rail-width) !important;
  }

  [data-ff-combat-controls] [data-ff-combat-mode][aria-pressed="true"] {
    color: hsl(var(--primary, var(--foreground, 0 0% 96%)));
  }

  [data-ff-combat-controls] [data-ff-combat-mode]:disabled { cursor: not-allowed; opacity: .55; }

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

  [data-ff-combat-docked] [role="tablist"] {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 6px !important;
    height: auto !important;
    min-height: 0 !important;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  [data-ff-combat-docked] [role="tab"] {
    min-width: 0 !important;
    max-width: 100%;
    min-height: 44px;
    height: auto;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: center;
  }

  [data-ff-combat-docked] [role="tablist"] [role="tab"] {
    padding-inline: 4px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  [data-ff-combat-docked] form {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }

  [data-ff-combat-docked] [role="tablist"] + div[class*="max-h-"] {
    box-sizing: border-box;
    width: 100%;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 100%;
    max-height: none !important;
    overflow: visible !important;
  }

  [data-ff-combat-docked] > div[class*="overflow-y-auto"] {
    box-sizing: border-box;
    width: 100%;
    height: auto !important;
    min-height: 0;
    max-height: none;
    overflow: visible !important;
  }

  [data-ff-combat-docked] div[class~="p-6"] {
    padding: 12px !important;
    height: auto !important;
  }

  [data-ff-combat-docked] div[class~="p-4"] { padding: 8px !important; }

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

  [data-ff-combat-docked] button {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  [data-ff-combat-docked] button[hidden] {
    display: none !important;
  }

  [data-ff-combat-docked] button svg {
    flex: none;
  }

  [data-ff-combat-docked] button.group:has(> div > svg.lucide) {
    flex-direction: column !important;
    align-items: center !important;
    text-align: center;
    height: auto !important;
    min-height: 72px !important;
    padding: 8px !important;
    gap: 6px !important;
    border: 1px solid hsl(var(--border, 0 0% 50%)) !important;
    border-radius: 6px !important;
    line-height: 1.25 !important;
  }

  [data-ff-combat-docked] button.group:has(> div > svg.lucide) > div:first-child {
    flex: none !important;
  }

  [data-ff-combat-docked] button.group:has(> div > svg.lucide) > div:first-child svg {
    width: 24px !important;
    height: 24px !important;
  }

  [data-ff-combat-docked] button.group:has(> div > svg.lucide) > span {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
    text-align: center;
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
    padding: 8px 12px;
    box-sizing: border-box;
  }

  [data-ff-combat-docked][data-ff-desktop-message="roll-menu"] .relative:has(> [role="combobox"]) > button:has(.lucide-chevron-left) {
    grid-column: 1;
    grid-row: 1;
    justify-self: start;
    min-width: 0;
    max-width: 100%;
    padding-inline: 8px;
    min-height: 34px;
  }

  [data-ff-combat-docked][data-ff-desktop-message="roll-menu"] .relative:has(> [role="combobox"]) > [role="combobox"] {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    min-width: 0 !important;
    max-width: 100%;
    width: auto;
    min-height: 34px;
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

  [data-ff-combat-controls] [data-ff-combat-mode]:focus-visible {
    outline: 2px solid hsl(var(--ring, var(--primary, 0 0% 70%)));
    outline-offset: 2px;
  }

  [data-ff-combat-docked]::backdrop {
    background: transparent;
    pointer-events: none;
  }

  [data-ff-combat-docked] {
    isolation: isolate;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  [data-ff-combat-docked]::before {
    content: "";
    position: fixed;
    z-index: -1;
    top: var(--ff-combat-rail-top);
    left: var(--ff-combat-rail-width);
    width: var(--ff-combat-width);
    height: calc(100vh - var(--ff-combat-rail-top));
    height: calc(100dvh - var(--ff-combat-rail-top));
    background: transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 240ms cubic-bezier(.2, .75, .25, 1);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  html[data-ff-combat-open="true"] [data-ff-combat-docked]::before { opacity: 1; }

  html[data-ff-combat-open="true"] [data-ff-combat-chat] {
    padding-left: var(--ff-combat-width);
    box-sizing: border-box;
  }

  main:has([data-ff-combat-chat]) {
    scrollbar-gutter: stable;
  }

  [data-ff-combat-heading],
  [data-ff-combat-docked] > h2:not(.hidden):not([hidden]) {
    position: sticky;
    z-index: 1;
    top: 0;
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 48px;
    padding: 8px 48px 8px 12px;
    border-bottom: 1px solid hsl(var(--border, 0 0% 50%));
    background: transparent;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    white-space: normal;
    overflow-wrap: break-word;
  }

  [data-ff-combat-close] {
    position: fixed !important;
    top: calc(var(--ff-combat-rail-top) + 8px) !important;
    left: calc(var(--ff-combat-rail-width) + var(--ff-combat-width) - 42px) !important;
    right: auto !important;
    bottom: auto !important;
    z-index: 2 !important;
    display: grid !important;
    width: 34px !important;
    min-width: 34px !important;
    height: 34px !important;
    flex: none !important;
    place-items: center !important;
    margin: 0 !important;
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
    [data-ff-combat-panel], [data-ff-combat-docked] {
      width: var(--ff-combat-width) !important;
      max-width: var(--ff-combat-width) !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-ff-combat-controls], [data-ff-combat-mode], [data-ff-combat-panel], [data-ff-combat-docked] {
      scroll-behavior: auto;
      transition-duration: 0.01ms;
    }
  }
`;

/** Validated imported chat image and the existing global image effects. */
export interface CombatPanelAmbient {
  image: string | null;
  fit: 'cover' | 'contain';
  effects: { blur: number; opacity: number; overlayColor: string; overlayOpacity: number };
}

/** One appearance policy for lists and detail forms; only background layers fade. */
export function combatPanelAppearanceCss(
  settings: { enabled: boolean; color: string; opacity: number; blur: number },
  ambient?: CombatPanelAmbient,
): string {
  const hex = (value: string, fallback: string) => /^#[\da-f]{6}$/i.test(value) ? value : fallback;
  const range = (value: number | undefined, max: number, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : fallback;
  const image = !settings.enabled && ambient?.image ? ambient.image : null;
  const fill = settings.enabled
    ? `color-mix(in srgb, ${hex(settings.color, '#101010')} ${range(settings.opacity, 1, .92) * 100}%, transparent)`
    : 'color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 92%, transparent)';
  const blur = settings.enabled ? range(settings.blur, 30, 12) : 12;
  const imageBlur = range(ambient?.effects.blur, 30, 0);
  const imageOpacity = range(ambient?.effects.opacity, 1, 1);
  const overlay = hex(ambient?.effects.overlayColor ?? '', '#000000');
  const overlayOpacity = range(ambient?.effects.overlayOpacity, 1, 0);
  // Repeated ownership attributes beat theme/dialog and dice-card rules regardless
  // of whether a selected detail contains the native die SVG.
  const surface = ':is([data-ff-combat-docked][data-ff-combat-docked][data-ff-combat-docked], [data-ff-combat-panel][data-ff-combat-panel][data-ff-combat-panel])';
  return `
    ${surface} {
      background: ${fill} !important;
      color: hsl(var(--foreground, 0 0% 96%)) !important;
      border: 0 !important;
      border-right: 1px solid hsl(var(--border, 0 0% 50%)) !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      isolation: isolate;
      transform: none !important;
      translate: none !important;
      filter: none !important;
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }
    ${surface}::before, ${surface}::after {
      content: "" !important;
      position: fixed !important;
      inset: var(--ff-combat-rail-top) auto auto var(--ff-combat-rail-width) !important;
      width: var(--ff-combat-width) !important;
      height: calc(100dvh - var(--ff-combat-rail-top)) !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      pointer-events: none !important;
      clip-path: inset(0);
    }
    ${surface}::before {
      z-index: -2;
      background: ${image ? `url(${JSON.stringify(image)}) center / ${ambient?.fit === 'contain' ? 'contain' : 'cover'} no-repeat` : 'transparent'} !important;
      filter: ${image ? `blur(${imageBlur}px)` : 'none'} !important;
      -webkit-backdrop-filter: blur(${blur}px) !important;
      backdrop-filter: blur(${blur}px) !important;
      opacity: 0 !important;
    }
    ${surface}::after {
      z-index: -1;
      background: ${image ? `color-mix(in srgb, ${overlay} ${overlayOpacity * 100}%, transparent)` : 'transparent'} !important;
      opacity: 0 !important;
    }
    html[data-ff-combat-open="true"] ${surface}::before { opacity: ${image ? imageOpacity : 1} !important; }
    html[data-ff-combat-open="true"] ${surface}::after { opacity: 1 !important; }
    ${surface} :is([data-ff-combat-heading], h2) {
      background: transparent !important;
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }
    ${surface} :is(div, section, form, fieldset):not([role="alert"]):is(
      [class*="bg-card"], [class*="bg-background"], [class*="bg-popover"],
      [class*="bg-muted"], [class*="bg-gray-"], [class*="bg-slate-"],
      [class*="bg-[#0a0d14]"], [class*="bg-[#1a1f2e]"]
    ) {
      background: transparent !important;
    }
    ${surface} :is(button.group:has(> div > svg.lucide), [role="tab"], input, select, textarea, [role="combobox"]) {
      background: color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 72%, transparent) !important;
      color: hsl(var(--foreground, 0 0% 96%)) !important;
      border-color: hsl(var(--border, 0 0% 50%)) !important;
    }
    ${surface} button.group:has(> div > svg.lucide) :is(span, div) { color: inherit !important; }
    ${surface} :is(button.group:has(> div > svg.lucide), [role="tab"]):hover:not(:disabled) {
      background: color-mix(in srgb, hsl(var(--muted, 0 0% 24%)) 88%, transparent) !important;
    }
    ${surface} :is(button.group:has(> div > svg.lucide), [role="tab"])[aria-selected="true"] {
      border-color: hsl(var(--primary, 0 0% 70%)) !important;
    }
  `;
}
