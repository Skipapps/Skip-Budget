import { contrast } from '@/lib/tone';

/**
 * The whole of the app's colour, in one place.
 *
 * Every surface in Skip is a neutral — off-white or near-black — and exactly
 * one colour is the user's. That is why the chrome was kept black: a themed app
 * that tints its greys as well ends up with twelve different apps to design,
 * and eleven of them look like a mistake. Here there is one ramp per mode and
 * one accent laid over it, so choosing sunflower changes what is highlighted
 * and nothing about what is readable.
 */

export type ModeKey = 'light' | 'dark' | 'system';

/** What the two modes are actually called, in the user's words. */
export const MODES = [
  { id: 'light', label: 'Light', caption: 'Warm off-white' },
  { id: 'dark', label: 'Dark', caption: 'Soft near-black' },
  { id: 'system', label: 'System', caption: 'Follows your phone' },
] as const;

/** The twelve. Values are what get stored, so they must not be reordered. */
export const ACCENTS = [
  { id: 'skip-green', label: 'Skip green', value: '#34C77B' },
  { id: 'sunflower', label: 'Sunflower', value: '#F5DE3F' },
  { id: 'coral', label: 'Coral', value: '#EF5F6B' },
  { id: 'sky', label: 'Sky', value: '#4EB3F0' },
  { id: 'tangerine', label: 'Tangerine', value: '#F58634' },
  { id: 'lime', label: 'Lime', value: '#A8CC4A' },
  { id: 'cocoa', label: 'Cocoa', value: '#B08155' },
  { id: 'sand', label: 'Sand', value: '#BFB59A' },
  { id: 'blush', label: 'Blush', value: '#F0D0DC' },
  { id: 'meadow', label: 'Meadow', value: '#C4EBB4' },
  { id: 'violet', label: 'Violet', value: '#8B7BF5' },
  { id: 'teal', label: 'Teal', value: '#2DC9B5' },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];

/**
 * Tangerine on install.
 *
 * It is the closest of the twelve to the coral the illustrations are drawn in,
 * so a fresh install looks like one app rather than a green shell around orange
 * artwork. One line to change if the brand moves.
 */
export const DEFAULT_ACCENT: AccentId = 'tangerine';
export const DEFAULT_MODE: ModeKey = 'system';

export function accentValue(id: AccentId): string {
  return (ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0]).value;
}

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

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

/** The one of black or white that reads better on this colour. */
export function onColor(hex: string): string {
  return contrast('#111111', hex) >= contrast('#FFFFFF', hex) ? '#111111' : '#FFFFFF';
}

/**
 * The accent, pushed until it can be read as type on a given background.
 *
 * Sunflower and blush are fine as a button fill and illegible as a label; the
 * same swatch has to do both jobs. Rather than banning the light half of the
 * palette, the text form is walked away from the background until it clears
 * the WCAG bar — sunflower becomes a deep amber, blush a dusty rose, and both
 * still read as the colour that was chosen.
 */
export function readable(hex: string, background: string, target = 4.5): string {
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

// ---------------------------------------------------------------------------
// The tokens themselves
// ---------------------------------------------------------------------------

/**
 * The neutrals, which never depend on the accent.
 *
 * The dark ramp is built up from #1B181F rather than from grey, and keeping
 * that violet cast through every step is the point of hand-picking them: a
 * neutral tint of a warm background reads as a different, colder material
 * sitting on top of it, which is what makes a dark theme look assembled from
 * parts. Every step here is the same colour at a different weight.
 *
 * The money pair comes from the illustrations rather than from a signal
 * palette. The artwork is drawn in chalky pastels — rose, mint, wheat, indigo
 * — and a saturated red beside them looks like an error dialog that wandered
 * in. Rose is taken from the artwork exactly; the green is its sibling at the
 * same weight, green rather than the artwork's mint because a figure that
 * means "money in" should not read as teal.
 */
const RAMPS = {
  light: {
    surface: '#FBF9F7',
    card: '#FFFFFF',
    ink: '#111111',
    body: '#2F2F2F',
    muted: '#6F6F6F',
    line: '#E5E1DC',
    // Sage and dusty terracotta rather than bottle green and brick. Both clear
    // 4.5:1 on the page — there is a floor to how light type can go on
    // off-white, and these sit just above it rather than well under it.
    moneyIn: '#2F7A55',
    moneyOut: '#B85040',
  },
  dark: {
    surface: '#1B181F',
    card: '#2A2634',
    ink: '#F8F6FB',
    body: '#E4E0EA',
    muted: '#A7A1B2',
    line: '#3E3949',
    // The artwork's own rose, and a green of the same chalk. Both clear 6:1 on
    // the background, where the light pair would be an unreadable smudge.
    moneyIn: '#7FD6A0',
    moneyOut: '#ED7A7A',
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
};

/** Resolves one mode and one accent into every colour the app draws with. */
export function buildTokens(scheme: Scheme, accent: string): Tokens {
  const ramp = RAMPS[scheme];

  return {
    ...ramp,
    control: accent,
    // Pressed reads as "further in", which is darker on light chrome and
    // lighter on dark. Following the scheme keeps the feedback visible either way.
    controlPressed: mix(accent, scheme === 'dark' ? '#FFFFFF' : '#000000', 0.18),
    onControl: onColor(accent),
    accent,
    accentInk: readable(accent, ramp.surface),
    moneyIn: ramp.moneyIn,
    moneyOut: ramp.moneyOut,
  };
}

/** `#RRGGBB` as the "R G B" channel list a CSS variable wants. */
export function channels(hex: string): string {
  return toRgb(hex).join(' ');
}

/** Every token as CSS variables, for NativeWind's `vars()`. */
export function tokenVars(tokens: Tokens): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [
      `--color-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      channels(value),
    ]),
  );
}
