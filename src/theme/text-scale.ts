/**
 * How far each kind of text follows the phone's text size. iOS draws a Text at its design size times
 * min(text-size multiplier, ceiling), so text in the same role stops growing at the same point on
 * every screen. Pass the ceiling as `maxFontSizeMultiplier={TEXT_CAP.row}`, never as a number.
 */
export const TEXT_CAP = {
  /** Body, subtitles, dialog messages, the failure line, field hints, FAQ and legal text. */
  reading: 1.6,
  /** List-row titles, subtitles, dates and amounts; field labels and values; button and link labels. */
  row: 1.4,
  /** Labels in fixed-width tiles, chips, toggles, the tab bar, stat labels. */
  control: 1.3,
  /** Page titles, section headings and their captions. */
  heading: 1.3,
  /** Hero and stat figures. */
  figure: 1.2,
} as const;

export type TextRole = keyof typeof TEXT_CAP;

/** No group of text is shrunk below this; its layout changes instead. */
export const MIN_TEXT_SIZE = 11;

/** The size, in points, that iOS draws `size` at for this role under the phone's multiplier. */
export function renderedSize(size: number, role: TextRole, fontScale: number): number {
  return size * Math.min(fontScale, TEXT_CAP[role]);
}
