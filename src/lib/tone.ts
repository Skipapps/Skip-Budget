/**
 * Picks a colour for money shown on top of card artwork.
 *
 * A card face can be any colour in the palette, so a single red and a single
 * green cannot work everywhere: red on the coral card is invisible, green on
 * the forest card is invisible, and both are illegible on ink. The tone is
 * therefore chosen per card rather than fixed.
 *
 * Two things disqualify a candidate. Too little contrast, which is a
 * readability failure and measured with the WCAG ratio. And too little hue
 * separation, which is the "merged into the card colour" failure — a brick red
 * on a coral card technically passes contrast while still reading as a darker
 * shade of the card rather than as a colour with meaning.
 *
 * When nothing clears both bars the number falls back to plain high-contrast
 * type. That is deliberate: the sign and the caption beside it already say
 * whether money is owed or held, so colour is reinforcement and never the only
 * carrier of the meaning. Legibility wins over decoration.
 */

type Rgb = { r: number; g: number; b: number };

function toRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function luminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast, 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * Hue in degrees, saturation 0–1, and chroma 0–1. Grey returns a hue of -1.
 *
 * Chroma is the plain max-minus-min distance, which tracks how colourful a
 * tone looks. Saturation does not: near-black maroon is highly saturated and
 * reads as brown, so choosing by saturation picks the least red red available.
 */
function hueOf(hex: string): { hue: number; saturation: number; chroma: number } {
  const { r, g, b } = toRgb(hex);
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta < 0.04) return { hue: -1, saturation: 0, chroma: delta };

  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return {
    hue: (hue * 60 + 360) % 360,
    saturation: max === 0 ? 0 : delta / max,
    chroma: delta,
  };
}

/** Shortest way round the colour wheel, 0–180. */
function hueGap(a: number, b: number): number {
  if (a < 0 || b < 0) return 180;
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

/**
 * Ramps run light to dark so there is a workable tone whether the card behind
 * is near-white or near-black. Warm brick rather than signal red: this is a
 * balance someone lives with every day, not an error state.
 */
const RAMPS = {
  debt: ['#FFE7E1', '#FFD9D0', '#FFB09B', '#E0664F', '#B4402C', '#7E2A1B', '#4A160D'],
  asset: ['#DFF7E9', '#C6EFD8', '#7FD9A8', '#2F9E6B', '#1C7A4F', '#124F34', '#0A3020'],
} as const;

export type MoneyIntent = 'debt' | 'asset' | 'neutral';

/** Below this a colour is hard to read; the WCAG bar for large text. */
const MIN_CONTRAST = 3.2;
/** Below this a colour reads as a shade of the card rather than its own hue. */
const MIN_HUE_GAP = 42;
/**
 * Contrast at which lightness alone does the separating.
 *
 * A near-black red on a sand card shares sand's hue family and still reads
 * plainly as red, because it is so much darker than everything around it. The
 * hue gate only matters for tones close in lightness to the card, where hue is
 * the only thing left to tell them apart.
 */
const HUE_GATE_CEILING = 4.5;
/** Contrast that reads as comfortable rather than merely legible. */
const COMFORTABLE = 4.5;

/**
 * The colour for an amount drawn on `background`, or null to use plain type.
 *
 * Null is a real answer, not a failure — see the note at the top of the file.
 */
export function moneyTone(background: string, intent: MoneyIntent): string | null {
  if (intent === 'neutral') return null;

  const behind = hueOf(background);

  const usable = RAMPS[intent]
    .map((candidate) => {
      const own = hueOf(candidate);
      return {
        candidate,
        ratio: contrast(candidate, background),
        gap: hueGap(own.hue, behind.hue),
        chroma: own.chroma,
      };
    })
    .filter(({ ratio, gap }) => {
      if (ratio < MIN_CONTRAST) return false;
      // A washed-out card is effectively grey, so hue cannot clash with it.
      if (behind.saturation < 0.18) return true;
      if (ratio >= HUE_GATE_CEILING) return true;
      return gap >= MIN_HUE_GAP;
    });

  if (!usable.length) return null;

  // Among the comfortably readable ones, the most colourful — a tone has to
  // look like the colour it means. Only when nothing is comfortable does raw
  // contrast decide, because at that point legibility is the scarce thing.
  const comfortable = usable.filter(({ ratio }) => ratio >= COMFORTABLE);
  const pool = comfortable.length ? comfortable : usable;

  return pool.sort((a, b) => b.chroma - a.chroma || b.ratio - a.ratio)[0].candidate;
}
