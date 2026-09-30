import type { MessageStyle } from './themes';

// Four fixed-size corner motifs keep their proportions on a wide message or a
// tall context panel. CSS pseudo-elements add no controls and intercept no input.
export function borderCss(style: MessageStyle, target: string, compact = false): string {
  const { enabled, color, width, radius, variant } = style.border;
  let css = `${target} { border: ${enabled ? `${width}px solid ${color}` : '0 solid transparent'} !important; border-radius: ${radius}px !important; }`;
  if (!enabled || variant === 'plain') return css;
  const motifs = {
    ornate: '<path d="M3 36V12Q3 3 12 3H36 M7 32V13Q7 7 13 7H32 M11 27V11H27 M34 3l6 6 M3 34l6 6"/>',
    arcane: '<path d="M3 33V3H33 M8 28V8H28 M15 3l6 6-6 6-6-6Z M3 15l6 6 6-6-6-6Z M30 3l7 7 M3 30l7 7"/>',
    runic: '<path d="M3 34V3H34 M8 29V8H29 M13 3v9l6 6v-9l-6-6 M3 13h9l6 6H9l-6-6 M25 3v7h7 M3 25h7v7"/>',
  };
  const corners = ['', 'translate(42 0) scale(-1 1)', 'translate(0 42) scale(1 -1)', 'translate(42 42) scale(-1 -1)'];
  const images = corners.map(transform => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42"><g transform="${transform}" fill="none" stroke="${color}" stroke-width="${Math.max(.8, width / 1.5)}" stroke-linecap="round" stroke-linejoin="round">${motifs[variant]}</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });
  css += `${target} { position: relative; padding: ${compact ? 12 : 20}px !important;
      min-height: ${compact ? 40 : 72}px; box-sizing: border-box;
      box-shadow: inset 0 0 0 ${width}px color-mix(in srgb, ${color} 35%, transparent) !important; }
    ${target}::after { content: ""; position: absolute; inset: 3px; pointer-events: none; z-index: 1;
      background-image: ${images.join(',')}; background-position: top left, top right, bottom left, bottom right;
      background-repeat: no-repeat; background-size: ${compact ? 16 : 32}px ${compact ? 16 : 32}px;
      border-radius: ${Math.max(0, radius - 3)}px; border: ${variant === 'ornate' ? '1px' : '0'} solid color-mix(in srgb, ${color} 55%, transparent); }`;
  return css;
}
