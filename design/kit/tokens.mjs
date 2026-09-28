// Mirrors src/theme/palette.ts exactly: one neutral ramp per mode, apricot on
// top. If the app's palette changes, change it there and copy the values here.

export const ACCENT = '#EFA168'; // DEFAULT_ACCENT 'apricot'

const RAMPS = {
  light: {
    surface: '#FBF9F7', card: '#FFFFFF', ink: '#111111', body: '#2F2F2F', muted: '#6F6F6F',
    line: '#E5E1DC', moneyIn: '#2F7A55', moneyOut: '#B85040', danger: '#B0453A',
  },
  dark: {
    surface: '#1B181F', card: '#2A2634', ink: '#F8F6FB', body: '#E4E0EA', muted: '#A7A1B2',
    line: '#3E3949', moneyIn: '#7FD6A0', moneyOut: '#ED7A7A', danger: '#F08A86',
  },
};

export const CARD_COLORS = [
  { id: 'coral', label: 'Coral', value: '#FA8F6F' },
  { id: 'ink', label: 'Ink', value: '#161616' },
  { id: 'snow', label: 'Snow', value: '#FFFFFF' },
  { id: 'lime', label: 'Lime', value: '#C7E756' },
  { id: 'sky', label: 'Sky', value: '#7BC4F5' },
  { id: 'violet', label: 'Violet', value: '#8B7BF5' },
  { id: 'sand', label: 'Sand', value: '#E9CF9B' },
  { id: 'forest', label: 'Forest', value: '#2E6E5B' },
];

export const ACCENTS = [
  { id: 'butter', label: 'Butter', value: '#F6E3A9' },
  { id: 'honey', label: 'Honey', value: '#F2C86B' },
  { id: 'apricot', label: 'Apricot', value: '#EFA168' },
  { id: 'coral', label: 'Coral', value: '#E98B88' },
  { id: 'blush', label: 'Blush', value: '#EBCBC6' },
  { id: 'rose', label: 'Rose', value: '#C98BA4' },
  { id: 'plum', label: 'Plum', value: '#6E3E5C' },
  { id: 'lavender', label: 'Lavender', value: '#A79CC4' },
  { id: 'powder', label: 'Powder', value: '#B3CBE4' },
  { id: 'sage', label: 'Sage', value: '#AAC5A9' },
  { id: 'taupe', label: 'Taupe', value: '#A5877F' },
  { id: 'slate', label: 'Slate', value: '#4C4C4C' },
];

export function toRgb(hex) {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (r, g, b) => `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;

export function mix(hex, towards, amount) {
  const [r1, g1, b1] = toRgb(hex);
  const [r2, g2, b2] = toRgb(towards);
  return toHex(r1 + (r2 - r1) * amount, g1 + (g2 - g1) * amount, b1 + (b2 - b1) * amount);
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export function onColor(hex) {
  return contrast('#111111', hex) >= contrast('#FFFFFF', hex) ? '#111111' : '#FFFFFF';
}
export function readable(hex, background, target = 4.5) {
  if (contrast(hex, background) >= target) return hex;
  const towards = contrast('#000000', background) > contrast('#FFFFFF', background) ? '#000000' : '#FFFFFF';
  let best = hex;
  for (let step = 1; step <= 20; step += 1) {
    best = mix(hex, towards, step / 20);
    if (contrast(best, background) >= target) return best;
  }
  return best;
}
/** src/lib/color.ts isLightColor — the card face decides black or white type by this. */
export function isLightColor(hex) {
  return contrast('#111111', hex) >= contrast('#FFFFFF', hex);
}

export function buildTokens(scheme = 'light', accent = ACCENT) {
  const ramp = RAMPS[scheme];
  return {
    ...ramp,
    control: accent,
    controlPressed: mix(accent, scheme === 'dark' ? '#FFFFFF' : '#000000', 0.18),
    onControl: onColor(accent),
    accent,
    accentInk: readable(accent, ramp.surface),
  };
}

/** Greybox palette for the wireframes. Nothing here is a brand colour. */
export const WIRE = {
  surface: '#FFFFFF', card: '#FFFFFF', ink: '#2B2B2B', body: '#444444', muted: '#7A7A7A',
  line: '#B9B9B9', control: '#D4D4D4', controlPressed: '#C4C4C4', onControl: '#2B2B2B',
  accent: '#D4D4D4', accentInk: '#555555', moneyIn: '#444444', moneyOut: '#444444', danger: '#444444',
};

export const FONT = {
  hifi: 'Poppins, "Helvetica Neue", Arial, sans-serif',
  wire: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

/** Type styles, straight from src/components/ui/typography.tsx at the `phone` breakpoint (390pt). */
export const TYPE = {
  title: { size: 28, weight: 700, lineHeight: 36, color: 'ink' },
  sectionHeading: { size: 17, weight: 600, lineHeight: 24, color: 'ink' },
  sectionCaption: { size: 13, weight: 400, lineHeight: 18, color: 'muted' },
  subtitle: { size: 16, weight: 400, lineHeight: 24, color: 'body' },
  body: { size: 15, weight: 400, lineHeight: 24, color: 'body' },
  quote: { size: 15, weight: 400, lineHeight: 24, color: 'muted', italic: true },
  fieldLabel: { size: 13, weight: 500, lineHeight: 18, color: 'body' },
  rowTitle: { size: 15, weight: 500, lineHeight: 22, color: 'ink' },
  rowSub: { size: 12, weight: 400, lineHeight: 17, color: 'muted' },
  rowAmount: { size: 15, weight: 600, lineHeight: 22, color: 'ink' },
  button: { size: 17, weight: 500, lineHeight: 24, color: 'onControl' },
  pill: { size: 14, weight: 500, lineHeight: 20, color: 'ink' },
  chip: { size: 14, weight: 400, lineHeight: 20, color: 'body' },
  chipSelected: { size: 14, weight: 500, lineHeight: 20, color: 'onControl' },
  input: { size: 16, weight: 400, lineHeight: 24, color: 'ink' },
  caption: { size: 13, weight: 400, lineHeight: 18, color: 'muted' },
  small: { size: 12, weight: 400, lineHeight: 17, color: 'muted' },
  link: { size: 17, weight: 500, lineHeight: 24, color: 'ink' },
  linkSubtle: { size: 14, weight: 400, lineHeight: 20, color: 'muted' },
  question: { size: 20, weight: 400, lineHeight: 28, color: 'muted' },
  stepTitle: { size: 17, weight: 600, lineHeight: 24, color: 'ink' },
  tabLabel: { size: 13, weight: 500, lineHeight: 18, color: 'onControl' },
};
