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
    z-index: 2147482000;
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
    position: fixed;
    z-index: 2147481999;
    inset: 0 auto 0 0;
    width: clamp(320px, 28vw, 390px);
    max-width: min(390px, calc(100vw - 64px));
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
    margin: 0;
    padding: 0;
    overflow: auto;
    overscroll-behavior: contain;
    border: 0;
    border-right: 1px solid hsl(var(--border, 0 0% 50%));
    border-radius: 0;
    background: color-mix(in srgb, hsl(var(--card, 0 0% 12%)) 92%, transparent);
    color: hsl(var(--foreground, 0 0% 96%));
    box-shadow: 5px 0 24px #0003;
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    transform: translateX(-102%);
    transition: transform 240ms cubic-bezier(.2, .75, .25, 1);
    scrollbar-gutter: stable;
  }

  html[data-ff-combat-open="true"] [data-ff-combat-panel],
  html[data-ff-combat-open="true"] [data-ff-combat-docked] {
    transform: translateX(0);
  }

  [data-ff-combat-docked]::backdrop {
    background: transparent;
    pointer-events: none;
  }

  html[data-ff-combat-open="true"] [data-ff-combat-launcher] {
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
    top: 0;
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
    display: grid;
    width: 34px;
    height: 34px;
    flex: none;
    place-items: center;
    padding: 0;
    border: 1px solid hsl(var(--border, 0 0% 50%));
    border-radius: 50%;
    background: transparent;
    color: inherit;
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
    [data-ff-combat-panel], [data-ff-combat-docked] { max-width: calc(100vw - 64px); }
    html[data-ff-combat-open="true"] [data-ff-combat-launcher] { left: calc(100vw - 52px); }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-ff-combat-launcher], [data-ff-combat-panel], [data-ff-combat-docked] {
      scroll-behavior: auto;
      transition-duration: 0.01ms;
    }
  }
`;
