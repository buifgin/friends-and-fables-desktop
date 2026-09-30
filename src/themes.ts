export type ThemePreset = 'website' | 'amoled' | 'black' | 'light' | 'custom';

export interface AppearanceSettings {
  preset: ThemePreset;
  customColor: string;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  preset: 'website',
  customColor: '#161616',
};

const PRESETS: ThemePreset[] = ['website', 'amoled', 'black', 'light', 'custom'];
type RGB = [number, number, number];

export function validateAppearance(value: unknown): AppearanceSettings {
  if (!value || typeof value !== 'object') throw new Error('Invalid appearance settings.');
  const { preset, customColor } = value as Record<string, unknown>;
  if (typeof preset !== 'string' || !PRESETS.includes(preset as ThemePreset)) {
    throw new Error('Choose a supported theme.');
  }
  if (typeof customColor !== 'string' || !/^#[\da-f]{6}$/i.test(customColor)) {
    throw new Error('Enter a color in #RRGGBB format.');
  }
  return { preset: preset as ThemePreset, customColor: customColor.toLowerCase() };
}

function rgb(hex: string): RGB {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as RGB;
}

function mix(color: RGB, target: RGB, amount: number): RGB {
  return color.map((channel, index) => Math.round(channel + (target[index] - channel) * amount)) as RGB;
}

function luminance(color: RGB): number {
  const channels = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: RGB, second: RGB): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

// The site's shared color variables contain HSL components, not hex values.
function hsl(color: RGB): string {
  const [red, green, blue] = color.map((channel) => channel / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const difference = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  if (difference) {
    if (max === red) hue = ((green - blue) / difference) % 6;
    else if (max === green) hue = (blue - red) / difference + 2;
    else hue = (red - green) / difference + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = difference ? difference / (1 - Math.abs(2 * lightness - 1)) : 0;
  return `${hue.toFixed(3)} ${(saturation * 100).toFixed(3)}% ${(lightness * 100).toFixed(3)}%`;
}

export function themeCss(settings: AppearanceSettings): string {
  if (settings.preset === 'website') return '';

  const color = settings.preset === 'amoled' ? '#000000'
    : settings.preset === 'black' ? '#101010'
    : settings.preset === 'light' ? '#f5f5f5' : settings.customColor;
  const background = rgb(color);
  const lightness = luminance(background);
  const dark = (1.05 / (lightness + 0.05)) >= ((lightness + 0.05) / 0.05);
  const foreground: RGB = dark ? [255, 255, 255] : [0, 0, 0];
  // Light panels move toward white; dark panels move slightly toward white.
  // AMOLED keeps every neutral background surface at exactly #000000.
  const surface = (amount: number): RGB => {
    if (settings.preset === 'amoled') return background;
    let result = mix(background, [255, 255, 255], dark ? amount : amount * 5);
    // Midtone custom colors leave little room for lighter dark panels.
    while (dark && contrast(foreground, result) < 4.5 && amount > 0) {
      amount = Math.max(0, amount - 0.005);
      result = mix(background, [255, 255, 255], amount);
    }
    return result;
  };
  const leastContrastBackground = dark ? surface(0.1) : background;
  let mutedText = foreground;
  for (let amount = 0.22; amount >= 0; amount -= 0.02) {
    const candidate = mix(foreground, background, amount);
    if (contrast(candidate, leastContrastBackground) >= 4.5) {
      mutedText = candidate;
      break;
    }
  }
  const border = mix(background, foreground, 0.22);
  const colors: Record<string, RGB> = {
    background,
    'background-light': surface(0.045),
    card: surface(0.025),
    'card-light': surface(0.06),
    'card-dark': background,
    popover: surface(0.04),
    muted: surface(0.08),
    input: surface(0.1),
    sidebar: background,
    'sidebar-background': background,
    border,
    'sidebar-border': border,
    'sidebar-ring': border,
    foreground,
    'foreground-muted': mutedText,
    'foreground-extra-muted': mutedText,
    'card-foreground': foreground,
    'card-foreground-muted': mutedText,
    'popover-foreground': foreground,
    'muted-foreground': mutedText,
    'sidebar-foreground': foreground,
  };
  const declarations = Object.entries(colors)
    .map(([name, value]) => `--${name}: ${hsl(value)} !important;`).join('\n');

  // Only shared neutral colors change. Background images and campaign artwork
  // are deliberately left alone, as are status colors and primary buttons.
  return `:root:root:root {\n${declarations}\ncolor-scheme: ${dark ? 'dark' : 'light'} !important;\n}`;
}
