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

/**
 * The eight, curated down from twelve (2026-09-25).
 *
 * Two families of four rather than twelve variations of pale. The warm pastel
 * row carries near-black ink; the deep dusty row carries white. `on` is
 * declared per accent instead of computed, because the computation and the
 * design disagree on the mid tones: black technically scores higher on
 * periwinkle and rose, but white at 3.5:1 is what the large bold figures those
 * surfaces carry actually want — measured against WCAG's large-text bar, not
 * guessed. Every other pairing clears 4.5:1 outright.
 */
export const ACCENTS = [
  { id: 'apricot', label: 'Apricot', value: '#EFA168', on: '#111111' },
  { id: 'coral', label: 'Coral', value: '#FFA896', on: '#111111' },
  { id: 'pistachio', label: 'Pistachio', value: '#D4DE95', on: '#111111' },
  { id: 'lavender', label: 'Lavender', value: '#A79CC4', on: '#111111' },
  { id: 'periwinkle', label: 'Periwinkle', value: '#8686AC', on: '#FFFFFF' },
  { id: 'rose', label: 'Rose', value: '#B9718F', on: '#FFFFFF' },
  { id: 'plum', label: 'Plum', value: '#6E3E5C', on: '#FFFFFF' },
  { id: 'navy', label: 'Navy', value: '#272757', on: '#FFFFFF' },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];
export type AccentDef = (typeof ACCENTS)[number];

/**
 * Where the retired four-and-three land. A device that stored butter wakes up
 * on the nearest survivor rather than snapping to the default — the choice
 * they made is honoured in spirit when it cannot be honoured exactly.
 */
export const LEGACY_ACCENTS: Record<string, AccentId> = {
  butter: 'apricot',
  honey: 'apricot',
  blush: 'coral',
  powder: 'periwinkle',
  sage: 'pistachio',
  taupe: 'rose',
  slate: 'navy',
};

/**
 * Plum on install (Founder's call, 2026-09-27, superseding navy): deep and
 * dusty with white type in both modes, and the colour every non-Pro user
 * lives with — theming is a Pro feature, so this is effectively the brand.
 * Mode follows the phone until they say otherwise.
 */
export const DEFAULT_ACCENT: AccentId = 'plum';
export const DEFAULT_MODE: ModeKey = 'system';

export function accentById(id: AccentId): AccentDef {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
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
    // Destructive, one step hotter and deeper than an outflow figure. Delete
    // and Remove have to read as stronger than "money left", and they are
    // rarely more than a 15px label, so this clears 5.5:1 on both surfaces
    // rather than sitting on the 4.5 line the way the old #DC2626 did.
    danger: '#B0453A',
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
    // #DC2626 scored 3.05:1 on this card — the one real contrast failure in
    // the app. The same rose as moneyOut, lifted a step: 6.09 on the card,
    // 7.26 on the page.
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

/** Resolves one mode and one accent into every colour the app draws with. */
export function buildTokens(scheme: Scheme, accent: AccentDef): Tokens {
  const ramp = RAMPS[scheme];

  return {
    ...ramp,
    control: accent.value,
    // Pressed reads as "further in", which is darker on light chrome and
    // lighter on dark. Following the scheme keeps the feedback visible either way.
    controlPressed: mix(accent.value, scheme === 'dark' ? '#FFFFFF' : '#000000', 0.18),
    // Declared with the accent, not computed: the curated pairings are the
    // palette, and the maths alone would put black on periwinkle and rose.
    onControl: accent.on,
    accent: accent.value,
    accentInk: readable(accent.value, ramp.surface),
    moneyIn: ramp.moneyIn,
    moneyOut: ramp.moneyOut,
    danger: ramp.danger,
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
