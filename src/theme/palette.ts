import { contrast } from '@/lib/tone';

/**
 * The one accent. White type on it clears 5.6:1, so buttons and the tab bar carry white in both
 * modes.
 */
const ACCENT = { value: '#905479', on: '#FFFFFF' } as const;

export type ModeKey = 'light' | 'dark' | 'system';

function toRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Blends towards another colour. `amount` is 0 (unchanged) to 1 (fully it). */
export function mix(hex: string, towards: string, amount: number): string {
  const [r1, g1, b1] = toRgb(hex);
  const [r2, g2, b2] = toRgb(towards);
  return toHex(r1 + (r2 - r1) * amount, g1 + (g2 - g1) * amount, b1 + (b2 - b1) * amount);
}

/**
 * The accent pushed away from `background` until it clears `target` contrast, so one swatch serves
 * as a button fill and as a label (plain, it is only 3.1:1 on near-black).
 */
function readable(hex: string, background: string, target = 4.5): string {
  if (contrast(hex, background) >= target) return hex;

  // Away from the background: darker on a light page, lighter on a dark one.
  const towards =
    contrast('#000000', background) > contrast('#FFFFFF', background) ? '#000000' : '#FFFFFF';

  let best = hex;
  for (let step = 1; step <= 20; step += 1) {
    best = mix(hex, towards, step / 20);
    if (contrast(best, background) >= target) return best;
  }
  return best;
}

/**
 * The neutrals, which never depend on the accent. The dark ramp is built from #1B181F rather than
 * grey so every step keeps the same violet cast. The money pair comes from the artwork's chalky
 * rose plus a green of the same weight (not mint, so "money in" does not read as teal).
 */
const RAMPS = {
  light: {
    surface: '#FBF9F7',
    card: '#FFFFFF',
    ink: '#111111',
    body: '#2F2F2F',
    muted: '#6F6F6F',
    line: '#E5E1DC',
    // Both clear 4.5:1 on the page.
    moneyIn: '#2F7A55',
    moneyOut: '#B85040',
    // One step hotter than moneyOut; usually a 15px label, so it clears 5.5:1 on both surfaces.
    danger: '#B0453A',
  },
  dark: {
    surface: '#1B181F',
    card: '#2A2634',
    ink: '#F8F6FB',
    body: '#E4E0EA',
    muted: '#A7A1B2',
    line: '#3E3949',
    // The artwork's rose and a green of the same chalk; both clear 6:1 on the background.
    moneyIn: '#7FD6A0',
    moneyOut: '#ED7A7A',
    // moneyOut's rose lifted a step: 6.09:1 on the card, 7.26:1 on the page.
    danger: '#F08A86',
  },
} as const;

export type Scheme = 'light' | 'dark';

export type Tokens = {
  surface: string;
  card: string;
  ink: string;
  body: string;
  muted: string;
  line: string;
  /** The accent as a fill — buttons, the tab bar, chart bars, chips. */
  control: string;
  controlPressed: string;
  /** Type and icons drawn on top of `control`. */
  onControl: string;
  /** The accent as a fill, for anything that is not a control. */
  accent: string;
  /** The accent as type on the page, pushed until it is legible there. */
  accentInk: string;
  moneyIn: string;
  moneyOut: string;
  /** Destructive type and glyphs — Delete, Remove, Sign out. Never a fill. */
  danger: string;
};

export function buildTokens(scheme: Scheme): Tokens {
  const ramp = RAMPS[scheme];
  const accent = ACCENT;

  return {
    ...ramp,
    control: accent.value,
    // Darker on light chrome, lighter on dark, so the pressed feedback stays visible.
    controlPressed: mix(accent.value, scheme === 'dark' ? '#FFFFFF' : '#000000', 0.18),
    onControl: accent.on,
    accent: accent.value,
    accentInk: readable(accent.value, ramp.surface),
    moneyIn: ramp.moneyIn,
    moneyOut: ramp.moneyOut,
    danger: ramp.danger,
  };
}

/** `#RRGGBB` as the "R G B" channel list a CSS variable wants. */
function channels(hex: string): string {
  return toRgb(hex).join(' ');
}

export function tokenVars(tokens: Tokens): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [
      `--color-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      channels(value),
    ]),
  );
}
