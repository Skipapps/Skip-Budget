/**
 * Raw brand colors, for anywhere a className cannot reach — SVG fills,
 * component props, native config. Mirrors the palette in tailwind.config.js.
 */
export const colors = {
  ink: '#111111',
  body: '#2F2F2F',
  muted: '#6F6F6F',
  accent: '#FA8F6F',
  control: '#3D3D3D',
  line: '#DCDCDC', // hairline borders (inputs, dividers)
  controlPressed: '#2A2A2A',
  surface: '#FFFFFF',
} as const;

export type ColorName = keyof typeof colors;

/**
 * The two directions money moves.
 *
 * Terracotta rather than a signal red: it belongs to the same family as the
 * coral accent, and spending is the normal state of a budget rather than an
 * error. Both clear 4.5:1 on white — the coral accent itself only manages
 * 3.1:1, which is why it is not used for figures people have to read.
 */
export const money = {
  in: '#0B6B3A',
  out: '#C2472A',
} as const;

/**
 * Colour for a signed amount. Undefined at exactly zero, which is neither
 * good news nor bad and reads better as plain type.
 */
export function moneyColor(amount: number): string | undefined {
  if (amount > 0) return money.in;
  if (amount < 0) return money.out;
  return undefined;
}
