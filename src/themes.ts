export type ThemePreset = 'website' | 'amoled' | 'black' | 'light' | 'custom';

export interface AppearanceSettings {
  preset: ThemePreset;
  customColor: string;
  backgroundImage: string | null;
  backgroundName: string;
  backgroundFit: 'cover' | 'contain';
  backgroundEffects: { blur: number; opacity: number; overlayColor: string; overlayOpacity: number };
  messages: { enabled: boolean; player: MessageStyle; gm: MessageStyle };
  context: { enabled: boolean; style: MessageStyle; blocks: MessageStyle; bar: MessageStyle };
  events: { enabled: boolean; style: MessageStyle };
  dice: { enabled: boolean; style: MessageStyle; colorsEnabled: boolean; faceColor: string; edgeColor: string; numberColor: string; resultTextColor: string | null };
  linuxBlackMenu: boolean;
  linuxFloatingAppearance: boolean;
}

export interface MessageStyle {
  color: string; opacity: number; textColor: string | null;
  gradient: { enabled: boolean; color: string; angle: number; secondOpacity: number; balance: number };
  border: { enabled: boolean; color: string; width: number; radius: number; variant: 'plain' | 'ornate' | 'arcane' | 'runic' };
}
export interface AppearanceState extends AppearanceSettings { imagePreview: string | null; platform: string; canUndoReset: boolean }

const baseStyle = (color: string, opacity: number): MessageStyle => ({ color, opacity, textColor: null,
  gradient: { enabled: false, color: '#000000', angle: 90, secondOpacity: opacity, balance: 50 },
  border: { enabled: false, color: '#555555', width: 1, radius: 8, variant: 'plain' } });
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  preset: 'website',
  customColor: '#161616',
  backgroundImage: null,
  backgroundName: '',
  backgroundFit: 'cover',
  backgroundEffects: { blur: 0, opacity: 1, overlayColor: '#000000', overlayOpacity: 0 },
  messages: { enabled: false, player: baseStyle('#16202a', .85), gm: baseStyle('#101010', .85) },
  context: { enabled: false, style: baseStyle('#101010', 1),
    blocks: { ...baseStyle('#101010', 1), border: { enabled: true, color: '#444444', width: 1, radius: 8, variant: 'plain' } },
    bar: baseStyle('#101010', 1) },
  events: { enabled: false, style: { ...baseStyle('#17172b', 1), gradient: { enabled: true, color: '#000000', angle: 90, secondOpacity: 1, balance: 50 } } },
  dice: { enabled: false, style: baseStyle('#101010', 1), colorsEnabled: false,
    faceColor: '#7c3aed', edgeColor: '#d8bb82', numberColor: '#ffffff', resultTextColor: null },
  linuxBlackMenu: true,
  linuxFloatingAppearance: true,
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
  const input = value as Record<string, unknown>;
  const backgroundImage = input.backgroundImage ?? null;
  if (backgroundImage !== null && (typeof backgroundImage !== 'string' || !/^[a-f0-9]{64}\.png$/.test(backgroundImage))) {
    throw new Error('Choose an imported background image.');
  }
  const backgroundName = input.backgroundName ?? '';
  if (typeof backgroundName !== 'string' || backgroundName.length > 150) throw new Error('Invalid image name.');
  const backgroundFit = input.backgroundFit ?? 'cover';
  if (backgroundFit !== 'cover' && backgroundFit !== 'contain') throw new Error('Choose cover or contain.');
  const messages = input.messages ?? DEFAULT_APPEARANCE.messages;
  if (!messages || typeof messages !== 'object') throw new Error('Invalid message styles.');
  const styles = messages as Record<string, unknown>;
  if (typeof styles.enabled !== 'boolean') throw new Error('Invalid message style switch.');
  function messageStyle(raw: unknown): MessageStyle {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid message style.');
    const style = raw as Record<string, unknown>;
    if (typeof style.color !== 'string' || !/^#[\da-f]{6}$/i.test(style.color)
      || typeof style.opacity !== 'number' || !Number.isFinite(style.opacity) || style.opacity < 0 || style.opacity > 1) {
      throw new Error('Message colors need #RRGGBB format and opacity between 0 and 1.');
    }
    const textColor = style.textColor ?? null;
    if (textColor !== null && (typeof textColor !== 'string' || !/^#[\da-f]{6}$/i.test(textColor))) {
      throw new Error('Text colors need #RRGGBB format.');
    }
    const gradient = record(style.gradient ?? baseStyle('#000000', style.opacity).gradient);
    const border = record(style.border ?? baseStyle('#000000', 1).border);
    const variant = border.variant ?? 'plain';
    if (!['plain', 'ornate', 'arcane', 'runic'].includes(String(variant))) throw new Error('Choose a supported border style.');
    // Convert the earlier shared gradient-opacity multiplier into matching
    // endpoint opacity values, preserving already saved gradients.
    const legacyOpacity = range(gradient.opacity ?? 1, 0, 1);
    const opacity = gradient.secondOpacity === undefined && gradient.enabled ? style.opacity * legacyOpacity : style.opacity;
    const secondOpacity = range(gradient.secondOpacity ?? style.opacity * legacyOpacity, 0, 1);
    return { color: style.color.toLowerCase(), opacity, textColor: textColor?.toLowerCase() ?? null,
      gradient: { enabled: flag(gradient.enabled), color: hex(gradient.color), angle: range(gradient.angle, 0, 360),
        secondOpacity, balance: range(gradient.balance ?? 50, 0, 100) },
      border: { enabled: flag(border.enabled), color: hex(border.color), width: range(border.width, 1, 8), radius: range(border.radius, 0, 40), variant: variant as MessageStyle['border']['variant'] } };
  }
  function record(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid appearance options.');
    return raw as Record<string, unknown>;
  }
  function flag(raw: unknown): boolean {
    if (typeof raw !== 'boolean') throw new Error('Invalid appearance switch.');
    return raw;
  }
  function hex(raw: unknown): string {
    if (typeof raw !== 'string' || !/^#[\da-f]{6}$/i.test(raw)) throw new Error('Colors need #RRGGBB format.');
    return raw.toLowerCase();
  }
  function range(raw: unknown, min: number, max: number): number {
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < min || raw > max) throw new Error(`Appearance value must be between ${min} and ${max}.`);
    return raw;
  }
  // Migrate existing message preferences to an independent, solid context panel.
  const context = record(input.context ?? { ...DEFAULT_APPEARANCE.context, enabled: styles.enabled });
  const events = record(input.events ?? DEFAULT_APPEARANCE.events);
  const dice = record(input.dice ?? DEFAULT_APPEARANCE.dice);
  const effects = record(input.backgroundEffects ?? DEFAULT_APPEARANCE.backgroundEffects);
  const linuxBlackMenu = input.linuxBlackMenu ?? true;
  if (typeof linuxBlackMenu !== 'boolean') throw new Error('Invalid menu bar preference.');
  const contextStyle = messageStyle(context.style);
  const linuxFloatingAppearance = input.linuxFloatingAppearance ?? true;
  if (typeof linuxFloatingAppearance !== 'boolean') throw new Error('Invalid floating window preference.');
  const resultTextColor = dice.resultTextColor ?? null;
  return {
    preset: preset as ThemePreset, customColor: customColor.toLowerCase(),
    backgroundImage, backgroundName, backgroundFit,
    backgroundEffects: { blur: range(effects.blur, 0, 30), opacity: range(effects.opacity, 0, 1),
      overlayColor: hex(effects.overlayColor), overlayOpacity: range(effects.overlayOpacity, 0, 1) },
    messages: { enabled: styles.enabled, player: messageStyle(styles.player), gm: messageStyle(styles.gm) },
    context: { enabled: flag(context.enabled), style: contextStyle,
      blocks: messageStyle(context.blocks ?? { ...contextStyle, opacity: 1 }), bar: messageStyle(context.bar ?? contextStyle) },
    events: { enabled: flag(events.enabled), style: messageStyle(events.style) },
    dice: { enabled: flag(dice.enabled), style: messageStyle(dice.style), colorsEnabled: flag(dice.colorsEnabled),
      faceColor: hex(dice.faceColor), edgeColor: hex(dice.edgeColor), numberColor: hex(dice.numberColor),
      resultTextColor: resultTextColor === null ? null : hex(resultTextColor) },
    linuxBlackMenu, linuxFloatingAppearance,
  };
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

export function themeBackground(settings: AppearanceSettings): string {
  return settings.preset === 'website' ? '#010b0e' : settings.preset === 'amoled' ? '#000000'
    : settings.preset === 'black' ? '#101010'
    : settings.preset === 'light' ? '#f5f5f5' : settings.customColor;
}

export function messageForeground(style: MessageStyle, settings: AppearanceSettings): string {
  if (style.textColor) return style.textColor;
  // Account for opacity over the app color, rather than treating a transparent
  // white message as a solid white surface. Pictures can use a chosen text color.
  const colors = [
    ...(!style.gradient.enabled || style.gradient.balance > 0 ? [[style.color, style.opacity] as const] : []),
    ...(style.gradient.enabled && style.gradient.balance < 100 ? [[style.gradient.color, style.gradient.secondOpacity] as const] : []),
  ]
    .map(([color, opacity]) => mix(rgb(themeBackground(settings)), rgb(color), opacity));
  const score = (foreground: RGB) => Math.min(...colors.map(background => contrast(background, foreground)));
  return score([255, 255, 255]) >= score([0, 0, 0]) ? '#ffffff' : '#000000';
}

export function styleBackground(style: MessageStyle): string {
  if (!style.gradient.enabled) return 'none';
  // An even share preserves the original full-width blend. Moving the share
  // adds a solid region for the dominant color before/after that blend.
  const firstStop = Math.max(0, style.gradient.balance * 2 - 100);
  const secondStop = Math.min(100, style.gradient.balance * 2);
  return `linear-gradient(${style.gradient.angle}deg, ${rgba(style.color, style.opacity)} ${firstStop}%, ${rgba(style.gradient.color, style.gradient.secondOpacity)} ${secondStop}%)`;
}
export function rgba(color: string, opacity: number): string { return `rgba(${rgb(color).join(',')}, ${opacity})`; }

export function themeCss(settings: AppearanceSettings): string {
  if (settings.preset === 'website') return '';

  const color = themeBackground(settings);
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
  return `:root:root:root {\n${declarations}\ncolor-scheme: ${dark ? 'dark' : 'light'} !important;\n}
    :where(input, textarea, select, [contenteditable="true"]) {
      color: hsl(var(--foreground)) !important; -webkit-text-fill-color: hsl(var(--foreground)) !important;
      caret-color: hsl(var(--foreground)) !important;
    }
    :where(input, textarea)::placeholder { color: hsl(var(--foreground-muted)) !important; }`;
}
